const CACHE = 'sport-tracker-v11';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/db.js',
  '/js/app.js',
  '/js/pages/dashboard.js',
  '/js/pages/workouts.js',
  '/js/pages/diet.js',
  '/js/pages/weight.js',
  '/js/pages/profile.js',
  '/js/pages/keto.js',
  '/js/pages/entrainements.js',
  '/js/pages/perf.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('chrome-extension://')) return;
  const url = new URL(e.request.url);

  // Fichiers JS : network-first — toujours la dernière version, cache en fallback
  if (url.origin === self.location.origin && url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Tout le reste : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
