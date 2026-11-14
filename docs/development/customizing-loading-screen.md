# Customizing the Loading Screen

The initial startup screen is defined in `public/index.html` as `#startup-screen`. Its appearance is controlled by the `.startup-screen` and `.startup-*` rules in `public/browser.css`; `public/index.js` hides it after the first browser-state check completes in `finishStartup()`.

## Change the content or logo

Edit the markup inside `#startup-screen` in `public/index.html`. The default image is `/sj.png`, and the status text is `#startup-message`. Keep the outer `role="status"` and `aria-live="polite"` so assistive technology can announce startup.

## Change the visual design

Adjust `.startup-screen`, `.startup-content`, `.startup-content img`, `.startup-track`, and `.startup-track span` in `public/browser.css`. The progress bar is an indeterminate animation, not a measured percentage. Respect the existing reduced-motion media query when adding or changing animations.

## Keep startup behavior intact

`finishStartup()` checks the shared blocked state before hiding the screen. Avoid replacing that flow with a fixed delay: it can hide the blocked screen too early or leave visitors waiting for an arbitrary timer. The server request already has a timeout, and the page has separate styling for a cached blocked state at startup.

After editing, run `node --check public/index.js`, start the app with `pnpm start`, and verify both a normal startup and a blocked-state startup.
