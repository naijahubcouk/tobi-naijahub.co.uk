'use strict';
/*
 * 👁 Email engagement from Resend (webhook): delivered, opened, clicked, bounced, complained.
 *   out/rid/<resendEmailId>  { slug, step, subject, at }   written when HQ sends an email
 *   out/ev/<slug>            { opens, clicks, delivered, lastOpenAt, lastClickAt, bounced, complained, items: [{ at, type, step, subject, link }] }
 * A complaint (marked as spam) unsubscribes the business; a bounce stops its emails.
 */
const crypto = require('crypto');
const core = require('./core');
const { getJson, cas } = core;

// Resend signs webhooks with Svix: v1 signature = base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`))
function verify(headers, body) {
  const secret = core.env('RESEND_WEBHOOK_SECRET');
  if (!secret) return false;
  const id = headers['svix-id'], ts = headers['svix-timestamp'], sig = headers['svix-signature'];
  if (!id || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const want = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return String(sig).split(' ').some(part => { const v = part.split(',')[1] || ''; return v.length === want.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(want)); });
}

const TYPES = { 'email.delivered': 'delivered', 'email.opened': 'opened', 'email.clicked': 'clicked', 'email.bounced': 'bounced', 'email.complained': 'complained' };
async function record(evt) {
  const type = TYPES[evt && evt.type]; const d = (evt && evt.data) || {};
  if (!type || !d.email_id) return { ignored: true };
  const ref = await getJson('out/rid/' + d.email_id).catch(() => null);
  if (!ref || !ref.slug) return { ignored: true };
  const at = evt.created_at || core.nowIso(), link = type === 'clicked' && d.click ? String(d.click.link || '').slice(0, 300) : '';
  await cas('out/ev/' + ref.slug, cur => {
    const e = cur || { opens: 0, clicks: 0, delivered: 0, items: [] };
    if (type === 'opened') { e.opens++; e.lastOpenAt = at; }
    if (type === 'clicked') { e.clicks++; e.lastClickAt = at; }
    if (type === 'delivered') e.delivered++;
    if (type === 'bounced') e.bounced = at;
    if (type === 'complained') e.complained = at;
    // keep the timeline short: one "opened" per email per day
    const dup = type === 'opened' && e.items.some(x => x.type === 'opened' && x.rid === d.email_id && x.at.slice(0, 10) === at.slice(0, 10));
    if (!dup && type !== 'delivered') e.items = [{ at, type, step: ref.step, subject: ref.subject, link, rid: d.email_id }].concat(e.items).slice(0, 60);
    return e;
  });
  if (type === 'complained' || type === 'bounced') {
    await cas('out/state', cur => { cur = cur || { biz: {} }; const r = cur.biz[ref.slug] || (cur.biz[ref.slug] = { j: 'u', start: Date.now(), sent: [] }); if (!r.stop) { r.stop = type === 'complained' ? 'unsubscribed' : 'bounced'; r.stopAt = core.nowIso(); } return cur; });
    if (type === 'complained') {
      const b = (await require('./bizdir').all()).find(x => x.slug === ref.slug);
      await cas('out/unsub', cur => { cur = cur || { items: [] }; if (!cur.items.some(x => x.slug === ref.slug)) cur.items.push({ email: String((b && b.email) || '').toLowerCase(), slug: ref.slug, at: core.nowIso(), why: 'marked as spam' }); return cur; });
    }
  }
  return { ok: true, type, slug: ref.slug };
}
async function get(slug) { return (await getJson('out/ev/' + slug).catch(() => null)) || { opens: 0, clicks: 0, delivered: 0, items: [] }; }
async function getMany(slugs) { const out = {}; await Promise.all(slugs.map(async s => { const e = await getJson('out/ev/' + s).catch(() => null); if (e) out[s] = e; })); return out; }

module.exports = { verify, record, get, getMany };
