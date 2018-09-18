<?php
/*
Plugin Name: WP Migrate DB
Plugin URI: https://wordpress.org/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Delicious Brains
Version: 1.0.4
Author URI: https://deliciousbrains.com
Network: True
Text Domain: wp-migrate-db
Domain Path: /languages/
*/

// Copyright (c) 2013 Delicious Brains. All rights reserved.
//
// Released under the GPL license
// http://www.opensource.org/licenses/gpl-license.php
//
// **********************************************************************
// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// **********************************************************************

$GLOBALS['wpmdb_meta']['wp-migrate-db']['version'] = '1.0.4';

if ( ! class_exists( 'WPMDB_Utils' ) ) {
	require dirname( __FILE__ ) . '/class/wpmdb-utils.php';
}

function wp_migrate_db_loaded() {
	// exit quickly unless: standalone admin; one of our AJAX calls
	if ( ! is_admin() || ( is_multisite() && ! current_user_can( 'manage_network_options' ) && ! WPMDB_Utils::is_ajax() ) ) {
		return false;
	}
	wp_migrate_db();
}

add_action( 'plugins_loaded', 'wp_migrate_db_loaded' );

/**
 * Populate the $wpmdb global with an instance of the WPMDB class and return it.
 *
 * @return WPMDB The one true global instance of the WPMDB class.
 */
function wp_migrate_db() {
	global $wpmdb;

	if ( ! is_null( $wpmdb ) ) {
		return $wpmdb;
	}

	$abspath = dirname( __FILE__ );

	require_once $abspath . '/class/wpmdb-base.php';
	require_once $abspath . '/class/wpmdb.php';
	require_once $abspath . '/class/wpmdb-replace.php';
	require_once $abspath . '/class/wpmdb-migration-state.php';
	require_once $abspath . '/class/wpmdb-sanitize.php';
	require_once $abspath . '/class/wpmdb-filesystem.php';
	require_once $abspath . '/class/wpmdb-compatibility-plugin-manager.php';

	$wpmdb = new WPMDB( __FILE__ );

	// Remove the compatibility plugin when the plugin is deactivated
	register_deactivation_hook( __FILE__, 'wpmdb_remove_mu_plugin' );

	return $wpmdb;
}

function wpmdb_cli_loaded() {
	// register with wp-cli if it's running, and command hasn't already been defined elsewhere
	if ( defined( 'WP_CLI' ) && WP_CLI && ! class_exists( 'WPMDB_Command' ) ) {
		require_once dirname( __FILE__ ) . '/class/wpmdb-command.php';
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

	require_once dirname( __FILE__ ) . '/class/wpmdb-cli.php';
	$wpmdb_cli = new WPMDB_CLI( __FILE__ );

	do_action( 'wp_migrate_db_cli_after_load' );

	return $wpmdb_cli;
}

add_action( 'activated_plugin', array( 'WPMDB_Utils', 'deactivate_other_instances' ) );

function wpmdb_remove_mu_plugin(){
	do_action( 'wp_migrate_db_remove_compatibility_plugin' );
}
