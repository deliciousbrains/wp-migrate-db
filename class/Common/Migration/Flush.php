<?php


namespace DeliciousBrains\WPMDB\Common\Migration;


use DeliciousBrains\WPMDB\Common\Error\HandleRemotePostError;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Flush
{

    /**
     * @var Helper
     */
    private $http_helper;
    /**
     * @var Util
     */
    private $util;
    /**
     * @var RemotePost
     */
    private $remote_post;
    /**
     * @var Http
     */
    private $http;

    public function __construct(
        Helper $helper,
        Util $util,
        RemotePost $remote_post,
        Http $http
    ) {
        $this->http_helper     = $helper;
        $this->util            = $util;
        $this->remote_post     = $remote_post;
        $this->http            = $http;
    }

    public function register()
    {
        add_action('wp_ajax_nopriv_wpmdb_flush', array($this, 'ajax_nopriv_flush',));
        add_action('wp_ajax_wpmdb_flush', array($this, 'ajax_flush'));
    }

    /**
     * Handles the request to flush caches and cleanup migration when pushing or not migrating user tables.
     *
     * @return bool|null
     */
    function ajax_flush()
    {
        $this->http->check_ajax_referer('flush');

        return $this->ajax_nopriv_flush();
    }

    /**
     * Handles the request to flush caches and cleanup migration when pulling with user tables being migrated.
     *
     * @return bool|null
     */
    function ajax_nopriv_flush()
    {
        $state_data = Persistence::getStateData();

        if ('push' === $state_data['intent']) {
            $data           = array();
            $data['action'] = 'wpmdb_remote_flush';
            $data['sig']    = $this->http_helper->create_signature($data, $state_data['key']);
            $ajax_url       = $this->util->ajax_url();
            $response       = $this->remote_post->post($ajax_url, $data, __FUNCTION__);
            $return         = HandleRemotePostError::handle('wpmdb-remote-flush-failed', $response);
        } else {
            $return = $this->flush();
        }

        Persistence::cleanupStateOptions();

        $result = $this->http->end_ajax($return);

        return $result;
    }

    /**
     * Flushes the cache and rewrite rules.
     *
     * @return bool
     */
    function flush()
    {
        // flush rewrite rules to prevent 404s and other oddities
        wp_cache_flush();
        global $wp_rewrite;
        $endpoints = $wp_rewrite->endpoints;
        $wp_rewrite->init();
        $wp_rewrite->endpoints = $endpoints;
        flush_rewrite_rules(true); // true = hard refresh, recreates the .htaccess file
        
        return true;
    }
}
