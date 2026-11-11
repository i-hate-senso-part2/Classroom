# Configuration

This page lists configuration that the current application actually consumes. Do not copy unrelated template values into production without checking their use.

## Server variables

| Variable | Purpose | Behavior |
| --- | --- | --- |
| `PORT` | HTTP/WebSocket listen port | Defaults to `8080` if unset or not a valid integer. |
| `ADMIN_PASSWORD_HASH` | Enables administrator sign-in | Must use `scrypt:<32-hex-character-salt>:<128-hex-character-digest>`. Generate it with `pnpm hash-admin-password`. |
| `KV_REST_API_URL` | Upstash-compatible REST endpoint for persistent blocked state | Must be set together with its token. |
| `KV_REST_API_TOKEN` | Token for the REST endpoint | Must be set together with its URL. |
| `UPSTASH_REDIS_REST_URL` | Alternate name for the KV endpoint | Used only when `KV_REST_API_URL` is unset. |
| `UPSTASH_REDIS_REST_TOKEN` | Alternate name for the KV token | Used only when `KV_REST_API_TOKEN` is unset. |

Local `.env.local` and `.env` files are loaded by the server; environment variables supplied by the deployment platform are also available. Keep secrets out of source control.

## State storage

Without KV settings, local runs store the `blocked` setting in `data/browser-state.json`. On Vercel, both KV settings are required because function filesystems are ephemeral. Supplying only one KV value is an error. See [Administrator and browser state](../operations/admin-state.md).

## Browser settings and assets

Browser theme and bookmarks are stored in the visitor's local storage. Quick links, search-engine definitions, and tab appearance presets are defined in `public/index.js`; their image paths point into `public/logos/` or to `/sj.png`.

`public/config.js` defines a `SCRAMJET_APP_CONFIG` object, but `public/index.html` does not load that script. The active browser transport currently constructs a same-origin `/wisp/` WebSocket URL in `public/index.js`. Changing the unused config object's endpoint list alone does not change the active transport.

## Template caveat

`.env.example` includes Supabase and ban-hash variables that the current `src/index.js` does not read. Treat those entries as stale template material, not required application configuration.
