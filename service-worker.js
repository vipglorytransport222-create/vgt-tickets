// VIP Glory Tickets — offline app-shell cache.
// Only caches the app's own files (this page, its icons, the manifest).
// Every real ticket/pickup/sync request goes to Google Apps Script and is
// NEVER intercepted here — it always needs to reach the network live, so
// selling tickets still requires an internet connection exactly as before.
// This only makes the app itself (the page you see) load instantly and
// work even with a weak or momentarily dropped connection.

const CACHE_NAME = 'vgt-tickets-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never touch the Google Apps Script backend (or any non-GET request) —
  // ticket sales, pickups, and sync must always hit the real network.
  if (req.method !== 'GET') return;
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      // Serve cache first for instant load; still refresh it in the background.
      return cached || network;
    })
  );
});
