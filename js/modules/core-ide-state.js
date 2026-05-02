/**
 * core-ide-state.js
 * Core IDE State (IDE config, FileSystem, IndexedDB)
 * ProCode IDE v3.0
 */


/**
 * PRO CODE IDE v27.0 - ULTRA EDITION
 * Full-stack web development environment
 * Enhanced with: Real Claude AI (streaming), context-aware assistant, insert-to-editor
 */

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================
const IDE = {
    version: '3.0.0',
    build: '2026.04.26-v3.0',
    state: {
        // File system
        files: {},
        tabs: [],
        activeTab: null,
        dirtyTabs: new Set(),
        
        // Editor
        editors: {},
        activeEditor: 'monaco-root-1',
        splitView: false,
        editorLayout: 'single',
        
        // Runtime
        pyodide: null,
        terminal: null,
        aiAssistant: null,
        
        // UI State
        sidebar: 'expl',
        panel: 'term',
        previewVisible: false,
        terminalVisible: false,
        
        // Project
        currentProject: null,
        projectType: 'vanilla',
        
        // Settings
        settings: {
            editor: {
                fontSize: 14,
                tabSize: 4,
                wordWrap: false,
                minimap: false,
                lineNumbers: true,
                fontFamily: "'JetBrains Mono', monospace",
                theme: 'procode-dark',
                formatOnSave: true,
                autoSave: true,
                autoSaveDelay: 1000,
                bracketPairColorization: true,
                autoCloseBrackets: true,
                autoIndent: true,
                suggestOnTriggerCharacters: true
            },
            appearance: {
                theme: 'dark',
                animation: true,
                reduceMotion: false,
                compactMode: false
            },
            terminal: {
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                cursorBlink: true,
                cursorStyle: 'block'
            },
            ai: {
                enabled: true,
                model: 'claude-sonnet-4-6',
                apiKey: '',
                temperature: 0.7,
                maxTokens: 8000
            },
            features: {
                restoreSession: true,
                persistCursor: true,
                gitIntegration: true,
                livePreview: true,
                codeLens: true,
                breadcrumbs: true,
                snippetSuggestions: true
            }
        },
        
        // Templates (Enhanced with more options)
        templates: {
            'vanilla': {
                'LANGUAGES.md': `# 📋 ProCode IDE — Ngôn ngữ được hỗ trợ

Chào mừng đến với **ProCode IDE v25.0**! Dưới đây là danh sách đầy đủ các ngôn ngữ lập trình bạn có thể sử dụng.

---

## 🌐 Web & Frontend
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| HTML | \`.html\`, \`.htm\` | Markup chuẩn web |
| CSS | \`.css\` | Stylesheet |
| JavaScript | \`.js\`, \`.mjs\` | Ngôn ngữ web phổ biến nhất |
| TypeScript | \`.ts\`, \`.tsx\` | JavaScript + kiểu tĩnh |
| JSX / React | \`.jsx\` | React components |
| Vue | \`.vue\` | Vue.js Single File Components |
| Svelte | \`.svelte\` | Framework nhẹ, hiện đại |
| SASS / SCSS | \`.sass\`, \`.scss\` | CSS nâng cao |
| Less | \`.less\` | CSS preprocessor |

---

## 🐍 Backend & Scripting
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| Python | \`.py\` | Chạy trực tiếp với Pyodide (offline!) |
| PHP | \`.php\` | Web server-side |
| Ruby | \`.rb\` | Elegant scripting |
| Perl | \`.pl\`, \`.pm\` | Text processing |
| Shell / Bash | \`.sh\`, \`.bash\` | Unix scripting |
| PowerShell | \`.ps1\` | Windows scripting |

---

## ⚡ Compiled Languages
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| C | \`.c\`, \`.h\` | Systems programming |
| C++ | \`.cpp\`, \`.cc\`, \`.cxx\` | High performance |
| C# | \`.cs\` | .NET ecosystem |
| Java | \`.java\` | Enterprise standard |
| Kotlin | \`.kt\`, \`.kts\` | Modern JVM language |
| Swift | \`.swift\` | iOS / macOS development |
| Go | \`.go\` | Google's systems language |
| Rust | \`.rs\` | Memory-safe systems lang |

---

## 📊 Data & Config
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| JSON | \`.json\` | Data interchange |
| YAML | \`.yaml\`, \`.yml\` | Config files |
| TOML | \`.toml\` | Config format |
| XML | \`.xml\` | Markup data |
| CSV | \`.csv\` | Tabular data |
| SQL | \`.sql\` | Database queries (SQLite tích hợp!) |
| GraphQL | \`.graphql\`, \`.gql\` | API query language |

---

## 🔧 Khác
| Ngôn ngữ | Phần mở rộng | Ghi chú |
|---|---|---|
| Markdown | \`.md\`, \`.mdx\` | Documentation (preview tích hợp!) |
| Lua | \`.lua\` | Scripting, game dev |
| R | \`.r\`, \`.R\` | Statistics & data science |
| Dart | \`.dart\` | Flutter development |
| Scala | \`.scala\` | Functional + OOP JVM |
| Haskell | \`.hs\` | Pure functional |
| Elixir | \`.ex\`, \`.exs\` | Concurrent programming |
| Dockerfile | \`Dockerfile\` | Container config |
| \`.env\` | \`.env\` | Environment variables |

---

## 🚀 Bắt đầu nhanh

1. **Tạo file mới** → Nhấn icon \`+\` trên thanh file tree (hoặc \`Ctrl+N\`)
2. **Mở Project Template** → Nhấn \`New Project\` để chọn template có sẵn
3. **Chạy code** → Nhấn \`F5\` hoặc nút ▶ Run
4. **AI hỗ trợ** → \`Ctrl+Shift+A\` để mở AI Assistant
5. **Tìm kiếm nhanh** → \`Ctrl+P\` để mở Command Palette

---

> 💡 **Tip:** Đối với Python, ProCode IDE chạy hoàn toàn offline bằng **Pyodide WebAssembly**.
> Đối với HTML/JS, nhấn **F5** để xem preview trực tiếp trong IDE.
`
            },
            
            'react-umd': {
                'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React UMD Starter</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
    <script src="app.js"><\/script>




</html>`,
                'style.css': `:root {
    --bg: #0f172a;
    --card: #1e293b;
    --text: #e2e8f0;
    --accent: #38bdf8;
    --accent-dark: #0ea5e9;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.app {
    background: var(--card);
    padding: 32px;
    border-radius: 16px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
}

.app h1 {
    font-size: 28px;
    margin-bottom: 8px;
}

.app p {
    color: #cbd5f5;
    margin-bottom: 20px;
}

.counter {
    display: flex;
    align-items: center;
    gap: 16px;
}

.counter button {
    background: var(--accent);
    border: none;
    color: #0f172a;
    font-weight: 700;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
}

.counter button:hover {
    background: var(--accent-dark);
}

.count {
    font-size: 24px;
    min-width: 48px;
    text-align: center;
}`,
                'app.js': `const rootEl = document.getElementById('root');

function App() {
    const [count, setCount] = React.useState(0);

    return React.createElement(
        'div',
        { className: 'app' },
        React.createElement('h1', null, 'React UMD Starter'),
        React.createElement('p', null, 'No bundler, no imports, runs in preview.'),
        React.createElement(
            'div',
            { className: 'counter' },
            React.createElement(
                'button',
                { onClick: () => setCount(Math.max(0, count - 1)) },
                '-'
            ),
            React.createElement('span', { className: 'count' }, count),
            React.createElement(
                'button',
                { onClick: () => setCount(count + 1) },
                '+'
            )
        )
    );
}

if (rootEl && window.React && window.ReactDOM) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
} else {
    console.error('React UMD globals not found.');
}`,
                'README.md': `# React UMD Starter

This template runs without a bundler.

Files:
- index.html
- style.css
- app.js

Notes:
- Uses React UMD globals from CDN.
- No import/export in app.js.
- Press F5 to preview.`
            },
            
            'vue-umd': {
                'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue 3 UMD Starter</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app" class="app">
        <h1>Vue 3 UMD Starter</h1>
        <p>{{ message }}</p>
        <div class="counter">
            <button @click="decrement">-</button>
            <span class="count">{{ count }}</span>
            <button @click="increment">+</button>
        </div>
        <p class="hint">Doubled: {{ doubled }}</p>
    </div>

    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
    <script src="app.js"><\/script>



</body>
</html>`,
                'style.css': `:root {
    --bg: #0f172a;
    --card: #112a2f;
    --text: #ecfeff;
    --accent: #34d399;
    --accent-dark: #10b981;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.app {
    background: var(--card);
    padding: 32px;
    border-radius: 16px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
}

.app h1 {
    font-size: 28px;
    margin-bottom: 8px;
}

.app p {
    color: #a7f3d0;
    margin-bottom: 16px;
}

.counter {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
}

.counter button {
    background: var(--accent);
    border: none;
    color: #042f2e;
    font-weight: 700;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
}

.counter button:hover {
    background: var(--accent-dark);
}

.count {
    font-size: 24px;
    min-width: 48px;
    text-align: center;
}

.hint {
    font-size: 13px;
    opacity: 0.8;
}`,
                'app.js': `const rootEl = document.getElementById('app');

if (!rootEl || !window.Vue) {
    console.error('Vue global not found.');
} else {
    const { createApp, ref, computed } = Vue;

    createApp({
        setup() {
            const count = ref(0);
            const message = ref('No bundler, no imports, runs in preview.');
            const doubled = computed(() => count.value * 2);

            const increment = () => {
                count.value += 1;
            };

            const decrement = () => {
                count.value = Math.max(0, count.value - 1);
            };

            return { count, message, doubled, increment, decrement };
        }
    }).mount('#app');
}`,
                'README.md': `# Vue 3 UMD Starter

This template runs without a bundler.

Files:
- index.html
- style.css
- app.js

Notes:
- Uses Vue global build from CDN.
- No import/export in app.js.
- Press F5 to preview.`
            },
            
            'react-ts': {
                'package.json': `{
  "name": "procode-react-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}`,
                'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})`,
                'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
                'tsconfig.node.json': `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`,
                'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + TypeScript + Vite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"><\/script>
  


</body>
</html>`,
                'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
                'src/App.tsx': `import React, { useState, useEffect } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build a project', completed: false },
    { id: 3, text: 'Deploy to production', completed: false }
  ])
  
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setTodos([...todos, {
      id: Date.now(),
      text: input,
      completed: false
    }])
    setInput('')
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const activeCount = todos.filter(todo => !todo.completed).length

  return (
    <div className="app">
      <header>
        <h1> React Todo App</h1>
        <p>Built with TypeScript + Vite</p>
      </header>

      <main>
        <form onSubmit={addTodo} className="todo-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What needs to be done?"
            className="todo-input"
          />
          <button type="submit" className="add-btn">
            Add Todo
          </button>
        </form>

        <div className="filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({todos.length})
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active ({activeCount})
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed ({todos.length - activeCount})
          </button>
        </div>

        <div className="todo-list">
          {filteredTodos.map(todo => (
            <div key={todo.id} className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="todo-checkbox"
              />
              <span className="todo-text">{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="delete-btn"
              >
                
              </button>
            </div>
          ))}
          
          {filteredTodos.length === 0 && (
            <div className="empty-state">
              {filter === 'all' ? 'No todos yet. Add one above!' :
               filter === 'active' ? 'No active todos!' :
               'No completed todos!'}
            </div>
          )}
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-value">{todos.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat">
            <div className="stat-value">{todos.length - activeCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </main>

      <footer>
        <p>Built with  using ProCode IDE</p>
        <p className="hint">Double-click to edit  Press Enter to save</p>
      </footer>
    </div>
  )
}

export default App`,
                'src/App.css': `.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 3rem;
}

header h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

header p {
  color: #666;
  font-size: 1.1rem;
}

.todo-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.todo-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.2s;
}

