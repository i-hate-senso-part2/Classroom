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
const userSettingsDialog = document.getElementById("user-settings-dialog");
const blockedOverlay = document.getElementById("blocked-overlay");
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
	customThemes: Object.freeze([]),
	defaultCustomTheme: Object.freeze({
		background: "#e5eee6",
		surface: "#f1f5ef",
		accent: "#c3e957",
		text: "#1b3024",
	}),
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
let arrowSequenceIndex = 0;
const arrowSequence = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowDown"];

try {
	bookmarks = JSON.parse(localStorage.getItem("classroom-bookmarks") || "[]");
	if (!Array.isArray(bookmarks)) bookmarks = [];
} catch {
	bookmarks = [];
}

function validColor(value, fallback) {
	return typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
		? value
		: fallback;
}

function sanitizeCustomThemes(themes) {
	if (!Array.isArray(themes)) return [];
	return themes
		.filter(
			(theme) =>
				theme &&
				typeof theme.id === "string" &&
				theme.id.startsWith("custom-") &&
				typeof theme.name === "string"
		)
		.slice(0, 20)
		.map((theme) => ({
			id: theme.id,
			name: theme.name.trim().slice(0, 28) || "Custom theme",
			colors: {
				background: validColor(
					theme.colors?.background,
					DEFAULT_USER_SETTINGS.defaultCustomTheme.background
				),
				surface: validColor(
					theme.colors?.surface,
					DEFAULT_USER_SETTINGS.defaultCustomTheme.surface
				),
				accent: validColor(
					theme.colors?.accent,
					DEFAULT_USER_SETTINGS.defaultCustomTheme.accent
				),
				text: validColor(
					theme.colors?.text,
					DEFAULT_USER_SETTINGS.defaultCustomTheme.text
				),
			},
		}));
}

