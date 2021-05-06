<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

use DeliciousBrains\WPMDB\Container\DI\DependencyException;
use DeliciousBrains\WPMDB\Container\DI\Scope;
use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
use DeliciousBrains\WPMDB\Container\Interop\Container\Exception\NotFoundException;
/**
 * Definition of a string composed of other strings.
 *
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class StringDefinition implements \DeliciousBrains\WPMDB\Container\DI\Definition\Definition, \DeliciousBrains\WPMDB\Container\DI\Definition\SelfResolvingDefinition
{
    /**
     * Entry name.
     * @var string
     */
    private $name;
    /**
     * @var string
     */
    private $expression;
    /**
     * @param string $name       Entry name
     * @param string $expression
     */
    public function __construct($name, $expression)
    {
        $this->name = $name;
        $this->expression = $expression;
    }
    /**
     * @return string Entry name
     */
    public function getName()
    {
        return $this->name;
    }
    /**
     * {@inheritdoc}
     */
    public function getScope()
    {
        return \DeliciousBrains\WPMDB\Container\DI\Scope::SINGLETON;
    }
    /**
     * @return string
     */
    public function getExpression()
    {
        return $this->expression;
    }
    public function resolve(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        $expression = $this->expression;
        $result = \preg_replace_callback('#\\{([^\\{\\}]+)\\}#', function (array $matches) use($container) {
            try {
                return $container->get($matches[1]);
            } catch (\DeliciousBrains\WPMDB\Container\Interop\Container\Exception\NotFoundException $e) {
                throw new \DeliciousBrains\WPMDB\Container\DI\DependencyException(\sprintf("Error while parsing string expression for entry '%s': %s", $this->getName(), $e->getMessage()), 0, $e);
            }
        }, $expression);
        if ($result === null) {
            throw new \RuntimeException(\sprintf('An unknown error occurred while parsing the string definition: \'%s\'', $expression));
        }
        return $result;
    }
    public function isResolvable(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        return \true;
    }
    public function __toString()
    {
        return $this->expression;
    }
}
