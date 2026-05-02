/**
 * debugger.js
 * Debugger — breakpoints, step, watch
 * ProCode IDE v3.0
 */

// ============================================
// DEBUGGER MANAGER
// ============================================
const Debugger = {
    isActive: false,
    breakpoints: new Map(),
    variables: {},
    callStack: [],
    
    toggle: function() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.start();
        } else {
            this.stop();
        }
        
        Utils.toast(`Debugger ${this.isActive ? 'enabled' : 'disabled'}`, 
                   this.isActive ? 'success' : 'info');
    },
    
    start: function() {
        Console.clear();
        Console.info(' Debugger started');
        Console.info('Breakpoints: None');
        Console.info('Variables: Waiting for execution...');
        
        // Update UI
        const debugBtn = document.querySelector('[title*="Debug"]');
        if (debugBtn) {
            debugBtn.style.color = 'var(--error)';
            debugBtn.innerHTML = '<i class="fas fa-bug"></i> DEBUG ON';
        }
        
        // Initialize debug panel
        Panel.show('console');
        
        // Setup breakpoint markers in editor
        this.setupBreakpoints();
    },
    
    stop: function() {
        Console.info(' Debugger stopped');
        
        // Clear breakpoint markers
        this.clearBreakpoints();
        
        // Update UI
        const debugBtn = document.querySelector('[title*="Debug"]');
        if (debugBtn) {
            debugBtn.style.color = '';
            debugBtn.innerHTML = '<i class="fas fa-bug"></i>';
        }
        
        this.isActive = false;
    },
    
    setupBreakpoints: function() {
        // Add breakpoint decoration to editor
        const editor = EditorManager.getCurrentEditor();
        if (editor) {
            // Remove existing decorations
            this.clearBreakpoints();
            
            // Add breakpoint gutter
            const breakpointDecorations = [];
            
            this.breakpoints.forEach((bp, _key) => {
                if (bp && bp.path === IDE.state.activeTab) {
                    breakpointDecorations.push({
                        range: new monaco.Range(bp.line, 1, bp.line, 1),
                        options: {
                            isWholeLine: false,
                            glyphMarginClassName: 'breakpoint-glyph',
                            glyphMarginHoverMessage: { value: 'Breakpoint' }
                        }
                    });
                }
            });
            
            editor.deltaDecorations([], breakpointDecorations);
        }
    },
    
    clearBreakpoints: function() {
        const editor = EditorManager.getCurrentEditor();
        if (editor) {
            const decorations = editor.getModel().getAllDecorations();
            const breakpointDecorations = decorations.filter(d => 
                d.options.glyphMarginClassName === 'breakpoint-glyph'
            );
            
            editor.deltaDecorations(
                breakpointDecorations.map(d => d.id),
                []
            );
        }
    },
    
    toggleBreakpoint: function(line) {
        const path = IDE.state.activeTab;
        if (!path) return;
        
        const key = `${path}:${line}`;
        
        if (this.breakpoints.has(key)) {
            this.breakpoints.delete(key);
            Console.info(` Breakpoint removed at line ${line}`);
        } else {
            this.breakpoints.set(key, {
                path: path,
                line: line,
                condition: null,
                hitCount: 0
            });
            Console.info(` Breakpoint added at line ${line}`);
        }
        
        this.setupBreakpoints();
    },
    
    continue: function() {
        Console.warn('▶ Step-through execution requires a runtime debugger (e.g. Chrome DevTools).');
        Console.info('Tip: use F12 → Sources → set breakpoints in the browser debugger.');
    },

    stepOver: function() {
        Console.warn('⏭ Step-over not available — use Chrome DevTools (F12 → Sources).');
    },

    stepInto: function() {
        Console.warn('⬇ Step-into not available — use Chrome DevTools (F12 → Sources).');
    },

    stepOut: function() {
        Console.warn('⬆ Step-out not available — use Chrome DevTools (F12 → Sources).');
    },
    evaluateExpression: async function(expression) {
        try {
            // SECURITY FIX: Only use SafeDebugger sandbox — never fall back to eval()
            if (!window.SafeDebugger) {
                Console.error('SafeDebugger not available. Expression evaluation disabled for security.');
                return undefined;
            }
            const result = await window.SafeDebugger.evaluate(expression);
            Console.log(` ${expression} = ${JSON.stringify(result)}`);
            return result;
        } catch (error) {
            Console.error(`Evaluation failed: ${error.message}`);
            return undefined;
        }
    },
    
    inspectVariable: function(name) {
        if (this.variables[name] !== undefined) {
            Console.log(` ${name}: ${JSON.stringify(this.variables[name], null, 2)}`);
            return this.variables[name];
        } else {
            Console.warn(`Variable "${name}" not found in current scope`);
            return undefined;
        }
    },
    
    watchExpression: function(expression) {
        // Add to watch list
        Console.info(` Watching: ${expression}`);
        
        // Evaluate and show initial value
        const value = this.evaluateExpression(expression);
        if (value !== undefined) {
            Console.log(`Initial value: ${JSON.stringify(value)}`);
        }
    },
    
    clearBreakpointsAll: function() {
        this.breakpoints.clear();
        this.clearBreakpoints();
        Console.info(' All breakpoints cleared');
    }
};