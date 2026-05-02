/**
 * search-manager.js
 * Search — find/replace across files
 * ProCode IDE v3.0
 */

// ============================================
// SEARCH MANAGER
// ============================================
const Search = {
    findInProject: function() {
        LayoutManager.setSide('search');
        document.getElementById('search-input').focus();
    },
    
    replace: function() {
        LayoutManager.setSide('search');
        document.getElementById('search-input').focus();
    },
    

    execute: async function() {
        const query = document.getElementById('search-input').value;
        const replace = document.getElementById('replace-input').value;
        const caseSensitive = document.getElementById('case-sensitive').checked;
        const wholeWord = document.getElementById('whole-word').checked;
        
        if (!query) {
            Utils.toast('Enter search query', 'warning');
            return;
        }
        
        // Show loading
        const container = document.getElementById('search-results');
        container.innerHTML = '<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:32px; color:var(--primary);"></i><div style="margin-top:16px;">Searching...</div></div>';
        
        try {
            // Use worker for search
            const result = await FileSystem.searchInFilesAsync(query, {
                caseSensitive: caseSensitive,
                wholeWord: wholeWord,
                regex: false
            });
            
            console.log(`✅ Search completed in ${result.duration.toFixed(2)}ms`);
            console.log(`Found ${result.matchCount} matches in ${result.totalFiles} files`);
            
            this.displayResults(result.results, query, replace);
            
        } catch (error) {
            console.error('Search failed:', error);
            container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--error);">Search failed: ' + error.message + '</div>';
        }
    },
    
    displayResults: function(results, query, replace) {
        const container = document.getElementById('search-results');
        // Options
        const caseSensitive = !!document.getElementById('case-sensitive')?.checked;
        const wholeWord = !!document.getElementById('whole-word')?.checked;
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-dim);">No results found</div>';
            return;
        }
        
        // Group by file
        const grouped = {};
        results.forEach(result => {
            if (!grouped[result.path]) {
                grouped[result.path] = [];
            }
            grouped[result.path].push(result);
        });
        
        // Render results
        for (const [path, matches] of Object.entries(grouped)) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'search-file-group';
            fileDiv.style.marginBottom = '16px';
            
            const fileName = path.split('/').pop();
            const [iconClass, iconColor] = Utils.getFileIcon(path);
            
            fileDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--bg-panel); border-radius:8px; margin-bottom:8px;">
                    <i class="${iconClass}" style="color:${iconColor}"></i>
                    <span style="font-weight:500; flex:1;">${fileName}</span>
                    <span style="font-size:11px; color:var(--text-dim);">${matches.length} match${matches.length === 1 ? '' : 'es'}</span>
                    <button class="btn icon small" onclick="TabManager.open('${path}')" title="Open file">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            `;
            
            const matchesDiv = document.createElement('div');
            matchesDiv.style.padding = '0 8px';
            
            matches.forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'search-match';
                matchDiv.style.padding = '8px';
                matchDiv.style.borderBottom = '1px solid var(--border)';
                matchDiv.style.cursor = 'pointer';
                matchDiv.style.fontFamily = "'JetBrains Mono', monospace";
                matchDiv.style.fontSize = '11px';
                
                // Highlight the match in the line
                let lineContent = match.content;
                if (query) {
                    const _esc = (s) => String(s).replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
                    const flags = caseSensitive ? 'g' : 'gi';
                    const pattern = wholeWord ? ('\\b' + _esc(query) + '\\b') : _esc(query);
                    const regex = new RegExp(pattern, flags);
                    lineContent = lineContent.replace(regex, '<mark style="background:var(--warn); color:black; padding:0 2px;">$&</mark>');
                }
                
                matchDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="color:var(--text-dim);">Line ${match.line}</span>
                        ${replace ? `<button class="btn icon small" onclick="Search.replaceSingle('${path}', ${match.line}, '${query}', '${replace}')" title="Replace this match">
                            <i class="fas fa-exchange-alt"></i>
                        </button>` : ''}
                    </div>
                    <div>${lineContent}</div>
                `;
                
                matchDiv.onclick = () => {
                    TabManager.open(path);
                    EditorManager.goToLine(match.line);
                };
                
                matchesDiv.appendChild(matchDiv);
            });
            
            // Add replace all for this file
            if (replace) {
                const replaceAllBtn = document.createElement('button');
                replaceAllBtn.className = 'btn small';
                replaceAllBtn.style.marginTop = '8px';
                replaceAllBtn.style.width = '100%';
                replaceAllBtn.innerHTML = _sanitize(`<i class="fas fa-exchange-alt"></i> Replace All in File (${matches.length})`);
                replaceAllBtn.onclick = () => {
                    this.replaceInFile(path, query, replace, {
                        caseSensitive: caseSensitive,
                        wholeWord: wholeWord
                    });
                };
                
                matchesDiv.appendChild(replaceAllBtn);
            }
            
            fileDiv.appendChild(matchesDiv);
            container.appendChild(fileDiv);
        }
        
        // Add total stats
        const totalMatches = results.length;
        const totalFiles = Object.keys(grouped).length;
        
        const stats = document.createElement('div');
        stats.style.padding = '12px';
        stats.style.borderTop = '1px solid var(--border)';
        stats.style.marginTop = '16px';
        stats.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <span style="color:var(--text-dim);">Found </span>
                    <span style="font-weight:600;">${totalMatches}</span>
                    <span style="color:var(--text-dim);"> match${totalMatches === 1 ? '' : 'es'} in </span>
                    <span style="font-weight:600;">${totalFiles}</span>
                    <span style="color:var(--text-dim);"> file${totalFiles === 1 ? '' : 's'}</span>
                </div>
                ${replace ? `
                <button class="btn primary small" onclick="Search.replaceAll('${query}', '${replace}', ${caseSensitive}, ${wholeWord})">
                    <i class="fas fa-exchange-alt"></i> Replace All
                </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(stats);
    },
    
    replaceSingle: function(path, line, find, replace) {
        const content = FileSystem.read(path);
        const lines = content.split('\n');
        
        if (line > 0 && line <= lines.length) {
            const original = lines[line - 1];
            const replaced = original.replace(new RegExp(find, 'gi'), replace);
            
            if (original !== replaced) {
                lines[line - 1] = replaced;
                FileSystem.write(path, lines.join('\n'));
                
                Utils.toast('Replaced match', 'success');
                this.execute(); // Refresh results
            }
        }
    },
    
    replaceInFile: function(path, find, replace, options) {
        const content = FileSystem.read(path);
        const regex = new RegExp(
            options.regex ? find : (options.wholeWord ? `\\b${find}\\b` : find),
            options.caseSensitive ? 'g' : 'gi'
        );
        
        const newContent = content.replace(regex, replace);
        
        if (newContent !== content) {
            FileSystem.write(path, newContent);
            Utils.toast(`Replaced in ${path}`, 'success');
            this.execute(); // Refresh results
        }
    },
    
    replaceAll: function(find, replace, caseSensitive, wholeWord) {
        if (!confirm(`Replace all occurrences of "${find}" with "${replace}"?`)) {
            return;
        }
        
        const result = FileSystem.replaceInFiles(find, replace, {
            caseSensitive: caseSensitive,
            wholeWord: wholeWord
        });
        
        Utils.toast(`Replaced ${result.replacedCount} occurrences in ${result.fileCount} files`, 'success');
        this.execute(); // Refresh results
    }
};