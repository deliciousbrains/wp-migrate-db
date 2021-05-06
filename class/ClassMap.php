<?php

namespace DeliciousBrains\WPMDB;

use DeliciousBrains\WPMDB\Common\BackupExport;
use DeliciousBrains\WPMDB\Common\Cli\CliManager;
use DeliciousBrains\WPMDB\Common\Compatibility\CompatibilityManager;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\Http\Scramble;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\Migration\FinalizeMigration;
use DeliciousBrains\WPMDB\Common\Migration\InitiateMigration;
use DeliciousBrains\WPMDB\Common\Migration\MigrationHelper;
use DeliciousBrains\WPMDB\Common\Migration\MigrationManager;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase;
use DeliciousBrains\WPMDB\Common\Profile\ProfileImporter;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Replace;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Settings\SettingsManager;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\UI\Notice;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Common\Migration\Flush;

class ClassMap
{

    public $filesystem;
    public $properties;
    public $util;
    public $settings;
    public $settings_manager;
    public $error_log;
    public $dynamic_props;
    public $scrambler;
    public $migration_state;
    public $http;
    public $migration_state_manager;
    public $migration_helper;
    public $form_data;
    public $state_data_container;
    public $remote_post;
    public $table_helper;
    public $multisite;
    public $http_helper;
    public $table;
    public $backup_export;
    public $migration_manager;
    public $initiate_migration;
    public $finalize_migration;
    public $replace;
    public $notice;
    public $profile_manager;
    public $template_base;
    public $compatibility_manager;
    public $assets;
    public $plugin_manager_base;
    public $cli_manager;
    public $cli;
    public $WPMDBRestAPIServer;
    public $flush;
    /**
     * @var ProfileImporter
     */
    public $profile_importer;

    public function __construct()
    {
        $this->state_data_container = new StateDataContainer();
        $this->filesystem           = new Common\Filesystem\Filesystem();
        $this->properties           = new Common\Properties\Properties();
        $this->util                 = new Common\Util\Util($this->properties, $this->filesystem);
        $this->WPMDBRestAPIServer   = new WPMDBRestAPIServer($this->properties);

        $this->settings         = new Settings(
            $this->util,
            $this->filesystem
        );


        $this->error_log = new ErrorLog(
            $this->settings,
            $this->filesystem,
            $this->util,
            $this->properties
        );

        $this->dynamic_props   = new DynamicProperties();
        $this->scrambler       = new Scramble();
        $this->migration_state = new Common\MigrationState\MigrationState();
        $this->http            = new Common\Http\Http(
            $this->util,
            $this->filesystem,
            $this->scrambler,
            $this->properties,
            $this->error_log
        );

        $this->migration_state_manager = new MigrationStateManager(
            $this->error_log,
            $this->util,
            new Common\MigrationState\MigrationState(),
            $this->http,
            $this->properties,
            $this->state_data_container
        );

        $this->form_data = new Common\FormData\FormData(
            $this->util,
            $this->migration_state_manager
        );

        $this->http_helper = new Helper(
            $this->settings,
            $this->http
        );

        $this->multisite = new Common\Multisite\Multisite(
            $this->migration_state_manager,
            $this->properties,
            $this->util
        );

        $this->table_helper = new TableHelper(
            $this->form_data,
            $this->migration_state_manager,
            $this->http
        );

        //RemotePost
        $this->remote_post = new RemotePost(
            $this->util,
            $this->filesystem,
            $this->migration_state_manager,
            $this->settings,
            $this->error_log,
            $this->scrambler,
            $this->properties
        );

        $this->replace = new Replace(
            $this->migration_state_manager,
            $this->table_helper,
            $this->error_log,
            $this->util,
            $this->form_data,
            $this->properties
        );

        // Notice
        $this->notice = new Notice();

        //Table
        $this->table = new Table(
            $this->filesystem,
            $this->util,
            $this->error_log,
            $this->migration_state_manager,
            $this->form_data,
            $this->table_helper,
            $this->multisite,
            $this->http,
            $this->http_helper,
            $this->remote_post,
            $this->properties,
            $this->replace
        );
        $this->profile_importer = new ProfileImporter($this->util, $this->table);
        // BackupExport
        $this->backup_export = new BackupExport(
            $this->settings,
            $this->filesystem,
            $this->table_helper,
            $this->http,
            $this->form_data,
            $this->table,
            $this->properties,
            $this->migration_state_manager
        );

        $this->assets = new Assets(
            $this->http,
            $this->error_log,
            $this->filesystem,
            $this->properties,
            $this->settings,
            $this->util
        );


        $this->migration_helper = new MigrationHelper(
            $this->multisite,
            $this->util,
            $this->table,
            $this->filesystem,
            $this->properties,
            $this->settings,
            $this->assets
        );
        //InitiateMigration
        $this->initiate_migration = new InitiateMigration(
            $this->migration_state_manager,
            new Common\MigrationState\MigrationState(),
            $this->table,
            $this->http,
            $this->http_helper,
            $this->util,
            $this->remote_post,
            $this->form_data,
            $this->filesystem,
            $this->error_log,
            $this->properties,
            $this->migration_helper,
            $this->backup_export
        );

        //FinalizeMigration
        $this->finalize_migration = new FinalizeMigration(
            $this->migration_state_manager,
            $this->table,
            $this->http,
            $this->table_helper,
            $this->http_helper,
            $this->util,
            $this->remote_post,
            $this->form_data,
            $this->properties,
            $this->migration_helper
        );

        // MigrationManager
        $this->migration_manager = new MigrationManager(
            $this->migration_state_manager,
            new Common\MigrationState\MigrationState(),
            $this->table,
            $this->http,
            $this->table_helper,
            $this->http_helper,
            $this->util,
            $this->remote_post,
            $this->form_data,
            $this->filesystem,
            $this->error_log,
            $this->backup_export,
            $this->multisite,
            $this->initiate_migration,
            $this->finalize_migration,
            $this->properties,
            $this->WPMDBRestAPIServer,
            $this->migration_helper
        );

        // ProfileManager
        $this->profile_manager = new ProfileManager(
            $this->http,
            $this->http_helper,
            $this->properties,
            $this->settings,
            $this->migration_state_manager,
            $this->util,
            $this->error_log,
            $this->table,
            $this->form_data,
            $this->assets,
            $this->WPMDBRestAPIServer,
            $this->profile_importer
        );

        // TemplateBase
        $this->template_base = new TemplateBase(
            $this->settings,
            $this->util,
            $this->profile_manager,
            $this->filesystem,
            $this->table,
            $this->properties
        );

        // CompatibilityManager
        $this->compatibility_manager = new CompatibilityManager(
            $this->filesystem,
            $this->settings,
            $this->notice,
            $this->http,
            $this->http_helper,
            $this->template_base,
            $this->migration_state_manager,
            $this->util,
            $this->properties,
            $this->WPMDBRestAPIServer
        );

        $this->settings_manager = new SettingsManager(
            $this->http,
            $this->settings,
            $this->migration_state_manager,
            $this->error_log,
            $this->http_helper,
            $this->WPMDBRestAPIServer,
            $this->util
        );

        $this->plugin_manager_base = new PluginManagerBase(
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

        $this->cli_manager = new CliManager();

        $this->cli = new Common\Cli\Cli(
            $this->form_data,
            $this->util,
            $this->cli_manager,
            $this->table,
            $this->error_log,
            $this->initiate_migration,
            $this->finalize_migration,
            $this->http_helper,
            $this->migration_manager,
            $this->migration_state_manager
        );
        $this->flush = new Flush($this->http_helper, $this->util, $this->remote_post, $this->http);
    }
}
