'use strict';
/*
 * ✨ Instagram Revamp — the client's intake form (public, by private link: /glowup-form?t=<token>)
 *   GET  ?t=<token>                      → { name, handle, questions, done, answers }
 *   GET  ?r=<report token>               → the client's Revamp report (counts an open)
 *   POST { action: 'form', t, answers }  → { ok }
 *   GET  ?c=<check token> / ?find=<name>   free Instagram check result / find your listing
 *   POST { action: 'check', shots, biz, sells, goal, listing } · { action: 'unlock', t, name, wa, email, ok }
 *   POST { action: 'tick', r, i, on }    → { ok, ticks }   checklist ticks on the report page
 */
const core = require('../core');
const glowup = require('../glowup');

exports.handler = core.handler(async (ctx) => {
  const { event, body, ip } = ctx;
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const ig = require('../igcheck');
    if (q.find != null) {   // 🔍 find your Auntie Tobi listing (public listings only)
      await core.rateLimit('igcheck-find', ip || 'x', 120, 60 * 60 * 1000, 'Please try again in a little while.');
      return { results: await require('../directory').search(event, String(q.find).slice(0, 80), 6) };
    }
    if (q.listing != null) {   // the public details of one listing, to fill in the free check
      await core.rateLimit('igcheck-find', ip || 'x', 120, 60 * 60 * 1000, 'Please try again in a little while.');
      const dir = require('../directory'), b = await dir.bySlug(event, String(q.listing));
      if (!b) throw new core.HttpError(404, 'not_found', 'We couldn’t find that listing.');
      const L = dir.publicListing(b); return { listing: { name: L.name, slug: L.slug, cat: L.cat || '', loc: L.loc || '', desc: String(L.desc || '').slice(0, 300), wa: L.wa || '', ig: L.ig || '', url: L.url } };
    }
    const r = q.c ? await ig.get(q.c) : q.r ? await glowup.reportGet(q.r, q.hq === '1') : await glowup.formGet(q.t);   // 🆓 ?c= = a free Instagram check   // 📄 ?r= = the client's Revamp report
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(r) };
  }
  if (body.action === 'check') return require('../igcheck').run(event, ip, body);           // 🆓 free Instagram check
  if (body.action === 'unlock') return require('../igcheck').unlock(body.t, body, ip);
  if (body.action === 'tick') return glowup.tick(body.r, body.i, !!body.on);   // ✅ the client ticks their checklist
  if (body.action === 'form') return glowup.formSend(body.t, body.answers, ip);
  throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
}, { allowGet: true, maxBody: 3 * 1024 * 1024 });
