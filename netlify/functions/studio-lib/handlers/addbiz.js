'use strict';
/*
 * Public "Add your business" — /.netlify/functions/add-biz  (auntietobi.co.uk/add-business and /claim/<slug>)
 *   { action: 'search', q }                       → { results }   is my business already listed?
 *   { action: 'claim-info', slug }                → { biz }       the business behind a /claim/<slug> link
 *   { action: 'lookup', kind: 'web'|'ig'|'shot', value } → { draft, photos, avatar, dupes } or { needShot }
 *   { action: 'code', email }                     → emails a 6-digit code
 *   { action: 'submit', mode: 'new'|'claim', … }  → { result, studioUrl }   (needs the code)
 * Nothing goes live by itself: new businesses wait for Auntie Tobi in HQ.
 */
const core = require('../core');
const addbiz = require('../addbiz');

exports.handler = core.handler(async (ctx) => {
  const { body, ip } = ctx;
  switch (body.action) {
    case 'search': await core.rateLimit('addbiz-search', ip, 200, 60 * 60 * 1000); return { results: await addbiz.search(core.cleanText(body.q, 80)) };
    case 'claim-info': return { biz: await addbiz.claimInfo(String(body.slug || '').slice(0, 120)) };
    case 'cats': return { cats: addbiz.CATS() };
    case 'lookup': return addbiz.lookup(String(body.kind || ''), body.value, ip);
    case 'code': return addbiz.requestCode(body.email, ip);
    case 'write': return addbiz.writeDesc(body.fields || {}, body.notes, ip);
    case 'claim-code': return addbiz.claimCode(String(body.slug || '').slice(0, 120), ip);
    case 'submit': return addbiz.submit(body, { ip });
    default: throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 3.2 * 1024 * 1024 });
