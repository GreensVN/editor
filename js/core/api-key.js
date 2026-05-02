/**
 * api-key.js — API Key Management
 * Handles obfuscated API key storage (in-memory only)
 */

/* ═══════════════════════════════════════════════════════════════════════
   NAMESPACE — ProCode Global Registry
   Thay vì gán thẳng vào window, tất cả modules được đăng ký vào ProCode.
   window.X vẫn được giữ để tương thích ngược, nhưng ProCode là nguồn truth.

   Cách dùng:
     // Đăng ký module:
     ProCode.register('MyModule', MyModule);
     // Lấy module:
     const m = ProCode.get('MyModule');
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  "use strict";

  if (window.ProCode) return; // Tránh khởi tạo lại

  const _registry = Object.create(null);
  const _timers    = new Set();     // Track tất cả setTimeout/setInterval để cleanup
  const _observers = new WeakMap(); // Track MutationObservers

  window.ProCode = {
    version: '3.0.0',

    /**
     * Đăng ký một module vào namespace.
     * Vẫn gán lên window để tương thích với code cũ.
     */
    register(name, obj) {
      _registry[name] = obj;
      // KHÔNG gán lên window nữa — dùng ProCode.get(name) thay thế
      // window[name] = obj  ← đã xóa để tránh global namespace pollution
      return obj;
    },

    get(name) {
      return _registry[name];  // chỉ tra cứu registry, không fallback window
    },

    list() {
      return Object.keys(_registry);
    },

    /**
     * Managed setTimeout - tự động được track để cleanup
     */
    setTimeout(fn, delay, ...args) {
      const id = window.setTimeout(function() {
        _timers.delete(id);
        fn(...args);
      }, delay);
      _timers.add(id);
      return id;
    },

    /**
     * Managed setInterval - tự động được track
     */
    setInterval(fn, delay, ...args) {
      const id = window.setInterval(fn, delay, ...args);
      _timers.add(id);
      return id;
    },

    /**
     * Hủy tất cả managed timers (dùng khi unmount/cleanup)
     */
    clearAllTimers() {
      const count = _timers.size; // ← lưu trước khi clear
      _timers.forEach(id => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      _timers.clear();
      if(window.__PROCODE_DEBUG__) console.info(`[ProCode] Cleared ${count} managed timers`);
    },

    /**
     * Theo dõi số lượng timers đang chạy
     */
    getTimerCount() {
      return _timers.size;
    }
  };

  // Theo dõi window.onerror để log errors tập trung
  const _prevOnerror = window.onerror;
  window.onerror = function(msg, src, line, col, err) {
    console.group('[ProCode Error]');
    console.error(msg, `${src}:${line}:${col}`, err);
    console.groupEnd();
    if (typeof _prevOnerror === 'function') return _prevOnerror.apply(this, arguments);
    return false;
  };

  // Theo dõi unhandledrejection
  window.addEventListener('unhandledrejection', function(e) {
    if(window.__PROCODE_DEBUG__) console.warn('[ProCode] Unhandled Promise rejection:', e.reason);
  });

  if (window.__PROCODE_DEBUG__) console.info('[ProCode] Namespace initialized. ' +
    'Use ProCode.register(name, module) to register modules.');
})();