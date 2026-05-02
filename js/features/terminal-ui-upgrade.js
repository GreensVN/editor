/**
 * terminal-ui-upgrade.js
 * Terminal UI upgrade — enhanced xterm styling and controls
 * ProCode IDE v3.0
 */

/* ══════════════════════════���═════════════════════════════════
   PART 1 — TERMINAL THEME + FONT UPGRADE
═════════════════════���══════════════════════════════════════ */
(function upgradeTerminalTheme() {
  function applyTheme() {
    if (!window.TerminalManager?.terminals) return;
    Object.values(TerminalManager.terminals).forEach(t => {
      if (!t?.instance?.options) return;
      try {
        t.instance.options.fontFamily = "'Geist Mono','JetBrains Mono','Fira Code',monospace";
        t.instance.options.fontSize   = 13;
        t.instance.options.lineHeight = 1.5;
        t.instance.options.letterSpacing = 0;
        t.instance.options.fontWeight = '400';
        t.instance.setOption?.('theme', {
          background:    '#05050a',
          foreground:    '#c8c8f0',
          cursor:        '#7777ff',
          cursorAccent:  '#05050a',
          selectionBackground: 'rgba(85,85,255,0.3)',
          selectionForeground: '#e8e8ff',
          black:         '#111118',
          red:           '#f87171',
          green:         '#4ade80',
          yellow:        '#fbbf24',
          blue:          '#818cf8',
          magenta:       '#c084fc',
          cyan:          '#34d399',
          white:         '#c8c8f0',
          brightBlack:   '#484870',
          brightRed:     '#fb7185',
          brightGreen:   '#6ee7b7',
          brightYellow:  '#fde68a',
          brightBlue:    '#a5b4fc',
          brightMagenta: '#d8b4fe',
          brightCyan:    '#6ee7b7',
          brightWhite:   '#e8e8ff',
        });
        t.fitAddon?.fit();
      } catch(e) {}
    });
  }
  setTimeout(applyTheme, 1000);
  setTimeout(applyTheme, 3000);
})();

/* ════════════════════════════════════════════════════════════
   PART 2 — UPGRADED writeWelcome + writePrompt
════════════════════════════════════════════════════════════ */
(function upgradeWelcome() {
  function patch() {
    if (!window.TerminalManager) return setTimeout(patch, 500);

    TerminalManager.writeWelcome = function(terminalId) {
      const t = this.terminals[terminalId];
      if (!t) return;
      const w = t.instance.write.bind(t.instance);
      w('\x1b[2J\x1b[H'); // clear + home
      w('\r\n');
      w('  \x1b[38;2;119;119;255m╔══════════════════════════════════════╗\x1b[0m\r\n');
      w('  \x1b[38;2;119;119;255m║\x1b[0m  \x1b[1;38;2;199;199;255mProCode IDE\x1b[0m  \x1b[38;2;139;68;255m∞ TERMINAL\x1b[0m             \x1b[38;2;119;119;255m║\x1b[0m\r\n');
      w('  \x1b[38;2;119;119;255m╚══════════════════════════════════════╝\x1b[0m\r\n');
      w('\r\n');
      w('  \x1b[38;2;100;100;160m▸ \x1b[38;2;160;160;220mpython\x1b[38;2;100;100;160m <file>   \x1b[0m run Python via Pyodide\r\n');
      w('  \x1b[38;2;100;100;160m▸ \x1b[38;2;160;160;220mnode\x1b[38;2;100;100;160m <file>      \x1b[0m run JavaScript\r\n');
      w('  \x1b[38;2;100;100;160m▸ \x1b[38;2;160;160;220mrun\x1b[38;2;100;100;160m <file>       \x1b[0m auto-detect language\r\n');
      w('  \x1b[38;2;100;100;160m▸ \x1b[38;2;160;160;220mhelp\x1b[38;2;100;100;160m             \x1b[0m all commands\r\n');
      w('\r\n');
      this.writePrompt(terminalId);
    };

    TerminalManager.writePrompt = function(terminalId) {
      const t = this.terminals[terminalId];
      if (!t) return;
      const dir = t.currentDir === '/' ? '~' : ('~' + t.currentDir);
      const short = dir.length > 30 ? '…' + dir.slice(-28) : dir;
      t.instance.write(`\x1b[38;2;99;99;200m❯\x1b[0m \x1b[38;2;72;72;112m${short}\x1b[0m \x1b[38;2;85;85;170m$\x1b[0m `);
    };
  }
  patch();
})();

