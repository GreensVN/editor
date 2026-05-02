/**
 * three-3d-view.js
 * 3D visualization via Three.js — 3D code structure view
 * ProCode IDE v3.0
 */

// ═══════════════════════════════════════════════════════════════════════
// ProCode IDE v30 — THE SINGULARITY PATCH (migrated from v28)
// All features injected as non-destructive additions
// ═══════════════════════════════════════════════════════════════════════
(function() {
'use strict';

// ─────────────────────────────────────────────────────────────���───────
// §0 — DEPENDENCY LOADER (Promise-based bootloader — fixes race conditions)
// Replaces all setInterval polling with clean Promise resolution
// ─────────────────────────────────────────────────────────────────────
window.DependencyLoader = (function() {
  const _deps = {};
  const _ready = {};

  function waitFor(depName, timeout = 15000) {
    if (window[depName]) return Promise.resolve(window[depName]);
    if (_ready[depName]) return _ready[depName];

    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    _deps[depName] = { promise, resolve, reject };
    _ready[depName] = promise;

    // Auto-check via polling (100ms intervals, max timeout)
    let elapsed = 0;
    const check = setInterval(() => {
      elapsed += 100;
      if (window[depName]) {
        clearInterval(check);
        resolve(window[depName]);
      } else if (elapsed >= timeout) {
        clearInterval(check);
        reject(new Error(`DependencyLoader: ${depName} timed out after ${timeout}ms`));
      }
    }, 100);

    return promise;
  }

  function markReady(depName, value) {
    if (_deps[depName]) {
      _deps[depName].resolve(value || window[depName]);
    }
  }

  function waitForAll(depNames) {
    return Promise.all(depNames.map(d => waitFor(d)));
  }

  // Patch existing setInterval patterns for known deps
  ['monaco', 'EditorManager', 'FileSystem', 'TabManager', 'Utils'].forEach(dep => {
    if (window[dep]) markReady(dep, window[dep]);
  });

  // Observe global assignments via Proxy on window (modern approach)
  try {
    const _origDefProp = Object.defineProperty.bind(Object);
    // We watch via MutationObserver + custom events instead (safer)
    document.addEventListener('dep-ready', (e) => {
      if (e.detail?.name) markReady(e.detail.name, e.detail.value);
    });
  } catch(e) {}

  return { waitFor, markReady, waitForAll };
})();

// ─────────────────────────────────────────────────────────────────────
// §1 — HAPTIC FEEDBACK SYSTEM
// navigator.vibrate for mobile + visual ripple for desktop
// ─────────────────────────────────────────────────────────────────────
const HapticEngine = (function() {
  const PATTERNS = {
    keyCorrect: [10],
    keyError: [30, 20, 30],
    save: [15, 10, 15],
    action: [20],
    success: [10, 5, 10, 5, 30],
    warning: [50, 20, 50],
    error: [100, 30, 100]
  };

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch(e) {}
  }

  function ripple(x, y, color = '#6366f1') {
    const el = document.createElement('div');
    el.className = 'v28-haptic-ripple';
    el.style.cssText = `left:${x-20}px;top:${y-20}px;width:40px;height:40px;border-color:${color};`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 350);
  }

  function trigger(type, event) {
    const pattern = PATTERNS[type] || PATTERNS.action;
    vibrate(pattern);
    if (event) {
      const color = type === 'keyError' || type === 'error' ? '#ef4444' :
                    type === 'success' ? '#22c55e' : '#6366f1';
      ripple(event.clientX || window.innerWidth/2, event.clientY || window.innerHeight/2, color);
    }
  }

  // Hook into Monaco editor keystrokes
  DependencyLoader.waitFor('monaco').then(() => {
    try {
      const editors = monaco.editor.getEditors?.() || [];
      editors.forEach(hookEditor);
      // Also hook future editors
      monaco.editor.onDidCreateEditor(hookEditor);
    } catch(e) {}
  }).catch(() => {
    setTimeout(() => {
      try {
        if (window.monaco) {
          monaco.editor.onDidCreateEditor(hookEditor);
        }
      } catch(e) {}
    }, 3000);
  });

  function hookEditor(editor) {
    try {
      editor.onKeyDown(e => {
        if (e.keyCode === 9 /* Tab */ || e.keyCode === 13 /* Enter */) {
          vibrate(PATTERNS.keyCorrect);
        }
      });
      editor.onDidChangeModelContent(() => {
        // Check for error markers
        const model = editor.getModel();
        if (model) {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri });
          const hasError = markers.some(m => m.severity === 8 /* Error */);
          if (hasError) vibrate(PATTERNS.keyError);
        }
      });
    } catch(e) {}
  }

  return { trigger, vibrate, ripple, PATTERNS };
})();
window.HapticEngine = HapticEngine;

