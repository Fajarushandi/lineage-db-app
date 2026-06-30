// Naikkan nomor ini SETIAP kali kamu deploy update baru (termasuk kalau
// nambah/edit item di items-full.json atau EMBEDDED_ITEMS).
const VERSION = 'v1';
const CACHE = `lc-itemdb-${VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/items-full.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(err => console.error('SW install cache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate';
  const isHtmlOrJsonOrJs = /\.(html|js|json)$/.test(req.url) || req.url.endsWith('/');

  // Network-first untuk HTML/JS/JSON -> selalu coba versi terbaru dulu,
  // fallback ke cache kalau offline. Penting khususnya untuk
  // items-full.json supaya update item data baru langsung kepakai saat online.
  if (isNavigation || isHtmlOrJsonOrJs) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first untuk asset statis (icon, manifest)
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(c => c.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
