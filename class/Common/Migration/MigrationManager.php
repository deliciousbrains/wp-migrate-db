<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\BackupExport;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Error\HandleRemotePostError;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\FullSite\FullSiteExport;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationState;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Util;

class MigrationManager
{

    public $state_data;
    /**
     * @var FormData
     */
    public $form_data;
    /**
     * @var DynamicProperties
     */
    public $dynamic_props;
    /**
     * @var MigrationStateManager
     */
    protected $migration_state_manager;
    /**
     * @var Table
     */
    protected $table;
    /**
     * @var Http
     */
    protected $http;
    /**
     * @var Properties
     */
    protected $props;
    /**
     * @var TableHelper
     */
    protected $table_helper;
    /**
     * @var Helper
     */
    protected $http_helper;
    /**
     * @var Util
     */
    protected $util;
    /**
     * @var RemotePost
     */
    protected $remote_post;
    /**
     * @var Filesystem
     */
    protected $filesystem;
    protected $fp;
    /**
     * @var ErrorLog
     */
    protected $error_log;
    /**
     * @var MigrationState
     */
    protected $migration_state;
    /**
     * @var BackupExport
     */
    protected $backup_export;
    /**
     * @var Multisite
     */
    protected $multisite;
    /**
     * @var InitiateMigration
     */
    protected $initiate_migration;
    /**
     * @var FinalizeMigration
     */
    protected $finalize_migration;

    /**
     * @var mixed $form_data_arr
     */
    private $form_data_arr;
    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_API_server;
    /**
     * @var array|string
     */
    private $migration_options;
    /**
     * @var MigrationHelper
     */
    private $migration_helper;
    /**
     * @var Flush
     */
    private $flush;
    /**
     * @var FullSiteExport
     */
    private $full_site_export;

    public function __construct(
        MigrationStateManager $migration_state_manager,
        MigrationState $migration_state,
        Table $table,
        Http $http,
        TableHelper $table_helper,
        Helper $http_helper,
        Util $util,
        RemotePost $remote_post,
        FormData $form_data,
        Filesystem $filesystem,
        ErrorLog $error_log,
        BackupExport $backup_export,
        Multisite $multisite,
        InitiateMigration $initiate_migration,
        FinalizeMigration $finalize_migration,
        Properties $properties,
        WPMDBRestAPIServer $rest_API_server,
        MigrationHelper $migration_helper,
        FullSiteExport $full_site_export
    ) {
        $this->migration_state_manager = $migration_state_manager;
        $this->table                   = $table;
        $this->http                    = $http;
        $this->props                   = $properties;
        $this->table_helper            = $table_helper;
        $this->http_helper             = $http_helper;
        $this->util                    = $util;
        $this->remote_post             = $remote_post;
        $this->filesystem              = $filesystem;
        $this->error_log               = $error_log;
        $this->migration_state         = $migration_state;
        $this->backup_export           = $backup_export;
        $this->multisite               = $multisite;
        $this->dynamic_props           = DynamicProperties::getInstance();
        $this->form_data               = $form_data;
        $this->form_data_arr           = $form_data->getFormData();
        $this->initiate_migration      = $initiate_migration;
        $this->finalize_migration      = $finalize_migration;
        $this->rest_API_server         = $rest_API_server;
        $this->migration_helper        = $migration_helper;
        $this->full_site_export        = $full_site_export;
    }

    public function register()
    {
        // REST endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('wp_ajax_wpmdb_migrate_table', array($this, 'ajax_migrate_table'));
    }

    public function register_rest_routes()
    {
        $this->rest_API_server->registerRestRoute('/initiate-migration', [
            'methods'  => 'POST',
            'callback' => [$this->initiate_migration, 'ajax_initiate_migration'],
        ]);

        $this->rest_API_server->registerRestRoute('/finalize-migration', [
            'methods'  => 'POST',
            'callback' => [$this->finalize_migration, 'ajax_finalize_migration'],
        ]);

        $this->rest_API_server->registerRestRoute('/cancel-migration', [
            'methods'  => 'POST',
            'callback' => [$this, 'ajax_cancel_migration'],
        ]);

        $this->rest_API_server->registerRestRoute('/error-migration', [
            'methods'  => 'POST',
            'callback' => [$this, 'error_migration'],
        ]);
    }

