/**
 * init-and-patches.js
 * Initialization, inspector, auto-recovery, super-patch
 * ProCode IDE v3.0
 */

function setupKeyboardShortcuts() { /* Migrated to ShortcutManager — see single source of truth below */ }

// ============================================

// ============================================
// INSPECTOR (Preview DOM inspector via postMessage) — v21.0
// ============================================
Inspector = {
    enabled: false,
    last: null,
    _els: null,

    init: function() {
        if (this._els) return;
        this._els = {
            panel: document.getElementById('inspector-panel'),
            hint: document.getElementById('inspector-hint'),
            status: document.getElementById('inspector-status'),
            selector: document.getElementById('inspector-selector'),
            tag: document.getElementById('inspector-tag'),
            text: document.getElementById('inspector-text'),
            rect: document.getElementById('inspector-rect'),
            styles: document.getElementById('inspector-styles'),
            html: document.getElementById('inspector-html'),
            close: document.getElementById('inspector-close'),
            copySel: document.getElementById('inspector-copy-selector'),
            copyHtml: document.getElementById('inspector-copy-html')
        };

        this._els.close?.addEventListener('click', () => this.setEnabled(false));
        this._els.copySel?.addEventListener('click', async () => {
            const v = this.last?.selector || '';
            if (!v) return Utils.toast('No selector to copy', 'warning');
            try { await navigator.clipboard.writeText(v); Utils.toast('Selector copied', 'success'); } 
            catch { Utils.toast('Clipboard permission denied', 'warning'); }
        });
        this._els.copyHtml?.addEventListener('click', async () => {
            const v = this.last?.html || '';
            if (!v) return Utils.toast('No HTML to copy', 'warning');
            try { await navigator.clipboard.writeText(v); Utils.toast('HTML copied', 'success'); } 
            catch { Utils.toast('Clipboard permission denied', 'warning'); }
        });
    },

    toggle: function() {
        this.setEnabled(!this.enabled);
    },

    setEnabled: function(v) {
        this.init();
        this.enabled = !!v;

        this._els?.panel?.classList.toggle('visible', this.enabled);
        this._els?.hint?.classList.toggle('visible', this.enabled);
        if (this._els?.status) this._els.status.textContent = this.enabled ? 'Waiting…' : 'Off';

        // Visual state on toolbar button (best effort)
        const btn = document.querySelector('.preview-toolbar button[onclick*="Inspector.toggle"]');
        btn?.classList.toggle('primary', this.enabled);

        // Tell preview frame
        if (typeof Runner?.postToPreview === 'function') {
            Runner.postToPreview({ type: 'inspector-toggle', enabled: this.enabled });
        } else {
            // Fallback: try to post directly
            try {
                const frame = document.getElementById('preview-frame');
                frame?.contentWindow?.postMessage({ token: Runner?._previewToken, type: 'inspector-toggle', enabled: this.enabled }, '*');
            } catch(e){}
        }

        Utils.toast(this.enabled ? 'Inspector enabled' : 'Inspector disabled', this.enabled ? 'success' : 'info');
    },

    onMessage: function(payload) {
        if (!payload) return;

        // handshake update
        if (typeof payload.enabled === 'boolean') {
            if (this._els?.status) this._els.status.textContent = payload.enabled ? 'Ready' : 'Off';
            return;
        }

        this.last = payload;
        if (this._els?.status) this._els.status.textContent = 'Selected';

        if (this._els?.selector) this._els.selector.textContent = payload.selector || '—';
        if (this._els?.tag) this._els.tag.textContent = payload.tag || '—';
        if (this._els?.text) this._els.text.textContent = payload.text || '—';

        const r = payload.rect;
        if (this._els?.rect) {
            this._els.rect.textContent = r ? `${Math.round(r.width)}×${Math.round(r.height)} @ (${Math.round(r.x)}, ${Math.round(r.y)})` : '—';
        }

        if (this._els?.styles) {
            this._els.styles.textContent = payload.styles ? JSON.stringify(payload.styles, null, 2) : '—';
        }
        if (this._els?.html) {
            this._els.html.textContent = payload.html || '—';
        }
    }
};

