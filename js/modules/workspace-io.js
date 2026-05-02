/**
 * workspace-io.js
 * WorkspaceIO — import/export, snapshots
 * ProCode IDE v3.0
 */

// ============================================
// ULTRA+ (v21.0): WORKSPACE I/O + SNAPSHOTS + SHORTCUTS
// ============================================

const WorkspaceIO = {
    dirHandle: null,
    openedAt: null,

    isSupported: function() {
        return ('showDirectoryPicker' in window) && ('FileSystemFileHandle' in window || 'FileSystemHandle' in window);
    },

    // Read a folder into IDE.state.files
    openDirectory: async function({ replace = true } = {}) {
        try {
            if (!this.isSupported()) {
                Utils.toast('File System Access API not supported. Use Import instead (ZIP / files).', 'info');
                return false;
            }

            // Unsaved changes guard
            if (replace && IDE.state?.dirtyTabs && IDE.state.dirtyTabs.size > 0) {
                const ok = confirm('You have unsaved changes. Continue and replace the current workspace?');
                if (!ok) return false;
            }

            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            if (!handle) return false;

            const { files, skipped } = await this._readDirectoryRecursive(handle, '');
            if (replace) {
                IDE.state.files = files;
                IDE.state.tabs = [];
                IDE.state.activeTab = null;
                IDE.state.dirtyTabs.clear();
            } else {
                Object.assign(IDE.state.files, files);
            }

            this.dirHandle = handle;
            this.openedAt = Date.now();

            FileSystem.save(true);
            FileSystem.refreshTree();

            const count = Object.keys(files).length;
            Utils.toast(`📂 Opened folder: ${count} file(s)${skipped ? ` (skipped ${skipped})` : ''}`, 'success');
            return true;
        } catch (e) {
            if (e && e.name === 'AbortError') return false;
            Utils.toast('Open folder failed: ' + (e?.message || String(e)), 'error');
            return false;
        }
    },

    // Write all current files back to the opened folder
    syncToDisk: async function({ onlyDirty = false } = {}) {
        try {
            if (!this.dirHandle) {
                Utils.toast('No folder opened. Use "Workspace: Open Folder" first.', 'warning');
                return false;
            }

            const files = IDE.state.files || {};
            const dirty = IDE.state.dirtyTabs || new Set();
            let wrote = 0;
            let skipped = 0;

            for (const [path, content] of Object.entries(files)) {
                if (!path || path.endsWith('.keep')) continue;
                if (onlyDirty && !dirty.has(path)) { skipped++; continue; }

                try {
                    await this._writeFileToDirectory(this.dirHandle, path, content);
                    wrote++;
                } catch (e) {
                    console.warn('Sync write failed:', path, e);
                }
            }

            FileSystem.save(true);
            if (onlyDirty) dirty.clear();

            Utils.toast(`✅ Synced to disk: ${wrote} file(s)${skipped ? `, skipped ${skipped}` : ''}`, 'success');
            return true;
        } catch (e) {
            Utils.toast('Sync failed: ' + (e?.message || String(e)), 'error');
            return false;
        }
    },

    // Pull the opened folder again and merge into workspace
    pullFromDisk: async function() {
        try {
            if (!this.dirHandle) {
                Utils.toast('No folder opened. Use "Workspace: Open Folder" first.', 'warning');
                return false;
            }

            const { files, skipped } = await this._readDirectoryRecursive(this.dirHandle, '');
            const dirty = IDE.state.dirtyTabs || new Set();

            let updated = 0, ignored = 0;
            for (const [path, content] of Object.entries(files)) {
                if (dirty.has(path)) { ignored++; continue; }
                if (IDE.state.files[path] !== content) {
                    IDE.state.files[path] = content;
                    updated++;
                }
            }

            FileSystem.save(true);
            FileSystem.refreshTree();

            if (IDE.state.activeTab && FileSystem.exists(IDE.state.activeTab)) {
                try { EditorManager.setFile(IDE.state.activeTab); } catch (_) {}
            }

            Utils.toast(`⬇️ Pulled from disk: updated ${updated}${ignored ? `, ignored ${ignored} dirty` : ''}${skipped ? ` (skipped ${skipped})` : ''}`, 'success');
            return true;
        } catch (e) {
            Utils.toast('Pull failed: ' + (e?.message || String(e)), 'error');
            return false;
        }
    },

    _readDirectoryRecursive: async function(dirHandle, prefix) {
        const files = {};
        let skipped = 0;

        for await (const [name, handle] of dirHandle.entries()) {
            if (!name) continue;
            // skip common junk by default
            if (name === 'node_modules' || name === '.git' || name === '.DS_Store') { skipped++; continue; }
            if (name.startsWith('.') && name !== '.env') { skipped++; continue; }

            if (handle.kind === 'file') {
                try {
                    const file = await handle.getFile();
                    // safety size cap
                    if (file.size > 5 * 1024 * 1024) { skipped++; continue; }
                    const text = await file.text();
                    files[prefix + name] = text;
                } catch (e) {
                    skipped++;
                }
            } else if (handle.kind === 'directory') {
                const sub = await this._readDirectoryRecursive(handle, prefix + name + '/');
                Object.assign(files, sub.files);
                skipped += sub.skipped;
            }
        }

        return { files, skipped };
    },

    _writeFileToDirectory: async function(rootDirHandle, path, content) {
        const parts = String(path).split('/').filter(Boolean);
        if (parts.length === 0) return;

        let dir = rootDirHandle;
        for (let i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }

        const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content ?? '');
        await writable.close();
    }
};

