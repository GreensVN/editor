/**
 * notifications.js
 * Notifications — toast/alert system
 * ProCode IDE v3.0
 */

// ============================================
// NOTIFICATIONS MANAGER
// ============================================
const Notifications = {
    isVisible: false,
    notifications: [],
    
    toggle: function() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.showNotifications();
        } else {
            this.hideNotifications();
        }
    },
    
    showNotifications: function() {
        // Create notifications panel
        const panel = document.createElement('div');
        panel.id = 'notifications-panel';
        panel.className = 'modal-overlay';
        panel.style.alignItems = 'flex-start';
        panel.style.justifyContent = 'flex-end';
        panel.style.padding = '20px';
        
        panel.innerHTML = `
            <div class="modal" style="width:400px; max-height:80vh; margin:0;">
                <div class="modal-header">
                    <h3><i class="fas fa-bell"></i> Notifications</h3>
                    <button class="btn icon small" onclick="Notifications.toggle()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" id="notifications-list">
                    <div style="text-align:center; padding:40px; color:var(--text-dim);">
                        No notifications
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="Notifications.clearAll()">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        this.updateNotificationsList();
    },
    
    hideNotifications: function() {
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.remove();
        }
        this.isVisible = false;
    },
    
    updateNotificationsList: function() {
        const list = document.getElementById('notifications-list');
        if (!list) return;
        
        if (this.notifications.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-dim);">No notifications</div>';
            return;
        }
        
        list.innerHTML = '';
        
        this.notifications.slice().reverse().forEach((notification, index) => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.style.padding = '12px';
            item.style.borderBottom = '1px solid var(--border)';
            item.style.display = 'flex';
            item.style.gap = '12px';
            item.style.alignItems = 'flex-start';
            
            const icon = notification.type === 'error' ? 'fa-times-circle' :
                        notification.type === 'warning' ? 'fa-exclamation-triangle' :
                        notification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
            
            const iconColor = notification.type === 'error' ? 'var(--error)' :
                             notification.type === 'warning' ? 'var(--warn)' :
                             notification.type === 'success' ? 'var(--success)' : 'var(--primary)';
            
            item.innerHTML = `
                <i class="fas ${icon}" style="color:${iconColor}; margin-top:2px;"></i>
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:500; margin-bottom:4px;">${notification.title}</div>
                    <div style="font-size:11px; color:var(--text-dim);">${notification.message}</div>
                    <div style="font-size:9px; color:var(--text-dim); margin-top:4px;">
                        ${Utils.formatDate(notification.timestamp, 'relative')}
                    </div>
                </div>
                <button class="btn icon small" onclick="Notifications.removeNotification(${this.notifications.length - 1 - index})" style="color:var(--text-dim);">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            list.appendChild(item);
        });
    },
    
    add: function(title, message, type = 'info') {
        const notification = {
            id: Utils.uuid(),
            title: title,
            message: message,
            type: type,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        this.notifications.push(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications.shift();
        }
        
        // Update badge
        this.updateBadge();
        
        // Update UI if visible
        if (this.isVisible) {
            this.updateNotificationsList();
        }
        
        // Show toast
        Utils.toast(message, type);
    },
    
    removeNotification: function(index) {
        if (index >= 0 && index < this.notifications.length) {
            this.notifications.splice(index, 1);
            this.updateBadge();
            this.updateNotificationsList();
        }
    },
    
    clearAll: function() {
        this.notifications = [];
        this.updateBadge();
        this.updateNotificationsList();
        Utils.toast('All notifications cleared', 'info');
    },
    
    updateBadge: function() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.querySelector('[title="Notifications"] .badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
};

// THÊM VÀO cuối file, trước window.addEventListener('load')
class MemoryManager {
    constructor() {
        this.cleanupTasks = [];
        this.memoryWarningThreshold = 0.85; // 85% memory usage
        this.checkInterval = 30000; // 30s
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // ✅ Use requestIdleCallback so memory checks never block the main thread
        const scheduleCheck = () => {
            const rIC = window.requestIdleCallback || ((fn, opt) => {
              const start = Date.now();
              return setTimeout(() => fn({
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
                didTimeout: false
              }), (opt && opt.timeout) || 30000);
            });
            rIC(() => {
                this.checkMemory();
                if (!this._disposed) {
                    this._monitorTimer = setTimeout(scheduleCheck, this.checkInterval);
                }
            }, { timeout: this.checkInterval * 2 });
        };
        if (window.__getPerfMemory()) scheduleCheck(); // FIX: cross-browser

        // ✅ Maintenance when tab becomes hidden (user not watching = safe moment)
        this._visibilityHandler = () => { if (document.hidden) this.performMaintenance(); };
        document.addEventListener('visibilitychange', this._visibilityHandler);
    }
    
    checkMemory() {
        const __mem = window.__getPerfMemory(); if (!__mem) return;
        
        const __memA = window.__getPerfMemory(); if (!__memA) return; const { usedJSHeapSize, jsHeapSizeLimit } = __memA; // FIX: cross-browser
        const usage = usedJSHeapSize / jsHeapSizeLimit;
        
        if (usage > this.memoryWarningThreshold) {
            console.warn(`⚠️ High memory usage: ${(usage * 100).toFixed(1)}%`);
            this.performMaintenance();
        }
    }
    
    performMaintenance() {
        console.log('🧹 Performing memory maintenance...');
        
        // ✅ Clear editor cache
        if (EditorManager.instances) {
            Object.values(EditorManager.instances).forEach(editor => {
                if (editor && editor.getModel()) {
                    const model = editor.getModel();
                    // Clear undo/redo history if too large
                    if (model.getAlternativeVersionId() > 100) {
                        // model.pushEditOperations([], [], () => null);
                    }
                }
            });
        }
        
        // ✅ Clear file cache
        if (FileSystem.fileCache) {
            const cacheSize = Object.keys(FileSystem.fileCache).length;
            if (cacheSize > 50) {
                FileSystem.fileCache = {};
                console.log(`Cleared ${cacheSize} cached files`);
            }
        }
        
        // ✅ Clear terminal history
        if (TerminalManager.terminals) {
            Object.values(TerminalManager.terminals).forEach(term => {
                if (term.commandHistory && term.commandHistory.length > 100) {
                    term.commandHistory = term.commandHistory.slice(-50);
                }
            });
        }
        
        // ✅ Clear console
        if (Console.getHost()) {
            const host = Console.getHost();
            const children = host.children;
            if (children.length > Console.maxEntries) {
                while (children.length > Console.maxEntries / 2) {
                    host.removeChild(children[0]);
                }
            }
        }
        
        // ✅ Flush IndexedDB
        if (IndexedDBManager.batcher) {
            IndexedDBManager.batcher.flush();
        }
        
        // ✅ Clear expired cache
        IndexedDBManager.clearExpiredCache();
        
        // ✅ Run custom cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
        
        console.log('✅ Maintenance complete');
    }
    
    registerCleanupTask(task) {
        this.cleanupTasks.push(task);
    }
    
    dispose() {
        this._disposed = true;
        clearTimeout(this._monitorTimer);
        if (window.cancelIdleCallback && this._idleHandle) cancelIdleCallback(this._idleHandle);
        if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
        this.cleanupTasks = [];
    }
}

// Initialize
window.memoryManager = new MemoryManager();

// Register cleanup for page unload
window.addEventListener('beforeunload', () => {
    window.memoryManager.performMaintenance();
    window.memoryManager.dispose();
});

// ============================================
// INITIALIZATION AND STARTUP
// ============================================
window.addEventListener('load', async function() {
    // console.log unified edition
    console.log(' Build:', window.IDE?.build ?? 'ProCode IDE');
    
    // Update boot progress
    const updateProgress = (message, percent) => {
        document.getElementById('boot-status').textContent = message;
        document.getElementById('boot-progress-fill').style.width = percent + '%';
    };
    
    updateProgress('Loading core modules...', 10);
    
    // Initialize components
    try {
        updateProgress('Initializing file system...', 20);
        await FileSystem.init();
        
        updateProgress('Loading editor engine...', 40);

await EditorManager.init();

// ULTRA: auto-recovery (crash-safe) and session restore
try { if (window.AutoRecovery && AutoRecovery.checkRecovery) AutoRecovery.checkRecovery(); } catch (e) {}
try { if (window.SessionManager && (!window.AutoRecovery || !AutoRecovery.didRestore)) SessionManager.restore(); } catch (e) {}

updateProgress('Starting terminal...', 60);
        TerminalManager.init();
        try { if (TerminalManager.applySettings) TerminalManager.applySettings(); } catch (e) {}
        Console.init();
        // Web Worker is initialized on-demand by the editor/terminal subsystems.
        updateProgress('Loading AI assistant...', 80);
        // AI will load on first use
        
        updateProgress('Finalizing setup...', 95);
        
        // Setup event listeners
        setupEventListeners();
        
        // LAYOUT-FIX: Safety net — always clear is-resizing on global mouseup
        document.addEventListener('mouseup', () => {
            if (document.body.classList.contains('is-resizing')) {
                document.body.classList.remove('is-resizing');
            }
        });
        
        // Setup resizable panels
        setupResizablePanels();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        updateProgress('Ready!', 100);
        
        // Hide loader with delay
        setTimeout(() => {
            document.getElementById('loader-overlay').style.display = 'none';
            // Utils.toast('ProCode IDE v27.0 loaded successfully!', 'success'); // suppressed: unified boot
            
            // Show welcome notification
            Notifications.add(
                'Welcome to ProCode IDE v27.0',
                'Start coding with multi-language support, real AI assistant (Claude), and live preview.',
                'info'
            );
        }, 500);
        
    } catch (error) {
        console.error('Startup failed:', error);
        updateProgress(`Startup failed: ${error.message}`, 100);
        
        setTimeout(() => {
            document.getElementById('loader-overlay').innerHTML = `
                <div style="text-align:center; color:var(--error);">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px;"></i>
                    <div style="font-size:16px; font-weight:600; margin-bottom:10px;">Startup Failed</div>
                    <div style="font-size:13px; color:var(--text-dim); margin-bottom:20px;">${error.message}</div>
                    <button class="btn primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Reload IDE
                    </button>
                </div>
            `;
        }, 1000);
    }
});

// THÊM ngay sau window.addEventListener('load'...)
class GlobalErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
    this._dedup = new Map();
    this._dedupWindowMs = 2500;
    this._dedupMaxBurst = 3;
    this._inConsoleCapture = false;
        this.setupHandlers();
    }
    
    setupHandlers() {
        // ✅ Global error handler
        window.addEventListener('error', (event) => {
            // Skip cross-origin "Script error." — browser hides details for security,
            // these are non-actionable and come from CDN/iframe scripts
            if (!event.filename && event.lineno === 0 && event.colno === 0) return;
            if (event.message === 'Script error.' || event.message === 'Script error') return;
            this.handleError({
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: new Date().toISOString()
            });
            
            // Prevent default only for non-critical errors
            if (!this.isCriticalError(event.error)) {
                event.preventDefault();
            }
        });
        
        // ✅ Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'unhandledRejection',
                message: event.reason?.message || String(event.reason),
                error: event.reason,
                timestamp: new Date().toISOString()
            });
            
            event.preventDefault();
        });
        
        // ✅ Console error override (safe, no recursion)
        this._originalConsoleError = (this._originalConsoleError || console.error).bind(console);
        console.error = (...args) => {
            // Always log using the original console.error
            this._originalConsoleError(...args);

            // Suppress known expected errors from console interception
            const msg = args.map(a => String(a)).join(' ').toLowerCase();
            if ((msg.includes('editormanager') || msg.includes('is not defined')) && !msg.includes('critical')) return;
            // Suppress cross-origin script error cascades — these have no useful info
            if (msg.includes('script error') || msg.includes('unhandled error caught by v31 boundary: script error')) return;

            // Prevent recursion / infinite loops if handleError logs too
            if (this._inConsoleCapture) return;
            this._inConsoleCapture = true;
            try {
                this.handleError({
                    type: 'console',
                    message: args.map(a => {
                        try {
                            if (a instanceof Error) return a.stack || a.message || String(a);
                            if (typeof a === 'object') return JSON.stringify(a, this.safeStringifyReplacer(), 2);
                            return String(a);
                        } catch {
                            return String(a);
                        }
                    }).join(' '),
                    timestamp: new Date().toISOString()
                });
            } finally {
                this._inConsoleCapture = false;
            }
        };
    }
    
    handleError(error) {
        // Deduplicate noisy repeated errors to prevent UI/console spam
        try {
            const sig = (() => {
                const t = Object.prototype.toString.call(error);
                const msg = (error && (error.message || error.reason || error.name)) ? String(error.message || error.reason || error.name) : '';
                const stk = (error && error.stack) ? String(error.stack).slice(0, 200) : '';
                return t + '|' + msg + '|' + stk;
            })();
            const now = Date.now();
            const entry = this._dedup.get(sig) || { count: 0, first: now, last: 0 };
            entry.count += 1;
            entry.last = now;
            if ((now - entry.first) >= this._dedupWindowMs) { entry.count = 1; entry.first = now; }
            this._dedup.set(sig, entry);
            if (entry.count > this._dedupMaxBurst) {
                if (entry.count === this._dedupMaxBurst + 1) {
                    (this._originalConsoleWarn || console.warn).call(console, '⚠️ Suppressing repeated error spam:', msg || t);
                }
                return;
            }
        } catch (_) {}

        this.errors.push(error);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        try { (this._originalConsoleError || console.error).call(console, '🔴 Error caught:', error); } catch (_) {}
        
        // Show user-friendly message for critical errors
        if (this.isCriticalError(error.error)) {
            this.showCriticalError(error);
        }
        
        // Log to backend if configured
        this.logError(error);
    }
    
    isCriticalError(error) {
        if (!error) return false;
        const message = (error.message || '').toLowerCase();
        // Suppress non-critical expected errors
        const suppressPatterns = [
            'editormanager is not defined',
            'is not defined',
            'cannot read prop',
            'optional chain',
        ];
        if (suppressPatterns.some(p => message.includes(p))) return false;
        const criticalMessages = ['out of memory', 'quota exceeded'];
        return criticalMessages.some(msg => message.includes(msg));
    }
    
    showCriticalError(error) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '99999';
        overlay.innerHTML = `
            <div class="modal" style="width:600px;">
                <div class="modal-header" style="background:var(--error);">
                    <h3 style="color:white;"><i class="fas fa-exclamation-triangle"></i> Critical Error</h3>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:16px;">The IDE encountered a critical error:</p>
                    <pre style="background:#1e1e1e; color:#fff; padding:12px; border-radius:8px; overflow:auto; max-height:200px;">${Utils.escapeHtml(error.message)}</pre>
                    <p style="margin-top:16px; color:var(--text-dim); font-size:12px;">
                        Your work has been auto-saved. You may need to reload the page.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="this.closest('.modal-overlay').remove()">Dismiss</button>
                    <button class="btn primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Reload IDE
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-save before showing error
        if (FileSystem.autoSave) {
            FileSystem.autoSave.forceFlush();
        }
    }

    safeStringifyReplacer() {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
            if (value instanceof Error) {
                return { name: value.name, message: value.message, stack: value.stack };
            }
            return value;
        };
    }

    logError(error) {
        // Could send to analytics/logging service
        // For now, just store locally
        try {
            const errorLog = JSON.parse(localStorage.getItem('procode_error_log') || '[]');
            errorLog.push(error);
            
            // Keep only last 100 errors
            if (errorLog.length > 100) {
                errorLog.splice(0, errorLog.length - 100);
            }
            
            localStorage.setItem('procode_error_log', JSON.stringify(errorLog));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    getRecentErrors() {
        return this.errors.slice(-10);
    }
    
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('procode_error_log');
    }
}

// Initialize
window.errorHandler = new GlobalErrorHandler();

// Add error viewer command to Command Palette
// (thêm vào CommandPalette.refreshCommands)
const ViewErrorsCommand = {
    id: 'view-errors',
    text: 'View Recent Errors',
    icon: 'fa-bug',
    action: () => {
        const errors = window.errorHandler.getRecentErrors();
        if (errors.length === 0) {
            Utils.toast('No recent errors', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="width:800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-bug"></i> Recent Errors (${errors.length})</h3>
                    <button class="btn icon small" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height:500px; overflow-y:auto;">
                    ${errors.map(err => `
                        <div style="margin-bottom:16px; padding:12px; background:var(--bg-side); border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span style="font-weight:600; color:var(--error);">${err.type}</span>
                                <span style="font-size:11px; color:var(--text-dim);">${Utils.formatDate(err.timestamp, 'relative')}</span>
                            </div>
                            <pre style="font-size:11px; overflow-x:auto;">${Utils.escapeHtml(err.message)}</pre>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn danger" onclick="window.errorHandler.clearErrors(); this.closest('.modal-overlay').remove(); Utils.toast('Errors cleared', 'info');">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

