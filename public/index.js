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
const unsupportedSiteDialog = document.getElementById("unsupported-site-dialog");
const pendingCompatibilityNavigationKey =
	"classroom-pending-compatibility-navigation";
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
const errorSource = document.getElementById("sj-error-source");
const tabList = document.getElementById("tab-list");
const frameHost = document.getElementById("frame-host");
const homeScreen = document.getElementById("home-screen");
const gamesScreen = document.getElementById("games-screen");
const gameGrid = document.getElementById("game-grid");
const progress = document.getElementById("browser-progress");
const quickLinks = document.getElementById("quick-links");
const startupScreen = document.getElementById("startup-screen");
const testingOverlay = document.getElementById("testing-overlay");
const testingOverlayClose = document.getElementById("testing-overlay-close");
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
		label: "Chess",
		url: "https://www.chess.com/",
		logo: "/logos/chess.png",
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
		{
		label: "ChatGPT",
		url: "https://chatgpt.com",
		logo: "/logos/chatgpt.png",
	},
		{
		label: "Claude",
		url: "https://www.claude.ai/",
		logo: "/logos/claude.webp",
	},
];
const cloakTemplates = [
	{ id: "normal", title: "", logo: "/sj.png" },
	{ id: "kahoot", title: "Enter Game PIN - Kahoot!", logo: "/logos/kahoot.png" },
	{ id: "google", title: "Google", logo: "/logos/google-circle.png" },
	{ id: "classroom", title: "Home - Classroom", logo: "/logos/classroom.png" },
	{ id: "wikipedia", title: "Wikipedia", logo: "/logos/wikipedia.webp" },
];
const CLOAK_NAMES = new Set(cloakTemplates.map((template) => template.id));
const IMAGE_DATA_URL =
	/^data:image\/(?:png|jpeg|webp|gif);base64,[\da-z+/]+=*$/i;
const THEME_COLORS = Object.freeze({
	background: "#0c100e",
	surface: "#151a17",
	text: "#e8eee8",
	accent: "#c4e879",
});
const THEME_COLOR_KEYS = Object.keys(THEME_COLORS);
const VIDEO_BACKGROUND_MAX_BYTES = 50 * 1024 * 1024;
const TESTING_OVERLAY_SEARCH_CHANCE = 1 / 10000;
const THEME_ASSET_DB_NAME = "classroom-theme-assets";
const THEME_ASSET_STORE = "videos";
const LEGACY_THEME_COLORS = {
	moss: THEME_COLORS,
	midnight: {
		background: "#0c1016",
		surface: "#151b24",
		text: "#e8edf5",
		accent: "#9ac5ff",
	},
	sunset: {
		...THEME_COLORS,
		accent: "#ff967b",
	},
	ocean: {
		...THEME_COLORS,
		accent: "#69d6cb",
	},
};
let hasUserTheme = false;
let savedVideoObjectUrl = "";
let previewVideoFile = null;
let previewVideoObjectUrl = "";
let backgroundVideoError = "";
let activeTabId = null;
let tabSequence = 0;
let controller;
let controllerReady;
const transportStageTimeout = 15000;
const wispEndpoints = Array.isArray(window.SCRAMJET_APP_CONFIG?.wispEndpoints)
	? [...new Set(window.SCRAMJET_APP_CONFIG.wispEndpoints)]
	: [];
let nextWispEndpointIndex = 0;
let settingsDraft = null;
let bookmarks = [];
let sharedLinks = [];
let sharedLinksHistory = [];
let renderedSharedLinks = "";
let gameCatalog = [];
let gameCatalogLoading = false;
let arrowSequenceIndex = 0;
const arrowSequence = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowDown"];

try {
	bookmarks = JSON.parse(localStorage.getItem("classroom-bookmarks") || "[]");
	if (!Array.isArray(bookmarks)) bookmarks = [];
} catch {
	bookmarks = [];
}

function defaultUserSettings() {
	return {
		theme: {
			name: "",
			colors: { ...THEME_COLORS },
			backgroundType: "color",
			backgroundImage: "",
			backgroundImageOverlay: true,
			backgroundVideoUrl: "",
			backgroundVideoId: "",
			backgroundVideoStored: false,
		},
		defaultCloak: "normal",
	};
}

function isThemeColor(value) {
	return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function safeMediaUrl(value) {
	if (typeof value !== "string" || !value.trim()) return "";
	try {
		const url = new URL(value.trim(), location.href);
		if (!["http:", "https:"].includes(url.protocol)) return "";
		if (url.username || url.password) return "";
		if (location.protocol === "https:" && url.protocol !== "https:") return "";
		return url.href;
	} catch {
		return "";
	}
}

function loadUserSettings() {
	try {
		const raw = localStorage.getItem("classroom-user-settings");
		if (raw === null) {
			const legacyTheme = localStorage.getItem("classroom-theme");
			if (legacyTheme) {
				hasUserTheme = true;
				const legacyThemeName =
					legacyTheme === "dark" ? "midnight" : legacyTheme;
				return {
					...defaultUserSettings(),
					theme: {
						...defaultUserSettings().theme,
						name: "My theme",
						colors: {
							...(LEGACY_THEME_COLORS[legacyThemeName] || THEME_COLORS),
						},
					},
				};
			}
			return defaultUserSettings();
		}
		const stored = JSON.parse(raw);
		if (stored && typeof stored === "object" && stored.theme) {
			hasUserTheme = true;
			if (typeof stored.theme === "object") {
				const theme = stored.theme;
				const colors = Object.fromEntries(
					THEME_COLOR_KEYS.map((key) => [
						key,
						isThemeColor(theme.colors?.[key])
							? theme.colors[key]
							: THEME_COLORS[key],
					])
				);
				const backgroundImage =
					typeof theme.backgroundImage === "string" &&
					IMAGE_DATA_URL.test(theme.backgroundImage)
						? theme.backgroundImage
						: "";
				const backgroundVideoUrl = safeMediaUrl(theme.backgroundVideoUrl);
				const backgroundVideoId =
					typeof theme.backgroundVideoId === "string" &&
					/^[\w-]{1,100}$/.test(theme.backgroundVideoId)
						? theme.backgroundVideoId
						: "";
				const backgroundVideoStored =
					theme.backgroundVideoStored === true && Boolean(backgroundVideoId);
				const backgroundType = ["color", "image", "video"].includes(
					theme.backgroundType
				)
					? theme.backgroundType
					: "color";
				return {
					theme: {
						name:
							typeof theme.name === "string"
								? theme.name.trim().slice(0, 40)
								: "My theme",
						colors,
						backgroundType:
							(backgroundType === "image" && backgroundImage) ||
							(backgroundType === "video" &&
								(backgroundVideoUrl || backgroundVideoStored))
								? backgroundType
								: "color",
						backgroundImage,
						backgroundImageOverlay:
							theme.backgroundImageOverlay !== false,
						backgroundVideoUrl,
						backgroundVideoId,
						backgroundVideoStored,
					},
					defaultCloak: CLOAK_NAMES.has(stored.defaultCloak)
						? stored.defaultCloak
						: "normal",
				};
			}
			const themeColors =
				LEGACY_THEME_COLORS[stored.theme] || THEME_COLORS;
			const legacyImage =
				typeof stored.backgroundImage === "string" &&
				IMAGE_DATA_URL.test(stored.backgroundImage)
					? stored.backgroundImage
					: "";
			return {
				theme: {
					name: "My theme",
					colors: { ...themeColors },
					backgroundType:
						stored.background === "image" && legacyImage ? "image" : "color",
					backgroundImage: legacyImage,
					backgroundImageOverlay: true,
					backgroundVideoUrl: "",
					backgroundVideoId: "",
					backgroundVideoStored: false,
				},
				defaultCloak: CLOAK_NAMES.has(stored.defaultCloak)
					? stored.defaultCloak
					: "normal",
			};
		}
	} catch {
		hasUserTheme = false;
	}
	return defaultUserSettings();
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
	searchEngine.value =
		normalizedKey === "duckduckgo" && scramjetVersion === "v1"
			? "https://html.duckduckgo.com/html/?q=%s"
			: engine.url;

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

function selectScramjetVersion(nextVersion, urlToOpen = "") {
	if (!Object.hasOwn(versionLabels, nextVersion)) return;
	try {
		if (urlToOpen) {
			sessionStorage.setItem(pendingCompatibilityNavigationKey, urlToOpen);
		}
		localStorage.setItem("classroom-scramjet-version", nextVersion);
	} catch (err) {
		try {
			sessionStorage.removeItem(pendingCompatibilityNavigationKey);
		} catch (cleanupError) {
			console.error(
				"[Classroom] Unable to clear a pending compatibility navigation.",
				cleanupError
			);
		}
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
	.addEventListener("click", () =>
		selectScramjetVersion("v1", activeTab()?.url)
	);
document
	.getElementById("compatibility-continue")
	.addEventListener("click", () => compatibilityDialog.close());
document
	.getElementById("unsupported-site-close")
	.addEventListener("click", () => unsupportedSiteDialog.close());
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

function openThemeAssetDatabase() {
	if (!window.indexedDB) {
		return Promise.reject(new Error("Browser storage is unavailable."));
	}
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(THEME_ASSET_DB_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(THEME_ASSET_STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error || new Error("Theme storage could not be opened."));
	});
}

async function writeThemeVideo(id, file) {
	const database = await openThemeAssetDatabase();
	try {
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(THEME_ASSET_STORE, "readwrite");
			transaction.objectStore(THEME_ASSET_STORE).put(file, id);
			transaction.oncomplete = resolve;
			transaction.onerror = () =>
				reject(
					transaction.error ||
						new Error("The video background could not be saved.")
				);
			transaction.onabort = () =>
				reject(
					transaction.error ||
						new Error("The video background could not be saved.")
				);
		});
	} finally {
		database.close();
	}
}

async function readThemeVideo(id) {
	const database = await openThemeAssetDatabase();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = database.transaction(THEME_ASSET_STORE, "readonly");
			const request = transaction.objectStore(THEME_ASSET_STORE).get(id);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () =>
				reject(
					request.error ||
						new Error("The saved video background could not be read.")
				);
		});
	} finally {
		database.close();
	}
}

