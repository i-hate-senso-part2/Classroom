import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";

dotenv.config({ path: ".env.local" });
dotenv.config();

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const libcurlPath = fileURLToPath(
	new URL("../public/libcurl/", import.meta.url)
);
const scramjetControllerPath = fileURLToPath(
	new URL("../public/controller/", import.meta.url)
);
const browserStatePath = fileURLToPath(
	new URL("../data/browser-state.json", import.meta.url)
);
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
const adminPasswordHashParts = adminPasswordHash.split(":");
const adminPasswordConfig =
	adminPasswordHashParts.length === 3 &&
	adminPasswordHashParts[0] === "scrypt" &&
	/^[\da-f]{32}$/i.test(adminPasswordHashParts[1]) &&
	/^[\da-f]{128}$/i.test(adminPasswordHashParts[2])
		? {
				salt: Buffer.from(adminPasswordHashParts[1], "hex"),
				digest: Buffer.from(adminPasswordHashParts[2], "hex"),
			}
		: null;
const scryptAsync = promisify(scrypt);
const kvRestUrl =
	process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const kvRestToken =
	process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasKvConfig = Boolean(kvRestUrl && kvRestToken);
const hasPartialKvConfig = Boolean(kvRestUrl || kvRestToken) && !hasKvConfig;
const loginAttempts = new Map();
const adminSessionLifetime = 8 * 60 * 60 * 1000;
const defaultBrowserState = {
	blocked: false,
	adminBypass: false,
	announcement: "",
	announcementId: "",
	announcementDismissible: true,
	announcementExpiresAt: null,
	announcementAutoDismissSeconds: 0,
	refreshToken: "",
	refreshSource: "",
};
let browserState = { ...defaultBrowserState };

try {
	browserState = normalizeBrowserState(
		JSON.parse(readFileSync(browserStatePath, "utf8"))
	);
} catch {}

if (!adminPasswordConfig) {
	console.warn(
		"A valid ADMIN_PASSWORD_HASH is not set; administrator sign-in is disabled."
	);
}

