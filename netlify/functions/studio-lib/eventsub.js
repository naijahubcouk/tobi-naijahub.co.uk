'use strict';
/*
 * Public "Add your event" submissions (auntietobi.co.uk/add-event) → reviewed in Auntie Tobi HQ → live in the app.
 * No sign-in for the public, so everything here is rate-limited and capped.
 *
 *   hq/event-subs       { items: { <id>: sub } }
 *   hq/evimg/<imgId>    { dataUrl, at }        flyer images (resized in the browser)
 *   hq/evsub-ai/<day>   { n }                  site-wide AI uses per day (cost cap)
 *
 * sub: { id, status: new|approved|declined, title, eventDate, eventTime, location, body, link, imgId,
 *        contactName, contact, via: flyer|notes|manual, createdAt, updatedAt, appId?, reviewedBy?, reviewedAt? }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, setJson, cleanText } = core;
const apppub = require('./apppub');
const appai = require('./appai');
const gen = require('./generate');
const media = require('./eventmedia');

const KEY = 'hq/event-subs';
const MAX_ITEMS = 1500;
const AI_PER_IP_HOUR = 6, AI_SITE_PER_DAY = 150;
const PIC_PER_IP_DAY = 3, PIC_SITE_PER_DAY = 40;
const SUBMIT_PER_IP_HOUR = 5, SUBMIT_PER_IP_DAY = 15, SUBMIT_SITE_PER_DAY = 100;
const IMG_MAX = 1.8 * 1024 * 1024; // data URL length
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const newId = p => `${p}${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function checkImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'bad_image', 'Please upload a JPG, PNG or WebP image.');
  if (dataUrl.length > IMG_MAX) throw new HttpError(413, 'too_large', 'That image is too large — please try a smaller one.');
  return dataUrl;
}
async function saveImage(dataUrl) {
  const id = newId('e');
  await setJson(`hq/evimg/${id}`, { dataUrl: checkImage(dataUrl), at: core.nowIso() });
  return id;
}
async function getImage(id) { return /^e[a-z0-9]{6,30}$/.test(String(id || '')) ? getJson(`hq/evimg/${id}`) : null; }

async function siteCap(key, max, message) {
  await cas(key, cur => {
    const n = (cur && cur.n) || 0;
    if (n >= max) throw new HttpError(429, 'busy', message);
    return { n: n + 1 };
  });
}
async function aiAllowed(ip) {
  await core.rateLimit('evsub-ai', ip, AI_PER_IP_HOUR, 60 * 60 * 1000, 'You’ve used the AI helper a few times already — please fill in the form yourself, or try again in an hour.');
  await siteCap(`hq/evsub-ai/${core.dayKey()}`, AI_SITE_PER_DAY, 'The AI helper is resting for today — please fill in the form yourself.');
}
async function track(out) {
  const settings = await core.getSettings();
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
}

// ✨ From pasted details — same writer HQ uses.
async function aiFromNotes(notes, ip) {
  await aiAllowed(ip);
  const d = await appai.write(notes, 'event', '');
  return pickDraft(d);
}

// 🔗 From an event link — Auntie Tobi opens the page, writes the listing and takes the page's own image.
async function fromLink(url, extraNotes) {
  const page = await media.readLink(url);
  const notes = page.notes + (extraNotes ? `\n\nExtra notes:\n${String(extraNotes).slice(0, 2000)}` : '');
  const [d, image] = await Promise.all([appai.write(notes, 'event', ''), media.fetchImage(page.imageUrl)]);
  const draft = pickDraft(d);
  if (!draft.link) draft.link = appai.cleanLink(page.link);
  return { draft, image };
}
async function aiFromLink(url, ip) {
  await media.checkUrl(url);
  await aiAllowed(ip);
  return fromLink(url, '');
}

// 🎨 No flyer? Create one (public page: small daily limits because images cost more).
async function aiPicture(info, ip) {
  await core.rateLimit('evsub-pic', ip, PIC_PER_IP_DAY, 24 * 60 * 60 * 1000, 'You’ve created a few images already today — please upload your own, or send it without an image.');
  await siteCap(`hq/evsub-pic/${core.dayKey()}`, PIC_SITE_PER_DAY, 'Image creation is resting for today — please upload your own, or send it without an image.');
  return media.makePicture(info);
}

// 🖼️ From a flyer — the AI reads the image and writes the event.
async function aiFromImage(dataUrl, ip) {
  checkImage(dataUrl);
  await aiAllowed(ip);
  return readFlyer(dataUrl);
}
async function readFlyer(dataUrl) {
  checkImage(dataUrl);
  const settings = await core.getSettings();
  const today = core.dayKey();
  const messages = [
    { role: 'system', content:
`You read event flyers for the Auntie Tobi app (a warm UK guide for Nigerians in the UK) and write the event listing as "Auntie Tobi": friendly, clear, British English.
STRICT: use ONLY what is visible on the flyer. Never invent prices, times, places, names, links or details. If something isn't on the flyer, leave it empty. Today is ${today}; a date without a year is the next upcoming one.
If the image is not an event flyer, return {"notAnEvent": true}.
BODY FORMAT (plain text): short paragraphs separated by a blank line; a heading is its own short line ending with "?" or ":"; bullets start with "• "; **bold** sparingly. Do NOT repeat the date, time or place at the top (the app shows them separately). Mention prices/dress code/who it's for only if on the flyer. End with a short line inviting people to share it.
Return ONLY JSON: {"title": string (max 90 chars, starts with ONE fitting emoji, Title Case), "body": string (80–200 words), "eventDate": "YYYY-MM-DD" or "", "eventTime": e.g. "6pm – 11pm" or "", "location": venue and address/city or "", "link": a booking/ticket URL printed on the flyer or ""}` },
    { role: 'user', content: [{ type: 'text', text: 'Write the event listing from this flyer.' }, { type: 'image_url', image_url: { url: dataUrl } }] },
  ];
  const out = await gen.callModel(messages, 900, settings, { json: true, raw: true });
  track(out);
  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'We couldn’t read that flyer — please paste the details or fill in the form.'); }
  if (j.notAnEvent) throw new HttpError(400, 'not_event', 'That doesn’t look like an event flyer — please try another image, or fill in the form.');
  return pickDraft({ title: j.title, body: j.body, eventDate: j.eventDate, eventTime: j.eventTime, location: j.location, link: appai.cleanLink(j.link) });
}

function pickDraft(d) {
  return {
    title: cleanText(d.title, 160), body: multi(d.body, 6000),
    eventDate: isDay(d.eventDate) ? d.eventDate : '', eventTime: cleanText(d.eventTime, 60),
    location: cleanText(d.location, 160), link: appai.cleanLink(d.link),
  };
}

function cleanSub(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const out = {
    title: cleanText(raw.title, 160),
    eventDate: isDay(raw.eventDate) ? raw.eventDate : '',
    eventTime: cleanText(raw.eventTime, 60),
    location: cleanText(raw.location, 160),
    body: multi(raw.body, 6000),
    link: appai.cleanLink(raw.link),
    contactName: cleanText(raw.contactName, 80),
    contact: cleanText(raw.contact, 120),
    via: ['flyer', 'link', 'notes', 'manual'].includes(raw.via) ? raw.via : 'manual',
  };
  if (!out.title) throw new HttpError(400, 'title_required', 'Please add the event name.');
  if (!out.eventDate) throw new HttpError(400, 'date_required', 'Please add the event date.');
  if (out.eventDate < core.dayKey()) throw new HttpError(400, 'date_past', 'That date has already passed — please check it.');
  if (!out.location) throw new HttpError(400, 'place_required', 'Please add where the event is.');
  if (!out.contactName || !out.contact) throw new HttpError(400, 'contact_required', 'Please add your name and an email or WhatsApp number, so Auntie Tobi can contact you if needed.');
  return out;
}

async function submit(raw, ip) {
  if (raw && raw.website) return { ok: true }; // spam trap (hidden field real people never fill)
  await core.rateLimit('evsub-ip-h', ip, SUBMIT_PER_IP_HOUR, 60 * 60 * 1000, 'You’ve sent a few events already — please try again later.');
  await core.rateLimit('evsub-ip-d', ip, SUBMIT_PER_IP_DAY, 24 * 60 * 60 * 1000, 'You’ve sent a few events already today — please try again tomorrow.');
  const sub = cleanSub(raw);
  await siteCap(`hq/evsub-n/${core.dayKey()}`, SUBMIT_SITE_PER_DAY, 'We’ve had lots of events today — please try again tomorrow.');
  sub.imgId = raw.image ? await saveImage(raw.image) : '';
  const now = core.nowIso();
  const item = { ...sub, id: newId('s'), status: 'new', createdAt: now, updatedAt: now };
  await cas(KEY, cur => {
    cur = cur || { items: {} };
    const ids = Object.keys(cur.items);
    if (ids.length >= MAX_ITEMS) { // drop the oldest reviewed ones
      Object.values(cur.items).filter(x => x.status !== 'new').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, 50).forEach(x => { delete cur.items[x.id]; });
    }
    cur.items[item.id] = item;
    return cur;
  });
  notify(item).catch(() => {});
  return { ok: true };
}

async function notify(s) {
  const to = core.adminEmails();
  if (!to.length) return;
  const site = core.env('STUDIO_SITE_URL', 'https://www.auntietobi.co.uk').replace(/\/$/, '');
  const text = `A new event has been sent in for the Auntie Tobi app.\n\n${s.title}\n${s.eventDate}${s.eventTime ? ' · ' + s.eventTime : ''}\n${s.location}\n\nFrom: ${s.contactName} (${s.contact})\n\nReview it in HQ: ${site}/hq#subs`;
  try { await core.sendEmail(to, `[Auntie Tobi HQ] New event: ${s.title}`, text); } catch (e) { console.error('[evsub] email failed', e && e.message); }
}

async function list() {
  const cur = (await getJson(KEY)) || { items: {} };
  return Object.values(cur.items).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function review(id, status, by, edits) {
  let out;
  await cas(KEY, cur => {
    const s = cur && cur.items[id];
    if (!s) throw new HttpError(404, 'not_found', 'That submission no longer exists.');
    out = { ...s, ...(edits || {}), status, reviewedBy: by, reviewedAt: core.nowIso(), updatedAt: core.nowIso() };
    cur.items[id] = out;
    return cur;
  });
  return out;
}

// Approve: publish (or update) the event in the app, with any edits made in HQ.
async function approve(id, item, by) {
  const subs = await list();
  const s = subs.find(x => x.id === id);
  if (!s) throw new HttpError(404, 'not_found', 'That submission no longer exists.');
  const src = item && typeof item === 'object' ? item : s;
  const post = await apppub.save({
    id: s.appId || undefined, kind: 'event', status: 'live',
    title: src.title, body: src.body || '', link: src.link || '', eventDate: src.eventDate, eventTime: src.eventTime || '', location: src.location || '',
    summary: src.summary || '', imgId: src.imgId !== undefined && item ? src.imgId : (s.imgId || ''),
  }, by);
  await review(id, 'approved', by, { appId: post.id, imgId: post.imgId || '', title: post.title, eventDate: post.eventDate, eventTime: post.eventTime, location: post.location, body: post.body, link: post.link });
  return post;
}

async function decline(id, by) { return review(id, 'declined', by); }

async function remove(id) {
  let img = '';
  await cas(KEY, cur => {
    if (!cur || !cur.items[id]) return undefined;
    img = cur.items[id].imgId || '';
    delete cur.items[id];
    return cur;
  });
  if (img) {
    const used = (await apppub.list()).some(p => p.imgId === img);
    if (!used) await core.del(`hq/evimg/${img}`).catch(() => {});
  }
  return true;
}

module.exports = { aiFromNotes, aiFromImage, aiFromLink, aiPicture, fromLink, readFlyer, saveImage, checkImage, submit, list, approve, decline, remove, getImage };
