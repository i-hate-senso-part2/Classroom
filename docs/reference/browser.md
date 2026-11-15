# Browser Features and Controls

The UI is a single static page served from `public/`. Browser features are implemented in `public/index.js` and styled by the browser CSS files.

## Navigation

- Enter a URL or search terms in the address bar. Recognized URLs are opened directly; other text becomes a search using the selected engine.
- Google, DuckDuckGo, and Brave search templates are available.
- Tabs have independent navigation history; use the toolbar or browser-style shortcuts to move backward, forward, reload, or return to the new-tab page.
- Default quick links and saved bookmarks appear on the new-tab page. Bookmarks are saved in the current browser's local storage and do not sync to the server.
- When there are more than six shortcuts, use the filter field to find a link by its label. `Ctrl+K` / `Cmd+K` focuses the new-tab search field (or the address bar when viewing a page).
- Submitting a search or address has a 1-in-10,000 chance to show the black testing overlay. Close it with the X in the top-right corner.

## Preferences

- Custom theme colors, the selected home background, and default tab appearance are saved as `classroom-user-settings` in local storage. First-time visitors must create and save a named theme before using the homepage. Custom images can be displayed with or without the page-color overlay. Uploaded images are resized and stored on this device; uploaded MP4/WebM video backgrounds up to 50 MB are stored in IndexedDB. A direct MP4/WebM URL can be used instead.
- Bookmarks are saved as `classroom-bookmarks` in local storage.
- User settings preview changes before saving; closing without saving restores the last saved custom theme.
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