function setupEventListeners() {
    // ULTRA init
    try { Settings.init(); } catch(e) {}
    try { if (window.SessionManager) SessionManager.init(); } catch(e) {}

    // Command palette input
    const commandInput = document.getElementById('command-input');
    if (commandInput) {
        commandInput.addEventListener('input', () => CommandPalette.refreshCommands());
        commandInput.addEventListener('keydown', (e) => CommandPalette.handleKey(e));
    }
    
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') Search.execute();
        });
    }
    
    // AI input
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                AI.send();
            }
        });
    }
    
    // Spotlight search
    const spotlight = document.getElementById('spotlight');
    if (spotlight) {
        spotlight.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = spotlight.value.trim();
                if (query) {
                    // Search for files containing the query
                    const files = Object.keys(IDE.state.files).filter(path => 
                        path.toLowerCase().includes(query.toLowerCase())
                    );
                    
                    if (files.length > 0) {
                        TabManager.open(files[0]);
                        spotlight.value = '';
                    } else {
                        Utils.toast('No files found', 'warning');
                    }
                }
            }
        });
    }
    
    // Close modals on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close open modals
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
            
            // Close command palette
            CommandPalette.hide();
            
            // Close context menus
            document.querySelectorAll('.context-menu').forEach(menu => {
                menu.remove();
            });
            
            // Close AI assistant
            if (AI.isVisible) {
                AI.toggle();
            }
        }
    });
    
    // Auto-save on blur
    window.addEventListener('blur', () => {
        if (IDE.state.settings.editor.autoSave && IDE.state.dirtyTabs.size > 0) {
            FileSystem.save();
        }
    });

    // Drag & drop import overlay (ULTRA+)
    try { if (window.UltraPlus) UltraPlus.initDragDrop(); } catch(e) {}
}

