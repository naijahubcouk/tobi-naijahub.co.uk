'use strict';
/*
 * 📧 Business email journeys (Auntie Tobi HQ → Outreach).
 *   out/settings { on, cap, aiLine }
 *   out/state    { biz: { <slug>: { j:'u'|'c', start, next, sent:[{id,at,ch}], stop, stopAt } }, day, sentToday }
 *   out/unsub    { items: [{ email, slug, at }] }
 * Unclaimed (Auntie Tobi listed them): u1 listed (day 0) · u2 Business Studio (2) · u3 Club invite (5) · u4 benefits + last note (12)
 * Claimed, not Featured:               c1 Business Studio (0) · c2 Club invite (2) · c3 benefits (5) · c4 last note (12)
 * Stops at once when they join the Business Club, become Featured, unsubscribe or ask to be removed.
 * Nothing is sent until Auntie Tobi taps "Send" in HQ (cap per day; Resend's free plan allows 100/day shared with login codes).
 */
const core = require('./core');
const { HttpError, getJson, cas } = core;
const bizdir = require('./bizdir');
const emails = require('./emails');

const J = {
  u: [{ id: 'u1', day: 0, topic: 'listed' }, { id: 'u2', day: 2, topic: 'studio' }, { id: 'u3', day: 5, topic: 'invite' }, { id: 'u4', day: 12, topic: 'benefits' }],
  c: [{ id: 'c1', day: 0, topic: 'studio' }, { id: 'c2', day: 2, topic: 'invite' }, { id: 'c3', day: 5, topic: 'benefits' }, { id: 'c4', day: 12, topic: 'last' }],
};
const TOPIC = { u1: 'listed', u2: 'studio', u3: 'invite', u4: 'benefits', c1: 'studio', c2: 'invite', c3: 'benefits', c4: 'last' };
const DIR_SITE = 'https://directory.auntietobi.co.uk';
const FROM = () => core.env('OUTREACH_EMAIL_FROM', 'Auntie Tobi <hello@mail.auntietobi.co.uk>');
const REPLY_TO = () => core.env('OUTREACH_REPLY_TO', 'info@auntietobi.co.uk');
const DAY = 864e5;

async function settings() { return Object.assign({ on: false, cap: 50, manualCap: 20, aiLine: false }, (await getJson('out/settings').catch(() => null)) || {}); }
async function saveSettings(s) {
  const cur = await settings();
  const next = { on: typeof s.on === 'boolean' ? s.on : cur.on, cap: Math.max(1, Math.min(300, parseInt(s.cap, 10) || cur.cap)), manualCap: Math.max(0, Math.min(60, parseInt(s.manualCap, 10) >= 0 ? parseInt(s.manualCap, 10) : cur.manualCap)), aiLine: typeof s.aiLine === 'boolean' ? s.aiLine : cur.aiLine };
  await core.setJson('out/settings', next); return next;
}
async function state() { return (await getJson('out/state').catch(() => null)) || { biz: {} }; }
const today = () => core.dayKey();
const pretty = c => String(c || '').split('>').pop().trim().replace(/(^|[\s/])([a-z])/g, (m, a, l) => a + l.toUpperCase());

// tokens for the unsubscribe / remove links (no sign-in needed, can't be guessed)
const token = slug => slug + '.' + core.hmac('out:' + slug).slice(0, 20);
function slugFromToken(t) { const i = String(t || '').lastIndexOf('.'); if (i < 1) return ''; const slug = t.slice(0, i); return token(slug) === t ? slug : ''; }

// Who uses Business Studio / is in the Business Club (by email)
async function memberInfo() {
  const keys = await core.listKeys('members/').catch(() => []);
  const studio = new Set(keys.map(k => decodeURIComponent(k.slice(8)).toLowerCase()));
  return { studio, club: async email => { if (!studio.has(email)) return false; const m = await core.getMember(email).catch(() => null); return !!(m && core.access(m).membershipActive); } };
}

function eligible(b) {
  if (b.hidden || b.status === 'pending' || b.featured) return false;
  if (b.src === 'hq' && !b.uploadedAt) return false;          // not on the directory website yet
  return !!(b.email || b.ownerEmail || b.wa || b.ig);
}
function vars(b) {
  const site = core.siteBase();
  return { business_name: b.name, category: pretty((b.cats && b.cats[0]) || b.cat) || 'businesses', town: b.loc && b.loc !== 'UK' ? b.loc : 'the UK',
    listing_link: `${site}/biz/${encodeURIComponent(b.slug)}`, claim_link: `${site}/claim/${encodeURIComponent(b.slug)}`,
    remove_link: `${site}/remove/${token(b.slug)}`, unsubscribe_link: `${site}/u/${token(b.slug)}`, studio_link: `${site}/business-studio`, club_link: `${site}/business-club`, personal_line: '' };
}

