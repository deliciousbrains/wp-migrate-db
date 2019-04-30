<?php

namespace DeliciousBrains\WPMDB\Free;

use DeliciousBrains\WPMDB\Common\Plugin\Menu;
use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\WPMigrateDB;

class WPMigrateDBFree extends WPMigrateDB {

	public function __construct( $pro = false ) {
		parent::__construct( false );
	}

	public function register() {
		parent::register();
		$container = Container::getInstance();

		//Menu
		$this->menu = $container->addClass( 'menu', new Menu(
				$container->get( 'properties' ),
				$container->get( 'plugin_manager_base' ),
				$container->get( 'assets' )
			)
		);

		$container->get( 'migration_manager' )->register();
		$container->get( 'plugin_manager' )->register();
		$container->get( 'menu' )->register();
		$container->get( 'free_template' )->register();

		$filesystem = $container->get( 'filesystem' );
		$filesystem->register();
	}
}
