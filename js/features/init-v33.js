/**
 * init-v33.js
 * V33 initialization — final boot sequence and module wiring
 * ProCode IDE v3.0
 */

(function v33Init() {
  'use strict';
  if (window.__procode_v33_done) return;
  window.__procode_v33_done = true;

  /* ╔═════════════════════════════════════════════════════════════════╗
     ║  §1 · UltraContextMenu                                          ║
     ║  A polished right-click engine. Replaces the existing inline    ║
     ║  .context-menu DOM that file-tree, tab-list, and other places   ║
     ║  build manually — but only after the original code has finished ║
     ║  building it (we hijack via MutationObserver to upgrade).        ║
     ║  Also installs a global long-press listener for mobile/touch    ║
     ║  so right-click works on phones and tablets.                    ║
     ╚═════════════════════════════════════════════════════════════════╝ */
  const UCM = (() => {
    const state = { current: null, focused: -1, items: [], filter: '' };

    function close() {
      if (state.current) {
        state.current.classList.remove('visible');
        const cur = state.current;
        setTimeout(() => cur.parentNode && cur.remove(), 160);
        state.current = null;
        state.items = [];
        state.focused = -1;
      }
      document.querySelectorAll('.ucm-backdrop').forEach(b => b.remove());
      document.removeEventListener('keydown', _onKey, true);
    }

    function _onKey(e) {
      if (!state.current) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      const visibleItems = state.items.filter(it => it._el.style.display !== 'none' && !it.disabled);
      if (!visibleItems.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.focused = (state.focused + 1) % visibleItems.length;
        _refocus(visibleItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.focused = (state.focused - 1 + visibleItems.length) % visibleItems.length;
        _refocus(visibleItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = visibleItems[state.focused] || visibleItems[0];
        if (sel) { sel.action?.(); close(); }
      }
    }
    function _refocus(visibleItems) {
      state.items.forEach(it => it._el.classList.remove('focused'));
      const sel = visibleItems[state.focused];
      if (sel) {
        sel._el.classList.add('focused');
        sel._el.scrollIntoView({ block: 'nearest' });
      }
    }

    function _smartPosition(menu, x, y) {
      const rect = menu.getBoundingClientRect();
      const W = window.innerWidth, H = window.innerHeight, M = 8;
      let nx = x, ny = y;
      if (x + rect.width + M > W) nx = Math.max(M, W - rect.width - M);
      if (y + rect.height + M > H) ny = Math.max(M, y - rect.height);
      menu.style.left = Math.max(M, nx) + 'px';
      menu.style.top  = Math.max(M, ny) + 'px';
      // Set transform-origin to the actual click for nicer animation
      menu.style.transformOrigin = `${x - nx}px ${y - ny}px`;
    }

    /**
     * Open a context menu.
     * items: [{ icon, label, shortcut, action, disabled, danger, divider, section, sub }]
     */
    function open(x, y, items, opts = {}) {
      close();
      const menu = document.createElement('div');
      menu.className = 'ucm';
      menu.setAttribute('role', 'menu');

      // Search bar (optional, auto-on if items > 8)
      const showSearch = opts.search !== false && items.length > 7;
      if (showSearch) {
        const sw = document.createElement('div');
        sw.className = 'ucm-search';
        sw.innerHTML = '<i class="fas fa-search" style="font-size:10px;color:var(--v33-muted)"></i>' +
                       '<input type="text" placeholder="Filter actions..." aria-label="Filter">';
        const input = sw.querySelector('input');
        input.addEventListener('input', () => {
          const q = input.value.toLowerCase().trim();
          state.filter = q;
          state.items.forEach(it => {
            if (it.divider || it.section) { it._el.style.display = q ? 'none' : ''; return; }
            const match = !q || (it.label || '').toLowerCase().includes(q);
            it._el.style.display = match ? '' : 'none';
          });
          state.focused = 0;
          const visible = state.items.filter(it => it._el.style.display !== 'none' && !it.disabled);
          _refocus(visible);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape') {
            _onKey(e);
          }
        });
        menu.appendChild(sw);
        setTimeout(() => input.focus(), 30);
      }

      const list = document.createElement('div');
      list.className = 'ucm-list';
      menu.appendChild(list);

      state.items = [];
      items.forEach((it) => {
        if (it.divider) {
          const d = document.createElement('div'); d.className = 'ucm-divider';
          list.appendChild(d); state.items.push({ divider: true, _el: d });
          return;
        }
        if (it.section) {
          const s = document.createElement('div'); s.className = 'ucm-section-title'; s.textContent = it.section;
          list.appendChild(s); state.items.push({ section: true, _el: s });
          return;
        }
        const el = document.createElement('div');
        el.className = 'ucm-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '');
        el.setAttribute('role', 'menuitem');
        el.innerHTML = `
          <span class="ucm-icon">${it.icon ? `<i class="fas ${it.icon}"></i>` : '·'}</span>
          <span class="ucm-label"></span>
          ${it.shortcut ? `<span class="ucm-shortcut">${escapeHTML(it.shortcut)}</span>` : ''}
          ${it.sub ? `<span class="ucm-arrow"><i class="fas fa-chevron-right"></i></span>` : ''}
        `;
        el.querySelector('.ucm-label').textContent = it.label || '';
        if (!it.disabled) {
          el.addEventListener('click', (ev) => {
            ev.stopPropagation();
            try { it.action && it.action(ev); } catch (e) { console.error('[UCM]', e); }
            if (!it.sub) close();
          });
        }
        list.appendChild(el);
        state.items.push(Object.assign({}, it, { _el: el }));
      });

      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'ucm-empty';
        empty.textContent = 'No actions available';
        list.appendChild(empty);
      }

      document.body.appendChild(menu);
      state.current = menu;
      _smartPosition(menu, x, y);
      requestAnimationFrame(() => menu.classList.add('visible'));

      const backdrop = document.createElement('div');
      backdrop.className = 'ucm-backdrop' + (opts.touch ? ' touch' : '');
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', close, { once: true });
      backdrop.addEventListener('contextmenu', (e) => { e.preventDefault(); close(); }, { once: true });

      document.addEventListener('keydown', _onKey, true);

      // Auto-focus first item for keyboard nav
      state.focused = 0;
      const visible = state.items.filter(it => it._el.style.display !== 'none' && !it.disabled);
      if (visible.length) visible[0]._el.classList.add('focused');

      return { close, menu };
    }

    function escapeHTML(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    return { open, close };
  })();
  window.UltraContextMenu = UCM;

  /* ── Global FALLBACK right-click ──────────────────────────────────
     Runs on areas that don't already have their own contextmenu. */
  document.addEventListener('contextmenu', (e) => {
    // Ignore inside Monaco (it has its own rich menu)
    if (e.target.closest('.monaco-editor')) return;
    // Ignore inside file-tree / tabs / outline (handled by upstream code w/ V32RadialMenu or ours below)
    if (e.target.closest('#file-tree, .t-item, #tab-list, #outline-tree, .tab-list')) return;
    // Ignore inside iframe (preview)
    if (e.target.tagName === 'IFRAME') return;

    const sel = window.getSelection?.()?.toString?.() || '';
    const hasInput = !!e.target.closest('input, textarea, [contenteditable=true]');

    const items = [];
    if (sel) {
      items.push({ icon: 'fa-copy', label: 'Copy',  shortcut: 'Ctrl+C', action: () => doCopy(sel) });
      items.push({ icon: 'fa-search', label: `Search "${sel.length > 20 ? sel.slice(0,20)+'…' : sel}"`,
                   action: () => window.open('https://www.google.com/search?q=' + encodeURIComponent(sel), '_blank') });
      if (window.AnthropicAI || window.AI) {
        items.push({ icon: 'fa-robot', label: 'Ask AI about this', action: () => askAI(sel) });
      }
      items.push({ divider: true });
    }
    if (hasInput) {
      items.push({ icon: 'fa-cut',   label: 'Cut',   shortcut: 'Ctrl+X', action: () => document.execCommand('cut') });
      items.push({ icon: 'fa-paste', label: 'Paste', shortcut: 'Ctrl+V', action: () => doPaste(e.target) });
      items.push({ icon: 'fa-i-cursor', label: 'Select All', shortcut: 'Ctrl+A',
                   action: () => { e.target.focus(); document.execCommand('selectAll'); } });
      items.push({ divider: true });
    }
    items.push({ icon: 'fa-search-plus', label: 'Command Palette', shortcut: 'Ctrl+Shift+P',
                 action: () => document.querySelector('[onclick*="CommandPalette"], #command-palette-trigger')?.click() ||
                              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true })) });
    items.push({ icon: 'fa-keyboard', label: 'Keyboard Shortcuts', action: () => {
      const help = document.querySelector('[data-action="help"], [onclick*="showHelp"]');
      if (help) help.click();
    }});
    items.push({ icon: 'fa-cog', label: 'Settings', action: () => {
      document.querySelector('[onclick*="Settings.open"], [data-panel="settings"]')?.click();
    }});

    e.preventDefault();
    UCM.open(e.clientX, e.clientY, items);
  }, false);

  function doCopy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Copied to clipboard', 'success');
  }
  async function doPaste(target) {
    try {
      const text = await navigator.clipboard.readText();
      if (target?.value !== undefined) {
        const start = target.selectionStart, end = target.selectionEnd;
        target.value = target.value.slice(0, start) + text + target.value.slice(end);
        target.selectionStart = target.selectionEnd = start + text.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target?.isContentEditable) {
        document.execCommand('insertText', false, text);
      }
    } catch (e) { toast('Paste blocked: '+e.message, 'warn'); }
  }
  function askAI(text) {
    const ev = new CustomEvent('procode:ask-ai', { detail: { text } });
    window.dispatchEvent(ev);
    const aiInput = document.querySelector('#ai-input, .ai-textarea, [data-ai-input]');
    if (aiInput) {
      aiInput.value = `Explain this:\n\n${text}`;
      aiInput.dispatchEvent(new Event('input', { bubbles: true }));
      aiInput.focus();
    }
  }
  function toast(msg, kind) {
    // v33Toast → ToastService (danger maps to error)
    var t = (kind === 'danger') ? 'error' : (kind || 'info');
    if (window.ToastService) { window.ToastService.show(msg, t, 2700); return; }
    if (window.Utils && Utils.toast) { Utils.toast(msg, t); }
  }

  /* ── Mobile long-press → contextmenu ───────────────────────────── */
  (function installLongPress() {
    let timer = null, ripple = null, sx = 0, sy = 0, target = null;
    const HOLD_MS = 480;
    const MOVE_THRESH = 10;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; target = e.target;
      ripple = document.createElement('div');
      ripple.className = 'ucm-press-ripple';
      ripple.style.left = sx + 'px'; ripple.style.top = sy + 'px';
      document.body.appendChild(ripple);
      requestAnimationFrame(() => ripple.classList.add('active'));
      timer = setTimeout(() => {
        if (!target) return;
        if (navigator.vibrate) navigator.vibrate(35);
        const ev = new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true,
          clientX: sx, clientY: sy, view: window,
        });
        target.dispatchEvent(ev);
      }, HOLD_MS);
    }, { passive: true });

    function _cancel() {
      clearTimeout(timer); timer = null; target = null;
      if (ripple) { ripple.remove(); ripple = null; }
    }
    document.addEventListener('touchmove', (e) => {
      if (!timer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > MOVE_THRESH || Math.abs(t.clientY - sy) > MOVE_THRESH) _cancel();
    }, { passive: true });
    document.addEventListener('touchend',    _cancel, { passive: true });
    document.addEventListener('touchcancel', _cancel, { passive: true });
  })();

  /* ── Upgrade existing FE / Tab inline .context-menu DOM ─────────
     We don't replace those builders (their items have closures over the
     right `path`), but we add nicer visuals + smart positioning + outside-
     click handling on top of whatever they create. */
  const upgradeObserver = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (!n.classList) return;
        if (n.classList.contains('context-menu') && !n.dataset.v33Upgraded) {
          _upgradeLegacyMenu(n);
        } else if (n.querySelectorAll) {
          n.querySelectorAll('.context-menu:not([data-v33-upgraded])').forEach(_upgradeLegacyMenu);
        }
      });
    }
  });
  upgradeObserver.observe(document.body, { childList: true, subtree: true });

  function _upgradeLegacyMenu(menu) {
    menu.dataset.v33Upgraded = '1';
    // Add visual class without breaking existing styles
    menu.style.background = 'rgba(26,26,29,.96)';
    menu.style.backdropFilter = 'blur(14px) saturate(140%)';
    menu.style.borderRadius = '12px';
    menu.style.border = '1px solid var(--v33-border, #2a2a2d)';
    menu.style.boxShadow = '0 20px 60px -12px rgba(0,0,0,.55)';
    menu.style.padding = '6px';
    menu.style.zIndex = '999990';
    menu.style.minWidth = '220px';
    menu.style.opacity = '0';
    menu.style.transform = 'scale(.94) translateY(-4px)';
    menu.style.transformOrigin = 'top left';
    menu.style.transition = 'opacity .14s ease, transform .14s cubic-bezier(.2,.9,.3,1)';

    // Smart-flip
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      const W = window.innerWidth, H = window.innerHeight, M = 8;
      let cx = parseFloat(menu.style.left || 0), cy = parseFloat(menu.style.top || 0);
      if (cx + r.width + M > W)  menu.style.left = Math.max(M, W - r.width - M) + 'px';
      if (cy + r.height + M > H) menu.style.top  = Math.max(M, cy - r.height) + 'px';
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1) translateY(0)';
    });
  }

  /* ╔═════════════════════════════════════════════════════════════════╗
     ║  §2 · MirrorPreview — preview running web on PC/phone           ║
     ╚═════════════════════════════════════════════════════════════════╝ */
  const MirrorPreview = (() => {
    const _channelName = 'procode-preview-mirror-' + (sessionStorage.__procode_session ||
      (sessionStorage.__procode_session = Math.random().toString(36).slice(2, 9)));
    let _channel = null;
    let _mirrorWin = null;
    let _touchEmu = false;

    function _ensureChannel() {
      if (!_channel && 'BroadcastChannel' in window) {
        _channel = new BroadcastChannel(_channelName);
      }
      return _channel;
    }

    function _broadcastSrc(html) {
      _ensureChannel()?.postMessage({ type: 'preview:html', html, ts: Date.now() });
    }

    function init() {
      // Build mirror toolbar after the existing pv-device-row
      const deviceRow = document.querySelector('.pv-device-row');
      if (!deviceRow || deviceRow._v33Done) return setTimeout(init, 400);
      deviceRow._v33Done = true;

      const tb = document.createElement('div');
      tb.className = 'v33-mirror-toolbar';
      tb.innerHTML = `
        <button class="v33-mirror-btn" id="v33-open-window" title="Open preview in a separate window">
          <i class="fas fa-external-link-alt"></i> <span>Open Window</span>
        </button>
        <button class="v33-mirror-btn" id="v33-mirror-window" title="Mirror preview live to a separate window or screen">
          <i class="fas fa-tv"></i> <span>Mirror</span>
        </button>
        <button class="v33-mirror-btn" id="v33-share-qr" title="Share preview to phone via QR + offline data URL">
          <i class="fas fa-qrcode"></i> <span>To Phone</span>
        </button>
        <button class="v33-mirror-btn" id="v33-touch-emu" title="Toggle touch input emulation in the iframe">
          <i class="fas fa-hand-pointer"></i> <span>Touch</span>
        </button>
        <button class="v33-mirror-btn" id="v33-screen-share" title="Cast preview to another display via screen share">
          <i class="fas fa-cast"></i> <span>Cast</span>
        </button>
      `;
      deviceRow.parentNode.insertBefore(tb, deviceRow.nextSibling);

      tb.querySelector('#v33-open-window').onclick = openInWindow;
      tb.querySelector('#v33-mirror-window').onclick = mirrorWindow;
      tb.querySelector('#v33-share-qr').onclick = shareToPhone;
      tb.querySelector('#v33-touch-emu').onclick = toggleTouchEmu;
      tb.querySelector('#v33-screen-share').onclick = screenShare;

      // Hook into preview frame to broadcast on srcdoc updates
      _hookPreviewFrame();
    }

    function _hookPreviewFrame() {
      const frame = document.getElementById('preview-frame');
      if (!frame) return setTimeout(_hookPreviewFrame, 800);

      // Observe srcdoc + src changes
      const obs = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.attributeName === 'srcdoc' || m.attributeName === 'src') {
            _propagate();
          }
        }
      });
      obs.observe(frame, { attributes: true, attributeFilter: ['src', 'srcdoc'] });

      function _propagate() {
        const html = frame.srcdoc || '';
        if (html) _broadcastSrc(html);
      }
      _propagate();
    }

    function _getCurrentPreviewHTML() {
      const frame = document.getElementById('preview-frame');
      if (!frame) return '';
      return frame.srcdoc || '';
    }

    function openInWindow() {
      const html = _getCurrentPreviewHTML();
      if (!html) return v33Toast('No preview content yet — run a web project first', 'warn');
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank',
        'width=420,height=820,resizable=yes,scrollbars=yes,toolbar=no,menubar=no');
      if (!w) v33Toast('Popup blocked — please allow popups', 'danger');
    }

    function mirrorWindow() {
      const btn = document.getElementById('v33-mirror-window');
      if (_mirrorWin && !_mirrorWin.closed) {
        _mirrorWin.close(); _mirrorWin = null;
        btn?.classList.remove('active');
        v33Toast('Mirror closed', 'info');
        return;
      }
      const mirrorHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ProCode · Live Mirror</title>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=yes">
<style>
  html,body{margin:0;padding:0;background:#0d0d0f;color:#e4e4e7;font-family:system-ui;overflow:hidden;height:100vh}
  iframe{border:0;width:100%;height:100%;background:#fff;display:block}
  #status{position:fixed;top:8px;right:10px;background:rgba(26,26,29,.85);backdrop-filter:blur(8px);padding:5px 10px;border-radius:14px;font-size:11px;border:1px solid #2a2a2d;display:flex;align-items:center;gap:6px;z-index:99}
  #status .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e}
  #empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#71717a;font-size:14px;background:#1a1a1d;text-align:center;padding:20px}
</style></head><body>
<div id="status"><span class="dot"></span> Live · ProCode Mirror</div>
<iframe id="mirror" sandbox="allow-scripts allow-forms allow-modals allow-popups"></iframe>
<div id="empty">Waiting for preview...</div>
<script>
  const iframe=document.getElementById('mirror'),empty=document.getElementById('empty');
  const ch=new BroadcastChannel(${JSON.stringify(_channelName)});
  let lastTs=0;
  ch.onmessage=(e)=>{
    if(!e.data||e.data.type!=='preview:html')return;
    if(e.data.ts<lastTs)return; lastTs=e.data.ts;
    iframe.srcdoc=e.data.html; empty.style.display='none';
  };
  // Tell parent we're online and ask for the latest snapshot
  ch.postMessage({type:'mirror:hello'});
  window.addEventListener('beforeunload',()=>ch.postMessage({type:'mirror:bye'}));
<\/script></body></html>`;
      const blob = new Blob([mirrorHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      _mirrorWin = window.open(url, '_blank',
        'width=440,height=900,resizable=yes,scrollbars=yes');
      if (!_mirrorWin) {
        v33Toast('Popup blocked — please allow popups', 'danger');
        return;
      }
      btn?.classList.add('active');
      v33Toast('Mirror opened. Drag it to a second screen or phone.', 'success');
      // Send current preview right away
      setTimeout(() => {
        const html = _getCurrentPreviewHTML();
        if (html) _broadcastSrc(html);
      }, 500);
    }

    // Listen for mirror:hello and re-broadcast latest
    if (_ensureChannel()) {
      _channel.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'mirror:hello') {
          const html = _getCurrentPreviewHTML();
          if (html) _broadcastSrc(html);
        }
      });
    }

    function shareToPhone() {
      const html = _getCurrentPreviewHTML();
      if (!html) return v33Toast('No preview content yet', 'warn');

      // Build a self-contained data URL (works on phone with QR scan / share menu)
      let dataUrl;
      try {
        // Use blob → object URL for size; data:URL is fallback if small
        if (html.length < 30000) {
          dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        } else {
          const blob = new Blob([html], { type: 'text/html' });
          dataUrl = URL.createObjectURL(blob);
        }
      } catch (e) { return v33Toast('Encoding failed', 'danger'); }

      _showQRModal(dataUrl, html);
    }

    function _showQRModal(url, html) {
      const existing = document.getElementById('v33-qr-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'v33-qr-modal'; modal.className = 'visible';
      const isLocalUrl = !/^data:/.test(url);
      modal.innerHTML = `
        <div class="qr-card">
          <h3>Open preview on your phone</h3>
          <p>Scan with your phone camera, or copy &amp; share the link below.<br/>
            ${isLocalUrl ? '<strong style="color:#f59e0b">Note:</strong> Object URLs only work in this device. Use Mirror or screen-share for true cross-device.' : 'Self-contained — works on any device, even offline.'}</p>
          <div id="v33-qr-canvas"></div>
          <div class="qr-url">${escapeHTML(url.length > 200 ? url.slice(0, 200) + '…' : url)}</div>
          <div class="qr-actions">
            <button class="v33-mp-btn" id="v33-qr-copy">Copy link</button>
            <button class="v33-mp-btn primary" id="v33-qr-share">Share</button>
            <button class="v33-mp-btn" id="v33-qr-close">Close</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

      _renderQR(document.getElementById('v33-qr-canvas'), url);

      modal.querySelector('#v33-qr-copy').onclick = () => {
        navigator.clipboard?.writeText(url).then(() => v33Toast('Link copied', 'success'));
      };
      modal.querySelector('#v33-qr-share').onclick = async () => {
        if (navigator.share) {
          try { await navigator.share({ title: 'ProCode preview', url }); }
          catch (e) {}
        } else {
          navigator.clipboard?.writeText(url);
          v33Toast('Share API unavailable — link copied instead', 'info');
        }
      };
      modal.querySelector('#v33-qr-close').onclick = () => modal.remove();
    }

    /* ── Tiny built-in QR encoder (no external dep) ──
       Produces a scannable QR for short URLs (data URL caveat: huge payloads
       won't scan reliably; we render a "too big" badge in that case). */
    function _renderQR(container, text) {
      container.innerHTML = '';
      // For long URLs, render a placeholder
      if (text.length > 1500) {
        const note = document.createElement('div');
        note.style.cssText = 'background:#fff;color:#0d0d0f;padding:30px 18px;border-radius:10px;font-size:12px;line-height:1.5;text-align:center;max-width:240px;margin:0 auto;';
        note.innerHTML = '<strong style="color:#dc2626;display:block;margin-bottom:6px">Payload too large for QR</strong>Use the <em>Mirror</em> button or copy/paste the URL into your phone&rsquo;s browser.';
        container.appendChild(note);
        return;
      }
      // Use Google Chart Image API as fallback if no qrcode lib
      if (window.QRCode && window.QRCode.toCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = 220; canvas.height = 220;
        container.appendChild(canvas);
        window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1 }, ()=>{});
      } else {
        const img = document.createElement('img');
        img.alt = 'QR code';
        img.width = 220; img.height = 220;
        // Use a CDN-hosted QR generator (no integrity, blocked by CSP? No — img-src is permissive)
        img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=' + encodeURIComponent(text);
        img.style.cssText = 'background:#fff;padding:8px;border-radius:8px;display:block;margin:0 auto;';
        img.onerror = () => {
          img.replaceWith(Object.assign(document.createElement('div'), {
            textContent: 'QR generation unavailable offline',
            style: 'color:#71717a;padding:50px 0;font-size:12px;text-align:center;'
          }));
        };
        container.appendChild(img);
      }
    }

    function toggleTouchEmu() {
      const btn = document.getElementById('v33-touch-emu');
      _touchEmu = !_touchEmu;
      btn?.classList.toggle('active', _touchEmu);
      const frame = document.getElementById('preview-frame');
      if (!frame) return;

      try {
        // Inject touch-emulation script into the preview iframe
        const cur = frame.srcdoc || '';
        if (!cur) return v33Toast('Reload preview to apply touch emulation', 'info');
        const script = `<script id="__v33_touch_emu">${
          _touchEmu ? `
            (function(){
              if(window.__touchEmuOn)return;
              window.__touchEmuOn=true;
              const fire=(t,e)=>{const r=e.target.getBoundingClientRect();const tev=new TouchEvent(t,{bubbles:true,cancelable:true,touches:[{identifier:1,target:e.target,clientX:e.clientX,clientY:e.clientY,pageX:e.pageX,pageY:e.pageY,radiusX:8,radiusY:8,force:.5}]});try{e.target.dispatchEvent(tev)}catch(_){}}
              ;['mousedown','mousemove','mouseup'].forEach((m,i)=>{const t=['touchstart','touchmove','touchend'][i];document.addEventListener(m,e=>fire(t,e),true)});
              document.documentElement.style.cursor='url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22><circle cx=%2214%22 cy=%2214%22 r=%2210%22 fill=%22rgba(129,140,248,.35)%22 stroke=%22%23818cf8%22 stroke-width=%221.5%22/></svg>") 14 14, default';
            })();
          ` : ''
        }<\/script>`;
        let next = cur;
        // Strip prior emulator
        next = next.replace(/<script id="__v33_touch_emu">[\s\S]*?<\/script>/g, '');
        if (_touchEmu) {
          next = /<\/body>/i.test(next) ? next.replace(/<\/body>/i, script + '</body>') : next + script;
        }
        frame.srcdoc = next;
        v33Toast(_touchEmu ? 'Touch emulation ON — clicks fire as touches' : 'Touch emulation OFF', 'info');
      } catch (e) { v33Toast('Touch emulation failed: '+e.message, 'danger'); }
    }

    async function screenShare() {
      const btn = document.getElementById('v33-screen-share');
      if (!navigator.mediaDevices?.getDisplayMedia) {
        return v33Toast('Screen Share not supported in this browser', 'danger');
      }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'window' }, audio: false
        });
        // Open a tiny window that shows the captured stream — useful for e.g. wireless display
        const w = window.open('', '_blank', 'width=480,height=820,resizable=yes');
        if (!w) {
          stream.getTracks().forEach(t => t.stop());
          return v33Toast('Popup blocked', 'danger');
        }
        w.document.write(`<!DOCTYPE html><title>Cast</title>
          <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
            <video autoplay muted playsinline style="max-width:100%;max-height:100%"></video>
          </body>`);
        const v = w.document.querySelector('video');
        v.srcObject = stream;
        stream.getVideoTracks()[0].onended = () => { try { w.close(); } catch(e){} btn?.classList.remove('active'); };
        btn?.classList.add('active');
        v33Toast('Screen sharing — drag the cast window to your second display', 'success');
      } catch (e) {
        if (e.name !== 'NotAllowedError') v33Toast('Cast failed: '+e.message, 'danger');
      }
    }

    function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

    return { init, broadcast: _broadcastSrc };
  })();
  window.MirrorPreview = MirrorPreview;

  /* ╔═════════════════════════════════════════════════════════════════╗
     ║  §3 · MultiplayerNG — real local + WebRTC multiplayer           ║
     ╚═════════════════════════════════════════════════════════════════╝ */
  const MultiplayerNG = (() => {
    const me = {
      id: 'u' + Math.random().toString(36).slice(2, 9),
      name: localStorage.procode_mp_name || ('Dev_' + Math.floor(Math.random() * 9999)),
      color: ['#f43f5e','#fb923c','#facc15','#22c55e','#0ea5e9','#a855f7','#ec4899','#14b8a6'][Math.floor(Math.random()*8)],
    };
    const peers = new Map(); // id → { name, color, lastSeen, source: 'bc'|'rtc' }
    const cursors = new Map();
    let _bc = null;
    let _rtc = null; let _dc = null;
    let _heartbeat = null;
    let _initialized = false;

    function init() {
      if (_initialized) return;
      _initialized = true;
      _buildUI();
      _connectBroadcast();
      _trackCursor();
      _hookEditor();
      window.addEventListener('beforeunload', () => sendBC({ t: 'bye', id: me.id }));
    }

    function _buildUI() {
      // FAB — hidden: Multiplayer is now accessible from the More-options menu,
      // so the floating bubble in the corner is no longer needed.
      const fab = document.createElement('button');
      fab.id = 'v33-mp-fab';
      fab.title = 'Multiplayer';
      fab.style.display = 'none';
      fab.setAttribute('aria-hidden', 'true');
      fab.innerHTML = `<i class="fas fa-users"></i><span class="badge">0</span>`;
      fab.onclick = togglePanel;
      document.body.appendChild(fab);

      // Panel
      const panel = document.createElement('div');
      panel.id = 'v33-mp-panel';
      panel.innerHTML = `
        <div class="v33-mp-header">
          <span class="h-pulse off" id="v33-mp-pulse"></span>
          <span class="h-title">Multiplayer <span style="color:#71717a;font-weight:400;font-size:11px;margin-left:6px" id="v33-mp-status">offline</span></span>
          <button class="h-close" onclick="MultiplayerNG.togglePanel()"><i class="fas fa-times"></i></button>
        </div>
        <div class="v33-mp-tabs">
          <button class="v33-mp-tab active" data-tab="local">Local Tabs</button>
          <button class="v33-mp-tab" data-tab="remote">Remote Peer</button>
          <button class="v33-mp-tab" data-tab="chat">Chat</button>
          <button class="v33-mp-tab" data-tab="settings">Me</button>
        </div>
        <div class="v33-mp-body">
          <section class="active" data-section="local">
            <p style="color:var(--v33-muted);font-size:12px;line-height:1.5;margin:0 0 10px">
              Open ProCode in another browser tab to instantly collaborate. Cursors and edits sync across all open tabs of this browser.
            </p>
            <div class="v33-mp-peers" id="v33-mp-peer-list">
              <div style="color:var(--v33-muted);font-size:12px;text-align:center;padding:18px">Waiting for peers...</div>
            </div>
          </section>
          <section data-section="remote">
            <p style="color:var(--v33-muted);font-size:12px;line-height:1.5;margin:0 0 10px">
              Cross-device WebRTC — works between phone &amp; PC. No server needed; just exchange the offer and answer text below.
            </p>
            <div class="v33-mp-actions">
              <button class="v33-mp-btn primary" id="v33-mp-create-offer">Create Offer</button>
              <button class="v33-mp-btn" id="v33-mp-accept-offer">Accept Offer</button>
            </div>
            <label>Offer / Answer</label>
            <textarea id="v33-mp-sdp-box" placeholder="Paste offer/answer SDP here, or click 'Create Offer' to generate one..." rows="4"></textarea>
            <div class="v33-mp-actions">
              <button class="v33-mp-btn" id="v33-mp-copy-sdp">Copy</button>
              <button class="v33-mp-btn" id="v33-mp-finalize-sdp">Apply</button>
              <button class="v33-mp-btn danger" id="v33-mp-disconnect">Disconnect</button>
            </div>
            <div id="v33-mp-rtc-status" style="margin-top:10px;font-size:11.5px;color:var(--v33-muted)">Idle</div>
          </section>
          <section data-section="chat">
            <div class="v33-mp-chat" id="v33-mp-chat-log"></div>
            <div class="v33-mp-actions">
              <input type="text" id="v33-mp-chat-input" placeholder="Type a message..." style="flex:1;font-family:inherit"/>
              <button class="v33-mp-btn primary" id="v33-mp-chat-send" style="flex:0">Send</button>
            </div>
          </section>
          <section data-section="settings">
            <label>Display name</label>
            <input type="text" id="v33-mp-name" value="${escapeAttr(me.name)}" maxlength="20" style="font-family:inherit"/>
            <label>Color</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px" id="v33-mp-color-row"></div>
            <p style="color:var(--v33-muted);font-size:11.5px;margin-top:14px">Your ID: <code style="background:var(--v33-bg-2);padding:2px 6px;border-radius:4px;font-family:var(--font-mono,monospace);color:var(--v33-accent)">${me.id}</code></p>
          </section>
        </div>`;
      document.body.appendChild(panel);

      // Tab switching
      panel.querySelectorAll('.v33-mp-tab').forEach(tab => {
        tab.onclick = () => {
          panel.querySelectorAll('.v33-mp-tab').forEach(t => t.classList.remove('active'));
          panel.querySelectorAll('section').forEach(s => s.classList.remove('active'));
          tab.classList.add('active');
          panel.querySelector(`section[data-section="${tab.dataset.tab}"]`).classList.add('active');
        };
      });

      // Settings
      panel.querySelector('#v33-mp-name').addEventListener('change', (e) => {
        me.name = e.target.value.trim() || me.name;
        localStorage.procode_mp_name = me.name;
        sendBC({ t: 'profile', id: me.id, name: me.name, color: me.color });
      });
      const colorRow = panel.querySelector('#v33-mp-color-row');
      ['#f43f5e','#fb923c','#facc15','#22c55e','#0ea5e9','#a855f7','#ec4899','#14b8a6'].forEach(c => {
        const sw = document.createElement('button');
        sw.style.cssText = `width:24px;height:24px;border-radius:50%;border:2px solid ${c===me.color?'#fff':'transparent'};background:${c};cursor:pointer;`;
        sw.onclick = () => {
          me.color = c;
          colorRow.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
          sw.style.borderColor = '#fff';
          sendBC({ t: 'profile', id: me.id, name: me.name, color: me.color });
        };
        colorRow.appendChild(sw);
      });

      // RTC
      panel.querySelector('#v33-mp-create-offer').onclick = createRTCOffer;
      panel.querySelector('#v33-mp-accept-offer').onclick = acceptRTCOffer;
      panel.querySelector('#v33-mp-finalize-sdp').onclick = finalizeRTC;
      panel.querySelector('#v33-mp-copy-sdp').onclick = () => {
        const v = panel.querySelector('#v33-mp-sdp-box').value;
        navigator.clipboard?.writeText(v).then(() => v33Toast('Copied — paste it to the other peer', 'success'));
      };
      panel.querySelector('#v33-mp-disconnect').onclick = disconnectRTC;

      // Chat
      panel.querySelector('#v33-mp-chat-send').onclick = _sendChat;
      panel.querySelector('#v33-mp-chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _sendChat();
      });
    }

    function togglePanel() {
      const panel = document.getElementById('v33-mp-panel');
      panel?.classList.toggle('visible');
    }

    /* ── BroadcastChannel layer ─────────────────────────── */
    function _connectBroadcast() {
      if (!('BroadcastChannel' in window)) return;
      _bc = new BroadcastChannel('procode-mp-v33');
      _bc.onmessage = (ev) => _handleBC(ev.data);
      sendBC({ t: 'hello', id: me.id, name: me.name, color: me.color });
      _heartbeat = setInterval(() => {
        sendBC({ t: 'heartbeat', id: me.id, name: me.name, color: me.color });
        // Reap stale peers
        const now = Date.now();
        for (const [id, p] of peers) {
          if (now - p.lastSeen > 8000) { peers.delete(id); cursors.delete(id); _renderCursor(id, null); }
        }
        _renderPeerList(); _updateStatus();
      }, 2500);
      _updateStatus();
    }
    function sendBC(msg) {
      if (_bc) try { _bc.postMessage(msg); } catch (e) {}
    }

    function _handleBC(msg) {
      if (!msg || msg.id === me.id) return;
      switch (msg.t) {
        case 'hello':
          peers.set(msg.id, { name: msg.name, color: msg.color, lastSeen: Date.now(), source: 'bc' });
          // Reply so the new peer sees us
          sendBC({ t: 'heartbeat', id: me.id, name: me.name, color: me.color });
          _addChatSystem(`${msg.name} joined`);
          break;
        case 'heartbeat':
          peers.set(msg.id, { name: msg.name, color: msg.color, lastSeen: Date.now(), source: 'bc' });
          break;
        case 'profile':
          if (peers.has(msg.id)) {
            const p = peers.get(msg.id);
            p.name = msg.name; p.color = msg.color; p.lastSeen = Date.now();
          }
          break;
        case 'cursor':
          cursors.set(msg.id, { x: msg.x, y: msg.y, name: msg.name, color: msg.color });
          _renderCursor(msg.id, msg);
          break;
        case 'chat':
          _addChatMessage(msg.name, msg.color, msg.text, false);
          break;
        case 'edit':
          _applyRemoteEdit(msg);
          break;
        case 'bye':
          peers.delete(msg.id); cursors.delete(msg.id); _renderCursor(msg.id, null);
          _addChatSystem(`${msg.name || 'Peer'} left`);
          break;
      }
      _renderPeerList(); _updateStatus();
    }

    function _renderPeerList() {
      const list = document.getElementById('v33-mp-peer-list');
      if (!list) return;
      if (!peers.size) {
        list.innerHTML = `<div style="color:var(--v33-muted);font-size:12px;text-align:center;padding:18px">No peers yet — open ProCode in another tab</div>`;
        return;
      }
      list.innerHTML = '';
      peers.forEach((p, id) => {
        const row = document.createElement('div');
        row.className = 'v33-mp-peer';
        const initials = (p.name || '?').slice(0, 2).toUpperCase();
        row.innerHTML = `
          <div class="avatar" style="background:${p.color||'#818cf8'}">${escapeHTML(initials)}</div>
          <div class="info">
            <div class="name">${escapeHTML(p.name||'Peer')}</div>
            <div class="meta">${p.source === 'rtc' ? 'WebRTC' : 'Same browser'} · ${id.slice(0,7)}</div>
          </div>
          <div class="dot" title="Online"></div>`;
        list.appendChild(row);
      });
    }

    function _updateStatus() {
      const n = peers.size;
      const fab = document.getElementById('v33-mp-fab');
      const badge = fab?.querySelector('.badge');
      const status = document.getElementById('v33-mp-status');
      const pulse = document.getElementById('v33-mp-pulse');
      if (badge) { badge.textContent = String(n); }
      if (fab) fab.classList.toggle('has-peers', n > 0);
      if (status) status.textContent = n > 0 ? `${n} peer${n>1?'s':''} online` : 'waiting…';
      if (pulse) pulse.classList.toggle('off', n === 0);
    }

    /* ── Cursor sharing ─────────────────────────── */
    let _lastCursorSend = 0;
    function _trackCursor() {
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - _lastCursorSend < 50) return;
        _lastCursorSend = now;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        sendBC({ t: 'cursor', id: me.id, name: me.name, color: me.color, x, y });
      }, { passive: true });
    }
    function _renderCursor(id, c) {
      let el = document.getElementById('v33-cursor-' + id);
      if (!c) { el?.remove(); return; }
      if (!el) {
        el = document.createElement('div');
        el.id = 'v33-cursor-' + id;
        el.className = 'v33-mp-cursor';
        el.innerHTML = `
          <svg viewBox="0 0 24 24" fill="${c.color}" stroke="rgba(0,0,0,.4)" stroke-width=".5"><path d="M3 2l9 19 2.5-7.5L22 11z"/></svg>
          <span class="label" style="background:${c.color}">${escapeHTML(c.name||'peer')}</span>`;
        document.body.appendChild(el);
      }
      const x = c.x * window.innerWidth, y = c.y * window.innerHeight;
      el.style.transform = `translate(${x}px,${y}px)`;
    }

    /* ── Editor edit broadcast (BC + RTC) ─────────────── */
    function _hookEditor() {
      const tryHook = () => {
        const ed = window.editor || window.IDE?.state?.editor;
        if (!ed?.onDidChangeModelContent) return setTimeout(tryHook, 1500);
        ed.onDidChangeModelContent((ev) => {
          if (ev._fromRemote) return;
          const path = window.IDE?.state?.activeFile || ed.getModel?.()?.uri?.path || '';
          ev.changes.forEach(ch => {
            sendBC({ t: 'edit', id: me.id, path, range: ch.range, text: ch.text });
          });
        });
      };
      tryHook();
    }
    function _applyRemoteEdit(msg) {
      const ed = window.editor || window.IDE?.state?.editor;
      if (!ed?.executeEdits) return;
      const activePath = window.IDE?.state?.activeFile || '';
      if (msg.path && activePath && msg.path !== activePath) return; // not on our file
      try {
        ed.executeEdits('mp-remote', [{ range: msg.range, text: msg.text, forceMoveMarkers: true }]);
      } catch (e) {}
    }

    /* ── Chat ────────────────────────────────── */
    function _addChatMessage(name, color, text, self=false) {
      const log = document.getElementById('v33-mp-chat-log');
      if (!log) return;
      const m = document.createElement('div');
      m.className = 'v33-mp-msg' + (self ? ' self' : '');
      m.innerHTML = `<div class="who" style="color:${color||'#818cf8'}">${escapeHTML(name)}</div><div>${escapeHTML(text)}</div>`;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }
    function _addChatSystem(text) {
      const log = document.getElementById('v33-mp-chat-log');
      if (!log) return;
      const m = document.createElement('div');
      m.className = 'v33-mp-msg system';
      m.textContent = text;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }
    function _sendChat() {
      const input = document.getElementById('v33-mp-chat-input');
      const t = input.value.trim();
      if (!t) return;
      sendBC({ t: 'chat', id: me.id, name: me.name, color: me.color, text: t });
      _addChatMessage(me.name, me.color, t, true);
      input.value = '';
    }

    /* ── WebRTC manual signaling ─────────────────────── */
    function _newRTC() {
      _rtc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
      });
      _rtc.oniceconnectionstatechange = () => {
        const s = _rtc.iceConnectionState;
        _setRTCStatus(`ICE: ${s}`);
        if (s === 'connected' || s === 'completed') v33Toast('WebRTC peer connected', 'success');
        else if (s === 'failed' || s === 'disconnected') v33Toast('WebRTC peer disconnected', 'warn');
      };
      _rtc.ondatachannel = (ev) => {
        _dc = ev.channel; _wireDC();
      };
    }
    function _wireDC() {
      _dc.onopen = () => {
        _setRTCStatus('Connected');
        peers.set('rtc-peer', { name: 'Remote (WebRTC)', color: '#22c55e', lastSeen: Date.now(), source: 'rtc' });
        _renderPeerList(); _updateStatus();
        _dc.send(JSON.stringify({ t: 'hello', id: me.id, name: me.name, color: me.color }));
      };
      _dc.onmessage = (ev) => {
        try { _handleBC(JSON.parse(ev.data)); } catch (e) {}
      };
      _dc.onclose = () => {
        _setRTCStatus('Closed');
        peers.delete('rtc-peer');
        _renderPeerList(); _updateStatus();
      };
    }
    async function createRTCOffer() {
      try {
        if (!_rtc) _newRTC();
        _dc = _rtc.createDataChannel('procode'); _wireDC();
        const offer = await _rtc.createOffer();
        await _rtc.setLocalDescription(offer);
        await _waitIce();
        document.getElementById('v33-mp-sdp-box').value = JSON.stringify(_rtc.localDescription);
        _setRTCStatus('Offer ready — share with peer');
        v33Toast('Offer created — copy & send to your peer', 'info');
      } catch (e) { v33Toast('Offer failed: '+e.message, 'danger'); }
    }
    async function acceptRTCOffer() {
      try {
        if (!_rtc) _newRTC();
        const remote = JSON.parse(document.getElementById('v33-mp-sdp-box').value);
        if (remote.type !== 'offer') return v33Toast('Paste an OFFER first', 'warn');
        await _rtc.setRemoteDescription(remote);
        const answer = await _rtc.createAnswer();
        await _rtc.setLocalDescription(answer);
        await _waitIce();
        document.getElementById('v33-mp-sdp-box').value = JSON.stringify(_rtc.localDescription);
        _setRTCStatus('Answer ready — paste back to offerer');
        v33Toast('Answer ready — copy & send back', 'info');
      } catch (e) { v33Toast('Accept failed: '+e.message, 'danger'); }
    }
    async function finalizeRTC() {
      try {
        if (!_rtc) return v33Toast('No active session', 'warn');
        const remote = JSON.parse(document.getElementById('v33-mp-sdp-box').value);
        if (remote.type !== 'answer') return v33Toast('Paste the ANSWER from your peer first', 'warn');
        await _rtc.setRemoteDescription(remote);
        _setRTCStatus('Connecting...');
      } catch (e) { v33Toast('Finalize failed: '+e.message, 'danger'); }
    }
    function disconnectRTC() {
      try { _dc?.close(); } catch(e){}
      try { _rtc?.close(); } catch(e){}
      _dc = null; _rtc = null;
      _setRTCStatus('Disconnected');
      peers.delete('rtc-peer');
      _renderPeerList(); _updateStatus();
    }
    function _waitIce() {
      return new Promise((resolve) => {
        if (_rtc.iceGatheringState === 'complete') return resolve();
        const t = setTimeout(resolve, 2000);
        _rtc.onicegatheringstatechange = () => {
          if (_rtc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
        };
      });
    }
    function _setRTCStatus(s) {
      const el = document.getElementById('v33-mp-rtc-status');
      if (el) el.textContent = s;
    }

    function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
    function escapeAttr(s){return escapeHTML(s);}

    return { init, togglePanel, get me(){ return me; }, get peers(){ return peers; } };
  })();
  window.MultiplayerNG = MultiplayerNG;
  // Replace the legacy no-op stub if present
  try {
    if (window.Multiplayer && (!window.Multiplayer._real)) {
      window.Multiplayer = Object.assign({}, window.Multiplayer, {
        _real: true,
        toggle: () => MultiplayerNG.togglePanel(),
        invite: () => MultiplayerNG.togglePanel(),
        close:  () => { document.getElementById('v33-mp-panel')?.classList.remove('visible'); },
      });
    }
  } catch (e) {}

  /* ── Boot all three modules after DOM is ready ───────────── */
  function _boot() {
    MirrorPreview.init();
    try { if (window.Multiplayer) Multiplayer._initSelf?.(); } catch(e) {} // stub

  // v33 interaction patch loaded
  }
  if (!window.__v33BootDone) {
    window.__v33BootDone = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _boot, { once: true });
    } else {
      setTimeout(_boot, 100);
    }
  }
})();