<?php


namespace DeliciousBrains\WPMDB\Common\Transfers\Files;


use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\Http\Scramble;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\MigrationState\StateDataContainer;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Util\ZipAndEncode;
use DeliciousBrains\WPMDB\Common\Queue\Manager;

class PluginHelper
{

    public $filesystem;
    /**
     * @var Http
     */
    protected $http;
    /**
     * @var ErrorLog
     */
    protected $error_log;
    /**
     * @var Helper
     */
    protected $http_helper;
    /**
     * @var RemotePost
     */
    protected $remote_post;
    /**
     * @var Settings
     */
    protected $settings;
    /**
     * @var MigrationStateManager
     */
    protected $migration_state_manager;
    /**
     * @var Scramble
     */
    protected $scramble;
    /**
     * @var FileProcessor
     */
    protected $file_processor;
    /**
     * @var Util
     */
    protected $transfer_util;
    /**
     * @var Manager
     */
    protected $queue_manager;
    /**
     * @var Properties
     */
    protected $properties;
    /**
     * @var Manager
     */
    protected $manager;
    /**
     * @var StateDataContainer
     */
    protected $state_data_container;

    public function __construct(
        Filesystem $filesystem,
        Properties $properties,
        Http $http,
        Helper $http_helper,
        Settings $settings,
        MigrationStateManager $migration_state_manager,
        Scramble $scramble,
        FileProcessor $file_processor,
        Util $transfer_util,
        Manager $queue_manager,
        Manager $manager,
        StateDataContainer $state_data_container
    ) {
        $this->filesystem              = $filesystem;
        $this->http                    = $http;
        $this->http_helper             = $http_helper;
        $this->settings                = $settings->get_settings();
        $this->migration_state_manager = $migration_state_manager;
        $this->scramble                = $scramble;
        $this->file_processor          = $file_processor;
        $this->transfer_util           = $transfer_util;
        $this->properties              = $properties;
        $this->queue_manager           = $queue_manager;
        $this->manager                 = $manager;
        $this->state_data_container    = $state_data_container;
    }


    /**
     * @param $stage
     *
     * @return mixed|null
     */
    public function respond_to_get_remote_folders($stage)
    {
        $key_rules         = array(
            'action'   => 'key',
            'intent'   => 'key',
            'folders'  => 'json',
            'excludes' => 'json',
            'stage'    => 'string',
            'sig'      => 'string',
            'date'     => 'string',
            'timezone' => 'string',
            'is_cli_migration' => 'int',
        );

        $_POST['folders']  = stripslashes($_POST['folders']);
        $_POST['excludes'] = stripslashes($_POST['excludes']);

        $state_data = Persistence::setRemotePostData($key_rules, __METHOD__);

        // Check for CLI migration and skip enabling recursive scanner if necessary.
        if (!isset($state_data['is_cli_migration']) || 0 === (int)$state_data['is_cli_migration']) {
            Util::enable_scandir_bottleneck();
        }

        $filtered_post = $this->http_helper->filter_post_elements(
            $state_data,
            array(
                'action',
                'intent',
                'folders',
                'excludes',
                'stage',
                'is_cli_migration'
            )
        );
        $verification = $this->http_helper->verify_signature($filtered_post, $this->settings['key']);

        if (!$verification) {
            return $this->http->end_ajax(new \WP_Error('wpmdbtpf_invalid_post_data', __('Could not validate $_POST data.') . ' (#100tp)'));
        }

        $abs_path = '';

        if ('plugins' === $stage) {
            $abs_path = WP_PLUGIN_DIR;
        }

        if ('muplugins' === $stage) {
            $abs_path = WPMU_PLUGIN_DIR;
        }

        if ('others' === $stage) {
            $abs_path = WP_CONTENT_DIR;
        }

        if ('themes' === $stage) {
            $abs_path = WP_CONTENT_DIR . DIRECTORY_SEPARATOR . 'themes' . DIRECTORY_SEPARATOR;
        }

        if ('media_files' === $stage) {
            $uploads_path = Util::get_wp_uploads_dir();
            $uploads_name = wp_basename($uploads_path);
            $abs_path     = apply_filters('wpmdb_mf_media_upload_path', WP_CONTENT_DIR . DIRECTORY_SEPARATOR . $uploads_name, $state_data);
        }

        $slashed  = $this->filesystem->slash_one_direction($abs_path);
        $date     = isset($_POST['date']) ? $state_data['date'] : null;
        $timezone = !empty($_POST['timezone']) ? $state_data['timezone'] : 'UTC';

        $folders = json_decode($state_data['folders'], true);

        if ('media_files' === $stage) {
            $folders = apply_filters('wpmdb_mf_remote_uploads_folder', $folders, $state_data);
        }

        $items = $folders;

        if ($stage === 'media_files' && isset($folders[0])) {
            $items = $this->get_top_level_items($folders[0]);
        }

        $files = $this->file_processor->get_local_files($items, $slashed, json_decode($state_data['excludes'], true), $stage, $date, $timezone, 'pull');


        $files = ZipAndEncode::encode(json_encode($files));

        return $this->http->end_ajax($files);
    }

