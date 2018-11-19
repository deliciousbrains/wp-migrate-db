<?php ?>
<div class="backups-tab content-tab">
	<p><?php printf( __( 'Backups are currently saved to: <br>%s' ), $this->filesystem->slash_one_direction( $this->filesystem->get_upload_info(  'path' ) . DIRECTORY_SEPARATOR ) ) ?></p>
	<div id="wpmdb-backups-messages" class="below-title warning inline-message"></div>
	<div id="wpmdb-backups-container"></div>
</div>
