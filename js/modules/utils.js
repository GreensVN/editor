/**
 * utils.js
 * Utils — file icons, language detection, compression, helpers
 * ProCode IDE v3.0
 */

// ENHANCED UTILITY FUNCTIONS
// ============================================
const Utils = {
    // SECURITY: HTML escape to prevent XSS when inserting user data into innerHTML
    escapeHtml: function(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"'`]/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
        }[c]));
    },

    // Enhanced toast notifications with icons
    toast: function(message, type, duration) {
        // Single source of truth: ToastService (defined at module 1 of unified boot)
        // Falls back to a bare DOM toast if ToastService not yet ready
        if (window.ToastService) { window.ToastService.show(message, type || 'info', duration); return; }
        // Early-boot fallback: ToastService loads ~1s later, queue it
        setTimeout(function() {
            if (window.ToastService) window.ToastService.show(message, type || 'info', duration);
        }, 1200);
    },
    
    // Enhanced UUID with prefix support
    uuid: function(prefix = '') {
        const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return prefix ? `${prefix}-${id}` : id;
    },
    
    // Enhanced debounce with immediate option
    debounce: function(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },
    
    // Enhanced file extension detection
    getExtension: function(path) {
        const parts = path.split('.');
        if (parts.length === 1) return '';
        return parts.pop().toLowerCase();
    },
    
    // Enhanced file icon mapping with more file types
    getFileIcon: function(path) {
        const ext = this.getExtension(path);
        const fileName = path.split('/').pop().toLowerCase();
        
        // Enhanced icon map
        const iconMap = {
            // Programming Languages
            'js': ['fab fa-js-square', '#facc15'],
            'jsx': ['fab fa-react', '#61dafb'],
            'ts': ['fas fa-code', '#3178c6'],
            'tsx': ['fab fa-react', '#3178c6'],
            'html': ['fab fa-html5', '#e34c26'],
            'css': ['fab fa-css3-alt', '#264de4'],
            'scss': ['fab fa-sass', '#cc6699'],
            'sass': ['fab fa-sass', '#cc6699'],
            'less': ['fab fa-less', '#2b4c80'],
            'json': ['fas fa-brackets-curly', '#f5de19'],
            'xml': ['fas fa-code', '#f16529'],
            'py': ['fab fa-python', '#3776ab'],
            'java': ['fab fa-java', '#007396'],
            'cpp': ['fas fa-code', '#00599c'],
            'c': ['fas fa-code', '#a8b9cc'],
            'cs': ['fas fa-code', '#239120'],
            'php': ['fab fa-php', '#777bb4'],
            'rb': ['fas fa-gem', '#cc342d'],
            'go': ['fas fa-code', '#00add8'],
            'rs': ['fas fa-code', '#dea584'],
            'swift': ['fab fa-swift', '#fa7343'],
            'kt': ['fas fa-code', '#f18e33'], 'kts': ['fas fa-code', '#f18e33'],
            'scala': ['fas fa-code', '#dc322f'], 'sc': ['fas fa-code', '#dc322f'],
            'rs': ['fas fa-code', '#dea584'],
            'lua': ['fas fa-code', '#000080'],
            'pl': ['fas fa-code', '#39457e'], 'pm': ['fas fa-code', '#39457e'],
            'r': ['fas fa-chart-bar', '#276dc3'], 'rmd': ['fas fa-chart-bar', '#276dc3'],
            'dart': ['fas fa-code', '#0175C2'],
            'ex': ['fas fa-code', '#6e4a7e'], 'exs': ['fas fa-code', '#6e4a7e'],
            'erl': ['fas fa-code', '#a90533'], 'hrl': ['fas fa-code', '#a90533'],
            'clj': ['fas fa-code', '#5881d8'], 'cljs': ['fas fa-code', '#5881d8'],
            'hs': ['fas fa-lambda', '#5e5086'], 'lhs': ['fas fa-lambda', '#5e5086'],
            'fs': ['fas fa-code', '#378bba'], 'fsx': ['fas fa-code', '#378bba'],
            'ml': ['fas fa-code', '#ee6a1a'],
            'groovy': ['fas fa-code', '#4298b8'],
            'gradle': ['fas fa-cubes', '#02303a'],
            'coffee': ['fas fa-coffee', '#244776'],
            'jl': ['fas fa-code', '#9558b2'],
            'nim': ['fas fa-code', '#ffe953'],
            'zig': ['fas fa-code', '#f7a41d'],
            'v': ['fas fa-code', '#5d87bf'],
            'd': ['fas fa-code', '#ba595e'],
            'asm': ['fas fa-microchip', '#71717a'], 's': ['fas fa-microchip', '#71717a'],
            'gd': ['fas fa-gamepad', '#478cbf'],
            'glsl': ['fas fa-code', '#5586a4'], 'hlsl': ['fas fa-code', '#5586a4'],
            'wgsl': ['fas fa-code', '#005a9c'],
            'pug': ['fas fa-code', '#a86454'], 'jade': ['fas fa-code', '#a86454'],
            'hbs': ['fas fa-code', '#f0772b'], 'handlebars': ['fas fa-code', '#f0772b'],
            'ejs': ['fas fa-code', '#a91e50'],
            'jinja': ['fas fa-code', '#b41717'], 'jinja2': ['fas fa-code', '#b41717'],
            'tf': ['fas fa-cloud', '#7b42bc'], 'hcl': ['fas fa-cloud', '#7b42bc'],
            'dockerfile': ['fab fa-docker', '#2496ed'],
            'makefile': ['fas fa-cog', '#6d8086'], 'mk': ['fas fa-cog', '#6d8086'],
            'cmake': ['fas fa-cog', '#064F8C'],
            'sh': ['fas fa-terminal', '#4eaa25'], 'bash': ['fas fa-terminal', '#4eaa25'],
            'zsh': ['fas fa-terminal', '#c5d928'], 'fish': ['fas fa-fish', '#4aae47'],
            'ps1': ['fas fa-terminal', '#012456'], 'psm1': ['fas fa-terminal', '#012456'],
            'bat': ['fas fa-terminal', '#4d4d4d'], 'cmd': ['fas fa-terminal', '#4d4d4d'],
            'tex': ['fas fa-file-alt', '#008080'], 'latex': ['fas fa-file-alt', '#008080'],
            'ipynb': ['fas fa-book', '#f37626'],
            'm': ['fas fa-code', '#438eff'], 'mm': ['fas fa-code', '#438eff'],
            'proto': ['fas fa-code', '#4285f4'],
            'graphql': ['fas fa-project-diagram', '#e10098'], 'gql': ['fas fa-project-diagram', '#e10098'],
            'mts': ['fas fa-code', '#3178c6'], 'cts': ['fas fa-code', '#3178c6'],
            'mjs': ['fab fa-js-square', '#f5de19'], 'cjs': ['fab fa-js-square', '#f5de19'],
            'htm': ['fab fa-html5', '#e34c26'],
            'styl': ['fas fa-paint-brush', '#ff6347'],
            'astro': ['fas fa-star', '#FF5D01'],
            
            // Web Frameworks
            'vue': ['fab fa-vuejs', '#42b883'],
            'vuejs': ['fab fa-vuejs', '#42b883'],
            'tsx': ['fab fa-react', '#61dafb'],
            'svelte': ['fas fa-code', '#ff3e00'],
            
            // Config Files
            'config': ['fas fa-cog', '#a1a1aa'],
            'yml': ['fas fa-file-code', '#cb171e'],
            'yaml': ['fas fa-file-code', '#cb171e'],
            'toml': ['fas fa-file-code', '#9c4221'],
            'ini': ['fas fa-cog', '#a1a1aa'],
            'env': ['fas fa-key', '#8257e5'],
            
            // Documentation
            'md': ['fab fa-markdown', '#ffffff'],
            'markdown': ['fab fa-markdown', '#ffffff'],
            'txt': ['fas fa-file-alt', '#a1a1aa'],
            'pdf': ['fas fa-file-pdf', '#f40f02'],
            'doc': ['fas fa-file-word', '#2b579a'],
            'docx': ['fas fa-file-word', '#2b579a'],
            
            // Images
            'jpg': ['fas fa-file-image', '#dc2626'],
            'jpeg': ['fas fa-file-image', '#dc2626'],
            'png': ['fas fa-file-image', '#2563eb'],
            'gif': ['fas fa-file-image', '#f59e0b'],
            'svg': ['fas fa-file-image', '#f59e0b'],
            'ico': ['fas fa-file-image', '#7c3aed'],
            'webp': ['fas fa-file-image', '#0891b2'],
            
            // Data
            'csv': ['fas fa-file-csv', '#059669'],
            'xlsx': ['fas fa-file-excel', '#217346'],
            'sql': ['fas fa-database', '#00758f'],
            'db': ['fas fa-database', '#00758f'],
            'sqlite': ['fas fa-database', '#003b57'],
            
            // Audio/Video
            'mp3': ['fas fa-file-audio', '#3b82f6'],
            'wav': ['fas fa-file-audio', '#3b82f6'],
            'mp4': ['fas fa-file-video', '#ef4444'],
            'avi': ['fas fa-file-video', '#ef4444'],
            'mov': ['fas fa-file-video', '#ef4444']
        };
        
        // Check for specific file names first
        if (fileName === 'package.json') return ['fas fa-box', '#f97316'];
        if (fileName === 'package-lock.json') return ['fas fa-box', '#ea580c'];
        if (fileName.includes('tsconfig')) return ['fas fa-cog', '#3178c6'];
        if (fileName.includes('vite.config')) return ['fas fa-bolt', '#646cff'];
        if (fileName.includes('webpack.config')) return ['fas fa-cube', '#8dd6f9'];
        if (fileName === 'dockerfile') return ['fab fa-docker', '#2496ed'];
        if (fileName === 'docker-compose.yml') return ['fab fa-docker', '#2496ed'];
        if (fileName === '.gitignore') return ['fas fa-eye-slash', '#71717a'];
        if (fileName === '.env') return ['fas fa-key', '#8257e5'];
        if (fileName === '.env.example') return ['fas fa-key', '#a855f7'];
        if (fileName === 'requirements.txt') return ['fas fa-list', '#059669'];
        if (fileName === 'readme.md' || fileName === 'readme') return ['fab fa-readme', '#3b82f6'];
        if (fileName === 'license') return ['fas fa-scale-balanced', '#6b7280'];
        if (fileName === 'changelog.md') return ['fas fa-history', '#8b5cf6'];
        if (fileName === 'contributing.md') return ['fas fa-handshake', '#10b981'];
        
        // Check for folder
        if (path.endsWith('/')) return ['fas fa-folder', '#d97706'];
        
        return iconMap[ext] || ['fas fa-file', '#71717a'];
    },
    
    // Enhanced language detection
    detectLanguage: function(path) {
        const ext = this.getExtension(path);
        const langMap = {
            // ── Web & Frontend ──
            'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript', 'mts': 'typescript', 'cts': 'typescript',
            'tsx': 'typescript',
            'html': 'html', 'htm': 'html', 'xhtml': 'html', 'html5': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'styl': 'css',           // Stylus
            'vue': 'html',           // Vue SFC
            'svelte': 'html',        // Svelte
            'astro': 'html',         // Astro
            'mdx': 'markdown',       // MDX

            // ── Data & Config ──
            'json': 'json', 'jsonc': 'json', 'json5': 'json',
            'xml': 'xml', 'xsl': 'xml', 'xslt': 'xml', 'svg': 'xml',
            'yml': 'yaml', 'yaml': 'yaml',
            'toml': 'ini',
            'ini': 'ini', 'cfg': 'ini', 'conf': 'ini',
            'env': 'plaintext',
            'properties': 'ini',
            'graphql': 'graphql', 'gql': 'graphql',
            'proto': 'protobuf',
            'csv': 'plaintext',

            // ── Documentation ──
            'md': 'markdown', 'markdown': 'markdown', 'mdx': 'markdown',
            'txt': 'plaintext', 'text': 'plaintext', 'log': 'plaintext',
            'rst': 'restructuredtext',
            'adoc': 'asciidoc',

            // ── Systems & Compiled ──
            'c': 'c', 'h': 'c',
            'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp', 'hxx': 'cpp',
            'cs': 'csharp',
            'java': 'java',
            'kt': 'kotlin', 'kts': 'kotlin',
            'scala': 'scala', 'sc': 'scala',
            'rs': 'rust',
            'go': 'go',
            'swift': 'swift',
            'd': 'c',                // D lang (uses C highlighting)
            'zig': 'c',              // Zig
            'v': 'go',               // Vlang
            'nim': 'python',         // Nim
            'crystal': 'ruby',       // Crystal
            'odin': 'c',             // Odin

            // ── Scripting ──
            'py': 'python', 'pyw': 'python', 'pyi': 'python',
            'rb': 'ruby', 'erb': 'ruby', 'gemspec': 'ruby',
            'php': 'php', 'phtml': 'php', 'php3': 'php', 'php4': 'php',
            'lua': 'lua',
            'pl': 'perl', 'pm': 'perl',
            'r': 'r', 'rmd': 'r',
            'jl': 'julia',           // Julia
            'ex': 'elixir', 'exs': 'elixir', 'eex': 'elixir',
            'erl': 'erlang', 'hrl': 'erlang',
            'clj': 'clojure', 'cljs': 'clojure', 'cljc': 'clojure',
            'hs': 'haskell', 'lhs': 'haskell',
            'ml': 'fsharp',          // OCaml/F# (similar)
            'mli': 'fsharp',
            'fs': 'fsharp', 'fsx': 'fsharp', 'fsi': 'fsharp',
            'dart': 'dart',
            'groovy': 'groovy',
            'gradle': 'groovy',
            'coffee': 'coffeescript',
            'litcoffee': 'coffeescript',
            'tcl': 'tcl',
            'awk': 'shell',
            'sed': 'shell',

            // ── Shell & DevOps ──
            'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'fish': 'shell',
            'ksh': 'shell', 'csh': 'shell', 'tcsh': 'shell',
            'ps1': 'powershell', 'psm1': 'powershell', 'psd1': 'powershell',
            'bat': 'bat', 'cmd': 'bat',
            'dockerfile': 'dockerfile',
            'makefile': 'makefile', 'mk': 'makefile',
            'cmake': 'cmake',
            'tf': 'hcl',             // Terraform
            'hcl': 'hcl',
            'nix': 'plaintext',      // Nix
            'dhall': 'plaintext',

            // ── Database ──
            'sql': 'sql',
            'mysql': 'sql', 'pgsql': 'sql', 'sqlite': 'sql',
            'redis': 'plaintext',
            'cql': 'sql',            // Cassandra Query Language
            'cypher': 'sql',         // Neo4j Cypher

            // ── Mobile ──
            'swift': 'swift',
            'kt': 'kotlin',
            'java': 'java',
            'dart': 'dart',
            'm': 'objective-c', 'mm': 'objective-c',   // Objective-C

            // ── Game Dev ──
            'gd': 'python',          // GDScript (Godot)
            'gdshader': 'c',         // Godot Shader
            'hlsl': 'c',             // HLSL shader
            'glsl': 'c',             // GLSL shader
            'wgsl': 'c',             // WebGPU shader
            'shader': 'c',

            // ── Markup & Template ──
            'pug': 'pug',
            'jade': 'pug',
            'ejs': 'html',
            'hbs': 'handlebars', 'handlebars': 'handlebars',
            'mustache': 'handlebars',
            'jinja': 'python', 'jinja2': 'python', 'j2': 'python',
            'twig': 'twig',
            'liquid': 'html',
            'haml': 'ruby',

            // ── Other ──
            'wasm': 'plaintext',
            'wat': 'plaintext',      // WebAssembly text
            'asm': 'asm',            // Assembly
            's': 'asm',
            'ipynb': 'json',         // Jupyter Notebook
            'tex': 'latex',          // LaTeX
            'latex': 'latex',
            'bib': 'plaintext',
            'vim': 'plaintext',      // Vim script
            'vimrc': 'plaintext',
        };
        return langMap[ext?.toLowerCase()] || 'plaintext';
    },
    
    // Enhanced file size formatting
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Thêm vào Utils object (sau function formatBytes)
    getCompressionStats: function() {
        try {
            const stats = JSON.parse(localStorage.getItem('procode_compression_stats') || '{}');
            if (stats.originalSize) {
                return {
                    original: this.formatBytes(stats.originalSize),
                    compressed: this.formatBytes(stats.compressedSize),
                    saved: stats.ratio + '%',
                    timestamp: this.formatDate(stats.timestamp)
                };
            }
        } catch (e) {
            console.error('Failed to get compression stats:', e);
        }
        return null;
    },
    
    // Enhanced date formatting with relative time
    formatDate: function(date, format = 'relative') {
        const d = new Date(date);
        
        if (format === 'relative') {
            const now = new Date();
            const diffMs = now - d;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);
            
            if (diffSec < 60) return 'just now';
            if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
            if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
            if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
        }
        
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // FIX-SEC-5b: Replaced DOM-based escapeHtml with deterministic string-replace version.
    // div.textContent → div.innerHTML behavior varies by browser (e.g. quote encoding differs).
    // Using same implementation as Utils.escapeHtml above ensures consistent XSS protection.
    escapeHtml: function(text) {
        if (text == null) return '';
        return String(text).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
    },
    
    // Enhanced clipboard with fallback
    copyToClipboard: async function(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for insecure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            this.toast('Copied to clipboard', 'success');
            return true;
        } catch (err) {
            this.toast('Failed to copy to clipboard', 'error');
            return false;
        }
    },
    
    // Enhanced download with progress tracking
    downloadFile: function(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    // Enhanced file reading with progress
    readFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    // Could update UI with progress
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },
    

    // Smart file reader: text for code, DataURL for binary assets (images/fonts/media)
    readFileSmart: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            const name = (file && (file.name || file.webkitRelativePath)) ? String(file.name || file.webkitRelativePath) : '';
            if (Utils.isBinaryExt(name)) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    },

    // Binary extension detector (used for preview asset inlining)
    isBinaryExt: function(pathOrName) {
        const name = String(pathOrName || '').split('?')[0].split('#')[0];
        const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase();
        return ['png','jpg','jpeg','gif','webp','svg','ico','bmp','avif','mp3','wav','ogg','mp4','webm','m4a','flac','woff','woff2','ttf','otf','eot','pdf'].includes(ext);
    },

    // Basic MIME map (best-effort; used for ZIP import/export + data URLs)
    mimeFromPath: function(pathOrName) {
        const name = String(pathOrName || '').split('?')[0].split('#')[0];
        const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase();
        const map = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            bmp: 'image/bmp',
            avif: 'image/avif',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            m4a: 'audio/mp4',
            flac: 'audio/flac',
            mp4: 'video/mp4',
            webm: 'video/webm',
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf',
            otf: 'font/otf',
            eot: 'application/vnd.ms-fontobject',
            pdf: 'application/pdf',
            json: 'application/json',
            txt: 'text/plain',
            md: 'text/markdown',
            html: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            ts: 'application/typescript'
        };
        return map[ext] || 'application/octet-stream';
    },

    // Enhanced file name validation
    isValidFileName: function(name) {
        if (!name || name.trim() === '') return false;
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
        if (invalidChars.test(name)) return false;
        
        // Check for reserved names (Windows)
        const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
        if (reservedNames.test(name)) return false;
        
        // Check for trailing dots or spaces
        if (name.endsWith('.') || name.endsWith(' ')) return false;
        
        // Check length (255 max for most systems)
        if (name.length > 255) return false;
        
        return true;
    },
    
    // Color utility functions
    lightenColor: function(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    },
    
    // Generate random color
    randomColor: function() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    },
    
    // Get contrast color (black or white)
    getContrastColor: function(hexcolor) {
        hexcolor = hexcolor.replace("#", "");
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness > 125 ? '#000000' : '#ffffff';
    },
    
    // Deep clone object
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Merge objects deeply
    deepMerge: function(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.deepMerge(target, ...sources);
    },
    
    // Check if value is object
    isObject: function(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },
    
    // Generate hash from string
    hashString: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    },
    
    // Truncate text with ellipsis
    truncateText: function(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },
    
    // Capitalize first letter
    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Generate unique array
    uniqueArray: function(arr) {
        return [...new Set(arr)];
    },
    
    // Sleep function
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Retry function with exponential backoff
    retry: async function(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            await this.sleep(delay);
            return this.retry(fn, retries - 1, delay * 2);
        }
    },
    
    // Parse query string
    parseQueryString: function(query) {
        return query.substr(1).split('&').reduce((params, param) => {
            const [key, value] = param.split('=');
            params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
            return params;
        }, {});
    },
    
    // Stringify query object
    stringifyQuery: function(params) {
        return Object.keys(params).map(key => 
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        ).join('&');
    },
    
    // Get CSS variable value
    getCssVariable: function(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },
    
    // Set CSS variable
    setCssVariable: function(name, value) {
        document.documentElement.style.setProperty(name, value);
    },
    
    // Generate gradient
    generateGradient: function(color1, color2, angle = 135) {
        return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    },
    
    // Format number with commas
    formatNumber: function(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    // Get file type category
    getFileTypeCategory: function(path) {
        const ext = this.getExtension(path);
        const categories = {
            'code': ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala'],
            'web': ['html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte'],
            'data': ['json', 'xml', 'yml', 'yaml', 'csv', 'sql'],
            'document': ['md', 'txt', 'pdf', 'doc', 'docx'],
            'image': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'webp'],
            'media': ['mp3', 'wav', 'mp4', 'avi', 'mov'],
            'config': ['config', 'env', 'ini', 'toml']
        };
        
        for (const [category, exts] of Object.entries(categories)) {
            if (exts.includes(ext)) return category;
        }
        
        return 'other';
    }
};


