<?php

namespace DeliciousBrains\WPMDB\Common\Filesystem;

use DeliciousBrains\WPMDB\Common\FormData\FormData;
use DeliciousBrains\WPMDB\Common\MigrationPersistence\Persistence;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Sql\TableHelper;
use DeliciousBrains\WPMDB\Common\Util\Singleton;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Container;
use DeliciousBrains\WPMDB\WPMDBDI;

class Filesystem
{

	use Singleton;
	/**
	 * @var
	 */
	public $wp_filesystem;
	/**
	 * @var
	 */
	private $credentials;
	/**
	 * @var bool
	 */
	private $use_filesystem = false;
	/**
	 * @var int
	 */
	private $chmod_dir;
	/**
	 * @var int
	 */
	private $chmod_file;
	/**
	 * @var Container|null
	 */
	private $container;

    /**
     * Pass `true` when instantiating to skip using WP_Filesystem
     *
     * @param bool $force_no_fs
     */
    public function __construct()
    {
        // Set default permissions
        if (defined('FS_CHMOD_DIR')) {
            $this->chmod_dir = FS_CHMOD_DIR;
        } else {
            $this->chmod_dir = (fileperms(ABSPATH) & 0777 | 0755);
        }

        if (defined('FS_CHMOD_FILE')) {
            $this->chmod_file = FS_CHMOD_FILE;
        } else {
            $this->chmod_file = (fileperms(ABSPATH . 'index.php') & 0777 | 0644);
        }

        $this->container = WPMDBDI::getInstance();
    }

    public function register()
    {
        add_action('tools_page_wp-migrate-db-pro', [$this, 'check_for_wp_filesystem']); // Single sites
        add_action('tools_page_wp-migrate-db', [$this, 'check_for_wp_filesystem']);
        add_action('settings_page_wp-migrate-db-pro', [$this, 'check_for_wp_filesystem']); // Multisites
        add_action('settings_page_wp-migrate-db', [$this, 'check_for_wp_filesystem']);

        if (Util::is_wpmdb_ajax_call()) {
            add_action('admin_init', [$this, 'check_for_wp_filesystem']);
        }
    }

    public function check_for_wp_filesystem()
    {
        if (function_exists('request_filesystem_credentials')) {
            if ((defined('WPMDB_WP_FILESYSTEM') && WPMDB_WP_FILESYSTEM) || !defined('WPMDB_WP_FILESYSTEM')) {
                $this->maybe_init_wp_filesystem();
            }
        }
    }

    /**
     * Getter for the instantiated WP_Filesystem
     *
     * @return WP_Filesystem|false
     *
     * This should be used carefully since $wp_filesystem won't always have a value.
     */
    public function get_wp_filesystem()
    {
        if ($this->use_filesystem) {
            return $this->wp_filesystem;
        } else {
            return false;
        }
    }

    /**
     * Is WP_Filesystem being used?
     *
     * @return bool
     */
    public function using_wp_filesystem()
    {
        return $this->use_filesystem;
    }

    /**
     * Attempts to use the correct path for the FS method being used
     *
     * @param string $abs_path
     *
     * @return string
     */
    public function get_sanitized_path($abs_path)
    {
        if ($this->using_wp_filesystem()) {
            return str_replace(ABSPATH, $this->wp_filesystem->abspath(), $abs_path);
        }

        return $abs_path;
    }

    /**
     * Attempt to initiate WP_Filesystem
     *
     * If this fails, $use_filesystem is set to false and all methods in this class should use native php fallbacks
     * Thwarts `request_filesystem_credentials()` attempt to display a form for obtaining creds from users
     *
     * TODO: provide notice and input in wp-admin for users when this fails
     */
    public function maybe_init_wp_filesystem()
    {
        ob_start();
        $this->credentials = \request_filesystem_credentials('', '', false, false, null);
        $ob_contents       = ob_get_contents();
        ob_end_clean();

        if (wp_filesystem($this->credentials)) {
            global $wp_filesystem;
            $this->wp_filesystem  = $wp_filesystem;
            $this->use_filesystem = true;
        }
    }

