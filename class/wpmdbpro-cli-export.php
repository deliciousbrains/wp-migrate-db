<?php

require_once __DIR__ . '/wpmdb-cli.php';

class WPMDBPro_CLI_Export extends WPMDB_CLI {

	/**
	 * Instance of WPMDBPro.
	 *
	 * @var WPMDBPro
	 */
	protected $wpmdbpro;

	function __construct( $plugin_file_path ) {
		parent::__construct( $plugin_file_path );

		global $wpmdbpro;
		$this->wpmdb    = &$this->wpmdbpro;
		$this->wpmdbpro = $wpmdbpro;

		// add support for extra args
		add_filter( 'wpmdb_cli_filter_get_profile_data_from_args', array( $this, 'add_extra_args_for_pro_export' ), 10, 3 );

		// extend get_tables_to_migrate with migrate_select
		add_filter( 'wpmdb_cli_tables_to_migrate', array( $this, 'tables_to_migrate_include_select' ), 10, 1 );
	}

	/**
	 * Add support for extra args in export
	 *
	 * @param array $profile
	 * @param array $args
	 * @param array $assoc_args
	 *
	 * @return array
	 */
	function add_extra_args_for_pro_export( $profile, $args, $assoc_args ) {
		if ( ! is_array( $profile ) ) {
			return $profile;
		}

		// --include-tables=<tables>
		if ( ! empty( $assoc_args['include-tables'] ) ) {
			$table_migrate_option = 'migrate_select';
			$select_tables        = explode( ',', $assoc_args['include-tables'] );
		} else {
			$select_tables        = array();
			$table_migrate_option = 'migrate_only_with_prefix';
		}

		// --exclude-post-types=<post-types>
		$select_post_types = array();
		if ( ! empty( $assoc_args['exclude-post-types'] ) ) {
			$select_post_types = explode( ',', $assoc_args['exclude-post-types'] );
		}

		// --subsite=<blog-id|subsite-url>
		$multisite_subsite_export = false;
		$select_subsite           = 0;
		if ( isset( $assoc_args['subsite'] ) ) {
			if ( ! is_multisite() ) {
				return $this->cli_error( __( 'The installation must be a Multisite network to make use of the subsite option', 'wp-migrate-db-pro' ) );
			}
			if ( ! class_exists( 'WPMDBPro_Multisite_Tools' ) ) {
				return $this->cli_error( __( 'The Multisite Tools addon needs to be installed and activated to make use of the subsite option', 'wp-migrate-db-pro' ) );
			}
			if ( empty( $assoc_args['subsite'] ) ) {
				return $this->cli_error( __( 'A valid Blog ID or Subsite URL must be supplied to make use of the subsite option', 'wp-migrate-db-pro' ) );
			}
			$select_subsite = $this->get_subsite_id( $assoc_args['subsite'] );

			if ( false === $select_subsite ) {
				return $this->cli_error( __( 'A valid Blog ID or Subsite URL must be supplied to make use of the subsite option', 'wp-migrate-db-pro' ) );
			}

			$multisite_subsite_export = true;
		}

		// --prefix=<new-table-prefix>
		global $wpdb;
		$new_prefix = $wpdb->base_prefix;
		if ( isset( $assoc_args['prefix'] ) ) {
			if ( false === $multisite_subsite_export ) {
				return $this->cli_error( __( 'A new table name prefix may only be specified for subsite exports.', 'wp-migrate-db-pro' ) );
			}
			if ( empty( $assoc_args['prefix'] ) ) {
				return $this->cli_error( __( 'A valid prefix must be supplied to make use of the prefix option', 'wp-migrate-db-pro' ) );
			}
			$new_prefix = trim( $assoc_args['prefix'] );

			if ( sanitize_key( $new_prefix ) !== $new_prefix ) {
				global $wpmdbpro_multisite_tools;

				return $this->cli_error( $wpmdbpro_multisite_tools->get_string( 'new_prefix_contents' ) );
			}
		}

		$filtered_profile = compact(
			'table_migrate_option',
			'select_post_types',
			'select_tables',
			'multisite_subsite_export',
			'select_subsite',
			'new_prefix'
		);

		return array_merge( $profile, $filtered_profile );
	}

	/**
	 * Use tables from --include-tables assoc arg if available
	 *
	 * @param array $tables_to_migrate
	 *
	 * @return array
	 */
	function tables_to_migrate_include_select( $tables_to_migrate ) {
		if ( 'savefile' === $this->profile['action'] &&
			'migrate_select' === $this->profile['table_migrate_option'] &&
			! empty( $this->profile['select_tables'] )
		) {
			$tables_to_migrate = array_intersect( $this->profile['select_tables'], $this->get_tables() );
		}

		return $tables_to_migrate;
	}
}
