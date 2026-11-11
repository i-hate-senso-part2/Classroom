# Browser Features and Controls

The UI is a single static page served from `public/`. Browser features are implemented in `public/index.js` and styled by the browser CSS files.

## Navigation

- Enter a URL or search terms in the address bar. Recognized URLs are opened directly; other text becomes a search using the selected engine.
- Google, DuckDuckGo, and Brave search templates are available.
- Tabs have independent navigation history; use the toolbar or browser-style shortcuts to move backward, forward, reload, or return to the new-tab page.
- Default quick links and saved bookmarks appear on the new-tab page. Bookmarks are saved in the current browser's local storage and do not sync to the server.

## Preferences

- Built-in themes, up to 20 named custom themes, home background style or uploaded image, and default tab appearance are saved as `classroom-user-settings` in local storage. Uploaded images are resized and stored on this device only.
- Bookmarks are saved as `classroom-bookmarks` in local storage.
- User settings preview changes before saving; closing without saving restores the last saved preferences. Reset restores the default palette and appearance.
- The fullscreen control hides browser chrome; use its floating exit button or press `Escape` to leave fullscreen.
- The saved default tab appearance updates open and future tabs' visible title and icon only. It does not alter network requests or conceal activity from the server/device administrator.
- The admin panel opens after the Up, Down, Up, Down arrow sequence, or through the admin control.

## Keyboard shortcuts

| Shortcut                    | Action                           |
| --------------------------- | -------------------------------- |
| `Ctrl+T` / `Cmd+T`          | New tab                          |
| `Ctrl+W` / `Cmd+W`          | Close current tab                |
| `Ctrl+L` / `Cmd+L`          | Focus and select the address bar |
| `Ctrl+R` / `Cmd+R`, or `F5` | Reload current page              |
| `Alt+Left`                  | Go back                          |
| `Alt+Right`                 | Go forward                       |
| `Escape`                    | Close open menus                 |

## Changing links and icons

Edit the matching entries in `public/index.js`. Image paths should point to files under `public/`, commonly `public/logos/`. Supported images are not restricted to one extension; keep the configured path and actual filename in sync.
