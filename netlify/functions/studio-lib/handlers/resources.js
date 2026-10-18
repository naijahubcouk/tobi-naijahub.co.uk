'use strict';
/*
 * Resources — Learn + Templates & Tools (Club, Pro and Plus; Free plan: sample templates; no AI).
 * POST /.netlify/functions/studio-resources  { action, ... }
 *   home / lesson { id } / complete { id, done } / save { id, on } / check { id, key, on }
 *   answer { id, key, text } / search { q } / file { id, fileId } / prefs { hideRecs }
 *   tools / tool { id: lessonId~blockIndex } / tool-save { id, on }   — Templates & Tools (Free plan: samples only)
 * Content is managed in Studio Admin → Resources.
 */
const core = require('../core');
const res = require('../resources');
const { HttpError, handler } = core;

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx, { level: 'view' });
  // Club, Pro and Plus: every module except Club-only ones (Business Club). Free: the Mindset module and sample templates.
  const acc = { full: !!auth.access.resources, club: !!auth.access.membershipActive };
  const email = auth.sess.email;
  await core.rateLimit('resources', email, 600, 60 * 60 * 1000);
  if (body.action === 'check' || body.action === 'answer') await res.assertToolKey(String(body.id || ''), body.key, acc);
  if (body.action === 'file') await res.assertToolFile(String(body.id || ''), String(body.fileId || ''), acc);
  switch (body.action) {
    case 'tools': return res.toolsList(email, acc);
    case 'tool': return res.toolFor(email, String(body.id || ''), acc);
    case 'tool-save': return res.setToolSaved(email, String(body.id || ''), !!body.on, acc);
    case 'home': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      return res.home(email, profile, acc);
    }
    case 'lesson': return res.lessonFor(email, body.id, acc);
    case 'complete': return res.setComplete(email, String(body.id || ''), !!body.done, acc);
    case 'save': return res.setSaved(email, String(body.id || ''), !!body.on, acc);
    case 'check': return res.setCheck(email, String(body.id || ''), body.key, !!body.on);
    case 'answer': return res.setAnswer(email, String(body.id || ''), body.key, body.text);
    case 'search': return res.search(String(body.q || '').slice(0, 100), acc);
    case 'file': return res.memberFile(String(body.id || ''), String(body.fileId || ''));
    case 'prefs': return res.setPrefs(email, { hideRecs: body.hideRecs });
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
