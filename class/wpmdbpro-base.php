<?php
class WPMDBPro_Base {
	protected $settings;
	protected $plugin_file_path;
	protected $plugin_dir_path;
	protected $plugin_slug;
	protected $plugin_folder_name;
	protected $plugin_basename;
	protected $plugin_base;
	protected $plugin_version;
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
	protected $invalid_content_verification_error;
	protected $addons;
	protected $doing_cli_migration = false;

	function __construct( $plugin_file_path ) {
		$this->settings = get_option( 'wpmdb_settings' );

		$this->addons = array(
			'wp-migrate-db-pro-media-files/wp-migrate-db-pro-media-files.php' => array(
				'name'				=> 'Media Files',
				'required_version'	=> '1.1.4',
			),
			'wp-migrate-db-pro-cli/wp-migrate-db-pro-cli.php' => array(
				'name'				=> 'CLI',
				'required_version'	=> '1.0',
			)
		);

		$this->invalid_content_verification_error = __( 'Invalid content verification signature, please verify the connection information on the remote site and try again.', 'wp-migrate-db-pro' );

		$this->transient_timeout = 60 * 60 * 12;
		$this->transient_retry_timeout = 60 * 60 * 2;

		$this->plugin_file_path = $plugin_file_path;
		$this->plugin_dir_path = plugin_dir_path( $plugin_file_path );
		$this->plugin_folder_name = basename( $this->plugin_dir_path );
		$this->plugin_basename = plugin_basename( $plugin_file_path );
		$this->template_dir = $this->plugin_dir_path . 'template' . DS;
		$this->plugin_title = ucwords( str_ireplace( '-', ' ', basename( $plugin_file_path ) ) );
		$this->plugin_title = str_ireplace( array( 'db', 'wp', '.php' ), array( 'DB', 'WP', '' ), $this->plugin_title );

		// We need to set $this->plugin_slug here because it was set here
		// in Media Files prior to version 1.1.2. If we remove it the customer
		// cannot upgrade, view release notes, etc
		$this->plugin_slug = basename( $plugin_file_path, '.php' );

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

		add_action( 'wpmdb_notices', array( $this, 'version_update_notice' ) );
	}

