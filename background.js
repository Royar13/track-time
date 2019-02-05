let activeTabId = -1;
let changed = false;
let monitoredUrls = ["youtube.com"];
let sessions = [];
chrome.storage.local.get("sessions", (data) => {
	if (data.sessions) {
		sessions = data.sessions;
	}
});
let activeSessions = [];
let db;

chrome.tabs.onActivated.addListener((activeInfo) => {
	let prevSession = activeSessions.find(s => s.tabId === activeTabId);
	if (prevSession) {
		prevSession.pause();
		saveSession(prevSession);
	}
	activeTabId = activeInfo.tabId;
	let currentSession = activeSessions.find(s => s.tabId === activeTabId);
	if (currentSession) {
		currentSession.resume();
	}
	else {
		chrome.tabs.query({ active: true }, (tabs) => {
			if (tabs.length >= 1 && isMonitoredUrl(tabs[0].url)) {
				createSession(activeTabId, tabs[0].url);
			}
		});
	}
});

// chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
chrome.webNavigation.onCompleted.addListener((e) => {
	let urlStr = e.url;
	let tabId = e.tabId;
	let url = new URL(urlStr);
	session = activeSessions.find(s => s.tabId === tabId);

	if (isMonitoredUrl(urlStr)) {
		if (session) {
			previousUrl = new URL(session.url);
			if (previousUrl.host !== url.host) {
				session.pause();
				createSession(tabId, urlStr);
			}
			else {
				session.resume();
			}
		}
		else {
			createSession(tabId, urlStr);
		}
	}
	else {
		if (session) {
			session.pause();
		}
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	let session = activeSessions.find(s => s.tabId === tabId);
	if (session) {
		endSession(session);
	}
});

openDB();

setInterval(saveCurrentTab, 60000);

class Session {
	constructor(tabId, url) {
		this.tabId = tabId;
		this.url = url;
		this.duration = 0;
		this.paused = false;
		this.startTime = Date.now();
		this.currentTime = this.startTime;
	}

	updateDuration() {
		if (!this.paused) {
			this.duration += Math.round((Date.now() - this.currentTime) / 1000);
			this.currentTime = Date.now();
		}
	}

	resume() {
		if (this.paused) {
			this.paused = false;
			this.currentTime = Date.now();
		}
	}

	pause() {
		if (!this.paused) {
			this.updateDuration();
			this.paused = true;
		}
	}
}

function createSession(tabId, url) {
	newSession = new Session(tabId, url);
	activeSessions.push(newSession);
	sessions.push(newSession);
}

function endSession(session) {
	session.pause();
	saveSession(session);
	index = activeSessions.indexOf(session);
	activeSessions.splice(index, 1);
}

function saveCurrentTab() {
	let session = activeSessions.find(s => s.tabId === activeTabId);
	if (session) {
		session.updateDuration();
		saveSession(session);
	}
}

function isMonitoredUrl(urlStr) {
	let url = new URL(urlStr);
	return monitoredUrls.some(h => url.host.endsWith(h));
}

function openDB() {
	let request = indexedDB.open("TrackTime", 2);

	request.onsuccess = (e) => {
		db = e.target.result;
	};

	request.onerror = (e) => {
		throw new Error("Database error: " + event.target.errorCode);
	};

	request.onupgradeneeded = (e) => {
		let db = event.target.result;
		if (!db.objectStoreNames.contains("sessions")) {
			let objectStore = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
			objectStore.createIndex("startTime", "startTime", { unique: false });
		}
	};
}

function saveSession(session) {
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
}