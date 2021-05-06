<?php

/**
 * @license http://www.opensource.org/licenses/mit-license.php MIT (see the LICENSE file)
 */
namespace DeliciousBrains\WPMDB\Container\Interop\Container\Exception;

use DeliciousBrains\WPMDB\Container\Psr\Container\NotFoundExceptionInterface as PsrNotFoundException;
/**
 * No entry was found in the container.
 */
interface NotFoundException extends \DeliciousBrains\WPMDB\Container\Interop\Container\Exception\ContainerException, \DeliciousBrains\WPMDB\Container\Psr\Container\NotFoundExceptionInterface
{
}
