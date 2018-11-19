<?php

namespace DeliciousBrains\WPMDB\League\Container\Definition;

use DeliciousBrains\WPMDB\League\Container\Argument\ArgumentResolverInterface;
use DeliciousBrains\WPMDB\League\Container\Argument\ArgumentResolverTrait;
use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareTrait;
abstract class AbstractDefinition implements \DeliciousBrains\WPMDB\League\Container\Argument\ArgumentResolverInterface, \DeliciousBrains\WPMDB\League\Container\Definition\DefinitionInterface
{
    use ArgumentResolverTrait;
    use ImmutableContainerAwareTrait;
    /**
     * @var string
     */
    protected $alias;
    /**
     * @var mixed
     */
    protected $concrete;
    /**
     * @var array
     */
    protected $arguments = [];
    /**
     * Constructor.
     *
     * @param string $alias
     * @param mixed  $concrete
     */
    public function __construct($alias, $concrete)
    {
        $this->alias = $alias;
        $this->concrete = $concrete;
    }
    /**
     * {@inheritdoc}
     */
    public function withArgument($arg)
    {
        $this->arguments[] = $arg;
        return $this;
    }
    /**
     * {@inheritdoc}
     */
    public function withArguments(array $args)
    {
        foreach ($args as $arg) {
            $this->withArgument($arg);
        }
        return $this;
    }
}
