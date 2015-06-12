// global vars
var hooks = [];
var call_stack = [];
var non_fatal_errors = '';
var migration_error = false;
var connection_data;
var next_step_in_migration;

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
function wpmdb_toggle_migration_action_text() {
	jQuery( '.action-text' ).hide();
	jQuery( '.action-text.' + jQuery( 'input[name=action]:checked' ).val() ).show();
}

/**
 * Return the currently selected migration type selected.
 *
 * @return string Will return `push`, `pull`, or `savefile` for exporting as a file.
 */
function wpmdb_migration_type() {
	return jQuery( 'input[name=action]:checked' ).val();
}

function wpmdb_call_next_hook() {
	if ( !call_stack.length ) {
		call_stack = hooks;
	}

	var func = call_stack[0];
	call_stack.shift();
	window[func](); // Uses the string from the array to call the function of the same name
}

function wpmdb_add_commas( number_string ) {
	number_string += '';
	var x = number_string.split( '.' );
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while ( rgx.test( x1 ) ) {
		x1 = x1.replace( rgx, '$1' + ',' + '$2' );
	}
	return x1 + x2;
}

function wpmdb_parse_json( maybe_json ) {
	var json_object = {};
	try {
		json_object = jQuery.parseJSON( maybe_json );
	}
	catch ( e ) {
		// we simply return false here because the json data itself will never just contain a value of "false"
		return false;
	}
	return json_object;
}

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
function wpmdbGetAjaxErrors( title, code, text, jqXHR ) {
	var jsonErrors = false;
	var html = '';

	var validJson = wpmdb_parse_json( text );
	if ( false === validJson ) {
		jsonErrors = true;
		title = wpmdb_strings.ajax_json_message;
		code = '(#144)';
		var originalText = text;
		text = wpmdb_strings.ajax_json_errors + ' ' + code;
		text += '<br><a class="show-errors-toggle" href="#">' + wpmdb_strings.view_error_messages + '</a> ';
		text += '<div class="migration-php-errors">' + originalText + '</div>';
	}

	// Only add local connection issue if php errors (#144) or jqXHR has been provided
	if ( jsonErrors || jqXHR !== undefined ) {
		html += '<strong>' + title + '</strong>' + ' &mdash; ';
	}

	// Only add extra error details if not php errors (#144) and jqXHR has been provided
	if ( !jsonErrors && jqXHR !== undefined ) {
		html += wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText;
		html += '<br /><br />' + wpmdb_strings.response + ':<br />';
	}

	// Add code to the end of the error text if not json errors
	if ( !jsonErrors ) {
		text += ' ' + code;
	}

	// Finally add the error message to the output
	html += text;

	return html;
}

(function( $ ) {
	// jQuery code here
})( jQuery );
