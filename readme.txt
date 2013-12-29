=== WP Migrate DB ===
Contributors: bradt
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC
Tags: database, migrate, backup, mysql
Requires at least: 2.0.3
Tested up to: 3.5
Stable tag: 0.4.3
License: GPLv2

Exports your database, does a find and replace on URLs and file paths, then allows you to save it to your computer.

== Description ==

WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer. It is perfect for developers who develop locally and need to move their Wordpress site to a staging or production server.

It even takes into account serialized data and updates the string length values.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

[**Contribute on Github**](https://github.com/bradt/wp-migrate-db)

== Installation ==

1. Use WordPress' built-in installer
2. Access the WP Migrate DB menu option under Tools

== Screenshots ==

1. Main screen
2. Saving the exported database

== Changelog ==

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
* Moved to Wordpress.org hosting

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

== Help Videos ==

Feature Walkthrough
http://www.youtube.com/watch?v=SlfSuuePYaQ
A brief walkthrough of the WP Migrate DB plugin showing all of the different options and explaining them.

Pulling Live Data Into Your Local Development Environment
http://www.youtube.com/watch?v=IFdHIpf6jjc
This screencast demonstrates how you can pull data from a remote, live WordPress install and update the data in your local development environment.

Pushing Local Development Data to a Staging Environment
http://www.youtube.com/watch?v=FjTzNqAlQE0
This screencast demonstrates how you can push a local WordPress database you've been using for development to a staging environment.
