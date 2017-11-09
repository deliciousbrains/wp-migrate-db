(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// global vars
window.wpmdb = window.wpmdb || {};
wpmdb.common = {
	hooks: [],
	call_stack: [],
	non_fatal_errors: '',
	migration_error: false
};
wpmdb.functions = {};

/**
 * Toggle proper translated strings based on migration type selected.
 *
 * To show the properly translated strings for the selected push or pull
 * migration type, we need to hide all strings then show the right
 * translated strings based on the migration type selected.
 *
 * @see https://github.com/deliciousbrains/wp-migrate-db-pro/issues/764
 *
 * @return void
 */
wpmdb.functions.wpmdb_toggle_migration_action_text = function () {
	jQuery('.action-text').hide();
	jQuery('.action-text.' + jQuery('input[name=action]:checked').val()).show();
};

/**
 * Return the currently selected migration type selected.
 *
 * @return string Will return `push`, `pull`, `savefile`, or `` for exporting as a file.
 */
wpmdb.functions.wpmdb_migration_type = function () {
	var action = jQuery('input[name=action]:checked');
	if (0 === action.length) {
		return '';
	}
	return action.val();
};

wpmdb.functions.wpmdb_call_next_hook = function () {
	if (!wpmdb.common.call_stack.length) {
		wpmdb.common.call_stack = wpmdb.common.hooks;
	}

	var func = wpmdb.common.call_stack[0];
	wpmdb.common.call_stack.shift();
	func.call(this);
};

wpmdb.functions.wpmdb_add_commas = function (number_string) {
	number_string += '';
	var number_parts = number_string.split('.');
	var integer = number_parts[0];
	var decimal = 1 < number_parts.length ? '.' + number_parts[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(integer)) {
		integer = integer.replace(rgx, '$1' + ',' + '$2');
	}
	return integer + decimal;
};

wpmdb.functions.wpmdb_parse_json = function (maybe_json) {
	var json_object = {};
	try {
		json_object = jQuery.parseJSON(maybe_json);
	} catch (e) {

		// We simply return false here because the json data itself will never just contain a value of "false"
		return false;
	}
	return json_object;
};
/**
 * Global error method for detecting PHP or other errors in AJAX response
 *
 * @param title - the error title if not a PHP error
 * @param code - the error code if not a PHP error
 * @param text - the AJAX response text to sniff for errors
 * @param jqXHR - optional AJAX object used to enrich the error message
 *
 * @returns {string} - html error string with view error toggle element
 */
wpmdb.functions.wpmdbGetAjaxErrors = function (title, code, text, jqXHR) {
	var jsonErrors = false;
	var html = '';

	var validJson = wpmdb.functions.wpmdb_parse_json(text);
	if (false === validJson) {
		jsonErrors = true;
		title = wpmdb_strings.ajax_json_message;
		code = '(#144)';
		var originalText = text;
		text = wpmdb_strings.ajax_json_errors + ' ' + code;
		text += '<br><a class="show-errors-toggle" href="#">' + wpmdb_strings.view_error_messages + '</a> ';
		text += '<div class="migration-php-errors">' + originalText + '</div>';
	}

	// Only add local connection issue if php errors (#144) or jqXHR has been provided
	if (jsonErrors || 'undefined' !== jqXHR) {
		html += '<strong>' + title + '</strong>' + ' &mdash; ';
	}

	// Only add extra error details if not php errors (#144) and jqXHR has been provided
	if (!jsonErrors && 'undefined' !== jqXHR) {
		html += wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText;
		html += '<br /><br />' + wpmdb_strings.response + ':<br />';
	}

	// Add code to the end of the error text if not json errors
	if (!jsonErrors) {
		text += ' ' + code;
	}

	// Finally add the error message to the output
	html += text;

	return html;
};

wpmdb.preg_quote = function (str, delimiter) {

	//  discuss at: http://phpjs.org/functions/preg_quote/
	// original by: booeyOH
	// improved by: Ates Goral (http://magnetiq.com)
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Brett Zamir (http://brett-zamir.me)
	// bugfixed by: Onno Marsman
	//   example 1: preg_quote("$40");
	//   returns 1: '\\$40'
	//   example 2: preg_quote("*RRRING* Hello?");
	//   returns 2: '\\*RRRING\\* Hello\\?'
	//   example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
	//   returns 3: '\\\\\\.\\+\\*\\?\\[\\^\\]\\$\\(\\)\\{\\}\\=\\!\\<\\>\\|\\:'

	return String(str).replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
};

wpmdb.table_is = function (table_prefix, desired_table, given_table) {
	if ((table_prefix + desired_table).toLowerCase() === given_table.toLowerCase()) {
		return true;
	}

	var escaped_given_table = wpmdb.preg_quote(given_table);
	var regex = new RegExp(table_prefix + '([0-9]+)_' + desired_table, 'i');
	var results = regex.exec(escaped_given_table);
	return null != results;
};

wpmdb.subsite_for_table = function (table_prefix, table_name) {
	var escaped_table_name = wpmdb.preg_quote(table_name);
	var regex = new RegExp(table_prefix + '([0-9]+)_', 'i');
	var results = regex.exec(escaped_table_name);

	if (null === results) {
		return 1;
	} else {
		return results[1];
	}
};

wpmdb.functions.convertKBSizeToHR = function (size, dec, kbSize, retArray) {
	var retVal, units;
	kbSize = kbSize || 1000;
	dec = dec || 2;
	size = parseInt(size);

	if (kbSize > Math.abs(size)) {
		retVal = [size.toFixed(0), 'KB'];
	} else {
		units = ['MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		var u = -1;
		do {
			size /= kbSize;
			++u;
		} while (Math.abs(size) >= kbSize && u < units.length - 1);
		retVal = [Math.round(size * Math.pow(10, dec)) / Math.pow(10, dec), units[u]];
	}

	if (!retArray) {
		retVal = retVal[0] + ' ' + retVal[1];
	}
	return retVal;
};

wpmdb.functions.convertKBSizeToHRFixed = function (size, dec, kbSize) {
	dec = dec || 2;
	var hrSizeArray = wpmdb.functions.convertKBSizeToHR(size, dec, kbSize, true);
	if ('KB' !== hrSizeArray[1]) {
		return hrSizeArray[0].toFixed(2) + ' ' + hrSizeArray[1];
	}
	return hrSizeArray[0] + ' ' + hrSizeArray[1];
};

wpmdb.functions.ajax_handle_dismissible_notice = function (nonce, callback, ele) {
	jQuery.ajax({
		url: ajaxurl,
		type: 'POST',
		dataType: 'text',
		cache: false,
		data: {
			action: 'wpmdb_process_notice_link',
			nonce: nonce,
			notice: jQuery(ele).data('notice'),
			type: jQuery(ele).data('type'),
			reminder: jQuery(ele).data('reminder')
		},
		beforeSend: callback(ele)
	});
};

wpmdb.functions.get_spinner_url = function () {
	var admin_url = ajaxurl.replace('/admin-ajax.php', ''),
	    spinner_url = admin_url + '/images/spinner';

	if (2 < window.devicePixelRatio) {
		spinner_url += '-2x';
	}
	spinner_url += '.gif';

	return spinner_url;
};

},{}],2:[function(require,module,exports){
'use strict';

(function ($) {

	//If there's an error message visible about the mu-plugins folder not being writable
	if (0 < $('.wpmdb-compat-plugin-row-error').length) {
		$('[data-slug="wp-migrate-db-pro"]').addClass('wpmdbpro-has-message');
	}

	//For the free plugin the update class needs to be present
	$('.wpmdbpro-custom').prev().addClass('update');

	$('.notice-link-plugins-page').click(function (e) {
		e.preventDefault();
		var self = jQuery(this);

		wpmdb.functions.ajax_handle_dismissible_notice(wpmdb_nonces.process_notice_link, function (ele) {
			$(ele).closest('.wpmdbpro-custom').hide();

			// remove .wpmdb-has-message class from parent TR to add the bottom border back in
			$(ele).closest('tr').siblings('tr.wpmdbpro-has-message').removeClass('wpmdbpro-has-message');
		}, self);

		$('.wpmdbpro-custom').prev().removeClass('update');
	});
})(jQuery);

},{}],3:[function(require,module,exports){
'use strict';

(function ($) {

	$.wpmdb = {
		/**
   * Implement a WordPress-link Hook System for Javascript
   * TODO: Change 'tag' to 'args', allow number (priority), string (tag), object (priority+tag)
   */
		hooks: { action: {}, filter: {} },
		add_action: function add_action(action, callable, tag) {
			jQuery.wpmdb.add_hook('action', action, callable, tag);
		},
		add_filter: function add_filter(action, callable, tag) {
			jQuery.wpmdb.add_hook('filter', action, callable, tag);
		},
		do_action: function do_action(action, args) {
			jQuery.wpmdb.do_hook('action', action, null, args);
		},
		apply_filters: function apply_filters(action, value, args) {
			return jQuery.wpmdb.do_hook('filter', action, value, args);
		},
		remove_action: function remove_action(action, tag) {
			jQuery.wpmdb.remove_hook('action', action, tag);
		},
		remove_filter: function remove_filter(action, tag) {
			jQuery.wpmdb.remove_hook('filter', action, tag);
		},
		add_hook: function add_hook(hook_type, action, callable, tag) {
			if (undefined === jQuery.wpmdb.hooks[hook_type][action]) {
				jQuery.wpmdb.hooks[hook_type][action] = [];
			}
			var hooks = jQuery.wpmdb.hooks[hook_type][action];
			if (undefined === tag) {
				tag = action + '_' + hooks.length;
			}
			jQuery.wpmdb.hooks[hook_type][action].push({ tag: tag, callable: callable });
		},
		do_hook: function do_hook(hook_type, action, value, args) {
			if (undefined !== jQuery.wpmdb.hooks[hook_type][action]) {
				var hooks = jQuery.wpmdb.hooks[hook_type][action];
				for (var i = 0; i < hooks.length; i++) {
					if ('action' === hook_type) {
						hooks[i].callable(args);
					} else {
						value = hooks[i].callable(value, args);
					}
				}
			}
			if ('filter' === hook_type) {
				return value;
			}
		},
		remove_hook: function remove_hook(hook_type, action, tag) {
			if (undefined !== jQuery.wpmdb.hooks[hook_type][action]) {
				var hooks = jQuery.wpmdb.hooks[hook_type][action];
				for (var i = hooks.length - 1; 0 < i; i--) {
					if (undefined === tag || tag === hooks[i].tag) {
						hooks.splice(i, 1);
					}
				}
			}
		}
	};
})(jQuery);

},{}],4:[function(require,module,exports){
'use strict';

window.wpmdb = window.wpmdb || {};

(function ($, wpmdb) {

	var import_selected = false;
	var $import_select = $('#select-tables').clone();
	var tables_to_search = [];
	var tables_to_import = [];
	var unrecognized_import_file = false;
	var import_prefix = '';
	var import_info = {};
	var ajax_spinner = '<img src="' + wpmdb.functions.get_spinner_url() + '" alt="" class="ajax-spinner general-spinner" />';

	/**
  * Returns the migration status label for imports
  *
  * @param string label
  * @param object args
  *
  * @returns {string}
  */
	function import_migration_status_label(label, args) {
		if ('import' === args.intent) {
			if ('completed' === args.stage) {
				label = wpmdb_strings.import_label_completed;
			} else {
				label = wpmdb_strings.import_label_migrating;
			}
		}

		return label;
	}
	$.wpmdb.add_filter('wpmdb_get_migration_status_label', import_migration_status_label);

	/**
  * Updates the connection info box for imports
  *
  * @param object args
  */
	function import_connection_info_box(args) {
		var $import_file_status = $('.import-file-status');

		if ('import' === args.migration_type) {

			if (!import_selected) {
				$('.step-two').hide();

				if ($import_file_status.hasClass('profile-loaded')) {
					$import_file_status.attr('class', 'import-file-status profile-loaded notification-message success-notice');
					$import_file_status.html(wpmdb_strings.import_profile_loaded);
				} else {
					$import_file_status.html(wpmdb_strings.please_select_sql_file);
				}

				$import_file_status.show();
			} else {
				if (unrecognized_import_file) {
					$('.unrecognized-import-file-notice').show();
				}
			}

			maybe_show_find_replace_options();

			$('.mst-options').hide();
			$('.import-find-replace-option, .import-active-plugin-option').show();
		} else {
			$('.find-replace-rows, .table-options, .advanced-options, .exclude-post-types-options, label[for="backup-selected"]').show();
			$('.import-find-replace-option, .find-replace-options, .import-file-status, .import-active-plugin-option, .unrecognized-import-file-notice').hide();

			if ('search_all_imported' === $('input[name=table_migrate_option]:checked').val()) {
				$('input[name=table_migrate_option][value=migrate_only_with_prefix]').prop('checked', true);
			}
		}
	}
	$.wpmdb.add_action('move_connection_info_box', import_connection_info_box);

	/**
  * Starts the upload process for the import
  *
  * @param stage
  */
	function maybe_initiate_import(stage) {
		if ('import' === wpmdb.functions.wpmdb_migration_type()) {
			if ('backup' === stage) {
				wpmdb.common.hooks.push(wpmdb.functions.migrate_table_recursive);
			}

			wpmdb.common.hooks.push(wpmdb.functions.upload_file_recursive);
			wpmdb.common.next_step_in_migration = { fn: wpmdb.functions.wpmdb_call_next_hook };
			wpmdb.functions.execute_next_step();
		}
	}
	$.wpmdb.add_action('wpmdb_migration_initiated', maybe_initiate_import);

	/**
  * Restores the import select when changing migration types
  */
	function update_import_table_select() {
		$('#select-tables').remove();
		$('.select-tables-wrap').prepend($import_select);
		$('#select-tables').change();
	}
	$.wpmdb.add_action('wpmdb_update_import_table_select', update_import_table_select);

	/**
  * Updates the selected tables for the "Backup tables that will be replaced during the import" option
  *
  * @param tables_to_backup
  *
  * @return array
  */
	function backup_selected_for_import(tables_to_backup) {
		if ('import' === wpmdb.functions.wpmdb_migration_type()) {
			tables_to_backup = tables_to_import;
		}

		return tables_to_backup;
	}
	$.wpmdb.add_filter('wpmdb_backup_selected_tables', backup_selected_for_import);

	/**
  * Adds the import migration stage
  *
  * object args
  */
	function add_import_stage(args) {
		if ('import' === wpmdb.functions.wpmdb_migration_type()) {
			wpmdb.current_migration.model.addStage('upload', [], 'local', {
				strings: {
					stage_title: wpmdb_strings.upload
				}
			});

			wpmdb.current_migration.model.addStage('import', [], 'local', {
				strings: {
					stage_title: wpmdb_strings.migrate_button_import
				}
			});

			if ($('#import-find-replace').is(':checked')) {
				tables_to_search = args.tables_to_migrate;
				wpmdb.current_migration.model.addStage('find_replace', [], 'local', {
					strings: {
						migrated: wpmdb_strings.searched,
						stage_title: wpmdb_strings.migrate_button_find_replace
					}
				});
			}
		}
	}
	$.wpmdb.add_action('wpmdb_add_migration_stages', add_import_stage);

	/**
  * Adds any info necessary to begin an import
  *
  * @param object request_data
  *
  * @return {object}
  */
	function initiate_import_request_data(request_data) {
		if ('import' === wpmdb.functions.wpmdb_migration_type()) {
			request_data.import_info = import_info;
		}

		return request_data;
	}
	$.wpmdb.add_filter('wpmdb_initiate_migration_request_data', initiate_import_request_data);

	/**
  * Gets more information about the import file and loads step-two
  *
  * @param event
  */
	function get_import_info(event) {
		var files = event.target.files; // FileList object
		var file = files[0];
		var reader = new FileReader();
		var $import_file_status = $('.import-file-status');
		var $backup_selected_option = $('label[for="backup-selected"]');
		var $prefix_notice = $('.prefix-notice');
		var $unrecognized_file_notice = $('.unrecognized-import-file-notice');
		var $step_two = $('.step-two');
		var $old_url = $('#old-url');
		var $old_path = $('#old-path');
		var $new_url = $('#new-url');
		var $new_path = $('#new-path');

		$import_file_status.hide().attr('class', 'import-file-status');
		$prefix_notice.hide();
		$unrecognized_file_notice.hide();
		$step_two.hide();
		$('.mst-required ').hide();

		if (!files.length) {
			if (import_selected) {
				$step_two.hide();
				$import_file_status.text(wpmdb_strings.please_select_sql_file).show();
				import_selected = false;
			}
			return;
		} else {

			if ('.sql' === file.name.slice(-4) || '.sql.gz' === file.name.slice(-7)) {
				import_selected = true;
			} else {
				$import_file_status.addClass('notification-message error-notice migration-error').text(wpmdb_strings.invalid_sql_file).show();
				$step_two.hide();
				return;
			}
		}

		import_prefix = '';

		$import_file_status.text(wpmdb_strings.parsing_sql_file).append(ajax_spinner).show();

		reader.onloadend = function (event) {
			if (event.target.readyState !== FileReader.DONE) {
				return;
			}

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_get_import_info',
					file_data: event.target.result,
					nonce: wpmdb_data.nonces.import_file
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					console.log(jqXHR, textStatus, errorThrown);
				},
				success: function success(data) {
					$('.ajax-spinner').remove();
					$import_file_status.hide();

					if (true === wpmdb.functions.maybe_show_mst_warning(data)) {
						return;
					}

					$step_two.show();

					if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
						$import_file_status.text(data.body).addClass('notification-message error-notice migration-error').show();
						$step_two.hide();
					} else {
						var localStorage_form_data = wpmdb.functions.get_localStorage_form_data();
						import_info = data;

						if ('undefined' !== typeof data.prefix) {
							import_prefix = data.prefix;
							$('.table-prefix').text(data.prefix);
							wpmdb.functions.maybe_show_prefix_notice(data.prefix);
						}

						if ('undefined' !== typeof data.tables) {
							tables_to_import = data.tables;
							$backup_selected_option.show();

							// Update the find & replace values
							if (!localStorage_form_data) {
								$old_url.val(wpmdb.functions.remove_protocol(data.URL));
								$old_path.val(data.path);
								$new_url.val(wpmdb.functions.remove_protocol(wpmdb_data.this_url));
								$new_path.val(wpmdb_data.this_path);
							}

							// Update the select with tables that will be imported
							var loaded_tables = [];
							var loaded_post_types = [];

							if (localStorage_form_data) {
								loaded_tables = localStorage_form_data.select_tables;
								loaded_post_types = localStorage_form_data.select_post_types;
								wpmdb.functions.remove_localStorage_form_data();
							} else {
								if ('migrate_only_with_prefix' === $('input[name=table_migrate_option]:checked').val() && !$import_file_status.hasClass('profile-loaded')) {
									$('input[name=table_migrate_option][value=search_all_imported]').prop('checked', true);
								}
							}

							if (false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables) {
								loaded_tables = wpmdb_loaded_tables;
								loaded_post_types = wpmdb_loaded_post_types;
							}
							$import_select = wpmdb.functions.create_table_select(data.tables, [], loaded_tables);
							$.wpmdb.do_action('wpmdb_update_import_table_select');

							if ('undefined' !== typeof data.post_types) {
								var $post_type_select = document.createElement('select');
								$($post_type_select).attr({
									multiple: 'multiple',
									name: 'select_post_types[]',
									id: 'select-post-types',
									class: 'multiselect'
								});

								$.each(data.post_types, function (index, value) {
									var selected = $.inArray(value, loaded_post_types);
									if (-1 !== selected || true === wpmdb_convert_exclude_revisions && 'revision' !== value) {
										selected = true;
									} else {
										selected = false;
									}

									var opt = document.createElement('option');
									opt.value = value;
									opt.text = value;
									opt.selected = selected;
									$post_type_select.add(opt, null);
								});

								$('#select-post-types').remove();
								$('.exclude-post-types-warning').after($post_type_select);
							}

							if (unrecognized_import_file) {
								unrecognized_import_file = false;
								maybe_show_find_replace_options();
							}
						} else {
							$unrecognized_file_notice.show();
							$backup_selected_option.hide();
							$('.table-options').hide();
							unrecognized_import_file = true;

							$new_url.val($old_url.val());
							$new_path.val($old_path.val());
							$old_url.val('');
							$old_path.val('');
						}
					}
				}
			});
		};

		var blob = file.slice(0, 1024 * 1000);
		reader.readAsDataURL(blob);
	}
	$('#import-file').on('change', get_import_info);

	/**
  * Displays the find and replace options for imports
  */
	function maybe_show_find_replace_options() {
		var find_replace_rows = $('.find-replace-rows');
		return $('#import-find-replace').is(':checked') ? find_replace_rows.show() : find_replace_rows.hide();
	}
	$('#import-find-replace').on('click', maybe_show_find_replace_options);

	function maybe_show_table_options() {
		if (!unrecognized_import_file) {
			return;
		}

		setTimeout(function () {
			if ($('.find-replace-options-toggle .expand-collapse-arrow').hasClass('collapsed')) {
				return;
			}

			$('.table-options').hide();
		}, 1);
	}
	$('.find-replace-options-toggle').on('click', maybe_show_table_options);

	/**
  * Updates both `keep_active_plugins` checkboxes when one is changed.
  */
	function update_keep_active_plugins_option() {
		$('input[name=keep_active_plugins]').prop('checked', $(this).is(':checked'));
	}
	$('input[name=keep_active_plugins]').on('click', update_keep_active_plugins_option);

	/**
  * Recursively upload an import file
  *
  * @param int start
  */
	wpmdb.functions.upload_file_recursive = function (start) {
		start = 'undefined' === typeof start ? 0 : start;

		var file = document.getElementById('import-file').files[0];
		var slice_size = 1000 * 1024; // 1 MB
		var next_slice = start + slice_size + 1;
		var reader = new FileReader();

		if (0 === start) {
			wpmdb.current_migration.model.addStageItem('upload', file.name, file.size / 1000, Math.ceil(file.size / slice_size));
		}

		reader.onloadend = function (event) {
			if (event.target.readyState !== FileReader.DONE) {
				return;
			}

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_upload_file',
					file_data: event.target.result,
					file: file.name,
					file_type: file.type,
					migration_state_id: wpmdb.migration_state_id,
					stage: 'import',
					import_info: import_info,
					nonce: wpmdb_data.nonces.import_file
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					console.log(jqXHR, textStatus, errorThrown);
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function success(data) {
					wpmdb.current_migration.setText();

					if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						wpmdb.current_migration.setState(wpmdb_strings.migration_failed, data.body, 'error');

						return;
					}

					var size_done = start + slice_size;

					wpmdb.current_migration.setText(wpmdb_strings.uploading_file_to_server);
					wpmdb.current_migration.model.getStageModel('upload').setItemRowsTransferred(file.name, Math.ceil(size_done / slice_size));

					if (next_slice < file.size) {
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.upload_file_recursive,
							args: [next_slice]
						};
					} else {
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.upload_import_successful,
							args: [file]
						};
					}

					wpmdb.functions.execute_next_step();
				}
			});
		};

		var blob = file.slice(start, next_slice);
		reader.readAsDataURL(blob);
	};

	/**
  * Prepares the import stage
  *
  * @param file
  */
	wpmdb.functions.upload_import_successful = function (file) {

		$.ajax({
			type: 'POST',
			url: ajaxurl,
			data: {
				action: 'wpmdb_prepare_import_file',
				migration_state_id: wpmdb.migration_state_id,
				nonce: wpmdb_data.nonces.import_file
			},
			dataType: 'json',
			error: function error(jqXHR, textStatus, errorThrown) {
				console.log(jqXHR, textStatus, errorThrown);
				wpmdb.common.migration_error = true;
				wpmdb.functions.migration_complete_events();
			},
			success: function success(response) {
				var item_name = file.name;
				var migration_text = wpmdb_strings.importing_file_to_db;

				if ('.gz' === item_name.slice(-3)) {
					item_name = file.name.slice(0, -3);
				}

				migration_text = migration_text.replace(/\%s\s?/, item_name);
				wpmdb.current_migration.setText(migration_text);

				wpmdb.current_migration.model.addStageItem('import', item_name, response.import_size / 1000, response.num_chunks);
				wpmdb.current_migration.model.setActiveStage('import');

				wpmdb.common.next_step_in_migration = {
					fn: wpmdb.functions.import_file_recursive,
					args: [{
						import_filename: response.import_file,
						item_name: item_name,
						chunk: 0,
						current_query: ''
					}]
				};

				wpmdb.functions.execute_next_step();
			}
		});
	};

	/**
  * Recursively imports chunks to the database
  *
  * @param object args
  */
	wpmdb.functions.import_file_recursive = function (args) {

		$.ajax({
			type: 'POST',
			url: ajaxurl,
			data: {
				action: 'wpmdb_import_file',
				migration_state_id: wpmdb.migration_state_id,
				chunk: args.chunk,
				current_query: args.current_query,
				import_file: args.import_filename,
				nonce: wpmdb_data.nonces.import_file
			},
			dataType: 'json',
			error: function error(jqXHR, textStatus, errorThrown) {
				console.log(jqXHR, textStatus, errorThrown);
				wpmdb.common.migration_error = true;
				wpmdb.functions.migration_complete_events();
			},
			success: function success(response) {
				if ('undefined' !== typeof response.wpmdb_error && 1 === response.wpmdb_error) {
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, response.body, 'error');
					return;
				}

				wpmdb.current_migration.model.getStageModel('import').setItemRowsTransferred(args.item_name, response.chunk);

				if (response.chunk >= response.num_chunks) {

					wpmdb.current_migration.model.getStageModel('import').setItemRowsTransferred(args.item_name, ++response.chunk);

					if ($('#import-find-replace').is(':checked')) {

						if (unrecognized_import_file) {
							$.each(response.table_sizes, function (table, size) {
								if (table.startsWith(wpmdb_data.this_temp_prefix) && wpmdb_data.alter_table_name !== table) {
									var table_name = table.replace(wpmdb_data.this_temp_prefix, '');
									wpmdb.current_migration.model.addStageItem('find_replace', table_name, response.table_sizes[table], response.table_rows[table]);
								}
							});
						} else {
							var table_migrate_option = $('input[name=table_migrate_option]:checked').val();

							if ('migrate_only_with_prefix' === table_migrate_option) {
								tables_to_search = tables_to_import.filter(function (table) {
									return import_prefix === table.substring(0, import_prefix.length);
								});
							} else if ('search_all_imported' === table_migrate_option) {
								tables_to_search = tables_to_import;
							}

							$.each(tables_to_search, function (key, table) {
								var imported_table = wpmdb_data.this_temp_prefix + table;
								if (response.table_sizes.hasOwnProperty(imported_table)) {
									wpmdb.current_migration.model.addStageItem('find_replace', table, response.table_sizes[imported_table], response.table_rows[imported_table]);
								}
							});
						}

						tables_to_search = [];

						wpmdb.current_migration.model.setActiveStage('find_replace');
						var tables_to_migrate = wpmdb.functions.get_tables_to_migrate();

						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.migrate_table_recursive,
							args: ['-1', '', tables_to_migrate.length]
						};
						wpmdb.functions.execute_next_step();
						return;
					} else {
						$('.progress-label').removeClass('label-visible');
						wpmdb.common.hooks = $.wpmdb.apply_filters('wpmdb_before_migration_complete_hooks', wpmdb.common.hooks);
						wpmdb.common.hooks.push(wpmdb.functions.migration_complete);
						wpmdb.common.hooks.push(wpmdb.functions.wpmdb_flush);
						wpmdb.common.hooks = $.wpmdb.apply_filters('wpmdb_after_migration_complete_hooks', wpmdb.common.hooks);
						wpmdb.common.hooks.push(wpmdb.functions.migration_complete_events);
						wpmdb.common.next_step_in_migration = { fn: wpmdb.functions.wpmdb_call_next_hook };
					}
				} else {
					wpmdb.common.next_step_in_migration = {
						fn: wpmdb.functions.import_file_recursive,
						args: [{
							import_filename: args.import_filename,
							item_name: args.item_name,
							chunk: response.chunk,
							current_query: response.current_query
						}]
					};
				}

				wpmdb.functions.execute_next_step();
			}
		});
	};

	wpmdb.functions.get_tables_to_import = function () {
		return tables_to_import;
	};
})(jQuery, wpmdb);

},{}],5:[function(require,module,exports){
'use strict';

window.wpmdb = window.wpmdb || {};

(function ($, wpmdb) {

	$(document).ready(function () {

		wpmdb.functions.localStorage_available = function () {
			try {
				localStorage.setItem('wpmdb_test', 'wpmdb_test');
				localStorage.removeItem('wpmdb_test', 'wpmdb_test');
				return true;
			} catch (e) {
				return false;
			}
		};

		wpmdb.functions.maybe_reload_page = function () {
			var migration_type = wpmdb.functions.wpmdb_migration_type();

			if (!wpmdb.functions.localStorage_available() || 'cancelled' === wpmdb.current_migration.status || true === wpmdb.common.migration_error || -1 === $.inArray(migration_type, ['pull', 'import', 'find_replace'])) {
				return;
			}

			if ('true' === wpmdb_data.is_multisite && $('#mst-select-subsite').is(':checked') && wpmdb_data.this_domain !== $('#mst-selected-subsite option:selected').text()) {
				return;
			}

			var tables_to_migrate = wpmdb.functions.get_tables_to_migrate();

			if ('import' === migration_type) {
				tables_to_migrate = wpmdb.functions.get_tables_to_import();
			}

			if (-1 === $.inArray(wpmdb_data.this_prefix + 'options', tables_to_migrate) && -1 === $.inArray(wpmdb_data.this_prefix + 'usermeta', tables_to_migrate)) {
				return;
			}

			wpmdb.functions.set_localStorage_form_data();
			location.reload();
		};

		wpmdb.functions.set_localStorage_form_data = function () {
			var data = {};

			$.each($('#migrate-form').serializeArray(), function (index, field) {
				if ('[]' === field.name.substr(-2)) {
					var field_name = field.name.slice(0, -2);
					if ('undefined' === typeof data[field_name]) {
						data[field_name] = [];
					}
					data[field_name].push(field.value);
				} else {
					data[field.name] = field.value;
				}
			});

			localStorage.setItem('wpmdb_migrate_form', JSON.stringify(data));
		};

		wpmdb.functions.get_localStorage_form_data = function () {
			var form_data = localStorage.getItem('wpmdb_migrate_form');

			if (null === form_data) {
				return false;
			}

			try {
				form_data = JSON.parse(form_data);
			} catch (err) {
				return false;
			}

			return form_data;
		};

		wpmdb.functions.remove_localStorage_form_data = function () {
			localStorage.removeItem('wpmdb_migrate_form');
		};

		wpmdb.functions.load_data_from_localStorage = function () {
			var form_data = wpmdb.functions.get_localStorage_form_data();

			if (!form_data) {
				return;
			}

			$.each(form_data, function (name, value) {
				var $input = $('[name="' + name + '"]');
				var input_type = $input.attr('type');

				if ('action' === name) {
					wpmdb.migration_selection = value;
					$('#' + value).prop('checked', true);
				} else {
					if ('radio' === input_type) {
						$('[name="' + name + '"][value="' + value + '"]').prop('checked', true);
					} else if ('checkbox' === input_type) {
						$input.prop('checked', true);

						if ($input.parent().hasClass('checkbox-label')) {
							$input.parent().next().show();
						}
					} else {
						$input.val(value);
					}
				}
			});

			$('.option-group input[type=radio]').change();
			$('.' + wpmdb.migration_selection + '-list ul').show();

			$.when(wpmdb.functions.connection_box_changed()).done(function () {
				if ('migrate_select' === $('input[name=table_migrate_option]:checked').val()) {
					if ('undefined' !== typeof form_data.select_tables) {
						$('#select-tables').val(form_data.select_tables);
					}

					$('.table-options .expandable-content, .select-tables-wrap').show();
					$('.table-options .expand-collapse-arrow').removeClass('collapsed');
				} else {
					$('.select-tables-wrap').hide();
				}

				if ('backup_manual_select' === $('input[name=backup_option]:checked').val()) {
					if ('undefined' !== typeof form_data.select_backup) {
						$('#select-backup').val(form_data.select_backup);
					}

					$('.backup-tables-wrap').show();
				}

				if ('undefined' !== typeof form_data.select_post_types) {
					$('#select-post-types').val(form_data.select_post_types);
					wpmdb.functions.exclude_post_types_warning();
				}

				if ('undefined' !== typeof form_data.replace_old) {

					$('.replace-row').not('.original-repeatable-field').remove();

					var n = 1;
					$.each(form_data.replace_old, function (index, value) {
						if (!$('.replace-row:nth-child(' + n + ')').length) {
							$('.replace-row').last().after($('.original-repeatable-field').clone().removeClass('original-repeatable-field'));
						}

						$('.replace-row:nth-child(' + n + ') [name="replace_old[]"]').val(value);
						$('.replace-row:nth-child(' + n + ') [name="replace_new[]"]').val(form_data.replace_new[index]);
						n++;
					});
				}
			});

			wpmdb.functions.update_migrate_button_text();

			if ('import' !== wpmdb.functions.wpmdb_migration_type()) {
				wpmdb.functions.remove_localStorage_form_data();
			}
		};
		wpmdb.functions.load_data_from_localStorage();
	});
})(jQuery, wpmdb);

},{}],6:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var $ = jQuery;
var MigrationProgressModel = require('MigrationProgress-model');
var MigrationProgressView = require('MigrationProgress-view');
var $overlayOriginal = $('<div id="overlay" class="hide"></div>');
var $progressContentOriginal = $('.progress-content').clone().addClass('hide');
var $proVersion = $('.pro-version').addClass('hide');

