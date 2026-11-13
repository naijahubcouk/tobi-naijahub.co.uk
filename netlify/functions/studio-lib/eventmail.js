'use strict';
/*
 * 📧 Emails to event organisers (Auntie Tobi HQ, admin only). Nothing is sent until Auntie Tobi taps Send.
 *   ev.approved  → someone who submitted their event (Submit your event form), after it's approved
 *   ev.added     → organisers of events Auntie Tobi added herself (their email saved on the event)
 *
 *   evm/sent     { items: { <key>: { to, tpl, at, rid, skipped? } } }   key = 's:<subId>' or 'a:<appId>'
 *   evm/unsub    { items: [{ email, at }] }
 * Opens / clicks: out/rid/<resendId> → { slug: 'ev-<appId>' } → out/ev/ev-<appId> (same tracking as business emails)
 * Unsubscribe link: /.netlify/functions/app-content?evunsub=<token>
 */
const core = require('./core');
const { HttpError, cas, getJson } = core;
const emails = require('./emails');
const apppub = require('./apppub');
const eventsub = require('./eventsub');

const PROMO = 'https://www.auntietobi.co.uk/event-promotion';
const FROM = () => core.env('OUTREACH_EMAIL_FROM', 'Auntie Tobi <hello@mail.auntietobi.co.uk>');
const REPLY_TO = () => core.env('OUTREACH_REPLY_TO', 'info@auntietobi.co.uk');
const FOOTER = 'You’re receiving this because your event is listed on Auntie Tobi. Don’t want emails from Auntie Tobi? Unsubscribe: {unsubscribe_link}';
const isEmail = e => /^[^\s@<>"',;]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,24}$/i.test(String(e || '').trim());
const b64 = s => Buffer.from(s).toString('base64url');
const token = email => b64(email) + '.' + core.hmac('evunsub:' + email).slice(0, 20);
function emailFromToken(t) { const i = String(t || '').lastIndexOf('.'); if (i < 1) return ''; let e = ''; try { e = Buffer.from(t.slice(0, i), 'base64url').toString(); } catch (_) { return ''; } return token(e) === t ? e : ''; }

async function sentMap() { return ((await getJson('evm/sent').catch(() => null)) || { items: {} }).items; }
async function unsubList() { return ((await getJson('evm/unsub').catch(() => null)) || { items: [] }).items.map(x => x.email); }
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';

// Who and what for one email. kind 's' = submission id, 'a' = app event id
async function target(kind, id) {
  if (kind === 's') {
    const s = (await eventsub.list()).find(x => x.id === id);
    if (!s) throw new HttpError(404, 'not_found', 'That event submission no longer exists.');
    if (s.status !== 'approved' || !s.appId) throw new HttpError(400, 'not_approved', 'Approve the event first.');
    const post = (await apppub.list()).find(p => p.id === s.appId);
    const c = String(s.contact || '').trim(), email = isEmail(c) ? c.toLowerCase() : '';
    const phone = !email && /\d{7,}/.test(c.replace(/[\s()+-]/g, '')) ? c : '';
    return { key: 's:' + id, tpl: 'ev.approved', email, phone, post: post || { id: s.appId, title: s.title, slug: '' }, name: firstName(s.contactName) };
  }
  const post = (await apppub.list()).find(p => p.id === id && p.kind === 'event');
  if (!post) throw new HttpError(404, 'not_found', 'That event no longer exists.');
  const found = (String(post.body || '') + ' ' + String(post.link || '')).match(/[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,24}/gi) || [];
  return { key: 'a:' + id, tpl: 'ev.added', email: (post.orgEmail || found[0] || '').toLowerCase(), phone: '', post, name: '' };
}
const eventLink = p => p.slug ? `${core.siteBase()}/blog/${p.slug}` : core.siteBase();
function vars(t, email) {
  return { organiser_name: t.name || 'there', event_title: t.post.title || 'your event', event_link: eventLink(t.post), promo_link: PROMO, whatsapp_link: 'https://wa.me/447594674940', unsubscribe_link: email ? `${core.siteBase()}/eu/${token(email)}` : '' };
}

// The email filled in and ready to read / edit in HQ
async function preview(kind, id) {
  const t = await target(kind, id), tpl = await emails.get(t.tpl), v = vars(t, t.email);
  const fill = s => String(s).replace(/\{([a-z_]+)\}/g, (m, k) => (k in v && k !== 'unsubscribe_link' ? v[k] : m));
  const sent = (await sentMap())[t.key] || null, unsub = t.email && (await unsubList()).includes(t.email);
  const wa = t.phone ? 'https://wa.me/' + t.phone.replace(/\D/g, '').replace(/^0/, '44') + '?text=' + encodeURIComponent(await emails.plain(t.tpl, v)) : '';
  return { to: t.email, phone: t.phone, whatsapp: wa, subject: fill(tpl.subject), body: fill(tpl.body), sent, unsub: !!unsub, title: t.post.title, tplName: tpl.name };
}

async function send(kind, id, to, subject, body, by) {
  const t = await target(kind, id);
  to = String(to || t.email || '').trim().toLowerCase();
  if (!isEmail(to)) throw new HttpError(400, 'no_email', 'There’s no email address for this organiser.');
  if ((await unsubList()).includes(to)) throw new HttpError(400, 'unsubscribed', 'This organiser unsubscribed from Auntie Tobi emails.');
  const prev = (await sentMap())[t.key];
  if (prev && !prev.skipped) throw new HttpError(400, 'already', 'Already emailed on ' + String(prev.at).slice(0, 10) + '.');
  subject = core.cleanText(subject, 200); body = String(body || '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!subject || body.length < 10) throw new HttpError(400, 'invalid', 'Add a subject and the email text.');
  const v = vars(t, to), msg = emails.renderWith({ subject, body }, v, FOOTER, { noChannel: true });   // no WhatsApp Channel link in event emails (for now)
  const key = core.env('RESEND_API_KEY');
  let rid = '';
  if (!key) { if (core.env('STUDIO_EMAIL_MODE') !== 'log') throw new HttpError(500, 'email_not_configured', 'Email sending isn’t set up.'); console.log('[eventmail] (log)', to, msg.subject); rid = 'log'; }
  else {
    const unsub = v.unsubscribe_link;
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [to], reply_to: REPLY_TO(), subject: msg.subject, text: msg.text, html: msg.html, headers: { 'List-Unsubscribe': `<${unsub}>, <mailto:${REPLY_TO()}?subject=unsubscribe>` } }) });
    if (!r.ok) { console.error('[eventmail] send failed', r.status, (await r.text()).slice(0, 300)); throw new HttpError(502, 'send_failed', 'The email didn’t send — please try again in a minute.'); }
    rid = ((await r.json().catch(() => ({}))) || {}).id || '';
    if (rid) await core.setJson('out/rid/' + rid, { slug: 'ev-' + t.post.id, step: t.tpl, subject: msg.subject, at: core.nowIso() }).catch(() => {});
  }
  await cas('evm/sent', cur => { cur = cur || { items: {} }; cur.items[t.key] = { to, tpl: t.tpl, at: core.nowIso(), rid, by }; return cur; });
  if (globalThis.mailLog) globalThis.mailLog.push({ to, subject: msg.subject, text: msg.text });
  return { ok: true, to, at: core.nowIso() };
}
async function skip(kind, id, by) { const t = await target(kind, id); await cas('evm/sent', cur => { cur = cur || { items: {} }; cur.items[t.key] = { skipped: true, at: core.nowIso(), by }; return cur; }); return { ok: true }; }
// marks someone you messaged on WhatsApp instead
async function markWa(kind, id, by) { const t = await target(kind, id); await cas('evm/sent', cur => { cur = cur || { items: {} }; cur.items[t.key] = { to: t.phone, ch: 'whatsapp', tpl: t.tpl, at: core.nowIso(), by }; return cur; }); return { ok: true }; }

