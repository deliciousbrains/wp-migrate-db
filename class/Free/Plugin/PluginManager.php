<?php

namespace DeliciousBrains\WPMDB\Free\Plugin;

use DeliciousBrains\WPMDB\Common\Cli\Cli;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\Migration\MigrationHelper;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\UI\Notice;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\WPMDBDI;

class PluginManager extends PluginManagerBase
{

    public function __construct(
        Settings $settings,
        Assets $assets,
        Util $util,
        Table $table,
        Http $http,
        Filesystem $filesystem,
        Multisite $multisite,
        Properties $properties,
        MigrationHelper $migration_helper,
        WPMDBRestAPIServer $rest_API_server,
        Helper $http_helper,
        TemplateBase $template_base,
        Notice $notice
    ) {
        parent::__construct(
            $settings,
            $assets,
            $util,
            $table,
            $http,
            $filesystem,
            $multisite,
            $properties,
            $migration_helper,
            $rest_API_server,
            $http_helper,
            $template_base,
            $notice
        );
    }

    public function register()
    {
        parent::register();
        $cli = WPMDBDI::getInstance()->get(Cli::class);
        $cli->register();
    }
}
