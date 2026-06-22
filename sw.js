// sw.js — Service Worker. Caches all static assets for full offline support.
// Strategy: cache-first for all app assets.

const CACHE_NAME = 'imran-fitness-v1.0.0';
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './js/main.js',
  './js/storage.js',
  './js/auth.js',
  './js/ui.js',
  './js/charts.js',
  './js/quotes.js',
  './js/badges.js',
  './js/dashboard.js',
  './js/diet.js',
  './js/workout.js',
  './js/water.js',
  './js/measurements.js',
  './js/photos.js',
  './js/reports.js',
  './js/badges-screen.js',
  './js/settings.js',
];

// ── Install: pre-cache all assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, fallback to network ──
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // For navigation requests offline, serve the app shell
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

// ── Allow page to trigger skipWaiting on update ──
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
});
