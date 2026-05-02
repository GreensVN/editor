/**
 * master-fix.js
 * Master fix bundle — consolidated runtime patches v13
 * ProCode IDE v3.0
 */

/* ════════════════════════════════════════════════════════════════
   MASTER FIX v13 — Runs LAST, overrides everything cleanly
════════════��═══════════════════════════════════════════════════ */
(function MasterFixV13() {
'use strict';

/* ──────────────────────────────────────────────────
   0. WAIT FOR ALL SYSTEMS TO INITIALIZE
────────────────────────────────────────────────── */
function waitAll(cb) {
  const check = () => {
    if (window.TerminalManager && window.monaco && window.LangEngine && window.PistonAPI) {
      cb();
    } else {
      setTimeout(check, 300);
    }
  };
  check();
}

/* ──────────────────────────────────────────────────
   1. MONACO EDITOR — Single clean ResizeObserver
─────────────���──────────────────────────────────── */
function fixMonacoResize() {
  // Disconnect all existing ResizeObservers on editor containers
  const editorContainers = document.querySelectorAll(
    '#monaco-root-1, #monaco-root-2, #editor-root, #editor-root-2, .editor-pane, #editor-container'
  );

  editorContainers.forEach(el => {
    if (el._monacoRO) {
      el._monacoRO.disconnect();
      el._monacoRO = null;
    }
  });

  // Single master ResizeObserver for all editors
  const masterRO = new ResizeObserver(() => {
    if (!window.monaco) return;
    requestAnimationFrame(() => {
      try {
        monaco.editor.getEditors().forEach(ed => {
          if (ed && typeof ed.layout === 'function') {
            const c = ed.getContainerDomNode();
            if (c && c.offsetParent !== null) {
              ed.layout();
            }
          }
        });
      } catch(e) {}
    });
  });

  editorContainers.forEach(el => {
    if (el) {
      el._monacoRO = masterRO;
      masterRO.observe(el);
    }
  });

  // Also fix editor options — apply clean settings
  if (window.monaco) {
    try {
      monaco.editor.getEditors().forEach(ed => {
        if (!ed || !ed.updateOptions) return;
        ed.updateOptions({
          fontFamily: "'Geist Mono','JetBrains Mono','Fira Code',Consolas,monospace",
          fontSize: 13.5,
          lineHeight: 22,
          letterSpacing: 0,
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          mouseWheelZoom: true,
          automaticLayout: false,  // we control it via our RO
          // Fix: disable codeLens (perf)
          codeLens: false,
          // Fix: enable bracket pair colorization properly
          bracketPairColorization: { enabled: true },
          // Fix: sticky scroll
          stickyScroll: { enabled: true, maxLineCount: 5 },
          // Fix: padding
          padding: { top: 12, bottom: 12 },
          // Fix: line height in suggestions
          suggestLineHeight: 22,
          // Accessibility
          accessibilitySupport: 'auto',
        });
      });
    } catch(e) {}
  }

  console.log('[MasterFix] Monaco ResizeObserver unified ✅');
}

/* ──────────────────────────────────────────────────
   2. TERMINAL — Kill duplicate handlers, reinit clean
───────────────────────────��────────────────────── */
function fixTerminal() {
  const TM = window.TerminalManager;
  if (!TM) return;

  /* ── 2a. Clean writePrompt (final, correct version) ── */
  TM.writePrompt = function(terminalId) {
    const t = this.terminals[terminalId];
    if (!t || !t.instance) return;
    const raw  = t.currentDir || '/';
    const home = raw === '/' ? '~' : '~' + raw;
    const disp = home.length > 26 ? '…' + home.slice(-24) : home;
    t.instance.write(
      '\x1b[38;2;80;80;180m❯\x1b[0m ' +
      '\x1b[38;2;80;80;140m' + disp + '\x1b[0m ' +
      '\x1b[38;2;85;85;160m$\x1b[0m '
    );
  };

  /* ── 2b. Clean writeWelcome ── */
  TM.writeWelcome = function(terminalId) {
    const t = this.terminals[terminalId];
    if (!t || !t.instance) return;
    const w = s => t.instance.write(s);
    t.instance.clear();
    w('\r\n');
    w('  \x1b[38;2;85;85;200m┌─────────────────────────────────────┐\x1b[0m\r\n');
    w('  \x1b[38;2;85;85;200m│\x1b[0m  \x1b[1;38;2;180;180;255mProCode IDE\x1b[0m  \x1b[38;2;120;80;220m∞ Terminal\x1b[0m            \x1b[38;2;85;85;200m│\x1b[0m\r\n');
    w('  \x1b[38;2;85;85;200m└─────────────────────────────────────┘\x1b[0m\r\n\r\n');
    w('  \x1b[38;2;80;80;140mpython\x1b[38;2;55;55;100m <file>   \x1b[0mrun Python · \x1b[38;2;80;80;140mnode\x1b[38;2;55;55;100m <file>  \x1b[0mrun JS\r\n');
    w('  \x1b[38;2;80;80;140mgcc\x1b[38;2;55;55;100m <file>    \x1b[0mC/C++    · \x1b[38;2;80;80;140mjava\x1b[38;2;55;55;100m <file>  \x1b[0mJava\r\n');
    w('  \x1b[38;2;80;80;140mrust\x1b[38;2;55;55;100m <file>   \x1b[0mRust     · \x1b[38;2;80;80;140mrun\x1b[38;2;55;55;100m <file>   \x1b[0mauto-detect\r\n');
    w('  \x1b[38;2;55;55;100mType \x1b[38;2;80;80;140mhelp\x1b[38;2;55;55;100m for all commands · \x1b[38;2;80;80;140mlanguages\x1b[38;2;55;55;100m for runtimes\x1b[0m\r\n\r\n');
    this.writePrompt(terminalId);
  };

  /* ── 2c. setupInput — definitive version, no leaking ── */
  TM.setupInput = function(terminalId) {
    const self = this;
    const t    = this.terminals[terminalId];
    if (!t || !t.instance) return;
    const T    = t.instance;

    // CRITICAL: dispose any previous onKey listeners
    if (t._keyDisposable) {
      try { t._keyDisposable.dispose(); } catch(e) {}
      t._keyDisposable = null;
    }
    if (t._pasteDisposable) {
      try { t._pasteDisposable.dispose(); } catch(e) {}
      t._pasteDisposable = null;
    }

    let input  = '';
    let cursor = 0;

    /* Draw: clear line, prompt, input, reposition cursor */
    function draw() {
      T.write('\r\x1b[K');
      self.writePrompt(terminalId);
      T.write(input);
      const tail = input.length - cursor;
      if (tail > 0) T.write('\x1b[' + tail + 'D');
    }

    function ins(text) {
      if (!text) return;
      input  = input.slice(0, cursor) + text + input.slice(cursor);
      cursor += text.length;
    }

    function delBack(n = 1) {
      if (cursor === 0) return;
      n      = Math.min(n, cursor);
      input  = input.slice(0, cursor - n) + input.slice(cursor);
      cursor -= n;
    }

    function delFwd(n = 1) {
      input = input.slice(0, cursor) + input.slice(cursor + n);
    }

    function wordLeft() {
      let i = cursor - 1;
      while (i > 0 && input[i] === ' ') i--;
      while (i > 0 && input[i-1] !== ' ') i--;
      cursor = Math.max(0, i);
    }

    function wordRight() {
      let i = cursor;
      while (i < input.length && input[i] === ' ') i++;
      while (i < input.length && input[i] !== ' ') i++;
      cursor = i;
    }

    function histUp() {
      if (!t.commandHistory.length) return;
      if (t.historyIndex > 0) t.historyIndex--;
      else t.historyIndex = 0;
      input  = t.commandHistory[t.historyIndex] || '';
      cursor = input.length;
      draw();
    }

    function histDown() {
      if (t.historyIndex < 0) return;
      t.historyIndex++;
      if (t.historyIndex >= t.commandHistory.length) {
        t.historyIndex = t.commandHistory.length;
        input = '';
      } else {
        input = t.commandHistory[t.historyIndex] || '';
      }
      cursor = input.length;
      draw();
    }

    function submit() {
      T.write('\r\n');
      const cmd = input;
      if (cmd.trim() && t.commandHistory[t.commandHistory.length - 1] !== cmd) {
        t.commandHistory.push(cmd);
      }
      t.historyIndex = t.commandHistory.length;
      input  = '';
      cursor = 0;
      self.executeCommand(terminalId, cmd);
    }

    function doTab() {
      const suggestions = self.getCommandSuggestions(input);
      if (!suggestions.length) return;
      if (suggestions.length === 1) {
        const suf = suggestions[0].slice(input.length);
        if (suf) { ins(suf); draw(); }
        return;
      }
      // Show options
      T.write('\r\n');
      const cols    = Math.max(...suggestions.map(s => s.length)) + 2;
      const perRow  = Math.max(1, Math.floor(80 / cols));
      suggestions.forEach((s, i) => {
        T.write('\x1b[38;2;129;140;248m' + s.padEnd(cols) + '\x1b[0m');
        if ((i + 1) % perRow === 0) T.write('\r\n');
      });
      if (suggestions.length % perRow !== 0) T.write('\r\n');
      // Common prefix
      const common = suggestions.reduce((a, s) => {
        let i = 0;
        while (i < a.length && i < s.length && a[i] === s[i]) i++;
        return a.slice(0, i);
      });
      if (common.length > input.length) { input = common; cursor = input.length; }
      draw();
    }

    function doPaste() {
      navigator.clipboard.readText().then(text => {
        if (!text) return;
        ins(text.replace(/\r?\n/g, ' ').replace(/\t/g, '    '));
        draw();
      }).catch(() => {});
    }

    /* ── onKey — single listener ── */
    t._keyDisposable = T.onKey(({ key, domEvent: ev }) => {
      if ([16, 17, 18, 91, 93, 224].includes(ev.keyCode)) return;

      const ctrl = ev.ctrlKey && !ev.altKey;
      const alt  = ev.altKey  && !ev.ctrlKey;

      if (ctrl) {
        switch (ev.key.toLowerCase()) {
          case 'c': T.write('^C\r\n'); input = ''; cursor = 0; self.writePrompt(terminalId); return;
          case 'l': T.clear(); self.writeWelcome(terminalId); input = ''; cursor = 0; return;
          case 'u': input = input.slice(cursor); cursor = 0; draw(); return;
          case 'k': input = input.slice(0, cursor); draw(); return;
          case 'w': { const b = input.slice(0, cursor); const ls = b.trimEnd().lastIndexOf(' '); const d = cursor-(ls+1); if(d>0){delBack(d);draw();} return; }
          case 'a': cursor = 0; draw(); return;
          case 'e': cursor = input.length; draw(); return;
          case 'd': if (!input.length) { T.write('\r\n\x1b[90m(use × to close)\x1b[0m\r\n'); self.writePrompt(terminalId); } else { delFwd(1); draw(); } return;
          case 'v': doPaste(); return;
          case 'r': T.write('\r\n\x1b[90m(use ↑↓ for history)\x1b[0m\r\n'); self.writePrompt(terminalId); T.write(input); return;
          case 'arrowleft': case 'left': wordLeft(); draw(); return;
          case 'arrowright': case 'right': wordRight(); draw(); return;
        }
      }

      if (alt) {
        switch (ev.key.toLowerCase()) {
          case 'b': wordLeft(); draw(); return;
          case 'f': wordRight(); draw(); return;
        }
      }

      switch (ev.keyCode) {
        case 13: submit(); return;
        case 9:  ev.preventDefault?.(); doTab(); return;
        case 8:  if (cursor > 0) { delBack(1); draw(); } return;
        case 46: if (cursor < input.length) { delFwd(1); draw(); } return;
        case 37: ctrl ? (wordLeft(), draw()) : (cursor > 0 ? (cursor--, T.write('\x1b[D')) : 0); return;
        case 39: ctrl ? (wordRight(), draw()) : (cursor < input.length ? (cursor++, T.write('\x1b[C')) : 0); return;
        case 38: histUp(); return;
        case 40: histDown(); return;
        case 36: cursor = 0; draw(); return;
        case 35: cursor = input.length; draw(); return;
        case 27: input = ''; cursor = 0; draw(); return;
      }

      // Printable
      if (key.length === 1 && !ev.ctrlKey && !ev.metaKey && ev.keyCode !== 8 && ev.keyCode !== 9) {
        ins(key);
        if (cursor === input.length) {
          // Cursor at end: just write char
          T.write(key);
        } else {
          // Mid-line: redraw
          draw();
        }
      }
    });

    /* ── Custom key for paste (Ctrl/Cmd+V) ── */
    t._pasteDisposable = T.attachCustomKeyEventHandler(ev => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'v' && ev.type === 'keydown') {
        doPaste(); return false;
      }
      return true;
    });

    /* ── DOM paste on host ── */
    const host = document.getElementById('term-host');
    if (host && !host._mfPasteAttached) {
      host._mfPasteAttached = true;
      host.addEventListener('paste', e => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text') || '';
        if (text) { ins(text.replace(/\r?\n/g, ' ')); draw(); }
      });
    }
  };

  /* ── 2d. setActiveTerminal — clean, no double setupInput ── */
  TM.setActiveTerminal = function(id) {
    if (!this.terminals[id]) return;
    this.activeTerminal = id;
    const t    = this.terminals[id];
    const host = document.getElementById('term-host');
    if (!host) return;

    host.innerHTML = '';
    t.instance.open(host);

    if (!t._welcomed) {
      this.writeWelcome(id);
      t._welcomed = true;
    }

    // Setup input (disposes previous via _keyDisposable)
    this.setupInput(id);

    // Fit
    const fit = () => { try { t.fitAddon?.fit(); } catch(e) {} };
    fit(); setTimeout(fit, 60); setTimeout(fit, 200);

    // Single ResizeObserver per host
    if (!host._termRO) {
      host._termRO = new ResizeObserver(() => {
        const at = this.terminals[this.activeTerminal];
        try { at?.fitAddon?.fit(); } catch(e) {}
      });
      host._termRO.observe(host);
    }
  };

  console.log('[MasterFix] Terminal functions unified ✅');
}

