// Auntie Tobi Service Worker v202608280002
// OneSignal handles push — we handle caching

// Import OneSignal FIRST so it registers its push/notificationclick handlers
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'v202608280002';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Network-first fetch — always serve fresh
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/.netlify/')) return;

  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match('/index.html');
    })
  );
});
