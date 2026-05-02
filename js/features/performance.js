/**
 * performance.js
 * Performance monitoring — v14 perf profiler, memory tracking
 * ProCode IDE v3.0
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   PISTON API CLIENT
   Default endpoint: https://piston-production-d148.up.railway.app/api/v2/execute
     (user-supplied self-hosted Piston instance, switched in v3.1.4 because
      the previous ccb3.up.railway.app deployment stopped responding and
      emkc.org enabled an IP whitelist on 2026-02-15)
   Free · No auth · Supports 100+ languages
══════════════════════════════════════════════════════════════════ */
const PistonAPI = (function() {

  /* ────────────────────────────────────────────────────────────────
     ENDPOINT RESOLUTION (v3.1.4, Apr 2026)
     Switched the default to a fresh self-hosted Piston on Railway
     (piston-production-d148) using the standard /api/v2/execute path.
     The old ccb3 deployment + emkc.org are kept as last-ditch fallbacks
     so the IDE keeps trying if the new instance is asleep / 5xx.
       - localStorage.procode_piston_endpoint overrides everything
       - localStorage.procode_piston_use_proxy=1 wraps via CORS proxies
  ──────────────────────────────────────────────────────────────── */
  const DEFAULT_ENDPOINTS = [
    'https://piston-production-d148.up.railway.app/api/v2/execute',
    'https://piston-production-d148.up.railway.app/api/v2/piston/execute',
  ];
  // CORS proxies used as auto-fallback when a direct request fails with
  // a CORS / network error (browser cannot read the response).  Each entry
  // is { wrap(url) } so each proxy can use its own URL format.
  const CORS_PROXIES = [
    { name: 'corsproxy.io',  wrap: u => 'https://corsproxy.io/?' + encodeURIComponent(u) },
    { name: 'allorigins',    wrap: u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u) },
    { name: 'cors.eu.org',   wrap: u => 'https://cors.eu.org/' + u },
  ];
  function _useProxy() {
    try { return localStorage.getItem('procode_piston_use_proxy') === '1'; } catch(_) { return false; }
  }
  function _wrapAll(url) { return CORS_PROXIES.map(p => p.wrap(url)); }
  function _endpoints() {
    const custom = (() => {
      try { return localStorage.getItem('procode_piston_endpoint') || ''; } catch(_) { return ''; }
    })();
    const base = custom ? [custom, ...DEFAULT_ENDPOINTS] : DEFAULT_ENDPOINTS.slice();
    const proxied = [];
    for (const url of base) proxied.push(..._wrapAll(url));
    // FIX-CORS-AUTO (v3.1.3): always include proxied versions as a silent
    // last-resort fallback so a self-hosted Piston without CORS headers
    // still works without forcing the user to flip a toggle.  When the
    // user explicitly opts in we put proxied versions first so they get
    // the working path immediately.
    if (_useProxy()) return [...proxied, ...base];
    return [...base, ...proxied];
  }
  // Backwards-compat: many helpers read PistonAPI.ENDPOINT for log strings
  const ENDPOINT = DEFAULT_ENDPOINTS[0];
  const TIMEOUT  = 30_000; // 30s — compiled langs can be slow

  // Cache the first endpoint that worked this session so we don't retry
  // dead ones on every run.
  let _activeEndpoint = null;

  /* ────────────────────────────────────────────────────────────────
     PISTON LANGUAGE CATALOG  v32 — MAX EDITION
     Supports 50+ real, executable languages from /api/v2/piston
     Each entry: { language, version, fileName(name)→string, label,
                    icon, color, preprocess?(code,fileName) }
  ──────────────────────────────────────────────────────────────── */
  const _make = (language, label, icon, color, fileName, extra={}) =>
    Object.assign({ language, version:'*', label, icon, color, fileName }, extra);

  const LANG_CONFIG = {
    /* ── Systems / Compiled ─────────────────────────────────── */
    c:     _make('c',          'C (GCC)',           '⚙️', '\x1b[38;2;168;185;204m', n => n.endsWith('.c') ? n : 'main.c'),
    h:     _make('c',          'C header',          '⚙️', '\x1b[38;2;168;185;204m', n => 'main.c'),
    cpp:   _make('c++',        'C++ (G++)',         '⚙️', '\x1b[38;2;0;150;220m',   n => /\.(cpp|cc|cxx)$/.test(n) ? n : 'main.cpp'),
    cc:    _make('c++',        'C++',               '⚙️', '\x1b[38;2;0;150;220m',   n => 'main.cpp'),
    cxx:   _make('c++',        'C++',               '⚙️', '\x1b[38;2;0;150;220m',   n => 'main.cpp'),
    hpp:   _make('c++',        'C++ header',        '⚙️', '\x1b[38;2;0;150;220m',   n => 'main.cpp'),
    cs:    _make('csharp',     'C# (Mono)',         '🟢', '\x1b[38;2;35;145;32m',   n => n.endsWith('.cs') ? n : 'Main.cs'),
    java:  _make('java',       'Java (OpenJDK)',    '☕', '\x1b[38;2;231;111;0m',   n => /^[A-Z][a-zA-Z0-9]*\.java$/.test(n) ? n : 'Main.java', {
      preprocess: (code, fileName) => {
        const m = code.match(/public\s+class\s+(\w+)/);
        return m ? { code, fileName: m[1] + '.java' } : { code, fileName };
      }
    }),
    rs:    _make('rust',       'Rust (rustc)',      '🦀', '\x1b[38;2;222;165;132m', n => n.endsWith('.rs') ? n : 'main.rs'),
    go:    _make('go',         'Go',                '🐹', '\x1b[38;2;0;173;216m',   n => 'main.go'),
    swift: _make('swift',      'Swift',             '🐦', '\x1b[38;2;250;115;67m',  n => n),
    kt:    _make('kotlin',     'Kotlin',            '💠', '\x1b[38;2;241;142;51m',  n => n.endsWith('.kt') ? n : 'Main.kt'),
    kts:   _make('kotlin',     'Kotlin Script',     '💠', '\x1b[38;2;241;142;51m',  n => 'Main.kt'),
    scala: _make('scala',      'Scala',             '🔴', '\x1b[38;2;220;50;47m',   n => n),
    dart:  _make('dart',       'Dart',              '🎯', '\x1b[38;2;1;117;194m',   n => n),
    zig:   _make('zig',        'Zig',               '⚡', '\x1b[38;2;247;122;29m',  n => n),
    nim:   _make('nim',        'Nim',               '👑', '\x1b[38;2;255;199;71m',  n => n),
    cr:    _make('crystal',    'Crystal',           '💎', '\x1b[38;2;0;0;0m',       n => n),
    d:     _make('d',          'D (DMD)',           '🔴', '\x1b[38;2;176;33;43m',   n => n),
    vlang: _make('vlang',      'V',                 '🔵', '\x1b[38;2;83;106;160m',  n => 'main.v'),
    v:     _make('vlang',      'V',                 '🔵', '\x1b[38;2;83;106;160m',  n => 'main.v'),
    pas:   _make('pascal',     'Pascal (FPC)',      '📘', '\x1b[38;2;227;179;66m',  n => 'main.pas'),
    pp:    _make('pascal',     'Pascal',            '📘', '\x1b[38;2;227;179;66m',  n => 'main.pas'),
    f90:   _make('fortran',    'Fortran 90',        '🧮', '\x1b[38;2;115;75;161m',  n => 'main.f90'),
    f95:   _make('fortran',    'Fortran 95',        '🧮', '\x1b[38;2;115;75;161m',  n => 'main.f95'),
    f:     _make('fortran',    'Fortran',           '🧮', '\x1b[38;2;115;75;161m',  n => 'main.f90'),

    /* ── Scripting / Dynamic ──────────────────────────��─────── */
    py:    _make('python',     'Python (Piston)',   '🐍', '\x1b[38;2;59;130;246m',  n => n),
    py2:   _make('python2',    'Python 2',          '🐍', '\x1b[38;2;59;130;246m',  n => 'main.py'),
    rb:    _make('ruby',       'Ruby',              '💎', '\x1b[38;2;204;52;45m',   n => n),
    php:   _make('php',        'PHP',               '🐘', '\x1b[38;2;119;123;180m', n => n.endsWith('.php') ? n : 'main.php'),
    pl:    _make('perl',       'Perl',              '🐪', '\x1b[38;2;39;46;113m',   n => n),
    pm:    _make('perl',       'Perl module',       '🐪', '\x1b[38;2;39;46;113m',   n => 'main.pl'),
    raku:  _make('raku',       'Raku',              '🦋', '\x1b[38;2;255;0;120m',   n => 'main.raku'),
    p6:    _make('raku',       'Perl 6',            '🦋', '\x1b[38;2;255;0;120m',   n => 'main.raku'),
    lua:   _make('lua',        'Lua (Piston)',      '🌙', '\x1b[38;2;0;112;255m',   n => n),
    r:     _make('rscript',    'R',                 '📊', '\x1b[38;2;39;109;195m',  n => 'main.r'),
    rmd:   _make('rscript',    'R Markdown',        '📊', '\x1b[38;2;39;109;195m',  n => 'main.r'),
    jl:    _make('julia',      'Julia',             '🔵', '\x1b[38;2;156;105;156m', n => n),
    awk:   _make('awk',        'AWK',               '📜', '\x1b[38;2;200;200;0m',   n => 'main.awk'),
    tcl:   _make('tcl',        'Tcl',               '⚓', '\x1b[38;2;82;0;82m',     n => 'main.tcl'),

    /* ── Functional ─────────────────────────────────────────── */
    hs:    _make('haskell',    'Haskell (GHC)',     '🎓', '\x1b[38;2;94;80;134m',   n => 'main.hs'),
    lhs:   _make('haskell',    'Literate Haskell',  '🎓', '\x1b[38;2;94;80;134m',   n => 'main.hs'),
    ml:    _make('ocaml',      'OCaml',             '🟠', '\x1b[38;2;238;101;15m',  n => 'main.ml'),
    fs:    _make('fsi',        'F# Interactive',    '🔷', '\x1b[38;2;55;139;186m',  n => 'main.fs'),
    fsx:   _make('fsi',        'F# script',         '🔷', '\x1b[38;2;55;139;186m',  n => 'main.fsx'),
    ex:    _make('elixir',     'Elixir',            '💎', '\x1b[38;2;77;47;107m',   n => 'main.ex'),
    exs:   _make('elixir',     'Elixir script',     '💜', '\x1b[38;2;77;47;107m',   n => 'main.exs'),
    erl:   _make('erlang',     'Erlang (escript)',  '🔴', '\x1b[38;2;164;33;47m',   n => 'main.erl'),
    clj:   _make('clojure',    'Clojure',           '🟢', '\x1b[38;2;91;164;72m',   n => 'main.clj'),
    cljs:  _make('clojure',    'ClojureScript',     '🟢', '\x1b[38;2;91;164;72m',   n => 'main.clj'),
    rkt:   _make('racket',     'Racket',            '🔴', '\x1b[38;2;120;52;120m',  n => 'main.rkt'),
    scm:   _make('racket',     'Scheme',            '🟣', '\x1b[38;2;120;52;120m',  n => 'main.rkt'),
    lisp:  _make('lisp',       'Common Lisp',       '🟪', '\x1b[38;2;160;100;180m', n => 'main.lisp'),
    cl:    _make('lisp',       'Common Lisp',       '🟪', '\x1b[38;2;160;100;180m', n => 'main.lisp'),
    st:    _make('smalltalk',  'Smalltalk',         '💬', '\x1b[38;2;100;130;180m', n => 'main.st'),

    /* ── Shell / DevOps ─────────────────────────────────────── */
    sh:    _make('bash',       'Bash',              '🐚', '\x1b[38;2;76;175;80m',   n => 'main.sh'),
    bash:  _make('bash',       'Bash',              '🐚', '\x1b[38;2;76;175;80m',   n => 'main.sh'),
    ps1:   _make('powershell', 'PowerShell',        '💙', '\x1b[38;2;1;38;128m',    n => 'main.ps1'),

    /* ── JS family on the server ────────────────────────────── */
    cjs:   _make('javascript', 'Node.js',           '🟨', '\x1b[38;2;241;224;90m',  n => 'main.js'),
    mjs:   _make('javascript', 'Node ESM',          '🟨', '\x1b[38;2;241;224;90m',  n => 'main.mjs'),
    coffee:_make('coffeescript','CoffeeScript (Node)', '☕', '\x1b[38;2;115;87;71m', n => 'main.coffee'),
    deno:  _make('deno',       'Deno TS',           '🦕', '\x1b[38;2;0;0;0m',       n => 'main.ts'),

    /* ── Database ───────────────────────────────────────────── */
    sqlite:_make('sqlite3',    'SQLite 3',          '🗃 ', '\x1b[38;2;0;55;143m',   n => 'main.sql'),

    /* ── Niche / Esoteric / Logic ───────────────────────────── */
    prolog:_make('prolog',     'Prolog (SWI)',      '🔶', '\x1b[38;2;220;100;0m',   n => 'main.pl'),
    plg:   _make('prolog',     'Prolog',            '🦉', '\x1b[38;2;220;100;0m',   n => 'main.pl'),
    cob:   _make('cobol',      'COBOL',             '📜', '\x1b[38;2;120;120;120m', n => 'main.cob'),
    cbl:   _make('cobol',      'COBOL',             '📜', '\x1b[38;2;120;120;120m', n => 'main.cob'),
    bas:   _make('freebasic',  'FreeBASIC',         '🅱️', '\x1b[38;2;0;115;191m',   n => 'main.bas'),
    asm:   _make('nasm',       'NASM x86',          '🛠 ', '\x1b[38;2;128;128;128m', n => 'main.asm'),
    s:     _make('nasm',       'Assembly',          '🛠 ', '\x1b[38;2;128;128;128m', n => 'main.asm'),
    bf:    _make('brainfuck',  'Brainfuck',         '🧠', '\x1b[38;2;200;100;200m', n => 'main.bf'),
    groovy:_make('groovy',     'Groovy',            '⭐', '\x1b[38;2;79;145;192m',  n => 'main.groovy'),
    ts:    _make('typescript', 'TypeScript (Node)', '🔷', '\x1b[38;2;49;120;198m',  n => 'main.ts'),
  };

  async function execute(lang, code, fileName, stdinText = '') {
    const cfg = LANG_CONFIG[lang];
    if (!cfg) throw new Error(`Language '${lang}' not supported by Piston`);

    let finalCode = code;
    let finalFileName = cfg.fileName(fileName);

    // Language-specific preprocessing
    if (cfg.preprocess) {
      const result = cfg.preprocess(code, finalFileName);
      finalCode    = result.code;
      finalFileName = result.fileName;
    }

    const body = {
      language: cfg.language,
      version: cfg.version,
      files: [{ name: finalFileName, content: finalCode }],
      stdin: stdinText,
      args: [],
      compile_timeout: 10000,
      run_timeout: 5000,
    };

    // Try cached endpoint first, then fall back through the list.
    const tryOrder = _activeEndpoint
      ? [_activeEndpoint, ..._endpoints().filter(u => u !== _activeEndpoint)]
      : _endpoints();

    let last401  = null;
    let last5xx  = null;
    let lastErr  = null;
    let sawCors  = false;

    for (const url of tryOrder) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (resp.status === 401 || resp.status === 403) {
          last401 = { url, status: resp.status };
          continue;
        }
        if (resp.status === 502 || resp.status === 503 || resp.status === 504) {
          // Read body so the error message can include Railway's request id
          // ("Application failed to respond" / "x-railway-fallback: true").
          let snippet = '';
          try { snippet = (await resp.text()).slice(0, 180); } catch(_) {}
          last5xx = { url, status: resp.status, snippet };
          lastErr = new Error(`Piston ${resp.status} on ${url}: ${snippet}`);
          continue;
        }
        if (!resp.ok) {
          const errText = await resp.text();
          lastErr = new Error(`Piston API error ${resp.status} (${url}): ${errText.slice(0, 200)}`);
          continue;
        }

        _activeEndpoint = url;
        return await resp.json();
      } catch(e) {
        clearTimeout(timer);
        if (e.name === 'AbortError') {
          lastErr = new Error('Request timed out (30s) on ' + url);
        } else {
          lastErr = e;
          if (e instanceof TypeError) sawCors = true;
        }
      }
    }

    // If we hit a CORS-style failure but proxy toggle is off, persist it so
    // future runs skip the doomed direct call.
    if (sawCors && !_useProxy()) {
      try { localStorage.setItem('procode_piston_use_proxy', '1'); } catch(_) {}
      // Surface the auto-enable in the console so the user isn't surprised
      console.info('[Piston] CORS failure detected — auto-enabled CORS proxy fallback. Run `piston use-proxy off` to disable.');
    }

    // All endpoints exhausted — produce a friendly, actionable error.
    // Order of checks matters: 5xx beats 401 because a self-hosted Piston
    // returning 502 is far more useful diagnostic than "all mirrors gave 401".
    if (last5xx) {
      const e = new Error(
        `Piston server returned HTTP ${last5xx.status} ` +
        `(${last5xx.url.includes('railway') ? 'Railway container not responding' : 'mirror down'}). ` +
        `Body: ${last5xx.snippet || '(empty)'}`
      );
      e.code = 'PISTON_SERVER_DOWN';
      e.status = last5xx.status;
      e.url = last5xx.url;
      throw e;
    }
    if (last401) {
      const e = new Error(
        `Piston rejected the request (HTTP ${last401.status}). ` +
        `All endpoints tried.  emkc.org is whitelist-only since 2026-02-15; ` +
        `if you\u2019re using a self-hosted instance check its auth config.`
      );
      e.code = 'PISTON_UNAUTHORIZED';
      throw e;
    }
    if (sawCors) {
      const e = new Error(
        'Browser blocked the request via CORS preflight.  Self-hosted Piston ' +
        'must send Access-Control-Allow-Origin: * (use a Caddy/nginx reverse ' +
        'proxy or set PISTON_CORS_ORIGINS=*).  Try `piston use-proxy on` to ' +
        'fall back through corsproxy.io.'
      );
      e.code = 'PISTON_CORS_BLOCKED';
      throw e;
    }
    throw lastErr || new Error('Could not reach any Piston endpoint');
  }

  function isSupported(ext) {
    return ext in LANG_CONFIG;
  }

  // FIX-PISTON-UI: expose _activeEndpoint so Settings UI and terminal `piston status` can read/reset it
  // FIX-SCOPE (v3.1.5): expose _useProxy so terminal patches outside this IIFE can call it
  //   without causing ReferenceError.  The underlying localStorage read is the same function.
  return { execute, isSupported, LANG_CONFIG, ENDPOINT,
    get _activeEndpoint() { return _activeEndpoint; },
    set _activeEndpoint(v) { _activeEndpoint = v; },
    useProxy: _useProxy,
  };
})();
/* Expose globally so terminal patches, F5 runner, and language list helpers
   can read the catalog without depending on script-evaluation order. */
