'use strict';
/*
 * 📝 Email templates you can edit in HQ → Emails.
 *   mail/tpl/<id>  { subject, body, at, by }   (only saved when you change a template; "Restore original" deletes it)
 * Body format (simple): blank line = new paragraph · "- " bullets · "1. " numbered · **bold** · links are made clickable.
 * Placeholders like {business_name} are filled in for each email.
 */
const core = require('./core');
const { getJson, setJson, del } = core;

const SIGN = '\n\nAuntie Tobi';
const STUDIO_LIST = `- Log every enquiry and get reminded who to follow up with
- Plan your posts and Reels in a simple content calendar
- Make quotes, invoices and a price list page with WhatsApp ordering
- Get help writing captions and customer replies`;
const CLUB_LIST = `- Featured Business on the Auntie Tobi app and website for 12 months
- At least one Business Spotlight on the Auntie Tobi Instagram and blog
- Your product or service on the Auntie Tobi Marketplace for 12 months
- Full Business Studio, with 20 AI credits a day`;
const BENEFITS = `1. **Featured in the app and on the website.** When people look for {category} on Auntie Tobi, Featured businesses are shown first, with your photo and a WhatsApp button.
2. **Your own Spotlight.** A dedicated post on @auntietobi_uk and the Auntie Tobi blog about your business, your story or a new offer.
3. **Discovery features.** Chances to be included in our promotional campaigns through the year.
4. **Marketplace.** Your product or service listed for 12 months.
5. **Business Growth Library.** Practical lessons, templates and tools to use at your own pace.`;

const OUT_VARS = ['business_name', 'category', 'town', 'listing_link', 'claim_link', 'remove_link', 'studio_link', 'club_link', 'personal_line'];
const T = {
  // ── Outreach: unclaimed (Auntie Tobi listed them) ──
  u1: { group: 'out-u', name: 'You’re listed', when: 'Unclaimed · day 0', subject: '{business_name} is now on Auntie Tobi 💚', body:
`Hi {business_name},{personal_line}

I’m Auntie Tobi. I help Nigerians across the UK find businesses like yours, and I’ve added {business_name} to the Auntie Tobi directory and app for free, under {category} in {town}.

Here’s your listing: {listing_link}

Please take a quick look:

- **All correct?** You don’t need to do anything.
- **Want to manage it yourself?** Claim it for free on the Auntie Tobi directory: {claim_link} and tap “Claim this listing”. You can then update your photos, description and contact details.
- **Something wrong, or you’d rather not be listed?** Reply to this email or tap here: {remove_link} and I’ll take it down.

Wishing you lots of customers,
Auntie Tobi` },
  u2: { group: 'out-u', name: 'Free Business Studio', when: 'Unclaimed · day 2 (skipped if they already use Business Studio)', subject: 'A free place to keep {business_name} organised', body:
`Hi {business_name},{personal_line}

Running a business often means juggling enquiries, orders, posts and follow-ups, all from your WhatsApp.

Auntie Tobi Business Studio is a free workspace that keeps it all in one place:

${STUDIO_LIST}

It’s free to start, and no card is needed: {studio_link}${SIGN}` },
  u3: { group: 'out-u', name: 'Business Club invite', when: 'Unclaimed · day 5', subject: 'Help more Nigerians in the UK find {business_name}', body:
`Hi {business_name},{personal_line}

Your listing on Auntie Tobi is live. If you’d like more people to find you, the Auntie Tobi Business Club is our membership for Nigerian businesses in the UK. It’s £50 for the whole year, about £4 a month.

Members get:

${CLUB_LIST}

See everything that’s included: {club_link}

Any questions? Just reply. I read every message.${SIGN}` },
  u4: { group: 'out-u', name: 'Business Club benefits + last note', when: 'Unclaimed · day 12 (last email)', subject: 'What the Business Club would do for {business_name}', body:
`Hi {business_name},

One last note from me about the Business Club, then I’ll leave you in peace.

Here’s what membership looks like in practice:

${BENEFITS}

All of this is £50 for the year: {club_link}

If now isn’t the right time, that’s completely fine. Your free listing stays, and you’re welcome to join whenever you’re ready.${SIGN}` },
  // ── Outreach: claimed, not Featured (they listed themselves) ──
  c1: { group: 'out-c', name: 'Thank you + free Business Studio', when: 'Claimed · day 0 (skipped if they already use Business Studio)', subject: 'Thank you for listing {business_name} on Auntie Tobi', body:
`Hi {business_name},{personal_line}

Thank you for listing your business on Auntie Tobi 💚

I’d love to help you stay organised too. Auntie Tobi Business Studio is a free workspace for your business:

${STUDIO_LIST}

It’s free to start, and no card is needed: {studio_link}${SIGN}` },
  c2: { group: 'out-c', name: 'Business Club invite', when: 'Claimed · day 2', subject: 'Help more Nigerians in the UK find {business_name}', body:
`Hi {business_name},{personal_line}

Thank you for being part of the Auntie Tobi directory. If you’d like more people to find you, the Auntie Tobi Business Club is our membership for Nigerian businesses in the UK. It’s £50 for the whole year, about £4 a month.

Members get:

${CLUB_LIST}

See everything that’s included: {club_link}

Any questions? Just reply. I read every message.${SIGN}` },
  c3: { group: 'out-c', name: 'Business Club benefits', when: 'Claimed · day 5', subject: 'What the Business Club would do for {business_name}', body:
`Hi {business_name},

Here’s what Business Club membership looks like in practice:

${BENEFITS}

All of this is £50 for the year: {club_link}

Any questions? Just reply.${SIGN}` },
  c4: { group: 'out-c', name: 'Short last note', when: 'Claimed · day 12 (last email)', subject: 'A last note from Auntie Tobi', body:
`Hi {business_name},

Just a short last note. If you’d like {business_name} to be a Featured Business on Auntie Tobi and promoted to Nigerians across the UK, the Business Club is £50 for 12 months: {club_link}

No pressure at all. This is my last email about it, and your listing stays just as it is.${SIGN}` },
};
for (const k of Object.keys(T)) T[k].vars = OUT_VARS;
const FOOTER_OUT = 'You’re receiving this because {business_name} is listed in the Auntie Tobi business directory. Don’t want these emails? Unsubscribe: {unsubscribe_link}';
const GROUPS = [
  { id: 'out-u', name: 'Outreach · Unclaimed businesses', note: 'Businesses Auntie Tobi listed. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.' },
  { id: 'out-c', name: 'Outreach · Claimed, not Featured', note: 'Businesses that listed themselves. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.' },
];

