<?php

namespace DeliciousBrains\WPMDB\League\Container\Inflector;

use DeliciousBrains\WPMDB\League\Container\ImmutableContainerAwareTrait;
class InflectorAggregate implements \DeliciousBrains\WPMDB\League\Container\Inflector\InflectorAggregateInterface
{
    use ImmutableContainerAwareTrait;
    /**
     * @var array
     */
    protected $inflectors = [];
    /**
     * {@inheritdoc}
     */
    public function add($type, callable $callback = null)
    {
        if (\is_null($callback)) {
            $inflector = new \DeliciousBrains\WPMDB\League\Container\Inflector\Inflector();
            $this->inflectors[$type] = $inflector;
            return $inflector;
        }
        $this->inflectors[$type] = $callback;
    }
    /**
     * {@inheritdoc}
     */
    public function inflect($object)
    {
        foreach ($this->inflectors as $type => $inflector) {
            if (!$object instanceof $type) {
                continue;
            }
            if ($inflector instanceof \DeliciousBrains\WPMDB\League\Container\Inflector\Inflector) {
                $inflector->setContainer($this->getContainer());
                $inflector->inflect($object);
                continue;
            }
            // must be dealing with a callable as the inflector
            \call_user_func_array($inflector, [$object]);
        }
        return $object;
    }
}
