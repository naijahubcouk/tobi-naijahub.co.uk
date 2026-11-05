// 🎒 School Tracker offline helper — network first; the app shell is kept so it opens without a connection.
const CACHE = 'school-tracker-v1';
const SHELL = ['/', '/school-manifest.json', '/school-icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('school-tracker-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).pathname.startsWith('/.netlify/')) return;   // never cache family data
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/'))); return; }
  e.respondWith(fetch(r).catch(() => caches.match(r)));
});
