# ProCode IDE v3.0 — Refactored Multi-file Edition

## Cấu trúc dự án

```
procode_v3/
├── index.html                      ← Entry point (HTML shell, ~160KB)
├── css/
│   └── styles.css                  ← CSS tổng hợp (44 sections, ~424KB)
├── js/
│   ├── core/                       ← Core scripts (load trước tiên)
│   │   ├── debug.js                ← Debug gate (window.__PROCODE_DEBUG__)
│   │   ├── pwa-bootstrap.js        ← PWA manifest & Service Worker
│   │   ├── security.js             ← HTML sanitizer, XSS protection
│   │   ├── api-key.js              ← API key management (in-memory only)
│   │   ├── boot-orchestrator.js    ← Boot kill-switches, progress reporting
│   │   ├── timer-guard.js          ← Safe setTimeout/setInterval wrappers
│   │   ├── syntax-check.js         ← Real-time syntax checker
│   │   ├── amd-guard.js            ← AMD/RequireJS conflict prevention
│   │   ├── monaco-bootstrap.js     ← Monaco Editor CDN loader với retry
│   │   └── loader-guard.js         ← Guaranteed loader hide (fallback)
│   │
│   ├── modules/                    ← Core IDE modules (application logic)
│   │   ├── core-ide-state.js       ← IDE config, FileSystem, IndexedDB
│   │   ├── utils.js                ← Utilities (icons, detect, format, compression)
│   │   ├── filesystem-extra.js     ← FileSystem.importFromFiles()
│   │   ├── editor-manager.js       ← Monaco editor lifecycle, linting
│   │   ├── tab-manager.js          ← Tab bar, switching, dirty state
│   │   ├── terminal-manager.js     ← xterm.js terminal integration
│   │   ├── console-manager.js      ← Output console panel
│   │   ├── runner.js               ← Code execution (JS, TS, Python, etc.)
│   │   ├── debugger.js             ← Debugger (breakpoints, step, watch)
│   │   ├── panel-manager.js        ← Side/bottom panel visibility
│   │   ├── ai-manager.js           ← Claude API integration, streaming
│   │   ├── project-templates.js    ← Starter project templates
│   │   ├── git-manager.js          ← Git integration (isomorphic-git)
│   │   ├── search-manager.js       ← Find/replace across files
│   │   ├── layout-manager.js       ← Panel sizing, drag, responsive
│   │   ├── settings-manager.js     ← User preferences, themes, keybindings
│   │   ├── workspace-io.js         ← Import/export, snapshots
│   │   ├── session-manager.js      ← Session save/restore
│   │   ├── command-palette.js      ← Fuzzy-search command runner (Ctrl+P)
│   │   ├── tutorial-manager.js     ← Onboarding tutorial steps
│   │   ├── notifications.js        ← Notification/toast system
│   │   └── init-and-patches.js     ← Main init, Inspector, AutoRecovery, patches
│   │
│   └── features/                   ← Feature enhancements (loaded after core)
│       ├── idb-reliability.js      ← IndexedDB reliability warnings
│       ├── hud-ui-v24.js           ← HUD, WindowManager, TypingsManager
│       ├── hologram-hud.js         ← Hologram HUD overlay
│       ├── patches-v26-v27.js      ← V26/V27 UI patches
│       ├── scope-system.js         ← Module scope registration
│       ├── three-3d-view.js        ← 3D code visualization (Three.js)
│       ├── git-ui.js               ← Git UI panel
│       ├── ai-review.js            ← AI auto-review, cost controls
│       ├── toast-v29.js            ← Toast system v29+
│       ├── genesis-ui.js           ← Genesis UI design system
│       ├── console-patch.js        ← Native console capture
│       ├── tools-panel.js          ← Tools: RegexTester, ColorPicker, etc.
│       ├── find-bar.js             ← Find/Replace bar UI
│       ├── terminal-ui-upgrade.js  ← Terminal UI enhancements
│       ├── runner-extensions.js    ← Lua, SQL, YAML, TOML, CSV runners
│       ├── performance.js          ← Performance profiler
│       ├── master-fix.js           ← Consolidated runtime fixes
│       ├── patches-v33.js          ← V33 editor/filetree/shortcuts fixes
│       └── init-v33.js             ← V33 final boot sequence
```

## So sánh trước/sau tái cấu trúc

| | Trước | Sau |
|---|---|---|
| Số file | 1 file HTML | 1 HTML + 1 CSS + 32 JS |
| Dòng code | 57,189 dòng | Phân tách rõ ràng |
| CSS | 44 blocks rải rác | 1 file hợp nhất |
| JS | Nhúng inline | 32 module files |
| Khả năng bảo trì | Khó | Dễ tìm và sửa |

## Lưu ý khi phát triển

1. **Thứ tự load quan trọng**: `core/` → `modules/` → `features/`
2. **Biến global**: Tất cả modules expose qua `window.*` (thiết kế gốc giữ nguyên)
3. **CSS specificity**: Đã hợp nhất theo đúng thứ tự từ file gốc
4. **CDN dependencies**: Xem `index.html` cho danh sách đầy đủ
5. **API Key**: Không bao giờ hardcode — dùng UI nhập hoặc `window.__apiKey.set()`
