<?php

namespace DeliciousBrains\WPMDB\Common\Profile;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class ProfileManager {

	/**
	 * @var Http
	 */
	private $http;
	/**
	 * @var Properties
	 */
	private $properties;
	/**
	 * @var Settings
	 */
	private $settings;
	/**
	 * @var MigrationStateManager
	 */
	private $state_manager;
	/**
	 * @var Util
	 */
	private $util;
	/**
	 * @var ErrorLog
	 */
	private $error_log;
	/**
	 * @var Table
	 */
	private $table;
	/**
	 * @var FormData
	 */
	private $form_data;

	/**
	 * ProfileManager constructor.
	 *
	 * @param Http                  $http
	 * @param Properties            $properties
	 * @param Settings              $settings
	 * @param MigrationStateManager $state_manager
	 * @param Util                  $util
	 * @param ErrorLog              $error_log
	 * @param Table                 $table
	 * @param FormData              $form_data
	 */
	public function __construct(
		Http $http,
		Properties $properties,
		Settings $settings,
		MigrationStateManager $state_manager,
		Util $util,
		ErrorLog $error_log,
		Table $table,
		FormData $form_data
	) {
		$this->default_profile = [
			'action'                    => 'savefile',
			'save_computer'             => '1',
			'gzip_file'                 => '1',
			'table_migrate_option'      => 'migrate_only_with_prefix',
			'replace_guids'             => '1',
			'default_profile'           => true,
			'name'                      => '',
			'select_tables'             => [],
			'select_post_types'         => [],
			'backup_option'             => 'backup_only_with_prefix',
			'exclude_transients'        => '1',
			'compatibility_older_mysql' => '0',
			'import_find_replace'       => '1',
		];

		$this->checkbox_options = [
			'save_computer'             => '0',
			'gzip_file'                 => '0',
			'replace_guids'             => '0',
			'exclude_spam'              => '0',
			'keep_active_plugins'       => '0',
			'create_backup'             => '0',
			'exclude_post_types'        => '0',
			'exclude_transients'        => '0',
			'compatibility_older_mysql' => '0',
			'import_find_replace'       => '0',
		];
		$this->http = $http;
		$this->properties = $properties;
		$this->settings = $settings->get_settings();
		$this->state_manager = $state_manager;
		$this->util = $util;
		$this->error_log = $error_log;
		$this->table = $table;
		$this->form_data = $form_data;
	}

	public function register() {
		// internal AJAX handlers
		add_action( 'wp_ajax_wpmdb_delete_migration_profile', array( $this, 'ajax_delete_migration_profile' ) );
		add_action( 'wp_ajax_wpmdb_save_profile', array( $this, 'ajax_save_profile' ) );
	}

	/**
	 * Handler for deleting a migration profile.
	 *
	 * @return bool|null
	 */
	function ajax_delete_migration_profile() {
		$this->http->check_ajax_referer( 'delete-migration-profile' );

		$key_rules = array(
			'action'     => 'key',
			'profile_id' => 'positive_int',
			'nonce'      => 'key',
		);

		$state_data = $this->state_manager->set_post_data( $key_rules );

		$key = absint( $state_data['profile_id'] );
		-- $key;
		$return = '';

		if ( isset( $this->settings['profiles'][ $key ] ) ) {
			unset( $this->settings['profiles'][ $key ] );
			update_site_option( 'wpmdb_settings', $this->settings );
		} else {
			$return = '-1';
		}

		$result = $this->http->end_ajax( $return );

		return $result;
	}

	/**
	 * Handler for the ajax request to save a migration profile.
	 *
	 * @return bool|null
	 */
	function ajax_save_profile() {
		$this->http->check_ajax_referer( 'save-profile' );

		$key_rules  = array(
			'action'  => 'key',
			'profile' => 'string',
			'nonce'   => 'key',
		);
		$state_data = $this->state_manager->set_post_data( $key_rules );

		$profile = $this->form_data->parse_migration_form_data( $state_data['profile'] );
		$profile = wp_parse_args( $profile, $this->checkbox_options );

		if ( isset( $profile['save_migration_profile_option'] ) && $profile['save_migration_profile_option'] == 'new' ) {
			$profile['name']              = $profile['create_new_profile'];
			$this->settings['profiles'][] = $profile;
		} else {
			$key                                        = $profile['save_migration_profile_option'];
			$name                                       = $this->settings['profiles'][ $key ]['name'];
			$this->settings['profiles'][ $key ]         = $profile;
			$this->settings['profiles'][ $key ]['name'] = $name;
		}

		update_site_option( 'wpmdb_settings', $this->settings );
		end( $this->settings['profiles'] );
		$key    = key( $this->settings['profiles'] );
		$result = $this->http->end_ajax( $key );

		return $result;
	}

	function maybe_update_profile( $profile, $profile_id ) {
		$profile_changed = false;

		if ( isset( $profile['exclude_revisions'] ) ) {
			unset( $profile['exclude_revisions'] );
			$profile['select_post_types'] = array( 'revision' );
			$profile_changed              = true;
		}

		if ( isset( $profile['post_type_migrate_option'] ) && 'migrate_select_post_types' == $profile['post_type_migrate_option'] && 'pull' != $profile['action'] ) {
			unset( $profile['post_type_migrate_option'] );
			$profile['exclude_post_types'] = '1';
			$all_post_types                = $this->table->get_post_types();
			$profile['select_post_types']  = array_diff( $all_post_types, $profile['select_post_types'] );
			$profile_changed               = true;
		}

		if ( $profile_changed ) {
			$this->settings['profiles'][ $profile_id ] = $profile;
			update_site_option( 'wpmdb_settings', $this->settings );
		}

		return $profile;
	}

	// Retrieves the specified profile, if -1, returns the default profile
	function get_profile( $profile_id ) {
		-- $profile_id;

		if ( $profile_id == '-1' || ! isset( $this->settings['profiles'][ $profile_id ] ) ) {
			return $this->default_profile;
		}

		return $this->settings['profiles'][ $profile_id ];
	}
}
