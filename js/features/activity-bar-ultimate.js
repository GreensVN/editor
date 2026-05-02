/**
 * activity-bar-ultimate.js — extracted from the unsplit procode_v3_fixed.html.
 * Rich activity-bar tooltip + drag-reorder + badges + ripples + context menu.
 */
(function ActivityBarUltimate() {
  'use strict';

  /* ── Button definitions ── */
  const BUTTONS_TOP = [
    {
      id: 'expl', icon: 'fas fa-copy', label: 'Explorer',
      desc: 'Browse files & folders', kbd: 'Ctrl+Shift+E',
      color: 'violet', sideId: 'expl',
      action: () => { if (window.Layout) Layout.setSide('expl'); }
    },
    {
      id: 'search', icon: 'fas fa-search', label: 'Search',
      desc: 'Find in files', kbd: 'Ctrl+Shift+F',
      color: 'sky', sideId: 'search',
      action: () => { if (window.Layout) Layout.setSide('search'); }
    },
    {
      id: 'git', icon: 'fas fa-code-branch', label: 'Source Control',
      desc: 'Git status & changes', kbd: 'Ctrl+Shift+G',
      color: 'green', sideId: 'git',
      action: () => { if (window.Layout) Layout.setSide('git'); }
    },
    {
      id: 'ext', icon: 'fas fa-puzzle-piece', label: 'Extensions',
      desc: 'Manage IDE extensions', kbd: '',
      color: 'cyan', sideId: 'ext',
      action: () => { if (window.Layout) Layout.setSide('ext'); }
    },
    {
      id: 'debug', icon: 'fas fa-spider', label: 'Debug',
      desc: 'Run & debug code', kbd: 'F5',
      color: 'rose', sideId: 'debug',
      action: () => { if (window.Layout) Layout.setSide('debug'); }
    },
  ];

  const BUTTONS_TOOLS = [];

  const BUTTONS_BOTTOM = [
    {
      id: 'settings', icon: 'fas fa-cog', label: 'Settings',
      desc: 'Configure IDE preferences', kbd: 'Ctrl+,',
      color: 'violet',
      action: () => { if (window.Settings) Settings.show(); }
    },
    {
      id: 'ai', icon: 'fas fa-robot', label: 'AI Assistant',
      desc: 'Anthropic AI assistant', kbd: 'Ctrl+Shift+A',
      color: 'pink',
      action: () => { if (window.AI) AI.toggle(); }
    },
  ];

  /* ── State ── */
  const state = {
    labeled: JSON.parse(localStorage.getItem('actbar_labeled') || 'false'),
    hidden: JSON.parse(localStorage.getItem('actbar_hidden') || '[]'),
    order: JSON.parse(localStorage.getItem('actbar_order') || 'null'),
    ctxTarget: null,
    dragSrc: null,
  };

  /* ── Tooltip singleton ── */
  const ttEl   = document.getElementById('act-tooltip');
  const ttName = document.getElementById('act-tt-name');
  const ttDesc = document.getElementById('act-tt-desc');
  const ttKbd  = document.getElementById('act-tt-kbd');
  let ttTimer  = null;

  function showTooltip(btn, def) {
    clearTimeout(ttTimer);
    ttTimer = setTimeout(() => {
      const rect = btn.getBoundingClientRect();
      ttEl.style.top  = Math.max(8, rect.top + rect.height/2 - 30) + 'px';
      ttName.textContent = def.label;
      ttDesc.textContent = def.desc || '';
      
      if (def.kbd) {
        ttKbd.innerHTML = def.kbd.split('+').map(k =>
          `<span class="k">${k}</span>`).join('<span style="color:#52525b;font-size:9px">+</span>');
        ttKbd.style.display = 'flex';
      } else {
        ttKbd.style.display = 'none';
      }
      
      // Tally badge count if any
      const badge = btn.querySelector('.act-badge');
      if (badge && badge.textContent) {
        ttDesc.textContent += ` (${badge.textContent} items)`;
      }
      
      ttEl.classList.add('show');
    }, 400);
  }

  function hideTooltip() {
    clearTimeout(ttTimer);
    ttEl.classList.remove('show');
  }

  /* ── Create a button element ── */
  function makeBtn(def, isActive) {
    const btn = document.createElement('div');
    btn.className = 'act-btn' + (isActive ? ' active' : '');
    btn.setAttribute('data-act-id', def.id);
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', def.label);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (def.color) btn.setAttribute('data-color', def.color);
    if (def.sideId) btn.setAttribute('data-side', def.sideId);

    // Icon
    const icon = document.createElement('i');
    icon.className = def.icon;
    btn.appendChild(icon);

    // Label (for labeled mode)
    const lbl = document.createElement('span');
    lbl.className = 'act-btn-label';
    lbl.textContent = def.label;
    btn.appendChild(lbl);

    // Progress ring
    const ring = document.createElement('div');
    ring.className = 'act-progress-ring';
    btn.appendChild(ring);

    // Events
    btn.addEventListener('click', (e) => {
      addRipple(btn);
      setActive(def.id, def.sideId);
      if (def.action) def.action();
    });
    btn.addEventListener('mouseenter', () => showTooltip(btn, def));
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openCtxMenu(e, btn, def);
    });

    // Drag to reorder
    btn.draggable = true;
    btn.addEventListener('dragstart', (e) => {
      state.dragSrc = btn;
      btn.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
      document.querySelectorAll('.act-btn.drag-over').forEach(b => b.classList.remove('drag-over'));
    });
    btn.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (state.dragSrc && state.dragSrc !== btn) btn.classList.add('drag-over');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
    btn.addEventListener('drop', (e) => {
      e.preventDefault();
      btn.classList.remove('drag-over');
      if (state.dragSrc && state.dragSrc !== btn) {
        const parent = btn.parentElement;
        const nodes = [...parent.children];
        const srcIdx = nodes.indexOf(state.dragSrc);
        const dstIdx = nodes.indexOf(btn);
        if (srcIdx < dstIdx) parent.insertBefore(state.dragSrc, btn.nextSibling);
        else parent.insertBefore(state.dragSrc, btn);
        saveOrder();
      }
    });

    return btn;
  }

  /* ── Ripple effect ── */
  function addRipple(btn) {
    const r = document.createElement('div');
    r.className = 'act-ripple';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 450);
  }

  /* ── Set active state ── */
  function setActive(id, sideId) {
    document.querySelectorAll('.act-btn[data-side]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    const btn = document.querySelector(`.act-btn[data-act-id="${id}"]`);
    if (btn && sideId) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
  }

  /* ── Badge API ── */
  window.ActBar = {
    setBadge(id, count, type = 'primary') {
      const btn = document.querySelector(`.act-btn[data-act-id="${id}"]`);
      if (!btn) return;
      let badge = btn.querySelector('.act-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'act-badge';
        btn.appendChild(badge);
      }
      badge.className = `act-badge ${type}`;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    },

    clearBadge(id) { this.setBadge(id, 0); },

    setLoading(id, on) {
      const btn = document.querySelector(`.act-btn[data-act-id="${id}"]`);
      if (!btn) return;
      btn.classList.toggle('loading', on);
    },

    setRunning(id, on) {
      const btn = document.querySelector(`.act-btn[data-act-id="${id}"]`);
      if (!btn) return;
      btn.classList.toggle('running', on);
    },

    setActive: setActive,
    
    toggleLabels() {
      state.labeled = !state.labeled;
      localStorage.setItem('actbar_labeled', state.labeled);
      const bar = document.querySelector('.act-bar');
      if (bar) bar.classList.toggle('labeled', state.labeled);
      // Update variable
      document.documentElement.style.setProperty('--act-bar-w', state.labeled ? '140px' : '58px');
    }
  };

  /* ── Context menu ── */
  const ctxMenu = document.getElementById('act-ctx-menu');

  function openCtxMenu(e, btn, def) {
    state.ctxTarget = { btn, def };
    ctxMenu.style.left = e.clientX + 'px';
    ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    ctxMenu.classList.add('open');
    hideTooltip();
  }

  ctxMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.act-ctx-item');
    if (!item || !state.ctxTarget) return;
    const action = item.dataset.action;
    const { btn, def } = state.ctxTarget;

    if (action === 'toggle-labels') {
      ActBar.toggleLabels();
    } else if (action === 'move-top') {
      const scrollArea = btn.closest('.act-scroll-area, .act-group');
      if (scrollArea) scrollArea.prepend(btn);
      saveOrder();
    } else if (action === 'move-bottom') {
      const scrollArea = btn.closest('.act-scroll-area, .act-group');
      if (scrollArea) scrollArea.append(btn);
      saveOrder();
    } else if (action === 'pin') {
      btn.dataset.pinned = btn.dataset.pinned ? '' : '1';
      const icon = item.querySelector('i');
      if (icon) icon.style.color = btn.dataset.pinned ? '#fbbf24' : '';
    } else if (action === 'hide') {
      btn.style.display = 'none';
      state.hidden.push(def.id);
      localStorage.setItem('actbar_hidden', JSON.stringify(state.hidden));
    } else if (action === 'reset') {
      state.hidden = [];
      localStorage.removeItem('actbar_hidden');
      localStorage.removeItem('actbar_order');
      localStorage.removeItem('actbar_labeled');
      location.reload();
    }

    ctxMenu.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!ctxMenu.contains(e.target)) ctxMenu.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ctxMenu.classList.remove('open');
  });

  /* ── Save order ── */
  function saveOrder() {
    const ids = [...document.querySelectorAll('.act-btn[data-act-id]')].map(b => b.dataset.actId);
    localStorage.setItem('actbar_order', JSON.stringify(ids));
  }

  /* ── Build the activity bar ── */
  function buildBar() {
    const bar = document.querySelector('.act-bar');
    if (!bar) return;

    // Clear existing content
    bar.innerHTML = '';

    // Logo/collapse toggle at top
    const toggle = document.createElement('div');
    toggle.id = 'act-toggle-btn';
    toggle.title = 'Toggle Labels';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', 'Toggle activity bar labels');
    toggle.innerHTML = '<i class="fas fa-chevrons-right" style="font-size:10px"></i>';
    toggle.addEventListener('click', () => ActBar.toggleLabels());
    bar.appendChild(toggle);

    // Top group (navigation)
    const grpTop = document.createElement('div');
    grpTop.className = 'act-group';
    grpTop.setAttribute('role', 'group');
    grpTop.setAttribute('aria-label', 'Navigation');

    const currentSide = document.querySelector('.sidebar.active')?.id?.replace('side-', '') || 'expl';

    BUTTONS_TOP.forEach(def => {
      if (state.hidden.includes(def.id)) return;
      const btn = makeBtn(def, def.sideId === currentSide);
      grpTop.appendChild(btn);
    });
    bar.appendChild(grpTop);

    // Tools group — only render if non-empty
    if (BUTTONS_TOOLS.length > 0) {
      const grpTools = document.createElement('div');
      grpTools.className = 'act-group';
      grpTools.setAttribute('role', 'group');
      grpTools.setAttribute('aria-label', 'Tools');
      const scrollArea = document.createElement('div');
      scrollArea.className = 'act-scroll-area';
      BUTTONS_TOOLS.forEach(def => {
        if (state.hidden.includes(def.id)) return;
        const btn = makeBtn(def, false);
        scrollArea.appendChild(btn);
      });
      grpTools.appendChild(scrollArea);
      bar.appendChild(grpTools);
    }

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'act-spacer';
    bar.appendChild(spacer);

    // Bottom group (settings & AI)
    const grpBottom = document.createElement('div');
    grpBottom.className = 'act-group';
    grpBottom.setAttribute('role', 'group');
    grpBottom.setAttribute('aria-label', 'System');

    BUTTONS_BOTTOM.forEach(def => {
      if (state.hidden.includes(def.id)) return;
      const btn = makeBtn(def, false);
      grpBottom.appendChild(btn);
    });
    bar.appendChild(grpBottom);

    // Apply labeled mode
    if (state.labeled) {
      bar.classList.add('labeled');
      document.documentElement.style.setProperty('--act-bar-w', '140px');
    }

    // fa-sparkles fallback (not in FA free)
    document.querySelectorAll('.fa-sparkles').forEach(el => {
      el.classList.remove('fa-sparkles');
      el.classList.add('fa-robot');
    });

    // fa-list-check fallback
    document.querySelectorAll('.fa-list-check').forEach(el => {
      el.classList.remove('fa-list-check');
      el.classList.add('fa-tasks');
    });
    // fa-gauge-high fallback
    document.querySelectorAll('.fa-gauge-high').forEach(el => {
      el.classList.remove('fa-gauge-high');
      el.classList.add('fa-tachometer-alt');
    });
    // fa-sliders fallback
    document.querySelectorAll('.fa-sliders').forEach(el => {
      el.classList.remove('fa-sliders');
      el.classList.add('fa-cog');
    });
    // fa-chevrons-right fallback
    document.querySelectorAll('.fa-chevrons-right').forEach(el => {
      el.classList.remove('fa-chevrons-right');
      el.classList.add('fa-grip-lines');
    });
    // fa-spider -> fa-bug
    document.querySelectorAll('.fa-spider').forEach(el => {
      el.classList.remove('fa-spider');
      el.classList.add('fa-bug');
    });
    // fa-code-compare fallback
    document.querySelectorAll('.fa-code-compare').forEach(el => {
      el.classList.remove('fa-code-compare');
      el.classList.add('fa-code-branch');
    });
    // fa-at for regex
    document.querySelectorAll('[data-act-id="regex"] .fa-at').forEach(el => {
      el.classList.remove('fa-at');
      el.classList.add('fa-asterisk');
    });
    // fa-puzzle-piece for extensions
    // already valid FA5 class
  }

  /* ── Intercept Layout.setSide to sync active state ── */
  const _origSetSide = window.Layout?.setSide?.bind(window.Layout);
  if (window.Layout && _origSetSide) {
    window.Layout.setSide = function(sideId) {
      _origSetSide(sideId);
      setActive(sideId, sideId);
    };
  }

  /* ── Keyboard nav inside activity bar ── */
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const map = {
      '1': 'expl', '2': 'search', '3': 'git',
      '4': 'ext',  '5': 'debug',
    };
    const id = map[e.key];
    if (id) {
      e.preventDefault();
      const btn = document.querySelector(`.act-btn[data-act-id="${id}"]`);
      if (btn) btn.click();
    }
  });

  /* ── Live badge updates ── */
  function pollBadges() {
    const todoCount = document.querySelectorAll('.todo-item, [data-todo]').length;
    if (todoCount > 0) ActBar.setBadge('todo', todoCount, 'warn');
    const gitChanges = document.querySelectorAll('.git-change, .t-item.modified').length;
    if (gitChanges > 0) ActBar.setBadge('git', gitChanges, 'primary');
  }

  // FIX: Replace setInterval(5000) DOM poll with MutationObserver — zero continuous polling.
  // Badges update only when the DOM actually changes.
  (function setupBadgeObserver() {
    pollBadges(); // immediate first run
    const _obs = new MutationObserver(() => pollBadges());
    const targets = [
      document.getElementById('file-tree'),
      document.querySelector('.t-list'),
      document.querySelector('.todo-list'),
    ];
    targets.forEach(t => {
      if (t) _obs.observe(t, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    // Fallback: also observe document.body with a broad filter, but throttled
    let _raf = null;
    const _bodyObs = new MutationObserver(() => {
      if (_raf) return;
      _raf = requestAnimationFrame(() => { _raf = null; pollBadges(); });
    });
    if (document.body) _bodyObs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    else window.addEventListener('DOMContentLoaded', () => {
      _bodyObs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    }, { once: true });
  })();

  /* ── Initialize ── */
  function init() {
    buildBar();
    console.log('%c[ActivityBar ��] Ultimate upgrade loaded ✅', 'color:#6366f1;font-weight:bold');
  }

  // Run after existing IDE code is done
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 600);
  }

  // Also re-init after the IDE's own boot (in case it re-renders the bar)
  setTimeout(init, 3000);

})(); // END ActivityBarUltimate