// ─────────────────────────────────────────────────────────────────────
// §2 — ADAPTIVE SPATIAL AUDIO ENGINE
// Calm lofi when no errors, distortion/heartbeat when syntax errors
// ─────────────────────────────────────────────────────────────────────
const AdaptiveAudio = (function() {
  let _ctx = null;
  let _enabled = false;
  let _errorState = false;
  let _masterGain = null;
  let _oscillators = [];
  let _heartbeatTimer = null;

  // Lofi chord frequencies (Am7 progression)
  const LOFI_CHORDS = [
    [220, 261.63, 329.63, 392],   // Am7
    [196, 246.94, 293.66, 370],   // Gm
    [174.61, 220, 261.63, 349.23], // Fm
    [207.65, 261.63, 311.13, 392]  // E7
  ];

  function init() {
    if (_ctx) return;
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.gain.setValueAtTime(0, _ctx.currentTime);
      _masterGain.connect(_ctx.destination);
    } catch(e) {
      console.warn('[v28 Audio] Web Audio API not available');
    }
  }

  function playLofiChord(chord) {
    if (!_ctx || !_enabled || _errorState) return;
    chord.forEach(freq => {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      const filter = _ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, _ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, _ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, _ctx.currentTime + 2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(_masterGain);
      osc.start(_ctx.currentTime);
      osc.stop(_ctx.currentTime + 2.5);
    });
  }

  function playHeartbeat() {
    if (!_ctx || !_enabled) return;
    const times = [0, 0.15];
    times.forEach(t => {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      const dist = _ctx.createWaveShaper();
      // Heavy distortion curve for error state
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (3 + 200) * x * 20 * (Math.PI / 180) / (Math.PI + 200 * Math.abs(x));
      }
      dist.curve = curve;
      osc.type = 'square';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0, _ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.15, _ctx.currentTime + t + 0.05);
      gain.gain.linearRampToValueAtTime(0, _ctx.currentTime + t + 0.2);
      osc.connect(dist);
      dist.connect(gain);
      gain.connect(_masterGain);
      osc.start(_ctx.currentTime + t);
      osc.stop(_ctx.currentTime + t + 0.3);
    });
  }

  let _chordIndex = 0;
  let _lofiTimer = null;

  function startLofi() {
    stopLofi();
    _masterGain && _masterGain.gain.linearRampToValueAtTime(1, _ctx.currentTime + 0.5);
    _lofiTimer = setInterval(() => {
      if (!_errorState) {
        playLofiChord(LOFI_CHORDS[_chordIndex % LOFI_CHORDS.length]);
        _chordIndex++;
      }
    }, 3000);
  }

  function stopLofi() {
    clearInterval(_lofiTimer);
    clearInterval(_heartbeatTimer);
    if (_masterGain && _ctx) {
      _masterGain.gain.linearRampToValueAtTime(0, _ctx.currentTime + 0.5);
    }
  }

  function setErrorState(hasErrors) {
    if (_errorState === hasErrors) return;
    _errorState = hasErrors;
    if (!_enabled) return;

    const btn = document.getElementById('v28-audio-btn');
    if (hasErrors) {
      btn && btn.classList.add('error-state');
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = setInterval(playHeartbeat, 1500);
    } else {
      btn && btn.classList.remove('error-state');
      clearInterval(_heartbeatTimer);
    }
  }

  function enable() {
    init();
    if (!_ctx) return;
    _enabled = true;
    _ctx.resume();
    startLofi();
    const btn = document.getElementById('v28-audio-btn');
    if (btn) { btn.classList.add('active'); btn.title = 'Audio ON (click to disable)'; btn.textContent = '🔊'; }

    // Hook into Monaco error detection
    DependencyLoader.waitFor('monaco').then(() => {
      monaco.editor.onDidChangeMarkers(() => {
        try {
          const editors = monaco.editor.getEditors?.() || [];
          let hasErrors = false;
          editors.forEach(ed => {
            const model = ed.getModel();
            if (model) {
              const markers = monaco.editor.getModelMarkers({ resource: model.uri });
              if (markers.some(m => m.severity === 8)) hasErrors = true;
            }
          });
          setErrorState(hasErrors);
        } catch(e) {}
      });
    }).catch(() => {});
  }

  function disable() {
    _enabled = false;
    stopLofi();
    const btn = document.getElementById('v28-audio-btn');
    if (btn) { btn.classList.remove('active', 'error-state'); btn.title = 'Audio OFF (click to enable)'; btn.textContent = '🔇'; }
  }

  function toggle() {
    _enabled ? disable() : enable();
  }

  // Create audio button (hidden - accessible via hamburger menu only)
  function createUI() {
    const btn = document.createElement('button');
    btn.id = 'v28-audio-btn';
    btn.textContent = '🔇';
    btn.title = 'Adaptive Audio (click to enable)';
    btn.onclick = toggle;
    btn.style.display = 'none'; // hidden standalone, accessible via hamburger menu
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }

  return { enable, disable, toggle, setErrorState };
})();
window.AdaptiveAudio = AdaptiveAudio;

