/**
 * patches-v26-v27.js
 * V26/V27 UI patches, TimeMachine stub, LocalAI stub, HUDMetrics stub
 * ProCode IDE v3.0
 */

/* ════════════════��═══════���══════════════════════════════════════════
   🚀 PROCODE IDE v25.0 — FEATURE INJECTION
   Fixes: duplicate keydown, race conditions, z-index wars, iframe security
   New: Voice Coding, Local AI, Time Machine 3D, Multiplayer, HUD Metrics
═══════════════════════════════════════════════════════════════════ */

(function PCIDE_v25() {
'use strict';

// ───��──────────────────────────────────────────────────────────────
// 🔧 FIX #1: UNIFIED KEYBOARD SHORTCUT MANAGER
// Removes duplicate window.addEventListener('keydown') handlers
// and replaces with a single unified dispatcher
// ────────────────────────────────────────────────────────────��───��─

// ──────────────────────────────────────────────────────────────────
// 🔧 FIX #2: UNIFIED WINDOW/Z-INDEX MANAGER
// ──────────────────────────────────────────────────────────────────
const WM = {
  _base: 9000,
  _stack: [],

  push(el, type='panel') {
    if (!el) return;
    const z = this._base + this._stack.length + 1;
    el.style.zIndex = z;
    this._stack.push({ el, type, z });
    return z;
  },

  pop(el) {
    const idx = this._stack.findIndex(s => s.el === el);
    if (idx !== -1) this._stack.splice(idx, 1);
    el.style.zIndex = '';
  },

  bringToFront(el) {
    this.pop(el);
    return this.push(el, 'modal');
  }
};

// Patch modal shows to use WM
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Normalize z-indices for known elements
    const els = [
      ['#ai-float', 'panel'],
      ['#command-palette', 'modal'],
      ['#settings-modal', 'modal'],
      ['#templates-modal', 'modal'],
      ['#timemachine-panel', 'panel'],
      ['#multiplayer-bar', 'hud'],
      ['#local-ai-panel', 'panel'],
      ['#voice-orb', 'hud'],
      ['#hud-metrics', 'hud'],
    ];
    els.forEach(([sel, type]) => {
      const el = document.querySelector(sel);
      if (el) WM.push(el, type);
    });
  }, 2000);
});

// ──────────────────────────────────────────────────────────────────
// 🔧 FIX #3: SAFE IFRAME RUNNER (Blob URL instead of string concat)
// ──────────────────────────────────────────────────────────────────
if (window.Runner && Runner.createHtmlWrapper) {
  const _origWrap = Runner.createHtmlWrapper.bind(Runner);
  Runner.createHtmlWrapper = function(code, lang, files) {
    try {
      // Use Blob URL to safely inject user code, avoiding <\/script> parsing issues
      if (lang === 'html' || lang === 'htm') {
        const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
        return URL.createObjectURL(blob);
      }
    } catch(e) {}
    return _origWrap(code, lang, files);
  };

  const _origExec = Runner.exec.bind(Runner);
  if (!window.__RUNNER_UNIFIED_PATCH__) {
    Runner.exec = function() {
      try { return _origExec(); } catch(e) { console.error('[Runner]', e); }
    };
  }
}

// ───────────────────────────────────────────────────────────────��──
// 🎤 FEATURE: VOICE CODING
// Web Speech API → AI interpretation → code insertion
// ──────────────────────────────────────────────────────────────────
const VoiceCoding = {
  _recognition: null,
  _active: false,

  init() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this._available = false;
      const orb = document.getElementById('voice-orb');
      if (orb) { orb.title = 'Voice not supported in this browser'; orb.style.opacity='0.4'; }
      return;
    }
    this._available = true;
    this._recognition = new SpeechRec();
    this._recognition.continuous = false;
    this._recognition.interimResults = true;
    this._recognition.lang = 'vi-VN'; // default Vietnamese, auto-detects others

    this._recognition.onstart = () => {
      this._active = true;
      const orb = document.getElementById('voice-orb');
      const tr = document.getElementById('voice-transcript');
      if (orb) orb.classList.add('listening');
      if (tr) tr.classList.add('active');
      document.getElementById('voice-icon')?.classList?.replace?.('fa-microphone', 'fa-circle') ||
      (document.getElementById('voice-icon') && (document.getElementById('voice-icon').className = 'fas fa-circle'));
    };

    this._recognition.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const vt = document.getElementById('voice-text');
      if (vt) vt.textContent = (final || interim) || 'Listening...';
      if (final) this._processCommand(final.trim());
    };

    this._recognition.onerror = (e) => {
      this.stop();
      if (window.Utils) Utils.toast(`Voice error: ${e.error}`, 'error');
    };

    this._recognition.onend = () => { this.stop(); };
  },

  toggle() {
    if (!this._available) { if (window.Utils) Utils.toast('Voice not supported', 'warn'); return; }
    if (this._active) this.stop();
    else this.start();
  },

  start() {
    if (!this._recognition) this.init();
    if (!this._available) return;
    try { this._recognition.start(); }
    catch(e) { console.warn('[Voice]', e); }
  },

  stop() {
    this._active = false;
    const orb = document.getElementById('voice-orb');
    const tr = document.getElementById('voice-transcript');
    if (orb) orb.classList.remove('listening');
    if (tr) tr.classList.remove('active');
      document.getElementById('voice-icon')?.classList?.replace?.('fa-circle', 'fa-microphone') ||
      (document.getElementById('voice-icon') && (document.getElementById('voice-icon').className = 'fas fa-microphone'));
    try { if (this._recognition) this._recognition.stop(); } catch(e) {}
  },

  async _processCommand(text) {
    if (!text) return;
    if (window.Utils) Utils.toast(`🎤 "${text}"`, 'info');

    // Try to send to AI assistant if available
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
      aiInput.value = text;
      try {
        if (window.AI) {
          // Make AI panel visible
          const af = document.getElementById('ai-float');
          if (af) af.classList.remove('hidden');
          await AI.send();
        }
      } catch(e) { console.warn('[Voice→AI]', e); }
    }
  }
};

