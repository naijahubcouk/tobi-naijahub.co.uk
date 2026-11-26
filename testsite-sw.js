/* 🌐 Test sites (lifeinuktest / ukdrivingtheorytest .auntietobi.co.uk) — works offline once visited.
   Pages and questions: network first, saved copy when offline. Pictures, styles and scripts: saved copy first. */
const C = 'testsite-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('testsite-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/.netlify/functions/app-content') && u.search.includes('vq=')) return;
  const net = () => fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; });
  if (r.mode === 'navigate' || /\.json$/.test(u.pathname) || u.pathname.startsWith('/.netlify/')) {
    e.respondWith(net().catch(() => caches.match(r).then(x => x || caches.match('/'))));
  } else if (/\.(css|js|png|svg|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(x => { const n = net().catch(() => x); return x || n; }));
  }
});
