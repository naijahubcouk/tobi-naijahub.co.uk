// Auntie Tobi Service Worker v7
const CACHE_NAME = 'naijahub-tobi-v7';

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

// Save notification data when received so banner shows if user opens app directly
self.addEventListener('push', e => {
  try {
    const data = e.data ? e.data.json() : {};
    const title = (data.headings && data.headings.en) || 'Auntie Tobi 🤖✨';
    const body = (data.contents && data.contents.en) || 'You have a new update!';
    const url = data.url || data.launch_url || 'https://auntietobi.co.uk';

    // Send to all open clients to save in localStorage
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SAVE_PENDING_NOTIF',
          title,
          body,
          url
        });
      });
    });
  } catch(e) {}
});

// Handle messages
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Clear badge when app is opened
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CLEAR_BADGE') {
    self.registration.clearAppBadge && self.registration.clearAppBadge().catch(() => {});
  }
});

// Clear badge when notification is clicked
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }
});
