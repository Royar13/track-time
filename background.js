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

chrome.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === "saveCurrentSession") {
		updateCurrentSessionDuration();
	}
});

chrome.alarms.create("saveCurrentSession", {
	delayInMinutes: 1,
	periodInMinutes: 1
});

openDB();

//temp fix for first tab not firing activated event
chrome.tabs.query({ active: true }, (tabs) => {
	activeTabId = tabs[0].id;
	tabActivatedTime = Date.now();
});