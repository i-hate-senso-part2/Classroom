"use strict";
const serviceWorkerScriptVersion = "schema-bootstrap-20261113";
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
	const activeWorker =
		registration.active?.scriptURL === expectedScript
			? registration.active
			: null;
	let worker = activeWorker
		? null
		: registration.installing || registration.waiting;
	if (!worker && !activeWorker) {
		worker = await new Promise((resolve, reject) => {
			let timeout;
			const cleanup = () => {
				window.clearTimeout(timeout);
				registration.removeEventListener("updatefound", onUpdateFound);
			};
			const onUpdateFound = () => {
				const installing = registration.installing;
				if (!installing) return;
				cleanup();
				resolve(installing);
			};
			registration.addEventListener("updatefound", onUpdateFound);
			timeout = window.setTimeout(() => {
				cleanup();
				reject(
					new Error(
						"Timed out waiting for the selected Scramjet worker update."
					)
				);
			}, serviceWorkerTimeout);
			if (registration.installing) onUpdateFound();
			registration.update().catch((error) => {
				cleanup();
				reject(error);
			});
		});
	}
	if (worker) {
		if (worker.scriptURL !== expectedScript) {
			throw new Error(
				"The browser activated a different Scramjet service worker."
			);
		}
		if (worker.state !== "activated") {
			await new Promise((resolve, reject) => {
				let timeout;
				const cleanup = () => {
					window.clearTimeout(timeout);
					worker.removeEventListener("statechange", onStateChange);
				};
				const onStateChange = () => {
					if (worker.state === "activated") {
						cleanup();
						resolve();
					} else if (worker.state === "redundant") {
						cleanup();
						reject(new Error("Scramjet service worker failed to activate."));
					} else if (worker.state === "installed") {
						worker.postMessage({ type: "CLASSROOM_SKIP_WAITING" });
					}
				};
				worker.addEventListener("statechange", onStateChange);
				timeout = window.setTimeout(() => {
					cleanup();
					reject(
						new Error(
							`Timed out waiting for the Scramjet worker to activate (state: ${worker.state}).`
						)
					);
				}, serviceWorkerTimeout);
				onStateChange();
			});
		}
	}
	if (registration.active?.scriptURL !== expectedScript) {
		throw new Error("The selected Scramjet service worker is not active.");
	}
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
