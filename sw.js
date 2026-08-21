const CACHE = 'habits-v2-62-final-icon-amoled-final';
const FILES = ['.', 'index.html', 'unbounded.ttf', 'fraunces.ttf', 'spacegrotesk.ttf', 'bricolage.ttf', 'xlsx.min.js', 'firebase-app-compat.js', 'firebase-auth-compat.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  // only handle same-origin GET requests from the cache; let everything else
  // Firebase Cloud Firestore SDK is loaded from the Firebase CDN when cloud sync is enabled.
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(r => r || fetch(e.request)));
});

// AMOLED final theme cache revision: 20260820-0016
