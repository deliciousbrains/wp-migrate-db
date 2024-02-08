<?php

namespace DeliciousBrains\WPMDB\Common\Filesystem;

use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Excludes;
use DeliciousBrains\WPMDB\Common\Transfers\Files\Util;

class RecursiveScanner
{

    /**
     * Scanning bottleneck.
     */
    const BOTTLENECK = 5000;

    /**
     * @var int Current scan cycle items count.
     */
    private $scan_count = 0;

    /**
     * @var array Scanning manifest
     */
    private $manifest = [];

    /**
     * @var Filesystem
     */
    private $filesystem;

    /**
     * @var string[]
     */
    private $excludes = [];

    /**
     * @var string
     */
    private $intent;

    /**
     * @var Util
     */
    private $transfer_utils;

    public function __construct(Filesystem $filesystem, Util $transfer_utils)
    {
        $this->filesystem = $filesystem;
        $this->transfer_utils = $transfer_utils;

        $this->register();
    }

    /**
     * Registers required action hooks
     */
    public function register()
    {
        add_action('wpmdb_migration_complete', [$this, 'finalize_migration']);
        add_action('wpmdb_cancellation', [$this, 'finalize_migration']);
    }

    /**
     * Initializes manifest entry for a specific path.
     *
     * @param string $abs_path
     */
    public function initialize($abs_path)
    {
        $this->load_manifest();

        if (null === $this->get_root($abs_path)) {
            $this->build_manifest_tree($abs_path);
        }
    }

    /**
     * Recursively scans a directory contents while minding the scan bottleneck.
     *
     * @param string $abs_path
     * @param string $stage
     *
     * @return array|bool|\WP_error
     */
    public function scan($abs_path, $stage = '')
    {
        $offset = 0;

        $root = $abs_path;
        $manifest_item = $this->get_root($abs_path);
        $dir_name = '';
        //If there's a manifest item for the current path, we attempt to find a resume position.
        if (!empty($manifest_item)) {
            $resume_position = $this->get_resume_position($abs_path);
            //If there's a valid resume position we change the path and offset to that position.
            if (null !== $resume_position) {
                $abs_path = (string)key($resume_position);
                $offset = $resume_position[$abs_path]['offset'];
                if (!$this->is_root_item($abs_path)) {
                    $dir_name = $resume_position[$abs_path]['dir_name'];
                }
            } else if ($this->is_scan_complete($abs_path)) {
                //If the scan is complete for that path just return.
                return [];
            } else {
                //Otherwise keep scanning the root directory and update the offset.
                $offset = $this->get_root($abs_path)['offset'];
            }
        }

        $scan_count = 0;

        $dirlist = $this->filesystem->scandir($abs_path, $stage, $offset, $this->get_bottleneck(), $scan_count);

        if (is_wp_error($dirlist)) {
            return $dirlist;
        }

        foreach ($dirlist as $filename => $value) {
            if ($value['type'] !== 'd') {
                $dirlist[$dir_name . $filename] = $value;
                if(!empty($dir_name)) {
                    unset($dirlist[$filename]);
                }
            } else {
                //Unset directories.
                unset($dirlist[$filename]);
            }
        }

        $this->increment_scan_count($scan_count);

        //If the bottleneck isn't reached, mark the current path scan as complete.
        //And call the scan method again recursively to pickup the next resume position.
        if (!$this->reached_bottleneck()) {
            $this->update_manifest_item($abs_path, $root, 0, true);
            if (!$this->is_scan_complete($root)) {
                $dirlist += $this->scan($root, $stage);
            }
        } else {
            //Scan isn't complete, just update the offset.
            $this->update_manifest_item($abs_path, $root, $scan_count - 1);
        }

        $this->save_manifest();

        return $dirlist;
    }

