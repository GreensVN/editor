/**
 * toast-v29.js
 * V29 Toast system, V32/V33 Toast, notification utilities
 * ProCode IDE v3.0
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ██████████████████████████████████████████████████████████████████████████
   ██                                                                       ██
   ██   ProCode IDE — UNIFIED ARCHITECTURE (Refactored)                    ██
   ██   Replaces all v21–v33 monkey-patches with single-source-of-truth    ██
   ██                                                                       ██
   ██   MODULE 0  — MonacoBootstrap  (CORS-safe blob: worker proxy)        ██
   ██   MODULE 1  — ToastService     (single toast system, 3 APIs unified) ██
   ██   MODULE 2  — StorageManager   (OPFS > IndexedDB > localStorage)     ██
   ██   MODULE 3  — ShortcutManager  (ONE keydown, context-aware)          ██
   ██   MODULE 4  — SearchWorkerMgr  (Blob → main-thread fallback)         ██
   ██   MODULE 5  — Runner (unified) (cleanup + reset + single write)      ██
   ██   MODULE 6  — FileSystem.save  (Storage → OPFS → auto-backup)       ██
   ██   MODULE 7  — BootOrchestrator (Promise.all → sequential init)       ██
   ██                                                                       ██
   ██████████████████████████████████████████████████████████████████████████ */
'use strict';

