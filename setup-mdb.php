<?php
/**
 * Populate the $wpmdb global with an instance of the WPMDB class and return it.
 *
 * @return DeliciousBrains\WPMDB\WPMigrateDB The one true global instance of the WPMDB class.
 */
function wp_migrate_db() {
	global $wpmdb;

	if ( ! is_null( $wpmdb ) ) {
		return $wpmdb;
	}

	$wpmdb = new DeliciousBrains\WPMDB\Free\WPMigrateDBFree();
	$wpmdb->register();

	return $wpmdb;
}

function wpmdb_cli_loaded() {
	// register with wp-cli if it's running, and command hasn't already been defined elsewhere
	if ( defined( 'WP_CLI' ) && WP_CLI && class_exists( '\DeliciousBrains\WPMDB\Common\Cli\Command' ) ) {
		\DeliciousBrains\WPMDB\Common\Cli\Command::register();
	}
}

add_action( 'plugins_loaded', 'wpmdb_cli_loaded', 20 );

function wpmdb_cli() {
	global $wpmdb_cli;

	if ( ! is_null( $wpmdb_cli ) ) {
		return $wpmdb_cli;
	}

	if ( function_exists( 'wp_migrate_db' ) ) {
		wp_migrate_db();
	} else {
		return false;
	}

	do_action( 'wp_migrate_db_cli_before_load' );

	$wpmdb_cli = \DeliciousBrains\WPMDB\Container::getInstance()->get( 'cli' );

	do_action( 'wp_migrate_db_cli_after_load' );

	return $wpmdb_cli;
}

function wpmdb_is_ajax() {
	// must be doing AJAX the WordPress way
	if ( ! defined( 'DOING_AJAX' ) || ! DOING_AJAX ) {
		return false;
	}

	// must be one of our actions -- e.g. core plugin (wpmdb_*), media files (wpmdbmf_*)
	if ( ! isset( $_POST['action'] ) || 0 !== strpos( $_POST['action'], 'wpmdb' ) ) {
		return false;
	}

	// must be on blog #1 (first site) if multisite
	if ( is_multisite() && 1 != get_current_site()->id ) {
		return false;
	}

	return true;
}

function wp_migrate_db_loaded() {
	// exit quickly unless: standalone admin; one of our AJAX calls
	if ( ! is_admin() || ( is_multisite() && ! current_user_can( 'manage_network_options' ) && ! wpmdb_is_ajax() ) ) {
		return false;
	}
	if ( function_exists( 'wp_migrate_db' ) ) {
		// Remove the compatibility plugin when the plugin is deactivated
		register_deactivation_hook( dirname( __FILE__) . '/wp-migrate-db.php', 'wpmdb_remove_mu_plugin' );

		wp_migrate_db();
	}
}

add_action( 'plugins_loaded', 'wp_migrate_db_loaded' );