/* ════════════════════════════════════════════════════════════
   PART 3 — HELPER: resolve file path from terminal context
════════════════════════════════════════════════════════════ */
function _resolveTermFile(terminalId, filename) {
  const t = window.TerminalManager?.terminals?.[terminalId];
  const cwd = (t?.currentDir || '/').replace(/^\//, '');
  if (!filename) return null;

  // Absolute path
  if (filename.startsWith('/')) return filename.slice(1);

  // Relative: cwd + filename
  const joined = cwd ? `${cwd}/${filename}` : filename;

  // Try exact match
  const files = window.IDE?.state?.files || {};
  if (files[joined] !== undefined) return joined;

  // Try without leading slash normalization
  if (files[filename] !== undefined) return filename;

  // Fuzzy: find file by basename
  const basename = filename.split('/').pop();
  const match = Object.keys(files).find(k => k.endsWith('/' + basename) || k === basename);
  return match || joined; // return best guess
}

/* ═══════════════════════════════════════════════════════���════
   PART 4 — PYTHON RUNNER — Complete rewrite (Pyodide)
════════════════════════════════════════════════════════════ */
(function fixPythonRunner() {
  // Fix terminal "python <file>" command
  if (window.TerminalManager) {
    TerminalManager.runPython = function(terminalId, args) {
      const t = this.terminals[terminalId];
      if (!t) return;
      const w = s => t.instance.write(s);

      if (args.length === 0) {
        w('\x1b[33m⚠ Python REPL not available in browser.\x1b[0m\r\n');
        w('\x1b[90mUsage: python <filename.py>\x1b[0m\r\n');
        this.writePrompt(terminalId);
        return;
      }

      const filePath = _resolveTermFile(terminalId, args[0]);
      const code = window.IDE?.state?.files?.[filePath];
      if (code === undefined) {
        w(`\x1b[31mpython: \x1b[0m${args[0]}\x1b[31m: No such file\x1b[0m\r\n`);
        this.writePrompt(terminalId);
        return;
      }

      w(`\x1b[38;2;85;85;255m▶ Running \x1b[38;2;165;165;255m${args[0]}\x1b[0m \x1b[90m(Python/Pyodide)\x1b[0m\r\n`);

      _runPyodide(code, args[0], (line, type) => {
        const colors = { out: '\x1b[0m', err: '\x1b[91m', info: '\x1b[90m', ok: '\x1b[32m' };
        w((colors[type] || '\x1b[0m') + line + '\x1b[0m\r\n');
      }).then(() => {
        this.writePrompt(terminalId);
        t.isProcessing = false;
      });
      // Don't write prompt yet — async
    };
  }

  // Fix Runner.runPython (F5 button)
  if (window.Runner) {
    Runner.runPython = function(path) {
      const code = window.FileSystem?.read(path) || window.FS?.read(path) || '';
      if (!code && code !== '') {
        if (window.Utils?.toast) Utils.toast(`File not found: ${path}`, 'error');
        return;
      }
      const fileName = path.split('/').pop();

      // Show terminal
      if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
      else if (window.LayoutManager?.toggleLayout) LayoutManager.toggleLayout('terminal', true);

      // Write to terminal
      const termId = window.TerminalManager?.activeTerminal ?? 'default';
      const term = window.TerminalManager?.terminals?.[termId]?.instance;
      const write = s => term?.write?.(s);

      write(`\r\n\x1b[38;2;85;85;255m▶ \x1b[38;2;165;165;255m${fileName}\x1b[0m \x1b[90m(Python/Pyodide)\x1b[0m\r\n`);
      write('\x1b[90m' + '─'.repeat(44) + '\x1b[0m\r\n');

      this.updateRunButton?.(true);
      if (window.Console) { Console.clear(); Console.info(`▶ ${fileName}`); }

      _runPyodide(code, fileName, (line, type) => {
        const colors = { out: '\x1b[38;2;200;200;240m', err: '\x1b[91m', info: '\x1b[90m', ok: '\x1b[32m' };
        write((colors[type]||'\x1b[0m') + line + '\x1b[0m\r\n');
        if (window.Console) {
          if (type === 'err') Console.error(line);
          else Console.log(line);
        }
      }).then(() => {
        this.updateRunButton?.(false);
        if (window.TerminalManager?.writePrompt)
          TerminalManager.writePrompt(termId);
      });
    };
  }
})();

/* Core Pyodide executor — shared by both terminal and F5 */
async function _runPyodide(code, fileName, emit) {
  emit('Loading Python (Pyodide)…', 'info');
  try {
    if (!window.pyodide) {
      window.pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
      });
    }
    const py = window.pyodide;

    // Patch stdin (input() shim)
    py.globals.set('__procode_inputs__', py.toPy([]));

    // Setup capture
    py.runPython(`
import sys, io, traceback as _tb

class _Capture(io.StringIO):
    def __init__(self, cb_name):
        super().__init__()
        self._cb = cb_name
    def write(self, s):
        if s and s != '\\n':
            from js import _pyout
            try: _pyout(self._cb, s.rstrip('\\n'))
            except: pass
        super().write(s)
        return len(s)
    def flush(self): pass

sys.stdout = _Capture('out')
sys.stderr = _Capture('err')
`);

    window._pyout = (type, line) => emit(line, type);
    py.globals.set('_pyout', window._pyout);

    // Input() shim — returns '' in browser
    py.runPython(`
import builtins as _bi
def _input_shim(prompt=''):
    if prompt: _pyout('out', str(prompt))
    return ''
_bi.input = _input_shim
`);

    py.runPython(code);

    emit('', 'info');
    emit('✓ Done', 'ok');
  } catch(e) {
    // Clean up Python traceback
    let msg = String(e);
    // Remove JS stack trace, keep only Python part
    const pyPart = msg.match(/Traceback[\s\S]+/);
    if (pyPart) {
      pyPart[0].split('\n').forEach(l => emit(l, 'err'));
    } else {
      msg.split('\n').slice(0, 6).forEach(l => emit(l, 'err'));
    }
    emit('✗ Execution failed', 'err');
  } finally {
    // Reset streams
    try { window.pyodide?.runPython('import sys,io; sys.stdout=sys.__stdout__; sys.stderr=sys.__stderr__'); } catch(_) {}
  }
}

