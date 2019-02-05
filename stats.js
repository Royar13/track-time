let db;

$(document).ready(() => {
	openDB();

});

function openDB() {
	let request = indexedDB.open("TrackTime", 2);
	request.onsuccess = (e) => {
		db = e.target.result;
		initialize();
	};
}

function initialize() {
	let objectStore = db.transaction("sessions", "readonly").objectStore("sessions");
	let request = objectStore.getAll();

	request.onsuccess = (event) => {
		// Get the old value that we want to update
		let sessions = event.target.result;
		for (i in sessions) {
			div = $("<div>").html(`id: ${sessions[i].id}<br>url: ${sessions[i].url}<br>duration: ${sessions[i].duration}<br><br>`);
			$("#sessions").append(div);
		}
	};
}