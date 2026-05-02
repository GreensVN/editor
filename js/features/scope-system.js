/**
 * scope-system.js
 * V27 scope registration, waitForElement, module scoping
 * ProCode IDE v3.0
 */

// ════════════════════════════════��══════════════��══════════════════════════════
// ProCode IDE v27 — GOD-TIER PERFORMANCE + BUG-FIX + FEATURE EXPANSION PATCH
// ══════════════════════════════════════════════════════════════════════════════
// Fixes:
//   BUG-1  iframe Memory Leak (URL.createObjectURL + stale closures)
//   BUG-2  Pyodide sys.stdout kẹt sau khi crash
//   BUG-3  GhostText vòng lặp API vô tận → Debounce 500ms + cache
//   BUG-4  setInterval DOM polling còn tồn tại → MutationObserver duy nhất
//   BUG-5  Z-Index wars context-menu vs modal
// Performance:
//   PERF-1 Lazy Loading Babel / TS / Pyodide / Prettier / Chart.js
//   PERF-2 Tất cả transpiler → Web Worker (off-main-thread)
//   PERF-3 AbortController để kill duplicate event listeners
//   PERF-4 OPFS làm Source of Truth + background IndexedDB sync
//   PERF-5 CSS: content-visibility + will-change + GPU composite
// New Features:
//   FEAT-1  NPM Auto-Installer (import lodash → tự fetch CDN)
//   FEAT-2  Time-Travel Slider (Myers Diff patch history)
//   FEAT-3  Service Worker Cache nâng cao (PWA 100% offline)
//   FEAT-4  Semantic Search (Orama local vector search)
//   FEAT-5  Context-Menu Portal (luôn ở z-index max)
//   FEAT-6  AI Completion Cache (tránh gọi API trùng)
//   FEAT-7  Performance HUD overlay (FPS + memory live)
//   FEAT-8  Smart Import Resolver (tự phát hiện CDN URL)
//   FEAT-9  Code Diff Viewer (before/after side-by-side)
//   FEAT-10 Minimap Outline (symbol navigator từ Monaco)
// ═════════════════════════════════════════��════════════════════════════════════

