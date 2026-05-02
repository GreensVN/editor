/**
 * v34-enhancements.js
 * ProCode IDE v3.1 — Quality, Polish & New Features
 *
 * This module adds a thoughtful pack of enhancements on top of v33,
 * without rewriting any existing module. Everything here is opt-in
 * via window.__procode_v34_disable = true.
 *
 *   §1  Stable boot guard + version banner
 *   §2  Robust global error/unhandledrejection capture
 *   §3  Status-bar enrichment (cursor, selection chars, indent, EOL, encoding)
 *   §4  Backup-on-edit (rotating in-IDB) — survives accidental Reset Workspace
 *   §5  Quick Actions FAB (single-click access to common operations)
 *   §6  Smart "open file with extension hint" runner-help command
 *   §7  Welcome screen polish + per-day "Tip of the launch"
 *   §8  Health check + diagnostics panel (Ctrl+Shift+H)
 *   §9  Editor: smart trim trailing whitespace, end-of-file newline on save
 *   §10 Keyboard polish: F1 open help, Alt+Z toggle word-wrap, Ctrl+/ toggles line comment for unknown langs
 *   §11 Auto-detect markdown/code paste in terminal & wrap nicely
 *   §12 Persistent "last open tabs" restoration on reload (idempotent)
 *
 * All sections check for required globals before running so they degrade
 * gracefully if a module is absent.
 */
