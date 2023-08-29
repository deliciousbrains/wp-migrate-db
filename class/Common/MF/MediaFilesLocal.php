<?php

namespace DeliciousBrains\WPMDB\Common\MF;

use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Queue\Manager;
use DeliciousBrains\WPMDB\Common\Transfers\Files\FileProcessor;
use DeliciousBrains\WPMDB\Common\Transfers\Files\PluginHelper;
use DeliciousBrains\WPMDB\Common\Queue\QueueHelper;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Util as Files_Util;
use DeliciousBrains\WPMDB\Common\Transfers\Files\TransferManager;

class MediaFilesLocal
{

    /**
     * @var Http
     */
    private $http;
    /**
     * @var Util
     */
    private $util;
    /**
     * @var Helper
     */
    private $http_helper;
    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_API_server;
    /**
     * @var TransferManager
     */
    private $transfer_manager;
    /**
     * @var Files_Util
     */
    private $transfer_util;
    /**
     * @var FileProcessor
     */
    private $file_processor;
    /**
     * @var QueueHelper
     */
    private $queue_helper;
    /**
     * @var Manager
     */
    private $queue_manager;
    /**
     * @var PluginHelper
     */
    private $plugin_helper;
    /**
     * @var FormData
     */
    private $form_data;
    /**
     * @var ProfileManager
     */
    private $profile_manager;

    public function __construct(
        FormData $form_data,
        Http $http,
        Util $util,
        Helper $http_helper,
        WPMDBRestAPIServer $rest_API_server,
        TransferManager $transfer_manager,
        Files_Util $transfer_util,
        FileProcessor $file_processor,
        QueueHelper $queue_helper,
        Manager $queue_manager,
        PluginHelper $plugin_helper,
        ProfileManager $profile_manager
    ) {
        $this->http             = $http;
        $this->util             = $util;
        $this->http_helper      = $http_helper;
        $this->rest_API_server  = $rest_API_server;
        $this->transfer_manager = $transfer_manager;
        $this->transfer_util    = $transfer_util;
        $this->file_processor   = $file_processor;
        $this->queue_helper     = $queue_helper;
        $this->queue_manager    = $queue_manager;
        $this->plugin_helper    = $plugin_helper;
        $this->form_data        = $form_data;
        $this->profile_manager  = $profile_manager;
    }

    public function register()
    {
        add_action('wpmdb_migration_complete', array($this, 'mf_migration_complete'));
        add_action('wpmdb_respond_to_push_cancellation', array($this, 'remove_remote_tmp_files'));
        add_action('wpmdb_cancellation', array($this, 'mf_migration_stopped_actions'));
        add_action('wpmdb_finalize_migration', array($this, 'mf_update_profile'));
        add_action(
            'wpmdb_finalize_key_rules',
            function ($key_rules) {
                $key_rules['profileID']   = 'int';
                $key_rules['profileType'] = 'string';

                return $key_rules;
            }
        );

        add_action('rest_api_init', [$this, 'register_rest_routes']);
    }

