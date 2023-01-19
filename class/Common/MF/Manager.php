<?php

namespace DeliciousBrains\WPMDB\Common\MF;

use DeliciousBrains\WPMDB\Common\Addon\AddonManagerInterface;
use DeliciousBrains\WPMDB\WPMDBDI;

class Manager implements AddonManagerInterface {

    public function register($licensed)
    {
        global $wpmdbpro_media_files;

        if ( ! is_null($wpmdbpro_media_files) ) {
            return $wpmdbpro_media_files;
        }

        $container = WPMDBDI::getInstance();
        $media_files = $container->get(MediaFilesAddon::class);
        $media_files->register();
        $media_files->set_licensed($licensed);

        $container->get(MediaFilesLocal::class)->register();

        add_filter('wpmdb_addon_registered_mf', '__return_true');

        return $media_files;
    }

    public function get_license_response_key()
    {
        return 'wp-migrate-db-pro-media-files';
    }
}