window.PistonAPI = PistonAPI;

/* ══════════════════════════════════════════════════════════════════
   OUTPUT FORMATTER — turn Piston response into coloured terminal output
══════════════════════════════════════════════════════════════════ */
function formatPistonOutput(result, cfg, write) {
  const W   = s => write(s);
  const WL  = s => write(s + '\r\n');
  const C   = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    green:  '\x1b[38;2;74;222;128m',
    yellow: '\x1b[38;2;251;191;36m',
    red:    '\x1b[38;2;248;113;113m',
    gray:   '\x1b[38;2;100;100;160m',
    white:  '\x1b[38;2;232;232;255m',
  };

  // Compile phase
  const compile = result.compile;
  if (compile) {
    if (compile.output && compile.output.trim()) {
      WL(`${C.yellow}── Compiler output ──${C.reset}`);
      compile.output.split('\n').forEach(l => {
        if (!l.trim()) return;
        // Detect error vs warning
        if (/error:/i.test(l))   WL(`${C.red}${l}${C.reset}`);
        else if (/warning:/i.test(l)) WL(`${C.yellow}${l}${C.reset}`);
        else if (/note:/i.test(l))    WL(`${C.dim}${l}${C.reset}`);
        else WL(`${C.gray}${l}${C.reset}`);
      });
    }
    if (compile.code != null && compile.code !== 0) {
      WL('');
      WL(`${C.red}✗ Compilation failed (exit ${compile.code})${C.reset}`);
      return;
    }
    if (compile.output && compile.output.trim()) {
      WL(`${C.green}✓ Compiled successfully${C.reset}`);
      WL(`${C.gray}${'─'.repeat(44)}${C.reset}`);
    }
  }

  // Run phase
  const run = result.run;
  if (run) {
    // Normalise line endings: Piston sometimes emits bare \r before \n which
    // confuses xterm's cursor and causes double-blank lines.
    const normStdout = (run.stdout || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const normStderr = (run.stderr || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normStdout.trim()) {
      normStdout.split('\n').forEach(l => WL(`${C.white}${l}${C.reset}`));
    }
    if (normStderr.trim()) {
      WL(`${C.gray}── stderr ──${C.reset}`);
      normStderr.split('\n').forEach(l => {
        if (l.trim()) WL(`${C.red}${l}${C.reset}`);
      });
    }
    if (!normStdout.trim() && !normStderr.trim()) {
      WL(`${C.dim}(no output)${C.reset}`);
    }
    WL('');
    if (run.code === 0) {
      WL(`${C.green}✓ Exited with code 0${C.reset}`);
    } else {
      WL(`${C.red}✗ Exited with code ${run.code}${C.reset}`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   MAIN runCompiled() — used by terminal + F5 button
══════════════════════════════════════════════════════════════════ */
async function runCompiled(code, fileName, write, stdinText = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  const cfg = PistonAPI.LANG_CONFIG[ext];

  if (!cfg) {
    write(`\x1b[31mNo Piston config for .${ext}\x1b[0m\r\n`);
    return;
  }

  // FIX-PRIVACY-1: Show a one-time notice that code is sent to a third-party server.
  // Users should know their code leaves the browser before the first run.
  const CONSENT_KEY = 'procode_piston_consent_v1';
  if (!sessionStorage.getItem(CONSENT_KEY)) {
    write('\x1b[33m⚠  Note: Compiled code is sent to a Piston server for execution.\x1b[0m\r\n');
    write('\x1b[38;2;120;120;120m   Do not run code containing secrets or proprietary algorithms.\x1b[0m\r\n');
    write('\x1b[38;2;120;120;120m   (This notice shows once per session.)\x1b[0m\r\n\r\n');
    try { sessionStorage.setItem(CONSENT_KEY, '1'); } catch(_) {}
  }

  // Header
  write(`\r\n${cfg.color}\x1b[1m${cfg.icon} ${cfg.label}\x1b[0m \x1b[38;2;72;72;112m▸\x1b[0m \x1b[38;2;232;232;255m${fileName}\x1b[0m\r\n`);
  write(`\x1b[38;2;60;60;120m${'─'.repeat(44)}\x1b[0m\r\n`);

  // Spinner animation while waiting
  const SPIN = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let si = 0;
  let done = false;
  let lastLen = 0;

  function clearSpinner() {
    if (lastLen > 0) {
      write('\r' + ' '.repeat(lastLen) + '\r');
      lastLen = 0;
    }
  }

  const spinnerInterval = setInterval(() => {
    if (done) return;
    clearSpinner();
    const msg = `\x1b[38;2;119;119;200m${SPIN[si++ % SPIN.length]} Compiling & running…\x1b[0m`;
    const visible = '⠋ Compiling & running…';
    lastLen = visible.length;
    write(msg);
  }, 80);

  try {
    const result = await PistonAPI.execute(ext, code, fileName, stdinText);
    done = true;
    clearInterval(spinnerInterval);
    clearSpinner();
    formatPistonOutput(result, cfg, write);
  } catch(e) {
    done = true;
    clearInterval(spinnerInterval);
    clearSpinner();

    // 502/503/504 — server is alive at the edge but the container behind it
    // (Railway / self-hosted) isn't responding.  This is the MOST common
    // failure mode for a fresh self-hosted Piston so we surface it first.
    if (e.code === 'PISTON_SERVER_DOWN') {
      write('\x1b[31m✗ Server Piston trả ' + e.status + ' — container không phản hồi.\x1b[0m\r\n');
      write('\x1b[33m  Endpoint: ' + e.url + '\x1b[0m\r\n');
      if (/railway/i.test(e.url) || /x-railway-fallback/i.test(e.message)) {
        write('\x1b[36m  💡 Railway "Application failed to respond" thường do:\x1b[0m\r\n');
        write('\x1b[37m    1. Container đang khởi động (đợi ~60s rồi thử lại)\x1b[0m\r\n');
        write('\x1b[37m    2. App bind sai port → set\x1b[0m \x1b[32mPISTON_BIND_ADDR=0.0.0.0:$PORT\x1b[0m\r\n');
        write('\x1b[37m    3. Crash loop → xem tab Deployments → View Logs\x1b[0m\r\n');
        write('\x1b[37m    4. Chưa cài runtime → POST\x1b[0m \x1b[32m/api/v2/packages\x1b[0m\r\n');
      } else {
        write('\x1b[36m  💡 Server đang ngủ / restart. Đợi 30–60s rồi thử lại.\x1b[0m\r\n');
      }
      write('\x1b[36m  💡 Test endpoint nhanh:\x1b[0m \x1b[32mpiston ping\x1b[0m\r\n');
    }
    // CORS preflight blocked
    else if (e.code === 'PISTON_CORS_BLOCKED') {
      write('\x1b[31m✗ Trình duyệt block CORS preflight.\x1b[0m\r\n');
      write('\x1b[33m  Server self-host không trả header Access-Control-Allow-Origin.\x1b[0m\r\n');
      write('\x1b[36m  💡 Fix tận gốc: thêm Caddy/nginx trước Piston:\x1b[0m\r\n');
      write('\x1b[37m     header { Access-Control-Allow-Origin "*" }\x1b[0m\r\n');
      write('\x1b[36m  💡 Workaround: bật proxy fallback:\x1b[0m \x1b[32mpiston use-proxy on\x1b[0m\r\n');
    }
    // 401 / whitelist
    else if (e.code === 'PISTON_UNAUTHORIZED' || /\b401\b/.test(e.message) || /whitelist/i.test(e.message)) {
      write('\x1b[31m✗ Mọi endpoint Piston đều trả 401.\x1b[0m\r\n');
      write('\x1b[33m  emkc.org bật whitelist từ 2026-02-15.\x1b[0m\r\n');
      write('\x1b[36m  💡 Đổi sang endpoint riêng:\x1b[0m \x1b[32mpiston set-endpoint <url>\x1b[0m\r\n');
      write('\x1b[36m  💡 Xem trạng thái:\x1b[0m \x1b[32mpiston status\x1b[0m\r\n');
    }
    // Generic network error
    else if (e instanceof TypeError || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      write('\x1b[31m✗ Bị chặn CORS / network khi gọi Piston.\x1b[0m\r\n');
      write('\x1b[33m  Server self-host không trả header Access-Control-Allow-Origin.\x1b[0m\r\n');
      write('\x1b[36m  💡 Fix trên Piston: bind container làm image\x1b[0m \x1b[32mghcr.io/engineer-man/piston\x1b[0m\r\n');
      write('\x1b[36m     và expose port qua Railway, tạm bật proxy fallback:\x1b[0m \x1b[32mpiston use-proxy on\x1b[0m\r\n');
      write('\x1b[90m  Active endpoint: ' + (PistonAPI._activeEndpoint || PistonAPI.ENDPOINT) + '\x1b[0m\r\n');
    } else {
      write(`\x1b[31m✗ Error: ${e.message}\x1b[0m\r\n`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   PATCH LangEngine — override local runners with Piston
═══════════════════════════════════════════════��══════════════════ */
(function patchLangEngine() {
  if (!window.LangEngine) return setTimeout(patchLangEngine, 500);

  // Override .run() to intercept compiled languages
  const _origRun = LangEngine.run.bind(LangEngine);
  LangEngine.run = async function(code, fileName, write) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (PistonAPI.isSupported(ext)) {
      return runCompiled(code, fileName, write);
    }
    return _origRun(code, fileName, write);
  };

  // Expose runCompiled
  LangEngine.runCompiled = runCompiled;

  console.log('%c[Piston] LangEngine.run patched for compiled languages', 'color:#fb923c;font-weight:bold');
})();

/* ══════════════════════════════════════════════════════════��═══════
   PATCH TERMINAL MANAGER executeCommand
   Add: c, cpp, cs, java, rs  → runCompiled via Piston
═══════════════���══════════════════════════════════════════════════ */
(function patchTerminalForCompiled() {
  function waitAndPatch() {
    if (!window.TerminalManager) return setTimeout(waitAndPatch, 500);
    const TM = window.TerminalManager;

    const _origExec = TM.executeCommand.bind(TM);

    TM.executeCommand = function(terminalId, input) {
      const t = TM.terminals[terminalId];
      if (!t) return;
      const write  = s => t.instance.write(s);
      const writeln= s => write(s + '\r\n');

      const trimmed = input.trim();
      if (!trimmed) { TM.writePrompt(terminalId); return; }

      const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const cmd   = parts[0].toLowerCase();
      const args  = parts.slice(1).map(a => a.replace(/^["']|["']$/g, ''));

      /* ── Compiled language commands ── */
      const COMPILED_CMDS = {
        // C
        'cc':      'c',   'gcc':    'c',   'clang':  'c',
        // C++
        'c++':     'cpp', 'g++':    'cpp', 'clang++':'cpp',
        'cpp':     'cpp',
        // C#
        'csharp':  'cs',  'dotnet': 'cs',  'mcs':    'cs',   'mono': 'cs',
        // Java
        'java':    'java','javac':  'java',
        // Rust
        'rust':    'rs',  'rustc':  'rs',  'cargo':  'rs',
        // Go
        'go':      'go',
        // Swift
        'swift':   'swift',
        // Kotlin
        'kotlin':  'kt',  'kotlinc':'kt',
        // Scala
        'scala':   'scala',
        // Dart
        'dart':    'dart',
        // Zig
        'zig':     'zig',
        // Ruby
        'ruby':    'rb',  'ruby3':  'rb',
        // PHP
        'php':     'php',
        // R
        'r':       'r',   'rscript':'r',
      };

      /* ── piston runner control ───────────────────────────────────── */
      if (cmd === 'piston') {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'status' || !sub) {
          const ep = (function(){ try { return localStorage.getItem('procode_piston_endpoint') || ''; } catch(_){ return ''; }})();
          // FIX-SCOPE (v3.1.5): was _useProxy() — ReferenceError outside PistonAPI IIFE
          const proxy = PistonAPI.useProxy();
          const active = (window.PistonAPI && PistonAPI._activeEndpoint) || '(none yet)';
          writeln('\x1b[36m── Piston runner status ──\x1b[0m');
          // FIX-SCOPE (v3.1.5): was bare ENDPOINT — ReferenceError outside PistonAPI IIFE
          writeln('  default endpoint  : ' + PistonAPI.ENDPOINT);
          writeln('  fallback endpoints: https://piston-production-ccb3.up.railway.app/api/v2/piston/execute,');
          writeln('                      https://emkc.org/api/v2/piston/execute');
          writeln('  custom endpoint   : ' + (ep || '(unset)'));
          writeln('  use CORS proxy    : ' + (proxy ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'));
          writeln('  last working URL  : ' + active);
          writeln('  commands: piston status | ping | use-proxy on|off | set-endpoint <url> | clear-endpoint | reset-cache');
        } else if (sub === 'ping') {
          // Hit each endpoint with a tiny POST and report status / latency.
          // Bypasses CORS surprises by doing a direct fetch and reading
          // ok / status / type — same code paths the runner uses.
          const pingCustomEp = (function(){ try { return localStorage.getItem('procode_piston_endpoint') || ''; } catch(_){ return ''; }})();
          // FIX-SCOPE (v3.1.5): was _useProxy() — ReferenceError outside PistonAPI IIFE
          const proxyOn = PistonAPI.useProxy();
          // FIX-SCOPE (v3.1.5): was bare ENDPOINT — ReferenceError outside PistonAPI IIFE
          const direct = pingCustomEp
            ? [pingCustomEp, PistonAPI.ENDPOINT, 'https://piston-production-ccb3.up.railway.app/api/v2/piston/execute', 'https://emkc.org/api/v2/piston/execute']
            : [PistonAPI.ENDPOINT, 'https://piston-production-ccb3.up.railway.app/api/v2/piston/execute', 'https://emkc.org/api/v2/piston/execute'];
          const proxied = direct.flatMap(u => [
            'https://corsproxy.io/?' + encodeURIComponent(u),
            'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
            // FIX-DUPLICATE (v3.1.5): cors.eu.org was listed twice — removed duplicate entry
            'https://cors.eu.org/' + u,
          ]);
          const targets = proxyOn ? [...proxied, ...direct] : [...direct, ...proxied];
          writeln('\x1b[36m── pinging ' + targets.length + ' endpoints ──\x1b[0m');
          const body = JSON.stringify({ language: 'python', version: '*', files: [{ name:'a.py', content:'print(1)' }] });
          (async () => {
            for (const url of targets) {
              const t0 = performance.now();
              const c  = new AbortController();
              const tm = setTimeout(() => c.abort(), 12000);
              const tag = url.length > 70 ? url.slice(0, 67) + '...' : url;
              try {
                const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body, signal:c.signal });
                clearTimeout(tm);
                const dt = (performance.now() - t0).toFixed(0);
                const colour = r.ok ? '\x1b[32m' : (r.status >= 500 ? '\x1b[31m' : '\x1b[33m');
                writeln(`  ${colour}${r.status}\x1b[0m  ${dt}ms  ${tag}`);
                if (r.ok) {
                  try {
                    const j = await r.json();
                    if (j && j.run && j.run.stdout) writeln('         \x1b[2m→ ' + j.run.stdout.trim().slice(0, 50) + '\x1b[0m');
                  } catch(_) {}
                }
              } catch(e) {
                clearTimeout(tm);
                const dt = (performance.now() - t0).toFixed(0);
                const reason = e.name === 'AbortError' ? 'timeout' : (e instanceof TypeError ? 'CORS / network' : e.message.slice(0,40));
                writeln(`  \x1b[31mERR\x1b[0m  ${dt}ms  ${tag}  \x1b[2m(${reason})\x1b[0m`);
              }
            }
            TM.writePrompt(terminalId);
          })();
          return; // async branch handles its own prompt
        } else if (sub === 'use-proxy') {
          const v = (args[1] || '').toLowerCase();
          if (v === 'on') {
            try { localStorage.setItem('procode_piston_use_proxy', '1'); } catch(_){}
            writeln('\x1b[32m✓ CORS proxy enabled (corsproxy.io / allorigins / cors.eu.org).\x1b[0m');
            writeln('\x1b[2m  next run will tunnel through the proxy first.\x1b[0m');
          } else if (v === 'off') {
            try { localStorage.removeItem('procode_piston_use_proxy'); } catch(_){}
            writeln('\x1b[32m✓ CORS proxy disabled.\x1b[0m');
          } else {
            writeln('\x1b[33musage:\x1b[0m piston use-proxy on|off');
          }
        } else if (sub === 'set-endpoint') {
          const url = args[1] || '';
          if (!url) { writeln('\x1b[33musage:\x1b[0m piston set-endpoint <url>'); }
          else { try { localStorage.setItem('procode_piston_endpoint', url); } catch(_){}; writeln('\x1b[32m✓ custom endpoint saved.\x1b[0m'); }
        } else if (sub === 'clear-endpoint') {
          try { localStorage.removeItem('procode_piston_endpoint'); } catch(_){}
          writeln('\x1b[32m✓ custom endpoint cleared.\x1b[0m');
        } else if (sub === 'reset-cache') {
          // UPGRADE (v3.1.5): new sub-command — clears the in-memory cached active
          // endpoint so the runner retries all endpoints on the next execution.
          if (window.PistonAPI) PistonAPI._activeEndpoint = null;
          writeln('\x1b[32m✓ Active endpoint cache cleared — next run will re-probe all endpoints.\x1b[0m');
        } else {
          writeln('\x1b[33musage:\x1b[0m piston status | ping | use-proxy on|off | set-endpoint <url> | clear-endpoint | reset-cache');
        }
        TM.writePrompt(terminalId);
        return;
      }

      if (COMPILED_CMDS[cmd] !== undefined) {
        const targetExt = COMPILED_CMDS[cmd];
        const fileArg   = args[0];

        if (!fileArg) {
          writeln(`\x1b[33m⚠ Usage: ${cmd} <file.${targetExt}>\x1b[0m`);
          TM.writePrompt(terminalId);
          return;
        }

        // Resolve file path
        const fp   = _resolveTermFile?.(terminalId, fileArg) || fileArg;
        const code = window.IDE?.state?.files?.[fp];

        if (code === undefined) {
          writeln(`\x1b[31m${cmd}: ${fileArg}: No such file or directory\x1b[0m`);
          TM.writePrompt(terminalId);
          return;
        }

        t.isProcessing = true;

        // FIX-PROCESSING (v3.1.5): use .finally() so isProcessing is always reset,
        // even when runCompiled() rejects — previously a throw left the terminal stuck.
        runCompiled(code, fileArg, write).finally(() => {
          TM.writePrompt(terminalId);
          t.isProcessing = false;
        });
        return; // async
      }

      // Not a compiled cmd — delegate
      return _origExec(terminalId, input);
    };

    /* ── Update autocomplete ── */
    const _origSugg = TM.getCommandSuggestions.bind(TM);
    TM.getCommandSuggestions = function(input) {
      const compiledCmds = ['gcc','g++','clang','clang++','cc','c++','mcs','dotnet','mono',
        'java','javac','rustc','cargo','rust','go','swift','kotlin','kotlinc','scala','dart',
        'zig','ruby','ruby3','php','r','rscript'];
      const base = _origSugg(input);
      return [...new Set([...base, ...compiledCmds])].filter(s => s.startsWith(input.toLowerCase()));
    };

    console.log('%c[Piston] Terminal compiled language commands patched ✅', 'color:#fb923c;font-weight:bold');
  }
  waitAndPatch();
})();

/* ═══════════════════════════════════════════���════���═════════════════
   PATCH Runner.execute — F5 button for compiled langs
══════════════════════════════════════════════════════════════════ */
(function patchRunnerForCompiled() {
  function waitAndPatch() {
    if (!window.Runner) return setTimeout(waitAndPatch, 800);

    /* FIX-PISTON-EXT-1: keep this set in sync with PistonAPI.LANG_CONFIG keys.
       Anything in this Set will trigger F5 → cloud-execute via Piston. */
    const COMPILED_EXTS = new Set(Object.keys(window.PistonAPI?.LANG_CONFIG || {}));

    const _origExecute = Runner.execute.bind(Runner);
    Runner.execute = function(filePath) {
      if (!filePath) filePath = window.IDE?.state?.activeTab;
      if (!filePath) { window.Utils?.toast?.('No file open', 'error'); return; }

      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const fileName = filePath.split('/').pop();

      if (COMPILED_EXTS.has(ext) && PistonAPI.isSupported(ext)) {
        const code = window.FileSystem?.read?.(filePath) ?? window.FS?.read?.(filePath) ?? null;
        if (code === null) { window.Utils?.toast?.(`File not found: ${filePath}`, 'error'); return; }

        // Open terminal
        if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
        else if (window.LayoutManager?.toggleLayout) LayoutManager.toggleLayout('terminal', true);

        setTimeout(async () => {
          const termId = window.TerminalManager?.activeTerminal ?? 'default';
          const t      = window.TerminalManager?.terminals?.[termId];
          if (!t) return;
          const write = s => t.instance.write(s);

          this.updateRunButton?.(true);
          if (window.Console) { Console.clear(); Console.info(`▶ ${fileName}`); }

          await runCompiled(code, fileName, write);

          this.updateRunButton?.(false);
          window.TerminalManager?.writePrompt?.(termId);
        }, 150);
        return;
      }

      return _origExecute(filePath);
    };

    console.log('%c[Piston] Runner.execute patched for F5 compiled languages ✅', 'color:#fb923c;font-weight:bold');
  }
  waitAndPatch();
})();

/* ══════════════════════════════════════════════════════════════════
   UPDATE _showLanguages — mark compiled langs as ✅ now
══════════════════════════════════════════════════════════════════ */
(function updateLangList() {
  function waitAndPatch() {
    if (!window.TerminalManager?._showLanguages) return setTimeout(waitAndPatch, 600);
    const TM = window.TerminalManager;

    TM._showLanguages = function(terminalId) {
      const write = s => TM.terminals[terminalId]?.instance?.write(s);
      const WL    = s => write(s + '\r\n');
      const C     = { g:'\x1b[32m', y:'\x1b[33m', b:'\x1b[38;2;129;140;248m', r:'\x1b[0m', dim:'\x1b[90m', bold:'\x1b[1m' };
      const HEAD  = '\x1b[38;2;119;119;255m';
      const BAR   = '═'.repeat(60);

      WL('');
      WL(`${C.bold}${HEAD}╔${BAR}╗${C.r}`);
      WL(`${HEAD}║${C.r}  ${C.bold}\x1b[38;2;199;199;255mProCode IDE ∞ — Supported Languages (v32 MAX)${C.r}        ${HEAD}║${C.r}`);
      WL(`${HEAD}╚${BAR}╝${C.r}`);
      WL('');
      WL(`  ${C.g}✅ Runs in browser${C.r}  ${C.y}⚙  Local runtime${C.r}  \x1b[38;2;251;146;60m☁ Piston cloud${C.r}`);
      WL('');

      const row = (icon, name, ext, status, note) => {
        const badge = status === 'browser'  ? `${C.g}✅ Browser${C.r}   ` :
                      status === 'piston'   ? `\x1b[38;2;251;146;60m🚀 Cloud API${C.r} ` :
                                              `${C.y}⚙  Local  ${C.r}   `;
        WL(`  ${icon} ${(name + ' ' + ext).padEnd(34)} ${badge} ${C.dim}${note}${C.r}`);
      };

      WL(`${C.bold}Web & JavaScript${C.r}`);
      row('🌐','HTML/CSS/JS','.html .css .js .jsx','browser','Preview panel');
      row('🔷','TypeScript (browser)','.ts .tsx','browser','tsc → JS sandbox');
      row('🟢','Vue / Svelte / Astro','.vue .svelte .astro','browser','Preview panel');
      row('☕','CoffeeScript (browser)','.coffee','browser','Compiler CDN');

      WL('');
      WL(`${C.bold}In-browser Runtimes${C.r}`);
      row('🐍','Python (Pyodide)','.py .pyw','browser','Pyodide WebAssembly');
      row('🌙','Lua (Fengari)','.lua','browser','Fengari (Lua 5.3)');
      row('🗃 ','SQL / SQLite','.sql','browser','sql.js WASM');
      row('📦','JSON','.json .jsonc','browser','Parse + analyse');
      row('📝','Markdown','.md .mdx','browser','Terminal render');
      row('🐚','Shell (sim)','.sh .bash .zsh .fish','browser','Built-in commands');

      WL('');
      WL(`${C.bold}Systems & Compiled (Piston Cloud)${C.r}`);
      row('⚙️ ','C (GCC)','.c .h','piston','gcc <file.c>');
      row('⚙️ ','C++ (G++)','.cpp .cc .cxx .hpp','piston','g++ <file.cpp>');
      row('🟢','C# (Mono)','.cs','piston','mcs <file.cs>');
      row('☕','Java (OpenJDK)','.java','piston','javac + java');
      row('🦀','Rust (rustc)','.rs','piston','rustc <file.rs>');
      row('🐹','Go','.go','piston','go run main.go');
      row('🐦','Swift','.swift','piston','swift main.swift');
      row('💠','Kotlin','.kt .kts','piston','kotlinc + java');
      row('🔴','Scala','.scala','piston','scala main.scala');
      row('🎯','Dart','.dart','piston','dart main.dart');
      row('⚡','Zig','.zig','piston','zig run main.zig');
      row('👑','Nim','.nim','piston','nim r main.nim');
      row('💎','Crystal','.cr','piston','crystal main.cr');
      row('🔴','D (DMD)','.d','piston','dmd main.d');
      row('🔵','V','.v .vlang','piston','v run main.v');
      row('📘','Pascal (FPC)','.pas .pp','piston','fpc main.pas');
      row('🧮','Fortran','.f .f90 .f95','piston','gfortran main.f90');

      WL('');
      WL(`${C.bold}Scripting & Dynamic (Piston Cloud)${C.r}`);
      row('🐍','Python (Piston)','.py','piston','python3 main.py');
      row('🐍','Python 2','.py2','piston','python2 main.py');
      row('💎','Ruby','.rb','piston','ruby main.rb');
      row('🐘','PHP','.php','piston','php main.php');
      row('🐪','Perl','.pl .pm','piston','perl main.pl');
      row('🦋','Raku','.raku .p6','piston','raku main.raku');
      row('🌙','Lua (Piston)','.lua','piston','lua main.lua');
      row('📊','R','.r .rmd','piston','Rscript main.r');
      row('🔵','Julia','.jl','piston','julia main.jl');
      row('📜','AWK','.awk','piston','awk -f main.awk');
      row('⚓','Tcl','.tcl','piston','tclsh main.tcl');

      WL('');
      WL(`${C.bold}Functional (Piston Cloud)${C.r}`);
      row('🎓','Haskell (GHC)','.hs .lhs','piston','runghc main.hs');
      row('🟠','OCaml','.ml','piston','ocaml main.ml');
      row('🔷','F# Interactive','.fs .fsx','piston','dotnet fsi');
      row('💜','Elixir','.ex .exs','piston','elixir main.exs');
      row('🔴','Erlang (escript)','.erl','piston','escript main.erl');
      row('🟢','Clojure','.clj .cljs','piston','clojure main.clj');
      row('🟣','Racket / Scheme','.rkt .scm','piston','racket main.rkt');
      row('🟪','Common Lisp','.lisp .cl','piston','sbcl main.lisp');
      row('💬','Smalltalk','.st','piston','gst main.st');

      WL('');
      WL(`${C.bold}Server JS / TS (Piston Cloud)${C.r}`);
      row('🟨','Node.js','.cjs .mjs','piston','node main.js');
      row('🦕','Deno (TS)','.deno','piston','deno run main.ts');
      row('🔷','TypeScript (Node)','.ts','piston','ts-node main.ts');
      row('☕','CoffeeScript (Node)','.coffee','piston','coffee main.coffee');

      WL('');
      WL(`${C.bold}Shell, DB & Logic (Piston Cloud)${C.r}`);
      row('🐚','Bash','.sh .bash','piston','bash main.sh');
      row('💙','PowerShell','.ps1','piston','pwsh main.ps1');
      row('🗃 ','SQLite (Piston)','.sqlite','piston','sqlite3 main.sql');
      row('🔶','Prolog (SWI)','.prolog .plg','piston','swipl main.pl');
      row('📜','COBOL','.cob .cbl','piston','cobc main.cob');
      row('🅱️ ','FreeBASIC','.bas','piston','fbc main.bas');
      row('🛠 ','NASM x86','.asm .s','piston','nasm + ld');
      row('🧠','Brainfuck','.bf','piston','bf main.bf');
      row('⭐','Groovy','.groovy','piston','groovy main.groovy');

      WL('');
      WL(`${C.bold}Local-only (show command, copy to clipboard)${C.r}`);
      row('💻','Native PowerShell','.ps1','local','pwsh');
      row('🐳','Dockerfile','Dockerfile','local','docker build');
      row('☁️ ','Terraform','.tf .hcl','local','terraform');
      row('🎮','GDScript','.gd','local','Godot Engine');
      row('💡','GLSL/HLSL/WGSL','.glsl .hlsl .wgsl','local','GPU shader');

      const pistonCount = window.PistonAPI ? Object.keys(window.PistonAPI.LANG_CONFIG).length : 0;
      WL('');
      WL(`  ${C.dim}Total: 100+ extensions · ${C.g}10 browser natives${C.r}${C.dim} · \x1b[38;2;251;146;60m${pistonCount} Piston cloud${C.r}${C.dim} · ${C.y}local sets${C.r}`);
      WL(`  ${C.dim}🚀 Piston: https://piston-production-d148.up.railway.app/api/v2 (self-hosted)${C.r}`);
      WL(`  ${C.dim}Tip: type ${C.bold}langs${C.r}${C.dim} or press F5 in any supported file.${C.r}`);
      WL('');
    };
  }
  waitAndPatch();
})();

/* ══════════════════════════════════════════════════════════════════
   STDIN SUPPORT — prompt user for input() before running
══════════════════════════════════════════════════════════════════ */
window.runCompiledWithStdin = async function(code, fileName, write, terminalInstance) {
  // Detect if code uses stdin
  const needsStdin = /scanf|cin\s*>>|BufferedReader|Scanner|Console\.ReadLine|gets|fgets|readline|input\(/i.test(code);
  let stdinText = '';

  if (needsStdin && terminalInstance) {
    write('\x1b[38;2;251;191;36m⚠ Program reads from stdin.\x1b[0m\r\n');
    write('\x1b[90mEnter stdin (press Ctrl+D or leave empty + Enter to skip):\x1b[0m\r\n');
    write('\x1b[38;2;100;100;180m> \x1b[0m');

    stdinText = await new Promise(resolve => {
      let buf = '';
      const handler = terminalInstance.onKey(({ key, domEvent }) => {
        // Enter — submit input
        if (domEvent.key === 'Enter' || domEvent.keyCode === 13) {
          handler.dispose();
          write('\r\n');
          resolve(buf);
        // Ctrl+D — submit (EOF signal, same as Enter for single-line stdin)
        } else if (domEvent.ctrlKey && domEvent.key === 'd') {
          handler.dispose();
          write('\r\n');
          resolve(buf);
        // ESC — cancel / skip stdin (UPGRADE v3.1.5)
        } else if (domEvent.key === 'Escape') {
          handler.dispose();
          write('\r\n');
          write('\x1b[90m(stdin skipped)\x1b[0m\r\n');
          resolve('');
        // Backspace
        } else if ((domEvent.key === 'Backspace' || domEvent.keyCode === 8) && buf.length > 0) {
          buf = buf.slice(0, -1);
          write('\b \b');
        // Printable characters only
        } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
          buf += key;
          write(key);
        }
      });
    });
  }

  return runCompiled(code, fileName, write, stdinText);
};
