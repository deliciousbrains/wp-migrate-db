<?php

namespace DeliciousBrains\WPMDB\Common\Error;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\WPMDBDI;

class ErrorLog
{

    /**
     * @var
     */
    public $error_log;
    /**
     * @var
     */
    public $state_data;
    /**
     * @var Properties
     */
    public $props;
    /**
     * @var Settings
     */
    private $settings;
    /**
     * @var Filesystem
     */
    private $filesystem;

    /**
     * @var $error
     */
    private $error;
    /**
     * @var Util
     */
    private $util;

    public function __construct(
        Settings $settings,
        Filesystem $filesystem,
        Util $util,
        Properties $properties
    ) {
        $this->props      = $properties;
        $this->settings   = $settings->get_settings();
        $this->filesystem = $filesystem;
        $this->util       = $util;
    }

    public function get_error_log()
    {
        return $this->error_log;
    }

    /**
     * Loads the error log into the error log class property.
     */
    function load_error_log()
    {
        $this->error_log = get_site_option('wpmdb_error_log');

        /*
         * The error log was previously stored and retrieved using get_option and update_option respectively.
         * Here we update the subsite option to a network wide option if applicable.
         */
        if (false === $this->error_log && is_multisite() && is_network_admin()) {
            $this->error_log = get_option('wpmdb_error_log');
            if (false !== $this->error_log) {
                update_site_option('wpmdb_error_log', $this->error_log);
                delete_option('wpmdb_error_log');
            }
        }

        return $this->error_log;
    }

    function log_error($wpmdb_error, $additional_error_var = false)
    {
        $state_data = WPMDBDI::getInstance()->get(MigrationStateManager::class)->set_post_data();

        $error_header = "********************************************\n******  Log date: " . date('Y/m/d H:i:s') . " ******\n********************************************\n\n";
        $error        = $error_header;
        if (isset($state_data['intent'])) {
            $error .= 'Intent: ' . $state_data['intent'] . "\n";
        }
        if (isset($state_data['action'])) {
            $error .= 'Action: ' . $state_data['action'] . "\n";
        }
        if (isset($state_data['local']) && isset($state_data['local']['site_url'])) {
            $error .= 'Local: ' . $state_data['site_details']['local']['site_url'] . "\n";
        }
        if (isset($state_data['remote']) && isset($state_data['remote']['site_url'])) {
            $error .= 'Remote: ' . $state_data['site_details']['remote']['site_url'] . "\n\n";
        }
        $error .= 'WPMDB Error: ' . $wpmdb_error . "\n\n";

        if (!empty($this->props->attempting_to_connect_to)) {
            $ip    = $this->get_remote_ip($this->props->attempting_to_connect_to);
            $error .= 'Attempted to connect to: ' . $this->props->attempting_to_connect_to . ' (' . ($ip ? $ip : 'ip lookup failed') . ')' . "\n\n";
        }

        if ($additional_error_var !== false) {
            // don't print the whole response object to the log
            if (is_array($additional_error_var) && isset($additional_error_var['http_response'])) {
                if (isset($additional_error_var['http_response']) && ($additional_error_var['http_response'] instanceof \WP_HTTP_Requests_Response)) {
                    $response                    = $additional_error_var['http_response']->get_response_object();
                    $additional_error_var['url'] = $response->url;
                }
                unset($additional_error_var['http_response']);
            }

            $error .= print_r($additional_error_var, true) . "\n\n";
        }

        $this->load_error_log();

        // Error log length in bytes (default 1Mb)
        $max_log_length            = apply_filters('wpmdb_max_error_log_length', 1000000);
        $max_individual_log_length = apply_filters('wpmdb_max_individual_error_log_length', $max_log_length / 2.2);

        // If error is longer than max individual log length, trim and add notice of doing so
        if (strlen($error) > $max_individual_log_length) {
            $length_trimmed = strlen($error) - $max_individual_log_length;
            $error          = substr($error, 0, $max_individual_log_length);
            $error          .= "\n[$length_trimmed bytes were truncated from this error]\n\n";
        }

        // Trim existing log to accommodate new error if needed
        $existing_log_max_length = $max_log_length - strlen($error);
        if (strlen($this->error_log) > $existing_log_max_length) {
            $this->error_log = substr($this->error_log, -($existing_log_max_length));

            // Crop at first log header
            $first_header_pos = strpos($this->error_log, substr($error_header, 0, strpos($error_header, ' ')));
            if ($first_header_pos) {
                $this->error_log = substr($this->error_log, $first_header_pos);
            }
        }

        if (isset($this->error_log)) {
            $this->error_log .= $error;
        } else {
            $this->error_log = $error;
        }

        update_site_option('wpmdb_error_log', $this->error_log);
    }

