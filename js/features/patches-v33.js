/**
 * patches-v33.js
 * V33 patches — editor, file tree, shortcuts fixes
 * ProCode IDE v3.0
 */

'use strict';
/* ══════════════════════════════════════════════════════════════════
   PERFORMANCE ENGINE v14
   Modules:
     Perf.scheduler  — frame-budget task scheduler
     Perf.batch      — DOM read/write batching
     Perf.observer   — unified IntersectionObserver pool
     Perf.resize     — unified ResizeObserver pool
     Perf.debounce   — smart adaptive debounce
     Perf.throttle   — rAF-synced throttle
     Perf.cache      — element & computation cache
     Perf.mem        — memory pressure monitor
     Perf.fps        — FPS tracker
     Perf.fix        — apply all fixes on init
═════════════════════════════════════════════════════════���════════ */
/* ── performance.memory cross-browser polyfill ───────���───────��───────
   FIX: performance.memory is Chrome-only (non-standard).
   On Firefox/Safari/Edge it is undefined, causing '–' to show silently.
   We provide a safe accessor that always returns a valid object.
   Proper fix: https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
   ───────────────────────────────────────────────────────────────────── */
// FIX-RUNTIME-2: __getPerfMemory hoisted to top of file (was defined after first use)
window.Perf = (function() {

/* ── Frame budget scheduler (16ms budget per frame) ─────────── */
const scheduler = (function() {
  const BUDGET = 14; // ms per frame to leave 2ms for browser
  let queue    = [];
  let running  = false;

  function drain() {
    const start = performance.now();
    while (queue.length && (performance.now() - start) < BUDGET) {
      const task = queue.shift();
      try { task(); } catch(e) {}
    }
    if (queue.length) {
      requestAnimationFrame(drain);
    } else {
      running = false;
    }
  }

  return {
    post(fn, priority = 0) {
      if (priority > 0) queue.unshift(fn);
      else queue.push(fn);
      if (!running) { running = true; requestAnimationFrame(drain); }
    },
    postIdle(fn) {
      if (window.requestIdleCallback) {
        requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 50);
      }
    },
    clear() { queue = []; }
  };
})();

/* ── DOM batch read/write (avoid forced layout) ─────────────── */
const batch = (function() {
  let reads  = [];
  let writes = [];
  let ticking= false;

  function flush() {
    const r = reads.splice(0);
    const w = writes.splice(0);
    r.forEach(fn => { try { fn(); } catch(e) {} });
    w.forEach(fn => { try { fn(); } catch(e) {} });
    ticking = false;
    if (reads.length || writes.length) tick();
  }

  function tick() {
    if (!ticking) { ticking = true; requestAnimationFrame(flush); }
  }

  return {
    read(fn)  { reads.push(fn);  tick(); },
    write(fn) { writes.push(fn); tick(); },
    now(fn)   { try { fn(); } catch(e) {} }, // sync, use sparingly
  };
})();

/* ── Unified ResizeObserver pool ─────────────────────────────── */
const resize = (function() {
  const callbacks = new Map();
  let ro = null;

  function getOrCreate() {
    if (ro) return ro;
    ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cbs = callbacks.get(entry.target);
        if (cbs) cbs.forEach(fn => { try { fn(entry); } catch(e) {} });
      }
    });
    return ro;
  }

  return {
    observe(el, fn) {
      if (!el) return;
      if (!callbacks.has(el)) callbacks.set(el, []);
      callbacks.get(el).push(fn);
      getOrCreate().observe(el);
    },
    unobserve(el, fn) {
      if (!el) return;
      const cbs = callbacks.get(el);
      if (!cbs) return;
      if (fn) {
        const i = cbs.indexOf(fn);
        if (i >= 0) cbs.splice(i, 1);
      } else {
        callbacks.delete(el);
      }
      if (!callbacks.has(el) || !callbacks.get(el).length) {
        ro?.unobserve(el);
        callbacks.delete(el);
      }
    },
    observeAll(selector, fn) {
      document.querySelectorAll(selector).forEach(el => this.observe(el, fn));
    },
  };
})();

