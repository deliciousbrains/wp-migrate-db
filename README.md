#WP Migrate DB
WP Migrate DB eliminates the manual work of migrating a WP database. Copy your db from one WP install to another with a single-click in your dashboard. Especially handy for syncing a local development database with a live site.

Donate [here](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC) to support [bradt](https://github.com/bradt), the original author of [WP Migrate DB](https://github.com/bradt/wp-migrate-db). And check out [WP Migrate DB Pro](https://deliciousbrains.com/wp-migrate-db-pro/pricing/) for a variant of the plugin that has dedicated customer support.

<p align="center"><a><img src="https://raw.github.com/slang800/psychic-ninja/master/wp-migrate-db.png"/></a></p>

##Description
WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer, or send it directly to another WordPress instance. It is perfect for developers who develop locally and need to move their WordPress site to a staging or production server.

###Pull: Quickly Replace a Local DB with a Remote DB
Let's say you're developing locally but need the latest data from the live database. With WP Migrate DB installed on both sites, you can quickly and easily pull the live database down and replace your local database with a few clicks.

###Push: Easily Replace a Remote DB with a Local DB
Let's say you have a new feature to add to a site that's been live for a while. You pull down a fresh copy of the live database and start hacking. When the feature is complete, you push your local database to the staging site with your changes so the client can review before making the feature live. How's that for a workflow?

###Save Time with Automatic Find & Replace
When migrating a WordPress site, URLs in the content, widgets, menus, etc need to be updated to the new site's URL. Doing this manually is annoying, time consuming, and can be very frustrating when dealing with serialized data (like widgets). WP Migrate DB does all of this for you.

###Convenient Database Export
In addition to pulling & pushing, in just a couple of clicks you can save an SQL file of your database to your computer. No need to drop into ssh or phpMyAdmin.

###Select the Tables You Want to Migrate
WP Migrate DB gives you control over which database tables are migrated. Have a huge stats table you'd rather not migrate? Deselect it. Easy.

###Stress Tested on Massive Databases
Have a huge database? No problem. We've tested migration of tables with over 100MB of data.

###Intelligently Detects Environment Limitations
WP Migrate DB analyses both the remote and local environments to detect limitations and optimize performance. For example, we detect MySQL's `max_allowed_packet_size` setting and adjust how much SQL we execute at a time. Not only does this avoid failure, but allows us to increase performance.

###Sync Media Libraries Between Installations
Using the optional [WP Migrate DB Media Files](https://github.com/slang800/wp-migrate-db-media-files) addon, you can have media files synced between installs too.

##Installation
1. Install [github-updater](https://github.com/afragen/github-updater) by downloading the latest zip [here](https://github.com/afragen/github-updater/releases). We rely on this plugin for updating WP Migrate DB directly from this git repo.
2. Install WP Migrate DB by downloading the latest zip [here](https://github.com/slang800/wp-migrate-db/releases). Both github-updater and WP Migrate DB will now download their own updates automatically, so you will never need to go through that tedious zip downloading again.
3. Access the WP Migrate DB menu option under Tools.
4. Install the optional [WP Migrate DB Media Files](https://github.com/slang800/wp-migrate-db-media-files) addon.

##Help Videos

###Feature Walkthrough
http://www.youtube.com/watch?v=SlfSuuePYaQ

A brief walkthrough of the WP Migrate DB plugin showing all of the different options and explaining them.

###Pulling Live Data Into Your Local Development Environment
http://www.youtube.com/watch?v=IFdHIpf6jjc

This screencast demonstrates how you can pull data from a remote, live WordPress install and update the data in your local development environment.

###Pushing Local Development Data to a Staging Environment
http://www.youtube.com/watch?v=FjTzNqAlQE0

This screencast demonstrates how you can push a local WordPress database you've been using for development to a staging environment.

##Isn't this the same as WP Migrate DB Pro?
No, of course not, don't be silly. I took out the license verification code, a really shady looking PressTrends reporter, and the tab for installing the Media Files addon before I published 1.4. Release 1.3 was the same as [WP Migrate DB Pro](https://deliciousbrains.com/wp-migrate-db-pro), but I've made several improvements since then.

Also, because this plugin is free I'm not _obligated_ to help you like [bradt](https://github.com/bradt) is if you purchased WP Migrate DB Pro. Any help that I give is just because I'm a nice person and I enjoy helping people. Also, I only offer support through the public [issues manager](https://github.com/slang800/wp-migrate-db/issues). If you're an agency and need support at the drop of a hat, buy the plugin from bradt.

##Is this Illegal?
**No.** Just because this is based on the paid-for WP Migrate DB Pro, it doesn't mean I can't release it. WP Migrate DB Pro is released under GPLv2, a copyleft license that guarantees my freedom (and the freedom of all users) to copy, distribute, and/or modify this software.
