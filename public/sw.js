importScripts("/controller/controller.sw.js");

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
	if ($scramjetController.shouldRoute(event)) {
		event.respondWith($scramjetController.route(event));
	}
});
