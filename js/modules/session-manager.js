/**
 * session-manager.js
 * SessionManager — save/restore IDE session
 * ProCode IDE v3.0
 */

// ============================================
// SESSION MANAGER (ULTRA)
// ============================================

const SessionManager = {
    KEY: () => `procode_session_v${IDE.version}`,
    viewStates: {},
    _lastHash: '',
    _timer: null,

    init: function() {
        // Load cached session viewstates early (safe)
        try {
            const raw = localStorage.getItem(this.KEY());
            if (raw) {
                const s = JSON.parse(raw);
                if (s && s.viewStates && typeof s.viewStates === 'object') {
                    this.viewStates = s.viewStates;
                }
            }
        } catch (e) {}

        // Periodic save (cheap, only writes when changed)
        if (this._timer) clearInterval(this._timer);
        this._timer = setInterval(() => this.save(false), 2500);
    },

    isRestoreEnabled: function() {
        return IDE.state?.settings?.features?.restoreSession !== false;
    },

    isPersistCursorEnabled: function() {
        return IDE.state?.settings?.features?.persistCursor !== false;
    },

    _normalizePath: function(p) {
        if (!p) return '';
        return String(p).replace(/^\/+/, '');
    },

    _uriToPath: function(uri) {
        try {
            const p = uri?.path || uri?.fsPath || '';
            return this._normalizePath(p);
        } catch { return ''; }
    },

    captureViewStateFromEditor: function(editor) {
        if (!this.isPersistCursorEnabled()) return;
        if (!editor || !editor.getModel || !editor.saveViewState) return;

        const model = editor.getModel();
        if (!model) return;

        const path = this._uriToPath(model.uri);
        if (!path) return;

        try {
            this.viewStates[path] = editor.saveViewState();
        } catch (e) {}
    },

    restoreViewStateToEditor: function(path, editor) {
        if (!this.isPersistCursorEnabled()) return;
        if (!editor || !editor.restoreViewState) return;

        const p = this._normalizePath(path);
        const st = this.viewStates[p];
        if (!st) return;

        try {
            editor.restoreViewState(st);
        } catch (e) {}
    },

    restore: function() {
        if (!this.isRestoreEnabled()) return false;

        try {
            const raw = localStorage.getItem(this.KEY());
            if (!raw) return false;

            const s = JSON.parse(raw);
            if (!s || !Array.isArray(s.tabs) || s.tabs.length === 0) return false;

            // Only keep existing files
            const tabs = s.tabs.filter(p => FileSystem.exists(p));
            if (!tabs.length) return false;

            IDE.state.tabs = tabs;
            IDE.state.activeTab = (s.activeTab && tabs.includes(s.activeTab)) ? s.activeTab : tabs[0];

            if (s.viewStates && typeof s.viewStates === 'object') {
                this.viewStates = s.viewStates;
            }

            // Render tabs + open active
            TabManager.render();
            TabManager.open(IDE.state.activeTab);

            // Restore layout state (best-effort)
            if (typeof s.splitView === 'boolean') {
                IDE.state.splitView = s.splitView;
            }
            if (s.editorLayout) {
                IDE.state.editorLayout = s.editorLayout;
            }

            // Suppressed: routine boot notification
            // Utils.toast('🧠 Session restored', 'success');
            return true;
        } catch (e) {
            console.warn('Session restore failed', e);
            return false;
        }
    },

    save: function(force = false) {
        try {
            const snapshot = {
                version: IDE.version,
                build: IDE.build,
                ts: Date.now(),
                tabs: Array.isArray(IDE.state.tabs) ? [...IDE.state.tabs] : [],
                activeTab: IDE.state.activeTab || null,
                splitView: !!IDE.state.splitView,
                editorLayout: IDE.state.editorLayout || 'single',
                viewStates: this.isPersistCursorEnabled() ? this.viewStates : {}
            };

            const hash = JSON.stringify([snapshot.tabs, snapshot.activeTab, snapshot.splitView, snapshot.editorLayout, Object.keys(snapshot.viewStates).length]);
            if (!force && hash === this._lastHash) return;

            this._lastHash = hash;
            localStorage.setItem(this.KEY(), JSON.stringify(snapshot));
        } catch (e) {}
    }
};