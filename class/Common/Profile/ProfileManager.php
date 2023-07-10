<?php

namespace DeliciousBrains\WPMDB\Common\Profile;

use DeliciousBrains\WPMDB\Common\Error\ErrorLog;
use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\Http\Helper;
use DeliciousBrains\WPMDB\Common\Http\Http;
use DeliciousBrains\WPMDB\Common\Http\WPMDBRestAPIServer;
use DeliciousBrains\WPMDB\Common\MigrationState\MigrationStateManager;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Sanitize;

class ProfileManager
{

    /**
     * @var Http
     */
    private $http;

    /**
     * @var Properties
     */
    private $properties;

    /**
     * @var Settings
     */
    private $settings;

    /**
     * @var MigrationStateManager
     */
    private $state_manager;

    /**
     * @var Util
     */
    private $util;

    /**
     * @var ErrorLog
     */
    private $error_log;

    /**
     * @var Table
     */
    private $table;

    /**
     * @var FormData
     */
    private $form_data;

    /**
     * @var Helper
     */
    private $http_helper;

    /**
     * @var Assets
     */
    private $assets;

    /**
     * @var WPMDBRestAPIServer
     */
    private $rest_API_server;

    protected $valid_post_types;

    /**
     * @var ProfileImporter
     */
    private $profile_importer;

    /**
     * @var string[]
     */
    private $checkbox_options;

    /**
     * @var array
     */
    private $default_profile;

    /**
     * ProfileManager constructor.
     *
     * @param Http                  $http
     * @param Properties            $properties
     * @param Settings              $settings
     * @param MigrationStateManager $state_manager
     * @param Util                  $util
     * @param ErrorLog              $error_log
     * @param Table                 $table
     * @param FormData              $form_data
     */
    public function __construct(
        Http $http,
        Helper $http_helper,
        Properties $properties,
        Settings $settings,
        MigrationStateManager $state_manager,
        Util $util,
        ErrorLog $error_log,
        Table $table,
        FormData $form_data,
        Assets $assets,
        WPMDBRestAPIServer $rest_API_server,
        ProfileImporter $profile_importer
    ) {
        $this->default_profile = [
            'action'                    => 'savefile',
            'save_computer'             => '1',
            'gzip_file'                 => '1',
            'table_migrate_option'      => 'migrate_only_with_prefix',
            'replace_guids'             => '1',
            'default_profile'           => true,
            'name'                      => '',
            'select_tables'             => [],
            'select_post_types'         => [],
            'backup_option'             => 'backup_only_with_prefix',
            'exclude_transients'        => '1',
            'compatibility_older_mysql' => '0',
            'import_find_replace'       => '1',
        ];

        $this->checkbox_options = [
            'save_computer'             => '0',
            'gzip_file'                 => '0',
            'replace_guids'             => '0',
            'exclude_spam'              => '0',
            'keep_active_plugins'       => '0',
            'create_backup'             => '0',
            'exclude_post_types'        => '0',
            'exclude_transients'        => '0',
            'compatibility_older_mysql' => '0',
            'import_find_replace'       => '0',
        ];
        $this->http             = $http;
        $this->properties       = $properties;
        $this->settings         = $settings->get_settings();
        $this->state_manager    = $state_manager;
        $this->util             = $util;
        $this->error_log        = $error_log;
        $this->table            = $table;
        $this->form_data        = $form_data;
        $this->http_helper      = $http_helper;
        $this->assets           = $assets;
        $this->rest_API_server  = $rest_API_server;
        $this->profile_importer = $profile_importer;
    }

    public function register()
    {
        // internal AJAX handlers
        add_action('wp_ajax_wpmdb_delete_migration_profile', array($this, 'ajax_delete_migration_profile'));
        add_action('wp_ajax_wpmdb_save_profile', array($this, 'ajax_save_profile'));

        // REST endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('wpmdb_before_schema_update', [$this->profile_importer, 'setProfileDefaults']);
    }

