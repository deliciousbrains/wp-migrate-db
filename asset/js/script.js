(function($) {
    $(document).ready(function() {
        $('#replace-guids-info-link').click(function() {
            var $div = $('#replace-guids-info');
            if ( 'none' == $div.css('display') ) {
                $div.show();
                $(this).html('show less');
                return false;
            }
            else {
                $div.hide();
                $(this).html('show more');
                return false;
            }
        });

        $('#wpmdb-sidebar').each(function() {
            var $sidebar = $(this);

            $('form', $sidebar).submit(function() {
                var $form = $(this),
                    data = $(this).serializeArray();

                $('.button', $form).attr('disabled', 'true');

                data.push({name: 'action', value: 'subscribe_submission'});

                $.post( ajaxurl, data, function(result) {
                    if (result) {
                        $('.error', $sidebar).remove();
                        $('.field.submit-button', $sidebar).before('<p class="error" style="display: none;">' + result + '</p>');
                        $('.error', $sidebar).fadeIn();
                    }
                    else {
                        $form.html('<p class="thanks">Thanks for subscribing. We promise to protect your email from weasels.</p>').fadeIn();
                        document.location.hash = '#top';
                    }
                });
                return false;
            });

            $('.field.comments textarea', $sidebar).blur(function() {
                if ($(this).val()) {
                    $(this).addClass('has-content');
                }
                else {
                    $(this).removeClass('has-content');
                }
            });
        });
    });

    var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ),
        spinner_url = admin_url + '/images/wpspin_light.gif';
    
    var spinner = new Image();
    spinner.src = spinner_url;

    $('#migrate-form').submit(function() {
        $('p.submit', this).append('<img src="' + spinner_url + '" alt="" />');
    });
})(jQuery);
