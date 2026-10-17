'use strict';
/*
 * Member ↔ Auntie Tobi messages — POST /.netlify/functions/studio-messages  { action, ... }   (signed-in members)
 *   get    { read }   the conversation (+ announcements); read=true marks Auntie Tobi's messages as read
 *   unread            count for the red dot
 *   send   { text }   send a message to Auntie Tobi
 */
const core = require('../core');
const { HttpError, handler } = core;
const messages = require('../messages');

function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx, { level: 'view' });
  const email = auth.sess.email;
  await core.rateLimit('msg', email, 900, 60 * 60 * 1000);
  switch (body.action) {
    case 'get': return messages.memberView(email, auth.access, !!body.read);
    case 'unread': return { unread: await messages.memberUnread(email, auth.access) };
    case 'send': {
      await core.rateLimit('msg-send', email, 60, 60 * 60 * 1000);
      const { msg, firstUnread } = await messages.addMessage(email, 'member', body.text);
      if (firstUnread) {
        const prof = await core.getJson(`profiles/${encodeURIComponent(email)}`).catch(() => null);
        const who = (prof && prof.businessName) ? `${prof.businessName} (${email})` : email;
        await core.emailAdmins(`New message from ${prof && prof.businessName || email}`, `${who} sent you a message:\n\n${msg.text}\n\nReply in Admin → Messages: ${siteUrl()}/studio-admin#messages`);
      }
      return { msg };
    }
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
