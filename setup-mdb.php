<?php

defined( 'ABSPATH' ) || exit;

use DeliciousBrains\WPMDB\Common\Cli\Cli;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\WPMDBDI;

/**
 * Populate the $wpmdb global with an instance of the WPMDB class and return it.
 *
 * @return DeliciousBrains\WPMDB\WPMigrateDB The one true global instance of the WPMDB class.
 */
function wp_migrate_db() {
	global $wpmdb;

	//Load in front-end code
    require_once __DIR__ . '/react-wp-scripts.php';

    if ( ! is_null( $wpmdb ) ) {
		return $wpmdb;
	}

	$wpmdb = new DeliciousBrains\WPMDB\Free\WPMigrateDBFree( false );
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

	$wpmdb_cli = WPMDBDI::getInstance()->get( Cli::class );

	do_action( 'wp_migrate_db_cli_after_load' );

	return $wpmdb_cli;
}


function wp_migrate_db_loaded()
{
    if ( Util::is_frontend() ) {
        return false;
    }

    // @TODO revisit since we're reming is_admin()
    // exit quickly unless: standalone admin; one of our AJAX calls
    if (is_multisite() && !current_user_can('manage_network_options') && ! Util::wpmdb_is_ajax()) {
        return false;
    }
    if (function_exists('wp_migrate_db')) {
        // Remove the compatibility plugin when the plugin is deactivated
        register_deactivation_hook(dirname(__FILE__) . '/wp-migrate-db.php', 'wpmdb_remove_mu_plugin');

            wp_migrate_db();
    }
}

add_action('plugins_loaded', 'wp_migrate_db_loaded');
