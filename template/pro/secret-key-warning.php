<div class="updated warning inline-message">
	<strong><?php _e( 'Improve Security', 'wp-migrate-db' ); ?></strong> &mdash;
	<?php printf( __( 'We have implemented a more secure method of secret key generation since your key was generated. We recommend you <a href="%1$s">visit the Settings tab</a> and reset your secret key.<br>%2$s | %3$s', 'wp-migrate-db' ), '#settings', $reminder, $dismiss ); ?>
</div>