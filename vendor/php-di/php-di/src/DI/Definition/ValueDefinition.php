<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

use DeliciousBrains\WPMDB\Container\DI\Scope;
use DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface;
/**
 * Definition of a value for dependency injection.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class ValueDefinition implements \DeliciousBrains\WPMDB\Container\DI\Definition\Definition, \DeliciousBrains\WPMDB\Container\DI\Definition\SelfResolvingDefinition
{
    /**
     * Entry name.
     * @var string
     */
    private $name;
    /**
     * @var mixed
     */
    private $value;
    /**
     * @param string $name Entry name
     * @param mixed $value
     */
    public function __construct($name, $value)
    {
        $this->name = $name;
        $this->value = $value;
    }
    /**
     * @return string Entry name
     */
    public function getName()
    {
        return $this->name;
    }
    /**
     * A value definition is like a constant, there is nothing to compute, the value is the same for everyone.
     *
     * {@inheritdoc}
     */
    public function getScope()
    {
        return \DeliciousBrains\WPMDB\Container\DI\Scope::SINGLETON;
    }
    /**
     * @return mixed
     */
    public function getValue()
    {
        return $this->value;
    }
    public function resolve(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        return $this->getValue();
    }
    public function isResolvable(\DeliciousBrains\WPMDB\Container\Interop\Container\ContainerInterface $container)
    {
        return \true;
    }
    public function __toString()
    {
        return \sprintf('Value (%s)', \var_export($this->value, \true));
    }
}
