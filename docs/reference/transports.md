# Proxy and Transport Components

## Components

- **Scramjet v2** supplies the browser rewrite runtime. It is served under `/scramjet/` from the installed package.
- **Scramjet controller** manages frames and the service-worker bridge. Its API, worker, and injection assets are served under `/scramjet-controller/`.
- **Libcurl transport v2** implements Scramjet's `ProxyTransport` interface and is served under `/libcurl/`.
- **Wisp** is hosted by `@mercuryworkshop/wisp-js/server` and receives WebSocket upgrades at `/wisp/`.
- Legacy BareMux and v1 runtime files remain in `public/`, but are not used by the active browser flow.

The app pins Scramjet `2.0.67-alpha.2` with its matching controller `0.0.14`; this v2 release is an alpha prerelease.

## Active connection sequence

The browser registers and waits for the v2 service worker, then creates a `LibcurlClient` with a WebSocket URL on the page's current host and `/wisp/` path. HTTP versus HTTPS determines `ws:` versus `wss:`.

The server disables Wisp UDP streams, sets DNS resolvers, and configures a hostname blacklist in `src/index.js`. Review that source and upstream Wisp documentation before changing the policy.

## Configuration boundary

`public/config.js` currently is not loaded by `public/index.html`, and the active transport URL is assembled directly in `public/index.js`. Therefore the endpoint array in `public/config.js` is not currently a switch for the active transport. See [configuration](../getting-started/configuration.md).
