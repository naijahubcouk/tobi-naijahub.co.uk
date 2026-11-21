'use strict';
/*
 * 💚 Club check-ups — a warm monthly message to every Auntie Tobi Business Club member.
 * On the 1st of each month HQ prepares one message per active member (GPT-6 Luna, personalised with their business,
 * how they used Business Studio, their listing and last month's notes). Auntie Tobi checks each one and sends it herself:
 * 💬 WhatsApp (opens with the message filled in) or 📧 email (sent only when she taps it). Nothing is ever sent automatically.
 *
 *   hq/clubcheck/themes              { items: [12 themes, Jan…Dec] }
 *   hq/clubcheck/m/<YYYY-MM>         { items: { <email>: { name, biz, msg, subject, status, via, note, at, sentAt } } }
 *   hq/clubcheck/notes/<enc email>   { items: [{ month, status, note }] }   (so next month can follow on)
 */
const core = require('./core');
const { HttpError, getJson, setJson, cas, cleanText } = core;
const gen = require('./generate');

const THEMES_KEY = 'hq/clubcheck/themes';
const MKEY = m => `hq/clubcheck/m/${m}`;
const NKEY = e => `hq/clubcheck/notes/${core.enc(e)}`;
const STATUSES = ['ready', 'sent', 'replied', 'help'];
const DEFAULT_THEMES = [
  'New year goals: one goal for this year, and one Business Studio tool to try',
  'Love month: Valentine’s and Mother’s Day promotions (Mother’s Day is in March in the UK)',
  'Spring clean: fresh photos, an up-to-date listing and price list',
  'Easter and spring offers, and asking happy customers for reviews',
  'Get found online: Google Business Profile, Instagram bio and the Auntie Tobi listing',
  'Summer: weddings, owambe and events season — bookings and deposits',
  'Keep customers coming back: follow-ups, thank-you messages and loyalty',
  'Plan the busy season early: prices, stock and what to promote from September',
  'Back to school and autumn customers',
  'Black History Month and Nigerian Independence — telling your story',
  'Black Friday and Christmas planning: offers, gift ideas and deadlines',
  'Christmas and a look back at the year: wins, thank-yous and plans for next year',
];

