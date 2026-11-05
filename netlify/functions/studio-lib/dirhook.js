'use strict';
/*
 * 🔄 Live sync from the directory website (DirectoryEasy webhooks) → HQ business list.
 * STEP 1 (listening only): every message is checked and kept (last 20) so the format can be confirmed.
 * Nothing in the app changes yet.
 *   POST /.netlify/functions/dir-hook?key=<key shown in HQ>
 *   Netlify env: DIRECTORY_WEBHOOK_SECRET = the "Webhook Secret" DirectoryEasy shows (used to check signatures)
 *   dirhook/log  { items: [{ at, event, verified, sigHeader, keys, headers, body }] }
 */
const crypto = require('crypto');
const core = require('./core');
const { cas, getJson } = core;

const KEY = 'dirhook/log';
const urlKey = () => core.hmac('dirhook-url').slice(0, 24);
const address = () => `${core.siteBase()}/.netlify/functions/dir-hook?key=${urlKey()}`;
const safeEq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

// We don't know DirectoryEasy's exact signing scheme yet, so try the common ones and record which header matched.
function verify(headers, body) {
  const secret = core.env('DIRECTORY_WEBHOOK_SECRET');
  if (!secret) return { verified: false, why: 'no secret set in Netlify' };
  const sigHeaders = Object.keys(headers).filter(h => /sig|signature|hmac/i.test(h));
  const ts = headers['x-webhook-timestamp'] || headers['x-timestamp'] || headers['webhook-timestamp'] || '';
  const mac = (data, enc) => crypto.createHmac('sha256', secret).update(data).digest(enc);
  const want = [mac(body, 'hex'), mac(body, 'base64')];
  if (ts) want.push(mac(`${ts}.${body}`, 'hex'), mac(`${ts}.${body}`, 'base64'), mac(`${ts}${body}`, 'hex'));
  for (const h of sigHeaders) {
    for (const part of String(headers[h]).split(/[,\s]+/)) {
      const v = part.replace(/^(sha256=|v1[=,]|t=\d+)/, '');
      if (want.some(w => safeEq(v, w))) return { verified: true, sigHeader: h };
    }
  }
  return { verified: false, why: sigHeaders.length ? 'signature did not match' : 'no signature header', sigHeader: sigHeaders.join(', ') };
}

async function record(headers, body) {
  const v = verify(headers, body);
  let j = null; try { j = JSON.parse(body); } catch (_) { /* not JSON */ }
  const event = j && (j.event || j.type || j.eventType || (j.data && j.data.event)) || '';
  const keep = {}; for (const [k, val] of Object.entries(headers)) if (!/cookie|authorization|x-nf-|x-forwarded|x-country|x-language|client-ip/i.test(k)) keep[k] = String(val).slice(0, 300);
  const entry = { at: core.nowIso(), event: String(event).slice(0, 60), verified: v.verified, why: v.why || '', sigHeader: v.sigHeader || '', keys: j && typeof j === 'object' ? Object.keys(j).slice(0, 30) : [], headers: keep, body: body.slice(0, 20000) };
  await cas(KEY, cur => { cur = cur || { items: [] }; cur.items = [entry].concat(cur.items).slice(0, 20); return cur; });
  return entry;
}
async function status() {
  const log = ((await getJson(KEY).catch(() => null)) || { items: [] }).items;
  return { address: address(), secretSet: !!core.env('DIRECTORY_WEBHOOK_SECRET'), mode: 'listening', log };
}
module.exports = { record, status, urlKey, verify };