async function get(id) {
  const d = T[id]; if (!d) return null;
  const o = await getJson('mail/tpl/' + id).catch(() => null);
  return { id, group: d.group, name: d.name, when: d.when, vars: d.vars, subject: (o && o.subject) || d.subject, body: (o && o.body) || d.body, edited: !!o, at: (o && o.at) || '', original: { subject: d.subject, body: d.body } };
}
async function list() { return { groups: GROUPS, items: await Promise.all(Object.keys(T).map(get)) }; }
async function save(id, subject, body, who) {
  if (!T[id]) throw new core.HttpError(404, 'not_found', 'Unknown email.');
  subject = core.cleanText(subject, 200); body = String(body || '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!subject || body.length < 10) throw new core.HttpError(400, 'invalid', 'Add a subject and the email text.');
  const bad = (subject + body).match(/\{([a-z_]+)\}/g); const unknown = (bad || []).map(x => x.slice(1, -1)).filter(v => !T[id].vars.includes(v) && v !== 'unsubscribe_link');
  if (unknown.length) throw new core.HttpError(400, 'invalid', 'Unknown placeholder: {' + unknown[0] + '}. You can use: ' + T[id].vars.map(v => '{' + v + '}').join(' '));
  await setJson('mail/tpl/' + id, { subject, body, at: core.nowIso(), by: who });
  return get(id);
}
async function restore(id) { await del('mail/tpl/' + id).catch(() => {}); return get(id); }

// ── rendering ──
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, v) => String(s).replace(/\{([a-z_]+)\}/g, (m, k) => (k in v ? String(v[k] == null ? '' : v[k]) : m));
function inline(s) {
  return escH(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)’”])/g, u => `<a href="${u}" style="color:#057A44;font-weight:bold">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\?.*$/, '').slice(0, 60)}</a>`);
}
function toHtml(text) {
  return text.split(/\n{2,}/).map(par => {
    const lines = par.split('\n');
    if (lines.every(l => /^- /.test(l))) return '<ul style="padding-left:20px;margin:0 0 14px">' + lines.map(l => `<li style="margin:4px 0">${inline(l.slice(2))}</li>`).join('') + '</ul>';
    if (lines.every(l => /^\d+\. /.test(l))) return '<ol style="padding-left:20px;margin:0 0 14px">' + lines.map(l => `<li style="margin:6px 0">${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>';
    return `<p style="margin:0 0 14px">${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}
const toText = t => t.replace(/\*\*(.+?)\*\*/g, '$1');
// → { subject, text, html } with the outreach footer
function renderWith(tpl, vars, footer) {
  const v = Object.assign({}, vars);
  if (v.personal_line) v.personal_line = '\n\n' + v.personal_line; else v.personal_line = '';
  const body = fill(tpl.body, v).replace(/\n{3,}/g, '\n\n').trim(), foot = footer ? fill(footer, v) : '';
  const html = `<!doctype html><html><body style="margin:0;background:#F6F4EE"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.6;color:#0F1E36;max-width:560px;margin:0 auto;padding:20px 16px">
<div style="background:#fff;border-radius:14px;padding:22px 22px 8px;border:1px solid #ECE6D6"><div style="height:5px;background:linear-gradient(90deg,#057A44 33%,#fff 33%,#fff 66%,#057A44 66%);border-radius:3px;margin:-8px 0 18px"></div>${toHtml(body)}</div>
${foot ? `<p style="font-size:12px;color:#6B7280;margin:14px 6px">${inline(foot)}</p>` : ''}</div></body></html>`;
  return { subject: fill(tpl.subject, v).replace(/\s+/g, ' ').trim(), text: toText(body) + (foot ? '\n\n—\n' + foot : ''), html };
}
async function render(id, vars) { const t = await get(id); return renderWith(t, vars, t.group.startsWith('out-') ? FOOTER_OUT : ''); }
// Plain message for WhatsApp / Instagram (no footer, links kept)
async function plain(id, vars) { const t = await get(id); const v = Object.assign({}, vars, { personal_line: vars.personal_line ? '\n\n' + vars.personal_line : '' }); return toText(fill(t.body, v)).replace(/\n{3,}/g, '\n\n').trim(); }

module.exports = { T, GROUPS, get, list, save, restore, render, renderWith, plain, FOOTER_OUT, OUT_VARS };
