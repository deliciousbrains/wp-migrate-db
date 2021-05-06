<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Source;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
/**
 * Describes a definition source to which we can add new definitions.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
interface MutableDefinitionSource extends \DeliciousBrains\WPMDB\Container\DI\Definition\Source\DefinitionSource
{
    public function addDefinition(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition);
}