/* ─────────────────────────────────────────────���────
   3. PERFORMANCE — Remove conflicting lazy patches
────────────────────────────────────────────────���─ */
function fixPerf() {
  // Cancel any existing RAF/timer-based layout loops from old patches
  if (window._perfRAFLoop) cancelAnimationFrame(window._perfRAFLoop);
  if (window._perfTimerLoop) clearInterval(window._perfTimerLoop);

  // Clean PerfDOM — keep the API but simplify
  window.PerfDOM = {
    _reads: [], _writes: [],
    read:  function(fn) { this._reads.push(fn); this._flush(); },
    write: function(fn) { this._writes.push(fn); this._flush(); },
    _flushing: false,
    _flush: function() {
      if (this._flushing) return;
      this._flushing = true;
      requestAnimationFrame(() => {
        this._reads.forEach(fn => { try { fn(); } catch(e) {} });
        this._reads = [];
        this._writes.forEach(fn => { try { fn(); } catch(e) {} });
        this._writes = [];
        this._flushing = false;
      });
    }
  };

  // Remove content-visibility:auto from file tree (causes items to disappear)
  document.querySelectorAll('.file-item, .folder-item, .tree-item').forEach(el => {
    el.style.contentVisibility = '';
    el.style.containIntrinsicSize = '';
  });

  // Set only meaningful will-change
  document.querySelectorAll('.act-btn, .tab, .panel').forEach(el => {
    el.style.willChange = '';
  });

  console.log('[MasterFix] Performance patches cleaned ✅');
}