    /**
     * Create file if not exists then set mtime and atime on file
     *
     * @param string $abs_path
     * @param int    $time
     * @param int    $atime
     *
     * @return bool
     */
    public function touch($abs_path, $time = 0, $atime = 0)
    {
        if (0 == $time) {
            $time = time();
        }
        if (0 == $atime) {
            $atime = time();
        }

		// @TODO revisit usage of error supression opearator
		$return = @touch( $abs_path, $time, $atime );

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->touch($abs_path, $time, $atime);
        }

        return $return;
    }

	/**
	 * file_put_contents with chmod
	 *
	 * @param string $abs_path
	 * @param string $contents
	 *
	 * @return bool
	 */
	public function put_contents( $abs_path, $contents ) {
		// @TODO revisit usage of error supression opearator
		$return = @file_put_contents( $abs_path, $contents );
		$this->chmod( $abs_path );

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->put_contents($abs_path, $contents, $this->chmod_file);
        }

        return (bool)$return;
    }

    /**
     * Does the specified file or dir exist
     *
     * @param string $abs_path
     *
     * @return bool
     */
    public function file_exists($abs_path)
    {
        $return = file_exists($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->exists($abs_path);
        }

        return (bool)$return;
    }

    /**
     * Get a file's size
     *
     * @param string $abs_path
     *
     * @return int
     */
    public function filesize($abs_path)
    {
        $return = filesize($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->size($abs_path);
        }

        return $return;
    }

	/**
	 * Get the contents of a file as a string
	 *
	 * @param string $abs_path
	 *
	 * @return string
	 */
	public function get_contents( $abs_path ) {
		// @TODO revisit usage of error supression opearator
		$return = @file_get_contents( $abs_path );

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->get_contents($abs_path);
        }

        return $return;
    }

	/**
	 * Delete a file
	 *
	 * @param string $abs_path
	 *
	 * @return bool
	 */
	public function unlink( $abs_path ) {
		// @TODO revisit usage of error supression opearator
		$return = @unlink( $abs_path );

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->delete($abs_path, false, false);
        }

        return $return;
    }

    /**
     * chmod a file
     *
     * @param string $abs_path
     * @param int    $perms
     *
     * @return bool
     *
     * Leave $perms blank to use $this->chmod_file/DIR or pass value like 0777
     */
    public function chmod($abs_path, $perms = null)
    {
        if (is_null($perms)) {
            $perms = $this->is_file($abs_path) ? $this->chmod_file : $this->chmod_dir;
        }

		$return = chmod( $abs_path, $perms );

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->chmod($abs_path, $perms, false);
        }

        return $return;
    }

    /**
     * Is the specified path a directory?
     *
     * @param string $abs_path
     *
     * @return bool
     */
    public function is_dir($abs_path)
    {
        $return = is_dir($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->is_dir($abs_path);
        }

        return $return;
    }

    /**
     * Is the specified path a file?
     *
     * @param string $abs_path
     *
     * @return bool
     */
    public function is_file($abs_path)
    {
        $return = is_file($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->is_file($abs_path);
        }

        return $return;
    }

    /**
     * Is the specified path readable
     *
     * @param string $abs_path
     *
     * @return bool
     */
    public function is_readable($abs_path)
    {
        $return = is_readable($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->is_readable($abs_path);
        }

        return $return;
    }

    /**
     * Is the specified path writable
     *
     * @param string $abs_path
     *
     * @return bool
     */
    public function is_writable($abs_path)
    {
        $return = is_writable($abs_path);

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);
            $return   = $this->wp_filesystem->is_writable($abs_path);
        }

        return $return;
    }

    /**
     * Recursive mkdir
     *
     * @param string $abs_path
     * @param int    $perms
     *
     * @return bool
     */
    public function mkdir($abs_path, $perms = null)
    {
        if (is_null($perms)) {
            $perms = $this->chmod_dir;
        }

		if ( $this->is_dir( $abs_path ) ) {
			$this->chmod( $abs_path, $perms );

            return true;
        }

		$mkdirp = wp_mkdir_p( $abs_path );

		if ( $mkdirp ) {
			$this->chmod( $abs_path, $perms );

            return true;
        }

		$return = mkdir( $abs_path, $perms, true );

		//WP_Filesystem fallback
		if ( ! $return && $this->use_filesystem ) {
			$abs_path = $this->get_sanitized_path( $abs_path );

            if ($this->is_dir($abs_path)) {
                return true;
            }

			$return = $this->wp_filesystem_mkdir( $abs_path, $perms );
		}

		return $return;
	}

	/**
	 * WP_Filesystem doesn't offer a recursive mkdir(), so this is that
	 *
	 * @param string   $abs_path
	 * @param int|null $perms
	 *
	 * @return string
	 */
	public function wp_filesystem_mkdir( $abs_path, $perms )
	{
		$abs_path = str_replace( '//', '/', $abs_path );
		$abs_path = rtrim( $abs_path, '/' );

		if ( empty( $abs_path ) ) {
			$abs_path = '/';
		}

		$dirs        = explode( '/', ltrim( $abs_path, '/' ) );
		$current_dir = '';

		foreach ( $dirs as $dir ) {
			$current_dir .= '/' . $dir;
			if ( !$this->is_dir( $current_dir ) ) {
				$this->wp_filesystem->mkdir( $current_dir, $perms );
			}
		}

		return $this->is_dir( $abs_path );
	}

    /**
     * Delete a directory
     *
     * @param string $abs_path
     * @param bool   $recursive
     *
     * @return bool
     */
    public function rmdir($abs_path, $recursive = false)
    {
        if (!$this->is_dir($abs_path)) {
            return false;
        }

        // taken from WP_Filesystem_Direct
        if (!$recursive) {
            $return = @rmdir($abs_path);
        } else {
            // At this point it's a folder, and we're in recursive mode
            $abs_path = trailingslashit($abs_path);
            $filelist = $this->scandir($abs_path);

            $return = true;
            if (is_array($filelist)) {
                foreach ($filelist as $filename => $fileinfo) {
                    if ('d' === $fileinfo['type']) {
                        $return = $this->rmdir($abs_path . $filename, $recursive);
                    } else {
                        $return = $this->unlink($abs_path . $filename);
                    }
                }
            }

            if (file_exists($abs_path) && !@rmdir($abs_path)) {
                $return = false;
            }
        }

        if (!$return && $this->use_filesystem) {
            $abs_path = $this->get_sanitized_path($abs_path);

            return $this->wp_filesystem->rmdir($abs_path, $recursive);
        }

        return $return;
    }

    /**
     * Get a list of files/folders under specified directory
     *
     * @param string $abs_path
     * @param int $offset
     * @param int $limit
     * @param int $scan_count
     *
     * @return array|bool|\WP_error
     */
    public function scandir($abs_path, $offset = 0, $limit = -1, &$scan_count = 0)
    {
        $symlink = is_link($abs_path);
        $dirlist = @scandir($abs_path, SCANDIR_SORT_DESCENDING);

        if (false === $dirlist || empty($dirlist)) {
            if ($this->use_filesystem) {
                $abs_path = $this->get_sanitized_path($abs_path);

                return $this->wp_filesystem->dirlist($abs_path, true, false);
            }

            return false;
        }

        if (-1 !== $limit) {
            $dirlist = array_slice($dirlist, $offset, $limit, true);
            $scan_count = count($dirlist);
        }

        $return = array();

        // normalize return to look somewhat like the return value for WP_Filesystem::dirlist
        foreach ($dirlist as $entry) {
            if ('.' === $entry || '..' === $entry) {
                continue;
            }

            $return[$entry] = $this->get_file_info($entry, $abs_path, $symlink);
        }

        return $return;
    }

    /**
     * @param string $entry
     * @param string $abs_path
     * @param bool   $symlink
     *
     * @return array
     */
    public function get_file_info($entry, $abs_path, $symlink = false )
    {
        $abs_path  = $this->slash_one_direction($abs_path);
        $full_path = trailingslashit($abs_path) . $entry;
        $real_path = realpath($full_path); // Might be different due to symlinks.

        $upload_info     = wp_get_upload_dir();
        $uploads_basedir = $upload_info['basedir'];
        $uploads_folder  = wp_basename($uploads_basedir);
        $is_uploads_in_content     = strpos($uploads_basedir, WP_CONTENT_DIR);
        $content_path              = false !== $is_uploads_in_content ? WP_CONTENT_DIR : dirname($uploads_basedir);
        $return                    = array();
        $return['name']            = $entry;
        $return['relative_path']   = str_replace($abs_path, '', $full_path);
        $return['wp_content_path'] = str_replace($this->slash_one_direction($content_path) . DIRECTORY_SEPARATOR, '', $full_path);
        $return['absolute_path']   = $full_path;
        $return['type']            = $this->is_dir($abs_path . DIRECTORY_SEPARATOR . $entry) ? 'd' : 'f';
        $return['size']            = $this->filesize($abs_path . DIRECTORY_SEPARATOR . $entry);
        $return['filemtime']       = filemtime($abs_path . DIRECTORY_SEPARATOR . $entry);

        if ($symlink) {
            $return['subpath'] = DIRECTORY_SEPARATOR . basename(dirname($real_path)) . DIRECTORY_SEPARATOR . $entry;
        } else {
            $return['subpath'] = preg_replace("#^(themes|plugins|{$uploads_folder})#", '', $return['wp_content_path']);
        }

        $exploded              = explode(DIRECTORY_SEPARATOR, $return['subpath']);
        $return['folder_name'] = isset($exploded[1]) ? $exploded[1] : $return['relative_path'];

        return $return;
    }

    /**
     * List all files in a directory recursively
     *
     * @param $abs_path
     *
     * @return array|bool
     */
    public function scandir_recursive($abs_path)
    {
        $dirlist = $this->scandir($abs_path);

        if (is_wp_error($dirlist)) {
            return $dirlist;
        }

        foreach ($dirlist as $key => $entry) {
            if ('d' === $entry['type']) {
                $current_dir  = trailingslashit($entry['name']);
                $current_path = trailingslashit($abs_path) . $current_dir;
                $contents     = $this->scandir_recursive($current_path);
                unset($dirlist[$key]);
                foreach ($contents as $filename => $value) {
                    $contents[$current_dir . $filename] = $value;
                    unset($contents[$filename]);
                }
                $dirlist += $contents;
            }
        }

        return $dirlist;
    }

	/**
	 * Light wrapper for move_uploaded_file with chmod
	 *
	 * @param string $file
	 * @param string $destination
	 * @param int    $perms
	 *
	 * @return bool
	 *
	 * TODO: look into replicating more functionality from wp_handle_upload()
	 */
	public function move_uploaded_file( $file, $destination, $perms = null ) {
		$return = move_uploaded_file( $file, $destination );

        if ($return) {
            $this->chmod($destination, $perms);
        }

        return $return;
    }

    /**
     * Copy a file
     *
     * @param string $source_abs_path
     * @param string $destination_abs_path
     * @param bool   $overwrite
     * @param mixed  $perms
     *
     * @return bool
     *
     * Taken from WP_Filesystem_Direct
     */
    public function copy($source_abs_path, $destination_abs_path, $overwrite = true, $perms = false)
    {
        // error if source file doesn't exist
        if (!$this->file_exists($source_abs_path)) {
            return false;
        }

        if (!$overwrite && $this->file_exists($destination_abs_path)) {
            return false;
        }

		// @TODO revisit usage of error supression opearator
		$return = @copy( $source_abs_path, $destination_abs_path );
		if ( $perms && $return ) {
			$this->chmod( $destination_abs_path, $perms );
		}

        if (!$return && $this->use_filesystem) {
            $source_abs_path      = $this->get_sanitized_path($source_abs_path);
            $destination_abs_path = $this->get_sanitized_path($destination_abs_path);
            $return               = $this->wp_filesystem->copy($source_abs_path, $destination_abs_path, $overwrite, $perms);
        }

        return $return;
    }

    /**
     * Move a file
     *
     * @param string $source_abs_path
     * @param string $destination_abs_path
     * @param bool   $overwrite
     *
     * @return bool
     */
    public function move($source_abs_path, $destination_abs_path, $overwrite = true)
    {
        // error if source file doesn't exist
        if (!$this->file_exists($source_abs_path)) {
            return false;
        }

        // Try using rename first. if that fails (for example, source is read only) try copy.
        // Taken in part from WP_Filesystem_Direct
        if (!$overwrite && $this->file_exists($destination_abs_path)) {
            return false;
        } elseif (rename($source_abs_path, $destination_abs_path)) {
            return true;
        } else {
            if ($this->copy($source_abs_path, $destination_abs_path, $overwrite) && $this->file_exists($destination_abs_path)) {
                $this->unlink($source_abs_path);

                return true;
            } else {
                $return = false;
            }
        }

        //@TODO clean up temp location if using the rcopy() method

        if (!$return && $this->use_filesystem) {
            $source_abs_path      = $this->get_sanitized_path($source_abs_path);
            $destination_abs_path = $this->get_sanitized_path($destination_abs_path);

            $return = $this->wp_filesystem->move($source_abs_path, $destination_abs_path, $overwrite);
        }

        return $return;
    }

    /**
     *
     * Recursively copy files, alternative to rename()
     *
     * @param $source
     * @param $dest
     *
     * @return bool
     */
    public function rcopy($source, $dest)
    {
        // @TODO should probably throw on Maintenance Mode if using this as it takes much longer to complete vs. rename()

        $this->rmdir($dest, true);
        $this->mkdir($dest, 0755);

        $return = true;

        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                if (!$this->mkdir($dest . DIRECTORY_SEPARATOR . $iterator->getSubPathName())) {
                    $return = false;
                }
            } else {
                if (!$this->copy($item, $dest . DIRECTORY_SEPARATOR . $iterator->getSubPathName())) {
                    $return = false;
                }
            }
        }

        return $return;
    }

    /**
     * Converts file paths that include mixed slashes to use the correct type of slash for the current operating system.
     *
     * @param $path string
     *
     * @return string
     */
    public function slash_one_direction($path)
    {
        return str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
    }

    function download_file()
    {
        $util         = $this->container->get(Util::class);
        $table_helper = $this->container->get(TableHelper::class);
        // don't need to check for user permissions as our 'add_management_page' already takes care of this
        $util->set_time_limit();

        $raw_dump_name = filter_input(INPUT_GET, 'download', FILTER_SANITIZE_STRIPPED);
        $dump_name     = $table_helper->format_dump_name($raw_dump_name);

        $diskfile         = $this->get_upload_info('path') . DIRECTORY_SEPARATOR . $dump_name;
        $filename         = basename($diskfile);
        $last_dash        = strrpos($filename, '-');
        $salt             = substr($filename, $last_dash, 6);
        $filename_no_salt = str_replace($salt, '', $filename);

        $backup = filter_input(INPUT_GET, 'backup', FILTER_SANITIZE_STRIPPED);

        if (file_exists($diskfile)) {
            if (!headers_sent()) {
                header('Content-Description: File Transfer');
                header('Content-Type: application/octet-stream');
                header('Content-Length: ' . $this->filesize($diskfile));
                header('Content-Disposition: attachment; filename=' . $filename_no_salt);
                readfile($diskfile);

                Persistence::cleanupStateOptions();

                if (!$backup || (int)$backup !== 1) { // Don't delete file if file was created during a local backup
                    $this->unlink($diskfile);
                }

                exit;
            } else {
                $last_error = error_get_last();
                $msg        = isset($last_error['message']) ? '<p>Error: ' . $last_error['message'] . '</p>' : '';
                wp_die(sprintf(__('<h3>Output prevented download. </h3> %s', 'wp-migrate-db'), $msg));
            }
        } else {
            wp_die(__('Could not find the file to download:', 'wp-migrate-db') . '<br>' . esc_html($diskfile));
        }
    }

    public function get_wp_upload_dir(){
        $upload_info = wp_upload_dir();

        return $upload_info['basedir'];
    }
    /**
     * Determines, sets up, and returns folder information for storing files.
     *
     * By default, the folder created will be `wp-migrate-db` and will be stored
     * inside of the `uploads` folder in WordPress' current `WP_CONTENT_DIR`,
     * usually `wp-content/uploads`
     *
     * To change the folder name of `wp-migrate-db` to something else, you can use
     * the `wpmdb_upload_dir_name` filter to change it. e.g.:
     *
     *     function upload_dir_name() {
     *        return 'database-dumps';
     *     }
     *
     *     add_filter( 'wpmdb_upload_dir_name', 'upload_dir_name' );
     *
     * If `WP_CONTENT_DIR` was set to `wp-content` in this example,
     * this would change the folder to `wp-content/uploads/database-dumps`.
     *
     * To change the entire path, for example to store these files outside of
     * WordPress' `WP_CONTENT_DIR`, use the `wpmdb_upload_info` filter to do so. e.g.:
     *
     *     function upload_info() {
     *         // The returned data needs to be in a very specific format, see below for example
     *         return array(
     *             'path' => '/path/to/custom/uploads/directory', // note missing end trailing slash
     *             'url' => 'http://yourwebsite.com/custom/uploads/directory' // note missing end trailing slash
     *         );
     *     }
     *
     *    add_filter( 'wpmdb_upload_info', 'upload_info' );
     *
     * This would store files in `/path/to/custom/uploads/directory` with a
     * URL to access files via `http://yourwebsite.com/custom/uploads/directory`
     *
     * @link https://github.com/deliciousbrains/wp-migrate-db-pro-tweaks
     *
     * @param string $type Either `path` or `url`.
     *
     * @return string The Path or the URL to the folder being used.
     */
    function get_upload_info($type = 'path')
    {
        // @TODO - Don't grab Properties class here
        $props       = WPMDBDI::getInstance()->get(Properties::class);
        $upload_info = apply_filters('wpmdb_upload_info', array());

        // No need to create the directory structure since it should already exist.
        if (!empty($upload_info)) {
            return $upload_info[$type];
        }

        $upload_dir = wp_upload_dir();

        $upload_info['path'] = $upload_dir['basedir'];
        $upload_info['url']  = $upload_dir['baseurl'];

        $upload_dir_name = apply_filters('wpmdb_upload_dir_name', 'wp-migrate-db');

        if (!file_exists($upload_dir['basedir'] . DIRECTORY_SEPARATOR . $upload_dir_name)) {
            $url = wp_nonce_url($props->plugin_base, 'wp-migrate-db-pro-nonce');

            // Create the directory.

            // TODO: Do not silence errors, use wp_mkdir_p?
            if (false === @mkdir($upload_dir['basedir'] . DIRECTORY_SEPARATOR . $upload_dir_name, 0755)) {
                return $upload_info[$type];
            }

            // Protect from directory listings by making sure an index file exists.
            $filename = $upload_dir['basedir'] . DIRECTORY_SEPARATOR . $upload_dir_name . DIRECTORY_SEPARATOR . 'index.php';
            // TODO: Do not silence errors, use WP_Filesystem API?
            if (false === @file_put_contents($filename, "<?php\r\n// Silence is golden\r\n?>")) {
                return $upload_info[$type];
            }
        }

        // Protect from directory listings by ensuring this folder does not allow Indexes if using Apache.
        $htaccess = $upload_dir['basedir'] . DIRECTORY_SEPARATOR . $upload_dir_name . DIRECTORY_SEPARATOR . '.htaccess';
        if (!file_exists($htaccess)) {
            // TODO: Do not silence errors, use WP_Filesystem API?
            if (false === @file_put_contents($htaccess, "Options -Indexes\r\nDeny from all")) {
                return $upload_info[$type];
            }
        }

        $upload_info['path'] .= DIRECTORY_SEPARATOR . $upload_dir_name;
        $upload_info['url']  .= '/' . $upload_dir_name;

        return $upload_info[$type];
    }


    function open($filename = '', $mode = 'a', $gzip = false)
    {
        $form_data_class = $this->container->get(FormData::class);
        $form_data       = $form_data_class->getFormData();

        $util = $this->container->get(Util::class);

        if ('' == $filename) {
            return false;
        }

        if ($util->gzip() && $form_data['gzip_file']) {
            $fp = gzopen($filename, $mode);
        } else {
            $fp = fopen($filename, $mode);
        }

        return $fp;
    }

    function close($fp)
    {
        $form_data_class = $this->container->get(FormData::class);
        $form_data       = $form_data_class->getFormData();
        $util            = $this->container->get(Util::class);

        if ($util->gzip() && $form_data['gzip_file']) {
            gzclose($fp);
        } else {
            fclose($fp);
        }
    }

    public function format_backup_name($file_name)
    {
        $new_name = preg_replace('/-\w{5}.sql/', '.sql', $file_name);

        return $new_name;
    }

    public function get_backups()
    {
        $backup_dir = $this->get_upload_info('path') . DIRECTORY_SEPARATOR;
        $files      = $this->scandir($backup_dir);
        $output     = [];

        if (!is_array($files) || empty($files)) {
            return false;
        }

        usort($files, function ($a, $b) {
            return $a['filemtime'] < $b['filemtime'] ? 1 : 0;
        });

        foreach ($files as $file) {
            if (!preg_match('/(.*)-(backup|migrate)-\d{14}-\w{5}(.sql|.sql.gz)$/', $file['name'])) {
                continue;
            }

            $file_name_formatted = $this->format_backup_name($file['name']);

            // Respects WordPress core options 'timezone_string' or 'gmt_offset'
            $modified = get_date_from_gmt(date('Y-m-d H:i:s', $file['filemtime']), 'M d, Y g:i a');

            $backup_info = [
                'path'         => $file['absolute_path'],
                'modified'     => $modified,
                'download_url' => WP_CONTENT_URL . DIRECTORY_SEPARATOR . $file['wp_content_path'],
                'name'         => $file_name_formatted,
                'raw_name'     => $file['name'],
            ];

            $output[] = $backup_info;
        }

        if (empty($output)) {
            return false;
        }

        return $output;
    }

    /**
     * @return array|bool|mixed|void
     */
    protected function get_active_plugins()
    {
        $active_plugins = get_option('active_plugins');

        if (is_multisite()) {
            // get active plugins for the network
            $network_plugins = get_site_option('active_sitewide_plugins');
            if ($network_plugins) {
                $network_plugins = array_keys($network_plugins);
                $active_plugins  = array_merge($active_plugins, $network_plugins);
            }
            $sites = get_sites();
            foreach($sites as $site) {
                $site_plugins = get_blog_option($site->blog_id, 'active_plugins'); 
                $active_plugins  = array_merge($active_plugins, $site_plugins);
            } 
        }

        return $active_plugins;
    }

    /**
     * @return array
     */
    public function get_plugin_paths()
    {
        $plugin_root = $this->slash_one_direction(WP_PLUGIN_DIR);

        $plugins_dir  = @opendir($plugin_root);
        $plugin_files = array();

        if ($plugins_dir) {
            while (false !== ($file = readdir($plugins_dir))) {
                if ('.' === $file[0]) {
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

    public function get_local_plugins($exclude_mdb = true)
    {
        $plugins      = get_plugins();
        $plugin_paths = $this->get_plugin_paths();

        // @TODO get MU plugins in the list as well
        $active_plugins = $this->get_active_plugins();

        $plugin_list = array();

        foreach ($plugins as $key => $plugin) {
            if ($exclude_mdb && 0 === strpos($key, 'wp-migrate-db')) {
                continue;
            }
            $base_folder = preg_replace('/\/(.*)\.php/i', '', $key);


            $plugin_path       = array_key_exists($base_folder, $plugin_paths) ? $plugin_paths[$base_folder] : false;
            $plugin_list[$key] = array(
                array(
                    'name'    => $plugin['Name'],
                    'active'  => in_array($key, $active_plugins),
                    'path'    => $plugin_path,
                    'version' => $plugin['Version'],
                ),
            );
        }

        return $plugin_list;
    }
}
