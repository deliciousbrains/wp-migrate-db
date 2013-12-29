<div class="migrate-tab content-tab">
	<p class="saved-migration-profile-label">Would you like to use a saved migration profile?</p>
	<ul class="migration-profile-options">
		<?php foreach( $this->settings['profiles'] as $key => $profile ) { ?>
			<li><a href="<?php echo $this->plugin_base . '&wpmdb-profile=' . $key; ?>"><?php echo $profile['name']; ?></a><span class="main-list-delete-profile-link" data-profile-id="<?php echo $key; ?>">&times;</span></li>
		<?php } ?>
		<li><a href="<?php echo $this->plugin_base . '&wpmdb-profile=-1'; ?>">Nope, let's start fresh...</a></li>
	</ul>
</div>