// ──────────────────────────────────────────────────────────────────
// 🧠 FEATURE: LOCAL AI ENGINE (WebGPU/WebLLM scaffolding)
// ──────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────
// ⏳ FEATURE: TIME MACHINE 3D GIT HISTORY
// ──────────────────────────────────────���───────────────────────────

// ──────────────────────────────────────────────────────────────────
// 👥 MULTIPLAYER — REMOVED
// The previous Multiplayer module was a UI-only prototype with no real
// WebRTC / signaling-server backend. It has been removed to avoid misleading
// users. A no-op stub is kept so any leftover Multiplayer.* calls do not
// throw ReferenceError.
// ──────────────────────────────────────────────────────────────────
const Multiplayer = { toggle(){}, close(){}, invite(){}, _initSelf(){}, _addPeer(){} }; // no-op stub

// ──────────────────────────────────────────────────────────────────
// 📊 FEATURE: HUD METRICS (uptime, FPS, memory)
// ──────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────
// 🎨 FEATURE: TYPING RIPPLE EFFECT
// Visual code wave animation when typing in editor
// ──────────────────────���───────────���───────────────────────────────
const TypingRipple = {
  _last: 0,
  init() {
    // Hook into Monaco editor if available
    const tryHook = () => {
      if (window.EditorManager && window.EditorManager._editors) {
        Object.values(window.EditorManager._editors).forEach(editor => {
          if (editor && editor.onDidType) {
            editor.onDidType(() => this._spawn());
          }
        });
      }
    };
    setTimeout(tryHook, 3000);
  },

  _spawn() {
    const now = Date.now();
    if (now - this._last < 150) return; // throttle
    this._last = now;

    // Find cursor position
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;
    const rect = cursor.getBoundingClientRect();

    const el = document.createElement('div');
    el.className = 'typing-ripple';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 🚀 PROCODE IDE — ULTIMATE UPGRADE PATCH v26 "GODMODE ENTERPRISE"
// Performance + Security + Bug Fixes + New Features
// ══════════════════════════════════════════════════════════════════════════════
(function PCIDE_v26() {
'use strict';

// ─────────────────────────────────────────���───────────
// §1  SECURE STORAGE — AES-GCM encrypted API key storage
//     Replaces plain localStorage for sensitive data
// ─────────────────────────────────────────────────────
const SecureStorage = (() => {
  const DB_NAME = 'procode_secure_v1';
  const STORE   = 'vault';
  const SALT_KEY = 'procode_vault_salt';

  let _db = null;

  async function openDB() {
    if (_db) return _db;
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function idbGet(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function idbSet(key, val) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(val, key);
      req.onsuccess = res;
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function idbDel(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(key);
      req.onsuccess = res;
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function getOrCreateSalt() {
    const existing = await idbGet(SALT_KEY);
    if (existing) return existing;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await idbSet(SALT_KEY, salt);
    return salt;
  }

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // FIX-4: Replace public-info device fingerprint with a persisted random token.
  // The old approach used navigator.userAgent, screen dimensions etc. — all values
  // that any JS on the page can reconstruct, making the "encryption" trivially
  // bypassable. A random 256-bit token stored in localStorage is a real secret
  // (within the same origin) and survives across browser sessions.
  function getDeviceToken() {
    const TOKEN_KEY = 'procode_device_token_v2';
    try {
      let tok = localStorage.getItem(TOKEN_KEY);
      if (!tok || tok.length < 32) {
        // Generate a new 256-bit random token (64 hex chars)
        tok = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          b => b.toString(16).padStart(2, '0')
        ).join('');
        localStorage.setItem(TOKEN_KEY, tok);
      }
      return tok;
    } catch(e) {
      // SessionStorage fallback if localStorage is blocked
      try {
        let tok = sessionStorage.getItem(TOKEN_KEY);
        if (!tok) {
          tok = Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            b => b.toString(16).padStart(2, '0')
          ).join('');
          sessionStorage.setItem(TOKEN_KEY, tok);
        }
        return tok;
      } catch(_) {
        // Last resort: ephemeral random (key lost on page close — still better than fingerprint)
        return Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          b => b.toString(16).padStart(2, '0')
        ).join('');
      }
    }
  }

  async function encrypt(plaintext) {
    const salt = await getOrCreateSalt();
    const key  = await deriveKey(getDeviceToken(), salt);
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const enc  = new TextEncoder();
    const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) };
  }

  async function decrypt(payload) {
    const salt  = await getOrCreateSalt();
    const key   = await deriveKey(getDeviceToken(), salt);
    const iv    = new Uint8Array(payload.iv);
    const ct    = new Uint8Array(payload.ct);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plain);
  }

  return {
    async set(key, value) {
      try {
        const payload = await encrypt(value);
        await idbSet('sec_' + key, payload);
        // Also remove from plain localStorage if exists (migration)
        try { localStorage.removeItem(key); } catch(_) {}
      } catch(e) {
        console.warn('[SecureStorage] encrypt failed, using localStorage fallback:', e);
        try { localStorage.setItem(key, value); } catch(_) {}
      }
    },
    async get(key) {
      try {
        const payload = await idbGet('sec_' + key);
        if (payload) return await decrypt(payload);
        // Migration: check plain localStorage
        return localStorage.getItem(key);
      } catch(e) {
        console.warn('[SecureStorage] decrypt failed:', e);
        return localStorage.getItem(key);
      }
    },
    async remove(key) {
      try { await idbDel('sec_' + key); } catch(_) {}
      try { localStorage.removeItem(key); } catch(_) {}
    }
  };
})();

window.SecureStorage = SecureStorage;

// Migrate existing plain-text API key → encrypted vault on startup
(async () => {
  try {
    const plainKey = localStorage.getItem('procode_anthropic_key');
    if (plainKey) {
      await SecureStorage.set('procode_anthropic_key', plainKey);
      localStorage.removeItem('procode_anthropic_key');
      if (window.__PROCODE_DEBUG__) console.info('🔐 API key migrated to encrypted vault');
    }
  } catch(_) {}
})();

// ────────���────────────────────────────────────────────
// §2  OPFS — Origin Private File System for fast I/O
//     Used as a high-speed cache layer on top of IndexedDB
// ────────────────��────────────────────────────────────
const OPFSCache = (() => {
  let _root = null;
  let _supported = false;

  async function getRoot() {
    if (_root) return _root;
    if (!navigator.storage?.getDirectory) return null;
    try {
      _root = await navigator.storage.getDirectory();
      _supported = true;
      return _root;
    } catch(e) {
      console.warn('[OPFS] Not available:', e);
      return null;
    }
  }

  return {
    get supported() { return _supported; },

    async write(path, content) {
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
        await writable.write(content);
        await writable.close();
        return true;
      } catch(e) {
        console.warn('[OPFS] write failed:', e);
        return false;
      }
    },

    async read(path) {
      const root = await getRoot();
      if (!root) return null;
      try {
        const parts = path.replace(/^\//, '').split('/');
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i]);
        }
        const fh   = await dir.getFileHandle(parts[parts.length - 1]);
        const file = await fh.getFile();
        return file.text();
      } catch(e) {
        return null;
      }
    },

    async delete(path) {
      const root = await getRoot();
      if (!root) return;
      try {
        const parts = path.replace(/^\//, '').split('/');
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i]);
        }
        await dir.removeEntry(parts[parts.length - 1]);
      } catch(_) {}
    },

    async init() {
      const root = await getRoot();
      if (root) console.log('✅ OPFS initialized — ultra-fast file I/O active');
      else console.log('ℹ️  OPFS unavailable, using IndexedDB');
    }
  };
})();

