<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\Error\HandleRemotePostError;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\RemotePost;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Util;

class FinalizeMigration
{

    public $state_data;
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
     * @var TableHelper
     */
    private $table_helper;
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
     * @var FormData
     */
    private $form_data;
    /**
     * @var MigrationHelper
     */
    private $migration_helper;

    public function __construct(
        MigrationStateManager $migration_state_manager,
        Table $table,
        Http $http,
        TableHelper $table_helper,
        Helper $http_helper,
        Util $util,
        RemotePost $remote_post,
        FormData $form_data,
        Properties $properties,
        MigrationHelper $migration_helper
    ) {
        $this->migration_state_manager = $migration_state_manager;
        $this->table                   = $table;
        $this->http                    = $http;
        $this->props                   = $properties;
        $this->table_helper            = $table_helper;
        $this->http_helper             = $http_helper;
        $this->util                    = $util;
        $this->remote_post             = $remote_post;
        $this->form_data               = $form_data;
        $this->migration_helper        = $migration_helper;
    }

    /**
     * After table migration, delete old tables and rename new tables removing the temporarily prefix.
     *
     * @return mixed
     */
    function ajax_finalize_migration()
    {
        $_POST = $this->http_helper->convert_json_body_to_post();

        $key_rules = array(
            'action' => 'key',
            'prefix' => 'string',
            'tables' => 'string',
            'nonce'  => 'key',
        );

        $key_rules = apply_filters('wpmdb_finalize_key_rules', $key_rules);

        //@todo - revisit
        $migration_state = get_site_option('wpmdb_migration_state');

        if (!isset($migration_state['site_details'])) {
            return $this->http->end_ajax(new \WP_Error('wpmdb_finalize_failed', __('Unable to finalize the migration, migration state empty.')));
        }

        $state_data                 = Persistence::setPostData($key_rules, __METHOD__);
        $state_data['site_details'] = $migration_state['site_details'];

        if ('savefile' === $state_data['intent']) {
            return true;
        }

        global $wpdb;

        do_action('wpmdb_finalize_migration', $state_data); // Fires on local site

        if ('push' === $state_data['intent']) {
            do_action('wpmdb_migration_complete', 'push', $state_data['url']);
            $data                 = $this->http_helper->filter_post_elements(
                $state_data,
                array(
                    'url',
                    'form_data',
                    'site_details',
                    'tables',
                    'temp_prefix',
                )
            );
            $data['form_data']    = base64_encode($data['form_data']);
            $data['site_details'] = base64_encode(serialize($data['site_details']));

            $data['action']   = 'wpmdb_remote_finalize_migration';
            $data['intent']   = 'pull';
            $data['prefix']   = $wpdb->base_prefix;
            $data['type']     = 'push';
            $data['location'] = Util::home_url();
            $data['sig']      = $this->http_helper->create_signature($data, $state_data['key']);
            $data['stage']    = $state_data['stage'];
            $ajax_url         = $this->util->ajax_url();
            $response         = $this->remote_post->post($ajax_url, $data, __FUNCTION__);
            $return           = HandleRemotePostError::handle('wpmdb-remote-finalize-failed', $response);
        } else {
            $return = $this->finalize_migration($state_data);
        }

        $result = $this->http->end_ajax($return);

        return $result;
    }

