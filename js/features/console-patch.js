/**
 * console-patch.js
 * Console patch — native console capture, Obsidian Studio debug
 * ProCode IDE v3.0
 */

/* ═══════════════════════════════════════════════════════════════════════
   ProCode IDE v33 — ULTIMATE EVOLUTION
   ═══════════════════════════════════════════════════════════════════════ */
;(function V33UltimateEvolution() {
  if (window.__v33_loaded) return;
  window.__v33_loaded = true;

  // Snapshot native console methods FIRST before any patching below
  if (!window.__nativeConsole) {
    window.__nativeConsole = {};
    ['log','warn','error','info'].forEach(function(m) {
      try { window.__nativeConsole[m] = (typeof console[m] === 'function') ? console[m].bind(console) : function(){}; } catch(e) {}
    });
  }

  /* ─────────────────���─────────────────────────────────────────────────
     §0  BLUEPRINT VISUAL SCRIPTING ENGINE
     ───────────────────────────────────��─────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §1  GOD-TIER DEVTOOLS
     ─────────────────────────────────────────────────────────────────── */
  const V33DevTools = (() => {
    const panel = () => document.getElementById('v33-devtools');
    const consoleEl = () => document.getElementById('v33-dt-console');
    const networkEl = () => document.getElementById('v33-dt-network');
    let _active = false;
    let _logs = [], _requests = [], _msgCount = 0;

    // Intercept console — guard against prior patches that may have replaced methods with non-functions
    const _origConsole = {};
    ['log','warn','error','info'].forEach(m => {
      try {
        const native = typeof console[m] === 'function' ? console[m] : (window.__nativeConsole?.[m] || function(){});
        _origConsole[m] = native.bind ? native.bind(console) : native;
        console[m] = (...args) => {
          try { _origConsole[m](...args); } catch {}
          addLog(m, args.map(a => {
            try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
            catch { return String(a); }
          }).join(' '));
        };
      } catch(ex) { _origConsole[m] = function() {}; }
    });

    function addLog(type, msg) {
      _logs.push({ type, msg, t: Date.now() });
      _msgCount++;
      const cnt = document.getElementById('v33-dt-count');
      if (cnt) cnt.textContent = `${_msgCount} msg`;
      if (!_active) return;
      const cons = consoleEl();
      if (!cons) return;
      const d = document.createElement('div');
      d.className = `v33-log ${type}`;
      const icons = { error:'✗', warn:'⚠', info:'ℹ', log:'›' };
      d.innerHTML = _sanitize(`<span class="v33-log-time">${new Date().toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span><span style="margin-right:4px;opacity:0.5">${icons[type]||'›'}</span><span style="white-space:pre-wrap;word-break:break-all">${String(msg).slice(0,500)}</span>`);
      cons.appendChild(d);
      cons.scrollTop = cons.scrollHeight;
    }

    // Intercept fetch for Network tab
    const _origFetch = window.fetch?.bind(window);
    if (_origFetch) {
      window.fetch = async (url, opts={}) => {
        const start = performance.now();
        const method = (opts.method || 'GET').toUpperCase();
        const req = { url: String(url).slice(0,80), method, status:0, size:'–', time:'–', t:Date.now() };
        _requests.push(req);
        try {
          const res = await _origFetch(url, opts);
          req.status = res.status;
          const dur = Math.round(performance.now() - start);
          req.time = dur + 'ms';
          const ct = res.headers?.get('content-type') || '–';
          req.type = ct.split(';')[0].split('/').pop();
          _renderNetwork();
          return res;
        } catch(e) { req.status = 0; req.time = '–'; _renderNetwork(); throw e; }
      };
    }

    function _renderNetwork() {
      const net = networkEl();
      if (!net || !_active) return;
      net.innerHTML = `<div class="v33-net-row header"><span>#</span><span>URL</span><span>METHOD</span><span>STATUS</span><span>TIME</span><span>TYPE</span></div>` +
        _requests.slice(-30).reverse().map((r,i) => {
          const sc = r.status >= 400 ? 'v33-status-err' : r.status >= 300 ? 'v33-status-redir' : 'v33-status-ok';
          return `<div class="v33-net-row">
            <span style="color:#3f3f46">${_requests.length-i}</span>
            <span title="${r.url}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.url}</span>
            <span><span class="v33-net-method ${r.method}">${r.method}</span></span>
            <span class="${sc}">${r.status||'ERR'}</span>
            <span>${r.time}</span>
            <span style="color:#52525b">${r.type||'–'}</span>
          </div>`;
        }).join('');
    }

    function _renderElements() {
      const el = document.getElementById('v33-dt-elements');
      if (!el) return;
      const frame = document.getElementById('preview-frame');
      let doc = null;
      try { doc = frame?.contentDocument; } catch {}
      if (!doc) { el.innerHTML = '<div style="padding:12px;font-size:10px;color:#52525b">Preview not available (sandboxed)</div>'; return; }

      function renderNode(node, depth=0) {
        if (node.nodeType === 3) {
          const text = node.textContent?.trim();
          if (!text) return '';
          return `<div class="v33-el-row" style="padding-left:${12+depth*12}px"><span class="v33-el-text">"${text.slice(0,60)}"</span></div>`;
        }
        if (node.nodeType !== 1) return '';
        const tag = node.tagName.toLowerCase();
        const attrs = Array.from(node.attributes||[]).map(a => ` <span class="v33-el-attr">${a.name}</span>=<span class="v33-el-val">"${a.value.slice(0,30)}"</span>`).join('');
        const children = Array.from(node.childNodes).map(c=>renderNode(c,depth+1)).join('');
        return `<div class="v33-el-row" style="padding-left:${12+depth*12}px">&lt;<span class="v33-el-tag">${tag}</span>${attrs}&gt;</div>${children}${children?`<div class="v33-el-row" style="padding-left:${12+depth*12}px">&lt;/<span class="v33-el-tag">${tag}</span>&gt;</div>`:''}`;
      }

      el.innerHTML = renderNode(doc.documentElement).slice(0, 12000) + (doc.documentElement ? '' : '<div style="padding:12px;color:#52525b;font-size:10px">Empty preview</div>');
    }

    function _renderStorage() {
      const el = document.getElementById('v33-dt-storage');
      if (!el) return;
      let html = '<div style="font-size:10px;font-weight:800;color:#52525b;margin-bottom:8px">localStorage</div>';
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const v = (localStorage.getItem(k)||'').slice(0,100);
          html += `<div style="margin-bottom:4px;color:#a1a1aa"><span style="color:#818cf8">${k}</span>: <span style="color:#86efac">${v}</span></div>`;
        }
        if (!localStorage.length) html += '<div style="color:#3f3f46">No localStorage entries</div>';
      } catch { html += '<div style="color:#ef4444">Access denied</div>'; }
      html += '<div style="font-size:10px;font-weight:800;color:#52525b;margin:12px 0 8px">sessionStorage</div>';
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          const v = (sessionStorage.getItem(k)||'').slice(0,100);
          html += `<div style="margin-bottom:4px;color:#a1a1aa"><span style="color:#818cf8">${k}</span>: <span style="color:#86efac">${v}</span></div>`;
        }
        if (!sessionStorage.length) html += '<div style="color:#3f3f46">No sessionStorage entries</div>';
      } catch { html += '<div style="color:#ef4444">Access denied</div>'; }
      el.innerHTML = html;
    }

    function switchTab(tab, btnEl) {
      document.querySelectorAll('.v33-dt-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.v33-dt-pane').forEach(p=>p.classList.remove('active'));
      btnEl?.classList.add('active');
      document.getElementById(`v33-dt-pane-${tab}`)?.classList.add('active');
      if (tab === 'network') _renderNetwork();
      if (tab === 'elements') _renderElements();
      if (tab === 'storage') _renderStorage();
    }

    // Attach DevTools to preview-wrap
    function attachToPreview() {
      const pw = document.getElementById('preview-wrap');
      const dt = document.getElementById('v33-devtools');
      if (pw && dt && dt.parentNode !== pw) {
        pw.appendChild(dt);
      }
    }

    function toggle() {
      _active = !_active;
      const dt = panel();
      dt?.classList.toggle('active', _active);
      if (_active) {
        // Replay buffered logs
        const cons = consoleEl();
        if (cons && cons.children.length === 0) {
          _logs.slice(-50).forEach(l => addLog(l.type, l.msg));
        }
      }
    }

    function clear() { _logs=[]; _requests=[]; _msgCount=0; if(consoleEl()) consoleEl().innerHTML=''; document.getElementById('v33-dt-count').textContent='0 msg'; }

    // Resize DevTools panel
    const resizer = document.getElementById('v33-dt-resize');
    let _resizing = false, _resizeStart = 0, _resizeH = 240;
    resizer?.addEventListener('mousedown', e => { _resizing=true; _resizeStart=e.clientY; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
      if (!_resizing) return;
      const delta = _resizeStart - e.clientY;
      _resizeH = Math.max(80, Math.min(600, _resizeH + delta));
      _resizeStart = e.clientY;
      const dt = panel(); if (dt) dt.style.height = _resizeH + 'px';
    });
    document.addEventListener('mouseup', () => { _resizing = false; });

    setTimeout(attachToPreview, 500);
    return { toggle, switchTab, clear, addLog, isActive:()=>_active };
  })();
  window.V33DevTools = V33DevTools;

  /* ───────────────────────────────────────────────────────────────────
     §2  SPATIAL AUDIO + HAPTIC MULTIPLAYER
     ─────────────────────────────────────────────────────────────────── */
  const V33SpatialAudio = (() => {
    let _ctx = null;
    let _enabled = false;
    const orb = document.getElementById('v33-audio-orb');
    const label = document.getElementById('v33-audio-label');

    function _getCtx() {
      if (!_ctx) {
        try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
      }
      return _ctx;
    }

    function playTypingSound(panX = 0) {
      // panX: -1 (far left) to +1 (far right)
      if (!_enabled) return;
      const ctx = _getCtx(); if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner?.() || ctx.createPanner?.();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random()*400, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        if (pan) {
          if (pan.pan !== undefined) pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), ctx.currentTime);
          osc.connect(pan); pan.connect(gain);
        } else osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } catch {}
    }

    function playDeleteSound() {
      if (!_enabled) return;
      const ctx = _getCtx(); if (!ctx) return;
      try {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1) * Math.exp(-i/3000);
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        src.connect(gain); gain.connect(ctx.destination);
        src.start();
      } catch {}
    }

    function playConnectSound() {
      if (!_enabled) return;
      const ctx = _getCtx(); if (!ctx) return;
      try {
        [440, 550, 660].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i*0.05);
          gain.gain.setValueAtTime(0.05, ctx.currentTime + i*0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.05 + 0.2);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i*0.05); osc.stop(ctx.currentTime + i*0.05 + 0.25);
        });
      } catch {}
    }

    function hapticFeedback(type='soft') {
      if (!navigator.vibrate) return;
      const patterns = { soft:[10], medium:[20,10,20], strong:[50,20,50], delete:[30,10,30,10,30] };
      try { navigator.vibrate(patterns[type] || patterns.soft); } catch {}
    }

    function showOtherUserTyping(name, panX=0) {
      if (orb) orb.classList.add('active');
      if (label) label.textContent = `${name} is typing…`;
      playTypingSound(panX);
      clearTimeout(window._v33MultiHideTimer1);
      window._v33MultiHideTimer1 = setTimeout(() => orb?.classList.remove('active'), 2500);
    }

    function showOtherUserDelete(name) {
      if (orb) { orb.classList.add('active'); orb.style.borderColor='rgba(239,68,68,0.4)'; }
      if (label) { label.textContent = `${name} deleted code`; label.style.color='#ef4444'; }
      playDeleteSound(); hapticFeedback('delete');
      clearTimeout(window._v33MultiHideTimer2);
      window._v33MultiHideTimer2 = setTimeout(() => { orb?.classList.remove('active'); if(orb) orb.style.borderColor=''; }, 2500);
    }

    function enable() {
      _enabled = true;
      _getCtx()?.resume?.();
    }
    function disable() { _enabled = false; }

    // Wire to Y.js awareness if available
    function wireYjsAwareness() {
      if (!window.awareness) return;
      try {
        window.awareness.on('change', () => {
          const states = window.awareness.getStates();
          states.forEach((state, clientId) => {
            if (clientId === window.awareness.clientID) return;
            const name = state.user?.name || `User ${clientId}`;
            if (state.cursor) {
              const colX = state.cursor.anchor?.ch || 0;
              const colCount = 80;
              const panX = ((colX / colCount) * 2 - 1) * 0.8;
              showOtherUserTyping(name, panX);
            }
          });
        });
      } catch {}
    }
    setTimeout(wireYjsAwareness, 5000);

    return { playTypingSound, playDeleteSound, playConnectSound, hapticFeedback, showOtherUserTyping, showOtherUserDelete, enable, disable, _hideTimer: null };
  })();
  window.V33SpatialAudio = V33SpatialAudio;

  /* ───────────────────────────────────────────���───────────────────────
     §3  CSS TOKEN INSPECTOR
     ─────────────────────────────────────────────────────────────────── */
  const V33TokenInspector = (() => {
    const panel = document.getElementById('v33-token-inspector');
    const grid = document.getElementById('v33-ti-grid');

    function scan() {
      const tokens = {};
      const sheets = Array.from(document.styleSheets);
      sheets.forEach(s => {
        try {
          Array.from(s.cssRules||[]).forEach(r => {
            if (r.style) {
              Array.from(r.style).filter(p => p.startsWith('--')).forEach(p => {
                tokens[p] = r.style.getPropertyValue(p).trim();
              });
            }
          });
        } catch {}
      });
      // Also computed on :root
      const root = getComputedStyle(document.documentElement);
      ['--primary','--accent','--bg','--bg-dark','--border','--text','--text-dim','--success','--error','--warn'].forEach(v => {
        const val = root.getPropertyValue(v).trim();
        if (val) tokens[v] = val;
      });
      return tokens;
    }

    function render() {
      if (!grid) return;
      const tokens = scan();
      grid.innerHTML = '';
      Object.entries(tokens).sort().forEach(([name, val]) => {
        const row = document.createElement('div');
        row.className = 'v33-token-row';
        const isColor = /^#|^rgb|^hsl|^oklch/.test(val.trim());
        row.innerHTML = `
          ${isColor ? `<div class="v33-token-swatch" style="background:${val}" title="${val}"></div>` : '<div style="width:18px;height:18px;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:8px;color:#3f3f46">–</div>'}
          <span class="v33-token-name" title="${name}">${name}</span>
          <span class="v33-token-val" title="${val}">${val.slice(0,20)}</span>
          ${isColor ? `<input type="color" style="width:0;height:0;opacity:0;position:absolute" oninput="document.documentElement.style.setProperty('${name}',this.value);V32Toast?.show('Token updated','success',1000)">` : ''}
        `;
        if (isColor) {
          const sw = row.querySelector('.v33-token-swatch');
          const inp = row.querySelector('input[type=color]');
          sw?.addEventListener('click', () => inp?.click());
        }
        grid.appendChild(row);
      });
    }

    function show() { panel?.classList.add('active'); render(); }
    function hide() { panel?.classList.remove('active'); }

    return { show, hide, scan };
  })();
  window.V33TokenInspector = V33TokenInspector;

  /* ───────────────────────────────────────────────────────────────────
     §4  DEPLOY SIMULATOR
     ─────────────────────────────────────────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §5  SNIPPET LIBRARY
     ───��─────────────────────────────────────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §6  COMMAND PALETTE V2
     ───────────────────���───────────────���─────────────────────────────── */
  const V33CommandPalette = (() => {
    const panel = document.getElementById('v33-cmd');
    const input = document.getElementById('v33-cmd-input');
    const listEl = document.getElementById('v33-cmd-list');
    const countEl = document.getElementById('v33-cmd-count');
    let _focusIdx = 0;
    let _allCmds = [];
    let _filtered = [];

    const COMMANDS = [
      { icon:'fa-expand', color:'#818cf8', bg:'rgba(99,102,241,0.15)', title:'Zen Canvas', sub:'Alt+Z · Distraction-free editing', keys:['Alt','Z'], action:()=>V32ZenCanvas?.toggle() },
      { icon:'fa-brain', color:'#a78bfa', bg:'rgba(124,58,237,0.15)', title:'Semantic Search (RAG)', sub:'Alt+S · Search codebase by meaning', keys:['Alt','S'], action:()=>V32RAG?.show() },
      { icon:'fa-palette', color:'#f9a8d4', bg:'rgba(236,72,153,0.15)', title:'Theme Painter', sub:'Alt+P · Live CSS variables', keys:['Alt','P'], action:()=>V32ThemePainter?.toggle() },
      { icon:'fa-paint-brush', color:'#fbbf24', bg:'rgba(251,191,36,0.15)', title:'CSS Token Inspector', sub:'Inspect all design tokens', action:()=>V33TokenInspector?.show() },
      { icon:'fa-code-branch', color:'#86efac', bg:'rgba(34,197,94,0.15)', title:'Visual Diff', sub:'Alt+D · Compare file versions', keys:['Alt','D'], action:()=>V32Diff?.show() },
      { icon:'fa-robot', color:'#818cf8', bg:'rgba(99,102,241,0.15)', title:'AI Chat', sub:'Open AI assistant', action:()=>document.querySelector('[onclick*="AI.toggle"],[data-panel="ai"],[onclick*="showAI"]')?.click() },
      { icon:'fa-magic', color:'#86efac', bg:'rgba(34,197,94,0.15)', title:'Format Document', sub:'Ctrl+Shift+F · Prettier', keys:['Ctrl','Shift','F'], action:()=>window.Formatter?.run?.() },
      { icon:'fa-keyboard', color:'#71717a', bg:'rgba(255,255,255,0.05)', title:'Keyboard Shortcuts', sub:'Alt+K · All shortcuts', keys:['Alt','K'], action:()=>V32Shortcuts?.show() },
      { icon:'fa-tools', color:'#a1a1aa', bg:'rgba(255,255,255,0.04)', title:'DevTools', sub:'Console, Network, Elements inspector', action:()=>V33DevTools?.toggle() },
      { icon:'fa-save', color:'#86efac', bg:'rgba(34,197,94,0.15)', title:'Save All Files', sub:'Ctrl+Shift+S', keys:['Ctrl','Shift','S'], action:()=>window.FS?.exportZip?.() },
      { icon:'fa-search', color:'#818cf8', bg:'rgba(99,102,241,0.15)', title:'Find in Files', sub:'Ctrl+Shift+F', action:()=>window.Search?.findInProject?.() },
      { icon:'fa-layer-group', color:'#7dd3fc', bg:'rgba(8,145,178,0.15)', title:'New Project', sub:'Browse project templates', action:()=>window.ProjectTemplates?.show?.() },
    ];

    function _render(list) {
      if (!listEl) return;
      listEl.innerHTML = '';
      // Group by category
      if (list.length === 0) {
        listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#3f3f46;font-size:12px"><i class="fas fa-search"></i><br><br>No commands found</div>';
        if(countEl) countEl.textContent = '0 results';
        return;
      }
      if(countEl) countEl.textContent = list.length + ' result' + (list.length!==1?'s':'');
      list.forEach((cmd, i) => {
        const item = document.createElement('div');
        item.className = `v33-cmd-item${i===_focusIdx?' focused':''}`;
        item.innerHTML = `
          <div class="v33-cmd-item-icon" style="background:${cmd.bg}"><i class="fas ${cmd.icon}" style="color:${cmd.color}"></i></div>
          <div class="v33-cmd-item-info">
            <div class="v33-cmd-item-title">${cmd.title}</div>
            <div class="v33-cmd-item-sub">${cmd.sub||''}</div>
          </div>
          ${cmd.keys ? `<div class="v33-cmd-item-kbd">${cmd.keys.map(k=>`<kbd>${k}</kbd>`).join('')}</div>` : ''}
        `;
        item.onclick = () => { cmd.action?.(); hide(); };
        item.onmouseenter = () => { _focusIdx = i; _renderFocus(); };
        listEl.appendChild(item);
      });
    }

    function _renderFocus() {
      document.querySelectorAll('.v33-cmd-item').forEach((el,i) => el.classList.toggle('focused', i===_focusIdx));
    }

    function filter(q) {
      _focusIdx = 0;
      if (!q) { _filtered = [...COMMANDS]; _render(_filtered); return; }
      const lq = q.toLowerCase();
      _filtered = COMMANDS.filter(c => c.title.toLowerCase().includes(lq) || (c.sub||'').toLowerCase().includes(lq));
      // Also search open files
      const files = Object.keys(window.FS?.files || {}).filter(f=>f.toLowerCase().includes(lq));
      files.slice(0,5).forEach(f => {
        _filtered.push({ icon:'fa-file-code', color:'#71717a', bg:'rgba(255,255,255,0.04)', title:f, sub:'Open file', action:()=>window.FS?.openFile?.(f) });
      });
      _render(_filtered);
    }

    function handleKey(e) {
      if (e.key === 'Escape') { hide(); return; }
      if (e.key === 'ArrowDown') { _focusIdx = Math.min(_focusIdx+1, _filtered.length-1); _renderFocus(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { _focusIdx = Math.max(_focusIdx-1, 0); _renderFocus(); e.preventDefault(); }
      if (e.key === 'Enter') { _filtered[_focusIdx]?.action?.(); hide(); }
    }

    function show() {
      panel?.classList.add('active');
      _filtered = [...COMMANDS]; _render(_filtered);
      setTimeout(() => input?.focus(), 50);
    }

    function hide() { panel?.classList.remove('active'); if(input) input.value=''; }

    _allCmds = COMMANDS;

    return { show, hide, filter, handleKey };
  })();
  window.V33CommandPalette = V33CommandPalette;

  /* ─────────────────────────────────��─────────────────────────────────
     §7  ERROR BOUNDARY & CRASH RECOVERY
     ──────────────────────────��──────────────────────────────────────── */
  const V33ErrorBoundary = (() => {
    const screen = document.getElementById('v33-crash-screen');
    let _lastError = null;
    let _autosaved = false;

    function autosave() {
      if (_autosaved) return;
      try {
        const files = window.FS?.files || {};
        if (Object.keys(files).length > 0) {
          localStorage.setItem('v33-crash-autosave', JSON.stringify({ files, ts: Date.now() }));
          _autosaved = true;
        }
      } catch {}
    }

    function showCrash(err) {
      autosave();
      _lastError = err;
      const msgEl = document.getElementById('v33-crash-msg');
      const stackEl = document.getElementById('v33-crash-stack');
      if (msgEl) msgEl.textContent = err?.message || 'Unknown error. Your work has been auto-saved.';
      if (stackEl) stackEl.textContent = err?.stack?.slice(0,800) || '';
      screen?.classList.add('active');
    }

    function recover() {
      screen?.classList.remove('active');
      // Try to restore autosaved files
      try {
        const saved = JSON.parse(localStorage.getItem('v33-crash-autosave') || 'null');
        if (saved?.files && window.FS) {
          FS.files = saved.files;
          FS.refreshTree?.();
          V32Toast?.show('🔧 Files recovered from auto-save', 'success', 3000);
        }
      } catch {}
    }

    // Global error handler
    window.addEventListener('error', (e) => {
      if (e.filename?.includes('monaco') || e.message?.includes('monaco')) return; // Ignore Monaco errors
      if (e.message?.includes('Script error')) return;
      console.error('V33 ErrorBoundary caught:', e.error || e.message);
      autosave();
      V32Toast?.show('⚠ Error caught: ' + (e.message||'unknown').slice(0,60), 'error', 5000);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('V33 Unhandled Promise Rejection:', e.reason);
      autosave();
      V32Toast?.show('⚠ Promise rejected: ' + String(e.reason||'').slice(0,60), 'warn', 4000);
      e.preventDefault();
    });

    return { showCrash, recover, autosave };
  })();
  window.V33ErrorBoundary = V33ErrorBoundary;

  /* ───────────────────────────────────────────────────────────────────
     §8  RIBBON ADDITIONS & GLOBAL KEYBOARD
     ─────────────────────────────────────────────────────────────────── */
  // Add new buttons to existing ribbon
  setTimeout(() => {
    const ribbon = document.getElementById('v32-ribbon');
    if (ribbon) {
      const sep = document.createElement('div'); sep.className = 'v33-ribbon-sep'; ribbon.appendChild(sep);
      const btns = [
        { title:'CSS Tokens', icon:'fa-paint-brush', action:'V33TokenInspector.show()' },
      ];
      btns.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'v32-ribbon-btn'; btn.title = b.title;
        btn.innerHTML = _sanitize(`<i class="fas ${b.icon}"></i>`);
        btn.setAttribute('onclick', b.action);
        ribbon.appendChild(btn);
      });
    }
  }, 500);

  // Additional keyboard shortcuts
  if (window.V32EventRegistry) {
    V32EventRegistry.register('v33-keys', document, 'keydown', (e) => {
      // Ctrl+Shift combos
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'I' || e.key === 'i') { e.preventDefault(); V33DevTools.toggle(); }
        if (e.key === 'P' || e.key === 'p') { e.preventDefault(); V33CommandPalette.show(); }
      }
    });
  }

  /* ───────────────────────────────────────────────────────────────────
     §9  PATCH PREVIEW BAR BUTTONS
     ─────────────────────────────────────────────────────────────────── */
  setTimeout(() => {
    const ptoolbar = document.querySelector('.preview-toolbar');
    if (ptoolbar && !ptoolbar.querySelector('.v33-devtools-btn')) {
      const dt = document.createElement('button');
      dt.className = 'btn icon small v33-devtools-btn';
      dt.title = 'DevTools (Ctrl+Shift+I)';
      dt.innerHTML = '<i class="fas fa-tools"></i>';
      dt.onclick = () => V33DevTools.toggle();
      ptoolbar.querySelector('.flex.ac.gap-2:last-child')?.appendChild(dt);
    }
  }, 600);

  /* ───────────────────────────────────────────────────────────────────
     §10  BOOT + INIT
     ─────────────────────────────────────────────────────────────────── */
  setTimeout(async () => {
    try {
      // Auto-save every 60s for crash recovery
      setInterval(() => V33ErrorBoundary.autosave(), 60000);

      // Spatial Audio is opt-in via Hamburger Menu → "Adaptive Audio" toggle.
      // Do NOT auto-enable on first keydown/click — wait for explicit user consent.

      // Single boot notification (all version toasts consolidated here)
      V32Toast?.show('✦ ProCode IDE ∞ UNIFIED — Ready', 'success', 3000);
      // V32Toast?.show('✦ ProCode IDE v33 — ULTIMATE EVOLUTION activated!', 'info', 5000); // suppressed
      // setTimeout(() => V32Toast?.show('🎮 Ctrl+Shift+B = Blueprint · Ctrl+Shift+I = DevTools · Ctrl+Shift+N = Snippets', 'info', 5000), 1500); // suppressed

      if (window.V32CommandBus) {
        V32CommandBus.emit('ide:v33-ready', { version: '33.0.0' });
      }

      console.log('%c✦ ProCode IDE v3.0%c', 'color:#a855f7;font-size:14px;font-weight:900', '');
      // console.log('%c  Blueprint · DevTools · Spatial Audio · Token Inspector · Deploy · Snippets · CommandPalette v2 · Error Boundary', 'color:#52525b;font-size:10px');
    } catch(e) { console.error('V33 boot error:', e); }
  }, 9000); // Unified: reduced boot stagger

})(); // END V33 IIFE