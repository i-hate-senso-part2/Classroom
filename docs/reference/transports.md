# Proxy and Transport Components

## Components

- The browser toolbar lets visitors choose **SE (V1.1.0)** or **SE (V2)**. Changing the selection reloads the browser so the matching runtime is initialized.
- A shared service worker routes V1 `/~1/` requests to the V1 runtime and V2 requests to the V2 controller. Switching versions does not replace the active worker.
- **Scramjet v2** supplies the browser rewrite runtime from the installed package under `/scramjet/`. Its controller assets are served from `public/controller/` at `/controller/`, and its Libcurl transport is served under `/libcurl/`.
- **Scramjet v1.1.0** loads its generated, isolated controller bundle under `/scram-v1/`, with its other runtime files under `/scram/` and BareMux/Epoxy under `/baremux/` and `/epoxy/`. The build gives the V1 bundle its own IndexedDB name so stale V1 schemas cannot conflict with a fresh initialization. Vercel also rewrites the former `/scramjet-v1/` URL prefix for compatibility with cached clients.
- **Wisp** is hosted by `wisp-server-python` on Render at `wss://wisp-server-python-nh0a.onrender.com/`.

The app pins Scramjet `2.0.67-alpha.2` with its matching controller `0.0.14`; this v2 release is an alpha prerelease. The original v1.1.0 runtime is in `public/scram/`; `scripts/prepare-static-assets.js` generates the isolated V1 controller bundle during builds.

## Active connection sequence

The browser registers the service worker for the selected version. V2 creates a `LibcurlClient`; v1.1.0 configures BareMux with Epoxy. Both connect to the Render Wisp service over `wss://` at the root path. Proxied traffic uses that external WebSocket endpoint, not a same-origin `/wisp/` route on Vercel.

The local Node server also hosts `@mercuryworkshop/wisp-js/server` at `/wisp/` for non-Vercel deployments. It disables Wisp UDP streams, sets DNS resolvers, and configures a hostname blacklist in `src/index.js`.

## Configuration boundary

`public/config.js` currently is not loaded by `public/index.html`, and the active transport URL is assembled directly in `public/index.js`. Therefore the endpoint array in `public/config.js` is not currently a switch for the active transport. See [configuration](../getting-started/configuration.md).
