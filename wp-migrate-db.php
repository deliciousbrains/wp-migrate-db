<?php
/*
Plugin Name: WP Migrate Lite
Plugin URI: https://deliciousbrains.com/
Description: Migrate your database. Export full sites including media, themes, and plugins. Find and replace content with support for serialized data.
Author: WP Engine
Version: 2.7.2
Author URI: https://deliciousbrains.com/wp-migrate-db-pro/?utm_source=plugin-header&utm_medium=plugin&utm_campaign=plugin-author&utm_content=wp-migrate-author
Update URI: false
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

defined( 'ABSPATH' ) || exit;

require_once 'version-lite.php';

if ( ! defined( 'WPMDB_FILE' ) ) {
	// Defines the path to the main plugin file.
	define( 'WPMDB_FILE', __FILE__ );

	// Defines the path to be used for includes.
	define( 'WPMDB_PATH', plugin_dir_path( WPMDB_FILE ) );
}

// TODO: Replace with checked-in prefixed libraries >>>
// NOTE: This path is updated during the build process.
$plugin_root = '/';

if ( ! defined( 'WPMDB_VENDOR_DIR' ) ) {
	define( 'WPMDB_VENDOR_DIR', __DIR__ . $plugin_root . "vendor" );
}

require WPMDB_VENDOR_DIR . '/autoload.php';
// TODO: Replace with checked-in prefixed libraries <<<

require 'setup-plugin.php';

if ( version_compare( PHP_VERSION, WPMDB_MINIMUM_PHP_VERSION, '>=' ) ) {
	require_once WPMDB_PATH . 'class/autoload.php';
	require_once WPMDB_PATH . 'setup-mdb.php';
}

function wpmdb_remove_mu_plugin() {
	do_action( 'wp_migrate_db_remove_compatibility_plugin' );
}

if ( file_exists( WPMDB_PATH . 'ext/wpmdb-ext-functions.php' ) ) {
	require_once WPMDB_PATH . 'ext/wpmdb-ext-functions.php';
}
