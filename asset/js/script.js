(function($) {

	var connection_established = false;
	var connection_data = '';
	var last_replace_switch = '';
	var doing_ajax = false;
	var doing_licence_registration_ajax = false;
	var doing_reset_api_key_ajax = false;
	var doing_save_profile = false;
	var form_data = '';
	var migration_completed = false;
	var interval;
	var currently_migrating = false;
	var profile_name_edited = false;
	var checked_licence = false;

	var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ), spinner_url = admin_url + '/images/wpspin_light';

	if( window.devicePixelRatio >= 2 ){
		spinner_url += '-2x';
	}

	spinner_url += '.gif';

	window.onbeforeunload = function (e) {
		if( currently_migrating ){
			e = e || window.event;

			// For IE and Firefox prior to version 4
			if (e) {
				e.returnValue = 'Sure?';
			}

			// For Safari
			return 'Sure?';
		}
	};

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	function setup_counter() { 
		var c = 0,
		counter_display = $('.timer'),
		label = 'Time Elapsed: ';
		function display_count() {
			hours = parseInt( c / 3600 ) % 24;
			minutes = parseInt( c / 60 ) % 60;
			seconds = c % 60;
			var display = label + pad(hours,2,0) + ':' + pad(minutes,2,0) + ':' + pad(seconds,2,0);
			counter_display.html(display);
		}

		function count() {
			c = c + 1;
			display_count();
		}

		interval = setInterval(count,1000);
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

	function get_domain_name( url ){
		var temp_url = url;
		var domain = temp_url.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
		return domain;
	}

	function get_default_profile_name( url, intent, ing_suffix ){
		var domain = get_domain_name(url);
		var action = intent;
		action = action.charAt(0).toUpperCase() + action.slice(1);
		if( ing_suffix ){
			action += 'ing';
		}
		var preposition = 'to';
		if( intent == 'pull' ){
			preposition = 'from';
		}

		return profile_name = action + ' ' + preposition + ' ' + domain;
	}

	$(document).ready(function() {

		var progress_content_original = $('.progress-content').clone();
		$('.progress-content').remove();

		var this_tables = $.parseJSON(wpmdb_this_tables);
		var push_select = $('#select-tables').clone();
		var pull_select = $('#select-tables').clone();

		$('.help-tab .video').each(function() {
			var $container = $(this),
				$viewer = $('.video-viewer');

			$('a', this).click(function() {
				$viewer.attr('src', 'http://www.youtube.com/embed/' + $container.data('video-id') + '?autoplay=1');
				$viewer.show();
				var offset = $viewer.offset();
				$(window).scrollTop(offset.top - 50);
				return false;
			});
		});

		$('.backup-options').show();
		if( $('#savefile').is(':checked') ){
			$('.backup-options').hide();
		}

		$('.support-content p').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );

		function check_licence( licence ){
			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action  	: 'wpmdb_check_licence',
					licence_key : licence,
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log( 'A problem occured when trying to check the license, please try again.' );
				},
				success: function(data){
					if ( typeof data.errors !== 'undefined' ) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.support-content').empty().html( msg );
					}
					else {
						$('.support-content').empty().html(data.message);
					}
				}
			});
		}

		// automatically validate connnection info if we're loading a saved profile
		establish_remote_connection_from_saved_profile();

		function establish_remote_connection_from_saved_profile(){
			var action = $('input[name=action]:checked').val();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			if( typeof wpmdb_default_profile == 'undefined' || wpmdb_default_profile == true || action == 'savefile' || doing_ajax ){
				return;
			}

			doing_ajax = true;
			
			$('.connection-status').html( 'Establishing connection to remote server, please wait' );
			$('.connection-status').removeClass( 'migration-error' );
			$('.connection-status').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
			
			var intent = $('input[name=action]:checked').val();

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action: 	'wpmdb_prepare_remote_connection',
					url: 		connection_info[0],
					key: 		connection_info[1],
					intent: 	intent,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.connection-status').html( 'A problem occured when attempting to connect to the remote server, please check the details and try again. (#102)' );
					$('.connection-status').addClass( 'migration-error' );
					$('.ajax-spinner').remove();
					doing_ajax = false;
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.connection-status').html( data.body );
						$('.connection-status').addClass( 'migration-error' );
						return;
					}
					
					var original_body = data;
					data = $.parseJSON( data );
					
					$('.pull-push-connection-info').addClass('temp-disabled');
					$('.pull-push-connection-info').attr('readonly','readonly');
					$('.connect-button').hide();

					$('.connection-status').hide();
					$('.step-two').show();
					connection_established = true;
					connection_data = data;

					$('.remote-json-data').val(original_body);

					var loaded_tables = '';
					if( wpmdb_default_profile == false && wpmdb_export_with_prefix == false ){
						loaded_tables = $.parseJSON( wpmdb_loaded_tables );
					}

					var table_select = document.createElement('select');
					$(table_select).attr('multiple', 'multiple').attr('name','select-tables[]').attr('id','select-tables');

					$.each(connection_data.tables, function(index, value) {
						var selected = $.inArray( value, loaded_tables );
						if( selected != -1 ){
							selected = ' selected="selected" ';
						}
						else{
							selected = ' ';
						}
						$(table_select).append('<option' + selected + 'value="' + value  + '">' +  value + '</option>');
					});

					pull_select = table_select;

					if( $('#pull').is(':checked') ){
						$('#select-tables').remove();
						$('.select-tables-wrap').prepend(pull_select);
						$('.table-prefix').html(data.prefix);
					}
					
				}

			});

		}
		
		// add to <a> tags which act as JS event buttons, will not jump page to top and will deselect the button
		$('.js-action-link').click(function(){
			$(this).blur();
			return false;
		});

		// registers your licence
		$('.licence-form').submit(function(){
			if( doing_licence_registration_ajax ){
				return false;
			}

			var licence_key = $.trim( $('.licence-input').val() );

			if( licence_key == '' ){
				$('.licence-status').html( 'Please enter your license key.' );
				return false;
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
					action  : 'wpmdb_activate_licence',
					licence_key : licence_key
				},
				error: function(jqXHR, textStatus, errorThrown){
					doing_licence_registration_ajax = false;
					$('.register-licence-ajax-spinner').remove();
					$('.licence-status').html( 'A problem occured when trying to register the license, please try again.' );
				},
				success: function(data){
					doing_licence_registration_ajax = false;
					$('.register-licence-ajax-spinner').remove();

					if ( typeof data.errors !== 'undefined' ) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.licence-status').html( msg );
					}
					else {
						$('.licence-information').html('Registered To: ' + data.email);
						$('.licence-status').html( 'Your licence has been activated. You will now receive automatic updates and access to email support.');
						$('.licence-status').addClass('success');
						$('.support-content').empty().html('<p>Fetching licence details, please wait...<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" /></p>');
						check_licence( licence_key );
					}
				}
			});

			return false;
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
					action : 'wpmdb_clear_log',
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to clear the debug log. You can clear it manually by accessing the file system. (#132)');
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
					action : 'wpmdb_get_log',
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to update the debug log. Please contact support. (#133)');
				},
				success: function(data){
					$('.debug-log-textarea').val(data);
				}
			});
		}
		
		// select all tables
		$('.tables-select-all').click(function(){
			$('#select-tables').focus();
			$('#select-tables option').attr('selected',1);
		});
		
		// deselect all tables
		$('.tables-deselect-all').click(function(){
			$('#select-tables').focus();
			$('#select-tables option').removeAttr('selected');
		});
		
		// invert table selection
		$('.tables-invert-selection').click(function(){
			$('#select-tables').focus();
			$('#select-tables option').each(function(){
				$(this).attr('selected', ! $(this).attr('selected'));
			});
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
		
		// special expand and collapse content on click for save migration profile
		$('#save-migration-profile').change(function() {
			if( $(this).is(':checked') ){
				$(this).parent().next().show();
				$('.save-settings-button').show();
				$('.migrate-db .button-primary').val('Migrate DB & Save');
			}
			else{
				$(this).parent().next().hide();
				$('.save-settings-button').hide();
				$('.migrate-db .button-primary').val('Migrate DB');
			}
		});
		
		if( $('#save-migration-profile').is(':checked') ){
			$('#save-migration-profile').parent().next().show();
			$('.save-settings-button').show();
			$('.migrate-db .button-primary').val('Migrate DB & Save');
		};

		// AJAX migrate button
		$('.migrate-db-button').click(function(event){
			$(this).blur();
			event.preventDefault();

			// check that they've select some tables to migrate
			if( $('#migrate-selected').is(':checked') && $('#select-tables').val() == null ){
				alert( 'Please select at least one table to migrate.');
				return;
			}

			// also save profile
			if( $('#save-migration-profile').is(':checked') ){

				if( $.trim( $('.create-new-profile').val() ) == '' && $('#create_new').is(':checked') ){
					alert('Please enter a name for your migration profile.');
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
						action: 	'wpmdb_save_profile',
						profile: 	profile, 
					},
					error: function(jqXHR, textStatus, errorThrown){
						alert('An error occured when attempting to save the migration profile. Please see the Help tab for details on how to request support. (#118)');
					},
					success: function(data){
						if(create_new_profile){
							var new_li = '<li><span style="display: none;" class="delete-profile" data-profile-id="' + data + '"></span><label for="profile-' + data + '"><input id="profile-' + data + '" value="' + data + '" name="save_migration_profile_option" type="radio"> ' + profile_name + '</label></li>';
							$('#create_new').parents('li').before(new_li);
							$('#profile-' + data).attr('checked','checked');
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
				'background-color': 'rgba(255,255,255,0.9)',
				'width': '100%',
				'z-index': 99999,
				'display': 'none',
			});

			$progress_content = progress_content_original.clone();
			var migration_intent = $('input[name=action]:checked').val();

			var stage = 'backup';

			if( migration_intent == 'savefile' ){
				stage = 'migrate';
			}

			if( $('#create-backup').is(':checked') == false ){
				stage = 'migrate';
			}

			var table_intent = $('input[name=table_migrate_option]:checked').val();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			var remote_site = connection_info[0];
			var secret_key = connection_info[1];
			var tables_to_migrate = '';
			var table_sizes = '';

			var static_migration_label = '';

			$('#overlay').after($progress_content);

			var completed_msg = 'Exporting complete.';

			if( migration_intent == 'savefile' ){
				static_migration_label = 'Exporting, please wait...';
			}
			else{
				static_migration_label = get_default_profile_name(remote_site, migration_intent, true) + ', please wait...';
				completed_msg = get_default_profile_name(remote_site, migration_intent, true) + ' complete.';
			}

			$('.progress-title').html(static_migration_label);

			$('#overlay').show();

			if( table_intent == 'migrate_select' ){ // user has elected to migrate only certain tables
				// grab tables as per what the user has selected from the multiselect box
				temp_tables_to_migrate = $('#select-tables').val();
				tables_to_migrate = temp_tables_to_migrate;
				// user is pushing or exporting
				if( migration_intent == 'push' || migration_intent == 'savefile' ){
					// default value, assuming we're not backing up
					table_sizes = $.parseJSON(wpmdb_this_table_sizes);
					// backing up, during a push, need to only grab the common tables
					if( stage == 'backup' ){
						tables_to_migrate = get_intersect(connection_data.tables,temp_tables_to_migrate);
						table_sizes = connection_data.table_sizes;
					}
				}
				else{
					table_sizes = connection_data.table_sizes;
					if( stage == 'backup' ){
						tables_to_migrate = get_intersect(temp_tables_to_migrate,this_tables);
						table_sizes = $.parseJSON(wpmdb_this_table_sizes);
					}
				}
			}
			else{
				if( migration_intent == 'push' || migration_intent == 'savefile' ){
					tables_to_migrate = this_tables;
					table_sizes = $.parseJSON(wpmdb_this_table_sizes);
					if( stage == 'backup' ){
						tables_to_migrate = get_intersect(connection_data.tables,this_tables);
						table_sizes = connection_data.table_sizes;
					}
				}
				else{
					tables_to_migrate = connection_data.tables;
					table_sizes = connection_data.table_sizes;
					if( stage == 'backup' ){
						tables_to_migrate = get_intersect(connection_data.tables,this_tables);
						table_sizes = $.parseJSON(wpmdb_this_table_sizes);
					}
				}
			}

			function decide_tables_to_display( tables_to_migrate, table_sizes ){

				var total_size = 0;
				$.each(tables_to_migrate, function(index, value) {
					total_size += parseInt(table_sizes[value]);
				});

				var last_element = '';
				$.each(tables_to_migrate, function(index, value) {
					var percent = table_sizes[value] / total_size * 100;
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
						table_sizes[last_element] = Number(table_sizes[last_element]);
						table_sizes[last_element] += Number(table_sizes[tables_to_migrate[index]]);
						table_sizes[tables_to_migrate[index]] = 0;
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
				if( table_sizes[last_element] != 0 ){
					var percent = table_sizes[last_element] / total_size * 100;
					var percent_rounded = Math.round(percent*1000)/1000;
				}
				$('.progress-tables .progress-chunk:last').css('width',percent_rounded + '%');
				$('.progress-chunk-hover:last').css('width',percent_rounded + '%');

				var return_vals = [table_sizes,total_size];

				return return_vals;

			}

			table_details = decide_tables_to_display( tables_to_migrate, table_sizes );
			table_sizes = table_details[0];
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
					action 		: 	'wpmdb_initiate_migration',
					intent 		:  	migration_intent,
					url 		:	remote_site,
					key			:	secret_key,
					form_data	:	form_data,
					stage		: 	stage, 
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.progress-title').html('Migration failed');
					$('.progress-text').html( 'A problem occured when attempting to connect to the local server, please check the details and try again. (#112)' );
					$('.progress-text').addClass( 'migration-error' );
				},
				success: function(data){
					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						migration_complete_events();
						$('.progress-title').html('Migration failed');
						$('.progress-text').addClass( 'migration-error' );
						$('.progress-text').html( data.body );
						return;
					}

					var datetime = data.datetime;

					data = $.parseJSON( data );

					var table_migration_error = false;
					var i = 0;
					var progress_size = 0;
					var overall_percent = 0;
							
					function migrate_table_recursive(){

						if( i >= tables_to_migrate.length ){
							if( stage == 'backup' ) {
								stage = 'migrate';
								i = 0;
								progress_size = 0;
								$('.progress-bar').width('0px');

								if( table_intent == 'migrate_select' ){
									tables_to_migrate = $('#select-tables').val();
									if( migration_intent == 'push' || migration_intent == 'savefile' ){
										table_sizes = $.parseJSON(wpmdb_this_table_sizes);
									}
									else{
										table_sizes = connection_data.table_sizes;
									}
								}
								else{
									if( migration_intent == 'push' || migration_intent == 'savefile' ){
										tables_to_migrate = this_tables;
										table_sizes = $.parseJSON(wpmdb_this_table_sizes);
									}
									else{
										tables_to_migrate = connection_data.tables;
										table_sizes = connection_data.table_sizes;
									}
								}

								$('.progress-tables').empty();
								$('.progress-tables-hover-boxes').empty();

								table_details = decide_tables_to_display( tables_to_migrate, table_sizes );
								table_sizes = table_details[0];
								total_size = table_details[1];

							}
							else {
								stage == 'end';
								migration_complete();
								return;
							}
						}

						if( stage == 'backup'){
							$('.progress-text').html( overall_percent + '% - Backing up "' + tables_to_migrate[i] + '"' );
						}
						else{
							$('.progress-text').html( overall_percent + '% - Migrating "' + tables_to_migrate[i] + '"');
						}
						

						$.ajax({
							url: 		ajaxurl,
							type: 		'POST',
							dataType:	'text',
							cache: 		false,
							timeout:	0,
							data: {
								action 		: 	'wpmdb_prepare_table_migration',
								intent 		:  	migration_intent,
								url 		:	remote_site,
								key			:	secret_key,
								table		:	tables_to_migrate[i],
								form_data	:	form_data,
								datetime	:	datetime,
								stage		: 	stage,
								bottleneck	: 	connection_data.bottleneck
							},
							error: function(jqXHR, textStatus, errorThrown){
								$('.progress-title').html('Migration failed');
								$('.progress-text').html( 'A problem occured when processing the ' + tables_to_migrate[i] + ' table. (#113)' );
								$('.progress-text').addClass( 'migration-error' );
								console.log( jqXHR + ' : ' + textStatus + ' : ' + errorThrown );
								table_migration_error = true;
								migration_complete_events();
								return;
							},
							success: function(data){
								if( data != '' ){
									$('.progress-title').html('Migration failed');
									$('.progress-text').html(data);
									$('.progress-text').addClass('migration-error');
									table_migration_error = true;
									migration_complete_events();
									return;
								}
								progress_size += parseInt(table_sizes[tables_to_migrate[i]]);
								var percent = 100 * progress_size / total_size;
								$('.progress-bar').width(percent + '%');
								i++;
								overall_percent = Math.floor(percent);
								migrate_table_recursive();
							}
						});
					
					}

					function migration_complete(){
						if( migration_intent == 'savefile' ){
							currently_migrating = false;
							var migrate_complete_text = 'Migration complete';
							if( $('#save_computer').is(':checked') ){
								var url = wpmdb_this_download_url + datetime;

								if( $('#gzip_file').is(':checked') ){
									url += '&gzip=1';
								}

								window.location = url;

							}
							else{
								var download_url = wpmdb_this_upload_url + wpmdb_this_website_name + '-migrate-' + datetime + '.sql';
								if( $('#gzip_file').is(':checked') ){
									download_url += '.gz';
								}
								migrate_complete_text = 'Migration complete, your backup is located at: <a href="' + download_url + '">' + download_url + '</a>.';
							}

							if( table_migration_error == false ){
								$('.progress-text').html(migrate_complete_text);
								migration_complete_events();
								$('.progress-title').html(completed_msg);
							}

						}
						else{ // rename temp tables, delete old tables
							$('.progress-text').html('Finalizing migration');
							$.ajax({
								url: 		ajaxurl,
								type: 		'POST',
								dataType:	'text',
								cache: 		false,
								data: {
									action 		: 	'wpmdb_finalize_backup',
									intent 		:  	migration_intent,
									url 		:	remote_site,
									key			:	secret_key,
									form_data	:	form_data,
									datetime	:	datetime,
									stage		: 	stage,
								},
								error: function(jqXHR, textStatus, errorThrown){
									$('.progress-title').html('Migration failed');
									$('.progress-text').html('A problem occured when finalizing the backup. (#132)');
									$('.progress-text').addClass('migration-error');
									console.log( jqXHR + ' : ' + textStatus + ' : ' + errorThrown );
									table_migration_error = true;
								},
								success: function(data){
									$('.progress-text').html('Migration complete');
									$('.progress-title').html(completed_msg);
								}
							});
							migration_complete_events();
						}
					}

					migrate_table_recursive();

				}

			}); // end ajax
			
		});

		function migration_complete_events(){
			migration_completed = true;
			$('.progress-label').remove();
			$('.migration-progress-ajax-spinner').remove();
			$('.close-progress-content').show();
			$('#overlay').css('cursor','pointer');
			clearInterval( interval );
			currently_migrating = false;
		}

		// close progress pop up once migration is completed
		$('body').delegate('.close-progress-content-button', 'click', function(e){
			hide_overlay();
		});

		$('body').delegate('#overlay', 'click', function(){
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

			if( $.trim( $('.create-new-profile').val() ) == '' && $('#create_new').is(':checked') ){
				alert('Please enter a name for your migration profile.');
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
					action: 	'wpmdb_save_profile',
					profile: 	profile, 
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when attempting to save the migration profile. Please see the Help tab for details on how to request support. (#104)');
					$('.save-settings-button').removeAttr('disabled');
					$('.save-profile-ajax-spinner').remove();
					$('.save-settings-button').after('<span class="ajax-success-msg">Saved</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
					doing_save_profile = false;
				},
				success: function(data){
					$('.save-settings-button').removeAttr('disabled');
					$('.save-profile-ajax-spinner').remove();
					$('.save-settings-button').after('<span class="ajax-success-msg">Saved</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
					doing_save_profile = false;
					$('.create-new-profile').val('');

					if(create_new_profile){
						var new_li = '<li><span style="display: none;" class="delete-profile" data-profile-id="' + data + '"></span><label for="profile-' + data + '"><input id="profile-' + data + '" value="' + data + '" name="save_migration_profile_option" type="radio"> ' + profile_name + '</label></li>';
						$('#create_new').parents('li').before(new_li);
						$('#profile-' + data).attr('checked','checked');
					}

				}
			});

		});

		// progress label updating
		$('body').delegate('.progress-chunk-hover', 'mousemove', function(e) {
			mX = e.pageX;
			offset = $('.progress-bar-wrapper').offset();
			label_offset = $('.progress-label').outerWidth() / 2;
			mX = ( mX - offset.left ) - label_offset;
			$('.progress-label').css('left', mX + 'px');
			$('.progress-label').html($(this).attr('data-table'));
		});

		// show / hide progress lavel on hover
		$('body').delegate('.progress-chunk-hover', 'hover', function(event) {
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

			$('.backup-options').show();
			if( $('#savefile').is(':checked') ){
				$('.backup-options').hide();
			}

			if( connection_established ){
				change_replace_values();
			}
		});

		// save file (export) / import / push / pull special conditions
		function move_connection_info_box(){
			$('.import-button').hide();
			$('.connection-status').hide();
			var connection_info = $.trim( $('.pull-push-connection-info').val() ).split("\n");
			if( $('#pull').is(':checked') ){
				$('.pull-list li').append( connection_info_box );
				connection_info_box.show();
				if( connection_established ){
					$('.connection-status').hide();
					$('.step-two').show();
					$('.table-prefix').html(connection_data.prefix);
					if( profile_name_edited == false ){
						var profile_name = get_domain_name( connection_info[0] );
						$('.create-new-profile').val(profile_name);
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
					if( profile_name_edited == false ){
						var profile_name = get_domain_name( connection_info[0] );
						$('.create-new-profile').val(profile_name);
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
				if( profile_name_edited == false ){
					$('.create-new-profile').val('');
				}
			}
		}

		// replace tables and replaces depending on which option is selected
		var intent = $('input[name=action]:checked').val();
		if( intent == 'pull' ){
			last_replace_switch = 'pull';
		}
		else if( intent == 'savefile' || intent == 'push' ){
			last_replace_switch = 'push';
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
				last_replace_switch = 'pull';
			}

		}

		// keep a copy of the table select box when making changes
		$('#select-tables').change(function(){
			if( $('#push').is(':checked') || $('#savefile').is(':checked') ){
				push_select = $('#select-tables').clone();
			}
			else if( $('#pull').is(':checked') ){
				pull_select = $('#select-tables').clone();
			}
		});
		
		// hide second section if pull or push is selected with no connection established
		if( ( $('#pull').is(':checked') || $('#push').is(':checked') ) && ! connection_established  ){
			$('.step-two').hide();
			$('.connection-status').show();
		}
		
		// show / hide GUID helper description
		$('.replace-guid-helper').click(function(){
			$('.replace-guids-info').toggle();
		});
		
		$('body').click(function(){
			$('.replace-guids-info').hide();
		});

		$('.replace-guids-info').click(function(e){
			e.stopPropagation();
		});
		
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
				if( wpmdb_licence != '0' && checked_licence == false ) {
					check_licence( wpmdb_licence );
					checked_licence = true;
				}
			}

		});
		
		// repeatable fields		
		$('body').delegate('.replace-add-row', 'click', function() {
			$(this).parents('tr').after( $('.original-repeatable-field').clone().removeClass('original-repeatable-field') );
		});
		
		// repeatable fields		
		$('body').delegate('.replace-remove-row', 'click', function() {
			$(this).parents('tr').remove();
			if( $('.replace-row').length < 2 ){
				$('.no-replaces-message').show();
			}
		});
		
		$('.add-replace').click(function(){
			$('.replace-fields').append( $('.original-repeatable-field').clone().removeClass('original-repeatable-field') );
			$('.no-replaces-message').hide();
		});
		
		// delete saved profiles
		$('body').delegate('.save-migration-profile-wrap li', 'hover', function(event) {
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
			if( hash == 'settings' || hash == 'help' ){
				$('.nav-tab').removeClass('nav-tab-active');
				$('.nav-tab.' + hash).addClass('nav-tab-active');
				$('.content-tab').hide();
				$('.' + hash + '-tab').show();
			}

			if ( hash == 'help' ) {
				refresh_debug_log();
				if( wpmdb_licence != '0' ) {
					check_licence( wpmdb_licence );
					checked_licence = true;
				}
			}
		}

		// regenerates the saved secret key
		$('.reset-api-key').click(function(){
			var answer = confirm('Any sites setup to use the current API key will no longer be able to connect. You will need to update those sites with the newly generated API key. Do you wish to continue?');

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
					action: 	'wpmdb_reset_api_key',
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to generate the API key. Please see the Help tab for details on how to request support. (#105)');
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

		var this_connection_info = $.parseJSON( wpmdb_connection_info );

		// show / hide table select box when specific settings change
		$('input[name=table_migrate_option]').change(function(){
			$('.select-tables-wrap').toggle();
		});

		if( $('#migrate-selected').is(':checked') ){
			$('.select-tables-wrap').toggle();
		}

		// delete a profile from the migrate form area
		$('body').delegate('.delete-profile', 'click', function(){
			var name = $(this).next().clone();
			$('input',name).remove();
			var name = $.trim($(name).html());
			var answer = confirm('You are removing the "' + name + '" migration profile. This cannot be undone. Do you wish to continue?');

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
					action 		: 	'wpmdb_delete_migration_profile',
					profile_id 	: 	$(this).attr('data-profile-id')
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to delete the profile. Please see the Help tab for details on how to request support. (#106)');
				},
				success: function(data){
					if( data == '-1' ){
						alert('The selected migration profile could not be deleted because it was not found.\nPlease refresh this page to see an accurate list of the currently available migration profiles.');
					}
				}
			});

		});

		// deletes a profile from the main profile selection screen
		$('.main-list-delete-profile-link').click(function(){
			var name = $(this).prev().html();
			var answer = confirm('You are removing the "' + name + '" migration profile. This cannot be undone. Do you wish to continue?');

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
					action 		: 	'wpmdb_delete_migration_profile',
					profile_id 	: 	$(this).attr('data-profile-id')
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to delete the profile. Please see the Help tab for details on how to request support. (#107)');
				}
			});

		});

		// warn the user when editing the connection info after a connection has been established
		$('body').delegate('.temp-disabled', 'click', function() {
			var answer = confirm('If you change the connection details, you will lose any replaces and table selections you have made below. Do you wish to continue?');

			if( ! answer ){
				return;
			}
			else{
				$(this).removeClass('temp-disabled');
				$(this).removeAttr('readonly');
				$('.connect-button').show();
				$('.step-two').hide();
				$('.connection-status').show().html('Please enter the connection information above to continue.');
				connection_established = false;
			}
		});

		// ajax request for settings page when checking/unchecking setting radio buttons
		$('.settings-tab input[type=checkbox]').change(function(){
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
					action 		: 'wpmdb_save_setting',
					checked 	: checked,
					setting 	: setting
				},
				error: function(jqXHR, textStatus, errorThrown){
					alert('An error occured when trying to save the settings. Please try again. If the problem persists, please see the Help tab for details on how to request support. (#108)');
					$('.ajax-spinner').remove();
				},
				success: function(data){
					$('.ajax-spinner').remove();
					$($label).append('<span class="ajax-success-msg">Saved</span>');
					$('.ajax-success-msg').fadeOut(2000,function(){
						$(this).remove();
					});
				}
			});

		});

		// disable form submissions
		$('.migrate-form').submit(function(){
			return false;
		});

		// fire connection_box_changed when the connect button is pressed
		$('.connect-button').click(function(event){
			event.preventDefault();
			$(this).blur();
			connection_box_changed($('.pull-push-connection-info').val());
		});

		// send paste even to connection_box_changed() function
		$('.pull-push-connection-info').bind('paste', function(e) {
			var $this = this;
			setTimeout(function () {
				connection_box_changed($($this).val());
			}, 0);
			
		});

		$('body').delegate('.try-again','click',function(){
			connection_box_changed($('.pull-push-connection-info').val());
		});

		$('.create-new-profile').change(function(){
			profile_name_edited = true;
		});
		
		// fired when the connection info box changes (e.g. gets pasted into)
		function connection_box_changed(data){
			var $this = $('.pull-push-connection-info');

			if( doing_ajax || $($this).hasClass('temp-disabled') ){
				return;
			}
		
			var connection_info = $.trim(data).split("\n");
			var error = false;
			var error_message = '';
			
			if( connection_info == '' ){
				error = true;
				error_message = 'The connection information appears to be missing, please enter it to continue.';
			}
			
			if( connection_info.length != 2 && ! error ){
				error = true;
				error_message = 'The connection information appears to be incorrect, it should consist of two lines. The first being the remote server\'s URL and the second being the secret key.';
			}
			
			if( ! error && ! validate_url( connection_info[0] ) ){
				error = true;
				error_message = 'The URL on the first line appears to be invalid, please check it and try again.';	
			}
			
			if( ! error && connection_info[1].length != 32 ){
				error = true;
				error_message = 'The secret key on the second line appears to be invalid. It should be a 32 character string that consists of letters, numbers and special characters only.';	
			}
			
			if( ! error && connection_info[0] == this_connection_info[0] ){
				error = true;
				error_message = 'It appears you\'ve entered the URL for this website, you need to provide the URL of the remote website instead.';
			}
			
			if( ! error && connection_info[1] == this_connection_info[1] ){
				error = true;
				error_message = 'It appears you\'ve entered the secret key for this website, you need to provide the secret key for the remote website instead.';
			}
			
			if( error ){
				$('.connection-status').html( error_message );
				$('.connection-status').addClass( 'migration-error' );
				return;
			}

			doing_ajax = true;
			
			$('.step-two').hide();
			$('.connection-status').show();

			$('.connection-status').html( 'Establishing connection to remote server, please wait' );
			$('.connection-status').removeClass( 'migration-error' );
			$('.connection-status').append( '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />' );
			
			var intent = $('input[name=action]:checked').val();

			profile_name_edited = false;

			$.ajax({
				url: 		ajaxurl,
				type: 		'POST',
				dataType:	'json',
				cache: 	false,
				data: {
					action: 	'wpmdb_prepare_remote_connection',
					url: 		connection_info[0],
					key: 		connection_info[1],
					intent: 	intent,
				},
				error: function(jqXHR, textStatus, errorThrown){
					$('.connection-status').html( 'A problem occured when attempting to connect to the local server, please check the details and try again. (#100)' );
					$('.connection-status').addClass( 'migration-error' );
					$('.ajax-spinner').remove();
					doing_ajax = false;
				},
				success: function(data){
					$('.ajax-spinner').remove();
					doing_ajax = false;

					if( typeof data.wpmdb_error != 'undefined' && data.wpmdb_error == 1 ){
						$('.connection-status').html( data.body );
						$('.connection-status').addClass( 'migration-error' );
						return;
					}

					var profile_name = get_domain_name( connection_info[0] );
					$('.create-new-profile').val(profile_name);

					var original_body = data;
					data = $.parseJSON( data );
											
					$('.pull-push-connection-info').addClass('temp-disabled');
					$('.pull-push-connection-info').attr('readonly','readonly');
					$('.connect-button').hide();

					$('.connection-status').hide();
					$('.step-two').show();
					connection_established = true;
					connection_data = data;

					$('.remote-json-data').val(original_body);

					var table_select = document.createElement('select');
					$(table_select).attr('multiple', 'multiple').attr('name','select-tables[]').attr('id','select-tables');

					$.each(connection_data.tables, function(index, value) {
						$(table_select).append('<option value="' + value  + '">' +  value + '</option>');
					});

					pull_select = table_select;

					if( $('#pull').is(':checked') ){
						$('#new-url').val( wpmdb_this_url );
						$('#new-path').val( wpmdb_this_path );
						$('#old-url').val( data.url );
						$('#old-path').val( data.path );
						$('#select-tables').remove();
						$('.select-tables-wrap').prepend(pull_select);
						$('.table-prefix').html(data.prefix);
					}
					else{
						$('#new-url').val( data.url );
						$('#new-path').val( data.path );
					}
					
				}
				
			});
			
		}
		
	});

})(jQuery);