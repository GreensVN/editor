/**
 * editor-manager.js
 * EditorManager — Monaco editor lifecycle, syntax, linting
 * ProCode IDE v3.0
 */

// ============================================
const EditorManager = {
    instances: {},
    currentEditorId: 'monaco-root-1',
    diagnostics: new Map(),
    codeLenses: new Map(),

    init: async function() {
        if(window.__PROCODE_DEBUG__) console.log('🧠 Initializing editor engine...');
        
        // ✅ FIX: Better Monaco loading với timeout và retry
        const loadMonaco = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Monaco load timeout'));
                        }, 15000);
                        
                        const check = () => {
                            if (window.monaco && monaco.editor) {
                                clearTimeout(timeout);
                                resolve();
                            } else if (window.__MONACO_READY__ === false) {
                                clearTimeout(timeout);
                                reject(new Error('Monaco failed to load'));
                            } else {
                                requestAnimationFrame(check);
                            }
                        };
                        check();
                    });
                    return; // Success
                } catch (error) {
                    if(window.__PROCODE_DEBUG__) console.warn(`Monaco load attempt ${i + 1} failed:`, error);
                    if (i === retries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
                }
            }
        };
        
        await loadMonaco();
        
        try {
            this.defineEnhancedThemes();
        } catch (e) {
            if(window.__PROCODE_DEBUG__) console.warn('Theme definition failed:', e);
        }
        
        // ✅ FIX: Ensure container exists
        const container = document.getElementById(this.currentEditorId);
        if (!container) {
            throw new Error(`Editor container ${this.currentEditorId} not found`);
        }
        
        this.createEditor(this.currentEditorId);
        
        try {
            /* Commands are added per-editor during createEditor() */
            this.setupEnhancedEventListeners();
            if (this.setupCodeLens) this.setupCodeLens();
        } catch (e) {
            if(window.__PROCODE_DEBUG__) console.warn('Enhanced features setup failed:', e);
        }
        
        try {
            if (this.initWebWorker) this.initWebWorker();
        } catch (e) {
            if(window.__PROCODE_DEBUG__) console.warn('Worker init failed:', e);
        }
        
        // v36 — Only auto-open a file if the user EXPLICITLY had one open
        // last session (saved activeTab / tabs). Do NOT fall back to
        // "first file in the project" — instead show the empty welcome
        // screen and let the user click a file in the tree to open it.
        try {
            const initial = IDE.state.activeTab ||
                           (IDE.state.tabs && IDE.state.tabs[0]) ||
                           null; // ← previously: Object.keys(IDE.state.files || {})[0]
            if (initial && FileSystem.exists(initial)) {
                this.setFile(initial, this.currentEditorId);
            } else {
                // No restored tab → keep editor blank, show welcome / empty-state
                const es = document.getElementById('empty-state');
                if (es) es.style.display = 'flex';
                IDE.state.tabs = [];
                IDE.state.activeTab = null;
            }
        } catch (e) {
            if(window.__PROCODE_DEBUG__) console.warn('Failed to set initial file:', e);
        }
        
        if(window.__PROCODE_DEBUG__) console.log('✅ Editor engine ready');
    },


