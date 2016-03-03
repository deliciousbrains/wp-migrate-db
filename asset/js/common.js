// global vars
var hooks = [];
var call_stack = [];
var non_fatal_errors = '';
var migration_error = false;
var connection_data;

function wpmdb_call_next_hook() {
	if( ! call_stack.length ) {
		call_stack = hooks;
	}

	var func = call_stack[0];
	call_stack.shift();
	window[func](); // Uses the string from the array to call the function of the same name
}

function wpmdb_add_commas( number_string ) {
	number_string += '';
	x = number_string.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function wpmdb_parse_json( maybe_json ) {
	try {
		var json_object = jQuery.parseJSON( maybe_json );
	}
	catch(e){
		// we simply return false here because the json data itself will never just contain a value of "false"
		return false; 
	}
	return json_object;
}

(function($) {
	// jQuery code here
})(jQuery);