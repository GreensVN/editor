/**
 * find-bar.js
 * Find/Replace bar — in-editor search UI
 * ProCode IDE v3.0
 */

/* ══════════════════════════════════════════════════════════
   RUNNER EXTENSIONS — new language executors
══════════════════════════════════════════════════════════ */
(function extendRunner() {
  if (!window.Runner) return;

  /* ── Language metadata: icon, color, run hint ── */
  const LANG_META = {
    // Systems
    c:       { icon:'⚙️', color:'#a8b9cc', name:'C',           run:'gcc',    hint:'C (compile via gcc)' },
    cpp:     { icon:'⚙️', color:'#00599c', name:'C++',         run:'g++',    hint:'C++ (compile via g++)' },
    cc:      { icon:'⚙️', color:'#00599c', name:'C++',         run:'g++',    hint:'C++' },
    cxx:     { icon:'⚙️', color:'#00599c', name:'C++',         run:'g++',    hint:'C++' },
    cs:      { icon:'🟢', color:'#239120', name:'C#',          run:'dotnet', hint:'C# (needs .NET)' },
    java:    { icon:'☕', color:'#e76f00', name:'Java',        run:'java',   hint:'Java (needs JDK)' },
    rs:      { icon:'🦀', color:'#dea584', name:'Rust',        run:'rustc',  hint:'Rust (rustc)' },
    go:      { icon:'🐹', color:'#00add8', name:'Go',          run:'go',     hint:'Go (go run)' },
    swift:   { icon:'🐦', color:'#fa7343', name:'Swift',       run:'swift',  hint:'Swift (swift CLI)' },
    kt:      { icon:'💠', color:'#f18e33', name:'Kotlin',      run:'kotlinc',hint:'Kotlin (kotlinc)' },
    kts:     { icon:'💠', color:'#f18e33', name:'Kotlin',      run:'kotlinc',hint:'Kotlin script' },
    scala:   { icon:'🔴', color:'#dc322f', name:'Scala',       run:'scala',  hint:'Scala (sbt/scala)' },
    dart:    { icon:'🎯', color:'#0175C2', name:'Dart',        run:'dart',   hint:'Dart (dart run)' },
    d:       { icon:'🔴', color:'#ba595e', name:'D',           run:'dmd',    hint:'D (dmd)' },
    zig:     { icon:'⚡', color:'#f7a41d', name:'Zig',         run:'zig',    hint:'Zig (zig run)' },
    v:       { icon:'🔵', color:'#5d87bf', name:'V',           run:'v',      hint:'Vlang (v run)' },
    nim:     { icon:'👑', color:'#ffe953', name:'Nim',         run:'nim',    hint:'Nim (nim r)' },
    crystal: { icon:'💎', color:'#000100', name:'Crystal',     run:'crystal',hint:'Crystal (crystal run)' },
    odin:    { icon:'⚙️', color:'#3b8a5a', name:'Odin',        run:'odin',   hint:'Odin (odin run)' },
    // Scripting
    rb:      { icon:'💎', color:'#cc342d', name:'Ruby',        run:'ruby',   hint:'Ruby (ruby)' },
    php:     { icon:'🐘', color:'#777bb4', name:'PHP',         run:'php',    hint:'PHP (php)' },
    lua:     { icon:'🌙', color:'#000080', name:'Lua',         run:'lua',    hint:'Lua (lua)' },
    pl:      { icon:'🐪', color:'#39457e', name:'Perl',        run:'perl',   hint:'Perl (perl)' },
    r:       { icon:'📊', color:'#276dc3', name:'R',           run:'Rscript',hint:'R (Rscript)' },
    jl:      { icon:'🔵', color:'#9558b2', name:'Julia',       run:'julia',  hint:'Julia (julia)' },
    ex:      { icon:'💜', color:'#6e4a7e', name:'Elixir',      run:'elixir', hint:'Elixir (elixir)' },
    exs:     { icon:'💜', color:'#6e4a7e', name:'Elixir',      run:'elixir', hint:'Elixir script' },
    erl:     { icon:'🔴', color:'#a90533', name:'Erlang',      run:'escript',hint:'Erlang (escript)' },
    clj:     { icon:'🟢', color:'#5881d8', name:'Clojure',     run:'clojure',hint:'Clojure (clojure)' },
    hs:      { icon:'🎯', color:'#5e5086', name:'Haskell',     run:'ghci',   hint:'Haskell (runghc)' },
    fs:      { icon:'🔷', color:'#378bba', name:'F#',          run:'dotnet', hint:'F# (dotnet fsi)' },
    ml:      { icon:'🟠', color:'#ee6a1a', name:'OCaml',       run:'ocaml',  hint:'OCaml (ocaml)' },
    groovy:  { icon:'⚙️', color:'#4298b8', name:'Groovy',      run:'groovy', hint:'Groovy (groovy)' },
    coffee:  { icon:'☕', color:'#244776', name:'CoffeeScript', run:'coffee', hint:'CoffeeScript (coffee)' },
    // GDScript
    gd:      { icon:'🎮', color:'#478cbf', name:'GDScript',    run:'godot',  hint:'GDScript (Godot Engine)' },
  };

  /* ── runSandbox: show output in terminal with run instructions ── */
  Runner.runSandbox = function(path, ext) {
    const meta = LANG_META[ext] || { icon:'▶', color:'#71717a', name: ext.toUpperCase(), run: ext, hint: ext };
    const code = window.FileSystem?.read(path) || window.FS?.read(path) || '';
    const fileName = path.split('/').pop();

    // Open terminal panel
    if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
    else if (window.LayoutManager?.toggleLayout) LayoutManager.toggleLayout('terminal', true);

    // Find active terminal
    const termId = window.TerminalManager?.activeTerminal ?? 0;
    const term = window.TerminalManager?.terminals?.[termId]?.instance;

    const write = (txt) => {
      if (term?.write) term.write(txt);
      else if (window.Console?.info) Console.info(txt.replace(/\x1b\[[0-9;]*m/g,''));
    };

    write(`\r\n\x1b[1m${meta.icon} Running \x1b[36m${fileName}\x1b[0m \x1b[90m(${meta.name})\x1b[0m\r\n`);
    write(`\x1b[90m${'─'.repeat(50)}\x1b[0m\r\n`);

    // JavaScript — run directly in browser
    if (ext === 'coffee') {
      write(`\x1b[33m⚠ CoffeeScript requires browser transpiler. Loading...\x1b[0m\r\n`);
      _runCoffee(write, code, fileName);
      return;
    }

    // For compiled/system languages, show instructions + code preview
    const instructions = _getRunInstructions(ext, fileName, meta);
    write(instructions);

    // Show code preview (first 20 lines)
    const lines = code.split('\n').slice(0, 20);
    write(`\r\n\x1b[90m── Code Preview (${lines.length} of ${code.split('\n').length} lines) ──\x1b[0m\r\n`);
    lines.forEach((line, i) => {
      const ln = String(i+1).padStart(3,' ');
      write(`\x1b[90m${ln}\x1b[0m  ${_syntaxColor(line, ext)}\r\n`);
    });
    if (code.split('\n').length > 20) write(`\x1b[90m... (${code.split('\n').length - 20} more lines)\x1b[0m\r\n`);

    if (window.TerminalManager?.writePrompt) TerminalManager.writePrompt(termId);
    if (window.Utils?.toast) Utils.toast(`${meta.icon} ${meta.name} — see terminal for run instructions`, 'info');
  };

  function _getRunInstructions(ext, fileName, meta) {
    const cmds = {
      c:      [`gcc ${fileName} -o out && ./out`],
      cpp:    [`g++ ${fileName} -o out && ./out`, `clang++ ${fileName} -o out && ./out`],
      cc:     [`g++ ${fileName} -o out && ./out`],
      cxx:    [`g++ ${fileName} -o out && ./out`],
      java:   [`javac ${fileName} && java ${fileName.replace('.java','')}`],
      cs:     [`dotnet script ${fileName}`, `csc ${fileName} && mono ${fileName.replace('.cs','.exe')}`],
      rs:     [`rustc ${fileName} && ./${fileName.replace('.rs','')}`],
      go:     [`go run ${fileName}`],
      swift:  [`swift ${fileName}`],
      kt:     [`kotlinc ${fileName} -include-runtime -d out.jar && java -jar out.jar`],
      kts:    [`kotlinc -script ${fileName}`],
      scala:  [`scala ${fileName}`],
      dart:   [`dart run ${fileName}`],
      d:      [`dmd ${fileName} && ./${fileName.replace('.d','')}`],
      zig:    [`zig run ${fileName}`],
      v:      [`v run ${fileName}`],
      nim:    [`nim r ${fileName}`],
      crystal:[`crystal run ${fileName}`],
      odin:   [`odin run ${fileName}`],
      rb:     [`ruby ${fileName}`],
      php:    [`php ${fileName}`],
      lua:    [`lua ${fileName}`],
      pl:     [`perl ${fileName}`],
      r:      [`Rscript ${fileName}`],
      jl:     [`julia ${fileName}`],
      ex:     [`elixir ${fileName}`],
      exs:    [`elixir ${fileName}`],
      erl:    [`escript ${fileName}`],
      clj:    [`clojure ${fileName}`],
      hs:     [`runghc ${fileName}`, `runhaskell ${fileName}`],
      lhs:    [`runghc ${fileName}`],
      fs:     [`dotnet fsi ${fileName}`],
      fsx:    [`dotnet fsi ${fileName}`],
      ml:     [`ocaml ${fileName}`],
      groovy: [`groovy ${fileName}`],
      coffee: [`coffee ${fileName}`],
      gd:     [`# Open in Godot Engine, then press F5 to run`],
    };
    const list = cmds[ext] || [`${meta.run} ${fileName}`];
    let out = `\x1b[1;33m▶ To run this ${meta.name} file:\x1b[0m\r\n`;
    list.forEach(cmd => { out += `  \x1b[32m$ ${cmd}\x1b[0m\r\n`; });
    out += `\r\n\x1b[90mℹ ${meta.hint}\x1b[0m\r\n`;
    return out;
  }

  /* ── Simple syntax coloring for terminal preview ── */
  function _syntaxColor(line, ext) {
    // keywords
    const kws = {
      c:['int','void','return','if','else','for','while','struct','char','float','double','include','define'],
      cpp:['int','void','return','if','else','for','while','class','struct','auto','template','namespace','std'],
      java:['public','private','static','void','int','class','return','if','else','for','while','import','new'],
      rs:['fn','let','mut','pub','use','struct','impl','match','if','else','for','while','return','mod'],
      go:['func','package','import','var','const','type','struct','if','else','for','return','nil','make'],
      py:['def','class','import','from','return','if','else','elif','for','while','with','as','True','False','None'],
      rb:['def','class','end','if','else','unless','return','require','do','yield','attr_accessor'],
      lua:['function','local','if','then','else','end','return','for','while','do','repeat','until'],
    };
    const langKws = kws[ext] || kws.c;
    let colored = line
      .replace(/(".*?"|'.*?'|`.*?`)/g, '\x1b[33m$1\x1b[0m')          // strings → yellow
      .replace(/(\/\/.*|#.*|--.*)/g, '\x1b[90m$1\x1b[0m')             // comments → gray
      .replace(/\b(\d+\.?\d*)\b/g, '\x1b[35m$1\x1b[0m');              // numbers → magenta
    langKws.forEach(kw => {
      colored = colored.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '\x1b[34m$1\x1b[0m');
    });
    return colored;
  }

  /* ── CoffeeScript runner (transpile via CDN) ── */
  function _runCoffee(write, code, fileName) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/coffeescript/2.7.0/coffeescript.min.js';
    s.onload = () => {
      try {
        const js = window.CoffeeScript.compile(code, { bare: true });
        const logs = [];
        const _log = console.log;
        console.log = (...a) => { logs.push(a.join(' ')); _log(...a); };
        /* FIX: Route through ProCode.Sandbox instead of bare new Function().
           ProCode.Sandbox wraps execution in a Web Worker with a timeout, preventing
           infinite loops and isolating execution from the main thread context. */
        try {
          if (window.ProCode && window.ProCode.Sandbox) {
            window.ProCode.Sandbox.eval(js)
              .then(result => {
                if (result && result.output) logs.push(...result.output.split('\n').filter(Boolean));
                logs.forEach(l => write(`${l}\r\n`));
                write(`\x1b[32m✓ Done\x1b[0m\r\n`);
              })
              .catch(e => { logs.push(`Error: ${_escapeHtml(e.message)}`); logs.forEach(l => write(`${l}\r\n`)); write(`\x1b[31m✗ Runtime error\x1b[0m\r\n`); });
          } else {
            // Fallback: new Function (only if Sandbox not available)
            new Function('"use strict";\n' + js)();
            logs.forEach(l => write(`${l}\r\n`));
            write(`\x1b[32m✓ Done\x1b[0m\r\n`);
          }
        } catch(e) { logs.push(`Error: ${_escapeHtml(e.message)}`); logs.forEach(l => write(`${l}\r\n`)); }
        console.log = _log;
      } catch(e) {
        write(`\x1b[31m✗ Compile error: ${e.message}\x1b[0m\r\n`);
      }
    };
    document.head.appendChild(s);
  }

  /* ── runShell: simulate shell script ── */
  Runner.runShell = function(path) {
    const code = window.FileSystem?.read(path) || '';
    const fileName = path.split('/').pop();
    const termId = window.TerminalManager?.activeTerminal ?? 0;
    const term = window.TerminalManager?.terminals?.[termId]?.instance;
    const write = (t) => term?.write?.(t);

    if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);

    write(`\r\n\x1b[1m🐚 Shell Script: \x1b[36m${fileName}\x1b[0m\r\n`);
    write(`\x1b[90m${'─'.repeat(50)}\x1b[0m\r\n`);

    const lines = code.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    write(`\x1b[90mSimulating ${lines.length} commands...\x1b[0m\r\n\r\n`);
    lines.slice(0, 15).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      write(`\x1b[32m$ \x1b[0m${trimmed}\r\n`);
      if (window.TerminalManager?.executeCommand) {
        try { TerminalManager.executeCommand(termId, trimmed); } catch(e) {}
      }
    });
    if (window.TerminalManager?.writePrompt) TerminalManager.writePrompt(termId);
  };

  /* ── runSQL: pretty-print with simple tokenizer ── */
  Runner.runSQL = function(path) {
    const code = window.FileSystem?.read(path) || '';
    const fileName = path.split('/').pop();
    if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
    const termId = window.TerminalManager?.activeTerminal ?? 0;
    const term = window.TerminalManager?.terminals?.[termId]?.instance;
    const write = (t) => term?.write?.(t);

    const KEYWORDS = ['SELECT','FROM','WHERE','INSERT','INTO','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','INDEX','JOIN','LEFT','RIGHT','INNER','OUTER','ON','AND','OR','NOT','NULL','PRIMARY','KEY','FOREIGN','REFERENCES','VALUES','AS','DISTINCT','ORDER BY','GROUP BY','HAVING','LIMIT','OFFSET','BEGIN','COMMIT','ROLLBACK','TRANSACTION'];
    write(`\r\n\x1b[1m🗃 SQL: \x1b[36m${fileName}\x1b[0m\r\n`);
    write(`\x1b[90m${'─'.repeat(50)}\x1b[0m\r\n`);
    const stmts = code.split(';').filter(s => s.trim());
    write(`\x1b[90m${stmts.length} statement(s) detected\x1b[0m\r\n\r\n`);
    stmts.slice(0, 10).forEach((stmt, i) => {
      let colored = stmt.trim();
      KEYWORDS.forEach(kw => {
        colored = colored.replace(new RegExp(`\\b(${kw})\\b`,'gi'), `\x1b[34m$1\x1b[0m`);
      });
      colored = colored.replace(/('.*?')/g, '\x1b[33m$1\x1b[0m');
      colored = colored.replace(/\b(\d+)\b/g, '\x1b[35m$1\x1b[0m');
      write(`\x1b[90m[${i+1}]\x1b[0m ${colored};\r\n\r\n`);
    });
    write(`\x1b[33m⚠ SQL execution requires a database connection.\x1b[0m\r\n`);
    write(`\x1b[90mUse the SQLite Explorer (hamburger menu → Analysis) for in-browser SQL.\x1b[0m\r\n`);
    if (window.TerminalManager?.writePrompt) TerminalManager.writePrompt(termId);
  };

  /* ── runJSON: validate + pretty-print ── */
  Runner.runJSON = function(path) {
    const code = window.FileSystem?.read(path) || '';
    if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
    const termId = window.TerminalManager?.activeTerminal ?? 0;
    const term = window.TerminalManager?.terminals?.[termId]?.instance;
    const write = (t) => term?.write?.(t);

    write(`\r\n\x1b[1m📦 JSON: \x1b[36m${path.split('/').pop()}\x1b[0m\r\n`);
    write(`\x1b[90m${'─'.repeat(50)}\x1b[0m\r\n`);
    try {
      const parsed = JSON.parse(code);
      const pretty = JSON.stringify(parsed, null, 2);
      const lines = pretty.split('\n');
      write(`\x1b[32m✓ Valid JSON\x1b[0m — ${lines.length} lines\r\n`);
      const keys = typeof parsed === 'object' ? Object.keys(parsed).length : 0;
      if (keys) write(`\x1b[90mTop-level keys (${keys}): ${Object.keys(parsed).slice(0,10).join(', ')}\x1b[0m\r\n`);
      lines.slice(0, 30).forEach(l => write(l + '\r\n'));
      if (lines.length > 30) write(`\x1b[90m... (${lines.length-30} more lines)\x1b[0m\r\n`);
    } catch(e) {
      write(`\x1b[31m✗ JSON Error: ${e.message}\x1b[0m\r\n`);
    }
    if (window.TerminalManager?.writePrompt) TerminalManager.writePrompt(termId);
  };

  /* ── runMarkdown: open preview ── */
  Runner.runMarkdown = function(path) {
    const code = window.FileSystem?.read(path) || '';
    if (window.MarkdownPreview) { MarkdownPreview.show(code); return; }
    if (window.Utils?.toast) Utils.toast('Markdown Preview not available — install MarkdownPreview module', 'warn');
  };

  /* ── Terminal command extensions ── */
  if (window.TerminalManager) {
    const _origExec = TerminalManager.executeCommand.bind(TerminalManager);
    TerminalManager.executeCommand = function(terminalId, input) {
      const [cmd, ...args] = input.trim().split(' ');
      const command = cmd.toLowerCase();
      const terminal = this.terminals[terminalId];
      const write = (t) => terminal?.instance?.write(t);

      // New language commands
      const langCmds = {
        'ruby': 'rb', 'ruby3': 'rb',
        'lua': 'lua',
        'perl': 'pl',
        'rscript': 'r', 'r': 'r',
        'julia': 'jl',
        'elixir': 'exs',
        'groovy': 'groovy',
        'dart': 'dart',
        'php': 'php',
        'coffee': 'coffee',
        'scala': 'scala',
        'kotlin': 'kt', 'kotlinc': 'kt',
        'swift': 'swift',
        'go': 'go',
        'rustc': 'rs',
        'zig': 'zig',
      };

      if (langCmds[command] && args.length > 0) {
        const filePath = args[0];
        const fullPath = (terminal?.currentDir || '/').replace(/^\//, '') + '/' + filePath;
        const code = window.IDE?.state?.files?.[fullPath.replace(/^\//, '')] || 
                     window.IDE?.state?.files?.[filePath.replace(/^\//, '')];
        if (code !== undefined) {
          write(`\x1b[90mRunning ${filePath} via ${command}...\x1b[0m\r\n`);
          write(`\x1b[33m⚠ ${command} requires a local runtime. Showing code preview:\x1b[0m\r\n`);
          code.split('\n').slice(0, 10).forEach((line, i) => {
            write(`\x1b[90m${String(i+1).padStart(3)}\x1b[0m  ${line}\r\n`);
          });
          this.writePrompt(terminalId);
          return;
        }
      }

      // language REPL shortcuts
      if (['irb', 'iex', 'ghci', 'ocaml', 'julia', 'lua', 'elixir'].includes(command)) {
        write(`\x1b[33m${command} REPL is not available in this browser environment.\x1b[0m\r\n`);
        write(`\x1b[90mUse the Run button (F5) to execute your file.\x1b[0m\r\n`);
        this.writePrompt(terminalId);
        return;
      }

      return _origExec(terminalId, input);
    };
  }

  console.log('%c[LangExpansion] 80+ languages loaded ✅', 'color:#4ade80;font-weight:bold');
})();

/* ══════════════════════════════════════════════════════════
   MONACO LANGUAGE REGISTRATION — Tell Monaco about new langs
══════════════════════════════════════════════════════════ */
(function registerMonacoLangs() {
  function doRegister() {
    if (!window.monaco) return;

    // Register langs Monaco doesn't know natively
    const customLangs = [
      { id: 'gdscript',    ext: ['.gd'],              aliases: ['GDScript', 'Godot'] },
      { id: 'glsl',        ext: ['.glsl','.vert','.frag','.geom'], aliases: ['GLSL','Shader'] },
      { id: 'hlsl',        ext: ['.hlsl'],             aliases: ['HLSL'] },
      { id: 'wgsl',        ext: ['.wgsl'],             aliases: ['WGSL','WebGPU'] },
      { id: 'nim',         ext: ['.nim'],              aliases: ['Nim'] },
      { id: 'zig',         ext: ['.zig'],              aliases: ['Zig'] },
      { id: 'vlang',       ext: ['.v'],                aliases: ['V','Vlang'] },
      { id: 'crystal',     ext: ['.cr'],               aliases: ['Crystal'] },
      { id: 'odin',        ext: ['.odin'],             aliases: ['Odin'] },
      { id: 'astro',       ext: ['.astro'],            aliases: ['Astro'] },
      { id: 'proto',       ext: ['.proto'],            aliases: ['Protobuf','Protocol Buffers'] },
      { id: 'hcl',         ext: ['.tf','.hcl'],        aliases: ['HCL','Terraform'] },
      { id: 'julia',       ext: ['.jl'],               aliases: ['Julia'] },
      { id: 'erlang',      ext: ['.erl','.hrl'],       aliases: ['Erlang'] },
      { id: 'elixir',      ext: ['.ex','.exs'],        aliases: ['Elixir'] },
      { id: 'coffeescript',ext: ['.coffee'],           aliases: ['CoffeeScript','Coffee'] },
      { id: 'cmake',       ext: ['.cmake','CMakeLists.txt'], aliases: ['CMake'] },
    ];

    customLangs.forEach(({ id, ext, aliases }) => {
      try {
        const existing = monaco.languages.getLanguages().find(l => l.id === id);
        if (!existing) {
          monaco.languages.register({ id, extensions: ext, aliases });
        }
      } catch(e) {}
    });

    // Tokenizer for GDScript (basic)
    try {
      monaco.languages.setMonarchTokensProvider('gdscript', {
        keywords: ['func','var','const','if','elif','else','for','while','match','class','extends','return','pass','break','continue','and','or','not','in','is','null','true','false','self','export','onready','signal','yield'],
        tokenizer: {
          root: [
            [/#.*/, 'comment'],
            [/".*?"/, 'string'],
            [/'.*?'/, 'string'],
            [/\b(\d+\.?\d*)\b/, 'number'],
            [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          ]
        }
      });
    } catch(e) {}

    // Tokenizer for GLSL/HLSL/WGSL
    ['glsl','hlsl','wgsl'].forEach(id => {
      try {
        monaco.languages.setMonarchTokensProvider(id, {
          keywords: ['void','float','vec2','vec3','vec4','mat2','mat3','mat4','uniform','varying','attribute','in','out','inout','return','if','else','for','while','struct','precision','mediump','highp','lowp','sampler2D','samplerCube'],
          tokenizer: {
            root: [
              [/\/\/.*/, 'comment'],
              [/\/\*[\s\S]*?\*\//, 'comment'],
              [/".*?"/, 'string'],
              [/\b(\d+\.?\d*)\b/, 'number'],
              [/#\w+/, 'keyword.directive'],
              [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
            ]
          }
        });
      } catch(e) {}
    });

    console.log('%c[Monaco] Custom language tokens registered', 'color:#818cf8');
  }

  // Try immediately, retry until Monaco is ready
  if (window.monaco) doRegister();
  else {
    let tries = 0;
    const poll = setInterval(() => {
      if (window.monaco || ++tries > 20) { clearInterval(poll); doRegister(); }
    }, 500);
  }
})();

/* ══════════════════════════════════════════════════════════
   LANGUAGES.md — Auto-update supported languages list
══════════════════════════════════════════════════════════ */
(function updateLanguageDoc() {
  const LANGS_DOC = `# 📋 ProCode IDE — Ngôn ngữ được hỗ trợ

Chào mừng đến với **ProCode IDE ∞ UNIFIED**! Hỗ trợ **80+ ngôn ngữ lập trình**.

---

## 🌐 Web & Frontend
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| HTML | \`.html\`, \`.htm\`, \`.xhtml\` | Markup chuẩn web |
| CSS | \`.css\` | Stylesheet |
| SCSS / Sass | \`.scss\`, \`.sass\` | CSS preprocessor |
| Less | \`.less\` | CSS preprocessor |
| Stylus | \`.styl\` | CSS preprocessor |
| JavaScript | \`.js\`, \`.mjs\`, \`.cjs\` | Ngôn ngữ web phổ biến nhất |
| TypeScript | \`.ts\`, \`.tsx\`, \`.mts\` | JavaScript + kiểu tĩnh |
| JSX / React | \`.jsx\` | React components |
| Vue | \`.vue\` | Vue.js Single File Components |
| Svelte | \`.svelte\` | Framework nhẹ, hiện đại |
| Astro | \`.astro\` | Static site framework |
| MDX | \`.mdx\` | Markdown + JSX |

## 🖥 Hệ thống & Biên dịch
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| C | \`.c\`, \`.h\` | Ngôn ngữ hệ thống |
| C++ | \`.cpp\`, \`.cc\`, \`.cxx\`, \`.hpp\` | OOP + system |
| C# | \`.cs\` | .NET / Unity |
| Java | \`.java\` | Enterprise / Android |
| Kotlin | \`.kt\`, \`.kts\` | Android / JVM |
| Scala | \`.scala\`, \`.sc\` | Functional + JVM |
| Rust | \`.rs\` | Memory-safe system lang |
| Go | \`.go\` | Google's system language |
| Swift | \`.swift\` | Apple / iOS / macOS |
| D | \`.d\` | Systems language |
| Zig | \`.zig\` | Low-level, safe |
| V (Vlang) | \`.v\` | Simple, fast |
| Nim | \`.nim\` | Python-like, compiled |
| Crystal | \`.cr\` | Ruby-like, compiled |
| Odin | \`.odin\` | Data-oriented systems |
| Objective-C | \`.m\`, \`.mm\` | Legacy Apple |

## ✨ Scripting & Động
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| Python | \`.py\`, \`.pyw\`, \`.pyi\` | ✅ Chạy được (Pyodide) |
| Ruby | \`.rb\`, \`.erb\` | Web / scripting |
| PHP | \`.php\`, \`.phtml\` | Web backend |
| Lua | \`.lua\` | Game scripting |
| Perl | \`.pl\`, \`.pm\` | Text processing |
| R | \`.r\`, \`.rmd\` | Data science / stats |
| Julia | \`.jl\` | Scientific computing |
| Dart | \`.dart\` | Flutter / mobile |
| Elixir | \`.ex\`, \`.exs\` | Functional / Phoenix |
| Erlang | \`.erl\`, \`.hrl\` | Concurrency |
| Clojure | \`.clj\`, \`.cljs\` | Lisp + JVM |
| Haskell | \`.hs\`, \`.lhs\` | Pure functional |
| F# | \`.fs\`, \`.fsx\` | .NET functional |
| OCaml | \`.ml\`, \`.mli\` | Functional / systems |
| Groovy | \`.groovy\` | JVM scripting |
| CoffeeScript | \`.coffee\` | JS transpiler |

## 🐚 Shell & DevOps
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| Bash / Shell | \`.sh\`, \`.bash\`, \`.zsh\`, \`.fish\` | Unix scripting |
| PowerShell | \`.ps1\`, \`.psm1\` | Windows scripting |
| Batch | \`.bat\`, \`.cmd\` | Windows batch |
| Dockerfile | \`Dockerfile\` | Container config |
| Makefile | \`Makefile\`, \`.mk\` | Build system |
| CMake | \`.cmake\` | C/C++ build |
| Terraform / HCL | \`.tf\`, \`.hcl\` | Infrastructure as code |

## 🗃 Database & Query
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| SQL | \`.sql\`, \`.mysql\`, \`.pgsql\` | Database queries |
| GraphQL | \`.graphql\`, \`.gql\` | API query language |
| Cypher | \`.cypher\` | Neo4j graph queries |

## 🎮 Game Dev & Shaders
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| GDScript | \`.gd\` | Godot Engine |
| GLSL | \`.glsl\`, \`.vert\`, \`.frag\` | OpenGL shaders |
| HLSL | \`.hlsl\` | DirectX shaders |
| WGSL | \`.wgsl\` | WebGPU shaders |

## 📝 Markup & Template
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| Markdown | \`.md\`, \`.markdown\` | ✅ Preview có sẵn |
| Pug / Jade | \`.pug\`, \`.jade\` | HTML template |
| Handlebars | \`.hbs\`, \`.handlebars\` | JS template |
| EJS | \`.ejs\` | Embedded JS |
| Jinja2 | \`.jinja\`, \`.j2\` | Python template |
| Twig | \`.twig\` | PHP template |
| Liquid | \`.liquid\` | Shopify template |
| LaTeX | \`.tex\`, \`.latex\` | Document typesetting |
| reStructuredText | \`.rst\` | Python docs |

## ⚙ Data & Config
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| JSON / JSONC | \`.json\`, \`.jsonc\`, \`.json5\` | ✅ Validate & format |
| YAML | \`.yml\`, \`.yaml\` | Config files |
| TOML | \`.toml\` | Rust / config |
| INI / CFG | \`.ini\`, \`.cfg\`, \`.conf\` | Config files |
| Protobuf | \`.proto\` | Protocol Buffers |
| XML / SVG | \`.xml\`, \`.svg\`, \`.xsl\` | Markup |
| Jupyter | \`.ipynb\` | Python notebooks |

---

> 💡 **Tip:** Python chạy trực tiếp trong browser qua **Pyodide WebAssembly**.
> Các ngôn ngữ biên dịch khác cần môi trường local — xem hướng dẫn trong terminal khi nhấn Run.
`;

  // Update the LANGUAGES.md file in IDE state
  setTimeout(() => {
    try {
      if (window.IDE?.state?.files) {
        window.IDE.state.files['LANGUAGES.md'] = LANGS_DOC;
      }
      if (window.FileSystem?.write) {
        FileSystem.write('LANGUAGES.md', LANGS_DOC);
      }
    } catch(e) {}
  }, 2000);
})();