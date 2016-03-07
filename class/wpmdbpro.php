<?php
class WPMDBPro extends WPMDB {

	function __construct( $plugin_file_path ) {
		$this->is_pro = true;
		$this->unhook_templates = array( 'exclude_post_revisions', 'wordpress_org_support', 'progress_upgrade', 'sidebar' );
		parent::__construct( $plugin_file_path );

		// templating actions
		add_action( 'wpmdb_notices', array( $this, 'template_outdated_addons_warning' ) );

		// Internal AJAX handlers
		add_action( 'wp_ajax_wpmdb_verify_connection_to_remote_site', array( $this, 'ajax_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_wpmdb_reset_api_key', array( $this, 'ajax_reset_api_key' ) );
		add_action( 'wp_ajax_wpmdb_save_setting', array( $this, 'ajax_save_setting' ) );
		add_action( 'wp_ajax_wpmdb_activate_licence', array( $this, 'ajax_activate_licence' ) );
		add_action( 'wp_ajax_wpmdb_check_licence', array( $this, 'ajax_check_licence' ) );

		// external AJAX handlers
		add_action( 'wp_ajax_nopriv_wpmdb_verify_connection_to_remote_site', array( $this, 'respond_to_verify_connection_to_remote_site' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_initiate_migration', array( $this, 'respond_to_remote_initiate_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_chunk', array( $this, 'ajax_process_chunk' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_pull_request', array( $this, 'respond_to_process_pull_request' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_fire_migration_complete', array( $this, 'fire_migration_complete' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_backup_remote_table', array( $this, 'respond_to_backup_remote_table' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_remote_finalize_migration', array( $this, 'respond_to_remote_finalize_migration' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_process_push_migration_cancellation', array( $this, 'respond_to_process_push_migration_cancellation' ) );

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

		// Removes the exclude post revision functionality (as seen in the free version of the plugin)
		$this->remove_exclude_post_revision_functionality();

		$this->add_tabs();

		// Stores a list of MySQL tables for use within the various plugin page templates
		$this->tables = $this->get_table_sizes();
	}

	function add_tabs() {
		$addon_tab = '<a href="#" class="nav-tab js-action-link addons" data-div-name="addons-tab">' . __( 'Addons', 'wp-migrate-db' ) . '</a>';
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
			'pull_checked'			=> ( $this->settings['allow_pull'] ) ? ' checked="checked"' : '',
			'push_checked'			=> ( $this->settings['allow_push'] ) ? ' checked="checked"' : '',
			'verify_ssl_checked'	=> ( $this->settings['verify_ssl'] ) ? ' checked="checked"' : '',
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

	function template_videos() {
		$args = array(
			'videos' => array(
				'SlfSuuePYaQ' => array(
					'title' => __( 'Feature Walkthrough', 'wp-migrate-db' ),
					'desc' => __( 'A brief walkthrough of the WP Migrate DB plugin showing all of the different options and explaining them.', 'wp-migrate-db' )
				),
				'IFdHIpf6jjc' => array(
					'title' => __( 'Pulling Live Data Into Your Local Development&nbsp;Environment', 'wp-migrate-db' ),
					'desc' => __( 'This screencast demonstrates how you can pull data from a remote, live WordPress install and update the data in your local development environment.', 'wp-migrate-db' )
				),
				'FjTzNqAlQE0' => array(
					'title' => __( 'Pushing Local Development Data to a Staging&nbsp;Environment', 'wp-migrate-db' ),
					'desc' => __( 'This screencast demonstrates how you can push a local WordPress database you\'ve been using for development to a staging environment.', 'wp-migrate-db' )
				),
				'0aR8-jC2XXM' => array(
					'title' => __( 'Media Files Addon Demo', 'wp-migrate-db' ),
					'desc' => __( 'A short demo of how the Media Files addon allows you to sync up your WordPress Media Libraries.', 'wp-migrate-db' )
				)
			)
		);
		$this->template( 'videos', 'pro', $args );
	}

	function template_outdated_addons_warning() {
		if ( true === apply_filters( 'wpmdb_hide_outdated_addons_warning', false ) ) {
			return;
		}
		$this->template( 'outdated-addons-warning', 'pro' );
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

	// AJAX endpoint for when the user pastes into the connection info box (or when they click "connect")
	// Responsible for contacting the remote website and retrieving info and testing the verification string
	function ajax_verify_connection_to_remote_site() {
		$this->check_ajax_referer( 'verify-connection-to-remote-site' );

		if ( ! $this->is_valid_licence() ) {
			$message = __( 'Please activate your license before attempting a pull or push migration.', 'wp-migrate-db' );
			$return = array( 'wpmdb_error' => 1, 'body' => $message );
			$result = $this->end_ajax( json_encode( $return ) );
			return $result;
		}

		$data = array(
			'action'  => 'wpmdb_verify_connection_to_remote_site',
			'intent' => $_POST['intent']
		);

		$data['sig'] = $this->create_signature( $data, $_POST['key'] );
		$ajax_url = trailingslashit( $_POST['url'] ) . 'wp-admin/admin-ajax.php';
		$timeout = apply_filters( 'wpmdb_prepare_remote_connection_timeout', 30 );
		$serialized_response = $this->remote_post( $ajax_url, $data, __FUNCTION__, compact( 'timeout' ), true );
		$url_bits = parse_url( $this->attempting_to_connect_to );

		if ( false === $serialized_response ) {
			$return = array( 'wpmdb_error' => 1, 'body' => $this->error );
			$result = $this->end_ajax( json_encode( $return ) );
			return $result;
		}

		$response = unserialize( trim( $serialized_response ) );

		if ( false === $response ) {
			$error_msg = __( 'Failed attempting to unserialize the response from the remote server. Please contact support.', 'wp-migrate-db' );
			$return = array( 'wpmdb_error' => 1, 'body' => $error_msg );
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

		if ( isset( $_POST['convert_post_type_selection'] ) && '1' == $_POST['convert_post_type_selection'] ) {
			$profile = (int) $_POST['profile'];
			unset( $this->settings['profiles'][$profile]['post_type_migrate_option'] );
			$this->settings['profiles'][$profile]['exclude_post_types'] = '1';
			$this->settings['profiles'][$profile]['select_post_types'] = array_values( array_diff( $response['post_types'], $this->settings['profiles'][$profile]['select_post_types'] ) );
			$response['select_post_types'] = $this->settings['profiles'][$profile]['select_post_types'];
			update_option( 'wpmdb_settings', $this->settings );
		}

		$response['scheme'] = $url_bits['scheme'];
		$return = json_encode( $response );

		$result = $this->end_ajax( $return );
		return $result;
	}

	function respond_to_remote_finalize_migration() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'form_data', 'prefix', 'type', 'location', 'tables', 'temp_prefix' ) );

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
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'last_table', 'gzip', 'primary_keys', 'path_current_site', 'domain_current_site' ) );
		$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#137)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );
			return $result;
		}

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );
		$result = $this->handle_table_backup();
		return $result;
	}

