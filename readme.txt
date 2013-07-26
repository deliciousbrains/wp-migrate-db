=== WP Migrate DB ===
Contributors: bradt
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC
Tags: database, migrate, backup, mysql
Requires at least: 3.0
Tested up to: 3.6
Stable tag: 0.5
License: GPLv2

Exports your database, does a find and replace on URLs and file paths, then allows you to save it to your computer.

== Description ==

WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer. It is perfect for developers who need to update their local install with fresh data from the production site, or copy their locally developed site to a staging or production server.

It even takes into account serialized data (both arrays and objects) and updates the string length values.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

Looking to contribute some code? The project is [on Github](https://github.com/bradt/wp-migrate-db) and I'm more than happy to accept pull requests.

**\*NEW\* Pro Version with Email Support and More Features**

* Select the tables you want to migrate
* Pull production db down and replace local db
* Push local db up and replace production/staging db
* Unlimited find & replaces (free is limited to 2)
* Multisite support
* Video walkthroughs and howtos
* More frequent bug fixes and improvements
* And more features on the way!

See the video below or [visit the web site](http://deliciousbrains.com/wp-migrate-db-pro/?utm_source=wordpressorg&utm_medium=web&utm_content=faq&utm_campaign=freeplugin) to learn more about the pro version.

http://www.youtube.com/watch?v=IFdHIpf6jjc

== Installation ==

1. Use WordPress' built-in installer
2. Access the "Migrate DB" menu option under Tools

== Frequently Asked Questions ==

= Does this plugin support multisite? =

Not at this time. The Developer license of the [pro version](http://deliciousbrains.com/wp-migrate-db-pro/?utm_source=wordpressorg&utm_medium=web&utm_content=faq&utm_campaign=freeplugin) does support multisite.

= Does the plugin migrate files as well? =

No, it only operates on the database.

= Why do I end up with a wp-login.php download instead of the exported SQL file? =

It is likely you have a download manager plugin or extension installed in your web browser. You will need to disable it for the SQL download to work properly.

== Screenshots ==

1. Main screen
2. Saving the exported database

== Changelog ==

= 0.5 - 2013-07-26 =
* Language support! Thanks to an awesome [pull request](https://github.com/bradt/wp-migrate-db/pull/19) from [Rafael Funchal](https://github.com/rafaelfunchal).
* New Language: Brazilian Portugese
* [Added filter for the filename of the exported file](https://github.com/bradt/wp-migrate-db/issues/16)
* Bug fix: [Spam commentmeta included when "Do not export spam comments" checked](https://github.com/bradt/wp-migrate-db/issues/18)
* Bug fix: [Fatal error method `error` does not exist](https://github.com/bradt/wp-migrate-db/issues/20)
* Bug fix: [Table names with dashes not exporting](https://github.com/bradt/wp-migrate-db/issues/15)
* Bug fix: [Find & replace is case-sensitive but shouldn't](https://github.com/bradt/wp-migrate-db/issues/13)

= 0.4.4 - 2013-05-19 =
* [Pro version has arrived!](http://deliciousbrains.com/wp-migrate-db-pro/?utm_source=wordpressorg&utm_medium=web&utm_content=changelog&utm_campaign=freeplugin) Added some info to the sidebar.
* Updated required version to WordPress 3.0+
* Bug fix: [Does not handle serialized objects](https://github.com/bradt/wp-migrate-db/issues/11)
* Bug fix: [Admin menu disappears when DISALLOW_FILE_MODS is true](https://github.com/bradt/wp-migrate-db/issues/8)
* Bug fix: [Duplicate records on export](https://github.com/bradt/wp-migrate-db/issues/5)
* Bug fix: Updated spinner image for HiDPI displays

= 0.4.3 - 2012-12-18 =
* Fixed deprecated error notices when debug mode is on
* Bug fix: [Exports views as tables](https://github.com/bradt/wp-migrate-db/issues/3)
* Compatibility tested with WordPress 3.5

= 0.4.2 - 2012-09-13 =
* Moved screenshots to /assets folder and updated them to support retina
* Added sidebar including author profile and survey to gauge interest for a pro version

= 0.4.1 - 2012-08-15 =
* Removed WP App Store installer - not allowed in WP.org repo

= 0.4 - 2012-08-07 =
* New: More than 4x faster than version 0.3 due to find & replace improvements
* New: Option to turn off replacing GUIDs
* New: Option to exclude spam comments and post revisions from the export
* New: Option to save file with gzip compression
* New: Added date and time to file names
* New: Display path to SQL file on the server
* New: WP App Store installer integration
* Bug fix: Notices and warnings displayed when WP_DEBUG is on

= 0.3 - 2011-12-16 =
* Bug fix: [Null formatting error](http://plugins.trac.wordpress.org/ticket/1430)
* Bug fix: [Deprecated capability](http://plugins.trac.wordpress.org/ticket/1431)
* Bug fix: Serialized string lengths incorrect when string contains double quotes

= 0.2.2 - 2011-09-23 =
* Bug fix: [Breaks Export](http://wordpress.org/support/topic/plugin-wp-migrate-db-breaks-export?replies=1)

= 0.2.1 - 2009-12-13 =
* Moved to WordPress.org hosting

= 0.2 - 2009-04-03 =
* Moved menu link from "Settings" to "Tools"
* The random string of characters no longer appears in the filename on save.

= 0.1 - 2009-03-20 =
* First release

== Upgrade Notice ==

= 0.4 =
Runs export over 4x faster and adds some nice new features often requested. Upgrade recommended.

= 0.2.2 =
This version fixes a bug that breaks the WordPress core export feature. It is highly recommended that everyone upgrade.