async function deleteThemeVideo(id) {
	if (!id) return;
	const database = await openThemeAssetDatabase();
	try {
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(THEME_ASSET_STORE, "readwrite");
			transaction.objectStore(THEME_ASSET_STORE).delete(id);
			transaction.oncomplete = resolve;
			transaction.onerror = () =>
				reject(
					transaction.error ||
						new Error("The old video background could not be removed.")
				);
			transaction.onabort = () =>
				reject(
					transaction.error ||
						new Error("The old video background could not be removed.")
				);
		});
	} finally {
		database.close();
	}
}

async function restoreSavedThemeVideo() {
	const id = userSettings.theme.backgroundVideoId;
	if (!userSettings.theme.backgroundVideoStored || !id) return;
	try {
		const file = await readThemeVideo(id);
		if (!file) throw new Error("The saved video background could not be found.");
		if (userSettings.theme.backgroundVideoId !== id) return;
		savedVideoObjectUrl = URL.createObjectURL(file);
		backgroundVideoError = "";
		applyUserSettings(settingsDraft || userSettings);
	} catch (error) {
		console.error("[Classroom] Unable to load the saved theme video.", error);
		backgroundVideoError = error.message;
		document.getElementById("user-settings-message").textContent =
			backgroundVideoError;
	}
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
		const displayTitle = tab.title;
		select.title = displayTitle;
		const favicon = document.createElement("span");
		favicon.className = "tab-favicon";
		favicon.setAttribute("aria-hidden", "true");
		const faviconImage = document.createElement("img");
		faviconImage.alt = "";
		faviconImage.addEventListener("error", () => {
			if (tab.favicon && tab.favicon !== "/sj.png") {
				console.warn("[Classroom] Unable to load the page favicon.", {
					url: tab.favicon,
				});
				setTabFavicon(tab, "/sj.png");
			}
		});
		faviconImage.src = tab.favicon || "/sj.png";
		favicon.append(faviconImage);
		const title = document.createElement("span");
		title.className = "tab-title";
		title.textContent = displayTitle;
		select.append(favicon, title);
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

function setTabFavicon(tab, faviconUrl) {
	tab.favicon = faviconUrl;
	const item = Array.from(tabList.children).find(
		(element) => element.dataset.tabId === tab.id
	);
	const image = item?.querySelector(".tab-favicon img");
	if (image) image.src = faviconUrl || "/sj.png";
}

function getTabFaviconUrl(frame, pageUrl) {
	const pageDocument = frame.element.contentDocument;
	if (!pageDocument) return null;

	const iconHref =
		pageDocument.querySelector('link[rel~="icon" i]')?.getAttribute("href") ||
		"/favicon.ico";
	const faviconUrl = new URL(iconHref, pageUrl);
	if (
		faviconUrl.protocol === "data:" &&
		faviconUrl.href.startsWith("data:image/")
	) {
		return faviconUrl.href;
	}
	if (!["http:", "https:"].includes(faviconUrl.protocol)) return null;

	const rawUrl = new URL(iconHref, location.href);
	const prefix =
		frame.prefix || controller.config?.prefix || legacyScramjetPrefix;
	const proxyPrefix = new URL(prefix, location.href).pathname;
	if (
		rawUrl.origin === location.origin &&
		rawUrl.pathname.startsWith(proxyPrefix)
	) {
		return rawUrl.href;
	}
	return new URL(controller.encodeUrl(faviconUrl), location.href).href;
}

function syncBrowser() {
	const tab = activeTab();
	if (!tab) return;
	progress.classList.toggle("loading", tab.loading);
	for (const current of tabs) {
		if (current.frame)
			current.frame.element.hidden = current.id !== activeTabId || current.home;
	}
	homeScreen.hidden = !tab.home || tab.games === true;
	gamesScreen.hidden = tab.games !== true;
	document
		.getElementById("games-open")
		.setAttribute("aria-pressed", String(tab.games === true));
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
	document.title =
		cloak?.title || (tab.games ? "Games" : tab.home ? "New tab" : tab.title);
	document.getElementById("browser-favicon").href = cloak?.logo || "/sj.png";
	if (tab.frame) tab.frame.element.title = tab.title;
	renderTabs();
}

function applyUserSettings(settings) {
	const root = document.documentElement;
	const theme = settings.theme;
	root.dataset.theme = "custom";
	root.dataset.homeBackground = theme.backgroundType;
	root.dataset.homeImageOverlay = String(theme.backgroundImageOverlay !== false);
	root.style.setProperty("--custom-background", theme.colors.background);
	root.style.setProperty("--custom-surface", theme.colors.surface);
	root.style.setProperty("--custom-text", theme.colors.text);
	root.style.setProperty("--custom-accent", theme.colors.accent);
	if (theme.backgroundType === "image" && theme.backgroundImage) {
		root.style.setProperty(
			"--home-background-image",
			`url("${theme.backgroundImage}")`
		);
	} else {
		root.style.removeProperty("--home-background-image");
	}
	const video = document.getElementById("home-background-video");
	let videoSource = "";
	if (theme.backgroundType === "video") {
		if (theme.backgroundVideoFile) {
			if (previewVideoFile !== theme.backgroundVideoFile) {
				if (previewVideoObjectUrl)
					URL.revokeObjectURL(previewVideoObjectUrl);
				previewVideoFile = theme.backgroundVideoFile;
				previewVideoObjectUrl = URL.createObjectURL(previewVideoFile);
			}
			videoSource = previewVideoObjectUrl;
		} else if (theme.backgroundVideoStored) {
			videoSource = savedVideoObjectUrl;
		} else {
			videoSource = safeMediaUrl(theme.backgroundVideoUrl);
		}
	}
	video.hidden = !videoSource;
	if (videoSource && video.dataset.source !== videoSource) {
		backgroundVideoError = "";
		video.dataset.source = videoSource;
		video.src = videoSource;
		video.load();
	} else if (!videoSource && video.dataset.source) {
		video.removeAttribute("src");
		delete video.dataset.source;
		video.load();
		backgroundVideoError = "";
	}
	for (const tab of tabs) {
		tab.cloak =
			settings.defaultCloak === "normal" ? null : settings.defaultCloak;
	}
	if (tabs.length) syncBrowser();
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = theme.backgroundType !== "image" || !theme.backgroundImage;
	preview.src = theme.backgroundImage || "";
}

function updateBackgroundControls(theme) {
	document.getElementById("background-image-controls").hidden =
		theme.backgroundType !== "image";
	document.getElementById("background-video-controls").hidden =
		theme.backgroundType !== "video";
	document.getElementById("background-media-remove").hidden =
		theme.backgroundType === "color" &&
		!theme.backgroundImage &&
		!theme.backgroundVideoStored &&
		!theme.backgroundVideoUrl;
}

function cloneUserSettings(settings) {
	return {
		defaultCloak: settings.defaultCloak,
		theme: {
			...settings.theme,
			colors: { ...settings.theme.colors },
			backgroundVideoFile: null,
		},
	};
}

async function saveUserSettings(settings) {
	const previousVideoId = userSettings.theme.backgroundVideoId || "";
	const previousVideoObjectUrl = savedVideoObjectUrl;
	const theme = { ...settings.theme };
	const videoFile = theme.backgroundVideoFile;
	delete theme.backgroundVideoFile;
	if (videoFile) {
		theme.backgroundVideoId = theme.pendingVideoId;
		theme.backgroundVideoStored = true;
	}
	delete theme.pendingVideoId;
	const savedSettings = { ...settings, theme };
	let videoWritten = false;
	try {
		if (videoFile) {
			await writeThemeVideo(theme.backgroundVideoId, videoFile);
			videoWritten = true;
		}
		localStorage.setItem("classroom-user-settings", JSON.stringify(savedSettings));
	} catch (error) {
		if (videoWritten) {
			try {
				await deleteThemeVideo(theme.backgroundVideoId);
			} catch (cleanupError) {
				console.error(
					"[Classroom] Unable to remove an unsaved theme video.",
					cleanupError
				);
			}
		}
		const message = document.getElementById("user-settings-message");
		if (message)
			message.textContent = error.message;
		return false;
	}
	userSettings = savedSettings;
	hasUserTheme = true;
	if (videoFile) {
		if (
			previousVideoObjectUrl &&
			previousVideoObjectUrl !== previewVideoObjectUrl
		) {
			URL.revokeObjectURL(previousVideoObjectUrl);
		}
		savedVideoObjectUrl = previewVideoObjectUrl;
		previewVideoObjectUrl = "";
		previewVideoFile = null;
	}
	if (previousVideoId && previousVideoId !== theme.backgroundVideoId) {
		try {
			await deleteThemeVideo(previousVideoId);
		} catch (error) {
			console.error(
				"[Classroom] Theme saved, but the previous video could not be removed.",
				error
			);
			document.getElementById("user-settings-message").textContent =
				`Theme saved, but the previous video could not be removed: ${error.message}`;
		}
		if (!videoFile && previousVideoObjectUrl) {
			URL.revokeObjectURL(previousVideoObjectUrl);
			savedVideoObjectUrl = "";
		}
	}
	return true;
}

function bytesToBase64(bytes) {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}

function base64ToBytes(value) {
	const binary = atob(value);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encodeBackupValue(value, seen = new WeakSet()) {
	if (value instanceof Blob) {
		return {
			__classroomBackupType: "Blob",
			type: value.type,
			data: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
		};
	}
	if (value instanceof Date) {
		return { __classroomBackupType: "Date", value: value.toISOString() };
	}
	if (value instanceof ArrayBuffer) {
		return {
			__classroomBackupType: "ArrayBuffer",
			data: bytesToBase64(new Uint8Array(value)),
		};
	}
	if (ArrayBuffer.isView(value)) {
		return {
			__classroomBackupType: value.constructor.name,
			data: bytesToBase64(
				new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
			),
		};
	}
	if (Array.isArray(value)) {
		const items = [];
		for (const item of value) items.push(await encodeBackupValue(item, seen));
		return items;
	}
	if (value && typeof value === "object") {
		if (seen.has(value)) {
			throw new Error("A circular value cannot be included in this backup.");
		}
		seen.add(value);
		const entries = [];
		for (const [key, item] of Object.entries(value)) {
			entries.push([key, await encodeBackupValue(item, seen)]);
		}
		seen.delete(value);
		return Object.fromEntries(entries);
	}
	return value;
}

function decodeBackupValue(value) {
	if (Array.isArray(value)) return value.map(decodeBackupValue);
	if (!value || typeof value !== "object") return value;
	const type = value.__classroomBackupType;
	if (type === "Blob") {
		return new Blob([base64ToBytes(value.data)], { type: value.type || "" });
	}
	if (type === "Date") return new Date(value.value);
	if (type === "ArrayBuffer") {
		return base64ToBytes(value.data).buffer;
	}
	if (type && value.data) {
		const bytes = base64ToBytes(value.data);
		const viewType = globalThis[type];
		if (typeof viewType === "function" && viewType.BYTES_PER_ELEMENT) {
			return new viewType(
				bytes.buffer,
				bytes.byteOffset,
				Math.floor(bytes.byteLength / viewType.BYTES_PER_ELEMENT)
			);
		}
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [key, decodeBackupValue(item)])
	);
}

function openBackupDatabase(name, version, stores) {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name, version);
		request.addEventListener("upgradeneeded", () => {
			for (const store of stores) {
				if (!request.result.objectStoreNames.contains(store)) {
					request.result.createObjectStore(store);
				}
			}
		});
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() =>
				reject(
					request.error ||
						new Error(`Could not open the local ${name} database.`)
				),
			{ once: true }
		);
		request.addEventListener(
			"blocked",
			() =>
				reject(
					new Error(`Close other Classroom tabs before backing up ${name}.`)
				),
			{ once: true }
		);
	});
}

