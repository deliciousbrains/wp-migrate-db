<?php

defined( 'ABSPATH' ) || exit;

use DeliciousBrains\WPMDB\SetupProviders;

$providers = new SetupProviders();
$is_pro = defined("WPMDB_PRO") && WPMDB_PRO;

$providers->setup($is_pro);

$classes = [];

if ($providers !== null) {
    foreach ($providers->classes as $key => $class) {
        if ($class === null) {
            continue;
        }
        // Access by classname ex. Properties::class
        $classes[get_class($class)] = function () use ($class) {
            return $class;
        };
        // Access by 'shorthand' ex. 'properties'
        $classes[$key] = function () use ($class) {
            return $class;
        };
    }
}


if (!empty($classes)) {
    return $classes;
}

throw new Exception(__("Classmap could not be generated.", 'wp-migrate-db'));