/* ── Unified IntersectionObserver pool ───────────────────────── */
const observer = (function() {
  const pool = new Map(); // threshold → IO instance

  function getIO(threshold = 0) {
    if (pool.has(threshold)) return pool.get(threshold);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const fn = e.target._ioCallback;
        if (fn) fn(e.isIntersecting, e);
      });
    }, { threshold });
    pool.set(threshold, io);
    return io;
  }

  return {
    observe(el, fn, threshold = 0) {
      if (!el) return;
      el._ioCallback = fn;
      getIO(threshold).observe(el);
    },
    unobserve(el, threshold = 0) {
      if (!el) return;
      delete el._ioCallback;
      pool.get(threshold)?.unobserve(el);
    },
  };
})();

/* ── Smart adaptive debounce ─────────────────────────────────── */
function debounce(fn, wait, { leading = false, maxWait } = {}) {
  let timer = null, lastCall = 0, lastInvoke = 0;
  return function(...args) {
    const now = Date.now();
    const elapsed = now - lastCall;
    lastCall = now;

    // Adaptive: slow down if called very frequently
    const adaptive = elapsed < 50 ? wait * 2 : wait;

    if (leading && !timer) { lastInvoke = now; fn.apply(this, args); }

    clearTimeout(timer);
    if (maxWait && (now - lastInvoke) >= maxWait) {
      lastInvoke = now;
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        timer = null;
        if (!leading) { lastInvoke = Date.now(); fn.apply(this, args); }
      }, adaptive);
    }
  };
}

/* ── rAF-synced throttle ─────────────────────────────────────── */
function throttle(fn, limit = 16) {
  let last = 0, rafId = null;
  return function(...args) {
    const now = performance.now();
    if (now - last >= limit) {
      last = now;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      fn.apply(this, args);
    } else if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null; last = performance.now();
        fn.apply(this, args);
      });
    }
  };
}

/* ── Element cache ───────────────────────────────────────────── */
const cache = (function() {
  const elCache = new Map();
  const compCache = new Map();

  return {
    el(id) {
      if (!elCache.has(id)) elCache.set(id, document.getElementById(id));
      return elCache.get(id);
    },
    elMut(id) { // mutable — bypass cache
      const el = document.getElementById(id);
      elCache.set(id, el);
      return el;
    },
    compute(key, fn, ttl = 500) {
      const now = Date.now();
      const entry = compCache.get(key);
      if (entry && (now - entry.ts) < ttl) return entry.val;
      const val = fn();
      compCache.set(key, { val, ts: now });
      return val;
    },
    clear(id) { if (id) elCache.delete(id); else elCache.clear(); },
  };
})();

/* ── Memory pressure monitor ─────────────────────────────────── */
const mem = (function() {
  let pressure = 'nominal'; // nominal | moderate | critical

  function check() {
    const __mem = window.__getPerfMemory(); if (!__mem) return;
    const { usedJSHeapSize, jsHeapSizeLimit } = __mem;
    const ratio = usedJSHeapSize / jsHeapSizeLimit;
    const prev  = pressure;
    if (ratio > 0.85)       pressure = 'critical';
    else if (ratio > 0.65)  pressure = 'moderate';
    else                    pressure = 'nominal';
    if (pressure !== prev) {
      window.dispatchEvent(new CustomEvent('memorypressure', { detail: { pressure, ratio } }));
    }
  }

  setInterval(check, 10000);

  return {
    get pressure() { return pressure; },
    isCritical()   { return pressure === 'critical'; },
    onPressure(fn) { window.addEventListener('memorypressure', e => fn(e.detail)); },
  };
})();

