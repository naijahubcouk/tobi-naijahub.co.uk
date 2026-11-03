'use strict';
/*
 * 🔎 Business Finder — finds Nigerian / African businesses in the UK for the directory.
 *   finder/state  { items: [candidate…], queue: [query…], cursor, week, lastRun }
 *   finder/dnl    { items: [{ key, name, at, reason }] }   "never add again" (removal requests)
 * Weekly: a queue of searches ("Nigerian caterers in Leeds") is worked through on Mondays (and on demand from HQ).
 * Each search uses a live web search, then each business's own website is read for public contact details.
 * Nothing goes into the app until Seun approves it in HQ; approved ones go to the weekly website CSV.
 */
const core = require('./core');
const { HttpError, getJson, cas } = core;
const gen = require('./generate');
const bizdir = require('./bizdir');
const bizimg = require('./bizimg');
const eventmedia = require('./eventmedia');

const CATS = ['Beauty & Fashion > Aesthetics', 'Beauty & Fashion > Ankara & Traditional Wears', 'Beauty & Fashion > Fashion & Accessories', 'Beauty & Fashion > Fashion Designers', 'Beauty & Fashion > Gele Stylists', 'Beauty & Fashion > Hair Care', 'Beauty & Fashion > Hair Stylists/Braiders', 'Beauty & Fashion > Jewelry', 'Beauty & Fashion > Makeup Artists', 'Beauty & Fashion > Microblading', 'Beauty & Fashion > Perfumes & Fragrances', 'Beauty & Fashion > Skincare', 'Beauty & Fashion > Spa & Massage', 'Beauty & Fashion > Wig Vendors', 'Events & Entertainment > Alaga', 'Events & Entertainment > DJs', 'Events & Entertainment > Decorators', 'Events & Entertainment > Event Planners', 'Events & Entertainment > MCs', 'Events & Entertainment > Photography', 'Events & Entertainment > Videography', 'Food Dining & Grocieries > Cakes & Desert', 'Food Dining & Grocieries > Caterers', 'Food Dining & Grocieries > Drinks', 'Food Dining & Grocieries > Foodstores & Groceries', 'Food Dining & Grocieries > Nigerian Snacks', 'Food Dining & Grocieries > Private Chef', 'Food Dining & Grocieries > Restaurants', 'Food Dining & Grocieries > Small Chops', 'Food Dining & Grocieries > Suya Spot', 'Home & Services > Baby Essentials', 'Home & Services > Gifts & Hampers', 'Home & Services > Home & Kitchen', 'Professional Services & Communities > Education Consultancy', 'Professional Services & Communities > Printing Services', 'Professional Services & Communities > Shipping & Logistics', 'Professional Services & Communities > Tutors'];
// search words per category (what people would type), most popular first
const SEARCH = [['Caterers', 'Nigerian caterer'], ['Makeup Artists', 'Nigerian makeup artist'], ['Restaurants', 'Nigerian restaurant'], ['Foodstores & Groceries', 'African food shop'], ['Cakes & Desert', 'Nigerian cakes'], ['Small Chops', 'small chops'], ['Ankara & Traditional Wears', 'ankara fashion'], ['Wig Vendors', 'Nigerian wig vendor'], ['Gele Stylists', 'gele stylist'], ['Photography', 'Nigerian wedding photographer'], ['Event Planners', 'Nigerian event planner'], ['Hair Stylists/Braiders', 'African hair braiding'], ['Fashion Designers', 'Nigerian fashion designer'], ['Skincare', 'Nigerian skincare brand'], ['Suya Spot', 'suya'], ['Decorators', 'Nigerian event decor'], ['DJs', 'Afrobeats DJ'], ['MCs', 'Nigerian MC compere'], ['Alaga', 'alaga ijoko'], ['Private Chef', 'Nigerian private chef'], ['Nigerian Snacks', 'chin chin puff puff'], ['Drinks', 'zobo drink'], ['Jewelry', 'African beads jewellery'], ['Videography', 'Nigerian wedding videographer'], ['Gifts & Hampers', 'African gift hampers'], ['Shipping & Logistics', 'shipping to Nigeria'], ['Tutors', 'Nigerian tutor'], ['Perfumes & Fragrances', 'Nigerian perfume oil'], ['Fashion & Accessories', 'African print accessories']];
const CITIES = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Leicester', 'Nottingham', 'Bristol', 'Sheffield', 'Coventry', 'Milton Keynes', 'Northampton', 'Reading', 'Luton', 'Peterborough', 'Southampton', 'Newcastle', 'Bradford', 'Huddersfield', 'Derby', 'Wolverhampton', 'Cardiff', 'Glasgow', 'Edinburgh', 'Essex', 'Kent', 'Croydon', 'Peckham', 'Woolwich', 'Dartford', 'Colchester', 'Ipswich', 'Cambridge', 'Oxford', 'Swindon', 'Portsmouth', 'Hull', 'Stoke-on-Trent', 'Aberdeen', 'Belfast'];
const PER_WEEK = 20;   // searches a week — about 60–80 candidates
const TRUST_SKIP = /(yell\.com|tripadvisor|facebook\.com\/groups|gumtree|indeed|linkedin\.com\/jobs|wikipedia|reddit|bark\.com|checkatrade|hitched|bridebook|justeat|deliveroo|ubereats)/i;

