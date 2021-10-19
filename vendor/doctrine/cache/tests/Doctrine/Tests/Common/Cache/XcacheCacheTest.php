<?php

namespace DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache;

use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\XcacheCache;
class XcacheCacheTest extends CacheTest
{
    public function setUp()
    {
        if (!\extension_loaded('xcache')) {
            $this->markTestSkipped('The ' . __CLASS__ . ' requires the use of xcache');
        }
    }
    protected function _getCacheDriver()
    {
        return new XcacheCache();
    }
}
