<?php

namespace DeliciousBrains\WPMDB;

use DeliciousBrains\WPMDB\Common\BackupExport;
use DeliciousBrains\WPMDB\Common\Compatibility\CompatibilityManager;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\Http\Scramble;
use DeliciousBrains\WPMDB\Common\Migration\FinalizeMigration;
use DeliciousBrains\WPMDB\Common\Migration\InitiateMigration;
use DeliciousBrains\WPMDB\Common\Migration\MigrationManager;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Replace;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Settings\SettingsManager;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\UI\Notice;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\League\Container\ServiceProvider\AbstractServiceProvider;

class ServiceProvider extends AbstractServiceProvider {

	/**
	 * The provides array is a way to let the container
	 * know that a service is provided by this service
	 * provider. Every service that is registered via
	 * this service provider must have an alias added
	 * to this array or it will be ignored.
	 *
	 * @var array
	 */
	protected $provides = [
		'properties',
		'dynamic_properties',
		'form_data',
		'util',
		'filesystem',
		'settings',
		'settings_manager',
		'error_log',
		'http',
		'http_helper',
		'table',
		'table_helper',
		'migration_state',
		'migration_state_manager',
		'replace',
		'state_data_container',
		'profile_manager',
		'multisite',
		'plugin_manager',
		'assets',
		'menu',
		'finalize_migration',
		'initiate_migration',
		'migration_manager',
		'connection',
		'remote_post',
		'backup_export',
		'notice',
		'profile_manager',
		'template_base',
		'compatibility_manager',
		'cli',
		'cli_manager',
	];

	private $filesystem;
	private $properties;
	private $util;
	private $settings;
	private $settings_manager;
	private $error_log;
	private $dynamic_props;
	private $scrambler;
	private $migration_state;
	private $http;
	private $migration_state_manager;
	private $form_data;
	private $state_data_container;
	private $remote_post;
	private $table_helper;
	private $multisite;
	private $http_helper;
	private $table;
	private $backup_export;
	private $migration_manager;
	private $initiate_migration;
	private $finalize_migration;
	private $replace;
	private $notice;
	private $profile_manager;
	private $template_base;
	private $compatibility_manager;

	/**
	 * We assign class instances to properties here to use in the Container.
	 *
	 * This allows us to only use *one* instance of each class throughout the application.
	 *
	 * By using the syntax `$this->getContainer()->add( 'whatever_class', new WhateverClass() );`
	 * we tell the Container that we only want to have one instance of this class.
	 *
	 * When you grab the class from the Container using `get()` you'll only ever get one instance
	 *
	 * If you want multiple instances of a class, just call the class in the add() function
	 *
	 * $this->getContainer()->add( 'DeliciousBrains\WPMDB\Common\SomeClass');
	 * // Later
	 * $this->get('DeliciousBrains\WPMDB\Common\SomeClass'); // new instance of `SomeClass`
	 *
	 * @TODO Generate this automatically
	 * @see  http://container.thephpleague.com/2.x/basic-usage/
	 *
	 */
	public function setupSharedClasses() {

		$this->state_data_container = new StateDataContainer();
		$this->filesystem           = new Common\Filesystem\Filesystem();
		$this->properties           = new Common\Properties\Properties();
		$this->util                 = new Common\Util\Util( $this->properties, $this->filesystem );
		$this->settings             = new Settings(
			$this->util
		);

		$this->error_log = new ErrorLog(
			$this->settings,
			$this->filesystem,
			$this->util,
			$this->properties,
			$this->state_data_container
		);

		$this->dynamic_props   = new DynamicProperties();
		$this->scrambler       = new Scramble();
		$this->migration_state = new Common\MigrationState\MigrationState();
		$this->http            = new Common\Http\Http(
			$this->util,
			$this->filesystem,
			$this->scrambler,
			$this->dynamic_props,
			$this->properties
		);

		$this->migration_state_manager = new MigrationStateManager(
			$this->error_log,
			$this->util,
			new Common\MigrationState\MigrationState(),
			$this->http,
			$this->dynamic_props,
			$this->properties,
			$this->state_data_container
		);
		$this->form_data               = new Common\FormData\FormData(
			$this->util,
			$this->migration_state_manager
		);

		$this->http_helper = new Helper(
			$this->settings
		);

		$this->multisite = new Common\Multisite\Multisite(
			$this->migration_state_manager,
			$this->dynamic_props,
			$this->properties,
			$this->util
		);

		$this->table_helper = new TableHelper(
			$this->form_data,
			$this->state_data_container
		);

		//RemotePost
		$this->remote_post = new RemotePost(
			$this->util,
			$this->filesystem,
			$this->migration_state_manager,
			$this->settings,
			$this->error_log,
			$this->scrambler,
			$this->dynamic_props,
			$this->properties
		);

		$this->replace = new Replace(
			$this->migration_state_manager,
			$this->table_helper,
			$this->error_log,
			$this->util
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
			$this->dynamic_props,
			$this->replace
		);

		// BackupExport
		$this->backup_export = new BackupExport(
			$this->settings,
			$this->filesystem,
			$this->table_helper,
			$this->http,
			$this->form_data,
			$this->table,
			$this->properties,
			$this->state_data_container
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
			$this->properties
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
			$this->properties
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
			$this->dynamic_props,
			$this->properties
		);

		// ProfileManager
		$this->profile_manager = new ProfileManager(
			$this->http,
			$this->properties,
			$this->settings,
			$this->migration_state_manager,
			$this->util,
			$this->error_log,
			$this->table,
			$this->form_data
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
			$this->template_base,
			$this->migration_state_manager,
			$this->util,
			$this->properties
		);

		$this->settings_manager = new SettingsManager(
			$this->http,
			$this->settings,
			$this->migration_state_manager,
			$this->error_log
		);
	}

