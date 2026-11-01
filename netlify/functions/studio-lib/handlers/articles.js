'use strict';
/*
 * Public website blog built from the articles published in Auntie Tobi HQ ("Publish to App").
 *   GET /articles               → blog home (all articles, newest first)
 *   GET /articles?c=<Category>  → one category
 *   GET /articles/<slug>        → one article page
 * (→ /.netlify/functions/articles?s=<slug> by a rewrite in _redirects)
 * Server-rendered website pages (desktop + phone), no scripts. Article text is already escaped by apppub.toHtml.
 */
const core = require('../core');
const apppub = require('../apppub');

const SITE = 'https://www.auntietobi.co.uk';
const DIRECTORY = 'https://directory.auntietobi.co.uk';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const CAT_EMOJI = { News: '📰', Money: '💷', Housing: '🏠', Lifestyle: '✨', Business: '💼', 'Did You Know': '💡', Travel: '✈️', Family: '👨‍👩‍👧', Health: '🩺', Education: '🎓', Food: '🍲', Jobs: '🧑🏾‍💼' };
const TINTS = ['#E8F5EE', '#FFF4D6', '#E6ECF5', '#FDE8E1'];

function tint(slug) { let h = 0; for (const ch of String(slug)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length]; }
function day(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }); }
function readMins(html) { const w = String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w / 200)); }
function imgUrl(a) { return a.imgId ? `/.netlify/functions/app-content?img=${encodeURIComponent(a.imgId)}` : ''; }
function emojiOf(a) { return a.emoji || CAT_EMOJI[a.category] || '📰'; }
function href(a) { return `/articles/${encodeURIComponent(a.slug)}`; }

function respond(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store',
      ...(status === 200 ? { 'Netlify-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } : {}),
    },
    body,
  };
}

const CSS = `
:root{--green:#057A44;--green-l:#E8F5EE;--gold:#FFB81C;--gold-l:#FFF4D6;--navy:#0F1E36;--ink:#0F1E36;--muted:#5B6474;--line:#E6E2D8;--bg:#F7F5EF}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.hdr{background:var(--navy);color:#fff;position:sticky;top:0;z-index:5}
.hdr .wrap{display:flex;align-items:center;gap:14px;height:66px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-size:18px}
.brand img{width:38px;height:38px;border-radius:50%;border:2px solid var(--gold)}
.nav{margin-left:auto;display:flex;gap:6px;align-items:center}
.nav a{text-decoration:none;font-weight:700;font-size:15px;padding:8px 12px;border-radius:10px;color:rgba(255,255,255,.85)}
.nav a.on{color:#fff;background:rgba(255,255,255,.1)}
.nav a.app{background:var(--gold);color:var(--navy)}
.hero{background:radial-gradient(900px 400px at 85% -20%,#24406E 0%,transparent 60%),var(--navy);color:#fff;padding:44px 0 50px}
.eyebrow{font-size:13px;letter-spacing:1.4px;text-transform:uppercase;font-weight:850;color:var(--gold)}
.hero h1{font-size:42px;line-height:1.15;margin:10px 0 10px;letter-spacing:-.5px}
.hero p{color:rgba(255,255,255,.78);max-width:620px;font-size:18px}
.cats{display:flex;gap:8px;overflow-x:auto;padding:22px 0 6px;scrollbar-width:none}
.cats a{flex:none;text-decoration:none;font-weight:700;font-size:14.5px;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--muted)}
.cats a.on{background:var(--green);border-color:var(--green);color:#fff}
.feat{display:grid;grid-template-columns:1.15fr 1fr;background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden;margin:18px 0 28px;text-decoration:none}
.thumb{display:grid;place-items:center;font-size:64px;aspect-ratio:16/9;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.feat .thumb{aspect-ratio:auto;min-height:300px;font-size:96px}
.feat .tx{padding:32px;display:flex;flex-direction:column;justify-content:center;gap:12px}
.feat h2{font-size:30px;line-height:1.2;letter-spacing:-.3px}
.chip{display:inline-block;font-size:12.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--green);background:var(--green-l);padding:4px 10px;border-radius:999px;align-self:flex-start}
.chip.gold{background:var(--gold-l);color:#7A5300}
.meta{color:var(--muted);font-size:14.5px}
.ex{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding:18px 0 40px}
.feat+.grid{padding-top:0}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(15,30,54,.08)}
.card .tx{padding:18px 20px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{font-size:19px;line-height:1.3}
.card .ex{font-size:15.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{margin-top:auto;padding-top:6px}
.empty{background:#fff;border:1px solid var(--line);border-radius:18px;padding:40px;text-align:center;margin:18px 0 40px;color:var(--muted)}
.cta{background:var(--navy);color:#fff;border-radius:22px;padding:30px;display:flex;gap:20px;align-items:center;justify-content:space-between;margin-bottom:48px}
.cta h3{font-size:22px}
.cta p{color:rgba(255,255,255,.75)}
.btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:800;font-size:16px;border-radius:14px;padding:14px 22px;background:var(--gold);color:var(--navy);flex:none}
.foot{border-top:1px solid var(--line);padding:26px 0 40px;color:var(--muted);font-size:14.5px}
.foot .wrap{display:flex;gap:18px;flex-wrap:wrap;justify-content:space-between}
.foot nav a{text-decoration:none;margin-left:12px}
.art{max-width:740px;margin:0 auto;padding:34px 20px 20px}
.crumb{font-size:14.5px;color:var(--muted);margin-bottom:16px}
.crumb a{color:var(--green);font-weight:700;text-decoration:none}
.art h1{font-size:40px;line-height:1.18;letter-spacing:-.5px;margin:12px 0 14px}
.art .lead{font-size:20px;color:var(--muted);line-height:1.55;margin-bottom:16px}
.byline{display:flex;align-items:center;gap:10px;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:26px}
.byline img{width:40px;height:40px;border-radius:50%;border:2px solid var(--gold)}
.byline b{display:block;font-size:15.5px}
.byline .share{margin-left:auto;display:flex;gap:8px}
.byline .share a{text-decoration:none;font-weight:700;font-size:14px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:#fff}
.hero-img{border-radius:20px;overflow:hidden;margin-bottom:28px}
.hero-img .thumb{font-size:110px}
.hero-img .thumb.photo{aspect-ratio:auto;max-height:520px;background:#EEF0F3}
.hero-img .thumb.photo img{object-fit:contain;max-height:520px}
.body p{margin-bottom:18px;font-size:18.5px;line-height:1.75}
.body h3{font-size:24px;margin:30px 0 10px;line-height:1.3}
.body ul{margin:0 0 20px 0;padding-left:22px}
.body li{margin-bottom:8px;font-size:18.5px;line-height:1.65}
.body strong{color:var(--navy)}
.body a{color:var(--green);font-weight:700;word-break:break-word}
.more-link{margin:6px 0 26px}
.more-link a{display:inline-flex;text-decoration:none;font-weight:800;border-radius:12px;padding:12px 18px;background:var(--green);color:#fff}
.more{max-width:1160px;margin:20px auto 0;padding:0 20px}
.more h2{font-size:24px;margin:10px 0 0}
@media (max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.feat{grid-template-columns:1fr}.feat .thumb{min-height:200px}}
@media (max-width:620px){
  .wrap{padding:0 16px}.nav a:not(.app){display:none}
  .hero{padding:30px 0 34px}.hero h1{font-size:31px}.hero p{font-size:16.5px}
  .grid{grid-template-columns:1fr;gap:16px}.feat .tx{padding:22px}.feat h2{font-size:23px}
  .cta{flex-direction:column;align-items:flex-start;padding:24px}
  .art{padding:24px 16px 10px}.art h1{font-size:29px}.art .lead{font-size:18px}
  .body p,.body li{font-size:17.5px}.byline .share a span{display:none}
}`;

