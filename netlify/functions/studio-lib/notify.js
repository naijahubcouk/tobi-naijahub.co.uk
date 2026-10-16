'use strict';
/*
 * One-off push notification to a single member (OneSignal external ID = prefs.pushId).
 * Only sent if the member switched reminders on. Best effort — never throws.
 */
const core = require('./core');
const prefs = require('./prefs');

const ONESIGNAL_APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

async function pushToMember(email, heading, message) {
  try {
    const key = core.env('ONESIGNAL_API_KEY');
    if (!key) return 'skipped (no key)';
    const pr = await prefs.get(email);
    if (!pr.remindersOn) return 'skipped (reminders off)';
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [prefs.pushId(email)] }, target_channel: 'push',
        headings: { en: heading }, contents: { en: message },
        web_url: `${siteUrl()}/studio`,
        chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
      }),
    });
    return String(res.status);
  } catch (e) { console.error('[studio] member push failed', e && e.message); return 'error'; }
}

module.exports = { pushToMember };
