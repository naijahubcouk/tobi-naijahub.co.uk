// Auntie Tobi Service Worker v202608280001
// Clears old caches on update, delegates push to OneSignal

const CACHE_VERSION = 'v202608280001';

self.addEventListener('install', function(e) {
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // take control of all tabs
    })
  );
});

// Network-first fetch — always get fresh content, no caching
self.addEventListener('fetch', function(e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  // Skip netlify functions — always network
  if (e.request.url.includes('/.netlify/')) return;

  e.respondWith(
    fetch(e.request).catch(function() {
      // Offline fallback — return cached index if available
      return caches.match('/index.html');
    })
  );
});

// Delegate push handling to OneSignal
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
