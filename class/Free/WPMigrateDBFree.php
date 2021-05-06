<?php

namespace DeliciousBrains\WPMDB\Free;

use DeliciousBrains\WPMDB\Common\Compatibility\CompatibilityManager;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Migration\MigrationManager;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Plugin\Menu;
use DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\Free\Plugin\PluginManager;
use DeliciousBrains\WPMDB\Free\UI\Template;
use DeliciousBrains\WPMDB\WPMDBDI;
use DeliciousBrains\WPMDB\WPMigrateDB;

class WPMigrateDBFree extends WPMigrateDB
{

    /**
     * @var Menu
     */
    private $menu;

    public function __construct($pro = false)
    {
        parent::__construct(false);
    }

    public function register()
    {
        parent::register();
        $container = WPMDBDI::getInstance();

        $container->set(Menu::class, new Menu(
            $container->get(Util::class),
            $container->get(Properties::class),
            $container->get(PluginManagerBase::class),
            $container->get(Assets::class),
            $container->get(CompatibilityManager::class)
        ));

        //Menu
        $this->menu = $container->get(Menu::class);
        $container->get(MigrationManager::class)->register();
        $container->get(PluginManager::class)->register();
        $container->get(Menu::class)->register();
        $container->get(Template::class)->register();

        $filesystem = $container->get(Filesystem::class);
        $filesystem->register();
    }
}