window.OPFSCache = OPFSCache;
OPFSCache.init();

// ─────────────────────────────────────────────────────
// §3  SHORTCUT MANAGER — single authoritative key handler
//     Prevents duplicate Ctrl+P/Ctrl+Shift+P firings and
//     provides context-aware routing
// ─────────────────────────────────────────────────────
const ShortcutManager = (() => {
  const _registry = new Map(); // key → [{handler, context, id}]
  let   _context  = 'global';

  function makeKey(e) {
    return [
      e.ctrlKey || e.metaKey  ? 'C' : '',
      e.shiftKey               ? 'S' : '',
      e.altKey                 ? 'A' : '',
      e.key.length === 1       ? e.key.toUpperCase() : e.key
    ].filter(Boolean).join('+');
  }

  document.addEventListener('keydown', (e) => {
    // Skip if focused inside an input UNLESS shortcut explicitly handles it
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Escape') return;
    }

    const key      = makeKey(e);
    const handlers = _registry.get(key);
    if (!handlers || handlers.length === 0) return;

    for (const { handler, context } of handlers) {
      if (context === 'global' || context === _context) {
        e.preventDefault();
        e.stopImmediatePropagation();
        try { handler(e); } catch(err) { console.warn('[ShortcutManager]', key, err); }
        break; // first match wins — no double firing
      }
    }
  }, true); // capture phase = highest priority

  return {
    setContext(ctx) { _context = ctx; },
    getContext()    { return _context; },

    register(keyCombo, handler, context = 'global', id = null) {
      const key = keyCombo.toUpperCase().replace(/\s/g, '');
      if (!_registry.has(key)) _registry.set(key, []);
      // Avoid duplicate IDs
      const list = _registry.get(key);
      if (id) {
        const idx = list.findIndex(e => e.id === id);
        if (idx >= 0) { list[idx] = { handler, context, id }; return; }
      }
      // FIX-SHORTCUT-2: Warn on shortcut conflicts so they're visible during development.
      // Previously silent overwrites caused user-facing bugs (e.g. Ctrl+Z deleted files
      // instead of undoing text edits). Now logs a warning with both contexts.
      if (list.length > 0 && window.__PROCODE_DEBUG__) {
        const existing = list[0];
        console.warn(
          `[ShortcutManager] Conflict: "${key}" already registered by context="${existing.context || '?'}", ` +
          `being overridden by context="${context}". ` +
          `Only the newest registration will fire.`
        );
      }
      list.unshift({ handler, context, id }); // prepend → last-registered wins
    },

    unregister(keyCombo, id) {
      const key  = keyCombo.toUpperCase().replace(/\s/g, '');
      const list = _registry.get(key);
      if (!list) return;
      const idx  = list.findIndex(e => e.id === id);
      if (idx >= 0) list.splice(idx, 1);
    },

    listAll() {
      const out = {};
      _registry.forEach((v, k) => { out[k] = v.map(e => e.id || '?'); });
      return out;
    }
  };
})();

window.ShortcutManager = ShortcutManager;

