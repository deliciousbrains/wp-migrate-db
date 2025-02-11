<?php

if ( ! function_exists( 'wpmdb_check_for_upgrades' ) ) {
	/**
	 * Initialize the checking for plugin updates.
	 */
	function wpmdb_check_for_upgrades() {
		$properties = array(
			'plugin_slug'     => 'wp-migrate-db',
			'plugin_basename' => plugin_basename( WPMDB_FILE ),
		);

		require_once WPMDB_PATH . 'ext/PluginUpdater.php';
		new \DeliciousBrains\WPMDB\Free\PluginUpdater( $properties );
	}

	add_action( 'admin_init', 'wpmdb_check_for_upgrades' );
}
