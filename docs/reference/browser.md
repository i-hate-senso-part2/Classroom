# Browser Features and Controls

The UI is a single static page served from `public/`. Browser features are implemented in `public/index.js` and styled by the browser CSS files.

## Navigation

- Enter a URL or search terms in the address bar. Recognized URLs are opened directly; other text becomes a search using the selected engine.
- Google, DuckDuckGo, and Brave search templates are available.
- Tabs have independent navigation history; use the toolbar or browser-style shortcuts to move backward, forward, reload, or return to the new-tab page.
- Default quick links and saved bookmarks appear on the new-tab page. Bookmarks are saved in the current browser's local storage and do not sync to the server.
- Open the Games page from the controller toolbar to search, filter, and sort the full paginated GameDistribution catalog, or open the Selenite and RacoonGaming hubs. Provider shortcuts display each site's favicon, and game cards display catalog artwork when available. Results appear as catalog pages arrive, and **Load more games** reveals them in batches.
- When there are more than six shortcuts, use the filter field to find a link by its label. `Ctrl+K` / `Cmd+K` focuses the new-tab search field (or the address bar when viewing a page).
- Submitting a search or address has a 1-in-10,000 chance to show the black testing overlay. Close it with the X in the top-right corner.

## Preferences

- The home and Games screens show an accent-colored network of connected dots. Moving the pointer pushes nearby dots and brightens nearby connections; reduced-motion mode keeps the network still.
- Custom theme colors, the selected home background, and default tab appearance are saved as `classroom-user-settings` in local storage. First-time visitors must create and save a named theme before using the homepage. Custom images can be displayed with or without the page-color overlay. Uploaded images are resized and stored on this device; uploaded MP4/WebM video backgrounds up to 50 MB are stored in IndexedDB. A direct MP4/WebM URL can be used instead.
- User preferences and administrator controls are grouped into collapsible sections to keep optional settings out of the way.
- Bookmarks are saved as `classroom-bookmarks` in local storage.
- User settings preview changes before saving; closing without saving restores the last saved custom theme.
- Local backup in User settings encrypts Classroom local-storage settings, bookmarks, theme videos, and Scramjet V1/V2 proxy cookie stores with a passphrase you choose (at least 8 characters). Store the downloaded file and passphrase securely; restoring proxy cookies can restore signed-in sessions. It does not back up browser-managed cookies or storage for unrelated sites, and services may still require you to sign in again.
- Cloudflare Turnstile challenges are bound to the destination site's real hostname and browser context. A proxy cannot make those checks valid for every site; use the destination directly or ask its owner to support the proxy rather than attempting to bypass its verification.
- The fullscreen control hides browser chrome; use its floating exit button or press `Escape` to leave fullscreen.
- The saved default tab appearance changes only the outer Classroom page's browser-tab title and icon. Classroom's internal tabs continue to show their page titles, and proxy iframe titles are unchanged. This does not alter network requests or conceal activity from the server/device administrator.
- The admin panel opens after the Up, Down, Up, Down arrow sequence, or through the admin control.

## Keyboard shortcuts

| Shortcut                    | Action                           |
| --------------------------- | -------------------------------- |
| `Ctrl+T` / `Cmd+T`          | New tab                          |
| `Ctrl+W` / `Cmd+W`          | Close current tab                |
| `Ctrl+L` / `Cmd+L`          | Focus and select the address bar |
| `Ctrl+K` / `Cmd+K`          | Focus the new-tab search/address |
| `Ctrl+R` / `Cmd+R`, or `F5` | Reload current page              |
| `Alt+Left`                  | Go back                          |
| `Alt+Right`                 | Go forward                       |
| `Escape`                    | Close open menus                 |

## Changing links and icons

Edit the matching entries in `public/index.js`. Image paths should point to files under `public/`, commonly `public/logos/`. Supported images are not restricted to one extension; keep the configured path and actual filename in sync.