function requestAsPromise(request) {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(request.error || new Error("IndexedDB request failed.")),
			{ once: true }
		);
	});
}

function transactionAsPromise(transaction) {
	return new Promise((resolve, reject) => {
		transaction.addEventListener("complete", resolve, { once: true });
		transaction.addEventListener(
			"abort",
			() =>
				reject(
					transaction.error || new Error("IndexedDB transaction aborted.")
				),
			{ once: true }
		);
		transaction.addEventListener(
			"error",
			() =>
				reject(transaction.error || new Error("IndexedDB transaction failed.")),
			{ once: true }
		);
	});
}

async function readBackupStore(databaseName, version, stores, storeName) {
	const database = await openBackupDatabase(databaseName, version, stores);
	try {
		const transaction = database.transaction(storeName, "readonly");
		const finished = transactionAsPromise(transaction);
		const store = transaction.objectStore(storeName);
		const [keys, values] = await Promise.all([
			requestAsPromise(store.getAllKeys()),
			requestAsPromise(store.getAll()),
			finished,
		]);
		return Promise.all(
			keys.map(async (key, index) => ({
				key: await encodeBackupValue(key),
				value: await encodeBackupValue(values[index]),
			}))
		);
	} finally {
		database.close();
	}
}

async function writeBackupStore(
	databaseName,
	version,
	stores,
	storeName,
	records
) {
	const database = await openBackupDatabase(databaseName, version, stores);
	try {
		const transaction = database.transaction(storeName, "readwrite");
		const finished = transactionAsPromise(transaction);
		const store = transaction.objectStore(storeName);
		store.clear();
		for (const record of records) {
			store.put(decodeBackupValue(record.value), decodeBackupValue(record.key));
		}
		await finished;
	} finally {
		database.close();
	}
}

