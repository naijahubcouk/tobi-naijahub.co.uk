'use strict';
// POST /.netlify/functions/resend-hook — Resend email events (opened, clicked, bounced…) for HQ outreach tracking.
const ev = require('../emailev');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method not allowed' };
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
  if (!ev.verify(event.headers || {}, body)) return { statusCode: 401, body: 'bad signature' };
  try { const r = await ev.record(JSON.parse(body)); return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }; }
  catch (e) { console.error('[resend-hook]', e && e.message); return { statusCode: 200, body: '{"ok":false}' }; }
};
