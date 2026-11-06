'use strict';
// GET /.netlify/functions/school-file?m=<mail id>&a=<attachment id> — 📎 opens one School Tracker attachment (signed-in family members only)
const core = require('../core');
const st = require('../school');
exports.handler = core.handler(async (ctx) => {
  const auth = await st.signedIn(ctx);
  return st.fileGet(auth, ctx.event.queryStringParameters || {});
}, { allowGet: true });
