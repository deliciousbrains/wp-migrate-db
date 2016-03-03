<?php
class WPMDBPro_Base {
	protected $settings;
	protected $plugin_file_path;
	protected $plugin_dir_path;
	protected $plugin_slug;
	protected $plugin_basename;
	protected $plugin_base;
	protected $template_dir;
	protected $plugin_title;
	protected $dbrains_api_url;
	protected $transient_timeout;
	protected $transient_retry_timeout;
	protected $dbrains_api_base = 'https://deliciousbrains.com';
	protected $multipart_boundary = 'bWH4JVmYCnf6GfXacrcc';
	protected $attempting_to_connect_to;
	protected $error;
	protected $temp_prefix = '_mig_';
	protected $invalid_content_verification_error = 'Invalid content verification signature, please verify the connection information on the remote site and try again.';

	function __construct( $plugin_file_path ) {
		$this->settings = get_option( 'wpmdb_settings' );

		$this->transient_timeout = 60 * 60 * 12;
		$this->transient_retry_timeout = 60 * 60 * 2;

		$this->plugin_file_path = $plugin_file_path;
		$this->plugin_dir_path = plugin_dir_path( $plugin_file_path );
		$this->plugin_slug = basename( $this->plugin_dir_path );
		$this->plugin_basename = plugin_basename( $plugin_file_path );
		$this->template_dir = $this->plugin_dir_path . 'template' . DS;
		$this->plugin_title = ucwords( str_ireplace( '-', ' ', $this->plugin_slug ) );
		$this->plugin_title = str_ireplace( array( 'db', 'wp' ), array( 'DB', 'WP' ), $this->plugin_title );

		if ( defined( 'DBRAINS_API_BASE' ) ) {
			$this->dbrains_api_base = DBRAINS_API_BASE;
		}

		if( $this->open_ssl_enabled() == false ) {
			$this->dbrains_api_base = str_replace( 'https://', 'http://', $this->dbrains_api_base );
		}

		$this->dbrains_api_url = $this->dbrains_api_base . '/?wc-api=delicious-brains';

		if ( is_multisite() ) {
			$this->plugin_base = 'settings.php?page=wp-migrate-db-pro';
		}
		else {
			$this->plugin_base = 'tools.php?page=wp-migrate-db-pro';
		}

		// allow devs to change the temporary prefix applied to the tables
		$this->temp_prefix = apply_filters( 'wpmdb_temporary_prefix', $this->temp_prefix );

		// Seen when the user clicks "view details" on the plugin listing page
		add_action( 'install_plugins_pre_plugin-information', array( $this, 'plugin_update_popup' ) );

		// Add an extra row to the plugin screen
		add_action( 'after_plugin_row_' . $this->plugin_basename, array( $this, 'plugin_row' ), 11 );

		// Adds a custom error message to the plugin install page if required (licence expired / invalid)
		add_filter( 'http_response', array( $this, 'verify_download' ), 10, 3 );
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
			$this->error = 'WP Migrate DB Pro does not seem to be installed or active on the remote site. (#131 - scope: ' . $scope . ')';
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

	function get_dbrains_api_url( $request, $args = array() ) {
		$url = $this->dbrains_api_url;
		$args['request'] = $request;
		$url = add_query_arg( $args, $url );
		return $url;
	}

	function dbrains_api_request( $request, $args = array() ) {
		$sslverify = ( $this->settings['verify_ssl'] == 1 ? true : false );

		$url = $this->get_dbrains_api_url( $request, $args );
		$response = wp_remote_get( $url, array(
			'timeout'  => 30,
			'blocking'  => true,
			'sslverify' => $sslverify
		) );

		if ( is_wp_error( $response ) || (int) $response['response']['code'] < 200 || (int) $response['response']['code'] > 399 ) {
			$this->log_error( print_r( $response, true ) );
			return json_encode( array( 'errors' => array( 'connection_failed' => $url . 'Could not connect to deliciousbrains.com.' ) ) );
		}

		return $response['body'];
	}

	function plugin_update_popup() {
		if ( $this->plugin_slug != $_GET['plugin'] ) return;

		$filename = $this->plugin_slug;
		$latest_version = $this->get_latest_version( $this->plugin_slug );
		if ( $this->is_beta_version( $latest_version ) ) {
			$filename .= '-beta';
		}

		$url = $this->dbrains_api_base . '/content/themes/delicious-brains/update-popup/' . $filename . '.html';
		$data = wp_remote_get( $url, array( 'timeout' => 30 ) );

		if ( is_wp_error( $data ) || 200 != $data['response']['code'] ) {
			echo '<p>Could not retrieve version details. Please try again.</p>';
		}
		else {
			echo $data['body'];
		}

		exit;
	}

	/*
	* Shows a message below the plugin on the plugins page when:
	*	1. the license hasn't been activated
	*	2. when there's an update available but the license is expired
	* 
	* TODO: Implement "Check my license again" link
	*/
	function plugin_row() {
		$licence = $this->get_licence_key();
		$licence_response = $this->is_licence_expired();
		$licence_problem = isset( $licence_response['errors'] );

		$installed_version = $this->get_installed_version( $this->plugin_basename );
		$latest_version = $this->get_latest_version( $this->plugin_slug );

		$new_version = '';
		if ( version_compare( $installed_version, $latest_version, '<' ) ) {
			$new_version = __( 'There is a new version of ' . $this->plugin_title . ' available.', 'wp-migrate-db-pro' );
			$new_version .= ' <a class="thickbox" title="' . $this->plugin_title . '" href="plugin-install.php?tab=plugin-information&plugin=' . rawurlencode( $this->plugin_slug ) . '&TB_iframe=true&width=640&height=808">';
			$new_version .= sprintf( __( 'View version %s details', 'wp-migrate-db-pro' ), $latest_version ) . '</a>.';
		}

		if ( !$new_version && !empty( $licence ) ) {
			return;
		}

		if( empty( $licence ) ) {
			$settings_link = sprintf( '<a href="%s">%s</a>', network_admin_url( $this->plugin_base ) . '#settings', __( 'Settings', 'wp-migrate-db-pro' ) );
			if ( $new_version ) {
				$message = 'To update, ';
			}
			else {
				$message = 'To finish activating ' . $this->plugin_title . ', please ';
			}

			$message .= 'go to ' . $settings_link . ' and enter your licence key. 
				If you don\'t have a licence key, you may 
				<a href="http://deliciousbrains.com/wp-migrate-db-pro/pricing/">purchase one</a>.';
		}
		elseif ( $licence_problem ) {
			$message = array_shift( $licence_response['errors'] ) . ' <a href="#" class="check-my-licence-again">Check my license again</a>';
		}
		else {
			return;
		}
		?>

		<tr class="plugin-update-tr wpmdbpro-custom">
			<td colspan="3" class="plugin-update">
				<div class="update-message"><span class="wpmdb-new-version-notice"><?php echo $new_version; ?></span> <span class="wpmdb-licence-error-notice"><?php echo $message; ?></span></div>
			</td>
		</tr>

		<?php if ( $new_version ) : // removes the built-in plugin update message ?>
		<script type="text/javascript">
		(function($) {
			var wpmdb_row = jQuery('#<?php echo $this->plugin_slug; ?>'),
				next_row = wpmdb_row.next();

			// If there's a plugin update row - need to keep the original update row available so we can switch it out
			// if the user has a successful response from the 'check my license again' link
			if (next_row.hasClass('plugin-update-tr') && !next_row.hasClass('wpmdbpro-custom')) {
				var original = next_row.clone();
				original.add
				next_row.html(next_row.next().html()).addClass('wpmdbpro-custom-visible');
				next_row.next().remove();
				next_row.after(original);
				original.addClass('wpmdb-original-update-row');
			}
		})(jQuery);
		</script>
		<?php endif; ?>

		<?php
	}

	function verify_download( $response, $args, $url ) {
		$download_url = $this->get_plugin_update_download_url( $this->plugin_slug );

		if ( 0 === strpos( $url, $download_url ) || 402 != $response['response']['code'] ) {
			return $response;
		}

		// The $response['body'] is blank but output is actually saved to a file in this case
		$data = @file_get_contents( $response['filename'] );

		if ( !$data ) {
			return new WP_Error( 'wpmdbpro_download_error_empty', 'Error retrieving download from deliciousbrain.com. Please try again or download manually from <a href="https://deliciousbrains.com/my-account/">My Account</a>.' );
		}

		$decoded_data = json_decode( $data, true );

		// Can't decode the JSON errors, so just barf it all out
		if ( !isset( $decoded_data['errors'] ) || !$decoded_data['errors'] ) {
			return new WP_Error( 'wpmdbpro_download_error_raw', $data );
		}

		foreach ( $decoded_data['errors'] as $key => $msg ) {
			return new WP_Error( 'wpmdbpro_' . $key, $msg );
		}
	}

	function is_licence_constant() {
		return defined( 'WPMDB_LICENCE' );
	}

	function get_licence_key() {
		return $this->is_licence_constant() ? WPMDB_LICENCE : $this->settings['licence'];
	}

	function is_licence_expired( $skip_transient_check = false ) {
		$licence = $this->get_licence_key();
		if( empty( $licence ) ) {
			$settings_link = sprintf( '<a href="%s">%s</a>', network_admin_url( $this->plugin_base ) . '#settings', __( 'Settings', 'wp-migrate-db-pro' ) );
			$message = 'To finish activating WP Migrate DB Pro, please go to ' . $settings_link . ' and enter your licence key. 
				If you don\'t have a licence key, you may 
				<a href="http://deliciousbrains.com/wp-migrate-db-pro/pricing/">purchase one</a>.';
			return array( 'errors' => array( 'no_licence' => $message ) );
		}

		if( ! $skip_transient_check ) {
			$trans = get_site_transient( 'wpmdb_licence_response' );
			if ( false !== $trans ) return json_decode( $trans, true );
		}
		
		return json_decode( $this->check_licence( $licence ), true );
	}

	function check_licence( $licence_key ) {
		// testing only 1st line = valid licence 2nd line = not valid licence
		// return json_encode( array( 'ok' => 'ok' ) );
		// return json_encode( array( 'errors' => array( 'standard' => 'oh no! licence is not working.') ) );
		if( empty( $licence_key ) ) {
			return false;
		}
		$args = array(
			'licence_key' => $licence_key,
			'site_url' => site_url( '', 'http' ),
			);

		$response = $this->dbrains_api_request( 'check_support_access', $args );
		set_site_transient( 'wpmdb_licence_response', $response, $this->transient_timeout );
		return $response;
	}

	function is_beta_version( $ver ) {
		if ( preg_match( '@b[0-9]+$@', $ver ) ) {
			return true;
		}

		return false;
	}

	function get_latest_version( $slug ) {
		$data = $this->get_upgrade_data();

		// Return the latest beta version if the installed version is beta 
		// and the API returned a beta version and it's newer than the latest stable version
		$installed_version = $this->get_installed_version( sprintf( '%1$s/%1$s.php', $slug ) );

		if ( $installed_version && $this->is_beta_version( $installed_version )
			&& isset( $data[$slug]['beta_version'] )
			&& version_compare( $data[$slug]['version'], $data[$slug]['beta_version'], '<' )
		) {
			return $data[$slug]['beta_version'];
		}

		return $data[$slug]['version'];
	}

	function get_upgrade_data() {
		$info = get_site_transient( 'wpmdb_upgrade_data' );

		if( isset( $info['version'] ) ) {
			delete_site_transient( 'wpmdb_licence_response' );
			delete_site_transient( 'wpmdb_upgrade_data' );
			$info = false;
		}

		if ( $info ) return $info;

		$data = $this->dbrains_api_request( 'upgrade_data' );

		$data = json_decode( $data, true );

		/*
			We need to set the transient even when there's an error,
			otherwise we'll end up making API requests over and over again
			and slowing things down big time.
		*/
		$default_upgrade_data = array( 'wp-migrate-db-pro' => array( 'version' => $this->get_installed_version() ) );

		if ( !$data ) {
			set_site_transient( 'wpmdb_upgrade_data', $default_upgrade_data, $this->transient_retry_timeout );
			$this->log_error( 'Error trying to decode JSON upgrade data.' );
			return false;
		}

		if ( isset( $data['errors'] ) ) {
			set_site_transient( 'wpmdb_upgrade_data', $default_upgrade_data, $this->transient_retry_timeout );
			$this->log_error( 'Error trying to get upgrade data.', $data['errors'] );
			return false;
		}

		set_site_transient( 'wpmdb_upgrade_data', $data, $this->transient_timeout );

		return $data;
	}

	function get_plugin_update_download_url( $plugin_slug, $is_beta = false ) {
		$licence = $this->get_licence_key();
		$query_args = array( 
			'request'		=> 'download',
			'licence_key'	=> $licence,
			'slug'			=> $plugin_slug,
			'site_url' 		=> home_url( '', 'http')
		);

		if ( $is_beta ) {
			$query_args['beta'] = '1';
		}

		return add_query_arg( $query_args, $this->dbrains_api_url );
	}

	function diverse_array( $vector ) {
		$result = array();
		foreach( $vector as $key1 => $value1 )
			foreach( $value1 as $key2 => $value2 )
				$result[$key2][$key1] = $value2;
		return $result;
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

}