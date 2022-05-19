<?php

/**
 * Class WPMDB_PHP_Checker
 *
 * Check's to see if a site's PHP version is below self::$min_php, disables WP Migrate DB/Pro if PHP is below minimum
 *
 * To increase the required PHP version, change the self::$min_php value here and update
 * the WPMDB_MINIMUM_PHP_VERSION constant in wp-migrate-db-pro.php and wp-migrate-db.php
 *
 * Addons are hardcoded to have 5.4 as a minimum.
 *
 * For which activation hooks to use:
 *
 * @see https://pento.net/2014/02/18/dont-let-your-plugin-be-activated-on-incompatible-sites/
 */
class WPMDB_PHP_Checker {

	public $path;
	public static $base_message, $php_doc_link, $min_php;

	public function __construct( $path, $min_php ) {
		$this->path         = $path;

		self::$min_php      =  $min_php; // To increase the minimum PHP required, change this value _AND_ WPMDB_MINIMUM_PHP_VERSION in the main plugin files
		self::$base_message = __( '%s requires PHP version %s or higher and cannot be activated. You are currently running version %s. <a href="%s">Learn&nbsp;More&nbsp;»</a>', 'wp-migrate-db' );
		self::$php_doc_link = 'https://deliciousbrains.com/wp-migrate-db-pro/doc/upgrading-php/';

		add_action( 'admin_init', array( $this, 'maybe_deactivate_plugin' ) );
	}

	public static function wpmdb_php_version_too_low() {
		wp_die( sprintf( self::$base_message, __( 'WP Migrate Lite' ), self::$min_php, PHP_VERSION, self::$php_doc_link ) );
	}

	public static function wpmdb_pro_php_version_too_low() {
		wp_die( sprintf( self::$base_message, __( 'WP Migrate' ), self::$min_php, PHP_VERSION, self::$php_doc_link ) );
	}

	public function maybe_deactivate_plugin() {
		if ( version_compare( PHP_VERSION, self::$min_php, '>=' ) || ! is_plugin_active( plugin_basename( $this->path ) ) ) {
			return;
		}

		deactivate_plugins( plugin_basename( $this->path ) );
		add_action( 'admin_notices', array( $this, 'disabled_notice' ) );
		if ( isset( $_GET['activate'] ) ) {
			unset( $_GET['activate'] );
		}
	}

	public function is_compatible_check() {
		if ( version_compare( PHP_VERSION, self::$min_php, '<' ) ) {
			return false;
		}

		return true;
	}

	public function disabled_notice() {
		$str = '
		<div class="updated" style="border-left: 4px solid #ffba00;">
				<p>%s %s</p>
		</div>';

		$plugin  = 'wp-migrate-db-pro.php' === basename( $this->path ) ? __( 'WP Migrate' ) : __( 'WP Migrate Lite' );
		$message = sprintf( __( 'requires PHP version %s or higher to run and has been deactivated. You are currently running version %s. <a href="%s">Learn More »</a>', 'wp-migrate-db' ), self::$min_php, PHP_VERSION, self::$php_doc_link );

		echo sprintf( $str, $plugin, $message );
	}
}