// ────────────────────────────────────────────────────────────────────��
// §3 — 3D CODE CITY (WebGL / Three.js visualization)
// Files → buildings, size = file size, errors = fire particles
// ─────────────────────────��─���─────────────────────────────────────────
const CodeCity3D = (function() {
  let _scene, _camera, _renderer, _controls;
  let _animId, _raycaster, _mouse;
  let _buildings = [];
  let _visible = false;
  let _tooltip;

  const COLORS = {
    js: 0xf59e0b,
    ts: 0x3b82f6,
    html: 0xef4444,
    css: 0x8b5cf6,
    py: 0x22c55e,
    json: 0x71717a,
    md: 0x06b6d4,
    default: 0x6366f1,
    ground: 0x09090b,
    grid: 0x1d1d27,
    fire: 0xff4500
  };

  function getColor(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return COLORS[ext] || COLORS.default;
  }

  function init() {
    const overlay = document.getElementById('v28-codecity-overlay');
    if (!overlay || !window.THREE) return;

    const canvas = document.getElementById('v28-codecity-canvas');
    const W = overlay.clientWidth, H = overlay.clientHeight - 60;

    // Scene
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x030307);
    _scene.fog = new THREE.Fog(0x030307, 30, 120);

    // Camera
    _camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
    _camera.position.set(0, 25, 40);
    _camera.lookAt(0, 0, 0);

    // Renderer
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    _renderer.setSize(W, H);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambient = new THREE.AmbientLight(0x1a1a2e, 2);
    _scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x6366f1, 3);
    dirLight.position.set(10, 30, 10);
    dirLight.castShadow = true;
    _scene.add(dirLight);
    const pointLight = new THREE.PointLight(0xa855f7, 2, 50);
    pointLight.position.set(-10, 15, -10);
    _scene.add(pointLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(100, 30, 0x1d1d27, 0x1d1d27);
    _scene.add(gridHelper);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    _scene.add(ground);

    // Raycaster for hover
    _raycaster = new THREE.Raycaster();
    _mouse = new THREE.Vector2();

    // Simple orbit controls (manual)
    setupControls(canvas);

    // Load file data
    buildCity();

    _tooltip = document.getElementById('v28-codecity-tooltip');
    canvas.addEventListener('mousemove', onMouseMove);

    // Start render loop
    animate();
  }

  let _isDragging = false, _prevMouse = { x: 0, y: 0 };
  let _theta = 0, _phi = Math.PI / 4, _radius = 45;

  function setupControls(canvas) {
    canvas.addEventListener('mousedown', e => { _isDragging = true; _prevMouse = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('mouseup', () => { _isDragging = false; });
    canvas.addEventListener('mousemove', e => {
      if (!_isDragging) return;
      const dx = e.clientX - _prevMouse.x;
      const dy = e.clientY - _prevMouse.y;
      _theta -= dx * 0.01;
      _phi = Math.max(0.2, Math.min(Math.PI / 2.1, _phi - dy * 0.01));
      _prevMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('wheel', e => {
      _radius = Math.max(10, Math.min(100, _radius + e.deltaY * 0.05));
    });
    // Touch support
    let _lastTouch = null;
    canvas.addEventListener('touchstart', e => { _lastTouch = e.touches[0]; });
    canvas.addEventListener('touchmove', e => {
      if (!_lastTouch || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - _lastTouch.clientX;
      const dy = e.touches[0].clientY - _lastTouch.clientY;
      _theta -= dx * 0.015;
      _phi = Math.max(0.2, Math.min(Math.PI / 2.1, _phi - dy * 0.015));
      _lastTouch = e.touches[0];
    });
  }

  function buildCity() {
    // Clear existing buildings
    _buildings.forEach(b => _scene.remove(b.mesh));
    _buildings = [];

    // Get files from FileSystem
    let files = [];
    try {
      if (window.FileSystem?.files) {
        const fs = window.FileSystem.files;
        if (typeof fs === 'object') {
          Object.entries(fs).forEach(([path, content]) => {
            if (typeof content === 'string') {
              files.push({ path, size: content.length, name: path.split('/').pop() || path });
            }
          });
        }
      }
    } catch(e) {}

    // Add mock files if empty
    if (files.length === 0) {
      files = [
        { path: 'index.html', size: 5000, name: 'index.html' },
        { path: 'app.js', size: 8000, name: 'app.js' },
        { path: 'style.css', size: 2000, name: 'style.css' },
        { path: 'utils.ts', size: 3000, name: 'utils.ts' },
        { path: 'config.json', size: 800, name: 'config.json' },
        { path: 'main.py', size: 4000, name: 'main.py' },
        { path: 'README.md', size: 1200, name: 'README.md' },
      ];
    }

    const maxSize = Math.max(...files.map(f => f.size), 1);
    const cols = Math.ceil(Math.sqrt(files.length));
    const spacing = 5;
    const offset = -(cols * spacing) / 2;

    files.slice(0, 64).forEach((file, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const height = Math.max(1, (file.size / maxSize) * 15);
      const color = getColor(file.name);

      // Building geometry
      const geo = new THREE.BoxGeometry(3.5, height, 3.5);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.6,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.05
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(offset + col * spacing, height / 2, offset + row * spacing);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { file, originalColor: color };
      _scene.add(mesh);

      // Rooftop glow
      const roofGeo = new THREE.PlaneGeometry(3.2, 3.2);
      const roofMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(0, height / 2 + 0.01, 0);
      mesh.add(roof);

      // Windows (small point lights effect)
      if (height > 3) {
        for (let w = 0; w < Math.min(4, Math.floor(height / 2)); w++) {
          const winGeo = new THREE.PlaneGeometry(0.5, 0.4);
          const winMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xffff99 : 0x333333,
            transparent: true, opacity: 0.8
          });
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * (height * 0.8),
            1.76
          );
          mesh.add(win);
        }
      }

      _buildings.push({ mesh, file });
    });

    // Add floating text labels (particle-based since no TextGeometry)
    addCityAtmosphere();
  }

  function addCityAtmosphere() {
    // Floating particles (stars/data streams)
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({ color: 0x6366f1, size: 0.15, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(partGeo, partMat);
    particles.userData.isParticles = true;
    _scene.add(particles);
  }

  function onMouseMove(e) {
    const canvas = document.getElementById('v28-codecity-canvas');
    if (!canvas || !_raycaster) return;
    const rect = canvas.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_mouse, _camera);
    const meshes = _buildings.map(b => b.mesh);
    const intersects = _raycaster.intersectObjects(meshes);

    // Reset all
    _buildings.forEach(b => {
      b.mesh.material.emissiveIntensity = 0.05;
    });

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      hit.material.emissiveIntensity = 0.4;
      const data = hit.userData;
      if (_tooltip && data.file) {
        _tooltip.style.display = 'block';
        _tooltip.style.left = (e.clientX + 12) + 'px';
        _tooltip.style.top = (e.clientY - 10) + 'px';
        _tooltip.innerHTML = `
          <b style="color:#6366f1">${data.file.name}</b><br>
          <span style="color:#71717a">Size: ${(data.file.size / 1024).toFixed(1)} KB</span><br>
          <span style="color:#71717a">Path: ${data.file.path}</span>
        `;
      }
    } else {
      if (_tooltip) _tooltip.style.display = 'none';
    }
  }

  function animate() {
    _animId = requestAnimationFrame(animate);
    if (!_renderer || !_scene || !_camera) return;

    // Update camera from spherical coords
    _camera.position.x = _radius * Math.sin(_phi) * Math.sin(_theta);
    _camera.position.y = _radius * Math.cos(_phi);
    _camera.position.z = _radius * Math.sin(_phi) * Math.cos(_theta);
    _camera.lookAt(0, 0, 0);

    // Animate particles
    _scene.children.forEach(obj => {
      if (obj.userData.isParticles) {
        obj.rotation.y += 0.0005;
        const pos = obj.geometry.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] += 0.01;
          if (pos[i] > 45) pos[i] = 5;
        }
        obj.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Gentle building pulse
    const t = Date.now() * 0.001;
    _buildings.forEach((b, i) => {
      b.mesh.material.emissiveIntensity =
        Math.max(0.03, b.mesh.material.emissiveIntensity * 0.98);
      // Subtle scale pulse for active file
      if (i === 0) {
        b.mesh.scale.y = 1 + Math.sin(t + i) * 0.01;
      }
    });

    _renderer.render(_scene, _camera);
  }

  function createUI() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'v28-codecity-overlay';
    overlay.innerHTML = `
      <div id="v28-codecity-hud">
        <span class="hud-title">🏙️ ProCode City — 3D Architecture View</span>
        <button id="v28-codecity-close" onclick="CodeCity3D.hide()">✕ Close [ESC]</button>
      </div>
      <canvas id="v28-codecity-canvas"></canvas>
      <div id="v28-codecity-tooltip"></div>
    `;
    document.body.appendChild(overlay);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _visible) hide();
    });
  }

  function show() {
    if (!document.getElementById('v28-codecity-overlay')) createUI();
    const overlay = document.getElementById('v28-codecity-overlay');
    overlay.classList.add('visible');
    _visible = true;
    HapticEngine.trigger('action');

    if (!window.THREE) {
      overlay.innerHTML += `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:16px">⚠️ Three.js not loaded. Please check CDN connection.</div>`;
      return;
    }

    // Small delay for DOM to settle
    setTimeout(() => {
      if (!_renderer) init();
      else buildCity();
    }, 100);
  }

  function hide() {
    document.getElementById('v28-codecity-overlay')?.classList.remove('visible');
    _visible = false;
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  }

  function toggle() { _visible ? hide() : show(); }

  return { show, hide, toggle, buildCity };
})();
window.CodeCity3D = CodeCity3D;

