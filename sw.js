'use strict';

// Import OneSignal SDK first — handles push, notificationclick, version checks
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Our cache version
const CACHE_NAME = 'auntie-tobi-v14';

// Skip waiting so new SW activates immediately
self.addEventListener('install', () => self.skipWaiting());

// Clean old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first, no caching (OneSignal handles its own requests)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip OneSignal requests — let them pass through
  if (url.hostname.includes('onesignal') || url.pathname.includes('OneSignal')) return;

  // Navigation — always fresh from network
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => fetch('/')));
    return;
  }

  // Everything else — network first
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
});
