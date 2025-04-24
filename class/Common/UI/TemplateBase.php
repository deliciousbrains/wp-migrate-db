<?php

namespace DeliciousBrains\WPMDB\Common\UI;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;

class TemplateBase
{
	/**
     * @var Properties
     */
    public $props;
    /**
     * @var
     */
    public $settings;
    /**
     * @var Util
     */
    public $util;
    /**
     * @var
     */
    public $compatibility_manager;
    /**
     * @var
     */
    public $template_pro;
    /**
     * @var ProfileManager
     */
    public $profile;
    /**
     * @var Filesystem
     */
    public $filesystem;
    /**
     * @var bool
     */
    public $lock_url_find_replace_row = false;

    /**
     * @var Table
     */
    private $table;

    public function __construct(
        Settings $settings,
        Util $util,
        ProfileManager $profile,
        Filesystem $filesystem,
        Table $table,
        Properties $properties
    ) {
        $this->props      = $properties;
        $this->settings   = $settings->get_settings();
        $this->util       = $util;
        $this->profile    = $profile;
        $this->filesystem = $filesystem;

        if (is_multisite()) {
            $this->lock_url_find_replace_row = true;
        }

        $this->table = $table;
    }

    function template_compatibility()
    {
        $args = array(
            'plugin_compatibility_checked' => ($this->util->is_muplugin_installed() ? true : false),
        );
        $this->template('compatibility', 'common', $args);
    }

    function template_max_request_size()
    {
        $this->template('max-request-size', 'common');
    }

    function template_debug_info()
    {
        $this->template('debug-info', 'common');
    }

    function template_exclude_post_revisions($loaded_profile)
    {
        $args = array(
            'loaded_profile' => $loaded_profile,
        );
        $this->template('exclude-post-revisions', 'wpmdb', $args);
    }

    function template_wordpress_org_support()
    {
        $this->template('wordpress-org-support', 'wpmdb');
    }

    function template_progress_upgrade()
    {
        $this->template('progress-upgrade', 'wpmdb');
    }

    function template_sidebar()
    {
        $this->template('sidebar', 'wpmdb');
    }

    /**
     * Load Tools HTML template for tools menu on sites in a Network to help users find WPMDB in Multisite
     *
     */
    function subsite_tools_options_page()
    {
        $this->template('options-tools-subsite');
    }

    function template_part($methods, $args = false)
    {
        $methods = array_diff($methods, $this->props->unhook_templates);

        foreach ($methods as $method) {
            $method_name = 'template_' . $method;

            if (method_exists($this, $method_name)) {
                call_user_func(array($this, $method_name), $args);
            }
        }
    }

    /**
     * Returns HTML for setting a checkbox as checked depending on supplied option value.
     *
     * @param string|array $option      Options value or array containing $option_name as key.
     * @param string       $option_name If $option is an array, the key that contains the value to be checked.
     */
    public function maybe_checked($option, $option_name = '')
    {
        if (is_array($option) && !empty($option_name) && !empty($option[$option_name])) {
            $option = $option[$option_name];
        }
        echo esc_html((!empty($option) && '1' == $option) ? ' checked="checked"' : '');
    }

    public function template($template, $dir = '', $args = array(), $template_path = '')
    {
        // @TODO: Refactor to remove extract().
        extract($args, EXTR_OVERWRITE);
        $dir       = !empty($dir) ? trailingslashit($dir) : $dir;
        $base_path = !empty($template_path) ? $template_path : $this->props->template_dir;

        $path = $base_path . $dir . $template . '.php';
        include $path;
    }

    /**
     * @param        $template
     * @param string $dir
     * @param array  $args
     * @param string $template_path
     *
     * @return false|string
     *
     * @TODO !!! DO NOT USE PHP TEMPLATES GOING FORWARD !!!
     */
    public function template_to_string($template, $dir = '', $args = array(), $template_path = '')
    {
        // @TODO: Refactor to remove extract().

        if (is_array($args) && !empty($args)) {
            extract($args, EXTR_OVERWRITE);
        }

        $dir       = !empty($dir) ? trailingslashit($dir) : $dir;
        $base_path = !empty($template_path) ? $template_path : $this->props->template_dir;

        $path = $base_path . $dir . $template . '.php';

        $str = $this->render_php($path, $args);
        return $str;
    }

    public function options_page()
    {
        $this->template('options');
    }

    public function options_page_outdated_wp()
    {
        $this->template('options-page-outdated-wp');
    }

    function mixed_case_table_name_warning($migration_type)
    {
        ob_start();
        ?>
		<h4><?php _e("Warning: Mixed Case Table Names", 'wp-migrate-db'); ?></h4>

        <?php if ('pull' === $migration_type) : ?>
		<p><?php _e("Whoa! We've detected that your <b>local</b> site has the MySQL setting <code>lower_case_table_names</code> set to <code>1</code>.", 'wp-migrate-db'); ?></p>
    <?php else : ?>
		<p><?php _e("Whoa! We've detected that your <b>remote</b> site has the MySQL setting <code>lower_case_table_names</code> set to <code>1</code>.", 'wp-migrate-db'); ?></p>
    <?php endif; ?>

		<p><?php _e("As a result, uppercase characters in table names will be converted to lowercase during the migration.", 'wp-migrate-db'); ?></p>

		<p><?php printf(__('You can read more about this in <a href="%s">our documentation</a>, proceed with caution.', 'wp-migrate-db'), 'https://deliciousbrains.com/wp-migrate-db-pro/doc/mixed-case-table-names/?utm_campaign=error%2Bmessages&utm_source=MDB%2BPaid&utm_medium=insideplugin'); ?></p>
        <?php
        return wptexturize(ob_get_clean());
    }

    public function render_php($path, $args)
    {
        if(!empty($args) && is_array($args)){
            extract( $args, EXTR_OVERWRITE );
        }

        ob_start();
        include($path);
        $var = ob_get_clean();

        return $var;
    }
}
