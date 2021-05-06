<?php

namespace DeliciousBrains\WPMDB;


class SetupProviders
{

	public $providers = [];
	public $classes = [];

	function setup( $pro = false )
	{
		$potential_classes = [];

		if ( $pro ) {
			$pro_classes       = [
				\DeliciousBrains\WPMDB\Pro\ClassMap::class,
				\DeliciousBrains\WPMDBMST\ClassMap::class,
				\DeliciousBrains\WPMDBCli\ClassMap::class,
				\DeliciousBrains\WPMDBMF\ClassMap::class,
				\DeliciousBrains\WPMDBTP\ClassMap::class,
			];
			$potential_classes = array_merge( $pro_classes, $potential_classes );
		} else {
			$potential_classes[] = \DeliciousBrains\WPMDB\Free\ClassMap::class;
		}

		foreach ( $potential_classes as $class ) {
			$this->maybeAddProvider( $class );
		}

		if ( !empty( $this->providers ) ) {
			$classes = $this->classes;
			foreach ( $this->providers as $provider ) {
				$vars = get_object_vars( $provider );
				foreach ( $vars as $prop => $var ) {
					if ( !\in_array( $var, $classes, true ) ) {
						$classes[$prop] = $var;
					}
				}
			}

			$this->classes = $classes;
		}
	}

	function maybeAddProvider( $class )
	{
		if ( class_exists( $class ) ) {
			$this->providers[] = new $class;
		}
	}

}

