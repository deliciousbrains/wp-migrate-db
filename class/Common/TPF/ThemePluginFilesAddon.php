<?php

namespace DeliciousBrains\WPMDB\Common\TPF;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\Addon\Addon;
use DeliciousBrains\WPMDB\Common\Addon\AddonAbstract;
use DeliciousBrains\WPMDB\Common\Queue\Manager;
use DeliciousBrains\WPMDB\Common\Transfers\Files\PluginHelper;
use DeliciousBrains\WPMDB\Pro\Transfers\Receiver;
use DeliciousBrains\WPMDB\Pro\UI\Template;
use DeliciousBrains\WPMDB\WPMDBDI;
use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;

class ThemePluginFilesAddon extends AddonAbstract
{
    /**
     * An array strings used for translations
     *
     * @var array $strings
     */
    protected $strings;

    /**
     * @var array $default_file_ignores
     */
    protected $default_file_ignores;

    /**
     * @var object $file_ignores
     */
    protected $file_ignores;

    /**
     * @var array $accepted_fields
     */
    protected $accepted_fields;
    public $transfer_helpers;
    public $receiver;
    public $plugin_dir_path;
    public $plugin_folder_name;
    public $plugins_url;
    public $template_path;
    /**
     * @var Template
     */
    public $template;
    /**
     * @var Filesystem
     */
    public $filesystem;
    /**
     * @var ProfileManager
     */
    public $profile_manager;
    /**
     * @var Util
     */
    private $util;
    /**
     * @var ThemePluginFilesFinalize
     */
    private $theme_plugin_files_finalize;

    /**
     * @var PluginHelper
     */
    private $plugin_helper;

    public function __construct(
        Addon $addon,
        Properties $properties,
        Filesystem $filesystem,
        ProfileManager $profile_manager,
        Util $util,
        \DeliciousBrains\WPMDB\Common\Transfers\Files\Util $transfer_helpers,
        ThemePluginFilesFinalize $theme_plugin_files_finalize,
        PluginHelper $plugin_helper
    ) {
        parent::__construct(
            $addon,
            $properties
        );

        $this->plugin_slug        = $properties->plugin_slug;
        $this->plugin_version     = $properties->plugin_version;
        $this->plugin_folder_name = $properties->plugin_folder_name . '/';
        $this->plugins_url        = trailingslashit( $this->plugins_url . '/class/Pro/TPF' );
        $this->template_path      = $this->plugin_dir_path . 'template/';

        $this->transfer_helpers = $transfer_helpers;

        // Fields that can be saved in a 'profile'
        $this->accepted_fields = [
            'migrate_themes',
            'migrate_plugins',
            'migrate_muplugins',
            'migrate_others',
            'migrate_core',
            'select_plugins',
            'select_muplugins',
            'select_themes',
            'select_others',
            'select_core',
            'file_ignores',
        ];

        $this->filesystem                  = $filesystem;
        $this->profile_manager             = $profile_manager;
        $this->util                        = $util;
        $this->theme_plugin_files_finalize = $theme_plugin_files_finalize;
        $this->plugin_helper               = $plugin_helper;
    }

    public function register()
    {

        // Register Queue manager actions
        WPMDBDI::getInstance()->get(Manager::class)->register();
        $this->addon_name = $this->addon->get_plugin_name('wp-migrate-db-pro-theme-plugin-files/wp-migrate-db-pro-theme-plugin-files.php');
        add_filter('wpmdb_before_finalize_migration', [$this->theme_plugin_files_finalize, 'maybe_finalize_tp_migration']);
        add_action('wpmdb_migration_complete', [$this->theme_plugin_files_finalize, 'cleanup_transfer_migration']);
        add_action('wpmdb_respond_to_push_cancellation', [$this->theme_plugin_files_finalize, 'remove_tmp_files_remote']);
        add_action('wpmdb_cancellation', [$this->theme_plugin_files_finalize, 'cleanup_transfer_migration']);
        add_action('wpmdb_load_assets', [$this, 'load_assets']);
        add_action('wpmdb_before_verify_connection_to_remote_site', [$this, 'cleanup_migration_cookie']);
        add_filter('wpmdb_diagnostic_info', [$this, 'diagnostic_info']);
        add_filter('wpmdb_establish_remote_connection_data', [$this, 'establish_remote_connection_data']);
        add_filter('wpmdb_data', [$this, 'js_variables']);
        add_filter('wpmdb_site_details', [$this, 'filter_site_details'], 10, 2);
    }