const backupDatabases = Object.freeze({
	v1: {
		name: "$classroom-scramjet-v1",
		version: 3,
		stores: [
			"config",
			"cookies",
			"redirectTrackers",
			"referrerPolicies",
			"publicSuffixList",
		],
		store: "cookies",
	},
	v2: {
		name: "__scramjet_controller",
		version: 1,
		stores: ["state"],
		store: "state",
	},
	theme: {
		name: THEME_ASSET_DB_NAME,
		version: 1,
		stores: [THEME_ASSET_STORE],
		store: THEME_ASSET_STORE,
	},
});

async function createLocalBackup() {
	const localStorageData = {};
	for (let index = 0; index < localStorage.length; index++) {
		const key = localStorage.key(index);
		if (key?.startsWith("classroom-")) {
			localStorageData[key] = localStorage.getItem(key);
		}
	}
	const [v1Cookies, v2Cookies, themeVideos] = await Promise.all([
		readBackupStore(
			backupDatabases.v1.name,
			backupDatabases.v1.version,
			backupDatabases.v1.stores,
			backupDatabases.v1.store
		),
		readBackupStore(
			backupDatabases.v2.name,
			backupDatabases.v2.version,
			backupDatabases.v2.stores,
			backupDatabases.v2.store
		),
		readBackupStore(
			backupDatabases.theme.name,
			backupDatabases.theme.version,
			backupDatabases.theme.stores,
			backupDatabases.theme.store
		),
	]);
	return {
		format: "classroom-local-backup",
		version: 1,
		createdAt: new Date().toISOString(),
		localStorage: localStorageData,
		proxyCookies: { v1: v1Cookies, v2: v2Cookies },
		themeVideos,
	};
}

async function deriveBackupKey(passphrase, salt) {
	const material = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"]
	);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);
}

async function encryptLocalBackup(backup, passphrase) {
	if (!crypto.subtle) {
		throw new Error(
			"Encrypted backups require HTTPS or a secure local connection."
		);
	}
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveBackupKey(passphrase, salt);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		new TextEncoder().encode(JSON.stringify(backup))
	);
	return {
		format: "classroom-encrypted-backup",
		version: 1,
		kdf: "PBKDF2-SHA-256",
		iterations: 310000,
		cipher: "AES-256-GCM",
		salt: bytesToBase64(salt),
		iv: bytesToBase64(iv),
		data: bytesToBase64(new Uint8Array(encrypted)),
	};
}

async function decryptLocalBackup(envelope, passphrase) {
	if (
		!crypto.subtle ||
		envelope?.format !== "classroom-encrypted-backup" ||
		envelope.version !== 1 ||
		envelope.kdf !== "PBKDF2-SHA-256" ||
		envelope.iterations !== 310000 ||
		envelope.cipher !== "AES-256-GCM" ||
		typeof envelope.salt !== "string" ||
		typeof envelope.iv !== "string" ||
		typeof envelope.data !== "string"
	) {
		throw new Error("This is not a supported Classroom encrypted backup.");
	}
	const key = await deriveBackupKey(passphrase, base64ToBytes(envelope.salt));
	try {
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
			key,
			base64ToBytes(envelope.data)
		);
		return JSON.parse(new TextDecoder().decode(decrypted));
	} catch {
		throw new Error(
			"The passphrase is incorrect or the backup file is damaged."
		);
	}
}

function validateLocalBackup(backup) {
	if (
		backup?.format !== "classroom-local-backup" ||
		backup.version !== 1 ||
		!backup.localStorage ||
		typeof backup.localStorage !== "object" ||
		Array.isArray(backup.localStorage) ||
		!backup.proxyCookies ||
		!Array.isArray(backup.proxyCookies.v1) ||
		!Array.isArray(backup.proxyCookies.v2) ||
		!Array.isArray(backup.themeVideos)
	) {
		throw new Error(
			"The decrypted file does not contain a valid Classroom backup."
		);
	}
	if (
		Object.entries(backup.localStorage).some(
			([key]) => !key.startsWith("classroom-")
		) ||
		Object.values(backup.localStorage).some(
			(value) => typeof value !== "string"
		)
	) {
		throw new Error("The backup contains invalid local settings.");
	}
	for (const records of [
		backup.proxyCookies.v1,
		backup.proxyCookies.v2,
		backup.themeVideos,
	]) {
		if (
			records.some(
				(record) =>
					!record ||
					typeof record !== "object" ||
					!("key" in record) ||
					!("value" in record)
			)
		) {
			throw new Error("The backup contains invalid local database data.");
		}
	}
}

function backupPassphrase() {
	const passphrase = document.getElementById("backup-passphrase").value;
	if (passphrase.length < 12) {
		throw new Error("Choose a passphrase with at least 12 characters.");
	}
	return passphrase;
}

function showBackupMessage(message, isError = false) {
	const element = document.getElementById("backup-message");
	element.textContent = message;
	element.classList.toggle("error", isError);
}