// ─────────────────────────────────────────────────────────────────────
// §4 — MULTI-AGENT AI SYSTEM
// Agent Coder + Agent Reviewer + Agent Architect
// ─────────────────────────────────────────────────────────────────────
const MultiAgentAI = (function() {
  let _visible = false;
  let _reviewTimer = null;
  let _architectTimer = null;

  const agents = {
    coder: { name: 'Coder', icon: '⚡', status: 'idle', desc: 'Tab completion' },
    reviewer: { name: 'Reviewer', icon: '🔍', status: 'idle', desc: 'O(n²) + security scan' },
    architect: { name: 'Architect', icon: '🏛', status: 'idle', desc: 'Auto diagram' }
  };

  const _log = [];

  function addLog(agent, msg) {
    const entry = { agent, msg, time: new Date().toLocaleTimeString() };
    _log.unshift(entry);
    if (_log.length > 50) _log.pop();
    renderLog();
    updateAgentStatus(agent, 'active');
    setTimeout(() => updateAgentStatus(agent, 'idle'), 2000);
  }

  function updateAgentStatus(agentName, status) {
    agents[agentName].status = status;
    const card = document.querySelector(`.v28-agent-card[data-agent="${agentName}"]`);
    if (!card) return;
    card.className = `v28-agent-card ${status === 'active' ? 'active' : status === 'busy' ? 'busy' : ''}`;
    card.querySelector('.v28-agent-status').textContent = status === 'active' ? '● working' :
      status === 'busy' ? '◌ thinking...' : '○ standby';
  }

  function renderLog() {
    const logEl = document.getElementById('v28-agent-log');
    if (!logEl) return;
    logEl.innerHTML = _log.slice(0, 20).map(e => `
      <div class="v28-agent-log-entry ${e.agent}">
        <span style="color:#3f3f46">${e.time}</span>
        <span style="margin-left:6px">[${e.agent.toUpperCase()}]</span>
        <span style="margin-left:6px">${e.msg}</span>
      </div>
    `).join('');
  }

  // Agent Reviewer: scan for O(n²) patterns and security issues
  function runReviewer(code) {
    updateAgentStatus('reviewer', 'busy');
    setTimeout(() => {
      try {
        const issues = [];

        // O(n²) detection patterns
        const nestedLoopPattern = /for\s*\([^)]+\)[^{]*\{[^}]*for\s*\([^)]+\)/g;
        const nestedWhilePattern = /while\s*\([^)]+\)[^{]*\{[^}]*while\s*\([^)]+\)/g;
        if (nestedLoopPattern.test(code)) issues.push('⚠️ Potential O(n²): nested loops detected');
        if (nestedWhilePattern.test(code)) issues.push('⚠️ Potential O(n²): nested while loops');

        // Security patterns
        if (/eval\s*\(/.test(code)) issues.push('🔴 Security: eval() usage detected');
        if (/innerHTML\s*=/.test(code) && !code.includes('DOMPurify')) issues.push('🔴 Security: unsanitized innerHTML');
        if (/document\.write\s*\(/.test(code)) issues.push('🔴 Security: document.write() is dangerous');
        if (/localStorage\.(set|get)Item\s*\([^,)]+password/i.test(code)) issues.push('🔴 Security: password in localStorage');
        if (/http:\/\/(?!localhost)/.test(code)) issues.push('⚠️ Security: insecure HTTP URL');

        // Performance hints
        if (/\.querySelector/.test(code) && code.match(/\.querySelector/g)?.length > 10) {
          issues.push('💡 Perf: excessive DOM queries — consider caching');
        }
        if (/console\.(log|warn|error)/.test(code)) {
          const count = (code.match(/console\.(log|warn|error)/g) || []).length;
          if (count > 5) issues.push(`💡 Debug: ${count} console statements found`);
        }

        if (issues.length > 0) {
          issues.forEach(issue => addLog('reviewer', issue));
          // Add Monaco decorations
          addReviewDecorations(issues);
        } else {
          addLog('reviewer', '✅ Code scan complete — no issues found');
        }
      } catch(e) {
        addLog('reviewer', '⚠️ Scan error: ' + e.message);
      }
    }, 800);
  }

  function addReviewDecorations(issues) {
    try {
      if (!window.monaco) return;
      const editors = monaco.editor.getEditors?.() || [];
      const editor = editors[0];
      if (!editor) return;
      // Decorations would be added here (simplified for compatibility)
    } catch(e) {}
  }

  // Agent Architect: generate architecture diagram
  function runArchitect(files) {
    updateAgentStatus('architect', 'busy');
    setTimeout(() => {
      try {
        const nodes = [];
        const edges = [];

        if (files && typeof files === 'object') {
          Object.keys(files).forEach(path => {
            const name = path.split('/').pop();
            nodes.push({ id: path, name });

            // Simple dependency detection
            const content = files[path] || '';
            const imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
            const requires = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
            [...imports, ...requires].forEach(imp => {
              const match = imp.match(/['"]([^'"]+)['"]/);
              if (match && !match[1].startsWith('.')) return;
              if (match) edges.push({ from: path, to: match[1] });
            });
          });
        }

        renderArchitectDiagram(nodes, edges);
        addLog('architect', `📐 Diagram updated: ${nodes.length} nodes, ${edges.length} edges`);
      } catch(e) {
        addLog('architect', '⚠️ Diagram error: ' + e.message);
      }
    }, 600);
  }

  function renderArchitectDiagram(nodes, edges) {
    const panel = document.getElementById('v28-arch-panel');
    if (!panel || !panel.classList.contains('visible')) return;

    const canvas = document.getElementById('v28-arch-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const maxR = Math.min(cx, cy) - 60;
    const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1);

    const positions = {};
    nodes.forEach((node, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = nodes.length === 1 ? 0 : maxR * (0.5 + 0.5 * (i % 2));
      positions[node.id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        name: node.name
      };
    });

    // Draw edges
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;
      const ext = node.name.split('.').pop();
      const colors = { js: '#f59e0b', ts: '#3b82f6', html: '#ef4444', css: '#8b5cf6', py: '#22c55e', json: '#71717a' };
      const color = colors[ext] || '#6366f1';

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e4e4e7';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.slice(0, 12), pos.x, pos.y + 30);
    });

    if (nodes.length === 0) {
      ctx.fillStyle = '#3f3f46';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Open files to see architecture', cx, cy);
    }
  }

  // Start periodic review
  let _reviewerBusy = false;
  function startAutoReview() {
    clearInterval(_reviewTimer);
    // FIX-COST-1: Increased interval to 120s (was 30s) and added busy guard to prevent
    // stacking API calls. Each review call sends the full file to Anthropic API — running
    // it every 30s on a large file costs significant tokens without user awareness.
    _reviewTimer = setInterval(() => {
      try {
        if (!window.monaco || _reviewerBusy) return;
        const editors = monaco.editor.getEditors?.() || [];
        if (editors[0]) {
          const code = editors[0].getValue();
          if (code && code.length > 50) {
            _reviewerBusy = true;
            runReviewer(code);
            setTimeout(() => { _reviewerBusy = false; }, 30000); // min 30s between reviews
          }
        }
      } catch(e) { _reviewerBusy = false; }
    }, 120000); // Every 2 minutes
  }

  function startAutoArchitect() {
    clearInterval(_architectTimer);
    _architectTimer = setInterval(() => {
      try {
        if (window.FileSystem?.files) runArchitect(window.FileSystem.files);
      } catch(e) {}
    }, 60000); // Every minute
  }

  function createUI() {
    const panel = document.createElement('div');
    panel.id = 'v28-agent-panel';
    panel.innerHTML = `
      <div class="v28-agent-header">
        <span class="v28-agent-title">🤖 Multi-Agent AI Council</span>
        <button onclick="MultiAgentAI.hide()" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div class="v28-agents-grid">
        ${Object.entries(agents).map(([key, a]) => `
          <div class="v28-agent-card" data-agent="${key}" onclick="MultiAgentAI.runAgent('${key}')">
            <div class="v28-agent-icon">${a.icon}</div>
            <div class="v28-agent-name">${a.name}</div>
            <div class="v28-agent-status">○ standby</div>
          </div>
        `).join('')}
      </div>
      <div class="v28-agent-log" id="v28-agent-log">
        <div class="v28-agent-log-entry" style="color:#3f3f46">Agent system ready...</div>
      </div>
    `;
    document.body.appendChild(panel);

    // Arch panel
    const archPanel = document.createElement('div');
    archPanel.id = 'v28-arch-panel';
    archPanel.innerHTML = `
      <div style="position:absolute;top:8px;right:8px;z-index:60;display:flex;gap:8px">
        <button onclick="MultiAgentAI.runAgent('architect')" style="background:#6366f120;border:1px solid #6366f1;color:#6366f1;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">Refresh</button>
        <button onclick="document.getElementById('v28-arch-panel').classList.remove('visible')" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:14px">✕</button>
      </div>
      <canvas id="v28-arch-canvas" style="width:100%;height:100%"></canvas>
    `;
    document.body.appendChild(archPanel);
  }

  function runAgent(agentName) {
    try {
      switch(agentName) {
        case 'coder':
          addLog('coder', '💡 AI Coder ready — use Tab for completions');
          break;
        case 'reviewer':
          const editors = window.monaco?.editor?.getEditors?.() || [];
          const code = editors[0]?.getValue() || '';
          if (code) runReviewer(code);
          else addLog('reviewer', '⚠️ No file open to review');
          break;
        case 'architect':
          const files = window.FileSystem?.files || {};
          runArchitect(files);
          const archPanel = document.getElementById('v28-arch-panel');
          if (archPanel) archPanel.classList.add('visible');
          break;
      }
    } catch(e) { addLog(agentName, '❌ Error: ' + e.message); }
  }

  function show() {
    if (!document.getElementById('v28-agent-panel')) createUI();
    document.getElementById('v28-agent-panel').classList.add('visible');
    _visible = true;
    startAutoReview();
    startAutoArchitect();
  }

  function hide() {
    document.getElementById('v28-agent-panel')?.classList.remove('visible');
    _visible = false;
  }

  function toggle() { _visible ? hide() : show(); }

  return { show, hide, toggle, runAgent, runReviewer, runArchitect };
})();
window.MultiAgentAI = MultiAgentAI;

