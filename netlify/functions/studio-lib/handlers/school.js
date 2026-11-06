'use strict';
// POST /.netlify/functions/school-api — 🎒 School Tracker (separate accounts; see studio-lib/school.js)
const core = require('../core');
const st = require('../school');

const OPEN = { 'auth-start': st.authStart, 'auth-verify': st.authVerify, logout: st.logout };
const SIGNED = {
  boot: (a) => st.boot(a), setup: st.setup, 'child-save': st.childSave, 'child-remove': st.childRemove,
  invite: st.invite, 'invite-cancel': st.inviteCancel, 'member-update': st.memberUpdate, join: st.join, prefs: st.prefs,
  'mail-get': st.mailGet, 'mail-retry': st.mailRetry, 'mail-delete': st.mailDelete, 'confirm-hide': st.confirmHide, 'mail-child': st.mailChild, paste: st.paste,
  tick: st.tick, 'item-add': st.itemAdd, 'item-delete': st.itemDelete,
  'awards-scan': st.awardsScan,
  'year-scan': st.yearScan, 'mail-forus': st.mailForUs,
};
exports.handler = core.handler(async (ctx) => {
  const action = String(ctx.body.action || '');
  if (OPEN[action]) return OPEN[action](ctx);
  if (!SIGNED[action]) throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
  const auth = await st.signedIn(ctx);
  return SIGNED[action](auth, ctx.body, ctx);
}, { maxBody: 200 * 1024 });
