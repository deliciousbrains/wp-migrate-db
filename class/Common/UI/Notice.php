<?php

namespace DeliciousBrains\WPMDB\Common\UI;

class Notice{
	/**
	 * Standard notice display check
	 * Returns dismiss and reminder links html for templates where necessary
	 *
	 * @param string      $notice   The name of the notice e.g. license-key-warning
	 * @param bool|string $dismiss  If the notice has a dismiss link. Pass "SHOW_ONCE" to auto-dismiss after first presentation.
	 * @param bool|int    $reminder If the notice has a reminder link, this will be the number of seconds
	 *
	 * @return array|bool
	 */
	function check_notice( $notice, $dismiss = false, $reminder = false, $css_class = 'notice-link' ) {
		if ( true === apply_filters( 'wpmdb_hide_' . $notice, false ) ) {
			return false;
		}
		global $current_user;
		$notice_links = array();

		if ( $dismiss ) {
			if ( get_user_meta( $current_user->ID, 'wpmdb_dismiss_' . $notice ) ) {
				return false;
			}
			$notice_links['dismiss'] = '<a href="#" class="' . esc_attr( $css_class ) . '" data-notice="' . $notice . '" data-type="dismiss">' . _x( 'Dismiss', 'dismiss notice permanently', 'wp-migrate-db' ) . '</a>';

			if ( 'SHOW_ONCE' === $dismiss ) {
				update_user_meta( $current_user->ID, 'wpmdb_dismiss_' . $notice, true );
			}
		}

		if ( $reminder ) {
			if ( ( $reminder_set = get_user_meta( $current_user->ID, 'wpmdb_reminder_' . $notice, true ) ) ) {
				if ( strtotime( 'now' ) < $reminder_set ) {
					return false;
				}
			}
			$notice_links['reminder'] = '<a href="#"  class="' . esc_attr( $css_class ) . '" data-notice="' . $notice . '" data-type="reminder" data-reminder="' . $reminder . '">' . __( 'Remind Me Later', 'wp-migrate-db' ) . '</a>';
		}

		return ( count( $notice_links ) > 0 ) ? $notice_links : true;
	}
}
