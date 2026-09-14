const CACHE = 'camborio-public-v4-screens-20';
const PRECACHE = [
  { key: '/', url: './' },
  { key: '/index.html', url: './index.html' },
  { key: '/styles.css', url: './styles.css?v=20260901' },
  { key: '/app-v4.js', url: './app-v4.js?v=20260911' },
  { key: '/theme.js', url: './theme.js?v=20260911' },
  { key: '/config.js', url: './config.js?v=20260911' },
  { key: '/public-api-v4.js', url: './public-api-v4.js?v=20260911' },
  { key: '/reservation-pdf.js', url: './reservation-pdf.js?v=20260915-02' },
  { key: '/v4-fixes.js', url: './v4-fixes.js?v=20260915' },
  { key: '/v4-readable-fixes.js', url: './v4-readable-fixes.js?v=20260914' },
  { key: '/manifest.webmanifest', url: './manifest.webmanifest' },
  { key: '/logocamborio_trans.png', url: './logocamborio_trans.png?v=20260907' },
];
const VERSIONED_ASSET_PATHS = new Set(PRECACHE.map(asset => asset.key));

function cacheKey(url) {
  return new Request(new URL(url.pathname || url, self.location.origin).toString());
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.all(PRECACHE.map(async asset => {
        const response = await fetch(asset.url, { cache: 'no-store' });
        if (response.ok) await cache.put(cacheKey(asset.key), response);
      }));
    }).then(() => self.skipWaiting())
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
  const normalizedRequest = cacheKey(url);

  if (isAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(normalizedRequest, copy)));
          }
          return response;
        })
        .catch(() => caches.match(normalizedRequest))
    );
    return;
  }

  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});
