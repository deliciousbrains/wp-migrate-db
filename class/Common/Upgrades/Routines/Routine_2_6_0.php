<?php

namespace DeliciousBrains\WPMDB\Common\Upgrades\Routines;

use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\WPMDBDI;

/**
 * Class Routine26
 *
 * @since 2.6.0
 */
class Routine_2_6_0 implements RoutineInterface
{
    public function apply(&$profile)
    {
        //Set forceHighPerformanceTransfers to true in all profiles
        if (property_exists($profile, 'current_migration')) {
            $profile->current_migration->forceHighPerformanceTransfers = true;
        }

        //If pro, update profiles with addons license status
        if (Util::isPro()) {
            $available_addons = WPMDBDI::getInstance()->get(\DeliciousBrains\WPMDB\Pro\License::class)->get_available_addons_list(get_current_user_id());
            $licensed_array   = $available_addons ? array_keys($available_addons) : [];

            if (property_exists($profile, 'media_files') && in_array('wp-migrate-db-pro-media-files', $licensed_array,
                    true)) {
                $profile->media_files->is_licensed = true;
            }

            if (property_exists($profile, 'multisite_tools') && in_array('wp-migrate-db-pro-multisite-tools',
                    $licensed_array, true)) {
                $profile->multisite_tools->is_licensed = true;
            }

            if (property_exists($profile, 'theme_plugin_files') && in_array('wp-migrate-db-pro-theme-plugin-files',
                    $licensed_array, true)) {
                $profile->theme_plugin_files->is_licensed = true;
            }
        }
    }

    public function get_target_schema_version()
    {
        return "3.7.0";
    }
}
