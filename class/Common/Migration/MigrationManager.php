<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\BackupExport;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationState;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Util;

class MigrationManager {

	public $state_data;
	/**
	 * @var FormData
	 */
	public $form_data;
	/**
	 * @var DynamicProperties
	 */
	public $dynamic_props;
	/**
	 * @var MigrationStateManager
	 */
	protected $migration_state_manager;
	/**
	 * @var Table
	 */
	protected $table;
	/**
	 * @var Http
	 */
	protected $http;
	/**
	 * @var Properties
	 */
	protected $props;
	/**
	 * @var TableHelper
	 */
	protected $table_helper;
	/**
	 * @var Helper
	 */
	protected $http_helper;
	/**
	 * @var Util
	 */
	protected $util;
	/**
	 * @var RemotePost
	 */
	protected $remote_post;
	/**
	 * @var Filesystem
	 */
	protected $filesystem;
	protected $fp;
	/**
	 * @var ErrorLog
	 */
	protected $error_log;
	/**
	 * @var MigrationState
	 */
	protected $migration_state;
	/**
	 * @var BackupExport
	 */
	protected $backup_export;
	/**
	 * @var Multisite
	 */
	protected $multisite;
	/**
	 * @var InitiateMigration
	 */
	protected $initiate_migration;
	/**
	 * @var FinalizeMigration
	 */
	protected $finalize_migration;

	/**
	 * @var mixed $form_data_arr
	 */
	private $form_data_arr;

	public function __construct(
		MigrationStateManager $migration_state_manager,
		MigrationState $migration_state,
		Table $table,
		Http $http,
		TableHelper $table_helper,
		Helper $http_helper,
		Util $util,
		RemotePost $remote_post,
		FormData $form_data,
		Filesystem $filesystem,
		ErrorLog $error_log,
		BackupExport $backup_export,//
		Multisite $multisite,
		InitiateMigration $initiate_migration,
		FinalizeMigration $finalize_migration,
		Properties $properties
	) {

		$this->migration_state_manager = $migration_state_manager;
		$this->table                   = $table;
		$this->http                    = $http;
		$this->props                   = $properties;
		$this->table_helper            = $table_helper;
		$this->http_helper             = $http_helper;
		$this->util                    = $util;
		$this->remote_post             = $remote_post;
		$this->filesystem              = $filesystem;
		$this->error_log               = $error_log;
		$this->migration_state         = $migration_state;
		$this->backup_export           = $backup_export;
		$this->multisite               = $multisite;
		$this->dynamic_props           = DynamicProperties::getInstance();
		$this->form_data               = $form_data;
		$this->form_data_arr           = $form_data->getFormData();
		$this->initiate_migration      = $initiate_migration;
		$this->finalize_migration      = $finalize_migration;
	}

	public function register() {
		add_action( 'wp_ajax_wpmdb_initiate_migration', array( $this->initiate_migration, 'ajax_initiate_migration' ) );
		add_action( 'wp_ajax_wpmdb_migrate_table', array( $this, 'ajax_migrate_table' ) );
		add_action( 'wp_ajax_wpmdb_cancel_migration', array( $this, 'ajax_cancel_migration' ) );
		add_action( 'wp_ajax_wpmdb_finalize_migration', array( $this->finalize_migration, 'ajax_finalize_migration' ) );
		add_action( 'wp_ajax_wpmdb_flush', array( $this, 'ajax_flush' ) );
		add_action( 'wp_ajax_nopriv_wpmdb_flush', array( $this, 'ajax_nopriv_flush', ) );
	}

