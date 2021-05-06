<?php

namespace DeliciousBrains\WPMDB\Common\Compatibility;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\UI\Notice;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Common\Util\Util;

/**
 * Class CompatibilityManager
 *
 * Class to handle the copying and removing of the Compatibility Mode MU plugin for WP Migrate DB Pro
 *
 */
class CompatibilityManager {

	/**
	 * @var string
	 */
	public $mu_plugin_source;
	/**
	 * @var string
	 */
	public $mu_plugin_dest;
	/**
	 * @var Filesystem
	 */
	public $filesystem;
	/**
	 * @var
	 */
	public $settings;
	/**
	 * @var string
	 */
	public $compatibility_plugin_version;
	/**
	 * @var string
	 */
	public $mu_plugin_dir;
	/**
	 * @var Properties
	 */
	public $props;
	/**
	 * @var Properties
	 */
	public static $static_props;
	/**
	 * @var Notice
	 */
	public $notices;
	/**
	 * @var TemplateBase
	 */
	public $template;
	/**
	 * @var Http
	 */
	public $http;
	/**
	 * @var MigrationStateManager
	 */
	public $migration_state;
    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_API_server;
    /**
     * @var Helper
     */
    private $http_helper;

    public function __construct(
		Filesystem $filesystem,
		Settings $settings,
		Notice $notice,
		Http $http,
		Helper $http_helper,
		TemplateBase $template,
		MigrationStateManager $migration_state,
		Util $util,
		Properties $properties,
        WPMDBRestAPIServer $rest_API_server
	) {

		$this->filesystem      = $filesystem;
		$this->settings        = $settings->get_settings();
		$this->props           = $properties;
		self::$static_props    = $this->props;
		$this->template        = $template;
		$this->notices         = $notice;
		$this->http            = $http;
		$this->migration_state = $migration_state;
		$this->util            = $util;

		//Version of the compatibility plugin, to force an update of the MU plugin, increment this value
		$this->compatibility_plugin_version = '1.2';

		$this->mu_plugin_dir    = $this->props->mu_plugin_dir;
		$this->mu_plugin_source = $this->props->mu_plugin_source;
		$this->mu_plugin_dest   = $this->props->mu_plugin_dest;
        $this->http_helper = $http_helper;
    }

	public function register() {
		// Checks the compatibility mode MU plugin version and updates if it's out of date.
		add_action( 'admin_init', array( $this, 'muplugin_version_check' ), 1 );

		// Fired in the register_deactivation_hook() call in both the pro and non-pro plugins.
		add_action( 'wp_migrate_db_remove_compatibility_plugin', array( $this, 'remove_muplugin_on_deactivation' ) );
	}

	public function addNotices(){
        add_filter('wpmdb_notification_strings', array($this, 'template_muplugin_update_fail'));
    }

	/**
	 * Triggered with the `admin_init` hook on the WP Migrate DB Pro dashboard page
	 *
	 * The 'compatibility_plugin_version' option key signifies that the latest compatibility plugin has been installed. If it's not present, copy the plugin, enabling it by default.
	 *
	 * Otherwise check the 'compatibility_plugin_version' option to see if the MU plugin needs updating.
	 *
	 * @return bool|string
	 */
	public function muplugin_version_check() {
		if ( isset( $_GET['page'] ) && in_array( $_GET['page'], array( 'wp-migrate-db-pro', 'wp-migrate-db' ) ) ) {
			if ( true === $this->is_muplugin_update_required() ) {
				return $this->copy_muplugin();
			}
		}

		return false;
	}

	/**
	 * Checks if the compatibility mu-plugin requires an update based on the 'compatibility_plugin_version' setting in
	 * the database
	 *
	 * @param bool $wpmdb_settings
	 *
	 * @return bool
	 */
	public function is_muplugin_update_required( $wpmdb_settings = false ) {
		$update_required = false;

		if ( false === $wpmdb_settings ) {
			$wpmdb_settings = $this->settings;
		}

		if ( ! isset( $wpmdb_settings['compatibility_plugin_version'] ) ) {
			$update_required = true;
		} else if ( version_compare( $this->compatibility_plugin_version, $wpmdb_settings['compatibility_plugin_version'], '>' ) && $this->util->is_muplugin_installed() ) {
			$update_required = true;
		}

		return $update_required;
	}

