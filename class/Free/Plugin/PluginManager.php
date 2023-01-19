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
}