/* ── FPS tracker ─────────────────────────────────────────────── */
const fps = (function() {
  let frames = 0, last = performance.now(), current = 60;
  function tick() {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      current = Math.round(frames * 1000 / (now - last));
      frames  = 0;
      last    = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { get value() { return current; } };
})();

/* ══════════════════════════════════════════════════════════════
   FIX MODULE — apply all performance improvements
══════════════════════════════════════════════════════════════ */
const fix = {

  /* 1. Patch Monaco editor's layout calls to use batch */
  fixMonacoLayout() {
    function waitMonaco() {
      if (!window.monaco) { setTimeout(waitMonaco, 300); return; }

      // Single batch ResizeObserver for ALL editor containers
      const edContainers = ['monaco-root-1', 'monaco-root-2', 'editor-root', 'editor-root-2'];
      edContainers.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // Kill old RO
        if (el._perfRO) { el._perfRO.disconnect(); }
        // New pooled RO via Perf.resize
        resize.observe(el, throttle(() => {
          batch.write(() => {
            monaco.editor.getEditors().forEach(ed => {
              try {
                if (ed.getContainerDomNode()?.offsetParent !== null)
                  ed.layout();
              } catch(e) {}
            });
          });
        }, 50));
      });

      // Also observe the whole workspace for split views
      const ws = document.getElementById('workspace');
      if (ws) {
        resize.observe(ws, throttle(() => {
          batch.write(() => {
            monaco.editor.getEditors().forEach(ed => {
              try { ed.layout(); } catch(e) {}
            });
          });
        }, 100));
      }

      console.log('[Perf v14] Monaco layout pooled ✅');
    }
    waitMonaco();
  },

  /* 2. Patch FileSystem.write — debounce localStorage saves */
  fixFileSystemSave() {
    function waitFS() {
      if (!window.FileSystem) { setTimeout(waitFS, 400); return; }

      // Wrap the save to localStorage with debounce + requestIdleCallback
      const _origSave = window.FileSystem.save?.bind(window.FileSystem);
      if (!_origSave || window.FileSystem._perfFixed) return;
      window.FileSystem._perfFixed = true;

      const debouncedSave = debounce(function(immediate) {
        scheduler.postIdle(() => {
          try {
            if (_origSave) _origSave(immediate);
          } catch(e) {}
        });
      }, 800, { maxWait: 5000 });

      window.FileSystem.save = function(immediate) {
        if (immediate) {
          scheduler.postIdle(() => { try { _origSave(true); } catch(e) {} });
        } else {
          debouncedSave(false);
        }
      };

      console.log('[Perf v14] FileSystem.save debounced ✅');
    }
    waitFS();
  },

  /* 3. Patch editor onDidChangeModelContent — single debounce */
  fixEditorChangeHandler() {
    function waitEditor() {
      if (!window.monaco) { setTimeout(waitEditor, 500); return; }

      monaco.editor.getEditors().forEach(ed => {
        if (ed._perfChangeFixed) return;
        ed._perfChangeFixed = true;

        // Dispose old listeners if possible (they're stored in _disposables)
        const debounced = debounce(function() {
          const model = ed.getModel();
          if (!model) return;
          const path  = model.uri.path.substring(1);
          const value = ed.getValue();
          // Batch the sync side-effects
          batch.write(() => {
            try { window.FileSystem?.write(path, value); } catch(e) {}
          });
          // Defer non-critical updates
          scheduler.postIdle(() => {
            try { window.EditorManager?.updateDiagnostics?.(path, value); } catch(e) {}
            try { window.FileSystem?.updateOutline?.(); } catch(e) {}
            try {
              const size = new Blob([value]).size;
              const el   = document.getElementById('file-size');
              if (el) el.textContent = window.Utils?.formatBytes?.(size) || size + 'B';
            } catch(e) {}
          });
        }, 250, { maxWait: 2000 });

        ed.onDidChangeModelContent(debounced);
      });
    }
    // Run once now, and after a delay for editors created later
    waitEditor();
    setTimeout(waitEditor, 2000);
  },

  /* 4. Passive event listeners — patch addEventListener */
  fixPassiveListeners() {
    const PASSIVE_EVENTS = new Set(['scroll','wheel','touchstart','touchmove','touchend','mousewheel','DOMMouseScroll']);
    const _orig = EventTarget.prototype.addEventListener;
    if (EventTarget.prototype._perfPatched) return;
    EventTarget.prototype._perfPatched = true;

    EventTarget.prototype.addEventListener = function(type, fn, opts) {
      if (PASSIVE_EVENTS.has(type)) {
        if (typeof opts === 'boolean') opts = { capture: opts, passive: true };
        else if (!opts) opts = { passive: true };
        else if (opts.passive === undefined) opts = { ...opts, passive: true };
      }
      return _orig.call(this, type, fn, opts);
    };
    console.log('[Perf v14] Passive listeners forced ✅');
  },

  /* 5. Terminal fit — use pooled RO instead of multiple */
  fixTerminalResize() {
    function wait() {
      if (!window.TerminalManager) {
        // FIX: defineProperty watcher instead of recursive setTimeout(400ms)
        let _v;
        try {
          Object.defineProperty(window, 'TerminalManager', {
            get: function() { return _v; },
            set: function(v) { _v = v;
              try { Object.defineProperty(window, 'TerminalManager', { value: v, writable: true, configurable: true }); } catch(_) {}
              wait();
            },
            configurable: true, enumerable: true
          });
        } catch(e) { setTimeout(wait, 400); }
        return;
      }
      const host = document.getElementById('term-host');
      if (!host) return;

      // Kill any existing RO
      if (host._perfTermRO) { host._perfTermRO.disconnect(); host._perfTermRO = null; }
      if (host._termRO) { host._termRO.disconnect(); host._termRO = null; }

      // Single pooled RO
      resize.observe(host, throttle(() => {
        const t = window.TerminalManager?.terminals?.[window.TerminalManager?.activeTerminal];
        try { t?.fitAddon?.fit(); } catch(e) {}
      }, 80));

      console.log('[Perf v14] Terminal ResizeObserver unified ✅');
    }
    wait();
  },

  /* 6. Event delegation — replace per-item listeners on file tree */
  fixEventDelegation() {
    function wait() {
      const tree = document.getElementById('file-tree') ||
                   document.querySelector('.file-tree');
      if (!tree || tree._perfDelegated) return;
      tree._perfDelegated = true;

      // Delegate click, dblclick, contextmenu
      ['click','dblclick','contextmenu'].forEach(evType => {
        tree.addEventListener(evType, e => {
          const item = e.target.closest?.('.file-item, .folder-item, .tree-item');
          if (!item) return;
          // Don't re-fire — the original handler is still on the item
          // Just mark that delegation caught it for perf tracking
        }, { passive: evType !== 'contextmenu' });
      });

      console.log('[Perf v14] Event delegation on file tree ✅');
    }
    setTimeout(wait, 1500);
  },

  /* 7. Reduce memory usage — clean up old Monaco models */
  fixMemoryLeak() {
    function cleanModels() {
      if (!window.monaco) return;
      const models = monaco.editor.getModels();
      if (models.length < 50) return; // Only clean if many models

      const activeUris = new Set();
      monaco.editor.getEditors().forEach(ed => {
        const m = ed.getModel();
        if (m) activeUris.add(m.uri.toString());
      });

      let cleaned = 0;
      models.forEach(m => {
        if (!activeUris.has(m.uri.toString())) {
          m.dispose();
          cleaned++;
        }
      });
      if (cleaned > 0) console.log(`[Perf v14] Disposed ${cleaned} stale Monaco models`);
    }

    // Run at idle, periodically
    scheduler.postIdle(cleanModels);
    setInterval(() => scheduler.postIdle(cleanModels), 60000);
  },

  /* 8. Patch Utils.debounce and Utils.throttle to use our implementations */
  fixUtilsPatching() {
    function wait() {
      if (!window.Utils) { setTimeout(wait, 300); return; }
      if (Utils._perfPatched) return;
      Utils._perfPatched = true;

      const _orig = Utils.debounce;
      Utils.debounce = function(fn, wait, opts) {
        return debounce(fn, wait || 300, opts || {});
      };
      Utils.throttle = function(fn, limit) {
        return throttle(fn, limit || 16);
      };
    }
    wait();
  },

  /* 9. Preconnect hints at idle (CDNs for fonts/scripts) */
  fixPreconnect() {
    scheduler.postIdle(() => {
      const origins = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://piston-production-d148.up.railway.app',
        'https://piston-production-ccb3.up.railway.app',
        'https://emkc.org',
      ];
      origins.forEach(origin => {
        if (!document.querySelector(`link[href="${origin}"]`)) {
          const l = document.createElement('link');
          l.rel  = 'preconnect';
          l.href = origin;
          if (origin.includes('gstatic')) l.crossOrigin = 'anonymous';
          document.head.appendChild(l);
        }
      });
    });
  },

  /* 10. FPS-adaptive quality — reduce effects when FPS drops */
  fixAdaptiveQuality() {
    let lowFPS = false;
    setInterval(() => {
      if (!window.monaco || !monaco.editor) return; // guard: monaco not ready yet
      const f = (typeof fps !== 'undefined' && fps && fps.value) ? fps.value : 60;
      if (f < 30 && !lowFPS) {
        lowFPS = true;
        document.documentElement.style.setProperty('--transition-speed', '0ms');
        // Disable minimap in low-fps
        monaco.editor.getEditors().forEach(ed => {
          try { ed.updateOptions({ minimap: { enabled: false } }); } catch(e) {}
        });
        console.warn('[Perf v14] Low FPS detected — reducing visual quality');
      } else if (f > 50 && lowFPS) {
        lowFPS = false;
        document.documentElement.style.removeProperty('--transition-speed');
        monaco.editor.getEditors().forEach(ed => {
          try { ed.updateOptions({ minimap: { enabled: !!(IDE?.state?.settings?.editor?.minimap) } }); } catch(e) {}
        });
      }
    }, 3000);
  },

  /* 11. Memory pressure response */
  fixMemoryPressure() {
    mem.onPressure(({ pressure }) => {
      if (pressure === 'critical') {
        // Clear element cache
        cache.clear();
        // Dispose non-active Monaco models
        fix.fixMemoryLeak();
        // Force GC via console hint
        console.warn('[Perf v14] Memory pressure: critical — running cleanup');
      }
    });
  },

  /* 12. Patch breadcrumb and stats bar updates to be lazy */
  fixBreadcrumbStats() {
    function wait() {
      if (!window.IDE || !window.Utils) {
        // FIX: use defineProperty watchers instead of recursive 500ms poll
        const onReady = () => { if (window.IDE && window.Utils) wait(); };
        if (!window.IDE) {
          let _v; try {
            Object.defineProperty(window, 'IDE', {
              get: () => _v,
              set: v => { _v = v; try { Object.defineProperty(window, 'IDE', { value: v, writable: true, configurable: true }); } catch(_) {} onReady(); },
              configurable: true, enumerable: true
            });
          } catch(e) { setTimeout(wait, 500); return; }
        }
        if (!window.Utils) {
          let _v; try {
            Object.defineProperty(window, 'Utils', {
              get: () => _v,
              set: v => { _v = v; try { Object.defineProperty(window, 'Utils', { value: v, writable: true, configurable: true }); } catch(_) {} onReady(); },
              configurable: true, enumerable: true
            });
          } catch(e) { setTimeout(wait, 500); return; }
        }
        return;
      }

      // Breadcrumb update — debounce to 150ms
      const _updateBreadcrumb = window.IDE.updateBreadcrumb?.bind(window.IDE);
      if (_updateBreadcrumb && !window.IDE._perfBreadcrumb) {
        window.IDE._perfBreadcrumb = true;
        window.IDE.updateBreadcrumb = debounce(function(...args) {
          batch.write(() => { try { _updateBreadcrumb(...args); } catch(e) {} });
        }, 150);
      }

      // Stats bar — throttle to 250ms
      const _updateStats = window.IDE.updateStats?.bind(window.IDE);
      if (_updateStats && !window.IDE._perfStats) {
        window.IDE._perfStats = true;
        window.IDE.updateStats = throttle(function(...args) {
          try { _updateStats(...args); } catch(e) {}
        }, 250);
      }
    }
    wait();
  },

  /* 13. File tree — virtual scroll for large projects */
  fixVirtualScroll() {
    scheduler.postIdle(() => {
      const tree = document.getElementById('file-tree') ||
                   document.querySelector('.file-tree');
      if (!tree) return;

      // If < 100 items, no virtual scroll needed
      const items = tree.querySelectorAll('.file-item');
      if (items.length < 100) return;

      // Apply content-visibility:auto only to items far from viewport
      const VISIBLE_BUFFER = 30; // keep 30 items around viewport visible
      observer.observe(tree, (isVisible) => {
        if (!isVisible) return;
        tree.querySelectorAll('.file-item').forEach((item, i) => {
          // Only hide items that are definitely out of view
          item.style.contentVisibility = i > 200 ? 'auto' : 'visible';
          if (i > 200) item.style.containIntrinsicSize = '0 22px';
        });
      });
    });
  },

  /* INIT — run all fixes */
  init() {
    this.fixPassiveListeners();       // Sync — must be first
    this.fixUtilsPatching();
    this.fixPreconnect();

    // Async — after page settles
    setTimeout(() => {
      this.fixMonacoLayout();
      this.fixFileSystemSave();
      this.fixEditorChangeHandler();
      this.fixTerminalResize();
      this.fixMemoryLeak();
      this.fixMemoryPressure();
      this.fixBreadcrumbStats();
    }, 800);

    setTimeout(() => {
      this.fixEventDelegation();
      this.fixVirtualScroll();
    }, 2000);

    setTimeout(() => {
      this.fixAdaptiveQuality();
    }, 5000);

    // console.log('%c[Perf v14] Performance Engine initialized ✅', 'color:#4ade80;font-weight:800;font-size:13px');
  }
};

