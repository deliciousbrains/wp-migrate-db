<?php

namespace DeliciousBrains\WPMDB\Common\Addon;

interface AddonManagerInterface {
    public function register($licensed);
    public function get_license_response_key();
}
