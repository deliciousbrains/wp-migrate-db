<?php
/*
Plugin Name: WP Migrate DB Pro
Plugin URI: http://deliciousbrains.com/wp-migrate-db-pro/
Description: Export, push, and pull to migrate your WordPress databases.
Author: Delicious Brains
Version: 1.4.3
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

$GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'] = '1.4.3';
$GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['folder'] = basename( plugin_dir_path( __FILE__ ) );

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

/**
 * once all plugins are loaded, load up the rest of this plugin
 */
function wp_migrate_db_pro_loaded() {
	// exit quickly unless: standalone admin; multisite network admin; one of our AJAX calls
	if ( ! is_admin() || ( is_multisite() && ! is_network_admin() && ! WPMDB_Utils::is_ajax() ) ) {
		return;
	}
	wp_migrate_db_pro();
}
add_action( 'plugins_loaded', 'wp_migrate_db_pro_loaded' );

function wp_migrate_db_pro_init() {
	// if neither WordPress admin nor running from wp-cli, exit quickly to prevent performance impact
	if ( !is_admin() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) return;

	load_plugin_textdomain( 'wp-migrate-db', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
}
add_action( 'init', 'wp_migrate_db_pro_init' );

/**
 * Populate the $wpmdbpro global with an instance of the WPMDBPro class and return it.
 *
 * @return WPMDBPro The one true global instance of the WPMDBPro class.
 */
function wp_migrate_db_pro() {
	global $wpmdbpro;

	if ( ! is_null( $wpmdbpro ) ) {
		return $wpmdbpro;
	}

	$abspath = dirname( __FILE__ );

	require_once $abspath . '/class/wpmdb-base.php';
	require_once $abspath . '/class/wpmdbpro-addon.php';
	require_once $abspath . '/class/wpmdb.php';
	require_once $abspath . '/class/wpmdbpro.php';

	$wpmdbpro = new WPMDBPro( __FILE__ );

	return $wpmdbpro;
}
