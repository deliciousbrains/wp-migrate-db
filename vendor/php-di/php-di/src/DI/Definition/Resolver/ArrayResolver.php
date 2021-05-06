<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Resolver;

use DeliciousBrains\WPMDB\Container\DI\Definition\ArrayDefinition;
use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
use DeliciousBrains\WPMDB\Container\DI\DependencyException;
use Exception;
/**
 * Resolves an array definition to a value.
 *
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class ArrayResolver implements \DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver
{
    /**
     * @var DefinitionResolver
     */
    private $definitionResolver;
    /**
     * @param DefinitionResolver $definitionResolver Used to resolve nested definitions.
     */
    public function __construct(\DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver $definitionResolver)
    {
        $this->definitionResolver = $definitionResolver;
    }
    /**
     * Resolve an array definition to a value.
     *
     * An array definition can contain simple values or references to other entries.
     *
     * @param ArrayDefinition $definition
     *
     * {@inheritdoc}
     */
    public function resolve(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        $values = $definition->getValues();
        // Resolve nested definitions
        foreach ($values as $key => $value) {
            if ($value instanceof \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper) {
                $values[$key] = $this->resolveDefinition($value, $definition, $key);
            }
        }
        return $values;
    }
    /**
     * {@inheritdoc}
     */
    public function isResolvable(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        return \true;
    }
    private function resolveDefinition(\DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper $value, \DeliciousBrains\WPMDB\Container\DI\Definition\ArrayDefinition $definition, $key)
    {
        try {
            return $this->definitionResolver->resolve($value->getDefinition(''));
        } catch (\DeliciousBrains\WPMDB\Container\DI\DependencyException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \DeliciousBrains\WPMDB\Container\DI\DependencyException(\sprintf('Error while resolving %s[%s]. %s', $definition->getName(), $key, $e->getMessage()), 0, $e);
        }
    }
}