    public function register_rest_routes()
    {
        $this->rest_API_server->registerRestRoute(
            '/save-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'save_profile'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/unsaved-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'save_recent_migration'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/remove-recent-migration',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'remove_recent_migration'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/remove-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'remove_profile'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/rename-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'rename_profile'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/overwrite-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'overwrite_profile'],
            ]
        );

        $this->rest_API_server->registerRestRoute(
            '/load-profile',
            [
                'methods'  => 'POST',
                'callback' => [$this, 'load_profile'],
            ]
        );
    }

    public function save_profile()
    {
        $state_data = $this->set_state_data(
            [
                'name'       => 'string',
                'id'         => 'int',
                'value'      => 'json',
                'guid'       => 'string',
                'fromRecent' => 'bool',
            ],
            'save'
        );

        if (is_wp_error($state_data)) {
            $this->http->end_ajax($state_data);
        }

        $existing_profiles = get_site_option('wpmdb_saved_profiles');

        $profiles = [];

        array_unshift($profiles, '');
        unset($profiles[0]);

        if (!empty($existing_profiles)) {
            $profiles = $existing_profiles;
        }

        // @TODO Check if Profile already exists with same name
        $date = current_time('timestamp');

        $value = isset($state_data['value']) ? $state_data['value'] : '';

        // Handle moving profile from 'Recent Migration' to saved profile
        if (isset($state_data['fromRecent']) && $state_data['fromRecent']) {
            $recent_migrations = get_site_option('wpmdb_recent_migrations');
            if (!empty($recent_migrations) && isset($state_data['id'])) {
                if (isset($recent_migrations[$state_data['id']])) {
                    $value = $recent_migrations[$state_data['id']]['value'];
                }
            }
        }

        $new_profile = [
            'name'  => $state_data['name'],
            'value' => $value,
            'guid'  => $state_data['guid'],
            'date'  => $date,
        ];

        $profiles[] = $new_profile;
        update_site_option('wpmdb_saved_profiles', $profiles);

        return wp_send_json_success(['id' => max(array_keys($profiles))]);
    }

    public function save_recent_migration()
    {
        $max_recent_profiles = apply_filters('wpmdb_recent_profiles_limit', 10);
        $saved_profiles      = null;
        $saved_profile_data  = null;
        $save_recent         = true;

        $state_data = $this->set_state_data(
            [
                'name'       => 'string',
                'id'         => 'int',
                'value'      => 'json',
                'guid'       => 'string',
                'fromRecent' => 'bool',
            ],
            'save'
        );

        if (is_wp_error($state_data)) {
            $this->http->end_ajax($state_data);
        }

        $existing_profiles = get_site_option('wpmdb_recent_migrations');

        if ($state_data['id'] !== null) {
            $saved_profiles = get_site_option('wpmdb_saved_profiles');

            if ($saved_profiles) {
                //get saved profile by id

                if (isset($saved_profiles[$state_data['id']])) {
                    $saved_profile_data = $saved_profiles[$state_data['id']];
                    //diff
                    if ($saved_profile_data['value'] === $state_data['value']) {
                        $save_recent = false;
                    }
                }
            }
        }

        if (!$save_recent) {
            return wp_send_json_success('not saved');
        }

        $profiles = [];

        if (!empty($existing_profiles)) {
            $profiles = $existing_profiles;
        }

        $date = current_time('timestamp');

        // @TODO Check if Profile already exists with same names
        $new_profile = [
            'name'  => $state_data['name'],
            'value' => $state_data['value'],
            'date'  => $date,
            'guid'  => $state_data['guid'],
        ];

        // Check if we've already got $max_recent_profiles saved, if so, remove oldest (index 0)
        if (count($profiles) === $max_recent_profiles) {
            \array_splice($profiles, 0, 1);
        }

        $profiles[] = $new_profile;

        update_site_option('wpmdb_recent_migrations', $profiles);

        return wp_send_json_success(['date' => $date, 'id' => max(array_keys($profiles)), 'profiles' => $this->assets->get_recent_migrations($profiles)]);
    }

    public function remove_recent_migration()
    {
        $state_data = $this->set_state_data(
            [
                'id' => 'int',
            ],
            'remove'
        );

        if (is_wp_error($state_data)) {
            return Util::throw_ajax_error($state_data->get_error_message());
        }

        $existing_profiles = get_site_option('wpmdb_recent_migrations');

        if (empty($existing_profiles)) {
            return wp_send_json_error(__('No recent migrations', 'wp-migrate-db'));
        }

        unset($existing_profiles[$state_data['id']]);

        update_site_option('wpmdb_recent_migrations', $existing_profiles);

        return wp_send_json_success($state_data['id'] . ' Removed 👍');
    }

    public function remove_profile()
    {
        $state_data = $this->set_state_data(
            [
                'guid' => 'text',
            ],
            'remove'
        );

        if (is_wp_error($state_data)) {
            return Util::throw_ajax_error($state_data->get_error_message());
        }

        $saved_profiles = get_site_option('wpmdb_saved_profiles');

        if (empty($saved_profiles) || !\is_array($saved_profiles)) {
            return wp_send_json_error(__('Profile not found.', 'wp-migrate-db'));
        }

        $profile_key = 0;
        foreach ($saved_profiles as $key => $profile) {
            if ($profile['guid'] === $state_data['guid']) {
                $profile_key = $key;
            }
        }

        unset($saved_profiles[$profile_key]);
        update_site_option('wpmdb_saved_profiles', $saved_profiles);

        return wp_send_json_success(__('Profile removed', 'wp-migrate-db'));
    }

    public function rename_profile()
    {
        $state_data = $this->set_state_data(
            [
                'guid' => 'text',
                'name' => 'text',
            ],
            'rename'
        );

        if (is_wp_error($state_data)) {
            return Util::throw_ajax_error($state_data->get_error_message());
        }

        $saved_profiles = get_site_option('wpmdb_saved_profiles');

        if (empty($saved_profiles) || !\is_array($saved_profiles)) {
            return wp_send_json_error(__('Profile not found.', 'wp-migrate-db'));
        }

        $profile_key = 0;
        foreach ($saved_profiles as $key => $profile) {
            if ($profile['guid'] === $state_data['guid']) {
                $profile_key = $key;
            }
        }

        $saved_profiles[$profile_key]['name'] = $state_data['name'];

        update_site_option('wpmdb_saved_profiles', $saved_profiles);

        return wp_send_json_success(__('Profile saved', 'wp-migrate-db'));
    }

    public function overwrite_profile()
    {
        $state_data = $this->set_state_data(
            [
                'guid'     => 'text',
                'contents' => 'json',
            ],
            'overwrite'
        );

        if (is_wp_error($state_data)) {
            return Util::throw_ajax_error($state_data->get_error_message());
        }

        $saved_profiles = get_site_option('wpmdb_saved_profiles');

        if (empty($saved_profiles) || !\is_array($saved_profiles)) {
            return wp_send_json_error(__('Profile not found.', 'wp-migrate-db'));
        }

        $profile_key = 0;
        foreach ($saved_profiles as $key => $profile) {
            if ($profile['guid'] === $state_data['guid']) {
                $profile_key = $key;
            }
        }

        $profile_data = apply_filters('wpmdb_overwrite_profile', $state_data['contents']);

        $saved_profiles[$profile_key]['value'] = $profile_data;

        // We should have formatted everything correctly by now.
        if (isset($saved_profiles[$profile_key]['imported'])) {
            unset($saved_profiles[$profile_key]['imported']);
        }

        update_site_option('wpmdb_saved_profiles', $saved_profiles);

        return wp_send_json_success(__('Profile saved', 'wp-migrate-db'));
    }

    public function load_profile()
    {
        $state_data = $this->set_state_data(
            [
                'id'      => 'string',
                'unSaved' => 'bool',
            ],
            'load'
        );

        if (is_wp_error($state_data)) {
            return Util::throw_ajax_error($state_data->get_error_message());
        }

        $profile_id = $state_data['id'];
        $unsaved    = $state_data['unSaved'] ? 'unsaved' : 'saved';

        $the_profile = $this->get_profile_by_id($unsaved, $profile_id);

        if (is_wp_error($the_profile)) {
            wp_send_json_error($the_profile->get_error_message());
        }

        $parsed_profile = json_decode($the_profile['value'], true);
        $parsed_profile['profile_type'] = $state_data['unSaved'] ? 'unsaved' : 'saved';

        $the_profile['value'] = json_encode($parsed_profile);

        return wp_send_json_success(['id' => $profile_id, 'profile' => $the_profile]);
    }

    public function set_state_data($key_rules, $action)
    {
        $_POST   = $this->http_helper->convert_json_body_to_post();
        $context = $this->util->get_caller_function();

        $state_data = Sanitize::sanitize_data($_POST, $key_rules, $context);

        if (empty($state_data)) {
            return new \WP_Error('profile-save-failed', sprintf(__('Failed to %s profile, state data is empty.', 'wp-migrate-db'), $action));
        }

        return $state_data;
    }

    /**
     * Handler for deleting a migration profile.
     *
     * @return bool|null
     */
    function ajax_delete_migration_profile()
    {
        $this->http->check_ajax_referer('delete-migration-profile');

        $key_rules = array(
            'action'     => 'key',
            'profile_id' => 'positive_int',
            'nonce'      => 'key',
        );

        $state_data = $this->state_manager->set_post_data($key_rules);

        $key = absint($state_data['profile_id']);
        --$key;
        $return = '';

        if (isset($this->settings['profiles'][$key])) {
            unset($this->settings['profiles'][$key]);
            update_site_option('wpmdb_settings', $this->settings);
        } else {
            $return = '-1';
        }

        $result = $this->http->end_ajax($return);

        return $result;
    }

    /**
     * Handler for the ajax request to save a migration profile.
     *
     * @return bool|null
     */
    function ajax_save_profile()
    {
        $this->http->check_ajax_referer('save-profile');

        $key_rules  = array(
            'action'  => 'key',
            'profile' => 'string',
            'nonce'   => 'key',
        );
        $state_data = $this->state_manager->set_post_data($key_rules);

        // ***+=== @TODO - revisit usage of parse_migration_form_data
        $profile = $this->form_data->parse_and_save_migration_form_data($state_data['profile']);
        $profile = wp_parse_args($profile, $this->checkbox_options);

        if (isset($profile['save_migration_profile_option']) && $profile['save_migration_profile_option'] == 'new') {
            $profile['name']              = $profile['create_new_profile'];
            $this->settings['profiles'][] = $profile;
        } else {
            $key                                      = $profile['save_migration_profile_option'];
            $name                                     = $this->settings['profiles'][$key]['name'];
            $this->settings['profiles'][$key]         = $profile;
            $this->settings['profiles'][$key]['name'] = $name;
        }

        update_site_option('wpmdb_settings', $this->settings);
        end($this->settings['profiles']);
        $key    = key($this->settings['profiles']);
        $result = $this->http->end_ajax($key);

        return $result;
    }

    function maybe_update_profile($profile, $profile_id)
    {
        $profile_changed = false;

        if (isset($profile['exclude_revisions'])) {
            unset($profile['exclude_revisions']);
            $profile['select_post_types'] = array('revision');
            $profile_changed              = true;
        }

        if (isset($profile['post_type_migrate_option']) && 'migrate_select_post_types' == $profile['post_type_migrate_option'] && 'pull' != $profile['action']) {
            unset($profile['post_type_migrate_option']);
            $profile['exclude_post_types'] = '1';
            $all_post_types                = $this->table->get_post_types();
            $profile['select_post_types']  = array_diff($all_post_types, $profile['select_post_types']);
            $profile_changed               = true;
        }

        if ($profile_changed) {
            $this->settings['profiles'][$profile_id] = $profile;
            update_site_option('wpmdb_settings', $this->settings);
        }

        return $profile;
    }

    // Retrieves the specified profile, if -1, returns the default profile
    function get_profile($profile_id)
    {
        --$profile_id;

        if ($profile_id == '-1' || !isset($this->settings['profiles'][$profile_id])) {
            return $this->default_profile;
        }

        return $this->settings['profiles'][$profile_id];
    }

    /**
     * @param $migration_details
     *
     * @return array
     */
    protected function filter_selected_tables($migration_details, $key, $all_tables)
    {
        $tables          = $migration_details[$key];
        $filtered_tables = array_filter(
            $tables,
            function ($item) use (&$all_tables) {
                if (in_array($item, $all_tables)) {
                    return true;
                }
            }
        );

        return $filtered_tables;
    }

    /**
     * @param $option_key
     * @param $profile_id
     *
     * @return bool|mixed|\WP_Error
     */
    public function get_profile_by_id($option_key, $profile_id)
    {
        $profile_type = $option_key === 'unsaved' ? 'wpmdb_recent_migrations' : 'wpmdb_saved_profiles';

        $saved_profiles = get_site_option($profile_type);

        if (empty($saved_profiles) || !\is_array($saved_profiles)) {
            return new \WP_Error('wpmdb_profile_not_found', __('Profile not found.', 'wp-migrate-db'));
        }

        $profile_key = null;
        foreach ($saved_profiles as $key => $profile) {
            if ($key === (int)$profile_id) {
                $profile_key = $key;
                break;
            }
        }

        if (!isset($saved_profiles[$profile_key])) {
            return new \WP_Error('wpmdb_profile_not_found', __('Profile not found.', 'wp-migrate-db'));
        }

        $the_profile = $saved_profiles[$profile_key];

        return $the_profile;
    }
}
