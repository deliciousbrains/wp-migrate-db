<?php

namespace DeliciousBrains\WPMDB\Common\Settings;

use DeliciousBrains\WPMDB\Common\Util\Util;

class Settings {

	/**
	 * @var Util
	 */
	public $util;
	/**
	 * @var
	 */
	private $settings;
	/**
	 * @var
	 */
	private static $static_settings;
	// The constructor is private
	// to prevent initiation with outer code.
	public function __construct( Util $util ) {
		$this->util = $util;

		// @TODO this shouldn't be fired every time the Settings class is called...
		$this->load_settings();
	}

	static function get_setting( $setting ) {
		if ( isset( self::$static_settings[ $setting ] ) ) {
			return self::$static_settings[ $setting ];
		}

		throw new \InvalidArgumentException( __( 'Setting does not exist', 'wp-migrate-db' ) );
	}

	public function get_settings() {

		// Assumes load_settings() has been called in base plugin (WPMigrateDB)
		return $this->settings;
	}

	public function load_settings() {
		$update_settings = false;
		$this->settings  = get_site_option( 'wpmdb_settings' );

		$default_settings = array(
			'key'                    => $this->util->generate_key(),
			'allow_pull'             => false,
			'allow_push'             => false,
			'profiles'               => array(),
			'licence'                => '',
			'verify_ssl'             => false,
			'whitelist_plugins'      => array(),
			'max_request'            => min( 1024 * 1024, $this->util->get_bottleneck( 'max' ) ),
			'delay_between_requests' => 0,
			'prog_tables_hidden'     => true,
			'pause_before_finalize'  => false,
			'allow_tracking'         => null,
		);

		// if we still don't have settings exist this must be a fresh install, set up some default settings
		if ( false === $this->settings ) {
			$this->settings  = $default_settings;
			$update_settings = true;
		} else {
			/*
			 * When new settings are added an existing customer's db won't have the new settings.
			 * They're added here to circumvent array index errors in debug mode.
			 */
			foreach ( $default_settings as $key => $value ) {
				if ( ! isset( $this->settings [ $key ] ) ) {
					$this->settings [ $key ] = $value;
					$update_settings         = true;
				}
			}
		}

		if ( $update_settings ) {
			update_site_option( 'wpmdb_settings', $this->settings );
		}
		self::$static_settings = $this->settings;
	}
}
