/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 161);
/******/ })
/************************************************************************/
/******/ ({

/***/ 161:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\n(function ($) {\n\n\tvar doing_check_licence = false;\n\tvar fade_duration = 650;\n\n\tvar admin_url = ajaxurl.replace('/admin-ajax.php', '');\n\tvar spinner_url = admin_url + '/images/spinner';\n\tvar spinner;\n\tif (2 < window.devicePixelRatio) {\n\t\tspinner_url += '-2x';\n\t}\n\tspinner_url += '.gif';\n\tspinner = $('<img src=\"' + spinner_url + '\" alt=\"\" class=\"check-licence-spinner\" />');\n\n\t$(document).ready(function () {\n\n\t\t$('body').on('click', '.check-my-licence-again', function (e) {\n\t\t\te.preventDefault();\n\t\t\t$(this).blur();\n\n\t\t\tif (doing_check_licence) {\n\t\t\t\treturn false;\n\t\t\t}\n\n\t\t\tdoing_check_licence = true;\n\n\t\t\t$(this).hide();\n\t\t\tspinner.insertAfter(this);\n\n\t\t\tvar check_again_link = ' <a class=\"check-my-licence-again\" href=\"#\">' + wpmdb_update_strings.check_license_again + '</a>';\n\n\t\t\t$.ajax({\n\t\t\t\turl: ajaxurl,\n\t\t\t\ttype: 'POST',\n\t\t\t\tdataType: 'json',\n\t\t\t\tcache: false,\n\t\t\t\tdata: {\n\t\t\t\t\taction: 'wpmdb_check_licence',\n\t\t\t\t\tnonce: wpmdb_nonces.check_licence,\n\t\t\t\t\tcontext: 'update'\n\t\t\t\t},\n\t\t\t\terror: function error(jqXHR, textStatus, errorThrown) {\n\t\t\t\t\tdoing_check_licence = false;\n\t\t\t\t\t$('.wpmdb-licence-error-notice').fadeOut(fade_duration, function () {\n\t\t\t\t\t\t$('.wpmdb-licence-error-notice').empty().html(wpmdb_update_strings.license_check_problem + check_again_link).fadeIn(fade_duration);\n\t\t\t\t\t});\n\t\t\t\t},\n\t\t\t\tsuccess: function success(data) {\n\t\t\t\t\tdoing_check_licence = false;\n\t\t\t\t\tif ('undefined' !== typeof data.errors) {\n\t\t\t\t\t\tvar msg = '';\n\t\t\t\t\t\tfor (var key in data.errors) {\n\t\t\t\t\t\t\tmsg += data.errors[key];\n\t\t\t\t\t\t}\n\t\t\t\t\t\t$('.wpmdb-licence-error-notice').fadeOut(fade_duration, function () {\n\t\t\t\t\t\t\t$('.check-licence-spinner').remove();\n\t\t\t\t\t\t\t$('.wpmdb-licence-error-notice').empty().html(msg).fadeIn(fade_duration);\n\t\t\t\t\t\t});\n\t\t\t\t\t} else {\n\n\t\t\t\t\t\t// Success\n\t\t\t\t\t\t// Fade out, empty wpmdb custom error content, swap back in the original wordpress upgrade message, fade in\n\t\t\t\t\t\t$('.wpmdbpro-custom-visible').fadeOut(fade_duration, function () {\n\t\t\t\t\t\t\t$('.check-licence-spinner').remove();\n\t\t\t\t\t\t\t$('.wpmdbpro-custom-visible').empty().html($('.wpmdb-original-update-row').html()).fadeIn(fade_duration);\n\t\t\t\t\t\t});\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t});\n\t\t});\n\n\t\t$('.wpmdbpro-custom').prev().addClass('wpmdbpro-has-message');\n\t});\n})(jQuery);//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvd3AtbWlncmF0ZS1kYi1wcm8vYXNzZXQvc3JjL2pzL3BsdWdpbi11cGRhdGUuanM/ODNjMSJdLCJuYW1lcyI6WyIkIiwiZG9pbmdfY2hlY2tfbGljZW5jZSIsImZhZGVfZHVyYXRpb24iLCJhZG1pbl91cmwiLCJhamF4dXJsIiwicmVwbGFjZSIsInNwaW5uZXJfdXJsIiwic3Bpbm5lciIsIndpbmRvdyIsImRldmljZVBpeGVsUmF0aW8iLCJkb2N1bWVudCIsInJlYWR5Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJibHVyIiwiaGlkZSIsImluc2VydEFmdGVyIiwiY2hlY2tfYWdhaW5fbGluayIsIndwbWRiX3VwZGF0ZV9zdHJpbmdzIiwiY2hlY2tfbGljZW5zZV9hZ2FpbiIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZGF0YVR5cGUiLCJjYWNoZSIsImRhdGEiLCJhY3Rpb24iLCJub25jZSIsIndwbWRiX25vbmNlcyIsImNoZWNrX2xpY2VuY2UiLCJjb250ZXh0IiwiZXJyb3IiLCJqcVhIUiIsInRleHRTdGF0dXMiLCJlcnJvclRocm93biIsImZhZGVPdXQiLCJlbXB0eSIsImh0bWwiLCJsaWNlbnNlX2NoZWNrX3Byb2JsZW0iLCJmYWRlSW4iLCJzdWNjZXNzIiwiZXJyb3JzIiwibXNnIiwia2V5IiwicmVtb3ZlIiwicHJldiIsImFkZENsYXNzIiwialF1ZXJ5Il0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBVUEsQ0FBVixFQUFjOztBQUVkLEtBQUlDLHNCQUFzQixLQUExQjtBQUNBLEtBQUlDLGdCQUFnQixHQUFwQjs7QUFFQSxLQUFJQyxZQUFZQyxRQUFRQyxPQUFSLENBQWlCLGlCQUFqQixFQUFvQyxFQUFwQyxDQUFoQjtBQUNBLEtBQUlDLGNBQWNILFlBQVksaUJBQTlCO0FBQ0EsS0FBSUksT0FBSjtBQUNBLEtBQUssSUFBSUMsT0FBT0MsZ0JBQWhCLEVBQW1DO0FBQ2xDSCxpQkFBZSxLQUFmO0FBQ0E7QUFDREEsZ0JBQWUsTUFBZjtBQUNBQyxXQUFVUCxFQUFHLGVBQWVNLFdBQWYsR0FBNkIsMkNBQWhDLENBQVY7O0FBRUFOLEdBQUdVLFFBQUgsRUFBY0MsS0FBZCxDQUFxQixZQUFXOztBQUUvQlgsSUFBRyxNQUFILEVBQVlZLEVBQVosQ0FBZ0IsT0FBaEIsRUFBeUIseUJBQXpCLEVBQW9ELFVBQVVDLENBQVYsRUFBYztBQUNqRUEsS0FBRUMsY0FBRjtBQUNBZCxLQUFHLElBQUgsRUFBVWUsSUFBVjs7QUFFQSxPQUFLZCxtQkFBTCxFQUEyQjtBQUMxQixXQUFPLEtBQVA7QUFDQTs7QUFFREEseUJBQXNCLElBQXRCOztBQUVBRCxLQUFHLElBQUgsRUFBVWdCLElBQVY7QUFDQVQsV0FBUVUsV0FBUixDQUFxQixJQUFyQjs7QUFFQSxPQUFJQyxtQkFBbUIsaURBQWlEQyxxQkFBcUJDLG1CQUF0RSxHQUE0RixNQUFuSDs7QUFFQXBCLEtBQUVxQixJQUFGLENBQVE7QUFDUEMsU0FBS2xCLE9BREU7QUFFUG1CLFVBQU0sTUFGQztBQUdQQyxjQUFVLE1BSEg7QUFJUEMsV0FBTyxLQUpBO0FBS1BDLFVBQU07QUFDTEMsYUFBUSxxQkFESDtBQUVMQyxZQUFPQyxhQUFhQyxhQUZmO0FBR0xDLGNBQVM7QUFISixLQUxDO0FBVVBDLFdBQU8sZUFBVUMsS0FBVixFQUFpQkMsVUFBakIsRUFBNkJDLFdBQTdCLEVBQTJDO0FBQ2pEbEMsMkJBQXNCLEtBQXRCO0FBQ0FELE9BQUcsNkJBQUgsRUFBbUNvQyxPQUFuQyxDQUE0Q2xDLGFBQTVDLEVBQTJELFlBQVc7QUFDckVGLFFBQUcsNkJBQUgsRUFBbUNxQyxLQUFuQyxHQUNFQyxJQURGLENBQ1FuQixxQkFBcUJvQixxQkFBckIsR0FBNkNyQixnQkFEckQsRUFFRXNCLE1BRkYsQ0FFVXRDLGFBRlY7QUFHQSxNQUpEO0FBS0EsS0FqQk07QUFrQlB1QyxhQUFTLGlCQUFVZixJQUFWLEVBQWlCO0FBQ3pCekIsMkJBQXNCLEtBQXRCO0FBQ0EsU0FBSyxnQkFBZ0IsT0FBT3lCLEtBQUtnQixNQUFqQyxFQUEwQztBQUN6QyxVQUFJQyxNQUFNLEVBQVY7QUFDQSxXQUFNLElBQUlDLEdBQVYsSUFBaUJsQixLQUFLZ0IsTUFBdEIsRUFBK0I7QUFDOUJDLGNBQU9qQixLQUFLZ0IsTUFBTCxDQUFhRSxHQUFiLENBQVA7QUFDQTtBQUNENUMsUUFBRyw2QkFBSCxFQUFtQ29DLE9BQW5DLENBQTRDbEMsYUFBNUMsRUFBMkQsWUFBVztBQUNyRUYsU0FBRyx3QkFBSCxFQUE4QjZDLE1BQTlCO0FBQ0E3QyxTQUFHLDZCQUFILEVBQW1DcUMsS0FBbkMsR0FDRUMsSUFERixDQUNRSyxHQURSLEVBRUVILE1BRkYsQ0FFVXRDLGFBRlY7QUFHQSxPQUxEO0FBTUEsTUFYRCxNQVdPOztBQUVOO0FBQ0E7QUFDQUYsUUFBRywwQkFBSCxFQUFnQ29DLE9BQWhDLENBQXlDbEMsYUFBekMsRUFBd0QsWUFBVztBQUNsRUYsU0FBRyx3QkFBSCxFQUE4QjZDLE1BQTlCO0FBQ0E3QyxTQUFHLDBCQUFILEVBQWdDcUMsS0FBaEMsR0FDRUMsSUFERixDQUNRdEMsRUFBRyw0QkFBSCxFQUFrQ3NDLElBQWxDLEVBRFIsRUFFRUUsTUFGRixDQUVVdEMsYUFGVjtBQUdBLE9BTEQ7QUFNQTtBQUNEO0FBMUNNLElBQVI7QUE2Q0EsR0E1REQ7O0FBOERBRixJQUFHLGtCQUFILEVBQXdCOEMsSUFBeEIsR0FBK0JDLFFBQS9CLENBQXlDLHNCQUF6QztBQUVBLEVBbEVEO0FBbUVBLENBakZELEVBaUZJQyxNQWpGSiIsImZpbGUiOiIxNjEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oICQgKSB7XG5cblx0dmFyIGRvaW5nX2NoZWNrX2xpY2VuY2UgPSBmYWxzZTtcblx0dmFyIGZhZGVfZHVyYXRpb24gPSA2NTA7XG5cblx0dmFyIGFkbWluX3VybCA9IGFqYXh1cmwucmVwbGFjZSggJy9hZG1pbi1hamF4LnBocCcsICcnICk7XG5cdHZhciBzcGlubmVyX3VybCA9IGFkbWluX3VybCArICcvaW1hZ2VzL3NwaW5uZXInO1xuXHR2YXIgc3Bpbm5lcjtcblx0aWYgKCAyIDwgd2luZG93LmRldmljZVBpeGVsUmF0aW8gKSB7XG5cdFx0c3Bpbm5lcl91cmwgKz0gJy0yeCc7XG5cdH1cblx0c3Bpbm5lcl91cmwgKz0gJy5naWYnO1xuXHRzcGlubmVyID0gJCggJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwiY2hlY2stbGljZW5jZS1zcGlubmVyXCIgLz4nICk7XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5jaGVjay1teS1saWNlbmNlLWFnYWluJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCB0aGlzICkuYmx1cigpO1xuXG5cdFx0XHRpZiAoIGRvaW5nX2NoZWNrX2xpY2VuY2UgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0ZG9pbmdfY2hlY2tfbGljZW5jZSA9IHRydWU7XG5cblx0XHRcdCQoIHRoaXMgKS5oaWRlKCk7XG5cdFx0XHRzcGlubmVyLmluc2VydEFmdGVyKCB0aGlzICk7XG5cblx0XHRcdHZhciBjaGVja19hZ2Fpbl9saW5rID0gJyA8YSBjbGFzcz1cImNoZWNrLW15LWxpY2VuY2UtYWdhaW5cIiBocmVmPVwiI1wiPicgKyB3cG1kYl91cGRhdGVfc3RyaW5ncy5jaGVja19saWNlbnNlX2FnYWluICsgJzwvYT4nO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2NoZWNrX2xpY2VuY2UnLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9ub25jZXMuY2hlY2tfbGljZW5jZSxcblx0XHRcdFx0XHRjb250ZXh0OiAndXBkYXRlJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRkb2luZ19jaGVja19saWNlbmNlID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy53cG1kYi1saWNlbmNlLWVycm9yLW5vdGljZScgKS5mYWRlT3V0KCBmYWRlX2R1cmF0aW9uLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoICcud3BtZGItbGljZW5jZS1lcnJvci1ub3RpY2UnICkuZW1wdHkoKVxuXHRcdFx0XHRcdFx0XHQuaHRtbCggd3BtZGJfdXBkYXRlX3N0cmluZ3MubGljZW5zZV9jaGVja19wcm9ibGVtICsgY2hlY2tfYWdhaW5fbGluayApXG5cdFx0XHRcdFx0XHRcdC5mYWRlSW4oIGZhZGVfZHVyYXRpb24gKTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdGRvaW5nX2NoZWNrX2xpY2VuY2UgPSBmYWxzZTtcblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS5lcnJvcnMgKSB7XG5cdFx0XHRcdFx0XHR2YXIgbXNnID0gJyc7XG5cdFx0XHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGRhdGEuZXJyb3JzICkge1xuXHRcdFx0XHRcdFx0XHRtc2cgKz0gZGF0YS5lcnJvcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy53cG1kYi1saWNlbmNlLWVycm9yLW5vdGljZScgKS5mYWRlT3V0KCBmYWRlX2R1cmF0aW9uLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JCggJy5jaGVjay1saWNlbmNlLXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdCQoICcud3BtZGItbGljZW5jZS1lcnJvci1ub3RpY2UnICkuZW1wdHkoKVxuXHRcdFx0XHRcdFx0XHRcdC5odG1sKCBtc2cgKVxuXHRcdFx0XHRcdFx0XHRcdC5mYWRlSW4oIGZhZGVfZHVyYXRpb24gKTtcblx0XHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0XHQvLyBTdWNjZXNzXG5cdFx0XHRcdFx0XHQvLyBGYWRlIG91dCwgZW1wdHkgd3BtZGIgY3VzdG9tIGVycm9yIGNvbnRlbnQsIHN3YXAgYmFjayBpbiB0aGUgb3JpZ2luYWwgd29yZHByZXNzIHVwZ3JhZGUgbWVzc2FnZSwgZmFkZSBpblxuXHRcdFx0XHRcdFx0JCggJy53cG1kYnByby1jdXN0b20tdmlzaWJsZScgKS5mYWRlT3V0KCBmYWRlX2R1cmF0aW9uLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JCggJy5jaGVjay1saWNlbmNlLXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdCQoICcud3BtZGJwcm8tY3VzdG9tLXZpc2libGUnICkuZW1wdHkoKVxuXHRcdFx0XHRcdFx0XHRcdC5odG1sKCAkKCAnLndwbWRiLW9yaWdpbmFsLXVwZGF0ZS1yb3cnICkuaHRtbCgpIClcblx0XHRcdFx0XHRcdFx0XHQuZmFkZUluKCBmYWRlX2R1cmF0aW9uICk7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHQkKCAnLndwbWRicHJvLWN1c3RvbScgKS5wcmV2KCkuYWRkQ2xhc3MoICd3cG1kYnByby1oYXMtbWVzc2FnZScgKTtcblxuXHR9ICk7XG59KSggalF1ZXJ5ICk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvd3AtbWlncmF0ZS1kYi1wcm8vYXNzZXQvc3JjL2pzL3BsdWdpbi11cGRhdGUuanMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///161\n");

/***/ })

/******/ });