<div class="settings-tab content-tab">

	<?php
		$connection_info = sprintf( "%s\r%s", site_url( '', 'https' ), $this->settings['key'] );
		$pull_checked = ( $this->settings['allow_pull'] ? ' checked="checked"' : '' );
		$push_checked = ( $this->settings['allow_push'] ? ' checked="checked"' : '' );
		$verify_ssl_checked = ( $this->settings['verify_ssl'] ? ' checked="checked"' : '' );
		$plugin_compatibility_checked = ( isset( $GLOBALS['wpmdb_compatibility'] ) ? ' checked="checked"' : '' );

		$licence = $this->get_licence_key();
	?>

	<form method="post" id="settings-form" action="#settings" autocomplete="off">

		<div class="option-section allow-remote-requests-wrap">		
			<ul class="option-group">
				<li>
					<label for="allow_pull">
					<input id="allow_pull" type="checkbox" name="allow_pull"<?php echo $pull_checked; ?> />
					<?php _e( 'Accept <b>pull</b> requests allow this database to be exported and downloaded', 'wp-migrate-db-pro' ); ?>
					</label>
				</li>
				<li>
					<label for="allow_push">
					<input id="allow_push" type="checkbox" name="allow_push"<?php echo $push_checked; ?> />
					<?php _e( 'Accept <b>push</b> requests allow this database to be overwritten', 'wp-migrate-db-pro' ); ?>
					</label>
				</li>
				<li>
					<label for="verify_ssl" class="verify-ssl bubble">
					<input id="verify_ssl" type="checkbox" name="verify_ssl"<?php echo $verify_ssl_checked; ?> />
					<?php _e( 'Enable SSL verification', 'wp-migrate-db-pro' ); ?>
					</label>
					<a href="#" class="general-helper replace-guid-helper js-action-link"></a>
					<div class="ssl-verify-message helper-message">
					<?php _e( 'We disable SSL verification by default because a lot of people\'s environments are not setup for it to work. For example, with XAMPP, you have to manually enable OpenSSL by editing the php.ini. Without SSL verification, an HTTPS connection is vulnerable to a man-in-the-middle attack, so we do recommend you configure your environment and enable this.', 'wp-migrate-db-pro' ); ?>
					</div>
				</li>
			</ul>
		</div>

		<div class="option-section connecton-info-wrap">			
			<label for="connection_info" class="connection-info-label"><?php _e( 'Connection Info', 'wp-migrate-db-pro' ); ?></label>
			<textarea id="connection_info" class="connection-info" readonly><?php echo $connection_info; ?></textarea>
			<div class="reset-button-wrap clearfix"><a class="button reset-api-key js-action-link"><?php _e( 'Reset API Key', 'wp-migrate-db-pro' ); ?></a></div>
		</div>

		<div class="option-section plugin-compatibility-section">
			<label for="plugin-compatibility" class="plugin-compatibility bubble">
			<input id="plugin-compatibility" type="checkbox" name="plugin_compatibility"<?php echo $plugin_compatibility_checked; ?> autocomplete="off"<?php echo $plugin_compatibility_checked; ?> />
			<?php _e( 'Improve performance and reliability by not loading the following plugins for migration requests', 'wp-migrate-db-pro' ); ?>
			</label>
			<a href="#" class="general-helper plugin-compatibility-helper js-action-link"></a>
			<div class="plugin-compatibility-message helper-message bottom">
				<?php _e( 'Some plugins add a lot of overhead to each request, requiring extra memory and CPU. And some plugins even interfere with migrations and cause them to fail. We recommend only loading plugins that affect migration requests, for example a plugin that hooks into WP Migrate DB.', 'wp-migrate-db-pro' ); ?></br>
			</div>

			<div class="indent-wrap expandable-content plugin-compatibility-wrap select-wrap">
				<select autocomplete="off" class="multiselect" id="selected-plugins" name="selected_plugins[]" multiple="multiple">
				<?php 
					$blacklist = array_flip( $this->settings['blacklist_plugins'] );
					foreach ( get_plugins() as $key => $plugin ) { 
						if( 0 === strpos( $plugin['Name'], 'WP Migrate DB Pro' ) ) continue;
						$selected = ( isset( $blacklist[$key] ) ) ? ' selected' : '';
						printf( '<option value="%s"%s>%s</option>', $key, $selected, $plugin['Name'] );
					}
				?>
				</select>
				<br>
				<a class="multiselect-select-all js-action-link" href="#"><?php _e( 'Select All', 'wp-migrate-db-pro' ); ?></a>
				<span class="select-deselect-divider">/</span>
				<a class="multiselect-deselect-all js-action-link" href="#"><?php _e( 'Deselect All', 'wp-migrate-db-pro' ); ?></a>
				<span class="select-deselect-divider">/</span>
				<a class="multiselect-invert-selection js-action-link" href="#"><?php _e( 'Invert Selection', 'wp-migrate-db-pro' ); ?></a>
				
				<p>
					<span class="button plugin-compatibility-save"><?php _e( 'Save Changes', 'wp-migrate-db-pro' ); ?></span>
					<span class="plugin-compatibility-success-msg"><?php _e( 'Saved', 'wp-migrate-db-pro' ); ?></span>
				</p>
			</div>
		</div>

		<div class="option-section slider-outer-wrapper">
			<div class="clearfix slider-label-wrapper">
				<div class="slider-label"><span><?php _e( 'Maximum Request Size', 'wp-migrate-db-pro' ); ?></span>
					<a class="general-helper slider-helper js-action-link" href="#"></a>
					<div class="slider-message helper-message">
						<?php printf( __( 'We\'ve detected that your server supports requests up to %s, but it\'s possible that your server has limitations that we could not detect. To be on the safe side, we set the default to 1 MB, but you can try throttling it up to get better performance. If you\'re getting a 413 error or having trouble with time outs, try throttling this setting down.', 'wp-migrate-db-pro' ), size_format( $this->get_bottleneck( 'max' ) ) ); ?>
					</div>
				</div>
				<div class="amount"></div>
				<span class="slider-success-msg"><?php _e( 'Saved', 'wp-migrate-db-pro' ); ?></span>
			</div>
			<div class="slider"></div>
		</div>

	</form>

	<form class="licence-form option-section clearfix licence-wrap" method="post" action="#settings">
		<h3><?php _e( 'Your License', 'wp-migrate-db-pro' ); ?></h3>
		<?php if ( $this->is_licence_constant() ) : ?>
		<p>
			<?php _e( 'The license key is currently defined in wp-config.php.', 'wp-migrate-db-pro' ); ?>
		</p>
		<?php else : ?>
			<?php if( ! empty( $licence ) ) :
				echo $this->get_formatted_masked_licence();
			else : ?>
			<div class="licence-not-entered">
				<input type="text" class="licence-input" autocomplete="off" />
				<button class="button register-licence" type="submit"><?php _e( 'Activate License', 'wp-migrate-db-pro' ); ?></button>
				<p class="licence-status"></p>
			</div>
			<?php endif; ?>
		<?php endif; ?>
	</form>

</div> <!-- end .settings-tab -->