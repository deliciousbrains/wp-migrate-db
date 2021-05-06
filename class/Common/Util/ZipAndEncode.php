<?php

namespace DeliciousBrains\WPMDB\Common\Util;

/**
 * Class ZipAndEncode
 *
 * @package DeliciousBrains\WPMDB\Common\Util
 */
class ZipAndEncode
{

    /**
     * @param $string
     *
     * @return string
     */
    public static function encode($string)
    {
        if (!function_exists('gzencode')) {
            return $string;
        }

        return base64_encode(gzencode($string));
    }

    /**
     * @param $string
     *
     * @return string
     */
    public static function decode($string)
    {
        if (!function_exists('gzdecode')) {
            return $string;
        }

        return gzdecode(base64_decode($string));
    }

}
