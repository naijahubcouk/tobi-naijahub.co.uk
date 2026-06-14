const CACHE_NAME = 'naijahub-tobi-v3';

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
  if (e.request.url.includes('script.google.com')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
