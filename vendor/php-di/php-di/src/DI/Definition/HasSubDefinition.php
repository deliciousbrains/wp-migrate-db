<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

/**
 * A definition that has a sub-definition.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
interface HasSubDefinition extends \DeliciousBrains\WPMDB\Container\DI\Definition\Definition
{
    /**
     * @return string
     */
    public function getSubDefinitionName();
    /**
     * @param Definition $definition
     */
    public function setSubDefinition(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition);
}
