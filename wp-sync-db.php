<?php
/*
Plugin Name: WP Sync DB
Description: Export, push, and pull to migrate your WordPress databases.
Author: Sean Lang
Version: 1.4
Author URI: http://slang.cx
GitHub Plugin URI: wp-sync-db/wp-sync-db
*/

if ( version_compare( PHP_VERSION, '5.2', '<' ) ) {
	// Thanks for this Yoast!
	if ( is_admin() && ( !defined( 'DOING_AJAX' ) || !DOING_AJAX ) ) {
		require_once ABSPATH.'/wp-admin/includes/plugin.php';
		deactivate_plugins( __FILE__ );
		wp_die( __('WP Sync DB requires PHP 5.2 or higher, as does WordPress 3.2 and higher. The plugin has now disabled itself.', 'wp-sync-db' ) );
	}
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

function wp_sync_db_init() {
	if ( !is_admin() ) return;

	require_once 'class/wpsdb-base.php';
	require_once 'class/wpsdb-addon.php';
	require_once 'class/wpsdb.php';

	global $wpsdb;
	$wpsdb = new WPSDB( __FILE__ );
}

add_action( 'init', 'wp_sync_db_init', 5 );
