<?php

namespace DeliciousBrains\WPMDB\Common\Cli;

use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;

class CliManager
{

	/**
	 * @var DynamicProperties
	 */
	private $dynamic_properties;

	public function __construct()
	{
		$this->dynamic_properties = DynamicProperties::getInstance();
	}

	function set_cli_migration()
	{
		DynamicProperties::getInstance()->doing_cli_migration = true;
	}
}