    public function register_rest_routes()
    {
        $this->rest_API_server->registerRestRoute(
            '/mf-initiate-file-migration',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_initiate_media_file_migration'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/mf-get-queue-items',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_mf_get_queue_items'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/mf-transfer-files',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'ajax_mf_transfer_files'],
            ]
        );
    }

    /**
     *
     * @TODO Break this up into smaller, testable functions
     * @return bool|null
     */
    public function ajax_initiate_media_file_migration()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();
        $this->util->set_time_limit();

        $key_rules = array(
            'action'             => 'key',
            'excludes'           => 'json',
            'migration_state_id' => 'key',
            'folder'             => 'string',
            'stage'              => 'string',
            'date'               => 'string',
            'timezone'           => 'string',
            'is_cli_migration'   => 'int'
        );

        $state_data = Persistence::setPostData($key_rules, __METHOD__);

        $excludes = isset($state_data['excludes']) ? trim($state_data['excludes'], "\" \t\n\r\0\x0B") : [];

        if (!is_array($excludes)) {
            $excludes = preg_split('/\r\n|\r|\n/', stripcslashes($excludes));//stripcslashes() makes the $excludes string double quoted so we can use preg_split()
        }

        $excludes[] = 'wp-migrate-db';
        $excludes   = apply_filters('wpmdb_mf_excludes', $excludes, $state_data);

        //Cleanup partial chunk files.
        $this->transfer_util->cleanup_temp_chunks(WP_CONTENT_DIR . DIRECTORY_SEPARATOR, 'tmpchunk');

        //Bottleneck files scanning
        if (empty($state_data['is_cli_migration'])) {
            Files_Util::enable_scandir_bottleneck();
        }

        //State data populated
        $folder   = $state_data['folder'];
        $date     = isset($state_data['date']) ? $state_data['date'] : null;
        $timezone = !empty($state_data['timezone']) ? $state_data['timezone'] : 'UTC';

        if (empty($folder)) {
            return $this->transfer_util->ajax_error(__('Invalid folder path supplied.', 'wp-migrate-db'));
        }

        if ('pull' === $state_data['intent']) {
            // Set up local meta data
            $folder = apply_filters('wpmdb_mf_remote_uploads_source_folder', $folder, $state_data);
            $file_list = $this->transfer_util->get_remote_files([$folder], 'wpmdbmf_respond_to_get_remote_media', $excludes, $date, $timezone);
        } else {
            // Push = get local files
            $abs_path = Files_Util::get_wp_uploads_dir();
            $abs_path = apply_filters('wpmdb_mf_local_uploads_folder', $abs_path, $state_data);
            $file_list = $this->file_processor->get_local_files([$abs_path], $abs_path, $excludes, $state_data['stage'], $date, $timezone,'push');
        }

        if (is_wp_error($file_list)) {
            return $file_list;
        }

        $queue_status = $this->queue_helper->populate_queue($file_list, $state_data['intent'], $state_data['stage'], $state_data['migration_state_id']);
        set_site_transient('wpmdb_queue_status', $queue_status);

        if (isset($file_list['meta']['scan_completed'])) {
            if (true === $file_list['meta']['scan_completed']) {
                return $this->http->end_ajax(['queue_status' => $queue_status]);
            }
            return $this->http->end_ajax(
                [
                    'recursive_queue'   => true,
                    'items_count'       => $queue_status['total']
                ]);
        }

        return $this->http->end_ajax(['queue_status' => $queue_status]);
    }

    /**
     * Get queue items in batches to populate the UI
     *
     * @return mixed|null
     */
    public function ajax_mf_get_queue_items()
    {
        return $this->queue_helper->get_queue_items();
    }

    /**
     * @return null
     */
    public function ajax_mf_transfer_files()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $this->util->set_time_limit();

        $key_rules = array(
            'action'                        => 'key',
            'stage'                         => 'string',
            'offset'                        => 'numeric',
            'folder'                        => 'string',
            'migration_state_id'            => 'key',
            'payloadSize'                   => 'numeric',
            'stabilizePayloadSize'          => 'bool',
            'stepDownSize'                  => 'bool',
            'nonce'                         => 'key',
            'retries'                       => 'numeric',
            'forceHighPerformanceTransfers' => 'bool',
        );

        $state_data = Persistence::setPostData($key_rules, __METHOD__);

        $count = apply_filters('wpmdbmf_file_batch_size', 1000);
        $data  = $this->queue_manager->list_jobs($count);

        $processed = $this->transfer_util->process_file_data($data);

        if (empty($data)) {
            do_action('wpmdbmf_file_transfer_complete');

            // Clear out queue in case there is a next step
            $this->queue_manager->truncate_queue();

            return $this->http->end_ajax(['status' => 'complete']);
        }

        $remote_url = $state_data['intent'] === 'savefile' ? null : $state_data['url'];
        $processed  = $this->transfer_manager->manage_file_transfer($remote_url, $processed, $state_data);

        $result = [
            'status' => $processed,
        ];

        if (isset($processed['error'], $processed['message']) && true === $processed['error']) {
            $result = new \WP_Error(400, $processed['message']);
        }

        //Client should check error status for files and if a 500 is encountered kill the migration stage
        return $this->http->end_ajax($result);
    }

    public function mf_migration_complete()
    {
        $this->mf_migration_stopped_actions();
    }

    public function mf_migration_stopped_actions()
    {
        $stages = $this->form_data->getMigrationStages();

        if (is_array($stages) && in_array('media_files', $stages, true)) {
            $this->plugin_helper->cleanup_transfer_migration('media_files');
        }
    }

    public function remove_remote_tmp_files()
    {
        $stages = $this->form_data->getMigrationStages();

        if (in_array('media_files', $stages)) {
            $this->plugin_helper->remove_tmp_files('media_files', 'remote');
        }
    }

    public function mf_update_profile($state_data)
    {
        if (!isset($state_data['profileID'], $state_data['profileType'])) {
            return;
        }

        $profileID = $state_data['profileID'];
        $option    = $state_data['profileType'];

        if (empty($option)) {
            return;
        }

        $profile      = $this->profile_manager->get_profile_by_id($option, $profileID);
        $profile_data = json_decode($profile["value"]);

        if (!property_exists($profile_data, 'media_files')) {
            return;
        }

        $datetime = new \DateTime();
        $newdate  = $datetime->format(\DateTime::ATOM);

        $profile_data->media_files->last_migration = $newdate;

        $profile_type   = $option === 'unsaved' ? 'wpmdb_recent_migrations' : 'wpmdb_saved_profiles';
        $saved_profiles = get_site_option($profile_type);

        if (isset($saved_profiles[$profileID])) {
            $saved_profiles[$profileID]["value"] = json_encode($profile_data);
            update_site_option($profile_type, $saved_profiles);
        }
    }

}