// ============================================
// WEB WORKER FOR HEAVY PROCESSING
// ============================================
// Initialize Web Worker for background tasks
    initWebWorker: function() {
    // If the worker repeatedly crashes, disable to keep the app responsive
    if (this.workerDisabled) {
        console.warn('⚠️ Web Worker is disabled due to repeated crashes.');
        return;
    }
    this._workerRestartCount = this._workerRestartCount || 0;
    this._workerRestartTimer = this._workerRestartTimer || null;

    if (this.worker) {
        if(window.__PROCODE_DEBUG__) console.log('⚠️ Worker already initialized');
        return;
    }
    
    if(window.__PROCODE_DEBUG__) console.log('🔧 Initializing Web Worker...');
    
    const workerCode = String.raw`
        // Web Worker with enhanced error handling
        // FIX: Workers don't have 'window', use 'self' instead
        if(self.__PROCODE_DEBUG__) console.log('👷 Worker thread started');
        
        let taskTimeout = null;
        
        self.addEventListener('message', function(e) {
            const { type, id, data } = e.data;
            
            // Clear any existing timeout
            if (taskTimeout) {
                clearTimeout(taskTimeout);
            }
            
            // Set timeout for task (30 seconds)
            taskTimeout = setTimeout(() => {
                postError(id, 'Task timeout after 30 seconds');
            }, 30000);
            
            try {
                switch(type) {
                    case 'search':
                        searchInFiles(id, data);
                        break;
                    case 'parse':
                        parseCode(id, data);
                        break;
                    case 'format':
                        formatCode(id, data);
                        break;
                    case 'analyze':
                        analyzeCode(id, data);
                        break;
                    default:
                        postError(id, 'Unknown task type: ' + type);
                }
            } catch (error) {
                postError(id, error.message + '\\n' + error.stack);
            } finally {
                if (taskTimeout) {
                    clearTimeout(taskTimeout);
                    taskTimeout = null;
                }
            }
        });
        
        function postResult(id, type, result) {
            self.postMessage({ id, type, status: 'success', result });
        }
        
        function postError(id, message) {
            self.postMessage({ id, status: 'error', error: message });
        }
        
        function postProgress(id, progress) {
            self.postMessage({ id, status: 'progress', progress });
        }
        
        // === Worker task implementations (v16 ultra) ===
function _splitLines(text) {
      const s = String(text || '');
      // Safer than regex literals containing \r/\n in generated worker code.
      const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return normalized.split('\n');
    }

function _escapeRegExp(s) {
  // Important: avoid the interpolation sequence in template literals by ordering chars as ^{}$
  return String(s).replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
}

function _buildSearchRegex(query, opts) {
  const flags = opts.caseSensitive ? 'g' : 'gi';
  if (opts.regex) return new RegExp(query, flags);
  const q = _escapeRegExp(query);
  const pattern = opts.wholeWord ? ('\\b' + q + '\\b') : q;
  return new RegExp(pattern, flags);
}

function _safeIssue(line, col, message, severity = 'warning', rule = 'generic') {
  return { line, column: col, message: String(message), severity, rule };
}

function searchInFiles(taskId, data) {
  const start = Date.now();
  const query = (data && data.query != null) ? String(data.query) : '';
  const files = (data && data.files) ? data.files : {};
  const options = Object.assign({ caseSensitive:false, wholeWord:false, regex:false, maxResults: 2000 }, (data && data.options) || {});
  if (!query) return { duration: 0, totalFiles: Object.keys(files).length, matchCount: 0, results: [] };

  let re;
  try { re = _buildSearchRegex(query, options); }
  catch (e) { throw new Error('Invalid regex: ' + (e && e.message ? e.message : String(e))); }

  const paths = Object.keys(files || {});
  const totalFiles = paths.length;
  const results = [];
  let matchCount = 0;
  const maxResults = Math.max(1, options.maxResults | 0);

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const file = files[path] || {};
    const content = file.content != null ? String(file.content) : '';
    const lines = _splitLines(content);

    for (let ln = 0; ln < lines.length; ln++) {
      const lineText = lines[ln];
      re.lastIndex = 0;
      if (!re.test(lineText)) continue;

      re.lastIndex = 0;
      let m;
      while ((m = re.exec(lineText)) !== null) {
        matchCount++;
        results.push({ path, line: ln + 1, column: (m.index || 0) + 1, content: lineText });

        if (m[0] === '') re.lastIndex = (re.lastIndex || 0) + 1;
        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    if (i % 10 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, totalFiles)) * 100));
    if (results.length >= maxResults) break;
  }

  return { duration: Date.now() - start, totalFiles, matchCount, results };
}

function parseCode(taskId, data) {
  const start = Date.now();
  const code = (data && data.code != null) ? String(data.code) : '';
  const language = (data && data.language) ? String(data.language) : 'plaintext';
  const symbols = [];
  const lines = _splitLines(code);

  function pushSymbol(kind, name, line) {
    if (!name) return;
    symbols.push({ kind, name: String(name), line });
  }

  if (language === 'javascript' || language === 'typescript' || language === 'json') {
    const reFn = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/;
    const reClass = /^\s*class\s+([A-Za-z_$][\w$]*)\b/;
    const reVar = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m;
      if ((m = reFn.exec(l))) pushSymbol('function', m[1], i + 1);
      else if ((m = reClass.exec(l))) pushSymbol('class', m[1], i + 1);
      else if ((m = reVar.exec(l))) pushSymbol('variable', m[1], i + 1);
      if (i % 200 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, lines.length)) * 100));
    }
  } else if (language === 'python') {
    const reDef = /^\s*def\s+([A-Za-z_][\w]*)\s*\(/;
    const reClass = /^\s*class\s+([A-Za-z_][\w]*)\b/;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m;
      if ((m = reDef.exec(l))) pushSymbol('function', m[1], i + 1);
      else if ((m = reClass.exec(l))) pushSymbol('class', m[1], i + 1);
      if (i % 200 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, lines.length)) * 100));
    }
  } else if (language === 'html') {
    const reId = /id\s*=\s*["']([^"']+)["']/i;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const m = reId.exec(l);
      if (m) pushSymbol('id', m[1], i + 1);
      if (i % 200 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, lines.length)) * 100));
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const m = /^\s*#\s+(.+)$/.exec(l);
      if (m) pushSymbol('heading', m[1], i + 1);
      if (i % 200 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, lines.length)) * 100));
    }
  }

  return { duration: Date.now() - start, symbols };
}

function formatCode(taskId, data) {
  const code = (data && data.code != null) ? String(data.code) : '';
  return { code, formatted: false, engine: 'worker-noop' };
}

function analyzeCode(taskId, data) {
  const start = Date.now();
  const code = (data && data.code != null) ? String(data.code) : '';
  const language = (data && data.language) ? String(data.language) : 'plaintext';
  const lines = _splitLines(code);
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.length > 140) issues.push(_safeIssue(i + 1, 141, 'Line is very long (' + l.length + ' chars).', 'info', 'line-length'));
    if (/\s+$/.test(l)) issues.push(_safeIssue(i + 1, l.length, 'Trailing whitespace.', 'info', 'trailing-ws'));
    if (/\bTODO\b|\bFIXME\b|\bHACK\b/.test(l)) issues.push(_safeIssue(i + 1, 1, 'Reminder tag found (TODO/FIXME/HACK).', 'info', 'todo'));
    if (i % 400 === 0) postProgress(taskId, Math.round(((i + 1) / Math.max(1, lines.length)) * 100));
  }

  if (language === 'javascript' || language === 'typescript') {
    try { new Function('"use strict";\n' + code + '\n//# sourceURL=procode-analyze.js'); }
    catch (e) { issues.push(_safeIssue(1, 1, 'Possible syntax error: ' + (e && e.message ? e.message : String(e)), 'error', 'syntax')); }
  } else if (language === 'json') {
    try { JSON.parse(code || 'null'); }
    catch (e) { issues.push(_safeIssue(1, 1, 'Invalid JSON: ' + (e && e.message ? e.message : String(e)), 'error', 'json')); }
  } else if (language === 'html') {
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
    const stack = [];
    let m;
    while ((m = tagRe.exec(code)) !== null) {
      const full = m[0];
      const name = m[1].toLowerCase();
      if (full.startsWith('</')) {
        const top = stack[stack.length - 1];
        if (top === name) stack.pop();
      } else if (!full.endsWith('/>') && !['br','hr','img','input','meta','link','source','area','base','col','embed','param','track','wbr'].includes(name)) {
        stack.push(name);
      }
      if (stack.length > 2000) break;
    }
    if (stack.length) issues.push(_safeIssue(1, 1, 'HTML may have unclosed tags (example: ' + stack[stack.length - 1] + ').', 'info', 'html-tags'));
  }

  const metrics = { lines: lines.length, chars: code.length, issues: issues.length };
  return { duration: Date.now() - start, metrics, issues };
}
// === End worker task implementations ===
        
        // Error handler
        self.addEventListener('error', function(e) {
            console.error('Worker error:', e);
            postError(-1, 'Worker error: ' + e.message);
        });
        
        self.addEventListener('unhandledrejection', function(e) {
            console.error('Worker unhandled rejection:', e);
            postError(-1, 'Unhandled rejection: ' + e.reason);
        });
        
        // FIX: Workers don't have 'window', use 'self' instead
        if(self.__PROCODE_DEBUG__) console.log('✅ Worker ready');
    `;
    
    try {
        // Preflight syntax check removed (class declarations not compatible with Function() wrapper)
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);
        
        this.workerTasks = new Map();
        this.workerTaskId = 0;
        
        // Enhanced message handler
        this.worker.addEventListener('message', (e) => {
            const { id, type, status, result, error, progress } = e.data;
            
            const task = this.workerTasks.get(id);
            if (!task) {
                console.warn('Received message for unknown task:', id);
                return;
            }
            
            if (status === 'success') {
                task.resolve(result);
                this.workerTasks.delete(id);
            } else if (status === 'error') {
                task.reject(new Error(error));
                this.workerTasks.delete(id);
            } else if (status === 'progress' && task.onProgress) {
                task.onProgress(progress);
            }
        });
        
        // Enhanced error handler
        this.worker.addEventListener('error', (e) => {
            console.error('❌ Worker error:', e);

            // Reject all pending tasks so the UI can recover cleanly
            this.workerTasks.forEach((task) => {
                try { task.reject(new Error('Worker crashed: ' + (e && e.message ? e.message : 'unknown error'))); } catch (_) {}
            });
            this.workerTasks.clear();

            try { this.worker && this.worker.terminate(); } catch (_) {}
            this.worker = null;

            // Controlled restart with exponential backoff (prevents restart storms)
            if (this.workerDisabled) return;

            this._workerRestartCount = (this._workerRestartCount || 0) + 1;
            const maxRestarts = 5;
            if (this._workerRestartCount > maxRestarts) {
                this.workerDisabled = true;
                console.error('⛔ Worker disabled after repeated crashes. Some background features may be unavailable.');
                return;
            }

            const delay = Math.min(30000, 1000 * (2 ** (this._workerRestartCount - 1))); // 1s,2s,4s,8s,16s,30s
            if(window.__PROCODE_DEBUG__) console.log(`🔄 Attempting to restart worker... (try ${this._workerRestartCount}/${maxRestarts} in ${delay}ms)`);

            if (this._workerRestartTimer) clearTimeout(this._workerRestartTimer);
            this._workerRestartTimer = setTimeout(() => {
                this._workerRestartTimer = null;
                this.initWebWorker();
            }, delay);
        });
        
        if(window.__PROCODE_DEBUG__) console.log('✅ Web Worker initialized');
        this._workerRestartCount = 0;
        
    } catch (error) {
        console.warn('⚠️ Blob worker unavailable (CSP) — using main thread fallback');
        this.worker = null;
    }
},

