'use strict';
// /.netlify/functions/dir-hook?key=…  (or /.netlify/functions/dir-hook/<key>) — DirectoryEasy listing events (step 1: listening only).
// GET / HEAD / OPTIONS answer "ok" so the website can test the address when the webhook is created.
const hook = require('../dirhook');
const crypto = require('crypto');
const ok = { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': '*' }, body: '{"ok":true}' };
exports.handler = async (event) => {
  const m = String(event.httpMethod || 'POST').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return ok;
  if (m !== 'POST' && m !== 'PUT') return { statusCode: 405, body: 'method not allowed' };
  const key = String((event.queryStringParameters || {}).key || (String(event.path || '').match(/dir-hook\/([A-Za-z0-9_-]+)/) || [])[1] || ''), want = hook.urlKey();
  if (key.length !== want.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(want))) return { statusCode: 401, headers: ok.headers, body: '{"ok":false,"error":"wrong address — copy it again from HQ"}' };
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
  if (body.length > 500000) return { statusCode: 413, body: 'too large' };
  try { await hook.record(event.headers || {}, body); } catch (e) { console.error('[dir-hook]', e && e.message); }
  return ok;
};