// name key: lower-case letters/numbers, without "ltd", "limited", "uk" etc. so "Abbystore Ltd" = "abbystoreltd" = "Abbystore UK"
const key = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').replace(/(ltd|limited|uk|ukltd|enterprises?|global|services)+$/, '') || String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const domain = u => { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };
const igOf = v => { const m = String(v || '').match(/instagram\.com\/([A-Za-z0-9._]{2,40})/i); return m && !/^(p|reel|explore|stories|accounts)$/i.test(m[1]) ? m[1].toLowerCase() : String(v || '').replace(/^@/, '').match(/^[A-Za-z0-9._]{2,40}$/) ? String(v).replace(/^@/, '').toLowerCase() : ''; };
const childCat = c => String(c || '').split('>').pop().trim().toLowerCase();

async function state() { return (await getJson('finder/state').catch(() => null)) || { items: [], queue: [], cursor: 0, week: '' }; }
async function dnl() { return ((await getJson('finder/dnl').catch(() => null)) || { items: [] }).items; }
function weekOf(d) { const t = new Date(d || Date.now()); t.setUTCHours(0, 0, 0, 0); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); }

// Everything the directory, the review list and the do-not-list already hold — so nothing is suggested twice.
async function knownKeys() {
  const s = await state(), dir = await bizdir.all(), never = await dnl(), set = new Set();
  const add = b => { if (b.name) set.add('n:' + key(b.name)); if (b.ig) set.add('i:' + String(b.ig).toLowerCase()); const d = domain(b.website); if (d && !/instagram|facebook|tiktok|linktr|wa\.me|whatsapp/.test(d)) set.add('d:' + d); const sd = domain(b.shop); if (sd && !/instagram|facebook|tiktok|linktr|wa\.me|whatsapp|selar|paystack|flutterwave/.test(sd)) set.add('d:' + sd); if (b.slug) set.add('n:' + key(b.slug)); };
  dir.forEach(add); s.items.forEach(add); never.forEach(x => set.add(x.key));
  return set;
}
function isKnown(set, b) { return set.has('n:' + key(b.name)) || (b.ig && set.has('i:' + b.ig.toLowerCase())) || (domain(b.website) && set.has('d:' + domain(b.website))); }