	function template( $template ) {
		include $this->template_dir . $template . '.php';
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
			@set_time_limit( 0 );
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
		$args['headers']['Referer'] = network_admin_url( 'admin-ajax.php' );

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
				$this->error = sprintf( __( 'The connection to the remote server has timed out, no changes have been committed. (#134 - scope: %s)', 'wp-migrate-db-pro' ), $scope );
			}
			else if ( isset( $response->errors['http_request_failed'][0] ) && ( strstr( $response->errors['http_request_failed'][0], 'Could not resolve host' ) || strstr( $response->errors['http_request_failed'][0], 'couldn\'t connect to host' ) ) ) {
				$this->error = sprintf( __( 'We could not find: %s. Are you sure this is the correct URL?', 'wp-migrate-db-pro' ), $_POST['url'] );
				$url_bits = parse_url( $_POST['url'] );
				if( strstr( $_POST['url'], 'dev.' ) || strstr( $_POST['url'], '.dev' ) || ! strstr( $url_bits['host'], '.' ) ) {
					$this->error .= '<br />';
					if( $_POST['intent'] == 'pull' ) {
						$this->error .= __( 'It appears that you might be trying to pull from a local environment. This will not work if <u>this</u> website happens to be located on a remote server, it would be impossible for this server to contact your local environment.', 'wp-migrate-db-pro' );
					}
					else {
						$this->error .= __( 'It appears that you might be trying to push to a local environment. This will not work if <u>this</u> website happens to be located on a remote server, it would be impossible for this server to contact your local environment.', 'wp-migrate-db-pro' );
					}
				}
			}
			else {
				$this->error = sprintf( __( 'The connection failed, an unexpected error occurred, please contact support. (#121 - scope: %s)', 'wp-migrate-db-pro' ), $scope );
			}
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( (int) $response['response']['code'] < 200 || (int) $response['response']['code'] > 399 ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			else if( $response['response']['code'] == '401' ) {
				$this->error = __( 'The remote site is protected with Basic Authentication. Please enter the username and password above to continue. (401 Unauthorized)', 'wp-migrate-db-pro' );
				$this->log_error( $this->error, $response );
				return false;
			}
			else {
				$this->error = sprintf( __( 'Unable to connect to the remote server, please check the connection details - %1$s %2$s (#129 - scope: %3$s)', 'wp-migrate-db-pro' ), $response['response']['code'], $response['response']['message'], $scope );
				$this->log_error( $this->error, $response );
				return false;
			}
		}
		elseif ( $expecting_serial && is_serialized( $response['body'] ) == false ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			$this->error = __( 'There was a problem with the AJAX request, we were expecting a serialized response, instead we received:<br />', 'wp-migrate-db-pro' ) . htmlentities( $response['body'] );
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( $response['body'] === '0' ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_verify_connection_to_remote_site' ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
			$this->error = sprintf( __( 'WP Migrate DB Pro does not seem to be installed or active on the remote site. (#131 - scope: %s)', 'wp-migrate-db-pro' ), $scope );
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( $expecting_serial && is_serialized( $response['body'] ) == true && $scope == 'ajax_verify_connection_to_remote_site' ) {
			$unserialized_response = unserialize( $response['body'] );
			if ( isset( $unserialized_response['error'] ) && '1' == $unserialized_response['error'] && strpos( $url, 'https://' ) === 0 ) {
				return $this->retry_remote_post( $url, $data, $scope, $args, $expecting_serial );
			}
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
		if ( isset( $post_array['form_data'] ) ) {
			$post_array['form_data'] = stripslashes( $post_array['form_data'] );
		}
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
		if ( isset( $data['nonce'] ) ) {
			unset( $data['nonce'] );
		}
		$temp = $data;
		$computed_signature = $this->create_signature( $temp, $key );
		return $computed_signature === $data['sig'];
	}

	function get_dbrains_api_url( $request, $args = array() ) {
		$url = $this->dbrains_api_url;
		$args['request'] = $request;
		$args['version'] = $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'];
		$url = add_query_arg( $args, $url );
		if ( false !== get_site_transient( 'wpmdb_temporarily_disable_ssl' ) && 0 === strpos( $this->dbrains_api_url, 'https://' ) ) {
			$url = substr_replace( $url, 'http', 0, 5 );
		}

		$url .= '&locale=' . urlencode( get_locale() );

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
			$disable_ssl_url = network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-disable-ssl' ) . '&wpmdb-disable-ssl=1' );
			$connection_failed_message = '<div class="updated warning inline-message">';
 			$connection_failed_message .= sprintf( __( '<strong>Could not connect to deliciousbrains.com</strong> &mdash; You will not receive update notifications or be able to activate your license until this is fixed. This issue is often caused by an improperly configured SSL server (https). We recommend <a href="%1$s" target="_blank">fixing the SSL configuration on your server</a>, but if you need a quick fix you can:<p><a href="%2$s" class="temporarily-disable-ssl button">Temporarily disable SSL for connections to deliciousbrains.com</a></p>', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/wp-migrate-db-pro/documentation/#could-no-connect', $disable_ssl_url );
 			$connection_failed_message .= '</div>';
			return json_encode( array( 'errors' => array( 'connection_failed' => $connection_failed_message ) ) );
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
			echo '<p>' . __( 'Could not retrieve version details. Please try again.', 'wp-migrate-db-pro' ) . '</p>';
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

		if ( !isset( $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'] ) ) {
			$installed_version = '0';
		}
		else {
		$installed_version = $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'];
		}

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
				$message = sprintf( __( 'To update, go to %1$s and enter your license key. If you don\'t have a license key, you may <a href="%2$s">purchase one</a>.', 'wp-migrate-db-pro' ), $settings_link, 'http://deliciousbrains.com/wp-migrate-db-pro/pricing/' );
			}
			else {
				$message = sprintf( __( 'To finish activating %1$s, please go to %2$s and enter your license key. If you don\'t have a license key, you may <a href="%3$s">purchase one</a>.', 'wp-migrate-db-pro' ), $this->plugin_title, $settings_link, 'http://deliciousbrains.com/wp-migrate-db-pro/pricing/' );
			}
		}
		elseif ( $licence_problem ) {
			$message = array_shift( $licence_response['errors'] ) . sprintf( ' <a href="#" class="check-my-licence-again">%s</a>', __( 'Check my license again', 'wp-migrate-db-pro' ) );
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
			return new WP_Error( 'wpmdbpro_download_error_empty', sprintf( __( 'Error retrieving download from deliciousbrain.com. Please try again or download manually from <a href="%1$s">%2$s</a>.', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/my-account/', __( 'My Account', 'wp-migrate-db-pro' ) ) );
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

	function is_valid_licence( $skip_transient_check = false ) {
		$response = $this->is_licence_expired( $skip_transient_check );
		return ( isset( $response['errors'] ) ) ? false : true;
	}

	function is_licence_expired( $skip_transient_check = false ) {
		$licence = $this->get_licence_key();
		if( empty( $licence ) ) {
			$settings_link = sprintf( '<a href="%s">%s</a>', network_admin_url( $this->plugin_base ) . '#settings', __( 'Settings', 'wp-migrate-db-pro' ) );
			$message = sprintf( __( 'To finish activating WP Migrate DB Pro, please go to %1$s and enter your license key. If you don\'t have a license key, you may <a href="%2$s">purchase one</a>.', 'wp-migrate-db-pro' ), $settings_link, 'http://deliciousbrains.com/wp-migrate-db-pro/pricing/' );
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
			'site_url' => home_url( '', 'http' ),
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

	function get_required_version( $slug ) {
		$plugin_file = sprintf( '%1$s/%1$s.php', $slug );

		if ( isset( $this->addons[$plugin_file]['required_version'] ) ) {
			return $this->addons[$plugin_file]['required_version'];
		}
		else {
			return 0;
		}
	}

	function get_latest_version( $slug ) {
		$data = $this->get_upgrade_data();
		if ( !isset( $data[$slug] ) ) return false;

		// If pre-1.1.2 version of Media Files addon
		if ( !isset( $GLOBALS['wpmdb_meta'][$slug]['version'] ) ) {
			$installed_version = false;
		}
		else {
			$installed_version = $GLOBALS['wpmdb_meta'][$slug]['version'];
		}

		$required_version = $this->get_required_version( $slug );

		// Return the latest beta version if the installed version is beta
		// and the API returned a beta version and it's newer than the latest stable version
		if ( $installed_version
			&& ( $this->is_beta_version( $installed_version ) || $this->is_beta_version( $required_version ) )
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
		$default_upgrade_data = array( 'wp-migrate-db-pro' => array( 'version' => $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'] ) );

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
			'site_url'		=> home_url( '', 'http' ),
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

	function get_class_props() {
		return get_object_vars( $this );
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

	function version_update_notice() {
		// We don't want to show both the "Update Required" and "Update Available" messages at the same time
		if( isset( $this->addons[$this->plugin_basename] ) && true == $this->is_addon_outdated( $this->plugin_basename ) ) return;
		// To reduce UI clutter we hide addon update notices if the core plugin has updates available
		if( isset( $this->addons[$this->plugin_basename] ) ) {
			$core_slug = 'wp-migrate-db-pro';
			$core_installed_version = $GLOBALS['wpmdb_meta'][$core_slug]['version'];
			$core_latest_version = $this->get_latest_version( $core_slug );
			// Core update is available, don't show update notices for addons until core is updated
			if ( version_compare( $core_installed_version, $core_latest_version, '<' ) ) return;
		}

		$update_url = wp_nonce_url( network_admin_url( 'update.php?action=upgrade-plugin&plugin=' . urlencode( $this->plugin_basename ) ), 'upgrade-plugin_' . $this->plugin_basename );

		// If pre-1.1.2 version of Media Files addon, don't bother getting the versions
		if ( !isset( $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'] ) ) {
			?>
			<div style="display: block;" class="updated warning inline-message">
				<strong>Update Available</strong> &mdash; 
				A new version of <?php echo $this->plugin_title; ?> is now available. <a href="<?php echo $update_url; ?>">Update Now</a>
			</div>
			<?php
		}
		else {
		$installed_version = $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'];
		$latest_version = $this->get_latest_version( $this->plugin_slug );

		if ( version_compare( $installed_version, $latest_version, '<' ) ) { ?>
			<div style="display: block;" class="updated warning inline-message">
					<strong><?php _e( 'Update Available', 'wp-migrate-db-pro' ); ?></strong> &mdash;
					<?php printf( __( '%1$s %2$s is now available. You currently have %3$s installed. <a href="%4$s">%5$s</a>', 'wp-migrate-db-pro' ), $this->plugin_title, $latest_version, $installed_version, $update_url, __( 'Update Now', 'wp-migrate-db-pro' ) ); ?>
			</div>
			<?php
		}
	}
	}

	function plugins_dir() {
		$path = untrailingslashit( $this->plugin_dir_path );
		return substr( $path, 0, strrpos( $path, DS ) ) . DS;
	}

	function is_addon_outdated( $addon_basename ) {
		$addon_slug = current( explode( '/', $addon_basename ) );
		// If pre-1.1.2 version of Media Files addon, then it is outdated
		if ( ! isset( $GLOBALS['wpmdb_meta'][$addon_slug]['version'] ) ) return true;
		$installed_version = $GLOBALS['wpmdb_meta'][$addon_slug]['version'];
		$required_version = $this->addons[$addon_basename]['required_version'];
		return version_compare( $installed_version, $required_version, '<' );
	}

	function get_plugin_file_path() {
		return $this->plugin_file_path;
	}

	function get_licence_status_message() {
		$licence = $this->get_licence_key();
		if( empty( $licence ) ) {
			$message = sprintf( __( '<strong>Activate Your License</strong> &mdash; Please <a href="#" class="%s">enter your license key</a> to enable push and pull.', 'wp-migrate-db-pro' ), 'js-action-link enter-licence' );
			return $message;
		}

		$trans = get_site_transient( 'wpmdb_licence_response' );
		if ( false === $trans ) {
			$trans = $this->check_licence( $licence );
		}
		$trans = json_decode( $trans, true );
		$errors = $trans['errors'];

		$check_licence_again_url = network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-check-licence' ) . '&wpmdb-check-licence=1' );
		if ( isset( $errors['connection_failed'] ) ) {
			$disable_ssl_url = network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-disable-ssl' ) . '&wpmdb-disable-ssl=1' );
 			$message = sprintf( __( '<strong>Could not connect to deliciousbrains.com</strong> &mdash; You will not receive update notifications or be able to activate your license until this is fixed. This issue is often caused by an improperly configured SSL server (https). We recommend <a href="%s" target="_blank">fixing the SSL configuration on your server</a>, but if you need a quick fix you can:', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/wp-migrate-db-pro/documentation/#could-no-connect' );
			$message .= sprintf( '<p><a href="%1$s" class="temporarily-disable-ssl button">%2$s</a></p>', $disable_ssl_url, __(  'Temporarily disable SSL for connections to deliciousbrains.com', 'wp-migrate-db-pro' ) );
		} elseif ( isset( $errors['subscription_cancelled'] ) ) {
			$message = sprintf( __( '<strong>Your License Was Cancelled</strong> &mdash; Please visit <a href="%s" target="_blank">My Account</a> to renew or upgrade your license and enable push and pull.', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/my-account/' );
			$message .= sprintf( '<br /><a href="%s">%s</a>', $check_licence_again_url, __( 'Check my license again', 'wp-migrate-db-pro' ) );
		} elseif ( isset( $errors['subscription_expired'] ) ) {
			$message = sprintf( __( '<strong>Your License Has Expired</strong> &mdash; Please visit <a href="%s" target="_blank">My Account</a> to purchase a new license and enable push and pull.', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/my-account/' );
			$message .= sprintf( '<br /><a href="%s">%s</a>', $check_licence_again_url, __( 'Check my license again', 'wp-migrate-db-pro' ) );
		} elseif ( isset( $errors['no_activations_left'] ) ) {
			$message = sprintf( __( '<strong>No Activations Left</strong> &mdash; Please visit <a href="%s" target="_blank">My Account</a> to upgrade your license or deactivate a previous activation and enable push and pull.', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/my-account/' );
			$message .= sprintf( ' <a href="%s">%s</a>', $check_licence_again_url, __( 'Check my license again', 'wp-migrate-db-pro' ) );
		} elseif ( isset( $errors['licence_not_found'] ) ) {
			$message = sprintf( __( '<strong>Your License Was Not Found</strong> &mdash; Perhaps you made a typo when defining your WPMDB_LICENCE constant in your wp-config.php? Please visit <a href="%s" target="_blank">My Account</a> to double check your license key.', 'wp-migrate-db-pro' ), 'https://deliciousbrains.com/my-account/' );
			$message .= sprintf( ' <a href="%s">%s</a>', $check_licence_again_url, __( 'Check my license again', 'wp-migrate-db-pro' ) );
		} else {
			$error = reset( $errors );
			$message = sprintf( __( '<strong>An Unexpected Error Occurred</strong> &mdash; Please contact us at <a href="%1$s">%2$s</a> and quote the following:', 'wp-migrate-db-pro' ), 'mailto:nom@deliciousbrains.com', 'nom@deliciousbrains.com' );
			$message .= sprintf( '<p>%s</p>', $error );
		}

		return $message;
	}

	function set_cli_migration() {
		$this->doing_cli_migration = true;
	}

	function end_ajax( $return = false ) {
		if( defined( 'DOING_WPMDB_TESTS' ) || $this->doing_cli_migration ) {
			return ( false === $return ) ? NULL : $return;
		}

		echo ( false === $return ) ? '' : $return;
		exit;
	}

	function check_ajax_referer( $action ) {
		if ( defined( 'DOING_WPMDB_TESTS' ) || $this->doing_cli_migration ) return;
		$result = check_ajax_referer( $action, 'nonce', false );
		if ( false === $result ) {
			$return = array( 'wpmdb_error' => 1, 'body' => sprintf( __( 'Invalid nonce for: %s', 'wp-migrate-db-pro' ), $action ) );
			$this->end_ajax( json_encode( $return ) );
		}

		$cap = ( is_multisite() ) ? 'manage_network_options' : 'export';
		$cap = apply_filters( 'wpmdb_ajax_cap', $cap );
		if ( !current_user_can( $cap ) ) {
			$return = array( 'wpmdb_error' => 1, 'body' => sprintf( __( 'Access denied for: %s', 'wp-migrate-db-pro' ), $action ) );
			$this->end_ajax( json_encode( $return ) );
		}
	}

}
