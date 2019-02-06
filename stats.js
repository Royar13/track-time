let db;
let colors;

$(document).ready(() => {
	openDB().then((result) => {
		db = result;
		initialize();
	});
});

function initialize() {
	let objectStore = db.transaction("sessions", "readonly").objectStore("sessions");
	let request = objectStore.getAll();

	request.onsuccess = (event) => {
		let sessions = event.target.result;
		//TODO: for testing only, remove later
		for (i = 0; i < 20; i++) {
			sessions[i].startTime -= 10 * 3600 * 1000;
		}
		colors = ["33, 97, 198", "209, 14, 24", "33, 163, 27", "220, 210, 9", "182, 15, 93", "20, 167, 187", "233, 161, 8"];
		generateTimePerDayChart(sessions);
		generateTodayWebsitesBars(sessions);
		generateWebsitesPieChart(sessions);
		generateSessions(sessions);
	};
}

function generateSessions(sessions) {
	let todayTime = moment().startOf("day").unix();
	let todaySessions = sessions.filter(s => s.startTime >= todayTime);
	let max = -1;
	for (i = todaySessions.length - 1; i >= Math.max(todaySessions.length - 10, 0); i--) {
		max = Math.max(max, todaySessions[i].duration);
	}
	for (i = todaySessions.length - 1; i >= Math.max(todaySessions.length - 10, 0); i--) {
		let session = todaySessions[i];
		let startTime = moment(session.startTime).format("HH:mm");
		let duration = session.duration;
		let scale = 0.7 + duration / max * 0.3;
		let durationStr = "seconds";
		if (duration >= 3600) {
			duration = Math.round(duration / 3600 * 10) / 10;
			durationStr = "hours";
		}
		else if (duration >= 60) {
			duration = Math.round(duration / 60);
			durationStr = "minutes";
		}
		let url = new URL(session.url);
		let siteIndex = monitoredUrls.findIndex(u => url.host.endsWith(u));
		let div = $("<div>").addClass("session")
			.html(`<h3 style="color: rgba(${colors[siteIndex]},0.7)">${session.url}</h3>Start: <b>${startTime}</b><br>Duration: <b>${duration} ${durationStr}</b>`)
			.css({ transform: "scale(" + scale + ")" });
		let sid = $("<div>").addClass("sid").text("#" + session.id).appendTo(div);
		$("#sessionsContainer").append(div);
	}
}

function generateTodayWebsitesBars(sessions) {
	let todayTime = moment().startOf("day").unix();
	let todaySessions = sessions.filter(s => s.startTime >= todayTime);
	let data = aggregateDataByWebsite(todaySessions);

	let ctx = document.getElementById("todayWebsitesBars").getContext('2d');
	let barChart = new Chart(ctx, {
		type: "bar",
		data: {
			datasets: [{
				label: "Time wasted today",
				data: data,
				backgroundColor: colors.map(c => "rgb(" + c + ")")
			}],
			labels: monitoredUrls
		},
		options: {
			responsive: false,
			title: {
				display: true,
				text: "Today's surfed websites"
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: "Time (minutes)"
					}
				}]
			}
		}
	});
}

function generateWebsitesPieChart(sessions) {
	let data = aggregateDataByWebsite(sessions);

	let ctx = document.getElementById("websitesPieChart").getContext('2d');
	let doughnutChart = new Chart(ctx, {
		type: "doughnut",
		data: {
			datasets: [{
				data: data,
				backgroundColor: colors.map(c => "rgb(" + c + ")")
			}],
			labels: monitoredUrls
		},
		options: {
			responsive: false,
			title: {
				display: true,
				text: "Website distribution"
			}
		}
	});
}

function randColor() {
	function randNum() {
		return Math.round(Math.random() * 255);
	}

	return "rgb(" + randNum() + "," + randNum() + "," + randNum() + ")";
}

function generateTimePerDayChart(sessions) {
	let data = aggregateDataByDay(sessions);

	let ctx = document.getElementById("timePerDay").getContext('2d');
	let labels = data.map((t, i) => i + 1);
	let lineChart = new Chart(ctx, {
		type: "line",
		data: {
			labels: labels,
			datasets: [{
				label: "Time by day",
				borderColor: "rgb(44, 108, 211)",
				data: data
			}]
		},
		options: {
			responsive: false,
			title: {
				display: true,
				text: "Time wasted per day"
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: "Time (minutes)"
					}
				}]
			},
			elements: {
				line: {
					tension: 0, // disables bezier curves
				}
			}
		}
	});
}

function aggregateDataByDay(sessions) {
	let data = [0];
	prevDate = moment(sessions[0].startTime);
	currentDay = 0;
	sessions.forEach((session) => {
		diff = moment(session.startTime).startOf("day").diff(prevDate.startOf("day"), "days");
		for (j = 0; j < diff; j++) {
			currentDay++;
			data[currentDay] = 0;
		}
		data[currentDay] += session.duration / 60;
		prevDate = moment(session.startTime);
	});
	data = data.map(t => Math.ceil(t));
	return data;
}

function aggregateDataByWebsite(sessions) {
	let data = [];
	for (i in monitoredUrls) {
		data.push(0);
	}
	sessions.forEach((session) => {
		for (j = 0; j < monitoredUrls.length; j++) {
			let url = new URL(session.url);
			if (url.host.endsWith(monitoredUrls[j])) {
				data[j] += session.duration / 60;
				break;
			}
		}
	});
	return data;
}