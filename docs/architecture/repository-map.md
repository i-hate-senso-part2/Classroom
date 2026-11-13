# Repository Map

This is the source-of-truth map for the project. Build output, dependency internals, and generated/vendor bundles are grouped by their owning directory rather than duplicated as one page per upstream file.

## Application code

- `src/index.js`: HTTP and WebSocket server, browser-state API, administrator endpoints, static mounts, and server lifecycle.
- `scripts/hash-admin-password.js`: interactive scrypt hash generator.
- `public/index.html`: browser shell and control markup.
- `public/index.js`: tabs, navigation, bookmarks, theme, cloaking UI, admin UI, and transport initialization.
- `public/search.js`: address-bar URL/search normalization.
- `public/register-sw.js`: service-worker registration and secure-context checks.
- `public/sw.js`: Scramjet v2 service-worker routing and activation lifecycle.
- `public/sw-v1.js`: Scramjet v1.1.0 service-worker routing and activation lifecycle.
- `public/config.js`: loaded by `index.html`, but its settings are not consumed by the browser runtime.
- `public/browser.css` and `public/index.css`: browser presentation styles.
- `public/404.html`: not-found page.
- `public/credits.html`: project credits.

## Browser runtime assets

- `public/scram/`, `public/baremux/`, and `public/epoxy/`: Scramjet v1.1.0 runtime and transport assets, loaded when selected in the browser toolbar.
- `scripts/prepare-static-assets.js`: copies the installed V2 runtime and generates a V1 bundle with an isolated IndexedDB database name.
- `public/controller/` and `public/libcurl/`: Scramjet v2 controller and transport assets.
- The installed Scramjet v2 runtime and local v1 runtime are served under `/scramjet/`, `/scram-v1/`, and `/scram/`; Vercel rewrites the former `/scramjet-v1/` prefix for cached clients. The remaining controller and transport assets are served from `public/`.
- `public/logos/`: local images used by quick links, search engines, and tab appearance presets.
- `public/sj.png`, `public/blocked.png`, and `public/favicon.ico`: brand, restriction-screen, and favicon assets.

These runtime directories contain upstream package files; consult the upstream projects for their internal APIs.

## Runtime data

- `data/browser-state.json`: local persisted blocked setting, created by the server as needed; ignored by Git.
- `.env`, `.env.local`: local environment files; do not commit secrets.
- `.env.example`: template for the environment variables consumed by the application; see [configuration](../getting-started/configuration.md).

## Project and deployment files

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package-lock.json`: package metadata, scripts, and dependency locks. The documented developer workflow uses pnpm; the Dockerfile currently uses npm and `package-lock.json`.
- `Dockerfile`: container image definition.
- `docker-compose.yml`: currently commented-out example, not a runnable Compose service.
- `vercel.json`: serves `public/` as static output and configures cross-origin isolation headers; `/api/*` rewrites to the shared function in `api/index.js`.
- `scripts/prepare-static-assets.js`: copies the installed Scramjet V2 runtime and Wasm into static output before deployment or local startup.
- `app.json`, `replit.nix`, `.replit`: Replit metadata and environment settings.
- `.vercel/`: local Vercel project metadata when present; do not publish secrets from it.
- `eslint.config.mjs`, `prettier.config.js`, `.prettierignore`: lint and formatting configuration.
- `.gitignore`, `.dockerignore`: repository/container exclusions.
- `LICENSE`: project license.
- `.github/ISSUE_TEMPLATE/bug_report.md`: GitHub bug report form.
- `.github/workflows/`: repository automation workflows.

## Documentation

- `docs/README.md`: docs home and category directory.
- `docs/getting-started/`: installation and configuration.
- `docs/architecture/`: runtime flow and this repository map.
- `docs/reference/`: user-facing browser behavior, API, and transport details.
- `docs/operations/`: deployment, admin state, and troubleshooting.
- `docs/development/`: contributor workflow.
- `docs/security/`: security and privacy considerations.
