/**
 * runner.js
 * Runner — code execution (JS, TS, Python/Pyodide, etc.)
 * ProCode IDE v3.0
 */

// ============================================
// ENHANCED RUNNER (Code Execution)
// ============================================
const Runner = {
    currentProcess: null,
    isRunning: false,
    executionHistory: [],
    _iframeListenerAttached: false,
    
    exec: function(filePath = null) {
        this.execute(filePath);
    },
    
    execute: function(filePath = null) {
        // Token per-run to avoid cross-frame message noise
        this._previewToken = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const path = filePath || IDE.state.activeTab;
        if (!path) {
            Utils.toast('No file to run', 'error');
            return;
        }
        
        if (!FileSystem.exists(path)) {
            Utils.toast(`File not found: ${path}`, 'error');
            return;
        }
        
        const ext = Utils.getExtension(path);
        
        // Add to execution history
        this.executionHistory.push({
            path: path,
            timestamp: new Date().toISOString(),
            type: ext
        });
        
        // Keep only last 50 executions
        if (this.executionHistory.length > 50) {
            this.executionHistory.shift();
        }
        
        switch(ext) {
            // ── Web / Frontend ──
            case 'html': case 'htm': case 'xhtml':
            case 'css':
            case 'js': case 'mjs': case 'cjs':
            case 'jsx':
            case 'ts': case 'mts':
            case 'tsx':
            case 'vue':
            case 'svelte':
            case 'astro':
                this.runWeb(path);
                break;

            // ── Python (Pyodide in-browser) ──
            case 'py': case 'pyw': case 'pyi':
                this.runPython(path);
                break;

            // ── JavaScript / TypeScript via terminal ─���
            case 'mjs': case 'cjs':
                this.runNode(path);
                break;

            // ── Compiled / interpreted via sandbox ──
            case 'java':
            case 'cpp': case 'cc': case 'cxx':
            case 'c': case 'h':
            case 'cs':
            case 'rs':
            case 'go':
            case 'swift':
            case 'kt': case 'kts':
            case 'rb':
            case 'php':
            case 'lua':
            case 'pl':
            case 'r':
            case 'scala':
            case 'groovy':
            case 'dart':
            case 'ex': case 'exs':
            case 'hs':
            case 'jl':
            case 'coffee':
            case 'nim': case 'zig': case 'v': case 'crystal': case 'odin':
                this.runSandbox(path, ext);
                break;

            // ── Shell scripts ──
            case 'sh': case 'bash': case 'zsh':
                this.runShell(path);
                break;

            // ── SQL ──
            case 'sql': case 'mysql': case 'pgsql':
                this.runSQL(path);
                break;

            // ── JSON pretty-print ──
            case 'json': case 'jsonc': case 'json5':
                this.runJSON(path);
                break;

            // ── Markdown preview ──
            case 'md': case 'markdown': case 'mdx':
                if (window.MarkdownPreview) MarkdownPreview.toggle();
                else this.runMarkdown(path);
                break;

            default:
                Utils.toast(`▶ Cannot run .${ext} — use Terminal to execute`, 'warn');
        }
    },
    
    runWeb: function(path) {
        this.isRunning = true;
        this.lastInlineWarnings = [];
        
        // Show preview panel
        LayoutManager.toggleLayout('preview', true);
        
        const frame = document.getElementById('preview-frame');
        const isHtml = path.endsWith('.html');
        
        let html = '';
        
        if (isHtml) {
            html = FileSystem.read(path);
            html = this.inlineHtmlAssets(html, path);
            html = this.inlineHtmlModules(html, path);
            html = this.injectPreviewBridge(html);
        } else {
            html = this.createHtmlWrapper(path);
        }
        
        // Set iframe source
        frame.srcdoc = html;
        frame.onload = () => {
            this.updateRunButton(false);
        };
        
        // Update console
        Console.clear();
        if (this.lastInlineWarnings && this.lastInlineWarnings.length) {
            this.lastInlineWarnings.forEach((message) => Console.warn(message));
        }
        Console.info(` Running ${path.split('/').pop()}...`);
        Console.info(` File: ${path}`);
        Console.info(` Preview opened in panel`);
        Console.info('-'.repeat(50));
        
        // Listen for console messages from iframe
        if (!this._iframeListenerAttached) {
            window.addEventListener('message', this.handleIframeMessage.bind(this));
            this._iframeListenerAttached = true;
        }
        
        Utils.toast('Running web application', 'success');
        
        // Update run button
        this.updateRunButton(true);
    },
    
    handleIframeMessage: function(event) {
        const frame = document.getElementById('preview-frame');
        if (frame && event.source !== frame.contentWindow) {
            return;
        }
        
        const data = event.data;
        if (!data || typeof data !== 'object') {
            return;
        }
        
        // Ignore messages from old/foreign frames
        if (Runner._previewToken && data.token !== Runner._previewToken) {
            return;
        }
        
        if (data.type === 'console') {
            const level = data.level || 'log';
            const args = Array.isArray(data.args) ? data.args : [data.args];
            Console.append(level, args);
            return;
        }
        
        if (data.type === 'load') {
            if (data.executionTime) {
                Console.info(`Execution time: ${data.executionTime}ms`);
            } else {
                Console.info('Preview loaded');
            }
            Runner.updateRunButton(false);
        }
    },
    
    inlineHtmlAssets: function(html, htmlPath) {
        this.lastInlineWarnings = [];
        const baseDir = htmlPath.includes('/') ? htmlPath.slice(0, htmlPath.lastIndexOf('/')) : '';
        const isRemote = (url) => /^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('mailto:') || url.startsWith('tel:');
        const hasModuleSyntax = (code) => this.hasModuleSyntax(code);
        const normalizePath = (path) => {
            const parts = path.split('/').filter(Boolean);
            const stack = [];
            for (const part of parts) {
                if (part === '.') continue;
                if (part === '..') {
                    stack.pop();
                } else {
                    stack.push(part);
                }
            }
            return stack.join('/');
        };
        const resolvePath = (url) => {
            if (url.startsWith('/')) return normalizePath(url.slice(1));
            if (!baseDir) return normalizePath(url);
            return normalizePath(`${baseDir}/${url}`);
        };
        const readSafe = (filePath) => {
            try {
                return FileSystem.read(filePath);
            } catch (_) {
                return null;
            }
        };
        const warn = (message) => {
            this.lastInlineWarnings.push(message);
        };

        let updated = html;

        // Inline url(...) assets inside CSS when those assets exist as data: URLs in FileSystem
        const resolveFromDir = (dir, url) => {
            if (url.startsWith('/')) return normalizePath(url.slice(1));
            if (!dir) return normalizePath(url);
            return normalizePath(`${dir}/${url}`);
        };

        const dataUrlForUrl = (rawUrl, dirForRel = baseDir) => {
            const href = String(rawUrl || '').trim();
            if (!href || href.startsWith('#') || isRemote(href)) return null;
            const clean = href.split('#')[0].split('?')[0].trim();
            if (!clean) return null;
            const filePath = resolveFromDir(dirForRel, clean);
            const content = readSafe(filePath);
            if (typeof content !== 'string') return null;
            if (content.startsWith('data:')) return content;
            // Allow plain SVG markup stored as text
            if (filePath.toLowerCase().endsWith('.svg')) {
                const t = content.trim();
                if (t.startsWith('<svg')) {
                    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`;
                }
            }
            return null;
        };

        const inlineCssUrls = (cssText, cssPath) => {
            const cssDir = cssPath && cssPath.includes('/') ? cssPath.slice(0, cssPath.lastIndexOf('/')) : baseDir;
            return String(cssText || '').replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
                const du = dataUrlForUrl(u, cssDir);
                return du ? `url("${du}")` : m;
            });
        };

        const rewriteSrcSet = (srcset, dirForRel) => {
            if (!srcset) return srcset;
            return srcset.split(',')
                .map(part => {
                    const trimmed = part.trim();
                    if (!trimmed) return trimmed;
                    const bits = trimmed.split(/\s+/);
                    const url = bits[0];
                    const du = dataUrlForUrl(url, dirForRel);
                    if (du) bits[0] = du;
                    return bits.join(' ');
                })
                .join(', ');
        };


        updated = updated.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (match) => {
            const hrefMatch = match.match(/href=["']([^"']+)["']/i);
            if (!hrefMatch) return match;
            const href = hrefMatch[1].trim();
            const cleanHref = href.split('#')[0].split('?')[0];
            if (!cleanHref || href.startsWith('#') || isRemote(href)) return match;

            const filePath = resolvePath(cleanHref);
            const css = readSafe(filePath);
            if (css === null) {
                warn(`Missing stylesheet: ${filePath}`);
                return '';
            }

            const inlinedCss = inlineCssUrls(css, filePath);
            const safeCss = inlinedCss.replace(/<\/style>/gi, '<\\/style>');
            return `<style data-inline="${filePath}">\n${safeCss}\n
</style>`;
        });

        updated = updated.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (match, before, src, after) => {
            const href = src.trim();
            const cleanHref = href.split('#')[0].split('?')[0];
            if (!cleanHref || href.startsWith('#') || isRemote(href)) return match;

            const filePath = resolvePath(cleanHref);
            const js = readSafe(filePath);
            if (js === null) {
                warn(`Missing script: ${filePath}`);
                return '';
            }
            const ext = Utils.getExtension(filePath);
            // Allow TS/TSX/JSX in preview (best-effort transpile)
            if (ext && !['js', 'mjs', 'ts', 'tsx', 'jsx'].includes(ext)) {
                warn(`Unsupported script type for preview: ${filePath}. Use a bundler or UMD template.`);
                return '';
            }

            const attrsRaw = `${before} ${after}`;
            const isModule = /\btype=["']module["']/.test(attrsRaw);

            // Transpile for preview when needed
            let scriptBody = js;
            try {
                if (ext === 'ts' && window.ts && ts.transpileModule) {
                    scriptBody = ts.transpileModule(js, {
                        compilerOptions: {
                            target: ts.ScriptTarget.ES2020,
                            module: ts.ModuleKind.ESNext
                        }
                    }).outputText;
                } else if (ext === 'tsx' && window.ts && ts.transpileModule) {
                    // TS compiler can transpile TSX (React)
                    scriptBody = ts.transpileModule(js, {
                        compilerOptions: {
                            target: ts.ScriptTarget.ES2020,
                            module: ts.ModuleKind.ESNext,
                            jsx: ts.JsxEmit.ReactJSX
                        }
                    }).outputText;
                } else if ((ext === 'tsx' || ext === 'jsx') && window.Babel && Babel.transform) {
                    const presets = [];
                    if (ext === 'tsx') presets.push('typescript');
                    presets.push('react');
                    scriptBody = Babel.transform(js, { presets }).code;
                }
            } catch (e) {
                warn(`Transpile failed for ${filePath}: ${e && e.message ? e.message : e}`);
                scriptBody = js;
            }

            const needsModule = isModule || hasModuleSyntax(scriptBody);

            // ✅ Keep ESM module syntax; we'll fix relative imports + inject import map later (inlineHtmlModules)
            const safeJs = scriptBody.replace(/<\/script>/gi, '<\\/script>');
            let attrs = attrsRaw.replace(/\bsrc=["'][^"']+["']/i, '');

            if (needsModule) {
                // Ensure module type is present
                if (!/\btype=["']module["']/.test(attrs)) {
                    attrs = (attrs + ' type="module"').trim();
                } else {
                    attrs = attrs.trim();
                }
            } else {
                // Remove accidental module flag for classic scripts
                attrs = attrs.replace(/\btype=["']module["']\b/i, '').trim();
            }

            const attrText = attrs ? ` ${attrs}` : '';
            const pcSrc = needsModule ? ` data-pc-src="${filePath}"` : '';
            return `<script data-inline="${filePath}"${pcSrc}${attrText}>\n${safeJs}\n<\/script>`;
        });

        updated = updated.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
            if (/\bsrc=["']/.test(attrs) || /\bdata-inline=/.test(attrs)) {
                return match;
            }
            const isModule = /\btype=["']module["']/.test(attrs);
            const code = body.trim();
            if (!code) return match;
            if (!isModule && !hasModuleSyntax(code)) return match;

            const stripped = this.stripModuleSyntax(code);
            stripped.warnings.forEach((message) => warn(message));
            const cleaned = stripped.code.trim();
            if (!cleaned) {
                warn('Removed inline module script from preview');
                return '';
            }
            if (hasModuleSyntax(cleaned)) {
                warn('Inline module script still contains imports/exports');
                return '';
            }

            let newAttrs = attrs;
            if (isModule) {
                newAttrs = newAttrs.replace(/\btype=["']module["']\b/i, '');
            }
            newAttrs = newAttrs.trim();
            const attrText = newAttrs ? ` ${newAttrs}` : '';
            const safeBody = cleaned.replace(/<\/script>/gi, '<\\/script>');
            return `<script${attrText}>\n${safeBody}\n<\/script>`;
        });

        // Inline local asset URLs for images/fonts/media when stored as data URLs in FileSystem
        updated = updated.replace(/<img\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi, (m, b, src, a) => {
            const du = dataUrlForUrl(src, baseDir);
            return du ? `<img${b}src="${du}"${a}>` : m;
        });
        updated = updated.replace(/<img\b([^>]*)\bsrcset=["']([^"']+)["']([^>]*)>/gi, (m, b, srcset, a) => {
            const next = rewriteSrcSet(srcset, baseDir);
            return next ? `<img${b}srcset="${next}"${a}>` : m;
        });
        updated = updated.replace(/<source\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi, (m, b, src, a) => {
            const du = dataUrlForUrl(src, baseDir);
            return du ? `<source${b}src="${du}"${a}>` : m;
        });
        updated = updated.replace(/<source\b([^>]*)\bsrcset=["']([^"']+)["']([^>]*)>/gi, (m, b, srcset, a) => {
            const next = rewriteSrcSet(srcset, baseDir);
            return next ? `<source${b}srcset="${next}"${a}>` : m;
        });
        updated = updated.replace(/<(audio|video)\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi, (m, tag, b, src, a) => {
            const du = dataUrlForUrl(src, baseDir);
            return du ? `<${tag}${b}src="${du}"${a}>` : m;
        });
        updated = updated.replace(/<link\b([^>]*)\bhref=["']([^"']+)["']([^>]*)>/gi, (m, b, href, a) => {
            // Avoid touching stylesheet (already handled above) and remote URLs
            if (/\brel=["']?stylesheet["']?/i.test(m)) return m;
            const relMatch = m.match(/\brel=["']([^"']+)["']/i);
            const rel = (relMatch ? relMatch[1] : '').toLowerCase();
            const isIcon = rel.includes('icon');
            const isPreloadAsset = rel === 'preload' && /\bas=["']?(font|image|audio|video)["']?/i.test(m);
            const isManifest = rel === 'manifest';
            if (!(isIcon || isPreloadAsset || isManifest)) return m;
            const du = dataUrlForUrl(href, baseDir);
            return du ? `<link${b}href="${du}"${a}>` : m;
        });

        return updated;
    },

    inlineHtmlModules: function(html, htmlPath) {
        // Add real ESM support inside srcdoc previews:
        // - Rewrite relative import specifiers to absolute "/path" based on module file location
        // - Inject an import map that maps "/path" -> data:text/javascript URL of that file
        // Works for local project modules (JS/MJS/TS/TSX/JSX) without bundlers (best-effort).
        try {
            const src = String(html || '');
            if (!/\btype=["']module["']/.test(src)) return src;

            const baseDir = htmlPath && htmlPath.includes('/') ? htmlPath.slice(0, htmlPath.lastIndexOf('/')) : '';
            const isRemote = (u) => /^(https?:)?\/\//i.test(String(u||'')) || String(u||'').startsWith('data:') || String(u||'').startsWith('blob:');

            const normalizePath = (p) => {
                const parts = String(p || '').split('/').filter(Boolean);
                const stack = [];
                for (const part of parts) {
                    if (part === '.') continue;
                    if (part === '..') stack.pop();
                    else stack.push(part);
                }
                return stack.join('/');
            };

            const dirOf = (p) => (p && p.includes('/')) ? p.slice(0, p.lastIndexOf('/')) : '';
            const resolveFromDir = (dir, u) => {
                const url = String(u || '').trim();
                if (url.startsWith('/')) return normalizePath(url.slice(1));
                if (!dir) return normalizePath(url);
                return normalizePath(`${dir}/${url}`);
            };

            const readSafe = (filePath) => {
                try { return FileSystem.read(filePath); } catch { return null; }
            };

            const existsSafe = (filePath) => {
                try { return FileSystem.exists(filePath); } catch { return false; }
            };

            const asDataUrlJS = (code) => `data:text/javascript;charset=utf-8,${encodeURIComponent(String(code || ''))}`;

            const compileForModule = (path, content) => {
                const ext = Utils.getExtension(path);
                let js = String(content || '');
                try {
                    if (ext === 'ts' && window.ts && ts.transpileModule) {
                        js = ts.transpileModule(js, {
                            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
                        }).outputText;
                    } else if (ext === 'tsx' && window.ts && ts.transpileModule) {
                        js = ts.transpileModule(js, {
                            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
                        }).outputText;
                    } else if ((ext === 'tsx' || ext === 'jsx') && window.Babel && Babel.transform) {
                        const presets = [];
                        if (ext === 'tsx') presets.push('typescript');
                        presets.push('react');
                        js = Babel.transform(js, { presets }).code;
                    }
                } catch (e) {
                    // keep original
                    try { Runner.lastInlineWarnings.push(`Module transpile failed: ${path}: ${e && e.message ? e.message : e}`); } catch {}
                }
                return js;
            };

            const resolveSpec = (spec, fromPath) => {
                const s = String(spec || '').trim();
                if (!s || s.startsWith('#') || isRemote(s)) return s;

                // Leave bare specifiers alone (react, lodash, etc.)
                const isRelative = s.startsWith('./') || s.startsWith('../');
                const isAbs = s.startsWith('/');
                if (!isRelative && !isAbs) return s;

                const fromDir = dirOf(fromPath || '');
                let candidate = resolveFromDir(isAbs ? '' : fromDir, s);
                // best-effort extension resolution
                const candidates = [candidate, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.jsx`, `${candidate}/index.js`, `${candidate}/index.ts`, `${candidate}/index.tsx`];
                for (const c of candidates) {
                    if (existsSafe(c)) {
                        candidate = c;
                        break;
                    }
                }
                return '/' + candidate.replace(/^\/+/, '');
            };

            const rewriteImports = (code, fromPath) => {
                let out = String(code || '');

                // import ... from "x" / export ... from "x"
                out = out.replace(/\b(import|export)\s+([^'"]*?)\sfrom\s*(['"])([^'"]+)\3/g, (m, kw, mid, q, spec) => {
                    const r = resolveSpec(spec, fromPath);
                    return `${kw} ${mid} from ${q}${r}${q}`;
                });

                // import "x"
                out = out.replace(/\bimport\s*(['"])([^'"]+)\1/g, (m, q, spec) => {
                    const r = resolveSpec(spec, fromPath);
                    return `import ${q}${r}${q}`;
                });

                // dynamic import("x")
                out = out.replace(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g, (m, q, spec) => {
                    const r = resolveSpec(spec, fromPath);
                    return `import(${q}${r}${q})`;
                });

                return out;
            };

            // Build import map for all local module-like files
            const allPaths = Object.keys(IDE.state.files || {});
            const moduleLike = allPaths.filter(p => /\.(mjs|js|ts|tsx|jsx)$/i.test(p));
            const imports = {};

            for (const p of moduleLike) {
                const raw = readSafe(p);
                if (typeof raw !== 'string') continue;
                // Skip binary data URLs that are not JS
                if (raw.startsWith('data:') && !/^data:(text|application)\/(javascript|ecmascript)/i.test(raw)) continue;

                let code = raw;
                if (code.startsWith('data:')) {
                    // Keep as-is; assume it's already a usable JS data URL
                    imports['/' + p.replace(/^\/+/, '')] = code;
                    continue;
                }

                code = compileForModule(p, code);
                code = rewriteImports(code, p);

                imports['/' + p.replace(/^\/+/, '')] = asDataUrlJS(code);
            }

            const importMapJson = JSON.stringify({ imports });

            const injectImportMap = (h) => {
                if (!importMapJson || importMapJson.length < 20) return h;
                // Insert right after <head ...>
                const headOpen = h.match(/<head\b[^>]*>/i);
                if (headOpen) {
                    const idx = headOpen.index + headOpen[0].length;
                    return h.slice(0, idx) + `\n<script type="importmap">${importMapJson}<\/script>\n` + h.slice(idx);
                }
                // If no head tag, prepend
                return `<head><script type="importmap">${importMapJson}<\/script></head>\n` + h;
            };

            let outHtml = src;

            // Inline <script type="module" src="..."> so it doesn't try to fetch in srcdoc
            outHtml = outHtml.replace(/<script\b([^>]*\btype=["']module["'][^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
                (m, before, srcUrl, after) => {
                    const href = String(srcUrl || '').trim();
                    if (!href || isRemote(href) || href.startsWith('#')) return m;

                    const filePath = resolveFromDir(baseDir, href.split('#')[0].split('?')[0]);
                    const raw = readSafe(filePath);
                    if (raw === null) {
                        try { Runner.lastInlineWarnings.push(`Missing module script: ${filePath}`); } catch {}
                        return '';
                    }

                    let code = String(raw || '');
                    if (!code.startsWith('data:')) {
                        code = compileForModule(filePath, code);
                        code = rewriteImports(code, filePath);
                    } else {
                        // If it's a JS data URL, just keep as-is by inlining a redirect import
                        return `<script type="module">import("${'/' + filePath.replace(/^\/+/, '')}")<\/script>`;
                    }

                    const safe = code.replace(/<\/script>/gi, '<\\\\/script>');
                    // keep other attrs besides src
                    let attrs = `${before} ${after}`.replace(/\bsrc=["'][^"']+["']/i, '').trim();
                    if (!/\btype=["']module["']/.test(attrs)) attrs = (attrs + ' type="module"').trim();
                    const attrText = attrs ? ` ${attrs}` : '';
                    return `<script data-pc-src="${filePath}"${attrText}>\n${safe}\n<\/script>`;
                });

            // Rewrite inline module blocks (relative imports -> absolute)
            outHtml = outHtml.replace(/<script\b([^>]*\btype=["']module["'][^>]*)>([\s\S]*?)<\/script>/gi,
                (m, attrs, body) => {
                    // Skip the import map itself
                    if (/\btype=["']importmap["']/.test(attrs)) return m;
                    const from = (attrs.match(/\bdata-pc-src=["']([^"']+)["']/i) || [])[1] || htmlPath;
                    let code = String(body || '');
                    // don't touch JS data URL redirect snippets
                    if (code.includes('PROCODE_PREVIEW_BRIDGE')) return m;
                    code = rewriteImports(code, from);
                    const safe = code.replace(/<\/script>/gi, '<\\\\/script>');
                    return `<script${attrs}>\n${safe}\n<\/script>`;
                });

            // Inject import map at the end so it appears before module scripts in DOM order
            outHtml = injectImportMap(outHtml);

            // Warn about common bare imports that won't resolve without bundlers
            try {
                const bare = [];
                for (const p of moduleLike) {
                    const c = readSafe(p);
                    if (!c || typeof c !== 'string' || c.startsWith('data:')) continue;
                    const rx = /\bimport\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
                    let mm;
                    while ((mm = rx.exec(c))) {
                        const s = mm[1];
                        if (s && !s.startsWith('.') && !s.startsWith('/') && !isRemote(s) && !s.startsWith('#')) bare.push({ p, s });
                        if (bare.length > 20) break;
                    }
                    if (bare.length > 20) break;
                }
                if (bare.length) {
                    Runner.lastInlineWarnings.push(`Bare module imports won't resolve in srcdoc (needs bundler): ` + bare.slice(0, 6).map(x => `${x.s} in ${x.p}`).join(', '));
                }
            } catch {}

            return outHtml;
        } catch (e) {
            try { this.lastInlineWarnings.push(`ESM preview failed: ${e && e.message ? e.message : e}`); } catch {}
            return String(html || '');
        }
    },


    hasModuleSyntax: function(code) {
        return (
            /^\s*(import\s+|export\s+)/m.test(code) ||
            /\brequire\s*\(/.test(code) ||
            /\bmodule\.exports\b/.test(code) ||
            /\bexports\./.test(code)
        );
    },

// Thay thế trong Runner object
stripModuleSyntax: function(code) {
    const warnings = [];
    const lines = code.split(/\r?\n/);
    const kept = [];
    let inMultilineImport = false;
    let inMultilineExport = false;
    let multilineBuffer = '';
    let braceCount = 0;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Handle multiline imports
        if (inMultilineImport) {
            multilineBuffer += ' ' + trimmed;
            
            // Count braces để detect end
            braceCount += (trimmed.match(/{/g) || []).length;
            braceCount -= (trimmed.match(/}/g) || []).length;
            
            if (braceCount === 0 && (trimmed.includes(';') || trimmed.includes('from'))) {
                inMultilineImport = false;
                warnings.push(`Stripped multiline import: ${multilineBuffer.substring(0, 60)}...`);
                multilineBuffer = '';
            }
            return;
        }
        
        // Handle multiline exports
        if (inMultilineExport) {
            multilineBuffer += ' ' + trimmed;
            braceCount += (trimmed.match(/{/g) || []).length;
            braceCount -= (trimmed.match(/}/g) || []).length;
            
            if (braceCount === 0) {
                inMultilineExport = false;
                warnings.push(`Stripped multiline export: ${multilineBuffer.substring(0, 60)}...`);
                multilineBuffer = '';
            }
            return;
        }
        
        // Import statements - IMPROVED DETECTION
        if (/^\s*import\s/.test(trimmed)) {
            // Check if complete statement
            if (!trimmed.includes(';') && !trimmed.includes('from') && trimmed.includes('{')) {
                inMultilineImport = true;
                multilineBuffer = trimmed;
                braceCount = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
            } else {
                warnings.push(`Stripped import: ${trimmed.substring(0, 60)}${trimmed.length > 60 ? '...' : ''}`);
            }
            return;
        }
        
        // Dynamic imports - KEEP THEM (they can work in browser)
        if (/import\s*\(/.test(trimmed)) {
            warnings.push(`Dynamic import detected (kept): ${trimmed.substring(0, 60)}...`);
            kept.push(line);
            return;
        }
        
        // Export default - IMPROVED
        if (/^\s*export\s+default\s+/.test(trimmed)) {
            const match = trimmed.match(/^\s*export\s+default\s+(class|function|const|let|var)\s+(\w+)/);
            if (match) {
                warnings.push(`Converted export default ${match[1]}: ${match[2]}`);
                kept.push(line.replace(/^\s*export\s+default\s+/, ''));
            } else if (/^\s*export\s+default\s+{/.test(trimmed)) {
                // Export default object
                warnings.push(`Stripped export default object`);
                const replaced = line.replace(/^\s*export\s+default\s+/, 'const __default_export__ = ');
                kept.push(replaced);
            } else {
                warnings.push(`Stripped export default: ${trimmed}`);
                kept.push(line.replace(/^\s*export\s+default\s+/, 'const __default_export__ = '));
            }
            return;
        }
        
        // Export lists
        if (/^\s*export\s+{/.test(trimmed)) {
            if (!trimmed.includes('}')) {
                inMultilineExport = true;
                multilineBuffer = trimmed;
                braceCount = 1;
            } else {
                warnings.push(`Stripped export list: ${trimmed}`);
            }
            return;
        }
        
        // Named exports
        if (/^\s*export\s+(const|let|var|function|class|async\s+function)\s+/.test(trimmed)) {
            warnings.push(`Stripped export keyword from: ${trimmed.substring(0, 60)}`);
            kept.push(line.replace(/^\s*export\s+/, ''));
            return;
        }
        
        // Re-exports (export ... from ...)
        if (/^\s*export\s+.*\s+from\s+/.test(trimmed)) {
            warnings.push(`Stripped re-export: ${trimmed}`);
            return;
        }
        
        // CommonJS - IMPROVED DETECTION
        if (/\b(require\s*\(|module\.exports|exports\.)/.test(trimmed)) {
            // Check if it's in a comment
            if (/^\s*(\/\/|\/\*)/.test(trimmed)) {
                kept.push(line);
                return;
            }
            
            if (/module\.exports\s*=/.test(trimmed) || /exports\.\w+\s*=/.test(trimmed)) {
                warnings.push(`Removed module.exports: ${trimmed}`);
                return;
            }
            
            if (/\brequire\s*\(/.test(trimmed)) {
                warnings.push(`Removed require() call: ${trimmed}`);
                return;
            }
        }
        
        kept.push(line);
    });

    return { 
        code: kept.join('\n'), 
        warnings: warnings,
        hasRemainingModuleSyntax: this.hasModuleSyntax(kept.join('\n'))
    };
},

    injectPreviewBridge: function(html) {
        try {
            if (!html || typeof html !== 'string') return html;
            if (html.includes('PROCODE_PREVIEW_BRIDGE')) return html;

            const tokenJson = JSON.stringify(this._previewToken || '');
            const bridge = `
<script>
/* PROCODE_PREVIEW_BRIDGE */
(function(){
  const PREVIEW_TOKEN = ${tokenJson};
  function safe(v){
    try{
      if (typeof v === 'string') return v;
      if (v instanceof Error) return v.name + ': ' + v.message;
      return JSON.stringify(v);
    }catch(e){
      try { return String(v); } catch (_) { return '[Unserializable]'; }
    }
  }
  function send(level, args){
    try{
      window.parent.postMessage({
        token: PREVIEW_TOKEN,
        type: 'console',
        level: level,
        args: (args || []).map(safe)
      }, '*');
    }catch(e){}
  }
  const native = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  ['log','warn','error','info'].forEach(level=>{
    console[level] = function(...args){
      try { native[level].apply(console, args); } catch(e){}
      send(level, args);
    };
  });
  window.addEventListener('error', (e) => {
    send('error', [e.message || 'Error', { filename: e.filename, lineno: e.lineno, colno: e.colno }]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    send('error', ['Unhandled Promise Rejection', e.reason]);
  });
  // --- Inspector support (parent <-> iframe) ---
  let __pc_inspector_on = false;
  let __pc_hl = null;
  function __pc_cssEscape(x){ return String(x||'').replace(/[^a-zA-Z0-9_-]/g,''); }
  function __pc_selector(el){
    try{
      if (!el || el.nodeType !== 1) return '';
      if (el.id) return '#' + __pc_cssEscape(el.id) || ('#' + el.id);
      const parts=[];
      let cur = el;
      while(cur && cur.nodeType===1 && parts.length<7){
        let sel = cur.tagName.toLowerCase();
        const cls = cur.classList ? Array.from(cur.classList).slice(0,3).map(__pc_cssEscape).filter(Boolean) : [];
        if (cls.length) sel += '.' + cls.join('.');
        const p = cur.parentElement;
        if (p){
          const same = Array.from(p.children).filter(n => n.tagName === cur.tagName);
          if (same.length > 1) sel += ':nth-of-type(' + (same.indexOf(cur)+1) + ')';
        }
        parts.unshift(sel);
        cur = p;
      }
      return parts.join(' > ');
    }catch(e){ return ''; }
  }
  function __pc_highlight(el){
    try{
      if (!el || el.nodeType !== 1) return;
      if (!__pc_hl){
        __pc_hl = document.createElement('div');
        __pc_hl.id = '__procode_inspector_hl__';
        __pc_hl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #6366f1;background:rgba(99,102,241,0.12);border-radius:4px;box-sizing:border-box;';
        document.documentElement.appendChild(__pc_hl);
      }
      const r = el.getBoundingClientRect();
      __pc_hl.style.left = r.left + 'px';
      __pc_hl.style.top = r.top + 'px';
      __pc_hl.style.width = Math.max(0, r.width) + 'px';
      __pc_hl.style.height = Math.max(0, r.height) + 'px';
    }catch(e){}
  }
  function __pc_info(el){
    try{
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const attrs = {};
      try { for (const a of Array.from(el.attributes||[])) { if (a && a.name) attrs[a.name]=a.value; } } catch(_){}
      return {
        tag: el.tagName.toLowerCase(),
        selector: __pc_selector(el),
        text: (el.innerText || el.textContent || '').trim().slice(0, 500),
        html: (el.outerHTML || '').slice(0, 2000),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        styles: {
          display: cs.display,
          position: cs.position,
          color: cs.color,
          background: cs.backgroundColor,
          font: cs.font,
          margin: cs.margin,
          padding: cs.padding
        },
        attrs
      };
    }catch(e){ return { error: String(e) }; }
  }
  function __pc_onClick(e){
    if(!__pc_inspector_on) return;
    try{
      e.preventDefault(); e.stopPropagation();
      const el = e.target;
      __pc_highlight(el);
      window.parent.postMessage({ token: PREVIEW_TOKEN, type: 'inspector', payload: __pc_info(el) }, '*');
    }catch(err){}
  }
  function __pc_onMove(e){
    if(!__pc_inspector_on) return;
    try{ __pc_highlight(e.target); } catch(_){}
  }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object' || d.token !== PREVIEW_TOKEN) return;
    if (d.type === 'inspector-toggle') {
      __pc_inspector_on = !!d.enabled;
      try { document.documentElement.style.cursor = __pc_inspector_on ? 'crosshair' : ''; } catch(_){}
      if (__pc_inspector_on) {
        window.addEventListener('click', __pc_onClick, true);
        window.addEventListener('mousemove', __pc_onMove, true);
      } else {
        window.removeEventListener('click', __pc_onClick, true);
        window.removeEventListener('mousemove', __pc_onMove, true);
      }
      try { window.parent.postMessage({ token: PREVIEW_TOKEN, type: 'inspector', payload: { enabled: __pc_inspector_on } }, '*'); } catch(_){}
    }
    if (d.type === 'inspect-selector' && d.selector) {
      try { const el = document.querySelector(d.selector); if (el) __pc_highlight(el); } catch(_){}
    }
  });
  window.addEventListener('load', () => {
    try {
      window.parent.postMessage({ token: PREVIEW_TOKEN, type: 'load', executionTime: 0 }, '*');
    } catch(e){}
  });
})();
<\/script>
`;
            if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, bridge + '</body>');
            if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, bridge + '</html>');
            return html + bridge;
        } catch (e) {
            return html;
        }
    },

    createHtmlWrapper: function(path) {
        const fileName = path.split('/').pop();
        const content = FileSystem.read(path);
        const ext = Utils.getExtension(path);
        
        let processedCode = content;
        let additionalScripts = '';
        let additionalStyles = '';
        const moduleWarning = (label) =>
            'console.error("Module imports/exports detected in ' + label + '. The preview cannot resolve modules. Use a UMD template or run a bundler.");';
        const indentLines = (value, spaces) => value
            .split('\n')
            .map(line => ' '.repeat(spaces) + line)
            .join('\n');
        
        // Process based on file type
        switch (ext) {
            case 'jsx':
            case 'tsx':
                try {
                    const babelPresets = ext === 'tsx'
                        ? [['env', { modules: false }], 'react', ['typescript', { isTSX: true, allExtensions: true }]]
                        : [['env', { modules: false }], 'react'];
                    if (!window.Babel) throw new Error('Babel not loaded — check your internet connection');
                    processedCode = Babel.transform(content, {
                        presets: babelPresets,
                        filename: path
                    }).code;
                    additionalScripts = '<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>\n' +
                                       '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>';
                } catch (error) {
                    Console.error(`JSX Transpilation Error: ${error.message}`);
                    processedCode = `console.error("JSX Transpilation Error: ${error.message}");`;
                }
                break;
                
            case 'ts':
                try {
                    if (!window.ts) throw new Error('TypeScript compiler not loaded — check your internet connection');
                    processedCode = ts.transpileModule(content, {
                        compilerOptions: {
                            target: ts.ScriptTarget.ES2020,
                            module: ts.ModuleKind.None
                        }
                    }).outputText;
                } catch (error) {
                    Console.error(`TypeScript Compilation Error: ${error.message}`);
                    processedCode = `console.error("TypeScript Compilation Error: ${error.message}");`;
                }
                break;
                
            case 'css': {
                const safeCss = content.replace(/<\/style>/gi, '<\\/style>');
                additionalStyles = `<style>\n${safeCss}\n
</style>`;
                processedCode = '';
                break;
            }

            case 'vue':
                try {
                    // Simple Vue template compilation
                    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
                    const scriptTagMatch = content.match(/<script([^>]*)>([\s\S]*?)<\/script>/i);
                    const styleMatch = content.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/);
                    
                    additionalScripts = '<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>';
                    
                    const template = templateMatch ? templateMatch[1].trim() : '';
                    const scriptAttrs = scriptTagMatch ? scriptTagMatch[1] : '';
                    let script = scriptTagMatch ? scriptTagMatch[2].trim() : '';
                    const isSetup = /\bsetup\b/i.test(scriptAttrs);
                    const isTs = /\blang=['"]ts['"]/i.test(scriptAttrs);
                    const vueImports = new Set();
                    const warnings = [];
                    const bindingNames = new Set();

                    if (script) {
                        const scriptLines = script.split(/\r?\n/);
                        const keptLines = [];
                        scriptLines.forEach((line) => {
                            const trimmed = line.trim();
                            const vueNamedImport = trimmed.match(/^import\s+{([^}]+)}\s+from\s+['"]vue['"];?$/);
                            if (vueNamedImport) {
                                vueNamedImport[1].split(',').forEach((name) => {
                                    const clean = name.trim().split(' as ')[0];
                                    if (clean) vueImports.add(clean);
                                });
                                return;
                            }
                            if (/^import\s+[A-Za-z_$][\w$]*\s+from\s+['"]vue['"];?$/.test(trimmed)) {
                                return;
                            }
                            if (/^import\s+/.test(trimmed)) {
                                warnings.push('Module import ignored in preview: ' + trimmed);
                                return;
                            }
                            keptLines.push(line);
                        });
                        script = keptLines.join('\n');

                        script.split(/\r?\n/).forEach((line) => {
                            let match = line.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
                            if (match) {
                                bindingNames.add(match[1]);
                                return;
                            }
                            match = line.match(/^\s*function\s+([A-Za-z_$][\w$]*)/);
                            if (match) {
                                bindingNames.add(match[1]);
                            }
                        });
                    }

                    if (vueImports.size) {
                        script = 'const { ' + Array.from(vueImports).join(', ') + ' } = Vue;\n' + script;
                    }

                    if (isTs && script) {
                        script = ts.transpileModule(script, {
                            compilerOptions: {
                                target: ts.ScriptTarget.ES2020,
                                module: ts.ModuleKind.None
                            }
                        }).outputText;
                    }

                    const warningsCode = warnings.map((warning) =>
                        'console.warn(' + JSON.stringify(warning) + ');'
                    ).join('\n');
                    const safeTemplate = template.replace(/`/g, '\\`');

                    if (!template) {
                        processedCode = "console.error('Vue template missing <template> block.');";
                    } else if (isSetup) {
                        const returnNames = Array.from(bindingNames);
                        const returnLine = returnNames.length
                            ? 'return { ' + returnNames.join(', ') + ' };'
                            : 'return {};';
                        const setupBody = [warningsCode, script, returnLine].filter(Boolean).join('\n');
                        const indentedSetup = indentLines(setupBody, 12);

                        processedCode = `
                            const { createApp } = Vue;

                            const component = {
                                setup() {
${indentedSetup}
                                }
                            };

                            component.template = \`${safeTemplate}\`;
                            createApp(component).mount('#app');
                        `;
                    } else {
                        let componentScript = script || '';
                        if (componentScript && /\bexport\s+default\b/.test(componentScript)) {
                            componentScript = componentScript.replace(/\bexport\s+default\b/, 'const component =');
                        } else if (!componentScript) {
                            componentScript = 'const component = {};';
                        } else if (!/\bcomponent\b/.test(componentScript)) {
                            componentScript = 'const component = {};\n' + componentScript;
                        }

                        const body = [warningsCode, componentScript].filter(Boolean).join('\n');

                        processedCode = `
                            const { createApp } = Vue;
                            ${body}

                            if (typeof component !== 'undefined') {
                                component.template = \`${safeTemplate}\`;
                                createApp(component).mount('#app');
                            } else {
                                console.error('Vue component not found');
                            }
                        `;
                    }
                    
                    if (styleMatch) {
                        const safeStyle = styleMatch[1].replace(/<\/style>/gi, '<\\/style>');
                        additionalStyles = `<style>${safeStyle}
</style>`;
                    }
                } catch (error) {
                    Console.error(`Vue Compilation Error: ${error.message}`);
                    processedCode = `console.error("Vue Compilation Error: ${error.message}");`;
                }
                break;
        }
        
        if (processedCode && this.hasModuleSyntax(processedCode)) {
            const stripped = this.stripModuleSyntax(processedCode);
            if (stripped.warnings.length) {
                const warningCode = stripped.warnings.map((message) =>
                    `console.warn(${JSON.stringify(message)});`
                ).join('\n');
                processedCode = `${warningCode}\n${stripped.code}`;
            } else {
                processedCode = stripped.code;
            }
            if (this.hasModuleSyntax(processedCode)) {
                processedCode = moduleWarning(fileName);
            }
        }

        const safeProcessedCode = processedCode
            ? processedCode.replace(/<\/script>/gi, '<\\/script>')
            : '';
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName} - ProCode Preview</title>
    ${additionalScripts}
    ${additionalStyles}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem; 
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
        }
        header { 
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
        }
        .console-output { 
            background: #1e293b;
            color: #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
            min-height: 200px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            overflow-y: auto;
            max-height: 400px;
        }
        .console-title {
            font-size: 0.9rem;
            color: #94a3b8;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .log { color: #e2e8f0; }
        .error { color: #ef4444; }
        .warn { color: #f59e0b; }
        .info { color: #3b82f6; }
        .success { color: #22c55e; }
        pre { 
            background: #0f172a; 
            color: #e2e8f0; 
            padding: 1rem; 
            border-radius: 8px; 
            overflow: auto;
            margin: 1rem 0;
            font-size: 11px;
        }
        .execution-time {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #334155;
        }
    

/* PRO CODE IDE v21.0 - UI OVERHAUL */
:root {
  --glow-primary: rgba(99,102,241,0.35);
  --glass-bg: rgba(24,24,27,0.85);
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }
header {
  background: linear-gradient(180deg, #0f0f12 0%, #0b0b0e 100%) !important;
  border-bottom: 1px solid rgba(99,102,241,0.18) !important;
  box-shadow: 0 1px 20px rgba(99,102,241,0.06);
  position: relative;
}
header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(168,85,247,0.5), transparent);
}
.logo span {
  background: linear-gradient(135deg, #818cf8, #c084fc, #38bdf8) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 0 8px rgba(99,102,241,0.3));
}
.logo .version {
  background: linear-gradient(135deg, #6366f1, #a855f7) !important;
  box-shadow: 0 0 10px rgba(99,102,241,0.3);
  animation: versionGlow 3s ease-in-out infinite;
}
@keyframes versionGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 16px rgba(168,85,247,0.5); }
}
.btn.primary {
  background: linear-gradient(135deg, #5b5fc7, #7c3aed) !important;
  box-shadow: 0 0 12px rgba(99,102,241,0.3);
}
.btn.primary:hover {
  background: linear-gradient(135deg, #6366f1, #a855f7) !important;
  box-shadow: 0 0 24px rgba(99,102,241,0.5) !important;
  transform: translateY(-2px) !important;
}
.act-btn.active { background: rgba(99,102,241,0.1) !important; }
.act-btn.active::before {
  background: linear-gradient(180deg, #6366f1, #a855f7) !important;
  box-shadow: 2px 0 8px rgba(99,102,241,0.4);
}
.tab { background: #111114 !important; }
.tab:hover { background: #1a1a1e !important; }
.tab.active {
  background: #09090b !important;
  border-top-color: var(--primary) !important;
}
.t-item:hover { background: rgba(99,102,241,0.06) !important; }
.t-item.active { background: rgba(99,102,241,0.1) !important; }
.t-item.active::before {
  background: linear-gradient(180deg, var(--primary), var(--accent)) !important;
}
.panel-tab.active {
  color: #e4e4e7 !important;
  border-bottom-color: var(--primary) !important;
  background: rgba(99,102,241,0.08) !important;
}
#empty-state {
  background: radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.04) 0%, transparent 70%),
              var(--bg-dark) !important;
}
.empty-icon {
  font-size: 80px !important;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 0 20px rgba(99,102,241,0.3));
  animation: floatIcon 4s ease-in-out infinite;
}
@keyframes floatIcon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.empty-title {
  font-size: 22px !important;
  font-weight: 700 !important;
}
#command-palette {
  border: 1px solid rgba(99,102,241,0.3) !important;
  box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.08) !important;
}
.command-item:hover, .command-item.selected { background: rgba(99,102,241,0.1) !important; }
.template-card {
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: #111114;
}
.template-card:hover {
  border-color: rgba(99,102,241,0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}
.template-card.selected {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(99,102,241,0.2);
}
.input:focus {
  border-color: rgba(99,102,241,0.5) !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
}
#ai-float {
  box-shadow: -8px 0 40px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.06) !important;
  border-left: 1px solid rgba(168,85,247,0.15) !important;
}
/* BREADCRUMBS */
#breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 26px;
  background: rgba(0,0,0,0.15);
  border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 11px;
  color: #71717a;
  overflow: hidden;
  flex-shrink: 0;
}
#breadcrumb-bar .bc-item { cursor: pointer; transition: color 0.15s; }
#breadcrumb-bar .bc-item:hover { color: #e4e4e7; }
#breadcrumb-bar .bc-item.bc-current { color: #a1a1aa; font-weight: 500; }
/* CODE STATS */
#code-stats-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: 28px;
  background: rgba(0,0,0,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 11px;
  color: #71717a;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}
#code-stats-bar .stat-item { display: flex; align-items: center; gap: 5px; }
#code-stats-bar .stat-item i { color: var(--primary); font-size: 10px; }
/* SHORTCUT PANEL */
#shortcut-panel {
  position: fixed;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: #111114;
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: 14px;
  width: 680px;
  max-height: 80vh;
  overflow: auto;
  z-index: 9998;
  box-shadow: 0 25px 60px rgba(0,0,0,0.6);
  display: none;
  padding: 24px;
}
#shortcut-panel.visible { display: block; }
.shortcut-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.shortcut-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; background: rgba(255,255,255,0.03);
  border-radius: 8px; border: 1px solid rgba(255,255,255,0.04);
}
.shortcut-desc { font-size: 12px; color: #a1a1aa; }
.shortcut-keys { display: flex; gap: 4px; }
.key {
  background: #1e1e22; border: 1px solid #3f3f46; border-radius: 5px;
  padding: 2px 7px; font-size: 11px; font-family: 'JetBrains Mono', monospace;
  color: #e4e4e7; font-weight: 500; box-shadow: 0 2px 0 #27272a;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

</style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${fileName}</h1>
            <p>Running in ProCode IDE Preview  ${new Date().toLocaleTimeString()}</p>
        </header>
        
        <div id="app"></div>
        <div id="root"></div>
        <div id="app-output"></div>
        
        <div class="console-output">
            <div class="console-title">
                <span>Console Output</span>
                <button onclick="clearConsole()" style="background:#334155; color:#94a3b8; border:none; padding:4px 12px; border-radius:4px; font-size:11px; cursor:pointer;">
                    Clear
                </button>
            </div>
            <div id="console-output"></div>
            <div class="execution-time" id="execution-time"></div>
        </div>
    </div>
    
    <script>
        const startTime = performance.now();
        const consoleOutput = document.getElementById('console-output');
        const executionTime = document.getElementById('execution-time');
        
        function addOutput(type, args) {
            if (!consoleOutput) return;
            const argList = Array.isArray(args) ? args : [args];
            const div = document.createElement('div');
            div.className = type;
            
            const safeArgs = argList.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (error) {
                        return String(arg);
                    }
                }
                return String(arg);
            });

            const escapeHtml = (value) => String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const formattedArgs = argList.map((arg, index) => {
                const safe = escapeHtml(safeArgs[index]);
                if (typeof arg === 'object') {
                    return '<pre>' + safe + '</pre>';
                }
                return '<span>' + safe + '</span>';
            }).join(' ');
            
            div.innerHTML = formattedArgs;
            consoleOutput.appendChild(div);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
            
            // Send to parent for IDE console
            try {
                window.parent.postMessage({
                    token: ${previewTokenJson},
                    type: 'console',
                    level: type,
                    args: safeArgs
                }, '*');
            } catch (error) {
                // Ignore postMessage errors for non-serializable data
            }
        }

        const nativeConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        function interceptConsole(level) {
            return function(...args) {
                if (nativeConsole[level]) {
                    nativeConsole[level].apply(console, args);
                }
                addOutput(level, args);
            };
        }

        function clearConsole() {
            if (consoleOutput) {
                consoleOutput.innerHTML = '';
            }
            if (executionTime) {
                executionTime.textContent = '';
            }
        }

        console.log = interceptConsole('log');
        console.error = interceptConsole('error');
        console.warn = interceptConsole('warn');
        console.info = interceptConsole('info');

        // Performance monitoring
        window.addEventListener('load', function() {
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);
            
            document.getElementById('execution-time').textContent =
                'Execution time: ' + executionTime + 'ms';
            
            window.parent.postMessage({ 
                token: ${previewTokenJson},
                    type: 'load',
                executionTime: executionTime 
            }, '*');
        });
    <\/script>
    
    <script>
        ${safeProcessedCode}
    <\/script>



</body>
</html>`;
    },
    
    runPython: function(path) {
        Console.clear();
        Console.info(` Running Python: ${path}`);
        this.updateRunButton(true);
        
        if (!window.pyodide) {
            // Check if CDN load failed (offline / blocked)
            if (window.__pyodideCDNFailed || typeof window.loadPyodide !== 'function') {
                Console.error('Python runtime unavailable.');
                Console.warn('Pyodide failed to load from CDN (cdn.jsdelivr.net).');
                Console.info('Fix: ensure internet access, or serve pyodide locally.');
                Utils.toast('Python unavailable — CDN failed (offline?)', 'error', 6000);
                this.updateRunButton(false);
                return;
            }
            // Show prominent loading indicator
            Console.info('⏳ Loading Pyodide (~8 MB) from CDN — please wait…');
            Utils.toast('Loading Python runtime (~8 MB)…', 'info', 0); // persistent

            Console.info('Loading Pyodide runtime...');
            
            loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
            }).then(pyodide => {
                window.pyodide = pyodide;
                this.executePythonCode(path);
            }).catch(error => {
                Console.error('Failed to load Pyodide:', error);
                this.updateRunButton(false);
            });
        } else {
            this.executePythonCode(path);
        }
    },
    
    executePythonCode: function(path) {
        const code = FileSystem.read(path);
        const fileName = path.split('/').pop();
        
        Console.info(` Executing: ${fileName}`);
        Console.info('-'.repeat(50));
        
        try {
            // Set up Python environment
            window.pyodide.runPython(`
import sys
import io
import traceback

# Capture stdout and stderr
class OutputCapture:
    def __init__(self):
        self.buffer = []
    
    def write(self, text):
        self.buffer.append(text)
    
    def flush(self):
        pass
    
    def get_output(self):
        return ''.join(self.buffer)

stdout_capture = OutputCapture()
stderr_capture = OutputCapture()
sys.stdout = stdout_capture
sys.stderr = stderr_capture
`);
            
            // Execute the code
            window.pyodide.runPython(code);
            
            // Get captured output
            const stdout = window.pyodide.runPython('stdout_capture.get_output()');
            const stderr = window.pyodide.runPython('stderr_capture.get_output()');
            
            if (stdout) {
                Console.info('Output:');
                stdout.split('\n').forEach(line => {
                    if (line.trim()) Console.log(line);
                });
            }
            
            if (stderr) {
                Console.error('Errors:');
                stderr.split('\n').forEach(line => {
                    if (line.trim()) Console.error(line);
                });
            }
            
            Console.info('-'.repeat(50));
            Console.success(' Python execution completed');
            
        } catch (error) {
            Console.error('Python execution failed:');
            Console.error(error.toString());
            
            // Try to get Python traceback
            try {
                const traceback = window.pyodide.runPython(`
import traceback
try:
    traceback.format_exc()
except:
    "No traceback available"
`);
                if (traceback && traceback !== 'None') {
                    Console.error('Traceback:');
                    traceback.split('\n').forEach(line => {
                        if (line.trim()) Console.error(line);
                    });
                }
            } catch (e) {
                // Ignore traceback errors
            }
        } finally {
            this.updateRunButton(false);
        }
    },
    
    reload: function() {
        const frame = document.getElementById('preview-frame');
        if (frame) {
            frame.srcdoc = frame.srcdoc;
            Console.info('Preview reloaded');
        }
    },
    
    popout: function() {
        const frame = document.getElementById('preview-frame');
        const html = frame.srcdoc;
        
        // SECURITY FIX: Use blob URL instead of document.write()
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        
        Utils.toast('Opened in new window', 'info');
    },
    
    toggleMobile: function() {
        const frame = document.getElementById('preview-frame');
        frame.classList.toggle('mobile-preview');
        
        if (frame.classList.contains('mobile-preview')) {
            frame.style.width = '375px';
            frame.style.margin = '0 auto';
            frame.style.border = '16px solid #333';
            frame.style.borderRadius = '36px';
            Console.info(' Mobile preview enabled');
        } else {
            frame.style.width = '100%';
            frame.style.margin = '0';
            frame.style.border = 'none';
            frame.style.borderRadius = '0';
            Console.info(' Desktop preview enabled');
        }
    },
    
    updateRunButton: function(isRunning) {
        this.isRunning = isRunning;
        
        const button = document.getElementById('run-btn');
        if (!button) return;
        
        if (isRunning) {
            button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> RUNNING';
            button.setAttribute('aria-busy', 'true');
        } else {
            button.innerHTML = '<i class="fas fa-play"></i> RUN';
            button.removeAttribute('aria-busy');
        }
    }
};