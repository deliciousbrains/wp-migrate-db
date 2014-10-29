<li>
	<label for="exclude-post-revisions">
		<input id="exclude-post-revisions" type="checkbox" autocomplete="off" value="1" name="exclude_post_revisions"<?php echo ( in_array( 'revision', $loaded_profile['select_post_types'] ) ) ? ' checked="checked"' : ''; ?> />
		<?php _e( 'Exclude post revisions', 'wp-migrate-db' ); ?>
	</label>
</li>