.todo-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.add-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #4f46e5;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filters button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.filters button:hover {
  border-color: #6366f1;
}

.filters button.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.todo-list {
  background: white;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  overflow: hidden;
  margin-bottom: 2rem;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.2s;
}

.todo-item:hover {
  background: #f8fafc;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #94a3b8;
}

.todo-checkbox {
  width: 24px;
  height: 24px;
  margin-right: 1rem;
  cursor: pointer;
}

.todo-text {
  flex: 1;
  font-size: 1.1rem;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #ef4444;
  color: white;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 1.1rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 3rem;
}

.stat {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #6366f1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  border-top: 2px solid #e2e8f0;
}

.hint {
  font-size: 0.9rem;
  margin-top: 0.5rem;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .app {
    padding: 1rem;
  }
  
  .todo-form {
    flex-direction: column;
  }
  
  .filters {
    flex-wrap: wrap;
  }
  
  .stats {
    grid-template-columns: 1fr;
  }
}`,
                'src/index.css': `/* Modern CSS Reset */
*, *::before, *::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

#root {
  isolation: isolate;
  min-height: 100vh;
}`
            },
            
            'python-data': {
                'main.py': `#!/usr/bin/env python3
"""
Data Analysis Dashboard
ProCode IDE - Python Data Science Template
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print(" DATA ANALYSIS DASHBOARD")
print("=" * 60)

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# Generate sample data
def generate_sample_data():
    """Generate realistic sample data for analysis"""
    np.random.seed(42)
    
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    
    data = {
        'date': dates,
        'sales': np.random.normal(1000, 200, 100).cumsum() + 5000,
        'customers': np.random.poisson(50, 100),
        'revenue': np.random.exponential(1000, 100).cumsum(),
        'expenses': np.random.normal(300, 50, 100).cumsum(),
        'temperature': np.random.normal(20, 5, 100),
        'promotion': np.random.choice([0, 1], 100, p=[0.7, 0.3])
    }
    
    # Add weekly seasonality
    data['sales'] += np.sin(np.arange(100) * 2 * np.pi / 7) * 100
    
    # Add trend
    data['sales'] += np.arange(100) * 10
    
    return pd.DataFrame(data)

# Load data
print(" Generating sample data...")
df = generate_sample_data()

print(f" Data loaded successfully")
print(f" Shape: {df.shape}")
print(f" Date range: {df['date'].min().date()} to {df['date'].max().date()}")
print()

# Basic statistics
print(" BASIC STATISTICS")
print("-" * 40)
print(df.describe().round(2))
print()

# Calculate metrics
total_sales = df['sales'].iloc[-1] - df['sales'].iloc[0]
avg_daily_customers = df['customers'].mean()
total_revenue = df['revenue'].iloc[-1]
profit_margin = ((df['revenue'] - df['expenses']).iloc[-1] / df['revenue'].iloc[-1]) * 100

print(" KEY METRICS")
print("-" * 40)
print(f"Total Sales: \${total_sales:,.2f}")
print(f"Average Daily Customers: {avg_daily_customers:.0f}")
print(f"Total Revenue: \${total_revenue:,.2f}")
print(f"Profit Margin: {profit_margin:.1f}%")
print()

# Time series analysis
print(" TIME SERIES ANALYSIS")
print("-" * 40)

# Calculate rolling averages
df['sales_7d_avg'] = df['sales'].rolling(window=7).mean()
df['revenue_7d_avg'] = df['revenue'].rolling(window=7).mean()

# Growth rate
sales_growth = ((df['sales'].iloc[-1] - df['sales'].iloc[0]) / df['sales'].iloc[0]) * 100
revenue_growth = ((df['revenue'].iloc[-1] - df['revenue'].iloc[0]) / df['revenue'].iloc[0]) * 100

print(f"Sales Growth: {sales_growth:.1f}%")
print(f"Revenue Growth: {revenue_growth:.1f}%")

# Promotion impact
promo_days = df[df['promotion'] == 1]
non_promo_days = df[df['promotion'] == 0]

if len(promo_days) > 0 and len(non_promo_days) > 0:
    promo_avg_sales = promo_days['sales'].mean()
    non_promo_avg_sales = non_promo_days['sales'].mean()
    promo_impact = ((promo_avg_sales - non_promo_avg_sales) / non_promo_avg_sales) * 100
    print(f"Promotion Impact: +{promo_impact:.1f}% increase in sales")
print()

# Correlation analysis
print(" CORRELATION ANALYSIS")
print("-" * 40)
correlation_matrix = df[['sales', 'customers', 'revenue', 'expenses', 'temperature']].corr()
print(correlation_matrix.round(2))
print()

# Generate visualizations
print(" GENERATING VISUALIZATIONS...")

fig, axes = plt.subplots(2, 2, figsize=(15, 10))

# 1. Sales trend
axes[0, 0].plot(df['date'], df['sales'], label='Daily Sales', linewidth=2)
axes[0, 0].plot(df['date'], df['sales_7d_avg'], label='7-Day Avg', linewidth=2, linestyle='--')
axes[0, 0].set_title('Sales Trend Over Time', fontsize=14, fontweight='bold')
axes[0, 0].set_xlabel('Date')
axes[0, 0].set_ylabel('Sales ($)')
axes[0, 0].legend()
axes[0, 0].grid(True, alpha=0.3)

# 2. Revenue vs Expenses
axes[0, 1].fill_between(df['date'], df['revenue'], df['expenses'], 
                         where=(df['revenue'] > df['expenses']), 
                         color='green', alpha=0.3, label='Profit')
axes[0, 1].fill_between(df['date'], df['revenue'], df['expenses'], 
                         where=(df['revenue'] <= df['expenses']), 
                         color='red', alpha=0.3, label='Loss')
axes[0, 1].plot(df['date'], df['revenue'], label='Revenue', linewidth=2)
axes[0, 1].plot(df['date'], df['expenses'], label='Expenses', linewidth=2)
axes[0, 1].set_title('Revenue vs Expenses', fontsize=14, fontweight='bold')
axes[0, 1].set_xlabel('Date')
axes[0, 1].set_ylabel('Amount ($)')
axes[0, 1].legend()
axes[0, 1].grid(True, alpha=0.3)

# 3. Customer distribution
axes[1, 0].hist(df['customers'], bins=15, edgecolor='black', alpha=0.7)
axes[1, 0].axvline(df['customers'].mean(), color='red', linestyle='--', 
                   linewidth=2, label=f'Mean: {df["customers"].mean():.1f}')
axes[1, 0].set_title('Customer Distribution', fontsize=14, fontweight='bold')
axes[1, 0].set_xlabel('Number of Customers')
axes[1, 0].set_ylabel('Frequency')
axes[1, 0].legend()
axes[1, 0].grid(True, alpha=0.3)

# 4. Correlation heatmap
im = axes[1, 1].imshow(correlation_matrix.values, cmap='coolwarm', vmin=-1, vmax=1)
axes[1, 1].set_title('Feature Correlation', fontsize=14, fontweight='bold')
axes[1, 1].set_xticks(np.arange(len(correlation_matrix.columns)))
axes[1, 1].set_yticks(np.arange(len(correlation_matrix.columns)))
axes[1, 1].set_xticklabels(correlation_matrix.columns, rotation=45)
axes[1, 1].set_yticklabels(correlation_matrix.columns)
plt.colorbar(im, ax=axes[1, 1])

# Add correlation values
for i in range(len(correlation_matrix.columns)):
    for j in range(len(correlation_matrix.columns)):
        text = axes[1, 1].text(j, i, f'{correlation_matrix.iloc[i, j]:.2f}',
                               ha="center", va="center", 
                               color="white" if abs(correlation_matrix.iloc[i, j]) > 0.5 else "black")

plt.tight_layout()
plt.savefig('analysis_dashboard.png', dpi=300, bbox_inches='tight')
print(" Dashboard saved as 'analysis_dashboard.png'")
print()

# Export results
results = {
    'total_sales': float(total_sales),
    'avg_daily_customers': float(avg_daily_customers),
    'total_revenue': float(total_revenue),
    'profit_margin': float(profit_margin),
    'sales_growth': float(sales_growth),
    'revenue_growth': float(revenue_growth),
    'analysis_date': datetime.now().isoformat()
}

with open('analysis_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(" RESULTS EXPORTED")
print("-" * 40)
print(json.dumps(results, indent=2))
print()

# Future prediction (simple linear projection)
print(" FUTURE PREDICTION (Next 30 Days)")
print("-" * 40)

# Simple linear regression for prediction
from sklearn.linear_model import LinearRegression

# Prepare data for prediction
X = np.arange(len(df)).reshape(-1, 1)
y_sales = df['sales'].values

model = LinearRegression()
model.fit(X, y_sales)

# Predict next 30 days
future_days = np.arange(len(df), len(df) + 30).reshape(-1, 1)
future_sales = model.predict(future_days)

predicted_growth = ((future_sales[-1] - future_sales[0]) / future_sales[0]) * 100
print(f"Predicted sales growth in next 30 days: {predicted_growth:.1f}%")
print(f"Estimated sales on day 30: \${future_sales[-1]:,.2f}")

print()
print("=" * 60)
print(" ANALYSIS COMPLETE!")
print("=" * 60)
print()
print(" Generated Files:")
print("   analysis_dashboard.png - Visualization dashboard")
print("   analysis_results.json - Analysis results")
print()
print(" Next Steps:")
print("  1. Review the visualizations")
print("  2. Adjust parameters in the code")
print("  3. Add more data sources")
print("  4. Implement machine learning models")
print()

# Interactive exploration
print(" INTERACTIVE EXPLORATION")
print("-" * 40)
print("Try modifying the code to:")
print("   Change the sample data generation")
print("   Add more visualization types")
print("   Implement statistical tests")
print("   Connect to real data sources")
print()

print(" Happy Data Science!")`,
                'analysis_results.json': `{}`,
                'requirements.txt': `pandas>=2.0.0
numpy>=1.24.0
matplotlib>=3.7.0
seaborn>=0.12.0
scikit-learn>=1.2.0
jupyter>=1.0.0`,
                'README.md': `# Python Data Science Project

A comprehensive data analysis dashboard built with Python.

## Features
-  Data generation and simulation
-  Time series analysis
-  Correlation analysis
-  Interactive visualizations
-  Future predictions
-  Results export

## Setup
\`\`\`bash
# Install dependencies
pip install -r requirements.txt

# Run analysis
python main.py
\`\`\`

## Project Structure
\`\`\`
project/
 main.py              # Main analysis script
 requirements.txt     # Python dependencies
 analysis_results.json # Analysis results
 analysis_dashboard.png # Generated dashboard
\`\`\`

## Technologies Used
- **Pandas**: Data manipulation
- **NumPy**: Numerical computing
- **Matplotlib**: Visualization
- **Seaborn**: Statistical graphics
- **Scikit-learn**: Machine learning

## Customization
1. Modify data generation in \`generate_sample_data()\`
2. Add new analysis functions
3. Customize visualizations
4. Connect to real databases

## Tips
- Use **F5** to run the analysis
- Check the terminal for results
- View generated visualizations
- Export results for reporting`
            },
            
            // NEW TEMPLATES ADDED
            'vue-ts': {
                'package.json': `{
  "name": "procode-vue-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0",
    "vue-tsc": "^1.8.0"
  }
}`,
                'vite.config.ts': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  }
})`,
                'src/main.ts': `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')`,
                'src/App.vue': `<template>
  <div class="app">
    <header>
      <h1> Vue 3 + TypeScript App</h1>
      <p>Built with ProCode IDE v3.0</p>
    </header>
    
    <main>
      <div class="counter">
        <button @click="decrement">-</button>
        <span class="count">{{ count }}</span>
        <button @click="increment">+</button>
      </div>
      
      <div class="controls">
        <input v-model="message" placeholder="Type a message..." />
        <button @click="addMessage">Add Message</button>
      </div>
      
      <div class="messages">
        <div v-for="(msg, index) in messages" :key="index" class="message">
          {{ msg }}
        </div>
      </div>
    </main>
    
    <footer>
      <p>Count: {{ count }} | Messages: {{ messages.length }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const message = ref('')
const messages = ref<string[]>([])

const increment = () => count.value++
const decrement = () => count.value > 0 && count.value--
const addMessage = () => {
  if (message.value.trim()) {
    messages.value.push(message.value)
    message.value = ''
  }
}
<\/script>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

header {
  margin-bottom: 3rem;
}

header h1 {
  font-size: 2.5rem;
  color: #42b883;
  margin-bottom: 0.5rem;
}

header p {
  color: #64748b;
}

.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
  font-size: 2rem;
}

.counter button {
  width: 60px;
  height: 60px;
  border: none;
  background: #42b883;
  color: white;
  border-radius: 50%;
  font-size: 2rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.counter button:hover {
  transform: scale(1.1);
}

.count {
  font-size: 3rem;
  font-weight: bold;
  color: #35495e;
  min-width: 100px;
}

.controls {
  margin: 2rem 0;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.controls input {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  width: 300px;
  font-size: 1rem;
}

.controls button {
  padding: 0.75rem 1.5rem;
  background: #35495e;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.messages {
  margin-top: 2rem;
  max-height: 300px;
  overflow-y: auto;
}

.message {
  background: white;
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 2px solid #e2e8f0;
  color: #64748b;
}

</style>`,
                'src/style.css': `/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  line-height: 1.5;
}

#app {
  min-height: 100vh;
}`
            },
            
            'nextjs-ts': {
                'package.json': `{
  "name": "procode-next-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}`,
                'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig`,
                'tsconfig.json': `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
                'src/app/page.tsx': `import Counter from '@/components/Counter'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Next.js 14 + TypeScript
            </h1>
            <p className="text-xl text-gray-600">
              Modern full-stack application template
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Interactive Counter
              </h2>
              <Counter />
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Features
              </h2>
              <ul className="space-y-4">
                {[
                  ' App Router (Next.js 14)',
                  ' TypeScript ready',
                  ' Fast Refresh',
                  ' ESLint configured',
                  ' Tailwind CSS',
                  ' Responsive design'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="text-center py-8 text-gray-500 border-t">
        <p>Built with  using ProCode IDE v27.0</p>
      </footer>
    </div>
  )
}`,
                'src/components/Counter.tsx': `'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  const [history, setHistory] = useState<number[]>([])

  const increment = () => {
    setCount(prev => {
      const newCount = prev + 1
      setHistory(prevHistory => [...prevHistory.slice(-4), newCount])
      return newCount
    })
  }

  const decrement = () => {
    if (count > 0) {
      setCount(prev => {
        const newCount = prev - 1
        setHistory(prevHistory => [...prevHistory.slice(-4), newCount])
        return newCount
      })
    }
  }

  const reset = () => {
    setCount(0)
    setHistory([])
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl font-bold text-blue-600 mb-4">{count}</div>
        <p className="text-gray-600">Current Count</p>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={decrement}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Decrement
        </button>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={increment}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Increment
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent History</h3>
          <div className="flex gap-2">
            {history.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-gray-100 rounded-lg p-3 text-center"
              >
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-sm text-gray-500">Step {history.length - index}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}`,
                'src/components/Header.tsx': `export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NextApp</h1>
              <p className="text-sm text-gray-500">v1.0.0</p>
            </div>
          </div>
          
          <nav className="flex gap-6">
            {['Home', 'Features', 'Docs', 'About'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}`
            }
        }
    }
};

// THÊM VÀO IndexedDBManager object
class IndexedDBBatcher {
    constructor(db) {
        this.db = db;
        this.writeQueue = new Map();
        this.deleteQueue = new Set();
        this.flushTimer = null;
        this.isProcessing = false;
        this.BATCH_DELAY = 500; // ms
        this.MAX_BATCH_SIZE = 100;
    }
    
    queueWrite(key, value) {
        this.deleteQueue.delete(key);
        this.writeQueue.set(key, value);
        this.scheduleFlush();
    }
    
    queueDelete(key) {
        this.writeQueue.delete(key);
        this.deleteQueue.add(key);
        this.scheduleFlush();
    }
    
    scheduleFlush() {
        if (this.flushTimer) clearTimeout(this.flushTimer);
        
        const shouldFlushImmediately = 
            this.writeQueue.size >= this.MAX_BATCH_SIZE || 
            this.deleteQueue.size >= this.MAX_BATCH_SIZE;
        
        if (shouldFlushImmediately) {
            this.flush();
        } else {
            this.flushTimer = setTimeout(() => this.flush(), this.BATCH_DELAY);
        }
    }
    
    async flush() {
        if (this.isProcessing) return;
        if (this.writeQueue.size === 0 && this.deleteQueue.size === 0) return;
        
        this.isProcessing = true;
        const writes = Array.from(this.writeQueue.entries());
        const deletes = Array.from(this.deleteQueue);
        
        this.writeQueue.clear();
        this.deleteQueue.clear();
        
        try {
            // ✅ Sử dụng transaction duy nhất cho tất cả operations
            const transaction = this.db.transaction(['files', 'settings'], 'readwrite');
            const fileStore = transaction.objectStore('files');
            
            // Batch writes
            const writePromises = writes.map(([path, content]) => 
                new Promise((resolve, reject) => {
                    const request = fileStore.put({
                        path,
                        content,
                        size: new Blob([content]).size,
                        modified: Date.now()
                    });
                    request.onsuccess = resolve;
                    request.onerror = reject;
                })
            );
            
            // Batch deletes
            const deletePromises = deletes.map(path =>
                new Promise((resolve, reject) => {
                    const request = fileStore.delete(path);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                })
            );
            
            await Promise.all([...writePromises, ...deletePromises]);
            
            // ✅ Chờ transaction complete
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
            });
            
            if(window.__PROCODE_DEBUG__) console.log(`✅ Flushed ${writes.length} writes, ${deletes.length} deletes`);
        } catch (error) {
            console.error('❌ Batch flush failed:', error);
            // ✅ Re-queue failed operations
            writes.forEach(([k, v]) => this.writeQueue.set(k, v));
            deletes.forEach(k => this.deleteQueue.add(k));
            
            // Retry after delay
            setTimeout(() => this.flush(), 5000);
        } finally {
            this.isProcessing = false;
        }
    }
}

const IndexedDBManager = {
    db: null,
    dbName: 'ProCodeIDE',
    version: 1,
    batcher: null,
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.batcher = new IndexedDBBatcher(this.db);
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'path' });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },
    
    async setFile(path, content) {
        if (!this.db) await this.init();
        
        if (this.batcher) { this.batcher.queueWrite(path, content); return true; }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.put({
                path: path,
                content: content,
                size: new Blob([content]).size,
                modified: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getFile(path) {
        if (!this.db) await this.init();
        
        if (this.batcher) {
            if (this.batcher.deleteQueue?.has?.(path)) return null;
            if (this.batcher.writeQueue?.has?.(path)) {
                const content = this.batcher.writeQueue.get(path);
                return { path, content, size: new Blob([content]).size, modified: new Date().toISOString() };
            }
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(path);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getAllFiles() {
        if (!this.db) await this.init();
        
        if (this.batcher) await this.batcher.flush();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async deleteFile(path) {
        if (!this.db) await this.init();
        
        if (this.batcher) { this.batcher.queueDelete(path); return true; }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.delete(path);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async setSetting(key, value) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key: key, value: value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async getSetting(key) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },
    
    async addHistory(action, details) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            const request = store.add({
                action: action,
                details: details,
                timestamp: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getRecentHistory(limit = 50) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');
            
            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    async setCache(key, value, ttl = 3600000) { // 1 hour default
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.put({
                key: key,
                value: value,
                timestamp: Date.now(),
                expires: Date.now() + ttl
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async getCache(key) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.expires > Date.now()) {
                    resolve(result.value);
                } else {
                    if (result) {
                        // Delete expired cache
                        this.deleteCache(key);
                    }
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    async deleteCache(key) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async clearExpiredCache() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.openCursor();
            
            let deleted = 0;
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.expires < Date.now()) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    async getStorageStats() {
        if (!this.db) await this.init();
        
        const files = await this.getAllFiles();
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        
        return {
            fileCount: files.length,
            totalSize: totalSize,
            formattedSize: Utils.formatBytes(totalSize)
        };
    }
};

// ============================================
// Expose IDE globally so all modules can access it
window.IDE = IDE;