    /**
     * Called for each database table to be migrated.
     *
     * @return string
     */
    function ajax_migrate_table()
    {
        $this->http->check_ajax_referer('migrate-table');
        // This *might* be set to a file pointer below
        // @TODO using a global file pointer is extremely error prone and not a great idea
        $fp         = null;

        $key_rules  = array(
            'action'              => 'key',
            'migration_state_id'  => 'key',
            'table'               => 'string',
            'stage'               => 'key',
            'current_row'         => 'numeric',
            'form_data'           => 'json',
            'last_table'          => 'positive_int',
            'primary_keys'        => 'serialized',
            'gzip'                => 'int',
            'nonce'               => 'key',
            'bottleneck'          => 'positive_int',
            'prefix'              => 'string',
            'path_current_site'   => 'string',
            'domain_current_site' => 'text',
            'import_info'         => 'array',
        );

        if (!Util::is_json($_POST['form_data'])) {
            $_POST['form_data'] = stripslashes($_POST['form_data']);
        }

        $state_data = Persistence::setPostData($key_rules, __METHOD__);

        if (is_wp_error($state_data)) {
            return wp_send_json_error($state_data->get_error_message());
        }

        global $wpdb;
        // ***+=== @TODO - revisit usage of parse_migration_form_data
        $this->migration_options = $this->form_data->parse_and_save_migration_form_data($state_data['form_data']);

        if ('import' === $state_data['intent'] && !$this->table->table_exists($state_data['table'])) {
            return $this->http->end_ajax(json_encode(array('current_row' => -1)));
        }

        // checks if we're performing a backup, if so, continue with the backup and exit immediately after
        if ($state_data['stage'] === 'backup' && $state_data['intent'] !== 'savefile') {
            // if performing a push we need to backup the REMOTE machine's DB
            if ($state_data['intent'] === 'push') {
                $return = $this->handle_remote_backup($state_data);
            } else {
                $return = $this->handle_table_backup();
            }

            $decoded = json_decode($return, true);

            return $this->http->end_ajax(maybe_unserialize($return));
        }

        // Pull and push need to be handled differently for obvious reasons,
        // and trigger different code depending on the migration intent (push or pull).
        if (in_array($state_data['intent'], array('push', 'savefile', 'find_replace', 'import'))) {
            $this->dynamic_props->maximum_chunk_size = $this->util->get_bottleneck();

            if (isset($state_data['bottleneck'])) {
                $this->dynamic_props->maximum_chunk_size = (int)$state_data['bottleneck'];
            }
            $is_full_site_export = isset($state_data['full_site_export']) ? $state_data['full_site_export'] : false;
            if ('savefile' === $state_data['intent']) {
                $sql_dump_file_name = $this->filesystem->get_upload_info('path') . DIRECTORY_SEPARATOR;
                $sql_dump_file_name .= $this->table_helper->format_dump_name($state_data['dump_filename']);
                $fp                 = $this->filesystem->open($sql_dump_file_name, 'a', $is_full_site_export);
            }

            if (!empty($state_data['db_version'])) {
                $this->dynamic_props->target_db_version = $state_data['db_version'];
                if ('push' == $state_data['intent']) {
                    // $this->dynamic_props->target_db_version has been set to remote database's version.
                    add_filter('wpmdb_create_table_query', array($this->table_helper, 'mysql_compat_filter'), 10, 5);
                } elseif ('savefile' == $state_data['intent'] && !empty($this->form_data_arr['compatibility_older_mysql'])) {
                    // compatibility_older_mysql is currently a checkbox meaning pre-5.5 compatibility (we play safe and target 5.1),
                    // this may change in the future to be a dropdown or radiobox returning the version to be compatible with.
                    $this->dynamic_props->target_db_version = '5.1';
                    add_filter('wpmdb_create_table_query', array($this->table_helper, 'mysql_compat_filter'), 10, 5);
                }
            }

            if (!empty($state_data['find_replace_pairs'])) {
                $this->dynamic_props->find_replace_pairs = $state_data['find_replace_pairs'];
            }

            ob_start();
            $result = $this->table->process_table($state_data['table'], $fp, $state_data);

            if (\is_resource($fp) && $state_data['intent'] === 'savefile') {
                $this->filesystem->close($fp, $is_full_site_export);
            }

            return $this->http->end_ajax($result);
        } else { // PULLS
            $data = $this->http_helper->filter_post_elements(
                $state_data,
                array(
                    'remote_state_id',
                    'intent',
                    'url',
                    'table',
                    'form_data',
                    'stage',
                    'bottleneck',
                    'current_row',
                    'last_table',
                    'gzip',
                    'primary_keys',
                    'site_url',
                    'find_replace_pairs',
                    'source_prefix',
                    'destination_prefix',
                )
            );

            $data['action']     = 'wpmdb_process_pull_request';
            $data['pull_limit'] = $this->http_helper->get_sensible_pull_limit();
            $data['db_version'] = $wpdb->db_version();

            if (is_multisite()) {
                $data['path_current_site']   = $this->util->get_path_current_site();
                $data['domain_current_site'] = $this->multisite->get_domain_current_site();
            }

            $data['prefix'] = $wpdb->base_prefix;

            if (isset($data['sig'])) {
                unset($data['sig']);
            }

            $sig_data = $data;
            unset($sig_data['find_replace_pairs'], $sig_data['form_data'], $sig_data['source_prefix'], $sig_data['destination_prefix']);
            $data['find_replace_pairs'] = base64_encode(serialize($data['find_replace_pairs']));
            $data['form_data']          = base64_encode($data['form_data']);
            $data['primary_keys']       = base64_encode($data['primary_keys']);
            $data['source_prefix']      = base64_encode($data['source_prefix']);
            $data['destination_prefix'] = base64_encode($data['destination_prefix']);

            $data['sig'] = $this->http_helper->create_signature($sig_data, $state_data['key']);

            // Don't add to computed signature
            $data['site_details'] = base64_encode(serialize($state_data['site_details']));
            $ajax_url = $this->util->ajax_url();
            $response = $this->remote_post->post($ajax_url, $data, __FUNCTION__);

            ob_start();
            $this->util->display_errors();
            $maybe_errors = trim(ob_get_clean());

            // WP_Error is thrown manually by remote_post() to tell us something went wrong
            if (is_wp_error($response)) {
                return $this->http->end_ajax(
                    $response
                );
            }

            // returned data is just a big string like this query;query;query;33
            // need to split this up into a chunk and row_tracker
            // only strip the last new line if it exists
            $row_information = false !== strpos($response, "\n") ? trim(substr(strrchr($response, "\n"), 1)) : trim($response);
            $row_information = explode(',', $row_information);
            $chunk           = substr($response, 0, strrpos($response, ";\n") + 1);

            if (!empty($chunk)) {
                $process_chunk_result = $this->table->process_chunk($chunk);
                if (true !== $process_chunk_result) {
                    return $this->http->end_ajax($process_chunk_result);
                }
            }

            $result = array(
                'current_row'  => $row_information[0],
                'primary_keys' => $row_information[1],
            );

            $result = $this->http->end_ajax($result);
        }

        return $result;
    }