    /**
     *
     * Respond to request to save queue status
     *
     * @return mixed|null
     */
    public function respond_to_save_queue_status()
    {
        $key_rules = array(
            'action'          => 'key',
            'remote_state_id' => 'key',
            'stage'           => 'string',
            'intent'          => 'string',
            'sig'             => 'string',
        );

        $state_data = $this->migration_state_manager->set_post_data($key_rules);

        $filtered_post = $this->http_helper->filter_post_elements(
            $state_data,
            array(
                'action',
                'remote_state_id',
                'intent',
                'stage',
            )
        );

        $settings = $this->settings;

        if (!$this->http_helper->verify_signature($filtered_post, $settings['key'])) {
            return $this->transfer_util->ajax_error($this->properties->invalid_content_verification_error . ' (#100tp)', $filtered_post);
        }

        if (empty($_POST['queue_status'])) {
            return $this->transfer_util->ajax_error(__('Saving queue status to remote failed.'));
        }

        $queue_status = filter_var($_POST['queue_status'], FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $queue_data   = json_decode(gzdecode(base64_decode($queue_status)), true);

        if ($queue_data) {
            try {
                $queue_data = $this->transfer_util->concat_existing_remote_items($queue_data, $state_data['stage'], $state_data['remote_state_id']);
                $this->transfer_util->save_queue_status($queue_data, $state_data['stage'], $state_data['remote_state_id']);
            } catch (\Exception $e) {
                return $this->http->end_ajax(new \WP_Error('wpmdb_failed_save_queue', $e->getMessage()));
            }

            return $this->http->end_ajax(json_encode(true));
        }
    }

    public function get_top_level_items($dir)
    {
        $file_data = $this->filesystem->scandir($dir);

        $items = [];

        if (!$file_data) {
            return false;
        }

        foreach ($file_data as $item) {
            $items[] = $item['absolute_path'];
        }

        return $items;
    }

    public function cleanup_transfer_migration($stage)
    {
        $this->manager->drop_tables();

        $this->remove_tmp_files($stage);
    }

    /**
     *
     * @param $stage
     */
    public function remove_tmp_files($stage, $env = 'local')
    {
        if (in_array($stage, ['themes', 'plugins', 'muplugins', 'others', 'core'])) {
            $this->transfer_util->remove_tmp_folder('themes');
            $this->transfer_util->remove_tmp_folder('plugins');
            $this->transfer_util->remove_tmp_folder('muplugins');
            $this->transfer_util->remove_tmp_folder('others');
            $this->transfer_util->remove_tmp_folder('core');
        }

        if ($stage === 'media_files') {
            $this->transfer_util->remove_tmp_folder($stage);
        }

        $id = null;

        if ($env === 'local') {
            $state_data = Persistence::getStateData();
            $id         = isset($state_data['migration_state_id']) ? $state_data['migration_state_id'] : null;
        } else {
            $state_data = Persistence::getRemoteStateData();
            $id         = isset($state_data['remote_state_id']) ? $state_data['remote_state_id'] : null;
        }

        if ($id) {
            $this->remove_chunk_data($id, $env);
            $this->remove_folder_options($id);
        }

        return;
    }

    public function remove_folder_options($id)
    {
        delete_site_option('wpmdb_folder_transfers_media_files_' . $id);
        delete_site_option('wpmdb_folder_transfers_themes_' . $id);
        delete_site_option('wpmdb_folder_transfers_plugins_' . $id);
        delete_site_option('wpmdb_folder_transfers_muplugins_' . $id);
        delete_site_option('wpmdb_folder_transfers_others_' . $id);
    }

    public function remove_chunk_data($id, $env)
    {
        if (!$id || $env !== 'local') {
            return;
        }

        $chunk_file = Chunker::get_chunk_path($id);
        if ($this->filesystem->file_exists($chunk_file)) {
            $this->filesystem->unlink($chunk_file);
        }

        $chunk_option_name = 'wpmdb_file_chunk_' . $id;
        delete_site_option($chunk_option_name);
    }

}
