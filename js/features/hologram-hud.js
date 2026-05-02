/**
 * hologram-hud.js
 * Hologram HUD overlay, performance metrics display
 * ProCode IDE v3.0
 */

/* ═══════════════════════════════════════════════════════════════════════════
   🔥 PRO CODE IDE v24.0 — GODMODE CORE
   ═════════════════════════════════════════════════════��═════════════════════ */
(function() {
'use strict';
if (window.__PCIDE_V24__) return;
window.__PCIDE_V24__ = true;

/* ══════════════════════════════════════════════
   1. NEURAL EVENT BUS — Hệ thần kinh trung tâm
   ══════════════════════════════════════════════ */
const EventBus = window.EventBus = {
  _events: {},
  on(event, listener, ctx) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push({ fn: listener, ctx: ctx || null });
    return () => this.off(event, listener);
  },
  off(event, listener) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter(l => l.fn !== listener);
  },
  emit(event, data) {
    (this._events[event] || []).forEach(l => { try { l.fn.call(l.ctx, data); } catch(e) {} });
    (this._events['*'] || []).forEach(l => { try { l.fn.call(l.ctx, event, data); } catch(e) {} });
  },
  once(event, listener) {
    const off = this.on(event, (...args) => { listener(...args); off(); });
  }
};

/* ══════════════��═══════════════════════════════
   2. WINDOW MANAGER — Kết thúc Z-Index Wars
   ══════════════════════════════════════════════ */
const WindowManager = window.WindowManager = {
  _base: 1000,
  _layers: { overlay: 0, modal: 100, toolbar: 200, notification: 300, tooltip: 400, island: 500 },
  _stack: [],
  get(layer) { return this._base + (this._layers[layer] || 0); },
  push(el, layer = 'modal') {
    const z = this.get(layer) + this._stack.length;
    el.style.zIndex = z; this._stack.push({ el, z, layer }); return z;
  },
  pop() {
    const item = this._stack.pop();
    if (item) item.el.style.zIndex = ''; return item;
  },
  focus(el) {
    const item = this._stack.find(i => i.el === el);
    if (!item) return;
    const maxZ = Math.max(...this._stack.map(i => i.z));
    item.z = maxZ + 1; el.style.zIndex = maxZ + 1;
  }
};

/* ══════════════════════════════════════════════
   3. KILL THE POLLING — MutationObserver takeover
   ═══���════���═════���═══════════════════════════════ */
function killIntervalPolling() {
  // Patch watchEditor to be event-driven via Monaco hooks
  const setupMonacoHooks = () => {
    try {
      const em = window.EditorManager || window['EditorManager'];
      if (!em || !em.getCurrentEditor) { setTimeout(setupMonacoHooks, 1000); return; }
      const ed = em.getCurrentEditor();
      if (!ed || !ed.onDidChangeModelContent) { setTimeout(setupMonacoHooks, 1000); return; }
      
      // Replace interval-based watchEditor
      let _lastPath = null;
      const updateAll = () => {
        try {
          const path = window.IDE?.state?.activeTab;
          if (path && path !== _lastPath) { _lastPath = path; if (window.updateBreadcrumbs) updateBreadcrumbs(path); }
          const code = ed.getValue?.() || '';
          const lang = ed.getModel?.()?.getLanguageId?.() || 'text';
          if (window.updateStats) updateStats(code, lang.charAt(0).toUpperCase() + lang.slice(1));
          // MinimapHeatmap removed
          EventBus.emit('editor:change', { code, lang, path });
        } catch(e) {}
      };
      
      ed.onDidChangeModelContent(() => { clearTimeout(ed._v24Timer); ed._v24Timer = setTimeout(updateAll, 300); });
      ed.onDidChangeCursorPosition(() => updateAll());
      ed.onDidFocusEditorText(() => updateAll());
      updateAll();
      console.log('[v24] ✅ Polling killed — Monaco events active');
    } catch(e) { setTimeout(setupMonacoHooks, 1500); }
  };
  setTimeout(setupMonacoHooks, 2000);
}

