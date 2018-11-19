<?php

namespace DeliciousBrains\WPMDB\Free\Plugin;

use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Plugin\PluginManagerBase;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class PluginManager extends PluginManagerBase {
	public function __construct(
		Settings $settings,
		Assets $assets,
		Util $util,
		Table $table,
		Http $http,
		Filesystem $filesystem,
		Multisite $multisite,
		Properties $properties
	) {

		parent::__construct( $settings,
			$assets,
			$util,
			$table,
			$http,
			$filesystem,
			$multisite,
			$properties
		);
	}

	public function register() {
		parent::register();
		$cli = Container::getInstance()->get('cli');
		$cli->register();
	}
}
