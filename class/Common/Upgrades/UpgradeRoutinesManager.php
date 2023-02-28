<?php

namespace DeliciousBrains\WPMDB\Common\Upgrades;

use DeliciousBrains\WPMDB\Common\Plugin\Assets;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Upgrades\Routines\Routine_2_6_0;
use DeliciousBrains\WPMDB\Common\Upgrades\Routines\Routine_2_6_2;
use DeliciousBrains\WPMDB\Common\Upgrades\Routines\RoutineInterface;

/**
 * Upgrade routines manager
 * Responsible for running upgrade routines.
 *
 * @since 2.6.0
 */
class UpgradeRoutinesManager {

    /**
     * @var Assets
     */
    private $assets;

    /**
     * @var ProfileManager
     */
    private $profile_manager;

    /**
     * @param Assets $assets
     * @param ProfileManager $profile_manager
     */
    public function __construct(Assets $assets, ProfileManager $profile_manager) {
        $this->assets          = $assets;
        $this->profile_manager = $profile_manager;
    }

    /**
     * @return RoutineInterface[]
     */
    private function get_routines() {
        // New routines should be added here, in order, newer last.
        return [
            new Routine_2_6_0(),
            new Routine_2_6_2(),
        ];
    }

    /**
     * Iterate through all upgrade routines and apply them to all profiles.
     *
     * @return void
     */
    public function perform_upgrade_routines()
    {
        $routines       = $this->get_routines();
        $target_version = end($routines)->get_target_schema_version();

        //Iterate through all profiles and apply all upgrade routines
        foreach (['wpmdb_saved_profiles', 'wpmdb_recent_migrations'] as $profile_type) {
            $profiles = $profile_type === 'wpmdb_saved_profiles' ? $this->assets->get_saved_migration_profiles()
                : $this->assets->get_recent_migrations(get_site_option($profile_type));

            $updated_profiles = [];

            foreach ($profiles as $profile) {
                $profile_id = $profile['id'];

                $profile = $this->profile_manager->get_profile_by_id($profile_type === 'wpmdb_recent_migrations' ? 'unsaved' : $profile_type, $profile_id);
                $profile_data = json_decode($profile['value']);

                foreach ($this->get_routines() as $routine) {
                    //Apply routine if stored schema version is lower than routine target schema version
                    if (version_compare($routine->get_target_schema_version(), $this->get_current_schema_version()) === 1) {
                        $last_routine_version = $routine->get_target_schema_version();
                        $routine->apply($profile_data);
                    }
                }

                $profile['value'] = json_encode($profile_data);
                $updated_profiles[$profile_id] = $profile;
            }

            if ( ! empty($last_routine_version)) {
                //Save the profiles
                $updated_profiles = update_site_option($profile_type, $updated_profiles);

                if (false === $updated_profiles) {
                    error_log(sprintf('WPMDB: Could not update %s to schema version: %s. It might already be up-to-date.',
                        $profile_type, $last_routine_version));
                }
            }
        }

        //Once all profiles have been updated, update the schema version in the database.
        if (( ! empty($last_routine_version) && version_compare($last_routine_version,
                    $target_version) === 0) || "0" === $this->get_current_schema_version()) {
            $this->update_schema_version($target_version);
        }
    }

    /**
     * Returns the current saved schema version.
     *
     * @return string
     */
    private function get_current_schema_version() {
        return (string) get_site_option('wpmdb_schema_version', 0);
    }

    /**
     * Updates the schema_version option in the database.
     *
     * @param string $version
     *
     * @return void
     */
    private function update_schema_version($version = "0")
    {
        update_site_option('wpmdb_schema_version', $version);
    }

}
