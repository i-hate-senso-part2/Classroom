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
const homeSearchForm = document.getElementById("home-search-form");
const homeAddress = document.getElementById("home-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const tabList = document.getElementById("tab-list");
const frameHost = document.getElementById("frame-host");
const homeScreen = document.getElementById("home-screen");
const progress = document.getElementById("browser-progress");
const quickLinks = document.getElementById("quick-links");
const startupScreen = document.getElementById("startup-screen");
const adminDialog = document.getElementById("admin-dialog");
const announcementDialog = document.getElementById("announcement-dialog");
const announcementMessage = document.getElementById("announcement-message");
const announcementKicker = document.getElementById("announcement-kicker");
const announcementDismissButton = document.getElementById(
	"announcement-dismiss"
);
const userSettingsDialog = document.getElementById("user-settings-dialog");
const blockedOverlay = document.getElementById("blocked-overlay");
const browserClientId =
	window.crypto?.randomUUID?.() ||
	`${Date.now()}-${Math.random().toString(16).slice(2)}`;
let lastRefreshToken = null;
let currentAnnouncementId = "";
let announcementDismissible = true;
let announcementAutoDismissTimer = null;
let announcementPreviewing = false;
let seenAnnouncementId = (() => {
	try {
		return localStorage.getItem("classroom-seen-announcement") || "";
	} catch {
		return "";
	}
})();
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const fullscreenExit = document.getElementById("fullscreen-exit");
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
	{ id: "geforce", title: "Google Classroom", logo: "/logos/classroom.png" },
	{ id: "tiktok", title: "TikTok", logo: "/logos/tiktok.png" },
];
const DEFAULT_USER_SETTINGS = Object.freeze({
	theme: "moss",
	background: "grid",
	defaultCloak: "normal",
	backgroundImage: "",
});
const BUILT_IN_THEMES = new Set(["moss", "sunset", "ocean", "midnight"]);
const HOME_BACKGROUNDS = new Set(["grid", "lines", "plain", "image"]);
const CLOAK_NAMES = new Set(cloakTemplates.map((template) => template.id));
const IMAGE_DATA_URL =
	/^data:image\/(?:png|jpeg|webp|gif);base64,[\da-z+/]+=*$/i;
let activeTabId = null;
let tabSequence = 0;
let controller;
let controllerReady;
let settingsDraft = null;
let bookmarks = [];
let sharedLinks = [];
let renderedSharedLinks = "";
let arrowSequenceIndex = 0;
const arrowSequence = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowDown"];

try {
	bookmarks = JSON.parse(localStorage.getItem("classroom-bookmarks") || "[]");
	if (!Array.isArray(bookmarks)) bookmarks = [];
} catch {
	bookmarks = [];
}

function loadUserSettings() {
	try {
		const stored = JSON.parse(
			localStorage.getItem("classroom-user-settings") || "null"
		);
		if (stored && typeof stored === "object") {
			return {
				theme: BUILT_IN_THEMES.has(stored.theme) ? stored.theme : "moss",
				background: HOME_BACKGROUNDS.has(stored.background)
					? stored.background
					: "grid",
				defaultCloak: CLOAK_NAMES.has(stored.defaultCloak)
					? stored.defaultCloak
					: "normal",
				backgroundImage:
					typeof stored.backgroundImage === "string" &&
					IMAGE_DATA_URL.test(stored.backgroundImage)
						? stored.backgroundImage
						: "",
			};
		}
		const previousTheme = localStorage.getItem("classroom-theme");
		return {
			...DEFAULT_USER_SETTINGS,
			theme: previousTheme === "dark" ? "midnight" : "moss",
		};
	} catch {
		return { ...DEFAULT_USER_SETTINGS };
	}
}

let userSettings = loadUserSettings();

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
			current.frame.element.hidden = current.id !== activeTabId || current.home;
	}
	homeScreen.hidden = !tab.home;
	address.value = tab.home ? "" : tab.url;
	document.getElementById("go-back").disabled =
		!tab.frame || tab.historyIndex <= 0;
	document.getElementById("go-forward").disabled =
		!tab.frame || tab.historyIndex >= tab.history.length - 1;
	document.getElementById("reload-page").disabled = !tab.frame || tab.home;
	document.getElementById("go-home").disabled = tab.home;
	const saved = bookmarks.some(
		(bookmark) => bookmark.url === tab.url && !tab.home
	);
	const bookmarkButton = document.getElementById("save-bookmark");
	bookmarkButton.setAttribute("aria-pressed", String(saved));
	bookmarkButton.disabled = tab.home;
	const cloak = cloakTemplates.find((item) => item.id === tab.cloak);
	document.title = cloak?.title || (tab.home ? "New tab" : tab.title);
	document.getElementById("browser-favicon").href = cloak?.logo || "/sj.png";
	if (tab.frame) tab.frame.element.title = cloak?.title || tab.title;
	renderTabs();
}

