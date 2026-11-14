'use strict';
/*
 * ✨ Instagram Revamp — the client's intake form (public, by private link: /glowup-form?t=<token>)
 *   GET  ?t=<token>                      → { name, handle, questions, done, answers }
 *   GET  ?r=<report token>               → the client's Revamp report (counts an open)
 *   POST { action: 'form', t, answers }  → { ok }
 *   POST { action: 'tick', r, i, on }    → { ok, ticks }   checklist ticks on the report page
 */
const core = require('../core');
const glowup = require('../glowup');

exports.handler = core.handler(async (ctx) => {
  const { event, body, ip } = ctx;
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const r = q.r ? await glowup.reportGet(q.r, q.hq === '1') : await glowup.formGet(q.t);   // 📄 ?r= = the client's Revamp report
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(r) };
  }
  if (body.action === 'tick') return glowup.tick(body.r, body.i, !!body.on);   // ✅ the client ticks their checklist
  if (body.action === 'form') return glowup.formSend(body.t, body.answers, ip);
  throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
}, { allowGet: true, maxBody: 64 * 1024 });
