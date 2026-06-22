// sw.js — service worker for full offline support.
const CACHE = 'imran-fitness-v1';
const STATIC = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/main.js',
  '/js/storage.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/charts.js',
  '/js/quotes.js',
  '/js/badges.js',
  '/js/dashboard.js',
  '/js/diet.js',
  '/js/water.js',
  '/js/workout.js',
  '/js/measurements.js',
  '/js/photos.js',
  '/js/reports.js',
  '/js/badges_screen.js',
  '/js/settings.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/icon-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