	/**
	 * Preemptively shows a warning warning on WPMDB pages if the mu-plugins folder isn't writable
	 */
	function template_muplugin_update_fail($notifications) {
		if ( $this->is_muplugin_update_required() && false === $this->util->is_muplugin_writable() ) {
            $notice_id = 'muplugin_failed_update_' . $this->compatibility_plugin_version;
			$notice_links = $this->notices->check_notice( $notice_id, 'SHOW_ONCE' );

			if ( is_array( $notice_links ) ) {
                $notifications[$notice_id] = [
                    'message' => $this->template->template_to_string('muplugin-failed-update-warning', 'common', $notice_links),
                    'link'    => $notice_links,
                    'id'      => $notice_id,
                ];
			}
		}
		return $notifications;
	}

	/**
	 *
	 * Copies the compatibility plugin as well as updates the version number in the database
	 *
	 * @return bool|string
	 */
	public function copy_muplugin() {
		$wpmdb_settings = $this->settings;

		// Make the mu-plugins folder if it doesn't already exist, if the folder does exist it's left as-is.
		if ( ! $this->filesystem->mkdir( $this->mu_plugin_dir ) ) {
			return sprintf( esc_html__( 'The following directory could not be created: %s', 'wp-migrate-db' ), $this->mu_plugin_dir );
		}

		if ( ! $this->filesystem->copy( $this->mu_plugin_source, $this->mu_plugin_dest ) ) {
			return sprintf( __( 'The compatibility plugin could not be activated because your mu-plugin directory is currently not writable.  Please update the permissions of the mu-plugins folder:  %s', 'wp-migrate-db' ), $this->mu_plugin_dir );
		}

		//Rename muplugin in header
		if ( ! $this->props->is_pro ) {
			$mu_contents = file_get_contents( $this->mu_plugin_dest );
			$mu_contents = str_replace( 'Plugin Name: WP Migrate DB Pro Compatibility', 'Plugin Name: WP Migrate DB Compatibility', $mu_contents );
			file_put_contents( $this->mu_plugin_dest, $mu_contents );
		}

		if ( $this->is_muplugin_update_required() ) {
			// Update version number in the database
			$wpmdb_settings['compatibility_plugin_version'] = $this->compatibility_plugin_version;

			// Remove blacklist_plugins key as it's no longer used.
			if ( isset( $wpmdb_settings['blacklist_plugins'] ) ) {
				unset( $wpmdb_settings['blacklist_plugins'] );
			}

			update_site_option( 'wpmdb_settings', $wpmdb_settings );
		}

		return true;
	}

	/**
	 *
	 * Removes the compatibility plugin
	 *
	 * @return bool|string
	 */
	public function remove_muplugin() {
		if ( $this->filesystem->file_exists( $this->mu_plugin_dest ) && ! $this->filesystem->unlink( $this->mu_plugin_dest ) ) {
			return sprintf( __( 'The compatibility plugin could not be deactivated because your mu-plugin directory is currently not writable.  Please update the permissions of the mu-plugins folder: %s', 'wp-migrate-db' ), $this->mu_plugin_dir );
		}

		return true;
	}

	/**
	 *
	 * Fired on the `wp_migrate_db_remove_compatibility_plugin` action. Removes the compatibility plugin on deactivation
	 *
	 * @return bool|string
	 */
	public function remove_muplugin_on_deactivation() {
		$plugin_removed = $this->remove_muplugin();

		if ( true === $plugin_removed ) {
			$wpmdb_settings = $this->settings;
			unset( $wpmdb_settings['compatibility_plugin_version'] );

			update_site_option( 'wpmdb_settings', $wpmdb_settings );

			return true;
		}

		return $plugin_removed;
	}
}