// Patch Runner to add a safe postMessage helper and inspector message handling
(function(){
    if (!Runner || Runner.__inspectorPatched) return;
    Runner.__inspectorPatched = true;

    Runner.postToPreview = function(msg) {
        try {
            const frame = document.getElementById('preview-frame');
            if (!frame || !frame.contentWindow) return false;
            const payload = Object.assign({ token: this._previewToken }, msg || {});
            frame.contentWindow.postMessage(payload, '*');
            return true;
        } catch (e) { return false; }
    };

    // Extend message handler
    const _orig = Runner.handleIframeMessage?.bind(Runner);
    Runner.handleIframeMessage = function(event) {
        try {
            const frame = document.getElementById('preview-frame');
            if (frame && event.source !== frame.contentWindow) return;
            const d = event.data;
            if (!d || typeof d !== 'object') return;
            if (Runner._previewToken && d.token !== Runner._previewToken) return;

            if (d.type === 'inspector') {
                Inspector.onMessage(d.payload);
                return;
            }
        } catch(e) {}

        return _orig ? _orig(event) : undefined;
    };

    // Ensure we re-sync inspector state after preview loads
    const _origRunWeb = Runner.runWeb?.bind(Runner);
    Runner.runWeb = function(path) {
        const r = _origRunWeb ? _origRunWeb(path) : undefined;
        // If inspector was enabled, keep it enabled after a short delay
        if (Inspector?.enabled) {
            setTimeout(() => Runner.postToPreview({ type: 'inspector-toggle', enabled: true }), 350);
        }
        return r;
    };
})();


// EXPORT GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================
window.FS = FileSystem;
window.EditorManager = EditorManager;
window.TabManager = TabManager;
window.TerminalManager = TerminalManager;
window.Runner = Runner;
window.Inspector = Inspector;
window.Debugger = Debugger;
window.Panel = Panel;
window.AI = AI;
window.ProjectTemplates = ProjectTemplates;
window.Git = Git;
window.Search = Search;
// FIX-LAYOUT-1: Add missing toggleSide() and togglePanel() methods that
// ShortcutManager calls but LayoutManager didn't define.
// Previously these calls silently failed with "not a function" errors.
LayoutManager.toggleSide = LayoutManager.toggleSidebar = function() {
    // Toggle the left sidebar (same as Ctrl+B behavior)
    const sidebar = document.getElementById('sidebar') || document.getElementById('side-panel');
    const actBar  = document.getElementById('act-bar');
    if (sidebar) {
        const hidden = sidebar.classList.toggle('hidden');
        if (actBar) actBar.classList.toggle('solo', hidden);
    }
};
LayoutManager.togglePanel = function() {
    // Toggle bottom terminal panel (same as Ctrl+` behavior)
    LayoutManager.toggleLayout('terminal');
};

window.LayoutManager = LayoutManager;
window.Layout = LayoutManager;
window.Settings = Settings;
window.SessionManager = SessionManager;
window.CommandPalette = CommandPalette;
window.Tutorial = Tutorial;
window.Notifications = Notifications;
window.Utils = Utils;
window.IDE = window.IDE || (typeof IDE !== "undefined" ? IDE : {});

// Initialize on window load
window.addEventListener('DOMContentLoaded', () => {
    // Set initial cursor position
    document.getElementById('cursor-pos').textContent = 'Ln 1, Col 1';
    document.getElementById('file-lang').textContent = 'Plain Text';
    document.getElementById('file-enc').textContent = 'UTF-8';
    document.getElementById('file-size').textContent = '0 B';
    document.getElementById('line-endings').textContent = 'LF';
    document.getElementById('git-status-text').textContent = 'Local clean';
    document.getElementById('status-indicator').className = 'status-dot';

    // v27: Restore API key from localStorage into IDE state
    try {
        const storedKey = window.__apiKey ? window.__apiKey.load() : (localStorage.getItem('procode_ai_apikey') || ''); // P2
        if (storedKey && IDE.state.settings.ai) {
            IDE.state.settings.ai.apiKey = storedKey;
        }
    } catch(e) {}

    // v27: Update AI status dot in footer when key is present
    function updateFooterAiDot() {
        try {
            const key = (IDE.state.settings.ai && IDE.state.settings.ai.apiKey) || (window.__apiKey ? window.__apiKey.load() : localStorage.getItem('procode_ai_apikey')) || ''; // P2-late
            const dot = document.getElementById('footer-ai-dot');
            if (dot) dot.style.background = key ? '#22c55e' : '#3f3f46';
        } catch(e) {}
    }
    updateFooterAiDot();
    // Re-check after 1s in case key loads async
    setTimeout(updateFooterAiDot, 1000);

    // v27: Update version badge in header
    try {
        const versionBadge = document.querySelector('.logo .version');
        if (versionBadge) {
            versionBadge.textContent = 'v27 ULTRA';
            versionBadge.title = `ProCode IDE v${IDE.version} — Build ${IDE.build}`;
        }
    } catch(e) {}
});

