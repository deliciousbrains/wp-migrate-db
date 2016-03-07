<div class="option-section plugin-compatibility-section">
	<label for="plugin-compatibility" class="plugin-compatibility bubble">
		<input id="plugin-compatibility" type="checkbox" name="plugin_compatibility"<?php echo $plugin_compatibility_checked; ?> autocomplete="off"<?php echo $plugin_compatibility_checked; ?> />
		<?php _e( 'Improve performance and reliability by not loading the following plugins for migration requests', 'wp-migrate-db' ); ?>
	</label>
	<a href="#" class="general-helper plugin-compatibility-helper js-action-link"></a>

	<div class="plugin-compatibility-message helper-message bottom">
		<?php _e( 'Some plugins add a lot of overhead to each request, requiring extra memory and CPU. And some plugins even interfere with migrations and cause them to fail. We recommend only loading plugins that affect migration requests, for example a plugin that hooks into WP Migrate DB.', 'wp-migrate-db' ); ?></br>
	</div>

	<div class="indent-wrap expandable-content plugin-compatibility-wrap select-wrap">
		<select autocomplete="off" class="multiselect" id="selected-plugins" name="selected_plugins[]" multiple="multiple">
			<?php
			$blacklist = array_flip( (array) $this->settings['blacklist_plugins'] );
			foreach ( get_plugins() as $key => $plugin ) {
				if ( 0 === strpos( $key, 'wp-migrate-db' ) ) {
					continue;
				}
				$selected = ( isset( $blacklist[ $key ] ) ) ? ' selected' : '';
				printf( '<option value="%s"%s>%s</option>', $key, $selected, $plugin['Name'] );
			}
			?>
		</select>
		<br>
		<a class="multiselect-select-all js-action-link" href="#"><?php _e( 'Select All', 'wp-migrate-db' ); ?></a>
		<span class="select-deselect-divider">/</span>
		<a class="multiselect-deselect-all js-action-link" href="#"><?php _e( 'Deselect All', 'wp-migrate-db' ); ?></a>
		<span class="select-deselect-divider">/</span>
		<a class="multiselect-invert-selection js-action-link" href="#"><?php _e( 'Invert Selection', 'wp-migrate-db' ); ?></a>

		<p>
			<span class="button plugin-compatibility-save"><?php _e( 'Save Changes', 'wp-migrate-db' ); ?></span>
			<span class="plugin-compatibility-success-msg"><?php _ex( 'Saved', 'The settings were saved successfully', 'wp-migrate-db' ); ?></span>
		</p>
	</div>
</div>
