<?php

namespace DeliciousBrains\WPMDB\Common\Upgrades\Routines;

interface RoutineInterface {
    public function apply(&$profile);
    public function get_target_schema_version();
}