// ─── GUARD: run once ───────────────────────────────────────────────────────
if (window.__PROCODE_UNIFIED__) { if(window.__PROCODE_DEBUG__) console.warn('[Unified] already loaded'); }
else {
window.__PROCODE_UNIFIED__ = true;

// ══════════════════════════════════════════════════════════════════════
// MODULE 0 — MonacoBootstrap
// Fixes: CORS/Strict-MIME for Monaco workers in no-bundler environments.
// Strategy: blob: URL proxy (inherits page origin → bypasses CORS).
//           If CSP blocks blob workers, falls back to null (SimpleWorker
//           on main thread — degraded but functional).
// ══════════════════════════════════════════════════════════════════════
window.__MONACO_BOOT_PROMISE__ = window.__MONACO_BOOT_PROMISE__ || (function () {
  return new Promise(function (resolve, reject) {
    if (window.__MONACO_READY__ || (window.monaco && window.monaco.editor)) {
      return resolve(window.monaco);
    }

    function doLoad() {
      const CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min';
      const CDN_VS   = CDN_BASE + '/vs';

      // Blob-proxy worker factory — bypasses CORS on any origin
      function makeWorkerFactory() {
        const workerMain = CDN_VS + '/base/worker/workerMain.js';
        const proxyScript = [
          "self.MonacoEnvironment = { baseUrl: '" + CDN_BASE + "/' };",
          "importScripts('" + workerMain + "');"
        ].join('\n');

        try {
          var blob = new Blob([proxyScript], { type: 'text/javascript' });
          var url  = URL.createObjectURL(blob);
          var test = new Worker(url);   // throws synchronously if CSP blocks blob
          test.terminate();
          URL.revokeObjectURL(url);
          // CSP allows blob workers ─ return real factory
          return function (_modId, _label) {
            var b = new Blob([proxyScript], { type: 'text/javascript' });
            return URL.createObjectURL(b);
          };
        } catch (_csp) {
          console.warn('[Monaco] Blob workers blocked by CSP → main-thread fallback (degraded)');
          return function () { return null; };
        }
      }

      // Set env BEFORE require.config — Monaco reads it during AMD load
      window.MonacoEnvironment = window.MonacoEnvironment || {};
      window.MonacoEnvironment.getWorkerUrl = makeWorkerFactory();

      // FIX-RUNTIME-3: Guard window.require — if Monaco loader.js hasn't been parsed yet
      // (e.g. this script runs before the <script src="loader.js"> tag fires), calling
      // window.require() throws "not a function". Retry with exponential backoff instead.
      if (typeof window.require !== 'function') {
        let _retries = 0;
        const _waitForRequire = setInterval(function() {
          _retries++;
          if (typeof window.require === 'function') {
            clearInterval(_waitForRequire);
            doLoad(); // require is now available, run normally
          } else if (_retries > 40) { // 40 × 250ms = 10s max wait
            clearInterval(_waitForRequire);
            console.error('[Monaco] loader.js never defined window.require after 10s — Monaco unavailable');
            resolve(null); // resolve with null so BootOrchestrator doesn't hang
          }
        }, 250);
        return;
      }

      try { window.require.config({ paths: { vs: CDN_VS } }); } catch (e) {}

      window.require(
        ['vs/editor/editor.main'],
        function () {
          window.__MONACO_READY__ = true;
          window.dispatchEvent(new CustomEvent('monaco-ready'));
          resolve(window.monaco);
        },
        function (err) {
          console.error('[Monaco] load failed:', err);
          reject(err);
        }
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doLoad, { once: true });
    } else {
      doLoad();
    }
  });
}());

// ══════════════════════════════════════════════════════════════════════
// MODULE 1 — ToastService
// Fixes: 3 concurrent toast systems (Toastify, v29notify, V32Toast).
// Unifies to ONE pure-DOM engine.  All legacy APIs forwarded here.
// ══════════════════════════════════════════════════════════════════════
const ToastService = (function () {
  var container = null;
  var MAX = 5;

  function getContainer() {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.id = 'toast-service-container';
      Object.assign(container.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column-reverse', gap: '8px',
        zIndex: '9998', pointerEvents: 'none'
      });
      document.body.appendChild(container);
    }
    return container;
  }

  var COLOR = {
    success: { bg: '#166534', border: '#22c55e', icon: '✓' },
    error:   { bg: '#7f1d1d', border: '#ef4444', icon: '✕' },
    warning: { bg: '#78350f', border: '#f59e0b', icon: '⚠' },
    warn:    { bg: '#78350f', border: '#f59e0b', icon: '⚠' },
    info:    { bg: '#1e3a5f', border: '#3b82f6', icon: 'ℹ' }
  };

  function show(msg, type, duration) {
    if (!msg) return;
    type = type || 'info';
    duration = (duration == null) ? 3000 : duration;

    var c = getContainer();
    // Cull overflow
    while (c.children.length >= MAX) c.removeChild(c.lastChild);

    var scheme = COLOR[type] || COLOR.info;
    var toast = document.createElement('div');
    Object.assign(toast.style, {
      background: scheme.bg,
      border: '1px solid ' + scheme.border,
      color: '#f4f4f5',
      borderRadius: '8px',
      padding: '10px 16px',
      fontSize: '13px',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', alignItems: 'center', gap: '8px',
      minWidth: '240px', maxWidth: '380px',
      boxShadow: '0 4px 16px rgba(0,0,0,.4)',
      opacity: '0', transform: 'translateX(20px)',
      transition: 'opacity .22s ease, transform .22s ease',
      pointerEvents: 'auto', cursor: 'pointer'
    });
    toast.innerHTML = '<span style="font-size:14px">' + scheme.icon + '</span>' +
                      '<span style="flex:1;white-space:pre-wrap;word-break:break-word">' +
                      String(msg).replace(/</g,'&lt;') + '</span>';
    toast.addEventListener('click', function () { dismiss(toast); });
    c.insertBefore(toast, c.firstChild);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    if (duration > 0) {
      setTimeout(function () { dismiss(toast); }, duration);
    }
  }

  function dismiss(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(function () { toast.parentNode && toast.parentNode.removeChild(toast); }, 250);
  }

  // ── Expose unified API ─────────────────────────────────────────────
  var svc = { show: show };

  // Forward all legacy APIs to ToastService
  function installBackwardCompat() {
    // Utils.toast (v22-v25)
    if (window.Utils) {
      window.Utils.toast = function (msg, type, dur) { show(msg, type || 'info', dur); };
    }
    // v29notify
    window.v29notify = function (msg, type, dur) { show(msg, type || 'info', dur); };
    // V32Toast (show API)
    window.V32Toast = {
      __unified__: true,
      show: function (msg, type, dur) { show(msg, type || 'info', dur); }
    };
    // ToastBox (info/success/warn/error API)
    window.ToastBox = {
      _fwd: function(t, m) { show(m, t === 'warn' ? 'warning' : t); },
      info:    function(m) { this._fwd('info',    m); },
      success: function(m) { this._fwd('success', m); },
      warn:    function(m) { this._fwd('warn',    m); },
      error:   function(m) { this._fwd('error',   m); }
    };
    // v33Toast (danger → error)
    window.v33Toast = function(msg, kind) {
      show(msg, kind === 'danger' ? 'error' : (kind || 'info'), 2700);
    };
    // Toastify shim (some components call Toastify({...}).showToast())
    window.Toastify = window.Toastify || function (opts) {
      return { showToast: function () { show(opts.text || opts.message || '', 'info', opts.duration); } };
    };
  }

  // Run now and also after DOM ready (in case Utils isn't defined yet)
  installBackwardCompat();
  document.addEventListener('DOMContentLoaded', installBackwardCompat);
  // Re-patch 2 s after boot to catch late Utils creation
  setTimeout(installBackwardCompat, 2000);

  window.ToastService = svc;
  return svc;
}());