function applyUserSettings(settings) {
	const root = document.documentElement;
	root.dataset.theme = settings.theme;
	root.dataset.homeBackground = settings.background;
	if (
		settings.backgroundImage &&
		IMAGE_DATA_URL.test(settings.backgroundImage)
	) {
		root.style.setProperty(
			"--home-background-image",
			`url("${settings.backgroundImage}")`
		);
	} else {
		root.style.removeProperty("--home-background-image");
	}
	for (const tab of tabs) {
		tab.cloak =
			settings.defaultCloak === "normal" ? null : settings.defaultCloak;
	}
	if (tabs.length) syncBrowser();
	document.getElementById("theme-select").value = settings.theme;
	document.getElementById("background-select").value = settings.background;
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = !settings.backgroundImage;
	preview.src = settings.backgroundImage || "";
	document.getElementById("remove-background-image").hidden =
		!settings.backgroundImage;
}

function saveUserSettings() {
	try {
		localStorage.setItem(
			"classroom-user-settings",
			JSON.stringify(userSettings)
		);
		return true;
	} catch {
		const message = document.getElementById("user-settings-message");
		if (message)
			message.textContent = "Settings could not be saved in this browser.";
		return false;
	}
}

function readSettingsForm() {
	return {
		...settingsDraft,
		theme:
			document.querySelector('input[name="theme-option"]:checked')?.value ||
			document.getElementById("theme-select").value,
		background: document.getElementById("background-select").value,
		defaultCloak: document.getElementById("default-cloak-select").value,
	};
}

function syncSettingsForm(settings) {
	document.getElementById("theme-select").value = settings.theme;
	for (const option of document.querySelectorAll(
		'input[name="theme-option"]'
	)) {
		option.checked = option.value === settings.theme;
	}
	document.getElementById("background-select").value = settings.background;
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = !settings.backgroundImage;
	preview.src = settings.backgroundImage || "";
	document.getElementById("remove-background-image").hidden =
		!settings.backgroundImage;
	document.getElementById("background-image-file").value = "";
	document.getElementById("background-image-name").textContent =
		settings.backgroundImage ? "Saved background image" : "No image selected";
}

function openUserSettings() {
	settingsDraft = JSON.parse(JSON.stringify(userSettings));
	syncSettingsForm(settingsDraft);
	document.getElementById("user-settings-message").textContent = "";
	userSettingsDialog.showModal();
}

function previewUserSettings() {
	settingsDraft = readSettingsForm();
	applyUserSettings(settingsDraft);
}

async function encodeBackgroundImage(file) {
	if (!file || !/^image\/(?:png|jpeg|webp|gif)$/.test(file.type)) {
		throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
	}
	if (file.size > 12 * 1024 * 1024) {
		throw new Error("Choose an image smaller than 12 MB.");
	}
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 1600 / bitmap.width, 1000 / bitmap.height);
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const blob = await new Promise((resolve) =>
		canvas.toBlob(resolve, "image/webp", 0.75)
	);
	if (!blob || blob.size > 2 * 1024 * 1024) {
		throw new Error("This image is too large to store in browser settings.");
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(new Error("This image could not be read."));
		reader.readAsDataURL(blob);
	});
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
		document.getElementById("blocked-until").value = formatLocalDateTime(
			result.blockedUntil
		);
		document.getElementById("admin-bypass-toggle").checked = result.adminBypass;
		const links = Array.isArray(result.sharedLinks) ? result.sharedLinks : [];
		document.getElementById("admin-shared-links").value = links
			.map((link) => `${link.label} | ${link.url}`)
			.join("\n");
		document.getElementById("admin-announcement").value =
			result.announcement || "";
		document.getElementById("announcement-dismissible").checked =
			result.announcementDismissible !== false;
		document.getElementById("announcement-expires-at").value =
			formatLocalDateTime(result.announcementExpiresAt);
		document.getElementById("announcement-auto-dismiss").value = String(
			result.announcementAutoDismissSeconds || 0
		);
		updateAdminStatus(result, links);
		message.textContent = "Administrator access verified.";
	} catch (err) {
		form.hidden = false;
		settings.hidden = true;
		document.getElementById("admin-status-store").textContent = "Unavailable";
		document.getElementById("admin-status-store").dataset.state = "blocked";
		message.textContent = err.message.includes("ADMIN_PASSWORD_HASH")
			? "Admin is disabled until a valid ADMIN_PASSWORD_HASH is set on the server."
			: "Sign in to manage browser settings.";
	}
}

