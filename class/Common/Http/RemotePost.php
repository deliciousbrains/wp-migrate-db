<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Util\Util;

class RemotePost extends Http
{

    const RESPONSE_RETRY_HTTPS = 'RESPONSE_RETRY_HTTPS';
    const RESPONSE_BLOCKED_EXTERNAL = 'RESPONSE_BLOCKED_EXTERNAL';
    const RESPONSE_UNEXPECTED_ERROR = 'RESPONSE_UNEXPECTED_ERROR';
    const RESPONSE_TIMED_OUT = 'RESPONSE_TIMED_OUT';
    const RESPONSE_NO_RESOLVE_HOST = 'RESPONSE_NO_RESOLVE_HOST';
    const RESPONSE_443_ERROR = 'RESPONSE_443_ERROR';
    const RESPONSE_SSL_ERROR = 'RESPONSE_SSL_ERROR';
    const RESPONSE_401_ERROR = 'RESPONSE_401_ERROR';
    const RESPONSE_500_ERROR = 'RESPONSE_500_ERROR';
    const RESPONSE_STATUS_ERROR = 'RESPONSE_STATUS_ERROR';
    const RESPONSE_MDB_INACTIVE = 'RESPONSE_MDB_INACTIVE';
    const RESPONSE_EMPTY_RESPONSE = 'RESPONSE_EMPTY_RESPONSE';
    const RESPONSE_REMOTE_ERROR = 'RESPONSE_REMOTE_ERROR';
    const RESPONSE_VERSION_MISMATCH = 'RESPONSE_VERSION_MISMATCH';

    /**
     * @var Properties
     */
    public $properties;
    /**
     * @var MigrationStateManager
     */
    public $migration_state_manager;
    /**
     * @var Settings
     */
    public $settings;
    /**
     * @var $error
     */
    public $error;
    /**
     * @var ErrorLog
     */
    private $error_log;
    /**
     * @var Scramble
     */
    private $scrambler;
    /**
     * @var
     */
    private $state_data;

    private $remote_error = false;

    public function __construct(
        Util $util,
        Filesystem $filesystem,
        MigrationStateManager $migration_state_manager,
        Settings $settings,
        ErrorLog $error_log,
        Scramble $scrambler,
        Properties $properties
    ) {
        parent::__construct($util, $filesystem, $scrambler, $properties, $error_log);

        $this->util                    = $util;
        $this->filesystem              = $filesystem;
        $this->migration_state_manager = $migration_state_manager;
        $this->settings                = $settings->get_settings();
        $this->error_log               = $error_log;
        $this->scrambler               = $scrambler;
    }

