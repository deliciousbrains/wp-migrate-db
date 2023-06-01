<?php

namespace DeliciousBrains\WPMDB\Common\Multisite;

use DeliciousBrains\WPMDB\Common\Helpers;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Multisite
{

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
	function get_domain_replace()
	{
		$state_data = $this->migration_state_manager->set_post_data();

		if ( !isset( $this->domain_replace ) ) {
			$this->domain_replace = false;

			if ( is_multisite() && !empty( $this->dynamic_props->find_replace_pairs ) ) {
				$grep = preg_grep( sprintf( '/^(\/\/|http:\/\/|https:\/\/|)%s/', $this->get_domain_current_site() ), $this->dynamic_props->find_replace_pairs['replace_old'] );
				if ( $grep ) {
					$domain_find_keys = array_keys( $grep );
					$url              = Util::parse_url( $this->dynamic_props->find_replace_pairs['replace_new'][$domain_find_keys[0]] );
					if ( isset( $url['host'] ) ) {
						$this->domain_replace = $url['host'] . ( isset( $url['port'] ) ? ':' . $url['port'] : '' );
					} elseif ( !empty( $state_data['domain_current_site'] ) ) {
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
	function get_domain_current_site()
	{
		if ( !is_multisite() ) {
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
	public function get_subsite_id( $subsite, $subsites_list = array() )
	{
		if ( !is_numeric( $subsite ) ) {
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
	public function get_subsite_ids( $subsites, $subsites_list = array() )
	{
		if ( empty( $subsites ) ) {
			return array();
		}

		if ( !is_array( $subsites ) ) {
			$subsites = array( $subsites );
		}

		foreach ( $subsites as $index => $subsite ) {
			$subsites[$index] = $this->get_subsite_id( $subsite, $subsites_list );
		}

		return $subsites;
	}

	public function mst_required_message($intent)
	{
        $local              = __('single site', 'wp-migrate-db');
        $remote             = __('multisite', 'wp-migrate-db');
        $local_is_multisite = false;
        $action             = '';
        $msg                = '';
        $plugin_file        = 'wp-migrate-db-pro-multisite-tools/wp-migrate-db-pro-multisite-tools.php';
        $plugin_ids         = array_keys(get_plugins());
        $mst_addon          = sprintf('<a href="%s">%s</a>',
            'https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/',
            __('Multisite Tools upgrade', 'wp-migrate-db')
        );
        $import_msg         = sprintf(__('It looks like the file you are trying to import is from a multisite install and this install is a single site. To run this type of import you\'ll need to use the %s to export a subsite as a single site. <a href="%s" target="_blank">Learn more »</a>',
            'wp-migrate-db'),
            $mst_addon,
            'https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/#export-subsite'
        );

        $replace_single = sprintf('<a href="https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/#replace-single-site-multisite" target="_blank">%s</a>', __('Learn more about replacing a single site with a multisite network', 'wp-migrate-db'));
        $replace_multisite = sprintf('<a href="https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/#replace-multisite-single-site" target="_blank">%s</a>', __('Learn more about replacing a multisite network with a single site', 'wp-migrate-db'));

        if ( is_multisite() ) {
            $local_is_multisite = true;
            $local              = __('multisite', 'wp-migrate-db');
            $remote             = __('single site', 'wp-migrate-db');
            $import_msg         = sprintf(__('It looks like the file you are trying to import is from a single site install and this install is a multisite. This type of migration isn\'t currently supported. <a href="%s" target="_blank">Learn more »</a>',
                'wp-migrate-db'),
                'https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/'
            );
		}

		if ( in_array( $plugin_file, $plugin_ids ) ) {
			if ( !is_plugin_active( $plugin_file ) ) {
				$url    = wp_nonce_url( network_admin_url( 'plugins.php?action=activate&amp;plugin=wp-migrate-db-pro-multisite-tools/wp-migrate-db-pro-multisite-tools.php' ), 'activate-plugin_wp-migrate-db-pro-multisite-tools/wp-migrate-db-pro-multisite-tools.php' );
				$action = sprintf( '[<a href="%s">%s</a>]', $url, __( 'Activate', 'wp-migrate-db' ) );
			} else {
				$msg = sprintf( __( 'It looks like the remote site is a %s install and this install is a %s. To run this type of migration you\'ll need the %s activated on the <strong>remote</strong> site.', 'wp-migrate-db' ),
					$remote,
					$local,
					$mst_addon
				);
			}
		} else {
			$license_response = get_site_transient( Helpers::get_licence_response_transient_key() );

			if ( $license_response ) {
				$license_response = json_decode( $license_response );

				if ( isset( $license_response->addons_available ) && '0' !== $license_response->addons_available ) {
					$url    = wp_nonce_url( network_admin_url( 'update.php?action=install-plugin&plugin=wp-migrate-db-pro-multisite-tools' ), 'install-plugin_wp-migrate-db-pro-multisite-tools' );
					$action = sprintf( '[<a href="%s">%s</a>]', $url, __( 'Install', 'wp-migrate-db' ) );
				} else {
					$url    = 'https://deliciousbrains.com/my-account/?utm_campaign=support%2Bdocs&utm_source=MDB%2BPaid&utm_medium=insideplugin';
					$action = sprintf( '[<a href="%s" target="_blank">%s</a>]', $url, __( 'Upgrade your license', 'wp-migrate-db' ) );
				}
			}
		}

        if ($intent === 'push' && $local_is_multisite) {
            $doc_link = $replace_single;
        } elseif ($intent === 'push' && ! $local_is_multisite) {
            $doc_link = $replace_multisite;
        } elseif ($intent === 'pull' && $local_is_multisite) {
            $doc_link = $replace_multisite;
        } else {
            $doc_link = $replace_single;
        }

        if ('' === $msg) {
            $msg = sprintf(__('It looks like the remote site is a %s install and this install is a %s. %s',
                'wp-migrate-db'),
                $remote,
                $local,
                $doc_link
            );
        }

        $msg = '<span class="action-text push pull">' . $msg . '</span>';

        return $msg;
	}
}
