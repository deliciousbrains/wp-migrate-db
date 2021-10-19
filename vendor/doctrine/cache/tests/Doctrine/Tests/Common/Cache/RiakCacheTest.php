<?php

namespace DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache;

use DeliciousBrains\WPMDB\Container\Riak\Bucket;
use DeliciousBrains\WPMDB\Container\Riak\Connection;
use DeliciousBrains\WPMDB\Container\Riak\Exception;
use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\RiakCache;
/**
 * RiakCache test
 *
 * @group Riak
 */
class RiakCacheTest extends CacheTest
{
    /**
     * @var \Riak\Connection
     */
    private $connection;
    /**
     * @var \Riak\Bucket
     */
    private $bucket;
    /**
     * {@inheritdoc}
     */
    public function setUp()
    {
        if (!\extension_loaded('riak')) {
            $this->markTestSkipped('The ' . __CLASS__ . ' requires the use of Riak');
        }
        try {
            $this->connection = new Connection('127.0.0.1', 8087);
            $this->bucket = new Bucket($this->connection, 'test');
        } catch (Exception\RiakException $e) {
            $this->markTestSkipped('The ' . __CLASS__ . ' requires the use of Riak');
        }
    }
    /**
     * {@inheritdoc}
     */
    public function testGetStats()
    {
        $cache = $this->_getCacheDriver();
        $stats = $cache->getStats();
        $this->assertNull($stats);
    }
    /**
     * Retrieve RiakCache instance.
     *
     * @return \Doctrine\Common\Cache\RiakCache
     */
    protected function _getCacheDriver()
    {
        return new RiakCache($this->bucket);
    }
}
