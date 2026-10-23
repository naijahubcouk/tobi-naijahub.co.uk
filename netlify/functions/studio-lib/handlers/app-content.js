'use strict';
/*
 * Public feed for the main Auntie Tobi app — /.netlify/functions/app-content
 *   GET  →  { updates: [], articles: [], events: [], at }
 * Only live posts published from Auntie Tobi HQ ("Publish to App"). No sign-in, read only.
 */
const core = require('../core');
const apppub = require('../apppub');

exports.handler = core.handler(async (ctx) => {
  if (ctx.event.httpMethod !== 'GET') throw new core.HttpError(405, 'method_not_allowed');
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
