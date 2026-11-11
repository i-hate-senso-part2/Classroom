# Security and Privacy

## Administrator credentials

Use a unique, long password and keep `ADMIN_PASSWORD_HASH` in deployment secrets or ignored local environment files. Never commit passwords, hashes, KV tokens, or populated environment files. Admin login is disabled when the hash is missing or invalid.

Admin sessions use an HTTP-only, SameSite Strict cookie signed with HMAC-SHA-256 and expire after eight hours. Login throttling is in-memory, per server process, and is not a distributed rate limiter.

## State and deployment

Blocked state can be written to local disk or to the configured KV service. On Vercel, use KV rather than relying on ephemeral function storage. Restrict access to KV credentials and review the hosting provider's secret-management controls.

## Privacy boundaries

- Tab cloaking changes only the visible tab title and icon; it does not hide network traffic, server logs, or activity from the device administrator.
- Bookmarks and theme preference live in browser local storage.
- Proxied destinations and transport traffic are handled by this server and its configured upstream components. Do not represent the browser as anonymous or as a way to evade monitoring.
- The server binds on all interfaces. Use network controls and HTTPS termination appropriate to the deployment.

## Responsible operation

Only deploy and use the service where authorized. Review applicable organizational rules, hosting-provider terms, upstream project documentation, and local law. The Wisp settings and hostname filtering are configured in `src/index.js`.

## Third-party account limits

Some services restrict sign-ins from hosting-provider IP ranges or after repeated attempts. The browser cannot override those decisions. Stop retrying until the service's cooldown expires, then use its official app/site, account recovery, or support. Do not rotate proxy endpoints or spoof client signals to evade a service's abuse controls.