	/**
	 * Called for each database table to be migrated.
	 *
	 * @return string
	 */
	function ajax_migrate_table() {
		$this->http->check_ajax_referer( 'migrate-table' );

		// This *might* be set to a file pointer below
		// @TODO using a global file pointer is extremely error prone and not a great idea
		$fp = null;

		$key_rules  = array(
			'action'              => 'key',
			'migration_state_id'  => 'key',
			'table'               => 'string',
			'stage'               => 'key',
			'current_row'         => 'numeric',
			'last_table'          => 'string',
			'primary_keys'        => 'string',
			'gzip'                => 'int',
			'nonce'               => 'key',
			'bottleneck'          => 'positive_int',
			'prefix'              => 'string',
			'path_current_site'   => 'string',
			'domain_current_site' => 'text',
			'import_info'         => 'array',
		);
		$state_data = $this->migration_state_manager->set_post_data( $key_rules );

		global $wpdb;

		$this->form_data_arr = $this->form_data->parse_migration_form_data( $state_data['form_data'] );

		if ( 'import' === $state_data['intent'] && ! $this->table->table_exists( $state_data['table'] ) ) {
			return $this->http->end_ajax( json_encode( array( 'current_row' => - 1 ) ) );
		}

		// checks if we're performing a backup, if so, continue with the backup and exit immediately after
		if ( $state_data['stage'] == 'backup' && $state_data['intent'] != 'savefile' ) {
			// if performing a push we need to backup the REMOTE machine's DB
			if ( $state_data['intent'] == 'push' ) {
				$data = $this->http_helper->filter_post_elements(
					$state_data,
					array(
						'action',
						'remote_state_id',
						'url',
						'table',
						'form_data',
						'stage',
						'bottleneck',
						'prefix',
						'current_row',
						'last_table',
						'gzip',
						'primary_keys',
						'path_current_site',
						'domain_current_site',
					)
				);

				$data['action']       = 'wpmdb_backup_remote_table';
				$data['intent']       = 'pull';
				$data['sig']          = $this->http_helper->create_signature( $data, $state_data['key'] );
				$data['primary_keys'] = addslashes( $data['primary_keys'] );
				$ajax_url             = $this->util->ajax_url();
				$response             = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
				ob_start();
				$this->util->display_errors();
				$maybe_errors = ob_get_clean();

				if ( false === empty( $maybe_errors ) ) {
					$maybe_errors = array( 'wpmdb_error' => 1, 'body' => $maybe_errors );
					$return       = json_encode( $maybe_errors );
				} else {
					$return = $response;
				}
			} else {
				$return = $this->handle_table_backup();
			}

			$result = $this->http->end_ajax( $return );

			return $result;
		}

		// Pull and push need to be handled differently for obvious reasons,
		// and trigger different code depending on the migration intent (push or pull).
		if ( in_array( $state_data['intent'], array( 'push', 'savefile', 'find_replace', 'import' ) ) ) {
			$this->dynamic_props->maximum_chunk_size = $this->util->get_bottleneck();

			if ( isset( $state_data['bottleneck'] ) ) {
				$this->dynamic_props->maximum_chunk_size = (int) $state_data['bottleneck'];
			}

			if ( 'savefile' === $state_data['intent'] ) {
				$sql_dump_file_name = $this->filesystem->get_upload_info( 'path' ) . DIRECTORY_SEPARATOR;
				$sql_dump_file_name .= $this->table_helper->format_dump_name( $state_data['dump_filename'] );
				$fp                 = $this->filesystem->open( $sql_dump_file_name );
			}

			if ( ! empty( $state_data['db_version'] ) ) {
				$this->dynamic_props->target_db_version = $state_data['db_version'];
				if ( 'push' == $state_data['intent'] ) {
					// $this->dynamic_props->target_db_version has been set to remote database's version.
					add_filter( 'wpmdb_create_table_query', array( $this->table_helper, 'mysql_compat_filter' ), 10, 5 );
				} elseif ( 'savefile' == $state_data['intent'] && ! empty( $this->form_data_arr['compatibility_older_mysql'] ) ) {
					// compatibility_older_mysql is currently a checkbox meaning pre-5.5 compatibility (we play safe and target 5.1),
					// this may change in the future to be a dropdown or radiobox returning the version to be compatible with.
					$this->dynamic_props->target_db_version = '5.1';
					add_filter( 'wpmdb_create_table_query', array( $this->table_helper, 'mysql_compat_filter' ), 10, 5 );
				}
			}

			if ( ! empty( $state_data['find_replace_pairs'] ) ) {
				$this->dynamic_props->find_replace_pairs = $state_data['find_replace_pairs'];
			}

			ob_start();
			$result = $this->table->process_table( $state_data['table'], $fp );

			if ( \is_resource( $fp ) && $state_data['intent'] === 'savefile' ) {
				$this->filesystem->close( $fp );
			}

			$this->util->display_errors();
			$maybe_errors = trim( ob_get_clean() );
			if ( false === empty( $maybe_errors ) ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $maybe_errors );
				$result = $this->http->end_ajax( json_encode( $return ) );

				return $result;
			}

			return $result;
		} else {
			$data = $this->http_helper->filter_post_elements(
				$state_data,
				array(
					'remote_state_id',
					'intent',
					'url',
					'table',
					'form_data',
					'stage',
					'bottleneck',
					'current_row',
					'last_table',
					'gzip',
					'primary_keys',
					'site_url',
					'find_replace_pairs',
				)
			);

			$data['action']     = 'wpmdb_process_pull_request';
			$data['pull_limit'] = $this->http_helper->get_sensible_pull_limit();
			$data['db_version'] = $wpdb->db_version();

			if ( is_multisite() ) {
				$data['path_current_site']   = $this->util->get_path_current_site();
				$data['domain_current_site'] = $this->multisite->get_domain_current_site();
			}

			$data['prefix'] = $wpdb->base_prefix;

			if ( isset( $data['find_replace_pairs'] ) ) {
				$data['find_replace_pairs'] = serialize( $data['find_replace_pairs'] );
			}

			if ( isset( $data['sig'] ) ) {
				unset( $data['sig'] );
			}

			$data['sig']                = $this->http_helper->create_signature( $data, $state_data['key'] );
			$data['primary_keys']       = addslashes( $data['primary_keys'] );
			$data['find_replace_pairs'] = addslashes( $data['find_replace_pairs'] );
			$ajax_url                   = $this->util->ajax_url();

			$response = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			$this->util->display_errors();
			$maybe_errors = trim( ob_get_clean() );

			if ( false === empty( $maybe_errors ) ) {
				$return = array( 'wpmdb_error' => 1, 'body' => $maybe_errors );
				$result = $this->http->end_ajax( json_encode( $return ) );

				return $result;
			}

			if ( strpos( $response, ';' ) === false ) {
				$result = $this->http->end_ajax( $response );

				return $result;
			}

			// returned data is just a big string like this query;query;query;33
			// need to split this up into a chunk and row_tracker
			$row_information = trim( substr( strrchr( $response, "\n" ), 1 ) );
			$row_information = explode( ',', $row_information );
			$chunk           = substr( $response, 0, strrpos( $response, ";\n" ) + 1 );

			if ( ! empty( $chunk ) ) {
				$process_chunk_result = $this->table->process_chunk( $chunk );
				if ( true !== $process_chunk_result ) {
					$result = $this->http->end_ajax( $process_chunk_result );

					return $result;
				}
			}

			$result = array(
				'current_row'  => $row_information[0],
				'primary_keys' => $row_information[1],
			);

			$result = $this->http->end_ajax( json_encode( $result ) );
		}

