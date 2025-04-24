<?php

namespace DeliciousBrains\WPMDB\Common\Properties;

use DeliciousBrains\WPMDB\Common\Util\Singleton;
use DeliciousBrains\WPMDB\Common\Util\Util;

if (!function_exists('is_plugin_active') && !defined('DOING_WPMDB_TESTS')) {
    include_once(ABSPATH . 'wp-admin/includes/plugin.php');
}

/**
 * Class Properties
 *
 * This class acts as a global 'property store'. Legacy WPMDBPro had a confusing class hierarchy
 * with many class properties assigned all over. This class is intended to act as a 'storage' class
 * for these legacy properties.
 *
 * @TODO    Remove this class altogether with something more sane
 *
 * @package DeliciousBrains\WPMDB\Common
 */
class Properties
{

    use Singleton;

    public $addons;
    public $plugin_file_path;
    public $plugin_dir_path;
    public $plugin_slug;
    public $plugin_folder_name;
    public $plugin_basename;
    public $plugin_base;
    public $plugin_version;
    public $template_dir;
    public $is_pro = false;
    public $plugin_title;
    public $mu_plugin_dir;
    public $mu_plugin_source;
    public $mu_plugin_dest;
    public $filesystem;
    public $core_slug;
    public $attempting_to_connect_to;
    public $temp_prefix = '_mig_';
    public $transient_timeout;
    public $transient_retry_timeout;
    public $dbrains_api_status_url = 'https://s3.amazonaws.com/cdn.deliciousbrains.com/status.json';
    public $multipart_boundary = 'bWH4JVmYCnf6GfXacrcc';
    public $invalid_content_verification_error = 'Invalid content verification signature, please verify the connection information on the remote site and try again.';
    public $util;
    public $settingsClass;
    public $unhook_templates = [];
    public $rest_api_base = 'mdb-api/v1';

    public function __construct()
    {
        $is_pro = false;

        $this->transient_timeout       = 60 * 60 * 12;
        $this->transient_retry_timeout = 60 * 60 * 2;

        $free_plugin_active = is_plugin_active('wp-migrate-db-pro/wp-migrate-db.php');
        $pro_plugin_active  = is_plugin_active('wp-migrate-db-pro/wp-migrate-db-pro.php');

        if ($pro_plugin_active && !$free_plugin_active) {
            $is_pro = true;
        }

        $this->plugin_file_path = $is_pro ? realpath(dirname(__DIR__) . '/../../wp-migrate-db-pro.php') : realpath(dirname(__DIR__) . '/../../wp-migrate-db.php');

        if ($is_pro) {
            $this->unhook_templates = ['wordpress_org_support', 'progress_upgrade', 'sidebar'];
        }

        $this->plugin_dir_path    = plugin_dir_path($this->plugin_file_path);
        $this->plugin_folder_name = basename($this->plugin_dir_path);
        $this->plugin_basename    = plugin_basename($this->plugin_file_path);
        $this->template_dir       = $this->plugin_dir_path . 'template' . DIRECTORY_SEPARATOR;
        $this->plugin_title       = ucwords(str_ireplace('-', ' ', basename($this->plugin_file_path)));
        $this->plugin_title       = str_ireplace(array('db', 'wp', '.php'), array('DB', 'WP', ''), $this->plugin_title);

        $this->mu_plugin_dir    = (defined('WPMU_PLUGIN_DIR') && defined('WPMU_PLUGIN_URL')) ? WPMU_PLUGIN_DIR : trailingslashit(WP_CONTENT_DIR) . 'mu-plugins';
        $this->mu_plugin_source = trailingslashit($this->plugin_dir_path) . 'compatibility/wp-migrate-db-pro-compatibility.php';
        $this->mu_plugin_dest   = trailingslashit($this->mu_plugin_dir) . 'wp-migrate-db-pro-compatibility.php';

        // We need to set $this->plugin_slug here because it was set here
        // in Media Files prior to version 1.1.2. If we remove it the customer
        // cannot upgrade, view release notes, etc
        // used almost exclusively as a identifier for plugin version checking (both core and addons)
        $this->plugin_slug = basename($this->plugin_file_path, '.php');

        // used to add admin menus and to identify the core version in the $GLOBALS['wpmdb_meta'] variable for delicious brains api calls, version checking etc
        $this->core_slug = $is_pro ? 'wp-migrate-db-pro' : 'wp-migrate-db';
        $this->is_pro    = $is_pro;

        if (is_multisite()) {
            $this->plugin_base = 'settings.php?page=' . $this->core_slug;
        } else {
            $this->plugin_base = 'tools.php?page=' . $this->core_slug;
        }

        if (empty($this->core_slug)) {
            $this->core_slug;
        }

        if (isset($GLOBALS['wpmdb_meta'][$this->core_slug])) {
            $this->plugin_version = $GLOBALS['wpmdb_meta'][$this->core_slug]['version'];
        }

		// Other properties to set after init has fired
	    add_action('init', [$this, 'init'], 99);
    }

	/**
	 * Properties that need to be set after init has fired.
	 *
	 * @return void
	 * @handles init
	 */
	public function init() {
		// This needs to be after init so that translation functions work.
        $this->invalid_content_verification_error = __('Invalid content verification signature, please verify the connection information on the remote site and try again.', 'wp-migrate-db') . sprintf(__(' Remote URL: %s ', 'Ex. Remote URL: http://wp.dev', 'wp-migrate-db'), Util::home_url());
	}
}
