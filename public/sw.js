importScripts("/controller/controller.sw.js");
importScripts("/scram-v1/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjetV1 = new ScramjetServiceWorker();

async function routeV1Request(event) {
	await scramjetV1.loadConfig();
	if (scramjetV1.route(event)) {
		return scramjetV1.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("install", (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("message", (event) => {
	if (event.data?.type === "CLASSROOM_SKIP_WAITING") {
		event.waitUntil(self.skipWaiting());
	}
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	const requestUrl = new URL(event.request.url);
	if (
		requestUrl.origin === self.location.origin &&
		requestUrl.pathname.startsWith("/~1/")
	) {
		event.respondWith(routeV1Request(event));
		return;
	}
	if ($scramjetController.shouldRoute(event)) {
		event.respondWith($scramjetController.route(event));
	}
});