function updateAdminStatus(state, links) {
	const access = document.getElementById("admin-status-access");
	access.textContent = state.blocked ? "Blocked" : "Open";
	access.dataset.state = state.blocked ? "blocked" : "active";
	if (state.blocked && state.blockedUntil) {
		access.title = `Until ${new Date(state.blockedUntil).toLocaleString()}`;
	} else {
		access.removeAttribute("title");
	}
	const announcement = document.getElementById("admin-status-announcement");
	const announcementActive =
		Boolean(state.announcement) &&
		(state.announcementExpiresAt === null ||
			state.announcementExpiresAt > Date.now());
	announcement.textContent = announcementActive ? "Live" : "None";
	announcement.dataset.state = announcementActive ? "active" : "";
	const linkStatus = document.getElementById("admin-status-links");
	linkStatus.textContent = `${links.length} / 8`;
	linkStatus.dataset.state = links.length ? "active" : "";
	const store = document.getElementById("admin-status-store");
	store.textContent = "Online";
	store.dataset.state = "active";
}

async function refreshAdminStatus() {
	try {
		const state = await adminRequest("/api/admin/state");
		updateAdminStatus(
			state,
			Array.isArray(state.sharedLinks) ? state.sharedLinks : []
		);
	} catch {
		const store = document.getElementById("admin-status-store");
		store.textContent = "Unavailable";
		store.dataset.state = "blocked";
	}
}

function formatLocalDateTime(timestamp) {
	if (typeof timestamp !== "number") return "";
	return new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 16);
}

async function saveAdminAccessSettings() {
	const blocked = document.getElementById("blocked-toggle").checked;
	const blockedUntil = document.getElementById("blocked-until").value;
	try {
		await adminRequest("/api/admin/blocked", {
			method: "POST",
			body: JSON.stringify({
				blocked,
				blockedUntil:
					blocked && blockedUntil ? new Date(blockedUntil).toISOString() : null,
			}),
		});
		if (!blocked) document.getElementById("blocked-until").value = "";
		await refreshBlockedState();
		await refreshAdminPanel();
		showAdminMessage(
			blocked
				? blockedUntil
					? "Access block and end time saved."
					: "Access blocked until you turn it off."
				: "Visitor access is open."
		);
	} catch (err) {
		await refreshAdminPanel();
		showAdminMessage(err.message, true);
	}
}

function closeAnnouncement() {
	window.clearTimeout(announcementAutoDismissTimer);
	announcementAutoDismissTimer = null;
	if (announcementDialog.open) announcementDialog.close();
}

function closeAnnouncementPreview() {
	announcementPreviewing = false;
	announcementDismissible = true;
	announcementKicker.textContent = "ANNOUNCEMENT";
	closeAnnouncement();
	void refreshBlockedState();
}

function markAnnouncementSeen(id) {
	seenAnnouncementId = id;
	try {
		localStorage.setItem("classroom-seen-announcement", id);
	} catch {}
}

function dismissAnnouncement() {
	if (currentAnnouncementId) {
		markAnnouncementSeen(currentAnnouncementId);
	}
	closeAnnouncement();
}

