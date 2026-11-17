# Troubleshooting

## Server does not start

- Confirm Node.js is supported and dependencies installed successfully with `pnpm install`.
- Check whether the selected `PORT` is available. The default is `8080`.
- Inspect startup output for a malformed `ADMIN_PASSWORD_HASH`; an invalid hash disables admin sign-in but should not prevent the server from starting.

## Browser navigation fails

- Service workers require HTTPS except on `localhost` and `127.0.0.1`.
- After switching versions, Classroom retries activation of the selected service worker before reporting a timeout. If an old worker still controls the page, close other Classroom tabs and reload once.
- Service worker timeouts now show the active, installing, and waiting worker URLs and states under **Error logs**. V1 remains selected; Classroom does not silently switch versions.
- Check the browser console for WebSocket errors connecting to `wss://wisp-server-python-nh0a.onrender.com/`; confirm the Render service is running and accepting connections at `/`.
- The new-tab UI opens before the proxy transport initializes. A proxied page that has not loaded after 30 seconds shows a timeout; retry after checking the worker and Wisp connection.
- Some upstream sites can block or limit traffic based on hosting IP, network policy, or request volume; this is outside the browser UI's control.
- The error panel labels setup failures as Classroom runtime, proxy transport, or service-worker issues. A generic page-load timeout is intentionally marked as ambiguous because the browser cannot reliably distinguish a silent destination failure from a dropped proxy connection. Use the admin connection check to test configured Wisp endpoints.
- Console errors such as upstream `403`/`500` responses, failed third-party media, unused preload warnings, and embedded-frame COEP or quirks-mode notices usually come from the destination site or its embedded resources. Classroom's own `public/index.html` uses a standards-mode doctype. The app enables COEP for cross-origin isolation; removing it can break runtime features, so do not weaken that policy just to silence warnings from a proxied site.
- `Unchecked runtime.lastError` messages mentioning a closed message channel are commonly emitted by browser extensions. Try a private window with extensions disabled to distinguish extension noise from application errors.

## Admin access is unavailable

- Set a valid `ADMIN_PASSWORD_HASH`; there is no default password.
- Generate the value with `pnpm hash-admin-password`, and ensure the variable is present in the environment where the server process runs.
- Five failed attempts from the same IP trigger a 15-minute lockout; restart clears the in-memory limiter.

## Blocked setting returns an error

- Locally, check filesystem permissions for `data/` and the `browser-state.json` file.
- On Vercel, configure both KV URL and token values and redeploy.
- Do not set only one member of a KV credential pair.

## Formatting or linting

`pnpm lint` checks `src/`; the repository does not currently provide a test script. `pnpm format` formats files across the repository, so review its diff before keeping any broad formatting changes.
