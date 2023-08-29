<?php

namespace DeliciousBrains\WPMDB\Free\Plugin;

use DeliciousBrains\WPMDB\Common\Cli\Cli;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\Migration\MigrationHelper;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\UI\Notice;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Common\Upgrades\UpgradeRoutinesManager;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\WPMDBDI;

class PluginManager extends PluginManagerBase
{

    public function register()
    {
        parent::register();
        $cli = WPMDBDI::getInstance()->get(Cli::class);
        $cli->register();

        add_filter('plugin_action_links_' . $this->props->plugin_basename, array($this, 'plugin_action_links'));
        add_filter('network_admin_plugin_action_links_' . $this->props->plugin_basename, array($this, 'plugin_action_links'));

        add_filter('admin_footer_text', [$this, 'admin_footer_text']);

        add_filter( 'update_footer', [$this, 'update_footer'], 20 );
    }

    /**
     * Adds additional links to plugin page
     *
     * @param array $links
     *
     * @return array $links
     */
    public function plugin_action_links($links)
    {
        $start_links = array(
            'profiles'   => sprintf('<a href="%s">%s</a>', network_admin_url($this->props->plugin_base) , __('Migrate', 'wp-migrate-db')),
            'settings'   => sprintf('<a href="%s">%s</a>', network_admin_url($this->props->plugin_base) . '#settings', _x('Settings', 'Plugin configuration and preferences', 'wp-migrate-db'))
        );
        $end_links   = array(
            'upgradepro' => sprintf('<a href="%s" style="font-weight:700">%s</a>', 'https://deliciousbrains.com/wp-migrate-db-pro/?utm_source=MDB%2BFree&utm_medium=plugins%2Blist&utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade', __('Upgrade', 'wp-migrate-db'))
        );

        return $start_links + $links + $end_links;
    }

    /**
     * Get the plugin title
     *
     * @return string
     **/
    public function get_plugin_title()
    {
        return __('WP Migrate Lite', 'wp-migrate-db');
    }

     /**
     * Get the plugin version
     *
     * @return string
     **/
    public function get_plugin_version()
    {
        if (!isset($GLOBALS['wpmdb_meta']['wp-migrate-db']['version'])) {
            return '0';
        }
        return $GLOBALS['wpmdb_meta']['wp-migrate-db']['version'];
    }

    /**
     * Get the plugin page url
     *
     * @return string
     **/
    public static function plugin_page_url()
    {
        if(is_multisite()) {
            return menu_page_url('tools_page_wp-migrate-db');
        }
        return menu_page_url('settings_page_wp-migrate-db-network');
    }

     /**
     * Filter admin footer text for Migrate pages
     *
     * @param string $text
     * @return string
     * @handles admin_footer_text
     **/
    public function admin_footer_text($text)
    {
        if (!$this->util->isMDBPage()) {
            return $text;
        }
        $product_link = Util::external_link(
			static::delicious_brains_url(
				'/wp-migrate-db-pro/',
				[
                    'utm_source'   => 'migrate_lite',
                    'utm_medium'   => 'insideplugin',
                    'utm_campaign' => 'plugin_footer',
                    'utm_content'  => 'footer_colophon'
                ]
			),
			$this->get_plugin_title()
		);
        $wpe_link = Util::external_link(
            static::wpe_url(
                '',
                [
                    'utm_source'  => 'migrate_plugin',
                    'utm_content' => 'migrate_free_plugin_footer_text'
                ]
            ), 
            'WP Engine'
        );
        return $this->generate_admin_footer_text($text, $product_link, $wpe_link);
    }

    /**
     * Filter update footer text for Migrate pages
     *
     * @param string $content
     * @return string
     * @handles update_footer
     **/
    public function update_footer($content)
    {
        if (!$this->util->isMDBPage()) {
            return $content;
        }
        $utm_params = [
            'utm_source'   => 'MDB%2BFree',
            'utm_campaign' => 'plugin_footer',
            'utm_content'  => 'footer_navigation'
        ];

        $links[] = Util::external_link(
			static::delicious_brains_url(
				'/wp-migrate-db-pro/docs/',
				$utm_params
			),
			__('Documentation', 'wp-migrate-db')
		);

		$links[] = '<a href="' . static::plugin_page_url() . '#help">' . __( 'Support', 'wp-migrate-db' ) . '</a>';

		$links[] = Util::external_link(
			static::delicious_brains_url(
				'/wp-migrate-db-pro/feedback/',
				$utm_params
			),
			__('Feedback', 'wp-migrate-db')
		);

		$links[] = Util::external_link(
			static::delicious_brains_url(
				'/wp-migrate-db-pro/whats-new/',
				$utm_params
			),
			$this->get_plugin_title() . ' ' . $this->get_plugin_version(),
			'whats-new'
		);
        return join( ' &#8729; ', $links );
    }
}
