/**
 * console-manager.js
 * Console — output panel, logging
 * ProCode IDE v3.0
 */

// ============================================
// CONSOLE MANAGER
// ============================================
const Console = {
    maxEntries: 500,
    unreadCount: 0,
    
    getHost: function() {
        return document.getElementById('console-host');
    },
    
    getBadge: function() {
        return document.getElementById('console-badge');
    },
    
    init: function() {
        this.clear();
    },
    
    isConsoleVisible: function() {
        const panel = document.getElementById('panel-btm');
        if (!panel || panel.classList.contains('hidden')) {
            return false;
        }
        return IDE.state.panel === 'console';
    },
    
    formatArg: function(arg) {
        if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}`;
        }
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (error) {
                return String(arg);
            }
        }
        return String(arg);
    },
    
    append: function(level, args) {
        const host = this.getHost();
        if (!host) {
            return;
        }
        
        const line = document.createElement('div');
        const safeArgs = Array.isArray(args) ? args : [args];
        const safeLevel = ['log', 'info', 'warn', 'error', 'success'].includes(level) ? level : 'log';
        line.className = `console-line console-${safeLevel}`;
        line.textContent = safeArgs.map((arg) => this.formatArg(arg)).join(' ');
        host.appendChild(line);
        
        while (host.children.length > this.maxEntries) {
            host.removeChild(host.firstChild);
        }
        
        host.scrollTop = host.scrollHeight;
        
        if (!this.isConsoleVisible()) {
            this.unreadCount += 1;
            this.updateBadge();
        } else {
            this.resetBadge();
        }
    },
    
    log: function(...args) {
        this.append('log', args);
    },
    
    info: function(...args) {
        this.append('info', args);
    },
    
    warn: function(...args) {
        this.append('warn', args);
    },
    
    error: function(...args) {
        this.append('error', args);
    },
    
    success: function(...args) {
        this.append('success', args);
    },
    
    clear: function() {
        const host = this.getHost();
        if (host) {
            host.innerHTML = '';
        }
        this.resetBadge();
    },
    
    updateBadge: function() {
        const badge = this.getBadge();
        if (!badge) return;
        
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    },
    
    resetBadge: function() {
        this.unreadCount = 0;
        this.updateBadge();
    }
};