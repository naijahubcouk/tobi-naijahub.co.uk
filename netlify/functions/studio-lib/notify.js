'use strict';
/*
 * One-off push notification to a single member (OneSignal external ID = prefs.pushId).
 * Only sent if the member switched reminders on. Best effort — never throws.
 */
const core = require('./core');
const prefs = require('./prefs');

const ONESIGNAL_APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';
// OneSignal allows one web address per app, so the app's own address (STUDIO_APP_URL) has its own OneSignal app.
// Pushes go to both; each member is only subscribed on one, so nobody gets two.
function apps() {
  const out = [];
  const k = core.env('ONESIGNAL_API_KEY'); if (k) out.push({ id: ONESIGNAL_APP_ID, key: k });
  const sid = core.env('STUDIO_ONESIGNAL_APP_ID'), sk = core.env('STUDIO_ONESIGNAL_API_KEY');
  if (sid && sk) out.push({ id: sid, key: sk });
  return out;
}
async function sendAll(payload) {
  const res = [];
  for (const a of apps()) {
    const r = await fetch('https://onesignal.com/api/v1/notifications', { method: 'POST', headers: { Authorization: `Key ${a.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: a.id, ...payload }) });
    res.push(r);
  }
  return res;
}
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

async function pushToMember(email, heading, message, opts) {
  try {
    if (!apps().length) return 'skipped (no key)';
    const pr = await prefs.get(email);
    // Messages from Auntie Tobi go to anyone who allowed notifications on this device; other nudges only if reminders are on.
    if (!pr.remindersOn && !(opts && opts.always)) return 'skipped (reminders off)';
    const out = await sendAll({
        include_aliases: { external_id: [prefs.pushId(email)] }, target_channel: 'push',
        headings: { en: heading }, contents: { en: message },
        web_url: (p => (p.startsWith('/studio') && !p.startsWith('/studio-') ? core.appUrl() + p.slice(7) : `${siteUrl()}${p}`))((opts && opts.path) || '/studio'),
        chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
    });
    return out.map(r => r.status).join(',');
  } catch (e) { console.error('[studio] member push failed', e && e.message); return 'error'; }
}

// One push to many members at once (e.g. an announcement). Reaches those who allowed notifications.
async function pushToMany(emails, heading, message) {
  try {
    if (!apps().length || !emails.length) return 'skipped';
    let sent = 0;
    for (let i = 0; i < emails.length; i += 2000) {
      const out = await sendAll({
          include_aliases: { external_id: emails.slice(i, i + 2000).map(e => prefs.pushId(e)) }, target_channel: 'push',
          headings: { en: heading }, contents: { en: message },
          web_url: `${core.appUrl()}#messages`,
          chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
      });
      if (out.some(r => r.ok)) sent++;
    }
    return `batches=${sent}`;
  } catch (e) { console.error('[studio] bulk push failed', e && e.message); return 'error'; }
}

module.exports = { pushToMember, pushToMany, sendAll, apps };
