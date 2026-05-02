# ProCode IDE v3.0 — Fix & Upgrade pass

This release unblocks the IDE which previously could not boot past the splash
screen due to a fatal `SyntaxError`, and addresses several follow-on issues
exposed once the IDE actually rendered.

## 1. Critical: SyntaxError on boot — IDE never started

**File:** `index.html`

The `<script id="procode-v33-bootstrap">` block (lines 2113–2769 in the
original) was a truncated, unclosed copy of the canonical
`js/features/init-v33.js`. It was missing two `}` and two `)` (the closing of
both the inner `MirrorPreview` IIFE and the outer `v33Init()` IIFE), so the
browser raised `Uncaught SyntaxError: Unexpected end of input`, which halted
*every* subsequent script tag and left the splash screen hanging on
"Unified modules loaded ✓" forever.

**Fix:** removed the entire 657-line broken inline block. The same logic is
already provided by `js/features/init-v33.js` which is loaded later, and the
file uses `if (window.__procode_v33_done) return;` so re-execution is a no-op.

## 2. Critical: workspace collapsed to 0 px — IDE was invisible even after
splash hidden

**File:** `css/styles.css`

`<canvas id="power-canvas">`, `<canvas id="zen-particles-canvas">` and the
`#zen-ambient` / `.power-meter` / `.notif-stack` overlays had **no CSS rules**
in the merged stylesheet, so they fell back to inline display + intrinsic
canvas sizing (300×150 each, but rendered larger by attribute defaults). With
`<body>` set to `display:flex; flex-direction:column;`, those siblings ate the
available vertical space and squashed `#workspace` (`flex: 1 1 0`) down to
0 px height — the IDE was rendering, but invisible.

**Fix:** appended deterministic positioning rules so all decorative overlays
are `position: fixed` (and therefore out of flow) with explicit z-index.
`#workspace` also gets `min-height: 0` to prevent flex items from refusing to
shrink in pathological cases.

## 3. Critical: loader-overlay never hid

**Files:** `css/styles.css`, `js/core/loader-guard.js`

`#loader-overlay` is given `display: flex !important;` by a later block in the
stylesheet, which beat the inline `display:none` set by `loader-guard.js`.
Result: even after `procode:ready` fired, the splash stayed visible.

**Fix:**
- `loader-guard.js` now adds a `.hidden` class in addition to the inline style.
- `styles.css` ships a higher-specificity rule
  `#loader-overlay.hidden, #loader-overlay[style*="display: none"] { display:none !important }`
  that actually wins over the original `!important`.

## 4. PWA manifest: invalid `start_url`, `scope`, `src` warnings

**File:** `js/core/pwa-bootstrap.js`

- `start_url` and `scope` were `"."` which Chromium increasingly rejects when
  the manifest is served via a `blob:` URL. Both are now resolved against
  `location.href` so they are absolute `http(s):` URLs.
- The 192-px icon `src` was pulled from a `<link rel="apple-touch-icon">`
  whose `href` was empty in the shipped HTML, so the manifest received
  `src: ""` for one of its icons. We now fall back to a small inline
  base64 SVG so the manifest is always valid.

## 5. PWA: `sw.js` returned 404

**New file:** `sw.js`

`init-and-patches.js` registers `./sw.js` on every page load but the file did
not exist. Added a real service worker with sensible caching:

- **Network-first** for navigations and same-origin resources (so updates show
  up immediately when online).
- **Cache-first** for cross-origin CDN libraries (Monaco, fonts, FontAwesome,
  jsdelivr, unpkg, cdnjs, tailwindcss).
- Falls back to cached `index.html` for navigations when offline.
- Old caches are cleaned up on activate; bumping `CACHE_VERSION` ships a clean
  release.

## 6. Monaco TS worker noise

**File:** `js/core/monaco-bootstrap.js`

When a model is disposed (tab close / fast switch) while its TS worker still
has `getSyntacticDiagnostics` in flight, the worker rejects with
`Could not find source file: 'inmemory://model/N'`. The error is benign but
showed up in the console as an unhandled rejection. Added a tightly-scoped
filter (registered **before** Monaco loads, so it catches the very first
occurrence) that calls `preventDefault()` only on this exact rejection.

## Files changed

| File                                | Change                                |
|-------------------------------------|---------------------------------------|
| `index.html`                        | removed broken inline v33 bootstrap   |
| `css/styles.css`                    | layout fix + loader-hide override     |
| `js/core/loader-guard.js`           | also adds `.hidden` class on hide     |
| `js/core/pwa-bootstrap.js`          | manifest URLs + icon fallback         |
| `js/core/monaco-bootstrap.js`       | TS-worker race suppression            |
| `sw.js` *(new)*                     | service worker with smart caching     |
| `CHANGELOG.md` *(new)*              | this document                         |

## Verification

- `node --check` passes for every JS file in `js/`.
- Loaded `index.html` over HTTP, watched Chrome via CDP — the page now boots
  with **zero unhandled errors, zero unhandled rejections, and zero manifest
  warnings**. The only remaining console messages on this VM are environmental
  (`Automatic fallback to software WebGL …` from headless Chrome without GPU,
  and `[Perf v14] Low FPS detected` from the IDE's own perf monitor reacting
  to the headless GPU).
- Smoke-tested in the browser: the splash hides, the IDE renders fully
  (header, file explorer, command bar, RUN button, terminal), clicking
  `LANGUAGES.md` opens the file in a Monaco editor with syntax highlighting
  and the status bar updates to show "117 lines, 896 words, 0 errors".

---

# v3.1.4 — Piston endpoint refresh (Apr 2026)

The previous default Piston backend
(`https://piston-production-ccb3.up.railway.app/api/v2/piston/execute`) stopped
responding, and `emkc.org` is whitelist-only since 2026-02-15. Replaced the
default with a fresh self-hosted Piston instance using the **standard**
`/api/v2/execute` path:

`https://piston-production-d148.up.railway.app/api/v2/execute`

The old `ccb3` URL and `emkc.org` are kept in the fallback chain in case the
new instance is ever asleep / 5xx.

## Files changed

| File                                  | Change                                                                                       |
|---------------------------------------|----------------------------------------------------------------------------------------------|
| `js/features/performance.js`          | `DEFAULT_ENDPOINTS[0]`, terminal `piston status` / `piston ping`, `langs` banner, hint texts |
| `js/features/v34-enhancements.js`     | terminal `piston status` output                                                              |
| `js/features/patches-v33.js`          | `<link rel="preconnect">` origins                                                            |
| `index.html`                          | CSP `connect-src` whitelist + Custom Piston Server URL placeholder                           |

## Verification

- `node --check` passes on every modified JS file.
- `curl -X POST https://piston-production-d148.up.railway.app/api/v2/execute`
  with a Python payload returns `{"run":{"code":0,"stdout":"…"}}` — server is
  alive and the `/api/v2/execute` path is correct.
- Loaded `index.html` over HTTP and confirmed `window.PistonAPI.ENDPOINT` is
  the new URL and `LANG_CONFIG` exposes 73 languages.

## Note on browser CORS

The new Piston instance does not currently send
`Access-Control-Allow-Origin`, so direct browser requests (and the bundled
`corsproxy.io` / `allorigins` / `cors.eu.org` fallbacks) all hit a CORS
preflight wall. To make the IDE actually run code in the browser you must
enable CORS on the Piston instance — for example by adding a Caddy reverse
proxy in front:

```
:443 {
    reverse_proxy 127.0.0.1:2000
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type"
}
```

Once CORS is fixed on the server, no further client changes are needed.
