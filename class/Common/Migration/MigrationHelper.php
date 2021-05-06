<?php

namespace DeliciousBrains\WPMDB\Common\Migration;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Multisite\Multisite;
use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;


class MigrationHelper
{

    /**
     * @var Multisite
     */
    private $multisite;
    /**
     * @var Util
     */
    private $util;
    /**
     * @var Tables
     */
    private $tables;
    /**
     * @var Filesystem
     */
    private $filesystem;
    /**
     * @var Properties
     */
    private $props;
    /**
     * @var Settings
     */
    private $settings;
    /**
     * @var Assets
     */
    private $assets;

    public function __construct(
        Multisite $multisite,
        Util $util,
        Table $tables,
        Filesystem $filesystem,
        Properties $props,
        Settings $settings,
        Assets $assets

    ) {
        $this->multisite  = $multisite;
        $this->util       = $util;
        $this->tables     = $tables;
        $this->filesystem = $filesystem;
        $this->props      = $props;
        $this->settings   = $settings->get_settings();
        $this->assets     = $assets;
    }

    public function getMergedSiteDetails()
    {
        $local       = $this->util->site_details();
        $remote_info = get_site_option('wpmdb_remote_response');
        $remote      = !empty($remote_info) ? $remote_info['site_details'] : '';

        return [
            'local'  => $local,
            'remote' => $remote,
        ];
    }

    public function siteDetails()
    {
        $site_details = $this->util->site_details();

        return [
            'connection_info'             => array(site_url('', 'https'), $this->settings['key']),
            'this_url'                    => esc_html(addslashes(home_url())),
            'this_path'                   => esc_html(addslashes($this->util->get_absolute_root_file_path())),
            'this_domain'                 => esc_html($this->multisite->get_domain_current_site()),
            'this_tables'                 => $this->tables->get_tables(),
            'this_prefixed_tables'        => $this->tables->get_tables('prefix'),
            'this_table_sizes'            => $this->tables->get_table_sizes(),
            'this_table_sizes_hr'         => array_map(array($this->tables, 'format_table_sizes'), $this->tables->get_table_sizes()),
            'this_table_rows'             => $this->tables->get_table_row_count(),
            'this_upload_url'             => esc_html(addslashes(trailingslashit($this->filesystem->get_upload_info('url')))),
            'this_upload_dir_long'        => esc_html(addslashes(trailingslashit($this->filesystem->get_upload_info('path')))),
            'this_wp_upload_dir'          => $this->filesystem->get_wp_upload_dir(),
            'this_uploads_dir'            => $site_details['uploads_dir'], // TODO: Remove backwards compatibility.
            'this_plugin_url'             => trailingslashit(plugins_url($this->props->plugin_folder_name)),
            'this_website_name'           => sanitize_title_with_dashes(DB_NAME),
            'this_download_url'           => network_admin_url($this->props->plugin_base . '&download='),
            'this_prefix'                 => $site_details['prefix'], // TODO: Remove backwards compatibility.
            'this_temp_prefix'            => $this->props->temp_prefix,
            'this_plugin_base'            => esc_html($this->props->plugin_base),
            'this_post_types'             => $this->tables->get_post_types(),
            'is_multisite'                => $site_details['is_multisite'], // TODO: Remove backwards compatibility.
            'openssl_available'           => esc_html($this->util->open_ssl_enabled() ? 'true' : 'false'),
            'max_request'                 => esc_html($this->settings['max_request']),
            'delay_between_requests'      => esc_html($this->settings['delay_between_requests']),
            'prog_tables_hidden'          => ( bool )$this->settings['prog_tables_hidden'],
            'pause_before_finalize'       => ( bool )$this->settings['pause_before_finalize'],
            'bottleneck'                  => esc_html($this->util->get_bottleneck('max')),
            // TODO: Use WP_Filesystem API.
            'write_permissions'           => esc_html(is_writable($this->filesystem->get_upload_info('path')) ? 'true' : 'false'),
            'profile'                     => isset($_GET['wpmdb-profile']) ? $_GET['wpmdb-profile'] : '-1',
            'is_pro'                      => esc_html($this->props->is_pro ? 'true' : 'false'),
            'lower_case_table_names'      => esc_html($this->tables->get_lower_case_table_names_setting()),
            'subsites'                    => $site_details['subsites'], // TODO: Remove backwards compatibility.
            'site_details'                => $this->util->site_details(),
            'alter_table_name'            => $this->tables->get_alter_table_name(),
            'allow_tracking'              => $this->settings['allow_tracking'],
            'MDB_API_BASE'                => get_rest_url(null, $this->props->rest_api_base),
            'diagnostic_log_download_url' => network_admin_url($this->props->plugin_base . '&nonce=' . Util::create_nonce('wpmdb-download-log') . '&wpmdb-download-log=1'),
            'migration_profiles'          => $this->assets->get_saved_migration_profiles(),
            'recent_migrations'           => $this->assets->get_recent_migrations(get_site_option('wpmdb_recent_migrations')),
            'mst_available'               => Util::isPro() && (int)class_exists('\DeliciousBrains\WPMDBMST\MultisiteToolsAddon'),
            'tpf_available'               => Util::isPro() && (int)class_exists('\DeliciousBrains\WPMDBTP\ThemePluginFilesAddon'),
            'mf_available'                => Util::isPro() && (int)class_exists('\DeliciousBrains\WPMDBMF\MediaFilesAddon'),
            'mst_required_message'        => $this->multisite->mst_required_message(),
            'time_format'                 => get_option( 'time_format' ),
        ];
    }
}
