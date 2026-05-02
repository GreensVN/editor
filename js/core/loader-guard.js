/**
 * loader-guard.js — Guaranteed Loader Hide
 * Fallback: hides boot loader in case of script failure
 */

/* ── GUARANTEED LOADER HIDE — fallback in case any boot script fails ── */
(function() {
  var _hidden = false;
  function _forceHideLoader(reason) {
    if (_hidden) return;
    var lo = document.getElementById('loader-overlay');
    if (lo && !lo.classList.contains('hidden')) {
      _hidden = true;
      if(window.__PROCODE_DEBUG__) console.info('[ProCode Loader] Hiding loader. Reason:', reason || 'unknown');
      lo.style.opacity = '0';
      lo.style.transition = 'opacity 0.4s';
      // Add .hidden immediately so the CSS `display:none !important` override
      // fires at the end of the transition; the inline style alone loses to
      // the `display:flex !important` rule declared earlier in styles.css.
      setTimeout(function() {
        lo.classList.add('hidden');
        lo.style.display = 'none';
      }, 400);
    }
  }

  // Last-resort fallback: 10s (đủ để Pyodide ~10MB load trên mạng chậm)
  var _fallbackTimer = setTimeout(function() {
    _forceHideLoader('timeout-10s-fallback');
  }, 10000);

  // Ẩn khi app thực sự sẵn sàng
  window.addEventListener('procode:ready', function() {
    clearTimeout(_fallbackTimer);
    // Stop progress bar animation before hiding
    var fill = document.getElementById('boot-progress-fill');
    if (fill) { fill.style.animation = 'none'; fill.style.width = '100%'; }
    _forceHideLoader('procode:ready event');
  });

  // Ẩn khi pyodide sẵn sàng (nếu có)
  window.addEventListener('pyodide-ready', function() {
    _forceHideLoader('pyodide-ready event');
  });

  // Ẩn sau khi window.load + 2s (đủ cho lazy init)
  window.addEventListener('load', function() {
    setTimeout(function() { _forceHideLoader('window.load + 2s'); }, 2000);
  });

  // Expose để boot scripts có thể gọi trực tiếp
  window._forceHideLoader = _forceHideLoader;
})();