/* ══════════════════════════════════════════════
   4. MINIMAP HEATMAP — Error/Warn/TODO markers
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   5. FLOATING CONTEXT TOOLBAR — Notion-style
   ══════════════════════════════════════════════ */
const SelectionToolbar = {
  el: null,
  hideTimer: null,
  init() {
    if (document.getElementById('v24-selection-toolbar')) { this.el = document.getElementById('v24-selection-toolbar'); return; }
    this.el = document.createElement('div');
    this.el.id = 'v24-selection-toolbar';
    this.el.innerHTML = `
      <button class="stb-btn ai" onclick="SelectionToolbar.aiExplain()"><i class="fas fa-magic"></i> AI Giải thích</button>
      <div class="stb-sep"></div>
      <button class="stb-btn" onclick="SelectionToolbar.format()"><i class="fas fa-indent"></i> Format</button>
      <button class="stb-btn" onclick="SelectionToolbar.refactor()"><i class="fas fa-tools"></i> Refactor</button>
      <button class="stb-btn" onclick="SelectionToolbar.copy()"><i class="fas fa-copy"></i> Copy</button>
      <button class="stb-btn" onclick="SelectionToolbar.comment()"><i class="fas fa-comment-code"></i> Comment</button>
      <div class="stb-sep"></div>
      <button class="stb-btn" onclick="SelectionToolbar.delete()" style="color:#fb7185"><i class="fas fa-trash"></i></button>
    `;
    document.body.appendChild(this.el);
    WindowManager.push(this.el, 'toolbar');
    
    // Hide on outside click
    document.addEventListener('mousedown', e => { if (!this.el.contains(e.target)) this.hide(); });
    
    // Hook Monaco selection change
    this._hookMonaco();
  },
  _hookMonaco() {
    const tryHook = () => {
      try {
        const em = window.EditorManager || window['EditorManager'];
        if (!em?.getCurrentEditor) { setTimeout(tryHook, 1500); return; }
        const ed = em.getCurrentEditor();
        if (!ed?.onDidChangeCursorSelection) { setTimeout(tryHook, 1500); return; }
        ed.onDidChangeCursorSelection((e) => {
          const sel = ed.getSelection?.();
          if (!sel || sel.isEmpty()) { this.hide(); return; }
          clearTimeout(this.hideTimer);
          // Get cursor pixel position via Monaco internals
          setTimeout(() => this.showNearSelection(ed), 80);
        });
      } catch(e) { setTimeout(tryHook, 2000); }
    };
    setTimeout(tryHook, 2000);
  },
  showNearSelection(editor) {
    try {
      const sel = editor.getSelection?.();
      if (!sel || sel.isEmpty()) return;
      const coord = editor.getScrolledVisiblePosition?.({ lineNumber: sel.startLineNumber, column: sel.startColumn });
      if (!coord) return;
      const editorEl = editor.getDomNode?.();
      if (!editorEl) return;
      const edRect = editorEl.getBoundingClientRect();
      const x = edRect.left + coord.left;
      const y = edRect.top + coord.top - 52;
      this.el.style.left = Math.max(10, Math.min(window.innerWidth - 350, x)) + 'px';
      this.el.style.top = Math.max(10, y) + 'px';
      this.el.classList.add('show');
    } catch(e) { this.hide(); }
  },
  hide() { this.el?.classList.remove('show'); },
  _getSelection() {
    try {
      const em = window.EditorManager || window['EditorManager'];
      const ed = em?.getCurrentEditor?.();
      const sel = ed?.getSelection?.();
      if (sel && !sel.isEmpty()) return ed.getModel()?.getValueInRange(sel) || '';
    } catch(e) {} return '';
  },
  aiExplain() {
    const txt = this._getSelection();
    if (!txt) return;
    this.hide();
    if (window.AI?.toggle) { AI.toggle(); setTimeout(() => { const inp = document.getElementById('ai-input'); if (inp) { inp.value = `Giải thích đoạn code này:\n\`\`\`\n${txt.slice(0, 500)}\n\`\`\``; if (window.AI?.send) AI.send(); } }, 400); }
  },
  format() {
    try { const em = window.EditorManager || window['EditorManager']; em?.getCurrentEditor?.()?.getAction?.('editor.action.formatSelection')?.run?.(); } catch(e) {}
    this.hide();
  },
  refactor() {
    try { const em = window.EditorManager || window['EditorManager']; em?.getCurrentEditor?.()?.getAction?.('editor.action.rename')?.run?.(); } catch(e) {}
    this.hide();
  },
  copy() {
    const txt = this._getSelection();
    if (txt) navigator.clipboard.writeText(txt).then(() => { if (window.Utils?.toast) Utils.toast('Copied!', 'success'); });
    this.hide();
  },
  comment() {
    try { const em = window.EditorManager || window['EditorManager']; em?.getCurrentEditor?.()?.getAction?.('editor.action.commentLine')?.run?.(); } catch(e) {}
    this.hide();
  },
  delete() {
    try {
      const em = window.EditorManager || window['EditorManager'];
      const ed = em?.getCurrentEditor?.();
      const sel = ed?.getSelection?.();
      if (sel && !sel.isEmpty()) { ed.executeEdits('', [{ range: sel, text: '' }]); }
    } catch(e) {}
    this.hide();
  }
};
window.SelectionToolbar = SelectionToolbar;

