'use strict';
/*
 * 🏢 HQ Business directory — one place to track every business:
 * listing (bizdir) + follow-ups & notes (invites/state, moved here from Business Studio Admin → Club invites)
 * + email journeys (out/state) + email engagement from Resend (out/ev/<slug>) + Business Studio / Business Club (members/).
 */
const core = require('./core');
const { getJson } = core;
const bizdir = require('./bizdir');
const invites = require('./invites');
const emailev = require('./emailev');

const STEP_NAME = { u1: 'You’re listed', u2: 'Free Business Studio', u3: 'Club invite', u4: 'Club benefits + last note', c1: 'Thank you + Business Studio', c2: 'Club invite', c3: 'Club benefits', c4: 'Last note', n2: 'Club invite', n3: 'Club benefits', 'biz.listed': 'You’re listed' };
const STOP_NAME = { joined: 'Joined the Business Club', finished: 'Email journey finished', unsubscribed: 'Unsubscribed', removed: 'Asked to be removed', stopped: 'Emails stopped', featured: 'Became Featured', hidden: 'Hidden', bounced: 'Email bounced (address not working)' };
// pipeline order (first match wins)
const STAGES = ['joined', 'interested', 'replied', 'notnow', 'waiting', 'emailing', 'new', 'declined', 'unsub'];
const STAGE_LABEL = { joined: '💚 Joined', interested: '👍 Interested', replied: '↩️ Replied', notnow: '⏸ Not now', waiting: '⏳ Waiting for reply', emailing: '📧 In email journey', new: '🆕 Not contacted', declined: '👎 Not interested', unsub: '🚫 Unsubscribed / removed' };

async function people() {
  const keys = await core.listKeys('members/').catch(() => []);
  const emails = keys.map(k => decodeURIComponent(k.slice(8)).toLowerCase());
  return new Set(emails);
}
async function memberFor(email) { if (!email) return null; const m = await core.getMember(email).catch(() => null); return m; }

function stageOf(b, inv, out, member) {
  if ((member && core.access(member).membershipActive) || (inv && inv.status === 'joined') || (out && out.stop === 'joined')) return 'joined';
  if (b.hidden || (out && ['unsubscribed', 'removed', 'bounced'].includes(out.stop))) return 'unsub';
  if (inv && inv.status === 'interested') return 'interested';
  if (inv && inv.status === 'declined') return 'declined';
  if (inv && inv.status === 'notnow') return 'notnow';
  if (inv && inv.repliedAt) return 'replied';
  if (inv && inv.status === 'waiting') return 'waiting';
  if (out && out.sent && out.sent.length && !out.stop) return 'emailing';
  if (out && out.sent && out.sent.length) return 'waiting';
  return 'new';
}
const monthOf = iso => String(iso || '').slice(0, 7);

