'use strict';
/*
 * One-click unsubscribe from the weekly email round-up.
 * GET /.netlify/functions/studio-unsubscribe?e=<email>&t=<signed token>
 */
const core = require('../core');
const prefs = require('../prefs');

function page(title, text) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    body: `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FBF6EC;color:#0F1E36;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}a{color:#057A44;font-weight:700}</style></head><body><div><h1>${title}</h1><p>${text}</p><p><a href="/studio">Open Business Studio</a></p></div></body></html>` };
}

exports.handler = core.handler(async (ctx) => {
  const q = ctx.event.queryStringParameters || {};
  const email = core.normalizeEmail(q.e);
  const t = String(q.t || '');
  if (!email || t.length !== 40 || t !== prefs.unsubToken(email)) return page('Link not valid', 'This unsubscribe link doesn’t look right. You can turn the weekly email off in Studio → Account.');
  await prefs.update(email, { weeklyEmail: false });
  return page('You’re unsubscribed', 'You won’t get the weekly round-up email any more. You can turn it back on in Studio → Account.');
}, { allowGet: true });
