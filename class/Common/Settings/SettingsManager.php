<?php

namespace DeliciousBrains\WPMDB\Common\Settings;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;

class SettingsManager {
	/**
	 * @var Http
	 */
	private $http;
	/**
	 * @var \DeliciousBrains\WPMDB\Common\Settings\Settings
	 */
	private $settings;
	/**
	 * @var MigrationStateManager
	 */
	private $state_manager;
	/**
	 * @var ErrorLog
	 */
	private $error_log;

	/**
	 * SettingsManager constructor.
	 *
	 * @param Http                  $http
	 * @param Settings              $settings
	 * @param MigrationStateManager $state_manager
	 * @param ErrorLog              $error_log
	 */
	public function __construct(
		Http $http,
		Settings $settings,
		MigrationStateManager $state_manager,
		ErrorLog $error_log
	) {
		$this->http = $http;
		$this->settings = $settings->get_settings();
		$this->state_manager = $state_manager;
		$this->error_log = $error_log;
	}

	public function register() {
		add_action( 'wp_ajax_wpmdb_save_setting', array( $this, 'ajax_save_setting' ) );
		add_action( 'wp_ajax_wpmdb_clear_log', array( $this, 'ajax_clear_log' ) );
		add_action( 'wp_ajax_wpmdb_get_log', array( $this, 'ajax_get_log' ) );
		add_action( 'wp_ajax_wpmdb_whitelist_plugins', array( $this, 'ajax_whitelist_plugins' ) );
		add_action( 'wp_ajax_wpmdb_update_max_request_size', array( $this, 'ajax_update_max_request_size' ) );
		add_action( 'wp_ajax_wpmdb_update_delay_between_requests', array( $this, 'ajax_update_delay_between_requests' ) );
	}

	/**
	 * Handler for ajax request to save a setting, e.g. accept pull/push requests setting.
	 *
	 * @return bool|null
	 */
	function ajax_save_setting() {
		$this->http->check_ajax_referer( 'save-setting' );

		$key_rules  = array(
			'action'  => 'key',
			'checked' => 'bool',
			'setting' => 'key',
			'nonce'   => 'key',
		);
		$state_data = $this->state_manager->set_post_data( $key_rules );

		$this->settings[ $state_data['setting'] ] = ( $state_data['checked'] == 'false' ) ? false : true;
		update_site_option( 'wpmdb_settings', $this->settings );
		$result = $this->http->end_ajax();

		return $result;
	}

	function ajax_clear_log() {
		$this->http->check_ajax_referer( 'clear-log' );
		delete_site_option( 'wpmdb_error_log' );
		$result = $this->http->end_ajax();

		return $result;
	}

	function ajax_get_log() {
		$this->http->check_ajax_referer( 'get-log' );
		ob_start();
		$this->error_log->output_diagnostic_info();
		$this->error_log->output_log_file();
		$return = ob_get_clean();
		$result = $this->http->end_ajax( $return );

		return $result;
	}

	/**
	 * Handler for updating the plugins that are not to be loaded during a request (Compatibility Mode).
	 */
	function ajax_whitelist_plugins() {
		$this->http->check_ajax_referer( 'whitelist_plugins' );

		$key_rules  = array(
			'action'            => 'key',
			'whitelist_plugins' => 'array',
		);
		$state_data = $this->state_manager->set_post_data( $key_rules );

		$this->settings['whitelist_plugins'] = (array) $state_data['whitelist_plugins'];
		update_site_option( 'wpmdb_settings', $this->settings );
		exit;
	}

	/**
	 * Updates the Maximum Request Size setting.
	 *
	 * @return void
	 */
	function ajax_update_max_request_size() {
		$this->http->check_ajax_referer( 'update-max-request-size' );

		$key_rules  = array(
			'action'           => 'key',
			'max_request_size' => 'positive_int',
			'nonce'            => 'key',
		);
		$state_data = $this->state_manager->set_post_data( $key_rules );

		$this->settings['max_request'] = (int) $state_data['max_request_size'] * 1024;
		$result                        = update_site_option( 'wpmdb_settings', $this->settings );
		$this->http->end_ajax( $result );
	}

	/**
	 * Updates the Delay Between Requests setting.
	 *
	 * @return void
	 */
	function ajax_update_delay_between_requests() {
		$this->http->check_ajax_referer( 'update-delay-between-requests' );

		$key_rules  = array(
			'action'                 => 'key',
			'delay_between_requests' => 'positive_int',
			'nonce'                  => 'key',
		);
		$state_data = $this->state_manager->set_post_data( $key_rules );

		$this->settings['delay_between_requests'] = (int) $state_data['delay_between_requests'];
		$result                                   = update_site_option( 'wpmdb_settings', $this->settings );
		$this->http->end_ajax( $result );
	}
}
