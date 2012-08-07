<?php
/*
WP App Store Installer for Product Integration
http://wpappstore.com/
Version: 0.2

The following code is intended for developers to include
in their themes/plugins to help distribute the WP App Store plugin.

License: GPL v2 - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
*/

if ( !class_exists( 'WP_App_Store_Installer' ) ) :

class WP_App_Store_Installer {
    public $api_url = 'https://wpappstore.com/api/client';
    public $cdn_url = 'http://cdn.wpappstore.com';
    
    public $slug = 'wp-app-store';
    
    public $run_installer = null;
	
	public $affiliate_id = '2421';
    
    public $output = array(
        'head' => '',
        'body' => ''
    );
    
    function __construct() {
		// Stop if the user doesn't have access to install themes
		if ( !current_user_can( 'install_plugins' ) ) {
			return;
		}

        // Stop if user has chosen to hide this already
        $user = wp_get_current_user();
        if ( get_user_meta( $user->ID, 'wpas_installer_hide' ) ) {
            return;
        }

        if ( defined( 'WPAS_API_URL' ) ) {
            $this->api_url = WPAS_API_URL;
        }
        
        add_action( 'admin_init', array( $this, 'handle_request' ) );
        add_action( 'admin_menu', array( $this, 'admin_menu' ) );
        
        // Plugin upgrade hooks
        add_filter( 'plugins_api', array( $this, 'plugins_api' ), 10, 3 );
    }

    function get_menu() {
        $menu = get_site_transient( 'wpas_menu' );
        if ( $menu ) return $menu;
        
        // Let's refresh the menu
        $url = $this->cdn_url . '/client/menu.json';
        $data = wp_remote_get( $url );
    
        if ( !is_wp_error( $data ) && 200 == $data['response']['code'] ) {
            $menu = json_decode( $data['body'], true );
        }
        
        // Try retrieve a backup from the last refresh time
        if ( !$menu ) {
            $menu = get_site_transient( 'wpas_menu_backup' );
        }

        // Not even a backup? Yikes, let's use the hardcoded menu
        if ( !$menu ) {
            $menu = array(
                'slug' => 'wp-app-store',
                'title' => 'WP App Store',
                'subtitle' => 'Home',
                'position' => 999,
                'submenu' => array(
                    'wp-app-store-themes' => 'Themes',
                    'wp-app-store-plugins' => 'Plugins'
                )
            );
        }
        
        set_site_transient( 'wpas_menu', $menu, 60*60*24 );
        set_site_transient( 'wpas_menu_backup', $menu );
        
        return $menu;
    }
    
    function admin_menu() {
        // Stop if the WP App Store plugin is already installed and activated
		if ( class_exists( 'WP_App_Store' ) ) {
			return;
		}
		
        // Stop if the WP App Store plugin is already installed, but not activated
		$plugins = array_keys( get_plugins() );
		foreach ( $plugins as $plugin ) {
			if ( strpos( $plugin, 'wp-app-store.php' ) !== false ) {
				return;
			}
		}

        $menu = $this->get_menu();
        
        add_menu_page( $menu['title'], $menu['title'], 'install_themes', $this->slug, array( $this, 'render_page' ), null, $menu['position'] );

        add_action( 'admin_print_styles', array( $this, 'enqueue_styles' ) );
        add_action( 'admin_head', array( $this, 'admin_head' ) );
    }
    
    function enqueue_styles() {
        wp_enqueue_style( $this->slug . '-global', $this->cdn_url . '/asset/css/client-global.css' );
    }
    
    function get_install_url() {
        return 'update.php?action=install-plugin&plugin=wp-app-store&_wpnonce=' . urlencode( wp_create_nonce( 'install-plugin_wp-app-store' ) );
    }

