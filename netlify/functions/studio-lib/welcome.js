'use strict';
/*
 * Welcome series — up to 5 messages that go automatically into each NEW member's chat with Auntie Tobi
 * over their first weeks. Runs in the hourly messages job, only between 9am and 7pm UK time.
 *
 *   msg/welcome            { on, since, steps: [{ id, days, text, on }], stats: { <stepId>: n } }
 *   msg/wel/<email>        { startedAt, sent: { <stepId>: at }, stopped? }      (per member)
 *   msg/welcome.manual     { <email>: { at, by } }   members Admin added by hand (e.g. existing members)
 *
 * Members whose account was created after the series was switched on ("since") get it,
 * plus anyone added by hand. A member never gets the same message twice.
 *
 * Three series: 'club' (Business Club — keys above), 'plus' (Business Studio Plus/Pro without the Club) and 'free' (Free plan):
 *   msg/welcome-plus / msg/welp/<email>   (Plus)
 *   msg/welcome-free       same shape
 * Every series also has email: true|false (also send messages as a short chat-style email) and each step
 * has email: true|false (which messages go by email; missing = true).
 *   msg/welf/<email>       per member
 * The Free series stops as soon as someone upgrades.
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson } = core;
const messages = require('./messages');
const notify = require('./notify');

const SERIES = ['club', 'plus', 'free'];
const ser = x => (x === 'free' || x === 'plus' ? x : 'club');
const cfgKey = x => ({ free: 'msg/welcome-free', plus: 'msg/welcome-plus', club: 'msg/welcome' })[ser(x)];
const progKeyS = (x, e) => `${({ free: 'msg/welf/', plus: 'msg/welp/', club: 'msg/wel/' })[ser(x)]}${core.enc(e)}`;
const KEY = cfgKey('club');
const progKey = e => progKeyS('club', e);
const DEFAULT_STEPS = [
  { id: 'w1', subject: 'Welcome to the Business Club 💚', days: 0, on: true, text: 'Welcome to the Business Club, {business} 💚 I’m so glad you’re here! Start with Today → ⭐ What should I post? for ready-to-use ideas made for your business. Any questions, just reply here.' },
  { id: 'w2', subject: 'Save everything you create', days: 1, on: true, text: 'Quick tip: everything you create can be saved — tap ☆ Save to Library and find it later in Library → ★ Saved. Also try Today’s content idea: a fresh idea every day.' },
  { id: 'w3', subject: 'Claim your member benefits', days: 3, on: true, text: 'Have you claimed your member benefits? Get your ✅ Verified badge (Account → My benefits → Verify your Business) and add your product to the Auntie Tobi Marketplace — both help customers trust and find you.' },
  { id: 'w4', subject: 'One week in 🎉', days: 7, on: true, text: 'One week in 🎉 Explore Create → All tools: 29 tools for posts, offers, customer messages and growth plans. Try the 30-day growth plan and add the actions straight to your to-do list.' },
  { id: 'w5', subject: 'How’s it going, {business}?', days: 14, on: true, text: 'How’s Business Studio working for you so far, {business}? What’s one thing you’d love it to do for your business? Just reply — I read every message 💚' },
];
const FREE_STEPS = [
  { id: 'f1', days: 0, on: true, subject: 'Welcome to Auntie Tobi Business Studio 💚', text: 'Welcome to Auntie Tobi Business Studio, {business} 💚 Start with Resources → Start Here — five short, free lessons that help you see where your business is now and what to focus on first. Any questions, just reply here.' },
  { id: 'f2', days: 1, on: true, subject: 'A quick win for today', text: 'Quick win: log your last 3 enquiries in Customers. Business Studio will remind you who to follow up, so nobody who asked about your business gets forgotten.' },
  { id: 'f3', days: 3, on: true, subject: 'Not sure what to post?', text: 'Not sure what to post? Tap Create and try Post caption or Content ideas — you get 5 daily AI credits on the Free plan. Then tap 📅 Add to Plan to put it on your calendar.' },
  { id: 'f4', days: 5, on: true, subject: 'Your 5-minute Business Health Check', text: 'Have you done the Business Basics Health Check? It takes 5 minutes and shows your top 3 gaps. Your answers are saved in 📝 My Worksheets, so you can come back to them any time.' },
  { id: 'f5', days: 9, on: true, subject: 'Free tools you might have missed', text: 'Free tools you might have missed: a price list page with WhatsApp ordering, a review link & QR code, and quotes & invoices with your bank details. Find them in Account → Your links.' },
  { id: 'f6', days: 14, on: true, subject: 'Two weeks in 🎉', text: 'Two weeks in 🎉 How’s it going, {business}? If you’d like more help, Business Studio Plus (£50/year) adds 50 daily AI credits, every lesson and the full template library — and the Business Club (£50/year) adds promotion by Auntie Tobi too. Any questions, just reply — I read every message 💚' },
];
const PLUS_STEPS = [
  { id: 'p1', days: 0, on: true, subject: 'Welcome to Business Studio Plus ⭐', text: 'Welcome to Business Studio Plus, {business} ⭐ You now have 50 daily AI credits, every tool (including the advanced ones), all the Growth Lessons and the full Templates & Tools library. A good first step: Resources → Start Here.' },
  { id: 'p2', days: 1, on: true, subject: 'Plan a whole month in one go', text: 'Plan a whole month in one go: in Plan, tap ✨ Plan 7 or 30 days with AI. A 30-day plan uses 3 of your 50 daily AI credits — put the posts on your calendar, or add them to Ideas and choose the dates yourself.' },
  { id: 'p3', days: 3, on: true, subject: 'Your Templates & Tools library', text: 'Your Templates & Tools library has customer message scripts, pricing calculators, checklists and planners, grouped by what your business needs. Tap ☆ Save on the ones you’ll use again.' },
  { id: 'p4', days: 5, on: true, subject: 'Lessons picked for {business}', text: 'Do the Business Basics Health Check (5 minutes), then look at Recommended for {business} in Resources → Continue — lessons picked from your gaps and your goals.' },
  { id: 'p5', days: 10, on: true, subject: 'Get paid faster', text: 'Get paid faster: send quotes and invoices with your bank details, and share your price list page with WhatsApp ordering. Find them in Account → Your links.' },
  { id: 'p6', days: 21, on: true, subject: 'Three weeks in 🎉', text: 'Three weeks in 🎉 How is Plus working for you, {business}? Tell me one thing you’d love Business Studio to do for your business — just reply, I read every message 💚' },
];
const defaultsFor = x => ({ free: FREE_STEPS, plus: PLUS_STEPS, club: DEFAULT_STEPS })[ser(x)];
const empty = (x) => ({ on: false, since: '', steps: defaultsFor(x).map(s => ({ ...s, email: true })), stats: {}, manual: {}, email: false });
// Steps saved before per-message email choices existed count as "email this one".
const withStepEmail = st => st.map(s => ({ ...s, email: s.email !== false }));

async function get(x) { const c = await getJson(cfgKey(x)); return c ? { ...empty(x), ...c, steps: withStepEmail(c.steps || empty(x).steps), stats: c.stats || {}, manual: c.manual || {} } : empty(x); }

async function save(raw, x) {
  raw = raw && typeof raw === 'object' ? raw : {};
  x = ser(x || raw.series);
  let out;
  await cas(cfgKey(x), cur => {
    const c = cur ? { ...empty(x), ...cur } : empty(x);
    if (Array.isArray(raw.steps)) {
      c.steps = c.steps.map(s => {
        const r = raw.steps.find(x => x && x.id === s.id);
        if (!r) return s;
        const days = Number(r.days);
        if (!Number.isInteger(days) || days < 0 || days > 90) throw new HttpError(400, 'invalid', 'Days must be between 0 and 90.');
        const text = String(r.text || '').replace(/\r/g, '').trim();
        if (r.on !== false && text.length < 5) throw new HttpError(400, 'invalid', 'Each message that is switched on needs some text.');
        if (text.length > 2000) throw new HttpError(400, 'too_long', 'Please keep each message under 2000 characters.');
        const subject = r.subject !== undefined ? core.cleanText(r.subject, 120) : s.subject;
        const email = typeof r.email === 'boolean' ? r.email : s.email !== false;
        return { id: s.id, days, text: text || s.text, on: r.on !== false, email, ...(subject ? { subject } : {}) };
      });
    }
    if (typeof raw.email === 'boolean') c.email = raw.email;
    if (typeof raw.on === 'boolean') {
      // First switch-on decides who counts as "new". Optionally include people who joined in the last 14 days.
      if (raw.on && !c.on && !c.since) c.since = raw.includeRecent ? new Date(Date.now() - 14 * core.DAY).toISOString() : core.nowIso();
      c.on = raw.on;
    }
    out = c;
    return c;
  });
  return out;
}

// Add an existing member by hand: their series starts today (messages already sent are never repeated).
async function addMember(email, by, x) {
  x = ser(x);
  email = core.normalizeEmail(email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email', 'Please enter a valid email address.');
  const m = await core.getMember(email);
  if (!m) throw new HttpError(404, 'not_found', 'No member account with that email yet — they need to join first.');
  const cur = await getJson(progKeyS(x, email));
  const p = cur ? { ...cur, sent: cur.sent || {} } : { startedAt: core.nowIso(), sent: {} };
  if (cur && cur.stopped) { delete p.stopped; p.startedAt = core.nowIso(); }
  await setJson(progKeyS(x, email), p);
  let out;
  await cas(cfgKey(x), c0 => { const c = c0 ? { ...empty(x), ...c0 } : empty(x); c.manual = { ...(c.manual || {}), [email]: { at: core.nowIso(), by: by || '' } }; out = c; return c; });
  return { welcome: out, already: Object.keys(p.sent).length };
}
// Stop the series for someone added by hand.
async function removeMember(email, x) {
  x = ser(x);
  email = core.normalizeEmail(email);
  const cur = await getJson(progKeyS(x, email));
  if (cur) await setJson(progKeyS(x, email), { ...cur, stopped: true });
  let out;
  await cas(cfgKey(x), c0 => { const c = c0 ? { ...empty(x), ...c0 } : empty(x); const man = { ...(c.manual || {}) }; delete man[email]; c.manual = man; out = c; return c; });
  return out;
}

function ukHour(d) { return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(d || new Date())); }

/*
 * Hourly: for each active member who joined after "since", send the next due message (one per member per run).
 * opts.members (records), opts.settings, opts.now (Date, tests), opts.force (ignore the 9–19 window, tests)
 */
