=== WP Migrate Lite - WordPress Migration Made Easy ===
Contributors: bradt, deliciousbrains
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC
Tags: Export WordPress, Migrate WordPress, WordPress database plugin, WordPress migration plugin, WP Migrate DB
Requires at least: 5.2
Tested up to: 6.0.2
Requires PHP: 5.6
Stable tag: 2.4.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Make WordPress migration easy. Migrate your database at the click of a button with full support for serialized data.

== Description ==

WP Migrate takes the hassle out of moving your WordPress site.

https://deliciousbrains.wistia.com/medias/vahu041lkd

WP Migrate is a WordPress migration plugin that makes exporting and migrating your database easy, fast, and straightforward.

Each migration takes shape in the form of an easy to follow three-step process.

1. Find and replace the data you want directly within the WP Migrate interface.
2. Export the SQL.
3. Import into your new database using a tool such as phpMyAdmin

Simple, right? We believe that WordPress database migration doesn't have to be overly technical or opaque. Instead, WP Migrate was created with the sole aim of making WordPress site migration easy.

WP Migrate fully supports serialized data and arrays and can find and replace content within serialized arrays. What does this mean for you? It means it's far easier to migrate your database, and there's no risk of data corruption.

WP Migrate handles serialized data by unserializing the data and going through it, identifying strings and running a find & replace on them. Once it has gone through all the data, it serializes it again and sticks it back in the database.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

You're also able to run in-place find and replace, which lets you find and replace on the current database (without migration).

== Testimonials - WordPress Experts Love Us ==
We've made an impact since launching the first version of WP Migrate with over 300,000 active installs, and hundreds of 5* reviews on WordPress.org. WP Migrate is, in our opinion, the best WordPress migration plugin. Don't just take our word for it though:

*[WP Migrate] might be the most amazing thing that has happened in a really long time in the #WordPress world* - Pippin Williamson - Founder, Sandhills Development.

*Today, I give continued thanks to @dliciousbrains for migrate db pro and the ease at which it offers migrations from dev-to-and-from-staging* - Tom Mcfarlin - Senior Backend Engineer, WebDevStudios.

*How did I ever survive without [WP Migrate] before? #winning* - Jenny Beaumont - Senior Project Manager, Human Made.

== Tell me more ==

**What about if you want to migrate your site entirely, including files and media?**

When you [upgrade from WP Migrate Lite to WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting), you can move an entire WordPress site quickly and easily. Take the time spent migrating a website from hours upon hours to minutes.

