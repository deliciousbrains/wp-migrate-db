<?php

namespace DeliciousBrains\WPMDB\Common\Cli;

use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;

class CliManager {

	/**
	 * @var DynamicProperties
	 */
	private $dynamic_properties;

	public function __construct(
		DynamicProperties $dynamic_properties
	) {
		$this->dynamic_properties = $dynamic_properties;
	}

	function set_cli_migration() {
		$this->dynamic_properties->doing_cli_migration = true;
	}
}