    /**
     * Load media related assets in core plugin
     */
    public function load_assets()
    {
        $plugins_url = trailingslashit(plugins_url($this->plugin_folder_name));
        $version     = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? time() : $this->plugin_version;
        $ver_string  = '-' . str_replace('.', '', $this->plugin_version);

        //		$src = $plugins_url . 'asset/build/css/styles.css';
        //		wp_enqueue_style( 'wp-migrate-db-pro-theme-plugin-files-styles', $src, array( 'wp-migrate-db-pro-styles' ), $version );

        //		$src = $plugins_url . "asset/build/js/bundle{$ver_string}.js";
        $src = $plugins_url . 'frontend/public/noop.js';
        wp_enqueue_script('wp-migrate-db-pro-theme-plugin-files-script', $src, [
            'jquery',
            'wp-migrate-db-pro-script-v2',
        ], $version, true);

        wp_localize_script('wp-migrate-db-pro-theme-plugin-files-script', 'wpmdbtp_settings', [
            'strings' => $this->get_strings(),
        ]);
        wp_localize_script('wp-migrate-db-pro-theme-plugin-files-script', 'wpmdbtp', [
            'enabled' => true,
        ]);
    }

    /**
     * Get translated strings for javascript and other functions
     *
     * @return array Array of translations
     */
    public function get_strings()
    {
        $strings = [
            'themes'                 => __('Themes', 'wp-migrate-db'),
            'plugins'                => __('Plugins', 'wp-migrate-db'),
            'theme_and_plugin_files' => __('Themes & Plugins', 'wp-migrate-db'),
            'theme_active'           => __('(active)', 'wp-migrate-db'),
            'select_themes'          => __('Please select themes for migration.', 'wp-migrate-db'),
            'select_plugins'         => __('Please select plugins for migration.', 'wp-migrate-db'),
            'remote'                 => __('remote', 'wp-migrate-db'),
            'local'                  => __('local', 'wp-migrate-db'),
            'failed_to_transfer'     => __('Failed to transfer file.', 'wp-migrate-db'),
            'file_transfer_error'    => __('Themes & Plugins Transfer Error', 'wp-migrate-db'),
            'loading_transfer_queue' => __('Loading transfer queue', 'wp-migrate-db'),
            'current_transfer'       => __('Transferring: ', 'wp-migrate-db'),
            'cli_migrating_push'     => __('Uploading files', 'wp-migrate-db'),
            'cli_migrating_pull'     => __('Downloading files', 'wp-migrate-db'),
        ];

        if (is_null($this->strings)) {
            $this->strings = $strings;
        }

        return $this->strings;
    }

    /**
     * Retrieve a specific translated string
     *
     * @param string $key Array key
     *
     * @return string Translation
     */
    public function get_string($key)
    {
        $strings = $this->get_strings();

        return (isset($strings[$key])) ? $strings[$key] : '';
    }

    /**
     * Add media related javascript variables to the page
     *
     * @param array $data
     *
     * @return array
     */
    public function js_variables($data)
    {
        $data['theme_plugin_files_version'] = $this->plugin_version;
        $data['tpf_is_licensed']            = $this->licensed ? '1' : '0';

        return $data;
    }

    /**
     * Adds extra information to the core plugin's diagnostic info
     */
    public function diagnostic_info($diagnostic_info)
    {
        $diagnostic_info['themes-plugins'] = [
            'Themes & Plugins',
            'Transfer Bottleneck'          => size_format($this->transfer_helpers->get_transfer_bottleneck()),
            'Themes Permissions'           => decoct(fileperms($this->filesystem->slash_one_direction(WP_CONTENT_DIR . DIRECTORY_SEPARATOR . 'themes')) & 0777),
            'Plugins Permissions'          => decoct(fileperms($this->filesystem->slash_one_direction(WP_PLUGIN_DIR)) & 0777),
            'Must-Use Plugins Permissions' => decoct(fileperms($this->filesystem->slash_one_direction(WPMU_PLUGIN_DIR)) & 0777),
            'WP-Content Permissions'       => decoct(fileperms($this->filesystem->slash_one_direction(WP_CONTENT_DIR)) & 0777),
            'WP-Core Permissions'          => decoct(fileperms($this->filesystem->slash_one_direction(ABSPATH)) & 0777),
        ];

        return $diagnostic_info;
    }

    /**
     * Check the remote site has the media addon setup
     *
     * @param array $data Connection data
     *
     * @return array Updated connection data
     */
    public function establish_remote_connection_data($data)
    {
        $data['theme_plugin_files_available'] = '1';
        $data['theme_plugin_files_version']   = $this->plugin_version;

        //@TODO - move to core plugin
        if (function_exists('ini_get')) {
            $max_file_uploads = ini_get('max_file_uploads');
        }

        $max_file_uploads                            = (empty($max_file_uploads)) ? 20 : $max_file_uploads;
        $data['theme_plugin_files_max_file_uploads'] = apply_filters('wpmdbtp_max_file_uploads', $max_file_uploads);

        return $data;
    }

