<?php

namespace DeliciousBrains\WPMDB\League\Container\Inflector;

use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface;
interface InflectorAggregateInterface extends \DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface
{
    /**
     * Add an inflector to the aggregate.
     *
     * @param  string   $type
     * @param  callable $callback
     * @return \League\Container\Inflector\Inflector
     */
    public function add($type, callable $callback = null);
    /**
     * Applies all inflectors to an object.
     *
     * @param  object $object
     * @return object
     */
    public function inflect($object);
}
