<?php

namespace DeliciousBrains\WPMDB;

abstract class ServiceProviderAbstract {
	public function get( $id ) {
		if ( isset( $this->$id ) ) {
			return $this->$id;
		}
	}
}