// Helper to run tasks in worker
runWorkerTask: function(type, data, onProgress = null) {
    if (this.workerDisabled) {
        return Promise.reject(new Error('Web Worker disabled after repeated crashes'));
    }
    if (!this.worker) {
        this.initWebWorker();
    }
    
    if (!this.worker) {
        return Promise.reject(new Error('Worker not available'));
    }
    
    const id = this.workerTaskId++;
    
    return new Promise((resolve, reject) => {
        this.workerTasks.set(id, { resolve, reject, onProgress });
        
        this.worker.postMessage({
            type: type,
            id: id,
            data: data
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (this.workerTasks.has(id)) {
                this.workerTasks.delete(id);
                reject(new Error('Worker task timeout'));
            }
        }, 30000);
    });
},

// Public API for searching in files using worker
searchInFilesAsync: function(query, options = {}) {
    if(window.__PROCODE_DEBUG__) console.log('🔍 Searching in worker thread...');
    
    return this.runWorkerTask('search', {
        query: query,
        files: IDE.state.files,
        options: options
    }, (progress) => {
        if(window.__PROCODE_DEBUG__) console.log(`Search progress: ${progress}%`);
    });
},

// Public API for parsing code using worker
parseCodeAsync: function(code, language, path) {
    return this.runWorkerTask('parse', {
        code: code,
        language: language,
        path: path
    });
},

// Public API for formatting code using worker
formatCodeAsync: function(code, language) {
    return this.runWorkerTask('format', {
        code: code,
        language: language
    });
},

// Public API for analyzing code using worker
analyzeCodeAsync: function(code, language) {
    return this.runWorkerTask('analyze', {
        code: code,
        language: language
    });
},

// Cleanup worker
terminateWorker: function() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerTasks.clear();
            if(window.__PROCODE_DEBUG__) console.log('🛑 Worker terminated');
        }
    },

save: async function(immediate = false) {
        if (!immediate && !IDE.state.settings.editor.autoSave) {
            return;
        }
        
        try {
            // Save to IndexedDB (uncompressed for fast access)
            const savePromises = [];
            for (const [path, content] of Object.entries(IDE.state.files)) {
                savePromises.push(IndexedDBManager.setFile(path, content));
            }
            
            await Promise.all(savePromises);
            
            // Save settings
            await IndexedDBManager.setSetting('ide_settings', IDE.state.settings);
            await IndexedDBManager.setSetting('last_save', new Date().toISOString());
            
            // Compression backup
            try {
                const filesJson = JSON.stringify(IDE.state.files);
                const compressed = LZString.compressToUTF16(filesJson);
                
                const originalSize = new Blob([filesJson]).size;
                const compressedSize = new Blob([compressed]).size;
                const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                
                localStorage.setItem(`procode_fs_compressed_v${IDE.version}`, compressed);
                localStorage.setItem(`procode_compression_stats`, JSON.stringify({
                    originalSize: originalSize,
                    compressedSize: compressedSize,
                    ratio: ratio,
                    timestamp: new Date().toISOString()
                }));
                
                if(window.__PROCODE_DEBUG__) console.log(`💾 Compressed: ${Utils.formatBytes(originalSize)} → ${Utils.formatBytes(compressedSize)} (${ratio}% saved)`);
                
            } catch (compressionError) {
                console.warn('⚠️ Compression failed, using uncompressed backup:', compressionError);
                try {
                    localStorage.setItem(`procode_fs_backup_v${IDE.version}`, JSON.stringify(IDE.state.files));
                } catch (e) {
                    console.error('❌ Backup save failed:', e);
                }
            }
            
            this.updateFileSystemMetrics();
            
            if (immediate) {
                Utils.toast('✅ Project saved successfully', 'success');
            }
            
            this.updateSaveIndicator();
            return true;
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            Utils.toast('Save failed: ' + error.message, 'error');
            return false;
        }
    },

    write: async function(path, content, options = {}) {
        const oldContent = IDE.state.files[path];
        const isNewFile = !this.exists(path);
        
        if (!options.skipHistory && oldContent !== content) {
            this.addToHistory('write', path, oldContent, content);
        }
        
        IDE.state.files[path] = content;
        
        if (!options.skipDB) {
            IndexedDBManager.setFile(path, content).catch(err => {
                console.error('Failed to save to IndexedDB:', err);
            });
        }
        
        if (IDE.state.tabs.includes(path)) {
            IDE.state.dirtyTabs.add(path);
            this.updateTabDirtyState();
        }
        
        if (IDE.state.activeTab === path) {
            this.updateOutline();
        }
        
        if (IDE.state.settings.editor.autoSave && !options.skipAutoSave) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.save(), 1000);
        }
        
        this.updateFileSystemMetrics();
        this.emitFileChange(path, isNewFile ? 'created' : 'modified');
        
        return true;
    },

    read: async function(path, useCache = true) {
        if (!this.exists(path)) {
            throw new Error(`File not found: ${path}`);
        }
        
        if (IDE.state.files[path] !== undefined) {
            return IDE.state.files[path];
        }
        
        if (useCache && this.fileCache && this.fileCache[path]) {
            return this.fileCache[path];
        }
        
        try {
            const file = await IndexedDBManager.getFile(path);
            if (file && file.content !== undefined) {
                IDE.state.files[path] = file.content;
                
                if (!this.fileCache) this.fileCache = {};
                this.fileCache[path] = file.content;
                
                return file.content;
            }
        } catch (error) {
            console.error('Failed to read from IndexedDB:', error);
        }
        
        return IDE.state.files[path] || '';
    },

    defineEnhancedThemes: function() {
        // ProCode Dark Pro Theme
        monaco.editor.defineTheme('procode-dark-pro', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '#c586c0', fontStyle: 'bold' },
                { token: 'string', foreground: '#ce9178' },
                { token: 'number', foreground: '#b5cea8' },
                { token: 'comment', foreground: '#6a9955' },
                { token: 'type', foreground: '#4ec9b0' },
                { token: 'function', foreground: '#dcdcaa' },
                { token: 'variable', foreground: '#9cdcfe' },
                { token: 'parameter', foreground: '#9cdcfe', fontStyle: 'italic' },
                { token: 'property', foreground: '#9cdcfe' },
                { token: 'namespace', foreground: '#4ec9b0' },
                { token: 'tag', foreground: '#569cd6' },
                { token: 'attribute', foreground: '#9cdcfe' },
                { token: 'operator', foreground: '#d4d4d4' },
                { token: 'meta', foreground: '#d16969' },
                { token: 'regexp', foreground: '#d16969' }
            ],
            colors: {
                'editor.background': '#09090b',
                'editor.foreground': '#e4e4e7',
                'editorCursor.foreground': '#6366f1',
                'editor.lineHighlightBackground': '#18181b',
                'editorLineNumber.foreground': '#71717a',
                'editorLineNumber.activeForeground': '#a1a1aa',
                'editor.selectionBackground': '#3f3f4680',
                'editor.inactiveSelectionBackground': '#3f3f4640',
                'editor.wordHighlightBackground': '#3f3f4680',
                'editor.wordHighlightStrongBackground': '#3f3f4660',
                'editor.findMatchBackground': '#f59e0b40',
                'editor.findMatchHighlightBackground': '#f59e0b20',
                'editorBracketMatch.background': '#3f3f46',
                'editorBracketMatch.border': '#71717a',
                'editorIndentGuide.background': '#27272a',
                'editorIndentGuide.activeBackground': '#3f3f46',
                'editorRuler.foreground': '#27272a',
                'editorOverviewRuler.border': '#27272a',
                'editorOverviewRuler.findMatchForeground': '#f59e0b',
                'editorOverviewRuler.errorForeground': '#ef4444',
                'editorOverviewRuler.warningForeground': '#f59e0b',
                'editorOverviewRuler.infoForeground': '#3b82f6',
                'editorError.foreground': '#ef4444',
                'editorWarning.foreground': '#f59e0b',
                'editorInfo.foreground': '#3b82f6',
                'editorGutter.background': '#09090b',
                'editorGutter.modifiedBackground': '#3b82f6',
                'editorGutter.addedBackground': '#22c55e',
                'editorGutter.deletedBackground': '#ef4444'
            }
        });
        
        // ProCode Light Pro Theme
        monaco.editor.defineTheme('procode-light-pro', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '#0000ff', fontStyle: 'bold' },
                { token: 'string', foreground: '#a31515' },
                { token: 'number', foreground: '#098658' },
                { token: 'comment', foreground: '#008000' },
                { token: 'type', foreground: '#267f99' },
                { token: 'function', foreground: '#795e26' },
                { token: 'variable', foreground: '#001080' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#1e293b',
                'editorCursor.foreground': '#6366f1',
                'editor.lineHighlightBackground': '#f8fafc',
                'editorLineNumber.foreground': '#94a3b8',
                'editor.selectionBackground': '#e2e8f080',
                'editor.findMatchBackground': '#f59e0b40',
                'editorBracketMatch.background': '#e2e8f0'
            }
        });
        
        // ProCode Night Theme
        monaco.editor.defineTheme('procode-night', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '#ff79c6' },
                { token: 'string', foreground: '#f1fa8c' },
                { token: 'number', foreground: '#bd93f9' },
                { token: 'comment', foreground: '#6272a4' },
                { token: 'type', foreground: '#8be9fd' }
            ],
            colors: {
                'editor.background': '#0a0a12',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#ff79c6'
            }
        });
    },
    
