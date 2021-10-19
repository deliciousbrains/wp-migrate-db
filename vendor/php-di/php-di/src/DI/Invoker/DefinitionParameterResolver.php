<?php

namespace DeliciousBrains\WPMDB\Container\DI\Invoker;

use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
use DeliciousBrains\WPMDB\Container\DI\Definition\Resolver\DefinitionResolver;
use DeliciousBrains\WPMDB\Container\Invoker\ParameterResolver\ParameterResolver;
use ReflectionFunctionAbstract;
/**
 * Resolves callable parameters using definitions.
 *
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class DefinitionParameterResolver implements ParameterResolver
{
    /**
     * @var DefinitionResolver
     */
    private $definitionResolver;
    public function __construct(DefinitionResolver $definitionResolver)
    {
        $this->definitionResolver = $definitionResolver;
    }
    /**
     * {@inheritdoc}
     */
    public function getParameters(ReflectionFunctionAbstract $reflection, array $providedParameters, array $resolvedParameters)
    {
        // Skip parameters already resolved
        if (!empty($resolvedParameters)) {
            $providedParameters = \array_diff_key($providedParameters, $resolvedParameters);
        }
        foreach ($providedParameters as $key => $value) {
            if (!$value instanceof DefinitionHelper) {
                continue;
            }
            $definition = $value->getDefinition('');
            $value = $this->definitionResolver->resolve($definition);
            if (\is_int($key)) {
                // Indexed by position
                $resolvedParameters[$key] = $value;
            } else {
                // Indexed by parameter name
                // TODO optimize?
                $reflectionParameters = $reflection->getParameters();
                foreach ($reflectionParameters as $reflectionParameter) {
                    if ($key === $reflectionParameter->name) {
                        $resolvedParameters[$reflectionParameter->getPosition()] = $value;
                    }
                }
            }
        }
        return $resolvedParameters;
    }
}
