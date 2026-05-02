/**
 * idb-reliability.js
 * IDB Reliability Warnings, Toast System v2
 * ProCode IDE v3.0
 */

(function() {
'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// 0. SAFETY GUARD
// ──────────────────────────────────────────────────────────────────────────────
if (window.__MEGAPATCH_V20__) return;
window.__MEGAPATCH_V20__ = true;

// ──────────────────────────────────────────────────────────────────────────────
// 1. ADDITIONAL CSS
// ────────────────────────────────────────────────────────────���──────────────������─
const style = document.createElement('style');
style.textContent = `
/* ZEN MODE */
body.zen-mode header,
body.zen-mode .act-bar,
body.zen-mode #side-expl,
body.zen-mode #side-search,
body.zen-mode #side-git,
body.zen-mode #side-ext,
body.zen-mode #side-debug,
body.zen-mode footer,
body.zen-mode #panel-btm,
body.zen-mode #preview-wrap,
body.zen-mode .tabs,
body.zen-mode .sidebar { display: none !important; }
body.zen-mode #main { margin-left: 0 !important; width: 100vw !important; }
body.zen-mode #editor-container { height: 100vh !important; }
body.zen-mode #ai-float { display: none !important; }
#zen-indicator {
  position: fixed; top: 12px; right: 12px; z-index: 99999;
  background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4);
  color: #a5b4fc; padding: 6px 14px; border-radius: 20px; font-size: 11px;
  font-family: 'JetBrains Mono', monospace; display: none; align-items: center; gap: 8px;
  backdrop-filter: blur(8px); letter-spacing: 0.05em;
}
body.zen-mode #zen-indicator { display: flex; }

/* POMODORO */
#pomodoro-widget {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 2px 10px; border-radius: 20px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--border);
  transition: all 0.2s; user-select: none; position: relative;
}
#pomodoro-widget:hover { background: rgba(255,255,255,0.08); }
#pomodoro-widget.work { border-color: rgba(99,102,241,0.6); color: #a5b4fc; }
#pomodoro-widget.break { border-color: rgba(74,222,128,0.6); color: #86efac; }
#pomodoro-widget.long-break { border-color: rgba(251,146,60,0.6); color: #fcd34d; }
#pomodoro-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
#pomodoro-dot.pulse { animation: pom-pulse 1s ease-in-out infinite; }
@keyframes pom-pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.5;transform:scale(1.4);} }
#pomodoro-menu {
  position: fixed; background: #18181b; border: 1px solid var(--border);
  border-radius: 14px; padding: 20px; z-index: 99998; min-width: 280px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6); display: none; flex-direction: column; gap: 14px;
  backdrop-filter: blur(12px);
}
#pomodoro-menu.visible { display: flex; }
#pomodoro-menu h4 { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: #e4e4e7; margin: 0; }
#pomodoro-display { font-size: 42px; font-weight: 700; font-family: 'JetBrains Mono', monospace; text-align: center; letter-spacing: 0.05em; color: #e4e4e7; }
#pomodoro-phase { font-size: 11px; text-align: center; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em; }
.pom-controls { display: flex; gap: 8px; justify-content: center; }
.pom-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: #27272a; color: #e4e4e7; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.pom-btn:hover { background: #3f3f46; }
.pom-btn.primary { background: var(--primary); border-color: var(--primary); color: white; }
.pom-sessions { font-size: 11px; text-align: center; color: #71717a; }

/* TODO TRACKER */
#todo-panel {
  position: fixed; right: 20px; top: 60px; width: 340px; max-height: 500px;
  background: #18181b; border: 1px solid var(--border); border-radius: 14px;
  z-index: 9990; display: none; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden;
  animation: floatIn 0.25s ease-out;
}
#todo-panel.visible { display: flex; }
.todo-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(180deg,#1f1f22,#18181b); }
.todo-header h4 { font-size: 13px; font-weight: 700; color: #e4e4e7; margin: 0; display: flex; align-items: center; gap: 8px; }
.todo-list { flex: 1; overflow-y: auto; padding: 8px; }
.todo-item { padding: 10px 12px; border-radius: 8px; margin-bottom: 4px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: background 0.15s; border: 1px solid transparent; }
.todo-item:hover { background: #27272a; border-color: var(--border); }
.todo-item .todo-tag { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; display: inline-block; letter-spacing: 0.06em; }
.todo-tag.TODO { background: rgba(99,102,241,0.2); color: #818cf8; }
.todo-tag.FIXME { background: rgba(251,113,133,0.2); color: #fb7185; }
.todo-tag.HACK { background: rgba(251,191,36,0.2); color: #fbbf24; }
.todo-tag.NOTE { background: rgba(74,222,128,0.2); color: #4ade80; }
.todo-tag.BUG { background: rgba(239,68,68,0.2); color: #ef4444; }
.todo-item .todo-text { font-size: 12px; color: #e4e4e7; line-height: 1.4; }
.todo-item .todo-file { font-size: 10px; color: #71717a; font-family: 'JetBrains Mono', monospace; }
.todo-empty { text-align: center; color: #71717a; font-size: 12px; padding: 30px 20px; }

/* SHORTCUTS MODAL */
#shortcuts-modal { position: fixed; inset: 0; background: rgba(9,9,11,0.85); backdrop-filter: blur(6px); z-index: 99995; display: none; align-items: center; justify-content: center; }
#shortcuts-modal.visible { display: flex; }
#shortcuts-box { background: #18181b; border: 1px solid var(--border); border-radius: 18px; width: 720px; max-height: 80vh; overflow-y: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.6); animation: modalIn 0.25s ease-out; }
.shortcuts-header { padding: 24px 28px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.shortcuts-header h3 { font-size: 16px; font-weight: 700; color: #e4e4e7; display: flex; align-items: center; gap: 10px; }
.shortcuts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.shortcuts-section { padding: 20px 28px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); }
.shortcuts-section:nth-child(even) { border-right: none; }
.shortcuts-section h4 { font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }
.shortcut-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.shortcut-row:last-child { border-bottom: none; }
.shortcut-row .sc-name { font-size: 12px; color: #a1a1aa; }
.shortcut-row .sc-keys { display: flex; gap: 4px; }
.kbd { background: #27272a; border: 1px solid #3f3f46; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #e4e4e7; font-weight: 600; }

/* CODE STATS */
#code-stats-panel {
  position: fixed; right: 20px; top: 60px; width: 280px;
  background: #18181b; border: 1px solid var(--border); border-radius: 14px;
  z-index: 9990; display: none; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden;
  animation: floatIn 0.25s ease-out;
}
#code-stats-panel.visible { display: flex; }
.stats-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(180deg,#1f1f22,#18181b); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
.stat-card { background: #27272a; border: 1px solid var(--border); border-radius: 10px; padding: 12px; text-align: center; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #e4e4e7; font-family: 'JetBrains Mono', monospace; }
.stat-card .stat-lbl { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
.stat-lang-bar { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.lang-item { display: flex; align-items: center; gap: 8px; }
.lang-color { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lang-name { font-size: 11px; color: #a1a1aa; flex: 1; }
.lang-pct { font-size: 11px; color: #e4e4e7; font-family: 'JetBrains Mono', monospace; font-weight: 600; }

/* MARKDOWN PREVIEW */
#md-preview {
  position: absolute; inset: 0; z-index: 20; overflow-y: auto;
  background: #0f0f12; padding: 36px 48px; display: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e4e4e7; line-height: 1.7;
}
#md-preview.visible { display: block; }
#md-preview h1,#md-preview h2,#md-preview h3 { color: #e4e4e7; margin: 1.5em 0 0.5em; font-weight: 700; }
#md-preview h1 { font-size: 2em; border-bottom: 2px solid var(--border); padding-bottom: 0.3em; }
#md-preview h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
#md-preview a { color: #818cf8; }
#md-preview code { background: #27272a; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: #f472b6; }
#md-preview pre { background: #1a1a1f; border: 1px solid var(--border); border-radius: 10px; padding: 16px; overflow-x: auto; }
#md-preview pre code { background: none; padding: 0; color: #e4e4e7; }
#md-preview blockquote { border-left: 4px solid var(--primary); margin: 0; padding-left: 16px; color: #a1a1aa; }
#md-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
#md-preview th,#md-preview td { border: 1px solid var(--border); padding: 8px 12px; }
#md-preview th { background: #27272a; font-weight: 700; }
#md-preview tr:nth-child(even) { background: rgba(255,255,255,0.02); }
#md-preview ul,#md-preview ol { padding-left: 1.5em; }
#md-preview img { max-width: 100%; border-radius: 8px; }
#md-toggle-btn { position: absolute; top: 8px; right: 8px; z-index: 25; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); color: #818cf8; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; display: none; transition: all 0.15s; }
#md-toggle-btn:hover { background: rgba(99,102,241,0.3); }
#md-toggle-btn.visible { display: block; }

/* BREADCRUMBS */
#breadcrumb-bar {
  height: 28px; padding: 0 12px; display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #71717a; background: var(--bg-panel);
  border-bottom: 1px solid var(--border); overflow: hidden; flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace; display: none;
}
#breadcrumb-bar.visible { display: flex; }
.breadcrumb-sep { color: #3f3f46; }
.breadcrumb-part { cursor: pointer; padding: 1px 4px; border-radius: 4px; transition: all 0.15s; }
.breadcrumb-part:hover { background: rgba(255,255,255,0.06); color: #e4e4e7; }
.breadcrumb-part.last { color: #e4e4e7; font-weight: 600; }

/* AI REAL mode badge */
.ai-mode-badge { font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 700; letter-spacing: 0.04em; }
.ai-mode-badge.real { background: rgba(74,222,128,0.2); color: #4ade80; }
.ai-mode-badge.local { background: rgba(113,113,122,0.2); color: #71717a; }

/* THEME PREVIEW SWATCHES - extra themes */
.theme-option { cursor: pointer; border-radius: 8px; border: 2px solid transparent; transition: all 0.2s; overflow: hidden; }
.theme-option:hover { border-color: var(--primary); }
.theme-option.active { border-color: var(--primary); }

/* DIFF VIEWER */
#diff-modal { position: fixed; inset: 0; background: rgba(9,9,11,0.9); backdrop-filter: blur(4px); z-index: 99993; display: none; align-items: center; justify-content: center; }
#diff-modal.visible { display: flex; }
#diff-box { background: #18181b; border: 1px solid var(--border); border-radius: 16px; width: 90vw; max-width: 1200px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(0,0,0,0.6); overflow: hidden; animation: modalIn 0.25s ease-out; }
.diff-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: linear-gradient(180deg,#1f1f22,#18181b); }
.diff-content { flex: 1; overflow: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 0; }
.diff-line { display: flex; gap: 0; min-width: max-content; }
.diff-line-num { width: 48px; text-align: right; padding: 2px 10px; color: #52525b; flex-shrink: 0; border-right: 1px solid var(--border); font-size: 11px; user-select: none; }
.diff-line-content { padding: 2px 12px; white-space: pre; color: #e4e4e7; }
.diff-add { background: rgba(74,222,128,0.08); }
.diff-add .diff-line-content { color: #4ade80; }
.diff-del { background: rgba(251,113,133,0.08); }
.diff-del .diff-line-content { color: #fb7185; }
.diff-add-sign,.diff-del-sign { padding: 2px 8px; font-weight: 700; flex-shrink: 0; }
.diff-add-sign { color: #4ade80; }
.diff-del-sign { color: #fb7185; }

/* SNIPPET MANAGER */
#snippet-panel { position: fixed; left: 20px; bottom: 70px; width: 360px; max-height: 520px; background: #18181b; border: 1px solid var(--border); border-radius: 14px; z-index: 9990; display: none; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden; animation: floatIn 0.25s ease-out; }
#snippet-panel.visible { display: flex; }
.snippet-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(180deg,#1f1f22,#18181b); }
.snippet-list { flex: 1; overflow-y: auto; }
.snippet-item { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.15s; display: flex; flex-direction: column; gap: 4px; }
.snippet-item:hover { background: #27272a; }
.snippet-item .sn-name { font-size: 12px; font-weight: 600; color: #e4e4e7; }
.snippet-item .sn-lang { font-size: 10px; color: var(--primary); font-family: 'JetBrains Mono', monospace; }
.snippet-item .sn-preview { font-size: 11px; color: #71717a; font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.snippet-footer { padding: 12px 18px; border-top: 1px solid var(--border); display: flex; gap: 8px; }

/* FOCUS INDICATOR for file in statusbar */
#focus-mode-btn { opacity: 0.7; }
#focus-mode-btn.active { color: #fbbf24 !important; opacity: 1; }

/* ANIMATION for megapatch panels */
@keyframes floatIn { from{opacity:0;transform:translateY(10px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }

/* IMPROVED SCROLLBAR */
.ai-messages::-webkit-scrollbar,
.todo-list::-webkit-scrollbar,
.snippet-list::-webkit-scrollbar,
#md-preview::-webkit-scrollbar { width: 4px; }
.ai-messages::-webkit-scrollbar-track,
.todo-list::-webkit-scrollbar-track,
.snippet-list::-webkit-scrollbar-track,
#md-preview::-webkit-scrollbar-track { background: transparent; }
.ai-messages::-webkit-scrollbar-thumb,
.todo-list::-webkit-scrollbar-thumb,
.snippet-list::-webkit-scrollbar-thumb,
#md-preview::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
`;
document.head.appendChild(style);

// ──────────────────────────────────────────────────────────────────────────────
// 2. ZEN MODE
// ──────────────────────────────────────────────────────────────────────────────
const ZenMode = {
  active: false,
  toggle() {
    this.active = !this.active;
    document.body.classList.toggle('zen-mode', this.active);
    if (this.active) {
      Utils?.toast?.('Zen Mode ON — Press Esc or F11 to exit', 'info');
      try { window.EditorManager?.getCurrentEditor?.()?.focus(); } catch(_){}
    } else {
      Utils?.toast?.('Zen Mode OFF', 'info');
    }
    try {
      if (window.EditorManager) {
        setTimeout(() => {
          Object.values(window.EditorManager?.instances || {}).forEach(e => e.layout?.());
        }, 350);
      }
    } catch(_){}
  }
};

// Zen indicator badge
const zenBadge = document.createElement('div');
zenBadge.id = 'zen-indicator';
zenBadge.innerHTML = '<i class="fas fa-circle"></i> ZEN MODE &nbsp;·&nbsp; Esc to exit';
document.body.appendChild(zenBadge);

window.ZenMode = ZenMode;

// ──────────────────────────────────────────────────────────────────────────────
// 3. POMODORO TIMER
// ──────────────────────────────────────────────────────────────────────────────
  // setTimeout(() => PomodoroTimer.init(), 1500); // PomodoroTimer removed

// ──────────────────────────────────────────────────────────────────────────────
// 4. TODO / FIXME TRACKER
// ──────────────────────────────────────────────────────────────────────────────
const TodoTracker = {
  tags: ['TODO', 'FIXME', 'HACK', 'NOTE', 'BUG', 'XXX'],
  panel: null,
  visible: false,

  scan() {
    const items = [];
    const files = window.IDE?.state?.files || {};
    const tagPattern = new RegExp(`(${this.tags.join('|')})[:\\s](.*)`, 'i');

    Object.entries(files).forEach(([path, content]) => {
      if (typeof content !== 'string') return;
      content.split('\n').forEach((line, idx) => {
        const m = tagPattern.exec(line);
        if (m) {
          items.push({ tag: m[1].toUpperCase(), text: m[2].trim().slice(0, 120), path, line: idx + 1 });
        }
      });
    });
    return items;
  },

  buildPanel() {
    const p = document.createElement('div');
    p.id = 'todo-panel';
    p.innerHTML = `
      <div class="todo-header">
        <h4><i class="fas fa-tasks" style="color:var(--primary)"></i> TODOs & FIXMEs <span id="todo-count" style="font-size:10px;color:#71717a;font-weight:400;"></span></h4>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn icon small" onclick="TodoTracker.refresh()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
          <button class="btn icon small" onclick="TodoTracker.close()" title="Close"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="todo-list" id="todo-list"></div>
    `;
    document.body.appendChild(p);
    this.panel = p;
    return p;
  },

  refresh() {
    const items = this.scan();
    const list = document.getElementById('todo-list');
    const count = document.getElementById('todo-count');
    if (!list) return;
    if (count) count.textContent = `(${items.length})`;
    if (items.length === 0) {
      list.innerHTML = '<div class="todo-empty"><i class="fas fa-check-circle" style="color:var(--success);font-size:24px;display:block;margin-bottom:8px;"></i>No TODOs found. Clean code!</div>';
      return;
    }
    list.innerHTML = items.map((it, i) =>
      `<div class="todo-item" onclick="TodoTracker.goto('${it.path}', ${it.line})">
        <div><span class="todo-tag ${it.tag}">${it.tag}</span></div>
        <div class="todo-text">${it.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        <div class="todo-file">${it.path}:${it.line}</div>
      </div>`
    ).join('');
  },

  goto(path, line) {
    try { TabManager?.open?.(path); } catch(_){}
    setTimeout(() => {
      try {
        const ed = EditorManager?.getCurrentEditor?.();
        if (ed) { ed.revealLineInCenter(line); ed.setPosition({lineNumber:line,column:1}); ed.focus(); }
      } catch(_){}
    }, 200);
  },

  toggle() {
    if (!this.panel) this.buildPanel();
    this.visible = !this.visible;
    this.panel.classList.toggle('visible', this.visible);
    if (this.visible) this.refresh();
  },
  close() { this.visible = false; this.panel?.classList.remove('visible'); }
};
window.TodoTracker = TodoTracker;

// ─────��������────────────────────────────────────��──────────────────────────────────
// 5. KEYBOARD SHORTCUT HELP
// ─────────────────────────────────────────────────���────────��───────────────────
const ShortcutsHelp = {
  shortcuts: [
    { section:'File', items:[
      ['New File','Ctrl+N'],['Save','Ctrl+S'],['Save All','Ctrl+Shift+S'],
      ['Import File','Ctrl+O'],['Export ZIP','Ctrl+Shift+S'],
    ]},
    { section:'Edit', items:[
      ['Undo','Ctrl+Z'],['Redo','Ctrl+Y'],['Find','Ctrl+F'],
      ['Find in Files','Ctrl+Shift+F'],['Replace','Ctrl+H'],
      ['Toggle Comment','Ctrl+/'],['Duplicate Line','Ctrl+D'],
      ['Delete Line','Ctrl+Shift+K'],['Move Line Up','Alt+↑'],['Move Line Down','Alt+↓'],
    ]},
    { section:'View', items:[
      ['Command Palette','Ctrl+P'],['Toggle Terminal','Ctrl+`'],
      ['Toggle Preview','Ctrl+B'],['Split Editor','Ctrl+\\'],
      ['Zen Mode','F11'],['Toggle Sidebar','Ctrl+Shift+E'],
    ]},
    { section:'Run & Debug', items:[
      ['Run','F5'],['Debug','F9'],['Stop','Shift+F5'],
      ['System Diagnostics','Ctrl+Shift+D'],
    ]},
    { section:'Navigation', items:[
      ['Go to Line','Ctrl+G'],['Go to File','Ctrl+P'],
      ['Next Tab','Ctrl+Tab'],['Previous Tab','Ctrl+Shift+Tab'],
      ['Close Tab','Ctrl+W'],
    ]},
    { section:'Tools', items:[
      ['AI Assistant','Ctrl+Shift+A'],['TODO Tracker','Ctrl+Shift+T'],
      ['Code Stats','Ctrl+Shift+I'],['Pomodoro','Click timer'],
      ['Shortcuts Help','?'],
    ]},
  ],

  buildModal() {
    const m = document.createElement('div');
    m.id = 'shortcuts-modal';
    m.innerHTML = `
      <div id="shortcuts-box">
        <div class="shortcuts-header">
          <h3><i class="fas fa-keyboard" style="color:var(--primary)"></i> Keyboard Shortcuts</h3>
          <button class="btn icon small" onclick="ShortcutsHelp.close()"><i class="fas fa-times"></i></button>
        </div>
        <div class="shortcuts-grid">
          ${this.shortcuts.map(sec => `
            <div class="shortcuts-section">
              <h4>${sec.section}</h4>
              ${sec.items.map(([name,keys]) => `
                <div class="shortcut-row">
                  <span class="sc-name">${name}</span>
                  <span class="sc-keys">${keys.split('+').map(k=>`<span class="kbd">${k}</span>`).join('<span style="color:#52525b;padding:0 2px;">+</span>')}</span>
                </div>`).join('')}
            </div>`).join('')}
        </div>
        <div style="padding:14px 28px;color:#52525b;font-size:11px;border-top:1px solid var(--border);">
          Press <span class="kbd">?</span> anywhere to show this panel · <span class="kbd">Esc</span> to close
        </div>
      </div>`;
    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });
    document.body.appendChild(m);
    return m;
  },

  show() {
    let m = document.getElementById('shortcuts-modal');
    if (!m) m = this.buildModal();
    m.classList.add('visible');
  },
  close() { document.getElementById('shortcuts-modal')?.classList.remove('visible'); },
  toggle() {
    const m = document.getElementById('shortcuts-modal');
    if (m?.classList.contains('visible')) this.close(); else this.show();
  }
};
window.ShortcutsHelp = ShortcutsHelp;