createEditor: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return null;
    }
    
    if (this.instances[containerId]) {
        return this.instances[containerId];
    }
    
    // Áp class ngay trước khi Monaco render để không có flash đường phân cách
    if (!IDE.state.settings.editor.minimap) container.classList.add('minimap-off');
    const editor = monaco.editor.create(container, {
        value: "",
        language: 'javascript',
        theme: IDE.state.settings.editor.theme,
        fontSize: IDE.state.settings.editor.fontSize,
        fontFamily: IDE.state.settings.editor.fontFamily,
        fontLigatures: true, // Enable font ligatures
        
        // Minimap — khởi tạo theo setting; DOM class được set ngay để tránh flash
        minimap: {
            enabled: IDE.state.settings.editor.minimap,
            scale: 2,
            renderCharacters: false,
            showSlider: 'always',
            side: 'right'
        },
        
        // Scrolling
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        mouseWheelZoom: true,
        fastScrollSensitivity: 5,
        
        // Word wrap
        wordWrap: IDE.state.settings.editor.wordWrap ? 'on' : 'off',
        wordWrapColumn: 80,
        wrappingIndent: 'indent',
        
        // Indentation
        tabSize: IDE.state.settings.editor.tabSize,
        insertSpaces: true,
        detectIndentation: true,
        autoIndent: 'full',
        
        // Layout
        automaticLayout: false, // We'll handle it manually for better performance
        glyphMargin: true,
        lineNumbers: IDE.state.settings.editor.lineNumbers ? 'on' : 'off',
        lineNumbersMinChars: 3,
        lineDecorationsWidth: 10,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always',
        
        // Rendering
        renderLineHighlight: 'all',
        renderWhitespace: 'selection',
        renderControlCharacters: false,
        renderIndentGuides: true,
        renderFinalNewline: 'dimmed',
        renderValidationDecorations: 'editable',
        
        // Scrollbar
        scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: true,
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            arrowSize: 14
        },
        
        // Bracket matching
        bracketPairColorization: {
            enabled: IDE.state.settings.editor.bracketPairColorization,
            independentColorPoolPerBracketType: true
        },
        matchBrackets: 'always',
        guides: {
            bracketPairs: true,
            bracketPairsHorizontal: true,
            highlightActiveBracketPair: true,
            indentation: true,
            highlightActiveIndentation: true
        },
        
        // Suggestions
        suggest: {
            showWords: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showText: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: IDE.state.settings.features.snippetSuggestions,
            showUsers: false,
            showIssues: false,
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: true,
            shareSuggestSelections: true,
            showInlineDetails: true,
            showStatusBar: true
        },
        quickSuggestions: {
            other: true,
            comments: false,
            strings: true
        },
        quickSuggestionsDelay: 100,
        acceptSuggestionOnEnter: 'on',
        acceptSuggestionOnCommitCharacter: true,
        snippetSuggestions: 'top',
        suggestOnTriggerCharacters: true,
        
        // Code actions
        lightbulb: {
            enabled: true
        },
        codeActionsOnSave: {
            'source.fixAll': true,
            'source.organizeImports': true
        },
        
        // Auto closing
        autoClosingBrackets: IDE.state.settings.editor.autoCloseBrackets ? 'always' : 'never',
        autoClosingQuotes: IDE.state.settings.editor.autoCloseBrackets ? 'always' : 'never',
        autoClosingOvertype: 'always',
        autoSurround: 'languageDefined',
        
        // Formatting
        formatOnPaste: true,
        formatOnType: true,
        
        // Links
        links: true,
        
        // Hover
        hover: {
            enabled: true,
            delay: 300,
            sticky: true
        },
        
        // Find
        find: {
            seedSearchStringFromSelection: 'selection',
            autoFindInSelection: 'never',
            addExtraSpaceOnTop: true,
            loop: true
        },
        
        // Parameter hints
        parameterHints: {
            enabled: true,
            cycle: true
        },
        
        // Code lens
        codeLens: IDE.state.settings.features.codeLens,
        
        // Context menu
        contextmenu: true,
        
        // Accessibility
        accessibilitySupport: 'auto',
        accessibilityPageSize: 10,
        
        // Diff editor
        diffWordWrap: 'inherit',
        
        // Performance
        'semanticHighlighting.enabled': true,
        
        // Selection
        selectionHighlight: true,
        occurrencesHighlight: true,
        selectionClipboard: true,
        copyWithSyntaxHighlighting: true,
        
        // Multi cursor
        multiCursorModifier: 'alt',
        multiCursorMergeOverlapping: true,
        multiCursorPaste: 'spread',
        
        // Drag and drop
        dragAndDrop: true,
        dropIntoEditor: {
            enabled: true
        },
        
        // Overview ruler
        overviewRulerLanes: 3,
        overviewRulerBorder: false,
        
        // Rulers
        rulers: [80, 120],
        
        // Sticky scroll
        stickyScroll: {
            enabled: true
        },
        
        // Inline suggestions
        inlineSuggest: {
            enabled: true
        },
        
        // Unicode highlighting
        unicodeHighlight: {
            ambiguousCharacters: true,
            invisibleCharacters: true
        }
    });
    
    this.instances[containerId] = editor;

    // Force layout ngay sau khi tạo — đảm bảo Monaco không giữ minimap space
    requestAnimationFrame(() => { try { editor.layout(); } catch(_) {} });

    // Enhanced resize observer with RAF
    let resizeRAF = null;
    const resizeObserver = new ResizeObserver(() => {
        if (resizeRAF) {
            cancelAnimationFrame(resizeRAF);
        }
        resizeRAF = requestAnimationFrame(() => {
            editor.layout();
        });
    });
    resizeObserver.observe(container);
    
    editor.resizeObserver = resizeObserver;
    
    // Add custom commands
    this.addCustomCommands(editor);
    
    return editor;
},