async function runSeries(opts, x) {
  const report = { sent: 0, checked: 0, skipped: '' };
  const cfg = await get(x);
  if (!cfg.on || !cfg.since) { report.skipped = 'off'; return report; }
  const now = opts.now || new Date();
  const h = ukHour(now);
  if (!opts.force && (h < 9 || h >= 19)) { report.skipped = 'outside 9am–7pm'; return report; }
  const steps = cfg.steps.filter(s => s.on).sort((a, b) => a.days - b.days);
  if (!steps.length) return report;
  const started = Date.now();
  for (const m of opts.members) {
    if (Date.now() - started > 18000 || report.sent >= 150) break;
    if (!m || !m.email) continue;
    const manual = !!cfg.manual[core.normalizeEmail(m.email)];
    if (!manual && (!m.createdAt || m.createdAt < cfg.since)) continue;
    const acc = core.access(m, opts.settings);
    // Each plan gets its own series: Club (incl. Club + Plus), Plus/Pro without the Club, Free. A series stops when the plan changes.
    const plan = acc.membershipActive ? 'club' : acc.powerActive ? 'plus' : acc.free ? 'free' : '';
    if (plan !== x) continue;
    report.checked++;
    const p = (await getJson(progKeyS(x, m.email))) || { startedAt: now.toISOString(), sent: {} };
    if (p.stopped) continue;
    p.sent = p.sent || {};
    const days = Math.floor((now - Date.parse(p.startedAt)) / core.DAY);
    const next = steps.find(s => !p.sent[s.id] && s.days <= days);
    if (!next) { if (!(await getJson(progKeyS(x, m.email)))) await setJson(progKeyS(x, m.email), p); continue; }
    const prof = await getJson(`profiles/${core.enc(m.email)}`).catch(() => null);
    const biz = (prof && prof.businessName) || 'there';
    const text = next.text.replace(/\{business\}/g, biz);
    try {
      const { msg } = await messages.addMessage(m.email, 'admin', text);
      p.sent[next.id] = now.toISOString();
      await setJson(progKeyS(x, m.email), p);
      await cas(cfgKey(x), cur => (cur ? { ...cur, stats: { ...(cur.stats || {}), [next.id]: ((cur.stats || {})[next.id] || 0) + 1 } } : undefined));
      await notify.pushToMember(m.email, 'Message from Auntie Tobi 💚', text.length > 120 ? text.slice(0, 117) + '…' : text, { always: true, path: '/studio#messages' });
      if (cfg.email && next.email !== false) {
        const ok = await sendWelcomeEmail(m.email, next, text, biz, x).catch(e => { console.error('[studio] welcome email failed', e && e.message); return false; });
        if (ok) await messages.markEmailed(m.email, msg.id, true).catch(() => {});
      }
      report.sent++;
    } catch (e) { console.error('[studio] welcome send failed', e && e.message); }
  }
  return report;
}

