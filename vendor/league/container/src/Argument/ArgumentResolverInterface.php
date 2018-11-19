<?php

namespace DeliciousBrains\WPMDB\League\Container\Argument;

use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface;
use ReflectionFunctionAbstract;
interface ArgumentResolverInterface extends \DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareInterface
{
    /**
     * Resolve an array of arguments to their concrete implementations.
     *
     * @param  array $arguments
     * @return array
     */
    public function resolveArguments(array $arguments);
    /**
     * Resolves the correct arguments to be passed to a method.
     *
     * @param  \ReflectionFunctionAbstract $method
     * @param  array                       $args
     * @return array
     */
    public function reflectArguments(\ReflectionFunctionAbstract $method, array $args = []);
}