// Reads a business's own website for public contact details (email, phone, WhatsApp, Instagram).
async function readSite(url) {
  if (!url || /instagram\.com|facebook\.com|tiktok\.com/i.test(url)) return {};
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(/^https?:/i.test(url) ? url : 'https://' + url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuntieTobiDirectory/1.0; +https://www.auntietobi.co.uk)' } });
    if (!r.ok) return {};
    const html = (await r.text()).slice(0, 400000);
    const email = (html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i) || html.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:co\.uk|com|uk|org|net|io|biz))\b/i) || [])[1] || '';
    const wa = (html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,15})/i) || [])[1] || '';
    const phone = (html.match(/tel:(\+?[\d ()-]{10,18})/i) || [])[1] || '';
    const ig = igOf((html.match(/instagram\.com\/[A-Za-z0-9._]{2,40}/i) || [])[0]);
    // the picture the site uses for link previews (usually a logo or shop photo)
    const og = (html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i) || [])[1] || '';
    let imgUrl = ''; try { imgUrl = og ? new URL(og.replace(/&amp;/g, '&'), r.url || url).toString() : ''; } catch (_) { imgUrl = ''; }
    if (!/^https:/i.test(imgUrl) || /\.svg(\?|$)/i.test(imgUrl)) imgUrl = '';
    return { imgUrl, email: /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email) || /example|sentry|wixpress|domain/i.test(email) ? '' : email.toLowerCase(), wa: wa.replace(/\D/g, ''), phone: phone.trim(), ig };
  } catch (_) { return {}; } finally { clearTimeout(t); }
}

function extractPrompt(query) {
  return [{ role: 'system', content:
`You help Auntie Tobi build a directory of Nigerian (and wider African) owned businesses in the UK. Web search results for the search below are attached.
From those results ONLY, list real businesses that:
- operate in the UK, and
- appear Nigerian or African owned or focused (Nigerian/African food, fashion, beauty, events, culture, names, or they say so).
Skip directories, listing sites, articles, job ads, marketplaces, and anything outside the UK. Never invent a business, link or detail — every field must come from the results (leave it "" if not there).
Return ONLY JSON: {"businesses":[{"name":"","website":"their own website or main social profile URL","instagram":"handle or URL or \\"\\"","town":"UK town/city","category":"exactly one of the CATEGORIES","description":"1–2 plain sentences: what they offer (no hype)","why":"short reason you think they are Nigerian/African","confidence":0.0}]}
CATEGORIES: ${JSON.stringify(CATS)}` },
  { role: 'user', content: `SEARCH: ${query}` }];
}

