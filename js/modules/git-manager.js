/**
 * git-manager.js
 * Git — isomorphic-git integration
 * ProCode IDE v3.0
 */

// ============================================
// GIT INTEGRATION MANAGER
// ============================================
const Git = {
    branch: function() {
        Console.warn('Git integration is not available in this environment.');
        return 'local';
    },
    
    status: function() {
        const dirtyFiles = IDE.state.dirtyTabs.size;
        
        if (dirtyFiles === 0) {
            Console.info('No local changes');
            document.getElementById('git-status-text').textContent = 'Local clean';
        } else {
            Console.info(`${dirtyFiles} local change${dirtyFiles === 1 ? '' : 's'}`);
            document.getElementById('git-status-text').textContent = `${dirtyFiles} local`;
        }
        
        return dirtyFiles;
    },
    
    commit: function() {
        Console.warn('Git commit requires an external terminal.');
        Utils.toast('Git commit not available in this environment', 'warning');
    },
    
    push: function() {
        Console.warn('Git push requires an external terminal.');
        Utils.toast('Git push not available in this environment', 'warning');
    },
    
    init: function() {
        Console.warn('Git init requires an external terminal.');
        Utils.toast('Git init not available in this environment', 'warning');
    }
};