/* ════════════════════════════════════════════════════════════
   PART 5 — JAVASCRIPT RUNNER — Full in-browser execution
══════════════════════════════════════��═════════════════════ */
(function fixJSRunner() {
  /* Execute JS capturing console.log/error etc */
  function _runJS(code, fileName, emit) {
    // Intercept console
    const _console = {
      log:   (...a) => emit(a.map(_fmt).join(' '), 'out'),
      info:  (...a) => emit(a.map(_fmt).join(' '), 'info'),
      warn:  (...a) => emit('⚠ ' + a.map(_fmt).join(' '), 'warn'),
      error: (...a) => emit('✗ ' + a.map(_fmt).join(' '), 'err'),
      dir:   (a)    => emit(JSON.stringify(a, null, 2), 'out'),
      table: (a)    => emit(JSON.stringify(a, null, 2), 'out'),
      clear: ()     => {},
    };
    function _fmt(v) {
      if (v === null)      return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'object') {
        try { return JSON.stringify(v, null, 2); } catch(e) { return String(v); }
      }
      return String(v);
    }

    // Wrap in async so top-level await works
    const wrapped = `(async function(__console){
  const console = __console;
  ${code}
})(__console__)`;

    try {
      const fn = new Function('__console__', `return (async function(__console){
  const console = __console;
  ${code}
})(__console__)`);
      const p = fn(_console);
      if (p && typeof p.then === 'function') {
        return p
          .then(() => emit('✓ Done', 'ok'))
          .catch(e => {
            emit(String(e), 'err');
            emit('✗ Runtime error', 'err');
          });
      }
      emit('✓ Done', 'ok');
      return Promise.resolve();
    } catch(e) {
      emit(String(e), 'err');
      emit('✗ Syntax/runtime error', 'err');
      return Promise.resolve();
    }
  }

  /* TypeScript transpile then run */
  function _runTS(code, fileName, emit) {
    if (!window.ts) {
      emit('TypeScript compiler not loaded yet, retrying…', 'info');
      return new Promise(res => setTimeout(() => _runTS(code, fileName, emit).then(res), 1500));
    }
    try {
      const result = window.ts.transpileModule(code, {
        compilerOptions: {
          target: window.ts.ScriptTarget?.ES2020 || 99,
          module: window.ts.ModuleKind?.ESNext || 99,
          jsx: window.ts.JsxEmit?.React || 2,
          strict: false,
          allowJs: true,
        }
      });
      if (result.diagnostics?.length) {
        result.diagnostics.forEach(d => emit(d.messageText, 'err'));
      }
      return _runJS(result.outputText, fileName, emit);
    } catch(e) {
      emit(String(e), 'err');
      return Promise.resolve();
    }
  }

  /* patch TerminalManager.runNode */
  if (window.TerminalManager) {
    TerminalManager.runNode = function(terminalId, args) {
      const t = this.terminals[terminalId];
      if (!t) return;
      const w = s => t.instance.write(s);

      if (args.length === 0) {
        w('\x1b[33m⚠ Node.js REPL not available.\x1b[0m\r\n');
        w('\x1b[90mUsage: node <filename.js|ts>\x1b[0m\r\n');
        this.writePrompt(terminalId);
        return;
      }

      const filePath = _resolveTermFile(terminalId, args[0]);
      const code = window.IDE?.state?.files?.[filePath];
      if (code === undefined) {
        w(`\x1b[31mnode: \x1b[0m${args[0]}\x1b[31m: No such file\x1b[0m\r\n`);
        this.writePrompt(terminalId);
        return;
      }

      const ext = args[0].split('.').pop().toLowerCase();
      w(`\x1b[38;2;250;204;21m▶ Running \x1b[38;2;254;240;138m${args[0]}\x1b[0m \x1b[90m(${ext === 'ts' ? 'TypeScript' : 'JavaScript'})\x1b[0m\r\n`);

      const emit = (line, type) => {
        const c = { out:'\x1b[0m', err:'\x1b[91m', warn:'\x1b[93m', info:'\x1b[90m', ok:'\x1b[32m' };
        w((c[type]||'\x1b[0m') + line + '\x1b[0m\r\n');
      };

      const runner = ext === 'ts' ? _runTS : _runJS;
      runner(code, args[0], emit).then(() => {
        this.writePrompt(terminalId);
        t.isProcessing = false;
      });
    };
  }

  /* Patch Runner for JS/TS/Node files */
  if (window.Runner) {
    const _origRunNode = Runner.runNode?.bind(Runner);
    Runner.runNode = function(path) {
      const code = window.FileSystem?.read(path) || '';
      const fileName = path.split('/').pop();
      const ext = fileName.split('.').pop().toLowerCase();

      if (window.Layout?.toggleLayout) Layout.toggleLayout('terminal', true);
      const termId = window.TerminalManager?.activeTerminal ?? 'default';
      const term = window.TerminalManager?.terminals?.[termId]?.instance;
      const write = s => term?.write?.(s);

      write(`\r\n\x1b[38;2;250;204;21m▶ \x1b[38;2;254;240;138m${fileName}\x1b[0m \x1b[90m(${ext === 'ts' ? 'TypeScript' : 'Node/JS'})\x1b[0m\r\n`);
      write('\x1b[90m' + '─'.repeat(44) + '\x1b[0m\r\n');

      this.updateRunButton?.(true);
      if (window.Console) { Console.clear(); Console.info(`▶ ${fileName}`); }

      const emit = (line, type) => {
        const colors = { out:'\x1b[38;2;200;200;240m', err:'\x1b[91m', warn:'\x1b[93m', info:'\x1b[90m', ok:'\x1b[32m' };
        write((colors[type]||'\x1b[0m') + line + '\x1b[0m\r\n');
        if (window.Console) {
          if (type === 'err') Console.error(line);
          else Console.log(line);
        }
      };

      const runner = ext === 'ts' ? _runTS : _runJS;
      runner(code, fileName, emit).then(() => {
        this.updateRunButton?.(false);
        if (window.TerminalManager?.writePrompt)
          TerminalManager.writePrompt(termId);
      });
    };
  }

  // Expose globally so terminal commands can use them
  window._runJS = _runJS;
  window._runTS = _runTS;
})();

