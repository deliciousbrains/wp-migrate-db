<?php

namespace DeliciousBrains\WPMDB\Common\Sql;

use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Container;

class TableHelper {

	/**
	 * @var FormData
	 */
	private $form_data;
	/**
	 * @var StateDataContainer
	 */
	public $state_container;
	/**
	 * @var \DeliciousBrains\WPMDB\League\Container\Container|null
	 */
	public $container;

	public function __construct(
		FormData $form_data,
		StateDataContainer $state_data_container
	) {
		$this->form_data       = $form_data;
		$this->state_container = $state_data_container;
		$this->container       = Container::getInstance();
	}


	/**
	 * Add backquotes to tables and db-names in
	 * SQL queries. Taken from phpMyAdmin.
	 *
	 * @param $a_name
	 *
	 * @return array|string
	 */
	function backquote( $a_name ) {
		if ( ! empty( $a_name ) && $a_name != '*' ) {
			if ( is_array( $a_name ) ) {
				$result = array();
				reset( $a_name );
				foreach ( $a_name as $key => $val ) {
					$result[ $key ] = '`' . $val . '`';
				}

				return $result;
			} else {
				return '`' . $a_name . '`';
			}
		} else {
			return $a_name;
		}
	}

	/**
	 * Better addslashes for SQL queries.
	 * Taken from phpMyAdmin.
	 *
	 * @param string $a_string
	 * @param bool   $is_like
	 *
	 * @return mixed
	 */
	function sql_addslashes( $a_string = '', $is_like = false ) {
		if ( $is_like ) {
			$a_string = str_replace( '\\', '\\\\\\\\', $a_string );
		} else {
			$a_string = str_replace( '\\', '\\\\', $a_string );
		}

		return str_replace( '\'', '\\\'', $a_string );
	}

	/**
	 * Ensures that the given create table sql string is compatible with the target database server version.
	 *
	 * @param string $create_table
	 * @param string $table
	 * @param string $db_version
	 * @param string $action
	 * @param string $stage
	 *
	 * @return mixed
	 */
	function mysql_compat_filter( $create_table, $table, $db_version, $action, $stage ) {
		if ( empty( $db_version ) || empty( $action ) || empty( $stage ) ) {
			return $create_table;
		}

		if ( version_compare( $db_version, '5.6', '<' ) ) {
			// Convert utf8m4_unicode_520_ci collation to utf8mb4_unicode_ci if less than mysql 5.6
			$create_table = str_replace( 'utf8mb4_unicode_520_ci', 'utf8mb4_unicode_ci', $create_table );
			$create_table = str_replace( 'utf8_unicode_520_ci', 'utf8_unicode_ci', $create_table );
		} elseif ( apply_filters( 'wpmdb_convert_to_520', true ) ) {
			$create_table = str_replace( 'utf8mb4_unicode_ci', 'utf8mb4_unicode_520_ci', $create_table );
			$create_table = str_replace( 'utf8_unicode_ci', 'utf8_unicode_520_ci', $create_table );
		}

		if ( version_compare( $db_version, '5.5.3', '<' ) ) {
			// Remove index comments introduced in MySQL 5.5.3.
			// Following regex matches any PRIMARY KEY or KEY statement on a table definition that has a COMMENT statement attached.
			// The regex is then reset (\K) to return just the COMMENT, its string and any leading whitespace for replacing with nothing.
			$create_table = preg_replace( '/(?-i)KEY\s.*`.*`\).*\K\sCOMMENT\s\'.*\'/', '', $create_table );

			// Replace utf8mb4 introduced in MySQL 5.5.3 with utf8. As of WordPress 4.2 utf8mb4 is used by default on supported MySQL versions
			// but causes migrations to fail when the remote site uses MySQL < 5.5.3.
			$abort_utf8mb4 = false;
			if ( 'savefile' !== $action && 'backup' !== $stage ) {
				$abort_utf8mb4 = true;
			}
			// Escape hatch if user knows that site content is utf8 safe.
			$abort_utf8mb4 = apply_filters( 'wpmdb_abort_utf8mb4_to_utf8', $abort_utf8mb4 );

			$replace_count = 0;
			$create_table  = preg_replace( '/(COLLATE\s)utf8mb4/', '$1utf8', $create_table, - 1, $replace_count ); // Column collation

			if ( false === $abort_utf8mb4 || 0 === $replace_count ) {
				$create_table = preg_replace( '/(COLLATE=)utf8mb4/', '$1utf8', $create_table, - 1, $replace_count ); // Table collation
			}

			if ( false === $abort_utf8mb4 || 0 === $replace_count ) {
				$create_table = preg_replace( '/(CHARSET\s?=\s?)utf8mb4/', '$1utf8', $create_table, - 1, $replace_count ); // Table charset
			}

			if ( true === $abort_utf8mb4 && 0 !== $replace_count ) {
				$return = sprintf( __( 'The source site supports utf8mb4 data but the target does not, aborting migration to avoid possible data corruption. Please see %1$s for more information. (#148)', 'wp-migrate-db-pro' ), sprintf( '<a href="https://deliciousbrains.com/wp-migrate-db-pro/doc/source-site-supports-utf8mb4/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin">%1$s</a>', __( 'our documentation', 'wp-migrate-db-pro' ) ) );
				$return = array( 'wpmdb_error' => 1, 'body' => $return );
				$result = $this->end_ajax( json_encode( $return ) );

				return $result;
			}
		}

		return $create_table;
	}

