importScripts("/controller/controller.sw.js");

const scramjetDatabaseName = "$classroom-scramjet-v1";
const scramjetDatabaseVersion = 3;
const scramjetDatabaseStores = [
	"config",
	"cookies",
	"redirectTrackers",
	"referrerPolicies",
	"publicSuffixList",
];
let scramjetV1BundleLoaded = false;
let scramjetV1Ready;

function initializeScramjetV1() {
	if (!scramjetV1BundleLoaded) {
		importScripts("/scram-v1/scramjet.all.js");
		scramjetV1BundleLoaded = true;
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(
			scramjetDatabaseName,
			scramjetDatabaseVersion
		);
		request.addEventListener("upgradeneeded", () => {
			for (const store of scramjetDatabaseStores) {
				if (!request.result.objectStoreNames.contains(store)) {
					request.result.createObjectStore(store);
				}
			}
		});
		request.addEventListener("success", () => {
			request.result.close();
			const { ScramjetServiceWorker } = $scramjetLoadWorker();
			resolve(new ScramjetServiceWorker());
		});
		request.addEventListener("blocked", () => {
			reject(
				new Error(
					"Close other Classroom tabs to update the Scramjet V1 database."
				)
			);
		});
		request.addEventListener("error", () => {
			reject(
				request.error ||
					new Error("Could not initialize the Scramjet V1 database.")
			);
		});
	});
}

function getScramjetV1() {
	if (!scramjetV1Ready) {
		scramjetV1Ready = initializeScramjetV1().catch((error) => {
			scramjetV1Ready = null;
			throw error;
		});
	}
	return scramjetV1Ready;
}

async function routeV1Request(event) {
	const scramjetV1 = await getScramjetV1();
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
