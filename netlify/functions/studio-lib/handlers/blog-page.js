'use strict';
/*
 * 🔗 Shared HQ post links — /blog/at-<slug>  (rewritten here by _redirects)
 * Serves the app (index.html) as normal, but with that post's own WhatsApp / Instagram preview:
 * its title, summary and — for events and articles with one — its flyer / picture (instead of Auntie Tobi's face).
 */
const apppub = require('../apppub');
const escA = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let page = { at: 0, html: '' };

async function appHtml(origin) {
  if (page.html && Date.now() - page.at < 300000) return page.html;
  const r = await fetch(origin + '/index.html', { headers: { 'x-blog-page': '1' } });
  if (!r.ok) throw new Error('app page ' + r.status);
  page = { at: Date.now(), html: await r.text() };
  return page.html;
}

exports.handler = async (event) => {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h.host || 'www.auntietobi.co.uk';
  const origin = (h['x-forwarded-proto'] === 'http' ? 'http://' : 'https://') + host;
  const q = event.queryStringParameters || {};
  const slug = String(q.slug || (event.path || '').split('/').pop() || '').replace(/[^a-z0-9-]/gi, '').slice(0, 90);
  try {
    const [html, feed] = await Promise.all([appHtml(origin), apppub.publicFeed().catch(() => null)]);
    const all = feed ? [].concat(feed.events, feed.articles, feed.updates) : [];
    const p = all.find(x => x.slug === slug);
    let out = html;
    if (p) {
      const title = String(p.title || '').trim();
      let desc = String(p.summary || '').trim();
      if (p.kind === 'event') {
        const d = new Date(p.eventDate + 'T12:00:00');
        const when = isNaN(d) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
        desc = ['📅 ' + when + (p.eventTime ? ' · ' + p.eventTime : ''), p.location ? '📍 ' + p.location : '', desc].filter(Boolean).join(' · ');
      }
      if (desc.length > 200) desc = desc.slice(0, 197).replace(/\s+\S*$/, '') + '…';
      const img = p.imgId ? `https://${host.replace(/^auntietobi\.co\.uk$/, 'www.auntietobi.co.uk')}/.netlify/functions/app-content?img=${encodeURIComponent(p.imgId)}` : '';
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${escA(title)} — Auntie Tobi</title>`)
        .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escA(title)}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escA(desc)}">`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escA(desc)}">`)
        .replace(/<meta property="og:image:width"[^>]*>\n?/g, '').replace(/<meta property="og:image:height"[^>]*>\n?/g, '');
      if (img) out = out.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escA(img)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${escA(img)}">`);
    }
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }, body: out };
  } catch (e) {
    console.error('[blog-page]', e.message);
    return { statusCode: 302, headers: { Location: '/?blog=' + encodeURIComponent(slug), 'Cache-Control': 'no-store' }, body: '' };
  }
};
