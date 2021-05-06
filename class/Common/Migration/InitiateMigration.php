<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\BackupExport;
use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationState;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Replace;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class InitiateMigration
{

    /**
     * @var
     */
    public $state_data;
    /**
     * @var FormData
     */
    public $form_data;
    /**
     * @var MigrationStateManager
     */
    private $migration_state_manager;
    /**
     * @var Table
     */
    private $table;
    /**
     * @var Http
     */
    private $http;
    /**
     * @var Properties
     */
    private $props;
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
     * @var Filesystem
     */
    private $filesystem;
    /**
     * @var ErrorLog
     */
    private $error_log;
    /**
     * @var MigrationState
     */
    private $migration_state;
    /**
     * @var array
     */
    private $migration_options;
    /**
     * @var MigrationHelper
     */
    private $migration_helper;
    /**
     * @var BackupExport
     */
    private $backup_export;

    public function __construct(
        MigrationStateManager $migration_state_manager,
        MigrationState $migration_state,
        Table $table,
        Http $http,
        Helper $http_helper,
        Util $util,
        RemotePost $remote_post,
        FormData $form_data,
        Filesystem $filesystem,
        ErrorLog $error_log,
        Properties $properties,
        MigrationHelper $migration_helper,
        BackupExport $backup_export
    ) {
        $this->migration_state_manager = $migration_state_manager;
        $this->table                   = $table;
        $this->http                    = $http;
        $this->props                   = $properties;
        $this->http_helper             = $http_helper;
        $this->util                    = $util;
        $this->remote_post             = $remote_post;
        $this->form_data               = $form_data;
        $this->migration_options       = $form_data->getFormData();
        $this->filesystem              = $filesystem;
        $this->error_log               = $error_log;
        $this->migration_state         = $migration_state;
        $this->migration_helper        = $migration_helper;
        $this->backup_export           = $backup_export;
    }

    /**
     * Occurs right before the first table is migrated / backed up during the migration process.
     *
     * @return string
     *
     * Does a quick check to make sure the verification string is valid and also opens / creates files for writing to (if required).
     */
    public function ajax_initiate_migration()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();
        global $wpdb;

	    $key_rules = apply_filters(
		    'wpmdb_initiate_key_rules',
		    array(
			    'action'       => 'key',
			    'intent'       => 'key',
			    'url'          => 'url',
			    'key'          => 'string',
			    'form_data'    => 'json',
			    'stage'        => 'key',
			    'stages'       => 'json',
			    'nonce'        => 'key',
			    'temp_prefix'  => 'string',
			    'site_details' => 'json_array',
			    'export_dest'  => 'string',
			    'import_info'  => 'array',
		    ),
		    __FUNCTION__
	    );

        Persistence::cleanupStateOptions();

        // Save initial migration state as an option
        // Save migration options (form_data)

        $state_data = Persistence::setPostData($key_rules, __METHOD__);

        // This only needs to be called once per request cycle
        // @see FormData::getFormData();
        $this->migration_options = $this->form_data->parse_and_save_migration_form_data($state_data['form_data']);

        update_site_option('wpmdb_usage', array('action' => $state_data['intent'], 'time' => time()));

        // A little bit of house keeping.
        MigrationState::cleanup();

        if (in_array($state_data['intent'], array('find_replace', 'savefile', 'import'))) {
            $return = $this->initiateLocalMigration($state_data);
        } else { // does one last check that our verification string is valid
            $return = $this->initiatePushOrPull($state_data);
        }

        if (is_wp_error($return)) {
            return $this->http->end_ajax($return);
        }

        $return['dump_filename'] = (empty($return['dump_filename'])) ? '' : $return['dump_filename'];
        $return['dump_url']      = (empty($return['dump_url'])) ? '' : $return['dump_url'];

        // A successful call to wpmdb_remote_initiate_migration for a Push migration will have set db_version.
        // Otherwise ensure it is set with own db_version so that we always return one.
        $return['db_version'] = (empty($return['db_version'])) ? $wpdb->db_version() : $return['db_version'];

        // A successful call to wpmdb_remote_initiate_migration for a Push migration will have set site_url.
        // Otherwise ensure it is set with own site_url so that we always return one.
        $return['site_url'] = (empty($return['site_url'])) ? site_url() : $return['site_url'];

        $return['find_replace_pairs'] = Replace::parse_find_replace_pairs($state_data['intent'], $return['site_url']);

        // Store current migration state.
        $state = array_merge($state_data, $return);
        Persistence::saveStateData($state);

        do_action('wpmdb_initiate_migration', $state_data);

        return $this->http->end_ajax($state);
    }

    /**
     * @param array $state_data
     *
     * @return array
     */
    protected function initiatePushOrPull(
        array $state_data
    ) {
        $return = [];
	    $data = [
		    'action'       => 'wpmdb_remote_initiate_migration',
		    'intent'       => $state_data['intent'],
		    'form_data'    => base64_encode( $state_data['form_data'] ),
		    'site_details' => base64_encode( serialize( $this->migration_helper->getMergedSiteDetails() ) ),
	    ];

        $data['sig']          = $this->http_helper->create_signature($data, $state_data['key']);
        $data['site_details'] = addslashes($data['site_details']);
        $data = apply_filters( 'wpmdb_initiate_push_pull_post', $data, $state_data );

        $ajax_url = $this->util->ajax_url();
        $response = $this->remote_post->post($ajax_url, $data, __FUNCTION__);

        // WP_Error is thrown manually by remote_post() to tell us something went wrong
        if (is_wp_error($response)) {
            return $this->http->end_ajax(
                $response
            );
        }

        $decoded_response = json_decode($response, true);

        if (false === $response || !$decoded_response['success']) {
            return $this->http->end_ajax(
                new \WP_Error(
                    'wpmdb-initiate-migration-failed',
                    $decoded_response['data']
                )
            );
        }

        if ('pull' === $state_data['intent']) {
            // sets up our table to store 'ALTER' queries
            $create_alter_table_query = $this->table->get_create_alter_table_query();
            $process_chunk_result     = $this->table->process_chunk($create_alter_table_query);
            if (true !== $process_chunk_result) {
                return $this->http->end_ajax($process_chunk_result);
            }

            if ('none' !== $this->migration_options['current_migration']['backup_option']) {
                list($dump_filename, $dump_url) = $this->backup_export->setup_backups();
                $return['dump_filename'] = $dump_filename;
                $return['dump_url']      = $dump_url;
            }
        }

        return $return;
    }

    /**
     *
     * Local migrations: (savefile (export), find-replace, import, backup
     *
     * @param $state_data
     *
     * @return array
     */
    protected function initiateLocalMigration($state_data)
    {
        $return = array(
            'code'    => 200,
            'message' => 'OK',
            'body'    => json_encode(array('error' => 0)),
        );

        if ('import' === $state_data['intent']) {
            $return['import_path']     = $this->table->get_sql_dump_info('import', 'path');
            $return['import_filename'] = wp_basename($return['import_path'], '.sql');

            if (Util::gzip() && isset($state_data['import_info']['import_gzipped']) && 'true' === $state_data['import_info']['import_gzipped']) {
                $return['import_path'] .= '.gz';
            }

            $this->table->delete_temporary_tables($this->props->temp_prefix);
        }

        // Backups and exports require special handling
        if (in_array($state_data['stage'], array('backup', 'migrate'))) {
            $return['dump_path']        = $this->table->get_sql_dump_info($state_data['stage'], 'path');
            $return['dump_filename']    = wp_basename($return['dump_path']);
            $return['dump_url']         = $this->table->get_sql_dump_info($state_data['stage'], 'url');
            $dump_filename_no_extension = substr($return['dump_filename'], 0, -4);

            // sets up our table to store 'ALTER' queries
            $create_alter_table_query = $this->table->get_create_alter_table_query();
            $process_chunk_result     = $this->table->process_chunk($create_alter_table_query);

            if (true !== $process_chunk_result) {
                return $this->http->end_ajax($process_chunk_result);
            }

            // 'savefile' === 'export'
            if ('savefile' === $state_data['intent']) {
                if (
                    isset($this->migration_options['gzip_file'])
                    && $this->migration_options['gzip_file'] === '1'
                    && Util::gzip()
                ) {
                    $return['dump_path']     .= '.gz';
                    $return['dump_filename'] .= '.gz';
                    $return['dump_url']      .= '.gz';
                }

                $upload_path = $this->filesystem->get_upload_info('path');

                if (false === $this->filesystem->is_writable($upload_path)) {
                    $error = sprintf(__('<p><strong>Export Failed</strong> — We can\'t save your export to the following folder:<br><strong>%s</strong></p><p>Please adjust the permissions on this folder. <a href="%s" target="_blank">See our documentation for more information »</a></p>', 'wp-migrate-db'), $upload_path, 'https://deliciousbrains.com/wp-migrate-db-pro/doc/uploads-folder-permissions/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin');

                    return $this->http->end_ajax(
                        new \WP_Error(
                            'wpmdb-export-failed',
                            $error
                        )
                    );
                }

                $fp = $this->filesystem->open($upload_path . DIRECTORY_SEPARATOR . $return['dump_filename']);
                $this->table->db_backup_header($fp);
                $this->filesystem->close($fp);
            }
            $return['dump_filename'] = $dump_filename_no_extension;
        }

        return $return;
    }
}
