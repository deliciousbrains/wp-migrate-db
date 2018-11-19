<?php

namespace DeliciousBrains\WPMDB\League\Container\ServiceProvider;

interface BootableServiceProviderInterface extends \DeliciousBrains\WPMDB\League\Container\ServiceProvider\ServiceProviderInterface
{
    /**
     * Method will be invoked on registration of a service provider implementing
     * this interface. Provides ability for eager loading of Service Providers.
     *
     * @return void
     */
    public function boot();
}
