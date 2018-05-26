$(document).ready(function() {

	$("a").click(function(event) {
		alert("Thanks for visiting!");
	})


	$.getJson("data/daines.geojson")

	
	$(".wsaList")
});