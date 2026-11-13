# Application and Request Flow

## Startup

`src/index.js` loads dotenv files, reads admin/KV settings, loads local browser state, configures the Wisp server, and creates a Fastify server backed by Node's HTTP server. The server adds cross-origin isolation headers to HTTP responses and routes WebSocket upgrades ending in `/wisp/` to Wisp.

## Browser page flow

1. The server serves `public/index.html` and the static files under `public/`.
2. Before the first proxied navigation, `public/index.js` loads the selected runtime, registers its service worker, and waits for it to control the page. Changing the toolbar selector reloads the browser so the selected version and worker stay in sync.
3. For v2, the page creates a `Controller` with a `LibcurlClient`. For v1.1.0, it creates a `ScramjetController` and configures BareMux with Epoxy. Both use the configured Wisp WebSocket endpoint.
4. Controller-managed frames and the selected service worker handle proxied navigations; ordinary requests not claimed by Scramjet continue through the normal fetch path.

The browser also polls `/api/admin/browser-state` on load, when the tab becomes visible, and every 10 seconds to update the blocked overlay, announcement popup, shared homepage links, and administrator refresh signal. This endpoint is under `/api/admin` so it receives both current and older path-scoped admin cookies. A previous blocked value is cached locally so it can be displayed before the startup screen on refresh. Expired timed blocks are cleared on state reads.

## Static mounts

- `/`: files from `public/`.
- `/scramjet/`: Scramjet v2 runtime files from its installed package.
- `/scram/`: Scramjet v1.1.0 runtime files from `public/scram/`. Vercel rewrites old `/scramjet-v1/` requests to this static directory. The V1 service worker only intercepts same-origin `/~1/` proxy URLs, leaving Classroom pages and assets untouched.
- `/controller/`: Scramjet v2 controller API, service worker, and injection scripts from `public/controller/`.
- `/libcurl/`, `/baremux/`, and `/epoxy/`: transport assets for the selected runtime.
- `/wisp/`: WebSocket transport endpoint, not a static directory.

Unknown paths receive `public/404.html`.

## Admin state flow

Admin requests authenticate with a signed, HTTP-only `classroom_admin` cookie. The cookie is scoped to `/api` so the browser-state endpoint can apply administrator bypass. Shared browser settings are read and written through the configured KV REST API when available, or through `data/browser-state.json` for local non-Vercel runs. Detailed route and persistence behavior is in [the API reference](../reference/api.md) and [state operations](../operations/admin-state.md).