// Safe DOM helpers (avoid hard crashes on missing transient modals)
window.__pc_removeEl = function(id){ try{ const el = document.getElementById(id); if(el && typeof el.remove==='function') el.remove(); }catch(_){} };


// THÊM VÀO FileSystem object
class SmartAutoSave {
    constructor() {
        this.pendingChanges = new Map();
        this.saveTimer = null;
        this.MIN_INTERVAL = 1000; // 1s
        this.MAX_INTERVAL = 5000; // 5s
        this.lastSaveTime = 0;
        this.changeCount = 0;
    }
    
    queueChange(path, content) {
        this.pendingChanges.set(path, content);
        this.changeCount++;
        
        // Clear existing timer
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;
        
        // ✅ Adaptive delay based on activity
        let delay = this.MIN_INTERVAL;
        if (this.changeCount > 10) {
            // Rapid changes - wait longer
            delay = this.MAX_INTERVAL;
        } else if (timeSinceLastSave < this.MIN_INTERVAL * 2) {
            // Recent save - wait a bit
            delay = this.MIN_INTERVAL * 1.5;
        }
        
        this.saveTimer = setTimeout(() => this.flush(), delay);
    }
    
    async flush() {
        if (this.pendingChanges.size === 0) return;
        
        const changes = Array.from(this.pendingChanges.entries());
        this.pendingChanges.clear();
        this.changeCount = 0;
        this.lastSaveTime = Date.now();
        
        try {
            // Batch save
            for (const [path, content] of changes) {
                IDE.state.files[path] = content;
                await IndexedDBManager.setFile(path, content);
            }
            
            if(window.__PROCODE_DEBUG__) console.log(`💾 Auto-saved ${changes.length} file(s)`);
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Re-queue failed changes
            changes.forEach(([path, content]) => {
                this.pendingChanges.set(path, content);
            });
        }
    }
    
    forceFlush() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        return this.flush();
    }
}