function syncAnnouncement(state, blocked) {
	if (announcementPreviewing) return;
	const message =
		typeof state.announcement === "string" ? state.announcement.trim() : "";
	const id =
		typeof state.announcementId === "string" && state.announcementId
			? state.announcementId
			: message;
	const expiresAt =
		typeof state.announcementExpiresAt === "number"
			? state.announcementExpiresAt
			: null;
	if (
		blocked ||
		state.isAdmin === true ||
		!message ||
		!id ||
		(expiresAt !== null && expiresAt <= Date.now())
	) {
		closeAnnouncement();
		currentAnnouncementId = "";
		return;
	}

	const changed = id !== currentAnnouncementId;
	if (changed) {
		window.clearTimeout(announcementAutoDismissTimer);
		announcementMessage.textContent = message;
		currentAnnouncementId = id;
	}
	announcementDismissible = state.announcementDismissible !== false;
	announcementDismissButton.hidden = !announcementDismissible;

	if (seenAnnouncementId === id && !announcementDialog.open) {
		closeAnnouncement();
		return;
	}
	if (!announcementDialog.open) {
		announcementDialog.showModal();
		markAnnouncementSeen(id);
	}
	if (changed) {
		const seconds = Number(state.announcementAutoDismissSeconds) || 0;
		const durations = [];
		if (seconds > 0) durations.push(seconds * 1000);
		if (expiresAt !== null) durations.push(expiresAt - Date.now());
		if (durations.length > 0) {
			announcementAutoDismissTimer = window.setTimeout(
				() => {
					if (expiresAt !== null && Date.now() >= expiresAt) {
						closeAnnouncement();
					} else {
						dismissAnnouncement();
					}
				},
				Math.min(...durations)
			);
		}
	}
}

async function refreshBlockedState() {
	try {
		const response = await fetch("/api/admin/browser-state", {
			cache: "no-store",
		});
		if (!response.ok) {
			return document.documentElement.hasAttribute("data-blocked-at-start");
		}
		const state = await response.json();
		const { blocked, refreshToken, refreshSource } = state;
		if (typeof blocked !== "boolean") {
			return document.documentElement.hasAttribute("data-blocked-at-start");
		}
		const incomingSharedLinks = Array.isArray(state.sharedLinks)
			? state.sharedLinks
			: [];
		const sharedLinksState = JSON.stringify(incomingSharedLinks);
		if (sharedLinksState !== renderedSharedLinks) {
			sharedLinks = incomingSharedLinks;
			renderedSharedLinks = sharedLinksState;
			renderQuickLinks();
		}
		blockedOverlay.hidden = !blocked;
		document.documentElement.toggleAttribute("data-blocked-at-start", blocked);
		syncAnnouncement(state, blocked);
		try {
			if (blocked) {
				localStorage.setItem("classroom-blocked-state", "true");
			} else {
				localStorage.removeItem("classroom-blocked-state");
			}
		} catch {}
		const nextRefreshToken =
			typeof refreshToken === "string" ? refreshToken : "";
		if (lastRefreshToken === null) {
			lastRefreshToken = nextRefreshToken;
		} else if (nextRefreshToken !== lastRefreshToken) {
			lastRefreshToken = nextRefreshToken;
			if (nextRefreshToken && refreshSource !== browserClientId && !blocked) {
				window.location.reload();
			}
		}
		return blocked;
	} catch {
		return document.documentElement.hasAttribute("data-blocked-at-start");
	}
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
		...sharedLinks.filter((link) => link && link.url && link.label),
		...bookmarks.filter((bookmark) => bookmark && bookmark.url),
	];
	const uniqueLinks = links.filter(
		(link, index, list) =>
			list.findIndex((candidate) => candidate.url === link.url) === index
	);
	for (const link of uniqueLinks) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "quick-link";
		button.dataset.url = link.url;
		button.setAttribute("aria-label", `Open ${link.label || link.url}`);
		const mark = document.createElement("span");
		mark.className = "quick-link-mark";
		mark.setAttribute("aria-hidden", "true");
		if (link.logo) {
			const image = document.createElement("img");
			image.src = link.logo;
			image.alt = "";
			mark.append(image);
		} else {
			mark.textContent = (link.label || new URL(link.url).hostname)
				.slice(0, 1)
				.toUpperCase();
		}
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
	error.parentElement.hidden = !message && !detail;
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
	const frame = controller.createFrame();
	frame.element.className = "page-frame";
	frame.element.title = tab.title;
	frame.element.hidden = true;
	frame.element.addEventListener("load", () => {
		try {
			const frameUrl = new URL(frame.element.contentWindow.location.href);
			const prefixPath = new URL(frame.prefix, location.href).pathname;
			const encodedUrl = frameUrl.pathname.slice(prefixPath.length);
			const decodedUrl = controller.config.codec.decode(encodedUrl);
			if (decodedUrl) updateTabUrl(tab, decodedUrl);
		} catch {}
		setLoading(false, tab);
	});
	tab.frame = frame;
	frameHost.append(frame.element);
	return frame;
}

