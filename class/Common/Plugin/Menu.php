<?php

namespace DeliciousBrains\WPMDB\Common\Plugin;

use DeliciousBrains\WPMDB\Common\Properties\Properties;
use DeliciousBrains\WPMDB\Container;

class Menu {

	/**
	 * @var Properties
	 */
	private $properties;
	/**
	 * @var PluginManagerBase
	 */
	private $plugin_manager_base;
	/**
	 * @var Assets
	 */
	private $assets;
	private $template;

	/**
	 * Menu constructor.
	 *
	 * @param Properties        $properties
	 * @param PluginManagerBase $plugin_manager_base
	 * @param Assets            $assets
	 */
	public function __construct(
		Properties $properties,
		PluginManagerBase $plugin_manager_base,
		Assets $assets
	) {

		$this->properties          = $properties;
		$this->plugin_manager_base = $plugin_manager_base;
		$this->assets              = $assets;

		if ( $this->properties->is_pro ) {
			$this->template = Container::getInstance()->get( 'template' );
		} else {
			$this->template = Container::getInstance()->get( 'free_template' );
		}

	}

	public function register() {
		if ( is_multisite() ) {
			add_action( 'network_admin_menu', array( $this, 'network_admin_menu' ) );
			add_action( 'admin_menu', array( $this, 'network_tools_admin_menu' ) );
		} else {
			add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		}
	}


	function network_admin_menu() {
		$title       = $this->properties->is_pro ? __( 'Migrate DB Pro', 'wp-migrate-db' ) : __( 'Migrate DB', 'wp-migrate-db' );
		$hook_suffix = add_submenu_page( 'settings.php',
			$title,
			$title,
			'manage_network_options',
			$this->properties->core_slug,
			array( $this->template, 'options_page' ) );

		add_action( 'admin_head-' . $hook_suffix, array( $this->plugin_manager_base, 'admin_head_connection_info' ) );
		add_action( 'load-' . $hook_suffix, array( $this->assets, 'load_assets' ) );
	}

	/**
	 * Add a tools menu item to sites on a Multisite network
	 *
	 */
	function network_tools_admin_menu() {
		add_management_page(
			$this->plugin_manager_base->get_plugin_title(),
			$this->plugin_manager_base->get_plugin_title(),
			'manage_network_options',
			$this->properties->core_slug,
			array(
				$this->template,
				'subsite_tools_options_page',
			)
		);
	}

	function admin_menu() {
		$title       = $this->properties->is_pro ? __( 'Migrate DB Pro', 'wp-migrate-db' ) : __( 'Migrate DB', 'wp-migrate-db' );
		$hook_suffix = add_management_page( $title,
			$title,
			'export',
			$this->properties->core_slug,
			array( $this->template, 'options_page' ) );

		add_action( 'admin_head-' . $hook_suffix, array( $this->plugin_manager_base, 'admin_head_connection_info' ) );
		add_action( 'load-' . $hook_suffix, array( $this->assets, 'load_assets' ) );
	}
}
