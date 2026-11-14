# Customizing the Homepage

The new-tab homepage is split between markup, styles, and browser behavior:

- `public/index.html` contains the `#home-screen` layout, search form, quick-link container, and footer.
- `public/browser.css` styles `.home-screen`, `.home-content`, `.home-lead`, and `.quick-links`, including responsive layouts and background variants.
- `public/index.js` defines the built-in `defaultLinks` and `renderQuickLinks()`, which combines built-in links, shared administrator links, and visitor bookmarks.

## Change the layout or copy

Edit the `#home-screen` section in `public/index.html`. Keep the `home-search-form`, `home-address`, and `quick-links` IDs: the browser script uses them to submit searches and render shortcuts. If you add a new interactive element, add its behavior in `public/index.js` and give it an accessible name.

## Change built-in shortcuts

Edit the `defaultLinks` array near the top of `public/index.js`. Each entry has a `label`, `url`, and optional `logo` path. Shortcuts are created by `renderQuickLinks()`; do not add generated button markup to the HTML because the list is rebuilt when browser state changes.

All quick links open through the proxy. TikTok and GeForce NOW are recommended on SE (V1.1.0); choosing the V1 switch in their V2 compatibility notice now resumes the requested page through the proxy after reloading.

Visitor bookmarks are stored in that visitor's browser. Shared links are managed from the administrator panel and stored in shared browser state; those values are appended to built-ins and bookmarks. Duplicate URLs are only shown once. See [Administrator and browser state](../operations/admin-state.md) for shared-link limits and validation.

## Change appearance

Update the `.home-*` and `.quick-link` rules in `public/browser.css`. The theme variables near the top of the stylesheet provide the existing color palette. The homepage background choices are applied through `data-home-background`; preserve those selectors if changing how background preferences work.

## Verify

Run `pnpm lint` for the server, `node --check public/index.js` for browser-script syntax, and `pnpm test:browser` for the browser tests. Then run `pnpm start` and check a new tab at desktop and mobile widths.
