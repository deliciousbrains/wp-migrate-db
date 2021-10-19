<?php

namespace DeliciousBrains\WPMDB\Common\Settings;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Helpers;
use DeliciousBrains\WPMDB\Common\Util\Util;

class Settings
{

    /**
     * @var Util
     */
    public $util;
    /**
     * @var
     */
    private $settings;
    /**
     * @var
     */
    private static $static_settings;
    // The constructor is private
    // to prevent initiation with outer code.
    /**
     * @var Filesystem
     */
    private $filesystem;

    public function __construct(Util $util, Filesystem $filesystem)
    {
        $this->util = $util;

        // @TODO this shouldn't be fired every time the Settings class is called...
        $this->load_settings();
        $this->filesystem = $filesystem;
    }

    static function get_setting($setting)
    {
        if (isset(self::$static_settings[$setting])) {
            return self::$static_settings[$setting];
        }

        throw new \InvalidArgumentException(__('Setting does not exist', 'wp-migrate-db'));
    }

    public function get_settings_for_frontend()
    {
        // Always get fresh settings for the frontend.
        $this->load_settings();
        $existing_settings = $this->settings;

        if (!empty($existing_settings['licence'])) {
            $masked_licence                      = $this->util->mask_licence($existing_settings['licence']);
            $existing_settings['masked_licence'] = $masked_licence;
        }

        $existing_settings['plugins']         = $this->filesystem->get_local_plugins();

        return $existing_settings;
    }

    public function get_settings()
    {
        // Assumes load_settings() has been called in base plugin (WPMigrateDB)
        return $this->settings;
    }

    public function load_settings()
    {
        $update_settings = false;
        $this->settings  = get_site_option('wpmdb_settings');

        $default_settings = array(
            'key'                    => $this->util->generate_key(),
            'allow_pull'             => false,
            'allow_push'             => false,
            'profiles'               => array(),
            'licence'                => '',
            'verify_ssl'             => false,
            'whitelist_plugins'      => array(),
            'max_request'            => min(1024 * 1024, $this->util->get_bottleneck('max')),
            'delay_between_requests' => 0,
            'prog_tables_hidden'     => true,
            'pause_before_finalize'  => false,
            'allow_tracking'         => null,
        );

        // if we still don't have settings exist this must be a fresh install, set up some default settings
        if (false === $this->settings) {
            $this->settings  = $default_settings;
            $update_settings = true;
        } else {
            /*
             * When new settings are added an existing customer's db won't have the new settings.
             * They're added here to circumvent array index errors in debug mode.
             */
            foreach ($default_settings as $key => $value) {
                if (!isset($this->settings [$key])) {
                    $this->settings[$key] = $value;
                    $update_settings      = true;
                }
            }
        }

        $is_compat_mode = $this->util->is_muplugin_installed();

        if (!isset($this->settings['compatibility_mode']) || $is_compat_mode !== $this->settings['compatibility_mode']) {
            //override compatibility mode
            $this->settings['compatibility_mode'] = $is_compat_mode;
            $update_settings                      = true;
        }


        if ($update_settings) {
            update_site_option('wpmdb_settings', $this->settings);
        }

        $user_licence = Helpers::get_user_licence_key();
        if ( $user_licence ) {
            $this->settings['licence'] = $user_licence;
        }

        self::$static_settings = $this->settings;
    }
}
