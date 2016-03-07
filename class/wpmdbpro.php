<?php

class WPMDBPro extends WPMDB {

	function __construct( $plugin_file_path ) {
		$this->is_pro = true;
		$this->unhook_templates = array( 'exclude_post_revisions', 'wordpress_org_support', 'progress_upgrade', 'sidebar' );
		parent::__construct( $plugin_file_path );

		// templating actions
		add_action( 'wpmdb_notices', array( $this, 'template_outdated_addons_warning' ) );
		add_action( 'wpmdb_notices', array( $this, 'template_secret_key_warning' ) );

		// Internal AJAX handlers
		add_action( 'wp_ajax_wpmdb_verify_connection_to_remote_site', array( $this, 'ajax_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_wpmdb_reset_api_key', array( $this, 'ajax_reset_api_key' ) );
		add_action( 'wp_ajax_wpmdb_save_setting', array( $this, 'ajax_save_setting' ) );
		add_action( 'wp_ajax_wpmdb_activate_licence', array( $this, 'ajax_activate_licence' ) );
		add_action( 'wp_ajax_wpmdb_check_licence', array( $this, 'ajax_check_licence' ) );
		add_action( 'wp_ajax_wpmdb_copy_licence_to_remote_site', array( $this, 'ajax_copy_licence_to_remote_site' ) );
		add_action( 'wp_ajax_wpmdb_reactivate_licence', array( $this, 'ajax_reactivate_licence' ) );
		add_action( 'wp_ajax_wpmdb_process_notice_link', array( $this, 'ajax_process_notice_link' ) );

		// external AJAX handlers
		add_action( 'wp_ajax_nopriv_wpmdb_verify_connection_to_remote_site', array( $this, 'respond_to_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_initiate_migration', array( $this, 'respond_to_remote_initiate_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_chunk', array( $this, 'ajax_process_chunk' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_pull_request', array( $this, 'respond_to_process_pull_request' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_backup_remote_table', array( $this, 'respond_to_backup_remote_table' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_finalize_migration', array( $this, 'respond_to_remote_finalize_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_push_migration_cancellation', array( $this, 'respond_to_process_push_migration_cancellation' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_copy_licence_to_remote_site', array( $this, 'respond_to_copy_licence_to_remote_site' ) );

		// Take over the update check
		add_filter( 'site_transient_update_plugins', array( $this, 'site_transient_update_plugins' ) );

		// Add some custom JS into the WP admin pages
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_plugin_update_script' ) );

		// Add some custom CSS into the WP admin pages
		add_action( 'admin_head-plugins.php', array( $this, 'add_plugin_update_styles' ) );

		// Hook into the plugin install process, inject addon download url
		add_filter( 'plugins_api', array( $this, 'inject_addon_install_resource' ), 10, 3 );

		// Short circuit the HTTP request to WordPress.org for plugin information
		add_filter( 'plugins_api', array( $this, 'short_circuit_wordpress_org_plugin_info_request' ), 10, 3 );

		// Clear update transients when the user clicks the "Check Again" button from the update screen
		add_action( 'current_screen', array( $this, 'check_again_clear_transients' ) );

		// Removes the exclude post revision functionality (as seen in the free version of the plugin)
		$this->remove_exclude_post_revision_functionality();

		// Check if WP Engine is filtering the buffer and prevent it. Added here for ajax pull requests
		$this->maybe_disable_wp_engine_filtering();

		$this->add_tabs();
	}

	/**
	 * Short circuits the HTTP request to WordPress.org servers to retrieve plugin information.
	 * Will only fire on the update-core.php admin page.
	 *
	 * @param  object|bool $res Plugin resource object or boolean false.
	 * @param  string $action The API call being performed.
	 * @param  object $args Arguments for the API call being performed.
	 *
	 * @return object|bool Plugin resource object or boolean false.
	 */
	function short_circuit_wordpress_org_plugin_info_request( $res, $action, $args ) {
		if ( 'plugin_information' != $action || empty( $args->slug ) || 'wp-migrate-db-pro' != $args->slug ) {
			return $res;
		}

		$screen = get_current_screen();

		// Only fire on the update-core.php admin page
		if ( empty( $screen->id ) || ( 'update-core' !== $screen->id && 'update-core-network' !== $screen->id ) ) {
			return $res;
		}

		$res         = new stdClass();
		$plugin_info = $this->get_upgrade_data();

		if ( isset( $plugin_info['wp-migrate-db-pro']['tested'] ) ) {
			$res->tested = $plugin_info['wp-migrate-db-pro']['tested'];
		} else {
			$res->tested = false;
		}

		return $res;
	}

	function add_tabs() {
		$addon_tab = '<a href="#" class="nav-tab js-action-link addons" data-div-name="addons-tab">' . _x( 'Addons', 'Plugin extensions', 'wp-migrate-db' ) . '</a>';
		array_splice( $this->plugin_tabs, 2, 0, $addon_tab );
	}

	function template_pull_push_radio_buttons( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'pull-push-radio-buttons', 'pro', $args );
	}

	function template_select_tables( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'select-tables', 'pro', $args );
	}

	function template_exclude_post_types( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'exclude-post-types', 'pro', $args );
	}

	function template_toggle_remote_requests() {
		$args = array(
			'pull_checked'       => ( $this->settings['allow_pull'] ) ? ' checked="checked"' : '',
			'push_checked'       => ( $this->settings['allow_push'] ) ? ' checked="checked"' : '',
			'verify_ssl_checked' => ( $this->settings['verify_ssl'] ) ? ' checked="checked"' : '',
		);
		$this->template( 'toggle-remote-requests', 'pro', $args );
	}

	function template_connection_info() {
		$args = array(
			'connection_info' => sprintf( "%s\r%s", site_url( '', 'https' ), $this->settings['key'] ),
		);
		$this->template( 'connection-info', 'pro', $args );
	}

	function template_licence() {
		$args = array(
			'licence' => $this->get_licence_key(),
		);
		$this->template( 'licence', 'pro', $args );
	}

	function template_addon_tab() {
		$this->template( 'addon-tab', 'pro' );
	}

	function template_licence_info() {
		$args = array(
			'licence' => $this->get_licence_key(),
		);
		$this->template( 'licence-info', 'pro', $args );
	}

	/**
	 * Shows all the videos on the Help tab.
	 * @return void
	 */
	function template_videos() {
		$args = array(
			'videos' => array(
				'u7jFkwwfeJc' => array(
					'title' => __( 'UI Walkthrough', 'wp-migrate-db' ),
					'desc'  => __( 'A brief walkthrough of the WP Migrate DB plugin showing all of the different options and explaining them.', 'wp-migrate-db' ),
				),
				'fHFcH4bCzmU' => array(
					'title' => __( 'Pulling Live Data Into Your Local Development&nbsp;Environment', 'wp-migrate-db' ),
					'desc'  => __( 'This screencast demonstrates how you can pull data from a remote, live WordPress install and update the data in your local development environment.', 'wp-migrate-db' ),
				),
				'sImZW_sB47g' => array(
					'title' => __( 'Pushing Local Development Data to a Staging&nbsp;Environment', 'wp-migrate-db' ),
					'desc'  => __( 'This screencast demonstrates how you can push a local WordPress database you\'ve been using for development to a staging environment.', 'wp-migrate-db' ),
				),
				'0aR8-jC2XXM' => array(
					'title' => __( 'Media Files Addon Demo', 'wp-migrate-db' ),
					'desc'  => __( 'A short demo of how the Media Files addon allows you to sync up your WordPress Media Libraries.', 'wp-migrate-db' ),
				),
			),
		);
		$this->template( 'videos', 'pro', $args );
	}

	function template_outdated_addons_warning() {
		if ( ! $this->check_notice( 'outdated_addons_warning' ) ) {
			return;
		};
		$this->template( 'outdated-addons-warning', 'pro' );
	}

	function template_secret_key_warning() {
		if ( ! ( $notice_links = $this->check_notice( 'secret_key_warning', true, 604800 ) ) ) {
			return;
		};
		// Only show the warning if the key is 32 characters in length
		if ( strlen( $this->settings['key'] ) > 32 ) {
			return;
		}

		$this->template( 'secret-key-warning', 'pro', $notice_links );
	}

	function template_invalid_licence_warning() {
		if ( ! $this->is_valid_licence() ) {
			$this->template( 'invalid-licence-warning', 'pro' );
		}
	}

	function template_backup( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'backup', 'pro', $args );
	}

	function ajax_process_notice_link() {
		$this->check_ajax_referer( 'process-notice-link' );

		global $current_user;
		$key   = 'wpmdb_' . $_POST['type'] . '_' . $_POST['notice'];
		$value = true;
		if ( 'reminder' == $_POST['type'] && isset( $_POST['reminder'] ) ) {
			$value = strtotime( 'now' ) + ( is_numeric( $_POST['reminder'] ) ? $_POST['reminder'] : 604800 );
		}
		update_user_meta( $current_user->ID, $key, $value );

		$result = $this->end_ajax();

		return $result;
	}

	/**
	 * AJAX endpoint for the wpmdb_verify_connection_to_remote_site action.
	 * Verifies that the local site has a valid licence.
	 * Sends a request to the remote site to collect additional information required to complete the migration.
	 *
	 * @return mixed
	 */
	function ajax_verify_connection_to_remote_site() {
		$this->check_ajax_referer( 'verify-connection-to-remote-site' );
		$this->set_post_data();

		if ( ! $this->is_valid_licence() ) {
			$message = __( 'Please activate your license before attempting a pull or push migration.', 'wp-migrate-db' );
			$return  = array( 'wpmdb_error' => 1, 'body' => $message );
			$result  = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		$data = array(
			'action'  => 'wpmdb_verify_connection_to_remote_site',
			'intent'  => $this->post_data['intent'],
			'referer' => $this->get_short_home_address_from_url( home_url() ),
			'version' => $this->plugin_version,
		);

		$data['sig']         = $this->create_signature( $data, $this->post_data['key'] );
		$ajax_url            = trailingslashit( $this->post_data['url'] ) . 'wp-admin/admin-ajax.php';
		$timeout             = apply_filters( 'wpmdb_prepare_remote_connection_timeout', 30 );
		$serialized_response = $this->remote_post( $ajax_url, $data, __FUNCTION__, compact( 'timeout' ), true );
		$url_bits            = $this->parse_url( $this->attempting_to_connect_to );

		if ( false === $serialized_response ) {
			$return = array(
				'wpmdb_error' => 1,
				'body'        => $this->error,
				'scheme'      => $url_bits['scheme']
			);
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		$response = unserialize( trim( $serialized_response ) );

		if ( false === $response ) {
			$error_msg = __( 'Failed attempting to unserialize the response from the remote server. Please contact support.', 'wp-migrate-db' );
			$return = array(
				'wpmdb_error' => 1,
				'body'        => $error_msg,
				'scheme'      => $url_bits['scheme']
			);
			$this->log_error( $error_msg, $serialized_response );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		if ( isset( $response['error'] ) && $response['error'] == 1 ) {
			$return = array(
				'wpmdb_error' => 1,
				'body'        => $response['message'],
				'scheme'      => $url_bits['scheme']
			);

			if ( isset( $response['error_id'] ) ) {
				if ( 'version_mismatch' === $response['error_id'] ) {
					$return['body'] = str_replace( '%%plugins_url%%', network_admin_url( 'plugins.php' ), $return['body'] );
				}
			}

			$this->log_error( $return['body'], $response );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		if ( isset( $this->post_data['convert_post_type_selection'] ) && '1' == $this->post_data['convert_post_type_selection'] ) {
			$profile = (int) $this->post_data['profile'];
			unset( $this->settings['profiles'][ $profile ]['post_type_migrate_option'] );
			$this->settings['profiles'][ $profile ]['exclude_post_types'] = '1';
			$this->settings['profiles'][ $profile ]['select_post_types']  = array_values( array_diff( $response['post_types'], $this->settings['profiles'][ $profile ]['select_post_types'] ) );
			$response['select_post_types'] = $this->settings['profiles'][ $profile ]['select_post_types'];
			update_site_option( 'wpmdb_settings', $this->settings );
		}

		$response['scheme'] = $url_bits['scheme'];
		$return = json_encode( $response );

		$result = $this->end_ajax( $return );

		return $result;
	}

	function respond_to_remote_finalize_migration() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements(
			$this->post_data,
			array(
				'action',
				'intent',
				'url',
				'key',
				'form_data',
				'prefix',
				'type',
				'location',
				'tables',
				'temp_prefix',
			)
		);

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#123)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );

			return $result;
		}

		$return = $this->finalize_migration();
		$result = $this->end_ajax( $return );

		return $result;
	}

	function respond_to_backup_remote_table() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements(
			$this->post_data,
			array(
				'action',
				'intent',
				'url',
				'key',
				'table',
				'form_data',
				'stage',
				'bottleneck',
				'prefix',
				'current_row',
				'dump_filename',
				'last_table',
				'gzip',
				'primary_keys',
				'path_current_site',
				'domain_current_site',
				'db_version',
			)
		);

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#137)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );

			return $result;
		}

		$this->form_data = $this->parse_migration_form_data( $this->post_data['form_data'] );
		$result          = $this->handle_table_backup();

		return $result;
	}

	/**
	 * Exports table data from remote site during a Pull migration.
	 *
	 * @return string
	 */
	function respond_to_process_pull_request() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements(
			$this->post_data,
			array(
				'action',
				'intent',
				'url',
				'key',
				'table',
				'form_data',
				'stage',
				'bottleneck',
				'prefix',
				'current_row',
				'dump_filename',
				'pull_limit',
				'last_table',
				'gzip',
				'primary_keys',
				'path_current_site',
				'domain_current_site',
				'db_version',
				'site_url',
				'find_replace_pairs',
			)
		);

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#124)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );

			return $result;
		}