// Runs one search and adds new candidates. Returns { query, found, added }.
async function runOne(query) {
  const settings = await core.getSettings();
  const out = await gen.callModel(extractPrompt(query), 2200, settings, { json: true, raw: true, timeoutMs: 22000, plugins: [{ id: 'web', engine: 'exa', max_results: 10 }] });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let list = [];
  try { list = (JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')).businesses || []); } catch (_) { list = []; }
  const known = await knownKeys(), fresh = [];
  for (const x of list.slice(0, 15)) {
    const c = {
      name: core.cleanText(x.name, 120), website: core.cleanText(x.website, 300), ig: igOf(x.instagram) || igOf(x.website), loc: core.cleanText(x.town, 60),
      cat: CATS.includes(x.category) ? x.category : '', desc: core.cleanText(x.description, 400), why: core.cleanText(x.why, 200), confidence: Math.max(0, Math.min(1, +x.confidence || 0)),
    };
    if (!c.name || !c.cat || TRUST_SKIP.test(c.website) || isKnown(known, c)) continue;
    known.add('n:' + key(c.name)); fresh.push(c);
  }
  const sites = await Promise.all(fresh.map(c => readSite(c.website)));
  const now = core.nowIso();
  const items = fresh.map((c, i) => Object.assign(c, { id: 'f' + Date.now().toString(36) + i, imgUrl: sites[i].imgUrl || '', email: sites[i].email || '', wa: sites[i].wa || '', phone: sites[i].phone || '', ig: c.ig || sites[i].ig || '', query, foundAt: now, status: 'new' }));
  await cas('finder/state', cur => { cur = cur || { items: [], queue: [], cursor: 0, week: '' }; cur.items = items.concat(cur.items).slice(0, 600); cur.lastRun = now; return cur; });
  return { query, found: list.length, added: items.length };
}

// The week's searches: rotate through categories × cities so every week looks somewhere new.
function buildQueue(cursor) {
  const q = [];
  for (let i = 0; i < PER_WEEK; i++) { const n = cursor + i, s = SEARCH[n % SEARCH.length], city = CITIES[Math.floor(n / SEARCH.length + n) % CITIES.length]; q.push(`${s[1]} in ${city}, UK`); }
  return q;
}
async function ensureWeek() {
  const wk = weekOf();
  await cas('finder/state', cur => {
    cur = cur || { items: [], queue: [], cursor: 0, week: '' };
    if (cur.week === wk) return undefined;
    cur.queue = buildQueue(cur.cursor || 0); cur.cursor = (cur.cursor || 0) + PER_WEEK; cur.week = wk;
    return cur;
  });
}
// Works through the queue (scheduled on Mondays, or "Find more now" in HQ). Stays within ~budgetMs.
async function work(budgetMs, maxSearches) {
  const stop = Date.now() + (budgetMs || 24000), done = [];
  for (let i = 0; i < (maxSearches || 1); i++) {
    if (Date.now() > stop - 15000 && i > 0) break;
    let query;
    await cas('finder/state', cur => { cur = cur || { items: [], queue: [] }; query = (cur.queue || []).shift(); return query ? cur : undefined; });
    if (!query) break;
    try { done.push(await runOne(query)); } catch (e) { done.push({ query, error: e.message || 'failed' }); }
  }
  return done;
}
// "Find more now": adds another batch of searches if this week's are done.
async function more() {
  await ensureWeek();
  await cas('finder/state', cur => { if (cur && cur.queue && cur.queue.length) return undefined; cur.queue = buildQueue(cur.cursor || 0).slice(0, 5); cur.cursor = (cur.cursor || 0) + 5; return cur; });
  return work(22000, 1);
}

// ⚡ Quick add: an Instagram link, a website or a business name → a ready-to-check candidate.
async function quickAdd(input) {
  input = core.cleanText(input, 300);
  if (input.length < 3) throw new HttpError(400, 'invalid', 'Paste an Instagram link, a website or a business name.');
  const handle = igOf(input), q = handle ? `instagram ${handle} business UK` : /^https?:|\.\w{2,}\//.test(input) ? input : `${input} UK business`;
  const r = await runOne(q);
  if (!r.added) {
    // nothing new found by search: still add a bare card from what was pasted, for Seun to fill in
    const known = await knownKeys(), c = { name: handle || input.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0], ig: handle, website: /^https?:/.test(input) && !handle ? input : '', loc: '', cat: '', desc: '', why: 'Added by you', confidence: 1 };
    if (isKnown(known, c)) throw new HttpError(409, 'exists', 'That business is already in your directory or review list.');
    const site = await readSite(c.website);
    const item = Object.assign(c, { id: 'f' + Date.now().toString(36), imgUrl: site.imgUrl || '', email: site.email || '', wa: site.wa || '', phone: site.phone || '', query: 'Quick add', foundAt: core.nowIso(), status: 'new' });
    await cas('finder/state', cur => { cur = cur || { items: [], queue: [] }; cur.items = [item].concat(cur.items); return cur; });
  }
  return r;
}

// ✅ Approve → into the app straight away (unclaimed, created by "Auntie Tobi"); ✖ Skip; 🚫 Never add.
async function decide(id, decision, edits, who) {
  let cand;
  await cas('finder/state', cur => { cand = cur && cur.items.find(x => x.id === id); return undefined; });
  if (!cand) throw new HttpError(404, 'not_found', 'That suggestion is no longer in the list.');
  const e = {}; for (const k of ['name', 'cat', 'loc', 'desc', 'ig', 'wa', 'email', 'phone', 'website']) if (edits && typeof edits[k] === 'string') e[k] = core.cleanText(edits[k], k === 'desc' ? 400 : 300);
  if (e.cat && !CATS.includes(e.cat)) delete e.cat;
  if (edits && edits.status === 'new' && cand.status === 'skipped') e.status = 'new';
  if (edits && edits.imgNone === true) { e.imgNone = true; e.imgUp = false; await core.del('finder/img/' + id).catch(() => {}); }
  if (edits && edits.imgData) { if (!bizimg.parse(edits.imgData)) throw new HttpError(400, 'bad_image', 'That picture couldn’t be used — please try a JPG or PNG under 2.5MB.'); await core.setJson('finder/img/' + id, { dataUrl: edits.imgData, src: 'upload' }); e.imgUp = true; e.imgNone = false; }
  const c = Object.assign({}, cand, e);
  const now = core.nowIso();
  if (decision === 'approve') {
    if (!c.name || !c.cat) throw new HttpError(400, 'invalid', 'Add a name and a category first.');
    const dir = await bizdir.all(), taken = new Set(dir.map(b => b.slug));
    let slug = bizdir.slugify(c.name), n = 2; while (taken.has(slug)) slug = bizdir.slugify(c.name) + '-' + n++;
    // picture: your upload → their website picture → the Auntie Tobi card made in HQ
    let pic = null;
    if (!c.imgNone) pic = await picture(c);
    if (!pic && edits && bizimg.parse(edits.fallbackImg)) pic = { dataUrl: edits.fallbackImg, src: 'card' };
    c.img = pic ? await bizimg.put(slug, pic.dataUrl, pic.src) : '';
    await core.del('finder/img/' + id).catch(() => {});
    await bizdir.save({ slug, img: c.img, name: c.name, cat: childCat(c.cat), cats: [c.cat], loc: c.loc || 'UK', addr: (c.loc || '') + (c.loc ? ', ' : '') + 'UK', desc: c.desc, ig: c.ig, wa: c.wa, phone: c.phone, email: c.email, website: c.website && !/instagram\.com/i.test(c.website) ? c.website : '', contact: 'Auntie Tobi', claimedSet: false, src: 'hq', notes: 'Found by the Business Finder (' + (c.query || '') + ').' }, who);
    c.slug = slug; c.status = 'approved'; c.approvedAt = now;
  } else if (decision === 'skip') { c.status = 'skipped'; c.imgUp = false; await core.del('finder/img/' + id).catch(() => {}); }
  else if (decision === 'never') { c.status = 'skipped'; c.imgUp = false; await core.del('finder/img/' + id).catch(() => {}); await neverAdd(c, 'Skipped for good in the Finder'); }
  else if (decision === 'edit') { /* save edits only */ }
  else throw new HttpError(400, 'invalid', 'Unknown choice.');
  await cas('finder/state', cur => { cur.items = cur.items.map(x => x.id === id ? c : x); return cur; });
  return c;
}
// The candidate's picture as a data URL: uploaded in HQ, or downloaded from their website (kept for next time).
async function picture(c) {
  const rec = await core.getJson('finder/img/' + c.id).catch(() => null);
  if (rec && rec.dataUrl) return rec;
  if (!c.imgUrl) return null;
  const dataUrl = await eventmedia.fetchImage(c.imgUrl).catch(() => '');
  if (!dataUrl || !bizimg.parse(dataUrl)) return null;
  const pic = { dataUrl, src: 'site' };
  await core.setJson('finder/img/' + c.id, pic).catch(() => {});
  return pic;
}
// For the review card in HQ (HQ can't show outside pictures directly).
async function pictureFor(id) {
  const s = await state(), c = s.items.find(x => x.id === id);
  if (!c || c.imgNone) return { dataUrl: '', src: '' };
  const pic = await picture(c);
  if (!pic && c.imgUrl) await cas('finder/state', cur => { const x = cur.items.find(y => y.id === id); if (!x) return undefined; x.imgUrl = ''; return cur; });
  return pic ? { dataUrl: pic.dataUrl, src: pic.src } : { dataUrl: '', src: '' };
}
async function neverAdd(b, reason) {
  const keys = ['n:' + key(b.name)].concat(b.ig ? ['i:' + String(b.ig).toLowerCase()] : [], domain(b.website) ? ['d:' + domain(b.website)] : []);
  await cas('finder/dnl', cur => { cur = cur || { items: [] }; for (const k of keys) if (!cur.items.some(x => x.key === k)) cur.items.push({ key: k, name: b.name, at: core.nowIso(), reason: reason || '' }); return cur; });
}

// ⬇️ The weekly website CSV: approved businesses not uploaded yet, in the website's own import columns.
const HEAD = ['name', 'slug', 'description', 'detailedDescription', 'images', 'video', 'categories', 'tags', 'mainLink', 'status', 'isFeatured', 'rejectionReasons', 'modificationsMade', 'exemptFromAutomation', 'adminNote', 'contact_name', 'location_address', 'location_latitude', 'location_longitude', 'operating_hours', 'business_phone', 'business_email', 'socialMedia_x', 'socialMedia_facebook', 'socialMedia_instagram', 'socialMedia_linkedin', 'socialMedia_youtube', 'socialMedia_github', 'socialMedia_tiktok', 'socialMedia_pinterest', 'socialMedia_snapchat', 'socialMedia_reddit', 'socialMedia_medium', 'socialMedia_telegram', 'socialMedia_discord', 'seoTitle', 'seoDescription', 'seoKeywords', 'focusKeyword', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription', 'twitterCard', 'canonicalUrl', 'noIndex', 'noFollow', 'schemaType', 'custom_Whatsapp Link', 'custom_💙 Companies House registration verified by Auntie Tobi.'];
const cell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
// Every business added in HQ (by the Finder or by hand) that isn't on the website yet.
async function toUpload() { return (await bizdir.all()).filter(b => b.src === 'hq' && !b.hidden && !b.uploadedAt); }
async function exportCsv() {
  const rows = (await toUpload()).map(b => {
    const short = String(b.desc || '').slice(0, 160), cat = (b.cats && b.cats[0]) || CATS.find(c => childCat(c) === String(b.cat || '').toLowerCase()) || '';
    const v = { name: b.name, slug: b.slug, images: b.img || '', description: short, detailedDescription: b.desc, categories: cat, mainLink: b.website, status: 'PUBLISHED', isFeatured: 'false',
      exemptFromAutomation: 'false', contact_name: 'Auntie Tobi', location_address: b.addr || ((b.loc && b.loc !== 'UK' ? b.loc + ', ' : '') + 'UK'),
      business_phone: b.phone, business_email: b.email, socialMedia_instagram: b.ig ? 'https://www.instagram.com/' + b.ig + '/' : '', seoTitle: b.name, seoDescription: short, focusKeyword: b.name.toLowerCase(),
      ogTitle: b.name, ogDescription: short, twitterTitle: b.name, twitterDescription: short, twitterCard: 'summary_large_image', noIndex: 'false', noFollow: 'true', schemaType: 'LocalBusiness', 'custom_Whatsapp Link': b.wa ? 'https://wa.me/' + b.wa : '' };
    return HEAD.map(h => cell(v[h] || '')).join(',');
  });
  return { csv: '\uFEFF' + HEAD.join(',') + '\n' + rows.join('\n') + (rows.length ? '\n' : ''), count: rows.length };
}
async function markUploaded() {
  const list = await toUpload(), now = core.nowIso(), slugs = new Set(list.map(b => b.slug));
  await bizdir.markUploaded([...slugs], now);
  await cas('finder/state', cur => { if (!cur) return undefined; cur.items = cur.items.map(x => x.status === 'approved' && slugs.has(x.slug) ? Object.assign({}, x, { status: 'uploaded', uploadedAt: now }) : x); return cur; });
  return list.length;
}
async function summary() {
  const s = await state(), wk = weekOf();
  const approvedThisWeek = s.items.filter(x => (x.status === 'approved' || x.status === 'uploaded') && x.approvedAt && weekOf(x.approvedAt) === wk).length;
  return { items: s.items, queue: (s.queue || []).length, lastRun: s.lastRun || '', approvedThisWeek, target: 50, cats: CATS, toUpload: (await toUpload()).length };
}

module.exports = { pictureFor, CATS, runOne, work, more, ensureWeek, quickAdd, decide, neverAdd, exportCsv, markUploaded, summary, weekOf };
