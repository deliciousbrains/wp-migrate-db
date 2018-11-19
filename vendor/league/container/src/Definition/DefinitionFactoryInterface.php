<?php

namespace DeliciousBrains\WPMDB\League\Container\Definition;

use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface;
interface DefinitionFactoryInterface extends \DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface
{
    /**
     * Return a definition based on type of concrete.
     *
     * @param  string $alias
     * @param  mixed  $concrete
     * @return mixed
     */
    public function getDefinition($alias, $concrete);
}
