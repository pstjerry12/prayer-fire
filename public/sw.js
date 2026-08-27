// Service worker for Prayer Fire Movement.
//
// Does three jobs:
//   1. Offline support — caches the app shell + static assets so the app
//      loads and works without an internet connection.
//   2. Notifications — lets the browser show prayer-time alarms (and the
//      notification-click handler below focuses the app).
//   3. Installability (PWA) — via the manifest.

const CACHE_NAME = 'pfm-cache-v2';

const PRECACHE_URLS = ['/logo.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Runtime caching strategy:
//  - Page navigations: network-first (always fresh when online), falling back
//    to the cached page when offline.
//  - Same-origin static assets (JS/CSS/fonts/images): cache-first with a
//    background refresh (stale-while-revalidate) — instant + offline-safe.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ── Navigation (HTML pages) ──────────────────────────────────────
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Same-origin static assets ────────────────────────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // ── Cross-origin (e.g. Google) ───────────────────────────────────
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});

// When the user taps a prayer-time notification, focus the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
