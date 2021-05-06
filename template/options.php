<div class="wrap wpmdb">
	<div id="wpmdb-main">
        <?php
        do_action('wpmdb_notices');
        $hide_warning = apply_filters('wpmdb_hide_set_time_limit_warning', false);
        if (false == $this->util->set_time_limit_available() && !$hide_warning) {
            ?>
			<div class="updated warning inline-message">
                <?php
                _e("<strong>PHP Function Disabled</strong> &mdash; The <code>set_time_limit()</code> function is currently disabled on your server. We use this function to ensure that the migration doesn't time out. We haven't disabled the plugin however, so you're free to cross your fingers and hope for the best. You may want to contact your web host to enable this function.", 'wp-migrate-db');
                if (function_exists('ini_get')) {
                    printf(__('Your current PHP run time limit is set to %s seconds.', 'wp-migrate-db'), ini_get('max_execution_time'));
                } ?>
			</div>
            <?php
        }
        ?>
		<!-- React mounts here -->
		<div id="root"></div>
	</div>
	<!-- end #wpmdb-main -->
</div> <!-- end .wrap -->