const FileSystem = {
    autoSave: null,
    saveTimeout: null,
    // Initialize file system with versioning
    // FIX: Added IDB cross-validation to detect and recover from split-brain state.
    init: async function() {
        // v21 FS init log suppressed
        
        this.autoSave = new SmartAutoSave();
        // Ensure IndexedDB is always initialized early so IDB is ready to be
        // the authoritative store. This prevents the race condition where files
        // written before IDB init are lost.
        let idbReady = false;
        try {
            if (window.indexedDB) {
                await IndexedDBManager.init();
                idbReady = true;
            }
        } catch(e) {
            if (window.__PROCODE_DEBUG__) console.warn('[FileSystem] IDB pre-init failed:', e);
        }

        // Load from localStorage with version check
        const saved = localStorage.getItem(`procode_fs_v${(window.IDE || {version:'3.0.0'}).version}`);
        const settings = localStorage.getItem(`procode_settings_v${(window.IDE || {version:'3.0.0'}).version}`);
        const version = localStorage.getItem('procode_version');
        
        // Migration from older versions
        if (version && version !== (window.IDE || {version:'3.0.0'}).version) {
            this.migrateFromOldVersion(version);
        }
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                IDE.state.files = this.validateFileSystem(parsed);
                // ── FIX v25: replace old default template with LANGUAGES.md ──
                const keys = Object.keys(IDE.state.files);
                const OLD_DEFAULTS = ['index.html','style.css','app.js','README.md'];
                const isOnlyOldDefaults = keys.length > 0 && keys.every(k => OLD_DEFAULTS.includes(k));
                if (isOnlyOldDefaults && !IDE.state.files['LANGUAGES.md']) {
                    IDE.state.files = { ...IDE.state.templates.vanilla };
                    // Suppressed: non-critical boot notification
                } else {
                    // If validation removed all files, reset to template
                    if (Object.keys(IDE.state.files).length === 0) {
                        IDE.state.files = { ...IDE.state.templates.vanilla };
                        Utils.toast('⚠️ Corrupted storage detected — reset to default template', 'warning');
                    } else {
                        // Suppressed: routine boot notification (kept only main welcome toast)
                        // Utils.toast('Project loaded from storage', 'success');
                    }
                }
                // FIX: If LS has data but IDB is empty/stale, sync LS→IDB
                // This catches the case where IDB was cleared but LS still has data
                if (idbReady) {
                    try {
                        const dbFiles = await IndexedDBManager.getAllFiles();
                        if (!Array.isArray(dbFiles) || dbFiles.length === 0) {
                            // IDB is empty — populate it from localStorage data
                            if (window.__PROCODE_DEBUG__) console.info('[FileSystem] IDB empty, syncing from localStorage...');
                            for (const [path, content] of Object.entries(IDE.state.files)) {
                                IndexedDBManager.setFile(path, content).catch(e => { if(window.__PROCODE_DEBUG__) console.warn("[FileSystem] LS→IDB sync failed:", e); });
                            }
                        }
                    } catch(e) { /* non-critical */ }
                }
            } catch (e) {
                console.error('Failed to parse saved files:', e);
                IDE.state.files = { ...IDE.state.templates.vanilla };
                Utils.toast('Created new project', 'info');
            }
        } else {
            // Try IndexedDB fallback first
            try {
                if (idbReady) {
                    const dbFiles = await IndexedDBManager.getAllFiles();
                    if (Array.isArray(dbFiles) && dbFiles.length > 0) {
                        IDE.state.files = {};
                        dbFiles.forEach(f => {
                            IDE.state.files[f.path] = f.content;
                        });
                        // Suppressed: routine boot notification
                        // Utils.toast(`📂 Loaded ${dbFiles.length} files from IndexedDB`, 'success');
                    } else {
                        IDE.state.files = { ...IDE.state.templates.vanilla };
                        // Suppressed: duplicates the main welcome notification
                        // Utils.toast('🚀 ProCode IDE v27 — Claude AI Ready!', 'info');
                    }
                } else {
                    IDE.state.files = { ...IDE.state.templates.vanilla };
                    // Suppressed
                    // Utils.toast('🚀 ProCode IDE v27 — Claude AI Ready!', 'info');
                }
            } catch (e) {
                if(window.__PROCODE_DEBUG__) console.warn('⚠️ IndexedDB load failed, using defaults:', e);
                IDE.state.files = { ...IDE.state.templates.vanilla };
                // Suppressed
                // Utils.toast('🚀 ProCode IDE v27 — Claude AI Ready!', 'info');
            }
        }
        
        if (settings) {
            try {
                const savedSettings = JSON.parse(settings);
                // FIX-SEC-4: Prototype pollution guard — strip __proto__, constructor,
                // and prototype keys before merging untrusted localStorage data.
                // A malicious or corrupted localStorage value containing {"__proto__":{...}}
                // could poison Object.prototype for all objects in the page.
                function _sanitizeObj(obj) {
                    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
                    const clean = {};
                    for (const k of Object.keys(obj)) {
                        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
                        clean[k] = (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]))
                            ? _sanitizeObj(obj[k])
                            : obj[k];
                    }
                    return clean;
                }
                const safeSettings = _sanitizeObj(savedSettings);
                IDE.state.settings = Utils.deepMerge(IDE.state.settings, safeSettings);
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        } else {
            // Fallback: load settings from IndexedDB if available
            try {
                if (idbReady) {
                    const dbSettings = await IndexedDBManager.getSetting('ide_settings');
                    if (dbSettings) {
                        IDE.state.settings = Utils.deepMerge(IDE.state.settings, dbSettings);
                    }
                }
            } catch (e) {
                if (window.__PROCODE_DEBUG__) console.warn('⚠️ IndexedDB settings load failed:', e);
            }
        }

        // v27: Always restore API key from dedicated localStorage slot (never serialized in settings JSON)
        try {
            const storedApiKey = window.__apiKey ? window.__apiKey.load() : (localStorage.getItem('procode_ai_apikey') || ''); // P2
            if (storedApiKey) {
                if (!IDE.state.settings.ai) IDE.state.settings.ai = {};
                IDE.state.settings.ai.apiKey = storedApiKey;
            }
            // Ensure model defaults to claude-sonnet-4-6 if unset
            if (!IDE.state.settings.ai.model || IDE.state.settings.ai.model === 'local') {
                IDE.state.settings.ai.model = 'claude-sonnet-4-6';
            }
        } catch(_) {}

        // Prepare IndexedDB persistence queue (non-blocking)
        this._pendingDBWrites = this._pendingDBWrites || new Map();
        this._pendingDBDeletes = this._pendingDBDeletes || new Set();
        this._flushIndexedDBDebounced = this._flushIndexedDBDebounced || Utils.debounce(() => this.flushIndexedDB(), 300);

        // Save current version — FIX: wrapped in try/catch for quota safety
        try { localStorage.setItem('procode_version', IDE.version); } catch(_) {}
        
        this.refreshTree();
        this.setupAutoSave();
        this.setupFileWatchers();
        
        // Initialize file system metrics
        this.updateFileSystemMetrics();
        
        if(window.__PROCODE_DEBUG__) console.log(' File system initialized');
    },

    // Queue write for IndexedDB persistence (non-blocking)
    _queueIndexedDBWrite: function(path, content) {
        try {
            if (!window.indexedDB) return;
            if (!this._pendingDBWrites) this._pendingDBWrites = new Map();
            if (!this._pendingDBDeletes) this._pendingDBDeletes = new Set();
            this._pendingDBDeletes.delete(path);
            this._pendingDBWrites.set(path, content);
            if (!this._flushIndexedDBDebounced) {
                this._flushIndexedDBDebounced = Utils.debounce(() => this.flushIndexedDB(), 300);
            }
            this._flushIndexedDBDebounced();
        } catch (e) {
            // Ignore persistence errors
        }
    },

    // Thêm vào FileSystem object
    _writeQueue: new Map(),
    _writeTimer: null,

    writeDebounced: function(path, content, delay = 100) {
        // Queue write operation
        this._writeQueue.set(path, content);
        
        // Clear existing timer
        if (this._writeTimer) {
            clearTimeout(this._writeTimer);
        }
        
        // Set new timer
        this._writeTimer = setTimeout(() => {
            this.flushWriteQueue();
        }, delay);
    },

    flushWriteQueue: function() {
        if (this._writeQueue.size === 0) return;
        
        const batch = Array.from(this._writeQueue.entries());
        this._writeQueue.clear();
        
        // Batch write
        batch.forEach(([path, content]) => {
            this.write(path, content, { skipAutoSave: true });
        });
        
        // Single save after batch
        if (IDE.state.settings.editor.autoSave) {
            this.save();
        }
    },

    // Queue delete for IndexedDB persistence (non-blocking)
    _queueIndexedDBDelete: function(path) {
        try {
            if (!window.indexedDB) return;
            if (!this._pendingDBWrites) this._pendingDBWrites = new Map();
            if (!this._pendingDBDeletes) this._pendingDBDeletes = new Set();
            this._pendingDBWrites.delete(path);
            this._pendingDBDeletes.add(path);
            if (!this._flushIndexedDBDebounced) {
                this._flushIndexedDBDebounced = Utils.debounce(() => this.flushIndexedDB(), 300);
            }
            this._flushIndexedDBDebounced();
        } catch (e) {
            // Ignore persistence errors
        }
    },

    // Thay thế trong FileSystem object
    flushIndexedDB: async function() {
        if (this._isFlushingDB) {
            // Đợi flush hiện tại hoàn thành
            return this._flushPromise;
        }
        
        this._isFlushingDB = true;
        this._flushPromise = (async () => {
            try {
                if (!window.indexedDB) return;
                await IndexedDBManager.init();

                const writes = this._pendingDBWrites ? Array.from(this._pendingDBWrites.entries()) : [];
                const deletes = this._pendingDBDeletes ? Array.from(this._pendingDBDeletes.values()) : [];
                
                // Clear queues immediately để tránh duplicate
                this._pendingDBWrites = new Map();
                this._pendingDBDeletes = new Set();

                // Batch operations với transaction
                const db = IndexedDBManager.db;
                if (!db) return;
                
                const transaction = db.transaction(['files', 'settings'], 'readwrite');
                const fileStore = transaction.objectStore('files');
                const settingsStore = transaction.objectStore('settings');
                
                // Batch writes
                for (const [path, content] of writes) {
                    fileStore.put({
                        path: path,
                        content: content,
                        size: new Blob([content]).size,
                        modified: new Date().toISOString()
                    });
                }
                
                // Batch deletes
                for (const path of deletes) {
                    fileStore.delete(path);
                }
                
                // Settings
                settingsStore.put({ key: 'ide_settings', value: IDE.state.settings });
                settingsStore.put({ key: 'last_save', value: new Date().toISOString() });
                settingsStore.put({ key: 'ide_version', value: IDE.version });
                
                // Wait for transaction
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = () => reject(transaction.error);
                });
                
            } catch (e) {
                if(window.__PROCODE_DEBUG__) console.warn('⚠️ IndexedDB flush failed:', e);
                // Retry logic
                if (!this._flushRetries) this._flushRetries = 0;
                if (this._flushRetries < 3) {
                    this._flushRetries++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.flushIndexedDB();
                }
            } finally {
                this._isFlushingDB = false;
                this._flushRetries = 0;
            }
        })();
        
        return this._flushPromise;
    },

    // Validate file system structure
    validateFileSystem: function(files) {
        const validated = {};
        // Patterns that indicate corrupted file content (IDE source code stored as file)
        const CORRUPTION_PATTERNS = [
            /PCIDE_v2[0-9]/,
            /window\.__v2[0-9]_loaded/,
            /ProCode IDE v2[0-9].*GOD.*TIER/,
            /__procode_inspector_hl__/,
            /v27-perf-hud.*position.*fixed/,
        ];
        let corruptedCount = 0;
        for (const [path, content] of Object.entries(files)) {
            if (typeof content !== 'string') continue;
            if (!Utils.isValidFileName(path.split('/').pop())) continue;
            // Skip files that are clearly the IDE's own source code
            const isCorrupted = content.length > 50000 && CORRUPTION_PATTERNS.some(p => p.test(content));
            if (isCorrupted) {
                if(window.__PROCODE_DEBUG__) console.warn(`[validateFileSystem] Skipping corrupted file: "${path}" (contains IDE source code)`);
                corruptedCount++;
                continue;
            }
            validated[path] = content;
        }
        if (corruptedCount > 0) {
            if(window.__PROCODE_DEBUG__) console.warn(`[validateFileSystem] Removed ${corruptedCount} corrupted file(s) from filesystem`);
        }
        return validated;
    },
    
    // Reset workspace — clears all localStorage and reloads
    // FIX: Now also clears IndexedDB to prevent stale IDB data surviving a reset
    resetWorkspace: function(skipConfirm = false) {
        const msg = 'Xóa toàn bộ dữ liệu workspace và reset về mặc định?\n\n(Dùng khi IDE bị lỗi / hiển thị code sai)';
        if (!skipConfirm && !confirm(msg)) return;
        try {
            // Clear all procode keys from localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('procode_') || k.startsWith('v2') || k.startsWith('file_'))) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });
            sessionStorage.clear();

            // FIX: Also clear IndexedDB — otherwise stale files survive a reset
            const clearIDB = (dbName) => new Promise(res => {
                try {
                    const req = indexedDB.deleteDatabase(dbName);
                    req.onsuccess = req.onerror = req.onblocked = () => res();
                } catch(_) { res(); }
            });
            Promise.all([
                clearIDB('ProCodeStorage'), // ProCode.Storage IDB
                clearIDB('ProCodeIDE'),     // IndexedDBManager IDB
            ]).then(() => {
                Utils.toast('✅ Workspace reset! Đang tải lại...', 'success');
                setTimeout(() => location.reload(), 800);
            }).catch(() => {
                Utils.toast('✅ Workspace reset! Đang tải lại...', 'success');
                setTimeout(() => location.reload(), 800);
            });
        } catch(e) {
            location.reload();
        }
    },

    // Migrate from older versions
    migrateFromOldVersion: function(oldVersion) {
        if(window.__PROCODE_DEBUG__) console.log(`🔁 Migrating storage from version ${oldVersion} to ${IDE.version}`);

        const now = Date.now();
        const fsKeys = [
            `procode_fs_v${oldVersion}`,
            `procode_fs_v${String(oldVersion).replace(/\./g, '_')}`,
        ];
        const settingsKeys = [
            `procode_settings_v${oldVersion}`,
            `procode_settings_v${String(oldVersion).replace(/\./g, '_')}`,
        ];

        const pickFirst = (keys) => {
            for (const k of keys) {
                const v = localStorage.getItem(k);
                if (v) return { key: k, value: v };
            }
            return null;
        };

        const oldFS = pickFirst(fsKeys);
        const oldSettings = pickFirst(settingsKeys);

        // FIX-STORAGE-1: Limit backups to MAX 3 per type to prevent localStorage quota bomb.
        // Old code used timestamp in key so each migration created a new entry that was never cleaned up.
        // New code: evict oldest backup before writing a new one.
        const MAX_BACKUPS = 3;
        function _pruneBackups(prefix) {
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) keys.push(k);
                }
                keys.sort(); // timestamp in key → sort = chronological order
                while (keys.length >= MAX_BACKUPS) {
                    try { localStorage.removeItem(keys.shift()); } catch(_) {}
                }
            } catch(_) {}
        }

        // Backup whatever we find (timestamped, capped at MAX_BACKUPS)
        if (oldFS?.value) {
            _pruneBackups('procode_fs_backup_v');
            try { localStorage.setItem(`procode_fs_backup_v${oldVersion}_${now}`, oldFS.value); } catch(_) {}
        }
        if (oldSettings?.value) {
            _pruneBackups('procode_settings_backup_v');
            try { localStorage.setItem(`procode_settings_backup_v${oldVersion}_${now}`, oldSettings.value); } catch(_) {}
        }

        // Only copy forward if the new version key doesn't exist yet
        const newFSKey = `procode_fs_v${IDE.version}`;
        const newSettingsKey = `procode_settings_v${IDE.version}`;

        if (!localStorage.getItem(newFSKey) && oldFS?.value) {
            localStorage.setItem(newFSKey, oldFS.value);
        }
        if (!localStorage.getItem(newSettingsKey) && oldSettings?.value) {
            localStorage.setItem(newSettingsKey, oldSettings.value);
        }

        // ── FIX v25: if migrated files are just the old default template,
        //    replace them so the new LANGUAGES.md welcome file shows up ──
        try {
            const migratedRaw = localStorage.getItem(newFSKey);
            if (migratedRaw) {
                const migratedFiles = JSON.parse(migratedRaw);
                const keys = Object.keys(migratedFiles);
                const OLD_DEFAULTS = ['index.html','style.css','app.js','README.md'];
                const isOnlyOldDefaults = keys.length > 0 && keys.every(k => OLD_DEFAULTS.includes(k));
                if (isOnlyOldDefaults && !migratedFiles['LANGUAGES.md']) {
                    // Overwrite with fresh vanilla template
                    localStorage.setItem(newFSKey, JSON.stringify({ ...IDE.state.templates.vanilla }));
                }
            }
        } catch(_) {}

        // Version marker
        localStorage.setItem('procode_version', IDE.version);

        // Suppressed: routine migration notification
        // Utils.toast(`✅ Migrated storage to v${IDE.version}`, 'success');
    },

    // Enhanced save with versioning
    // FIX: Now IDB-first. localStorage is kept as a fast-read cache only.
    // Also handles localStorage QuotaExceededError gracefully.
    save: function(immediate = false) {
        if (!immediate && !IDE.state.settings.editor.autoSave) {
            return;
        }
        
        const saveKey = `procode_fs_v${IDE.version}`;
        const settingsKey = `procode_settings_v${IDE.version}`;
        
        try {
            // FIX: Attempt localStorage first for fast subsequent loads,
            let lsOk = false;
            // v27: Strip API key before serializing settings (key stored in dedicated slot)
            const _settingsToSave = JSON.parse(JSON.stringify(IDE.state.settings));
            if (_settingsToSave.ai) delete _settingsToSave.ai.apiKey;
            try {
                localStorage.setItem(saveKey, JSON.stringify(IDE.state.files));
                localStorage.setItem(settingsKey, JSON.stringify(_settingsToSave));
                localStorage.setItem('procode_last_save', new Date().toISOString());
                lsOk = true;
            } catch (quotaErr) {
                // QuotaExceededError — localStorage is full
                if (quotaErr && (quotaErr.name === 'QuotaExceededError' || quotaErr.code === 22)) {
                    // Notify user once per session
                    if (!this._quotaWarnShown) {
                        this._quotaWarnShown = true;
                        Utils.toast(
                            '⚠️ localStorage full — saving to IndexedDB only. Data is safe but browser storage is near capacity.',
                            'warn', 6000
                        );
                    }
                    // Try to free space by removing old backups
                    try {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.includes('_backup_')) keysToRemove.push(k);
                        }
                        keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });
                        // Retry once after cleanup
                        localStorage.setItem(saveKey, JSON.stringify(IDE.state.files));
                        localStorage.setItem(settingsKey, JSON.stringify(_settingsToSave));
                        localStorage.setItem('procode_last_save', new Date().toISOString());
                        lsOk = true;
                    } catch(_) {
                        // Still failing — IDB will be sole storage
                    }
                } else {
                    throw quotaErr; // re-throw non-quota errors
                }
            }
            
            // FIX: Always persist to IndexedDB (was "best-effort" before)
            // If localStorage is full, IDB is the only copy — must not be optional.
            const idbPromise = this.flushIndexedDB();
            if (!lsOk) {
                // If localStorage failed, wait for IDB to confirm before returning success
                idbPromise.catch(e => {
                    console.error('Save failed (IDB + localStorage both failed):', e);
                    Utils.toast('❌ Save failed: storage unavailable', 'error');
                });
            } else {
                idbPromise.catch(() => {}); // non-critical when LS succeeded
            }
            
            // Update file system metrics
            this.updateFileSystemMetrics();
            
            // Visual feedback
            const saveBtn = document.querySelector('[title*="Save"]');
            if (saveBtn) {
                const originalColor = saveBtn.style.color;
                saveBtn.innerHTML = '<i class="fas fa-check"></i>';
                saveBtn.style.color = '#22c55e';
                
                setTimeout(() => {
                    saveBtn.innerHTML = '<i class="fas fa-save"></i>';
                    saveBtn.style.color = originalColor;
                }, 1000);
            }
            
            if (immediate) {
                Utils.toast('Project saved successfully', 'success');
            }
            
            // Update save indicator
            this.updateSaveIndicator();
            
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            Utils.toast('Save failed: ' + e.message, 'error');
            return false;
        }
    },
    
    // Update save indicator in footer
    updateSaveIndicator: function() {
        const lastSave = localStorage.getItem('procode_last_save');
        if (lastSave) {
            const timeAgo = Utils.formatDate(lastSave, 'relative');
            // Could add to footer or status bar
        }
    },
    
    // Setup auto-save with enhanced logic
    setupAutoSave: function() {
        if (this.autoSaveInterval) { clearInterval(this.autoSaveInterval); this.autoSaveInterval = null; }
        if (IDE.state.settings.editor.autoSave) {
            this.autoSaveInterval = setInterval(() => {
                if (IDE.state.dirtyTabs.size > 0) {
                    this.save();
                    IDE.state.dirtyTabs.clear();
                    this.updateTabDirtyState();
                }
            }, IDE.state.settings.editor.autoSaveDelay);
            
            // Enhanced beforeunload handler
            window.addEventListener('beforeunload', (e) => {
                if (IDE.state.dirtyTabs.size > 0 && IDE.state.settings.editor.autoSave) {
                    this.save(true);
                }
                
                // Clear interval
                if (this.autoSaveInterval) {
                    clearInterval(this.autoSaveInterval);
                }
            });
        }
    },
    
    // Setup file watchers for external changes
    setupFileWatchers: function() {
        // This would integrate with File System Access API when available
        if ('showOpenFilePicker' in window) {
            if (window.__PROCODE_DEBUG__) console.info('[ProCode] File System Access API available');
        }
    },
    
    // Update file system metrics
    updateFileSystemMetrics: function() {
        const metrics = {
            totalFiles: Object.keys(IDE.state.files).length,
            totalSize: 0,
            byType: {}
        };
        
        for (const [path, content] of Object.entries(IDE.state.files)) {
            const size = new Blob([content]).size;
            metrics.totalSize += size;
            
            const type = Utils.getFileTypeCategory(path);
            metrics.byType[type] = (metrics.byType[type] || 0) + 1;
        }
        
        IDE.state.fileSystemMetrics = metrics;
        
        // Update UI if needed
        const fileCountEl = document.getElementById('file-count');
        if (fileCountEl) {
            fileCountEl.textContent = `${metrics.totalFiles} files`;
        }
    },

    exists: function(path) {
        if (!path) return false;
        if (IDE.state.files && Object.prototype.hasOwnProperty.call(IDE.state.files, path)) {
            return true;
        }
        if (path.endsWith('/')) {
            return Object.keys(IDE.state.files).some((p) => p.startsWith(path));
        }
        return false;
    },
    
    // Enhanced file operations with transactions
    write: function(path, content, options = {}) {
        const oldContent = IDE.state.files[path];
        const isNewFile = !this.exists(path);
        
        // Create backup for undo
        if (!options.skipHistory && oldContent !== content) {
            this.addToHistory('write', path, oldContent, content);
        }
        
        IDE.state.files[path] = content;
        
        // Queue persistence
        this._queueIndexedDBWrite(path, content);
        
        // Mark tab as dirty
        if (IDE.state.tabs.includes(path)) {
            IDE.state.dirtyTabs.add(path);
            this.updateTabDirtyState();
        }
        
        // Update outline if this is the active file
        if (IDE.state.activeTab === path) {
            this.updateOutline();
        }
        
        // Auto-save if enabled
        if (IDE.state.settings.editor.autoSave && !options.skipAutoSave) {
            if (this.autoSave) {
                this.autoSave.queueChange(path, content);
            } else {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.save(), 1000);
            }
        }
        
        // Update metrics
        this.updateFileSystemMetrics();
        
        // Event for external listeners
        this.emitFileChange(path, isNewFile ? 'created' : 'modified');
        
        return true;
    },
    
    // Enhanced read with caching
    read: function(path, useCache = true) {
        if (!this.exists(path)) {
            throw new Error(`File not found: ${path}`);
        }
        
        if (useCache && this.fileCache && this.fileCache[path]) {
            return this.fileCache[path];
        }
        
        const content = IDE.state.files[path] || '';
        
        // Cache for performance
        if (!this.fileCache) this.fileCache = {};
        this.fileCache[path] = content;
        
        return content;
    },
    
    // Enhanced delete with recycle bin
    delete: function(path, permanent = false) {
        if (!this.exists(path)) return false;
        
        if (!permanent && !confirm(`Move "${path}" to recycle bin?`)) {
            return false;
        }
        
        if (permanent && !confirm(`Permanently delete "${path}"? This cannot be undone.`)) {
            return false;
        }
        
        const content = this.read(path);
        
        // Add to recycle bin if not permanent
        if (!permanent) {
            this.addToRecycleBin(path, content);
        }
        
        // Add to history for undo
        this.addToHistory('delete', path, content, null);
        
        delete IDE.state.files[path];
        
        // Queue persistence
        this._queueIndexedDBDelete(path);
        
        TabManager.close(path, true);
        IDE.state.dirtyTabs.delete(path);
        
        this.save();
        this.refreshTree();
        
        Utils.toast(`${permanent ? 'Permanently deleted' : 'Moved to recycle bin'}: ${path}`, 'warning');
        
        return true;
    },
    
    // Enhanced rename with conflict resolution
    rename: function(oldPath, newPath, options = {}) {
        if (oldPath === newPath) return true;
        
        const fileName = newPath.split('/').pop();
        if (!Utils.isValidFileName(fileName)) {
            Utils.toast('Invalid file name', 'error');
            return false;
        }
        
        if (this.exists(newPath)) {
            if (options.overwrite) {
                // Backup the overwritten file
                const overwrittenContent = this.read(newPath);
                this.addToHistory('overwrite', newPath, overwrittenContent, null);
                delete IDE.state.files[newPath];
            } else {
                Utils.toast('File already exists', 'error');
                return false;
            }
        }
        
        const content = this.read(oldPath);
        
        // Add to history
        this.addToHistory('rename', oldPath, content, newPath);
        
        delete IDE.state.files[oldPath];
        this.write(newPath, content, { skipHistory: true });
        
        // Update tabs
        const tabIndex = IDE.state.tabs.indexOf(oldPath);
        if (tabIndex > -1) {
            IDE.state.tabs[tabIndex] = newPath;
        }
        
        if (IDE.state.activeTab === oldPath) {
            IDE.state.activeTab = newPath;
        }
        
        // Update dirty tabs
        if (IDE.state.dirtyTabs.has(oldPath)) {
            IDE.state.dirtyTabs.delete(oldPath);
            IDE.state.dirtyTabs.add(newPath);
        }
        
        this.save();
        this.refreshTree();
        TabManager.render();
        
        Utils.toast(`Renamed to: ${newPath}`, 'success');
        return true;
    },
    
