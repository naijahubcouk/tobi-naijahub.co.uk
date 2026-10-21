'use strict';
/*
 * Chat-style HTML email for messages from Auntie Tobi (welcome series, replies, unread-reply reminders).
 * Looks like the in-app chat: Auntie Tobi header, the message in a chat bubble, one button back to Business Studio.
 * Built with tables + inline styles so it reads well in Gmail, Outlook and Apple Mail.
 */
const core = require('./core');

const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const linkify = s => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#057A44;font-weight:700">$1</a>');

// Message text → paragraphs (blank line) and line breaks (single newline), links tappable.
function bodyHtml(text) {
  const ps = String(text || '').replace(/\r/g, '').trim().split(/\n{2,}/);
  return ps.map((p, i) => `<p style="margin:0${i < ps.length - 1 ? ' 0 12px' : ''}">${linkify(esc(p)).replace(/\n/g, '<br>')}</p>`).join('');
}

/*
 * opts: { text, intro?, button?, link?, reason?, unsub?, unsubLabel? }
 * Returns { html, text } — text is the plain-text version for email clients that need it.
 */
function build(opts) {
  const link = opts.link || `${core.appUrl()}#messages`;
  const button = opts.button || 'Open Business Studio →';
  const avatar = `${core.siteBase()}/tobi-face-128.png`;
  const intro = opts.intro ? `<div style="font-size:14px;color:#5B6474;margin:0 0 10px">${esc(opts.intro)}</div>` : '';
  const foot = [opts.reason ? esc(opts.reason) : '', opts.unsub ? `<a href="${esc(opts.unsub)}" style="color:#6B7280">${esc(opts.unsubLabel || 'Unsubscribe')}</a>` : ''].filter(Boolean).join(' ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EFE8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE8"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F1E36">
<tr><td style="background:#0F1E36;padding:14px 18px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:12px"><img src="${avatar}" width="44" height="44" alt="Auntie Tobi" style="display:block;border-radius:50%;border:2px solid #FFB81C"></td>
    <td><div style="font-size:17px;font-weight:800;color:#FFFFFF;line-height:1.2">Auntie Tobi</div><div style="font-size:13px;font-weight:700;color:#FFB81C;letter-spacing:.3px">Business Studio</div></td>
  </tr></table>
</td></tr>
<tr><td style="padding:22px 18px 6px;background:#F7F8FA">
  ${intro}
  <div style="background:#E8F5EE;border:1px solid #CFEBDB;border-radius:4px 18px 18px 18px;padding:14px 16px;font-size:16px;line-height:1.6;color:#0F1E36">${bodyHtml(opts.text)}</div>
  <div style="font-size:12.5px;color:#8A93A3;margin:6px 0 0 4px">Auntie Tobi 💚</div>
</td></tr>
<tr><td style="padding:18px 18px 22px;background:#F7F8FA">
  <a href="${esc(link)}" style="display:inline-block;background:#057A44;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:16px;padding:13px 20px;border-radius:12px">${esc(button)}</a>
  <div style="font-size:13.5px;color:#5B6474;margin-top:10px">You can reply to Auntie Tobi in Business Studio → Messages.</div>
</td></tr>
${foot ? `<tr><td style="padding:14px 18px 18px;font-size:12px;line-height:1.5;color:#6B7280;border-top:1px solid #ECEEF2">${foot}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
  const text = [opts.intro || '', String(opts.text || '').trim(), '— Auntie Tobi 💚', `${button.replace(/\s*→$/, '')}: ${link}`,
    opts.reason || '', opts.unsub ? `${opts.unsubLabel || 'Unsubscribe'}: ${opts.unsub}` : ''].filter(Boolean).join('\n\n');
  return { html, text };
}

module.exports = { build, bodyHtml };