// The whole list with each business's stage, last activity and what's due.
async function list() {
  const day = core.dayKey(), month = core.monthKey();
  const [dir, inv, out, studio, finder] = [await bizdir.all(), await invites.load(), (await getJson('out/state').catch(() => null)) || { biz: {} }, await people(), (await getJson('finder/state').catch(() => null)) || { items: [] }];
  const ev = await emailev.getMany(dir.filter(b => out.biz[b.slug]).map(b => b.slug));
  const clubCache = {};
  const rows = [];
  for (const b of dir) {
    const r = inv.items[b.slug], o = out.biz[b.slug], e = ev[b.slug], email = String((r && r.studioEmail) || b.email || '').toLowerCase();
    let member = null;
    if (email && studio.has(email)) { member = clubCache[email] || (clubCache[email] = await memberFor(email)); }
    const stage = stageOf(b, r, o, member);
    const acts = [];
    if (r && r.lastAt) acts.push([r.lastAt, (r.history && r.history[0] && r.history[0].what) || '']);
    if (o && o.sent && o.sent.length) { const s = o.sent[o.sent.length - 1]; acts.push([s.at, (s.ch === 'email' ? '📧 ' : '📱 ') + (STEP_NAME[s.id] || 'Email') + (s.ch === 'email' ? ' emailed' : ' sent by hand')]); }
    if (e && e.items && e.items[0]) acts.push([e.items[0].at, e.items[0].type === 'clicked' ? '🔗 Clicked a link' : e.items[0].type === 'opened' ? '👁 Opened an email' : e.items[0].type === 'bounced' ? '⚠️ Email bounced' : '🚫 Marked as spam']);
    acts.sort((x, y) => String(y[0]).localeCompare(String(x[0])));
    rows.push({
      slug: b.slug, name: b.name, cat: b.cat, loc: b.loc, email: b.email || '', wa: b.wa || '', ig: b.ig || '', phone: b.phone || '', claimed: !!b.claimed, featured: !!b.featured, verified: !!b.verified, hidden: !!b.hidden, src: b.src, img: b.img || '', waitSite: require('./bizdir').waitingSite(b),
      stage, studio: !!member, due: !!(r && stage !== 'joined' && invites.isDue(r, day)), followUpAt: (r && r.followUpAt) || '', checkBackAt: (r && r.checkBackAt) || '', nextAt: (r && r.nextAt) || '',
      last: acts[0] ? { at: acts[0][0], what: acts[0][1] } : null, opens: (e && e.opens) || 0, clicks: (e && e.clicks) || 0, lastClickAt: (e && e.lastClickAt) || '', lastOpenAt: (e && e.lastOpenAt) || '',
      emails: o && o.sent ? o.sent.filter(s => s.ch === 'email').length : 0,
    });
  }
  // this month's numbers
  const m = { contacted: 0, replied: 0, opened: 0, clicked: 0, joined: 0 };
  for (const b of dir) {
    const r = inv.items[b.slug], o = out.biz[b.slug], e = ev[b.slug];
    const firstOut = o && o.sent && o.sent[0] && o.sent[0].at;
    if ((r && monthOf(r.firstAt) === month) || monthOf(firstOut) === month) m.contacted++;
    if (r && (r.history || []).some(h => monthOf(h.at) === month && /replied|interested|not now|not interested/i.test(h.what))) m.replied++;
    if (e && (e.items || []).some(x => x.type === 'opened' && monthOf(x.at) === month)) m.opened++;
    if (e && (e.items || []).some(x => x.type === 'clicked' && monthOf(x.at) === month)) m.clicked++;
    if (r && (r.history || []).some(h => monthOf(h.at) === month && /joined/i.test(h.what))) m.joined++;
    else if (o && o.stop === 'joined' && monthOf(o.stopAt) === month) m.joined++;
  }
  m.money = m.joined * 50;
  const counts = {}; for (const s of STAGES) counts[s] = rows.filter(x => x.stage === s && !(x.hidden && s !== 'unsub')).length;
  const hot = rows.filter(x => x.stage !== 'joined' && x.lastClickAt && Date.now() - Date.parse(x.lastClickAt) < 14 * 864e5).sort((a, b) => b.lastClickAt.localeCompare(a.lastClickAt)).slice(0, 10).map(x => x.slug);
  const sentToday = Object.values(inv.items).filter(r => (r.sentDays || []).includes(day) && r.firstAt && core.dayKey(new Date(r.firstAt)) === day).length;
  return { today: day, rows, counts, stages: STAGES, stageLabel: STAGE_LABEL, month: m, hot, perDay: inv.settings.perDay, newToday: sentToday, finderAdded: (finder.items || []).filter(x => x.status === 'approved' || x.status === 'uploaded').length };
}

