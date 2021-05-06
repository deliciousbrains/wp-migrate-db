<?php

namespace DeliciousBrains\WPMDB\Free;

use DeliciousBrains\WPMDB\Free\Plugin\PluginManager;
use DeliciousBrains\WPMDB\Free\UI\Template;

class ClassMap extends \DeliciousBrains\WPMDB\ClassMap
{
    public $free_plugin_manager;
    public $free_template;

    public function __construct()
    {
        parent::__construct();

        $this->free_plugin_manager = new PluginManager(
            $this->settings,
            $this->assets,
            $this->util,
            $this->table,
            $this->http,
            $this->filesystem,
            $this->multisite,
            $this->properties,
            $this->migration_helper,
            $this->WPMDBRestAPIServer,
            $this->http_helper,
            $this->template_base,
            $this->notice
        );

        $this->free_template = new Template(
            $this->settings,
            $this->util,
            $this->profile_manager,
            $this->filesystem,
            $this->table,
            $this->properties,
            $this->free_plugin_manager
        );
    }
}