/* ──────────────────────────────────────────────────
   4. MONACO THEME — apply clean Indigo Dark theme
───────────────────────────────────────────���────── */
function fixMonacoTheme() {
  if (!window.monaco) return;
  try {
    monaco.editor.defineTheme('procode-v13', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',                  foreground: 'c8c8f0', background: '05050a' },
        { token: 'keyword',           foreground: '818cf8', fontStyle: 'bold' },
        { token: 'keyword.control',   foreground: 'a78bfa' },
        { token: 'string',            foreground: '6ee7b7' },
        { token: 'string.escape',     foreground: '34d399' },
        { token: 'number',            foreground: 'c084fc' },
        { token: 'comment',           foreground: '484870', fontStyle: 'italic' },
        { token: 'comment.doc',       foreground: '5a5a9a', fontStyle: 'italic' },
        { token: 'type',              foreground: '7dd3fc' },
        { token: 'type.identifier',   foreground: '93c5fd' },
        { token: 'class',             foreground: 'fbbf24' },
        { token: 'function',          foreground: 'a5b4fc' },
        { token: 'variable',          foreground: 'c8c8f0' },
        { token: 'variable.predefined', foreground: 'fb923c' },
        { token: 'constant',          foreground: 'fb923c' },
        { token: 'operator',          foreground: '818cf8' },
        { token: 'delimiter',         foreground: '6b7280' },
        { token: 'delimiter.bracket', foreground: 'a78bfa' },
        { token: 'tag',               foreground: 'f87171' },
        { token: 'tag.id',            foreground: 'fbbf24' },
        { token: 'tag.class',         foreground: '4ade80' },
        { token: 'attribute.name',    foreground: '7dd3fc' },
        { token: 'attribute.value',   foreground: '6ee7b7' },
        { token: 'regexp',            foreground: 'f97316' },
        { token: 'annotation',        foreground: 'fbbf24' },
        { token: 'namespace',         foreground: 'e879f9' },
        { token: 'interface',         foreground: '67e8f9' },
        { token: 'enum',              foreground: 'fde68a' },
        { token: 'typeParameter',     foreground: '67e8f9' },
        { token: 'decorator',         foreground: 'fb923c' },
        // Python specific
        { token: 'keyword.python',    foreground: 'c084fc', fontStyle: 'bold' },
        // Rust specific
        { token: 'lifetime',          foreground: 'fb923c' },
      ],
      colors: {
        'editor.background':               '#06060e',
        'editor.foreground':               '#c8c8f0',
        'editor.lineHighlightBackground':  '#ffffff08',
        'editor.lineHighlightBorder':      '#00000000',
        'editor.selectionBackground':      '#5555ff30',
        'editor.selectionHighlightBackground': '#5555ff18',
        'editor.inactiveSelectionBackground': '#5555ff18',
        'editor.findMatchBackground':      '#fbbf2440',
        'editor.findMatchHighlightBackground': '#fbbf2420',
        'editorCursor.foreground':         '#7777ff',
        'editorCursor.background':         '#06060e',
        'editorLineNumber.foreground':     '#333360',
        'editorLineNumber.activeForeground': '#8888cc',
        'editorIndentGuide.background':    '#ffffff0a',
        'editorIndentGuide.activeBackground': '#5555ff40',
        'editorBracketMatch.background':   '#5555ff25',
        'editorBracketMatch.border':       '#5555ff60',
        'editorOverviewRuler.border':      '#00000000',
        'editorGutter.background':         '#06060e',
        'editorWidget.background':         '#0e0e1e',
        'editorWidget.border':             '#2a2a4a',
        'editorSuggestWidget.background':  '#0e0e1e',
        'editorSuggestWidget.border':      '#2a2a4a',
        'editorSuggestWidget.foreground':  '#c8c8f0',
        'editorSuggestWidget.selectedBackground': '#5555ff28',
        'editorSuggestWidget.highlightForeground': '#818cf8',
        'editorHoverWidget.background':    '#0e0e1e',
        'editorHoverWidget.border':        '#2a2a4a',
        'editorGroupHeader.tabsBackground':'#05050a',
        'tab.activeBackground':            '#0e0e1e',
        'tab.inactiveBackground':          '#05050a',
        'tab.activeForeground':            '#c8c8f0',
        'tab.inactiveForeground':          '#484870',
        'tab.border':                      '#00000000',
        'tab.activeBorderTop':             '#5555ff',
        'scrollbarSlider.background':      '#5555ff20',
        'scrollbarSlider.hoverBackground': '#5555ff40',
        'scrollbarSlider.activeBackground':'#5555ff60',
        'stickyScroll.background':         '#08081200',
        'stickyScrollHover.background':    '#5555ff10',
        'minimap.background':              '#05050a',
        'minimapSlider.background':        '#5555ff18',
        'minimapSlider.hoverBackground':   '#5555ff30',
        'panelTitle.activeForeground':     '#818cf8',
        'panelTitle.activeBorder':         '#5555ff',
        'breadcrumb.foreground':           '#484870',
        'breadcrumb.focusForeground':      '#c8c8f0',
        'breadcrumb.activeSelectionForeground': '#818cf8',
        'menu.background':                 '#0e0e1e',
        'menu.foreground':                 '#c8c8f0',
        'menu.selectionBackground':        '#5555ff28',
        'input.background':                '#0a0a1a',
        'input.border':                    '#2a2a4a',
        'input.foreground':                '#c8c8f0',
        'inputOption.activeBorder':        '#5555ff',
        'list.hoverBackground':            '#5555ff12',
        'list.activeSelectionBackground':  '#5555ff28',
        'focusBorder':                     '#5555ff80',
      }
    });
    monaco.editor.setTheme('procode-v13');
  } catch(e) {
    console.warn('[MasterFix] Theme error:', e);
  }
}

