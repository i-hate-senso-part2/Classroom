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
const scramjetVersion =
	window.CLASSROOM_SCRAMJET_VERSION === "v1" ? "v1" : "v2";
const versionPicker = document.querySelector(".scramjet-version-picker");
const versionPickerTrigger = document.getElementById(
	"scramjet-version-trigger"
);
const versionPickerLabel = document.getElementById("scramjet-version-label");
const versionPickerMenu = document.getElementById("scramjet-version-menu");
const compatibilityDialog = document.getElementById("compatibility-dialog");
const compatibilityTitle = document.getElementById("compatibility-title");
const compatibilityMessage = document.getElementById("compatibility-message");
const confirmationDialog = document.getElementById("confirmation-dialog");
const confirmationTitle = document.getElementById("confirmation-title");
const confirmationMessage = document.getElementById("confirmation-message");
const confirmationAccept = document.getElementById("confirmation-accept");
const legacyScramjetPrefix = "/~1/";
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const errorDetails = document.getElementById("sj-error-details");
const statusBlock = document.querySelector(".status-block");
const errorVersion = document.getElementById("sj-error-version");
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
let blockExpiryTimer = null;
let blockedCountdownTimer = null;
let blockedCountdownDeadline = undefined;
let savedBlockedState = null;
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
const transportStageTimeout = 15000;
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

const versionLabels = { v1: "SE (V1.1.0)", v2: "SE (V2)" };
versionPickerLabel.textContent = versionLabels[scramjetVersion];
for (const option of versionPickerMenu.querySelectorAll("[data-version]")) {
	const selected = option.dataset.version === scramjetVersion;
	option.setAttribute("aria-selected", String(selected));
	option.tabIndex = selected ? 0 : -1;
}

function closeVersionPicker(returnFocus = false) {
	versionPicker.classList.remove("open");
	versionPickerMenu.hidden = true;
	versionPickerTrigger.setAttribute("aria-expanded", "false");
	if (returnFocus) versionPickerTrigger.focus();
}

function selectScramjetVersion(nextVersion) {
	if (!Object.hasOwn(versionLabels, nextVersion)) return;
	try {
		localStorage.setItem("classroom-scramjet-version", nextVersion);
	} catch (err) {
		closeVersionPicker();
		showError(
			"Unable to save the Scramjet version.",
			err instanceof Error ? err.message : String(err)
		);
		return;
	}
	location.reload();
}

versionPickerTrigger.addEventListener("click", () => {
	const opening = versionPickerMenu.hidden;
	versionPicker.classList.toggle("open", opening);
	versionPickerMenu.hidden = !opening;
	versionPickerTrigger.setAttribute("aria-expanded", String(opening));
	if (opening) {
		versionPickerMenu
			.querySelector(`[data-version="${scramjetVersion}"]`)
			.focus();
	}
});
versionPickerTrigger.addEventListener("keydown", (event) => {
	if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
	event.preventDefault();
	versionPicker.classList.add("open");
	versionPickerMenu.hidden = false;
	versionPickerTrigger.setAttribute("aria-expanded", "true");
	const options = [...versionPickerMenu.querySelectorAll("[data-version]")];
	const currentIndex = options.findIndex(
		(option) => option.dataset.version === scramjetVersion
	);
	const direction = event.key === "ArrowDown" ? 1 : -1;
	options[(currentIndex + direction + options.length) % options.length].focus();
});
versionPickerMenu.addEventListener("click", (event) => {
	const option = event.target.closest("[data-version]");
	if (option) selectScramjetVersion(option.dataset.version);
});
versionPickerMenu.addEventListener("keydown", (event) => {
	const options = [...versionPickerMenu.querySelectorAll("[data-version]")];
	const index = options.indexOf(document.activeElement);
	let nextIndex;
	if (event.key === "ArrowDown") nextIndex = (index + 1) % options.length;
	else if (event.key === "ArrowUp")
		nextIndex = (index - 1 + options.length) % options.length;
	else if (event.key === "Home") nextIndex = 0;
	else if (event.key === "End") nextIndex = options.length - 1;
	else if (event.key === "Escape") {
		event.preventDefault();
		closeVersionPicker(true);
		return;
	} else if (event.key === "Tab") {
		closeVersionPicker();
		return;
	} else {
		return;
	}
	event.preventDefault();
	options[nextIndex].focus();
});
document
	.getElementById("compatibility-switch")
	.addEventListener("click", () => selectScramjetVersion("v1"));
