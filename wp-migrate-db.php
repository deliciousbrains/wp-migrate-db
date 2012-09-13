<?php
/*
Plugin Name: WP-Migrate-DB
Plugin URI: http://wordpress.org/extend/plugins/wp-migrate-db/
Description: Exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer.
Author: Brad Touesnard
Version: 0.4.2
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
    var $fp;
    var $replaced;
    var $datetime;

    function __construct() {
        $this->errors = array();
        $this->upload_dir = ( defined('WP_CONTENT_DIR') ) ? WP_CONTENT_DIR . '/uploads' : ABSPATH . 'wp-content' . DS . 'uploads';
        $this->upload_url = ( defined('WP_CONTENT_URL') ) ? WP_CONTENT_URL . '/uploads' : get_option('siteurl') . '/wp-content/uploads';

        $this->datetime = date('YmdHis');

        $this->replaced['serialized']['count'] = 0;
        $this->replaced['serialized']['strings'] = '';
        $this->replaced['nonserialized']['count'] = 0;

        add_action( 'admin_menu', array( $this, 'admin_menu' ) );
        add_action( 'wp_ajax_poll_submission', array( $this, 'poll_submission' ) );

        $this->handle_request();
    }

    function poll_submission() {
        $response = wp_remote_post( 'http://bradt.ca/wpmdb-poll.php', array(
            'timeout' => 60,
            'body' => $_POST
        ));

        if ( is_wp_error( $response ) ) {
            echo "Error attempting to save your submission.";
        } 
        else {
            echo $response['body'];
        }

        die(); // this is required to return a proper result
    }

    function handle_request() {
        if ( !isset( $_GET['page'] ) || 'wp-migrate-db' != $_GET['page'] )
            return;

        if (isset($_POST['Submit'])) {
            $this->options_validate();
        }

        if ( empty( $this->errors ) && isset( $_POST['savefile'] ) && $_POST['savefile'] ) {
            add_action( 'admin_head-tools_page_wp-migrate-db', array( $this, 'admin_head' ) );
        }
        
        if ( isset( $_GET['download'] ) && $_GET['download']) {
            add_action( 'admin_init', array( $this, 'download_file' ) );
        }
    }

    function get_filename( $datetime, $gzip ) {
        $hash = substr( sha1( DB_PASSWORD . AUTH_SALT ), -5 );
        $filename = DB_NAME . '-migrate-' . $datetime . '-' . $hash . '.sql';
        if ( $gzip ) $filename .= '.gz';
        return $filename;
    }

    function get_nicename( $datetime, $gzip ) {
        $name = DB_NAME . '-migrate-' . $datetime . '.sql';
        if ( $gzip ) $name .= '.gz';
        return $name;
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
            <div id="icon-tools" class="icon32"><br /></div><h2>WP Migrate DB</h2>

            <div id="wpmdb-container">

            <div id="wpmdb-main">

            <?php
            if (isset($_POST['Submit'])) {
                if (empty($this->errors)) {
                    $this->fp = $this->open($this->upload_dir . DS . $this->get_filename( $this->datetime, isset( $_POST['gzipfile'] ) ) );
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
                            Your database (SQL) file has been successfully generated and 
                            saved to <br /><?php echo $this->upload_dir . DS . $this->get_filename( $this->datetime, isset( $_POST['gzipfile'] ) ); ?>.
                            <a href="<?php echo $this->upload_url, '/', $this->get_filename( $this->datetime, isset( $_POST['gzipfile'] ) ); ?>">Click
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

                $form_values['new_path'] = $form_values['new_url'] = '';
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

                <form method="post" id="migrate-form">
                    <table class="form-table">
                    <tbody>
                        <tr valign="top" class="row-old-url">
                            <th scope="row">
                                <label for="old_url">Current address (URL)</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="old_url" class="code" id="old_url" value="<?php echo htmlentities($form_values['old_url']); ?>" />
                                <?php $this->show_error('old_url'); ?>
                            </td>
                        </tr>
                        <tr valign="top" class="row-new-url">
                            <th scope="row">
                                <label for="new_url">New address (URL)</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="new_url" class="code" id="new_url" value="<?php echo htmlentities($form_values['new_url']); ?>" />
                                <?php $this->show_error('new_url'); ?>
                            </td>
                        </tr>
                        <tr valign="top" class="row-old-path">
                            <th scope="row">
                                <label for="old_path">Current file path</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="old_path" class="code" id="old_path" value="<?php echo htmlentities($form_values['old_path']); ?>" />
                                <?php $this->show_error('old_path'); ?>
                            </td>
                        </tr>
                        <tr valign="top" class="row-new-path">
                            <th scope="row">
                                <label for="new_path">New file path</label>
                            </th>
                            <td>
                                <input type="text" size="40" name="new_path" class="code" id="new_path" value="<?php echo htmlentities($form_values['new_path']); ?>" />
                                <?php $this->show_error('new_path'); ?>
                            </td>
                        </tr>
                        <tr valign="top" class="row-guids">
                            <th scope="row">Data Options</th>
                            <td>
                                <label for="replace-guids">
                                    <input id="replace-guids" type="checkbox" checked="checked" value="1" name="replaceguids"/>
                                    Replace GUIDs</label>

                                <a href="" id="replace-guids-info-link">show more</a>

                                <div id="replace-guids-info" style="display: none;">
                                    <p>
                                        Although the <a href="http://codex.wordpress.org/Changing_The_Site_URL#Important_GUID_Note" target="_blank">WordPress Codex emphasizes</a>
                                        that GUIDs should not be changed, this is limited to sites that are already live.
                                        If the site has never been live, I recommend replacing the GUIDs. For example, you may be
                                        developing a new site locally at dev.somedomain.com and want to 
                                        migrate the site live to somedomain.com.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <tr valign="top" class="row-spam">
                            <th scope="row">&nbsp;</th>
                            <td>
                                <label for="exclude-spam">
                                    <input id="exclude-spam" type="checkbox" value="1" name="exclude-spam" />
                                    Do not export spam comments
                                </label>
                            </td>
                        </tr>
                        <tr valign="top" class="row-revisions">
                            <th scope="row">&nbsp;</th>
                            <td>
                                <label for="exclude-revisions">
                                    <input id="exclude-revisions" type="checkbox" value="1" name="exclude-revisions" />
                                    Do not export post revisions
                                </label>
                            </td>
                        </tr>
                        <tr valign="top" class="row-save-file">
                            <th scope="row">File Options</th>
                            <td>
                                <label for="savefile">
                                    <input id="savefile" type="checkbox" checked="checked" value="1" name="savefile"/>
                                    Save as file to your computer
                                </label>
                            </td>
                        </tr>
                        <?php if ( $this->gzip() ) : ?>
                        <tr valign="top" class="row-gzip">
                            <th scope="row">&nbsp;</th>
                            <td>
                                <label for="gzipfile">
                                    <input id="gzipfile" type="checkbox" value="1" name="gzipfile" />
                                    Compress file with gzip
                                </label>
                            </td>
                        </tr>
                        <?php endif; ?>
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

            <div id="wpmdb-sidebar">

                <div class="author">
                    <img src="http://www.gravatar.com/avatar/e538ca4cb34839d4e5e3ccf20c37c67b?s=128&amp;d" width="64" height="64" />
                    <div class="desc">
                        <h3>Created &amp; maintained by</h3>
                        <h2>Brad Touesnard</h2>
                        <p>
                            <a href="http://profiles.wordpress.org/bradt/">Profile</a>
                            &nbsp;&nbsp;
                            <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&amp;hosted_button_id=5VPMGLLK94XJC">Donate</a>
                        </p>
                    </div>
                </div>

                <form method="post" action="http://bradt.ca/wpmdb-poll.php" class="poll">
                    <h2>PRO Version?</h2>
                    <p>
                        What if there was a PRO version of this plugin that included the following?
                    </p>

                    <ul>
                        <li>
                            One click to transmit the data to the migrated
                            site and import it. No downloading, no uploading,
                            no command line, no phpMyAdmin.
                        </li>
                        <li>
                            Automatically keep your local dev database
                            in-sync with the live production database.
                        <li>
                            1 year of updates and priority email support.
                        </li>
                    </ul>

                    <div class="field">
                        <p class="willing-copy">Is that something you'd be willing to pay for?</p>
                        <label><input type="radio" name="willing-pay" value="Yes" /> Yes</label>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <label><input type="radio" name="willing-pay" value="No" /> No</label>
                    </div>

                    <div class="yes-questions" style="display: none;">

                        <div class="field how-much">
                            <p>How much would you pay?</p>
                            $ <input type="text" name="how-much" /> USD
                        </div>

                        <div class="field notify-me">
                            <input type="checkbox" name="notify-me" value="Yes" id="notify-me" />
                            <label for="notify-me">
                                Send me an email if this thing ever gets off the ground.
                            </label>
                        </div>

                        <div class="field notify-email" style="display: none;">
                            <p>Your Email</p>
                            <?php $user = wp_get_current_user(); ?>
                            <input type="email" name="notify-email" value="<?php echo esc_attr( $user->user_email ); ?>" />
                        </div>

                    </div>

                    <div class="field comments" style="display: none;">
                        <p>Comments (optional)</p>
                        <textarea name="comments"></textarea>
                    </div>

                    <div class="field submit-button">
                        <input type="submit" class="button" value="Submit" />
                    </div>
                </form>

                <?php $url = 'http://wpappstore.com/?utm_source=plugin&amp;utm_medium=wordpress&amp;utm_campaign=wpmigratedb'; ?>
                <div class="wpas-promo">
                    <a href="<?php echo $url; ?>"><img src="<?php echo plugins_url( 'asset/img/wpappstore-logo.png', __FILE__ ); ?>" alt="WP App Store" width="220" /></a>
                    <p>
                        Purchase &amp; install themes and plugins from top brands directly from your WordPress dashboard.
                        <a href="<?php echo $url; ?>">Check&nbsp;it&nbsp;out&nbsp;&raquo;</a>
                    </p>
                </div>

            </div>

            </div>
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

    function apply_replaces( $subject, $is_serialized = false ) {
        $search = array( $_POST['old_path'], $_POST['old_url'] );
        $replace = array( $_POST['new_path'], $_POST['new_url'] );
        $new = str_replace( $search, $replace, $subject, $count );

        if ( $count ) {
            if ( $is_serialized ) {
                $this->replaced['serialized']['strings'] .= $subject . "\n";
                $this->replaced['serialized']['strings'] .= $new . "\n\n";
                $this->replaced['serialized']['count'] += $count;
            }
            else {
                $this->replaced['nonserialized']['count'] += $count;
            }
        }

        return $new;
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
				$where = '';
				if ( isset( $_POST['exclude-spam'] ) && $wpdb->comments == $table ) {
					$where = ' WHERE comment_approved != "spam"';
				} elseif ( isset( $_POST['exclude-revisions'] ) && $wpdb->posts == $table ) {
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
							if (isset( $ints[strtolower($key)] ) && $ints[strtolower($key)]) {
								// make sure there are no blank spots in the insert syntax,
								// yet try to avoid quotation marks around integers
								$value = ( null === $value || '' === $value) ? $defs[strtolower($key)] : $value;
								$values[] = ( '' === $value ) ? "''" : $value;
							} else {
								if (null === $value) {
                                    $values[] = 'NULL';
                                }
								else {
                                    if ( is_serialized( $value ) && false !== ( $data = @unserialize( $value ) ) ) {
                                        if ( is_array( $data ) ) {
                                            array_walk_recursive( $data, array( $this, 'replace_array_values' ) );
                                        }
                                        elseif ( is_string( $data ) ) {
                                            $data = $this->apply_replaces( $data, true );
                                        }

                                        $value = serialize( $data );
                                    }
                                    // Skip replacing GUID if the option is set
                                    elseif ( 'guid' != $key || isset( $_POST['replaceguids'] ) ) {
                                        $value = $this->apply_replaces( $value );
                                    }

                                    $values[] = "'" . str_replace( $search, $replace, $this->sql_addslashes( $value ) ) . "'";
                                }
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

    function replace_array_values( &$value, $key ) {
        if ( !is_string( $value ) ) return;
        $value = $this->apply_replaces( $value, true );
    }

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
        return function_exists('gzopen');
	}

	function open($filename = '', $mode = 'w') {
		if ('' == $filename) return false;
		if ($this->gzip() && isset( $_POST['gzipfile'] ))
			$fp = gzopen($filename, $mode);
		else
			$fp = fopen($filename, $mode);
		return $fp;
	}

	function close($fp) {
		if ($this->gzip() && isset( $_POST['gzipfile'] )) gzclose($fp);
		else fclose($fp);
	}

	function stow($query_line, $replace = true) {
        if ($this->gzip() && isset( $_POST['gzipfile'] )) {
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
        $datetime = preg_replace( '@[^0-9]@', '', $_GET['download'] );
        $diskfile = $this->upload_dir . DS . $this->get_filename( $datetime, isset( $_GET['gz'] ) );
        if (file_exists($diskfile)) {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Length: ' . filesize($diskfile));
            header('Content-Disposition: attachment; filename=' . $this->get_nicename( $datetime, isset( $_GET['gz'] ) ) );
            $success = readfile($diskfile);
            unlink($diskfile);
            exit;
        }
        else {
            wp_die("Could not find the file to download:<br />$diskfile.");
        }
    }

    function admin_menu() {
        if (function_exists('add_management_page')) {
            add_management_page('WP Migrate DB','WP Migrate DB','update_core','wp-migrate-db',array($this, 'options_page'));
        }

        $src = plugins_url( 'asset/css/styles.css', __FILE__ );
        wp_enqueue_style( 'wp-migrate-db-styles', $src );
        $src = plugins_url( 'asset/js/script.js', __FILE__ );
        wp_enqueue_script( 'wp-migrate-db-script', $src, array( 'jquery' ), false, true );
    }

    function admin_head() {
        $url = admin_url('tools.php?page=wp-migrate-db&download=' . urlencode( $this->datetime ) );
        if ( isset( $_POST['gzipfile'] ) ) $url .= '&gz=1';
        ?>
        <meta http-equiv="refresh" content="1;url=<?php echo $url; ?>"/>
        <?php
    }
}

function wp_migrate_db_init() {
    if ( !is_admin() ) return;

    global $wpmdb;
    $wpmdb = new WP_Migrate_DB();
}

add_action( 'init', 'wp_migrate_db_init' );
