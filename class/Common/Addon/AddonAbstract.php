<?php

namespace DeliciousBrains\WPMDB\Common\Addon;

use DeliciousBrains\WPMDB\Common\Properties\DynamicProperties;
use DeliciousBrains\WPMDB\Common\Properties\Properties;

abstract class AddonAbstract
{

    /**
     * @var
     */
    protected $version_required;
    /**
     * @var Properties
     */
    protected $properties;
    /**
     * @var Addon
     */
    protected $addon;
    /**
     * @var DynamicProperties
     */
    protected $dynamic_properties;
    /**
     * @var
     */
    protected $plugin_slug;
    /**
     * @var
     */
    protected $plugin_version;
    /**
     * @var
     */
    protected $addon_name;

    protected $plugin_basename = false;

    /**
     * @var boolean
     */
    protected $licensed = false;

    function __construct(
        Addon $addon,
        Properties $properties
    ) {
        $this->addon                        = $addon;
        $this->properties                   = $properties;
        $this->dynamic_properties           = DynamicProperties::getInstance();
        $this->dynamic_properties->is_addon = true;
    }

    function meets_version_requirements($version_required)
    {
        $wpmdb_pro_version      = $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'];
        $result                 = version_compare($wpmdb_pro_version, $version_required, '>=');
        $this->version_required = $version_required;


        if ($result) {
            // If pre-1.1.2 version of Media Files addon,
            // then it's not supported by this version of core
            if (empty($this->properties->plugin_version)) {
                $result = false;
            } else { // Check that this version of core supports the addon version
                $plugin_basename        = sprintf('%1$s/%1$s.php', $this->plugin_slug);
                $this->plugin_basename  = $plugin_basename;
                $required_addon_version = $this->addon->getAddons()[$plugin_basename]['required_version'];
                $result                 = version_compare($this->properties->plugin_version, $required_addon_version, '>=');
            }
        }

        if (false == $result) {
            $this->hook_version_requirement_actions();

        }

        return $result;
    }

    function hook_version_requirement_actions()
    {
        add_filter('wpmdb_notification_strings', array($this, 'version_requirement_actions'));
    }

    function version_requirement_actions($notifications)
    {
        $addon_requirement_check = get_site_option('wpmdb_addon_requirement_check', array());

        // we only want to delete the transients once, here we keep track of which versions we've checked
        if (!isset($addon_requirement_check[$this->properties->plugin_slug]) || $addon_requirement_check[$this->properties->plugin_slug] != $GLOBALS['wpmdb_meta'][$this->properties->plugin_slug]['version']) {
            delete_site_transient('wpmdb_upgrade_data');
            delete_site_transient('update_plugins');
            $addon_requirement_check[$this->properties->plugin_slug] = $GLOBALS['wpmdb_meta'][$this->properties->plugin_slug]['version'];
            update_site_option('wpmdb_addon_requirement_check', $addon_requirement_check);
        }

        $notice_id = $this->plugin_basename . '-notice';

        $notifications[$notice_id] = [
            'message' => $this->version_requirement_warning(),
            'link'    => false,
            'id'      => $notice_id,
        ];

        return $notifications;
    }

    function version_requirement_warning()
    {
        $str = '<strong>Update Required</strong> &mdash; ';

        $addon_name     = $this->addon_name;
        $required       = $this->version_required;
        $installed      = $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['version'];
        $wpmdb_basename = sprintf('%s/%s.php', $GLOBALS['wpmdb_meta']['wp-migrate-db-pro']['folder'], 'wp-migrate-db');
        $update         = wp_nonce_url(network_admin_url('update.php?action=upgrade-plugin&plugin=' . urlencode($wpmdb_basename)), 'upgrade-plugin_' . $wpmdb_basename);
        $str            .= sprintf(__('The version of %1$s you have installed requires version %2$s of WP Migrate. You currently have %3$s installed. <strong><a href="%4$s">Update Now</a></strong>', 'wp-migrate-db'), $addon_name, $required, $installed, $update);

        return $str;
    }


    /**
     * @param bool $is_licensed
     **/
    public function set_licensed($is_licensed)
    {
        $this->licensed = $is_licensed;
    }

}