async function prepareTransport() {
	if (!controllerReady) {
		const initialization = (async () => {
			const registration = await registerSW();
			await navigator.serviceWorker.ready;
			const serviceWorker =
				navigator.serviceWorker.controller || registration.active;
			if (!serviceWorker)
				throw new Error("Scramjet service worker is unavailable.");

			const api = window.$scramjetController;
			api.config.injectPath = "/scramjet-controller/controller.inject.js";
			api.config.scramjetPath = "/scramjet/scramjet.js";
			api.config.wasmPath = "/scramjet/scramjet.wasm";
			const wispUrl = "wss://wisp-server-python-nh0a.onrender.com/";
			const transport = new window.LibcurlTransport.LibcurlClient({
				wisp: wispUrl,
			});
			controller = new api.Controller({
				serviceworker: serviceWorker,
				transport,
			});
			await controller.wait();
		})();
		controllerReady = initialization.catch((error) => {
			controller = null;
			controllerReady = null;
			throw error;
		});
	}
	return controllerReady;
}

async function navigateTab(tab, url) {
	showError("");
	try {
		await prepareTransport();
		tab.home = false;
		updateTabUrl(tab, url);
		const frame = createFrame(tab);
		frame.element.hidden = tab.id !== activeTabId;
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
		cloak:
			userSettings.defaultCloak === "normal" ? null : userSettings.defaultCloak,
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
	if (tab.frame) tab.frame.element.remove();
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
setSearchEngine("google");
applyUserSettings(userSettings);

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = address.value.trim();
	if (!value) return;
	navigateTab(activeTab(), search(value, searchEngine.value));
});

homeSearchForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = homeAddress.value.trim();
	if (!value) return;
	address.value = value;
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

document
	.getElementById("user-settings-open")
	.addEventListener("click", openUserSettings);
document
	.getElementById("user-settings-close")
	.addEventListener("click", () => userSettingsDialog.close());
document
	.getElementById("user-settings-form")
	.addEventListener("submit", (event) => {
		event.preventDefault();
		userSettings = readSettingsForm();
		settingsDraft = null;
		applyUserSettings(userSettings);
		if (saveUserSettings()) {
			document.getElementById("user-settings-message").textContent =
				"Settings saved on this device.";
		}
	});
for (const id of ["background-select", "default-cloak-select"]) {
	document.getElementById(id).addEventListener("input", previewUserSettings);
	document.getElementById(id).addEventListener("change", previewUserSettings);
}
document.querySelectorAll('input[name="theme-option"]').forEach((option) => {
	option.addEventListener("change", () => {
		document.getElementById("theme-select").value = option.value;
		previewUserSettings();
	});
});
document
	.getElementById("background-image-file")
	.addEventListener("change", async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		document.getElementById("background-image-name").textContent = file.name;
		try {
			settingsDraft = readSettingsForm();
			settingsDraft.backgroundImage = await encodeBackgroundImage(file);
			settingsDraft.background = "image";
			syncSettingsForm(settingsDraft);
			document.getElementById("background-image-name").textContent = file.name;
			applyUserSettings(settingsDraft);
			document.getElementById("user-settings-message").textContent =
				"Background preview ready. Save settings to keep it.";
		} catch (error) {
			document.getElementById("user-settings-message").textContent =
				error.message;
			event.target.value = "";
			document.getElementById("background-image-name").textContent =
				userSettings.backgroundImage
					? "Saved background image"
					: "No image selected";
		}
	});
document
	.getElementById("remove-background-image")
	.addEventListener("click", () => {
		settingsDraft = readSettingsForm();
		settingsDraft.backgroundImage = "";
		if (settingsDraft.background === "image") settingsDraft.background = "grid";
		syncSettingsForm(settingsDraft);
		applyUserSettings(settingsDraft);
	});
document.getElementById("user-settings-reset").addEventListener("click", () => {
	userSettings = { ...DEFAULT_USER_SETTINGS };
	settingsDraft = null;
	syncSettingsForm(userSettings);
	applyUserSettings(userSettings);
	if (saveUserSettings()) {
		document.getElementById("user-settings-message").textContent =
			"Default settings restored.";
	}
});
userSettingsDialog.addEventListener("close", () => {
	if (settingsDraft) {
		settingsDraft = null;
		applyUserSettings(userSettings);
	}
});