$overlayOriginal.append($proVersion);

var MigrationProgressController = {
	migration: {
		model: {},
		view: {},
		$progress: {},
		$wrapper: {},
		$overlay: {},
		status: 'active',
		title: '',
		text: '',
		timerCount: 0,
		elapsedInterval: 0,
		currentStageNum: 0,
		counterDisplay: false,
		originalTitle: document.title,
		setTitle: function setTitle(title) {
			this.$progress.find('.progress-title').html(title);
			this.title = title;
		},
		setStatus: function setStatus(status) {
			this.$progress.removeClass(this.status).addClass('error' === status ? 'wpmdb-error' : status);

			// Possible statuses include: 'error', 'paused', 'complete', 'cancelling'
			if ('error' === status) {
				this.$progress.find('.progress-text').addClass('migration-error');
			}

			this.status = status;

			this.updateTitleElem();
		},
		setText: function setText(text) {
			if ('string' !== typeof text) {
				text = '';
			}

			if (0 >= text.indexOf('wpmdb_error')) {
				text = this.decodeErrorObject(text);
			}

			this.$progress.find('.progress-text').html(text);
			this.text = text;
		},
		setState: function setState(title, text, status) {
			if (null !== title) {
				this.setTitle(title);
			}
			if (null !== text) {
				this.setText(text);
			}
			if (null !== status) {
				this.setStatus(status);
			}
		},
		startTimer: function startTimer() {
			this.timerCount = 0;
			this.counterDisplay = $('.timer');
			this.elapsedInterval = setInterval(this.incrementTimer, 1000);
		},
		pauseTimer: function pauseTimer() {
			clearInterval(this.elapsedInterval);
		},
		resumeTimer: function resumeTimer() {
			this.elapsedInterval = setInterval(this.incrementTimer, 1000);
		},
		incrementTimer: function incrementTimer() {
			wpmdb.current_migration.timerCount = wpmdb.current_migration.timerCount + 1;
			wpmdb.current_migration.displayCount();
		},
		displayCount: function displayCount() {
			var hours = Math.floor(this.timerCount / 3600) % 24;
			var minutes = Math.floor(this.timerCount / 60) % 60;
			var seconds = this.timerCount % 60;
			var display = this.pad(hours, 2, 0) + ':' + this.pad(minutes, 2, 0) + ':' + this.pad(seconds, 2, 0);
			this.counterDisplay.html(display);
		},
		updateTitleElem: function updateTitleElem() {
			var activeStage = this.model.get('activeStageName');
			var stageModel = this.model.getStageModel(activeStage);
			var percentDone = Math.max(0, stageModel.getTotalProgressPercent());
			var numStages = this.model.get('stages').length;
			var currentStage = this.currentStageNum;
			var currentStatus = this.status;
			var progressText = wpmdb_strings.title_progress;

			if ('complete' === stageModel.get('status') && 0 === stageModel.get('totalSize')) {
				percentDone = 100;
			}

			progressText = progressText.replace('%1$s', percentDone + '%');
			progressText = progressText.replace('%2$s', currentStage);
			progressText = progressText.replace('%3$s', numStages);

			if (1 === numStages) {
				progressText = percentDone + '%';
			}

			if (wpmdb_strings['title_' + currentStatus]) {
				progressText = wpmdb_strings['title_' + currentStatus];
			}

			progressText = progressText + ' - ' + this.originalTitle;

			document.title = progressText;
		},
		restoreTitleElem: function restoreTitleElem() {
			document.title = this.originalTitle;
		},
		pad: function pad(num, width, padChar) {
			padChar = padChar || '0';
			num = num + '';
			return num.length >= width ? num : new Array(width - num.length + 1).join(padChar) + num;
		},

		// fixes error objects that have been mangled by html encoding
		decodeErrorObject: function decodeErrorObject(input) {
			var inputDecoded = input.replace(/\{&quot;/g, '{#q!#').replace(/\&quot;}/g, '#q!#}').replace(/,&quot;/g, ',#q!#').replace(/&quot;:/g, '#q!#:').replace(/:&quot;/g, ':#q!#').replace(/&quot;/g, '\\"').replace(/#q!#/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
			try {
				inputDecoded = JSON.parse(inputDecoded);
			} catch (e) {
				return input;
			}
			return 'object' === (typeof inputDecoded === 'undefined' ? 'undefined' : _typeof(inputDecoded)) && 'undefined' !== typeof inputDecoded.body ? inputDecoded : input;
		},
		fixProgressStageWidthForScrollBar: function fixProgressStageWidthForScrollBar() {
			var scrollBarWidth = Math.abs(this.$wrapper[0].offsetWidth - this.$wrapper[0].clientWidth);
			var visibleProgressItems = this.$wrapper.find('.active .progress-items');
			var leftPad = parseInt(visibleProgressItems.css('padding-left'), 10);
			var rightPad = parseInt(visibleProgressItems.css('padding-right'), 10);

			if (0 !== scrollBarWidth || 0 === scrollBarWidth && rightPad !== leftPad) {
				visibleProgressItems.css('padding-right', leftPad - scrollBarWidth + 'px');
			}
		}
	},
	newMigration: function newMigration(settings) {
		$('#overlay').remove();
		$('.progress-content').remove();
		this.migration.$overlay = $overlayOriginal.clone();

		$('#wpwrap').append(this.migration.$overlay);

		this.migration.model = new MigrationProgressModel(settings);
		this.migration.view = new MigrationProgressView({
			model: this.migration.model
		});

		this.migration.$progress = $progressContentOriginal.clone();
		this.migration.$wrapper = this.migration.view.$el;
		this.migration.$progress.find('.migration-progress-stages').replaceWith(this.migration.$wrapper);

		this.migration.$proVersion = this.migration.$overlay.find('.pro-version');
		var proVersionIFrame = this.migration.$proVersion.find('iframe').remove().clone();

		this.migration.$overlay.prepend(this.migration.$progress);

		// timeout needed so class is added after elements are appended to dom and transition runs.
		var self = this;
		setTimeout(function () {
			self.migration.$overlay.add(self.migration.$progress).add(self.migration.$proVersion).removeClass('hide').addClass('show');
			if (self.migration.$proVersion.length) {
				setTimeout(function () {
					self.migration.$proVersion.find('.iframe').append(proVersionIFrame);
				}, 500);
			}
		}, 0);

		this.migration.currentStageNum = 0;

		this.migration.$proVersion.on('click', '.close-pro-version', function () {
			self.migration.$proVersion.find('iframe').remove();
			self.migration.$proVersion.addClass('hide remove');
			setTimeout(function () {
				self.migration.$proVersion.remove();
			}, 500);
		});

		this.migration.model.on('migrationComplete', function () {
			self.utils.updateProgTableVisibilitySetting();
			self.utils.updatePauseBeforeFinalizeSetting();
			self.migration.pauseTimer();
		});

		$(window).on('resize', _.debounce(this.migration.fixProgressStageWidthForScrollBar.bind(this.migration), 100));
		this.migration.model.on('change:activeStage', this.migration.fixProgressStageWidthForScrollBar.bind(this.migration));

		return this.migration;
	},
	utils: require('MigrationProgress-utils')
};

module.exports = MigrationProgressController;

},{"MigrationProgress-model":7,"MigrationProgress-utils":8,"MigrationProgress-view":9}],7:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var MigrationProgressStageModel = require('MigrationProgressStage-model');
var $ = jQuery;

