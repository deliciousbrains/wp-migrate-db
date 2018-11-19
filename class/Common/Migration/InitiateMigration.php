<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationState;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class InitiateMigration {
	/**
	 * @var
	 */
	public $state_data;
	/**
	 * @var FormData
	 */
	public $form_data;
	/**
	 * @var MigrationStateManager
	 */
	private $migration_state_manager;
	/**
	 * @var Table
	 */
	private $table;
	/**
	 * @var Http
	 */
	private $http;
	/**
	 * @var Properties
	 */
	private $props;
	/**
	 * @var Helper
	 */
	private $http_helper;
	/**
	 * @var Util
	 */
	private $util;
	/**
	 * @var RemotePost
	 */
	private $remote_post;
	/**
	 * @var Filesystem
	 */
	private $filesystem;
	/**
	 * @var ErrorLog
	 */
	private $error_log;
	/**
	 * @var MigrationState
	 */
	private $migration_state;
	/**
	 * @var mixed
	 */
	private $form_data_arr;

	public function __construct(
		MigrationStateManager $migration_state_manager,
		MigrationState $migration_state,
		Table $table,
		Http $http,
		Helper $http_helper,
		Util $util,
		RemotePost $remote_post,
		FormData $form_data,
		Filesystem $filesystem,
		ErrorLog $error_log,
		Properties $properties
	) {

		$this->migration_state_manager = $migration_state_manager;
		$this->table                   = $table;
		$this->http                    = $http;
		$this->props                   = $properties;
		$this->http_helper             = $http_helper;
		$this->util                    = $util;
		$this->remote_post             = $remote_post;
		$this->form_data               = $form_data;
		$this->form_data_arr           = $form_data->getFormData();
		$this->filesystem              = $filesystem;
		$this->error_log               = $error_log;
		$this->migration_state         = $migration_state;
	}

	/**
	 * Occurs right before the first table is migrated / backed up during the migration process.
	 *
	 * @return string
	 *
	 * Does a quick check to make sure the verification string is valid and also opens / creates files for writing to (if required).
	 */
	function ajax_initiate_migration() {
		global $wpdb;

		$this->http->check_ajax_referer( 'initiate-migration' );

		$key_rules = array(
			'action'       => 'key',
			'intent'       => 'key',
			'url'          => 'url',
			'key'          => 'string',
			'form_data'    => 'string',
			'stage'        => 'key',
			'nonce'        => 'key',
			'temp_prefix'  => 'string',
			'site_details' => 'json_array',
			'export_dest'  => 'string',
			'import_info'  => 'array',
		);

		$state_data = $this->migration_state_manager->set_post_data( $key_rules );

		$this->form_data_arr = $this->form_data->parse_migration_form_data( $state_data['form_data'] );

		update_site_option( 'wpmdb_usage', array( 'action' => $state_data['intent'], 'time' => time() ) );

		// A little bit of house keeping.
		MigrationState::cleanup();

		if ( in_array( $state_data['intent'], array( 'find_replace', 'savefile', 'import' ) ) ) {
			$return = array(
				'code'    => 200,
				'message' => 'OK',
				'body'    => json_encode( array( 'error' => 0 ) ),
			);

			if ( 'import' === $state_data['intent'] ) {
				$return['import_path']     = $this->table->get_sql_dump_info( 'import', 'path' );
				$return['import_filename'] = wp_basename( $return['import_path'], '.sql' );

				if ( Util::gzip() && isset( $state_data['import_info']['import_gzipped'] ) && 'true' === $state_data['import_info']['import_gzipped'] ) {
					$return['import_path'] .= '.gz';
				}

				$this->table->delete_temporary_tables( $this->props->temp_prefix );
			}

			if ( in_array( $state_data['stage'], array( 'backup', 'migrate' ) ) ) {
				$return['dump_path']        = $this->table->get_sql_dump_info( $state_data['stage'], 'path' );
				$return['dump_filename']    = wp_basename( $return['dump_path'] );
				$return['dump_url']         = $this->table->get_sql_dump_info( $state_data['stage'], 'url' );
				$dump_filename_no_extension = substr( $return['dump_filename'], 0, - 4 );

				// sets up our table to store 'ALTER' queries
				$create_alter_table_query = $this->table->get_create_alter_table_query();
				$process_chunk_result     = $this->table->process_chunk( $create_alter_table_query );

				if ( true !== $process_chunk_result ) {
					$result = $this->http->end_ajax( $process_chunk_result );

					return $result;
				}

				if ( 'savefile' === $state_data['intent'] ) {
					if ( Util::gzip() && isset( $this->form_data_arr['gzip_file'] ) && $this->form_data_arr['gzip_file'] ) {
						$return['dump_path']     .= '.gz';
						$return['dump_filename'] .= '.gz';
						$return['dump_url']      .= '.gz';
					}

					$upload_path = $this->filesystem->get_upload_info( 'path' );

					if ( false === $this->filesystem->is_writable( $upload_path ) ) {
						$error  = sprintf( __( '<p><strong>Export Failed</strong> — We can\'t save your export to the following folder:<br><strong>%s</strong></p><p>Please adjust the permissions on this folder. <a href="%s" target="_blank">See our documentation for more information »</a></p>', 'wp-migrate-db' ), $upload_path, 'https://deliciousbrains.com/wp-migrate-db-pro/doc/uploads-folder-permissions/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin' );
						$return = array(
							'wpmdb_error' => 1,
							'body'        => $error,
						);
						$result = $this->http->end_ajax( json_encode( $return ) );

						return $result;
					}

					$fp = $this->filesystem->open( $upload_path . DIRECTORY_SEPARATOR . $return['dump_filename'] );
					$this->table->db_backup_header( $fp );
					$this->filesystem->close( $fp );
				}

				$return['dump_filename'] = $dump_filename_no_extension;
			}
		} else { // does one last check that our verification string is valid
			$data = array(
				'action'       => 'wpmdb_remote_initiate_migration',
				'intent'       => $state_data['intent'],
				'form_data'    => $state_data['form_data'],
				'site_details' => $state_data['site_details'],
			);

			$data['site_details'] = serialize( $data['site_details'] );

			$data['sig']          = $this->http_helper->create_signature( $data, $state_data['key'] );
			$data['site_details'] = addslashes( $data['site_details'] );
			$ajax_url             = $this->util->ajax_url();
			$response             = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );

			if ( false === $response ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $this->error_log->getError() );
				$result = $this->http->end_ajax( json_encode( $return ) );

				return $result;
			}

			$return = Util::unserialize( $response, __METHOD__ );

			if ( false === $return ) {
				$error_msg = __( 'Failed attempting to unserialize the response from the remote server. Please contact support.', 'wp-migrate-db' );
				$return    = array( 'wpmdb_error' => 1, 'body' => $error_msg );
				$this->error_log->log_error( $error_msg, $response );
				$result = $this->http->end_ajax( json_encode( $return ) );

				return $result;
			}

			if ( isset( $return['error'] ) && $return['error'] == 1 ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $return['message'] );
				$result = $this->http->end_ajax( json_encode( $return ) );

				return $result;
			}

			if ( 'pull' === $state_data['intent'] ) {

				// sets up our table to store 'ALTER' queries
				$create_alter_table_query = $this->table->get_create_alter_table_query();
				$process_chunk_result     = $this->table->process_chunk( $create_alter_table_query );
				if ( true !== $process_chunk_result ) {
					$result = $this->http->end_ajax( $process_chunk_result );

					return $result;
				}
			}

			if ( ! empty( $this->form_data_arr['create_backup'] ) && 'pull' === $state_data['intent'] ) {
				$return['dump_filename'] = wp_basename( $this->table->get_sql_dump_info( 'backup', 'path' ) );
				$return['dump_filename'] = substr( $return['dump_filename'], 0, - 4 );
				$return['dump_url']      = $this->table->get_sql_dump_info( 'backup', 'url' );
			}
		}

		$return['dump_filename'] = ( empty( $return['dump_filename'] ) ) ? '' : $return['dump_filename'];
		$return['dump_url']      = ( empty( $return['dump_url'] ) ) ? '' : $return['dump_url'];

		// A successful call to wpmdb_remote_initiate_migration for a Push migration will have set db_version.
		// Otherwise ensure it is set with own db_version so that we always return one.
		$return['db_version'] = ( empty( $return['db_version'] ) ) ? $wpdb->db_version() : $return['db_version'];

		// A successful call to wpmdb_remote_initiate_migration for a Push migration will have set site_url.
		// Otherwise ensure it is set with own site_url so that we always return one.
		$return['site_url'] = ( empty( $return['site_url'] ) ) ? site_url() : $return['site_url'];

		$return['find_replace_pairs'] = $this->parse_find_replace_pairs( $state_data['intent'], $return['site_url'] );

		// Store current migration state and return its id.
		$state = array_merge( $state_data, $return );
		unset( $return );

		$migration_id                 = $this->migration_state->id();
		$return['migration_state_id'] = $migration_id;
		$return                       = $this->migration_state_manager->save_migration_state( $state, $return, $migration_id );

		do_action( 'wpmdb_initiate_migration', $state_data );

		$result = $this->http->end_ajax( json_encode( $return ) );

		return $result;
	}

	function parse_find_replace_pairs( $intent = '', $site_url = '' ) {
		$find_replace_pairs     = array();
		$tmp_find_replace_pairs = array();
		if ( ! empty( $this->form_data_arr['replace_old'] ) && ! empty( $this->form_data_arr['replace_new'] ) ) {
			$tmp_find_replace_pairs = array_combine( $this->form_data_arr['replace_old'], $this->form_data_arr['replace_new'] );
		}

		$tmp_find_replace_pairs = apply_filters( 'wpmdb_find_and_replace', $tmp_find_replace_pairs, $intent, $site_url );

		if ( ! empty( $tmp_find_replace_pairs ) ) {
			$i = 1;
			foreach ( $tmp_find_replace_pairs as $replace_old => $replace_new ) {
				$find_replace_pairs['replace_old'][ $i ] = $replace_old;
				$find_replace_pairs['replace_new'][ $i ] = $replace_new;
				$i ++;
			}
		}

		return $find_replace_pairs;
	}

}
