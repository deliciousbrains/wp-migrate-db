<?php

namespace DeliciousBrains\WPMDB\League\Container\ServiceProvider;

use DeliciousBrains\WPMDB\League\Container\ContainerAwareInterface;
interface ServiceProviderAggregateInterface extends \DeliciousBrains\WPMDB\League\Container\ContainerAwareInterface
{
    /**
     * Add a service provider to the aggregate.
     *
     * @param  string|\League\Container\ServiceProvider\ServiceProviderInterface $provider
     * @return $this
     */
    public function add($provider);
    /**
     * Determines whether a service is provided by the aggregate.
     *
     * @param  string $service
     * @return boolean
     */
    public function provides($service);
    /**
     * Invokes the register method of a provider that provides a specific service.
     *
     * @param  string $service
     * @return void
     */
    public function register($service);
}
