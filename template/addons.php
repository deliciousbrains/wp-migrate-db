<?php
	$licence = $this->get_licence_key();
?>
<div class="addons-tab content-tab">
	<div class="addons-content">
		<?php if( ! empty( $licence ) ) : ?>
			<p><?php _e( 'Fetching addon details, please wait...', 'wp-migrate-db-pro' ); ?></p>
		<?php else : ?>
			<p><?php _e( 'We couldn\'t find your license information. Please switch to the settings tab and enter your license.', 'wp-migrate-db-pro' ); ?></p>
			<p><?php _e( 'Once completed, you may visit this tab to view the available addons.', 'wp-migrate-db-pro' ); ?></p>
		<?php endif; ?>
	</div>
</div>