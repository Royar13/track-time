let activeTabId = -1;
let tabActivatedTime = 0;
let monitoredUrls = ["youtube.com", "9gag.com", "facebook.com", "sport5.co.il", "chess.com", "lichess.org", "twitch.tv"];
let sessions = [];
let activeSessions = [];
let dbPromise;

class Session {
	constructor(tabId, url) {
		this.tabId = tabId;
		this.url = url;
		this.duration = 0;
		this.startTime = Date.now();
	}

	increaseDuration(val) {
		this.duration += val;
	}
}

function createSession(tabId, url) {
	newSession = new Session(tabId, url);
	activeSessions.push(newSession);
	sessions.push(newSession);
}

function endSession(session) {
	index = activeSessions.indexOf(session);
	activeSessions.splice(index, 1);
}

function calculateDuration() {
	return Math.round((Date.now() - tabActivatedTime) / 1000);
}

function updateCurrentSessionDuration() {
	let session = activeSessions.find(s => s.tabId === activeTabId);
	if (session) {
		session.increaseDuration(calculateDuration());
		saveSession(session);
	}
}

function isMonitoredUrl(urlStr) {
	let url = new URL(urlStr);
	return monitoredUrls.some(h => url.host.endsWith(h));
}

function openDB() {
	dbPromise = new Promise((resolve, reject) => {
		let request = indexedDB.open("TrackTime", 2);

		request.onsuccess = (e) => {
			resolve(e.target.result);
		};

		request.onerror = (e) => {
			reject("Database error: " + e.target.errorCode);
		};

		request.onupgradeneeded = (e) => {
			let db = e.target.result;
			if (!db.objectStoreNames.contains("sessions")) {
				let objectStore = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
				objectStore.createIndex("startTime", "startTime", { unique: false });
			}
		};
	});
	return dbPromise;
}

function saveSession(session) {
	dbPromise.then((db) => {
		let tx = db.transaction("sessions", "readwrite");
		let store = tx.objectStore("sessions");
		if (session.id) {
			//already inserted
			store.put(session);
		}
		else {
			let request = store.add(session);

			request.onsuccess = (e) => {
				session.id = e.target.result;
			};
		}
	});
}