addCustomCommands: function(editor) {
            // Accept optional editor; fall back to current instance if available.
            editor = editor || (this.instances && this.instances[this.currentEditorId]);
            if (!editor || typeof editor.addCommand !== 'function') {
                console.warn('⚠️ addCustomCommands skipped: editor not ready');
                return;
            }
    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
        editor.trigger('', 'editor.action.copyLinesDownAction');
    });
    
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Delete, () => {
        editor.trigger('', 'editor.action.deleteLines');
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        editor.trigger('', 'editor.action.commentLine');
    });
    
    // Add custom actions
    editor.addAction({
        id: 'duplicate-selection',
        label: 'Duplicate Selection',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD
        ],
        run: (ed) => {
            const selection = ed.getSelection();
            const text = ed.getModel().getValueInRange(selection);
            ed.executeEdits('', [{
                range: new monaco.Range(
                    selection.endLineNumber,
                    selection.endColumn,
                    selection.endLineNumber,
                    selection.endColumn
                ),
                text: '\n' + text
            }]);
        }
    });
    
    editor.addAction({
        id: 'sort-lines',
        label: 'Sort Lines',
        contextMenuGroupId: 'modification',
        run: (ed) => {
            const selection = ed.getSelection();
            const model = ed.getModel();
            const lines = [];
            
            for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
                lines.push(model.getLineContent(i));
            }
            
            lines.sort();
            
            ed.executeEdits('', [{
                range: new monaco.Range(
                    selection.startLineNumber, 1,
                    selection.endLineNumber, model.getLineMaxColumn(selection.endLineNumber)
                ),
                text: lines.join('\n')
            }]);
        }
    });

    // ── v27 AI Context Menu Actions ──────────────────────────────────────
    editor.addAction({
        id: 'ai-explain-code',
        label: '🤖 Claude: Explain This Code',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 1,
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE],
        run: () => { try { AI.explainSelection(); } catch(e) {} }
    });

    editor.addAction({
        id: 'ai-fix-bugs',
        label: '🤖 Claude: Fix Bugs',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 2,
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX],
        run: () => { try { AI.fixBugs(); } catch(e) {} }
    });

    editor.addAction({
        id: 'ai-optimize-code',
        label: '🤖 Claude: Optimize Code',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 3,
        run: () => {
            try {
                AI.quickAction('optimize');
                if (!AI.isVisible) AI.toggle();
            } catch(e) {}
        }
    });

    editor.addAction({
        id: 'ai-generate-docs',
        label: '🤖 Claude: Generate Documentation',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 4,
        run: () => { try { AI.generateDocs(); } catch(e) {} }
    });

    editor.addAction({
        id: 'ai-generate-tests',
        label: '🤖 Claude: Generate Unit Tests',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 5,
        run: () => { try { AI.generateTests(); } catch(e) {} }
    });

    editor.addAction({
        id: 'ai-review-code',
        label: '🤖 Claude: Code Review',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 6,
        run: () => {
            try {
                AI.quickAction('review');
                if (!AI.isVisible) AI.toggle();
            } catch(e) {}
        }
    });
},

    setupEnhancedEventListeners: function() {
        Object.values(this.instances).forEach(editor => {
            // Content change with enhanced debouncing
            editor.onDidChangeModelContent(Utils.debounce((event) => {
                const model = editor.getModel();
                if (!model) return;
                
                const path = model.uri.path.substring(1);
                const value = editor.getValue();
                
                FileSystem.write(path, value);
                
                // Update diagnostics
                this.updateDiagnostics(path, value);
                
                // Update code lens
                this.updateCodeLens(path, value);
                
                // Update file size
                const size = new Blob([value]).size;
                document.getElementById('file-size').textContent = Utils.formatBytes(size);
                
                // Update outline
                FileSystem.updateOutline();
            }, 300));
            
            // Cursor position change
            editor.onDidChangeCursorPosition((event) => {
                document.getElementById('cursor-pos').textContent = 
                    `Ln ${event.position.lineNumber}, Col ${event.position.column}`;
                
                // Update active editor
                this.currentEditorId = Object.keys(this.instances).find(
                    key => this.instances[key] === editor
                ) || 'monaco-root-1';
                
                // Show hover information
                this.showHoverInfo(editor, event.position);
            });
            
            // Model change
            editor.onDidChangeModel((event) => {
                if (event.newModelUrl) {
                    const path = event.newModelUrl.path.substring(1);
                    const lang = Utils.detectLanguage(path);
                    
                    monaco.editor.setModelLanguage(editor.getModel(), lang);
                    
                    document.getElementById('file-lang').textContent = 
                        lang.charAt(0).toUpperCase() + lang.slice(1);
                    
                    // Apply model-specific settings
                    this.applyModelSettings(editor, lang);
                }
            });
            
            // Selection change
            editor.onDidChangeCursorSelection((event) => {
                // Could add selection info or multi-cursor support
            });
            
            // Mouse events
            editor.onMouseDown((event) => {
                // Toggle breakpoint when clicking gutter (glyph margin / line numbers)
                try {
                    if (!event || !event.target) return;
                    const t = event.target;
                    const mt = monaco?.editor?.MouseTargetType;
                    const isGutter = mt && (
                        t.type === mt.GUTTER_GLYPH_MARGIN ||
                        t.type === mt.GUTTER_LINE_NUMBERS ||
                        t.type === mt.GUTTER_LINE_DECORATIONS
                    );
                    if (!isGutter) return;
                    const line = t.position && t.position.lineNumber;
                    if (!line) return;
                    if (window.Debugger && typeof Debugger.toggleBreakpoint === 'function') {
                        Debugger.toggleBreakpoint(line);
                    }
                } catch (e) {
                    console.warn('Gutter click handler failed', e);
                }
            });
            
            // Key events
            editor.onKeyDown((event) => {
                // Custom keyboard shortcuts
                this.handleCustomKeybindings(editor, event);
            });
            
            // Context menu
            editor.onContextMenu((event) => {
                // Custom context menu items
            });
        });
    },
    
    setupCodeLens: function() {
        // Code lens provider for references, implementations, etc.
        // This would require registering a provider with Monaco
    },
    
    setupDiagnostics: function() {
        // Diagnostic collection for errors, warnings, info
        // This would require setting up language-specific diagnostics
    },
    
    updateDiagnostics: function(path, content) {
        // Update diagnostics based on content
        const diagnostics = [];
        const lines = content.split('\n');
        
        // Simple diagnostics for demonstration
        lines.forEach((line, index) => {
            // Check for TODO comments
            if (line.includes('TODO') || line.includes('FIXME')) {
                diagnostics.push({
                    severity: monaco.MarkerSeverity.Info,
                    message: 'TODO comment found',
                    startLineNumber: index + 1,
                    startColumn: line.indexOf('TODO') + 1,
                    endLineNumber: index + 1,
                    endColumn: line.indexOf('TODO') + 5
                });
            }
            
            // Check for console.log in production code
            if (line.includes('console.log') && !line.includes('//')) {
                diagnostics.push({
                    severity: monaco.MarkerSeverity.Warning,
                    message: 'Consider removing console.log for production',
                    startLineNumber: index + 1,
                    startColumn: line.indexOf('console.log') + 1,
                    endLineNumber: index + 1,
                    endColumn: line.indexOf('console.log') + 11
                });
            }
        });
        
        this.diagnostics.set(path, diagnostics);
        
        // Update problems panel
        this.updateProblemsPanel();
    },
    
    updateCodeLens: function(path, content) {
        // Update code lens information
        // This would extract references, implementations, etc.
    },
    
    updateProblemsPanel: function() {
        const problemsHost = document.getElementById('problems-host');
        if (!problemsHost) return;
        
        let totalErrors = 0;
        let totalWarnings = 0;
        let totalInfos = 0;
        
        problemsHost.innerHTML = '';
        
        this.diagnostics.forEach((diagnostics, path) => {
            diagnostics.forEach(diagnostic => {
                const div = document.createElement('div');
                div.className = 'problem-item';
                div.style.padding = '8px 12px';
                div.style.borderBottom = '1px solid var(--border)';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '12px';
                
                const icon = diagnostic.severity === monaco.MarkerSeverity.Error ? 
                    '<i class="fas fa-times-circle" style="color:var(--error)"></i>' :
                    diagnostic.severity === monaco.MarkerSeverity.Warning ?
                    '<i class="fas fa-exclamation-triangle" style="color:var(--warn)"></i>' :
                    '<i class="fas fa-info-circle" style="color:var(--primary)"></i>';
                
                div.innerHTML = `
                    ${icon}
                    <div style="flex:1">
                        <div style="font-size:12px;">${diagnostic.message}</div>
                        <div style="font-size:11px; color:var(--text-dim);">
                            ${path}:${diagnostic.startLineNumber}:${diagnostic.startColumn}
                        </div>
                    </div>
                    <button class="btn icon small" onclick="EditorManager.goToProblem('${path}', ${diagnostic.startLineNumber}, ${diagnostic.startColumn})">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                `;
                
                problemsHost.appendChild(div);
                
                // Update counts
                if (diagnostic.severity === monaco.MarkerSeverity.Error) totalErrors++;
                if (diagnostic.severity === monaco.MarkerSeverity.Warning) totalWarnings++;
                if (diagnostic.severity === monaco.MarkerSeverity.Info) totalInfos++;
            });
        });
        
        // Update footer counters
        document.getElementById('error-count').innerHTML = _sanitize(`<i class="fas fa-times-circle"></i> ${totalErrors}`);
        document.getElementById('warning-count').innerHTML = _sanitize(`<i class="fas fa-exclamation-triangle"></i> ${totalWarnings}`);
        document.getElementById('info-count').innerHTML = _sanitize(`<i class="fas fa-info-circle"></i> ${totalInfos}`);
        
        // Update panel badge
        const problemsBadge = document.getElementById('problems-badge');
        if (problemsBadge) {
            const total = totalErrors + totalWarnings + totalInfos;
            problemsBadge.textContent = total;
            problemsBadge.style.display = total > 0 ? 'inline-flex' : 'none';
        }
    },
    
    goToProblem: function(path, line, column) {
        TabManager.open(path);
        const editor = this.getCurrentEditor();
        if (editor) {
            editor.revealLineInCenter(line);
            editor.setPosition({ lineNumber: line, column: column });
            editor.focus();
        }
    },
    
    showHoverInfo: function(editor, position) {
        // Show hover information for the current position
        // This would integrate with language server for type information
    },
    
    applyModelSettings: function(editor, language) {
        // Apply language-specific settings
        switch (language) {
            case 'typescript':
            case 'javascript':
                editor.updateOptions({
                    suggest: {
                        showSnippets: true
                    }
                });
                break;
            case 'html':
                editor.updateOptions({
                    autoClosingTags: true,
                    autoClosingQuotes: true
                });
                break;
            case 'css':
            case 'scss':
            case 'less':
                editor.updateOptions({
                    colorDecorators: true
                });
                break;
        }
    },
    
    handleCustomKeybindings: function(editor, event) {
        // Handle custom keybindings
        const { ctrlKey, shiftKey, altKey, keyCode } = event;
        
        // Ctrl/Cmd + S - Save
        if ((ctrlKey || event.metaKey) && keyCode === 83) {
            event.preventDefault();
            FileSystem.save(true);
        }
        
        // Ctrl/Cmd + F - Find
        if ((ctrlKey || event.metaKey) && keyCode === 70) {
            event.preventDefault();
            this.findText('');
        }
        
        // Ctrl/Cmd + Shift + H - Replace (changed from F to avoid conflict with Find in Files)
        if ((ctrlKey || event.metaKey) && shiftKey && keyCode === 72) {
            event.preventDefault();
            this.replaceText('', '');
        }
        
        // Ctrl/Cmd + / - Toggle comment
        if ((ctrlKey || event.metaKey) && keyCode === 191) {
            event.preventDefault();
            this.toggleComment();
        }
        
        // Alt + Up/Down - Move line
        if (altKey && (keyCode === 38 || keyCode === 40)) {
            event.preventDefault();
            if (keyCode === 38) this.moveLineUp();
            else this.moveLineDown();
        }
        
        // Ctrl/Cmd + D - Duplicate line
        if ((ctrlKey || event.metaKey) && keyCode === 68) {
            event.preventDefault();
            this.duplicateLine();
        }
        
        // Ctrl/Cmd + Shift + K - Delete line
        if ((ctrlKey || event.metaKey) && shiftKey && keyCode === 75) {
            event.preventDefault();
            this.deleteLine();
        }
    },
    
    moveLineUp: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.moveLinesUpAction').run();
    },
    
    moveLineDown: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.moveLinesDownAction').run();
    },
    
    setFile: function(path, editorId = 'monaco-root-1') {
        const editor = this.instances[editorId];
        if (!editor) {
            console.error(`Editor ${editorId} not found`);
            return;
        }
        
        // ULTRA: persist cursor/scroll per-file
        try { if (window.SessionManager) SessionManager.captureViewStateFromEditor(editor); } catch (e) {}

        const content = FileSystem.read(path);
        const lang = Utils.detectLanguage(path);
        
        // Get or create model
        let model = monaco.editor.getModel(monaco.Uri.parse(`file:///${path}`));
        
        if (!model) {
            model = monaco.editor.createModel(
                content,
                lang,
                monaco.Uri.parse(`file:///${path}`)
            );
        } else {
            model.setValue(content);
        }
        
        // Set model
        editor.setModel(model);
        monaco.editor.setModelLanguage(model, lang);
        
        // Apply model settings
        this.applyModelSettings(editor, lang);
        // ULTRA: restore cursor/scroll if available
        try { if (window.SessionManager) SessionManager.restoreViewStateToEditor(path, editor); } catch (e) {}

        // Update UI
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Update footer
        document.getElementById('file-lang').textContent = 
            lang.charAt(0).toUpperCase() + lang.slice(1);
            
        const size = new Blob([content]).size;
        document.getElementById('file-size').textContent = Utils.formatBytes(size);
        
        // Update active editor
        this.currentEditorId = editorId;
        
        // Update diagnostics and code lens
        this.updateDiagnostics(path, content);
        this.updateCodeLens(path, content);
        
        // Trigger content change event to update outline
        FileSystem.updateOutline();
    },
    
    getCurrentEditor: function() {
        return this.instances[this.currentEditorId];
    },
    
        applySettings: function() {
        const s = IDE.state.settings.editor || {};
        const fontSize = s.fontSize || 14;
        const wordWrap = s.wordWrap ? 'on' : 'off';
        const minimapEnabled = !!s.minimap;

        // Monaco theme is global
        try {
            if (window.monaco && monaco.editor && monaco.editor.setTheme) {
                monaco.editor.setTheme(s.theme || 'vs-dark');
            }
        } catch (e) {}

        Object.values(this.instances).forEach(editor => {
            try {
                if (!editor || !editor.updateOptions) return;

                editor.updateOptions({
                    fontSize: fontSize,
                    fontFamily: s.fontFamily || 'JetBrains Mono, Consolas, Monaco, monospace',
                    wordWrap: wordWrap,
                    minimap: { enabled: minimapEnabled },
                    lineNumbers: s.lineNumbers ? 'on' : 'off',
                    renderWhitespace: s.showWhitespace ? 'all' : 'none',
                    bracketPairColorization: { enabled: !!s.bracketPairColorization },
                    autoClosingBrackets: s.autoClosingBrackets ? 'always' : 'never',
                    autoIndent: s.autoIndent ? 'full' : 'none',
                    suggest: { showSnippets: !!IDE.state.settings.features.snippetSuggestions }
                });

                // Ẩn minimap DOM + buộc Monaco tính lại layout width
                try {
                    const container = editor.getContainerDomNode?.();
                    if (container) container.classList.toggle('minimap-off', !minimapEnabled);
                    // CSS display:none không đủ — Monaco tính layout bằng JS nội bộ
                    // Phải gọi layout() để Monaco recalculate code area width
                    editor.layout();
                } catch(_) {}

                // Model-level options
                const model = editor.getModel && editor.getModel();
                if (model && model.updateOptions) {
                    model.updateOptions({
                        tabSize: Math.max(1, Math.min(8, s.tabSize || 4)),
                        insertSpaces: true
                    });
                }
            } catch (e) {
                console.warn('Failed to apply editor settings', e);
            }
        });

        Utils.setCssVariable('--editor-font-size', fontSize + 'px');
    },

    formatCode: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        const model = editor.getModel();
        if (!model) return;
        
        const range = model.getFullModelRange();
        const text = model.getValue();
        const language = model.getLanguageId();
        
        try {
            let formatted = text;
            let parser = 'babel';
            
            // Determine parser based on language
            switch(language) {
                case 'typescript':
                case 'typescriptreact':
                    parser = 'typescript';
                    break;
                case 'css':
                case 'scss':
                case 'less':
                    parser = 'css';
                    break;
                case 'html':
                    parser = 'html';
                    break;
                case 'json':
                    parser = 'json';
                    break;
                case 'vue':
                    parser = 'vue';
                    break;
            }
            
            const options = {
                parser: parser,
                plugins: [
                    window.prettierPlugins.html, 
                    window.prettierPlugins.babel,
                    window.prettierPlugins.postcss,
                    window.prettierPlugins.typescript
                ],
                tabWidth: IDE.state.settings.editor.tabSize,
                useTabs: false,
                semi: true,
                singleQuote: true,
                trailingComma: 'es5',
                printWidth: 80,
                bracketSpacing: true,
                arrowParens: 'avoid',
                endOfLine: 'lf'
            };
            
            // Try to format
            formatted = prettier.format(text, options);
            
            // Apply formatting
            editor.executeEdits('', [{
                range: range,
                text: formatted,
                forceMoveMarkers: true
            }]);
            
            Utils.toast('Code formatted successfully', 'success');
        } catch (error) {
            console.error('Format error:', error);
            Utils.toast('Format failed: ' + error.message, 'error');
        }
    },
    
    getSelection: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return '';
        
        const selection = editor.getSelection();
        const model = editor.getModel();
        
        if (!selection || !model) return '';
        
        return model.getValueInRange(selection);
    },
    
    insertText: function(text, position = null) {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        const selection = position || editor.getSelection();
        const op = { 
            range: selection, 
            text: text, 
            forceMoveMarkers: true 
        };
        
        editor.executeEdits('', [op]);
        
        // Move cursor to end of inserted text
        const newPosition = editor.getModel().modifyPosition(selection.getEndPosition(), text.length);
        editor.setPosition(newPosition);
    },
    
    findText: function(text, options = {}) {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('actions.find').run();
        
        // Set find widget text
        const findWidget = editor.getContribution('editor.contrib.findController');
        if (findWidget && text) {
            findWidget.start({
                searchString: text,
                replaceString: '',
                isRegex: options.regex || false,
                matchCase: options.caseSensitive || false,
                wholeWord: options.wholeWord || false,
                searchScope: null,
                loop: true
            });
        }
    },
    
    replaceText: function(find, replace, options = {}) {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.startFindReplaceAction').run();
        
        // Set find and replace values
        const findWidget = editor.getContribution('editor.contrib.findController');
        if (findWidget && find) {
            findWidget.start({
                searchString: find,
                replaceString: replace,
                isRegex: options.regex || false,
                matchCase: options.caseSensitive || false,
                wholeWord: options.wholeWord || false
            });
        }
    },
    
    goToLine: function(lineNumber) {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.revealLineInCenter(lineNumber);
        editor.setPosition({ lineNumber: lineNumber, column: 1 });
        editor.focus();
    },
    
    toggleComment: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.commentLine').run();
    },
    
    duplicateLine: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.copyLinesDownAction').run();
    },
    
    deleteLine: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.deleteLines').run();
    },
    
    // Enhanced editor utilities
    getWordAtPosition: function(position) {
        const editor = this.getCurrentEditor();
        if (!editor) return null;
        
        const model = editor.getModel();
        if (!model) return null;
        
        return model.getWordAtPosition(position);
    },
    
    getCurrentWord: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return '';
        
        const position = editor.getPosition();
        const word = this.getWordAtPosition(position);
        return word ? word.word : '';
    },
    
    getCurrentLine: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return '';
        
        const position = editor.getPosition();
        const model = editor.getModel();
        if (!model) return '';
        
        return model.getLineContent(position.lineNumber);
    },
    
    getLineCount: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return 0;
        
        const model = editor.getModel();
        if (!model) return 0;
        
        return model.getLineCount();
    },
    
    // Folding
    foldAll: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.foldAll').run();
    },
    
    unfoldAll: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.unfoldAll').run();
    },
    
    // Selection manipulation
    selectAll: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.setSelection(editor.getModel().getFullModelRange());
    },
    
    expandSelection: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.smartSelect.expand').run();
    },
    
    shrinkSelection: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.smartSelect.shrink').run();
    },
    
    // Multiple cursors
    addCursorAbove: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.insertCursorAbove').run();
    },
    
    addCursorBelow: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.insertCursorBelow').run();
    },
    
    addCursorToLineEnds: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.insertCursorAtEndOfEachLineSelected').run();
    },
    
    // Code actions
    quickFix: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.quickFix').run();
    },
    
    refactor: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.refactor').run();
    },
    
    renameSymbol: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.rename').run();
    },
    
    // Navigation
    goToDefinition: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.revealDefinition').run();
    },
    
    goToTypeDefinition: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.goToTypeDefinition').run();
    },
    
    goToImplementation: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.goToImplementation').run();
    },
    
    goToReferences: function() {
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        editor.getAction('editor.action.goToReferences').run();
    },
    
    // View
    toggleMinimap: function() {
        IDE.state.settings.editor.minimap = !IDE.state.settings.editor.minimap;
        this.applySettings();
    },
    
    toggleWordWrap: function() {
        IDE.state.settings.editor.wordWrap = !IDE.state.settings.editor.wordWrap;
        this.applySettings();
    },
    
    zoomIn: function() {
        IDE.state.settings.editor.fontSize = Math.min(32, IDE.state.settings.editor.fontSize + 1);
        this.applySettings();
    },
    
    zoomOut: function() {
        IDE.state.settings.editor.fontSize = Math.max(8, IDE.state.settings.editor.fontSize - 1);
        this.applySettings();
    },
    
    resetZoom: function() {
        IDE.state.settings.editor.fontSize = 14;
        this.applySettings();
    },
    
    // Advanced features
    showCommandPalette: function() {
        CommandPalette.show();
    },
    
    showColorPicker: function() {
        // This would show a color picker for CSS/HTML colors
        const editor = this.getCurrentEditor();
        if (!editor) return;
        
        const position = editor.getPosition();
        const word = this.getWordAtPosition(position);
        
        if (word) {
            // Check if it's a color value
            const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
            const rgbRegex = /^rgb\(/i;
            const rgbaRegex = /^rgba\(/i;
            const hslRegex = /^hsl\(/i;
            const hslaRegex = /^hsla\(/i;
            
            const value = word.word;
            if (colorRegex.test(value) || rgbRegex.test(value) || rgbaRegex.test(value) || 
                hslRegex.test(value) || hslaRegex.test(value)) {
                // Show color picker
                this.showColorPickerDialog(value, position, word);
            }
        }
    },
    
    showColorPickerDialog: function(color, position, word) {
        // Create color picker dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.id = 'color-picker-dialog';
        
        // This would be a full color picker implementation
        // For now, just show a simple dialog
        dialog.innerHTML = `
            <div class="modal" style="width:400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-palette"></i> Color Picker</h3>
                    <button class="btn icon small" onclick="document.getElementById('color-picker-dialog').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="text-align:center; padding:20px;">
                        <div style="width:100px; height:100px; background:${color}; margin:0 auto 20px; border-radius:8px; border:2px solid var(--border);"></div>
                        <div style="font-family:'JetBrains Mono'; font-size:14px;">${color}</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="document.getElementById('color-picker-dialog').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    },
    // Thêm vào EditorManager object
    disposeEditor: function(editorId) {
        const editor = this.instances[editorId];
        if (!editor) return;
        
        try {
            // Dispose model
            const model = editor.getModel();
            if (model) {
                model.dispose();
            }
            
            // Remove resize observer
            if (editor.resizeObserver) {
                editor.resizeObserver.disconnect();
            }
            
            // Dispose editor
            editor.dispose();
            
            // Clear diagnostics
            this.diagnostics.delete(editorId);
            this.codeLenses.delete(editorId);
            
            // Remove from instances
            delete this.instances[editorId];
            
            if(window.__PROCODE_DEBUG__) console.log(`✅ Editor ${editorId} disposed`);
        } catch (error) {
            console.error('Failed to dispose editor:', error);
        }
    },

    // Cleanup all editors on page unload
    cleanup: function() {
        Object.keys(this.instances).forEach(id => this.disposeEditor(id));
        
        // Dispose all models
        monaco.editor.getModels().forEach(model => {
            try {
                model.dispose();
            } catch (e) {
                // Ignore
            }
        });
    },
};