<div class="settings-tab content-tab">

	<?php
		$connection_info = sprintf( "%s\r%s", site_url( '', 'https' ), $this->settings['key'] );
		$pull_checked = ( $this->settings['allow_pull'] ? ' checked="checked"' : '' );
		$push_checked = ( $this->settings['allow_push'] ? ' checked="checked"' : '' );
		$verify_ssl_checked = ( $this->settings['verify_ssl'] ? ' checked="checked"' : '' );

		$licence = $this->get_licence_key();
	?>

	<form method="post" id="settings-form" action="#settings">

		<div class="option-section allow-remote-requests-wrap">		
			<ul class="option-group">
				<li>
					<label for="allow_pull">
					<input id="allow_pull" type="checkbox" name="allow_pull"<?php echo $pull_checked; ?> />
					Accept <b>pull</b> requests allow this database to be exported and downloaded
					</label>
				</li>
				<li>
					<label for="allow_push">
					<input id="allow_push" type="checkbox" name="allow_push"<?php echo $push_checked; ?> />
					Accept <b>push</b> requests allow this database to be overwritten
					</label>
				</li>
				<li>
					<label for="verify_ssl" class="verify-ssl">
					<input id="verify_ssl" type="checkbox" name="verify_ssl"<?php echo $verify_ssl_checked; ?> />
					Enable SSL verification
					</label>
					<a href="#" class="general-helper replace-guid-helper js-action-link"></a>
					<div class="ssl-verify-message helper-message">
						We disable SSL verification by default because a lot of people's environments are not setup for it to work. For example, with XAMPP, you have to manually enable OpenSSL by editing the php.ini. Without SSL verification, an HTTPS connection is vulnerable to a man-in-the-middle attack, so we do recommend you configure your environment and enable&nbsp;this.
					</div>
				</li>
			</ul>
			
			<label for="connection_info" class="connection-info-label">Connection Info</label>
			<textarea id="connection_info" class="connection-info" readonly><?php echo $connection_info; ?></textarea>
			<div class="reset-button-wrap clearfix"><a class="button reset-api-key js-action-link">Reset API Key</a></div>
		</div>

		<div class="option-section slider-outer-wrapper">
			<div class="clearfix slider-label-wrapper">
				<div class="slider-label"><span>Maximum Request Size</span>
					<a class="general-helper slider-helper js-action-link" href="#"></a>
					<div class="slider-message helper-message">
						We've detected that your server supports requests up to <?php echo size_format( $this->get_bottleneck( 'max' ) ); ?>, but it's possible that your server has limitations that we could not detect. To be on the safe side, we set the default to 1&nbsp;MB, but you can try throttling it up to get better performance. If you're getting a 413 error or having trouble with time outs, try throttling this setting&nbsp;down.
					</div>
				</div>
				<div class="amount"></div>
				<span class="slider-success-msg">Saved</span>
			</div>
			<div class="slider"></div>
		</div>

	</form>

	<form class="licence-form option-section clearfix licence-wrap" method="post" action="#settings">
		<h3>Your License</h3>
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
				<button class="button register-licence" type="submit">Activate License</button>
				<p class="licence-status"></p>
			</div>
			<?php endif; ?>
		<?php endif; ?>
	</form>

</div> <!-- end .settings-tab -->