async function exportLocalBackup() {
	const button = document.getElementById("backup-export");
	button.disabled = true;
	try {
		const passphrase = backupPassphrase();
		const backup = await createLocalBackup();
		const encrypted = await encryptLocalBackup(backup, passphrase);
		const blob = new Blob([JSON.stringify(encrypted, null, 2)], {
			type: "application/json",
		});
		const downloadUrl = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = downloadUrl;
		link.download = `classroom-backup-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
		showBackupMessage("Encrypted backup downloaded to this device.");
	} catch (error) {
		showBackupMessage(`Backup export failed: ${error.message}`, true);
	} finally {
		button.disabled = false;
	}
}

async function importLocalBackup(file) {
	if (!file) return;
	try {
		if (file.size > 100 * 1024 * 1024) {
			throw new Error("Choose a backup file smaller than 100 MB.");
		}
		const passphrase = backupPassphrase();
		const encrypted = JSON.parse(await file.text());
		const backup = await decryptLocalBackup(encrypted, passphrase);
		validateLocalBackup(backup);
		if (
			!window.confirm(
				"Restore this backup on this device? Matching Classroom settings and proxy cookies will be replaced. The page will reload."
			)
		) {
			return;
		}
		await Promise.all([
			writeBackupStore(
				backupDatabases.v1.name,
				backupDatabases.v1.version,
				backupDatabases.v1.stores,
				backupDatabases.v1.store,
				backup.proxyCookies.v1
			),
			writeBackupStore(
				backupDatabases.v2.name,
				backupDatabases.v2.version,
				backupDatabases.v2.stores,
				backupDatabases.v2.store,
				backup.proxyCookies.v2
			),
			writeBackupStore(
				backupDatabases.theme.name,
				backupDatabases.theme.version,
				backupDatabases.theme.stores,
				backupDatabases.theme.store,
				backup.themeVideos
			),
		]);
		for (const [key, value] of Object.entries(backup.localStorage)) {
			localStorage.setItem(key, value);
		}
		showBackupMessage("Backup restored. Reloading…");
		window.location.reload();
	} catch (error) {
		showBackupMessage(`Backup import failed: ${error.message}`, true);
	} finally {
		document.getElementById("backup-import-file").value = "";
	}
}

function readSettingsForm() {
	const theme = settingsDraft.theme;
	return {
		...settingsDraft,
		theme: {
			...theme,
			name: document.getElementById("theme-name").value.trim(),
			colors: Object.fromEntries(
				THEME_COLOR_KEYS.map((key) => [
					key,
					document.getElementById(`theme-color-${key}`).value,
				])
			),
			backgroundType: document.getElementById("background-type").value,
			backgroundImage: theme.backgroundImage || "",
			backgroundImageOverlay: document.getElementById(
				"background-image-overlay"
			).checked,
			backgroundVideoUrl: document
				.getElementById("background-video-url")
				.value.trim(),
		},
		defaultCloak: document.getElementById("default-cloak-select").value,
	};
}

function syncSettingsForm(settings) {
	const theme = settings.theme;
	document.getElementById("theme-name").value = theme.name;
	for (const key of THEME_COLOR_KEYS) {
		document.getElementById(`theme-color-${key}`).value = theme.colors[key];
	}
	document.getElementById("background-type").value = theme.backgroundType;
	document.getElementById("background-image-overlay").checked =
		theme.backgroundImageOverlay !== false;
	document.getElementById("background-video-url").value =
		theme.backgroundVideoUrl || "";
	document.getElementById("default-cloak-select").value = settings.defaultCloak;
	const preview = document.getElementById("background-image-preview");
	preview.hidden = theme.backgroundType !== "image" || !theme.backgroundImage;
	preview.src = theme.backgroundImage || "";
	document.getElementById("background-image-file").value = "";
	document.getElementById("background-image-name").textContent =
		theme.backgroundImage ? "Saved background image" : "No image selected";
	document.getElementById("background-video-file").value = "";
	document.getElementById("background-video-name").textContent =
		theme.backgroundVideoStored
			? "Saved video background"
			: theme.backgroundVideoUrl
				? "Using video URL"
				: "No video selected";
	document.getElementById("theme-save").textContent = hasUserTheme
		? "Save theme"
		: "Create theme";
	document.getElementById("theme-onboarding-message").hidden = hasUserTheme;
	document.getElementById("user-settings-close").hidden = !hasUserTheme;
	updateBackgroundControls(theme);
}

function openUserSettings() {
	settingsDraft = cloneUserSettings(userSettings);
	syncSettingsForm(settingsDraft);
	document.getElementById("user-settings-message").textContent =
		backgroundVideoError;
	userSettingsDialog.showModal();
}

function previewUserSettings() {
	settingsDraft = readSettingsForm();
	applyUserSettings(settingsDraft);
	updateBackgroundControls(settingsDraft.theme);
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
		headers: {
			...(options.body === undefined
				? {}
				: { "content-type": "application/json" }),
			...options.headers,
		},
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
		renderSharedLinksHistory(result.sharedLinksHistory);
		document.getElementById("admin-shared-links").value = links
			.map((link) => `${link.label} | ${link.url}`)
			.join("\n");
		updateSharedLinksCount();
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

function renderSharedLinksHistory(history) {
	const select = document.getElementById("shared-links-history");
	const restoreButton = document.getElementById("restore-shared-links");
	sharedLinksHistory = Array.isArray(history) ? history.slice(0, 10) : [];
	const entries = sharedLinksHistory;
	select.replaceChildren();
	if (entries.length === 0) {
		select.add(new Option("No saved changes yet", ""));
		restoreButton.disabled = true;
		return;
	}
	select.add(new Option("Choose a saved version", ""));
	for (const [index, entry] of entries.entries()) {
		const date = new Date(entry.changedAt).toLocaleString();
		const count = entry.links.length;
		select.add(
			new Option(
				`${date} · ${count} ${count === 1 ? "link" : "links"}`,
				String(index)
			)
		);
	}
	restoreButton.disabled = true;
}

function updateSharedLinksCount() {
	const lines = document
		.getElementById("admin-shared-links")
		.value.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const count = document.getElementById("shared-links-count");
	count.textContent = `${lines.length} of 8 links`;
	count.classList.toggle("error", lines.length > 8);
}

function getAdminSharedLinksInput() {
	const lines = document
		.getElementById("admin-shared-links")
		.value.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length > 8) {
		throw new Error("You can add up to 8 shared quick links.");
	}
	return lines.map((line) => {
		const separator = line.indexOf("|");
		if (separator < 1) {
			throw new Error(
				"Use one link per line in the format: Label | https://example.com"
			);
		}
		const label = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		let url;
		try {
			url = new URL(value);
		} catch {
			throw new Error(
				`The link for "${label || "unnamed"}" is not a valid URL.`
			);
		}
		if (
			!label ||
			label.length > 32 ||
			!["http:", "https:"].includes(url.protocol) ||
			url.username ||
			url.password
		) {
			throw new Error(
				"Use a label up to 32 characters and a safe HTTP(S) URL per line."
			);
		}
		return { label, url: url.href };
	});
}

function showSharedLinksPreview(links) {
	const dialog = document.getElementById("shared-links-preview-dialog");
	const list = document.getElementById("shared-links-preview");
	const summary = document.getElementById("shared-links-preview-summary");
	const combined = [
		...defaultLinks,
		...links,
		...bookmarks.filter((bookmark) => bookmark && bookmark.url),
	].filter(
		(link, index, all) =>
			all.findIndex((candidate) => candidate.url === link.url) === index
	);
	list.replaceChildren();
	if (combined.length === 0) {
		const empty = document.createElement("li");
		empty.textContent = "No shortcuts to show.";
		list.append(empty);
	}
	for (const link of combined) {
		const item = document.createElement("li");
		const label = document.createElement("strong");
		const url = document.createElement("span");
		label.textContent = link.label;
		url.textContent = link.url;
		item.append(label, url);
		list.append(item);
	}
	summary.textContent = `${combined.length} shortcuts shown, including built-in links and this browser's bookmarks. Other visitors' bookmarks are private.`;
	if (!dialog.open) dialog.showModal();
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
	document.getElementById("quick-links-filter-label").hidden =
		uniqueLinks.length <= 6;
	filterQuickLinks();
}

function filterQuickLinks() {
	const query = document
		.getElementById("quick-links-filter")
		.value.trim()
		.toLocaleLowerCase();
	let visibleCount = 0;
	for (const link of quickLinks.querySelectorAll(".quick-link")) {
		const matches = link.textContent.toLocaleLowerCase().includes(query);
		link.hidden = !matches;
		if (matches) visibleCount++;
	}
	document.getElementById("quick-links-empty").hidden =
		visibleCount > 0 || !query;
}

function getVisibleGames() {
	const query = document
		.getElementById("games-search")
		.value.trim()
		.toLocaleLowerCase();
	const category = document.getElementById("games-category").value;
	const sort = document.getElementById("games-sort").value;
	const games = gameCatalog.filter((game) => {
		const matchesCategory = !category || game.Category.includes(category);
		const matchesQuery =
			!query ||
			`${game.Title} ${game.Description} ${game.Category.join(" ")} ${game.Tag.join(" ")}`
				.toLocaleLowerCase()
				.includes(query);
		return matchesCategory && matchesQuery;
	});
	if (sort === "title-asc") {
		games.sort((a, b) => a.Title.localeCompare(b.Title));
	} else if (sort === "title-desc") {
		games.sort((a, b) => b.Title.localeCompare(a.Title));
	} else if (sort === "category") {
		games.sort(
			(a, b) =>
				(a.Category[0] || "").localeCompare(b.Category[0] || "") ||
				a.Title.localeCompare(b.Title)
		);
	}
	return games;
}

function renderGames() {
	const games = getVisibleGames();
	gameGrid.replaceChildren();
	for (const game of games) {
		const card = document.createElement("button");
		card.type = "button";
		card.className = "game-card";
		card.dataset.gameUrl = game.Url;
		card.setAttribute("aria-label", `Play ${game.Title}`);
		const image = document.createElement("img");
		image.src = game.Asset[0];
		image.alt = "";
		image.loading = "lazy";
		image.referrerPolicy = "no-referrer";
		const copy = document.createElement("span");
		copy.className = "game-card-copy";
		const title = document.createElement("strong");
		title.textContent = game.Title;
		const category = document.createElement("small");
		category.textContent = game.Category.join(" / ") || "GameDistribution";
		copy.append(title, category);
		card.append(image, copy);
		gameGrid.append(card);
	}
	document.getElementById("games-empty").hidden = games.length > 0;
	if (gameCatalog.length) {
		document.getElementById("games-status").textContent =
			`Showing ${games.length} of ${gameCatalog.length} catalog games`;
	}
}

async function loadGameCatalog(force = false) {
	if (gameCatalogLoading || (gameCatalog.length && !force)) return;
	gameCatalogLoading = true;
	const status = document.getElementById("games-status");
	const errorMessage = document.getElementById("games-error");
	errorMessage.hidden = true;
	status.textContent = "Loading GameDistribution games…";
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), 20000);
	try {
		const params = new URLSearchParams({
			collection: "all",
			categories: "",
			tags: "",
			subType: "",
			mobile: "all",
			rewarded: "all",
			high: "all",
			n: "100",
			p: "1",
		});
		const response = await fetch(
			`https://catalog.api.gamedistribution.com/api/v2.0/rss/All/?${params}`,
			{ signal: controller.signal }
		);
		if (!response.ok) {
			throw new Error(`Catalog request failed (${response.status}).`);
		}
		const data = await response.json();
		if (!Array.isArray(data)) {
			throw new Error(
				"The GameDistribution catalog returned an invalid response."
			);
		}
		gameCatalog = data
			.filter(
				(game) =>
					typeof game?.Title === "string" &&
					typeof game?.Url === "string" &&
					/^https:\/\/html5\.gamedistribution\.com\//.test(game.Url) &&
					Array.isArray(game.Asset) &&
					typeof game.Asset[0] === "string" &&
					/^https:\/\/img\.gamedistribution\.com\//.test(game.Asset[0])
			)
			.map((game) => ({
				Title: game.Title,
				Description:
					typeof game.Description === "string" ? game.Description : "",
				Url: game.Url,
				Asset: game.Asset,
				Category: Array.isArray(game.Category)
					? game.Category.filter((value) => typeof value === "string")
					: [],
				Tag: Array.isArray(game.Tag)
					? game.Tag.filter((value) => typeof value === "string")
					: [],
			}));
		const categories = [
			...new Set(gameCatalog.flatMap((game) => game.Category)),
		].sort((a, b) => a.localeCompare(b));
		const categorySelect = document.getElementById("games-category");
		categorySelect.replaceChildren(new Option("All categories", ""));
		for (const category of categories) {
			categorySelect.add(new Option(category, category));
		}
		if (!gameCatalog.length) {
			throw new Error("No playable games were found in the catalog response.");
		}
		renderGames();
	} catch (error) {
		const detail =
			error.name === "AbortError"
				? "The catalog request timed out. Check your connection and try again."
				: error.message;
		status.textContent = "Game catalog unavailable";
		errorMessage.textContent = detail;
		errorMessage.hidden = false;
	} finally {
		window.clearTimeout(timeout);
		gameCatalogLoading = false;
	}
}