    /**
     * Gets all active themes, including parents
     *
     * @return array stylesheet strings
     */
    private function get_active_themes()
    {
        $active_themes = [];
        if (is_multisite()) {
            $sites = get_sites();
            foreach($sites as $site) {
                $site_stylesheet = get_blog_option($site->blog_id, 'stylesheet');
                if (!in_array($site_stylesheet, $active_themes)) {
                    $active_themes[] = $site_stylesheet;
                }
                $site_template = get_blog_option($site->blog_id, 'template');
                if (!in_array($site_template, $active_themes)) {
                    $active_themes[] = $site_template;
                }
            }
            return $active_themes;
        }

        $active_themes[] = get_option('stylesheet');
        $site_template   = get_option('template');
        if (!in_array($site_template, $active_themes)) {
            $active_themes[] = $site_template;
        }
        return $active_themes;
    }

    /**
     * @return array
     */
    public function get_local_themes()
    {
        $theme_list    = [];
        $themes        = wp_get_themes();
        $active_themes = $this->get_active_themes();
        foreach ($themes as $key => $theme) {
            $set_active = in_array($key, $active_themes);
            $theme_list[$key] = [
                [
                    'name'   => html_entity_decode($theme->Name),
                    'active' => $set_active,
                    'version' => html_entity_decode($theme->Version),
                    'path'   => $this->filesystem->slash_one_direction(WP_CONTENT_DIR . DIRECTORY_SEPARATOR . 'themes' . DIRECTORY_SEPARATOR . $key),
                ],
            ];
        }

        return $theme_list;
    }

    /**
     * Get must-use plugin files
     * @return bool|array
     */
    public function get_local_muplugin_files()
    {
        if (!defined('WPMU_PLUGIN_DIR') || !is_dir(WPMU_PLUGIN_DIR)) {
            return false;
        }
        $wpmu_plugin_dir  = $this->filesystem->slash_one_direction(WPMU_PLUGIN_DIR);
        $wpmu_plugin_tree = scandir($wpmu_plugin_dir);
        $to_exclude       = [
            '.',
            '..',
            '.DS_Store',
            'wp-migrate-db-pro-compatibility.php',
            'index.php'
        ];

        return $this->prepare_files_list(
            $wpmu_plugin_tree,
            $to_exclude,
            $this->filesystem->slash_one_direction(WPMU_PLUGIN_DIR)
        );
    }


     /**
     * Gets all wp-content files not included in other stages
     * @return bool|array
     */
    public function get_local_other_files()
    {
        if (!defined('WP_CONTENT_DIR') || !is_dir(WP_CONTENT_DIR)) {
            return false;
        }
        $wp_content_dir  = $this->filesystem->slash_one_direction(WP_CONTENT_DIR);
        $wp_content_tree = scandir($wp_content_dir);
        $to_exclude      = [
            '.',
            '..',
            '.DS_Store',
            'index.php',
            'debug.log',
            'plugins',
            'mu-plugins',
            'themes',
            'uploads',
            'upgrade'
        ];

        return $this->prepare_files_list(
            $wp_content_tree,
            $to_exclude,
            $this->filesystem->slash_one_direction(WP_CONTENT_DIR)
        );
    }

     /**
     * Gets all core files not including wp-content
     * @return bool|array
     */
    public function get_local_core_files()
    {
        if (!defined('ABSPATH') || !is_dir(ABSPATH)) {
            return false;
        }
        $wp_core = [
            'wp-admin',
            'wp-includes',
            'index.php',
            'license.txt',
            'readme.html',
            'wp-activate.php',
            'wp-blog-header.php',
            'wp-comments-post.php',
            'wp-config-sample.php',
            'wp-config.php',
            'wp-cron.php',
            'wp-links-opml.php',
            'wp-load.php',
            'wp-login.php',
            'wp-mail.php',
            'wp-settings.php',
            'wp-signup.php',
            'wp-trackback.php',
            'xmlrpc.php'
        ];

        return $this->prepare_files_list(
            $wp_core,
            [],
            $this->filesystem->slash_one_direction(ABSPATH)
        );
    }

