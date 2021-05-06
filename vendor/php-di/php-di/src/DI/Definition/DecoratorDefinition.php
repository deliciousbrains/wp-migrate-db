<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

/**
 * Factory that decorates a sub-definition.
 *
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class DecoratorDefinition extends \DeliciousBrains\WPMDB\Container\DI\Definition\FactoryDefinition implements \DeliciousBrains\WPMDB\Container\DI\Definition\Definition, \DeliciousBrains\WPMDB\Container\DI\Definition\HasSubDefinition
{
    /**
     * @var Definition
     */
    private $decorated;
    /**
     * @return string
     */
    public function getSubDefinitionName()
    {
        return $this->getName();
    }
    /**
     * @param Definition $definition
     */
    public function setSubDefinition(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition)
    {
        $this->decorated = $definition;
    }
    /**
     * @return Definition
     */
    public function getDecoratedDefinition()
    {
        return $this->decorated;
    }
    public function __toString()
    {
        return 'Decorate(' . $this->getSubDefinitionName() . ')';
    }
}
