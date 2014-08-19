<div class="settings-tab content-tab">
	<form method="post" id="settings-form" action="#settings" autocomplete="off">
		<?php $this->template_part( array( 'toggle_remote_requests', 'connection_info', 'compatibility', 'max_request_size' ) ); ?>
	</form>
	<?php $this->template_part( array( 'licence' ) ); ?>
</div> <!-- end .settings-tab -->