// ──────────────────────────────────────────────────────────────────────────────
// 6. CODE STATISTICS PANEL
// ──────────────────────────────────────────────────────────────────────────────
const CodeStats = {
  panel: null, visible: false,
  LANG_COLORS: { js:'#f7df1e',ts:'#3178c6',jsx:'#61dafb',tsx:'#61dafb',html:'#e34f26',css:'#1572b6',scss:'#cd6799',py:'#3776ab',json:'#5c8',md:'#b48ead',vue:'#42b883',other:'#71717a' },

  compute() {
    const files = window.IDE?.state?.files || {};
    let totalLines = 0, totalChars = 0, totalFiles = 0, blankLines = 0, commentLines = 0;
    const byLang = {};

    Object.entries(files).forEach(([path, content]) => {
      if (typeof content !== 'string') return;
      totalFiles++;
      const ext = path.split('.').pop().toLowerCase();
      const lines = content.split('\n');
      totalLines += lines.length;
      totalChars += content.length;
      blankLines += lines.filter(l => l.trim() === '').length;
      commentLines += lines.filter(l => /^\s*(\/\/|#|<!--|\*|\/\*)/.test(l)).length;
      byLang[ext] = (byLang[ext] || 0) + lines.length;
    });

    return { totalLines, totalChars, totalFiles, blankLines, commentLines, byLang };
  },

  buildPanel() {
    const p = document.createElement('div');
    p.id = 'code-stats-panel';
    p.innerHTML = `
      <div class="stats-header">
        <h4 style="font-size:13px;font-weight:700;color:#e4e4e7;margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Code Statistics</h4>
        <button class="btn icon small" onclick="CodeStats.close()"><i class="fas fa-times"></i></button>
      </div>
      <div id="stats-content"></div>`;
    document.body.appendChild(p);
    this.panel = p;
    return p;
  },

  refresh() {
    const s = this.compute();
    const container = document.getElementById('stats-content');
    if (!container) return;
    const langTotal = Object.values(s.byLang).reduce((a,b)=>a+b,0) || 1;
    const topLangs = Object.entries(s.byLang).sort((a,b)=>b[1]-a[1]).slice(0,5);
    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val">${s.totalFiles}</div><div class="stat-lbl">Files</div></div>
        <div class="stat-card"><div class="stat-val">${s.totalLines.toLocaleString()}</div><div class="stat-lbl">Lines</div></div>
        <div class="stat-card"><div class="stat-val">${(s.totalChars/1024).toFixed(1)}K</div><div class="stat-lbl">Characters</div></div>
        <div class="stat-card"><div class="stat-val">${s.commentLines}</div><div class="stat-lbl">Comments</div></div>
      </div>
      <div class="stat-lang-bar">
        ${topLangs.map(([lang,count]) => `
          <div class="lang-item">
            <div class="lang-color" style="background:${this.LANG_COLORS[lang]||this.LANG_COLORS.other}"></div>
            <div class="lang-name">.${lang}</div>
            <div class="lang-pct">${Math.round(count/langTotal*100)}%</div>
          </div>`).join('')}
      </div>`;
  },

  toggle() {
    if (!this.panel) this.buildPanel();
    this.visible = !this.visible;
    this.panel.classList.toggle('visible', this.visible);
    if (this.visible) this.refresh();
  },
  close() { this.visible = false; this.panel?.classList.remove('visible'); }
};
window.CodeStats = CodeStats;

// ──────────────────────────────────────────────────────────────────────────────
// 7. MARKDOWN PREVIEW
// ───────────────────────��──────────────────────────────────────���───────────────
const MarkdownPreview = {
  visible: false,
  _toggleBtn: null,

  parseMarkdown(md) {
    // Minimal markdown renderer
    let html = md
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      // code blocks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code)=>`<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
      // inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // headings
      .replace(/^#{6}\s(.+)$/gm,'<h6>$1</h6>')
      .replace(/^#{5}\s(.+)$/gm,'<h5>$1</h5>')
      .replace(/^#{4}\s(.+)$/gm,'<h4>$1</h4>')
      .replace(/^#{3}\s(.+)$/gm,'<h3>$1</h3>')
      .replace(/^#{2}\s(.+)$/gm,'<h2>$1</h2>')
      .replace(/^#{1}\s(.+)$/gm,'<h1>$1</h1>')
      // bold/italic
      .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      // links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>`<a href="${/^(https?:|mailto:|#)/i.test(u)?u:''}" target="_blank" rel="noopener noreferrer">${t}</a>`)
      // images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2">')
      // blockquote
      .replace(/^>\s(.+)$/gm,'<blockquote>$1</blockquote>')
      // horizontal rule
      .replace(/^---+$/gm,'<hr>')
      // lists
      .replace(/^[-*+]\s(.+)$/gm,'<li>$1</li>')
      .replace(/(<li>.*<\/li>(\n|$))+/g, s=>`<ul>${s}</ul>`)
      .replace(/^\d+\.\s(.+)$/gm,'<li>$1</li>')
      // paragraphs
      .replace(/\n\n/g,'</p><p>')
      .replace(/\n/g,'<br>');
    return `<p>${html}</p>`;
  },

  show(content) {
    let panel = document.getElementById('md-preview');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'md-preview';
      const editorContainer = document.getElementById('editor-container');
      if (editorContainer) editorContainer.style.position = 'relative', editorContainer.appendChild(panel);
    }
    panel.innerHTML = this.parseMarkdown(content);
    panel.classList.add('visible');
    this.visible = true;
    if (this._toggleBtn) { this._toggleBtn.textContent = '📝 Edit'; this._toggleBtn.title = 'Back to editor'; }
  },

  hide() {
    document.getElementById('md-preview')?.classList.remove('visible');
    this.visible = false;
    if (this._toggleBtn) { this._toggleBtn.textContent = '👁 Preview'; this._toggleBtn.title = 'Preview markdown'; }
  },

  toggle() {
    const path = window.IDE?.state?.activeTab;
    if (!path?.endsWith('.md') && !path?.endsWith('.markdown')) return;
    if (this.visible) { this.hide(); } else {
      try { this.show(FileSystem.read(path)); } catch(_){}
    }
  },

  updateToggleBtn(path) {
    if (!this._toggleBtn) return;
    const isMarkdown = path && (path.endsWith('.md') || path.endsWith('.markdown'));
    this._toggleBtn.classList.toggle('visible', !!isMarkdown);
    if (!isMarkdown) this.hide();
  },

  init() {
    const btn = document.createElement('button');
    btn.id = 'md-toggle-btn';
    btn.textContent = '👁 Preview';
    btn.title = 'Preview markdown (Ctrl+Shift+M)';
    btn.addEventListener('click', () => this.toggle());
    this._toggleBtn = btn;
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) { editorContainer.style.position = 'relative'; editorContainer.appendChild(btn); }
  }
};
window.MarkdownPreview = MarkdownPreview;
setTimeout(() => MarkdownPreview.init(), 1500);

// ──────────────────────────────────────────────────────────────────────────────
// 8. BREADCRUMB NAVIGATION
// ──────────────────────────────────────────────────────────────────────────────
const Breadcrumb = {
  bar: null,

  update(path) {
    if (!path) return;
    if (!this.bar) {
      // Reuse existing DOM element instead of creating duplicate
      this.bar = document.getElementById('breadcrumb-bar');
      if (!this.bar) {
        this.bar = document.createElement('div');
        this.bar.id = 'breadcrumb-bar';
        this.bar.classList.add('visible');
        const tabList = document.getElementById('tab-list');
        tabList?.parentNode?.insertBefore(this.bar, tabList.nextSibling);
      }
    }
    this.bar.classList.add('visible');
    const parts = path.split('/').filter(Boolean);
    this.bar.innerHTML = parts.map((p, i) => {
      const isLast = i === parts.length - 1;
      return `${i > 0 ? '<span class="breadcrumb-sep">›</span>' : ''}<span class="breadcrumb-part${isLast?' last':''}">${p}</span>`;
    }).join('');
    MarkdownPreview.updateToggleBtn(path);
  }
};
window.Breadcrumb = Breadcrumb;

// Hook into tab switching
(function(){
  try {
    const origOpen = TabManager?.open;
    if (origOpen && !TabManager.__bc_patched__) {
      TabManager.__bc_patched__ = true;
      TabManager.open = function(path, ...args) {
        const r = origOpen.call(this, path, ...args);
        setTimeout(() => { try { Breadcrumb.update(path); } catch(_){} }, 50);
        return r;
      };
    }
  } catch(_){}
})();

// ────────────────────────────────────────────────────────────���──���──────────────
// 9. REAL ANTHROPIC AI INTEGRATION
// ──────────────────────────────────────────────────────────────────────────────
const AnthropicAI = {
  model: 'claude-sonnet-4-6',
  apiKey: null, // User sets this in Settings
  history: [],
  MAX_HISTORY: 20,

  async chat(userMessage, contextCode) {
    const systemPrompt = `You are an expert coding assistant embedded in ProCode IDE — Unified Edition. 
You help developers write, debug, explain, optimize, and review code.
You provide concise, accurate, practical answers with working code examples.
When providing code, wrap it in triple backticks with the language name.
Current file context: ${contextCode ? `\n\`\`\`\n${contextCode.slice(0, 8000)}\n\`\`\`` : 'No file open.'}`;  // FIX-7d: Quick Actions context raised 2 000 → 8 000

    const messages = [
      ...this.history.slice(-this.MAX_HISTORY),
      { role: 'user', content: userMessage }
    ];

    if (!this.apiKey) {
      throw new Error('No API key set. Add your Anthropic API key in Settings → AI tab.');
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': (window.ANTHROPIC_API_VERSION || '2023-06-01'),
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({error:{message:'API error'}}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content?.find(b => b.type === 'text')?.text || '';

      // Update history
      this.history.push({ role: 'user', content: userMessage });
      this.history.push({ role: 'assistant', content: reply });
      if (this.history.length > this.MAX_HISTORY * 2) {
        this.history = this.history.slice(-this.MAX_HISTORY * 2);
      }

      return reply;
    } catch (err) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        throw new Error('Network error. Check your connection.');
      }
      throw err;
    }
  },

  clearHistory() { this.history = []; }
};
// v27: AnthropicAI legacy shim — AI.send() now handles streaming directly.
// Keep synced so any legacy callers still work.
window.AnthropicAI = AnthropicAI;
// Sync key from IDE state when available
(function syncKey() {
  try {
    const k = (window.IDE?.state?.settings?.ai?.apiKey) || (window.__apiKey ? window.__apiKey.load() : localStorage.getItem('procode_ai_apikey')) || ''; // P2
    if (k) AnthropicAI.apiKey = k;
    if (window.IDE?.state?.settings?.ai?.model) AnthropicAI.model = IDE.state.settings.ai.model;
  } catch(e) {}
  // Re-check after full boot
  setTimeout(syncKey, 2000);
})();

// v27: Old upgrade-patch IIFE removed — AI module now natively uses Claude streaming API.
// Key restore and status update handled in DOMContentLoaded + enhanceAI().

// ───────────────────────────────────────────────────────────────────────��──────
// 10. SNIPPET MANAGER
// ──────────────���─���������������─────────────────────────────────────────────────────────────
const SnippetManager = {
  visible: false,
  panel: null,
  snippets: [
    { name:'Console Log', lang:'js', code:'console.log($1);', desc:'console.log()' },
    { name:'Arrow Function', lang:'js', code:'const $1 = ($2) => {\n  $3\n};', desc:'const fn = () => {}' },
    { name:'Async Function', lang:'js', code:'async function $1($2) {\n  try {\n    $3\n  } catch (err) {\n    console.error(err);\n  }\n}', desc:'async function' },
    { name:'useEffect', lang:'jsx', code:'useEffect(() => {\n  $1\n  return () => {\n    $2\n  };\n}, [$3]);', desc:'React useEffect' },
    { name:'useState', lang:'jsx', code:'const [$1, set${1/./\\u$0/}] = useState($2);', desc:'React useState' },
    { name:'fetch GET', lang:'js', code:'const res = await fetch(\'$1\');\nconst data = await res.json();', desc:'fetch() GET request' },
    { name:'try-catch', lang:'js', code:'try {\n  $1\n} catch (err) {\n  console.error(\'Error:\', err);\n}', desc:'Try/catch block' },
    { name:'CSS Flex', lang:'css', code:'.container {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n}', desc:'Flexbox container' },
    { name:'CSS Grid', lang:'css', code:'.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 24px;\n}', desc:'CSS Grid' },
    { name:'Media Query', lang:'css', code:'@media (max-width: 768px) {\n  $1\n}', desc:'Mobile media query' },
    { name:'Python Class', lang:'py', code:'class $1:\n    def __init__(self$2):\n        $3\n    \n    def __repr__(self):\n        return f\'$1()\'', desc:'Python class' },
    { name:'Python Main', lang:'py', code:'def main():\n    $1\n\nif __name__ == \'__main__\':\n    main()', desc:'Python main guard' },
    { name:'HTML Template', lang:'html', code:'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>$1</title>\n</head>\n<body>\n  $2\n</body>\n</html>', desc:'HTML5 template' },
    { name:'Meta Tags SEO', lang:'html', code:'<meta name="description" content="$1">\n<meta name="keywords" content="$2">\n<meta property="og:title" content="$3">\n<meta property="og:description" content="$4">', desc:'SEO meta tags' },
  ],

  buildPanel() {
    const p = document.createElement('div');
    p.id = 'snippet-panel';
    p.innerHTML = `
      <div class="snippet-header">
        <h4 style="font-size:13px;font-weight:700;color:#e4e4e7;margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-puzzle-piece" style="color:var(--accent)"></i> Snippets</h4>
        <button class="btn icon small" onclick="SnippetManager.close()"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:10px 12px;border-bottom:1px solid var(--border);">
        <input class="input" id="snippet-search" placeholder="Search snippets..." style="width:100%;font-size:12px;" oninput="SnippetManager.filter(this.value)">
      </div>
      <div class="snippet-list" id="snippet-list"></div>
      <div class="snippet-footer">
        <button class="btn small primary" onclick="SnippetManager.insertSelected()" style="flex:1;font-size:12px;">Insert at Cursor</button>
      </div>`;
    document.body.appendChild(p);
    this.panel = p;
    this.renderList(this.snippets);
    return p;
  },

  renderList(items) {
    const list = document.getElementById('snippet-list');
    if (!list) return;
    list.innerHTML = items.map((s,i) => `
      <div class="snippet-item" onclick="SnippetManager.select(${i})" ondblclick="SnippetManager.insert(${i})">
        <div class="sn-name">${s.name}</div>
        <div class="sn-lang">.${s.lang}</div>
        <div class="sn-preview">${s.desc}</div>
      </div>`).join('');
  },

  _selectedIndex: -1,
  _filtered: null,
  select(i) {
    this._selectedIndex = i;
    document.querySelectorAll('.snippet-item').forEach((el,idx)=>el.classList.toggle('active',idx===i));
  },
  filter(q) {
    const lower = q.toLowerCase();
    this._filtered = q ? this.snippets.filter(s => s.name.toLowerCase().includes(lower) || s.lang.includes(lower) || s.desc.toLowerCase().includes(lower)) : this.snippets;
    this.renderList(this._filtered || this.snippets);
    this._selectedIndex = -1;
  },
  insert(i) {
    const list = this._filtered || this.snippets;
    const s = list[i];
    if (!s) return;
    try {
      const ed = EditorManager?.getCurrentEditor?.();
      if (ed) {
        const pos = ed.getPosition();
        ed.executeEdits('snippet', [{ range: { startLineNumber:pos.lineNumber, startColumn:pos.column, endLineNumber:pos.lineNumber, endColumn:pos.column }, text: s.code.replace(/\$\d+/g,'') }]);
        ed.focus();
        this.close();
        Utils?.toast?.(`Inserted: ${s.name}`, 'success');
      }
    } catch(err) { Utils?.toast?.('Could not insert snippet', 'error'); }
  },
  insertSelected() {
    if (this._selectedIndex >= 0) this.insert(this._selectedIndex);
    else Utils?.toast?.('Select a snippet first', 'warning');
  },
  toggle() {
    if (!this.panel) this.buildPanel();
    this.visible = !this.visible;
    this.panel.classList.toggle('visible', this.visible);
    if (this.visible) setTimeout(() => document.getElementById('snippet-search')?.focus(), 100);
  },
  close() { this.visible = false; this.panel?.classList.remove('visible'); }
};
window.SnippetManager = SnippetManager;

// ──────────────────────────────────────────────────────────────────────────────
// 11. FILE DIFF VIEWER
// ────────────────────────────────────────────��─────────────────────────────────
const DiffViewer = {
  show(path1, path2) {
    try {
      const c1 = FileSystem.read(path1);
      const c2 = FileSystem.read(path2);
      this.renderDiff(c1, c2, path1, path2);
    } catch(err) { Utils?.toast?.('Could not open files for diff', 'error'); }
  },

  computeDiff(a, b) {
    const la = a.split('\n'), lb = b.split('\n');
    const result = [];
    const n = la.length, m = lb.length;
    // Simple LCS-based diff
    let ai = 0, bi = 0;
    while (ai < n || bi < m) {
      if (ai < n && bi < m && la[ai] === lb[bi]) {
        result.push({ type:'same', text:la[ai], lineA:ai+1, lineB:bi+1 });
        ai++; bi++;
      } else if (bi < m && (ai >= n || la[ai] !== lb[bi])) {
        result.push({ type:'add', text:lb[bi], lineB:bi+1 });
        bi++;
      } else {
        result.push({ type:'del', text:la[ai], lineA:ai+1 });
        ai++;
      }
    }
    return result;
  },

  renderDiff(c1, c2, name1, name2) {
    let modal = document.getElementById('diff-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'diff-modal';

    const diff = this.computeDiff(c1, c2);
    const rows = diff.map(d => {
      const cls = d.type === 'add' ? 'diff-add' : d.type === 'del' ? 'diff-del' : '';
      const sign = d.type === 'add' ? `<span class="diff-add-sign">+</span>` : d.type === 'del' ? `<span class="diff-del-sign">-</span>` : `<span style="width:16px;display:inline-block;"></span>`;
      const lineNum = d.lineA || d.lineB || '';
      return `<div class="diff-line ${cls}">${sign}<span class="diff-line-num">${lineNum}</span><span class="diff-line-content">${d.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span></div>`;
    }).join('');

    const adds = diff.filter(d=>d.type==='add').length;
    const dels = diff.filter(d=>d.type==='del').length;

    modal.innerHTML = `
      <div id="diff-box">
        <div class="diff-header">
          <div>
            <h3 style="font-size:14px;font-weight:700;color:#e4e4e7;margin:0;display:flex;align-items:center;gap:10px;">
              <i class="fas fa-code-branch" style="color:var(--primary)"></i> File Diff
            </h3>
            <div style="font-size:11px;color:#71717a;margin-top:4px;">
              ${name1} → ${name2} &nbsp;·&nbsp; 
              <span style="color:#4ade80;">+${adds}</span> &nbsp;
              <span style="color:#fb7185;">-${dels}</span>
            </div>
          </div>
          <button class="btn icon small" onclick="document.getElementById('diff-modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div class="diff-content">${rows}</div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    modal.classList.add('visible');
  },

  showPrompt() {
    const files = Object.keys(window.IDE?.state?.files || {});
    if (files.length < 2) { Utils?.toast?.('Need at least 2 files to compare', 'warning'); return; }
    const file1 = files[0], file2 = files[1];
    this.show(file1, file2);
  }
};
window.DiffViewer = DiffViewer;

// ──────────────────────────────────────────────────────────────────────────────
// 12. IMPROVED TOOLBAR BUTTONS (inject into header/footer)
// ──────────────────────────────────────────────────────────────────────────────
setTimeout(() => {
  try {
    // Add to header right side
    const headerRight = document.querySelector('header .flex.ac.gap-2:last-of-type');
    if (headerRight) {
      const separator = '<div style="width:1px;height:20px;background:#333;margin:0 4px;"></div>';

      // Zen Mode button
      const zenBtn = document.createElement('button');
      zenBtn.className = 'btn icon';
      zenBtn.title = 'Zen Mode (F11)';
      zenBtn.innerHTML = '<i class="fas fa-expand"></i>';
      zenBtn.addEventListener('click', () => ZenMode.toggle());

      // Snippets
      const snipBtn = document.createElement('button');
      snipBtn.className = 'btn icon';
      snipBtn.title = 'Snippets Manager';
      snipBtn.innerHTML = '<i class="fas fa-puzzle-piece"></i>';
      snipBtn.addEventListener('click', () => SnippetManager.toggle());

      headerRight.appendChild(document.createElement('div')).outerHTML;
      // separator
      const sep1 = document.createElement('div');
      sep1.style.cssText = 'width:1px;height:20px;background:#333;margin:0 4px;';
      headerRight.appendChild(sep1);
      headerRight.appendChild(zenBtn);
      headerRight.appendChild(snipBtn);
    }
  } catch(_){}

  // Add to activity bar bottom
  try {
    const actBar = document.querySelector('.act-bar');
    if (actBar) {
      const spacer = actBar.querySelector('[style*="flex:1"]');

      const addActBtn = (icon, title, handler, color) => {
        const btn = document.createElement('div');
        btn.className = 'act-btn';
        btn.title = title;
        btn.innerHTML = _sanitize('<i class="fas ' + icon + '"' + (color ? ' style="color:' + color + '"' : '') + '></i><div class="tooltip">' + title + '</div>');
        btn.addEventListener('click', handler);
        if (spacer) actBar.insertBefore(btn, spacer);
        return btn;
      };

      addActBtn('fa-tasks', 'TODO Tracker (Ctrl+Shift+T)', () => TodoTracker.toggle(), '#fbbf24');
      addActBtn('fa-chart-bar', 'Code Statistics (Ctrl+Shift+I)', () => CodeStats.toggle(), '#818cf8');
      addActBtn('fa-code-branch', 'File Diff Viewer', () => DiffViewer.showPrompt(), '#4ade80');
    }
  } catch(_){}

  // Add to footer
  try {
    const footer = document.querySelector('footer');
    if (footer) {
      // Keyboard shortcut button in footer
      const ksBtn = document.createElement('span');
      ksBtn.innerHTML = '<i class="fas fa-keyboard"></i>';
      ksBtn.title = 'Keyboard Shortcuts (?)';
      ksBtn.style.cursor = 'pointer';
      ksBtn.addEventListener('click', () => ShortcutsHelp.show());
      const rightStat = footer.querySelector('.f-stat:last-child');
      if (rightStat) rightStat.appendChild(ksBtn);

      // Zen mode button in footer
      const zenF = document.createElement('span');
      zenF.innerHTML = '<i class="fas fa-expand"></i>';
      zenF.title = 'Zen Mode (F11)';
      zenF.style.cursor = 'pointer';
      zenF.addEventListener('click', () => ZenMode.toggle());
      if (rightStat) rightStat.appendChild(zenF);
    }
  } catch(_){}
}, 2000);


// ──────────────────────────────────────────────────────────────────────────────
// 14. AUTO-SAVE VISUAL INDICATOR
// ��──────────���─���────────────────────────────────────────────────────────────────
(function(){
  let _saving = false;
  try {
    const origSave = FileSystem?.save?.bind(FileSystem);
    if (!origSave || FileSystem.__mega_save__) return;
    FileSystem.__mega_save__ = true;
    FileSystem.save = async function(...args) {
      if (!_saving) {
        _saving = true;
        const indicator = document.getElementById('status-indicator');
        const origBg = indicator?.style.background;
        if (indicator) indicator.style.background = '#f59e0b';
        try { const r = await origSave(...args); return r; }
        finally {
          _saving = false;
          if (indicator) {
            indicator.style.background = '#22c55e';
            setTimeout(() => { if(indicator) indicator.style.background = origBg || ''; }, 1000);
          }
        }
      }
      return origSave(...args);
    };
  } catch(_){}
})();

// ───────────────────────────────────────────────────────────────────────────���──
// 15. SMART WELCOME SCREEN ENHANCEMENT
// ──────────────���───���─���─���─���─���─���─���───────────────────────────────────────────────
setTimeout(() => {
  try {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      // Add extra feature showcase
      const extra = document.createElement('div');
      extra.style.cssText = 'margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;';
      extra.innerHTML = `
        <button class="btn" onclick="ShortcutsHelp.show()" style="font-size:11px;padding:6px 12px;"><i class="fas fa-keyboard"></i> Shortcuts</button>
        <button class="btn" onclick="SnippetManager.toggle()" style="font-size:11px;padding:6px 12px;"><i class="fas fa-puzzle-piece"></i> Snippets</button>
        <button class="btn" onclick="TodoTracker.toggle()" style="font-size:11px;padding:6px 12px;"><i class="fas fa-tasks"></i> TODOs</button>
        <button class="btn" onclick="ZenMode.toggle()" style="font-size:11px;padding:6px 12px;"><i class="fas fa-expand"></i> Zen Mode</button>
      `;
      emptyState.appendChild(extra);
    }
  } catch(_){}
}, 2500);

// ──────────────────────────────────────────────────────────────────────────────
// 16. CONTEXT MENU ENHANCEMENTS
// ──────────────────────────────────────────────────────────────────────────────
(function(){
  try {
    const origShowContext = window.showContextMenu || ContextMenu?.show;
    if (!origShowContext || window.__mega_ctx__) return;
    window.__mega_ctx__ = true;
    const origCtx = ContextMenu?.show?.bind(ContextMenu);
    if (!origCtx) return;
    ContextMenu.show = function(x, y, items, ...args) {
      const extras = [
        { type:'divider' },
        { label:'🧩 Insert Snippet', icon:'fa-puzzle-piece', action:() => SnippetManager.toggle() },
        { label:'📊 Code Stats', icon:'fa-chart-bar', action:() => CodeStats.toggle() },
        { label:'✅ View TODOs', icon:'fa-tasks', action:() => TodoTracker.toggle() },
      ];
      return origCtx(x, y, [...(items||[]), ...extras], ...args);
    };
  } catch(_){}
})();

// ──────────────────────────────────────────────────────────────────────────────
// 17. IMPROVED MULTI-CURSOR & WORD SELECTION
// ──────────────────────────────────────────────────────────────────────────────
(function(){
  try {
    const checkEditors = setInterval(() => {
      // Use window.EditorManager — bare `EditorManager` would be a ReferenceError
      // because it is declared with `const` in a different <script> block.
      const eds = Object.values(window.EditorManager?.instances || {});
      if (!eds.length) return;
      clearInterval(checkEditors);

      eds.forEach(ed => {
        if (!ed || ed.__mega_ed__) return;
        ed.__mega_ed__ = true;

        // Double-click selects word (already default, but ensure consistency)
        // Add F2 rename symbol
        ed.addCommand(monaco.KeyCode.F2, () => {
          ed.getAction('editor.action.rename')?.run();
        });

        // Alt+Enter: select all occurrences
        ed.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
          ed.getAction('editor.action.selectHighlights')?.run();
        });

        // F12: go to definition
        ed.addCommand(monaco.KeyCode.F12, () => {
          ed.getAction('editor.action.revealDefinition')?.run();
        });
      });
    }, 1000);
  } catch(_){}
})();

// ──────────────────────────────────────────────────────────────────────────────
// 18. COMMAND PALETTE EXTRA COMMANDS
// ──────────────────────────────────────────────────────────────────────────────
(function(){
  try {
    const checkCP = setInterval(() => {
      if (!window.CommandPalette || CommandPalette.__mega_cp__) { clearInterval(checkCP); return; }
      CommandPalette.__mega_cp__ = true;
      clearInterval(checkCP);

      const extraCommands = [
        { id:'zen', text:'View: Toggle Zen Mode', icon:'fa-expand', shortcut:'F11', action: () => ZenMode.toggle() },
        { id:'todo', text:'Tools: TODO & FIXME Tracker', icon:'fa-tasks', shortcut:'Ctrl+Shift+T', action: () => TodoTracker.toggle() },
        { id:'stats', text:'Tools: Code Statistics', icon:'fa-chart-bar', shortcut:'Ctrl+Shift+I', action: () => CodeStats.toggle() },
        { id:'snippets', text:'Tools: Snippet Manager', icon:'fa-puzzle-piece', shortcut:'Ctrl+Shift+N', action: () => SnippetManager.toggle() },
        { id:'diff', text:'Tools: File Diff Viewer', icon:'fa-code-branch', shortcut:'', action: () => DiffViewer.showPrompt() },
        { id:'md-preview', text:'View: Toggle Markdown Preview', icon:'fa-eye', shortcut:'Ctrl+Shift+M', action: () => MarkdownPreview.toggle() },
        { id:'shortcuts', text:'Help: Keyboard Shortcuts', icon:'fa-keyboard', shortcut:'?', action: () => ShortcutsHelp.show() },
        { id:'diag', text:'Developer: System Diagnostics', icon:'fa-stethoscope', shortcut:'Ctrl+Shift+D', action: () => window.SystemDiagnostics?.show?.() },
        { id:'format', text:'Edit: Format Document', icon:'fa-indent', shortcut:'Shift+Alt+F', action: () => { try { window.EditorManager?.getCurrentEditor?.()?.getAction('editor.action.formatDocument')?.run(); } catch(_){} } },
      ];

      const orig = CommandPalette.getCommands?.bind(CommandPalette) || (() => []);
      CommandPalette.getCommands = function() {
        return [...(orig() || []), ...extraCommands];
      };
    }, 800);
  } catch(_){}
})();

// ──────────────────────────────────────────────────────────────────────────────
// 19. SETTINGS: Add API KEY input for Anthropic
// ──────────────────────────────────────────────────────────────────────────────
setTimeout(() => {
  try {
    const aiSettingsTab = document.getElementById('settings-ai');
    if (aiSettingsTab && !aiSettingsTab.querySelector('#ai-apikey-input')) {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `
        <div>
          <div style="font-weight:500;">Anthropic API Key</div>
          <div style="font-size:12px; color:var(--text-dim);">Optional - enables real Claude AI assistant. Stored locally only.</div>
        </div>
        <input id="ai-apikey-input" type="password" placeholder="sk-ant-..." style="width:220px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-side);color:var(--text);font-family:'JetBrains Mono';font-size:12px;">
      `;
      aiSettingsTab.insertBefore(row, aiSettingsTab.firstChild);

      // Load saved key — use SecureStorage (async) with localStorage fallback
      (async () => {
        try {
          const saved = window.SecureStorage
            ? await SecureStorage.get('procode_anthropic_key')
            : localStorage.getItem('procode_anthropic_key');
          const inp = document.getElementById('ai-apikey-input');
          if (saved && inp) inp.value = saved;
        } catch(_) {
          const saved = localStorage.getItem('procode_anthropic_key');
          const inp = document.getElementById('ai-apikey-input');
          if (saved && inp) inp.value = saved;
        }
      })();
    }

    // Patch Settings.save to save API key
    const origSave = window.Settings?.save?.bind(window.Settings);
    if (origSave && Settings && !Settings.__mega_save__) {
      Settings.__mega_save__ = true;
      Settings.save = async function() {
        const keyInput = document.getElementById('ai-apikey-input');
        if (keyInput) {
          const val = keyInput.value.trim();
          if (val) {
            if (window.SecureStorage) await SecureStorage.set('procode_anthropic_key', val).catch(()=> localStorage.setItem('procode_anthropic_key', val));
            else localStorage.setItem('procode_anthropic_key', val);
            AnthropicAI.apiKey = val;
          } else {
            if (window.SecureStorage) await SecureStorage.remove('procode_anthropic_key').catch(()=> localStorage.removeItem('procode_anthropic_key'));
            else localStorage.removeItem('procode_anthropic_key');
            AnthropicAI.apiKey = null;
          }
        }
        return origSave();
      };
    }

    // Load on startup — prefer SecureStorage
    (async () => {
      try {
        const key = window.SecureStorage
          ? await SecureStorage.get('procode_anthropic_key')
          : localStorage.getItem('procode_anthropic_key');
        if (key) AnthropicAI.apiKey = key;
      } catch(_) {
        const key = localStorage.getItem('procode_anthropic_key');
        if (key) AnthropicAI.apiKey = key;
      }
    })();
  } catch(_){}
}, 1800);

// ──────────────────────────────────────────────────────────────────────────────
// 20. ENHANCED EDITOR THEMES
// ──────────────────────────────────────────────────────────────────────────────
(function(){
  // ✅ Event-driven Monaco detection — no setInterval polling
  function applyMonacoThemes() {
    if (!window.monaco) return;

    // Dracula Theme
    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token:'comment', foreground:'6272a4', fontStyle:'italic' },
        { token:'keyword', foreground:'ff79c6' },
        { token:'string', foreground:'f1fa8c' },
        { token:'number', foreground:'bd93f9' },
        { token:'type', foreground:'8be9fd' },
        { token:'function', foreground:'50fa7b' },
        { token:'variable', foreground:'f8f8f2' },
        { token:'operator', foreground:'ff79c6' },
      ],
      colors: {
        'editor.background':'#282a36',
        'editor.foreground':'#f8f8f2',
        'editorCursor.foreground':'#f8f8f2',
        'editor.lineHighlightBackground':'#44475a',
        'editorLineNumber.foreground':'#6272a4',
        'editor.selectionBackground':'#44475a',
        'editor.findMatchBackground':'#44475a',
        'editorWidget.background':'#282a36',
        'input.background':'#44475a',
        'focusBorder':'#bd93f9',
      }
    });

    // One Dark Pro Theme
    monaco.editor.defineTheme('one-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token:'comment', foreground:'5c6370', fontStyle:'italic' },
        { token:'keyword', foreground:'c678dd' },
        { token:'string', foreground:'98c379' },
        { token:'number', foreground:'d19a66' },
        { token:'type', foreground:'e5c07b' },
        { token:'function', foreground:'61afef' },
        { token:'variable', foreground:'abb2bf' },
        { token:'operator', foreground:'56b6c2' },
      ],
      colors: {
        'editor.background':'#282c34',
        'editor.foreground':'#abb2bf',
        'editorCursor.foreground':'#528bff',
        'editor.lineHighlightBackground':'#2c313c',
        'editorLineNumber.foreground':'#495162',
        'editor.selectionBackground':'#3e4451',
        'editorWidget.background':'#21252b',
        'input.background':'#1d2026',
        'focusBorder':'#528bff',
      }
    });

    // GitHub Dark
    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token:'comment', foreground:'8b949e', fontStyle:'italic' },
        { token:'keyword', foreground:'ff7b72' },
        { token:'string', foreground:'a5d6ff' },
        { token:'number', foreground:'79c0ff' },
        { token:'type', foreground:'ffa657' },
        { token:'function', foreground:'d2a8ff' },
        { token:'variable', foreground:'e6edf3' },
      ],
      colors: {
        'editor.background':'#0d1117',
        'editor.foreground':'#e6edf3',
        'editorCursor.foreground':'#e6edf3',
        'editor.lineHighlightBackground':'#161b22',
        'editorLineNumber.foreground':'#6e7681',
        'editor.selectionBackground':'#264f78',
        'editorWidget.background':'#161b22',
        'input.background':'#0d1117',
        'focusBorder':'#1f6feb',
      }
    });

    // Monokai
    monaco.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token:'comment', foreground:'75715e', fontStyle:'italic' },
        { token:'keyword', foreground:'f92672' },
        { token:'string', foreground:'e6db74' },
        { token:'number', foreground:'ae81ff' },
        { token:'type', foreground:'66d9e8' },
        { token:'function', foreground:'a6e22e' },
        { token:'variable', foreground:'f8f8f2' },
        { token:'operator', foreground:'f92672' },
      ],
      colors: {
        'editor.background':'#272822',
        'editor.foreground':'#f8f8f2',
        'editorCursor.foreground':'#f8f8f2',
        'editor.lineHighlightBackground':'#3e3d32',
        'editorLineNumber.foreground':'#75715e',
        'editor.selectionBackground':'#49483e',
        'editorWidget.background':'#272822',
        'input.background':'#272822',
        'focusBorder':'#a6e22e',
      }
    });

    console.log('✅ Extra themes loaded: dracula, one-dark, github-dark, monokai');
  }

  // ✅ Event-driven: try now, then listen for monaco ready event, finally fallback once
  applyMonacoThemes();
  window.addEventListener('monaco-ready', applyMonacoThemes, { once: true });
  // FIX: Safety-net poll only — primary path is 'monaco-ready' event above.
  // Interval raised from 300ms to 1000ms; rare path only fires if event was missed.
  if (!window.monaco && !window.__MONACO_READY_FIRED__) {
    const monacoPoller = setInterval(() => {
      if (window.monaco) { clearInterval(monacoPoller); applyMonacoThemes(); }
    }, 1000);
    setTimeout(() => clearInterval(monacoPoller), 15000); // give up after 15s
  }
})();

