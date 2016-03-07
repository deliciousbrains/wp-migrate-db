(function($) {

	var doing_check_licence = false;
	var fade_duration = 650;

	var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ), spinner_url = admin_url + '/images/spinner';
	if( window.devicePixelRatio >= 2 ){
		spinner_url += '-2x';
	}
	spinner_url += '.gif';

	$(document).ready(function() {

		$('body').on('click', '.check-my-licence-again', function(e){
			e.preventDefault();
			$(this).blur();

			if( doing_check_licence ) {
				return false;
			}

			doing_check_licence = true;

			$(this).after( '<img src="' + spinner_url + '" alt="" class="check-licence-spinner" />' );

			var check_again_link = ' <a class="check-my-licence-again" href="#">' + wpmdb_update_strings.check_license_again + '</a>';

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action  	: 'wpmdb_check_licence',
					nonce		: wpmdb_nonces.check_licence
				},
				error: function(jqXHR, textStatus, errorThrown){
					doing_check_licence = false;
					$('.wpmdb-licence-error-notice').empty().html( wpmdb_update_strings.license_check_problem + check_again_link );
					$('.wpmdb-licence-error-notice').fadeOut(fade_duration).fadeIn(fade_duration);
				},
				success: function(data){
					doing_check_licence = false;
					$('.check-licence-spinner').remove();
					if ( typeof data.errors !== 'undefined' ) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.wpmdb-licence-error-notice').empty().html( msg + check_again_link );
						$('.wpmdb-licence-error-notice').fadeOut(fade_duration).fadeIn(fade_duration);
					}
					else {
						// success
						// fade out, empty wpmdb custom error content, swap back in the original wordpress upgrade message, fade in
						$('.wpmdbpro-custom-visible').fadeOut(fade_duration).empty().html($('.wpmdb-original-update-row').html()).fadeIn(fade_duration);
					}
				}
			});

		});

	});

})(jQuery);