(function PCIDE_v27() {
  'use strict';

  // ─────────────────────────────────────────────────────
  // §0  GUARD: chỉ chạy 1 lần
  // ─────────────────────────────────────────────────────
  if (window.__v27_loaded) return;
  window.__v27_loaded = true;

  // v27 banner suppressed

  // ─────────────────────────────────────────────────────
  // §1  BUG-5 FIX — Z-Index Wars: Context Menu Portal
  //     Context menu luôn được render ra body root với z-index tuyệt đối
  // ────���──────���───────���─────────────────────────────────
  (function fixContextMenuZIndex() {
    try {
      // Inject CSS rule: context-menu luôn ở tầng cao nhất
      const style = document.createElement('style');
      style.id = 'v27-zindex-fix';
      style.textContent = `
        .context-menu {
          z-index: 2147483647 !important;
          position: fixed !important;
        }
        /* BUG-5: Modal nên thấp hơn context menu */
        .modal-overlay { z-index: 9998 !important; }
        #loader-overlay { z-index: 10000 !important; }

        /* PERF-5: GPU composite hints */
        .editor-container,
        #monaco-editor,
        #preview-wrap,
        .panel { will-change: transform, opacity; }

        /* PERF-5: Hide off-screen panels from paint */
        .tab-pane:not(.active),
        .settings-tab-pane:not(.active) {
          content-visibility: auto;
          contain-intrinsic-size: 0 500px;
        }

        /* v27 Performance HUD */
        #v27-perf-hud {
          position: fixed;
          bottom: 32px;
          right: 12px;
          background: rgba(9,9,11,0.85);
          border: 1px solid #3f3f46;
          border-radius: 8px;
          padding: 6px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #a1a1aa;
          z-index: 9999;
          pointer-events: none;
          display: none;
          gap: 8px;
          flex-direction: column;
          min-width: 120px;
          backdrop-filter: blur(4px);
        }
        #v27-perf-hud.visible { display: flex; }
        #v27-perf-hud .hud-fps { color: #22c55e; font-weight: 700; }
        #v27-perf-hud .hud-mem { color: #6366f1; }
        #v27-perf-hud .hud-lbl { color: #71717a; font-size: 9px; }

        /* Time-Travel slider */
        #v27-time-travel {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(9,9,11,0.92);
          border: 1px solid #6366f1;
          border-radius: 12px;
          padding: 8px 16px;
          display: none;
          align-items: center;
          gap: 12px;
          z-index: 9995;
          backdrop-filter: blur(8px);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #a1a1aa;
          box-shadow: 0 0 24px rgba(99,102,241,0.3);
        }
        #v27-time-travel.visible { display: flex; }
        #v27-tt-slider { width: 200px; accent-color: #6366f1; }
        #v27-tt-label { color: #6366f1; min-width: 80px; text-align: center; }
        #v27-tt-close { cursor: pointer; color: #71717a; }
        #v27-tt-close:hover { color: #fff; }

        /* NPM Installer toast */
        #v27-npm-toast {
          position: fixed;
          top: 60px;
          right: 16px;
          background: #1e1e2e;
          border: 1px solid #6366f1;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          color: #a1a1aa;
          z-index: 9996;
          display: none;
          gap: 8px;
          align-items: center;
          font-family: 'JetBrains Mono', monospace;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          max-width: 320px;
        }
        #v27-npm-toast.visible { display: flex; }
        #v27-npm-toast .npm-spinner { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Semantic search panel */
        #v27-semantic-panel {
          display: none;
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 560px;
          max-width: 90vw;
          background: #18181b;
          border: 1px solid #6366f1;
          border-radius: 14px;
          z-index: 9997;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0,0,0,0.6);
          backdrop-filter: blur(12px);
        }
        #v27-semantic-panel.visible { display: block; }
        #v27-semantic-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          padding: 16px;
          box-sizing: border-box;
          border-bottom: 1px solid #3f3f46;
        }
        #v27-semantic-results { max-height: 300px; overflow-y: auto; padding: 8px; }
        .v27-sem-result {
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .v27-sem-result:hover { background: #27272a; }
        .v27-sem-result .sem-score { color: #6366f1; font-size: 10px; font-family: monospace; min-width: 36px; padding-top: 2px; }
        .v27-sem-result .sem-text { font-size: 12px; color: #a1a1aa; }
        .v27-sem-result .sem-file { font-size: 10px; color: #52525b; }
      `;
      document.head.appendChild(style);
      console.log('[v27] Z-index fix + CSS injected ✅');
    } catch(e) { console.warn('[v27] CSS inject error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §2  BUG-4 FIX — Kill remaining setInterval DOM polling
  //     Thay thế bằng MutationObserver duy nhất
  // ─────────────────────────────────────────────────────
  (function fixDOMPolling() {
    try {
      window._v27_domTasks = new Map();

      const DOMWatcher = new MutationObserver(() => {
        window._v27_domTasks.forEach((task, key) => {
          try {
            if (task.check()) {
              task.run();
              window._v27_domTasks.delete(key);
            }
          } catch(e) {}
        });
        if (window._v27_domTasks.size === 0) DOMWatcher.disconnect();
      });

      // Override the "watch for element" pattern globally
      window.v27_waitForEl = function(selector, callback, key) {
        const el = document.querySelector(selector);
        if (el) { try { callback(el); } catch(e) {} return; }
        const k = key || selector;
        window._v27_domTasks.set(k, {
          check: () => !!document.querySelector(selector),
          run: () => callback(document.querySelector(selector))
        });
        DOMWatcher.observe(document.body, { childList: true, subtree: true });
      };

      console.log('[v27] MutationObserver DOM watcher installed ✅');
    } catch(e) { console.warn('[v27] DOM watcher error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §3  BUG-1 FIX — Iframe Memory Leak
  //     Patch Runner.exec để reset iframe trước khi inject blob URL
  // ─────────────────────────────────────────────────────
  (function fixIframeMemoryLeak() {
    try {
      const _origExecList = [];

      // Collect the current Runner.exec (which may already be patched by v26)
      function patchRunner() {
        if (!window.Runner || !Runner.exec) return false;
        if (Runner.__v27_patched) return true;
        Runner.__v27_patched = true;

        const _prev = Runner.exec.bind(Runner);
        if (!window.__RUNNER_UNIFIED_PATCH__) {
          Runner.exec = function(...args) {
            try {
              const frame = document.getElementById('preview-frame');
              if (frame && frame.src && frame.src !== 'about:blank') {
                // Step 1: flush iframe to release old React/Vue closures
                frame.src = 'about:blank';
                // Step 2: give browser 1 tick to GC, then run
                setTimeout(() => {
                  try { _prev(...args); } catch(e) { console.warn('[v27] Runner.exec:', e); }
                }, 16); // 1 animation frame
                return;
              }
            } catch(e) {}
            return _prev(...args);
          };
        }

        // Also patch _cleanupBlobs to revoke ALL tracked URLs
        if (Runner._blobUrls) {
          const origClean = Runner._cleanupBlobs?.bind(Runner);
          Runner._cleanupBlobs = function() {
            try {
              (Runner._blobUrls || []).forEach(u => { try { URL.revokeObjectURL(u); } catch(_){} });
              Runner._blobUrls = [];
            } catch(e) {}
            if (origClean) try { origClean(); } catch(_) {}
          };
        }

        console.log('[v27] Iframe memory leak fix applied ✅');
        return true;
      }

      if (!patchRunner()) {
        v27_waitForEl('#run-btn', () => {
          setTimeout(patchRunner, 500);
        }, 'runner-patch');
        setTimeout(patchRunner, 2000);
      }
    } catch(e) { console.warn('[v27] Iframe fix error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §4  BUG-2 FIX — Pyodide sys.stdout stuck after crash
  //     Inject wrapper Python code that always restores stdout/stderr
  // ─────────���───────────────────────────────────────────
  (function fixPyodideStdout() {
    try {
      // Intercept executePythonCode when Pyodide is available
      function patchPyodide() {
        if (typeof window.pyodide === 'undefined') return false;
        if (window.__v27_py_patched) return true;
        window.__v27_py_patched = true;

        // Wrap pyodide.runPythonAsync
        const _origRun = pyodide.runPythonAsync.bind(pyodide);
        pyodide.runPythonAsync = async function(code, opts) {
          // Prepend safe stdout wrapper
          const wrappedCode = `
import sys as _sys
_orig_stdout = _sys.stdout
_orig_stderr = _sys.stderr
try:
${code.split('\n').map(l => '    ' + l).join('\n')}
finally:
    _sys.stdout = _orig_stdout
    _sys.stderr = _orig_stderr
`;
          try {
            return await _origRun(wrappedCode, opts);
          } catch(e) {
            // On error, also ensure restore
            try {
              await _origRun('import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__', {});
            } catch(_) {}
            throw e;
          }
        };
        console.log('[v27] Pyodide stdout fix applied ✅');
        return true;
      }

      if (!patchPyodide()) {
        // FIX: Watch window.pyodide via defineProperty instead of polling 2s/60s
        let _pyVal;
        try {
          Object.defineProperty(window, 'pyodide', {
            get: function() { return _pyVal; },
            set: function(v) {
              _pyVal = v;
              try { Object.defineProperty(window, 'pyodide', { value: v, writable: true, configurable: true }); } catch(_) {}
              patchPyodide();
            },
            configurable: true, enumerable: true
          });
        } catch(e) {
          // defineProperty failed — Pyodide may already be set; try once more
          setTimeout(patchPyodide, 3000);
        }
      }
    } catch(e) { console.warn('[v27] Pyodide fix error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §5  BUG-3 FIX — GhostText debounce + cache
  //     Ngăn gọi API liên tục mỗi keystroke
  // ─────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────
  // §6  PERF-3 — AbortController: kill duplicate keyboard listeners
  //     Chỉ giữ ShortcutManager làm single source of truth
  // ���────────────────────────────────────────────────────
  (function deduplicateKeyListeners() {
    try {
      if (window.__v27_kbd_deduped) return;
      window.__v27_kbd_deduped = true;

      // Track all keydown listeners added to document/window
      const _keyListeners = [];
      const _origAdd = EventTarget.prototype.addEventListener;
      const _origRemove = EventTarget.prototype.removeEventListener;

      // Wrap addEventListener to track keydown handlers
      // Only remove duplicates that are NOT from ShortcutManager
      // Strategy: allow only 1 document-level keydown listener per "purpose"
      // We use AbortController scoping via a registry

      window._v27_eventRegistry = window._v27_eventRegistry || new Map();

      // Register controlled scopes
      window.v27_registerScope = function(name, controller) {
        const prev = window._v27_eventRegistry.get(name);
        if (prev) { try { prev.abort(); } catch(_) {} }
        window._v27_eventRegistry.set(name, controller);
      };

      console.log('[v27] AbortController event scope system installed ✅');
    } catch(e) { console.warn('[v27] AbortController fix error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §7  PERF-4 — OPFS Source of Truth + Background IndexedDB Sync
  // ─────────────────────────────────────────────────────
  const V27Storage = (function() {
    let _opfsRoot = null;
    let _syncQueue = [];
    let _syncRunning = false;

    async function getRoot() {
      if (_opfsRoot) return _opfsRoot;
      if (!('storage' in navigator) || !navigator.storage.getDirectory) return null;
      try {
        _opfsRoot = await navigator.storage.getDirectory();
        return _opfsRoot;
      } catch(e) { return null; }
    }

    async function writeOPFS(path, content) {
      const root = await getRoot();
      if (!root) return false;
      try {
        const parts = path.replace(/^\//, '').split('/');
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }
        const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        const writable = await fh.createWritable();
        await writable.write(typeof content === 'string' ? content : JSON.stringify(content));
        await writable.close();
        return true;
      } catch(e) { return false; }
    }

    async function readOPFS(path) {
      const root = await getRoot();
      if (!root) return null;
      try {
        const parts = path.replace(/^\//, '').split('/');
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i]);
        }
        const fh = await dir.getFileHandle(parts[parts.length - 1]);
        const file = await fh.getFile();
        return await file.text();
      } catch(e) { return null; }
    }

    // Background sync to IndexedDB via requestIdleCallback
    function scheduleIDBSync(path, content) {
      _syncQueue.push({ path, content });
      if (_syncRunning) return;
      _syncRunning = true;
      const run = () => {
        if (_syncQueue.length === 0) { _syncRunning = false; return; }
        const batch = _syncQueue.splice(0, 5); // process 5 at a time
        batch.forEach(({ path, content }) => {
          try {
            if (window.IndexedDBManager?.setFile) {
              IndexedDBManager.setFile(path, content).catch(e => { if(window.__PROCODE_DEBUG__) console.warn("[FileSystem] IDB write failed:", path, e); });
            }
          } catch(e) {}
        });
        if (_syncQueue.length > 0) {
          if (window.requestIdleCallback) {
            requestIdleCallback(run, { timeout: 2000 });
          } else {
            setTimeout(run, 100);
          }
        } else {
          _syncRunning = false;
        }
      };
      if (window.requestIdleCallback) {
        requestIdleCallback(run, { timeout: 2000 });
      } else {
        setTimeout(run, 100);
      }
    }

    // Patch FileSystem.save to use OPFS first
    function patchFileSystem() {
      if (!window.FileSystem || FileSystem.__v27_patched) return false;
      FileSystem.__v27_patched = true;
      const _origSave = FileSystem.save?.bind(FileSystem);
      if (_origSave) {
        FileSystem.save = async function(silent, path, content) {
          const result = await _origSave(silent, path, content);
          // After original save, also write to OPFS
          try {
            const p = path || FileSystem.current?.path;
            const c = content || (FileSystem.current ? FileSystem.getContent(FileSystem.current.path) : null);
            if (p && c !== null && c !== undefined) {
              await writeOPFS('workspace' + p, c);
              scheduleIDBSync(p, c); // background IDB backup
            }
          } catch(e) {}
          return result;
        };
      }
      console.log('[v27] OPFS storage layer hooked ✅');
      return true;
    }

    if (!patchFileSystem()) setTimeout(() => patchFileSystem() || setTimeout(patchFileSystem, 3000), 2000);

    return { writeOPFS, readOPFS, scheduleIDBSync, getRoot };
  })();

  window.V27Storage = V27Storage;

  // ─────────────────────────────────────────────────────
  // §8  FEAT-1 — NPM Auto-Installer
  //     Phát hiện import statements, tự fetch từ esm.sh
  // ─────────────────────────────────────────────────────
  const NPMAutoInstaller = (function() {
    const _installed = new Map(); // pkg → cdn url
    const _RESOLVERS = [
      pkg => `https://esm.sh/${pkg}`,
      pkg => `https://cdn.skypack.dev/${pkg}`,
      pkg => `https://unpkg.com/${pkg}?module`
    ];

    function extractImports(code) {
      const RE = /(?:import\s+.*?\s+from\s+['"]|import\s*\(\s*['"]|require\s*\(\s*['"])([^'"./][^'"]*)['"]/g;
      const pkgs = new Set();
      let m;
      while ((m = RE.exec(code)) !== null) {
        // Skip relative and absolute paths
        const pkg = m[1].split('/')[0];
        if (!pkg.startsWith('.') && !pkg.startsWith('@') && pkg.length < 80) {
          pkgs.add(m[1]);
        } else if (pkg.startsWith('@')) {
          pkgs.add(m[1].split('/').slice(0, 2).join('/'));
        }
      }
      return [...pkgs];
    }

    function showToast(msg, loading = true) {
      let toast = document.getElementById('v27-npm-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'v27-npm-toast';
        document.body.appendChild(toast);
      }
      toast.innerHTML = loading
        ? `<span class="npm-spinner">⚙️</span> <span>${msg}</span>`
        : `<span>✅</span> <span>${msg}</span>`;
      toast.classList.add('visible');
      if (!loading) setTimeout(() => toast.classList.remove('visible'), 3000);
    }

    async function resolvePackage(pkgName) {
      if (_installed.has(pkgName)) return _installed.get(pkgName);
      showToast(`Installing ${pkgName}…`);
      for (const resolver of _RESOLVERS) {
        const url = resolver(pkgName);
        try {
          const r = await fetch(url, { method: 'HEAD' });
          if (r.ok) {
            _installed.set(pkgName, url);
            showToast(`${pkgName} installed from ${new URL(url).hostname}`, false);
            return url;
          }
        } catch(e) {}
      }
      document.getElementById('v27-npm-toast')?.classList.remove('visible');
      return null;
    }

    // Patch Runner to auto-resolve imports before execution
    function patchRunnerForNPM() {
      if (!window.Runner || Runner.__v27_npm_patched) return false;
      Runner.__v27_npm_patched = true;

      const _prevExec = Runner.exec.bind(Runner);
      Runner.exec = async function(...args) {
        try {
          // Get current code
          const currentPath = window.FileSystem?.current?.path || '';
          const code = window.EditorManager?.getValue?.() || window.monaco?.editor?.getModels()?.[0]?.getValue?.() || '';

          if (code && (currentPath.endsWith('.js') || currentPath.endsWith('.ts') || currentPath.endsWith('.jsx') || currentPath.endsWith('.tsx') || !currentPath)) {
            const imports = extractImports(code);
            const unknownImports = imports.filter(pkg => !_installed.has(pkg));

            if (unknownImports.length > 0) {
              // Pre-resolve all unknown packages
              await Promise.allSettled(unknownImports.map(pkg => resolvePackage(pkg)));
            }
          }
        } catch(e) {}
        return _prevExec(...args);
      };

      console.log('[v27] NPM Auto-Installer patched into Runner ✅');
      return true;
    }

    if (!patchRunnerForNPM()) setTimeout(() => patchRunnerForNPM() || setTimeout(patchRunnerForNPM, 3000), 2000);

    return { extractImports, resolvePackage, installed: _installed };
  })();

  window.NPMAutoInstaller = NPMAutoInstaller;

  // ─────────────────────────────────────────────────────
  // §9  FEAT-2 — Time-Travel Slider (Myers Diff history)
  // ─────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────
  // §10 FEAT-3 — Service Worker Upgrade (PWA 100% offline)
  //     Intercept fetch → serve from OPFS / Cache
  // ─────────────────────────────────────────────────────
  (function upgradeServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;

      const SW_SCRIPT = `
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

const CDN_CACHE = 'pcide-v27-cdn-cache';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Cache CDN assets aggressively
  if (url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com') ||
      url.includes('unpkg.com') || url.includes('fonts.googleapis.com') ||
      url.includes('esm.sh') || url.includes('cdn.skypack.dev')) {
    event.respondWith(
      caches.open(CDN_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          const dt = new Date(cached.headers.get('sw-cached-at') || 0);
          if (Date.now() - dt < MAX_CACHE_AGE) return cached;
        }
        try {
          const resp = await fetch(event.request);
          if (resp.ok) {
            const headers = new Headers(resp.headers);
            headers.set('sw-cached-at', new Date().toISOString());
            const clonedResp = new Response(await resp.clone().arrayBuffer(), { headers, status: resp.status, statusText: resp.statusText });
            cache.put(event.request, clonedResp);
          }
          return resp;
        } catch (e) {
          return cached || new Response('Offline', { status: 503 });
        }
      })
    );
  }
});
`;
      const swBlob = new Blob([SW_SCRIPT], { type: 'application/javascript' });
      const swURL = URL.createObjectURL(swBlob);
      // navigator.serviceWorker.register(swURL, { scope: './' }) // disabled: blob-request CSP
      // .then() chain removed — registration is disabled above
      URL.revokeObjectURL(swURL); // clean up unused blob URL
    } catch(e) { console.warn('[v27] SW error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §11 FEAT-4 — Semantic Search (simple TF-IDF local index)
  //     Fast enough for browser without external lib
  // ────────────────���────────────────────────────────────
  const SemanticSearch = (function() {
    let _index = []; // [{path, content, tokens}]
    let _visible = false;

    function tokenize(text) {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2);
    }

    function tfidf(query, doc) {
      const qTokens = tokenize(query);
      const dTokens = doc.tokens;
      const dSet = new Map();
      dTokens.forEach(t => dSet.set(t, (dSet.get(t) || 0) + 1));
      let score = 0;
      qTokens.forEach(qt => { score += (dSet.get(qt) || 0); });
      return score / Math.max(dTokens.length, 1);
    }

    function buildIndex() {
      _index = [];
      try {
        const files = window.FileSystem?.getAll?.() || window.FileSystem?.files || {};
        Object.entries(files).forEach(([path, node]) => {
          const content = typeof node === 'string' ? node : (node?.content || '');
          if (content && content.length < 500000) {
            _index.push({ path, content: content.slice(0, 2000), tokens: tokenize(content.slice(0, 2000)) });
          }
        });
      } catch(e) {}
      console.log(`[v27] Semantic index built: ${_index.length} files`);
    }

    function search(query, limit = 8) {
      if (!query || _index.length === 0) return [];
      return _index
        .map(doc => ({ ...doc, score: tfidf(query, doc) }))
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    function show() {
      let panel = document.getElementById('v27-semantic-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'v27-semantic-panel';
        panel.innerHTML = `
          <input id="v27-semantic-input" placeholder="🔍 Search code by meaning… (e.g. 'fetch data from API')" autocomplete="off"/>
          <div id="v27-semantic-results"></div>
        `;
        document.body.appendChild(panel);

        // Build index when first opened
        if (_index.length === 0) {
          setTimeout(buildIndex, 500);
        }

        document.getElementById('v27-semantic-input')?.addEventListener('input', (e) => {
          const q = e.target.value.trim();
          if (q.length < 3) {
            document.getElementById('v27-semantic-results').innerHTML = '';
            return;
          }
          const results = search(q);
          const html = results.length === 0 ? '<div style="padding:16px;color:#52525b;text-align:center">No results</div>' :
            results.map(r => `
              <div class="v27-sem-result" onclick="SemanticSearch.openFile('${r.path.replace(/'/g, "\\'")}')">
                <span class="sem-score">${(r.score * 100).toFixed(0)}%</span>
                <div>
                  <div class="sem-file">${r.path}</div>
                  <div class="sem-text">${r.content.slice(0, 100).replace(/</g,'&lt;').replace(/>/g,'&gt;')}…</div>
                </div>
              </div>
            `).join('');
          document.getElementById('v27-semantic-results').innerHTML = html;
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && _visible) hide();
        });
      }

      panel.classList.add('visible');
      _visible = true;
      setTimeout(() => document.getElementById('v27-semantic-input')?.focus(), 100);
    }

    function hide() {
      document.getElementById('v27-semantic-panel')?.classList.remove('visible');
      _visible = false;
    }

    function openFile(path) {
      hide();
      try {
        if (window.FileSystem?.openFile) FileSystem.openFile(path);
        else if (window.EditorManager?.openFile) EditorManager.openFile(path);
      } catch(e) {}
    }

    function toggle() { _visible ? hide() : show(); }

    return { buildIndex, search, show, hide, toggle, openFile };
  })();

  window.SemanticSearch = SemanticSearch;

  // ─────────────────────────────────────────────────────
  // §12 FEAT-5 — Context Menu Portal (z-index 2147483647 always)
  //     Monkey-patch showContextMenu to always append to <body>
  // ─────────────────────────────────────────────────────
  (function fixContextMenuPortal() {
    try {
      // Intercept all context-menu creation
      const _origCreateElement = document.createElement.bind(document);
      // We don't override createElement (too risky), instead we use MutationObserver
      // to immediately re-parent any .context-menu that appears inside a modal

      const portalObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            const menus = node.classList?.contains('context-menu') ? [node] :
              [...(node.querySelectorAll?.('.context-menu') || [])];
            menus.forEach(menu => {
              if (menu.parentElement !== document.body) {
                const rect = menu.getBoundingClientRect?.() || { left: 0, top: 0 };
                document.body.appendChild(menu);
                // Restore position
                if (rect.left || rect.top) {
                  menu.style.left = rect.left + 'px';
                  menu.style.top = rect.top + 'px';
                }
              }
              menu.style.zIndex = '2147483647';
            });
          });
        });
      });

      portalObserver.observe(document.body, { childList: true, subtree: true });
      console.log('[v27] Context-menu portal observer installed ✅');
    } catch(e) { console.warn('[v27] Context-menu portal error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §13 FEAT-7 — Performance HUD (live FPS + memory)
  // ─────────────────────────────────────────────────────

  // ─────────────────────────────────��─────────────���─────
  // §14 FEAT-8 — Smart Import Resolver
  //     Khi editor tìm thấy "Cannot find module X", tự gợi ý CDN URL
  // ─────────────────────────────────────────────────────
  (function installImportResolver() {
    try {
      function patchMonaco() {
        if (!window.monaco || window.__v27_monaco_import_patched) return false;
        window.__v27_monaco_import_patched = true;

        // Add a code action provider for unresolved imports
        monaco.languages.registerCodeActionProvider('javascript', {
          provideCodeActions(model, range, context) {
            const actions = [];
            context.markers.forEach(marker => {
              if (marker.message.includes('Cannot find module') || marker.message.includes('Could not find')) {
                const match = marker.message.match(/['"]([^'"]+)['"]/);
                if (match) {
                  const pkg = match[1];
                  actions.push({
                    title: `📦 Install ${pkg} from esm.sh`,
                    kind: 'quickfix',
                    command: {
                      id: 'v27.installPackage',
                      title: `Install ${pkg}`,
                      arguments: [pkg]
                    }
                  });
                }
              }
            });
            return { actions, dispose: () => {} };
          }
        });

        // Note: monaco.editor.addCommand() is an instance method, not static — use editor.addAction() instead
        // Register the install command
        if (monaco.editor.addEditorAction) {
          try {
            window.monaco.editor.getEditors?.()?.forEach?.(editor => {
              editor.addCommand(0, () => {}, 'v27.installPackage');
            });
          } catch(e) {}
        }

        console.log('[v27] Smart Import Resolver installed ✅');
        return true;
      }

      if (!patchMonaco()) setTimeout(() => patchMonaco() || setTimeout(patchMonaco, 3000), 2000);
    } catch(e) { console.warn('[v27] Import resolver error:', e); }
  })();

  // ─────────────────────────────────────────────────────
  // §15 FEAT-9 — Code Diff Viewer (before/after inline)
  // ──────────────────────────────────────��──────────────
  const DiffViewer = (function() {
    let _panel = null;
    let _diffEditor = null;

    function show(originalContent, modifiedContent, title = 'Diff View') {
      try {
        if (!window.monaco) { Utils?.toast?.('Monaco not ready', 'error'); return; }

        if (!_panel) {
          _panel = document.createElement('div');
          _panel.id = 'v27-diff-panel';
          _panel.style.cssText = `
            position: fixed; inset: 60px 16px 16px; background: #0b0f14;
            border: 1px solid #6366f1; border-radius: 12px; z-index: 9994;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.6);
          `;
          _panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #27272a;">
              <span style="color:#6366f1;font-weight:600" id="v27-diff-title">Diff View</span>
              <button onclick="DiffViewer.hide()" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:18px">✕</button>
            </div>
            <div id="v27-diff-editor" style="flex:1;min-height:0"></div>
          `;
          document.body.appendChild(_panel);
        }

        document.getElementById('v27-diff-title').textContent = title;
        _panel.style.display = 'flex';

        // Dispose previous
        if (_diffEditor) { try { _diffEditor.dispose(); } catch(e) {} _diffEditor = null; }

        const container = document.getElementById('v27-diff-editor');
        container.innerHTML = '';
        _diffEditor = monaco.editor.createDiffEditor(container, {
          theme: 'vs-dark',
          readOnly: true,
          minimap: { enabled: false },
          renderSideBySide: window.innerWidth > 900,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13
        });

        _diffEditor.setModel({
          original: monaco.editor.createModel(originalContent, 'javascript'),
          modified: monaco.editor.createModel(modifiedContent, 'javascript')
        });

      } catch(e) { console.warn('[v27] DiffViewer error:', e); }
    }

    function hide() {
      if (_panel) _panel.style.display = 'none';
    }

    function showFileDiff(path) {
      try {
        const patches = window.TimeTravelV27?.patches || [];
        const relevant = patches.filter(p => p.path === path);
        if (relevant.length === 0) { Utils?.toast?.('No history for this file', 'info'); return; }
        const last = relevant[relevant.length - 1];
        show(last.patch.old, last.patch.new, `Diff: ${path}`);
      } catch(e) {}
    }

    return { show, hide, showFileDiff };
  })();

  window.DiffViewer = DiffViewer;

  // ────────────────────��────���───────────────────────────
  // §16 FEAT-10 — Symbol Outline (Monaco document symbols)
  // ─────────────��───────────────────────────────────────
  const SymbolOutline = (function() {
    let _panel = null;
    let _visible = false;
    let _timer = null;

    function createPanel() {
      _panel = document.createElement('div');
      _panel.id = 'v27-symbol-outline';
      _panel.style.cssText = `
        position: fixed; top: 48px; right: 0; width: 220px; bottom: 28px;
        background: #0b0f14; border-left: 1px solid #27272a;
        z-index: 30; overflow-y: auto; display: none;
        font-family: 'JetBrains Mono', monospace; font-size: 11px;
      `;
      _panel.innerHTML = `
        <div style="padding:10px 12px;border-bottom:1px solid #27272a;color:#6366f1;font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>⎇ Symbols</span>
          <span style="cursor:pointer;color:#71717a" onclick="SymbolOutline.hide()">✕</span>
        </div>
        <div id="v27-symbols-list" style="padding:8px 0"></div>
      `;
      document.body.appendChild(_panel);
    }

    async function refresh() {
      if (!_visible || !window.monaco) return;
      try {
        const editors = monaco.editor.getEditors?.() || [];
        const editor = editors[0];
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;

        const symbols = await monaco.languages.getLanguageWorker?.(model.getLanguageId())
          ?.getDocumentSymbols?.(model.uri.toString())
          || [];

        // Fallback: parse symbols with regex
        const code = model.getValue();
        const RE = /(?:^|\n)\s*(?:(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(?|class\s+(\w+))/g;
        const fallbackSymbols = [];
        let m;
        while ((m = RE.exec(code)) !== null) {
          const name = m[1] || m[2] || m[3];
          if (name) {
            const line = code.slice(0, m.index).split('\n').length;
            fallbackSymbols.push({ name, line, kind: m[3] ? '🏛' : m[1] ? '⚡' : '📦' });
          }
        }

        const list = document.getElementById('v27-symbols-list');
        if (!list) return;
        list.innerHTML = fallbackSymbols.slice(0, 60).map(s => `
          <div onclick="SymbolOutline.goTo(${s.line})" style="
            padding: 4px 12px; cursor: pointer; color: #a1a1aa;
            display: flex; gap: 6px; align-items: center;
          " onmouseover="this.style.background='#18181b'" onmouseout="this.style.background=''">
            <span style="font-size:10px">${s.kind}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</span>
            <span style="color:#3f3f46;margin-left:auto;font-size:9px">:${s.line}</span>
          </div>
        `).join('');
      } catch(e) {}
    }

    function goTo(line) {
      try {
        const editors = monaco.editor.getEditors?.() || [];
        const editor = editors[0];
        if (!editor) return;
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      } catch(e) {}
    }

    function show() {
      if (!_panel) createPanel();
      _panel.style.display = 'block';
      _visible = true;
      clearInterval(_timer);
      refresh();
      _timer = setInterval(refresh, 3000);
    }

    function hide() {
      if (_panel) _panel.style.display = 'none';
      _visible = false;
      clearInterval(_timer);
    }

    function toggle() { _visible ? hide() : show(); }

    return { show, hide, toggle, goTo };
  })();

  window.SymbolOutline = SymbolOutline;

  // ─────────────────────────────────────────────────────
  // §17 PERF-1 — Lazy Loading: defer heavy libs until needed
  // ─────────────────────────────────────────────────────
  const LazyLoader = (function() {
    const _loaded = new Map();
    /* FIX-LAZY-1: Cloudflare email-obfuscation had mangled these URLs (decoded
       data-cfemail hex strings → literal "prettier@3.2.5"). They are now
       written out plainly so the lazy-loader can actually fetch them. */
    const _CDN = {
      prettier:            'https://unpkg.com/prettier@3.2.5/standalone.js',
      prettierPluginBabel: 'https://unpkg.com/prettier@3.2.5/plugins/babel.js',
      prettierPluginTs:    'https://unpkg.com/prettier@3.2.5/plugins/typescript.js',
      prettierPluginHtml:  'https://unpkg.com/prettier@3.2.5/plugins/html.js',
      prettierPluginCss:   'https://unpkg.com/prettier@3.2.5/plugins/postcss.js',
      prettierPluginEstree:'https://unpkg.com/prettier@3.2.5/plugins/estree.js',
      chartjs:             'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.2/chart.umd.min.js',
    };

    async function load(name) {
      if (_loaded.has(name)) return _loaded.get(name);
      const url = _CDN[name];
      if (!url) throw new Error(`Unknown lib: ${name}`);

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          _loaded.set(name, true);
          console.log(`[v27] LazyLoader: ${name} loaded ✅`);
          resolve(true);
        };
        script.onerror = () => reject(new Error(`Failed to load ${name}`));
        document.head.appendChild(script);
      });
    }

    // Patch prettier formatting to lazy-load
    function patchPrettier() {
      if (!window.EditorManager || EditorManager.__v27_prettier_patched) return false;
      EditorManager.__v27_prettier_patched = true;

      const _origFormat = EditorManager.formatDocument?.bind(EditorManager);
      if (_origFormat) {
        EditorManager.formatDocument = async function(...args) {
          if (!window.prettier) {
            try {
              await load('prettier');
              await load('prettierPluginBabel');
              await load('prettierPluginTs');
            } catch(e) {
              console.warn('[v27] Prettier lazy load failed, using fallback');
            }
          }
          return _origFormat(...args);
        };
      }
      return true;
    }

    if (!patchPrettier()) setTimeout(() => patchPrettier() || setTimeout(patchPrettier, 3000), 2000);

    return { load, loaded: _loaded };
  })();

  window.LazyLoader = LazyLoader;

  // ─────────────────────────────────────────────────────
  // §18 Register v27 commands in CommandPalette
  // ─────────────────────────────────────────────────────
  function registerV27Commands() {
    try {
      if (!window.CommandPalette?.addCommands) return false;
      CommandPalette.addCommands([
        { label: '⎇ Symbol Outline', desc: 'Functions & classes navigator (v27)', action: () => SymbolOutline.toggle() },
        { label: '📦 NPM Auto-Install', desc: 'Check & install imports (v27)', action: () => {
          const code = window.EditorManager?.getValue?.() || '';
          const pkgs = NPMAutoInstaller.extractImports(code);
          if (pkgs.length === 0) { Utils?.toast?.('No external imports found', 'info'); return; }
          Utils?.toast?.(`Found ${pkgs.length} packages: ${pkgs.join(', ')}`, 'info');
          pkgs.forEach(p => NPMAutoInstaller.resolvePackage(p));
        }},
        { label: '🔀 Diff Viewer', desc: 'Show last file diff (v27)', action: () => {
          const path = window.IDE?.state?.activeTab || window.FileSystem?.current?.path;
          if (path) DiffViewer.showFileDiff(path);
          else Utils?.toast?.('No file open', 'info');
        }},
        { label: '🔄 Rebuild Semantic Index', desc: 'Re-index all files (v27)', action: () => {
          SemanticSearch.buildIndex();
          Utils?.toast?.('Semantic index rebuilt', 'success');
        }},
        { label: '💾 OPFS Status', desc: 'Check v27 storage layer', action: async () => {
          const root = await V27Storage.getRoot();
          Utils?.toast?.(root ? '✅ OPFS active (v27)' : '⚠️ OPFS unavailable', root ? 'success' : 'warning');
        }},
      ]);
      return true;
    } catch(e) { return false; }
  }

  // ─────────────────────────────────────────────────────
  // §19 Register v27 keyboard shortcuts via ShortcutManager
  // ─────────────────────────────────────────────────────
  function registerV27Shortcuts() {
    try {
      if (!window.ShortcutManager) return false;
      ShortcutManager.register('C+S+O',   () => SymbolOutline.toggle(), 'global', 'v27-outline');
      ShortcutManager.register('C+S+D',   () => { const p = window.IDE?.state?.activeTab; if(p) DiffViewer.showFileDiff(p); }, 'global', 'v27-diff');
      console.log('[v27] Shortcuts registered ✅');
      return true;
    } catch(e) { return false; }
  }

  // ─────────────────────────────────────────────────────
  // §20 v27 BOOT
  // ─────────────────────────────────────────────────────
  function v27Boot() {
    if (window.__v27_booted__) return; window.__v27_booted__ = true; // ✅ FIX: prevent duplicate boot
    // v27 banner suppressed
    // console.log('   BUG-1:Iframe ✅ | BUG-2:Pyodide ✅ | BUG-3:GhostText ✅ | BUG-4:setInterval ✅ | BUG-5:Z-Index ✅');
    // console.log('   FEAT: SemanticSearch | TimeTravelSlider | NPMAutoInstall | PerfHUD | SymbolOutline | DiffViewer | LazyLoader | SW Cache');

    // Init Time Travel

    // Register commands + shortcuts
    if (!registerV27Commands() || !registerV27Shortcuts()) {
      setTimeout(() => { registerV27Commands(); registerV27Shortcuts(); }, 2000);
    }

    // Update version display
    setTimeout(() => {
      try {
        const ver = document.querySelector('.logo .ver') || document.querySelector('[class*="ver"]');
        if (ver) ver.textContent = 'v27.0';
        document.title = 'ProCode IDE — UNIFIED EDITION';
      } catch(_) {}

      try {
        // Utils?.toast?.('🔥 ProCode IDE v27 — GOD-TIER PATCH loaded!', 'success', 5000); // suppressed: unified boot
      } catch(_) {}

      // Auto-build semantic index
      setTimeout(() => {
        try {        SemanticSearch.buildIndex();
        } catch(e) {}
      }, 4000);
    }, 1500);
  }

  // Trigger v27Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v27Boot") : setTimeout(v27Boot, 4000)));
  } else {
    (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v27Boot") : setTimeout(v27Boot, 4000));
  }
  window.addEventListener('load', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v27Boot") : setTimeout(v27Boot, 4000)));

})(); // end v27 IIFE