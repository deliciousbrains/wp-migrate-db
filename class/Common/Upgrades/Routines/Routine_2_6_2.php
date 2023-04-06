<?php
namespace DeliciousBrains\WPMDB\Common\Upgrades\Routines;

/**
 * Class Routine2_6_2
 *
 * @since 2.6.2
 */
class Routine_2_6_2 implements RoutineInterface
{
    public function apply(&$profile)
    {
        if (property_exists($profile, 'current_migration')) {
            $has_revision = in_array('revision', $profile->current_migration->post_types_selected);

            if ($has_revision && in_array('exclude_post_revisions', $profile->current_migration->advanced_options_selected)) {
                $profile->current_migration->advanced_options_selected = array_diff($profile->current_migration->advanced_options_selected, ['exclude_post_revisions']);
            }
            //check exclude revisions if revision is not in the selected list
            if (!$has_revision && 'selected' === $profile->current_migration->post_types_option && !in_array('exclude_post_revisions', $profile->current_migration->advanced_options_selected)) {
                $profile->current_migration->advanced_options_selected[] = 'exclude_post_revisions';
            }
            //remove revision from selected post type list
            if ($has_revision && in_array('revision', $profile->current_migration->post_types_selected)) {
                $profile->current_migration->post_types_selected = array_values(array_filter($profile->current_migration->post_types_selected, function($value) { return $value !== 'revision'; }));
            }
        }
    }

    public function get_target_schema_version()
    {
        return "3.8.0";
    }
}
