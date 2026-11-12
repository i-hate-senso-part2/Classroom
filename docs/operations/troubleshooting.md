# Troubleshooting

## Server does not start

- Confirm Node.js is supported and dependencies installed successfully with `pnpm install`.
- Check whether the selected `PORT` is available. The default is `8080`.
- Inspect startup output for a malformed `ADMIN_PASSWORD_HASH`; an invalid hash disables admin sign-in but should not prevent the server from starting.

## Browser navigation fails

- Service workers require HTTPS except on `localhost` and `127.0.0.1`.
- Check the browser console for WebSocket errors connecting to `wss://wisp-server-python-nh0a.onrender.com/`; confirm the Render service is running and accepting connections at `/`.
- Some upstream sites can block or limit traffic based on hosting IP, network policy, or request volume; this is outside the browser UI's control.

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