_refreshTreeTimer: null,
refreshTree: function() {
    // FIX: correct throttle — clearTimeout first, then gate
    clearTimeout(this._refreshTreeTimer);
    this._refreshTreeTimer = setTimeout(() => {
        this._refreshTreeTimer = null;
        this._doRefreshTree();
    }, 100);
},
_doRefreshTree: function() {
    const tree = document.getElementById('file-tree');
    if (!tree) return;

    // Check visibility properly — sidebar uses position:fixed so offsetParent is null
    // Use getBoundingClientRect instead
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('hidden')) return;

    // Clear existing content
    if (tree._cleanupVirtualScroll) {
        tree._cleanupVirtualScroll();
    }
    tree.innerHTML = '';
    
    const totalFiles = Object.keys(IDE.state.files).length;
    
    // Show loading for large file systems
    if (totalFiles > 100) {
        _setHTML(tree, '<div style="padding: 20px; text-align: center; color: var(--text-dim);"><i class="fas fa-spinner fa-spin"></i> Loading file tree...</div>');
        
        // Use requestIdleCallback for better performance
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                tree.innerHTML = '';
                this.renderFileTreeVirtual(tree);
            }, { timeout: 1000 });
        } else {
            setTimeout(() => {
                tree.innerHTML = '';
                this.renderFileTreeVirtual(tree);
            }, 50);
        }
    } else {
        // Use regular rendering for small projects
        this.renderFileTree(tree);
    }
},
renderFileTreeVirtual: function(container) {
    const allFiles = this.buildFileStructure();
    const flattenedItems = this.flattenFileStructure(allFiles);
    
    // ✅ FIX: Giảm buffer size, tăng hiệu suất
    const itemHeight = 28;
    const containerHeight = container.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferSize = 5; // Giảm từ 10 xuống 5
    
    let scrollTop = 0;
    let startIndex = 0;
    let endIndex = visibleCount + bufferSize;
    let animationFrameId = null;
    let renderCache = new Map();
    let lastStartIndex = -1;
    
    // ✅ NEW: Pooling pattern để tái sử dụng DOM nodes
    const nodePool = [];
    const getNodeFromPool = () => {
        return nodePool.pop() || this.createFileTreeItem({ type: 'placeholder' }, 0);
    };
    const returnNodeToPool = (node) => {
        if (nodePool.length < 50) nodePool.push(node);
    };
    
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${flattenedItems.length * itemHeight}px`;
    scrollContainer.style.position = 'relative';
    
    const visibleContainer = document.createElement('div');
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.left = '0';
    visibleContainer.style.right = '0';
    visibleContainer.style.willChange = 'transform';
    visibleContainer.style.contain = 'strict'; // ✅ CSS containment for performance
    
    const renderVisibleItems = () => {
        if (startIndex === lastStartIndex && renderCache.size > 0) return;
        
        // ✅ FIX: Batch DOM operations
        const fragment = document.createDocumentFragment();
        const existingNodes = Array.from(visibleContainer.children);
        const nodesToKeep = new Set();
        
        for (let i = startIndex; i < Math.min(endIndex, flattenedItems.length); i++) {
            const item = flattenedItems[i];
            const cacheKey = `${item.path}-${i}`;
            
            let element = renderCache.get(cacheKey);
            if (!element) {
                element = this.createFileTreeItem(item, i * itemHeight);
                renderCache.set(cacheKey, element);
            } else {
                element.style.top = `${i * itemHeight}px`;
            }
            
            nodesToKeep.add(element);
            // Move element (not clone) to preserve event listeners
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            fragment.appendChild(element);
        }
        
        // ✅ FIX: Cleanup unused nodes (remove from DOM if they're from old render)
        existingNodes.forEach(node => {
            if (!nodesToKeep.has(node) && node.parentNode) {
                node.parentNode.removeChild(node);
                returnNodeToPool(node);
            }
        });
        
        visibleContainer.innerHTML = '';
        visibleContainer.appendChild(fragment);
        lastStartIndex = startIndex;
        
        // ✅ FIX: Smart cache cleanup
        if (renderCache.size > visibleCount * 3) {
            const keysToKeep = new Set();
            const rangeStart = Math.max(0, startIndex - bufferSize * 2);
            const rangeEnd = Math.min(flattenedItems.length, endIndex + bufferSize * 2);
            
            for (let i = rangeStart; i < rangeEnd; i++) {
                keysToKeep.add(`${flattenedItems[i].path}-${i}`);
            }
            
            for (const key of renderCache.keys()) {
                if (!keysToKeep.has(key)) renderCache.delete(key);
            }
        }
    };
    
    // ✅ FIX: Throttled scroll với RAF
    let lastScrollTime = 0;
    const handleScroll = () => {
        const now = performance.now();
        if (now - lastScrollTime < 16) return; // Throttle to ~60fps
        lastScrollTime = now;
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        animationFrameId = requestAnimationFrame(() => {
            scrollTop = container.scrollTop;
            const newStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
            const newEndIndex = Math.min(flattenedItems.length, newStartIndex + visibleCount + (bufferSize * 2));
            
            if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
                startIndex = newStartIndex;
                endIndex = newEndIndex;
                visibleContainer.style.transform = `translate3d(0, ${startIndex * itemHeight}px, 0)`; // ✅ Use translate3d
                renderVisibleItems();
            }
        });
    };
    
    // ✅ FIX: Passive listener
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    scrollContainer.appendChild(visibleContainer);
    container.appendChild(scrollContainer);
    renderVisibleItems();
    
    // ✅ NEW: Cleanup function
    container._cleanupVirtualScroll = () => {
        container.removeEventListener('scroll', handleScroll);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        renderCache.clear();
        nodePool.length = 0;
    };
},

    flattenFileStructure: function(structure, level = 0, parentPath = '') {
        const items = [];
        
        for (const [name, data] of Object.entries(structure)) {
            if (name === '__file' || name === '__folder' || name === 'path') continue;
            
            const currentPath = parentPath ? `${parentPath}/${name}` : name;
            
            if (data.__file) {
                items.push({
                    type: 'file',
                    name: name,
                    path: data.path,
                    level: level
                });
            } else if (data.__folder) {
                items.push({
                    type: 'folder',
                    name: name,
                    path: currentPath,
                    level: level,
                    expanded: localStorage.getItem(`folder_${currentPath}`) === 'expanded'
                });
                
                // Add children if expanded
                if (localStorage.getItem(`folder_${currentPath}`) === 'expanded') {
                    items.push(...this.flattenFileStructure(data, level + 1, currentPath));
                }
            }
        }
        
        return items;
    },

    createFileTreeItem: function(item, top) {
        const element = document.createElement('div');
        element.className = 't-item';
        element.style.position = 'absolute';
        element.style.top = `${top}px`;
        element.style.left = '0';
        element.style.right = '0';
        element.style.height = '28px';
        element.dataset.path = item.path;
        
        const padding = 16 + (item.level * 20);
        
        if (item.type === 'file') {
            const [iconClass, iconColor] = Utils.getFileIcon(item.name);
            const isDirty = IDE.state.dirtyTabs.has(item.path);
            const isActive = IDE.state.activeTab === item.path;
            
            element.innerHTML = `
                <div class="t-indent" style="padding-left:${padding}px">
                    <i class="${iconClass}" style="color:${iconColor}"></i>
                    <span style="margin-left:8px; flex:1;">${item.name}</span>
                    ${isDirty ? '<span style="color:var(--primary); font-size:20px; margin-right:8px;">●</span>' : ''}
                </div>
            `;
            
            element.onclick = (e) => {
                e.stopPropagation();
                TabManager.open(item.path);
            };
            
            if (isActive) {
                element.classList.add('active');
            }
        } else {
            const folderIcon = item.expanded ? 'fa-folder-open' : 'fa-folder';
            
            element.innerHTML = `
                <div class="t-indent" style="padding-left:${padding}px">
                    <i class="fas ${folderIcon}" style="color:#d97706"></i>
                    <span style="margin-left:8px; flex:1;">${item.name}</span>
                    <i class="fas fa-chevron-right" 
                       style="font-size:10px; transform: ${item.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
                              transition: transform 0.2s;"></i>
                </div>
            `;
            
            element.onclick = (e) => {
                e.stopPropagation();
                this.toggleFolderVirtual(item.path);
            };
        }
        
        return element;
    },

    toggleFolderVirtual: function(path) {
        const currentState = localStorage.getItem(`folder_${path}`);
        const newState = currentState === 'expanded' ? 'collapsed' : 'expanded';
        localStorage.setItem(`folder_${path}`, newState);
        
        // Re-render the tree
        this.refreshTree();
    },

    // Render file tree with virtualization
    renderFileTree: function(container) {
        const structure = this.buildFileStructure();
        this.renderNode(structure, container, 0, '');
        
        // Update outline if active tab exists
        if (IDE.state.activeTab) {
            this.updateOutline();
        }
    },
    
    // Build hierarchical file structure
    buildFileStructure: function() {
        const structure = {};
        
        Object.keys(IDE.state.files)
            .sort((a, b) => {
                // Sort directories first, then files
                const aIsDir = a.includes('/');
                const bIsDir = b.includes('/');
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            })
            .forEach(path => {
                const parts = path.split('/');
                let current = structure;
                
                parts.forEach((part, i) => {
                    if (!current[part]) {
                        current[part] = (i === parts.length - 1) 
                            ? { __file: true, path: path } 
                            : { __folder: true };
                    }
                    current = current[part];
                });
            });
        
        return structure;
    },
    
    // Render tree node recursively
    renderNode: function(node, container, level = 0, parentPath = '') {
        if (!node || typeof node !== 'object') return;
        
        const entries = Object.entries(node);
        if (entries.length === 0) return;
        
        // Sort: folders first, then files
        entries.sort(([aKey, aVal], [bKey, bVal]) => {
            const aIsFolder = aVal.__folder;
            const bIsFolder = bVal.__folder;
            
            if (aIsFolder && !bIsFolder) return -1;
            if (!aIsFolder && bIsFolder) return 1;
            return aKey.localeCompare(bKey);
        });
        
        for (const [name, data] of entries) {
            if (name === '__file' || name === '__folder' || name === 'path') continue;
            
            const currentPath = parentPath ? `${parentPath}/${name}` : name;
            const padding = 16 + (level * 20);
            
            if (data.__file) {
                // File item
                this.renderFileItem(name, data.path, padding, container);
            } else if (data.__folder) {
                // Folder item
                this.renderFolderItem(name, currentPath, padding, container, level, data);
            }
        }
    },
    
    // Render file item
    renderFileItem: function(name, path, padding, container) {
        const item = document.createElement('div');
        item.className = 't-item';
        item.dataset.path = path;
        
        const [iconClass, iconColor] = Utils.getFileIcon(name);
        const isDirty = IDE.state.dirtyTabs.has(path);
        const isActive = IDE.state.activeTab === path;
        
        item.innerHTML = `
            <div class="t-indent" style="padding-left:${padding}px">
                <i class="${iconClass}" style="color:${iconColor}"></i>
                <span style="margin-left:8px; flex:1;">${name}</span>
                ${isDirty ? '<span style="color:var(--primary); font-size:20px; margin-right:8px;"></span>' : ''}
                ${isActive ? '<span style="color:var(--primary); font-size:10px; margin-right:8px;"></span>' : ''}
            </div>
        `;
        
        item.onclick = (e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                LayoutManager.openInSplit(path);
            } else {
                TabManager.open(path);
            }
        };
        
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, path, 'file');
        };
        
        // Drag and drop support
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', path);
            e.dataTransfer.effectAllowed = 'move';
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
        });
        
        if (isActive) {
            item.classList.add('active');
        }
        
        container.appendChild(item);
    },
    
    // Render folder item
    renderFolderItem: function(name, path, padding, container, level, data) {
        const item = document.createElement('div');
        item.className = 't-item';
        item.dataset.folder = path;
        
        // Check if folder contains active file
        const hasActiveChild = IDE.state.activeTab && 
            IDE.state.activeTab.startsWith(path + '/');
        
        const isExpanded = hasActiveChild || 
            (localStorage.getItem(`folder_${path}`) === 'expanded');
        
        const folderIcon = isExpanded ? 'fa-folder-open' : 'fa-folder';
        
        item.innerHTML = `
            <div class="t-indent" style="padding-left:${padding}px">
                <i class="fas ${folderIcon}" style="color:#d97706"></i>
                <span style="margin-left:8px; flex:1;">${name}</span>
                <i class="fas fa-chevron-right" 
                   style="font-size:10px; transform: ${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
                          transition: transform 0.2s;"></i>
            </div>
        `;
        
        const subContainer = document.createElement('div');
        subContainer.className = `t-sub ${isExpanded ? '' : 'hidden'}`;
        
        item.onclick = (e) => {
            e.stopPropagation();
            this.toggleFolder(item, subContainer, path);
        };
        
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, path + '/', 'folder');
        };
        
        // Drag and drop for folders
        item.draggable = true;
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.style.background = 'var(--primary)20';
        });
        
        item.addEventListener('dragleave', () => {
            item.style.background = '';
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.background = '';
            const draggedPath = e.dataTransfer.getData('text/plain');
            if (draggedPath) {
                this.moveFile(draggedPath, path + '/' + draggedPath.split('/').pop());
            }
        });
        
        container.appendChild(item);
        container.appendChild(subContainer);
        
        // Recursively render children
        this.renderNode(data, subContainer, level + 1, path);
    },
    
    // Toggle folder expansion
    toggleFolder: function(folderElement, subContainer, path) {
        const wasHidden = subContainer.classList.contains('hidden');
        subContainer.classList.toggle('hidden');
        
        const folderIcon = folderElement.querySelector('.fa-folder, .fa-folder-open');
        const chevron = folderElement.querySelector('.fa-chevron-right');
        
        if (wasHidden) {
            folderIcon.className = 'fas fa-folder-open';
            chevron.style.transform = 'rotate(90deg)';
            localStorage.setItem(`folder_${path}`, 'expanded');
        } else {
            folderIcon.className = 'fas fa-folder';
            chevron.style.transform = 'rotate(0deg)';
            localStorage.setItem(`folder_${path}`, 'collapsed');
        }
    },
    
    // Enhanced context menu
    showContextMenu: function(event, path, type) {
        // Remove existing context menus
        document.querySelectorAll('.context-menu').forEach(el => el.remove());
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        if (type === 'file') {
            this.renderFileContextMenu(menu, path);
        } else {
            this.renderFolderContextMenu(menu, path);
        }
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
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
    
    // Render file context menu
    renderFileContextMenu: function(menu, path) {
        const fileName = path.split('/').pop();
        const previewToken = this._previewToken || '';
        const previewTokenJson = JSON.stringify(previewToken);
        const ext = Utils.getExtension(path);
        
        this.addContextMenuItem(menu, 'fa-edit', 'Rename', () => {
            const newName = prompt('Enter new name:', fileName);
            if (newName && newName !== fileName) {
                const newPath = path.split('/').slice(0, -1).concat(newName).join('/');
                this.rename(path, newPath);
            }
        });
        
        this.addContextMenuItem(menu, 'fa-copy', 'Duplicate', () => {
            this.duplicateFile(path);
        });
        
        this.addContextMenuItem(menu, 'fa-clone', 'Clone to...', () => {
            const targetFolder = prompt('Enter target folder path (leave empty for current):', '');
            if (targetFolder !== null) {
                this.duplicateFile(path, targetFolder);
            }
        });
        
        this.addContextMenuItem(menu, 'fa-trash', 'Move to Recycle Bin', () => {
            this.delete(path, false);
        });
        
        menu.appendChild(document.createElement('div')).className = 'context-divider';
        
        this.addContextMenuItem(menu, 'fa-download', 'Download', () => {
            const content = this.read(path);
            Utils.downloadFile(fileName, content);
        });
        
        this.addContextMenuItem(menu, 'fa-external-link-alt', 'Open in New Tab', () => {
            const content = this.read(path);
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        });
        
        this.addContextMenuItem(menu, 'fa-share', 'Share...', () => {
            this.shareFile(path);
        });
        
        menu.appendChild(document.createElement('div')).className = 'context-divider';
        
        // File-specific actions
        if (ext === 'html' || ext === 'js' || ext === 'css') {
            this.addContextMenuItem(menu, 'fa-play', 'Run File', () => Runner.execute(path));
        }
        
        if (ext === 'md') {
            this.addContextMenuItem(menu, 'fa-eye', 'Preview Markdown', () => {
                this.previewMarkdown(path);
            });
        }
        
        this.addContextMenuItem(menu, 'fa-info-circle', 'Properties', () => {
            this.showFileProperties(path);
        });
    },
    
    // Render folder context menu
    renderFolderContextMenu: function(menu, path) {
        const folderName = path.split('/').filter(Boolean).pop() || 'Project';
        
        this.addContextMenuItem(menu, 'fa-folder-plus', 'New Folder', () => {
            const name = prompt('Enter folder name:');
            if (name) {
                this.createFolder(path + name);
            }
        });
        
        this.addContextMenuItem(menu, 'fa-file-medical', 'New File', () => {
            this.createFilePrompt(path);
        });
        
        this.addContextMenuItem(menu, 'fa-file-import', 'Import Files...', () => {
            this.importPrompt(path);
        });
        
        menu.appendChild(document.createElement('div')).className = 'context-divider';
        
        this.addContextMenuItem(menu, 'fa-trash', `Delete "${folderName}"`, () => {
            if (confirm(`Delete folder "${folderName}" and all contents?`)) {
                this.deleteFolder(path);
            }
        });
        
        this.addContextMenuItem(menu, 'fa-compress', 'Compress to ZIP', () => {
            this.compressFolder(path);
        });
        
        this.addContextMenuItem(menu, 'fa-search', 'Find in Folder...', () => {
            Search.findInFolder(path);
        });
    },
    
    // Add context menu item
    addContextMenuItem: function(menu, icon, text, action, disabled = false) {
        const item = document.createElement('div');
        item.className = `context-item ${disabled ? 'disabled' : ''}`;
        item.innerHTML = _sanitize(`<i class="fas ${icon}"></i> ${text}`);
        
        if (!disabled) {
            item.onclick = () => {
                try {
                    action();
                } catch (error) {
                    Utils.toast(`Action failed: ${error.message}`, 'error');
                }
                menu.remove();
            };
        }
        
        menu.appendChild(item);
    },
    
    // Enhanced duplicate file
    duplicateFile: function(path, targetFolder = null) {
        const fileName = path.split('/').pop();
        const ext = Utils.getExtension(fileName);
        const baseName = fileName.substring(0, fileName.length - (ext ? ext.length + 1 : 0));
        
        let newPath = targetFolder ? 
            `${targetFolder}/${fileName}` : 
            path.split('/').slice(0, -1).concat(fileName).join('/');
        
        // Ensure unique name
        let counter = 1;
        while (this.exists(newPath)) {
            const newName = `${baseName}-copy${counter > 1 ? `-${counter}` : ''}.${ext}`;
            newPath = targetFolder ? 
                `${targetFolder}/${newName}` : 
                path.split('/').slice(0, -1).concat(newName).join('/');
            counter++;
        }
        
        this.write(newPath, this.read(path));
        this.refreshTree();
        TabManager.open(newPath);
        
        Utils.toast(`Duplicated to: ${newPath}`, 'success');
    },
    
    // Create folder
    createFolder: function(path) {
        if (!path.endsWith('/')) path += '/';
        
        // Create a .keep file to mark folder
        const keepPath = path + '.keep';
        this.write(keepPath, '# Folder placeholder\n# This file ensures the folder is visible in the file tree');
        
        this.refreshTree();
        Utils.toast(`Created folder: ${path}`, 'success');
    },
    
    // Delete folder
    deleteFolder: function(path) {
        if (!path.endsWith('/')) path += '/';
        
        // Get all files in folder
        const filesToDelete = Object.keys(IDE.state.files).filter(f => f.startsWith(path));
        
        // Move to recycle bin
        filesToDelete.forEach(filePath => {
            this.addToRecycleBin(filePath, this.read(filePath));
            delete IDE.state.files[filePath];
        });
        
        this.save();
        this.refreshTree();
        Utils.toast(`Deleted folder: ${path} (${filesToDelete.length} files)`, 'warning');
    },
    
    // Compress folder to ZIP
    compressFolder: async function(path) {
        try {
            const zip = new JSZip();
            const folderName = path.split('/').filter(Boolean).pop() || 'archive';
            
            // Add all files in folder
            const folderFiles = Object.keys(IDE.state.files).filter(f => f.startsWith(path));
            
            for (const filePath of folderFiles) {
                const relativePath = filePath.substring(path.length).replace(/^\/+/, '');
                const content = this.read(filePath);
                if (typeof content === 'string' && content.startsWith('data:')) {
                const m = content.match(/^data:([^;]+);base64,(.*)$/);
                if (m) {
                    zip.file(relativePath, m[2], { base64: true });
                } else {
                    zip.file(relativePath, content);
                }
            } else {
                zip.file(relativePath, content);
            }
            }
            
            // Generate and download
            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `${folderName}-${new Date().toISOString().split('T')[0]}.zip`);
            
            Utils.toast("Folder compressed successfully!", "success");
        } catch (error) {
            Utils.toast("Compression failed: " + error.message, "error");
        }
    },
    
    // Share file
    shareFile: function(path) {
        if (navigator.share) {
            const content = this.read(path);
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], path.split('/').pop(), { type: 'text/plain' });
            
            navigator.share({
                title: `Share ${path}`,
                text: 'Check out this file from ProCode IDE',
                files: [file]
            }).catch(error => {
                if (error.name !== 'AbortError') {
                    Utils.toast('Share failed: ' + error.message, 'error');
                }
            });
        } else {
            Utils.toast('Web Share API not supported in this browser', 'info');
        }
    },
    
    // Preview markdown
    previewMarkdown: function(path) {
        const content = this.read(path);
        const html = marked.parse(content);
        
        // SECURITY FIX: Use blob URL instead of document.write()
        const safeTitle = path.replace(/[<>"&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]));
        const htmlContent = `<!DOCTYPE html><html><head>
            <title>${safeTitle} - Markdown Preview</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
            <style>.markdown-body{box-sizing:border-box;min-width:200px;max-width:980px;margin:0 auto;padding:45px}@media(max-width:767px){.markdown-body{padding:15px}}</style>
            </head><body class="markdown-body">${html}</body></html>`;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const preview = window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    },
    
    // Show file properties
    showFileProperties: function(path) {
        const content = this.read(path);
        const stats = {
            path: path,
            name: path.split('/').pop(),
            size: Utils.formatBytes(new Blob([content]).size),
            lines: content.split('\n').length,
            words: content.split(/\s+/).filter(w => w.length > 0).length,
            characters: content.length,
            created: localStorage.getItem(`file_created_${path}`) || 'Unknown',
            modified: localStorage.getItem(`file_modified_${path}`) || 'Unknown',
            type: Utils.getFileTypeCategory(path),
            encoding: 'UTF-8'
        };
        
        const modal = `
            <div class="modal-overlay" id="properties-modal">
                <div class="modal" style="width:500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-info-circle"></i> Properties: ${stats.name}</h3>
                        <button class="btn icon small" onclick="__pc_removeEl('properties-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <table style="width:100%; font-size:13px;">
                            ${Object.entries(stats).map(([key, value]) => `
                                <tr>
                                    <td style="padding:8px; color:var(--text-dim); font-weight:500;">${Utils.capitalize(key)}</td>
                                    <td style="padding:8px;">${value}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="__pc_removeEl('properties-modal')">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
    },
    
    // Enhanced import with folder selection
    importPrompt: function(targetFolder = '') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip,.js,.jsx,.ts,.tsx,.html,.css,.py,.md,.json,.txt,.vue,.svelte,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.otf,.mp3,.wav,.ogg,.mp4,.webm,.m4a,.flac,.pdf';
        input.multiple = true;
        // Choose between folder import and file/ZIP import (so ZIP picking works reliably)
        let folderMode = false;
        try {
            folderMode = confirm('Import mode:\n\nOK = Import a folder (keeps subfolders)\nCancel = Import files / ZIP');
        } catch (_) {}
        if (folderMode) {
            input.webkitdirectory = true;
            input.directory = true;
        }
        
        input.onchange = async (event) => {
            const files = Array.from(event.target.files);
            let importedCount = 0;
            let skippedCount = 0;
            
            for (const file of files) {
                const filePath = targetFolder ? 
                    `${targetFolder}/${file.webkitRelativePath || file.name}` : 
                    file.name;
                
                if (this.exists(filePath) && !confirm(`Overwrite "${filePath}"?`)) {
                    skippedCount++;
                    continue;
                }
                
                if (file.name.endsWith('.zip')) {
                    try {
                        const zip = await JSZip.loadAsync(file);
                        
                        for (const [path, entry] of Object.entries(zip.files)) {
                            if (!entry.dir) {
                                const content = Utils.isBinaryExt(path)
                                    ? `data:${Utils.mimeFromPath(path)};base64,${await entry.async("base64")}`
                                    : await entry.async("string");
                                const fullPath = targetFolder ? `${targetFolder}/${path}` : path;
                                IDE.state.files[fullPath] = content;
                                importedCount++;
                            }
                        }
                        
                        Utils.toast(`Imported ZIP: ${file.name}`, 'success');
                    } catch (error) {
                        Utils.toast(`Failed to import ZIP: ${error.message}`, 'error');
                    }
                } else {
                    try {
                        const content = await Utils.readFileSmart(file);
                        IDE.state.files[filePath] = content;
                        importedCount++;
                        
                        // Record creation time
                        localStorage.setItem(`file_created_${filePath}`, new Date().toISOString());
                    } catch (error) {
                        Utils.toast(`Failed to import ${file.name}: ${error.message}`, 'error');
                    }
                }
            }
            
            if (importedCount > 0) {
                this.save();
                this.refreshTree();
                Utils.toast(`Imported ${importedCount} file(s)${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}`, 'success');
            }
        };
        
        input.click();
    },
    
    // Enhanced export with options
    exportZip: async function(options = {}) {
        try {
            const zip = new JSZip();
            const date = new Date().toISOString().split('T')[0];
            const projectName = options.name || `procode-project-${date}`;
            
            // Add all files (excluding .keep files)
            for (const [path, content] of Object.entries(IDE.state.files)) {
                if (!path.endsWith('.keep')) {
                    if (typeof content === 'string' && content.startsWith('data:')) {
                        const m = content.match(/^data:([^;]+);base64,(.*)$/);
                        if (m) {
                            zip.file(path, m[2], { base64: true });
                        } else {
                            // Non-base64 data URLs: keep as-is
                            zip.file(path, content);
                        }
                    } else {
                        zip.file(path, content);
                    }
                }
            }
            
            // Add project metadata
            const metadata = {
                name: projectName,
                version: '1.0.0',
                created: date,
                ideVersion: IDE.version,
                fileCount: Object.keys(IDE.state.files).length,
                settings: IDE.state.settings
            };
            
            zip.file('PROJECT.json', JSON.stringify(metadata, null, 2));
            
            // Generate and download
            const blob = await zip.generateAsync({ 
                type: "blob",
                compression: options.compression ? "DEFLATE" : "STORE"
            });
            
            saveAs(blob, `${projectName}.zip`);
            Utils.toast("Project exported successfully!", "success");
        } catch (error) {
            Utils.toast("Export failed: " + error.message, "error");
        }
    },
    
    // Move file
    moveFile: function(oldPath, newPath) {
        if (oldPath === newPath) return true;
        
        if (this.exists(newPath)) {
            if (!confirm(`Overwrite "${newPath}"?`)) {
                return false;
            }
        }
        
        const content = this.read(oldPath);
        delete IDE.state.files[oldPath];
        this.write(newPath, content);
        
        // Update tabs
        const tabIndex = IDE.state.tabs.indexOf(oldPath);
        if (tabIndex > -1) {
            IDE.state.tabs[tabIndex] = newPath;
        }
        
        if (IDE.state.activeTab === oldPath) {
            IDE.state.activeTab = newPath;
        }
        
        this.save();
        this.refreshTree();
        TabManager.render();
        
        Utils.toast(`Moved to: ${newPath}`, 'success');
        return true;
    },
    
    // Find in folder
    findInFolder: function(folderPath, query, options = {}) {
        const results = [];
        const regex = new RegExp(
            options.wholeWord ? `\\b${query}\\b` : query,
            options.caseSensitive ? 'g' : 'gi'
        );
        
        const files = Object.keys(IDE.state.files).filter(f => 
            f.startsWith(folderPath) && 
            (!options.fileTypes || options.fileTypes.includes(Utils.getExtension(f)))
        );
        
        for (const path of files) {
            const content = this.read(path);
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                const matches = line.match(regex);
                if (matches) {
                    results.push({
                        path: path,
                        line: index + 1,
                        content: line.trim(),
                        matches: matches.length
                    });
                }
            });
        }
        
        return results;
    },
    
    // Enhanced search in files
    findInFiles: function(query, options = {}) {
        const results = [];
        const regex = new RegExp(
            options.regex ? query : (options.wholeWord ? `\\b${query}\\b` : query),
            options.caseSensitive ? 'g' : 'gi'
        );
        
        for (const [path, content] of Object.entries(IDE.state.files)) {
            // Skip if file type filter is set and doesn't match
            if (options.fileTypes && !options.fileTypes.includes(Utils.getExtension(path))) {
                continue;
            }
            
            // Skip if path filter is set and doesn't match
            if (options.pathFilter && !path.includes(options.pathFilter)) {
                continue;
            }
            
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                const matches = line.match(regex);
                if (matches) {
                    results.push({
                        path: path,
                        line: index + 1,
                        content: line.trim(),
                        matches: matches.length,
                        context: lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
                    });
                }
            });
        }
        
        // Sort results
        if (options.sortBy === 'path') {
            results.sort((a, b) => a.path.localeCompare(b.path));
        } else if (options.sortBy === 'line') {
            results.sort((a, b) => a.line - b.line);
        }
        
        return results;
    },
    
    // Replace in files
    replaceInFiles: function(find, replace, options = {}) {
        let replacedCount = 0;
        let fileCount = 0;
        
        for (const [path, content] of Object.entries(IDE.state.files)) {
            // Apply filters
            if (options.fileTypes && !options.fileTypes.includes(Utils.getExtension(path))) {
                continue;
            }
            
            if (options.pathFilter && !path.includes(options.pathFilter)) {
                continue;
            }
            
            const regex = new RegExp(
                options.regex ? find : (options.wholeWord ? `\\b${find}\\b` : find),
                options.caseSensitive ? 'g' : 'gi'
            );
            
            if (regex.test(content)) {
                const newContent = content.replace(regex, replace);
                this.write(path, newContent);
                
                const matches = (content.match(regex) || []).length;
                replacedCount += matches;
                fileCount++;
            }
        }
        
        return { replacedCount, fileCount };
    },
    
    // File history for undo/redo
    fileHistory: {
        past: [],
        future: [],
        maxSize: 100
    },
    
    // Add to history
    addToHistory: function(action, path, oldValue, newValue) {
        const historyItem = {
            action,
            path,
            oldValue,
            newValue,
            timestamp: new Date().toISOString()
        };
        
        this.fileHistory.past.push(historyItem);
        
        // Trim history if too large
        if (this.fileHistory.past.length > this.fileHistory.maxSize) {
            this.fileHistory.past.shift();
        }
        
        // Clear future when new action is performed
        this.fileHistory.future = [];
    },
    
    // Undo last action
    undo: function() {
        if (this.fileHistory.past.length === 0) {
            Utils.toast('Nothing to undo', 'info');
            return false;
        }
        
        const historyItem = this.fileHistory.past.pop();
        this.fileHistory.future.push(historyItem);
        
        switch (historyItem.action) {
            case 'write':
                IDE.state.files[historyItem.path] = historyItem.oldValue;
                break;
            case 'delete':
                IDE.state.files[historyItem.path] = historyItem.oldValue;
                break;
            case 'rename':
                // Swap old and new paths
                delete IDE.state.files[historyItem.newValue];
                IDE.state.files[historyItem.path] = historyItem.oldValue;
                break;
        }
        
        this.refreshTree();
        this.save();
        
        Utils.toast('Undo: ' + historyItem.action, 'success');
        return true;
    },
    
    // Redo last undone action
    redo: function() {
        if (this.fileHistory.future.length === 0) {
            Utils.toast('Nothing to redo', 'info');
            return false;
        }
        
        const historyItem = this.fileHistory.future.pop();
        this.fileHistory.past.push(historyItem);
        
        switch (historyItem.action) {
            case 'write':
                IDE.state.files[historyItem.path] = historyItem.newValue;
                break;
            case 'delete':
                delete IDE.state.files[historyItem.path];
                break;
            case 'rename':
                delete IDE.state.files[historyItem.path];
                IDE.state.files[historyItem.newValue] = historyItem.oldValue;
                break;
        }
        
        this.refreshTree();
        this.save();
        
        Utils.toast('Redo: ' + historyItem.action, 'success');
        return true;
    },
    
    // Recycle bin functionality
    recycleBin: [],
    
    // Add to recycle bin
    addToRecycleBin: function(path, content) {
        this.recycleBin.push({
            path,
            content,
            deletedAt: new Date().toISOString(),
            originalPath: path
        });
        
        // Keep only last 100 items
        if (this.recycleBin.length > 100) {
            this.recycleBin.shift();
        }
        
        localStorage.setItem('procode_recycle_bin', JSON.stringify(this.recycleBin));
    },
    
    // Show recycle bin
    showRecycleBin: function() {
        const modal = `
            <div class="modal-overlay" id="recycle-bin-modal">
                <div class="modal" style="width:700px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-trash-restore"></i> Recycle Bin</h3>
                        <button class="btn icon small" onclick="__pc_removeEl('recycle-bin-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.recycleBin.length === 0 ? 
                            '<p style="text-align:center; color:var(--text-dim); padding:40px;">Recycle bin is empty</p>' :
                            `<div style="max-height:400px; overflow-y:auto;">
                                ${this.recycleBin.map((item, index) => `
                                    <div class="flex ac jb" style="padding:12px; border-bottom:1px solid var(--border);">
                                        <div>
                                            <div style="font-weight:500;">${item.path}</div>
                                            <div style="font-size:11px; color:var(--text-dim);">
                                                Deleted ${Utils.formatDate(item.deletedAt)}
                                            </div>
                                        </div>
                                        <div class="flex gap-2">
                                            <button class="btn small" onclick="FileSystem.restoreFromRecycleBin(${index})">
                                                <i class="fas fa-undo"></i> Restore
                                            </button>
                                            <button class="btn small danger" onclick="FileSystem.emptyRecycleBinItem(${index})">
                                                <i class="fas fa-times"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                        }
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="__pc_removeEl('recycle-bin-modal')">Close</button>
                        ${this.recycleBin.length > 0 ? `
                            <button class="btn danger" onclick="FileSystem.emptyRecycleBin()">
                                <i class="fas fa-trash"></i> Empty Recycle Bin
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
    },
    
    // Restore from recycle bin
    restoreFromRecycleBin: function(index) {
        const item = this.recycleBin[index];
        if (!item) return;
        
        // Check if file already exists
        if (this.exists(item.path)) {
            const newName = prompt('File already exists. Enter new name:', item.path);
            if (!newName) return;
            item.path = newName;
        }
        
        this.write(item.path, item.content);
        this.recycleBin.splice(index, 1);
        localStorage.setItem('procode_recycle_bin', JSON.stringify(this.recycleBin));
        
        // Refresh modal
        __pc_removeEl('recycle-bin-modal');
        this.showRecycleBin();
        
        Utils.toast(`Restored: ${item.path}`, 'success');
    },
    
    // Empty recycle bin item
    emptyRecycleBinItem: function(index) {
        if (confirm('Permanently delete this file?')) {
            this.recycleBin.splice(index, 1);
            localStorage.setItem('procode_recycle_bin', JSON.stringify(this.recycleBin));
            
            __pc_removeEl('recycle-bin-modal');
            this.showRecycleBin();
            
            Utils.toast('Permanently deleted', 'warning');
        }
    },
    
    // Empty entire recycle bin
    emptyRecycleBin: function() {
        if (confirm('Permanently delete all files in recycle bin?')) {
            this.recycleBin = [];
            localStorage.removeItem('procode_recycle_bin');
            
            __pc_removeEl('recycle-bin-modal');
            this.showRecycleBin();
            
            Utils.toast('Recycle bin emptied', 'warning');
        }
    },
    
    // Enhanced outline extraction with caching
    updateOutline: function() {
        const outline = document.getElementById('outline-tree');
        if (!outline || !IDE.state.activeTab) {
            outline.innerHTML = '<div style="padding:16px; color:var(--text-dim); font-size:12px; text-align:center;">No outline available</div>';
            return;
        }
        
        const path = IDE.state.activeTab;
        const content = this.read(path);
        const ext = Utils.getExtension(path);
        
        // Use cached outline if available and content hasn't changed
        const cacheKey = `outline_${path}_${Utils.hashString(content)}`;
        const cachedOutline = localStorage.getItem(cacheKey);
        
        if (cachedOutline) {
            // FIX-SEC-2: Sanitize cached HTML before inserting into DOM to prevent stored XSS.
            if (typeof window._sanitize === 'function') {
                outline.innerHTML = window._sanitize(cachedOutline);
            } else {
                const _tmp = document.createElement('div');
                _tmp.textContent = cachedOutline;
                outline.innerHTML = _tmp.innerHTML;
            }
            return;
        }
        
        outline.innerHTML = '';
        
        // Extract outline based on file type
        let outlineItems = [];
        
        switch (ext) {
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                outlineItems = this.extractJsOutline(content);
                break;
            case 'html':
                outlineItems = this.extractHtmlOutline(content);
                break;
            case 'css':
            case 'scss':
            case 'sass':
            case 'less':
                outlineItems = this.extractCssOutline(content);
                break;
            case 'py':
                outlineItems = this.extractPythonOutline(content);
                break;
            case 'vue':
                outlineItems = this.extractVueOutline(content);
                break;
            default:
                outline.innerHTML = '<div style="padding:16px; color:var(--text-dim); font-size:12px; text-align:center;">Outline not supported for this file type</div>';
                return;
        }
        
        if (outlineItems.length === 0) {
            outline.innerHTML = '<div style="padding:16px; color:var(--text-dim); font-size:12px; text-align:center;">No symbols found</div>';
            return;
        }
        
        // Render outline items
        outlineItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 't-item';
            div.style.padding = '4px 8px';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; padding:4px 8px;">
                    <i class="${item.icon}" style="color:${item.color || 'var(--primary)'}; font-size:11px;"></i>
                    <span style="font-size:11px; flex:1;">${item.name}</span>
                    <span style="font-size:10px; color:var(--text-dim);">${item.line}</span>
                </div>
            `;
            
            div.onclick = () => {
                const editor = EditorManager.getCurrentEditor();
                if (editor) {
                    editor.revealLineInCenter(item.line);
                    editor.setPosition({ lineNumber: item.line, column: 1 });
                    editor.focus();
                }
            };
            
            outline.appendChild(div);
        });
        
        // Cache the outline
        localStorage.setItem(cacheKey, outline.innerHTML);
    },
    
    // Extract Vue component outline
    extractVueOutline: function(content) {
        const items = [];
        const lines = content.split('\n');
        
        // Extract template tags
        let inTemplate = false;
        lines.forEach((line, index) => {
            if (line.includes('<template>')) inTemplate = true;
            if (line.includes('</template>')) inTemplate = false;
            
            if (inTemplate) {
                const tagMatch = line.match(/<(\w+)[^>]*>/);
                if (tagMatch) {
                    items.push({
                        type: 'tag',
                        name: tagMatch[1],
                        line: index + 1,
                        icon: 'fab fa-vuejs',
                        color: '#42b883'
                    });
                }
            }
        });
        
        // Extract script components
        lines.forEach((line, index) => {
            // Look for component definitions
            const componentMatch = line.match(/export\s+default\s+{\s*name:\s*['"]([^'"]+)['"]/);
            if (componentMatch) {
                items.push({
                    type: 'component',
                    name: componentMatch[1],
                    line: index + 1,
                    icon: 'fas fa-cube',
                    color: '#35495e'
                });
            }
            
            // Look for methods
            const methodMatch = line.match(/(\w+)\s*\([^)]*\)\s*{/);
            if (methodMatch && line.includes('methods:')) {
                items.push({
                    type: 'method',
                    name: methodMatch[1],
                    line: index + 1,
                    icon: 'fas fa-code',
                    color: '#61dafb'
                });
            }
        });
        
        return items;
    },
    
    // Enhanced JavaScript/TypeScript outline
    extractJsOutline: function(content) {
        const items = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Function declarations
            const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?(function\s+(\w+)|(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>|class\s+(\w+))/);
            if (funcMatch) {
                const name = funcMatch[4] || funcMatch[6] || funcMatch[8];
                const isClass = !!funcMatch[8]; // funcMatch[8] captures class name
                const isAsync = trimmed.includes('async');
                
                items.push({
                    type: isClass ? 'class' : 'function',
                    name: name,
                    line: index + 1,
                    icon: isClass ? 'fas fa-cube' : (isAsync ? 'fas fa-bolt' : 'fas fa-code'),
                    color: isClass ? '#f59e0b' : (isAsync ? '#8b5cf6' : '#61dafb')
                });
            }
            
            // React components
            const reactMatch = trimmed.match(/export\s+default\s+(function\s+(\w+)|(const|let|var)\s+(\w+)\s*=|class\s+(\w+))/);
            if (reactMatch) {
                const name = reactMatch[2] || reactMatch[4] || reactMatch[5];
                items.push({
                    type: 'component',
                    name: name,
                    line: index + 1,
                    icon: 'fab fa-react',
                    color: '#61dafb'
                });
            }
            
            // Imports
            const importMatch = trimmed.match(/^import\s+(.*?)\s+from/);
            if (importMatch) {
                items.push({
                    type: 'import',
                    name: importMatch[1],
                    line: index + 1,
                    icon: 'fas fa-download',
                    color: '#10b981'
                });
            }
            
            // Exports
            const exportMatch = trimmed.match(/^export\s+(const|let|var|function|class|default)\s+(\w+)/);
            if (exportMatch) {
                items.push({
                    type: 'export',
                    name: exportMatch[2],
                    line: index + 1,
                    icon: 'fas fa-upload',
                    color: '#f59e0b'
                });
            }
        });
        
        return items;
    },
    
    // Enhanced HTML outline
    extractHtmlOutline: function(content) {
        const items = [];
        const tagRegex = /<(\w+)[^>]*>/g;
        let match;
        
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            while ((match = tagRegex.exec(line)) !== null) {
                const tag = match[1];
                const idMatch = match[0].match(/id="([^"]*)"/);
                const classMatch = match[0].match(/class="([^"]*)"/);
                
                let name = tag;
                if (idMatch) name = `#${idMatch[1]}`;
                else if (classMatch) name = `.${classMatch[1].split(' ')[0]}`;
                
                items.push({
                    type: 'element',
                    name: name,
                    line: index + 1,
                    icon: 'fab fa-html5',
                    color: '#e34c26'
                });
            }
        });
        
        return items;
    },
    
    // Enhanced CSS outline
    extractCssOutline: function(content) {
        const items = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Selectors
            if (trimmed.endsWith('{') && !trimmed.startsWith('@')) {
                const selector = trimmed.slice(0, -1).trim();
                items.push({
                    type: 'selector',
                    name: selector,
                    line: index + 1,
                    icon: 'fab fa-css3',
                    color: '#264de4'
                });
            }
            
            // At-rules
            const atRuleMatch = trimmed.match(/^@(\w+)/);
            if (atRuleMatch) {
                items.push({
                    type: 'at-rule',
                    name: trimmed,
                    line: index + 1,
                    icon: 'fas fa-at',
                    color: '#8b5cf6'
                });
            }
        });
        
        return items;
    },
    
    // Enhanced Python outline
    extractPythonOutline: function(content) {
        const items = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Function definitions
            const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(/);
            if (funcMatch) {
                items.push({
                    type: 'function',
                    name: funcMatch[1],
                    line: index + 1,
                    icon: 'fas fa-code',
                    color: '#3776ab'
                });
            }
            
            // Class definitions
            const classMatch = trimmed.match(/^class\s+(\w+)/);
            if (classMatch) {
                items.push({
                    type: 'class',
                    name: classMatch[1],
                    line: index + 1,
                    icon: 'fas fa-cube',
                    color: '#f59e0b'
                });
            }
            
            // Imports
            const importMatch = trimmed.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/);
            if (importMatch) {
                items.push({
                    type: 'import',
                    name: importMatch[1] || importMatch[2],
                    line: index + 1,
                    icon: 'fas fa-download',
                    color: '#10b981'
                });
            }
        });
        
        return items;
    },
    
    // Update tab dirty state
    updateTabDirtyState: function() {
        document.querySelectorAll('.tab[data-path]').forEach(tab => {
            const path = tab.dataset.path;
            if (IDE.state.dirtyTabs.has(path)) {
                tab.classList.add('dirty');
            } else {
                tab.classList.remove('dirty');
            }
        });
    },
    
    // Enhanced create file prompt
    createFilePrompt: function(basePath = '') {
        const defaultPath = basePath || (IDE.state.activeTab ? 
            IDE.state.activeTab.split('/').slice(0, -1).join('/') + '/' : '');
        
        const fileName = prompt('Enter file name (with extension):', defaultPath + 'new-file.js');
        if (!fileName) return;
        
        if (!Utils.isValidFileName(fileName.split('/').pop())) {
            Utils.toast('Invalid file name', 'error');
            return;
        }
        
        const ext = Utils.getExtension(fileName);
        let content = '';
        
        // Enhanced default content based on file type
        const templates = {
            'js': `// ${fileName}
console.log(' Hello from ProCode IDE v3.0!');

// Your JavaScript code here
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Example usage
console.log(greet('World'));

// Export if needed
export { greet };`,
            
            'ts': `// ${fileName}
console.log(' Hello from ProCode IDE v3.0!');

// TypeScript interface
interface User {
  id: number;
  name: string;
  email: string;
}

// Your TypeScript code here
function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

// Example usage
const user: User = { id: 1, name: 'World', email: 'world@example.com' };
console.log(greet(user));

// Export if needed
export { greet, User };`,
            
            'jsx': `import React from 'react';

export default function ${fileName.replace('.jsx', '').split('/').pop()}() {
  return (
    <div>
      <h1>${fileName.replace('.jsx', '').split('/').pop()}</h1>
      <p>Your React component here</p>
    </div>
  );
}`,
            
            'tsx': `import React from 'react';

interface Props {
  // Define your props here
}

export default function ${fileName.replace('.tsx', '').split('/').pop()}({}: Props) {
  return (
    <div>
      <h1>${fileName.replace('.tsx', '').split('/').pop()}</h1>
      <p>Your React component with TypeScript here</p>
    </div>
  );
}`,
            
            'html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName.replace('.html', '')}</title>
    <link rel="stylesheet" href="style.css">
    <script src="app.js" defer><\/script>
</head>
<body>
    <h1>Welcome to ${fileName.replace('.html', '')}</h1>
    <p>Start building your amazing web application!</p>



</body>
</html>`,
            
            'css': `/* ${fileName} */
:root {
  --primary: #6366f1;
  --secondary: #8b5cf6;
  --background: #f8fafc;
  --text: #1e293b;
  --radius: 12px;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--background);
  color: var(--text);
  line-height: 1.6;
}

/* Your styles here */`,
            
            'py': `#!/usr/bin/env python3
"""
${fileName}
ProCode IDE - Python File
"""

import sys
import os

def main() -> int:
    """
    Main function
    """
    print(" Hello from Python!")
    print(f"File: {os.path.basename(__file__)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())`,
            
            'vue': `<template>
  <div>
    <h1>${fileName.replace('.vue', '')}</h1>
    <p>Your Vue component here</p>
  </div>
</template>

<script setup>
// Your Vue 3 composition API code here
const message = 'Hello from Vue 3!'
<\/script>

<style scoped>
/* Your component styles here */

</style>`
        };
        
        content = templates[ext] || `// ${fileName}
// Created with ProCode IDE v27.0
// Start writing your code here...`;
        
        this.write(fileName, content);
        this.refreshTree();
        TabManager.open(fileName);
        
        Utils.toast(`Created: ${fileName}`, 'success');
    },
    
    // Enhanced create folder prompt
    createFolderPrompt: function(basePath = '') {
        const folderName = prompt('Enter folder name:', basePath);
        if (!folderName) return;
        
        if (!Utils.isValidFileName(folderName)) {
            Utils.toast('Invalid folder name', 'error');
            return;
        }
        
        this.createFolder(folderName);
    },
    
    // Emit file change event
    emitFileChange: function(path, type) {
        const event = new CustomEvent('filechange', {
            detail: { path, type, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    },
    
    // Initialize file system event listeners
    initEventListeners: function() {
        window.addEventListener('filechange', (e) => {
            // Update UI or trigger actions based on file changes
            if(window.__PROCODE_DEBUG__) console.log('File changed:', e.detail);
        });
    }
};

// Initialize event listeners
FileSystem.initEventListeners();// ============================================
// ULTRA+ Import helpers (drag & drop / programmatic)