/**
 * security.js — HTML Sanitizer & XSS Protection
 * ProCode IDE v3.0
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   SECURITY LAYER — HTML Sanitizer
   Vá XSS vectors trong innerHTML. Được thêm bởi security audit fix.
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  "use strict";
  const SAFE_TAGS = new Set(['a','abbr','b','blockquote','br','caption','cite',
    'code','col','colgroup','dd','del','details','dfn','div','dl','dt','em',
    'figcaption','figure','h1','h2','h3','h4','h5','h6','hr','i','img','ins',
    'kbd','li','mark','ol','p','pre','q','rp','rt','ruby','s','samp','section',
    'small','span','strong','sub','summary','sup','svg','path','table','tbody',
    'td','tfoot','th','thead','time','tr','u','ul','var','wbr'
  ]);
  const SAFE_ATTRS = new Set(['alt','class','colspan','controls','dir',
    'download','href','id','lang','name','rel','rowspan','scope','src','start',
    'style','target','title','type','width','height','role','tabindex',
    'placeholder','disabled','checked','selected','for','readonly','required',
    'autocomplete','action','method','enctype','viewBox','fill','stroke',
    'd','cx','cy','r','rx','ry','x','y','x1','y1','x2','y2'
  ]);
  const DANGEROUS_ATTR = /^on|^javascript/i;
  const DANGEROUS_URL  = /^(javascript|vbscript|data):/i;

  window._sanitize = function(dirty) {
    if (typeof dirty !== 'string' || !dirty.trim()) return dirty || '';
    if (!/<[a-z]/i.test(dirty)) return dirty; // plain text, fast path
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = dirty;
      const toRemove = [];
      const walk = function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          if (!SAFE_TAGS.has(tag)) { toRemove.push(node); return; }
          for (const attr of [...node.attributes]) {
            const n = attr.name.toLowerCase();
            const v = attr.value;
            if (DANGEROUS_ATTR.test(n)) { node.removeAttribute(attr.name); continue; }
            if (!SAFE_ATTRS.has(n) && !n.startsWith('data-') && !n.startsWith('aria-'))
              { node.removeAttribute(attr.name); continue; }
            if ((n==='href'||n==='src'||n==='action') && DANGEROUS_URL.test(v))
              node.removeAttribute(attr.name);
          }
        }
        node.childNodes.forEach(walk);
      };
      walk(tmp);
      toRemove.forEach(n => n.parentNode && n.parentNode.removeChild(n));
      return tmp.innerHTML;
    } catch(e) {
      return dirty.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  };

  window._setHTML = function(el, html) { if (el) el.innerHTML = window._sanitize(html); };

  // FIX-SEC-5: Added backtick to _escapeHtml — missing it allows template-literal injection
  // if user-controlled data flows into a template literal that is then set as innerHTML.
  window._escapeHtml = window._escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  };

  if (window.__PROCODE_DEBUG__) console.info('[ProCode Security] HTML Sanitizer active. Use _sanitize(html) or _setHTML(el,html).');
})();

// FIX-RUNTIME-1: Expose _sanitize as a true global function so that bare calls to
// _sanitize() work in any script scope, not just those that can see window._sanitize.
// All existing code uses bare `_sanitize(...)` — this single alias fixes all of them.
function _sanitize(html) { return window._sanitize ? window._sanitize(html) : String(html).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _setHTML(el, html) { if (el) el.innerHTML = _sanitize(html); }

/* ── performance.memory cross-browser polyfill (hoisted) ────────────────────
   FIX-RUNTIME-2: __getPerfMemory was defined at line ~53000 but first called
   at line ~17200. Moved here so all call sites see the function at parse time.
   ─────────────────────────────────────────────────────────────────────────── */
window.__getPerfMemory = (function() {
  // Check once at startup whether the API is available
  const supported = typeof performance !== 'undefined' && !!performance.memory;
  return function() {
    if (!supported) return null;
    try {
      return performance.memory;
    } catch(e) {
      return null;
    }
  };
})();

