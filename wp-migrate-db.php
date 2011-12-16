<?php
/*
Plugin Name: WP-Migrate-DB
Plugin URI: http://wordpress.org/extend/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Brad Touesnard
Version: 0.3
Author URI: http://bradt.ca/
*/

// Copyright (c) 2008 Brad Touesnard. All rights reserved.
//
// Released under the GPL license
// http://www.opensource.org/licenses/gpl-license.php
//
// **********************************************************************
// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// **********************************************************************
//
// Borrowed a bunch of code from the WP-DB-Backup plugin
// which in turn borrowed from the phpMyAdmin project.
// Thanks to both for GPL.


// Define the directory seperator if it isn't already
if (!defined('DS')) {
    if (strtoupper(substr(PHP_OS, 0, 3)) == 'WIN') {
        define('DS', '\\');
    }
    else {
        define('DS', '/');
    }
}

if ( ! defined('ROWS_PER_SEGMENT') ) {
	define('ROWS_PER_SEGMENT', 100);
}

class WP_Migrate_DB {
    var $errors;
    var $upload_dir;
    var $upload_url;
    var $filename;
	var $nicename;
    var $fp;
    var $replaced;

    function __construct() {
        $this->errors = array();
        $this->upload_dir = ( defined('WP_CONTENT_DIR') ) ? WP_CONTENT_DIR . '/uploads' : ABSPATH . 'wp-content' . DS . 'uploads';
        $this->upload_url = ( defined('WP_CONTENT_URL') ) ? WP_CONTENT_URL . '/uploads' : get_option('siteurl') . '/wp-content/uploads';

        $hash = substr( md5( md5( DB_PASSWORD ) ), -5 );
        $this->filename = DB_NAME . '-migrate-' . $hash . '.sql';
        $this->nicename = DB_NAME . '-migrate.sql';

        $this->replaced['serialized']['count'] = 0;
        $this->replaced['serialized']['strings'] = '';
        $this->replaced['nonserialized']['count'] = 0;
    }

    function options_validate() {
        if (!isset($_POST['old_url']) || !$_POST['old_url']) {
            $this->errors['old_url'] = __('Please enter the current URL.', 'wp-migrate-db');
        }

        if (!isset($_POST['new_url']) || !$_POST['new_url']) {
            $this->errors['new_url'] = __('Please enter a new URL.', 'wp-migrate-db');
        }

        if (!isset($_POST['old_path']) || !$_POST['old_path']) {
            $this->errors['old_path'] = __('Please enter the current file path.', 'wp-migrate-db');
        }

        if (!isset($_POST['new_path']) || !$_POST['new_path']) {
            $this->errors['new_path'] = __('Please enter a new file path.', 'wp-migrate-db');
        }
    }

    function show_error($key) {
        if (isset($this->errors[$key])) {
            echo '<br /><span style="color: #cc0000; font-weight: bold;">', $this->errors[$key], '</span>';
        }
    }

