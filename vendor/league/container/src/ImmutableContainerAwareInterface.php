<?php

namespace DeliciousBrains\WPMDB\League\Container;

use DeliciousBrains\WPMDB\Interop\Container\ContainerInterface as InteropContainerInterface;
interface ImmutableContainerAwareInterface
{
    /**
     * Set a container
     *
     * @param \Interop\Container\ContainerInterface $container
     */
    public function setContainer(\DeliciousBrains\WPMDB\Interop\Container\ContainerInterface $container);
    /**
     * Get the container
     *
     * @return \League\Container\ImmutableContainerInterface
     */
    public function getContainer();
}
