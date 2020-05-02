/*
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function(b,c){var $=b.jQuery||b.Cowboy||(b.Cowboy={}),a;$.throttle=a=function(e,f,j,i){var h,d=0;if(typeof f!=="boolean"){i=j;j=f;f=c}function g(){var o=this,m=+new Date()-d,n=arguments;function l(){d=+new Date();j.apply(o,n)}function k(){h=c}if(i&&!h){l()}h&&clearTimeout(h);if(i===c&&m>e){l()}else{if(f!==true){h=setTimeout(i?k:l,i===c?e-m:e)}}}if($.guid){g.guid=j.guid=j.guid||$.guid++}return g};$.debounce=function(d,e,f){return f===c?a(d,e,false):a(d,f,e!==false)}})(this);

/**
 * Create websocket client when it's either provided as a GET IP param or stored in localStorage
 */

var urlParams = new URLSearchParams(window.location.search);
var ip = window.location.host;
window.socket =  socket = new WebSocket("ws://"+ip+":8000");
socket.onopen = function(e) {
	console.log("Websocket opened to ws://"+ip+":8000");
};

socket.onmessage = function(result) {
	console.log("Websocket message received!", JSON.parse(result.data));
}


$(document).ready(function(){

	var pathname = window.location.pathname;
	console.log('pathname: ', pathname);
	$('a.nav-link[href="' + pathname + '"]').addClass('active');


	$('[data-bs-chart]').each(function(index, elem) {
		this.chart = new Chart($(elem), $(elem).data('bs-chart'));
	});
	setTimeout(getStats, 500);
});

function getStats() {
	console.log("Get stats. status: ", socket.readyState);
	if(socket.readyState == WebSocket.OPEN){
		console.log("Socket is open, sending getstats");
		socket.send('getstats', function(response) {
			console.log("Getstats response!", JSON.parse(response.data));
		});
	} else {
		setTimeout(getStats, 500);
	}
}
