<?php

namespace DeliciousBrains\WPMDB\Container\DI;

use DeliciousBrains\WPMDB\Container\Interop\Container\Exception\NotFoundException as BaseNotFoundException;
/**
 * Exception thrown when a class or a value is not found in the container.
 */
class NotFoundException extends \Exception implements BaseNotFoundException
{
}
