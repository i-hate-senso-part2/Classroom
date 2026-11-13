"use strict";
const serviceWorkerScriptVersion = "versioned-worker-20261113";
const serviceWorkerFile =
	window.CLASSROOM_SCRAMJET_VERSION === "v1" ? "sw-v1.js" : "sw.js";
const stockSW = `./${serviceWorkerFile}?v=${serviceWorkerScriptVersion}`;
const serviceWorkerTimeout = 15000;

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used by the browser page to initialize the Scramjet service worker.
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	const expectedScript = new URL(stockSW, location.href).href;
	const registration = await navigator.serviceWorker.register(stockSW, {
		updateViaCache: "none",
	});
	await waitForActiveWorker(registration, expectedScript);
	if (navigator.serviceWorker.controller?.scriptURL !== expectedScript) {
		await new Promise((resolve, reject) => {
			let timeout;
			const cleanup = () => {
				window.clearTimeout(timeout);
				navigator.serviceWorker.removeEventListener(
					"controllerchange",
					onControllerChange
				);
			};
			const onControllerChange = () => {
				if (navigator.serviceWorker.controller?.scriptURL !== expectedScript)
					return;
				cleanup();
				resolve();
			};
			navigator.serviceWorker.addEventListener(
				"controllerchange",
				onControllerChange
			);
			timeout = window.setTimeout(() => {
				cleanup();
				reject(
					new Error(
						"Timed out waiting for the selected Scramjet worker to control this page."
					)
				);
			}, serviceWorkerTimeout);
			onControllerChange();
		});
	}
	return registration;
}

function waitForActiveWorker(registration, expectedScript) {
	if (
		registration.active?.scriptURL === expectedScript &&
		registration.active.state === "activated"
	) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		let timeout;
		const observedWorkers = new Set();
		const cleanup = () => {
			window.clearTimeout(timeout);
			registration.removeEventListener("updatefound", checkWorker);
			for (const worker of observedWorkers) {
				worker.removeEventListener("statechange", checkWorker);
			}
		};
		const fail = (error) => {
			cleanup();
			reject(error);
		};
		const checkWorker = () => {
			if (
				registration.active?.scriptURL === expectedScript &&
				registration.active.state === "activated"
			) {
				cleanup();
				resolve();
				return;
			}

			const worker = registration.installing || registration.waiting;
			if (worker && !observedWorkers.has(worker)) {
				observedWorkers.add(worker);
				worker.addEventListener("statechange", checkWorker);
			}
			if (worker?.state === "installed") {
				worker.postMessage({ type: "CLASSROOM_SKIP_WAITING" });
			} else if (worker?.state === "redundant") {
				fail(new Error("Scramjet service worker failed to activate."));
			}
		};

		registration.addEventListener("updatefound", checkWorker);
		timeout = window.setTimeout(() => {
			const state =
				registration.installing?.state ||
				registration.waiting?.state ||
				registration.active?.state ||
				"none";
			fail(
				new Error(
					`Timed out waiting for the Scramjet service worker to activate (state: ${state}).`
				)
			);
		}, serviceWorkerTimeout);
		checkWorker();
		registration.update().then(checkWorker, fail);
	});
}
