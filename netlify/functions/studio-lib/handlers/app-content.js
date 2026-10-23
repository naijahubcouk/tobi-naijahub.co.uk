'use strict';
/*
 * Public feed for the main Auntie Tobi app — /.netlify/functions/app-content
 *   GET  →  { updates: [], articles: [], events: [], at }
 *   GET  ?img=<id>  →  an event flyer (only while its event is live)
 * Only live posts published from Auntie Tobi HQ ("Publish to App"). No sign-in, read only.
 */
const core = require('../core');
const apppub = require('../apppub');
const eventsub = require('../eventsub');

exports.handler = core.handler(async (ctx) => {
  if (ctx.event.httpMethod !== 'GET') throw new core.HttpError(405, 'method_not_allowed');
  const img = (ctx.event.queryStringParameters || {}).img;
  if (img) {
    // Event flyers — only for events that are live in the app
    const feed = await apppub.publicFeed();
    const live = [].concat(feed.events, feed.articles, feed.updates).some(p => p.imgId && p.imgId === img);
    const rec = live ? await eventsub.getImage(img) : null;
    const m = rec && /^data:([^;]+);base64,(.*)$/.exec(rec.dataUrl);
    if (!m) throw new core.HttpError(404, 'not_found', 'Not found.');
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }, body: m[2], isBase64Encoded: true };
  }
  const feed = await apppub.publicFeed();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30, s-maxage=30',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(feed),
  };
}, { allowGet: true });
