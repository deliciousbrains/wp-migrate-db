<?php
class WPMDBPro_Addon extends WPMDBPro_Base {
	protected $version_required;

	function __construct( $plugin_file_path ) {
		parent::__construct( $plugin_file_path );
	}

	function meets_version_requirements( $version_required ) {
		$wpmdb_pro_version = $this->get_installed_version( 'wp-migrate-db-pro/wp-migrate-db-pro.php' );
		$result = version_compare( $wpmdb_pro_version, $version_required, '>=' );
		$this->version_required = $version_required;
		if( false == $result ) $this->hook_version_requirement_actions();
		return $result;
	}

	function hook_version_requirement_actions() {
		add_action( 'wpmdb_notices', array( $this, 'version_requirement_actions' ) );
	}

	function version_requirement_actions() {
		$addon_requirement_check = get_option( 'wpmdb_addon_requirement_check', array() );
		// we only want to delete the transients once, here we keep track of which versions we've checked
		if( ! isset( $addon_requirement_check[$this->plugin_slug] ) || $addon_requirement_check[$this->plugin_slug] != $this->get_installed_version() ) {
			delete_site_transient( 'wpmdb_upgrade_data' );
			delete_site_transient( 'update_plugins' );
			$addon_requirement_check[$this->plugin_slug] = $this->get_installed_version();
			update_option( 'wpmdb_addon_requirement_check', $addon_requirement_check );
		}
		$this->version_requirement_warning();
	}

	function version_requirement_warning() { ?>
		<div class="updated warning version-requirement-warning notification-message warning-notice">
			<p>
				<strong>Update Required</strong> &mdash;
				<?php
					$wpmdb_basename = 'wp-migrate-db-pro/wp-migrate-db-pro.php';
					$addon_name = $this->get_plugin_name();
					$required = $this->version_required;
					$installed = $this->get_installed_version( $wpmdb_basename );
					$update = wp_nonce_url( network_admin_url( 'update.php?action=upgrade-plugin&plugin=wp-migrate-db-pro%2Fwp-migrate-db-pro.php' ), 'upgrade-plugin_' . $wpmdb_basename );
					echo sprintf( 'The version of %s you have installed, requires version %s of WP Migrate DB Pro. You currently have %s installed. <strong><a href="%s">Update Now</a></strong>', $addon_name, $required, $installed, $update );
				?>
			</p>
		</div>
		<?php
	}

}