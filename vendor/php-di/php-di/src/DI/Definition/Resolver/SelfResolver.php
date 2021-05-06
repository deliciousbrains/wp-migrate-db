<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Resolver;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
use DeliciousBrains\WPMDB\Container\DI\Definition\SelfResolvingDefinition;
use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
/**
 * Resolves self-resolving definitions.
 *
 * @since 5.3
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class SelfResolver implements \DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver
{
    /**
     * @var ContainerInterface
     */
    private $container;
    public function __construct(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        $this->container = $container;
    }
    /**
     * @param SelfResolvingDefinition $definition
     *
     * {@inheritdoc}
     */
    public function resolve(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        return $definition->resolve($this->container);
    }
    /**
     * @param SelfResolvingDefinition $definition
     *
     * {@inheritdoc}
     */
    public function isResolvable(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        return $definition->isResolvable($this->container);
    }
}
