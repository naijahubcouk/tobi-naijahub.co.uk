'use strict';
/*
 * Resources — Your Business Growth Library (Business Club members only; free, no AI).
 * POST /.netlify/functions/studio-resources  { action, ... }
 *   home / lesson { id } / complete { id, done } / save { id, on } / check { id, key, on }
 *   answer { id, key, text } / search { q } / file { id, fileId } / prefs { hideRecs }
 * Content is managed in Studio Admin → Resources.
 */
const core = require('../core');
const res = require('../resources');
const { HttpError, handler } = core;

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx, { level: 'view' });
  if (!auth.access.membershipActive) {
    throw new HttpError(403, 'club_only', 'Resources are part of Auntie Tobi Business Club membership.');
  }
  const email = auth.sess.email;
  await core.rateLimit('resources', email, 600, 60 * 60 * 1000);
  switch (body.action) {
    case 'home': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      return res.home(email, profile);
    }
    case 'lesson': return res.lessonFor(email, body.id);
    case 'complete': return res.setComplete(email, String(body.id || ''), !!body.done);
    case 'save': return res.setSaved(email, String(body.id || ''), !!body.on);
    case 'check': return res.setCheck(email, String(body.id || ''), body.key, !!body.on);
    case 'answer': return res.setAnswer(email, String(body.id || ''), body.key, body.text);
    case 'search': return res.search(String(body.q || '').slice(0, 100));
    case 'file': return res.memberFile(String(body.id || ''), String(body.fileId || ''));
    case 'prefs': return res.setPrefs(email, { hideRecs: body.hideRecs });
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
