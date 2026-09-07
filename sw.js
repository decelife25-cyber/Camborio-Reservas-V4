const CACHE_PREFIX = 'camborio-public-v4-screens-';
const CACHE = `${CACHE_PREFIX}11`;
const PRECACHE = [
  './',
  './index.html',
  './styles.css?v=20260901',
  './app.js?v=20260907',
  './public-api.js?v=20260907',
  './public-functional.js?v=20260907',
  './reservation-pdf.js?v=20260907',
  './theme.js?v=20260907',
  './manifest.webmanifest',
  './config.js?v=20260905',
  './logocamborio_trans.png?v=20260907',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const isAppAsset = /\/(|index\.html|styles\.css|app\.js|public-api\.js|public-functional\.js|reservation-pdf\.js|theme\.js|config\.js|manifest\.webmanifest|logocamborio_trans\.png)$/.test(url.pathname);
  if (isAppAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});