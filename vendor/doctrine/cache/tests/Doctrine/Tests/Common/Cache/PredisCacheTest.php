<?php

namespace DeliciousBrains\WPMDB\Container\Doctrine\Tests\Common\Cache;

use DeliciousBrains\WPMDB\Container\Doctrine\Common\Cache\PredisCache;
use DeliciousBrains\WPMDB\Container\Predis\Client;
use DeliciousBrains\WPMDB\Container\Predis\Connection\ConnectionException;
class PredisCacheTest extends CacheTest
{
    private $client;
    public function setUp()
    {
        $this->client = new Client();
        try {
            $this->client->connect();
        } catch (ConnectionException $e) {
            $this->markTestSkipped('The ' . __CLASS__ . ' requires the use of redis');
        }
    }
    /**
     * @return PredisCache
     */
    protected function _getCacheDriver()
    {
        return new PredisCache($this->client);
    }
}
