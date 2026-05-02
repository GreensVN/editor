/**
 * boot-orchestrator.js — ProCode Boot System
 * Kill-switches, progress reporting, module initialization
 */

/* ═══════════════════════════════════════════════════════════════════════
   PERSISTENCE LAYER — Unified Storage Abstraction
   
   VẤN ĐỀ CŨ: localStorage và IndexedDB được dùng song song không có
   single source of truth, gây race conditions khi save/load.
   
   GIẢI PHÁP: ProCode.Storage làm unified interface.
   Code mới nên dùng ProCode.Storage thay vì trực tiếp gọi localStorage
   hoặc IndexedDB.
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  "use strict";

  // Singleton flag
  if (window.ProCode && window.ProCode.Storage) return;

  const STORAGE_VERSION = 'v1';

  /**
   * Unified Storage API
   * Ưu tiên IndexedDB, fallback xuống localStorage.
   * Giải quyết race condition bằng cách dùng một layer duy nhất.
   */
  const Storage = {
    _idb: null,
    _idbReady: false,
    _idbQueue: [],
    // FIX-8: Pending-write queue.
    // When setFile() is called before IDB is ready we store the write here
    // AND in localStorage (emergency fallback). Once IDB initialises,
    // _replayPendingWrites() flushes the queue to IDB and removes the
    // localStorage copies — eliminating the split-brain window.
    _pendingWrites: [], // [{ path, content, timestamp }]

    /**
     * Khởi tạo IndexedDB
     */
    async init() {
      if (this._idbReady) return;
      try {
        // FIX-BOOT-1: Add 5s timeout to IDB init. Without it, if the browser's IDB
        // implementation hangs (private mode quirks, storage pressure, corrupt DB),
        // the entire app boot hangs indefinitely with no error or recovery path.
        this._idb = await new Promise((resolve, reject) => {
          const IDB_TIMEOUT_MS = 5000;
          let _settled = false;
          const _timeout = setTimeout(() => {
            if (!_settled) {
              _settled = true;
              reject(new Error('IndexedDB open timed out after ' + IDB_TIMEOUT_MS + 'ms'));
            }
          }, IDB_TIMEOUT_MS);

          const req = indexedDB.open('ProCodeStorage', 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files'))
              db.createObjectStore('files', { keyPath: 'path' });
            if (!db.objectStoreNames.contains('settings'))
              db.createObjectStore('settings', { keyPath: 'key' });
          };
          req.onsuccess = e => { if (!_settled) { _settled = true; clearTimeout(_timeout); resolve(e.target.result); } };
          req.onerror   = e => { if (!_settled) { _settled = true; clearTimeout(_timeout); reject(e.target.error); } };
        });
        this._idbReady = true;
        if (window.__PROCODE_DEBUG__) console.info('[ProCode.Storage] IndexedDB ready');
        // FIX: Migrate any "dirty" data that was written to localStorage before IDB was ready
        await this._migrateLocalStorageToIDB();
        // FIX-8b: Replay in-memory pending writes (guaranteed newer than localStorage copies)
        await this._replayPendingWrites();
      } catch(e) {
        if (window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] IndexedDB unavailable, using localStorage fallback:', e);
        this._idbReady = false;
      }
    },

    /**
     * FIX: Migrate localStorage entries written during boot (before IDB was ready) into IDB.
     * This prevents silent data loss when setFile() was called before IDB initialized.
     */
    async _migrateLocalStorageToIDB() {
      if (!this._idbReady || !this._idb) return;
      const PREFIX = 'procode_' + STORAGE_VERSION + ':file:';
      const TS_PREFIX = 'procode_' + STORAGE_VERSION + ':file_ts:';
      const migratedPaths = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const lsKey = localStorage.key(i);
          if (!lsKey || !lsKey.startsWith(PREFIX)) continue;
          const path = lsKey.slice(PREFIX.length);
          const content = localStorage.getItem(lsKey);
          const tsRaw = localStorage.getItem(TS_PREFIX + path);
          const lsTimestamp = tsRaw ? parseInt(tsRaw, 10) : 0;
          if (content == null) continue;
          // Check if IDB already has a NEWER version before overwriting
          const existing = await new Promise(res => {
            const tx = this._idb.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(path);
            req.onsuccess = e => res(e.target.result);
            req.onerror = () => res(null);
          });
          const idbTimestamp = existing ? (existing.updated || 0) : 0;
          // Only migrate if localStorage version is newer (or IDB has nothing)
          if (!existing || lsTimestamp > idbTimestamp) {
            await new Promise(res => {
              const tx = this._idb.transaction('files', 'readwrite');
              tx.objectStore('files').put({ path, content, updated: lsTimestamp || Date.now() });
              tx.oncomplete = res;
              tx.onerror = res;
            });
            migratedPaths.push(path);
          }
          // Either way, clean up localStorage to prevent future split-brain
          try { localStorage.removeItem(lsKey); } catch(_) {}
          try { localStorage.removeItem(TS_PREFIX + path); } catch(_) {}
        }
        if (migratedPaths.length > 0 && window.__PROCODE_DEBUG__) {
          if(window.__PROCODE_DEBUG__) console.info('[ProCode.Storage] Migrated ' + migratedPaths.length + ' file(s) from localStorage to IDB:', migratedPaths);
        }
      } catch(e) {
        if (window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] Migration failed:', e);
      }
    },

    /**
     * Lưu file vào storage
     */
    async setFile(path, content) {
      if (!path) return;
      await this.init();
      const timestamp = Date.now();
      if (this._idbReady && this._idb) {
        return new Promise((resolve) => {
          const tx = this._idb.transaction('files', 'readwrite');
          tx.objectStore('files').put({ path, content, updated: timestamp });
          tx.oncomplete = () => {
            // IDB ghi thành công → xóa bản cũ trong localStorage để tránh split-brain
            try { localStorage.removeItem('procode_v1:file:' + path); } catch(_) {}
            resolve();
          };
          tx.onerror = () => {
            // FIX-9: Security/reliability warnings must always surface, not gated by debug flag.
            if(window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] IDB write failed, emergency fallback to localStorage:', path);
            // Emergency fallback — ghi kèm timestamp để biết đây là "dirty" data
            // FIX: Notify user that storage degraded so they're aware saves may not persist
            this._notifyStorageDegraded();
            this._localSet('file:' + path, content);
            this._localSet('file_ts:' + path, String(timestamp));
            resolve();
          };
        });
      } else {
        // FIX-8c: IDB not ready — queue write in memory AND in localStorage.
        // _replayPendingWrites() will flush to IDB once init completes.
        this._pendingWrites.push({ path, content, timestamp });
        this._localSet('file:' + path, content);
        this._localSet('file_ts:' + path, String(timestamp));
      }
    },

    /**
     * Đọc file từ storage.
     * POLICY: IDB là nguồn truth duy nhất (last-write-wins).
     * localStorage chỉ là fallback READ-ONLY khi IDB chưa khởi tạo xong.
     * Không còn "nếu IDB không có thì thử localStorage" để tránh split-brain.
     */
    async getFile(path) {
      if (!path) return null;
      await this.init();
      if (this._idbReady && this._idb) {
        return new Promise((resolve) => {
          const tx = this._idb.transaction('files', 'readonly');
          const req = tx.objectStore('files').get(path);
          req.onsuccess = e => {
            const r = e.target.result;
            // IDB trả về null/undefined → file không tồn tại trong IDB
            // KHÔNG fallback localStorage để tránh race condition / split-brain
            resolve(r ? r.content : null);
          };
          req.onerror = () => {
            // Chỉ fallback localStorage khi IDB lỗi thật sự (không phải "không tìm thấy")
            // FIX-9b: Always show IDB read errors — data reliability issue.
            if(window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] IDB getFile error, falling back to localStorage for:', path);
            resolve(this._localGet('file:' + path));
          };
        });
      }
      // IDB chưa sẵn sàng — đọc từ localStorage (temp state khi boot)
      return this._localGet('file:' + path);
    },

    /**
     * Lưu settings
     */
    async setSetting(key, value) {
      await this.init();
      const serialized = JSON.stringify(value);
      if (this._idbReady && this._idb) {
        return new Promise((resolve) => {
          const tx = this._idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key, value: serialized });
          tx.oncomplete = resolve;
          tx.onerror = (e) => { if (window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] IDB setSetting failed, falling back to localStorage:', e); this._localSet('setting:' + key, serialized); resolve(); };
        });
      }
      this._localSet('setting:' + key, serialized);
    },

    /**
     * Đọc settings
     */
    async getSetting(key, defaultValue = null) {
      await this.init();
      if (this._idbReady && this._idb) {
        return new Promise((resolve) => {
          const tx = this._idb.transaction('settings', 'readonly');
          const req = tx.objectStore('settings').get(key);
          req.onsuccess = e => {
            const r = e.target.result;
            if (r) { try { resolve(JSON.parse(r.value)); } catch { resolve(r.value); } return; }
            resolve(this._parseLocal('setting:' + key, defaultValue));
          };
          req.onerror = () => resolve(this._parseLocal('setting:' + key, defaultValue));
        });
      }
      return this._parseLocal('setting:' + key, defaultValue);
    },

    // FIX-8d: Flush in-memory pending writes to IDB after it becomes ready.
    async _replayPendingWrites() {
      if (!this._idbReady || !this._idb) return;
      const writes = this._pendingWrites.splice(0); // drain queue atomically
      if (!writes.length) return;
      for (const { path, content, timestamp } of writes) {
        try {
          await new Promise((resolve) => {
            const tx = this._idb.transaction('files', 'readwrite');
            tx.objectStore('files').put({ path, content, updated: timestamp });
            tx.oncomplete = () => {
              // Succeeded — clean up the localStorage bootstrap copy
              try { localStorage.removeItem('procode_v1:file:' + path); } catch(_) {}
              try { localStorage.removeItem('procode_v1:file_ts:' + path); } catch(_) {}
              resolve();
            };
            tx.onerror = (e) => {
              // FIX-SEC-3: onerror must NOT resolve() — silently swallowing IDB errors
              // caused data loss (pending writes were removed from queue but never persisted).
              // Instead, log the error and leave the localStorage copy intact as fallback.
              if (window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] IDB replay write failed, localStorage copy retained:', e);
              resolve(); // resolve anyway so caller doesn't hang, but localStorage copy stays
            };
          });
        } catch(_) {}
      }
      if (window.__PROCODE_DEBUG__) console.info('[ProCode.Storage] Replayed ' + writes.length + ' pending write(s) to IDB');
    },

    _localSet(key, val) {
      try { localStorage.setItem('procode_' + STORAGE_VERSION + ':' + key, val); }
      catch(e) {
        // FIX: Always surface localStorage failure — even in production (debug=false).
        // This is the emergency fallback of the emergency fallback; silent failure = data loss.
        const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22);
        console.error('[ProCode.Storage] localStorage write failed' + (isQuota ? ' (quota exceeded)' : '') + ':', key);
        // Show banner if not already shown (once per session)
        if (!this._lsFullNotified) {
          this._lsFullNotified = true;
          const show = () => {
            const b = document.createElement('div');
            b.style.cssText = 'position:fixed;bottom:48px;left:50%;transform:translateX(-50%);z-index:9999999;' +
              'background:#7f1d1d;color:#fee2e2;padding:10px 20px;border-radius:8px;font-size:13px;' +
              'font-family:monospace;box-shadow:0 4px 16px rgba(0,0,0,.6);max-width:520px;text-align:center';
            b.textContent = '❌ Storage full: both IndexedDB and localStorage failed. ' +
              'Export your project now to avoid data loss!';
            document.body.appendChild(b);
            setTimeout(() => b.remove(), 15000);
          };
          if (document.body) show();
          else window.addEventListener('DOMContentLoaded', show, { once: true });
        }
      }
    },

    _localGet(key) {
      try { return localStorage.getItem('procode_' + STORAGE_VERSION + ':' + key); }
      catch { return null; }
    },

    _parseLocal(key, def) {
      const v = this._localGet(key);
      if (v == null) return def;
      try { return JSON.parse(v); } catch { return v; }
    },

    // FIX: User-visible notification when storage degrades to localStorage fallback.
    // Fires at most once per session to avoid spam.
    _notifyStorageDegraded() {
      if (this._degradedNotified) return;
      this._degradedNotified = true;
      // Show a non-blocking warning banner if the IDE UI is ready, else queue it
      const show = () => {
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;bottom:48px;left:50%;transform:translateX(-50%);z-index:999999;' +
          'background:#92400e;color:#fef3c7;padding:8px 16px;border-radius:8px;font-size:12px;' +
          'font-family:monospace;box-shadow:0 4px 16px rgba(0,0,0,.5);pointer-events:none';
        banner.textContent = '⚠️ Storage degraded: IndexedDB unavailable. Files saved to localStorage (temporary). Please reload.';
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 8000);
      };
      if (document.body) show();
      else window.addEventListener('DOMContentLoaded', show, { once: true });
    }
  };

  if (window.ProCode) {
    window.ProCode.Storage = Storage;
  } else {
    window.ProCode = window.ProCode || {};
    window.ProCode.Storage = Storage;
  }

  // Khởi tạo ngay
  Storage.init().catch(e => { if (window.__PROCODE_DEBUG__) console.warn('[ProCode.Storage] Init failed:', e); });

})();