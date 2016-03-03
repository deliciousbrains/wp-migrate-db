<?php
$videos = array(
	'SlfSuuePYaQ' => array(
		'title' => 'Feature Walkthrough',
		'desc' => 'A brief walkthrough of the WP Migrate DB plugin
			showing all of the different options and explaining them.'
	),
	'IFdHIpf6jjc' => array(
		'title' => 'Pulling Live Data Into Your Local Development&nbsp;Environment',
		'desc' => 'This screencast demonstrates how you can pull data from a remote, live 
			WordPress install and update the data in your local development
			environment.'
	),
	'FjTzNqAlQE0' => array(
		'title' => 'Pushing Local Development Data to a Staging&nbsp;Environment',
		'desc' => 'This screencast demonstrates how you can push a local WordPress database
			you\'ve been using for development to a staging environment.'
	),
	'0aR8-jC2XXM' => array(
		'title' => 'Media Files Addon Demo',
		'desc' => 'A short demo of how the Media Files addon allows you to sync up your WordPress Media Libraries.'
	)
);
$licence = $this->get_licence_key();
?>

<div class="help-tab content-tab">

	<div class="support">
		<h3>Email Support</h3>
		<div class="support-content">
			<?php if( ! empty( $licence ) ) : ?>
				<p>Fetching licence details, please wait...</p>
			<?php else : ?>
				<p>We couldn't find your licence information. Please switch to the settings tab and enter your licence.</p>
				<p>Once completed, you may visit this tab to view your support details.</p>
			<?php endif; ?>
		</div>
	</div>

	<div class="debug">
		<h3>Diagnostic Info &amp; Error Log</h3>
		<textarea class="debug-log-textarea" autocomplete="off" readonly></textarea>
		<a class="button clear-log js-action-link">Clear Error Log</a>
	</div>

	<div class="videos">
		<h3>Videos</h3>

		<iframe class="video-viewer" style="display: none;" width="640" height="360" src="" frameborder="0" allowfullscreen></iframe>

		<ul>
		<?php foreach ( $videos as $id => $video ) : ?>
			<li class="video" data-video-id="<?php echo $id; ?>">
				<a href="http://www.youtube.com/watch?v=<?php echo $id; ?>" target="_blank"><img src="http://img.youtube.com/vi/<?php echo $id; ?>/0.jpg" alt="" /></a>

				<h4><?php echo $video['title']; ?></h4>

				<p>
					<?php echo $video['desc']; ?>
				</p>
			</li>
		<?php endforeach; ?>
		</ul>
	</div>

</div> <!-- end .help-tab -->