document
	.getElementById("compatibility-continue")
	.addEventListener("click", () => compatibilityDialog.close());
document
	.getElementById("confirmation-cancel")
	.addEventListener("click", () => confirmationDialog.close("cancel"));
confirmationAccept.addEventListener("click", () =>
	confirmationDialog.close("confirm")
);

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
	if (versionPicker && !versionPicker.contains(event.target)) {
		closeVersionPicker();
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
		savedBlockedState = result.blocked;
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
	updateBlockedCountdown(state);
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

function updateBlockedCountdown(state) {
	const detail = document.getElementById("admin-status-access-detail");
	const deadline =
		state.blocked && Number.isSafeInteger(state.blockedUntil)
			? state.blockedUntil
			: null;

	if (deadline !== blockedCountdownDeadline) {
		window.clearInterval(blockedCountdownTimer);
		blockedCountdownTimer = null;
		blockedCountdownDeadline = deadline;
	}

	if (deadline === null) {
		detail.textContent = state.blocked
			? "No automatic unblock scheduled"
			: "No active block";
		return;
	}

	const renderCountdown = () => {
		const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
		if (remaining === 0) {
			detail.textContent = "Unblocking…";
			window.clearInterval(blockedCountdownTimer);
			blockedCountdownTimer = null;
			void refreshAdminStatus();
			return false;
		}

		const days = Math.floor(remaining / 86400);
		const hours = Math.floor((remaining % 86400) / 3600);
		const minutes = Math.floor((remaining % 3600) / 60);
		const seconds = remaining % 60;
		const countdown = days
			? `${days}d ${hours}h ${minutes}m`
			: hours
				? `${hours}h ${minutes}m ${seconds}s`
				: minutes
					? `${minutes}m ${seconds}s`
					: `${seconds}s`;
		detail.textContent = `Ends ${new Date(deadline).toLocaleString()} · ${countdown}`;
		return true;
	};

	const hasTimeRemaining = renderCountdown();
	if (hasTimeRemaining && !blockedCountdownTimer) {
		blockedCountdownTimer = window.setInterval(renderCountdown, 1000);
	}
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
	if (blocked && savedBlockedState === false) {
		const endDescription = blockedUntil
			? `until ${new Date(blockedUntil).toLocaleString()}`
			: "until you manually unblock visitors";
		if (
			!(await showConfirmation({
				title: "Block visitor access?",
				message: `Block visitor access ${endDescription}? You can still unblock it from Admin.`,
				confirmLabel: "Block visitors",
			}))
		) {
			document.getElementById("blocked-toggle").checked = false;
			return;
		}
	}
	try {
		const result = await adminRequest("/api/admin/blocked", {
			method: "POST",
			body: JSON.stringify({
				blocked,
				blockedUntil:
					blocked && blockedUntil ? new Date(blockedUntil).toISOString() : null,
			}),
		});
		savedBlockedState = result.blocked;
		if (!blocked) document.getElementById("blocked-until").value = "";
		const isBlocked = await closeAdminPanelIfBlocked();
		if (isBlocked) return;
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

function scheduleBlockExpiryCheck(blockedUntil) {
	window.clearTimeout(blockExpiryTimer);
	blockExpiryTimer = null;
	if (!Number.isSafeInteger(blockedUntil) || blockedUntil <= Date.now()) return;

	const delay = Math.min(blockedUntil - Date.now(), 2_147_483_647);
	blockExpiryTimer = window.setTimeout(() => {
		if (Date.now() < blockedUntil) {
			scheduleBlockExpiryCheck(blockedUntil);
			return;
		}
		void refreshBlockedState();
	}, delay);
}

blockedOverlay.addEventListener("animationend", (event) => {
	if (
		event.target !== blockedOverlay ||
		event.animationName !== "blocked-overlay-exit"
	) {
		return;
	}
	blockedOverlay.classList.remove("is-leaving");
	blockedOverlay.hidden = !document.documentElement.hasAttribute(
		"data-blocked-at-start"
	);
});

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
		const response = await fetchWithTimeout(
			"/api/admin/browser-state",
			{ cache: "no-store" },
			10000,
			"Browser state request"
		);
		if (!response.ok) {
			return document.documentElement.hasAttribute("data-blocked-at-start");
		}
		const state = await response.json();
		const { refreshToken, refreshSource } = state;
		if (typeof state.blocked !== "boolean") {
			return document.documentElement.hasAttribute("data-blocked-at-start");
		}
		const blockExpired =
			Number.isSafeInteger(state.blockedUntil) &&
			state.blockedUntil <= Date.now();
		const blocked = state.blocked && !blockExpired;
		scheduleBlockExpiryCheck(blocked ? state.blockedUntil : null);
		const incomingSharedLinks = Array.isArray(state.sharedLinks)
			? state.sharedLinks
			: [];
		const sharedLinksState = JSON.stringify(incomingSharedLinks);
		if (sharedLinksState !== renderedSharedLinks) {
			sharedLinks = incomingSharedLinks;
			renderedSharedLinks = sharedLinksState;
			renderQuickLinks();
		}
		document.documentElement.toggleAttribute("data-blocked-at-start", blocked);
		if (blocked) {
			blockedOverlay.classList.remove("is-leaving");
			blockedOverlay.hidden = false;
		} else if (
			!blockedOverlay.hidden &&
			!blockedOverlay.classList.contains("is-leaving")
		) {
			blockedOverlay.classList.add("is-leaving");
		}
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

async function closeAdminPanelIfBlocked() {
	const blocked = await refreshBlockedState();
	if (blocked && adminDialog.open) adminDialog.close();
	return blocked;
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

function getErrorLog(error, seen = new Set()) {
	if (!(error instanceof Error)) return String(error);
	if (seen.has(error)) return "[Circular error cause]";
	seen.add(error);
	const log = error.stack || `${error.name}: ${error.message}`;
	if (error.cause instanceof Error) {
		return `${log}\n\nCaused by:\n${getErrorLog(error.cause, seen)}`;
	}
	return log;
}

function showError(message, detail = "", logs = detail) {
	error.textContent = message;
	errorCode.textContent = logs;
	errorVersion.textContent = scramjetVersion === "v1" ? "V1.1.0" : "V2";
	errorDetails.hidden = !logs;
	errorDetails.open = false;
	statusBlock.hidden = !message && !detail && !logs;
}

function getV2IncompatibleSite(url) {
	if (scramjetVersion !== "v2") return null;
	let hostname;
	try {
		hostname = new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}

	if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
		return "TikTok";
	}
	if (hostname === "geforcenow.com" || hostname.endsWith(".geforcenow.com")) {
		return "GeForce NOW";
	}
	return null;
}

function showConfirmation({ title, message, confirmLabel }) {
	confirmationTitle.textContent = title;
	confirmationMessage.textContent = message;
	confirmationAccept.textContent = confirmLabel;
	confirmationDialog.returnValue = "";
	return new Promise((resolve) => {
		confirmationDialog.addEventListener(
			"close",
			() => resolve(confirmationDialog.returnValue === "confirm"),
			{ once: true }
		);
		confirmationDialog.showModal();
	});
}

function setLoading(isLoading, tab = activeTab()) {
	if (!tab) return;
	tab.loading = isLoading;
	if (tab.id === activeTabId) progress.classList.toggle("loading", isLoading);
}

function waitForTransportStage(
	promise,
	stage,
	timeoutMs = transportStageTimeout
) {
	let timeout;
	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timeout = window.setTimeout(
				() => reject(new Error(`${stage} timed out. Reload and try again.`)),
				timeoutMs
			);
		}),
	]).finally(() => window.clearTimeout(timeout));
}