function showGamesPage() {
	const tab = activeTab();
	if (!tab) return;
	tab.home = true;
	tab.games = true;
	setLoading(false);
	showError("");
	syncBrowser();
	void loadGameCatalog();
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

function showError(message, detail = "", logs = detail, source = "Classroom") {
	error.textContent = message;
	errorCode.textContent = logs;
	errorVersion.textContent = scramjetVersion === "v1" ? "V1.1.0" : "V2";
	errorSource.textContent = source;
	errorDetails.hidden = !logs;
	errorDetails.open = false;
	statusBlock.hidden = !message && !detail && !logs;
}

function classifySetupError(error) {
	const message = error instanceof Error ? error.message : String(error);
	if (/service.?worker/i.test(message)) return "Service worker";
	if (/transport|wisp|epoxy|baremux|websocket/i.test(message)) {
		return "Proxy transport";
	}
	if (/scramjet|controller|runtime|wasm/i.test(message)) {
		return "Classroom runtime";
	}
	return "Classroom setup";
}

function getV2IncompatibleSite(url) {
	if (scramjetVersion !== "v2") return null;
	return getV1RecommendedSite(url);
}

function getV1RecommendedSite(url) {
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

function isEaglercraftSearch(input) {
	return /\beaglercraft\b/i.test(input);
}

function isEaglercraftUrl(url) {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		return hostname === "eaglercraft.com" || hostname.endsWith(".eaglercraft.com");
	} catch {
		return false;
	}
}

function showUnsupportedSiteDialog() {
	if (!unsupportedSiteDialog.open) unsupportedSiteDialog.showModal();
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

function probeWispEndpoint(endpoint, timeoutMs = 5000) {
	return new Promise((resolve, reject) => {
		let socket;
		let settled = false;
		const timeout = window.setTimeout(() => {
			finish(new Error("Connection check timed out."));
		}, timeoutMs);
		const finish = (error) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timeout);
			if (socket) {
				socket.onopen = null;
				socket.onerror = null;
				socket.onclose = null;
				socket.close();
			}
			if (error) reject(error);
			else resolve(endpoint);
		};
		try {
			const parsedEndpoint = new URL(endpoint);
			if (
				parsedEndpoint.protocol !== "wss:" ||
				parsedEndpoint.username ||
				parsedEndpoint.password
			) {
				throw new Error("Wisp endpoints must use secure WebSocket URLs.");
			}
			socket = new WebSocket(endpoint);
			socket.onopen = () => finish();
			socket.onerror = () => finish(new Error("WebSocket connection failed."));
			socket.onclose = () =>
				finish(new Error("WebSocket closed before connecting."));
		} catch (error) {
			finish(error);
		}
	});
}

