# Administrator and Browser State

## Enabling administrator access

There is no default password. Generate a hash locally with:

```sh
pnpm hash-admin-password
```

The prompt requires at least 12 characters and confirmation. Set the printed `ADMIN_PASSWORD_HASH` value in ignored `.env.local` for local work, or in your deployment's secret/environment settings. The hash format is `scrypt:<salt-hex>:<digest-hex>`; the server validates the salt and digest lengths before enabling sign-in.

The panel opens through its toolbar control or the Up, Down, Up, Down sequence. Authentication uses a signed HTTP-only cookie with an eight-hour lifetime. Five bad attempts from one IP trigger a 15-minute in-memory lockout.

## Blocked setting persistence

- Local, without KV configuration: `data/browser-state.json`.
- With both KV URL and token: key `classroom:blocked` in the configured REST KV store.
- On Vercel: KV configuration is mandatory because function filesystems are ephemeral.

Configure either both `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or both supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` aliases. Partial configuration fails closed with an API error.

The browser fetches this setting on startup and refreshes it periodically. When enabled, the public UI displays the blocked overlay.

## Browser-local preferences

Theme and bookmarks are stored in the visitor's local storage. They are not administrator-managed server state and do not synchronize across browsers.
