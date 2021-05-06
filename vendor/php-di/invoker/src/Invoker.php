<?php

namespace DeliciousBrains\WPMDB\Container\Invoker;

use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
use DeliciousBrains\WPMDB\Container\Invoker\Exception\NotCallableException;
use DeliciousBrains\WPMDB\Container\Invoker\Exception\NotEnoughParametersException;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\AssociativeArrayResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\DefaultValueResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\NumericArrayResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ParameterResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ResolverChain;
use DeliciousBrains\WPMDB\Container\Invoker\Reflection\CallableReflection;
/**
 * Invoke a callable.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class Invoker implements \DeliciousBrains\WPMDB\Container\Invoker\InvokerInterface
{
    /**
     * @var CallableResolver|null
     */
    private $callableResolver;
    /**
     * @var ParameterResolver
     */
    private $parameterResolver;
    /**
     * @var ContainerInterface|null
     */
    private $container;
    public function __construct(\DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ParameterResolver $parameterResolver = null, \DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container = null)
    {
        $this->parameterResolver = $parameterResolver ?: $this->createParameterResolver();
        $this->container = $container;
        if ($container) {
            $this->callableResolver = new \DeliciousBrains\WPMDB\Container\Invoker\CallableResolver($container);
        }
    }
    /**
     * {@inheritdoc}
     */
    public function call($callable, array $parameters = array())
    {
        if ($this->callableResolver) {
            $callable = $this->callableResolver->resolve($callable);
        }
        if (!\is_callable($callable)) {
            throw new \DeliciousBrains\WPMDB\Container\Invoker\Exception\NotCallableException(\sprintf('%s is not a callable', \is_object($callable) ? 'Instance of ' . \get_class($callable) : \var_export($callable, \true)));
        }
        $callableReflection = \DeliciousBrains\WPMDB\Container\Invoker\Reflection\CallableReflection::create($callable);
        $args = $this->parameterResolver->getParameters($callableReflection, $parameters, array());
        // Sort by array key because call_user_func_array ignores numeric keys
        \ksort($args);
        // Check all parameters are resolved
        $diff = \array_diff_key($callableReflection->getParameters(), $args);
        if (!empty($diff)) {
            /** @var \ReflectionParameter $parameter */
            $parameter = \reset($diff);
            throw new \DeliciousBrains\WPMDB\Container\Invoker\Exception\NotEnoughParametersException(\sprintf('Unable to invoke the callable because no value was given for parameter %d ($%s)', $parameter->getPosition() + 1, $parameter->name));
        }
        return \call_user_func_array($callable, $args);
    }
    /**
     * Create the default parameter resolver.
     *
     * @return ParameterResolver
     */
    private function createParameterResolver()
    {
        return new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ResolverChain(array(new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\NumericArrayResolver(), new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\AssociativeArrayResolver(), new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\DefaultValueResolver()));
    }
    /**
     * @return ParameterResolver By default it's a ResolverChain
     */
    public function getParameterResolver()
    {
        return $this->parameterResolver;
    }
    /**
     * @return ContainerInterface|null
     */
    public function getContainer()
    {
        return $this->container;
    }
    /**
     * @return CallableResolver|null Returns null if no container was given in the constructor.
     */
    public function getCallableResolver()
    {
        return $this->callableResolver;
    }
}