    function get_remote_ip($url)
    {
        $parsed_url = Util::parse_url($url);
        if (!isset($parsed_url['host'])) {
            return false;
        }
        // '.' appended to host name to avoid issues with nslookup caching - see documentation of gethostbyname for more info
        $host = $parsed_url['host'] . '.';

        $ip = gethostbyname($host);

        return ($ip === $host) ? false : $ip;
    }

    /**
     * Check for wpmdb-download-log and related nonce
     * if found begin diagnostic logging
     *
     * @return void
     */
    function http_prepare_download_log()
    {
        if (isset($_GET['wpmdb-download-log']) && wp_verify_nonce($_GET['nonce'], 'wpmdb-download-log')) {
            ob_start();
            $this->output_diagnostic_info();
            $this->output_log_file();
            $log      = ob_get_clean();
            $url      = Util::parse_url(home_url());
            $host     = sanitize_file_name($url['host']);
            $filename = sprintf('%s-diagnostic-log-%s.txt', $host, date('YmdHis'));
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Length: ' . strlen($log));
            header('Content-Disposition: attachment; filename=' . $filename);
            echo $log;
            exit;
        }
    }

    /**
     * Outputs useful diagnostic info text at the Diagnostic Info & Error Log
     * section under the Help tab so the information can be viewed or
     * downloaded and shared for debugging.
     *
     *
     * @return void
     */
    function output_diagnostic_info()
    {
        $diagnostic_info = $this->get_diagnostic_info();

        foreach ($diagnostic_info as $section => $arr) {
            $key_lengths    = array_map('strlen', array_keys($arr));
            $max_key_length = max($key_lengths);
            foreach ($arr as $key => $val) {
                if (0 === $key) {
                    echo $val . "\r\n";
                    continue;
                }
                if (is_array($val)) {
                    foreach ($val as $subsection => $subval) {
                        echo " - ";
                        if (!preg_match('/^\d+$/', $subsection)) {
                            echo "$subsection: ";
                        }
                        echo "$subval\r\n";
                    }
                    continue;
                }
                if (!preg_match('/^\d+$/', $key)) {
                    $pad_chr = '.';
                    if ($max_key_length - strlen($key) < 3) {
                        $pad_chr = ' ';
                    }
                    echo str_pad("$key: ", $max_key_length + 2, $pad_chr, STR_PAD_RIGHT);
                }
                echo " $val\r\n";
            }
            echo "\r\n";
        }

        return;
    }

