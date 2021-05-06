<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Properties\Properties;

class WPMDBRestAPIServer {

	/**
	 * @var Properties
	 */
	private $props;

	public function __construct(
		Properties $props
	) {
		$this->props = $props;
	}

	public function permission_callback() {
		$cap = is_multisite() ? 'manage_network_options' : 'export';
		$cap = apply_filters( 'wpmdb_ajax_cap', $cap );

		// Restrict endpoint to only users who have the edit_posts capability.
		if ( ! current_user_can( $cap ) ) {
			return new \WP_Error( 'rest_forbidden', esc_html__( 'Only authenticated users can access endpoint.', 'wp-migrate-db' ), [ 'status' => 401 ] );
		}

		return true;
	}

	public function registerRestRoute( $end_point, $args ) {
		if ( ! isset( $args['permissions_callback'] ) ) {
			$args['permission_callback'] = [ $this, 'permission_callback' ];
		}

		register_rest_route( $this->props->rest_api_base, $end_point, $args );
	}
}