async function updateFullscreenState() {
	const isFullscreen = Boolean(document.fullscreenElement);
	fullscreenExit.hidden = !isFullscreen;
	fullscreenToggle.setAttribute("aria-pressed", String(isFullscreen));
	fullscreenToggle.setAttribute(
		"aria-label",
		`${isFullscreen ? "Exit" : "Enter"} full screen`
	);
	fullscreenToggle.title = `${isFullscreen ? "Exit" : "Enter"} full screen`;
}

async function toggleFullscreen() {
	try {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await document.documentElement.requestFullscreen();
	} catch (error) {
		showError("Full screen is unavailable in this browser.", error.message);
	}
}

fullscreenToggle.addEventListener("click", toggleFullscreen);
fullscreenExit.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenState);
announcementDismissButton.addEventListener("click", () => {
	if (announcementPreviewing) closeAnnouncementPreview();
	else dismissAnnouncement();
});
document
	.getElementById("preview-announcement")
	.addEventListener("click", () => {
		const message = document.getElementById("admin-announcement").value.trim();
		if (!message) {
			showAdminMessage("Write a message before previewing it.", true);
			return;
		}
		window.clearTimeout(announcementAutoDismissTimer);
		announcementPreviewing = true;
		announcementDismissible = true;
		announcementKicker.textContent = "PREVIEW";
		announcementMessage.textContent = message;
		announcementDismissButton.hidden = false;
		if (!announcementDialog.open) announcementDialog.showModal();
	});
announcementDialog.addEventListener("cancel", (event) => {
	event.preventDefault();
	if (announcementPreviewing) closeAnnouncementPreview();
	else if (announcementDismissible) dismissAnnouncement();
});
window.addEventListener("storage", (event) => {
	if (event.key !== "classroom-seen-announcement") return;
	seenAnnouncementId = event.newValue || "";
	if (seenAnnouncementId === currentAnnouncementId && announcementDialog.open) {
		closeAnnouncement();
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
			await refreshBlockedState();
		} catch (err) {
			showAdminMessage(err.message, true);
		}
	});
document
	.getElementById("blocked-toggle")
	.addEventListener("change", saveAdminAccessSettings);
document
	.getElementById("save-block-schedule")
	.addEventListener("click", saveAdminAccessSettings);
document
	.getElementById("admin-bypass-toggle")
	.addEventListener("change", async (event) => {
		try {
			await adminRequest("/api/admin/bypass", {
				method: "POST",
				body: JSON.stringify({ adminBypass: event.target.checked }),
			});
			await refreshBlockedState();
			showAdminMessage("Administrator bypass updated.");
		} catch (err) {
			event.target.checked = !event.target.checked;
			showAdminMessage(err.message, true);
		}
	});
document
	.getElementById("admin-announcement-form")
	.addEventListener("submit", async (event) => {
		event.preventDefault();
		const input = document.getElementById("admin-announcement");
		const expiry = document.getElementById("announcement-expires-at").value;
		try {
			await adminRequest("/api/admin/announcement", {
				method: "POST",
				body: JSON.stringify({
					announcement: input.value,
					dismissible: document.getElementById("announcement-dismissible")
						.checked,
					expiresAt: expiry ? new Date(expiry).toISOString() : null,
					autoDismissSeconds: Number(
						document.getElementById("announcement-auto-dismiss").value
					),
				}),
			});
			await refreshBlockedState();
			showAdminMessage(
				input.value.trim()
					? "Announcement popup posted."
					: "Announcement popup cleared."
			);
		} catch (err) {
			showAdminMessage(err.message, true);
		}
	});
document
	.getElementById("clear-announcement")
	.addEventListener("click", async () => {
		const input = document.getElementById("admin-announcement");
		input.value = "";
		document.getElementById("announcement-dismissible").checked = true;
		document.getElementById("announcement-expires-at").value = "";
		document.getElementById("announcement-auto-dismiss").value = "0";
		document.getElementById("admin-announcement-form").requestSubmit();
	});
