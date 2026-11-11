# Local Setup

## Requirements

- Node.js 16 or newer. Node.js 20 is a suitable current baseline.
- pnpm 10.18.3, as declared by the package's `packageManager` field.
- Git, if cloning the repository.

## Install and run

From the repository root:

```sh
pnpm install
pnpm start
```

The server listens on port `8080` by default and prints the local URL. Set `PORT` to use another port. The listener binds to `0.0.0.0`, so it is reachable on the host's network interfaces; account for this when running on shared machines.

## Local environment

The server loads `.env.local` and then `.env` through dotenv. Create an ignored `.env.local` for local secrets and settings. See [Configuration](configuration.md) for variables currently read by the application.

Administrator access is disabled until a valid `ADMIN_PASSWORD_HASH` is configured. To generate one interactively, run:

```sh
pnpm hash-admin-password
```

The script requires a password of at least 12 characters and confirmation. Store the printed hash in `.env.local`; never commit the password or hash.

## Useful scripts

- `pnpm start`: start the Node.js server.
- `pnpm hash-admin-password`: generate a scrypt password hash for the admin panel.
- `pnpm lint`: lint `src/` with ESLint.
- `pnpm format`: format repository files with Prettier.
- `pnpm build`: reports that no compilation step is required.

The package does not currently define a test script.
