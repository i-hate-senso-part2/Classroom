# Administrator and Browser State

## Enabling administrator access

There is no default password. Generate a hash locally with:

```sh
pnpm hash-admin-password
```

The prompt requires at least 12 characters and confirmation. Set the printed `ADMIN_PASSWORD_HASH` value in ignored `.env.local` for local work, or in your deployment's secret/environment settings. The hash format is `scrypt:<salt-hex>:<digest-hex>`; the server validates the salt and digest lengths before enabling sign-in.

The panel opens through its toolbar control or the Up, Down, Up, Down sequence. Authentication uses a signed HTTP-only cookie with an eight-hour lifetime. Five bad attempts from one IP trigger a 15-minute in-memory lockout.

## Shared browser settings

- Local, without KV configuration: `data/browser-state.json`.
- With both KV URL and token: key `classroom:settings` in the configured REST KV store. The app reads the legacy `classroom:blocked` value if the new key is not present.
- On Vercel: KV configuration is mandatory because function filesystems are ephemeral.

Configure either both `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or both supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` aliases. Partial configuration fails closed with an API error.

The admin panel can enable the public blocked screen, allow authenticated admins to bypass it, and schedule an automatic unblock time. The server clears an expired block on the next state request.

Admins can post or clear a 500-character announcement popup, choose whether visitors can close it, set a per-visitor auto-close timer, and optionally set a global expiration time. A preview is local to the admin session. Visitors see each announcement once until it is changed; authenticated admins do not see published popups.

Up to eight shared homepage links can be managed as `Label | https://example.com` lines. Only HTTP(S) URLs without embedded credentials are accepted. Changes are shared across visitors.

The admin panel's "Refresh everyone else" action sends a shared refresh signal. Open pages poll the setting every 10 seconds, check whether they are blocked, and reload only if access is allowed. The admin page that sent the signal is excluded.

## Browser-local preferences

Theme and bookmarks are stored in the visitor's local storage. They are not administrator-managed server state and do not synchronize across browsers.
