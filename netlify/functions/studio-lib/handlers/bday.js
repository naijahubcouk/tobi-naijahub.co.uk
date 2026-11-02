'use strict';
/*
 * 🎂 Birthday cards (public, no sign-in) — /.netlify/functions/bday
 *   GET  ?art=1          → { art: { "<key>-<size>": version } }   which premium designs have artwork
 *   GET  ?artimg=<id>    → the artwork image (cached)
 *   GET  ?photo=<id>     → a loved-one photo added to a card (kept 60 days)
 *   POST { action: 'photo', image } → { id }   stores a photo so card links show it
 */
const core = require('../core');
const bday = require('../bday');

function img(rec, maxAge) {
  const m = rec && /^data:([^;]+);base64,(.*)$/.exec(rec.dataUrl || '');
  if (!m) throw new core.HttpError(404, 'not_found', 'Not found.');
  return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': `public, max-age=${maxAge}` }, body: m[2], isBase64Encoded: true };
}
exports.handler = core.handler(async (ctx) => {
  const { event, body, ip } = ctx;
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q.art) return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }, body: JSON.stringify({ art: await bday.artIndex() }) };
    if (q.artimg) return img(await bday.getArt(q.artimg), 31536000);
    if (q.photo) return img(await bday.getPhoto(q.photo), 86400);
    throw new core.HttpError(404, 'not_found', 'Not found.');
  }
  if (body.action === 'photo') return { id: await bday.savePhoto(body.image, ip) };
  throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
}, { allowGet: true, maxBody: 1024 * 1024 });
