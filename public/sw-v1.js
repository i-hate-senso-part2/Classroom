importScripts("/scram-v1/scramjet.all.js");

const scramjetDatabaseName = "$classroom-scramjet-v1";
const scramjetDatabaseVersion = 3;
const scramjetDatabaseStores = [
	"config",
	"cookies",
	"redirectTrackers",
	"referrerPolicies",
	"publicSuffixList",
];

const databaseReady = new Promise((resolve, reject) => {
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
		resolve();
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

let scramjet;

async function getScramjet() {
	await databaseReady;
	if (!scramjet) {
		const { ScramjetServiceWorker } = $scramjetLoadWorker();
		scramjet = new ScramjetServiceWorker();
	}
	return scramjet;
}

async function handleRequest(event) {
	const runtime = await getScramjet();
	await runtime.loadConfig();
	if (runtime.route(event)) {
		return runtime.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("install", (event) => {
	event.waitUntil(databaseReady.then(() => self.skipWaiting()));
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
		requestUrl.origin !== self.location.origin ||
		!requestUrl.pathname.startsWith("/~1/")
	) {
		return;
	}
	event.respondWith(handleRequest(event));
});
