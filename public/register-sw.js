"use strict";
const stockSW = "./sw.js";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
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

	const registration = await navigator.serviceWorker.register(stockSW);
	const worker = registration.installing || registration.waiting;
	if (worker && worker.state !== "activated") {
		await new Promise((resolve, reject) => {
			const onStateChange = () => {
				if (worker.state === "activated") {
					worker.removeEventListener("statechange", onStateChange);
					resolve();
				} else if (worker.state === "redundant") {
					worker.removeEventListener("statechange", onStateChange);
					reject(new Error("Scramjet service worker failed to activate."));
				}
			};
			worker.addEventListener("statechange", onStateChange);
			onStateChange();
		});
	}
	await navigator.serviceWorker.ready;
	if (navigator.serviceWorker.controller !== registration.active) {
		await new Promise((resolve) => {
			navigator.serviceWorker.addEventListener("controllerchange", resolve, {
				once: true,
			});
		});
	}
	return registration;
}
