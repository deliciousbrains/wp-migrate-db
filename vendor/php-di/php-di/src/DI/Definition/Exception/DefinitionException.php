<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Exception;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
/**
 * Invalid DI definitions.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class DefinitionException extends \Exception
{
    public static function create(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, $message)
    {
        return new self(\sprintf('%s' . \PHP_EOL . 'Full definition:' . \PHP_EOL . '%s', $message, (string) $definition));
    }
}
