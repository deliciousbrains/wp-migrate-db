<?php

namespace DeliciousBrains\WPMDB;

class WPMigrateDB {

	/**
	 * @var CompatibilityManager
	 */
	private $compatibility_manager;
	/**
	 * @var Properties
	 */
	private $props;
	/**
	 * @var Util
	 */
	private $util;
	/**
	 * @var ProfileManager
	 */
	private $profile_manager;
	/**
	 * @var BackupExport
	 */
	private $backup_export;
	/**
	 * @var SettingsManager
	 */
	private $settings_manager;

	public function __construct( $pro = false ) {
		$container = Container::getInstance();

		// Only call this once
		$container->setUpProviders( $pro );

		$this->props                 = $container->get( 'properties' );
		$this->util                  = $container->get( 'util' );
		$this->profile_manager       = $container->get( 'profile_manager' );
		$this->backup_export         = $container->get( 'backup_export' );
		$this->compatibility_manager = $container->get( 'compatibility_manager' );
		$this->settings_manager      = $container->get( 'settings_manager' );
	}

	public function register() {
		add_action( 'init', array( $this, 'loadPluginTextDomain' ) );
		// For Firefox extend "Cache-Control" header to include 'no-store' so that refresh after migration doesn't override JS set values.
		add_filter( 'nocache_headers', array( $this->util, 'nocache_headers' ) );

		$this->profile_manager->register();
		$this->backup_export->register();
		$this->compatibility_manager->register();
		$this->settings_manager->register();
	}

	public function loadPluginTextDomain() {
		load_plugin_textdomain( 'wp-migrate-db', false, dirname( plugin_basename( $this->props->plugin_file_path  ) ) . '/languages/' );
	}
}
