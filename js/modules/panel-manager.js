/**
 * panel-manager.js
 * Panel — side/bottom panel visibility
 * ProCode IDE v3.0
 */

// ============================================
// PANEL MANAGER
// ============================================
const Panel = {
    show: function(panelId) {
        // Update active panel
        IDE.state.panel = panelId;
        
        // Update tab UI
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelId}"]`)?.classList.add('active');
        
        // Show corresponding panel content
        const panels = ['term-host', 'console-host', 'problems-host', 'output-host'];
        panels.forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById(`${panelId}-host`)?.classList.remove('hidden');
        
        if (panelId === 'console') {
            Console.resetBadge();
        }
        
        // Ensure panel is visible
        const panel = document.getElementById('panel-btm');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        }
        
        // Fit terminal if showing terminal
        if (panelId === 'term') {
            setTimeout(() => TerminalManager.fit(), 50);
        }
    },
    
    toggle: function() {
        const panel = document.getElementById('panel-btm');
        panel.classList.toggle('hidden');
        
        if (!panel.classList.contains('hidden')) {
            this.show(IDE.state.panel);
        }
    },
    
    resize: function(height) {
        const panel = document.getElementById('panel-btm');
        panel.style.height = `${height}px`;
        
        // Adjust editor container
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            const headerHeight = document.querySelector('header').offsetHeight;
            const tabsHeight = document.querySelector('.tabs').offsetHeight;
            const workspaceHeight = window.innerHeight - headerHeight;
            const panelHeight = panel.classList.contains('hidden') ? 0 : height;
            
            editorContainer.style.height = `${workspaceHeight - tabsHeight - panelHeight}px`;
        }
        
        // Fit terminal
        TerminalManager.fit();
    }
};