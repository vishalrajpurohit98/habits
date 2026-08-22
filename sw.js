const CACHE = 'habits-v2-20260822-cachefix';
const FILES = ['.', 'index.html', 'unbounded.ttf', 'fraunces.ttf', 'spacegrotesk.ttf', 'bricolage.ttf', 'xlsx.min.js', 'firebase-app-compat.js', 'firebase-auth-compat.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always prefer the network for navigations and index.html. This prevents
  // an old cached app shell from freezing the application after deployment.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('/index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: cache first, then refresh from the network when possible.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Allows the page to explicitly request immediate activation of a waiting worker.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
