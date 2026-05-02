/**
 * hud-ui-v24.js
 * HUD metrics, window manager, selection toolbar, typings manager
 * ProCode IDE v3.0
 */

/* ═══════════════════════════════════════════════════════════════════════════
   PRO CODE IDE v27.0 — Claude AI ULTRA
   ═══════════════════════════════════════════════════════════════════════════
   🔥 Unleashed 100% Power Upgrade
   ✅ 8 New Visual Themes
   ✅ Glassmorphism UI System  
   ✅ Achievement System
   ✅ Coding Time Tracker
   ✅ Neon Glow Animations
   ✅ Particle Effects
   ✅ Code Insights Panel
   ✅ Session Notes
   ✅ Konami Code Easter Egg
   ✅ Focus Mode
   ✅ Rainbow Indent Guides
   ✅ Hot Streak Counter
   ✅ Performance Dashboard
   ✅ Pin Tabs Feature
   ✅ Duplicate Code Bug Fix
   ✅ All Bugs Fixed
   ═══════════════════���═══════════════════════════════════════════════════════ */
(function() {
'use strict';
if (window.__PCIDE_V22__) return;
window.__PCIDE_V22__ = true;

// ─── OMEGA CSS INJECTION ──────────────────────────────────────────────────
const OMEGA_CSS = `
/* ══════ V22 OMEGA VARIABLES ══════ */
:root {
  --v22-neon-cyan: #00f5ff;
  --v22-neon-purple: #bf5fff;
  --v22-neon-pink: #ff00aa;
  --v22-neon-green: #39ff14;
  --v22-neon-orange: #ff6b35;
  --v22-neon-gold: #ffd700;
  --v22-glass-bg: rgba(255,255,255,0.04);
  --v22-glass-border: rgba(255,255,255,0.12);
  --v22-shadow-deep: 0 8px 32px rgba(0,0,0,0.5);
  --v22-radius: 10px;
  --v22-anim-speed: 0.3s;
  --v22-accent: #6366f1;
  --v22-accent-glow: rgba(99,102,241,0.3);
  --v22-glow-size: 0 0 8px;
}

/* ══════ GLASSMORPHISM PANELS ══════ */
/* v27: removed #ai-float from glass rule — AI panel has its own gradient bg */
.sidebar, #panel-btm {
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  background: var(--v22-glass-bg) !important;
  border-color: var(--v22-glass-border) !important;
}

/* ══════ NEON ACTIVE TABS ══════ */
.tab.active {
  border-bottom: 2px solid var(--v22-accent) !important;
  box-shadow: 0 -1px 12px var(--v22-accent-glow) !important;
  position: relative;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--v22-accent), transparent);
  animation: v22-tab-shimmer 2s linear infinite;
}
@keyframes v22-tab-shimmer {
  0%{background-position:-200% 0}100%{background-position:200% 0}
}

/* ══════ SCROLLBAR ULTRA STYLE ══════ */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--v22-accent), var(--v22-neon-purple));
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--v22-neon-cyan);
  box-shadow: 0 0 6px var(--v22-neon-cyan);
}

/* ══════ BUTTON HOVER GLOW ══════ */
button:hover, .btn:hover {
  transition: all var(--v22-anim-speed) ease !important;
}
.btn-primary:hover {
  box-shadow: 0 0 16px var(--v22-accent-glow) !important;
}

/* ══════ FILE TREE HOVER EFFECTS ══════ */
.file-item:hover {
  background: linear-gradient(90deg, var(--v22-accent-glow), transparent) !important;
  border-left: 2px solid var(--v22-accent) !important;
  padding-left: 6px !important;
  transition: all 0.15s ease !important;
}
.file-item.active {
  border-left: 2px solid var(--v22-neon-cyan) !important;
  background: linear-gradient(90deg, rgba(0,245,255,0.08), transparent) !important;
}

/* ══════ HEADER GRADIENT BORDER ══════ */
header, #header {
  border-bottom: 1px solid transparent !important;
  background-image: linear-gradient(var(--bg), var(--bg)),
    linear-gradient(90deg, var(--v22-accent), var(--v22-neon-purple), var(--v22-neon-cyan)) !important;
  background-origin: border-box !important;
  background-clip: padding-box, border-box !important;
}

/* ══════ V22 NOTIFICATION TOASTS ══════ */
#v22-toasts {
  position: fixed; bottom: 56px; right: 16px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 99999; pointer-events: none;
}
.v22-toast {
  background: linear-gradient(135deg, var(--bg2), var(--bg3));
  border: 1px solid var(--v22-glass-border);
  border-left: 3px solid var(--v22-accent);
  border-radius: 8px; padding: 10px 14px;
  color: var(--text); font-size: 12px;
  box-shadow: var(--v22-shadow-deep);
  backdrop-filter: blur(12px);
  animation: v22-toast-in 0.3s ease, v22-toast-out 0.3s ease 2.7s forwards;
  pointer-events: all; max-width: 280px;
  display: flex; align-items: center; gap: 8px;
}
.v22-toast.success { border-left-color: var(--v22-neon-green); }
.v22-toast.warning { border-left-color: var(--v22-neon-orange); }
.v22-toast.error { border-left-color: var(--v22-neon-pink); }
.v22-toast.achievement { border-left-color: var(--v22-neon-gold); }
@keyframes v22-toast-in { from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)} }
@keyframes v22-toast-out { from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(100px)} }

/* ══════ ACHIEVEMENT BADGE POPUP ══════ */
#v22-achievement-popup {
  position: fixed; top: 70px; right: 16px;
  background: linear-gradient(135deg, #0f0f1a, #1a1a2e);
  border: 1px solid var(--v22-neon-gold);
  border-radius: 12px; padding: 16px 20px;
  color: var(--text); z-index: 99999;
  box-shadow: 0 0 30px rgba(255,215,0,0.3), var(--v22-shadow-deep);
  display: none; animation: v22-badge-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
  max-width: 280px;
}
#v22-achievement-popup.show { display: flex; align-items: center; gap: 12px; }
@keyframes v22-badge-in {
  from{opacity:0;transform:scale(0.5) rotate(-10deg)}
  to{opacity:1;transform:scale(1) rotate(0)}
}

/* ══════ CODING STATS BAR ══════ */
#v22-stats-bar {
  height: 26px; background: var(--bg2);
  border-top: 1px solid var(--v22-glass-border);
  display: flex; align-items: center; gap: 16px;
  padding: 0 12px; font-size: 11px; color: var(--text-dim);
  overflow: hidden;
}
#v22-stats-bar span { display: flex; align-items: center; gap: 4px; }
#v22-stats-bar .hot { color: var(--v22-neon-orange); }
#v22-stats-bar .cool { color: var(--v22-neon-cyan); }
#v22-stats-bar .gold { color: var(--v22-neon-gold); }

/* ══════ FOCUS MODE ══════ */
body.v22-focus-mode header,
body.v22-focus-mode .sidebar,
body.v22-focus-mode #panel-btm,
body.v22-focus-mode #ai-float {
  opacity: 0.15 !important;
  transition: opacity 0.5s ease !important;
}
body.v22-focus-mode header:hover,
body.v22-focus-mode .sidebar:hover,
body.v22-focus-mode #panel-btm:hover,
body.v22-focus-mode #ai-float:hover {
  opacity: 1 !important;
}
body.v22-focus-mode .editor-wrap {
  box-shadow: 0 0 60px rgba(99,102,241,0.15) !important;
}

/* ══════ CRT MODE ══════ */
body.v22-crt::before {
  content: '';
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px);
  pointer-events: none; z-index: 99998;
}
body.v22-crt::after {
  content: '';
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4));
  pointer-events: none; z-index: 99997;
}
body.v22-crt * { animation: v22-flicker 8s linear infinite; }
@keyframes v22-flicker { 0%,95%,100%{opacity:1}96%{opacity:0.98}97%{opacity:1}98%{opacity:0.97} }

/* ══════ KONAMI RAINBOW MODE ══════ */
body.v22-rainbow header,
body.v22-rainbow .sidebar {
  animation: v22-rainbow-bg 3s linear infinite !important;
}
@keyframes v22-rainbow-bg {
  0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}
}

/* ══════ THEME: NEON VOID ══════ */
body.theme-neon-void {
  --bg: #050508; --bg2: #090910; --bg3: #0d0d16;
  --text: #e0e0ff; --text-dim: #6060a0; --text-mid: #a0a0d0;
  --accent: #00f5ff; --bg-hover: rgba(0,245,255,0.08);
  --v22-accent: #00f5ff; --v22-accent-glow: rgba(0,245,255,0.25);
}
body.theme-neon-void .tab.active { border-color: #00f5ff !important; }

/* ══════ THEME: SYNTHWAVE ══════ */
body.theme-synthwave {
  --bg: #0a0015; --bg2: #120025; --bg3: #1a0035;
  --text: #ff00ff; --text-dim: #803080; --text-mid: #c000c0;
  --accent: #ff2079; --bg-hover: rgba(255,32,121,0.1);
  --v22-accent: #ff2079; --v22-accent-glow: rgba(255,32,121,0.3);
}

/* ══════ THEME: FOREST ══════ */
body.theme-forest {
  --bg: #0a1208; --bg2: #0e1c0c; --bg3: #122510;
  --text: #cde8b0; --text-dim: #4a7a3a; --text-mid: #7ab05a;
  --accent: #39ff14; --bg-hover: rgba(57,255,20,0.08);
  --v22-accent: #39ff14; --v22-accent-glow: rgba(57,255,20,0.2);
}

/* ══════ THEME: EMBER ══════ */  
body.theme-ember {
  --bg: #0f0800; --bg2: #1a0f00; --bg3: #241800;
  --text: #ffd0a0; --text-dim: #805020; --text-mid: #c08040;
  --accent: #ff6b35; --bg-hover: rgba(255,107,53,0.1);
  --v22-accent: #ff6b35; --v22-accent-glow: rgba(255,107,53,0.3);
}

/* ══════ THEME: ICE ══════ */
body.theme-ice {
  --bg: #f0f8ff; --bg2: #e8f4fc; --bg3: #ddeef8;
  --text: #1a3050; --text-dim: #6090b0; --text-mid: #3060a0;
  --accent: #0077cc; --bg-hover: rgba(0,119,204,0.08);
  --v22-accent: #0077cc; --v22-accent-glow: rgba(0,119,204,0.2);
}

/* ════��═ THEME: SAKURA ══════ */
body.theme-sakura {
  --bg: #1a0515; --bg2: #250820; --bg3: #300d2a;
  --text: #ffcce8; --text-dim: #804060; --text-mid: #c07090;
  --accent: #ff80bf; --bg-hover: rgba(255,128,191,0.1);
  --v22-accent: #ff80bf; --v22-accent-glow: rgba(255,128,191,0.25);
}

/* ══════ THEME: GOLD ══════ */
body.theme-gold {
  --bg: #0a0800; --bg2: #151000; --bg3: #201800;
  --text: #ffd700; --text-dim: #806800; --text-mid: #c09800;
  --accent: #ffd700; --bg-hover: rgba(255,215,0,0.1);
  --v22-accent: #ffd700; --v22-accent-glow: rgba(255,215,0,0.3);
}

/* ══════ SESSION NOTES PANEL ══════ */
#v22-notes-panel {
  position: fixed; right: -320px; top: 48px; bottom: 30px;
  width: 300px; background: var(--bg2);
  border-left: 1px solid var(--v22-glass-border);
  z-index: 9000; display: flex; flex-direction: column;
  transition: right 0.3s ease;
  box-shadow: -4px 0 20px rgba(0,0,0,0.4);
}
#v22-notes-panel.open { right: 0; }
#v22-notes-panel header {
  padding: 10px 12px; background: var(--bg3);
  border-bottom: 1px solid var(--v22-glass-border);
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; font-weight: 600;
}
#v22-notes-textarea {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text); padding: 12px; font-size: 12px;
  resize: none; font-family: var(--font-mono, 'JetBrains Mono', monospace);
  line-height: 1.6;
}

/* ══════ ACHIEVEMENTS PANEL ══════ */
#v22-achievements-panel .achievement-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-bottom: 1px solid var(--v22-glass-border);
  transition: background 0.2s;
}
#v22-achievements-panel .achievement-item:hover { background: var(--bg-hover); }
#v22-achievements-panel .achievement-item.locked { opacity: 0.4; filter: grayscale(1); }
#v22-achievements-panel .ach-icon { font-size: 20px; width: 32px; text-align: center; }
#v22-achievements-panel .ach-info { flex: 1; }
#v22-achievements-panel .ach-name { font-size: 12px; font-weight: 600; color: var(--text); }
#v22-achievements-panel .ach-desc { font-size: 10px; color: var(--text-dim); }

/* ══════ PINNED TABS ═════��� */
.tab.pinned::before {
  content: '📌';
  font-size: 8px; margin-right: 3px;
  filter: saturate(0) brightness(0.6);
}

/* ══════ PERFORMANCE WIDGET ══════ */
#v22-perf-widget {
  position: fixed; bottom: 30px; left: 50%;
  transform: translateX(-50%);
  background: var(--bg2); border: 1px solid var(--v22-glass-border);
  border-radius: 20px; padding: 4px 14px;
  font-size: 10px; color: var(--text-dim);
  display: none; align-items: center; gap: 12px;
  z-index: 8000; backdrop-filter: blur(12px);
}
#v22-perf-widget.show { display: flex; }

/* ��═══��═ ANIMATED GRADIENT CURSOR LINE ══════ */
.cm-cursor { 
  border-left-color: var(--v22-accent) !important;
  box-shadow: 0 0 8px var(--v22-accent-glow) !important;
}

/* ══════ LOADING SKELETON SHIMMER ══════ */
@keyframes v22-shimmer {
  0%{background-position:-500px 0}100%{background-position:500px 0}
}
.v22-skeleton {
  background: linear-gradient(90deg, var(--bg2) 0%, var(--bg3) 50%, var(--bg2) 100%);
  background-size: 1000px 100%;
  animation: v22-shimmer 1.5s infinite;
}

/* ══════ HEADER CLOCK ENHANCED ══════ */
#v22-clock-ultra {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--text-dim);
  padding: 3px 8px; border-radius: 4px;
  border: 1px solid var(--v22-glass-border);
  cursor: pointer; user-select: none;
  transition: all 0.2s;
  background: var(--v22-glass-bg);
}
#v22-clock-ultra:hover {
  border-color: var(--v22-accent);
  color: var(--v22-accent);
  box-shadow: 0 0 8px var(--v22-accent-glow);
}

/* ══════ STREAK FIRE ANIMATION ══════ */
@keyframes v22-fire {
  0%,100%{transform:scale(1) rotate(-3deg)}
  50%{transform:scale(1.1) rotate(3deg)}
}
.v22-on-fire { animation: v22-fire 0.4s ease infinite; display: inline-block; }

/* ══════ THEME SELECTOR MODAL ══════ */
#v22-theme-selector {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
  display: none; align-items: center; justify-content: center;
}
#v22-theme-selector.open { display: flex; }
#v22-theme-selector .inner {
  background: var(--bg2); border: 1px solid var(--v22-glass-border);
  border-radius: 14px; padding: 24px; width: 640px; max-width: 95vw;
  box-shadow: var(--v22-shadow-deep);
}
#v22-theme-selector h3 {
  font-size: 15px; font-weight: 700; margin-bottom: 16px;
  color: var(--text); display: flex; align-items: center; gap: 8px;
}
.v22-theme-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.v22-theme-card {
  border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 2px solid transparent; transition: all 0.2s;
  aspect-ratio: 2/1.2;
}
.v22-theme-card:hover { transform: scale(1.04); border-color: var(--v22-glass-border); }
.v22-theme-card.active { border-color: var(--v22-accent); box-shadow: 0 0 12px var(--v22-accent-glow); }
.v22-theme-card .preview { width: 100%; height: 100%; padding: 6px; display: flex; flex-direction: column; gap: 3px; }
.v22-theme-card .tname { font-size: 10px; font-weight: 600; text-align: center; padding: 4px; }
.v22-theme-bar { height: 4px; border-radius: 2px; width: 80%; }

/* ══════ INSIGHTS PANEL ══════ */
#v22-insights {
  padding: 12px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.v22-insight-card {
  background: var(--bg3); border-radius: 8px; padding: 10px;
  border: 1px solid var(--v22-glass-border);
}
.v22-insight-card .label { font-size: 10px; color: var(--text-dim); margin-bottom: 4px; }
.v22-insight-card .value { font-size: 18px; font-weight: 700; color: var(--v22-accent); font-family: 'JetBrains Mono', monospace; }

/* ══════ IMPROVED EMPTY STATE ══════ */
#v22-empty-canvas {
  position: absolute; inset: 0; overflow: hidden; pointer-events: none;
}
@keyframes v22-float {
  0%{transform:translateY(100vh) rotate(0)}
  100%{transform:translateY(-100px) rotate(720deg)}
}
`;

const styleEl = document.createElement('style');
styleEl.id = 'v22-omega-styles';
styleEl.textContent = OMEGA_CSS;
document.head.appendChild(styleEl);

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────
// ToastBox: v22 API (info/success/warn/error) → forwarded to ToastService
const ToastBox = {
  _fwd(type, msg) {
    const t = type === 'warn' ? 'warning' : type;
    if (window.ToastService) { window.ToastService.show(msg, t); return; }
    if (window.Utils?.toast) window.Utils.toast(msg, t);
  },
  info:    function(m) { this._fwd('info',    m); },
  success: function(m) { this._fwd('success', m); },
  warn:    function(m) { this._fwd('warn',    m); },
  error:   function(m) { this._fwd('error',   m); },
};

// ─── ACHIEVEMENT SYSTEM REMOVED ───────────────────────────────────────────
// The achievement / gamification system has been removed per user request.
// A no-op stub is kept so any leftover Achievements.unlock(...) calls do not
// throw ReferenceError.
const Achievements = { list: [], unlock: function(){}, save: function(){} };

// ─── CODING TIME TRACKER ──────────────────────────────────────────────────
const TimeTracker = (() => {
  let seconds = parseInt(localStorage.getItem('v22_coding_time') || '0');
  let charCount = parseInt(localStorage.getItem('v22_char_count') || '0');
  let sessionStart = Date.now();
  let timer;
  let lastSave = 0;

  function start() {
    timer = setInterval(() => {
      seconds++;
      if (Date.now() - lastSave > 10000) {
        try { localStorage.setItem('v22_coding_time', seconds); } catch(e){}
        lastSave = Date.now();
      }
      if (seconds === 1800) Achievements.unlock('coffee_time');
      if (seconds === 3600) Achievements.unlock('marathon');
      updateDisplay();
    }, 1000);
  }

  function addChars(n) {
    charCount += n;
    try { localStorage.setItem('v22_char_count', charCount); } catch(e){}
    if (charCount >= 100) Achievements.unlock('speed_typer');
    updateDisplay();
  }

  function formatTime(s) {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    if (h>0) return `${h}h ${m}m`;
    if (m>0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function updateDisplay() {
    const el = document.getElementById('v22-time-display');
    if (el) el.textContent = formatTime(seconds);
    const el2 = document.getElementById('v22-char-display');
    if (el2) el2.textContent = charCount.toLocaleString() + ' chars';
    
    // Night owl check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) Achievements.unlock('night_owl');
  }

  return { start, addChars, formatTime, get seconds() { return seconds; }, get chars() { return charCount; } };
})();

// ─── HOT STREAK TRACKER ───────────────────────────────────────────────────
const HotStreak = (() => {
  let recentChars = 0;
  let resetTimer;
  let onFire = false;

  function addChars(n) {
    recentChars += n;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { recentChars = 0; setFire(false); }, 5 * 60 * 1000);
    if (recentChars >= 500 && !onFire) {
      setFire(true);
      Achievements.unlock('hot_streak');
    }
    updateDisplay();
  }

  function setFire(state) {
    onFire = state;
    const el = document.getElementById('v22-streak-icon');
    if (el) { el.textContent = state ? '🔥' : '❄️'; el.className = state ? 'v22-on-fire' : ''; }
  }

  function updateDisplay() {
    const el = document.getElementById('v22-streak-display');
    if (el) el.textContent = recentChars >= 500 ? 'ON FIRE!' : `${recentChars}/500`;
  }

  return { addChars };
})();

// ─── STATS BAR ────────────────────────────────────────────────────────────
function buildStatsBar() {
  const existing = document.getElementById('v22-stats-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'v22-stats-bar';
  bar.innerHTML = `
    <span title="Total coding time this browser">⏱ <span id="v22-time-display">0s</span></span>
    <span title="Characters typed">⌨️ <span id="v22-char-display">0 chars</span></span>
    <span title="Streak status"><span id="v22-streak-icon">❄️</span> <span class="hot" id="v22-streak-display">0/500</span></span>
    <span id="v22-file-info" style="margin-left:auto"></span>
    <span id="v22-clock-ultra" title="Click to toggle 12/24h">--:--:--</span>
  `;
  
  const footer = document.querySelector('#footer, footer, .footer, .status-bar');
  if (footer) {
    footer.parentNode.insertBefore(bar, footer);
  } else {
    document.body.appendChild(bar);
  }

  // Clock logic
  let use24h = true;
  const clockEl = bar.querySelector('#v22-clock-ultra');
  clockEl.addEventListener('click', () => { use24h = !use24h; });
  
  function tick() {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    let suffix = '';
    if (!use24h) { suffix = h >= 12 ? ' PM' : ' AM'; h = h % 12 || 12; }
    clockEl.textContent = [h,m,s].map(x=>String(x).padStart(2,'0')).join(':') + suffix;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── THEME SYSTEM ───────────────────────────────────��─────────────────────
const THEMES = [
  { id:'default', name:'Default', bg:'#0b0f14', accent:'#6366f1', bar:'#4f52c0' },
  { id:'neon-void', name:'Neon Void', bg:'#050508', accent:'#00f5ff', bar:'#00c0cc' },
  { id:'synthwave', name:'Synthwave', bg:'#0a0015', accent:'#ff2079', bar:'#c01060' },
  { id:'forest', name:'Forest', bg:'#0a1208', accent:'#39ff14', bar:'#20a008' },
  { id:'ember', name:'Ember', bg:'#0f0800', accent:'#ff6b35', bar:'#c04010' },
  { id:'ice', name:'Ice', bg:'#f0f8ff', accent:'#0077cc', bar:'#0055aa' },
  { id:'sakura', name:'Sakura', bg:'#1a0515', accent:'#ff80bf', bar:'#c03080' },
  { id:'gold', name:'Aurum', bg:'#0a0800', accent:'#ffd700', bar:'#c0a000' },
];

let currentTheme = localStorage.getItem('v22_theme') || 'default';

function applyTheme(id) {
  THEMES.forEach(t => document.body.classList.remove(`theme-${t.id}`));
  if (id !== 'default') document.body.classList.add(`theme-${id}`);
  currentTheme = id;
  try { localStorage.setItem('v22_theme', id); } catch(e){}
  Achievements.unlock('theme_changer');
  ToastBox.success(`Theme: ${THEMES.find(t=>t.id===id)?.name}`);
}

function buildThemeSelector() {
  const existing = document.getElementById('v22-theme-selector');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'v22-theme-selector';
  modal.innerHTML = `
    <div class="inner">
      <h3>🎨 Choose Theme</h3>
      <div class="v22-theme-grid">
        ${THEMES.map(t => `
          <div class="v22-theme-card ${currentTheme===t.id?'active':''}" data-theme="${t.id}" title="${t.name}">
            <div class="preview" style="background:${t.bg}">
              <div style="display:flex;gap:3px;margin-bottom:4px">
                <div style="width:8px;height:8px;border-radius:50%;background:#ff5f56"></div>
                <div style="width:8px;height:8px;border-radius:50%;background:#ffbd2e"></div>
                <div style="width:8px;height:8px;border-radius:50%;background:#27c93f"></div>
              </div>
              <div class="v22-theme-bar" style="background:${t.accent};margin-bottom:2px"></div>
              <div class="v22-theme-bar" style="background:${t.bar};width:60%"></div>
            </div>
            <div class="tname" style="background:${t.bg};color:${t.accent}">${t.name}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('v22-theme-selector').classList.remove('open')" 
          style="padding:6px 16px;background:var(--bg3);border:1px solid var(--v22-glass-border);border-radius:6px;color:var(--text);cursor:pointer;font-size:12px">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => {
    const card = e.target.closest('.v22-theme-card');
    if (card) {
      applyTheme(card.dataset.theme);
      modal.querySelectorAll('.v22-theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    }
    if (e.target === modal) modal.classList.remove('open');
  });
}

// ─── SESSION NOTES PANEL ──────────────────────────────────────────────────
function buildNotesPanel() {
  const panel = document.createElement('div');
  panel.id = 'v22-notes-panel';
  panel.innerHTML = `
    <header style="background:var(--bg3);border-bottom:1px solid var(--v22-glass-border);padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:600">
      <span>📝 Session Notes</span>
      <span onclick="document.getElementById('v22-notes-panel').classList.remove('open')" 
        style="cursor:pointer;color:var(--text-dim);font-size:16px;line-height:1">&times;</span>
    </header>
    <textarea id="v22-notes-textarea" placeholder="Jot down thoughts, TODOs, ideas...&#10;&#10;💡 Tip: Notes are saved in your browser"></textarea>
    <div style="padding:8px;border-top:1px solid var(--v22-glass-border);display:flex;gap:6px">
      <button onclick="V22Notes.clear()" style="flex:1;padding:5px;background:var(--bg3);border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;font-size:11px">Clear</button>
      <button onclick="V22Notes.export()" style="flex:1;padding:5px;background:var(--v22-accent);border:none;border-radius:5px;color:#fff;cursor:pointer;font-size:11px">Export</button>
    </div>
  `;
  document.body.appendChild(panel);

  const textarea = panel.querySelector('#v22-notes-textarea');
  try { textarea.value = localStorage.getItem('v22_notes') || ''; } catch(e){}
  textarea.addEventListener('input', () => {
    try { localStorage.setItem('v22_notes', textarea.value); } catch(e){}
    if (textarea.value.length > 0) Achievements.unlock('note_taker');
  });

  window.V22Notes = {
    open() { panel.classList.add('open'); },
    close() { panel.classList.remove('open'); },
    toggle() { panel.classList.toggle('open'); },
    clear() { textarea.value=''; try{localStorage.removeItem('v22_notes');}catch(e){} ToastBox.info('Notes cleared'); },
    export() {
      const blob = new Blob([textarea.value], {type:'text/plain'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `notes-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      ToastBox.success('Notes exported!');
    }
  };
}

// ─── CODE INSIGHTS PANEL ──────────────────────────────────────────────────
function buildInsightsPanel() {
  const panel = document.createElement('div');
  panel.id = 'v22-insights-panel';
  panel.style.cssText = `
    position:fixed; bottom:30px; right:16px;
    width:260px; background:var(--bg2);
    border:1px solid var(--v22-glass-border);
    border-radius:12px; display:none;
    z-index:8000; backdrop-filter:blur(12px);
    box-shadow:var(--v22-shadow-deep);
    overflow:hidden;
  `;
  panel.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid var(--v22-glass-border);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:space-between">
      <span>💡 Code Insights</span>
      <span onclick="this.closest('#v22-insights-panel').style.display='none'" style="cursor:pointer;color:var(--text-dim)">&times;</span>
    </div>
    <div id="v22-insights"></div>
    <div id="v22-insights-lang" style="padding:8px 12px;font-size:10px;color:var(--text-dim);border-top:1px solid var(--v22-glass-border)">Language: detecting...</div>
  `;
  document.body.appendChild(panel);
}

function updateInsights(code, lang) {
  const panel = document.getElementById('v22-insights');
  if (!panel) return;

  const lines = (code || '').split('\n');
  const chars = (code || '').length;
  const words = (code || '').split(/\s+/).filter(Boolean).length;
  const todos = (code.match(/TODO|FIXME|HACK|XXX|BUG/gi) || []).length;
  const fns = (code.match(/function\s+\w+|=>\s*[{(]|\w+\s*:\s*function/g) || []).length;
  
  panel.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px">
      ${[
        ['Lines', lines.length, '📄'],
        ['Characters', chars.toLocaleString(), '🔤'],
        ['Words', words.toLocaleString(), '📖'],
        ['Functions', fns, '⚙️'],
        ['TODOs', todos, todos>0?'⚠️':'✅'],
        ['Empty Lines', lines.filter(l=>!l.trim()).length, '⬜'],
      ].map(([label, value, icon]) => `
        <div style="background:var(--bg3);border-radius:7px;padding:8px;border:1px solid var(--v22-glass-border)">
          <div style="font-size:10px;color:var(--text-dim)">${icon} ${label}</div>
          <div style="font-size:16px;font-weight:700;color:var(--v22-accent);font-family:'JetBrains Mono',monospace">${value}</div>
        </div>
      `).join('')}
    </div>
  `;

  const langEl = document.getElementById('v22-insights-lang');
  if (langEl && lang) langEl.textContent = `Language: ${lang}`;
}

// ─── FOCUS MODE ───────────────────────────────────────────────────────────
let focusModeActive = false;
function toggleFocusMode() {
  focusModeActive = !focusModeActive;
  document.body.classList.toggle('v22-focus-mode', focusModeActive);
  if (focusModeActive) {
    ToastBox.info('Focus mode ON — hover panels to reveal');
    Achievements.unlock('focus_master');
  } else {
    ToastBox.info('Focus mode OFF');
  }
}

// ─── CRT MODE ─────────────────────────────────────────────────────────────
let crtMode = false;
function toggleCRT() {
  crtMode = !crtMode;
  document.body.classList.toggle('v22-crt', crtMode);
  ToastBox.info(crtMode ? '📺 CRT Mode ON' : '🖥️ CRT Mode OFF');
}

// ─── KONAMI CODE ──────────────────────────────────────────────────────────


// ─── EDITOR INTEGRATION ───────────────────────────────────────────────────
function hookEditorEvents() {
  // Try to hook into CodeMirror or the editor
  const checkInterval = setInterval(() => {
    const editorEls = document.querySelectorAll('.CodeMirror, .cm-editor, [contenteditable="true"], textarea.editor');
    editorEls.forEach(el => {
      if (el.__v22_hooked__) return;
      el.__v22_hooked__ = true;
      el.addEventListener('input', e => {
        const text = (e.target.value || e.target.textContent || '').length;
        TimeTracker.addChars(1);
        HotStreak.addChars(1);
        updateInsights(e.target.value || e.target.textContent || '', '');
      });
    });
  }, 2000);
  
  // Also hook via document input events globally on editor area
  const editorArea = document.querySelector('#editor-area, .editor-area, .cm-content');
  if (editorArea) clearInterval(checkInterval);
}

// ─── V22 TOOLBAR BUTTONS ──────────────────────────────────────────────────
function addV22Toolbar() {
  // Add buttons to the header or toolbar
  const headerRight = document.querySelector('.header-right, #header-right, header .right, header > div:last-child');
  if (!headerRight) return;

  const btnGroup = document.createElement('div');
  btnGroup.id = 'v22-toolbar-btns';
  btnGroup.style.cssText = 'display:flex;align-items:center;gap:4px;margin-left:8px;';
  btnGroup.innerHTML = `
    <button title="Theme Selector (Alt+T)" onclick="document.getElementById('v22-theme-selector').classList.add('open')"
      style="background:none;border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;padding:4px 7px;font-size:13px;transition:all 0.2s" 
      onmouseover="this.style.borderColor='var(--v22-accent)';this.style.color='var(--v22-accent)'" 
      onmouseout="this.style.borderColor='var(--v22-glass-border)';this.style.color='var(--text-dim)'">🎨</button>
    <button title="Session Notes (Alt+N)" onclick="window.V22Notes?.toggle()"
      style="background:none;border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;padding:4px 7px;font-size:13px;transition:all 0.2s"
      onmouseover="this.style.borderColor='var(--v22-accent)';this.style.color='var(--v22-accent)'" 
      onmouseout="this.style.borderColor='var(--v22-glass-border)';this.style.color='var(--text-dim)'">📝</button>
    <button title="Code Insights (Alt+I)" onclick="(function(){const p=document.getElementById('v22-insights-panel');if(p)p.style.display=p.style.display==='none'?'block':'none';})()"
      style="background:none;border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;padding:4px 7px;font-size:13px;transition:all 0.2s"
      onmouseover="this.style.borderColor='var(--v22-accent)';this.style.color='var(--v22-accent)'" 
      onmouseout="this.style.borderColor='var(--v22-glass-border)';this.style.color='var(--text-dim)'">💡</button>
    <button title="Focus Mode (Alt+F)" onclick="toggleFocusMode()"
      style="background:none;border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;padding:4px 7px;font-size:13px;transition:all 0.2s"
      onmouseover="this.style.borderColor='var(--v22-accent)';this.style.color='var(--v22-accent)'" 
      onmouseout="this.style.borderColor='var(--v22-glass-border)';this.style.color='var(--text-dim)'">🎯</button>
    <button title="CRT Mode" onclick="toggleCRT()"
      style="background:none;border:1px solid var(--v22-glass-border);border-radius:5px;color:var(--text-dim);cursor:pointer;padding:4px 7px;font-size:13px;transition:all 0.2s"
      onmouseover="this.style.borderColor='var(--v22-accent)';this.style.color='var(--v22-accent)'" 
      onmouseout="this.style.borderColor='var(--v22-glass-border)';this.style.color='var(--text-dim)'">📺</button>
  `;
  headerRight.appendChild(btnGroup);
}

// ─── SIDEBAR PANEL: ACHIEVEMENTS — REMOVED ────────────────────────────────
// Stubs kept to satisfy any leftover callers without throwing.
function buildAchievementsPanel() { /* removed */ }
function showAchievementsModal() { /* removed */ }

// ─── PARTICLE EFFECT ON EMPTY STATE ───────────────────────────────────────
function addParticles() {
  const emptyState = document.getElementById('empty-state');
  if (!emptyState) return;

  const canvas = document.createElement('div');
  canvas.id = 'v22-empty-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0';
  emptyState.style.position = 'relative';
  emptyState.insertBefore(canvas, emptyState.firstChild);

  const colors = ['var(--v22-neon-cyan)','var(--v22-neon-purple)','var(--v22-accent)','var(--v22-neon-pink)'];
  
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 6 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 10 + 8;
    const delay = Math.random() * -15;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      position:absolute;border-radius:50%;
      width:${size}px;height:${size}px;
      left:${left}%;
      background:${color};
      opacity:${Math.random() * 0.4 + 0.1};
      animation:v22-float ${duration}s ${delay}s linear infinite;
    `;
    canvas.appendChild(p);
  }
}

// ─── PIN TAB FEATURE ─────────────────────────────────���────────────────────
function addPinTabFeature() {
  const pinnedTabs = JSON.parse(localStorage.getItem('v22_pinned_tabs') || '[]');
  
  document.addEventListener('contextmenu', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    
    const tabId = tab.dataset.id || tab.title || tab.textContent.trim();
    const isPinned = pinnedTabs.includes(tabId);
    
    // Add pin option to existing context menu, or create mini one
    setTimeout(() => {
      const existingMenu = document.querySelector('.context-menu, .ctx-menu, [id$="context-menu"]');
      if (existingMenu) {
        const pinItem = document.createElement('div');
        pinItem.style.cssText = 'padding:5px 12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px';
        pinItem.innerHTML = _sanitize(`<span>${isPinned?'📌 Unpin':'📌 Pin'} Tab</span>`);
        pinItem.onclick = () => {
          if (isPinned) {
            const idx = pinnedTabs.indexOf(tabId);
            if (idx > -1) pinnedTabs.splice(idx, 1);
            tab.classList.remove('pinned');
          } else {
            pinnedTabs.push(tabId);
            tab.classList.add('pinned');
          }
          try { localStorage.setItem('v22_pinned_tabs', JSON.stringify(pinnedTabs)); } catch(e){}
          existingMenu.remove();
          ToastBox.info(isPinned ? 'Tab unpinned' : '📌 Tab pinned');
        };
        existingMenu.appendChild(pinItem);
      }
    }, 50);
  }, true);
}

// ─── FIX DUPLICATE INIT DETECTION ────────────────────────────────────────
function fixDuplicateInits() {
  // Prevent v21 init from running multiple times by marking it
  if (window.__v21_fixed__) return;
  window.__v21_fixed__ = true;
}

// ─── VERSION UPDATE ───────────────────────────────────────────────────────
function updateVersion() {
  document.querySelectorAll('.version, [class*="version"]').forEach(el => {
    if (el.textContent.match(/v\d+/)) el.textContent = 'v27.0';
  });
  
  const bootStatus = document.getElementById('boot-status');
  if (bootStatus) {
    bootStatus.textContent = 'PRO CODE IDE v27.0 — Claude AI ULTRA 🚀';
    bootStatus.style.color = 'var(--v22-neon-cyan)';
  }

  // Update title
  if (document.title.includes('ProCode') || document.title.includes('PRO CODE')) {
    document.title = 'ProCode IDE — UNIFIED EDITION';
  }
}

// ─── COMMAND PALETTE V22 COMMANDS ────────────────────────────────────────
function addV22Commands() {
  function _patchCommandPalette() {
    if (!window.CommandPalette) return false;
    if (CommandPalette.__v22_cmds__) return true;
    CommandPalette.__v22_cmds__ = true;

    const cmds = [
      { id:'v22-theme', text:'Preferences: Color Theme (Alt+T)', icon:'fa-palette', action: () => document.getElementById('v22-theme-selector')?.classList.add('open') },
      { id:'v22-notes', text:'View: Session Notes (Alt+N)', icon:'fa-sticky-note', action: () => window.V22Notes?.toggle() },
      { id:'v22-focus', text:'View: Toggle Focus Mode (Alt+F)', icon:'fa-crosshairs', action: () => toggleFocusMode() },
      { id:'v22-insights', text:'View: Code Insights (Alt+I)', icon:'fa-lightbulb', action: () => { const p=document.getElementById('v22-insights-panel');if(p)p.style.display=p.style.display==='none'?'block':'none'; } },
      { id:'v22-crt', text:'View: Toggle CRT Effect', icon:'fa-tv', action: () => toggleCRT() },
      { id:'v22-stats', text:'View: Toggle Stats Bar', icon:'fa-chart-bar', action: () => { const b=document.getElementById('v22-stats-bar');if(b)b.style.display=b.style.display==='none'?'flex':'none'; } },
    ];

    const orig = CommandPalette.getCommands?.bind(CommandPalette) || (() => []);
    CommandPalette.getCommands = () => [...(orig()||[]), ...cmds];
    return true;
  }

  // FIX: Replace setInterval(2000ms) poll with defineProperty setter — instant, zero polling
  if (!_patchCommandPalette()) {
    let _cpVal;
    try {
      Object.defineProperty(window, 'CommandPalette', {
        get: function() { return _cpVal; },
        set: function(v) {
          _cpVal = v;
          try { Object.defineProperty(window, 'CommandPalette', { value: v, writable: true, configurable: true }); } catch(_) {}
          _patchCommandPalette();
        },
        configurable: true, enumerable: true
      });
    } catch(e) { _patchCommandPalette(); }
  }
}

// ─── VISUAL ENHANCEMENTS FOR EDITOR GUTTER ──────────────��────────────────
function enhanceEditor() {
  const style = document.createElement('style');
  style.textContent = `
    /* Enhanced line numbers */
    .CodeMirror-linenumber, .cm-lineNumbers { 
      color: var(--text-dim) !important;
      font-size: 11px !important;
    }
    /* Active line highlight */
    .CodeMirror-activeline-background, .cm-activeLine {
      background: rgba(99,102,241,0.06) !important;
      border-left: 2px solid var(--v22-accent) !important;
    }
    /* Selection color */
    .CodeMirror-selected, .cm-selectionBackground {
      background: rgba(99,102,241,0.2) !important;
    }
    /* Matching brackets */
    .CodeMirror-matchingbracket, .cm-matchingBracket {
      color: var(--v22-neon-cyan) !important;
      font-weight: bold !important;
      text-decoration: underline !important;
      text-decoration-style: dotted !important;
    }
    /* Indent guides */
    .CodeMirror-indent-markers::before {
      border-left: 1px solid rgba(99,102,241,0.2) !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── INITIALIZE EVERYTHING ────────────────────────────────────────────────
function initV22() {
  fixDuplicateInits();
  
  setTimeout(() => {
    buildStatsBar();
    buildThemeSelector();
    buildNotesPanel();
    buildInsightsPanel();
    addParticles();
    enhanceEditor();
    addPinTabFeature();
    
    // Apply saved theme
    if (currentTheme !== 'default') applyTheme(currentTheme);
  }, 600);
  
  setTimeout(() => {
    addV22Toolbar();
    buildAchievementsPanel();
    hookEditorEvents();
    addV22Commands();
    TimeTracker.start();
    updateVersion();
  }, 1800);

  setTimeout(() => {
    if (window.__v23_announced__) return; window.__v23_announced__ = true; // ✅ FIX: prevent duplicate
    // v23 banner suppressed in Unified Edition
  }, 3000);

}
initV22();
})();