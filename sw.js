/**
 * sw.js — ProCode IDE service worker
 * Strategy:
 *   - precache the app shell on install
 *   - network-first for navigations & local app resources (so updates show up
 *     immediately when online), with cache fallback
 *   - cache-first for cross-origin CDN libs (Monaco, fonts, FontAwesome, etc.)
 *
 * To bump a release, just change CACHE_VERSION below.
 */
const CACHE_VERSION = 'procode-v3.0.1';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const CDN_CACHE     = `${CACHE_VERSION}-cdn`;

const SHELL_URLS = [
  './',
  './index.html',
  './css/styles.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => undefined)
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith(CACHE_VERSION))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isCDN = (url) => /^https?:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com)\b/.test(url);

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status >= 200 && fresh.status < 300 && request.method === 'GET') {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch (_) {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw _;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status >= 200 && fresh.status < 300 && request.method === 'GET') {
      const cache = await caches.open(CDN_CACHE);
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch (e) {
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // Don't intercept browser extensions, devtools, blob:, data:
  if (!/^https?:/i.test(url)) return;

  if (isCDN(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Same-origin: network-first with cache fallback
  if (new URL(url).origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  }
});
