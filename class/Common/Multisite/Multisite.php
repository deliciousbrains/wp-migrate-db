<?php

namespace DeliciousBrains\WPMDB\Common\Multisite;

use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Multisite {
	/**
	 * @var Properties
	 */
	public $props;
	/**
	 * @var Util
	 */
	public $util;
	/**
	 * @var DynamicProperties
	 */
	public $dynamic_props;
	/**
	 * @var MigrationStateManager
	 */
	public $migration_state_manager;

	public function __construct(
		MigrationStateManager $migration_state_manager,
		Properties $properties,
		Util $util
	) {
		$this->props                   = $properties;
		$this->migration_state_manager = $migration_state_manager;
		$this->dynamic_props           = DynamicProperties::getInstance();
		$this->util                    = $util;
	}

	/**
	 * Get the remote site's base domain for subdomain multisite search/replace.
	 *
	 * @return string|bool The remote site's domain or false on error.
	 */
	function get_domain_replace() {
		$state_data = $this->migration_state_manager->set_post_data();

		if ( ! isset( $this->domain_replace ) ) {
			$this->domain_replace = false;

			if ( is_multisite() && ! empty( $this->dynamic_props->find_replace_pairs ) ) {
				$grep = preg_grep( sprintf( '/^(\/\/|http:\/\/|https:\/\/|)%s/', $this->get_domain_current_site() ), $this->dynamic_props->find_replace_pairs['replace_old'] );
				if ( $grep ) {
					$domain_find_keys = array_keys( $grep );
					$url              = Util::parse_url( $this->dynamic_props->find_replace_pairs['replace_new'][ $domain_find_keys[0] ] );
					if ( isset( $url['host'] ) ) {
						$this->domain_replace = $url['host'];
					} elseif ( ! empty( $state_data['domain_current_site'] ) ) {
						$this->domain_replace = $state_data['domain_current_site'];
					}
				}
			}
		}

		return $this->domain_replace;
	}

	/**
	 * Get the domain for the current site.
	 *
	 * @return string
	 */
	function get_domain_current_site() {
		if ( ! is_multisite() ) {
			return '';
		}

		$current_site = get_current_site();

		return $current_site->domain;
	}

	/**
	 * Checks given subsite id or url to see if it exists and returns its blog id.
	 *
	 * @param int|string $subsite       Blog ID or URL
	 * @param array      $subsites_list Optional array of blog_id => simple urls to use, defaults to result of subsites_list().
	 *
	 * @return bool|string
	 */
	public function get_subsite_id( $subsite, $subsites_list = array() ) {
		if ( ! is_numeric( $subsite ) ) {
			$subsite = $this->util->simple_site_url( $subsite );
		}

		if ( empty( $subsites_list ) ) {
			$subsites_list = $this->util->subsites_list();
		}

		foreach ( $subsites_list as $blog_id => $subsite_path ) {
			if ( is_numeric( $subsite ) ) {
				if ( $blog_id == $subsite ) {
					return $blog_id;
				}
			} elseif ( $subsite == $subsite_path ) {
				return $blog_id;
			}
		}

		return false;
	}

	/**
	 * Checks given array of subsite ids or urls to see if they exist and returns array of blog ids.
	 *
	 * @param array $subsites
	 * @param array $subsites_list Optional array of blog_id => simple urls to use, defaults to result of subsites_list().
	 *
	 * @return array
	 *
	 * Returned array element values will be false if the given value does not correspond to a subsite.
	 */
	public function get_subsite_ids( $subsites, $subsites_list = array() ) {
		if ( empty( $subsites ) ) {
			return array();
		}

		if ( ! is_array( $subsites ) ) {
			$subsites = array( $subsites );
		}

		foreach ( $subsites as $index => $subsite ) {
			$subsites[ $index ] = $this->get_subsite_id( $subsite, $subsites_list );
		}

		return $subsites;
	}
}
