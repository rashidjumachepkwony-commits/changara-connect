/* CHANGARA CONNECT - Service worker (offline shell, low-data friendly) */
const CACHE_NAME = 'changara-connect-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/businesses.html',
  '/marketplace.html',
  '/jobs.html',
  '/rentals.html',
  '/services.html',
  '/notices.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/profile.html',
  '/css/style.css',
  '/css/responsive.css',
  '/css/admin.css',
  '/js/api.js',
  '/js/app.js',
  '/js/home.js',
  '/manifest.json',
  '/assets/images/placeholder.svg',
  '/assets/images/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache API responses or uploads - they are dynamic.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads')) {
    event.respondWith(fetch(req));
    return;
  }
  // Cache-first for same-origin pages, CSS, JS and images.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});