// For the HQ lists: what was sent, and opens / clicks
async function status() {
  const items = await sentMap(), ev = {};
  const subs = await eventsub.list(), byKey = {};
  for (const [k, x] of Object.entries(items)) {
    const appId = k.startsWith('a:') ? k.slice(2) : (subs.find(s => 's:' + s.id === k) || {}).appId;
    if (appId && !x.skipped && x.ch !== 'whatsapp') ev[k] = await getJson('out/ev/ev-' + appId).catch(() => null);
    byKey[k] = Object.assign({}, x, ev[k] ? { opens: ev[k].opens || 0, clicks: ev[k].clicks || 0 } : {});
  }
  return { items: byKey, unsub: await unsubList() };
}

// Public unsubscribe page
function page(title, body) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#0F1E36"><div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;padding:28px 24px;border-top:5px solid #057A44;line-height:1.6">${body}</div></body></html>` };
}
async function publicUnsub(q) {
  const t = String(q.evunsub || ''), email = emailFromToken(t);
  if (!email) return page('Link not valid', '<h1 style="font-size:22px">This link isn’t valid</h1><p>Please reply to the email and Auntie Tobi will sort it out.</p>');
  if (!q.yes) return page('Unsubscribe', `<h1 style="font-size:22px">Stop emails from Auntie Tobi?</h1><p style="margin:0 0 20px">You won’t get any more emails about your events. Your event stays listed.</p><form method="get" action="/.netlify/functions/app-content"><input type="hidden" name="evunsub" value="${t.replace(/[^A-Za-z0-9_.-]/g, '')}"><input type="hidden" name="yes" value="1"><button type="submit" style="background:#057A44;color:#fff;border:0;border-radius:10px;padding:13px 20px;font-size:16px;font-weight:bold;cursor:pointer">Yes, unsubscribe</button></form>`);
  await cas('evm/unsub', cur => { cur = cur || { items: [] }; if (!cur.items.some(x => x.email === email)) cur.items.push({ email, at: core.nowIso() }); return cur; });
  return page('Unsubscribed', '<h1 style="font-size:22px">You’re unsubscribed 💚</h1><p>No more emails will be sent to you about your events.</p>');
}

module.exports = { preview, send, skip, markWa, status, publicUnsub, token, emailFromToken };
