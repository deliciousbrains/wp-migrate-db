<div class="option-section allow-remote-requests-wrap">
	<ul class="option-group">
		<li>
			<label for="allow_pull">
			<input id="allow_pull" type="checkbox" name="allow_pull"<?php echo $pull_checked; ?> />
			<?php _e( 'Accept <b>pull</b> requests allow this database to be exported and downloaded', 'wp-migrate-db' ); ?>
			</label>
		</li>
		<li>
			<label for="allow_push">
			<input id="allow_push" type="checkbox" name="allow_push"<?php echo $push_checked; ?> />
			<?php _e( 'Accept <b>push</b> requests allow this database to be overwritten', 'wp-migrate-db' ); ?>
			</label>
		</li>
		<li>
			<label for="verify_ssl" class="verify-ssl bubble">
			<input id="verify_ssl" type="checkbox" name="verify_ssl"<?php echo $verify_ssl_checked; ?> />
			<?php _e( 'Enable SSL verification', 'wp-migrate-db' ); ?>
			</label>
			<a href="#" class="general-helper replace-guid-helper js-action-link"></a>
			<div class="ssl-verify-message helper-message">
			<?php _e( 'We disable SSL verification by default because a lot of people\'s environments are not setup for it to work. For example, with XAMPP, you have to manually enable OpenSSL by editing the php.ini. Without SSL verification, an HTTPS connection is vulnerable to a man-in-the-middle attack, so we do recommend you configure your environment and enable this.', 'wp-migrate-db' ); ?>
			</div>
		</li>
	</ul>
</div>