// Works out each business's next email. Returns { due:[...], fresh:[...], stops:[{slug, why}], switches:[{slug}] } without saving.
// the built-in steps plus any emails you added in HQ → Emails, in day order
async function journeys() {
  const ex = await emails.extras(), gone = await emails.removedIds(), out = { u: J.u.filter(x => !gone.includes(x.id)), c: J.c.filter(x => !gone.includes(x.id)) };
  for (const x of ex) { out[x.j].push({ id: x.id, day: x.day, topic: x.id }); TOPIC[x.id] = x.id; }
  out.u.sort((a, b) => a.day - b.day); out.c.sort((a, b) => a.day - b.day);
  return out;
}
async function plan() {
  const inv = await require('./invites').load().catch(() => ({ items: {} }));
  const JJ = await journeys();
  const [st, dir, set, unsub, mi] = [await state(), await bizdir.all(), await settings(), ((await getJson('out/unsub').catch(() => null)) || { items: [] }).items, await memberInfo()];
  const unsubbed = new Set(unsub.map(x => x.email)), now = Date.now();
  const due = [], fresh = [], stops = [], waiting = [];
  for (const b of dir) {
    // 🆕 added in the app: the owner's own email is the one that matters (sending, Studio, Club); the series starts from the "You're listed" email
    const isApp = !!(b.via && b.ownerEmail);
    const r = st.biz[b.slug], email = String((isApp ? b.ownerEmail : b.email) || '').toLowerCase(), sEmail = isApp ? email : String(((inv.items || {})[b.slug] || {}).studioEmail || email).toLowerCase();
    if (r && r.stop) continue;
    if (isApp && !r && !b.listedMailAt) continue;                 // wait for "You're listed" first
    if (!eligible(b)) { if (r && (b.featured || b.hidden)) stops.push({ slug: b.slug, why: b.featured ? 'featured' : 'hidden' }); continue; }
    if ((email && unsubbed.has(email)) || (b.email && unsubbed.has(String(b.email).toLowerCase()))) { if (r) stops.push({ slug: b.slug, why: 'unsubscribed' }); continue; }
    if (sEmail && await mi.club(sEmail)) { if (r) stops.push({ slug: b.slug, why: 'joined' }); continue; }
    const hasStudio = !!sEmail && mi.studio.has(sEmail);
    let j = r ? r.j : (b.claimed ? 'c' : 'u');
    const sentTopics = new Set((r ? r.sent : []).map(s => TOPIC[s.id] || s.id));
    if (j === 'u' && b.claimed) j = 'c';                         // claimed since: carry on the claimed journey, no repeats
    if (sentTopics.has('benefits') && j === 'c' && r && r.j === 'u') sentTopics.add('last');
    const start = r ? r.start : isApp ? (Date.parse(b.listedMailAt) || now) : now;
    const skipStudio = hasStudio || isApp || (r && r.manual === 'start-new');   // they already have Business Studio
    const step = JJ[j].find(s => !sentTopics.has(s.topic) && !(s.topic === 'studio' && skipStudio));
    if (!step) { if (r) stops.push({ slug: b.slug, why: 'finished' }); continue; }
    const item = { slug: b.slug, name: b.name, email: isApp ? b.ownerEmail : b.email, wa: b.wa, ig: b.ig, j, step: step.id, claimed: !!b.claimed, src: b.src, dueAt: new Date(start + step.day * DAY).toISOString(), isNew: !r, app: isApp, start };
    if (!r && isApp && start + step.day * DAY > now + 6 * 3600e3) waiting.push(item);   // e.g. Club invite 2 days after "You're listed"
    else if (!r) fresh.push(item); else if (start + step.day * DAY <= now + 6 * 3600e3) due.push(item); else waiting.push(item);
  }
  // newest website uploads first for new journeys (Finder listings), then everyone else
  fresh.sort((a, b) => (b.src === 'hq') - (a.src === 'hq'));
  const sentToday = st.day === today() ? (st.sentToday || 0) : 0, manualToday = st.day === today() ? (st.manualToday || 0) : 0;
  const emailRoom = Math.max(0, set.cap - sentToday), handRoom = Math.max(0, set.manualCap - manualToday);
  const byEmail = x => !!x.email, byHand = x => !x.email;
  const todayEmail = due.filter(byEmail).concat(fresh.filter(byEmail)).slice(0, emailRoom);
  const todayHand = due.filter(byHand).concat(fresh.filter(byHand)).slice(0, handRoom);
  return { set, sentToday, manualToday, todayEmail, todayHand, stops, waiting: waiting.length, freshLeft: fresh.length, st };
}