    /**
     * Post data to a remote site with WP Migrate DB Pro and check the response.
     *
     * @param string $url              The URL to post to.
     * @param array  $data             The associative array of data to be posted to the remote.
     * @param string $scope            A string to be used in error messages defining the function that initiated the remote post.
     * @param array  $args             An optional array of args to alter the timeout, blocking and sslverify options.
     * @param bool   $expecting_serial Verify that the response is a serialized string (defaults to false).
     *
     * @return bool|string
     */
    public function post($url, $data, $scope, $args = [], $expecting_serial = false)
    {
        $this->util->set_time_limit();
        $state_data       = Persistence::getStateData();
        $this->state_data = $state_data;

        if (function_exists('fsockopen') && 0 === strpos($url, 'https://') && 'ajax_verify_connection_to_remote_site' === $scope) {
            $url_parts = Util::parse_url($url);
            $host      = $url_parts['host'];
            if ($pf = @fsockopen($host, 443, $err, $err_string, 1)) {
                // worked
                fclose($pf);
            } else {
                // failed
                $url = substr_replace($url, 'http', 0, 5);
            }
        }

        $sslverify = (1 === $this->settings['verify_ssl'] ? true : false);

        $default_remote_post_timeout = apply_filters('wpmdb_default_remote_post_timeout', 60 * 20);

        $args = wp_parse_args(
            $args,
            [
                'timeout'   => $default_remote_post_timeout,
                'blocking'  => true,
                'sslverify' => $sslverify,
            ]
        );

        $args['method'] = 'POST';
        $remote_cookie = Persistence::getRemoteWPECookie();
        if (false !== $remote_cookie) {
            $cookies         = [];
            $cookie_args     = [
                'name' => 'wpe-auth',
                'value' => $remote_cookie,
            ];
            $cookie          = new \WP_Http_Cookie($cookie_args);
            $cookies[]       = $cookie;
            $args['cookies'] = $cookies;
        }
        if (!isset($args['body'])) {
            $args['body'] = $this->array_to_multipart($data);
        }

        $args['headers']['Content-Type'] = 'multipart/form-data; boundary=' . $this->props->multipart_boundary;
        $args['headers']['Referer']      = $this->util->referer_from_url($url);

        $this->dynamic_props->attempting_to_connect_to = $url;
        do_action('wpmdb_before_remote_post');

        $response = wp_remote_post($url, $args);

        if (!is_wp_error($response)) {
            // Every response should be scrambled, but other processes may have been applied too so we use a filter.
            add_filter('wpmdb_after_response', array($this->scrambler, 'unscramble'));
            $response['body'] = apply_filters('wpmdb_after_response', trim($response['body'], "\xef\xbb\xbf"));
            remove_filter('wpmdb_after_response', array($this->scrambler, 'unscramble'));
        }

        $response_status = $this->handle_remote_post_responses($response, $url, $scope, $expecting_serial, $state_data);

        if (true !== $response_status) {
            return $this->handle_response_code($response_status, $response, $url, $data, $scope, $args, $expecting_serial);
        }

        return trim($response['body']);
    }


    public function handle_remote_post_responses($response, $url, $scope, $expecting_serial, $state_data = array())
    {
        if (is_wp_error($response)) {
            return $this->handle_remote_post_error($response, $scope, $url);
        }

        if (
            200 > (int)$response['response']['code']
            || 399 < (int)$response['response']['code']
        ) {
            return $this->handle_http_error_codes($response, $url, $scope);
        }

        if (empty($response['body'])) {
            return $this->handle_empty_response_body($response, $url, $scope);
        }

        $decoded_body = false;
        if (is_serialized($response['body'])) {
            $decoded_body = Util::unserialize($response['body']);
        } elseif (Util::is_json($response['body'])) {
            $decoded_body = json_decode($response['body'], true);
        } else {
            $decoded_body =
                [
                    'success' => 1,
                    'body'    => $response['body'],
                ];
        }

        if (!$decoded_body) {
            return self::RESPONSE_REMOTE_ERROR;
        }

        //Handle connecting to an older version of the plugin
        if (isset($decoded_body['error_id'], $decoded_body['message'])) {
            if ($decoded_body['error_id'] === 'version_mismatch') {
                $this->remote_error = str_replace('%%plugins_url%%', network_admin_url('plugins.php'), $decoded_body['message']);

                return self::RESPONSE_VERSION_MISMATCH;
            }

            $this->remote_error = $decoded_body['message'];

            return self::RESPONSE_REMOTE_ERROR;
        }

        // Pull migrations return straight up SQL
        // ajax_verify_connection_to_remote_site returns array of all the remote's data
        if (
            !isset($decoded_body['success']) || !$decoded_body['success']
        ) {
            if ($scope === 'ajax_verify_connection_to_remote_site') {
                if (!isset($decoded_body['tables'])) { // Successful response returns a bunch of data, including a 'tables' key
                    $this->remote_error = $decoded_body['data'];

                    return self::RESPONSE_REMOTE_ERROR;
                }
            } else { // Pull migrations return straight up SQL

                $this->remote_error = $decoded_body['data'];

                return self::RESPONSE_REMOTE_ERROR;
            }
        }

        //                if ($expecting_serial && false === is_serialized($response['body'])) {
        //                    if (0 === strpos($url, 'https://') && 'ajax_verify_connection_to_remote_site' == $scope) {
        //                        return true;
        //                    }
        //                    $this->error_log->setError(__('There was a problem with the AJAX request, we were expecting a serialized response, instead we received:<br />', 'wp-migrate-db') . esc_html($response['body']));
        //                    $this->error_log->log_error($this->error_log->getError(), $response);
        //
        //                    return false;
        //
        //                } elseif ($expecting_serial && ('ajax_verify_connection_to_remote_site' == $scope || 'ajax_copy_licence_to_remote_site' == $scope)) {
        //
        //                    $unserialized_response = Util::unserialize($response['body'], __METHOD__);
        //
        //                    if (false !== $unserialized_response && isset($unserialized_response['error']) && '1' == $unserialized_response['error'] && 0 === strpos($url, 'https://')) {
        //
        //                        if (stristr($unserialized_response['message'], 'Invalid content verification signature')) {
        //
        //                            //Check if remote address returned is the same as what was requested. Apache sometimes returns a random HTTPS site.
        //                            if (false === strpos($unserialized_response['message'], sprintf('Remote URL: %s', $state_data['url']))) {
        //                                return true;
        //                            }
        //                        }
        //                    }
        //                }

        return true;
    }

