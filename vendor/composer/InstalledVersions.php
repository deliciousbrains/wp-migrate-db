<?php

namespace DeliciousBrains\WPMDB\Container\Composer;

use DeliciousBrains\WPMDB\Container\Composer\Semver\VersionParser;
class InstalledVersions
{
    private static $installed = array('root' => array('pretty_version' => 'dev-develop', 'version' => 'dev-develop', 'aliases' => array(), 'reference' => '5d3732d6eca8b34cec8538be00bd15d9e2c613e2', 'name' => 'deliciousbrains/composer-tmp'), 'versions' => array('container-interop/container-interop' => array('pretty_version' => '1.2.0', 'version' => '1.2.0.0', 'aliases' => array(), 'reference' => '79cbf1341c22ec75643d841642dd5d6acd83bdb8'), 'container-interop/container-interop-implementation' => array('provided' => array(0 => '^1.0')), 'deliciousbrains/composer-tmp' => array('pretty_version' => 'dev-develop', 'version' => 'dev-develop', 'aliases' => array(), 'reference' => '5d3732d6eca8b34cec8538be00bd15d9e2c613e2'), 'doctrine/cache' => array('pretty_version' => 'v1.4.0', 'version' => '1.4.0.0', 'aliases' => array(), 'reference' => '2346085d2b027b233ae1d5de59b07440b9f288c8'), 'mnapoli/php-di' => array('replaced' => array(0 => '*')), 'php-di/invoker' => array('pretty_version' => '1.3.3', 'version' => '1.3.3.0', 'aliases' => array(), 'reference' => '1f4ca63b9abc66109e53b255e465d0ddb5c2e3f7'), 'php-di/php-di' => array('pretty_version' => '5.4.0', 'version' => '5.4.0.0', 'aliases' => array(), 'reference' => 'e348393488fa909e4bc0707ba5c9c44cd602a1cb'), 'php-di/phpdoc-reader' => array('pretty_version' => '2.1.1', 'version' => '2.1.1.0', 'aliases' => array(), 'reference' => '15678f7451c020226807f520efb867ad26fbbfcf'), 'phpoption/phpoption' => array('pretty_version' => '1.7.5', 'version' => '1.7.5.0', 'aliases' => array(), 'reference' => '994ecccd8f3283ecf5ac33254543eb0ac946d525'), 'psr/container' => array('pretty_version' => '1.0.0', 'version' => '1.0.0.0', 'aliases' => array(), 'reference' => 'b7ce3b176482dbbc1245ebf52b181af44c2cf55f'), 'symfony/polyfill-ctype' => array('pretty_version' => 'v1.19.0', 'version' => '1.19.0.0', 'aliases' => array(), 'reference' => 'aed596913b70fae57be53d86faa2e9ef85a2297b'), 'vlucas/phpdotenv' => array('pretty_version' => 'v4.2.0', 'version' => '4.2.0.0', 'aliases' => array(), 'reference' => 'da64796370fc4eb03cc277088f6fede9fde88482')));
    public static function getInstalledPackages()
    {
        return \array_keys(self::$installed['versions']);
    }
    public static function isInstalled($packageName)
    {
        return isset(self::$installed['versions'][$packageName]);
    }
    public static function satisfies(VersionParser $parser, $packageName, $constraint)
    {
        $constraint = $parser->parseConstraints($constraint);
        $provided = $parser->parseConstraints(self::getVersionRanges($packageName));
        return $provided->matches($constraint);
    }
    public static function getVersionRanges($packageName)
    {
        if (!isset(self::$installed['versions'][$packageName])) {
            throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
        }
        $ranges = array();
        if (isset(self::$installed['versions'][$packageName]['pretty_version'])) {
            $ranges[] = self::$installed['versions'][$packageName]['pretty_version'];
        }
        if (\array_key_exists('aliases', self::$installed['versions'][$packageName])) {
            $ranges = \array_merge($ranges, self::$installed['versions'][$packageName]['aliases']);
        }
        if (\array_key_exists('replaced', self::$installed['versions'][$packageName])) {
            $ranges = \array_merge($ranges, self::$installed['versions'][$packageName]['replaced']);
        }
        if (\array_key_exists('provided', self::$installed['versions'][$packageName])) {
            $ranges = \array_merge($ranges, self::$installed['versions'][$packageName]['provided']);
        }
        return \implode(' || ', $ranges);
    }
    public static function getVersion($packageName)
    {
        if (!isset(self::$installed['versions'][$packageName])) {
            throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
        }
        if (!isset(self::$installed['versions'][$packageName]['version'])) {
            return null;
        }
        return self::$installed['versions'][$packageName]['version'];
    }
    public static function getPrettyVersion($packageName)
    {
        if (!isset(self::$installed['versions'][$packageName])) {
            throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
        }
        if (!isset(self::$installed['versions'][$packageName]['pretty_version'])) {
            return null;
        }
        return self::$installed['versions'][$packageName]['pretty_version'];
    }
    public static function getReference($packageName)
    {
        if (!isset(self::$installed['versions'][$packageName])) {
            throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
        }
        if (!isset(self::$installed['versions'][$packageName]['reference'])) {
            return null;
        }
        return self::$installed['versions'][$packageName]['reference'];
    }
    public static function getRootPackage()
    {
        return self::$installed['root'];
    }
    public static function getRawData()
    {
        return self::$installed;
    }
    public static function reload($data)
    {
        self::$installed = $data;
    }
}
