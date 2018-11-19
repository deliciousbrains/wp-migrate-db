<?php

namespace DeliciousBrains\WPMDB\League\Container;

interface ContainerAwareInterface
{
    /**
     * Set a container
     *
     * @param \League\Container\ContainerInterface $container
     */
    public function setContainer(\DeliciousBrains\WPMDB\League\Container\ContainerInterface $container);
    /**
     * Get the container
     *
     * @return \League\Container\ContainerInterface
     */
    public function getContainer();
}