    public function handle_response_code($code, $response, $url, $data, $scope, $args, $expecting_serial)
    {
        if (is_wp_error($response) && 'RESPONSE_RETRY_HTTPS' !== $code) {
            return $response;
        }

        if (!is_wp_error($response)) {
            $response_code = $response['response']['code'];
            $message       = $response['response']['message'];
        }

        switch ($code) {
            case self::RESPONSE_RETRY_HTTPS:
                return new \WP_Error(
                    'wpmdb-remote-post-retry-https',
                    'Error connecting over HTTPS #197'
                );
            case self::RESPONSE_BLOCKED_EXTERNAL:
                $url_parts = Util::parse_url($url);
                $host      = $url_parts['host'];

                return new \WP_Error(
                    'wpmdb-remote-post-http-blocked-external',
                    sprintf(
                        __('We\'ve detected that <code>WP_HTTP_BLOCK_EXTERNAL</code> is enabled and the host <strong>%1$s</strong> has not been added to <code>WP_ACCESSIBLE_HOSTS</code>. Please disable <code>WP_HTTP_BLOCK_EXTERNAL</code> or add <strong>%1$s</strong> to <code>WP_ACCESSIBLE_HOSTS</code> to continue. <a href="%2$s" target="_blank">More information</a>. (#147 - scope: %3$s)', 'wp-migrate-db'),
                        esc_attr($host),
                        'https://deliciousbrains.com/wp-migrate-db-pro/doc/wp_http_block_external/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin',
                        $scope
                    )
                );

                break;
            case self::RESPONSE_UNEXPECTED_ERROR:
                return new \WP_Error(
                    'wpmdb-remote-post-unexpected_error',
                    sprintf(__('The connection failed, an unexpected error occurred, please contact support. (#121 - scope: %s)', 'wp-migrate-db'), $scope)
                );
            case self::RESPONSE_TIMED_OUT:
                return new \WP_Error(
                    self::RESPONSE_TIMED_OUT,
                    sprintf(__('The connection to the remote server has timed out, no changes have been committed. (#134 - scope: %s)', 'wp-migrate-db'), $scope)
                );
                break;
            case self::RESPONSE_NO_RESOLVE_HOST:
                return $this->handle_unresolvable_host($url);
            case self::RESPONSE_443_ERROR:
                return new \WP_Error(
                    self::RESPONSE_443_ERROR,
                    sprintf(__('Couldn\'t connect over HTTPS. You might want to try regular HTTP instead. (#121 - scope: %s)', 'wp-migrate-db'), $scope)
                );
            case self::RESPONSE_SSL_ERROR:
                return new \WP_Error(
                    self::RESPONSE_SSL_ERROR,
                    sprintf(
                        __('<strong>HTTPS Connection Error:</strong>  (#121 - scope: %s) This typically means that the version of OpenSSL that your local site is using to connect to the remote is incompatible or, more likely, being rejected by the remote server because it\'s insecure. <a href="%s" target="_blank">See our documentation</a> for possible solutions.', 'wp-migrate-db'),
                        $scope,
                        'https://deliciousbrains.com/wp-migrate-db-pro/doc/ssl-errors/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin'
                    )
                );
            case self::RESPONSE_401_ERROR:
                return new \WP_Error(
                    self::RESPONSE_401_ERROR,
                    __('The remote site is protected with Basic Authentication. Please enter the username and password above to continue. (401 Unauthorized)', 'wp-migrate-db')
                );
            case self::RESPONSE_500_ERROR:
                return new \WP_Error(
                    self::RESPONSE_500_ERROR,
                    sprintf(__('Unable to connect to the remote server, the remote server responded with: %s %s (scope: %s)', 'wp-migrate-db'), $response_code, $message, $scope)
                );
            case self::RESPONSE_STATUS_ERROR:
                return new \WP_Error(
                    self::RESPONSE_STATUS_ERROR,
                    sprintf(__('Unable to connect to the remote server, please check the connection details - %1$s %2$s (#129 - scope: %3$s)', 'wp-migrate-db'), $response_code, $message, $scope)
                );
            case self::RESPONSE_MDB_INACTIVE:
                return new \WP_Error(
                    self::RESPONSE_MDB_INACTIVE,
                    sprintf(__('WP Migrate does not seem to be installed or active on the remote site. (#131 - scope: %s)', 'wp-migrate-db'), $scope)
                );
            case self::RESPONSE_EMPTY_RESPONSE:
                return new \WP_Error(
                    self::RESPONSE_EMPTY_RESPONSE,
                    sprintf(__('A response was expected from the remote, instead we got nothing. (#146 - scope: %1$s) Please review %2$s for possible solutions.', 'wp-migrate-db'), $scope, sprintf('<a href="%s" target="_blank">%s</a>', 'https://deliciousbrains.com/wp-migrate-db-pro/doc/a-response-was-expected-from-the-remote/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin', __('our documentation', 'wp-migrate-db')))
                );
            case self::RESPONSE_REMOTE_ERROR:
                return new \WP_Error(
                    self::RESPONSE_REMOTE_ERROR,
                    $this->remote_error
                );
            case self::RESPONSE_VERSION_MISMATCH:
                return new \WP_Error(
                    self::RESPONSE_VERSION_MISMATCH,
                    $this->remote_error
                );
            default:
                ;
        }

        return false;
    }

