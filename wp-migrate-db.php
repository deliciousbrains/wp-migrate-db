<?php
/*
Plugin Name: WP Migrate DB
Plugin URI: http://wordpress.org/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Delicious Brains
Version: 0.6
Author URI: http://deliciousbrains.com
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

$GLOBALS['wpmdb_meta']['wp-migrate-db']['version'] = '0.6';

if ( ! class_exists( 'WPMDB_Utils' ) ) {
	require dirname( __FILE__ ) . '/class/wpmdb-utils.php';
}

// Define the directory seperator if it isn't already
if( !defined( 'DS' ) ) {
	if (strtoupper(substr(PHP_OS, 0, 3)) == 'WIN') {
		define('DS', '\\');
	}
	else {
		define('DS', '/');
	}
}

function wp_migrate_db_loaded() {
	// exit quickly unless: standalone admin; multisite network admin; one of our AJAX calls
	if ( ! is_admin() || ( is_multisite() && ! is_network_admin() && ! WPMDB_Utils::is_ajax() ) ) {
		return;
	}
	wp_migrate_db();
}
add_action( 'plugins_loaded', 'wp_migrate_db_loaded' );

function wp_migrate_db_init() {
	// if neither WordPress admin nor running from wp-cli, exit quickly to prevent performance impact
	if ( !is_admin() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) return;

	load_plugin_textdomain( 'wp-migrate-db', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
}
add_action( 'init', 'wp_migrate_db_init' );

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

	$wpmdb = new WPMDB( __FILE__ );

	return $wpmdb;
}
