<?php

namespace DeliciousBrains\WPMDB\Container\DI\Definition;

use DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper;
use DeliciousBrains\WPMDB\Container\DI\Scope;
/**
 * Definition of an array containing values or references.
 *
 * @since 5.0
 * @author Matthieu Napoli <matthieu@mnapoli.fr>
 */
class ArrayDefinition implements \DeliciousBrains\WPMDB\Container\DI\Definition\Definition
{
    /**
     * Entry name.
     * @var string
     */
    private $name;
    /**
     * @var array
     */
    private $values;
    /**
     * @param string $name   Entry name
     * @param array  $values
     */
    public function __construct($name, array $values)
    {
        $this->name = $name;
        $this->values = $values;
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
     * @return array
     */
    public function getValues()
    {
        return $this->values;
    }
    public function __toString()
    {
        $str = '[' . \PHP_EOL;
        foreach ($this->values as $key => $value) {
            if (\is_string($key)) {
                $key = "'" . $key . "'";
            }
            $str .= '    ' . $key . ' => ';
            if ($value instanceof \DeliciousBrains\WPMDB\Container\DI\Definition\Helper\DefinitionHelper) {
                $str .= \str_replace(\PHP_EOL, \PHP_EOL . '    ', $value->getDefinition(''));
            } else {
                $str .= \var_export($value, \true);
            }
            $str .= ',' . \PHP_EOL;
        }
        return $str . ']';
    }
}
