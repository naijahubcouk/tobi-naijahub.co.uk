'use strict';
// POST /.netlify/functions/learn-api — 🎓 Save my progress on the free practice-test sites (see studio-lib/learners.js)
const core = require('../core');
const lr = require('../learners');

const A = {
  start: lr.start, verify: lr.verify, link: lr.link, me: lr.me, signout: lr.signout, tips: lr.tips, delete: lr.deleteAll,
  'tests-get': lr.testsGet, 'tests-save': lr.testsSave,
};
exports.handler = core.handler(async (ctx) => {
  const f = A[String(ctx.body.action || '')];
  if (!f) throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
  return f(ctx);
}, { maxBody: 450 * 1024 });
