<?php

namespace DeliciousBrains\WPMDB\Common\Plugin;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sanitize;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Common\Util\Util;

/**
 * Class PluginManager
 *
 * @package DeliciousBrains\WPMDB\Common\Plugin
 */
class PluginManagerBase {

	/**
	 * @var Properties
	 */
	public $props;
	/**
	 * @var $settings
	 */
	public $settings;
	/**
	 * @var Assets
	 */
	public $assets;
	/**
	 * @var Util
	 */
	public $util;
	/**
	 * @var Table
	 */
	public $tables;
	/**
	 * @var Http
	 */
	public $http;
	/**
	 * @var Filesystem
	 */
	public $filesystem;
	/**
	 * @var
	 */
	public $addon;
	/**
	 * @var Multisite
	 */
	public $multisite;
	/**
	 * @var TemplateBase
	 */
	protected $template_base;

	/**
	 * PluginManagerBase constructor.
	 *
	 * Free and Pro extend this class
	 *
	 * @param Settings   $settings
	 * @param Assets     $assets
	 * @param Util       $util
	 * @param Table      $table
	 * @param Http       $http
	 * @param Filesystem $filesystem
	 * @param Multisite  $multisite
	 * @param Properties $properties
	 */
	public function __construct(
		Settings $settings,
		Assets $assets,
		Util $util,
		Table $table,
		Http $http,
		Filesystem $filesystem,
		Multisite $multisite,
		Properties $properties
	) {
		$this->props      = $properties;
		$this->settings   = $settings->get_settings();
		$this->assets     = $assets;
		$this->util       = $util;
		$this->tables     = $table;
		$this->http       = $http;
		$this->filesystem = $filesystem;
		$this->multisite  = $multisite;
	}

	/**
	 * Register a bunch of action and hooks for the plugin initialization
	 */
	public function register() {
		// display a notice when either WP Migrate DB or WP Migrate DB Pro is automatically deactivated
		add_action( 'pre_current_active_plugins', array( $this, 'plugin_deactivated_notice' ) );
		// check if WP Engine is filtering the buffer and prevent it
		add_action( 'plugins_loaded', array( $this, 'maybe_disable_wp_engine_filtering' ) );
		add_action( 'wp_ajax_wpmdb_process_notice_link', array( $this, 'ajax_process_notice_link' ) );
		add_action( 'wp_ajax_wpmdb_process_notice_link', array( $this, 'ajax_process_notice_link' ) );

		//Remove 'Expect' header which some setups have issues with
		add_filter( 'http_request_args', array( $this->util, 'preempt_expect_header' ), 10, 2 );

		add_action( 'admin_init', array( $this, 'maybe_schema_update' ) );
	}

	/**
	 * Performs a schema update if required.
	 *
	 */
	public function maybe_schema_update() {
		if ( ( defined( 'DOING_AJAX' ) && DOING_AJAX ) || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
			return;
		}

		$schema_version = get_site_option( 'wpmdb_schema_version' );
		$update_schema  = false;

		/*
		 * Upgrade this option to a network wide option if the site has been upgraded
		 * from a regular WordPress installation to a multisite installation.
		 */
		if ( false === $schema_version && is_multisite() && is_network_admin() ) {
			$schema_version = get_option( 'wpmdb_schema_version' );
			if ( false !== $schema_version ) {
				update_site_option( 'wpmdb_schema_version', $schema_version );
				delete_option( 'wpmdb_schema_version' );
			}
		}

		do_action( 'wpmdb_before_schema_update', $schema_version );

		if ( false === $schema_version ) {
			$schema_version = 0;
		}

		if ( $schema_version < 1 ) {
			$error_log = get_option( 'wpmdb_error_log' );
			// skip multisite installations as we can't use add_site_option because it doesn't include an 'autoload' argument
			if ( false !== $error_log && false === is_multisite() ) {
				delete_option( 'wpmdb_error_log' );
				add_option( 'wpmdb_error_log', $error_log, '', 'no' );
			}

			$update_schema  = true;
			$schema_version = 1;
		}

		if ( $schema_version < 2 ) {
			$update_schema  = true;
			$schema_version = 2;
		}

		if ( true === $update_schema ) {
			update_site_option( 'wpmdb_schema_version', $schema_version );
		}

		do_action( 'wpmdb_after_schema_update', $schema_version );
	}

