<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

use DeliciousBrains\WPMDB\Container\DI\Scope;
/**
 * Defines injections on an existing class instance.
 *
 * @since  5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class InstanceDefinition implements \DeliciousBrains\WPMDB\Container\DI\Definition\Definition
{
    /**
     * Instance on which to inject dependencies.
     *
     * @var object
     */
    private $instance;
    /**
     * @var ObjectDefinition
     */
    private $objectDefinition;
    /**
     * @param object          $instance
     * @param ObjectDefinition $objectDefinition
     */
    public function __construct($instance, \DeliciousBrains\WPMDB\Container\DI\Definition\ObjectDefinition $objectDefinition)
    {
        $this->instance = $instance;
        $this->objectDefinition = $objectDefinition;
    }
    /**
     * {@inheritdoc}
     */
    public function getName()
    {
        // Name are superfluous for instance definitions
        return '';
    }
    /**
     * {@inheritdoc}
     */
    public function getScope()
    {
        return \DeliciousBrains\WPMDB\Container\DI\Scope::PROTOTYPE;
    }
    /**
     * @return object
     */
    public function getInstance()
    {
        return $this->instance;
    }
    /**
     * @return ObjectDefinition
     */
    public function getObjectDefinition()
    {
        return $this->objectDefinition;
    }
}