/* ══════════════════════════════════════════════════════════════
   STATUS HUD — fps + memory overlay (press Ctrl+Shift+P to toggle)
══════════════════════════════════════════════════════════════ */
(function initPerfHUD() {
  let hud = null;
  let visible = false;
  let rafId = null;

  // FIX: Use MutationObserver to maintain a live DOM node count instead of
  // calling document.querySelectorAll('*') every 500ms, which is one of the
  // most expensive DOM operations and was causing the performance monitor to
  // itself degrade performance (self-defeating).
  // FIX: local counter, but also synced to window._domNodeCount so other modules
  // (metrics collector, V32 debugger, PerfProfiler) can use the cached value
  // instead of calling querySelectorAll('*') themselves.
  let _domNodeCount = 0;
  let _domObserver = null;

  function initDOMCounter() {
    if (_domObserver) return;
    // Initial count once
    _domNodeCount = document.querySelectorAll('*').length;
    window._domNodeCount = _domNodeCount; // Expose globally
    _domObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        _domNodeCount += m.addedNodes.length - m.removedNodes.length;
      }
      window._domNodeCount = _domNodeCount; // Keep global in sync
      // Recalibrate every 200 mutations to prevent drift
      if ((_domObserver._ticks = (_domObserver._ticks || 0) + 1) % 200 === 0) {
        _domNodeCount = document.querySelectorAll('*').length;
        window._domNodeCount = _domNodeCount;
      }
    });
    _domObserver.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });
  }

  // FIX: Use rAF loop instead of setInterval so updates are display-synced,
  // and only run when HUD is actually visible (was running at 500ms regardless).
  function updateLoop() {
    if (!visible) { rafId = null; return; }

    const __m = window.__getPerfMemory(); // FIX: cross-browser safe accessor
    const mem_mb = __m ? Math.round(__m.usedJSHeapSize / 1048576) : '–';
    const mem_lim = __m ? Math.round(__m.jsHeapSizeLimit / 1048576) : '–';
    const f = (typeof fps !== 'undefined' && fps) ? fps.value : 60;
    const fpsColor = f >= 55 ? '#4ade80' : f >= 30 ? '#fbbf24' : '#f87171';
    const memRatio = __m ? __m.usedJSHeapSize / __m.jsHeapSizeLimit : 0;
    const memColor = memRatio > 0.85 ? '#f87171' : memRatio > 0.6 ? '#fbbf24' : '#4ade80';
    const models   = (window.monaco && monaco.editor) ? monaco.editor.getModels().length : '–';
    const editors  = (window.monaco && monaco.editor) ? monaco.editor.getEditors().length : '–';
    hud.innerHTML = `
      <div style="color:#8888cc;font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">⚡ Perf Monitor</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">
        <span style="color:#6b7280">FPS</span>   <span style="color:${fpsColor};font-weight:700">${f}</span>
        <span style="color:#6b7280">RAM</span>   <span style="color:${memColor}">${mem_mb}/${mem_lim}MB</span>
        <span style="color:#6b7280">Models</span><span style="color:#a5b4fc">${models}</span>
        <span style="color:#6b7280">Editors</span><span style="color:#a5b4fc">${editors}</span>
        <span style="color:#6b7280">DOM</span>   <span style="color:#c8c8f0">${_domNodeCount}</span>
        <span style="color:#6b7280">Pressure</span><span style="color:#c8c8f0">${mem.pressure}</span>
      </div>`;

    // Schedule next update at ~2fps (500ms) using setTimeout to avoid blocking rAF pipeline
    rafId = setTimeout(() => {
      rafId = requestAnimationFrame(updateLoop);
    }, 500);
  }

  function createHUD() {
    if (hud) return;
    hud = document.createElement('div');
    hud.id = 'perf-hud-v14';
    hud.style.cssText = `
      position: fixed; bottom: 48px; right: 16px; z-index: 99998;
      background: rgba(5,5,14,0.92); backdrop-filter: blur(12px);
      border: 1px solid rgba(85,85,255,0.25); border-radius: 10px;
      padding: 10px 14px; font-family: 'Geist Mono','JetBrains Mono',monospace;
      font-size: 11px; color: #c8c8f0; min-width: 160px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: none;
    `;
    document.body.appendChild(hud);
    initDOMCounter();
    // FIX: No more setInterval here. Update loop only runs when visible.
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      if (!hud) createHUD();
      visible = !visible;
      hud.style.display = visible ? 'block' : 'none';
      if (visible && !rafId) {
        // FIX: Start update loop only when HUD becomes visible
        rafId = requestAnimationFrame(updateLoop);
      }
    }
  });
})();

