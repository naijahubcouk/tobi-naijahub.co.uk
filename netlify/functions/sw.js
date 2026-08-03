'use strict';

// Import OneSignal SDK — must be first line for push to work
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'auntie-tobi-v12';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache OneSignal requests
  if (url.hostname.includes('onesignal')) return;

  // For navigation requests — always network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => fetch('/'))
    );
    return;
  }

  // Everything else — network first, no caching
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
});
