import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/browser",
	testMatch: "**/*.spec.js",
	fullyParallel: false,
	workers: 1,
	timeout: 60000,
	reporter: "list",
	use: {
		browserName: "chromium",
		headless: true,
	},
});