async function themes() { const t = await getJson(THEMES_KEY).catch(() => null); return t && Array.isArray(t.items) && t.items.length === 12 ? t.items : DEFAULT_THEMES.slice(); }
async function saveThemes(items) {
  if (!Array.isArray(items) || items.length !== 12) throw new HttpError(400, 'invalid', 'There should be one theme for each month.');
  const clean = items.map((t, i) => cleanText(t, 200) || DEFAULT_THEMES[i]);
  await setJson(THEMES_KEY, { items: clean, at: core.nowIso() }); return clean;
}
const monthNow = () => core.dayKey().slice(0, 7);
const monthName = m => new Date(m + '-15T12:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// every active Club member, with what we know about their business
async function members() {
  const settings = await core.getSettings();
  const keys = await core.listKeys('members/').catch(() => []);
  const all = await Promise.all(keys.map(k => getJson(k).catch(() => null)));
  const club = all.filter(m => m && m.email && core.access(m, settings).membershipActive);
  const since = Date.now() - 31 * 864e5;
  return Promise.all(club.map(async m => {
    const e = core.enc(m.email);
    const [p, h] = await Promise.all([getJson(`profiles/${e}`).catch(() => null), getJson(`history/${e}`).catch(() => null)]);
    const used = ((h && h.items) || []).filter(x => x && x.createdAt && new Date(x.createdAt).getTime() > since).length;
    let listing = null;
    if (p && p.listingSlug) {
      const b = (await require('./bizdir').all().catch(() => [])).find(x => x.slug === p.listingSlug);
      if (b) listing = { slug: b.slug, name: b.name, photo: !!b.img, email: !!b.email, verified: !!b.verified };
    }
    const wa = String((p && p.whatsapp) || '').replace(/\D/g, '');
    return { email: m.email, name: (m.name || '').split(' ')[0] || '', biz: (p && p.businessName) || (listing && listing.name) || '', industry: (p && p.industry) || '', location: (p && p.location) || '',
      wa: wa.length >= 10 ? (wa.startsWith('0') ? '44' + wa.slice(1) : wa) : '', ig: (p && p.instagram) || '', used, listing, until: m.membershipExpiresAt || '' };
  }));
}

async function write(mem, theme, month, notes) {
  const settings = await core.getSettings();
  const last = (notes || []).slice(-2).map(n => `${n.month}: ${n.status}${n.note ? ' — ' + n.note : ''}`).join('\n');
  const renew = mem.until && new Date(mem.until).getTime() - Date.now() < 45 * 864e5 ? `Their Business Club membership renews on ${String(mem.until).slice(0, 10)}.` : '';
  const fix = [mem.listing && !mem.listing.photo ? 'their Auntie Tobi listing has no photo' : '', mem.listing && !mem.listing.email ? 'their listing has no email' : '', !mem.listing ? 'they have no Auntie Tobi directory listing linked yet' : ''].filter(Boolean)[0] || '';
  const out = await gen.callModel([
    { role: 'system', content: 'You are Auntie Tobi (@auntietobi_uk): a warm, trusted Nigerian auntie who helps Nigerian business owners in the UK. You write a short monthly check-up message to one Auntie Tobi Business Club member. British English, natural, encouraging, never pushy, never salesy. Plain text only (it may be sent on WhatsApp): no markdown, no headings, at most 2 emojis. Never invent facts, numbers or results about them. Sign off "Auntie Tobi 💚".' },
    { role: 'user', content: `Write the ${monthName(month)} check-up.\nTheme this month: ${theme}\n\nAbout them:\n- First name: ${mem.name || '(unknown — just say hello)'}\n- Business: ${mem.biz || '(unknown)'}${mem.industry ? ' (' + mem.industry + ')' : ''}${mem.location ? ', ' + mem.location : ''}\n- Used Business Studio ${mem.used} time(s) in the last month\n${fix ? '- One thing to fix: ' + fix + '\n' : ''}${renew ? '- ' + renew + '\n' : ''}${last ? '- Last check-ups:\n' + last + '\n' : ''}\nShape (90–140 words): a warm hello with their business name → one line on their month (gently mention Business Studio: thank them if they used it, or suggest one tool if they did not) ${last ? '→ follow on from last month’s note naturally ' : ''}→ ONE practical tip for this month’s theme, specific to their kind of business → ${fix ? 'the one thing to fix, kindly → ' : ''}${renew ? 'a gentle mention that their membership renews soon → ' : ''}end with this question: "How was business this month? Reply with one thing you’d like help with 💚"\n\nReturn ONLY JSON: {"subject":"email subject, max 8 words","message":"the message"}` },
  ], 700, settings, { json: true, raw: true, timeoutMs: 20000 });
  gen.addGlobal(core.monthKey(), { id: 'clubcheck', tool: 'hq-clubcheck', cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j; try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The message came back garbled — try again.'); }
  const msg = String(j.message || '').replace(/\*\*/g, '').trim().slice(0, 2000);
  if (msg.length < 40) throw new HttpError(502, 'ai_error', 'The message came back empty — try again.');
  return { msg, subject: cleanText(j.subject, 80) || `Your ${monthName(month).split(' ')[0]} check-up from Auntie Tobi` };
}

// the month's list (members + their message, if prepared)
async function list(month) {
  month = /^\d{4}-\d{2}$/.test(month || '') ? month : monthNow();
  const [mem, st, th] = await Promise.all([members(), getJson(MKEY(month)).catch(() => null), themes()]);
  const items = (st && st.items) || {};
  const rows = mem.map(m => Object.assign({}, m, items[m.email] || { status: 'todo' })).sort((a, b) => (a.biz || a.email).localeCompare(b.biz || b.email));
  return { month, monthName: monthName(month), theme: th[Number(month.slice(5)) - 1], themes: th, rows, counts: rows.reduce((c, r) => { c[r.status] = (c[r.status] || 0) + 1; return c; }, {}) };
}

// ✍️ prepare messages for members who don't have one yet (a few at a time so nothing times out)
async function prepare(month, budgetMs, onlyEmail, force) {
  month = /^\d{4}-\d{2}$/.test(month || '') ? month : monthNow();
  const t0 = Date.now(), th = await themes(), theme = th[Number(month.slice(5)) - 1];
  const mem = await members(), st = (await getJson(MKEY(month)).catch(() => null)) || { items: {} };
  const todo = mem.filter(m => (onlyEmail ? m.email === onlyEmail : true) && (force || !st.items[m.email] || !st.items[m.email].msg));
  let done = 0, failed = 0;
  for (const m of todo) {
    if (Date.now() - t0 > (budgetMs || 15000)) break;
    try {
      const notes = ((await getJson(NKEY(m.email)).catch(() => null)) || { items: [] }).items;
      const w = await write(m, theme, month, notes);
      await cas(MKEY(month), x => { x = x || { items: {} }; const prev = x.items[m.email] || {}; x.items[m.email] = Object.assign({}, prev, { biz: m.biz, msg: w.msg, subject: w.subject, status: prev.status && prev.status !== 'todo' && !force ? prev.status : 'ready', at: core.nowIso() }); return x; });
      done++;
    } catch (e) { failed++; console.error('[clubcheck]', m.email, e.message); }
  }
  const left = todo.length - done - failed;
  return { done, failed, left: Math.max(0, left) };
}

async function update(month, email, patch, who) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) throw new HttpError(400, 'invalid', 'Which month?');
  email = core.normalizeEmail(email);
  let row;
  await cas(MKEY(month), x => {
    x = x || { items: {} }; const r = Object.assign({}, x.items[email] || {});
    if (patch.msg !== undefined) r.msg = String(patch.msg).slice(0, 2000);
    if (patch.subject !== undefined) r.subject = cleanText(patch.subject, 80);
    if (patch.status && STATUSES.includes(patch.status)) r.status = patch.status;
    if (patch.via) { r.via = patch.via === 'email' ? 'email' : 'whatsapp'; r.sentAt = core.nowIso(); }
    if (patch.note !== undefined) r.note = String(patch.note).slice(0, 500);
    r.by = who; x.items[email] = row = r; return x;
  });
  if (patch.status === 'replied' || patch.status === 'help' || patch.note !== undefined) {
    await cas(NKEY(email), x => { x = x || { items: [] }; x.items = x.items.filter(n => n.month !== month).concat({ month, status: row.status, note: row.note || '' }).slice(-12); return x; });
  }
  return row;
}

async function sendEmail(month, email, who) {
  const st = (await getJson(MKEY(month)).catch(() => null)) || { items: {} }, r = st.items[core.normalizeEmail(email)];
  if (!r || !r.msg) throw new HttpError(400, 'not_ready', 'Prepare the message first.');
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1F2937;max-width:560px">' + r.msg.split(/\n{2,}/).map(p => '<p>' + String(p).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>').join('') + '</div>';
  await core.sendEmail(email, r.subject || 'Your monthly check-up from Auntie Tobi', r.msg, html);
  return update(month, email, { status: r.status === 'replied' || r.status === 'help' ? r.status : 'sent', via: 'email' }, who);
}

// for Today in HQ: messages prepared this month but not sent yet
async function readyCount() { const st = await getJson(MKEY(monthNow())).catch(() => null); return Object.values((st && st.items) || {}).filter(r => r.status === 'ready' && r.msg).length; }

// ⏱️ from the 5-minute runner: on/after the 1st, prepare this month's messages (a few each run)
async function autoPrepare(budgetMs) {
  const m = monthNow(), flag = await getJson(`hq/clubcheck/done/${m}`).catch(() => null);
  if (flag) return null;
  const r = await prepare(m, budgetMs || 12000);
  if (!r.left && !r.failed) await setJson(`hq/clubcheck/done/${m}`, { at: core.nowIso() }).catch(() => {});
  return r;
}

module.exports = { list, prepare, update, sendEmail, themes, saveThemes, readyCount, autoPrepare, monthNow, DEFAULT_THEMES };
