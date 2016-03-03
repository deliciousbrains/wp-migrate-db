<?php
class WPMDBPro extends WPMDBPro_Base {
	protected $fp;
	protected $absolute_root_file_path;
	protected $form_defaults;
	protected $accepted_fields;
	protected $default_profile;
	protected $maximum_chunk_size;
	protected $current_chunk = '';
	protected $connection_details;
	protected $remote_url;
	protected $remote_key;
	protected $form_data;
	protected $max_insert_string_len;
	protected $row_tracker;
	protected $rows_per_segment = 100;
	protected $create_alter_table_query;
	protected $alter_table_name;
	protected $session_salt;
	protected $primary_keys;

	function __construct( $plugin_file_path ) {
		parent::__construct( $plugin_file_path );

		$this->plugin_slug = 'wp-migrate-db-pro';
		$this->plugin_version = $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'];

		$this->max_insert_string_len = 50000; // 50000 is the default as defined by phphmyadmin

		$default_settings = array(
			'key'  => $this->generate_key(),
			'allow_pull' => false,
			'allow_push' => false,
			'profiles'  => array(),
			'licence'  => '',
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

		// internal AJAX handlers
		add_action( 'wp_ajax_wpmdb_verify_connection_to_remote_site', array( $this, 'ajax_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_wpmdb_reset_api_key', array( $this, 'ajax_reset_api_key' ) );
		add_action( 'wp_ajax_wpmdb_delete_migration_profile', array( $this, 'ajax_delete_migration_profile' ) );
		add_action( 'wp_ajax_wpmdb_save_setting', array( $this, 'ajax_save_setting' ) );
		add_action( 'wp_ajax_wpmdb_save_profile', array( $this, 'ajax_save_profile' ) );
		add_action( 'wp_ajax_wpmdb_initiate_migration', array( $this, 'ajax_initiate_migration' ) );
		add_action( 'wp_ajax_wpmdb_migrate_table', array( $this, 'ajax_migrate_table' ) );
		add_action( 'wp_ajax_wpmdb_finalize_migration', array( $this, 'ajax_finalize_migration' ) );
		add_action( 'wp_ajax_wpmdb_clear_log', array( $this, 'ajax_clear_log' ) );
		add_action( 'wp_ajax_wpmdb_get_log', array( $this, 'ajax_get_log' ) );
		add_action( 'wp_ajax_wpmdb_activate_licence', array( $this, 'ajax_activate_licence' ) );
		add_action( 'wp_ajax_wpmdb_check_licence', array( $this, 'ajax_check_licence' ) );
		add_action( 'wp_ajax_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );
		add_action( 'wp_ajax_wpmdb_update_max_request_size', array( $this, 'ajax_update_max_request_size' ) );

		// external AJAX handlers
		add_action( 'wp_ajax_nopriv_wpmdb_verify_connection_to_remote_site', array( $this, 'respond_to_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_initiate_migration', array( $this, 'respond_to_remote_initiate_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_chunk', array( $this, 'ajax_process_chunk' ) ); 
		add_action( 'wp_ajax_nopriv_wpmdb_process_pull_request', array( $this, 'respond_to_process_pull_request' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_backup_remote_table', array( $this, 'respond_to_backup_remote_table' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_finalize_migration', array( $this, 'respond_to_remote_finalize_migration' ) );

		// Take over the update check
		add_filter( 'site_transient_update_plugins', array( $this, 'site_transient_update_plugins' ) );

		// Add some custom JS into the WP admin pages
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_plugin_update_script' ) );

		// Add some custom CSS into the WP admin pages
		add_action( 'admin_head-plugins.php', array( $this, 'add_plugin_update_styles' ) );

		// Hook into the plugin install process, inject addon download url
		add_action( 'plugins_api', array( $this, 'inject_addon_install_resource' ), 10, 3 );

		// Clear update transients when the user clicks the "Check Again" button from the update screen
		add_action( 'current_screen', array( $this, 'check_again_clear_transients' ) );

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
			'save_migration_profile',
			'save_migration_profile_option',
			'create_new_profile',
			'create_backup',
			'remove_backup',
			'keep_active_plugins',
			'post_type_migrate_option',
			'select_post_types',
			'backup_option',
			'select_backup',
		);

		$this->default_profile = array(
			'action' => 'savefile',
			'save_computer' => '1',
			'gzip_file' => '1',
			'table_migrate_option' => 'migrate_only_with_prefix',
			'replace_guids' => '1',
			'default_profile' => true,
			'name' => '',
			'select_tables' => array(),
			'post_type_migrate_option' => 'migrate_all_post_types',
			'select_post_types' => array(),
			'backup_option' => 'backup_only_with_prefix'
		);

		$this->checkbox_options = array(
			'save_computer' => '0',
			'gzip_file' => '0',
			'replace_guids' => '0',
			'exclude_spam' => '0',
			'keep_active_plugins' => '0',
			'create_backup' => '0'
		);

		if ( is_multisite() ) {
			add_action( 'network_admin_menu', array( $this, 'network_admin_menu' ) );
		}
		else {
			add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		}

		add_filter( 'admin_body_class', array( $this, 'admin_body_class' ) );

		// this is how many DB rows are processed at a time, allow devs to change this value
		$this->rows_per_segment = apply_filters( 'wpmdb_rows_per_segment', $this->rows_per_segment );

		if ( is_multisite() ) {
			add_action( 'network_admin_menu', array( $this, 'network_admin_menu' ) );
			$this->plugin_base = 'settings.php?page=wp-migrate-db-pro';
		}
		else {
			add_action( 'admin_menu', array( $this, 'admin_menu' ) );
			$this->plugin_base = 'tools.php?page=wp-migrate-db-pro';
		}

		// testing only - if uncommented, will always check for plugin updates
		//delete_site_transient( 'update_plugins' );
		//delete_site_transient( 'wpmdb_upgrade_data' );
		//delete_site_transient( 'wpmdb_licence_response' );
	}

	function check_again_clear_transients( $current_screen ) {
		if( ! isset( $current_screen->id ) || strpos( $current_screen->id, 'update-core' ) === false || ! isset( $_GET['force-check'] ) ) return;
		delete_site_transient( 'wpmdb_upgrade_data' );
		delete_site_transient( 'update_plugins' );
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

			if( false === @mkdir( $upload_dir['basedir'] . DS . $upload_dir_name, 0755 ) ) {
				return $upload_info[$type];
			}

			$filename = $upload_dir['basedir'] . DS . $upload_dir_name . DS . 'index.php';
			if( false === @file_put_contents( $filename, "<?php\r\n// Silence is golden\r\n?>" ) ) {
				return $upload_info[$type];
			}
		}

		$upload_info['path'] .= DS . $upload_dir_name;
		$upload_info['url'] .= '/' . $upload_dir_name;

		return $upload_info[$type];
	}

	function ajax_update_max_request_size() {
		$this->check_ajax_referer( 'update-max-request-size' );
		$this->settings['max_request'] = (int) $_POST['max_request_size'] * 1024;
		update_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax();
		return $result;
	}

	function ajax_check_licence() {
		$this->check_ajax_referer( 'check-licence' );
		$licence = ( empty( $_POST['licence'] ) ? $this->get_licence_key() : $_POST['licence'] );
		$response = $this->check_licence( $licence );
		$decoded_response = json_decode( $response, ARRAY_A );

		ob_start();

		// Test out what the addons tab would look like with a full page of addons
		/*
		$first_addon = key( $decoded_response['addon_list'] );
		for( $i = 0; $i < 12; $i++ ) { 
			$list_of_addons[$first_addon . $i] = $decoded_response['addon_list'][$first_addon];
		}
		$decoded_response['addon_list'] = $list_of_addons;
		*/

		$addons_available = ( $decoded_response['addons_available'] == '1' );
		if( ! $addons_available ) { ?>
			<div class="inline-message warning"><strong>Addons Unavailable</strong> &ndash; Addons are not included with 
			the Personal license. Visit <a href="https://deliciousbrains.com/my-account/" target="_blank">My&nbsp;Account</a>
			to upgrade in just a few clicks.</div>
			<?php
		}

		// Save the addons list for use when installing
		// Don't really need to expire it ever, but let's clean it up after 60 days
		set_site_transient( 'wpmdb_addons', $decoded_response['addon_list'], HOUR_IN_SECONDS * 24 * 60 );

		foreach( $decoded_response['addon_list'] as $key => $addon ) {
			$plugin_file = sprintf( '%1$s/%1$s.php', $key );
			$plugin_ids = array_keys( get_plugins() );

			if ( in_array( $plugin_file, $plugin_ids ) ) {
				$actions = '<span class="status">Installed';
				if ( is_plugin_active( $plugin_file ) ) {
					$actions .= ' &amp; Activated</span>';
				}				
				else {
					$activate_url = wp_nonce_url( network_admin_url( 'plugins.php?action=activate&amp;plugin=' . $plugin_file ), 'activate-plugin_'  . $plugin_file );
					$actions .= sprintf( '</span> <a class="action" href="%s">Activate</a>', $activate_url );
				}
			}
			else {
				$install_url = wp_nonce_url( network_admin_url( 'update.php?action=install-plugin&plugin=' . $key ), 'install-plugin_' . $key );
				$actions = sprintf( '<a class="action" href="%s">Install</a>', $install_url );
			}
			$download_url = $this->get_plugin_update_download_url( $key );
			$actions .= sprintf( '<a class="action" href="%s">Download</a>', $download_url );
			?>
			<article class="addon <?php echo esc_attr( $key ); ?>">
				<div class="desc">
					<?php if ( $addons_available ) : ?>
					<div class="actions"><?php echo $actions; ?></div>
					<?php endif; ?>

					<h1><?php echo $addon['name']; ?></h1>
					<p><?php echo $addon['desc']; ?></p>
				</div>
			</article>
		<?php
		}
		$addon_content = ob_get_clean();
		$decoded_response['addon_content'] = $addon_content;
		$response = json_encode( $decoded_response );

		$result = $this->end_ajax( $response );
		return $result;
	}

	function ajax_activate_licence() {
		$this->check_ajax_referer( 'activate-licence' );
		$args = array(
			'licence_key' => $_POST['licence_key'],
			'site_url' => site_url( '', 'http' )
		);

		if( $this->is_licence_constant() ) {
			$args['licence_key'] = $this->get_licence_key();
		}

		$response = $this->dbrains_api_request( 'activate_licence', $args );
		$response = json_decode( $response, true );

		if ( ! isset( $response['errors'] ) ) {
			if ( !$this->is_licence_constant() ) {
				$this->settings['licence'] = $_POST['licence_key'];
			}
			update_option( 'wpmdb_settings', $this->settings );
			$response['masked_licence'] = $this->get_formatted_masked_licence();
		}

		$result = $this->end_ajax( json_encode( $response ) );
		return $result;
	}

	function is_json( $string, $strict = false ) {
		$json = @json_decode( $string, true );
		if( $strict == true && ! is_array( $json ) ) return false;
		return ! ( $json == NULL || $json == false );
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
		$this->accepted_fields = apply_filters( 'wpmdb_accepted_profile_fields', $this->accepted_fields );
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
		$this->check_ajax_referer( 'clear-log' );
		delete_option( 'wpmdb_error_log' );
		$result = $this->end_ajax();
		return $result;
	}

	function ajax_get_log() {
		$this->check_ajax_referer( 'get-log' );
		ob_start();
		$this->output_diagnostic_info();
		$this->output_log_file();
		$return = ob_get_clean();
		$result = $this->end_ajax( $return );
		return $result;
	}

	function output_log_file() {
		$log = get_option( 'wpmdb_error_log' );
		if( $log ) {
			echo $log;
		}
	}

	function output_diagnostic_info() {
		global $table_prefix;
		global $wpdb;
		
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
		echo esc_html( empty( $wpdb->use_mysqli ) ? mysql_get_server_info() : mysqli_get_server_info( $wpdb->dbh ) );
		echo "\r\n";
		
		_e( 'ext/mysqli', 'wp-app-store' ); echo ': ';
		echo empty( $wpdb->use_mysqli ) ? 'no' : 'yes';
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
			$result = $this->end_ajax( $this->invalid_content_verification_error . ' (#138)' );
			return $result;
		}

		do_action( 'wpmdb_migration_complete', 'pull', $_POST['url'] );
		$result = $this->end_ajax();
		return $result;
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
	function ajax_finalize_migration() {
		$this->check_ajax_referer( 'finalize-migration' );
		global $wpdb;
		$return = '';
		if ( $_POST['intent'] == 'pull' ) {
			$return = $this->finalize_migration();
		}
		else {
			do_action( 'wpmdb_migration_complete', 'push', $_POST['url'] );
			$data = $_POST;
			if ( isset( $data['nonce'] ) ) {
				unset( $data['nonce'] );
			}
			$data['action'] = 'wpmdb_remote_finalize_migration';
			$data['intent'] = 'pull';
			$data['prefix'] = $wpdb->prefix;
			$data['type'] = 'push';
			$data['location'] = home_url();
			$data['temp_prefix'] = $this->temp_prefix;
			$data['sig'] = $this->create_signature( $data, $data['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			echo $response;
			$this->display_errors();
			$return = ob_get_clean();
		}
		$result = $this->end_ajax( $return );
		return $result;
	}

	function respond_to_remote_finalize_migration() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'form_data', 'prefix', 'type', 'location', 'tables', 'temp_prefix' ) );
		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$result = $this->end_ajax( $this->invalid_content_verification_error . ' (#123)' );
			return $result;
		}
		$return = $this->finalize_migration();
		$result = $this->end_ajax( $return );
		return $result;
	}

	function finalize_migration() {
		global $wpdb;

		$tables = explode( ',', $_POST['tables'] );
		$temp_tables = array();
		foreach( $tables as $table ) {
			$temp_prefix = stripslashes( $_POST['temp_prefix'] );
			$temp_tables[] = $temp_prefix . $table;
		}

		$sql = "SET FOREIGN_KEY_CHECKS=0;\n";

		$preserved_options = array( 'wpmdb_settings', 'wpmdb_error_log' );

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		if( isset( $this->form_data['keep_active_plugins'] ) ) {
			$preserved_options[] = 'active_plugins';
		}

		$preserved_options = apply_filters( 'wpmdb_preserved_options', $preserved_options );

		foreach ( $temp_tables as $table ) {
			$sql .= 'DROP TABLE IF EXISTS ' . $this->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
			$sql .= "\n";
			$sql .= 'RENAME TABLE ' . $this->backquote( $table )  . ' TO ' . $this->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
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

		$process_chunk_result = $this->process_chunk( $sql );
		if( true !== $process_chunk_result ) {
			$result = $this->end_ajax( $process_chunk_result );
			return $result;
		}

		$type = ( isset( $_POST['type'] ) ? 'push' : 'pull' );
		$location = ( isset( $_POST['location'] ) ? $_POST['location'] : $_POST['url'] );

		if( ! isset( $_POST['location'] ) ) {
			$data = array();
			$data['action'] = 'wpmdb_fire_migration_complete';
			$data['url'] = home_url();
			$data['sig'] = $this->create_signature( $data, $_POST['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			echo $response;
			$this->display_errors();
			$maybe_errors = trim( ob_get_clean() );
			if( false === empty( $maybe_errors ) ) {
				$result = $this->end_ajax( $maybe_errors );
				return $result;
			}
		}

		// flush rewrite rules to prevent 404s and other oddities
		flush_rewrite_rules( true ); // true = hard refresh, recreates the .htaccess file

		do_action( 'wpmdb_migration_complete', $type, $location );
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
			$result = $this->end_ajax( 'Could not upload the SQL to the server. (#135)' );
			return $result;
		}

		if ( false === ( $chunk = file_get_contents( $tmp_file_path ) ) ) {
			$result = $this->end_ajax( 'Could not read the SQL we\'ve uploaded to the server. (#136)' );
			return $result;
		}

		@unlink( $tmp_file_path );

		$filtered_post['chunk'] = $chunk;

		if ( !$this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$result = $this->end_ajax( $this->invalid_content_verification_error . ' (#130)' );
			return $result;
		}

		if ( $this->settings['allow_push'] != true ) {
			$result = $this->end_ajax( 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#133)' );
			return $result;
		}

		if( $gzip ) {
			$filtered_post['chunk'] = gzuncompress( $filtered_post['chunk'] );
		}

		$process_chunk_result = $this->process_chunk( $filtered_post['chunk'] );
		$result = $this->end_ajax( $process_chunk_result );
		return $result;
	}

	function process_chunk( $chunk ) {
		// prepare db
		global $wpdb;
		$this->set_time_limit();

		$queries = array_filter( explode( ";\n", $chunk ) );
		array_unshift( $queries, "SET sql_mode='NO_AUTO_VALUE_ON_ZERO';" );

		ob_start();
		$wpdb->show_errors();
		if( empty( $wpdb->charset ) ) {
			$charset = ( defined( 'DB_CHARSET' ) ? DB_CHARSET : 'utf8' );
			$wpdb->charset = $charset;
			$wpdb->set_charset( $wpdb->dbh, $wpdb->charset );
		}
		foreach( $queries as $query ) {
			if( false === $wpdb->query( $query ) ) {
				$return = ob_get_clean();
				$result = $this->end_ajax( $return );
				return $result;
			}
		}
		return true;
	}

	function ajax_migrate_table() {
		$this->check_ajax_referer( 'migrate-table' );
		global $wpdb;

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );

		$result = '';
		// checks if we're performing a backup, if so, continue with the backup and exit immediately after
		if ( $_POST['stage'] == 'backup' && $_POST['intent'] != 'savefile' ) {
			// if performing a push we need to backup the REMOTE machine's DB
			if ( $_POST['intent'] == 'push' ) {
				$data = $_POST;
				if ( isset( $data['nonce'] ) ) {
					unset( $data['nonce'] );
				}
				$data['action'] = 'wpmdb_backup_remote_table';
				$data['intent'] = 'pull';
				$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
				$data['primary_keys'] = stripslashes( $data['primary_keys'] );
				$data['sig'] = $this->create_signature( $data, $data['key'] );
				$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
				ob_start();
				$this->display_errors();
				$return = ob_get_clean();
				$return .= $response;
			}
			else {
				$return = $this->handle_table_backup();
			}
			$result = $this->end_ajax( $return );
			return $result;
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
			$result = $this->export_table( $_POST['table'] );
			if ( $_POST['intent'] == 'savefile' ) {
				$this->close( $this->fp );
			}
			ob_start();
			$this->display_errors();
			$maybe_errors = trim( ob_get_clean() );
			if( false === empty( $maybe_errors ) ) {
				$result = $this->end_ajax( $maybe_errors );
				return $result;
			}
			return $result;
		}
		else {
			$data = $_POST;
			if ( isset( $data['nonce'] ) ) {
				unset( $data['nonce'] );
			}
			$data['action'] = 'wpmdb_process_pull_request';
			$data['pull_limit'] = $this->get_sensible_pull_limit();
			if( is_multisite() ) {
				$data['path_current_site'] = $this->get_path_current_site();
				$data['domain_current_site'] = $this->get_domain_current_site();
			}
			$data['prefix'] = $wpdb->prefix;
			if ( isset( $data['sig'] ) ) {
				unset( $data['sig'] );
			}
			$ajax_url = trailingslashit( $data['url'] ) . 'wp-admin/admin-ajax.php';
			$data['primary_keys'] = stripslashes( $data['primary_keys'] );
			$data['sig'] = $this->create_signature( $data, $data['key'] );

			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			$this->display_errors();
			$maybe_errors = trim( ob_get_clean() );
			if( false === empty( $maybe_errors ) ) {
				$result = $this->end_ajax( $maybe_errors );
				return $result;
			}

			if( strpos( $response, ';' ) === false ) {
				$result = $this->end_ajax( $response );
				return $result;
			}

			// returned data is just a big string like this query;query;query;33
			// need to split this up into a chunk and row_tracker
			$row_information = trim( substr( strrchr( $response, "\n" ), 1 ) );
			$row_information = explode( ',', $row_information );
			$chunk = substr( $response, 0, strrpos( $response, ";\n" ) + 1 );

			if ( ! empty( $chunk ) ) {
				$process_chunk_result = $this->process_chunk( $chunk );
				if( true !== $process_chunk_result ) {
					$result = $this->end_ajax( $process_chunk_result );
					return $result;
				}
			}

			$result = $this->end_ajax( json_encode( 
				array(
					'current_row' 		=> $row_information[0],
					'primary_keys'		=> $row_information[1]
				)
			) );
		}
		return $result;
	}

	function respond_to_backup_remote_table() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'last_table', 'gzip', 'primary_keys', 'path_current_site', 'domain_current_site' ) );
		$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );
		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$result = $this->end_ajax( $this->invalid_content_verification_error . ' (#137)' );
			return $result;
		}

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		$result = $this->handle_table_backup();
		return $result;
	}

	function handle_table_backup() {
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
		$result = $this->export_table( $_POST['table'] );
		if( isset( $this->fp ) ) {
			$this->close( $this->fp );
		}
		ob_start();
		$this->display_errors();
		$maybe_errors = trim( ob_get_clean() );
		if( false === empty( $maybe_errors ) ) {
			$result = $this->end_ajax( $maybe_errors );
			return $result;
		}

		return $result;
	}

	function respond_to_process_pull_request() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'pull_limit', 'last_table', 'gzip', 'primary_keys', 'path_current_site', 'domain_current_site' ) );
		
		// verification will fail unless we strip slashes on primary_keys and form_data
		$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );
		$filtered_post['form_data'] = stripslashes( $filtered_post['form_data'] );
		if( isset( $filtered_post['path_current_site'] ) ) {
			$filtered_post['path_current_site'] = stripslashes( $filtered_post['path_current_site'] );	
		}

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$result = $this->end_ajax( $this->invalid_content_verification_error . ' (#124)' );
			return $result;
		}

		if ( $this->settings['allow_pull'] != true ) {
			$result = $this->end_ajax( 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#132)' );
			return $result;
		}

		$this->maximum_chunk_size = $_POST['pull_limit'];
		$this->export_table( $_POST['table'] );
		ob_start();
		$this->display_errors();
		$return = ob_get_clean();
		$result = $this->end_ajax( $return );
		return $result;
	}

	// Occurs right before the first table is migrated / backed up during the migration process
	// Does a quick check to make sure the verification string is valid and also opens / creates files for writing to (if required)
	function ajax_initiate_migration() {
		$this->check_ajax_referer( 'initiate-migration' );
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
			$process_chunk_result = $this->process_chunk( $create_alter_table_query );
			if( true !== $process_chunk_result ) {
				$result = $this->end_ajax( $process_chunk_result );
				return $result;
			}

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
				'action'  => 'wpmdb_remote_initiate_migration',
				'intent' => $_POST['intent'],
				'form_data' => $_POST['form_data'],
			);

			$data['sig'] = $this->create_signature( $data, $_POST['key'] );
			$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
			$response = $this->remote_post( $ajax_url, $data, __FUNCTION__ );

			if ( false === $response ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $this->error );
				$result = $this->end_ajax( json_encode( $return ) );
				return $result;
			}
			
			$return = json_decode( stripslashes( $response ), ARRAY_A );

			if( $_POST['intent'] == 'pull' ) {
				// sets up our table to store 'ALTER' queries
				$create_alter_table_query = $this->get_create_alter_table_query();
				$process_chunk_result = $this->process_chunk( $create_alter_table_query );
				if( true !== $process_chunk_result ) {
					$result = $this->end_ajax( $process_chunk_result );
					return $result;
				}
			}

			if( ! empty( $this->form_data['create_backup'] ) && $_POST['intent'] == 'pull' ) {
				$return['dump_filename'] = basename( $this->get_sql_dump_info( 'backup', 'path' ) );
				$return['dump_filename'] = substr( $return['dump_filename'], 0, -4 );
				$return['dump_url'] = $this->get_sql_dump_info( 'backup', 'url' );
			}

		}

		$return['dump_filename'] = ( empty( $return['dump_filename'] ) ) ? '' : $return['dump_filename'];
		$return['dump_url'] = ( empty( $return['dump_url'] ) ) ? '' : $return['dump_url'];

		$result = $this->end_ajax( json_encode( $return ) );
		return $result;
	}

	// End point for the above remote_post call, ensures that the verification string is valid before continuing with the migration
	function respond_to_remote_initiate_migration() {
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

		if( $_POST['intent'] == 'push' ) {
			// sets up our table to store 'ALTER' queries
			$create_alter_table_query = $this->get_create_alter_table_query();
			$process_chunk_result = $this->process_chunk( $create_alter_table_query );
			if( true !== $process_chunk_result ) {
				$result = $this->end_ajax( $process_chunk_result );
				return $result;
			}
		}

		$result = $this->end_ajax( json_encode( $return ) );
		return $result;
	}

	function ajax_save_profile() {
		$this->check_ajax_referer( 'save-profile' );
		$profile = $this->parse_migration_form_data( $_POST['profile'] );
		$profile = wp_parse_args( $profile, $this->checkbox_options );
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
		$result = $this->end_ajax( count( $this->settings['profiles'] ) - 1 );
		return $result;
	}

	function ajax_save_setting() {
		$this->check_ajax_referer( 'save-setting' );
		$this->settings[$_POST['setting']] = ( $_POST['checked'] == 'false' ? false : true );
		update_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax();
		return $result;
	}

	function ajax_delete_migration_profile() {
		$this->check_ajax_referer( 'delete-migration-profile' );
		$key = $_POST['profile_id'];
		$return = '';
		if ( isset( $this->settings['profiles'][$key] ) ) {
			unset( $this->settings['profiles'][$key] );
			update_option( 'wpmdb_settings', $this->settings );
		}
		else {
			$return = '-1';
		}
		$result = $this->end_ajax( $return );
		return $result;
	}

	function ajax_reset_api_key() {
		$this->check_ajax_referer( 'reset-api-key' );
		$this->settings['key'] = $this->generate_key();
		update_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax( sprintf( "%s\n%s", site_url( '', 'https' ), $this->settings['key'] ) );
		return $result;
	}

	// AJAX endpoint for when the user pastes into the connection info box (or when they click "connect")
	// Responsible for contacting the remote website and retrieving info and testing the verification string
	function ajax_verify_connection_to_remote_site() {
		$this->check_ajax_referer( 'verify-connection-to-remote-site' );
		$data = array(
			'action'  => 'wpmdb_verify_connection_to_remote_site',
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
			$result = $this->end_ajax( json_encode( $return ) );
			return $result;
		}

		$response = unserialize( trim( $response ) );

		if ( isset( $response['error'] ) && $response['error'] == 1 ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $response['message'] );
			$result = $this->end_ajax( json_encode( $return ) );
			return $result;
		}

		$response['scheme'] = $url_bits['scheme'];
		$return = json_encode( $response );

		$result = $this->end_ajax( $return );
		return $result;
	}

	// End point for the above remote_post call, returns table information, absolute file path, table prefix, etc
	function respond_to_verify_connection_to_remote_site() {
		global $wpdb;
		
		$return = array();
		
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent' ) );
		if ( !$this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#120) <a href="#" class="try-again js-action-link">Try again?</a>';
			$result = $this->end_ajax( serialize( $return ) );
			return $result;
		}

		if ( !isset( $this->settings['allow_' . $_POST['intent']] ) || $this->settings['allow_' . $_POST['intent']] != true ) {
			$return['error'] = 1;
			$return['message'] = 'The connection succeeded but the remote site is configured to reject ' . $_POST['intent'] . ' connections. You can change this in the "settings" tab on the remote site. (#122) <a href="#" class="try-again js-action-link">Try again?</a>';
			$result = $this->end_ajax( serialize( $return ) );
			return $result;
		}

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
		$return['plugin_version'] = $this->plugin_version;
		$return['domain'] = $this->get_domain_current_site();
		$return['path_current_site'] = $this->get_path_current_site();
		$return['uploads_dir'] = $this->get_short_uploads_dir();
		$return['gzip'] = ( $this->gzip() ? '1' : '0' );
		$return['post_types'] = $this->get_post_types();
		$return['write_permissions'] = ( is_writeable( $this->get_upload_info( 'path' ) ) ? '1' : '0' );
		$return['upload_dir_long'] = $this->get_upload_info( 'path' );
		$return['temp_prefix'] = $this->temp_prefix;
		$return = apply_filters( 'wpmdb_establish_remote_connection_data', $return );
		$result = $this->end_ajax( serialize( $return ) );
		return $result;
	}

	function format_table_sizes( $size ) {
		$size *= 1024;
		return size_format( $size );
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

	function get_post_types() {
		global $wpdb;

		if( is_multisite() ) {
			$tables = $this->get_tables();
			$sql = "SELECT `post_type` FROM `{$wpdb->prefix}posts` ";
			foreach( $tables as $table ) {
				if( 0 == preg_match( '/' . $wpdb->prefix . '[0-9]+_posts/', $table ) ) continue;
				$blog_id = str_replace( array( $wpdb->prefix, '_posts' ), array( '', '' ), $table );
				$sql .= "UNION SELECT `post_type` FROM `{$wpdb->prefix}" . $blog_id . "_posts` ";
			}
			$sql .= ";";
			$post_types = $wpdb->get_results( $sql, ARRAY_A );
		}
		else {
			$post_types = $wpdb->get_results(
				"SELECT DISTINCT `post_type`
				FROM `{$wpdb->prefix}posts`
				WHERE 1;", ARRAY_A
			);		
		}

		$return = array( 'revision' );
		foreach( $post_types as $post_type ) {
			$return[] = $post_type['post_type'];
		}
		return apply_filters( 'wpmdb_post_types', array_unique( $return ) );
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

		return apply_filters( 'wpmdb_table_sizes', $return, $scope );
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
			$suhosin_request_limit = $this->return_bytes( ini_get( 'suhosin.request.max_value_length' ) );
			$suhosin_post_limit = $this->return_bytes( ini_get( 'suhosin.post.max_value_length' ) );
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

			<h2 class="nav-tab-wrapper"><a href="#" class="nav-tab nav-tab-active js-action-link migrate" data-div-name="migrate-tab">Migrate</a><a href="#" class="nav-tab js-action-link settings" data-div-name="settings-tab">Settings</a><a href="#" class="nav-tab js-action-link addons" data-div-name="addons-tab">Addons</a><a href="#" class="nav-tab js-action-link help" data-div-name="help-tab">Help</a></h2>

			<?php do_action( 'wpmdb_notices' ); ?>

			<?php
			$hide_warning = apply_filters( 'wpmdb_hide_outdated_addons_warning', false );

			foreach( $this->addons as $addon_basename => $addon ) {
				if( false == $this->is_addon_outdated( $addon_basename ) || false == is_plugin_active( $addon_basename ) ) continue;
				$update_url = wp_nonce_url( network_admin_url( 'update.php?action=upgrade-plugin&plugin=' . urlencode( $addon_basename ) ), 'upgrade-plugin_' . $addon_basename );			
				$addon_slug = current( explode( '/', $addon_basename ) );
				if ( isset( $GLOBALS['wpmdb_meta'][$addon_slug]['version'] ) ) {
					$version = ' (' . $GLOBALS['wpmdb_meta'][$addon_slug]['version'] . ')';
				}
				else {
					$version = '';
				}
				?>
				<div class="updated warning inline-message">
					<strong>Update Required</strong> &mdash; 
					<?php printf( 'The version of the %s addon you have installed%s is out-of-date and will not work with this version WP Migrate DB Pro. <a href="%s">Update Now</a>', $addon['name'], $version, $update_url ); ?>
				</div>
			<?php
			}

			$hide_warning = apply_filters( 'wpmdb_hide_safe_mode_warning', false );
			if ( function_exists( 'ini_get' ) && ini_get( 'safe_mode' ) && !$hide_warning ) {
				?>
				<div class="updated warning inline-message">
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
				</div>
				<?php
			}
			?>

			<div class="updated warning ie-warning inline-message" style="display: none;">
				<strong>Internet Explorer Not Supported</strong> &mdash; 
				Less than 2% of our customers use IE, so we've decided not to spend time supporting it.
				We ask that you use Firefox or a Webkit-based browser like Chrome or Safari instead.
				If this is a problem for you, please let us know.
			</div>

			<?php
			$hide_warning = apply_filters( 'wpmdb_hide_set_time_limit_warning', false );
			if ( false == $this->set_time_limit_available() && !$hide_warning && !$safe_mode ) {
				?>
				<div class="updated warning inline-message">
					<strong>PHP Function Disabled</strong> &mdash;
					The <code>set_time_limit()</code> function is currently disabled on your server.
					We use this function to ensure that the migration doesn't time out. We haven't 
					disabled the plugin however, so you're free to cross your
					fingers and hope for the best. You may want to contact your web host to enable this function.
					<?php if ( function_exists( 'ini_get' ) ) : ?>
					Your current PHP run time limit is set to <?php echo ini_get( 'max_execution_time' ); ?> seconds.
					<?php endif; ?>
				</div>
				<?php
			}
			?>

			<div id="wpmdb-main">

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

				$this->template( 'addons' );
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
	function export_table( $table ) {
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
					$process_chunk_result = $this->process_chunk( $insert );
					if( true !== $process_chunk_result ) {
						$result = $this->end_ajax( $process_chunk_result );
						return $result;
					}
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
		$use_primary_keys = true;
		foreach( $table_structure as $col ){
			$field_set[] = $this->backquote( $col->Field );
			if( $col->Key == 'PRI' && true == $use_primary_keys ) {
				if( false === strpos( $col->Type, 'int' ) ) {
					$use_primary_keys = false;
					$this->primary_keys = array();
					continue;
				}
				$this->primary_keys[$col->Field] = 0;
			}
		}

		$first_select = true;
		if( ! empty( $_POST['primary_keys'] ) ) {
			$_POST['primary_keys'] = trim( $_POST['primary_keys'] );
			if( ! empty( $_POST['primary_keys'] ) && is_serialized( $_POST['primary_keys'] ) ) {
				$this->primary_keys = unserialize( stripslashes( $_POST['primary_keys'] ) );
				$first_select = false;
			}
		}

		$fields = implode( ', ', $field_set );

		$insert_buffer = $insert_query_template = "INSERT INTO " . $this->backquote( $table_name ) . " ( " . $fields . ") VALUES\n";

		do {
			$join = array();
			$where = 'WHERE 1=1';
			$order_by = '';
			// We need ORDER BY here because with LIMIT, sometimes it will return
			// the same results from the previous query and we'll have duplicate insert statements 
			if ( 'backup' != $_POST['stage'] && isset( $this->form_data['exclude_spam'] ) ) {
				if ( $this->table_is( 'comments', $table ) ) {
					$where .= ' AND comment_approved != "spam"';
				}
				elseif ( $this->table_is( 'commentmeta', $table ) ) {
					extract( $this->get_ms_compat_table_names( array( 'commentmeta', 'comments' ), $table ) );
					$join[] = sprintf( 'INNER JOIN %1$s ON %1$s.comment_ID = %2$s.comment_id', $this->backquote( $comments_table ), $this->backquote( $commentmeta_table ) );
					$where .= sprintf( ' AND %1$s.comment_approved != \'spam\'', $this->backquote( $comments_table ) );
				}
			}
			
			if ( 'backup' != $_POST['stage'] && isset( $this->form_data['post_type_migrate_option'] ) && $this->form_data['post_type_migrate_option'] == 'migrate_select_post_types' && ! empty( $this->form_data['select_post_types'] ) ) {
				$post_types = '\'' . implode( '\', \'', $this->form_data['select_post_types'] ) . '\'';
				if( $this->table_is( 'posts', $table ) ) {
					$where .= ' AND `post_type` IN ( ' . $post_types . ' )';
				}
				elseif( $this->table_is( 'postmeta', $table ) ) {
					extract( $this->get_ms_compat_table_names( array( 'postmeta', 'posts' ), $table ) );
					$join[] = sprintf( 'INNER JOIN %1$s ON %1$s.ID = %2$s.post_id', $this->backquote( $posts_table ), $this->backquote( $postmeta_table ) );
					$where .= sprintf( ' AND %1$s.post_type IN ( ' . $post_types . ' )', $this->backquote( $posts_table ) );
				}
				elseif ( $this->table_is( 'comments', $table ) ) {
					extract( $this->get_ms_compat_table_names( array( 'comments', 'posts' ), $table ) );
					$join[] = sprintf( 'INNER JOIN %1$s ON %1$s.ID = %2$s.comment_post_ID', $this->backquote( $posts_table ), $this->backquote( $comments_table ) );
					$where .= sprintf( ' AND %1$s.post_type IN ( ' . $post_types . ' )', $this->backquote( $posts_table ) );
				}
				elseif( $this->table_is( 'commentmeta', $table ) ) {
					extract( $this->get_ms_compat_table_names( array( 'commentmeta', 'posts', 'comments' ), $table ) );
					$join[] = sprintf( 'INNER JOIN %1$s ON %1$s.comment_ID = %2$s.comment_id', $this->backquote( $comments_table ), $this->backquote( $commentmeta_table ) );
					$join[] = sprintf( 'INNER JOIN %2$s ON %2$s.ID = %1$s.comment_post_ID', $this->backquote( $comments_table ), $this->backquote( $posts_table ) );
					$where .= sprintf( ' AND %1$s.post_type IN ( ' . $post_types . ' )', $this->backquote( $posts_table ) );
				}
			}

			if ( 'backup' != $_POST['stage'] && true === apply_filters( 'wpmdb_exclude_transients', true ) && ( $this->table_is( 'options', $table ) || ( isset( $wpdb->sitemeta ) && $wpdb->sitemeta == $table ) ) ) {
				$col_name = 'option_name';

				if( isset( $wpdb->sitemeta ) && $wpdb->sitemeta == $table ) {
					$col_name = 'meta_key';
				}

				$where .= " AND `{$col_name}` NOT LIKE '\_transient\_%' AND `{$col_name}` NOT LIKE '\_site\_transient\_%'";
			}

			$limit = "LIMIT {$row_start}, {$row_inc}";

			if( ! empty( $this->primary_keys ) ) {
				$primary_keys_keys = array_keys( $this->primary_keys );
				$primary_keys_keys = array_map( array( $this, 'backquote' ), $primary_keys_keys );

				$order_by = 'ORDER BY ' . implode( ',', $primary_keys_keys );
				$limit = "LIMIT $row_inc";
				if( false == $first_select ) {
					$where .= ' AND ';

					$temp_primary_keys = $this->primary_keys;
					$primary_key_count = count( $temp_primary_keys );

					// build a list of clauses, iteratively reducing the number of fields compared in the compound key
					// e.g. (a = 1 AND b = 2 AND c > 3) OR (a = 1 AND b > 2) OR (a > 1)
					$clauses = array();
					for( $j = 0; $j < $primary_key_count; $j++ ) {
						// build a subclause for each field in the compound index
						$subclauses = array();
						$i = 0;
						foreach( $temp_primary_keys as $primary_key => $value ) {
							// only the last field in the key should be different in this subclause
							$operator = ( count( $temp_primary_keys ) - 1 == $i ? '>' : '=' );
							$subclauses[] = sprintf( '%s %s %s', $this->backquote( $primary_key ), $operator, $wpdb->prepare( '%s', $value ) );
							++$i;
						}

						// remove last field from array to reduce fields in next clause
						array_pop( $temp_primary_keys );

						// join subclauses into a single clause
						// NB: AND needs to be wrapped in () as it has higher precedence than OR
						$clauses[] = '( ' . implode( ' AND ', $subclauses ) . ' )';
					}
					// join clauses into a single clause
					// NB: OR needs to be wrapped in () as it has lower precedence than AND
					$where .= '( ' . implode( ' OR ', $clauses ) . ' )';
				}
				$first_select = false;
			}

			$join = implode( ' ', array_unique( $join ) );
			$join = apply_filters( 'wpmdb_rows_join', $join, $table );
			$where = apply_filters( 'wpmdb_rows_where', $where, $table );
			$order_by = apply_filters( 'wpmdb_rows_order_by', $order_by, $table );
			$limit = apply_filters( 'wpmdb_rows_limit', $limit, $table );

			$sql = "SELECT " . $this->backquote( $table ) . ".* FROM " . $this->backquote( $table ) . " $join $where $order_by $limit";
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

								if( is_multisite() && 'path' == $key && $_POST['stage'] != 'backup' && ( $wpdb->site == $table || $wpdb->blogs == $table ) ) {
									$old_path_current_site = $this->get_path_current_site();
									if( ! empty( $_POST['path_current_site'] ) ) {
										$new_path_current_site = stripslashes( $_POST['path_current_site'] );
									}
									else {
										$new_path_current_site = $this->get_path_from_url( $this->form_data['replace_new'][1] );
									}
									
									if( $old_path_current_site != $new_path_current_site ) {
										$pos = strpos( $value, $old_path_current_site );
										$value = substr_replace( $value, $new_path_current_site, $pos, strlen( $old_path_current_site ) );
									}
								}

								if( is_multisite() && 'domain' == $key && $_POST['stage'] != 'backup' && ( $wpdb->site == $table || $wpdb->blogs == $table ) ) {
									if( ! empty( $_POST['domain_current_site'] ) ) {
										$main_domain_replace = $_POST['domain_current_site'];
									}
									else {
										$url = parse_url( $this->form_data['replace_new'][1] );
										$main_domain_replace = $url['host'];
									}

									$main_domain_find = sprintf( "/%s/", $this->get_domain_current_site() );
									$domain_replaces[$main_domain_find] = $main_domain_replace;
									$domain_replaces = apply_filters( 'wpmdb_domain_replaces', $domain_replaces );

									$value = preg_replace( array_keys( $domain_replaces ), array_values( $domain_replaces ), $value );
								}

								if ( 'guid' != $key || ( isset( $this->form_data['replace_guids'] ) && $this->table_is( 'posts', $table ) ) ) {
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
						if( $insert_buffer == $insert_query_template ) {
							$insert_buffer .= $insert_line;

							++$this->row_tracker;

							if( ! empty( $this->primary_keys ) ) {
								foreach( $this->primary_keys as $primary_key => $value ) {
									$this->primary_keys[$primary_key] = $row->$primary_key;
								}
							}
						}
						$insert_buffer = rtrim( $insert_buffer, "\n," );
						$insert_buffer .= " ;\n";
						$this->stow( $insert_buffer );
						$insert_buffer = $insert_query_template;
						$query_size = 0;
						return $this->transfer_chunk();
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
		return $this->transfer_chunk();

	} // end backup_table()

	function table_is( $desired_table, $given_table ) {
		global $wpdb;
		return ( $wpdb->{$desired_table} == $given_table || preg_match( '/' . $wpdb->prefix . '[0-9]+_' . $desired_table . '/', $given_table ) );
	}

	/**
	 * return multisite-compatible names for requested tables, based on queried table name
	 *
	 * @param array  $tables          list of table names required
	 * @param string $queried_table   name of table from which to derive the blog ID
	 *
	 * @return array                  list of table names altered for multisite compatibility
	 */
	function get_ms_compat_table_names( $tables, $queried_table ) {
		global $wpdb;

		// default table prefix
		$prefix = $wpdb->prefix;

		// if multisite, extract blog ID from queried table name and add to prefix
		// won't match for primary blog because it uses standard table names, i.e. blog_id will never be 1
		if ( is_multisite() && preg_match( '/^' . preg_quote( $wpdb->prefix, '/' ) . '([0-9]+)_/', $queried_table, $matches ) ) {
			$blog_id = $matches[1];
			$prefix .= $blog_id . '_';
		}

		// build table names
		$ms_compat_table_names = array();
		foreach( $tables as $table ) {
			$ms_compat_table_names[$table . '_table'] = $prefix . $table;
		}

		return $ms_compat_table_names;
	}
	
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
				// PHP currently has a bug that doesn't allow you to clone the DateInterval / DatePeriod classes.
				// We skip them here as they probably won't need data to be replaced anyway
				if( is_object( $unserialized ) ) {
					if( $unserialized instanceof DateInterval || $unserialized instanceof DatePeriod ) return $data;
				}
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
		$charset = ( defined( 'DB_CHARSET' ) ? DB_CHARSET : 'utf8' );
		$this->stow( "# " . __( 'WordPress MySQL database migration', 'wp-migrate-db-pro' ) . "\n", false );
		$this->stow( "#\n", false );
		$this->stow( "# " . sprintf( __( 'Generated: %s', 'wp-migrate-db-pro' ), date( "l j. F Y H:i T" ) ) . "\n", false );
		$this->stow( "# " . sprintf( __( 'Hostname: %s', 'wp-migrate-db-pro' ), DB_HOST ) . "\n", false );
		$this->stow( "# " . sprintf( __( 'Database: %s', 'wp-migrate-db-pro' ), $this->backquote( DB_NAME ) ) . "\n", false );
		$this->stow( "# --------------------------------------------------------\n\n", false );
		$this->stow( "/*!40101 SET NAMES $charset */;\n\n", false );
		$this->stow( "SET sql_mode='NO_AUTO_VALUE_ON_ZERO';\n\n", false );
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
		unset( $this->fp );
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
			$result = $this->end_ajax( json_encode( 
				array(
					'current_row' 	=> $this->row_tracker,
					'primary_keys'	=> serialize( $this->primary_keys )
				)
			) );
			return $result;
		}

		if ( $_POST['intent'] == 'pull' ) {
			$result = $this->end_ajax( $this->row_tracker . ',' . serialize( $this->primary_keys ) );
			return $result;
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
		ob_start();
		$this->display_errors();
		$response = ob_get_clean();
		$response .= trim( $response );
		if( ! empty( $response ) ) {
			$result = $this->end_ajax( $response );
			return $result;
		}

		$result = $this->end_ajax( json_encode( 
			array(
				'current_row' 		=> $this->row_tracker,
				'primary_keys'		=> serialize( $this->primary_keys )
			)
		) );
		return $result;
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
			update_option( 'wpmdb_settings', $this->settings );
		}
	}

	function admin_body_class( $classes ) {
		if ( !$classes ) {
			$classes = array();
		}
		else {
        	$classes = explode( ' ', $classes );
        }

		// Recommended way to target WP 3.8+
		// http://make.wordpress.org/ui/2013/11/19/targeting-the-new-dashboard-design-in-a-post-mp6-world/
	    if ( version_compare( $GLOBALS['wp_version'], '3.8-alpha', '>' ) ) {
	        if ( !in_array( 'mp6', $classes ) ) {
	            $classes[] = 'mp6';
	        }
	    }

	    return implode( ' ', $classes );
	}

	function load_assets() {
		if ( ! empty( $_GET['download'] ) ) {
			$this->download_file();
		}

		if( isset( $_GET['wpmdb-remove-licence'] ) && wp_verify_nonce( $_GET['nonce'], 'wpmdb-remove-licence' ) ) {
			$this->settings['licence'] = '';
			update_option( 'wpmdb_settings', $this->settings );
			// delete these transients as they contain information only valid for authenticated licence holders
			delete_site_transient( 'update_plugins' );
			delete_site_transient( 'wpmdb_upgrade_data' );
			delete_site_transient( 'wpmdb_licence_response' );
			// redirecting here because we don't want to keep the query string in the web browsers address bar
			wp_redirect( network_admin_url( $this->plugin_base . '#settings' ) );
			exit;
		}

		if( isset( $_GET['wpmdb-disable-ssl'] ) && wp_verify_nonce( $_GET['nonce'], 'wpmdb-disable-ssl' ) ) {
			set_site_transient( 'wpmdb_temporarily_disable_ssl', '1', 60 * 60 * 24 * 30 ); // 30 days
			$hash = ( isset( $_GET['hash'] ) ) ? $_GET['hash'] : '';
			// redirecting here because we don't want to keep the query string in the web browsers address bar
			wp_redirect( network_admin_url( $this->plugin_base . '#' . $hash ) );
			exit;
		}

		$plugins_url = trailingslashit( plugins_url() ) . trailingslashit( $this->plugin_folder_name );

		$version = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? time() : $this->plugin_version;

		$src = $plugins_url . 'asset/css/styles.css';
		wp_enqueue_style( 'wp-migrate-db-pro-styles', $src, array(), $version );
		
		$src = $plugins_url . 'asset/js/common.js';
		wp_enqueue_script( 'wp-migrate-db-pro-common', $src, NULL, $version, true );

		$src = $plugins_url . 'asset/js/hook.js';
		wp_enqueue_script( 'wp-migrate-db-pro-hook', $src, NULL, $version, true );

		do_action( 'wpmdb_load_assets' );

		$src = $plugins_url . 'asset/js/script.js';
		wp_enqueue_script( 'wp-migrate-db-pro-script', $src, array( 'jquery' ), $version, true );

		wp_enqueue_script('jquery');
		wp_enqueue_script('jquery-ui-core');
		wp_enqueue_script('jquery-ui-slider');
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

		$nonces = array(
			'update_max_request_size' 			=> wp_create_nonce( 'update-max-request-size' ),
			'check_licence'						=> wp_create_nonce( 'check-licence' ),
			'verify_connection_to_remote_site'	=> wp_create_nonce( 'verify-connection-to-remote-site' ),
			'activate_licence'					=> wp_create_nonce( 'activate-licence' ),
			'clear_log'							=> wp_create_nonce( 'clear-log' ),
			'get_log'							=> wp_create_nonce( 'get-log' ),
			'save_profile'						=> wp_create_nonce( 'save-profile' ),
			'initiate_migration'				=> wp_create_nonce( 'initiate-migration' ),
			'migrate_table'						=> wp_create_nonce( 'migrate-table' ),
			'finalize_migration'				=> wp_create_nonce( 'finalize-migration' ),
			'reset_api_key'						=> wp_create_nonce( 'reset-api-key' ),
			'delete_migration_profile'			=> wp_create_nonce( 'delete-migration-profile' ),
			'save_setting'						=> wp_create_nonce( 'save-setting' ),
		);

		$nonces = apply_filters( 'wpmdb_nonces', $nonces );

		?>
		<script type='text/javascript'>
			var wpmdb_connection_info = '<?php echo json_encode( array( site_url( '', 'https' ), $this->settings['key'] ) ); ?>';
			var wpmdb_this_url = '<?php echo addslashes( home_url() ) ?>';
			var wpmdb_this_path = '<?php echo addslashes( $this->absolute_root_file_path ); ?>';
			var wpmdb_this_domain = '<?php echo $this->get_domain_current_site(); ?>';
			var wpmdb_this_tables = '<?php echo json_encode( $this->get_tables() ); ?>';
			var wpmdb_this_prefixed_tables = '<?php echo json_encode( $this->get_tables( 'prefix' ) ); ?>';
			var wpmdb_this_table_sizes = '<?php echo json_encode( $this->get_table_sizes() ); ?>';
			var wpmdb_this_table_rows = '<?php echo json_encode( $this->get_table_row_count() ); ?>';
			var wpmdb_this_upload_url = '<?php echo addslashes( trailingslashit( $this->get_upload_info( 'url' ) ) ); ?>';
			var wpmdb_this_upload_dir_long = '<?php echo addslashes( trailingslashit( $this->get_upload_info( 'path' ) ) ); ?>';
			var wpmdb_this_website_name = '<?php echo sanitize_title_with_dashes( DB_NAME ); ?>';
			var wpmdb_this_download_url = '<?php echo network_admin_url( $this->plugin_base . '&download=' ); ?>';
			var wpmdb_this_prefix = '<?php echo $table_prefix; ?>';
			var wpmdb_is_multisite = <?php echo ( is_multisite() ? 'true' : 'false' ); ?>;
			var wpmdb_openssl_available = <?php echo ( $this->open_ssl_enabled() ? 'true' : 'false' ); ?>;
			var wpmdb_plugin_version = '<?php echo $this->plugin_version; ?>';
			var wpmdb_max_request = '<?php echo $this->settings['max_request'] ?>';
			var wpmdb_bottleneck = '<?php echo $this->get_bottleneck( 'max' ); ?>';
			var wpmdb_this_uploads_dir = '<?php echo addslashes( $this->get_short_uploads_dir() ); ?>';
			var wpmdb_has_licence = '<?php echo ( $this->get_licence_key() == '' ? '0' : '1' ); ?>';
			var wpmdb_write_permission = <?php echo ( is_writeable( $this->get_upload_info( 'path' ) ) ? 'true' : 'false' ); ?>;
			var wpmdb_nonces = <?php echo json_encode( $nonces ); ?>;
			<?php do_action( 'wpmdb_js_variables' ); ?>
		</script>
		<?php
	}

	function site_transient_update_plugins( $trans ) {
		if ( !is_admin() ) return $trans; // only need to run this when in the dashboard

		$plugin_upgrade_data = $this->get_upgrade_data();
		if( false === $plugin_upgrade_data || ! isset( $plugin_upgrade_data['wp-migrate-db-pro'] ) ) return $trans;

		foreach( $plugin_upgrade_data as $plugin_slug => $upgrade_data ) {
			// If pre-1.1.2 version of Media Files addon, use the slug as folder name
			if ( !isset( $GLOBALS['wpmdb_meta'][$plugin_slug]['folder'] ) ) {
				$plugin_folder = $plugin_slug;
			}
			else {
				$plugin_folder = $GLOBALS['wpmdb_meta'][$plugin_slug]['folder'];
			}

			$plugin_basename = sprintf( '%s/%s.php', $plugin_folder, $plugin_slug );
			$latest_version = $this->get_latest_version( $plugin_slug );

			if ( !isset( $GLOBALS['wpmdb_meta'][$plugin_slug]['version'] ) ) {
				// If pre-1.1.2 version of Media Files addon and it is active
				// assume version 1.1.1 so they can at least upgrade
				global $wpmdbpro_media_files;
				if ( !empty( $wpmdbpro_media_files ) ) {
					$installed_version = '1.1.1';
				}
			}
			else {
				$installed_version = $GLOBALS['wpmdb_meta'][$plugin_slug]['version'];
			}

			if ( isset( $installed_version ) && version_compare( $installed_version, $latest_version, '<' ) ) {
				$is_beta = $this->is_beta_version( $latest_version );

				$trans->response[$plugin_basename] = new stdClass();
				$trans->response[$plugin_basename]->url = $this->dbrains_api_base;
				$trans->response[$plugin_basename]->slug = $plugin_slug;
				$trans->response[$plugin_basename]->package = $this->get_plugin_update_download_url( $plugin_slug, $is_beta );
				$trans->response[$plugin_basename]->new_version = $latest_version;
				$trans->response[$plugin_basename]->id = '0';
			}
		}

		return $trans;
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

	function inject_addon_install_resource( $res, $action, $args ) {
		if ( 'plugin_information' != $action || empty( $args->slug ) ) {
			return $res;
		}

		$addons = get_site_transient( 'wpmdb_addons' );
		if ( !isset( $addons[$args->slug] ) ) {
			return $res;
		}

		$addon = $addons[$args->slug];

		$res = new stdClass();
		$res->name = 'WP Migrate DB Pro ' . $addon['name'];
		$res->version = $addon['version'];
		$res->download_link = $this->get_plugin_update_download_url( $args->slug );

		return $res;
	}

	function mask_licence( $licence ) {
		$licence_parts = explode( '-', $licence );
		$i = count( $licence_parts ) - 1;
		$masked_licence = '';
		foreach( $licence_parts as $licence_part ) {
			if( $i == 0 ){ 
				$masked_licence .= $licence_part;
				continue;
			}
			$masked_licence .= '<span class="bull">';
			$masked_licence .= str_repeat( '&bull;', strlen( $licence_part ) ) . '</span>&ndash;';
			--$i;
		}
		return $masked_licence;
	}

	function get_formatted_masked_licence() {
		return sprintf( '<p class="masked-licence">%s <a href="%s">Remove</a></p>', $this->mask_licence( $this->settings['licence'] ), network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-remove-licence' ) . '&wpmdb-remove-licence=1#settings' ) );
	}

	function maybe_update_profile( $profile, $profile_id ) {
		if( ! isset( $profile['exclude_revisions'] ) ) return $profile;
		unset( $profile['exclude_revisions'] );
		$profile['post_type_migrate_option'] = 'migrate_select_post_types';
		$profile['select_post_types'] = array();
		if( $profile['action'] != 'pull' ) {
			$local_post_types = $this->get_post_types();
			if( false !== ( $key = array_search( 'revision', $local_post_types ) ) ) {
				unset( $local_post_types[$key] );
			}
			$profile['select_post_types'] = $local_post_types;
		}
		$this->settings['profiles'][$profile_id] = $profile;
		update_option( 'wpmdb_settings', $this->settings );
		return $profile;
	}

	function get_path_from_url( $url ) {
		$parts = parse_url( $url );
		return ( ! empty( $parts['path'] ) ) ? trailingslashit( $parts['path'] ) : '/';
	}

	function get_path_current_site() {
		if( ! is_multisite() ) return '';
		$current_site = get_current_site();
		return $current_site->path;
	}

	function get_domain_current_site() {
		if( ! is_multisite() ) return '';
		$current_site = get_current_site();
		return $current_site->domain;
	}

	function return_bytes($val) {
		if( is_numeric( $val ) ) return $val;
		if( empty( $val ) ) return false;
		$val = trim($val);
		$last = strtolower($val[strlen($val)-1]);
		switch($last) {
			// The 'G' modifier is available since PHP 5.1.0
			case 'g':
				$val *= 1024;
			case 'm':
				$val *= 1024;
			case 'k':
				$val *= 1024;
				break;
			default :
				$val = false;
				break;
		}

		return $val;
	}

	function end_ajax( $return = false ) {
		if( defined( 'DOING_WPMDB_TESTS' ) ) {
			return ( false === $return ) ? NULL : $return;
		}

		echo ( false === $return ) ? '' : $return;
		exit;
	}

	function maybe_checked( $option ) {
		echo ( isset( $option ) && $option == '1' ) ? ' checked="checked"' : '';
	}

}
