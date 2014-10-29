<div id="wpmdb-sidebar">

	<a class="wpmdb-banner" target="_blank" href="https://deliciousbrains.com/wp-migrate-db-pro/?utm_source=insideplugin&utm_medium=web&utm_content=sidebar&utm_campaign=freeplugin"><img src="<?php echo plugins_url( 'asset/img/wp-migrate-db-pro.jpg', $this->plugin_file_path ); ?>" width="292" height="292" alt="<?php _e( 'WP Migrate DB Pro &mdash; Push and pull your database from one WordPress install to another in 1-click.', 'wp-migrate-db' ); ?>" /></a>

	<form method="post" action="http://deliciousbrains.createsend.com/t/t/s/virn/" target="_blank" class="subscribe block">
		<h2><?php _e( 'Get 20% Off!', 'wp-migrate-db' ); ?></h2>

		<?php $user = wp_get_current_user(); ?>

		<p class="interesting">
			<?php echo wptexturize( __( "Submit your name and email and we'll send you a coupon for 20% off your upgrade to the pro version.", 'wp-migrate-db' ) ); ?>
		</p>

		<div class="field notify-name">
			<input type="text" name="cm-name" value="<?php echo trim( esc_attr( $user->first_name ) . ' ' . esc_attr( $user->last_name ) ); ?>" placeholder="<?php _e( 'Your Name', 'wp-migrate-db' ); ?>"/>
		</div>

		<div class="field notify-email">
			<input type="email" name="cm-virn-virn" value="<?php echo esc_attr( $user->user_email ); ?>" placeholder="<?php _e( 'Your Email', 'wp-migrate-db' ); ?>"/>
		</div>

		<div class="field submit-button">
			<input type="submit" class="button" value="<?php _e( 'Send me the coupon', 'wp-migrate-db' ); ?>"/>
		</div>

		<p class="promise">
			<?php _e( 'We promise we will not use your email for anything else and you can unsubscribe with 1-click anytime.', 'wp-migrate-db' ); ?>
		</p>
	</form>

	<div class="block testimonial">
		<p class="stars">
			<span class="dashicons dashicons-star-filled"></span>
			<span class="dashicons dashicons-star-filled"></span>
			<span class="dashicons dashicons-star-filled"></span>
			<span class="dashicons dashicons-star-filled"></span>
			<span class="dashicons dashicons-star-filled"></span>
		</p>

		<p class="quote">
			&#8220;<?php _e( 'WOW. WP Migrate DB Pro has made our local/live development a breeze. What a brilliant plugin. Worth every penny.', 'wp-migrate-db' ); ?>&#8221;
		</p>

		<p class="author">&mdash; Boxy Studio</p>

		<p class="via"><a target="_blank" href="https://twitter.com/BoxyStudio/status/458965600434675712">via Twitter</a></p>
	</div>
</div>