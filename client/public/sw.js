const CACHE_NAME = 'colonias-vv-v20';
// El SW vive en /colonias/sw.js, así que su scope es /colonias/. Todo se resuelve contra el scope.
const SCOPE = self.registration.scope;
const STATIC_ASSETS = ['', 'index.html', 'manifest.json', 'favicon.ico', 'favicon-32.png', 'icon-192.png']
  .map((p) => SCOPE + p);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (reqUrl.pathname.includes('/api/') || reqUrl.hostname.includes('cloudinary.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(SCOPE + 'index.html')))
  );
});