var MigrationProgressModel = Backbone.Model.extend({
	defaults: {
		_initialStages: null,
		stages: null,
		activeStageName: null,
		stageModels: null,
		localTableRows: null,
		localTableSizes: null,
		remoteTableRows: null,
		remoteTableSizes: null,
		migrationStatus: 'active',
		migrationIntent: 'savefile'
	},
	initialize: function initialize() {
		this.set('stageModels', {});
		this.set('_initialStages', this.get('stages'));
		this.set('stages', []);
		_.each(this.get('_initialStages'), function (stage, items, dataType) {
			this.addStage(stage.name, items, dataType);
		}, this);
	},
	addStage: function addStage(name, items, dataType, extend) {
		var itemsArr = [];
		var stage;

		_.each(items, function (item) {
			var size, rows;

			if ('remote' === dataType) {
				size = this.get('remoteTableSizes')[item];
				rows = this.get('remoteTableRows')[item];
			} else {
				size = this.get('localTableSizes')[item];
				rows = this.get('localTableRows')[item];
			}

			itemsArr.push({
				name: item,
				size: size,
				rows: rows
			});
		}, this);

		stage = {
			name: name,
			items: itemsArr,
			dataType: dataType
		};

		if ('object' === (typeof extend === 'undefined' ? 'undefined' : _typeof(extend))) {
			stage = $.extend(stage, extend);
		}

		this.addStageModel(stage);

		this.trigger('stage:added', this.get('stageModels')[name]);
		this.get('stageModels')[name].on('change', function () {
			this.trigger('change');
		}, this);

		return this.getStageModel(stage.name);
	},
	addStageItem: function addStageItem(stage, name, size, rows) {
		this.getStageModel(stage).addItem(name, size, rows);
	},
	addStageModel: function addStageModel(stage) {
		var stages = this.get('stages');
		var stageModels = this.get('stageModels');
		var newStageModel = new MigrationProgressStageModel(stage);

		stages.push(stage);
		stageModels[stage.name] = newStageModel;

		this.set('stages', stages);
		this.set('stageModels', stageModels);
	},
	getStageModel: function getStageModel(name) {
		return this.get('stageModels')[name];
	},
	getStageItems: function getStageItems(stage, map) {
		var stageModel = this.getStageModel(stage);
		var items = stageModel.get('items');

		if (undefined === map) {
			return items;
		} else {
			return items.map(function (item) {
				return item[map];
			});
		}
	},
	setActiveStage: function setActiveStage(stage) {
		this.setStageComplete();
		this.set('activeStageName', stage);
		this.getStageModel(stage).set('status', 'active');
		this.trigger('change:activeStage');
	},
	setStageComplete: function setStageComplete(stage) {
		if (!stage) {
			stage = this.get('activeStageName');
		}
		if (null !== stage) {
			this.getStageModel(stage).set('status', 'complete');
		}

		wpmdb.current_migration.currentStageNum = wpmdb.current_migration.currentStageNum + 1;
	},
	setMigrationComplete: function setMigrationComplete() {
		var lastStage = this.getStageModel(this.get('activeStageName'));
		this.setStageComplete();
		this.trigger('migrationComplete');
		this.set('migrationStatus', 'complete');
		lastStage.activateTab();
	}
});

module.exports = MigrationProgressModel;

},{"MigrationProgressStage-model":10}],8:[function(require,module,exports){
'use strict';

var $ = jQuery;

module.exports = {
	updateProgTableVisibilitySetting: function updateProgTableVisibilitySetting() {
		if (!wpmdb_data.prog_tables_visibility_changed) {
			return;
		}
		wpmdb_data.prog_tables_visibility_changed = false;

		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_save_setting',
				nonce: wpmdb_data.nonces.save_setting,
				setting: 'prog_tables_hidden',
				checked: Boolean(wpmdb_data.prog_tables_hidden)
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				console.log('Could not save progress item visibility setting', errorThrown);
			}
		});
	},
	updatePauseBeforeFinalizeSetting: function updatePauseBeforeFinalizeSetting() {
		if (!wpmdb_data.pause_before_finalize_changed) {
			return;
		}
		wpmdb_data.pause_before_finalize_changed = false;

		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_save_setting',
				nonce: wpmdb_data.nonces.save_setting,
				setting: 'pause_before_finalize',
				checked: Boolean(wpmdb_data.pause_before_finalize)
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				console.log('Could not save pause before finalize setting', errorThrown);
			}
		});
	}
};

},{}],9:[function(require,module,exports){
'use strict';

var MigrationProgressStageView = require('./MigrationProgressStage-view.js');
var $ = jQuery;

var MigrationProgressView = Backbone.View.extend({
	tagName: 'div',
	className: 'migration-progress-stages',
	id: 'migration-progress-stages',
	self: undefined,
	initialize: function initialize() {
		this.$el.empty();

		this.model.on('stage:added', function (stageModel) {
			this.addStageView(stageModel);
		}, this);

		_.each(this.model.get('stageModels'), this.addStageView, this);
	},
	addStageView: function addStageView(stageModel) {
		var newStageSubView = new MigrationProgressStageView({
			model: stageModel
		});
		stageModel.trigger('view:initialized', newStageSubView);
		this.$el.append(newStageSubView.$el);
		this.$el.parent().find('.stage-tabs').append(newStageSubView.$tabElem);
	}
});

module.exports = MigrationProgressView;

},{"./MigrationProgressStage-view.js":11}],10:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var $ = jQuery;

var MigrationProgressStage = Backbone.Model.extend({
	defaults: {
		status: 'queued',
		_initialItems: null,
		items: null,
		lookupItems: null,
		totalSize: 0,
		totalTransferred: 0,
		dataType: 'local',
		name: '',
		itemsComplete: 0,
		itemsCompleteArr: [],
		strings: null
	},
	initialize: function initialize() {
		this.initStrings();

		this.set('_initialItems', this.get('items').slice());
		this.set('items', []);
		this.set('lookupItems', {});
		this.set('itemsCompleteArr', []);

		_.each(this.get('_initialItems'), function (item) {
			this.addItem(item.name, item.size, item.rows);
		}, this);

		this.on('view:initialized', this.triggerItemViewInit);

		this.on('change', function () {
			wpmdb.current_migration.updateTitleElem();
		});
	},
	initStrings: function initStrings() {
		var default_strings = {
			stage_title: this.get('name'),
			migrated: wpmdb_strings.migrated,
			queued: wpmdb_strings.queued,
			active: wpmdb_strings.running,
			complete: wpmdb_strings.complete,
			hide: wpmdb_strings.hide,
			show: wpmdb_strings.show,
			itemsName: wpmdb_strings.tables
		};
		var strings = this.get('strings');

		strings = 'object' === (typeof strings === 'undefined' ? 'undefined' : _typeof(strings)) ? strings : {};
		strings = $.extend(default_strings, strings);

		strings.items_migrated = strings.itemsName + ' ' + strings.migrated;
		strings.hide_items = strings.hide + ' ' + strings.itemsName;
		strings.show_items = strings.show + ' ' + strings.itemsName;

		this.set('strings', strings);
	},
	addItem: function addItem(name, size, rows) {
		var items = this.get('items');
		var item = {
			name: name,
			size: size,
			rows: rows || size,
			stageName: this.get('name'),
			$el: null,
			transferred: 0,
			rowsTransferred: 0,
			complete: false
		};

		items.push(item);
		this.get('lookupItems')[name] = items.length - 1;

		this.set('totalSize', parseInt(this.get('totalSize')) + parseInt(size));
		this.trigger('item:added', item);
	},
	triggerItemViewInit: function triggerItemViewInit() {
		var items = this.get('items');
		var self = this;
		_.each(items, function (item) {
			self.trigger('item:added', item);
		});
	},
	getTotalSizeTransferred: function getTotalSizeTransferred() {
		return this.get('totalTransferred');
	},
	countItemsComplete: function countItemsComplete() {
		return this.get('itemsComplete');
	},
	getTotalProgressPercent: function getTotalProgressPercent() {
		var transferred = this.getTotalSizeTransferred();
		var total = this.get('totalSize');
		if (0 >= transferred || 0 >= total) {
			return 0;
		}
		return Math.min(100, Math.floor(transferred / total * 100));
	},
	activateTab: function activateTab() {
		this.trigger('activateTab');
		wpmdb.current_migration.model.trigger('change:activeStage');
	},
	setItemComplete: function setItemComplete(itemName) {

		// Guard: return if item has already been set complete
		var itemsCompleteArr = this.get('itemsCompleteArr');
		if (~itemsCompleteArr.indexOf(itemName)) {
			return;
		}
		itemsCompleteArr.push(itemName);

		var item = this.getItemByName(itemName);
		var totalTransferred = this.get('totalTransferred');
		var itemsComplete = this.get('itemsComplete');

		this.set('itemsComplete', ++itemsComplete);

		totalTransferred += item.size - item.transferred;
		this.set('totalTransferred', totalTransferred);

		item.transferred = item.size;
		item.complete = true;
		item.rowsTransferred = item.rows;
		this.trigger('change change:items', item);
	},
	setItemRowsTransferred: function setItemRowsTransferred(itemName, numRows) {
		var amtDone, estTransferred;
		var item = this.getItemByName(itemName);
		var totalTransferred = this.get('totalTransferred');

		if (-1 === parseInt(numRows)) {
			amtDone = 1;
		} else {
			amtDone = Math.min(1, numRows / item.rows);
		}

		if (1 === amtDone) {
			this.setItemComplete(itemName);
			return;
		}

		estTransferred = item.size * amtDone;

		totalTransferred += estTransferred - item.transferred;
		this.set('totalTransferred', totalTransferred);

		item.transferred = estTransferred;
		item.rowsTransferred = numRows;
		this.trigger('change change:items', item);
	},
	getItemByName: function getItemByName(itemName) {
		var item = this.get('items')[this.get('lookupItems')[itemName]] || {};
		if (itemName === item.name) {
			return item;
		} else {
			return this.determineItemByName(itemName);
		}
	},
	determineItemByName: function determineItemByName(itemName) {
		var items = this.get('items');
		for (var index = 0; index < items.length; index++) {
			var item = items[index];
			if (itemName === item.name) {
				this.get('lookupItems').itemName = index;
				return item;
			}
		}
	}
});

module.exports = MigrationProgressStage;

},{}],11:[function(require,module,exports){
'use strict';

var $ = jQuery;

var MigrationProgressStageView = Backbone.View.extend({
	tagName: 'div',
	className: 'migration-progress-stage-container hide-tables',
	$totalProgressElem: null,
	$tabElem: null,
	$showHideTablesElem: null,
	$pauseBeforeFinalizeElem: null,
	$pauseBeforeFinalizeCheckbox: null,
	$itemsContainer: null,
	itemViews: null,
	maxDomNodes: 100,
	visibleDomNodes: 0,
	queuedElements: null,
	$truncationNotice: null,
	$truncationNoticeHiddenItems: null,
	initialize: function initialize() {
		this.$el.empty();
		this.$el.attr('data-stage', this.model.get('name')).addClass('queued ' + this.model.get('name'));

		this.queuedElements = [];

		this.initTotalProgressElem();
		wpmdb.current_migration.view.$el.parent().find('.stage-tabs').after(this.$totalProgressElem);

		this.$itemsContainer = $('<div class=progress-items />');
		this.$el.append(this.$itemsContainer);

		this.initTabElem();

		this.model.on('item:added', this.maybeAddElementToView, this);

		_.each(this.model.get('itemModels'), this.maybeAddElementToView, this);
		this.model.on('change', function () {
			this.updateProgressElem();
			this.updateStageTotals();
		}, this);

		this.model.on('change:status', function (e) {
			this.$el.removeClass('queued active').addClass(this.model.get('status'));
			this.$totalProgressElem.removeClass('queued active').addClass(this.model.get('status'));
			this.$tabElem.removeClass('queued active').addClass(this.model.get('status')).find('.stage-status').text(this.model.get('strings')[this.model.get('status')]);
		}, this);

		this.model.on('change:items', function (item) {
			if (item.name) {
				this.setItemProgress(item);
			}
		}, this);

		this.model.on('activateTab', function () {
			if ('complete' === wpmdb.current_migration.model.get('migrationStatus')) {
				this.$totalProgressElem.addClass('active').siblings().removeClass('active');
				this.$tabElem.addClass('active').siblings().removeClass('active');
				this.$el.addClass('active').siblings().removeClass('active');
			}
		}, this);
	},
	initTotalProgressElem: function initTotalProgressElem() {
		this.initShowHideTablesElem();
		this.initPauseBeforeFinalizeElem();

		this.$totalProgressElem = $('<div class="stage-progress ' + this.model.get('name') + '" />').append('<span class=percent-complete>0</span>% ' + this.model.get('strings').complete + ' ').append('<span class="size-complete-wrap">(<span class=size-complete>0 MB</span> / <span class=size-total>0 MB</span>) </span>').append('<span class="items-complete-wrap"><span class=items-complete>0</span> <span class=lowercase >of</span> <span class=items-total>0</span> ' + this.model.get('strings').items_migrated + '</span>').append(this.$showHideTablesElem).append('<div class=progress-bar-wrapper><div class=progress-bar /></div>');

		this.updateStageTotals();
	},
	initShowHideTablesElem: function initShowHideTablesElem() {
		this.$showHideTablesElem = $('<a class=show-hide-tables/>').text(this.model.get('strings').show_items);
		var self = this;
		this.$showHideTablesElem.on('click show-hide-progress-tables', function () {
			var progTablesHidden;
			if (self.$el.hasClass('hide-tables')) {
				// show tables
				progTablesHidden = false;
				self.$el.add(self.$el.siblings()).removeClass('hide-tables');
				self.$showHideTablesElem.text(self.model.get('strings').hide_items);
			} else {
				// hide tables
				progTablesHidden = true;
				self.$el.add(self.$el.siblings()).addClass('hide-tables');
				self.$showHideTablesElem.text(self.model.get('strings').show_items);
			}

			if (Boolean(progTablesHidden) !== Boolean(wpmdb_data.prog_tables_hidden)) {
				wpmdb_data.prog_tables_visibility_changed = true;
				wpmdb_data.prog_tables_hidden = progTablesHidden;
			}
		});

		// show progress tables on init if hidden is false
		if (!wpmdb_data.prog_tables_hidden) {
			this.$showHideTablesElem.triggerHandler('show-hide-progress-tables');
		}

		// make sure text reflects current state when showing
		this.model.on('change:status activateTab', function () {
			if (wpmdb_data.prog_tables_hidden) {
				self.$showHideTablesElem.text(self.model.get('strings').show_items);
			} else {
				self.$showHideTablesElem.text(self.model.get('strings').hide_items);
			}
		});
	},
	initPauseBeforeFinalizeElem: function initPauseBeforeFinalizeElem() {
		this.$pauseBeforeFinalizeElem = $('.pause-before-finalize');
		this.$pauseBeforeFinalizeCheckbox = this.$pauseBeforeFinalizeElem.find('input[type=checkbox]');
		var self = this;
		var isChecked = false;
		var migrationIntent = wpmdb.current_migration.model.get('migrationIntent');

		// make sure checkbox is checked based on current state
		if (wpmdb_data.pause_before_finalize) {
			isChecked = true;
		}
		this.$pauseBeforeFinalizeCheckbox.prop('checked', isChecked);

		// only display on certain migrations
		if (-1 !== $.inArray(migrationIntent, ['push', 'pull', 'find_replace', 'import'])) {
			if ('find_replace' === migrationIntent) {
				$('#pause-before-finalize-label').text(wpmdb_strings.pause_before_finalize_find_replace);
			}
			this.$pauseBeforeFinalizeElem.show();
		} else {
			this.$pauseBeforeFinalizeElem.hide();
		}

		// hide on media stage
		wpmdb.current_migration.model.on('change:activeStage', function () {
			if ('media' === wpmdb.current_migration.model.get('activeStageName')) {
				self.$pauseBeforeFinalizeElem.hide();
			}
		});

		this.$pauseBeforeFinalizeElem.on('click', function () {
			var pauseBeforeFinalizeValue = Boolean(self.$pauseBeforeFinalizeCheckbox.is(':checked'));
			if (pauseBeforeFinalizeValue !== Boolean(wpmdb_data.pause_before_finalize)) {
				wpmdb_data.pause_before_finalize_changed = true;
				wpmdb_data.pause_before_finalize = pauseBeforeFinalizeValue;
			}
		});
	},
	initTabElem: function initTabElem() {
		var self = this;
		this.$tabElem = $('<a class=stage-tab>').append('<span class=stage-title>' + this.model.get('strings').stage_title + '</span> ').append('<span class=stage-status>' + this.model.get('strings').queued + '</span> ').on('click', function () {
			self.model.activateTab();
		});
	},
	updateProgressElem: function updateProgressElem() {
		var percentDone = Math.max(0, this.model.getTotalProgressPercent());
		var sizeDone = wpmdb.functions.convertKBSizeToHRFixed(Math.min(this.model.getTotalSizeTransferred(), this.model.get('totalSize')));
		var tablesDone = Math.min(this.model.countItemsComplete(), this.model.get('items').length);

		if ('complete' === this.model.get('status') && 0 === this.model.get('totalSize')) {
			percentDone = 100;
			this.$showHideTablesElem.fadeOut();
		}

		this.$totalProgressElem.find('.percent-complete').text(percentDone);
		this.$totalProgressElem.find('.size-complete').text(sizeDone);
		this.$totalProgressElem.find('.items-complete').text(wpmdb.functions.wpmdb_add_commas(tablesDone));
		this.$totalProgressElem.find('.progress-bar-wrapper .progress-bar').css({ width: percentDone + '%' });
	},
	updateStageTotals: function updateStageTotals() {
		var itemCount = this.model.get('items').length;
		this.$totalProgressElem.find('.items-total').text(wpmdb.functions.wpmdb_add_commas(itemCount));
		this.$totalProgressElem.find('.size-total').text(wpmdb.functions.convertKBSizeToHRFixed(this.model.get('totalSize')));
	},
	initializeItemElement: function initializeItemElement(item) {
		var $el = $('<div class="item-progress" />');
		var $progress = $('<div class="progress-bar"/>').css('width', '0%');
		var $title = $('<p>').addClass('item-info').append($('<span class="name" />').text(item.name)).append(' ').append($('<span class="size" />').text('(' + wpmdb.functions.convertKBSizeToHRFixed(item.size) + ')'));

		$el.append($title);
		$el.append($progress);
		$el.append('<span class="dashicons dashicons-yes"/>');

		$el.attr('id', 'item-' + item.name);
		$el.attr('data-stage', this.model.get('name'));

		item.$el = $el;
		item.$progress = $progress;
		item.$title = $title;

		return item;
	},
	maybeAddElementToView: function maybeAddElementToView(item) {
		if (this.visibleDomNodes < this.maxDomNodes) {
			++this.visibleDomNodes;
			this.$itemsContainer.append(this.initializeItemElement(item).$el);
		} else {
			this.queuedElements.push(item);
			if (!this.$truncationNotice) {
				this.showTruncationNotice();
			} else {
				this.updateTruncationNotice();
			}
		}
	},
	showTruncationNotice: function showTruncationNotice() {
		if (this.$truncationNotice) {
			return;
		}
		this.$truncationNotice = $('<div class="truncation-notice" >' + wpmdb_strings.progress_items_truncated_msg.replace('%1$s', '<span class="hidden-items">' + wpmdb.functions.wpmdb_add_commas(this.queuedElements.length) + '</span>') + '</div>');
		this.$truncationNoticeHiddenItems = this.$truncationNotice.find('.hidden-items');
		this.$itemsContainer.after(this.$truncationNotice);
	},
	updateTruncationNotice: function updateTruncationNotice() {
		this.$truncationNoticeHiddenItems.text(wpmdb.functions.wpmdb_add_commas(this.queuedElements.length));
	},
	getNextElementForView: function getNextElementForView($el) {
		var queueItem;
		if (this.queuedElements.length) {
			if ($el) {
				this.queuedElements.push($el);
			}
			queueItem = this.queuedElements.shift();
			if (queueItem instanceof $) {
				$el = queueItem;
			} else {
				$el = this.initializeItemElement(queueItem).$el;
			}
		}
		return $el;
	},
	setItemProgress: function setItemProgress(item) {
		var percentDone = Math.min(100, Math.ceil(100 * (item.transferred / item.size)));
		item.$progress.css('width', percentDone + '%');
		if (100 <= percentDone) {
			this.elemComplete(item);
		}
	},
	elemComplete: function elemComplete(item) {
		var $el = item.$el.addClass('complete');

		// skip moving item to end of list if there's only one item in the list
		if (1 === this.model.get('items').length) {
			return;
		}

		var $nextEl = this.getNextElementForView($el);

		var height = $el.height();
		var marginBottom = $el.css('margin-bottom');

		var $clone = $nextEl.clone().css({ height: 0, marginBottom: 0 }).addClass('clone');
		$clone.appendTo(this.$itemsContainer);
		$el.css({ height: height, marginBottom: marginBottom });

		setTimeout(function () {
			$el.css({ height: 0, marginBottom: 0 });
			$clone.css({ height: height, marginBottom: marginBottom });

			setTimeout(function () {
				$el.css({ height: 'auto', marginBottom: marginBottom }).remove();
				$clone.remove();
				this.$itemsContainer.find('.item-progress:not(.clone)').last().after($nextEl.css({ height: 'auto', marginBottom: marginBottom }));
			}.bind(this), 250);
		}.bind(this), 1000);
	}
});

module.exports = MigrationProgressStageView;

},{}],12:[function(require,module,exports){
'use strict';

window.wpmdb = window.wpmdb || {};

(function ($, wpmdb) {
	wpmdb.functions.update_multiselect = function (element, subsites, selected_subsite_ids) {
		$(element).empty();

		if (0 < Object.keys(subsites).length) {
			var table_prefix = $.wpmdb.apply_filters('wpmdb_get_table_prefix', null, null);
			var site_selected = false;
			$.each(subsites, function (blog_id, subsite_path) {
				if ($.wpmdb.apply_filters('wpmdb_exclude_subsite', false, blog_id)) {
					return;
				}

				var selected = ' ';
				if (undefined === selected_subsite_ids || null === selected_subsite_ids || 0 === selected_subsite_ids.length || undefined !== selected_subsite_ids && null !== selected_subsite_ids && 0 < selected_subsite_ids.length && -1 !== $.inArray(blog_id, selected_subsite_ids)) {
					selected = ' selected="selected" ';
					site_selected = true;
				}
				subsite_path += ' (' + table_prefix + ('1' !== blog_id ? blog_id + '_' : '') + ')';
				$(element).append('<option' + selected + 'value="' + blog_id + '">' + subsite_path + '</option>');
			});

			// If nothing selected (maybe IDs differ between saved profile and current config) revert to default of all selected.
			if (false === site_selected) {
				wpmdb.functions.update_multiselect(element, subsites, []);
			}
		}
	};
})(jQuery, wpmdb);

},{}],13:[function(require,module,exports){
'use strict';

(function ($) {

	var doing_check_licence = false;
	var fade_duration = 650;

	var admin_url = ajaxurl.replace('/admin-ajax.php', '');
	var spinner_url = admin_url + '/images/spinner';
	var spinner;
	if (2 < window.devicePixelRatio) {
		spinner_url += '-2x';
	}
	spinner_url += '.gif';
	spinner = $('<img src="' + spinner_url + '" alt="" class="check-licence-spinner" />');

	$(document).ready(function () {

		$('body').on('click', '.check-my-licence-again', function (e) {
			e.preventDefault();
			$(this).blur();

			if (doing_check_licence) {
				return false;
			}

			doing_check_licence = true;

			$(this).hide();
			spinner.insertAfter(this);

			var check_again_link = ' <a class="check-my-licence-again" href="#">' + wpmdb_update_strings.check_license_again + '</a>';

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_check_licence',
					nonce: wpmdb_nonces.check_licence,
					context: 'update'
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					doing_check_licence = false;
					$('.wpmdb-licence-error-notice').fadeOut(fade_duration, function () {
						$('.wpmdb-licence-error-notice').empty().html(wpmdb_update_strings.license_check_problem + check_again_link).fadeIn(fade_duration);
					});
				},
				success: function success(data) {
					doing_check_licence = false;
					if ('undefined' !== typeof data.errors) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$('.wpmdb-licence-error-notice').fadeOut(fade_duration, function () {
							$('.check-licence-spinner').remove();
							$('.wpmdb-licence-error-notice').empty().html(msg).fadeIn(fade_duration);
						});
					} else {

						// Success
						// Fade out, empty wpmdb custom error content, swap back in the original wordpress upgrade message, fade in
						$('.wpmdbpro-custom-visible').fadeOut(fade_duration, function () {
							$('.check-licence-spinner').remove();
							$('.wpmdbpro-custom-visible').empty().html($('.wpmdb-original-update-row').html()).fadeIn(fade_duration);
						});
					}
				}
			});
		});

		$('.wpmdbpro-custom').prev().addClass('wpmdbpro-has-message');
	});
})(jQuery);

},{}],14:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

