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
- `public/config.js`: separately defined browser config object; currently not loaded by `index.html`.
- `public/browser.css` and `public/index.css`: browser presentation styles.
- `public/404.html`: not-found page.
- `public/credits.html`: project credits.

## Browser runtime assets

- `public/scram/`, `public/baremux/`, and `public/controller/`: legacy v1 runtime copies, not used by the active browser flow.
- `public/libcurl/` and `public/epoxy/`: legacy transport client assets; active Libcurl v2 assets come from the installed package.
- Installed Scramjet v2 runtime, controller, and Libcurl assets are served under `/scramjet/`, `/scramjet-controller/`, and `/libcurl/` by `src/index.js`.
- `public/logos/`: local images used by quick links, search engines, and tab appearance presets.
- `public/sj.png`, `public/blocked.png`, and `public/favicon.ico`: brand, restriction-screen, and favicon assets.

These runtime directories contain upstream package files; consult the upstream projects for their internal APIs.

## Runtime data

- `data/browser-state.json`: local persisted blocked setting, created by the server as needed; ignored by Git.
- `.env`, `.env.local`: local environment files; do not commit secrets.
- `.env.example`: environment template. Some Supabase/ban variables currently appear unused by this application; see [configuration](../getting-started/configuration.md).

## Project and deployment files

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package-lock.json`: package metadata, scripts, and dependency locks. The documented developer workflow uses pnpm; the Dockerfile currently uses npm and `package-lock.json`.
- `Dockerfile`: container image definition.
- `docker-compose.yml`: currently commented-out example, not a runnable Compose service.
- `vercel.json`: routes requests to the Node serverless function.
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
