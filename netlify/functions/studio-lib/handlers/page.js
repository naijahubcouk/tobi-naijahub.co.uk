'use strict';
/*
 * Public price list / menu page: GET /p/<slug>  (→ /.netlify/functions/studio-page?s=<slug>)
 * Photos: GET /.netlify/functions/studio-page?s=<slug>&img=<itemId>
 * Server-rendered, no scripts. Everything the member typed is escaped.
 */
const core = require('../core');
const shop = require('../shop');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const HEX = v => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : null);
function lum(hex) { const c = hex.slice(1); const f = i => parseInt(c.substr(i, 2), 16) / 255; return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4); }
const CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function html(status, body, cache) {
  return { statusCode: status, headers: { ...(cache ? { 'Netlify-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300, durable' } : {}), 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': cache || 'no-store' }, body };
}

function notFound() {
  return html(404, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not available</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FBF6EC;color:#0F1E36;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}a{color:#057A44;font-weight:700}</style></head>
<body><div><h1>This page isn’t available</h1><p>It may have moved or been taken down.</p><p><a href="/biz">Browse Nigerian businesses on Auntie Tobi</a></p></div></body></html>`);
}

exports.handler = core.handler(async (ctx) => {
  const q = ctx.event.queryStringParameters || {};
  const slug = String(q.s || '').slice(0, 60);
  if (q.img) {
    const img = await shop.publicImage(slug, String(q.img).slice(0, 20));
    if (!img) return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Not found' };
    const m = img.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400', 'Netlify-CDN-Cache-Control': 'public, max-age=86400, durable', 'X-Content-Type-Options': 'nosniff' }, body: m[2], isBase64Encoded: true };
  }
  await core.rateLimit('page-ip', ctx.ip || 'x', 600, 60 * 60 * 1000);
  const page = await shop.publicPage(slug);
  if (!page) return notFound();
  const { shop: s, profile: p, logo } = page;
  const b = p.brand || {};
  const c1 = HEX(b.color1) || '#057A44', c2 = HEX(b.color2) || '#FFB81C';
  const fg = lum(c1) > 0.6 ? '#0F1E36' : '#FFFFFF', fg2 = lum(c2) > 0.6 ? '#0F1E36' : '#FFFFFF';
  const font = b.font === 'elegant' ? "'Fraunces',Georgia,serif" : "'DM Sans',system-ui,sans-serif";
  const name = s.title || p.businessName || '';
  const wa = (text) => `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}`;
  const orderText = it => `Hi ${name}, I’d like to order: ${it.name}${it.price ? ` (${it.price})` : ''}. I found you on your Auntie Tobi page.`;
  const listing = p.listingSlug ? `https://www.auntietobi.co.uk/biz/${encodeURIComponent(p.listingSlug)}` : '';
  const desc = (s.intro || `${name}${s.area ? ` · ${s.area}` : ''}`).slice(0, 160);
  const body = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}${s.area ? ` · ${esc(s.area)}` : ''} — prices &amp; ordering</title>
<meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(desc)}"><meta name="theme-color" content="${c1}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FBF6EC;color:#0F1E36;line-height:1.5}
.hero{background:${c1};color:${fg};padding:28px 16px 30px;text-align:center}
.hero img{width:84px;height:84px;object-fit:contain;border-radius:20px;background:#fff;padding:6px;margin-bottom:12px}
.hero h1{font-family:${font};font-size:28px;line-height:1.15}
.hero .area{opacity:.85;margin-top:4px;font-size:15px}
.hero p.intro{max-width:560px;margin:12px auto 0;font-size:15.5px;opacity:.95}
.cta{display:inline-flex;align-items:center;gap:8px;background:${c2};color:${fg2};font-weight:700;text-decoration:none;border-radius:999px;padding:12px 20px;margin-top:16px}
main{max-width:720px;margin:0 auto;padding:18px 16px 40px}
.note{background:#fff;border:1px solid #EADFC8;border-radius:14px;padding:12px 14px;font-size:14.5px;margin-bottom:14px}
.items{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:620px){.items{grid-template-columns:1fr 1fr}}
.item{background:#fff;border:1px solid #EADFC8;border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#F2EEE4}
.item .b{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.item h2{font-size:17px;line-height:1.3}
.item .price{font-weight:800;color:${lum(c1) > 0.75 ? '#0F1E36' : c1};font-size:16px}
.item p{font-size:14.5px;color:#4A5468}
.item a{margin-top:auto;align-self:flex-start;background:#0F1E36;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:9px 14px}
footer{text-align:center;font-size:13px;color:#5B6475;padding:10px 16px 30px}
footer a{color:#057A44;font-weight:700}
</style></head><body>
<header class="hero">${logo ? `<img src="${esc(logo)}" alt="${esc(name)} logo">` : ''}<h1>${esc(name)}</h1>${s.area ? `<div class="area">📍 ${esc(s.area)}</div>` : ''}${s.intro ? `<p class="intro">${esc(s.intro)}</p>` : ''}
<a class="cta" href="${esc(wa(`Hi ${name}, I found you on your Auntie Tobi page and I’d like to ask about an order.`))}" rel="noopener">💬 Order or ask on WhatsApp</a></header>
<main>${s.orderNote ? `<div class="note">ℹ️ ${esc(s.orderNote)}</div>` : ''}
<div class="items">${s.items.map(it => `<article class="item">${it.hasImg ? `<img src="/.netlify/functions/studio-page?s=${encodeURIComponent(s.slug)}&amp;img=${encodeURIComponent(it.id)}&amp;v=${it.imgV || 0}" alt="${esc(it.name)}" loading="lazy">` : ''}<div class="b"><h2>${esc(it.name)}</h2>${it.price ? `<div class="price">${esc(it.price)}</div>` : ''}${it.desc ? `<p>${esc(it.desc)}</p>` : ''}<a href="${esc(wa(orderText(it)))}" rel="noopener">Order on WhatsApp</a></div></article>`).join('')}</div></main>
<footer>${listing ? `<p><a href="${esc(listing)}">See ${esc(name)} on Auntie Tobi</a></p>` : ''}<p style="margin-top:6px">Page made with Auntie Tobi Business Studio · Prices set by the business.</p></footer>
</body></html>`;
  return html(200, body, 'public, max-age=60');
}, { allowGet: true });
