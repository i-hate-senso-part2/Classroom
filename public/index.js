"use strict";

const SEARCH_ENGINES = Object.freeze({
	google: {
		label: "Google",
		url: "https://www.google.com/search?q=%s",
		logo: "/logos/google.webp",
	},
	duckduckgo: {
		label: "DuckDuckGo",
		url: "https://duckduckgo.com/?q=%s",
		logo: "/logos/duckduckgo.png",
	},
	brave: {
		label: "Brave",
		url: "https://search.brave.com/search?q=%s",
		logo: "/logos/brave.png",
	},
});

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const tabList = document.getElementById("tab-list");
const frameHost = document.getElementById("frame-host");
const homeScreen = document.getElementById("home-screen");
const progress = document.getElementById("browser-progress");
const quickLinks = document.getElementById("quick-links");
const cloakMenu = document.getElementById("cloak-menu");
const cloakButton = document.getElementById("cloak-open");
const adminDialog = document.getElementById("admin-dialog");
const blockedOverlay = document.getElementById("blocked-overlay");
const picker = document.querySelector(".engine-picker");
const trigger = document.querySelector(".engine-trigger");
const menu = document.querySelector(".engine-menu");
const tabs = [];
const defaultLinks = [
	{
		label: "Google",
		url: "https://www.google.com/",
		logo: "/logos/google.webp",
	},
	{
		label: "YouTube",
		url: "https://www.youtube.com/",
		logo: "/logos/youtube.webp",
	},
	{
		label: "GeForce NOW",
		url: "https://play.geforcenow.com/",
		logo: "/logos/geforce.png",
	},
	{
		label: "TikTok",
		url: "https://www.tiktok.com/",
		logo: "/logos/tiktok.png",
	},
];
const cloakTemplates = [
	{ id: "normal", title: "", logo: "/sj.png" },
	{ id: "google", title: "Google", logo: "/logos/google.webp" },
	{ id: "youtube", title: "YouTube", logo: "/logos/youtube.webp" },
	{ id: "geforce", title: "GeForce NOW", logo: "/logos/geforce.png" },
	{ id: "tiktok", title: "TikTok", logo: "/logos/tiktok.png" },
];
let activeTabId = null;
let tabSequence = 0;
let transportReady;
let bookmarks = [];
let arrowSequenceIndex = 0;
const arrowSequence = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowDown"];

try {
	bookmarks = JSON.parse(localStorage.getItem("classroom-bookmarks") || "[]");
	if (!Array.isArray(bookmarks)) bookmarks = [];
} catch {
	bookmarks = [];
}

function logoMarkup(key) {
	return `<span class="engine-icon" aria-hidden="true"><img src="${SEARCH_ENGINES[key].logo}" alt="" /></span>`;
}

function renderMenu() {
	if (!menu) return;

	menu.innerHTML = Object.entries(SEARCH_ENGINES)
		.map(
			([key, engine]) => `
				<button
					type="button"
					class="engine-option"
					data-engine="${key}"
					role="menuitemradio"
					aria-checked="false"
				>
					${logoMarkup(key)}
					<span>${engine.label}</span>
				</button>
			`
		)
		.join("");
}

function setSearchEngine(engineKey) {
	const normalizedKey = SEARCH_ENGINES[engineKey] ? engineKey : "google";
	const engine = SEARCH_ENGINES[normalizedKey];
	searchEngine.value = engine.url;

	if (trigger) {
		trigger.dataset.engine = normalizedKey;
		trigger.setAttribute("aria-label", `Use ${engine.label} search`);
		trigger.setAttribute("title", engine.label);
		trigger.innerHTML = logoMarkup(normalizedKey);
		trigger.classList.add("active");
	}

	const menuButtons = document.querySelectorAll(".engine-option");
	menuButtons.forEach((button) => {
		const isActive = button.dataset.engine === normalizedKey;
		button.classList.toggle("active", isActive);
		button.setAttribute("aria-checked", String(isActive));
	});
}

function togglePicker(forceOpen) {
	if (!picker) return;
	const nextState =
		typeof forceOpen === "boolean"
			? forceOpen
			: !picker.classList.contains("open");
	picker.classList.toggle("open", nextState);
	if (trigger) trigger.setAttribute("aria-expanded", String(nextState));
}