/* ══════════════════════════════════════════════
   6. NPM AUTO-TYPINGS — unpkg .d.ts injector
   ══════════════════════════════════════════════ */
const TypingsManager = {
  _loaded: new Set(),
  _indicator: null,
  init() {
    if (!this._indicator) {
      this._indicator = document.createElement('div');
      this._indicator.id = 'v24-typings-indicator';
      document.body.appendChild(this._indicator);
    }
    // Hook Monaco for import detection
    const tryHook = () => {
      try {
        const em = window.EditorManager || window['EditorManager'];
        if (!em?.getCurrentEditor) { setTimeout(tryHook, 2000); return; }
        const ed = em.getCurrentEditor();
        if (!ed?.onDidChangeModelContent) { setTimeout(tryHook, 2000); return; }
        ed.onDidChangeModelContent(() => {
          clearTimeout(this._scanTimer);
          this._scanTimer = setTimeout(() => this.scanImports(ed), 800);
        });
        console.log('[v24] ✅ NPM Typings manager active');
      } catch(e) { setTimeout(tryHook, 2500); }
    };
    setTimeout(tryHook, 3000);
  },
  async scanImports(editor) {
    try {
      const code = editor.getValue?.() || '';
      const importRe = /import\s+(?:.*?\s+from\s+)?['"]([^./][^'"]+)['"]/g;
      let m;
      const packages = new Set();
      while ((m = importRe.exec(code)) !== null) {
        const pkg = m[1].split('/')[0].replace(/^@[^/]+\/[^/]+.*/, m2 => m2.split('/').slice(0,2).join('/'));
        if (!this._loaded.has(pkg)) packages.add(pkg);
      }
      for (const pkg of packages) { await this.fetchTypings(pkg); }
    } catch(e) {}
  },
  async fetchTypings(pkg) {
    if (this._loaded.has(pkg) || !window.monaco) return;
    try {
      const url = `https://unpkg.com/${pkg}/index.d.ts`;
      const res = await fetch(url, { signal: AbortSignal.timeout?.(3000) }).catch(() => null);
      if (!res?.ok) return;
      const dts = await res.text();
      if (!dts || dts.length < 50) return;
      this.showIndicator(`📦 Typings: ${pkg}`);
      monaco.languages.typescript.javascriptDefaults.addExtraLib(dts, `file:///node_modules/${pkg}/index.d.ts`);
      monaco.languages.typescript.typescriptDefaults.addExtraLib(dts, `file:///node_modules/${pkg}/index.d.ts`);
      this._loaded.add(pkg);
      console.log(`[v24] ✅ Typings loaded: ${pkg}`);
    } catch(e) {}
  },
  showIndicator(msg) {
    if (!this._indicator) return;
    this._indicator.innerHTML = _sanitize(`<span class="spin">⚙</span> ${msg}`);
    this._indicator.classList.add('show');
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this._indicator.classList.remove('show'), 2500);
  }
};

