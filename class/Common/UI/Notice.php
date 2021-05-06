<?php

namespace DeliciousBrains\WPMDB\Common\UI;

class Notice
{

    /**
     * Standard notice display check
     * Returns dismiss and reminder links html for templates where necessary
     *
     * @param string      $notice       The name of the notice e.g. license-key-warning
     * @param bool|string $dismissLink  If the notice has a dismiss link. Pass "SHOW_ONCE" to auto-dismiss after first presentation.
     * @param bool|int    $reminderTime If the notice has a reminder link, this will be the number of seconds
     *
     * @return array|bool
     */
    function check_notice($notice, $dismissLink = false, $reminderTime = false, $css_class = 'notice-link')
    {
        if (true === apply_filters('wpmdb_hide_' . $notice, false)) {
            return false;
        }
        global $current_user;
        $notice_links = array();

        if ($dismissLink) {
            if (get_user_meta($current_user->ID, 'wpmdb_dismiss_' . $notice)) {
                return false;
            }

            $notice_links['dismiss'] = $notice;

            if ('SHOW_ONCE' === $dismissLink) {
                update_user_meta($current_user->ID, 'wpmdb_dismiss_' . $notice, true);
            }
        }

        if ($reminderTime) {
            $reminder_set = get_user_meta($current_user->ID, 'wpmdb_reminder_' . $notice, true);
//
            if ($reminder_set) {
                if (strtotime('now') < $reminder_set) {
                    return false;
                }
            }

            $notice_links['reminder'] = $notice;
            $notice_links['reminder_time'] = $reminderTime;
        }

        return (count($notice_links) > 0) ? $notice_links : true;
    }
}