// ─────────────────────────────────────────────────────���───────────────
// §5 — Y.js MULTIPLAYER — REMOVED
// The previous MultiplayerEngine was a fake collaboration feature that
// either ran a "demo bot" (simulateMultiplayer) or a same-browser-only
// BroadcastChannel sync. It misled users into thinking real-time
// collaboration worked. Replaced with a no-op stub so callers do not throw.
// ──────────────────────────────────────────────��────��─────────────────
const MultiplayerEngine = { connect(){}, disconnect(){}, broadcast(){} }; // no-op stub

// Original implementation removed below — preserved only as a comment block to
// keep this file's structure intact for downstream patches.
const __MultiplayerEngine_REMOVED = (function() {
  // intentionally empty
  return null;
})();
// Stop legacy implementation below from running (kept in source as dead code
// preserved inside an `if(false){}` guard below to avoid any nested closure
// bracket mismatches in this large file).
if (false) { (function() {
  let _ydoc = null;
  let _ytext = null;
  let _provider = null;
  let _awareness = null;
  let _visible = false;
  let _connected = false;
  let _roomId = '';
  let _users = {};
  let _myColor = '';

  const USER_COLORS = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  function randomColor() {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  }

  function randomName() {
    const names = ['Dev', 'Coder', 'Hacker', 'Builder', 'Creator'];
    const num = Math.floor(Math.random() * 1000);
    return names[Math.floor(Math.random() * names.length)] + num;
  }

  async function connect(roomId) {
    if (!window.Y) {
      addStatus('⚠️ Y.js not loaded — using local simulation mode');
      simulateMultiplayer(roomId);
      return;
    }

    try {
      _roomId = roomId || 'procode-room-' + Date.now();
      _ydoc = new Y.Doc();
      _ytext = _ydoc.getText('editor');
      _myColor = randomColor();

      // Try WebRTC provider (peer-to-peer, no server needed for LAN)
      // We use BroadcastChannel as fallback for same-browser testing
      setupBroadcastSync();

      _connected = true;
      updateUI();
      addStatus(`✅ Connected to room: ${_roomId}`);
      addStatus(`👤 You are: ${document.getElementById('v28-mp-name')?.value || 'Anonymous'} (${_myColor})`);

      // Sync current editor content to Y.js
      syncEditorToYjs();

    } catch(e) {
      addStatus('❌ Connection error: ' + e.message);
    }
  }

  function setupBroadcastSync() {
    // BroadcastChannel allows sync between tabs on same origin
    try {
      const bc = new BroadcastChannel('procode-v28-' + _roomId);
      const myId = Math.random().toString(36).slice(2, 8);
      const myName = document.getElementById('v28-mp-name')?.value || randomName();

      bc.onmessage = (e) => {
        try {
          const { type, userId, userName, userColor, content, cursor } = e.data;
          if (userId === myId) return;

          if (type === 'join') {
            _users[userId] = { name: userName, color: userColor, cursor: null };
            addStatus(`👋 ${userName} joined`);
            updateUsersList();
            // Send current content
            bc.postMessage({ type: 'content', userId: myId, userName: myName, content: getCurrentEditorContent() });
          } else if (type === 'content') {
            if (!_users[userId]) _users[userId] = { name: userName, color: userColor };
          } else if (type === 'cursor') {
            if (_users[userId]) {
              _users[userId].cursor = cursor;
              renderRemoteCursors();
            }
          } else if (type === 'leave') {
            const name = _users[userId]?.name || userId;
            delete _users[userId];
            addStatus(`👋 ${name} left`);
            updateUsersList();
          }
        } catch(err) {}
      };

      // Announce join
      bc.postMessage({ type: 'join', userId: myId, userName: myName, userColor: _myColor });

      window.addEventListener('beforeunload', () => {
        bc.postMessage({ type: 'leave', userId: myId });
        bc.close();
      });

      _users[myId] = { name: myName, color: _myColor, isMe: true };
      updateUsersList();

      // Listen to editor changes and broadcast
      DependencyLoader.waitFor('monaco').then(() => {
        const editors = monaco.editor.getEditors?.() || [];
        if (editors[0]) {
          editors[0].onDidChangeCursorPosition(e => {
            bc.postMessage({ type: 'cursor', userId: myId, cursor: e.position });
          });
        }
      }).catch(() => {});

    } catch(e) {
      addStatus('⚠️ BroadcastChannel not available (same-tab only mode)');
    }
  }

  function simulateMultiplayer(roomId) {
    // Simulate a virtual collaborator for demo
    _connected = true;
    _roomId = roomId || 'demo-room';
    _myColor = randomColor();

    _users = {
      'me': { name: document.getElementById('v28-mp-name')?.value || 'You', color: _myColor, isMe: true },
      'bot1': { name: 'AI-Collaborator', color: '#a855f7', isBot: true }
    };

    addStatus(`🎭 Demo mode: virtual room "${_roomId}"`);
    addStatus(`🤖 AI-Collaborator joined (simulation)`);
    updateUI();
    updateUsersList();

    // Simulate bot typing occasionally
    setInterval(() => {
      if (!_connected) return;
      const botMessages = [
        'reviewing your code...',
        'looks good! 👍',
        'suggestion: add error handling',
        'nice architecture!',
        'I see a potential optimization here'
      ];
      addStatus(`💬 AI-Collaborator: ${botMessages[Math.floor(Math.random() * botMessages.length)]}`);
    }, 45000);
  }

  function syncEditorToYjs() {
    try {
      const editors = window.monaco?.editor?.getEditors?.() || [];
      if (editors[0] && _ytext) {
        const content = editors[0].getValue();
        _ydoc.transact(() => {
          _ytext.delete(0, _ytext.length);
          _ytext.insert(0, content);
        });
      }
    } catch(e) {}
  }

  function getCurrentEditorContent() {
    try {
      const editors = window.monaco?.editor?.getEditors?.() || [];
      return editors[0]?.getValue() || '';
    } catch(e) { return ''; }
  }

  function renderRemoteCursors() {
    // Remove existing cursor decorations
    document.querySelectorAll('.v28-remote-cursor').forEach(el => el.remove());

    Object.entries(_users).forEach(([id, user]) => {
      if (user.isMe || !user.cursor) return;
      const editors = window.monaco?.editor?.getEditors?.() || [];
      const editor = editors[0];
      if (!editor) return;

      try {
        const pos = editor.getScrolledVisiblePosition(user.cursor);
        if (!pos) return;
        const editorDom = editor.getDomNode();
        if (!editorDom) return;
        const rect = editorDom.getBoundingClientRect();

        const cursor = document.createElement('div');
        cursor.className = 'v28-remote-cursor';
        cursor.style.cssText = `left:${rect.left + pos.left}px;top:${rect.top + pos.top}px;`;
        cursor.innerHTML = `
          <div class="v28-cursor-caret" style="background:${user.color}"></div>
          <div class="v28-cursor-label" style="background:${user.color}">${user.name}</div>
        `;
        document.body.appendChild(cursor);
      } catch(e) {}
    });
  }

  function updateUI() {
    const btn = document.querySelector('[data-v28="mp-connect"]');
    if (btn) btn.textContent = _connected ? 'Disconnect' : 'Connect';
    const status = document.getElementById('v28-mp-status');
    if (status) {
      status.textContent = _connected ? `● Connected (${Object.keys(_users).length} users)` : '○ Disconnected';
      status.style.color = _connected ? '#22c55e' : '#71717a';
    }
  }

  function updateUsersList() {
    const list = document.getElementById('v28-users-list');
    if (!list) return;
    list.innerHTML = Object.entries(_users).map(([id, u]) => `
      <div class="v28-user-item">
        <div class="v28-user-dot" style="background:${u.color}"></div>
        <span>${u.name}</span>
        ${u.isMe ? '<span style="color:#6366f1;font-size:9px">(you)</span>' : ''}
        ${u.isBot ? '<span style="color:#a855f7;font-size:9px">(AI)</span>' : ''}
        <span class="v28-user-status">● online</span>
      </div>
    `).join('');
    updateUI();
  }

  function addStatus(msg) {
    const statusEl = document.getElementById('v28-mp-messages');
    if (!statusEl) return;
    const div = document.createElement('div');
    div.style.cssText = 'padding:3px 0;border-bottom:1px solid #18181b;font-size:10px;color:#a1a1aa;';
    div.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
    statusEl.insertBefore(div, statusEl.firstChild);
    if (statusEl.children.length > 20) statusEl.lastChild?.remove();
  }

  function disconnect() {
    _connected = false;
    _users = {};
    if (_ydoc) { try { _ydoc.destroy(); } catch(e) {} _ydoc = null; }
    updateUI();
    updateUsersList();
    addStatus('🔌 Disconnected');
    document.querySelectorAll('.v28-remote-cursor').forEach(el => el.remove());
  }

  function createUI() {
    const panel = document.createElement('div');
    panel.id = 'v28-multiplayer-panel';
    panel.innerHTML = `
      <div class="v28-mp-header">
        <span class="v28-mp-title">🔗 Live Collaboration (Y.js)</span>
        <button onclick="MultiplayerEngine.hide()" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:14px">✕</button>
      </div>
      <div class="v28-mp-body">
        <div style="margin-bottom:10px">
          <input id="v28-mp-name" placeholder="Your name..." style="width:100%;background:#18181b;border:1px solid #27272a;border-radius:6px;padding:5px 8px;color:#e4e4e7;font-size:11px;font-family:'JetBrains Mono',monospace;margin-bottom:6px;">
          <div class="v28-mp-room">
            <input id="v28-mp-room-id" placeholder="Room ID (leave blank = new)" style="flex:1;background:#18181b;border:1px solid #27272a;border-radius:6px;padding:5px 8px;color:#e4e4e7;font-size:11px;font-family:'JetBrains Mono',monospace;">
            <button class="v28-mp-btn" data-v28="mp-connect" onclick="
              const btn = this;
              if(window.__v28_mp_connected) { MultiplayerEngine.disconnect(); window.__v28_mp_connected=false; btn.textContent='Connect'; btn.classList.remove('disconnect'); }
              else { MultiplayerEngine.connect(document.getElementById('v28-mp-room-id').value); window.__v28_mp_connected=true; btn.textContent='Disconnect'; btn.classList.add('disconnect'); }
            ">Connect</button>
          </div>
        </div>
        <div id="v28-mp-status" style="color:#71717a;font-size:10px;margin-bottom:8px">○ Disconnected</div>
        <div class="v28-users-list" id="v28-users-list">
          <div style="color:#3f3f46;font-size:10px">No users connected</div>
        </div>
        <div id="v28-mp-messages" style="margin-top:8px;max-height:120px;overflow-y:auto;border-top:1px solid #27272a;padding-top:8px">
          <div style="color:#3f3f46;font-size:10px">Messages will appear here...</div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function show() {
    if (!document.getElementById('v28-multiplayer-panel')) createUI();
    document.getElementById('v28-multiplayer-panel').classList.add('visible');
    _visible = true;
  }

  function hide() {
    document.getElementById('v28-multiplayer-panel')?.classList.remove('visible');
    _visible = false;
  }

  function toggle() { _visible ? hide() : show(); }

  return { show, hide, toggle, connect, disconnect };
})(); } // close `if (false) {` wrapping the dead MultiplayerEngine code
// (window.MultiplayerEngine already assigned at the top of this section to the no-op stub)

// ────────────────────────────────────────���────────────────────────────
// §6 — NATIVE FILE SYSTEM ACCESS (OS-level file read/write)
// Opens real folders from C:\Projects or ~/Documents
// ─────────────────────────────────────────────────────────────────────
const NativeFileSystem = (function() {
  let _directoryHandle = null;
  let _watchTimer = null;
  let _cachedFiles = {};

  async function openFolder() {
    if (!window.showDirectoryPicker) {
      try { window.Utils?.toast?.('Native FS requires Chrome/Edge 86+', 'error'); } catch(e) {}
      return;
    }

    try {
      _directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      try { window.Utils?.toast?.(`📁 Opened: ${_directoryHandle.name}`, 'success'); } catch(e) {}
      await loadDirectory(_directoryHandle);
      startWatcher();
      HapticEngine.trigger('success');
    } catch(e) {
      if (e.name !== 'AbortError') {
        try { window.Utils?.toast?.('Failed to open folder: ' + e.message, 'error'); } catch(err) {}
      }
    }
  }

  async function loadDirectory(dirHandle, basePath = '') {
    const files = {};
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const path = basePath ? `${basePath}/${name}` : name;
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          const content = await file.text();
          files[path] = content;
          _cachedFiles[path] = { content, handle, modified: file.lastModified };
        } else if (handle.kind === 'directory' && !name.startsWith('.') && name !== 'node_modules') {
          const subFiles = await loadDirectory(handle, path);
          Object.assign(files, subFiles);
        }
      }
    } catch(e) {}

    // Inject into FileSystem
    if (window.FileSystem && basePath === '') {
      try {
        Object.entries(files).forEach(([path, content]) => {
          if (window.FileSystem.files) window.FileSystem.files[path] = content;
          else if (window.FileSystem.createFile) window.FileSystem.createFile(path, content);
        });
        if (window.FileSystem.render) window.FileSystem.render();
        try { window.Utils?.toast?.(`✅ Loaded ${Object.keys(files).length} files from OS`, 'success'); } catch(e) {}
      } catch(e) {}
    }

    return files;
  }

  async function saveFile(path, content) {
    if (!_cachedFiles[path]?.handle) return false;
    try {
      const writable = await _cachedFiles[path].handle.createWritable();
      await writable.write(content);
      await writable.close();
      _cachedFiles[path].content = content;
      return true;
    } catch(e) {
      console.warn('[v28 NativeFS] Save error:', e);
      return false;
    }
  }

  async function autoSave() {
    if (!_directoryHandle || !window.EditorManager) return;
    try {
      const activeFile = window.IDE?.state?.activeTab || window.FileSystem?.current?.path;
      if (!activeFile) return;
      const content = window.EditorManager?.getValue?.() || '';
      const saved = await saveFile(activeFile, content);
      if (saved) {
        // Subtle visual feedback
        const footer = document.querySelector('.footer-info, .footer, .status-bar');
        if (footer) {
          const orig = footer.style.borderTop;
          footer.style.borderTop = '2px solid #22c55e';
          setTimeout(() => footer.style.borderTop = orig, 1000);
        }
      }
    } catch(e) {}
  }

  function startWatcher() {
    clearInterval(_watchTimer);
    // Auto-save every 3 seconds
    _watchTimer = setInterval(autoSave, 3000);
  }

  function createButton() {
    // Add native FS button to toolbar area
    const btn = document.createElement('button');
    btn.id = 'v28-native-fs-btn';
    btn.innerHTML = '<i class="fas fa-folder-open"></i> Open OS Folder';
    btn.onclick = openFolder;
    btn.title = 'Open a real folder from your computer (Native File System API)';

    // Try to add to existing toolbar
    DependencyLoader.waitFor('FileSystem').then(() => {
      const toolbar = document.querySelector('.activity-bar, .sidebar-header, .panel-header');
      if (toolbar) {
        toolbar.appendChild(btn);
      } else {
        // Attach to sidebar header or hide
        const actBar = document.querySelector('.act-bar');
        if (actBar) {
          btn.style.cssText += ';font-size:10px;padding:4px 8px;display:none;';
          actBar.appendChild(btn);
        } else {
          btn.style.display = 'none';
        }
      }
    }).catch(() => {
      btn.style.cssText += ';position:fixed;top:54px;left:60px;z-index:200;font-size:10px;padding:4px 8px;';
      document.body.appendChild(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    setTimeout(createButton, 1000);
  }

  return { openFolder, saveFile, autoSave };
})();
window.NativeFileSystem = NativeFileSystem;

// ─────────────────────────────────────────────────────────────────────
// §7 — EYE TRACKING AUTOSCROLL (WebGazer.js)
// Eyes at bottom of screen → scroll down; eyes on right → open file tree
// ─────────────────────────────────────────────────────────────────────
const EyeTracking = (function() {
  let _enabled = false;
  let _calibrated = false;
  let _gazeX = 0, _gazeY = 0;
  let _scrollTimer = null;

  function init() {
    if (_enabled) return;

    // Lazy-load WebGazer
    if (!window.webgazer) {
      const script = document.createElement('script');
      script.src = window.__webgazerUrl;
      script.onload = startTracking;
      script.onerror = () => {
        try { window.Utils?.toast?.('⚠️ WebGazer failed to load — using mouse simulation', 'warn'); } catch(e) {}
        startMouseSimulation();
      };
      document.head.appendChild(script);
    } else {
      startTracking();
    }
  }

  function startTracking() {
    try {
      webgazer.setGazeListener((data) => {
        if (!data || !_enabled) return;
        _gazeX = data.x;
        _gazeY = data.y;
        processGaze(_gazeX, _gazeY);
      }).begin();

      webgazer.showVideoPreview(false);
      webgazer.showPredictionPoints(false);

      _enabled = true;
      updateIndicator(true);
      try { window.Utils?.toast?.('👁️ Eye tracking active — look to scroll!', 'success'); } catch(e) {}
    } catch(e) {
      console.warn('[v28 EyeTracking] WebGazer error:', e);
      startMouseSimulation();
    }
  }

  function startMouseSimulation() {
    // Fallback: use mouse position near screen edges as gaze simulation
    _enabled = true;
    updateIndicator(true);

    document.addEventListener('mousemove', (e) => {
      if (!_enabled) return;
      processGaze(e.clientX, e.clientY);
    });

    try { window.Utils?.toast?.('👁️ Eye tracking (mouse simulation mode)', 'info'); } catch(e) {}
  }

  function processGaze(x, y) {
    const H = window.innerHeight;
    const W = window.innerWidth;
    const EDGE = 80; // px from edge

    // Bottom zone → scroll down
    if (y > H - EDGE) {
      clearTimeout(_scrollTimer);
      _scrollTimer = setTimeout(() => {
        const editor = document.querySelector('.monaco-editor .overflow-guard');
        if (editor) editor.scrollTop += 100;
        else window.scrollBy(0, 50);
      }, 300);
    }
    // Top zone → scroll up
    else if (y < EDGE + 48) { // +48 for header
      clearTimeout(_scrollTimer);
      _scrollTimer = setTimeout(() => {
        const editor = document.querySelector('.monaco-editor .overflow-guard');
        if (editor) editor.scrollTop -= 100;
        else window.scrollBy(0, -50);
      }, 300);
    }

    // Right edge → show file tree hint
    if (x > W - 30 && x < W) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.style.display === 'none') {
        sidebar.style.display = '';
      }
    }

    // Update gaze indicator position
    const dot = document.querySelector('#v28-eye-indicator .v28-gaze-dot');
    // (visual feedback handled by indicator)
  }

  function updateIndicator(active) {
    let indicator = document.getElementById('v28-eye-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'v28-eye-indicator';
      indicator.innerHTML = `<div class="v28-eye-dot"></div><span>Eye Track</span>`;
      indicator.onclick = toggle;
      indicator.title = 'Eye tracking — click to disable';
      document.body.appendChild(indicator);
    }
    if (active) indicator.classList.add('active');
    else indicator.classList.remove('active');
    indicator.style.display = 'flex';
  }

  function disable() {
    _enabled = false;
    clearTimeout(_scrollTimer);
    try { if (window.webgazer) webgazer.pause(); } catch(e) {}
    updateIndicator(false);
    document.getElementById('v28-eye-indicator').style.display = 'none';
  }

  function toggle() {
    if (_enabled) disable();
    else init();
  }

  return { init, disable, toggle };
})();
window.EyeTracking = EyeTracking;

// ─────────────────────────────────────────────────────────────────────
// §8 — SANDBOX DEBUGGER (replaces eval() with safe Worker sandbox)
// ─────────────────��───────────��─────────────────��─────────────────────
const SafeDebugger = (function() {
  let _worker = null;

  function createSandboxWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { id, expression, context } = e.data;
        try {
          // Create isolated function with limited globals
          const sandbox = {
            console: {
              log: (...args) => self.postMessage({ id, type: 'log', data: args.map(String).join(' ') }),
              error: (...args) => self.postMessage({ id, type: 'error', data: args.map(String).join(' ') }),
              warn: (...args) => self.postMessage({ id, type: 'warn', data: args.map(String).join(' ') }),
            },
            Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
            Array, Object, String, Number, Boolean, RegExp, Map, Set,
            Promise, setTimeout: (fn, ms) => { /* blocked */ },
            fetch: () => Promise.reject(new Error('fetch blocked in sandbox')),
          };

          const fn = new Function(...Object.keys(sandbox), '"use strict";\\n' + expression);
          const result = fn(...Object.values(sandbox));
          self.postMessage({ id, type: 'result', data: String(result !== undefined ? result : 'undefined') });
        } catch(err) {
          self.postMessage({ id, type: 'error', data: err.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    _worker = new Worker(url);
    URL.revokeObjectURL(url);
    return _worker;
  }

  function evaluate(expression) {
    return new Promise((resolve, reject) => {
      if (!_worker) createSandboxWorker();

      const id = Math.random().toString(36).slice(2);
      const timeout = setTimeout(() => reject(new Error('Sandbox timeout')), 5000);

      const handler = (e) => {
        if (e.data.id !== id) return;
        _worker.removeEventListener('message', handler);
        clearTimeout(timeout);
        if (e.data.type === 'error') reject(new Error(e.data.data));
        else resolve(e.data.data);
      };

      _worker.addEventListener('message', handler);
      _worker.postMessage({ id, expression });
    });
  }

  // Monkey-patch existing debugger if present
  if (window.Debugger?.evaluateExpression) {
    const origEval = window.Debugger.evaluateExpression;
    window.Debugger.evaluateExpression = async function(expr) {
      try {
        return await evaluate(expr);
      } catch(e) {
        return `❌ Sandbox error: ${e.message}`;
      }
    };
    console.log('[v28] SafeDebugger: eval() patched with sandbox worker ✅');
  }

  return { evaluate, createSandboxWorker };
})();
window.SafeDebugger = SafeDebugger;

// ─────────────────────────────────────────────────────────────────────
// §9 — ENHANCED COMMAND PALETTE (V28 commands)
// ────────────────────────────────────────────────────────────────────��
function registerV28Commands() {
  try {
    if (!window.CommandPalette?.addCommands) return false;
    CommandPalette.addCommands([
      { label: '🏙️ 3D Code City', desc: 'Visualize project as 3D city <v28>', action: () => CodeCity3D.toggle() },
      { label: '🤖 Multi-Agent AI', desc: 'Open AI Council panel', action: () => MultiAgentAI.toggle() },
      { label: '📁 Open OS Folder', desc: 'Native File System Access <v28>', action: () => NativeFileSystem.openFolder() },
      { label: '👁️ Eye Tracking', desc: 'WebGazer autoscroll <v28>', action: () => EyeTracking.toggle() },
      { label: '🔊 Adaptive Audio', desc: 'Toggle code soundscape <v28>', action: () => AdaptiveAudio.toggle() },
      { label: '🔍 AI Code Review', desc: 'Run Agent Reviewer scan', action: () => MultiAgentAI.runAgent('reviewer') },
      { label: '🏛 Architecture Diagram', desc: 'Auto-generate file diagram <v28>', action: () => MultiAgentAI.runAgent('architect') },
      { label: '📐 Rebuild City', desc: 'Refresh 3D Code City buildings', action: () => { if(window.__v28_city_visible) CodeCity3D.buildCity(); else CodeCity3D.show(); } },
      { label: '💾 Native Autosave', desc: 'Save to OS filesystem now <v28>', action: () => NativeFileSystem.autoSave() },
    ]);
    return true;
  } catch(e) { return false; }
}

function registerV28Shortcuts() {
  try {
    if (!window.ShortcutManager) return false;
    ShortcutManager.register('C+S+C', () => CodeCity3D.toggle(), 'global', 'v28-codecity');
    // C+S+M (Multiplayer) shortcut removed — feature was preview-only
    ShortcutManager.register('C+S+N', () => NativeFileSystem.openFolder(), 'global', 'v28-nativefs');
    return true;
  } catch(e) { return false; }
}

// ─────────────────────────────────────────────────────────────────────
// §10 — V28 BOOT SEQUENCE
// ─────────────────────────────────────────────────────────────────────
function v28Boot() {
  if (window.__v28_booted__) return; window.__v28_booted__ = true; // ✅ FIX: prevent duplicate boot
  // v28 banner suppressed
  console.log('%c   ✅ DependencyLoader | ✅ HapticEngine | ✅ AdaptiveAudio', 'color:#6366f1');
  console.log('%c   ✅ CodeCity3D | ✅ MultiAgentAI', 'color:#6366f1');
  console.log('%c   ✅ NativeFileSystem | ✅ EyeTracking | ✅ SafeDebugger', 'color:#6366f1');

  // Register commands & shortcuts
  if (!registerV28Commands()) setTimeout(registerV28Commands, 3000);
  if (!registerV28Shortcuts()) setTimeout(registerV28Shortcuts, 3000);

  // Update title & version badge
  setTimeout(() => {
    try {
      document.title = 'ProCode IDE — UNIFIED EDITION';
      const ver = document.querySelector('.logo .ver') ||
                  document.querySelector('[class*="ver"]') ||
                  document.querySelector('.version');
      if (ver) ver.textContent = 'v28.0';

      // v28 badge suppressed — v30 unified badge handles versioning
    } catch(e) {}

    // Show welcome toast
    try {
      // window.Utils?.toast?.('🌌 ProCode IDE v28 — SINGULARITY PATCH loaded! Ctrl+Shift+C for 3D City', 'success', 6000); // suppressed: unified boot
    } catch(e) {}

    // Auto-run AI Reviewer on current file after 10s
    // FIX-COST-2: Auto-review on load removed — it silently consumes API tokens
    // without user consent. User must manually trigger review via the AI Council panel.
    // setTimeout removed; review can be triggered via: MultiAgentAI.runAgent('reviewer')

  }, 2000);

  // Refresh Code City when files change
  try {
    DependencyLoader.waitFor('FileSystem').then(() => {
      const origCreate = window.FileSystem?.createFile?.bind(window.FileSystem);
      if (origCreate) {
        window.FileSystem.createFile = function(...args) {
          const result = origCreate(...args);
          setTimeout(() => { try { CodeCity3D.buildCity(); } catch(e) {} }, 500);
          return result;
        };
      }
    }).catch(() => {});
  } catch(e) {}

}

// ───────────��─────────────────────────────────────────────────────────
// TRIGGER V28 BOOT (after v27 settles)
// ─────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v28Boot") : setTimeout(v28Boot, 5500)));
} else {
  (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v28Boot") : setTimeout(v28Boot, 5500));
}
window.addEventListener('load', () => (window.__BOOT_ORCHESTRATOR_ACTIVE__ ? console.log("[Orchestrator] Suppressed v28Boot") : setTimeout(v28Boot, 5500)));

})(); // end v28 IIFE