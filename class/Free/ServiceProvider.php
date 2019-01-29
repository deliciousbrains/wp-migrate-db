<?php

namespace DeliciousBrains\WPMDB\Free;

use DeliciousBrains\WPMDB\Free\Plugin\PluginManager;
use DeliciousBrains\WPMDB\Free\UI\Template;

class ServiceProvider extends \DeliciousBrains\WPMDB\ServiceProvider {

	/**'
	 * @var PluginManager
	 */
	public $plugin_manager;
	/**
	 * @var Template
	 */
	public $free_template;

	public function __construct() {
		parent::__construct();
		$this->plugin_manager = new PluginManager(
			$this->settings,
			$this->assets,
			$this->util,
			$this->table,
			$this->http,
			$this->filesystem,
			$this->multisite,
			$this->properties
		);

		$this->free_template = new Template(
			$this->settings,
			$this->util,
			$this->profile_manager,
			$this->filesystem,
			$this->table,
			$this->properties,
			$this->plugin_manager
		);
	}
}
