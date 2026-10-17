'use strict';
/*
 * Welcome series — up to 5 messages that go automatically into each NEW member's chat with Auntie Tobi
 * over their first weeks. Runs in the hourly messages job, only between 9am and 7pm UK time.
 *
 *   msg/welcome            { on, since, steps: [{ id, days, text, on }], stats: { <stepId>: n } }
 *   msg/wel/<email>        { startedAt, sent: { <stepId>: at } }      (per member)
 *
 * Only members whose account was created after the series was switched on ("since") get it.
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson } = core;
const messages = require('./messages');
const notify = require('./notify');

const KEY = 'msg/welcome';
const progKey = e => `msg/wel/${core.enc(e)}`;
const DEFAULT_STEPS = [
  { id: 'w1', days: 0, on: true, text: 'Welcome to the Business Club, {business} 💚 I’m so glad you’re here! Start with Today → ⭐ What should I post? for ready-to-use ideas made for your business. Any questions, just reply here.' },
  { id: 'w2', days: 1, on: true, text: 'Quick tip: everything you create can be saved — tap ☆ Save to Library and find it later in Library → ★ Saved. Also try Today’s content idea: a fresh idea every day.' },
  { id: 'w3', days: 3, on: true, text: 'Have you claimed your member benefits? Get your ✅ Verified badge (Account → My benefits → Verify your Business) and add your product to the Auntie Tobi Marketplace — both help customers trust and find you.' },
  { id: 'w4', days: 7, on: true, text: 'One week in 🎉 Explore Create → All tools: 29 tools for posts, offers, customer messages and growth plans. Try the 30-day growth plan and add the actions straight to your to-do list.' },
  { id: 'w5', days: 14, on: true, text: 'How’s Business Studio working for you so far, {business}? What’s one thing you’d love it to do for your business? Just reply — I read every message 💚' },
];
const empty = () => ({ on: false, since: '', steps: DEFAULT_STEPS.map(s => ({ ...s })), stats: {} });

async function get() { const c = await getJson(KEY); return c ? { ...empty(), ...c, stats: c.stats || {} } : empty(); }

async function save(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  let out;
  await cas(KEY, cur => {
    const c = cur ? { ...empty(), ...cur } : empty();
    if (Array.isArray(raw.steps)) {
      c.steps = c.steps.map(s => {
        const r = raw.steps.find(x => x && x.id === s.id);
        if (!r) return s;
        const days = Number(r.days);
        if (!Number.isInteger(days) || days < 0 || days > 90) throw new HttpError(400, 'invalid', 'Days must be between 0 and 90.');
        const text = String(r.text || '').replace(/\r/g, '').trim();
        if (r.on !== false && text.length < 5) throw new HttpError(400, 'invalid', 'Each message that is switched on needs some text.');
        if (text.length > 2000) throw new HttpError(400, 'too_long', 'Please keep each message under 2000 characters.');
        return { id: s.id, days, text: text || s.text, on: r.on !== false };
      });
    }
    if (typeof raw.on === 'boolean') {
      if (raw.on && !c.on) c.since = c.since || core.nowIso(); // first switch-on decides who counts as "new"
      c.on = raw.on;
    }
    out = c;
    return c;
  });
  return out;
}

function ukHour(d) { return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(d || new Date())); }

/*
 * Hourly: for each active member who joined after "since", send the next due message (one per member per run).
 * opts.members (records), opts.settings, opts.now (Date, tests), opts.force (ignore the 9–19 window, tests)
 */
async function run(opts) {
  const report = { sent: 0, checked: 0, skipped: '' };
  const cfg = await get();
  if (!cfg.on || !cfg.since) { report.skipped = 'off'; return report; }
  const now = opts.now || new Date();
  const h = ukHour(now);
  if (!opts.force && (h < 9 || h >= 19)) { report.skipped = 'outside 9am–7pm'; return report; }
  const steps = cfg.steps.filter(s => s.on).sort((a, b) => a.days - b.days);
  if (!steps.length) return report;
  const started = Date.now();
  for (const m of opts.members) {
    if (Date.now() - started > 18000 || report.sent >= 150) break;
    if (!m || !m.email || !m.createdAt || m.createdAt < cfg.since) continue;
    const acc = core.access(m, opts.settings);
    if (!acc.canView) continue;
    report.checked++;
    const p = (await getJson(progKey(m.email))) || { startedAt: now.toISOString(), sent: {} };
    const days = Math.floor((now - Date.parse(p.startedAt)) / core.DAY);
    const next = steps.find(s => !p.sent[s.id] && s.days <= days);
    if (!next) { if (!(await getJson(progKey(m.email)))) await setJson(progKey(m.email), p); continue; }
    const prof = await getJson(`profiles/${core.enc(m.email)}`).catch(() => null);
    const biz = (prof && prof.businessName) || 'there';
    const text = next.text.replace(/\{business\}/g, biz);
    try {
      await messages.addMessage(m.email, 'admin', text);
      p.sent[next.id] = now.toISOString();
      await setJson(progKey(m.email), p);
      await cas(KEY, cur => (cur ? { ...cur, stats: { ...(cur.stats || {}), [next.id]: ((cur.stats || {})[next.id] || 0) + 1 } } : undefined));
      await notify.pushToMember(m.email, 'Message from Auntie Tobi 💚', text.length > 120 ? text.slice(0, 117) + '…' : text, { always: true, path: '/studio#messages' });
      report.sent++;
    } catch (e) { console.error('[studio] welcome send failed', e && e.message); }
  }
  return report;
}

module.exports = { get, save, run, DEFAULT_STEPS };
