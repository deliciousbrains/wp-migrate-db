<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Resolver;

use DeliciousBrains\WPMDB\Container\DI\Definition\Definition;
use DeliciousBrains\WPMDB\Container\DI\Definition\EnvironmentVariableDefinition;
use DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException;
use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
/**
 * Resolves a environment variable definition to a value.
 *
 * @author James Harris <james.harris@icecave.com.au>
 */
class EnvironmentVariableResolver implements \DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver
{
    /**
     * @var DefinitionResolver
     */
    private $definitionResolver;
    /**
     * @var callable
     */
    private $variableReader;
    public function __construct(\DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver $definitionResolver, $variableReader = 'getenv')
    {
        $this->definitionResolver = $definitionResolver;
        $this->variableReader = $variableReader;
    }
    /**
     * Resolve an environment variable definition to a value.
     *
     * @param EnvironmentVariableDefinition $definition
     *
     * {@inheritdoc}
     */
    public function resolve(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        $value = \call_user_func($this->variableReader, $definition->getVariableName());
        if (\false !== $value) {
            return $value;
        }
        if (!$definition->isOptional()) {
            throw new \DeliciousBrains\WPMDB\Container\DI\Definition\Exception\DefinitionException(\sprintf("The environment variable '%s' has not been defined", $definition->getVariableName()));
        }
        $value = $definition->getDefaultValue();
        // Nested definition
        if ($value instanceof \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper) {
            return $this->definitionResolver->resolve($value->getDefinition(''));
        }
        return $value;
    }
    /**
     * @param EnvironmentVariableDefinition $definition
     *
     * {@inheritdoc}
     */
    public function isResolvable(\DeliciousBrains\WPMDB\Container\DI\Definition\Definition $definition, array $parameters = [])
    {
        return \true;
    }
}