document
	.getElementById("admin-links-form")
	.addEventListener("submit", async (event) => {
		event.preventDefault();
		const lines = document
			.getElementById("admin-shared-links")
			.value.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		if (lines.length > 8) {
			showAdminMessage("You can add up to 8 shared quick links.", true);
			return;
		}
		const links = [];
		for (const line of lines) {
			const separator = line.indexOf("|");
			if (separator < 1) {
				showAdminMessage(
					"Use one link per line in the format: Label | https://example.com",
					true
				);
				return;
			}
			links.push({
				label: line.slice(0, separator).trim(),
				url: line.slice(separator + 1).trim(),
			});
		}
		try {
			await adminRequest("/api/admin/links", {
				method: "POST",
				body: JSON.stringify({ links }),
			});
			await refreshBlockedState();
			await refreshAdminPanel();
			showAdminMessage("Shared quick links saved.");
		} catch (err) {
			showAdminMessage(err.message, true);
		}
	});
document.getElementById("refresh-all").addEventListener("click", async () => {
	if (
		!window.confirm(
			"Refresh other open Classroom pages? Their current pages may be interrupted."
		)
	) {
		return;
	}
	try {
		const result = await adminRequest("/api/admin/refresh", {
			method: "POST",
			body: JSON.stringify({ sourceId: browserClientId }),
		});
		lastRefreshToken = result.refreshToken;
		await refreshBlockedState();
		showAdminMessage(
			result.blocked
				? "Refresh sent. Blocked visitors will see the restriction screen."
				: "Refresh sent. Other open pages will refresh within 10 seconds."
		);
	} catch (err) {
		showAdminMessage(err.message, true);
	}
});
document.getElementById("admin-logout").addEventListener("click", async () => {
	try {
		await adminRequest("/api/admin/logout", { method: "POST" });
		await refreshAdminPanel();
		await refreshBlockedState();
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
	const key = typeof event.key === "string" ? event.key : "";
	if (key.startsWith("Arrow")) {
		if (key === arrowSequence[arrowSequenceIndex]) {
			arrowSequenceIndex++;
		} else {
			arrowSequenceIndex = key === "ArrowUp" ? 1 : 0;
		}
		if (arrowSequenceIndex === arrowSequence.length) {
			arrowSequenceIndex = 0;
			openAdminDialog();
		}
	}
	const modifier = event.ctrlKey || event.metaKey;
	if (modifier && key.toLowerCase() === "t") {
		event.preventDefault();
		createTab();
	} else if (modifier && key.toLowerCase() === "w") {
		event.preventDefault();
		closeTab(activeTabId);
	} else if (modifier && key.toLowerCase() === "l") {
		event.preventDefault();
		address.focus();
		address.select();
	} else if (modifier && ["r", "f5"].includes(key.toLowerCase())) {
		event.preventDefault();
		activeTab()?.frame?.reload();
	} else if (event.altKey && key === "ArrowLeft") {
		event.preventDefault();
		activeTab()?.frame?.back();
	} else if (event.altKey && key === "ArrowRight") {
		event.preventDefault();
		activeTab()?.frame?.forward();
	} else if (key === "Escape") {
		if (picker?.classList.contains("open")) togglePicker(false);
	}
});

renderQuickLinks();
createTab();

async function finishStartup() {
	const blocked = await refreshBlockedState();
	if (blocked) {
		startupScreen.hidden = true;
		return;
	}
	const imagesReady = Promise.all(
		Array.from(document.images, (image) =>
			image.decode ? image.decode().catch(() => {}) : Promise.resolve()
		)
	);
	const backgroundReady = userSettings.backgroundImage
		? new Promise((resolve) => {
				const image = new Image();
				image.onload = resolve;
				image.onerror = resolve;
				image.src = userSettings.backgroundImage;
			})
		: Promise.resolve();
	await Promise.all([
		document.fonts?.ready || Promise.resolve(),
		imagesReady,
		backgroundReady,
	]);
	document.getElementById("startup-message").textContent =
		"Connecting browser transport";
	try {
		await Promise.race([
			prepareTransport(),
			new Promise((resolve) => window.setTimeout(resolve, 12000)),
		]);
	} catch (error) {
		showError("Browser transport is not ready yet.", error.message);
	}
	startupScreen.hidden = true;
}

finishStartup();
window.setInterval(() => {
	void refreshBlockedState();
	if (adminDialog.open && !document.getElementById("admin-settings").hidden) {
		void refreshAdminStatus();
	}
}, 10000);
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) refreshBlockedState();
});
window.addEventListener("pagehide", () => setLoading(false));
