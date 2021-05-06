<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Helper;

use DeliciousBrains\WPMDB\Container\DI\Definition\ValueDefinition;
/**
 * Helps defining a value.
 *
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class ValueDefinitionHelper implements \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper
{
    /**
     * @var mixed
     */
    private $value;
    /**
     * @param mixed $value
     */
    public function __construct($value)
    {
        $this->value = $value;
    }
    /**
     * @param string $entryName Container entry name
     * @return ValueDefinition
     */
    public function getDefinition($entryName)
    {
        return new \DeliciousBrains\WPMDB\Container\DI\Definition\ValueDefinition($entryName, $this->value);
    }
}