// Register all standard shortcuts through ShortcutManager (deduped, single source)
ShortcutManager.register('C+P',       () => { try { CommandPalette.show('files');    } catch(_){} });
ShortcutManager.register('C+S+P',     () => { try { CommandPalette.show('commands'); } catch(_){} });
ShortcutManager.register('C+N',       () => { try { FileSystem.createFilePrompt();   } catch(_){} });
ShortcutManager.register('C+S',       () => { try { FileSystem.save(true);           } catch(_){} });
ShortcutManager.register('C+S+S',     () => { try { FileSystem.exportZip();          } catch(_){} });
ShortcutManager.register('C+Z',       () => { try { EditorManager.undo();            } catch(_){} }); // FIX-SHORTCUT: was FileSystem.undo — text undo is more expected behavior for Ctrl+Z
ShortcutManager.register('C+S+Z',     () => { try { FileSystem.redo();               } catch(_){} });
ShortcutManager.register('C+F',       () => { try { EditorManager.findText('');      } catch(_){} });
ShortcutManager.register('C+H',       () => { try { Search.replace();                } catch(_){} });
ShortcutManager.register('C+S+B',     () => { try { LayoutManager.toggleLayout('preview'); } catch(_){} }); // FIX-SHORTCUT: moved to ctrl+shift+b to free ctrl+b for sidebar
ShortcutManager.register('C+`',       () => { try { LayoutManager.toggleLayout('terminal'); } catch(_){} });
ShortcutManager.register('C+\\',      () => { try { LayoutManager.splitEditor();     } catch(_){} });
ShortcutManager.register('C+=',       () => { try { EditorManager.zoomIn();          } catch(_){} });
ShortcutManager.register('C+-',       () => { try { EditorManager.zoomOut();         } catch(_){} });
ShortcutManager.register('C+0',       () => { try { EditorManager.resetZoom();       } catch(_){} });
ShortcutManager.register('C+J',       () => { try { Panel.toggle();                  } catch(_){} });
ShortcutManager.register('C+S+A',     () => { try { AI.toggle();                     } catch(_){} });
ShortcutManager.register('C+S+I',     () => { try { Inspector.toggle();              } catch(_){} });
ShortcutManager.register('C+S+F',     () => { try { EditorManager.formatDocument();  } catch(_){} }, 'global', 'format');
ShortcutManager.register('F1',        () => { try { ShortcutsModal.show();            } catch(_){} });
ShortcutManager.register('F5',        () => { try { Runner.exec();                   } catch(_){} });
ShortcutManager.register('F9',        () => { try { Debugger.toggle();               } catch(_){} });
ShortcutManager.register('S+F5',      () => { try { Runner.reload();                 } catch(_){} });
ShortcutManager.register('Escape',    () => {
  try {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    CommandPalette.hide();
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    if (AI.isVisible) AI.toggle();
  } catch(_) {}
});
ShortcutManager.register('C+A+O',     () => { try { WorkspaceIO.openDirectory({ replace: true }); } catch(_){} });
ShortcutManager.register('C+A+S',     () => { try { WorkspaceIO.syncToDisk({ onlyDirty: false }); } catch(_){} });
ShortcutManager.register('C+A+R',     () => { try { WorkspaceIO.pullFromDisk(); } catch(_){} });
ShortcutManager.register('C+A+W',     () => { try { FileSystem.resetWorkspace(); } catch(_){} }, 'global', 'reset-workspace');

// ── Shortcuts consolidated from removed raw listeners ─────────────────────────
// Previously scattered across KeybindingsManager, KeyManager, setupKeyboardShortcuts,
// and 8+ raw addEventListener calls. Now single source of truth.
ShortcutManager.register('C+B',   () => { try { LayoutManager.toggleSide(); } catch(_){} }, 'global', 'toggle-sidebar');
ShortcutManager.register('C+/',   () => { try { EditorManager.toggleComment(); } catch(_){} }, 'global', 'toggle-comment');
ShortcutManager.register('C+K',   () => { try { AI.toggle(); } catch(_){} }, 'global', 'ai-quick');
ShortcutManager.register('C+G',   () => { try { const ln = prompt('Go to line:','1'); if(ln) EditorManager.goToLine(parseInt(ln)); } catch(_){} }, 'global', 'goto-line');
ShortcutManager.register('F11',   () => { try { ZenMode.toggle(); } catch(_){} }, 'global', 'zen-mode');
ShortcutManager.register('C+S+M', () => { try { MarkdownPreview.toggle(); } catch(_){} }, 'global', 'markdown-preview');
ShortcutManager.register('C+S+E', () => { try { if(window.AI){ AI.explainSelection?.(); if(!AI.isVisible) AI.toggle(); }} catch(_){} }, 'global', 'ai-explain');
ShortcutManager.register('C+S+X', () => { try { if(window.AI){ AI.fixBugs?.();        if(!AI.isVisible) AI.toggle(); }} catch(_){} }, 'global', 'ai-fixbugs');
ShortcutManager.register('?',     () => { try { ShortcutsModal.show(); } catch(_){} }, 'global', 'shortcuts-help');
ShortcutManager.register('A+F',   () => { try { toggleFocusMode(); } catch(_){} }, 'global', 'focus-mode');
ShortcutManager.register('A+N',   () => { try { window.V22Notes?.toggle(); } catch(_){} }, 'global', 'v22-notes');
// ──────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// §4  PERFORMANCE OBSERVER — tracks Long Tasks & LCP
// ──────────────────────────────────��──────────────────
(function setupPerfObserver() {
  if (!window.PerformanceObserver) return;
  try {
    // Long Tasks observer — tasks >50ms block the main thread
    // Threshold raised to 300ms for startup: many patches init on load (normal)
    let _longTaskCount = 0;
    const _startupGrace = Date.now() + 10000; // 10s startup grace period
    const ltObs = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const threshold = Date.now() < _startupGrace ? 600 : 150;
        if (entry.duration > threshold) {
          _longTaskCount++;
          if (_longTaskCount <= 5 || _longTaskCount % 10 === 0) {
            if(window.__PROCODE_DEBUG__) console.warn(`⚠️ Long Task detected: ${entry.duration.toFixed(0)}ms`);
          }
        }
      });
    });
    ltObs.observe({ entryTypes: ['longtask'] });
  } catch(_) {}

  try {
    // LCP observer
    const lcpObs = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      console.log(`📊 LCP: ${lcp.startTime.toFixed(0)}ms`);
    });
    lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch(_) {}
})();

// ────────────────────────────────────────────���────────
// §5  requestIdleCallback SCHEDULER — non-blocking bg tasks
// ─────────────────────────────────────────────────────
const IdleScheduler = (() => {
  const _queue  = [];
  let   _running = false;

  const rIC = window.requestIdleCallback ||
    ((fn, opts) => {
      const start = Date.now();
      return setTimeout(() => fn({
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        didTimeout: false
      }), opts?.timeout ?? 1);
    });
  const cIC = window.cancelIdleCallback  || clearTimeout;

  function drain(deadline) {
    _running = true;
    while (_queue.length > 0) {
      const hasTime = deadline.timeRemaining() > 1 || deadline.didTimeout;
      if (!hasTime) break;
      const task = _queue.shift();
      try { task(); } catch(e) { console.warn('[IdleScheduler]', e); }
    }
    _running = false;
    if (_queue.length > 0) rIC(drain, { timeout: 2000 });
  }

  return {
    schedule(fn, priority = 'low') {
      if (priority === 'high') {
        _queue.unshift(fn);
      } else {
        _queue.push(fn);
      }
      if (!_running) rIC(drain, { timeout: priority === 'high' ? 500 : 2000 });
    }
  };
})();

