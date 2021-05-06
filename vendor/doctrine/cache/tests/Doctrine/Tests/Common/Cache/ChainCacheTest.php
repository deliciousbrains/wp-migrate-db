<?php

namespace DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache;

use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ApcCache;
use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache;
use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache;
class ChainCacheTest extends \DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache\CacheTest
{
    protected function _getCacheDriver()
    {
        return new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array(new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache()));
    }
    public function testGetStats()
    {
        $cache = $this->_getCacheDriver();
        $stats = $cache->getStats();
        $this->assertInternalType('array', $stats);
    }
    public function testOnlyFetchFirstOne()
    {
        $cache1 = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache();
        $cache2 = $this->getMockForAbstractClass('DeliciousBrains\\WPMDB\\Container\\Doctrine\\Common\\Cache\\CacheProvider');
        $cache2->expects($this->never())->method('doFetch');
        $chainCache = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array($cache1, $cache2));
        $chainCache->save('id', 'bar');
        $this->assertEquals('bar', $chainCache->fetch('id'));
    }
    public function testFetchPropagateToFastestCache()
    {
        $cache1 = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache();
        $cache2 = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache();
        $cache2->save('bar', 'value');
        $chainCache = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array($cache1, $cache2));
        $this->assertFalse($cache1->contains('bar'));
        $result = $chainCache->fetch('bar');
        $this->assertEquals('value', $result);
        $this->assertTrue($cache2->contains('bar'));
    }
    public function testNamespaceIsPropagatedToAllProviders()
    {
        $cache1 = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache();
        $cache2 = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ArrayCache();
        $chainCache = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array($cache1, $cache2));
        $chainCache->setNamespace('bar');
        $this->assertEquals('bar', $cache1->getNamespace());
        $this->assertEquals('bar', $cache2->getNamespace());
    }
    public function testDeleteToAllProviders()
    {
        $cache1 = $this->getMockForAbstractClass('DeliciousBrains\\WPMDB\\Container\\Doctrine\\Common\\Cache\\CacheProvider');
        $cache2 = $this->getMockForAbstractClass('DeliciousBrains\\WPMDB\\Container\\Doctrine\\Common\\Cache\\CacheProvider');
        $cache1->expects($this->once())->method('doDelete');
        $cache2->expects($this->once())->method('doDelete');
        $chainCache = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array($cache1, $cache2));
        $chainCache->delete('bar');
    }
    public function testFlushToAllProviders()
    {
        $cache1 = $this->getMockForAbstractClass('DeliciousBrains\\WPMDB\\Container\\Doctrine\\Common\\Cache\\CacheProvider');
        $cache2 = $this->getMockForAbstractClass('DeliciousBrains\\WPMDB\\Container\\Doctrine\\Common\\Cache\\CacheProvider');
        $cache1->expects($this->once())->method('doFlush');
        $cache2->expects($this->once())->method('doFlush');
        $chainCache = new \DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\ChainCache(array($cache1, $cache2));
        $chainCache->flushAll();
    }
    protected function isSharedStorage()
    {
        return \false;
    }
}
