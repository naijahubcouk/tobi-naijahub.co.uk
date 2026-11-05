'use strict';
// POST /.netlify/functions/dir-hook?key=… — DirectoryEasy listing events (step 1: listening only).
const hook = require('../dirhook');
const crypto = require('crypto');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method not allowed' };
  const key = String((event.queryStringParameters || {}).key || ''), want = hook.urlKey();
  if (key.length !== want.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(want))) return { statusCode: 404, body: 'not found' };
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
  if (body.length > 500000) return { statusCode: 413, body: 'too large' };
  try { await hook.record(event.headers || {}, body); } catch (e) { console.error('[dir-hook]', e && e.message); }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' };
};
