<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Resolver;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
use DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException;
use DeliciousBrains\WPMDB\Container\DI\Definition\FactoryDefinition;
use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
use DeliciousBrains\WPMDB\Container\DI\Invoker\FactoryParameterResolver;
use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
use DeliciousBrains\WPMDB\Container\Invoker\Exception\NotCallableException;
use DeliciousBrains\WPMDB\Container\Invoker\Exception\NotEnoughParametersException;
use DeliciousBrains\WPMDB\Container\Invoker\Invoker;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\AssociativeArrayResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\NumericArrayResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ResolverChain;
/**
 * Resolves a factory definition to a value.
 *
 * @since 4.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class FactoryResolver implements \DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver
{
    /**
     * @var ContainerInterface
     */
    private $container;
    /**
     * @var Invoker|null
     */
    private $invoker;
    /**
     * @var DefinitionResolver
     */
    private $resolver;
    /**
     * The resolver needs a container. This container will be passed to the factory as a parameter
     * so that the factory can access other entries of the container.
     *
     * @param ContainerInterface $container
     */
    public function __construct(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container, \DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver $resolver)
    {
        $this->container = $container;
        $this->resolver = $resolver;
    }
    /**
     * Resolve a factory definition to a value.
     *
     * This will call the callable of the definition.
     *
     * @param FactoryDefinition $definition
     *
     * {@inheritdoc}
     */
    public function resolve(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        if (!$this->invoker) {
            $parameterResolver = new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ResolverChain([new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\AssociativeArrayResolver(), new \DeliciousBrains\WPMDB\Container\DI\Invoker\FactoryParameterResolver($this->container), new \DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\NumericArrayResolver()]);
            $this->invoker = new \DeliciousBrains\WPMDB\Container\Invoker\Invoker($parameterResolver, $this->container);
        }
        $callable = $definition->getCallable();
        try {
            $providedParams = [$this->container, $definition];
            $extraParams = $this->resolveExtraParams($definition->getParameters());
            $providedParams = \array_merge($providedParams, $extraParams);
            return $this->invoker->call($callable, $providedParams);
        } catch (\DeliciousBrains\WPMDB\Container\Invoker\Exception\NotCallableException $e) {
            // Custom error message to help debugging
            if (\is_string($callable) && \class_exists($callable) && \method_exists($callable, '__invoke')) {
                throw new \DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException(\sprintf('Entry "%s" cannot be resolved: factory %s. Invokable classes cannot be automatically resolved if autowiring is disabled on the container, you need to enable autowiring or define the entry manually.', $definition->getName(), $e->getMessage()));
            }
            throw new \DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException(\sprintf('Entry "%s" cannot be resolved: factory %s', $definition->getName(), $e->getMessage()));
        } catch (\DeliciousBrains\WPMDB\Container\Invoker\Exception\NotEnoughParametersException $e) {
            throw new \DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException(\sprintf('Entry "%s" cannot be resolved: %s', $definition->getName(), $e->getMessage()));
        }
    }
    /**
     * {@inheritdoc}
     */
    public function isResolvable(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        return \true;
    }
    private function resolveExtraParams(array $params)
    {
        $resolved = [];
        foreach ($params as $key => $value) {
            if ($value instanceof \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper) {
                // As per ObjectCreator::injectProperty, use '' for an anonymous sub-definition
                $value = $value->getDefinition('');
            }
            if (!$value instanceof \DeliciousBrains\WPMDB\Container\DI\Definition\Definition) {
                $resolved[$key] = $value;
            } else {
                $resolved[$key] = $this->resolver->resolve($value);
            }
        }
        return $resolved;
    }
}
