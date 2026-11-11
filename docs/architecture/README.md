# Architecture

These pages explain the runtime boundaries and where project responsibilities live.

## Pages

- [Application and request flow](request-flow.md)
- [Repository map](repository-map.md)

## Main components

- `src/index.js`: Node.js HTTP/WebSocket server, API routes, static file hosting, admin authentication, and state storage.
- `public/`: browser UI, navigation logic, service worker, and static proxy client assets.
- Scramjet: rewrites and routes proxied page requests through the service worker.
- Scramjet v2 controller and Libcurl transport: connect browser-side proxying to the server's Wisp WebSocket endpoint.