		if ( $this->settings['allow_pull'] != true ) {
			$result = $this->end_ajax( __( 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#141)', 'wp-migrate-db' ) );

			return $result;
		}

		$db_version = '';
		if ( ! empty( $filtered_post['db_version'] ) ) {
			$db_version = $filtered_post['db_version'];
			add_filter( 'wpmdb_create_table_query', array( $this, 'mysql_compat_filter' ), 10, 3 );
		}

		$this->find_replace_pairs = unserialize( $filtered_post['find_replace_pairs'] );

		$this->maximum_chunk_size = $this->post_data['pull_limit'];
		$this->export_table( $this->post_data['table'], $db_version );
		ob_start();
		$this->display_errors();
		$return = ob_get_clean();
		$result = $this->end_ajax( $return );

		return $result;
	}

	/**
	 * Validates migration request as the remote site and sets up anything that may be needed before the migration starts.
	 *
	 * @return array
	 */
	function respond_to_remote_initiate_migration() {
		$this->set_post_data();
		global $wpdb;

		$return = array();
		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'intent', 'form_data' ) );
		if ( $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			if ( isset( $this->settings[ 'allow_' . $this->post_data['intent'] ] ) && ( true === $this->settings[ 'allow_' . $this->post_data['intent'] ] || 1 === $this->settings[ 'allow_' . $this->post_data['intent'] ] ) ) {
				$return['error'] = 0;
			} else {
				$return['error'] = 1;
				if ( $this->post_data['intent'] == 'pull' ) {
					$return['message'] = __( 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#110)', 'wp-migrate-db' );
				} else {
					$return['message'] = __( 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#110)', 'wp-migrate-db' );
				}
			}
		} else {
			$return['error'] = 1;
			$error_msg = $this->invalid_content_verification_error . ' (#111)';
			$this->log_error( $error_msg, $filtered_post );
			$return['message'] = $error_msg;
		}

		$this->form_data = $this->parse_migration_form_data( $this->post_data['form_data'] );

		if ( ! empty( $this->form_data['create_backup'] ) && $this->post_data['intent'] == 'push' ) {
			$return['dump_filename'] = basename( $this->get_sql_dump_info( 'backup', 'path' ) );
			$return['dump_filename'] = substr( $return['dump_filename'], 0, - 4 );
			$return['dump_url']      = $this->get_sql_dump_info( 'backup', 'url' );
		}

		if ( $this->post_data['intent'] == 'push' ) {
			// sets up our table to store 'ALTER' queries
			$create_alter_table_query = $this->get_create_alter_table_query();
			$process_chunk_result     = $this->process_chunk( $create_alter_table_query );
			if ( true !== $process_chunk_result ) {
				$result = $this->end_ajax( $process_chunk_result );

				return $result;
			}
			$return['db_version'] = $wpdb->db_version();
			$return['site_url'] = site_url();
		}

		$result = $this->end_ajax( serialize( $return ) );

		return $result;
	}

	/**
	 * No privileges AJAX endpoint for the wpmdb_verify_connection_to_remote_site action.
	 * Verifies that the connecting site is using the same version of WP Migrate DB as the local site.
	 * Verifies that the request is originating from a trusted source by verifying the request signature.
	 * Verifies that the local site has a valid licence.
	 * Verifies that the local site is allowed to perform a pull / push migration.
	 * If all is successful, returns an array of local site information used to complete the migration.
	 *
	 * @return mixed
	 */
	function respond_to_verify_connection_to_remote_site() {
		$this->set_post_data();
		global $wpdb;

		$return = array();

		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'intent', 'referer', 'version' ) );

