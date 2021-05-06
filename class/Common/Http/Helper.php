<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;

class Helper
{

	/**
	 * @var Settings
	 */
	private $settings;
	/**
	 * @var Http
	 */
	private static $http;

	/**
	 * Helper constructor.
	 *
	 * @param Settings $settings
	 */
	public function __construct(
		Settings $settings,
		Http $http
	) {
		$this->settings = $settings->get_settings();

		self::$http = $http;
	}

	function filter_post_elements($post_array, $accepted_elements)
	{
		$accepted_elements[] = 'sig';

		return array_intersect_key($post_array, array_flip($accepted_elements));
	}

	function sanitize_signature_data($value)
	{
		if (is_bool($value)) {
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
	function create_signature($data, $key)
	{
		if (isset($data['sig'])) {
			unset($data['sig']);
		}
		$data = array_map(array($this, 'sanitize_signature_data'), $data);
		ksort($data);
		$flat_data = implode('', $data);

		return base64_encode(hash_hmac('sha1', $flat_data, $key, true));
	}

	function verify_signature($data, $key)
	{
		if (empty($data['sig'])) {
			return false;
		}

		if (isset($data['nonce'])) {
			unset($data['nonce']);
		}

		$temp               = $data;
		$computed_signature = $this->create_signature($temp, $key);

		return $computed_signature === $data['sig'];
	}

	function get_sensible_pull_limit()
	{
		return apply_filters('wpmdb_sensible_pull_limit', min(26214400, $this->settings['max_request']));
	}

	public function convert_json_body_to_post()
	{
		if (DynamicProperties::getInstance()->doing_cli_migration) {
			return $_POST;
		}

		$_POST = $_REQUEST = json_decode(file_get_contents('php://input'), true);

		$cap = (is_multisite()) ? 'manage_network_options' : 'export';
		$cap = apply_filters('wpmdb_ajax_cap', $cap);

		if (!current_user_can($cap)) {
			self::$http->end_ajax(
				new \WP_Error(
					'wpmdb-convert-json-post-error',
					__('Invalid Request. Did you pass the correct nonce?', 'wp-migrate-db')
				)
			);
		}

		return $_POST;
	}
}
