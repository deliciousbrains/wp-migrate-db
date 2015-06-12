<div class="progress-content">
	<span class="close-progress-content close-progress-content-button">&times;</span>

	<div>
		<h2 class="progress-title"><?php _e( 'Please wait while migration is running...', 'wp-migrate-db' ); ?></h2>
	</div>
	<div class="progress-info-wrapper clearfix">
		<div class="progress-text"><?php _e( 'Establishing Connection', 'wp-migrate-db' ); ?></div>
		<span class="timer"><?php echo __( 'Time Elapsed:', 'wp-migrate-db' ) . ' 00:00:00'; ?></span>
	</div>
	<div class="clearfix"></div>
	<div class="progress-bar-wrapper">
		<div class="progress-tables-hover-boxes"></div>
		<div class="progress-label">wp_options</div>
		<div class="progress-bar"></div>
		<div class="progress-tables"></div>
	</div>
	<?php do_action( 'wpmdb_template_progress_after_bar' ); ?>

	<div class="migration-controls">
		<span class="pause-resume button"><?php _ex( 'Pause', 'Temporarily stop migrating', 'wp-migrate-db' ); ?></span>
		<span class="cancel button"><?php _ex( 'Cancel', 'Stop the migration', 'wp-migrate-db' ); ?></span>
	</div>

	<?php $this->template_part( array( 'progress_upgrade' ) ); ?>

</div> <!-- end .progress-content -->