window.IdleScheduler = IdleScheduler;

// ─────────────────────────────────────────────────────
// §6  MONACO LIFECYCLE MANAGER — proper dispose on close
// ─────────────────────────────────────────────────────
(function patchEditorManagerLifecycle() {
  const patchWhenReady = () => {
    if (!window.EditorManager) return;
    if (EditorManager.__v26_lifecycle__) return;
    EditorManager.__v26_lifecycle__ = true;

    // Intercept disposeEditor to be more thorough
    const origDispose = EditorManager.disposeEditor?.bind(EditorManager);
    if (origDispose) {
      EditorManager.disposeEditor = function(editorId) {
        try {
          const editor = this.instances?.[editorId] || this._editors?.[editorId];
          if (editor) {
            // Dispose all models attached to this editor
            try {
              const model = editor.getModel?.();
              if (model && !model.isDisposed?.()) {
                model.dispose();
              }
            } catch(_) {}
            // Dispose the editor itself
            try {
              if (typeof editor.dispose === 'function' && !editor._isDisposed) {
                editor.dispose();
              }
            } catch(_) {}
          }
        } catch(e) {
          console.warn('[v26] disposeEditor error:', e);
        }
        // Call original
        try { origDispose(editorId); } catch(_) {}
      };
    }

    // Purge orphaned Monaco models periodically (via idle scheduler)
    IdleScheduler.schedule(() => {
      try {
        if (!window.monaco) return;
        const allModels  = monaco.editor.getModels();
        const usedUris   = new Set();
        // Collect URIs of all open files
        if (IDE?.state?.tabs) {
          IDE.state.tabs.forEach(t => {
            if (t.path) usedUris.add('file:///' + t.path.replace(/^\//, ''));
          });
        }
        if (IDE?.state?.openFile) {
          usedUris.add('file:///' + IDE.state.openFile.replace(/^\//, ''));
        }
        let disposed = 0;
        allModels.forEach(model => {
          if (!model.isDisposed?.() && !usedUris.has(model.uri?.toString())) {
            try { model.dispose(); disposed++; } catch(_) {}
          }
        });
        if (disposed > 0) console.log(`♻️ Purged ${disposed} orphaned Monaco models`);
      } catch(_) {}
    });

    console.log('✅ Monaco lifecycle manager active');
  };

  // FIX: Replace polling with event-driven bootstrap.
  // 'monaco-ready' CustomEvent is dispatched by §13 dispatcher (already present in this file).
  // Falls back to a single short-lived interval only when the event fires before listener attached.
  patchWhenReady();
  if (!window.EditorManager?.__v26_lifecycle__) {
    const onReady = () => { patchWhenReady(); };
    window.addEventListener('monaco-ready', onReady, { once: true });
    // Safety timeout: if monaco-ready never fires after 15s, clean up and warn
    const safetyTimer = setTimeout(() => {
      window.removeEventListener('monaco-ready', onReady);
      if (!window.EditorManager?.__v26_lifecycle__) {
        console.warn('[v26] EditorManager lifecycle patch timed out after 15s — EditorManager not found.');
      }
    }, 15000);
    // If monaco-ready fires before this listener was attached (e.g. late script insertion),
    // the event might already have been dispatched — poll once quickly then bail.
    if (window.__MONACO_READY_FIRED__) {
      clearTimeout(safetyTimer);
      window.removeEventListener('monaco-ready', onReady);
      patchWhenReady();
    }
  }
})();

// ───��─────────────────────────────────────────────────
// §7  ENCRYPTED API KEY — patch Settings save/load to use SecureStorage
// ─────────────────────────────────────────────────────
(async function patchApiKeySecurity() {
  // Load key from encrypted vault on startup
  try {
    if (typeof SecureStorage === 'undefined') return;
    const key = await SecureStorage.get('procode_anthropic_key');
    if (key) {
      if (window.AnthropicAI) AnthropicAI.apiKey = key;
      if (window.IDE?.state?.settings?.ai) IDE.state.settings.ai.apiKey = key;
    }
  } catch(_) {}

  // Patch Settings.save to use encrypted storage
  const patchSettings = () => {
    if (!window.Settings || Settings.__v26_secure__) return;
    Settings.__v26_secure__ = true;

    const origSave = Settings.save?.bind(Settings);
    Settings.save = async function() {
      const keyInput = document.getElementById('ai-apikey-input');
      if (keyInput) {
        const val = keyInput.value.trim();
        if (val) {
          await SecureStorage.set('procode_anthropic_key', val);
          if (window.AnthropicAI) AnthropicAI.apiKey = val;
        } else {
          await SecureStorage.remove('procode_anthropic_key');
          if (window.AnthropicAI) AnthropicAI.apiKey = null;
        }
      }
      // Save everything else
      try { return origSave ? origSave() : undefined; } catch(_) {}
    };
    if (window.__PROCODE_DEBUG__) console.info('🔐 Settings.save patched → AES-GCM encrypted API key storage');
  };

  patchSettings();
  if (!window.Settings) {
    // FIX: Use defineProperty setter to be notified the instant Settings is assigned,
    // instead of polling every 800ms for up to 12s.
    let _settingsValue;
    try {
      Object.defineProperty(window, 'Settings', {
        get: function() { return _settingsValue; },
        set: function(v) {
          _settingsValue = v;
          // Restore normal property so future assignments work
          try { Object.defineProperty(window, 'Settings', { value: v, writable: true, configurable: true }); } catch(_) {}
          patchSettings();
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // defineProperty failed (e.g. Settings already exists) — try once more immediately
      patchSettings();
    }
  }
})();

// ─────────────────────────────────────────────────────
// §8  VIRTUAL SCROLL IMPROVEMENT — IntersectionObserver
//     Makes file tree & search results buttery smooth
// ──���───���──────────────────────────────────────────────
const VirtualScroll = (() => {
  const _instances = new Map();

  return {
    // FIX: Added optional `getItemHeight(item, index)` for variable-height items.
    // If omitted, falls back to fixed `itemHeight` (backward compatible).
    attach(containerEl, items, renderItem, itemHeight = 24, getItemHeight = null) {
      if (!containerEl || !items?.length) return;

      const id = containerEl.id || Math.random().toString(36).slice(2);
      if (_instances.has(id)) {
        _instances.get(id).observer?.disconnect();
        _instances.delete(id);
      }

      const BUFFER = 5;

      // Pre-compute cumulative offsets for variable-height support
      let _offsets = null; // array of [top, bottom] per item
      function buildOffsets(list) {
        if (!getItemHeight) return null; // fixed-height mode
        const offs = new Array(list.length + 1);
        offs[0] = 0;
        for (let i = 0; i < list.length; i++) {
          offs[i + 1] = offs[i] + (getItemHeight(list[i], i) || itemHeight);
        }
        return offs;
      }

      function getTop(index) {
        return _offsets ? _offsets[index] : index * itemHeight;
      }
      function getHeight(index) {
        return _offsets
          ? (_offsets[index + 1] - _offsets[index])
          : itemHeight;
      }
      function totalHeight(list) {
        return _offsets ? _offsets[list.length] : list.length * itemHeight;
      }

      // Binary search for first visible item (variable-height mode)
      function findStartIndex(scrollTop, list) {
        if (!_offsets) return Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER);
        let lo = 0, hi = list.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (_offsets[mid + 1] < scrollTop) lo = mid + 1;
          else hi = mid;
        }
        return Math.max(0, lo - BUFFER);
      }

      _offsets = buildOffsets(items);

      const totalH = totalHeight(items);
      const spacer = document.createElement('div');
      spacer.style.height = totalH + 'px';
      spacer.style.position = 'relative';

      const viewport = containerEl;
      const rendered = new Map(); // index → element

      function getVisibleRange() {
        const scrollTop = viewport.scrollTop;
        const viewH = viewport.clientHeight;
        const start = findStartIndex(scrollTop, items);
        let end = start;
        while (end < items.length - 1 && getTop(end) < scrollTop + viewH + BUFFER * itemHeight) {
          end++;
        }
        end = Math.min(items.length - 1, end + BUFFER);
        return { start, end };
      }

      function renderVisible() {
        const { start, end } = getVisibleRange();

        rendered.forEach((el, idx) => {
          if (idx < start || idx > end) {
            el.remove();
            rendered.delete(idx);
          }
        });

        for (let i = start; i <= end; i++) {
          if (!rendered.has(i)) {
            const el = renderItem(items[i], i);
            if (el) {
              el.style.position = 'absolute';
              el.style.top = getTop(i) + 'px';
              el.style.width = '100%';
              spacer.appendChild(el);
              rendered.set(i, el);
            }
          }
        }
      }

      viewport.innerHTML = '';
      viewport.style.position = 'relative';
      viewport.style.overflowY = 'auto';
      viewport.appendChild(spacer);

      let _raf = null;
      const onScroll = () => {
        if (_raf) cancelAnimationFrame(_raf);
        _raf = requestAnimationFrame(renderVisible);
      };

      viewport.addEventListener('scroll', onScroll, { passive: true });
      renderVisible();

      _instances.set(id, {
        refresh(newItems) {
          items = newItems;
          _offsets = buildOffsets(newItems);
          spacer.style.height = totalHeight(newItems) + 'px';
          rendered.clear();
          renderVisible();
        },
        observer: null
      });

      return _instances.get(id);
    }
  };
})();

window.VirtualScroll = VirtualScroll;

// ─────────────────────────────────────────────────────
// §9  SERVICE WORKER — offline caching for Monaco CDN
// ─────────────────────────────────────────────────────
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const SW_SCRIPT = `
const CACHE = 'procode-v26';
// FIX: version aligned with loader.js loaded in the page (was 0.47.0 — cache miss every time)
const STATIC = [
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('monaco-editor') || e.request.url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }))
    );
  }
});
`;

  // FIX: Attempt blob-URL Service Worker registration.
  // CSP has worker-src blob: — blob: SWs work when the page is served over http(s).
  // Falls back gracefully if not supported (e.g. file:// protocol).
  try {
    const blob = new Blob([SW_SCRIPT], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl, { scope: './' })
      .then(reg => {
        URL.revokeObjectURL(swUrl);
        if (window.__PROCODE_DEBUG__) console.info('[SW] Registered successfully:', reg.scope);
      })
      .catch(err => {
        URL.revokeObjectURL(swUrl);
        if (window.__PROCODE_DEBUG__) console.warn('[SW] Registration failed (blob SW not supported in this context):', err.message);
      });
  } catch (e) {
    if (window.__PROCODE_DEBUG__) console.warn('[SW] Blob SW unavailable:', e.message);
  }
})();

// ───────────────────────────────────���─────────────────
// §10  RESIZE OBSERVER — replace manual mousemove on panels
//      Ensures editor adapts when panels are resized
// ─────────────────────────────────────────────────────
(function setupResizeObserver() {
  if (!window.ResizeObserver) return;

  const targets = [
    { selector: '#editor-root',   action: () => { try { EditorManager.layout?.(); } catch(_){} } },
    { selector: '#editor-root-2', action: () => { try { EditorManager.layout?.(); } catch(_){} } },
    { selector: '#panel-btm',     action: () => { try { TerminalManager.fit?.(); TerminalManager.fitAll?.(); } catch(_){} } },
  ];

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  targets.forEach(({ selector, action }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const obs = new ResizeObserver(debounce(action, 80));
    obs.observe(el);
  });

  // Also observe body to trigger Monaco relayout on window resize
  const bodyObs = new ResizeObserver(debounce(() => {
    try { EditorManager.layout?.(); } catch(_) {}
  }, 100));
  bodyObs.observe(document.body);

  console.log('✅ ResizeObserver active — editor auto-relayout on panel resize');
})();

// ─────────────────────────────────────────────────────
// §11  AUTO-SAVE via Page Visibility + beforeunload
//      Guarantees no data loss without hammering storage
// ─────────────────────────────────────────────────────
(function setupSmartAutoSave() {
  let _dirtyFlag = false;
  let _saveTimer = null;
  const DEBOUNCE = 3000; // 3s after last edit

  function scheduleSave() {
    _dirtyFlag = true;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      if (_dirtyFlag) {
        try { FileSystem.save(false); } catch(_) {}
        _dirtyFlag = false;
      }
    }, DEBOUNCE);
  }

  // Mark dirty on any filechange event
  window.addEventListener('filechange', () => scheduleSave());

  // Force save when tab loses visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && _dirtyFlag) {
      clearTimeout(_saveTimer);
      try { FileSystem.save(false); } catch(_) {}
      _dirtyFlag = false;
    }
  });

  // Force save before page unloads
  window.addEventListener('beforeunload', () => {
    if (_dirtyFlag) {
      try { FileSystem.save(false); } catch(_) {}
    }
  });

  console.log('✅ Smart auto-save active (3s debounce + visibility + unload)');
})();