/* ════════════════════════════════════════════════════════════
   PART 6 — UPGRADED executeCommand — 30+ commands
��═══════════════════════════════════════════════════════════ */
(function upgradeExecuteCommand() {
  if (!window.TerminalManager) return setTimeout(arguments.callee, 600);

  const _origExec = TerminalManager.executeCommand.bind(TerminalManager);

  TerminalManager.executeCommand = function(terminalId, input) {
    const t = this.terminals[terminalId];
    if (!t) return;
    const w = s => t.instance.write(s);

    const trimmed = input.trim();
    if (!trimmed) { this.writePrompt(terminalId); return; }

    // Add to history
    if (t.commandHistory[0] !== trimmed) t.commandHistory.unshift(trimmed);
    if (t.commandHistory.length > 200) t.commandHistory.length = 200;
    t.historyIndex = -1;
    t.isProcessing = true;

    const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1).map(a => a.replace(/^["']|["']$/g, ''));

    const cwd = t.currentDir || '/';
    const cwdPrefix = cwd === '/' ? '' : cwd.replace(/^\//, '') + '/';

    const resolvePath = (filename) => {
      if (!filename) return null;
      return _resolveTermFile(terminalId, filename);
    };
    const readFile = (p) => {
      const rp = resolvePath(p);
      if (!rp) return undefined;
      return window.IDE?.state?.files?.[rp];
    };

    switch(cmd) {
      /* ── Info ── */
      case 'help':
        this._showHelpV9(terminalId);
        break;

      case 'version':
      case '--version':
        w('\x1b[38;2;119;119;255mProCode IDE ∞\x1b[0m · Terminal v9.0\r\n');
        w('\x1b[90mRuntime: Browser (Pyodide + JS sandbox)\x1b[0m\r\n');
        break;

      case 'whoami':
        w('\x1b[32mdev@procode\x1b[0m\r\n');
        break;

      case 'date':
        w(new Date().toString() + '\r\n');
        break;

      case 'uname':
        w('ProCode-Browser-Linux x86_64\r\n');
        break;

      case 'uptime':
        w(`up ${Math.floor(performance.now()/60000)} min\r\n`);
        break;

      case 'env':
        w('\x1b[90mSHELL=procode-terminal\r\nTERM=xterm-256color\r\nLANG=en_US.UTF-8\r\nEDITOR=monaco\x1b[0m\r\n');
        break;

      /* ── Navigation ── */
      case 'pwd':
        w(cwd + '\r\n');
        break;

      case 'ls':
      case 'll':
      case 'dir':
        this.listFiles(terminalId, cmd === 'll' ? ['-la', ...args] : args);
        break;

      case 'cd':
        this.changeDirectory(terminalId, args[0] || '/');
        break;

      case 'pushd':
        t._dirStack = t._dirStack || [];
        t._dirStack.push(cwd);
        if (args[0]) this.changeDirectory(terminalId, args[0]);
        w(t._dirStack.join(' ') + '\r\n');
        break;

      case 'popd':
        if (t._dirStack?.length) this.changeDirectory(terminalId, t._dirStack.pop());
        else w('\x1b[31mpopd: directory stack empty\x1b[0m\r\n');
        break;

      /* ── File ops ── */
      case 'cat':
        this.showFile(terminalId, args[0]);
        break;

      case 'head':
        this._headFile(terminalId, args);
        break;

      case 'tail':
        this._tailFile(terminalId, args);
        break;

      case 'wc':
        this._wcFile(terminalId, args);
        break;

      case 'touch':
        this.createFile(terminalId, args[0]);
        break;

      case 'mkdir':
      case 'mkdir -p':
        this.createDirectory(terminalId, args[0]);
        break;

      case 'rm':
        this.removeFile(terminalId, args);
        break;

      case 'cp':
        this.copyFile(terminalId, args[0], args[1]);
        break;

      case 'mv':
        this.moveFile(terminalId, args[0], args[1]);
        break;

      case 'find':
        this.findFiles(terminalId, args);
        break;

      case 'grep':
        this.grepFiles(terminalId, args);
        break;

      case 'echo':
        // Support env-like variables
        const out = args.join(' ').replace(/\$(\w+)/g, (_, k) => ({
          PWD: cwd, HOME: '/', USER: 'dev', SHELL: 'procode-terminal'
        }[k] || ''));
        w(out + '\r\n');
        break;

      case 'sort':
        if (args[0]) {
          const content = readFile(args[0]);
          if (content === undefined) { w(`sort: ${args[0]}: No such file\r\n`); break; }
          content.split('\n').sort().forEach(l => w(l + '\r\n'));
        }
        break;

      case 'uniq':
        if (args[0]) {
          const content = readFile(args[0]);
          if (content === undefined) { w(`uniq: ${args[0]}: No such file\r\n`); break; }
          let prev = null;
          content.split('\n').forEach(l => { if (l !== prev) w(l + '\r\n'); prev = l; });
        }
        break;

      /* ── Control ── */
      case 'clear':
      case 'cls':
        t.instance.clear();
        this.writeWelcome(terminalId);
        t.isProcessing = false;
        return;

      case 'reset':
        t.instance.reset();
        this.writeWelcome(terminalId);
        t.isProcessing = false;
        return;

      case 'history':
        t.commandHistory.slice(0, 50).forEach((cmd, i) =>
          w(`\x1b[90m${String(i+1).padStart(4)}\x1b[0m  ${cmd}\r\n`)
        );
        break;

      /* ── Language runners ── */
      case 'python':
      case 'python3':
      case 'py':
        this.runPython(terminalId, args);
        t.isProcessing = false;
        return; // async — prompt written inside

      case 'node':
      case 'nodejs':
        this.runNode(terminalId, args);
        t.isProcessing = false;
        return;

      case 'js':
      case 'javascript': {
        // Inline JS: js "code" or js file.js
        if (args.length === 0) { w('\x1b[90mUsage: js <expr or file.js>\x1b[0m\r\n'); break; }
        const code = readFile(args[0]);
        const src  = code !== undefined ? code : args.join(' ');
        const emit = (l, tp) => {
          const c = {out:'\x1b[0m',err:'\x1b[91m',warn:'\x1b[93m',info:'\x1b[90m',ok:'\x1b[32m'};
          w((c[tp]||'\x1b[0m') + l + '\x1b[0m\r\n');
        };
        window._runJS?.(src, args[0] || 'inline', emit).then(() => {
          this.writePrompt(terminalId); t.isProcessing = false;
        });
        return;
      }

      case 'ts':
      case 'typescript': {
        if (args.length === 0) { w('\x1b[90mUsage: ts <file.ts>\x1b[0m\r\n'); break; }
        const code = readFile(args[0]);
        if (code === undefined) { w(`\x1b[31mts: ${args[0]}: No such file\x1b[0m\r\n`); break; }
        w(`\x1b[38;2;49;120;198m▶ TypeScript → JS\x1b[0m \x1b[90m(${args[0]})\x1b[0m\r\n`);
        const emit = (l, tp) => {
          const c = {out:'\x1b[0m',err:'\x1b[91m',warn:'\x1b[93m',info:'\x1b[90m',ok:'\x1b[32m'};
          w((c[tp]||'\x1b[0m') + l + '\x1b[0m\r\n');
        };
        window._runTS?.(code, args[0], emit).then(() => {
          this.writePrompt(terminalId); t.isProcessing = false;
        });
        return;
      }

      case 'run': {
        // Auto-detect and run current or given file
        const filePath = args[0]
          ? resolvePath(args[0])
          : window.IDE?.state?.activeTab;
        if (!filePath) { w('\x1b[31mNo file to run. Usage: run <file>\x1b[0m\r\n'); break; }
        const ext = filePath.split('.').pop().toLowerCase();
        w(`\x1b[38;2;85;85;255m▶ run \x1b[38;2;165;165;255m${filePath.split('/').pop()}\x1b[0m\r\n`);
        if (['py','pyw'].includes(ext)) {
          this.runPython(terminalId, [args[0] || filePath]);
          t.isProcessing = false;
          return;
        } else if (['js','mjs','cjs'].includes(ext)) {
          this.runNode(terminalId, [args[0] || filePath]);
          t.isProcessing = false;
          return;
        } else if (['ts','tsx'].includes(ext)) {
          this.runNode(terminalId, [args[0] || filePath]);
          t.isProcessing = false;
          return;
        } else {
          if (window.Runner?.execute) Runner.execute(filePath);
          else w('\x1b[90mOpening in preview/run panel…\x1b[0m\r\n');
        }
        break;
      }

      /* ── npm / package ── */
      case 'npm':
      case 'pnpm':
      case 'yarn':
      case 'bun': {
        const sub = args[0] || '';
        if (['list','ls','info'].includes(sub)) {
          w('\x1b[33m⚠ Package management not available in browser.\x1b[0m\r\n');
          w('\x1b[90mProCode IDE runs code locally in-browser.\x1b[0m\r\n');
          w('\x1b[90mFor npm/node_modules, use an external terminal.\x1b[0m\r\n');
        } else {
          w(`\x1b[33m${cmd} ${args.join(' ')}\x1b[0m\r\n`);
          w('\x1b[31m✗ Not available in browser environment\x1b[0m\r\n');
        }
        break;
      }

      /* ── Git ─��� */
      case 'git': {
        const sub = args[0] || 'help';
        if (window.GitEngine?.handleCommand) {
          const result = window.GitEngine.handleCommand(args);
          if (result) { w(result + '\r\n'); break; }
        }
        const gitMsgs = {
          status:  '\x1b[32mOn branch main\x1b[0m\r\nnothing to commit (browser git)\r\n',
          log:     '\x1b[33mcommit abc1234\x1b[0m\r\nAuthor: you\r\nDate:   just now\r\n\r\n    Browser session\r\n',
          branch:  '* \x1b[32mmain\x1b[0m\r\n',
          init:    '\x1b[32mInitialized empty Git repository\x1b[0m\r\n',
          diff:    '\x1b[90m(no diff in browser environment)\x1b[0m\r\n',
          default: `\x1b[33mgit ${sub}\x1b[0m: available via Git Engine (hamburger menu → Advanced → Git Engine)\r\n`,
        };
        w(gitMsgs[sub] || gitMsgs.default);
        break;
      }

      /* ── Misc ── */
      case 'curl':
      case 'wget':
        w(`\x1b[33m${cmd}: not available. Use fetch() in JavaScript files instead.\x1b[0m\r\n`);
        break;

      case 'open':
      case 'xdg-open':
        if (args[0]) window.open(args[0], '_blank');
        else w('\x1b[90mUsage: open <url>\x1b[0m\r\n');
        break;

      case 'sleep':
        const ms = parseFloat(args[0] || '1') * 1000;
        setTimeout(() => { this.writePrompt(terminalId); t.isProcessing = false; }, ms);
        return;

      case 'yes':
        w('\x1b[90m(yes loops infinitely — not available)\x1b[0m\r\n');
        break;

      case 'which':
        const which_cmds = ['python','python3','node','js','ts','run','ls','cd','cat','grep','find'];
        if (args[0] && which_cmds.includes(args[0])) w(`/usr/bin/${args[0]}\r\n`);
        else w(`${args[0]}: not found\r\n`);
        break;

      case 'alias':
        w('\x1b[90malias py=python · ll="ls -la" · cls=clear\x1b[0m\r\n');
        break;

      case 'exit':
      case 'logout':
        w('\x1b[90m(close the terminal panel with the × button)\x1b[0m\r\n');
        break;

      /* ── Fallthrough for language executors from prev patch ── */
      default:
        // Try language-specific commands (ruby, lua, dart, etc.)
        const langMap = {
          ruby:['rb'],php:['php'],lua:['lua'],perl:['pl'],r:['r'],
          julia:['jl'],elixir:['exs','ex'],groovy:['groovy'],
          dart:['dart'],swift:['swift'],go:['go'],
          kotlin:['kt','kts'],scala:['scala'],rust:['rs'],rustc:['rs'],
          zig:['zig'],nim:['nim'],
        };
        if (langMap[cmd]) {
          if (args.length === 0) {
            w(`\x1b[33m${cmd} REPL not available in browser.\x1b[0m\r\n`);
            w(`\x1b[90mUsage: ${cmd} <file.${langMap[cmd][0]}>\x1b[0m\r\n`);
          } else {
            const fp = resolvePath(args[0]);
            const fc = window.IDE?.state?.files?.[fp];
            if (fc === undefined) { w(`\x1b[31m${cmd}: ${args[0]}: No such file\x1b[0m\r\n`); break; }
            w(`\x1b[38;2;119;119;200m▶ ${cmd} ${args[0]}\x1b[0m\r\n`);
            w(`\x1b[90m── Code preview (${fc.split('\n').length} lines) ──\x1b[0m\r\n`);
            fc.split('\n').slice(0,15).forEach((l,i) =>
              w(`\x1b[90m${String(i+1).padStart(3)}\x1b[0m  ${l}\r\n`)
            );
            if (fc.split('\n').length > 15) w(`\x1b[90m… ${fc.split('\n').length-15} more lines\x1b[0m\r\n`);
            w('\r\n');
            const instructions = {
              ruby:`ruby ${args[0]}`, php:`php ${args[0]}`, lua:`lua ${args[0]}`,
              perl:`perl ${args[0]}`, r:`Rscript ${args[0]}`, julia:`julia ${args[0]}`,
              elixir:`elixir ${args[0]}`, groovy:`groovy ${args[0]}`, dart:`dart run ${args[0]}`,
              swift:`swift ${args[0]}`, go:`go run ${args[0]}`, kotlin:`kotlinc -script ${args[0]}`,
              scala:`scala ${args[0]}`, rust:`rustc ${args[0]} && ./${args[0].replace('.rs','')}`,
              rustc:`rustc ${args[0]}`, zig:`zig run ${args[0]}`, nim:`nim r ${args[0]}`,
            };
            w(`\x1b[33m▶ To run locally:\x1b[0m \x1b[32m${instructions[cmd] || cmd + ' ' + args[0]}\x1b[0m\r\n`);
          }
          break;
        }

        // Unknown command
        w(`\x1b[31mcommand not found:\x1b[0m ${cmd}\r\n`);
        w(`\x1b[90mType \x1b[33mhelp\x1b[90m for available commands\x1b[0m\r\n`);
    }

    t.isProcessing = false;
    this.writePrompt(terminalId);
  };

  /* ── Extra file commands ── */
  TerminalManager._headFile = function(terminalId, args) {
    const t = this.terminals[terminalId];
    const n = parseInt(args.find(a => a.startsWith('-'))?.slice(1) || '10');
    const filename = args.find(a => !a.startsWith('-'));
    if (!filename) { t.instance.write('Usage: head [-N] <file>\r\n'); return; }
    const content = window.IDE?.state?.files?.[_resolveTermFile(terminalId, filename)];
    if (content === undefined) { t.instance.write(`head: ${filename}: No such file\r\n`); return; }
    content.split('\n').slice(0, n).forEach(l => t.instance.write(l + '\r\n'));
  };

  TerminalManager._tailFile = function(terminalId, args) {
    const t = this.terminals[terminalId];
    const n = parseInt(args.find(a => a.startsWith('-'))?.slice(1) || '10');
    const filename = args.find(a => !a.startsWith('-'));
    if (!filename) { t.instance.write('Usage: tail [-N] <file>\r\n'); return; }
    const content = window.IDE?.state?.files?.[_resolveTermFile(terminalId, filename)];
    if (content === undefined) { t.instance.write(`tail: ${filename}: No such file\r\n`); return; }
    content.split('\n').slice(-n).forEach(l => t.instance.write(l + '\r\n'));
  };

  TerminalManager._wcFile = function(terminalId, args) {
    const t = this.terminals[terminalId];
    const filename = args.find(a => !a.startsWith('-'));
    if (!filename) { t.instance.write('Usage: wc <file>\r\n'); return; }
    const content = window.IDE?.state?.files?.[_resolveTermFile(terminalId, filename)];
    if (content === undefined) { t.instance.write(`wc: ${filename}: No such file\r\n`); return; }
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const bytes = new Blob([content]).size;
    t.instance.write(`\x1b[90m${String(lines).padStart(6)} ${String(words).padStart(7)} ${String(bytes).padStart(7)}\x1b[0m  ${filename}\r\n`);
  };

  /* ── Upgraded showHelp ── */
  TerminalManager._showHelpV9 = function(terminalId) {
    const t = this.terminals[terminalId];
    const w = s => t.instance.write(s);
    const h = (title) => `\r\n\x1b[1;38;2;119;119;255m${title}\x1b[0m\r\n`;
    const c = (cmd, desc) => `  \x1b[38;2;165;165;255m${cmd.padEnd(22)}\x1b[0m\x1b[90m${desc}\x1b[0m\r\n`;
    const k = (key, desc) => `  \x1b[38;2;250;204;21m${key.padEnd(22)}\x1b[0m\x1b[90m${desc}\x1b[0m\r\n`;

    w(h('Navigation'));
    w(c('ls [-la]',          'list files'));
    w(c('cd <dir>',          'change directory'));
    w(c('pwd',               'print working directory'));
    w(c('pushd / popd',      'directory stack'));
    w(h('Files'));
    w(c('cat <file>',        'print file'));
    w(c('head/tail [-N]',    'first/last N lines'));
    w(c('wc <file>',         'word/line/byte count'));
    w(c('touch <file>',      'create empty file'));
    w(c('mkdir <dir>',       'create directory'));
    w(c('rm [-r] <file>',    'remove file/dir'));
    w(c('cp <src> <dst>',    'copy file'));
    w(c('mv <src> <dst>',    'move/rename'));
    w(c('find <pattern>',    'search files'));
    w(c('grep <pat> <file>', 'search in file'));
    w(c('sort/uniq <file>',  'sort or deduplicate lines'));
    w(h('Language Runners'));
    w(c('python <file.py>',  '✅ run Python (Pyodide WebAssembly)'));
    w(c('python3 <file.py>', '✅ alias for python'));
    w(c('node <file.js>',    '✅ run JavaScript (in-browser sandbox)'));
    w(c('ts <file.ts>',      '✅ transpile + run TypeScript'));
    w(c('js "<code>"',       '✅ run inline JavaScript'));
    w(c('run <file>',        '✅ auto-detect language and run'));
    w(c('ruby/php/lua/perl', '⚙  show code + local run instructions'));
    w(c('go/rust/dart/swift','⚙  show code + local run instructions'));
    w(h('System'));
    w(c('echo <text>',       'print text'));
    w(c('clear / reset',     'clear terminal'));
    w(c('history',           'command history'));
    w(c('which <cmd>',       'find command'));
    w(c('date / uname',      'system info'));
    w(c('env',               'environment variables'));
    w(c('open <url>',        'open URL in browser'));
    w(c('sleep <sec>',       'wait N seconds'));
    w(h('Shortcuts'));
    w(k('↑ / ↓',            'command history'));
    w(k('Tab',               'autocomplete'));
    w(k('Ctrl+C',            'cancel'));
    w(k('Ctrl+L',            'clear screen'));
    w(k('Ctrl+A / Ctrl+E',   'line start/end'));
    w('\r\n');
  };

  /* ── Update autocomplete suggestions ── */
  TerminalManager.getCommandSuggestions = function(input) {
    const commands = [
      'help','ls','ll','dir','cd','pwd','pushd','popd',
      'cat','head','tail','wc','touch','mkdir','rm','cp','mv','find','grep',
      'echo','sort','uniq',
      'python','python3','py','node','nodejs','js','ts','typescript','run',
      'ruby','php','lua','perl','r','julia','elixir','groovy','dart',
      'swift','go','rust','rustc','kotlin','scala','zig','nim',
      'npm','yarn','pnpm','git',
      'clear','cls','reset','history','which','alias','date','uname',
      'uptime','env','whoami','open','sleep','exit','version',
    ];
    const fileSuggestions = this.getFileSuggestions(input);
    return [...commands, ...fileSuggestions].filter(item => item.toLowerCase().startsWith(input.toLowerCase()));
  };

  console.log('%c[Terminal v9] Command engine upgraded ✅', 'color:#7777ff;font-weight:bold');
})();

/* ════════════════════════════════════════════════════════════
   PART 7 — RUNNER FIX for all web/JS/TS variants
══════════════════════════════════════════���═════════════════ */
(function fixRunnerSwitch() {
  if (!window.Runner) return setTimeout(arguments.callee, 800);

  // Patch Runner.execute to also handle js/ts via runNode
  const _origExecute = Runner.execute?.bind(Runner);
  Runner.execute = function(filePath) {
    if (!filePath) filePath = window.IDE?.state?.activeTab;
    if (!filePath) { window.Utils?.toast?.('No file open', 'error'); return; }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    // JS/TS standalone run via node-style runner
    if (['js','mjs','cjs'].includes(ext)) {
      // Check if it has DOM APIs — if so, run as web
      const code = window.FileSystem?.read(filePath) || '';
      if (code.includes('document.') || code.includes('window.') || code.includes('getElementById')) {
        this.runWeb(filePath);
      } else {
        this.runNode(filePath);
      }
      return;
    }
    if (['ts','mts'].includes(ext) && !filePath.endsWith('.d.ts')) {
      const code = window.FileSystem?.read(filePath) || '';
      if (code.includes('document.') || code.includes('querySelector')) {
        this.runWeb(filePath);
      } else {
        this.runNode(filePath);
      }
      return;
    }

    if (_origExecute) _origExecute(filePath);
  };
})();

/* ═════════��══════════════════════════════════════════════════
   PART 8 — CONSOLE panel upgrade: structured output
════════════════════════════════════════════════════════════ */
(function upgradeConsole() {
  if (!window.Console) return setTimeout(arguments.callee, 800);

  const _consoleHost = () => document.getElementById('console-host');

  function _append(type, ...args) {
    const host = _consoleHost();
    if (!host) return;
    const div = document.createElement('div');
    div.className = `console-line console-${type}`;
    const icons = { log:'', info:'ℹ ', warn:'⚠ ', error:'✗ ', success:'✓ ' };
    const msg = args.map(a => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
      }
      return String(a);
    }).join(' ');
    div.textContent = (icons[type]||'') + msg;
    host.appendChild(div);
    // Auto-scroll
    host.scrollTop = host.scrollHeight;
    // Update badge
    if (window.TermBadge) {
      const cur = parseInt(document.getElementById('console-badge')?.textContent || '0') + 1;
      TermBadge.set('console', cur, type === 'error' ? 'error' : '');
    }
  }

  Console.log     = (...a) => _append('log',     ...a);
  Console.info    = (...a) => _append('info',    ...a);
  Console.warn    = (...a) => _append('warn',    ...a);
  Console.error   = (...a) => _append('error',   ...a);
  Console.success = (...a) => _append('success', ...a);
  Console.clear   = ()     => {
    const h = _consoleHost(); if (h) h.innerHTML = '';
    if (window.TermBadge) TermBadge.set('console', 0);
  };
})();

console.log('%c[ProCode v9] Terminal + Language Runtime fully upgraded', 'color:#4ade80;font-weight:800;font-size:13px');