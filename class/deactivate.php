<?php

function wpmdb_get_active_plugins() {
	if ( is_multisite() ) {
		$active_plugins = (array) get_site_option( 'active_sitewide_plugins', array() );
		$active_plugins = array_keys( $active_plugins );
	} else {
		$active_plugins = (array) get_option( 'active_plugins', array() );
	}

	return $active_plugins;
}

/**
 * Checks if another version of WPMDB(Pro) is active and deactivates it.
 * To be hooked on `activated_plugin` so other plugin is deactivated when current plugin is activated.
 *
 * @param string $plugin
 *
 */
function wpmdb_deactivate_other_instances( $plugin ){
	if ( ! in_array( basename( $plugin ), array( 'wp-migrate-db-pro.php', 'wp-migrate-db.php' ) ) ) {
		return;
	}

	$plugin_to_deactivate  = 'wp-migrate-db.php';
	$deactivated_notice_id = '1';
	if ( basename( $plugin ) == $plugin_to_deactivate ) {
		$plugin_to_deactivate  = 'wp-migrate-db-pro.php';
		$deactivated_notice_id = '2';
	}

	$active_plugins = wpmdb_get_active_plugins();

	foreach ( $active_plugins as $basename ) {
		if ( false !== strpos( $basename, $plugin_to_deactivate ) ) {
			set_transient( 'wp_migrate_db_deactivated_notice_id', $deactivated_notice_id, 1 * HOUR_IN_SECONDS );
			deactivate_plugins( $basename );

			return;
		}
	}
}


/**
 * Check if both Pro and Free instances of the plugin are active at the same time.
 * And deactivates the free instance.
 * Hooked on `wpmdb_migration_complete`
 *
 * @param string $type Intent type
 */
function wpmdb_deactivate_free_instance_after_migration( $type ) {
	if ( $type !== 'import' ) {
		return;
	}
	// Flush WP cache to get list of active plugins from DB
	wp_cache_flush();

	$plugins = wpmdb_get_active_plugins();
	$pro_basename = $free_basename = false;

	foreach ( $plugins as $plugin ) {
		$basename = basename( $plugin );
		if ( $basename === 'wp-migrate-db-pro.php' ) {
			$pro_basename = $plugin;
			continue;
		}

		if ( $basename === 'wp-migrate-db.php' ) {
			$free_basename = $plugin;
		}
	}

	if ( $free_basename !== false && $pro_basename !== false ) {
		deactivate_plugins( $free_basename );
	}
}
