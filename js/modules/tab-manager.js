/**
 * tab-manager.js
 * TabManager — tab bar, switching, closing, dirty state
 * ProCode IDE v3.0
 */

// ============================================
// ENHANCED TAB MANAGER
// ============================================
const TabManager = {
    open: function(path) {
        if (!path || !FileSystem.exists(path)) {
            console.error(`File not found: ${path}`);
            return;
        }
        
        // ── FIX v25: always dismiss overlays before opening editor ──
        try { document.getElementById('empty-state').style.display = 'none'; } catch(_) {}
        try { document.getElementById('v24-welcome')?.classList.remove('show'); } catch(_) {}
        try { window.BentoDashboard?.hide?.(); } catch(_) {}

        // Add to tabs if not already
        if (!IDE.state.tabs.includes(path)) {
            IDE.state.tabs.push(path);
        }
        
        // Set as active
        IDE.state.activeTab = path;
        
        // Render tabs
        this.render();
        
        // Set file in editor
        EditorManager.setFile(path);
        
        // Update tree highlight
        this.highlightTreeItem(path);
        
        // Update outline
        FileSystem.updateOutline();
        
        // Update tab dirty state
        FileSystem.updateTabDirtyState();
    },
    
    close: function(path, force = false) {
        if (!IDE.state.tabs.includes(path)) return;
        
        // Check if file has unsaved changes
        if (IDE.state.dirtyTabs.has(path) && !force) {
            if (!confirm('You have unsaved changes. Close anyway?')) {
                return;
            }
        }
        
        const index = IDE.state.tabs.indexOf(path);
        IDE.state.tabs.splice(index, 1);
        
        // Remove from dirty tabs
        IDE.state.dirtyTabs.delete(path);
        
        // Update active tab
        if (IDE.state.activeTab === path) {
            IDE.state.activeTab = IDE.state.tabs.length > 0 
                ? IDE.state.tabs[IDE.state.tabs.length - 1] 
                : null;
            
            if (IDE.state.activeTab) {
                EditorManager.setFile(IDE.state.activeTab);
            } else {
                // Show empty state
                document.getElementById('empty-state').style.display = 'flex';
                const editor = EditorManager.getCurrentEditor();
                if (editor) {
                    editor.setModel(null);
                }
            }
        }
        
        this.render();
        this.highlightTreeItem(IDE.state.activeTab);
        FileSystem.updateTabDirtyState();
    },
    
    closeAll: function() {
        if (IDE.state.dirtyTabs.size > 0) {
            if (!confirm('Some files have unsaved changes. Close all tabs?')) {
                return;
            }
        }
        
        IDE.state.tabs = [];
        IDE.state.activeTab = null;
        IDE.state.dirtyTabs.clear();
        
        this.render();
        document.getElementById('empty-state').style.display = 'flex';
        
        const editor = EditorManager.getCurrentEditor();
        if (editor) {
            editor.setModel(null);
        }
        
        FileSystem.updateTabDirtyState();
    },
    
    closeOthers: function(path) {
        IDE.state.tabs = [path];
        IDE.state.activeTab = path;
        IDE.state.dirtyTabs.clear();
        
        this.render();
        EditorManager.setFile(path);
        this.highlightTreeItem(path);
        FileSystem.updateTabDirtyState();
    },
    
    render: function() {
        const container = document.getElementById('tab-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        IDE.state.tabs.forEach(path => {
            const fileName = path.split('/').pop();
            const isActive = IDE.state.activeTab === path;
            const [iconClass, iconColor] = Utils.getFileIcon(path);
            const isDirty = IDE.state.dirtyTabs.has(path);
            
            const tab = document.createElement('div');
            tab.className = `tab ${isActive ? 'active' : ''} ${isDirty ? 'dirty' : ''}`;
            tab.dataset.path = path;
            tab.title = path; // Show full path on hover
            
            tab.innerHTML = `
                <i class="${iconClass}" style="color:${iconColor}; font-size:12px;"></i>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${fileName}
                </span>
                <div class="close" data-close-path="${path.replace(/"/g, '&quot;')}" title="Close tab">
                    ×
                </div>
            `;
            // Use data attribute to avoid XSS and quote issues
            tab.querySelector('.close').addEventListener('click', (e) => {
                e.stopPropagation();
                TabManager.close(path);
            });
            
            tab.onclick = (e) => {
                if (e.target.classList.contains('close')) return;
                this.open(path);
            };
            
            // Tab context menu
            tab.oncontextmenu = (e) => {
                e.preventDefault();
                this.showTabContextMenu(e, path);
            };
            
            // Drag and drop for tab reordering
            tab.draggable = true;
            tab.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', path);
                tab.style.opacity = '0.5';
            });
            
            tab.addEventListener('dragend', () => {
                tab.style.opacity = '1';
            });
            
            tab.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            tab.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedPath = e.dataTransfer.getData('text/plain');
                this.reorderTab(draggedPath, path);
            });
            
            container.appendChild(tab);
        });
        
        // Ensure active tab is visible
        if (IDE.state.activeTab) {
            const activeTab = container.querySelector('.tab.active');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    },
    
    reorderTab: function(draggedPath, targetPath) {
        if (draggedPath === targetPath) return;
        
        const draggedIndex = IDE.state.tabs.indexOf(draggedPath);
        const targetIndex = IDE.state.tabs.indexOf(targetPath);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged tab
        IDE.state.tabs.splice(draggedIndex, 1);
        
        // Insert at new position
        IDE.state.tabs.splice(targetIndex, 0, draggedPath);
        
        this.render();
    },
    
    highlightTreeItem: function(path) {
        if (!path) return;
        
        document.querySelectorAll('.t-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.path === path) {
                item.classList.add('active');
                
                // Ensure parent folders are expanded
                let parent = item.parentElement;
                while (parent && !parent.classList.contains('tree')) {
                    if (parent.classList.contains('t-sub')) {
                        parent.classList.remove('hidden');
                        
                        // Update folder icon and chevron
                        const folderItem = parent.previousElementSibling;
                        if (folderItem) {
                            const folderIcon = folderItem.querySelector('.fa-folder, .fa-folder-open');
                            if (folderIcon) {
                                folderIcon.className = 'fas fa-folder-open';
                            }
                            
                            const chevron = folderItem.querySelector('.fa-chevron-right');
                            if (chevron) {
                                chevron.style.transform = 'rotate(90deg)';
                            }
                            
                            // Save expanded state
                            const folderPath = folderItem.dataset.folder;
                            if (folderPath) {
                                localStorage.setItem(`folder_${folderPath}`, 'expanded');
                            }
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        });
    },
    
    showTabContextMenu: function(event, path) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        const addItem = (icon, text, action) => {
            const item = document.createElement('div');
            item.className = 'context-item';
            item.innerHTML = _sanitize(`<i class="fas ${icon}"></i> ${text}`);
            item.onclick = () => {
                action();
                menu.remove();
            };
            menu.appendChild(item);
        };
        
        addItem('fa-times', 'Close', () => this.close(path));
        addItem('fa-times-circle', 'Close Others', () => this.closeOthers(path));
        addItem('fa-window-close', 'Close All', () => this.closeAll());
        
        menu.appendChild(document.createElement('div')).className = 'context-divider';
        
        addItem('fa-copy', 'Copy Path', () => {
            Utils.copyToClipboard(path);
        });
        
        addItem('fa-folder-open', 'Reveal in Explorer', () => {
            this.highlightTreeItem(path);
        });
        
        addItem('fa-save', 'Save', () => {
            FileSystem.save(true);
        });
        
        menu.appendChild(document.createElement('div')).className = 'context-divider';
        
        addItem('fa-arrow-right', 'Open to the Right', () => {
            LayoutManager.openInSplit(path);
        });
        
        addItem('fa-arrow-down', 'Open Below', () => {
            // This would open in a new editor group below
        });
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 10);
    },
    
    refreshTab: function(path) {
        const tab = document.querySelector(`.tab[data-path="${path}"]`);
        if (tab) {
            // Update dirty indicator if needed
            if (IDE.state.dirtyTabs.has(path)) {
                tab.classList.add('dirty');
            } else {
                tab.classList.remove('dirty');
            }
        }
    }
};