/* ── API Key Obfuscation (P2) ──────────────────────────────────────────────
   XOR-based obfuscation: not encryption, but prevents casual shoulder-surf
   and accidental serialisation into JSON snapshots.
   Key is stored as hex-encoded XOR with a fingerprint seed.
   sessionStorage mirrors plaintext ONLY for current tab lifecycle.
   ─────────────────────────────────────────────────────────────────────────── */
(function() {
  const _SEED = (() => {
    // FIX-3: Replace public-info fingerprint with a cryptographically random seed.
    // The old seed was derived from navigator.userAgent + language + colorDepth —
    // all publicly readable values that provide zero security.
    // New seed: 32-bit random uint stored in sessionStorage for tab lifetime.
    // This prevents casual extraction of the obfuscated key by anyone who knows the
    // fingerprint formula (which was embedded in the source).
    const SEED_KEY = '__procode_xor_seed_v2__';
    try {
      let stored = sessionStorage.getItem(SEED_KEY);
      if (!stored) {
        const buf = crypto.getRandomValues(new Uint32Array(1));
        stored = String(buf[0]);
        sessionStorage.setItem(SEED_KEY, stored);
      }
      return parseInt(stored, 10) || 0x1337cafe;
    } catch(e) {
      // Fallback if sessionStorage unavailable (private mode etc.)
      return (crypto.getRandomValues(new Uint32Array(1))[0]) || 0x1337cafe;
    }
  })();

  function _xorKey(str) {
    let out = '', seed = _SEED;
    for (let i = 0; i < str.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      out += String.fromCharCode(str.charCodeAt(i) ^ (seed & 0xff));
    }
    return out;
  }
  function _toHex(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
  }
  function _fromHex(hex) {
    let out = '';
    for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i,i+2),16));
    return out;
  }

  // FIX-SEC-1: In-memory cache replaces plaintext sessionStorage.
  // sessionStorage is readable by any extension with storage permission — never store plaintext key there.
  let _memKeyCache = null;

  window.__apiKey = {
    save(key) {
      try {
        if (key) {
          const obf = _toHex(_xorKey(key));
          localStorage.setItem('procode_ai_apikey_v2', obf);
          localStorage.removeItem('procode_ai_apikey'); // Remove plaintext legacy
          // FIX: store in memory only, never plaintext in sessionStorage
          _memKeyCache = key;
          sessionStorage.removeItem('procode_ai_apikey_sess'); // Clean up old plaintext
        } else {
          localStorage.removeItem('procode_ai_apikey_v2');
          localStorage.removeItem('procode_ai_apikey');
          sessionStorage.removeItem('procode_ai_apikey_sess');
          _memKeyCache = null;
        }
      } catch(e) { console.error('[ProCode] API key save failed:', e); }
    },
    load() {
      try {
        // 1. In-memory cache (fastest, never touches storage)
        if (_memKeyCache) return _memKeyCache;
        // 2. Obfuscated localStorage (v2)
        const obf = localStorage.getItem('procode_ai_apikey_v2');
        if (obf) {
          const key = _xorKey(_fromHex(obf));
          _memKeyCache = key; // Cache in memory only
          return key;
        }
        // 3. Legacy plaintext fallback + migrate
        const legacy = localStorage.getItem('procode_ai_apikey');
        if (legacy) {
          this.save(legacy); // Migrate to obfuscated
          return legacy;
        }
      } catch(e) { console.error('[ProCode] API key load failed:', e); }
      return '';
    }
  };
})(); // closes XOR obfuscation IIFE

/* ── Anthropic API Constants ────────────────────────────────────────────
   FIX-API-1: Centralize API version. Previously hardcoded at 4+ locations —
   updating required manual edits in each place, easy to miss one.
   Update ANTHROPIC_API_VERSION here to upgrade all fetch() calls at once.
   ──────────────────────────────────────────────────────────────────────── */
window.ANTHROPIC_API_VERSION = '2023-06-01';
// TODO: Update to a newer stable version when Anthropic publishes one.
// See: https://docs.anthropic.com/en/api/versioning