function setupResizablePanels() {
    // Sidebar resizer
    const sideResizer = document.getElementById('rs-side');
    const sidebar = document.querySelector('.sidebar.active');
    const actBar = document.querySelector('.act-bar');
    
    if (sideResizer && sidebar) {
        let isResizing = false;
        
        sideResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            sideResizer.classList.add('dragging');
            document.body.classList.add('is-resizing');
            document.body.style.cursor = 'col-resize';
            
            const startX = e.clientX;
            const startWidth = sidebar.offsetWidth;
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                let newWidth = startWidth + deltaX;
                
                // Constrain width
                newWidth = Math.max(200, Math.min(600, newWidth));
                
                sidebar.style.width = newWidth + 'px';
                document.documentElement.style.setProperty('--side-w', newWidth + 'px');
            }
            
            function onMouseUp() {
                isResizing = false;
                sideResizer.classList.remove('dragging');
                document.body.classList.remove('is-resizing');
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    // Panel resizer
    const panelResizer = document.getElementById('rs-panel');
    const panel = document.getElementById('panel-btm');
    
    if (panelResizer && panel) {
        let isResizing = false;
        
        panelResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            panelResizer.classList.add('dragging');
            document.body.classList.add('is-resizing');
            document.body.style.cursor = 'row-resize';
            
            const startY = e.clientY;
            const startHeight = panel.offsetHeight;
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const deltaY = startY - e.clientY;
                let newHeight = startHeight + deltaY;
                
                // Constrain height
                newHeight = Math.max(100, Math.min(window.innerHeight - 200, newHeight));
                
                Panel.resize(newHeight);
            }
            
            function onMouseUp() {
                isResizing = false;
                panelResizer.classList.remove('dragging');
                document.body.classList.remove('is-resizing');
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    // Preview resizer
    const previewResizer = document.getElementById('rs-preview');
    const previewWrap = document.getElementById('preview-wrap');
    
    if (previewResizer && previewWrap) {
        let isResizing = false;
        
        previewResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            previewResizer.classList.add('dragging');
            document.body.classList.add('is-resizing');
            document.body.style.cursor = 'col-resize';
            
            const startX = e.clientX;
            const startWidth = previewWrap.offsetWidth;
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const deltaX = startX - e.clientX;
                let newWidth = startWidth + deltaX;
                
                // Constrain width
                newWidth = Math.max(300, Math.min(window.innerWidth - 400, newWidth));
                
                previewWrap.style.width = newWidth + 'px';
            }
            
            function onMouseUp() {
                isResizing = false;
                previewResizer.classList.remove('dragging');
                document.body.classList.remove('is-resizing');
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}