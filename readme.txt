=== WP Migrate Lite - WordPress Migration Made Easy ===
Contributors: wpengine, deliciousbrains, bradt, ahmedgeek, philwebs, dalewilliams, tysonreeder, kevinwhoffman
Tags: migrate, push pull, clone, import site, export site, transfer, restore, backup, wordpress migration plugin, move site, database migration, site migration
Requires at least: 5.2
Tested up to: 6.2.2
Requires PHP: 5.6
Stable tag: 2.6.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Migrate your database. Export full sites including media, themes, and plugins. Find and replace content with support for serialized data.

== Description ==

[WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/?utm_source=wordpress.org&utm_medium=referral&utm_campaign=wp-migrate-readme&utm_content=first-description-link) is a WordPress migration plugin that makes migrating your database and exporting full sites easy, fast, and stress-free.

https://deliciousbrains.wistia.com/medias/vahu041lkd

== WP Migrate Lite Features ==

**Database Migrations**

WP Migrate Lite can help move your WordPress database using an easy-to-follow three-step process.

1. Find and replace content directly within the user interface.
2. Export the SQL.
3. Import into your new database using a tool such as phpMyAdmin.

Simple, right? WordPress database migrations shouldn’t have to be overly complicated or cumbersome. With WP Migrate Lite, database transfers become so much easier.

**Full-Site Exports**