async function run(opts) {
  const club = await runSeries(opts, 'club');
  const plus = await runSeries(opts, 'plus');
  const free = await runSeries(opts, 'free');
  return { ...club, plus, free };
}

// Welcome email: short, chat-style, with a one-click unsubscribe (the chat message is still sent).
const REASON = {
  club: 'You’re getting this because you joined the Auntie Tobi Business Club.',
  plus: 'You’re getting this because you joined Auntie Tobi Business Studio Plus.',
  free: 'You’re getting this because you joined Auntie Tobi Business Studio.',
};
async function sendWelcomeEmail(email, step, text, biz, x) {
  const prefs = require('./prefs');
  const pr = await prefs.get(email);
  if (pr.welcomeEmail === false) return false;
  const unsub = `${core.siteBase()}/.netlify/functions/studio-unsubscribe?e=${encodeURIComponent(email)}&t=${prefs.unsubToken(email)}&k=welcome`;
  const mail = require('./msg-email').build({ text, link: core.appUrl(), button: 'Open Business Studio →', reason: REASON[ser(x)], unsub, unsubLabel: 'Stop these welcome emails' });
  return !!(await core.sendEmail([email], (step.subject || 'A message from Auntie Tobi 💚').replace(/\{business\}/g, biz), mail.text, mail.html,
    { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }));
}

module.exports = { get, save, run, runSeries, addMember, removeMember, DEFAULT_STEPS, FREE_STEPS, PLUS_STEPS, SERIES };
