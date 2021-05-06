<?php

use Dotenv\Dotenv;

$wpmdb_base_path = dirname(__FILE__);

$plugin_root = '/';

if(!defined('WPMDB_PLUGIN_PATH')){
    define('WPMDB_PLUGIN_PATH', plugin_dir_path(__FILE__));
}

if( file_exists(__DIR__ . $plugin_root.".env") ) {
    $dotenv = Dotenv::createImmutable(__DIR__ . $plugin_root);
    $dotenv->load();
}

if (!defined('WPMDB_MINIMUM_WP_VERSION')) {
    define('WPMDB_MINIMUM_WP_VERSION', '5.2');
}

if (!defined('WPMDB_MINIMUM_PHP_VERSION')) {
    define('WPMDB_MINIMUM_PHP_VERSION', '5.6');
}

if (!class_exists('WPMDB_PHP_Checker')) {
    require_once $wpmdb_base_path . '/php-checker.php';
}

$php_checker = new WPMDB_PHP_Checker(__FILE__, WPMDB_MINIMUM_PHP_VERSION);
if (!$php_checker->is_compatible_check()) {
    register_activation_hook(__FILE__, array('WPMDB_PHP_Checker', 'wpmdb_pro_php_version_too_low'));
}


if (!function_exists('wpmdb_deactivate_other_instances')) {
    require_once $wpmdb_base_path . '/class/deactivate.php';
}

add_action('activated_plugin', 'wpmdb_deactivate_other_instances');
add_action('wpmdb_migration_complete', 'wpmdb_deactivate_free_instance_after_migration', 10, 1);
