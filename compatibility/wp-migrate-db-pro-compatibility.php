<?php
/*
Plugin Name: WP Migrate DB Pro Compatibility
Plugin URI: http://deliciousbrains.com/wp-migrate-db-pro/
Description: Prevents 3rd party plugins from being loaded during WP Migrate DB Pro specific operations
Author: Delicious Brains
Version: 1.0
Author URI: http://deliciousbrains.com
*/

$GLOBALS['wpmdb_compatibility'] = true;


/**
* remove blog-active plugins
* @param array $plugins numerically keyed array of plugin names
* @return array
*/
function wpmdbc_exclude_plugins( $plugins ) {
	if ( !defined( 'DOING_AJAX' ) || !DOING_AJAX || !isset( $_POST['action'] ) || false === strpos( $_POST['action'], 'wpmdb' ) ) return $plugins;
	$wpmdb_settings = get_option( 'wpmdb_settings' );
	if ( !empty( $wpmdb_settings['blacklist_plugins'] ) ) {
		$blacklist_plugins = array_flip( $wpmdb_settings['blacklist_plugins'] );
	}
	foreach( $plugins as $key => $plugin ) {
		if ( false !== strpos( $plugin, 'wp-migrate-db-pro' ) || !isset( $blacklist_plugins[$plugin] ) ) continue;
		unset( $plugins[$key] );
	}
	return $plugins;
}
add_filter( 'option_active_plugins', 'wpmdbc_exclude_plugins' );


/**
* remove network-active plugins
* @param array $plugins array of plugins keyed by name (name=>timestamp pairs)
* @return array
*/
function wpmdbc_exclude_site_plugins( $plugins ) {
	if ( !defined( 'DOING_AJAX' ) || !DOING_AJAX || !isset( $_POST['action'] ) || false === strpos( $_POST['action'], 'wpmdb' ) ) return $plugins;
	$wpmdb_settings = get_option( 'wpmdb_settings' );
	if ( !empty( $wpmdb_settings['blacklist_plugins'] ) ) {
		$blacklist_plugins = array_flip( $wpmdb_settings['blacklist_plugins'] );
	}
	foreach( array_keys( $plugins ) as $plugin ) {
		if ( false !== strpos( $plugin, 'wp-migrate-db-pro' ) || !isset( $blacklist_plugins[$plugin] ) ) continue;
		unset( $plugins[$plugin] );
	}
	return $plugins;
}
add_filter( 'site_option_active_sitewide_plugins', 'wpmdbc_exclude_site_plugins' );
