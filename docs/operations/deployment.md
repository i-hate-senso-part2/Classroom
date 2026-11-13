# Deployment

## Vercel

Vercel serves `public/` as static output from its CDN; only `/api/*` requests run the Fastify handler through `api/[...path].js`. The build copies the Scramjet V2 runtime and Wasm from the installed package into `public/scramjet/`, so the static assets stay aligned with the dependency version. COOP and COEP headers are applied to static responses for cross-origin isolation.

The local server still serves static files through Fastify. `pnpm start` builds the V2 assets before starting it; the Docker image prepares them during its build. In the Vercel project settings, configure:

- `ADMIN_PASSWORD_HASH` if administrator access is required.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` for persistent blocked state, or the supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` pair.

Function filesystems are ephemeral, so the local JSON state file is not a suitable Vercel backend. Redeploy after changing environment variables. Admin auth remains disabled if its hash is absent or invalid.

The browser connects to the WebSocket-capable Render Wisp service at `wss://wisp-server-python-nh0a.onrender.com/`; it does not use a same-origin `/wisp/` fallback. Static assets no longer pass through the function, reducing Fast Origin Transfer, but API responses still use compute and consume some origin transfer. Static downloads still count toward Fast Data Transfer and CDN request usage.

## Docker

The `Dockerfile` uses Node 18 Alpine, exposes port `8080`, and runs `src/index.js`. It currently installs from `package.json` and `package-lock.json` with npm. By contrast, the project declares pnpm as its package manager. Keep that distinction in mind when updating dependencies or the container build.

`docker-compose.yml` is only a commented-out older example and does not currently define an active service.

## Replit and self-hosting

The repository includes `.replit` and `replit.nix` files for Replit. For another host, install dependencies, provide the environment variables, and run `pnpm start` (or the Docker image). The server binds to `0.0.0.0`; place it behind an appropriately configured TLS-terminating reverse proxy for public use.

Do not assume the container, Vercel, and local filesystem have identical persistence behavior. See [Administrator and browser state](admin-state.md).
