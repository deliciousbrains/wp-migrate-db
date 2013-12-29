<?php
class WP_Migrate_DB_Pro {
	private $fp;
	private $settings;
	private $absolute_root_file_path;
	private $form_defaults;
	private $accepted_fields;
	private $plugin_base;
	private $default_profile;
	private $maximum_chunk_size;
	private $current_chunk = '';
	private $connection_details;
	private $remote_url;
	private $remote_key;
	private $form_data;
	private $template_dir;
	private $max_insert_string_len;
	private $plugin_file_path;
	private $plugin_dir_path;
	private $plugin_slug;
	private $plugin_basename;
	private $temp_prefix = '_mig_';
	private $row_tracker;
	private $rows_per_segment = 100;
	private $error;
	private $invalid_content_verification_error = 'Invalid content verification signature, please verify the connection information on the remote site and try again.';
	private $dbrains_api_url;
	private $dbrains_api_base = 'https://deliciousbrains.com';
	private $transient_timeout;
	private $transient_retry_timeout;
	private $multipart_boundary = 'bWH4JVmYCnf6GfXacrcc';
	private $attempting_to_connect_to;
	private $create_alter_table_query;
	private $alter_table_name;
	private $session_salt;
	private $primary_keys;

	function __construct( $plugin_file_path ) {
		$this->plugin_file_path = $plugin_file_path;
		$this->plugin_dir_path = plugin_dir_path( $plugin_file_path );
		$this->plugin_slug = basename( $this->plugin_dir_path );
		$this->plugin_basename = plugin_basename( $plugin_file_path );

		$this->replaced['serialized']['count'] = 0;
		$this->replaced['serialized']['strings'] = '';
		$this->replaced['nonserialized']['count'] = 0;

		if ( defined( 'DBRAINS_API_BASE' ) ) {
			$this->dbrains_api_base = DBRAINS_API_BASE;
		}

		if( $this->open_ssl_enabled() == false ) {
			$this->dbrains_api_base = str_replace( 'https://', 'http://', $this->dbrains_api_base );
		}

		$this->transient_timeout = 60 * 60 * 12;
		$this->transient_retry_timeout = 60 * 60 * 2;

		$this->dbrains_api_url = $this->dbrains_api_base . '/?wc-api=delicious-brains';

		$this->settings = get_option( 'wpmdb_settings' );

		$this->max_insert_string_len = 50000; // 50000 is the default as defined by phphmyadmin

		$default_settings = array(
			'key'  => $this->generate_key(),
			'allow_pull' => false,
			'allow_push' => false,
			'profiles'  => array(),
			'licence'  => '',
			'licence_email' => '',
			'verify_ssl'	=> false,
		);

		if( empty( $this->settings['max_request'] ) ) {
			$this->settings['max_request'] = min( 1024 * 1024, $this->get_bottleneck( 'max' ) );
			update_option( 'wpmdb_settings', $this->settings );
		}

		// if no settings exist then this is a fresh install, set up some default settings
		if ( empty( $this->settings ) ) {
			$this->settings = $default_settings;
			update_option( 'wpmdb_settings', $this->settings );
		}
		// When we add a new setting, an existing customer's db won't have this
		// new setting, so we need to add it. Otherwise, they'll see
		// array index errors in debug mode
		else {
			$update_settings = false;
			
			foreach ( $default_settings as $key => $value ) {
				if ( !isset( $this->settings[$key] ) ) {
					$this->settings[$key] = $value;
					$update_settings = true;
				}
			}
			
			if ( $update_settings ) {
				update_option( 'wpmdb_settings', $this->settings );
			}
		}

		add_filter( 'plugin_action_links_' . $this->plugin_basename, array( $this, 'plugin_action_links' ) );
		add_filter( 'network_admin_plugin_action_links_' . $this->plugin_basename, array( $this, 'plugin_action_links' ) );

		if ( is_multisite() ) {
			add_action( 'network_admin_menu', array( $this, 'network_admin_menu' ) );
			$this->plugin_base = 'settings.php?page=wp-migrate-db-pro';
		}
		else {
			add_action( 'admin_menu', array( $this, 'admin_menu' ) );
			$this->plugin_base = 'tools.php?page=wp-migrate-db-pro';
		}

		// internal AJAX handlers
		add_action( 'wp_ajax_wpmdb_prepare_remote_connection', array( $this, 'ajax_prepare_remote_connection' ) );
		add_action( 'wp_ajax_wpmdb_reset_api_key', array( $this, 'ajax_reset_api_key' ) );
		add_action( 'wp_ajax_wpmdb_delete_migration_profile', array( $this, 'ajax_delete_migration_profile' ) );
		add_action( 'wp_ajax_wpmdb_save_setting', array( $this, 'ajax_save_setting' ) );
		add_action( 'wp_ajax_wpmdb_save_profile', array( $this, 'ajax_save_profile' ) );
		add_action( 'wp_ajax_wpmdb_initiate_migration', array( $this, 'ajax_initiate_migration' ) );
		add_action( 'wp_ajax_wpmdb_prepare_table_migration', array( $this, 'ajax_prepare_table_migration' ) );
		add_action( 'wp_ajax_wpmdb_finalize_backup', array( $this, 'ajax_finalize_backup' ) );
		add_action( 'wp_ajax_wpmdb_clear_log', array( $this, 'ajax_clear_log' ) );
		add_action( 'wp_ajax_wpmdb_get_log', array( $this, 'ajax_get_log' ) );
		add_action( 'wp_ajax_wpmdb_activate_licence', array( $this, 'ajax_activate_licence' ) );
		add_action( 'wp_ajax_wpmdb_check_licence', array( $this, 'ajax_check_licence' ) );
		add_action( 'wp_ajax_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );
		add_action( 'wp_ajax_wpmdb_update_max_request_size', array( $this, 'ajax_update_max_request_size' ) );

		// external AJAX handlers
		add_action( 'wp_ajax_nopriv_wpmdb_establish_remote_connection', array( $this, 'ajax_establish_remote_connection' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_respond_initiate_migration', array( $this, 'ajax_respond_initiate_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_chunk', array( $this, 'ajax_process_chunk' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_prepare_table_migration', array( $this, 'ajax_prepare_table_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_finalize_backup', array( $this, 'ajax_finalize_backup' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_pull_request', array( $this, 'ajax_process_pull_request' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );

		// Take over the update check
		add_filter( 'site_transient_update_plugins', array( $this, 'site_transient_update_plugins' ) );

		// Add an extra row to the plugin screen
		add_action( 'after_plugin_row_' . $this->plugin_basename, array( $this, 'plugin_row' ), 11 );

		// Seen when the user clicks "view details" on the plugin listing page
		add_action( 'install_plugins_pre_plugin-information', array( $this, 'plugin_update_popup' ) );

		// Adds a custom error message to the plugin install page if required (licence expired / invalid)
		add_filter( 'http_response', array( $this, 'verify_download' ), 10, 3 );

		// Add some custom JS into the WP admin pages
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_plugin_update_script' ) );

		// Add some custom CSS into the WP admin pages
		add_action( 'admin_head-plugins.php', array( $this, 'add_plugin_update_styles' ) );

		$this->template_dir = $this->plugin_dir_path . 'template' . DS;

		$absolute_path = rtrim( ABSPATH, '\\/' );
		$site_url = rtrim( site_url( '', 'http' ), '\\/' );
		$home_url = rtrim( home_url( '', 'http' ), '\\/' );
		if ( $site_url != $home_url ) {
			$difference = str_replace( $home_url, '', $site_url );
			if( strpos( $absolute_path, $difference ) !== false ) {
				$absolute_path = rtrim( substr( $absolute_path, 0, -strlen( $difference ) ), '\\/' );
			}
		}
		$this->absolute_root_file_path = $absolute_path;

		$this->accepted_fields = array(
			'action',
			'save_computer',
			'gzip_file',
			'connection_info',
			'replace_old',
			'replace_new',
			'table_migrate_option',
			'select_tables',
			'replace_guids',
			'exclude_spam',
			'exclude_revisions',
			'save_migration_profile',
			'save_migration_profile_option',
			'create_new_profile',
			'create_backup',
			'remove_backup',
			'keep_active_plugins',
		);

		$this->default_profile = array(
			'action'  => 'savefile',
			'save_computer' => '1',
			'gzip_file'  => '1',
			'table_migrate_option' => 'migrate_only_with_prefix',
			'replace_guids' => '1',
			'default_profile'  => true,
			'name'   => '',
			'select_tables' => array(),
		);

		// this is how many DB rows are processed at a time, allow devs to change this value
		$this->rows_per_segment = apply_filters( 'wpmdb_rows_per_segment', $this->rows_per_segment );

		// allow devs to change the temporary prefix applied to the tables
		$this->temp_prefix = apply_filters( 'wpmdb_temporary_prefix', $this->temp_prefix );

		// testing only - if uncommented, will always check for plugin updates
		//delete_site_transient( 'update_plugins' );
		//delete_site_transient( 'wpmdb_upgrade_data' );
		//delete_site_transient( 'wpmdb_licence_response' );
	}

	function get_alter_table_name() {
		if ( ! is_null( $this->alter_table_name ) ) {
			return $this->alter_table_name;
		}
		global $wpdb;
		$this->alter_table_name = apply_filters( 'wpmdb_alter_table_name', $wpdb->prefix . 'wpmdb_alter_statements' );
		return $this->alter_table_name;
	}

	function get_create_alter_table_query() {
		if ( ! is_null( $this->create_alter_table_query ) ) {
			return $this->create_alter_table_query;
		}
		$alter_table_name = $this->get_alter_table_name();
		$this->create_alter_table_query = sprintf( "DROP TABLE IF EXISTS `%s`;\n", $alter_table_name );
		$this->create_alter_table_query .= sprintf( "CREATE TABLE `%s` ( `query` longtext NOT NULL );\n", $alter_table_name );
		$this->create_alter_table_query = apply_filters( 'wpmdb_create_alter_table_query', $this->create_alter_table_query );
		return $this->create_alter_table_query;
	}

	function get_short_uploads_dir() {
		$short_path = str_replace( $this->absolute_root_file_path, '', $this->get_upload_info( 'path' ) );
		return trailingslashit( substr( str_replace( '\\', '/', $short_path ), 1 ) );
	}

	function get_upload_info( $type = 'path' ) {
		// Let developers define their own path to for export files
		// Note: We require a very specific data set here, it should be similiar to the following
		// array(
		//			'path' 	=> '/path/to/custom/uploads/directory', <- note missing end trailing slash
		//			'url'	=> 'http://yourwebsite.com/custom/uploads/directory' <- note missing end trailing slash
		// );
		$upload_info = apply_filters( 'wpmdb_upload_info', array() );
		if ( !empty( $upload_info ) ) {
			return $upload_info[$type];
		}

		$upload_dir = wp_upload_dir();

		$upload_info['path'] = $upload_dir['basedir'];
		$upload_info['url'] = $upload_dir['baseurl'];

		$upload_dir_name = apply_filters( 'wpmdb_upload_dir_name', 'wp-migrate-db' );

		if( ! file_exists( $upload_dir['basedir'] . DS . $upload_dir_name ) ) {
			$url = wp_nonce_url( $this->plugin_base, 'wp-migrate-db-pro-nonce' );

			if( false === mkdir( $upload_dir['basedir'] . DS . $upload_dir_name, 0755 ) ) {
				return $upload_info[$type];
			}

			$filename = $upload_dir['basedir'] . DS . $upload_dir_name . DS . 'index.php';
			if( false === file_put_contents( $filename, "<?php\r\n// Silence is golden\r\n?>" ) ) {
				return $upload_info[$type];
			}
		}

		$upload_info['path'] .= DS . $upload_dir_name;
		$upload_info['url'] .= '/' . $upload_dir_name;

		return $upload_info[$type];
	}

	function ajax_update_max_request_size() {
		$this->settings['max_request'] = (int) $_POST['max_request_size'] * 1024;
		update_option( 'wpmdb_settings', $this->settings );
		exit;
	}

	function filter_post_elements( $post_array, $accepted_elements ) {
		$accepted_elements[] = 'sig';
		return array_intersect_key( $post_array, array_flip( $accepted_elements ) );
	}

	function verify_download( $response, $args, $url ) {
		$download_url = $this->get_plugin_update_download_url();

		if ( $url != $download_url || 402 != $response['response']['code'] ) {
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

	function ajax_check_licence() {
		$licence = ( empty( $_POST['licence'] ) ? $this->get_licence_key() : $_POST['licence'] );
		$response = $this->check_licence( $licence );
		echo $response;
		exit;
	}

	function ajax_activate_licence() {
		$args = array(
			'licence_key' => $_POST['licence_key'],
			'site_url' => site_url( '', 'http' )
		);

		if( $this->is_licence_constant() ) {
			$args['licence_key'] = $this->get_licence_key();
		}

		$response = $this->dbrains_api_request( 'activate_licence', $args );

		echo $response;

		$response = json_decode( $response, true );

		if ( $response && !isset( $response['errors'] ) ) {
			if ( !$this->is_licence_constant() ) {
				$this->settings['licence'] = $_POST['licence_key'];
			}
			$this->settings['licence_email'] = $response['email'];
			update_option( 'wpmdb_settings', $this->settings );
		}

		exit;
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
			return json_encode( array( 'errors' => array( 'connection_failed' => $url . 'Could not connect to deliciousbrains.com.' ) ) );
		}

		return $response['body'];
	}

	function display_errors() {
		if ( ! empty( $this->error ) ) {
			echo $this->error;
			$this->error = '';
			return true;
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

	function is_json( $string, $strict = false ) {
		$json = @json_decode( $string, true );
		if( $strict == true && ! is_array( $json ) ) return false;
		return ! ( $json == NULL || $json == false );
	}

	function remote_post( $url, $data, $scope, $args = array(), $expecting_serial = false ) {
		$this->set_time_limit();

		if( function_exists( 'fsockopen' ) && strpos( $url, 'https://' ) === 0 && $scope == 'ajax_prepare_remote_connection' ) {
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
		$args['body'] = $this->array_to_multipart( $data );
		$args['headers']['Content-Type'] = 'multipart/form-data; boundary=' . $this->multipart_boundary;
		$args['headers']['Referer'] = set_url_scheme( 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'] );

		$this->attempting_to_connect_to = $url;

		$response = wp_remote_post( $url, $args );

		if ( ! is_wp_error( $response ) ) {
			$response['body'] = trim( $response['body'], "\xef\xbb\xbf" );
		}

		if ( is_wp_error( $response ) ) {
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_prepare_remote_connection' ) {
				$url = substr_replace( $url, 'http', 0, 5 );
				// needs testing
				if( $response = $this->remote_post( $url, $data, $scope, $args, $expecting_serial ) ) {
					return $response;
				}
				else {
					return false;
				}
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
			if( strpos( $url, 'https://' ) === 0 && $scope == 'ajax_prepare_remote_connection' ) {
				$url = substr_replace( $url, 'http', 0, 5 );
				// needs testing
				if( $response = $this->remote_post( $url, $data, $scope, $args, $expecting_serial ) ) {
					return $response;
				}
				else {
					return false;
				}
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
			$this->error = 'There was a problem with the AJAX request, we were expecting a serialized response, instead we received:<br />' . htmlentities( $response['body'] );
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( $response['body'] === '0' ) {
			$this->error = 'WP Migrate DB Pro does not seem to be installed or active on the remote site. (#131 - scope: ' . $scope . ')';
			$this->log_error( $this->error, $response );
			return false;
		}

		return $response['body'];
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

	function get_sql_dump_info( $migration_type, $info_type ) {
		if( empty( $this->session_salt ) ) {
			$this->session_salt = strtolower( wp_generate_password( 5, false, false ) );
		}
		$datetime = date('YmdHis');
		$ds = ( $info_type == 'path' ? DS : '/' );
		return sprintf( '%s%s%s-%s-%s-%s.sql', $this->get_upload_info( $info_type ), $ds, sanitize_title_with_dashes( DB_NAME ), $migration_type, $datetime, $this->session_salt );
	}

	function parse_migration_form_data( $data ) {
		parse_str( $data, $form_data );
		$form_data = array_intersect_key( $form_data, array_flip( $this->accepted_fields ) );
		unset( $form_data['replace_old'][0] );
		unset( $form_data['replace_new'][0] );
		return $form_data;
	}

	function plugin_action_links( $links ) {
		$link = sprintf( '<a href="%s">%s</a>', network_admin_url( $this->plugin_base ), __( 'Settings', 'wp-migrate-db-pro' ) );
		array_unshift( $links, $link );
		return $links;
	}

	function ajax_clear_log() {
		delete_option( 'wpmdb_error_log' );
		exit;
	}

	function ajax_get_log() {
		$this->output_diagnostic_info();
		$this->output_log_file();
		exit;
	}

	function output_log_file() {
		$log = get_option( 'wpmdb_error_log' );
		if( $log ) {
			echo $log;
		}
	}

	function open_ssl_enabled() {
		if ( defined( 'OPENSSL_VERSION_TEXT' ) ) {
			return true;
		} 
		else {
			return false;
		}
	}

	function output_diagnostic_info() {
		global $table_prefix;
		
		_e( 'site_url()', 'wp-app-store' ); echo ': ';
		echo site_url();
		echo "\r\n";

		_e( 'home_url()', 'wp-app-store' ); echo ': ';
		echo home_url();
		echo "\r\n";

		_e( 'Table Prefix', 'wp-app-store' ); echo ': ';
		echo $table_prefix;
		echo "\r\n";

		_e( 'WordPress', 'wp-app-store' ); echo ': ';
		if ( is_multisite() ) echo 'WPMU'; else echo 'WP'; echo bloginfo('version');
		echo "\r\n";

		_e( 'Web Server', 'wp-app-store' ); echo ': ';
		echo $_SERVER['SERVER_SOFTWARE'];
		echo "\r\n";

		_e( 'PHP', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'phpversion' ) ) echo esc_html( phpversion() );
		echo "\r\n";

		_e( 'MySQL', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'mysql_get_server_info' ) ) echo esc_html( mysql_get_server_info() );
		echo "\r\n";
		
		_e( 'WP Memory Limit', 'wp-app-store' ); echo ': ';
		echo WP_MEMORY_LIMIT;
		echo "\r\n";

		_e( 'WPMDB Bottleneck', 'wp-app-store' ); echo ': ';
		echo size_format( $this->get_bottleneck() );
		echo "\r\n";
		
		if ( function_exists( 'ini_get' ) && $suhosin_limit = ini_get( 'suhosin.post.max_value_length' ) ) {
			_e( 'Suhosin Post Max Value Length', 'wp-app-store' ); echo ': ';
			echo is_numeric( $suhosin_limit ) ? size_format( $suhosin_limit ) : $suhosin_limit;
			echo "\r\n";
		}

		if ( function_exists( 'ini_get' ) && $suhosin_limit = ini_get( 'suhosin.request.max_value_length' ) ) {
			_e( 'Suhosin Request Max Value Length', 'wp-app-store' ); echo ': ';
			echo is_numeric( $suhosin_limit ) ? size_format( $suhosin_limit ) : $suhosin_limit;
			echo "\r\n";
		}
		
		_e( 'Debug Mode', 'wp-app-store' ); echo ': ';
		if ( defined('WP_DEBUG') && WP_DEBUG ) { echo 'Yes'; } else { echo 'No'; }
		echo "\r\n";
		
		_e( 'WP Max Upload Size', 'wp-app-store' ); echo ': ';
		echo size_format( wp_max_upload_size() );
		echo "\r\n";
		
		_e( 'PHP Post Max Size', 'wp-app-store' ); echo ': ';
		echo size_format( $this->get_post_max_size() );
		echo "\r\n";
		
		_e( 'PHP Time Limit', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'ini_get' ) ) echo ini_get('max_execution_time');
		echo "\r\n";

		_e( 'PHP Error Log', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'ini_get' ) ) echo ini_get('error_log');
		echo "\r\n";

		_e( 'fsockopen', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'fsockopen' ) ) {
			_e('Enabled', 'wp-app-store' );
		} else {
			_e( 'Disabled', 'wp-app-store' );
		}
		echo "\r\n";

		_e( 'OpenSSL', 'wp-app-store' ); echo ': ';
		if ( $this->open_ssl_enabled() ) {
			echo OPENSSL_VERSION_TEXT;

		} else {
			_e( 'Disabled', 'wp-app-store' );
		}
		echo "\r\n";

		_e( 'cURL', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'curl_init' ) ) {
			_e('Enabled', 'wp-app-store' );
		} else {
			_e( 'Disabled', 'wp-app-store' );
		}
		echo "\r\n";
		echo "\r\n";

		_e( 'Active Plugins', 'wp-app-store' ); echo ":\r\n";

		$active_plugins = (array) get_option( 'active_plugins', array() );

		if ( is_multisite() ) {
			$network_active_plugins = wp_get_active_network_plugins();
			$active_plugins = array_map( array( $this, 'remove_wp_plugin_dir' ), $network_active_plugins );
		}

		foreach ( $active_plugins as $plugin ) {
			$plugin_data = @get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin );
			if ( empty( $plugin_data['Name'] ) ) continue;
			echo $plugin_data['Name'] . ' (v' . $plugin_data['Version'] . ') ' . __( 'by', 'wp-app-store' ) . ' ' . $plugin_data['AuthorName'] . "\r\n";
		}

		echo "\r\n";
	}

	function remove_wp_plugin_dir( $name ) {
		$plugin = str_replace( WP_PLUGIN_DIR, '', $name );
		return substr( $plugin, 1 );
	}

	function fire_migration_complete() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'url' ) );
		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error . ' (#123)';
			exit;
		}

		do_action( 'wpmdb_migration_complete', 'pull', $_POST['url'] );
		exit;
	}

	function get_alter_queries() {
		global $wpdb;
		$alter_table_name = $this->get_alter_table_name();
		$sql = '';
		$alter_queries = $wpdb->get_results( "SELECT * FROM `{$alter_table_name}`", ARRAY_A );
		if( ! empty( $alter_queries ) ) {
			foreach( $alter_queries as $alter_query ) {
				$sql .= $alter_query['query'];
			}
		}
		return $sql;
	}
	
	// After table migration, delete old tables and rename new tables removing the temporarily prefix
	function ajax_finalize_backup() {
		global $wpdb;
		// This particular function can be accessed by non logged in users AND logged in users
		if ( ! current_user_can( 'manage_options' ) ) {
			$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'form_data', 'stage', 'prefix', 'type', 'location' ) );
			if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
				echo $this->invalid_content_verification_error . ' (#123)';
				exit;
			}
		}

