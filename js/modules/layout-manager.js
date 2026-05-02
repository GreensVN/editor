/**
 * layout-manager.js
 * LayoutManager — panel sizing, drag, responsive
 * ProCode IDE v3.0
 */

// ============================================
// LAYOUT MANAGER (Continued)
// ============================================
const LayoutManager = {
    toggleLayout: function(panel, forceShow = false) {
        switch(panel) {
            case 'terminal':
                const termPanel = document.getElementById('panel-btm');
                if (forceShow) {
                    termPanel.classList.remove('hidden');
                    Panel.show('term');
                } else {
                    termPanel.classList.toggle('hidden');
                    if (!termPanel.classList.contains('hidden')) {
                        Panel.show('term');
                    }
                }
                break;
                
            case 'preview':
                const previewWrap = document.getElementById('preview-wrap');
                const resizer = document.getElementById('rs-preview');
                
                if (forceShow) {
                    previewWrap.classList.add('visible');
                    resizer.classList.remove('hidden');
                } else {
                    previewWrap.classList.toggle('visible');
                    resizer.classList.toggle('hidden', !previewWrap.classList.contains('visible'));
                }
                
                // Update preview URL
                if (previewWrap.classList.contains('visible')) {
                    const url = document.getElementById('preview-url');
                    const frame = document.getElementById('preview-frame');
                    if (frame.srcdoc) {
                        url.value = 'data:text/html;charset=utf-8,' + encodeURIComponent(frame.srcdoc);
                    }
                }
                break;
                
            case 'split':
                this.splitEditor();
                break;
        }
    },
    
    setSide: function(side) {
        // Update active sidebar
        IDE.state.sidebar = side;
        
        // Update UI
        document.querySelectorAll('.sidebar').forEach(el => {
            el.classList.remove('active');
        });
        
        document.querySelectorAll('.act-btn').forEach(el => {
            el.classList.remove('active');
        });
        
        const sidebar = document.getElementById(`side-${side}`);
        const button = document.querySelector(`[data-id="${side}"]`);
        
        if (sidebar) sidebar.classList.add('active');
        if (button) button.classList.add('active');
    },
    
    splitEditor: function() {
        if (IDE.state.splitView) {
            // Already split, close split
            const container = document.getElementById('editor-container');

            // ── FIX v25: dispose stale editor instances before wiping DOM ──
            try { EditorManager.disposeEditor('monaco-root-2'); } catch(_) {}
            try { EditorManager.disposeEditor('monaco-root-1'); } catch(_) {}

            container.innerHTML = '';
            
            const pane = document.createElement('div');
            pane.className = 'editor-pane';
            pane.id = 'editor-pane-1';
            pane.innerHTML = '<div id="monaco-root-1" style="width:100%; height:100%;"></div>';
            
            container.appendChild(pane);
            
            // Reinitialize editor
            EditorManager.createEditor('monaco-root-1');
            
            // Restore active file
            if (IDE.state.activeTab) {
                EditorManager.setFile(IDE.state.activeTab);
            }
            
            IDE.state.splitView = false;
            IDE.state.editorLayout = 'single';
            
            Utils.toast('Split view disabled', 'info');
        } else {
            // Create split view
            const container = document.getElementById('editor-container');

            // ── FIX v25: dispose stale editor instances before wiping DOM ──
            try { EditorManager.disposeEditor('monaco-root-2'); } catch(_) {}
            try { EditorManager.disposeEditor('monaco-root-1'); } catch(_) {}

            container.innerHTML = '';
            
            // Create two panes
            const pane1 = document.createElement('div');
            pane1.className = 'editor-pane';
            pane1.id = 'editor-pane-1';
            pane1.innerHTML = '<div id="monaco-root-1" style="width:100%; height:100%;"></div>';
            
            const pane2 = document.createElement('div');
            pane2.className = 'editor-pane';
            pane2.id = 'editor-pane-2';
            pane2.innerHTML = '<div id="monaco-root-2" style="width:100%; height:100%;"></div>';
            
            container.appendChild(pane1);
            container.appendChild(pane2);
            
            // Initialize editors
            EditorManager.createEditor('monaco-root-1');
            EditorManager.createEditor('monaco-root-2');
            
            IDE.state.splitView = true;
            IDE.state.editorLayout = 'split';
            
            // Copy current file to second pane if exists
            if (IDE.state.activeTab) {
                EditorManager.setFile(IDE.state.activeTab, 'monaco-root-1');
                EditorManager.setFile(IDE.state.activeTab, 'monaco-root-2');
            }
            
            Utils.toast('Split view enabled', 'info');
        }
    },
    
    openInSplit: function(path) {
        if (!IDE.state.splitView) {
            this.splitEditor();
        }
        
        // Open file in second pane
        setTimeout(() => {
            EditorManager.setFile(path, 'monaco-root-2');
            Utils.toast(`Opened in split view: ${path.split('/').pop()}`, 'info');
        }, 100);
    }
};