async function checkTransportHealth() {
	const status = document.getElementById("admin-status-transport");
	const button = document.getElementById("check-transport");
	button.disabled = true;
	status.textContent = "Checking…";
	status.dataset.state = "";
	if (wispEndpoints.length === 0) {
		button.disabled = false;
		status.textContent = "Not configured";
		status.dataset.state = "blocked";
		throw new Error(
			"No secure Wisp endpoints are configured in public/config.js."
		);
	}
	const results = await Promise.allSettled(
		wispEndpoints.map((endpoint) => probeWispEndpoint(endpoint))
	);
	button.disabled = false;
	const healthy = results
		.filter((result) => result.status === "fulfilled")
		.map((result) => result.value);
	status.textContent = healthy.length
		? `${healthy.length} of ${wispEndpoints.length} online`
		: "Unavailable";
	status.dataset.state = healthy.length ? "active" : "blocked";
	return healthy;
}

async function selectHealthyWispEndpoint() {
	if (wispEndpoints.length === 0) {
		throw new Error(
			"No secure Wisp endpoints are configured in public/config.js."
		);
	}
	const failures = [];
	for (let offset = 0; offset < wispEndpoints.length; offset++) {
		const index = (nextWispEndpointIndex + offset) % wispEndpoints.length;
		const endpoint = wispEndpoints[index];
		try {
			await probeWispEndpoint(endpoint);
			nextWispEndpointIndex = (index + 1) % wispEndpoints.length;
			const status = document.getElementById("admin-status-transport");
			status.textContent = `Online · ${new URL(endpoint).host}`;
			status.dataset.state = "active";
			return endpoint;
		} catch (error) {
			failures.push(`Endpoint ${index + 1}: ${error.message}`);
		}
	}
	const error = new Error(
		"No configured Wisp endpoint responded. Check the proxy service and try again."
	);
	error.cause = new Error(failures.join("\n"));
	document.getElementById("admin-status-transport").textContent = "Unavailable";
	document.getElementById("admin-status-transport").dataset.state = "blocked";
	throw error;
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
	if (tab.url !== url) tab.favicon = null;
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
	tab.games = false;
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
		let pageUrl = tab.url;
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
			if (decodedUrl) {
				updateTabUrl(tab, decodedUrl);
				pageUrl = decodedUrl;
			}
		} catch {}
		try {
			const faviconUrl = getTabFaviconUrl(frame, pageUrl);
			if (faviconUrl) setTabFavicon(tab, faviconUrl);
		} catch (error) {
			console.warn("[Classroom] Unable to read the page favicon.", {
				url: pageUrl,
				error,
			});
		}
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
			const wispUrl = await selectHealthyWispEndpoint();
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
	if (isEaglercraftUrl(url)) {
		showUnsupportedSiteDialog();
		return;
	}
	showError("");
	window.clearTimeout(tab.navigationTimer);
	tab.navigationTimer = null;
	setLoading(true, tab);
	try {
		await prepareTransport();
		tab.home = false;
		tab.games = false;
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
					"This can be caused by a slow destination or an unavailable proxy connection. Check the transport status before retrying.",
					getErrorLog(timeoutError),
					"Page load"
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
			getErrorLog(err),
			classifySetupError(err)
		);
	}
}

function createTab() {
	const tab = {
		id: `tab-${++tabSequence}`,
		title: "New tab",
		favicon: null,
		cloak:
			userSettings.defaultCloak === "normal" ? null : userSettings.defaultCloak,
		url: "",
		home: true,
		games: false,
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
	tab.games = false;
	tab.title = "New tab";
	tab.favicon = null;
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

function maybeShowTestingOverlay() {
	if (testingOverlay.open || Math.random() >= TESTING_OVERLAY_SEARCH_CHANCE) {
		return;
	}
	testingOverlay.hidden = false;
	testingOverlay.showModal();
	testingOverlayClose.focus();
}

testingOverlay.addEventListener("cancel", (event) => {
	event.preventDefault();
});
testingOverlay.addEventListener("keydown", (event) => {
	if (event.key !== "Tab") return;
	event.preventDefault();
	testingOverlayClose.focus();
});
testingOverlayClose.addEventListener("click", () => {
	testingOverlay.close();
	testingOverlay.hidden = true;
});

address.addEventListener("keydown", (event) => {
	if (event.key !== "Enter") return;
	event.preventDefault();
	form.requestSubmit();
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = address.value.trim();
	if (!value) return;
	if (isEaglercraftSearch(value)) {
		showUnsupportedSiteDialog();
		return;
	}
	maybeShowTestingOverlay();
	navigateTab(activeTab(), search(value, searchEngine.value));
});

homeSearchForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = homeAddress.value.trim();
	if (!value) return;
	if (isEaglercraftSearch(value)) {
		showUnsupportedSiteDialog();
		return;
	}
	address.value = value;
	maybeShowTestingOverlay();
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
document.getElementById("games-open").addEventListener("click", showGamesPage);
document.getElementById("games-home").addEventListener("click", goHome);
document.querySelector(".game-providers").addEventListener("click", (event) => {
	const provider = event.target.closest("[data-game-url]");
	if (!provider) return;
	const url = safeMediaUrl(provider.dataset.gameUrl);
	if (url) void navigateTab(activeTab(), url);
});
gameGrid.addEventListener("click", (event) => {
	const card = event.target.closest("[data-game-url]");
	if (!card) return;
	const url = safeMediaUrl(card.dataset.gameUrl);
	if (url) void navigateTab(activeTab(), url);
});
document.getElementById("games-search").addEventListener("input", renderGames);
document
	.getElementById("games-category")
	.addEventListener("change", renderGames);
document.getElementById("games-sort").addEventListener("change", renderGames);
document
	.getElementById("games-refresh")
	.addEventListener("click", () => void loadGameCatalog(true));
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
	.getElementById("backup-export")
	.addEventListener("click", () => void exportLocalBackup());
document
	.getElementById("backup-import-button")
	.addEventListener("click", () => {
		document.getElementById("backup-import-file").click();
	});
document
	.getElementById("backup-import-file")
	.addEventListener("change", (event) => {
		void importLocalBackup(event.target.files[0]);
	});
document
	.getElementById("user-settings-close")
	.addEventListener("click", () => {
		if (!hasUserTheme) return;
		userSettingsDialog.close();
	});
document
	.getElementById("user-settings-form")
	.addEventListener("submit", async (event) => {
		event.preventDefault();
		const settings = readSettingsForm();
		const theme = settings.theme;
		if (!theme.name) {
			document.getElementById("user-settings-message").textContent =
				"Name your theme before saving.";
			return;
		}
		if (!THEME_COLOR_KEYS.every((key) => isThemeColor(theme.colors[key]))) {
			document.getElementById("user-settings-message").textContent =
				"Choose a valid color for every theme color.";
			return;
		}
		if (theme.backgroundType === "image" && !theme.backgroundImage) {
			document.getElementById("user-settings-message").textContent =
				"Choose an image for the home background.";
			return;
		}
		if (theme.backgroundType === "video") {
			const videoUrl = safeMediaUrl(theme.backgroundVideoUrl);
			if (!theme.backgroundVideoFile && !videoUrl && !theme.backgroundVideoId) {
				document.getElementById("user-settings-message").textContent =
					"Choose a video file or enter a valid video URL.";
				return;
			}
			theme.backgroundVideoUrl = videoUrl;
			if (videoUrl) {
				theme.backgroundVideoFile = null;
				theme.backgroundVideoId = "";
				theme.backgroundVideoStored = false;
				delete theme.pendingVideoId;
			}
		}
		if (await saveUserSettings(settings)) {
			settingsDraft = null;
			applyUserSettings(userSettings);
			syncSettingsForm(userSettings);
			document.getElementById("user-settings-message").textContent =
				"Theme saved on this device.";
			userSettingsDialog.close();
			if (new URLSearchParams(location.search).get("admin") === "1") {
				openAdminDialog();
			}
		}
	});
for (const id of [
	"background-type",
	"background-image-overlay",
	"default-cloak-select",
]) {
	document.getElementById(id).addEventListener("input", previewUserSettings);
	document.getElementById(id).addEventListener("change", previewUserSettings);
}
for (const key of ["name", ...THEME_COLOR_KEYS]) {
	document
		.getElementById(key === "name" ? "theme-name" : `theme-color-${key}`)
		.addEventListener("input", previewUserSettings);
}
document
	.getElementById("background-image-file")
	.addEventListener("change", async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			settingsDraft = readSettingsForm();
			settingsDraft.theme.backgroundImage = await encodeBackgroundImage(file);
			settingsDraft.theme.backgroundType = "image";
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
				userSettings.theme.backgroundImage
					? "Saved background image"
					: "No image selected";
		}
	});