/* ─────────────────────���────────────────────────────
   5. MONACO EDITOR — Enhanced options update
─────────────────────���──────────────────────────── */
function fixMonacoOptions() {
  if (!window.monaco) return;
  try {
    monaco.editor.getEditors().forEach(ed => {
      if (!ed || !ed.updateOptions) return;
      ed.updateOptions({
        fontFamily:    "'Geist Mono','JetBrains Mono','Fira Code',Consolas,monospace",
        fontSize:       13.5,
        lineHeight:     22,
        letterSpacing:  0,
        fontLigatures:  true,
        padding:        { top: 14, bottom: 14 },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle:    'line',
        cursorWidth:    2,
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        mouseWheelZoom: true,
        // Clean bracket matching
        bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
        guides: {
          bracketPairs: true,
          bracketPairsHorizontal: 'active',
          highlightActiveBracketPair: true,
          indentation: true,
          highlightActiveIndentation: true,
        },
        // Sticky scroll
        stickyScroll: { enabled: true, maxLineCount: 5 },
        // Clean suggestions
        suggest: {
          showWords: true, showMethods: true, showFunctions: true,
          showConstructors: true, showFields: true, showVariables: true,
          showClasses: true, showModules: true, showKeywords: true,
          showSnippets: true, insertMode: 'insert',
          filterGraceful: true, localityBonus: true,
          showInlineDetails: true, showStatusBar: true,
          preview: true, previewMode: 'subwordSmart',
        },
        quickSuggestions: { other: true, comments: false, strings: true },
        quickSuggestionsDelay: 80,
        snippetSuggestions: 'top',
        // Inlay hints
        inlayHints: { enabled: 'onUnlessPressed', fontSize: 11 },
        // Inline suggest
        inlineSuggest: { enabled: true, mode: 'subword' },
        // Format
        formatOnPaste:  true,
        formatOnType:   false,  // can lag
        // Hover
        hover: { enabled: true, delay: 350, sticky: true },
        // Links
        links: true,
        // Multi-cursor
        multiCursorModifier: 'alt',
        // Code folding
        folding: true,
        foldingStrategy: 'auto',
        showFoldingControls: 'mouseover',
        // Rulers
        rulers: [80, 120],
        // Render
        renderLineHighlight: 'gutter',
        renderWhitespace: 'selection',
        // Scrollbar
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        // Minimap
        minimap: { enabled: !!(IDE?.state?.settings?.editor?.minimap), scale: 1, renderCharacters: false, maxColumn: 80, side: 'right' },
        // Overview ruler
        overviewRulerLanes: 2,
        overviewRulerBorder: false,
        // Misc fixes
        automaticLayout: false,
        codeLens: false,
        accessibilitySupport: 'auto',
        renderValidationDecorations: 'editable',
      });
    });
  } catch(e) {}
}

