<?php

namespace DeliciousBrains\WPMDB\Common\MigrationState;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sanitize;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Container;

class MigrationStateManager {

	/**
	 * @var ErrorLog
	 */
	public $error_log;
	/**
	 * @var Properties
	 */
	public $props;
	/**
	 * @var Util
	 */
	public $util;
	/**
	 * @var StateDataContainer
	 */
	public $state_container;
	/**
	 * @var $state_data
	 */
	public $state_data;
	/**
	 * @var MigrationState
	 */
	public $migration_state;
	/**
	 * @var Http
	 */
	private $http;
	/**
	 * @var DynamicProperties
	 */
	private $dynamic_props;
	/**
	 * @var MigrationState
	 */
	private $migration_state_class;

	public function __construct(
		ErrorLog $error_log,
		Util $util,
		MigrationState $migration_state,
		Http $http,
		Properties $properties,
		StateDataContainer $state_data_container
	) {

		$this->error_log       = $error_log;
		$this->props           = $properties;
		$this->util            = $util;
		$this->state_container = $state_data_container;
		$this->dynamic_props   = DynamicProperties::getInstance();

		$this->state_data            = $this->state_container->state_data;
		$this->migration_state_class = $migration_state;
		$this->http                  = $http;
	}

	public function get_state_data() {
		return $this->state_data;
	}

	/**
	 * Save the migration state, and replace the current item to be returned if there is an error.
	 *
	 * @param $state   mixed
	 * @param $default mixed The default value to return on success, optional defaults to null.
	 *
	 * @return mixed
	 */
	public function save_migration_state( $state, $default = null, $migration_id = null ) {
		if ( ! $this->migration_state->set( $state, $migration_id ) ) {
			$error_msg = __( 'Failed to save migration state. Please contact support.', 'wp-migrate-db' );
			$default   = array( 'wpmdb_error' => 1, 'body' => $error_msg );
			$this->error_log->log_error( $error_msg );
		}

		return $default;
	}

	/**
	 *  Restore previous migration state and merge in new information or initialize new migration state.
	 *
	 * @param null $id
	 *
	 * @return array|bool|mixed|null
	 */
	public function get_migration_state( $id = null ) {
		$return = true;

		if ( ! empty( $id ) ) {
			$this->migration_state = new MigrationState( $id );
			$state                 = $this->migration_state->get();
			if ( empty( $state ) || $this->migration_state->id() !== $id ) {
				$error_msg = __( 'Failed to retrieve migration state. Please contact support.', 'wp-migrate-db' );
				$return    = array( 'wpmdb_error' => 1, 'body' => $error_msg );
				$this->error_log->log_error( $error_msg );
				$return = $this->http->end_ajax( json_encode( $return ) );
			} else {
				$this->state_data = array_merge( $state, $this->state_data );

				$return = $this->save_migration_state( $this->state_data, $return );

				if ( ! empty( $return['wpmdb_error'] ) ) {
					$return = $this->http->end_ajax( json_encode( $return ) );
				}
			}
		} else {
			$this->migration_state = new MigrationState();
		}

		return $return;
	}

	/**
	 * Sets $this->state_data from $_POST, potentially un-slashed and un-sanitized.
	 *
	 * @param array  $key_rules An optional associative array of expected keys and their sanitization rule(s).
	 * @param string $state_key The key in $_POST that contains the migration state id (defaults to 'migration_state_id').
	 * @param string $context   The method that is specifying the sanitization rules. Defaults to calling method.
	 *
	 * @return array|bool
	 */
	public function set_post_data( $key_rules = array(), $state_key = 'migration_state_id', $context = '' ) {
		if ( ( empty( $key_rules ) && ! empty( $this->state_data ) ) && ! defined( 'DOING_WPMDB_TESTS' ) ) {
			return $this->state_data;
		}

		if ( defined( 'DOING_WPMDB_TESTS' ) || $this->dynamic_props->doing_cli_migration ) {
			$this->state_data = $_POST;
		} elseif ( empty( $this->state_data ) || null === $this->state_data ) {
			$this->state_data = Util::safe_wp_unslash( $_POST );
		} else {
			return $this->state_data;
		}

		// From this point on we're handling data originating from $_POST, so original $key_rules apply.
		global $wpmdb_key_rules;

		if ( empty( $key_rules ) && ! empty( $wpmdb_key_rules ) ) {
			$key_rules = $wpmdb_key_rules;
		}

		// Sanitize the new state data.
		if ( ! empty( $key_rules ) ) {
			$wpmdb_key_rules = $key_rules;

			$context          = empty( $context ) ? $this->util->get_caller_function() : trim( $context );
			$this->state_data = Sanitize::sanitize_data( $this->state_data, $key_rules, $context );

			if ( false === $this->state_data ) {
				exit;
			}
		}

		$migration_state_id = null;
		if ( ! empty( $this->state_data[ $state_key ] ) ) {
			$migration_state_id = $this->state_data[ $state_key ];
		}

		// Always pass migration_state_id or $state_key with every AJAX request
		if ( true !== $this->get_migration_state( $migration_state_id ) ) {
			exit;
		}

		Container::getInstance()->get( 'state_data_container' )->setData( $this->state_data );

		return $this->state_data;
	}
}

