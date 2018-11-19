<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Util;

class FinalizeMigration {

	public $state_data;
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
	 * @var TableHelper
	 */
	private $table_helper;
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
	 * @var FormData
	 */
	private $form_data;

	public function __construct(
		MigrationStateManager $migration_state_manager,
		Table $table,
		Http $http,
		TableHelper $table_helper,
		Helper $http_helper,
		Util $util,
		RemotePost $remote_post,
		FormData $form_data,
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
		$this->form_data               = $form_data;
	}

	/**
	 * After table migration, delete old tables and rename new tables removing the temporarily prefix.
	 *
	 * @return mixed
	 */
	function ajax_finalize_migration() {
		$this->http->check_ajax_referer( 'finalize-migration' );

		$key_rules = array(
			'action'             => 'key',
			'migration_state_id' => 'key',
			'prefix'             => 'string',
			'tables'             => 'string',
			'nonce'              => 'key',
		);

		$state_data = $this->migration_state_manager->set_post_data( $key_rules );

		if ( 'savefile' === $state_data['intent'] ) {
			return true;
		}

		$this->form_data->parse_migration_form_data( $state_data['form_data'] );

		global $wpdb;

		if ( 'push' === $state_data['intent'] ) {
			do_action( 'wpmdb_migration_complete', 'push', $state_data['url'] );
			$data = $this->http_helper->filter_post_elements(
				$state_data,
				array(
					'remote_state_id',
					'url',
					'form_data',
					'tables',
					'temp_prefix',
				)
			);

			$data['action']   = 'wpmdb_remote_finalize_migration';
			$data['intent']   = 'pull';
			$data['prefix']   = $wpdb->base_prefix;
			$data['type']     = 'push';
			$data['location'] = home_url();
			$data['sig']      = $this->http_helper->create_signature( $data, $state_data['key'] );
			$ajax_url         = $this->util->ajax_url();
			$response         = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
			$return           = esc_html( $response );
			$this->util->display_errors();

			// In the case of an error
			if ( '1' !== $response ) {
				$return = $response;
			}
		} else {
			$return = $this->finalize_migration();
		}

		$result = $this->http->end_ajax( $return );

		return $result;
	}

	/**
	 * Internal function for finalizing a migration.
	 *
	 * @return bool|null
	 */
	function finalize_migration() {
		$state_data       = $this->migration_state_manager->set_post_data();
		$tables           = explode( ',', $state_data['tables'] );
		$temp_prefix      = ( isset( $state_data['temp_prefix'] ) ) ? $state_data['temp_prefix'] : $this->props->temp_prefix;
		$temp_tables      = array();
		$type             = $state_data['intent'];
		$alter_table_name = $this->table->get_alter_table_name();

		do_action( 'wpmdb_before_finalize_migration', $this );

		if ( isset( $state_data['type'] ) && 'push' === $state_data['type'] ) {
			$type = 'push';
		}

		if ( 'find_replace' === $state_data['intent'] || 'import' === $state_data['intent'] ) {
			$location = home_url();
		} else {
			$location = ( isset( $state_data['location'] ) ) ? $state_data['location'] : $state_data['url'];
		}

		if ( 'import' === $state_data['intent'] ) {
			$temp_tables = $this->table->get_tables( 'temp' );
			$tables      = array();

			foreach ( $temp_tables as $key => $temp_table ) {
				if ( $alter_table_name === $temp_table ) {
					unset( $temp_tables[ $key ] );
					continue;
				}

				$tables[] = substr( $temp_table, strlen( $temp_prefix ) );
			}
		} else {
			foreach ( $tables as $table ) {
				$temp_tables[] = $temp_prefix . apply_filters(
						'wpmdb_finalize_target_table_name',
						$table,
						$type,
						$state_data['site_details']
					);
			}
		}

		$sql = "SET FOREIGN_KEY_CHECKS=0;\n";

		$sql .= $this->table->get_preserved_options_queries( $temp_tables, $type );

		foreach ( $temp_tables as $table ) {
			$sql .= 'DROP TABLE IF EXISTS ' . $this->table_helper->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
			$sql .= "\n";
			$sql .= 'RENAME TABLE ' . $this->table_helper->backquote( $table ) . ' TO ' . $this->table_helper->backquote( substr( $table, strlen( $temp_prefix ) ) ) . ';';
			$sql .= "\n";
		}

		$sql .= $this->table->get_alter_queries();
		$sql .= 'DROP TABLE IF EXISTS ' . $this->table_helper->backquote( $alter_table_name ) . ";\n";

		$process_chunk_result = $this->table->process_chunk( $sql );
		if ( true !== $process_chunk_result ) {
			$result = $this->http->end_ajax( $process_chunk_result );

			return $result;
		}

		if ( ! isset( $state_data['location'] ) && ! in_array( $state_data['intent'], array( 'find_replace', 'import' ) ) ) {
			$data           = array();
			$data['action'] = 'wpmdb_fire_migration_complete';
			$data['url']    = home_url();
			$data['sig']    = $this->http_helper->create_signature( $data, $state_data['key'] );
			$ajax_url       = $this->util->ajax_url();
			$response       = $this->remote_post->post( $ajax_url, $data, __FUNCTION__ );
			$return         = esc_html( $response );
			$this->util->display_errors();

			if ( '1' !== $response ) {
				return $this->http->end_ajax( json_encode( array( 'wpmdb_error' => 1, 'body' => $return ) ) );
			}
		}

		do_action( 'wpmdb_migration_complete', $type, $location );

		return true;
	}
}