    public function maybe_retry($url, $scope)
    {
        return 0 === strpos($url, 'https://') && 'ajax_verify_connection_to_remote_site' === $scope;
    }

    /**
     * Handle HTTP errors from wp_remote_post()
     *
     * @param $response
     * @param $scope
     * @param $url
     *
     * @return bool|string
     */
    public function handle_remote_post_error($response, $scope, $url)
    {
        if (!is_wp_error($response)) {
            return false;
        }

        if ($this->maybe_retry($url, $scope)) {
            return self::RESPONSE_RETRY_HTTPS;
        }

        if ($this->handle_block_external($url)) {
            return self::RESPONSE_BLOCKED_EXTERNAL;
        }

        if (!isset($response->errors['http_request_failed'][0])) {
            return self::RESPONSE_UNEXPECTED_ERROR;
        }

        $resp = $response->errors['http_request_failed'][0];

        switch ($resp) {
            case strstr($resp, 'timed out'):
                return self::RESPONSE_TIMED_OUT;
            case strstr($resp, 'Could not resolve host'):
            case strstr($resp, 'Couldn\'t resolve host'):
            case strstr($resp, 'couldn\'t connect to host'):
                return self::RESPONSE_NO_RESOLVE_HOST;
            case strstr($resp, 'port 443: Connection refused'):
                return self::RESPONSE_443_ERROR;
            case strstr($resp, 'SSL'):
                return self::RESPONSE_SSL_ERROR;
        }

        return false;
    }

