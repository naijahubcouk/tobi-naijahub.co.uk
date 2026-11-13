'use strict';
/*
 * 📬 School emails → School Tracker (HQ, admin only).
 * A small Google Apps Script runs inside Seun's Gmail (every 10 minutes) and forwards new school emails to her
 * School Tracker address. HQ keeps its web-app link + a secret key so the HQ button can say "check now",
 * show the last check, and switch the automatic checks on/off.
 *   hq/schoolsync  { url, key, tracker, connectedAt, last: { at, sent: [{ subject, from, date }], error } }
 * Nothing in Gmail is changed apart from a "Sent to Tracker" label on the emails it forwarded.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson } = core;

const KEY = 'hq/schoolsync';
const DEFAULT_TRACKER = 'seun-c9748@inbox.auntietobi.co.uk';
const URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/;

async function cfg() {
  let c = await getJson(KEY).catch(() => null);
  if (!c || !c.key) {
    await cas(KEY, cur => { cur = cur || {}; if (!cur.key) cur.key = crypto.randomBytes(18).toString('base64url'); if (!cur.tracker) cur.tracker = DEFAULT_TRACKER; return cur; });
    c = await getJson(KEY);
  }
  return c;
}

const pub = c => ({ connected: !!c.url, key: c.key, tracker: c.tracker || DEFAULT_TRACKER, connectedAt: c.connectedAt || null, last: c.last || null, script: c.script || null });

// Talk to the Gmail script (GET, it follows Google's redirect). Returns its JSON.
async function ask(url, key, params) {
  const q = new URLSearchParams(Object.assign({ key }, params || {})).toString();
  let res, text;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
    res = await fetch(url + '?' + q, { redirect: 'follow', signal: ctl.signal });
    clearTimeout(t);
    text = await res.text();
  } catch (e) { throw new HttpError(502, 'gmail_script', 'Couldn’t reach your Gmail script — try again in a minute.'); }
  let j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!j) {
    if (/accounts\.google\.com|ServiceLogin|signin/i.test(text)) throw new HttpError(400, 'gmail_script', 'Google asked for a sign-in. In the deployment, set “Who has access” to “Anyone”, then deploy again.');
    throw new HttpError(502, 'gmail_script', 'Your Gmail script didn’t answer properly. Check you pasted the Web app link (it ends in /exec).');
  }
  if (j.error === 'key') throw new HttpError(400, 'gmail_script', 'The script’s secret key doesn’t match HQ. Copy the script from HQ again, paste it over the old one, save, and deploy a new version.');
  if (j.error) throw new HttpError(502, 'gmail_script', 'Gmail script: ' + String(j.error).slice(0, 200));
  return j;
}

function keep(c, j) {
  if (j && j.last) c.last = { at: j.last.at || core.nowIso(), sent: (j.last.sent || []).slice(0, 30).map(x => ({ subject: String(x.subject || '').slice(0, 160), from: String(x.from || '').slice(0, 120), date: String(x.date || '').slice(0, 40) })), error: j.last.error ? String(j.last.error).slice(0, 200) : '' };
  if (j && j.recent) c.recent = j.recent.slice(0, 20).map(x => ({ subject: String(x.subject || '').slice(0, 160), from: String(x.from || '').slice(0, 120), at: String(x.at || '').slice(0, 40) }));
  if (j && typeof j.auto === 'boolean') c.script = { auto: j.auto, version: j.version || 1 };
}

async function act(action, body) {
  body = body || {};
  let c = await cfg();
  if (action === 'ss-get') {
    if (c.url && body.refresh) { try { const j = await ask(c.url, c.key, { do: 'status' }); await cas(KEY, cur => { keep(cur, j); return cur; }); c = await getJson(KEY); } catch (e) { return Object.assign(pub(c), { recent: c.recent || [], warn: e.message }); } }
    return Object.assign(pub(c), { recent: c.recent || [] });
  }
  if (action === 'ss-connect') {
    const url = String(body.url || '').trim().replace(/\?.*$/, '');
    if (!URL_RE.test(url)) throw new HttpError(400, 'invalid', 'Paste the Web app link from Deploy — it looks like https://script.google.com/macros/s/…/exec');
    const j = await ask(url, c.key, { do: 'status' });
    await cas(KEY, cur => { cur.url = url; cur.connectedAt = core.nowIso(); keep(cur, j); return cur; });
    return Object.assign(pub(await getJson(KEY)), { recent: (await getJson(KEY)).recent || [] });
  }
  if (!c.url) throw new HttpError(400, 'not_connected', 'Connect your Gmail script first.');
  if (action === 'ss-run') {
    const j = await ask(c.url, c.key, { do: 'run' });
    await cas(KEY, cur => { keep(cur, j); return cur; });
    const n = await getJson(KEY);
    return Object.assign(pub(n), { recent: n.recent || [], ran: j.last || null });
  }
  if (action === 'ss-auto') {
    const j = await ask(c.url, c.key, { do: 'auto', on: body.on ? '1' : '0' });
    await cas(KEY, cur => { keep(cur, j); return cur; });
    const n = await getJson(KEY);
    return Object.assign(pub(n), { recent: n.recent || [] });
  }
  if (action === 'ss-disconnect') {
    await cas(KEY, cur => { delete cur.url; delete cur.connectedAt; delete cur.script; return cur; });
    return Object.assign(pub(await getJson(KEY)), { recent: [] });
  }
  throw new HttpError(400, 'invalid', 'Unknown action.');
}

module.exports = { act, URL_RE, DEFAULT_TRACKER };
