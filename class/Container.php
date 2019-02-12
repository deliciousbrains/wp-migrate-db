<?php

namespace DeliciousBrains\WPMDB;

/**
 * Class Container
 *
 * 'Container' for all the plugins classes. Singleton, so new instances shouldn't be created.
 *
 * DO:
 * Container::getInstance();
 *
 * DONT'T DO
 * new Container();
 *
 * @package DeliciousBrains\WPMDB
 */
class Container {

	public $providers = [];
	public $classes = [];
	public $props;
	private static $instance;

	/**
	 * Protected constructor to prevent creating a new instance of the
	 * class via the `new` operator from outside of this class.
	 */
	protected function __construct() { }
	/**
	 * As this class is a singleton it should not be clone-able
	 */
	protected function __clone() {}
	/**
	 * As this class is a singleton it should not be able to be unserialized
	 */
	protected function __wakeup() {}

	public static function getInstance() {
		if ( ! ( self::$instance instanceof self ) ) {
			self::$instance = new self;
		}

		return self::$instance;
	}

	public function setUpProviders( $pro = false ) {
		$potential_classes = [
			'DeliciousBrains\WPMDB\ServiceProvider',
		];

		if ( $pro ) {
			$pro_classes       = [
				'DeliciousBrains\WPMDB\Pro\ServiceProvider',
				'DeliciousBrains\WPMDBCli\ServiceProvider',
				'DeliciousBrains\WPMDBMST\ServiceProvider',
				'DeliciousBrains\WPMDBMF\ServiceProvider',
				'DeliciousBrains\WPMDBTP\ServiceProvider',
			];
			$potential_classes = $pro_classes + $potential_classes;
		} else {
			$potential_classes[] = 'DeliciousBrains\WPMDB\Free\ServiceProvider';
		}

		foreach ( $potential_classes as $class ) {
			$this->maybeAddProvider( $class );
		}

		if ( ! empty( $this->providers ) ) {
			foreach ( $this->providers as $provider ) {
				$vars = get_object_vars( $provider );
				foreach ( $vars as $prop => $var ) {
					if ( ! \in_array( $var, $this->classes ) ) {
						$this->classes[ $prop ] = $var;
					}
				}
			}
		}
	}

	public function maybeAddProvider( $class ) {
		if ( class_exists( $class ) ) {
			$this->providers[ $class ] = new $class;
		}
	}

	public function get( $id ) {
		if ( empty( $this->classes ) ) {
			$this->setUpProviders();
		}

		if ( array_key_exists( $id, $this->classes ) ) {
			return $this->classes[ $id ];
		}

		//For back-compat
		return $this;
	}

	public function addClass( $key, $instance ) {
		$this->classes[ $key ] = $instance;

		return $instance;
	}

	//For back-compat
	public function add( $key, $instance ) {
		return $this;
	}

	public function has( $id ) {
		if ( ! array_key_exists( $id, $this->classes ) ) {
			return true;
		}

		return false;
	}

	//For back-compat
	public function withArguments(){
		//NoOp
	}

	//For back-compat
	public function register(){
		//NoOp
	}
}
