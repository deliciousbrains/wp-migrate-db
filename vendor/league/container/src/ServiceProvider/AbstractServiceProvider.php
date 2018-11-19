<?php

namespace DeliciousBrains\WPMDB\League\Container\ServiceProvider;

use DeliciousBrains\WPMDB\League\Container\ContainerAwareTrait;
abstract class AbstractServiceProvider implements \DeliciousBrains\WPMDB\League\Container\ServiceProvider\ServiceProviderInterface
{
    use ContainerAwareTrait;
    /**
     * @var array
     */
    protected $provides = [];
    /**
     * {@inheritdoc}
     */
    public function provides($alias = null)
    {
        if (!\is_null($alias)) {
            return \in_array($alias, $this->provides);
        }
        return $this->provides;
    }
}
