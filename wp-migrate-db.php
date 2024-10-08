<?php
/*
Plugin Name: WP Migrate Lite
Plugin URI: https://deliciousbrains.com/
Description: Migrate your database. Export full sites including media, themes, and plugins. Find and replace content with support for serialized data.
Author: WP Engine
Version: 2.7.0
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

if (class_exists('\Deliciousbrains\MigrateDevTools\Launcher') && \DeliciousBrains\WPMDB\Common\Util\Util::is_dev_environment()) {
    \Deliciousbrains\MigrateDevTools\Launcher::register($wpmdb_base_path);
}

/**
 * Initialize the checking for plugin updates.
 */
function wpmdb_check_for_upgrades() {
	$properties = array(
		'plugin_slug'     => 'wp-migrate-db',
		'plugin_basename' => plugin_basename( __FILE__ ),
	);

	require_once __DIR__ . '/class/Free/PluginUpdater.php';
	new \DeliciousBrains\WPMDB\Free\PluginUpdater( $properties );
}
add_action( 'admin_init', 'wpmdb_check_for_upgrades' );
