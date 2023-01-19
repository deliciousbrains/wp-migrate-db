<?php

namespace DeliciousBrains\WPMDB\Common\Addon;

use DeliciousBrains\WPMDB\Common\Util\Util;

class AddonsFacade
{
    protected $addons_schema_option   = 'wp_migrate_addon_schema';
    protected $current_schema_version = 1;

    const LEGACY_ADDONS = [
        'wp-migrate-db-pro-media-files/wp-migrate-db-pro-media-files.php',
        'wp-migrate-db-pro-cli/wp-migrate-db-pro-cli.php',
        'wp-migrate-db-pro-multisite-tools/wp-migrate-db-pro-multisite-tools.php',
        'wp-migrate-db-pro-theme-plugin-files/wp-migrate-db-pro-theme-plugin-files.php',
    ];

    const GLOBAL_ADDONS = [
        'wp-migrate-db-pro-media-files',
        'wp-migrate-db-pro-multisite-tools',
        'wp-migrate-db-pro-theme-plugin-files'
    ];

    /**
     * @var AddonManagerInterface[]
     */
    protected $addons;

    /**
     * @var bool
     */
    protected static $initialized = false;



    /**
     * @param array $addons
     */
    public function __construct(array $addons = [])
    {
        $this->addons  = $addons;
    }

    public function register() {
        if (false === self::$initialized) {
            add_action('activate_plugin', [$this, 'prevent_legacy_addon_activation']);
            add_action('admin_notices', [$this, 'legacy_addon_notice']);
            add_action('plugins_loaded', [$this, 'initialize_addons'], PHP_INT_MAX);

            if (false === get_site_transient('wpmdb_disabled_legacy_addons')) {
                add_action('plugins_loaded', [$this, 'disable_legacy_addons'], PHP_INT_MAX);
                set_site_transient('wpmdb_disabled_legacy_addons', true);
            }

            self::$initialized = true;
        }
    }


    /**
     * Initializes registered addons
     *
     * @return void
     */
    public function initialize_addons()
    {
        foreach ($this->addons as $addon) {
            $addon->register(false);
        }
    }


    /**
     * Deactivates legacy addons on upgrade
     *
     * @return void
     */
    public static function disable_legacy_addons()
    {
        Util::disable_legacy_addons();
    }

    /**
     * Prevents legacy addons from being activated
     *
     * @return void
     */
    public function prevent_legacy_addon_activation($plugin)
    {
        if (in_array($plugin, self::LEGACY_ADDONS)) {
            $redirect = self_admin_url('plugins.php?legacyaddon=1');
            wp_redirect($redirect);
            exit;
        }
    }

    /**
     * Notice when trying to activate addon
     *
     * @return void
     */
    public function legacy_addon_notice()
    {
        if (isset($_GET['legacyaddon'])) {
            $message = __('Legacy addons cannot be activated alongside WP Migrate version 2.3.0 or above. These features have been moved to WP Migrate.', 'wp-migrate-db');
            echo '<div class="updated" style="border-left: 4px solid #ffba00;"><p>' . $message . '</p></div>';
        }
    }
}
