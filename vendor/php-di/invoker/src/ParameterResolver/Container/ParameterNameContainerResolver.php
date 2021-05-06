<?php

namespace DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\Container;

use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ParameterResolver;
use ReflectionFunctionAbstract;
/**
 * Inject entries from a DI container using the parameter names.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class ParameterNameContainerResolver implements \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ParameterResolver
{
    /**
     * @var ContainerInterface
     */
    private $container;
    /**
     * @param ContainerInterface $container The container to get entries from.
     */
    public function __construct(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        $this->container = $container;
    }
    public function getParameters(\ReflectionFunctionAbstract $reflection, array $providedParameters, array $resolvedParameters)
    {
        $parameters = $reflection->getParameters();
        // Skip parameters already resolved
        if (!empty($resolvedParameters)) {
            $parameters = \array_diff_key($parameters, $resolvedParameters);
        }
        foreach ($parameters as $index => $parameter) {
            $name = $parameter->name;
            if ($name && $this->container->has($name)) {
                $resolvedParameters[$index] = $this->container->get($name);
            }
        }
        return $resolvedParameters;
    }
}
