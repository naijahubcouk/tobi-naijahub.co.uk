'use strict';
// /.netlify/functions/ig-hook — Instagram webhook (comments, messages) + "Connect page" sign-in return for ⚡ Auto-replies.
const core = require('../core');
const ig = require('../igauto');

const html = (title, msg) => ({ statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  body: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:Arial,sans-serif;background:#F6F4EE;color:#0F1E36;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="background:#fff;border-radius:16px;padding:26px 22px;max-width:420px;text-align:center;border:1px solid #ECE6D6"><h1 style="font-size:21px">${title}</h1><p>${msg}</p><a href="/hq#iga" style="display:inline-block;margin-top:10px;background:#057A44;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Back to HQ</a></div></body>` });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (event.httpMethod === 'GET' && q['hub.mode'] === 'subscribe') {
    // Meta checks the webhook address once when you save it
    return q['hub.verify_token'] && q['hub.verify_token'] === core.env('IG_VERIFY_TOKEN') ? { statusCode: 200, body: String(q['hub.challenge'] || '') } : { statusCode: 403, body: 'wrong verify token' };
  }
  if (event.httpMethod === 'GET' && q.connect) {
    const [ts, sig] = String(q.state || '').split('.');
    if (!ts || !sig || core.hmac('igconnect:' + ts).slice(0, 32) !== sig || Date.now() - Number(ts) > 30 * 60000) return html('Link expired', 'Please tap <b>Connect a page</b> in HQ again.');
    if (q.error) return html('Not connected', esc(q.error_description || 'The sign-in was cancelled.'));
    try { const u = await ig.finishConnect(q.code); return html('Connected ✅', `@${esc(u)} is connected. Auto-replies will now work on this page.`); }
    catch (e) { console.error('[ig-hook] connect', e.message); return html('Not connected', esc(e.message)); }
  }
  if (event.httpMethod === 'POST') {
    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
    if (!ig.verifySig(event.headers || {}, body)) return { statusCode: 401, body: 'bad signature' };
    try { await ig.handleEvent(JSON.parse(body)); } catch (e) { console.error('[ig-hook]', e.message); }
    return { statusCode: 200, body: 'ok' };
  }
  return { statusCode: 405, body: 'method not allowed' };
};
