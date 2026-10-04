/* CHANGARA CONNECT - Service worker (offline shell, low-data friendly) */
const CACHE_NAME = 'changara-connect-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/businesses.html',
  '/marketplace.html',
  '/jobs.html',
  '/rentals.html',
  '/services.html',
  '/notices.html',
  '/login.html',
  '/admin-login.html',
  '/register.html',
  '/dashboard.html',
  '/profile.html',
  '/privacy.html',
  '/terms.html',
  '/css/style.css',
  '/css/responsive.css',
  '/css/admin.css',
  '/js/api.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/businesses.js',
  '/js/dashboard.js',
  '/js/details.js',
  '/js/home.js',
  '/js/jobs.js',
  '/js/marketplace.js',
  '/js/notices.js',
  '/js/rentals.js',
  '/js/services.js',
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
  // Prefer fresh pages; use the cached shell only when the network is unavailable.
  if (url.origin === self.location.origin) {
    const fetchAndCache = () => fetch(req).then((response) => {
      if (response.ok) {
        const updateCache = caches.open(CACHE_NAME).then((cache) => cache.put(req, response.clone()));
        event.waitUntil(updateCache.catch((error) => console.warn('[service-worker] Cache update failed:', error)));
      }
      return response;
    });

    if (req.mode === 'navigate') {
      event.respondWith(
        fetchAndCache().catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          const path = url.pathname.replace(/\/+$/, '');
          const htmlPath = path && !path.endsWith('.html') ? path + '.html' : path || '/index.html';
          return await caches.match(htmlPath) || await caches.match('/index.html');
        })
      );
    } else {
      event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((cached) => {
          const update = fetchAndCache().catch(() => cached || new Response('You are offline.', { status: 503 }));
          if (cached) {
            event.waitUntil(update.then(() => undefined));
            return cached;
          }
          return update;
        })
      );
    }
  }
});