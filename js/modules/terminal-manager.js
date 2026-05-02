/**
 * terminal-manager.js
 * TerminalManager — xterm.js terminal integration
 * ProCode IDE v3.0
 */

// ============================================
// ENHANCED TERMINAL MANAGER
// ============================================
const TerminalManager = {
    instance: null,
    fitAddon: null,
    webLinksAddon: null,
    currentDir: '/',
    commandHistory: [],
    historyIndex: -1,
    terminals: {},
    activeTerminal: 'default',
    
    init: function() {
        // suppressed
        
        this.createTerminal('default');
        this.setActiveTerminal('default');
        
        // Suppressed: routine boot notification
        // Utils.toast('Terminal ready', 'success');
    },
    
    createTerminal: function(id = null) {
        const terminalId = id || `terminal-${Date.now()}`;
        
        const terminal = new Terminal({
            theme: {
                background: '#09090b',
                foreground: '#e4e4e7',
                cursor: '#6366f1',
                selection: '#3f3f4680',
                black: '#000000',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#f59e0b',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#ffffff',
                brightBlack: '#52525b',
                brightRed: '#fb7185',
                brightGreen: '#4ade80',
                brightYellow: '#fbbf24',
                brightBlue: '#60a5fa',
                brightMagenta: '#d8b4fe',
                brightCyan: '#22d3ee',
                brightWhite: '#fafafa'
            },
            fontFamily: IDE.state.settings.terminal.fontFamily,
            fontSize: IDE.state.settings.terminal.fontSize,
            cursorBlink: IDE.state.settings.terminal.cursorBlink,
            cursorStyle: IDE.state.settings.terminal.cursorStyle,
            scrollback: 10000,
            convertEol: true,
            allowTransparency: true,
            disableStdin: false,
            windowsMode: false,
            macOptionIsMeta: false,
            rendererType: 'canvas',
            cols: 80,
            rows: 24
        });
        
        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        
        this.terminals[terminalId] = {
            instance: terminal,
            fitAddon: fitAddon,
            webLinksAddon: webLinksAddon,
            currentDir: '/',
            commandHistory: [],
            historyIndex: -1
        };
        
        return terminalId;
    },
    
    setActiveTerminal: function(id) {
        if (!this.terminals[id]) {
            console.error(`Terminal ${id} not found`);
            return;
        }
        
        this.activeTerminal = id;
        const terminal = this.terminals[id];
        
        // Clear current terminal host
        const host = document.getElementById('term-host');
        host.innerHTML = '';
        
        // Open terminal in host
        terminal.instance.open(host);
        
        // Write welcome if first time
        if (terminal.commandHistory.length === 0) {
            this.writeWelcome(id);
        }
        
        // Setup input handling
        this.setupInput(id);
        
        // Fit terminal
        setTimeout(() => terminal.fitAddon.fit(), 50);
        
        // Setup resize observer
        new ResizeObserver(() => terminal.fitAddon.fit()).observe(host);
        
        // Update UI
        this.updateTerminalUI();
    },
    
    writeWelcome: function(terminalId) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        terminal.instance.write('\x1b[1;36m\r\n');
        terminal.instance.write('\x1b[1;36m  \x1b[1;35mProCode IDE Terminal v21.0\x1b[1;36m                    \r\n');
        terminal.instance.write('\x1b[1;36m  Type \x1b[1;33mhelp\x1b[1;36m for available commands              \r\n');
        terminal.instance.write('\x1b[1;36m  Multiple terminals: \x1b[1;33mCtrl+Shift+`\x1b[1;36m              \r\n');
        terminal.instance.write('\x1b[1;36m\r\n\r\n');
        this.writePrompt(terminalId);
    },
    
    writePrompt: function(terminalId) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        const path = terminal.currentDir === '/' ? '/' : terminal.currentDir.substring(1);
        terminal.instance.write(`\x1b[1;32muser@procode\x1b[0m:\x1b[1;34m${path}\x1b[0m$ `);
    },
    
    setupInput: function(terminalId) {
        const self = this;
        const terminal = this.terminals[terminalId];
        if (!terminal) return;

        let currentInput  = '';
        let cursorPos     = 0;   // logical cursor position in currentInput
        let searchMode    = false;
        let searchQuery   = '';
        let searchResults = [];

        /* ── Helpers ── */
        const T = terminal.instance;

        // Compute visible prompt width (strip ANSI escape codes)
        function visibleLen(str) {
            return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').length;
        }

        /* Core redraw — clears current line, rewrites prompt+input,
           then moves cursor LEFT by the number of chars after cursor.
           This is safe regardless of prompt ANSI escapes length.        */
        function redraw() {
            T.write('\r\x1b[K');                      // CR + erase to end
            self.writePrompt(terminalId);             // write prompt
            T.write(currentInput);                    // write full input
            const tail = currentInput.length - cursorPos;
            if (tail > 0) T.write('\x1b[' + tail + 'D');  // move cursor left
        }

        function insertText(text) {
            if (!text) return;
            const before = currentInput.slice(0, cursorPos);
            const after  = currentInput.slice(cursorPos);
            currentInput = before + text + after;
            cursorPos   += text.length;
        }

        function deleteBack(n = 1) {
            if (cursorPos === 0) return;
            n = Math.min(n, cursorPos);
            currentInput = currentInput.slice(0, cursorPos - n) + currentInput.slice(cursorPos);
            cursorPos   -= n;
        }

        function deleteFwd(n = 1) {
            if (cursorPos >= currentInput.length) return;
            currentInput = currentInput.slice(0, cursorPos) + currentInput.slice(cursorPos + n);
        }

        function moveCursor(delta) {
            cursorPos = Math.max(0, Math.min(currentInput.length, cursorPos + delta));
        }

        // Word boundary jump (Ctrl+Left / Ctrl+Right / Alt+B / Alt+F)
        function wordLeft() {
            let i = cursorPos - 1;
            while (i > 0 && currentInput[i] === ' ') i--;
            while (i > 0 && currentInput[i-1] !== ' ') i--;
            cursorPos = Math.max(0, i);
        }
        function wordRight() {
            let i = cursorPos;
            while (i < currentInput.length && currentInput[i] === ' ') i++;
            while (i < currentInput.length && currentInput[i] !== ' ') i++;
            cursorPos = i;
        }

        /* ── Tab completion ── */
        function doTab() {
            const suggestions = self.getCommandSuggestions(currentInput);
            if (suggestions.length === 0) return;
            if (suggestions.length === 1) {
                const completion = suggestions[0];
                const suffix = completion.slice(currentInput.length);
                if (suffix) { insertText(suffix); redraw(); }
                return;
            }
            // Show suggestions below
            T.write('\r\n');
            const cols = Math.max(...suggestions.map(s => s.length)) + 2;
            const perRow = Math.max(1, Math.floor(80 / cols));
            suggestions.forEach((s, i) => {
                T.write('\x1b[36m' + s.padEnd(cols) + '\x1b[0m');
                if ((i + 1) % perRow === 0) T.write('\r\n');
            });
            if (suggestions.length % perRow !== 0) T.write('\r\n');
            // Find common prefix
            const common = suggestions.reduce((acc, s) => {
                let i = 0;
                while (i < acc.length && i < s.length && acc[i] === s[i]) i++;
                return acc.slice(0, i);
            });
            if (common.length > currentInput.length) {
                currentInput = common;
                cursorPos    = common.length;
            }
            redraw();
        }

        /* ── History navigation ── */
        function historyUp() {
            if (!terminal.commandHistory.length) return;
            if (terminal.historyIndex <= 0) {
                terminal.historyIndex = 0;
            } else {
                terminal.historyIndex--;
            }
            currentInput = terminal.commandHistory[terminal.historyIndex] || '';
            cursorPos    = currentInput.length;
            redraw();
        }
        function historyDown() {
            if (terminal.historyIndex < 0) return;
            terminal.historyIndex++;
            if (terminal.historyIndex >= terminal.commandHistory.length) {
                terminal.historyIndex = terminal.commandHistory.length;
                currentInput = '';
            } else {
                currentInput = terminal.commandHistory[terminal.historyIndex] || '';
            }
            cursorPos = currentInput.length;
            redraw();
        }

        /* ── Enter / submit ── */
        function submit() {
            T.write('\r\n');
            const cmd = currentInput;
            // Push to history (avoid duplicate consecutive)
            if (cmd.trim() && terminal.commandHistory[terminal.commandHistory.length-1] !== cmd) {
                terminal.commandHistory.push(cmd);
            }
            terminal.historyIndex = terminal.commandHistory.length;
            currentInput = '';
            cursorPos    = 0;
            self.executeCommand(terminalId, cmd);
        }

        /* ── Paste via Clipboard API ── */
        function doPaste() {
            navigator.clipboard.readText().then(text => {
                if (!text) return;
                // Replace newlines with spaces for single-line terminal
                const sanitized = text.replace(/\r?\n/g, ' ').replace(/\t/g, '    ');
                insertText(sanitized);
                redraw();
            }).catch(() => {
                // Clipboard API blocked — fallback: user will see native paste
            });
        }

        /* ── xterm onKey handler ── */
        T.onKey(({ key, domEvent: ev }) => {
            // Ignore pure modifier keys
            if ([16,17,18,91,93,224].includes(ev.keyCode)) return;

            const ctrl  = ev.ctrlKey  && !ev.altKey;
            const alt   = ev.altKey   && !ev.ctrlKey;
            const shift = ev.shiftKey && !ev.ctrlKey && !ev.altKey;

            // Ctrl combos
            if (ctrl) {
                switch (ev.key.toLowerCase()) {
                    case 'c':
                        T.write('^C\r\n');
                        currentInput = ''; cursorPos = 0;
                        self.writePrompt(terminalId);
                        return;
                    case 'l':
                        T.clear();
                        self.writeWelcome(terminalId);
                        currentInput = ''; cursorPos = 0;
                        return;
                    case 'u':   // delete to line start
                        currentInput = currentInput.slice(cursorPos);
                        cursorPos = 0;
                        redraw(); return;
                    case 'k':   // delete to line end
                        currentInput = currentInput.slice(0, cursorPos);
                        redraw(); return;
                    case 'w':   // delete word back
                        const b = currentInput.slice(0, cursorPos);
                        const ls = b.trimEnd().lastIndexOf(' ');
                        const del = cursorPos - (ls + 1);
                        if (del > 0) { deleteBack(del); redraw(); }
                        return;
                    case 'a':   // line start
                        cursorPos = 0; redraw(); return;
                    case 'e':   // line end
                        cursorPos = currentInput.length; redraw(); return;
                    case 'd':   // delete forward char
                        if (currentInput.length === 0) {
                            T.write('\r\n\x1b[90m(use × button to close panel)\x1b[0m\r\n');
                            self.writePrompt(terminalId);
                            return;
                        }
                        deleteFwd(1); redraw(); return;
                    case 'v':   // paste
                        doPaste(); return;
                    case 'z':   // undo (no-op but prevent browser freeze)
                        return;
                    case 'r':   // reverse search hint
                        T.write('\r\n\x1b[90m(reverse-search not available — use ↑↓ for history)\x1b[0m\r\n');
                        self.writePrompt(terminalId);
                        T.write(currentInput); return;
                    case 'arrowleft':
                    case 'left':
                        wordLeft(); redraw(); return;
                    case 'arrowright':
                    case 'right':
                        wordRight(); redraw(); return;
                }
            }

            // Alt combos
            if (alt) {
                switch (ev.key.toLowerCase()) {
                    case 'b':   wordLeft();  redraw(); return;
                    case 'f':   wordRight(); redraw(); return;
                    case 'backspace':
                    case 'd': {
                        // delete word forward
                        const start = cursorPos;
                        wordRight();
                        currentInput = currentInput.slice(0, start) + currentInput.slice(cursorPos);
                        cursorPos = start;
                        redraw(); return;
                    }
                }
            }

            // Special keys
            switch (ev.keyCode) {
                case 13:  // Enter
                    submit(); return;

                case 9:   // Tab
                    ev.preventDefault?.();
                    doTab(); return;

                case 8:   // Backspace
                    if (cursorPos > 0) { deleteBack(1); redraw(); }
                    return;

                case 46:  // Delete
                    if (cursorPos < currentInput.length) { deleteFwd(1); redraw(); }
                    return;

                case 37:  // Left
                    if (ctrl) { wordLeft(); redraw(); }
                    else if (cursorPos > 0) { moveCursor(-1); T.write('\x1b[D'); }
                    return;

                case 39:  // Right
                    if (ctrl) { wordRight(); redraw(); }
                    else if (cursorPos < currentInput.length) { moveCursor(1); T.write('\x1b[C'); }
                    return;

                case 38:  // Up
                    historyUp(); return;

                case 40:  // Down
                    historyDown(); return;

                case 36:  // Home
                    cursorPos = 0; redraw(); return;

                case 35:  // End
                    cursorPos = currentInput.length; redraw(); return;

                case 27:  // Escape — clear line
                    currentInput = ''; cursorPos = 0; redraw(); return;
            }

            // Printable character
            const isPrintable = key.length === 1
                && !ev.ctrlKey && !ev.metaKey
                && ev.keyCode !== 8 && ev.keyCode !== 9;

            if (isPrintable) {
                insertText(key);
                // Fast path: cursor at end — just write the char
                if (cursorPos === currentInput.length) {
                    T.write(key);
                } else {
                    // Cursor in middle — need to redraw rest of line and reposition
                    const tail = currentInput.slice(cursorPos - 1); // includes new char
                    T.write('\x1b[s');   // save cursor
                    T.write(key);
                    const after = currentInput.slice(cursorPos);
                    if (after) {
                        T.write('\x1b[7m' + after + '\x1b[m'); // write rest dim
                        T.write('\x1b[' + after.length + 'D'); // move back
                    }
                }
            }
        });

        /* ── Paste via right-click / Shift+Insert / browser paste event ── */
        T.attachCustomKeyEventHandler((ev) => {
            // Ctrl+V / Cmd+V — handle ourselves, prevent xterm default
            if ((ev.ctrlKey || ev.metaKey) && ev.key === 'v' && ev.type === 'keydown') {
                doPaste();
                return false;
            }
            // Ctrl+C — we handle in onKey, let xterm know not to do default copy
            if ((ev.ctrlKey || ev.metaKey) && ev.key === 'c' && ev.type === 'keydown') {
                // If there's a selection in xterm, let it copy
                const sel = T.getSelection?.();
                if (sel && sel.length > 0) return true; // let xterm copy
                // Otherwise, treat as Ctrl+C signal (handled in onKey)
                return true;
            }
            return true;
        });

        /* ── DOM-level paste fallback (handles Shift+Insert, right-click paste) ── */
        const hostEl = document.getElementById('term-host');
        if (hostEl && !hostEl._pasteHandlerAttached) {
            hostEl._pasteHandlerAttached = true;
            hostEl.addEventListener('paste', (ev) => {
                ev.preventDefault();
                const text = ev.clipboardData?.getData('text') || '';
                if (text) {
                    const sanitized = text.replace(/\r?\n/g, ' ').replace(/\t/g, '    ');
                    insertText(sanitized);
                    redraw();
                }
            });
        }
    },

    clearCurrentLine: function(terminalId) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        terminal.instance.write('\r\x1b[K');
        this.writePrompt(terminalId);
    },
    
    handleTabCompletion: function(terminalId, input) {
        // Tab completion is now handled inside setupInput's doTab() closure.
        // This stub kept for compatibility.
    },
    
    getCommandSuggestions: function(input) {
        const commands = [
            'help', 'ls', 'cd', 'clear', 'pwd', 'cat', 'echo', 
            'python', 'node', 'npm', 'git', 'mkdir', 'touch', 
            'rm', 'cp', 'mv', 'find', 'grep', 'curl', 'wget'
        ];
        
        const fileSuggestions = this.getFileSuggestions(input);
        return [...commands, ...fileSuggestions].filter(item => 
            item.startsWith(input)
        );
    },
    
    getFileSuggestions: function(input) {
        const parts = input.split(' ');
        if (parts.length < 2) return [];
        
        const lastPart = parts[parts.length - 1];
        if (!lastPart || lastPart.includes('/')) return [];
        
        const pathPrefix = this.terminals[this.activeTerminal]?.currentDir || '/';
        const files = Object.keys(IDE.state.files)
            .filter(f => f.startsWith(pathPrefix))
            .map(f => f.substring(pathPrefix.length))
            .filter(f => f.startsWith(lastPart))
            .map(f => parts.slice(0, -1).concat(f).join(' '));
        
        return files;
    },
    
    executeCommand: function(terminalId, input) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        const trimmed = input.trim();
        if (!trimmed) {
            this.writePrompt(terminalId);
            return;
        }
        
        terminal.isProcessing = true;
        
        const [cmd, ...args] = trimmed.split(' ');
        const command = cmd.toLowerCase();
        
        // Execute command
        switch(command) {
            case 'help':
                this.showHelp(terminalId);
                break;
                
            case 'ls':
                this.listFiles(terminalId, args);
                break;
                
            case 'cd':
                this.changeDirectory(terminalId, args[0]);
                break;
                
            case 'clear':
                terminal.instance.clear();
                this.writeWelcome(terminalId);
                terminal.isProcessing = false;
                return;
                
            case 'pwd':
                terminal.instance.write(terminal.currentDir + '\r\n');
                break;
                
            case 'cat':
                this.showFile(terminalId, args[0]);
                break;
                
            case 'echo':
                terminal.instance.write(args.join(' ') + '\r\n');
                break;
                
            case 'mkdir':
                this.createDirectory(terminalId, args[0]);
                break;
                
            case 'touch':
                this.createFile(terminalId, args[0]);
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
                
            case 'curl':
            case 'wget':
                terminal.instance.write(`\x1b[33m${command} is not available in this environment. Use an external terminal.\x1b[0m\r\n`);
                break;
                
            case 'python':
                this.runPython(terminalId, args);
                break;
                
            case 'node':
                this.runNode(terminalId, args);
                break;
                
            case 'npm':
                this.runNpm(terminalId, args);
                break;
                
            case 'git':
                this.runGit(terminalId, args);
                break;
                
            default:
                terminal.instance.write(`\x1b[31mCommand not found: ${cmd}\x1b[0m\r\n`);
                terminal.instance.write('Type \x1b[33mhelp\x1b[0m for available commands\r\n');
        }
        
        terminal.isProcessing = false;
        this.writePrompt(terminalId);
    },
    
    showHelp: function(terminalId) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        terminal.instance.write('\x1b[1;33mAvailable commands:\x1b[0m\r\n');
        terminal.instance.write('  \x1b[32mhelp\x1b[0m     - Show this help message\r\n');
        terminal.instance.write('  \x1b[32mls\x1b[0m       - List files in current directory\r\n');
        terminal.instance.write('  \x1b[32mcd\x1b[0m       - Change directory\r\n');
        terminal.instance.write('  \x1b[32mclear\x1b[0m    - Clear terminal screen\r\n');
        terminal.instance.write('  \x1b[32mpwd\x1b[0m      - Print working directory\r\n');
        terminal.instance.write('  \x1b[32mcat\x1b[0m      - Display file content\r\n');
        terminal.instance.write('  \x1b[32mecho\x1b[0m     - Print text\r\n');
        terminal.instance.write('  \x1b[32mmkdir\x1b[0m    - Create directory\r\n');
        terminal.instance.write('  \x1b[32mtouch\x1b[0m    - Create file\r\n');
        terminal.instance.write('  \x1b[32mrm\x1b[0m       - Remove files/directories\r\n');
        terminal.instance.write('  \x1b[32mcp\x1b[0m       - Copy file\r\n');
        terminal.instance.write('  \x1b[32mmv\x1b[0m       - Move/rename file\r\n');
        terminal.instance.write('  \x1b[32mfind\x1b[0m     - Find files\r\n');
        terminal.instance.write('  \x1b[32mgrep\x1b[0m     - Search in files\r\n');
        terminal.instance.write('  \x1b[32mpython\x1b[0m   - Run Python code\r\n');
        terminal.instance.write('  \x1b[32mnode\x1b[0m     - Run Node.js code\r\n');
        terminal.instance.write('  \x1b[32mnpm\x1b[0m      - NPM package manager (external terminal required)\r\n');
        terminal.instance.write('  \x1b[32mgit\x1b[0m      - Git version control (external terminal required)\r\n');
        terminal.instance.write('\r\n\x1b[1;33mShortcuts:\x1b[0m\r\n');
        terminal.instance.write('  \x1b[32mCtrl+C\x1b[0m    - Cancel current command\r\n');
        terminal.instance.write('  \x1b[32mCtrl+L\x1b[0m    - Clear terminal\r\n');
        terminal.instance.write('  \x1b[32mCtrl+U\x1b[0m    - Clear line\r\n');
        terminal.instance.write('  \x1b[32mCtrl+A\x1b[0m    - Move to beginning of line\r\n');
        terminal.instance.write('  \x1b[32mCtrl+E\x1b[0m    - Move to end of line\r\n');
        terminal.instance.write('  \x1b[32mTab\x1b[0m       - Auto-complete\r\n');
        terminal.instance.write('  \x1b[32m/ arrows\x1b[0m - Navigate command history\r\n');
    },
    
    listFiles: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        const showHidden = args.includes('-a') || args.includes('-la');
        const longFormat = args.includes('-l') || args.includes('-la');
        const showAll = args.includes('-la');
        
        const pathPrefix = terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/';
        const files = Object.keys(IDE.state.files)
            .filter(f => f.startsWith(pathPrefix) && (showAll || !f.includes('/.')))
            .map(f => {
                const relative = f.substring(pathPrefix.length);
                const parts = relative.split('/');
                return parts.length === 1 ? parts[0] : parts[0] + '/';
            })
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();
        
        if (files.length === 0) {
            terminal.instance.write('(empty directory)\r\n');
            return;
        }
        
        if (longFormat) {
            // Show detailed listing
            terminal.instance.write('Permissions Size Created Name\r\n');
            terminal.instance.write('   \r\n');
            
            files.forEach(file => {
                const isDir = file.endsWith('/');
                const fullPath = pathPrefix + (isDir ? file.slice(0, -1) : file);
                const size = isDir ? '-' : IDE.state.files[fullPath]?.length || 0;
                const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
                
                terminal.instance.write(
                    `${perms} ${size.toString().padStart(5)} B - ${file.padEnd(30)}\r\n`
                );
            });
        } else {
            // Show compact listing with colors
            let output = '';
            files.forEach(file => {
                const isDir = file.endsWith('/');
                const icon = isDir ? '\x1b[1;34m\x1b[0m' : '\x1b[1;33m\x1b[0m';
                output += `${icon} ${file}  `;
                
                // Limit to 4 items per line
                if (output.split('\r\n').pop().length > 60) {
                    output += '\r\n';
                }
            });
            terminal.instance.write(output + '\r\n');
        }
    },
    
    changeDirectory: function(terminalId, path) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        if (!path || path === '~') {
            terminal.currentDir = '/';
        } else if (path === '..') {
            if (terminal.currentDir !== '/') {
                const parts = terminal.currentDir.split('/').filter(Boolean);
                parts.pop();
                terminal.currentDir = '/' + parts.join('/');
            }
        } else if (path === '.') {
            // Stay in current directory
        } else {
            const newPath = (terminal.currentDir === '/' ? '' : terminal.currentDir) + '/' + path;
            // Check if "directory" exists (has files with this prefix)
            const hasFiles = Object.keys(IDE.state.files).some(f => 
                f.startsWith(newPath + '/')
            );
            
            if (hasFiles) {
                terminal.currentDir = newPath;
            } else {
                terminal.instance.write(`cd: ${path}: No such directory\r\n`);
            }
        }
    },
    
    showFile: function(terminalId, filename) {
        const terminal = this.terminals[terminalId];
        if (!terminal || !filename) {
            terminal?.instance.write('Usage: cat <filename>\r\n');
            return;
        }
        
        const filePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + filename;
        let content;
        try { content = FileSystem.read(filePath); } catch(e) { content = undefined; }
        
        if (content !== undefined) {
            // Show with syntax highlighting for known file types
            const ext = Utils.getExtension(filename);
            if (['js', 'ts', 'py', 'json', 'html', 'css'].includes(ext)) {
                // Add some basic syntax highlighting
                const lines = content.split('\n');
                lines.forEach(line => {
                    // Simple keyword highlighting
                    const highlighted = line
                        .replace(/(function|class|import|export|const|let|var|return|if|else|for|while)/g, '\x1b[1;35m$1\x1b[0m')
                        .replace(/(true|false|null|undefined)/g, '\x1b[1;33m$1\x1b[0m')
                        .replace(/("[^"]*"|'[^']*')/g, '\x1b[1;32m$1\x1b[0m')
                        .replace(/(\/\/.*)/g, '\x1b[90m$1\x1b[0m');
                    
                    terminal.instance.write(highlighted + '\r\n');
                });
            } else {
                terminal.instance.write(content + '\r\n');
            }
        } else {
            terminal.instance.write(`cat: ${filename}: No such file\r\n`);
        }
    },
    
    createDirectory: function(terminalId, dirname) {
        const terminal = this.terminals[terminalId];
        if (!terminal || !dirname) {
            terminal?.instance.write('Usage: mkdir <directory>\r\n');
            return;
        }
        
        const dirPath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + dirname + '/.keep';
        FileSystem.write(dirPath, '# Directory created from terminal');
        
        terminal.instance.write(`Directory '${dirname}' created\r\n`);
    },
    
    createFile: function(terminalId, filename) {
        const terminal = this.terminals[terminalId];
        if (!terminal || !filename) {
            terminal?.instance.write('Usage: touch <filename>\r\n');
            return;
        }
        
        const filePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + filename;
        FileSystem.write(filePath, `# Created from terminal\n# ${new Date().toISOString()}`);
        
        terminal.instance.write(`File '${filename}' created\r\n`);
    },
    
    removeFile: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal || args.length === 0) {
            terminal?.instance.write('Usage: rm <file> [-r for directories]\r\n');
            return;
        }
        
        const recursive = args.includes('-r') || args.includes('-rf');
        const files = args.filter(arg => !arg.startsWith('-'));
        
        files.forEach(filename => {
            const filePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + filename;
            
            if (FileSystem.exists(filePath)) {
                FileSystem.delete(filePath, true);
                terminal.instance.write(`Removed: ${filename}\r\n`);
            } else {
                terminal.instance.write(`rm: ${filename}: No such file or directory\r\n`);
            }
        });
    },
    
    copyFile: function(terminalId, source, destination) {
        const terminal = this.terminals[terminalId];
        if (!terminal || !source || !destination) {
            terminal?.instance.write('Usage: cp <source> <destination>\r\n');
            return;
        }
        
        const sourcePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + source;
        const destPath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + destination;
        
        if (!FileSystem.exists(sourcePath)) {
            terminal.instance.write(`cp: ${source}: No such file or directory\r\n`);
            return;
        }
        
        const content = FileSystem.read(sourcePath);
        FileSystem.write(destPath, content);
        
        terminal.instance.write(`Copied: ${source} -> ${destination}\r\n`);
    },
    
    moveFile: function(terminalId, source, destination) {
        const terminal = this.terminals[terminalId];
        if (!terminal || !source || !destination) {
            terminal?.instance.write('Usage: mv <source> <destination>\r\n');
            return;
        }
        
        const sourcePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + source;
        const destPath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + destination;
        
        if (!FileSystem.exists(sourcePath)) {
            terminal.instance.write(`mv: ${source}: No such file or directory\r\n`);
            return;
        }
        
        FileSystem.moveFile(sourcePath, destPath);
        terminal.instance.write(`Moved: ${source} -> ${destination}\r\n`);
    },
    
    findFiles: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal || args.length === 0) {
            terminal?.instance.write('Usage: find <pattern> [-name pattern] [-type f|d]\r\n');
            return;
        }
        
        const namePattern = args[args.indexOf('-name') + 1] || args[0];
        const typeFilter = args[args.indexOf('-type') + 1];
        
        const pathPrefix = terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/';
        const files = Object.keys(IDE.state.files)
            .filter(f => f.startsWith(pathPrefix))
            .map(f => f.substring(pathPrefix.length))
            .filter(f => {
                // Apply name pattern
                if (namePattern && namePattern !== '*') {
                    const regex = new RegExp(namePattern.replace(/\*/g, '.*'));
                    if (!regex.test(f)) return false;
                }
                
                // Apply type filter
                if (typeFilter === 'f' && f.endsWith('/')) return false;
                if (typeFilter === 'd' && !f.endsWith('/')) return false;
                
                return true;
            })
            .sort();
        
        if (files.length === 0) {
            terminal.instance.write('No files found\r\n');
            return;
        }
        
        files.forEach(file => {
            terminal.instance.write(`./${file}\r\n`);
        });
    },
    
    grepFiles: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal || args.length < 2) {
            terminal?.instance.write('Usage: grep <pattern> <file> [-i] [-n]\r\n');
            return;
        }
        
        const pattern = args[0];
        const filename = args[1];
        const caseInsensitive = args.includes('-i');
        const showLineNumbers = args.includes('-n');
        
        const filePath = (terminal.currentDir === '/' ? '' : terminal.currentDir.substring(1) + '/') + filename;
        let content;
        try {
            content = FileSystem.read(filePath);
        } catch(e) {
            terminal.instance.write(`grep: ${filename}: No such file\r\n`);
            return;
        }
        
        if (content === undefined || content === null) {
            terminal.instance.write(`grep: ${filename}: No such file\r\n`);
            return;
        }
        
        const regex = new RegExp(pattern, caseInsensitive ? 'gi' : 'g');
        const lines = content.split('\n');
        let matchCount = 0;
        
        lines.forEach((line, index) => {
            if (regex.test(line)) {
                matchCount++;
                const lineNum = showLineNumbers ? `${index + 1}:` : '';
                terminal.instance.write(`${lineNum}${line}\r\n`);
            }
        });
        
        if (matchCount === 0) {
            terminal.instance.write('No matches found\r\n');
        }
    },
    
    runPython: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        if (args.length === 0) {
            terminal.instance.write('Python interactive mode is not available in this environment.\r\n');
            terminal.instance.write('Tip: run a file with "python <file>" or use the Run button.\r\n');
            return;
        }
        
        const filePath = args[0];
        terminal.instance.write('Python runner: executing in-browser (Pyodide)...\r\n');
        Runner.execute(filePath);
    },
    
    runNode: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        if (args.length === 0) {
            terminal.instance.write('Node.js interactive mode is not available in this environment.\r\n');
            terminal.instance.write('Tip: run a file with "node <file>" or use the Run button.\r\n');
            return;
        }
        
        const filePath = args[0];
        Runner.execute(filePath);
    },
    
    runNpm: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        terminal.instance.write('npm is not available in this environment. Use an external terminal.\r\n');
    },
    
    runGit: function(terminalId, args) {
        const terminal = this.terminals[terminalId];
        if (!terminal) return;
        
        terminal.instance.write('git is not available in this environment. Use an external terminal.\r\n');
    },
    
    write: function(text, terminalId = null) {
        const id = terminalId || this.activeTerminal;
        const terminal = this.terminals[id];
        if (terminal) {
            terminal.instance.write(text);
        }
    },
    
    clear: function(terminalId = null) {
        const id = terminalId || this.activeTerminal;
        const terminal = this.terminals[id];
        if (!terminal) return;
        try {
            if (terminal.instance && typeof terminal.instance.clear === 'function') {
                terminal.instance.clear();
            } else if (terminal.outputEl) {
                terminal.outputEl.textContent = '';
            }
        } catch (e) {
            if (terminal.outputEl) terminal.outputEl.textContent = '';
        }
        this.writeWelcome(id);
    },
    
    fit: function(terminalId = null) {
        const id = terminalId || this.activeTerminal;
        const terminal = this.terminals[id];
        if (terminal && terminal.fitAddon) {
            terminal.fitAddon.fit();
        }
    },
    
    createNewTerminal: function() {
        const id = this.createTerminal();
        this.setActiveTerminal(id);
        this.updateTerminalUI();
        return id;
    },
    
    closeTerminal: function(terminalId) {
        if (terminalId === 'default') {
            this.clear(terminalId);
            return;
        }
        
        if (this.terminals[terminalId]) {
            delete this.terminals[terminalId];
            
            // Switch to default terminal if closing active
            if (this.activeTerminal === terminalId) {
                this.setActiveTerminal('default');
            }
            
            this.updateTerminalUI();
        }
    },
    
    updateTerminalUI: function() {
        const terminalCount = Object.keys(this.terminals).length;
        const termBadge = document.getElementById('term-badge');
        if (termBadge) {
            termBadge.textContent = terminalCount;
        }
        
        // Update terminal switcher UI if exists
        // This would show tabs for multiple terminals
},

applySettings: function() {
    try {
        const s = IDE.state.settings.terminal;

        Object.values(this.terminals || {}).forEach(t => {
            const term = t.instance;
            if (!term || !term.setOption) return;

            term.setOption('fontSize', s.fontSize);
            term.setOption('fontFamily', s.fontFamily || "'JetBrains Mono', monospace");
            term.setOption('cursorBlink', !!s.cursorBlink);
            term.setOption('cursorStyle', s.cursorStyle || 'block');

            // Re-fit if possible
            if (t.fitAddon && t.fitAddon.fit) {
                try { t.fitAddon.fit(); } catch(e) {}
            }
        });

    } catch (e) {
        console.warn('Terminal applySettings failed:', e);
    }
}
};