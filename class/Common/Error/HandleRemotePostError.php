<?php


namespace DeliciousBrains\WPMDB\Common\Error;


use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\WPMDBDI;

class HandleRemotePostError
{

    public static function handle($key, $response)
    {
        $http = WPMDBDI::getInstance()->get(Http::class);

        // WP_Error is thrown manually by remote_post() to tell us something went wrong
        if (is_wp_error($response)) {
            {
                return $http->end_ajax(
                    $response
                );
            }
        }

        $decoded_response = json_decode($response, true);

        if (false === $response || !$decoded_response['success']) {
            $http->end_ajax(
                new \WP_Error(
                    $key,
                    $decoded_response['data']
                )
            );
        }

        if (isset($decoded_response['data'])) {
            return $decoded_response['data'];
        }

//        if($decoded_response['success'] === false){
//            return $http->end_ajax(
//
//            )
//        }

        return $response;
    }
}