async function applyStops(stops) {
  if (!stops.length) return;
  await cas('out/state', cur => { cur = cur || { biz: {} }; for (const s of stops) if (cur.biz[s.slug] && !cur.biz[s.slug].stop) Object.assign(cur.biz[s.slug], { stop: s.why, stopAt: core.nowIso() }); return cur; });
}
async function record(item, ch) {
  const now = Date.now();
  await cas('out/state', cur => {
    cur = cur || { biz: {} };
    if (cur.day !== today()) { cur.day = today(); cur.sentToday = 0; cur.manualToday = 0; }
    const r = cur.biz[item.slug] || (cur.biz[item.slug] = { j: item.j, start: item.start || now, sent: [] });
    r.j = item.j; r.sent.push({ id: item.step, at: new Date(now).toISOString(), ch });
    if (ch === 'email') cur.sentToday = (cur.sentToday || 0) + 1; else cur.manualToday = (cur.manualToday || 0) + 1;
    return cur;
  });
}

async function personalLine(b) {
  try {
    const gen = require('./generate'), s = await core.getSettings();
    const r = await gen.callModel([{ role: 'system', content: 'Write ONE short, warm, specific sentence (max 20 words) Auntie Tobi could say to a Nigerian business in the UK about what they offer, based ONLY on the description. No hype words, no questions, no emojis, British English. Reply with the sentence only.' },
      { role: 'user', content: `${b.name} (${b.cat}): ${String(b.short || b.desc || '').slice(0, 500)}` }], 60, s, { raw: true, timeoutMs: 8000 });
    gen.addGlobal(core.monthKey(), { cost: 0, inTok: r.inTok, outTok: r.outTok, costUsd: r.costUsd }, s).catch(() => {});
    const t = String(r.text || '').replace(/^["“]|["”]$/g, '').trim();
    return t.length > 10 && t.length < 200 ? t : '';
  } catch (_) { return ''; }
}
// Resend accepts about 2 emails a second: if it says "slow down" (429), wait and try again (up to 3 times)
async function sendOne(to, msg, slug, step) {
  const key = core.env('RESEND_API_KEY');
  if (!key) { if (core.env('STUDIO_EMAIL_MODE') === 'log') { console.log('[outreach] (log) to', to, msg.subject); return true; } throw new HttpError(500, 'email_not_configured', 'Email sending is not set up (RESEND_API_KEY).'); }
  const unsub = `${core.siteBase()}/u/${token(slug)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [to], reply_to: REPLY_TO(), subject: msg.subject, text: msg.text, html: msg.html, headers: { 'List-Unsubscribe': `<${unsub}>, <mailto:${REPLY_TO()}?subject=unsubscribe>` } }) });
    if (r.ok) {
      // remember which business this email was for, so opens / clicks from Resend land on its timeline
      const id = ((await r.json().catch(() => ({}))) || {}).id;
      if (id) await core.setJson('out/rid/' + id, { slug, step: step || '', subject: msg.subject, at: core.nowIso() }).catch(() => {});
      return id || true;
    }
    const t = (await r.text()).slice(0, 300);
    if (r.status === 429 && attempt < 3) {
      if (/quota|daily|monthly/i.test(t)) throw new HttpError(429, 'limit', 'Your email plan’s limit is reached — the rest will go when it resets.');
      const wait = Math.min(4000, (parseFloat(r.headers.get('retry-after')) || 1) * 1000);
      await new Promise(res => setTimeout(res, wait)); continue;
    }
    console.error('[outreach] send failed', r.status, t);
    return false;
  }
  return false;
}

// Sends the next part of today's emails at a steady pace (about 2 a second). HQ calls again until left = 0.
async function sendBatch(max) {
  const p = await plan();
  await applyStops(p.stops);
  if (!p.set.on) throw new HttpError(400, 'off', 'Turn the journeys on first.');
  const dir = new Map((await bizdir.all()).map(b => [b.slug, b]));
  const batch = p.todayEmail.slice(0, max || 25), stopAt = Date.now() + 17000;
  let sent = 0, failed = 0;
  for (let i = 0; i < batch.length; i += 5) {
    if (Date.now() > stopAt) break;
    const chunk = batch.slice(i, i + 5);
    const lines = p.set.aiLine ? await Promise.all(chunk.map(x => ['u1', 'u2', 'u3', 'c1', 'c2'].includes(x.step) || /^x/.test(x.step) ? personalLine(dir.get(x.slug)) : '')) : chunk.map(() => '');
    for (let k = 0; k < chunk.length; k++) {
      if (Date.now() > stopAt) break;
      const x = chunk[k], started = Date.now();
      const msg = await emails.render(x.step, Object.assign(vars(dir.get(x.slug)), { personal_line: lines[k] }));
      if (await sendOne(x.email, msg, x.slug, x.step)) { await record(x, 'email'); sent++; } else failed++;
      await new Promise(res => setTimeout(res, Math.max(500, 550 - (Date.now() - started))));   // never two emails within half a second
    }
  }
  const left = Math.max(0, p.todayEmail.length - sent - failed);
  return { sent, failed, left };
}

// The WhatsApp / Instagram message for a business without email
async function handMessage(slug) {
  const p = await plan(), x = p.todayHand.find(y => y.slug === slug) || p.todayEmail.find(y => y.slug === slug);
  if (!x) throw new HttpError(404, 'not_found', 'That business has nothing due today.');
  const b = (await bizdir.all()).find(y => y.slug === slug);
  const text = (await emails.plain(x.step, vars(b))).replace(/\n\nAuntie Tobi$/, '\n\nAuntie Tobi 💚');
  return { text, wa: b.wa, ig: b.ig, step: x.step, j: x.j };
}
async function markHand(slug) {
  const p = await plan(), x = p.todayHand.find(y => y.slug === slug) || p.todayEmail.find(y => y.slug === slug);
  if (!x) throw new HttpError(404, 'not_found', 'That business has nothing due today.');
  await record(x, 'hand');
}
// Joined / stop / start again (from HQ)
async function mark(slug, what) {
  await cas('out/state', cur => {
    cur = cur || { biz: {} }; const r = cur.biz[slug] || (cur.biz[slug] = { j: 'u', start: Date.now(), sent: [] });
    if (what === 'restart') { delete r.stop; delete r.stopAt; }
    else if (/^start-(new|c|u)$/.test(what)) {   // 📧 Add to email series (from the business sheet): starts it from today, from the first email
      cur.biz[slug] = { j: what === 'start-u' ? 'u' : 'c', start: Date.now(), sent: (r.sent || []).filter(x => x.ch === 'note'), manual: what, startedAt: core.nowIso(), history: (r.sent || []).length ? r.sent : undefined };
    }
    else Object.assign(r, { stop: what === 'joined' ? 'joined' : 'stopped', stopAt: core.nowIso() });
    return cur;
  });
}

// Overview for HQ
async function overview() {
  const p = await plan(), dir = await bizdir.all(), st = p.st;
  const rows = dir.filter(b => st.biz[b.slug]).map(b => { const r = st.biz[b.slug]; return { slug: b.slug, name: b.name, email: b.via && b.ownerEmail ? b.ownerEmail : b.email, app: !!(b.via && b.ownerEmail), j: r.j, sent: r.sent, stop: r.stop || '', start: new Date(r.start).toISOString() }; });
  const counts = { inJourney: rows.filter(r => !r.stop).length, finished: rows.filter(r => r.stop === 'finished').length, joined: rows.filter(r => r.stop === 'joined').length, stopped: rows.filter(r => r.stop && !['finished', 'joined'].includes(r.stop)).length, waitingToStart: p.freshLeft };
  const preview = async x => { const b = dir.find(y => y.slug === x.slug); const m = await emails.render(x.step, vars(b)); return Object.assign({}, x, { subject: m.subject }); };
  return { settings: p.set, sentToday: p.sentToday, manualToday: p.manualToday, todayEmail: await Promise.all(p.todayEmail.map(preview)), todayHand: p.todayHand, counts, rows, laterThisWeek: p.waiting };
}
async function previewFor(slug, step) {
  const b = (await bizdir.all()).find(y => y.slug === slug);
  if (!b) throw new HttpError(404, 'not_found', 'Business not found.');
  return emails.render(step, vars(b));
}
// Test email of any template to Auntie Tobi, using a real or sample business
async function sendTest(id, to, slug, draft) {
  const dir = await bizdir.all(), b = dir.find(y => y.slug === slug) || dir.find(y => !y.featured && y.email) || dir[0];
  const v = Object.assign(vars(b), { personal_line: '' });
  const msg = draft && draft.subject && draft.body ? emails.renderWith(draft, v, emails.FOOTER_OUT) : await emails.render(id, v);
  msg.subject = '[TEST] ' + msg.subject;
  if (!(await sendOne(to, msg, b.slug))) throw new HttpError(502, 'send_failed', 'The test email didn’t send — check the email settings.');
  return { to, business: b.name };
}

// ── public pages: /u/<token> (unsubscribe) and /remove/<token> (take my listing down) ──
function page(title, body) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#0F1E36"><div style="max-width:480px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #ECE6D6;border-radius:16px;padding:26px 22px;text-align:center">${body}</div><p style="text-align:center;font-size:13px;color:#6B7280">Auntie Tobi · <a href="https://www.auntietobi.co.uk" style="color:#057A44">auntietobi.co.uk</a></p></div></body></html>` };
}
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const btn = (label, red) => `<button type="submit" style="background:${red ? '#B42318' : '#057A44'};color:#fff;border:0;border-radius:10px;padding:13px 20px;font-size:16px;font-weight:bold;cursor:pointer">${label}</button>`;
async function publicPage(q) {
  const kind = q.unsub ? 'unsub' : 'gone', t = q.unsub || q.gone, slug = slugFromToken(t);
  const b = slug && (await bizdir.all()).find(x => x.slug === slug);
  if (!b) return page('Link not valid', '<h1 style="font-size:22px">This link isn’t valid</h1><p>Please reply to the email and Auntie Tobi will sort it out.</p>');
  const name = escH(b.name), form = (label, red) => `<form method="get" action="/.netlify/functions/app-content"><input type="hidden" name="${kind}" value="${escH(t)}"><input type="hidden" name="yes" value="1">${btn(label, red)}</form>`;
  if (kind === 'unsub') {
    if (!q.yes) return page('Unsubscribe', `<h1 style="font-size:22px">Stop emails to ${name}?</h1><p style="margin:0 0 20px">You won’t get any more emails from Auntie Tobi about your listing or the Business Club.</p>${form('Yes, unsubscribe')}`);
    await cas('out/unsub', cur => { cur = cur || { items: [] }; const e = ((b.via && b.ownerEmail) || b.email || '').toLowerCase(); if (!cur.items.some(x => x.slug === slug)) cur.items.push({ email: e, slug, at: core.nowIso() }); return cur; });
    await cas('out/state', cur => { cur = cur || { biz: {} }; const r = cur.biz[slug] || (cur.biz[slug] = { j: 'u', start: Date.now(), sent: [] }); r.stop = 'unsubscribed'; r.stopAt = core.nowIso(); return cur; });
    return page('Unsubscribed', `<h1 style="font-size:22px">You’re unsubscribed 💚</h1><p>No more emails will be sent to ${name}. Your listing stays on Auntie Tobi.</p>`);
  }
  if (!q.yes) return page('Remove listing', `<h1 style="font-size:22px">Remove ${name} from Auntie Tobi?</h1><p style="margin:0 0 20px">Your listing will be taken off the Auntie Tobi app straight away, and off the directory website within a few days. You won’t get any more emails.</p>${form('Yes, remove my listing', true)}`);
  await bizdir.save(Object.assign({}, b, { origSlug: b.slug, hidden: true, notes: ((b.notes || '') + ' Asked to be removed (' + core.dayKey() + ').').trim() }), 'business');
  await require('./finder').neverAdd(b, 'Asked to be removed (email link)').catch(() => {});
  await cas('out/state', cur => { cur = cur || { biz: {} }; const r = cur.biz[slug] || (cur.biz[slug] = { j: 'u', start: Date.now(), sent: [] }); r.stop = 'removed'; r.stopAt = core.nowIso(); return cur; });
  await core.emailAdmins(`Remove from directory: ${b.name}`, `${b.name} asked to be removed using the link in their email.\n\nIt's already hidden in the Auntie Tobi app and won't be suggested by the Business Finder again.\nPlease delete it on the directory website: ${DIR_SITE}/${slug}`);
  return page('Listing removed', `<h1 style="font-size:22px">Done — ${name} has been removed</h1><p>It’s off the Auntie Tobi app now and will be off the directory website within a few days. Sorry for any bother, and all the best with your business.</p>`);
}

module.exports = { sendOne, vars, settings, saveSettings, plan, sendBatch, handMessage, markHand, mark, overview, previewFor, sendTest, publicPage, token, J };
