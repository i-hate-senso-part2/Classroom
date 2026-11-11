# HTTP API

The API is implemented in `src/index.js`. JSON errors include an `error` field. State-read routes disable caching.

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/browser-state` | Public | Returns `{ "blocked": boolean }`; responds `503` if state storage is unavailable or fails. |
| `POST` | `/api/admin/login` | Public | Accepts `{ "password": string }`; returns an authenticated result and sets the signed session cookie. Responds `503` when admin auth is not configured, `401` on a wrong password, and `429` while the IP is rate-limited. |
| `GET` | `/api/admin/session` | Public | Returns `{ "authenticated": boolean, "enabled": boolean }`. |
| `GET` | `/api/admin/state` | Admin session | Returns the current blocked value. |
| `POST` | `/api/admin/blocked` | Admin session | Accepts `{ "blocked": boolean }` and persists the setting. Invalid values return `400`. |
| `POST` | `/api/admin/logout` | Public | Expires the session cookie and returns an unauthenticated result. |

## Authentication and limits

The session cookie is named `classroom_admin`, scoped to `/api/admin`, HTTP-only, and SameSite Strict. It is marked Secure when the request is HTTPS or has an HTTPS forwarded-protocol header. Sessions last eight hours and are signed with HMAC-SHA-256 using the configured password digest.

After five failed password attempts from an IP address, login is locked for 15 minutes. The attempt counter is held in server memory and is reset when the process restarts.

## State backend errors

Local development uses `data/browser-state.json` when no KV credentials are set. Vercel requires both `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or both supported `UPSTASH_REDIS_REST_*` aliases). Partial credentials or an unavailable backend produce a `503` response. See [Administrator and browser state](../operations/admin-state.md).