	function plugin_deactivated_notice() {
		if ( false !== ( $deactivated_notice_id = get_transient( 'wp_migrate_db_deactivated_notice_id' ) ) ) {
			if ( '1' === $deactivated_notice_id ) {
				$message = __( "WP Migrate DB and WP Migrate DB Pro cannot both be active. We've automatically deactivated WP Migrate DB.", 'wp-migrate-db' );
			} else {
				$message = __( "WP Migrate DB and WP Migrate DB Pro cannot both be active. We've automatically deactivated WP Migrate DB Pro.", 'wp-migrate-db' );
			} ?>

			<div class="updated" style="border-left: 4px solid #ffba00;">
				<p><?php echo esc_html( $message ); ?></p>
			</div> <?php

			delete_transient( 'wp_migrate_db_deactivated_notice_id' );
		}
	}

	/**
	 * Supply inline JS data and nonces for enqueued scripts.
	 *
	 * @return void
	 */
	function admin_head_connection_info() {
		$site_details = $this->util->site_details();

		$nonces = apply_filters( 'wpmdb_nonces', array(
			'update_max_request_size'          => Util::create_nonce( 'update-max-request-size' ),
			'update_delay_between_requests'    => Util::create_nonce( 'update-delay-between-requests' ),
			'check_licence'                    => Util::create_nonce( 'check-licence' ),
			'verify_connection_to_remote_site' => Util::create_nonce( 'verify-connection-to-remote-site' ),
			'activate_licence'                 => Util::create_nonce( 'activate-licence' ),
			'clear_log'                        => Util::create_nonce( 'clear-log' ),
			'get_log'                          => Util::create_nonce( 'get-log' ),
			'save_profile'                     => Util::create_nonce( 'save-profile' ),
			'initiate_migration'               => Util::create_nonce( 'initiate-migration' ),
			'migrate_table'                    => Util::create_nonce( 'migrate-table' ),
			'finalize_migration'               => Util::create_nonce( 'finalize-migration' ),
			'reset_api_key'                    => Util::create_nonce( 'reset-api-key' ),
			'delete_migration_profile'         => Util::create_nonce( 'delete-migration-profile' ),
			'save_setting'                     => Util::create_nonce( 'save-setting' ),
			'copy_licence_to_remote_site'      => Util::create_nonce( 'copy-licence-to-remote-site' ),
			'reactivate_licence'               => Util::create_nonce( 'reactivate-licence' ),
			'process_notice_link'              => Util::create_nonce( 'process-notice-link' ),
			'flush'                            => Util::create_nonce( 'flush' ),
			'plugin_compatibility'             => Util::create_nonce( 'plugin_compatibility' ),
			'import_file'                      => Util::create_nonce( 'import-file' ),
			'whitelist_plugins'                => Util::create_nonce( 'whitelist_plugins' ),
			'cancel_migration'                 => Util::create_nonce( 'cancel_migration' ),
			'track_usage'                      => Util::create_nonce( 'track-usage' ),
			'send_migration_complete'          => Util::create_nonce( 'send-migration-complete' ),
		) );

		$data = apply_filters( 'wpmdb_data', array(
			'connection_info'        => array( site_url( '', 'https' ), $this->settings['key'] ),
			'this_url'               => esc_html( addslashes( home_url() ) ),
			'this_path'              => esc_html( addslashes( $this->util->get_absolute_root_file_path() ) ),
			'this_domain'            => esc_html( $this->multisite->get_domain_current_site() ),
			'this_tables'            => $this->tables->get_tables(),
			'this_prefixed_tables'   => $this->tables->get_tables( 'prefix' ),
			'this_table_sizes'       => $this->tables->get_table_sizes(),
			'this_table_sizes_hr'    => array_map( array( $this->tables, 'format_table_sizes' ), $this->tables->get_table_sizes() ),
			'this_table_rows'        => $this->tables->get_table_row_count(),
			'this_upload_url'        => esc_html( addslashes( trailingslashit( $this->filesystem->get_upload_info( 'url' ) ) ) ),
			'this_upload_dir_long'   => esc_html( addslashes( trailingslashit( $this->filesystem->get_upload_info( 'path' ) ) ) ),
			'this_uploads_dir'       => $site_details['uploads_dir'], // TODO: Remove backwards compatibility.
			'this_plugin_url'        => trailingslashit( plugins_url( $this->props->plugin_folder_name ) ),
			'this_website_name'      => sanitize_title_with_dashes( DB_NAME ),
			'this_download_url'      => network_admin_url( $this->props->plugin_base . '&download=' ),
			'this_prefix'            => $site_details['prefix'], // TODO: Remove backwards compatibility.
			'this_temp_prefix'       => $this->props->temp_prefix,
			'this_plugin_base'       => esc_html( $this->props->plugin_base ),
			'is_multisite'           => $site_details['is_multisite'], // TODO: Remove backwards compatibility.
			'openssl_available'      => esc_html( $this->util->open_ssl_enabled() ? 'true' : 'false' ),
			'max_request'            => esc_html( $this->settings['max_request'] ),
			'delay_between_requests' => esc_html( $this->settings['delay_between_requests'] ),
			'prog_tables_hidden'     => ( bool ) $this->settings['prog_tables_hidden'],
			'pause_before_finalize'  => ( bool ) $this->settings['pause_before_finalize'],
			'bottleneck'             => esc_html( $this->util->get_bottleneck( 'max' ) ),
			// TODO: Use WP_Filesystem API.
			'write_permission'       => esc_html( is_writeable( $this->filesystem->get_upload_info( 'path' ) ) ? 'true' : 'false' ),
			'nonces'                 => $nonces,
			'profile'                => isset( $_GET['wpmdb-profile'] ) ? $_GET['wpmdb-profile'] : '-1',
			'is_pro'                 => esc_html( $this->props->is_pro ? 'true' : 'false' ),
			'lower_case_table_names' => esc_html( $this->tables->get_lower_case_table_names_setting() ),
			'subsites'               => $site_details['subsites'], // TODO: Remove backwards compatibility.
			'site_details'           => $this->util->site_details(),
			'alter_table_name'       => $this->tables->get_alter_table_name(),
			'allow_tracking'         => $this->settings['allow_tracking'],
		) );

		wp_localize_script( 'wp-migrate-db-pro-script', 'wpmdb_data', $data );

	}

