/**
 * project-templates.js
 * ProjectTemplates — starter templates
 * ProCode IDE v3.0
 */

// ============================================
// PROJECT TEMPLATES MANAGER
// ============================================
const ProjectTemplates = {
    show: function() {
        document.getElementById('templates-modal').style.display = 'flex';
        
        // Setup template selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.onclick = () => {
                document.querySelectorAll('.template-card').forEach(c => {
                    c.style.border = '1px solid transparent';
                });
                card.style.border = '2px solid var(--primary)';
                IDE.state.projectType = card.dataset.template;
            };
        });
    },
    
    hide: function() {
        document.getElementById('templates-modal').style.display = 'none';
    },
    
    create: function() {
        if (!IDE.state.projectType) {
            Utils.toast('Please select a template', 'warning');
            return;
        }
        
        const template = IDE.state.templates[IDE.state.projectType];
        
        // Clear current files
        IDE.state.files = {};
        
        // Create template files
        for (const [path, content] of Object.entries(template)) {
            IDE.state.files[path] = content;
        }
        
        // Save and refresh
        FileSystem.save(true);
        FileSystem.refreshTree();
        
        // Open main file
        const mainFile = Object.keys(template).find(f => 
            f.includes('index.') || f.includes('main.') || f.includes('App.')
        ) || Object.keys(template)[0];
        
        if (mainFile) {
            TabManager.open(mainFile);
        }
        
        this.hide();
        Utils.toast(`Created ${IDE.state.projectType} project`, 'success');
    }
};