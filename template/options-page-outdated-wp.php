<div class="wrap wpmdb">

    <?php /* This is a hack to get sitewide notices to appear above the visible title. https://github.com/deliciousbrains/wp-migrate-db-pro/issues/1436 */ ?>
    <h1 style="display:none;"></h1>

    <h1><?php echo esc_html($this->plugin_manager->get_plugin_title()); ?></h1>

    <p>
        <?php
        printf(
            __(
                'This version of %1$s requires WordPress %2$s+. We recommend updating WordPress, but if that\'s not an option you can download version 1.9.x of WP Migrate DB Pro from <a href="%3$s">My Account</a>.',
                'wp-migrate-db'
            ),
            esc_html($this->plugin_manager->get_plugin_title()),
            WPMDB_MINIMUM_WP_VERSION,
            'https://deliciousbrains.com/my-account/?utm_campaign=support%2Bdocs&utm_source=MDB%2BPaid&utm_medium=insideplugin'
        )
        ?>
    </p>
</div>
