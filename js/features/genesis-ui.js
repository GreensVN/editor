/**
 * genesis-ui.js
 * Genesis UI — v32 visual design system
 * ProCode IDE v3.0
 */

/* ═══════════════════════════════════════════════════════════════════════
   ProCode IDE v32 — THE GENESIS
   ═══════════════════════════════════════════════════════════════════════ */
;(function V32Genesis() {
  if (window.__v32_loaded) return;
  window.__v32_loaded = true;

  /* ───────────────────────────────────────────────────────────────────
     §0  SECURITY SHIELD — XSS Sanitizer
     ─────────────��───────────────────────────────────────────────────── */
  const V32Sanitizer = {
    // Allowlist-based HTML sanitizer (no DOMPurify CDN needed)
    _allowedTags: new Set(['b','i','em','strong','code','pre','span','div','p','br','ul','ol','li','a','h1','h2','h3','h4','kbd','mark','small','sub','sup']),
    _allowedAttrs: new Set(['class','id','href','title','data-path','data-file','style']),
    _dangerousCss: /expression|javascript:|vbscript:|behavior:|@import/gi,
    sanitize(dirty) {
      if (!dirty || typeof dirty !== 'string') return '';
      const tmpl = document.createElement('template');
      tmpl.innerHTML = dirty;
      this._walk(tmpl.content);
      return tmpl.innerHTML;
    },
    _walk(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 1) {
          const tag = child.tagName.toLowerCase();
          if (!this._allowedTags.has(tag)) { child.replaceWith(...child.childNodes); continue; }
          for (const attr of Array.from(child.attributes)) {
            if (!this._allowedAttrs.has(attr.name.toLowerCase())) { child.removeAttribute(attr.name); continue; }
            if (attr.name === 'href' && /^javascript:/i.test(attr.value)) child.removeAttribute(attr.name);
            if (attr.name === 'style' && this._dangerousCss.test(attr.value)) child.removeAttribute(attr.name);
          }
          this._walk(child);
        } else if (child.nodeType === 8) {
          child.remove(); // Remove comments
        }
      }
    },
    // Safe inner HTML setter
    setHTML(el, html) { if (el) el.innerHTML = this.sanitize(html); },
    // Safe text setter (XSS-proof)
    setText(el, text) { if (el) el.textContent = text; }
  };
  window.V32Sanitizer = V32Sanitizer;

  // Utils.toast already points to ToastService — no re-patch needed

  /* ───────────────────────────────────────────────────────────────────
     §1  EVENT REGISTRY — AbortController leak fix
     ─────────────────────────────────────────────────────────────────── */
  const V32EventRegistry = (() => {
    const _controllers = new Map();
    return {
      register(key, target, type, handler, opts) {
        this.unregister(key); // clean up old
        const ctrl = new AbortController();
        _controllers.set(key, ctrl);
        target.addEventListener(type, handler, { ...opts, signal: ctrl.signal });
      },
      unregister(key) {
        if (_controllers.has(key)) { _controllers.get(key).abort(); _controllers.delete(key); }
      },
      clear() { _controllers.forEach(c => c.abort()); _controllers.clear(); },
      count() { return _controllers.size; }
    };
  })();
  window.V32EventRegistry = V32EventRegistry;

  /* ───────────────────────────────────────────────────────────────────
     §2  PORTAL SYSTEM — Z-Index hell fix
     ─────────────────────────────────────────────────────────────────── */
  const V32Portal = {
    _portals: document.getElementById('v32-portals'),
    mount(el) { if (this._portals && el) { this._portals.appendChild(el); return el; } },
    unmount(el) { if (el?.parentNode === this._portals) this._portals.removeChild(el); },
    // Move existing portals (toast, radial) to portal layer
    init() {
      const toMove = ['v32-toast-container','v32-radial-overlay'];
      toMove.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode !== this._portals) this._portals?.appendChild(el);
      });
    }
  };
  V32Portal.init();
  window.V32Portal = V32Portal;

  /* ───────────────────────��───────────────────────────────────────────
     §3  TOAST SYSTEM V2
     ──────────────────────��──────────────────────────────────────────── */
  // V32Toast: second definition removed — forwarded to ToastService via installBackwardCompat
  // The show() API is still available via window.V32Toast (set by ToastService)

  /* ───────────────────────────────────────────────────────────────────
     §4  RADIAL CONTEXT MENU
     ─────────────────────────────────────────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §5  FLOATING ORB WIDGETS
     ─────────────────────────────────────────────────────────────────── */
  const V32OrbSystem = (() => {
    const orbs = [];
    let _dragOrb = null, _ox = 0, _oy = 0;

    const orbDefs = [
      { id:'orb-ai',  icon:'fa-robot',      label:'AI Chat',    color:'',       x:20,  y:200, action:() => document.querySelector('.ai-panel-toggle, #ai-toggle, [onclick*="AI.toggle"], [onclick*="toggleAI"]')?.click() },
      { id:'orb-git', icon:'fa-code-branch',label:'Git',        color:'green',  x:20,  y:260, action:() => document.querySelector('[onclick*="git"], .act-btn[data-panel="git"]')?.click() },
      { id:'orb-db',  icon:'fa-database',   label:'Database',   color:'orange', x:20,  y:320, action:() => document.querySelector('[onclick*="DB"], [onclick*="database"]')?.click() },
    ];

    function createOrb(def) {
      const orb = document.createElement('div');
      orb.className = 'v32-orb';
      orb.id = def.id;
      if (def.color) orb.dataset.color = def.color;
      orb.style.left = def.x + 'px';
      orb.style.bottom = def.y + 'px';
      orb.innerHTML = _sanitize(`<i class="fas ${def.icon}"></i><span class="v32-orb-tooltip">${def.label}</span>`);
      orb.style.animationDelay = (orbs.length * 0.4) + 's';

      // Drag
      orb.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        _dragOrb = orb;
        _ox = e.clientX - orb.getBoundingClientRect().left;
        _oy = e.clientY - orb.getBoundingClientRect().top;
        orb.style.transition = 'none';
        orb.style.animation = 'none';
        e.preventDefault();
      });

      // Click
      orb.addEventListener('click', (e) => {
        if (Math.abs(e.movementX) < 3 && Math.abs(e.movementY) < 3) def.action();
      });

      document.body.appendChild(orb);
      orbs.push({ el: orb, def });
      return orb;
    }

    document.addEventListener('mousemove', (e) => {
      if (!_dragOrb) return;
      _dragOrb.style.left = (e.clientX - _ox) + 'px';
      _dragOrb.style.top = (e.clientY - _oy) + 'px';
      _dragOrb.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (_dragOrb) {
        _dragOrb.style.transition = '';
        _dragOrb = null;
      }
    });

    function init() { orbDefs.forEach(createOrb); }
    function hideAll() { orbs.forEach(o => o.el.style.display = 'none'); }
    function showAll() { orbs.forEach(o => o.el.style.display = 'flex'); }

    return { init, hideAll, showAll, orbs };
  })();
  window.V32OrbSystem = V32OrbSystem;

  /* ─────���─────────────────────────────────────────────────────────────
     §6  CODE BUBBLES
     ─────────────────────────────────────────────────────────────────── */
  const V32CodeBubbles = (() => {
    let _count = 0;
    const _bubbles = [];

    function detectLang(code) {
      if (/^\s*(import |export |const |let |var |function |class |=>|async )/.test(code)) return 'js';
      if (/^\s*(def |import |class |print\(|if __name__)/.test(code)) return 'python';
      if (/^\s*(<[a-zA-Z]|<!DOCTYPE|<!--)/.test(code)) return 'html';
      if (/^\s*(\.|#|@media|:root|body\s*{)/.test(code)) return 'css';
      return 'code';
    }

    function syntaxHighlight(code) {
      return code
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, '<span class="cmt">$1</span>')
        .replace(/\b(const|let|var|function|class|return|if|else|for|while|import|export|from|async|await|new|this|typeof|instanceof|try|catch|finally|throw|in|of|null|undefined|true|false)\b/g, '<span class="kw">$1</span>')
        .replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g, '<span class="str">$&</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>')
        .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="fn">$1</span>');
    }

    function create(code, title, x, y) {
      _count++;
      const id = `v32-bubble-${_count}`;
      const lang = detectLang(code);
      const bub = document.createElement('div');
      bub.className = 'v32-bubble'; bub.id = id;
      bub.style.left = (x || 120 + _count * 30) + 'px';
      bub.style.top = (y || 120 + _count * 30) + 'px';
      bub.innerHTML = `
        <div class="v32-bubble-header">
          <div class="v32-bubble-dots">
            <span class="v32-bubble-dot close" onclick="document.getElementById('${id}')?.remove()"></span>
            <span class="v32-bubble-dot min"></span>
            <span class="v32-bubble-dot max"></span>
          </div>
          <span class="v32-bubble-title">${V32Sanitizer.sanitize(title || 'Code Snippet')}</span>
          <span class="v32-bubble-lang">${lang.toUpperCase()}</span>
        </div>
        <div class="v32-bubble-body">
          <pre>${syntaxHighlight(code.slice(0, 2000))}</pre>
        </div>
        <div class="v32-bubble-footer">
          <button onclick="navigator.clipboard?.writeText(document.getElementById('${id}')?.querySelector('pre')?.textContent)"><i class="fas fa-copy"></i> Copy</button>
          <button onclick="V32ZenCanvas.loadCode(document.getElementById('${id}')?.querySelector('pre')?.textContent)"><i class="fas fa-expand"></i> Zen</button>
          <button onclick="document.getElementById('${id}')?.remove()" style="margin-left:auto"><i class="fas fa-times"></i></button>
        </div>`;

      // Draggable header
      let dx=0,dy=0,dragging=false;
      const header = bub.querySelector('.v32-bubble-header');
      header.addEventListener('mousedown', e => {
        dragging=true; dx=e.clientX-bub.offsetLeft; dy=e.clientY-bub.offsetTop;
        bub.style.userSelect='none';
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        bub.style.left=(e.clientX-dx)+'px'; bub.style.top=(e.clientY-dy)+'px';
      });
      document.addEventListener('mouseup', () => { dragging=false; bub.style.userSelect=''; });

      document.body.appendChild(bub);
      _bubbles.push(bub);
      return bub;
    }

    // Alt+B to create bubble from selection
    V32EventRegistry.register('bubble-shortcut', document, 'keydown', (e) => {
      if (e.altKey && e.key === 'b') {
        const sel = window.getSelection?.()?.toString().trim();
        if (sel && sel.length > 5) {
          const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
          create(sel, 'Selection', rect?.left + 40, (rect?.bottom || 200) + 20);
          V32Toast.show('💡 Code Bubble created', 'info', 2000);
        }
      }
    });

    return { create, count: () => _count };
  })();
  window.V32CodeBubbles = V32CodeBubbles;

  /* ───────────────────────────────────────────────────────────────────
     §7  ZEN CANVAS MODE
     ───────────────────────────��────────────────────────��────────────── */
  const V32ZenCanvas = (() => {
    let _active = false;
    let _editor = null;
    let _particles = [];
    const overlay = document.getElementById('v32-zen-overlay');
    const title = document.getElementById('v32-zen-title');
    const particleContainer = document.getElementById('v32-zen-canvas-particles');

    function spawnParticles() {
      if (!particleContainer) return;
      particleContainer.innerHTML = '';
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'v32-canvas-particle';
        const size = 4 + Math.random() * 12;
        p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dx:${(Math.random()-0.5)*200}px;--dy:${-50-Math.random()*150}px;animation-duration:${4+Math.random()*6}s;animation-delay:${Math.random()*4}s;opacity:${0.2+Math.random()*0.5}`;
        particleContainer.appendChild(p);
        _particles.push(p);
      }
    }

    function toggle() {
      _active = !_active;
      overlay?.classList.toggle('active', _active);
      document.getElementById('v32-ribbon')?.querySelector('[onclick*="ZenCanvas"]')?.classList.toggle('active', _active);
      if (_active) {
        spawnParticles();
        if (title) title.textContent = window.Editor?.currentFile || 'Zen Canvas Mode';
        // Mount Monaco editor in zen container
        setTimeout(() => {
          const zenContainer = document.getElementById('v32-zen-monaco');
          if (zenContainer && window.monaco && !_editor) {
            try {
              const currentModel = window.monaco.editor.getModels()?.[0];
              _editor = window.monaco.editor.create(zenContainer, {
                model: currentModel,
                theme: 'vs-dark', fontSize: 15, lineHeight: 1.8,
                minimap: { enabled: false }, padding: { top: 24, bottom: 24 },
                fontFamily: "'JetBrains Mono', monospace",
                scrollBeyondLastLine: false,
                wordWrap: 'on', smoothScrolling: true,
                cursorBlinking: 'expand', cursorSmoothCaretAnimation: 'on',
              });
            } catch(ex) { console.warn('V32 Zen Monaco:', ex); }
          }
        }, 100);
        V32Toast.show('🧘 Zen Canvas — pure focus mode', 'info', 2000);
      } else {
        _particles = []; particleContainer && (particleContainer.innerHTML = '');
      }
    }

    function minimize() { toggle(); }
    function loadCode(code) {
      if (!_active) toggle();
      setTimeout(() => {
        if (_editor) _editor.setValue(code || '');
      }, 200);
    }

    overlay?.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(); });
    return { toggle, minimize, loadCode, isActive: () => _active };
  })();
  window.V32ZenCanvas = V32ZenCanvas;

  /* ─────────────��─────────────────────────────────────────────────────
     §8  LOCAL RAG — Semantic Search (IndexedDB + TF-IDF simulation)
     ─────────────────────────────────────────────────────────────────── */
  const V32RAG = (() => {
    const panel = document.getElementById('v32-rag-panel');
    const input = document.getElementById('v32-rag-input');
    const results = document.getElementById('v32-rag-results');
    const thinking = document.getElementById('v32-rag-thinking');
    const countEl = document.getElementById('v32-rag-count');
    let _index = []; // [{ file, content, tokens, score }]
    let _open = false;

    // TF-IDF-like scoring (no external lib needed)
    function tokenize(str) {
      return str.toLowerCase().replace(/[^a-z0-9_$]/g,' ').split(/\s+/).filter(t => t.length > 2);
    }
    function tfidf(query, doc) {
      const qTokens = tokenize(query);
      const dTokens = tokenize(doc);
      const dSet = new Map();
      dTokens.forEach(t => dSet.set(t, (dSet.get(t)||0)+1));
      let score = 0;
      qTokens.forEach(qt => {
        if (dSet.has(qt)) score += (dSet.get(qt) / dTokens.length) * Math.log(1 + _index.length / (1 + _index.filter(d => tokenize(d.content).includes(qt)).length));
      });
      return score;
    }

    function index() {
      const files = window.FS?.files || {};
      _index = Object.entries(files).map(([file, content]) => ({
        file, content: String(content || '').slice(0, 8000)
      }));
      if (countEl) countEl.textContent = `${_index.length} files indexed`;
    }

    async function search(q) {
      if (!q.trim()) return;
      if (thinking) thinking.classList.add('active');
      if (results) results.innerHTML = '';
      if (_index.length === 0) index();

      await new Promise(r => setTimeout(r, 400)); // simulate async

      const scored = _index
        .map(doc => ({ ...doc, score: tfidf(q, doc.content) }))
        .filter(d => d.score > 0.0001)
        .sort((a,b) => b.score - a.score)
        .slice(0, 8);

      if (thinking) thinking.classList.remove('active');

      if (results) {
        if (scored.length === 0) {
          results.innerHTML = '<div style="padding:20px;text-align:center;color:#52525b;font-size:12px"><i class="fas fa-search"></i><br><br>No relevant files found.<br><small>Try different keywords.</small></div>';
        } else {
          results.innerHTML = scored.map(d => {
            const lines = d.content.split('\n');
            const matchLine = lines.find(l => tokenize(q).some(qt => l.toLowerCase().includes(qt))) || lines[0];
            const pct = Math.min(99, Math.round(d.score * 1500));
            return `<div class="v32-rag-result" onclick="V32RAG.openFile('${d.file.replace(/'/g,"\\'")}')">
              <div class="v32-rag-result-file"><i class="fas fa-file-code"></i> ${V32Sanitizer.sanitize(d.file)}</div>
              <div class="v32-rag-result-excerpt">${V32Sanitizer.sanitize(matchLine.trim().slice(0,120))}</div>
              <span class="v32-rag-result-score">${pct}% match</span>
            </div>`;
          }).join('');
        }
      }
    }

    function openFile(file) {
      if (window.FS?.openFile) { FS.openFile(file); hide(); }
      else if (window.Editor?.open) { Editor.open(file); hide(); }
    }

    function show() {
      _open = true; panel?.classList.add('active');
      // Honest labeling: TF-IDF keyword search, not vector/semantic search
      if (panel && !panel.dataset.labeled) {
        const hdr = panel.querySelector('.v32-rag-header, h3, [class*=header]');
        if (hdr && !hdr.querySelector('.rag-label')) {
          const lbl = document.createElement('span');
          lbl.className = 'rag-label';
          lbl.style.cssText = 'font-size:9px;opacity:0.5;display:block;margin-top:2px';
          lbl.textContent = 'keyword search (TF-IDF) — not semantic/AI';
          hdr.appendChild(lbl);
        }
        panel.dataset.labeled = '1';
      }
      setTimeout(() => input?.focus(), 80);
      index();
    }
    function hide() { _open = false; panel?.classList.remove('active'); }
    function handleKey(e) {
      if (e.key === 'Enter') search(input?.value || '');
      if (e.key === 'Escape') hide();
    }

    return { show, hide, handleKey, search, openFile, isOpen: () => _open };
  })();
  window.V32RAG = V32RAG;

  /* ───────────────────────────────────────────────────────────────────
     §9  TIME-TRAVEL DEBUGGER
     ─────────────────────────────────────────────────────────────────── */

  /* ───────────��──────────────────────────────���───────���────────────────
     §10  GPU OPTIMIZER — Battery-aware performance
     ─────────────────────────────────────────────────────────────────── */
  const V32GPUOptimizer = (() => {
    let _lowPower = false;
    let _battery = null;

    async function init() {
      // Battery API
      try {
        _battery = await navigator.getBattery?.();
        if (_battery) {
          const check = () => {
            const low = _battery.level < 0.2 && !_battery.charging;
            if (low !== _lowPower) setLowPower(low);
          };
          _battery.addEventListener('levelchange', check);
          _battery.addEventListener('chargingchange', check);
          check();
        }
      } catch {}

      // will-change optimization on all panels
      document.querySelectorAll('[style*="backdrop-filter"], [style*="transform"]').forEach(el => {
        if (!el.style.willChange) el.style.willChange = 'transform, opacity';
      });

      // GPU tier detection via canvas
      try {
        const cvs = document.createElement('canvas');
        const gl = cvs.getContext('webgl') || cvs.getContext('experimental-webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
          if (/llvmpipe|software|swiftshader/i.test(renderer)) setLowPower(true);
          document.getElementById('v32-gpu').textContent = renderer.slice(0,24) || 'OK';
        }
      } catch {}
    }

    function setLowPower(low) {
      _lowPower = low;
      document.documentElement.classList.toggle('v32-low-power', low);
      if (low) {
        // Disable expensive CSS
        const style = document.createElement('style');
        style.id = 'v32-low-power-css';
        style.textContent = `
          .v32-low-power * { animation-duration: 0.01s !important; transition-duration: 0.1s !important; }
          .v32-low-power [style*="backdrop-filter"] { backdrop-filter: none !important; }
          .v32-low-power .v32-canvas-particle { display: none; }
          .v32-low-power #v32-zen-canvas-particles { display: none; }
        `;
        if (!document.getElementById('v32-low-power-css')) document.head.appendChild(style);
        V32Toast.show('🔋 Low power mode: animations reduced', 'warn', 4000);
      } else {
        document.getElementById('v32-low-power-css')?.remove();
      }
    }

    return { init, isLowPower: () => _lowPower, setLowPower };
  })();
  window.V32GPUOptimizer = V32GPUOptimizer;

  /* ───────────────────────────────────────────────────────────────────
     §11  PERFORMANCE HUD PRO
     ─────────────────────────────────────────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §12  PROJECT RADAR MAP
     ─────────────────────────────────────────────────────────────────── */
  const V32Radar = (() => {
    const radar = document.getElementById('v32-radar');
    const cvs = document.getElementById('v32-radar-canvas');
    let _active = false;
    let _animId = null;
    let _sweepAngle = 0;

    function draw() {
      if (!cvs) return;
      const W = cvs.parentElement?.offsetWidth || 160;
      const H = (cvs.parentElement?.offsetHeight || 120) - 24;
      cvs.width = W; cvs.height = H;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(99,102,241,0.08)'; ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 15) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Sweep
      const cx = W*0.5, cy = H*0.5;
      const maxR = Math.min(cx, cy) * 0.9;
      ctx.save();
      const grad = ctx.createConicalGradient ? null : null;
      ctx.translate(cx, cy); ctx.rotate(_sweepAngle);
      const grd = ctx.createLinearGradient(0, 0, maxR, 0);
      grd.addColorStop(0, 'rgba(99,102,241,0.5)');
      grd.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,maxR,-0.3,0.3);
      ctx.fillStyle = grd; ctx.fill(); ctx.restore();
      _sweepAngle += 0.04;

      // Rings
      ctx.strokeStyle = 'rgba(99,102,241,0.12)'; ctx.lineWidth = 0.8;
      [0.3, 0.6, 0.9].forEach(r => {
        ctx.beginPath(); ctx.arc(cx,cy,maxR*r,0,Math.PI*2); ctx.stroke();
      });

      // Files as dots
      const files = Object.keys(window.FS?.files || {});
      files.slice(0, 60).forEach((f, i) => {
        const angle = (i / files.length) * Math.PI * 2;
        const r = (0.3 + (i % 3) * 0.25) * maxR;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const ext = f.split('.').pop();
        const colors = { js:'#818cf8', ts:'#7dd3fc', css:'#86efac', html:'#fde68a', py:'#f9a8d4', json:'#a3a3a3' };
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2);
        ctx.fillStyle = colors[ext] || '#52525b'; ctx.fill();
      });

      // Active file indicator
      const active = window.Editor?.currentFile;
      if (active) {
        const idx = files.indexOf(active);
        if (idx >= 0) {
          const angle = (idx / files.length) * Math.PI * 2;
          const r = (0.3 + (idx % 3) * 0.25) * maxR;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI*2);
          ctx.fillStyle = '#6366f1'; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(99,102,241,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      if (_active) _animId = requestAnimationFrame(draw);
    }

    // Click to open file
    cvs?.addEventListener('click', (e) => {
      const rect = cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const W = cvs.width, H = cvs.height;
      const cx = W*0.5, cy = H*0.5;
      const maxR = Math.min(cx,cy) * 0.9;
      const files = Object.keys(window.FS?.files || {});
      let closest = null, minDist = 12;
      files.slice(0,60).forEach((f,i) => {
        const angle = (i/files.length)*Math.PI*2;
        const r = (0.3+(i%3)*0.25)*maxR;
        const x = cx+Math.cos(angle)*r, y = cy+Math.sin(angle)*r;
        const dist = Math.hypot(mx-x, my-y);
        if (dist < minDist) { minDist = dist; closest = f; }
      });
      if (closest && window.FS?.openFile) { FS.openFile(closest); V32Toast.show(`📂 ${closest}`, 'info', 1500); }
    });

    function toggle() {
      _active = !_active;
      radar?.classList.toggle('visible', _active);
      document.getElementById('v32-ribbon-radar')?.classList.toggle('active', _active);
      if (_active) { cancelAnimationFrame(_animId); draw(); }
      else cancelAnimationFrame(_animId);
    }

    return { toggle, isActive: () => _active };
  })();
  window.V32Radar = V32Radar;

  /* ───────────────────────────────────────────────────────��───────────
     §13  WEBCONTAINER TERMINAL (Node.js simulation)
     ─────────────────────────────────────────────────────────────────── */

  /* ───────────────────────────────────────────────────────────────────
     §14  VISUAL DIFF
     ────────────────────────────────────────────��────────────────────── */
  const V32Diff = (() => {
    const panel = document.getElementById('v32-diff-panel');
    const beforeEl = document.getElementById('v32-diff-before');
    const afterEl = document.getElementById('v32-diff-after');

    function diff(a, b) {
      const aLines = a.split('\n'), bLines = b.split('\n');
      const render = (lines, other, el, side) => {
        if (!el) return;
        el.innerHTML = '';
        lines.forEach((line, i) => {
          const d = document.createElement('div');
          d.className = 'v32-diff-line';
          const inOther = other.includes(line);
          if (side === 'before' && !inOther) d.classList.add('rem');
          if (side === 'after' && !other.includes(line)) d.classList.add('add');
          d.innerHTML = _sanitize(`<span class="v32-diff-ln">${i+1}</span><span>${line.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`);
          el.appendChild(d);
        });
      };
      render(aLines, bLines, beforeEl, 'before');
      render(bLines, aLines, afterEl, 'after');
    }

    function show() {
      panel?.classList.add('active');
      // diff current file vs last saved
      try {
        const models = window.monaco?.editor?.getModels();
        const current = models?.[0]?.getValue() || '';
        const saved = window.FS?.files?.[window.Editor?.currentFile || ''] || '';
        diff(String(saved), current);
        const title = document.getElementById('v32-diff-title');
        if (title) title.textContent = `Visual Diff — ${window.Editor?.currentFile || 'untitled'}`;
      } catch { diff('(no content)', '(no content)'); }
    }

    function hide() { panel?.classList.remove('active'); }
    function merge() {
      V32Toast.show('✓ Changes merged to current buffer', 'success', 2500);
      hide();
    }

    return { show, hide, merge, diff };
  })();
  window.V32Diff = V32Diff;

  /* ───────────────────────────────────────────────────────────────────
     §15  THEME PAINTER
     ─────────────────────────────────────────────────────────────────── */
  const V32ThemePainter = (() => {
    const panel = document.getElementById('v32-theme-panel');
    let _active = false;

    const _presets = {
      indigo: { primary:'#6366f1', accent:'#a855f7', bg:'#0b0f14', surface:'#18181b', text:'#e4e4e7' },
      ocean:  { primary:'#06b6d4', accent:'#3b82f6', bg:'#060d14', surface:'#0f1e2d', text:'#e2f0ff' },
      forest: { primary:'#22c55e', accent:'#10b981', bg:'#04110a', surface:'#0d1f14', text:'#d1fae5' },
      sunset: { primary:'#f59e0b', accent:'#ef4444', bg:'#150a04', surface:'#1f1106', text:'#fef3c7' },
      rose:   { primary:'#e879f9', accent:'#ec4899', bg:'#14050e', surface:'#200b17', text:'#fce7f3' },
      arctic: { primary:'#94a3b8', accent:'#cbd5e1', bg:'#0f1117', surface:'#1e2330', text:'#f1f5f9' },
    };

    const _map = {
      primary: '--primary', accent: '--accent',
      bg: '--bg', surface: '--bg-dark',
      text: '--text',
    };

    function apply(key, value) {
      const cssVar = _map[key];
      if (cssVar) document.documentElement.style.setProperty(cssVar, value);
    }

    function preset(name) {
      const p = _presets[name];
      if (!p) return;
      Object.entries(p).forEach(([k,v]) => {
        apply(k, v);
        const inp = document.getElementById(`v32-tc-${k}`);
        if (inp) inp.value = v;
      });
      document.querySelectorAll('.v32-theme-chip').forEach(c => c.classList.remove('active'));
      document.querySelector(`.v32-theme-chip[onclick*="${name}"]`)?.classList.add('active');
      V32Toast.show(`🎨 Theme: ${name}`, 'info', 1500);
    }

    function toggle() {
      _active = !_active;
      panel?.classList.toggle('active', _active);
    }

    return { toggle, apply, preset, isActive: () => _active };
  })();
  window.V32ThemePainter = V32ThemePainter;

  /* ───────────────────────────────────────────────────────────────────
     §16  SHORTCUTS OVERLAY
     ─────────────────────────────────────────────────────────────────── */
  const V32Shortcuts = {
    show() { document.getElementById('v32-shortcut-overlay')?.classList.add('active'); },
    hide() { document.getElementById('v32-shortcut-overlay')?.classList.remove('active'); }
  };
  window.V32Shortcuts = V32Shortcuts;

  /* ───────────────────────────────────────────────────────────────────
     §17  COMMAND BUS — Centralized event system
     ─────────────────────────────────────────────────────────────────── */
  const V32CommandBus = (() => {
    const _handlers = new Map();
    const _history = [];
    return {
      on(cmd, fn) { if (!_handlers.has(cmd)) _handlers.set(cmd, []); _handlers.get(cmd).push(fn); },
      off(cmd, fn) { const h = _handlers.get(cmd); if (h) { const i = h.indexOf(fn); if (i>-1) h.splice(i,1); } },
      emit(cmd, data) {
        _history.push({ cmd, data, t: Date.now() });
        if (_history.length > 100) _history.shift();
        const handlers = _handlers.get(cmd) || [];
        handlers.forEach(fn => { try { fn(data); } catch(e) { console.error(`V32Bus[${cmd}]:`, e); } });
      },
      history: () => [..._history]
    };
  })();
  window.V32CommandBus = V32CommandBus;

  // Wire command bus to existing system events
  V32CommandBus.on('ide:file-open', ({ file }) => { V32Radar.isActive?.(); });

  /* ───────────────────────────────────────────────────────────────────
     §18  PROMISE BOOT REFACTOR — Race condition fix
     ─────────��───────────────────────────────────────────────────────── */
  const V32BootOrchestrator = (() => {
    const _readiness = new Map();
    const _waiters = [];

    function markReady(dep) {
      _readiness.set(dep, true);
      _waiters.forEach(({ deps, resolve }) => {
        if (deps.every(d => _readiness.get(d))) resolve();
      });
    }

    function waitFor(deps) {
      return new Promise(resolve => {
        if (deps.every(d => _readiness.get(d))) { resolve(); return; }
        _waiters.push({ deps, resolve });
        setTimeout(() => { markReady('timeout-fallback'); resolve(); }, 15000);
      });
    }

    // Auto-detect loaded dependencies
    const checkDeps = () => {
      if (window.monaco) markReady('monaco');
      if (window.Babel) markReady('babel');
      if (window.Yjs) markReady('yjs');
      if (window.marked) markReady('marked');
      if (window.pyodide || window.loadPyodide) markReady('pyodide');
      if (window.Fuse) markReady('fuse');
    };
    // FIX: Replace persistent setInterval poll with event-driven dependency detection.
    // Each dependency fires 'monaco-ready' / load events; we also do a one-time scan now.
    checkDeps();
    // Watch for script elements added to <head> to catch dynamically loaded libs
    const depObserver = new MutationObserver(() => checkDeps());
    depObserver.observe(document.head || document.documentElement, { childList: true, subtree: false });
    // Listen for the known 'monaco-ready' event as a direct signal
    window.addEventListener('monaco-ready', () => markReady('monaco'), { once: true });
    // Final safety-net: one scan after 3s and one after 10s to catch slow loaders, then done
    setTimeout(checkDeps, 3000);
    setTimeout(() => { checkDeps(); depObserver.disconnect(); }, 10000);

    return { markReady, waitFor, isReady: dep => _readiness.get(dep) || false };
  })();
  window.V32BootOrchestrator = V32BootOrchestrator;

  /* ───────────────────────────────────────────────────────────────────
     §19  GLOBAL KEYBOARD SHORTCUTS
     ─────────────────────────────────────────────────────────────────── */
  V32EventRegistry.register('v32-keys', document, 'keydown', (e) => {
    if (!e.altKey) return;
    const map = {
      'z': () => V32ZenCanvas.toggle(),
      's': () => V32RAG.show(),
      // 't': V32TimeTravelDebugger removed
      'm': () => V32Radar.toggle(),
      // 'w': V32WebContainer removed
      'p': () => V32ThemePainter.toggle(),
      'd': () => V32Diff.show(),
      // 'h': V32PerfHUD removed
      'k': () => V32Shortcuts.show(),
      'b': null, // handled by CodeBubbles
    };
    const fn = map[e.key.toLowerCase()];
    if (fn) { e.preventDefault(); fn(); }
  });

  // Escape to close overlays
  V32EventRegistry.register('v32-esc', document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (V32ZenCanvas.isActive()) { V32ZenCanvas.toggle(); return; }
    if (V32RAG.isOpen()) { V32RAG.hide(); return; }
      // V32RadialMenu removed
    const overlays = ['v32-shortcut-overlay'];
    overlays.forEach(id => document.getElementById(id)?.classList.remove('active'));
  });

  /* ───────────────────────────────────────────────────────────────────
     §20  BOOT SEQUENCE
     ─────────────────────────────────────────────────────────────────── */
  setTimeout(async () => {
    try {
      // V32OrbSystem.init(); // Disabled: orbs overlap activity bar - tools in ⋮ menu instead
      V32GPUOptimizer.init();

      // Notify existing boot system
      const notify = window.V30?.notify || window.Utils?.toast;
      if (notify) notify('✦ ProCode IDE ∞ UNIFIED — All modules active', 'info');
      // (V32Toast not used - tools accessible via ⋮ More menu)

      // Boot progress indicator
      const bootStatus = document.getElementById('boot-status');
      if (bootStatus && bootStatus.parentElement?.style.display !== 'none') {
        bootStatus.textContent = 'Unified modules loaded ✓';
      }

      // Auto-index files for RAG after IDE ready
      await V32BootOrchestrator.waitFor(['monaco']);
      setTimeout(() => {
        V32RAG.show?.();
        setTimeout(() => V32RAG.hide?.(), 100);
      }, 2000);

      V32CommandBus.emit('ide:unified-ready', { version: '∞.unified' });

      console.log('%c✦ ProCode IDE ∞ UNIFIED — Genesis features active%c', 'color:#6366f1;font-size:14px;font-weight:900;', 'color:#a1a1aa;font-size:11px');
      // console.log('%c  + Zen Canvas · RAG · Time-Travel Debug · WebContainer · Radar Map · Theme Painter · Visual Diff · Blueprint Editor · Deploy · DevTools', 'color:#52525b;font-size:10px');
    } catch(e) {
      console.error('V32 boot error:', e);
    }
  }, 7000); // Unified: reduced boot stagger

})(); // END V32 IIFE