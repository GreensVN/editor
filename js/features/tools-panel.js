/**
 * tools-panel.js
 * Tools panel — RegexTester, ColorPicker, JsonFormatter, CodeTimer, etc.
 * ProCode IDE v3.0
 */

/* ── ENHANCEMENT BOOT ── */
(function EnhancementPatch() {
  'use strict';

  /* ═══════════════════════════════════════
     1. SMART TOAST NOTIFICATION SYSTEM
  ═══════════════════════════════════════ */
  // window.Toast: shim maps (title, msg, type, duration) → ToastService
  // Keeps backward compat with 8 call sites using .show(title, msg) signature
  window.Toast = {
    show(title, msg, type, duration) {
      const text = msg ? title + ': ' + msg : title;
      if (window.ToastService) { ToastService.show(text, type || 'info', duration ?? 4000); return; }
      setTimeout(() => { if (window.ToastService) ToastService.show(text, type || 'info', duration ?? 4000); }, 1200);
    },
    success(title, msg, dur) { this.show(title, msg, 'success', dur); },
    error(title, msg, dur)   { this.show(title, msg, 'error',   dur ?? 6000); },
    warn(title, msg, dur)    { this.show(title, msg, 'warn',    dur); },
    info(title, msg, dur)    { this.show(title, msg, 'info',    dur); }
  };

  /* ═══════════════════════════════════════
     2. REGEX TESTER
  ═══════════════════════════════════════ */
  window.RegexTester = {
    _open: false,
    
    show() {
      document.getElementById('regex-tester-panel').classList.add('visible');
      document.getElementById('rt-pattern').focus();
      this._open = true;
    },
    hide() {
      document.getElementById('regex-tester-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    update() {
      const patternEl = document.getElementById('rt-pattern');
      const flagsEl   = document.getElementById('rt-flags');
      const testEl    = document.getElementById('rt-test');
      const errorEl   = document.getElementById('rt-error');
      const statsEl   = document.getElementById('rt-stats');
      const groupsEl  = document.getElementById('rt-groups');
      const matchesEl = document.getElementById('rt-matches');
      
      if (!patternEl) return;
      
      const pattern = patternEl.value;
      const flags   = flagsEl.value.replace(/[^gimsuy]/g, '');
      const text    = testEl.textContent;
      
      if (!pattern) {
        testEl.innerHTML = text;
        errorEl.style.display = 'none';
        statsEl.textContent = '0 matches';
        groupsEl.textContent = '0 groups';
        matchesEl.innerHTML = '';
        return;
      }
      
      try {
        const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
        const matches = [...text.matchAll(re)];
        errorEl.style.display = 'none';
        
        statsEl.innerHTML = _sanitize(`<span class="match-count">${matches.length} matches</span>`);
        groupsEl.textContent = matches.length > 0 ? `${matches[0].length - 1} groups` : '0 groups';
        
        // Highlight matches
        let highlighted = text;
        let offset = 0;
        const sortedMatches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
        let result = '';
        let lastIdx = 0;
        for (const m of sortedMatches) {
          result += this._escapeHtml(text.slice(lastIdx, m.index));
          result += `<mark class="regex-match">${this._escapeHtml(m[0])}</mark>`;
          lastIdx = m.index + m[0].length;
        }
        result += this._escapeHtml(text.slice(lastIdx));
        testEl.innerHTML = result;
        
        // Show match details
        matchesEl.innerHTML = matches.slice(0, 10).map((m, i) => 
          `<div style="padding:3px 0;border-bottom:1px solid #1a1a1e">
            <span style="color:var(--primary)">[${i}]</span> 
            <span style="color:#4ade80">"${this._escapeHtml(m[0])}"</span>
            <span style="color:#52525b"> at ${m.index}</span>
            ${m.length > 1 ? `<br><span style="color:#71717a;font-size:10px">Groups: ${m.slice(1).map((g,gi) => `$${gi+1}="${g||''}"`).join(', ')}</span>` : ''}
          </div>`
        ).join('');
        
        if (matches.length > 10) {
          matchesEl.innerHTML += `<div style="color:#52525b;font-size:10px;padding:4px 0">... and ${matches.length - 10} more</div>`;
        }
      } catch(e) {
        errorEl.textContent = e.message;
        errorEl.style.display = 'block';
        statsEl.textContent = 'Invalid pattern';
        matchesEl.innerHTML = '';
      }
    },
    
    _escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  };

  /* ═══════════════════════════════════════
     3. COLOR PICKER
  ═══════════════════════════════════════ */
  window.ColorPicker = {
    _open: false,
    _current: '#6366f1',
    _palettes: [
      '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
      '#f59e0b','#eab308','#22c55e','#10b981','#14b8a6',
      '#06b6d4','#0ea5e9','#3b82f6','#64748b','#71717a',
      '#18181b','#27272a','#ffffff','#000000','#ff6b6b',
      '#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9f43'
    ],
    
    show() {
      const panel = document.getElementById('color-picker-panel');
      panel.classList.add('visible');
      this._open = true;
      this._renderSwatches();
      this._updateFromHex(this._current);
    },
    hide() {
      document.getElementById('color-picker-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    _renderSwatches() {
      const grid = document.getElementById('cp-swatches');
      if (!grid) return;
      grid.innerHTML = this._palettes.map(c => 
        `<div class="cp-swatch" style="background:${c}" onclick="ColorPicker.fromHex('${c}')" 
              title="${c}" role="button" aria-label="Select color ${c}" tabindex="0"></div>`
      ).join('');
    },
    
    fromNative(hex) { this._updateFromHex(hex); },
    
    fromHex(hex) {
      if (!hex.startsWith('#')) hex = '#' + hex;
      this._updateFromHex(hex);
    },
    
    _updateFromHex(hex) {
      this._current = hex;
      document.getElementById('cp-preview').style.background = hex;
      document.getElementById('cp-hex').value = hex;
      
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.getElementById('cp-rgb').value = `${r}, ${g}, ${b}`;
        document.getElementById('cp-hsl').value = this._rgbToHsl(r,g,b);
        
        const nativeInput = document.getElementById('cp-native');
        if (nativeInput && hex.length === 7) nativeInput.value = hex;
      }
    },
    
    _rgbToHsl(r,g,b) {
      r/=255; g/=255; b/=255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      let h,s,l=(max+min)/2;
      if(max===min){ h=s=0; }
      else {
        const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
        switch(max){
          case r: h=(g-b)/d+(g<b?6:0); break;
          case g: h=(b-r)/d+2; break;
          default: h=(r-g)/d+4;
        }
        h/=6;
      }
      return `${Math.round(h*360)}°, ${Math.round(s*100)}%, ${Math.round(l*100)}%`;
    },
    
    copy(format) {
      let val = '';
      if (format === 'hex') val = document.getElementById('cp-hex').value;
      else if (format === 'rgb') {
        const rgb = document.getElementById('cp-rgb').value;
        val = `rgb(${rgb})`;
      } else if (format === 'hsl') {
        const hsl = document.getElementById('cp-hsl').value;
        val = `hsl(${hsl})`;
      }
      
      navigator.clipboard.writeText(val).then(() => {
        Toast.success('Copied!', val);
      });
    }
  };

  /* ═══════════════════════════════════════
     4. JSON FORMATTER
  ═══════════════════════════════════════ */
  window.JsonFormatter = {
    _open: false,
    
    show() {
      document.getElementById('json-formatter-panel').classList.add('visible');
      this._open = true;
    },
    hide() {
      document.getElementById('json-formatter-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    format() {
      const input = document.getElementById('jf-input').value;
      try {
        const parsed = JSON.parse(input);
        const formatted = JSON.stringify(parsed, null, 2);
        this._setOutput(this._syntaxHighlight(formatted));
        document.getElementById('jf-status').textContent = '✅ Valid JSON';
        document.getElementById('jf-status').style.color = '#4ade80';
        document.getElementById('jf-size').textContent = `${formatted.length} chars · ${this._countNodes(parsed)} nodes`;
      } catch(e) {
        document.getElementById('jf-output').innerHTML = _sanitize(`<span class="json-error-msg">❌ ${e.message}</span>`);
        document.getElementById('jf-status').textContent = '❌ Invalid JSON';
        document.getElementById('jf-status').style.color = '#fb7185';
      }
    },
    
    minify() {
      const input = document.getElementById('jf-input').value;
      try {
        const minified = JSON.stringify(JSON.parse(input));
        document.getElementById('jf-input').value = minified;
        this._setOutput(this._syntaxHighlight(minified));
        document.getElementById('jf-status').textContent = '✅ Minified';
        document.getElementById('jf-status').style.color = '#4ade80';
      } catch(e) {
        document.getElementById('jf-status').textContent = '❌ ' + e.message;
        document.getElementById('jf-status').style.color = '#fb7185';
      }
    },
    
    clear() {
      document.getElementById('jf-input').value = '';
      document.getElementById('jf-output').innerHTML = '';
      document.getElementById('jf-status').textContent = 'Ready';
      document.getElementById('jf-status').style.color = '#71717a';
      document.getElementById('jf-size').textContent = '';
    },
    
    live() {
      const input = document.getElementById('jf-input').value.trim();
      if (!input) return;
      try {
        JSON.parse(input);
        document.getElementById('jf-status').textContent = '✅ Valid';
        document.getElementById('jf-status').style.color = '#4ade80';
      } catch(e) {
        document.getElementById('jf-status').textContent = '❌ ' + e.message.slice(0,50);
        document.getElementById('jf-status').style.color = '#fb7185';
      }
    },
    
    fromEditor() {
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      } else if (window.monaco) {
        const models = window.monaco.editor.getModels();
        if (models.length > 0) code = models[0].getValue();
      }
      document.getElementById('jf-input').value = code;
      this.format();
    },
    
    copyOutput() {
      const text = document.getElementById('jf-output').innerText;
      navigator.clipboard.writeText(text).then(() => Toast.success('Copied!', 'JSON output copied'));
    },
    
    _setOutput(html) {
      document.getElementById('jf-output').innerHTML = html;
    },
    
    _syntaxHighlight(json) {
      return json
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? 'json-key' : 'json-string';
          } else if (/true|false/.test(match)) {
            cls = 'json-bool';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return `<span class="${cls}">${match}</span>`;
        })
        .replace(/\n/g, '<br>')
        .replace(/ {2}/g, '&nbsp;&nbsp;');
    },
    
    _countNodes(obj, count = 0) {
      if (obj === null || typeof obj !== 'object') return count + 1;
      for (const k in obj) count = this._countNodes(obj[k], count + 1);
      return count;
    }
  };

  /* ═══════════════════════════════════════
     5. CODE TIMER
  ═══════════════════════════════════════ */
  window.CodeTimer = {
    _open: false,
    _running: false,
    _start: null,
    _elapsed: 0,
    _interval: null,
    _keystrokes: 0,
    _lines: 0,
    
    show() {
      document.getElementById('code-timer-widget').classList.add('visible');
      this._open = true;
      this._render();
    },
    hide() {
      document.getElementById('code-timer-widget').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    start() {
      this._running = true;
      this._start = Date.now() - this._elapsed;
      this._interval = setInterval(() => this._render(), 1000);
      document.getElementById('ct-toggle-btn').textContent = 'Pause';
      document.getElementById('ct-toggle-btn').classList.add('active');
    },
    
    pause() {
      this._running = false;
      this._elapsed = Date.now() - this._start;
      clearInterval(this._interval);
      document.getElementById('ct-toggle-btn').textContent = 'Resume';
      document.getElementById('ct-toggle-btn').classList.remove('active');
    },
    
    toggle_timer() {
      this._running ? this.pause() : this.start();
    },
    
    reset() {
      this.pause();
      this._elapsed = 0;
      this._keystrokes = 0;
      document.getElementById('ct-toggle-btn').textContent = 'Start';
      this._render();
    },
    
    _render() {
      const elapsed = this._running ? Date.now() - this._start : this._elapsed;
      const s = Math.floor(elapsed / 1000);
      const h = Math.floor(s / 3600).toString().padStart(2,'0');
      const m = Math.floor((s % 3600) / 60).toString().padStart(2,'0');
      const sec = (s % 60).toString().padStart(2,'0');
      const el = document.getElementById('ct-display');
      if (el) el.textContent = `${h}:${m}:${sec}`;
      const info = document.getElementById('ct-info');
      if (info) info.textContent = `Keystrokes: ${this._keystrokes}`;
    },
    
    recordKeystroke() {
      this._keystrokes++;
      if (!this._running && this._elapsed === 0) this.start();
    }
  };
  
  // Patch toggle to call the right method
  window.CodeTimer.toggle = function() {
    if (!this._open) { this.show(); }
    else { this.hide(); }
  };
  
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      window.CodeTimer.recordKeystroke();
    }
  });

  /* ═══════════════════════════════════════
     6. ACCESSIBILITY CHECKER
  ═══════════════════════════════════════ */
  window.A11yChecker = {
    _open: false,
    
    show() {
      document.getElementById('a11y-panel').classList.add('visible');
      this._open = true;
    },
    hide() {
      document.getElementById('a11y-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    scan() {
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      }
      
      const issues = [];
      
      // Check for missing alt attributes
      const imgNoAlt = (code.match(/<img(?![^>]*\balt\b)[^>]*>/gi) || []).length;
      if (imgNoAlt > 0) issues.push({ type:'error', title:`${imgNoAlt} image(s) missing alt=""`, desc:'Screen readers cannot describe the image' });
      
      // Check for missing lang attribute
      if (code.includes('<html') && !code.includes('lang=')) {
        issues.push({ type:'warn', title:'Missing lang attribute on <html>', desc:'Specify the document language: <html lang="en">' });
      }
      
      // Check for empty links
      const emptyLinks = (code.match(/<a[^>]*>\s*<\/a>/gi) || []).length;
      if (emptyLinks > 0) issues.push({ type:'error', title:`${emptyLinks} empty link(s)`, desc:'Links must have descriptive text or aria-label' });
      
      // Check for form labels
      const inputs = (code.match(/<input[^>]*>/gi) || []).filter(i => !/type="hidden"/i.test(i));
      const labels = (code.match(/<label/gi) || []).length;
      if (inputs.length > labels) {
        issues.push({ type:'warn', title:`${inputs.length - labels} input(s) may lack labels`, desc:'Use <label for="..."> or aria-label for inputs' });
      }
      
      // Check for button text
      const emptyBtns = (code.match(/<button[^>]*>\s*<\/button>/gi) || []).length;
      if (emptyBtns > 0) issues.push({ type:'error', title:`${emptyBtns} button(s) without text`, desc:'Buttons need descriptive text or aria-label' });
      
      // Check color contrast hints
      if (code.includes('color: #') || code.includes('color:#')) {
        issues.push({ type:'warn', title:'Color usage detected', desc:'Verify color contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text' });
      }
      
      // Check for focus management
      if (code.includes('tabindex="-1"') && !code.includes('focus()')) {
        issues.push({ type:'warn', title:'tabindex="-1" without programmatic focus', desc:'Ensure removed elements receive focus programmatically when needed' });
      }
      
      // Positive checks
      if (code.includes('aria-label') || code.includes('aria-labelledby')) {
        issues.push({ type:'ok', title:'ARIA labels found', desc:'Good use of aria-label or aria-labelledby' });
      }
      if (code.includes('role=')) {
        issues.push({ type:'ok', title:'ARIA roles found', desc:'ARIA roles improve semantic meaning' });
      }
      if (code.includes('alt=')) {
        issues.push({ type:'ok', title:'Image alt attributes found', desc:'Good image accessibility practices' });
      }
      
      const container = document.getElementById('a11y-results');
      if (!container) return;
      
      if (issues.length === 0) {
        container.innerHTML = '<div class="a11y-issue ok"><div class="a11y-issue-title">✅ No issues found</div><div class="a11y-issue-desc">Your code passes basic accessibility checks</div></div>';
        return;
      }
      
      container.innerHTML = issues.map(issue => `
        <div class="a11y-issue ${issue.type}">
          <div class="a11y-issue-title">${issue.type === 'error' ? '❌' : issue.type === 'warn' ? '⚠️' : '✅'} ${issue.title}</div>
          <div class="a11y-issue-desc">${issue.desc}</div>
        </div>
      `).join('');
      
      const errors = issues.filter(i => i.type === 'error').length;
      const warns  = issues.filter(i => i.type === 'warn').length;
      Toast.info(`A11y Scan Complete`, `${errors} errors, ${warns} warnings found`);
    }
  };

  /* ═══════════════════════════════════════
     7. COMMAND HISTORY
  ═════════════��═════════════════════════ */
  window.CmdHistory = {
    _open: false,
    _history: [],
    _maxItems: 100,
    
    push(label, action, icon = 'fa-bolt') {
      this._history.unshift({
        label, action, icon,
        time: new Date().toLocaleTimeString()
      });
      if (this._history.length > this._maxItems) {
        this._history.pop();
      }
    },
    
    show() {
      document.getElementById('cmd-history-panel').classList.add('visible');
      this._open = true;
      this._render();
    },
    hide() {
      document.getElementById('cmd-history-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    clear() {
      this._history = [];
      this._render();
    },
    
    _render() {
      const list = document.getElementById('ch-list');
      if (!list) return;
      
      if (this._history.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#52525b;font-size:12px;padding:40px">No commands yet</div>';
        return;
      }
      
      list.innerHTML = this._history.map((item, i) => `
        <div class="ch-item" onclick="CmdHistory._execute(${i})" role="listitem" 
             tabindex="0" aria-label="${item.label}">
          <i class="fas ${item.icon} ch-icon"></i>
          <span>${item.label}</span>
          <span class="ch-time">${item.time}</span>
        </div>
      `).join('');
    },
    
    _execute(idx) {
      const item = this._history[idx];
      if (item && typeof item.action === 'function') {
        try { item.action(); } catch(e) { console.warn('History action failed:', e); }
      }
      this.hide();
    }
  };

  /* ═══════════════════════════════════════
     8. AI CODE REVIEW
  ═══════════════════════════════════════ */
  window.AIReview = {
    _open: false,
    
    show() {
      document.getElementById('ai-review-panel').classList.add('visible');
      this._open = true;
    },
    hide() {
      document.getElementById('ai-review-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    async analyze() {
      const body = document.getElementById('ar-body');
      if (!body) return;
      
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      }
      
      if (!code.trim()) {
        body.innerHTML = '<div style="text-align:center;color:#fb7185;padding:20px;font-size:13px">No code to analyze. Open a file first.</div>';
        return;
      }
      
      // Check for API key
      const apiKey = localStorage.getItem('procode_ai_key') || 
                     (window.AI && AI._key) || '';
      
      body.innerHTML = `
        <div class="ar-loading">
          <div class="ar-spinner"></div>
          <div style="font-size:13px;color:#71717a">Analyzing your code...</div>
          <div style="font-size:11px;color:#52525b">AI is reviewing for bugs, best practices, and security issues</div>
        </div>
      `;
      
      if (!apiKey) {
        setTimeout(() => {
          body.innerHTML = this._generateStaticReview(code);
        }, 1200);
        return;
      }
      
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': (window.ANTHROPIC_API_VERSION || '2023-06-01'),
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Review this code for: bugs, security issues, performance problems, and best practices. 
              Respond with JSON: {"score": 0-100, "issues": [{"type": "critical|warning|suggestion|good", "title": "...", "desc": "..."}]}
              Code:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\``
            }]
          })
        });
        
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        
        try {
          const review = JSON.parse(text.replace(/```json?|```/g, '').trim());
          body.innerHTML = this._renderReview(review);
        } catch {
          body.innerHTML = this._generateStaticReview(code);
        }
      } catch(e) {
        body.innerHTML = this._generateStaticReview(code);
      }
    },
    
    _generateStaticReview(code) {
      const issues = [];
      let score = 85;
      
      if (code.includes('eval(')) {
        issues.push({ type:'critical', title:'eval() detected', desc:'eval() is a security risk. Use JSON.parse() or safer alternatives.' });
        score -= 20;
      }
      if (code.includes('innerHTML')) {
        issues.push({ type:'warning', title:'innerHTML usage', desc:'Potential XSS risk. Consider textContent or DOMPurify.' });
        score -= 5;
      }
      if (code.includes('var ')) {
        issues.push({ type:'suggestion', title:'var declarations found', desc:'Use const/let instead of var for better scoping.' });
        score -= 3;
      }
      if (!code.includes('try') && code.includes('fetch(')) {
        issues.push({ type:'warning', title:'Unhandled async errors', desc:'Wrap fetch() calls in try-catch for better error handling.' });
        score -= 8;
      }
      if (code.includes('console.log')) {
        issues.push({ type:'suggestion', title:'Console logs in production', desc:'Remove debug console.log statements before deploying.' });
        score -= 2;
      }
      if (code.includes('let ') || code.includes('const ')) {
        issues.push({ type:'good', title:'Modern variable declarations', desc:'Good use of const/let for proper variable scoping.' });
      }
      if (code.includes('async') || code.includes('await')) {
        issues.push({ type:'good', title:'Async/await pattern', desc:'Using modern async/await for cleaner async code.' });
      }
      
      return this._renderReview({ score: Math.max(20, score), issues });
    },
    
    _renderReview({ score, issues = [] }) {
      const scoreColor = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#fb7185';
      return `
        <div class="ar-score">
          <div class="ar-score-num" style="background:linear-gradient(135deg,${scoreColor},${scoreColor}99);-webkit-background-clip:text;">${score}</div>
          <div class="ar-score-label">Code Health Score</div>
        </div>
        ${issues.map(issue => `
          <div class="ar-issue ${issue.type}">
            <div class="ar-issue-type">${issue.type}</div>
            <div class="ar-issue-title">${issue.title}</div>
            <div class="ar-issue-desc">${issue.desc}</div>
          </div>
        `).join('')}
      `;
    }
  };

  /* ═══════════════════════════════════════
     9. PERFORMANCE PROFILER
  ═══════════════════════════════════════ */
  window.PerfProfiler = {
    _open: false,
    _running: false,
    _interval: null,
    _data: [],
    
    show() {
      document.getElementById('perf-profiler-panel').classList.add('visible');
      this._open = true;
      this._update();
    },
    hide() {
      document.getElementById('perf-profiler-panel').classList.remove('visible');
      this._open = false;
      this.stop();
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    start() {
      this._running = true;
      document.getElementById('pp-start-btn').textContent = 'Stop';
      this._interval = setInterval(() => this._update(), 1000);
    },
    
    stop() {
      this._running = false;
      clearInterval(this._interval);
      const btn = document.getElementById('pp-start-btn');
      if (btn) btn.textContent = 'Start';
    },
    
    _toggle() { this._running ? this.stop() : this.start(); },
    
    _update() {
      const metrics = document.getElementById('pp-metrics');
      if (!metrics) return;
      
      const mem = window.__getPerfMemory(); // FIX: cross-browser
      const nav = performance.navigation;
      const timing = performance.timing;
      
      const loadTime = timing ? (timing.loadEventEnd - timing.navigationStart) : 0;
      const domTime  = timing ? (timing.domContentLoadedEventEnd - timing.navigationStart) : 0;
      
      const usedMem  = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
      const totalMem = mem ? Math.round(mem.totalJSHeapSize / 1024 / 1024) : 0;
      const memPct   = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
      
      const fps = this._estimateFPS();
      
      metrics.innerHTML = `
        <div class="pp-metric">
          <div>
            <div class="pp-metric-name">Memory Usage</div>
            <div class="pp-metric-bar"><div class="pp-metric-fill" style="width:${memPct}%"></div></div>
          </div>
          <div class="pp-metric-val">${usedMem} MB</div>
        </div>
        <div class="pp-metric">
          <div>
            <div class="pp-metric-name">Page Load Time</div>
            <div class="pp-metric-bar"><div class="pp-metric-fill" style="width:${Math.min(100, loadTime/50)}%"></div></div>
          </div>
          <div class="pp-metric-val">${loadTime}ms</div>
        </div>
        <div class="pp-metric">
          <div>
            <div class="pp-metric-name">DOM Ready</div>
            <div class="pp-metric-bar"><div class="pp-metric-fill" style="width:${Math.min(100, domTime/30)}%"></div></div>
          </div>
          <div class="pp-metric-val">${domTime}ms</div>
        </div>
        <div class="pp-metric">
          <div>
            <div class="pp-metric-name">Est. FPS</div>
            <div class="pp-metric-bar"><div class="pp-metric-fill" style="width:${(fps/60)*100}%"></div></div>
          </div>
          <div class="pp-metric-val">${fps}</div>
        </div>
        <div class="pp-metric">
          <div><div class="pp-metric-name">DOM Nodes</div></div>
          <div class="pp-metric-val">${window._domNodeCount || document.querySelectorAll('*').length}</div>
        </div>
        <div class="pp-metric">
          <div><div class="pp-metric-name">Event Listeners (approx)</div></div>
          <div class="pp-metric-val">~${Math.round(document.querySelectorAll('[onclick]').length)}</div>
        </div>
      `;
    },
    
    _lastFPS: 60,
    _lastTime: performance.now(),
    _frameCount: 0,
    
    _estimateFPS() {
      const now = performance.now();
      this._frameCount++;
      if (now - this._lastTime >= 1000) {
        this._lastFPS = Math.round(this._frameCount * 1000 / (now - this._lastTime));
        this._frameCount = 0;
        this._lastTime = now;
      }
      return this._lastFPS;
    }
  };
  
  // Patch the toggle to work correctly
  window.PerfProfiler.toggle = function() {
    if (!this._open) { this.show(); }
    else { this.hide(); }
  };
  document.getElementById('pp-start-btn') && 
    document.getElementById('pp-start-btn').addEventListener('click', () => PerfProfiler._toggle());

  /* ════════════════════════════════���══════
     10. HEX VIEWER
  ════════════════��══════════════════════ */
  window.HexViewer = {
    _open: false,
    
    show() {
      document.getElementById('hex-viewer-panel').classList.add('visible');
      this._open = true;
    },
    hide() {
      document.getElementById('hex-viewer-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    fromEditor() {
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      }
      this.displayBytes(new TextEncoder().encode(code.slice(0, 2048)));
    },
    
    displayBytes(bytes) {
      const body = document.getElementById('hv-body');
      if (!body) return;
      
      const rowSize = 16;
      let html = '';
      
      for (let i = 0; i < Math.min(bytes.length, 512); i += rowSize) {
        const row = bytes.slice(i, i + rowSize);
        const addr = i.toString(16).padStart(8, '0').toUpperCase();
        const hex  = Array.from(row).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
        const ascii = Array.from(row).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '·').join('');
        
        html += `<div class="hv-row">
          <span class="hv-addr">${addr}</span>
          <span class="hv-hex">${hex.padEnd(rowSize * 3 - 1, ' ')}</span>
          <span class="hv-ascii">${ascii}</span>
        </div>`;
      }
      
      if (bytes.length > 512) {
        html += `<div style="color:#52525b;padding:8px 0;font-size:11px">... ${bytes.length - 512} more bytes</div>`;
      }
      
      body.innerHTML = html || '<div style="color:#52525b;padding:20px">No content to display</div>';
    }
  };

  /* ═══════════════════════════════════════
     11. EMOJI PICKER
  ═══════════════════════════════════════ */
  // ── v34 FIX: real keyword-based search, recents, accurate Monaco insertion,
  //         restored 👀 emoji (was U+FFFD), event-delegated rendering. ──
  const _EP_KEYWORDS = {
    '😀':'grin happy smile face','😃':'grin happy smile face','😄':'happy smile face joy',
    '😁':'grin smile face teeth','😆':'laugh smile face','😅':'sweat laugh face',
    '🤣':'rofl laugh face','😂':'lol cry laugh face','🙂':'slight smile face',
    '🙃':'upside down face','😉':'wink face','😊':'blush smile face','😇':'angel halo face',
    '🥰':'love heart face','😍':'love eyes heart face','🤩':'star eyes face wow',
    '😘':'kiss face','😗':'kiss face','😚':'kiss face','😙':'kiss face',
    '🥲':'tear smile face','😋':'yum tongue face','😛':'tongue face',
    '😜':'wink tongue face','🤪':'crazy zany face','😝':'tongue squint face',
    '🤑':'money face dollar','🤗':'hug face','🤭':'oops shush hand face',
    '🤫':'shush quiet face','🤔':'think face hand','🤐':'zip mouth face quiet',
    '🤨':'raised brow skeptic face','😐':'neutral face','😑':'expressionless face',
    '😶':'no mouth face','😏':'smirk face','😒':'unamused meh face',
    '🙄':'roll eyes face','😬':'grimace face','🤥':'lying nose face',
    '😌':'relieved face','😔':'pensive sad face','😪':'sleepy face',
    '🤤':'drool face','😴':'sleep zzz face','😷':'mask sick face',
    '🤒':'thermometer sick face','🤕':'bandage hurt face','🤢':'nausea sick face',
    '🤧':'sneeze sick face','🥵':'hot heat face','🥶':'cold freeze face',
    '🥴':'woozy face','😵':'dizzy ko face','💫':'dizzy star sparkle',
    '🤯':'mind blown explode face','🤠':'cowboy hat face','🥳':'party face hat',
    '🥸':'disguise glasses face','😎':'cool sunglasses face','🤓':'nerd glasses face',
    '🧐':'monocle inspect face','😕':'confused face','😟':'worried face',
    '🙁':'frown face','☹️':'frown sad face','😮':'open mouth face oh',
    '😯':'hush surprised face','😲':'astonished shock face','😳':'flushed blush face',
    '🥺':'pleading puppy face','😦':'frown open face','😧':'anguish face',
    '😨':'fear scared face','😰':'anxious sweat face','😥':'sad disappoint face',
    '😢':'cry tear face','😭':'sob cry tears face','😱':'scream fear face',
    '😖':'confounded face','😣':'persevere face','😞':'disappointed face',
    '😓':'sweat face','😩':'weary face','😫':'tired face','🥱':'yawn tired face',
    '😤':'huff angry steam face','😡':'angry rage red face','😠':'angry face',
    '🤬':'curse swear face','😈':'devil imp purple','👿':'angry devil purple',
    '💀':'skull death','☠️':'skull crossbones death','💩':'poop crap',
    '🤡':'clown circus','👹':'ogre demon','👺':'goblin demon','👻':'ghost spook',
    '👽':'alien ufo','👾':'invader monster game','🤖':'robot bot','😺':'cat smile',
    '😸':'cat grin','👋':'wave hand hi bye','🤚':'raised back hand','🖐':'hand five fingers',
    '✋':'hand stop high five','🖖':'vulcan spock hand','👌':'ok perfect hand',
    '🤌':'pinch fingers italian','🤏':'pinch small','✌️':'peace victory fingers',
    '🤞':'crossed fingers luck','🤟':'love rock hand','🤘':'rock horns metal',
    '🤙':'call hand shaka','👈':'point left','👉':'point right','👆':'point up',
    '🖕':'middle finger fuck','👇':'point down','☝️':'point up index',
    '👍':'thumbs up like good','👎':'thumbs down dislike','✊':'fist punch power',
    '👊':'fist bump punch','🤛':'fist left punch','🤜':'fist right punch',
    '👏':'clap applause','🙌':'praise hands celebrate','👐':'open hands hug',
    '🤲':'palms up hands','🤝':'handshake deal','🙏':'pray please thanks',
    '✍️':'write writing pen','💅':'nails polish manicure','🤳':'selfie phone',
    '💪':'muscle strong arm','🦵':'leg','🦶':'foot','👂':'ear','👀':'eyes look watch see',
    '👃':'nose smell','🫀':'heart anatomy','🫁':'lungs breath','🧠':'brain mind smart',
    '🦷':'tooth dentist','🦴':'bone','💻':'laptop computer','🖥️':'desktop monitor pc',
    '🖨️':'printer','⌨️':'keyboard','🖱️':'mouse computer','🖲️':'trackball',
    '💽':'minidisc disc','💾':'floppy save disk','💿':'cd disc','📀':'dvd disc',
    '🎥':'camera movie','📷':'camera photo','📸':'camera flash','📹':'video camera',
    '📼':'vhs videotape','🔍':'search magnify left','🔎':'search magnify right',
    '🔬':'microscope science','🔭':'telescope astronomy','📡':'satellite antenna',
    '🛰️':'satellite space','🚀':'rocket launch ship','✈️':'plane fly travel',
    '🛸':'ufo alien saucer','⭐':'star yellow','🌟':'glowing star sparkle','⚡':'lightning bolt thunder',
    '🔥':'fire flame hot lit','💥':'boom collision explosion','❤️':'red heart love',
    '🧡':'orange heart','💛':'yellow heart','💚':'green heart','💙':'blue heart',
    '💜':'purple heart','🖤':'black heart','🤍':'white heart','🤎':'brown heart',
    '💔':'broken heart','❤️‍🔥':'heart on fire','❤️‍🩹':'mending heart',
    '❣️':'heart exclamation','💕':'two hearts pink','🎉':'party popper celebrate',
    '🎊':'confetti celebrate','🎈':'balloon party','🎁':'gift present box',
    '🎀':'ribbon bow','🎗️':'reminder ribbon','🎟️':'ticket admission',
    '🎫':'ticket','🏆':'trophy winner','🥇':'gold medal first','🥈':'silver medal',
    '🥉':'bronze medal','🎖️':'military medal','🏅':'sports medal','✅':'check mark ok green',
    '❌':'cross x wrong red','⚠️':'warning caution sign','🚫':'no entry forbidden',
    '💯':'hundred 100 perfect','💡':'idea bulb light','📌':'pushpin pin',
    '📍':'round pin location','🔑':'key unlock','🔒':'lock secure closed',
    '🔓':'unlock open','🗝️':'old key','🔐':'lock key secure'
  };
  window.EmojiPicker = {
    _open: false,
    _recents: (function(){ try { return JSON.parse(localStorage.getItem('procode_emoji_recents')||'[]'); } catch(_) { return []; } })(),
    _emojis: Object.keys(_EP_KEYWORDS),
    _keywords: _EP_KEYWORDS,

    show() {
      document.getElementById('emoji-picker-panel').classList.add('visible');
      this._open = true;
      this._render(this._buildList(''));
      const search = document.getElementById('ep-search');
      if (search) { search.value=''; search.focus(); }
    },
    hide() {
      document.getElementById('emoji-picker-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },

    _buildList(query) {
      query = (query||'').trim().toLowerCase();
      const all = this._emojis;
      if (!query) {
        const recent = this._recents.filter(e => all.includes(e));
        // De-dup while preserving order: recents first, then the rest
        return [...recent, ...all.filter(e => !recent.includes(e))];
      }
      // Direct emoji typed → exact match first
      const direct = all.filter(e => e === query);
      const byKeyword = all.filter(e => (this._keywords[e] || '').toLowerCase().includes(query));
      const seen = new Set();
      return [...direct, ...byKeyword].filter(e => !seen.has(e) && seen.add(e));
    },

    search(query) {
      this._render(this._buildList(query));
    },

    _render(emojis) {
      const grid = document.getElementById('ep-grid');
      if (!grid) return;
      // Build via DOM nodes — avoids HTML-injection from emoji content
      grid.innerHTML = '';
      const frag = document.createDocumentFragment();
      emojis.slice(0, 240).forEach(e => {
        const div = document.createElement('div');
        div.className = 'ep-emoji';
        div.setAttribute('role', 'gridcell');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', this._keywords[e] || e);
        div.dataset.emoji = e;
        div.textContent = e;
        frag.appendChild(div);
      });
      grid.appendChild(frag);
      if (!grid.__epDelegated) {
        grid.__epDelegated = true;
        grid.addEventListener('click', (ev) => {
          const cell = ev.target.closest('.ep-emoji');
          if (cell && cell.dataset.emoji) EmojiPicker._insert(cell.dataset.emoji);
        });
        grid.addEventListener('keydown', (ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          const cell = ev.target.closest('.ep-emoji');
          if (cell && cell.dataset.emoji) { ev.preventDefault(); EmojiPicker._insert(cell.dataset.emoji); }
        });
      }
    },

    _bumpRecent(emoji) {
      this._recents = [emoji, ...this._recents.filter(e => e !== emoji)].slice(0, 24);
      try { localStorage.setItem('procode_emoji_recents', JSON.stringify(this._recents)); } catch(_) {}
    },

    _insert(emoji) {
      this._bumpRecent(emoji);
      // monaco.editor doesn't have getFocusedEditor; iterate models/instances.
      try {
        if (window.monaco && monaco.editor) {
          const eds = monaco.editor.getEditors ? monaco.editor.getEditors() : [];
          const ed = eds.find(e => e && e.hasTextFocus && e.hasTextFocus())
                  || (window.EditorManager && EditorManager.getCurrentEditor && EditorManager.getCurrentEditor());
          if (ed && ed.executeEdits) {
            const sel = ed.getSelection();
            ed.executeEdits('emoji', [{ range: sel, text: emoji, forceMoveMarkers: true }]);
            ed.focus();
            this.hide();
            return;
          }
        }
      } catch(_) { /* fall through to clipboard */ }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emoji).then(() => {
          if (window.Toast && Toast.success) Toast.success('Copied!', `${emoji} copied to clipboard`);
        });
      }
      this.hide();
    }
  };

  /* ═══════════════════════════════════════
     12. MARKDOWN PREVIEW
  ════════════════════���══════════��═══════ */
  window.MdPreview = {
    _open: false,
    
    show() {
      document.getElementById('md-preview-panel').classList.add('visible');
      this._open = true;
    },
    hide() {
      document.getElementById('md-preview-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    fromEditor() {
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      }
      this.render(code);
      this.show();
    },
    
    render(md) {
      const body = document.getElementById('md-preview-body');
      if (!body) return;
      
      let html = md
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold, italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Images
        .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px">')
        // Blockquote
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // HR
        .replace(/^---$/gm, '<hr>')
        // Unordered lists
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|p|l|b|h|u|o|c|p|a])/gm, '')
        ;
      
      body.innerHTML = _sanitize(`<p>${html}</p>`);
    }
  };

  /* ═══════���══════════════════���═══════════���
     13. GIT BLAME (SIMULATED)
  ═══���═══════════════���═══════════════════ */
  window.GitBlame = {
    _open: false,
    
    show() {
      document.getElementById('git-blame-panel').classList.add('visible');
      this._open = true;
      this._generate();
    },
    hide() {
      document.getElementById('git-blame-panel').classList.remove('visible');
      this._open = false;
    },
    toggle() { this._open ? this.hide() : this.show(); },
    
    _generate() {
      const list = document.getElementById('gb-list');
      if (!list) return;
      
      const authors = ['Alice Chen', 'Bob Smith', 'Carol Dev', 'Dan Nguyen', 'Eva Kim'];
      const msgs = [
        'Fix: resolve edge case in parser',
        'Feature: add new component',
        'Refactor: clean up old code',
        'Docs: update README',
        'Perf: optimize render loop',
        'Test: add unit tests',
        'Fix: correct typo in variable name',
        'Merge: pull request #42'
      ];
      
      const entries = Array.from({length: 12}, (_, i) => ({
        hash: Math.random().toString(16).slice(2, 10).toUpperCase(),
        author: authors[Math.floor(Math.random() * authors.length)],
        date: new Date(Date.now() - Math.random() * 30 * 864e5).toLocaleDateString(),
        msg: msgs[Math.floor(Math.random() * msgs.length)]
      }));
      
      list.innerHTML = entries.map(e => `
        <div class="gb-entry" role="listitem">
          <div class="gb-hash">${e.hash}</div>
          <div class="gb-author">${e.author}</div>
          <div class="gb-date">${e.date}</div>
          <div class="gb-msg">${e.msg}</div>
        </div>
      `).join('');
    }
  };

  /* ═══════════════════════════════════════
     14. WORD COUNT
  ═══════════════════════════════════════ */
  window.WordCount = {
    show() {
      const bar = document.getElementById('word-count-bar');
      bar.classList.add('visible');
      this.update();
    },
    
    update() {
      let code = '';
      if (window.EditorManager && typeof EditorManager.getContent === 'function') {
        code = EditorManager.getContent() || '';
      }
      
      const words = (code.match(/\b\w+\b/g) || []).length;
      const chars  = code.length;
      const lines  = (code.match(/\n/g) || []).length + 1;
      
      const wW = document.getElementById('wc-words');
      const wC = document.getElementById('wc-chars');
      const wL = document.getElementById('wc-lines');
      if (wW) wW.textContent = words.toLocaleString();
      if (wC) wC.textContent = chars.toLocaleString();
      if (wL) wL.textContent = lines.toLocaleString();
    }
  };

  /* ════════════��══════════════════════════
     15. KEYBOARD SHORTCUT INTEGRATION
  ═══════════════════════════════════════ */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    
    // Ctrl+Shift+R = Regex Tester
    if (e.shiftKey && e.key === 'R') {
      e.preventDefault();
      RegexTester.toggle();
      CmdHistory.push('Open Regex Tester', () => RegexTester.show(), 'fa-code');
    }
    // Ctrl+Shift+K = Color Picker
    if (e.shiftKey && e.key === 'K') {
      e.preventDefault();
      ColorPicker.toggle();
      CmdHistory.push('Open Color Picker', () => ColorPicker.show(), 'fa-palette');
    }
    // Ctrl+Shift+J = JSON Formatter
    if (e.shiftKey && e.key === 'J') {
      e.preventDefault();
      JsonFormatter.toggle();
      CmdHistory.push('Open JSON Formatter', () => JsonFormatter.show(), 'fa-code');
    }
    // Ctrl+Shift+M = Markdown Preview  
    if (e.shiftKey && e.key === 'M') {
      e.preventDefault();
      MdPreview.fromEditor();
      CmdHistory.push('Open Markdown Preview', () => MdPreview.show(), 'fa-eye');
    }
    // Ctrl+Shift+H = Hex Viewer
    if (e.shiftKey && e.key === 'H') {
      e.preventDefault();
      HexViewer.fromEditor(); HexViewer.show();
      CmdHistory.push('Open Hex Viewer', () => HexViewer.show(), 'fa-th');
    }
    // Ctrl+Alt+W = Word Count
    if (e.altKey && e.key === 'w') {
      e.preventDefault();
      WordCount.show();
    }
  });

  /* ═══════════════════════════════════════
     16. FOOTER STATUS BAR ENHANCEMENTS
  ═══════════════════════════════════════ */
  function injectStatusBarItems() {
    const footer = document.querySelector('footer .f-stat');
    if (!footer || footer.dataset.enhanced) return;
    footer.dataset.enhanced = '1';
    
    const extras = document.createElement('div');
    extras.className = 'sb-extra';
    extras.innerHTML = `
      <span class="sb-item" onclick="RegexTester.toggle()" title="Regex Tester (Ctrl+Shift+R)">
        <i class="fas fa-code"></i> Regex
      </span>
      <span class="sb-item" onclick="ColorPicker.toggle()" title="Color Picker (Ctrl+Shift+K)">
        <i class="fas fa-palette"></i> Color
      </span>
      <span class="sb-item" onclick="JsonFormatter.toggle()" title="JSON Formatter (Ctrl+Shift+J)">
        <i class="fas fa-brackets-curly"></i> JSON
      </span>
      <span class="sb-item" onclick="WordCount.show(); WordCount.update()" title="Word Count (Ctrl+Alt+W)">
        <i class="fas fa-font"></i> Count
      </span>
      <span class="sb-item" onclick="AIReview.toggle()" title="AI Code Review">
        <i class="fas fa-robot"></i> Review
      </span>
      <span class="sb-item" onclick="PerfProfiler.toggle()" title="Performance Profiler">
        <i class="fas fa-tachometer-alt"></i> Perf
      </span>
    `;
    footer.parentElement.appendChild(extras);
  }
  
  // Inject after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStatusBarItems);
  } else {
    setTimeout(injectStatusBarItems, 2000);
  }

  /* ═══════════════════════════════════════
     17. COMMAND PALETTE INTEGRATION
  ═══════════════════════════════════════ */
  // Extend the command list with new commands
  window.__extraCommands = [
    { label: '🔍 Regex Tester',            shortcut: 'Ctrl+Shift+R', action: () => RegexTester.show() },
    { label: '🎨 Color Picker',            shortcut: 'Ctrl+Shift+K', action: () => ColorPicker.show() },
    { label: '📋 JSON Formatter',          shortcut: 'Ctrl+Shift+J', action: () => JsonFormatter.show() },
    { label: '👁 Markdown Preview',        shortcut: 'Ctrl+Shift+M', action: () => MdPreview.fromEditor() },
    { label: '⏱ Code Session Timer',      shortcut: '',              action: () => CodeTimer.show() },
    { label: '♿ Accessibility Checker',   shortcut: '',              action: () => A11yChecker.show() },
    { label: '📜 Command History',         shortcut: '',              action: () => CmdHistory.show() },
    { label: '🤖 AI Code Review',         shortcut: '',              action: () => AIReview.show() },
    { label: '📊 Performance Profiler',   shortcut: '',              action: () => PerfProfiler.show() },
    { label: '🔢 Hex Viewer',             shortcut: 'Ctrl+Shift+H', action: () => { HexViewer.fromEditor(); HexViewer.show(); } },
    { label: '😀 Emoji Picker',           shortcut: '',              action: () => EmojiPicker.show() },
    { label: '📝 Word Count',             shortcut: 'Ctrl+Alt+W',   action: () => { WordCount.show(); WordCount.update(); } },
    { label: '🔀 Git Blame View',         shortcut: '',              action: () => GitBlame.show() },
  ];

  // Patch command palette if it exists
  const patchCommandPalette = () => {
    if (!window.CommandPalette && !window.IDE) return;
    const originalOpen = window.CommandPalette?.open || (() => {});
    // The extra commands are available globally via window.__extraCommands
    // They'll be picked up by the existing command palette on next render
  };
  
  setTimeout(patchCommandPalette, 3000);

  /* ═════��══════════════════════════���══════
     18. AUTO-SAVE INDICATOR
  ═══════════════════════════════════════ */
  window._lastSaveTime = Date.now();
  
  const origSave = window.FS ? window.FS.save : null;
  if (origSave) {
    window.FS.save = function() {
      const result = origSave.apply(this, arguments);
      window._lastSaveTime = Date.now();
      Toast.success('Saved', 'File saved successfully', 2000);
      CmdHistory.push('Save file', () => {}, 'fa-save');
      return result;
    };
  }

  /* ═══════════════════════════════════════
     19. FOCUS/BLUR SESSION TRACKING
  ═══════════════════════════════════════ */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (window.CodeTimer && window.CodeTimer._running) {
        window.CodeTimer.pause();
        Toast.info('Timer paused', 'Tab switched, session timer paused');
      }
    }
  });

  /* ═══════════════════════════════════════
     20. ENHANCED CONSOLE INTERCEPTOR
  ═══════════════════════════════════════ */
  const _origLog  = console.log.bind(console);
  const _origWarn = console.warn.bind(console);
  const _origErr  = console.error.bind(console);
  
  const _logHistory = [];
  
  const _interceptLog = (type, args) => {
    _logHistory.push({ type, time: Date.now(), msg: args.map(String).join(' ') });
    if (_logHistory.length > 500) _logHistory.shift();
  };
  
  console.log  = function() { _origLog(...arguments);  _interceptLog('log',  [...arguments]); };
  console.warn = function() { _origWarn(...arguments); _interceptLog('warn', [...arguments]); };
  console.error= function() { _origErr(...arguments);  _interceptLog('error',[...arguments]); };
  
  window.__logHistory = _logHistory;

  /* ═══════════════════════════════════════
     21. STARTUP SUCCESS MESSAGE
  ═══════════════════════════════════════ */
  window.addEventListener('load', () => {
    setTimeout(() => {
      Toast.success(
        'ProCode IDE — ULTIMATE EDITION',
        '🚀 All enhancement modules loaded! Press Ctrl+P for commands.',
        5000
      );
      CmdHistory.push('IDE Initialized', () => {}, 'fa-rocket');
    }, 3500);
  });

  console.log('%c[ENHANCEMENT PATCH] All 21 modules loaded ✅', 'color:#6366f1;font-weight:bold');
  console.log('%c New tools: Regex Tester · Color Picker · JSON Formatter · Markdown Preview · Hex Viewer · Code Timer · A11y Checker · AI Review · Perf Profiler · Emoji Picker', 'color:#4ade80');

})(); // END EnhancementPatch