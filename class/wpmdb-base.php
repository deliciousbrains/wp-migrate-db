<?php
class WPMDB_Base {
	protected $settings;
	protected $plugin_file_path;
	protected $plugin_dir_path;
	protected $plugin_slug;
	protected $plugin_basename;
	protected $plugin_base;
	protected $template_dir;
	protected $plugin_title;
	protected $transient_timeout;
	protected $transient_retry_timeout;
	protected $multipart_boundary = 'bWH4JVmYCnf6GfXacrcc';
	protected $attempting_to_connect_to;
	protected $error;
	protected $temp_prefix = '_mig_';
	protected $invalid_content_verification_error = 'Invalid content verification signature, please verify the connection information on the remote site and try again.';
	protected $addons;

	function __construct( $plugin_file_path ) {
		$this->settings = get_option( 'wpmdb_settings' );

		$this->addons = array(
			'wp-migrate-db-media-files/wp-migrate-db-media-files.php' => array(
				'name'				=> 'Media Files',
				'required_version'	=> '1.0.1',
			)
		);

		$this->transient_timeout = 60 * 60 * 12;
		$this->transient_retry_timeout = 60 * 60 * 2;

		$this->plugin_file_path = $plugin_file_path;
		$this->plugin_dir_path = plugin_dir_path( $plugin_file_path );
		$this->plugin_slug = basename( $this->plugin_dir_path );
		$this->plugin_basename = plugin_basename( $plugin_file_path );
		$this->template_dir = $this->plugin_dir_path . 'template' . DS;
		$this->plugin_title = ucwords( str_ireplace( '-', ' ', $this->plugin_slug ) );
		$this->plugin_title = str_ireplace( array( 'db', 'wp' ), array( 'DB', 'WP' ), $this->plugin_title );

		if ( is_multisite() ) {
			$this->plugin_base = 'settings.php?page=wp-migrate-db';
		}
		else {
			$this->plugin_base = 'tools.php?page=wp-migrate-db';
		}

		// allow devs to change the temporary prefix applied to the tables
		$this->temp_prefix = apply_filters( 'wpmdb_temporary_prefix', $this->temp_prefix );
	}

	function printer( $debug ) {
		echo '<pre>' . print_r( $debug, true ) . '</pre>';
	}

	function template( $template ) {
		include $this->template_dir . $template . '.php';
	}

	function get_installed_version( $plugin = false ) {
		if ( !is_admin() ) return false;

		$plugin_basename = ( false !== $plugin ? $plugin : $this->plugin_basename );

		$plugins = get_plugins();

		if ( !isset( $plugins[$plugin_basename]['Version'] ) ) {
			return false;
		}

		return $plugins[$plugin_basename]['Version'];
	}

	function open_ssl_enabled() {
		if ( defined( 'OPENSSL_VERSION_TEXT' ) ) {
			return true;
		}
		else {
			return false;
		}
	}

	function set_time_limit() {
		if ( !function_exists( 'ini_get' ) || !ini_get( 'safe_mode' ) ) {
			set_time_limit( 0 );
		}
	}

