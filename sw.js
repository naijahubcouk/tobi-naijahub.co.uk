// Auntie Tobi Service Worker v202609211300
// OneSignal handles push — we handle caching + notification click

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'v202609211300';
const APP_URL = 'https://auntietobi.co.uk/';

self.addEventListener('install', function(e) {
  // Cache the app shell immediately on install
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.add(APP_URL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
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

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  var targetUrl = (e.notification.data && e.notification.data.url) ? e.notification.data.url : APP_URL;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('auntietobi.co.uk') > -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
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

  // Network first with cache fallback
  e.respondWith(
    fetch(e.request).then(function(response) {
      // Update cache with fresh response for app shell
      if (url === APP_URL || url.endsWith('/index.html')) {
        var clone = response.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match(APP_URL);
      });
    })
  );
});
