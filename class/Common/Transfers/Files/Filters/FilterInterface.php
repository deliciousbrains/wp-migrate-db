<?php

namespace DeliciousBrains\WPMDB\Common\Transfers\Files\Filters;

interface FilterInterface {
    public function filter( $file );
    public function can_filter( $file, $state_data );
}