    protected function handle_http_error_codes($response, $url, $scope)
    {
        switch ((int)$response['response']['code']) {
            case 401:
                return self::RESPONSE_401_ERROR;
            //Explicitly do no retry http URL if remote returns 500 error
            case 500:
                return self::RESPONSE_500_ERROR;
            case 0 === strpos($url, 'https://') && 'ajax_verify_connection_to_remote_site' === $scope:
                return self::RESPONSE_RETRY_HTTPS;
        }

        return self::RESPONSE_STATUS_ERROR;
    }

    protected function handle_empty_response_body($response, $url, $scope)
    {
        if ('ajax_verify_connection_to_remote_site' === $scope && '0' === $response['body']) {
            if (0 === strpos($url, 'https://')) {
                return self::RESPONSE_RETRY_HTTPS;
            }

            return self::RESPONSE_MDB_INACTIVE;
        }

        return self::RESPONSE_EMPTY_RESPONSE;
    }

    /**
     * Verify a remote response is valid
     *
     * @param mixed $response Response
     *
     * @return mixed Response if valid, error otherwise
     */
    public function verify_remote_post_response($response)
    {
        if (false === $response) {
            $return    = array('wpmdb_error' => 1, 'body' => $this->error_log->getError());
            $error_msg = 'Failed attempting to verify remote post response (#114mf)';
            $this->error_log->log_error($error_msg, $this->error_log->getError());
            $result = $this->end_ajax(json_encode($return));

            return $result;
        }

        if (Util::is_json($response)) {
            return json_decode($response, true);
        }

        if (is_wp_error($response)) {
            return $this->end_ajax($response);
        }

        if (!is_serialized(trim($response))) {
            $return    = array('wpmdb_error' => 1, 'body' => $response);
            $error_msg = 'Failed as the response is not serialized string (#115mf)';
            $this->error_log->log_error($error_msg, $response);
            $result = $this->end_ajax(json_encode($return));

            return $result;
        }

        $response = unserialize(trim($response));

        if (isset($response['wpmdb_error'])) {
            $this->error_log->log_error($response['wpmdb_error'], $response);
            $result = $this->end_ajax(json_encode($response));

            return $result;
        }

        return $response;
    }

    protected function handle_block_external($url)
    {
        if (\defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL) {
            $url_parts = Util::parse_url($url);
            $host      = $url_parts['host'];
            if (!\defined('WP_ACCESSIBLE_HOSTS') || (\defined('WP_ACCESSIBLE_HOSTS') && !\in_array($host, explode(',', WP_ACCESSIBLE_HOSTS)))) {
                return true;
            }
        }

        return null;
    }

    /**
     * @param $url
     *
     * @return \WP_Error
     */
    protected function handle_unresolvable_host($url)
    {
        $error = sprintf(__('We could not find: %s. Are you sure this is the correct URL?', 'wp-migrate-db'), $url);

        $url_bits = Util::parse_url($url);

        if (strstr($url, 'dev.') || strstr($url, '.dev') || !strstr($url_bits['host'], '.')) {
            $error .= '<br>';
            if ('pull' === $this->state_data['intent']) {
                $error .= __('It appears that you might be trying to pull from a local environment. This will not work if <u>this</u> website happens to be located on a remote server, it would be impossible for this server to contact your local environment.', 'wp-migrate-db');
            } else {
                $error .= __('It appears that you might be trying to push to a local environment. This will not work if <u>this</u> website happens to be located on a remote server, it would be impossible for this server to contact your local environment.', 'wp-migrate-db');
            }
        }

        return new \WP_Error(
            'wpmdb-remote-post-could-not-resolve-host',
            $error
        );
    }
}