function page({ title, desc, canonical, image, jsonld, main }) {
  const og = image ? `${SITE}${image}` : `${SITE}/icon-512.png`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${jsonld ? 'article' : 'website'}"><meta property="og:site_name" content="Auntie Tobi"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="theme-color" content="#0F1E36"><link rel="icon" href="/favicon-32x32.png">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
<style>${CSS}</style></head><body>
<header class="hdr"><div class="wrap"><a class="brand" href="/articles"><img src="/icon-192.png" alt="">Auntie Tobi</a>
<nav class="nav"><a href="${DIRECTORY}">Directory</a><a class="on" href="/articles">Articles</a><a href="/?action=events">Events</a><a class="app" href="/">Get the app</a></nav></div></header>
${main}
<footer class="foot"><div class="wrap"><span>© ${new Date().getFullYear()} Auntie Tobi · Helping Nigerians in the UK live, work and thrive</span><nav><a href="${DIRECTORY}">Directory</a><a href="/articles">Articles</a><a href="/business-club">Business Club</a><a href="/">Auntie Tobi app</a></nav></div></footer>
</body></html>`;
}

const CTA = `<div class="cta"><div><h3>Get every article in the Auntie Tobi app 💚</h3><p>News, events, businesses and answers to your UK questions — all in one place.</p></div><a class="btn" href="/">Open the app →</a></div>`;

function thumb(a, cls) {
  const src = imgUrl(a);
  return src ? `<div class="thumb${cls ? ' ' + cls : ''}"><img src="${src}" alt="" loading="lazy"></div>`
             : `<div class="thumb" style="background:${tint(a.slug)}">${esc(emojiOf(a))}</div>`;
}
function card(a) {
  return `<a class="card" href="${href(a)}">${thumb(a)}<div class="tx"><span class="chip">${esc(a.category || 'News')}</span><h3>${esc(a.title)}</h3><p class="ex">${esc(a.summary)}</p><span class="meta">${day(a.publishedAt)} · Auntie Tobi</span></div></a>`;
}

function home(articles, cat) {
  const list = cat ? articles.filter(a => a.category === cat) : articles;
  const used = new Set(articles.map(a => a.category));
  const cats = ['All', ...apppub.CATEGORIES.filter(c => used.has(c))];
  const chips = cats.map(c => {
    const on = c === 'All' ? !cat : c === cat;
    return `<a class="${on ? 'on' : ''}" href="/articles${c === 'All' ? '' : '?c=' + encodeURIComponent(c)}">${esc(c)}</a>`;
  }).join('');
  let body;
  if (!list.length) body = `<div class="empty">No articles here yet — check back soon 💚</div>`;
  else {
    const [f, ...rest] = cat ? [null, ...list] : list;
    body = (f ? `<a class="feat" href="${href(f)}">${thumb(f)}<div class="tx"><span class="chip gold">Latest</span><h2>${esc(f.title)}</h2><p class="ex">${esc(f.summary)}</p><span class="meta">${day(f.publishedAt)} · Auntie Tobi</span></div></a>` : '')
      + (rest.length ? `<div class="grid">${rest.slice(0, 90).map(card).join('')}</div>` : '');
  }
  const title = cat ? `${cat} articles — Auntie Tobi` : 'Articles — News, guides and stories for Nigerians in the UK | Auntie Tobi';
  const desc = 'Practical help with money, housing, jobs and everyday life in the UK — plus the latest events and businesses in the Nigerian community.';
  return page({
    title, desc, canonical: `${SITE}/articles${cat ? '?c=' + encodeURIComponent(cat) : ''}`,
    main: `<section class="hero"><div class="wrap"><div class="eyebrow">Auntie Tobi Articles</div><h1>${cat ? esc(cat) : 'News, guides and stories for Nigerians in the UK'}</h1><p>${esc(desc)}</p></div></section>
<main class="wrap"><nav class="cats">${chips}</nav>${body}${CTA}</main>`,
  });
}

function article(a, articles) {
  const url = `${SITE}${href(a)}`;
  const others = articles.filter(x => x.slug !== a.slug);
  const related = [...others.filter(x => x.category === a.category), ...others.filter(x => x.category !== a.category)].slice(0, 3);
  const img = imgUrl(a);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${a.title}\n${url}`)}`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title.slice(0, 110), description: a.summary, datePublished: a.publishedAt, dateModified: a.updatedAt || a.publishedAt,
    author: { '@type': 'Organization', name: 'Auntie Tobi', url: SITE }, publisher: { '@type': 'Organization', name: 'Auntie Tobi', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
    mainEntityOfPage: url, ...(img ? { image: `${SITE}${img}` } : {}) };
  return page({
    title: `${a.title} — Auntie Tobi`, desc: a.summary, canonical: url, image: img, jsonld,
    main: `<article class="art">
