<?php
class WP_Migrate_DB_Pro {
	private $upload_dir;
	private $upload_url;
	private $fp;
	private $settings;
	private $absolute_root_file_path;
	private $form_defaults;
	private $accepted_fields;
	private $plugin_base;
	private $default_profile;
	private $maximum_chunk_number = 60;
	private $current_chunk_number = 0;
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
	private $temp_prefix = '_migrate_';
	private $row_tracker;
	private $buffer_full = false;
	private $rows_per_segment = 100;
	private $error;
	private $invalid_content_verification_error = 'Invalid content verification signature, please verify the connection information on the remote site and try again.';
	private $dbrains_api_url;
	private $dbrains_api_base = 'https://deliciousbrains.com';
	private $transient_timeout;
	private $transient_retry_timeout;

	function __construct( $plugin_file_path ) {
		$this->plugin_file_path = $plugin_file_path;
		$this->plugin_dir_path = plugin_dir_path( $plugin_file_path );
		$this->plugin_slug = basename( $this->plugin_dir_path );
		$this->plugin_basename = plugin_basename( $plugin_file_path );

		$upload_dir = wp_upload_dir();
		$this->upload_dir = $upload_dir['basedir'];
		$this->upload_url = $upload_dir['baseurl'];

		$this->replaced['serialized']['count'] = 0;
		$this->replaced['serialized']['strings'] = '';
		$this->replaced['nonserialized']['count'] = 0;

		if ( defined( 'DBRAINS_API_BASE' ) ) {
			$this->dbrains_api_base = DBRAINS_API_BASE;
		}

		$this->transient_timeout = 60 * 60 * 12;
		$this->transient_retry_timeout = 60 * 60 * 2;

		$this->dbrains_api_url = $this->dbrains_api_base . '/?wc-api=delicious-brains';

		$this->settings = get_site_option( 'wpmdb_settings' );

		$this->max_insert_string_len = 50000; // 50000 is the default as defined by phphmyadmin

		// if no settings exist then this is a fresh install, set up some default settings
		if ( empty( $this->settings ) ) {
			$this->settings = array(
				'key'  => $this->generate_key(),
				'allow_pull' => false,
				'allow_push' => false,
				'profiles'  => array(),
				'licence'  => '',
				'licence_email' => ''
			);
			update_site_option( 'wpmdb_settings', $this->settings );
		}

		add_filter( 'plugin_action_links_' . $this->plugin_basename, array( $this, 'plugin_action_links' ) );

		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_head-tools_page_wp-migrate-db-pro', array( $this, 'admin_head_connection_info' ) );

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

		// external AJAX handlers
		add_action( 'wp_ajax_nopriv_wpmdb_establish_remote_connection', array( $this, 'ajax_establish_remote_connection' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_respond_initiate_migration', array( $this, 'ajax_respond_initiate_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_chunk', array( $this, 'ajax_process_chunk' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_prepare_table_migration', array( $this, 'ajax_prepare_table_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_finalize_backup', array( $this, 'ajax_finalize_backup' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_pull_request', array( $this, 'ajax_process_pull_request' ) );

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
			$absolute_path = rtrim( substr( ABSPATH, 0, -strlen( $difference ) ), '\\/' );
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

		$this->plugin_base = 'tools.php?page=wp-migrate-db-pro';

		// this is how many DB rows are processed at a time, allow devs to change this value
		$this->rows_per_segment = apply_filters( 'wpmdb_rows_per_segment', $this->rows_per_segment );

		// testing only - if uncommented, will always check for plugin updates
		//delete_site_transient( 'update_plugins' );
		//delete_site_transient( 'wpmdb_upgrade_data' );
		//delete_site_transient( 'wpmdb_licence_response' );
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
		$licence = ( empty( $_POST['licence_key'] ) ? $this->settings['licence'] : $_POST['licence_key'] );
		$response = $this->check_licence( $licence );
		echo $response;
		exit;
	}

	function ajax_activate_licence() {
		$args = array(
			'licence_key' => $_POST['licence_key'],
			'site_url' => site_url( '', 'http' )
		);

		$response = $this->dbrains_api_request( 'activate_licence', $args );

		echo $response;

		$response = json_decode( $response, true );

		if ( $response && !isset( $response['errors'] ) ) {
			$this->settings['licence'] = $_POST['licence_key'];
			$this->settings['licence_email'] = $response['email'];
			update_site_option( 'wpmdb_settings', $this->settings );
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
		$url = $this->get_dbrains_api_url( $request, $args );
		$response = wp_remote_get( $url, array(
			'timeout'  => 30,
			'blocking'  => true
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

	function get_db_object(){
		$db = new mysqli( DB_HOST, DB_USER, DB_PASSWORD, DB_NAME );
		$db->set_charset( DB_CHARSET );
		return $db;
	}

	function remote_post( $url, $data, $scope, $args = array() ) {
		set_time_limit( 0 );

		$args = wp_parse_args( $args, array(
			'timeout'  => 60 * 20,
			'blocking'  => true
		) );

		$args['method'] = 'POST';
		$args['body'] = $data;

		$response = wp_remote_post( $url, $args );

		if ( is_wp_error( $response ) ) {
			if( isset( $response->errors['http_request_failed'][0] ) && strstr( $response->errors['http_request_failed'][0], 'timed out' ) ) {
				$this->error = 'The connection to the remote server has timed out, the changes have been successfully rolled back. (#134 - scope: ' . $scope . ')';
			}
			else {
				$this->error = 'The connection failed, please try connecting over http instead of https. (#121 - scope: ' . $scope . ')';
			}
			$this->log_error( $this->error, $response );
			return false;
		}
		elseif ( (int) $response['response']['code'] < 200 || (int) $response['response']['code'] > 399 ) {
			$this->error = 'Unable to connect to the remote server, please check the connection details (#129 - scope: ' . $scope . ')';
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
		if( $additional_error_var !== false ){
			$error .= print_r( $additional_error_var, true ) . "\n\n";
		}
		file_put_contents( $this->plugin_dir_path . 'debug.log', $error, FILE_APPEND );
	}

	function get_sql_dump_file_name( $type = 'migrate' ) {
		return $this->upload_dir . DS . sanitize_title_with_dashes( DB_NAME ) . '-' . $type . '-' . $_POST['datetime'] . '.sql';
	}

	function parse_migration_form_data( $data ) {
		parse_str( $data, $form_data );
		$form_data = array_intersect_key( $form_data, array_flip( $this->accepted_fields ) );
		unset( $form_data['replace_old'][0] );
		unset( $form_data['replace_new'][0] );
		return $form_data;
	}

	function plugin_action_links( $links ) {
		$link = sprintf( '<a href="%s">%s</a>', $this->plugin_base, __( 'Settings', 'wp-migrate-db-pro' ) );
		array_unshift( $links, $link );
		return $links;
	}

	function ajax_clear_log() {
		if( file_exists( $this->plugin_dir_path . 'debug.log' ) ) {
			file_put_contents( $this->plugin_dir_path . 'debug.log', '' );
		}
		exit;
	}

	function ajax_get_log() {
		$this->output_diagnostic_info();
		$this->output_log_file();
		exit;
	}

	function output_log_file() {
		if( file_exists( $this->plugin_dir_path . 'debug.log' ) ) {
			echo file_get_contents( $this->plugin_dir_path . 'debug.log' );
		}
	}

	function output_diagnostic_info() {
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

		_e( 'max_allowed_packet_size', 'wp-app-store' ); echo ': ';
		echo $this->get_max_allowed_packet_size();
		echo "\r\n";
		
		_e( 'WP Memory Limit', 'wp-app-store' ); echo ': ';
		echo WP_MEMORY_LIMIT;
		echo "\r\n";

		_e( 'WPMDB Bottleneck', 'wp-app-store' ); echo ': ';
		echo $this->get_bottleneck();
		echo "\r\n";
		
		_e( 'Debug Mode', 'wp-app-store' ); echo ': ';
		if ( defined('WP_DEBUG') && WP_DEBUG ) { echo 'Yes'; } else { echo 'No'; }
		echo "\r\n";
		
		_e( 'WP Max Upload Size', 'wp-app-store' ); echo ': ';
		echo wp_convert_bytes_to_hr( wp_max_upload_size() );
		echo "\r\n";
		
		_e( 'PHP Post Max Size', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'ini_get' ) ) echo ini_get('post_max_size');
		echo "\r\n";
		
		_e( 'PHP Time Limit', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'ini_get' ) ) echo ini_get('max_execution_time');
		echo "\r\n";

		_e( 'fsockopen', 'wp-app-store' ); echo ': ';
		if ( function_exists( 'fsockopen' ) ) {
			_e('Enabled', 'wp-app-store' );
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

		if ( is_multisite() )
			$active_plugins = array_merge( $active_plugins, get_site_option( 'active_sitewide_plugins', array() ) );

		foreach ( $active_plugins as $plugin ) {
			$plugin_data = @get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin );
			if ( empty( $plugin_data['Name'] ) ) continue;
			echo $plugin_data['Name'] . ' (v' . $plugin_data['Version'] . ') ' . __( 'by', 'wp-app-store' ) . ' ' . $plugin_data['AuthorName'] . "\r\n";
		}

		echo "\r\n";
	}
	
	// After table migration, delete old tables and rename new tables removing the temporarily prefix
	function ajax_finalize_backup() {
		global $wpdb;
		// This particular function can be accessed by non logged in users AND logged in users
		if ( ! current_user_can( 'manage_options' ) ) {
			if ( ! $this->verify_signature( $_POST, $this->settings['key'] ) ) {
				echo $this->invalid_content_verification_error . ' (#123)';
				exit;
			}
		}

		if ( $_POST['intent'] == 'pull' ) {
			$temp_tables = $this->get_tables( 'temp' );
			$sql = '';
			foreach ( $temp_tables as $table ) {
				$sql .= 'DROP TABLE IF EXISTS ' . $this->backquote( substr( $table, strlen( $this->temp_prefix ) ) ) . ';';
				$sql .= "\n";
				$sql .= 'RENAME TABLE ' . $this->backquote( $table )  . ' TO ' . $this->backquote( substr( $table, strlen( $this->temp_prefix ) ) ) . ';';
				$sql .= "\n";
			}
			// reset the wpmdb options after everything has migrated
			$sql .= 'UPDATE `' . $wpdb->prefix . 'options` SET `option_value` =\'' . serialize( $this->settings ) . '\' WHERE `option_name` = \'wpmdb_settings\';';
			$this->process_chunk( $sql );
		}
		else {
			$data = $_POST;
			$data['intent'] = 'pull';
			$data['sig'] = $this->create_signature( $data, $data['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$this->remote_post( $ajax_url, $data, __FUNCTION__ );
			$this->display_errors();
		}
		exit;
	}

	function ajax_process_chunk() {
		// We need to strip before signature verification, otherwise verification will fail
		$_POST['chunk'] = stripslashes( $_POST['chunk'] );

		if ( !$this->verify_signature( $_POST, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error . ' (#130)';
			exit;
		}

		$this->process_chunk( $_POST['chunk'] );
		exit;
	}

	function process_chunk( $chunk ) {
		// prepare db
		set_time_limit( 0 );
		$db = $this->get_db_object();
		$i = 1;
		if ( $db->multi_query( $chunk ) ) { 
			do {
				$i++;
			} while ( $db->next_result() ); 
		}
		if ( $db->errno ) {
			echo "Error executing statement $i in the following batch of queries.\n";
			echo $chunk . "\n";
			echo $db->error;
		}
		$db->close();
	}

	function create_signature( $data, $key ) {
		if ( isset( $data['sig'] ) ) {
			unset( $data['sig'] );
		}
		$flat_data = implode( '', $data );
		return base64_encode( hash_hmac( 'sha1', $flat_data, $key, true ) );
	}

	function verify_signature( $data, $key ) {
		$temp = $data;
		$computed_signature = $this->create_signature( $temp, $key );
		return $computed_signature === $data['sig'];
	}

	// This the first AJAX end point when a table is about to be migrated / backed up
	function ajax_prepare_table_migration() {
		// Check that the user is valid and is allowed to perform a table migration
		if ( ! current_user_can( 'manage_options' ) ) {
			if ( ! $this->verify_signature( $_POST, $this->settings['key'] ) ) {
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
				$data['sig'] = $this->create_signature( $data, $data['key'] );
				$this->remote_post( $ajax_url, $data, __FUNCTION__ );
				$this->display_errors();
			}
			else {
				$sql_dump_file_name = $this->get_sql_dump_file_name( 'backup' );
				if ( isset( $this->form_data['gzip_file'] ) ) {
					unset( $this->form_data['gzip_file'] );
				}
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

		// Pull and push need to be handled differently for obvious reason, trigger different code depending on the migration intent (push or pull)
		if ( $_POST['intent'] == 'push' || $_POST['intent'] == 'savefile' ) {
			if ( isset( $_POST['bottleneck'] ) ) {
				$this->maximum_chunk_number = floor( $_POST['bottleneck'] / $this->max_insert_string_len );
			}
			if ( $_POST['intent'] == 'push' ) {
				$this->remote_key = $_POST['key'];
				$this->remote_url = $_POST['url'];
			}
			$sql_dump_file_name = $this->get_sql_dump_file_name();

			if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) {
				$sql_dump_file_name .= '.gz';
			}

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
			$data['pull_limit'] = $this->get_max_allowed_packet_size();
			if ( isset( $data['sig'] ) ) {
				unset( $data['sig'] );
			}
			$ajax_url = trailingslashit( $data['url'] ) . 'wp-admin/admin-ajax.php';
			$row_tracker = '';
			$data['sig'] = $this->create_signature( $data, $data['key'] );

			while ( $row_tracker != -1 ) {
				$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
				$this->display_errors();
				if ( is_serialized( $response ) ) {
					$response = unserialize( $response );
				}
				else {
					echo $response;
					break;
				}
				$row_tracker = $response['row_tracker'];
				$chunk = $response['chunk'];
				if ( ! empty( $chunk ) ) {
					$this->process_chunk( $chunk );
				}
				$data['current_row'] = ( empty( $response['row_tracker'] ) ? 0 : $response['row_tracker'] );
				$data['sig'] = $this->create_signature( $data, $data['key'] );
			}
		}
		exit;
	}

	// Occurs right before the first table is migrated / backed up during the migration process
	// Does a quick check to make sure the verification string is valid and also opens / creates files for writing to (if required)
	function ajax_initiate_migration() {
		$datetime = date('YmdHis');
		if ( $_POST['intent'] == 'savefile' ) {

			$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );

			$return = array(
				'code' => 200,
				'message' => 'OK',
				'body'  => json_encode( array( 'error' => 0 ) ),
			);

			$_POST['datetime'] = $datetime;
			$sql_dump_file_name = $this->get_sql_dump_file_name();

			if ( $this->gzip() && isset( $this->form_data['gzip_file'] ) ) {
				$sql_dump_file_name .= '.gz';
			}
			$this->fp = $this->open( $sql_dump_file_name );
			$this->db_backup_header();
			$this->close( $this->fp );
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
					'body' => $response
				);
			}

		}

		$return['datetime'] = $datetime;
		echo json_encode( $return );

		exit;
	}

	// End point for the above AJAX call, ensures that the verification string is valid before continuing with the migration
	function ajax_respond_initiate_migration() {
		$return = array();
		if ( $this->verify_signature( $_POST, $this->settings['key'] ) ) {
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
		echo json_encode( $return );

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
		update_site_option( 'wpmdb_settings', $this->settings );
		echo count( $this->settings['profiles'] ) - 1;
		exit;
	}

	function ajax_save_setting() {
		$this->settings[$_POST['setting']] = ( $_POST['checked'] == 'false' ? false : true );
		update_site_option( 'wpmdb_settings', $this->settings );
		exit;
	}

	function ajax_delete_migration_profile() {
		$key = $_POST['profile_id'];
		if ( isset( $this->settings['profiles'][$key] ) ) {
			unset( $this->settings['profiles'][$key] );
			update_site_option( 'wpmdb_settings', $this->settings );
		}
		else {
			echo '-1';
		}
		exit;
	}

	function ajax_reset_api_key() {
		$this->settings['key'] = $this->generate_key();
		update_site_option( 'wpmdb_settings', $this->settings );
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
		$response = $this->remote_post( $ajax_url, $data, __FUNCTION__, array( 'timeout' => 5 ) );

		$return = $response;
		if ( false === $response ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $this->error . ' <a class="try-again js-action-link" href="#">Try again?</a>' );
		}

		$response = json_decode( $response, true );

		if ( isset( $response['error'] ) && $response['error'] == 1 ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $response['message'] );
		}

		echo json_encode( $return );

		exit;
	}

	// AJAX end point for the above AJAX call, returns table information, absolute file path, table prefix, etc
	function ajax_establish_remote_connection() {
		global $wpdb;
		$return = array();
		if ( $this->verify_signature( $_POST, $this->settings['key'] ) ) {
			if ( isset( $this->settings['allow_' . $_POST['intent']] ) && $this->settings['allow_' . $_POST['intent']] == true ) {
				$return['tables'] = $this->get_tables();
				$return['table_sizes'] = $this->get_table_sizes();
				$return['path'] = $this->absolute_root_file_path;
				$return['url'] = home_url();
				$return['prefix'] = $wpdb->prefix;
				$return['bottleneck'] = $this->get_bottleneck();
				$return['error'] = 0;
			}
			else {
				$return['error'] = 1;
				$return['message'] = 'The connection succeeded but the remote site is configured to reject ' . $_POST['intent'] . ' connections. You can change this in the "settings" tab on the remote site. (#122) <a href="#" class="try-again js-action-link">Try again?</a>';
			}
		}
		else {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#120) <a href="#" class="try-again js-action-link">Try again?</a>';
		}
		echo json_encode( $return );

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

	// Get only the table beginning with our DB prefix or emporary prefix, also skip views
	function get_tables( $scope = 'regular' ) {
		global $wpdb;
		$prefix = ( $scope == 'temp' ? $this->temp_prefix : $wpdb->prefix );
		$tables = $wpdb->get_results( 'SHOW FULL TABLES', ARRAY_N );
		foreach ( $tables as $table ) {
			if ( 0 !== strpos( $table[0], $prefix ) || $table[1] == 'VIEW' ) {
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

	function get_table_sizes() {
		global $wpdb;
		$results = $wpdb->get_results( $wpdb->prepare(
				'SELECT TABLE_NAME AS "table",
							ROUND((data_length + index_length)/1024,0) AS "size"
							FROM information_schema.TABLES
							WHERE information_schema.TABLES.table_schema="%s"', DB_NAME
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

	function get_max_allowed_packet_size() {
		global $wpdb;
		$size = $wpdb->get_var( 'select VARIABLE_VALUE from information_schema.GLOBAL_VARIABLES where VARIABLE_NAME = \'max_allowed_packet\'' );
		return $size;
	}

	function get_bottleneck() {
		return min( $this->get_post_max_size(), $this->get_max_allowed_packet_size() );
	}

	function ajax_process_pull_request() {
		if ( ! $this->verify_signature( $_POST, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error . ' (#124)';
			exit;
		}
		$this->maximum_chunk_number = floor( $_POST['pull_limit'] / $this->max_insert_string_len );
		$this->backup_table( $_POST['table'] );
		$this->display_errors();
		exit;
	}

	function options_page() {
		?>

		<div class="wrap wpmdb">

			<div id="icon-tools" class="icon32"><br /></div><h2>Migrate DB Pro</h2>

			<?php
			if ( $msg = $this->get_new_beta_version_msg() ) {
				echo '<div class="updated" style="margin: 10px 0 0 0;"><p>', $msg, '</p></div>';
			}
			?>

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
		$new = str_replace( $search, $replace, $subject, $count );
		return $new;
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
		set_time_limit( 0 );

		if ( empty( $this->form_data ) ) {
			$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		}

		$temp_prefix = $this->temp_prefix;

		$table_structure = $wpdb->get_results( "DESCRIBE $table" );
		if ( ! $table_structure ) {
			$this->error = 'Failed to retrieve table structure, please ensure your database is online. (#125)';
			return false;
		}

		$current_row = -1;
		if ( isset( $_POST['current_row'] ) ) {
			$current_row = $_POST['current_row'];
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

			$create_table = $wpdb->get_results( "SHOW CREATE TABLE $table", ARRAY_N );
			if ( false === $create_table ) {
				$this->error = 'Failed to generate the create table query, please ensure your database is online. (#126)';
				return false;
			}

			if ( $this->form_data['action'] != 'savefile' && $_POST['stage'] != 'backup' ) {
				$create_table[0][1] = str_replace( 'CREATE TABLE `', 'CREATE TABLE `' . $temp_prefix, $create_table[0][1] );
			}

			$this->stow( $create_table[0][1] . ' ;' );

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

		foreach( $table_structure as $col ){
			$field_set[] = $this->backquote( $col->Field );
		}

		$fields = implode( ', ', $field_set );

		$insert_buffer = $insert_query_template = "INSERT INTO " . $this->backquote( $table_name ) . " ( " . $fields . ") VALUES\n";

		do {
			$where = '';
			if ( isset( $this->form_data['exclude_spam'] ) && $wpdb->comments == $table ) {
				$where = ' WHERE comment_approved != "spam"';
			} elseif ( isset( $this->form_data['exclude_revisions'] ) && $wpdb->posts == $table ) {
				$where = ' WHERE post_type != "revision"';
			}

			$table_data = $wpdb->get_results( "SELECT * FROM $table $where LIMIT {$row_start}, {$row_inc}" );

			if ( $table_data ) {
				foreach ( $table_data as $row ) {
					++$this->row_tracker;
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
								if ( is_serialized( $value ) && false !== ( $data = @unserialize( $value ) ) ) {
									if ( is_array( $data ) ) {
										if ( $_POST['stage'] != 'backup' ) {
											array_walk_recursive( $data, array( $this, 'replace_array_values' ) );
										}
									}
									elseif ( is_string( $data ) ) {
										if ( $_POST['stage'] != 'backup' ) {
											$data = $this->apply_replaces( $data, true );
										}
									}

									$value = serialize( $data );
								}
								// Skip replacing GUID if the option is set
								elseif ( 'guid' != $key || ( isset( $this->form_data['replace_guids'] ) && $wpdb->posts == $table ) ) {
									if ( $_POST['stage'] != 'backup' ) {
										$value = $this->apply_replaces( $value );
									}
								}

								$values[] = "'" . str_replace( $search, $replace, $this->sql_addslashes( $value ) ) . "'";
							}
						}
					}

					$insert_line = '(' . implode( ', ', $values ) . '),';
					$insert_line .= "\n";

					if ( ( $query_size + strlen( $insert_line ) ) > $this->max_insert_string_len && $insert_buffer != $insert_query_template ) {
						$insert_buffer = rtrim( $insert_buffer, "\n," );
						$insert_buffer .= " ;\n";
						$this->buffer_full = true;
						$this->stow( $insert_buffer );
						$insert_buffer = $insert_query_template;
						$query_size = 0;
					}

					$this->buffer_full = false;

					$insert_buffer .= $insert_line;
					$query_size += strlen( $insert_line );

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
		}

		// required for pull, tells the remote machine to stop sending pull requests
		if ( isset( $_POST['intent'] ) && $_POST['intent'] == 'pull' && $_POST['stage'] != 'backup' ) {
			$this->row_tracker = -1;
			$this->transfer_chunk();
		}

		// required for push, sends any remaining data left over in the current_chunk buffer to the remote machine
		if ( $this->form_data['action'] != 'savefile' && ! empty( $this->current_chunk ) && $_POST['stage'] != 'backup' ) {
			$this->transfer_chunk();
		}

	} // end backup_table()

	function replace_array_values( &$value, $key ) {
		if ( !is_string( $value ) ) return;
		$value = $this->apply_replaces( $value, true );
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
		else {
			$this->current_chunk .= $query_line;
			++$this->current_chunk_number;
			if ( $this->current_chunk_number == $this->maximum_chunk_number ) {
				$this->transfer_chunk();
			}
		}
	}

	// Called in the $this->stow function once our chunk buffer is full, will transfer the SQL to the remote server for importing
	function transfer_chunk() {
		if ( $_POST['intent'] == 'pull' ) {
			if ( $this->buffer_full === true ) {
				--$this->row_tracker;
			}
			$return = array(
				'row_tracker' => $this->row_tracker,
				'chunk' => $this->current_chunk,
			);
			echo serialize( $return );
			exit;
		}

		$data = array(
			'action'  => 'wpmdb_process_chunk',
			'chunk'  => $this->current_chunk,
			'table' => $_POST['table']
		);
		
		$data['sig'] = $this->create_signature( $data, $_POST['key'] );

		$ajax_url = trailingslashit( $this->remote_url ) . 'wp-admin/admin-ajax.php';
		$this->remote_post( $ajax_url, $data, __FUNCTION__ );
		$this->display_errors();

		// reset our chunk values back to the default
		$this->current_chunk_number = 0;
		$this->current_chunk = '';
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

	function admin_menu() {
		if ( function_exists( 'add_management_page' ) ) {
			$hook_suffix = add_management_page( 'Migrate DB Pro', 'Migrate DB Pro', 'update_core', 'wp-migrate-db-pro', array( $this, 'options_page' ) );
		}

		add_action( 'load-' . $hook_suffix , array( $this, 'load_assets' ) );
	}

	function load_assets() {
		if ( isset( $_GET['download'] ) && $_GET['download'] ) {
			$this->download_file();
		}

		$src = plugins_url( 'asset/css/styles.css', dirname( __FILE__ ) );
		wp_enqueue_style( 'wp-migrate-db-pro-styles', $src );
		$src = plugins_url( 'asset/js/script.js', dirname( __FILE__ ) );
		wp_enqueue_script( 'wp-migrate-db-pro-script', $src, array( 'jquery' ), false, true );

		// PressTrends
		$this->presstrends();
	}

	function download_file() {
		// dont need to check for user permissions as our 'add_management_page' already takes care of this
		set_time_limit( 0 );

		if ( ! is_numeric( $_GET['download'] ) ){
			exit;
		} 

		$filename = sanitize_title_with_dashes( DB_NAME ) . '-migrate-' . $_GET['download'] . '.sql';
		$diskfile = $this->upload_dir . DS . $filename ;

		if ( isset( $_GET['gzip'] ) ) {
			$diskfile .= '.gz';
			$filename .= '.gz';
		}

		if ( file_exists( $diskfile ) ) {
			header( 'Content-Description: File Transfer' );
			header( 'Content-Type: application/octet-stream' );
			header( 'Content-Length: ' . filesize( $diskfile ) );
			header( 'Content-Disposition: attachment; filename=' . $filename );
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
		?>
		<script type='text/javascript'>
			var wpmdb_connection_info = '<?php echo json_encode( array( site_url( '', 'https' ), $this->settings['key'] ) ); ?>';
			var wpmdb_this_url = '<?php echo addslashes( home_url() ) ?>';
			var wpmdb_this_path = '<?php echo addslashes( $this->absolute_root_file_path ); ?>';
			var wpmdb_this_tables = '<?php echo json_encode( $this->get_tables() ); ?>';
			var wpmdb_this_table_sizes = '<?php echo json_encode( $this->get_table_sizes() ); ?>';
			var wpmdb_this_upload_url = '<?php echo addslashes( trailingslashit( $this->upload_url ) ); ?>';
			var wpmdb_this_website_name = '<?php echo sanitize_title_with_dashes( DB_NAME ); ?>';
			var wpmdb_this_download_url = '<?php echo admin_url( 'tools.php?page=wp-migrate-db-pro&download=' ); ?>';
			var wpmdb_this_prefix = '<?php echo $table_prefix; ?>';
			var wpmdb_licence = '<?php echo $this->settings['licence']; ?>';
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

	function get_new_beta_version_msg() {
		$latest = $this->get_beta_version_data();
		if ( !isset( $latest['version'] ) || !isset( $latest['msg'] ) ) return false;

		$plugin = get_plugin_data( $this->plugin_file_path, false, false );

		if ( !isset( $plugin['Version'] ) ) return false;

		if ( version_compare( $plugin['Version'], $latest['version'], '>=' ) ) {
			return false;
		}

		return $latest['msg'];
	}

	function get_beta_version_data() {
		$key = 'wpmdb_beta_notice';
		$info = get_site_transient( $key );
		if ( $info ) return $info;

		$url = 'http://cdn.deliciousbrains.com/beta/data.json';
		$data = wp_remote_get( $url, array( 'timeout' => 30 ) );

		if ( !is_wp_error( $data ) && 200 == $data['response']['code'] ) {
			if ( $info = json_decode( $data['body'], true ) ) {
				set_site_transient( $key, $info, $this->transient_timeout );
				return $info;
			}
		}

		return false;
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

	function is_licence_expired( $skip_transient_check = false ) {
		if( empty( $this->settings['licence'] ) ) {
			$settings_link = sprintf( '<a href="%s">%s</a>', $this->plugin_base . '#settings', __( 'Settings', 'wp-migrate-db-pro' ) );
			$message = 'To finish activating WP Migrate DB Pro, please go to ' . $settings_link . ' and enter your licence key. 
				If you don\'t have a licence key, you may 
				<a href="http://deliciousbrains.com/wp-migrate-db-pro/pricing/">purchase one</a>.';
			return array( 'errors' => array( 'no_licence' => $message ) );
		}

		if( ! $skip_transient_check ) {
			$trans = get_site_transient( 'wpmdb_licence_response' );
			if ( false !== $trans ) return json_decode( $trans, true );
		}
		
		return json_decode( $this->check_licence( $this->settings['licence'] ), true );
	}

	/*
	* Shows a message below the plugin on the plugins page when:
	*	1. the license hasn't been activated
	*	2. when there's an update available but the license is expired
	* 
	* TODO: Implement "Check my license again" link
	*/
	function plugin_row() {
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

		if ( !$new_version && !empty( $this->settings['licence'] ) ) {
			return;
		}

		if( empty( $this->settings['licence'] ) ) {
			$settings_link = sprintf( '<a href="%s">%s</a>', $this->plugin_base . '#settings', __( 'Settings', 'wp-migrate-db-pro' ) );
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
		$query_args = array( 
			'request'		=> 'download',
			'licence_key'	=> $this->settings['licence'],
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
