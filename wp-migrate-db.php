<?php
/*
Plugin Name: WP Migrate Lite
Plugin URI: https://wordpress.org/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Delicious Brains
Version: 2.4.2
Author URI: https://deliciousbrains.com/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting
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

$wpmdb_base_path = dirname( __FILE__ );

require_once 'version-lite.php';



$plugin_root = '/';

if(!defined('WPMDB_VENDOR_DIR')){
    define('WPMDB_VENDOR_DIR', __DIR__ . $plugin_root."vendor");
}

require WPMDB_VENDOR_DIR . '/autoload.php';

require 'setup-plugin.php';

if ( version_compare( PHP_VERSION, WPMDB_MINIMUM_PHP_VERSION, '>=' ) ) {
	require_once $wpmdb_base_path . '/class/autoload.php';
	require_once $wpmdb_base_path . '/setup-mdb.php';
}

function wpmdb_remove_mu_plugin() {
	do_action( 'wp_migrate_db_remove_compatibility_plugin' );
}
