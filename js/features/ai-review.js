/**
 * ai-review.js
 * AI review system, request deduplication, auto-review, cost controls
 * ProCode IDE v3.0
 */

/* =====================================================================
   V30 — THE TRANSCENDENCE PATCH
   ProCode IDE | Maximum Power Release
   ===================================================================== */
(function V30() {
'use strict';

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
const V30 = {
  notify(msg, type = 'info', ms = 3000) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:56px;right:16px;padding:10px 16px;border-radius:8px;font-size:12px;color:#fff;z-index:999999;pointer-events:none;max-width:280px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);animation:v30-panel-in .18s ease;font-family:-apple-system,sans-serif;`;
    const colors = { info:'rgba(99,102,241,.92)', success:'rgba(16,185,129,.92)', warn:'rgba(245,158,11,.92)', error:'rgba(244,63,94,.92)' };
    el.style.background = colors[type] || colors.info;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '0', ms - 300);
    setTimeout(() => el.remove(), ms);
  },
  getEditor() {
    try { return window.monaco?.editor?.getEditors?.()[0] || null; } catch { return null; }
  },
  getCode() { return V30.getEditor()?.getValue() || ''; },
  insertCode(code) {
    const ed = V30.getEditor();
    if (!ed) return;
    const pos = ed.getPosition();
    ed.executeEdits('v30', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1), text: code }]);
    ed.focus();
  },
  togglePanel(id) {
    const p = document.getElementById(id);
    if (p) p.classList.toggle('open');
  },
  openPanel(id) { document.getElementById(id)?.classList.add('open'); },
  closePanel(id) { document.getElementById(id)?.classList.remove('open'); },
};
window.V30 = V30;

// ─────────────────────────────────────────────────────���───────
// ─────────────────────────────────────────────────────────────
// §0b  POMODORO TIMER
// ─────────────────────────────────────────────────────────────
const Pomodoro = (() => {
  let _panel = null, _timer = null, _seconds = 25 * 60, _running = false;
  function _fmt(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
  function _ensurePanel() {
    if (_panel && document.body.contains(_panel)) return _panel;
    _panel = document.createElement('div');
    _panel.id = 'v30-pomodoro-panel';
    _panel.style.cssText = 'position:fixed;bottom:60px;right:16px;z-index:99999;background:var(--bg2,#1e1e2e);border:1px solid var(--border,#333);border-radius:12px;padding:16px 20px;min-width:180px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.5);display:none;font-family:monospace;';
    _panel.innerHTML = '<div style="font-size:11px;opacity:.6;margin-bottom:6px">\u{1F345} POMODORO</div>'
      + '<div id="v30-pomo-display" style="font-size:32px;font-weight:700;color:var(--accent,#6366f1)">' + _fmt(_seconds) + '</div>'
      + '<div style="margin-top:10px;display:flex;gap:6px;justify-content:center">'
      + '<button id="v30-pomo-toggle" style="padding:4px 12px;border-radius:6px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer">\u25B6</button>'
      + '<button id="v30-pomo-reset" style="padding:4px 12px;border-radius:6px;border:none;background:var(--bg3,#2a2a3a);color:#fff;cursor:pointer">\u21BA</button>'
      + '<button id="v30-pomo-close" style="padding:4px 12px;border-radius:6px;border:none;background:var(--bg3,#2a2a3a);color:#fff;cursor:pointer">\u2715</button>'
      + '</div>';
    document.body.appendChild(_panel);
    _panel.querySelector('#v30-pomo-toggle').onclick = function() { _running ? pause() : start(); };
    _panel.querySelector('#v30-pomo-reset').onclick = reset;
    _panel.querySelector('#v30-pomo-close').onclick = hide;
    return _panel;
  }
  function _tick() {
    if (_seconds <= 0) { clearInterval(_timer); _running = false; _seconds = 25*60; _update(); return; }
    _seconds--; _update();
  }
  function _update() {
    var d = _panel && _panel.querySelector('#v30-pomo-display');
    var b = _panel && _panel.querySelector('#v30-pomo-toggle');
    if (d) d.textContent = _fmt(_seconds);
    if (b) b.textContent = _running ? '\u23F8' : '\u25B6';
  }
  function start()  { if (_running) return; _running = true; _timer = setInterval(_tick, 1000); _update(); }
  function pause()  { _running = false; clearInterval(_timer); _update(); }
  function reset()  { pause(); _seconds = 25 * 60; _update(); }
  function show()   { _ensurePanel(); _panel.style.display = 'block'; }
  function hide()   { if (_panel) _panel.style.display = 'none'; }
  function toggle() { _ensurePanel(); _panel.style.display = (_panel.style.display === 'none') ? 'block' : 'none'; }
  function init()   { /* lazy — initialised on first show() */ }
  return { init: init, show: show, hide: hide, toggle: toggle, start: start, pause: pause, reset: reset };
})();
window.Pomodoro = Pomodoro;

// §1  LIVE STATS BAR
// ─────────────────────────────────────────────────────────────
const LiveStats = (() => {
  let _bar = null;
  let _ticker = null;

  function build() {
    if (document.getElementById('v30-stats-bar')) return;
    _bar = document.createElement('div');
    _bar.id = 'v30-stats-bar';
    _bar.innerHTML = `
      <div class="v30-stat-item"><div class="v30-stat-dot"></div><span id="v30s-status">Ready</span></div>
      <div class="v30-stat-item">📄 <span id="v30s-lines" class="v30-stat-val">0</span> lines</div>
      <div class="v30-stat-item">🔤 <span id="v30s-words" class="v30-stat-val">0</span> words</div>
      <div class="v30-stat-item">⚠️ <span id="v30s-errors" class="v30-stat-val">0</span> errors</div>
      <div class="v30-stat-item">📌 <span id="v30s-pos" class="v30-stat-val">1:1</span></div>
      <div class="v30-stat-item" style="margin-left:auto">🌐 <span id="v30s-lang" class="v30-stat-val">—</span></div>
      <div class="v30-stat-item">💾 <span id="v30s-size" class="v30-stat-val">0 B</span></div>
      <div class="v30-stat-item">⏱️ <span id="v30s-time" class="v30-stat-val">—</span></div>
    `;
    document.body.appendChild(_bar);
  }

  function update() {
    try {
      const ed = V30.getEditor();
      if (!ed) return;
      const code = ed.getValue();
      const model = ed.getModel();
      const pos = ed.getPosition();
      const lines = code.split('\n').length;
      const words = code.trim().split(/\s+/).filter(Boolean).length;
      const bytes = new Blob([code]).size;
      const sizeStr = bytes > 1024 ? (bytes/1024).toFixed(1) + ' KB' : bytes + ' B';
      const lang = model?.getLanguageId() || '—';
      const errors = monaco?.editor?.getModelMarkers?.({ resource: model?.uri })?.filter(m => m.severity === 8)?.length ?? 0;

      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('v30s-lines', lines);
      set('v30s-words', words);
      set('v30s-errors', errors);
      set('v30s-pos', `${pos?.lineNumber||1}:${pos?.column||1}`);
      set('v30s-lang', lang);
      set('v30s-size', sizeStr);
      set('v30s-time', new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));

      const errEl = document.querySelector('#v30-stats-bar .v30-stat-item:nth-child(4)');
      if (errEl) {
        errEl.classList.toggle('error', errors > 0);
        errEl.classList.toggle('warn', errors === 0);
      }
    } catch(e) {}
  }

  return {
    init() {
      build();
      _ticker = setInterval(update, 1000);
      try {
        V30.getEditor()?.onDidChangeCursorPosition?.(() => update());
        V30.getEditor()?.onDidChangeModelContent?.(() => update());
      } catch(e) {}
      update();
    }
  };
})();

// ─────────────────────────────────────────────────────────────
// §2  POMODORO TIMER
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// §3  TODO MANAGER
// ─────────────────────────────────────────────────────────────
const TodoManager = (() => {
  const RE = /(?:\/\/|#|<!--)\s*(TODO|FIXME|HACK|NOTE|BUG|XXX)\s*[:\-]?\s*(.+)/gi;

  function scan() {
    const code = V30.getCode();
    const todos = [];
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(code)) !== null) {
      const line = code.slice(0, m.index).split('\n').length;
      todos.push({ type: m[1].toUpperCase(), text: m[2].trim().slice(0, 80), line });
    }
    return todos;
  }

  function render() {
    const list = document.getElementById('v30-todo-list');
    if (!list) return;
    const todos = scan();
    if (!todos.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px">✅ No TODO/FIXME found!</div>';
      return;
    }
    const typeMap = { TODO:'badge-todo', FIXME:'badge-fixme', HACK:'badge-hack', NOTE:'badge-note', BUG:'badge-fixme', XXX:'badge-hack' };
    list.innerHTML = todos.map(t => `
      <div class="v30-todo-item" onclick="TodoManager.jump(${t.line})">
        <span class="v30-todo-badge ${typeMap[t.type]||'badge-todo'}">${t.type}</span>
        <div class="v30-bm-info">
          <div class="v30-todo-text">${t.text.replace(/</g,'&lt;')}</div>
        </div>
        <span class="v30-todo-line">:${t.line}</span>
      </div>
    `).join('');

    // Update summary
    const sumEl = document.getElementById('v30-todo-summary');
    if (sumEl) {
      const counts = { TODO:0, FIXME:0, HACK:0 };
      todos.forEach(t => { if (counts[t.type]!==undefined) counts[t.type]++; });
      sumEl.innerHTML = `
        <span style="color:#818cf8">📌 ${counts.TODO} TODO</span>
        <span style="color:#fca5a5">🔴 ${counts.FIXME} FIXME</span>
        <span style="color:#fde68a">⚠️ ${counts.HACK} HACK</span>
        <span style="margin-left:auto;color:#52525b">${todos.length} total</span>
      `;
    }
  }

  function build() {
    if (document.getElementById('v30-todo-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-todo-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">📌</span>TODO Manager</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-primary" onclick="TodoManager.render()">Refresh</span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-todo-panel')">✕</button>
        </div>
      </div>
      <div id="v30-todo-summary" style="display:flex;gap:12px;padding:8px 14px;background:#0c0c0e;border-bottom:1px solid var(--v30-border);font-size:11px;"></div>
      <div id="v30-todo-list" class="v30-scroller" style="flex:1;max-height:500px;"></div>
    `;
    document.body.appendChild(p);
  }

  return {
    jump(line) {
      const ed = V30.getEditor();
      if (!ed) return;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column: 1 });
      ed.focus();
      V30.closePanel('v30-todo-panel');
    },
    render,
    toggle() { build(); render(); V30.togglePanel('v30-todo-panel'); },
    init() { build(); }
  };
})();
window.TodoManager = TodoManager;

// ───────────────────���────────────────���────────────────────────
// §4  CODE METRICS DASHBOARD
// ─────────────────────────────────────────────────────────────
const CodeMetrics = (() => {
  function analyze(code) {
    const lines = code.split('\n');
    const loc = lines.length;
    const sloc = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
    const comments = lines.filter(l => l.trim().startsWith('//')).length;
    const blanks = lines.filter(l => !l.trim()).length;
    const funcs = (code.match(/function\s+\w+|=>\s*{|=\s*function|\basync\s+\w+\s*\(/g) || []).length;
    const classes = (code.match(/class\s+\w+/g) || []).length;
    const imports = (code.match(/^import\s+|require\s*\(/gm) || []).length;
    const todos = (code.match(/TODO|FIXME|HACK/g) || []).length;
    const maxDepth = (() => {
      let depth = 0, max = 0;
      for (const c of code) { if (c==='{') { depth++; max = Math.max(max,depth); } else if (c==='}') depth--; }
      return max;
    })();
    // Cyclomatic: count branches
    const branches = (code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|\?\?|\?\s*:/g) || []).length;
    const complexity = Math.min(Math.max(1, branches / Math.max(funcs,1)), 10);

    // Language breakdown
    const langLines = {
      JS: lines.filter(l => /function|const |let |var |=>/.test(l)).length,
      CSS: lines.filter(l => /\{|margin|padding|color:|font/.test(l)).length,
      HTML: lines.filter(l => /<[a-z]/.test(l)).length,
    };
    const langTotal = Object.values(langLines).reduce((a,b) => a+b, 0) || 1;

    return { loc, sloc, comments, blanks, funcs, classes, imports, todos, maxDepth, complexity, langLines, langTotal };
  }

  function render() {
    const code = V30.getCode();
    if (!code) return;
    const m = analyze(code);

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('v30m-loc',   m.loc);
    set('v30m-sloc',  m.sloc);
    set('v30m-funcs', m.funcs);
    set('v30m-classes', m.classes);
    set('v30m-depth', m.maxDepth);
    set('v30m-complex', m.complexity.toFixed(1));
    set('v30m-imports', m.imports);
    set('v30m-todos', m.todos);

    // Bar chart
    const bars = document.getElementById('v30-metrics-bars');
    if (bars) {
      const data = [
        { name:'Code', val: m.sloc, max: m.loc, color:'#6366f1' },
        { name:'Comments', val: m.comments, max: m.loc, color:'#10b981' },
        { name:'Blank', val: m.blanks, max: m.loc, color:'#3f3f46' },
        { name:'Functions', val: m.funcs, max: Math.max(m.funcs, 10), color:'#a855f7' },
        { name:'Complexity', val: m.complexity, max: 10, color: m.complexity > 7 ? '#f43f5e' : m.complexity > 4 ? '#f59e0b' : '#10b981' },
      ];
      bars.innerHTML = data.map(d => `
        <div class="v30-bar-row">
          <div class="v30-bar-name">${d.name}</div>
          <div class="v30-bar-track"><div class="v30-bar-fill" style="width:${(d.val/d.max*100).toFixed(1)}%;background:${d.color}"></div></div>
          <div class="v30-bar-val">${typeof d.val === 'number' ? d.val.toFixed(d.val < 10 ? 1 : 0) : d.val}</div>
        </div>
      `).join('');
    }
  }

  function build() {
    if (document.getElementById('v30-metrics-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-metrics-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">📈</span>Code Metrics</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-primary" onclick="CodeMetrics.render()">Analyze</span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-metrics-panel')">✕</button>
        </div>
      </div>
      <div class="v30-metrics-grid">
        <div class="v30-metric-box"><div id="v30m-loc"  class="v30-metric-big">—</div><div class="v30-metric-label">Lines of Code</div></div>
        <div class="v30-metric-box"><div id="v30m-sloc" class="v30-metric-big">—</div><div class="v30-metric-label">Source Lines</div></div>
        <div class="v30-metric-box"><div id="v30m-funcs" class="v30-metric-big">—</div><div class="v30-metric-label">Functions</div></div>
        <div class="v30-metric-box"><div id="v30m-classes" class="v30-metric-big">—</div><div class="v30-metric-label">Classes</div></div>
        <div class="v30-metric-box"><div id="v30m-depth" class="v30-metric-big">—</div><div class="v30-metric-label">Max Nesting</div></div>
        <div class="v30-metric-box"><div id="v30m-complex" class="v30-metric-big">—</div><div class="v30-metric-label">Complexity</div></div>
        <div class="v30-metric-box"><div id="v30m-imports" class="v30-metric-big">—</div><div class="v30-metric-label">Imports</div></div>
        <div class="v30-metric-box"><div id="v30m-todos" class="v30-metric-big">—</div><div class="v30-metric-label">TODOs</div></div>
      </div>
      <div class="v30-metrics-chart">
        <div style="font-size:11px;color:#71717a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Distribution</div>
        <div id="v30-metrics-bars"></div>
      </div>
    `;
    document.body.appendChild(p);
  }

  return {
    render,
    toggle() { build(); render(); V30.togglePanel('v30-metrics-panel'); },
    init() { build(); }
  };
})();
window.CodeMetrics = CodeMetrics;

