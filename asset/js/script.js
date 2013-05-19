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
    });

    var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ),
        spinner_url = admin_url + '/images/wpspin_light-2x.gif';

    var spinner = new Image();
    spinner.src = spinner_url;

    $('#migrate-form').submit(function() {
        $('p.submit', this).append('<img src="' + spinner_url + '" width="16" alt="" />');
    });
})(jQuery);
