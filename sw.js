// Auntie Tobi Service Worker v9
// Imports OneSignal worker so push notifications display correctly
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'auntietobi-v9';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('netlify/functions')) return;
  if (e.request.url.includes('onesignal.com')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then(cached =>
        cached || new Response('Offline — please check your connection', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        })
      ))
  );
});

// Single message handler
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'CLEAR_BADGE') {
    self.registration.clearAppBadge && self.registration.clearAppBadge().catch(() => {});
  }
});

// Notification click — open or focus app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }
  const url = (e.notification.data && e.notification.data.url) || 'https://auntietobi.co.uk';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('auntietobi.co.uk')) {
          client.focus();
          client.postMessage({ type: 'NOTIF_CLICK', url });
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