// ──────────────────────────────────────────────────���──────────
// §5  ENVIRONMENT VARIABLES MANAGER
// ──���──────────────────────────────────────────────────────────
const EnvManager = (() => {
  let vars = [
    { key:'API_URL', val:'https://api.example.com', secret:false },
    { key:'API_KEY', val:'sk-••••••••••••••••', secret:true },
    { key:'NODE_ENV', val:'development', secret:false },
    { key:'PORT', val:'3000', secret:false },
    { key:'DATABASE_URL', val:'postgres://user:pass@localhost/db', secret:true },
  ];

  function render() {
    const list = document.getElementById('v30-env-list');
    if (!list) return;
    list.innerHTML = vars.map((v, i) => `
      <div class="v30-env-row">
        <input class="v30-env-key" value="${v.key}" onchange="EnvManager.update(${i},'key',this.value)" spellcheck="false">
        <input class="v30-env-val ${v.secret ? 'secret' : ''}" value="${v.secret ? '••••••••' : v.val}" type="${v.secret ? 'password' : 'text'}" onchange="EnvManager.update(${i},'val',this.value)" spellcheck="false">
        <button class="v30-env-vis" onclick="EnvManager.toggleSecret(${i})" title="${v.secret ? 'Show' : 'Hide'}">${v.secret ? '👁️' : '🙈'}</button>
        <button class="v30-env-del" onclick="EnvManager.remove(${i})" title="Remove">🗑</button>
      </div>
    `).join('');
  }

  function build() {
    if (document.getElementById('v30-env-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-env-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">🔐</span>Environment Variables</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-green" onclick="EnvManager.add()">+ Add</span>
          <span class="v30-pill v30-pill-primary" onclick="EnvManager.exportDotenv()">Export .env</span>
          <span class="v30-pill v30-pill-yellow" onclick="EnvManager.importDotenv()">Import</span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-env-panel')">✕</button>
        </div>
      </div>
      <div style="padding:6px 14px;background:#0c0c0e;border-bottom:1px solid var(--v30-border);font-size:11px;color:#52525b;display:flex;gap:8px">
        <span>KEY</span><span style="margin-left:148px">VALUE</span>
      </div>
      <div id="v30-env-list" class="v30-scroller" style="flex:1;max-height:440px;"></div>
      <div style="padding:8px 14px;border-top:1px solid var(--v30-border);font-size:11px;color:#52525b">
        💡 Variables are available as <code style="color:#86efac;background:#0c0c0e;padding:1px 4px;border-radius:3px">process.env.KEY</code> in preview
      </div>
    `;
    document.body.appendChild(p);
  }

  return {
    update(i, field, val) { if (vars[i]) vars[i][field] = val; },
    toggleSecret(i) { if (vars[i]) { vars[i].secret = !vars[i].secret; render(); } },
    remove(i) { vars.splice(i, 1); render(); },
    add() {
      vars.push({ key:'NEW_VAR', val:'', secret:false });
      render();
      setTimeout(() => {
        const inputs = document.querySelectorAll('.v30-env-key');
        inputs[inputs.length-1]?.focus();
        inputs[inputs.length-1]?.select();
      }, 50);
    },
    exportDotenv() {
      const content = vars.map(v => `${v.key}=${v.val}`).join('\n');
      const blob = new Blob([content], { type:'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '.env';
      a.click();
      V30.notify('✓ .env exported', 'success');
    },
    importDotenv() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.env,text/plain';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        file.text().then(text => {
          const newVars = text.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
            const [key, ...rest] = l.split('=');
            return { key: key.trim(), val: rest.join('=').trim(), secret: key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('pass') };
          });
          vars = newVars;
          render();
          V30.notify(`✓ Imported ${newVars.length} variables`, 'success');
        });
      };
      input.click();
    },
    getVars() { return vars; },
    toggle() { build(); render(); V30.togglePanel('v30-env-panel'); },
    init() { build(); }
  };
})();
window.EnvManager = EnvManager;

// ─────────────────────────────────────────────────────────────
// §6  CODE SHARE (LZ-String URL)
// ────────────────────────────────────────────────────��────────
const CodeShare = (() => {
  function getShareURL() {
    const code = V30.getCode();
    if (!code.trim()) return null;
    try {
      const ed = V30.getEditor();
      const lang = ed?.getModel()?.getLanguageId() || 'javascript';
      const compressed = LZString?.compressToEncodedURIComponent
        ? LZString.compressToEncodedURIComponent(JSON.stringify({ code, lang }))
        : btoa(encodeURIComponent(JSON.stringify({ code: code.slice(0, 500), lang })));
      return `${location.origin}${location.pathname}#share/${compressed}`;
    } catch(e) { return null; }
  }

  function loadFromURL() {
    const hash = location.hash;
    if (!hash.startsWith('#share/')) return;
    try {
      const data = hash.slice(7);
      const decoded = LZString?.decompressFromEncodedURIComponent
        ? LZString.decompressFromEncodedURIComponent(data)
        : decodeURIComponent(atob(data));
      const { code, lang } = JSON.parse(decoded);
      setTimeout(() => {
        const ed = V30.getEditor();
        if (ed && code) {
          ed.setValue(code);
          V30.notify('✓ Shared code loaded!', 'success');
        }
      }, 3000);
    } catch(e) {}
  }

  function build() {
    if (document.getElementById('v30-share-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-share-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">🔗</span>Share Code</div>
        <button class="v30-btn-close" onclick="V30.closePanel('v30-share-panel')">✕</button>
      </div>
      <div style="padding:16px">
        <div style="font-size:11px;color:#71717a;margin-bottom:8px">Share URL (code encoded in URL — no server needed)</div>
        <textarea id="v30-share-url-area" class="v30-share-url" readonly placeholder="Click Generate to create shareable link…"></textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="v30-btn v30-btn-indigo" onclick="CodeShare.generate()" style="flex:1">🔗 Generate Link</button>
          <button class="v30-btn v30-btn-ghost" onclick="CodeShare.copy()">📋 Copy</button>
        </div>
        <div class="v30-qr-placeholder" id="v30-share-qr">📱</div>
        <div id="v30-share-stats" style="text-align:center;font-size:10px;color:#52525b;margin-top:4px"></div>
        <hr style="border-color:#1a1a1c;margin:12px 0">
        <div style="font-size:11px;color:#71717a;margin-bottom:6px">Embed snippet</div>
        <textarea id="v30-embed-area" class="v30-share-url" style="min-height:40px;font-size:10px" readonly placeholder="Generate link first…"></textarea>
      </div>
    `;
    document.body.appendChild(p);
  }

  return {
    generate() {
      const url = getShareURL();
      const area = document.getElementById('v30-share-url-area');
      const embedArea = document.getElementById('v30-embed-area');
      const stats = document.getElementById('v30-share-stats');
      if (!url) { V30.notify('No code to share', 'warn'); return; }
      if (area) area.value = url;
      if (embedArea) embedArea.value = `<iframe src="${url}" width="800" height="600" frameborder="0"></iframe>`;
      if (stats) stats.textContent = `${url.length} chars · Code: ${V30.getCode().split('\n').length} lines`;
      V30.notify('✓ Share URL generated!', 'success');
    },
    copy() {
      const url = document.getElementById('v30-share-url-area')?.value;
      if (!url) return;
      navigator.clipboard?.writeText(url).then(() => V30.notify('✓ URL copied to clipboard!', 'success')).catch(() => {
        document.getElementById('v30-share-url-area')?.select();
        document.execCommand('copy');
        V30.notify('✓ Copied!', 'success');
      });
    },
    loadFromURL,
    toggle() { build(); V30.togglePanel('v30-share-panel'); },
    init() { build(); loadFromURL(); }
  };
})();
window.CodeShare = CodeShare;

// ───���─────────────────────────────────────────────────────────
// §7  BOOKMARKS
// ─────────────────────────────────────────────────────────────
const Bookmarks = (() => {
  let marks = [];

  function render() {
    const list = document.getElementById('v30-bm-list');
    if (!list) return;
    if (!marks.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px">No bookmarks yet.<br><br>Press <kbd style="background:#18181b;border:1px solid #3f3f46;padding:2px 6px;border-radius:3px;font-size:10px">Ctrl+B</kbd> to bookmark current line.</div>';
      return;
    }
    list.innerHTML = marks.map((m, i) => `
      <div class="v30-bookmark-item">
        <span class="v30-bm-icon">🔖</span>
        <div class="v30-bm-info">
          <div class="v30-bm-line">Line ${m.line} <span style="color:#52525b">${m.file ? '· ' + m.file : ''}</span></div>
          <div class="v30-bm-preview">${m.preview.replace(/</g,'&lt;')}</div>
        </div>
        <button class="v30-bm-del" onclick="Bookmarks.remove(${i})" title="Remove">✕</button>
      </div>
    `).join('') + `<div style="padding:8px 14px;border-top:1px solid #0f0f11;font-size:10px;color:#52525b">${marks.length} bookmark${marks.length!==1?'s':''}</div>`;

    marks.forEach((m, i) => {
      const el = list.children[i];
      if (el) el.querySelector('.v30-bm-info').onclick = () => jump(m.line);
    });
  }

  function jump(line) {
    const ed = V30.getEditor();
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: 1 });
    ed.focus();
    V30.closePanel('v30-bookmarks-panel');
  }

  function addCurrent() {
    const ed = V30.getEditor();
    if (!ed) return;
    const pos = ed.getPosition();
    const line = pos?.lineNumber || 1;
    const preview = ed.getModel()?.getLineContent(line) || '';
    if (marks.some(m => m.line === line)) {
      marks = marks.filter(m => m.line !== line);
      V30.notify(`Bookmark removed (line ${line})`, 'warn', 2000);
    } else {
      marks.push({ line, preview: preview.trim().slice(0, 60) });
      marks.sort((a,b) => a.line - b.line);
      V30.notify(`🔖 Bookmarked line ${line}`, 'success', 2000);
    }
    render();
    // Add gutter decoration
    updateDecorations(ed);
  }

  function updateDecorations(ed) {
    try {
      if (!window._v30BookmarkDecos) window._v30BookmarkDecos = [];
      window._v30BookmarkDecos = ed.deltaDecorations(window._v30BookmarkDecos, marks.map(m => ({
        range: new monaco.Range(m.line, 1, m.line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'v30-bookmark-glyph',
          glyphMarginHoverMessage: { value: '🔖 Bookmark' },
          overviewRuler: { color: '#f59e0b', position: 1 }
        }
      })));
    } catch(e) {}
  }

  function build() {
    if (document.getElementById('v30-bookmarks-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-bookmarks-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">🔖</span>Bookmarks</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-yellow" onclick="Bookmarks.addCurrent()">+ Add Current</span>
          <span class="v30-pill v30-pill-red" onclick="Bookmarks.clearAll()">Clear All</span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-bookmarks-panel')">✕</button>
        </div>
      </div>
      <div id="v30-bm-list" class="v30-scroller" style="flex:1;max-height:500px;"></div>
    `;
    document.body.appendChild(p);
  }

  // CSS for glyph
  const style = document.createElement('style');
  style.textContent = '.v30-bookmark-glyph::before { content:"🔖"; font-size:12px; }';
  document.head.appendChild(style);

  return {
    addCurrent, render,
    remove(i) { marks.splice(i, 1); render(); const ed=V30.getEditor(); if(ed)updateDecorations(ed); },
    clearAll() { marks = []; render(); const ed=V30.getEditor(); if(ed)updateDecorations(ed); },
    next() {
      const ed = V30.getEditor();
      if (!ed || !marks.length) return;
      const cur = ed.getPosition()?.lineNumber || 1;
      const next = marks.find(m => m.line > cur) || marks[0];
      jump(next.line);
    },
    prev() {
      const ed = V30.getEditor();
      if (!ed || !marks.length) return;
      const cur = ed.getPosition()?.lineNumber || 1;
      const prev = [...marks].reverse().find(m => m.line < cur) || marks[marks.length-1];
      jump(prev.line);
    },
    toggle() { build(); render(); V30.togglePanel('v30-bookmarks-panel'); },
    init() { build(); }
  };
})();
window.Bookmarks = Bookmarks;

// ─────────────────────────────────────────────────────────────
// §8  THEME DESIGNER
// ─────────────────────────────────────────────────────────────
const ThemeDesigner = (() => {
  const PRESETS = {
    'Midnight Indigo': { '--v30-bg':'#09090b', '--v30-surface':'#111113', '--v30-primary':'#6366f1', '--v30-accent':'#a855f7' },
    'Emerald Dark':    { '--v30-bg':'#051209', '--v30-surface':'#0a1f0f', '--v30-primary':'#10b981', '--v30-accent':'#34d399' },
    'Crimson Night':   { '--v30-bg':'#0d0608', '--v30-surface':'#180c10', '--v30-primary':'#f43f5e', '--v30-accent':'#fb7185' },
    'Ocean Depths':    { '--v30-bg':'#050a12', '--v30-surface':'#0c1624', '--v30-primary':'#3b82f6', '--v30-accent':'#60a5fa' },
    'Solar Flare':     { '--v30-bg':'#0d0800', '--v30-surface':'#1a1000', '--v30-primary':'#f59e0b', '--v30-accent':'#fbbf24' },
    'Rose Quartz':     { '--v30-bg':'#0d0509', '--v30-surface':'#1a0c14', '--v30-primary':'#ec4899', '--v30-accent':'#f472b6' },
    'Arctic White':    { '--v30-bg':'#fafafa', '--v30-surface':'#ffffff', '--v30-border':'#e4e4e7', '--v30-text':'#09090b', '--v30-muted':'#71717a', '--v30-primary':'#6366f1', '--v30-accent':'#a855f7' },
    'Solarized':       { '--v30-bg':'#002b36', '--v30-surface':'#073642', '--v30-border':'#0d3640', '--v30-text':'#839496', '--v30-primary':'#268bd2', '--v30-accent':'#2aa198' },
  };

  const VARS = [
    { name:'Background',   var:'--v30-bg' },
    { name:'Surface',      var:'--v30-surface' },
    { name:'Border',       var:'--v30-border' },
    { name:'Text',         var:'--v30-text' },
    { name:'Muted',        var:'--v30-muted' },
    { name:'Primary',      var:'--v30-primary' },
    { name:'Accent',       var:'--v30-accent' },
    { name:'Green',        var:'--v30-green' },
    { name:'Red',          var:'--v30-red' },
    { name:'Yellow',       var:'--v30-yellow' },
    { name:'Blue',         var:'--v30-blue' },
  ];

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    const root = document.documentElement;
    Object.entries(preset).forEach(([k, v]) => root.style.setProperty(k, v));
    renderVars();
    V30.notify(`✨ Theme: ${name}`, 'success', 2000);
    document.querySelectorAll('.v30-theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.preset === name));
  }

  function renderVars() {
    const list = document.getElementById('v30-theme-vars');
    if (!list) return;
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    list.innerHTML = VARS.map(v => {
      const currentVal = root.style.getPropertyValue(v.var) || cs.getPropertyValue(v.var).trim();
      return `
        <div class="v30-color-row">
          <div class="v30-color-label">${v.name}</div>
          <input type="color" class="v30-color-preview" value="${currentVal || '#6366f1'}" onchange="ThemeDesigner.setVar('${v.var}', this.value)" title="${v.var}">
          <input class="v30-color-hex" value="${currentVal || '#6366f1'}" oninput="ThemeDesigner.setVar('${v.var}', this.value)">
        </div>
      `;
    }).join('');
  }

  function build() {
    if (document.getElementById('v30-theme-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-theme-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">🎨</span>Theme Designer</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-primary" onclick="ThemeDesigner.export()">Export CSS</span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-theme-panel')">✕</button>
        </div>
      </div>
      <div class="v30-scroller" style="flex:1;">
        <div style="padding:12px 16px;border-bottom:1px solid var(--v30-border)">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Presets</div>
          <div class="v30-theme-swatch-row">
            ${Object.entries(PRESETS).map(([name, p]) => `
              <div class="v30-theme-swatch active" data-preset="${name}"
                style="background:${p['--v30-primary']||'#6366f1'}"
                title="${name}" onclick="ThemeDesigner.applyPreset('${name}')"></div>
            `).join('')}
          </div>
          <div style="font-size:10px;color:#52525b;margin-top:6px" id="v30-theme-preset-name">Click a swatch to apply theme</div>
        </div>
        <div style="padding:12px 16px">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Custom Colors</div>
          <div id="v30-theme-vars"></div>
        </div>
        <div style="padding:12px 16px;border-top:1px solid var(--v30-border)">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Monaco Editor Theme</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['vs-dark','vs','hc-black','hc-light'].map(t => `<span class="v30-pill v30-pill-ghost" style="background:#18181b;color:#a1a1aa;border:1px solid #27272a" onclick="ThemeDesigner.setMonacoTheme('${t}')">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(p);
    renderVars();
  }

  return {
    applyPreset,
    setVar(variable, value) {
      if (!value) return;
      document.documentElement.style.setProperty(variable, value);
      renderVars();
    },
    setMonacoTheme(theme) {
      try { window.monaco?.editor?.setTheme(theme); V30.notify(`Editor theme: ${theme}`, 'info', 2000); } catch(e) {}
    },
    export() {
      const root = document.documentElement;
      const css = `:root {\n${VARS.map(v => `  ${v.var}: ${root.style.getPropertyValue(v.var) || getComputedStyle(root).getPropertyValue(v.var).trim()};`).join('\n')}\n}`;
      navigator.clipboard?.writeText(css).then(() => V30.notify('✓ CSS variables copied!', 'success'));
    },
    renderVars,
    toggle() { build(); renderVars(); V30.togglePanel('v30-theme-panel'); },
    init() { build(); }
  };
})();
window.ThemeDesigner = ThemeDesigner;

// ─────────────────────────────────────────────────────────────
// §9  LIVE MARKDOWN PREVIEW
// ─────────────────────────────────────────────────────────────
const MarkdownPreview = (() => {
  let _open = false;
  let _debounce = null;

  function render() {
    const code = V30.getCode();
    const lang = V30.getEditor()?.getModel()?.getLanguageId() || '';
    const content = document.getElementById('v30-md-content');
    if (!content) return;

    if (lang === 'markdown' || lang === 'md' || /^#|^\*\*|^-\s/.test(code.slice(0,100))) {
      // Render markdown
      if (window.marked) {
        try {
          marked.setOptions({ gfm:true, breaks:true });
          // XSS guard: strip dangerous event handlers and javascript: URIs before setting innerHTML
          const _rawMd = marked.parse(code);
          content.innerHTML = _rawMd
            .replace(/(<[^>]+)\s+on\w+\s*=\s*["'][^"']*["']/gi, '$1')
            .replace(/javascript\s*:/gi, 'void:')
            .replace(/data\s*:\s*text\/html/gi, 'data:blocked');
          // Syntax highlight code blocks
          content.querySelectorAll('pre code').forEach(el => {
            if (window.Prism) Prism.highlightElement(el);
          });
        } catch(e) { content.textContent = code; }
      } else {
        // Fallback renderer
        content.innerHTML = code
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/^######\s(.+)/gm, '<h6>$1</h6>')
          .replace(/^#####\s(.+)/gm, '<h5>$1</h5>')
          .replace(/^####\s(.+)/gm, '<h4>$1</h4>')
          .replace(/^###\s(.+)/gm, '<h3>$1</h3>')
          .replace(/^##\s(.+)/gm, '<h2>$1</h2>')
          .replace(/^#\s(.+)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.+?)__/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
          .replace(/^---+$/gm, '<hr>')
          .replace(/^>\s(.+)/gm, '<blockquote>$1</blockquote>')
          .replace(/^[-*]\s(.+)/gm, '<li>$1</li>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(?!<[h|b|p|l|h|u|o|c])/gm, '');
      }
    } else {
      // Show code preview for non-markdown
      content.innerHTML = _sanitize(`<div style="color:#71717a;font-size:12px;margin-bottom:12px">Preview (${lang} rendering)</div><pre style="background:#0c0c0e;padding:16px;border-radius:8px;border:1px solid #27272a;overflow-x:auto"><code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#e4e4e7">${code.replace(/</g,'&lt;').slice(0,5000)}</code></pre>`);
    }
  }

  function build() {
    if (document.getElementById('v30-md-preview')) return;
    const p = document.createElement('div');
    p.id = 'v30-md-preview';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">👁️</span>Live Preview</div>
        <div class="v30-ph-actions">
          <span class="v30-pill v30-pill-primary" onclick="MarkdownPreview.render()">Refresh</span>
          <button class="v30-btn-close" onclick="MarkdownPreview.close()">✕</button>
        </div>
      </div>
      <div id="v30-md-content"></div>
    `;
    document.body.appendChild(p);
  }

  function watchEditor() {
    const ed = V30.getEditor();
    if (!ed) return;
    ed.onDidChangeModelContent(() => {
      if (!_open) return;
      clearTimeout(_debounce);
      _debounce = setTimeout(render, 400);
    });
  }

  return {
    render,
    close() { _open = false; V30.closePanel('v30-md-preview'); },
    toggle() {
      build();
      _open = !_open;
      if (_open) {
        V30.openPanel('v30-md-preview');
        watchEditor();
        render();
      } else {
        V30.closePanel('v30-md-preview');
      }
    },
    init() { build(); }
  };
})();
window.MarkdownPreview = MarkdownPreview;

// ─────────────────────────────────────────────────────────────
// §10  PROJECT TEMPLATES GALLERY
// ─────────────────���───────────────────────────────────────────
const Templates = (() => {
  const TEMPLATES = [
    { icon:'⚛️', name:'React App', tag:'React', desc:'Modern React 18 with hooks, context, and routing', lang:'jsx', code:`import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div className="app">
      <h1>React App 🚀</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

export default App;` },
    { icon:'🟩', name:'Express API', tag:'Node.js', desc:'REST API with Express, middleware, and error handling', lang:'javascript', code:`const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.path}\`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/items', async (req, res) => {
  try {
    const items = [{ id: 1, name: 'Item One' }];
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => console.log(\`Server on :\${PORT}\`));` },
    { icon:'🐍', name:'Python FastAPI', tag:'Python', desc:'FastAPI with Pydantic models and async routes', lang:'python', code:`from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="My API", version="1.0.0")

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_at: datetime = datetime.now()

items: List[Item] = []

@app.get("/")
async def root():
    return {"message": "FastAPI running!", "docs": "/docs"}

@app.get("/items", response_model=List[Item])
async def get_items():
    return items

@app.post("/items", response_model=Item, status_code=201)
async def create_item(item: Item):
    item.id = len(items) + 1
    items.append(item)
    return item

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    item = next((i for i in items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item` },
    { icon:'🦕', name:'TypeScript + Zod', tag:'TypeScript', desc:'Type-safe API with Zod schema validation', lang:'typescript', code:`import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator']),
  createdAt: z.date().default(new Date()),
});

type User = z.infer<typeof UserSchema>;

// Repository pattern
class UserRepository {
  private users: Map<number, User> = new Map();

  async findById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user = UserSchema.parse({
      ...data,
      id: this.users.size + 1,
      createdAt: new Date(),
    });
    this.users.set(user.id, user);
    return user;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

const repo = new UserRepository();
export { repo, type User, UserSchema };` },
    { icon:'🎨', name:'Tailwind Landing', tag:'HTML', desc:'Beautiful landing page with Tailwind CSS', lang:'html', code:`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Product</title>
  <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"><\/script>
</head>
<body class="bg-gray-950 text-white min-h-screen">
  <nav class="flex items-center justify-between px-8 py-4 border-b border-gray-800">
    <div class="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
      MyProduct
    </div>
    <div class="flex gap-6 text-sm text-gray-400">
      <a href="#" class="hover:text-white transition">Features</a>
      <a href="#" class="hover:text-white transition">Pricing</a>
      <a href="#" class="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition">Get Started</a>
    </div>
  </nav>
  <main class="max-w-5xl mx-auto px-8 py-24 text-center">
    <h1 class="text-6xl font-black mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
      Ship Faster.<br>Break Less.
    </h1>
    <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
      The developer platform that makes you 10x more productive.
    </p>
    <div class="flex gap-4 justify-center">
      <button class="px-8 py-4 bg-purple-600 rounded-xl text-lg font-bold hover:bg-purple-700 transition transform hover:-translate-y-1">
        Start Free Trial →
      </button>
      <button class="px-8 py-4 border border-gray-700 rounded-xl text-lg hover:border-gray-500 transition">
        View Demo
      </button>
    </div>
  </main>
</body>
</html>` },
    { icon:'📦', name:'GraphQL Schema', tag:'GraphQL', desc:'Complete GraphQL schema with resolvers', lang:'javascript', code:`const { ApolloServer, gql } = require('@apollo/server');

const typeDefs = gql\`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    published: Boolean!
    createdAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts(published: Boolean): [Post!]!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String!, authorId: ID!): Post!
    publishPost(id: ID!): Post!
  }
\`;

const resolvers = {
  Query: {
    users: () => [],
    user: (_, { id }) => null,
    posts: (_, { published }) => [],
  },
  Mutation: {
    createUser: (_, args) => ({ id: '1', ...args, posts: [], createdAt: new Date().toISOString() }),
    createPost: (_, args) => ({ id: '1', ...args, published: false, createdAt: new Date().toISOString() }),
    publishPost: (_, { id }) => null,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });` },
    { icon:'🐳', name:'Docker + Node', tag:'DevOps', desc:'Production-ready Dockerfile for Node.js', lang:'dockerfile', code:`# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=deps   /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]` },
    { icon:'🗄️', name:'Prisma Schema', tag:'Database', desc:'Prisma ORM schema with relations', lang:'prisma', code:`// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  role      Role      @default(USER)
  posts     Post[]
  profile   Profile?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([email])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  tags      Tag[]
  createdAt DateTime @default(now())

  @@index([authorId])
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}` },
    { icon:'🤖', name:'AI Agent', tag:'AI', desc:'LangChain-style AI agent with tools', lang:'python', code:`import os
from typing import List, Dict, Any

class Tool:
    def __init__(self, name: str, description: str, func):
        self.name = name
        self.description = description
        self.func = func
    
    def run(self, input_str: str) -> str:
        return self.func(input_str)

class Agent:
    def __init__(self, model_name: str = "claude-3", tools: List[Tool] = None):
        self.model_name = model_name
        self.tools = {t.name: t for t in (tools or [])}
        self.history: List[Dict[str, str]] = []
        self.max_iterations = 5
    
    def _format_tools(self) -> str:
        return "\\n".join([f"- {t.name}: {t.description}" for t in self.tools.values()])
    
    def _parse_action(self, response: str) -> tuple[str, str]:
        if "Action:" in response and "Input:" in response:
            action = response.split("Action:")[1].split("\\n")[0].strip()
            inp = response.split("Input:")[1].split("\\n")[0].strip()
            return action, inp
        return "Final Answer", response
    
    def run(self, query: str) -> str:
        self.history.append({"role": "user", "content": query})
        
        for iteration in range(self.max_iterations):
            # Simulate agent reasoning
            action, action_input = self._parse_action(
                self._think(query, iteration)
            )
            
            if action == "Final Answer":
                return action_input
            
            if action in self.tools:
                observation = self.tools[action].run(action_input)
                self.history.append({
                    "role": "assistant", 
                    "content": f"Observation: {observation}"
                })
        
        return "Max iterations reached"
    
    def _think(self, query: str, step: int) -> str:
        # In production, call your LLM here
        return f"Final Answer: Processed '{query}' in {step+1} steps"

# Usage
calculator = Tool("calculator", "Performs math calculations", eval)
agent = Agent(tools=[calculator])
result = agent.run("What is 42 * 1337?")
print(result)` },
    { icon:'⚡', name:'Vite Config', tag:'Build', desc:'Optimized Vite configuration', lang:'javascript', code:`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    // Add more plugins here
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    }
  },
  
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    }
  },
  
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  },
  
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
  }
}));` },
  ];

  function build() {
    if (document.getElementById('v30-templates-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-templates-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">📋</span>Project Templates</div>
        <div class="v30-ph-actions">
          <input placeholder="Filter…" oninput="Templates.filter(this.value)" style="background:#18181b;border:1px solid #27272a;border-radius:6px;padding:4px 10px;color:#f4f4f5;font-size:11px;outline:none;width:100px">
          <button class="v30-btn-close" onclick="V30.closePanel('v30-templates-panel')">✕</button>
        </div>
      </div>
      <div class="v30-template-grid v30-scroller" id="v30-template-grid" style="max-height:calc(85vh - 60px);">
        ${TEMPLATES.map((t, i) => `
          <div class="v30-template-card" data-name="${t.name.toLowerCase()}" onclick="Templates.use(${i})">
            <div class="v30-template-icon">${t.icon}</div>
            <div class="v30-template-name">${t.name}</div>
            <div class="v30-template-desc">${t.desc}</div>
            <span class="v30-template-tag">${t.tag}</span>
          </div>
        `).join('')}
      </div>
    `;
    document.body.appendChild(p);
  }

  return {
    use(i) {
      const t = TEMPLATES[i];
      if (!t) return;
      const ed = V30.getEditor();
      if (ed) {
        ed.setValue(t.code);
        try { monaco.editor.setModelLanguage(ed.getModel(), t.lang); } catch(e) {}
        V30.closePanel('v30-templates-panel');
        V30.notify(`✓ Template loaded: ${t.name}`, 'success');
      }
    },
    filter(q) {
      document.querySelectorAll('#v30-template-grid .v30-template-card').forEach(el => {
        el.style.display = !q || el.dataset.name.includes(q.toLowerCase()) ? '' : 'none';
      });
    },
    toggle() { build(); V30.togglePanel('v30-templates-panel'); },
    init() { build(); }
  };
})();
window.Templates = Templates;

// ─────────────────────────────────────────────────────────────
// §11  ZEN MODE
// ─────────────────────────────────────────────────────────────
const ZenMode = (() => {
  let _open = false;
  let _zenEditor = null;
  let _wordCount = 0;
  let _startTime = null;

  function build() {
    if (document.getElementById('v30-zen-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'v30-zen-overlay';
    overlay.innerHTML = `
      <div id="v30-zen-editor"></div>
      <button id="v30-zen-exit" onclick="ZenMode.toggle()">✕ Exit Zen Mode (Esc)</button>
      <div id="v30-zen-stats">
        <span id="v30-zen-wc">0 words</span>
        <span id="v30-zen-time">0:00</span>
        <span id="v30-zen-pos">1:1</span>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function updateStats() {
    if (!_zenEditor || !_open) return;
    const code = _zenEditor.getValue();
    const words = code.trim().split(/\s+/).filter(Boolean).length;
    const pos = _zenEditor.getPosition();
    const elapsed = _startTime ? Math.floor((Date.now() - _startTime) / 1000) : 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('v30-zen-wc', `${words} words`);
    set('v30-zen-time', `${mins}:${String(secs).padStart(2,'0')}`);
    set('v30-zen-pos', `${pos?.lineNumber||1}:${pos?.column||1}`);
  }

  return {
    toggle() {
      build();
      _open = !_open;
      const overlay = document.getElementById('v30-zen-overlay');
      if (!overlay) return;

      if (_open) {
        overlay.classList.add('open');
        _startTime = Date.now();
        const code = V30.getCode();
        const lang = V30.getEditor()?.getModel()?.getLanguageId() || 'javascript';

        if (!_zenEditor && window.monaco) {
          try {
            _zenEditor = monaco.editor.create(document.getElementById('v30-zen-editor'), {
              value: code,
              language: lang,
              theme: 'vs-dark',
              fontSize: 18,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: 'off',
              minimap: { enabled: false },
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              overviewRulerLanes: 0,
              folding: false,
              wordWrap: 'bounded',
              wordWrapColumn: 80,
              padding: { top: 40, bottom: 40 },
              renderLineHighlight: 'none',
              fontLigatures: true,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            });
            _zenEditor.onDidChangeCursorPosition(() => updateStats());
            _zenEditor.onDidChangeModelContent(() => {
              updateStats();
              // Sync back to main editor
              const mainEd = V30.getEditor();
              if (mainEd) mainEd.setValue(_zenEditor.getValue());
            });
            setInterval(() => { if (_open) updateStats(); }, 1000);
          } catch(e) {}
        } else if (_zenEditor) {
          _zenEditor.setValue(code);
          try { monaco.editor.setModelLanguage(_zenEditor.getModel(), lang); } catch(e) {}
        }

        setTimeout(() => _zenEditor?.focus(), 100);
        V30.notify('🧘 Zen Mode — Press Esc to exit', 'info', 3000);
      } else {
        overlay.classList.remove('open');
        if (_zenEditor) {
          const code = _zenEditor.getValue();
          V30.getEditor()?.setValue(code);
        }
      }
    },
    init() { build(); }
  };
})();
window.ZenMode = ZenMode;

// ───────────────────────���─────────────────────────────────────
// §12  BUILD SYSTEM UI
// ─────────────────────────────────────────────────────────────
const BuildSystem = (() => {
  let _building = false;

  const SCRIPTS = {
    'build:prod': {
      label: '📦 Production Build',
      steps: [
        { msg: 'Cleaning dist/…', delay: 200, type: 'info' },
        { msg: 'TypeScript compilation…', delay: 800, type: 'info' },
        { msg: '  src/index.ts', delay: 100, type: '' },
        { msg: '  src/components/*.tsx (23 files)', delay: 100, type: '' },
        { msg: '  src/utils/*.ts (8 files)', delay: 100, type: '' },
        { msg: '✓ TypeScript: 0 errors', delay: 200, type: 'success' },
        { msg: 'Bundling with Rollup…', delay: 300, type: 'info' },
        { msg: '  tree-shaking: removed 42 unused exports', delay: 400, type: '' },
        { msg: '  code splitting: 3 chunks', delay: 200, type: '' },
        { msg: 'Minifying with Terser…', delay: 600, type: 'info' },
        { msg: '  dist/index.js      → 12.4 kB (gzipped: 4.2 kB)', delay: 300, type: 'success' },
        { msg: '  dist/vendor.js     → 89.2 kB (gzipped: 28.7 kB)', delay: 100, type: 'success' },
        { msg: '  dist/index.css     → 8.1 kB (gzipped: 2.3 kB)', delay: 100, type: 'success' },
        { msg: 'Generating sourcemaps…', delay: 200, type: 'info' },
        { msg: '✓ Build complete in 3.2s', delay: 100, type: 'success' },
      ]
    },
    'build:dev': {
      label: '🛠 Development Build',
      steps: [
        { msg: 'Starting dev server…', delay: 200, type: 'info' },
        { msg: '  Vite v5.0.0', delay: 100, type: '' },
        { msg: '  Local:   http://localhost:3000/', delay: 100, type: 'success' },
        { msg: '  Network: http://192.168.1.x:3000/', delay: 100, type: '' },
        { msg: '✓ Ready in 312ms', delay: 200, type: 'success' },
      ]
    },
    'test': {
      label: '🧪 Run Tests',
      steps: [
        { msg: 'Running Vitest…', delay: 200, type: 'info' },
        { msg: '  ✓ components/Button.test.tsx (8ms)', delay: 300, type: 'success' },
        { msg: '  ✓ utils/format.test.ts (2ms)', delay: 150, type: 'success' },
        { msg: '  ✗ api/auth.test.ts (45ms)', delay: 200, type: 'error' },
        { msg: '    AssertionError: expected "401" to equal "200"', delay: 50, type: 'error' },
        { msg: '  ✓ hooks/useStore.test.ts (12ms)', delay: 200, type: 'success' },
        { msg: 'Tests: 3 passed | 1 failed | 4 total', delay: 100, type: 'warn' },
        { msg: 'Coverage: 78.4% (target: 80%)', delay: 100, type: 'warn' },
      ]
    },
    'lint': {
      label: '🔍 Lint & Format',
      steps: [
        { msg: 'ESLint running…', delay: 300, type: 'info' },
        { msg: '  src/App.tsx  1:15  warning  React Hook missing dependency', delay: 200, type: 'warn' },
        { msg: '  src/api.ts   34:1  error    Unexpected console statement', delay: 100, type: 'error' },
        { msg: 'Prettier formatting…', delay: 400, type: 'info' },
        { msg: '  12 files reformatted', delay: 200, type: 'success' },
        { msg: '✓ Lint: 1 error, 1 warning', delay: 100, type: 'warn' },
      ]
    },
    'docker': {
      label: '🐳 Docker Build',
      steps: [
        { msg: 'docker build -t myapp:latest .', delay: 100, type: 'info' },
        { msg: '[1/4] FROM node:20-alpine', delay: 500, type: '' },
        { msg: '[2/4] COPY package*.json ./', delay: 200, type: '' },
        { msg: '[3/4] RUN npm ci --only=production', delay: 1200, type: '' },
        { msg: '[4/4] COPY . .', delay: 300, type: '' },
        { msg: 'Successfully built a3f8b2c1d4e5', delay: 200, type: 'success' },
        { msg: 'Image size: 142MB → 89MB (compressed)', delay: 100, type: 'success' },
      ]
    },
  };

  async function run(scriptKey) {
    if (_building) return;
    _building = true;
    const script = SCRIPTS[scriptKey];
    if (!script) return;

    const output = document.getElementById('v30-build-output');
    const progress = document.getElementById('v30-build-progress-fill');
    const title = document.getElementById('v30-build-title');
    if (!output) return;

    output.innerHTML = '';
    if (title) title.textContent = script.label;

    const append = (msg, type) => {
      const line = document.createElement('div');
      line.className = type ? `v30-build-line-${type}` : '';
      line.style.cssText = 'padding:1px 0';
      line.textContent = msg;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    append(`> ${script.label}`, 'info');
    append(`  ${new Date().toLocaleTimeString()}`, 'timing');
    append('', '');

    let step = 0;
    for (const s of script.steps) {
      await new Promise(r => setTimeout(r, s.delay));
      append(s.msg, s.type);
      step++;
      if (progress) progress.style.width = `${(step / script.steps.length) * 100}%`;
    }

    append('', '');
    append(`  Finished in ${(script.steps.reduce((a,b) => a+b.delay, 0)/1000).toFixed(1)}s`, 'timing');
    _building = false;
    V30.notify(`${script.label} complete`, 'success');
  }

  function build() {
    if (document.getElementById('v30-build-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-build-panel';
    p.className = 'v30-panel';
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">⚙️</span>Build System</div>
        <div class="v30-ph-actions">
          <span id="v30-build-title" style="font-size:11px;color:#71717a"></span>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-build-panel')">✕</button>
        </div>
      </div>
      <div class="v30-build-progress"><div id="v30-build-progress-fill" class="v30-build-progress-fill" style="width:0%"></div></div>
      <div class="v30-build-btn-row">
        ${Object.entries(SCRIPTS).map(([k, s]) => `<button class="v30-btn v30-btn-ghost" onclick="BuildSystem.run('${k}')" style="font-size:11px">${s.label}</button>`).join('')}
      </div>
      <div id="v30-build-output" class="v30-build-output" style="min-height:300px;">
        <span style="color:#52525b">Select a script to run…</span>
      </div>
    `;
    document.body.appendChild(p);
  }

  return {
    run,
    toggle() { build(); V30.togglePanel('v30-build-panel'); },
    init() { build(); }
  };
})();
window.BuildSystem = BuildSystem;

// ─────────────────────────────────────────────────────────────
// §13  INLINE COLOR PICKER
// ─────────────────────────────────────────────────────────────
const ColorPicker = (() => {
  let _hue = 220, _sat = 70, _val = 90;
  let _canvas = null, _ctx = null;
  let _onPick = null;

  const PALETTES = ['#6366f1','#a855f7','#ec4899','#f43f5e','#f59e0b','#10b981','#3b82f6','#06b6d4','#ffffff','#000000','#71717a','#09090b'];

  function hsv2hex(h, s, v) {
    s /= 100; v /= 100;
    const f = n => { const k = (n + h/60) % 6; return v - v*s*Math.max(Math.min(k,4-k,1), 0); };
    const r = Math.round(f(5)*255), g = Math.round(f(3)*255), b = Math.round(f(1)*255);
    return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
  }

  function hex2hsv(hex) {
    let r=0,g=0,b=0;
    if (hex.length === 7) { r=parseInt(hex.slice(1,3),16); g=parseInt(hex.slice(3,5),16); b=parseInt(hex.slice(5,7),16); }
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0, s=max===0?0:d/max, v=max;
    if (d!==0) { h=max===r?(g-b)/d%6:max===g?(b-r)/d+2:(r-g)/d+4; h=Math.round(h*60); if(h<0)h+=360; }
    return [h, Math.round(s*100), Math.round(v*100)];
  }

  function drawCanvas() {
    if (!_canvas || !_ctx) return;
    const W = _canvas.width, H = _canvas.height;
    // Saturation/Value gradient
    const grad1 = _ctx.createLinearGradient(0,0,W,0);
    grad1.addColorStop(0, 'white');
    grad1.addColorStop(1, `hsl(${_hue},100%,50%)`);
    _ctx.fillStyle = grad1; _ctx.fillRect(0,0,W,H);
    const grad2 = _ctx.createLinearGradient(0,0,0,H);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(1, 'black');
    _ctx.fillStyle = grad2; _ctx.fillRect(0,0,W,H);
    // Cursor
    const x = (_sat/100)*W, y = (1-_val/100)*H;
    _ctx.beginPath(); _ctx.arc(x,y,6,0,Math.PI*2);
    _ctx.strokeStyle='#fff'; _ctx.lineWidth=2; _ctx.stroke();
    _ctx.beginPath(); _ctx.arc(x,y,5,0,Math.PI*2);
    _ctx.strokeStyle='#000'; _ctx.lineWidth=1; _ctx.stroke();
  }

  function updateOutputs() {
    const hex = hsv2hex(_hue, _sat, _val);
    const el = document.getElementById('v30-cp-hex');
    const preview = document.getElementById('v30-cp-preview');
    if (el) el.value = hex;
    if (preview) preview.style.background = hex;
    // RGB
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    const rgbEl = document.getElementById('v30-cp-rgb');
    const hslEl = document.getElementById('v30-cp-hsl');
    if (rgbEl) rgbEl.value = `rgb(${r},${g},${b})`;
    if (hslEl) hslEl.value = `hsl(${_hue},${_sat}%,${Math.round(_val/2)}%)`;
    if (_onPick) _onPick(hex);
    drawCanvas();
  }

  function build() {
    if (document.getElementById('v30-color-picker')) return;
    const p = document.createElement('div');
    p.id = 'v30-color-picker';
    p.innerHTML = `
      <div class="v30-ph" style="padding:8px 12px">
        <div class="v30-ph-title" style="font-size:12px"><span class="v30-ph-icon">🎨</span>Color Picker</div>
        <div class="v30-ph-actions">
          <div id="v30-cp-preview" style="width:20px;height:20px;border-radius:4px;border:1px solid #3f3f46;background:#6366f1"></div>
          <button class="v30-btn-close" onclick="V30.closePanel('v30-color-picker')">✕</button>
        </div>
      </div>
      <canvas id="v30-cp-canvas" class="v30-color-canvas" width="260" height="160"></canvas>
      <input type="range" id="v30-cp-hue" class="v30-hue-slider" min="0" max="360" value="220">
      <div class="v30-color-outputs">
        <input id="v30-cp-hex" class="v30-color-out" value="#6366f1" placeholder="#hex">
        <input id="v30-cp-rgb" class="v30-color-out" value="rgb(99,102,241)" placeholder="rgb()" readonly>
        <input id="v30-cp-hsl" class="v30-color-out" value="hsl(239,83%,67%)" placeholder="hsl()" readonly>
      </div>
      <div class="v30-color-swatches">
        ${PALETTES.map(c => `<div class="v30-swatch" style="background:${c}" onclick="ColorPicker.pick('${c}')" title="${c}"></div>`).join('')}
      </div>
      <div style="padding:0 12px 10px;display:flex;gap:6px">
        <button class="v30-btn v30-btn-indigo" style="flex:1;font-size:11px" onclick="ColorPicker.copyHex()">📋 Copy HEX</button>
        <button class="v30-btn v30-btn-ghost" style="flex:1;font-size:11px" onclick="ColorPicker.insertInEditor()">⬇ Insert</button>
      </div>
    `;
    document.body.appendChild(p);

    _canvas = document.getElementById('v30-cp-canvas');
    _ctx = _canvas?.getContext('2d');

    // Canvas mouse/touch events
    const onCanvas = (e) => {
      const rect = _canvas.getBoundingClientRect();
      const x = Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
      const y = Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
      _sat = Math.round(x*100); _val = Math.round((1-y)*100);
      updateOutputs();
    };
    _canvas?.addEventListener('mousedown', e => { onCanvas(e); _canvas.addEventListener('mousemove', onCanvas); });
    document.addEventListener('mouseup', () => _canvas?.removeEventListener('mousemove', onCanvas));

    // Hue slider
    document.getElementById('v30-cp-hue')?.addEventListener('input', e => {
      _hue = +e.target.value; updateOutputs();
    });

    // HEX input
    document.getElementById('v30-cp-hex')?.addEventListener('input', e => {
      const hex = e.target.value;
      if (/^#[0-9a-f]{6}$/i.test(hex)) {
        [_hue, _sat, _val] = hex2hsv(hex);
        const hueSlider = document.getElementById('v30-cp-hue');
        if (hueSlider) hueSlider.value = _hue;
        updateOutputs();
      }
    });

    updateOutputs();
  }

  return {
    pick(hex) {
      [_hue, _sat, _val] = hex2hsv(hex);
      const hueSlider = document.getElementById('v30-cp-hue');
      if (hueSlider) hueSlider.value = _hue;
      updateOutputs();
    },
    copyHex() {
      const hex = document.getElementById('v30-cp-hex')?.value || '';
      navigator.clipboard?.writeText(hex).then(() => V30.notify(`✓ Copied ${hex}`, 'success', 2000));
    },
    insertInEditor() {
      const hex = document.getElementById('v30-cp-hex')?.value || '';
      V30.insertCode(hex);
      V30.closePanel('v30-color-picker');
      V30.notify(`✓ Inserted ${hex}`, 'success', 2000);
    },
    onColorPick(cb) { _onPick = cb; },
    toggle() { build(); V30.togglePanel('v30-color-picker'); },
    init() { build(); }
  };
})();
window.ColorPicker = ColorPicker;

// ─────────────────────────────────────────────────────────────
// §14  KEYBOARD SHORTCUT MANAGER
// ─────────────────────────────────────────────────────────────
const ShortcutManager = (() => {
  const shortcuts = [
    // V30
    { name:'Toggle Zen Mode',           keys:'Ctrl+Alt+Z',  cat:'V30',    action:() => ZenMode.toggle() },
    { name:'Markdown Preview',          keys:'Ctrl+Alt+M',  cat:'V30',    action:() => MarkdownPreview.toggle() },
    { name:'TODO Manager',              keys:'Ctrl+Alt+T',  cat:'V30',    action:() => TodoManager.toggle() },
    { name:'Code Metrics',              keys:'Ctrl+Alt+Q',  cat:'V30',    action:() => CodeMetrics.toggle() },
    { name:'Theme Designer',            keys:'Ctrl+Alt+D',  cat:'V30',    action:() => ThemeDesigner.toggle() },
    { name:'Project Templates',         keys:'Ctrl+Alt+N',  cat:'V30',    action:() => Templates.toggle() },
    { name:'Bookmark Current Line',     keys:'Ctrl+B',      cat:'V30',    action:() => Bookmarks.addCurrent() },
    { name:'Next Bookmark',             keys:'Ctrl+Alt+.',  cat:'V30',    action:() => Bookmarks.next() },
    { name:'Prev Bookmark',             keys:'Ctrl+Alt,,',  cat:'V30',    action:() => Bookmarks.prev() },
    { name:'Share Code',                keys:'Ctrl+Alt+S',  cat:'V30',    action:() => CodeShare.toggle() },
    { name:'Color Picker',              keys:'Ctrl+Alt+C',  cat:'V30',    action:() => ColorPicker.toggle() },
    { name:'Pomodoro Timer',            keys:'Ctrl+Alt+P',  cat:'V30',    action:() => Pomodoro.show() },
    { name:'Build System',              keys:'Ctrl+Alt+B',  cat:'V30',    action:() => BuildSystem.toggle() },
    { name:'Env Variables',             keys:'Ctrl+Alt+E',  cat:'V30',    action:() => EnvManager.toggle() },
    // V29
    { name:'Git Engine',                keys:'Ctrl+Shift+G', cat:'V29',   action:() => window.GitEngine?.toggle() },
    { name:'AI Pair Programmer',        keys:'Ctrl+Shift+P', cat:'V29',   action:() => window.AIPairProgrammer?.toggle() },
    { name:'REST Client',               keys:'Ctrl+Shift+R', cat:'V29',   action:() => window.RestClient?.toggle() },
    { name:'Run Tests',                 keys:'Ctrl+Shift+T', cat:'V29',   action:() => window.TestRunner?.toggle() },
    { name:'JSON Explorer',             keys:'Ctrl+Shift+J', cat:'V29',   action:() => window.JSONExplorer?.toggle() },
    { name:'Regex Lab',                 keys:'Ctrl+Shift+X', cat:'V29',   action:() => window.RegexLab?.toggle() },
    { name:'Global Search',             keys:'Ctrl+Shift+F', cat:'V29',   action:() => window.GlobalSearch?.toggle() },
    // V28
    { name:'3D Code City',              keys:'Ctrl+Shift+C', cat:'V28',   action:() => window.CodeCity3D?.toggle() },
  { name:'Multi-Agent AI',            keys:'Ctrl+Shift+A', cat:'V28',   action:() => window.MultiAgentAI?.toggle() },
  // Multiplayer entry removed — feature was preview-only
  // Editor
    { name:'Command Palette',           keys:'Ctrl+Shift+K', cat:'Editor', action:() => window.CommandPalette?.show() },
    { name:'Format Code (Prettier)',    keys:'Ctrl+Shift+L', cat:'Editor', action:() => {} },
    { name:'Toggle Word Wrap',          keys:'Alt+Z',        cat:'Editor', action:() => {} },
  ];

  function build() {
    if (document.getElementById('v30-shortcuts-panel')) return;
    const p = document.createElement('div');
    p.id = 'v30-shortcuts-panel';
    p.className = 'v30-panel';

    const cats = [...new Set(shortcuts.map(s => s.cat))];
    p.innerHTML = `
      <div class="v30-ph">
        <div class="v30-ph-title"><span class="v30-ph-icon">⌨️</span>Keyboard Shortcuts</div>
        <div class="v30-ph-actions">
          <input placeholder="Search…" oninput="ShortcutManager.filter(this.value)" style="background:#18181b;border:1px solid #27272a;border-radius:6px;padding:4px 10px;color:#f4f4f5;font-size:11px;outline:none;width:120px">
          <button class="v30-btn-close" onclick="V30.closePanel('v30-shortcuts-panel')">✕</button>
        </div>
      </div>
      <div class="v30-scroller" id="v30-sc-list" style="flex:1;max-height:calc(85vh - 60px);">
        ${cats.map(cat => `
          <div style="padding:6px 14px;background:#0c0c0e;border-bottom:1px solid var(--v30-border);font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0">${cat}</div>
          ${shortcuts.filter(s => s.cat === cat).map((s, i) => `
            <div class="v30-shortcut-row" data-name="${s.name.toLowerCase()} ${s.cat.toLowerCase()}">
              <div class="v30-shortcut-name">${s.name}</div>
              <kbd class="v30-kbd">${s.keys}</kbd>
            </div>
          `).join('')}
        `).join('')}
      </div>
    `;
    document.body.appendChild(p);
  }

  // Register all shortcuts
  function registerAll() {
    document.addEventListener('keydown', (e) => {
      for (const sc of shortcuts) {
        const parts = sc.keys.split('+');
        const key = parts[parts.length-1];
        const ctrl = parts.includes('Ctrl') || parts.includes('Meta');
        const shift = parts.includes('Shift');
        const alt = parts.includes('Alt');
        if (e.ctrlKey === ctrl && e.shiftKey === shift && e.altKey === alt && e.key === key) {
          e.preventDefault();
          try { sc.action(); } catch(err) {}
          break;
        }
      }
    });
  }

  return {
    filter(q) {
      document.querySelectorAll('#v30-sc-list .v30-shortcut-row').forEach(el => {
        el.style.display = !q || el.dataset.name.includes(q.toLowerCase()) ? '' : 'none';
      });
    },
    toggle() { build(); V30.togglePanel('v30-shortcuts-panel'); },
    init() { build(); registerAll(); }
  };
})();
window.ShortcutManager = ShortcutManager;

// ─────────────────────────────────────────────────────────────
// §15  QUICK ACTIONS FLOATING MENU
// ─────────────────────────────────────────────────────────────
const QuickActions = (() => {
  const ACTIONS = [
    { icon:'🎨', label:'Color Picker',   action: () => ColorPicker.toggle() },
    { icon:'🧘', label:'Zen Mode',       action: () => ZenMode.toggle() },
    { icon:'🍅', label:'Pomodoro',       action: () => Pomodoro.show() },
    { icon:'📌', label:'TODOs',          action: () => TodoManager.toggle() },
    { icon:'📈', label:'Metrics',        action: () => CodeMetrics.toggle() },
    { icon:'📋', label:'Templates',      action: () => Templates.toggle() },
    { icon:'👁️', label:'MD Preview',    action: () => MarkdownPreview.toggle() },
    { icon:'🔗', label:'Share',          action: () => CodeShare.toggle() },
    { icon:'⚙️', label:'Build',         action: () => BuildSystem.toggle() },
    { icon:'⌨️', label:'Shortcuts',     action: () => { try { ShortcutsModal.show(); } catch(e) { if(window.ShortcutManager?.listAll) console.log(ShortcutManager.listAll()); } } },
  ];

  let _open = false;

  function build() {
    // v3.1.1 — FAB removed by user request. The actions live in the
    // "More options" hamburger menu now (Pomodoro, Code Metrics, Templates,
    // Color Picker, MD Preview, Share, Build, Shortcuts, Zen Mode).
    // Tear down any orphan FAB from earlier builds and bail out.
    const orphan = document.getElementById('v30-quick-actions');
    if (orphan) orphan.remove();
    return;
    /* eslint-disable no-unreachable */
    if (document.getElementById('v30-quick-actions')) return;
    const div = document.createElement('div');
    div.id = 'v30-quick-actions';
    div.innerHTML = `
      <div class="v30-qa-menu" id="v30-qa-menu">
        ${ACTIONS.map(a => `<button class="v30-qa-btn" onclick="${a.action.toString().slice(6,-1).trim()};document.getElementById('v30-quick-actions').querySelector('.v30-qa-fab').click()">
          <span>${a.icon}</span><span>${a.label}</span>
        </button>`).join('')}
      </div>
      <button class="v30-qa-fab" id="v30-qa-fab" onclick="QuickActions.toggleMenu()">+</button>
    `;
    document.body.appendChild(div);

    // Re-bind actions properly
    const menu = div.querySelector('#v30-qa-menu');
    menu.innerHTML = '';
    ACTIONS.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'v30-qa-btn';
      btn.innerHTML = _sanitize(`<span>${a.icon}</span><span>${a.label}</span>`);
      btn.onclick = () => { a.action(); QuickActions.closeMenu(); };
      menu.appendChild(btn);
    });
  }

  return {
    toggleMenu() {
      _open = !_open;
      const menu = document.getElementById('v30-qa-menu');
      const fab = document.getElementById('v30-qa-fab');
      if (menu) menu.classList.toggle('open', _open);
      if (fab) fab.classList.toggle('open', _open);
    },
    closeMenu() {
      _open = false;
      document.getElementById('v30-qa-menu')?.classList.remove('open');
      document.getElementById('v30-qa-fab')?.classList.remove('open');
    },
    init() { build(); }
  };
})();
window.QuickActions = QuickActions;

// ─────────────────────────────────────────────────────────────
// §16  AI STREAMING UPGRADE (patch AIPairProgrammer)
// ─────────────────────────────────────────────────────────────
const AIStreaming = (() => {
  async function streamMessage(userMsg, containerEl) {
    if (!containerEl) return;
    const ed = V30.getEditor();
    const code = ed?.getValue()?.slice(0, 3000) || '';
    const lang = ed?.getModel()?.getLanguageId() || 'javascript';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'v30-ai-msg assistant';
    msgDiv.innerHTML = '<span class="v30-stream-cursor"></span>';
    containerEl.appendChild(msgDiv);
    containerEl.scrollTop = containerEl.scrollHeight;

    let fullText = '';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.__apiKey?.load() || '',
          'anthropic-version': (window.ANTHROPIC_API_VERSION || '2023-06-01'),
          'anthropic-dangerous-direct-browser-access': 'true' // FIX-API-2: consistent header
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          stream: true,
          system: `You are an expert AI pair programmer. Current language: ${lang}. Current code context:\n\`\`\`${lang}\n${code.slice(0,1500)}\n\`\`\`\nBe concise and code-focused. Use \`\`\` for code blocks.`,
          messages: [{ role:'user', content: userMsg }]
        })
      });

      if (!response.ok) throw new Error(`${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.type === 'content_block_delta') {
                const delta = json.delta?.text || '';
                fullText += delta;
                // Render incrementally
                const rendered = fullText
                  .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, l, c) =>
                    `<pre><code style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#86efac">${c.replace(/</g,'&lt;')}</code></pre>`)
                  .replace(/`([^`]+)`/g, '<code style="background:#0c0c0e;padding:1px 4px;border-radius:3px;color:#86efac">$1</code>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br>');
                msgDiv.innerHTML = rendered + '<span class="v30-stream-cursor"></span>';
                containerEl.scrollTop = containerEl.scrollHeight;
              }
            } catch(e) {}
          }
        }
      }

      // Final render without cursor
      const finalRendered = fullText
        .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, l, c) =>
          `<pre><code style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#86efac">${c.replace(/</g,'&lt;')}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code style="background:#0c0c0e;padding:1px 4px;border-radius:3px;color:#86efac">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      msgDiv.innerHTML = finalRendered;

      // Add insert button if code present
      if (fullText.includes('```')) {
        const btn = document.createElement('button');
        btn.textContent = '⬇ Insert code at cursor';
        btn.style.cssText = 'margin-top:8px;padding:4px 10px;background:#1e1b4b;color:#818cf8;border:1px solid #3730a3;border-radius:4px;cursor:pointer;font-size:10px;display:block';
        btn.onclick = () => {
          const m = fullText.match(/```\w*\n?([\s\S]*?)```/);
          if (m) { V30.insertCode(m[1]); V30.notify('✓ Code inserted', 'success', 2000); }
        };
        msgDiv.appendChild(btn);
      }

    } catch(err) {
      msgDiv.innerHTML = _sanitize(`<span style="color:#f43f5e">⚠️ Stream error: ${err.message}</span>`);
    }

    containerEl.scrollTop = containerEl.scrollHeight;
    return fullText;
  }

  // Monkey-patch AIPairProgrammer to use streaming
  function patchAIPair() {
    const orig = window.AIPairProgrammer;
    if (!orig) return;
    const origSend = orig.sendMessage?.bind(orig);
    orig.sendMessage = async function(userMsg) {
      if (!userMsg?.trim()) return;
      const msgs = document.getElementById('v29-ai-messages');
      if (!msgs) { if (origSend) return origSend(userMsg); return; }

      // Add user message
      const userDiv = document.createElement('div');
      userDiv.className = 'v29-ai-msg user';
      userDiv.textContent = userMsg;
      msgs.appendChild(userDiv);
      msgs.scrollTop = msgs.scrollHeight;

      // Clear input
      const inp = document.getElementById('v29-ai-input-field');
      if (inp) { inp.value = ''; inp.style.height = 'auto'; }

      // Stream response
      await streamMessage(userMsg, msgs);
    };
  }

  return { streamMessage, patchAIPair, init() { setTimeout(patchAIPair, 8000); } };
})();
window.AIStreaming = AIStreaming;

// ─────────────────────────────────────────────────────────────
// §17  SMART ERROR OVERLAY
// ───────────────────────���─────────────────────────────────────
const ErrorOverlay = (() => {
  const errors = [];

  function show(message, source, line, col, err) {
    // Don't show for trivial errors
    if (!message || message.includes('ResizeObserver') || message.includes('Script error')) return;

    const overlay = document.getElementById('v30-error-overlay') || createOverlay();
    const list = overlay.querySelector('#v30-error-list');

    errors.unshift({ message, source: source?.split('/').pop() || 'unknown', line, col, stack: err?.stack, time: new Date().toLocaleTimeString() });
    if (errors.length > 5) errors.pop();

    overlay.style.display = 'flex';
    list.innerHTML = errors.map((e, i) => `
      <div style="padding:10px 14px;border-bottom:1px solid #1a0a0a;${i===0?'background:#1a0505':''}">
        <div style="color:#fca5a5;font-size:12px;font-weight:600;margin-bottom:4px">${e.message.slice(0,120)}</div>
        <div style="color:#71717a;font-size:10px;font-family:'JetBrains Mono',monospace">${e.source} :${e.line}:${e.col} — ${e.time}</div>
        ${e.stack ? `<div style="color:#52525b;font-size:10px;font-family:'JetBrains Mono',monospace;margin-top:4px;white-space:pre-wrap;max-height:80px;overflow:hidden">${e.stack.slice(0,300).replace(/</g,'&lt;')}</div>` : ''}
        <button onclick="ErrorOverlay.jumpTo(${e.line})" style="margin-top:4px;padding:2px 8px;background:#450a0a;border:1px solid #991b1b;border-radius:3px;color:#fca5a5;cursor:pointer;font-size:10px">Jump to line ${e.line}</button>
      </div>
    `).join('');
  }

  function createOverlay() {
    const el = document.createElement('div');
    el.id = 'v30-error-overlay';
    el.style.cssText = 'position:fixed;bottom:22px;left:0;right:0;max-height:280px;background:#0d0505;border-top:2px solid #991b1b;z-index:9999;display:none;flex-direction:column;';
    el.innerHTML = `
      <div style="padding:6px 14px;background:#450a0a;border-bottom:1px solid #991b1b;display:flex;align-items:center;gap:8px">
        <span style="color:#f43f5e;font-weight:700;font-size:12px">💥 Runtime Error</span>
        <button onclick="ErrorOverlay.clear()" style="margin-left:auto;background:none;border:none;color:#71717a;cursor:pointer;font-size:14px">✕</button>
      </div>
      <div id="v30-error-list" style="overflow-y:auto;flex:1"></div>
    `;
    document.body.appendChild(el);
    return el;
  }

  // Hook into window.onerror
  const origOnError = window.onerror;
  window.onerror = function(message, source, line, col, err) {
    show(message, source, line, col, err);
    return origOnError ? origOnError(message, source, line, col, err) : false;
  };

  window.addEventListener('unhandledrejection', e => {
    show(`Unhandled Promise: ${e.reason?.message || e.reason}`, 'Promise', 0, 0, e.reason);
  });

  return {
    clear() { errors.length = 0; const el = document.getElementById('v30-error-overlay'); if (el) el.style.display = 'none'; },
    jumpTo(line) { V30.getEditor()?.revealLineInCenter(line); V30.getEditor()?.setPosition({ lineNumber:line, column:1 }); },
    init() { createOverlay(); }
  };
})();
window.ErrorOverlay = ErrorOverlay;

// ─────────────────────────────────────────────────────────────
// §18  BREADCRUMB NAVIGATION
// ───���─────────────────────────────────────────────────────────
const Breadcrumbs = (() => {
  let _bar = null;
  let _ticker = null;

  function build() {
    // ✅ Reuse existing breadcrumb-bar instead of creating a 3rd bar
    _bar = document.getElementById('breadcrumb-bar');
    if (!_bar) {
      _bar = document.getElementById('v30-breadcrumbs');
    }
    if (!_bar) {
      _bar = document.createElement('div');
      _bar.id = 'breadcrumb-bar';
      _bar.classList.add('visible');
      const ec = document.getElementById('editor-container');
      const mainEl = document.getElementById('main');
      if (ec && mainEl) mainEl.insertBefore(_bar, ec);
      else document.body.appendChild(_bar);
    }
  }

  function update() {
    if (!_bar) return;
    try {
      const ed = V30.getEditor();
      if (!ed) return;
      const model = ed.getModel();
      const code = model?.getValue() || '';
      const pos = ed.getPosition();
      const line = pos?.lineNumber || 1;
      const langId = model?.getLanguageId() || 'js';
      const icons = { javascript:'🟨', typescript:'🔷', python:'🐍', html:'🌐', css:'🎨', json:'📦', markdown:'📝', default:'📄' };
      const icon = icons[langId] || icons.default;

      // Find enclosing scope
      const before = code.split('\n').slice(0, line);
      let scope = [];
      let depth = 0;
      const scopes = [];
      const re = /(?:function\s+(\w+)|(?:class|const|let|var)\s+(\w+)\s*(?:=\s*(?:class|function|\()|\{)|(?:async\s+)?(\w+)\s*\()/g;
      for (const l of before) {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(l)) !== null) {
          const name = m[1] || m[2] || m[3];
          if (name && !['if','else','for','while','switch','try','catch','return'].includes(name)) {
            scopes.push(name);
          }
        }
        depth += (l.match(/\{/g)||[]).length - (l.match(/\}/g)||[]).length;
      }

      const currentFile = window.FileSystem?.activeFile || 'index.js';
      const parts = [
        `<span style="color:#6366f1">${icon} ${currentFile}</span>`,
        ...scopes.slice(-3).map(s => `<span style="color:#a1a1aa">›</span><span style="color:#818cf8">${s}</span>`),
        `<span style="color:#52525b">›</span><span style="color:#3f3f46">:${line}</span>`,
      ];

      _bar.innerHTML = parts.join(' ');
    } catch(e) {}
  }

  return {
    init() {
      build();
      _ticker = setInterval(update, 500);
      V30.getEditor()?.onDidChangeCursorPosition(() => update());
      update();
    }
  };
})();

// ─────────────────────────────────────────────────────────────
// §19  MONACO POWER-UPS (extra completions, hover, formatting)
// ─────────���───────────────────────────────────────────────────
const MonacoPowerups = (() => {
  function registerEmmetExpansion() {
    if (!window.monaco) return;
    try {
      monaco.languages.registerCompletionItemProvider('html', {
        triggerCharacters: ['>'],
        provideCompletionItems(model, position) {
          const lineContent = model.getLineContent(position.lineNumber);
          const emmetMap = {
            'div>': '<div>\n  \n</div>',
            'ul>li*': '<ul>\n  <li></li>\n  <li></li>\n  <li></li>\n</ul>',
            'section>': '<section>\n  \n</section>',
            'nav>': '<nav>\n  \n</nav>',
          };
          return { suggestions: [] };
        }
      });
    } catch(e) {}
  }

  function registerConsoleSuppression() {
    // Add suppress console.log warning quick fix
    if (!window.monaco) return;
    try {
      monaco.languages.registerCodeActionProvider('javascript', {
        provideCodeActions(model, range, context) {
          const actions = context.markers
            .filter(m => m.message.includes('console'))
            .map(m => ({
              title: '🔇 Comment out console statement',
              kind: 'quickfix',
              edit: {
                edits: [{
                  resource: model.uri,
                  edit: { range: { startLineNumber:m.startLineNumber, startColumn:1, endLineNumber:m.startLineNumber, endColumn:1 }, text:'// ' }
                }]
              }
            }));
          return { actions, dispose:()=>{} };
        }
      });
    } catch(e) {}
  }

  function registerAICompletion() {
    if (!window.monaco) return;
    try {
      // Enhanced ghost text with smart patterns
      const snippetMap = {
        'fetch': { label:'fetch – HTTP request', snippet:`fetch('\${1:url}', {\n  method: '\${2:GET}',\n  headers: { 'Content-Type': 'application/json' }\n})\n.then(r => r.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));` },
        'asyncfn': { label:'async function', snippet:`async function \${1:name}(\${2:params}) {\n  try {\n    \${3}\n  } catch (err) {\n    console.error(err);\n    throw err;\n  }\n}` },
        'useState': { label:'useState – React hook', snippet:`const [\${1:state}, set\${2:State}] = useState(\${3:initialValue});` },
        'useEffect': { label:'useEffect – React hook', snippet:`useEffect(() => {\n  \${1}\n  return () => {\n    // cleanup\n  };\n}, [\${2}]);` },
        'useCallback': { label:'useCallback – React hook', snippet:`const \${1:fn} = useCallback((\${2}) => {\n  \${3}\n}, [\${4}]);` },
        'useMemo': { label:'useMemo – React hook', snippet:`const \${1:value} = useMemo(() => {\n  return \${2};\n}, [\${3}]);` },
        'forEach': { label:'forEach – array iteration', snippet:`\${1:array}.forEach((\${2:item}, \${3:index}) => {\n  \${4}\n});` },
        'promise': { label:'new Promise', snippet:`new Promise((resolve, reject) => {\n  \${1}\n  resolve(\${2});\n});` },
        'class': { label:'class declaration', snippet:`class \${1:Name} {\n  constructor(\${2:params}) {\n    \${3}\n  }\n\n  \${4:method}() {\n    \${5}\n  }\n}` },
        'interface': { label:'TypeScript interface', snippet:`interface \${1:Name} {\n  \${2:prop}: \${3:type};\n}` },
        'try': { label:'try/catch block', snippet:`try {\n  \${1}\n} catch (\${2:err}) {\n  console.error(\${2:err});\n}` },
        'debounce': { label:'debounce utility', snippet:`function debounce(fn, delay) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}` },
        'throttle': { label:'throttle utility', snippet:`function throttle(fn, limit) {\n  let last = 0;\n  return (...args) => {\n    const now = Date.now();\n    if (now - last >= limit) { last = now; fn(...args); }\n  };\n}` },
        'localStorage': { label:'localStorage get/set', snippet:`localStorage.setItem('\${1:key}', JSON.stringify(\${2:value}));\nconst \${3:result} = JSON.parse(localStorage.getItem('\${1:key}') || 'null');` },
      };

      // Register as completion provider for JS/TS
      ['javascript','typescript'].forEach(lang => {
        monaco.languages.registerCompletionItemProvider(lang, {
          triggerCharacters: [],
          provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            const suggestions = Object.entries(snippetMap)
              .filter(([key]) => key.startsWith(word.word) || word.word === '')
              .map(([key, val]) => ({
                label: val.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: val.snippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: '✦ ProCode Snippet',
                sortText: '0' + key,
                range,
              }));
            return { suggestions };
          }
        });
      });
    } catch(e) { console.warn('AI completion registration failed:', e); }
  }

  return {
    init() {
      setTimeout(() => {
        registerEmmetExpansion();
        registerConsoleSuppression();
        registerAICompletion();
      }, 6000);
    }
  };
})();

// ─────────────────────────────────────────────────────────────
// §20  V30 COMMAND PALETTE ENTRIES
// ──────────────────────────────────���──────────────────────────
function registerV30Commands() {
  try {
    if (!window.CommandPalette?.register) return;
    const cmds = [
      { name:'V30: Zen Mode',         action: () => ZenMode.toggle() },
      { name:'V30: Live MD Preview',  action: () => MarkdownPreview.toggle() },
      { name:'V30: TODO Manager',     action: () => TodoManager.toggle() },
      { name:'V30: Code Metrics',     action: () => CodeMetrics.toggle() },
      { name:'V30: Theme Designer',   action: () => ThemeDesigner.toggle() },
      { name:'V30: Env Variables',    action: () => EnvManager.toggle() },
      { name:'V30: Code Share',       action: () => CodeShare.toggle() },
      { name:'V30: Bookmarks',        action: () => Bookmarks.toggle() },
      { name:'V30: Project Templates',action: () => Templates.toggle() },
      { name:'V30: Build System',     action: () => BuildSystem.toggle() },
      { name:'V30: Pomodoro Timer',   action: () => Pomodoro.show() },
      { name:'V30: Color Picker',     action: () => ColorPicker.toggle() },
      { name:'V30: All Shortcuts',    action: () => ShortcutManager.toggle() },
      { name:'V30: AI Explain Code',  action: () => { window.AIPairProgrammer?.toggle(); setTimeout(() => window.AIPairProgrammer?.quickPrompt('Explain this code in detail with examples'), 300); }},
      { name:'V30: AI Refactor',      action: () => { window.AIPairProgrammer?.toggle(); setTimeout(() => window.AIPairProgrammer?.quickPrompt('Refactor this code: improve naming, structure, and performance'), 300); }},
      { name:'V30: AI Generate Tests',action: () => { window.AIPairProgrammer?.toggle(); setTimeout(() => window.AIPairProgrammer?.quickPrompt('Write comprehensive tests using Vitest/Jest'), 300); }},
      { name:'V30: Build Production', action: () => { BuildSystem.toggle(); setTimeout(() => BuildSystem.run('build:prod'), 300); }},
      { name:'V30: Run Lint',         action: () => { BuildSystem.toggle(); setTimeout(() => BuildSystem.run('lint'), 300); }},
    ];
    cmds.forEach(c => window.CommandPalette.register(c));
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────
// §21  V30 BOOT SEQUENCE
// ─────────────────────────────────────────────────────────────
async function v30Boot() {
  // Guard against duplicate execution (DOMContentLoaded + load can both fire)
  if (window._v30BootComplete) return;
  window._v30BootComplete = true;

  console.log('%c✦ ProCode IDE ∞ UNIFIED — Booting all modules…', 'color:#6366f1;font-size:15px;font-weight:900;');

  // Remove old badge
  document.querySelector('.v29-badge')?.remove();
  document.querySelector('.v28-badge')?.remove();

  // V30 badge
  const badge = document.createElement('div');
  badge.className = 'v30-badge';
  if (badge && badge.textContent !== '∞ UNIFIED') badge.textContent = '✦ ∞ UNIFIED';
  document.body.appendChild(badge);

  const modules = [
    ['LiveStats',       LiveStats],
    ['Pomodoro',        Pomodoro],
    ['TodoManager',     TodoManager],
    ['CodeMetrics',     CodeMetrics],
    ['EnvManager',      EnvManager],
    ['CodeShare',       CodeShare],
    ['Bookmarks',       Bookmarks],
    ['ThemeDesigner',   ThemeDesigner],
    ['MarkdownPreview', MarkdownPreview],
    ['Templates',       Templates],
    ['ZenMode',         ZenMode],
    ['BuildSystem',     BuildSystem],
    ['ColorPicker',     ColorPicker],
    ['ShortcutManager', ShortcutManager],
    ['QuickActions',    QuickActions],
    ['AIStreaming',      AIStreaming],
    ['ErrorOverlay',    ErrorOverlay],
    ['Breadcrumbs',     Breadcrumbs],
    ['MonacoPowerups',  MonacoPowerups],
  ];

  // Split modules: critical (run now) vs non-critical (idle)
  const criticalModules = modules.slice(0, 6);   // LiveStats…CodeMetrics
  const idleModules     = modules.slice(6);        // rest deferred

  const _loaded = [], _failed = [];
  for (const [name, mod] of criticalModules) {
    try { mod.init?.(); _loaded.push(name); }
    catch(e) { _failed.push(name); console.warn(`  ✗ ${name}:`, e.message); }
  }

  // Defer non-critical module inits to idle time (improves startup responsiveness)
  const _runIdle = (typeof requestIdleCallback === 'function') ? requestIdleCallback : setTimeout;
  _runIdle(function() {
    for (const [name, mod] of idleModules) {
      try { mod.init?.(); _loaded.push(name); }
      catch(e) { _failed.push(name); }
    }
    registerV30Commands();
    if (_failed.length) console.warn('[ProCode] Module init failures:', _failed);
    // Single grouped log instead of per-module spam
    console.log('%c[ProCode] Modules ready: ' + _loaded.length + '/' + modules.length, 'color:#10b981;font-size:10px');
  }, { timeout: 3000 });

  // Escape key for Zen Mode
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('v30-zen-overlay')?.classList.contains('open')) {
        ZenMode.toggle();
      }
    }
  });

  // Update document title
  document.title = 'ProCode IDE — UNIFIED EDITION';

  // Welcome
  setTimeout(() => {
    // Boot toasts suppressed (unified) — only single toast at end
    // V30.notify('🔥 v30 Transcendence Patch activated!', 'success', 4000);
    // setTimeout(() => V30.notify('New: Zen Mode · MD Preview · Themes · Build · 20+ features', 'info', 5000), 800);
  }, 600);

  console.log('%c✦ ProCode IDE ∞ UNIFIED — all modules loaded', 'color:#6366f1;font-size:12px;font-weight:700');
}

// Boot after v29 settles
const _bootDelay = 9000;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(v30Boot, _bootDelay));
} else {
  setTimeout(v30Boot, _bootDelay);
}
// Single window.load listener (deduplicated)
if (!window._v30LoadHooked) {
  window._v30LoadHooked = true;
  window.addEventListener('load', () => setTimeout(v30Boot, _bootDelay));
}

})(); // END V30 IIFE