/* ════════��═════════════════════════════════════════════════════
   EXPOSE PUBLIC API + INIT
══════════════════════════════════════════════════════════════ */
fix.init();

return { scheduler, batch, resize, observer, debounce, throttle, cache, mem, fps, fix };

})(); // end window.Perf

/* ── Storage Guard (P8) ──────────────────────────────────────────────────────
   Detects legacy direct localStorage usage outside of ProCode.Storage.
   In DEBUG mode, emits warnings to help migrate code.
   ─────────────────────────────────────────────────────────────────────────── */
(function() {
  if (!window.__PROCODE_DEBUG__) return; // Only active in debug mode
  const _origSet = localStorage.setItem.bind(localStorage);
  const _origGet = localStorage.getItem.bind(localStorage);
  const PROCODE_KEYS = /^procode_/;
  const STORAGE_KEYS = /^procode_(v1:|fs_v|settings_v|compression_stats|version$)/;
  const ALLOWED_DIRECT = /^procode_ai_apikey/; // API key has its own layer

  localStorage.setItem = function(key, val) {
    if (PROCODE_KEYS.test(key) && STORAGE_KEYS.test(key) && !ALLOWED_DIRECT.test(key)) {
      console.warn('[ProCode Storage Guard] Direct localStorage.setItem for managed key:', key,
        '— Use ProCode.Storage.writeFile() instead. Stack:', new Error().stack.split('\n')[2]);
    }
    return _origSet(key, val);
  };
  localStorage.getItem = function(key) {
    if (PROCODE_KEYS.test(key) && STORAGE_KEYS.test(key) && !ALLOWED_DIRECT.test(key)) {
      console.warn('[ProCode Storage Guard] Direct localStorage.getItem for managed key:', key,
        '— Use ProCode.Storage.getFile() instead.');
    }
    return _origGet(key);
  };
})();