    /**
     * Appends an export of a table to a backup file as per params defined in $this->state_data.
     *
     * @return mixed|null
     */
    function handle_table_backup($key = 'wpmdb_migration_state')
    {
        $state_data = Persistence::getStateData($key);

        if (empty($state_data['dumpfile_created'])) {
            $state_data['dumpfile_created'] = true;

            Persistence::saveStateData($state_data, $key);
        }

        $this->dynamic_props->maximum_chunk_size = $this->util->get_bottleneck();
        $sql_dump_file_name                      = $this->filesystem->get_upload_info('path') . DIRECTORY_SEPARATOR;
        $sql_dump_file_name                      .= $this->table_helper->format_dump_name($state_data['dump_filename']);
        $file_created                            = file_exists($sql_dump_file_name);
        $fp                                      = $this->filesystem->open($sql_dump_file_name);

        if ($file_created == false) {
            $this->table->db_backup_header($fp);
        }

        $result = $this->table->process_table($state_data['table'], $fp, $state_data);

        if (isset($fp) && \is_resource($fp)) {
            $this->filesystem->close($fp);
        }

        return $result;
    }

    /**
     * Called to cleanup on error
     */
    function error_migration()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();
        $error_message = '';
        if (isset($_POST['error_message'])) {
            $error_message = sanitize_text_field($_POST['error_message']);
        }
        do_action('wpmdb_error_migration', $error_message);
        $this->ajax_cancel_migration();
    }

    /**
     * Called to cancel an in-progress migration.
     */
    function ajax_cancel_migration()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $key_rules = array(
            'action' => 'key',
        );

        $state_data = Persistence::setPostData($key_rules, __METHOD__);

        if (is_wp_error($state_data)) {
            return wp_send_json_error($state_data->get_error_message());
        }

        $this->migration_options = $this->form_data->parse_and_save_migration_form_data($state_data['form_data']);

        switch ($state_data['intent']) {
            case 'savefile':
                if($state_data['full_site_export'] !== true || $state_data['stage'] === 'migrate') {
                    $this->backup_export->delete_export_file($state_data['dump_filename'], false);
                }
                if($state_data['full_site_export'] === true) {
                    $zip_removed = $this->full_site_export->delete_export_zip($state_data['export_path']);
                    return $this->http->end_ajax($zip_removed);
                }
                break;
            case 'push':
                $data = $this->http_helper->filter_post_elements(
                    $state_data,
                    array(
                        'remote_state_id',
                        'intent',
                        'url',
                        'form_data',
                        'temp_prefix',
                        'stage',
                    )
                );

                $data['form_data'] = base64_encode($state_data['form_data']);
                $data['action']    = 'wpmdb_process_push_migration_cancellation';
                $data['sig']       = $this->http_helper->create_signature($data, $state_data['key']);
                $ajax_url          = $this->util->ajax_url();

                $response          = $this->remote_post->post($ajax_url, $data, __FUNCTION__);
                $filtered_response = HandleRemotePostError::handle('wpmdb_remote_cancellation_failed', $response);
                do_action('wpmdb_cancellation');

                return $this->http->end_ajax($filtered_response);
            case 'pull':
                if ($state_data['stage'] == 'backup') {
                    if (!empty($state_data['dumpfile_created'])) {
                        $this->backup_export->delete_export_file($state_data['dump_filename'], true);
                    }
                } else {
                    $this->table->delete_temporary_tables($state_data['temp_prefix']);
                }
                break;
            case 'find_replace':
                if ('backup' === $state_data['stage'] && !empty($state_data['dumpfile_created'])) {
                    $this->backup_export->delete_export_file($state_data['dump_filename'], true);
                } else {
                    $this->table->delete_temporary_tables($this->props->temp_prefix);
                }
                break;
            case 'import':
                if ('backup' === $state_data['stage'] && !empty($state_data['dumpfile_created'])) {
                    $this->backup_export->delete_export_file($state_data['dump_filename'], true);
                } else {
                    // Import might have been deleted already
                    if ($this->filesystem->file_exists($state_data['import_path'])) {
                        $sanitized_import_filename = sanitize_file_name($state_data['import_filename']);
                        if ($state_data['import_info']['import_gzipped']) {
                            $is_backup = $this->filesystem->file_exists(substr($state_data['import_path'], 0, -3)) ? true : false;
                            $this->backup_export->delete_export_file($sanitized_import_filename, $is_backup);
                        } else {
                            $this->backup_export->delete_export_file($sanitized_import_filename, true);
                        }
                    }
                    $this->table->delete_temporary_tables($this->props->temp_prefix);
                }
                break;
            default:
                break;
        }

        do_action('wpmdb_cancellation');

        $this->http->end_ajax('success');
    }

    protected function handle_remote_backup($state_data)
    {
        $data = $this->http_helper->filter_post_elements(
            $state_data,
            array(
                'action',
                'url',
                'table',
                'form_data',
                'stage',
                'current_row',
                'last_table',
                'gzip',
                'primary_keys',
                'path_current_site',
                'domain_current_site',
            )
        );

        $data['action'] = 'wpmdb_backup_remote_table';
        $data['intent'] = 'pull';

        $data['form_data'] = base64_encode($data['form_data']);

        $data['sig'] = $this->http_helper->create_signature($data, $state_data['key']);

        $data['primary_keys'] = base64_encode($data['primary_keys']);
        $ajax_url             = $this->util->ajax_url();
        $response             = $this->remote_post->post($ajax_url, $data, __FUNCTION__);

        return HandleRemotePostError::handle('wpmdb-handle-remote-backup-failed', $response);
    }
}
