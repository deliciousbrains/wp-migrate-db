<?php

namespace DeliciousBrains\WPMDB\Container\DI;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
/**
 * Debug utilities.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class Debug
{
    /**
     * Dump the definition to a string.
     *
     * @return string
     *
     * @deprecated You should cast the definition to string instead.
     * This feature was simplified: definitions can be cast to string directly.
     */
    public static function dumpDefinition(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition)
    {
        return (string) $definition;
    }
}
