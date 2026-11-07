'use strict';
/*
 * 📨 DM Outreach (HQ → Instagram Growth): cold DMs sent BY HAND from your marketing pages, tracked here.
 * HQ never sends anything — it prepares each page's people and message, you tap send in Instagram, then ✓ Sent.
 *   dm/pages   { items: [{ id, name, handle, perDay, on }] }
 *   dm/tpl     { versions: [{ id, text, page }], followup, fuDays }
 *   dm/people  { items: { <username>: { stage, page, ver, source, addedAt, sentAt, fuAt, fuSent, repliedAt, followedAt, notes, log: [{ at, what }] } } }
 *   dm/day     { day, sent: { <pageId>: n } }
 *   dm/share   { url, title, day, perPage }   📣 "share this post" for one day: each page messages up to perPage (10) people with the post link
 * Messages can use {name}, and {post} / {title} for the post being shared (removed when nothing is being shared).
 * Stages: new → messaged → replied → followed | notinterested | dnc (do not contact — never added again)
 */
const core = require('./core');
const { HttpError, getJson, cas } = core;

const STAGES = ['new', 'messaged', 'replied', 'followed', 'notinterested', 'dnc'];
const DEF_VERSIONS = [
  'Hi {name} 👋🏾 We share things for Nigerians living in the UK, and our partner page @auntietobi_uk has free, simple guides on council tax, NHS, jobs and sending money home. Worth a follow! 💚 Which city are you in?',
  'Hey {name}! If you’re Naija and in the UK, check out @auntietobi_uk 🇳🇬🇬🇧 Everyday UK help, events and Nigerian businesses near you — all free. Are you new here or been here a while?',
  'Hi {name} 😊 Quick tip — did you know you might be paying too much council tax? @auntietobi_uk (a page we work with) explains things like this for Nigerians in the UK. Have a look! 💚',
  'Hello {name} 👋🏾 Love your page! Thought you’d like @auntietobi_uk — our partner page with UK tips, Naija events and businesses for Nigerians here. Free to follow 💚',
  'Hey {name}! Looking for Nigerian food, hair, events or help with UK life? @auntietobi_uk puts it all in one place 🇳🇬 Give them a follow — you’ll love it 💚',
];
// 📣 when a post is being shared: different wording for each page, so the messages don't all look the same
const SHARE_VERSIONS = [
  'Hi {name} 👋🏾 Thought you’d like this from @auntietobi_uk — {title} 💚 {post}',
  'Hey {name}! Have you seen this? 🇳🇬 {title} 👉🏾 {post} (from @auntietobi_uk, a page for Nigerians in the UK)',
  'Hello {name} 😊 Sharing this in case it’s useful: {title} {post}',
  'Hi {name}! If you’re Naija in the UK, you’ll like this post from @auntietobi_uk 💚 {post}',
  'Hey {name} 👋🏾 New from @auntietobi_uk: {title}. Have a look — and pass it on to a friend if you like it 💚 {post}',
];
const DEF_FU = 'Hi {name}, just checking you saw our message 😊 No pressure — @auntietobi_uk is there whenever you need UK tips. Have a lovely week! 💚';
const clean = u => String(u || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').toLowerCase();
const valid = u => /^[a-z0-9._]{2,30}$/.test(u) && !/^\d+$/.test(u);
const day = () => core.dayKey();
const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function pages() { return ((await getJson('dm/pages').catch(() => null)) || { items: [] }).items; }
async function tpl() {
  const t = (await getJson('dm/tpl').catch(() => null)) || {};
  return { versions: t.versions && t.versions.length ? t.versions : DEF_VERSIONS.map((text, i) => ({ id: 'v' + (i + 1), text, page: '' })), followup: t.followup || DEF_FU, fuDays: t.fuDays || 3 };
}
async function share() { const x = await getJson('dm/share').catch(() => null); return x && x.day === day() && x.url ? x : null; }
async function setShare(raw) {
  const url = String((raw && raw.url) || '').trim().replace(/[?#].*$/, '');
  if (!/^https:\/\/(www\.)?instagram\.com\//i.test(url)) throw new HttpError(400, 'invalid', 'Add the Instagram post link first.');
  const x = { url, title: core.cleanText(raw.title, 120) || 'our new post', day: day(), perPage: Math.max(1, Math.min(20, parseInt(raw.perPage, 10) || 10)), at: core.nowIso() };
  await core.setJson('dm/share', x);
  return x;
}
async function stopShare() { await core.setJson('dm/share', { day: '' }); return null; }
const fill = (t, u, sh) => String(t).replace(/\{name\}/g, u).replace(/\{post\}/g, sh ? sh.url : '').replace(/\{title\}/g, sh ? sh.title : '').replace(/[ \t]+\n/g, '\n').replace(/\s{2,}/g, ' ').trim();
async function people() { return ((await getJson('dm/people').catch(() => null)) || { items: {} }).items; }
async function sentToday() { const d = (await getJson('dm/day').catch(() => null)) || {}; return d.day === day() ? d.sent || {} : {}; }

// ── pages & messages (settings) ──
async function savePages(list) {
  if (!Array.isArray(list)) throw new HttpError(400, 'invalid', 'Nothing to save.');
  const items = list.slice(0, 20).map((p, i) => ({ id: /^p[a-z0-9]{2,12}$/.test(p.id || '') ? p.id : 'p' + Date.now().toString(36) + i, name: core.cleanText(p.name, 60), handle: clean(p.handle), perDay: Math.max(1, Math.min(60, parseInt(p.perDay, 10) || 20)), on: p.on !== false })).filter(p => p.name || p.handle);
  await core.setJson('dm/pages', { items });
  return items;
}
async function saveTpl(raw) {
  const versions = (Array.isArray(raw.versions) ? raw.versions : []).map((v, i) => ({ id: /^v[a-z0-9]{1,12}$/.test(v.id || '') ? v.id : 'v' + Date.now().toString(36) + i, text: String(v.text || '').replace(/\r/g, '').trim().slice(0, 1000), page: String(v.page || '') })).filter(v => v.text.length > 5).slice(0, 12);
  if (!versions.length) throw new HttpError(400, 'invalid', 'Add at least one message.');
  await core.setJson('dm/tpl', { versions, followup: String(raw.followup || DEF_FU).trim().slice(0, 1000), fuDays: Math.max(1, Math.min(30, parseInt(raw.fuDays, 10) || 3)) });
  return tpl();
}

// ── people ──
async function add(usernames, source) {
  const list = [...new Set((Array.isArray(usernames) ? usernames : String(usernames || '').split(/[\s,;]+/)).map(clean).filter(valid))].slice(0, 1000);
  let added = 0, already = 0, blocked = 0;
  await cas('dm/people', cur => {
    cur = cur || { items: {} };
    for (const u of list) {
      const r = cur.items[u];
      if (r) { if (r.stage === 'dnc') blocked++; else already++; continue; }
      cur.items[u] = { stage: 'new', source: core.cleanText(source, 80), addedAt: core.nowIso(), log: [] }; added++;
    }
    return cur;
  });
  return { added, already, blocked, total: list.length };
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// Today's work for every page: new people (up to its daily limit) + follow-ups that are due.
async function today() {
  const [P, T, items, sent, sh] = [await pages(), await tpl(), await people(), await sentToday(), await share()];
  const d = day(), live = P.filter(p => p.on);
  const fresh = Object.keys(items).filter(u => items[u].stage === 'new').sort((a, b) => String(items[a].addedAt).localeCompare(String(items[b].addedAt)));
  const out = {}; let k = 0;
  for (const p of live) out[p.id] = { page: p, sent: sent[p.id] || 0, room: Math.max(0, (sh ? Math.max(p.perDay, sh.perPage) : p.perDay) - (sent[p.id] || 0)), todo: [], followups: [] };
  // share new people across pages, in turn, each up to its room
  let progress = true;
  while (fresh[k] && progress) {
    progress = false;
    for (const p of live) { const o = out[p.id]; if (fresh[k] && o.todo.length < o.room) { o.todo.push(fresh[k++]); progress = true; } }
  }
  for (const u of Object.keys(items)) {
    const r = items[u];
    if (r.stage === 'messaged' && !r.fuSent && r.sentAt && addDays(r.sentAt.slice(0, 10), T.fuDays) <= d && out[r.page]) out[r.page].followups.push(u);
  }
  const pageNo = {}; live.forEach((p, i) => { pageNo[p.id] = i; });
  const verFor = (p, u) => {
    if (sh) {   // sharing a post: your messages that include {post}, else the built-in ones — each page gets its own wording
      const mine = T.versions.filter(v => /\{post\}/.test(v.text) && (!v.page || v.page === p.id));
      if (mine.length) { const v = pick(mine); return { id: v.id, text: fill(v.text, u, sh), post: true }; }
      const i = (pageNo[p.id] || 0) % SHARE_VERSIONS.length; return { id: 'sh' + (i + 1), text: fill(SHARE_VERSIONS[i], u, sh), post: true };
    }
    const own = T.versions.filter(v => v.page === p.id && !/\{post\}/.test(v.text)), all = own.length ? own : T.versions.filter(v => !v.page && !/\{post\}/.test(v.text)); const v = pick(all.length ? all : T.versions); return { id: v.id, text: fill(v.text, u, null) };
  };
  for (const id of Object.keys(out)) {
    const o = out[id];
    o.todo = o.todo.map(u => ({ u, msg: verFor(o.page, u), source: items[u].source || '' }));
    o.followups = o.followups.map(u => ({ u, msg: { id: 'fu', text: T.followup.replace(/\{name\}/g, u) }, sentAt: items[u].sentAt }));
  }
  return { pages: Object.values(out), waiting: fresh.length - k, share: sh };
}
async function act(u, what, opts) {
  u = clean(u); opts = opts || {};
  if (!valid(u)) throw new HttpError(400, 'invalid', 'Invalid username.');
  const now = core.nowIso();
  let rec;
  await cas('dm/people', cur => {
    cur = cur || { items: {} };
    const r = cur.items[u] || (cur.items[u] = { stage: 'new', addedAt: now, log: [] });
    const log = t => { r.log = [{ at: now, what: t }].concat(r.log || []).slice(0, 30); };
    if (what === 'sent') { if (!opts.page) throw new HttpError(400, 'invalid', 'Which page sent it?'); r.stage = 'messaged'; r.page = opts.page; r.ver = opts.ver || ''; r.sentAt = now; log('📨 Messaged from ' + (opts.pageName || 'a page')); }
    else if (what === 'fusent') { r.fuSent = now; log('🔁 Follow-up sent'); }
    else if (what === 'replied') { r.stage = 'replied'; r.repliedAt = now; log('↩️ Replied'); }
    else if (what === 'followed') { r.stage = 'followed'; r.followedAt = now; log('✅ Followed @auntietobi_uk'); }
    else if (what === 'notinterested') { r.stage = 'notinterested'; log('👎 Not interested'); }
    else if (what === 'dnc') { r.stage = 'dnc'; log('🚫 Do not contact'); }
    else if (what === 'reset') { r.stage = 'new'; delete r.sentAt; delete r.fuSent; log('↺ Back to To message'); }
    else if (what === 'skip') { r.stage = 'notinterested'; log('⏭ Skipped'); }
    else if (what === 'note') { r.notes = String(opts.notes || '').slice(0, 1000); }
    else if (what === 'remove') { if (r.stage !== 'dnc') delete cur.items[u]; rec = null; return cur; }
    else throw new HttpError(400, 'invalid', 'Unknown action.');
    rec = r; return cur;
  });
  if (what === 'sent' || what === 'fusent') await cas('dm/day', cur => { cur = cur && cur.day === day() ? cur : { day: day(), sent: {} }; if (what === 'sent') cur.sent[opts.page] = (cur.sent[opts.page] || 0) + 1; return cur; });
  return rec;
}
// Everyone, with numbers per page and per message version
async function overview() {
  const [P, T, items] = [await pages(), await tpl(), await people()];
  const list = Object.keys(items).map(u => Object.assign({ u }, items[u], { log: undefined, logN: (items[u].log || []).length, last: (items[u].log || [])[0] || null }));
  const counts = {}; for (const s of STAGES) counts[s] = list.filter(x => x.stage === s).length;
  const stat = filter => { const L = list.filter(filter), m = L.filter(x => x.sentAt).length; return { messaged: m, replied: L.filter(x => x.repliedAt).length, followed: L.filter(x => x.followedAt).length, rate: m ? Math.round(100 * L.filter(x => x.followedAt).length / m) : 0 }; };
  const byPage = P.map(p => Object.assign({ id: p.id, name: p.name || '@' + p.handle }, stat(x => x.page === p.id)));
  const byVer = T.versions.map((v, i) => Object.assign({ id: v.id, n: i + 1, text: v.text.slice(0, 60) }, stat(x => x.ver === v.id)));
  return { list, counts, byPage, byVer, pages: P, tpl: T, stages: STAGES };
}
async function detail(u) { const items = await people(); const r = items[clean(u)]; if (!r) throw new HttpError(404, 'not_found', 'Not on your list.'); return Object.assign({ u: clean(u) }, r); }

// ── finding Nigerians in the UK ──
async function ideas(city, interest) {
  const settings = await core.getSettings(), gen = require('./generate');
  const out = await gen.callModel([{ role: 'system', content: 'You help a UK marketing team find where Nigerians in the UK gather on Instagram, so they can find people to message by hand. Give practical, specific suggestions only — real, widely used hashtags and well-known kinds of accounts. Never invent follower numbers. Return ONLY JSON: {"hashtags":["#…"],"places":["Instagram location tags to search"],"pages":["kinds of popular accounts to look at, with example search words"],"tips":["short practical tips for finding active people in comments and likes"]}' },
    { role: 'user', content: `City/area: ${core.cleanText(city, 60) || 'anywhere in the UK'}. Interest: ${core.cleanText(interest, 80) || 'general'}.` }], 700, settings, { json: true, raw: true, timeoutMs: 20000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  try { return JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { return { hashtags: [], places: [], pages: [], tips: [String(out.text).slice(0, 500)] }; }
}
// public Instagram pages found by web search (creators, businesses, community pages)
async function searchPages(query) {
  query = core.cleanText(query, 120);
  if (query.length < 3) throw new HttpError(400, 'invalid', 'Type what to look for, e.g. “Nigerian hairstylist Manchester”.');
  const settings = await core.getSettings(), gen = require('./generate');
  const out = await gen.callModel([{ role: 'system', content: 'From the web search results ONLY, list public Instagram accounts (instagram.com/<username>) that look like Nigerian or African people, creators, communities or small businesses in the UK. Never invent a username. Return ONLY JSON: {"accounts":[{"username":"","why":"short reason"}]}' },
    { role: 'user', content: 'site:instagram.com ' + query + ' UK Nigerian' }], 1200, settings, { json: true, raw: true, timeoutMs: 22000, plugins: [{ id: 'web', engine: 'exa', max_results: 10, include_domains: ['instagram.com'] }] });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let list = [];
  try { list = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')).accounts || []; } catch (_) { list = []; }
  const items = await people();
  const seen = new Set();
  return list.map(a => ({ u: clean(a.username), why: core.cleanText(a.why, 120) })).filter(a => valid(a.u) && !/^(p|reel|explore|stories)$/.test(a.u) && !seen.has(a.u) && seen.add(a.u)).map(a => Object.assign(a, { onList: !!items[a.u], stage: items[a.u] ? items[a.u].stage : '' }));
}

module.exports = { share, setShare, stopShare, pages, savePages, tpl, saveTpl, add, today, act, overview, detail, ideas, searchPages, STAGES };
