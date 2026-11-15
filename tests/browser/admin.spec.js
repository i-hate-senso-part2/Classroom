import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { expect, test } from "@playwright/test";

const password = "classroom-test-password";
const returningUserSettings = {
	theme: {
		name: "Test theme",
		colors: {
			background: "#0c100e",
			surface: "#151a17",
			text: "#e8eee8",
			accent: "#c4e879",
		},
		backgroundType: "color",
		backgroundImage: "",
		backgroundVideoUrl: "",
		backgroundVideoId: "",
		backgroundVideoStored: false,
	},
	defaultCloak: "normal",
};
let baseUrl;
let dataDirectory;
let serverProcess;

async function getAvailablePort() {
	const server = createServer();
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const { port } = server.address();
	await new Promise((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve()))
	);
	return port;
}

async function waitForServer() {
	const deadline = Date.now() + 20000;
	while (Date.now() < deadline) {
		if (serverProcess.exitCode !== null) {
			throw new Error(
				`Classroom server exited with ${serverProcess.exitCode}.`
			);
		}
		try {
			const response = await fetch(`${baseUrl}/api/health`);
			if (response.ok) return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	}
	throw new Error("Classroom server did not become ready.");
}

async function useReturningUserSettings(page, settings = returningUserSettings) {
	await page.addInitScript((savedSettings) => {
		if (!localStorage.getItem("classroom-user-settings")) {
			localStorage.setItem(
				"classroom-user-settings",
				JSON.stringify(savedSettings)
			);
		}
	}, settings);
}

test.beforeAll(async () => {
	dataDirectory = mkdtempSync(join(tmpdir(), "classroom-browser-test-"));
	const salt = randomBytes(16);
	const digest = scryptSync(password, salt, 64);
	const port = await getAvailablePort();
	baseUrl = `http://127.0.0.1:${port}`;
	serverProcess = spawn(process.execPath, ["src/index.js"], {
		cwd: process.cwd(),
		env: {
			...process.env,
			PORT: String(port),
			BROWSER_STATE_PATH: join(dataDirectory, "browser-state.json"),
			ADMIN_PASSWORD_HASH: `scrypt:${salt.toString("hex")}:${digest.toString("hex")}`,
		},
		stdio: "ignore",
	});
	await waitForServer();
});

test.afterAll(async () => {
	if (serverProcess && serverProcess.exitCode === null) {
		serverProcess.kill("SIGTERM");
		await once(serverProcess, "exit");
	}
	if (dataDirectory) rmSync(dataDirectory, { recursive: true, force: true });
});

test("GeForce NOW and TikTok quick links stay inside the proxy", async ({
	page,
}) => {
	await useReturningUserSettings(page);
	await page.goto(baseUrl);

	for (const [label, url] of [
		["GeForce NOW", "https://play.geforcenow.com/"],
		["TikTok", "https://www.tiktok.com/"],
	]) {
		const link = page.getByRole("button", { name: `Open ${label}` });
		await expect(link).toHaveAttribute("data-url", url);
	}
});

test("Eaglercraft searches and links show an unsupported notice", async ({
	page,
}) => {
	await useReturningUserSettings(page);
	await page.goto(baseUrl);

	await page.locator("#home-address").fill("Eaglercraft");
	await page
		.locator("#home-search-form")
		.evaluate((form) => form.requestSubmit());
	const notice = page.locator("#unsupported-site-dialog");
	await expect(notice).toBeVisible();
	await expect(notice).toContainText(
		"Eaglercraft is unsupported for this website."
	);
	await expect(page.locator("#frame-host iframe")).toHaveCount(0);

	await page.getByRole("button", { name: "Got it" }).click();
	await page.evaluate(() => {
		const link = document.createElement("button");
		link.type = "button";
		link.className = "quick-link";
		link.dataset.url = "https://play.eaglercraft.com/";
		link.textContent = "Eaglercraft test";
		document.querySelector("#quick-links").append(link);
	});
	await page.getByRole("button", { name: "Eaglercraft test" }).click();
	await expect(notice).toBeVisible();
	await expect(page.locator("#frame-host iframe")).toHaveCount(0);
});

test("rare search overlay can only be dismissed with its close button", async ({
	page,
}) => {
	await useReturningUserSettings(page);
	await page.addInitScript(() => {
		Math.random = () => 0;
	});
	await page.goto(baseUrl);
	await page.locator("#home-address").fill("example.com");
	await page
		.locator("#home-search-form")
		.evaluate((form) => form.requestSubmit());

	const overlay = page.locator("#testing-overlay");
	await expect(overlay).toBeVisible();
	await expect(overlay.locator("img")).toHaveAttribute("src", "/testing.webp");
	await page.keyboard.press("Escape");
	await expect(overlay).toBeVisible();
	await overlay.click({ position: { x: 100, y: 100 } });
	await expect(overlay).toBeVisible();
	await page.getByRole("button", { name: "Close overlay" }).click();
	await expect(overlay).toBeHidden();
});

test("first visit requires a saved custom theme", async ({ page }) => {
	await page.goto(baseUrl);
	await expect(page.locator("#user-settings-dialog")).toBeVisible();
	await expect(page.locator("#user-settings-close")).toBeHidden();
	await expect(page.locator("#theme-onboarding-message")).toContainText(
		"Create and save a custom theme"
	);
	await page.keyboard.press("Escape");
	await expect(page.locator("#user-settings-dialog")).toBeVisible();

	await page.locator("#theme-name").fill("My first theme");
	await page.locator("#theme-color-accent").fill("#4268d5");
	await page.getByRole("button", { name: "Create theme" }).click();

	await expect(page.locator("#user-settings-dialog")).toBeHidden();
	expect(
		await page.evaluate(() => {
			const settings = JSON.parse(
				localStorage.getItem("classroom-user-settings")
			);
			return {
				name: settings.theme.name,
				accent: settings.theme.colors.accent,
			};
		})
	).toEqual({ name: "My first theme", accent: "#4268d5" });
});

test("existing preset preferences migrate to a custom theme", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"classroom-user-settings",
			JSON.stringify({
				theme: "ocean",
				background: "lines",
				defaultCloak: "normal",
				backgroundImage: "",
			})
		);
	});
	await page.goto(baseUrl);

	await expect(page.locator("#user-settings-dialog")).toBeHidden();
	await page.getByRole("button", { name: "User settings" }).click();
	await expect(page.locator("#theme-name")).toHaveValue("My theme");
	await expect(page.locator("#background-type")).toHaveValue("color");
	expect(
		await page.locator("html").evaluate((root) =>
			root.style.getPropertyValue("--custom-accent")
		)
	).toBe("#69d6cb");
});