// ───────────────────────────────────���──────────────────────────────────────────
// 21. ADD EXTRA THEMES TO SETTINGS
// ─────────────────────────────────────────────────────────────────────��────────
setTimeout(() => {
  try {
    const themeContainer = document.querySelector('#settings-appearance .flex.gap-3');
    if (themeContainer && !themeContainer.querySelector('[data-theme="dracula"]')) {
      const extras = [
        { id:'dracula', label:'Dracula', bg:'#282a36', accent:'#bd93f9' },
        { id:'one-dark', label:'One Dark', bg:'#282c34', accent:'#61afef' },
        { id:'github-dark', label:'GH Dark', bg:'#0d1117', accent:'#58a6ff' },
        { id:'monokai', label:'Monokai', bg:'#272822', accent:'#a6e22e' },
      ];
      extras.forEach(({ id, label, bg, accent }) => {
        const div = document.createElement('div');
        div.className = 'theme-option';
        div.dataset.theme = id;
        div.innerHTML = _sanitize(`<div style="width:60px;height:40px;background:${bg};border-radius:6px;border-bottom:3px solid ${accent};"></div><div style="font-size:11px;text-align:center;margin-top:4px;">${label}</div>`);
        div.addEventListener('click', () => {
          document.querySelectorAll('.theme-option').forEach(el=>el.classList.remove('active'));
          div.classList.add('active');
          try { monaco?.editor?.setTheme(id); } catch(_){}
          try { IDE.state.settings.editor.theme = id; } catch(_){}
        });
        themeContainer.appendChild(div);
      });
    }
  } catch(_){}
}, 2200);