[I'm sold! Show me the pro features](https://deliciousbrains.com/wp-migrate-db-pro/pricing/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting)

**What's this about upgrades and pro features?**

Glad you asked! The pro features in WP Migrate are the perfect accompaniment to any WordPress developer's toolbox. Here's what you get when you upgrade:

* Priority email support
* Push and pull databases from one environment to the other
* Push and pull media libraries from one site to another
* Push and pull theme and plugin files from one site to another
* Advanced multisite features like pushing a subsite to single site install.
* Command-line support (Use WP-CLI with WP Migrate)
* Backup your data before starting the migration.
* Targeted WordPress database migration. Select which tables to migrate and exclude post types from migrations.

And that's just the tip of the iceberg, we're always working on adding value to WP Migrate!

Find out about the [incredible value that WP Migrate brings on our website](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting), or watch the video below.

https://deliciousbrains.wistia.com/medias/5co63n4jqq

== Frequently Asked Questions  ==

= Do I have to set up my WordPress migration manually each time? =

No! WP Migrate includes what are called "Migration profiles." These profiles allow you to save your WordPress migration settings to make the process as fast as possible.

= Is WP Migrate compatible with WordPress multisite? =

The free version of WP Migrate is compatible with WordPress Multisite, however, if you [upgrade](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting), the power is turned up to 11. Migrate a single site into a multisite network, or export a subsite into a single site. You can even migrate a subsite directly from one multisite to another.

= I have a ton of spam comments on my site, can I exclude those from the migration? =

You sure can! WP Migrate allows you to exclude spam comments from any WordPress migration in a click.

= What if a plugin corrupts my WordPress migration? =

Don't worry! Since WP Migrate 1.0 and above, all plugins are put into compatibility mode, which essentially prevents them from loading for migration requests only.

Plugins can be whitelisted to run while the migration is running from a straightforward to use admin interface.

= Can I migrate my entire WordPress website with this? =

Yes! Just purchase the Developer license or better, and you'll be able to push and pull your media, plugins, and themes in addition to your database in a couple of clicks.

= Question: What format is my WordPress database exported in? =

When you run the migration, your WordPress database is export in SQL, you then save the file to your desktop and can import that via another database tool such as phpMyAdmin.

= I've always been told exporting my WordPress database is difficult, what makes this different? =

WP Migrate comes with everything you need and nothing you don't. With a friendly, easy-to-use user interface, being able to export WordPress database files reliably has never been easier.

= Can I use WP Migrate to move to new web hosting? =

Yup! You can easily export your database and import your database into your new web hosting account using a tool like phpMyAdmin or similar. Want even more power? [Upgrade](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) and simply push or pull all your media and theme/plugin files as well.

= What exactly does push/pull databases mean? =

If you're using a staging website and have a live website hosted somewhere else (like a good developer who follows best practices) then you'll make updates locally and then make those changes live.

However, your database will be out of sync between the two, at some point you'll be missing important data!

[WP Migrate makes this easy](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting). You can pull a database from live to staging, make your changes, and then push back to the live site with a click. Remember, though, this functionality is only available in WP Migrate.

= What about serialized data? Will my data remain intact? =

WP Migrate fully supports the finding and replacement of serialized data. Simply input the data you want to find, and the data you want to replace it with and let WP Migrate handle the rest.

= Will you migrate my WordPress website for me? =

We don't offer WordPress migration services at this time, but you might want to give [WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) a try. It's a WordPress migration plugin with everything you need to migrate to a new host quickly and easily. And if you find it too difficult, we have a 100% No-Risk 60-Day Money Back Guarantee so you can easily get a refund.

= Can I use the command line (WP-CLI)? =

Yes, WP Migrate includes an `export` and `find-replace` command. With the [WP Migrate Developer license](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) or better you get the CLI addon which includes an additional six commands: `push`, `pull`, `profiles`, `profile`, `setting`, and `import`. Check out [our documentation](https://deliciousbrains.com/wp-migrate-db-pro/doc/wp-cli-command/?utm_campaign=support%2Bdocs&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) for more information on our WP-CLI commands.

= Can I migrate to a new domain? =

WP Migrate is perfect for migrating to a new domain! You can use the built-in find and replace functionality to find your old site URL (domain name) in your database content and replace it with your new one.

= What are the steps to migrate my site with WP Migrate? =

Assuming you're using WP Migrate Lite, simply install the plugin. Fill in the URL(s) you'd like found and what to replace them with, and export your WordPress database, which will download an SQL file. Now access your MySQL (or MariaDB!) database using your preferred tool (like phpMyAdmin or SequelPro), import the SQL file, and you're good to go.

= Why is WP Migrate better than Updraft, Duplicator, and Search Replace DB? =

Ok, so maybe we're biased, but if you've used other tools, you'll know they can be complex to set up, and challenging to use. Not to mention, they may not work every time.

Let's look at a popular find and replace script for serialized data called Search Replace DB, with this you have to upload the script, run it manually and it doesn't have a backup option or email support.

While Updraft Plus provides a lot of functionality, it's primarily a backup plugin with a premium option for migrating your website. Compare that to WP Migrate -- the site migration tool used and recommended by professional WordPress developers.

*The Themes and Plugins [feature] for [WP Migrate] from @dliciousbrains is pure genius. So many use cases I didn't think of when they released it. Mainly: 1) Staging sites 2) Plugin support Saves me time every week.* - Clifton Griffin, Development Lead at Objectiv

Finally, Duplicator is a migration plugin that does things very differently from WP Migrate. Duplicator creates a zip file of your database and files that must be manually transferred (via FTP/SFTP) to your site's new location. This package must then be unzipped and an installer script run. These operations are all much more taxing on server resources than what WP Migratedoes and lot less smooth than WP Migrate.

= Can I clone WordPress, or duplicate WordPress using WP Migrate? =

You can! While cloning a WordPress site can be difficult, WP Migrate makes it a breeze. The same goes if you want to duplicate WordPress, which is a different way of saying the same thing. Here's a quick step by step guide.

**Step 1:** Install the plugin on the WordPress install you want to clone WordPress to.
**Step 2:** Fill in the find and replace fields within WP Migrate.
**Step 3:** Export the database.
**Step 4:** Import the database into your new site.

And it's as simple as that, your data has been cloned onto the new site, ready to go. Pssst -- If you [upgrade to WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting), it's even easier to clone your entire website, including all your media, themes, and plugins.

= Is FTP a thing of the past? =

If you [upgrade to WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting), no longer do you need to use those old clunky FTP clients. Instead, you can push and pull your plugin, theme, and media files in a click. It couldn't be simpler.

= Will this work with my hosting provider? =

WP Migrate works perfectly with all web hosting providers and even your localhost install! It's never been easier to migrate your website to a new server, update your domain, or make changes between local and staging.

= How about backing up my database? =

[WP Migrate](https://deliciousbrains.com/wp-migrate-db-pro/upgrade/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting) performs a database backup before exporting your SQL. However, if you're using WP Migrate Lite, we'd recommend using a plugin or making backups through your web hosting control panel before migrating your site.

= What support is provided? =

Limited free support is provided, and we offer dedicated priority email support for our WP Migrate license holders.

= Where can I find out about the pricing of WP Migrate? =

Find out all relevant [pricing information over on our official site](https://deliciousbrains.com/wp-migrate-db-pro/pricing/?utm_campaign=WP%2BMigrate%2BDB%2BPro&utm_source=wordpress.org&utm_medium=free%2Bplugin%2Blisting).

== Screenshots ==

1. Main screen
2. Settings tab
3. Saving the exported database

== Changelog ==
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