test("custom image backgrounds remain available", async ({ page }) => {
	await useReturningUserSettings(page);
	await page.goto(baseUrl);
	await page.getByRole("button", { name: "User settings" }).click();
	await page.locator("#background-type").selectOption("image");
	await page.locator("#background-image-file").setInputFiles({
		name: "background.png",
		mimeType: "image/png",
		buffer: readFileSync(join(process.cwd(), "public/sj.png")),
	});

	await expect(page.locator("#background-image-preview")).toBeVisible();
	await page.locator("#background-image-overlay").uncheck();
	await expect(page.locator("html")).toHaveAttribute(
		"data-home-image-overlay",
		"false"
	);
	expect(
		await page
			.locator("#home-screen")
			.evaluate((element) => getComputedStyle(element).backgroundImage)
	).not.toContain("linear-gradient");
	await page.getByRole("button", { name: "Save theme" }).click();
	await expect(page.locator("#user-settings-dialog")).toBeHidden();
	const imageSettings = await page.evaluate(
		() => JSON.parse(localStorage.getItem("classroom-user-settings")).theme
	);
	expect(imageSettings.backgroundImage).toMatch(/^data:image\/webp;base64,/);
	expect(imageSettings.backgroundImageOverlay).toBe(false);
	await expect(page.locator("html")).toHaveAttribute(
		"data-home-background",
		"image"
	);
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute(
		"data-home-image-overlay",
		"false"
	);
	expect(
		await page.evaluate(
			() => getComputedStyle(document.getElementById("home-screen")).backgroundImage
		)
	).not.toContain("linear-gradient");
});