const SnapshotManager = {
    KEY_LIST: () => `procode_snapshots_v${IDE.version}`,
    _cache: null,

    _supportsDB: function() {
        return !!window.indexedDB && !!window.IndexedDBManager;
    },

    _loadListLocal: function() {
        try {
            const raw = localStorage.getItem(this.KEY_LIST());
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch { return []; }
    },

    _saveListLocal: function(list) {
        try { localStorage.setItem(this.KEY_LIST(), JSON.stringify(list)); } catch {}
    },

    _snapshotKey: function(id) { return `procode_snapshot_${IDE.version}_${id}`; },

    list: async function() {
        if (this._cache) return this._cache;

        if (this._supportsDB()) {
            try {
                await IndexedDBManager.init();
                const list = await IndexedDBManager.getSetting(this.KEY_LIST());
                this._cache = Array.isArray(list) ? list : [];
                return this._cache;
            } catch (e) {}
        }

        this._cache = this._loadListLocal();
        return this._cache;
    },

    _saveList: async function(list) {
        this._cache = list;
        if (this._supportsDB()) {
            try {
                await IndexedDBManager.init();
                await IndexedDBManager.setSetting(this.KEY_LIST(), list);
                return;
            } catch (e) {}
        }
        this._saveListLocal(list);
    },

    create: async function(name = 'Snapshot') {
        const id = Utils.uuid('snap_');
        const ts = Date.now();

        const payload = {
            id, name, ts,
            files: IDE.state.files,
            tabs: IDE.state.tabs,
            activeTab: IDE.state.activeTab,
            settings: IDE.state.settings,
            viewStates: (window.SessionManager ? SessionManager.viewStates : {})
        };

        // Store payload (prefer IndexedDB, fallback localStorage w/ compression if available)
        let stored = false;

        if (this._supportsDB()) {
            try {
                await IndexedDBManager.init();
                await IndexedDBManager.setSetting(this._snapshotKey(id), payload);
                stored = true;
            } catch (e) {}
        }

        if (!stored) {
            try {
                const json = JSON.stringify(payload);
                const data = (window.LZString && LZString.compressToUTF16) ? ('lz:' + LZString.compressToUTF16(json)) : ('raw:' + json);
                localStorage.setItem(this._snapshotKey(id), data);
                stored = true;
            } catch (e) {}
        }

        if (!stored) {
            Utils.toast('Snapshot failed (storage full?)', 'error');
            return false;
        }

        // Update list (max 15)
        const list = await this.list();
        const next = [{ id, name, ts }, ...list].slice(0, 15);
        await this._saveList(next);

        Utils.toast(`📸 Snapshot created: ${name}`, 'success');
        return true;
    },

    createPrompt: async function() {
        const name = prompt('Snapshot name:', `Snapshot ${new Date().toLocaleString()}`);
        if (!name) return false;
        return this.create(name);
    },

    _loadPayload: async function(id) {
        if (this._supportsDB()) {
            try {
                await IndexedDBManager.init();
                const p = await IndexedDBManager.getSetting(this._snapshotKey(id));
                if (p && p.files) return p;
            } catch (e) {}
        }

        try {
            const raw = localStorage.getItem(this._snapshotKey(id));
            if (!raw) return null;
            if (raw.startsWith('lz:') && window.LZString) {
                const json = LZString.decompressFromUTF16(raw.slice(3));
                return JSON.parse(json);
            }
            if (raw.startsWith('raw:')) return JSON.parse(raw.slice(4));
        } catch (e) {}
        return null;
    },

    restore: async function(id) {
        const payload = await this._loadPayload(id);
        if (!payload || !payload.files) {
            Utils.toast('Snapshot not found', 'warning');
            return false;
        }

        const ok = confirm(`Restore snapshot "${payload.name || id}"? This will replace current workspace in memory.`);
        if (!ok) return false;

        IDE.state.files = payload.files || IDE.state.files;
        IDE.state.tabs = Array.isArray(payload.tabs) ? payload.tabs : [];
        IDE.state.activeTab = payload.activeTab || null;
        IDE.state.settings = payload.settings || IDE.state.settings;

        if (window.SessionManager && payload.viewStates && typeof payload.viewStates === 'object') {
            SessionManager.viewStates = payload.viewStates;
        }

        try { Settings.applyTheme(); } catch (e) {}
        try { EditorManager.applySettings(); } catch (e) {}

        FileSystem.save(true);
        FileSystem.refreshTree();

        if (IDE.state.activeTab && FileSystem.exists(IDE.state.activeTab)) {
            TabManager.open(IDE.state.activeTab);
        }

        Utils.toast('✅ Snapshot restored', 'success');
        return true;
    },

    delete: async function(id) {
        const ok = confirm('Delete this snapshot?');
        if (!ok) return false;

        if (this._supportsDB()) {
            try {
                await IndexedDBManager.init();
                await IndexedDBManager.setSetting(this._snapshotKey(id), null);
            } catch (e) {}
        }
        try { localStorage.removeItem(this._snapshotKey(id)); } catch {}

        const list = await this.list();
        const next = list.filter(s => s.id !== id);
        await this._saveList(next);

        Utils.toast('Snapshot deleted', 'info');
        return true;
    },

    showManager: async function() {
        const list = await this.list();
        const html = `
        <div class="modal-overlay" id="snapshots-modal">
          <div class="modal" style="width: 680px; max-width: calc(100vw - 24px);">
            <div class="modal-header">
              <h3><i class="fas fa-camera"></i> Snapshots</h3>
              <button class="btn icon small" onclick="document.getElementById('snapshots-modal')?.remove()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow:auto;">
              <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
                <button class="btn" onclick="SnapshotManager.createPrompt()"><i class="fas fa-plus"></i> Create</button>
                <div style="color: var(--text-dim); font-size: 12px;">Tip: Use snapshots before big refactors.</div>
              </div>

              ${list.length ? `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${list.map(s => `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:12px; background: var(--bg-dark);">
                      <div style="min-width:0;">
                        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.escapeHtml(s.name || 'Snapshot')}</div>
                        <div style="font-size:12px; color:var(--text-dim); margin-top:2px;">${new Date(s.ts).toLocaleString()}</div>
                      </div>
                      <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="btn small" onclick="SnapshotManager.restore('${s.id}')"><i class="fas fa-undo"></i> Restore</button>
                        <button class="btn danger small" onclick="SnapshotManager.delete('${s.id}'); document.getElementById('snapshots-modal')?.remove(); SnapshotManager.showManager();"><i class="fas fa-trash"></i></button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding:20px; text-align:center; color:var(--text-dim);">
                  No snapshots yet.
                </div>
              `}
            </div>
            <div class="modal-footer">
              <button class="btn" onclick="document.getElementById('snapshots-modal')?.remove()">Close</button>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

const ShortcutsModal = {
    show: function() {
        const html = `
        <div class="modal-overlay" id="shortcuts-modal">
          <div class="modal" style="width: 760px; max-width: calc(100vw - 24px);">
            <div class="modal-header">
              <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
              <button class="btn icon small" onclick="document.getElementById('shortcuts-modal')?.remove()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow:auto;">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${[
                    ['Ctrl + N', 'New file'],
                    ['Ctrl + S', 'Save project'],
                    ['Ctrl + Shift + S', 'Export ZIP'],
                    ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / Redo'],
                    ['Ctrl + F', 'Find in file'],
                    ['Ctrl + Shift + F', 'Find in project'],
                    ['Ctrl + H', 'Replace'],
                    ['Ctrl + P', 'Quick open file'],
                    ['Ctrl + Shift + P', 'Command palette'],
                    ['Ctrl + B', 'Toggle Preview'],
                    ['Ctrl + `', 'Toggle Terminal'],
                    ['Ctrl + \\', 'Split editor'],
                    ['F5', 'Run'],
                    ['F9', 'Debugger'],
                    ['Ctrl + Shift + I', 'Toggle Inspector'],
                    ['Ctrl + Alt + O', 'Open folder (FS Access)'],
                    ['Ctrl + Alt + S', 'Sync to disk (FS Access)'],
                    ['Ctrl + Alt + R', 'Pull from disk (FS Access)'],
                    ['F1', 'Show shortcuts'],
                ].map(([k,v]) => `
                  <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:12px; background: var(--bg-dark);">
                    <div style="font-family: JetBrains Mono, monospace; font-size: 12px;">${k}</div>
                    <div style="color: var(--text-dim); font-size: 12px; text-align:right;">${v}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn" onclick="document.getElementById('shortcuts-modal')?.remove()">Close</button>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

const UltraPlus = {
    getCommandPaletteEntries: function() {
        return [
            { name: 'Workspace: Open Folder (FS Access)', shortcut: 'Ctrl+Alt+O', icon: 'fa-folder-open', action: () => WorkspaceIO.openDirectory({ replace: true }) },
            { name: 'Workspace: Sync to Disk (FS Access)', shortcut: 'Ctrl+Alt+S', icon: 'fa-upload', action: () => WorkspaceIO.syncToDisk({ onlyDirty: false }) },
            { name: 'Workspace: Pull from Disk (FS Access)', shortcut: 'Ctrl+Alt+R', icon: 'fa-download', action: () => WorkspaceIO.pullFromDisk() },
            { name: 'Snapshots: Create', shortcut: '', icon: 'fa-camera', action: () => SnapshotManager.createPrompt() },
            { name: 'Snapshots: Manage', shortcut: '', icon: 'fa-history', action: () => SnapshotManager.showManager() },
            { name: 'Help: Keyboard Shortcuts', shortcut: 'F1', icon: 'fa-keyboard', action: () => ShortcutsModal.show() },
            { name: 'View: Toggle Compact Mode', shortcut: '', icon: 'fa-compress-arrows-alt', action: () => { IDE.state.settings.appearance.compactMode = !IDE.state.settings.appearance.compactMode; Settings.applyTheme(); FileSystem.save(true); } },
            { name: 'View: Toggle Reduce Motion', shortcut: '', icon: 'fa-person-walking', action: () => { IDE.state.settings.appearance.reduceMotion = !IDE.state.settings.appearance.reduceMotion; Settings.applyTheme(); FileSystem.save(true); } },
        ];
    },

    initDragDrop: function() {
        const overlay = document.getElementById('drag-overlay');
        if (!overlay) return;

        let counter = 0;

        const show = () => {
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
        };
        const hide = () => {
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
        };

        window.addEventListener('dragenter', (e) => {
            if (!e.dataTransfer) return;
            counter++;
            e.preventDefault();
            show();
        });

        window.addEventListener('dragover', (e) => {
            if (!e.dataTransfer) return;
            e.preventDefault();
            show();
        });

        window.addEventListener('dragleave', (e) => {
            counter = Math.max(0, counter - 1);
            if (counter === 0) hide();
        });

        window.addEventListener('drop', async (e) => {
            if (!e.dataTransfer) return;
            e.preventDefault();
            counter = 0;
            hide();

            try {
                if (FileSystem.importFromDataTransfer) {
                    await FileSystem.importFromDataTransfer(e.dataTransfer, '');
                } else {
                    // fallback
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) {
                        await FileSystem.importFromFiles(files, '');
                    }
                }
            } catch (err) {
                Utils.toast('Import failed: ' + (err?.message || String(err)), 'error');
            }
        });
    }
};

// Expose for command palette actions
window.WorkspaceIO = WorkspaceIO;
window.SnapshotManager = SnapshotManager;
window.ShortcutsModal = ShortcutsModal;
window.UltraPlus = UltraPlus;