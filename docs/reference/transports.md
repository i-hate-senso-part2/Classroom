# Proxy and Transport Components

## Components

- The browser toolbar lets visitors choose **SE (V1.1.0)** or **SE (V2)**. Changing the selection reloads the browser so the matching runtime and service worker are used together.
- **Scramjet v2** supplies the browser rewrite runtime from the installed package under `/scramjet/`. Its controller assets are served from `public/controller/` at `/controller/`, and its Libcurl transport is served under `/libcurl/`.
- **Scramjet v1.1.0** uses the legacy runtime under `/scram/` with BareMux and Epoxy assets under `/baremux/` and `/epoxy/`. Vercel also rewrites the former `/scramjet-v1/` URL prefix for compatibility with cached clients.
- **Wisp** is hosted by `wisp-server-python` on Render at `wss://wisp-server-python-nh0a.onrender.com/`.

The app pins Scramjet `2.0.67-alpha.2` with its matching controller `0.0.14`; this v2 release is an alpha prerelease. The v1.1.0 runtime is already present in `public/scram/`.

## Active connection sequence

The browser registers the service worker for the selected version. V2 creates a `LibcurlClient`; v1.1.0 configures BareMux with Epoxy. Both connect to the Render Wisp service over `wss://` at the root path. Proxied traffic uses that external WebSocket endpoint, not a same-origin `/wisp/` route on Vercel.

The local Node server also hosts `@mercuryworkshop/wisp-js/server` at `/wisp/` for non-Vercel deployments. It disables Wisp UDP streams, sets DNS resolvers, and configures a hostname blacklist in `src/index.js`.

## Configuration boundary

`public/config.js` currently is not loaded by `public/index.html`, and the active transport URL is assembled directly in `public/index.js`. Therefore the endpoint array in `public/config.js` is not currently a switch for the active transport. See [configuration](../getting-started/configuration.md).