// Service Worker registration (optional in single-file build)
// If you exported a sw.js next to this HTML (Command Palette → PWA: Export PWA Bundle), the IDE will register it.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
        const swPath = './sw.js';
        try {
            const existing = await navigator.serviceWorker.getRegistration();
            if (existing) {
                console.log('ServiceWorker already registered:', existing);
                try { if (window.PWA && typeof window.PWA._hookReg === 'function') window.PWA._hookReg(existing); } catch {}
                return;
            }

            // Some hosts disallow HEAD; do a small GET check.
            const res = await fetch(swPath, { cache: 'no-store' });
            if (!res || !res.ok) throw new Error('sw.js not found');
            const reg = await navigator.serviceWorker.register(swPath);
            console.log('ServiceWorker registered:', reg);
            try { if (window.PWA && typeof window.PWA._hookReg === 'function') window.PWA._hookReg(reg); } catch {}
        } catch (error) {
            console.log('ServiceWorker not registered (single-file mode):', error);
        }
    });
}

// Online/offline detection
window.addEventListener('online', () => {
    document.getElementById('status-indicator').className = 'status-dot';
    Utils.toast('Back online', 'success');
});

window.addEventListener('offline', () => {
    document.getElementById('status-indicator').className = 'status-dot offline';
    Utils.toast('Working offline', 'warning');
});
// Setup cleanup on page unload
window.addEventListener('beforeunload', (e) => {
    // Save everything
    FileSystem.save(true);
    
    // Cleanup editors
    EditorManager.cleanup();
    
    // Terminate worker
    if (FileSystem.worker) {
        FileSystem.terminateWorker();
    }
    
    // Cleanup terminal
    Object.values(TerminalManager.terminals).forEach(terminal => {
        if (terminal.instance) {
            terminal.instance.dispose();
        }
    });
});
// ============================================
// AUTO-RECOVERY SYSTEM
// ============================================
const AutoRecovery = {
    STORAGE_KEY: () => `procode_recovery_v${IDE.version}_latest`,
    CLEAN_EXIT_KEY: () => `procode_clean_exit_v${IDE.version}`,
    INTERVAL: 30000, // 30 seconds
    didRestore: false,

    init: function() {
        // Mark this run as "unclean" until we unload cleanly
        try { localStorage.setItem(this.CLEAN_EXIT_KEY(), '0'); } catch (e) {}

        // Start auto-save
        this.startAutoSave();

        // Setup beforeunload (best-effort)
        window.addEventListener('beforeunload', () => {
            try { this.onBeforeUnload(); } catch (e) {}
        });
    },

    onBeforeUnload: function() {
        // Only save a recovery point if there are unsaved changes
        if (IDE.state?.dirtyTabs && IDE.state.dirtyTabs.size > 0) {
            this.saveRecoveryPoint();
        } else {
            this.clearRecovery();
        }

        // Mark clean exit
        try { localStorage.setItem(this.CLEAN_EXIT_KEY(), '1'); } catch (e) {}
    },

    startAutoSave: function() {
        setInterval(() => {
            try {
                // Avoid noisy writes while idle
                if (document.hidden) return;
                this.saveRecoveryPoint();
            } catch (e) {}
        }, this.INTERVAL);
    },

    saveRecoveryPoint: function() {
        // Only if there's something meaningful to recover
        if (!IDE.state?.dirtyTabs || IDE.state.dirtyTabs.size === 0) return;

        const payload = {
            ts: Date.now(),
            files: IDE.state.files,
            tabs: IDE.state.tabs,
            activeTab: IDE.state.activeTab,
            viewStates: (window.SessionManager && SessionManager.isPersistCursorEnabled())
                ? SessionManager.viewStates
                : {}
        };

        try {
            localStorage.setItem(this.STORAGE_KEY(), JSON.stringify(payload));
        } catch (e) {
            // Storage might be full; ignore silently
        }
    },

    checkRecovery: function() {
        try {
            const clean = localStorage.getItem(this.CLEAN_EXIT_KEY()) === '1';
            if (clean) {
                // Clean exit -> no prompt; clear stale recovery
                this.clearRecovery();
                return false;
            }

            const raw = localStorage.getItem(this.STORAGE_KEY());
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data || !data.files) {
                this.clearRecovery();
                return false;
            }

            const age = Date.now() - (data.ts || 0);
            const maxAge = 1000 * 60 * 60 * 24 * 3; // 3 days
            if (age > maxAge) {
                this.clearRecovery();
                return false;
            }

            const ok = confirm('⚠️ Detected an unclean exit. Restore your last auto-save?');
            if (!ok) {
                this.clearRecovery();
                return false;
            }

            this.restore(data);
            return true;
        } catch (error) {
            console.error('Failed to check recovery:', error);
            this.clearRecovery();
            return false;
        }
    },

    restore: function(recoveryData) {
        try {
            IDE.state.files = recoveryData.files || IDE.state.files;
            IDE.state.tabs = Array.isArray(recoveryData.tabs) ? recoveryData.tabs : IDE.state.tabs;
            IDE.state.activeTab = recoveryData.activeTab || IDE.state.activeTab;

            // Restore viewStates if present
            if (window.SessionManager && recoveryData.viewStates && typeof recoveryData.viewStates === 'object') {
                SessionManager.viewStates = recoveryData.viewStates;
            }

            FileSystem.save(true);
            FileSystem.refreshTree();

            if (IDE.state.activeTab) {
                TabManager.open(IDE.state.activeTab);
            }

            this.didRestore = true;
            // Suppressed: routine boot notification
            // Utils.toast('✅ Work restored from auto-save', 'success');
            this.clearRecovery();
        } catch (error) {
            Utils.toast('Failed to restore: ' + error.message, 'error');
        }
    },

    clearRecovery: function() {
        try { localStorage.removeItem(this.STORAGE_KEY()); } catch (e) {}
    }
};

