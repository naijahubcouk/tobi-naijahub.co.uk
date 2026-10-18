'use strict';
/*
 * Ideas from members: a new tool, a lesson or template, an improvement, anything else.
 *   suggestions/index   { items: [{ id, email, business, kind, text, at, status, reply, repliedAt, updatedAt }] }   (newest first, up to 1,000)
 * status: new → planned → done, or declined. Members see their own ideas and your reply.
 */
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;

const KEY = 'suggestions/index';
const KINDS = { tool: 'A new tool or feature', resource: 'A lesson or template', improve: 'Make something better', other: 'Something else' };
const STATUSES = { new: 'New', planned: 'Planned', done: 'Done', declined: 'Not now' };
const MAX = 1000;

function publicItem(s) { return { id: s.id, kind: s.kind, text: s.text, at: s.at, status: s.status, reply: s.reply || '', repliedAt: s.repliedAt || '' }; }

async function add(email, raw) {
  const kind = KINDS[raw && raw.kind] ? raw.kind : 'other';
  const text = String((raw && raw.text) || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 1500);
  if (text.length < 5) throw new HttpError(400, 'missing_field', 'Tell us your idea in a sentence or two.');
  const profile = await getJson(`profiles/${core.enc(email)}`).catch(() => null);
  const item = { id: `s${Date.now().toString(36)}${core.randomToken(4).replace(/[^A-Za-z0-9]/g, '').slice(0, 4)}`, email: core.normalizeEmail(email), business: cleanText(profile && profile.businessName, 80), kind, text, at: core.nowIso(), status: 'new', reply: '' };
  await cas(KEY, cur => ({ items: [item, ...((cur && cur.items) || [])].slice(0, MAX) }));
  await core.emailAdmins(`New idea from ${item.business || item.email}: ${KINDS[kind]}`,
    `${item.business ? item.business + ' (' + item.email + ')' : item.email} suggested:\n\n${KINDS[kind]}\n\n${text}\n\nSee all ideas in Business Studio Admin → Ideas.`).catch(() => {});
  return publicItem(item);
}

async function mine(email) {
  const e = core.normalizeEmail(email);
  const all = ((await getJson(KEY)) || { items: [] }).items;
  return all.filter(s => s.email === e).slice(0, 30).map(publicItem);
}

async function adminList() {
  const items = ((await getJson(KEY)) || { items: [] }).items;
  return { items, kinds: KINDS, statuses: STATUSES, counts: Object.fromEntries(Object.keys(STATUSES).map(k => [k, items.filter(s => s.status === k).length])) };
}

// Update status and/or reply. A new reply is emailed to the member.
async function adminUpdate(actor, id, raw) {
  let out = null, emailReply = false;
  await cas(KEY, cur => {
    const items = ((cur && cur.items) || []).slice();
    const i = items.findIndex(s => s.id === id);
    if (i < 0) throw new HttpError(404, 'not_found', 'That idea no longer exists.');
    const s = { ...items[i] };
    if (raw.status !== undefined) { if (!STATUSES[raw.status]) throw new HttpError(400, 'invalid', 'Invalid status.'); s.status = raw.status; }
    if (raw.reply !== undefined) {
      const r = String(raw.reply || '').replace(/\r/g, '').trim().slice(0, 1500);
      if (r && r !== s.reply) { s.repliedAt = core.nowIso(); emailReply = true; }
      s.reply = r;
    }
    s.updatedAt = core.nowIso(); s.updatedBy = actor;
    items[i] = s; out = s;
    return { items };
  });
  if (emailReply && out.reply) {
    await core.sendEmail([out.email], 'Auntie Tobi replied to your idea',
      `Thank you for your idea for Business Studio:\n\n“${out.text.slice(0, 300)}”\n\nAuntie Tobi says:\n${out.reply}\n\nStatus: ${STATUSES[out.status]}\n\nAuntie Tobi 💚`).catch(() => {});
  }
  return out;
}

async function adminDelete(id) {
  await cas(KEY, cur => (cur ? { items: cur.items.filter(s => s.id !== id) } : undefined));
}

module.exports = { add, mine, adminList, adminUpdate, adminDelete, KINDS, STATUSES };
