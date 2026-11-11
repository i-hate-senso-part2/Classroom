# Deployment

## Vercel

`vercel.json` sends all routes to `src/index.js` as a Node function. In the Vercel project settings, configure:

- `ADMIN_PASSWORD_HASH` if administrator access is required.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` for persistent blocked state, or the supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` pair.

Function filesystems are ephemeral, so the local JSON state file is not a suitable Vercel backend. Redeploy after changing environment variables. Admin auth remains disabled if its hash is absent or invalid.

## Docker

The `Dockerfile` uses Node 18 Alpine, exposes port `8080`, and runs `src/index.js`. It currently installs from `package.json` and `package-lock.json` with npm. By contrast, the project declares pnpm as its package manager. Keep that distinction in mind when updating dependencies or the container build.

`docker-compose.yml` is only a commented-out older example and does not currently define an active service.

## Replit and self-hosting

The repository includes `.replit` and `replit.nix` files for Replit. For another host, install dependencies, provide the environment variables, and run `pnpm start` (or the Docker image). The server binds to `0.0.0.0`; place it behind an appropriately configured TLS-terminating reverse proxy for public use.

Do not assume the container, Vercel, and local filesystem have identical persistence behavior. See [Administrator and browser state](admin-state.md).
