<?php

namespace DeliciousBrains\WPMDB\Container\Dotenv\Repository\Adapter;

interface AvailabilityInterface
{
    /**
     * Determines if the adapter is supported.
     *
     * @return bool
     */
    public function isSupported();
}
