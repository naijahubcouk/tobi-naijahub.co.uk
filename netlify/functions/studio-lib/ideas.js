'use strict';
/*
 * ✨ HQ → Weekly ideas (admin only): a few post ideas for each day, built on Auntie Tobi's own weekly themes and on
 * real things from this week (events, businesses, marketplace, UK posts, dates that matter). Never repeats what's
 * already been posted or planned. Nothing is posted — "Keep" puts the idea on the Board and the Calendar.
 *
 *   hq/ideas/cfg         { days: { mon: [series…], … }, perDay }       (Auntie Tobi's themes; editable in HQ)
 *   hq/ideas/w-<monday>  { days: { mon: [idea…], … }, at }             (one week of ideas)
 *   hq/ideas/stats       { kept: {series: n}, skipped: {series: n}, used: {series: lastDay} }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas, cleanText } = core;
const gen = require('./generate');

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAME = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const multi = (s, n) => String(s || '').replace(/\r/g, '').trim().slice(0, n);

// Auntie Tobi's weekly plan (Nov 2026). The ones marked ✨ are extra suggestions — delete them in HQ if not wanted.
// 📣 promoting Auntie Tobi itself: the app, Business Club, Marketplace and new features (added Nov 2026)
const PROMO = {"mon": "📲 Auntie Tobi app — what it can do for you", "tue": "💚 My Plan in the Auntie Tobi app — bills, birthdays & shopping", "wed": "🆕 New on Auntie Tobi — feature spotlight", "thu": "🛍️ Shop the Auntie Tobi Marketplace", "fri": "🤝 Join the Auntie Tobi Business Club", "sat": "🏪 List your business free on Auntie Tobi", "sun": "📰 Get Auntie Tobi’s Sunday Update (free)"};
const DEFAULT_DAYS = {
  mon: { theme: 'Opportunities & New Week', series: ['💼 Job / career blog', '💼 Sponsored Jobs This Week — UK jobs & opportunities', '☕ Monday Check-In', '💚 Monday Motivation', '🚨 Opportunity of the Week (value carousel)', '🔎 Help Me Find It', '💚 Nigerian Business of the Week (discovery carousel / Reel)', '🛍 Monday conversation', '🩳 Nigerians in [UK city] recommend', '✅ Promote a business', '📱 Tweets', '📲 Auntie Tobi app — what it can do for you'] },
  tue: { theme: 'Family & Everyday Life', series: ['🇳🇬 Nigerians Share', '📍 Family Finds', '🛍️ Business engagement series', '💬 Parents, Let’s Talk', '🛒 Marketplace product / service', '🈺️ Nigerians in [city], recommend ONE business', '✔️ Family blog', '✔️ Housing blog', '💚 My Plan in the Auntie Tobi app — bills, birthdays & shopping'] },
  wed: { theme: 'UK Life & Community Help', series: ['🔎 Help Me Find It 👀📍', '👀 From the Comments', '🇬🇧 UK Life Explained', '💼 Opportunity of the Week', '🎯 Tag a Nigerian UK business', '🤝 Nigerians Help Nigerians (advice thread)', '💬 Midweek Gist', '✅ Promote a business', '✔️ Lifestyle', '✔️ Did you know', '✔️ Travel', '✨ This or That poll (Story)', '🆕 New on Auntie Tobi — feature spotlight'] },
  thu: { theme: 'Money & Marketplace', series: ['💚 Value post', '🛍️ What Can £20 Get You? (business discovery carousel)', '🔥 Business Support', '🔎 Help Me Find It', '🍚 Naija Food Finds', '📄 Tweets', '✅ What would you advise?', '✔️ Money blog', '✨ Deal / money-saving tip of the week', '🛍️ Shop the Auntie Tobi Marketplace'] },
  fri: { theme: 'Weekend', series: ['📍 Nigerians in [city] recommended these businesses (discovery carousel)', '🙌🏾 Business Win of the Week', '🎉 Friday Check-In', '💚 Friday Reminder — Auntie Tobi Says', '✔️ Business blog', '✨ Weekend events round-up', '✨ Naija humour — relatable moment (Reel)', '🤝 Join the Auntie Tobi Business Club'] },
  sat: { theme: 'Opportunities & Community Discovery', series: ['📌 Save This UK Guide (evergreen carousel)', '🎯 Verified Opportunity', '🇳🇬 Nigerian Business or Place of the Week', '📸 Show Us What You Sell', '👨‍👩‍👧 UK Family Series', '💚 It’s Giving Time / Community Kindness', '✔️ Health blog', '✔️ Education blog', '✨ Behind the business (Reel)', '🏪 List your business free on Auntie Tobi'] },
  sun: { theme: 'Week Update, Kindness, Categories & Reflection', series: ['📰 7 UK Updates You May Have Missed This Week', '🙏 Sunday faith stories', '📍 Nigerian [Category] Businesses in the UK — Pt X', '🤝 Business Owners, Introduce Yourself', '💬 Sunday Community Question', '💚 Auntie Tobi Says', '✔️ Food blog', '📰 Get Auntie Tobi’s Sunday Update (free)'] },
};

const DEFAULT_NEWS = [
  'Auntie Tobi app (auntietobi.co.uk) — free, no download needed: add it to your home screen. Ask Auntie Tobi anything about UK life; find Nigerian businesses near you; events; UK news explained; Marketplace.',
  'My Plan (in the app): reminders for bills, appointments and to-dos; a morning email only on days something is due; UK life dates (passport, eVisa, MOT, car insurance, tax return).',
  'Celebrations (in My Plan): never miss a birthday — countdown, birthday messages in English, Pidgin, Yoruba, Igbo or Hausa, gift ideas, a birthday card, and a link friends use to add their own birthday.',
  'Shopping list (in My Plan): a ready list of Naija and everyday items to tick off.',
  'Sunday Update: free weekly email every Sunday morning — UK updates for Nigerians, events, Nigerian businesses, deals and a tip of the week. Sign up at auntietobi.co.uk/sunday-update',
  'Marketplace: products and services from Nigerian businesses in the UK — auntietobi.co.uk/marketplace (listing is for Business Club members).',
  'Business Club: £50 a year (about £4.17 a month) for Nigerian businesses in the UK — business spotlight, one paid Instagram group advert, Marketplace visibility, full Business Studio with 20 daily AI credits, growth lessons, templates, monthly resources and check-ins. Join at auntietobi.co.uk/business-club',
  'List your business free: auntietobi.co.uk/add-business — takes about 2 minutes. Already listed? Claim it free from the business page.',
  'Free Instagram check for business owners: a score out of 100 with clear fixes — auntietobi.co.uk/instagram-check',
].join('\n');
async function cfg() {
  const c = (await getJson('hq/ideas/cfg').catch(() => null)) || {};
  const days = {};
  DAYS.forEach(d => { const x = (c.days && c.days[d]) || DEFAULT_DAYS[d]; days[d] = { theme: cleanText(x.theme, 80) || DEFAULT_DAYS[d].theme, series: (Array.isArray(x.series) ? x.series : []).map(s => cleanText(s, 120)).filter(Boolean).slice(0, 30) }; });
  // one-time: add the 📣 promo series to themes saved before they existed
  if (c.days && !c.promo1) { DAYS.forEach(d => { if (!days[d].series.includes(PROMO[d])) days[d].series.push(PROMO[d]); }); await setJson('hq/ideas/cfg', Object.assign({}, c, { days, promo1: true })).catch(() => {}); }
  return { days, perDay: c.perDay === undefined || c.perDayV2 === undefined ? 0 : Math.max(0, Math.min(6, Number(c.perDay) || 0)), news: typeof c.news === 'string' && c.news.trim() ? c.news : DEFAULT_NEWS };
}
async function saveCfg(raw, who) {
  const days = {};
  DAYS.forEach(d => { const x = (raw && raw.days && raw.days[d]) || {}; days[d] = { theme: cleanText(x.theme, 80) || DEFAULT_DAYS[d].theme, series: (Array.isArray(x.series) ? x.series : String(x.series || '').split('\n')).map(s => cleanText(s, 120)).filter(Boolean).slice(0, 30) }; });
  await setJson('hq/ideas/cfg', { days, perDay: Math.max(0, Math.min(6, Number(raw && raw.perDay) || 0)), perDayV2: true, news: String((raw && raw.news) || '').replace(/\r/g, '').trim().slice(0, 6000), promo1: true, at: core.nowIso(), by: who });
  return cfg();
}

// Monday of the week (London) for a date, and the 7 dates
const addDays = (s, n) => { const t = new Date(s + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
function monday(day) { const t = new Date((day || core.dayKey()) + 'T12:00:00Z'); const dow = (t.getUTCDay() + 6) % 7; return addDays(t.toISOString().slice(0, 10), -dow); }
const dateOf = (mon, d) => addDays(mon, DAYS.indexOf(d));

// dates that matter for Nigerians in the UK
function datesNear(day) {
  const y = +day.slice(0, 4), out = [];
  const fixed = [['01-01', 'New Year’s Day'], ['02-14', 'Valentine’s Day'], ['03-08', 'International Women’s Day'], ['05-27', 'Children’s Day (Nigeria)'], ['06-12', 'Democracy Day (Nigeria)'], ['10-01', 'Nigerian Independence Day'], ['10-31', 'Halloween / end of Black History Month'], ['11-05', 'Bonfire Night'], ['12-24', 'Christmas Eve'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day'], ['12-31', 'New Year’s Eve']];
  fixed.forEach(([md, n]) => [y, y + 1].forEach(yy => out.push([`${yy}-${md}`, n])));
  // Black Friday (4th Friday of November) and Cyber Monday; Mother's Day UK (3 weeks before Easter — skipped); payday = last weekday of the month
  [y, y + 1].forEach(yy => { const t = new Date(Date.UTC(yy, 10, 1)); let f = 0; while (true) { if (t.getUTCDay() === 5 && ++f === 4) break; t.setUTCDate(t.getUTCDate() + 1); } const bf = t.toISOString().slice(0, 10); out.push([bf, 'Black Friday'], [addDays(bf, 3), 'Cyber Monday']); });
  for (let m = 0; m < 14; m++) { const yy = y + Math.floor(m / 12), mm = m % 12; const t = new Date(Date.UTC(yy, mm + 1, 0)); while ([0, 6].includes(t.getUTCDay())) t.setUTCDate(t.getUTCDate() - 1); out.push([t.toISOString().slice(0, 10), 'Payday for many (last working day of the month)']); }
  return out.filter(([d]) => d >= addDays(day, -1) && d <= addDays(day, 10)).sort((a, b) => a[0].localeCompare(b[0]));
}

// real things to build ideas on
async function context(mon) {
  const o = await require('./sunday').options(addDays(mon, 6)).catch(() => ({ posts: [], events: [], bizes: [], prods: [] }));
  const all = await require('./bizdir').all().catch(() => []);
  const fresh = all.filter(b => !b.hidden && b.status !== 'pending').sort((a, b) => String(b.createdAt || b.updatedAt || '').localeCompare(String(a.createdAt || a.updatedAt || ''))).slice(0, 12);
  const cities = {}; all.forEach(b => { const c = String(b.loc || '').split(',')[0].trim(); if (c && c !== 'UK' && c !== 'United Kingdom') cities[c] = (cities[c] || 0) + 1; });
  return {
    events: o.events.slice(0, 10).map(e => `${e.title} — ${e.date}${e.loc ? ', ' + e.loc : ''}`),
    featured: o.bizes.slice(0, 10).map(b => `${b.name} (${b.cat}${b.loc ? ', ' + b.loc : ''})`),
    newBiz: fresh.map(b => `${b.name} (${b.cat || ''}${b.loc ? ', ' + String(b.loc).split(',')[0] : ''})`),
    products: o.prods.slice(0, 8).map(p => `${p.name}${p.price ? ' — ' + p.price : ''}${p.business ? ' by ' + p.business : ''}`),
    articles: o.posts.slice(0, 10).map(p => `${p.title}: ${p.summary}`),
    cities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]),
  };
}

// titles to avoid: posted, on the Board, and ideas from the last 4 weeks
async function avoidList(mon) {
  const items = await require('./hq').list().catch(() => []);
  const t = items.filter(c => c.status !== 'archived').sort((a, b) => String(b.postedAt || b.updatedAt || '').localeCompare(String(a.postedAt || a.updatedAt || ''))).slice(0, 120).map(c => c.title);
  for (let w = 1; w <= 4; w++) { const old = await getJson(`hq/ideas/w-${addDays(mon, -7 * w)}`).catch(() => null); if (old) DAYS.forEach(d => (old.days[d] || []).forEach(i => t.push(i.title))); }
  const cur = await getJson(`hq/ideas/w-${mon}`).catch(() => null); if (cur) DAYS.forEach(d => (cur.days[d] || []).forEach(i => t.push(i.title)));
  return [...new Set(t.filter(Boolean))];
}
const words = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9£ ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !/^(the|and|for|you|your|with|this|that|uk|nigerian|nigerians|auntie|tobi|week|our)$/.test(w)));
function tooClose(a, list) { const A = words(a); if (!A.size) return false; return list.some(b => { const B = words(b); if (!B.size) return false; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size) >= 0.7; }); }

// pick which series to use for a day: the ones used longest ago first, nudged by what she keeps
function pickSeries(list, n, stats, skip) {
  const used = stats.used || {}, kept = stats.kept || {}, skipped = stats.skipped || {};
  return list.filter(s => !(skip || []).includes(s)).map((s, i) => ({ s, score: (used[s] ? Date.parse(used[s]) / 864e5 : 0) - (kept[s] || 0) * 2 + (skipped[s] || 0) * 3 + i * 0.01 }))
    .sort((a, b) => a.score - b.score).slice(0, n).map(x => x.s);
}

async function write(day, date, theme, series, ctx, avoid, stats, n, news) {
  const settings = await core.getSettings();
  const likes = Object.entries(stats.kept || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]).join('; ');
  const dislikes = Object.entries(stats.skipped || {}).filter(([k, v]) => v >= 2 && v > ((stats.kept || {})[k] || 0)).slice(0, 6).map(x => x[0]).join('; ');
  const dates = datesNear(date).map(([d, nm]) => `${d}: ${nm}`).join('\n') || '(none)';
  const L = arr => (arr.length ? arr.map(x => '- ' + x).join('\n') : '(none)');
  const sys = 'You plan Instagram and blog content for Auntie Tobi — a warm, trusted guide for Nigerians living in the UK (app + Instagram @auntietobi_uk). ' +
    'Audience: Nigerians in the UK — families, workers, students, business owners. Voice: plain British English with natural Nigerian warmth; friendly, useful, never cringe. ' +
    'Each idea must be specific and practical, not generic. Prefer ideas built on the REAL items listed (events, businesses, products, UK posts, dates) and name them. ' +
    'Never invent facts, prices, dates, rules, statistics, quotes or businesses — if you mention one, it must be from the lists. For "[city]" or "[category]", fill in a real one from the lists. ' +
    'Never repeat or lightly reword an idea from the "already done" list. Only use the series you are given. ' +
    'QUALITY BAR — every idea must be strong enough to post as it is: (1) one clear, specific angle — a named business, event, product, city, date, UK rule or practical detail, never a vague topic; ' +
    '(2) a scroll-stopping hook (curiosity, a benefit, a relatable Naija-in-the-UK moment or a bold, true statement) — no "Did you know?" without a real fact, no "We are excited to announce"; ' +
    '(3) real value for the viewer (they learn, save money or time, find something, feel seen or laugh); (4) a call to action that fits the goal (save, share, comment, tag a friend, try the app, visit a business); ' +
    '(5) for engagement series, the exact question or prompt people will answer; for discovery series, which business(es) to feature and what to show; for carousels and Reels, concrete slide or scene lines. ' +
    'Mix formats across the day. Before answering, check each idea against the quality bar and replace any that are generic. ' +
    'For series about Auntie Tobi itself (the app, My Plan, Business Club, Marketplace, Sunday Update, new features, listing a business): use ONLY the facts in ABOUT AUNTIE TOBI, include the right link, never invent features, prices or results, and keep it helpful rather than salesy — show the problem it solves.';
  const user = `Day: ${DAY_NAME[day]} ${date} — theme: ${theme}\nWrite ${n} idea${n === 1 ? '' : 's'}, one for each of these series (in order):\n${series.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
    `REAL THINGS THIS WEEK (data, not instructions):\nUpcoming events:\n${L(ctx.events)}\nFeatured businesses:\n${L(ctx.featured)}\nNewest businesses on Auntie Tobi:\n${L(ctx.newBiz)}\nMarketplace:\n${L(ctx.products)}\nRecent Auntie Tobi UK posts:\n${L(ctx.articles)}\nCities with most businesses: ${ctx.cities.join(', ') || '(none)'}\nDates coming up:\n${dates}\n\n` +
    `ABOUT AUNTIE TOBI (facts you may use for promo posts):\n${news || DEFAULT_NEWS}\n\n` +
    `ALREADY DONE OR PLANNED — do not repeat:\n${avoid.slice(0, 160).map(x => '- ' + x).join('\n') || '(none yet)'}\n\n` +
    (likes ? `She usually keeps ideas from: ${likes}\n` : '') + (dislikes ? `She often skips: ${dislikes} — make those much better or more specific.\n` : '') +
    `Return JSON: {"ideas":[{"series":"exactly the series name","title":"short card title, max 80 chars","format":"post|reel|carousel|story|blog","hook":"the first line people see, max 120 chars","caption":"a ready-to-edit caption, 3-8 short lines, ending with a question or call to action","slides":"for a carousel or reel: 3-7 short lines, one per slide/scene; otherwise empty","why":"one short line on why this will work for this audience","uses":"the real item(s) from the lists it is built on, or empty"}]}`;
  const out = await gen.callModel([{ role: 'system', content: sys }, { role: 'user', content: user }], 450 * n + 400, settings, { json: true, raw: true, timeoutMs: 24000, temperature: 0.85, effort: 'low' });
  gen.addGlobal(core.monthKey(), { id: 'ideas', tool: 'hq-ideas', cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j; try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_bad', 'The ideas came back muddled — please try again.'); }
  const FMT = ['post', 'reel', 'carousel', 'story', 'blog'];
  return (Array.isArray(j.ideas) ? j.ideas : []).map((x, i) => ({
    id: 'i' + crypto.randomBytes(6).toString('hex'), series: series.includes(x.series) ? x.series : (series[i] || series[0]),
    title: cleanText(x.title, 90), format: FMT.includes(x.format) ? x.format : (/blog/i.test(series[i] || '') ? 'blog' : 'post'),
    hook: cleanText(x.hook, 160), caption: multi(x.caption, 1500), slides: multi(x.slides, 1200), why: cleanText(x.why, 200), uses: cleanText(x.uses, 200), state: 'new',
  })).filter(x => x.title && x.hook && !tooClose(x.title + ' ' + x.hook, avoid))
    .filter((x, i, arr) => !tooClose(x.title + ' ' + x.hook, arr.slice(0, i).map(y => y.title + ' ' + y.hook)));   // no two alike on the same day
}

// make (or remake) one day's ideas — an idea for EVERY series of the day (or a few, if a number is set in Themes).
// Done in small parts so each call stays quick: part 0 clears the not-kept ideas, then each part writes up to 4.
const BATCH = 4;
async function makeDay(mon, day, who, part) {
  if (!DAYS.includes(day)) throw new HttpError(400, 'invalid', 'Pick a day.');
  part = Math.max(0, Number(part) || 0);
  const c = await cfg(), dd = c.days[day], date = dateOf(mon, day);
  if (!dd.series.length) throw new HttpError(400, 'no_series', `Add some series for ${DAY_NAME[day]} first (⚙️ Themes).`);
  const stats = (await getJson('hq/ideas/stats').catch(() => null)) || {};
  const cur = (await getJson(`hq/ideas/w-${mon}`).catch(() => null)) || { days: {} };
  const keep = (cur.days[day] || []).filter(i => i.state === 'kept');
  if (part === 0) await cas(`hq/ideas/w-${mon}`, w => { w = w || { days: {} }; w.days[day] = keep; return w; });
  // which series to fill
  let todo;
  if (c.perDay > 0) {
    const want = Math.max(1, c.perDay - keep.length), promo = dd.series.find(x => Object.values(PROMO).includes(x) && !keep.some(k => k.series === x));
    todo = promo ? [promo].concat(pickSeries(dd.series, want - 1, stats, keep.map(i => i.series).concat(promo))) : pickSeries(dd.series, want, stats, keep.map(i => i.series));
    if (part > 0) return Object.assign(await week(mon), { done: true });
  } else todo = dd.series.filter(x => !keep.some(k => k.series === x));
  const series = c.perDay > 0 ? todo : todo.slice(part * BATCH, part * BATCH + BATCH);
  const done = c.perDay > 0 || (part + 1) * BATCH >= todo.length;
  if (!series.length) return Object.assign(await week(mon), { done: true });
  const ctx = await context(mon), avoid = await avoidList(mon);
  const ideas = await write(day, date, dd.theme, series, ctx, avoid, stats, series.length, c.news);
  const now = core.nowIso();
  await cas(`hq/ideas/w-${mon}`, w => { w = w || { days: {} }; w.days[day] = (w.days[day] || []).concat(ideas); w.at = now; w.by = who; return w; });
  await cas('hq/ideas/stats', s => { s = s || {}; s.used = s.used || {}; ideas.forEach(i => { s.used[i.series] = now; }); return s; });
  return Object.assign(await week(mon), { done, part, parts: c.perDay > 0 ? 1 : Math.max(1, Math.ceil(todo.length / BATCH)) });
}
// swap one idea for a fresh one (same series)
async function swap(mon, day, id, who) {
  const w = await getJson(`hq/ideas/w-${mon}`); const it = w && (w.days[day] || []).find(i => i.id === id);
  if (!it) throw new HttpError(404, 'not_found', 'That idea has gone — refresh.');
  const c = await cfg(), stats = (await getJson('hq/ideas/stats').catch(() => null)) || {};
  const avoid = (await avoidList(mon)).concat([it.title]);
  const fresh = (await write(day, dateOf(mon, day), c.days[day].theme, [it.series], await context(mon), avoid, stats, 1, c.news))[0];
  if (!fresh) throw new HttpError(502, 'ai_empty', 'Couldn’t find a better one just now — try again.');
  await cas(`hq/ideas/w-${mon}`, x => { x.days[day] = x.days[day].map(i => (i.id === id ? fresh : i)); return x; });
  await cas('hq/ideas/stats', s => { s = s || {}; s.skipped = s.skipped || {}; s.skipped[it.series] = (s.skipped[it.series] || 0) + 1; return s; });
  return week(mon);
}
// keep → a card on the Board, planned for that day (shows on the Calendar); skip → gone
const TOPIC = s => (/auntie tobi|business club|my plan|sunday update|list your business/i.test(s) ? 'promo' : /discover|business|recommend|tag a|introduce|show us what|win of|place of|food finds|£20/i.test(s) ? 'discovery' : /job|opportunit|uk life|guide|update|did you know|explained|money|housing|health|education|travel/i.test(s) ? 'uk-info' : /marketplace|promote|sponsored|deal/i.test(s) ? 'promo' : /event|weekend/i.test(s) ? 'event' : /motivation|auntie tobi says|reminder|faith|kindness|giving/i.test(s) ? 'motivation' : 'community');
async function act(mon, day, id, what, who) {
  const w = await getJson(`hq/ideas/w-${mon}`); const it = w && (w.days[day] || []).find(i => i.id === id);
  if (!it) throw new HttpError(404, 'not_found', 'That idea has gone — refresh.');
  if (what === 'keep') {
    const card = await require('./hq').save({ title: it.title, type: it.format, topic: TOPIC(it.series), caption: it.caption, script: [it.hook, it.slides].filter(Boolean).join('\n\n'),
      notes: `✨ Weekly ideas · ${it.series}\nWhy: ${it.why}${it.uses ? `\nBuilt on: ${it.uses}` : ''}`, planDate: dateOf(mon, day), status: 'scheduled' }, who);
    await cas(`hq/ideas/w-${mon}`, x => { x.days[day] = x.days[day].map(i => (i.id === id ? Object.assign({}, i, { state: 'kept', cardId: card.id }) : i)); return x; });
    await cas('hq/ideas/stats', s => { s = s || {}; s.kept = s.kept || {}; s.kept[it.series] = (s.kept[it.series] || 0) + 1; return s; });
  } else if (what === 'skip') {
    await cas(`hq/ideas/w-${mon}`, x => { x.days[day] = x.days[day].filter(i => i.id !== id); return x; });
    await cas('hq/ideas/stats', s => { s = s || {}; s.skipped = s.skipped || {}; s.skipped[it.series] = (s.skipped[it.series] || 0) + 1; return s; });
  } else throw new HttpError(400, 'invalid', 'Unknown action.');
  return week(mon);
}
async function week(mon) {
  const w = (await getJson(`hq/ideas/w-${mon}`).catch(() => null)) || { days: {} };
  // kept ideas → where the Board card is now (moved forward / posted)
  const cards = {}; (await require('./hq').list().catch(() => [])).forEach(k => { cards[k.id] = k; });
  DAYS.forEach(d => (w.days[d] || []).forEach(i => { const k = i.cardId && cards[i.cardId]; if (k) { i.board = { planDate: k.planDate || '', status: k.status, carriedFrom: k.carriedFrom || '' }; } else if (i.state === 'kept') i.board = { gone: true }; }));
  const c = await cfg();
  return { monday: mon, dates: Object.fromEntries(DAYS.map(d => [d, dateOf(mon, d)])), days: Object.fromEntries(DAYS.map(d => [d, w.days[d] || []])), cfg: c, at: w.at || '' };
}

module.exports = { monday, week, makeDay, swap, act, cfg, saveCfg, DEFAULT_DAYS, datesNear, tooClose };
