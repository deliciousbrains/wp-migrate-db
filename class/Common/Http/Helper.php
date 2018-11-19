<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Settings\Settings;

class Helper {

	/**
	 * @var Settings
	 */
	private $settings;

	/**
	 * Helper constructor.
	 *
	 * @param Settings $settings
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings->get_settings();
	}

	function filter_post_elements( $post_array, $accepted_elements ) {
		$accepted_elements[] = 'sig';

		return array_intersect_key( $post_array, array_flip( $accepted_elements ) );
	}

	function sanitize_signature_data( $value ) {
		if ( is_bool( $value ) ) {
			$value = $value ? 'true' : 'false';
		}

		return $value;
	}

	/**
	 * Generate a signature string for the supplied data given a key.
	 *
	 * @param array  $data
	 * @param string $key
	 *
	 * @return string
	 */
	function create_signature( $data, $key ) {
		if ( isset( $data['sig'] ) ) {
			unset( $data['sig'] );
		}
		$data = array_map( array( $this, 'sanitize_signature_data' ), $data );
		ksort( $data );
		$flat_data = implode( '', $data );

		return base64_encode( hash_hmac( 'sha1', $flat_data, $key, true ) );
	}

	function verify_signature( $data, $key ) {
		if ( empty( $data['sig'] ) ) {
			return false;
		}

		if ( isset( $data['nonce'] ) ) {
			unset( $data['nonce'] );
		}

		$temp               = $data;
		$computed_signature = $this->create_signature( $temp, $key );

		return $computed_signature === $data['sig'];
	}

	function get_sensible_pull_limit() {
		return apply_filters( 'wpmdb_sensible_pull_limit', min( 26214400, $this->settings['max_request'] ) );
	}

}