if (trigger) {
	trigger.addEventListener("click", (event) => {
		event.stopPropagation();
		togglePicker();
	});
}

if (menu) {
	menu.addEventListener("click", (event) => {
		const option = event.target.closest(".engine-option");
		if (!option) return;
		setSearchEngine(option.dataset.engine);
		togglePicker(false);
	});
}

document.addEventListener("click", (event) => {
	if (picker && !picker.contains(event.target)) {
		togglePicker(false);
	}
});

function activeTab() {
	return tabs.find((tab) => tab.id === activeTabId);
}

function renderTabs() {
	tabList.replaceChildren();
	for (const tab of tabs) {
		const item = document.createElement("div");
		item.className = `tab-item${tab.id === activeTabId ? " active" : ""}`;
		item.dataset.tabId = tab.id;
		const select = document.createElement("button");
		select.type = "button";
		select.className = "tab-select";
		select.setAttribute("role", "tab");
		select.setAttribute("aria-selected", String(tab.id === activeTabId));
		const template = cloakTemplates.find((item) => item.id === tab.cloak);
		const displayTitle = template?.title || tab.title;
		select.title = displayTitle;
		select.innerHTML = `<span class="tab-favicon" aria-hidden="true"><img src="${template?.logo || "/sj.png"}" alt="" /></span>`;
		const title = document.createElement("span");
		title.className = "tab-title";
		title.textContent = displayTitle;
		select.append(title);
		const close = document.createElement("button");
		close.type = "button";
		close.className = "tab-close";
		close.dataset.closeTab = tab.id;
		close.setAttribute("aria-label", `Close ${displayTitle}`);
		close.title = "Close tab";
		close.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`;
		item.append(select, close);
		tabList.append(item);
	}
}

function syncBrowser() {
	const tab = activeTab();
	if (!tab) return;
	progress.classList.toggle("loading", tab.loading);
	for (const current of tabs) {
		if (current.frame)
			current.frame.frame.hidden = current.id !== activeTabId || current.home;
	}
	homeScreen.hidden = !tab.home;
	address.value = tab.home ? "" : tab.url;
	document.getElementById("go-back").disabled =
		!tab.frame || tab.historyIndex <= 0;
	document.getElementById("go-forward").disabled =
		!tab.frame || tab.historyIndex >= tab.history.length - 1;
	document.getElementById("reload-page").disabled = !tab.frame || tab.home;
	const saved = bookmarks.some(
		(bookmark) => bookmark.url === tab.url && !tab.home
	);
	const bookmarkButton = document.getElementById("save-bookmark");
	bookmarkButton.setAttribute("aria-pressed", String(saved));
	bookmarkButton.disabled = tab.home;
	const cloak = cloakTemplates.find((item) => item.id === tab.cloak);
	document.title = cloak?.title || (tab.home ? "New tab" : tab.title);
	document.getElementById("browser-favicon").href = cloak?.logo || "/sj.png";
	if (tab.frame) tab.frame.frame.title = cloak?.title || tab.title;
	renderTabs();
}

function renderCloakMenu() {
	cloakMenu.replaceChildren();
	for (const template of cloakTemplates) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "cloak-option";
		button.dataset.cloak = template.id;
		button.setAttribute("role", "menuitemradio");
		button.setAttribute("aria-checked", "false");
		button.innerHTML = `<span class="cloak-option-icon"><img src="${template.logo}" alt="" /></span><span>${template.title || "Original tab"}</span>`;
		cloakMenu.append(button);
	}
}

function setCloak(templateId) {
	const tab = activeTab();
	if (!tab) return;
	tab.cloak = templateId === "normal" ? null : templateId;
	const template = cloakTemplates.find((item) => item.id === tab.cloak);
	cloakMenu.querySelectorAll(".cloak-option").forEach((option) => {
		const selected = option.dataset.cloak === (template?.id || "normal");
		option.classList.toggle("active", selected);
		option.setAttribute("aria-checked", String(selected));
	});
	cloakMenu.hidden = true;
	cloakButton.setAttribute("aria-expanded", "false");
	syncBrowser();
}

function setTheme(theme) {
	document.documentElement.dataset.theme = theme;
	const dark = theme === "dark";
	const button = document.getElementById("theme-toggle");
	button.setAttribute(
		"aria-label",
		`Switch to ${dark ? "light" : "dark"} mode`
	);
	button.title = `Switch to ${dark ? "light" : "dark"} mode`;
	button.innerHTML = dark
		? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>`
		: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>`;
	try {
		localStorage.setItem("classroom-theme", theme);
	} catch {}
}

function openAdminDialog() {
	if (!adminDialog.open) adminDialog.showModal();
	refreshAdminPanel();
}

async function adminRequest(path, options = {}) {
	const response = await fetch(path, {
		...options,
		headers: { "content-type": "application/json", ...options.headers },
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok)
		throw new Error(result.error || "Administrator request failed.");
	return result;
}

async function refreshAdminPanel() {
	const form = document.getElementById("admin-login-form");
	const settings = document.getElementById("admin-settings");
	const message = document.getElementById("admin-message");
	try {
		const session = await adminRequest("/api/admin/session");
		if (!session.authenticated) {
			form.hidden = false;
			settings.hidden = true;
			message.textContent = session.enabled
				? "Sign in to manage browser settings."
				: "Admin is disabled until ADMIN_PASSWORD is set on the server.";
			return;
		}
		const result = await adminRequest("/api/admin/state");
		form.hidden = true;
		settings.hidden = false;
		document.getElementById("blocked-toggle").checked = result.blocked;
		message.textContent = "Administrator access verified.";
	} catch (err) {
		form.hidden = false;
		settings.hidden = true;
		message.textContent = err.message.includes("ADMIN_PASSWORD_HASH")
			? "Admin is disabled until a valid ADMIN_PASSWORD_HASH is set on the server."
			: "Sign in to manage browser settings.";
	}
}

async function refreshBlockedState() {
	try {
		const response = await fetch("/api/browser-state", { cache: "no-store" });
		if (response.ok) blockedOverlay.hidden = !(await response.json()).blocked;
	} catch {}
}

function showAdminMessage(message, isError = false) {
	const element = document.getElementById("admin-message");
	element.textContent = message;
	element.classList.toggle("error", isError);
}

function renderQuickLinks() {
	quickLinks.replaceChildren();
	const links = [
		...defaultLinks,
		...bookmarks.filter((bookmark) => bookmark && bookmark.url),
	];
	for (const link of links) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "quick-link";
		button.dataset.url = link.url;
		button.setAttribute("aria-label", `Open ${link.label || link.url}`);
		const mark = document.createElement("span");
		mark.className = "quick-link-mark";
		mark.setAttribute("aria-hidden", "true");
		const image = document.createElement("img");
		image.src = link.logo || "/sj.png";
		image.alt = "";
		mark.append(image);
		const label = document.createElement("span");
		label.className = "quick-link-label";
		label.textContent = link.label || new URL(link.url).hostname;
		button.append(mark, label);
		quickLinks.append(button);
	}
}

function showError(message, detail = "") {
	error.textContent = message;
	errorCode.textContent = detail;
}

function setLoading(isLoading, tab = activeTab()) {
	if (!tab) return;
	tab.loading = isLoading;
	if (tab.id === activeTabId) progress.classList.toggle("loading", isLoading);
}

function recordHistory(tab, url) {
	if (!url || tab.history[tab.historyIndex] === url) return;
	if (tab.history[tab.historyIndex - 1] === url) {
		tab.historyIndex--;
	} else if (tab.history[tab.historyIndex + 1] === url) {
		tab.historyIndex++;
	} else {
		tab.history.splice(tab.historyIndex + 1);
		tab.history.push(url);
		tab.historyIndex = tab.history.length - 1;
	}
}

function updateTabUrl(tab, url) {
	if (!url) return;
	tab.home = false;
	tab.url = url;
	try {
		tab.title = new URL(url).hostname.replace(/^www\./, "") || "New tab";
	} catch {
		tab.title = "Web page";
	}
	recordHistory(tab, url);
	if (tab.id === activeTabId) syncBrowser();
}

function createFrame(tab) {
	if (tab.frame) return tab.frame;
	const frame = scramjet.createFrame();
	frame.frame.className = "page-frame";
	frame.frame.title = tab.title;
	frame.frame.hidden = true;
	frame.addEventListener("navigate", () => setLoading(true, tab));
	frame.addEventListener("urlchange", (event) => {
		updateTabUrl(tab, event.url);
		setLoading(false, tab);
	});
	frame.frame.addEventListener("load", () => setLoading(false, tab));
	tab.frame = frame;
	frameHost.append(frame.frame);
	return frame;
}

async function prepareTransport() {
	if (!transportReady) {
		transportReady = (async () => {
			await registerSW();
			await scramjetReady;
			const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
			if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
				await connection.setTransport("/libcurl/index.mjs", [
					{ websocket: wispUrl },
				]);
			}
		})();
	}
	return transportReady;
}

async function navigateTab(tab, url) {
	showError("");
	try {
		await prepareTransport();
		tab.home = false;
		updateTabUrl(tab, url);
		const frame = createFrame(tab);
		frame.frame.hidden = tab.id !== activeTabId;
		frame.go(url);
		setLoading(true, tab);
		syncBrowser();
	} catch (err) {
		setLoading(false, tab);
		showError(
			"Unable to open this page.",
			err instanceof Error ? err.message : String(err)
		);
	}
}

function createTab() {
	const tab = {
		id: `tab-${++tabSequence}`,
		title: "New tab",
		url: "",
		home: true,
		frame: null,
		history: [],
		historyIndex: -1,
		loading: false,
	};
	tabs.push(tab);
	activeTabId = tab.id;
	syncBrowser();
	address.focus();
	return tab;
}

function closeTab(tabId) {
	const index = tabs.findIndex((tab) => tab.id === tabId);
	if (index < 0) return;
	const [tab] = tabs.splice(index, 1);
	if (tab.frame) tab.frame.frame.remove();
	if (tabs.length === 0) {
		createTab();
		return;
	}
	if (tab.id === activeTabId) activeTabId = tabs[Math.max(0, index - 1)].id;
	syncBrowser();
}

function goHome() {
	const tab = activeTab();
	if (!tab) return;
	tab.home = true;
	tab.title = "New tab";
	setLoading(false);
	showError("");
	syncBrowser();
}

function toggleBookmark() {
	const tab = activeTab();
	if (!tab || tab.home || !tab.url) return;
	const index = bookmarks.findIndex((bookmark) => bookmark.url === tab.url);
	if (index >= 0) bookmarks.splice(index, 1);
	else bookmarks.unshift({ label: tab.title, url: tab.url });
	try {
		localStorage.setItem("classroom-bookmarks", JSON.stringify(bookmarks));
	} catch {
		showError("Bookmark could not be saved in this browser.");
	}
	renderQuickLinks();
	syncBrowser();
}

renderMenu();
renderCloakMenu();
setSearchEngine("google");
try {
	setTheme(
		localStorage.getItem("classroom-theme") === "light" ? "light" : "dark"
	);
} catch {
	setTheme("dark");
}

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});
const scramjetReady = Promise.resolve(scramjet.init());
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = address.value.trim();
	if (!value) return;
	navigateTab(activeTab(), search(value, searchEngine.value));
});

tabList.addEventListener("click", (event) => {
	const closeButton = event.target.closest("[data-close-tab]");
	if (closeButton) {
		event.stopPropagation();
		closeTab(closeButton.dataset.closeTab);
		return;
	}
	const item = event.target.closest(".tab-item");
	if (item) {
		activeTabId = item.dataset.tabId;
		syncBrowser();
	}
});

document.getElementById("new-tab").addEventListener("click", createTab);
document
	.getElementById("go-back")
	.addEventListener("click", () => activeTab()?.frame?.back());
document
	.getElementById("go-forward")
	.addEventListener("click", () => activeTab()?.frame?.forward());
document
	.getElementById("reload-page")
	.addEventListener("click", () => activeTab()?.frame?.reload());
document.getElementById("go-home").addEventListener("click", goHome);
document
	.getElementById("save-bookmark")
	.addEventListener("click", toggleBookmark);
document.getElementById("theme-toggle").addEventListener("click", () => {
	setTheme(
		document.documentElement.dataset.theme === "dark" ? "light" : "dark"
	);
});

cloakButton.addEventListener("click", () => {
	const willOpen = cloakMenu.hidden;
	cloakMenu.hidden = !willOpen;
	cloakButton.setAttribute("aria-expanded", String(willOpen));
	if (willOpen) {
		const selected = activeTab()?.cloak || "normal";
		cloakMenu.querySelectorAll(".cloak-option").forEach((option) => {
			const isSelected = option.dataset.cloak === selected;
			option.classList.toggle("active", isSelected);
			option.setAttribute("aria-checked", String(isSelected));
		});
	}
});
cloakMenu.addEventListener("click", (event) => {
	const option = event.target.closest(".cloak-option");
	if (option) setCloak(option.dataset.cloak);
});
document.addEventListener("click", (event) => {
	if (!event.target.closest(".cloak-control") && !cloakMenu.hidden) {
		cloakMenu.hidden = true;
		cloakButton.setAttribute("aria-expanded", "false");
	}
});

document
	.getElementById("admin-open")
	.addEventListener("click", openAdminDialog);
document
	.getElementById("admin-close")
	.addEventListener("click", () => adminDialog.close());
document
	.getElementById("admin-login-form")
	.addEventListener("submit", async (event) => {
		event.preventDefault();
		const password = document.getElementById("admin-password");
		try {
			await adminRequest("/api/admin/login", {
				method: "POST",
				body: JSON.stringify({ password: password.value }),
			});
			password.value = "";
			await refreshAdminPanel();
		} catch (err) {
			showAdminMessage(err.message, true);
		}
	});
document
	.getElementById("blocked-toggle")
	.addEventListener("change", async (event) => {
		try {
			await adminRequest("/api/admin/blocked", {
				method: "POST",
				body: JSON.stringify({ blocked: event.target.checked }),
			});
			await refreshBlockedState();
			showAdminMessage("Blocked setting updated.");
		} catch (err) {
			event.target.checked = !event.target.checked;
			showAdminMessage(err.message, true);
		}
	});
document.getElementById("admin-logout").addEventListener("click", async () => {
	try {
		await adminRequest("/api/admin/logout", { method: "POST" });
		await refreshAdminPanel();
	} catch (err) {
		showAdminMessage(err.message, true);
	}
});

quickLinks.addEventListener("click", (event) => {
	const link = event.target.closest(".quick-link[data-url]");
	if (!link) return;
	event.preventDefault();
	navigateTab(activeTab(), link.dataset.url);
});

document.addEventListener("keydown", (event) => {
	if (event.key.startsWith("Arrow")) {
		if (event.key === arrowSequence[arrowSequenceIndex]) {
			arrowSequenceIndex++;
		} else {
			arrowSequenceIndex = event.key === "ArrowUp" ? 1 : 0;
		}
		if (arrowSequenceIndex === arrowSequence.length) {
			arrowSequenceIndex = 0;
			openAdminDialog();
		}
	}
	const modifier = event.ctrlKey || event.metaKey;
	if (modifier && event.key.toLowerCase() === "t") {
		event.preventDefault();
		createTab();
	} else if (modifier && event.key.toLowerCase() === "w") {
		event.preventDefault();
		closeTab(activeTabId);
	} else if (modifier && event.key.toLowerCase() === "l") {
		event.preventDefault();
		address.focus();
		address.select();
	} else if (modifier && ["r", "f5"].includes(event.key.toLowerCase())) {
		event.preventDefault();
		activeTab()?.frame?.reload();
	} else if (event.altKey && event.key === "ArrowLeft") {
		event.preventDefault();
		activeTab()?.frame?.back();
	} else if (event.altKey && event.key === "ArrowRight") {
		event.preventDefault();
		activeTab()?.frame?.forward();
	} else if (event.key === "Escape") {
		if (picker?.classList.contains("open")) togglePicker(false);
		cloakMenu.hidden = true;
		cloakButton.setAttribute("aria-expanded", "false");
	}
});

renderQuickLinks();
createTab();
refreshBlockedState();
window.setInterval(refreshBlockedState, 15000);
window.addEventListener("pagehide", () => setLoading(false));