// ──────────────────────────────────────────────────────────────────────────────
// 22. PERFORMANCE: DEBOUNCED OUTLINE + FILE TREE UPDATES
// ────────────────────────────────────────────────────────��─────────────────────
(function(){
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  try {
    if (FileSystem && !FileSystem.__mega_outline__) {
      FileSystem.__mega_outline__ = true;
      const origUpdate = FileSystem.updateOutline?.bind(FileSystem);
      if (origUpdate) FileSystem.updateOutline = debounce(origUpdate, 300);
      const origRefresh = FileSystem.refreshTree?.bind(FileSystem);
      if (origRefresh) FileSystem.refreshTree = debounce(origRefresh, 150);
    }
  } catch(_){}
})();

// ──────────────────────────────────────────────────────────────────────────────
// 23. ENHANCED ERROR HANDLER - catch uncaught errors and show in console
// ──────────────────────────────────────────────────────────────────────────────
window.addEventListener('error', (e) => {
  try {
    const msg = `${e.message} (${e.filename}:${e.lineno})`;
    window.Console?.error?.('[Uncaught]', msg);
  } catch(_){}
});
window.addEventListener('unhandledrejection', (e) => {
  try {
    const msg = `Unhandled Promise: ${e.reason?.message || e.reason}`;
    window.Console?.error?.(msg);
  } catch(_){}
});

