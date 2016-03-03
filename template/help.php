<?php
$videos = array(
	'SlfSuuePYaQ' => array(
		'title' => __( 'Feature Walkthrough', 'wp-migrate-db-pro' ),
		'desc' => __( 'A brief walkthrough of the WP Migrate DB plugin showing all of the different options and explaining them.', 'wp-migrate-db-pro' )
	),
	'IFdHIpf6jjc' => array(
		'title' => __( 'Pulling Live Data Into Your Local Development&nbsp;Environment', 'wp-migrate-db-pro' ),
		'desc' => __( 'This screencast demonstrates how you can pull data from a remote, live WordPress install and update the data in your local development environment.', 'wp-migrate-db-pro' )
	),
	'FjTzNqAlQE0' => array(
		'title' => __( 'Pushing Local Development Data to a Staging&nbsp;Environment', 'wp-migrate-db-pro' ),
		'desc' => __( 'This screencast demonstrates how you can push a local WordPress database you\'ve been using for development to a staging environment.', 'wp-migrate-db-pro' )
	),
	'0aR8-jC2XXM' => array(
		'title' => __( 'Media Files Addon Demo', 'wp-migrate-db-pro' ),
		'desc' => __( 'A short demo of how the Media Files addon allows you to sync up your WordPress Media Libraries.', 'wp-migrate-db-pro' )
	)
);
$licence = $this->get_licence_key();
?>

<div class="help-tab content-tab">

	<div class="support">
		<h3><?php _e( 'Email Support', 'wp-migrate-db-pro' ); ?></h3>
		<div class="support-content">
			<?php if( ! empty( $licence ) ) : ?>
				<p><?php _e( 'Fetching license details, please wait...', 'wp-migrate-db-pro' ); ?></p>
			<?php else : ?>
				<p><?php _e( 'We couldn\'t find your license information. Please switch to the settings tab and enter your license.', 'wp-migrate-db-pro' ); ?></p>
				<p><?php _e( 'Once completed, you may visit this tab to view your support details.', 'wp-migrate-db-pro' ); ?></p>
			<?php endif; ?>
		</div>
	</div>

	<div class="debug">
		<h3><?php _e( 'Diagnostic Info &amp; Error Log', 'wp-migrate-db-pro' ); ?></h3>
		<textarea class="debug-log-textarea" autocomplete="off" readonly></textarea>
		<a class="button clear-log js-action-link"><?php _e( 'Clear Error Log', 'wp-migrate-db-pro' ); ?></a>
	</div>

	<div class="videos">
		<h3><?php _e( 'Videos', 'wp-migrate-db-pro' ); ?></h3>

		<iframe class="video-viewer" style="display: none;" width="640" height="360" src="" frameborder="0" allowfullscreen></iframe>

		<ul>
		<?php foreach ( $videos as $id => $video ) : ?>
			<li class="video" data-video-id="<?php echo $id; ?>">
				<a href="//www.youtube.com/watch?v=<?php echo $id; ?>" target="_blank"><img src="//img.youtube.com/vi/<?php echo $id; ?>/0.jpg" alt="" /></a>

				<h4><?php echo $video['title']; ?></h4>

				<p>
					<?php echo $video['desc']; ?>
				</p>
			</li>
		<?php endforeach; ?>
		</ul>
	</div>

</div> <!-- end .help-tab -->
