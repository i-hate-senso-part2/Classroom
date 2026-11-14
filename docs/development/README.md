# Development Workflow

## Setup

Follow [local setup](../getting-started/local-setup.md). The package uses ES modules and declares `pnpm@10.18.3` as its package manager.

## Day-to-day checks

- `pnpm lint` runs ESLint against `src/`.
- `pnpm test` builds the static runtime and runs Chromium smoke tests with Playwright. Install its browser once with `pnpm exec playwright install chromium`.
- `pnpm format` runs Prettier across the repository; inspect the resulting diff because it can touch files beyond the code you intended to edit.
- `pnpm build` prepares the Scramjet v2 runtime and isolated v1 bundle under `public/`.

## Change map

Server/API behavior belongs in `src/index.js`; browser behavior belongs mainly in `public/index.js`, with markup in `public/index.html` and styles in `public/browser.css` and `public/index.css`. Keep environment and deployment changes aligned with [configuration](../getting-started/configuration.md) and [deployment](../operations/deployment.md).

When changing runtime behavior, update the corresponding reference page under `docs/reference/` and the [repository map](../architecture/repository-map.md) if files or responsibilities move.

## UI guides

- [Customizing the homepage](customizing-homepage.md)
- [Customizing the loading screen](customizing-loading-screen.md)

## Dependency workflow note

The project declares pnpm and tracks both `pnpm-lock.yaml` and `package-lock.json`, while the current Dockerfile uses npm. Keep both lockfiles aligned when changing dependency versions.