window.wpmdb = window.wpmdb || {};

(function ($, wpmdb) {

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
	var force_reconnect = false;
	var migration_selection = '';
	var show_version_notice = false;
	var migration_completed = false;
	var currently_migrating = false;
	var dump_filename = '';
	var dump_path = '';
	var migration_intent;
	var remote_site;
	var secret_key;
	var form_data;
	var stage;
	var elapsed_interval;
	var completed_msg;
	var tables_to_migrate = [];
	var migration_paused = false;
	var previous_progress_title = '';
	var previous_progress_text_primary = '';
	var previous_progress_text_secondary = '';
	var cancelling_text = '';
	var paused_text = '';
	var migration_cancelled = false;
	var flag_skip_delay = false;
	var delay_between_requests = 0;
	var fade_duration = 400;
	var pause_before_finalize = false;
	var is_auto_pause_before_finalize = false;
	var spinner_url = wpmdb.functions.get_spinner_url();
	var ajax_spinner = '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />';

	wpmdb.migration_progress_controller = require('MigrationProgress-controller');
	wpmdb.current_migration = null;
	wpmdb.migration_selection = wpmdb.functions.wpmdb_migration_type();

	var $push_select = $('#select-tables').clone();
	var $pull_select = $('#select-tables').clone();
	var $push_post_type_select = $('#select-post-types').clone();
	var $pull_post_type_select = $('#select-post-types').clone();
	var $push_select_backup = $('#select-backup').clone();
	var $pull_select_backup = $('#select-backup').clone();

	var $connection_info_box = $('.connection-info-wrapper');

	window.onbeforeunload = function (e) {
		if ('import' === wpmdb.functions.wpmdb_migration_type() && !$('.step-two').is(':visible')) {
			wpmdb.functions.remove_localStorage_form_data();
		}

		if (currently_migrating) {
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
		return 'number' === typeof n && 0 === n % 1;
	}

	function get_intersect(arr1, arr2) {
		var r = [],
		    o = {},
		    l = arr2.length,
		    i,
		    v;
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

	function pin_replace_url(pin) {
		if (true === pin && 1 > $('.replace-row.pin').length && 1 === $('#old-url').length) {
			$('#old-url').parents('.replace-row').addClass('pin');
		}

		if (false === pin && 0 < $('.replace-row.pin').length) {
			$('.replace-row.pin').removeClass('pin');
		}
	}

	/**
  * Core plugin wrapper for the common AJAX error detecting method
  *
  * @param text
  * @param code
  * @param jqXHR
  *
  * @returns {string}
  */
	function get_ajax_errors(text, code, jqXHR) {
		return wpmdb.functions.wpmdbGetAjaxErrors(wpmdb_strings.connection_local_server_problem, code, text, jqXHR);
	}

	// updates the debug log when the user switches to the help tab
	function refresh_debug_log() {
		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_get_log',
				nonce: wpmdb_data.nonces.get_log
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				alert(wpmdb_strings.update_log_problem);
			},
			success: function success(data) {
				$('.debug-log-textarea').val(data);
			}
		});
	}

	function get_query_var(name) {
		name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
		var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
		    results = regex.exec(location.search);
		return null === results ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	function maybe_show_ssl_warning(url, key, remote_scheme) {
		var scheme = url.substr(0, url.indexOf(':'));
		var $ssl_notice = $('.ssl-notice');

		if (!show_ssl_notice) {
			$ssl_notice.hide();
		}

		if (remote_scheme !== scheme && url.indexOf('https') !== -1) {
			$ssl_notice.show();
			show_ssl_notice = true;
			url = url.replace('https', 'http');
			$('.pull-push-connection-info').val(url + '\n' + key);
			return;
		}

		show_ssl_notice = false;
	}

	function validate_url(url) {
		return (/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url)
		);
	}

	function refresh_table_selects() {
		if (undefined !== wpmdb_data && undefined !== wpmdb_data.this_tables && undefined !== wpmdb_data.this_table_sizes_hr) {
			$push_select = wpmdb.functions.create_table_select(wpmdb_data.this_tables, wpmdb_data.this_table_sizes_hr, $($push_select).val());
		}

		if (undefined !== wpmdb.common.connection_data && undefined !== wpmdb.common.connection_data.tables && undefined !== wpmdb.common.connection_data.table_sizes_hr) {
			$pull_select = wpmdb.functions.create_table_select(wpmdb.common.connection_data.tables, wpmdb.common.connection_data.table_sizes_hr, $($pull_select).val());
		}
	}

	function save_active_profile() {
		var profile;
		$('.save-settings-button').blur();

		if (doing_save_profile) {
			return;
		}

		if (true === wpmdb.functions.maybe_show_select_table_notice()) {
			return;
		}

		var create_new_profile = false;

		if ($('#create_new').is(':checked')) {
			create_new_profile = true;
		}
		var profile_name = $('.create-new-profile').val();

		doing_save_profile = true;
		profile = $($('#migrate-form')[0].elements).not('.auth-credentials').serialize();

		$('.save-settings-button').attr('disabled', 'disabled').after('<img src="' + spinner_url + '" alt="" class="save-profile-ajax-spinner general-spinner" />');

		doing_ajax = true;

		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_save_profile',
				profile: profile,
				nonce: wpmdb_data.nonces.save_profile
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				doing_ajax = false;
				alert(wpmdb_strings.save_profile_problem);
				$('.save-settings-button').removeAttr('disabled');
				$('.save-profile-ajax-spinner').remove();
				$('.save-settings-button').after('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
				$('.ajax-success-msg').fadeOut(2000, function () {
					$(this).remove();
				});
				doing_save_profile = false;
			},
			success: function success(data) {
				var updated_profile_id = parseInt($('#migrate-form input[name=save_migration_profile_option]:checked').val(), 10) + 1;
				doing_ajax = false;
				$('.save-settings-button').removeAttr('disabled');
				$('.save-profile-ajax-spinner').remove();
				$('.save-settings-button').after('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
				$('.ajax-success-msg').fadeOut(2000, function () {
					$(this).remove();
				});
				doing_save_profile = false;
				$('.create-new-profile').val('');

				if (create_new_profile) {
					var new_profile_key = parseInt(data, 10);
					var new_profile_id = new_profile_key + 1;
					var new_li = $('<li><span class="delete-profile" data-profile-id="' + new_profile_id + '"></span><label for="profile-' + new_profile_id + '"><input id="profile-' + new_profile_id + '" value="' + new_profile_key + '" name="save_migration_profile_option" type="radio"></label></li>');
					new_li.find('label').append(document.createTextNode(' ' + profile_name));
					updated_profile_id = new_profile_id;

					$('#create_new').parents('li').before(new_li);
					$('#profile-' + new_profile_id).attr('checked', 'checked');
				}

				// Push updated profile id to history if available
				var updated_url = window.location.href.replace('#migrate', '').replace(/&wpmdb-profile=-?\d+/, '') + '&wpmdb-profile=' + updated_profile_id;
				var updated_profile_name = $('#migrate-form input[name=save_migration_profile_option]:checked').parent().text().trim();

				if ('function' === typeof window.history.pushState) {
					if ($('#migrate-form .crumbs').length) {
						$('#migrate-form .crumbs .crumb:last').text(updated_profile_name);
					} else {
						var $crumbs = $('<div class="crumbs" />').append('<a class="crumb" href="' + wpmdb_data.this_plugin_base + '"> Saved Profiles </a>').append('<span class="crumb">' + updated_profile_name + '</span>');
						$('#migrate-form').prepend($crumbs);
					}
					window.history.pushState({ updated_profile_id: updated_profile_id }, null, updated_url);
				}
			}
		});
	}

	function cancel_migration(event) {
		migration_cancelled = true;
		cancelling_text = wpmdb_strings.cancelling_migration;
		$('.migration-controls').css({ visibility: 'hidden' });

		if ('find_replace' === migration_intent) {
			cancelling_text = wpmdb_strings.cancelling_find_replace;
		}

		wpmdb.current_migration.setState(cancelling_text, wpmdb_strings.completing_current_request, 'cancelling');

		if (true === migration_paused) {
			migration_paused = false;
			wpmdb.functions.execute_next_step();
		}
	}

	/**
  * Set checkbox
  *
  * @param string checkbox_wrap
  */
	function set_checkbox(checkbox_wrap) {
		var $switch = $('#' + checkbox_wrap);
		var $checkbox = $switch.find('input[type=checkbox]');

		$switch.toggleClass('on').find('span').toggleClass('checked');
		var switch_on = $switch.find('span.on').hasClass('checked');
		$checkbox.attr('checked', switch_on).trigger('change');
	}

	// save file (export) / push / pull special conditions
	function move_connection_info_box() {
		var $connection_status = $('.connection-status');
		var $directory_permission_notice = $('.directory-permission-notice');
		var $compatibility_older_mysql = $('.compatibility-older-mysql');
		var $mst_required = $('.mst-required');
		var $keep_active_plugins = $('.keep-active-plugins');
		var $step_two = $('.step-two');
		var $backup_options = $('.backup-options');
		var new_migration_type = wpmdb.functions.wpmdb_migration_type();
		var profile_name, table_prefix, backup_table_prefix, uploads_dir, upload_dir_long, write_permission;

		$connection_status.hide();
		$directory_permission_notice.hide();
		$step_two.show();
		$backup_options.show();
		$keep_active_plugins.show();
		$compatibility_older_mysql.hide();
		$mst_required.hide();

		wpmdb.functions.wpmdb_toggle_migration_action_text();

		$('.migrate-tab').attr('class', 'migrate-tab content-tab').addClass(wpmdb.functions.wpmdb_migration_type());

		$.wpmdb.do_action('move_connection_info_box', {
			'migration_type': new_migration_type,
			'last_migration_type': last_replace_switch
		});

		if (-1 !== $.inArray(new_migration_type, ['push', 'pull'])) {
			var $pull_push_connection_info = $('.pull-push-connection-info');
			var connection_info = $.trim($pull_push_connection_info.val()).split('\n');
			var $migration_list_li = $('.' + new_migration_type + '-list li');

			$migration_list_li.append($connection_info_box);
			$connection_info_box.show(function () {
				var connection_textarea = $(this).find('.pull-push-connection-info');
				if (!connection_textarea.val()) {
					connection_textarea.focus();
				}
			});

			// Reconnect if the migration type was just changed
			if (new_migration_type !== last_replace_switch && 2 === connection_info.length) {
				wpmdb.force_reconnect = true;
				$migration_list_li.append($connection_info_box);
				$pull_push_connection_info.removeClass('temp-disabled').attr('readonly', 'readonly');
				$('.connect-button').hide();
				wpmdb.functions.connection_box_changed();
				return;
			}

			if (connection_established) {
				$connection_status.hide();
				$step_two.show();

				wpmdb.functions.wpmdb_toggle_migration_action_text();

				if ('pull' === new_migration_type) {
					table_prefix = wpmdb.common.connection_data.prefix;
					backup_table_prefix = wpmdb_data.site_details.prefix;
					uploads_dir = wpmdb_data.this_uploads_dir;
					upload_dir_long = wpmdb_data.this_upload_dir_long;
					write_permission = wpmdb_data.write_permission;
				} else {
					table_prefix = wpmdb_data.this_prefix;
					backup_table_prefix = wpmdb.common.connection_data.prefix;
					uploads_dir = wpmdb.common.connection_data.uploads_dir;
					upload_dir_long = wpmdb.common.connection_data.upload_dir_long;
					write_permission = wpmdb.common.connection_data.write_permissions;
				}

				$('.table_prefix').html(table_prefix);
				$('.backup-table-prefix').html(backup_table_prefix);
				$('.uploads-dir').html(uploads_dir);

				maybe_show_backup_disabled_msg(upload_dir_long, write_permission);

				if (false === profile_name_edited) {
					profile_name = get_domain_name(wpmdb.common.connection_data.url);
					$('.create-new-profile').val(profile_name);
				}
			} else {
				$connection_status.show();
				$step_two.hide();
			}
		} else if (-1 !== $.inArray(new_migration_type, ['find_replace', 'savefile'])) {
			$connection_status.hide();
			$step_two.show();
			$('.table-prefix').html(wpmdb_data.this_prefix);
			if (false === profile_name_edited) {
				$('.create-new-profile').val('');
			}

			$keep_active_plugins.hide();

			if ('savefile' === new_migration_type) {
				$backup_options.hide();
				$compatibility_older_mysql.show();

				if ('false' === wpmdb_data.write_permission) {
					$directory_permission_notice.show();
					$step_two.hide();
				}
			} else {
				if ('true' === wpmdb_data.is_multisite) {
					var $old_replace_col = $('.old-replace-col').eq(1);
					$old_replace_col.parent().removeClass('pin').find('.replace-remove-row').show();
					$old_replace_col.find('input').removeAttr('readonly');
				}

				maybe_show_backup_disabled_msg(wpmdb_data.this_upload_dir_long, wpmdb_data.write_permission);
			}
		}

		maybe_show_mixed_cased_table_name_warning();
	}

	function maybe_show_backup_disabled_msg(upload_dir, write_permission) {
		var $create_backup = $('#create-backup');
		var $create_backup_label = $('#create-backup-label');
		var $backup_option_disabled = $('.backup-option-disabled');

		$create_backup.removeAttr('disabled');
		$create_backup_label.removeClass('disabled');
		$backup_option_disabled.hide();

		if ('false' === write_permission) {
			$create_backup.prop('checked', false);
			$create_backup.attr('disabled', 'disabled');
			$create_backup_label.addClass('disabled');
			$backup_option_disabled.show();
			$('.upload-directory-location').html(upload_dir);
		}
	}

	function change_replace_values() {
		var old_url = null;
		var old_path = null;
		if (null !== wpmdb.common.previous_connection_data && 'object' === _typeof(wpmdb.common.previous_connection_data) && wpmdb.common.previous_connection_data.url !== wpmdb.common.connection_data.url) {
			old_url = wpmdb.functions.remove_protocol(wpmdb.common.previous_connection_data.url);
			old_path = wpmdb.common.previous_connection_data.path;
		}

		if ('push' === wpmdb.functions.wpmdb_migration_type() || 'savefile' === wpmdb.functions.wpmdb_migration_type()) {
			if ('pull' === last_replace_switch) {
				$('.replace-row').each(function () {
					var old_val = $('.old-replace-col input', this).val();
					$('.old-replace-col input', this).val($('.replace-right-col input', this).val());
					$('.replace-right-col input', this).val(old_val);
				});
			} else if ('push' === last_replace_switch && 'push' === wpmdb.functions.wpmdb_migration_type() && null !== old_url && null !== old_path) {
				$('.replace-row').each(function () {
					var old_val = $('.replace-right-col input', this).val();
					if (old_val === old_path) {
						$('.replace-right-col input', this).val(wpmdb.common.connection_data.path);
					}
					if (old_val === old_url) {
						$('.replace-right-col input', this).val(wpmdb.functions.remove_protocol(wpmdb.common.connection_data.url));
					}
				});
			}
			$.wpmdb.do_action('wpmdb_update_push_table_select');
			$('#select-post-types').remove();
			$('.exclude-post-types-warning').after($push_post_type_select);
			wpmdb.functions.exclude_post_types_warning();
			$('#select-backup').remove();
			$('.backup-tables-wrap').prepend($push_select_backup);
		} else if ('pull' === wpmdb.functions.wpmdb_migration_type()) {
			if ('' === last_replace_switch || 'push' === last_replace_switch || 'savefile' === last_replace_switch) {
				$('.replace-row').each(function () {
					var old_val = $('.old-replace-col input', this).val();
					$('.old-replace-col input', this).val($('.replace-right-col input', this).val());
					$('.replace-right-col input', this).val(old_val);
				});
			} else if ('pull' === last_replace_switch && 'pull' === wpmdb.functions.wpmdb_migration_type() && null !== old_url && null !== old_path) {
				$('.replace-row').each(function () {
					var old_val = $('.old-replace-col input', this).val();
					if (old_val === old_path) {
						$('.old-replace-col input', this).val(wpmdb.common.connection_data.path);
					}
					if (old_val === old_url) {
						$('.old-replace-col input', this).val(wpmdb.functions.remove_protocol(wpmdb.common.connection_data.url));
					}
				});
			}
			$.wpmdb.do_action('wpmdb_update_pull_table_select');
			$('#select-post-types').remove();
			$('.exclude-post-types-warning').after($pull_post_type_select);
			wpmdb.functions.exclude_post_types_warning();
			$('#select-backup').remove();
			$('.backup-tables-wrap').prepend($pull_select_backup);
		}
		last_replace_switch = wpmdb.functions.wpmdb_migration_type();
	}

	function switch_to_plugin_tab(hash, skip_addons_check) {
		$('.nav-tab').removeClass('nav-tab-active');
		$('.nav-tab.' + hash).addClass('nav-tab-active');
		$('.content-tab').hide();
		$('.' + hash + '-tab').show();

		if ('settings' === hash) {
			if (true === should_check_licence()) {
				$('p.licence-status').append('Checking License... ').append(ajax_spinner);
				check_licence();
			}
		}

		if ('help' === hash) {
			refresh_debug_log();
			if (true === should_check_licence()) {
				$('.support-content p').append(ajax_spinner);
				check_licence();
			}
		}

		if ('addons' === hash && true !== skip_addons_check) {
			if (true === should_check_licence()) {
				$('.addons-content p').append(ajax_spinner);
				check_licence();
			}
		}
	}

	function hide_overlay() {
		$('#overlay').removeClass('show').addClass('hide');
		$('#overlay > div').removeClass('show').addClass('hide');
		wpmdb.current_migration.$proVersion.find('iframe').remove();
		setTimeout(function () {
			$('#overlay').remove();
		}, 500);
		migration_completed = false;
	}

	function check_licence(licence) {
		var update_licence_content = !doing_licence_registration_ajax;
		checked_licence = true;
		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'json',
			cache: false,
			data: {
				action: 'wpmdb_check_licence',
				licence: licence,
				context: 'all',
				nonce: wpmdb_data.nonces.check_licence
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				alert(wpmdb_strings.license_check_problem);
			},
			success: function success(data) {

				var $support_content = $('.support-content');
				var $addons_content = $('.addons-content');
				var $licence_content = $('.licence-status:not(.notification-message)');
				var licence_msg, support_msg, addons_msg;

				if ('undefined' !== typeof data.dbrains_api_down) {
					support_msg = data.dbrains_api_down + data.message;
					addons_msg = data.dbrains_api_down;
				} else if ('undefined' !== typeof data.errors) {

					if ('undefined' !== typeof data.errors.subscription_expired) {
						licence_msg = data.errors.subscription_expired.licence;
						support_msg = data.errors.subscription_expired.support;
						addons_msg = data.errors.subscription_expired.addons;
					} else {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						support_msg = msg;
						addons_msg = msg;
					}
					if ('undefined' !== typeof data.addon_content) {
						addons_msg += '\n' + data.addon_content;
					}
				} else {
					support_msg = data.message;
					addons_msg = data.addon_content;
				}

				if (update_licence_content) {
					$licence_content.stop().fadeOut(fade_duration, function () {
						if ('undefined' === typeof licence_msg) {
							$(this).css({ visibility: 'hidden', display: 'block' }).slideUp();
							licence_msg = '';
						}

						$(this).empty().html(licence_msg).stop().fadeIn(fade_duration);
					});
				}

				$support_content.stop().fadeOut(fade_duration, function () {
					$(this).empty().html(support_msg).stop().fadeIn(fade_duration);
				});
				$addons_content.stop().fadeOut(fade_duration, function () {
					$(this).empty().html(addons_msg).stop().fadeIn(fade_duration);
				});

				if ($('#plugin-compatibility').is(':not(:checked)')) {
					$('#compatibility-header').click();
				}
			}
		});
	}

	function should_check_licence() {
		return false === checked_licence && '1' === wpmdb_data.has_licence && 'true' === wpmdb_data.is_pro;
	}

	function maybe_show_mixed_cased_table_name_warning() {
		if ('undefined' === typeof wpmdb.common.connection_data || false === wpmdb.common.connection_data) {
			return;
		}

		var migration_intent = wpmdb.functions.wpmdb_migration_type();
		var tables_to_migrate = wpmdb.functions.get_tables_to_migrate(null, null);

		$('.mixed-case-table-name-notice').hide();

		if (null === tables_to_migrate) {
			return;
		}

		tables_to_migrate = tables_to_migrate.join('');

		// The table names are all lowercase, no need to display the warning.
		if (tables_to_migrate === tables_to_migrate.toLowerCase()) {
			return;
		}

		/*
   * Do not display the warning if the remote lower_case_table_names does not equal "1" (i.e the only problematic setting)
   * Applies to push/export migrations.
   */
		if ('1' !== wpmdb.common.connection_data.lower_case_table_names && ('push' === migration_intent || 'savefile' === migration_intent)) {
			return;
		}

		/*
   * Do not display the warning if the local lower_case_table_names does not equal "1" (i.e the only problematic setting)
   * Only applies to pull migrations.
   */
		if ('1' !== wpmdb_data.lower_case_table_names && 'pull' === migration_intent) {
			return;
		}

		/*
   * At this stage we've determined:
   * 1. The source database contains at least one table that contains an uppercase character.
   * 2. The destination environment has lower_case_table_names set to 1.
   * 3. The source database table containing the uppercase letter will be converted to lowercase during the migration.
   */

		if ('push' === migration_intent || 'savefile' === migration_intent) {
			$('.mixed-case-table-name-notice.push').show();
		} else {
			$('.mixed-case-table-name-notice.pull').show();
		}
	}

	function enable_pro_licence(data, licence_key) {
		$('.licence-input, .register-licence').remove();
		$('.licence-not-entered').prepend(data.masked_licence);
		$('.support-content').empty().html('<p>' + wpmdb_strings.fetching_license + '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" /></p>');
		check_licence(licence_key);

		$('.migrate-selection label').removeClass('disabled');
		$('.migrate-selection input').removeAttr('disabled');
	}

	function get_domain_name(url) {
		var temp_url = url;
		var domain = temp_url.replace(/\/\/(.*)@/, '//').replace('http://', '').replace('https://', '').replace('www.', '');
		return domain;
	}

	function update_domain_placeholder(label, url, stage) {
		var domain = get_domain_name(url);

		if ('completed' === stage) {
			return label.replace(/\%s\s?/, '<span class=domain-label>' + domain + '</span>&nbsp;');
		}

		return label.replace(/\%s(\S*)\s?/, '<span class=domain-label>' + domain + '$1</span>&nbsp;');
	}

	function get_migration_status_label(url, intent, stage) {
		var migrating_stage_label = '';
		var completed_stage_label = '';

		switch (intent) {
			case 'push':
				migrating_stage_label = wpmdb_strings.push_migration_label_migrating;
				completed_stage_label = wpmdb_strings.push_migration_label_completed;
				break;
			case 'pull':
				migrating_stage_label = wpmdb_strings.pull_migration_label_migrating;
				completed_stage_label = wpmdb_strings.pull_migration_label_completed;
				break;
			case 'find_replace':
				migrating_stage_label = wpmdb_strings.find_replace_label_migrating;
				completed_stage_label = wpmdb_strings.find_replace_label_completed;
				break;
			case 'savefile':
				migrating_stage_label = wpmdb_strings.exporting_please_wait;
				completed_stage_label = wpmdb_strings.exporting_complete;
				break;
		}

		var label = migrating_stage_label;

		if ('completed' === stage) {
			label = completed_stage_label;
		}

		if ('push' === intent || 'pull' === intent) {
			label = update_domain_placeholder(label, url, stage);
		}

		label = $.wpmdb.apply_filters('wpmdb_get_migration_status_label', label, {
			intent: intent,
			stage: stage
		});

		return label;
	}

	function disable_export_type_controls() {
		$('.option-group').each(function (index) {
			$('input', this).attr('disabled', 'disabled');
			$('label', this).css('cursor', 'default');
		});
	}

	function enable_export_type_controls() {
		$('.option-group').each(function (index) {
			$('input', this).removeAttr('disabled');
			$('label', this).css('cursor', 'pointer');
		});
	}

	function set_slider_value(parent_selector, value, unit, display) {
		var display_value = value;

		if (undefined !== display) {
			display_value = display;
		}

		$('.slider', parent_selector).slider('value', parseInt(value));
		$('.amount', parent_selector).html(wpmdb.functions.wpmdb_add_commas(display_value) + ' ' + unit);
	}

	function set_pause_resume_button(event) {
		if (true === migration_paused) {
			migration_paused = false;
			doing_ajax = true;

			wpmdb.current_migration.setState(previous_progress_title, previous_progress_text_primary, 'active');
			$('.pause-resume').html(wpmdb_strings.pause);

			// Resume the timer
			wpmdb.current_migration.resumeTimer();

			wpmdb.functions.execute_next_step();
		} else {
			migration_paused = true;
			doing_ajax = false;
			paused_text = wpmdb_strings.migration_paused;
			previous_progress_title = $('.progress-title').html();
			previous_progress_text_primary = $('.progress-text', '.progress-wrapper-primary').html();
			previous_progress_text_secondary = $('.progress-text', '.progress-wrapper-secondary ').html();

			if ('find_replace' === migration_intent) {
				paused_text = wpmdb_strings.find_replace_paused;
			}

			wpmdb.current_migration.setState(paused_text, wpmdb_strings.completing_current_request, null);
			$('body').off('click', '.pause-resume'); // Is re-bound at execute_next_step when migration is finally paused
			$('body').off('click', '.cancel'); // Is re-bound at execute_next_step when migration is finally paused
		}
	}

	/**
  * Filter temporary tables out of wpmdb.functions.create_table_select().
  *
  * @param exclude
  * @param table_name
  * @returns {bool}
  */
	function filter_temp_tables(exclude, table_name) {
		var temp_prefix = wpmdb_data.this_temp_prefix;

		if ('pull' === wpmdb.functions.wpmdb_migration_type() && 'undefined' !== typeof wpmdb.common.connection_data && 'undefined' !== typeof wpmdb.common.connection_data.temp_prefix) {
			temp_prefix = wpmdb.common.connection_data.temp_prefix;
		}

		if (temp_prefix === table_name.substring(0, temp_prefix.length)) {
			return true;
		}

		return exclude;
	}

	$.wpmdb.add_filter('wpmdb_exclude_table', filter_temp_tables);

	function get_table_prefix(value, args) {
		return $('.table-select-wrap .table-prefix').text();
	}

	function lock_replace_url(lock) {
		if (true === lock) {
			$('.replace-row.pin .replace-right-col input[type="text"]').attr('readonly', 'readonly');
			$('.replace-row.pin .arrow-col').addClass('disabled');
		} else {
			$('.replace-row.pin .replace-right-col input[type="text"]').removeAttr('readonly');
			$('.replace-row.pin .arrow-col').removeClass('disabled');
		}
	}

	function set_connection_data(data) {
		wpmdb.common.previous_connection_data = wpmdb.common.connection_data;
		wpmdb.common.connection_data = data;
		$.wpmdb.do_action('wpmdb_connection_data_updated', data);
	}

	/**
  * Returns formatted info for the Max Request Size slider.
  *
  * @param value
  * @return object
  */
	function get_max_request_display_info(value) {
		var display_info = {};

		display_info.unit = 'MB';
		display_info.amount = (value / 1024).toFixed(2);

		return display_info;
	}

	function establish_remote_connection_from_saved_profile() {
		var action = wpmdb.functions.wpmdb_migration_type();
		var connection_info = $.trim($('.pull-push-connection-info').val()).split('\n');
		if ('undefined' === typeof wpmdb_default_profile || true === wpmdb_default_profile || 'savefile' === action || 'find_replace' === action || 'import' === action || doing_ajax || !wpmdb_data.is_pro) {
			return;
		}

		doing_ajax = true;
		disable_export_type_controls();

		$('.connection-status').html(wpmdb_strings.establishing_remote_connection);
		$('.connection-status').removeClass('notification-message error-notice migration-error');
		$('.connection-status').append(ajax_spinner);

		var intent = wpmdb.functions.wpmdb_migration_type();

		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'json',
			cache: false,
			data: {
				action: 'wpmdb_verify_connection_to_remote_site',
				url: connection_info[0],
				key: connection_info[1],
				intent: intent,
				nonce: wpmdb_data.nonces.verify_connection_to_remote_site,
				convert_post_type_selection: wpmdb_convert_post_type_selection,
				profile: wpmdb_data.profile
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				$('.connection-status').html(get_ajax_errors(jqXHR.responseText, '(#102)', jqXHR));
				$('.connection-status').addClass('notification-message error-notice migration-error');
				$('.ajax-spinner').remove();
				doing_ajax = false;
				enable_export_type_controls();
			},
			success: function success(data) {
				$('.ajax-spinner').remove();
				doing_ajax = false;
				enable_export_type_controls();

				if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
					$('.connection-status').html(data.body);
					$('.connection-status').addClass('notification-message error-notice migration-error');

					if (data.body.indexOf('401 Unauthorized') > -1) {
						$('.basic-access-auth-wrapper').show();
					}

					return;
				}

				if (true === wpmdb.functions.maybe_show_mst_warning(data)) {
					$('.connection-status').hide();
					return;
				}

				maybe_show_ssl_warning(connection_info[0], connection_info[1], data.scheme);
				wpmdb.functions.maybe_show_prefix_notice(data.prefix);

				$('.pull-push-connection-info').addClass('temp-disabled');
				$('.pull-push-connection-info').attr('readonly', 'readonly');
				$('.connect-button').hide();

				$('.connection-status').hide();
				$('.step-two').show();
				connection_established = true;
				set_connection_data(data);
				move_connection_info_box();

				maybe_show_mixed_cased_table_name_warning();

				var loaded_tables = '';
				if (false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables) {
					loaded_tables = wpmdb_loaded_tables;
				}

				$pull_select = wpmdb.functions.create_table_select(wpmdb.common.connection_data.tables, wpmdb.common.connection_data.table_sizes_hr, loaded_tables);

				var loaded_post_types = '';
				if (false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_post_types) {
					if ('undefined' !== typeof data.select_post_types) {
						$('#exclude-post-types').attr('checked', 'checked');
						$('.post-type-select-wrap').show();
						loaded_post_types = data.select_post_types;
					} else {
						loaded_post_types = wpmdb_loaded_post_types;
					}
				}

				var $post_type_select = document.createElement('select');
				$($post_type_select).attr({
					multiple: 'multiple',
					name: 'select_post_types[]',
					id: 'select-post-types',
					class: 'multiselect'
				});

				$.each(wpmdb.common.connection_data.post_types, function (index, value) {
					var selected = $.inArray(value, loaded_post_types);
					if (-1 !== selected || true === wpmdb_convert_exclude_revisions && 'revision' !== value) {
						selected = ' selected="selected" ';
					} else {
						selected = ' ';
					}
					$($post_type_select).append('<option' + selected + 'value="' + value + '">' + value + '</option>');
				});

				$pull_post_type_select = $post_type_select;

				var loaded_tables_backup = '';
				if (false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables_backup) {
					loaded_tables_backup = wpmdb_loaded_tables_backup;
				}

				var $table_select_backup = document.createElement('select');
				$($table_select_backup).attr({
					multiple: 'multiple',
					name: 'select_backup[]',
					id: 'select-backup',
					class: 'multiselect'
				});

				$.each(wpmdb.common.connection_data.tables, function (index, value) {
					var selected = $.inArray(value, loaded_tables_backup);
					if (-1 !== selected) {
						selected = ' selected="selected" ';
					} else {
						selected = ' ';
					}
					$($table_select_backup).append('<option' + selected + 'value="' + value + '">' + value + ' (' + wpmdb.common.connection_data.table_sizes_hr[value] + ')</option>');
				});

				$push_select_backup = $table_select_backup;

				if ('pull' === wpmdb.functions.wpmdb_migration_type()) {
					$.wpmdb.do_action('wpmdb_update_pull_table_select');
					$('#select-post-types').remove();
					$('.exclude-post-types-warning').after($pull_post_type_select);
					$('#select-backup').remove();
					$('.backup-tables-wrap').prepend($pull_select_backup);
					$('.table-prefix').html(data.prefix);
					$('.uploads-dir').html(wpmdb_data.this_uploads_dir);
				} else {
					$('#select-backup').remove();
					$('.backup-tables-wrap').prepend($push_select_backup);
				}

				$.wpmdb.do_action('verify_connection_to_remote_site', wpmdb.common.connection_data);
			}

		});
	}

	/*
 	wpmdb.functions namespaced functions
 	 */

	wpmdb.functions.exclude_post_types_warning = function () {
		var excluded_post_types = $('#select-post-types').val();
		var excluded_post_types_text = '';
		var $exclude_post_types_warning = $('.exclude-post-types-warning');

		if (excluded_post_types) {
			excluded_post_types_text = '<code>' + excluded_post_types.join('</code>, <code>') + '</code>';
			$('.excluded-post-types').html(excluded_post_types_text);

			if ('0' === $exclude_post_types_warning.css('opacity')) {
				$exclude_post_types_warning.css({ opacity: 0 }).slideDown(200).animate({ opacity: 1 });
			}
		} else {
			$exclude_post_types_warning.css({ opacity: 0 }).slideUp(200).animate({ opacity: 0 });
		}
	};

	//Main method that shows migration progress in the UI
	wpmdb.functions.migrate_table_recursive = function (current_row, primary_keys, iterator) {
		var i = iterator || 0;

		if (i >= tables_to_migrate.length) {

			if ('upload' === stage && wpmdb.current_migration.model.getStageItems('find_replace').length) {
				stage = 'find_replace';
				tables_to_migrate = wpmdb.current_migration.model.getStageItems('find_replace', 'name');
				tables_to_migrate = tables_to_migrate.map(function (table) {
					return '_mig_' + table;
				});
				i = 0;
			} else if ('backup' === stage) {

				if (-1 !== $.inArray(migration_intent, ['push', 'pull'])) {
					stage = 'migrate';
				} else if ('import' === migration_intent) {
					stage = 'upload';
				} else {
					stage = migration_intent;
				}

				wpmdb.current_migration.model.setActiveStage(stage);

				if ('find_replace' !== stage && 'migrate' !== stage) {
					wpmdb.functions.wpmdb_call_next_hook();
					return;
				}

				i = 0;

				// should get from model
				tables_to_migrate = wpmdb.functions.get_tables_to_migrate(null, null);
			} else {
				$('.progress-label').removeClass('label-visible');

				wpmdb.common.hooks = $.wpmdb.apply_filters('wpmdb_before_migration_complete_hooks', wpmdb.common.hooks);
				wpmdb.common.hooks.push(wpmdb.functions.migration_complete);
				wpmdb.common.hooks.push(wpmdb.functions.wpmdb_flush);
				wpmdb.common.hooks = $.wpmdb.apply_filters('wpmdb_after_migration_complete_hooks', wpmdb.common.hooks);
				wpmdb.common.hooks.push(wpmdb.functions.migration_complete_events);
				wpmdb.common.next_step_in_migration = { fn: wpmdb.functions.wpmdb_call_next_hook };
				wpmdb.functions.execute_next_step();
				return;
			}
		}

		var last_table = 0;
		if (i === tables_to_migrate.length - 1) {
			last_table = 1;
		}

		var gzip = 0;
		if (-1 !== $.inArray(migration_intent, ['push', 'pull']) && 1 === parseInt(wpmdb.common.connection_data.gzip)) {
			gzip = 1;
		}

		var request_data = {
			action: 'wpmdb_migrate_table',
			migration_state_id: wpmdb.migration_state_id,
			table: tables_to_migrate[i],
			stage: stage,
			current_row: current_row,
			last_table: last_table,
			primary_keys: primary_keys,
			gzip: gzip,
			nonce: wpmdb_data.nonces.migrate_table
		};

		if (-1 !== $.inArray(migration_intent, ['push', 'pull'])) {
			request_data.bottleneck = wpmdb.common.connection_data.bottleneck;
			request_data.prefix = wpmdb.common.connection_data.prefix;
		}

		if (wpmdb.common.connection_data && wpmdb.common.connection_data.path_current_site && wpmdb.common.connection_data.domain) {
			request_data.path_current_site = wpmdb.common.connection_data.path_current_site;
			request_data.domain_current_site = wpmdb.common.connection_data.domain;
		}

		doing_ajax = true;

		$.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			timeout: 0,
			data: request_data,
			error: function error(jqXHR, textStatus, errorThrown) {
				var progress_text = wpmdb_strings.table_process_problem + ' ' + tables_to_migrate[i] + '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText;
				wpmdb.current_migration.setState(wpmdb_strings.migration_failed, progress_text, 'error');

				doing_ajax = false;
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
				wpmdb.common.migration_error = true;
				wpmdb.functions.migration_complete_events();
			},
			success: function success(data) {
				doing_ajax = false;
				data = $.trim(data);
				var row_information = wpmdb.functions.wpmdb_parse_json(data);
				var error_text = '';

				if (false === row_information || null === row_information) {

					// should update model
					if ('' === data || null === data) {
						error_text = wpmdb_strings.table_process_problem_empty_response + ' ' + tables_to_migrate[i];
					} else {
						error_text = get_ajax_errors(data, null, null);
					}

					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, error_text, 'error');
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
					return;
				}

				if ('undefined' !== typeof row_information.wpmdb_error && 1 === row_information.wpmdb_error) {
					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, row_information.body, 'error');
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
					return;
				}

				var item_name = tables_to_migrate[i];
				if ('import' === migration_intent && 'find_replace' === stage) {
					item_name = item_name.replace(wpmdb_data.this_temp_prefix, '');
				}

				//successful iteration
				wpmdb.current_migration.setText();
				wpmdb.current_migration.model.getStageModel(stage).setItemRowsTransferred(item_name, row_information.current_row);

				// We need the returned file name for delivery or display to the user.
				if (1 === last_table && 'savefile' === migration_intent) {
					if ('undefined' !== typeof row_information.dump_filename) {
						dump_filename = row_information.dump_filename;
					}
					if ('undefined' !== typeof row_information.dump_path) {
						dump_path = row_information.dump_path;
					}
				}

				if (-1 === parseInt(row_information.current_row)) {
					i++;
					row_information.current_row = '';
					row_information.primary_keys = '';
				}

				wpmdb.common.next_step_in_migration = {
					fn: wpmdb.functions.migrate_table_recursive,
					args: [row_information.current_row, row_information.primary_keys, i]
				};
				wpmdb.functions.execute_next_step();
			}
		});
	};

	wpmdb.functions.migration_complete_events = function () {
		if (false === wpmdb.common.migration_error) {
			if ('' === wpmdb.common.non_fatal_errors) {
				if ('savefile' !== migration_intent && true === $('#save_computer').is(':checked')) {
					wpmdb.current_migration.setText();
				}

				completed_msg = completed_msg + '&nbsp;<div class="dashicons dashicons-yes"></div>';

				if (true === migration_cancelled) {
					var cancel_success = wpmdb_strings.migration_cancelled_success;

					if ('find_replace' === migration_intent) {
						cancel_success = wpmdb_strings.find_replace_cancelled_success;
					}

					wpmdb.current_migration.setState(completed_msg, cancel_success, 'cancelled');
				} else {
					wpmdb.current_migration.setState(completed_msg, '', 'complete');
				}
			} else {
				wpmdb.current_migration.setState(wpmdb_strings.completed_with_some_errors, wpmdb.common.non_fatal_errors, 'error');
			}
		}

		$('.migration-controls').addClass('hidden');

		// reset migration variables so consecutive migrations work correctly
		wpmdb.common.hooks = [];
		wpmdb.common.call_stack = [];
		wpmdb.common.migration_error = false;
		currently_migrating = false;
		migration_completed = true;
		migration_paused = false;
		migration_cancelled = false;
		doing_ajax = false;
		wpmdb.common.non_fatal_errors = '';
		tables_to_migrate = [];

		$('.progress-label').remove();
		$('.migration-progress-ajax-spinner').remove();
		$('.close-progress-content').show();
		$('#overlay').css('cursor', 'pointer');
		wpmdb.current_migration.model.setMigrationComplete();
	};

	wpmdb.functions.migration_complete = function () {

		$('.migration-controls').addClass('hidden');

		if ('savefile' === migration_intent) {
			currently_migrating = false;
			var migrate_complete_text = wpmdb_strings.migration_complete;
			if ($('#save_computer').is(':checked')) {
				var url = wpmdb_data.this_download_url + encodeURIComponent(dump_filename);
				if ($('#gzip_file').is(':checked')) {
					url += '&gzip=1';
				}
				window.location = url;
			} else {
				migrate_complete_text = wpmdb_strings.completed_dump_located_at + ' ' + dump_path;
			}

			if (false === wpmdb.common.migration_error) {

				wpmdb.functions.migration_complete_events();
				wpmdb.current_migration.setState(completed_msg, migrate_complete_text, 'complete');
			}
		} else {
			// rename temp tables, delete old tables

			wpmdb.current_migration.setState(null, wpmdb_strings.finalizing_migration, 'finalizing');

			var request_data = {
				action: 'wpmdb_finalize_migration',
				migration_state_id: wpmdb.migration_state_id,
				tables: tables_to_migrate.join(','),
				nonce: wpmdb_data.nonces.finalize_migration
			};

			if (-1 !== $.inArray(migration_intent, ['push', 'pull'])) {
				request_data.prefix = wpmdb.common.connection_data.prefix;
			}

			doing_ajax = true;
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: request_data,
				error: function error(jqXHR, textStatus, errorThrown) {
					doing_ajax = false;
					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, wpmdb_strings.finalize_tables_problem, 'error');

					alert(jqXHR + ' : ' + textStatus + ' : ' + errorThrown);
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function success(data) {
					doing_ajax = false;
					if ('1' !== $.trim(data)) {
						wpmdb.current_migration.setState(wpmdb_strings.migration_failed, data, 'error');

						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					}
					wpmdb.common.next_step_in_migration = { fn: wpmdb.functions.wpmdb_call_next_hook };
					wpmdb.functions.execute_next_step();
				}
			});
		}
	};

	wpmdb.functions.wpmdb_flush = function () {
		if ('savefile' !== migration_intent) {
			wpmdb.current_migration.setText(wpmdb_strings.flushing);
			doing_ajax = true;
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_flush',
					migration_state_id: wpmdb.migration_state_id,
					nonce: wpmdb_data.nonces.flush
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					doing_ajax = false;
					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, wpmdb_strings.flush_problem, 'error');

					alert(jqXHR + ' : ' + textStatus + ' : ' + errorThrown);
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function success(data) {
					doing_ajax = false;
					if ('1' !== $.trim(data)) {
						wpmdb.current_migration.setState(wpmdb_strings.migration_failed, data, 'error');

						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					}
					wpmdb.common.next_step_in_migration = { fn: wpmdb.functions.wpmdb_call_next_hook };
					wpmdb.functions.execute_next_step();
				}
			});
		}
	};

	wpmdb.functions.execute_next_step = function () {

		// if delay is set, set a timeout for delay to recall this function, then return
		if (0 < delay_between_requests && false === flag_skip_delay) {
			setTimeout(function () {
				flag_skip_delay = true;
				wpmdb.functions.execute_next_step();
			}, delay_between_requests);
			return;
		} else {
			flag_skip_delay = false;
		}

		if (true === migration_paused) {
			$('.migration-progress-ajax-spinner').hide();

			// Pause the timer
			wpmdb.current_migration.pauseTimer();

			var pause_text = '';
			if (true === is_auto_pause_before_finalize) {
				pause_text = wpmdb_strings.paused_before_finalize;
				is_auto_pause_before_finalize = false;

				if ('find_replace' === wpmdb.functions.wpmdb_migration_type()) {
					pause_text = wpmdb_strings.find_replace_paused_before_finalize;
				}
			} else {
				pause_text = wpmdb_strings.paused;
			}

			wpmdb.current_migration.setState(null, pause_text, 'paused');

			// Re-bind Pause/Resume button to Resume when we are finally Paused
			$('body').on('click', '.pause-resume', function (event) {
				set_pause_resume_button(event);
			});
			$('body').on('click', '.cancel', function (event) {
				cancel_migration(event);
			});
			$('.pause-resume').html(wpmdb_strings.resume);
		} else if (true === migration_cancelled) {
			migration_intent = wpmdb.functions.wpmdb_migration_type();

			var progress_msg;

			if ('savefile' === migration_intent) {
				progress_msg = wpmdb_strings.removing_local_sql;
			} else if ('pull' === migration_intent) {
				if ('backup' === stage) {
					progress_msg = wpmdb_strings.removing_local_backup;
				} else {
					progress_msg = wpmdb_strings.removing_local_temp_tables;
				}
			} else if ('push' === migration_intent) {
				if ('backup' === stage) {
					progress_msg = wpmdb_strings.removing_remote_sql;
				} else {
					progress_msg = wpmdb_strings.removing_remote_temp_tables;
				}
			}
			wpmdb.current_migration.setText(progress_msg);

			var request_data = {
				action: 'wpmdb_cancel_migration',
				migration_state_id: wpmdb.migration_state_id,
				nonce: wpmdb_data.nonces.cancel_migration
			};

			doing_ajax = true;

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: request_data,
				error: function error(jqXHR, textStatus, errorThrown) {
					wpmdb.current_migration.setState(wpmdb_strings.migration_cancellation_failed, wpmdb_strings.manually_remove_temp_files + '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText, 'error');
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
					doing_ajax = false;
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function success(data) {
					doing_ajax = false;
					data = $.trim(data);

					if ('push' === migration_intent && '1' !== data || 'push' !== migration_intent && '' !== data) {

						if ('undefined' !== typeof data && 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
							data = data.wpmdb_error;
						}

						wpmdb.current_migration.setState(wpmdb_strings.migration_cancellation_failed, data, 'error');
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					}

					completed_msg = wpmdb_strings.migration_cancelled;

					if ('find_replace' === migration_intent) {
						completed_msg = wpmdb_strings.find_replace_cancelled;
					}

					wpmdb.functions.migration_complete_events();
					wpmdb.current_migration.setStatus('cancelled');
				}
			});
		} else {
			wpmdb.common.next_step_in_migration.fn.apply(null, wpmdb.common.next_step_in_migration.args);
		}
	};

	wpmdb.functions.maybe_show_prefix_notice = function (prefix) {
		var $prefix_notice = $('.prefix-notice');

		$prefix_notice.hide();

		if (prefix !== wpmdb_data.this_prefix) {
			$('.remote-prefix').html(prefix);
			show_prefix_notice = true;
			$prefix_notice.show();
		}
	};

	wpmdb.functions.maybe_show_mst_warning = function (data) {
		var migration_type = wpmdb.functions.wpmdb_migration_type();
		var show_mst_warning = false;

		if (-1 !== $.inArray(migration_type, ['push', 'pull']) && 'undefined' !== typeof data.site_details) {
			if (wpmdb_data.site_details.is_multisite !== data.site_details.is_multisite) {
				if ('undefined' === typeof wpmdb.mst || 'undefined' === typeof data.mst_available || '1' !== data.mst_available) {
					show_mst_warning = true;
				}
			}
		} else if ('import' === migration_type) {
			if ('undefined' !== typeof data.multisite && 'undefined' !== typeof data.subsite_export) {
				if ('false' === wpmdb_data.site_details.is_multisite && 'true' === data.multisite && 'true' !== data.subsite_export || 'true' === wpmdb_data.site_details.is_multisite && 'false' === data.multisite) {
					show_mst_warning = true;
				}
			}
		}

		show_mst_warning = $.wpmdb.apply_filters('wpmdb_show_mst_warning', show_mst_warning);

		if (show_mst_warning) {
			$('.mst-required').show();
		}

		return show_mst_warning;
	};

	wpmdb.functions.maybe_show_select_table_notice = function () {

		// check that they've selected some tables to migrate
		if ($('#migrate-selected').is(':checked') && null === $('#select-tables').val()) {
			if ('import' !== wpmdb.functions.wpmdb_migration_type()) {
				alert(wpmdb_strings.please_select_one_table);
				return true;
			} else {
				if ($('#import-find-replace').is(':checked') && $('#select-tables').is(':visible')) {
					alert(wpmdb_strings.please_select_one_table_import);
					return true;
				}
			}
		}

		// check that they've selected some tables to backup
		if ('savefile' !== wpmdb.functions.wpmdb_migration_type() && $('#backup-manual-select').is(':checked') && null === $('#select-backup').val()) {
			alert(wpmdb_strings.please_select_one_table_backup);
			return true;
		}

		return false;
	};

	wpmdb.functions.remove_protocol = function (url) {
		return url.replace(/^https?:/i, '');
	};

	wpmdb.functions.create_table_select = function (tables, table_sizes_hr, selected_tables) {
		var $table_select = document.createElement('select');
		$($table_select).attr({
			multiple: 'multiple',
			name: 'select_tables[]',
			id: 'select-tables',
			class: 'multiselect'
		});

		if (0 < tables.length) {
			$.each(tables, function (index, table) {
				if ($.wpmdb.apply_filters('wpmdb_exclude_table', false, table)) {
					return;
				}

				var selected = ' ';
				if (undefined !== selected_tables && null !== selected_tables && 0 < selected_tables.length && -1 !== $.inArray(table, selected_tables)) {
					selected = ' selected="selected" ';
				}

				var size = '';
				if (0 !== table_sizes_hr.length) {
					size = ' (' + table_sizes_hr[table] + ')';
				}

				$($table_select).append('<option' + selected + 'value="' + table + '">' + table + size + '</option>');
			});
		}

		return $table_select;
	};

	/**
  * Returns tables selected for migration.
  *
  * @param value
  * @param args
  * @returns {array}
  *
  * Also handler for wpmdb_get_tables_to_migrate filter, disregards input values as it is the primary source.
  */
	wpmdb.functions.get_tables_to_migrate = function (value, args) {
		var tables = [];
		var mig_type = wpmdb.functions.wpmdb_migration_type();
		var table_intent = $('input[name=table_migrate_option]:checked').val();

		// Grab tables as per what the user has selected from the multiselect box or all prefixed tables.
		if ('migrate_select' === table_intent) {
			tables = $('#select-tables').val();
		} else {
			if ('pull' !== mig_type && 'undefined' !== typeof wpmdb_data.this_prefixed_tables) {
				tables = wpmdb_data.this_prefixed_tables;
			} else if ('pull' === mig_type && 'undefined' !== typeof wpmdb.common.connection_data && 'undefined' !== typeof wpmdb.common.connection_data.prefixed_tables) {
				tables = wpmdb.common.connection_data.prefixed_tables;
			}
		}

		return tables;
	};

	wpmdb.functions.update_migrate_button_text = function () {
		var migration_intent = wpmdb.functions.wpmdb_migration_type();
		var save_string = $('#save-migration-profile').is(':checked') ? '_save' : '';
		var migrate_string = 'migrate_button_' + ('savefile' === migration_intent ? 'export' : migration_intent) + save_string;
		$('.migrate-db .button-primary').val(wpmdb_strings[migrate_string]);
	};

	// fired when the connection info box changes (e.g. gets pasted into)
	wpmdb.functions.connection_box_changed = function () {
		var $this = $('.pull-push-connection-info');

		if (-1 === $.inArray(wpmdb.functions.wpmdb_migration_type(), ['push', 'pull']) || (doing_ajax || $($this).hasClass('temp-disabled')) && false === wpmdb.force_reconnect) {
			return;
		}

		wpmdb.force_reconnect = false;
		var data = $('.pull-push-connection-info').val();

		var connection_info = $.trim(data).split('\n');
		var error = false;
		var error_message = '';

		if ('' === connection_info) {
			error = true;
			error_message = wpmdb_strings.connection_info_missing;
		}

		// attempt to format the connection info from a single line
		if (1 === connection_info.length && !error) {
			var connection_words = $.trim(data).split(' ');
			if (2 === connection_words.length) {
				connection_info = connection_words;
			}
		}

		if (2 !== connection_info.length && !error) {
			error = true;
			error_message = wpmdb_strings.connection_info_incorrect;
		}

		if (!error && !validate_url(connection_info[0])) {
			error = true;
			error_message = wpmdb_strings.connection_info_url_invalid;
		}

		var key_length = 0;

		if ('undefined' !== typeof connection_info[1]) {
			key_length = connection_info[1].length;
		}

		if (!error && 32 !== key_length && 40 !== key_length) {
			error = true;
			error_message = wpmdb_strings.connection_info_key_invalid;
		}

		if (!error && connection_info[0] === wpmdb_data.connection_info[0]) {
			error = true;
			error_message = wpmdb_strings.connection_info_local_url;
		}

		if (!error && connection_info[1] === wpmdb_data.connection_info[1]) {
			error = true;
			error_message = wpmdb_strings.connection_info_local_key;
		}
		if (error) {
			$('.connection-status').html(error_message);
			$('.connection-status').addClass('notification-message error-notice migration-error');
			return;
		}

		var new_connection_info_contents = connection_info[0] + '\n' + connection_info[1];

		// If connection info is a single line
		if (1 === $.trim(data).split('\n').length) {

			// Repopulate the input with the info on two lines
			$('.pull-push-connection-info').val(new_connection_info_contents);
		}

		if (false === wpmdb_data.openssl_available) {
			connection_info[0] = connection_info[0].replace('https://', 'http://');
			new_connection_info_contents = connection_info[0] + '\n' + connection_info[1];
			$('.pull-push-connection-info').val(new_connection_info_contents);
		}

		show_prefix_notice = false;
		doing_ajax = true;
		disable_export_type_controls();

		if ($('.basic-access-auth-wrapper').is(':visible')) {
			connection_info[0] = connection_info[0].replace(/\/\/(.*)@/, '//');
			connection_info[0] = connection_info[0].replace('//', '//' + encodeURIComponent($.trim($('.auth-username').val())) + ':' + encodeURIComponent($.trim($('.auth-password').val())) + '@');
			new_connection_info_contents = connection_info[0] + '\n' + connection_info[1];
			$('.pull-push-connection-info').val(new_connection_info_contents);
			$('.basic-access-auth-wrapper').hide();
		}

		$('.step-two').hide();
		$('.ssl-notice').hide();
		$('.prefix-notice').hide();
		$('.connection-status').show();

		$('.connection-status').html(wpmdb_strings.establishing_remote_connection);
		$('.connection-status').removeClass('notification-message error-notice migration-error');
		$('.connection-status').append(ajax_spinner);

		var intent = wpmdb.functions.wpmdb_migration_type();

		profile_name_edited = false;

		return $.ajax({
			url: ajaxurl,
			type: 'POST',
			dataType: 'json',
			cache: false,
			data: {
				action: 'wpmdb_verify_connection_to_remote_site',
				url: connection_info[0],
				key: connection_info[1],
				intent: intent,
				nonce: wpmdb_data.nonces.verify_connection_to_remote_site
			},
			error: function error(jqXHR, textStatus, errorThrown) {
				$('.connection-status').html(get_ajax_errors(jqXHR.responseText, '(#100)', jqXHR));
				$('.connection-status').addClass('notification-message error-notice migration-error');
				$('.ajax-spinner').remove();
				doing_ajax = false;
				enable_export_type_controls();
			},
			success: function success(data) {
				$('.ajax-spinner').remove();
				doing_ajax = false;
				enable_export_type_controls();

				if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
					$('.connection-status').html(data.body);
					$('.connection-status').addClass('notification-message error-notice migration-error');

					if (data.body.indexOf('401 Unauthorized') > -1) {
						$('.basic-access-auth-wrapper').show();
					}

					if (!$('.pull-push-connection-info').hasClass('temp-disabled') && !$('.connect-button').is(':visible')) {
						$('.pull-push-connection-info').removeAttr('readonly');
						$('.connect-button').show();
					}

					return;
				}

				if (true === wpmdb.functions.maybe_show_mst_warning(data)) {
					$('.connection-status').hide();
					return;
				}

				maybe_show_ssl_warning(connection_info[0], connection_info[1], data.scheme);

				var profile_name = get_domain_name(data.url);
				$('.create-new-profile').val(profile_name);

				$('.pull-push-connection-info').addClass('temp-disabled');
				$('.pull-push-connection-info').attr('readonly', 'readonly');
				$('.connect-button').hide();

				$('.connection-status').hide();
				$('.step-two').show();

				wpmdb.functions.maybe_show_prefix_notice(data.prefix);

				connection_established = true;
				set_connection_data(data);
				move_connection_info_box();
				change_replace_values();

				maybe_show_mixed_cased_table_name_warning();

				refresh_table_selects();

				$push_select_backup = $($pull_select).clone();
				$($push_select_backup).attr({
					name: 'select_backup[]',
					id: 'select-backup'
				});

				var $post_type_select = document.createElement('select');
				$($post_type_select).attr({
					multiple: 'multiple',
					name: 'select_post_types[]',
					id: 'select-post-types',
					class: 'multiselect'
				});

				$.each(wpmdb.common.connection_data.post_types, function (index, value) {
					$($post_type_select).append('<option value="' + value + '">' + value + '</option>');
				});

				$pull_post_type_select = $post_type_select;

				$('#new-path-missing-warning, #new-url-missing-warning').hide();

				if ('pull' === wpmdb.functions.wpmdb_migration_type()) {
					$('#new-url').val(wpmdb.functions.remove_protocol(wpmdb_data.this_url));
					$('#new-path').val(wpmdb_data.this_path);
					if ('true' === wpmdb_data.is_multisite) {
						$('#new-domain').val(wpmdb_data.this_domain);
						$('.replace-row.pin .old-replace-col input[type="text"]').val(wpmdb.functions.remove_protocol(data.url));
					}
					$('#old-url').val(wpmdb.functions.remove_protocol(data.url));
					$('#old-path').val(data.path);

					$.wpmdb.do_action('wpmdb_update_pull_table_select');
					$('#select-post-types').remove();
					$('.exclude-post-types-warning').after($pull_post_type_select);
					wpmdb.functions.exclude_post_types_warning();
					$('.table-prefix').html(data.prefix);
					$('.backup-table-prefix').html(wpmdb_data.site_details.prefix);
					$('.uploads-dir').html(wpmdb_data.this_uploads_dir);
				} else {
					$('#new-url').val(wpmdb.functions.remove_protocol(data.url));
					$('#new-path').val(data.path);

					if ('true' === wpmdb_data.is_multisite) {
						$('.replace-row.pin .old-replace-col input[type="text"]').val(wpmdb.functions.remove_protocol(wpmdb_data.this_url));
					}
					$.wpmdb.do_action('wpmdb_update_push_table_select');
					$('#select-backup').remove();
					$('.backup-tables-wrap').prepend($push_select_backup);
				}

				wpmdb.common.next_step_in_migration = {
					fn: $.wpmdb.do_action,
					args: ['verify_connection_to_remote_site', wpmdb.common.connection_data]
				};
				wpmdb.functions.execute_next_step();
			}

		});
	};

	/**
  *
  * ========= DOM ready =========
  *
  * Mostly direct DOM manipulation specific code
  *
  */
	$(document).ready(function () {
		wpmdb.migration_state_id = '';

		$('#plugin-compatibility').change(function (e) {
			var install = '1';
			var $status = $(this).closest('td').next('td').find('.setting-status');

			if (!$(this).is(':checked')) {
				install = '0';
			}

			$('.plugin-compatibility-wrap').toggle();

			$status.find('.ajax-success-msg').remove();
			$status.append(ajax_spinner);
			$('#plugin-compatibility').attr('disabled', 'disabled');
			$('.plugin-compatibility').addClass('disabled');

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_plugin_compatibility',
					install: install,
					nonce: wpmdb_data.nonces.plugin_compatibility
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.plugin_compatibility_settings_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText);
					$('.ajax-spinner').remove();
					$('#plugin-compatibility').removeAttr('disabled');
					$('.plugin-compatibility').removeClass('disabled');
				},
				success: function success(data) {
					if ('' !== $.trim(data)) {
						alert(data);
					} else {
						$status.append('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
						$('.ajax-success-msg').fadeOut(2000, function () {
							$(this).remove();
						});
					}
					$('.ajax-spinner').remove();
					$('#plugin-compatibility').removeAttr('disabled');
					$('.plugin-compatibility').removeClass('disabled');
				}
			});
		});

		if ($('#plugin-compatibility').is(':checked')) {
			$('.plugin-compatibility-wrap').show();
		}

		if (0 <= navigator.userAgent.indexOf('MSIE') || 0 <= navigator.userAgent.indexOf('Trident')) {
			$('.ie-warning').show();
		}

		if (0 === wpmdb_data.valid_licence) {
			$('#savefile').prop('checked', true);
		}
		var max_request_size_container = $('.max-request-size');
		var max_request_size_slider = $('.slider', max_request_size_container);
		max_request_size_slider.slider({
			range: 'min',
			value: parseInt(wpmdb_data.max_request / 1024),
			min: 512,
			max: parseInt(wpmdb_data.bottleneck / 1024),
			step: 256,
			create: function create(event, ui) {
				var display_info = get_max_request_display_info(wpmdb_data.max_request / 1024);
				set_slider_value(max_request_size_container, wpmdb_data.max_request / 1024, display_info.unit, display_info.amount);
			},
			slide: function slide(event, ui) {
				var display_info = get_max_request_display_info(ui.value);
				set_slider_value(max_request_size_container, ui.value, display_info.unit, display_info.amount);
			},
			stop: function stop(event, ui) {
				$('.slider-success-msg').remove();
				$('.amount', max_request_size_container).after('<img src="' + spinner_url + '" alt="" class="slider-spinner general-spinner" />');
				max_request_size_slider.slider('disable');

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					cache: false,
					data: {
						action: 'wpmdb_update_max_request_size',
						max_request_size: parseInt(ui.value),
						nonce: wpmdb_data.nonces.update_max_request_size
					},
					error: function error(jqXHR, textStatus, errorThrown) {
						max_request_size_slider.slider('enable');
						$('.slider-spinner', max_request_size_container).remove();
						alert(wpmdb_strings.max_request_size_problem);
						var display_info = get_max_request_display_info(wpmdb_data.max_request / 1024);
						set_slider_value(max_request_size_container, wpmdb_data.max_request / 1024, display_info.unit, display_info.amount);
						max_request_size_slider.slider('enable');
					},
					success: function success() {
						max_request_size_slider.slider('enable');
						$('.slider-label-wrapper', max_request_size_container).append('<span class="slider-success-msg">' + wpmdb_strings.saved + '</span>');
						$('.slider-success-msg', max_request_size_container).fadeOut(2000, function () {
							$(this).remove();
						});
						$('.slider-spinner', max_request_size_container).remove();
					}
				});
			}
		});

		var delay_between_requests_container = $('.delay-between-requests');
		var delay_between_requests_slider = $('.slider', delay_between_requests_container);
		delay_between_requests_slider.slider({
			range: 'min',
			value: parseInt(wpmdb_data.delay_between_requests / 1000),
			min: 0,
			max: 10,
			step: 1,
			create: function create(event, ui) {
				set_slider_value(delay_between_requests_container, wpmdb_data.delay_between_requests / 1000, 's');
			},
			slide: function slide(event, ui) {
				set_slider_value(delay_between_requests_container, ui.value, 's');
			},
			stop: function stop(event, ui) {
				$('.slider-success-msg').remove();
				$('.amount', delay_between_requests_container).after('<img src="' + spinner_url + '" alt="" class="slider-spinner general-spinner" />');
				delay_between_requests_slider.slider('disable');

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					cache: false,
					data: {
						action: 'wpmdb_update_delay_between_requests',
						delay_between_requests: parseInt(ui.value * 1000),
						nonce: wpmdb_data.nonces.update_delay_between_requests
					},
					error: function error(jqXHR, textStatus, errorThrown) {
						delay_between_requests_slider.slider('enable');
						$('.slider-spinner', delay_between_requests_container).remove();
						alert(wpmdb_strings.delay_between_requests_problem);
						set_slider_value(delay_between_requests_container, wpmdb_data.delay_between_requests / 1000, 's');
						delay_between_requests_slider.slider('enable');
					},
					success: function success() {
						wpmdb_data.delay_between_requests = parseInt(ui.value * 1000);
						delay_between_requests_slider.slider('enable');
						$('.slider-label-wrapper', delay_between_requests_container).append('<span class="slider-success-msg">' + wpmdb_strings.saved + '</span>');
						$('.slider-success-msg', delay_between_requests_container).fadeOut(2000, function () {
							$(this).remove();
						});
						$('.slider-spinner', delay_between_requests_container).remove();
					}
				});
			}
		});

		$('.help-tab .video').each(function () {
			var $container = $(this),
			    $viewer = $('.video-viewer');

			$('a', this).click(function (e) {
				e.preventDefault();

				$viewer.attr('src', '//www.youtube.com/embed/' + $container.data('video-id') + '?autoplay=1');
				$viewer.show();
				var offset = $viewer.offset();
				$(window).scrollTop(offset.top - 50);
			});
		});

		$('.backup-options').show();
		$('.keep-active-plugins').show();
		if ('savefile' === wpmdb.functions.wpmdb_migration_type()) {
			$('.backup-options').hide();
			$('.keep-active-plugins').hide();
		}

		last_replace_switch = wpmdb.functions.wpmdb_migration_type();

		/**
   * Handle 'Check License Again' functionality found in expired license messages.
   */
		$('.content-tab').on('click', '.check-my-licence-again', function (e) {
			e.preventDefault();
			checked_licence = false;
			$(e.target).replaceWith('Checking... ' + ajax_spinner);
			check_licence(null, 'all');
		});

		$.wpmdb.add_action('wpmdb_refresh_table_selects', refresh_table_selects);

		function update_push_table_select() {
			$('#select-tables').remove();
			$('.select-tables-wrap').prepend($push_select);
			$('#select-tables').change();
		}

		$.wpmdb.add_action('wpmdb_update_push_table_select', update_push_table_select);

		function update_pull_table_select() {
			$('#select-tables').remove();
			$('.select-tables-wrap').prepend($pull_select);
			$('#select-tables').change();
		}

		$.wpmdb.add_action('wpmdb_update_pull_table_select', update_pull_table_select);

		function disable_table_migration_options() {
			$('#migrate-selected').parents('.option-section').children('.header-expand-collapse').children('.expand-collapse-arrow').removeClass('collapsed');
			$('.table-select-wrap').show();
			$('#migrate-only-with-prefix').prop('checked', false);
			$('#migrate-selected').prop('checked', true);
			$('.table-migrate-options').hide();
			$('.select-tables-wrap').show();
		}

		$.wpmdb.add_action('wpmdb_disable_table_migration_options', disable_table_migration_options);

		function enable_table_migration_options() {
			$('.table-migrate-options').show();
		}

		$.wpmdb.add_action('wpmdb_enable_table_migration_options', enable_table_migration_options);

		function select_all_tables() {
			$('#select-tables').children('option').prop('selected', true);
			$('#select-tables').change();
		}

		$.wpmdb.add_action('wpmdb_select_all_tables', select_all_tables);

		function base_old_url(value, args) {
			return wpmdb.functions.remove_protocol(wpmdb_data.this_url);
		}

		$.wpmdb.add_filter('wpmdb_base_old_url', base_old_url);

		// automatically validate connection info if we're loading a saved profile
		establish_remote_connection_from_saved_profile();

		// add to <a> tags which act as JS event buttons, will not jump page to top and will deselect the button
		$('body').on('click', '.js-action-link', function (e) {
			e.preventDefault();
			$(this).blur();
		});

		$('.licence-input').keypress(function (e) {
			if (13 === e.which) {
				e.preventDefault();
				$('.register-licence').click();
			}
		});

		// registers your licence
		$('body').on('click', '.register-licence', function (e) {
			e.preventDefault();

			if (doing_licence_registration_ajax) {
				return;
			}

			var licence_key = $.trim($('.licence-input').val());
			var $licence_status = $('.licence-status');

			$licence_status.removeClass('notification-message error-notice success-notice');

			if ('' === licence_key) {
				$licence_status.html('<div class="notification-message error-notice">' + wpmdb_strings.enter_license_key + '</div>');
				return;
			}

			$licence_status.empty().removeClass('success');
			doing_licence_registration_ajax = true;
			$('.button.register-licence').after('<img src="' + spinner_url + '" alt="" class="register-licence-ajax-spinner general-spinner" />');

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'JSON',
				cache: false,
				data: {
					action: 'wpmdb_activate_licence',
					licence_key: licence_key,
					nonce: wpmdb_data.nonces.activate_licence,
					context: 'licence'
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					doing_licence_registration_ajax = false;
					$('.register-licence-ajax-spinner').remove();
					$licence_status.html(wpmdb_strings.register_license_problem);
				},
				success: function success(data) {
					$('.register-licence-ajax-spinner').remove();

					if ('undefined' !== typeof data.errors) {
						var msg = '';
						for (var key in data.errors) {
							msg += data.errors[key];
						}
						$licence_status.html(msg);

						if ('undefined' !== typeof data.masked_licence) {
							enable_pro_licence(data, licence_key);
							$('.migrate-tab .invalid-licence').hide();
						}
					} else if ('undefined' !== typeof data.wpmdb_error && 'undefined' !== typeof data.body) {
						$licence_status.html(data.body);
					} else {
						if (1 === Number(data.is_first_activation)) {
							wpmdb_strings.welcome_text = wpmdb_strings.welcome_text.replace('%1$s', 'https://deliciousbrains.com/wp-migrate-db-pro/doc/quick-start-guide/?utm_campaign=support%2Bdocs&utm_source=MDB%2BPaid&utm_medium=insideplugin');
							wpmdb_strings.welcome_text = wpmdb_strings.welcome_text.replace('%2$s', 'https://deliciousbrains.com/wp-migrate-db-pro/videos/?utm_campaign=support%2Bdocs&utm_source=MDB%2BPaid&utm_medium=insideplugin');

							$licence_status.after('<div id="welcome-wrap">' + '<img id="welcome-img" src="' + wpmdb_data.this_plugin_url + 'asset/dist/img/welcome.jpg" />' + '<div class="welcome-text">' + '<h3>' + wpmdb_strings.welcome_title + '</h3>' + '<p>' + wpmdb_strings.welcome_text + '</p>' + '</div>' + '</div>');
						}

						$licence_status.html(wpmdb_strings.license_registered).delay(5000).fadeOut(1000, function () {
							$(this).css({ visibility: 'hidden', display: 'block' }).slideUp();
						});
						$licence_status.addClass('success notification-message success-notice');
						enable_pro_licence(data, licence_key);
						$('.invalid-licence').hide();
					}

					doing_licence_registration_ajax = false;
				}
			});
		});

		// clears the debug log
		$('.clear-log').click(function () {
			$('.ajax-spinner, .ajax-success-msg').remove();
			$(this).after(ajax_spinner);
			$('.debug-log-textarea').val('');
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_clear_log',
					nonce: wpmdb_data.nonces.clear_log
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					$('.ajax-spinner').remove();
					alert(wpmdb_strings.clear_log_problem);
				},
				success: function success(data) {
					$('.ajax-spinner, .ajax-success-msg').remove();
					refresh_debug_log();
					$('.clear-log').after('<span class="ajax-success-msg">' + wpmdb_strings.clear_error_log + '</span>');
					$('.ajax-success-msg').fadeOut(2000, function () {
						$(this).remove();
					});
				}
			});
		});

		// select all tables
		$('.multiselect-select-all').click(function () {
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).prop('selected', 1);
			$(multiselect).focus().trigger('change');
		});

		// deselect all tables
		$('.multiselect-deselect-all').click(function () {
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).removeAttr('selected');
			$(multiselect).focus().trigger('change');
		});

		// invert table selection
		$('.multiselect-invert-selection').click(function () {
			var multiselect = $(this).parents('.select-wrap').children('.multiselect');
			$('option', multiselect).each(function () {
				$(this).attr('selected', !$(this).attr('selected'));
			});
			$(multiselect).focus().trigger('change');
		});

		// on option select hide all "advanced" option divs and show the correct div for the option selected
		$('.option-group input[type=radio]').change(function () {
			var group = $(this).closest('.option-group');
			$('ul', group).hide();
			var parent = $(this).closest('li');
			$('ul', parent).show();
		});

		// on page load, expand hidden divs for selected options (browser form cache)
		$('.option-group').each(function () {
			$('.option-group input[type=radio]').each(function () {
				if ($(this).is(':checked')) {
					var parent = $(this).closest('li');
					$('ul', parent).show();
				}
			});
		});

		// expand and collapse content on click
		$('.header-expand-collapse').click(function () {
			var target = null;

			if (undefined !== $(this).data('next')) {
				target = $(this).data('next');
			}

			if ($('.expand-collapse-arrow', this).hasClass('collapsed')) {
				$('.expand-collapse-arrow', this).removeClass('collapsed');
				if (target) {
					$(target).show();
				} else {
					$(this).next().show();
				}
			} else {
				$('.expand-collapse-arrow', this).addClass('collapsed');
				if (target) {
					$(target).hide();
				} else {
					$(this).next().hide();
				}
			}
		});

		$('.checkbox-label input[type=checkbox]').change(function () {
			if ($(this).is(':checked')) {
				$(this).parent().next().show();
			} else {
				$(this).parent().next().hide();
			}
		});

		// warning for excluding post types
		$('.select-post-types-wrap').on('change', '#select-post-types', function () {
			wpmdb.functions.exclude_post_types_warning();
		});

		if ($('#exclude-post-types').is(':checked')) {
			if ($('#select-post-types').val()) {
				$('.exclude-post-types-warning').css({ display: 'block', opacity: 1 });
			}
		}

		// special expand and collapse content on click for save migration profile
		$('#save-migration-profile').change(function () {
			wpmdb.functions.update_migrate_button_text();
			if ($(this).is(':checked')) {
				$('.save-settings-button').show();
			} else {
				$('.save-settings-button').hide();
			}
		});

		if ($('#save-migration-profile').is(':checked')) {
			$('.save-settings-button').show();
		}

		$('.create-new-profile').focus(function () {
			$('#create_new').prop('checked', true);
		});

		$('.checkbox-label input[type=checkbox]').each(function () {
			if ($(this).is(':checked')) {
				$(this).parent().next().show();
			}
		});

		// AJAX migrate button
		$('.migrate-db-button').click(function (event) {
			$(this).blur();
			event.preventDefault();
			wpmdb.migration_state_id = '';

			if (false === $.wpmdb.apply_filters('wpmdb_migration_profile_ready', true)) {
				return;
			}

			if (true === wpmdb.functions.maybe_show_select_table_notice()) {
				return;
			}

			var new_url_missing = false;
			var new_file_path_missing = false;
			if ($('#new-url').length && !$('#new-url').val()) {
				$('#new-url-missing-warning').show();
				$('#new-url').focus();
				$('html,body').scrollTop(0);
				new_url_missing = true;
			}

			if ($('#new-path').length && !$('#new-path').val()) {
				$('#new-path-missing-warning').show();
				if (false === new_url_missing) {
					$('#new-path').focus();
					$('html,body').scrollTop(0);
				}
				new_file_path_missing = true;
			}

			if (true === new_url_missing || true === new_file_path_missing) {
				if ('import' === wpmdb.functions.wpmdb_migration_type()) {
					if ($('#import-find-replace').is(':checked')) {
						return;
					}
				} else {
					return;
				}
			}

			// also save profile
			if ($('#save-migration-profile').is(':checked')) {
				save_active_profile();
			}

			form_data = $($('#migrate-form')[0].elements).not('.auth-credentials').serialize();

			migration_intent = wpmdb.functions.wpmdb_migration_type();

			stage = 'backup';

			if ('savefile' === migration_intent) {
				stage = 'migrate';
			}

			if (false === $('#create-backup').is(':checked')) {
				if (-1 !== $.inArray(migration_intent, ['savefile', 'push', 'pull'])) {
					stage = 'migrate';
				} else if ('import' === migration_intent) {
					stage = 'upload';
				} else {
					stage = migration_intent;
				}
			}

			wpmdb.current_migration = wpmdb.migration_progress_controller.newMigration({
				'localTableSizes': wpmdb_data.this_table_sizes,
				'localTableRows': wpmdb_data.this_table_rows,
				'remoteTableSizes': 'undefined' !== typeof wpmdb.common.connection_data ? wpmdb.common.connection_data.table_sizes : null,
				'remoteTableRows': 'undefined' !== typeof wpmdb.common.connection_data ? wpmdb.common.connection_data.table_rows : null,
				'migrationIntent': wpmdb.functions.wpmdb_migration_type()
			});

			var backup_option = $('input[name=backup_option]:checked').val();
			var table_option = $('input[name=table_migrate_option]:checked').val();
			var selected_tables = '';
			var data_type = '';

			// set up backup stage
			if ('backup' === stage) {
				if ('migrate_only_with_prefix' === table_option && 'backup_selected' === backup_option && 'import' !== migration_intent) {
					backup_option = 'backup_only_with_prefix';
				}
				if ('push' === migration_intent) {
					data_type = 'remote';
					if ('backup_only_with_prefix' === backup_option) {
						tables_to_migrate = wpmdb.common.connection_data.prefixed_tables;
					} else if ('backup_selected' === backup_option) {
						selected_tables = $('#select-tables').val();
						selected_tables = $.wpmdb.apply_filters('wpmdb_backup_selected_tables', selected_tables);
						tables_to_migrate = get_intersect(selected_tables, wpmdb.common.connection_data.tables);
					} else if ('backup_manual_select' === backup_option) {
						tables_to_migrate = $('#select-backup').val();
					}
				} else {
					data_type = 'local';
					if ('backup_only_with_prefix' === backup_option) {
						tables_to_migrate = wpmdb_data.this_prefixed_tables;
					} else if ('backup_selected' === backup_option) {
						selected_tables = $('#select-tables').val();
						selected_tables = $.wpmdb.apply_filters('wpmdb_backup_selected_tables', selected_tables);
						tables_to_migrate = get_intersect(selected_tables, wpmdb_data.this_tables);
					} else if ('backup_manual_select' === backup_option) {
						tables_to_migrate = $('#select-backup').val();
					}
				}

				wpmdb.current_migration.model.addStage('backup', tables_to_migrate, data_type, {
					strings: {
						migrated: wpmdb_strings.backed_up
					}
				});
			}

			// set up migration stage
			if ('pull' === migration_intent) {
				data_type = 'remote';
			} else {
				data_type = 'local';
			}

			if ('find_replace' === migration_intent) {
				wpmdb.current_migration.model.addStage('find_replace', wpmdb.functions.get_tables_to_migrate(null, null), data_type, {
					strings: {
						migrated: wpmdb_strings.searched,
						stage_title: wpmdb_strings.migrate_button_find_replace
					}
				});
			} else if (-1 !== $.inArray(migration_intent, ['savefile', 'push', 'pull'])) {
				wpmdb.current_migration.model.addStage('migrate', wpmdb.functions.get_tables_to_migrate(null, null), data_type);
			}

			// add any additional migration stages via hook
			$.wpmdb.do_action('wpmdb_add_migration_stages', {
				'data_type': data_type,
				'tables_to_migrate': wpmdb.functions.get_tables_to_migrate(null, null)
			});

			var table_intent = $('input[name=table_migrate_option]:checked').val();
			var connection_info = $.trim($('.pull-push-connection-info').val()).split('\n');
			var table_rows = '';

			remote_site = connection_info[0];
			secret_key = connection_info[1];

			var static_migration_label = get_migration_status_label(remote_site, migration_intent, 'migrating');
			completed_msg = get_migration_status_label(remote_site, migration_intent, 'completed');

			if (-1 !== $.inArray(stage, ['find_replace', 'backup', 'migrate'])) {
				tables_to_migrate = wpmdb.current_migration.model.getStageItems(stage, 'name');
			}

			wpmdb.current_migration.model.setActiveStage(stage);

			wpmdb.current_migration.setTitle(static_migration_label);

			wpmdb.current_migration.startTimer();

			currently_migrating = true;
			wpmdb.current_migration.setStatus('active');

			var request_data = {
				action: 'wpmdb_initiate_migration',
				intent: migration_intent,
				url: remote_site,
				key: secret_key,
				form_data: form_data,
				stage: stage,
				nonce: wpmdb_data.nonces.initiate_migration
			};

			request_data.site_details = {
				local: wpmdb_data.site_details
			};

			if (-1 !== $.inArray(migration_intent, ['push', 'pull'])) {
				request_data.temp_prefix = wpmdb.common.connection_data.temp_prefix;
				request_data.site_details.remote = wpmdb.common.connection_data.site_details;
			}

			// site_details can have a very large number of elements that blows out PHP's max_input_vars
			// so we reduce it down to one variable for this one POST.
			request_data.site_details = JSON.stringify(request_data.site_details);

			request_data = $.wpmdb.apply_filters('wpmdb_initiate_migration_request_data', request_data, request_data);

			doing_ajax = true;

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: request_data,
				error: function error(jqXHR, textStatus, errorThrown) {

					wpmdb.current_migration.setState(wpmdb_strings.migration_failed, get_ajax_errors(jqXHR.responseText, '(#112)', jqXHR), 'error');

					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
					doing_ajax = false;
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function success(data) {
					doing_ajax = false;
					if ('undefined' !== typeof data && 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						wpmdb.current_migration.setState(wpmdb_strings.migration_failed, data.body, 'error');

						return;
					}

					wpmdb.migration_state_id = data.migration_state_id;

					var i = 0;

					// Set delay between requests - use max of local/remote values, 0 if doing export
					delay_between_requests = 0;
					if ('savefile' !== migration_intent && 'undefined' !== typeof wpmdb.common.connection_data && 'undefined' !== typeof wpmdb.common.connection_data.delay_between_requests || 'import' === migration_intent) {
						if ('import' === migration_intent) {
							delay_between_requests = wpmdb_data.delay_between_requests;
						} else {
							delay_between_requests = Math.max(parseInt(wpmdb_data.delay_between_requests), parseInt(wpmdb.common.connection_data.delay_between_requests));
						}
					}

					if (-1 !== $.inArray(migration_intent, ['savefile', 'push', 'pull', 'find_replace'])) {
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.migrate_table_recursive,
							args: ['-1', '']
						};
						wpmdb.functions.execute_next_step();
					}

					$.wpmdb.do_action('wpmdb_migration_initiated', stage);
				}

			}); // end ajax
		});

		wpmdb.functions.update_migrate_button_text();

		// close progress pop up once migration is completed
		$('body').on('click', '.close-progress-content-button', function (e) {
			hide_overlay();
			wpmdb.current_migration.restoreTitleElem();
			wpmdb.functions.maybe_reload_page();
		});

		$('body').on('click', '#overlay', function (e) {
			if (true === migration_completed && e.target === this) {
				hide_overlay();
				wpmdb.current_migration.restoreTitleElem();
				wpmdb.functions.maybe_reload_page();
			}
		});

		// AJAX save button profile
		$('.save-settings-button').click(function (event) {
			event.preventDefault();
			if ('' === $.trim($('.create-new-profile').val()) && $('#create_new').is(':checked')) {
				alert(wpmdb_strings.enter_name_for_profile);
				$('.create-new-profile').focus();
				return;
			}
			save_active_profile();
		});

		// move around textarea depending on whether or not the push/pull options are selected
		move_connection_info_box();

		$('.migrate-selection.option-group input[type=radio]').change(function () {
			move_connection_info_box();
			wpmdb.migration_selection = wpmdb.functions.wpmdb_migration_type();
			if (connection_established) {
				change_replace_values();
			}
			wpmdb.functions.update_migrate_button_text();
		});

		// hide second section if pull or push is selected with no connection established
		if (('pull' === wpmdb.functions.wpmdb_migration_type() || 'push' === wpmdb.functions.wpmdb_migration_type()) && !connection_established) {
			$('.step-two').hide();
			$('.connection-status').show();
		}

		// show / hide GUID helper description
		$('.general-helper').click(function (e) {
			e.preventDefault();
			var icon = $(this),
			    bubble = $(this).next();

			// Close any that are already open
			$('.helper-message').not(bubble).hide();

			var position = icon.position();
			if (bubble.hasClass('bottom')) {
				var bubble_offset = 1;

				if (true === bubble.hasClass('compatibility-help')) {
					bubble_offset = 6;
				} else if ($(this).is(':first-child')) {
					bubble_offset = 3;
				}
				bubble.css({
					'left': position.left - bubble.width() / 2 - bubble_offset + 'px',
					'top': position.top + icon.height() + 9 + 'px'
				});
			} else {
				bubble.css({
					'left': position.left + icon.width() + 9 + 'px',
					'top': position.top + icon.height() / 2 - 18 + 'px'
				});
			}
			bubble.toggle();
			e.stopPropagation();
		});

		$('body').click(function () {
			$('.helper-message').hide();
		});

		$('.helper-message').click(function (e) {
			e.stopPropagation();
		});

		$('body').on('click', '.show-errors-toggle', function (e) {
			e.preventDefault();
			$(this).next('.migration-php-errors').toggle();
		});

		// migrate / settings tabs
		$('.nav-tab').click(function () {
			var hash = $(this).attr('data-div-name');
			hash = hash.replace('-tab', '');
			window.location.hash = hash;
			switch_to_plugin_tab(hash, false);
		});

		$('body').on('click', 'a[href^="#"]', function (event) {
			var href = $(event.target).attr('href');
			var tab_name = href.substr(1);

			if (tab_name) {
				var nav_tab = $('.' + tab_name);
				if (1 === nav_tab.length) {
					nav_tab.trigger('click');
					event.preventDefault();
				}
			}
		});

		// repeatable fields
		$('body').on('click', '.add-row', function () {
			var $parent_tr = $(this).parents('tr');
			$parent_tr.before($('.original-repeatable-field').clone().removeClass('original-repeatable-field'));
			$parent_tr.prev().find('.old-replace-col input').focus();
		});

		// repeatable fields
		$('body').on('click', '.replace-remove-row', function () {
			$(this).parents('tr').remove();
			if (2 >= $('.replace-row').length) {
				$('.no-replaces-message').show();
			}

			var prev_id = $(this).prev().attr('id');
			if ('new-url' === prev_id || 'new-path' === prev_id) {
				$('#' + prev_id + '-missing-warning').hide();
			}
		});

		// Hide New URL & New Path Warnings on change.
		$('body').on('change', '#new-url', function () {
			$('#new-url-missing-warning').hide();
		}).on('change', '#new-path', function () {
			$('#new-path-missing-warning').hide();
		});

		// Copy Find field to associated Replace field on arrow click.
		$('body').on('click', '.arrow-col', function () {
			var replace_row_arrow = this;

			if ($(replace_row_arrow).hasClass('disabled')) {
				return;
			}

			var original_value = $(replace_row_arrow).prev('td').find('input').val();
			var new_value_input = $(replace_row_arrow).next('td').find('input');
			new_value_input.val(original_value);

			// Hide New URL or New Path Warning if changed.
			if ('new-url' === new_value_input.prop('id')) {
				$('#new-url-missing-warning').hide();
			} else if ('new-path' === new_value_input.prop('id')) {
				$('#new-path-missing-warning').hide();
			}
		});

		$('.add-replace').click(function () {
			$('.replace-fields').prepend($('.original-repeatable-field').clone().removeClass('original-repeatable-field'));
			$('.no-replaces-message').hide();
		});

		$('#find-and-replace-sort tbody').sortable({
			items: '> tr:not(.pin)',
			handle: 'td:first',
			start: function start() {
				$('.sort-handle').css('cursor', '-webkit-grabbing');
				$('.sort-handle').css('cursor', '-moz-grabbing');
			},
			stop: function stop() {
				$('.sort-handle').css('cursor', '-webkit-grab');
				$('.sort-handle').css('cursor', '-moz-grab');
			}
		});

		var hash = '';

		// check for hash in url (settings || migrate) switch tabs accordingly
		if (window.location.hash) {
			hash = window.location.hash.substring(1);
			switch_to_plugin_tab(hash, false);
		}

		if ('' !== get_query_var('install-plugin')) {
			hash = 'addons';
			checked_licence = true;
			switch_to_plugin_tab(hash, true);
		}

		// process notice links clicks, eg. dismiss, reminder
		$('.notice-link').click(function (e) {
			e.preventDefault();

			// process notice links clicks, eg. dismiss, reminder
			wpmdb.functions.ajax_handle_dismissible_notice(wpmdb_data.nonces.process_notice_link, function (ele) {
				$(ele).closest('.inline-message').hide();
			}, $(this));
		});

		// When read-only connection info is copied, convert it to one line
		$('#connection_info').on('copy', function (e) {
			var $this = $(this);

			// Test for two lines
			var lines = $this.val().split('\n');
			if (2 === lines.length) {

				// Wrapping in a try in case there's no browser support
				try {

					// Combine the two lines into one
					e.originalEvent.clipboardData.setData('text/plain', lines.join(' '));
					e.preventDefault(); // Default behaviour is to copy any selected text
				} catch (err) {

					// Do nothing. Allow normal copying
				}
			}
		});

		// regenerates the saved secret key
		$('.reset-api-key').click(function () {
			var answer = confirm(wpmdb_strings.reset_api_key);

			if (!answer || doing_reset_api_key_ajax) {
				return;
			}

			doing_reset_api_key_ajax = true;
			$('.reset-api-key').after('<img src="' + spinner_url + '" alt="" class="reset-api-key-ajax-spinner general-spinner" />');

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_reset_api_key',
					nonce: wpmdb_data.nonces.reset_api_key
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.reset_api_key_problem);
					$('.reset-api-key-ajax-spinner').remove();
					doing_reset_api_key_ajax = false;
				},
				success: function success(data) {
					$('.reset-api-key-ajax-spinner').remove();
					doing_reset_api_key_ajax = false;
					$('.connection-info').html(data);
					wpmdb_data.connection_info = $.trim(data).split('\n');
				}
			});
		});

		// Copy the connection info to the clipboard
		$('.copy-api-key').click(function () {

			var $el = $(this);

			// Get connection_info input
			var $connection_info = $('#connection_info');

			// Get the connection info
			var two_lines = $connection_info.val();

			// Make it one line, if it's two
			var one_line = two_lines.replace('\n', ' ');

			// Replace two lines with one
			$connection_info.val(one_line);

			// Select the input val
			$connection_info.select();

			try {

				// Copy connection_info
				document.execCommand('copy');

				// Unselect connection_info input
				$connection_info.blur();

				// show confirmation
				$el.css('color', 'transparent');
				var $confirmation = $('.copy-api-key-confirmation').show();

				// fadeout confirmation
				setTimeout(function () {
					$confirmation.fadeOut('fast');
					setTimeout(function () {
						$el.css('color', '');
					}, 200);
				}, 1000);
			} catch (err) {
				alert('please press Ctrl/Cmd+C to copy');
			}

			// Replace the input val with the two lines
			$connection_info.val(two_lines);
		});

		$('input[name=table_migrate_option]').change(function () {
			$('.select-tables-wrap').hide();

			if ('migrate_select' === $(this).val()) {
				$('.select-tables-wrap').show();
			}
		});

		$('.show-multiselect').each(function () {
			if ($(this).is(':checked')) {
				$(this).parents('.option-section').children('.header-expand-collapse').children('.expand-collapse-arrow').removeClass('collapsed');
				$(this).parents('.expandable-content').show();
				$(this).parents('.expandable-content').children('.select-wrap').toggle();
			}
		});

		$('input[name=backup_option]').change(function () {
			$('.backup-tables-wrap').hide();
			if ('backup_manual_select' === $(this).val()) {
				$('.backup-tables-wrap').show();
			}
		});

		if ($('#backup-manual-select').is(':checked')) {
			$('.backup-tables-wrap').show();
		}

		$('.plugin-compatibility-save').click(function () {
			if (doing_plugin_compatibility_ajax) {
				return;
			}
			$(this).addClass('disabled');
			var select_element = $('#selected-plugins');
			$(select_element).attr('disabled', 'disabled');

			$('.plugin-compatibility-success-msg').remove();

			doing_plugin_compatibility_ajax = true;
			$(this).after('<img src="' + spinner_url + '" alt="" class="plugin-compatibility-spinner general-spinner" />');

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_whitelist_plugins',
					whitelist_plugins: $(select_element).val(),
					nonce: wpmdb_data.nonces.whitelist_plugins
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.blacklist_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText);
					$(select_element).removeAttr('disabled');
					$('.plugin-compatibility-save').removeClass('disabled');
					doing_plugin_compatibility_ajax = false;
					$('.plugin-compatibility-spinner').remove();
				},
				success: function success(data) {
					if ('' !== $.trim(data)) {
						alert(data);
					}
					$(select_element).removeAttr('disabled');
					$('.plugin-compatibility-save').removeClass('disabled');
					doing_plugin_compatibility_ajax = false;
					$('.plugin-compatibility-spinner').remove();
					$('.plugin-compatibility-save').after('<span class="plugin-compatibility-success-msg">' + wpmdb_strings.saved + '</span>');
					$('.plugin-compatibility-success-msg').fadeOut(2000);
				}
			});
		});

		// delete a profile from the migrate form area
		$('body').on('click', '.delete-profile', function () {
			var name = $(this).next().clone();
			$('input', name).remove();
			name = $.trim($(name).html());
			var answer = confirm(wpmdb_strings.remove_profile.replace('{{profile}}', name));

			if (!answer) {
				return;
			}
			var $profile_li = $(this).parent();

			if ($profile_li.find('input:checked').length) {
				var $new_profile_li = $profile_li.siblings().last();
				$new_profile_li.find('input[type=radio]').prop('checked', 'checked');
				$new_profile_li.find('input[type=text]').focus();
				$('#migrate-form .crumbs .crumb:last').text('New Profile');

				if ('function' === typeof window.history.pushState) {
					var updated_url = window.location.href.replace('#migrate', '').replace(/&wpmdb-profile=-?\d+/, '') + '&wpmdb-profile=-1';
					window.history.pushState({ updated_profile_id: -1 }, null, updated_url);
				}
			}

			$profile_li.fadeOut(500);

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_delete_migration_profile',
					profile_id: $(this).attr('data-profile-id'),
					nonce: wpmdb_data.nonces.delete_migration_profile
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.remove_profile_problem);
				},
				success: function success(data) {
					if ('-1' === data) {
						alert(wpmdb_strings.remove_profile_not_found);
					}
				}
			});
		});

		// deletes a profile from the main profile selection screen
		$('.main-list-delete-profile-link').click(function () {
			var name = $(this).prev().html();
			var answer = confirm(wpmdb_strings.remove_profile.replace('{{profile}}', name));

			if (!answer) {
				return;
			}

			$(this).parent().fadeOut(500);

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_delete_migration_profile',
					profile_id: $(this).attr('data-profile-id'),
					nonce: wpmdb_data.nonces.delete_migration_profile
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.remove_profile_problem);
				}
			});
		});

		// warn the user when editing the connection info after a connection has been established
		$('body').on('click', '.temp-disabled', function () {
			var answer = confirm(wpmdb_strings.change_connection_info);

			if (answer) {
				$('.ssl-notice').hide();
				$('.different-plugin-version-notice').hide();
				$('.migrate-db-button').show();
				$('.temp-disabled').removeAttr('readonly');
				$('.temp-disabled').removeClass('temp-disabled');
				$('.connect-button').show();
				$('.step-two').hide();
				$('.connection-status').show().html(wpmdb_strings.enter_connection_info);
				connection_established = false;
			}
		});

		// ajax request for settings page when checking/unchecking setting radio buttons
		$('.settings-tab input[type=checkbox]').change(function () {
			if ('plugin-compatibility' === $(this).attr('id')) {
				return;
			}
			var checked = $(this).is(':checked');
			var setting = $(this).attr('id');
			var $status = $(this).closest('td').next('td').find('.setting-status');

			$('.ajax-success-msg').remove();
			$status.after(ajax_spinner);

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_save_setting',
					checked: checked,
					setting: setting,
					nonce: wpmdb_data.nonces.save_setting
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					alert(wpmdb_strings.save_settings_problem);
					$('.ajax-spinner').remove();
				},
				success: function success(data) {
					$('.ajax-spinner').remove();
					$status.append('<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>');
					$('.ajax-success-msg').fadeOut(2000, function () {
						$(this).remove();
					});
				}
			});
		});

		// disable form submissions
		$('.migrate-form').submit(function (e) {
			e.preventDefault();
		});

		// fire connection_box_changed when the connect button is pressed
		$('.connect-button').click(function (event) {
			event.preventDefault();
			$(this).blur();
			wpmdb.functions.connection_box_changed();
		});

		// send paste even to connection_box_changed() function
		$('.pull-push-connection-info').bind('paste', function (e) {
			var $this = this;
			setTimeout(function () {
				wpmdb.functions.connection_box_changed();
			}, 0);
		});

		$('body').on('click', '.try-again', function () {
			$('.pull-push-connection-info').removeClass('temp-disabled');
			wpmdb.functions.connection_box_changed();
		});

		$('body').on('click', '.try-http', function () {
			var connection_info = $.trim($('.pull-push-connection-info').val()).split('\n');
			var new_url = connection_info[0].replace('https', 'http');
			var new_contents = new_url + '\n' + connection_info[1];
			$('.pull-push-connection-info').val(new_contents);
			wpmdb.functions.connection_box_changed();
		});

		$('.create-new-profile').change(function () {
			profile_name_edited = true;
		});

		$('body').on('click', '.temporarily-disable-ssl', function () {
			var hash = '';
			if (window.location.hash) {
				hash = window.location.hash.substring(1);
			}
			$(this).attr('href', $(this).attr('href') + '&hash=' + hash);
		});

		// Sets the initial Pause/Resume button event to Pause
		$('body').on('click', '.pause-resume', function (event) {
			set_pause_resume_button(event);
		});

		$('body').on('click', '.cancel', function (event) {
			cancel_migration(event);
		});

		$('.enter-licence').click(function () {
			$('.settings').click();
			$('.licence-input').focus();
		});

		$('body').on('click', '.copy-licence-to-remote-site', function () {
			$('.connection-status').html(wpmdb_strings.copying_license);
			$('.connection-status').removeClass('notification-message error-notice migration-error');
			$('.connection-status').append(ajax_spinner);

			var connection_info = $.trim($('.pull-push-connection-info').val()).split('\n');

			doing_ajax = true;
			disable_export_type_controls();

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_copy_licence_to_remote_site',
					url: connection_info[0],
					key: connection_info[1],
					nonce: wpmdb_data.nonces.copy_licence_to_remote_site
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					$('.connection-status').html(get_ajax_errors(jqXHR.responseText, '(#143)', jqXHR));
					$('.connection-status').addClass('notification-message error-notice migration-error');
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function success(data) {
					$('.ajax-spinner').remove();
					doing_ajax = false;
					enable_export_type_controls();

					if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
						$('.connection-status').html(data.body);
						$('.connection-status').addClass('notification-message error-notice migration-error');

						if (data.body.indexOf('401 Unauthorized') > -1) {
							$('.basic-access-auth-wrapper').show();
						}

						return;
					}
					wpmdb.functions.connection_box_changed();
				}
			});
		});

		$('body').on('click', '.reactivate-licence', function (e) {
			doing_ajax = true;

			$('.invalid-licence').empty().html(wpmdb_strings.attempting_to_activate_licence);
			$('.invalid-licence').append(ajax_spinner);

			$.ajax({
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_reactivate_licence',
					nonce: wpmdb_data.nonces.reactivate_licence
				},
				error: function error(jqXHR, textStatus, errorThrown) {
					$('.invalid-licence').html(wpmdb_strings.activate_licence_problem);
					$('.invalid-licence').append('<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + '<br />' + jqXHR.responseText);
					$('.ajax-spinner').remove();
					doing_ajax = false;
				},
				success: function success(data) {
					$('.ajax-spinner').remove();
					doing_ajax = false;

					if ('undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error) {
						$('.invalid-licence').html(data.body);
						return;
					}

					if ('undefined' !== typeof data.wpmdb_dbrains_api_down && 1 === data.wpmdb_dbrains_api_down) {
						$('.invalid-licence').html(wpmdb_strings.temporarily_activated_licence);
						$('.invalid-licence').append(data.body);
						return;
					}

					$('.invalid-licence').empty().html(wpmdb_strings.licence_reactivated);
					location.reload();
				}
			});
		});

		$('input[name=table_migrate_option]').change(function () {
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action('wpmdb_tables_to_migrate_changed');
		});

		$('body').on('change', '#select-tables', function () {
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action('wpmdb_tables_to_migrate_changed');
		});

		$.wpmdb.add_filter('wpmdb_get_table_prefix', get_table_prefix);
		$.wpmdb.add_filter('wpmdb_get_tables_to_migrate', wpmdb.functions.get_tables_to_migrate);
		$.wpmdb.add_action('wpmdb_lock_replace_url', lock_replace_url);
		$.wpmdb.add_action('wpmdb_pin_replace_url', pin_replace_url);
		$.wpmdb.add_action('move_connection_info_box', wpmdb.functions.exclude_post_types_warning);

		$.wpmdb.add_filter('wpmdb_before_migration_complete_hooks', function (hooks) {
			pause_before_finalize = !!$('input[name=pause_before_finalize]:checked').length;
			if (true === pause_before_finalize && 'savefile' !== migration_intent) {
				set_pause_resume_button(null); // don't just set migration_paused to true, since `set_pause_resume_button` will get double bound to clicking resume
				is_auto_pause_before_finalize = true;
			}
			return hooks;
		});

		$('.wpmdb-switch').on('click', function (e) {
			if (!$(this).hasClass('disabled')) {
				set_checkbox($(this).attr('id'));
			}
		});
	});
})(jQuery, wpmdb);

},{"MigrationProgress-controller":6}]},{},[1,2,3,4,5,12,13,14]);
