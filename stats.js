$(document).ready(() => {
	sessions = [];
	chrome.storage.local.get("sessions", (data) => {
		if (data.sessions) {
			sessions = data.sessions;
		}
		for (i in sessions) {
			div = $("<div>").html(`url: ${sessions[i].url}<br>duration: ${sessions[i].duration}<br><br>`);
			$("#sessions").append(div);
		}
	});
});