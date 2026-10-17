'use strict';
/*
 * One-off push notification to a single member (OneSignal external ID = prefs.pushId).
 * Only sent if the member switched reminders on. Best effort — never throws.
 */
const core = require('./core');
const prefs = require('./prefs');

const ONESIGNAL_APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

async function pushToMember(email, heading, message, opts) {
  try {
    const key = core.env('ONESIGNAL_API_KEY');
    if (!key) return 'skipped (no key)';
    const pr = await prefs.get(email);
    // Messages from Seun go to anyone who allowed notifications on this device; other nudges only if reminders are on.
    if (!pr.remindersOn && !(opts && opts.always)) return 'skipped (reminders off)';
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [prefs.pushId(email)] }, target_channel: 'push',
        headings: { en: heading }, contents: { en: message },
        web_url: `${siteUrl()}${(opts && opts.path) || '/studio'}`,
        chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
      }),
    });
    return String(res.status);
  } catch (e) { console.error('[studio] member push failed', e && e.message); return 'error'; }
}

// One push to many members at once (e.g. an announcement). Reaches those who allowed notifications.
async function pushToMany(emails, heading, message) {
  try {
    const key = core.env('ONESIGNAL_API_KEY');
    if (!key || !emails.length) return 'skipped';
    let sent = 0;
    for (let i = 0; i < emails.length; i += 2000) {
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_aliases: { external_id: emails.slice(i, i + 2000).map(e => prefs.pushId(e)) }, target_channel: 'push',
          headings: { en: heading }, contents: { en: message },
          web_url: `${siteUrl()}/studio#messages`,
          chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
        }),
      });
      if (res.ok) sent++;
    }
    return `batches=${sent}`;
  } catch (e) { console.error('[studio] bulk push failed', e && e.message); return 'error'; }
}

module.exports = { pushToMember, pushToMany };