// ─────────────────────────────────────────────────────
// §12  INTERNET CONNECTIVITY INDICATOR
// ─────────────────────────────────────────────────────
(function setupConnectivityIndicator() {
  const show = (online) => {
    let badge = document.getElementById('v26-connectivity');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'v26-connectivity';
      badge.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);' +
        'padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;z-index:99999;' +
        'transition:opacity .5s;pointer-events:none;';
      document.body.appendChild(badge);
    }
    badge.textContent = online ? '🌐 Online' : '📴 Offline — working locally';
    badge.style.background = online ? '#22c55e22' : '#ef444422';
    badge.style.color       = online ? '#22c55e'   : '#ef4444';
    badge.style.border      = `1px solid ${online ? '#22c55e' : '#ef4444'}`;
    badge.style.opacity     = '1';
    setTimeout(() => { if (badge) badge.style.opacity = '0'; }, online ? 2000 : 8000);
  };

  window.addEventListener('online',  () => show(true));
  window.addEventListener('offline', () => show(false));
  if (!navigator.onLine) show(false);
})();

// ─────────────────────────────────────────────────────
// §13  MONACO READY EVENT DISPATCH
//      Let all v26 modules listen for monaco without polling
// ─────────────────────────────────────────────────────
(function dispatchMonacoReadyEvent() {
  function fireMonacoReady() {
    if (window.__MONACO_READY_FIRED__) return;
    window.__MONACO_READY_FIRED__ = true;
    console.log('🎯 monaco-ready event dispatched');
    window.dispatchEvent(new CustomEvent('monaco-ready'));
  }
  if (window.monaco) {
    fireMonacoReady();
    return;
  }
  // Guard: only define proxy once
  if (window.__MONACO_PROXY_SET__) return;
  // Check if already non-configurable (Monaco may have already claimed it)
  const desc = Object.getOwnPropertyDescriptor(window, 'monaco');
  if (desc && !desc.configurable) return;
  window.__MONACO_PROXY_SET__ = true;
  // Proxy window.monaco setter to emit event when Monaco becomes available
  let _monaco = undefined;
  Object.defineProperty(window, 'monaco', {
    get() { return _monaco; },
    set(v) {
      _monaco = v;
      if (v) { fireMonacoReady(); }
    },
    configurable: true
  });
})();

