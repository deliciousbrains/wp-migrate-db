<div class="option-section" style="display: block;">
	<label for="exclude-post-types" class="exclude-post-types-checkbox checkbox-label">
	<input type="checkbox" id="exclude-post-types" value="1" autocomplete="off" name="exclude_post_types"<?php $this->maybe_checked( $loaded_profile['exclude_post_types'] ); ?> />
	<?php _e( 'Exclude Post Types', 'wp-migrate-db' ); ?>
	</label>

	<div class="indent-wrap expandable-content post-type-select-wrap" style="display: none;">
		<div class="select-post-types-wrap select-wrap">
			<select multiple="multiple" name="select_post_types[]" id="select-post-types" class="multiselect" autocomplete="off">
			<?php foreach( $this->get_post_types() as $post_type ) :
				if( ! empty( $loaded_profile['select_post_types'] ) && in_array( $post_type, $loaded_profile['select_post_types'] ) ){
					printf( '<option value="%1$s" selected="selected">%1$s</option>', $post_type );
				}
				else{
					printf( '<option value="%1$s">%1$s</option>', $post_type );
				}
			endforeach; ?>
			</select>
			<br />
			<a href="#" class="multiselect-select-all js-action-link"><?php _e( 'Select All', 'wp-migrate-db' ); ?></a>
			<span class="select-deselect-divider">/</span>
			<a href="#" class="multiselect-deselect-all js-action-link"><?php _e( 'Deselect All', 'wp-migrate-db' ); ?></a>
			<span class="select-deselect-divider">/</span>
			<a href="#" class="multiselect-invert-selection js-action-link"><?php _e( 'Invert Selection', 'wp-migrate-db' ); ?></a>
		</div>
	</div>
</div>