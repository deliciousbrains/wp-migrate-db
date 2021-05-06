<?php

namespace DeliciousBrains\WPMDB\Common\Settings;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Sanitize;
use DeliciousBrains\WPMDB\Common\Util\Util;

class SettingsManager
{

    /**
     * @var Http
     */
    private $http;
    /**
     * @var \DeliciousBrains\WPMDB\Common\Settings\Settings
     */
    private $settings;
    /**
     * @var MigrationStateManager
     */
    private $state_manager;
    /**
     * @var ErrorLog
     */
    private $error_log;
    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_API_server;
    /**
     * @var Helper
     */
    private $http_helper;
    /**
     * @var Util
     */
    private $util;

    /**
     * SettingsManager constructor.
     *
     * @param Http                  $http
     * @param Settings              $settings
     * @param MigrationStateManager $state_manager
     * @param ErrorLog              $error_log
     * @param Helper                $http_helper
     * @param WPMDBRestAPIServer    $rest_API_server
     * @param Util                  $util
     */
    public function __construct(
        Http $http,
        Settings $settings,
        MigrationStateManager $state_manager,
        ErrorLog $error_log,
        Helper $http_helper,
        WPMDBRestAPIServer $rest_API_server,
        Util $util
    ) {
        $this->http            = $http;
        $this->settings        = $settings->get_settings();
        $this->state_manager   = $state_manager;
        $this->error_log       = $error_log;
        $this->rest_API_server = $rest_API_server;
        $this->http_helper     = $http_helper;
        $this->util            = $util;
    }

    public function register()
    {
        // REST endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);
    }

    public function register_rest_routes()
    {
        $this->rest_API_server->registerRestRoute(
            '/reset-api-key',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_reset_api_key'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/save-setting',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_save_setting'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/update-max-request',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_update_max_request_size'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/update-delay-between-requests',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_update_delay_between_requests'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/whitelist-plugins',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_whitelist_plugins'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/get-log',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_get_log'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/clear-log',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_clear_log'],
            ]
        );
    }

    /**
     * Handler for ajax request to reset the secret key.
     *
     * @return bool|null
     */
    function ajax_reset_api_key()
    {
        $_POST     = $this->http_helper->convert_json_body_to_post();
        $key_rules = array(
            'action' => 'key',
        );

        $_POST = Sanitize::sanitize_data($_POST, $key_rules, __METHOD__);

        if (false === $_POST) {
            exit;
        }

        $this->settings['key'] = $this->util->generate_key();
        update_site_option('wpmdb_settings', $this->settings);
        return $this->http->end_ajax($this->settings['key']);
    }

    /**
     * Handler for ajax request to save a setting, e.g. accept pull/push requests setting.
     *
     * @return bool|null
     */
    public function ajax_save_setting()
    {
        $_POST     = $this->http_helper->convert_json_body_to_post();
        $key_rules = array(
            'checked' => 'bool',
            'setting' => 'key',
        );

        $state_data = $this->state_manager->set_post_data($key_rules);

        $this->settings[$state_data['setting']] = $state_data['checked'];
        update_site_option('wpmdb_settings', $this->settings);
        $result = $this->http->end_ajax('setting saved');

        return $result;
    }

    public function get_diagnostic_log() {
        ob_start();
        $this->error_log->output_diagnostic_info();
        $this->error_log->output_log_file();
        return ob_get_clean();
    }

    /**
     * @return bool|mixed|void|null
     */
    public function ajax_clear_log()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();
        delete_site_option('wpmdb_error_log');

        return $this->http->end_ajax($this->get_diagnostic_log());
    }

    /**
     * @return bool|mixed|void|null
     */
    public function ajax_get_log()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();
        $return = $this->get_diagnostic_log();
        return $this->http->end_ajax($return);
    }

    /**
     * Handler for updating the plugins that are not to be loaded during a request (Compatibility Mode).
     */
    public function ajax_whitelist_plugins()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $key_rules = array(
            'whitelist_plugins' => 'array',
        );

        $state_data = $this->state_manager->set_post_data($key_rules);

        $this->settings['whitelist_plugins'] = (array) $state_data['whitelist_plugins'];
        update_site_option('wpmdb_settings', $this->settings);

        return $this->http->end_ajax('plugins whitelisted');
    }

    /**
     * Updates the Maximum Request Size setting.
     *
     * @return void
     * @throws \DI\DependencyException
     * @throws \DI\NotFoundException
     */
    function ajax_update_max_request_size()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $key_rules = array(
            'max_request_size' => 'numeric',
        );

        $state_data = $this->state_manager->set_post_data($key_rules);

        $this->settings['max_request'] = (int) $state_data['max_request_size'];
        $result                        = update_site_option('wpmdb_settings', $this->settings);
        $this->http->end_ajax($result);
    }

    /**
     * Updates the Delay Between Requests setting.
     *
     * @return void
     * @throws \DI\DependencyException
     * @throws \DI\NotFoundException
     */
    function ajax_update_delay_between_requests()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $key_rules  = array(
            'delay_between_requests' => 'numeric',
        );
        $state_data = $this->state_manager->set_post_data($key_rules);

        $int_val = (int) $state_data['delay_between_requests'];
        $this->settings['delay_between_requests'] = $int_val;
        $result                                   = update_site_option('wpmdb_settings', $this->settings);
        $this->http->end_ajax($result);
    }
}
