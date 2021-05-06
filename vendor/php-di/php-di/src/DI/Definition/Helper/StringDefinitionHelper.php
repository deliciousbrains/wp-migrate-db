<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition\Helper;

use DeliciousBrains\WPMDB\Container\DI\Definition\StringDefinition;
/**
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class StringDefinitionHelper implements \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper
{
    /**
     * @var string
     */
    private $expression;
    public function __construct($expression)
    {
        $this->expression = $expression;
    }
    /**
     * @param string $entryName Container entry name
     *
     * @return StringDefinition
     */
    public function getDefinition($entryName)
    {
        return new \DeliciousBrains\WPMDB\Container\DI\Definition\StringDefinition($entryName, $this->expression);
    }
}
