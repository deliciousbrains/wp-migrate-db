<?php

namespace DeliciousBrains\WPMDB\League\Container\Exception;

use DeliciousBrains\WPMDB\Interop\Container\Exception\NotFoundException as NotFoundExceptionInterface;
use InvalidArgumentException;
class NotFoundException extends \InvalidArgumentException implements \DeliciousBrains\WPMDB\Interop\Container\Exception\NotFoundException
{
}