// ══════════════════════════════════════════════════════════════════════
// MODULE 2 — StorageManager
// Fixes: IndexedDBManager + OPFSCache + SecureStorage fragmentation.
// Priority: OPFS > IndexedDB > localStorage.
// Public API: set(k,v), get(k), delete(k), list(prefix), 
//             setSecure(k,v), getSecure(k), flush(), ready (Promise)
// ══════════════════════���═══════════════════════════════════════════════
const StorageManager = (function () {
  // ── AES-GCM key for secure storage ────────────────────────────────
  var _cryptoKey = null;
  async function _getKey() {
    if (_cryptoKey) return _cryptoKey;
    try {
      var stored = localStorage.getItem('__pc_cryptoKey__');
      if (stored) {
        var raw = Uint8Array.from(atob(stored), function (c) { return c.charCodeAt(0); });
        _cryptoKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
      } else {
        _cryptoKey = await crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
        var exported = await crypto.subtle.exportKey('raw', _cryptoKey);
        localStorage.setItem('__pc_cryptoKey__', btoa(String.fromCharCode(...new Uint8Array(exported))));
      }
    } catch (e) {
      _cryptoKey = null; // WebCrypto unavailable
    }
    return _cryptoKey;
  }

  // ── IndexedDB backend ────��────────────────────────────────────────
  var _idb = null;
  var _idbReady = null;

  function _openIDB() {
    if (_idbReady) return _idbReady;
    _idbReady = new Promise(function (resolve, reject) {
      var req = indexedDB.open('ProCodeUnified', 3);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('kv'))   db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
        if (!db.objectStoreNames.contains('sec'))   db.createObjectStore('sec');
      };
      req.onsuccess = function (e) { _idb = e.target.result; resolve(_idb); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
    return _idbReady;
  }

  function _idbOp(store, mode, fn) {
    return _openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, mode);
        var req = fn(tx.objectStore(store));
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  // ── OPFS backend ──────────────────────────────────────────────────
  var _opfsRoot = null;
  async function _getOPFS() {
    if (_opfsRoot) return _opfsRoot;
    try {
      _opfsRoot = await navigator.storage.getDirectory();
    } catch (_) { _opfsRoot = null; }
    return _opfsRoot;
  }

  async function _opfsWrite(key, value) {
    var root = await _getOPFS();
    if (!root) return false;
    try {
      var safe = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      var fh   = await root.getFileHandle(safe, { create: true });
      var w    = await fh.createWritable();
      await w.write(JSON.stringify(value));
      await w.close();
      return true;
    } catch (_) { return false; }
  }

  async function _opfsRead(key) {
    var root = await _getOPFS();
    if (!root) return undefined;
    try {
      var safe = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      var fh   = await root.getFileHandle(safe);
      var file = await fh.getFile();
      var txt  = await file.text();
      return JSON.parse(txt);
    } catch (_) { return undefined; }
  }

  // ── Write queue (debounced IDB batch) ─────────��──────────��──────��──
  var _writeQueue = {};
  var _writeTimer = null;
  function _enqueue(key, value) {
    _writeQueue[key] = value;
    clearTimeout(_writeTimer);
    _writeTimer = setTimeout(_flush, 250);
  }
  function _flush() {
    var q = _writeQueue;
    _writeQueue = {};
    Object.keys(q).forEach(function (k) {
      _idbOp('kv', 'readwrite', function (s) { return s.put(q[k], k); }).catch(console.warn);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────
  async function set(key, value) {
    // Write to localStorage immediately (sync fallback)
    try { localStorage.setItem('__sm_' + key, JSON.stringify(value)); } catch (_) {}
    // Async: OPFS (fastest) then IDB
    _opfsWrite(key, value);
    _enqueue(key, value);
  }

  async function get(key) {
    // Try OPFS first
    var v = await _opfsRead(key);
    if (v !== undefined) return v;
    // Try IDB
    try {
      v = await _idbOp('kv', 'readonly', function (s) { return s.get(key); });
      if (v !== undefined) return v;
    } catch (_) {}
    // Fallback localStorage
    try {
      var raw = localStorage.getItem('__sm_' + key);
      return raw !== null ? JSON.parse(raw) : undefined;
    } catch (_) { return undefined; }
  }

  async function del(key) {
    try { localStorage.removeItem('__sm_' + key); } catch (_) {}
    try { await _idbOp('kv', 'readwrite', function (s) { return s.delete(key); }); } catch (_) {}
    // OPFS delete
    var root = await _getOPFS();
    if (root) {
      try {
        var safe = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        await root.removeEntry(safe);
      } catch (_) {}
    }
  }

  async function list(prefix) {
    prefix = prefix || '';
    var keys = [];
    try {
      await _openIDB();
      keys = await new Promise(function (resolve, reject) {
        var tx   = _idb.transaction('kv','readonly');
        var req  = tx.objectStore('kv').getAllKeys();
        req.onsuccess = function () {
          resolve(req.result.filter(function (k) { return String(k).startsWith(prefix); }));
        };
        req.onerror = function () { reject(req.error); };
      });
    } catch (_) {
      // localStorage fallback
      keys = Object.keys(localStorage)
        .filter(function (k) { return k.startsWith('__sm_' + prefix); })
        .map(function (k) { return k.slice(5); });
    }
    return keys;
  }

  // ── Secure storage (AES-GCM) ──────────────────────────────────────
  async function setSecure(key, value) {
    var k = await _getKey();
    if (!k) { await set('__sec_' + key, value); return; }
    try {
      var iv  = crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder().encode(JSON.stringify(value));
      var ct  = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, k, enc);
      var payload = { iv: btoa(String.fromCharCode(...iv)), ct: btoa(String.fromCharCode(...new Uint8Array(ct))) };
      await _idbOp('sec', 'readwrite', function (s) { return s.put(payload, key); });
    } catch (_) { await set('__sec_' + key, value); }
  }

  async function getSecure(key) {
    var k = await _getKey();
    if (!k) { return get('__sec_' + key); }
    try {
      var payload = await _idbOp('sec', 'readonly', function (s) { return s.get(key); });
      if (!payload) return undefined;
      var iv  = Uint8Array.from(atob(payload.iv), function (c) { return c.charCodeAt(0); });
      var ct  = Uint8Array.from(atob(payload.ct), function (c) { return c.charCodeAt(0); });
      var pt  = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, k, ct);
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (_) { return get('__sec_' + key); }
  }

  var svc = {
    set: set, get: get, delete: del, list: list,
    setSecure: setSecure, getSecure: getSecure, flush: _flush,
    ready: _openIDB()
  };

  // Backward-compat shims for legacy code
  function _installShims() {
    if (!window.IndexedDBManager) {
      window.IndexedDBManager = {
        init: function () { return svc.ready; },
        getFile: function (p) { return get('file::' + p); },
        setFile: function (p, c) { return set('file::' + p, c); },
        getAllFiles: function () {
          return list('file::').then(function (ks) {
            return Promise.all(ks.map(function (k) {
              return get(k).then(function (c) {
                return { path: k.replace('file::',''), content: c };
              });
            }));
          });
        },
        getSetting: function (k) { return get('setting::' + k); },
        setSetting: function (k, v) { return set('setting::' + k, v); },
        db: null
      };
    }
    if (!window.OPFSCache) {
      window.OPFSCache = {
        read:  function (k) { return _opfsRead(k); },
        write: function (k, v) { return _opfsWrite(k, v); }
      };
    }
    if (!window.SecureStorage) {
      window.SecureStorage = {
        set: setSecure, get: getSecure
      };
    }
  }

  _installShims();
  document.addEventListener('DOMContentLoaded', _installShims);
  setTimeout(_installShims, 1000);

  window.StorageManager = svc;
  return svc;
}());

// ══════════════════════════════════════════════════════════════════════
// MODULE 3 — ShortcutManager
// Fixes: 30+ scattered addEventListener('keydown') calls.
// ONE capture-phase listener. Context-aware: suppresses plain char
// keys in input/textarea/contenteditable/Monaco .inputarea.
// ══════════════════════════════════════════════════════════════════════
const ShortcutManager = (function () {
  var _handlers = [];  // { id, keys, fn, priority, modal }
  var _active = true;
  var _modalLevel = 0;

  function _inEditable(el) {
    if (!el) return false;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    // Monaco editor textarea
    if (el.classList && el.classList.contains('inputarea')) return true;
    return false;
  }

  function _matchKey(e, key) {
    // key format: "Ctrl+Shift+K", "F5", "Escape", etc.
    if (typeof key !== 'string' || !key) return false; // guard: skip null/undefined/non-string keys
    var parts  = key.split('+');
    var main   = parts[parts.length - 1].toLowerCase();
    var ctrl   = parts.includes('Ctrl');
    var shift  = parts.includes('Shift');
    var alt    = parts.includes('Alt');
    var meta   = parts.includes('Meta') || parts.includes('Cmd');

    if ((ctrl  !== (e.ctrlKey  || false)) && !(meta && e.metaKey)) return false;
    if (ctrl && !e.ctrlKey && !e.metaKey) return false;
    if (shift  !== e.shiftKey) return false;
    if (alt    !== e.altKey)   return false;

    var eKey = e.key.toLowerCase();
    return (eKey === main ||
            eKey === main.replace('delete','del') ||
            eKey === main.replace('escape','esc'));
  }

  function _dispatch(e) {
    if (!_active) return;

    var inEdit = _inEditable(e.target);
    // Plain char in editable → let the browser handle it
    if (inEdit && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) return;

    // Sort by priority (higher first)
    var sorted = _handlers.slice().sort(function (a, b) { return (b.priority||0) - (a.priority||0); });
    for (var i = 0; i < sorted.length; i++) {
      var h = sorted[i];
      // Modal-level guard
      if (h.modal && _modalLevel < h.modal) continue;
      var keys = Array.isArray(h.keys) ? h.keys : [h.keys];
      for (var j = 0; j < keys.length; j++) {
        if (!keys[j] || typeof keys[j] !== 'string') continue; // extra safety
        if (_matchKey(e, keys[j])) {
          e.preventDefault();
          e.stopPropagation();
          try { h.fn(e); } catch (ex) { console.error('[ShortcutManager]', ex); }
          return;
        }
      }
    }
  }

  window.addEventListener('keydown', _dispatch, { capture: true });

  function register(id, keys, fn, opts) {
    opts = opts || {};
    // Guard: if called with old 2-arg API (id=keyCombo, keys=fn), skip silently
    if (typeof keys === 'function' && typeof fn === 'undefined') {
      console.warn('[ShortcutManager] register() called with old API — skipping:', id);
      return;
    }
    // Normalize keys to array of strings, filter out non-strings
    var normalizedKeys = Array.isArray(keys) ? keys : [keys];
    normalizedKeys = normalizedKeys.filter(function(k) { return typeof k === 'string' && k; });
    if (normalizedKeys.length === 0) return; // nothing valid to register
    // Remove old handler with same id
    _handlers = _handlers.filter(function (h) { return h.id !== id; });
    _handlers.push({ id: id, keys: normalizedKeys, fn: fn,
                     priority: opts.priority || 0, modal: opts.modal || 0 });
  }

  function unregister(id) {
    _handlers = _handlers.filter(function (h) { return h.id !== id; });
  }

  function setModalLevel(level) { _modalLevel = level; }

  var svc = {
    register: register, unregister: unregister, setModalLevel: setModalLevel,
    enable:   function () { _active = true; },
    disable:  function () { _active = false; },
    handlers: function () { return _handlers.slice(); }
  };

  // ── Register all IDE shortcuts (consolidated from all versions) ─────
  function _registerIDEShortcuts() {
    var SM = svc;
    // Run / Execute
    SM.register('run',           'F5',           function () { window.Runner && Runner.exec(); });
    SM.register('run-ctrl',      'Ctrl+Enter',   function () { window.Runner && Runner.exec(); });
    SM.register('stop',          'Shift+F5',     function () { window.Runner && Runner.stop && Runner.stop(); });
    // Save
    SM.register('save',          'Ctrl+S',       function () { window.FileSystem && FileSystem.save && FileSystem.save(); });
    SM.register('save-all',      'Ctrl+Shift+S', function () { window.FileSystem && FileSystem.save && FileSystem.save(); });
    // Export
    SM.register('export-zip',    'Ctrl+Shift+E', function () { window.IDE && IDE.exportZIP && IDE.exportZIP(); });
    // New file
    SM.register('new-file',      'Ctrl+N',       function () { window.Explorer && Explorer.newFile && Explorer.newFile(); });
    // Command Palette
    SM.register('cmd-palette',   ['Ctrl+P','F1'],function () { window.CommandPalette && CommandPalette.open && CommandPalette.open(); });
    // Find / search
    SM.register('find',          'Ctrl+F',       function () { window.CommandPalette && CommandPalette.focus && CommandPalette.focus(); });
    // Close active tab
    SM.register('close-tab',     'Ctrl+W',       function () { window.TabManager && TabManager.closeActive && TabManager.closeActive(); });
    // Toggle sidebar
    SM.register('toggle-sidebar','Ctrl+B',       function () { window.LayoutManager && LayoutManager.toggleSidebar && LayoutManager.toggleSidebar(); });
    // Toggle terminal
    SM.register('toggle-term',   ['Ctrl+`','Ctrl+Shift+`'], function () { window.Terminal && Terminal.toggle && Terminal.toggle(); });
    // Blueprint
    SM.register('blueprint',     'Ctrl+Shift+B', function () { window.BlueprintEditor && BlueprintEditor.toggle && BlueprintEditor.toggle(); });
    // DevTools
    SM.register('devtools',      'Ctrl+Shift+I', function () { window.DevToolsPanel && DevToolsPanel.toggle && DevToolsPanel.toggle(); });
    // TimeTravel
    SM.register('timetravel',    'Ctrl+Shift+T', function () { window.TimeTravelManager && TimeTravelManager.toggle && TimeTravelManager.toggle(); });
    // AI Assistant
    SM.register('ai-assist',     'Ctrl+Shift+A', function () {
      var panel = document.getElementById('ai-panel') || document.getElementById('ai-assistant-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });
    // Escape: close modals
    SM.register('escape-modal',  'Escape',       function () {
      var open = document.querySelector('.modal-open, [data-modal="open"]');
      if (open) { open.classList.remove('modal-open'); open.dataset.modal = 'closed'; }
      SM.setModalLevel(0);
    }, { priority: -10 });
    // Snippets
    SM.register('snippets',      'Ctrl+Shift+N', function () { window.SnippetManager && SnippetManager.toggle && SnippetManager.toggle(); });
    // Format
    SM.register('format',        'Shift+Alt+F',  function () { window.EditorManager && EditorManager.format && EditorManager.format(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(_registerIDEShortcuts, 800);
  });

  // Flag so duplicate keydown listeners know they are superseded
  window.__SHORTCUT_MANAGER_ACTIVE__ = true;

  window.ShortcutManager = svc;
  return svc;
}());

// ════════════════════════════════════════════��═══════════════���═════════
// MODULE 4 — SearchWorkerManager
// Fixes: throws "Worker not available" when CSP blocks blob workers.
// Strategy: try Blob Worker → silent fallback to main-thread execution.
// ══════════════════════════════════════════════════════════════════════
const SearchWorkerManager = (function () {
  var _worker = null;
  var _mainThread = false;
  var _pending = {};
  var _msgId = 0;

  var WORKER_SCRIPT = [
    'self.onmessage = function(e) {',
    '  var d = e.data, results = [];',
    '  try {',
    '    var q = new RegExp(d.query, d.flags || "gi");',
    '    (d.files || []).forEach(function(f) {',
    '      var lines = (f.content || "").split("\\n");',
    '      lines.forEach(function(line, idx) {',
    '        if (q.test(line)) results.push({ file:f.path, line:idx+1, text:line.trim() });',
    '      });',
    '    });',
    '  } catch(ex) { results = [{ error: ex.message }]; }',
    '  self.postMessage({ id: d.id, results: results });',
    '};'
  ].join('\n');

  function _initWorker() {
    try {
      var blob = new Blob([WORKER_SCRIPT], { type: 'text/javascript' });
      var url  = URL.createObjectURL(blob);
      _worker  = new Worker(url);
      _worker.onmessage = function (e) {
        var cb = _pending[e.data.id];
        if (cb) { delete _pending[e.data.id]; cb(null, e.data.results); }
      };
      _worker.onerror = function (err) {
        console.warn('[SearchWorkerMgr] Worker error, switching to main thread', err);
        _mainThread = true;
        _worker = null;
      };
    } catch (_csp) {
      console.warn('[SearchWorkerMgr] Blob Worker blocked → main-thread search mode');
      _mainThread = true;
    }
  }

  function _searchMainThread(payload, cb) {
    var results = [];
    try {
      var q = new RegExp(payload.query, payload.flags || 'gi');
      (payload.files || []).forEach(function (f) {
        var lines = (f.content || '').split('\n');
        lines.forEach(function (line, idx) {
          if (q.test(line)) results.push({ file: f.path, line: idx + 1, text: line.trim() });
        });
      });
    } catch (ex) { results = [{ error: ex.message }]; }
    setTimeout(function () { cb(null, results); }, 0);
  }

  function dispatch(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = ++_msgId;
      var merged = Object.assign({}, payload, { id: id, type: type });
      function cb(err, res) { err ? reject(err) : resolve(res); }
      if (!_mainThread && _worker) {
        _pending[id] = cb;
        _worker.postMessage(merged);
      } else {
        _searchMainThread(merged, cb);
      }
    });
  }

  _initWorker();

  var svc = { dispatch: dispatch };
  window.SearchWorkerManager = svc;
  return svc;
}());

// ════════�����════════════════════════════════════════════════════════════
// MODULE 5 — Runner (unified exec)
// Fixes: Runner.exec monkey-patched 4× → 4-deep call chain + 16ms race.
// Strategy: patch Runner.exec ONCE after DOM ready, with full logic:
//   1. _cleanupBlobs() — revoke ALL tracked blob URLs
//   2. _resetFrame()   — set src=about:blank, await load (releases closures)
//   3. build HTML
//   4. single authoritative write (srcdoc or blob URL for >500KB)
// ══════════════════════════════════════════════════════════════════════
window.__RUNNER_UNIFIED_PATCH__ = false;

function _installUnifiedRunner() {
  if (window.__RUNNER_UNIFIED_PATCH__) return;
  if (!window.Runner) return;
  window.__RUNNER_UNIFIED_PATCH__ = true;

  var _blobUrls = new Set();
  var _runToken = null;

  // Track any blob URLs Runner might create
  var _origCreateObjUrl = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    var url = _origCreateObjUrl(obj);
    if (typeof obj === 'object' && obj instanceof Blob) _blobUrls.add(url);
    return url;
  };

  function _cleanupBlobs() {
    _blobUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (_) {}
    });
    _blobUrls.clear();
  }

  function _resetFrame(frame) {
    return new Promise(function (resolve) {
      if (!frame) { resolve(); return; }
      frame.addEventListener('load', resolve, { once: true });
      frame.src = 'about:blank';
      // Safety timeout
      setTimeout(resolve, 400);
    });
  }

  // Wrap the original exec to add cleanup + frame reset
  var _origExec = Runner.exec.bind(Runner);

  Runner.exec = async function (filePath) {
    // 1. Cleanup any blobs from previous run
    _cleanupBlobs();

    // 2. Issue a unique run token (prevents stale postMessage)
    _runToken = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    Runner._previewToken = _runToken;

    // 3. Reset the preview frame to release old document/closures
    var frame = document.getElementById('preview-frame');
    if (frame && frame.contentDocument) {
      await _resetFrame(frame);
    }

    // 4. Delegate to the original execute logic
    try {
      return _origExec(filePath);
    } catch (err) {
      console.error('[Runner.exec unified]', err);
      if (window.ToastService) ToastService.show('Run error: ' + err.message, 'error');
    }
  };

  // Expose cleanup for external use
  Runner._cleanupBlobs = _cleanupBlobs;
  Runner.__unified__   = true;
  console.log('[Unified] Runner.exec patched — blob cleanup + frame reset active');
}

// Install after boot but retry until Runner exists
(function () {
  var attempts = 0;
  function tryInstall() {
    if (_installUnifiedRunner()) return;
    if (window.Runner) { _installUnifiedRunner(); return; }
    if (++attempts < 30) setTimeout(tryInstall, 500);
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(tryInstall, 1200); });
}());

// ══════════════════════════════════════════════════════════════════════
// MODULE 6 — FileSystem.save (unified)
// Fixes: FileSystem.save monkey-patched multiple times across versions.
// Strategy: wrap once with full pipeline:
//   dirty files → StorageManager.set → TabManager notify → auto-backup
// ═══════════════════════════════════════════════════════════════════��══
window.__FS_SAVE_UNIFIED__ = false;

function _installUnifiedFSSave() {
  if (window.__FS_SAVE_UNIFIED__) return;
  if (!window.FileSystem || !FileSystem.save) return;
  window.__FS_SAVE_UNIFIED__ = true;

  var _origSave = FileSystem.save.bind(FileSystem);
  var _backupTimer = null;

  FileSystem.save = async function () {
    try {
      // 1. Call original save (handles editor → FileSystem.files sync)
      var result = await _origSave.apply(this, arguments);

      // 2. Persist ALL dirty files to unified StorageManager
      var files = FileSystem.files || {};
      var dirty = FileSystem._dirty || Object.keys(files);
      var promises = dirty.map(function (path) {
        return StorageManager.set('file::' + path, files[path]);
      });
      await Promise.allSettled(promises);

      // 3. Clear dirty set
      if (FileSystem._dirty) FileSystem._dirty.clear ? FileSystem._dirty.clear() : (FileSystem._dirty = new Set());

      // 4. Notify TabManager
      if (window.TabManager && TabManager.onFileSaved) TabManager.onFileSaved();

      // 5. Schedule auto-backup (30 s debounce)
      clearTimeout(_backupTimer);
      _backupTimer = setTimeout(function () {
        StorageManager.set('__auto_backup__', {
          ts: Date.now(),
          files: Object.keys(files).length
        });
      }, 30000);

      return result;
    } catch (err) {
      console.error('[FileSystem.save unified]', err);
      ToastService.show('Save error: ' + err.message, 'error');
    }
  };

  FileSystem.save.__unified__ = true;
  console.log('[Unified] FileSystem.save patched — StorageManager pipeline active');
}

(function () {
  // FIX: Replace 30×500ms retry loop with defineProperty watcher on window.FileSystem
  function tryInstall() {
    if (window.FileSystem && FileSystem.save) { _installUnifiedFSSave(); return true; }
    return false;
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (tryInstall()) return;
    var _fsVal;
    try {
      Object.defineProperty(window, 'FileSystem', {
        get: function() { return _fsVal; },
        set: function(v) {
          _fsVal = v;
          try { Object.defineProperty(window, 'FileSystem', { value: v, writable: true, configurable: true }); } catch(_) {}
          tryInstall();
        },
        configurable: true, enumerable: true
      });
    } catch(e) { setTimeout(tryInstall, 1500); }
  });
}());

// ══════════════════════════════════════════════════════════════════════
// MODULE 7 — BootOrchestrator
// Fixes: setTimeout(vXXBoot, N) race conditions (v24→v30, staggered 1s–10s).
// Strategy:
//   Phase 1 (concurrent): wait for Monaco, Pyodide, Babel, StorageManager
//   Phase 2 (sequential): init modules in dependency order
//   Phase 3: load project, render UI, fire 'procode-ready' event
// ══════���═══════════════════════════════════════════════════════════════
const BootOrchestrator = (function () {
  var _phase = 'idle';
  var _log = function (msg) { console.log('%c[Boot]%c ' + msg, 'color:#6366f1;font-weight:700', ''); };

  // ── Dependency waiters ─────────────────────────────────────────────
  function _waitForMonaco() {
    if (window.__MONACO_READY__ || (window.monaco && window.monaco.editor)) return Promise.resolve();
    return new Promise(function (resolve) {
      window.addEventListener('monaco-ready', resolve, { once: true });
      // Timeout after 15s — Monaco is optional (editors still work without it in degraded mode)
      setTimeout(resolve, 15000);
    });
  }

  function _waitForBabel() {
    if (window.Babel) return Promise.resolve();
    return new Promise(function (resolve) {
      // FIX: defineProperty watcher instead of 100ms interval × 100 iterations
      var _v;
      try {
        Object.defineProperty(window, 'Babel', {
          get: function() { return _v; },
          set: function(v) {
            _v = v;
            try { Object.defineProperty(window, 'Babel', { value: v, writable: true, configurable: true }); } catch(_) {}
            resolve();
          },
          configurable: true, enumerable: true
        });
      } catch(e) { setTimeout(resolve, 5000); } // fallback
    });
  }

  function _waitForJSZip() {
    if (window.JSZip) return Promise.resolve();
    return new Promise(function (resolve) {
      // FIX: defineProperty watcher instead of polling
      var _v;
      try {
        Object.defineProperty(window, 'JSZip', {
          get: function() { return _v; },
          set: function(v) {
            _v = v;
            try { Object.defineProperty(window, 'JSZip', { value: v, writable: true, configurable: true }); } catch(_) {}
            resolve();
          },
          configurable: true, enumerable: true
        });
      } catch(e) { setTimeout(resolve, 5000); }
    });
  }

  function _waitForPyodide() {
    // Pyodide is large (optional) — wait max 30s, don't block IDE if absent
    return new Promise(function (resolve) {
      if (window.__pyodide_ready__) { resolve(); return; }
      // FIX: defineProperty watcher instead of 100ms × 300 iterations
      var _safety = setTimeout(resolve, 30000);
      var _v;
      try {
        Object.defineProperty(window, '__pyodide_ready__', {
          get: function() { return _v; },
          set: function(v) {
            _v = v;
            try { Object.defineProperty(window, '__pyodide_ready__', { value: v, writable: true, configurable: true }); } catch(_) {}
            clearTimeout(_safety);
            resolve();
          },
          configurable: true, enumerable: true
        });
      } catch(e) { clearTimeout(_safety); setTimeout(resolve, 30000); }
    });
  }

  // ── Sequential module initialisation (Phase 2) ────────────────────
  async function _initModulesSequential() {
    var modules = [
      ['FileSystem',      function () { return window.FileSystem && FileSystem.init && FileSystem.init(); }],
      ['TabManager',      function () { return window.TabManager && TabManager.init && TabManager.init(); }],
      ['EditorManager',   function () { return window.EditorManager && EditorManager.init && EditorManager.init(); }],
      ['Explorer',        function () { return window.Explorer && Explorer.init && Explorer.init(); }],
      ['Terminal',        function () { return window.Terminal && Terminal.init && Terminal.init(); }],
      ['Console',         function () { return window.Console && Console.init && Console.init(); }],
      ['LayoutManager',   function () { return window.LayoutManager && LayoutManager.init && LayoutManager.init(); }],
      ['AI',              function () {
        return (window.AIAssistant && AIAssistant.init && AIAssistant.init()) ||
               (window.AIPanel && AIPanel.init && AIPanel.init());
      }],
      ['CommandPalette',  function () { return window.CommandPalette && CommandPalette.init && CommandPalette.init(); }],
      ['ShortcutManager', function () { return; /* already running */ }]
    ];

    for (var i = 0; i < modules.length; i++) {
      var name = modules[i][0], fn = modules[i][1];
      try {
        await Promise.resolve(fn());
        _log(name + ' ✓');
      } catch (err) {
        _log(name + ' ✗ (' + err.message + ')');
      }
    }
  }

  // ── Phase 3: load project & signal ready ─────────────────────────
  async function _loadProjectAndSignal() {
    // Load saved project from unified storage
    try {
      if (window.FileSystem && FileSystem.loadFromStorage) {
        await FileSystem.loadFromStorage();
      }
    } catch (_) {}

    // Fire IDE ready event
    window.dispatchEvent(new CustomEvent('procode-ready', { detail: { ts: Date.now() } }));
    document.dispatchEvent(new CustomEvent('procode-ready'));
    _log('✦ ProCode IDE UNIFIED — READY');

    // Toast already shown by V33 boot — skip duplicate
    // ToastService.show('✦ ProCode IDE — Unified Architecture loaded', 'success', 3000);
  }

  async function boot() {
    if (_phase !== 'idle') {
      _log('Boot already in progress (' + _phase + ')');
      return;
    }
    _phase = 'phase1';
    _log('Phase 1 — concurrent dependency loading...');

    // Phase 1: concurrent, isolated failures
    await Promise.allSettled([
      _waitForMonaco(),
      _waitForBabel(),
      _waitForJSZip(),
      StorageManager.ready,
      _waitForPyodide()
    ]);

    _phase = 'phase2';
    _log('Phase 2 — sequential module initialisation...');
    await _initModulesSequential();

    _phase = 'phase3';
    _log('Phase 3 — load project & signal ready...');
    await _loadProjectAndSignal();

    _phase = 'complete';
  }

  // ─��� KILL SWITCH for legacy setTimeout boots ──��────────────���────────
  // Once BootOrchestrator runs, all vXXBoot functions become no-ops.
  window.__BOOT_ORCHESTRATOR_ACTIVE__ = false;
  function _installKillSwitches() {
    window.__BOOT_ORCHESTRATOR_ACTIVE__ = true;
    // Any vXX boot function that checks this flag will abort immediately
    ['v24Boot','v25Boot','v26Boot','v27Boot','v28Boot','v29Boot','v30Boot'].forEach(function (fn) {
      if (typeof window[fn] === 'function') {
        var orig = window[fn];
        window[fn] = function () {
          if (window.__BOOT_ORCHESTRATOR_ACTIVE__) {
            console.log('[BootOrchestrator] Suppressed duplicate boot: ' + fn);
            return;
          }
          return orig.apply(this, arguments);
        };
      }
    });
  }

  var svc = { boot: boot, phase: function () { return _phase; } };
  window.BootOrchestrator = svc;

  // FIX-6: Install kill-switches IMMEDIATELY when BootOrchestrator is defined.
  // Previously they were only installed on DOMContentLoaded, but the vXXBoot
  // functions register their setTimeouts *before* DOMContentLoaded fires, so
  // they would escape suppression and race against the orchestrator.
  _installKillSwitches(); // ← runs synchronously at parse time

  // ── Auto-start on DOMContentLoaded ───────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    _installKillSwitches(); // idempotent re-run catches any late-defined vXXBoot
    // Small delay to let v25 core classes define themselves, then orchestrate
    setTimeout(function () {
      boot().catch(function (err) {
        console.error('[BootOrchestrator] Fatal boot error:', err);
      });
    }, 200);
  });

  // If DOM is already ready (script injected late)
  if (document.readyState !== 'loading') {
    _installKillSwitches();
    setTimeout(function () {
      boot().catch(console.error);
    }, 200);
  }

  return svc;
}());

} // end __PROCODE_UNIFIED__ guard