// One business: everything that happened, newest first.
async function detail(slug) {
  const b = (await bizdir.all()).find(x => x.slug === slug);
  if (!b) throw new core.HttpError(404, 'not_found', 'Business not found.');
  const [inv, out, e, finder] = [await invites.load(), (await getJson('out/state').catch(() => null)) || { biz: {} }, await emailev.get(slug), (await getJson('finder/state').catch(() => null)) || { items: [] }];
  const r = inv.items[slug] || { status: 'new', history: [] }, o = out.biz[slug];
  const email = String(r.studioEmail || b.email || '').toLowerCase(), member = email ? await memberFor(email) : null;
  const tl = [];
  const add = (at, icon, text, kind) => { if (at) tl.push({ at, icon, text, kind: kind || 'log' }); };
  const f = (finder.items || []).find(x => x.slug === slug);
  if (f) { add(f.foundAt, '🔎', `Found by the Business Finder (${f.query || ''})`, 'listing'); add(f.approvedAt, '✅', 'Approved — added to the app (unclaimed)', 'listing'); }
  if (b.uploadedAt) add(b.uploadedAt, '⬆️', 'Put on the directory website (CSV upload)', 'listing');
  for (const h of r.history || []) { const m = String(h.what).match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u); add(h.at, m ? m[1] : '📝', m ? m[2] : h.what, 'follow'); }
  if (o) {
    for (const s of o.sent || []) add(s.at, s.ch === 'email' ? '📧' : '📱', `${STEP_NAME[s.id] || 'Outreach email'} ${s.ch === 'email' ? 'emailed' : 'sent by WhatsApp / Instagram'}`, 'email');
    if (o.stop) add(o.stopAt, '⏹', STOP_NAME[o.stop] || 'Emails stopped', 'email');
  }
  for (const x of e.items || []) add(x.at, x.type === 'clicked' ? '🔗' : x.type === 'opened' ? '👁' : '⚠️', (x.type === 'clicked' ? 'Clicked ' + (x.link ? x.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60) : 'a link') : x.type === 'opened' ? 'Opened' : x.type === 'bounced' ? 'Bounced' : 'Marked as spam') + (x.subject ? ` · “${x.subject}”` : ''), 'engage');
  if (member) {
    add(member.createdAt, '🧰', 'Joined Business Studio', 'studio');
    if (member.lastClubPayment) add(member.lastClubPayment.at, '💚', 'Paid for the Business Club', 'studio');
  }
  tl.sort((x, y) => String(y.at).localeCompare(String(x.at)));
  const tpl = invites.templates(inv), kind = invites.nextKind(r);
  const fill = t => invites.fill(t, b);
  return {
    biz: b, stage: stageOf(b, r, o, member), stageLabel: STAGE_LABEL, rec: { status: r.status, step: r.step || 0, notes: r.notes || '', followUpAt: r.followUpAt || '', checkBackAt: r.checkBackAt || '', nextAt: r.nextAt || '', email: r.email || '', repliedAt: r.repliedAt || '', studioEmail: r.studioEmail || '' },
    timeline: tl.slice(0, 120), engage: { opens: e.opens || 0, clicks: e.clicks || 0, lastOpenAt: e.lastOpenAt || '', lastClickAt: e.lastClickAt || '', bounced: e.bounced || '', complained: e.complained || '' },
    studio: member ? { since: member.createdAt || '', club: core.access(member).membershipActive, until: member.membershipExpiresAt || '' } : null,
    journey: o ? { j: o.j, sent: o.sent.length, stop: o.stop || '' } : null,
    series: await require('./outreach').status(slug).catch(() => null),
    wa: { next: kind, invite: fill(tpl.invite), fu1: fill(tpl.fu1), fu2: fill(tpl.fu2) },
  };
}

// One-off email from HQ (tracked like the journey emails)
async function sendEmail(slug, subject, body, who) {
  const b = (await bizdir.all()).find(x => x.slug === slug);
  if (!b) throw new core.HttpError(404, 'not_found', 'Business not found.');
  const inv = await invites.load(), to = (inv.items[slug] && inv.items[slug].email) || b.email || b.ownerEmail;
  if (!to) throw new core.HttpError(400, 'no_email', 'This business has no email address — add one in Details.');
  subject = core.cleanText(subject, 200); body = String(body || '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!subject || body.length < 5) throw new core.HttpError(400, 'invalid', 'Add a subject and a message.');
  const emails = require('./emails'), out = require('./outreach');
  const msg = emails.renderWith({ subject, body }, out.vars(b), emails.FOOTER_OUT);
  const id = await out.sendOne(to, msg, slug, 'oneoff');
  if (!id) throw new core.HttpError(502, 'send_failed', 'The email didn’t send — please try again.');
  await invites.act(slug, 'messaged', { via: 'email', text: `“${msg.subject}”` });
  return { to };
}

module.exports = { list, detail, sendEmail, STAGES, STAGE_LABEL };
