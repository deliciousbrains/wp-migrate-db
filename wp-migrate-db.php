<?php
/*
Plugin Name: WP Migrate DB
Plugin URI: https://wordpress.org/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Delicious Brains
Version: 1.0.10
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

$wpmdb_base_path                                   = dirname( __FILE__ );
$GLOBALS['wpmdb_meta']['wp-migrate-db']['version'] = '1.0.10';

if ( ! defined( 'WPMDB_MINIMUM_PHP_VERSION' ) ) {
	define( 'WPMDB_MINIMUM_PHP_VERSION', '5.4' );
}

if ( version_compare( PHP_VERSION, WPMDB_MINIMUM_PHP_VERSION, '>=' ) ) {
	require_once $wpmdb_base_path . '/class/autoload.php';
	require_once $wpmdb_base_path . '/setup-mdb.php';
}

if ( ! function_exists( 'wpmdb_deactivate_other_instances' ) ) {
	require_once $wpmdb_base_path . '/class/deactivate.php';
}

add_action( 'activated_plugin', 'wpmdb_deactivate_other_instances' );

if ( ! class_exists( 'WPMDB_PHP_Checker' ) ) {
	require_once $wpmdb_base_path . '/php-checker.php';
}

$php_checker = new WPMDB_PHP_Checker( __FILE__, WPMDB_MINIMUM_PHP_VERSION );
if ( ! $php_checker->is_compatible_check() ) {
	register_activation_hook( __FILE__, array( 'WPMDB_PHP_Checker', 'wpmdb_php_version_too_low' ) );
}

function wpmdb_remove_mu_plugin() {
	do_action( 'wp_migrate_db_remove_compatibility_plugin' );
}
