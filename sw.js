const CACHE = 'camborio-public-v4-screens-20';
const PRECACHE = [
  './',
  './index.html',
  './styles.css?v=20260901',
  './app-v4.js?v=20260911',
  './theme.js?v=20260911',
  './config.js?v=20260911',
  './public-api-v4.js?v=20260911',
  './reservation-pdf.js?v=20260915-02',
  './v4-fixes.js?v=20260915',
  './v4-readable-fixes.js?v=20260914',
  './manifest.webmanifest',
  './logocamborio_trans.png?v=20260907',
];
const VERSIONED_ASSET_PATHS = new Set([
  '/',
  '/index.html',
  '/styles.css',
  '/app-v4.js',
  '/theme.js',
  '/config.js',
  '/public-api-v4.js',
  '/reservation-pdf.js',
  '/v4-fixes.js',
  '/v4-readable-fixes.js',
  '/manifest.webmanifest',
  '/logocamborio_trans.png',
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => (key === CACHE ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const isAsset = VERSIONED_ASSET_PATHS.has(url.pathname);

  if (isAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});
