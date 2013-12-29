<?php
/*
Plugin Name: WP Migrate DB Pro
Plugin URI: http://deliciousbrains.com/wp-migrate-db-pro/
Description: Export, push, and pull to migrate your WordPress databases.
Author: Delicious Brains
Version: 1.0
Author URI: http://deliciousbrains.com
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

if ( version_compare( PHP_VERSION, '5.2', '<' ) ) {
    // Thanks for this Yoast!
	if ( is_admin() && ( !defined( 'DOING_AJAX' ) || !DOING_AJAX ) ) {
		require_once ABSPATH.'/wp-admin/includes/plugin.php';
		deactivate_plugins( __FILE__ );
	    wp_die( __('WP Migrate DB Pro requires PHP 5.2 or higher, as does WordPress 3.2 and higher. The plugin has now disabled itself.', 'wp-migrate-db' ) );
	}
}

require_once 'class/wp-migrate-db.php';

// Define the directory seperator if it isn't already
if( !defined( 'DS' ) ) {
    if (strtoupper(substr(PHP_OS, 0, 3)) == 'WIN') {
        define('DS', '\\');
    }
    else {
        define('DS', '/');
    }
}

function wp_migrate_db_pro_init() {
    if ( !is_admin() ) return;

    global $wpmdbpro;
    $wpmdbpro = new WP_Migrate_DB_Pro( __FILE__ );
}

add_action( 'init', 'wp_migrate_db_pro_init' );