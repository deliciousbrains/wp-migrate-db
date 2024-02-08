<?php

namespace DeliciousBrains\WPMDB\Common\Http;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Cli\Cli;

class Http
{

    /**
     * @var Util
     */
    public $util;
    /**
     * @var Properties
     */
    public $props;
    /**
     * @var DynamicProperties
     */
    public $dynamic_props;
    /**
     * @var Filesystem
     */
    public $filesystem;
    /**
     * @var Scramble
     */
    private $scrambler;
    /**
     * @var ErrorLog
     */
    private $error_log;

    public function __construct(
        Util $util,
        Filesystem $filesystem,
        Scramble $scrambler,
        Properties $properties,
        ErrorLog $error_log
    ) {
        $this->props         = $properties;
        $this->util          = $util;
        $this->filesystem    = $filesystem;
        $this->dynamic_props = DynamicProperties::getInstance();
        $this->scrambler     = $scrambler;
        $this->error_log     = $error_log;
    }

    /**
     * Ends the current AJAX request.
     *
     * @param mixed $return    Value to be returned as response.
     * @param mixed $extraInfo Additional info to be logged.
     * @param bool  $raw       If $return should just be echoed out.
     *
     * @return mixed
     * @throws \WP_CLI\ExitException
     */
    public function end_ajax($return = false, $extraInfo = false, $raw = false)
    {
        if (is_wp_error($return)) {
            $error_msg = $return->get_error_message();
            $this->error_log->log_error($error_msg, $extraInfo);

            if ($this->dynamic_props->doing_cli_migration) {
                return \WP_CLI::error(Cli::cleanup_message($error_msg));
            }

            return wp_send_json_error($error_msg);
        }

        // Handle legacy `wpmdb_error` format
        $json = Util::validate_json($return);

        if ($json) {
            if (isset($json['wpmdb_error']) && $json['wpmdb_error'] == '1') {
                if (isset($json['body'])) {
                    return wp_send_json_error($json['body']);
                }
                if (isset($json['msg'])) {
                    return wp_send_json_error($json['msg']);
                }

                return wp_send_json_error(sprintf(__('An error occurred - JSON response: %s', 'wp-migrate-db'), $json));
            }
        }

        $return = apply_filters('wpmdb_before_response', $return);

        if ($this->dynamic_props->doing_cli_migration) {
            // This function should signal the end of the PHP process, but for CLI it carries on so we need to reset our own usage
            // of the wpmdb_before_response filter before another respond_to_* function adds it again.
            remove_filter('wpmdb_before_response', array($this->scrambler, 'scramble'));

            if (!$json && $this->dynamic_props->doing_cli_migration) {
                $return = json_encode($return);
            }

            return false === $return ? null : $return;
        }

        $output = false === $return ? '' : $return;

        if ($raw) {
            echo $output;

            if (defined('DOING_WPMDB_TESTS')) {
                return $output;
            }

            die();
        }

        return wp_send_json_success($output);
    }

    public function check_ajax_referer($action)
    {
        if (defined('DOING_WPMDB_TESTS') || $this->dynamic_props->doing_cli_migration) {
            return;
        }

        $result = Util::check_ajax_referer($action, 'nonce', false);

        if (false === $result) {
            return $this->end_ajax(new \WP_Error('wpmdb_invalid_nonce', sprintf(__('Invalid nonce for: %s', 'wp-migrate-db'), $action)));
        }

        $cap = (is_multisite()) ? 'manage_network_options' : 'export';
        $cap = apply_filters('wpmdb_ajax_cap', $cap);

        if (!current_user_can($cap)) {
            $return = array('wpmdb_error' => 1, 'body' => sprintf(__('Access denied for: %s', 'wp-migrate-db'), $action));
            $this->end_ajax(json_encode($return));
        }
    }

    function array_to_multipart($data)
    {
        if (!$data || !is_array($data)) {
            return $data;
        }

        $result = '';

        foreach ($data as $key => $value) {
            $result .= '--' . $this->props->multipart_boundary . "\r\n" . sprintf('Content-Disposition: form-data; name="%s"', $key);

            if ('chunk' == $key) {
                if ($data['chunk_gzipped']) {
                    $result .= "; filename=\"chunk.txt.gz\"\r\nContent-Type: application/x-gzip";
                } else {
                    $result .= "; filename=\"chunk.txt\"\r\nContent-Type: text/plain;";
                }
            } else {
                $result .= "\r\nContent-Type: text/plain; charset=" . get_option('blog_charset');
            }

            $result .= "\r\n\r\n" . $value . "\r\n";
        }

        $result .= '--' . $this->props->multipart_boundary . "--\r\n";

        return $result;
    }


    /**
     * Check for download
     * if found prepare file for download
     *
     * @return void
     */
    function http_verify_download()
    {
        if (!empty($_GET['download'])) {
            $this->filesystem->download_file();
        }
    }
}
