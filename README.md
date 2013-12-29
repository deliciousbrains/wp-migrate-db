#WP Migrate DB
Exports your database, does a find and replace on URLs and file paths, then allows you to save it to your computer.

Donate [here](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5VPMGLLK94XJC) to support [bradt](https://github.com/bradt), the original author of [WP Migrate DB](https://github.com/bradt/wp-migrate-db). And check out [WP Migrate DB Pro](https://deliciousbrains.com/wp-migrate-db-pro/pricing/) for a variant of the plugin that has dedicated customer support.

##Description
WP Migrate DB exports your database as a MySQL data dump (much like phpMyAdmin), does a find and replace on URLs and file paths, then allows you to save it to your computer. It is perfect for developers who develop locally and need to move their Wordpress site to a staging or production server.

It even takes into account serialized data and updates the string length values.

Example: <code>s:5:"hello"</code> becomes <code>s:11:"hello world"</code>

##Installation
1. Use WordPress' built-in installer
2. Access the WP Migrate DB menu option under Tools

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