	function respond_to_process_pull_request() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'table', 'form_data', 'stage', 'bottleneck', 'prefix', 'current_row', 'dump_filename', 'pull_limit', 'last_table', 'gzip', 'primary_keys', 'path_current_site', 'domain_current_site' ) );

		// verification will fail unless we strip slashes on primary_keys and form_data
		$filtered_post['primary_keys'] = stripslashes( $filtered_post['primary_keys'] );
		$filtered_post['form_data'] = stripslashes( $filtered_post['form_data'] );

		if ( isset( $filtered_post['path_current_site'] ) ) {
			$filtered_post['path_current_site'] = stripslashes( $filtered_post['path_current_site'] );
		}

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#124)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );
			return $result;
		}

		if ( $this->settings['allow_pull'] != true ) {
			$result = $this->end_ajax( __( 'The connection succeeded but the remote site is configured to reject pull connections. You can change this in the "settings" tab on the remote site. (#132)', 'wp-migrate-db' ) );
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

	function respond_to_remote_initiate_migration() {
		$return = array();
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'form_data' ) );
		if ( $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			if ( isset( $this->settings['allow_' . $_POST['intent']] ) && ( true === $this->settings['allow_' . $_POST['intent']] || 1 === $this->settings['allow_' . $_POST['intent']] ) ) {
				$return['error'] = 0;
			} else {
				$return['error'] = 1;
				if ( $_POST['intent'] == 'pull' ) {
					$intent = __( 'pull', 'wp-migrate-db' );
				} else {
					$intent = __( 'push', 'wp-migrate-db' );
				}
				$return['message'] = sprintf( __( 'The connection succeeded but the remote site is configured to reject %s connections. You can change this in the "settings" tab on the remote site. (#110)', 'wp-migrate-db' ), $intent );
			}
		} else {
			$return['error'] = 1;
			$error_msg = $this->invalid_content_verification_error . ' (#111)';
			$this->log_error( $error_msg, $filtered_post );
			$return['message'] = $error_msg;
		}

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );

		if ( ! empty( $this->form_data['create_backup'] ) && $_POST['intent'] == 'push' ) {
			$return['dump_filename'] = basename( $this->get_sql_dump_info( 'backup', 'path' ) );
			$return['dump_filename'] = substr( $return['dump_filename'], 0, -4 );
			$return['dump_url'] = $this->get_sql_dump_info( 'backup', 'url' );
		}

		if ( $_POST['intent'] == 'push' ) {
			// sets up our table to store 'ALTER' queries
			$create_alter_table_query = $this->get_create_alter_table_query();
			$process_chunk_result = $this->process_chunk( $create_alter_table_query );
			if ( true !== $process_chunk_result ) {
				$result = $this->end_ajax( $process_chunk_result );
				return $result;
			}
		}

		$result = $this->end_ajax( serialize( $return ) );
		return $result;
	}

	function respond_to_verify_connection_to_remote_site() {
		global $wpdb;

		$return = array();

		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent' ) );
		if ( !$this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$return['error'] = 1;
			$return['message'] = $this->invalid_content_verification_error . ' (#120) <a href="#" class="try-again js-action-link">' . __( 'Try again?', 'wp-migrate-db' ) . '</a>';
			$this->log_error( $this->invalid_content_verification_error . ' (#120)', $filtered_post );
			$result = $this->end_ajax( serialize( $return ) );
			return $result;
		}

		if ( !isset( $this->settings['allow_' . $_POST['intent']] ) || $this->settings['allow_' . $_POST['intent']] != true ) {
			$return['error'] = 1;

			if ( $_POST['intent'] == 'pull' ) {
				$intent = __( 'pull', 'wp-migrate-db' );
			} else {
				$intent = __( 'push', 'wp-migrate-db' );
			}

			$return['message'] = sprintf( __( 'The connection succeeded but the remote site is configured to reject %s connections. You can change this in the "settings" tab on the remote site. (#122) <a href="#" class="try-again js-action-link">Try again?</a>', 'wp-migrate-db' ), $intent );
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

	function respond_to_process_push_migration_cancellation() {
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'intent', 'url', 'key', 'form_data', 'dump_filename', 'temp_prefix', 'stage' ) );

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			echo $this->invalid_content_verification_error;
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
		$filtered_post = $this->filter_post_elements( $_POST, array( 'action', 'url' ) );

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#138)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );
			return $result;
		}

		do_action( 'wpmdb_migration_complete', 'pull', $_POST['url'] );
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
			--$i;
		}

		return $masked_licence;
	}

	function get_formatted_masked_licence() {
		return sprintf( '<p class="masked-licence">%s <a href="%s">%s</a></p>', $this->mask_licence( $this->settings['licence'] ), network_admin_url( $this->plugin_base . '&nonce=' . wp_create_nonce( 'wpmdb-remove-licence' ) . '&wpmdb-remove-licence=1#settings' ), _x( 'Remove', '"Remove" in this context is used to delete a license, example formatting: xxxx-xxxx-xxxx Remove', 'wp-migrate-db' ) );
	}

	function inject_addon_install_resource( $res, $action, $args ) {
		if ( 'plugin_information' != $action || empty( $args->slug ) ) {
			return $res;
		}

		$addons = get_site_transient( 'wpmdb_addons' );

		if ( ! isset( $addons[$args->slug] ) ) {
			return $res;
		}

		$addon = $addons[$args->slug];
		$required_version = $this->get_required_version( $args->slug );
		$is_beta = $this->is_beta_version( $required_version ) && ! empty( $addon['beta_version'] );

		$res = new stdClass();
		$res->name = 'WP Migrate DB Pro ' . $addon['name'];
		$res->version = $is_beta ? $addon['beta_version'] : $addon['version'];
		$res->download_link = $this->get_plugin_update_download_url( $args->slug, $is_beta );

		return $res;
	}

	function site_transient_update_plugins( $trans ) {
		if ( ! is_admin() ) {
			return $trans; // only need to run this when in the dashboard
		}

		$plugin_upgrade_data = $this->get_upgrade_data();
		if ( false === $plugin_upgrade_data || ! isset( $plugin_upgrade_data['wp-migrate-db-pro'] ) ) {
			return $trans;
		}

		foreach ( $plugin_upgrade_data as $plugin_slug => $upgrade_data ) {
			// If pre-1.1.2 version of Media Files addon, use the slug as folder name
			if ( ! isset( $GLOBALS['wpmdb_meta'][$plugin_slug]['folder'] ) ) {
				$plugin_folder = $plugin_slug;
			} else {
				$plugin_folder = $GLOBALS['wpmdb_meta'][$plugin_slug]['folder'];
			}

			$plugin_basename = sprintf( '%s/%s.php', $plugin_folder, $plugin_slug );
			$latest_version = $this->get_latest_version( $plugin_slug );

			if ( ! isset( $GLOBALS['wpmdb_meta'][$plugin_slug]['version'] ) ) {
				$version_file = sprintf( '%s%s/version.php', $this->plugins_dir(), $plugin_folder );

				if ( file_exists( $version_file ) ) {
					include_once( $version_file );
					$installed_version = $GLOBALS['wpmdb_meta'][$plugin_slug]['version'];
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
					$installed_version = $GLOBALS['wpmdb_meta'][$plugin_slug]['version'] = '0.1';
				}

			} else {
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
		if ( 'plugins.php' != $hook ) {
			return;
		}

		$src = plugins_url( 'asset/js/plugin-update.js', dirname( __FILE__ ) );
		wp_enqueue_script( 'wp-migrate-db-pro-plugin-update-script', $src, array( 'jquery' ), false, true );

		wp_localize_script( 'wp-migrate-db-pro-plugin-update-script', 'wpmdb_l10n', array(
			'check_license_again'   => __( "Check my license again", 'wp-migrate-db' ),
			'license_check_problem' => __( "A problem occurred when trying to check the license, please try again.", 'wp-migrate-db' ),
		) );
	}

	function add_plugin_update_styles() { ?>
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

	function ajax_check_licence() {
		$this->check_ajax_referer( 'check-licence' );
		$licence = ( empty( $_POST['licence'] ) ? $this->get_licence_key() : $_POST['licence'] );
		$response = $this->check_licence( $licence );
		$decoded_response = json_decode( $response, ARRAY_A );

		ob_start();
		$addons_available = ( $decoded_response['addons_available'] == '1' );
		if ( ! $addons_available ) { ?>
			<p class="inline-message warning">
				<strong><?php _e( 'Addons Unavailable', 'wp-migrate-db' ); ?></strong> &ndash; <?php printf( __( 'Addons are not included with the Personal license. Visit <a href="%s" target="_blank">My Account</a> to upgrade in just a few clicks.', 'wp-migrate-db' ), 'https://deliciousbrains.com/my-account/' ); ?>
			</p><?php
		}

		// Save the addons list for use when installing
		// Don't really need to expire it ever, but let's clean it up after 60 days
		set_site_transient( 'wpmdb_addons', $decoded_response['addon_list'], HOUR_IN_SECONDS * 24 * 60 );

		foreach ( $decoded_response['addon_list'] as $key => $addon ) {
			$plugin_file = sprintf( '%1$s/%1$s.php', $key );
			$plugin_ids = array_keys( get_plugins() );

			if ( in_array( $plugin_file, $plugin_ids ) ) {
				$actions = '<span class="status">' . __( 'Installed', 'wp-migrate-db' );
				if ( is_plugin_active( $plugin_file ) ) {
					$actions .= ' &amp; ' . __( 'Activated', 'wp-migrate-db' ) . '</span>';
				} else {
					$activate_url = wp_nonce_url( network_admin_url( 'plugins.php?action=activate&amp;plugin=' . $plugin_file ), 'activate-plugin_'  . $plugin_file );
					$actions .= sprintf( '</span> <a class="action" href="%s">%s</a>', $activate_url, __( 'Activate', 'wp-migrate-db' ) );
				}
			} else {
				$install_url = wp_nonce_url( network_admin_url( 'update.php?action=install-plugin&plugin=' . $key ), 'install-plugin_' . $key );
				$actions = sprintf( '<a class="action" href="%s">%s</a>', $install_url, __( 'Install', 'wp-migrate-db' ) );
			}

			$required_version = $this->get_required_version( $key );

			$download_url = $this->get_plugin_update_download_url( $key, $this->is_beta_version( $required_version ) );
			$actions .= sprintf( '<a class="action" href="%s">%s</a>', $download_url, __( 'Download', 'wp-migrate-db' ) ); ?>

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
		$response = json_encode( $decoded_response );

		$result = $this->end_ajax( $response );
		return $result;
	}

	function ajax_activate_licence() {
		$this->check_ajax_referer( 'activate-licence' );
		$args = array(
			'licence_key' => $_POST['licence_key'],
			'site_url' => home_url( '', 'http' )
		);

		if ( $this->is_licence_constant() ) {
			$args['licence_key'] = $this->get_licence_key();
		}

		$response = $this->dbrains_api_request( 'activate_licence', $args );
		$response = json_decode( $response, true );

		if ( ! isset( $response['errors'] ) ) {
			if ( ! $this->is_licence_constant() ) {
				$this->settings['licence'] = $_POST['licence_key'];
			}
			update_option( 'wpmdb_settings', $this->settings );
			$response['masked_licence'] = $this->get_formatted_masked_licence();
		}

		$result = $this->end_ajax( json_encode( $response ) );
		return $result;
	}

	function check_again_clear_transients( $current_screen ) {
		if ( ! isset( $current_screen->id ) || strpos( $current_screen->id, 'update-core' ) === false || ! isset( $_GET['force-check'] ) ) {
			return;
		}

		delete_site_transient( 'wpmdb_upgrade_data' );
		delete_site_transient( 'update_plugins' );
		delete_site_transient( 'wpmdb_licence_response' );
	}

	// After table migration, delete old tables and rename new tables removing the temporarily prefix
	function ajax_finalize_migration() {
		$this->check_ajax_referer( 'finalize-migration' );
		global $wpdb;

		if ( $_POST['intent'] == 'pull' ) {
			$return = $this->finalize_migration();
		} else {
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

	function finalize_migration() {
		global $wpdb;

		$tables = explode( ',', $_POST['tables'] );
		$temp_prefix = stripslashes( $_POST['temp_prefix'] );
		$temp_tables = array();

		foreach ( $tables as $table ) {
			$temp_tables[] = $temp_prefix . $table;
		}

		$sql = "SET FOREIGN_KEY_CHECKS=0;\n";

		$preserved_options = array( 'wpmdb_settings', 'wpmdb_error_log' );

		$this->form_data = $this->parse_migration_form_data( $_POST['form_data'] );

		if ( isset( $this->form_data['keep_active_plugins'] ) ) {
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

		foreach ( $preserved_options_data as $option ) {
			$sql .= $wpdb->prepare( "DELETE FROM `{$_POST['prefix']}options` WHERE `option_name` = %s;\n", $option['option_name'] );
			$sql .= $wpdb->prepare( "INSERT INTO `{$_POST['prefix']}options` ( `option_id`, `option_name`, `option_value`, `autoload` ) VALUES ( NULL , %s, %s, %s );\n", $option['option_name'], $option['option_value'], $option['autoload'] );
		}

		$alter_table_name = $this->get_alter_table_name();
		$sql .= $this->get_alter_queries();
		$sql .= "DROP TABLE IF EXISTS " . $this->backquote( $alter_table_name ) . ";\n";

		$process_chunk_result = $this->process_chunk( $sql );
		if ( true !== $process_chunk_result ) {
			$result = $this->end_ajax( $process_chunk_result );
			return $result;
		}

		$type = ( isset( $_POST['type'] ) ) ? 'push' : 'pull';
		$location = ( isset( $_POST['location'] ) ) ? $_POST['location'] : $_POST['url'];

		if ( ! isset( $_POST['location'] ) ) {
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
			if ( false === empty( $maybe_errors ) ) {
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

		if ( $gzip ) {
			$tmp_file_name .= '.gz';
		}

		$tmp_file_path = wp_tempnam( $tmp_file_name );

		if ( !isset( $_FILES['chunk']['tmp_name'] ) || !move_uploaded_file( $_FILES['chunk']['tmp_name'], $tmp_file_path ) ) {
			$result = $this->end_ajax( __( 'Could not upload the SQL to the server. (#135)', 'wp-migrate-db' ) );
			return $result;
		}

		if ( false === ( $chunk = file_get_contents( $tmp_file_path ) ) ) {
			$result = $this->end_ajax( __( 'Could not read the SQL file we uploaded to the server. (#136)', 'wp-migrate-db' ) );
			return $result;
		}

		@unlink( $tmp_file_path );

		$filtered_post['chunk'] = $chunk;

		if ( ! $this->verify_signature( $filtered_post, $this->settings['key'] ) ) {
			$error_msg = $this->invalid_content_verification_error . ' (#130)';
			$this->log_error( $error_msg, $filtered_post );
			$result = $this->end_ajax( $error_msg );
			return $result;
		}

		if ( $this->settings['allow_push'] != true ) {
			$result = $this->end_ajax( __( 'The connection succeeded but the remote site is configured to reject push connections. You can change this in the "settings" tab on the remote site. (#133)', 'wp-migrate-db' ) );
			return $result;
		}

		if ( $gzip ) {
			$filtered_post['chunk'] = gzuncompress( $filtered_post['chunk'] );
		}

		$process_chunk_result = $this->process_chunk( $filtered_post['chunk'] );
		$result = $this->end_ajax( $process_chunk_result );
		return $result;
	}

	function delete_temporary_tables( $prefix ) {
		$tables = $this->get_tables();
		$delete_queries = '';

		foreach ( $tables as $table ) {
			if ( 0 !== strpos( $table, $prefix ) ) continue;
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
		update_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax( sprintf( "%s\n%s", site_url( '', 'https' ), $this->settings['key'] ) );
		return $result;
	}

	function ajax_save_setting() {
		$this->check_ajax_referer( 'save-setting' );
		$this->settings[ $_POST['setting'] ] = ( $_POST['checked'] == 'false' ) ? false : true;
		update_option( 'wpmdb_settings', $this->settings );
		$result = $this->end_ajax();
		return $result;
	}

	function get_plugin_title() {
		return __( 'Migrate DB Pro', 'wp-migrate-db' );
	}

}
