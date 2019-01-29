<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Http {

	/**
	 * @var Util
	 */
	public $util;
	/**
	 * @var Properties
	 */
	public $props;
	/**
	 * @var Filesystem
	 */
	public $filesystem;
	/**
	 * @var Scramble
	 */
	private $scrambler;
	/**
	 * @var DynamicProperties
	 */
	protected $dynamic_props;

	public function __construct(
		Util $util,
		Filesystem $filesystem,
		Scramble $scrambler,
		Properties $properties
	) {
		$this->props         = $properties;
		$this->util          = $util;
		$this->filesystem    = $filesystem;
		$this->dynamic_props = DynamicProperties::getInstance();
		$this->scrambler     = $scrambler;
	}

	/**
	 * @param mixed $return Value to be returned as response.
	 *
	 * @return null
	 */
	function end_ajax( $return = false ) {
		$return = apply_filters( 'wpmdb_before_response', $return );

		if ( defined( 'DOING_WPMDB_TESTS' ) || $this->dynamic_props->doing_cli_migration ) {
			// This function should signal the end of the PHP process, but for CLI it carries on so we need to reset our own usage
			// of the wpmdb_before_response filter before another respond_to_* function adds it again.
			remove_filter( 'wpmdb_before_response', array( $this->scrambler, 'scramble' ) );

			return ( false === $return ) ? null : $return;
		}

		echo ( false === $return ) ? '' : $return;
		exit;
	}

	function check_ajax_referer( $action ) {
		if ( defined( 'DOING_WPMDB_TESTS' ) || $this->dynamic_props->doing_cli_migration ) {
			return;
		}

		$result = Util::check_ajax_referer( $action, 'nonce', false );

		if ( false === $result ) {
			$return = array( 'wpmdb_error' => 1, 'body' => sprintf( __( 'Invalid nonce for: %s', 'wp-migrate-db' ), $action ) );
			$this->end_ajax( json_encode( $return ) );
		}

		$cap = ( is_multisite() ) ? 'manage_network_options' : 'export';
		$cap = apply_filters( 'wpmdb_ajax_cap', $cap );

		if ( ! current_user_can( $cap ) ) {
			$return = array( 'wpmdb_error' => 1, 'body' => sprintf( __( 'Access denied for: %s', 'wp-migrate-db' ), $action ) );
			$this->end_ajax( json_encode( $return ) );
		}
	}

	function array_to_multipart( $data ) {
		if ( ! $data || ! is_array( $data ) ) {
			return $data;
		}

		$result = '';

		foreach ( $data as $key => $value ) {
			$result .= '--' . $this->props->multipart_boundary . "\r\n" . sprintf( 'Content-Disposition: form-data; name="%s"', $key );

			if ( 'chunk' == $key ) {
				if ( $data['chunk_gzipped'] ) {
					$result .= "; filename=\"chunk.txt.gz\"\r\nContent-Type: application/x-gzip";
				} else {
					$result .= "; filename=\"chunk.txt\"\r\nContent-Type: text/plain;";
				}
			} else {
				$result .= "\r\nContent-Type: text/plain; charset=" . get_option( 'blog_charset' );
			}

			$result .= "\r\n\r\n" . $value . "\r\n";
		}

		$result .= '--' . $this->props->multipart_boundary . "--\r\n";

		return $result;
	}

	/**
	 * Convert file data, including contents, into a serialized array
	 *
	 * @param $file
	 *
	 * @return bool|string
	 */
	function file_to_serialized( $file ) {
		if ( false == file_exists( $file ) ) {
			return false;
		}

		$filetype = wp_check_filetype( $file );
		$contents = file_get_contents( $file );

		$file_details = [
			'name'      => basename( $file ),
			'file_type' => $filetype['type'],
			'contents'  => $contents,
		];

		return serialize( $file_details );
	}

	/**
	 * Check for download
	 * if found prepare file for download
	 *
	 * @return void
	 */
	function http_verify_download() {
		if ( ! empty( $_GET['download'] ) ) {
			$this->filesystem->download_file();
		}
	}
}