WP Migrate Lite can now [export your entire site](https://deliciousbrains.com/wp-migrate-db-pro/doc/full-site-exports/?utm_source=wordpress.org&utm_medium=referral&utm_campaign=wp-migrate-readme&utm_content=full-site-exports), including the database, media uploads, themes, plugins, and other files required to create an exact copy of your site in a new environment. In the same friendly interface you know, you can configure your export, choose what you want to include or exclude, and then single-click your way to a downloadable ZIP file of your complete site. A perfect solution for simple migrations and site copying.

**Import to Local**

Thanks to our good friends at WP Engine, [Local](https://localwp.com/?utm_source=migrate-wp-plugin-repo&utm_medium=wpmigrate&utm_campaign=local&utm_content=local-cta)—the #1 local WordPress development tool—can now [import full-site ZIP archives](https://deliciousbrains.com/wp-migrate-db-pro/doc/importing-wordpress-local-development-environment/?utm_source=wordpress.org&utm_medium=referral&utm_campaign=wp-migrate-readme&utm_content=import-to-local) that have been exported using WP Migrate. Simply drag and drop the downloaded ZIP file into Local and you’re up and running with a complete copy of your site in minutes.

**Find & Replace**

WP Migrate can find and replace content anywhere in your WordPress database with support for serialized data. This makes it easier to migrate your database without risk of corruption.

WP Migrate handles serialized data by first unserializing it, identifying individual strings, and replacing any matches with your desired content. Once this process is complete, the data is once again serialized and placed back in the database.

Example: `s:5:"hello"` becomes `s:11:"hello world"`

You can also run a find and replace on the current database even if you have no plans to migrate it.

**Database Backups**

WP Migrate can automatically back up your database before running a find and replace operation or on demand as needed.

== Testimonials ==

We've made an impact since launching the first version of WP Migrate with over 300,000 active installs and hundreds of five-star reviews on WordPress.org. WP Migrate is, in our opinion, the best WordPress migration plugin. Don't just take our word for it though:

*[WP Migrate] might be the most amazing thing that has happened in a really long time in the #WordPress world* - Pippin Williamson - Founder, Sandhills Development.

*Today, I give continued thanks to @dliciousbrains for migrate db pro and the ease at which it offers migrations from dev-to-and-from-staging* - Tom Mcfarlin - Senior Backend Engineer, WebDevStudios.

*How did I ever survive without [WP Migrate] before? #winning* - Jenny Beaumont - Senior Project Manager, Human Made.

== Migrate More with WP Migrate Pro ==

If you’re in need of a complete, reliable, and fast push/pull site migration solution with fine-tuned control over the database, media uploads, themes, plugins, and other wp-content files, then WP Migrate Pro is for you.

The pro features in WP Migrate fit perfectly into any WordPress developer’s toolbox. Here’s what you get when you upgrade:

* Priority email support.
* Push and pull migrations that move the database, themes, plugins, media uploads, and other wp-content files directly between two WordPress sites.
* Advanced multisite features like pushing a subsite to single-site install.
* WP-CLI integration for running migrations from the command line.
* Backup your data before starting the migration.
* Targeted WordPress database migration. Select which tables to migrate and exclude post types from migrations.
* And that’s just the tip of the iceberg. We’re always working on adding value to WP Migrate!

All of these features and more are yours when you [upgrade to WP Migrate Pro](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_source=wordpress.org&utm_medium=referral&utm_campaign=wp-migrate-readme&utm_content=upgrade-to-pro).

https://deliciousbrains.wistia.com/medias/5co63n4jqq

== Frequently Asked Questions  ==

= Do I have to manually set up my WordPress migration every time? =

No, WP Migrate uses "migration profiles" that allow you to save your WordPress migration settings to make the process as fast as possible.

= Is WP Migrate compatible with WordPress multisite? =

Yes, WP Migrate is compatible with multisites. With the Lite version, you can export, back up, and run find and replace operations across the entire multisite network. Upgrading to WP Migrate Pro opens up new possibilities for migrating single sites into or out of multisite networks. You can even migrate a subsite directly from one multisite to another.

= Can I exclude spam comments from the migration? =

You sure can! WP Migrate allows you to exclude spam comments from any WordPress migration in a click.

= Will other plugins affect my WordPress migration? =

Don't worry! By default, WP Migrate places all plugins into compatibility mode during a migration, which prevents them from loading for migration requests only.

Specific plugins can be enabled to run during a migration using a straightforward admin interface.

= Can I use the command line (WP-CLI)? =

Yes, WP Migrate Lite includes `export` and `find-replace` commands. Qualifying licenses of WP Migrate Pro include even more [WP-CLI commands](https://deliciousbrains.com/wp-migrate-db-pro/doc/wp-cli-command/?utm_source=wordpress.org&utm_medium=referral&utm_campaign=wp-migrate-readme&utm_content=wp-cli-commands) to push, pull, import, and manage settings from the command line.

== Screenshots ==

1. Migrate actions
2. Migration profile
3. Database panel
4. Media Uploads panel
5. Themes panel
6. Plugins panel
7. Find & Replace
8. Backups
9. Migration complete
10. Saved migration profiles

== Changelog ==

= WP Migrate 2.6.8 - 2023-07-10 =
* Improvement: PHP 8.2 and WP Migrate are now compatible

= WP Migrate 2.6.7 - 2023-06-01 =
* Bug Fix: All-In-One Security and WP Migrate are now more compatible as a result of skipping the `stacktrace` column in the `aiowps_audit_log` table during find and replace operations

= WP Migrate 2.6.6 - 2023-05-18 =
* Bug Fix: Exports are now compatible with PHP 8.1+

= WP Migrate 2.6.5 - 2023-04-25 =
* Bug Fix: Migrations no longer cause PHP notices when a file path is null

= WP Migrate 2.6.4 - 2023-04-06 =
* Improvement: Easy Updates Manager and WP Migrate are now more compatible as a result of skipping the `eum_logs` table
* Bug Fix: Migrations no longer cause PHP warnings that mention an “undefined array key”

= WP Migrate 2.6.3 - 2023-02-28 =
* Bug Fix: Reverted a change from 2.6.2 that inadvertently caused profiles with `all post types` selected to behave as if no post types were selected

= WP Migrate 2.6.2 - 2023-02-28 =
* Improvement: Domain and path values are once again pre-populated when exporting the database after being temporarily removed in version 2.6.0
* Bug Fix: Deselected tables are no longer included in the migration

= WP Migrate 2.6.1 - 2023-02-01 =
* Improvement: Duplicator is now more compatible as a result of skipping references in the `duplicator_packages` table
* Improvement: Windows servers and WAMP are now more compatible due to consistent handling of file paths
* Bug Fix: Export file downloads no longer cause PHP warnings and notices
* Bug Fix: Non-alphanumeric characters no longer break exported file downloads
* Bug Fix: Media uploads date picker styles are no longer broken

= WP Migrate 2.6.0 - 2023-01-19 =
* New: Full-site exports including the database and files are now available to all users
* New: Exported ZIP archives are now compatible with drag-and-drop importing to Local
* New: Highlights from recent releases are now communicated through the What’s New tab
* Improvement: Exports can now be performed without defining the URL or Path
* Improvement: CLI exports can once again accept paths with slashes so an export can be saved to a directory that is different from where the command is executed
* Bug Fix: Large export file downloads no longer cause errors

= WP Migrate 2.5.0 - 2022-11-22 =
* Improvement: Doctrine Cache is no longer a dependency
* Bug Fix: HTML entities in profile names are now rendered correctly

= WP Migrate 2.4.2 - 2022-10-21 =
* Bug Fix: Limited file permissions outside of the `uploads` directory no longer prevent find and replace operations on hosts like Pantheon
* Bug Fix: Empty custom pairs are no longer processed during find and replace operations

= WP Migrate 2.4.1 - 2022-10-12 =
* Bug Fix: Find and replace via CLI is now more compatible with PHP 8 and above

= WP Migrate 2.4.0 - 2022-09-22 =
* Improvement: Temporary tables and directories are now cleaned up after migration failure
* Improvement: Re-rendering of the user interface is now optimized
* Improvement: Settings sliders are now more accessible
* Improvement: Migration complete modal is now more accessible

= WP Migrate 2.3.3 - 2022-08-12 =
* Improvement: Settings sliders now have a visible focus style and improved keyboard accessibility
* Improvement: Error log messages now provide additional context about the migration to assist our support team

= WP Migrate 2.3.2 - 2022-07-11 =
* Bug Fix: Activating or upgrading WP Migrate Lite no longer results in the following error: “The plugin does not have a valid header.”

= WP Migrate 2.3.1 - 2022-05-19 =
* Bug Fix: WP Migrate no longer initializes on pages outside of WP Admin in order to improve front-end performance

= WP Migrate 2.3.0 - 2022-03-30 =
* New: “WP Migrate DB” is now “WP Migrate Lite”
* New: CLI commands now support `migrate` base command as an alias of `migratedb`
* Improvement: CLI exports no longer require find/replace arguments
* Improvement: Notices are now styled to reflect their state (success, error, warning, or information)

= WP Migrate 2.2.2 - 2022-01-11 =
* Bug Fix: Opening Find & Replace no longer results in a JavaScript error when SCRIPT_DEBUG is true
* Bug Fix: Custom Find & Replace URL for exports no longer includes the protocol
* Bug Fix: Altered unsaved profiles can now be saved

= WP Migrate 2.2.1 - 2021-11-09 =
* Bug Fix: WP Migrate DB profiles can now be re-saved without requiring a page refresh

= WP Migrate 2.2.0 - 2021-10-18 =
* New: Find & Replace tool now includes an option to preview changes before applying them to the database
* Improvement: Keyboard navigation is now more accessible thanks to new focus styles throughout the plugin
* Bug Fix: WP Migrate DB is now more compatible with other plugins that use Composer's autoloader and have dependencies with the same name

= WP Migrate 2.1.2 - 2021-08-30 =
* Improvement - Accessibility: Better support for `Skip to main content` keyboard navigation.

= WP Migrate 2.1.1 - 2021-08-18 =
* Improvement: Migrations can now be run on sites that use the default permalink structure
* Bug fix: PHP fatal error when running find and replace on a serialized unclonable object
* Bug fix: PHP notices during an existing find and replace related to the addition of regex support

= WP Migrate 2.1 - 2021-08-04 =
* New: Case-sensitive custom find and replace
* Improvement: Show a notice when the REST API is disabled or inaccessible

= WP Migrate 2.0.2 - 2021-06-17 =
* Improvement: "Search & Replace" updated to "Find & Replace" for consistency
* Bug fix: Some PHP files can be directly accessed in a browser
* Bug fix: Rewrite rules lost after migration

= WP Migrate 2.0.1 - 2021-05-06 =
* Bug fix: Replacing a string with nothing not supported
* Bug fix: Plugin not working on sites with a custom REST API URL
* Bug fix: Plugin not working on sites with a custom plugin directory
* Bug fix: 'gmdateI18n' function not available on older versions of WordPress
* Bug fix: Javascript file with tilde in filename blocked by some firewalls

= WP Migrate 2.0 - 2021-04-28 =
* New: Brand new user interface powered by React. [Read the release post](https://deliciousbrains.com/wp-migrate-db-pro-2-0-released/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB20)
* New: Automatically save the last 10 migrations
* New: Ability to rename profiles from the profiles tab
* New: Added 'wpmdb_replace_json_encode_flags' filter for modifying how data is JSON-encoded during a search/replace

= WP Migrate 1.0.17 - 2021-02-03  =

* Bug fix: Deprecated PHP code causes warnings in PHP 8+
* Bug fix: Regex to match recursive serialized records matches non-serialized data
* Bug fix: Invert selection UI option doesn't work on newer versions of WordPress
* Improvement: Fix several styling issues
* Improvement: Replace ANSI quotes with backticks for better MySQL compatibility

= WP Migrate 1.0.16 - 2020-09-14  =

* Bug fix: Find & Replace migrations do not replace data that is JSON encoded
* Bug fix: The `Filesystem::chmod()` method does not function correctly and silently logs an error
* Bug fix: Running a migration without find and replace values throws a PHP warning

= WP Migrate 1.0.15 - 2020-07-30  =
* Bug fix: Check boxes are not saved correctly in plugin settings

= WP Migrate 1.0.14 - 2020-07-28  =
* Bug fix: Invalid $_POST values are returned in plain text which is a cross site scripting (XSS) risk

= WP Migrate 1.0.13 - 2020-03-17  =
* Bug fix: Usage of `get_magic_quotes_gpc()` triggers a warning on PHP 7.4+
* Bug fix: WordPress `home` and `site_url` values are set incorrectly on multisite installs with the 'ms_files_rewriting' option set
* Bug fix: PHP warning during JSON find & replace if search or replace value is empty

= WP Migrate 1.0.12 - 2020-02-26  =
* Bug fix: Sanitize $_GET parameter when triggering download for export
* Bug fix: Sanitize $_GET parameter when downloading backup file
* Bug fix: Call to undefined end_ajax() method
* Bug fix: Use of PHP compact() function not working with PHP 7.3+
* Bug fix: Search & replace did not work with JSON encoded content in the `wp_posts` table

= WP Migrate 1.0.11 - 2019-04-30  =
* Bug fix: `WP_Filesystem` initialized on all wp-admin pages

= WP Migrate 1.0.10 - 2019-02-12  =
* Improvement: Compatibility with MySQL 8
* Improvement: UI Updates

= WP Migrate 1.0.9 - 2019-01-29  =
* Bug fix: Bit fields with a value of NULL are handled incorrectly
* Improvement: Major refactor to remove third-party dependency injection container

= WP Migrate 1.0.8 - 2018-11-29  =
* Bug fix: WordPress filesystem class not correctly loaded and causes 500 error
* Improvement: Remove deprecated PHP code making PHP 7+ compatibility checks pass

= WP Migrate 1.0.7 - 2018-11-21  =
* Bug fix: WP Migrate DB Anonymization plugin no longer functions
* Bug fix: 500 errors occur when another plugin is installed that includes Composer
* Improvement: Add Theme & Plugin Files Addon to addons list
* Improvement: Remove un-needed template files

= WP Migrate 1.0.6 - 2018-11-19  =
* New: Increased PHP version requirement from PHP 5.2+ to PHP 5.4+
* Improvement: Major reorganization of the PHP code into better classes and a better folder structure

= WP Migrate 1.0.5 - 2018-11-09  =
* New: Updated YouTube video in migration progress modal
* Bug fix: Duplicate JavaScript causes console error

= WP Migrate 1.0.4 - 2018-09-13  =
* Bug fix: Overall progress bar spins when font-awesome loaded

= WP Migrate 1.0.3 - 2018-09-10  =
* Bug fix: Usage of static keyword errors in PHP 5.2.4

= WP Migrate 1.0.2 - 2017-10-25 =
* Bug fix: Some plugins causing "Invalid nonce" errors when using compatibility mode
* Bug fix: Error for invalid permissions for Exports not displaying

= WP Migrate 1.0.1 - 2017-09-14 =
* Bug Fix: Parse error on PHP 5.2
* Bug Fix: Row not set for `wpmdb_replace_custom_data` filter

= WP Migrate 1.0 - 2017-08-11 =
* New: Plugins and themes are disabled by default for HTTP requests made by WP Migrate for better performance and compatibility
* Improvement: Page is reloaded automatically after migrations that alter the wp_options, wp_users, and wp_usermeta tables
* Improvement: Additional constants added to the diagnostic log for better debugging by our support team
* Improvement: Compatibility mode directory permission errors are now dismissable and fewer notices are displayed
* Bug Fix: Find & Replace not operating on `wp_site` and `wp_blogs` tables on multisite

= WP Migrate 0.9.2 - 2016-12-16 =

* Bug Fix: Fixing 500 error for exports due to missing dependency on the WPMDB_Filesystem class

= WP Migrate 0.9.1 - 2016-12-15 =

* Bug Fix: Tables occasionally shown as completed twice, throwing off migration progress
* Bug Fix: Backups run before find/replace operations sometimes have incorrect encoding

= WP Migrate 0.9 - 2016-10-20 =

* New: In-place Find &amp; Replace functionality added - a find and replace can now be run on a site's own database
* New: CLI [find-replace](https://deliciousbrains.com/wp-migrate-db-pro/doc/cli-find-replace-subcommand/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB09) subcommand added
* Improvement: Removed `font-family` declarations from stylesheets
* Improvement: Truncate WP Migrate diagnostic log to always be < 1MB, to help with memory exhaustion errors
* Improvement: Added help tooltips for the default find and replace fields
* Improvement: Added multisite specific constants to the diagnostic log
* Improvement: "Clear Error Log" button only removes error messages and updates any changed diagnostic values
* Improvement: Total stage progress now remains visible when scrolling migration item progress
* Improvement: Show/Hide Tables setting does not persist between sessions.
* Improvement: Progress bar animations now reflect paused migration state
* Improvement: JS files now include a version number to better avoid cache issues

= WP Migrate 0.8 - 2016-04-12 =

* New: Migration progress UI
* New: Individual table migration progress
* New: Migration progress shown in title bar
* New: Settings tab UI
* Improvement: Adding a new find/replace row now automatically adds focus to the new "find" input
* Improvement: Compatibility with WordPress 4.5

= WP Migrate 0.7.2 - 2015-12-03 =

* Improvement: "Migrate" button renamed to "Export"
* Improvement: Uses WP_Filesystem instead of direct PHP filesystem functionality where possible
* Improvement: Remove Find & Replace row icon is now a little dimmer to reduce UI clutter
* Improvement: Compatibility with WordPress 4.4

= WP Migrate 0.7.1 - 2015-07-09 =

* Improvement: Added more diagnostic info to facilitate debugging
* Improvement: Global JS variables moved to single global object to avoid conflicts
* Bug Fix: WP Migrate DB and Pro can be activated at the same time when activating plugins in bulk or via WP-CLI
* Bug Fix: `BINARY` data not exported properly
* Bug Fix: `BIT` data not exported properly
* Bug Fix: When `post_max_size` is set to 0 (unlimited), `wpmdb_bottleneck` is broken
* Bug Fix: Saved Profiles link is broken in certain situations

= WP Migrate 0.7 - 2015-06-12 =

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

= WP Migrate 0.6.1 - 2014-10-29 =
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

= WP Migrate 0.6 - 2014-08-19 =
* New: Updated the migration UI to include a detailed progress bar, time elapsed, pause and cancel buttons and more!
* New: Option to exclude transients (temporary cached data)
* New: Migration profiles
* New: Setting to configure the maximum request size (how much data is exported in a given HTTP request)
* Improvement: Unlimited find & replace fields with drag & drop reordering

= WP Migrate 0.5 - 2013-07-26 =
* Language support! Thanks to an awesome [pull request](https://github.com/bradt/wp-migrate-db/pull/19) from [Rafael Funchal](https://github.com/rafaelfunchal).
* New Language: Brazilian Portugese
* [Added filter for the filename of the exported file](https://github.com/bradt/wp-migrate-db/issues/16)
* Bug fix: [Spam commentmeta included when "Do not export spam comments" checked](https://github.com/bradt/wp-migrate-db/issues/18)
* Bug fix: [Fatal error method `error` does not exist](https://github.com/bradt/wp-migrate-db/issues/20)
* Bug fix: [Table names with dashes not exporting](https://github.com/bradt/wp-migrate-db/issues/15)
* Bug fix: [Find & replace is case-sensitive but shouldn't](https://github.com/bradt/wp-migrate-db/issues/13)

= WP Migrate 0.4.4 - 2013-05-19 =
* [Pro version has arrived!](http://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=changelogs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting&utm_content=MDB044) Added some info to the sidebar.
* Updated required version to WordPress 3.0+
* Bug fix: [Does not handle serialized objects](https://github.com/bradt/wp-migrate-db/issues/11)
* Bug fix: [Admin menu disappears when DISALLOW_FILE_MODS is true](https://github.com/bradt/wp-migrate-db/issues/8)
* Bug fix: [Duplicate records on export](https://github.com/bradt/wp-migrate-db/issues/5)
* Bug fix: Updated spinner image for HiDPI displays

= WP Migrate 0.4.3 - 2012-12-18 =
* Fixed deprecated error notices when debug mode is on
* Bug fix: [Exports views as tables](https://github.com/bradt/wp-migrate-db/issues/3)
* Compatibility tested with WordPress 3.5

= WP Migrate 0.4.2 - 2012-09-13 =
* Moved screenshots to /assets folder and updated them to support retina
* Added sidebar including author profile and survey to gauge interest for a pro version

= WP Migrate 0.4.1 - 2012-08-15 =
* Removed WP App Store installer - not allowed in WP.org repo

= WP Migrate 0.4 - 2012-08-07 =
* New: More than 4x faster than version 0.3 due to find & replace improvements
* New: Option to turn off replacing GUIDs
* New: Option to exclude spam comments and post revisions from the export
* New: Option to save file with gzip compression
* New: Added date and time to file names
* New: Display path to SQL file on the server
* New: WP App Store installer integration
* Bug fix: Notices and warnings displayed when WP_DEBUG is on

= WP Migrate 0.3 - 2011-12-16 =
* Bug fix: [Null formatting error](http://plugins.trac.wordpress.org/ticket/1430)
* Bug fix: [Deprecated capability](http://plugins.trac.wordpress.org/ticket/1431)
* Bug fix: Serialized string lengths incorrect when string contains double quotes

= WP Migrate 0.2.2 - 2011-09-23 =
* Bug fix: [Breaks Export](http://wordpress.org/support/topic/plugin-wp-migrate-db-breaks-export?replies=1)

= WP Migrate 0.2.1 - 2009-12-13 =
* Moved to WordPress.org hosting

= WP Migrate 0.2 - 2009-04-03 =
* Moved menu link from "Settings" to "Tools"
* The random string of characters no longer appears in the filename on save.

= WP Migrate 0.1 - 2009-03-20 =
* First release

== Upgrade Notice ==

= 0.4 =
Runs export over 4x faster and adds some nice new features often requested. Upgrade recommended.

= 0.2.2 =
This version fixes a bug that breaks the WordPress core export feature. It is highly recommended that everyone upgrade.
