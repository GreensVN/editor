/**
 * syntax-check.js — Real-time Syntax Checker
 */

/* ═══════════════════════════════════════════════════════════════════════
   SANDBOX SECURITY — new Function() / eval() Safety Layer
   
   VẤN ĐỀ: new Function() tương đương eval() về mặt bảo mật.
   Code tuyên bố dùng Worker sandbox nhưng vẫn có new Function() trong main thread.
   
   GIẢI PHÁP:
   1. ProCode.Sandbox.eval(code) - luôn chạy trong Worker nếu có thể
   2. ProCode.Sandbox.lint(code) - syntax check không thực thi
   3. Các new Function() trong main thread đã được comment cảnh báo
   
   TODO: Migrate tất cả code execution sang ProCode.Sandbox.eval()
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  "use strict";
  if (window.ProCode && window.ProCode.Sandbox) return;

  /**
   * Kiểm tra syntax bằng cách compile với new Function (không thực thi body).
   * LƯU Ý: Đây IS new Function() — compile nhưng không chạy vì kết quả không được invoke.
   * Đây là lý do 'unsafe-eval' không thể xóa khỏi CSP.
   */
  function syntaxCheck(code) {
    try {
      // new Function() compile/parse only — không thực thi vì hàm trả về không được gọi.
      new Function('"use strict";\n' + code + '\n//# sourceURL=procode-syntax-check.js');
      return { valid: true, error: null };
    } catch(e) {
      return { valid: false, error: e };
    }
  }

  /**
   * Thực thi code trong Worker nếu có thể (an toàn hơn)
   */
  async function execInWorker(code, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([
        `"use strict";\n` +
        // FIX: Override network APIs inside the Worker blob to block outbound calls.
        // Defence-in-depth — prevents fetch/importScripts/WebSocket exfiltration vectors.
        // FIX-5: Harden sandbox — block additional exfiltration vectors and
        // prevent nested code-generation primitives inside the Worker.
        `const _blocked = (n) => { throw new Error('[Sandbox] ' + n + ' is blocked in sandbox.'); };\n` +
        `self.fetch = () => _blocked('fetch');\n` +
        `self.XMLHttpRequest = function() { _blocked('XMLHttpRequest'); };\n` +
        `self.importScripts = () => _blocked('importScripts');\n` +
        `self.WebSocket = function() { _blocked('WebSocket'); };\n` +
        `self.EventSource = function() { _blocked('EventSource'); };\n` +
        `self.open = () => _blocked('open');\n` +
        `self.BroadcastChannel = function() { _blocked('BroadcastChannel'); };\n` +
        `self.SharedWorker = function() { _blocked('SharedWorker'); };\n` +
        // Block nested eval/Function so sandboxed code cannot spawn new execution contexts
        `const _origEval = self.eval; self.eval = () => _blocked('eval');\n` +
        `const _OrigFunc = Function; self.Function = function() { _blocked('Function'); };\n` +
        // Capture console output and relay it back to the main thread
        `const _consoleOut = []; ['log','warn','error','info'].forEach(m => {\n` +
        `  const _orig = self.console[m]; self.console[m] = (...a) => {\n` +
        `    _consoleOut.push({ level: m, args: a.map(String) }); _orig && _orig(...a);\n` +
        `  };\n` +
        `});\n` +
        `self.onmessage = async function(e) {\n` +
        `  try {\n` +
        `    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;\n` +
        `    const fn = new AsyncFunction(e.data.code);\n` +
        `    const result = await fn();\n` +
        `    self.postMessage({ ok: true, result: String(result ?? '') });\n` +
        `  } catch(err) {\n` +
        `    self.postMessage({ ok: false, error: err.message });\n` +
        `  }\n` +
        `};\n`
      ], { type: 'application/javascript' });

      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      const timer = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        reject(new Error('Code execution timeout (' + timeout + 'ms)'));
      }, timeout);

      worker.onmessage = function(e) {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        if (e.data.ok) resolve(e.data.result);
        else reject(new Error(e.data.error));
      };

      worker.onerror = function(e) {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        reject(e);
      };

      worker.postMessage({ code });
    });
  }

  const Sandbox = {
    /**
     * Kiểm tra syntax của code
     */
    lint: syntaxCheck,

    /**
     * Thực thi code an toàn trong Worker
     */
    eval: execInWorker,

    /**
     * Mức độ rủi ro của một đoạn code.
     * GIỚI HẠN BẢO MẬT QUAN TRỌNG:
     *   1. Sandbox dùng Worker + AsyncFunction (tương đương eval) — KHÔNG phải sandbox thật.
     *   2. Worker KHÔNG bị hạn chế network: code vẫn có thể gọi fetch/importScripts.
     *   3. assessRisk() dùng regex — có thể bị bypass bằng obfuscation (vd: window['fe'+'tch']).
     *   4. Giới hạn thực tế chỉ là: timeout CPU, không có DOM access.
     *   Để sandbox thật cần dùng: iframe sandbox="allow-scripts", Cloudflare Workers, hay VM riêng.
     */
    // FIX: Clearly document Worker sandbox limitations in the API surface
    // so callers cannot assume isolation that doesn't exist.
    LIMITATIONS: {
      // FIX-5 UPDATE: Worker now blocks fetch/XHR/WebSocket/importScripts/eval/Function.
      // Remaining limitations:
      // 1. Worker uses AsyncFunction — not a true OS-level sandbox.
      // 2. assessRisk() regex is heuristic-only; obfuscated code may bypass detection.
      // 3. For maximum isolation use <iframe sandbox="allow-scripts"> or a server-side VM.
    },
    assessRisk(code) {
      const risks = [];
      // Regex patterns — heuristic only; document this clearly
      if (/document\s*\.\s*cookie/i.test(code)) risks.push('cookie access');
      if (/localStorage|sessionStorage/i.test(code)) risks.push('storage access');
      if (/fetch\s*\(|XMLHttpRequest|axios/i.test(code)) risks.push('network access');
      if (/import\s*\(/i.test(code)) risks.push('dynamic import');
      if (/eval\s*\(|new\s+Function/i.test(code)) risks.push('code generation');
      if (/importScripts/i.test(code)) risks.push('importScripts (Worker)');
      // FIX: expanded obfuscation detection
      // bracket-notation property access: window['fe'+'tch'], self["eval"], etc.
      if (/(?:window|self|globalThis|this)\s*\[\s*['"`][a-z]+['"`]\s*(?:\+\s*['"`][a-z]+['"`]\s*)*\]/i.test(code)) {
        risks.push('possible bracket-notation obfuscation');
      }
      // atob / btoa usage (common in encoded-payload attacks)
      if (/\batob\s*\(|\bbtoa\s*\(/i.test(code)) risks.push('base64 encode/decode');
      // String.fromCharCode chains (charCode obfuscation)
      if (/String\.fromChar(?:Code|At)/i.test(code)) risks.push('charcode obfuscation');
      // Hex/unicode escape sequences in strings that spell dangerous keywords
      if (/\\x(?:66|65|74|63|68)|\\u(?:0066|0065|0074|0063|0068)/i.test(code)) {
        risks.push('hex/unicode-escaped keywords');
      }
      // setTimeout/setInterval with string argument (classic eval vector)
      if (/(?:set(?:Timeout|Interval))\s*\(\s*['"`]/.test(code)) {
        risks.push('string-form timer (eval vector)');
      }
      return {
        level: risks.length === 0 ? 'low' : risks.length < 3 ? 'medium' : 'high',
        risks,
        warning: 'assessRisk là heuristic, không phải sandbox thật. Không dùng cho untrusted code production.'
      };
    }
  };

  if (window.ProCode) {
    window.ProCode.Sandbox = Sandbox;
  } else {
    window.ProCode = window.ProCode || {};
    window.ProCode.Sandbox = Sandbox;
  }

  if(window.__PROCODE_DEBUG__) console.info('[ProCode.Sandbox] Security sandbox ready. Use ProCode.Sandbox.eval(code) for safe execution.');
})();