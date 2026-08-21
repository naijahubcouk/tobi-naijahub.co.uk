// Auntie Tobi Service Worker v202608210050
// Clears old caches on update, delegates push to OneSignal

const CACHE_VERSION = 'v202608210050';

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

// Delegate push handling to OneSignal
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
