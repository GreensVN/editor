/**
 * monaco-bootstrap.js — Monaco Editor Loader
 * CDN loader with worker config and retry backoff
 */

/* Monaco bootstrap (CDN + worker fix) */
(function () {
  const CDN_VS = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs";
  const CDN_BASE = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min";

  // Suppress the well-known Monaco TS-worker race:
  //   "Could not find source file: 'inmemory://model/N'"
  // It fires when a model is disposed (tab close, fast switch) while its TS
  // worker still has a getSyntacticDiagnostics in flight. Register the filter
  // BEFORE Monaco loads so we catch the very first occurrence.
  try {
    window.addEventListener("unhandledrejection", (ev) => {
      const msg = String(ev.reason?.message || ev.reason || "");
      if (/Could not find source file:\s*'inmemory:\/\//.test(msg)) {
        ev.preventDefault();
      }
    });
  } catch (_) {}
  function boot() {
    if (!window.require) return;
    if (window.__MONACO_BOOTED__) return; // ✅ FIX: prevent duplicate Monaco load
    if (window.monaco) { // Monaco already loaded (e.g. from cache)
      window.__MONACO_BOOTED__ = true;
      window.__MONACO_READY__ = true;
      if (!window.__MONACO_READY_FIRED__) {
        window.__MONACO_READY_FIRED__ = true;
        window.dispatchEvent(new CustomEvent('monaco-ready'));
      }
      return;
    }
    window.__MONACO_BOOTED__ = true;
    // Ensure workers can load from CDN even when running from file:// or Live Server
    window.MonacoEnvironment = window.MonacoEnvironment || {};
    window.MonacoEnvironment.getWorkerUrl = function (_moduleId, _label) {
      const proxy = [
        "self.MonacoEnvironment = { baseUrl: '" + CDN_BASE + "/' };",
        "importScripts('" + CDN_BASE + "/vs/base/worker/workerMain.js');"
      ].join("\n");
      return "data:text/javascript;charset=utf-8," + encodeURIComponent(proxy);
    };

    try {
      window.require.config({ paths: { vs: CDN_VS } });
    } catch (e) {
      if(window.__PROCODE_DEBUG__) console.warn("Monaco require.config failed:", e);
    }

    // AMD conflict is handled by the safeDefine wrapper injected right after loader.js in index.html.
    // That wrapper uses document.currentScript detection to silently drop anonymous define() calls
    // from static <script> tags (UMD libs), while still allowing Monaco's XHR-eval'd modules through.
    window.__monacoRequire = window.require;
    window.__monacoDefine  = window.define;

    window.require(
      ["vs/editor/editor.main"],
      function () {
        window.__MONACO_READY__ = true;
        // ✅ v26: dispatch event so all modules can react without polling
        // Guard: only fire once (dispatchMonacoReadyEvent() proxy may have fired already)
        if (!window.__MONACO_READY_FIRED__) {
          window.__MONACO_READY_FIRED__ = true;
          window.dispatchEvent(new CustomEvent('monaco-ready'));
        }
      },
      function (err) {
        console.error("❌ Monaco failed to load:", err);
        window.__MONACO_READY__ = false;
      }
    );
  }

  // loader.js is in <head>, so this is usually immediate; still guard for safety.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();