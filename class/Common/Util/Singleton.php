<?php
namespace DeliciousBrains\WPMDB\Common\Util;

trait Singleton {
	private static $instance;

	public static function getInstance() {
		if ( ! ( self::$instance instanceof self ) ) {
			self::$instance = new self;
		}

		return self::$instance;
	}
}
