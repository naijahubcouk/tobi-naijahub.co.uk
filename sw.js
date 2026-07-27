'use strict';

// v10 — no caching, always serve fresh index.html
const CACHE_NAME = 'auntie-tobi-v10';

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

  // For navigation requests (HTML pages) — always go to network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        fetch('/')
      )
    );
    return;
  }

  // For everything else — network first, no caching
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
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

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self) self.clearAppBadge().catch(() => {});
  }
});
