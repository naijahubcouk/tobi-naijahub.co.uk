'use strict';
/*
 * Auntie Tobi HQ Content Hub — /.netlify/functions/studio-hq   (admin only; same sign-in as Business Studio Admin)
 *   POST { action: 'boot' | 'save' | 'save-many' | 'delete' | 'restore' | 'img' }
 *   GET  ?img=<id>     a card image
 */
const core = require('../core');
const { HttpError, handler } = core;
const hq = require('../hq');

exports.handler = handler(async (ctx) => {
  const { event, body } = ctx;
  if (event.httpMethod === 'GET') {
    await core.requireAdmin(ctx);
    const img = await hq.getImage((event.queryStringParameters || {}).img);
    if (!img) throw new HttpError(404, 'not_found', 'Not found.');
    const m = /^data:([^;]+);base64,(.*)$/.exec(img.dataUrl);
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' }, body: m[2], isBase64Encoded: true };
  }
  const admin = await core.requireAdmin(ctx);
  await core.rateLimit('hq', admin.email, 1200, 60 * 60 * 1000);
  switch (body.action) {
    case 'boot': return { admin: admin.email, items: await hq.list(), today: core.dayKey(), types: hq.TYPES, topics: hq.TOPICS, statuses: hq.STATUSES };
    case 'save': return { item: await hq.save(body.item) };
    case 'save-many': return { items: await hq.saveMany(body.items, body.source) };
    case 'delete': return { n: await hq.remove(body.ids || body.id, false) };
    case 'restore': return { n: await hq.remove(body.ids || body.id, true) };
    case 'img': return { id: await hq.saveImage(body.dataUrl) };
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { allowGet: true, maxBody: 2.5 * 1024 * 1024 });