	function remote_post( $url, $data, $scope, $args = array(), $expecting_serial = false ) {
		$this->set_time_limit();

		if( function_exists( 'fsockopen' ) && strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
			$url_parts = parse_url( $url );
			$host = $url_parts['host'];
			if( $pf = @fsockopen( $host, 443, $err, $err_string, 1 ) ) {
				// worked
				fclose( $pf );
			}
			else {
				// failed
				$url = substr_replace( $url, 'http', 0, 5 );
			}
		}

		$sslverify = ( $this->settings['verify_ssl'] == 1 ? true : false );

		$default_remote_post_timeout = apply_filters( 'wpmdb_default_remote_post_timeout', 60 * 20 );

		$args = wp_parse_args( $args, array(
			'timeout'  => $default_remote_post_timeout,
			'blocking'  => true,
			'sslverify'	=> $sslverify,
		) );

		$args['method'] = 'POST';
		if( ! isset( $args['body'] ) ) {
			$args['body'] = $this->array_to_multipart( $data );
		}
		$args['headers']['Content-Type'] = 'multipart/form-data; boundary=' . $this->multipart_boundary;
		$args['headers']['Referer'] = set_url_scheme( 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'] );

		$this->attempting_to_connect_to = $url;

		$response = wp_remote_post( $url, $args );

		if ( ! is_wp_error( $response ) ) {
			$response['body'] = trim( $response['body'], "\xef\xbb\xbf" );
		}

		if ( is_wp_error( $response ) ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			else if( isset( $response->errors['http_request_failed'][0] ) && strstr( $response->errors['http_request_failed'][0], 'timed out' ) ) {
				$this->error = 'The connection to the remote server has timed out, no changes have been committed. (#134 - scope: ' . $scope . ')';
			}
			else if ( isset( $response->errors['http_request_failed'][0] ) && ( strstr( $response->errors['http_request_failed'][0], 'Could not resolve host' ) || strstr( $response->errors['http_request_failed'][0], 'couldn\'t connect to host' ) ) ) {
				$this->error = 'We could not find: ' . $_POST['url'] . '. Are you sure this is the correct URL?';
				$url_bits = parse_url( $_POST['url'] );
				if( strstr( $_POST['url'], 'dev.' ) || strstr( $_POST['url'], '.dev' ) || ! strstr( $url_bits['host'], '.' ) ) {
					$this->error .= '<br />It appears that you might be trying to ' . $_POST['intent'] . ( $_POST['intent'] == 'pull' ? ' from' : ' to' ) . ' a local environment. This will not work if <u>this</u> website happens to be located on a remote server, it would be impossible for this server to contact your local environment.';
				}
			}
			else {
				$this->error = 'The connection failed, an unexpected error occurred, please contact support. (#121 - scope: ' . $scope . ')';
			}
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( (int) $response['response']['code'] < 200 || (int) $response['response']['code'] > 399 ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			else if( $response['response']['code'] == '401' ) {
				$this->error = 'The remote site is protected with Basic Authentication. Please enter the username and password above to continue. (401 Unauthorized)';
				$this->log_error( $this->error, $response );
				return false;
			}
			else {
				$this->error = 'Unable to connect to the remote server, please check the connection details - ' . $response['response']['code'] . ' ' . $response['response']['message'] . ' (#129 - scope: ' . $scope . ')';
				$this->log_error( $this->error, $response );
				return false;
			}
		}
		elseif ( $expecting_serial && is_serialized( $response['body'] ) == false ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			$this->error = 'There was a problem with the AJAX request, we were expecting a serialized response, instead we received:<br />' . htmlentities( $response['body'] );
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( $response['body'] === '0' ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			$this->error = 'WP Migrate DB does not seem to be installed or active on the remote site. (#131 - scope: ' . $scope . ')';
			$this->log_error( $this->error, $response );
			return false;
		}

		return $response['body'];
	}

	function retry_remote_post( $url, $data, $scope, $args = array(), $expecting_serial = false ) {
		$url = substr_replace( $url, 'http', 0, 5 );
		if( $response = $this->remote_post( $url, $data, $scope, $args, $expecting_serial ) ) {
			return $response;
		}
		return false;
	}

	function array_to_multipart( $data ) {
		if ( !$data || !is_array( $data ) ) {
			return $data;
		}

		$result = '';

		foreach ( $data as $key => $value ) {
			$result .= '--' . $this->multipart_boundary . "\r\n" .
				sprintf( 'Content-Disposition: form-data; name="%s"', $key );

			if ( 'chunk' == $key ) {
				if ( $data['chunk_gzipped'] ) {
					$result .= "; filename=\"chunk.txt.gz\"\r\nContent-Type: application/x-gzip";
				}
				else {
					$result .= "; filename=\"chunk.txt\"\r\nContent-Type: text/plain;";
				}
			}
			else {
				$result .= "\r\nContent-Type: text/plain; charset=" . get_option( 'blog_charset' );
			}

			$result .= "\r\n\r\n" . $value . "\r\n";
		}

		$result .= "--" . $this->multipart_boundary . "--\r\n";

		return $result;
	}

	function file_to_multipart( $file ) {
		$result = '';

		if( false == file_exists( $file ) ) return false;

		$filetype = wp_check_filetype( $file );
		$contents = file_get_contents( $file );

		$result .= '--' . $this->multipart_boundary . "\r\n" .
			sprintf( 'Content-Disposition: form-data; name="media[]"; filename="%s"', basename( $file ) );

		$result .= sprintf( "\r\nContent-Type: %s", $filetype['type'] );

		$result .= "\r\n\r\n" . $contents . "\r\n";

		$result .= "--" . $this->multipart_boundary . "--\r\n";

		return $result;
	}

	function log_error( $wpmdb_error, $additional_error_var = false ){
		$error_header = "********************************************\n******  Log date: " . date( 'Y/m/d H:i:s' ) . " ******\n********************************************\n\n";
		$error = $error_header . "WPMDB Error: " . $wpmdb_error . "\n\n";
		if( ! empty( $this->attempting_to_connect_to ) ) {
			$error .= "Attempted to connect to: " . $this->attempting_to_connect_to . "\n\n";
		}
		if( $additional_error_var !== false ){
			$error .= print_r( $additional_error_var, true ) . "\n\n";
		}
		$log = get_option( 'wpmdb_error_log' );
		if( $log ) {
			$log = $log . $error;
		}
		else {
			$log = $error;
		}
		update_option( 'wpmdb_error_log', $log );
	}

	function display_errors() {
		if ( ! empty( $this->error ) ) {
			echo $this->error;
			$this->error = '';
			return true;
		}
		return false;
	}

	function filter_post_elements( $post_array, $accepted_elements ) {
		$accepted_elements[] = 'sig';
		return array_intersect_key( $post_array, array_flip( $accepted_elements ) );
	}

	function create_signature( $data, $key ) {
		if ( isset( $data['sig'] ) ) {
			unset( $data['sig'] );
		}
		$flat_data = implode( '', $data );
		return base64_encode( hash_hmac( 'sha1', $flat_data, $key, true ) );
	}

	function verify_signature( $data, $key ) {
		if( empty( $data['sig'] ) ) {
			return false;
		}
		$temp = $data;
		$computed_signature = $this->create_signature( $temp, $key );
		return $computed_signature === $data['sig'];
	}

	function set_time_limit_available() {
		if ( ! function_exists( 'set_time_limit' ) || ! function_exists( 'ini_get' ) ) return false;
		$current_max_execution_time = ini_get( 'max_execution_time' );
		$proposed_max_execution_time = ( $current_max_execution_time == 30 ) ? 31 : 30;
		@set_time_limit( $proposed_max_execution_time );
		$current_max_execution_time = ini_get( 'max_execution_time' );
		return ( $proposed_max_execution_time == $current_max_execution_time );
	}

	function get_plugin_name( $plugin = false ) {
		if ( !is_admin() ) return false;

		$plugin_basename = ( false !== $plugin ? $plugin : $this->plugin_basename );

		$plugins = get_plugins();

		if ( !isset( $plugins[$plugin_basename]['Name'] ) ) {
			return false;
		}

		return $plugins[$plugin_basename]['Name'];
	}

	// Get only the table beginning with our DB prefix or temporary prefix, also skip views
	function get_tables( $scope = 'regular' ) {
		global $wpdb;
		$prefix = ( $scope == 'temp' ? $this->temp_prefix : $wpdb->prefix );
		$tables = $wpdb->get_results( 'SHOW FULL TABLES', ARRAY_N );
		foreach ( $tables as $table ) {
			if ( ( ( $scope == 'temp' || $scope == 'prefix' ) && 0 !== strpos( $table[0], $prefix ) ) || $table[1] == 'VIEW' ) {
				continue;
			}
			$clean_tables[] = $table[0];
		}
		return apply_filters( 'wpmdb_tables', $clean_tables, $scope );
	}

	function plugins_dir() {
		$path = untrailingslashit( $this->plugin_dir_path );
		return substr( $path, 0, strrpos( $path, DS ) ) . DS;
	}

	function is_addon_outdated( $addon_basename ) {
		$installed_version = $this->get_installed_version( $addon_basename );
		$required_version = $this->addons[$addon_basename]['required_version'];
		return version_compare( $installed_version, $required_version, '<' );
	}

	function get_plugin_file_path() {
		return $this->plugin_file_path;
	}

}