		if ( $_POST['intent'] == 'pull' ) {
			$temp_tables = $this->get_tables( 'temp' );
			$sql = "SET FOREIGN_KEY_CHECKS=0;\n";

			$preserved_options = array( 'wpmdb_settings', 'wpmdb_error_log' );

			$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
			if( isset( $this->form_data['keep_active_plugins'] ) ) {
				$preserved_options[] = 'active_plugins';
			}

			$preserved_options = apply_filters( 'wpmdb_preserved_options', $preserved_options );

			foreach ( $temp_tables as $table ) {
				$sql .= 'DROP TABLE IF EXISTS ' . $this->backquote( substr( $table, strlen( $this->temp_prefix ) ) ) . ';';
				$sql .= "\n";
				$sql .= 'RENAME TABLE ' . $this->backquote( $table )  . ' TO ' . $this->backquote( substr( $table, strlen( $this->temp_prefix ) ) ) . ';';
				$sql .= "\n";
			}

			$preserved_options_data = $wpdb->get_results( sprintf( "SELECT * FROM %soptions WHERE `option_name` IN ('%s')", $wpdb->prefix, implode( "','", $preserved_options ) ), ARRAY_A );

			foreach( $preserved_options_data as $option ) {
				$sql .= $wpdb->prepare( "DELETE FROM `{$_POST['prefix']}options` WHERE `option_name` = %s;\n", $option['option_name'] );
				$sql .= $wpdb->prepare( "INSERT INTO `{$_POST['prefix']}options` ( `option_id`, `option_name`, `option_value`, `autoload` ) VALUES ( NULL , %s, %s, %s );\n", $option['option_name'], $option['option_value'], $option['autoload'] );
			}

			$alter_table_name = $this->get_alter_table_name();
			$sql .= $this->get_alter_queries();
			$sql .= "DROP TABLE IF EXISTS " . $this->backquote( $alter_table_name ) . ";\n";

			$this->process_chunk( $sql );

			$type = ( isset( $_POST['type'] ) ? 'push' : 'pull' );
			$location = ( isset( $_POST['location'] ) ? $_POST['location'] : $_POST['url'] );

			if( ! isset( $_POST['location'] ) ) {
				$data = array();
				$data['action'] = 'wpmdb_fire_migration_complete';
				$data['url'] = home_url();
				$data['sig'] = $this->create_signature( $data, $_POST['key'] );
				$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
				$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
				echo $response;
				$this->display_errors();
			}

			do_action( 'wpmdb_migration_complete', $type, $location );
		}
		else {
			do_action( 'wpmdb_migration_complete', 'push', $_POST['url'] );
			$data = $_POST;
			$data['intent'] = 'pull';
			$data['prefix'] = $wpdb->prefix;
			$data['type'] = 'push';
			$data['location'] = home_url();
			$data['sig'] = $this->create_signature( $data, $data['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			echo $response;
			$this->display_errors();
		}
		exit;
	}

	function ajax_process_chunk() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'table', 'chunk_gzipped' ) );
		$gzip = ( isset( $_POST['chunk_gzipped'] ) && $_POST['chunk_gzipped'] );

		$tmp_file_name = 'chunk.txt';
		if( $gzip ) {
			$tmp_file_name .= '.gz';
		}

		$tmp_file_path = wp_tempnam( $tmp_file_name );
		if ( !isset( $_FILES['chunk']['tmp_name'] ) || !move_uploaded_file( $_FILES['chunk']['tmp_name'], $tmp_file_path ) ) {
			echo 'Could not upload the SQL to the server. (#135)';
			exit;
		}

		if ( false === ( $chunk = file_get_contents( $tmp_file_path ) ) ) {
			echo 'Could not read the SQL we\'ve uploaded to the server. (#136)';
			exit;
		}

		@unlink( $tmp_file_path );

		$filtered_post['chunk'] = $chunk;

		if ( !$this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error . ' (#130)';
			exit;
		}

		if ( $this->settings['allow_push'] != true ) {
			echo 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#133)';
			exit;
		}

		if( $gzip ) {
			$filtered_post['chunk'] = gzuncompress( $filtered_post['chunk'] );
		}

		$this->process_chunk( $filtered_post['chunk'] );
		exit;
	}

	function process_chunk( $chunk ) {
		// prepare db
		global $wpdb;
		$this->set_time_limit();

		$queries = array_filter( explode( ";\n", $chunk ) );

		$wpdb->show_errors();
		foreach( $queries as $query ) {
			if( false === $wpdb->query( $query ) ) {
				exit;
			}
		}
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

	// This the first AJAX end point when a table is about to be migrated / backed up
	function ajax_prepare_table_migration() {
		global $wpdb;
		// Check that the user is valid and is allowed to perform a table migration
		if ( ! current_user_can( 'manage_options' ) ) {
			$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'last_table', 'gzip', 'primary_keys' ) );
			$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );
			if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
				echo $this->invalid_content_verification_error . ' (#119)';
				exit;
			}
		}

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		// checks if we're performing a backup, if so, continue with the backup and exit immediately after
		if ( $_POST['stage'] == 'backup' && $_POST['intent'] != 'savefile' ) {
			// if performing a push we need to backup the REMOTE machine's DB
			if ( $_POST['intent'] == 'push' ) {
				$data = $_POST;
				// flip the intent so we can trigger the else statement below
				$data['intent'] = 'pull';
				$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
				$data['primary_keys'] = stripslashes( $data['primary_keys'] );
				$data['sig'] = $this->create_signature( $data, $data['key'] );
				$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
				$this->display_errors();
				echo $response;
			}
			else {
				if ( isset( $this->form_data['gzip_file'] ) ) {
					unset( $this->form_data['gzip_file'] );
				}
				$this->maximum_chunk_size = $this->get_bottleneck();
				$sql_dump_file_name = $this->get_upload_info( 'path' ) . DS;
				$sql_dump_file_name .= $this->format_dump_name( $_POST['dump_filename'] );
				$file_created = file_exists( $sql_dump_file_name );
				$this->fp = $this->open( $sql_dump_file_name );
				if ( $file_created == false ) {
					$this->db_backup_header();
				}
				$this->backup_table( $_POST['table'] );
				$this->display_errors();
				$this->close( $this->fp );
			}
			exit;
		}

		// Pull and push need to be handled differently for obvious reasons, trigger different code depending on the migration intent (push or pull)
		if ( $_POST['intent'] == 'push' || $_POST['intent'] == 'savefile' ) {
			$this->maximum_chunk_size = $this->get_bottleneck();
			if ( isset( $_POST['bottleneck'] ) ) {
				$this->maximum_chunk_size = (int) $_POST['bottleneck'];
			}
			if ( $_POST['intent'] == 'push' ) {
				$this->remote_key = $_POST['key'];
				$this->remote_url = $_POST['url'];
			}
			$sql_dump_file_name = $this->get_upload_info( 'path' ) . DS;
			$sql_dump_file_name .= $this->format_dump_name( $_POST['dump_filename'] );

			if ( $_POST['intent'] == 'savefile' ) {
				$this->fp = $this->open( $sql_dump_file_name );
			}
			$this->backup_table( $_POST['table'] );
			$this->display_errors();
			if ( $_POST['intent'] == 'savefile' ) {
				$this->close( $this->fp );
			}
		}
		else {
			$data = $_POST;
			$data['action'] = 'wpmdb_process_pull_request';
			$data['pull_limit'] = $this->get_sensible_pull_limit();
			$data['prefix'] = $wpdb->prefix;
			if ( isset( $data['sig'] ) ) {
				unset( $data['sig'] );
			}
			$ajax_url = trailingslashit( $data['url'] ) . 'wp-admin/admin-ajax.php';
			$data['primary_keys'] = stripslashes( $data['primary_keys'] );
			$data['sig'] = $this->create_signature( $data, $data['key'] );

			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			$this->display_errors();

			if( strpos( $response, ';' ) === false ) {
				echo $response;
				exit;
			}

			// returned data is just a big string like this query;query;query;33
			// need to split this up into a chunk and row_tracker
			$row_information = trim( substr( strrchr( $response, "\n" ), 1 ) );
			$row_information = explode( ',', $row_information );
			$chunk = substr( $response, 0, strrpos( $response, ";\n" ) + 1 );

			if ( ! empty( $chunk ) ) {
				$this->process_chunk( $chunk );
			}

			echo json_encode( 
				array(
					'current_row' 		=> $row_information[0],
					'primary_keys'		=> $row_information[1]
				)
			);
		}
		exit;
	}

	// Occurs right before the first table is migrated / backed up during the migration process
	// Does a quick check to make sure the verification string is valid and also opens / creates files for writing to (if required)
	function ajax_initiate_migration() {
		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		if ( $_POST['intent'] == 'savefile' ) {

			$return = array(
				'code' => 200,
				'message' => 'OK',
				'body'  => json_encode( array( 'error' => 0 ) ),
			);

			$return['dump_filename'] = basename( $this->get_sql_dump_info( 'migrate', 'path' ) );
			$return['dump_url'] = $this->get_sql_dump_info( 'migrate', 'url' );
			$dump_filename_no_extension = substr( $return['dump_filename'], 0, -4 );

			$create_alter_table_query = $this->get_create_alter_table_query();
			// sets up our table to store 'ALTER' queries
			$this->process_chunk( $create_alter_table_query );

			if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) {
				$return['dump_filename'] .= '.gz';
				$return['dump_url'] .= '.gz';
			}
			$this->fp = $this->open( $this->get_upload_info( 'path' ) . DS . $return['dump_filename'] );
			$this->db_backup_header();
			$this->close( $this->fp );

			$return['dump_filename'] = $dump_filename_no_extension;
		}
		else { // does one last check that our verification string is valid

			$data = array(
				'action'  => 'wpmdb_respond_initiate_migration',
				'intent' => $_POST['intent'],
				'form_data' => $_POST['form_data'],
			);

			$data['sig'] = $this->create_signature( $data, $_POST['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );

			if ( false === $response ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $this->error );
			}
			else{
				$return = array(
					'body' => stripslashes( $response ),
				);
				$return = json_decode( $response, ARRAY_A );
			}

			if( $_POST['intent'] == 'pull' ) {
				// sets up our table to store 'ALTER' queries
				$create_alter_table_query = $this->get_create_alter_table_query();
				$this->process_chunk( $create_alter_table_query );
			}

			if( ! empty( $this->form_data['create_backup'] ) && $_POST['intent'] == 'pull' ) {
				$return['dump_filename'] = basename( $this->get_sql_dump_info( 'backup', 'path' ) );
				$return['dump_filename'] = substr( $return['dump_filename'], 0, -4 );
				$return['dump_url'] = $this->get_sql_dump_info( 'backup', 'url' );
			}

		}

		$return['dump_filename'] = ( empty( $return['dump_filename'] ) ? '' : $return['dump_filename'] );
		$return['dump_url'] = ( empty( $return['dump_url'] ) ? '' : $return['dump_url'] );

		echo json_encode( $return );

		exit;
	}

	// End point for the above AJAX call, ensures that the verification string is valid before continuing with the migration
	function ajax_respond_initiate_migration() {
		$return = array();
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'form_data' ) );
		if ( $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			if ( isset( $this->settings['allow_' . $_POST['intent']] ) && $this->settings['allow_' . $_POST['intent']] == true ) {
				$return['error'] = 0;
			}
			else {
				$return['error'] = 1;
				$return['message'] = 'The connection succeeded but the remote site is configured to reject ' . $_POST['intent'] . ' connections. You can change this in the "settings" tab on the remote site. (#110)';
			}
		}
		else {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#111)';
		}

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		if( ! empty( $this->form_data['create_backup'] ) && $_POST['intent'] == 'push' ) {
			$return['dump_filename'] = basename( $this->get_sql_dump_info( 'backup', 'path' ) );
			$return['dump_filename'] = substr( $return['dump_filename'], 0, -4 );
			$return['dump_url'] = $this->get_sql_dump_info( 'backup', 'url' );
		}

		echo json_encode( $return );

		if( $_POST['intent'] == 'push' ) {
			// sets up our table to store 'ALTER' queries
			$create_alter_table_query = $this->get_create_alter_table_query();
			$this->process_chunk( $create_alter_table_query );
		}

		exit;
	}

	function ajax_save_profile() {
		$profile = $this->parse_migration_form_data( $_POST['profile'] );
		if ( isset( $profile['save_migration_profile_option'] ) && $profile['save_migration_profile_option'] == 'new' ) {
			$profile['name'] = $profile['create_new_profile'];
			$this->settings['profiles'][] = $profile;
		}
		else {
			$key = $profile['save_migration_profile_option'];
			$name = $this->settings['profiles'][$key]['name'];
			$this->settings['profiles'][$key] = $profile;
			$this->settings['profiles'][$key]['name'] = $name;
		}
		update_option( 'wpmdb_settings', $this->settings );
		echo count( $this->settings['profiles'] ) - 1;
		exit;
	}

	function ajax_save_setting() {
		$this->settings[$_POST['setting']] = ( $_POST['checked'] == 'false' ? false : true );
		update_option( 'wpmdb_settings', $this->settings );
		exit;
	}

	function ajax_delete_migration_profile() {
		$key = $_POST['profile_id'];
		if ( isset( $this->settings['profiles'][$key] ) ) {
			unset( $this->settings['profiles'][$key] );
			update_option( 'wpmdb_settings', $this->settings );
		}
		else {
			echo '-1';
		}
		exit;
	}

	function ajax_reset_api_key() {
		$this->settings['key'] = $this->generate_key();
		update_option( 'wpmdb_settings', $this->settings );
		printf( "%s\n%s", site_url( '', 'https' ), $this->settings['key'] );
		exit;
	}

	// AJAX endpoint for when the user pastes into the connection info box (or when they click "connect")
	// Responsible for contacting the remote website and retrieving info and testing the verification string
	function ajax_prepare_remote_connection() {
		$data = array(
			'action'  => 'wpmdb_establish_remote_connection',
			'intent' => $_POST['intent']
		);

		$data['sig'] = $this->create_signature( $data, $_POST['key'] );
		$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
		$timeout = apply_filters( 'wpmdb_prepare_remote_connection_timeout', 10 );
		$response = $this->remote_post( $ajax_url, $data, __FUNCTION__, compact( 'timeout' ), true );
		$url_bits = parse_url( $this->attempting_to_connect_to );
		$return = $response;

		$alt_action = '';

		if ( false === $response ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $this->error );
			echo json_encode( $return );
			exit;
		}

		$response = unserialize( $response );

		if ( isset( $response['error'] ) && $response['error'] == 1 ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $response['message'] );
			echo json_encode( $return );
			exit;
		}

		$response['scheme'] = $url_bits['scheme'];
		$return = json_encode( $response );

		echo $return;
		exit;
	}

	function format_table_sizes( $size ) {
		$size *= 1024;
		return size_format( $size );
	}

	// AJAX end point for the above AJAX call, returns table information, absolute file path, table prefix, etc
	function ajax_establish_remote_connection() {
		global $wpdb;
		
		$return = array();
		
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent' ) );
		if ( !$this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#120) <a href="#" class="try-again js-action-link">Try again?</a>';
			echo serialize( $return );
			exit;
		}

		if ( !isset( $this->settings['allow_' . $_POST['intent']] ) || $this->settings['allow_' . $_POST['intent']] != true ) {
			$return['error'] = 1;
			$return['message'] = 'The connection succeeded but the remote site is configured to reject ' . $_POST['intent'] . ' connections. You can change this in the "settings" tab on the remote site. (#122) <a href="#" class="try-again js-action-link">Try again?</a>';
			echo serialize( $return );
			exit;
		}

		$plugin_info = get_plugin_data( $this->plugin_file_path, false, false );
		$return['tables'] = $this->get_tables();
		$return['prefixed_tables'] = $this->get_tables( 'prefix' );
		$return['table_sizes'] = $this->get_table_sizes();
		$return['table_rows'] = $this->get_table_row_count();
		$return['table_sizes_hr'] = array_map( array( $this, 'format_table_sizes' ), $this->get_table_sizes() );
		$return['path'] = $this->absolute_root_file_path;
		$return['url'] = home_url();
		$return['prefix'] = $wpdb->prefix;
		$return['bottleneck'] = $this->get_bottleneck();
		$return['error'] = 0;
		$return['plugin_version'] = $plugin_info['Version'];
		$return['domain'] = ( defined( 'DOMAIN_CURRENT_SITE' ) ? DOMAIN_CURRENT_SITE : '' );
		$return['uploads_dir'] = $this->get_short_uploads_dir();
		$return['gzip'] = ( $this->gzip() ? '1' : '0' );
		echo serialize( $return );
		exit;
	}

	// Utility debugging function
	function printer( $debug ) {
		echo '<pre>' . print_r( $debug, true ) . '</pre>';
	}

	// Generates our secret key
	function generate_key() {
		$keyset = 'abcdefghijklmnopqrstuvqxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
		$key = '';
		for ( $i = 0; $i < 32; $i++ ) {
			$key .= substr( $keyset, rand( 0, strlen( $keyset ) -1 ), 1 );
		}
		return $key;
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
		return $clean_tables;
	}

	// Retrieves the specified profile, if -1, returns the default profile
	function get_profile( $profile_id ) {
		if ( $profile_id == '-1' || ! isset( $this->settings['profiles'][$profile_id] ) ) {
			return $this->default_profile;
		}
		return $this->settings['profiles'][$profile_id];
	}

	function get_table_row_count() {
		global $wpdb;
		$results = $wpdb->get_results( $wpdb->prepare(
			'SELECT table_name, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = %s', DB_NAME
			), ARRAY_A
		);
		$return = array();
		foreach( $results as $results ) {
			$return[$results['table_name']] = ( $results['TABLE_ROWS'] == 0 ? 1 : $results['TABLE_ROWS'] );
		}
		return $return;
	}

	function get_table_sizes( $scope = 'regular' ) {
		global $wpdb;
		$prefix = ( $scope == 'temp' ? $this->temp_prefix : $wpdb->prefix );
		$results = $wpdb->get_results( $wpdb->prepare(
				'SELECT TABLE_NAME AS "table",
							ROUND((data_length + index_length)/1024,0) AS "size"
							FROM information_schema.TABLES
							WHERE information_schema.TABLES.table_schema="%s"
							AND information_schema.TABLES.table_type="%s"', DB_NAME, "BASE TABLE"
			), ARRAY_A
		);

		$return = array();

		foreach ( $results as $result ) {
			$return[$result['table']] = $result['size'];
		}

		return $return;
	}

	function template( $template ) {
		include $this->template_dir . $template . '.php';
	}

	function get_post_max_size() {
		$val = trim( ini_get( 'post_max_size' ) );
		$last = strtolower( $val[ strlen( $val ) - 1 ] );
		switch ( $last ) {
		case 'g':
			$val *= 1024;
		case 'm':
			$val *= 1024;
		case 'k':
			$val *= 1024;
		}
		return $val;
	}

	function get_sensible_pull_limit() {
		return apply_filters( 'wpmdb_sensible_pull_limit', min( 26214400, $this->settings['max_request'] ) );
	}

	function get_bottleneck( $type = 'regular' ) {
		$suhosin_limit = false;
		$suhosin_request_limit = false;
		$suhosin_post_limit = false;

		if ( function_exists( 'ini_get' ) ) {
			$suhosin_request_limit = ini_get( 'suhosin.request.max_value_length' );
			$suhosin_post_limit = ini_get( 'suhosin.post.max_value_length' );
		}

		if ( $suhosin_request_limit && $suhosin_post_limit ) {
			$suhosin_limit = min( $suhosin_request_limit, $suhosin_post_limit );
		}

		// we have to account for HTTP headers and other bloating, here we minus 1kb for bloat
		$post_max_upper_size = apply_filters( 'wpmdb_post_max_upper_size', 26214400 );
		$calculated_bottleneck = min( ( $this->get_post_max_size() - 1024 ), $post_max_upper_size );

		if ( $suhosin_limit ) {
			$calculated_bottleneck = min( $calculated_bottleneck, $suhosin_limit - 1024 );
		}

		if( $type != 'max' ) {
			$calculated_bottleneck = min( $calculated_bottleneck, $this->settings['max_request'] );
		}

		return apply_filters( 'wpmdb_bottleneck', $calculated_bottleneck );
	}

	function ajax_process_pull_request() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'pull_limit', 'last_table', 'gzip', 'primary_keys' ) );
		
		// verification will fail unless we strip slashes on primary_keys
		$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error . ' (#124)';
			exit;
		}

		if ( $this->settings['allow_pull'] != true ) {
			echo 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#132)';
			exit;
		}

		$this->maximum_chunk_size = $_POST['pull_limit'];
		$this->backup_table( $_POST['table'] );
		$this->display_errors();
		exit;
	}

	function format_dump_name( $dump_name ) {
		$extension = '.sql';
		$dump_name = sanitize_file_name( $dump_name );
		if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) {
			$extension .= '.gz';
		}
		return $dump_name . $extension;
	}

	function options_page() {
		?>

		<div class="wrap wpmdb">

			<div id="icon-tools" class="icon32"><br /></div><h2>Migrate DB Pro</h2>

			<?php
			$hide_warning = apply_filters( 'wpmdb_hide_safe_mode_warning', false );
			if ( function_exists( 'ini_get' ) && ini_get( 'safe_mode' ) && !$hide_warning ) {
				?>
				<div class="updated warning" style="margin: 10px 0 0 0;">
					<p>
						<strong>PHP Safe Mode Enabled</strong> &mdash;
						We do not officially support running this plugin in
						safe mode because <code>set_time_limit()</code>
						has no effect. Therefore we can't extend the run time of the
						script and ensure it doesn't time out before the migration completes.
						We haven't disabled the plugin however, so you're free to cross your
						fingers and hope for the best. However, if you have trouble,
						we can't help you until you turn off safe mode.
						<?php if ( function_exists( 'ini_get' ) ) : ?>
						Your current PHP run time limit is set to <?php echo ini_get( 'max_execution_time' ); ?> seconds.
						<?php endif; ?>
					</p>
				</div>
				<?php
			}
			?>

			<div class="updated warning ie-warning" style="margin: 10px 0 0 0; display: none;">
				<p>
					<strong>Internet Explorer Not Supported</strong> &mdash; 
					Less than 2% of our customers use IE, so we've decided not to spend time supporting it.
					We ask that you use Firefox or a Webkit-based browser like Chrome or Safari instead.
					If this is a problem for you, please let us know.
				</p>
			</div>

			<div id="wpmdb-main">

				<h2 class="nav-tab-wrapper"><a href="#" class="nav-tab nav-tab-active js-action-link migrate" data-div-name="migrate-tab">Migrate</a><a href="#" class="nav-tab js-action-link settings" data-div-name="settings-tab">Settings</a><a href="#" class="nav-tab js-action-link help" data-div-name="help-tab">Help</a></h2>

				<?php
				// select profile if more than > 1 profile saved
				if ( ! empty( $this->settings['profiles'] ) && ! isset( $_GET['wpmdb-profile'] ) ) {
					$this->template( 'profile' );
				}
				else {
					if ( isset( $_POST['import-db'] ) ) {
						$this->import_db();
					}
					$this->template( 'migrate' );
				}

				$this->template( 'settings' );

				$this->template( 'help' );
				?>

			</div> <!-- end #wpmdb-main -->

		</div> <!-- end .wrap -->
		<?php
	}

	function apply_replaces( $subject, $is_serialized = false ) {
		$search = $this->form_data['replace_old'];
		$replace = $this->form_data['replace_new'];
		$new = str_ireplace( $search, $replace, $subject, $count );
		return $new;
	}

	function set_time_limit() {
		if ( !function_exists( 'ini_get' ) || !ini_get( 'safe_mode' ) ) {
			set_time_limit( 0 );
		}
	}

	function process_sql_constraint( $create_query, $table, &$alter_table_query ) {
		if( preg_match( '@CONSTRAINT|FOREIGN[\s]+KEY@', $create_query ) ) {

			$sql_constraints_query = '';

			$nl_nix = "\n";
			$nl_win = "\r\n";
			$nl_mac = "\r";
			if( strpos( $create_query, $nl_win ) !== false ) {
				$crlf = $nl_win;
			} 
			elseif( strpos( $create_query, $nl_mac ) !== false ) {
				$crlf = $nl_mac;
			} 
			elseif( strpos( $create_query, $nl_nix ) !== false ) {
				$crlf = $nl_nix;
			}

			// Split the query into lines, so we can easily handle it.
			// We know lines are separated by $crlf (done few lines above).
			$sql_lines = explode( $crlf, $create_query );
			$sql_count = count( $sql_lines );

			// lets find first line with constraints
			for( $i = 0; $i < $sql_count; $i++ ) {
				if (preg_match(
					'@^[\s]*(CONSTRAINT|FOREIGN[\s]+KEY)@',
					$sql_lines[$i]
				)) {
					break;
				}
			}

			// If we really found a constraint
			if( $i != $sql_count ) {

				// remove, from the end of create statement
				$sql_lines[$i - 1] = preg_replace(
					'@,$@',
					'',
					$sql_lines[$i - 1]
				);

				// let's do the work
				$sql_constraints_query .= 'ALTER TABLE '
					. $this->backquote( $table )
					. $crlf;

				$first = true;
				for( $j = $i; $j < $sql_count; $j++ ) {
					if( preg_match(
						'@CONSTRAINT|FOREIGN[\s]+KEY@',
						$sql_lines[$j]
					)) {
						if( strpos( $sql_lines[$j], 'CONSTRAINT' ) === false ) {
							$tmp_str = preg_replace(
								'/(FOREIGN[\s]+KEY)/',
								'ADD \1',
								$sql_lines[$j]
							);
							$sql_constraints_query .= $tmp_str;
						}
						else {
							$tmp_str = preg_replace(
								'/(CONSTRAINT)/',
								'ADD \1',
								$sql_lines[$j]
							);
							$sql_constraints_query .= $tmp_str;
							preg_match(
								'/(CONSTRAINT)([\s])([\S]*)([\s])/',
								$sql_lines[$j],
								$matches
							);
						}
						$first = false;
					} 
					else {
						break;
					}
				}
				$sql_constraints_query .= ";\n";

				$create_query = implode(
					$crlf,
					array_slice($sql_lines, 0, $i)
				)
				. $crlf
				. implode(
					$crlf,
					array_slice( $sql_lines, $j, $sql_count - 1 )
				);
				unset( $sql_lines );

				$alter_table_query = $sql_constraints_query;
				return $create_query;
			}
		}
		return $create_query;
	}

	/**
	 * Taken partially from phpMyAdmin and partially from
	 * Alain Wolf, Zurich - Switzerland
	 * Website: http://restkultur.ch/personal/wolf/scripts/db_backup/
	 * Modified by Scott Merrill (http://www.skippy.net/)
	 * to use the WordPress $wpdb object
	 *
	 * @param string  $table
	 * @return void
	 */
	function backup_table( $table ) {
		global $wpdb;
		$this->set_time_limit();

		if ( empty( $this->form_data ) ) {
			$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		}

		$temp_prefix = $this->temp_prefix;
		$remote_prefix = ( isset( $_POST['prefix'] ) ? $_POST['prefix'] : $wpdb->prefix );

		$table_structure = $wpdb->get_results( "DESCRIBE " . $this->backquote( $table ) );
		if ( ! $table_structure ) {
			$this->error = 'Failed to retrieve table structure, please ensure your database is online. (#125)';
			return false;
		}

		$current_row = -1;
		if ( ! empty( $_POST['current_row'] ) ) {
			$temp_current_row = trim( $_POST['current_row'] );
			if ( ! empty( $temp_current_row ) ) {
				$current_row = (int) $temp_current_row;
			}
		}

		if ( $current_row == -1 ) {
			// Add SQL statement to drop existing table
			if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
				$this->stow( "\n\n" );
				$this->stow( "#\n" );
				$this->stow( "# " . sprintf( __( 'Delete any existing table %s', 'wp-migrate-db-pro' ), $this->backquote( $table ) ) . "\n" );
				$this->stow( "#\n" );
				$this->stow( "\n" );
				$this->stow( "DROP TABLE IF EXISTS " . $this->backquote( $table ) . ";\n" );
			}
			else {
				$this->stow( "DROP TABLE IF EXISTS " . $this->backquote( $temp_prefix . $table ) . ";\n" );
			}

			// Table structure
			// Comment in SQL-file
			if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
				$this->stow( "\n\n" );
				$this->stow( "#\n" );
				$this->stow( "# " . sprintf( __( 'Table structure of table %s', 'wp-migrate-db-pro' ), $this->backquote( $table ) ) . "\n" );
				$this->stow( "#\n" );
				$this->stow( "\n" );
			}

			$create_table = $wpdb->get_results( "SHOW CREATE TABLE " . $this->backquote( $table ), ARRAY_N );
			if ( false === $create_table ) {
				$this->error = 'Failed to generate the create table query, please ensure your database is online. (#126)';
				return false;
			}

			if ( $this->form_data['action'] != 'savefile' && $_POST['stage'] != 'backup' ) {
				$create_table[0][1] = str_replace( 'CREATE TABLE `', 'CREATE TABLE `' . $temp_prefix, $create_table[0][1] );
			}

			$create_table[0][1] = str_replace( 'TYPE=', 'ENGINE=', $create_table[0][1] );

			$alter_table_query = '';
			$create_table[0][1] = $this->process_sql_constraint( $create_table[0][1], $table, $alter_table_query );

			$create_table[0][1] = apply_filters( 'wpmdb_create_table_query', $create_table[0][1], $table );

			$this->stow( $create_table[0][1] . ";\n" );

			if( ! empty( $alter_table_query ) ) {
				$alter_table_name = $this->get_alter_table_name();
				$insert = sprintf( "INSERT INTO %s ( `query` ) VALUES ( '%s' );\n", $this->backquote( $alter_table_name ), esc_sql( $alter_table_query ) );
				if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
					$this->process_chunk( $insert );
				}
				else {
					$this->stow( $insert );
				}
			}

			// Comment in SQL-file
			if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
				$this->stow( "\n\n" );
				$this->stow( "#\n" );
				$this->stow( '# ' . sprintf( __( 'Data contents of table %s', 'wp-migrate-db-pro' ), $this->backquote( $table ) ) . "\n" );
				$this->stow( "#\n" );
			}
		}

		// $defs = mysql defaults, looks up the default for that paricular column, used later on to prevent empty inserts values for that column
		// $ints = holds a list of the possible integar types so as to not wrap them in quotation marks later in the insert statements
		$defs = array();
		$ints = array();
		foreach ( $table_structure as $struct ) {
			if ( ( 0 === strpos( $struct->Type, 'tinyint' ) ) ||
				( 0 === strpos( strtolower( $struct->Type ), 'smallint' ) ) ||
				( 0 === strpos( strtolower( $struct->Type ), 'mediumint' ) ) ||
				( 0 === strpos( strtolower( $struct->Type ), 'int' ) ) ||
				( 0 === strpos( strtolower( $struct->Type ), 'bigint' ) ) ) {
				$defs[strtolower( $struct->Field )] = ( null === $struct->Default ) ? 'NULL' : $struct->Default;
				$ints[strtolower( $struct->Field )] = "1";
			}
		}

		// Batch by $row_inc

		$row_inc = $this->rows_per_segment;
		$row_start = 0;
		if ( $current_row != -1 ) {
			$row_start = $current_row;
		}

		$this->row_tracker = $row_start;

		// \x08\\x09, not required
		$search = array( "\x00", "\x0a", "\x0d", "\x1a" );
		$replace = array( '\0', '\n', '\r', '\Z' );

		$query_size = 0;

		$table_name = $table;

		if ( $this->form_data['action'] != 'savefile' && $_POST['stage'] != 'backup' ) {
			$table_name = $temp_prefix . $table;
		}

		$this->primary_keys = array();
		foreach( $table_structure as $col ){
			$field_set[] = $this->backquote( $col->Field );
			if( false !== strpos( $col->Type, 'int' ) && $col->Key == 'PRI' ) {
				$this->primary_keys[$col->Field] = 0;
			}
		}

		if( ! empty( $_POST['primary_keys'] ) ) {
			$_POST['primary_keys'] = trim( $_POST['primary_keys'] );
			if( ! empty( $_POST['primary_keys'] ) && is_serialized( $_POST['primary_keys'] ) ) {
				$this->primary_keys = unserialize( stripslashes( $_POST['primary_keys'] ) );
			}
		}

		$fields = implode( ', ', $field_set );

		$insert_buffer = $insert_query_template = "INSERT INTO " . $this->backquote( $table_name ) . " ( " . $fields . ") VALUES\n";

		do {
			$where = '';
			$order_by = '';
			// We need ORDER BY here because with LIMIT, sometimes it will return
			// the same results from the previous query and we'll have duplicate insert statements 
			if ( isset( $this->form_data['exclude_spam'] ) ) {
				if ( $wpdb->comments == $table ) {
					$where = 'WHERE comment_approved != "spam"';
				}
				elseif ( $wpdb->commentmeta == $table ) {
					$where = sprintf( 'INNER JOIN %1$s
						ON %1$s.comment_ID = %2$s.comment_id AND %1$s.comment_approved != \'spam\'',
						$this->backquote( $wpdb->comments ), $this->backquote( $wpdb->commentmeta ) );
				}
			}
			elseif ( isset( $this->form_data['exclude_revisions'] ) && $wpdb->posts == $table ) {
				$where = 'WHERE post_type != "revision"';
			}

			$limit = "LIMIT {$row_start}, {$row_inc}";

			if( ! empty( $this->primary_keys ) ) {
				$primary_keys_keys = array_keys( $this->primary_keys );
				$primary_keys_keys = array_map( array( $this, 'backquote' ), $primary_keys_keys );

				$order_by = 'ORDER BY ' . implode( ',', $primary_keys_keys );
				$where .= ( empty( $where ) ? 'WHERE ' : ' AND ' );

				$temp_primary_keys = $this->primary_keys;

				$primary_key_count = count( $temp_primary_keys );
				for( $j = 0; $j < $primary_key_count; $j++ ) { 
					$where .= ( $j == 0 ? '( ' : ' OR ( ' ); 
					$i = 0;
					foreach( $temp_primary_keys as $primary_key => $value ) {
						$where .= ( $i == 0 ? '' : ' AND ' );
						$operator = ( count( $temp_primary_keys ) - 1 == $i ? '>' : '=' );
						$where .= sprintf( '%s %s %s', $this->backquote( $primary_key ), $operator, $value );
						++$i;
					}
					$tmp = $temp_primary_keys;
					$keys = array_keys( $tmp );
					$end = end( $keys );
					unset( $temp_primary_keys[$end] );
					$where .= ' )';
				}

				$limit = "LIMIT $row_inc";
			}

			$where = apply_filters( 'wpmdb_rows_where', $where, $table );
			$order_by = apply_filters( 'wpmdb_rows_order_by', $order_by, $table );
			$limit = apply_filters( 'wpmdb_rows_limit', $limit, $table );

			$sql = "SELECT " . $this->backquote( $table ) . ".* FROM " . $this->backquote( $table ) . " $where $order_by $limit";
			$sql = apply_filters( 'wpmdb_rows_sql', $sql, $table );

			$table_data = $wpdb->get_results( $sql );

			if ( $table_data ) {
				foreach ( $table_data as $row ) {
					$values = array();
					foreach ( $row as $key => $value ) {
						if ( isset( $ints[strtolower( $key )] ) && $ints[strtolower( $key )] ) {
							// make sure there are no blank spots in the insert syntax,
							// yet try to avoid quotation marks around integers
							$value = ( null === $value || '' === $value ) ? $defs[strtolower( $key )] : $value;
							$values[] = ( '' === $value ) ? "''" : $value;
						} else {
							if ( null === $value ) {
								$values[] = 'NULL';
							}
							else {

								if ( 'guid' != $key || ( isset( $this->form_data['replace_guids'] ) && ( $wpdb->posts == $table || preg_match( '/' . $wpdb->prefix . '[0-9]+_posts/', $table ) ) ) ) {
									if ( $_POST['stage'] != 'backup' ) {
										$value = $this->recursive_unserialize_replace( $value );
									}
								}
								
								$values[] = "'" . str_replace( $search, $replace, $this->sql_addslashes( $value ) ) . "'";
							}
						}
					}

					$insert_line = '(' . implode( ', ', $values ) . '),';
					$insert_line .= "\n";

					if ( ( strlen( $this->current_chunk ) + strlen( $insert_line ) + strlen( $insert_buffer ) + 10 ) > $this->maximum_chunk_size ) {
						if( $insert_buffer != $insert_query_template ) {
							$insert_buffer = rtrim( $insert_buffer, "\n," );
							$insert_buffer .= " ;\n";
							$this->stow( $insert_buffer );
							$insert_buffer = $insert_query_template;
							$query_size = 0;
						}
						$this->transfer_chunk();
					}

					if ( ( $query_size + strlen( $insert_line ) ) > $this->max_insert_string_len && $insert_buffer != $insert_query_template ) {
						$insert_buffer = rtrim( $insert_buffer, "\n," );
						$insert_buffer .= " ;\n";
						$this->stow( $insert_buffer );
						$insert_buffer = $insert_query_template;
						$query_size = 0;
					}

					$insert_buffer .= $insert_line;
					$query_size += strlen( $insert_line );

					++$this->row_tracker;

					if( ! empty( $this->primary_keys ) ) {
						foreach( $this->primary_keys as $primary_key => $value ) {
							$this->primary_keys[$primary_key] = $row->$primary_key;
						}
					}
				}
				$row_start += $row_inc;

				if ( $insert_buffer != $insert_query_template ) {
					$insert_buffer = rtrim( $insert_buffer, "\n," );
					$insert_buffer .= " ;\n";
					$this->stow( $insert_buffer );
					$insert_buffer = $insert_query_template;
					$query_size = 0;
				}

			}
		} while ( count( $table_data ) > 0 );

		// Create footer/closing comment in SQL-file
		if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
			$this->stow( "\n" );
			$this->stow( "#\n" );
			$this->stow( "# " . sprintf( __( 'End of data contents of table %s', 'wp-migrate-db-pro' ), $this->backquote( $table ) ) . "\n" );
			$this->stow( "# --------------------------------------------------------\n" );
			$this->stow( "\n" );

			if( $_POST['last_table'] == '1' ) {
				$this->stow( "#\n" );
				$this->stow( "# Add constraints back in\n" );
				$this->stow( "#\n\n" );
				$this->stow( $this->get_alter_queries() );
				$alter_table_name = $this->get_alter_table_name();
				if ( $this->form_data['action'] == 'savefile' ) {
					$wpdb->query( "DROP TABLE IF EXISTS " . $this->backquote( $alter_table_name ) . ";" );
				}
			}
		}

		$this->row_tracker = -1;
		$this->transfer_chunk();

	} // end backup_table()

	/**
	 * Take a serialized array and unserialize it replacing elements as needed and
	 * unserialising any subordinate arrays and performing the replace on those too.
	 *
	 * Mostly from https://github.com/interconnectit/Search-Replace-DB
	 *
	 * @param array  $data               Used to pass any subordinate arrays back to in.
	 * @param bool   $serialized         Does the array passed via $data need serialising.
	 * @param bool   $parent_serialized  Passes whether the original data passed in was serialized
	 *
	 * @return array    The original array with all elements replaced as needed.
	 */
	function recursive_unserialize_replace( $data, $serialized = false, $parent_serialized = false ) {

		$is_json = false;
		// some unseriliased data cannot be re-serialized eg. SimpleXMLElements
		try {

			if ( is_string( $data ) && ( $unserialized = @unserialize( $data ) ) !== false ) {
				$data = $this->recursive_unserialize_replace( $unserialized, true, true );
			}
			elseif ( is_array( $data ) ) {
				$_tmp = array( );
				foreach ( $data as $key => $value ) {
					$_tmp[ $key ] = $this->recursive_unserialize_replace( $value, false, $parent_serialized );
				}

				$data = $_tmp;
				unset( $_tmp );
			}
			// Submitted by Tina Matter
			elseif ( is_object( $data ) ) {
				$_tmp = clone $data;
				foreach ( $data as $key => $value ) {
					$_tmp->$key = $this->recursive_unserialize_replace( $value, false, $parent_serialized );
				}

				$data = $_tmp;
				unset( $_tmp );
			}
			elseif ( $this->is_json( $data, true ) ) {
				$_tmp = array( );
				$data = json_decode( $data, true );
				foreach ( $data as $key => $value ) {
					$_tmp[ $key ] = $this->recursive_unserialize_replace( $value, false, $parent_serialized );
				}

				$data = $_tmp;
				unset( $_tmp );	
				$is_json = true;
			}
			elseif ( is_string( $data ) ) {
				$data = $this->apply_replaces( $data, $parent_serialized );
			}

			if ( $serialized )
				return serialize( $data );

			if ( $is_json )
				return json_encode( $data );

		} catch( Exception $error ) {

		}

		return $data;
	}

	function db_backup_header() {
		$this->stow( "# " . __( 'WordPress MySQL database migration', 'wp-migrate-db-pro' ) . "\n", false );
		$this->stow( "#\n", false );
		$this->stow( "# " . sprintf( __( 'Generated: %s', 'wp-migrate-db-pro' ), date( "l j. F Y H:i T" ) ) . "\n", false );
		$this->stow( "# " . sprintf( __( 'Hostname: %s', 'wp-migrate-db-pro' ), DB_HOST ) . "\n", false );
		$this->stow( "# " . sprintf( __( 'Database: %s', 'wp-migrate-db-pro' ), $this->backquote( DB_NAME ) ) . "\n", false );
		$this->stow( "# --------------------------------------------------------\n\n", false );
	}

	function gzip() {
		return function_exists( 'gzopen' );
	}

	function open( $filename = '', $mode = 'a' ) {
		if ( '' == $filename ) return false;
		if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) )
			$fp = gzopen( $filename, $mode );
		else
			$fp = fopen( $filename, $mode );
		return $fp;
	}

	function close( $fp ) {
		if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) gzclose( $fp );
		else fclose( $fp );
	}

	function stow( $query_line, $replace = true ) {
		$this->current_chunk .= $query_line;
		if ( $this->form_data['action'] == 'savefile' || $_POST['stage'] == 'backup' ) {
			if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) {
				if ( ! @gzwrite( $this->fp, $query_line ) ) {
					$this->error = 'Failed to write the gzipped SQL data to the file. (#127)';
					return false;
				}
			}
			else {
				if ( false === @fwrite( $this->fp, $query_line ) ) {
					$this->error = 'Failed to write the SQL data to the file. (#128)';
					return false;
				}
			}
		}
		else if ( $_POST['intent'] == 'pull' ) {
			echo $query_line;
		}
	}

	// Called in the $this->stow function once our chunk buffer is full, will transfer the SQL to the remote server for importing
	function transfer_chunk() {

		if( $_POST['intent'] == 'savefile' || $_POST['stage'] == 'backup' ) {
			$this->close( $this->fp );
			echo json_encode( 
				array(
					'current_row' 	=> $this->row_tracker,
					'primary_keys'	=> serialize( $this->primary_keys )
				)
			);
			exit;
		}

		if ( $_POST['intent'] == 'pull' ) {
			echo $this->row_tracker . ',' . serialize( $this->primary_keys );
			exit;
		}

		$chunk_gzipped = '0';
		if( isset( $_POST['gzip'] ) && $_POST['gzip'] == '1' && $this->gzip() ) {
			$this->current_chunk = gzcompress( $this->current_chunk );
			$chunk_gzipped = '1';
		}

		$data = array(
			'action'  => 'wpmdb_process_chunk',
			'table' => $_POST['table'],
			'chunk_gzipped'	=> $chunk_gzipped,
			'chunk'  =>  $this->current_chunk // NEEDS TO BE the last element in this array because of adding it back into the array in ajax_process_chunk()
		);
		
		$data['sig'] = $this->create_signature( $data, $_POST['key'] );

		$ajax_url = trailingslashit( $this->remote_url ) . 'wp-admin/admin-ajax.php';
		$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
		$this->display_errors();
		$response = trim( $response );
		if( ! empty( $response ) ) {
			echo $response;
			exit;
		}

		echo json_encode( 
			array(
				'current_row' 		=> $this->row_tracker,
				'primary_keys'		=> serialize( $this->primary_keys )
			)
		);
		exit;
	}

	/**
	 * Add backquotes to tables and db-names in
	 * SQL queries. Taken from phpMyAdmin.
	 */
	function backquote( $a_name ) {
		if ( !empty( $a_name ) && $a_name != '*' ) {
			if ( is_array( $a_name ) ) {
				$result = array();
				reset( $a_name );
				while ( list( $key, $val ) = each( $a_name ) )
					$result[$key] = '`' . $val . '`';
				return $result;
			} else {
				return '`' . $a_name . '`';
			}
		} else {
			return $a_name;
		}
	}

	/**
	 * Better addslashes for SQL queries.
	 * Taken from phpMyAdmin.
	 */
	function sql_addslashes( $a_string = '', $is_like = false ) {
		if ( $is_like ) $a_string = str_replace( '\\', '\\\\\\\\', $a_string );
		else $a_string = str_replace( '\\', '\\\\', $a_string );
		return str_replace( '\'', '\\\'', $a_string );
	}

	function network_admin_menu() {
		$hook_suffix = add_submenu_page( 'settings.php', 'Migrate DB Pro', 'Migrate DB Pro', 'manage_network_options', 'wp-migrate-db-pro', array( $this, 'options_page' ) );
		$this->after_admin_menu( $hook_suffix );
	}

	function admin_menu() {
		$hook_suffix = add_management_page( 'Migrate DB Pro', 'Migrate DB Pro', 'export', 'wp-migrate-db-pro', array( $this, 'options_page' ) );
		$this->after_admin_menu( $hook_suffix );
	}

	function after_admin_menu( $hook_suffix ) {
		add_action( 'admin_head-' . $hook_suffix, array( $this, 'admin_head_connection_info' ) );
		add_action( 'load-' . $hook_suffix , array( $this, 'load_assets' ) );

		// Remove licence from the database if constant is set
		if ( $this->is_licence_constant() && !empty( $this->settings['licence'] ) ) {
			$this->settings['licence'] = '';
			$this->settings['licence_email'] = '';
			update_option( 'wpmdb_settings', $this->settings );
		}
	}

	function load_assets() {
		if ( ! empty( $_GET['download'] ) ) {
			$this->download_file();
		}

		$src = plugins_url( 'asset/css/styles.css', dirname( __FILE__ ) );
		wp_enqueue_style( 'wp-migrate-db-pro-styles', $src, array(), $this->get_installed_version() );
		$src = plugins_url( 'asset/js/script.js', dirname( __FILE__ ) );
		wp_enqueue_script( 'wp-migrate-db-pro-script', $src, array( 'jquery' ), $this->get_installed_version(), true );

		wp_enqueue_script('jquery');
		wp_enqueue_script('jquery-ui-core');
		wp_enqueue_script('jquery-ui-slider');

		// PressTrends
		$this->presstrends();
	}

	function download_file() {
		// dont need to check for user permissions as our 'add_management_page' already takes care of this
		$this->set_time_limit();

		$dump_name = $this->format_dump_name( $_GET['download'] );
		if( isset( $_GET['gzip'] ) ) {
			$dump_name .= '.gz';
		}
		$diskfile = $this->get_upload_info( 'path' ) . DS . $dump_name;
		$filename = basename( $diskfile );
		$last_dash = strrpos( $filename, '-' );
		$salt = substr( $filename, $last_dash, 6 );
		$filename_no_salt = str_replace( $salt, '', $filename );

		if ( file_exists( $diskfile ) ) {
			header( 'Content-Description: File Transfer' );
			header( 'Content-Type: application/octet-stream' );
			header( 'Content-Length: ' . filesize( $diskfile ) );
			header( 'Content-Disposition: attachment; filename=' . $filename_no_salt );
			$success = readfile( $diskfile );
			unlink( $diskfile );
			exit;
		}
		else {
			wp_die( "Could not find the file to download:<br />$diskfile." );
		}
	}

	function admin_head_connection_info() {
		global $table_prefix;
		$plugin_info = get_plugin_data( $this->plugin_file_path, false, false );
		?>
		<script type='text/javascript'>
			var wpmdb_connection_info = '<?php echo json_encode( array( site_url( '', 'https' ), $this->settings['key'] ) ); ?>';
			var wpmdb_this_url = '<?php echo addslashes( home_url() ) ?>';
			var wpmdb_this_path = '<?php echo addslashes( $this->absolute_root_file_path ); ?>';
			var wpmdb_this_domain = '<?php echo ( defined( 'DOMAIN_CURRENT_SITE' ) ? DOMAIN_CURRENT_SITE : '' ); ?>';
			var wpmdb_this_tables = '<?php echo json_encode( $this->get_tables() ); ?>';
			var wpmdb_this_prefixed_tables = '<?php echo json_encode( $this->get_tables( 'prefix' ) ); ?>';
			var wpmdb_this_table_sizes = '<?php echo json_encode( $this->get_table_sizes() ); ?>';
			var wpmdb_this_table_rows = '<?php echo json_encode( $this->get_table_row_count() ); ?>';
			var wpmdb_this_upload_url = '<?php echo addslashes( trailingslashit( $this->get_upload_info( 'url' ) ) ); ?>';
			var wpmdb_this_website_name = '<?php echo sanitize_title_with_dashes( DB_NAME ); ?>';
			var wpmdb_this_download_url = '<?php echo network_admin_url( $this->plugin_base . '&download=' ); ?>';
			var wpmdb_this_prefix = '<?php echo $table_prefix; ?>';
			var wpmdb_is_multisite = <?php echo ( is_multisite() ? 'true' : 'false' ); ?>;
			var wpmdb_openssl_available = <?php echo ( $this->open_ssl_enabled() ? 'true' : 'false' ); ?>;
			var wpmdb_plugin_version = '<?php echo $plugin_info['Version']; ?>';
			var wpmdb_max_request = '<?php echo $this->settings['max_request'] ?>';
			var wpmdb_bottleneck = '<?php echo $this->get_bottleneck( 'max' ); ?>';
			var wpmdb_this_uploads_dir = '<?php echo addslashes( $this->get_short_uploads_dir() ); ?>';
			var wpmdb_has_licence = '<?php echo ( $this->get_licence_key() == '' ? '0' : '1' ); ?>';
		</script>
		<?php
	}

	function presstrends() {
		// PressTrends Account API Key
		$api_key = 'mr3j649a7lisvnwszscydb9ebujzsf2q9a3j';
		$auth	= 'qkpuarenbf2v0qtnvv37h6zlap52xrdcr';

		// Start of Metrics
		global $wpdb;
		$data = get_transient( 'presstrends_cache_data' );
		if ( !$data || $data == '' ) {
			$api_base = 'http://api.presstrends.io/index.php/api/pluginsites/update/auth/';
			$url	  = $api_base . $auth . '/api/' . $api_key . '/';

			$count_posts	= wp_count_posts();
			$count_pages	= wp_count_posts( 'page' );
			$comments_count = wp_count_comments();

			// wp_get_theme was introduced in 3.4, for compatibility with older versions, let's do a workaround for now.
			if ( function_exists( 'wp_get_theme' ) ) {
				$theme_data = wp_get_theme();
				$theme_name = urlencode( $theme_data->Name );
			} else {
				$theme_data = get_theme_data( get_stylesheet_directory() . '/style.css' );
				$theme_name = $theme_data['Name'];
			}

			$plugin_name = '&';
			foreach ( get_plugins() as $plugin_info ) {
				$plugin_name .= $plugin_info['Name'] . '&';
			}
			// CHANGE __FILE__ PATH IF LOCATED OUTSIDE MAIN PLUGIN FILE
			$plugin_data		 = get_plugin_data( $this->plugin_file_path );
			$posts_with_comments = $wpdb->get_var( "SELECT COUNT(*) FROM $wpdb->posts WHERE post_type='post' AND comment_count > 0" );
			$data				= array(
				'url'			 => stripslashes( str_replace( array( 'http://', '/', ':' ), '', site_url() ) ),
				'posts'		   => $count_posts->publish,
				'pages'		   => $count_pages->publish,
				'comments'		=> $comments_count->total_comments,
				'approved'		=> $comments_count->approved,
				'spam'			=> $comments_count->spam,
				'pingbacks'	   => $wpdb->get_var( "SELECT COUNT(comment_ID) FROM $wpdb->comments WHERE comment_type = 'pingback'" ),
				'post_conversion' => ( $count_posts->publish > 0 && $posts_with_comments > 0 ) ? number_format( ( $posts_with_comments / $count_posts->publish ) * 100, 0, '.', '' ) : 0,
				'theme_version'   => $plugin_data['Version'],
				'theme_name'	  => $theme_name,
				'site_name'	   => str_replace( ' ', '', get_bloginfo( 'name' ) ),
				'plugins'		 => count( get_option( 'active_plugins' ) ),
				'plugin'		  => urlencode( $plugin_name ),
				'wpversion'	   => get_bloginfo( 'version' ),
			);

			foreach ( $data as $k => $v ) {
				$url .= $k . '/' . $v . '/';
			}
			wp_remote_get( $url );
			set_transient( 'presstrends_cache_data', $data, $this->transient_timeout );
		}
	}

	function get_installed_version() {
		if ( !is_admin() ) return false; // get_themes & get_plugins throw an error on the frontend

		$plugins = get_plugins();

		if ( !isset( $plugins[$this->plugin_basename]['Version'] ) ) {
			return false;
		}

		return $plugins[$this->plugin_basename]['Version'];
	}

	function get_latest_version() {
		$data = $this->get_upgrade_data();
		return $data['version'];
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

		$installed_version = $this->get_installed_version();
		$latest_version = $this->get_latest_version();

		$new_version = '';
		if ( version_compare( $installed_version, $latest_version, '<' ) ) {
			$new_version = __( 'There is a new version of WP Migrate DB Pro available.', 'wp-migrate-db-pro' );
			$new_version .= ' <a class="thickbox" title="WP Migrate DB Pro" href="plugin-install.php?tab=plugin-information&plugin=' . rawurlencode( $this->plugin_slug ) . '&TB_iframe=true&width=640&height=808">';
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
				$message = 'To finish activating WP Migrate DB Pro, please ';
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
				<div class="update-message">
					<div class="wpmdb-new-version-notice"><?php echo $new_version; ?></div>
					<div class="wpmdb-licence-error-notice"><?php echo $message; ?></div>
				</div>
			</td>
		</tr>

		<?php if ( $new_version ) : // removes the built-in plugin update message ?>
		<script type="text/javascript">
		(function($) {
			var wpmdb_row = jQuery('#wp-migrate-db-pro'),
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

	function plugin_update_popup() {
		if ( $this->plugin_slug != $_GET['plugin'] ) return;

		$url = $this->dbrains_api_base . '/content/themes/delicious-brains/update-popup/wp-migrate-db-pro.html';
		$data = wp_remote_get( $url, array( 'timeout' => 30 ) );

		if ( is_wp_error( $data ) || 200 != $data['response']['code'] ) {
			echo '<p>Could not retrieve version details. Please try again.</p>';
		}
		else {
			echo $data['body'];
		}

		exit;
	}

	function get_upgrade_data() {
		$info = get_site_transient( 'wpmdb_upgrade_data' );
		if ( $info ) return $info;

		$data = $this->dbrains_api_request( 'upgrade_data', array( 'product_id' => '21') );

		$data = json_decode( $data, true );

		/*
			We need to set the transient even when there's an error,
			otherwise we'll end up making API requests over and over again
			and slowing things down big time.
		*/
		$default_upgrade_data = array( 'version' => $this->get_installed_version() );

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
		return $info;
	}

	function site_transient_update_plugins( $trans ) {
		if ( !is_admin() ) return $trans; // only need to run this when in the dashboard

		$latest_version = $this->get_latest_version();
		if ( !$latest_version ) return $trans;

		$ut = $this->plugin_basename;
		$installed_version = $this->get_installed_version();

		if ( version_compare( $installed_version, $latest_version, '<' ) ) {
			$trans->response[$ut] = new stdClass();
			$trans->response[$ut]->url = $this->dbrains_api_base;
			$trans->response[$ut]->slug = $this->plugin_slug;
			$trans->response[$ut]->package = $this->get_plugin_update_download_url();
			$trans->response[$ut]->new_version = $latest_version;
			$trans->response[$ut]->id = '0';
		}

		return $trans;
	}

	function get_plugin_update_download_url() {
		$licence = $this->get_licence_key();
		$query_args = array( 
			'request'		=> 'download',
			'licence_key'	=> $licence,
			'site_url' 		=> home_url( '', 'http')
		);
		return add_query_arg( $query_args, $this->dbrains_api_url );
	}

	function enqueue_plugin_update_script( $hook ) {
		if( 'plugins.php' != $hook ) {
			return;
		}

		$src = plugins_url( 'asset/js/plugin-update.js', dirname( __FILE__ ) );
		wp_enqueue_script( 'wp-migrate-db-pro-plugin-update-script', $src, array( 'jquery' ), false, true );
	}

	function add_plugin_update_styles() {
		?>
		<style type="text/css">
			.check-licence-spinner {
				left: 5px;
				position: relative;
				top: 3px;
				width: 16px;
				height: 16px;
			}

			.wpmdb-original-update-row {
				display: none;
			}
		</style>
		<?php
	}

}
