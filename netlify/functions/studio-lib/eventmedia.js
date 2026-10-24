'use strict';
/*
 * Event links and pictures — used by the public "Add your event" page and by Auntie Tobi HQ.
 *   readLink(url)      opens an event page (Eventbrite, a website…) and pulls out its details + main image
 *   makePicture(info)  creates an event image with AI when there is no flyer
 * Images are returned as data URLs; the browser shrinks them to a JPEG before they are saved.
 */
const dns = require('dns').promises;
const net = require('net');
const core = require('./core');
const { HttpError, env } = core;
const gen = require('./generate');

const UA = 'Mozilla/5.0 (compatible; AuntieTobiBot/1.0; +https://auntietobi.co.uk)';
const PAGE_MAX = 2 * 1024 * 1024;
const IMG_MAX = 3.5 * 1024 * 1024;
const IMAGE_MODEL = () => env('STUDIO_IMAGE_MODEL', 'google/gemini-2.5-flash-image');

// ── Safe fetching (public URLs only — never internal addresses) ──
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}
async function checkUrl(u) {
  let url;
  try { url = new URL(String(u || '').trim()); } catch (_) { throw new HttpError(400, 'bad_link', 'That doesn’t look like a web link — please check it.'); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new HttpError(400, 'bad_link', 'Please use a normal web link (starting with https://).');
  const addrs = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new HttpError(400, 'bad_link', 'We couldn’t find that website — please check the link.');
  if (addrs.some(a => privateIp(a.address))) throw new HttpError(400, 'bad_link', 'Please use a public web link.');
  return url;
}
async function safeFetch(u, accept, max) {
  let url = await checkUrl(u);
  for (let hop = 0; hop < 5; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    let res;
    try {
      res = await fetch(url.toString(), { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'en-GB,en;q=0.8' } });
    } catch (_) { clearTimeout(timer); throw new HttpError(502, 'link_failed', 'We couldn’t open that link — please check it, or upload the flyer instead.'); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(timer);
      url = await checkUrl(new URL(res.headers.get('location'), url).toString());
      continue;
    }
    try {
      if (!res.ok) throw new HttpError(502, 'link_failed', 'That page didn’t open for us — please upload the flyer or paste the details instead.');
      const len = +res.headers.get('content-length') || 0;
      if (len > max) throw new HttpError(413, 'too_large', 'That page is too large to read.');
      const chunks = []; let size = 0;
      for await (const c of res.body) { size += c.length; if (size > max) break; chunks.push(c); }
      return { url: url.toString(), type: String(res.headers.get('content-type') || '').toLowerCase(), buf: Buffer.concat(chunks), cut: size > max };
    } finally { clearTimeout(timer); }
  }
  throw new HttpError(502, 'link_failed', 'That link redirects too many times.');
}