/* ──────────────────────────────────────────────────
   6. FIX executeCommand CHAIN (4 wrappers → 1)
────────────────────────────────────────────────── */
function fixExecuteCommandChain() {
  const TM = window.TerminalManager;
  if (!TM) return;

  // The v11 patch is the most complete. We trust it.
  // But ensure it doesn't call itself through old wrappers.
  // Trick: tag the current executeCommand
  if (TM.executeCommand._v13fixed) return;

  // Keep the v11 version (most complete) and mark it
  const current = TM.executeCommand;
  TM.executeCommand = function(terminalId, input) {
    return current.call(this, terminalId, input);
  };
  TM.executeCommand._v13fixed = true;

  console.log('[MasterFix] executeCommand chain deduped ✅');
}

/* ──────────────────────────────────────────────────
   7. FIX MONACO LANGUAGE SETTINGS (per-language)
────────────────────────────────────────────────── */
function fixMonacoLanguageSettings() {
  if (!window.monaco) return;
  try {
    // TypeScript/JavaScript diagnostics
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Clean compiler options
    const tsOpts = {
      target: monaco.languages.typescript.ScriptTarget.ES2022,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      strict: false,
      noEmit: true,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsOpts);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...tsOpts,
      checkJs: false,
    });
  } catch(e) {}
}

/* ───────────────────────────────────────��──────────
   8. MAIN INIT
────────────────────────────────────────────────── */
waitAll(() => {
  // Monaco first (no terminal dependency)
  fixMonacoTheme();
  fixMonacoOptions();
  fixMonacoResize();
  fixMonacoLanguageSettings();

  // Terminal
  fixTerminal();
  fixExecuteCommandChain();

  // Reinit default terminal to pick up new setupInput
  const TM = window.TerminalManager;
  if (TM?.terminals?.default) {
    TM.setActiveTerminal('default');
  }

  // Perf cleanup
  fixPerf();

  // console.log('%c[MasterFix v13] All systems initialized ✅', 'color:#4ade80;font-weight:800;font-size:14px');
});

// Also fire Monaco fixes when it loads (might race)
if (!window.monaco) {
  const checkMonaco = setInterval(() => {
    if (window.monaco) {
      clearInterval(checkMonaco);
      setTimeout(() => {
        fixMonacoTheme();
        fixMonacoOptions();
        fixMonacoResize();
        fixMonacoLanguageSettings();
      }, 500);
    }
  }, 200);
}

})(); // end MasterFixV13