// Auntie Tobi Service Worker v202609122100
// OneSignal handles push — we handle caching

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'v202609122100';

// Install — skip waiting immediately so new SW takes over right away
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate — delete ALL old caches and claim all clients immediately
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Force all open windows to reload
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.navigate(client.url);
        });
      });
    })
  );
});

// Network-first — never serve cached index.html, always go to network
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/.netlify/')) return;

  // Always fetch fresh — no cache fallback for HTML
  e.respondWith(fetch(e.request));
});
