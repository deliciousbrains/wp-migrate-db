<div class="option-section slider-outer-wrapper delay-between-requests">
	<div class="clearfix slider-label-wrapper">
		<div class="slider-label"><span><?php _e( 'Delay Between Requests', 'wp-migrate-db' ); ?></span>
			<a class="general-helper slider-helper js-action-link" href="#"></a>

			<div class="slider-message helper-message">
				<?php printf( __( 'Some servers have rate limits which WP Migrate DB can hit when performing migrations. If you\'re experiencing migration failures due to server rate limits, you should set this to one or more seconds to alleviate the problem.', 'wp-migrate-db' ) ); ?>
			</div>
		</div>
		<div class="amount"></div>
		<span class="slider-success-msg"><?php _ex( 'Saved', 'The settings were saved successfully', 'wp-migrate-db' ); ?></span>
	</div>
	<div class="slider"></div>
</div>
