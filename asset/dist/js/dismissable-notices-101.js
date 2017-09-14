(function( $ ) {

	//If there's an error message visible about the mu-plugins folder not being writable
	if ( 0 <  $( '.wpmdb-compat-plugin-row-error' ).length ) {
		$( '[data-slug="wp-migrate-db-pro"]' ).addClass( 'wpmdbpro-has-message' );
	}

	//For the free plugin the update class needs to be present
	$( '.wpmdbpro-custom' ).prev().addClass( 'update' );

	$( '.notice-link-plugins-page' ).click( function( e ) {
		e.preventDefault();
		var self = jQuery( this );

		wpmdb.functions.ajax_handle_dismissible_notice( wpmdb_nonces.process_notice_link, function( ele ) {
			$( ele ).closest( '.wpmdbpro-custom' ).hide();

			// remove .wpmdb-has-message class from parent TR to add the bottom border back in
			$( ele ).closest( 'tr' ).siblings( 'tr.wpmdbpro-has-message' ).removeClass( 'wpmdbpro-has-message' );
		}, self );

		$( '.wpmdbpro-custom' ).prev().removeClass( 'update' );
	} );
})( jQuery );
