<?php

namespace DeliciousBrains\WPMDB\Common\FullSite;

use DeliciousBrains\WPMDB\Common\Transfers\Files\Filters\FilterInterface;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Filters\WPConfigFilter;
use DeliciousBrains\WPMDB\Common\Util\Singleton;
use DeliciousBrains\WPMDB\Common\Util\Util;
use ZipArchive;

class FullSiteExport
{

    const FILES_ROOT = 'files';

    const MANIFEST = 'wpmigrate-export.json';

    /**
     * @var FilterInterface[]
     */
    private $file_filters;


    /**
     * @param FilterInterface[] $file_filters
     */
    public function __construct($file_filters = [])
    {
        $this->file_filters = $file_filters;
    }

    /**
     * Create export file and add empty wp-content dir structure
     *
     * @param string $file_name
     * @param array $state_data
     * @return mixed bool|WP_Error
     * @throws WP_Error
     **/
    public function create_export_zip($file_name, $state_data)
    {
        $zip = new ZipArchive();
        if ($zip->open($file_name, ZipArchive::CREATE) !== TRUE) {
            return new \WP_Error('wp-migrate-db-export-not-created', __('Could not create ZIP Archive', 'wp-migrate-db'));
        }
        $stages = json_decode($state_data['stages']);
        $zip->addEmptyDir($this->determine_path('other_files', $stages));
        $zip->addEmptyDir($this->determine_path('theme_files', $stages));
        $zip->addEmptyDir($this->determine_path('plugin_files', $stages));
        $zip->addEmptyDir($this->determine_path('media_files', $stages));
        $zip->addFromString(self::MANIFEST, $this->get_manifest_json());
        $zip->close();
        return true;
    }

    /**
     * Adds batch of files to ZIP
     *
     * @param array $batch
     * @param array $state_data
     * @return mixed array|WP_Error
     * @throws WP_Error
     **/
    public function add_batch_to_zip($batch, $state_data)
    {
        $zip          = new ZipArchive();
        $zip_filename = $state_data['export_path'];
        $stage        = $state_data['stage'];
        $stages       = json_decode($state_data['stages']);
        $zip->open($zip_filename);

        $count      = 0;
        $total_size = 0;
        $path       = $this->determine_path($stage, $stages);


        foreach ($batch as $key => $file) {
            if (file_exists($file['absolute_path'])) {
                //Apply filters to file
                $file          = $this->apply_file_filters($file, $state_data);
                $relative_path = $stage === 'core' ? $file['relative_root_path'] : $file['relative_path'];
                $relative_path = apply_filters('wpmdb_export_relative_path', $relative_path, $state_data);
                $add_file      = $zip->addFile($file['absolute_path'], $path . DIRECTORY_SEPARATOR . $relative_path);
                if ( ! $add_file) {
                    return new \WP_Error('wp-migrate-db-could-not-add-file-to-archive',
                        sprintf(__('Could not add %s to ZIP Archive', 'wp-migrate-db'), $file['name']));
                }
                $count++;
                $total_size += $file['size'];
            }
        }

        $zip->close();
        return [
            'count'      => $count,
            'total_size' => $total_size
        ];
    }

    /**
     * Determines the file path in ZIP
     *
     * Returns path as defined by WP constants in wp_config.php
     * if Core files included in export
     *
     * @param string $stage
     * @param array $stages
     * @return string
     **/
    protected function determine_path($stage, $stages)
    {
        $honor_const   = !empty(array_intersect(['core_files', 'core'], $stages));
        $honor_const   = apply_filters('wpmdb_export_honor_constant', $honor_const);
        $default_paths = [
            'media_files'     => 'wp-content/uploads',
            'theme_files'     => 'wp-content/themes',
            'themes'          => 'wp-content/themes',
            'plugin_files'    => 'wp-content/plugins',
            'plugins'         => 'wp-content/plugins',
            'mu_plugin_files' => 'wp-content/mu-plugins',
            'muplugins'       => 'wp-content/mu-plugins',
            'other_files'     => 'wp-content',
            'others'          => 'wp-content',
            'core_files'      => '',
            'core'            => '',
        ];

        $path = $honor_const ? $this->get_relative_dir($stage) : $default_paths[$stage];

        return self::FILES_ROOT . DIRECTORY_SEPARATOR . $path;
    }

