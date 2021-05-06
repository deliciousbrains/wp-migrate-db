<?php

namespace DeliciousBrains\WPMDB;
use DeliciousBrains\WPMDB\Container\DI;

class WPMDBDI
{

    private static $container;

    public static function getInstance()
    {
        if (!(self::$container instanceof self)) {
            self::$container = new self;
        }

        $containerBuilder = new DI\ContainerBuilder;
        $containerBuilder->addDefinitions(__DIR__ . '/WPMDBDI_Config.php');
        $containerBuilder->useAutowiring(false);
        $container = $containerBuilder->build();

        return $container;
    }
}
