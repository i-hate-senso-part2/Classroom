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
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

dotenv.config({ path: ".env.local" });
dotenv.config();

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
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
let browserState = { blocked: false };

try {
	browserState = {
		...browserState,
		...JSON.parse(readFileSync(browserStatePath, "utf8")),
	};
	if (typeof browserState.blocked !== "boolean") browserState.blocked = false;
} catch {}

if (!adminPasswordConfig) {
	console.warn(
		"A valid ADMIN_PASSWORD_HASH is not set; administrator sign-in is disabled."
	);
}

function sessionCookieOptions(request, maxAge = adminSessionLifetime / 1000) {
	const secure =
		request.protocol === "https" ||
		request.headers["x-forwarded-proto"] === "https";
	return `HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
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

async function readBlockedState() {
	assertStateStorageAvailable();
	if (!hasKvConfig) return browserState.blocked;
	const value = await kvCommand("GET", "classroom:blocked");
	if (value !== null && value !== "0" && value !== "1") {
		throw new Error("Stored blocked setting is invalid.");
	}
	return value === "1";
}

function persistBrowserState(blocked) {
	mkdirSync(dirname(browserStatePath), { recursive: true });
	writeFileSync(browserStatePath, `${JSON.stringify({ blocked }, null, 2)}\n`, {
		mode: 0o600,
	});
}

async function saveBlockedState(blocked) {
	assertStateStorageAvailable();
	if (hasKvConfig) {
		await kvCommand("SET", "classroom:blocked", blocked ? "1" : "0");
	} else {
		persistBrowserState(blocked);
	}
	browserState.blocked = blocked;
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

const fastify = Fastify({
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
		return reply
			.header("Cache-Control", "no-store")
			.send({ blocked: await readBlockedState() });
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
		.header(
			"Set-Cookie",
			`classroom_admin=${token}; ${sessionCookieOptions(request, maxAge)}`
		)
		.send({ authenticated: true });
});

fastify.get("/api/admin/state", async (request, reply) => {
	if (!getAdminSession(request))
		return reply.code(401).send({ error: "Admin sign-in required." });
	try {
		return reply
			.header("Cache-Control", "no-store")
			.send({ blocked: await readBlockedState() });
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
		await saveBlockedState(request.body.blocked);
	} catch (error) {
		request.log.error(error);
		return reply.code(503).send({ error: error.message });
	}
	return reply.send({ blocked: browserState.blocked });
});

fastify.post("/api/admin/logout", async (request, reply) => {
	const cookie = (request.headers.cookie || "")
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith("classroom_admin="));
	return reply
		.header(
			"Set-Cookie",
			`classroom_admin=; ${sessionCookieOptions(request, 0)}`
		)
		.send({ authenticated: false });
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
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
	port: port,
	host: "0.0.0.0",
});
