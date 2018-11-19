<?php

namespace DeliciousBrains\WPMDB\League\Container\Definition;

use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareTrait;
class DefinitionFactory implements \DeliciousBrains\WPMDB\League\Container\Definition\DefinitionFactoryInterface
{
    use ImmutableContainerAwareTrait;
    /**
     * {@inheritdoc}
     */
    public function getDefinition($alias, $concrete)
    {
        if (\is_callable($concrete)) {
            return (new \DeliciousBrains\WPMDB\League\Container\Definition\CallableDefinition($alias, $concrete))->setContainer($this->getContainer());
        }
        if (\is_string($concrete) && \class_exists($concrete)) {
            return (new \DeliciousBrains\WPMDB\League\Container\Definition\ClassDefinition($alias, $concrete))->setContainer($this->getContainer());
        }
        // if the item is not definable we just return the value to be stored
        // in the container as an arbitrary value/instance
        return $concrete;
    }
}