test("uploaded video backgrounds persist locally", async ({ page }) => {
	await useReturningUserSettings(page);
	await page.goto(baseUrl);
	await page.getByRole("button", { name: "User settings" }).click();
	await page.locator("#background-type").selectOption("video");
	await page.locator("#background-video-file").setInputFiles({
		name: "background.mp4",
		mimeType: "video/mp4",
		buffer: Buffer.from("test video"),
	});
	await expect(page.locator("#background-video-name")).toHaveText(
		"background.mp4"
	);
	await page.getByRole("button", { name: "Save theme" }).click();

	await expect(page.locator("#user-settings-dialog")).toBeHidden();
	await expect(page.locator("#home-background-video")).toBeVisible();
	const savedVideo = await page.evaluate(async () => {
		const settings = JSON.parse(
			localStorage.getItem("classroom-user-settings")
		);
		const database = await new Promise((resolve, reject) => {
			const request = indexedDB.open("classroom-theme-assets", 1);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		const file = await new Promise((resolve, reject) => {
			const request = database
				.transaction("videos", "readonly")
				.objectStore("videos")
				.get(settings.theme.backgroundVideoId);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		database.close();
		return {
			type: settings.theme.backgroundType,
			stored: settings.theme.backgroundVideoStored,
			mimeType: file?.type,
		};
	});
	expect(savedVideo).toEqual({
		type: "video",
		stored: true,
		mimeType: "video/mp4",
	});

	await page.reload();
	await expect
		.poll(() =>
			page
				.locator("#home-background-video")
				.evaluate((video) => video.src)
		)
		.toContain("blob:");

	await page.getByRole("button", { name: "User settings" }).click();
	await page.locator("#background-type").selectOption("video");
	await page
		.locator("#background-video-url")
		.fill("https://cdn.example/background.webm");
	await page.getByRole("button", { name: "Save theme" }).click();
	await expect(page.locator("#user-settings-dialog")).toBeHidden();
	expect(
		await page.evaluate(
			() =>
				JSON.parse(localStorage.getItem("classroom-user-settings")).theme
					.backgroundVideoUrl
		)
	).toBe("https://cdn.example/background.webm");
});

test("tab appearance cloaks only the outer Classroom tab", async ({ page }) => {
	await useReturningUserSettings(page);
	await page.goto(baseUrl);
	await page.getByRole("button", { name: "User settings" }).click();
	for (const [id, title, logo] of [
		["normal", "New tab", "/sj.png"],
		["kahoot", "Enter Game PIN - Kahoot!", "/logos/kahoot-icon.svg"],
		["google", "Google", "/logos/google-circle.png"],
		["classroom", "Home - Classroom", "/logos/classroom.png"],
		["wikipedia", "Wikipedia", "/logos/wikipedia.webp"],
	]) {
		await page.locator("#default-cloak-select").selectOption(id);
		await expect(page).toHaveTitle(title);
		await expect(page.locator("#browser-favicon")).toHaveAttribute(
			"href",
			logo
		);
		expect((await page.request.get(`${baseUrl}${logo}`)).ok()).toBe(true);
	}
	await expect(page.locator("#tab-list .tab-title")).toHaveText("New tab");
	await expect(page.locator("#tab-list .tab-favicon img")).toHaveAttribute(
		"src",
		"/sj.png"
	);
});

test("compatibility switch preserves the proxied destination on V1.1.0", async ({
	page,
}) => {
	await page.route("**/config.js", (route) =>
		route.fulfill({
			contentType: "application/javascript",
			body: `window.SCRAMJET_APP_CONFIG = Object.freeze({
				wispEndpoints: Object.freeze(["wss://primary.test/"])
			});`,
		})
	);
	await page.addInitScript(() => {
		localStorage.setItem(
			"classroom-user-settings",
			JSON.stringify({
				theme: {
					name: "Proxy test",
					colors: {
						background: "#0c100e",
						surface: "#151a17",
						text: "#e8eee8",
						accent: "#c4e879",
					},
					backgroundType: "color",
					backgroundImage: "",
					backgroundVideoUrl: "",
					backgroundVideoId: "",
					backgroundVideoStored: false,
				},
				defaultCloak: "google",
			})
		);
		if (!localStorage.getItem("classroom-scramjet-version")) {
			localStorage.setItem("classroom-scramjet-version", "v2");
		}
		window.WebSocket = class {
			constructor() {
				setTimeout(() => this.onopen?.(new Event("open")), 0);
			}
			close() {}
		};
	});

	await page.goto(baseUrl);
	await page.locator("#home-address").fill("https://www.tiktok.com/");
	await page
		.locator("#home-search-form")
		.evaluate((form) => form.requestSubmit());
	await expect(page.locator("#compatibility-dialog")).toBeVisible();

	const reload = page.waitForNavigation();
	await page
		.getByRole("button", { name: "Switch to SE (V1.1.0)" })
		.click();
	await reload;

	await expect(page.locator("#scramjet-version-label")).toHaveText(
		"SE (V1.1.0)"
	);
	await expect(page).toHaveTitle("Google");
	await expect(page.locator("#tab-list .tab-title")).toHaveText("tiktok.com");
	await expect(page.locator(".page-frame")).toHaveAttribute(
		"title",
		"tiktok.com"
	);
	await expect(page.locator("#sj-address")).toHaveValue(
		"https://www.tiktok.com/"
	);
	await expect(page.locator(".page-frame")).toHaveAttribute(
		"src",
		/^\/~1\//
	);
});

test("admin preview, save, restore, and homepage reflect shared links", async ({
	page,
}) => {
	await useReturningUserSettings(page);
	await page.route("**/config.js", (route) =>
		route.fulfill({
			contentType: "application/javascript",
			body: `window.SCRAMJET_APP_CONFIG = Object.freeze({
				wispEndpoints: Object.freeze([
					"wss://primary.test/",
					"wss://backup.test/"
				])
			});`,
		})
	);
	await page.addInitScript(() => {
		window.WebSocket = class {
			constructor(url) {
				this.url = url;
				setTimeout(() => {
					if (url.includes("primary.test")) {
						this.onerror?.(new Event("error"));
					} else {
						this.onopen?.(new Event("open"));
					}
				}, 0);
			}
			close() {}
		};
	});

	await page.goto(`${baseUrl}/?admin=1`);
	expect(await page.evaluate(() => document.compatMode)).toBe("CSS1Compat");
	expect(
		await (await page.request.get(`${baseUrl}/api/health`)).json()
	).toMatchObject({
		status: "ok",
		stateStore: "local",
	});
	await page.getByLabel("Admin password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.locator("#admin-settings")).toBeVisible();
	await expect(page.locator("#admin-message")).toContainText(
		"Administrator access verified"
	);
	expect(
		await page.evaluate(async () => {
			const response = await fetch("/api/admin/state", {
				credentials: "omit",
			});
			return response.status;
		})
	).toBe(401);

	await page.locator('[aria-labelledby="links-heading"] summary').click();
	const linksInput = page.locator("#admin-shared-links");
	await linksInput.fill(
		"School portal | https://school.example\nLibrary | https://library.example\nClass resources | https://resources.example"
	);
	await expect(page.locator("#shared-links-count")).toHaveText("3 of 8 links");
	await page.getByRole("button", { name: "Preview homepage" }).click();
	await expect(page.locator("#shared-links-preview")).toContainText(
		"School portal"
	);
	await expect(page.locator("#shared-links-preview")).toContainText("Google");
	await page.locator("#shared-links-preview-close").click();
	await page.getByRole("button", { name: "Save links" }).click();
	await expect(page.locator("#admin-message")).toContainText(
		"Shared quick links saved"
	);

	await linksInput.fill("Class page | https://class.example");
	await page.getByRole("button", { name: "Save links" }).click();
	await expect(page.locator("#shared-links-history option")).toHaveCount(3);
	await page.locator("#shared-links-history").selectOption("1");
	await expect(
		page.getByRole("button", { name: "Restore selected version" })
	).toBeEnabled();
	await page.getByRole("button", { name: "Restore selected version" }).click();
	await page.getByRole("button", { name: "Restore links" }).click();
	await expect(linksInput).toHaveValue(
		"School portal | https://school.example/\nLibrary | https://library.example/\nClass resources | https://resources.example/"
	);

	await page
		.locator("details.admin-section")
		.filter({
			hasText: "Connection check",
		})
		.locator("summary")
		.click();
	await page.getByRole("button", { name: "Check connection" }).click();
	await expect(page.locator("#admin-status-transport")).toHaveText(
		"1 of 2 online"
	);
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page.locator("#admin-settings")).toBeHidden();
	await expect(page.locator("#admin-login-form")).toBeVisible();
	await page.locator("#admin-close").click();
	await page.goto(baseUrl);
	await expect(page.locator("#quick-links")).toContainText("School portal");
	await expect(page.locator("#quick-links-filter")).toBeVisible();
	await page.locator("#quick-links-filter").fill("School portal");
	await expect(page.locator("#quick-links .quick-link:visible")).toHaveCount(1);
	await page.locator("#quick-links-filter").fill("no matching link");
	await expect(page.locator("#quick-links-empty")).toBeVisible();
	await page.locator("#quick-links-filter").fill("");
	await page.keyboard.press("Control+k");
	await expect(page.locator("#home-address")).toBeFocused();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`${baseUrl}/?admin=1`);
	await expect(page.locator("#admin-settings")).toBeVisible();
	const dialogWidth = await page
		.locator("#admin-dialog")
		.evaluate((dialog) => dialog.getBoundingClientRect().width);
	expect(dialogWidth).toBeLessThanOrEqual(390);
});

test("unreachable primary Wisp endpoint falls back to the next configured endpoint", async ({
	page,
}) => {
	await useReturningUserSettings(page);
	await page.route("**/config.js", (route) =>
		route.fulfill({
			contentType: "application/javascript",
			body: `window.SCRAMJET_APP_CONFIG = Object.freeze({
				wispEndpoints: Object.freeze([
					"wss://primary.test/",
					"wss://backup.test/"
				])
			});`,
		})
	);
	await page.addInitScript(() => {
		window.WebSocket = class {
			constructor(url) {
				setTimeout(() => {
					if (url.includes("primary.test")) {
						this.onerror?.(new Event("error"));
					} else {
						this.onopen?.(new Event("open"));
					}
				}, 0);
			}
			close() {}
		};
	});
	await page.goto(baseUrl);
	await page.locator("#home-address").fill("https://example.com");
	await page
		.locator("#home-search-form")
		.evaluate((form) => form.requestSubmit());
	await expect(page.locator("#admin-status-transport")).toContainText(
		"backup.test",
		{ timeout: 10000 }
	);
});