    /**
     * Internal function for finalizing a migration.
     *
     * @return bool|null
     */
    function finalize_migration($state_data = false)
    {
        $state_data                         = !$state_data ? Persistence::getStateData() : $state_data; 
        if ( in_array($state_data['intent'], ['push', 'pull'])) {
            $state_data['destination_prefix']   = ('push' === $state_data['type']) ? $state_data['site_details']['remote']['prefix'] : $state_data['site_details']['local']['prefix'];
            $state_data['source_prefix']        = ('push' === $state_data['type']) ? $state_data['site_details']['local']['prefix'] : $state_data['site_details']['remote']['prefix'];
        }
        
        $temp_prefix                        = isset($state_data['temp_prefix']) ? $state_data['temp_prefix'] : $this->props->temp_prefix;
        $temp_tables                        = array();
        $type                               = $state_data['intent'];
        $alter_table_name                   = $this->table->get_alter_table_name();
        $before_finalize_response = apply_filters('wpmdb_before_finalize_migration', true, $this);

        if (is_wp_error($before_finalize_response)) {
            return $this->http->end_ajax($before_finalize_response);
        }

        if (isset($state_data['type']) && 'push' === $state_data['type']) {
            $type = 'push';
        }

        $tables = $this->get_tables($state_data);

        if ('find_replace' === $state_data['intent'] || 'import' === $state_data['intent']) {
            $location = Util::home_url();
        } else {
            $location = (isset($state_data['location'])) ? $state_data['location'] : $state_data['url'];
        }

        if ('import' === $state_data['intent']) {
            $temp_tables = $this->table->get_tables('temp');
            $tables      = array();

            foreach ($temp_tables as $key => $temp_table) {
                if ($alter_table_name === $temp_table) {
                    unset($temp_tables[$key]);
                    continue;
                }

                $tables[] = substr($temp_table, strlen($temp_prefix));
            }
        } else {
            foreach ($tables as $table) {
                $temp_tables[] = $temp_prefix . apply_filters(
                        'wpmdb_finalize_target_table_name',
                        $table,
                        $state_data
                    );
            }
        }

        $sql = "SET FOREIGN_KEY_CHECKS=0;\n";

        $sql .= $this->table->get_preserved_options_queries($state_data, $temp_tables, $type);

        foreach ($temp_tables as $table) {
            $sql .= 'DROP TABLE IF EXISTS ' . $this->table_helper->backquote(substr($table, strlen($temp_prefix))) . ';';
            $sql .= "\n";
            $sql .= 'RENAME TABLE ' . $this->table_helper->backquote($table) . ' TO ' . $this->table_helper->backquote(substr($table, strlen($temp_prefix))) . ';';
            $sql .= "\n";
        }

        $sql .= $this->table->get_alter_queries($state_data);
        $sql .= 'DROP TABLE IF EXISTS ' . $this->table_helper->backquote($alter_table_name) . ";\n";

        $process_chunk_result = $this->table->process_chunk($sql);
        if (true !== $process_chunk_result) {
            $result = $this->http->end_ajax($process_chunk_result);

            return $result;
        }

        if (!isset($state_data['location']) && !in_array($state_data['intent'], array('find_replace', 'import'))) {
            $data           = array();
            $data['action'] = 'wpmdb_fire_migration_complete';
            $data['url']    = Util::home_url();
            $data['sig']    = $this->http_helper->create_signature($data, $state_data['key']);
            $ajax_url       = $this->util->ajax_url();
            $response       = $this->remote_post->post($ajax_url, $data, __FUNCTION__);

            $this->util->display_errors();
            $decoded_response = json_decode($response, true);

            if (!isset($decoded_response['success']) || !$decoded_response['success']) {
                return $this->http->end_ajax(
                    new \WP_Error(
                        'wpmdb-remote-finalize-failed',
                        $response
                    )
                );
            }
        }

        do_action('wpmdb_migration_complete', $type, $location);

        return true;
    }

    /**
     * Convert string of table names to array, changes prefix if needed.
     *
     * @param array $state_data
     * 
     * @return array of tables
     *  
     **/
    private function get_tables($state_data)
    {
        $source_tables      = explode(',', $state_data['tables']);
        $source_prefix      = $state_data['source_prefix'];
        $destination_prefix = $state_data['destination_prefix'];
        if ($source_prefix === $destination_prefix || '1' === $state_data['mst_select_subsite']) {
            return $source_tables;
        }
        return Util::change_tables_prefix($source_tables, $source_prefix, $destination_prefix);
    }

}