// ── Reading an event page ──
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
function meta(html, names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n.replace(/:/g, '\\:')}["'][^>]*>`, 'i');
    const tag = (html.match(re) || [])[0];
    const c = tag && (tag.match(/content=["']([^"']*)["']/i) || [])[1];
    if (c) return decode(c).trim();
  }
  return '';
}
function jsonLdEvents(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const walk = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(walk);
    const t = [].concat(x['@type'] || []).join(' ');
    if (/Event/i.test(t)) out.push(x);
    if (x['@graph']) walk(x['@graph']);
  };
  while ((m = re.exec(html))) { try { walk(JSON.parse(m[1].trim())); } catch (_) { /* ignore broken JSON-LD */ } }
  return out;
}
function ldImage(e) {
  const im = e && e.image;
  if (!im) return '';
  if (typeof im === 'string') return im;
  if (Array.isArray(im)) return ldImage({ image: im[0] });
  return im.url || im.contentUrl || '';
}
function ldPlace(l) {
  if (!l) return '';
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return ldPlace(l[0]);
  const a = l.address;
  const addr = !a ? '' : typeof a === 'string' ? a : [a.streetAddress, a.addressLocality, a.postalCode].filter(Boolean).join(', ');
  return [l.name, addr].filter(Boolean).join(', ');
}
function pageText(html) {
  return decode(html.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

// Returns { notes, link, imageUrl } — notes are fed to the AI writer.
async function readLink(rawUrl, forPost) {
  const page = await safeFetch(rawUrl, 'text/html,application/xhtml+xml', PAGE_MAX);
  if (!/html|xml|text/.test(page.type)) throw new HttpError(400, 'not_page', 'That link isn’t a web page — if it’s a flyer, please upload it instead.');
  const html = page.buf.toString('utf8');
  const ev = jsonLdEvents(html)[0];
  const title = meta(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const desc = meta(html, ['og:description', 'description', 'twitter:description']);
  const text = pageText(html).slice(0, 5000);
  if (!ev && text.length < 120 && desc.length < 40) {
    throw new HttpError(422, 'link_blocked', forPost ? 'We couldn’t read that page — please paste the information instead.' : 'We couldn’t read that page (Instagram and Facebook often block this). Please upload the flyer or paste the details instead.');
  }
  const lines = [`${forPost ? 'Source page' : 'Event page'}: ${page.url}`];
  if (title) lines.push(`Page title: ${title}`);
  if (desc) lines.push(`Page description: ${desc}`);
  if (ev) {
    lines.push('Structured event data:');
    if (ev.name) lines.push(`• Name: ${decode(ev.name)}`);
    if (ev.startDate) lines.push(`• Starts: ${ev.startDate}`);
    if (ev.endDate) lines.push(`• Ends: ${ev.endDate}`);
    const place = ldPlace(ev.location); if (place) lines.push(`• Place: ${decode(place)}`);
    if (ev.description) lines.push(`• Description: ${decode(String(ev.description)).slice(0, 1500)}`);
    const offer = [].concat(ev.offers || [])[0];
    if (offer && (offer.price || offer.lowPrice)) lines.push(`• Price: ${offer.lowPrice || offer.price} ${offer.priceCurrency || ''}`);
  }
  lines.push('', 'Page text:', text);
  lines.push('', forPost ? `Official source link: ${page.url}` : `Booking / tickets link: ${page.url}`);
  const img = ldImage(ev) || meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
  let imageUrl = '';
  try { imageUrl = img ? new URL(decode(img), page.url).toString() : ''; } catch (_) { imageUrl = ''; }
  return { notes: lines.join('\n').slice(0, 6000), link: page.url, imageUrl };
}

// Downloads the page's own event image → data URL ('' if it can't).
async function fetchImage(u) {
  if (!u) return '';
  try {
    const r = await safeFetch(u, 'image/webp,image/jpeg,image/png,image/*;q=0.8', IMG_MAX);
    const type = (r.type.match(/image\/(jpeg|jpg|png|webp)/) || [])[1];
    if (!type || r.cut || r.buf.length < 3000) return '';
    return `data:image/${type === 'jpg' ? 'jpeg' : type};base64,${r.buf.toString('base64')}`;
  } catch (_) { return ''; }
}

// ── Creating an event image with AI ──
// ── A fresh, topic-specific scene for each news/article image (so images don't all look the same) ──
const SETTINGS = ['a busy UK high street', 'a bright modern kitchen in a UK home', 'a cosy living room in the evening', 'a London bus stop or train platform', 'a park on a crisp autumn day', 'a school gate at pick-up time', 'a GP surgery or pharmacy', 'a community hall', 'a small business shopfront', 'a front door and doorstep of a UK terraced house', 'an airport arrivals hall', 'a supermarket aisle', 'a city skyline at golden hour', 'a church or community gathering outside', 'a workplace break room'];
const SHOTS = ['close-up with shallow depth of field', 'wide establishing shot', 'top-down flat lay', 'eye-level candid shot', 'low angle looking up', 'over-the-shoulder shot'];
const MOODS = ['soft morning light', 'warm golden-hour light', 'bright clear daylight', 'cosy warm indoor lighting', 'cool blue-hour city light', 'rainy-day British light with reflections'];
const POSTER_STYLES = ['bold modern graphic design with a big photo-real hero image and Ankara-pattern border', 'vibrant flat illustration with confetti and warm sunset colours', 'elegant dark background with gold accents and spotlight glow', 'bright playful collage with cut-out shapes and stickers', 'retro 70s Afrobeat poster style with grainy texture', 'minimal Swiss-style layout with one striking image and bold type', 'lush tropical greenery and rich jewel tones', 'neon nightlife style with glowing lights'];
const pickOne = a => a[Math.floor(Math.random() * a.length)];
async function sceneIdea(title, about) {
  const hint = `${pickOne(SHOTS)}, ${pickOne(MOODS)}`;
  try {
    const settings = await core.getSettings();
    const out = await gen.callModel([
      { role: 'system', content: 'You are a creative art director for a UK lifestyle app for Nigerians living in the UK. You invent ONE vivid, specific photo scene that instantly tells the story of a topic. Avoid clichés: do NOT default to a desk with a laptop, calculator, calendar or papers unless the topic is literally about paperwork — find a more human, surprising angle (people living the situation, the place where it happens, a telling detail). People may appear (e.g. a Black British / Nigerian family, a young professional, an older auntie) — natural, warm and respectful, never celebrities. No words, signs, screens or documents with readable text. Reply with the scene in 2–3 sentences only.' },
      { role: 'user', content: `Topic: ${title}${about ? `\nAbout: ${about}` : ''}\nPhotographic style to use: ${hint}. A possible setting if it fits (ignore it if it doesn't): ${pickOne(SETTINGS)}.` },
    ], 200, settings, { raw: true });
    gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
    const t = String(out.text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
    if (t.length > 30) return `${t} Style: ${hint}, realistic, uncluttered.`;
  } catch (_) { /* fall back below */ }
  return `a creative, realistic scene that clearly shows "${title}" in everyday UK life for Nigerians in the UK (not a desk with a laptop). Style: ${hint}, uncluttered.`;
}

// 🎬 A storyboard start frame for the Video Ad Studio — the prompt is written by the planner.
async function makeFrame(info) {
  const prompt = String(info.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  if (prompt.length < 20) throw new HttpError(400, 'no_prompt', 'This scene has no image prompt yet.');
  const ar = ['9:16', '4:5', '1:1', '16:9'].includes(info.aspect) ? info.aspect : '9:16';
  let refs = [];
  const ids = (Array.isArray(info.refImgIds) ? info.refImgIds : []).concat(info.refImgId ? [info.refImgId] : []).filter(v => /^e[a-z0-9]{6,30}$/.test(String(v))).slice(0, 4);
  for (const id of ids) { const r = await require('./eventsub').getImage(id); if (r && r.dataUrl) refs.push(r.dataUrl); }
  if (refs.length) return generateImage(`The reference images show the people (characters) and/or the real product for this ad. Keep every person EXACTLY the same as in their reference photo (same face, skin tone, hair, build and outfit unless the scene says otherwise) and show any product EXACTLY as in its photo (shape, colours, details).\n\n${prompt}\n\nPhotorealistic storyboard frame. Do NOT include any text, words, captions, signs, logos, watermarks or brand names.`, ar, refs);
  return generateImage(`${prompt}\n\nPhotorealistic storyboard frame. Do NOT include any text, words, captions, signs, logos, watermarks or brand names. No celebrities or real identifiable people.`, ar);
}

async function makePicture(info) {
  if (info && info.kind === 'frame') return makeFrame(info);
  const fullTitle = core.cleanText(info && info.title, 120);
  const emoji = (fullTitle.match(/^[^\p{L}\p{N}\s]+/u) || [''])[0].trim();
  const title = fullTitle.replace(/^[^\p{L}\p{N}]+/u, '');
  if (!title) throw new HttpError(400, 'title_required', 'Add the title first.');
  const day = !info || !info.eventDate ? '' : /^\d{4}-\d{2}-\d{2}$/.test(String(info.eventDate || '')) ? new Date(info.eventDate + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const town = core.cleanText(info.location, 120).split(',').map(s => s.trim()).filter(s => s && !/\d/.test(s)).pop() || '';
  const about = core.cleanText(String(info.body || '').replace(/\s+/g, ' '), 300);
  const key = env('STUDIO_OPENROUTER_API_KEY') || env('OPENROUTER_API_KEY');
  if (!key) throw new HttpError(500, 'ai_not_configured', 'Creating images needs the AI to be set up.');
  const article = info.kind === 'article' || info.kind === 'news';
  const bg = info.kind === 'carousel';
  const scene = article || bg ? await sceneIdea(title, about) : '';
  const prompt = bg ?
`Create a portrait (4:5) background photo for the cover of an Instagram carousel about: "${title}".
Scene: ${scene}
It is a BACKGROUND: keep the top half calmer and simpler (big text will sit on top of it). Realistic, high quality, warm and inviting.
Do NOT include any words, letters, numbers, signs, logos, watermarks, QR codes, celebrities or real identifiable people.` : article ?
`Create a square (1:1) social-media style image for this post: "${title}"${about ? `\nWhat the post is about: ${about}` : ''}

LAYOUT
- Top third: a large rounded off-white/cream banner (soft rounded corners) holding the title in a heavy, rounded, modern sans-serif font (like Montserrat/Poppins ExtraBold), big and very readable, on 2–3 lines.
- Title colours: dark navy (#0F1E36), with the 2–3 most important words in deep green (#0B5D3B).
- ${emoji ? `On the left of the banner, a glossy 3D icon version of this emoji: ${emoji}.` : 'On the left of the banner, a small glossy 3D icon that fits the topic.'}
- Below the banner, filling the rest of the image: a bright, realistic, high-quality photo-style scene — ${scene}

TEXT — the ONLY words in the image are the title, spelled EXACTLY: "${title}". No other readable words anywhere (papers and screens can show blurred or unreadable lines).
Do NOT include: any brand name, app name or logo (no "Auntie Tobi", no HMRC/GOV.UK/NHS or company logos); celebrities or real, identifiable people; QR codes; watermarks.` :
`Design an eye-catching portrait event poster (4:5) for a UK community event aimed at Nigerians in the UK.
Event: "${title}"${about ? `\nAbout: ${about}` : ''}
Style: ${pickOne(POSTER_STYLES)}. Make the main visual specific to THIS event (what people will actually see, do, eat or hear there) — not a generic motif. Clean layout with plenty of space.
Text on the poster — spell it EXACTLY and include nothing else: the title "${title}"${day ? `, the date "${day}"` : ''}${town ? `, and the place "${town}"` : ''}.
Do NOT include: photos of real people, faces of performers, logos, brand names, QR codes, prices, websites or any other words.`;
  return generateImage(prompt, article ? '1:1' : '4:5');
}

async function generateImage(prompt, aspect, refs) {
  const key = env('STUDIO_OPENROUTER_API_KEY') || env('OPENROUTER_API_KEY');
  if (!key) throw new HttpError(500, 'ai_not_configured', 'Creating images needs the AI to be set up.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  let res, data;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://auntietobi.co.uk', 'X-Title': 'Auntie Tobi Events' },
      body: JSON.stringify({ model: IMAGE_MODEL(), messages: [{ role: 'user', content: refs && refs.length ? [{ type: 'text', text: prompt }].concat(refs.map(u => ({ type: 'image_url', image_url: { url: u } }))) : prompt }], modalities: ['image', 'text'], image_config: { aspect_ratio: aspect }, usage: { include: true } }),
    });
    data = await res.json().catch(() => null);
  } catch (_) {
    throw new HttpError(504, 'ai_timeout', 'Creating the image took too long — please try again.');
  } finally { clearTimeout(timer); }
  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  const im = msg && msg.images && msg.images[0];
  const url = im && (im.image_url && im.image_url.url || im.url);
  if (!res.ok || !url || !/^data:image\//.test(url)) {
    console.error('[eventmedia] image error', res && res.status, JSON.stringify(data || {}).slice(0, 400));
    throw new HttpError(502, 'ai_error', 'We couldn’t create an image just now — please try again, or upload your own.');
  }
  const u = (data && data.usage) || {};
  const settings = await core.getSettings();
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: u.prompt_tokens || 0, outTok: u.completion_tokens || 0, costUsd: typeof u.cost === 'number' ? u.cost : 0.04 }, settings).catch(() => {});
  return url;
}

module.exports = { readLink, fetchImage, makePicture, checkUrl };
