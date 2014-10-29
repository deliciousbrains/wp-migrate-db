// global functions
var migration_complete;
var migration_complete_events;
var migrate_table_recursive;
var execute_next_step;

(function($) {

	var connection_established = false;
	var last_replace_switch = '';
	var doing_ajax = false;
	var doing_licence_registration_ajax = false;
	var doing_reset_api_key_ajax = false;
	var doing_save_profile = false;
	var doing_plugin_compatibility_ajax = false;
	var profile_name_edited = false;
	var checked_licence = false;
	var show_prefix_notice = false;
	var show_ssl_notice = false;
	var show_version_notice = false;
	var migration_completed = false;
	var currently_migrating = false;
	var dump_filename = '';
	var dump_url = '';
	var db_version = '';
	var migration_intent;
	var remote_site;
	var secret_key;
	var form_data;
	var stage;
	var elapsed_interval;
	var completed_msg;
	var tables_to_migrate = '';
	var migration_paused = false;
	var previous_progress_title;
	var previous_progress_text;
	var timer_count;
	var overall_percent;
	var migration_cancelled = false;
	var site_url = '';
	var find_replace_pairs;

	var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ), spinner_url = admin_url + '/images/spinner';

	if( window.devicePixelRatio >= 2 ){
		spinner_url += '-2x';
	}

	spinner_url += '.gif';

	window.onbeforeunload = function (e) {
		if( currently_migrating ){
			e = e || window.event;

			// For IE and Firefox prior to version 4
			if (e) {
				e.returnValue = wpmdb_strings.sure;
			}

			// For Safari
			return wpmdb_strings.sure;
		}
	};

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	function is_int(n) {
		n = parseInt(n);
		return typeof n === 'number' && n % 1 == 0;
	}

	function setup_counter() {
		timer_count = 0,
		counter_display = $('.timer'),
		label = wpmdb_strings.time_elapsed + ' ';

		elapsed_interval = setInterval(count,1000);
	}

	function display_count() {
		hours = Math.floor( timer_count / 3600 ) % 24;
		minutes = Math.floor( timer_count / 60 ) % 60;
		seconds = timer_count % 60;
		var display = label + pad(hours,2,0) + ':' + pad(minutes,2,0) + ':' + pad(seconds,2,0);
		counter_display.html(display);
	}

	function count() {
		timer_count = timer_count + 1;
		display_count();
	}

	function get_intersect(arr1, arr2) {
		var r = [], o = {}, l = arr2.length, i, v;
		for (i = 0; i < l; i++) {
			o[arr2[i]] = true;
		}
		l = arr1.length;
		for (i = 0; i < l; i++) {
			v = arr1[i];
			if (v in o) {
				r.push(v);
			}
		}
		return r;
	}

	function get_query_var( name ){
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
		return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	function maybe_show_ssl_warning( url, key, remote_scheme ) {
		var scheme = url.substr(0, url.indexOf(':'));
		if( remote_scheme != scheme && url.indexOf('https') != -1 ) {
			$('.ssl-notice').show();
			show_ssl_notice = true;
			url = url.replace('https','http');
			$('.pull-push-connection-info').val( url + "\n" + key );
			return;
		}
		show_ssl_notice = false;
		return;
	}

	function maybe_show_prefix_notice( prefix ) {
		if( prefix != wpmdb_this_prefix ) {
			$('.remote-prefix').html( prefix );
			show_prefix_notice = true;
			if( $('#pull').is(':checked') ){
				$('.prefix-notice.pull').show();
			}
			else {
				$('.prefix-notice.push').show();
			}
		}
	}

	function maybe_show_mixed_cased_table_name_warning() {
		if ( 'undefined' == typeof connection_data || false == connection_data ) {
			return;
		}

		var migration_intent = $( 'input[name=action]:checked' ).val();
		var table_intent = $( 'input[name=table_migrate_option]:checked' ).val();
		var tables_to_migrate;

		$( '.mixed-case-table-name-notice' ).hide();

		if ( 'migrate_select' == table_intent ) {
			tables_to_migrate = $( '#select-tables' ).val();
		} else {
			if ( 'push' == migration_intent || 'savefile' == migration_intent ) {
				tables_to_migrate = wpmdb_this_prefixed_tables;
			} else {
				tables_to_migrate = connection_data.prefixed_tables;
			}
		}

		if ( null === tables_to_migrate ) {
			return;
		}

		tables_to_migrate = tables_to_migrate.join( '' );

		// The table names are all lowercase, no need to display the warning.
		if ( tables_to_migrate == tables_to_migrate.toLowerCase() ) {
			return;
		}

		/*
		 * Do not display the warning if the remote lower_case_table_names does not equal "1" (i.e the only problematic setting)
		 * Applies to push/export migrations.
		 */
		if ( '1' != connection_data.lower_case_table_names && ( 'push' == migration_intent || 'savefile' == migration_intent ) ) {
			return;
		}

		/*
		 * Do not display the warning if the local lower_case_table_names does not equal "1" (i.e the only problematic setting)
		 * Only applies to pull migrations.
		 */
		if ( '1' != wpmdb_lower_case_table_names && 'pull' == migration_intent ) {
			return;
		}

		/*
		 * At this stage we've determined:
		 * 1. The source database contains at least one table that contains an uppercase character.
		 * 2. The destination environment has lower_case_table_names set to 1.
		 * 3. The source database table containing the uppercase letter will be converted to lowercase during the migration.
		 */

		if ( 'push' == migration_intent || 'savefile' == migration_intent ) {
			$( '.mixed-case-table-name-notice.push' ).show();
		} else {
			$( '.mixed-case-table-name-notice.pull' ).show();
		}
	}

	function get_domain_name( url ){
		var temp_url = url;
		var domain = temp_url.replace( /\/\/(.*)@/, '//' ).replace('http://','').replace('https://','').replace('www.','');
		return domain;
	}

	function get_migration_status_label( url, intent, stage ){
		var domain = get_domain_name(url);
		var migrating_stage_label, completed_stage_label;
		if ( intent == 'pull' ) {
			migrating_stage_label = wpmdb_strings.pull_migration_label_migrating;
			completed_stage_label = wpmdb_strings.pull_migration_label_completed;
		} else {
			migrating_stage_label = wpmdb_strings.push_migration_label_migrating;
			completed_stage_label = wpmdb_strings.push_migration_label_completed;
		}

		migrating_stage_label = migrating_stage_label.replace( '%s', domain );
		completed_stage_label = completed_stage_label.replace( '%s', domain );

		if ( 'migrating' == stage ) {
			return migrating_stage_label;
		} else {
			return completed_stage_label;
		}
	}

	function remove_protocol( url ) {
		return url.replace(/^https?:/i, "");
	}

	function disable_export_type_controls() {
		$('.option-group').each(function(index){
			$('input', this).attr('disabled','disabled');
			$('label', this).css('cursor','default');
		});
	}

	function enable_export_type_controls() {
		$('.option-group').each(function(index){
			$('input', this).removeAttr('disabled');
			$('label', this).css('cursor','pointer');
		});
	}

	$(document).ready(function() {

		$('#plugin-compatibility').change(function(e){
			var install = '1';
			if ( $(this).is(':checked') ) {
				var answer = confirm( wpmdb_strings.mu_plugin_confirmation );

				if( ! answer ){
					$(this).prop('checked',false);
					return;
				}
			}
			else {
				install = '0';
			}

			$('.plugin-compatibility-wrap').toggle();

			$(this).parent().append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
			$('#plugin-compatibility').attr('disabled','disabled');
			$('.plugin-compatibility').addClass('disabled');

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action 					: 'wpmdb_plugin_compatibility',
					install 				: install,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.plugin_compatibility_settings_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText );
					$('.ajax-spinner').remove();
					$('#plugin-compatibility').removeAttr('disabled');
					$('.plugin-compatibility').removeClass('disabled');
				},
				success: function(data){
					if( '' != $.trim( data ) ) {
						alert( data );
					}
					else {
						$('.plugin-compatibility').append('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
						$('.ajax-success-msg').fadeOut(2000,function(){
							$(this).remove();
						});
					}
					$('.ajax-spinner').remove();
					$('#plugin-compatibility').removeAttr('disabled');
					$('.plugin-compatibility').removeClass('disabled');
				}
			});

		});

		if ( $('#plugin-compatibility').is(':checked') ){
			$('.plugin-compatibility-wrap').show();
		}

		if ( navigator.userAgent.indexOf('MSIE') > 0 || navigator.userAgent.indexOf('Trident') > 0 ) {
			$('.ie-warning').show();
		}

		if ( 0 == wpmdb_valid_licence ) {
			$('#savefile').prop("checked", true);
		}

		$('.slider').slider({
			range: 	'min',
			value: 	wpmdb_max_request / 1024,
			min: 	512,
			max: 	wpmdb_bottleneck / 1024,
			step:  512,
			slide: function( event, ui ) {
				$('.amount').html( wpmdb_add_commas( ui.value ) + ' kB' );
			},
			change: function( event, ui ) {
				$('.amount').after( '<img src="' + spinner_url + '" alt="" class="slider-spinner general-spinner" />' );
				$('.slider').slider('disable');
				$.ajax({
					url: 		ajaxurl,
					type: 		'POST',
					dataType:	'json',
					cache: 	false,
					data: {
						action				:	'wpmdb_update_max_request_size',
						max_request_size	: 	parseInt( ui.value ),
						nonce				:	wpmdb_nonces.update_max_request_size,
					},
					error: function(jqXHR, textStatus, errorThrown){
						$('.slider').slider('enable');
						$('.slider-spinner').remove();
						alert( wpmdb_strings.max_request_size_problem );
					},
					success: function(data){
						$('.slider').slider('enable');
						$('.slider-spinner').remove();
						$('.slider-success-msg').show();
						$('.slider-success-msg').fadeOut(2000,function(){
							$(this).hide();
						});
					}
				});
			}
		});
		$('.amount').html( wpmdb_add_commas( $('.slider').slider('value') ) + ' kB' );

		var progress_content_original = $('.progress-content').clone();
		$('.progress-content').remove();

		var push_select = $('#select-tables').clone();
		var pull_select = $('#select-tables').clone();
		var push_post_type_select = $('#select-post-types').clone();
		var pull_post_type_select = $('#select-post-types').clone();
		var push_select_backup = $('#select-backup').clone();
		var pull_select_backup = $('#select-backup').clone();

		$('.help-tab .video').each(function() {
			var $container = $(this),
				$viewer = $('.video-viewer');

			$('a', this).click(function(e) {
				e.preventDefault();

				$viewer.attr('src', '//www.youtube.com/embed/' + $container.data('video-id') + '?autoplay=1');
				$viewer.show();
				var offset = $viewer.offset();
				$(window).scrollTop(offset.top - 50);
			});
		});

		$('.backup-options').show();
		$('.keep-active-plugins').show();
		if( $('#savefile').is(':checked') ){
			$('.backup-options').hide();
			$('.keep-active-plugins').hide();
		}

		function check_licence( licence ){
			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action	:	'wpmdb_check_licence',
					licence	:	licence,
					nonce	:	wpmdb_nonces.check_licence,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.license_check_problem );
				},
				success: function(data){
					if ( typeof data.dbrains_api_down !== 'undefined' ) {
						$('.support-content').empty().html( data.dbrains_api_down + data.message );
						$('.addons-content').empty().html( data.dbrains_api_down );
					}
					else if ( typeof data.errors !== 'undefined') {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.support-content').empty().html( msg );
						$('.addons-content').empty().html( msg );
					}
					else {
						$('.support-content').empty().html(data.message);
						$('.addons-content').empty().html(data.addon_content);
					}
				}
			});
		}

		// automatically validate connnection info if we're loading a saved profile
		establish_remote_connection_from_saved_profile();

		function establish_remote_connection_from_saved_profile(){
			var action = $('input[name=action]:checked').val();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			if( typeof wpmdb_default_profile == 'undefined' || wpmdb_default_profile == true || action == 'savefile' || doing_ajax || ! wpmdb_is_pro ){
				return;
			}

			last_replace_switch = action;

			doing_ajax = true;
			disable_export_type_controls();

			$('.connection-status').html( wpmdb_strings.establishing_remote_connection );
			$('.connection-status').removeClass( 'notification-message error-notice migration-error' );
			$('.connection-status').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );

			var intent = $('input[name=action]:checked').val();

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action	:	'wpmdb_verify_connection_to_remote_site',
					url		:	connection_info[0],
					key		:	connection_info[1],
					intent	:	intent,
					nonce	:	wpmdb_nonces.verify_connection_to_remote_site,
					convert_post_type_selection		: wpmdb_convert_post_type_selection,
					profile							: wpmdb_profile
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.connection-status').html( getAjaxErrors( jqXHR.responseText, '(#102)', jqXHR ) );
					$('.connection-status').addClass( 'notification-message error-notice migration-error' );
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.connection-status').html( data.body );
						$('.connection-status').addClass( 'notification-message error-notice migration-error' );

						if( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$('.basic-access-auth-wrapper').show();
						}

						return;
					}

					maybe_show_ssl_warning( connection_info[0], connection_info[1], data.scheme );
					maybe_show_prefix_notice( data.prefix );

					$('.pull-push-connection-info').addClass('temp-disabled');
					$('.pull-push-connection-info').attr('readonly','readonly');
					$('.connect-button').hide();

					$('.connection-status').hide();
					$('.step-two').show();
					connection_established = true;
					connection_data = data;
					move_connection_info_box();

					maybe_show_mixed_cased_table_name_warning();

					var loaded_tables = '';
					if( wpmdb_default_profile == false && typeof wpmdb_loaded_tables != 'undefined' ){
						loaded_tables = wpmdb_loaded_tables;
					}

					var table_select = document.createElement('select');
					$(table_select).attr({
						multiple	: 'multiple',
						name		: 'select_tables[]',
						id			: 'select-tables',
						class		: 'multiselect'
					});

					$.each(connection_data.tables, function(index, value) {
						var selected = $.inArray( value, loaded_tables );
						if( selected != -1 ){
							selected = ' selected="selected" ';
						}
						else{
							selected = ' ';
						}
						$(table_select).append('<option' + selected + 'value="' + value  + '">' +  value + ' (' + connection_data.table_sizes_hr[value]  + ')</option>');
					});

					pull_select = table_select;

					var loaded_post_types = '';
					if( wpmdb_default_profile == false && typeof wpmdb_loaded_post_types != 'undefined' ){
						if ( typeof data.select_post_types != 'undefined' ) {
							$('#exclude-post-types').attr('checked','checked');
							$('.post-type-select-wrap').show();
							loaded_post_types = data.select_post_types;
					}
						else {
							loaded_post_types = wpmdb_loaded_post_types;
						}
					}

					var post_type_select = document.createElement('select');
					$(post_type_select).attr({
						multiple	: 'multiple',
						name		: 'select_post_types[]',
						id			: 'select-post-types',
						class		: 'multiselect'
					});

					$.each(connection_data.post_types, function(index, value) {
						var selected = $.inArray( value, loaded_post_types );
						if( selected != -1 || ( wpmdb_convert_exclude_revisions == true && value != 'revision' ) ){
							selected = ' selected="selected" ';
						}
						else{
							selected = ' ';
						}
						$(post_type_select).append('<option' + selected + 'value="' + value  + '">' +  value + '</option>');
					});

					pull_post_type_select = post_type_select;

					var loaded_tables_backup = '';
					if( wpmdb_default_profile == false && typeof wpmdb_loaded_tables_backup != 'undefined' ){
						loaded_tables_backup = wpmdb_loaded_tables_backup;
					}

					var table_select_backup = document.createElement('select');
					$(table_select_backup).attr({
						multiple	: 'multiple',
						name		: 'select_backup[]',
						id			: 'select-backup',
						class		: 'multiselect'
					});

					$.each(connection_data.tables, function(index, value) {
						var selected = $.inArray( value, loaded_tables_backup );
						if( selected != -1 ){
							selected = ' selected="selected" ';
						}
						else{
							selected = ' ';
						}
						$(table_select_backup).append('<option' + selected + 'value="' + value  + '">' +  value + ' (' + connection_data.table_sizes_hr[value]  + ')</option>');
					});

					push_select_backup = table_select_backup;

					if( $('#pull').is(':checked') ){
						$('#select-tables').remove();
						$('.select-tables-wrap').prepend(pull_select);
						$('#select-post-types').remove();
						$('.select-post-types-wrap').prepend(pull_post_type_select);
						$('#select-backup').remove();
						$('.backup-tables-wrap').prepend(pull_select_backup);
						$('.table-prefix').html(data.prefix);
						$('.uploads-dir').html(wpmdb_this_uploads_dir);
					}
					else {
						$('#select-backup').remove();
						$('.backup-tables-wrap').prepend(push_select_backup);
					}

					$.wpmdb.do_action( 'verify_connection_to_remote_site', connection_data );
				}

			});

		}

		// add to <a> tags which act as JS event buttons, will not jump page to top and will deselect the button
		$('body').on('click','.js-action-link',function(e){
			e.preventDefault();
			$(this).blur();
		});


		function enable_pro_licence( data, licence_key ) {
			$('.licence-input, .register-licence').remove();
			$('.licence-not-entered').prepend( data.masked_licence );
			$('.support-content').empty().html('<p>' + wpmdb_strings.fetching_license + '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" /></p>');
			check_licence( licence_key );

			$('.migrate-selection label').removeClass('disabled');
			$('.migrate-selection input').removeAttr('disabled');
		}

		// registers your licence
		$('.licence-form').submit(function(e){
			e.preventDefault();

			if( doing_licence_registration_ajax ){
				return;
			}

			$('.licence-status').removeClass( 'notification-message error-notice success-notice' );

			var licence_key = $.trim( $('.licence-input').val() );

			if( licence_key == '' ){
				$('.licence-status').addClass( 'notification-message error-notice' );
				$('.licence-status').html( wpmdb_strings.enter_license_key );
				return;
			}

			$('.licence-status').empty().removeClass('success');
			doing_licence_registration_ajax = true;
			$('.button.register-licence').after( '<img src="' + spinner_url + '" alt="" class="register-licence-ajax-spinner general-spinner" />' );

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'JSON',
				cache: 	false,
				data: {
					action 		:	'wpmdb_activate_licence',
					licence_key	:	licence_key,
					nonce		:	wpmdb_nonces.activate_licence,
				},
				error: function(jqXHR, textStatus, errorThrown){
					doing_licence_registration_ajax = false;
					$('.register-licence-ajax-spinner').remove();
					$('.licence-status').html( wpmdb_strings.register_license_problem );
				},
				success: function(data){
					doing_licence_registration_ajax = false;
					$('.register-licence-ajax-spinner').remove();

					if ( typeof data.errors !== 'undefined' ) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.licence-status').html(msg);

						if ( typeof data.masked_licence !== 'undefined' ) {
							enable_pro_licence( data, licence_key );
							$('.migrate-tab .invalid-licence').hide();
						}
					}
					else if ( typeof data.wpmdb_error !== 'undefined' && typeof data.body !== 'undefined' ) {
						$('.licence-status').html( data.body );
					}
					else {
						$('.licence-status').html( wpmdb_strings.license_registered ).delay(5000).fadeOut(1000);
						$('.licence-status').addClass('success notification-message success-notice');
						enable_pro_licence( data, licence_key );
						$('.invalid-licence').hide();
					}
				}
			});

		});

		// clears the debug log
		$('.clear-log').click(function(){
			$('.debug-log-textarea').val('');
			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action	:	'wpmdb_clear_log',
					nonce	:	wpmdb_nonces.clear_log,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.clear_log_problem );
				},
				success: function(data){
				}
			});
		});

		// updates the debug log when the user switches to the help tab
		function refresh_debug_log(){
			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action	:	'wpmdb_get_log',
					nonce	:	wpmdb_nonces.get_log,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.update_log_problem );
				},
				success: function(data){
					$('.debug-log-textarea').val(data);
				}
			});
		}

		// select all tables
		$('.multiselect-select-all').click(function(){
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).attr('selected',1);
			$(multiselect).focus().trigger('change');
		});

		// deselect all tables
		$('.multiselect-deselect-all').click(function(){
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).removeAttr('selected');
			$(multiselect).focus().trigger('change');
		});

		// invert table selection
		$('.multiselect-invert-selection').click(function(){
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).each(function(){
				$(this).attr('selected', ! $(this).attr('selected'));
			});
			$(multiselect).focus().trigger('change');
		});

		// on option select hide all "advanced" option divs and show the correct div for the option selected
		$('.option-group input[type=radio]').change(function() {
			group = $(this).closest('.option-group');
			$('ul', group).hide();
			parent = $(this).closest('li');
			$('ul', parent).show();
		});

		// on page load, expand hidden divs for selected options (browser form cache)
		$('.option-group').each(function(){
			$('.option-group input[type=radio]').each(function(){
				if( $(this).is(':checked') ){
					parent = $(this).closest('li');
					$('ul', parent).show();
				}
			});
		});

		// expand and collapse content on click
		$('.header-expand-collapse').click(function(){
			if( $('.expand-collapse-arrow', this).hasClass('collapsed') ){
				$('.expand-collapse-arrow', this).removeClass('collapsed');
				$(this).next().show();
			}
			else{
				$('.expand-collapse-arrow', this).addClass('collapsed');
				$(this).next().hide();
			}
		});

		$('.checkbox-label input[type=checkbox]').change(function() {
			if( $(this).is(':checked') ){
				$(this).parent().next().show();
			}
			else {
				$(this).parent().next().hide();
			}
		});

		// special expand and collapse content on click for save migration profile
		$('#save-migration-profile').change(function() {
			if( $(this).is(':checked') ){
				$('.save-settings-button').show();
				$('.migrate-db .button-primary').val(wpmdb_strings.migrate_db_save);
			}
			else{
				$('.save-settings-button').hide();
				$('.migrate-db .button-primary').val(wpmdb_strings.migrate_db);
			}
		});

		$('.create-new-profile').focus(function() {
			$('#create_new').prop('checked', true);
		});

		if( $('#save-migration-profile').is(':checked') ){
			$('.save-settings-button').show();
			$('.migrate-db .button-primary').val(wpmdb_strings.migrate_db_save);
		};

		$('.checkbox-label input[type=checkbox]').each(function(){
			if( $(this).is(':checked') ){
				$(this).parent().next().show();
			}
		});

		$('#new-url').change(function(){
			$('#new-url-missing-warning').hide();
		});

		$('#new-path').change(function(){
			$('#new-path-missing-warning').hide();
		});

		// AJAX migrate button
		$('.migrate-db-button').click(function(event){
			$(this).blur();
			event.preventDefault();

			// check that they've selected some tables to migrate
			if( $('#migrate-selected').is(':checked') && $('#select-tables').val() == null ){
				alert( wpmdb_strings.please_select_one_table );
				return;
			}

			new_url_missing = false;
			new_file_path_missing = false;
			if ( $('#new-url').length && !$('#new-url').val() ) {
				$('#new-url-missing-warning').show();
				$('#new-url').focus();
				$('html,body').scrollTop(0);
				new_url_missing = true;
			}

			if ( $('#new-path').length && !$('#new-path').val() ) {
				$('#new-path-missing-warning').show();
				if ( false == new_url_missing ) {
					$('#new-path').focus();
					$('html,body').scrollTop(0);
				}
				new_file_path_missing = true;
			}

			if ( true == new_url_missing || true == new_file_path_missing ) return;

			// also save profile
			if( $('#save-migration-profile').is(':checked') ){

				if( $.trim( $('.create-new-profile').val() ) == '' && $('#create_new').is(':checked') ){
					alert( wpmdb_strings.enter_name_for_profile );
					$('.create-new-profile').focus();
					return;
				}

				var create_new_profile = false;

				if( $('#create_new').is(':checked') ){
					create_new_profile = true;
				}
				var profile_name = $('.create-new-profile').val();

				profile = $('#migrate-form').serialize();

				$.ajax({
					url: 		ajaxurl,
					type: 		'POST',
					dataType:	'text',
					cache: 		false,
					data: {
						action	:	'wpmdb_save_profile',
						profile	:	profile,
						nonce	:	wpmdb_nonces.save_profile,
					},
					error: function(jqXHR, textStatus, errorThrown){
						alert( wpmdb_strings.save_profile_problem );
					},
					success: function(data){
						if(create_new_profile){
							var new_profile_key = parseInt(data, 10);
							var new_profile_id = new_profile_key + 1;
							var new_li = '<li><span style="display: none;" class="delete-profile" data-profile-id="' + new_profile_id  + '"></span><label for="profile-' + new_profile_id  + '"><input id="profile-' + new_profile_id  + '" value="' + new_profile_key + '" name="save_migration_profile_option" type="radio"> ' + profile_name + '</label></li>';
							$('#create_new').parents('li').before(new_li);
							$('#profile-' + new_profile_id).attr('checked','checked');
							$('.create-new-profile').val('');
						}
					}
				});
			}

			form_data = $('#migrate-form').serialize();

			var doc_height = $(document).height();

			$('body').append('<div id="overlay"></div>');

			$('#overlay')
				.height(doc_height)
				.css({
				'position': 'fixed',
				'top': 0,
				'left': 0,
				'width': '100%',
				'z-index': 99999,
				'display': 'none',
			});

			$progress_content = progress_content_original.clone();
			migration_intent = $('input[name=action]:checked').val();

			stage = 'backup';

			if( migration_intent == 'savefile' ){
				stage = 'migrate';
			}

			if( $('#create-backup').is(':checked') == false ){
				stage = 'migrate';
			}

			var table_intent = $('input[name=table_migrate_option]:checked').val();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			var table_rows = '';

			remote_site = connection_info[0];
			secret_key = connection_info[1];

			var static_migration_label = '';

			$('#overlay').after($progress_content);

			completed_msg = wpmdb_strings.exporting_complete;

			if( migration_intent == 'savefile' ){
				static_migration_label = wpmdb_strings.exporting_please_wait;
			}
			else{
				static_migration_label = get_migration_status_label(remote_site, migration_intent, 'migrating');
				completed_msg = get_migration_status_label(remote_site, migration_intent, 'completed');
			}

			$('.progress-title').html(static_migration_label);

			$('#overlay').show();
			backup_option = $('input[name=backup_option]:checked').val();
			table_option = $('input[name=table_migrate_option]:checked').val();

			if( stage == 'backup' ) {
				if( table_option == 'migrate_only_with_prefix' && backup_option == 'backup_selected' ) {
					backup_option = 'backup_only_with_prefix';
				}
				if( migration_intent == 'push' ){
					table_rows = connection_data.table_rows;
					if( backup_option == 'backup_only_with_prefix' ) {
						tables_to_migrate = connection_data.prefixed_tables;
					}
					else if( backup_option == 'backup_selected' ) {
						selected_tables = $('#select-tables').val();
						tables_to_migrate = get_intersect( selected_tables, connection_data.tables );
					}
					else if( backup_option == 'backup_manual_select' ) {
						tables_to_migrate = $('#select-backup').val();
					}
				}
				else{
					table_rows = wpmdb_this_table_rows;
					if( backup_option == 'backup_only_with_prefix' ) {
						tables_to_migrate = wpmdb_this_prefixed_tables;
					}
					else if( backup_option == 'backup_selected' ) {
						selected_tables = $('#select-tables').val();
						tables_to_migrate = get_intersect( selected_tables, wpmdb_this_tables );
					}
					else if( backup_option == 'backup_manual_select' ) {
						tables_to_migrate = $('#select-backup').val();
					}
				}
			}
			else {
				if( table_intent == 'migrate_select' ){ // user has elected to migrate only certain tables
					// grab tables as per what the user has selected from the multiselect box
					tables_to_migrate = $('#select-tables').val();
					// user is pushing or exporting
					if( migration_intent == 'push' || migration_intent == 'savefile' ){
						// default value, assuming we're not backing up
						table_rows = wpmdb_this_table_rows;
					}
					else{
						table_rows = connection_data.table_rows;
					}
				}
				else{
					if( migration_intent == 'push' || migration_intent == 'savefile' ){
						tables_to_migrate = wpmdb_this_prefixed_tables;
						table_rows = wpmdb_this_table_rows;
					}
					else{
						tables_to_migrate = connection_data.prefixed_tables;
						table_rows = connection_data.table_rows;
					}
				}
			}

			function decide_tables_to_display_rows( tables_to_migrate, table_rows ){

				var total_size = 0;
				$.each(tables_to_migrate, function(index, value) {
					total_size += parseInt(table_rows[value]);
				});

				var last_element = '';
				$.each(tables_to_migrate, function(index, value) {
					var percent = table_rows[value] / total_size * 100;
					var percent_rounded = Math.round(percent*1000)/1000;
					$('.progress-tables').append('<div class="progress-chunk ' + value + '_chunk" style="width: ' + percent_rounded + '%;" title="' + value + '"><span>' + value + '</span></div>');
					$('.progress-tables-hover-boxes').append('<div class="progress-chunk-hover" data-table="' + value + '" style="width: ' + percent_rounded + '%;"></div>');
					var label = $('.progress-tables .progress-chunk:last span');
					last_element = value;
				});

				$('.progress-chunk').each(function(index){
					if( $(this).width() < 1 && tables_to_migrate[index] != last_element ){
						$(this).hide();
						$('.progress-chunk-hover[data-table=' + tables_to_migrate[index] + ']').hide();
						table_rows[last_element] = Number(table_rows[last_element]);
						table_rows[last_element] += Number(table_rows[tables_to_migrate[index]]);
						table_rows[tables_to_migrate[index]] = 0;
					}
					var element = this;
					setTimeout(function(){
						hide_overflowing_elements(element);
					}, 0);

					function hide_overflowing_elements(element){
						if( $('span', element).innerWidth() > $(element).width() ){
							$('span', element).hide();
						}
					}

				});

				percent_rounded = 0;
				if( table_rows[last_element] != 0 ){
					var percent = table_rows[last_element] / total_size * 100;
					var percent_rounded = Math.round(percent*1000)/1000;
				}
				$('.progress-tables .progress-chunk:last').css('width',percent_rounded + '%');
				$('.progress-chunk-hover:last').css('width',percent_rounded + '%');

				var return_vals = [table_rows,total_size];

				return return_vals;

			}

			table_details = decide_tables_to_display_rows( tables_to_migrate, table_rows );
			table_rows = table_details[0];
			total_size = table_details[1];

			$('.progress-title').after( '<img src="' + spinner_url + '" alt="" class="migration-progress-ajax-spinner general-spinner" />' );

			var height = $('.progress-content').outerHeight();
			$('.progress-content').css('top', '-' + height + 'px').show().animate({'top': '0px'});

			setup_counter();
			currently_migrating = true;

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 		false,
				data: {
					action		:	'wpmdb_initiate_migration',
					intent		:	migration_intent,
					url			:	remote_site,
					key			:	secret_key,
					form_data	:	form_data,
					stage		:	stage,
					nonce		:	wpmdb_nonces.initiate_migration,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.progress-title').html(wpmdb_strings.migration_failed);
					$('.progress-text').html( getAjaxErrors( jqXHR.responseText, '(#112)', jqXHR ) );
					$('.progress-text').addClass( 'migration-error' );
					console.log( jqXHR );
					console.log( textStatus );
					console.log( errorThrown );
					migration_error = true;
					migration_complete_events();
					return;
				},
				success: function(data){
					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						migration_error = true;
						migration_complete_events();
						$('.progress-title').html( wpmdb_strings.migration_failed );
						$('.progress-text').addClass( 'migration-error' );
						$('.progress-text').html( data.body );
						return;
					}

					dump_url = data.dump_url;
					dump_path = data.dump_path;
					dump_filename = data.dump_filename;
					db_version = data.db_version;
					site_url = data.site_url;
					find_replace_pairs = data.find_replace_pairs;

					var i = 0;
					var progress_size = 0;
					overall_percent = 0;
					var table_progress = 0;
					var temp_progress = 0;
					var last_progress = 0;
					var overall_table_progress = 0;

					migrate_table_recursive = function( current_row, primary_keys ){

						if( i >= tables_to_migrate.length ){
							if( stage == 'backup' ) {
								stage = 'migrate';
								i = 0;
								progress_size = 0;
								$('.progress-bar').width('0px');

								if( table_intent == 'migrate_select' ){
									tables_to_migrate = $('#select-tables').val();
									if( migration_intent == 'push' || migration_intent == 'savefile' ){
										table_rows = wpmdb_this_table_rows;
									}
									else{
										table_rows = connection_data.table_rows;
									}
								}
								else{
									if( migration_intent == 'push' || migration_intent == 'savefile' ){
										tables_to_migrate = wpmdb_this_prefixed_tables;
										table_rows = wpmdb_this_table_rows;
									}
									else{
										tables_to_migrate = connection_data.prefixed_tables;
										table_rows = connection_data.table_rows;
									}
								}

								$('.progress-tables').empty();
								$('.progress-tables-hover-boxes').empty();

								table_details = decide_tables_to_display_rows( tables_to_migrate, table_rows );
								table_rows = table_details[0];
								total_size = table_details[1];

							}
							else {
								$('.progress-label').removeClass('label-visible');

								hooks = $.wpmdb.apply_filters( 'wpmdb_before_migration_complete_hooks', hooks );
								hooks.push( 'migration_complete' );
								hooks = $.wpmdb.apply_filters( 'wpmdb_after_migration_complete_hooks', hooks );
								hooks.push( 'migration_complete_events' );
								next_step_in_migration = { fn: wpmdb_call_next_hook };
								execute_next_step();
								return;
							}
						}

						if( stage == 'backup' ){
							$('.progress-text').html( overall_percent + '% - ' + wpmdb_strings.backing_up + ' "' + tables_to_migrate[i] + '"' );
						}
						else{
							$('.progress-text').html( overall_percent + '% - ' + wpmdb_strings.migrating + ' "' + tables_to_migrate[i] + '"');
						}

						last_table = 0;
						if( i == ( tables_to_migrate.length - 1 ) ) {
							last_table = 1;
						}

						gzip = 0;
						if( migration_intent != 'savefile' && parseInt( connection_data.gzip ) == 1 ) {
							gzip = 1;
						}

						var request_data =  {
							action 				:	'wpmdb_migrate_table',
							intent 				:	migration_intent,
							url 				:	remote_site,
							key					:	secret_key,
							table				:	tables_to_migrate[i],
							db_version			:	db_version,
							form_data			:	form_data,
							stage				:	stage,
							current_row			:	current_row,
							dump_filename		:	dump_filename,
							last_table			:	last_table,
							primary_keys		:	primary_keys,
							gzip				:	gzip,
							nonce				:	wpmdb_nonces.migrate_table,
							site_url			:	site_url,
							find_replace_pairs	:	find_replace_pairs
						};

						if( migration_intent != 'savefile' ) {
							request_data.bottleneck = connection_data.bottleneck;
							request_data.prefix = connection_data.prefix;
						}

						if( connection_data && connection_data.path_current_site && connection_data.domain ) {
							request_data.path_current_site = connection_data.path_current_site;
							request_data.domain_current_site = connection_data.domain;
						}

						doing_ajax = true;

						$.ajax({
							url: 		ajaxurl,
							type: 		'POST',
							dataType:	'text',
							cache: 		false,
							timeout:	0,
							data:		request_data,
							error: function(jqXHR, textStatus, errorThrown){
								$('.progress-title').html(wpmdb_strings.migration_failed);
								$('.progress-text').html( wpmdb_strings.table_process_problem + ' ' + tables_to_migrate[i] );
								$('.progress-text').append( '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText );
								$('.progress-text').addClass( 'migration-error' );
								doing_ajax = false;
								console.log( jqXHR );
								console.log( textStatus );
								console.log( errorThrown );
								migration_error = true;
								migration_complete_events();
								return;
							},
							success: function(data){
								doing_ajax = false;
								data = $.trim( data );
								row_information = wpmdb_parse_json( data );
								if( false == row_information || null == row_information ){
									$('.progress-title').html(wpmdb_strings.migration_failed);
									if( '' == data || null == data ) {
										$('.progress-text').html( wpmdb_strings.table_process_problem_empty_response + ' ' + tables_to_migrate[i] );
									}
									else {
										$('.progress-text').html( getAjaxErrors( data ) );
									}
									$('.progress-text').addClass('migration-error');
									migration_error = true;
									migration_complete_events();
									return;
								}

								if( typeof row_information.wpmdb_error != 'undefined' && row_information.wpmdb_error == 1 ){
									$('.progress-title').html(wpmdb_strings.migration_failed);
									$('.progress-text').addClass( 'migration-error' );
									$('.progress-text').html( row_information.body );
									migration_error = true;
									migration_complete_events();
									return;
								}

								if( row_information.current_row == '-1' ) {
									progress_size -= overall_table_progress;
									overall_table_progress = 0;
									last_progress = 0;
									progress_size += parseInt(table_rows[tables_to_migrate[i]]);
									i++;
									row_information.current_row = '';
									row_information.primary_keys = '';
								}
								else {
									temp_progress = parseInt( row_information.current_row );
									table_progress = temp_progress - last_progress;
									last_progress = temp_progress;
									progress_size += table_progress;
									overall_table_progress += table_progress;
								}
								var percent = 100 * progress_size / total_size;
								$('.progress-bar').width(percent + '%');
								overall_percent = Math.floor(percent);
								next_step_in_migration = { fn: migrate_table_recursive, args: [ row_information.current_row, row_information.primary_keys ] };
								execute_next_step();
							}
						});

					}

					next_step_in_migration = { fn: migrate_table_recursive, args: [ '-1', '' ] };
					execute_next_step();

				}

			}); // end ajax

		});

		migration_complete_events = function() {
			if( false == migration_error ) {
				if( non_fatal_errors == '' ) {
					if( 'savefile' != migration_intent && true == $('#save_computer').is(':checked') ) {
					$('.progress-text').css('visibility','hidden');
					}
					$('.progress-title').html(completed_msg).append('<div class="dashicons dashicons-yes"></div>');
				}
				else {
					$('.progress-text').html(non_fatal_errors);
					$('.progress-text').addClass('migration-error');
					$('.progress-title').html( wpmdb_strings.completed_with_some_errors );
				}

				$('.progress-bar-wrapper').hide();
			}

			$('.migration-controls').hide();

			// reset migration variables so consecutive migrations work correctly
			hooks = [];
			call_stack = [];
			migration_error = false;
			currently_migrating = false;
			migration_completed = true;
			migration_paused = false;
			migration_cancelled = false;
			doing_ajax = false;
			non_fatal_errors = '';

			$('.progress-label').remove();
			$('.migration-progress-ajax-spinner').remove();
			$('.close-progress-content').show();
			$('#overlay').css('cursor','pointer');
			clearInterval( elapsed_interval );
		}

		migration_complete = function() {
			$('.migration-controls').fadeOut();
			if( migration_intent == 'savefile' ){
				currently_migrating = false;
				var migrate_complete_text = wpmdb_strings.migration_complete;
				if( $('#save_computer').is(':checked') ){
					var url = wpmdb_this_download_url + encodeURIComponent( dump_filename );
					if( $('#gzip_file').is(':checked') ){
						url += '&gzip=1';
					}
					window.location = url;
				}
				else{
					migrate_complete_text = wpmdb_strings.completed_dump_located_at + ' ' + dump_path;
				}

				if( migration_error == false ){
					$('.progress-text').html(migrate_complete_text);
					migration_complete_events();
					$('.progress-title').html(completed_msg);
				}

			}
			else{ // rename temp tables, delete old tables
				$('.progress-text').html( wpmdb_strings.finalizing_migration );
				$.ajax({
					url: 		ajaxurl,
					type: 		'POST',
					dataType:	'text',
					cache: 		false,
					data: {
						action 				:	'wpmdb_finalize_migration',
						intent 				:	migration_intent,
						url 				:	remote_site,
						key					:	secret_key,
						form_data			:	form_data,
						prefix 				:	connection_data.prefix,
						temp_prefix			:	connection_data.temp_prefix,
						tables				:	tables_to_migrate.join(','),
						nonce				:	wpmdb_nonces.finalize_migration,
					},
					error: function(jqXHR, textStatus, errorThrown){
						$('.progress-title').html( wpmdb_strings.migration_failed );
						$('.progress-text').html( wpmdb_strings.finalize_tables_problem );
						$('.progress-text').addClass('migration-error');
						alert( jqXHR + ' : ' + textStatus + ' : ' + errorThrown );
						migration_error = true;
						migration_complete_events();
						return;
					},
					success: function(data){
						if( $.trim( data ) != '' ){
							$('.progress-title').html( wpmdb_strings.migration_failed );
							$('.progress-text').html(data);
							$('.progress-text').addClass('migration-error');
							migration_error = true;
							migration_complete_events();
							return;
						}
						next_step_in_migration = { fn: wpmdb_call_next_hook };
						execute_next_step();
					}
				});
			}

		}

		// close progress pop up once migration is completed
		$('body').on('click', '.close-progress-content-button', function(e){
			hide_overlay();
		});

		$('body').on('click', '#overlay', function(){
			if( migration_completed == true ){
				hide_overlay();
			}
		});

		function hide_overlay(){
			var height = $('.progress-content').outerHeight();
			$('.progress-content').animate({'top' : '-' + height + 'px'}, 400, 'swing', function(){ $('#overlay').remove(); $('.progress-content').remove(); } );
			migration_completed = false;
		}

		// AJAX save button profile
		$('.save-settings-button').click(function(event){
			var profile;
			$(this).blur();
			event.preventDefault();

			if( doing_save_profile ){
				return;
			}

			// check that they've selected some tables to migrate
			if( $('#migrate-selected').is(':checked') && $('#select-tables').val() == null ){
				alert( wpmdb_strings.please_select_one_table );
				return;
			}

			if( $.trim( $('.create-new-profile').val() ) == '' && $('#create_new').is(':checked') ){
				alert( wpmdb_strings.enter_name_for_profile );
				$('.create-new-profile').focus();
				return;
			}

			var create_new_profile = false;

			if( $('#create_new').is(':checked') ){
				create_new_profile = true;
			}
			var profile_name = $('.create-new-profile').val();

			doing_save_profile = true;
			profile = $('#migrate-form').serialize();

			$('.save-settings-button').after( '<img src="' + spinner_url + '" alt="" class="save-profile-ajax-spinner general-spinner" />' );
			$(this).attr('disabled','disabled');

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 		false,
				data: {
					action	:	'wpmdb_save_profile',
					profile	:	profile,
					nonce	:	wpmdb_nonces.save_profile,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.save_profile_problem );
					$('.save-settings-button').removeAttr('disabled');
					$('.save-profile-ajax-spinner').remove();
					$('.save-settings-button').after('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
					doing_save_profile = false;
				},
				success: function(data){
					$('.save-settings-button').removeAttr('disabled');
					$('.save-profile-ajax-spinner').remove();
					$('.save-settings-button').after('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
					doing_save_profile = false;
					$('.create-new-profile').val('');

					if(create_new_profile){
						var new_profile_key = parseInt(data, 10);
						var new_profile_id = new_profile_key + 1;
						var new_li = $('<li><span style="display: none;" class="delete-profile" data-profile-id="' + new_profile_id + '"></span><label for="profile-' + new_profile_id + '"><input id="profile-' + new_profile_id + '" value="' + new_profile_key + '" name="save_migration_profile_option" type="radio"></label></li>');
						new_li.find("label").append( document.createTextNode( " " + profile_name ) );

						$('#create_new').parents('li').before(new_li);
						$('#profile-' + new_profile_id).attr('checked','checked');
					}

				}
			});

		});

		// progress label updating
		$('body').on('mousemove', '.progress-chunk-hover', function(e) {
			mX = e.pageX;
			offset = $('.progress-bar-wrapper').offset();
			label_offset = $('.progress-label').outerWidth() / 2;
			mX = ( mX - offset.left ) - label_offset;
			$('.progress-label').css('left', mX + 'px');
			$('.progress-label').html($(this).attr('data-table'));
		});

		// show / hide progress lavel on hover
		$('body').on('mouseenter mouseleave', '.progress-chunk-hover', function(event) {
			if( event.type === 'mouseenter' ){
				$('.progress-label').addClass('label-visible');
			}
			else{
				$('.progress-label').removeClass('label-visible');
			}
		});

		// move around textarea depending on whether or not the push/pull options are selected
		connection_info_box = $('.connection-info-wrapper');
		move_connection_info_box();

		$('.migrate-selection.option-group input[type=radio]').change(function() {
			move_connection_info_box();
			if( connection_established ){
				change_replace_values();
			}
		});

		// save file (export) / push / pull special conditions
		function move_connection_info_box(){
			$('.connection-status').hide();
			$('.prefix-notice').hide();
			$('.ssl-notice').hide();
			$('.different-plugin-version-notice').hide();
			$('.step-two').show();
			$('.backup-options').show();
			$('.keep-active-plugins').show();
			$('.directory-permission-notice').hide();
			$('#create-backup').removeAttr('disabled');
			$('#create-backup-label').removeClass('disabled');
			$('.backup-option-disabled').hide();
			$('.directory-scope').hide();
			$('.compatibility-older-mysql').hide();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			if( $('#pull').is(':checked') ){
				$('.pull-list li').append( connection_info_box );
				connection_info_box.show();
				if( connection_established ){
					$('.connection-status').hide();
					$('.step-two').show();
					$('.table-prefix').html(connection_data.prefix);
					$('.uploads-dir').html(wpmdb_this_uploads_dir);
					if( profile_name_edited == false ){
						var profile_name = get_domain_name( connection_data.url );
						$('.create-new-profile').val(profile_name);
					}
					if( show_prefix_notice == true ) {
						$('.prefix-notice.pull').show();
					}
					if( show_ssl_notice == true ) {
						$('.ssl-notice').show();
					}
					if( show_version_notice == true ) {
						$('.different-plugin-version-notice').show();
						$('.step-two').hide();
					}
					$('.directory-scope.pull').show();
					if( false == wpmdb_write_permission ) {
						$('#create-backup').prop('checked',false);
						$('#create-backup').attr('disabled','disabled');
						$('#create-backup-label').addClass('disabled');
						$('.backup-option-disabled').show();
						$('.upload-directory-location').html(wpmdb_this_upload_dir_long);
					}
				}
				else{
					$('.connection-status').show();
					$('.step-two').hide();
				}
			}
			else if( $('#push').is(':checked') ){
				$('.push-list li').append( connection_info_box );
				connection_info_box.show();
				if( connection_established ){
					$('.connection-status').hide();
					$('.step-two').show();
					$('.table-prefix').html(wpmdb_this_prefix);
					$('.uploads-dir').html(connection_data.uploads_dir);
					if( profile_name_edited == false ){
						var profile_name = get_domain_name( connection_data.url );
						$('.create-new-profile').val(profile_name);
					}
					if( show_prefix_notice == true ) {
						$('.prefix-notice.push').show();
					}
					if( show_ssl_notice == true ) {
						$('.ssl-notice').show();
					}
					if( show_version_notice == true ) {
						$('.different-plugin-version-notice').show();
						$('.step-two').hide();
					}
					$('.directory-scope.push').show();
					if( '0' == connection_data.write_permissions ) {
						$('#create-backup').prop('checked',false);
						$('#create-backup').attr('disabled','disabled');
						$('#create-backup-label').addClass('disabled');
						$('.backup-option-disabled').show();
						$('.upload-directory-location').html(connection_data.upload_dir_long);
					}
				}
				else{
					$('.connection-status').show();
					$('.step-two').hide();
				}
			}
			else if( $('#savefile').is(':checked') ){
				$('.connection-status').hide();
				$('.step-two').show();
				$('.table-prefix').html(wpmdb_this_prefix);
				$('.compatibility-older-mysql').show();
				if( profile_name_edited == false ){
					$('.create-new-profile').val('');
				}
				$('.backup-options').hide();
				$('.keep-active-plugins').hide();
				if( false == wpmdb_write_permission ) {
					$('.directory-permission-notice').show();
					$('.step-two').hide();
				}
			}
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action( 'move_connection_info_box' );
		}

		function change_replace_values(){
			if( $('#push').is(':checked') || $('#savefile').is(':checked') ){
				if( last_replace_switch == '' || last_replace_switch == 'pull' ){
					$('.replace-row').each(function(){
						var old_val = $('.old-replace-col input', this).val();
						$('.old-replace-col input', this).val( $('.replace-right-col input', this).val() );
						$('.replace-right-col input', this).val( old_val );
					});
				}
				$('#select-tables').remove();
				$('.select-tables-wrap').prepend(push_select);
				$('#select-post-types').remove();
				$('.select-post-types-wrap').prepend(push_post_type_select);
				$('#select-backup').remove();
				$('.backup-tables-wrap').prepend(push_select_backup);
				last_replace_switch = 'push';
			}
			else if( $('#pull').is(':checked') ){
				if( last_replace_switch == '' || last_replace_switch == 'push' ){
					$('.replace-row').each(function(){
						var old_val = $('.old-replace-col input', this).val();
						$('.old-replace-col input', this).val( $('.replace-right-col input', this).val() );
						$('.replace-right-col input', this).val( old_val );
					});
				}
				$('#select-tables').remove();
				$('.select-tables-wrap').prepend(pull_select);
				$('#select-post-types').remove();
				$('.select-post-types-wrap').prepend(pull_post_type_select);
				$('#select-backup').remove();
				$('.backup-tables-wrap').prepend(pull_select_backup);
				last_replace_switch = 'pull';
			}

		}

		// hide second section if pull or push is selected with no connection established
		if( ( $('#pull').is(':checked') || $('#push').is(':checked') ) && ! connection_established  ){
			$('.step-two').hide();
			$('.connection-status').show();
		}

		// show / hide GUID helper description
		$('.general-helper').click(function(e){
			e.preventDefault();
			var icon = $(this),
				bubble = $(this).next();

			// Close any that are already open
			$('.helper-message').not(bubble).hide();

			var position = icon.position();
			if( bubble.hasClass('bottom') ) {
				bubble.css({
					'left': (position.left - bubble.width()/2) + 'px',
					'top': (position.top + icon.height() + 9) + 'px'
				});
			} else {
				bubble.css({
					'left': (position.left + icon.width() + 9) + 'px',
					'top': (position.top + icon.height()/2 - 18) + 'px'
				});
			}

			bubble.toggle();
			e.stopPropagation();
		});

		$('body').click(function(){
			$('.helper-message').hide();
		});

		$('.helper-message').click(function(e){
			e.stopPropagation();
		});

		$('body').on('click', '.show-errors-toggle', function (e) {
			e.preventDefault();
			$(this).next('.migration-php-errors').toggle();
		});

		/**
		 * Core plugin wrapper for the common AJAX error detecting method
		 *
		 * @param text
		 * @param code
		 * @param jqXHR
		 *
		 * @returns {string}
		 */
		function getAjaxErrors( text, code, jqXHR ) {
			return wpmdbGetAjaxErrors( wpmdb_strings.connection_local_server_problem, code, text, jqXHR );
		}

		// migrate / settings tabs
		$('.nav-tab').click(function(){
			$('.nav-tab').removeClass('nav-tab-active');
			$(this).addClass('nav-tab-active');
			$('.content-tab').hide();
			$('.' + $(this).attr('data-div-name')).show();

			var hash = $(this).attr('data-div-name');
			hash = hash.replace('-tab','');
			window.location.hash = hash;

			if( $(this).hasClass('help') ) {
				refresh_debug_log();
				if( checked_licence == false && wpmdb_has_licence == '1' ) {
					$('.support-content p').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
					check_licence();
					checked_licence = true;
				}
			}

			if( $(this).hasClass('addons') ) {
				if( checked_licence == false && wpmdb_has_licence == '1' ) {
					$('.addons-content p').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
					check_licence();
					checked_licence = true;
				}
			}

		});

		$('body').on('click', "a[href^='#']", function(event) {
			var href     = $(event.target).attr('href');
			var tab_name = href.substr(1);

			if (tab_name) {
				var nav_tab = $('.' + tab_name);
				if (nav_tab.length === 1) {
					nav_tab.trigger('click');
					event.preventDefault();
				}
			}
		});

		// repeatable fields
		$('body').on('click', '.add-row', function() {
			$(this).parents('tr').before( $('.original-repeatable-field').clone().removeClass('original-repeatable-field') );
		});

		// repeatable fields
		$('body').on('click', '.replace-remove-row', function() {
			$(this).parents('tr').remove();
			if( $('.replace-row').length < 2 ){
				$('.no-replaces-message').show();
			}

			prev_id = $(this).prev().attr('id');
			if ( 'new-url' == prev_id || 'new-path' == prev_id ) {
				$('#' + prev_id + '-missing-warning').hide();
			}
		});

		$('.add-replace').click(function(){
			$('.replace-fields').prepend( $('.original-repeatable-field').clone().removeClass('original-repeatable-field') );
			$('.no-replaces-message').hide();
		});

		$

		$('body').on('mouseenter mouseleave', '#find-and-replace-sort tbody tr.replace-row', function(event) {
			if( event.type === 'mouseenter' ){
				$('.replace-remove-row', this).show();
			}
			else{
				$('.replace-remove-row', this).hide();
			}
		});

		$('#find-and-replace-sort tbody').sortable({
				items: '> tr:not(.pin)',
				handle: 'td:first',
				start: function () {
				  $('.sort-handle').css('cursor', '-webkit-grabbing');
				  $('.sort-handle').css('cursor', '-moz-grabbing');
				},
				stop: function () {
				  $('.sort-handle').css('cursor', '-webkit-grab');
				  $('.sort-handle').css('cursor', '-moz-grab');
				}
		});

		// delete saved profiles
		$('body').on('mouseenter mouseleave', '.save-migration-profile-wrap li', function(event) {
			if( event.type === 'mouseenter' ){
				$('.delete-profile', this).show();
			}
			else{
				$('.delete-profile', this).hide();
			}
		});

		function validate_url( url ){
			return /^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
		}

		// check for hash in url (settings || migrate) switch tabs accordingly
		if(window.location.hash) {
			var hash = window.location.hash.substring(1);
			switch_to_plugin_tab(hash, false);
		}

		if( get_query_var( 'install-plugin' ) != '' ) {
			hash = 'addons';
			checked_licence = true;
			switch_to_plugin_tab(hash, true);
		}

		function switch_to_plugin_tab( hash, skip_addons_check ) {
			$('.nav-tab').removeClass('nav-tab-active');
			$('.nav-tab.' + hash).addClass('nav-tab-active');
			$('.content-tab').hide();
			$('.' + hash + '-tab').show();

			if ( hash == 'help' ) {
				refresh_debug_log();
				if( wpmdb_has_licence == '1' ) {
					$('.support-content p').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
					check_licence();
					checked_licence = true;
				}
			}

			if ( hash == 'addons' && true != skip_addons_check ) {
				if( wpmdb_has_licence == '1' ) {
					$('.addons-content p').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
					check_licence();
					checked_licence = true;
				}
			}
		}

		// process notice links clicks, eg. dismiss, reminder
		$('.notice-link').click(function (e) {
			e.preventDefault();
			$(this).closest('.inline-message').hide()
			$.ajax({
				url     : ajaxurl,
				type    : 'POST',
				dataType: 'text',
				cache   : false,
				data    : {
					action  : 'wpmdb_process_notice_link',
					nonce   : wpmdb_nonces.process_notice_link,
					notice  : $(this).data('notice'),
					type    : $(this).data('type'),
					reminder: $(this).data('reminder')
				}
			});
		});

		// regenerates the saved secret key
		$('.reset-api-key').click(function(){
			var answer = confirm( wpmdb_strings.reset_api_key );

			if( ! answer || doing_reset_api_key_ajax ){
				return;
			}

			doing_reset_api_key_ajax = true;
			$('.reset-api-key').after( '<img src="' + spinner_url + '" alt="" class="reset-api-key-ajax-spinner general-spinner" />' );

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action	:	'wpmdb_reset_api_key',
					nonce	:	wpmdb_nonces.reset_api_key,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.reset_api_key_problem );
					$('.reset-api-key-ajax-spinner').remove();
					doing_reset_api_key_ajax = false;
				},
				success: function(data){
					$('.reset-api-key-ajax-spinner').remove();
					doing_reset_api_key_ajax = false;
					$('.connection-info').html(data);
				}
			});

		});

		// show / hide table select box when specific settings change
		$('input.multiselect-toggle').change(function(){
			$(this).parents('.expandable-content').children('.select-wrap').toggle();
		});

		$('.show-multiselect').each(function(){
			if( $(this).is(':checked') ){
				$(this).parents('.option-section').children('.header-expand-collapse').children('.expand-collapse-arrow').removeClass('collapsed');
				$(this).parents('.expandable-content').show();
				$(this).parents('.expandable-content').children('.select-wrap').toggle();
			}
		});

		$('input[name=backup_option]').change(function(){
			$('.backup-tables-wrap').hide();
			if( $(this).val() == 'backup_manual_select' ) {
				$('.backup-tables-wrap').show();
			}
		});

		if( $('#backup-manual-select').is(':checked') ) {
			$('.backup-tables-wrap').show();
		}

		$('.plugin-compatibility-save').click(function(){
			if( doing_plugin_compatibility_ajax ) {
				return;
			}
			$(this).addClass('disabled');
			select_element = $('#selected-plugins');
			$(select_element).attr('disabled','disabled');

			doing_plugin_compatibility_ajax = true;
			$(this).after( '<img src="' + spinner_url + '" alt="" class="plugin-compatibility-spinner general-spinner" />' );

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action 					: 'wpmdb_blacklist_plugins',
					blacklist_plugins		: $(select_element).val(),
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.blacklist_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText );
					$(select_element).removeAttr('disabled');
					$('.plugin-compatibility-save').removeClass('disabled');
					doing_plugin_compatibility_ajax = false;
					$('.plugin-compatibility-spinner').remove();
					$('.plugin-compatibility-success-msg').show().fadeOut(2000);
				},
				success: function(data){
					if( '' != $.trim( data ) ) {
						alert( data );
					}
					$(select_element).removeAttr('disabled');
					$('.plugin-compatibility-save').removeClass('disabled');
					doing_plugin_compatibility_ajax = false;
					$('.plugin-compatibility-spinner').remove();
					$('.plugin-compatibility-success-msg').show().fadeOut(2000);
				}
			});
		});

		// delete a profile from the migrate form area
		$('body').on('click', '.delete-profile', function(){
			var name = $(this).next().clone();
			$('input',name).remove();
			var name = $.trim($(name).html());
			var answer = confirm( wpmdb_strings.remove_profile + ' "' + name + '"' );

			if(!answer){
				return;
			}

			$(this).parent().fadeOut(500);

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action		:	'wpmdb_delete_migration_profile',
					profile_id	:	$(this).attr('data-profile-id'),
					nonce		:	wpmdb_nonces.delete_migration_profile,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.remove_profile_problem );
				},
				success: function(data){
					if( data == '-1' ){
						alert( wpmdb_strings.remove_profile_not_found );
					}
				}
			});

		});

		// deletes a profile from the main profile selection screen
		$('.main-list-delete-profile-link').click(function(){
			var name = $(this).prev().html();
			var answer = confirm( wpmdb_strings.remove_profile + ' "' + name + '"' );

			if(!answer){
				return;
			}

			$(this).parent().fadeOut(500);

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action		:	'wpmdb_delete_migration_profile',
					profile_id	:	$(this).attr('data-profile-id'),
					nonce		:	wpmdb_nonces.delete_migration_profile,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.remove_profile_problem );
				}
			});

		});

		// warn the user when editing the connection info after a connection has been established
		$('body').on('click', '.temp-disabled', function() {
			var answer = confirm( wpmdb_strings.change_connection_info );

			if( ! answer ){
				return;
			}
			else{
				$('.ssl-notice').hide();
				$('.different-plugin-version-notice').hide();
				$('.migrate-db-button').show();
				$('.temp-disabled').removeAttr('readonly');
				$('.temp-disabled').removeClass('temp-disabled');
				$('.connect-button').show();
				$('.step-two').hide();
				$('.connection-status').show().html( wpmdb_strings.enter_connection_info );
				connection_established = false;
			}
		});

		// ajax request for settings page when checking/unchecking setting radio buttons
		$('.settings-tab input[type=checkbox]').change(function(){
			if ( 'plugin-compatibility' == $(this).attr('id') ) return;
			var checked = $(this).is(':checked');
			var setting = $(this).attr('id');

			$(this).parent().append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
			var $label = $(this).parent();

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'text',
				cache: 	false,
				data: {
					action		:	'wpmdb_save_setting',
					checked		:	checked,
					setting		:	setting,
					nonce		:	wpmdb_nonces.save_setting,
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert( wpmdb_strings.save_settings_problem );
					$('.ajax-spinner').remove();
				},
				success: function(data){
					$('.ajax-spinner').remove();
					$($label).append('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
				}
			});

		});

		// disable form submissions
		$('.migrate-form').submit(function(e){
			e.preventDefault();
		});

		// fire connection_box_changed when the connect button is pressed
		$('.connect-button').click(function(event){
			event.preventDefault();
			$(this).blur();
			connection_box_changed();
		});

		// send paste even to connection_box_changed() function
		$('.pull-push-connection-info').bind('paste', function(e) {
			var $this = this;
			setTimeout(function () {
				connection_box_changed();
			}, 0);

		});

		$('body').on('click', '.try-again', function(){
			connection_box_changed();
		});

		$('body').on('click', '.try-http', function(){
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			var new_url = connection_info[0].replace( 'https', 'http' );
			var new_contents = new_url + "\n" + connection_info[1];
			$('.pull-push-connection-info').val( new_contents );
			connection_box_changed();
		});

		$('.create-new-profile').change(function(){
			profile_name_edited = true;
		});

		$('body').on('click', '.temporarily-disable-ssl', function(){
			if(window.location.hash) {
				var hash = window.location.hash.substring(1);
			}
			$(this).attr('href', $(this).attr('href') + '&hash=' + hash );
		});

		// fired when the connection info box changes (e.g. gets pasted into)
		function connection_box_changed(data){
			var $this = $('.pull-push-connection-info');

			if( doing_ajax || $($this).hasClass('temp-disabled') ){
				return;
			}

			var data = $('.pull-push-connection-info').val();

			var connection_info = $.trim(data).split("\n");
			var error = false;
			var error_message = '';

			if( connection_info == '' ){
				error = true;
				error_message = wpmdb_strings.connection_info_missing;
			}

			if( connection_info.length != 2 && ! error ){
				error = true;
				error_message = wpmdb_strings.connection_info_incorrect;
			}

			if( ! error && ! validate_url( connection_info[0] ) ){
				error = true;
				error_message = wpmdb_strings.connection_info_url_invalid;
			}

			if( ! error && connection_info[1].length < 32 ){
				error = true;
				error_message = wpmdb_strings.connection_info_key_invalid;
			}

			if( ! error && connection_info[0] == wpmdb_connection_info[0] ){
				error = true;
				error_message = wpmdb_strings.connection_info_local_url;
			}

			if( ! error && connection_info[1] == wpmdb_connection_info[1] ){
				error = true;
				error_message = wpmdb_strings.connection_info_local_key;
			}

			if( error ){
				$('.connection-status').html( error_message );
				$('.connection-status').addClass( 'notification-message error-notice migration-error' );
				return;
			}

			if( wpmdb_openssl_available == false ) {
				connection_info[0] = connection_info[0].replace('https://','http://');
				var new_connection_info_contents = connection_info[0] + "\n" + connection_info[1];
				$('.pull-push-connection-info').val(new_connection_info_contents);
			}

			show_prefix_notice = false;
			doing_ajax = true;
			disable_export_type_controls();

			if( $('.basic-access-auth-wrapper').is(':visible') ) {
				connection_info[0] = connection_info[0].replace( /\/\/(.*)@/, '//' );
				connection_info[0] = connection_info[0].replace( '//', '//' + encodeURIComponent( $.trim( $('.auth-username').val() ) ) + ':' + encodeURIComponent( $.trim( $('.auth-password').val() ) ) + '@' );
				var new_connection_info_contents = connection_info[0] + "\n" + connection_info[1];
				$('.pull-push-connection-info').val(new_connection_info_contents);
				$('.basic-access-auth-wrapper').hide();
			}

			$('.step-two').hide();
			$('.ssl-notice').hide();
			$('.prefix-notice').hide();
			$('.connection-status').show();

			$('.connection-status').html( wpmdb_strings.establishing_remote_connection );
			$('.connection-status').removeClass( 'notification-message error-notice migration-error' );
			$('.connection-status').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );

			var intent = $('input[name=action]:checked').val();

			profile_name_edited = false;

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action	:	'wpmdb_verify_connection_to_remote_site',
					url		:	connection_info[0],
					key		:	connection_info[1],
					intent	:	intent,
					nonce	:	wpmdb_nonces.verify_connection_to_remote_site,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.connection-status').html( getAjaxErrors( jqXHR.responseText, '(#100)', jqXHR ) );
					$('.connection-status').addClass( 'notification-message error-notice migration-error' );
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.connection-status').html( data.body );
						$('.connection-status').addClass( 'notification-message error-notice migration-error' );

						if( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$('.basic-access-auth-wrapper').show();
						}

						return;
					}

					var profile_name = get_domain_name( data.url );
					$('.create-new-profile').val(profile_name);

					$('.pull-push-connection-info').addClass('temp-disabled');
					$('.pull-push-connection-info').attr('readonly','readonly');
					$('.connect-button').hide();

					$('.connection-status').hide();
					$('.step-two').show();

					maybe_show_ssl_warning( connection_info[0], connection_info[1], data.scheme );
					maybe_show_prefix_notice( data.prefix );

					connection_established = true;
					connection_data = data;
					move_connection_info_box();

					maybe_show_mixed_cased_table_name_warning();

					var table_select = document.createElement('select');
					$(table_select).attr({
						multiple	: 'multiple',
						name		: 'select_tables[]',
						id			: 'select-tables',
						class		: 'multiselect'
					});

					$.each(connection_data.tables, function(index, value) {
						$(table_select).append('<option value="' + value  + '">' +  value + ' (' + connection_data.table_sizes_hr[value]  + ')</option>');
					});

					pull_select = table_select;
					push_select_backup = $(table_select).clone();
					$(push_select_backup).attr({
						name	: 'select_backup[]',
						id		: 'select-backup'
					});

					var post_type_select = document.createElement('select');
					$(post_type_select).attr({
						multiple	: 'multiple',
						name		: 'select_post_types[]',
						id			: 'select-post-types',
						class		: 'multiselect'
					});

					$.each(connection_data.post_types, function(index, value) {
						$(post_type_select).append('<option value="' + value  + '">' +  value + '</option>');
					});

					pull_post_type_select = post_type_select;

					if( $('#pull').is(':checked') ){
						$('#new-url').val( remove_protocol( wpmdb_this_url ) );
						$('#new-path').val( wpmdb_this_path );
						if( wpmdb_is_multisite == true ) {
							$('#new-domain').val( wpmdb_this_domain );
						}
						$('#old-url').val( remove_protocol( data.url ) );
						$('#old-path').val( data.path );
						$('#select-tables').remove();
						$('.select-tables-wrap').prepend(pull_select);
						$('#select-post-types').remove();
						$('.select-post-types-wrap').prepend(pull_post_type_select);
						$('.table-prefix').html(data.prefix);
						$('.uploads-dir').html(wpmdb_this_uploads_dir);
					}
					else{
						$('#select-backup').remove();
						$('.backup-tables-wrap').prepend(push_select_backup);
						$('#new-url').val( remove_protocol( data.url ) );
						$('#new-path').val( data.path );
					}

					next_step_in_migration = { fn: $.wpmdb.do_action, args: [ 'verify_connection_to_remote_site', connection_data ] };
					execute_next_step();
				}

			});

		}

		$('body').on('click', '.pause-resume', function(){
			if( true == migration_paused ) {
				migration_paused = false;
				doing_ajax = true;
				$('.progress-title').html(previous_progress_title);
				$('.progress-text').html(previous_progress_text);
				$('.migration-progress-ajax-spinner').show();
				$('.pause-resume').html(wpmdb_strings.pause);
				// resume the timer
				elapsed_interval = setInterval(count,1000);
				execute_next_step();
			}
			else {
				migration_paused = true;
				doing_ajax = false;
				previous_progress_title = $('.progress-title').html();
				previous_progress_text = $('.progress-text').html();
				$('.progress-title').html(wpmdb_strings.migration_paused);
				$('.pause-resume').html(wpmdb_strings.resume);
				$('.progress-text').html(wpmdb_strings.completing_current_request);
			}
		});

		$('body').on('click', '.cancel', function(){
			migration_cancelled = true;
			migration_paused = false;
			$('.progress-text').html(wpmdb_strings.completing_current_request);
			$('.progress-title').html(wpmdb_strings.cancelling_migration);
			$('.migration-controls').fadeOut();
			$('.migration-progress-ajax-spinner').show();

			if( false == doing_ajax ) {
				execute_next_step();
			}
		});

		$('.enter-licence').click(function() {
			$('.settings').click();
			$('.licence-input').focus();
		});

		execute_next_step = function() {
			if( true == migration_paused ) {
				$('.migration-progress-ajax-spinner').hide();
				// pause the timer
				clearInterval( elapsed_interval );
				$('.progress-text').html(wpmdb_strings.paused);
				return;
			}
			else if( true == migration_cancelled) {
				migration_intent = $('input[name=action]:checked').val();

				if( 'savefile' == migration_intent ) {
					progress_msg = wpmdb_strings.removing_local_sql;
				}
				else if( 'pull' == migration_intent ) {
					if( 'backup' == stage ) {
						progress_msg = wpmdb_strings.removing_local_backup;
					}
					else {
						progress_msg = wpmdb_strings.removing_local_temp_tables;
					}
				}
				else if( 'push' == migration_intent ) {
					if( 'backup' == stage ) {
						progress_msg = wpmdb_strings.removing_remote_sql;
					}
					else {
						progress_msg = wpmdb_strings.removing_remote_temp_tables;
					}
				}
				$('.progress-text').html(progress_msg);

				var request_data =  {
					action 			:	'wpmdb_cancel_migration',
					intent 			:	migration_intent,
					url 			:	remote_site,
					key				:	secret_key,
					stage			:	stage,
					dump_filename	:	dump_filename,
					form_data		:	form_data,
				};

				if( typeof connection_data != 'undefined' ) {
					request_data.temp_prefix = connection_data.temp_prefix;
				}

				$.ajax({
					url: 		ajaxurl,
					type: 		'POST',
					dataType:	'text',
					cache: 		false,
					data:		request_data,
					error: function(jqXHR, textStatus, errorThrown){
						$('.progress-title').html(wpmdb_strings.migration_cancellation_failed);
						$('.progress-text').html(wpmdb_strings.manually_remove_temp_files);
						$('.progress-text').append( '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText );
						$('.progress-text').addClass( 'migration-error' );
						console.log( jqXHR );
						console.log( textStatus );
						console.log( errorThrown );
						migration_error = true;
						migration_complete_events();
						return;
					},
					success: function(data){
						doing_ajax = false;
						data = $.trim( data );
						if( data != '' ){
							$('.progress-title').html(wpmdb_strings.migration_cancellation_failed);
							$('.progress-text').html(data);
							$('.progress-text').addClass('migration-error');
							migration_error = true;
							migration_complete_events();
							return;
						}
						completed_msg = wpmdb_strings.migration_cancelled;
						$('.progress-text').hide();
						migration_complete_events();
					}
				});
			}
			else {
				next_step_in_migration.fn.apply( null, next_step_in_migration.args );
			}
		}

		$('body').on('click','.copy-licence-to-remote-site',function(){
			$('.connection-status').html( wpmdb_strings.copying_license );
			$('.connection-status').removeClass( 'notification-message error-notice migration-error' );
			$('.connection-status').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );

			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");

			doing_ajax = true;
			disable_export_type_controls();

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action	:	'wpmdb_copy_licence_to_remote_site',
					url		:	connection_info[0],
					key		:	connection_info[1],
					nonce	:	wpmdb_nonces.copy_licence_to_remote_site,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.connection-status').html( getAjaxErrors( jqXHR.responseText, '(#143)', jqXHR ) );
					$('.connection-status').addClass( 'notification-message error-notice migration-error' );
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.connection-status').html( data.body );
						$('.connection-status').addClass( 'notification-message error-notice migration-error' );

						if( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$('.basic-access-auth-wrapper').show();
						}

						return;
					}
					connection_box_changed();
				}
			});
		});

		$('body').on('click', '.reactivate-licence', function(e){
			doing_ajax = true;

			$('.invalid-licence').empty().html(wpmdb_strings.attempting_to_activate_licence);
			$('.invalid-licence').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action					:	'wpmdb_reactivate_licence',
					nonce					:	wpmdb_nonces.reactivate_licence,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.invalid-licence').html( wpmdb_strings.activate_licence_problem );
					$('.invalid-licence').append( '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + '<br />' + jqXHR.responseText );
					$('.ajax-spinner').remove();
					doing_ajax = false;
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.invalid-licence').html( data.body );
						return;
					}

					if( typeof data.wpmdb_dbrains_api_down != 'undefined' && data.wpmdb_dbrains_api_down == 1 ) {
						$('.invalid-licence').html( wpmdb_strings.temporarily_activated_licence );
						$('.invalid-licence').append( data.body );
						return;
					}

					$('.invalid-licence').empty().html(wpmdb_strings.licence_reactivated);
					location.reload();
				}
			});

		});

		$('input[name=table_migrate_option]').change(function(){
			maybe_show_mixed_cased_table_name_warning();
		});

		$('body').on('change','#select-tables',function(){
			maybe_show_mixed_cased_table_name_warning();
		});

	});

})(jQuery);
