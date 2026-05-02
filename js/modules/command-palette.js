/**
 * command-palette.js
 * CommandPalette — fuzzy-search command runner
 * ProCode IDE v3.0
 */

// ============================================
// COMMAND PALETTE MANAGER
// ============================================
const CommandPalette = {
    mode: 'commands', // 'commands' | 'files'

    show: function(mode = 'commands') {
        this.mode = mode;

        const palette = document.getElementById('command-palette');
        palette.classList.remove('hidden');

        const input = document.getElementById('command-input');
        input.value = '';
        input.placeholder = (mode === 'files') ? 'Type to search files… (use ">" for commands)' : 'Type a command…';
        input.focus();

        this.refreshCommands();
    },

    hide: function() {
        document.getElementById('command-palette').classList.add('hidden');
    },

    _score: function(text, query) {
        if (!query) return 1;
        const t = String(text).toLowerCase();
        const q = String(query).toLowerCase();

        // Direct substring is best
        const idx = t.indexOf(q);
        if (idx >= 0) return 1000 - idx;

        // Fuzzy: all chars in order
        let ti = 0;
        let score = 0;
        for (let qi = 0; qi < q.length; qi++) {
            const ch = q[qi];
            const found = t.indexOf(ch, ti);
            if (found === -1) return 0;
            score += 10;
            // closer is better
            score += Math.max(0, 20 - (found - ti));
            ti = found + 1;
        }
        return score;
    },

    _basename: function(path) {
        const p = String(path || '');
        const parts = p.split('/');
        return parts[parts.length - 1] || p;
    },

    _renderSection: function(listEl, title) {
        const sec = document.createElement('div');
        sec.className = 'command-section';
        sec.textContent = title;
        listEl.appendChild(sec);
    },

    _renderItem: function(listEl, { icon, text, shortcut, onClick, className = '' }) {
        const item = document.createElement('div');
        item.className = `command-item ${className}`.trim();
        item.innerHTML = `
            <div class="command-icon"><i class="fas ${icon}"></i></div>
            <div class="command-text">${text}</div>
            <div class="command-shortcut">${shortcut || ''}</div>
        `;
        item.onclick = onClick;
        listEl.appendChild(item);
        return item;
    },

    refreshCommands: function() {
        const list = document.getElementById('command-list');
        if (!list) return;
        list.innerHTML = '';

        const input = document.getElementById('command-input');
        const raw = (input?.value || '').trim();

        // ">" forces command mode
        const forcedCommands = raw.startsWith('>');
        const query = forcedCommands ? raw.slice(1).trim() : raw;
        const effectiveMode = forcedCommands ? 'commands' : this.mode;

        // Command list
        const commands = [
            // File operations
            { id: 'new-file', text: 'New File', icon: 'fa-file-plus', shortcut: 'Ctrl+N', action: () => FileSystem.createFilePrompt() },
            { id: 'new-folder', text: 'New Folder', icon: 'fa-folder-plus', action: () => FileSystem.createFolderPrompt() },
            { id: 'save', text: 'Save', icon: 'fa-save', shortcut: 'Ctrl+S', action: () => FileSystem.save(true) },
            { id: 'save-all', text: 'Save All', icon: 'fa-save', action: () => FileSystem.save(true) },
            { id: 'close-all', text: 'Close All Tabs', icon: 'fa-times', action: () => TabManager.closeAll() },

            // Edit operations
            { id: 'undo', text: 'Undo', icon: 'fa-undo', shortcut: 'Ctrl+Z', action: () => FileSystem.undo() },
            { id: 'redo', text: 'Redo', icon: 'fa-redo', shortcut: 'Ctrl+Y', action: () => FileSystem.redo() },
            { id: 'format', text: 'Format Document', icon: 'fa-indent', shortcut: 'Shift+Alt+F', action: () => EditorManager.formatDocument?.() },

            // Search
            { id: 'find', text: 'Find', icon: 'fa-search', shortcut: 'Ctrl+F', action: () => EditorManager.findText?.('') },
            { id: 'find-project', text: 'Find in Project', icon: 'fa-search-plus', shortcut: 'Ctrl+Shift+F', action: () => Search.findInProject?.() },

            // View
            { id: 'toggle-preview', text: 'Toggle Preview', icon: 'fa-eye', shortcut: 'Ctrl+B', action: () => LayoutManager.toggleLayout('preview') },
            { id: 'toggle-terminal', text: 'Toggle Terminal', icon: 'fa-terminal', shortcut: 'Ctrl+`', action: () => LayoutManager.toggleLayout('terminal') },
            { id: 'toggle-inspector', text: 'Toggle Inspector', icon: 'fa-crosshairs', shortcut: 'Ctrl+Shift+I', action: () => Inspector?.toggle?.() },

            // Settings
            { id: 'settings', text: 'Open Settings', icon: 'fa-cog', shortcut: 'Ctrl+,', action: () => Settings.show() },
        ];

        // Allow external commands
        if (typeof ViewErrorsCommand !== 'undefined') commands.push(ViewErrorsCommand);

        // ULTRA+ dynamic command injection
        try {
            if (window.UltraPlus && UltraPlus.getCommandPaletteEntries) {
                const extras = UltraPlus.getCommandPaletteEntries().map((c, i) => ({
                    id: c.id || `ultraplus-${i}`,
                    text: c.text || c.name || `ULTRA+ ${i + 1}`,
                    icon: c.icon || 'fa-bolt',
                    shortcut: c.shortcut || '',
                    action: typeof c.action === 'function' ? c.action : (() => {})
                }));
                commands.push(...extras);
            }
        } catch (e) {}

        const cmdMatches = commands
            .map(c => ({ ...c, _score: this._score(`${c.text} ${c.id}`, query) }))
            .filter(c => !query || c._score > 0)
            .sort((a, b) => b._score - a._score)
            .slice(0, 20);

        // File matches (when in files mode OR when query looks like a path)
        let fileMatches = [];
        if (effectiveMode === 'files' || (query.includes('/') && !forcedCommands)) {
            const files = Object.keys(IDE.state.files || {});
            fileMatches = files
                .map(p => ({ path: p, _score: this._score(p, query) }))
                .filter(f => !query || f._score > 0)
                .sort((a, b) => b._score - a._score)
                .slice(0, 25);
        }

        const anyFiles = fileMatches.length > 0;
        const anyCmds = cmdMatches.length > 0;

        if (effectiveMode === 'files') {
            this._renderSection(list, 'Files');
            if (!anyFiles) {
                const empty = document.createElement('div');
                empty.className = 'command-item';
                empty.innerHTML = `<div style="flex:1; text-align:center; color:var(--text-dim);">No files found</div>`;
                list.appendChild(empty);
            } else {
                fileMatches.forEach(f => {
                    const base = this._basename(f.path);
                    const text = `
                        <div class="cp-title">${base}</div>
                        <div class="cp-desc">${f.path}</div>
                    `;
                    const item = document.createElement('div');
                    item.className = 'command-item file-item';
                    item.innerHTML = `
                        <div class="command-icon"><i class="fas fa-file-code"></i></div>
                        <div class="command-text">${text}</div>
                        <div class="command-shortcut"></div>
                    `;
                    item.onclick = () => {
                        TabManager.open(f.path);
                        this.hide();
                    };
                    list.appendChild(item);
                });
            }

            // Also show commands section for convenience (especially when query is empty)
            this._renderSection(list, 'Commands');
            cmdMatches.slice(0, 12).forEach(cmd => {
                this._renderItem(list, {
                    icon: cmd.icon,
                    text: cmd.text,
                    shortcut: cmd.shortcut || '',
                    onClick: () => { cmd.action?.(); this.hide(); }
                });
            });
        } else {
            this._renderSection(list, 'Commands');
            if (!anyCmds) {
                const empty = document.createElement('div');
                empty.className = 'command-item';
                empty.innerHTML = `<div style="flex:1; text-align:center; color:var(--text-dim);">No commands found</div>`;
                list.appendChild(empty);
            } else {
                cmdMatches.forEach(cmd => {
                    this._renderItem(list, {
                        icon: cmd.icon,
                        text: cmd.text,
                        shortcut: cmd.shortcut || '',
                        onClick: () => { cmd.action?.(); this.hide(); }
                    });
                });
            }
        }

        // Auto-select first actionable item
        const first = list.querySelector('.command-item');
        if (first) first.classList.add('selected');
    },

    handleKey: function(event) {
        if (event.key === 'Escape') {
            this.hide();
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const items = Array.from(document.querySelectorAll('#command-list .command-item'))
                .filter(el => !el.classList.contains('command-section'));
            if (!items.length) return;

            let currentIndex = items.findIndex(i => i.classList.contains('selected'));
            if (currentIndex >= 0) items[currentIndex].classList.remove('selected');

            if (event.key === 'ArrowDown') currentIndex = (currentIndex + 1) % items.length;
            else currentIndex = (currentIndex - 1 + items.length) % items.length;

            items[currentIndex].classList.add('selected');
            items[currentIndex].scrollIntoView({ block: 'nearest' });
        }

        if (event.key === 'Enter') {
            const selected = document.querySelector('#command-list .command-item.selected');
            if (selected) selected.click();
        }

        // refresh as user types
        setTimeout(() => this.refreshCommands(), 10);
    }
};