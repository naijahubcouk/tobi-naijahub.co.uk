'use strict';
/*
 * 💚 My Plan in the app — /.netlify/functions/my-plan (logic in studio-lib/myplan.js)
 *   { action: 'me' }                         → { signedIn, email, name, town, news, items }
 *   { action: 'code', email }                → emails a 6-digit code
 *   { action: 'verify', email, code, name, town, news, items } → signs in (cookie), adds what they made before signing in
 *   { action: 'save', items }                → merges changed items (newest wins)
 *   { action: 'prefs', name, town, news }    → settings (news = 📰 Sunday Update)
 *   { action: 'signout' } / { action: 'delete' }
 */
const core = require('../core');
const mp = require('../myplan');

exports.handler = core.handler(async (ctx) => {
  switch (ctx.body.action) {
    case 'me': return mp.me(ctx);
    case 'code': return mp.requestCode(ctx.body.email, ctx.ip);
    case 'verify': return mp.verify(ctx);
    case 'save': return mp.save(ctx);
    case 'prefs': return mp.prefs(ctx);
    case 'signout': return mp.signout(ctx);
    case 'delete': return mp.deleteAll(ctx);
    default: throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 600 * 1024 });