// Initialize auto-recovery (recovery prompt runs after boot)
AutoRecovery.init();


/* ============================================================
 * SUPERPATCH v10-INFINITY (2025-12-31)
 * - Removes duplicated/truncated code path
 * - Hardens storage + dependency loading
 * - Fixes debugger breakpoint rendering + gutter toggles
 * - Adds system diagnostics (Ctrl+Shift+D) + dependency loader
 * ============================================================ */
(function(){
  'use strict';
  try {
    if (window.__PROCODEIDE_SUPERPATCH_V10__) return;
    window.__PROCODEIDE_SUPERPATCH_V10__ = { ts: Date.now() };
  } catch(e) {}

  // 1) Safe Storage patch (localStorage/sessionStorage no-crash + in-memory fallback)
  (function(){
    try{
      if (window.__PC_STORAGE_PATCHED__) return;
      window.__PC_STORAGE_PATCHED__ = true;

      const fallback = new WeakMap(); // Storage -> Map
      const getMap = (storage) => {
        let m = fallback.get(storage);
        if (!m) { m = new Map(); fallback.set(storage, m); }
        return m;
      };

      const orig = {
        getItem: Storage.prototype.getItem,
        setItem: Storage.prototype.setItem,
        removeItem: Storage.prototype.removeItem,
        clear: Storage.prototype.clear
      };

      Storage.prototype.setItem = function(k, v) {
        try {
          return orig.setItem.call(this, k, v);
        } catch (e) {
          try { getMap(this).set(String(k), String(v)); } catch (_) {}
          try {
            if (!this.__pc_fallback_warned__) {
              this.__pc_fallback_warned__ = true;
              console.warn('Storage.setItem failed; using in-memory fallback for this session.', e);
            }
          } catch (_) {}
          return undefined;
        }
      };

      Storage.prototype.getItem = function(k) {
        try {
          const r = orig.getItem.call(this, k);
          if (r !== null) return r;
        } catch (_) {}
        try {
          const m = getMap(this);
          const key = String(k);
          return m.has(key) ? m.get(key) : null;
        } catch (_) {
          return null;
        }
      };

      Storage.prototype.removeItem = function(k) {
        try { orig.removeItem.call(this, k); } catch (_) {}
        try { getMap(this).delete(String(k)); } catch (_) {}
      };

      Storage.prototype.clear = function() {
        try { orig.clear.call(this); } catch (_) {}
        try { getMap(this).clear(); } catch (_) {}
      };
    } catch (e) {
      console.warn('Storage hardening patch failed', e);
    }
  })();

  // 2) Dependency loader (fallback CDNs)
  window.ProCodeDeps = window.ProCodeDeps || (function(){
    const loaded = new Set();

    function waitFor(check, timeoutMs = 12000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          try { if (check()) return resolve(true); } catch (_) {}
          if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
          requestAnimationFrame(tick);
        };
        tick();
      });
    }

    function loadScript(url) {
      return new Promise((resolve, reject) => {
        if (loaded.has(url)) return resolve(true);
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => { loaded.add(url); resolve(true); };
        s.onerror = () => reject(new Error('Failed to load script: ' + url));
        document.head.appendChild(s);
      });
    }

    async function ensureAny(urls, check) {
      if (check()) return true;
      for (const url of urls) {
        try {
          await loadScript(url);
          await waitFor(check, 15000);
          return true;
        } catch (e) {
          console.warn(e);
        }
      }
      throw new Error('Missing dependency (all fallbacks failed)');
    }

    return {
      ensureToastify: () => ensureAny([
        'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.12.0/toastify.min.js'
      ], () => typeof window.Toastify === 'function'),

      ensureJSZip: () => ensureAny([
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
      ], () => typeof window.JSZip === 'function'),

      ensureFileSaver: () => ensureAny([
        'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
        'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js'
      ], () => typeof window.saveAs === 'function'),

      ensureMarked: () => ensureAny([
        // FIX: pinned cdnjs first (version-locked), unpinned jsdelivr as last resort
        'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js',
        'https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js'
      ], () => typeof window.marked === 'function'),

      ensureBabel: () => ensureAny([
        'https://unpkg.com/@babel/standalone@7.23.6/babel.min.js',
        'https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.6/babel.min.js'
      ], () => (window.Babel && typeof Babel.transform === 'function')),

      ensurePyodideLoader: () => ensureAny([
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js'
      ], () => typeof window.loadPyodide === 'function'),

      ensureAll: async () => {
        const results = {};
        const tasks = [
          ['Toastify', 'ensureToastify'],
          ['JSZip', 'ensureJSZip'],
          ['FileSaver', 'ensureFileSaver'],
          ['marked', 'ensureMarked'],
          ['Babel', 'ensureBabel'],
          ['Pyodide', 'ensurePyodideLoader']
        ];
        for (const [name, fn] of tasks) {
          try { await window.ProCodeDeps[fn](); results[name] = 'OK'; }
          catch (_) { results[name] = 'MISSING'; }
        }
        return results;
      }
    };
  })();

  // 3) Runner.runPython hardening (handle missing loadPyodide gracefully)
  (function(){
    try {
      if (!window.Runner || typeof Runner.runPython !== 'function') return;
      if (Runner.__pc_v10_patched_py__) return;
      Runner.__pc_v10_patched_py__ = true;

      const orig = Runner.runPython.bind(Runner);
      Runner.runPython = function(path) {
        try {
          if (!window.pyodide && typeof window.loadPyodide !== 'function' &&
              window.ProCodeDeps && typeof ProCodeDeps.ensurePyodideLoader === 'function') {
            try { Console?.info?.('Loading Pyodide loader (fallback)…'); } catch (_) {}
            ProCodeDeps.ensurePyodideLoader()
              .then(() => orig(path))
              .catch(err => {
                try { Console?.error?.('Pyodide loader unavailable:', err); } catch (_) {}
                try { Runner.updateRunButton?.(false); } catch (_) {}
                try { Utils?.toast?.('Pyodide loader missing (offline?). Cannot run Python.', 'error'); } catch (_) {}
              });
            return;
          }
        } catch (_) {}
        return orig(path);
      };
    } catch (e) {
      console.warn('Runner Python patch failed', e);
    }
  })();

  // 4) Breakpoints persistence (survive reloads)
  (function(){
    try {
      if (!window.Debugger) return;
      if (Debugger.__pc_v10_bp__) return;
      Debugger.__pc_v10_bp__ = true;

      const KEY = 'procodeide.breakpoints.v1';

      Debugger.saveBreakpoints = function() {
        try {
          const arr = Array.from(this.breakpoints?.values?.() || [])
            .filter(b => b && b.path && typeof b.line === 'number')
            .map(b => ({ path: b.path, line: b.line, condition: b.condition || null }));
          localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: Date.now(), breakpoints: arr }));
        } catch (e) {
          console.warn('Failed to save breakpoints', e);
        }
      };

      Debugger.loadBreakpoints = function() {
        try {
          const raw = localStorage.getItem(KEY);
          if (!raw) return;
          const obj = JSON.parse(raw);
          if (!obj || !Array.isArray(obj.breakpoints)) return;

          this.breakpoints = new Map();
          for (const b of obj.breakpoints) {
            if (!b || !b.path || typeof b.line !== 'number') continue;
            const key = `${b.path}:${b.line}`;
            this.breakpoints.set(key, { path: b.path, line: b.line, condition: b.condition || null, hitCount: 0 });
          }
        } catch (e) {
          console.warn('Failed to load breakpoints', e);
        }
      };

      if (typeof Debugger.toggleBreakpoint === 'function') {
        const origToggle = Debugger.toggleBreakpoint.bind(Debugger);
        Debugger.toggleBreakpoint = function(line) {
          const r = origToggle(line);
          try { Debugger.saveBreakpoints(); } catch (_) {}
          return r;
        };
      }

      try { Debugger.loadBreakpoints(); } catch (_) {}

      window.addEventListener('load', () => {
        setTimeout(() => {
          try { Debugger.setupBreakpoints?.(); } catch (_) {}
        }, 1200);
      });
    } catch (e) {
      console.warn('Breakpoint persistence patch failed', e);
    }
  })();

  // 5) System diagnostics modal (Ctrl+Shift+D)
  window.SystemDiagnostics = window.SystemDiagnostics || {
    collect: async function() {
      const deps = {
        Monaco: !!(window.monaco && monaco.editor),
        JSZip: typeof window.JSZip === 'function',
        FileSaver: typeof window.saveAs === 'function',
        Toastify: typeof window.Toastify === 'function',
        marked: typeof window.marked === 'function',
        Babel: !!(window.Babel && typeof Babel.transform === 'function'),
        PyodideLoader: typeof window.loadPyodide === 'function',
        PyodideRuntime: !!window.pyodide
      };

      let sw = { supported: ('serviceWorker' in navigator), registered: false, scope: '', state: '' };
      try {
        if (sw.supported) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            sw.registered = true;
            sw.scope = reg.scope || '';
            sw.state = reg.active ? reg.active.state : (reg.installing ? reg.installing.state : '');
          }
        }
      } catch (_) {}

      let storage = { localStorage: true, sessionStorage: true };
      try { localStorage.setItem('__pc_test__', '1'); localStorage.removeItem('__pc_test__'); } catch (_) { storage.localStorage = false; }
      try { sessionStorage.setItem('__pc_test__', '1'); sessionStorage.removeItem('__pc_test__'); } catch (_) { storage.sessionStorage = false; }

      const errors = (window.errorHandler && typeof errorHandler.getRecentErrors === 'function')
        ? errorHandler.getRecentErrors()
        : [];

      return {
        ts: new Date().toISOString(),
        ide: { version: window.IDE?.version, build: window.IDE?.build },
        url: location.href,
        online: navigator.onLine,
        ua: navigator.userAgent,
        storage,
        deps,
        serviceWorker: sw,
        recentErrors: errors.slice(0, 25)
      };
    },

    show: async function() {
      let report;
      try { report = await this.collect(); } catch (e) { report = { error: String(e) }; }

      const pretty = (obj) => {
        try { return JSON.stringify(obj, null, 2); } catch (_) { return String(obj); }
      };

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" style="width:860px; max-width:95vw;">
          <div class="modal-header">
            <h3><i class="fas fa-stethoscope"></i> System Diagnostics</h3>
            <button class="btn icon small" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body" style="max-height:70vh; overflow:auto;">
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="btn" id="pc-diag-copy"><i class="fas fa-copy"></i> Copy report</button>
              <button class="btn" id="pc-diag-load"><i class="fas fa-cloud-download-alt"></i> Load missing deps</button>
              <button class="btn" id="pc-diag-refresh"><i class="fas fa-sync"></i> Refresh</button>
            </div>
            <pre style="white-space:pre-wrap; background:var(--bg-secondary); border:1px solid var(--border); padding:12px; border-radius:10px; font-size:12px;">${pretty(report)}</pre>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const close = () => { try { modal.remove(); } catch (_) {} };
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

      const copyBtn = modal.querySelector('#pc-diag-copy');
      const loadBtn = modal.querySelector('#pc-diag-load');
      const refBtn  = modal.querySelector('#pc-diag-refresh');

      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const txt = pretty(report);
          try {
            await navigator.clipboard.writeText(txt);
            Utils?.toast?.('Diagnostics copied to clipboard', 'success');
          } catch (_) {
            try {
              const ta = document.createElement('textarea');
              ta.value = txt;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
              Utils?.toast?.('Diagnostics copied (fallback)', 'success');
            } catch (_) {
              Utils?.toast?.('Copy failed', 'error');
            }
          }
        });
      }

      if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
          try {
            Utils?.toast?.('Loading missing dependencies...', 'info');
            await (window.ProCodeDeps?.ensureAll?.() || Promise.resolve({}));
            Utils?.toast?.('Dependency load completed', 'success');
            report = await this.collect();
            const pre = modal.querySelector('pre');
            if (pre) pre.textContent = pretty(report);
          } catch (_) {
            Utils?.toast?.('Failed to load dependencies', 'error');
          }
        });
      }

      if (refBtn) {
        refBtn.addEventListener('click', async () => {
          report = await this.collect();
          const pre = modal.querySelector('pre');
          if (pre) pre.textContent = pretty(report);
        });
      }
    }
  };

  // 6) Shortcut + Command Palette integration
  (function(){
    // Ctrl+Shift+D

    // Inject into UltraPlus entries if available
    try {
      if (window.UltraPlus && typeof UltraPlus.getCommandPaletteEntries === 'function' && !UltraPlus.__pc_v10_diag__) {
        UltraPlus.__pc_v10_diag__ = true;
        const orig = UltraPlus.getCommandPaletteEntries.bind(UltraPlus);
        UltraPlus.getCommandPaletteEntries = function() {
          const list = orig() || [];
          list.push({ name: 'Diagnostics: System Report', shortcut: 'Ctrl+Shift+D', icon: 'fa-stethoscope', action: () => SystemDiagnostics.show() });
          list.push({ name: 'System: Load Missing Dependencies', shortcut: '', icon: 'fa-cloud-download-alt', action: async () => {
            try { Utils?.toast?.('Loading missing dependencies...', 'info'); await ProCodeDeps.ensureAll(); Utils?.toast?.('Dependencies loaded', 'success'); } catch (_) { Utils?.toast?.('Failed to load dependencies', 'error'); }
          }});
          return list;
        };
      }
    } catch (_) {}
  })();

  // 7) Build string update
  try {
    if (window.IDE && typeof IDE.build === 'string' && IDE.build.indexOf('SUPERPATCH v10') === -1) {
      IDE.build = IDE.build + ' / SUPERPATCH v10-INFINITY (2025-12-31)';
    }
  } catch (_) {}
})();
