=== WP Migrate DB ===
Contributors: bradt
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC
Tags: database, migrate, backup, mysql
Requires at least: 2.0.3
Tested up to: 3.2
Stable tag: 0.2.2

Exports your database, does a find and replace on URLs and file paths, then allows you to save it to your computer.

== Description ==

WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer. It is perfect for developers who develop locally and need to to move their Wordpress site to a staging or production server.

It even takes into account serialized data and updates the string length values.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

== Installation ==

1. Download wp-migrate-db.&lt;version&gt;.zip
2. Unzip the archive
3. Upload the wp-migrate-db folder to your wp-content/plugins directory
4. Activate the plugin through the WordPress admin interface
5. Access the WP Migrate DB menu option in Settings

Enjoy!

== Screenshots ==

1. Main screen
2. Saving the exported database

== Changelog ==

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

= 0.2.2 =

This version fixes a bug that breaks the WordPress core export feature. It is highly recommended that everyone upgrade.