function loadUserSettings() {
	try {
		const stored = JSON.parse(
			localStorage.getItem("classroom-user-settings") || "null"
		);
		if (stored && typeof stored === "object") {
			const customThemes = sanitizeCustomThemes(stored.customThemes);
			if (stored.customTheme && customThemes.length === 0) {
				customThemes.push({
					id: "custom-default",
					name: "My theme",
					colors: {
						background: validColor(
							stored.customTheme.background,
							DEFAULT_USER_SETTINGS.defaultCustomTheme.background
						),
						surface: validColor(
							stored.customTheme.surface,
							DEFAULT_USER_SETTINGS.defaultCustomTheme.surface
						),
						accent: validColor(
							stored.customTheme.accent,
							DEFAULT_USER_SETTINGS.defaultCustomTheme.accent
						),
						text: validColor(
							stored.customTheme.text,
							DEFAULT_USER_SETTINGS.defaultCustomTheme.text
						),
					},
				});
			}
			const storedTheme =
				stored.theme === "custom" ? "custom-default" : stored.theme;
			return {
				theme:
					BUILT_IN_THEMES.has(storedTheme) ||
					customThemes.some((theme) => theme.id === storedTheme)
						? storedTheme
						: "moss",
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
				customThemes,
			};
		}
		const previousTheme = localStorage.getItem("classroom-theme");
		return {
			...DEFAULT_USER_SETTINGS,
			theme: previousTheme === "dark" ? "midnight" : "moss",
			customThemes: [],
		};
	} catch {
		return {
			...DEFAULT_USER_SETTINGS,
			customThemes: [],
		};
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

const CUSTOM_THEME_PROPERTIES = [
	"--background",
	"--chrome",
	"--chrome-raised",
	"--tab-inactive",
	"--text",
	"--muted",
	"--home-muted",
	"--accent",
	"--accent-warm",
	"--hover",
	"--field",
	"--menu",
	"--menu-active",
	"--field-text",
	"--home",
	"--home-title",
	"--home-card",
	"--home-icon",
	"--line",
	"--home-card-border",
	"--home-grid",
	"--surface-shadow",
];

function renderThemeOptions(settings) {
	const select = document.getElementById("theme-select");
	select
		.querySelectorAll("[data-custom-theme]")
		.forEach((option) => option.remove());
	for (const theme of settings.customThemes) {
		const option = document.createElement("option");
		option.value = theme.id;
		option.textContent = theme.name;
		option.dataset.customTheme = "true";
		select.append(option);
	}
	select.value = settings.theme;
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
	for (const property of CUSTOM_THEME_PROPERTIES) {
		root.style.removeProperty(property);
	}
	const theme = settings.customThemes.find(
		(item) => item.id === settings.theme
	);
	if (theme) {
		const { background, surface, accent, text } = theme.colors;
		const customProperties = {
			"--background": background,
			"--home": background,
			"--chrome": surface,
			"--chrome-raised": surface,
			"--tab-inactive": surface,
			"--field": surface,
			"--menu": surface,
			"--text": text,
			"--muted": `color-mix(in srgb, ${text} 64%, transparent)`,
			"--home-muted": `color-mix(in srgb, ${text} 64%, transparent)`,
			"--home-title": text,
			"--field-text": text,
			"--menu-text": text,
			"--hover": `color-mix(in srgb, ${surface} 84%, ${text})`,
			"--menu-active": `color-mix(in srgb, ${surface} 84%, ${text})`,
			"--accent": accent,
			"--accent-warm": accent,
			"--home-icon": surface,
			"--home-card": `color-mix(in srgb, ${surface} 82%, white)`,
			"--line": `color-mix(in srgb, ${text} 16%, transparent)`,
			"--home-card-border": `color-mix(in srgb, ${text} 16%, transparent)`,
			"--home-grid": `color-mix(in srgb, ${text} 6%, transparent)`,
			"--surface-shadow": `color-mix(in srgb, ${text} 14%, transparent)`,
		};
		for (const [property, value] of Object.entries(customProperties)) {
			root.style.setProperty(property, value);
		}
	}
	for (const tab of tabs) {
		tab.cloak =
			settings.defaultCloak === "normal" ? null : settings.defaultCloak;
	}
	if (tabs.length) syncBrowser();
	renderThemeOptions(settings);
	document.getElementById("background-select").value = settings.background;
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = !settings.backgroundImage;
	preview.src = settings.backgroundImage || "";
	document.getElementById("remove-background-image").hidden =
		!settings.backgroundImage;
	const customControls = document.getElementById("custom-theme-controls");
	customControls.hidden = !theme;
	document.getElementById("delete-custom-theme").hidden = !theme;
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
	const settings = {
		...settingsDraft,
		customThemes: settingsDraft.customThemes.map((theme) => ({
			...theme,
			colors: { ...theme.colors },
		})),
		theme: document.getElementById("theme-select").value,
		background: document.getElementById("background-select").value,
		defaultCloak: document.getElementById("default-cloak-select").value,
	};
	const theme = settings.customThemes.find(
		(item) => item.id === settings.theme
	);
	if (theme) {
		theme.name =
			document.getElementById("custom-theme-name").value.trim() ||
			"Custom theme";
		theme.colors = {
			background: document.getElementById("custom-background-color").value,
			surface: document.getElementById("custom-surface-color").value,
			accent: document.getElementById("custom-accent-color").value,
			text: document.getElementById("custom-text-color").value,
		};
	}
	return settings;
}

function syncSettingsForm(settings) {
	renderThemeOptions(settings);
	document.getElementById("background-select").value = settings.background;
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const theme = settings.customThemes.find(
		(item) => item.id === settings.theme
	);
	const colors = theme?.colors || DEFAULT_USER_SETTINGS.defaultCustomTheme;
	document.getElementById("custom-theme-name").value = theme?.name || "";
	document.getElementById("custom-background-color").value = colors.background;
	document.getElementById("custom-surface-color").value = colors.surface;
	document.getElementById("custom-accent-color").value = colors.accent;
	document.getElementById("custom-text-color").value = colors.text;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = !settings.backgroundImage;
	preview.src = settings.backgroundImage || "";
	document.getElementById("remove-background-image").hidden =
		!settings.backgroundImage;
	document.getElementById("background-image-file").value = "";
	document.getElementById("custom-theme-controls").hidden = !theme;
	document.getElementById("delete-custom-theme").hidden = !theme;
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

function createCustomTheme() {
	settingsDraft = readSettingsForm();
	if (settingsDraft.customThemes.length >= 20) {
		document.getElementById("user-settings-message").textContent =
			"You can save up to 20 custom themes.";
		return;
	}
	const id = `custom-${crypto.randomUUID()}`;
	settingsDraft.customThemes.push({
		id,
		name: "My theme",
		colors: { ...DEFAULT_USER_SETTINGS.defaultCustomTheme },
	});
	settingsDraft.theme = id;
	syncSettingsForm(settingsDraft);
	applyUserSettings(settingsDraft);
}

function deleteCustomTheme() {
	settingsDraft = readSettingsForm();
	settingsDraft.customThemes = settingsDraft.customThemes.filter(
		(theme) => theme.id !== settingsDraft.theme
	);
	settingsDraft.theme = "moss";
	syncSettingsForm(settingsDraft);
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
		if (!response.ok) return false;
		const { blocked } = await response.json();
		blockedOverlay.hidden = !blocked;
		return blocked;
	} catch {
		return false;
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
			const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
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
document.getElementById("theme-select").addEventListener("change", () => {
	const currentTheme = settingsDraft.customThemes.find(
		(theme) => theme.id === settingsDraft.theme
	);
	if (currentTheme) {
		currentTheme.name =
			document.getElementById("custom-theme-name").value.trim() ||
			"Custom theme";
		currentTheme.colors = {
			background: document.getElementById("custom-background-color").value,
			surface: document.getElementById("custom-surface-color").value,
			accent: document.getElementById("custom-accent-color").value,
			text: document.getElementById("custom-text-color").value,
		};
	}
	settingsDraft.theme = document.getElementById("theme-select").value;
	syncSettingsForm(settingsDraft);
	applyUserSettings(settingsDraft);
});
for (const id of [
	"background-select",
	"default-cloak-select",
	"custom-theme-name",
	"custom-background-color",
	"custom-surface-color",
	"custom-accent-color",
	"custom-text-color",
]) {
	document.getElementById(id).addEventListener("input", previewUserSettings);
	document.getElementById(id).addEventListener("change", previewUserSettings);
}
document
	.getElementById("create-custom-theme")
	.addEventListener("click", createCustomTheme);
document
	.getElementById("delete-custom-theme")
	.addEventListener("click", deleteCustomTheme);
document
	.getElementById("background-image-file")
	.addEventListener("change", async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			settingsDraft = readSettingsForm();
			settingsDraft.backgroundImage = await encodeBackgroundImage(file);
			settingsDraft.background = "image";
			syncSettingsForm(settingsDraft);
			applyUserSettings(settingsDraft);
			document.getElementById("user-settings-message").textContent =
				"Background preview ready. Save settings to keep it.";
		} catch (error) {
			document.getElementById("user-settings-message").textContent =
				error.message;
			event.target.value = "";
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
	userSettings = {
		...DEFAULT_USER_SETTINGS,
		customThemes: [],
	};
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
window.setInterval(refreshBlockedState, 60000);
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) refreshBlockedState();
});
window.addEventListener("pagehide", () => setLoading(false));
