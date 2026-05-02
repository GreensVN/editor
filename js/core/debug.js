/**
 * debug.js — Debug Gate
 * Sets window.__PROCODE_DEBUG__
 */

/* ─────────────────────────────────────────────────────────────────────────
   DEBUG GATE — FIX for console log noise in production
   Set window.__PROCODE_DEBUG__ = true in DevTools to enable verbose logging.
   All console.info() and routine console.warn() calls are gated behind this
   flag. Real errors (console.error) and user-facing warnings always show.
   ─────────────────────────────────────────────────────────────────────────
   To enable: open DevTools console and run:
     window.__PROCODE_DEBUG__ = true
   To disable:
     window.__PROCODE_DEBUG__ = false
   ───────────────────────────────────────────────────────────────────────── */
// FIX: Use Object.defineProperty so the flag cannot be accidentally overwritten.
// Intentional toggle: ProCode.__setDebug(true/false) — see ProCode namespace init.
(function() {
  let _debug = false;
  Object.defineProperty(window, '__PROCODE_DEBUG__', {
    get: function() { return _debug; },
    set: function(v) {
      _debug = !!v;
      console.info('[ProCode] Debug mode ' + (_debug ? 'ENABLED' : 'DISABLED'));
    },
    configurable: false,
    enumerable: false
  });
})();