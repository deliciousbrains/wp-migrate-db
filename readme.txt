=== WP Migrate DB ===
Contributors: bradt, deliciousbrains
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC
Tags: migrate, migration, export, data dump, backup, database, mysql
Requires at least: 3.6
Tested up to: 4.9
Stable tag: 1.0.2
License: GPLv2

Migrates your database by running find & replace on URLs and file paths, handling serialized data, and saving an SQL file.

== Description ==

https://www.youtube.com/watch?v=m8oScnEK5y0

WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, handles serialized data, then allows you to save it to your computer as an SQL file. To complete the migration, you need to use a database management tool (e.g. phpMyAdmin) to import the SQL file to your database, replacing your existing database. It is perfect for developers who need to migrate fresh data from the production site to their local install, or migrate their locally developed site to a staging or production server.

WP Migrate DB handles serialized data (both arrays and objects) by unserializing the data and going through it, identifying strings and running a find & replace on them. Once it has gone through all the data, it serializes it again and sticks it back in the database.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

**PRO Version with Email Support and More Features**

* Push and pull your databases
* Find & replace that handles serialized data
* Backups
* Export your database
* Select which tables to migrate
* Filter out post types
* Exclude useless data
* Save migration profiles
* Phenomenal email support
* Stress tested on massive databases
* Solid security
* [Media Files addon](https://deliciousbrains.com/wp-migrate-db-pro/doc/media-files-addon/?utm_campaign=addons%2Binstall&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=description)
* [CLI addon](https://deliciousbrains.com/wp-migrate-db-pro/doc/cli-addon/?utm_campaign=addons%2Binstall&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting)
* [Multisite Tools addon](https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/?utm_campaign=addons%2Binstall&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=description)

[Compare pro vs free →](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting)

See the video below or [visit the web site](http://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=description) to learn more about the pro version.

https://www.youtube.com/watch?v=fHFcH4bCzmU

== Installation ==

1. Use WordPress' built-in installer
2. Access the "Migrate DB" menu option under Tools (or under Settings on multsite intallations)

== Frequently Asked Questions ==

= Why wouldn't I just use WordPress' built-in XML export/import to migrate my site? =

WP Migrate DB will migrate your entire WordPress database, WordPress' built-in tools will not. For more details, please see our blog post, [WordPress XML Export/Import vs. WP Migrate DB Pro](https://deliciousbrains.com/wordpress-xml-export-import-vs-wp-migrate-db-pro/?utm_campaign=support%2Bdocs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting).

= Will you migrate my site for me? =

Sorry, but we do not offer site migration services at the moment.

= Does the plugin support multisite? =

Yes, but the [Multisite Tools addon](https://deliciousbrains.com/wp-migrate-db-pro/doc/multisite-tools-addon/?utm_campaign=addons%2Binstall&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=faqs) for the [pro version](http://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=faqs%2Bmultisite) does a lot more with multisite like migrating a subsite as a single-site install.

= Does the plugin migrate files as well? =

No, it only operates on the database. The pro version's [Media Files addon](https://deliciousbrains.com/wp-migrate-db-pro/doc/media-files-addon/?utm_campaign=addons%2Binstall&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=faqs) allows you to migrate media files.

= Why do I end up with a wp-login.php download instead of the exported SQL file? =

It is likely you have a download manager plugin or extension installed in your web browser. You will need to disable it for the SQL download to work properly.

= Does the plugin handle serialized data? =

Yep, it will run a find &amp; replace on your serialized data and migrate it without corrupting it. See [our documentation](https://deliciousbrains.com/wp-migrate-db-pro/doc/serialized-data/?utm_campaign=support%2Bdocs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) for details.

= What are the requirements? =

They are the same as the [requirements for WP Migrate DB Pro](https://deliciousbrains.com/wp-migrate-db-pro/pricing/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=requirements#requirements.

= Do you offer email support? =

If you upgrade to [WP Migrate DB Pro](http://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=faqs%2Bemail%2Bsupport), we will gladly provide you with email support. We take pride in delivering exceptional customer support. We do not provide email support for the free version.

== Screenshots ==

1. Main screen
2. Settings tab
3. Saving the exported database

== Changelog ==

= WP Migrate DB 1.0.2 - 2017-10-25 =
* Bug fix: Some plugins causing "Invalid nonce" errors when using compatibility mode
* Bug fix: Error for invalid permissions for Exports not displaying

= WP Migrate DB 1.0.1 - 2017-09-14 =
* Bug Fix: Parse error on PHP 5.2
* Bug Fix: Row not set for `wpmdb_replace_custom_data` filter

= WP Migrate DB 1.0 - 2017-08-11 =
* New: Plugins and themes are disabled by default for HTTP requests made by WP Migrate DB Pro for better performance and compatibility
* Improvement: Page is reloaded automatically after migrations that alter the wp_options, wp_users, and wp_usermeta tables
* Improvement: Additional constants added to the diagnostic log for better debugging by our support team
* Improvement: Compatibility mode directory permission errors are now dismissable and fewer notices are displayed
* Bug Fix: Find & Replace not operating on `wp_site` and `wp_blogs` tables on multisite

= WP Migrate DB 0.9.2 - 2016-12-16 =

* Bug Fix: Fixing 500 error for exports due to missing dependency on the WPMDB_Filesystem class

= WP Migrate DB 0.9.1 - 2016-12-15 =

* Bug Fix: Tables occasionally shown as completed twice, throwing off migration progress
* Bug Fix: Backups run before find/replace operations sometimes have incorrect encoding

= WP Migrate DB 0.9 - 2016-10-20 =

* New: In-place Find &amp; Replace functionality added - a find and replace can now be run on a site's own database
* New: CLI [find-replace](https://deliciousbrains.com/wp-migrate-db-pro/doc/cli-find-replace-subcommand/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB09) subcommand added
* Improvement: Removed `font-family` declarations from stylesheets
* Improvement: Truncate WP Migrate DB Pro diagnostic log to always be < 1MB, to help with memory exhaustion errors
* Improvement: Added help tooltips for the default find and replace fields
* Improvement: Added multisite specific constants to the diagnostic log
* Improvement: "Clear Error Log" button only removes error messages and updates any changed diagnostic values
* Improvement: Total stage progress now remains visible when scrolling migration item progress
* Improvement: Show/Hide Tables setting does not persist between sessions.
* Improvement: Progress bar animations now reflect paused migration state
* Improvement: JS files now include a version number to better avoid cache issues

= WP Migrate DB 0.8 - 2016-04-12 =

* New: Migration progress UI
* New: Individual table migration progress
* New: Migration progress shown in title bar
* New: Settings tab UI
* Improvement: Adding a new find/replace row now automatically adds focus to the new "find" input
* Improvement: Compatibility with WordPress 4.5

= WP Migrate DB 0.7.2 - 2015-12-03 =

* Improvement: "Migrate" button renamed to "Export"
* Improvement: Uses WP_Filesystem instead of direct PHP filesystem functionality where possible
* Improvement: Remove Find & Replace row icon is now a little dimmer to reduce UI clutter
* Improvement: Compatibility with WordPress 4.4

= WP Migrate DB 0.7.1 - 2015-07-09 =

* Improvement: Added more diagnostic info to facilitate debugging
* Improvement: Global JS variables moved to single global object to avoid conflicts
* Bug Fix: WP Migrate DB and Pro can be activated at the same time when activating plugins in bulk or via WP-CLI
* Bug Fix: `BINARY` data not exported properly
* Bug Fix: `BIT` data not exported properly
* Bug Fix: When `post_max_size` is set to 0 (unlimited), `wpmdb_bottleneck` is broken
* Bug Fix: Saved Profiles link is broken in certain situations

= WP Migrate DB 0.7 - 2015-06-12 =

* New: [WP-CLI export subcommand](https://deliciousbrains.com/wp-migrate-db-pro/doc/cli-export-subcommand/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB07)
* New: Quick copy find textbox value to replace textbox by clicking arrow icon in between (hat tip Jonathan Perlman)
* New: Added filters to hook into find & replace routine and deal with encoded data ([example](https://github.com/deliciousbrains/wp-migrate-db-pro-tweaks/blob/master/wp-migrate-db-pro-tweaks.php#L316-L413))
* Improvement: Greatly reduced data passed through each HTTP request for better security and reliability
* Improvement: Massive overhaul of input sanitization for better security
* Improvement: Add `_mig_` prefix to wpmdb_alter_statements table
* Improvement: Cleanup wpmdb_alter_statements tables from failed migrations
* Improvement: Show dimmed remove icons in find & replace rows to indicate they can be removed
* Improvement: Dim remove icons next to saved profiles
* Improvement: Better error message when empty response received from remote server
* Improvement: Added diagnostic info to facilitate debugging and decrease time to resolution for support requests
* Improvement: Warning notice when `WP_HTTP_BLOCK_EXTERNAL` constant is set to true
* Improvement: Leave it to WordPress core to convert tables to utf8mb4
* Improvement: Workaround to fix issues with Siteground's staging environments
* Bug fix: Connection URL with space(s) in beginning failing
* Bug fix: Cancelling a gzipped Export does not remove file
* Bug fix: Unusual table names causing regular expressions to fail
* Bug fix: Preserving options not working when default subsite is not 1
* Bug fix: NAN% shown at beginning of a migration
* Bug fix: Migration progress bar is overflowing the scale, passing 100%
* Bug fix: Custom post type links broken after migration with Compatibility Mode enabled
* Bug fix: Saving a new profile does not change the URL to that saved profile URL

= WP Migrate DB 0.6.1 - 2014-10-29 =
* New: breadcrumb-style UI for saved profiles
* New: Brazilian Portugese translation
* Security: Added .htaccess to backup folder to help prevent direct downloads
* Security: False values not included in signature
* Improvement: Compatibility with TGM Plugin Activation
* Improvement: Fixed hundreds of PHP Code Sniffer warnings
* Improvement: Switch to `update_site_option()` and `get_site_option()`
* Improvement: Cleaner and more instructive error message on JSON decoding failure
* Improvement: New hooks to massage data before and after find & replace
* Improvement: Common server security rules better accommodated
* Improvement: Better compatibility with SSL on WP Engine
* Improvement: Minify all the Javascripts
* Improvement: Use PHP's DIRECTORY_SEPARATOR instead of our own constant
* Improvement: Updated tons of translation strings to be translator-friendly
* Improvement: Find &amp; replace field error messages could suggest removing the fields
* Improvement: Download button for Diagnostic Info &amp; Error Log
* Bug fix: 404 errors after successful migrations due to caching
* Bug fix: Multisite exports broken on PHP < 5.4.7
* Bug fix: Using relative paths for file includes
* Bug fix: Typing new profile name does not select "Create new profile" option
* Bug fix: Find &amp; replace field errors stick around even after removing fields
* Bug fix: `wpmdb_error_log` option is auto loading
* Bug fix: Inconsistent stripping of slashes
* Bug fix: Spinner is inconsistent with WP 3.8+ spinner
* Bug fix: Apostrophe in path not being handled
* Bug fix: Inappropriate use of `htmlentities()`
* Bug fix: The table tooltip still shows during the media files migration
* Bug fix: Import/Export issues between MySQL 5.1 and 5.5+
* Bug fix: Notice error on Updates dashboard page
* Bug fix: Signature verification error when local and remote plugins are different versions
* Bug fix: Find &amp; replace handle icon is rendering poorly
* Bug fix: PHP Notice: Undefined variable: safe_mode
* Bug fix: Fatal error: Cannot use object of type WP_Error as array in `verify_download()`

= WP Migrate DB 0.6 - 2014-08-19 =
* New: Updated the migration UI to include a detailed progress bar, time elapsed, pause and cancel buttons and more!
* New: Option to exclude transients (temporary cached data)
* New: Migration profiles
* New: Setting to configure the maximum request size (how much data is exported in a given HTTP request)
* Improvement: Unlimited find & replace fields with drag & drop reordering

= WP Migrate DB 0.5 - 2013-07-26 =
* Language support! Thanks to an awesome [pull request](https://github.com/bradt/wp-migrate-db/pull/19) from [Rafael Funchal](https://github.com/rafaelfunchal).
* New Language: Brazilian Portugese
* [Added filter for the filename of the exported file](https://github.com/bradt/wp-migrate-db/issues/16)
* Bug fix: [Spam commentmeta included when "Do not export spam comments" checked](https://github.com/bradt/wp-migrate-db/issues/18)
* Bug fix: [Fatal error method `error` does not exist](https://github.com/bradt/wp-migrate-db/issues/20)
* Bug fix: [Table names with dashes not exporting](https://github.com/bradt/wp-migrate-db/issues/15)
* Bug fix: [Find & replace is case-sensitive but shouldn't](https://github.com/bradt/wp-migrate-db/issues/13)

= WP Migrate DB 0.4.4 - 2013-05-19 =
* [Pro version has arrived!](http://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB044) Added some info to the sidebar.
* Updated required version to WordPress 3.0+
* Bug fix: [Does not handle serialized objects](https://github.com/bradt/wp-migrate-db/issues/11)
* Bug fix: [Admin menu disappears when DISALLOW_FILE_MODS is true](https://github.com/bradt/wp-migrate-db/issues/8)
* Bug fix: [Duplicate records on export](https://github.com/bradt/wp-migrate-db/issues/5)
* Bug fix: Updated spinner image for HiDPI displays

= WP Migrate DB 0.4.3 - 2012-12-18 =
* Fixed deprecated error notices when debug mode is on
* Bug fix: [Exports views as tables](https://github.com/bradt/wp-migrate-db/issues/3)
* Compatibility tested with WordPress 3.5

= WP Migrate DB 0.4.2 - 2012-09-13 =
* Moved screenshots to /assets folder and updated them to support retina
* Added sidebar including author profile and survey to gauge interest for a pro version

= WP Migrate DB 0.4.1 - 2012-08-15 =
* Removed WP App Store installer - not allowed in WP.org repo

= WP Migrate DB 0.4 - 2012-08-07 =
* New: More than 4x faster than version 0.3 due to find & replace improvements
* New: Option to turn off replacing GUIDs
* New: Option to exclude spam comments and post revisions from the export
* New: Option to save file with gzip compression
* New: Added date and time to file names
* New: Display path to SQL file on the server
* New: WP App Store installer integration
* Bug fix: Notices and warnings displayed when WP_DEBUG is on

= WP Migrate DB 0.3 - 2011-12-16 =
* Bug fix: [Null formatting error](http://plugins.trac.wordpress.org/ticket/1430)
* Bug fix: [Deprecated capability](http://plugins.trac.wordpress.org/ticket/1431)
* Bug fix: Serialized string lengths incorrect when string contains double quotes

= WP Migrate DB 0.2.2 - 2011-09-23 =
* Bug fix: [Breaks Export](http://wordpress.org/support/topic/plugin-wp-migrate-db-breaks-export?replies=1)

= WP Migrate DB 0.2.1 - 2009-12-13 =
* Moved to WordPress.org hosting

= WP Migrate DB 0.2 - 2009-04-03 =
* Moved menu link from "Settings" to "Tools"
* The random string of characters no longer appears in the filename on save.

= WP Migrate DB 0.1 - 2009-03-20 =
* First release

== Upgrade Notice ==

= 0.4 =
Runs export over 4x faster and adds some nice new features often requested. Upgrade recommended.

= 0.2.2 =
This version fixes a bug that breaks the WordPress core export feature. It is highly recommended that everyone upgrade.