    /**
     * Get directory relative to ABSPATH
     *
     * @param string $stage
     * @return string
     **/
    protected function get_relative_dir($stage)
    {
        return str_replace(ABSPATH, '', Util::get_stage_base_dir($stage));
    }

    /**
     * Move SQL file into ZIP archive
     *
     * @param string $dump_filename
     * @param string $zip_filename
     * @return bool
     **/
    public function move_into_zip($dump_filename, $zip_filename)
    {
        $zip = new ZipArchive();
        $zip->open($zip_filename);
        $add_file = $zip->addFile($dump_filename, 'database.sql');
        if ($add_file) {
            $zip->close();
            unlink($dump_filename);
            return true;
        }
        return false;

    }

    /**
     * Deletes ZIP archive
     *
     * @param string $zip_filename
     * @return bool|WPError
     **/
    public function delete_export_zip($zip_filename)
    {
        if (false === file_exists($zip_filename)){
             return new \WP_Error('wp-migrate-db-could-not-find-archive-file', sprintf(__(' ZIP Archive %s does not exist', 'wp-migrate-db'), $zip_filename));

        }
        $removed = unlink($zip_filename);
        if (false === $removed) {
            return new \WP_Error('wp-migrate-db-could-not-delete-archive-file', sprintf(__(' ZIP Archive %s could not be deleted', 'wp-migrate-db'), $zip_filename));
        }
        return true;
    }

    /**
     * Creates JSON string to insert into export manifest
     *
     * @return string JSON
     **/
    protected function get_manifest_json()
    {
        $export_data = [
            'name'      => get_bloginfo('name'),
            'domain'    => site_url(),
            'path'      => esc_html(Util::get_absolute_root_file_path()),
            'wpVersion' => get_bloginfo('version'),
            'services'  => $this->get_services(),
            'wpMigrate' => Util::getPluginMeta()
        ];

        return json_encode($export_data, JSON_UNESCAPED_SLASHES);
    }

    /**
     * Get services array in Local format
     *
     * @return array
     **/
    protected function get_services()
    {
        global $wpdb;
        $services = [
            'php'   => [
                'name'    => 'php',
                'version' => function_exists( 'phpversion' ) ? phpversion() : '',
            ]
        ];

        return array_merge($services, $this->get_db(mysqli_get_server_info($wpdb->dbh)), $this->get_server($_SERVER['SERVER_SOFTWARE']));
    }

    /**
     * Get db software array in Local format
     *
     * @param string $data_base
     * @return array
     **/
    protected function get_db($data_base)
    {
        $db_name = stripos($data_base, 'mariadb') === false ? 'mysql' : 'mariadb';
        return [ 
            $db_name => [
                'name'    => $db_name,
                'version' => $data_base
            ]
        ];
    }

    /**
     * Get server information
     * 
     * Convert to Local friendly format
     *
     * @param string $server
     * @return array
     **/
    protected function get_server($server)
    {
        if (empty($server)) {
            return [];
        }
        $server_divided = explode('/', $server);
        $type           = strtolower($server_divided[0]);
        $server_info    = ['name' =>  $type];
        if (count($server_divided) > 1) {
            $after_type             = explode(' ', $server_divided[1]);
            $version                = reset($after_type);
            $server_info['version'] = $version;
        }

        return [$type => $server_info];
    }

    /**
     * Iterates through file filters and apply them to the supplied file.
     *
     * @param array $file
     * @param array $state_data
     *
     * @return array
     */
    private function apply_file_filters($file, $state_data) {
        foreach ($this->file_filters as $filter) {
            if ($filter->can_filter($file, $state_data)) {
                $file = $filter->filter($file);
            }
        }

        return $file;
    }
}