    function current_url() {
        $ssl = ( isset( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] == 'on' ) ? 's' : '';
        $port = ( $_SERVER['SERVER_PORT'] != '80' ) ? ':' . $_SERVER['SERVER_PORT'] : '';
        return sprintf( 'http%s://%s%s%s', $ssl, $_SERVER['SERVER_NAME'], $port, $_SERVER['REQUEST_URI'] );
    }

    function handle_request() {
        if ( !isset( $_GET['page'] ) || !preg_match( '@^' . $this->slug . '@', $_GET['page'] ) ) {
            return;
        }
        
        if ( isset( $_GET['wpas-hide'] ) ) {
            $user = wp_get_current_user();
            update_user_meta( $user->ID, 'wpas_installer_hide', '1' );
            wp_redirect( 'index.php' );
            exit;
        }
        
        $url = $this->api_url . '/installer-splash/?wpas-install-url=' . urlencode( $this->get_install_url() );
        
        $args = array(
            'sslverify' => false,
			'timeout' => 30,
            'headers' => array(
                'Referer' => $this->current_url(),
                'User-Agent' => 'PHP/' . PHP_VERSION . ' WordPress/' . get_bloginfo( 'version' )
            )
        );

        $remote = wp_remote_get( $url, $args );

        //print_r($remote);
        
        if ( is_wp_error( $remote ) || 200 != $remote['response']['code'] || !( $data = json_decode( $remote['body'], true ) ) ) {
            $this->output['body'] .= $this->get_communication_error();
        }

        $this->output['body'] .= $data['body'];
        
        $this->output['head'] .= "
            <script>
            WPAPPSTORE = {};
            WPAPPSTORE.INSTALL_URL = '" . addslashes( $this->get_install_url() ) . "';
            </script>
        ";
        
        if ( isset( $data['head'] ) ) {
            $this->output['head'] .= $data['head'];
        }
    }
    
    function get_communication_error() {
        ob_start();
        ?>
        <div class="wrap">
            <h2>Communication Error</h2>
            <p><?php _e( 'Sorry, we could not reach the WP App Store to setup the auto installer. Please try again later.' ); ?></p>
            <p><?php _e( 'In the meantime, you can check out the WP App Store at <a href="http://wpappstore.com/">http://wpappstore.com/</a>.' ); ?></p>
        </div>
        <?php
        return ob_get_clean();
    }
    
    function admin_head() {
        if ( !isset( $this->output['head'] ) ) return;
        echo $this->output['head'];
    }
    
    function render_page() {
        echo $this->output['body'];
    }
    
    function get_client_upgrade_data() {
        $info = get_site_transient( 'wpas_client_upgrade' );
        if ( $info ) return $info;
        
        $url = $this->cdn_url . '/client/upgrade.json';
        $data = wp_remote_get( $url, array( 'timeout' => 30 ) );
    
        if ( !is_wp_error( $data ) && 200 == $data['response']['code'] ) {
            if ( $info = json_decode( $data['body'], true ) ) {
                set_site_transient( 'wpas_client_upgrade', $info, 60*60*24 );
                return $info;
            }
        }
        
        return false;
    }

    function plugins_api( $api, $action, $args ) {
        if (
            'plugin_information' != $action || false !== $api
            || !isset( $args->slug ) || 'wp-app-store' != $args->slug
        ) return $api;

        $upgrade = $this->get_client_upgrade_data();
        $menu = $this->get_menu();

        if ( !$upgrade ) return $api;
		
		// Add affiliate ID to WP settings if it's not already set by another
		// theme or plugin
		if ( $this->affiliate_id && !get_site_transient( 'wpas_affiliate_id' ) ) {
			set_site_transient( 'wpas_affiliate_id', $this->affiliate_id );
		}
        
        $api = new stdClass();
        $api->name = $menu['title'];
        $api->version = $upgrade['version'];
        $api->download_link = $upgrade['download_url'];
        return $api;
    }
}

function wp_app_store_installer_init() {
    new WP_App_Store_Installer();
}

add_action( 'init', 'wp_app_store_installer_init' );    

endif;
