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

// Push event handler — fallback if OneSignalSDK doesn't intercept
self.addEventListener('push', function(event) {
  // OneSignalSDK.sw.js handles this — this is just a safety fallback
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.headings && data.headings.en ? data.headings.en : 'Auntie Tobi 🇳🇬';
    const body = data.contents && data.contents.en ? data.contents.en : '';
    const url = data.web_url || 'https://auntietobi.co.uk';
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        data: { url: url }
      })
    );
  } catch(e) {}
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : 'https://auntietobi.co.uk';
  event.waitUntil(clients.openWindow(url));
});
