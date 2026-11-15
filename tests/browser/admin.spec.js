import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { expect, test } from "@playwright/test";

const password = "classroom-test-password";
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
	await page.goto(baseUrl);

	for (const [label, url] of [
		["GeForce NOW", "https://play.geforcenow.com/"],
		["TikTok", "https://www.tiktok.com/"],
	]) {
		const link = page.getByRole("button", { name: `Open ${label}` });
		await expect(link).toHaveAttribute("data-url", url);
	}
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
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page.locator("#admin-settings")).toBeHidden();
	await expect(page.locator("#admin-login-form")).toBeVisible();
});

test("unreachable primary Wisp endpoint falls back to the next configured endpoint", async ({
	page,
}) => {
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
