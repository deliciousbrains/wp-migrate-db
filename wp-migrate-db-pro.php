<?php
/*
Plugin Name: WP Migrate DB Pro
Plugin URI: http://deliciousbrains.com/wp-migrate-db-pro/
Description: Export, push, and pull to migrate your WordPress databases.
Author: Delicious Brains
Version: 1.4.1
Author URI: http://deliciousbrains.com
Network: True
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

$GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'] = '1.4.1';
$GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['folder'] = basename( plugin_dir_path( __FILE__ ) );

// Define the directory seperator if it isn't already
if( !defined( 'DS' ) ) {
	if (strtoupper(substr(PHP_OS, 0, 3)) == 'WIN') {
		define('DS', '\\');
	}
	else {
		define('DS', '/');
	}
}

function wp_migrate_db_pro_loaded() {
	// if neither WordPress admin nor running from wp-cli, exit quickly to prevent performance impact
	if ( !is_admin() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) return;

	require_once 'class/wpmdbpro-base.php';
	require_once 'class/wpmdbpro-addon.php';
	require_once 'class/wpmdbpro.php';

	global $wpmdbpro;
	$wpmdbpro = new WPMDBPro( __FILE__ );
}

add_action( 'plugins_loaded', 'wp_migrate_db_pro_loaded' );

function wp_migrate_db_pro_init() {
	// if neither WordPress admin nor running from wp-cli, exit quickly to prevent performance impact
	if ( !is_admin() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) return;

	load_plugin_textdomain( 'wp-migrate-db-pro', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
}

add_action( 'init', 'wp_migrate_db_pro_init' );
