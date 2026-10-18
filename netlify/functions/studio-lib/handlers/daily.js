'use strict';
/*
 * Runs every morning (07:52 UTC, scheduled in studio-daily.mjs). Free — no AI.
 *  1. Daily reminder push to members who turned reminders on (OneSignal tag studio_reminder = 1).
 *  2. Weekly email round-up: sent Monday (with Tuesday/Wednesday catch-up if there are many members),
 *     at most STUDIO_WEEKLY_EMAIL_MAX a day (default 60) to stay within Resend's free daily limit.
 * Scheduled functions can't be called from the public web.
 */
const core = require('../core');
const prefs = require('../prefs');
const money = require('../money');
const growth = require('../growth');
const resources = require('../resources');
const fu = require('../followups');
const benefits = require('../benefits');
const memtodo = require('../memtodo');
const notify = require('../notify');
const { siteUrl } = require('./extras');

const ONESIGNAL_APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';

async function sendReminderPush() {
  const key = core.env('ONESIGNAL_API_KEY');
  if (!key) return 'skipped (no ONESIGNAL_API_KEY)';
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      filters: [{ field: 'tag', key: 'studio_reminder', relation: '=', value: '1' }],
      headings: { en: 'Auntie Tobi Business Studio' },
      contents: { en: 'Your Business Tip for today is ready 💡 Open your Business Studio to read it.' },
      web_url: `${siteUrl()}/studio`,
      chrome_web_icon: 'https://www.auntietobi.co.uk/tobi-face-256.png',
    }),
  });
  const data = await res.json().catch(() => ({}));
  return `${res.status} recipients=${data.recipients || 0}`;
}

