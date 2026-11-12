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

const app = core.handler(async (ctx) => {
  switch (ctx.body.action) {
    case 'news-code': return mp.newsCode(ctx.body.email, ctx.ip);
    case 'news-verify': return mp.newsVerify(ctx);
    case 'sunday-latest': return require('../sunday').latest();
    case 'sunday-issue': return require('../sunday').issueFor(ctx.body.week);
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

// One-click links from emails (GET, or POST from "List-Unsubscribe-Post"): 📰 unsubscribe · ☀️ morning emails off
const page = (title, msg) => ({ statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif;color:#0F1E36"><div style="max-width:460px;margin:60px auto;background:#fff;border-radius:16px;padding:28px 24px;text-align:center;border-top:5px solid #057A44"><div style="font-size:40px">💚</div><h1 style="font-size:22px;margin:10px 0">${title}</h1><p style="font-size:16px;line-height:1.55">${msg}</p><p><a href="/" style="display:inline-block;background:#057A44;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Open Auntie Tobi</a></p></div></body></html>` });
const links = core.handler(async (ctx) => {
  const q = ctx.event.queryStringParameters || {}, post = ctx.event.httpMethod === 'POST';
  const confirm = (title, msg, btn) => { const r = page(title, msg); r.body = r.body.replace('<p><a href="/"', `<form method="post"><button style="background:#B42318;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-weight:bold;font-size:15px;cursor:pointer">${btn}</button></form><p><a href="/"`); return r; };
  if (q.unsub) {
    const sunday = require('../sunday'), h = sunday.checkUnsub(q.unsub);
    if (!h) return page('Link not recognised', 'This unsubscribe link didn’t work. Reply to any Sunday Update email and we’ll take you off the list.');
    if (!post) return confirm('Unsubscribe from the Sunday Update?', 'Tap the button and you won’t get Auntie Tobi’s Sunday Update emails any more.', 'Unsubscribe');
    await sunday.unsubscribe(h, 'link');
    return page('You’re unsubscribed', 'You won’t get Auntie Tobi’s Sunday Update any more. You can sign up again any time in the app.');
  }
  if (q.roff) {
    if (!post) return confirm('Turn off morning emails?', 'Your plan stays in the app — you just won’t get the morning email.', 'Turn them off');
    const ok = await mp.remindOff(q.roff);
    return ok ? page('Morning emails are off', 'You won’t get morning emails any more. Your plan is still there in the app — switch them back on in My Plan settings.') : page('Link not recognised', 'This link didn’t work. You can switch morning emails off in My Plan → Settings.');
  }
  throw new core.HttpError(400, 'invalid', 'Not found.');
}, { allowGet: true, skipCsrf: true, rawBody: true });

exports.handler = (event, context) => { const q = event.queryStringParameters || {}; return (q.unsub || q.roff ? links : app)(event, context); };
