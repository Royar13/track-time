class Session {
	constructor(tabId, url) {
		this.tabId = tabId;
		this.url = url;
		this.duration = 0;
		this.paused = false;
		this.startTime = Date.now();
		this.currentTime = this.startTime;
	}

	resume() {
		if (this.paused) {
			this.paused = false;
			this.currentTime = Date.now();
		}
	}

	pause() {
		if (!this.paused) {
			this.duration += Math.round((Date.now() - this.currentTime) / 1000);
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
	index = activeSessions.indexOf(session);
	activeSessions.splice(index, 1);
}

function save() {
	chrome.storage.local.set({ "sessions": sessions });
}

function isMonitoredUrl(urlStr) {
	let url = new URL(urlStr);
	return monitoredUrls.some(h => url.host.endsWith(h));
}

let activeTabId = -1;
let changed = false;
let monitoredUrls = ["youtube.com"]
let sessions = [];
chrome.storage.local.get("sessions", (data) => {
	if (data.sessions) {
		sessions = data.sessions;
	}
});
let activeSessions = [];

setInterval(save, 3000);

chrome.tabs.onActivated.addListener((activeInfo) => {
	let prevSession = activeSessions.find(s => s.tabId === activeTabId);
	if (prevSession) {
		prevSession.pause();
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
		session.pause();
	}
});