    function options_page() {
        ?>

        <div class="wrap">
            <h2 style="margin-bottom: 0.5em;">WP Migrate DB</h2>

            <?php
            if (isset($_POST['Submit'])) {
                $this->options_validate();

                if (empty($this->errors)) {
                    $this->fp = $this->open($this->upload_dir . DS . $this->filename);
                    $this->db_backup_header();
                    $this->db_backup();
                    $this->close($this->fp);
                }

                if (empty($this->errors)) {
                    ?>

                    <div class="message updated">

                    <?php
                    if (isset($_POST['savefile']) && $_POST['savefile']) {
                        add_action('admin_head-settings_page_wp-migrate-db', array($this, 'admin_head'));
                        ?>
                        <p>
                            Your database (SQL) file has been successfully generated.
                            Your download should begin any second.
                        </p>
                        <?php
                    }
                    else {
                        ?>
                        <p>
                            Your database (SQL) file has been successfully generated.
                            <a href="<?php echo $this->upload_url, '/', $this->filename; ?>">Click
                            here to download.</a>
                        </p>
                        <?php
                    }
                    ?>

                    </div>

                    <p>
                        <b>Non-Serialized Strings Replaced: <?php echo $this->replaced['nonserialized']['count']; ?></b><br />
                        <b>Serialized Strings Replaced: <?php echo $this->replaced['serialized']['count']; ?></b><br />
                        <textarea style="width: 100%; height: 200px;" wrap="off"><?php echo $this->replaced['serialized']['strings']; ?></textarea>
                    </p>
                    <?php
                }

                $form_values = $_POST;
            }
            else {
                $form_values['old_url'] = get_bloginfo('siteurl');

                $form_values['old_path'] = dirname(__FILE__);
                $form_values['old_path'] = str_replace(DS . 'wp-migrate-db', '', $form_values['old_path']);
                $form_values['old_path'] = realpath($form_values['old_path'] . '/../..');

                if (get_bloginfo('siteurl') != get_bloginfo('wpurl')) {
                    $wp_dir = str_replace(get_bloginfo('siteurl'), '', get_bloginfo('wpurl'));
                    $wp_dir = str_replace('/', DS, $wp_dir);
                    $form_values['old_path'] = str_replace($wp_dir, '', $form_values['old_path']);
                }
            }

            if (!isset($_POST['Submit']) || (isset($_POST['Submit']) && !empty($this->errors))) {
                if (!is_writable($this->upload_dir)) {
                    ?>

                    <div id="message" class="message error">
                        <p>
                           The directory <?php echo $this->upload_dir; ?> needs
                           to be writable.
                        </p>
                    </div>

                    <?php
                }

                if (!empty($this->errors)) {
                    ?>

                    <div id="message" class="message error">
                        <p>
                            Sorry, there were errors with your form submission.
                            Please correct them below and try again.
                        </p>
                    </div>

                    <?php
                }
                ?>

                <p>
                    WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin),
                    does a find and replace on URLs and file paths, then allows you to save
                    it to your computer. It even takes into account serialized data and updates the
                    string length values.
                </p>
                <p>
                    Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>
                </p>
                <form method="post">
                    <table class="form-table">
                    <tbody>
                        <tr valign="top">
                            <th scope="row">
                                <label for="old_url">Current address (URL)</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="old_url" class="code" id="old_url" value="<?php echo htmlentities($form_values['old_url']); ?>" />
                                <?php $this->show_error('old_url'); ?>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">
                                <label for="new_url">New address (URL)</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="new_url" class="code" id="new_url" value="<?php echo htmlentities($form_values['new_url']); ?>" />
                                <?php $this->show_error('new_url'); ?>
                            </td>
                        </tr>
                    </tbody>
                    </table>

                    <br /><br />

                    <table class="form-table">
                    <tbody>
                        <tr valign="top">
                            <th scope="row">
                                <label for="old_path">Current file path</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="old_path" class="code" id="old_path" value="<?php echo htmlentities($form_values['old_path']); ?>" />
                                <?php $this->show_error('old_path'); ?>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">
                                <label for="new_path">New file path</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="new_path" class="code" id="new_path" value="<?php echo htmlentities($form_values['new_path']); ?>" />
                                <?php $this->show_error('new_path'); ?>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">&nbsp;</th>
                            <td>
                                <label for="savefile">
                                    <input id="savefile" type="checkbox" checked="checked" value="1" name="savefile"/>
                                    Save as file to your computer
                                </label>
                            </td>
                        </tr>
                    </tbody>
                    </table>

                    <p class="submit">
                        <input class="button" type="submit" value="Export Database" name="Submit"/>
                    </p>
                </form>
                <?php
            }
            ?>
        </div>
        <?php
    }

    function replace_sql_strings($search, $replace, $subject) {
        $search_esc = mysql_real_escape_string($search);
		$replace_esc = mysql_real_escape_string($replace);

        $regex = '@s:([0-9]+):"(.*?)' . preg_quote($search_esc, '@') . '(.*?)";@';
        
		if ( preg_match_all( $regex, $subject, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				/*
				 For some reason, the ungreedy regex above is not working as
				 you'd expect ungreedy to work and is matching strings with
				 multiple serialized strings (PHP 5.3.2). So we need to to
				 isolate each.
				*/
				if ( preg_match_all( '@s:([0-9]+):"(.*?)";@', $match[0], $finds, PREG_SET_ORDER ) ) {
					foreach ( $finds as $find ) {
						if ( false === strpos( $find[0], $search_esc ) ) continue;
						
						list( $old_line, $old_strlen, $old_str) = $find;
						
						$new_str = str_replace( $search_esc, $replace_esc, $old_str);
						$new_strlen = strlen($new_str) - strlen($old_str) + $old_strlen;
		                $new_line = sprintf('s:%s:"%s";', $new_strlen, $new_str);

						$subject = str_replace($old_line, $new_line, $subject, $count);
		
						if ($count) {
							$this->replaced['serialized']['strings'] .= $old_line . "\n";
							$this->replaced['serialized']['strings'] .= $new_line . "\n\n";

					        $this->replaced['serialized']['count'] += $count;
						}
					}
				}
            }
        }

        $subject = str_replace($search_esc, $replace_esc, $subject, $count);

        $this->replaced['nonserialized']['count'] += $count;

        return $subject;
    }

	/**
	 * Taken partially from phpMyAdmin and partially from
	 * Alain Wolf, Zurich - Switzerland
	 * Website: http://restkultur.ch/personal/wolf/scripts/db_backup/

	 * Modified by Scott Merrill (http://www.skippy.net/)
	 * to use the WordPress $wpdb object
	 * @param string $table
	 * @param string $segment
	 * @return void
	 */
	function backup_table($table, $segment = 'none') {
		global $wpdb;

		$table_structure = $wpdb->get_results("DESCRIBE $table");
		if (! $table_structure) {
			$this->error(__('Error getting table details','wp-migrate-db') . ": $table");
			return false;
		}

		if(($segment == 'none') || ($segment == 0)) {
			// Add SQL statement to drop existing table
			$this->stow("\n\n");
			$this->stow("#\n");
			$this->stow("# " . sprintf(__('Delete any existing table %s','wp-migrate-db'),$this->backquote($table)) . "\n");
			$this->stow("#\n");
			$this->stow("\n");
			$this->stow("DROP TABLE IF EXISTS " . $this->backquote($table) . ";\n");

			// Table structure
			// Comment in SQL-file
			$this->stow("\n\n");
			$this->stow("#\n");
			$this->stow("# " . sprintf(__('Table structure of table %s','wp-migrate-db'),$this->backquote($table)) . "\n");
			$this->stow("#\n");
			$this->stow("\n");

			$create_table = $wpdb->get_results("SHOW CREATE TABLE $table", ARRAY_N);
			if (false === $create_table) {
				$err_msg = sprintf(__('Error with SHOW CREATE TABLE for %s.','wp-migrate-db'), $table);
				$this->error($err_msg);
				$this->stow("#\n# $err_msg\n#\n");
			}
			$this->stow($create_table[0][1] . ' ;');

			if (false === $table_structure) {
				$err_msg = sprintf(__('Error getting table structure of %s','wp-migrate-db'), $table);
				$this->error($err_msg);
				$this->stow("#\n# $err_msg\n#\n");
			}

			// Comment in SQL-file
			$this->stow("\n\n");
			$this->stow("#\n");
			$this->stow('# ' . sprintf(__('Data contents of table %s','wp-migrate-db'),$this->backquote($table)) . "\n");
			$this->stow("#\n");
		}

		if(($segment == 'none') || ($segment >= 0)) {
			$defs = array();
			$ints = array();
			foreach ($table_structure as $struct) {
				if ( (0 === strpos($struct->Type, 'tinyint')) ||
					(0 === strpos(strtolower($struct->Type), 'smallint')) ||
					(0 === strpos(strtolower($struct->Type), 'mediumint')) ||
					(0 === strpos(strtolower($struct->Type), 'int')) ||
					(0 === strpos(strtolower($struct->Type), 'bigint')) ) {
						$defs[strtolower($struct->Field)] = ( null === $struct->Default ) ? 'NULL' : $struct->Default;
						$ints[strtolower($struct->Field)] = "1";
				}
			}


			// Batch by $row_inc

			if($segment == 'none') {
				$row_start = 0;
				$row_inc = ROWS_PER_SEGMENT;
			} else {
				$row_start = $segment * ROWS_PER_SEGMENT;
				$row_inc = ROWS_PER_SEGMENT;
			}

			do {
				// don't include extra stuff, if so requested
				$excs = (array) get_option('wp_db_backup_excs');
				$where = '';
				if ( is_array($excs['spam'] ) && in_array($table, $excs['spam']) ) {
					$where = ' WHERE comment_approved != "spam"';
				} elseif ( is_array($excs['revisions'] ) && in_array($table, $excs['revisions']) ) {
					$where = ' WHERE post_type != "revision"';
				}

				if ( !ini_get('safe_mode')) @set_time_limit(15*60);
				$table_data = $wpdb->get_results("SELECT * FROM $table $where LIMIT {$row_start}, {$row_inc}", ARRAY_A);

				$entries = 'INSERT INTO ' . $this->backquote($table) . ' VALUES (';
				//    \x08\\x09, not required
				$search = array("\x00", "\x0a", "\x0d", "\x1a");
				$replace = array('\0', '\n', '\r', '\Z');
				if($table_data) {
					foreach ($table_data as $row) {
						$values = array();
						foreach ($row as $key => $value) {
							if ($ints[strtolower($key)]) {
								// make sure there are no blank spots in the insert syntax,
								// yet try to avoid quotation marks around integers
								$value = ( null === $value || '' === $value) ? $defs[strtolower($key)] : $value;
								$values[] = ( '' === $value ) ? "''" : $value;
							} else {
								if(null === $value) $values[] = 'NULL';
								else $values[] = "'" . str_replace($search, $replace, $this->sql_addslashes($value)) . "'";
							}
						}
						$this->stow(" \n" . $entries . implode(', ', $values) . ') ;');
					}
					$row_start += $row_inc;
				}
			} while((count($table_data) > 0) and ($segment=='none'));
		}

		if(($segment == 'none') || ($segment < 0)) {
			// Create footer/closing comment in SQL-file
			$this->stow("\n");
			$this->stow("#\n");
			$this->stow("# " . sprintf(__('End of data contents of table %s','wp-migrate-db'),$this->backquote($table)) . "\n");
			$this->stow("# --------------------------------------------------------\n");
			$this->stow("\n");
		}
	} // end backup_table()

	function db_backup() {
		global $table_prefix, $wpdb;

        $tables = $wpdb->get_results("SHOW TABLES", ARRAY_N);
        $tables = array_map(create_function('$a', 'return $a[0];'), $tables);

		/*
        if (is_writable($this->backup_dir)) {
			$this->fp = $this->open($this->backup_dir . $this->backup_filename);
			if(!$this->fp) {
				$this->error(__('Could not open the backup file for writing!','wp-migrate-db'));
				return false;
			}
		} else {
			$this->error(__('The backup directory is not writeable!','wp-migrate-db'));
			return false;
		}*/

		foreach ($tables as $table) {
			// Increase script execution time-limit to 15 min for every table.
			if ( !ini_get('safe_mode')) @set_time_limit(15*60);
			// Create the SQL statements
			$this->stow("# --------------------------------------------------------\n");
			$this->stow("# " . sprintf(__('Table: %s','wp-migrate-db'),$this->backquote($table)) . "\n");
			$this->stow("# --------------------------------------------------------\n");
			$this->backup_table($table);
		}

		//$this->close($this->fp);

		if (count($this->errors)) {
			return false;
		} else {
			//return $this->backup_filename;
            return true;
		}

	} //wp_db_backup

    function db_backup_header() {
		$this->stow("# " . __('WordPress MySQL database migration','wp-migrate-db') . "\n", false);
		$this->stow("# " . sprintf(__('From %s to %s','wp-migrate-db'), $_POST['old_url'], $_POST['new_url']) . "\n", false);
		$this->stow("#\n", false);
		$this->stow("# " . sprintf(__('Generated: %s','wp-migrate-db'),date("l j. F Y H:i T")) . "\n", false);
		$this->stow("# " . sprintf(__('Hostname: %s','wp-migrate-db'),DB_HOST) . "\n", false);
		$this->stow("# " . sprintf(__('Database: %s','wp-migrate-db'),$this->backquote(DB_NAME)) . "\n", false);
		$this->stow("# --------------------------------------------------------\n\n", false);
    }

	function gzip() {
        return false; //function_exists('gzopen');
	}

	function open($filename = '', $mode = 'w') {
		if ('' == $filename) return false;
		if ($this->gzip())
			$fp = gzopen($filename, $mode);
		else
			$fp = fopen($filename, $mode);
		return $fp;
	}

	function close($fp) {
		if ($this->gzip()) gzclose($fp);
		else fclose($fp);
	}

	function stow($query_line, $replace = true) {
        if ($replace) {
            $query_line = $this->replace_sql_strings($_POST['old_url'], $_POST['new_url'], $query_line);
            $query_line = $this->replace_sql_strings($_POST['old_path'], $_POST['new_path'], $query_line);
        }

        if ($this->gzip()) {
            if(! @gzwrite($this->fp, $query_line))
                $this->errors['file_write'] = __('There was an error writing a line to the backup script:','wp-db-backup') . '  ' . $query_line . '  ' . $php_errormsg;
        } else {
            if(false === @fwrite($this->fp, $query_line))
                $this->error['file_write'] = __('There was an error writing a line to the backup script:','wp-db-backup') . '  ' . $query_line . '  ' . $php_errormsg;
        }
	}

	/**
	 * Add backquotes to tables and db-names in
	 * SQL queries. Taken from phpMyAdmin.
	 */
	function backquote($a_name) {
		if (!empty($a_name) && $a_name != '*') {
			if (is_array($a_name)) {
				$result = array();
				reset($a_name);
				while(list($key, $val) = each($a_name))
					$result[$key] = '`' . $val . '`';
				return $result;
			} else {
				return '`' . $a_name . '`';
			}
		} else {
			return $a_name;
		}
	}

	/**
	 * Better addslashes for SQL queries.
	 * Taken from phpMyAdmin.
	 */
	function sql_addslashes($a_string = '', $is_like = false) {
		if ($is_like) $a_string = str_replace('\\', '\\\\\\\\', $a_string);
		else $a_string = str_replace('\\', '\\\\', $a_string);
		return str_replace('\'', '\\\'', $a_string);
	}

    function download_file() {
        set_time_limit(0);
        $diskfile = $this->upload_dir . DS . $this->filename;
        if (file_exists($diskfile)) {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Length: ' . filesize($diskfile));
            header("Content-Disposition: attachment; filename={$this->nicename}");
            $success = readfile($diskfile);
            unlink($diskfile);
            exit;
        }
        else {
            wp_die('Could not find the file to download.');
        }
    }

    function admin_menu() {
        if (function_exists('add_management_page')) {
            add_management_page('WP Migrate DB','WP Migrate DB','level_8','wp-migrate-db',array($this, 'options_page'));
        }
    }

    function admin_head() {
        $url = admin_url('tools.php?page=wp-migrate-db&download=true');
        ?>
        <meta http-equiv="refresh" content="1;url=<?php echo $url; ?>"/>
        <?php
    }
}

global $wpmdb;
$wpmdb = new WP_Migrate_DB;

if (is_admin()) {
    add_action('admin_menu', array($wpmdb, 'admin_menu'));

	if (isset($_GET['page']) && $_GET['page'] == 'wp-migrate-db') {
		if (isset($_POST['savefile']) && $_POST['savefile']) {
			add_action('admin_head-tools_page_wp-migrate-db', array($wpmdb, 'admin_head'));
		}
	
		if (isset($_GET['download']) && $_GET['download']) {
			add_action('init', array($wpmdb, 'download_file'));
		}
	}
}
?>
