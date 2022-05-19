<?php

namespace DeliciousBrains\WPMDB\Common\Plugin;

use DeliciousBrains\WPMDB\Common\Compatibility\CompatibilityManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Pro\UI\Template;
use DeliciousBrains\WPMDB\WPMDBDI;

class Menu
{

    /**
     * @var Properties
     */
    private $properties;
    /**
     * @var PluginManagerBase
     */
    private $plugin_manager_base;
    /**
     * @var Assets
     */
    private $assets;
    private $template;
    /**
     * @var CompatibilityManager
     */
    private $compatibility_manager;
    /**
     * @var Util
     */
    private $util;

    /**
     * Menu constructor.
     *
     * @param Properties        $properties
     * @param PluginManagerBase $plugin_manager_base
     * @param Assets            $assets
     */
    public function __construct(
        Util $util,
        Properties $properties,
        PluginManagerBase $plugin_manager_base,
        Assets $assets,
        CompatibilityManager $compatibility_manager
    ) {
        $this->properties            = $properties;
        $this->plugin_manager_base   = $plugin_manager_base;
        $this->assets                = $assets;
        $this->compatibility_manager = $compatibility_manager;
        $this->util                  = $util;
    }

    public function register()
    {
        $container = WPMDBDI::getInstance();
        if (defined('WPMDB_PRO') && WPMDB_PRO) {
            $this->template = $container->get(Template::class);
        } else {
            $this->template = $container->get(\DeliciousBrains\WPMDB\Free\UI\Template::class);
        }

        add_action('admin_head', [$this, 'admin_head']);

        if (is_multisite()) {
            add_action('network_admin_menu', array($this, 'network_admin_menu'));
            add_action('admin_menu', array($this, 'network_tools_admin_menu'));
        } else {
            add_action('admin_menu', array($this, 'admin_menu'));
        }


    }

    public function admin_head()
    {
        if ($this->util->isMDBPage()) {
            ?>
			<style>
				.update-nag {
					display: none !important;
				}
			</style>
            <?php

        }
    }

    function network_admin_menu()
    {
        $template    = Util::is_wp_compatible() ? 'options_page' : 'options_page_outdated_wp';
        $title       = __('WP Migrate', 'wp-migrate-db');
        $hook_suffix = add_submenu_page('settings.php',
            $title,
            $title,
            'manage_network_options',
            $this->properties->core_slug,
            array($this->template, $template));

        // Bail out early since WP isn't compatible.
        if (!Util::is_wp_compatible()) {
            return;
        }

        add_action('admin_head-' . $hook_suffix, array($this->plugin_manager_base, 'admin_head_connection_info'));
        add_action('load-' . $hook_suffix, array($this->assets, 'load_assets'));
        $this->compatibility_manager->addNotices();
    }

    /**
     * Add a tools menu item to sites on a Multisite network
     *
     */
    function network_tools_admin_menu()
    {
        add_management_page(
            $this->plugin_manager_base->get_plugin_title(),
            $this->plugin_manager_base->get_plugin_title(),
            'manage_network_options',
            $this->properties->core_slug,
            array(
                $this->template,
                'subsite_tools_options_page',
            )
        );
    }

    function admin_menu()
    {
        $template    = Util::is_wp_compatible() ? 'options_page' : 'options_page_outdated_wp';
        $title       = __('WP Migrate', 'wp-migrate-db');
        $hook_suffix = add_management_page($title,
            $title,
            'export',
            $this->properties->core_slug,
            array($this->template, $template));

        // Bail out early since WP isn't compatible.
        if (!Util::is_wp_compatible()) {
            return;
        }

        add_action('admin_head-' . $hook_suffix, array($this->plugin_manager_base, 'admin_head_connection_info'));
        add_action('admin_head-' . $hook_suffix, array($this->assets, 'localize_notification_strings'));
        add_action('load-' . $hook_suffix, array($this->assets, 'load_assets'));
        $this->compatibility_manager->addNotices();
    }
}
