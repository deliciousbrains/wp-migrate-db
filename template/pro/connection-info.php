<div class="option-section connecton-info-wrap">
	<label for="connection_info" class="connection-info-label"><?php _e( 'Connection Info', 'wp-migrate-db' ); ?></label>
	<textarea id="connection_info" class="connection-info" readonly><?php echo $connection_info; ?></textarea>

	<div class="reset-button-wrap clearfix"><a class="button reset-api-key js-action-link"><?php _e( 'Reset Secret Key', 'wp-migrate-db' ); ?></a></div>
</div>