		if ( ! isset( $filtered_post['version'] ) || version_compare( $filtered_post['version'], $this->plugin_version, '!=' ) ) {
			$return['error'] = 1;
			$return['error_id'] = 'version_mismatch';

			if ( ! isset( $filtered_post['version'] ) ) {
				$return['message'] = sprintf( __( '<b>Version Mismatch</b> &mdash; We\'ve detected you have version %1$s of WP Migrate DB Pro at %2$s but are using an outdated version here. Please go to the Plugins page on both installs and check for updates.', 'wp-migrate-db' ), $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'], $this->get_short_home_address_from_url( home_url() ) );
			} else {
				$return['message'] = sprintf( __( '<b>Version Mismatch</b> &mdash; We\'ve detected you have version %1$s of WP Migrate DB Pro at %2$s but are using %3$s here. Please go to the <a href="%4$s">Plugins page</a> on both installs and check for updates.', 'wp-migrate-db' ), $GLOBALS['wpmdb_meta'][$this->plugin_slug]['version'], $this->get_short_home_address_from_url( home_url() ), $filtered_post['version'], '%%plugins_url%%' );
			}

			$this->log_error( $return['message'], $filtered_post );
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#120) <a href="#" class="try-again js-action-link">' . _x( 'Try again?', 'Asking to try and connect to remote server after verification error', 'wp-migrate-db' ) . '</a>';
			$this->log_error( $this->invalid_content_verification_error . ' (#120)', $filtered_post );
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		if ( ! $this->is_valid_licence() ) {
			$local_host  = $this->get_short_home_address_from_url( home_url() );
			$remote_host = $this->post_data['referer'];

			$return['error'] = 1;

			$return['message'] = sprintf( __( "Activate remote license &mdash; Looks like you don't have a WP Migrate DB Pro license active at %s.", 'wp-migrate-db' ), $local_host );
			$return['message'] .= ' <a href="#" class="js-action-link copy-licence-to-remote-site">';
			$return['message'] .= sprintf( __( 'Copy %1$s license key to %2$s and activate it', 'wp-migrate-db' ), $remote_host, $local_host );
			$return['message'] .= '</a>';
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		if ( ! isset( $this->settings[ 'allow_' . $this->post_data['intent'] ] ) || $this->settings[ 'allow_' . $this->post_data['intent'] ] != true ) {
			$return['error'] = 1;

			if ( $this->post_data['intent'] == 'pull' ) {
				$message = __( 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#122)', 'wp-migrate-db' );
			} else {
				$message = __( 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#122)', 'wp-migrate-db' );
			}
			$return['message'] = $message . sprintf( ' <a href="#" class="try-again js-action-link">%s</a>', _x( 'Try again?', 'Attempt to connect to the remote server again', 'wp-migrate-db' ) );
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		$return['tables']                 = $this->get_tables();
		$return['prefixed_tables']        = $this->get_tables( 'prefix' );
		$return['table_sizes']            = $this->get_table_sizes();
		$return['table_rows']             = $this->get_table_row_count();
		$return['table_sizes_hr']         = array_map( array( $this, 'format_table_sizes' ), $this->get_table_sizes() );
		$return['path']                   = $this->absolute_root_file_path;
		$return['url']                    = home_url();
		$return['prefix']                 = $wpdb->prefix;
		$return['bottleneck']             = $this->get_bottleneck();
		$return['error']                  = 0;
		$return['plugin_version']         = $this->plugin_version;
		$return['domain']                 = $this->get_domain_current_site();
		$return['path_current_site']      = $this->get_path_current_site();
		$return['uploads_dir']            = $this->get_short_uploads_dir();
		$return['gzip']                   = ( $this->gzip() ? '1' : '0' );
		$return['post_types']             = $this->get_post_types();
		// TODO: Use WP_Filesystem API.
		$return['write_permissions']      = ( is_writeable( $this->get_upload_info( 'path' ) ) ? '1' : '0' );
		$return['upload_dir_long']        = $this->get_upload_info( 'path' );
		$return['temp_prefix']            = $this->temp_prefix;
		$return['lower_case_table_names'] = $this->get_lower_case_table_names_setting();
		$return                           = apply_filters( 'wpmdb_establish_remote_connection_data', $return );
		$result                           = $this->end_ajax( serialize( $return ) );

		return $result;
	}

	function get_short_home_address_from_url( $url ) {
		return untrailingslashit( str_replace( array( 'https://', 'http://', '//' ), '', $url ) );
	}

	function respond_to_process_push_migration_cancellation() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements(
			$this->post_data,
			array(
				'action',
				'intent',
				'url',
				'key',
				'form_data',
				'dump_filename',
				'temp_prefix',
				'stage',
			)
		);

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			echo esc_html( $this->invalid_content_verification_error );
			exit;
		}

		$this->form_data = $this->parse_migration_form_data( $filtered_post['form_data'] );

		if ( $filtered_post['stage'] == 'backup' ) {
			$this->delete_export_file( $filtered_post['dump_filename'], true );
		} else {
			$this->delete_temporary_tables( $filtered_post['temp_prefix'] );
		}

		exit;
	}

	function fire_migration_complete() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'url' ) );

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#138)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );

			return $result;
		}

