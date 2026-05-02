/**
 * settings-manager.js
 * Settings — preferences, themes, keybindings
 * ProCode IDE v3.0
 */

// ============================================
// SETTINGS MANAGER (Continued)
// ============================================
const Settings = {
    _inited: false,

    init: function() {
        if (this._inited) return;
        this._inited = true;

        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        // Settings tabs: v25 uses sidebar nav (switchSettingsTab global fn)
        // Legacy tab support kept for compatibility

        // Theme options click-to-select
        modal.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                modal.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    },

    show: function() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.init();
        // v25: use new sidebar tab switcher if available, else fallback
        try { switchSettingsTab('editor', modal.querySelector('[data-stab="editor"]')); } catch(_) {}
        this.loadSettings();
    },

    hide: function() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.style.display = 'none';
    },

    switchTab: function(tabKey) {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        modal.querySelectorAll('.tabs .tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabKey);
        });

        modal.querySelectorAll('.settings-tab').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `settings-${tabKey}`);
        });
    },

    loadSettings: function() {
        const s = IDE.state.settings;

        // Editor
        const fs = document.getElementById('font-size-input');
        if (fs) fs.value = s.editor.fontSize;

        const ts = document.getElementById('tab-size-value');
        if (ts) ts.textContent = s.editor.tabSize;

        const ww = document.getElementById('word-wrap-toggle');
        if (ww) ww.checked = !!s.editor.wordWrap;

        const mm = document.getElementById('minimap-toggle');
        if (mm) mm.checked = !!s.editor.minimap;

        const ln = document.getElementById('line-numbers-toggle');
        if (ln) ln.checked = !!s.editor.lineNumbers;

        const fos = document.getElementById('format-on-save-toggle');
        if (fos) fos.checked = !!s.editor.formatOnSave;

        const as = document.getElementById('auto-save-toggle');
        if (as) as.checked = !!s.editor.autoSave;

        // Appearance
        const anim = document.getElementById('animation-toggle');
        if (anim) anim.checked = !!s.appearance.animation;

        const rm = document.getElementById('reduce-motion-toggle');
        if (rm) rm.checked = !!s.appearance.reduceMotion;

        const cm = document.getElementById('compact-mode-toggle');
        if (cm) cm.checked = !!s.appearance.compactMode;

        // Theme options
        document.querySelectorAll('#settings-modal .theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === s.appearance.theme);
        });

        // Features
        const rs = document.getElementById('restore-session-toggle');
        if (rs) rs.checked = s.features.restoreSession !== false;

        const pc = document.getElementById('persist-cursor-toggle');
        if (pc) pc.checked = s.features.persistCursor !== false;

        const cl = document.getElementById('codelens-toggle');
        if (cl) cl.checked = !!s.features.codeLens;

        const bc = document.getElementById('breadcrumbs-toggle');
        if (bc) bc.checked = !!s.features.breadcrumbs;

        const sn = document.getElementById('snippets-toggle');
        if (sn) sn.checked = !!s.features.snippetSuggestions;

        const lp = document.getElementById('live-preview-toggle');
        if (lp) lp.checked = !!s.features.livePreview;

        const git = document.getElementById('git-toggle');
        if (git) git.checked = !!s.features.gitIntegration;

        // Terminal
        const tfs = document.getElementById('terminal-font-size-input');
        if (tfs) tfs.value = s.terminal.fontSize;

        const tcb = document.getElementById('terminal-cursor-blink-toggle');
        if (tcb) tcb.checked = !!s.terminal.cursorBlink;

        const tcs = document.getElementById('terminal-cursor-style-select');
        if (tcs) tcs.value = s.terminal.cursorStyle || 'block';

        // AI
        const aien = document.getElementById('ai-enabled-toggle');
        if (aien) aien.checked = !!s.ai.enabled;

        const aim = document.getElementById('ai-model-input');
        if (aim) {
            const modelVal = s.ai.model || 'claude-sonnet-4-6';
            aim.value = modelVal;
            // If select doesn't have this option, add it
            if (aim.tagName === 'SELECT' && !Array.from(aim.options).find(o => o.value === modelVal)) {
                const opt = new Option(modelVal, modelVal);
                aim.add(opt);
                aim.value = modelVal;
            }
        }

        // Load API key from secure storage
        const apiKeyEl = document.getElementById('ai-api-key-input');
        if (apiKeyEl) {
            try {
                const stored = window.__apiKey ? window.__apiKey.load() : (localStorage.getItem('procode_ai_apikey') || ''); // P2
                apiKeyEl.value = stored;
                if (!s.ai.apiKey && stored) s.ai.apiKey = stored;
            } catch(e) {}
        }

        const ait = document.getElementById('ai-temperature-input');
        if (ait) ait.value = s.ai.temperature;

        const amax = document.getElementById('ai-maxTokens-input');
        if (amax) amax.value = s.ai.maxTokens;

        // Apply theme to UI
        this.applyTheme();
    },

    save: function() {
        const s = IDE.state.settings;

        // Editor
        const fs = document.getElementById('font-size-input');
        if (fs) s.editor.fontSize = Math.max(8, Math.min(32, parseInt(fs.value || '14', 10)));

        const ts = document.getElementById('tab-size-value');
        if (ts) s.editor.tabSize = Math.max(1, Math.min(8, parseInt(ts.textContent || '4', 10)));

        const ww = document.getElementById('word-wrap-toggle');
        if (ww) s.editor.wordWrap = !!ww.checked;

        const mm = document.getElementById('minimap-toggle');
        if (mm) s.editor.minimap = !!mm.checked;

        const ln = document.getElementById('line-numbers-toggle');
        if (ln) s.editor.lineNumbers = !!ln.checked;

        const fos = document.getElementById('format-on-save-toggle');
        if (fos) s.editor.formatOnSave = !!fos.checked;

        const as = document.getElementById('auto-save-toggle');
        if (as) s.editor.autoSave = !!as.checked;

        // Appearance
        const anim = document.getElementById('animation-toggle');
        if (anim) s.appearance.animation = !!anim.checked;

        const rm = document.getElementById('reduce-motion-toggle');
        if (rm) s.appearance.reduceMotion = !!rm.checked;

        const cm = document.getElementById('compact-mode-toggle');
        if (cm) s.appearance.compactMode = !!cm.checked;

        const activeTheme = document.querySelector('#settings-modal .theme-option.active');
        if (activeTheme) s.appearance.theme = activeTheme.dataset.theme;

        // Features
        const rs = document.getElementById('restore-session-toggle');
        if (rs) s.features.restoreSession = !!rs.checked;

        const pc = document.getElementById('persist-cursor-toggle');
        if (pc) s.features.persistCursor = !!pc.checked;

        const cl = document.getElementById('codelens-toggle');
        if (cl) s.features.codeLens = !!cl.checked;

        const bc = document.getElementById('breadcrumbs-toggle');
        if (bc) s.features.breadcrumbs = !!bc.checked;

        const sn = document.getElementById('snippets-toggle');
        if (sn) s.features.snippetSuggestions = !!sn.checked;

        const lp = document.getElementById('live-preview-toggle');
        if (lp) s.features.livePreview = !!lp.checked;

        const git = document.getElementById('git-toggle');
        if (git) s.features.gitIntegration = !!git.checked;

        // Terminal
        const tfs = document.getElementById('terminal-font-size-input');
        if (tfs) s.terminal.fontSize = Math.max(8, Math.min(32, parseInt(tfs.value || '13', 10)));

        const tcb = document.getElementById('terminal-cursor-blink-toggle');
        if (tcb) s.terminal.cursorBlink = !!tcb.checked;

        const tcs = document.getElementById('terminal-cursor-style-select');
        if (tcs) s.terminal.cursorStyle = tcs.value || 'block';

        // AI
        const aien = document.getElementById('ai-enabled-toggle');
        if (aien) s.ai.enabled = !!aien.checked;

        const aim = document.getElementById('ai-model-input');
        if (aim) s.ai.model = ((aim.value || (aim.options && aim.options[aim.selectedIndex] ? aim.options[aim.selectedIndex].value : '')) || 'claude-sonnet-4-6').trim();

        // Save API key to localStorage (never to IDB to avoid accidental serialization)
        const apiKeyEl = document.getElementById('ai-api-key-input');
        if (apiKeyEl) {
            const key = apiKeyEl.value.trim();
            s.ai.apiKey = key;
            try {
                window.__apiKey.save(key); // P2: obfuscated save
            } catch(e) {}
            // Refresh AI panel
            try { if (window.AI && AI.checkApiKey) AI.checkApiKey(); } catch(e) {}
        }

        const ait = document.getElementById('ai-temperature-input');
        if (ait) s.ai.temperature = Math.max(0, Math.min(1, parseFloat(ait.value || '0.7')));

        const amax = document.getElementById('ai-maxTokens-input');
        if (amax) s.ai.maxTokens = Math.max(64, parseInt(amax.value || '1000', 10));

        // Apply to subsystems
        try { EditorManager.applySettings(); } catch (e) { console.warn('Editor applySettings failed', e); }
        try { if (TerminalManager.applySettings) TerminalManager.applySettings(); } catch (e) { console.warn('Terminal applySettings failed', e); }

        // Apply theme to UI
        this.applyTheme();

        // Save to persistent storage
        try { FileSystem.save(true); } catch (e) { console.warn('Save failed', e); }
        try { if (window.SessionManager) SessionManager.save(true); } catch (e) {}

        this.hide();
        Utils.toast('Settings saved', 'success');
    },

    changeFontSize: function(delta) {
        const input = document.getElementById('font-size-input');
        if (!input) return;
        let value = parseInt(input.value || '14', 10) + delta;
        value = Math.max(8, Math.min(32, value));
        input.value = value;
    },

    changeTerminalFontSize: function(delta) {
        const input = document.getElementById('terminal-font-size-input');
        if (!input) return;
        let value = parseInt(input.value || '13', 10) + delta;
        value = Math.max(8, Math.min(32, value));
        input.value = value;
    },

    changeTabSize: function(delta) {
        const span = document.getElementById('tab-size-value');
        if (!span) return;
        let value = parseInt(span.textContent || '4', 10) + delta;
        value = Math.max(1, Math.min(8, value));
        span.textContent = value;
    },

        applyTheme: function() {
        const s = IDE.state.settings;
        const theme = s.appearance.theme;
        const root = document.documentElement;
        const body = document.body || document.documentElement;

        // UI theme variables
        switch (theme) {
            case 'light':
                root.style.setProperty('--bg', '#ffffff');
                root.style.setProperty('--bg-dark', '#f5f5f7');
                root.style.setProperty('--bg-panel', '#ffffff');
                root.style.setProperty('--bg-side', '#fafafa');
                root.style.setProperty('--border', '#e5e7eb');
                root.style.setProperty('--text', '#111827');
                root.style.setProperty('--text-dim', '#6b7280');
                break;
            case 'night':
                root.style.setProperty('--bg', '#05050a');
                root.style.setProperty('--bg-dark', '#05050a');
                root.style.setProperty('--bg-panel', '#0b0b12');
                root.style.setProperty('--bg-side', '#090910');
                root.style.setProperty('--border', '#1f1f2a');
                root.style.setProperty('--text', '#e5e7eb');
                root.style.setProperty('--text-dim', '#8b8b99');
                break;
            default: // dark
                root.style.setProperty('--bg', '#0b0b0f');
                root.style.setProperty('--bg-dark', '#09090b');
                root.style.setProperty('--bg-panel', '#18181b');
                root.style.setProperty('--bg-side', '#121215');
                root.style.setProperty('--border', '#27272a');
                root.style.setProperty('--text', '#e4e4e7');
                root.style.setProperty('--text-dim', '#71717a');
        }

        // Motion / density
        const prefersReduced = (() => {
            try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
            catch { return false; }
        })();

        const reduceMotion = !!s.appearance.reduceMotion || (prefersReduced && s.appearance.animation === false);
        const animEnabled = (s.appearance.animation !== false) && !reduceMotion;

        body.classList.toggle('reduce-motion', reduceMotion);
        body.classList.toggle('no-anim', !animEnabled);
        body.classList.toggle('compact', !!s.appearance.compactMode);

        // Sync editor theme with UI theme (sane default)
        const desiredEditorTheme = (theme === 'light') ? 'vs' : 'vs-dark';
        if (s.editor && s.editor.theme !== desiredEditorTheme) {
            s.editor.theme = desiredEditorTheme;
        }
        try {
            if (window.monaco && monaco.editor && monaco.editor.setTheme) {
                monaco.editor.setTheme(desiredEditorTheme);
            }
        } catch (e) {}

        // Update theme-color for mobile UIs
        try {
            let meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#0b0b0f');
        } catch (e) {}
    }
};