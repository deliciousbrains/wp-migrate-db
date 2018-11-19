<?php

namespace DeliciousBrains\WPMDB\Common\FormData;

use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Util\Util;

class FormData {
	/**
	 * @var Util
	 */
	private $util;
	/**
	 * @var
	 */
	public $form_data;
	/**
	 * @var array
	 */
	public $accepted_fields;
	/**
	 * @var MigrationStateManager
	 */
	public $migration_state_manager;

	public function __construct(
		Util $util,
		MigrationStateManager $migration_state_manager
	) {
		$this->util                    = $util;
		$this->migration_state_manager = $migration_state_manager;

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
			'select_post_types',
			'backup_option',
			'select_backup',
			'exclude_transients',
			'exclude_post_types',
			'exclude_post_revisions',
			'compatibility_older_mysql',
			'export_dest',
			'import_find_replace',
		);
	}

	public function get_accepted_fields() {
		return $this->accepted_fields;
	}

	public function set_accepted_fields( $accepted_fields ) {

	}

	/**
	 * Sets up the form data for the migration.
	 */
	function setup_form_data() {
		$this->util->set_time_limit();
		$state_data = $this->migration_state_manager->set_post_data();

		if ( empty( $this->form_data ) ) {
			$this->form_data = $this->parse_migration_form_data( $state_data['form_data'] );
		}
	}

	/**
	 * Returns validated and sanitized form data.
	 *
	 * @param array|string $data
	 *
	 * @return array|string
	 */
	function parse_migration_form_data( $data ) {
		parse_str( $data, $form_data );
		// As the magic_quotes_gpc setting affects the output of parse_str() we may need to remove any quote escaping.
		// (it uses the same mechanism that PHP > uses to populate the $_GET, $_POST, etc. variables)
		if ( get_magic_quotes_gpc() ) {
			$form_data = Util::safe_wp_unslash( $form_data );
		}

		$this->accepted_fields = apply_filters( 'wpmdb_accepted_profile_fields', $this->accepted_fields );
		$form_data             = array_intersect_key( $form_data, array_flip( $this->accepted_fields ) );
		unset( $form_data['replace_old'][0] );
		unset( $form_data['replace_new'][0] );

		if ( ! isset( $form_data['replace_old'] ) ) {
			$form_data['replace_old'] = array();
		}
		if ( ! isset( $form_data['replace_new'] ) ) {
			$form_data['replace_new'] = array();
		}

		if ( isset( $form_data['exclude_post_revisions'] ) ) {
			$form_data['exclude_post_types']  = '1';
			$form_data['select_post_types'][] = 'revision';
			$form_data['select_post_types']   = array_unique( $form_data['select_post_types'] );
			unset( $form_data['exclude_post_revisions'] );
		}
		$this->form_data = $form_data;

		return $form_data;
	}

	/**
	 * @return mixed
	 */
	public function getFormData() {
		return $this->form_data;
	}

	/**
	 * @param mixed $form_data
	 */
	public function setFormData( $form_data ) {
		$this->form_data = $form_data;
	}
}