		do_action( 'wpmdb_migration_complete', 'pull', $this->post_data['url'] );
		$result = $this->end_ajax();

		return $result;
	}

	function remove_exclude_post_revision_functionality() {
		$this->accepted_fields = array_diff( $this->accepted_fields, array( 'exclude_post_revisions' ) );
		remove_action( 'wpmdb_advanced_options', array( $this, 'template_exclude_post_revisions' ) );
	}

	function mask_licence( $licence ) {
		$licence_parts = explode( '-', $licence );
		$i = count( $licence_parts ) - 1;
		$masked_licence = '';

		foreach ( $licence_parts as $licence_part ) {
			if ( $i == 0 ) {
				$masked_licence .= $licence_part;
				continue;
			}

			$masked_licence .= '<span class="bull">';
			$masked_licence .= str_repeat( '&bull;', strlen( $licence_part ) ) . '</span>&ndash;';
			-- $i;
		}

		return $masked_licence;
	}

	function get_formatted_masked_licence() {
		return sprintf(
			'<p class="masked-licence">%s <a href="%s">%s</a></p>',
			$this->mask_licence( $this->settings['licence'] ),
			network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-remove-licence' ) . '&wpmdb-remove-licence=1#settings' ),
			_x( 'Remove', 'Delete license', 'wp-migrate-db' )
		);
	}

	function inject_addon_install_resource( $res, $action, $args ) {
		if ( 'plugin_information' != $action || empty( $args->slug ) ) {
			return $res;
		}

		$addons = get_site_transient( 'wpmdb_addons' );

		if ( ! isset( $addons[ $args->slug ] ) ) {
			return $res;
		}

		$addon            = $addons[ $args->slug ];
		$required_version = $this->get_required_version( $args->slug );
		$is_beta          = $this->is_beta_version( $required_version ) && ! empty( $addon['beta_version'] );

		$res                = new stdClass();
		$res->name          = 'WP Migrate DB Pro ' . $addon['name'];
		$res->version       = $is_beta ? $addon['beta_version'] : $addon['version'];
		$res->download_link = $this->get_plugin_update_download_url( $args->slug, $is_beta );
		$res->tested        = isset( $addon['tested'] ) ? $addon['tested'] : false;

		return $res;
	}

	function site_transient_update_plugins( $trans ) {
		$plugin_upgrade_data = $this->get_upgrade_data();

		if ( false === $plugin_upgrade_data || ! isset( $plugin_upgrade_data['wp-migrate-db-pro'] ) ) {
			return $trans;
		}

		foreach ( $plugin_upgrade_data as $plugin_slug => $upgrade_data ) {
			// If pre-1.1.2 version of Media Files addon, use the slug as folder name
			if ( ! isset( $GLOBALS['wpmdb_meta'][ $plugin_slug ]['folder'] ) ) {
				$plugin_folder = $plugin_slug;
			} else {
				$plugin_folder = $GLOBALS['wpmdb_meta'][ $plugin_slug ]['folder'];
			}

			$plugin_basename = sprintf( '%s/%s.php', $plugin_folder, $plugin_slug );
			$latest_version  = $this->get_latest_version( $plugin_slug );

			if ( ! isset( $GLOBALS['wpmdb_meta'][ $plugin_slug ]['version'] ) ) {
				$version_file = sprintf( '%s%s/version.php', $this->plugins_dir(), $plugin_folder );

				if ( file_exists( $version_file ) ) {
					include_once( $version_file );
					$installed_version = $GLOBALS['wpmdb_meta'][ $plugin_slug ]['version'];
				} else {
					$addon_file = sprintf( '%s%s/%s.php', $this->plugins_dir(), $plugin_folder, $plugin_slug );
					// No addon plugin file or version.php file, bail and move on to the next addon
					if ( ! file_exists( $addon_file ) ) {
						continue;
					}
					/*
					 * The addon's plugin file exists but a version.php file doesn't
					 * We're now assuming that the addon is outdated and provide an arbitrary out-of-date version number
					 * This will trigger a update notice
					 */
					$installed_version = $GLOBALS['wpmdb_meta'][ $plugin_slug ]['version'] = '0.1';
				}
			} else {
				$installed_version = $GLOBALS['wpmdb_meta'][ $plugin_slug ]['version'];
			}

			if ( isset( $installed_version ) && version_compare( $installed_version, $latest_version, '<' ) ) {
				$is_beta = $this->is_beta_version( $latest_version );

				$trans->response[ $plugin_basename ]              = new stdClass();
				$trans->response[ $plugin_basename ]->url         = $this->dbrains_api_base;
				$trans->response[ $plugin_basename ]->slug        = $plugin_slug;
				$trans->response[ $plugin_basename ]->package     = $this->get_plugin_update_download_url( $plugin_slug, $is_beta );
				$trans->response[ $plugin_basename ]->new_version = $latest_version;
				$trans->response[ $plugin_basename ]->id          = '0';
			}
		}

		return $trans;
	}

	function enqueue_plugin_update_script( $hook ) {
		if ( 'plugins.php' != $hook ) {
			return;
		}

		$min = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';

		$src = plugins_url( "asset/js/plugin-update$min.js", dirname( __FILE__ ) );
		wp_enqueue_script( 'wp-migrate-db-pro-plugin-update-script', $src, array( 'jquery' ), false, true );

		wp_localize_script( 'wp-migrate-db-pro-plugin-update-script', 'wpmdb_nonces', array( 'check_licence' => wp_create_nonce( 'check-licence' ), ) );

		wp_localize_script( 'wp-migrate-db-pro-plugin-update-script', 'wpmdb_update_strings', array( 'check_license_again' => __( 'Check my license again', 'wp-migrate-db' ), 'license_check_problem' => __( 'A problem occurred when trying to check the license, please try again.', 'wp-migrate-db' ), ) );
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
		</style><?php
	}

	function handle_table_backup() {
		$this->set_post_data();

		if ( isset( $this->form_data['gzip_file'] ) ) {
			unset( $this->form_data['gzip_file'] );
		}

		$this->maximum_chunk_size = $this->get_bottleneck();
		$sql_dump_file_name = $this->get_upload_info( 'path' ) . DIRECTORY_SEPARATOR;
		$sql_dump_file_name .= $this->format_dump_name( $this->post_data['dump_filename'] );
		$file_created = file_exists( $sql_dump_file_name );
		$this->fp = $this->open( $sql_dump_file_name );

		if ( $file_created == false ) {
			$this->db_backup_header();
		}

		$result = $this->export_table( $this->post_data['table'] );

		if ( isset( $this->fp ) ) {
			$this->close( $this->fp );
		}

		ob_start();
		$this->display_errors();
		$maybe_errors = trim( ob_get_clean() );

		if ( false === empty( $maybe_errors ) ) {
			$result = $this->end_ajax( $maybe_errors );

			return $result;
		}

		return $result;
	}

	/**
	 * AJAX handler for checking a licence.
	 *
	 * @return string (JSON)
	 */
	function ajax_check_licence() {
		$this->check_ajax_referer( 'check-licence' );
		$this->set_post_data();
		$licence          = ( empty( $this->post_data['licence'] ) ? $this->get_licence_key() : $this->post_data['licence'] );
		$response         = $this->check_licence( $licence );
		$decoded_response = json_decode( $response, ARRAY_A );
		if ( ! empty( $decoded_response['dbrains_api_down'] ) ) {
			$help_message = get_site_transient( 'wpmdb_help_message' );

			if ( ! $help_message ) {
				ob_start();
				?>
				<p><?php _e( 'If you have an <strong>active license</strong>, you may send an email to the following address.', 'wp-migrate-db' ); ?></p>
				<p><strong><?php _e( 'Please copy the Diagnostic Info &amp; Error Log info below into a text file and attach it to your email. Do the same for any other site involved in your email.', 'wp-migrate-db' ); ?></strong></p>
				<p class="email"><a class="button" href="mailto:wpmdb@deliciousbrains.com">wpmdb@deliciousbrains.com</a></p>
				<?php
				$help_message = ob_get_clean();
			}

			$decoded_response['message'] = $help_message;
		} elseif ( ! empty( $decoded_response['errors'] ) ) {
			$decoded_response['errors'] = array( sprintf( '<div class="notification-message warning-notice inline-message invalid-licence">%s</div>', $this->get_licence_status_message() ) );
		} elseif ( ! empty( $decoded_response['message'] ) && ! get_site_transient( 'wpmdb_help_message' ) ) {
			set_site_transient( 'wpmdb_help_message', $decoded_response['message'], $this->transient_timeout );
		}

		if ( isset( $decoded_response['addon_list'] ) ) {
			ob_start();
			$addons_available = ( $decoded_response['addons_available'] == '1' );
			if ( ! $addons_available ) {
				?>
				<p class="inline-message warning">
					<strong><?php _ex( 'Addons Unavailable', 'License does not allow use of addons', 'wp-migrate-db' ); ?></strong> &ndash; <?php printf( __( 'Addons are not included with the Personal license. Visit <a href="%s" target="_blank">My Account</a> to upgrade in just a few clicks.', 'wp-migrate-db' ), 'https://deliciousbrains.com/my-account/' ); ?>
				</p>
				<?php
			}

			// Save the addons list for use when installing
			// Don't really need to expire it ever, but let's clean it up after 60 days
			set_site_transient( 'wpmdb_addons', $decoded_response['addon_list'], HOUR_IN_SECONDS * 24 * 60 );

			foreach ( $decoded_response['addon_list'] as $key => $addon ) {
				$plugin_file = sprintf( '%1$s/%1$s.php', $key );
				$plugin_ids  = array_keys( get_plugins() );

				if ( in_array( $plugin_file, $plugin_ids ) ) {
					$actions = '<span class="status">' . _x( 'Installed', 'Installed on website but not activated', 'wp-migrate-db' );
					if ( is_plugin_active( $plugin_file ) ) {
						$actions .= ' &amp; ' . _x( 'Activated', 'Installed and activated on website', 'wp-migrate-db' ) . '</span>';
					} else {
						$activate_url = wp_nonce_url( network_admin_url( 'plugins.php?action=activate&amp;plugin=' . $plugin_file ), 'activate-plugin_' . $plugin_file );
						$actions .= sprintf( '</span> <a class="action" href="%s">%s</a>', $activate_url, _x( 'Activate', 'Enable addon so it may be used', 'wp-migrate-db' ) );
					}
				} else {
					$install_url = wp_nonce_url( network_admin_url( 'update.php?action=install-plugin&plugin=' . $key ), 'install-plugin_' . $key );
					$actions     = sprintf( '<a class="action" href="%s">%s</a>', $install_url, _x( 'Install', 'Download and activate addon', 'wp-migrate-db' ) );
				}

				$required_version = $this->get_required_version( $key );

				$download_url = $this->get_plugin_update_download_url( $key, $this->is_beta_version( $required_version ) );
				$actions .= sprintf( '<a class="action" href="%s">%s</a>', $download_url, _x( 'Download', 'Download to your computer', 'wp-migrate-db' ) ); ?>

				<article class="addon <?php echo esc_attr( $key ); ?>">
					<div class="desc">
						<?php if ( $addons_available ) : ?>
							<div class="actions"><?php echo $actions; ?></div>
						<?php endif; ?>

						<h1><?php echo $addon['name']; ?></h1>
						<p><?php echo $addon['desc']; ?></p>
					</div>
				</article> <?php
			}
			$addon_content = ob_get_clean();
			$decoded_response['addon_content'] = $addon_content;
		}

		$response = json_encode( $decoded_response );

		$result = $this->end_ajax( $response );

		return $result;
	}

	/**
	 * AJAX handler for activating a licence.
	 *
	 * @return string (JSON)
	 */
	function ajax_activate_licence() {
		$this->check_ajax_referer( 'activate-licence' );
		$this->set_post_data();
		$args = array(
			'licence_key' => urlencode( $this->post_data['licence_key'] ),
			'site_url'    => urlencode( home_url( '', 'http' ) )
		);

		$response         = $this->dbrains_api_request( 'activate_licence', $args );
		$decoded_response = json_decode( $response, true );

		if ( empty( $decoded_response['errors'] ) && empty( $decoded_response['dbrains_api_down'] ) ) {
			$this->set_licence_key( $this->post_data['licence_key'] );
			$decoded_response['masked_licence'] = $this->get_formatted_masked_licence();
		} else {
			if ( isset( $decoded_response['errors']['activation_deactivated'] ) ) {
				$this->set_licence_key( $this->post_data['licence_key'] );
			} elseif ( isset( $decoded_response['errors']['subscription_expired'] ) || isset( $decoded_response['dbrains_api_down'] ) ) {
				$this->set_licence_key( $this->post_data['licence_key'] );
				$decoded_response['masked_licence'] = $this->get_formatted_masked_licence();
			}

			set_site_transient( 'wpmdb_licence_response', $response, $this->transient_timeout );
			$decoded_response['errors'] = array(
				sprintf( '<div class="notification-message warning-notice inline-message invalid-licence">%s</div>', $this->get_licence_status_message( $decoded_response ) )
			);
			if ( isset( $decoded_response['dbrains_api_down'] ) ) {
				$decoded_response['errors'][] = $decoded_response['dbrains_api_down'];
			}
		}

		$result = $this->end_ajax( json_encode( $decoded_response ) );

		return $result;
	}

	/**
	 * Clear update transients when the user clicks the "Check Again" button from the update screen.
	 *
	 * @param object $current_screen
	 */
	function check_again_clear_transients( $current_screen ) {
		if ( ! isset( $current_screen->id ) || strpos( $current_screen->id, 'update-core' ) === false || ! isset( $_GET['force-check'] ) ) {
			return;
		}

		delete_site_transient( 'wpmdb_upgrade_data' );
		delete_site_transient( 'update_plugins' );
		delete_site_transient( 'wpmdb_licence_response' );
		delete_site_transient( 'wpmdb_dbrains_api_down' );
	}

	// After table migration, delete old tables and rename new tables removing the temporarily prefix
	function ajax_finalize_migration() {
		$this->check_ajax_referer( 'finalize-migration' );
		$this->set_post_data();
		global $wpdb;

		if ( $this->post_data['intent'] == 'pull' ) {
			$return = $this->finalize_migration();
		} else {
			do_action( 'wpmdb_migration_complete', 'push', $this->post_data['url'] );
			$data                = $this->filter_post_elements( $this->post_data, array( 'action', 'intent', 'url', 'key', 'form_data', 'prefix', 'type', 'location', 'tables', 'temp_prefix' ) );
			$data['action']      = 'wpmdb_remote_finalize_migration';
			$data['intent']      = 'pull';
			$data['prefix']      = $wpdb->prefix;
			$data['type']        = 'push';
			$data['location']    = home_url();
			$data['temp_prefix'] = $this->temp_prefix;
			$data['sig']         = $this->create_signature( $data, $data['key'] );
			$ajax_url            = trailingslashit( $this->post_data['url'] ) . 'wp-admin/admin-ajax.php';
			$response            = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			echo esc_html( $response );
			$this->display_errors();
			$return = ob_get_clean();
		}
		$result = $this->end_ajax( $return );

		return $result;
	}

	function finalize_migration() {
		$this->set_post_data();
		$tables      = explode( ',', $this->post_data['tables'] );
		$temp_prefix = $this->post_data['temp_prefix'];
		$temp_tables = array();

		foreach ( $tables as $table ) {
			$temp_tables[] = $temp_prefix . $table;
		}

		$sql = "SET FOREIGN_KEY_CHECKS=0;\n";

		$sql .= $this->get_preserved_options_queries( $temp_tables );

		foreach ( $temp_tables as $table ) {
			$sql .= 'DROP TABLE IF EXISTS ' . $this->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
			$sql .= "\n";
			$sql .= 'RENAME TABLE ' . $this->backquote( $table ) . ' TO ' . $this->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
			$sql .= "\n";
		}

		$alter_table_name = $this->get_alter_table_name();
		$sql .= $this->get_alter_queries();
		$sql .= 'DROP TABLE IF EXISTS ' . $this->backquote( $alter_table_name ) . ";\n";

		$process_chunk_result = $this->process_chunk( $sql );
		if ( true !== $process_chunk_result ) {
			$result = $this->end_ajax( $process_chunk_result );

			return $result;
		}

		$type     = ( isset( $this->post_data['type'] ) ) ? 'push' : 'pull';
		$location = ( isset( $this->post_data['location'] ) ) ? $this->post_data['location'] : $this->post_data['url'];

		if ( ! isset( $this->post_data['location'] ) ) {
			$data           = array();
			$data['action'] = 'wpmdb_fire_migration_complete';
			$data['url']    = home_url();
			$data['sig']    = $this->create_signature( $data, $this->post_data['key'] );
			$ajax_url       = trailingslashit( $this->post_data['url'] ) . 'wp-admin/admin-ajax.php';
			$response       = $this->remote_post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			echo esc_html( $response );
			$this->display_errors();
			$maybe_errors = trim( ob_get_clean() );
			if ( false === empty( $maybe_errors ) ) {
				$result = $this->end_ajax( $maybe_errors );

				return $result;
			}
		}

		// flush rewrite rules to prevent 404s and other oddities
		wp_cache_flush();
		global $wp_rewrite;
		$wp_rewrite->init();
		flush_rewrite_rules( true ); // true = hard refresh, recreates the .htaccess file

		do_action( 'wpmdb_migration_complete', $type, $location );
	}

	/**
	 * Returns SQL queries used to preserve options in the wp_options or wp_sitemeta tables during a migration.
	 *
	 * @param $temp_tables
	 *
	 * @return string DELETE and INSERT SQL queries separated by a newline character (\n).
	 */
	function get_preserved_options_queries( $temp_tables ) {
		$this->set_post_data();
		global $wpdb;
		$sql = '';

		$temp_tables  = array_flip( $temp_tables );
		$temp_prefix  = $this->post_data['temp_prefix'];
		$table_prefix = $this->post_data['prefix'];

		$options_table_name  = "{$temp_prefix}{$table_prefix}options";
		$sitemeta_table_name = "{$temp_prefix}{$table_prefix}sitemeta";

		// Return if multisite but sitemeta table not in migration scope
		if ( is_multisite() && ! isset( $temp_tables[ $sitemeta_table_name ] ) ) {
			return $sql;
		}

		// Return if options table not in migration scope
		if ( ! isset( $temp_tables[ $options_table_name ] ) ) {
			return $sql;
		}

		$prefix = esc_sql( $temp_prefix . $table_prefix );
		$preserved_options = array( 'wpmdb_settings', 'wpmdb_error_log', 'wpmdb_schema_version' );
		$preserved_sitemeta_options = $preserved_options;

		$this->form_data = $this->parse_migration_form_data( $this->post_data['form_data'] );

		if ( false === empty( $this->form_data['keep_active_plugins'] ) ) {
			$preserved_options[]          = 'active_plugins';
			$preserved_sitemeta_options[] = 'active_sitewide_plugins';
		}

		$preserved_options          = apply_filters( 'wpmdb_preserved_options', $preserved_options );
		$preserved_sitemeta_options = apply_filters( 'wpmdb_preserved_sitemeta_options', $preserved_sitemeta_options );

		if ( is_multisite() ) {
			$preserved_sitemeta_options_data = $wpdb->get_results(
				sprintf(
					"SELECT * FROM %ssitemeta WHERE `meta_key` IN ('%s')",
					$wpdb->prefix,
					implode( "','", $preserved_sitemeta_options )
				),
				ARRAY_A
			);

			foreach ( $preserved_sitemeta_options_data as $option ) {
				$sql .= $wpdb->prepare( "DELETE FROM `{$prefix}sitemeta` WHERE `meta_key` = %s;\n", $option['meta_key'] );
				$sql .= $wpdb->prepare(
					"INSERT INTO `{$prefix}sitemeta` ( `meta_id`, `site_id`, `meta_key`, `meta_value` ) VALUES ( NULL , %s, %s, %s );\n",
					$option['site_id'],
					$option['meta_key'],
					$option['meta_value']
				);
			}
		}

		$preserved_options_data = $wpdb->get_results(
			sprintf(
				"SELECT * FROM %soptions WHERE `option_name` IN ('%s')",
				$wpdb->prefix,
				implode( "','", $preserved_options )
			),
			ARRAY_A
		);

		foreach ( $preserved_options_data as $option ) {
			$sql .= $wpdb->prepare( "DELETE FROM `{$prefix}options` WHERE `option_name` = %s;\n", $option['option_name'] );
			$sql .= $wpdb->prepare(
				"INSERT INTO `{$prefix}options` ( `option_id`, `option_name`, `option_value`, `autoload` ) VALUES ( NULL , %s, %s, %s );\n",
				$option['option_name'],
				$option['option_value'],
				$option['autoload']
			);
		}

		return $sql;
	}

	function ajax_process_chunk() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'table', 'chunk_gzipped' ) );
		$gzip          = ( isset( $this->post_data['chunk_gzipped'] ) && $this->post_data['chunk_gzipped'] );

		$tmp_file_name = 'chunk.txt';

		if ( $gzip ) {
			$tmp_file_name .= '.gz';
		}

		$tmp_file_path = wp_tempnam( $tmp_file_name );

		if ( ! isset( $_FILES['chunk']['tmp_name'] ) || ! move_uploaded_file( $_FILES['chunk']['tmp_name'], $tmp_file_path ) ) {
			$result = $this->end_ajax( __( 'Could not upload the SQL to the server. (#135)', 'wp-migrate-db' ) );

			return $result;
		}

		if ( false === ( $chunk = file_get_contents( $tmp_file_path ) ) ) {
			$result = $this->end_ajax( __( 'Could not read the SQL file we uploaded to the server. (#136)', 'wp-migrate-db' ) );

			return $result;
		}

		// TODO: Use WP_Filesystem API.
		@unlink( $tmp_file_path );

		$filtered_post['chunk'] = $chunk;

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#130)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );

			return $result;
		}

		if ( $this->settings['allow_push'] != true ) {
			$result = $this->end_ajax( __( 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#139)', 'wp-migrate-db' ) );

			return $result;
		}

		if ( $gzip ) {
			$filtered_post['chunk'] = gzuncompress( $filtered_post['chunk'] );
		}

		$process_chunk_result = $this->process_chunk( $filtered_post['chunk'] );
		$result               = $this->end_ajax( $process_chunk_result );

		return $result;
	}

	function delete_temporary_tables( $prefix ) {
		$tables         = $this->get_tables();
		$delete_queries = '';

		foreach ( $tables as $table ) {
			if ( 0 !== strpos( $table, $prefix ) ) {
				continue;
			}
			$delete_queries .= sprintf( "DROP TABLE %s;\n", $this->backquote( $table ) );
		}

		$this->process_chunk( $delete_queries );
	}

	function get_sensible_pull_limit() {
		return apply_filters( 'wpmdb_sensible_pull_limit', min( 26214400, $this->settings['max_request'] ) );
	}

	function ajax_reset_api_key() {
		$this->check_ajax_referer( 'reset-api-key' );
		$this->settings['key'] = $this->generate_key();
		update_site_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax( sprintf( "%s\n%s", site_url( '', 'https' ), $this->settings['key'] ) );

		return $result;
	}

	function ajax_save_setting() {
		$this->check_ajax_referer( 'save-setting' );
		$this->set_post_data();
		$this->settings[ $this->post_data['setting'] ] = ( $this->post_data['checked'] == 'false' ) ? false : true;
		update_site_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax();

		return $result;
	}

	function get_plugin_title() {
		return __( 'Migrate DB Pro', 'wp-migrate-db' );
	}

	/**
	 * Sends the local WP Migrate DB Pro licence to the remote machine and activates it, returns errors if applicable.
	 *
	 * @return array Empty array or an array containing an error message.
	 */
	function ajax_copy_licence_to_remote_site() {
		$this->check_ajax_referer( 'copy-licence-to-remote-site' );
		$this->set_post_data();
		$return = array();

		$data = array(
			'action'  => 'wpmdb_copy_licence_to_remote_site',
			'licence' => $this->get_licence_key(),
		);

		$data['sig']         = $this->create_signature( $data, $this->post_data['key'] );
		$ajax_url            = trailingslashit( $this->post_data['url'] ) . 'wp-admin/admin-ajax.php';
		$serialized_response = $this->remote_post( $ajax_url, $data, __FUNCTION__, array(), true );

		if ( false === $serialized_response ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $this->error );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		$response = unserialize( trim( $serialized_response ) );

		if ( false === $response ) {
			$error_msg = __( 'Failed attempting to unserialize the response from the remote server. Please contact support.', 'wp-migrate-db' );
			$return    = array( 'wpmdb_error' => 1, 'body' => $error_msg );
			$this->log_error( $error_msg, $serialized_response );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		if ( isset( $response['error'] ) && $response['error'] == 1 ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $response['message'] );
			$this->log_error( $response['message'], $response );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		$result = $this->end_ajax( json_encode( $return ) );

		return $result;
	}

	/**
	 * Stores and attempts to activate the licence key received via a remote machine, returns errors if applicable.
	 *
	 * @return array Empty array or an array containing an error message.
	 */
	function respond_to_copy_licence_to_remote_site() {
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'licence' ) );

		$return = array();

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$return['error']   = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#142)';
			$this->log_error( $return['message'], $filtered_post );
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		$this->set_licence_key( trim( $this->post_data['licence'] ) );
		$licence        = $this->get_licence_key();
		$licence_status = json_decode( $this->check_licence( $licence ), true );

		if ( isset( $licence_status['errors'] ) && ! isset( $licence_status['errors']['subscription_expired'] ) ) {
			$return['error']   = 1;
			$return['message'] = reset( $licence_status['errors'] );
			$this->log_error( $return['message'], $licence_status );
			$result = $this->end_ajax( serialize( $return ) );

			return $result;
		}

		$result = $this->end_ajax( serialize( $return ) );

		return $result;
	}

	/**
	 * Attempts to reactivate this instance via the Delicious Brains API.
	 *
	 * @return array Empty array or an array containing an error message.
	 */
	function ajax_reactivate_licence() {
		$this->check_ajax_referer( 'reactivate-licence' );
		$this->set_post_data();
		$filtered_post = $this->filter_post_elements( $this->post_data, array( 'action', 'nonce' ) );
		$return        = array();

		$args = array(
			'licence_key' => urlencode( $this->get_licence_key() ),
			'site_url'    => urlencode( home_url( '', 'http' ) ),
		);

		$response         = $this->dbrains_api_request( 'reactivate_licence', $args );
		$decoded_response = json_decode( $response, true );

		if ( isset( $decoded_response['dbrains_api_down'] ) ) {
			$return['wpmdb_dbrains_api_down'] = 1;
			$return['body'] = $decoded_response['dbrains_api_down'];
			$result = $this->end_ajax( json_encode( $return ) );
			return $result;
		}

		if ( isset( $decoded_response['errors'] ) ) {
			$return['wpmdb_error'] = 1;
			$return['body']        = reset( $decoded_response['errors'] );
			$this->log_error( $return['body'], $decoded_response );
			$result = $this->end_ajax( json_encode( $return ) );

			return $result;
		}

		delete_site_transient( 'wpmdb_upgrade_data' );
		delete_site_transient( 'wpmdb_licence_response' );

		$result = $this->end_ajax( json_encode( array() ) );

		return $result;
	}
}
