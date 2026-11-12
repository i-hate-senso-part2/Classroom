# Application and Request Flow

## Startup

`src/index.js` loads dotenv files, reads admin/KV settings, loads local browser state, configures the Wisp server, and creates a Fastify server backed by Node's HTTP server. The server adds cross-origin isolation headers to HTTP responses and routes WebSocket upgrades ending in `/wisp/` to Wisp.

## Browser page flow

1. The server serves `public/index.html` and the static files under `public/`.
2. Before the first proxied navigation, `public/index.js` registers `public/sw.js` and waits for the Scramjet v2 worker to activate and control the page.
3. The page creates a v2 `Controller` with a `LibcurlClient` configured for the current host's `/wisp/` WebSocket path.
4. Controller-managed frames and the v2 service worker handle proxied navigations; ordinary requests not claimed by Scramjet continue through the normal fetch path.

The browser also polls `/api/browser-state` on load, when the tab becomes visible, and every 10 seconds to update the blocked overlay, announcement popup, and administrator refresh signal. A previous blocked value is cached locally so it can be displayed before the startup screen on refresh.

## Static mounts

- `/`: files from `public/`.
- `/scramjet/`: Scramjet v2 runtime files from its installed package.
- `/scramjet-controller/`: Scramjet v2 controller API, service worker, and injection scripts from the matching controller package.
- `/libcurl/`: libcurl transport files from its installed package.
- `/wisp/`: WebSocket transport endpoint, not a static directory.

Unknown paths receive `public/404.html`.

## Admin state flow

Admin requests authenticate with a signed, HTTP-only `classroom_admin` cookie. The cookie is scoped to `/api` so the browser-state endpoint can apply administrator bypass. Shared browser settings are read and written through the configured KV REST API when available, or through `data/browser-state.json` for local non-Vercel runs. Detailed route and persistence behavior is in [the API reference](../reference/api.md) and [state operations](../operations/admin-state.md).
