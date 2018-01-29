<div id="wpmdb-sidebar">

	<a class="wpmdb-banner" target="_blank" href="https://deliciousbrains.com/wp-migrate-db-pro/?utm_campaign=WP%2BMigrate%2BDB%2BPro%2BUpgrade&utm_source=MDB%2BFree&utm_medium=insideplugin">
		<h4><?php _e( 'Upgrade to Pro', 'wp-migrate-db' ); ?></h4>
		<p><?php _e( 'Push and pull your database from one WordPress install to another in&nbsp;1&#8209;click.', 'wp-migrate-db' ); ?></p>
	</a>

	<form method="post" action="https://deliciousbrains.com/email-subscribe/" target="_blank" class="subscribe block">
		<h2><?php _e( 'Get 20% Off!', 'wp-migrate-db' ); ?></h2>

		<?php $user = wp_get_current_user(); ?>

		<p class="interesting">
			<?php echo wptexturize( __( "Submit your name and email and we'll send you a coupon for 20% off your upgrade to the pro version.", 'wp-migrate-db' ) ); ?>
		</p>

		<div class="field">
			<input type="email" name="email" value="<?php echo esc_attr( $user->user_email ); ?>" placeholder="<?php _e( 'Your Email', 'wp-migrate-db' ); ?>"/>
		</div>

		<div class="field">
			<input type="text" name="first_name" value="<?php echo esc_attr( trim( $user->first_name ) ); ?>" placeholder="<?php _e( 'First Name', 'wp-migrate-db' ); ?>"/>
		</div>

		<div class="field">
			<input type="text" name="last_name" value="<?php echo esc_attr( trim( $user->last_name ) ); ?>" placeholder="<?php _e( 'Last Name', 'wp-migrate-db' ); ?>"/>
		</div>

		<input type="hidden" name="campaigns[]" value="4" />
		<input type="hidden" name="source" value="8" />

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
			&#8220;WOW. WP Migrate DB Pro has made our local/live development a breeze. What a brilliant plugin. Worth every penny.&#8221;
		</p>

		<p class="author">&mdash; Boxy Studio</p>

		<p class="via"><a target="_blank" href="https://twitter.com/BoxyStudio/status/458965600434675712">via Twitter</a></p>
	</div>
</div>