document
	.getElementById("background-video-file")
	.addEventListener("change", (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const message = document.getElementById("user-settings-message");
		if (!/^video\/(?:mp4|webm)$/.test(file.type)) {
			message.textContent = "Choose an MP4 or WebM video.";
			event.target.value = "";
			return;
		}
		if (file.size > VIDEO_BACKGROUND_MAX_BYTES) {
			message.textContent = "Choose a video smaller than 50 MB.";
			event.target.value = "";
			return;
		}
		settingsDraft = readSettingsForm();
		settingsDraft.theme.backgroundType = "video";
		settingsDraft.theme.backgroundVideoUrl = "";
		settingsDraft.theme.backgroundVideoStored = false;
		settingsDraft.theme.backgroundVideoFile = file;
		settingsDraft.theme.pendingVideoId =
			window.crypto?.randomUUID?.() ||
			`${Date.now()}-${Math.random().toString(16).slice(2)}`;
		syncSettingsForm(settingsDraft);
		document.getElementById("background-video-name").textContent = file.name;
		applyUserSettings(settingsDraft);
		message.textContent = "Video preview ready. Save theme to keep it.";
	});
document
	.getElementById("background-video-url")
	.addEventListener("input", () => {
		if (settingsDraft && settingsDraft.theme.backgroundVideoUrl !==
			document.getElementById("background-video-url").value.trim()) {
			settingsDraft.theme.backgroundVideoFile = null;
			settingsDraft.theme.backgroundVideoId = "";
			settingsDraft.theme.backgroundVideoStored = false;
			delete settingsDraft.theme.pendingVideoId;
			if (previewVideoObjectUrl) URL.revokeObjectURL(previewVideoObjectUrl);
			previewVideoObjectUrl = "";
			previewVideoFile = null;
		}
		previewUserSettings();
	});
document
	.getElementById("background-media-remove")
	.addEventListener("click", () => {
		settingsDraft = readSettingsForm();
		settingsDraft.theme.backgroundImage = "";
		settingsDraft.theme.backgroundType = "color";
		settingsDraft.theme.backgroundVideoUrl = "";
		settingsDraft.theme.backgroundVideoStored = false;
		settingsDraft.theme.backgroundVideoFile = null;
		settingsDraft.theme.backgroundVideoId = "";
		delete settingsDraft.theme.pendingVideoId;
		if (previewVideoObjectUrl) URL.revokeObjectURL(previewVideoObjectUrl);
		previewVideoObjectUrl = "";
		previewVideoFile = null;
		syncSettingsForm(settingsDraft);
		applyUserSettings(settingsDraft);
	});
userSettingsDialog.addEventListener("cancel", (event) => {
	if (!hasUserTheme) event.preventDefault();
});
userSettingsDialog.addEventListener("close", () => {
	if (settingsDraft) {
		settingsDraft = null;
		if (previewVideoObjectUrl) URL.revokeObjectURL(previewVideoObjectUrl);
		previewVideoObjectUrl = "";
		previewVideoFile = null;
		applyUserSettings(userSettings);
	}
});
document
	.getElementById("home-background-video")
	.addEventListener("error", () => {
		backgroundVideoError =
			"Could not load the video background. Use a direct MP4 or WebM URL.";
		document.getElementById("user-settings-message").textContent =
			backgroundVideoError;
	});
document
	.getElementById("home-background-video")
	.addEventListener("loadeddata", () => {
		backgroundVideoError = "";
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
	.getElementById("shared-links-preview-close")
	.addEventListener("click", () =>
		document.getElementById("shared-links-preview-dialog").close()
	);
document
	.getElementById("check-transport")
	.addEventListener("click", async () => {
		try {
			const healthy = await checkTransportHealth();
			showAdminMessage(
				healthy.length
					? `${healthy.length} of ${wispEndpoints.length} proxy endpoints are reachable.`
					: "No proxy endpoints are reachable. Check the endpoint configuration and service."
			);
		} catch (error) {
			showAdminMessage(error.message, true);
		}
	});
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
	.getElementById("admin-shared-links")
	.addEventListener("input", updateSharedLinksCount);
document
	.getElementById("preview-shared-links")
	.addEventListener("click", () => {
		try {
			showSharedLinksPreview(getAdminSharedLinksInput());
		} catch (error) {
			showAdminMessage(error.message, true);
		}
	});
document
	.getElementById("shared-links-history")
	.addEventListener("change", (event) => {
		document.getElementById("restore-shared-links").disabled =
			!Number.isInteger(Number(event.target.value)) ||
			event.target.value === "" ||
			!sharedLinksHistory[Number(event.target.value)];
	});
document
	.getElementById("restore-shared-links")
	.addEventListener("click", async () => {
		const selected = Number(
			document.getElementById("shared-links-history").value
		);
		const entry = sharedLinksHistory[selected];
		if (!entry) return;
		if (
			!(await showConfirmation({
				title: "Restore saved links?",
				message:
					"This replaces the current shared links. The current version will remain in history.",
				confirmLabel: "Restore links",
			}))
		) {
			return;
		}
		document.getElementById("admin-shared-links").value = entry.links
			.map((link) => `${link.label} | ${link.url}`)
			.join("\n");
		updateSharedLinksCount();
		document.getElementById("admin-links-form").requestSubmit();
	});
document
	.getElementById("admin-links-form")
	.addEventListener("submit", async (event) => {
		event.preventDefault();
		try {
			const links = getAdminSharedLinksInput();
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
document
	.getElementById("quick-links-filter")
	.addEventListener("input", filterQuickLinks);

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
	} else if (modifier && key.toLowerCase() === "k") {
		event.preventDefault();
		if (activeTab()?.home) homeAddress.focus();
		else {
			address.focus();
			address.select();
		}
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
void restoreSavedThemeVideo();
if (
	hasUserTheme &&
	new URLSearchParams(location.search).get("admin") === "1"
) {
	openAdminDialog();
}

async function finishStartup() {
	const blocked = await refreshBlockedState();
	if (blocked) {
		startupScreen.hidden = true;
		return;
	}
	startupScreen.hidden = true;
	if (!hasUserTheme) {
		openUserSettings();
		return;
	}
	let pendingUrl;
	try {
		pendingUrl = sessionStorage.getItem(pendingCompatibilityNavigationKey);
		if (pendingUrl) {
			sessionStorage.removeItem(pendingCompatibilityNavigationKey);
		}
	} catch (err) {
		showError(
			"Unable to restore the requested page.",
			err instanceof Error ? err.message : String(err)
		);
		return;
	}
	if (pendingUrl && getV1RecommendedSite(pendingUrl)) {
		void navigateTab(activeTab(), pendingUrl);
	}
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
