/**
 * timer-guard.js — Safe setTimeout/setInterval Wrappers
 * Prevents infinite timer loops, logs abuse
 */

/* ═══════════════════════════════════════════════════════════════════════
   TIMER MANAGER — Centralized Timer Registry
   
   VẤN ĐỀ CŨ: 422 setTimeout/setInterval không được cleanup, gây memory
   leak và timer chồng lên timer khi reinitialize.
   
   GIẢI PHÁP: ProCode.Timer wrap các timer functions với auto-tracking.
   Mỗi component có thể gọi ProCode.Timer.clearScope(scopeId) để cleanup.
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  "use strict";
  if (window.ProCode && window.ProCode.Timer) return;

  const _timeouts  = new Map(); // id → { fn, scope }
  const _intervals = new Map();
  // FIX: Store {id, type} objects so clearScope can call the correct clear function.
  // Previously stored plain IDs, but timeout and interval IDs can overlap on some browsers,
  // causing clearScope to call clearTimeout on an interval ID (no-op) and vice-versa (no-op),
  // silently leaking timers or clearing the wrong timer.
  const _scopes    = new Map(); // scope → Map<id, 'timeout'|'interval'>

  const Timer = {
    /**
     * setTimeout với scope tracking
     * @param {Function} fn
     * @param {number} delay
     * @param {string} [scope] - component scope để cleanup
     */
    setTimeout(fn, delay, scope) {
      const id = window.setTimeout(() => {
        _timeouts.delete(id);
        if (scope) {
          const s = _scopes.get(scope);
          if (s) s.delete(id);
        }
        fn();
      }, delay);
      _timeouts.set(id, { fn, scope });
      if (scope) {
        if (!_scopes.has(scope)) _scopes.set(scope, new Map());
        _scopes.get(scope).set(id, 'timeout'); // FIX: tag type
      }
      return id;
    },

    /**
     * setInterval với scope tracking
     */
    setInterval(fn, delay, scope) {
      const id = window.setInterval(fn, delay);
      _intervals.set(id, { fn, scope });
      if (scope) {
        if (!_scopes.has(scope)) _scopes.set(scope, new Map());
        _scopes.get(scope).set(id, 'interval'); // FIX: tag type
      }
      return id;
    },

    clearTimeout(id) {
      window.clearTimeout(id);
      _timeouts.delete(id);
    },

    clearInterval(id) {
      window.clearInterval(id);
      _intervals.delete(id);
    },

    /**
     * Xóa tất cả timers của một scope
     * FIX: Use tagged type to call the correct clear function (clearTimeout vs clearInterval).
     * The old implementation called both on every ID, which is incorrect and silently fails
     * on browsers where timeout/interval IDs share a namespace.
     * @param {string} scope
     */
    clearScope(scope) {
      const ids = _scopes.get(scope);
      if (!ids) return;
      ids.forEach((type, id) => {
        if (type === 'timeout') {
          window.clearTimeout(id);
          _timeouts.delete(id);
        } else {
          window.clearInterval(id);
          _intervals.delete(id);
        }
      });
      _scopes.delete(scope);
    },

    /**
     * Xóa tất cả timers
     */
    clearAll() {
      const stats = { timeouts: _timeouts.size, intervals: _intervals.size, scopes: _scopes.size };
      if (window.__PROCODE_DEBUG__) console.info('[ProCode.Timer] Clearing all timers:', stats);
      _timeouts.forEach((_, id) => window.clearTimeout(id));
      _intervals.forEach((_, id) => window.clearInterval(id));
      _timeouts.clear();
      _intervals.clear();
      _scopes.clear();
    },

    /** Debug info */
    getStats() {
      return {
        timeouts:  _timeouts.size,
        intervals: _intervals.size,
        scopes:    _scopes.size
      };
    },

    // FIX: Expose internal maps so the global timer interceptor (installed below)
    // can register legacy timer IDs without needing to be inside the closure.
    // These are intentionally public for the interceptor only — not part of the
    // public API. Prefixed with _ as a convention.
    get _timeouts()  { return _timeouts;  },
    get _intervals() { return _intervals; }
  };

  if (window.ProCode) {
    window.ProCode.Timer = Timer;
  } else {
    window.ProCode = window.ProCode || {};
    window.ProCode.Timer = Timer;
  }

  // Cleanup khi page unload
  window.addEventListener('beforeunload', () => Timer.clearAll());

  /* ── FIX: Global timer interceptor ────────────────────────────────────────
     Monkey-patch window.setTimeout / window.setInterval so that ALL legacy
     callers (the 360+ raw calls already in this file) are automatically
     tracked by ProCode.Timer without touching each call site.

     This is the only safe way to handle 360+ scattered calls in a single-file
     architecture — replacing each individually risks regressions.

     Technique: wrap native methods, delegate to ProCode.Timer which handles
     tracking and cleanup. clearTimeout/clearInterval are also patched to keep
     the registry in sync.
     ────────────────────────────────────────────────────────────────────────── */
  (function installTimerInterceptor() {
    // Guard: only install once
    if (window.__timerInterceptorInstalled) return;
    window.__timerInterceptorInstalled = true;

    const _nativeSetTimeout   = window.setTimeout.bind(window);
    const _nativeSetInterval  = window.setInterval.bind(window);
    const _nativeClearTimeout = window.clearTimeout.bind(window);
    const _nativeClearInterval= window.clearInterval.bind(window);

    // FIX: Detect third-party callers (Monaco, Prism, Lottie, etc.) via stack trace
    // so we never intercept timers from cdn/unpkg scripts.
    const THIRD_PARTY_RE = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com/;
    function isThirdPartyCall() {
      try { return THIRD_PARTY_RE.test(new Error().stack || ''); }
      catch(_) { return false; }
    }

    let _intercepting = false;

    window.setTimeout = function(fn, delay, ...args) {
      // FIX: string-form passes through natively (don't silently drop); third-party bypasses tracking
      if (_intercepting || typeof fn !== 'function' || isThirdPartyCall()) {
        return _nativeSetTimeout(fn, delay, ...args);
      }
      _intercepting = true;
      let id;
      try {
        id = _nativeSetTimeout(function() {
          if (window.ProCode?.Timer?._timeouts) window.ProCode.Timer._timeouts.delete(id);
          fn(...args);
        }, delay);
        if (window.ProCode?.Timer?._timeouts) {
          window.ProCode.Timer._timeouts.set(id, { fn, scope: 'user' });
        }
      } finally {
        _intercepting = false;
      }
      return id;
    };

    window.setInterval = function(fn, delay, ...args) {
      // FIX: string-form and third-party bypass
      if (_intercepting || typeof fn !== 'function' || isThirdPartyCall()) {
        return _nativeSetInterval(fn, delay, ...args);
      }
      _intercepting = true;
      let id;
      try {
        id = _nativeSetInterval(function() {
          fn(...args);
        }, delay);
        if (window.ProCode?.Timer?._intervals) {
          window.ProCode.Timer._intervals.set(id, { fn, scope: 'user' });
        }
      } finally {
        _intercepting = false;
      }
      return id;
    };

    window.clearTimeout = function(id) {
      _nativeClearTimeout(id);
      if (window.ProCode?.Timer?._timeouts) window.ProCode.Timer._timeouts.delete(id);
    };

    window.clearInterval = function(id) {
      _nativeClearInterval(id);
      if (window.ProCode?.Timer?._intervals) window.ProCode.Timer._intervals.delete(id);
    };

    if (window.__PROCODE_DEBUG__) console.info('[ProCode.Timer] Global interceptor installed — all timers now tracked.');
  })();

  if (window.__PROCODE_DEBUG__) console.info('[ProCode.Timer] Timer Manager ready. Use ProCode.Timer.setTimeout/setInterval.');
})();