	/**
	 * When the "Use SSL for WP-admin and WP-login" option is checked in the
	 * WP Engine settings, the WP Engine must-use plugin buffers the output and
	 * does a find & replace for URLs. When we return PHP serialized data, it
	 * replaces http:// with https:// and corrupts the serialization.
	 * So here, we disable this filtering for our requests.
	 */
	public function maybe_disable_wp_engine_filtering() {
		// Detect if the must-use WP Engine plugin is running
		if ( ! defined( 'WPE_PLUGIN_BASE' ) ) {
			return;
		}

		// Make sure this is a WP Migrate DB Ajax request
		if ( ! Util::is_ajax() ) {
			return;
		}

		// Turn off WP Engine's output filtering
		if ( ! defined( 'WPE_NO_HTML_FILTER' ) ) {
			define( 'WPE_NO_HTML_FILTER', true );
		}
	}

	public function plugins_dir() {
		$path = untrailingslashit( $this->props->plugin_dir_path );

		return substr( $path, 0, strrpos( $path, DIRECTORY_SEPARATOR ) ) . DIRECTORY_SEPARATOR;
	}

	/**
	 * Handler for ajax request to process a link click in a notice, e.g. licence deactivated ... re-check.
	 *
	 * @return bool|null
	 */
	public function ajax_process_notice_link() {
		$this->http->check_ajax_referer( 'process-notice-link' );

		$key_rules = array(
			'action'   => 'key',
			'nonce'    => 'key',
			'notice'   => 'key',
			'type'     => 'key',
			'reminder' => 'int',
		);

		$_POST = Sanitize::sanitize_data( $_POST, $key_rules, __METHOD__ );

		if ( false === $_POST ) {
			exit;
		}

		global $current_user;
		$key   = 'wpmdb_' . $_POST['type'] . '_' . $_POST['notice'];
		$value = true;
		if ( 'reminder' === $_POST['type'] && isset( $_POST['reminder'] ) ) {
			$value = time() + ( is_numeric( $_POST['reminder'] ) ? $_POST['reminder'] : 604800 );
		}
		update_user_meta( $current_user->ID, $key, $value );

		$result = $this->http->end_ajax();

		return $result;
	}

	public function get_plugin_title() {
		return $this->props->is_pro ? __( 'Migrate DB Pro', 'wp-migrate-db' ) : __( 'Migrate DB', 'wp-migrate-db' );
	}
}
