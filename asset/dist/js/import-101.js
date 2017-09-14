(function( $, wpmdb ) {

	var import_selected = false;
	var $import_select = $( '#select-tables' ).clone();
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
	function import_migration_status_label( label, args ) {
		if ( 'import' === args.intent ) {
			if ( 'completed' === args.stage ) {
				label = wpmdb_strings.import_label_completed;
			} else {
				label = wpmdb_strings.import_label_migrating;
			}
		}

		return label;
	}
	$.wpmdb.add_filter( 'wpmdb_get_migration_status_label', import_migration_status_label );

	/**
	 * Updates the connection info box for imports
	 *
	 * @param object args
	 */
	function import_connection_info_box( args ) {
		var $import_file_status = $( '.import-file-status' );

		if ( 'import' === args.migration_type ) {

			if ( ! import_selected ) {
				$( '.step-two' ).hide();

				if ( $import_file_status.hasClass( 'profile-loaded' ) ) {
					$import_file_status.attr( 'class', 'import-file-status profile-loaded notification-message success-notice' );
					$import_file_status.html( wpmdb_strings.import_profile_loaded );
				} else {
					$import_file_status.html( wpmdb_strings.please_select_sql_file );
				}

				$import_file_status.show();
			} else {
				if ( unrecognized_import_file ) {
					$( '.unrecognized-import-file-notice' ).show();
				}
			}

			maybe_show_find_replace_options();

			$( '.mst-options' ).hide();
			$( '.import-find-replace-option, .import-active-plugin-option' ).show();
		} else {
			$( '.find-replace-rows, .table-options, .advanced-options, .exclude-post-types-options, label[for="backup-selected"]' ).show();
			$( '.import-find-replace-option, .find-replace-options, .import-file-status, .import-active-plugin-option, .unrecognized-import-file-notice' ).hide();

			if ( 'search_all_imported' === $( 'input[name=table_migrate_option]:checked' ).val() ) {
				$( 'input[name=table_migrate_option][value=migrate_only_with_prefix]' ).prop( 'checked', true );
			}
		}
	}
	$.wpmdb.add_action( 'move_connection_info_box', import_connection_info_box );

	/**
	 * Starts the upload process for the import
	 *
	 * @param stage
	 */
	function maybe_initiate_import( stage ) {
		if ( 'import' === wpmdb_migration_type() ) {
			if ( 'backup' === stage ) {
				wpmdb.common.hooks.push( wpmdb.functions.migrate_table_recursive );
			}

			wpmdb.common.hooks.push( wpmdb.functions.upload_file_recursive );
			wpmdb.common.next_step_in_migration = { fn: wpmdb_call_next_hook };
			wpmdb.functions.execute_next_step();
		}
	}
	$.wpmdb.add_action( 'wpmdb_migration_initiated', maybe_initiate_import );

	/**
	 * Restores the import select when changing migration types
	 */
	function update_import_table_select() {
		$( '#select-tables' ).remove();
		$( '.select-tables-wrap' ).prepend( $import_select );
		$( '#select-tables' ).change();
	}
	$.wpmdb.add_action( 'wpmdb_update_import_table_select', update_import_table_select );

	/**
	 * Updates the selected tables for the "Backup tables that will be replaced during the import" option
	 *
	 * @param tables_to_backup
	 *
	 * @return array
	 */
	function backup_selected_for_import( tables_to_backup ) {
		if ( 'import' === wpmdb_migration_type() ) {
			tables_to_backup = tables_to_import;
		}

		return tables_to_backup;
	}
	$.wpmdb.add_filter( 'wpmdb_backup_selected_tables', backup_selected_for_import );

	/**
	 * Adds the import migration stage
	 *
	 * object args
	 */
	function add_import_stage( args ) {
		if ( 'import' === wpmdb_migration_type() ) {
			wpmdb.current_migration.model.addStage( 'upload', [], 'local', {
				strings: {
					stage_title: wpmdb_strings.upload
				}
			} );

			wpmdb.current_migration.model.addStage( 'import', [], 'local', {
				strings: {
					stage_title: wpmdb_strings.migrate_button_import
				}
			} );

			if ( $( '#import-find-replace' ).is( ':checked' ) ) {
				tables_to_search = args.tables_to_migrate;
				wpmdb.current_migration.model.addStage( 'find_replace', [], 'local', {
					strings: {
						migrated: wpmdb_strings.searched,
						stage_title: wpmdb_strings.migrate_button_find_replace
					}
				} );
			}
		}
	}
	$.wpmdb.add_action( 'wpmdb_add_migration_stages', add_import_stage );

	/**
	 * Adds any info necessary to begin an import
	 *
	 * @param object request_data
	 *
	 * @return {object}
	 */
	function initiate_import_request_data( request_data ) {
		if ( 'import' === wpmdb_migration_type() ) {
			request_data.import_info = import_info;
		}

		return request_data;
	}
	$.wpmdb.add_filter( 'wpmdb_initiate_migration_request_data', initiate_import_request_data );

	/**
	 * Gets more information about the import file and loads step-two
	 *
	 * @param event
	 */
	function get_import_info( event ) {
		var files = event.target.files; // FileList object
		var file = files[0];
		var reader = new FileReader();
		var $import_file_status = $( '.import-file-status' );
		var $backup_selected_option = $( 'label[for="backup-selected"]' );
		var $prefix_notice = $( '.prefix-notice' );
		var $unrecognized_file_notice = $( '.unrecognized-import-file-notice' );
		var $step_two = $( '.step-two' );

		$import_file_status.hide().attr( 'class', 'import-file-status' );
		$prefix_notice.hide();
		$unrecognized_file_notice.hide();
		$step_two.hide();

		if ( ! files.length ) {
			if ( import_selected ) {
				$step_two.hide();
				$import_file_status.text( wpmdb_strings.please_select_sql_file ).show();
				import_selected = false;
			}
			return;
		} else {

			if ( '.sql' === file.name.slice( -4 ) || '.sql.gz' === file.name.slice( -7 ) ) {
				import_selected = true;
			} else {
				$import_file_status.addClass( 'notification-message error-notice migration-error' ).text( wpmdb_strings.invalid_sql_file ).show();
				$step_two.hide();
				return;
			}
		}

		import_prefix = '';

		$import_file_status.text( wpmdb_strings.parsing_sql_file ).append( ajax_spinner ).show();

		reader.onloadend = function( event ) {
			if ( event.target.readyState !== FileReader.DONE ) {
				return;
			}

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_get_import_info',
					file_data: event.target.result,
					nonce: wpmdb_data.nonces.import_file
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					console.log( jqXHR, textStatus, errorThrown );
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					$import_file_status.hide();
					$step_two.show();

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						$import_file_status.text( data.body ).addClass( 'notification-message error-notice migration-error' ).show();
						$step_two.hide();
					} else {
						var localStorage_form_data = wpmdb.functions.get_localStorage_form_data();
						import_info = data;

						if ( 'undefined' !== typeof data.prefix ) {
							import_prefix = data.prefix;
							$( '.table-prefix' ).text( data.prefix );
							wpmdb.functions.maybe_show_prefix_notice( data.prefix );
						}

						if ( 'undefined' !== typeof data.tables ) {
							tables_to_import = data.tables;
							$backup_selected_option.show();

							// Update the find & replace values
							if ( ! localStorage_form_data ) {
								$( '#old-url' ).val( wpmdb.functions.remove_protocol( data.URL ) );
								$( '#old-path' ).val( data.path );
								$( '#new-url' ).val( wpmdb.functions.remove_protocol( wpmdb_data.this_url ) );
								$( '#new-path' ).val( wpmdb_data.this_path );
							}

							// Update the select with tables that will be imported
							var loaded_tables = [];
							var loaded_post_types = [];

							if ( localStorage_form_data ) {
								loaded_tables = localStorage_form_data.select_tables;
								loaded_post_types = localStorage_form_data.select_post_types;
								wpmdb.functions.remove_localStorage_form_data();
							} else {
								if ( 'migrate_only_with_prefix' === $( 'input[name=table_migrate_option]:checked' ).val() && ! $import_file_status.hasClass( 'profile-loaded' ) ) {
									$( 'input[name=table_migrate_option][value=search_all_imported]' ).prop( 'checked', true );
								}
							}

							if ( false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables ) {
								loaded_tables = wpmdb_loaded_tables;
								loaded_post_types = wpmdb_loaded_post_types;
							}
							$import_select = wpmdb.functions.create_table_select( data.tables, [], loaded_tables );
							$.wpmdb.do_action( 'wpmdb_update_import_table_select' );

							if ( 'undefined' !== typeof data.post_types ) {
								var $post_type_select = document.createElement( 'select' );
								$( $post_type_select ).attr( {
									multiple: 'multiple',
									name: 'select_post_types[]',
									id: 'select-post-types',
									class: 'multiselect'
								} );

								$.each( data.post_types, function( index, value ) {
									var selected = $.inArray( value, loaded_post_types );
									if ( -1 !== selected || ( true === wpmdb_convert_exclude_revisions && 'revision' !== value ) ) {
										selected = true;
									} else {
										selected = false;
									}

									var opt = document.createElement( 'option' );
									opt.value = value;
									opt.text = value;
									opt.selected = selected;
									$post_type_select.add( opt, null );
								} );

								$( '#select-post-types' ).remove();
								$( '.exclude-post-types-warning' ).after( $post_type_select );
							}

							if ( unrecognized_import_file ) {
								unrecognized_import_file = false;
								maybe_show_find_replace_options();
							}
						} else {
							$unrecognized_file_notice.show();
							$backup_selected_option.hide();
							$( '.table-options' ).hide();
							unrecognized_import_file = true;
						}
					}
				}
			} );
		};

		var blob = file.slice( 0, 1024 * 1000 );
		reader.readAsDataURL( blob );
	}
	$( '#import-file' ).on( 'change', get_import_info );

	/**
	 * Displays the find and replace options for imports
	 */
	function maybe_show_find_replace_options() {
		var find_replace_rows = $( '.find-replace-rows' );
		return $( '#import-find-replace' ).is( ':checked' ) ? find_replace_rows.show() : find_replace_rows.hide();
	}
	$( '#import-find-replace' ).on( 'click', maybe_show_find_replace_options );

	function maybe_show_table_options() {
		if ( ! unrecognized_import_file ) {
			return;
		}

		setTimeout( function() {
			if ( $( '.find-replace-options-toggle .expand-collapse-arrow' ).hasClass( 'collapsed' ) ) {
				return;
			}

			$( '.table-options' ).hide();
		}, 1 );
	}
	$( '.find-replace-options-toggle' ).on( 'click', maybe_show_table_options );

	/**
	 * Updates both `keep_active_plugins` checkboxes when one is changed.
	 */
	function update_keep_active_plugins_option() {
		$( 'input[name=keep_active_plugins]' ).prop( 'checked', $( this ).is( ':checked' ) );
	}
	$( 'input[name=keep_active_plugins]' ).on( 'click', update_keep_active_plugins_option );

	/**
	 * Recursively upload an import file
	 *
	 * @param int start
	 */
	wpmdb.functions.upload_file_recursive = function( start ) {
		start = 'undefined' === typeof start ? 0 : start;

		var file = document.getElementById( 'import-file' ).files[0];
		var slice_size = 1000 * 1024; // 1 MB
		var next_slice = start + slice_size + 1;
		var reader = new FileReader();

		if ( 0 === start ) {
			wpmdb.current_migration.model.addStageItem( 'upload', file.name, file.size / 1000, Math.ceil( file.size / slice_size ) );
		}

		reader.onloadend = function( event ) {
			if ( event.target.readyState !== FileReader.DONE ) {
				return;
			}

			$.ajax( {
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
				error: function( jqXHR, textStatus, errorThrown ) {
					console.log( jqXHR, textStatus, errorThrown );
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
				},
				success: function( data ) {
					wpmdb.current_migration.setText();

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						wpmdb.current_migration.setState( wpmdb_strings.migration_failed, data.body, 'error' );

						return;
					}

					var size_done = start + slice_size;

					wpmdb.current_migration.setText( wpmdb_strings.uploading_file_to_server );
					wpmdb.current_migration.model.getStageModel( 'upload' ).setItemRowsTransferred( file.name, Math.ceil( size_done / slice_size ) );

					if ( next_slice < file.size ) {
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.upload_file_recursive,
							args: [ next_slice ]
						};
					} else {
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.upload_import_successful,
							args: [ file ]
						};
					}

					wpmdb.functions.execute_next_step();
				}
			} );
		};

		var blob = file.slice( start, next_slice );
		reader.readAsDataURL( blob );
	};

	/**
	 * Prepares the import stage
	 *
	 * @param file
	 */
	wpmdb.functions.upload_import_successful = function( file ) {

		$.ajax( {
			type: 'POST',
			url: ajaxurl,
			data: {
				action: 'wpmdb_prepare_import_file',
				migration_state_id: wpmdb.migration_state_id,
				nonce: wpmdb_data.nonces.import_file
			},
			dataType: 'json',
			error: function( jqXHR, textStatus, errorThrown ) {
				console.log( jqXHR, textStatus, errorThrown );
				wpmdb.common.migration_error = true;
				wpmdb.functions.migration_complete_events();
			},
			success: function( response ) {
				var item_name = file.name;
				var migration_text = wpmdb_strings.importing_file_to_db;

				if ( '.gz' === item_name.slice( -3 ) ) {
					item_name = file.name.slice( 0, -3 );
				}

				migration_text = migration_text.replace( /\%s\s?/, item_name );
				wpmdb.current_migration.setText( migration_text );

				wpmdb.current_migration.model.addStageItem( 'import', item_name, response.import_size / 1000, response.num_chunks );
				wpmdb.current_migration.model.setActiveStage( 'import' );

				wpmdb.common.next_step_in_migration = {
					fn: wpmdb.functions.import_file_recursive,
					args: [ {
						import_filename: response.import_file,
						item_name: item_name,
						chunk: 0,
						current_query: ''
					} ]
				};

				wpmdb.functions.execute_next_step();
			}
		} );
	};

	/**
	 * Recursively imports chunks to the database
	 *
	 * @param object args
	 */
	wpmdb.functions.import_file_recursive = function( args ) {

		$.ajax( {
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
			error: function( jqXHR, textStatus, errorThrown ) {
				console.log( jqXHR, textStatus, errorThrown );
				wpmdb.common.migration_error = true;
				wpmdb.functions.migration_complete_events();
			},
			success: function( response ) {
				if ( 'undefined' !== typeof response.wpmdb_error && 1 === response.wpmdb_error ) {
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
					wpmdb.current_migration.setState( wpmdb_strings.migration_failed, response.body, 'error' );
					return;
				}

				wpmdb.current_migration.model.getStageModel( 'import' ).setItemRowsTransferred( args.item_name, response.chunk );

				if ( response.chunk >= response.num_chunks ) {

					wpmdb.current_migration.model.getStageModel( 'import' ).setItemRowsTransferred( args.item_name, ++response.chunk );

					if ( $( '#import-find-replace' ).is( ':checked' ) ) {

						if ( unrecognized_import_file ) {
							$.each( response.table_sizes, function( table, size ) {
								if ( table.startsWith( wpmdb_data.this_temp_prefix ) && wpmdb_data.alter_table_name !== table ) {
									var table_name = table.replace( wpmdb_data.this_temp_prefix, '' );
									wpmdb.current_migration.model.addStageItem( 'find_replace', table_name, response.table_sizes[ table ], response.table_rows[ table ] );
								}
							} );
						} else {
							var table_migrate_option = $( 'input[name=table_migrate_option]:checked' ).val();

							if ( 'migrate_only_with_prefix' === table_migrate_option ) {
								tables_to_search = tables_to_import.filter( function( table ) {
									return import_prefix === table.substring( 0, import_prefix.length );
								} );
							} else if ( 'search_all_imported' === table_migrate_option ) {
								tables_to_search = tables_to_import;
							}

							$.each( tables_to_search, function( key, table ) {
								var imported_table = wpmdb_data.this_temp_prefix + table;
								if ( response.table_sizes.hasOwnProperty( imported_table ) ) {
									wpmdb.current_migration.model.addStageItem( 'find_replace', table, response.table_sizes[ imported_table ], response.table_rows[ imported_table ] );
								}
							} );
						}

						tables_to_search = [];

						wpmdb.current_migration.model.setActiveStage( 'find_replace' );
						wpmdb.common.next_step_in_migration = {
							fn: wpmdb.functions.migrate_table_recursive,
							args: [ 0 ]
						};
						wpmdb.functions.execute_next_step();
						return;
					} else {
						$( '.progress-label' ).removeClass( 'label-visible' );
						wpmdb.common.hooks = $.wpmdb.apply_filters( 'wpmdb_before_migration_complete_hooks', wpmdb.common.hooks );
						wpmdb.common.hooks.push( wpmdb.functions.migration_complete );
						wpmdb.common.hooks.push( wpmdb.functions.wpmdb_flush );
						wpmdb.common.hooks = $.wpmdb.apply_filters( 'wpmdb_after_migration_complete_hooks', wpmdb.common.hooks );
						wpmdb.common.hooks.push( wpmdb.functions.migration_complete_events );
						wpmdb.common.next_step_in_migration = { fn: wpmdb_call_next_hook };
					}

				} else {
					wpmdb.common.next_step_in_migration = {
						fn: wpmdb.functions.import_file_recursive,
						args: [ {
							import_filename: args.import_filename,
							item_name: args.item_name,
							chunk: response.chunk,
							current_query: response.current_query
						} ]
					};
				}

				wpmdb.functions.execute_next_step();
			}
		} );
	};

	wpmdb.functions.get_tables_to_import = function() {
		return tables_to_import;
	};

})( jQuery, wpmdb );