const gbp = p => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function buildDigest(member, acc) {
  const email = member.email;
  const [profile, sum, list, rem] = await Promise.all([
    core.getJson(`profiles/${core.enc(email)}`), growth.summary(email), money.list(email), money.reminders(email, { all: true }),
  ]);
  const lw = sum.lastWeek || { enquiries: 0, bookings: 0, salesCount: 0, salesGbp: 0, posts: 0, days: 0 };
  const lesson = acc.resources ? await resources.suggestLesson(email, profile, { thisWeek: sum.lastWeek || {}, lastWeek: {} }, { full: true, club: !!acc.membershipActive }).catch(() => null) : null;
  const name = (profile && profile.businessName) || 'your business';
  const studio = `${siteUrl()}/studio`;
  const unsub = `${siteUrl()}/.netlify/functions/studio-unsubscribe?e=${encodeURIComponent(email)}&t=${prefs.unsubToken(email)}`;
  const lines = [];
  const html = [];
  const sec = (title, rows) => { lines.push(`\n${title}`, ...rows.map(r => `• ${r}`)); html.push(`<h3 style="font-family:Georgia,serif;margin:22px 0 8px;color:#0F1E36">${escHtml(title)}</h3><ul style="padding-left:18px;margin:0">${rows.map(r => `<li style="margin-bottom:6px">${escHtml(r)}</li>`).join('')}</ul>`); };

  sec('Last week in numbers', lw.days
    ? [`${lw.enquiries} enquiries`, `${lw.bookings} bookings`, `${lw.salesCount} sales${lw.salesGbp ? ` (£${lw.salesGbp.toLocaleString('en-GB')})` : ''}`, `${lw.posts} posts recorded`]
    : ['No numbers recorded last week. Record them in Track — it takes a minute and helps you see what works.']);
  const overdue = rem.filter(r => r.kind === 'overdue');
  const quotes = rem.filter(r => r.kind === 'quote');
  const moneyRows = [];
  if (list.unpaidPence) moneyRows.push(`${gbp(list.unpaidPence)} unpaid on invoices you’ve sent`);
  if (overdue.length) moneyRows.push(`${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}: ${overdue.slice(0, 3).map(r => `${r.doc.number} (${r.doc.customer.name})`).join(', ')} — send a friendly reminder from Today`);
  if (quotes.length) moneyRows.push(`${quotes.length} quote${quotes.length > 1 ? 's' : ''} waiting for a reply — a quick follow-up often wins the job`);
  if (moneyRows.length) sec('Money', moneyRows);
  const fl = await fu.list(email).catch(() => null);
  if (fl) {
    const soon = fl.items.filter(i => i.nextAt && i.nextAt <= growth.addDays(core.dayKey(), 6));
    const rows = [];
    if (soon.length) rows.push(`${soon.length} follow-up${soon.length > 1 ? 's' : ''} due this week${soon.length ? `: ${soon.slice(0, 3).map(i => i.name).join(', ')}${soon.length > 3 ? '…' : ''}` : ''} — they’ll be on your Today screen`);
    const ls = fl.items.filter(i => i.createdAt >= new Date(Date.now() - 7 * core.DAY).toISOString());
    if (ls.length) rows.push(`${ls.length} enquir${ls.length > 1 ? 'ies' : 'y'} logged last week, ${ls.filter(i => i.stage === 'booked').length} booked so far`);
    if (rows.length) sec('Follow-ups', rows);
  }
  if (acc.membershipActive) {
    const b = await benefits.getYear(email, member).catch(() => null);
    const since = growth.addDays(core.dayKey(), -7);
    const recent = b ? benefits.feed(b.year).filter(e => e.at >= since && ['stories', 'reposts', 'discovery', 'collabs', 'spotlight'].includes(e.kind)) : [];
    if (recent.length) {
      const by = {}; for (const e of recent) by[e.label] = (by[e.label] || 0) + 1;
      const parts = Object.entries(by).map(([l, n]) => `${n} ${l.toLowerCase()}${n > 1 ? 's' : ''}`).join(', ');
      sec('From Auntie Tobi 💚', [`Last week Auntie Tobi shared your business ${recent.length} time${recent.length > 1 ? 's' : ''}: ${parts}. See the full record in Business Studio → Account → My benefits.`]);
    }
  }
  sec('This week', [
    sum.goal ? 'Read your daily Business Tip on Today — Auntie Tobi’s coaching for your business, fresh every morning.' : 'Set a goal for this week on Today — your daily Business Tips will focus on it.',
    ...(sum.tips || []).slice(0, 2),
  ]);
  if (lesson) sec('A lesson for you', [`${lesson.title} (${lesson.readMins || 3} min read) — ${lesson.reason}`]);

  const subject = `Your week ahead, ${name} 💚`;
  const text = `Good morning from Auntie Tobi Business Studio!\n${lines.join('\n')}\n\nOpen Business Studio: ${studio}\n\nYou get this weekly round-up because you have a Business Studio account. Turn it off in Business Studio → Account, or unsubscribe: ${unsub}`;
  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0F1E36;max-width:560px;margin:0 auto;padding:8px">
<div style="background:#0F1E36;color:#FBF6EC;border-radius:14px;padding:18px 18px 16px"><div style="font-family:Georgia,serif;font-size:20px;font-weight:bold">Your week ahead 💚</div><div style="color:#FFB81C;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px">${escHtml(name)}</div></div>
${html.join('')}
<p style="margin:24px 0"><a href="${studio}" style="background:#057A44;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px;display:inline-block">Open Business Studio</a></p>
<p style="font-size:12px;color:#5B6475">You get this weekly round-up because you have an Auntie Tobi Business Studio account. Turn it off in Business Studio → Account, or <a href="${unsub}" style="color:#5B6475">unsubscribe</a>.</p></div>`;
  return { subject, text, html: htmlBody, unsub };
}

async function sendWeeklyEmails(started) {
  const dow = new Date(`${core.dayKey()}T12:00:00Z`).getUTCDay(); // 1 = Monday (UK date)
  if (![1, 2, 3].includes(dow)) return 'not a send day';
  const max = Math.max(0, Number(core.env('STUDIO_WEEKLY_EMAIL_MAX', 60)) || 60);
  const settings = await core.getSettings();
  let sent = 0, checked = 0;
  for (const k of await core.listKeys('members/')) {
    if (sent >= max || Date.now() - started > 22000) break;
    const member = await core.getJson(k);
    if (!member || !member.email) continue;
    const acc = core.access(member, settings);
    if (!acc.canCreate) continue;
    checked++;
    const pr = await prefs.get(member.email);
    if (pr.weeklyEmail === false) continue;
    if (pr.lastDigestAt && Date.now() - Date.parse(pr.lastDigestAt) < 6 * core.DAY) continue;
    try {
      const d = await buildDigest(member, acc);
      const ok = await core.sendEmail([member.email], d.subject, d.text, d.html, { 'List-Unsubscribe': `<${d.unsub}>` });
      if (ok) { await prefs.markDigest(member.email); sent++; }
    } catch (e) { console.error('[studio] weekly email failed', member.email.replace(/^(.).*@/, '$1***@'), e && e.message); }
  }
  return `sent=${sent} checked=${checked}`;
}

// Each member with reminders on gets their own message: how many tasks today and overdue.
async function sendPersonalReminders(started) {
  if (!core.env('ONESIGNAL_API_KEY')) return 'skipped (no ONESIGNAL_API_KEY)';
  const settings = await core.getSettings();
  let sent = 0, checked = 0, timedOut = false;
  for (const k of await core.listKeys('prefs/')) {
    if (Date.now() - started > 12000) { timedOut = true; break; }
    const pr = await core.getJson(k);
    if (!pr || !pr.remindersOn) continue;
    const email = decodeURIComponent(k.slice('prefs/'.length));
    const member = await core.getMember(email);
    if (!member) continue;
    const acc = core.access(member, settings);
    if (!acc.canView) continue;
    checked++;
    let c = null;
    try { c = await memtodo.counts(email, member, acc); } catch (e) { console.error('[studio] todo counts failed', e && e.message); }
    const n = c ? c.today + c.overdue : 0;
    const msg = n
      ? `You have ${n} task${n === 1 ? '' : 's'} today${c.overdue ? `, ${c.overdue} overdue` : ''} 💚 Open your Business Studio to tick them off.`
      : 'Your Business Tip for today is ready 💡 Open your Business Studio to read it.';
    const r = await notify.pushToMember(email, 'Auntie Tobi Business Studio', msg);
    if (/^2/.test(r)) sent++;
  }
  return `sent=${sent} checked=${checked}${timedOut ? ' (stopped early: time limit)' : ''}`;
}

exports.handler = async () => {
  const started = Date.now();
  const report = {};
  try { report.push = await sendPersonalReminders(started); } catch (e) { report.push = `error ${e && e.message}`; }
  try { report.email = await sendWeeklyEmails(started); } catch (e) { report.email = `error ${e && e.message}`; }
  console.log('[studio] daily', JSON.stringify(report));
  return { statusCode: 200, body: JSON.stringify(report) };
};
exports.buildDigest = buildDigest;
exports.sendPersonalReminders = sendPersonalReminders;
exports.sendReminderPush = sendReminderPush;
exports.sendWeeklyEmails = sendWeeklyEmails;
