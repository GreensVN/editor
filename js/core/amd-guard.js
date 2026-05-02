/**
 * amd-guard.js — AMD/RequireJS Guard
 * Prevents Monaco/Babel conflicts with global define()
 */

(function() {
  // Monaco loader.js exposes window.define with define.amd, causing UMD libs to attempt
  // anonymous AMD registration which fails with "Can only have one anonymous define call".
  // We null-out define before each conflicting lib and restore afterwards.
  window.__monacoDefineBackup = null;
  // FIX: Replace boolean _guardLocked with a reference counter.
  // Multiple sequential hide() calls each get a paired restore() — the counter
  // goes to 0 only when every hide() has a matching restore(), preventing the
  // permanent window.define=undefined bug when parallel scripts both call hide().
  var _refCount = 0;
  window.__amdGuard = {
    hide: function() {
      if (_refCount === 0 && window.define && window.define.amd) {
        window.__monacoDefineBackup = window.define;
        window.define = undefined;
      }
      _refCount++;
    },
    restore: function() {
      if (_refCount <= 0) return; // guard against unbalanced calls
      _refCount--;
      if (_refCount === 0) {
        try {
          if (window.__monacoDefineBackup) {
            window.define = window.__monacoDefineBackup;
            window.__monacoDefineBackup = null;
          }
        } catch(e) {
          console.error('[AMD Guard] restore() failed:', e);
        }
      }
    },
    isLocked: function() { return _refCount > 0; },
    save:     function() { this.hide();    },  // alias for hide() — v27+ compat
  };
})();