		return $result;
	}

	/**
	 * Appends an export of a table to a backup file as per params defined in $this->state_data.
	 *
	 * @return mixed|null
	 */
	function handle_table_backup() {
		$state_data = $this->migration_state_manager->set_post_data();

		if ( empty( $state_data['dumpfile_created'] ) ) {
			$state_data['dumpfile_created'] = true;

			$this->migration_state_manager->save_migration_state( $state_data );
		}

		$form_data = $this->form_data->getFormData();

		if ( isset( $form_data['gzip_file'] ) ) {
			unset( $form_data['gzip_file'] );
			$this->form_data->setFormData( $form_data );
		}

		$this->dynamic_props->maximum_chunk_size = $this->util->get_bottleneck();
		$sql_dump_file_name                      = $this->filesystem->get_upload_info( 'path' ) . DIRECTORY_SEPARATOR;
		$sql_dump_file_name                      .= $this->table_helper->format_dump_name( $state_data['dump_filename'] );
		$file_created                            = file_exists( $sql_dump_file_name );
		$fp                                      = $this->filesystem->open( $sql_dump_file_name );

		if ( $file_created == false ) {
			$this->table->db_backup_header( $fp );
		}

		$result = $this->table->process_table( $state_data['table'], $fp );

		if ( isset( $fp ) && \is_resource( $fp ) ) {
			$this->filesystem->close( $fp );
		}

		ob_start();
		$this->util->display_errors();
		$maybe_errors = trim( ob_get_clean() );

		if ( false === empty( $maybe_errors ) ) {
			$maybe_errors = array( 'wpmdb_error' => 1, 'body' => $maybe_errors );
			$result       = $this->http->end_ajax( json_encode( $maybe_errors ) );

			return $result;
		}

		return $result;
	}

	/**
	 * Called to cancel an in-progress migration.
	 */
	function ajax_cancel_migration() {
		$this->http->check_ajax_referer( 'cancel_migration' );

		$key_rules  = array(
			'action'             => 'key',
			'migration_state_id' => 'key',
		);
		$state_data = $this->migration_state_manager->set_post_data( $key_rules );

		$this->form_data_arr = $this->form_data->parse_migration_form_data( $state_data['form_data'] );

		switch ( $state_data['intent'] ) {
			case 'savefile' :
				$this->backup_export->delete_export_file( $state_data['dump_filename'], false );
				break;
			case 'push' :
				$data = $this->http_helper->filter_post_elements(
					$state_data,
					array(
						'remote_state_id',
						'intent',
						'url',
						'form_data',
						'temp_prefix',
						'stage',
						'dump_filename',
					)
				);

				$data['action'] = 'wpmdb_process_push_migration_cancellation';
				$data['sig']    = $this->http_helper->create_signature( $data, $state_data['key'] );
				$ajax_url       = $this->util->ajax_url();

				$response = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
				$this->util->display_errors();

				echo esc_html( trim( $response ) );
				break;
			case 'pull' :
				if ( $state_data['stage'] == 'backup' ) {
					if ( ! empty( $state_data['dumpfile_created'] ) ) {
						$this->backup_export->delete_export_file( $state_data['dump_filename'], true );
					}
				} else {
					$this->table->delete_temporary_tables( $state_data['temp_prefix'] );
				}
				break;
			case 'find_replace' :
				$this->table->delete_temporary_tables( $this->props->temp_prefix );
				break;
			case 'import' :
				if ( 'backup' === $state_data['stage'] && ! empty( $state_data['dumpfile_created'] ) ) {
					$this->backup_export->delete_export_file( $state_data['dump_filename'], true );
				} else {
					// Import might have been deleted already
					if ( $this->filesystem->file_exists( $state_data['import_path'] ) ) {
						if ( 'true' === $state_data['import_info']['import_gzipped'] ) {
							$this->backup_export->delete_export_file( $state_data['import_filename'], false );

							// File might not be decompressed yet
							if ( $this->filesystem->file_exists( substr( $state_data['import_path'], 0, - 3 ) ) ) {
								$this->backup_export->delete_export_file( $state_data['import_filename'], true );
							}
						} else {
							$this->backup_export->delete_export_file( $state_data['import_filename'], true );
						}
					}
					$this->table->delete_temporary_tables( $this->props->temp_prefix );
				}
				break;
			default:
				break;
		}

		do_action( 'wpmdb_cancellation' );

		if ( ! $this->migration_state->delete() ) {
			$this->error_log->log_error( 'Could not delete migration state.' );
		}

		exit;
	}

	/**
	 * Handles the request to flush caches and cleanup migration when pushing or not migrating user tables.
	 *
	 * @return bool|null
	 */
	function ajax_flush() {
		$this->http->check_ajax_referer( 'flush' );

		return $this->ajax_nopriv_flush();
	}

	/**
	 * Handles the request to flush caches and cleanup migration when pulling with user tables being migrated.
	 *
	 * @return bool|null
	 */
	function ajax_nopriv_flush() {
		$key_rules  = array(
			'action'             => 'key',
			'migration_state_id' => 'key',
		);
		$state_data = $this->migration_state_manager->set_post_data( $key_rules );

		if ( 'push' === $state_data['intent'] ) {
			$data           = array();
			$data['action'] = 'wpmdb_remote_flush';
			$data['sig']    = $this->http_helper->create_signature( $data, $state_data['key'] );
			$ajax_url       = $this->util->ajax_url();
			$response       = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
			ob_start();
			echo esc_html( $response );
			$this->util->display_errors();
			$return = ob_get_clean();
		} else {
			$return = $this->flush();
		}

		if ( ! $this->migration_state->delete() ) {
			$this->error_log->log_error( 'Could not delete migration state.' );
		}

		$result = $this->http->end_ajax( $return );

		return $result;
	}

	/**
	 * Flushes the cache and rewrite rules.
	 *
	 * @return bool
	 */
	function flush() {
		// flush rewrite rules to prevent 404s and other oddities
		wp_cache_flush();
		global $wp_rewrite;
		$wp_rewrite->init();
		flush_rewrite_rules( true ); // true = hard refresh, recreates the .htaccess file

		return true;
	}
}
