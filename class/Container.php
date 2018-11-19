<?php

namespace DeliciousBrains\WPMDB;

class Container {

	// Hold the class instance.
	private static $instance = null;

	// The constructor is private
	// to prevent initiation with outer code.
	private function __construct() {
		require __DIR__ . '/../vendor/autoload.php';
	}

	// The object is created from within the class itself
	// only if the class has no instance.
	public static function getInstance() {
		if ( self::$instance == null ) {
			self::$instance = ( new Container() )->init();
		}

		return self::$instance;
	}

	public function init() {
		$container = new League\Container\Container();

		$container->addServiceProvider( new ServiceProvider );

		/* // Uses PHP reflection to figure out where a class is. Dramatically slows things down, enable at your own risk.
		$container->delegate(
			new \DeliciousBrains\WPMDB\League\Container\ReflectionContainer
		);
		*/

		return $container;
	}
}
