(function( $, wpmdb ) {

	$( document ).ready( function() {

		wpmdb.functions.localStorage_available = function() {
			try {
				localStorage.setItem( 'wpmdb_test', 'wpmdb_test' );
				localStorage.removeItem( 'wpmdb_test', 'wpmdb_test' );
				return true;
			}
			catch ( e ) {
				return false;
			}
		};

		wpmdb.functions.maybe_reload_page = function() {
			var migration_type = wpmdb_migration_type();

			if ( ! wpmdb.functions.localStorage_available() ||
			     'cancelled' === wpmdb.current_migration.status ||
			     true === wpmdb.common.migration_error ||
			     -1 === $.inArray( migration_type, [ 'pull', 'import', 'find_replace' ] )
			) {
				return;
			}

			if ( 'true' === wpmdb_data.is_multisite &&
			     $( '#mst-select-subsite' ).is( ':checked' ) &&
			     wpmdb_data.this_domain !== $( '#mst-selected-subsite option:selected' ).text()
			) {
				return;
			}

			var tables_to_migrate = wpmdb.functions.get_tables_to_migrate();

			if ( 'import' === migration_type ) {
				tables_to_migrate = wpmdb.functions.get_tables_to_import();
			}

			if ( -1 === $.inArray( wpmdb_data.this_prefix + 'options',  tables_to_migrate ) &&
			     -1 === $.inArray( wpmdb_data.this_prefix + 'usermeta', tables_to_migrate ) ) {
				return;
			}

			wpmdb.functions.set_localStorage_form_data();
			location.reload();
		};

		wpmdb.functions.set_localStorage_form_data = function() {
			var data = {};

			$.each( $( '#migrate-form' ).serializeArray(), function( index, field ) {
				if ( '[]' === field.name.substr( -2 ) ) {
					var field_name = field.name.slice( 0, -2 );
					if ( 'undefined' === typeof data[ field_name ] ) {
						data[ field_name ] = [];
					}
					data[ field_name ].push( field.value );
				} else {
					data[ field.name ] = field.value;
				}
			} );

			localStorage.setItem( 'wpmdb_migrate_form', JSON.stringify( data ) );
		};

		wpmdb.functions.get_localStorage_form_data = function() {
			var form_data = localStorage.getItem( 'wpmdb_migrate_form' );

			if ( null === form_data ) {
				return false;
			}

			try {
				form_data = JSON.parse( form_data );
			}
			catch ( err ) {
				return false;
			}

			return form_data;
		};

		wpmdb.functions.remove_localStorage_form_data = function() {
			localStorage.removeItem( 'wpmdb_migrate_form' );
		};

		wpmdb.functions.load_data_from_localStorage = function() {
			var form_data = wpmdb.functions.get_localStorage_form_data();

			if ( ! form_data ) {
				return;
			}

			$.each( form_data, function( name, value ) {
				var $input = $( '[name="' + name + '"]' );
				var input_type = $input.attr( 'type' );

				if ( 'action' === name ) {
					wpmdb.migration_selection = value;
					$( '#' + value ).prop( 'checked', true );
				} else {
					if ( 'radio' === input_type ) {
						$( '[name="' + name + '"][value="' + value + '"]' ).prop( 'checked', true );
					} else if ( 'checkbox' === input_type ) {
						$input.prop( 'checked', true );

						if ( $input.parent().hasClass( 'checkbox-label' ) ) {
							$input.parent().next().show();
						}
					} else {
						$input.val( value );
					}
				}
			} );

			$( '.option-group input[type=radio]' ).change();
			$( '.' + wpmdb.migration_selection + '-list ul' ).show();

			$.when( wpmdb.functions.connection_box_changed() ).done( function() {
				if ( 'migrate_select' === $( 'input[name=table_migrate_option]:checked' ).val() ) {
					if ( 'undefined' !== typeof form_data.select_tables ) {
						$( '#select-tables' ).val( form_data.select_tables );
					}

					$( '.table-options .expandable-content, .select-tables-wrap' ).show();
					$( '.table-options .expand-collapse-arrow' ).removeClass( 'collapsed' );
				} else {
					$( '.select-tables-wrap' ).hide();
				}

				if ( 'backup_manual_select' === $( 'input[name=backup_option]:checked' ).val() ) {
					if ( 'undefined' !== typeof form_data.select_backup ) {
						$( '#select-backup' ).val( form_data.select_backup );
					}

					$( '.backup-tables-wrap' ).show();
				}

				if ( 'undefined' !== typeof form_data.select_post_types ) {
					$( '#select-post-types' ).val( form_data.select_post_types );
					wpmdb.functions.exclude_post_types_warning();
				}

				if ( 'undefined' !== typeof form_data.replace_old ) {

					$( '.replace-row' ).not( '.original-repeatable-field' ).remove();

					var n = 1;
					$.each( form_data.replace_old, function( index, value ) {
						if ( ! $( '.replace-row:nth-child(' + n + ')' ).length ) {
							$( '.replace-row' ).last().after( $( '.original-repeatable-field' ).clone().removeClass( 'original-repeatable-field' ) );
						}

						$( '.replace-row:nth-child(' + n + ') [name="replace_old[]"]' ).val( value );
						$( '.replace-row:nth-child(' + n + ') [name="replace_new[]"]' ).val( form_data.replace_new[ index ] );
						n++;
					} );
				}
			} );

			wpmdb.functions.update_migrate_button_text();

			if ( 'import' !== wpmdb_migration_type() ) {
				wpmdb.functions.remove_localStorage_form_data();
			}
		};
		wpmdb.functions.load_data_from_localStorage();

	} );

} )( jQuery, wpmdb );
