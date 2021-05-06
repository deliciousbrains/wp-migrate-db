<?php

namespace DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache;

use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ApcCache;
class ApcCacheTest extends \DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache\CacheTest
{
    public function setUp()
    {
        if (!\extension_loaded('apc') || \false === @\apc_cache_info()) {
            $this->markTestSkipped('The ' . __CLASS__ . ' requires the use of APC');
        }
    }
    protected function _getCacheDriver()
    {
        return new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ApcCache();
    }
}
