(function($) {
  var doing_check_licence = false;
  var fade_duration = 650;

  var admin_url = window.ajaxurl.replace('/admin-ajax.php', '');
  var spinner_url = admin_url + '/images/spinner';
  var spinner;
  if (2 < window.devicePixelRatio) {
    spinner_url += '-2x';
  }
  spinner_url += '.gif';
  spinner = $(
    '<img src="' + spinner_url + '" alt="" class="check-licence-spinner" />'
  );

  $(document).ready(function() {
    $('body').on('click', '.check-my-licence-again', function(e) {
      e.preventDefault();
      $(this).blur();

      if (doing_check_licence) {
        return false;
      }

      doing_check_licence = true;

      $(this).hide();
      spinner.insertAfter(this);

      var check_again_link =
        ' <a class="check-my-licence-again" href="#">' +
        window.wpmdb_update_strings.check_license_again +
        '</a>';

      $.ajax({
        url: window.wpmdbAPIBase + '/check-license',
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        cache: false,
        headers: { 'X-WP-Nonce': window.wpmdb_nonces.wp_rest },
        data: JSON.stringify({
          context: 'update'
        }),
        error: function(jqXHR, textStatus, errorThrown) {
          doing_check_licence = false;
          $('.wpmdb-licence-error-notice').fadeOut(fade_duration, function() {
            $('.wpmdb-licence-error-notice')
              .empty()
              .html(
                window.wpmdb_update_strings.license_check_problem +
                  check_again_link
              )
              .fadeIn(fade_duration);
          });
        },
        success: function(result) {
          doing_check_licence = false;
          if ('undefined' !== typeof result.data.errors) {
            var msg = '';
            for (var key in result.data.errors) {
              msg += result.data.errors[key];
            }

            $('.wpmdb-licence-error-notice').fadeOut(fade_duration, function() {
              $('.check-licence-spinner').remove();
              $('.wpmdb-licence-error-notice')
                .empty()
                .html(msg)
                .fadeIn(fade_duration);
            });
          } else {
            // Success
            // Fade out, empty wpmdb custom error content, swap back in the original wordpress upgrade message, fade in
            $('.wpmdbpro-custom-visible').fadeOut(fade_duration, function() {
              $('.check-licence-spinner').remove();
              $('.wpmdbpro-custom-visible')
                .empty()
                .html($('.wpmdb-original-update-row').html())
                .fadeIn(fade_duration);
            });
          }
        }
      });
    });

    $('.wpmdbpro-custom')
      .prev()
      .addClass('wpmdbpro-has-message');
  });
})(window.jQuery);
