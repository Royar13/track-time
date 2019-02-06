let activeTabId = -1;
let tabActivatedTime = 0;
let changed = false;
let monitoredUrls = ["youtube.com", "9gag.com", "facebook.com", "sport5.co.il", "chess.com", "lichess.org", "twitch.tv"];
let sessions = [];
chrome.storage.local.get("sessions", (data) => {
	if (data.sessions) {
		sessions = data.sessions;
	}
});
let activeSessions = [];
let db;

chrome.tabs.onActivated.addListener((activeInfo) => {
	updateCurrentSessionDuration();

	activeTabId = activeInfo.tabId;
	tabActivatedTime = Date.now();

	if (!activeSessions.some(s => s.tabId === activeTabId)) {
		chrome.tabs.query({ active: true }, (tabs) => {
			if (tabs.length >= 1 && isMonitoredUrl(tabs[0].url)) {
				createSession(activeTabId, tabs[0].url);
			}
		});
	}
});

// chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
chrome.webNavigation.onCompleted.addListener((e) => {
	if (e.frameId !== 0 || e.tabId !== activeTabId) {
		return;
	}
	let urlStr = e.url;
	let url = new URL(urlStr);
	session = activeSessions.find(s => s.tabId === activeTabId);

	if (isMonitoredUrl(urlStr)) {
		if (session) {
			previousUrl = new URL(session.url);
			if (previousUrl.host !== url.host) {
				updateCurrentSessionDuration();
				endSession(session);
				createSession(activeTabId, urlStr);
			}
		}
		else {
			createSession(activeTabId, urlStr);
		}
	}
	else if (session) {
		updateCurrentSessionDuration();
		endSession(session);
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	let session = activeSessions.find(s => s.tabId === tabId);
	if (session) {
		if (tabId === activeTabId) {
			updateCurrentSessionDuration();
		}
		endSession(session);
	}
});

openDB();

setInterval(updateCurrentSessionDuration, 60000);

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