	function format_dump_name( $dump_name ) {
		$state_data = $this->state_container->getData();
		$form_data  = $this->form_data->getFormData();
		$extension  = '.sql';

		if ( empty( $form_data ) && empty( $state_data ) ) {
			return $dump_name . $extension;
		}

		$dump_name = sanitize_file_name( $dump_name );

		if ( 'backup' === $state_data['stage'] ) {
			return $dump_name . $extension;
		}

		if ( 'import' === $state_data['intent'] ) {
			if ( isset( $state_data['import_info']['import_gzipped'] ) && 'true' === $state_data['import_info']['import_gzipped'] ) {
				$extension .= '.gz';
			}
		} else {
			if ( Util::gzip() && isset( $form_data['gzip_file'] ) && $form_data['gzip_file'] ) {
				$extension .= '.gz';
			}
		}

		return $dump_name . $extension;
	}

	/**
	 * Check that the given table is of the desired type,
	 * including single and multisite installs.
	 * eg: wp_posts, wp_2_posts
	 *
	 * The scope argument can take one of the following:
	 *
	 * 'table' - Match on the un-prefixed table name, this is the default.
	 * 'all' - Match on 'blog' and 'global' tables. No old tables are returned.
	 * 'blog' - Match the blog-level tables for the queried blog.
	 * 'global' - Match the global tables for the installation, matching multisite tables only if running multisite.
	 * 'ms_global' - Match the multisite global tables, regardless if current installation is multisite.
	 * 'non_ms_global' - Match the non multisite global tables, regardless if current installation is multisite.
	 * 'old' - Matches tables which are deprecated.
	 *
	 * @param string $desired_table Can be empty to match on tables from scopes other than 'table'.
	 * @param string $given_table
	 * @param string $scope         Optional type of table to match against, default is 'table'.
	 * @param string $new_prefix    Optional new prefix already added to $given_table.
	 * @param int    $blog_id       Optional Only used with 'blog' scope to test against a specific subsite's tables other than current for $wpdb.
	 *
	 * @return boolean
	 */
	function table_is( $desired_table, $given_table, $scope = 'table', $new_prefix = '', $blog_id = 0 ) {
		global $wpdb;

		$scopes = array( 'all', 'blog', 'global', 'ms_global', 'non_ms_global', 'old' );

		if ( ! in_array( $scope, $scopes ) ) {
			$scope = 'table';
		}

		if ( empty( $desired_table ) && 'table' === $scope ) {
			return false;
		}

		if ( ! empty( $new_prefix ) && 0 === stripos( $given_table, $new_prefix ) ) {
			$given_table = substr_replace( $given_table, $wpdb->base_prefix, 0, strlen( $new_prefix ) );
		}

		$match                 = false;
		$prefix_escaped        = preg_quote( $wpdb->base_prefix, '/' );
		$desired_table_escaped = preg_quote( $desired_table, '/' );

		if ( 'table' === $scope ) {
			if ( $wpdb->{$desired_table} == $given_table ||
			     preg_match( '/' . $prefix_escaped . '[0-9]+_' . $desired_table_escaped . '/', $given_table )
			) {
				$match = true;
			}
		} else {
			if ( 'non_ms_global' === $scope ) {
				$tables = array_diff_key( $wpdb->tables( 'global', true, $blog_id ), $wpdb->tables( 'ms_global', true, $blog_id ) );
			} else {
				$tables = $wpdb->tables( $scope, true, $blog_id );
			}

			if ( ! empty( $desired_table ) ) {
				$tables = array_intersect_key( $tables, array( $desired_table => '' ) );
			}

			if ( ! empty( $tables ) ) {
				foreach ( $tables as $table_name ) {
					if ( ! empty( $table_name ) && strtolower( $table_name ) === strtolower( $given_table ) ) {
						$match = true;
						break;
					}
				}
			}
		}

		return $match;
	}
}