// ──────────────────────────────────────────────────────────────────────────────
// 24. FINAL: Build string & init log
// ──────────────────────────────────────────────────────────────────────────────
try {
  if (window.IDE && typeof IDE.build === 'string') {
    IDE.build = IDE.build.replace(/\s*\/\s*SUPERPATCH.*$/, '') + 
      ' / MEGAPATCH v20 (2026-03-01) · ZenMode · RealAI · Pomodoro · TODOs · Snippets · Diff · Themes · Stats';
  }
  if (window.IDE && typeof IDE.version === 'string') {
    IDE.version = '∞';
  }
} catch(_){}

// Update boot version shown in header
try {
  document.querySelectorAll('.version').forEach(el => {
    if (!/∞/.test(el.textContent)) el.textContent = '∞ UNIFIED';
  });
  document.querySelectorAll('#boot-status').forEach(el => {
    if (!/UNIFIED/.test(el.textContent)) el.textContent = 'ProCode IDE — UNIFIED EDITION';
  });
} catch(_){}

console.log('%c✅ PRO CODE IDE ∞ UNIFIED EDITION LOADED', 'color:#6366f1;font-weight:bold;font-size:14px;');
// console.log('%c Features: Monaco Editor · Split Pane · Zen Mode · AI Assistant · Pomodoro · TODO Tracker · Snippets · Diff Viewer · Themes · Debug · Git Integration · All Modules', 'color:#a1a1aa;font-size:11px;');

})();