function fetchWithTimeout(url, options, timeout, stage) {
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), timeout);
	return fetch(url, { ...options, signal: controller.signal })
		.catch((error) => {
			if (controller.signal.aborted) {
				throw new Error(
					`${stage} timed out. Check your connection and try again.`
				);
			}
			throw error;
		})
		.finally(() => window.clearTimeout(timer));
}

function toEpoxyHeaders(headers) {
	if (!headers) return [];
	if (typeof headers[Symbol.iterator] === "function") {
		return Array.from(headers, ([name, value]) => [name, value]);
	}
	return Object.entries(headers).flatMap(([name, value]) =>
		(Array.isArray(value) ? value : [value]).map((entry) => [name, entry])
	);
}

function toBareHeaders(headers) {
	const result = Object.create(null);
	for (const [name, value] of toEpoxyHeaders(headers)) {
		const key = name.toLowerCase();
		if (!Object.hasOwn(result, key)) {
			result[key] = value;
		} else if (Array.isArray(result[key])) {
			result[key].push(value);
		} else {
			result[key] = [result[key], value];
		}
	}
	return result;
}

function waitForScramjetV1Config(serviceWorker) {
	return new Promise((resolve, reject) => {
		const channel = new MessageChannel();
		let timeout;
		const cleanup = () => {
			window.clearTimeout(timeout);
			channel.port1.close();
			channel.port2.close();
		};
		channel.port1.onmessage = ({ data }) => {
			cleanup();
			if (data?.ready === true) {
				resolve();
			} else {
				reject(
					new Error(
						data?.error ||
							"Scramjet V1 service worker did not confirm its configuration."
					)
				);
			}
		};
		channel.port1.onmessageerror = () => {
			cleanup();
			reject(
				new Error(
					"Scramjet V1 service worker returned an invalid configuration response."
				)
			);
		};
		timeout = window.setTimeout(() => {
			cleanup();
			reject(
				new Error(
					"Timed out waiting for the Scramjet V1 service worker configuration."
				)
			);
		}, transportStageTimeout);
		try {
			serviceWorker.postMessage(
				{ type: "CLASSROOM_V1_CONFIG_READY" },
				[channel.port2]
			);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
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
	const incompatibleSite = getV2IncompatibleSite(url);
	if (incompatibleSite !== tab.compatibilityWarningSite) {
		tab.compatibilityWarningSite = incompatibleSite;
		if (incompatibleSite && tab.id === activeTabId) {
			compatibilityTitle.textContent = `${incompatibleSite} works best on V1`;
			compatibilityMessage.textContent = `${incompatibleSite} may not work correctly on SE (V2). Switch to SE (V1.1.0) for a better experience.`;
			if (!compatibilityDialog.open) compatibilityDialog.showModal();
		}
	}
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
	const nativeFrame = controller.createFrame();
	const frame =
		scramjetVersion === "v1"
			? {
					element: nativeFrame.frame,
					prefix: legacyScramjetPrefix,
					go: (url) => nativeFrame.go(url),
					back: () => nativeFrame.back(),
					forward: () => nativeFrame.forward(),
					reload: () => nativeFrame.reload(),
				}
			: nativeFrame;
	frame.element.className = "page-frame";
	frame.element.title = tab.title;
	frame.element.hidden = true;
	frame.element.addEventListener("load", () => {
		try {
			if (frame.element.contentWindow.location.href === "about:blank") return;
		} catch {
			// A cross-origin load is complete even if its URL cannot be inspected.
		}
		window.clearTimeout(tab.navigationTimer);
		tab.navigationTimer = null;
		try {
			const frameUrl = new URL(frame.element.contentWindow.location.href);
			const decodedUrl =
				scramjetVersion === "v1"
					? controller.decodeUrl(frameUrl)
					: controller.config.codec.decode(
							frameUrl.pathname.slice(
								new URL(frame.prefix, location.href).pathname.length
							)
						);
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
			await waitForTransportStage(
				window.CLASSROOM_SCRAMJET_RUNTIME_READY,
				"Scramjet assets"
			);
			const wispUrl = "wss://wisp-server-python-nh0a.onrender.com/";
			if (scramjetVersion === "v1") {
				if (
					typeof window.BareMux?.BareMuxConnection !== "function" ||
					typeof window.EpoxyTransport?.default !== "function"
				) {
					throw new Error(
						"Scramjet v1 transport assets did not initialize. Reload the page and try again."
					);
				}
				const connection = new window.BareMux.BareMuxConnection(
					"/baremux/worker.js"
				);
				const EpoxyTransport = window.EpoxyTransport.default;
				const epoxyTransport = new EpoxyTransport({ wisp: wispUrl });
				const transport = {
					get ready() {
						return epoxyTransport.ready;
					},
					init: () => epoxyTransport.init(),
					request: async (remote, method, body, headers, signal) => {
						const response = await epoxyTransport.request(
							remote,
							method,
							body,
							toEpoxyHeaders(headers),
							signal
						);
						return {
							...response,
							headers: toBareHeaders(response.headers),
						};
					},
					connect: (url, protocols, headers, ...handlers) =>
						epoxyTransport.connect(
							url,
							protocols,
							toEpoxyHeaders(headers),
							...handlers
						),
					meta: () => epoxyTransport.meta(),
				};
				await waitForTransportStage(
					connection.setRemoteTransport(transport, "EpoxyTransport"),
					"Scramjet v1 transport setup"
				);
			}

			const registration = await waitForTransportStage(
				registerSW(),
				"Scramjet service worker",
				serviceWorkerTimeout * 2
			);
			const serviceWorker = navigator.serviceWorker.controller;
			if (!serviceWorker)
				throw new Error("Scramjet service worker is unavailable.");
			if (serviceWorker.scriptURL !== registration.active?.scriptURL) {
				throw new Error(
					"The selected Scramjet service worker is not controlling this page."
				);
			}

			if (scramjetVersion === "v1") {
				if (typeof window.$scramjetLoadController !== "function") {
					throw new Error(
						"Scramjet v1 controller API did not load. Reload the page and try again."
					);
				}
				const { ScramjetController } = window.$scramjetLoadController();
				if (typeof ScramjetController !== "function") {
					throw new Error("Scramjet v1 controller is unavailable.");
				}
				controller = new ScramjetController({
					prefix: legacyScramjetPrefix,
					files: {
						wasm: "/scram/scramjet.wasm.wasm",
						all: "/scram-v1/scramjet.all.js",
						sync: "/scram/scramjet.sync.js",
					},
					flags: {
						captureErrors: false,
					},
				});
				await waitForTransportStage(
					controller.init(),
					"Scramjet v1 controller setup"
				);
				await waitForTransportStage(
					waitForScramjetV1Config(serviceWorker),
					"Scramjet v1 service worker configuration",
					serviceWorkerTimeout * 2
				);
				return;
			}

			const api = window.$scramjetController;
			if (typeof api?.Controller !== "function") {
				throw new Error("Scramjet v2 controller API did not load.");
			}
			if (typeof window.LibcurlTransport?.LibcurlClient !== "function") {
				throw new Error("Scramjet v2 transport asset did not load.");
			}
			api.config.injectPath = "/controller/controller.inject.js";
			api.config.scramjetPath = "/scramjet/scramjet.js";
			api.config.wasmPath = "/scramjet/scramjet.wasm";
			const transport = new window.LibcurlTransport.LibcurlClient({
				wisp: wispUrl,
			});
			controller = new api.Controller({
				serviceworker: serviceWorker,
				transport,
			});
			await waitForTransportStage(
				controller.wait(),
				"Scramjet v2 controller setup"
			);
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
	window.clearTimeout(tab.navigationTimer);
	tab.navigationTimer = null;
	setLoading(true, tab);
	try {
		await prepareTransport();
		tab.home = false;
		updateTabUrl(tab, url);
		const frame = createFrame(tab);
		frame.element.hidden = tab.id !== activeTabId;
		frame.go(url);
		window.clearTimeout(tab.navigationTimer);
		tab.navigationTimer = window.setTimeout(() => {
			tab.navigationTimer = null;
			setLoading(false, tab);
			if (tab.id === activeTabId) {
				const timeoutError = new Error(
					"Check the selected Scramjet version and transport connection, then retry."
				);
				console.error("[Classroom] Proxied page load timed out.", {
					version: scramjetVersion,
					error: timeoutError,
				});
				showError(
					"This page is taking too long to load.",
					timeoutError.message,
					getErrorLog(timeoutError)
				);
			}
		}, 30000);
		setLoading(true, tab);
		syncBrowser();
	} catch (err) {
		setLoading(false, tab);
		console.error("[Classroom] Unable to open proxied page.", {
			version: scramjetVersion,
			error: err,
		});
		showError(
			"Unable to open this page.",
			err instanceof Error ? err.message : String(err),
			getErrorLog(err)
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
		compatibilityWarningSite: null,
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
	window.clearTimeout(tab.navigationTimer);
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
	window.clearTimeout(tab.navigationTimer);
	tab.navigationTimer = null;
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

address.addEventListener("keydown", (event) => {
	if (event.key !== "Enter") return;
	event.preventDefault();
	form.requestSubmit();
});

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
document
	.getElementById("sj-error-close")
	.addEventListener("click", () => showError(""));
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
			if (await closeAdminPanelIfBlocked()) return;
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
		!(await showConfirmation({
			title: "Refresh other pages?",
			message:
				"Other open Classroom pages will refresh and may lose their current page.",
			confirmLabel: "Refresh pages",
		}))
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
if (new URLSearchParams(location.search).get("admin") === "1") {
	openAdminDialog();
}

async function finishStartup() {
	const blocked = await refreshBlockedState();
	if (blocked) {
		startupScreen.hidden = true;
		return;
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
