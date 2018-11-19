<?php

namespace DeliciousBrains\WPMDB\Common\Plugin;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Properties\Properties;

class Assets {

	public $assets, $http, $filesystem, $settings, $props;
	/**
	 * @var ErrorLog
	 */
	private $error_log;

	public function __construct(
		Http $http,
		ErrorLog $error_log,
		Filesystem $filesystem,
		Properties $properties
	) {
		$this->http       = $http;
		$this->filesystem = $filesystem;
		$this->props      = $properties;
		$this->error_log  = $error_log;
	}

	/**
	 * Checks and sets up plugin assets.
	 * Filter actions, enqueue scripts, define configuration, and constants.
	 *
	 * @return void
	 */
	function load_assets() {
		$this->http->http_verify_download();

		$log = $this->error_log;
		$log->http_prepare_download_log();

		// add our custom CSS classes to <body>
		add_filter( 'admin_body_class', array( $this, 'admin_body_class' ) );

		$plugins_url = trailingslashit( plugins_url( $this->props->plugin_folder_name ) );
		$version     = \defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? time() : $this->props->plugin_version;
		$ver_string  = '-' . str_replace( '.', '', $this->props->plugin_version );

		$src = $plugins_url . 'asset/build/css/styles.css';
		wp_enqueue_style( 'wp-migrate-db-pro-styles', $src, [], $version );

		do_action( 'wpmdb_load_assets' );

		$src = $plugins_url . "asset/build/js/bundle{$ver_string}.js";
		wp_enqueue_script( 'wp-migrate-db-pro-script', $src, [ 'jquery', 'backbone' ], $version, true );

		wp_localize_script( 'wp-migrate-db-pro-script',
			'wpmdb_strings',
			apply_filters( 'wpmdb_js_strings', array(
				'max_request_size_problem'              => __( 'A problem occurred when trying to change the maximum request size, please try again.', 'wp-migrate-db' ),
				'license_check_problem'                 => __( 'A problem occurred when trying to check the license, please try again.', 'wp-migrate-db' ),
				'establishing_remote_connection'        => __( 'Establishing connection to remote server, please wait', 'wp-migrate-db' ),
				'connection_local_server_problem'       => __( 'A problem occurred when attempting to connect to the local server, please check the details and try again.', 'wp-migrate-db' ),
				'enter_license_key'                     => __( 'Please enter your license key.', 'wp-migrate-db' ),
				'register_license_problem'              => __( 'A problem occurred when trying to register the license, please try again.', 'wp-migrate-db' ),
				'license_registered'                    => __( 'Your license has been activated. You will now receive automatic updates and access to email support.', 'wp-migrate-db' ),
				'fetching_license'                      => __( 'Fetching license details, please wait…', 'wp-migrate-db' ),
				'clear_log_problem'                     => __( 'An error occurred when trying to clear the debug log. Please contact support. (#132)', 'wp-migrate-db' ),
				'update_log_problem'                    => __( 'An error occurred when trying to update the debug log. Please contact support. (#133)', 'wp-migrate-db' ),
				'please_select_one_table'               => __( 'Please select at least one table to migrate.', 'wp-migrate-db' ),
				'please_select_one_table_backup'        => __( 'Please select at least one table for backup.', 'wp-migrate-db' ),
				'please_select_one_table_import'        => __( 'Please select at least one table for the find & replace', 'wp-migrate-db' ),
				'enter_name_for_profile'                => __( 'Please enter a name for your migration profile.', 'wp-migrate-db' ),
				'save_profile_problem'                  => __( 'An error occurred when attempting to save the migration profile. Please see the Help tab for details on how to request support. (#118)', 'wp-migrate-db' ),
				'exporting_complete'                    => _x( 'Export complete', 'Data has been successfully exported', 'wp-migrate-db' ),
				'exporting_please_wait'                 => __( 'Exporting, please wait…', 'wp-migrate-db' ),
				'please_wait'                           => __( 'please wait…', 'wp-migrate-db' ),
				'complete'                              => _x( 'complete', 'Finished successfully', 'wp-migrate-db' ),
				'migration_failed'                      => _x( 'Migration failed', 'Copy of data between servers did not complete', 'wp-migrate-db' ),
				'backing_up'                            => _x( 'Backing up', 'Saving a copy of the data before import', 'wp-migrate-db' ),
				'queued'                                => _x( 'Queued', 'In line to be processed', 'wp-migrate-db' ),
				'migrating'                             => _x( 'Migrating', 'Copying data between servers', 'wp-migrate-db' ),
				'running'                               => _x( 'Running', 'Process is active', 'wp-migrate-db' ),
				'status'                                => _x( 'Status', 'Current request status', 'wp-migrate-db' ),
				'response'                              => _x( 'Response', 'The message the server responded with', 'wp-migrate-db' ),
				'table_process_problem'                 => __( 'A problem occurred when attempting to process the following table (#113)', 'wp-migrate-db' ),
				'table_process_problem_empty_response'  => __( 'A problem occurred when processing the following table. We were expecting a response in JSON format but instead received an empty response.', 'wp-migrate-db' ),
				'completed_with_some_errors'            => __( 'Migration completed with some errors', 'wp-migrate-db' ),
				'completed_dump_located_at'             => __( 'Migration complete, your backup is located at:', 'wp-migrate-db' ),
				'finalize_tables_problem'               => __( 'A problem occurred when finalizing the backup. (#140)', 'wp-migrate-db' ),
				'saved'                                 => _x( 'Saved', 'The settings were saved successfully', 'wp-migrate-db' ),
				'reset_api_key'                         => __( 'Any sites setup to use the current secret key will no longer be able to connect. You will need to update those sites with the newly generated secret key. Do you wish to continue?', 'wp-migrate-db' ),
				'reset_api_key_problem'                 => __( 'An error occurred when trying to generate the secret key. Please see the Help tab for details on how to request support. (#105)', 'wp-migrate-db' ),
				'remove_profile'                        => __( 'You are about to remove the migration profile "{{profile}}". This cannot be undone. Do you wish to continue?', 'wp-migrate-db' ),
				'remove_profile_problem'                => __( 'An error occurred when trying to delete the profile. Please see the Help tab for details on how to request support. (#106)', 'wp-migrate-db' ),
				'remove_profile_not_found'              => __( "The selected migration profile could not be deleted because it was not found.\nPlease refresh this page to see an accurate list of the currently available migration profiles.", 'wp-migrate-db' ),
				'change_connection_info'                => __( 'If you change the connection details, you will lose any replaces and table selections you have made below. Do you wish to continue?', 'wp-migrate-db' ),
				'enter_connection_info'                 => __( 'Please enter the connection information above to continue.', 'wp-migrate-db' ),
				'save_settings_problem'                 => __( 'An error occurred when trying to save the settings. Please try again. If the problem persists, please see the Help tab for details on how to request support. (#108)', 'wp-migrate-db' ),
				'connection_info_missing'               => __( 'The connection information appears to be missing, please enter it to continue.', 'wp-migrate-db' ),
				'connection_info_incorrect'             => __( "The connection information appears to be incorrect, it should consist of two lines. The first being the remote server's URL and the second being the secret key.", 'wp-migrate-db' ),
				'connection_info_url_invalid'           => __( 'The URL on the first line appears to be invalid, please check it and try again.', 'wp-migrate-db' ),
				'connection_info_key_invalid'           => __( 'The secret key on the second line appears to be invalid. It should be a 40 character string that consists of letters, numbers and special characters only.', 'wp-migrate-db' ),
				'connection_info_local_url'             => __( "It appears you've entered the URL for this website, you need to provide the URL of the remote website instead.", 'wp-migrate-db' ),
				'connection_info_local_key'             => __( 'Looks like your remote secret key is the same as the secret key for this site. To fix this, go to the <a href="#settings">Settings tab</a> and click "Reset Secret Key"', 'wp-migrate-db' ),
				'time_elapsed'                          => __( 'Time Elapsed:', 'wp-migrate-db' ),
				'pause'                                 => _x( 'Pause', 'Temporarily stop migrating', 'wp-migrate-db' ),
				'migration_paused'                      => _x( 'Migration Paused', 'The migration has been temporarily stopped', 'wp-migrate-db' ),
				'find_replace_paused'                   => _x( 'Find &amp; Replace Paused', 'The find & replace has been temporarily stopped', 'wp-migrate-db' ),
				'resume'                                => _x( 'Resume', 'Restart migrating after it was paused', 'wp-migrate-db' ),
				'completing_current_request'            => __( 'Completing current request', 'wp-migrate-db' ),
				'cancelling_migration'                  => _x( 'Cancelling migration', 'The migration is being cancelled', 'wp-migrate-db' ),
				'cancelling_find_replace'               => _x( 'Cancelling find &amp; replace', 'The find & replace is being cancelled', 'wp-migrate-db' ),
				'paused'                                => _x( 'Paused', 'The migration has been temporarily stopped', 'wp-migrate-db' ),
				'pause_before_finalize_find_replace'    => __( 'Pause before finalizing the updates', 'wp-migrate-db' ),
				'paused_before_finalize'                => __( 'Automatically paused before migrated tables are replaced. Click "Resume" or "Cancel" when ready.', 'wp-migrate-db' ),
				'find_replace_paused_before_finalize'   => __( 'Automatically paused before the find &amp; replace was finalized. Click "Resume" or "Cancel" when ready.', 'wp-migrate-db-pro' ),
				'removing_local_sql'                    => __( 'Removing the local MySQL export file', 'wp-migrate-db' ),
				'removing_local_backup'                 => __( 'Removing the local backup MySQL export file', 'wp-migrate-db' ),
				'removing_local_temp_tables'            => __( 'Removing the local temporary tables', 'wp-migrate-db' ),
				'removing_remote_sql'                   => __( 'Removing the remote backup MySQL export file', 'wp-migrate-db' ),
				'removing_remote_temp_tables'           => __( 'Removing the remote temporary tables', 'wp-migrate-db' ),
				'migration_cancellation_failed'         => __( 'Migration cancellation failed', 'wp-migrate-db' ),
				'manually_remove_temp_files'            => __( 'A problem occurred while cancelling the migration, you may have to manually delete some temporary files / tables.', 'wp-migrate-db' ),
				'migration_cancelled'                   => _x( 'Migration cancelled', 'The migration has been cancelled', 'wp-migrate-db' ),
				'migration_cancelled_success'           => __( 'The migration has been stopped and all temporary files and data have been cleaned up.', 'wp-migrate-db' ),
				'find_replace_cancelled'                => _x( 'Find &amp; replace cancelled', 'The migration has been cancelled', 'wp-migrate-db' ),
				'find_replace_cancelled_success'        => __( 'The find &amp; replace has been cancelled and all temporary data has been cleaned up.', 'wp-migrate-db' ),
				'migration_complete'                    => _x( 'Migration complete', 'The migration completed successfully', 'wp-migrate-db' ),
				'finalizing_migration'                  => _x( 'Finalizing migration', 'The migration is in the last stages', 'wp-migrate-db' ),
				'flushing'                              => _x( 'Flushing caches and rewrite rules', 'The caches and rewrite rules for the target are being flushed', 'wp-migrate-db' ),
				'blacklist_problem'                     => __( 'A problem occurred when trying to add plugins to backlist.', 'wp-migrate-db' ),
				'mu_plugin_confirmation'                => __( "If confirmed we will install an additional WordPress 'Must Use' plugin. This plugin will allow us to control which plugins are loaded during WP Migrate DB Pro specific operations. Do you wish to continue?", 'wp-migrate-db' ),
				'plugin_compatibility_settings_problem' => __( 'A problem occurred when trying to change the plugin compatibility setting.', 'wp-migrate-db' ),
				'sure'                                  => _x( 'Sure?', 'Confirmation required', 'wp-migrate-db' ),
				'pull_migration_label_migrating'        => __( 'Pulling from %s…', 'wp-migrate-db' ),
				'pull_migration_label_completed'        => __( 'Pull from %s complete', 'wp-migrate-db' ),
				'push_migration_label_migrating'        => __( 'Pushing to %s…', 'wp-migrate-db' ),
				'push_migration_label_completed'        => __( 'Push to %s complete', 'wp-migrate-db' ),
				'find_replace_label_migrating'          => __( 'Running Find & Replace…', 'wp-migrate-db' ),
				'find_replace_label_completed'          => __( 'Find & Replace complete', 'wp-migrate-db' ),
				'import_label_migrating'                => __( 'Importing…', 'wp-migrate-db' ),
				'import_label_completed'                => __( 'Import complete', 'wp-migrate-db' ),
				'copying_license'                       => __( 'Copying license to the remote site, please wait', 'wp-migrate-db' ),
				'attempting_to_activate_licence'        => __( 'Attempting to activate your license, please wait…', 'wp-migrate-db' ),
				'licence_reactivated'                   => __( 'License successfully activated, please wait…', 'wp-migrate-db' ),
				'activate_licence_problem'              => __( 'An error occurred when trying to reactivate your license. Please provide the following information when requesting support:', 'wp-migrate-db' ),
				'temporarily_activated_licence'         => __( "<strong>We've temporarily activated your licence and will complete the activation once the Delicious Brains API is available again.</strong><br />Please refresh this page to continue.", 'wp-migrate-db' ),
				'ajax_json_message'                     => __( 'JSON Decoding Failure', 'wp-migrate-db' ),
				'ajax_json_errors'                      => __( 'Our AJAX request was expecting JSON but we received something else. Often this is caused by your theme and/or plugins spitting out PHP errors. If you can edit the theme or plugins causing the errors, you should be able to fix them up, but if not, you can set WP_DEBUG to false in wp-config.php to disable errors from showing up.', 'wp-migrate-db' ),
				'ajax_php_errors'                       => __( 'Our AJAX request was expecting JSON but we received something else', 'wp-migrate-db' ),
				'view_error_messages'                   => __( 'View error messages', 'wp-migrate-db' ),
				'delaying_next_request'                 => __( 'Waiting %s seconds before executing next step', 'wp-migrate-db' ),
				'delay_between_requests_problem'        => __( 'A problem occurred when trying to change the delay between requests, please try again.', 'wp-migrate-db' ),
				'flush_problem'                         => __( 'A problem occurred when flushing caches and rewrite rules. (#145)', 'wp-migrate-db' ),
				'migrate_button_push'                   => _x( 'Push', 'Transfer this database to the remote site', 'wp-migrate-db' ),
				'migrate_button_push_save'              => _x( 'Push &amp; Save', 'Transfer this database to the remote site and save migration profile', 'wp-migrate-db' ),
				'migrate_button_pull'                   => _x( 'Pull', 'Transfer the remote database to this site', 'wp-migrate-db' ),
				'migrate_button_pull_save'              => _x( 'Pull &amp; Save', 'Transfer the remote database to this site and save migration profile', 'wp-migrate-db' ),
				'migrate_button_export'                 => _x( 'Export', 'Download a copy of the database', 'wp-migrate-db' ),
				'migrate_button_export_save'            => _x( 'Export &amp; Save', 'Download a copy of the database and save migration profile', 'wp-migrate-db' ),
				'migrate_button_import'                 => _x( 'Import', 'Import an SQL file into the database', 'wp-migrate-db' ),
				'migrate_button_import_save'            => _x( 'Import &amp; Save', 'Import an SQL file and save migration profile', 'wp-migrate-db' ),
				'migrate_button_find_replace'           => _x( 'Find &amp; Replace', 'Run a find and replace on the database', 'wp-migrate-db' ),
				'migrate_button_find_replace_save'      => _x( 'Find &amp; Replace &amp; Save', 'Run a find and replace and save migration profile', 'wp-migrate-db' ),
				'tables'                                => _x( 'Tables', 'database tables', 'wp-migrate-db' ),
				'files'                                 => __( 'Files', 'wp-migrate-db' ),
				'migrated'                              => _x( 'Migrated', 'Transferred', 'wp-migrate-db' ),
				'backed_up'                             => __( 'Backed Up', 'wp-migrate-db' ),
				'searched'                              => __( 'Searched', 'wp-migrate-db' ),
				'hide'                                  => _x( 'Hide', 'Obscure from view', 'wp-migrate-db' ),
				'show'                                  => _x( 'Show', 'Reveal', 'wp-migrate-db' ),
				'welcome_title'                         => __( 'Welcome to WP Migrate DB Pro! &#127881;', 'wp-migrate-db' ),
				'welcome_text'                          => __( 'Hey, this is the first time activating your license, nice! Your migrations are about to get awesome! If you haven’t already, you should check out our <a href="%1$s">Quick Start Guide</a> and <a href="%2$s">Videos</a>. If you run into any trouble at all, use the <strong>Help tab</strong> above to submit a support request.', 'wp-migrate-db' ),
				'title_progress'                        => __( '%1$s Stage %2$s of %3$s', 'wp-migrate-db' ),
				'title_paused'                          => __( 'Paused', 'wp-migrate-db' ),
				'title_cancelling'                      => __( 'Cancelling', 'wp-migrate-db' ),
				'title_cancelled'                       => __( 'Cancelled', 'wp-migrate-db' ),
				'title_finalizing'                      => __( 'Finalizing', 'wp-migrate-db' ),
				'title_complete'                        => __( 'Complete', 'wp-migrate-db' ),
				'title_error'                           => __( 'Failed', 'wp-migrate-db' ),
				'progress_items_truncated_msg'          => __( '%1$s items are not shown to maintain browser performance', 'wp-migrate-db' ),
				'clear_error_log'                       => _x( 'Cleared', 'Error log emptied', 'wp-migrate-db' ),
				'parsing_sql_file'                      => __( 'Parsing SQL file, please wait', 'wp-migrate-db' ),
				'invalid_sql_file'                      => __( 'The selected file does not have a recognized file type. Please upload a valid SQL file to continue.', 'wp-migrate-db' ),
				'please_select_sql_file'                => __( 'Please select an SQL export file above to continue.', 'wp-migrate-db' ),
				'import_profile_loaded'                 => sprintf( '<strong>%s</strong> &mdash; %s', __( 'Profile Loaded', 'wp-migrate-db' ), __( 'The selected profile has been loaded, please select an SQL export file above to continue.', 'wp-migrate-db' ) ),
				'uploading_file_to_server'              => __( 'Uploading file to the server', 'wp-migrate-db' ),
				'importing_file_to_db'                  => __( 'Importing data from %s', 'wp-migrate-db' ),
				'upload'                                => __( 'Upload', 'wp-migrate-db' ),
			) )
		);

		wp_enqueue_script( 'jquery' );
		wp_enqueue_script( 'jquery-ui-core' );
		wp_enqueue_script( 'jquery-ui-slider' );
		wp_enqueue_script( 'jquery-ui-sortable' );
	}

	function admin_body_class( $classes ) {
		if ( ! $classes ) {
			$classes = array();
		} else {
			$classes = explode( ' ', $classes );
		}

		$version_class = 'wpmdb-not-pro';
		if ( true == $this->props->is_pro ) {
			$version_class = 'wpmdb-pro';
		}

		$classes[] = $version_class;

		// Recommended way to target WP 3.8+
		// http://make.wordpress.org/ui/2013/11/19/targeting-the-new-dashboard-design-in-a-post-mp6-world/
		if ( version_compare( $GLOBALS['wp_version'], '3.8-alpha', '>' ) ) {
			if ( ! in_array( 'mp6', $classes ) ) {
				$classes[] = 'mp6';
			}
		}

		return implode( ' ', $classes );
	}
}
