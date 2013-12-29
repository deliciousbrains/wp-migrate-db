<?php
	$licence = $this->get_licence_key();
?>
<div class="addons-tab content-tab">
	<div class="addons-content">
		<?php if( empty( $_GET['install-plugin'] ) ) : ?>
			<?php if( ! empty( $licence ) ) : ?>
				<p>Fetching addon details, please wait...</p>
			<?php else : ?>
				<p>We couldn't find your license information. Please switch to the settings tab and enter your license.</p>
				<p>Once completed, you may visit this tab to view the available addons.</p>
			<?php endif; ?>
		<?php else :
			$this->install_addon( $_GET['install-plugin'] );
			endif;
		?>
	</div>
</div>