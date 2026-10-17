'use strict';
/*
 * Hourly (scheduled in studio-messages-remind.mjs): if Auntie Tobi replied and the member hasn't read it for 3 hours,
 * send them one email so the reply isn't missed. One email per new reply; announcements never trigger an email.
 * Also sends the next due Welcome series message to new members (9am–7pm UK only).
 */
const core = require('../core');
const messages = require('../messages');
const welcome = require('../welcome');

const AFTER_MS = 3 * 60 * 60 * 1000, MAX_PER_RUN = 40;
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function run() {
  const started = Date.now();
  const report = { checked: 0, emailed: 0 };
  const threads = await messages.inbox();
  for (const [email, x] of Object.entries(threads)) {
    if (Date.now() - started > 20000 || report.emailed >= MAX_PER_RUN) break;
    if (x.lastFrom !== 'admin' && !(x.updatedAt && Date.now() - Date.parse(x.updatedAt) < 7 * core.DAY)) continue;
    report.checked++;
    const st = await messages.staleUnread(email, AFTER_MS);
    if (!st) continue;
    const link = `${siteUrl()}/studio#messages`;
    const preview = st.last.text.length > 400 ? st.last.text.slice(0, 400) + '…' : st.last.text;
    const text = `Hi,\n\nAuntie Tobi replied to your message in Business Studio:\n\n“${preview}”\n\nRead and reply: ${link}\n\n— Auntie Tobi Business Studio`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0F1E36;max-width:520px">
<p>Hi,</p><p>Auntie Tobi replied to your message in Business Studio:</p>
<blockquote style="margin:0 0 16px;padding:10px 14px;background:#FBF6EC;border-left:4px solid #FFB81C;border-radius:6px;white-space:pre-wrap">${esc(preview)}</blockquote>
<p><a href="${link}" style="display:inline-block;background:#057A44;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700">Read and reply</a></p>
<p style="font-size:12px;color:#5B6475">— Auntie Tobi Business Studio</p></div>`;
    try {
      const ok = await core.sendEmail([email], 'Auntie Tobi replied to your message 💬', text, html);
      if (ok) { await messages.markEmailed(email, st.last.id); report.emailed++; }
    } catch (e) { console.error('[studio] message reminder failed', e && e.message); }
  }
  return report;
}

async function runWelcome() {
  const keys = await core.listKeys('members/');
  const members = [];
  for (const k of keys) { const m = await core.getJson(k); if (m) members.push(m); }
  return welcome.run({ members, settings: await core.getSettings() });
}

async function runRenewals() {
  const members = [];
  for (const k of await core.listKeys('members/')) { const m = await core.getJson(k); if (m && m.addon) members.push(m); }
  return require('../subcare').runReminders({ members, settings: await core.getSettings() });
}

exports.run = run;
exports.runRenewals = runRenewals;
exports.runWelcome = runWelcome;
exports.handler = async () => {
  let report = {};
  try { report = await run(); } catch (e) { console.error('[studio] message reminders error', e); }
  try { report.welcome = await runWelcome(); } catch (e) { console.error('[studio] welcome series error', e); }
  try { report.renewals = await runRenewals(); } catch (e) { console.error('[studio] renewal reminders error', e); }
  console.log('[studio] message reminders', JSON.stringify(report));
  return { statusCode: 200, body: JSON.stringify(report) };
};