    /**
     * Returns scan completion status for a specific root entry.
     *
     * @param $root
     * @return bool
     */
    public function is_scan_complete($root)
    {
        if ($this->should_exclude($root)) {
            return true;
        }

        if ($this->is_root_item($root)) {
            if (false === $this->manifest[$root]['completed']) {
                return false;
            }

            foreach ($this->manifest[$root]['children'] as $child) {
                if (false === $child['completed']) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Recursively builds a manifest tree for a specific path.
     *
     * @param $abs_path
     * @param string|null $root
     * @param string|null $dir_name
     */
    public function build_manifest_tree($abs_path, &$root = null, $dir_name = null)
    {
        $completed = $this->should_exclude($abs_path);
        $dirlist = @scandir($abs_path, SCANDIR_SORT_DESCENDING);

        if (null === $root) {
            $this->add_root_item($abs_path, 0, $completed);
            $root = $abs_path;
        } else {
            $this->add_child_item($root, $abs_path, $dir_name, 0, $completed);
        }

        foreach ($dirlist as $entry) {
            if ('.' === $entry || '..' === $entry) {
                continue;
            }

            $path = $abs_path . DIRECTORY_SEPARATOR . $entry;

            if (is_dir($path)) {
                $this->build_manifest_tree($path, $root, $dir_name . trailingslashit($entry));
            }
        }

        $this->save_manifest();
    }

    /**
     * Runs finalization actions.
     */
    public function finalize_migration()
    {
        $this->remove_scandir_manifest();
    }

    /**
     * Returns true if recursive scanning is enabled.
     *
     * @return mixed|null
     */
    public function is_enabled()
    {
        return apply_filters('wpmdb_bottleneck_dir_scan', false);
    }

    /**
     * Unsets the manifest file entry from a dir list array.
     *
     * @param $directories
     * @return mixed
     */
    public function unset_manifest_file($directories)
    {
        $manifest_index = array_search($this->get_scandir_manifest_filename(), $directories, true);
        if (false !== $manifest_index) {
            unset($directories[$manifest_index]);
        }

        return $directories;
    }

    /**
     * Returns the bottleneck status.
     *
     * @return bool
     */
    public function reached_bottleneck()
    {
        $bottleneck = apply_filters('wpmdb_recursive_scan_bottleneck', self::BOTTLENECK);
        return $this->scan_count >= $bottleneck && $this->is_enabled();
    }

    /**
     * @param string[] $excludes
     */
    public function set_excludes($excludes = []) {
        $this->excludes = $excludes;
    }

    /**
     * Sets the migration intent.
     *
     * @param string $intent
     */
    public function set_intent($intent) {
       $this->intent = $intent;
    }

    /**
     * Checks whether a manifest file exists for the current migration.
     *
     * @return bool
     */
    private function scan_manifest_exists()
    {
        return $this->filesystem->is_file($this->get_scandir_manifest_filename());
    }

    /**
     * Adds a root item to the manifest.
     *
     * @param string $abs_path
     * @param int $offset
     * @param bool $completed
     * @param array $children
     */
    private function add_root_item($abs_path, $offset = 0, $completed = false, $children = [])
    {
        if (!array_key_exists($abs_path, $this->manifest)) {
            $this->manifest[$abs_path] = ['offset' => $offset, 'completed' => $completed, 'children' => $children];
        }
    }

    /**
     * Adds a child item to a root manifest item.
     *
     * @param string $root
     * @param string $abs_path
     * @param string $dir_name
     * @param int $offset
     * @param bool $completed
     */
    private function add_child_item($root, $abs_path, $dir_name = '', $offset = 0, $completed = false)
    {
        if (array_key_exists($root, $this->manifest) && !array_key_exists($abs_path, $this->manifest[$root])) {
            $this->manifest[$root]['children'][$abs_path] = ['offset' => $offset, 'completed' => $completed, 'dir_name' => $dir_name];
        }
    }

    /**
     * Updates a manifest entry, the entry could be a root or a child. For child entries, a root must be provided.
     *
     * @param string $abs_path
     * @param null|string $root
     * @param int $offset
     * @param bool $completed
     */
    private function update_manifest_item($abs_path, $root = null, $offset = 0, $completed = false)
    {
        if (null === $root || $this->is_root_item($abs_path)) {
            $this->update_root_item($abs_path, $offset, $completed);
        } else {
            $this->update_child_item($root, $abs_path, $offset, $completed);
        }
    }

    /**
     * Updates a manifest child item.
     *
     * @param string $root
     * @param string $abs_path
     * @param int $offset
     * @param bool $completed
     */
    private function update_child_item($root, $abs_path, $offset = 0, $completed = false)
    {
        if ($this->is_root_item($root) && array_key_exists($abs_path, $this->manifest[$root]['children'])) {
            $this->manifest[$root]['children'][$abs_path]['offset'] += $offset;
            $this->manifest[$root]['children'][$abs_path]['completed'] = $completed;
        }
    }

    /**
     * Updates a manifest root item.
     *
     * @param string $abs_path
     * @param int $offset
     * @param bool $completed
     */
    private function update_root_item($abs_path, $offset = 0, $completed = false)
    {
        if ($this->is_root_item($abs_path)) {
            $this->manifest[$abs_path]['completed'] = $completed;
            $this->manifest[$abs_path]['offset'] += $offset;
        }
    }

    /**
     * Checks if a given path is a root item in the manifest.
     *
     * @param $abs_path
     * @return bool
     */
    private function is_root_item($abs_path)
    {
        return array_key_exists($abs_path, $this->manifest);
    }

    /**
     * Retrieves the root manifest item of a given path.
     *
     * @param string $abs_path
     * @return mixed|null
     */
    private function get_root($abs_path)
    {
        if ($this->is_root_item($abs_path)) {
            return $this->manifest[$abs_path];
        }
        return null;
    }

    /**
     * Returns the scan resume position from the manifest.
     * The position is the first folder that's not completely scanned.
     *
     * @param string $abs_path
     * @return array|null
     */
    private function get_resume_position($abs_path)
    {
        if (!$this->is_root_item($abs_path)) {
            return null;
        }

        $root = $this->get_root($abs_path);
        if(!$root['completed']) {
            return null;
        }

        $items = array_filter($this->manifest[$abs_path]['children'], static function ($item) {
            return false === $item['completed'];
        });

        if (!empty($items)) {
            $keys = array_keys($items);
            return [$keys[0] => current($items)];
        }

        return null;
    }

    /**
     * Retrieves the saved manifest data.
     *
     * @return mixed|false
     */
    private function get_scandir_manifest()
    {
        $file_data = $this->filesystem->get_contents($this->get_scandir_manifest_filename());
        return json_decode($file_data, true);
    }

    /**
     * Saves the current manifest.
     */
    private function save_manifest()
    {
        $manifest_filename = $this->get_scandir_manifest_filename();
        $result            = $this->filesystem->put_contents($manifest_filename, json_encode($this->manifest));

        if ( ! $result) {
            $this->transfer_utils->catch_general_error('Could not create scandir manifest.');
        }
    }

    /**
     * Returns the string name of the manifest file based on the current migration id.
     *
     * @return string|null
     */
    private function get_scandir_manifest_filename()
    {
        $remote_state = $this->intent === 'pull' ? Persistence::getRemoteStateData() : Persistence::getStateData();

        if (!isset($remote_state['form_data'])) {
            return null;
        }

        $form_data = json_decode($remote_state['form_data'], false);
        if (is_object($form_data) && property_exists($form_data, 'current_migration')) {
            return Util::get_wp_uploads_dir() . DIRECTORY_SEPARATOR . '.' . $form_data->current_migration->migration_id . '-wpmdb-scandir-manifest';
        }

        return null;
    }

    /**
     * Unlinks the manifest file.
     */
    private function remove_scandir_manifest()
    {
        $filename = $this->get_scandir_manifest_filename();
        if ($this->filesystem->is_file($filename)) {
            $this->filesystem->unlink($filename);
        }
    }

    /**
     * Loads the manifest file into the manifest property.
     */
    private function load_manifest()
    {
        if ($this->scan_manifest_exists()) {
            $this->manifest = $this->get_scandir_manifest();
        }
    }

    /**
     * Increments the scan items count.
     *
     * @param int $count
     */
    private function increment_scan_count($count)
    {
        $this->scan_count += $count;
    }

    /**
     * Returns the bottleneck value.
     *
     * @return int
     */
    private function get_bottleneck()
    {
        $bottleneck = apply_filters('wpmdb_recursive_scan_bottleneck', self::BOTTLENECK);
        return $this->is_enabled() ? $bottleneck - $this->scan_count : -1;
    }

    /**
     * Tests exclusion of a specific path.
     *
     * @param string $path
     * @return bool
     */
    private function should_exclude($path) {
        $excludes = Excludes::shouldExcludeFile($path, $this->excludes);

        return !empty($excludes['exclude']);
    }
}
