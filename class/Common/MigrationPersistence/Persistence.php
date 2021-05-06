<?php

namespace DeliciousBrains\WPMDB\Common\MigrationPersistence;

use DeliciousBrains\WPMDB\Common\Exceptions\SanitizationFailureException;
use DeliciousBrains\WPMDB\Common\Migration\MigrationHelper;
use DeliciousBrains\WPMDB\Common\Sanitize;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\WPMDBDI;

/**
 * Class Persistance
 *
 * Class to get and set migration state and migration settings during/before/after ajax requests
 *
 * Each AJAX request should update state and store in the DB
 *
 * Supercedes MigrationState
 *
 * @package DeliciousBrains\WPMDB\Common\MigrationPersistance
 */
class Persistence
{

    public $state_data;

    public static function saveStateData($data, $key = 'wpmdb_migration_state')
    {
        return update_site_option($key, $data);
    }

    public static function getFromStateData($key, $state_key = 'wpmdb_migration_state')
    {
        $state_data = self::getStateData($state_key);
        if (!isset($state_data[$key])) {
            return false;
        }

        return $state_data[$key];
    }

    /**
     * Returns the `wpmdb_migration_state` option if it exists, otherwise returns a sanitized $_POST array
     *
     * @param string $key
     *
     * @return mixed
     */
    public static function getStateData($key = 'wpmdb_migration_state')
    {
        $state_data = get_site_option($key);

        if (false === $state_data) {
            $filtered = filter_var_array($_POST, FILTER_SANITIZE_STRING);
            return $filtered;
        }

        return $state_data;
    }

    public static function getRemoteStateData($key = 'wpmdb_remote_migration_state')
    {
        $state_data = get_site_option($key);

        if (false === $state_data) {
            return filter_var_array($_POST, FILTER_SANITIZE_STRING);
        }

        return $state_data;
    }

    public static function saveMigrationOptions($options)
    {
        update_site_option('wpmdb_migration_options', $options);

        return $options;
    }

    public static function getMigrationOptions()
    {
        return get_site_option('wpmdb_migration_options');
    }

    public static function storeRemoteResponse($response)
    {
        return update_site_option('wpmdb_remote_response', $response);
    }

    public static function getPostData($fields)
    {
        $state_data = get_site_option('wpmdb_migration_state');

        if (false === $state_data) {
            $state_data = self::setPostData($fields, __METHOD__);
        }

        return $state_data;
    }

    public static function setPostData(
        $fields,
        $context,
        $key = 'wpmdb_migration_state',
        $post_data = false,
        $sanitize = true,
        $save = true
    ) {
        $http = WPMDBDI::getInstance()->get(Http::class);
        $util = WPMDBDI::getInstance()->get(Util::class);
        $util->set_time_limit();

        $state_data = false;
        $post_data  = !$post_data ? $_POST : $post_data;

        if ($sanitize) {
            $state_data = self::sanitizeFields($fields, $context, $post_data);

            if (is_wp_error($state_data)) {
                return $http->end_ajax($state_data);
            }
        } elseif ($post_data) {
            $state_data = $post_data;
        }

        if (!$state_data) {
            return false;
        }

        if (is_wp_error($state_data)) {
            return $http->end_ajax($state_data);
        }

        $existing_data = get_site_option($key);

        if (!empty($existing_data) && is_array($existing_data)) {
            $state_data = array_merge($existing_data, $state_data);
        }

        //Make sure $state_data['site_details']['remote'] is set
        // @TODO refactor
        if (
            (!isset($state_data['site_details']['remote']) || empty($state_data['site_details']['remote']))
            && isset($state_data['site_details']['local'])
        ) {
            $migration_helper = WPMDBDI::getInstance()->get(MigrationHelper::class);

            $state_data['site_details']['remote'] = $migration_helper->siteDetails()['site_details'];
        }


        if ($save) {
            update_site_option($key, $state_data);
        }

        return $state_data;
    }

    /**
     * @param        $fields
     * @param        $context
     * @param string $key
     * @param bool   $post_data
     * @param bool   $sanitize
     *
     * @return bool|mixed|\WP_Error
     */
    public static function setRemotePostData(
        $fields,
        $context,
        $key = 'wpmdb_remote_migration_state',
        $post_data = false,
        $sanitize = true,
        $save = true
    ) {
        return self::setPostData($fields, $context, $key, $post_data, $sanitize, $save);
    }

    /**
     * Remove options from the site_meta/wp_options table
     *
     * @param string $key
     */
    public static function cleanupStateOptions($key = 'wpmdb_migration_state')
    {
        delete_site_option($key);
        delete_site_option('wpmdb_migration_options');
        delete_site_option('wpmdb_remote_response');
    }

    /**
     * @param $fields
     * @param $context
     * @param $post_data
     *
     * @return mixed
     */
    public static function sanitizeFields($fields, $context, $post_data)
    {
        try {
            $state_data = Sanitize::sanitize_data($post_data, $fields, $context);
        } catch (SanitizationFailureException $exception) {
            return new \WP_Error('sanitization_error', $exception->getMessage());
        }

        return $state_data;
    }

    public static function getStateDataByIntent($intent)
    {
        if ('pull' === $intent) {
            return self::getRemoteStateData();
        }

        return self::getStateData();
    }

}
