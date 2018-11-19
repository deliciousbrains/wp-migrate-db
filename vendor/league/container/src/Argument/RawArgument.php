<?php

namespace DeliciousBrains\WPMDB\League\Container\Argument;

class RawArgument implements \DeliciousBrains\WPMDB\League\Container\Argument\RawArgumentInterface
{
    /**
     * @var mixed
     */
    protected $value;
    /**
     * {@inheritdoc}
     */
    public function __construct($value)
    {
        $this->value = $value;
    }
    /**
     * {@inheritdoc}
     */
    public function getValue()
    {
        return $this->value;
    }
}
