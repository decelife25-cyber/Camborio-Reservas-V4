const CACHE = 'camborio-public-v4-reset-1';
const PREFIX = 'camborio-public-v4-';
const PRECACHE = ['./', './index.html', './styles.css', './app.js', './public-api.js', './theme.js', './manifest.webmanifest', './config.js', './logocamborio_trans.png'];

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
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'PURGE_CAMBORIO_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
      ))
    );
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok && (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') || /\/(styles\.css|app\.js|public-api\.js|theme\.js|config\.js|manifest\.webmanifest|logocamborio_trans\.png)$/.test(url.pathname))) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
