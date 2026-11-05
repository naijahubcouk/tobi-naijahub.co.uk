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
async function readSite(url, ms) {
  if (!url || /instagram\.com|facebook\.com|tiktok\.com/i.test(url)) return {};
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 4000);
  try {
    const r = await fetch(/^https?:/i.test(url) ? url : 'https://' + url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuntieTobiDirectory/1.0; +https://www.auntietobi.co.uk)' } });
    if (!r.ok) return {};
    // Many site builders (Wix, Squarespace…) put links inside scripts as "instagram.com\/name" or encoded — undo that, and read the whole page (footers are at the end)
    const html = (await r.text()).slice(0, 2500000).replace(/\\\//g, '/').replace(/%2F/gi, '/').replace(/&#x2F;|&#47;/gi, '/').replace(/\\u002F/gi, '/');
    const email = (html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i) || html.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:co\.uk|com|uk|org|net|io|biz))\b/i) || [])[1] || '';
    const wa = (html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,15})/i) || [])[1] || '';
    const phone = (html.match(/tel:(\+?[\d ()-]{10,18})/i) || [])[1] || '';
    const ig = ((html.match(/instagram\.com\/(?:_u\/)?[A-Za-z0-9._]{2,40}/gi) || []).map(x => igOf(x.replace(/\/_u\//i, '/'))).filter(h => h && !/^(instagram|p|reel|reels|explore|stories|accounts|about|developer|legal)$/i.test(h))[0]) || '';
    const fb = ((html.match(/https?:\/\/(?:www\.|m\.|en-gb\.)?(?:facebook|fb)\.com\/[^"'\s<>]+/gi) || []).map(bizdir.fbUrl).filter(Boolean)[0]) || '';
    const tt = bizdir.ttUrl((html.match(/tiktok\.com\/@[A-Za-z0-9._]{2,40}/i) || [])[0]);
    // the picture the site uses for link previews (usually a logo or shop photo)
    const og = (html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i) || [])[1] || '';
    let imgUrl = ''; try { imgUrl = og ? new URL(og.replace(/&amp;/g, '&'), r.url || url).toString() : ''; } catch (_) { imgUrl = ''; }
    if (!/^https:/i.test(imgUrl) || /\.svg(\?|$)/i.test(imgUrl)) imgUrl = '';
    // their own words about the business (meta description + the start of the page text) — used to write the listing
    const metaDesc = (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']{20,600})["']/i) || [])[1] || '';
    const body = html.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
    const siteText = (metaDesc ? metaDesc.replace(/&amp;/g, '&') + ' — ' : '') + body.slice(0, 1400);
    return { siteText: siteText.slice(0, 1600), imgUrl, email: /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email) || /example|sentry|wixpress|domain/i.test(email) ? '' : email.toLowerCase(), wa: wa.replace(/\D/g, ''), phone: phone.trim(), ig, fb, tt };
  } catch (_) { return {}; } finally { clearTimeout(t); }
}

function extractPrompt(query) {
  return [{ role: 'system', content:
`You help Auntie Tobi build a directory of Nigerian (and wider African) owned businesses in the UK. Web search results for the search below are attached.
From those results ONLY, list real businesses that:
- operate in the UK, and
- appear Nigerian or African owned or focused (Nigerian/African food, fashion, beauty, events, culture, names, or they say so).
Skip directories, listing sites, articles, job ads, marketplaces, and anything outside the UK. Never invent a business, link or detail — every field must come from the results (leave it "" if not there).
Return ONLY JSON: {"businesses":[{"name":"","website":"their own website or main social profile URL","instagram":"handle or URL or \\"\\"","facebook":"their Facebook page URL or \\"\\"","tiktok":"their TikTok @handle or URL or \\"\\"","town":"UK town/city","category":"exactly one of the CATEGORIES","description":"1–2 plain sentences: what they offer (no hype)","why":"short reason you think they are Nigerian/African","confidence":0.0}]}
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
      name: core.cleanText(x.name, 120), website: core.cleanText(x.website, 300), ig: igOf(x.instagram) || igOf(x.website), fb: bizdir.fbUrl(x.facebook) || bizdir.fbUrl(x.website), tt: bizdir.ttUrl(x.tiktok) || bizdir.ttUrl(x.website), loc: core.cleanText(x.town, 60),
      cat: CATS.includes(x.category) ? x.category : '', desc: core.cleanText(x.description, 400), why: core.cleanText(x.why, 200), confidence: Math.max(0, Math.min(1, +x.confidence || 0)),
    };
    if (!c.name || !c.cat || TRUST_SKIP.test(c.website) || isKnown(known, c)) continue;
    known.add('n:' + key(c.name)); fresh.push(c);
  }
  const sites = await Promise.all(fresh.map(c => readSite(c.website)));
  const now = core.nowIso();
  const items = fresh.map((c, i) => Object.assign(c, { id: 'f' + Date.now().toString(36) + i, siteText: sites[i].siteText || '', imgUrl: sites[i].imgUrl || '', email: sites[i].email || '', wa: sites[i].wa || '', phone: sites[i].phone || '', ig: c.ig || sites[i].ig || '', fb: c.fb || sites[i].fb || '', tt: c.tt || sites[i].tt || '', query, foundAt: now, status: 'new' }));
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
    const known = await knownKeys(), c = { name: handle || input.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0], ig: handle, fb: bizdir.fbUrl(input), tt: bizdir.ttUrl(input), website: /^https?:/.test(input) && !handle && !bizdir.fbUrl(input) && !bizdir.ttUrl(input) ? input : '', loc: '', cat: '', desc: '', why: 'Added by you', confidence: 1 };
    if (isKnown(known, c)) throw new HttpError(409, 'exists', 'That business is already in your directory or review list.');
    const site = await readSite(c.website);
    const item = Object.assign(c, { id: 'f' + Date.now().toString(36), siteText: site.siteText || '', imgUrl: site.imgUrl || '', email: site.email || '', wa: site.wa || '', phone: site.phone || '', fb: c.fb || site.fb || '', tt: c.tt || site.tt || '', query: 'Quick add', foundAt: core.nowIso(), status: 'new' });
    await cas('finder/state', cur => { cur = cur || { items: [], queue: [] }; cur.items = [item].concat(cur.items); return cur; });
  }
  return r;
}

// ✅ Approve → into the app straight away (unclaimed, created by "Auntie Tobi"); ✖ Skip; 🚫 Never add.
async function decide(id, decision, edits, who) {
  let cand;
  await cas('finder/state', cur => { cand = cur && cur.items.find(x => x.id === id); return undefined; });
  if (!cand) throw new HttpError(404, 'not_found', 'That suggestion is no longer in the list.');
  const e = {}; for (const k of ['name', 'cat', 'loc', 'desc', 'ig', 'fb', 'tt', 'wa', 'email', 'phone', 'website']) if (edits && typeof edits[k] === 'string') e[k] = core.cleanText(edits[k], k === 'desc' ? 400 : 300);
  if (e.cat && !CATS.includes(e.cat)) delete e.cat;
  if (edits && edits.status === 'new' && cand.status === 'skipped') e.status = 'new';
  if (edits && edits.imgNone === true) { e.imgNone = true; e.imgUp = false; await core.del('finder/img/' + id).catch(() => {}); }
  if (edits && edits.imgData) { if (!bizimg.parse(edits.imgData)) throw new HttpError(400, 'bad_image', 'That picture couldn’t be used — please try a JPG or PNG under 2.5MB.'); await core.setJson('finder/img/' + id, { dataUrl: edits.imgData, src: 'upload' }); e.imgUp = true; e.imgNone = false; }
  const c = Object.assign({}, cand, e);
  const now = core.nowIso();
  if (decision === 'approve') {
    // socials missing? read their website once more (slower sites often time out during the weekly search)
    if (c.website && !/instagram\.com|facebook\.com|tiktok\.com/i.test(c.website) && (!c.ig || !c.fb || !c.tt || !c.email)) {
      const again = await readSite(c.website, 7000);
      for (const k of ['ig', 'fb', 'tt', 'email', 'wa', 'phone']) if (!c[k] && again[k]) c[k] = again[k];
      if (!c.siteText && again.siteText) c.siteText = again.siteText;
      if (!c.imgUrl && again.imgUrl) c.imgUrl = again.imgUrl;
    }
    if (!c.name || !c.cat) throw new HttpError(400, 'invalid', 'Add a name and a category first.');
    const dir = await bizdir.all(), taken = new Set(dir.map(b => b.slug));
    let slug = bizdir.slugify(c.name), n = 2; while (taken.has(slug)) slug = bizdir.slugify(c.name) + '-' + n++;
    // picture: your upload → their website picture → the Auntie Tobi card made in HQ
    let pic = null;
    if (!c.imgNone) pic = await picture(c);
    if (!pic && edits && bizimg.parse(edits.fallbackImg)) pic = { dataUrl: edits.fallbackImg, src: 'card' };
    c.img = pic ? await bizimg.put(slug, pic.dataUrl, pic.src) : '';
    const w = await writeUp(c, e.desc && e.desc !== cand.desc ? e.desc : '');
    c.desc = w.long; c.short = w.short; c.tags = w.tags; delete c.siteText;
    await core.del('finder/img/' + id).catch(() => {});
    await bizdir.save({ slug, img: c.img, short: w.short, tags: w.tags, lat: w.lat, lng: w.lng, name: c.name, cat: childCat(c.cat), cats: [c.cat], loc: c.loc || 'UK', addr: (c.loc || '') + (c.loc ? ', ' : '') + 'UK', desc: c.desc, ig: c.ig, fb: c.fb, tt: c.tt, wa: c.wa, phone: c.phone, email: c.email, website: c.website && !/instagram\.com|facebook\.com|fb\.com|tiktok\.com/i.test(c.website) ? c.website : '', contact: 'Auntie Tobi', claimedSet: false, src: 'hq', awaitSite: true, notes: 'Found by the Business Finder (' + (c.query || '') + ').' }, who);
    c.slug = slug; c.status = 'approved'; c.approvedAt = now;
  } else if (decision === 'skip') { c.status = 'skipped'; c.imgUp = false; delete c.siteText; await core.del('finder/img/' + id).catch(() => {}); }
  else if (decision === 'never') { c.status = 'skipped'; c.imgUp = false; await core.del('finder/img/' + id).catch(() => {}); await neverAdd(c, 'Skipped for good in the Finder'); }
  else if (decision === 'edit') { /* save edits only */ }
  else throw new HttpError(400, 'invalid', 'Unknown choice.');
  await cas('finder/state', cur => { cur.items = cur.items.map(x => x.id === id ? c : x); return cur; });
  return c;
}
// ✍️ The listing words: a one-line short description, a fuller description, tags and the map point for the town.
// Their own website text is the main source; nothing is made up.
const TOWNS = {"livingston":[55.9007,-3.5181],"liverpool":[53.4084,-2.9916],"birmingham":[52.4823,-1.89],"norwich":[52.6293,1.2979],"london":[51.5072,-0.1276],"tilbury":[51.4671,0.3939],"manchester":[53.4808,-2.2426],"sunderland":[54.9044,-1.3812],"glasgow":[55.8617,-4.2583],"bradford":[53.7938,-1.7564],"colchester":[51.8959,0.8919],"kent":[51.0928,0.8392],"southampton":[50.9105,-1.4049],"rainham":[51.3629,0.6113],"middlesbrough":[54.5742,-1.235],"dudley":[52.5107,-2.0866],"plymouth":[50.3755,-4.1427],"cambridgeshire":[52.2762,-0.0965],"doncaster":[53.5228,-1.1323],"coventry":[52.4128,-1.509],"derbyshire":[53.1223,-1.5137],"newcastle":[54.9783,-1.6178],"maidstone":[51.2704,0.5227],"huddersfield":[53.6458,-1.785],"bolton":[53.5769,-2.4282],"aberdeen":[57.1499,-2.0938],"milton keynes":[52.0406,-0.7594],"edinburgh":[55.9533,-3.1883],"scarborough":[54.2831,-0.3998],"aylesbury":[51.8177,-0.8192],"east london":[51.5563,0.0655],"suffolk":[52.2714,1.0721],"newport":[51.5842,-2.9977],"sheffield":[53.3811,-1.4701],"dartford":[51.4462,0.2169],"camberley":[51.3354,-0.7429],"bexleyheath":[51.4533,0.1382],"northampton":[52.2371,-0.8944],"nottingham":[52.954,-1.155],"witham":[51.7978,0.6372],"warwickshire":[52.2671,-1.4675],"hertfordshire":[51.8098,-0.2377],"aldershot":[51.2484,-0.7558],"wrexham":[53.043,-2.9925],"mansfield":[53.1472,-1.1987],"wolverhampton":[52.5868,-2.1257],"leicester":[52.6369,-1.1398],"leeds":[53.8008,-1.5491],"essex":[51.7668,0.4758],"derby":[52.9225,-1.4746],"bristol":[51.4545,-2.5879],"reading":[51.4543,-0.9781],"luton":[51.8787,-0.42],"peterborough":[52.5695,-0.2405],"cardiff":[51.4816,-3.1791],"croydon":[51.3762,-0.0982],"peckham":[51.474,-0.069],"woolwich":[51.4892,0.0648],"ipswich":[52.0567,1.1482],"cambridge":[52.2053,0.1218],"oxford":[51.752,-1.2577],"swindon":[51.5558,-1.7797],"portsmouth":[50.8198,-1.088],"hull":[53.7676,-0.3274],"stoke-on-trent":[53.0027,-2.1794],"belfast":[54.5973,-5.9301],"salford":[53.4875,-2.2901],"bournemouth":[50.7192,-1.8808],"brighton":[50.8225,-0.1372],"slough":[51.5105,-0.5950],"watford":[51.6565,-0.3903],"chelmsford":[51.7356,0.4685],"basildon":[51.5761,0.4887],"gravesend":[51.4416,0.3702],"lewisham":[51.4452,-0.0209],"ilford":[51.559,0.0741],"barking":[51.5362,0.0798],"romford":[51.5751,0.1858],"stratford":[51.5419,-0.0034],"tottenham":[51.5975,-0.0681],"enfield":[51.6523,-0.0807],"harrow":[51.5806,-0.3420],"wembley":[51.5588,-0.2817],"thamesmead":[51.5037,0.1170],"erith":[51.4800,0.1778],"stockport":[53.4106,-2.1575],"oldham":[53.5409,-2.1114],"rochdale":[53.6097,-2.1561],"wigan":[53.5450,-2.6318],"preston":[53.7632,-2.7031],"blackburn":[53.7486,-2.4875],"york":[53.9600,-1.0873],"wakefield":[53.6830,-1.4977],"walsall":[52.5862,-1.9829],"west bromwich":[52.5187,-1.9945],"telford":[52.6784,-2.4453],"gloucester":[51.8642,-2.2382],"exeter":[50.7184,-3.5339],"dundee":[56.4620,-2.9707],"swansea":[51.6214,-3.9436],"bedford":[52.1356,-0.4685],"stevenage":[51.9038,-0.1966],"chatham":[51.3800,0.5290],"gillingham":[51.3890,0.5486]};
function townPoint(loc) { const k = String(loc || '').toLowerCase().replace(/,?\s*uk$/, '').trim(); return TOWNS[k] || null; }
const inUk = (lat, lng) => lat > 49.8 && lat < 60.95 && lng > -8.7 && lng < 1.8;
async function writeUp(c, keepDesc) {
  const fallback = { short: String(c.desc || '').slice(0, 150), long: c.desc || '', tags: [] };
  let out = fallback, aiPoint = null;
  try {
    const settings = await core.getSettings();
    const r = await gen.callModel([{ role: 'system', content:
`You write business listings for the Auntie Tobi directory of Nigerian and African businesses in the UK.
Use ONLY the facts given (their own website text first, then the notes). Never invent prices, awards, years, products, areas covered or claims. Plain, warm British English, third person, no hype words ("best", "No.1", "amazing"), no emojis, no contact details in the text.
Return ONLY JSON: {"short":"one sentence, max 150 characters, what they offer and where","long":"60–120 words in 1–2 short paragraphs: what they offer, who it is for, what makes them handy, where they are based / cover — only if stated","tags":["3–6 short search words people would type, e.g. jollof, small chops, party trays"],"lat":0,"lng":0}
lat/lng = the approximate centre of their UK town or area (0 if unsure).` },
    { role: 'user', content: `Business: ${c.name}\nCategory: ${c.cat}\nTown: ${c.loc || 'UK'}\nNotes: ${c.desc || ''}\nTheir website text: ${c.siteText || '(none)'}` }], 700, settings, { json: true, raw: true, timeoutMs: 15000 });
    gen.addGlobal(core.monthKey(), { cost: 0, inTok: r.inTok, outTok: r.outTok, costUsd: r.costUsd }, settings).catch(() => {});
    const j = JSON.parse(String(r.text).replace(/^```(?:json)?\s*|\s*```$/g, ''));
    out = { short: core.cleanText(j.short, 160) || fallback.short, long: String(j.long || '').replace(/\r/g, '').trim().slice(0, 1200) || fallback.long,
      tags: (Array.isArray(j.tags) ? j.tags : []).map(t => core.cleanText(t, 40).replace(/,/g, '')).filter(Boolean).slice(0, 6) };
    if (inUk(+j.lat, +j.lng)) aiPoint = [Math.round(+j.lat * 1e4) / 1e4, Math.round(+j.lng * 1e4) / 1e4];
  } catch (_) { out = fallback; }
  if (keepDesc) out.long = keepDesc;   // you rewrote the description yourself: keep your words
  const pt = townPoint(c.loc) || aiPoint;
  return Object.assign(out, pt ? { lat: pt[0], lng: pt[1] } : {});
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
async function waiting() { return (await bizdir.all()).filter(b => b.src === 'hq' && !b.hidden && b.status !== 'pending' && !b.uploadedAt); }
// The website's CSV import needs a phone number: use their phone, or their WhatsApp number when there's no phone
const phoneFor = b => b.phone || (b.wa ? '+' + String(b.wa).replace(/\D/g, '') : '');
async function toUpload() { return (await waiting()).filter(b => phoneFor(b)); }
async function needPhone() { return (await waiting()).filter(b => !phoneFor(b)).map(b => ({ slug: b.slug, name: b.name })); }
async function exportCsv() {
  const rows = (await toUpload()).map(b => {
    const short = b.short || String(b.desc || '').slice(0, 160), tags = (b.tags || []).join(', '), cat = (b.cats && b.cats[0]) || CATS.find(c => childCat(c) === String(b.cat || '').toLowerCase()) || '';
    const v = { name: b.name, slug: b.slug, images: b.img || '', tags, seoKeywords: tags, location_latitude: b.lat != null ? b.lat : '', location_longitude: b.lng != null ? b.lng : '', description: short, detailedDescription: b.desc, categories: cat, mainLink: b.website, status: 'PUBLISHED', isFeatured: 'false',
      exemptFromAutomation: 'false', contact_name: b.ownerName || 'Auntie Tobi', location_address: b.addr || ((b.loc && b.loc !== 'UK' ? b.loc + ', ' : '') + 'UK'),
      business_phone: phoneFor(b), business_email: b.email, socialMedia_instagram: b.ig ? 'https://www.instagram.com/' + b.ig + '/' : '', socialMedia_facebook: b.fb || '', socialMedia_tiktok: b.tt || '', seoTitle: b.name, seoDescription: short, focusKeyword: b.name.toLowerCase(),
      ogTitle: b.name, ogDescription: short, twitterTitle: b.name, twitterDescription: short, twitterCard: 'summary_large_image', noIndex: 'false', noFollow: 'true', schemaType: 'LocalBusiness', 'custom_Whatsapp Link': b.wa ? 'https://wa.me/' + b.wa : '' };
    return HEAD.map(h => cell(v[h] || '')).join(',');
  });
  return { csv: '\uFEFF' + HEAD.join(',') + '\n' + rows.join('\n') + (rows.length ? '\n' : ''), count: rows.length, needPhone: await needPhone() };
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
  return { items: s.items, queue: (s.queue || []).length, lastRun: s.lastRun || '', approvedThisWeek, target: 50, cats: CATS, toUpload: (await toUpload()).length, needPhone: (await needPhone()).length };
}

module.exports = { readSite, pictureFor, CATS, runOne, work, more, ensureWeek, quickAdd, decide, neverAdd, exportCsv, markUploaded, summary, weekOf };
