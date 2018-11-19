<?php

namespace DeliciousBrains\WPMDB\Free;

use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\WPMigrateDB;

class WPMigrateDBFree extends WPMigrateDB {

	public function register() {
		parent::register();
		$container = Container::getInstance();
		$container->add( 'free_template', 'DeliciousBrains\WPMDB\Free\UI\Template' )
		          ->withArguments( [
			          'settings',
			          'util',
			          'profile_manager',
			          'filesystem',
			          'table',
			          'properties',
			          'plugin_manager',
		          ] );

		//PluginManager
		$container->add( 'plugin_manager', 'DeliciousBrains\WPMDB\Free\Plugin\PluginManager' )
		          ->withArguments( [
			          'settings',
			          'assets',
			          'util',
			          'table',
			          'http',
			          'filesystem',
			          'multisite',
			          'properties',
			          'template_base',
		          ] );

		$container->get( 'migration_manager' )->register();
		$container->get( 'plugin_manager' )->register();
		$container->get( 'menu' )->register();
	}
}
