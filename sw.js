// Auntie Tobi Service Worker v202609211200
// OneSignal handles push — we handle caching

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'v202609211200';

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

// Network-first — let OneSignal handle its own requests untouched
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Never intercept OneSignal requests
  if (url.includes('onesignal.com')) return;
  if (url.includes('OneSignal')) return;

  if (e.request.method !== 'GET') return;
  if (!url.startsWith(self.location.origin)) return;
  if (url.includes('/.netlify/')) return;

  // Network first with cache fallback for app shell only
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match('/index.html');
    })
  );
});