	/**
	 * This is where the magic happens, within the method you can
	 * access the container and register or retrieve anything
	 * that you need to, but remember, every alias registered
	 * within this method must be declared in the `$provides` array.
	 *
	 * Each class is _only_ registered when required (lazily loaded)
	 *
	 * Using an alias ensures that each class only uses 1 instance, vs. creating a new instance each time.
	 *
	 * If you want to a new instance created in the container each time, remove the alias
	 *
	 */
	public function register() {

		$this->setupSharedClasses();

		// Properties
		$this->getContainer()->add( 'properties', $this->properties );
		$this->getContainer()->add( 'dynamic_properties', $this->dynamic_props );

		// StateDataContainer
		$this->getContainer()->add( 'state_data_container', $this->state_data_container );

		// Filesystem
		$this->getContainer()->add( 'filesystem', $this->filesystem );

		// FormData
		$this->getContainer()->add( 'form_data', $this->form_data );

		// ErrorLog
		$this->getContainer()->add( 'error_log', $this->error_log );

		// Util
		$this->getContainer()->add( 'util', $this->util );

		// Settings
		$this->getContainer()->add( 'settings', $this->settings );

		// Scramble
		$this->getContainer()->add( 'scramble', $this->scrambler );

		//Http
		$this->getContainer()->add( 'http', $this->http );

		// RemotePost
		$this->getContainer()->add( 'remote_post', $this->remote_post );

		// HttpHelper
		$this->getContainer()->add( 'http_helper', $this->http_helper );

		// Replace
		$this->getContainer()->add( 'replace', $this->replace );

		// MigrationState
		$this->getContainer()->add( 'migration_state', new Common\MigrationState\MigrationState() );

		// MigrationStateManager
		$this->getContainer()->add( 'migration_state_manager', $this->migration_state_manager );

		// Multisite
		$this->getContainer()->add( 'multisite', $this->multisite );

		// CompatibilityManager
		$this->getContainer()->add( 'compatibility_manager', $this->compatibility_manager );

		// TableHelper
		$this->getContainer()->add( 'table_helper', $this->table_helper );

		// Notice
		$this->getContainer()->add( 'notice', $this->notice );

		// Table
		$this->getContainer()->add( 'table', $this->table );

		//ProfileManager
		$this->getContainer()->add( 'profile_manager', $this->profile_manager );

		//Assets
		$this->getContainer()->add( 'assets', 'DeliciousBrains\WPMDB\Common\Plugin\Assets' )
		     ->withArguments( [
			     'http',
			     'error_log',
			     'filesystem',
			     'properties',
		     ] );

		//PluginManagerBase
		$this->getContainer()->add( 'plugin_manager_base', 'DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase' )
		     ->withArguments( [
			     'settings',
			     'assets',
			     'util',
			     'table',
			     'http',
			     'filesystem',
			     'multisite',
			     'properties',
		     ] );

		$this->getContainer()->add( 'template_base', $this->template_base );

		//Menu
		$this->getContainer()->add( 'menu', 'DeliciousBrains\WPMDB\Common\Plugin\Menu' )
		     ->withArguments( [
			     'properties',
			     'plugin_manager_base',
			     'assets',
		     ] );

		$this->getContainer()->add( 'cli_manager', 'DeliciousBrains\WPMDB\Common\Cli\CliManager' )
		     ->withArguments( [
			     'dynamic_properties',
		     ] );

		$this->getContainer()->add( 'cli', 'DeliciousBrains\WPMDB\Common\Cli\Cli' )
		     ->withArguments( [
			     'form_data',
			     'util',
			     'cli_manager',
			     'table',
			     'error_log',
			     'initiate_migration',
			     'finalize_migration',
			     'http_helper',
			     'migration_manager',
			     'migration_state_manager',
			     'dynamic_properties',
		     ] );

		// Backup Export
		$this->getContainer()->add( 'backup_export', $this->backup_export );
		// InitiateMigration
		$this->getContainer()->add( 'initiate_migration', $this->initiate_migration );
		// FinalizeMigration
		$this->getContainer()->add( 'finalize_migration', $this->finalize_migration );
		// MigrationManager
		$this->getContainer()->add( 'migration_manager', $this->migration_manager );
		//SettingsManager
		$this->getContainer()->add( 'settings_manager', $this->settings_manager );
	}
}