    /**
     * Gets diagnostic information about current site
     *
     * @return array
     */
    function get_diagnostic_info()
    {
        global $wpdb;
        $diagnostic_info = array(); // group display sections into arrays

        $diagnostic_info['basic-info'] = array(
            'site_url()' => site_url(),
            'home_url()' => Util::home_url(),
        );

        $diagnostic_info['db-info'] = array(
            'Database Name' => $wpdb->dbname,
            'Table Prefix'  => $wpdb->base_prefix,
        );

        $diagnostic_info['wp-version'] = array(
            'WordPress Version' => get_bloginfo('version'),
        );

        if (is_multisite()) {
            $diagnostic_info['multisite-info'] = array(
                'Multisite'            => defined('SUBDOMAIN_INSTALL') && SUBDOMAIN_INSTALL ? 'Sub-domain' : 'Sub-directory',
                'Domain Current Site'  => defined('DOMAIN_CURRENT_SITE') ? DOMAIN_CURRENT_SITE : 'Not Defined',
                'Path Current Site'    => defined('PATH_CURRENT_SITE') ? PATH_CURRENT_SITE : 'Not Defined',
                'Site ID Current Site' => defined('SITE_ID_CURRENT_SITE') ? SITE_ID_CURRENT_SITE : 'Not Defined',
                'Blog ID Current Site' => defined('BLOG_ID_CURRENT_SITE') ? BLOG_ID_CURRENT_SITE : 'Not Defined',
            );
        }

        $mdb_plugins = array();
        foreach (array_reverse($GLOBALS['wpmdb_meta']) as $wpmdb_plugin => $wpmdb_plugin_info) {
            if (strlen($wpmdb_plugin) > strlen('wp-migrate-db-pro')) {
                $wpmdb_plugin = str_replace('wp-migrate-db-pro-', '', $wpmdb_plugin);
            }
            $wpmdb_plugin               = ucwords(str_replace(array('wp', 'db', 'cli', '-'), array(
                'WP',
                'DB',
                'CLI',
                ' ',
            ), $wpmdb_plugin));
            $mdb_plugins[$wpmdb_plugin] = $wpmdb_plugin_info['version'];
        }
        $diagnostic_info['mdb-plugins'] = $mdb_plugins;

		$diagnostic_info['server-info'] = array(
			'Web Server'                      => ! empty( $_SERVER['SERVER_SOFTWARE'] ) ? $_SERVER['SERVER_SOFTWARE'] : '',
			'PHP'                             => ( function_exists( 'phpversion' ) ) ? phpversion() : '',
			'WP Memory Limit'                 => WP_MEMORY_LIMIT,
			'PHP Time Limit'                  => ( function_exists( 'ini_get' ) ) ? ini_get( 'max_execution_time' ) : '',
			'Blocked External HTTP Requests'  => ( ! defined( 'WP_HTTP_BLOCK_EXTERNAL' ) || ! WP_HTTP_BLOCK_EXTERNAL ) ? 'None' : ( WP_ACCESSIBLE_HOSTS ? 'Partially (Accessible Hosts: ' . WP_ACCESSIBLE_HOSTS . ')' : 'All' ),
			'fsockopen'                       => ( function_exists( 'fsockopen' ) ) ? 'Enabled' : 'Disabled',
			'OpenSSL'                         => ( $this->util->open_ssl_enabled() ) ? OPENSSL_VERSION_TEXT : 'Disabled',
			'cURL'                            => ( function_exists( 'curl_init' ) ) ? 'Enabled' : 'Disabled',
			'Enable SSL verification setting' => ( 1 == $this->settings['verify_ssl'] ) ? 'Yes' : 'No',
			// phpcs:disable
			'Opcache Enabled'                 => ( function_exists( 'ini_get' ) && ini_get( 'opcache.enable' ) ) ? 'Enabled' : 'Disabled',
			// phpcs:enable
		);

        $diagnostic_info['db-server-info'] = array(
            'MySQL'                    => mysqli_get_server_info($wpdb->dbh),
            'ext/mysqli'               => empty($wpdb->use_mysqli) ? 'no' : 'yes',
            'WP Locale'                => get_locale(),
            'DB Charset'               => DB_CHARSET,
            'WPMDB_STRIP_INVALID_TEXT' => (defined('WPMDB_STRIP_INVALID_TEXT') && WPMDB_STRIP_INVALID_TEXT) ? 'Yes' : 'No',
        );

        $diagnostic_info['debug-settings'] = array(
            'Debug Mode'    => (defined('WP_DEBUG') && WP_DEBUG) ? 'Yes' : 'No',
            'Debug Log'     => (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) ? 'Yes' : 'No',
            'Debug Display' => (defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY) ? 'Yes' : 'No',
            'Script Debug'  => (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? 'Yes' : 'No',
            'PHP Error Log' => (function_exists('ini_get')) ? ini_get('error_log') : '',
        );

        $server_limits = array(
            'WP Max Upload Size' => size_format(wp_max_upload_size()),
            'PHP Post Max Size'  => size_format($this->util->get_post_max_size()),
        );

        if (function_exists('ini_get')) {
            if ($suhosin_limit = ini_get('suhosin.post.max_value_length')) {
                $server_limits['Suhosin Post Max Value Length'] = is_numeric($suhosin_limit) ? size_format($suhosin_limit) : $suhosin_limit;
            }
            if ($suhosin_limit = ini_get('suhosin.request.max_value_length')) {
                $server_limits['Suhosin Request Max Value Length'] = is_numeric($suhosin_limit) ? size_format($suhosin_limit) : $suhosin_limit;
            }
        }
        $diagnostic_info['server-limits'] = $server_limits;

        $diagnostic_info['mdb-settings'] = array(
            'WPMDB Bottleneck'       => size_format($this->util->get_bottleneck()),
            'Compatibility Mode'     => (isset($GLOBALS['wpmdb_compatibility']['active'])) ? 'Yes' : 'No',
            'Delay Between Requests' => ($this->settings['delay_between_requests'] > 0) ? $this->settings['delay_between_requests'] . 's' : 0,
        );

        $constants = array(
            'WP_HOME'        => (defined('WP_HOME') && WP_HOME) ? WP_HOME : 'Not defined',
            'WP_SITEURL'     => (defined('WP_SITEURL') && WP_SITEURL) ? WP_SITEURL : 'Not defined',
            'WP_CONTENT_URL' => (defined('WP_CONTENT_URL') && WP_CONTENT_URL) ? WP_CONTENT_URL : 'Not defined',
            'WP_CONTENT_DIR' => (defined('WP_CONTENT_DIR') && WP_CONTENT_DIR) ? WP_CONTENT_DIR : 'Not defined',
            'WP_PLUGIN_DIR'  => (defined('WP_PLUGIN_DIR') && WP_PLUGIN_DIR) ? WP_PLUGIN_DIR : 'Not defined',
            'WP_PLUGIN_URL'  => (defined('WP_PLUGIN_URL') && WP_PLUGIN_URL) ? WP_PLUGIN_URL : 'Not defined',
        );

        if (is_multisite()) {
            $constants['UPLOADS']        = (defined('UPLOADS') && UPLOADS) ? UPLOADS : 'Not defined';
            $constants['UPLOADBLOGSDIR'] = (defined('UPLOADBLOGSDIR') && UPLOADBLOGSDIR) ? UPLOADBLOGSDIR : 'Not defined';
        }

        $diagnostic_info['constants'] = $constants;

        $diagnostic_info = array_merge($diagnostic_info, apply_filters('wpmdb_diagnostic_info', array(), $diagnostic_info));

        $theme_info     = wp_get_theme();
        $theme_info_log = array(
            'Active Theme Name'   => $theme_info->Name,
            'Active Theme Folder' => $theme_info->get_stylesheet_directory(),
        );
        if ($theme_info->get('Template')) {
            $theme_info_log['Parent Theme Folder'] = $theme_info->get('Template');
        }
        if (!$this->filesystem->file_exists($theme_info->get_stylesheet_directory())) {
            $theme_info_log['WARNING'] = 'Active Theme Folder Not Found';
        }
        $diagnostic_info['theme-info'] = $theme_info_log;

        $active_plugins_log = array('Active Plugins');

        $active_plugins_log[1] = array();
        if (isset($GLOBALS['wpmdb_compatibility']['active'])) {
            $whitelist = array_flip((array)$this->settings['whitelist_plugins']);
        } else {
            $whitelist = array();
        }
        $active_plugins = (array)get_option('active_plugins', array());
        if (is_multisite()) {
            $network_active_plugins = wp_get_active_network_plugins();
            $active_plugins         = array_map(array($this->util, 'remove_wp_plugin_dir'), $network_active_plugins);
        }
        foreach ($active_plugins as $plugin) {
            if (!file_exists(WP_PLUGIN_DIR . '/' . $plugin)) {
                continue;
            }
            $active_plugins_log[1][] = $this->util->get_plugin_details(WP_PLUGIN_DIR . '/' . $plugin, isset($whitelist[$plugin]) ? '*' : '');
        }

        $diagnostic_info['active-plugins'] = $active_plugins_log;

        $mu_plugins = wp_get_mu_plugins();
        if ($mu_plugins) {
            $mu_plugins_log    = array('Must-Use Plugins');
            $mu_plugins_log[1] = array();
            foreach ($mu_plugins as $mu_plugin) {
                $mu_plugins_log[1][] = $this->util->get_plugin_details($mu_plugin);
            }
            $diagnostic_info['mu-plugins'] = $mu_plugins_log;
        }

        return $diagnostic_info;
    }

    function output_log_file()
    {
        $error_log = $this->load_error_log();
        if (!empty($error_log)) {
            echo $error_log;
        }
    }

    /**
     * @return mixed
     */
    public function getError()
    {
        return $this->error;
    }

    /**
     * @param mixed $error
     */
    public function setError($error)
    {
        $this->error = $error;
    }
}