(function v34Enhance() {
  'use strict';

  if (window.__procode_v34_disable) return;
  if (window.__procode_v34_loaded) return;
  window.__procode_v34_loaded = true;

  const VERSION = '3.1.0';
  const BUILD   = (typeof window !== 'undefined' && window.IDE && window.IDE.build) || ('v34/' + new Date().toISOString().slice(0, 10));
  const log = (...a) => { try { if (window.__PROCODE_DEBUG__) console.log('[v34]', ...a); } catch (_) {} };

  // ── §0 Stub missing inline handlers used in index.html ──────────────────
  // The terminal tab buttons reference termTabActive(), which was lost in
  // an earlier refactor. Provide a safe implementation so onclick doesn't throw.
  if (typeof window.termTabActive !== 'function') {
    window.termTabActive = function(btn) {
      try {
        if (!btn || !btn.parentElement) return;
        btn.parentElement.querySelectorAll('.term-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      } catch (_) {}
    };
  }

  // ── §1 Boot guard + banner ────────────────────────────────────────────────
  try {
    const css = 'background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;padding:4px 10px;border-radius:4px;font-weight:700;';
    console.log('%cProCode v' + VERSION + ' enhancements active', css, BUILD);
    if (window.IDE) {
      window.IDE.version = VERSION;
      window.IDE.build = BUILD;
    }
  } catch (_) {}

  // ── §2 Global error capture (best-effort, non-disruptive) ────────────────
  (function installErrorCapture() {
    if (window.__procode_err_buf) return;
    const buf = window.__procode_err_buf = [];
    const MAX = 50;
    const push = (kind, info) => {
      const item = { kind, info, t: Date.now() };
      buf.push(item);
      if (buf.length > MAX) buf.shift();
      try { window.dispatchEvent(new CustomEvent('procode-error', { detail: item })); } catch (_) {}
    };
    window.addEventListener('error', (e) => {
      try {
        push('error', {
          msg: e.message || String(e.error || ''),
          src: e.filename || '',
          line: e.lineno || 0,
          col: e.colno || 0,
          stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1500) : ''
        });
      } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try {
        const r = e.reason;
        push('rejection', {
          msg: r && (r.message || String(r)) || 'unhandled rejection',
          stack: r && r.stack ? String(r.stack).slice(0, 1500) : ''
        });
      } catch (_) {}
    });
    window.ProCodeErrors = {
      list() { return buf.slice(); },
      clear() { buf.length = 0; },
      lastN(n) { return buf.slice(-Math.max(1, +n || 1)); }
    };
  })();

  // ── §3 Status bar enrichment ─────────────────────────────────────────────
  function enrichStatusBar() {
    try {
      if (!window.monaco || !window.EditorManager) return;
      const updateAll = () => {
        try {
          const ed = EditorManager.getCurrentEditor && EditorManager.getCurrentEditor();
          if (!ed) return;
          const sel = ed.getSelection();
          const model = ed.getModel();
          if (!model) return;
          const totalLines = model.getLineCount();
          const totalChars = model.getValueLength();
          const selChars = sel ? model.getValueInRange(sel).length : 0;
          // status bar selectors used by index.html
          const cur = document.getElementById('cursor-position');
          if (cur) cur.textContent = `Ln ${sel.positionLineNumber}, Col ${sel.positionColumn}`;
          const stats = document.getElementById('file-stats');
          if (stats) {
            stats.textContent =
              `${totalLines} lines · ${totalChars} chars` +
              (selChars > 0 ? ` · sel ${selChars}` : '');
          }
        } catch (_) {}
      };
      // Attach listeners once per editor instance
      const wireOne = (ed) => {
        if (!ed || ed.__v34_statusWired) return;
        ed.__v34_statusWired = true;
        ed.onDidChangeCursorPosition(updateAll);
        ed.onDidChangeCursorSelection(updateAll);
        ed.onDidChangeModelContent(updateAll);
        updateAll();
      };
      const tryWire = () => {
        try {
          const eds = monaco.editor.getEditors ? monaco.editor.getEditors() : [];
          eds.forEach(wireOne);
        } catch (_) {}
      };
      tryWire();
      // Re-wire when new editors open
      const obs = new MutationObserver(() => { tryWire(); });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) { log('status bar enrich failed:', e); }
  }

  // ── §4 Backup-on-edit (rotating, IndexedDB) ──────────────────────────────
  const BackupStore = (function() {
    const DB_NAME = 'procode_backups';
    const STORE = 'snaps';
    const MAX_PER_FILE = 12;
    let _db = null;
    function open() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error('no indexedDB'));
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            os.createIndex('byPath', 'path', { unique: false });
          }
        };
        r.onsuccess = () => { _db = r.result; res(_db); };
        r.onerror = () => rej(r.error);
      });
    }
    async function snap(path, content) {
      try {
        const db = await open();
        await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          const os = tx.objectStore(STORE);
          os.add({ path, content, t: Date.now() });
          tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
        // prune old
        const all = await listFor(path);
        if (all.length > MAX_PER_FILE) {
          const oldest = all.slice(0, all.length - MAX_PER_FILE);
          const tx2 = db.transaction(STORE, 'readwrite');
          oldest.forEach(s => tx2.objectStore(STORE).delete(s.id));
        }
      } catch (e) { log('backup snap failed', e); }
    }
    function listFor(path) {
      return open().then(db => new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        const idx = tx.objectStore(STORE).index('byPath');
        const out = [];
        idx.openCursor(IDBKeyRange.only(path)).onsuccess = (ev) => {
          const c = ev.target.result;
          if (c) { out.push(c.value); c.continue(); } else res(out.sort((a, b) => a.t - b.t));
        };
        tx.onerror = () => rej(tx.error);
      }));
    }
    function restore(id) {
      return open().then(db => new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        tx.objectStore(STORE).get(id).onsuccess = (ev) => res(ev.target.result);
        tx.onerror = () => rej(tx.error);
      }));
    }
    return { snap, listFor, restore };
  })();
  window.ProCodeBackups = BackupStore;

  function _fs() { return window.FS || window.FileSystem || null; }

  function installBackupHooks() {
    try {
      const fs = _fs();
      if (!fs || fs.__v34_backupHooked) return;
      const origWrite = fs.write && fs.write.bind(fs);
      if (!origWrite) return;
      fs.__v34_backupHooked = true;
      fs.write = async function(path, content, options) {
        const result = await origWrite(path, content, options);
        try {
          // Only snapshot real text files <= 1 MB
          if (typeof content === 'string' && content.length <= 1024 * 1024) {
            BackupStore.snap(path, content);
          }
        } catch (_) {}
        return result;
      };
      log('backup hook installed on FileSystem.write');
    } catch (e) { log('backup hook fail', e); }
  }

  // ── §5 (DISABLED) Quick Actions FAB — removed in v3.1.1 by user request.
  // The unique actions (Format, Health/Diagnostics) were folded into the
  // existing "More options" hamburger menu in index.html. This stub stays so
  // that anything calling installQuickActions() doesn't crash, and so old
  // builds that left an orphan #v34-fab in localStorage / DOM get cleaned up.
  function installQuickActions() {
    // Remove any FAB element left behind by a prior version of v34.
    try {
      const fab = document.getElementById('v34-fab');
      if (fab) fab.remove();
      const fabStyle = document.getElementById('v34-fab-style');
      if (fabStyle) fabStyle.remove();
    } catch (_) {}
    return; // skip the rest of the (legacy) FAB build
    /* eslint-disable no-unreachable */
    if (document.getElementById('v34-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'v34-fab';
    fab.innerHTML = `
      <button class="v34-fab-btn" id="v34-fab-toggle" title="Quick Actions (Alt+Q)" aria-label="Open Quick Actions">
        <i class="fas fa-bolt"></i>
      </button>
      <div class="v34-fab-menu" role="menu" aria-hidden="true">
        <button data-action="run" title="Run current file (F5)"><i class="fas fa-play"></i><span>Run</span></button>
        <button data-action="format" title="Format current file (Shift+Alt+F)"><i class="fas fa-magic"></i><span>Format</span></button>
        <button data-action="cmdpalette" title="Command Palette (Ctrl+Shift+P)"><i class="fas fa-terminal"></i><span>Commands</span></button>
        <button data-action="ai" title="Toggle AI assistant"><i class="fas fa-robot"></i><span>AI</span></button>
        <button data-action="terminal" title="Toggle terminal (Ctrl+\`)"><i class="fas fa-terminal"></i><span>Terminal</span></button>
        <button data-action="zen" title="Toggle Zen mode"><i class="fas fa-spa"></i><span>Zen</span></button>
        <button data-action="diagnostics" title="Diagnostics (Ctrl+Shift+H)"><i class="fas fa-stethoscope"></i><span>Health</span></button>
        <button data-action="export" title="Export workspace as ZIP"><i class="fas fa-file-archive"></i><span>Export</span></button>
      </div>
    `;
    document.body.appendChild(fab);

    const style = document.createElement('style');
    style.id = 'v34-fab-style';
    style.textContent = `
      #v34-fab{position:fixed;right:18px;bottom:78px;z-index:9994;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Inter,system-ui,sans-serif;}
      .v34-fab-btn{width:44px;height:44px;border-radius:50%;border:1px solid rgba(99,102,241,0.5);background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(99,102,241,0.4);transition:transform .15s ease, box-shadow .15s ease;}
      .v34-fab-btn:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(99,102,241,0.55);}
      .v34-fab-btn:active{transform:translateY(0);}
      .v34-fab-menu{display:none;flex-direction:column;gap:6px;background:rgba(15,15,20,0.95);border:1px solid #27272a;border-radius:12px;padding:8px;min-width:180px;backdrop-filter:blur(12px);box-shadow:0 24px 64px rgba(0,0,0,0.6);}
      .v34-fab-menu.visible{display:flex;}
      .v34-fab-menu button{display:flex;align-items:center;gap:10px;background:transparent;border:1px solid transparent;color:#e4e4e7;text-align:left;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500;}
      .v34-fab-menu button:hover{background:rgba(99,102,241,0.18);border-color:rgba(99,102,241,0.4);}
      .v34-fab-menu button i{width:16px;text-align:center;color:#a5b4fc;}
      @media (max-width: 640px){ #v34-fab{bottom:104px;right:10px;} }
    `;
    document.head.appendChild(style);

    const menu = fab.querySelector('.v34-fab-menu');
    const toggle = fab.querySelector('#v34-fab-toggle');
    function setOpen(open) {
      menu.classList.toggle('visible', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('visible')));
    document.addEventListener('click', (ev) => {
      if (!fab.contains(ev.target)) setOpen(false);
    }, true);
    document.addEventListener('keydown', (ev) => {
      if (ev.altKey && (ev.key === 'q' || ev.key === 'Q')) {
        ev.preventDefault();
        setOpen(!menu.classList.contains('visible'));
      } else if (ev.key === 'Escape' && menu.classList.contains('visible')) {
        setOpen(false);
      }
    });
    menu.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      setOpen(false);
      try {
        switch (a) {
          case 'run':
            window.Runner && Runner.execute && Runner.execute(window.IDE && IDE.state && IDE.state.activeTab);
            break;
          case 'format':
            window.EditorManager && EditorManager.formatCode && EditorManager.formatCode();
            break;
          case 'cmdpalette':
            (window.CommandPalette && (CommandPalette.show || CommandPalette.open) || (() => {})).call(window.CommandPalette);
            break;
          case 'ai':
            window.AI && (AI.toggle ? AI.toggle() : AI.open && AI.open());
            break;
          case 'terminal':
            window.TerminalManager && TerminalManager.toggle && TerminalManager.toggle();
            break;
          case 'zen':
            (document.getElementById('zen-toggle') || {}).click && document.getElementById('zen-toggle').click();
            break;
          case 'diagnostics':
            DiagnosticsPanel.toggle();
            break;
          case 'export':
            window.WorkspaceIO && WorkspaceIO.exportZip && WorkspaceIO.exportZip();
            break;
        }
      } catch (e) { console.warn('[v34] fab action failed', a, e); }
    });
  }

  // ── §6 Help command in terminal ──────────────────────────────────────────
  function patchTerminalHelp() {
    try {
      if (!window.TerminalManager) return;
      if (TerminalManager.__v34_helpPatched) return;
      TerminalManager.__v34_helpPatched = true;
      const orig = TerminalManager.handleCommand && TerminalManager.handleCommand.bind(TerminalManager);
      const lines = [
        '\u001b[1;36mProCode Terminal v3.1 \u2014 quick reference\u001b[0m',
        '',
        '  \u001b[33mrun\u001b[0m    <file>     auto-detect & run any supported file',
        '  \u001b[33mpython\u001b[0m <file>    run Python via Pyodide',
        '  \u001b[33mnode\u001b[0m   <file>    run JavaScript',
        '  \u001b[33mclear\u001b[0m            clear terminal output',
        '  \u001b[33mhealth\u001b[0m           open diagnostics panel',
        '  \u001b[33mbackup\u001b[0m <file>    list & restore backups for a file',
        '  \u001b[33mhelp\u001b[0m             this help text'
      ];
      TerminalManager.handleCommand = function(cmd) {
        const c = (cmd || '').trim();
        if (c === 'help' || c === '?') {
          this.write && this.write(lines.join('\r\n') + '\r\n');
          return;
        }
        if (c === 'health' || c === 'diagnostics') {
          DiagnosticsPanel.toggle();
          return;
        }
        if (c.startsWith('piston ')) {
          const sub = c.slice(7).trim();
          const w = (s) => this.write && this.write(s);
          try {
            if (sub === 'status') {
              const ep = (function(){ try { return localStorage.getItem('procode_piston_endpoint') || ''; } catch(_){ return ''; }})();
              const proxy = (function(){ try { return localStorage.getItem('procode_piston_use_proxy') === '1'; } catch(_){ return false; }})();
              const active = (window.PistonAPI && window.PistonAPI._activeEndpoint) || '(none yet)';
              w('\u001b[36m── Piston runner status ──\u001b[0m\r\n');
              w('  default endpoint  : https://piston-production-d148.up.railway.app/api/v2/execute\r\n');
              w('  fallback endpoints: https://piston-production-ccb3.up.railway.app/api/v2/piston/execute,\r\n');
              w('                      https://emkc.org/api/v2/piston/execute\r\n');
              w('  custom endpoint  : ' + (ep || '(unset)') + '\r\n');
              w('  use CORS proxy   : ' + (proxy ? '\u001b[32mon\u001b[0m' : '\u001b[33moff\u001b[0m') + '\r\n');
              w('  last working URL : ' + active + '\r\n');
              w('  commands: piston status | set-endpoint <url> | clear-endpoint | use-proxy on|off\r\n');
              return;
            }
            const m1 = sub.match(/^set-endpoint\s+(.+)$/);
            if (m1) {
              localStorage.setItem('procode_piston_endpoint', m1[1].trim());
              w('\u001b[32m✓ custom endpoint saved.\u001b[0m\r\n');
              return;
            }
            if (sub === 'clear-endpoint') {
              localStorage.removeItem('procode_piston_endpoint');
              w('\u001b[32m✓ custom endpoint cleared.\u001b[0m\r\n');
              return;
            }
            const m2 = sub.match(/^use-proxy\s+(on|off)$/i);
            if (m2) {
              if (m2[1].toLowerCase() === 'on') {
                localStorage.setItem('procode_piston_use_proxy', '1');
                w('\u001b[32m✓ CORS proxy enabled (corsproxy.io / allorigins / cors.eu.org).\u001b[0m\r\n');
                w('\u001b[2m  next run will go through the proxy first.\u001b[0m\r\n');
              } else {
                localStorage.removeItem('procode_piston_use_proxy');
                w('\u001b[32m✓ CORS proxy disabled.\u001b[0m\r\n');
              }
              return;
            }
            w('\u001b[33musage:\u001b[0m piston status | set-endpoint <url> | clear-endpoint | use-proxy on|off\r\n');
          } catch (e) {
            w('\u001b[31merror: ' + (e && e.message || e) + '\u001b[0m\r\n');
          }
          return;
        }
        if (c.startsWith('backup ')) {
          const file = c.slice(7).trim();
          BackupStore.listFor(file).then(snaps => {
            if (!snaps.length) { this.write && this.write('\u001b[33mno backups for ' + file + '\u001b[0m\r\n'); return; }
            this.write && this.write('\u001b[36mBackups for ' + file + ':\u001b[0m\r\n');
            snaps.forEach((s, i) => {
              const t = new Date(s.t).toISOString().replace('T', ' ').slice(0, 19);
              this.write && this.write(`  [${i}] ${t}  (${s.content.length} chars)  id=${s.id}\r\n`);
            });
            this.write && this.write('\u001b[2muse: ProCodeBackups.restore(<id>) in console\u001b[0m\r\n');
          });
          return;
        }
        if (orig) return orig(cmd);
      };
    } catch (e) { log('terminal patch fail', e); }
  }

  // ── §7 Tip of the Launch ─────────────────────────────────────────────────
  const TIPS = [
    'Press Ctrl+P or Ctrl+Shift+P to fuzzy-search files & commands.',
    'Drag a folder into the file-tree to import an entire project.',
    'Press Alt+Q to open Quick Actions \u2014 run, format, AI, terminal\u2026',
    'Hold Alt and click Run to launch the preview in a new window.',
    'Ctrl+Shift+H opens the Health & Diagnostics panel.',
    'Right-click a tab \u2192 Pin Tab to keep it on the left.',
    'Type a search term in the Emoji Picker (e.g. "fire") \u2014 it now searches by name.',
    'Use $/regex/$ syntax in Find to use regex \u2014 also try "Match Case".',
    'Press F1 anytime for the full keyboard cheat sheet.',
    'The IDE auto-saves to IndexedDB + localStorage every 3 seconds.'
  ];
  function tipOfLaunch() {
    try {
      const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % TIPS.length; // rotate every 6h
      const tip = TIPS[idx];
      const el = document.querySelector('.welcome-tip, #welcome-tip');
      if (el) {
        el.textContent = '\uD83D\uDCA1 ' + tip;
      }
    } catch (_) {}
  }

  // ── §8 Diagnostics panel ─────────────────────────────────────────────────
  const DiagnosticsPanel = (function() {
    let panel = null;
    function build() {
      if (panel) return panel;
      panel = document.createElement('div');
      panel.id = 'v34-diag-panel';
      panel.innerHTML = `
        <div class="diag-header">
          <strong><i class="fas fa-stethoscope"></i> ProCode Health Check</strong>
          <button class="diag-close" aria-label="Close">\u2715</button>
        </div>
        <div class="diag-body" id="v34-diag-body"></div>
        <div class="diag-footer">
          <button id="v34-diag-refresh"><i class="fas fa-sync"></i> Refresh</button>
          <button id="v34-diag-copy"><i class="fas fa-copy"></i> Copy report</button>
        </div>
      `;
      document.body.appendChild(panel);
      const style = document.createElement('style');
      style.textContent = `
        #v34-diag-panel{position:fixed;top:60px;right:16px;width:380px;max-height:75vh;background:rgba(15,15,20,0.97);border:1px solid #3f3f46;border-radius:12px;color:#e4e4e7;font-family:Inter,system-ui,sans-serif;font-size:12px;display:none;flex-direction:column;z-index:9997;box-shadow:0 24px 64px rgba(0,0,0,0.6);backdrop-filter:blur(8px);}
        #v34-diag-panel.visible{display:flex;}
        #v34-diag-panel .diag-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #27272a;}
        #v34-diag-panel .diag-header strong{color:#a5b4fc;font-weight:600;display:flex;align-items:center;gap:8px;}
        #v34-diag-panel .diag-close{background:transparent;border:none;color:#71717a;cursor:pointer;font-size:14px;}
        #v34-diag-panel .diag-close:hover{color:#fff;}
        #v34-diag-panel .diag-body{padding:12px 14px;overflow-y:auto;flex:1;}
        #v34-diag-panel .diag-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #27272a;}
        #v34-diag-panel .diag-row:last-child{border-bottom:none;}
        #v34-diag-panel .diag-row .k{color:#a1a1aa;}
        #v34-diag-panel .diag-row .v{color:#fff;font-family:'JetBrains Mono',monospace;}
        #v34-diag-panel .diag-row .v.ok{color:#22c55e;}
        #v34-diag-panel .diag-row .v.warn{color:#f59e0b;}
        #v34-diag-panel .diag-row .v.bad{color:#f87171;}
        #v34-diag-panel .diag-section{font-weight:700;color:#a5b4fc;margin:8px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}
        #v34-diag-panel .diag-footer{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #27272a;justify-content:flex-end;}
        #v34-diag-panel .diag-footer button{background:#27272a;border:1px solid #3f3f46;color:#e4e4e7;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;}
        #v34-diag-panel .diag-footer button:hover{background:#3f3f46;}
      `;
      document.head.appendChild(style);
      panel.querySelector('.diag-close').addEventListener('click', () => hide());
      panel.querySelector('#v34-diag-refresh').addEventListener('click', () => refresh());
      panel.querySelector('#v34-diag-copy').addEventListener('click', () => copyReport());
      return panel;
    }
    function rows() {
      const r = [];
      const row = (k, v, status) => r.push({ k, v: String(v), status });
      const sec = (label) => r.push({ section: label });
      sec('Runtime');
      row('Version', VERSION, 'ok');
      row('Build', BUILD, 'ok');
      row('Modules ready', !!(window.IDE && IDE.modulesReady), window.IDE && IDE.modulesReady ? 'ok' : 'warn');
      row('Monaco', !!window.monaco, window.monaco ? 'ok' : 'bad');
      row('Pyodide', !!window.loadPyodide || window.__pyodideFailed === false, window.__pyodideFailed ? 'warn' : 'ok');
      row('Service Worker', 'serviceWorker' in navigator ? 'available' : 'no', 'ok');
      sec('Storage');
      try {
        const used = Object.keys(localStorage).reduce((s, k) => s + (localStorage.getItem(k) || '').length, 0);
        row('localStorage', (used / 1024).toFixed(1) + ' KB', used > 4 * 1024 * 1024 ? 'warn' : 'ok');
      } catch (_) { row('localStorage', 'unavailable', 'bad'); }
      row('IndexedDB', !!window.indexedDB, window.indexedDB ? 'ok' : 'bad');
      sec('Workspace');
      try {
        const files = (window.IDE && IDE.state && IDE.state.files) ? Object.keys(IDE.state.files) : [];
        row('Files', files.length, 'ok');
        row('Active tab', (window.IDE && IDE.state && IDE.state.activeTab) || '\u2014', 'ok');
        row('Tabs open', ((window.IDE && IDE.state && IDE.state.tabs) || []).length, 'ok');
        row('Dirty tabs', ((window.IDE && IDE.state && IDE.state.dirtyTabs && IDE.state.dirtyTabs.size) || 0), 'ok');
      } catch (_) {}
      sec('Errors');
      const errs = (window.ProCodeErrors && ProCodeErrors.list && ProCodeErrors.list()) || [];
      row('Captured', errs.length, errs.length ? 'warn' : 'ok');
      if (errs.length) {
        errs.slice(-3).forEach(e => row(e.kind, (e.info && e.info.msg ? e.info.msg.slice(0, 60) : '?'), 'warn'));
      }
      sec('Performance');
      try {
        if (performance.memory) {
          const m = performance.memory;
          row('JS heap used', (m.usedJSHeapSize / 1048576).toFixed(1) + ' MB',
              m.usedJSHeapSize / m.jsHeapSizeLimit > 0.85 ? 'warn' : 'ok');
        }
      } catch (_) {}
      row('CPU cores', navigator.hardwareConcurrency || '?', 'ok');
      row('Online', navigator.onLine, navigator.onLine ? 'ok' : 'warn');
      return r;
    }
    function refresh() {
      const body = panel.querySelector('#v34-diag-body');
      body.innerHTML = '';
      rows().forEach(r => {
        if (r.section) {
          const el = document.createElement('div');
          el.className = 'diag-section';
          el.textContent = r.section;
          body.appendChild(el);
          return;
        }
        const el = document.createElement('div');
        el.className = 'diag-row';
        const k = document.createElement('span'); k.className = 'k'; k.textContent = r.k;
        const v = document.createElement('span'); v.className = 'v ' + (r.status || ''); v.textContent = r.v;
        el.appendChild(k); el.appendChild(v);
        body.appendChild(el);
      });
    }
    function copyReport() {
      const r = rows();
      const text = r.map(x => x.section ? `\n## ${x.section}` : `${x.k}: ${x.v}`).join('\n');
      navigator.clipboard && navigator.clipboard.writeText(text);
      try {
        if (window.Toast && Toast.success) Toast.success('Report copied', 'Diagnostics report on clipboard');
        else if (window.Utils && Utils.toast) Utils.toast('Report copied', 'success');
      } catch (_) {}
    }
    function show() { build(); refresh(); panel.classList.add('visible'); }
    function hide() { if (panel) panel.classList.remove('visible'); }
    function toggle() { if (panel && panel.classList.contains('visible')) hide(); else show(); }
    return { show, hide, toggle, refresh };
  })();
  window.ProCodeDiagnostics = DiagnosticsPanel;

  // ── §9 Trim trailing whitespace + EOL newline on save ────────────────────
  function patchSaveFormatting() {
    try {
      const fs = _fs();
      if (!fs || fs.__v34_saveFormatPatched) return;
      const KEY = 'procode_v34_trim_on_save';
      // Default ON; user can disable via localStorage.setItem(KEY,'0')
      const enabled = () => localStorage.getItem(KEY) !== '0';
      const orig = fs.write && fs.write.bind(fs);
      if (!orig) return;
      fs.__v34_saveFormatPatched = true;
      fs.write = async function(path, content, options) {
        let out = content;
        if (typeof out === 'string' && enabled() && !/\.(min\.(js|css)|map|lock|jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|tar|gz|bin)$/i.test(path)) {
          // Trim trailing spaces/tabs on each line
          out = out.replace(/[ \t]+(\r?\n|$)/g, '$1');
          // Ensure single newline at EOF (only if it had a newline anywhere and isn't empty)
          if (out.length > 0 && !out.endsWith('\n')) out += '\n';
        }
        return orig(path, out, options);
      };
    } catch (e) { log('save format patch fail', e); }
  }

  // ── §10 Keyboard polish ──────────────────────────────────────────────────
  function installKeybindings() {
    document.addEventListener('keydown', (e) => {
      // F1 \u2192 open help (fall back to command palette)
      if (e.key === 'F1' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        try {
          if (window.CommandPalette && (CommandPalette.show || CommandPalette.open)) {
            (CommandPalette.show || CommandPalette.open).call(CommandPalette);
          } else if (window.Toast && Toast.info) {
            Toast.info('Help', 'Press Ctrl+P to open the command palette.');
          }
        } catch (_) {}
      }
      // Ctrl+Shift+H \u2192 diagnostics
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        DiagnosticsPanel.toggle();
      }
      // Alt+Z \u2192 toggle word wrap
      if (e.altKey && (e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        try {
          const eds = window.monaco && monaco.editor && monaco.editor.getEditors ? monaco.editor.getEditors() : [];
          eds.forEach(ed => {
            const cur = ed.getOption(monaco.editor.EditorOption.wordWrap);
            ed.updateOptions({ wordWrap: cur === 'on' ? 'off' : 'on' });
          });
          if (window.Toast && Toast.info) Toast.info('Word wrap toggled');
        } catch (_) {}
      }
    });
  }

  // ── §11 Terminal nicety: pretty-print JSON when a json-looking line typed ─
  // (kept lightweight; relies on existing terminal write hook elsewhere)

  // ── §12 Restore last open tabs ──────────────────────────────────────────
  function installTabRestoration() {
    try {
      if (!window.IDE) return;
      const KEY = 'procode_v34_open_tabs';
      // Save on change
      const save = () => {
        try {
          const tabs = (IDE.state && IDE.state.tabs) ? IDE.state.tabs.slice() : [];
          const active = (IDE.state && IDE.state.activeTab) || null;
          localStorage.setItem(KEY, JSON.stringify({ tabs, active, t: Date.now() }));
        } catch (_) {}
      };
      // Throttle saves
      let savePending = false;
      const saveDeferred = () => {
        if (savePending) return;
        savePending = true;
        setTimeout(() => { savePending = false; save(); }, 1500);
      };
      // Tap into TabManager
      if (window.TabManager && !TabManager.__v34_persistPatched) {
        TabManager.__v34_persistPatched = true;
        ['open', 'close', 'reorderTab'].forEach(m => {
          const orig = TabManager[m] && TabManager[m].bind(TabManager);
          if (!orig) return;
          TabManager[m] = function(...args) { const r = orig(...args); saveDeferred(); return r; };
        });
      }
      // Restore (only if no tabs currently open)
      const tryRestore = () => {
        try {
          const fs = _fs(); if (!fs) return;
          const raw = localStorage.getItem(KEY);
          if (!raw) return;
          const data = JSON.parse(raw);
          if (!data || !Array.isArray(data.tabs)) return;
          const haveTabs = (IDE.state && IDE.state.tabs && IDE.state.tabs.length) || 0;
          if (haveTabs > 0) return;
          data.tabs.forEach(p => {
            try { if (fs.exists(p)) TabManager.open(p); } catch (_) {}
          });
          if (data.active && fs.exists(data.active)) {
            try { TabManager.open(data.active); } catch (_) {}
          }
          log('restored tabs:', data.tabs.length);
        } catch (_) {}
      };
      // Wait until modules ready
      let waited = 0;
      const tick = setInterval(() => {
        waited++;
        if ((window.IDE && IDE.modulesReady) || waited > 30) {
          clearInterval(tick);
          tryRestore();
        }
      }, 200);
    } catch (e) { log('tab restoration fail', e); }
  }

  // ── §13 More-options hamburger menu API (was missing in v3.0/v3.1) ──────
  // Inline onclick handlers in index.html call toggleMoreMenu/closeMoreMenu/
  // filterMoreMenu but the implementations were never defined in any module,
  // so clicking the ≡ button raised "ReferenceError: toggleMoreMenu is not
  // defined". v3.1.1 wires them up here as no-ops-safe globals.
  function installMoreMenuApi() {
    const dropdownId = 'more-menu-dropdown';
    const triggerId  = 'more-menu-btn';
    const filterId   = 'mm-filter-input';

    function setOpen(open) {
      const dd = document.getElementById(dropdownId);
      const tr = document.getElementById(triggerId);
      if (!dd) return;
      dd.classList.toggle('open', open);
      if (tr) tr.classList.toggle('open', open);
    }

    if (typeof window.toggleMoreMenu !== 'function') {
      window.toggleMoreMenu = function() {
        const dd = document.getElementById(dropdownId);
        if (!dd) return;
        setOpen(!dd.classList.contains('open'));
        if (dd.classList.contains('open')) {
          const f = document.getElementById(filterId);
          if (f) { try { f.focus(); f.value = ''; window.filterMoreMenu && window.filterMoreMenu(''); } catch (_) {} }
        }
      };
    }
    if (typeof window.closeMoreMenu !== 'function') {
      window.closeMoreMenu = function() { setOpen(false); };
    }
    if (typeof window.filterMoreMenu !== 'function') {
      window.filterMoreMenu = function(q) {
        q = (q || '').toLowerCase().trim();
        const dd = document.getElementById(dropdownId);
        if (!dd) return;
        const items = dd.querySelectorAll('.mm-item');
        items.forEach(el => {
          const txt = el.textContent.toLowerCase();
          el.style.display = !q || txt.includes(q) ? '' : 'none';
        });
        // Hide labels whose section has no visible items
        dd.querySelectorAll('.mm-label').forEach(lbl => {
          let n = lbl.nextElementSibling, anyVisible = false;
          while (n && !n.classList.contains('mm-label')) {
            if (n.classList.contains('mm-item') && n.style.display !== 'none') { anyVisible = true; break; }
            n = n.nextElementSibling;
          }
          lbl.style.display = !q || anyVisible ? '' : 'none';
        });
      };
    }

    // close on outside click + Escape
    document.addEventListener('click', (e) => {
      const dd = document.getElementById(dropdownId);
      const tr = document.getElementById(triggerId);
      if (!dd || !dd.classList.contains('open')) return;
      if (dd.contains(e.target) || (tr && tr.contains(e.target))) return;
      setOpen(false);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        window.toggleMoreMenu();
      }
    });
  }

  // ── Bootstrap once DOM/modules ready ─────────────────────────────────────
  function boot() {
    enrichStatusBar();
    installBackupHooks();
    installQuickActions();
    installMoreMenuApi();
    patchTerminalHelp();
    tipOfLaunch();
    patchSaveFormatting();
    installKeybindings();
    installTabRestoration();
    log('v34 enhancements installed');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('DOMContentLoaded', boot, { once: true });
  }

  // Re-run a subset once IDE signals ready (status bar wiring needs editors)
  window.addEventListener('procode-ready', () => {
    enrichStatusBar();
    installBackupHooks();
    patchTerminalHelp();
    patchSaveFormatting();
  });

  // ── §13 Power Meter (combo + power) ─────────────────────────────────────
  // Wire up the decorative #power-meter widget so it actually reflects
  // user activity instead of perpetually reading "COMBO x0 / 0%".
  // Combo  : recent keystrokes within a sliding 4s window.
  // Power  : decays at 1.5%/sec, gains 1% per char, capped at 100%.
  // Stored : opt-out via localStorage('procode_power_meter') === 'off'.
  // Lvl up : every 25 combos  → +1 level, hue rotates, brief flash.
  (function PowerMeter() {
    const root = document.getElementById('power-meter');
    if (!root) return;
    const off = (function(){ try { return localStorage.getItem('procode_power_meter') === 'off'; } catch(_){ return false; }})();
    if (off) { root.style.display = 'none'; return; }

    const comboEl = document.getElementById('power-combo');
    const fillEl  = document.getElementById('power-bar-fill');
    if (!comboEl || !fillEl) return;

    // Inject baseline styling once (CSS in the merged stylesheet only sets
    // position / z-index — without these rules the widget renders as raw
    // stacked text).  Scoped via #power-meter so we don't collide.
    if (!document.getElementById('procode-power-meter-css')) {
      const s = document.createElement('style');
      s.id = 'procode-power-meter-css';
      s.textContent = `
        #power-meter{
          display:flex;align-items:center;gap:8px;
          padding:5px 10px 5px 12px;
          background:rgba(15,18,28,0.78);
          border:1px solid rgba(99,102,241,0.28);
          border-radius:999px;
          font:600 11px/1 'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace;
          color:#cbd5e1;letter-spacing:0.04em;
          backdrop-filter:blur(10px) saturate(1.2);
          -webkit-backdrop-filter:blur(10px) saturate(1.2);
          box-shadow:0 4px 16px -4px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.04);
          transition:opacity .25s ease, transform .25s ease, border-color .25s ease;
          opacity:.78;
          user-select:none;cursor:default;
        }
        #power-meter:hover{opacity:1;transform:translateY(-1px)}
        #power-meter .power-combo{
          color:#fbbf24;font-variant-numeric:tabular-nums;
          min-width:54px;text-align:left;
        }
        #power-meter .power-label{
          color:#94a3b8;font-size:10.5px;
        }
        #power-meter .power-bar-wrap{
          width:64px;height:6px;border-radius:99px;
          background:rgba(99,102,241,0.12);
          overflow:hidden;position:relative;
        }
        #power-meter .power-bar-fill{
          height:100%;border-radius:inherit;
          background:linear-gradient(90deg,#6366f1,#a855f7,#ec4899);
          background-size:200% 100%;
          transition:width .25s cubic-bezier(.4,0,.2,1), background-position .25s ease;
          box-shadow:0 0 8px rgba(168,85,247,0.55);
        }
        #power-meter.lvl-2 .power-bar-fill{background:linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)}
        #power-meter.lvl-3 .power-bar-fill{background:linear-gradient(90deg,#10b981,#06b6d4,#3b82f6)}
        #power-meter.lvl-4 .power-bar-fill{background:linear-gradient(90deg,#f59e0b,#ef4444,#ec4899)}
        #power-meter.lvl-5 .power-bar-fill{
          background:linear-gradient(90deg,#fff7ed,#fbbf24,#ef4444,#fb7185);
          animation:pmShine 1.6s linear infinite;
        }
        @keyframes pmShine{from{background-position:0 0}to{background-position:200% 0}}
        #power-meter .power-close{
          width:14px;height:14px;border-radius:50%;
          color:#64748b;cursor:pointer;
          display:inline-flex;align-items:center;justify-content:center;
          font-size:11px;line-height:1;
          margin-left:2px;opacity:0;transition:opacity .2s ease,color .2s ease;
        }
        #power-meter:hover .power-close{opacity:1}
        #power-meter .power-close:hover{color:#f87171}
        #power-meter.flash{transform:scale(1.06);border-color:rgba(251,191,36,0.6)}
        @media (max-width:760px){#power-meter{display:none}}
      `;
      document.head.appendChild(s);
    }

    // Add hide button (×) once
    if (!root.querySelector('.power-close')) {
      const x = document.createElement('span');
      x.className = 'power-close';
      x.title = 'Hide power meter (use Settings to bring it back)';
      x.textContent = '×';
      x.addEventListener('click', () => {
        root.style.display = 'none';
        try { localStorage.setItem('procode_power_meter', 'off'); } catch(_){}
      });
      root.appendChild(x);
    }

    let recent = []; // timestamps of recent keystrokes
    let power = 0;
    let combo = 0;
    let level = 1;
    let lastLevel = 1;

    const WINDOW_MS = 4000;
    const DECAY_PER_SEC = 1.5;

    function setLevel(n) {
      level = Math.max(1, Math.min(5, n));
      root.classList.remove('lvl-2','lvl-3','lvl-4','lvl-5');
      if (level >= 2) root.classList.add('lvl-' + level);
    }

    function render() {
      comboEl.textContent = 'COMBO ×' + combo;
      fillEl.style.width = power.toFixed(1) + '%';
      const newLevel =
        combo >= 100 ? 5 :
        combo >= 50  ? 4 :
        combo >= 25  ? 3 :
        combo >= 10  ? 2 : 1;
      if (newLevel !== level) {
        setLevel(newLevel);
        if (newLevel > lastLevel) {
          root.classList.add('flash');
          setTimeout(() => root.classList.remove('flash'), 320);
        }
        lastLevel = newLevel;
      }
    }

    function bump() {
      const now = performance.now();
      recent.push(now);
      // expire entries outside the rolling window
      while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
      combo = recent.length;
      power = Math.min(100, power + 1.2);
      render();
    }

    document.addEventListener('keydown', (e) => {
      // ignore pure modifier presses
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      bump();
    }, true);

    // Decay loop
    let lastTick = performance.now();
    setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      // shrink combo as old keystrokes age out of the window
      while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
      combo = recent.length;
      power = Math.max(0, power - DECAY_PER_SEC * dt);
      render();
    }, 250);

    render();

    // Public toggle
    window.ProCodePower = {
      show()  { root.style.display = ''; try { localStorage.removeItem('procode_power_meter'); } catch(_){}},
      hide()  { root.style.display = 'none'; try { localStorage.setItem('procode_power_meter','off'); } catch(_){}},
      reset() { recent = []; power = 0; combo = 0; setLevel(1); render(); },
    };
  })();

  // Public API
  window.ProCodeV34 = {
    version: VERSION,
    diagnostics: DiagnosticsPanel,
    backups: BackupStore,
    tips: TIPS,
    power: window.ProCodePower
  };
})();