/* ══════════════════════════════════════════════
   7. AI INLINE GHOST TEXT — Copilot-style
   ══════════════════════��═════��═════════════════ */

/* ══════════════════════════════════════════════
   8. SQLITE WASM EXPLORER
   ══════════════════════════════════════════════ */
const SQLiteExplorer = window.SQLiteExplorer = {
  _db: null, _panel: null,
  init() {
    if (document.getElementById('v24-sql-panel')) { this._panel = document.getElementById('v24-sql-panel'); return; }
    this._panel = document.createElement('div');
    this._panel.id = 'v24-sql-panel';
    this._panel.innerHTML = `
      <div class="sql-toolbar">
        <i class="fas fa-database" style="color:#6366f1"></i>
        <span style="font-size:13px;font-weight:700;color:#e4e4e7;flex:1">SQLite Explorer</span>
        <button class="btn icon small" onclick="SQLiteExplorer.runQuery()"><i class="fas fa-play" style="color:#4ade80"></i></button>
        <button class="btn icon small" onclick="SQLiteExplorer.close()"><i class="fas fa-times"></i></button>
      </div>
      <div class="sql-body">
        <textarea class="sql-query" id="v24-sql-query" placeholder="SELECT * FROM table_name LIMIT 100;"></textarea>
        <div style="padding:8px 12px;font-size:10px;color:#52525b;border-bottom:1px solid #1f1f24;display:flex;gap:12px">
          <span id="v24-sql-tables" style="color:#a1a1aa">Tables: loading…</span>
          <span id="v24-sql-status"></span>
        </div>
        <div class="sql-results" id="v24-sql-results">
          <div style="padding:20px;text-align:center;color:#52525b;font-size:12px">
            <i class="fas fa-database" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>
            Import a .db or .sqlite file to explore
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this._panel);
    WindowManager.push(this._panel, 'modal');
    this._hookFileSystem();
  },
  _hookFileSystem() {
    EventBus.on('file:opened', ({ path }) => {
      if (path?.match(/\.(db|sqlite|sqlite3)$/i)) { this.loadDB(path); }
    });
  },
  async loadDB(path) {
    try {
      if (!window.initSqlJs) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.min.js';
        // AMD guard: hide Monaco define so sql.js doesn't conflict
        const __savedDefine = window.define;
        if (window.define && window.define.amd) window.define = undefined;
        document.head.appendChild(s);
        await new Promise(r => s.onload = r);
        // Restore define
        if (__savedDefine) window.define = __savedDefine;
      }
      const content = window.IDE?.state?.files?.[path];
      if (!content) return;
      const arr = Uint8Array.from(atob(content.split(',')[1] || ''), c => c.charCodeAt(0));
      const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });
      this._db = new SQL.Database(arr);
      const tables = this._db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tNames = (tables[0]?.values || []).map(r => r[0]).join(', ');
      const el = document.getElementById('v24-sql-tables');
      if (el) el.textContent = `Tables: ${tNames || 'none'}`;
      this.show();
      if (window.Utils?.toast) Utils.toast(`SQLite loaded: ${path.split('/').pop()}`, 'success');
    } catch(e) { if (window.Utils?.toast) Utils.toast('SQLite load failed: ' + e.message, 'error'); }
  },
  runQuery() {
    const q = document.getElementById('v24-sql-query')?.value;
    const results = document.getElementById('v24-sql-results');
    const status = document.getElementById('v24-sql-status');
    if (!q || !this._db || !results) return;
    try {
      const t0 = performance.now();
      const rows = this._db.exec(q);
      const ms = (performance.now() - t0).toFixed(1);
      if (status) status.textContent = `${ms}ms`;
      if (!rows.length) { results.innerHTML = '<div style="padding:16px;color:#52525b;font-size:12px">Query returned no rows</div>'; return; }
      const { columns, values } = rows[0];
      results.innerHTML = `<table class="sql-table">
        <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${values.slice(0, 200).map(row => `<tr>${row.map(v => `<td>${v ?? 'NULL'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    } catch(e) { results.innerHTML = _sanitize(`<div style="padding:12px;color:#fb7185;font-size:12px">${e.message}</div>`); }
  },
  show() { this._panel?.classList.add('show'); },
  close() { this._panel?.classList.remove('show'); }
};

/* ════════════════════════���═════════════════════
   9. ARCHITECTURE CANVAS — Excalidraw embed
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   10. SESSION RECORDER — Cinematic Playback
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   11. GIT BRANCH GRAPH — Visual git viewer
   ══════════════════════════════════════════════ */
const GitGraph = window.GitGraph = {
  _panel: null,
  _commits: [],
  init() {
    if (document.getElementById('v24-git-graph')) { this._panel = document.getElementById('v24-git-graph'); return; }
    this._panel = document.createElement('div');
    this._panel.id = 'v24-git-graph';
    this._panel.innerHTML = `
      <div class="git-graph-header">
        <i class="fas fa-code-branch" style="color:#6366f1"></i>
        <span style="font-weight:700;color:#e4e4e7;flex:1">Git History</span>
        <span class="git-branch-badge"><i class="fas fa-code-branch"></i> main</span>
        <button class="btn icon small" onclick="GitGraph.close()" style="margin-left:8px"><i class="fas fa-times"></i></button>
      </div>
      <div id="v24-git-list" style="flex:1;overflow:auto;padding:8px 0"></div>
    `;
    document.body.appendChild(this._panel);
    WindowManager.push(this._panel, 'modal');
  },
  show() {
    this.init();
    this.render();
    this._panel?.classList.add('show');
  },
  close() { this._panel?.classList.remove('show'); },
  _getCommits() {
    try { return JSON.parse(localStorage.getItem('procode_git_commits') || '[]'); } catch(e) { return []; }
  },
  addCommit(msg) {
    const commits = this._getCommits();
    commits.unshift({ hash: Math.random().toString(36).substr(2,7), msg, time: Date.now(), branch: 'main' });
    if (commits.length > 50) commits.pop();
    localStorage.setItem('procode_git_commits', JSON.stringify(commits));
    if (window.Utils?.toast) Utils.toast(`✅ Committed: ${msg}`, 'success');
    EventBus.emit('git:commit', { msg });
  },
  render() {
    const list = document.getElementById('v24-git-list');
    if (!list) return;
    const commits = this._getCommits();
    if (!commits.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px"><i class="fas fa-code-branch" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>No commits yet<br><small>Use Git → Commit to start tracking</small></div>';
      return;
    }
    const timeAgo = t => { const s = Math.floor((Date.now()-t)/1000); if (s<60) return s+'s ago'; if (s<3600) return Math.floor(s/60)+'m ago'; if (s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; };
    list.innerHTML = commits.map((c, i) => `
      <div class="git-commit-row">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="git-commit-dot" style="background:${i===0?'#6366f1':'#3f3f46'}"></div>
          ${i < commits.length-1 ? '<div style="width:2px;height:24px;background:#27272a;margin-top:2px"></div>' : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div class="git-commit-msg">${c.msg}</div>
          <div class="git-commit-hash">${c.hash} · ${timeAgo(c.time)}</div>
        </div>
        ${i===0?'<span class="git-branch-badge">HEAD</span>':''}
      </div>
    `).join('');
  }
};

/* ══════════════════════════════════════════════
   12. BENTO BOX WELCOME DASHBOARD
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   13. COMMAND PALETTE — New v24 commands
   ══════════════════════════════════════════════ */
function injectV24Commands() {
  const inject = () => {
    try {
      const cp = window.CommandPalette;
      if (!cp?.commands) { setTimeout(inject, 2000); return; }
      const newCmds = [
        { id:'v24-gitgraph', text:'Show Git Graph', icon:'fa-code-branch', action: () => GitGraph.show() },
        { id:'v24-commit', text:'Quick Git Commit', icon:'fa-code-commit', action: () => {
          const msg = prompt('Commit message:'); if (msg) GitGraph.addCommit(msg);
        }},
      ];
      cp.commands = cp.commands.filter(c => !c.id?.startsWith('v24-'));
      cp.commands.push(...newCmds);
    } catch(e) { setTimeout(inject, 2500); }
  };
  setTimeout(inject, 3000);
}

/* ══════════════════════════════════════════════
   14. INTRO TOAST — v24 Loaded confirmation
   ══════════════════════════════════════════════ */
// showV24IntroToast removed — function was never called

/* ══════════════════════════════════════════════
   15. FILESYTEM EVENT INTEGRATION
   ══════════════════════════════════════════════ */
function patchFileSystem() {
  const tryPatch = () => {
    try {
      const fs = window.FileSystem;
      if (!fs?.open && !fs?.read) { setTimeout(tryPatch, 1500); return; }
      // Patch tab open to emit event
      const origTabOpen = window.TabManager?.open;
      if (origTabOpen && !window.TabManager._v24patched) {
        window.TabManager._v24patched = true;
        window.TabManager.open = function(path, ...args) {
          const result = origTabOpen.call(this, path, ...args);
          EventBus.emit('file:opened', { path });
          // BentoDashboard removed
          return result;
        };
      }
    } catch(e) { setTimeout(tryPatch, 2000); }
  };
  setTimeout(tryPatch, 2000);
}

/* ══════════════════════════���═══════════════════
   BOOT SEQUENCE
   ═════════���════════════════════════════════════ */
function v24Boot() {
  if (window.__v24_booted__) return; window.__v24_booted__ = true;
  // v24 banner suppressed
  // v24 init — banner suppressed

  // MinimapHeatmap removed
  try { SelectionToolbar.init(); } catch(e) {}
  try { TypingsManager.init(); } catch(e) {}
  // GhostTextManager removed
  try { SQLiteExplorer.init(); } catch(e) {}
  // ArchCanvas removed
  // SessionRecorder removed
  try { GitGraph.init(); } catch(e) {}
  // BentoDashboard removed
  try { killIntervalPolling(); } catch(e) {}
  try { patchFileSystem(); } catch(e) {}
  try { injectV24Commands(); } catch(e) {}

  // Dashboard auto-show disabled in Unified Edition (use ⋮ menu → Tools → Dashboard)
  // Users can open it from Command Palette or the More menu

  // v24 intro toast suppressed — unified boot notification handles it
  // setTimeout(showV24IntroToast, 1200);
  
  // Expose helpers on window
  window.v24 = { EventBus, WindowManager, SelectionToolbar, TypingsManager, SQLiteExplorer, GitGraph };
}

// Boot after IDE loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v24Boot") : setTimeout(v24Boot, 1000)));
} else {
  (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v24Boot") : setTimeout(v24Boot, 1000));
}

// Also boot when loader overlay disappears
const _loaderObs = new MutationObserver((mutations, obs) => {
  const lo = document.getElementById('loader-overlay');
  if (lo && (lo.style.display === 'none' || lo.style.opacity === '0' || !document.body.contains(lo))) {
    (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v24Boot") : setTimeout(v24Boot, 1000)); obs.disconnect();
  }
});
const _lo = document.getElementById('loader-overlay');
if (_lo) _loaderObs.observe(_lo, { attributes: true, childList: true });

})(); // end PCIDE v24 IIFE