$(document).ready(() => {
	$("#openStats").on("click", () => {
		chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
	})
});