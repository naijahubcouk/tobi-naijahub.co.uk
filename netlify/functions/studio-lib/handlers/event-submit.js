'use strict';
/*
 * Public "Add your event" — /.netlify/functions/event-submit  (no sign-in; rate-limited and capped)
 *   POST { action: 'ai-image', image }   → { draft }   AI reads a flyer
 *   POST { action: 'ai-notes', notes }   → { draft }   AI writes from pasted details
 *   POST { action: 'ai-link', url }      → { draft, image }  AI reads the event page (image = the page's own picture, or '')
 *   POST { action: 'ai-picture', title, eventDate, location, body } → { image }  creates an event image
 *   POST { action: 'submit', ...fields } → { ok }      sent to Auntie Tobi HQ for review (never goes live by itself)
 */
const core = require('../core');
const eventsub = require('../eventsub');

exports.handler = core.handler(async (ctx) => {
  const { body, ip } = ctx;
  switch (body.action) {
    case 'ai-image': return { draft: await eventsub.aiFromImage(body.image, ip) };
    case 'ai-link': return eventsub.aiFromLink(body.url, ip);
    case 'ai-picture': return { image: await eventsub.aiPicture(body, ip) };
    case 'ai-notes': return { draft: await eventsub.aiFromNotes(body.notes, ip) };
    case 'submit': return eventsub.submit(body, ip);
    default: throw new core.HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 2.2 * 1024 * 1024 });
