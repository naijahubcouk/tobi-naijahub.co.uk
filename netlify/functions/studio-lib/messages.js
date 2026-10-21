'use strict';
/*
 * Admin ↔ member messages (Business Studio). Text only. Each member has one private thread with Auntie Tobi.
 *
 *   msg/thread/<email>   { email, messages: [{ id, from: 'member'|'admin', text, at }], memberReadAt, adminReadAt, done, emailedFor }
 *   msg/index            { threads: { <email>: { updatedAt, lastText, lastFrom, unreadAdmin, done } } }   (Admin inbox)
 *   msg/announce         { items: [{ id, text, audience: 'all'|'club'|'pro', at, by }] }                  (shown in every matching chat)
 *   msg/quick            { replies: [] }                                                                   (Admin quick replies)
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, setJson } = core;

const MAX_TEXT = 2000, KEEP = 500, ANN_KEEP = 100;
const AUDIENCES = ['all', 'club', 'pro'];
const DEFAULT_QUICK = [
  'Thanks for your message 💚 I’ll look into this today.',
  'Thank you! That’s sorted now — let me know if anything else comes up.',
  'Could you send me a bit more detail so I can help properly?',
  'Great question! Here’s what I’d suggest:',
];
const enc = e => encodeURIComponent(core.normalizeEmail(e));
const tKey = e => `msg/thread/${enc(e)}`;
const newId = () => `m${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const cleanMsg = t => String(t || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{4,}/g, '\n\n\n').trim();

function checkText(text) {
  text = cleanMsg(text);
  if (!text) throw new HttpError(400, 'invalid', 'Type a message first.');
  if (text.length > MAX_TEXT) throw new HttpError(400, 'too_long', `Please keep messages under ${MAX_TEXT} characters.`);
  return text;
}
const emptyThread = email => ({ email: core.normalizeEmail(email), messages: [], memberReadAt: '', adminReadAt: '', done: false });

async function thread(email) { return (await getJson(tKey(email))) || emptyThread(email); }

// Who an announcement is for.
function inAudience(acc, audience) {
  if (!acc || !acc.canView) return false;
  if (audience === 'club') return !!acc.membershipActive;
  if (audience === 'pro') return !!acc.powerActive;
  return true;
}
async function announcementsFor(acc) {
  const a = (await getJson('msg/announce')) || { items: [] };
  return a.items.filter(x => inAudience(acc, x.audience)).map(x => ({ id: x.id, from: 'admin', text: x.text, at: x.at, announce: true }));
}

// ── member side ──
async function memberView(email, acc, markRead) {
  const t = await thread(email);
  const ann = await announcementsFor(acc);
  const all = t.messages.concat(ann).sort((a, b) => a.at.localeCompare(b.at)).slice(-300);
  const unread = all.filter(m => m.from === 'admin' && m.at > (t.memberReadAt || '')).length;
  let readAt = t.memberReadAt || '';
  if (markRead && unread) {
    readAt = core.nowIso();
    await cas(tKey(email), cur => ({ ...(cur || emptyThread(email)), memberReadAt: readAt }));
  }
  return { messages: all.map(m => ({ ...m, seen: m.from === 'member' ? !!t.adminReadAt && t.adminReadAt >= m.at : undefined })), unread: markRead ? 0 : unread, adminReadAt: t.adminReadAt || '' };
}
async function memberUnread(email, acc) {
  const t = await thread(email);
  const ann = await announcementsFor(acc);
  return t.messages.concat(ann).filter(m => m.from === 'admin' && m.at > (t.memberReadAt || '')).length;
}

async function addMessage(email, from, text) {
  email = core.normalizeEmail(email);
  text = checkText(text);
  const msg = { id: newId(), from, text, at: core.nowIso() };
  let firstUnread = false;
  await cas(tKey(email), cur => {
    const t = cur ? { ...cur, messages: [...cur.messages] } : emptyThread(email);
    if (from === 'member') { firstUnread = !t.messages.some(m => m.from === 'member' && m.at > (t.adminReadAt || '')); t.done = false; t.memberReadAt = msg.at; }
    else { t.adminReadAt = msg.at; t.emailedFor = t.emailedFor || ''; }
    t.messages.push(msg);
    if (t.messages.length > KEEP) t.messages = t.messages.slice(-KEEP);
    t.updatedAt = msg.at;
    return t;
  });
  await touchIndex(email);
  return { msg, firstUnread };
}

// Keep the Admin inbox summary in step with a thread.
async function touchIndex(email) {
  const t = await thread(email);
  const last = t.messages[t.messages.length - 1];
  const unreadAdmin = t.messages.filter(m => m.from === 'member' && m.at > (t.adminReadAt || '')).length;
  await cas('msg/index', cur => {
    const ix = cur ? { threads: { ...cur.threads } } : { threads: {} };
    if (!last) { delete ix.threads[t.email]; return ix; }
    ix.threads[t.email] = { updatedAt: last.at, lastText: last.text.slice(0, 140), lastFrom: last.from, unreadAdmin, done: !!t.done };
    return ix;
  });
}

// ── admin side ──
async function inbox() { return ((await getJson('msg/index')) || { threads: {} }).threads; }

async function adminThread(email) {
  email = core.normalizeEmail(email);
  let t = await thread(email);
  if (t.messages.some(m => m.from === 'member' && m.at > (t.adminReadAt || ''))) {
    const now = core.nowIso();
    await cas(tKey(email), cur => (cur ? { ...cur, adminReadAt: now } : undefined));
    t = { ...t, adminReadAt: now };
    await touchIndex(email);
  }
  return { email, messages: t.messages.map(m => ({ ...m, seen: m.from === 'admin' ? !!t.memberReadAt && t.memberReadAt >= m.at : undefined })), done: !!t.done, memberReadAt: t.memberReadAt || '' };
}

async function setDone(email, done) {
  email = core.normalizeEmail(email);
  const t = await getJson(tKey(email));
  if (!t) throw new HttpError(404, 'not_found', 'No conversation with that member yet.');
  await cas(tKey(email), cur => ({ ...cur, done: !!done }));
  await touchIndex(email);
}

async function unreadForAdmin() {
  const th = await inbox();
  return Object.values(th).reduce((n, x) => n + (x.unreadAdmin || 0), 0);
}

// ── quick replies ──
async function quick() { const q = await getJson('msg/quick'); return q && Array.isArray(q.replies) ? q.replies : DEFAULT_QUICK.slice(); }
async function saveQuick(list) {
  const replies = (Array.isArray(list) ? list : []).map(cleanMsg).filter(Boolean).slice(0, 20).map(x => x.slice(0, 500));
  await setJson('msg/quick', { replies, updatedAt: core.nowIso() });
  return replies;
}

// ── announcements ──
async function announcements() { return ((await getJson('msg/announce')) || { items: [] }).items.slice().reverse(); }
async function announce(text, audience, by) {
  text = checkText(text);
  if (!AUDIENCES.includes(audience)) throw new HttpError(400, 'invalid', 'Choose who it’s for.');
  const item = { id: newId(), text, audience, at: core.nowIso(), by: by || '' };
  await cas('msg/announce', cur => {
    const a = cur ? { items: [...cur.items] } : { items: [] };
    a.items.push(item);
    if (a.items.length > ANN_KEEP) a.items = a.items.slice(-ANN_KEEP);
    return a;
  });
  return item;
}
async function deleteAnnouncement(id) {
  let n = 0;
  await cas('msg/announce', cur => { if (!cur) return undefined; const items = cur.items.filter(x => x.id !== id); n = cur.items.length - items.length; return { items }; });
  if (!n) throw new HttpError(404, 'not_found', 'That announcement no longer exists.');
}

// ── saved announcement messages (reusable drafts) ──  msg/annsaved { items: [{ id, title, text, audience }] }
const DEFAULT_SAVED = [
  { id: 'sfeedback', title: 'Ask for feedback', audience: 'all', text: 'Hi everyone 💚 Business Studio has lots of new tools this week. I’d love your help making it even better:\n1. Which tool do you use most?\n2. What’s one thing that’s confusing or not working?\n3. What would you love Business Studio to do for your business?\nJust reply here — I read every message!' },
  { id: 'snewtools', title: 'New tools are live', audience: 'all', text: 'New in Business Studio 🎉 Open Create → All tools to try them. Tell me which one helps you most!' },
  { id: 'slive', title: 'Live session reminder', audience: 'club', text: 'Our next Business Club live session is on [day] at [time] 🎉 Bring your questions — see you there!' },
];
async function savedAnnouncements() { const s = await getJson('msg/annsaved'); return s && Array.isArray(s.items) ? s.items : DEFAULT_SAVED.slice(); }
async function saveAnnouncementDraft(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const text = checkText(raw.text);
  const title = core.cleanText(raw.title, 60) || text.split('\n')[0].slice(0, 40);
  const audience = AUDIENCES.includes(raw.audience) ? raw.audience : 'all';
  const items = await savedAnnouncements();
  const id = /^s[a-z0-9]{3,30}$/.test(String(raw.id || '')) && items.some(x => x.id === raw.id) ? raw.id : newId().replace(/^m/, 's');
  const next = items.filter(x => x.id !== id);
  const pos = items.findIndex(x => x.id === id);
  const item = { id, title, text, audience };
  if (pos >= 0) next.splice(pos, 0, item); else next.unshift(item);
  if (next.length > 30) throw new HttpError(400, 'too_many', 'You have 30 saved messages — delete some first.');
  await setJson('msg/annsaved', { items: next, updatedAt: core.nowIso() });
  return next;
}
async function deleteAnnouncementDraft(id) {
  const items = (await savedAnnouncements()).filter(x => x.id !== String(id || ''));
  await setJson('msg/annsaved', { items, updatedAt: core.nowIso() });
  return items;
}

// Replies the member hasn't read for a while (for the reminder email). Direct replies only, not announcements.
async function staleUnread(email, olderThanMs) {
  const t = await getJson(tKey(email));
  if (!t) return null;
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const pending = t.messages.filter(m => m.from === 'admin' && m.at > (t.memberReadAt || '') && m.at <= cutoff);
  if (!pending.length) return null;
  const last = pending[pending.length - 1];
  if (t.emailedFor && t.emailedFor >= last.id) return null;
  return { last, count: pending.length };
}
// Remember that a reply was emailed (so the unread reminder doesn't email it again) and flag the message for Admin.
async function markEmailed(email, id) {
  await cas(tKey(email), cur => (cur ? { ...cur, emailedFor: cur.emailedFor && cur.emailedFor > id ? cur.emailedFor : id, messages: cur.messages.map(m => (m.id === id ? { ...m, emailed: true } : m)) } : undefined));
}

module.exports = { savedAnnouncements, saveAnnouncementDraft, deleteAnnouncementDraft, memberView, memberUnread, addMessage, inbox, adminThread, setDone, unreadForAdmin, quick, saveQuick, announcements, announce, deleteAnnouncement, inAudience, staleUnread, markEmailed, AUDIENCES, MAX_TEXT };