// ─────────────────────────────────────────────────────
// §14  IFRAME PREVIEW — memory-safe srcdoc management
// ─────────────────────────────────────────────────────
(function patchIframePreview() {
  const patchRunner = () => {
    if (!window.Runner || Runner.__v26_iframe__) return;
    Runner.__v26_iframe__ = true;

    const origPostToPreview = Runner.postToPreview?.bind(Runner);
    const origExec          = Runner.exec?.bind(Runner);

    // Track blob URLs for cleanup
    const _blobUrls = new Set();

    Runner._cleanupBlobs = () => {
      _blobUrls.forEach(url => URL.revokeObjectURL(url));
      _blobUrls.clear();
    };

    // Intercept exec to manage blob URLs properly
    if (origExec) {
      if (!window.__RUNNER_UNIFIED_PATCH__) {
        Runner.exec = function(...args) {
          Runner._cleanupBlobs(); // clean old blobs first
          return origExec(...args);
        };
      }
    }

    console.log('✅ Iframe preview patched — blob URL memory management active');
  };

  patchRunner();
  if (!window.Runner) {
    // FIX: defineProperty watcher — no polling needed
    let _runnerValue;
    try {
      Object.defineProperty(window, 'Runner', {
        get: function() { return _runnerValue; },
        set: function(v) {
          _runnerValue = v;
          try { Object.defineProperty(window, 'Runner', { value: v, writable: true, configurable: true }); } catch(_) {}
          patchRunner();
        },
        configurable: true,
        enumerable: true
      });
    } catch(e) {
      patchRunner();
    }
  }
})();

// ─────────────────────────────────────────────────────
// §15  GLOBAL RESOURCE TRACKER — detect & report leaks
// ─────────────────────────────────────────────────────
const ResourceTracker = (() => {
  // FIX: Store listener meta per-element in WeakMap so untrack() can reliably decrement
  const _listeners = new WeakMap(); // element → [{type, handler, options}]
  let _totalListeners = 0;
  const WARN_THRESHOLD = 500;

  return {
    track(element, type, handler, options) {
      if (!element) return;
      if (!_listeners.has(element)) _listeners.set(element, []);
      _listeners.get(element).push({ type, handler, options });
      _totalListeners++;
      if (_totalListeners > WARN_THRESHOLD && _totalListeners % 50 === 0) {
        console.warn(`⚠️ High event listener count: ${_totalListeners}. Possible leak!`);
      }
    },
    // FIX: untrack() now decrements correctly (was empty in earlier version)
    untrack(element, type, handler) {
      if (!element || !_listeners.has(element)) {
        if (_totalListeners > 0) _totalListeners--;
        return;
      }
      const list = _listeners.get(element);
      const idx = list.findIndex(e => e.type === type && e.handler === handler);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (_totalListeners > 0) _totalListeners--;
      }
      if (list.length === 0) _listeners.delete(element);
    },
    getCount() { return _totalListeners; },
    report() {
      console.log(`📊 ResourceTracker: ~${_totalListeners} active event listeners`);
      if (window.performance?.memory) {
        const m = window.__getPerfMemory(); // FIX: cross-browser
        console.log(`📊 Memory: ${(m.usedJSHeapSize / 1048576).toFixed(1)}MB / ${(m.jsHeapSizeLimit / 1048576).toFixed(1)}MB`);
      }
    }
  };
})();

