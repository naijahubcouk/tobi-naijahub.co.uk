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
  const full = !!auth.access.resources;
  const email = auth.sess.email;
  await core.rateLimit('resources', email, 600, 60 * 60 * 1000);
  // Free plan: Templates & Tools samples only (everything else is listed but locked).
  const FREE_OK = ['tools', 'tool', 'tool-save', 'check', 'answer', 'file'];
  if (!full && !FREE_OK.includes(body.action)) {
    throw new HttpError(403, 'club_only', 'Lessons are part of the Auntie Tobi Business Club, Business Studio Pro and Plus.');
  }
  if (!full && (body.action === 'check' || body.action === 'answer')) await res.assertToolKey(String(body.id || ''), body.key, false);
  if (!full && body.action === 'file') await res.assertToolFile(String(body.id || ''), String(body.fileId || ''), false);
  switch (body.action) {
    case 'tools': return res.toolsList(email, full);
    case 'tool': return res.toolFor(email, String(body.id || ''), full);
    case 'tool-save': return res.setToolSaved(email, String(body.id || ''), !!body.on, full);
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
