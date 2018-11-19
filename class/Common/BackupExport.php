<?php

namespace DeliciousBrains\WPMDB\Common;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;

class BackupExport {
	/**
	 * @var Filesystem
	 */
	private $filesystem;
	/**
	 * @var TableHelper
	 */
	private $table_helper;
	/**
	 * @var Http
	 */
	private $http;

	public $state_data;
	/**
	 * @var Table
	 */
	private $table;
	/**
	 * @var FormData
	 */
	private $form_data;
	/**
	 * @var Properties
	 */
	private $props;
	/**
	 * @var Settings
	 */
	private $settings;

	public function __construct(
		Settings $settings,
		Filesystem $filesystem,
		TableHelper $table_helper,
		Http $http,
		FormData $form_data,
		Table $table,
		Properties $properties,
		StateDataContainer $state_data_container
	) {
		$this->props        = $properties;
		$this->settings     = $settings->get_settings();
		$this->filesystem   = $filesystem;
		$this->table_helper = $table_helper;
		$this->http         = $http;
		$this->state_data   = $state_data_container;
		$this->form_data    = $form_data;
		$this->table        = $table;
	}

	function register() {
		add_filter( 'wpmdb_backup_header_included_tables', array( $this, 'backup_header_included_tables' ) );
	}

	function delete_export_file( $filename, $is_backup ) {
		$dump_file = $this->table_helper->format_dump_name( $filename );

		if ( true == $is_backup ) {
			$dump_file = preg_replace( '/.gz$/', '', $dump_file );
		}

		$dump_file = $this->filesystem->get_upload_info( 'path' ) . DIRECTORY_SEPARATOR . $dump_file;

		if ( empty( $dump_file ) || false === $this->filesystem->file_exists( $dump_file ) ) {
			$return = array( 'wpmdb_error' => 1, 'body' => __( 'MySQL export file not found.', 'wp-migrate-db' ) );

			return $this->http->end_ajax( json_encode( $return ) );
		}

		if ( false === $this->filesystem->unlink( $dump_file ) ) {
			$return = array( 'wpmdb_error' => 1, 'body' => __( 'Could not delete the MySQL export file.', 'wp-migrate-db' ) );

			return $this->http->end_ajax( json_encode( $return ) );
		}
	}

	/**
	 * Determine which tables to backup (if required).
	 *
	 * @param $profile
	 * @param $prefixed_tables
	 * @param $all_tables
	 *
	 * @return mixed|void
	 */
	public function get_tables_to_backup( $profile, $prefixed_tables, $all_tables ) {
		$tables_to_backup = array();

		switch ( $profile['backup_option'] ) {
			case 'backup_only_with_prefix':
				$tables_to_backup = $prefixed_tables;
				break;
			case 'backup_selected':
				/**
				 * When tables to migrate is tables with prefix, select_tables
				 * might be empty. Intersecting it with remote/local tables
				 * throws notice/warning and won't backup the file either.
				 */
				if ( 'migrate_only_with_prefix' === $profile['table_migrate_option'] ) {
					$tables_to_backup = $prefixed_tables;
				} else {
					$tables_to_backup = array_intersect( $profile['select_tables'], $all_tables );
				}
				break;
			case 'backup_manual_select':
				$tables_to_backup = array_intersect( $profile['select_backup'], $all_tables );
				break;
		}

		return apply_filters( 'wpmdb_tables_to_backup', $tables_to_backup, $profile );
	}

	/**
	 * Updates the database backup header with the tables that were backed up.
	 *
	 * @param $included_tables
	 *
	 * @return mixed|void
	 */
	public function backup_header_included_tables( $included_tables ) {
		$state_data = $this->state_data->getData();
		$form_data  = $this->form_data->getFormData();
		if ( 'backup' === $state_data['stage'] ) {
			$included_tables = $this->get_tables_to_backup( $form_data, $this->table->get_tables( 'prefix' ), $this->table->get_tables() );
		}

		return $included_tables;
	}
}