window.ResourceTracker = ResourceTracker;

// ─────────────────────────────────────────────────────
// §16  v26 BOOT COMPLETE
// ─────────────────────────────────────────────────────
function v26Boot() {
  if (window.__v26_booted__) return; window.__v26_booted__ = true; // ✅ FIX: prevent duplicate boot
  // v26 banner suppressed
  console.log('   SecureStorage | OPFS | ShortcutManager | ServiceWorker | ResizeObserver');
  console.log('   Monaco Lifecycle | IdleScheduler | PerformanceObserver | VirtualScroll');

  // Expose on window for debugging
  window.SecureStorage    = SecureStorage;
  window.OPFSCache        = OPFSCache;
  window.ShortcutManager  = ShortcutManager;
  window.IdleScheduler    = IdleScheduler;
  window.VirtualScroll    = VirtualScroll;
  window.ResourceTracker  = ResourceTracker;

  // Update version display
  setTimeout(() => {
    try {
      const ver = document.querySelector('.logo .ver');
      if (ver) ver.textContent = 'v26.0';
      document.title = 'ProCode IDE — UNIFIED EDITION';
    } catch(_) {}

    // Show boot toast
    try {
      // Utils.toast('🚀 ProCode IDE v26.0 — GODMODE ENTERPRISE loaded!', 'success'); // suppressed: unified boot
    } catch(_) {}

    // Add v26 commands to palette
    try {
      if (window.CommandPalette?.addCommands) {
        CommandPalette.addCommands([
          { label: '🔐 Secure API Key', desc: 'AES-GCM encrypted storage', action: () => {
            const inp = document.getElementById('ai-apikey-input');
            if (inp) { document.getElementById('btn-settings')?.click(); setTimeout(() => inp.focus(), 300); }
          }},
          { label: '📁 OPFS Status', desc: 'Check Origin Private File System', action: () => {
            Utils.toast(`OPFS: ${OPFSCache.supported ? '✅ Active' : '❌ Unavailable'}`, 'info');
          }},
          { label: '📊 Resource Report', desc: 'Show memory & listener stats', action: () => ResourceTracker.report() },
          { label: '🗑️ Purge Monaco Models', desc: 'Free orphaned editor models', action: () => {
            IdleScheduler.schedule(() => {
              try {
                const models = monaco?.editor?.getModels() || [];
                models.forEach(m => { try { if (!m.isDisposed?.()) m.dispose(); } catch(_){} });
                Utils.toast(`Purged ${models.length} Monaco models`, 'success');
              } catch(e) { Utils.toast('Error: ' + e.message, 'error'); }
            }, 'high');
          }},
          { label: '🔑 Shortcut Map', desc: 'Show all registered shortcuts', action: () => {
            console.table(ShortcutManager.listAll());
            Utils.toast('Shortcut map logged to console', 'info');
          }},
        ]);
      }
    } catch(_) {}
  }, 2000);
}

// Boot after DOM is fully ready
if (document.readyState === 'complete') {
  (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v26Boot") : setTimeout(v26Boot, 3000)); // after v25 (2500ms)
} else {
  window.addEventListener('load', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v26Boot") : setTimeout(v26Boot, 3000)));
}

})(); // end PCIDE_v26 IIFE
// ══════════════════════════════════════════════════════════════════════════════
// END ProCode IDE v26 GODMODE ENTERPRISE PATCH
// ══════════════════════════════════════════════════════════════════════════════


function v25Boot() {
  if (window.__v25_booted__) return; window.__v25_booted__ = true; // ✅ FIX: prevent duplicate boot
  // v25 banner suppressed
  console.log('   Voice | Local AI | Time Machine | Multiplayer | HUD Metrics');

  // Initialize subsystems
  // HUDMetrics removed — stub already exported
  try { VoiceCoding.init(); } catch(e) { console.warn('[v25] VoiceCoding', e); }
  try { TypingRipple.init(); } catch(e) { console.warn('[v25] TypingRipple', e); }

  // Expose new APIs globally
  window.TimeMachine  = { toggle(){}, newCommit(){}, refresh(){}, close(){} }; // stub
  window.Multiplayer = Multiplayer;
  window.LocalAI = { toggle(){}, init(){} }; // stub — WebGPU Local AI removed (never implemented)
  window.HUDMetrics   = { init(){}, toggle(){} }; // stub
  window.WM = WM;

  // Add v25 entries to command palette
  setTimeout(() => {
    try {
      if (window.CommandPalette && CommandPalette.addCommands) {
        CommandPalette.addCommands([
          { label: '🎤 Voice Coding', desc: 'Toggle voice commands', action: () => VoiceCoding.toggle() },
        ]);
      }
    } catch(e) {}

    // Update version display
    try {
      const logo = document.querySelector('.logo');
      if (logo) {
        const ver = logo.querySelector('.ver');
        if (ver) ver.textContent = 'v25.0';
      }
      document.title = 'ProCode IDE — UNIFIED EDITION';
    } catch(e) {}

    // Boot toast
    if (window.Utils) {
      setTimeout(() => {
        // Utils.toast('🛸 ProCode IDE v25.0 — Hologram HUD Edition loaded!', 'success'); // suppressed: unified boot
      }, 800);
    }
  }, 1500);
}

// Boot after existing init completes
if (document.readyState === 'complete') {
  (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v25Boot") : setTimeout(v25Boot, 2500));
} else {
  window.addEventListener('load', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v25Boot") : setTimeout(v25Boot, 2500)));
}

})(); // end PCIDE_v25 IIFE