<div class="crumb"><a href="/articles">Articles</a> › <a href="/articles?c=${encodeURIComponent(a.category || 'News')}">${esc(a.category || 'News')}</a></div>
<span class="chip">${esc(a.category || 'News')}</span>
<h1>${esc(a.title)}</h1>
${a.summary ? `<p class="lead">${esc(a.summary)}</p>` : ''}
<div class="byline"><img src="/icon-192.png" alt=""><div><b>Auntie Tobi</b><span class="meta">${day(a.publishedAt)} · ${readMins(a.html)} min read</span></div><div class="share"><a href="${esc(wa)}" target="_blank" rel="noopener">🟢 <span>Share on WhatsApp</span></a><a href="/blog/${encodeURIComponent(a.slug)}">📱 <span>Open in app</span></a></div></div>
<div class="hero-img">${thumb(a, img ? 'photo' : '')}</div>
<div class="body">${a.html || ''}</div>
${a.link ? `<p class="more-link"><a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.linkText || 'Find out more')} →</a></p>` : ''}
</article>
<section class="more">${related.length ? `<h2>More from Auntie Tobi</h2><div class="grid">${related.map(card).join('')}</div>` : ''}${CTA}</section>`,
  });
}

function notFound() {
  return respond(404, page({ title: 'Article not found — Auntie Tobi', desc: '', canonical: `${SITE}/articles`,
    main: `<main class="wrap"><div class="empty" style="margin-top:40px"><h2 style="color:var(--ink);margin-bottom:8px">This article isn’t available</h2><p>It may have been moved or taken down.</p><p style="margin-top:16px"><a class="btn" href="/articles">See all articles →</a></p></div></main>` }));
}

exports.handler = core.handler(async (ctx) => {
  if (ctx.event.httpMethod !== 'GET' && ctx.event.httpMethod !== 'HEAD') throw new core.HttpError(405, 'method_not_allowed');
  const q = ctx.event.queryStringParameters || {};
  const fromPath = (String(ctx.event.path || '').match(/^\/articles\/([^/?#]+)/) || [])[1] || '';
  let slug = String(q.s || fromPath || '').slice(0, 80);
  try { slug = decodeURIComponent(slug); } catch (e) { slug = ''; }
  const feed = await apppub.publicFeed();
  const articles = feed.articles || [];
  if (slug) {
    const a = articles.find(x => x.slug === slug);
    return a ? respond(200, article(a, articles)) : notFound();
  }
  const cat = apppub.CATEGORIES.includes(q.c) ? q.c : '';
  return respond(200, home(articles, cat));
}, { allowGet: true });

// for tests
exports._render = { home, article };
