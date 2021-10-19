<?php

namespace DeliciousBrains\WPMDB\Common\Util;

use DeliciousBrains\WPMDB\Common\Db\MDBWPDB;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\WPMDBDI;

/**
 * Class Util
 *
 * Methods in this class should *not* have many external dependencies, if any.
 *
 * @package DeliciousBrains\WPMDB\Common\Util
 */
class Util
{

    /**
     * @var Properties
     */
    private $props;
    /**
     * @var Filesystem
     */
    private $filesystem;
    private $container;
    private $form_data;

    public function __construct(
        Properties $properties,
        Filesystem $filesystem
    ) {
        $this->props      = $properties;
        $this->filesystem = $filesystem;
    }

    public static function isPro()
    {
        return defined("WPMDB_PRO") && WPMDB_PRO;
    }

    /**
     * Has a specific method been called in the stack trace.
     *
     * @param string     $method
     * @param null|array $stack
     *
     * @return bool
     */
    public static function has_method_been_called($method, $stack = null)
    {
        if (empty($stack)) {
            // phpcs:ignore
            $stack = debug_backtrace();
        }

        foreach ($stack as $caller) {
            if ($method === $caller['function']) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the wpmdb_bottleneck value in bytes
     *
     * @param string $type
     *
     * @return int
     */
    function get_bottleneck($type = 'regular')
    {
        $suhosin_limit         = false;
        $suhosin_request_limit = false;
        $suhosin_post_limit    = false;

        if (function_exists('ini_get')) {
            $suhosin_request_limit = trim(ini_get('suhosin.request.max_value_length'));
            $suhosin_post_limit    = trim(ini_get('suhosin.post.max_value_length'));
        }

        if ($suhosin_request_limit && $suhosin_post_limit) {
            $suhosin_limit = min(wp_convert_hr_to_bytes($suhosin_request_limit), wp_convert_hr_to_bytes($suhosin_post_limit));
        }

        $post_max_upper_size = apply_filters('wpmdb_post_max_upper_size', 26214400);

        // we have to account for HTTP headers and other bloating, here we minus 1kb for bloat
        $calculated_bottleneck = min(($this->get_post_max_size() - 1024), $post_max_upper_size);

        if (0 >= $calculated_bottleneck) {
            $calculated_bottleneck = $post_max_upper_size;
        }

        if ($suhosin_limit) {
            $calculated_bottleneck = min($calculated_bottleneck, $suhosin_limit - 1024);
        }

        if ($type != 'max') {
            $calculated_bottleneck = min($calculated_bottleneck, Settings::get_setting('max_request'));
        }

        return apply_filters('wpmdb_bottleneck', $calculated_bottleneck);
    }

    // Generates our secret key
    public function generate_key($length = 40)
    {
        $keyset = 'abcdefghijklmnopqrstuvqxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        $key    = '';

        for ($i = 0; $i < $length; $i++) {
            $key .= substr($keyset, wp_rand(0, strlen($keyset) - 1), 1);
        }

        return $key;
    }

    /**
     * Returns the php ini value for post_max_size in bytes
     *
     * @return int
     */
    public function get_post_max_size()
    {
        $bytes = max(wp_convert_hr_to_bytes(trim(ini_get('post_max_size'))), wp_convert_hr_to_bytes(trim(ini_get('hhvm.server.max_post_size'))));

        return $bytes;
    }

    /**
     * Get estimated usable memory limit.
     *
     * @return int
     */
    public function get_memory_limit()
    {
        if (function_exists('ini_get')) {
            $memory_limit = ini_get('memory_limit');
        } else {
            $memory_limit = '256M';
        }

        if (!$memory_limit || -1 === $memory_limit) {
            $memory_limit = '1000M';
        }

        return wp_convert_hr_to_bytes(trim($memory_limit)) * 0.8;
    }

    /**
     * Test to see if executing an AJAX call specific to the WP Migrate DB family of plugins.
     *
     * @return bool
     */
    public static function is_ajax()
    {
        // must be doing AJAX the WordPress way
        if (!defined('DOING_AJAX') || !DOING_AJAX) {
            return false;
        }

        // must be one of our actions -- e.g. core plugin (wpmdb_*), media files (wpmdbmf_*)
        if (!isset($_POST['action']) || 0 !== strpos($_POST['action'], 'wpmdb')) {
            return false;
        }

        // must be on blog #1 (first site) if multisite
        if (is_multisite() && 1 != get_current_site()->id) {
            return false;
        }

        return true;
    }

    /**
     * Checks if another version of WPMDB(Pro) is active and deactivates it.
     * To be hooked on `activated_plugin` so other plugin is deactivated when current plugin is activated.
     *
     * @param string $plugin
     *
     */
    public static function deactivate_other_instances($plugin)
    {
        if (!in_array(basename($plugin), array('wp-migrate-db-pro.php', 'wp-migrate-db.php'))) {
            return;
        }

        $plugin_to_deactivate  = 'wp-migrate-db.php';
        $deactivated_notice_id = '1';
        if (basename($plugin) == $plugin_to_deactivate) {
            $plugin_to_deactivate  = 'wp-migrate-db-pro.php';
            $deactivated_notice_id = '2';
        }

        if (is_multisite()) {
            $active_plugins = (array)get_site_option('active_sitewide_plugins', array());
            $active_plugins = array_keys($active_plugins);
        } else {
            $active_plugins = (array)get_option('active_plugins', array());
        }

        foreach ($active_plugins as $basename) {
            if (false !== strpos($basename, $plugin_to_deactivate)) {
                set_transient('wp_migrate_db_deactivated_notice_id', $deactivated_notice_id, 1 * HOUR_IN_SECONDS);
                deactivate_plugins($basename);

                return;
            }
        }
    }

    /**
     * Return unserialized object or array
     *
     * @param string $serialized_string Serialized string.
     * @param string $method            The name of the caller method.
     *
     * @return mixed, false on failure
     */
    public static function unserialize($serialized_string, $method = '')
    {
        if (!is_serialized($serialized_string)) {
            return false;
        }

        $serialized_string   = trim($serialized_string);
        $unserialized_string = @unserialize($serialized_string);

        if (false === $unserialized_string && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            $scope = $method ? sprintf(__('Scope: %s().', 'wp-migrate-db'), $method) : false;
            $error = sprintf(__('WPMDB Error: Data cannot be unserialized. %s', 'wp-migrate-db'), $scope);
            error_log($error);
        }

        return $unserialized_string;
    }

    /**
     * Use wp_unslash if available, otherwise fall back to stripslashes_deep
     *
     * @param string|array $arg
     *
     * @return string|array
     */
    public static function safe_wp_unslash($arg)
    {
        if (function_exists('wp_unslash')) {
            return wp_unslash($arg);
        } else {
            return stripslashes_deep($arg);
        }
    }

    /**
     * Use gzdecode if available, otherwise fall back to gzinflate
     *
     * @param string $data
     *
     * @return string|bool
     */
    public static function gzdecode($data)
    {
        if (!function_exists('gzdecode')) {
            return @gzinflate(substr($data, 10, -8));
        }

        return @gzdecode($data);
    }

    /**
     * Require wpmdb-wpdb and create new instance
     *
     * @return MDBWPDB
     */
    public static function make_wpmdb_wpdb_instance()
    {
        return new MDBWPDB();
    }

    /**
     * Wrapper for replacing first instance of string
     *
     * @return string
     */
    public static function str_replace_first($search, $replace, $string)
    {
        $pos = strpos($string, $search);

        if (false !== $pos) {
            $string = substr_replace($string, $replace, $pos, strlen($search));
        }

        return $string;
    }

    /**
     * Runs WPs create nonce with all filters removed
     *
     * @param string|int $action Scalar value to add context to the nonce.
     *
     * @return string The Token
     */
    public static function create_nonce($action = -1)
    {
        global $wp_filter;
        $filter_backup = $wp_filter;
        self::filter_nonce_filters();
        $return    = wp_create_nonce($action);
        $wp_filter = $filter_backup;

        return $return;
    }

    /**
     * Runs WPs check ajax_referer [sic] with all filters removed
     *
     * @param int|string   $action    Action nonce.
     * @param false|string $query_arg Optional. Key to check for the nonce in `$_REQUEST` (since 2.5). If false,
     *                                `$_REQUEST` values will be evaluated for '_ajax_nonce', and '_wpnonce'
     *                                (in that order). Default false.
     * @param bool         $die       Optional. Whether to die early when the nonce cannot be verified.
     *                                Default true.
     *
     * @return false|int False if the nonce is invalid, 1 if the nonce is valid and generated between
     *                   0-12 hours ago, 2 if the nonce is valid and generated between 12-24 hours ago.
     */
    public static function check_ajax_referer($action = -1, $query_arg = false, $die = true)
    {
        global $wp_filter;
        $filter_backup = $wp_filter;
        self::filter_nonce_filters();
        $return    = check_ajax_referer($action, $query_arg, $die);
        $wp_filter = $filter_backup;

        return $return;
    }

    /**
     * Removes filters from $wp_filter that might interfere with wpmdb nonce generation/checking
     */
    private static function filter_nonce_filters()
    {
        global $wp_filter;
        $filtered_filters = apply_filters('wpmdb_filtered_filters', array(
            'nonce_life',
        ));
        foreach ($filtered_filters as $filter) {
            unset($wp_filter[$filter]);
        }
    }

    /**
     *
     * Checks if the current request is a WPMDB request
     *
     * @return bool
     */
    public static function is_wpmdb_ajax_call()
    {
        if ((defined('DOING_AJAX') && DOING_AJAX) && (isset($_POST['action']) && false !== strpos($_POST['action'], 'wpmdb'))) {
            return true;
        }

        return false;
    }

    /**
     *
     * Sets 'Expect' header to an empty string which some server/host setups require
     *
     * Called from the `http_request_args` filter
     *
     * @param $r
     * @param $url
     *
     * @return mixed
     */
    public static function preempt_expect_header($r, $url)
    {
        if (self::is_wpmdb_ajax_call()) {
            $r['headers']['Expect'] = '';
        }

        return $r;
    }

    /*
     * Patch wp_parse_url if it doesn't exist
     * for compatibility with WP < 4.4
     */
    public static function parse_url($url)
    {
        if (function_exists('wp_parse_url')) {
            return wp_parse_url($url);
        }

        $parts = @parse_url($url);
        if (!$parts) {
            // < PHP 5.4.7 compat, trouble with relative paths including a scheme break in the path
            if ('/' == $url[0] && false !== strpos($url, '://')) {
                // Since we know it's a relative path, prefix with a scheme/host placeholder and try again
                if (!$parts = @parse_url('placeholder://placeholder' . $url)) {
                    return $parts;
                }
                // Remove the placeholder values
                unset($parts['scheme'], $parts['host']);
            } else {
                return $parts;
            }
        }

        // < PHP 5.4.7 compat, doesn't detect schemeless URL's host field
        if ('//' == substr($url, 0, 2) && !isset($parts['host'])) {
            $path_parts    = explode('/', substr($parts['path'], 2), 2);
            $parts['host'] = $path_parts[0];
            if (isset($path_parts[1])) {
                $parts['path'] = '/' . $path_parts[1];
            } else {
                unset($parts['path']);
            }
        }

        return $parts;
    }

    /**
     * Get the URL to MDB rest api base.
     *
     * WPML sometimes adds the language code in a subdirectory, this is to ensure
     * compatibility with this plugin.
     *
     * @return string URL to rest_api_base, e.g. http://example.com/wp-json/mdb-api/vi
     */
    public function rest_url()
    {
        if ((is_plugin_active('sitepress-multilingual-cms/sitepress.php') || defined('ICL_SITEPRESS_VERSION')) && !empty(get_option('permalink_structure'))) {
            return get_option('home') . '/' . rest_get_url_prefix() . '/' . $this->props->rest_api_base;
        }
        return get_rest_url(null, $this->props->rest_api_base);
    }

    /**
     * Get the URL to wp-admin/admin-ajax.php for the intended WordPress site.
     *
     * The intended WordPress site URL is sent via Ajax, so to get a properly
     * formatted URL to wp-admin/admin-ajax.php we can't count on the site
     * URL being sent with a trailing slash.
     *
     * @return string URL to wp-admin/admin-ajax.php, e.g. http://example.com/wp-admin/admin-ajax.php
     */
    public function ajax_url()
    {
        $state_data = Persistence::getStateData();
        $url        = $state_data['url'];
        static $ajax_url;

        if (!empty($ajax_url)) {
            return $ajax_url;
        }

        $ajax_url = trailingslashit($url) . 'wp-admin/admin-ajax.php';

        return $ajax_url;
    }

    public function open_ssl_enabled()
    {
        if (defined('OPENSSL_VERSION_TEXT')) {
            return true;
        } else {
            return false;
        }
    }

    function set_time_limit()
    {
        @set_time_limit(0);
    }

    function display_errors()
    {
        $error_log  = WPMDBDI::getInstance()->get(ErrorLog::class);
        $curr_error = $error_log->getError();
        if (!empty($curr_error)) {
            echo $error_log->getError();
            $error_log->setError('');

            return true;
        }

        return false;
    }

    function diverse_array($vector)
    {
        $result = array();

        foreach ($vector as $key1 => $value1) {
            foreach ($value1 as $key2 => $value2) {
                $result[$key2][$key1] = $value2;
            }
        }

        return $result;
    }

    function set_time_limit_available()
    {
        if (!function_exists('set_time_limit') || !function_exists('ini_get')) {
            return false;
        }

        $current_max_execution_time  = ini_get('max_execution_time');
        $proposed_max_execution_time = ($current_max_execution_time == 30) ? 31 : 30;
        @set_time_limit($proposed_max_execution_time);
        $current_max_execution_time = ini_get('max_execution_time');

        return $proposed_max_execution_time == $current_max_execution_time;
    }

    /**
     * Returns a url string given an associative array as per the output of parse_url.
     *
     * @param $parsed_url
     *
     * @return string
     */
    function unparse_url($parsed_url)
    {
        $scheme   = isset($parsed_url['scheme']) ? $parsed_url['scheme'] . '://' : '';
        $host     = isset($parsed_url['host']) ? $parsed_url['host'] : '';
        $port     = isset($parsed_url['port']) ? ':' . $parsed_url['port'] : '';
        $user     = isset($parsed_url['user']) ? $parsed_url['user'] : '';
        $pass     = isset($parsed_url['pass']) ? ':' . $parsed_url['pass'] : '';
        $pass     = ($user || $pass) ? "$pass@" : '';
        $path     = isset($parsed_url['path']) ? $parsed_url['path'] : '';
        $query    = isset($parsed_url['query']) ? '?' . $parsed_url['query'] : '';
        $fragment = isset($parsed_url['fragment']) ? '#' . $parsed_url['fragment'] : '';

        return "$scheme$user$pass$host$port$path$query$fragment";
    }

    /**
     * Get a simplified url for use as the referrer.
     *
     * @param $referer_url
     *
     * @return string
     *
     * NOTE: mis-spelling intentional to match usage.
     */
    function referer_from_url($referer_url)
    {
        $url_parts = self::parse_url($referer_url);

        if (false !== $url_parts) {
            $reduced_url_parts = array_intersect_key($url_parts, array_flip(array('scheme', 'host', 'port', 'path')));
            if (!empty($reduced_url_parts)) {
                $referer_url = $this->unparse_url($reduced_url_parts);
            }
        }

        return $referer_url;
    }

    /**
     * Get a simplified base url without scheme.
     *
     * @param string $url
     *
     * @return string
     */
    function scheme_less_url($url)
    {
        $url_parts = self::parse_url($url);

        if (false !== $url_parts) {
            $reduced_url_parts = array_intersect_key($url_parts, array_flip(array('host', 'port', 'path', 'user', 'pass')));
            if (!empty($reduced_url_parts)) {
                $url = $this->unparse_url($reduced_url_parts);
            }
        }

        return $url;
    }

    /**
     * Converts file paths that include mixed slashes to use the correct type of slash for the current operating system.
     *
     * @param $path string
     *
     * @return string
     */
    function slash_one_direction($path)
    {
        return str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
    }

    /**
     * Returns the absolute path to the root of the website.
     *
     * @return string
     */
    function get_absolute_root_file_path()
    {
        static $absolute_path;

        if (!empty($absolute_path)) {
            return $absolute_path;
        }

        $absolute_path = rtrim(ABSPATH, '\\/');
        $site_url      = rtrim(site_url('', 'http'), '\\/');
        $home_url      = rtrim(home_url('', 'http'), '\\/');

        if ($site_url != $home_url) {
            $difference = str_replace($home_url, '', $site_url);
            if (strpos($absolute_path, $difference) !== false) {
                $absolute_path = rtrim(substr($absolute_path, 0, -strlen($difference)), '\\/');
            }
        }

        return $absolute_path;
    }

    /**
     * Returns the function name that called the function using this function.
     *
     * @return string
     */
    public function get_caller_function()
    {
        // phpcs:ignore
        list(, , $caller) = debug_backtrace(false);

        if (!empty($caller['function'])) {
            $caller = $caller['function'];
        } else {
            $caller = '';
        }

        return $caller;
    }

    /**
     * Returns uploads info for given subsite or primary site.
     *
     * @param int $blog_id Optional, defaults to primary.
     *
     * @return array
     *
     * NOTE: Must be run from primary site.
     */
    public function uploads_info($blog_id = 0)
    {
        static $primary_uploads = array();

        if (!empty($blog_id) && is_multisite()) {
            switch_to_blog($blog_id);
        }

        $uploads    = wp_upload_dir();
        $upload_dir = $uploads['basedir'];

        if (!empty($blog_id) && is_multisite()) {
            restore_current_blog();

            if (empty($primary_uploads)) {
                $primary_uploads = $this->uploads_info();
            }

            $main_uploads             = $primary_uploads['basedir'];
            $uploads['short_basedir'] = str_replace(trailingslashit($main_uploads), '', trailingslashit($upload_dir));

            if (defined('UPLOADBLOGSDIR') && get_site_option('ms_files_rewriting')) {
                // Get local upload path info from DB
                switch_to_blog($blog_id);
                $upload_path = get_option('upload_path');
                if (!empty($upload_path)) {
                    $uploads['short_basedir'] = str_replace(trailingslashit(UPLOADBLOGSDIR), '', trailingslashit($upload_path));
                }
                restore_current_blog();
            }
        }

        return $uploads;
    }

    /**
     * Returns the profile value for a given key.
     *
     * @param string $key
     *
     * @param array  $form_data
     *
     * @return mixed
     */

    /** @TODO replace with call to get from 'migration' settings directly */
    function profile_value($key, $form_data = [])
    {
        if (empty($form_data)) {
            $form_data = WPMDBDI::getInstance()->get(FormData::class)->getFormData();
        }

        if (!empty($key) && !empty($form_data) && isset($form_data[$key])) {
            return $form_data[$key];
        }

        return null;
    }

    /**
     * Returns a simplified site url (good for identifying subsites).
     *
     * @param string $site_url
     *
     * @return string
     */
    public function simple_site_url($site_url)
    {
        $site_url = untrailingslashit($this->scheme_less_url($site_url));

        return $site_url;
    }

    /**
     * Returns an associative array of html escaped useful information about the site.
     *
     * @return array
     */
    public function site_details()
    {
        global $wpdb;
        $table_prefix = $wpdb->base_prefix;
        $uploads      = wp_upload_dir();

        $site_details = array(
            'is_multisite'         => esc_html(is_multisite() ? 'true' : 'false'),
            'site_url'             => esc_html(addslashes(site_url())),
            'home_url'             => esc_html(addslashes(Util::home_url())),
            'prefix'               => esc_html($table_prefix),
            'uploads_baseurl'      => esc_html(addslashes(trailingslashit($uploads['baseurl']))),
            'uploads'              => $this->uploads_info(),
            'uploads_dir'          => esc_html(addslashes($this->get_short_uploads_dir())),
            'subsites'             => $this->subsites_list(),
            'subsites_info'        => $this->subsites_info(),
            'is_subdomain_install' => esc_html((is_multisite() && is_subdomain_install()) ? 'true' : 'false'),
        );

        $site_details = apply_filters('wpmdb_site_details', $site_details);

        return $site_details;
    }

    /**
     * Returns an uploads dir without leading path to site.
     *
     * @return string
     */
    public function get_short_uploads_dir()
    {
        $short_path = str_replace($this->get_absolute_root_file_path(), '', $this->filesystem->get_upload_info('path'));

        return trailingslashit(substr(str_replace('\\', '/', $short_path), 1));
    }

    /**
     * Returns max upload size in bytes, defaults to 25M if no limits set.
     *
     * @return int
     */
    public function get_max_upload_size()
    {
        $bytes = wp_max_upload_size();

        if (1 > (int)$bytes) {
            $p_bytes = wp_convert_hr_to_bytes(ini_get('post_max_size'));
            $u_bytes = wp_convert_hr_to_bytes(ini_get('upload_max_filesize'));

            // If HHVM bug not returning either value, try its own settings.
            // If HHVM not involved, will drop through to default value.
            if (empty($p_bytes) && empty($u_bytes)) {
                $p_bytes = wp_convert_hr_to_bytes(ini_get('hhvm.server.max_post_size'));
                $u_bytes = wp_convert_hr_to_bytes(ini_get('hhvm.server.upload.upload_max_file_size'));

                $bytes = min($p_bytes, $u_bytes);

                if (0 < (int)$bytes) {
                    return $bytes;
                }
            }

            if (0 < (int)$p_bytes) {
                $bytes = $p_bytes;
            } elseif (0 < (int)$u_bytes) {
                $bytes = $u_bytes;
            } else {
                $bytes = wp_convert_hr_to_bytes('25M');
            }
        }

        return $bytes;
    }


    /**
     * Extend Cache-Control header to include "no-store" so that Firefox doesn't override input selection after refresh.
     *
     * @param array $headers
     *
     * @return array
     */
    public function nocache_headers($headers)
    {
        if (is_array($headers) &&
            key_exists('Cache-Control', $headers) &&
            false === strpos($headers['Cache-Control'], 'no-store')
        ) {
            $headers['Cache-Control'] .= ', no-store';
        }

        return $headers;
    }

    public static function is_json($string, $strict = false)
    {
        if (!is_string($string)) {
            return false;
        }

        $json = json_decode($string, true);
        if ($strict === true && !is_array($json)) {
            return false;
        }

        if ($json === null) {
            return false;
        }

        if ($json === false) {
            return false;
        }

        return true;
    }

    /**
     * Checks if the compatibility mu-plugin is installed
     *
     * @return bool $installed
     */
    public function is_muplugin_installed()
    {
        $plugins           = wp_get_mu_plugins();
        $muplugin_filename = basename($this->props->mu_plugin_dest);
        $installed         = false;

        foreach ($plugins as $plugin) {
            if (false !== strpos($plugin, $muplugin_filename)) {
                $installed = true;
            }
        }

        return $installed;
    }


    /**
     *
     * Utility function to check if the mu-plugin directory and compatibility plugin are both writable
     *
     *
     * @return bool
     */
    public function is_muplugin_writable()
    {
        //Assumes by default we cannot create the mu-plugins folder and compatibility plugin if they don't exist
        $mu_folder_writable = false;
        $mu_plugin_writable = false;

        //If the mu-plugins folder exists, make sure it's writable.
        if (true === $this->filesystem->is_dir($this->props->mu_plugin_dir)) {
            $mu_folder_writable = $this->filesystem->is_writable($this->props->mu_plugin_dir);
        }

        //If the mu-plugins/wp-migrate-db-pro-compatibility.php file exists, make sure it's writable.
        if (true === $this->filesystem->file_exists($this->props->mu_plugin_dest)) {
            $mu_plugin_writable = $this->filesystem->is_writable($this->props->mu_plugin_dest);
        }

        return true === $mu_folder_writable || true === $mu_plugin_writable;
    }

    function get_plugin_details($plugin_path, $prefix = '')
    {
        $plugin_data = get_plugin_data($plugin_path);
        $plugin_name = strlen($plugin_data['Name']) ? $plugin_data['Name'] : basename($plugin_path);

        if (empty($plugin_name)) {
            return;
        }

        $version = '';
        if ($plugin_data['Version']) {
            $version = sprintf(" (v%s)", $plugin_data['Version']);
        }

        $author = '';
        if ($plugin_data['AuthorName']) {
            $author = sprintf(" by %s", $plugin_data['AuthorName']);
        }

        return sprintf("%s %s%s%s", $prefix, $plugin_name, $version, $author);
    }

    function print_plugin_details($plugin_path, $prefix = '')
    {
        echo $this->get_plugin_details($plugin_path, $prefix) . "\r\n";
    }

    function remove_wp_plugin_dir($name)
    {
        $plugin = str_replace(WP_PLUGIN_DIR, '', $name);

        return substr($plugin, 1);
    }

    public static function gzip()
    {
        return function_exists('gzopen');
    }

    function get_path_from_url($url)
    {
        $parts = self::parse_url($url);

        return (!empty($parts['path'])) ? trailingslashit($parts['path']) : '/';
    }

    function get_path_current_site()
    {
        if (!is_multisite()) {
            return '';
        }

        $current_site = get_current_site();

        return $current_site->path;
    }

    function get_short_home_address_from_url($url)
    {
        return untrailingslashit(str_replace(array('https://', 'http://', '//'), '', $url));
    }


    /**
     * Get a plugin folder from the slug
     *
     * @param string $slug
     *
     * @return mixed
     */
    public function get_plugin_folder($slug)
    {
        if (isset($GLOBALS['wpmdb_meta'][$slug]['folder'])) {
            return $GLOBALS['wpmdb_meta'][$slug]['folder'];
        }

        // If pre-1.1.2 version of Media Files addon, use the slug as folder name
        return $slug;
    }

    /**
     * Get array of subsite simple urls keyed by their ID.
     *
     * @return array
     */
    public function subsites_list()
    {
        $subsites = array();

        if (!is_multisite()) {
            return $subsites;
        }


        if (version_compare($GLOBALS['wp_version'], '4.6', '>=')) {
            $sites = get_sites(array('number' => false));
        } else {
            $sites = wp_get_sites(array('limit' => 0));
        }

        if (!empty($sites)) {
            foreach ((array)$sites as $subsite) {
                $subsite                       = (array)$subsite;
                $subsites[$subsite['blog_id']] = $this->simple_site_url(get_blogaddress_by_id($subsite['blog_id']));
            }
        }

        return $subsites;
    }

    /**
     * Get array of subsite info keyed by their ID.
     *
     * @return array
     */
    public function subsites_info()
    {
        $subsites = array();

        if (!is_multisite()) {
            return $subsites;
        }

        if (version_compare($GLOBALS['wp_version'], '4.6', '>=')) {
            $sites = get_sites(array('number' => false));
        } else {
            $sites = wp_get_sites(array('limit' => 0));
        }

        if (!empty($sites)) {
            // We to fix up the urls in uploads as they all use primary site's base!
            $primary_url = site_url();

            foreach ($sites as $subsite) {
                $subsite                                   = (array)$subsite;
                $subsites[$subsite['blog_id']]['site_url'] = get_site_url($subsite['blog_id']);
                $subsites[$subsite['blog_id']]['home_url'] = get_home_url($subsite['blog_id']);
                $subsites[$subsite['blog_id']]['uploads']  = $this->uploads_info($subsite['blog_id']);

                $subsites[$subsite['blog_id']]['uploads']['url']     = substr_replace($subsites[$subsite['blog_id']]['uploads']['url'], $subsites[$subsite['blog_id']]['site_url'], 0, strlen($primary_url));
                $subsites[$subsite['blog_id']]['uploads']['baseurl'] = substr_replace($subsites[$subsite['blog_id']]['uploads']['baseurl'], $subsites[$subsite['blog_id']]['site_url'], 0, strlen($primary_url));
            }
        }

        return $subsites;
    }

    // Ripped from WP Core to be used in `plugins_loaded` hook
    public static function is_plugin_active($plugin)
    {
        return in_array($plugin, (array)get_option('active_plugins', array())) || self::is_plugin_active_for_network($plugin);
    }

    // Ripped from WP Core to be used in `plugins_loaded` hook
    public static function is_plugin_active_for_network($plugin)
    {
        if (!is_multisite()) {
            return false;
        }

        $plugins = get_site_option('active_sitewide_plugins');
        if (isset($plugins[$plugin])) {
            return true;
        }

        return false;
    }

    public static function get_state_data()
    {
        return WPMDBDI::getInstance()->get(StateDataContainer::class)->state_data;
    }

    public static function throw_ajax_error($msg)
    {
        WPMDBDI::getInstance()->get(ErrorLog::class)->log_error($msg);

        return wp_send_json_error($msg);
    }

    public static function validate_json($json, $assoc = true)
    {
        if (!is_string($json)) {
            return false;
        }
        // set second parameter boolean TRUE for associative array output.
        $result = json_decode($json, $assoc);

        if (json_last_error() === JSON_ERROR_NONE) {
            return $result;
        }

        return false;
    }

    function mask_licence($licence)
    {
        $licence_parts  = explode('-', $licence);
        $i              = count($licence_parts) - 1;
        $masked_licence = '';

        foreach ($licence_parts as $licence_part) {
            if ($i == 0) {
                $masked_licence .= $licence_part;
                continue;
            }

            $masked_licence .= str_repeat('&bull;', strlen($licence_part)) . '&ndash;';
            --$i;
        }

        return $masked_licence;
    }

    public static function uuidv4()
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',

            // 32 bits for "time_low"
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),

            // 16 bits for "time_mid"
            mt_rand(0, 0xffff),

            // 16 bits for "time_hi_and_version",
            // four most significant bits holds version number 4
            mt_rand(0, 0x0fff) | 0x4000,

            // 16 bits, 8 bits for "clk_seq_hi_res",
            // 8 bits for "clk_seq_low",
            // two most significant bits holds zero and one for variant DCE1.1
            mt_rand(0, 0x3fff) | 0x8000,

            // 48 bits for "node"
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    public function isMDBPage()
    {
        $screen     = get_current_screen();
        $page_slugs = [
            'tools_page_wp-migrate-db',
            'tools_page_wp-migrate-db-pro',
            'settings_page_wp-migrate-db-network',
            'settings_page_wp-migrate-db-pro-network',
        ];

        if(is_multisite() && $screen->id === 'tools_page_wp-migrate-db-pro'){
        	return false;
        }

        if (in_array($screen->id, $page_slugs)) {
            return true;
        }

        return false;
    }

    public static function formatBytes($bytes, $precision = 2)
    {
        $units = array('B', 'KB', 'MB', 'GB', 'TB');

        $bytes = max($bytes, 0);
        $pow   = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow   = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    public static function json_encode_trim($item)
    {
        return trim(json_encode($item), '"');
    }

    /**
     * Checks that WordPress meets our version requirements
     * and that React is registered.
     *
     * @return bool
     */
    public static function is_wp_compatible()
    {
        global $wp_version;

        if (version_compare($wp_version, WPMDB_MINIMUM_WP_VERSION, '>=') && wp_script_is('react', 'registered')) {
            return true;
        }

        return false;
    }

    /**
     * Returns a WP admin link for MDB settings tab
     *
     * @return string
     */
    public static function settings_page_link()
    {
        $page = 'tools.php';

        if (is_multisite()) {
            $page = 'settings.php';
        }

        return add_query_arg(array(
            'page' => 'wp-migrate-db-pro#settings',
        ), network_admin_url($page));
    }

    public static function is_regex_pattern_valid($pattern) {
        return @preg_match($pattern, null) !== false;
    }

    /**
     * Returns an array of table names with a new prefix.
     *
     * @param array  $tables
     * 
     * @param string $old_prefix
     * 
     * @param string $new_prefix
     *
     * @return array
     */
    public static function change_tables_prefix($tables, $old_prefix, $new_prefix)
    {
        $new_tables = [];
        foreach($tables as $table) {
            $new_tables[] = self::prefix_updater($table, $old_prefix, $new_prefix);
        }
        return $new_tables;
    }

    /**
     * Modifies of table name to have a new prefix.
     *
     * @param string $table
     * 
     * @param string $old_prefix
     * 
     * @param string $new_prefix
     *
     * @return array
     */
    public static function prefix_updater($prefixed, $old_prefix, $new_prefix)
    {
        if (substr($prefixed, 0, strlen($old_prefix)) == $old_prefix) {
            $str = substr($prefixed, strlen($old_prefix));
            return $new_prefix . $str;
        } 
        return $prefixed;
    }

    /**
     * Removes WPML home_url_filters if present.
     *
     * @return string
     */
    public static function home_url() {
        global $wpml_url_filters;
        if($wpml_url_filters) {
            remove_filter('home_url', array($wpml_url_filters, 'home_url_filter'), -10, 4);
        }
        $home_url = home_url();
        if($wpml_url_filters) {
            add_filter('home_url', array($wpml_url_filters, 'home_url_filter'), -10, 4);
        }
        return $home_url;
    }
}
