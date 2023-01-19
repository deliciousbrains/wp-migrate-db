<?php

namespace DeliciousBrains\WPMDB\Common\Profile;

use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class ProfileImporter
{

    /**
     * @var Util
     */
    private $util;
    /**
     * @var Table
     */
    private $table;
    /**
     * @var array
     */
    private $valid_post_types;

    /**
     * ProfileImporter constructor.
     *
     * @param Util  $util
     * @param Table $table
     */
    public function __construct(Util $util, Table $table)
    {
        $this->util  = $util;
        $this->table = $table;
    }

    /**
     * Starts the profile import
     *
     * @param $schema_version
     */
    public function setProfileDefaults($schema_version)
    {
        if ($schema_version >= 3.1) {
            return;
        }

        $new_opts = [
            'wpmdb_saved_profiles',
            'wpmdb_recent_migrations',
            'wpmdb_migration_options',
            'wpmdb_migration_state',
            'wpmdb_remote_response',
            'wpmdb_remote_migration_state',
        ];

        foreach ($new_opts as $opt) {
            $saved_opt = get_site_option($opt);
            if (empty($saved_opt)) {
                update_site_option($opt, '');
            }
        }

        $new_saved_profiles = get_site_option('wpmdb_saved_profiles'); //New profiles
        $wpmdb_settings     = get_site_option('wpmdb_settings');
        $home               = preg_replace('/^https?:/', '', Util::home_url());
        $path               = esc_html(addslashes(Util::get_absolute_root_file_path()));

        $new_saved_profiles = $this->importOldProfiles($new_saved_profiles, $wpmdb_settings, $home, $path);

        if (!empty($new_saved_profiles)) {
            update_site_option('wpmdb_saved_profiles', $new_saved_profiles);
        }

        flush_rewrite_rules();
    }


    /**
     *
     * @param array  $new_saved_profiles
     * @param array  $wpmdb_settings
     * @param string $home
     * @param string $path
     *
     * @return array|string|void
     */
    public function importOldProfiles($new_saved_profiles, $wpmdb_settings, $home, $path)
    {
        $old_profiles = isset($wpmdb_settings['profiles']) ? $wpmdb_settings['profiles'] : false;

        if (empty($old_profiles)) {
            return;
        }

        foreach ($old_profiles as $old_key => $profile) {
            $profile = $this->profileFormat($profile, $home, $path);

            if (!$profile) {
                return false;
            }

            if (empty($new_saved_profiles)) {
                $new_saved_profiles = [];
                // Set index to start at 1
                array_unshift($new_saved_profiles, "");
                unset($new_saved_profiles[0]);
            }

            $new_saved_profiles[] = [
                'name'     => $profile['current_migration']['profile_name'],
                'value'    => json_encode($profile),
                'guid'     => Util::uuidv4(),
                'date'     => time(),
                'imported' => true,
                'old_id'   => $old_key,
            ];
        }

        // Unset the old profiles so we don't redo all this next schema upgrade.
        unset($wpmdb_settings['profiles']);
        update_site_option('wpmdb_settings', $wpmdb_settings);

        return $new_saved_profiles;
    }

    /**
     * @param array $profile
     * @param array $current_migration_details
     *
     * @return array|bool
     */
    public function appendExtraProfileOpts($profile, $current_migration_details)
    {
        if (empty($profile)) {
            return false;
        }

        $allowedExtraOpts = [
            'mst_select_subsite',
            'mst_selected_subsite',
            'mst_destination_subsite',
            'new_prefix',
            'media_files',
            'migrate_themes',
            'select_themes',
            'migrate_plugins',
            'select_plugins',
            'file_ignores',
            'mf_select_subsites',
            'mf_selected_subsites',
        ];

        foreach ($profile as $profile_key => $value) {
            if (in_array($profile_key, $allowedExtraOpts)) {
                $current_migration_details[$profile_key] = $value;
            }
        }

        return $current_migration_details;
    }

    /**
     * @param array  $profile
     * @param string $home
     * @param string $path
     *
     * @return array
     */
    public function profileFormat($profile, $home, $path)
    {
        if (empty($profile)) {
            return false;
        }

        $profileObj = (object)$profile;

        if (!is_object($profileObj)) {
            return false;
        }

        $intent = isset($profileObj->action) ? $profileObj->action : '';

        list($connection_key, $url, $connection_info) = $this->computeConnectionInfo($profileObj);
        $advanced_options = $this->computeAdvancedOptions($profileObj, $intent);

        if (empty($this->valid_post_types)) {
            $this->valid_post_types = $this->table->get_post_types();
        }

        $selected_post_types = !empty($profileObj->select_post_types) ? $profileObj->select_post_types : [];

        /**
         * In 1.9.x, post types were excluded, but in 2.0+ they are included.
         *
         * We don't have enough information for imports and pulls to fix this,
         * so we leave the selected post types empty.
         *
         * For other migrations, we know what post types there could be so we fix that here.
         */
        $post_types = [];
        if (!empty($selected_post_types) && !in_array($intent, ['import', 'pull'])) {
            $post_types = array_values(array_diff($this->valid_post_types, $selected_post_types));
        }

        $custom_search_replace     = $this->composeFindAndReplace($home, $path, $profileObj, $intent);
        $current_migration_details = $this->composeCurrentMigrationDetails($profile, $intent, $profileObj, $post_types, $advanced_options);
        $current_migration_details['cli_exclude_post_types'] = !empty($selected_post_types) ? $selected_post_types : [];

        $formattedProfile = [
            'current_migration' => $current_migration_details,
            'connection_info'   =>
                [
                    'connection_state' =>
                        [
                            'value' => $connection_info,
                            'url'   => $url,
                            'key'   => $connection_key,
                        ],
                ],
            'search_replace'    =>
                [
                    'custom_search_replace'    => $custom_search_replace ? $custom_search_replace : [],
                    'standard_search_visible'  => in_array($intent, ['pull', 'push', 'import']) ? true : false,
                    'standard_options_enabled' => in_array($intent, ['pull', 'push', 'import']) ? ['domain', 'path'] : [],
                ],
        ];

        // Addons.
        $formattedProfile['media_files']        = $this->computeMediaFilesDetails($profileObj);
        $formattedProfile['theme_plugin_files'] = $this->computeThemePluginDetails($profileObj);
        $formattedProfile['multisite_tools']    = $this->computeMultisiteToolsDetails($profileObj);

        return $formattedProfile;
    }

    /**
     * Checks for legacy MST options.
     *
     * @param $profile
     *
     * @return array
     */
    protected function computeMultisiteToolsDetails($profile)
    {
        // We might already be using the new format.
        if (isset($profile->multisite_tools)) {
            return $profile->multisite_tools;
        }

        // Set up some defaults.
        $output = [
            'enabled'          => false,
            'selected_subsite' => 0,
        ];

        if (isset($profile->mst_select_subsite) && isset($profile->mst_selected_subsite)) {
            $output['enabled']             = true;
            $output['selected_subsite']    = (int) $profile->mst_selected_subsite;
            $output['destination_subsite'] = (int) $profile->mst_destination_subsite;
            if (isset($profile->new_prefix)) {
                $output['new_prefix'] = $profile->new_prefix;
            }
        }

        return $output;
    }

    /**
     * Gets legacy Media Files into a format we can work with.
     *
     * @param object $profile
     *
     * @return array
     */
    protected function computeMediaFilesDetails($profile)
    {
        // We might already be using the new format.
        if (isset($profile->media_files, $profile->media_files['enabled'])) {
            return $profile->media_files;
        }

        // None of the old media files options match up with 2.0 options,
        // so this is all we can assume here.
        $output = [
            'enabled' => false,
        ];

        if (isset($profile->media_files) && true == $profile->media_files) {
            $output['enabled'] = true;
        }

        return $output;
    }

    protected function computeThemePluginDetails($profile)
    {
        // We might already be using the new format.
        if (isset($profile->theme_plugin_files)) {
            return $profile->theme_plugin_files;
        }

        // Set defaults rather than merge in on frontend
        $output = [
            'plugin_files'     => [
                'enabled' => false,
            ],
            'plugins_option'   => '',
            'plugins_selected' => [],
            'plugins_excluded' => [],
            'theme_files'      => [
                'enabled' => false,
            ],
            'themes_option'    => '',
            'themes_selected'  => [],
            'themes_excluded'  => [],
        ];

        if (isset($profile->migrate_themes) && $profile->migrate_themes === '1') {
            if (isset($profile->select_themes) && !empty($profile->select_themes)) {
                $output['theme_files']['enabled'] = true;
                $output['themes_selected']        = $profile->select_themes;
            }
        }

        if (isset($profile->migrate_plugins) && $profile->migrate_plugins === '1') {
            if (isset($profile->select_plugins) && !empty($profile->select_plugins)) {
                $output['plugin_files']['enabled'] = true;
                $output['plugins_selected']        = $profile->select_plugins;
            }
        }
        //check if migrate_plugins === '1' and 'plugins_selected'
        if (isset($profile->file_ignores)) {
            $output['excludes'] = $profile->file_ignores;
        }

        return $output;
    }

    /**
     * @param object $profileObj
     *
     * @return array
     */
    protected function computeConnectionInfo($profileObj)
    {
        $connection_info = $url = $connection_key = '';

        if (empty($profileObj->connection_info)) {
            return array($connection_key, $url, $connection_info);
        }

        $connection_info = $profileObj->connection_info;
        $parts           = explode(PHP_EOL, $connection_info);
        $url             = !empty($parts[0]) ? preg_replace('/\\r$/', '', $parts[0]) : '';
        $connection_key  = !empty($parts[1]) ? $parts[1] : '';

        return array($connection_key, $url, $connection_info);
    }

    /**
     * @param object $profileObj
     * @param string $intent
     *
     * @return array
     */
    public function computeAdvancedOptions($profileObj, $intent)
    {
        $advanced_options = [];

        $possibleAdvOptions = [
            'replace_guids',
            'exclude_spam',
            'exclude_transients',
            'keep_active_plugins',
            'compatibility_older_mysql',
            'gzip_file',
        ];

        $allowed_advanced_options = [
            'push'         => [
                'replace_guids',
                'exclude_spam',
                'exclude_transients',
                'keep_active_plugins',
            ],
            'pull'         => [
                'replace_guids',
                'exclude_spam',
                'exclude_transients',
                'keep_active_plugins',
            ],
            'import'       => [
                'keep_active_plugins',
            ],
            'savefile'     => [
                'replace_guids',
                'exclude_spam',
                'exclude_transients',
                'compatibility_older_mysql',
                'gzip_file',
            ],
            'find_replace' => [
                'replace_guids',
                'exclude_spam',
                'exclude_transients',
            ],
        ];

        foreach ($possibleAdvOptions as $option) {
            if (isset($profileObj->$option) && (string) $profileObj->$option === '1') {
                if (!in_array($option, $allowed_advanced_options[$intent], true)) {
                    continue;
                }
                $advanced_options[] = $option;
            }
        }

        return $advanced_options;
    }

    /**
     * @param string $home
     * @param string $path
     * @param object $profileObj
     * @param string $intent
     *
     * @return array|bool
     */
    public function composeFindAndReplace($home, $path, $profileObj, $intent)
    {
        if (!is_object($profileObj)) {
            return false;
        }

        $custom_search_replace = [];

        if (
            !isset($profileObj->replace_old) || !is_array($profileObj->replace_old) ||
            !isset($profileObj->replace_new) || !is_array($profileObj->replace_new)
        ) {
            return false;
        }

        $replace_old = $profileObj->replace_old;
        $replace_new = $profileObj->replace_new;

        if (in_array($intent, ['pull', 'push', 'import'])) {
            $values = $intent === 'push' ? $replace_old : $replace_new;

            foreach ($values as $replace_key => $value) {
                if (($value === $home || $value === $path) && !isset($profileObj->cli_profile)) {
                    // Remove replacements as they'd be handled by the "Standard Search and Replace" options
                    unset($replace_old[$replace_key], $replace_new[$replace_key]);
                }
            }
        }

        foreach ($replace_old as $key => $item) {
            $custom_search_replace[] =
                [
                    'replace_old' => $replace_old[$key],
                    'replace_new' => $replace_new[$key],
                    'id'          => Util::uuidv4(),
                ];
        }

        return $custom_search_replace;
    }

    /**
     * @param array  $profile
     * @param string $intent
     * @param object $profileObj
     * @param array  $post_types
     * @param array  $advanced_options
     *
     * @return array
     */
    protected function composeCurrentMigrationDetails($profile, $intent, $profileObj, array $post_types, array $advanced_options)
    {
        $current_migration_details = [
            'connected'                 => false,
            'intent'                    => $intent,
            'tables_option'             => !empty($profileObj->table_migrate_option) && $profileObj->table_migrate_option === 'migrate_select' ? 'selected' : 'all',
            'tables_selected'           => !empty($profileObj->select_tables) ? $profileObj->select_tables : [],
            'backup_option'             => $profileObj->create_backup != "0" ? $profileObj->backup_option : 'none',
            'backup_tables_selected'    => !empty($profileObj->select_backup) ? $profileObj->select_backup : [],
            'post_types_option'         => !empty($profileObj->exclude_post_types) && $profileObj->exclude_post_types === '1' ? 'selected' : 'all',
            'post_types_selected'       => $post_types,
            'advanced_options_selected' => $advanced_options,
            'profile_name'              => $profileObj->name,
            'migration_enabled'         => in_array($intent, ['savefile', 'find_replace']) ? true : false,
            'databaseEnabled'           => isset($profile['databaseEnabled']) ? $profile['databaseEnabled'] : true
        ];

        $current_migration_details = $this->appendExtraProfileOpts($profile, $current_migration_details);

        return $current_migration_details;
    }
}
