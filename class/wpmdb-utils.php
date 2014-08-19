<?php
class WPMDB_Utils {

	/**
	 * Test to see if executing an AJAX call specific to the WP Migrate DB family of plugins.
	 *
	 * @return bool
	 */
	public static function is_ajax() {
		// must be doing AJAX the WordPress way
		if ( ! defined( 'DOING_AJAX' ) || ! DOING_AJAX ) {
			return false;
		}

		// must be one of our actions -- e.g. core plugin (wpmdb_*), media files (wpmdbmf_*)
		if ( ! isset( $_POST['action'] ) || 0 !== strpos( $_POST['action'], 'wpmdb' ) ) {
			return false;
		}

		// must be on blog #1 (first site) if multisite
		if ( is_multisite() && 1 != get_current_site()->id ) {
			return false;
		}

		return true;
	}

}