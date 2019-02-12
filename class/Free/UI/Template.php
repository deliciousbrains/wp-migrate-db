<?php

namespace DeliciousBrains\WPMDB\Free\UI;

use DeliciousBrains\WPMDB\Common\Filesystem\Filesystem;
use DeliciousBrains\WPMDB\Common\Profile\ProfileManager;
use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Common\Settings\Settings;
use DeliciousBrains\WPMDB\Common\Sql\Table;
use DeliciousBrains\WPMDB\Common\Util\Util;
use DeliciousBrains\WPMDB\Common\UI\TemplateBase;
use DeliciousBrains\WPMDB\Free\Plugin\PluginManager;

class Template extends TemplateBase {

	/**
	 * @var PluginManager
	 */
	public $plugin_manager;

	public function __construct(
		Settings $settings,
		Util $util,
		ProfileManager $profile,
		Filesystem $filesystem,
		Table $table,
		Properties $properties,
		PluginManager $plugin_manager
	) {
		$this->plugin_manager = $plugin_manager;
		parent::__construct( $settings, $util, $profile, $filesystem, $table, $properties );
	}

	public function register(){
		add_action( 'wpmdb_after_advanced_options', array( $this, 'mf_migration_form_controls' ) );
	}

	function template_import_radio_button( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'import-radio-button', 'wpmdb', $args );
	}

	function template_pull_push_radio_buttons( $loaded_profile ) {
		$args = array(
			'loaded_profile' => $loaded_profile,
		);
		$this->template( 'pull-push-radio-buttons', 'wpmdb', $args );
	}

	/**
	 * Adds the media settings to the migration setting page in core
	 */
	function mf_migration_form_controls() {
		$this->template( 'addon-upgrades', 'wpmdb', [] );
	}

}