function sessionCookieOptions(
	request,
	maxAge = adminSessionLifetime / 1000,
	path = "/api"
) {
	const secure =
		request.protocol === "https" ||
		request.headers["x-forwarded-proto"] === "https";
	return `HttpOnly; SameSite=Strict; Path=${path}; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function getAdminSession(request) {
	if (!adminPasswordConfig) return false;
	const cookie = (request.headers.cookie || "")
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith("classroom_admin="));
	const token = cookie?.slice("classroom_admin=".length);
	if (!token) return false;
	const [expiresText, nonce, signature] = token.split(".");
	if (
		!/^\d+$/.test(expiresText) ||
		!/^[\da-f]{32}$/i.test(nonce) ||
		!/^[\da-f]{64}$/i.test(signature) ||
		Number(expiresText) <= Date.now()
	) {
		return false;
	}
	const payload = `${expiresText}.${nonce}`;
	const expected = createHmac("sha256", adminPasswordConfig.digest)
		.update(payload)
		.digest();
	const supplied = Buffer.from(signature, "hex");
	return timingSafeEqual(supplied, expected);
}

function createAdminSession() {
	const expiresAt = Date.now() + adminSessionLifetime;
	const expiresText = String(expiresAt);
	const nonce = randomBytes(16).toString("hex");
	const payload = `${expiresText}.${nonce}`;
	const signature = createHmac("sha256", adminPasswordConfig.digest)
		.update(payload)
		.digest("hex");
	return { token: `${payload}.${signature}`, expiresAt };
}

function assertStateStorageAvailable() {
	if (hasPartialKvConfig) {
		throw new Error("Configure both KV_REST_API_URL and KV_REST_API_TOKEN.");
	}
	if (!hasKvConfig && process.env.VERCEL) {
		throw new Error(
			"Vercel needs a KV store. Configure KV_REST_API_URL and KV_REST_API_TOKEN."
		);
	}
}

async function kvCommand(command, ...args) {
	const response = await fetch(`${kvRestUrl.replace(/\/+$/, "")}/`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${kvRestToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify([command, ...args]),
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok || payload.error) {
		throw new Error(
			payload.error || `KV request failed with ${response.status}.`
		);
	}
	return payload.result;
}

function normalizeBrowserState(state) {
	if (!state || typeof state !== "object" || Array.isArray(state)) {
		throw new Error("Stored browser settings are invalid.");
	}
	if (state.blocked !== undefined && typeof state.blocked !== "boolean") {
		throw new Error("Stored blocked setting is invalid.");
	}
	if (
		state.adminBypass !== undefined &&
		typeof state.adminBypass !== "boolean"
	) {
		throw new Error("Stored administrator bypass setting is invalid.");
	}
	if (
		state.announcement !== undefined &&
		(typeof state.announcement !== "string" || state.announcement.length > 500)
	) {
		throw new Error("Stored announcement is invalid.");
	}
	if (
		state.announcementId !== undefined &&
		(typeof state.announcementId !== "string" ||
			state.announcementId.length > 100)
	) {
		throw new Error("Stored announcement identifier is invalid.");
	}
	if (
		state.announcementDismissible !== undefined &&
		typeof state.announcementDismissible !== "boolean"
	) {
		throw new Error("Stored announcement close setting is invalid.");
	}
	if (
		state.announcementExpiresAt !== undefined &&
		state.announcementExpiresAt !== null &&
		(!Number.isSafeInteger(state.announcementExpiresAt) ||
			state.announcementExpiresAt <= 0)
	) {
		throw new Error("Stored announcement expiry is invalid.");
	}
	if (
		state.announcementAutoDismissSeconds !== undefined &&
		![0, 5, 10, 15, 30, 60, 120].includes(state.announcementAutoDismissSeconds)
	) {
		throw new Error("Stored announcement auto-close setting is invalid.");
	}
	return {
		...defaultBrowserState,
		...state,
	};
}

async function readBrowserState() {
	assertStateStorageAvailable();
	if (!hasKvConfig) return browserState;
	const stored = await kvCommand("GET", "classroom:settings");
	if (stored !== null) {
		try {
			return normalizeBrowserState(JSON.parse(stored));
		} catch (error) {
			throw new Error(
				`Could not read stored browser settings: ${error.message}`
			);
		}
	}
	const legacyBlocked = await kvCommand("GET", "classroom:blocked");
	if (
		legacyBlocked !== null &&
		legacyBlocked !== "0" &&
		legacyBlocked !== "1"
	) {
		throw new Error("Stored blocked setting is invalid.");
	}
	return { ...defaultBrowserState, blocked: legacyBlocked === "1" };
}

function persistBrowserState(state) {
	mkdirSync(dirname(browserStatePath), { recursive: true });
	writeFileSync(browserStatePath, `${JSON.stringify(state, null, 2)}\n`, {
		mode: 0o600,
	});
}

async function saveBrowserState(state) {
	assertStateStorageAvailable();
	if (hasKvConfig) {
		await kvCommand("SET", "classroom:settings", JSON.stringify(state));
	} else {
		persistBrowserState(state);
	}
	browserState = state;
}

async function updateBrowserState(updates) {
	const state = await readBrowserState();
	const updated = normalizeBrowserState({ ...state, ...updates });
	await saveBrowserState(updated);
	return updated;
}

async function verifyAdminPassword(password) {
	if (!adminPasswordConfig) return false;
	const candidate = await scryptAsync(
		String(password || ""),
		adminPasswordConfig.salt,
		adminPasswordConfig.digest.length
	);
	return timingSafeEqual(candidate, adminPasswordConfig.digest);
}

// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

export const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.get("/api/browser-state", async (request, reply) => {
	try {
		const state = await readBrowserState();
		const isAdmin = getAdminSession(request);
		const announcementExpired =
			state.announcementExpiresAt !== null &&
			state.announcementExpiresAt <= Date.now();
		const announcement = announcementExpired ? "" : state.announcement;
		return reply.header("Cache-Control", "no-store").send({
			blocked: state.blocked && !(state.adminBypass && isAdmin),
			isAdmin,
			announcement,
			announcementId: announcement
				? state.announcementId || state.announcement
				: "",
			announcementDismissible: state.announcementDismissible,
			announcementExpiresAt: announcementExpired
				? null
				: state.announcementExpiresAt,
			announcementAutoDismissSeconds: state.announcementAutoDismissSeconds,
			refreshToken: state.refreshToken,
			refreshSource: state.refreshSource,
		});
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.post("/api/admin/login", async (request, reply) => {
	if (!adminPasswordConfig) {
		return reply.code(503).send({
			error:
				"Set a valid ADMIN_PASSWORD_HASH on the server to enable admin access.",
		});
	}
	const ip = request.ip;
	const attempts = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
	if (attempts.lockedUntil > Date.now()) {
		return reply
			.code(429)
			.send({ error: "Too many attempts. Try again later." });
	}
	if (!(await verifyAdminPassword(request.body?.password))) {
		attempts.count++;
		if (attempts.count >= 5) {
			attempts.count = 0;
			attempts.lockedUntil = Date.now() + 15 * 60 * 1000;
		}
		loginAttempts.set(ip, attempts);
		return reply.code(401).send({ error: "Incorrect administrator password." });
	}
	loginAttempts.delete(ip);
	const { token, expiresAt } = createAdminSession();
	const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
	return reply
		.header("Set-Cookie", [
			`classroom_admin=${token}; ${sessionCookieOptions(request, maxAge)}`,
			`classroom_admin=; ${sessionCookieOptions(request, 0, "/api/admin")}`,
		])
		.send({ authenticated: true });
});

fastify.get("/api/admin/state", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	try {
		const state = await readBrowserState();
		return reply.header("Cache-Control", "no-store").send({
			blocked: state.blocked,
			adminBypass: state.adminBypass,
			announcement: state.announcement,
			announcementDismissible: state.announcementDismissible,
			announcementExpiresAt: state.announcementExpiresAt,
			announcementAutoDismissSeconds: state.announcementAutoDismissSeconds,
		});
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.get("/api/admin/session", async (request, reply) => {
	return reply.header("Cache-Control", "no-store").send({
		authenticated: Boolean(adminPasswordConfig) && getAdminSession(request),
		enabled: Boolean(adminPasswordConfig),
	});
});

fastify.post("/api/admin/blocked", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	if (typeof request.body?.blocked !== "boolean") {
		return reply.code(400).send({ error: "Blocked must be true or false." });
	}
	try {
		const state = await updateBrowserState({
			blocked: request.body.blocked,
		});
		return reply.send({ blocked: state.blocked });
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.post("/api/admin/bypass", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	if (typeof request.body?.adminBypass !== "boolean") {
		return reply
			.code(400)
			.send({ error: "Admin bypass must be true or false." });
	}
	try {
		const state = await updateBrowserState({
			adminBypass: request.body.adminBypass,
		});
		return reply.send({ adminBypass: state.adminBypass });
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.post("/api/admin/announcement", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	const announcement = request.body?.announcement;
	const dismissible = request.body?.dismissible;
	const expiresAt = request.body?.expiresAt;
	const autoDismissSeconds = request.body?.autoDismissSeconds;
	if (typeof announcement !== "string" || announcement.length > 500) {
		return reply.code(400).send({
			error: "Announcement must be text with at most 500 characters.",
		});
	}
	if (typeof dismissible !== "boolean") {
		return reply
			.code(400)
			.send({ error: "Dismissible must be true or false." });
	}
	if (
		expiresAt !== null &&
		(typeof expiresAt !== "string" ||
			!Number.isFinite(Date.parse(expiresAt)) ||
			Date.parse(expiresAt) <= Date.now())
	) {
		return reply.code(400).send({
			error: "Announcement expiry must be a future date and time or empty.",
		});
	}
	if (![0, 5, 10, 15, 30, 60, 120].includes(autoDismissSeconds)) {
		return reply.code(400).send({
			error: "Auto-close must be 0, 5, 10, 15, 30, 60, or 120 seconds.",
		});
	}
	try {
		const state = await updateBrowserState({
			announcement: announcement.trim(),
			announcementId: announcement.trim()
				? randomBytes(16).toString("hex")
				: "",
			announcementDismissible: announcement.trim() ? dismissible : true,
			announcementExpiresAt:
				announcement.trim() && expiresAt ? Date.parse(expiresAt) : null,
			announcementAutoDismissSeconds: announcement.trim()
				? autoDismissSeconds
				: 0,
		});
		return reply.send({
			announcement: state.announcement,
			announcementId: state.announcementId,
		});
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.post("/api/admin/refresh", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	const sourceId = request.body?.sourceId;
	if (typeof sourceId !== "string" || !/^[\da-z-]{1,80}$/i.test(sourceId)) {
		return reply
			.code(400)
			.send({ error: "A valid browser identifier is required." });
	}
	try {
		const currentState = await readBrowserState();
		const state = normalizeBrowserState({
			...currentState,
			refreshToken: randomBytes(16).toString("hex"),
			refreshSource: sourceId,
		});
		await saveBrowserState(state);
		return reply.send({
			blocked: currentState.blocked,
			refreshToken: state.refreshToken,
		});
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
});

fastify.post("/api/admin/logout", async (request, reply) => {
	const cookie = (request.headers.cookie || "")
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith("classroom_admin="));
	return reply
		.header("Set-Cookie", [
			`classroom_admin=; ${sessionCookieOptions(request, 0)}`,
			`classroom_admin=; ${sessionCookieOptions(request, 0, "/api/admin")}`,
		])
		.send({ authenticated: false });
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scramjet/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: scramjetControllerPath,
	prefix: "/scramjet-controller/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

if (!process.env.VERCEL) {
	fastify.server.on("listening", () => {
		const address = fastify.server.address();

		console.log("Listening on:");
		console.log(`\thttp://localhost:${address.port}`);
		console.log(`\thttp://${hostname()}:${address.port}`);
		console.log(
			`\thttp://${
				address.family === "IPv6" ? `[${address.address}]` : address.address
			}:${address.port}`
		);
	});

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	function shutdown() {
		console.log("SIGTERM signal received: closing HTTP server");
		fastify.close();
		process.exit(0);
	}

	let port = parseInt(process.env.PORT || "");
	if (isNaN(port)) port = 8080;

	fastify.listen({
		port,
		host: "0.0.0.0",
	});
}

let vercelReady;

export default async function handler(request, response) {
	try {
		if (!vercelReady) vercelReady = fastify.ready();
		await vercelReady;
		fastify.server.emit("request", request, response);
	} catch (error) {
		console.error("Vercel request handler failed:", error);
		if (!response.headersSent) {
			response.statusCode = 500;
			response.setHeader("content-type", "text/plain; charset=utf-8");
			response.end("Internal server error");
		}
	}
}