    /**
     * Prepare files for select list
     *
     * @param array $files Total contents of directory
     * @param array $to_exclude Files and directories to exclude
     * @param array $base_path Path to directory
     * @return array
     **/
    public function prepare_files_list($all_files, $to_exclude, $base_path)
    {
        $files = array_diff($all_files, $to_exclude);
        sort($files);
        $formatted_files = [];
        foreach ($files as $file) {
            $path = $base_path . DIRECTORY_SEPARATOR . $file;
            if (is_dir($path) && Util::is_empty_dir($path)) {
                continue;
            }
            $formatted_files[$file] = [
                [
                    'name'     => $file,
                    'path'     => $path,
                ]
            ];

        }

        return $formatted_files;
    }



    /**
     * @return array
     */
    // @TODO Refactor to use core version - used for Compatibility Mode
    public function get_plugin_paths()
    {
        $plugin_root = $this->filesystem->slash_one_direction(WP_PLUGIN_DIR);

        $plugins_dir  = @opendir($plugin_root);
        $plugin_files = [];

        if ($plugins_dir) {
            while (false !== ($file = readdir($plugins_dir))) {
                if ('.' === $file[0] || 'index.php' === $file) {
                    continue;
                }

                if (stristr($file, 'wp-migrate-db')) {
                    continue;
                }

                if (is_dir($plugin_root . DIRECTORY_SEPARATOR . $file)) {
                    $plugin_files[$file] = $plugin_root . DIRECTORY_SEPARATOR . $file;
                } else {
                    if ('.php' === substr($file, -4)) {
                        $plugin_files[$file] = $plugin_root . DIRECTORY_SEPARATOR . $file;
                    }
                }
            }
            closedir($plugins_dir);
        }

        return $plugin_files;
    }

    /**
     * @param string $plugin
     *
     * @return bool
     */
    public function check_plugin_exclusions($plugin)
    {
        // Exclude MDB plugins
        $plugin_exclusions = apply_filters('wpmdbtp_plugin_list', ['wp-migrate-db']);

        foreach ($plugin_exclusions as $exclusion) {
            if (stristr($plugin, $exclusion)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param $site_details
     *
     * @return mixed
     */
    public function filter_site_details($site_details, $state_data)
    {
        $intent = isset($state_data, $state_data['intent']) ? $state_data['intent'] : '';
        if(in_array($intent, ['find_replace', 'savefile', 'import'])) {
            return $site_details;
        }
        //check it we need this step here maybe with state data.
        if (isset($site_details['plugins'])) {
            return $site_details;
        }

        if (array_key_exists('max_request', $site_details) && array_key_exists('transfer_bottleneck', $site_details)) {
            return $site_details;
        }

        $exclude_wpdb_plugins                = in_array($intent, ['savefile', '']) ? false : true;
        $site_details['plugins']             = $this->filesystem->get_local_plugins($exclude_wpdb_plugins);
        $site_details['plugins_path']        = $this->filesystem->slash_one_direction(WP_PLUGIN_DIR);
        $site_details['muplugins']           = $this->get_local_muplugin_files();
        $site_details['muplugins_path']      = $this->filesystem->slash_one_direction(WPMU_PLUGIN_DIR);
        $site_details['themes']              = $this->get_local_themes();
        $site_details['themes_path']         = $this->filesystem->slash_one_direction(WP_CONTENT_DIR) . DIRECTORY_SEPARATOR . 'themes' . DIRECTORY_SEPARATOR;
        $site_details['others']              = $this->get_local_other_files();
        $site_details['content_dir']         = $this->filesystem->slash_one_direction(WP_CONTENT_DIR);
        $site_details['core']                = $this->get_local_core_files();
        $site_details['transfer_bottleneck'] = $this->transfer_helpers->get_transfer_bottleneck();
        $site_details['max_request_size']    = $this->util->get_bottleneck();
        $site_details['php_os']              = PHP_OS;
        if (in_array($intent, ['push', 'pull'])) {
            $stages                                    = !empty($state_data['stages']) ? json_decode($state_data['stages']) : [];
            $tpf_stages                                = array_intersect($stages, ['theme_files', 'plugin_files', 'muplugin_files', 'other_files']);
            $to_test                                   = empty($tpf_stages) ? ['theme_files'] : $tpf_stages;
            $folder_writable                           = $this->transfer_helpers->is_tmp_folder_writable(reset($to_test));
            $site_details['local_tmp_folder_check']    = $folder_writable;
            $site_details['local_tmp_folder_writable'] = $folder_writable['status'];
        }

        return $site_details;
    }

    /**
     * Remove cookie data stored in wp_options during migration
     *
     **/
    public function cleanup_migration_cookie()
    {
        Persistence::removeRemoteWPECookie();
    }
}
