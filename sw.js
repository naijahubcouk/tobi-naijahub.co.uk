'use strict';

const CACHE_NAME = 'auntie-tobi-v9';

// Never cache index.html — always fetch fresh
const NEVER_CACHE = [
  '/',
  '/index.html',
  '/content-tools.html',
];

// Cache these static assets
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting(); // Activate new SW immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self) self.clearAppBadge().catch(() => {});
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache HTML pages — always network first
  if (
    NEVER_CACHE.includes(url.pathname) ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/kb/') ||
    url.pathname.startsWith('/.netlify/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Everything else — network first, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || 'Auntie Tobi';
  const options = {
    body: data.body || data.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || data.launchUrl || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('auntietobi.co.uk') && 'focus' in client) {
          client.postMessage({ type: 'NOTIF_CLICK', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
