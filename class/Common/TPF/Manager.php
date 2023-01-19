<?php

namespace DeliciousBrains\WPMDB\Common\TPF;

use DeliciousBrains\WPMDB\Common\Addon\AddonManagerInterface;
use DeliciousBrains\WPMDB\WPMDBDI;

class Manager implements AddonManagerInterface {
    public function register($licensed)
    {
        global $wpmdbpro_theme_plugin_files;

        if (!is_null($wpmdbpro_theme_plugin_files) ) {
            return $wpmdbpro_theme_plugin_files;
        }

        $container = WPMDBDI::getInstance();
        $theme_plugin = $container->get(ThemePluginFilesAddon::class);
        $theme_plugin->register();
        $theme_plugin->set_licensed($licensed);

        $container->get(ThemePluginFilesLocal::class)->register();

        add_filter('wpmdb_addon_registered_tpf', '__return_true');

        return $theme_plugin;
    }

    public function get_license_response_key()
    {
        return 'wp-migrate-db-pro-theme-plugin-files';
    }
}