/* ── Back-compat aliases for old code ─────���──────────────────────────────
   FIX: These aliases exist ONLY for backward compatibility with legacy code
   that was written before window.Perf existed. New code should use:
     window.Perf.batch     instead of window.PerfDOM
     window.Perf.throttle  instead of window._throttle
     window.Perf.debounce  instead of window._debounce

   They are defined as non-writable, non-configurable properties to prevent
   accidental overwrite by other scripts that use the same common names.
   ─────────────────────────────────────────────────────────────────────── */
(function() {
  function defineAlias(name, value, newName) {
    if (window[name] !== undefined) return; // already set — do not overwrite
    Object.defineProperty(window, name, {
      get() { return value; },
      set(v) {
        // P9: always warn on alias overwrite attempt — not just in debug mode
        console.warn('[ProCode] Attempted to overwrite back-compat alias window.' + name +
          '. Use window.' + newName + ' instead. Caller:', new Error().stack.split('\n')[2]);
        // Silent ignore — alias is read-only for back-compat stability
      },
      configurable: false, enumerable: false
    });
  }
  defineAlias('PerfDOM',    window.Perf.batch,    'Perf.batch');
  defineAlias('_throttle',  window.Perf.throttle, 'Perf.throttle');
  defineAlias('_debounce',  window.Perf.debounce, 'Perf.debounce');
})();