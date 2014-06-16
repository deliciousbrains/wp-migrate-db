<?php
class WPSDB_Addon extends WPSDB_Base {
	protected $version_required;

	function __construct( $plugin_file_path ) {
		parent::__construct( $plugin_file_path );
	}

	function get_wpsdb_basename() {
		global $wpsdb;
		return plugin_basename( $wpsdb->get_plugin_file_path() );
	}

	function meets_version_requirements( $version_required ) {
		$wpsdb_version = $this->get_installed_version( $this->get_wpsdb_basename() );
		$result = version_compare( $wpsdb_version, $version_required, '>=' );
		$this->version_required = $version_required;
		if( false == $result ) $this->hook_version_requirement_actions();
		return $result;
	}

	function hook_version_requirement_actions() {
		add_action( 'wpsdb_notices', array( $this, 'version_requirement_actions' ) );
	}

	function version_requirement_actions() {
		$addon_requirement_check = get_option( 'wpsdb_addon_requirement_check', array() );
		// we only want to delete the transients once, here we keep track of which versions we've checked
		if( ! isset( $addon_requirement_check[$this->plugin_slug] ) || $addon_requirement_check[$this->plugin_slug] != $this->get_installed_version() ) {
			delete_site_transient( 'wpsdb_upgrade_data' );
			delete_site_transient( 'update_plugins' );
			$addon_requirement_check[$this->plugin_slug] = $this->get_installed_version();
			update_option( 'wpsdb_addon_requirement_check', $addon_requirement_check );
		}
		$this->version_requirement_warning();
	}

	function version_requirement_warning() { ?>
		<div class="updated warning version-requirement-warning notification-message warning-notice">
			<p>
				<strong>Update Required</strong> &mdash;
				<?php
					$wpsdb_basename = $this->get_wpsdb_basename();
					$addon_name = $this->get_plugin_name();
					$required = $this->version_required;
					$installed = $this->get_installed_version( $wpsdb_basename );
					$update = wp_nonce_url( network_admin_url( 'update.php?action=upgrade-plugin&plugin=' . urlencode( $wpsdb_basename ) ), 'upgrade-plugin_' . $wpsdb_basename );
					echo sprintf( 'The version of %s you have installed, requires version %s of WP Migrate DB. You currently have %s installed. <strong><a href="%s">Update Now</a></strong>', $addon_name, $required, $installed, $update );
				?>
			</p>
		</div>
		<?php
	}

}
