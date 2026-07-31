'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems, getLastNotified, setLastNotified } = require('./notify-helper');

// Same keywords as fetch-blog-feed.js
const EVENT_KEYWORDS = [
  'owambe', 'festival', 'concert', 'party', 'fest ', 'fayre', 'event',
  'show ', 'gala', 'carnival', 'celebration', 'dinner', 'networking',
  'conference', 'seminar', 'workshop', 'fair ', 'comedy night', 'open mic',
  'live music', 'ball ', 'fundraiser', 'award', 'launch ', 'meetup', 'gathering',
];

function isEventItem(item) {
  const cat = (item.category || '').toLowerCase();
  if (cat.includes('event')) return true;
  const text = (item.title + ' ' + item.description).toLowerCase();
  return EVENT_KEYWORDS.some(kw => text.includes(kw));
}

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    // Filter to event posts using keyword detection + category
    const eventItems = items.filter(isEventItem);

    if (!eventItems.length) return { statusCode: 200, body: 'No event posts found' };

    const latest = eventItems[0];

    // Check age — must be within 35 mins of publish
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageMinutes = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 60000 : 999;

    console.log(`[events] Latest: ${latest.slug} | Age: ${Math.round(ageMinutes)} mins`);

    if (ageMinutes > 35) {
      return { statusCode: 200, body: `Event too old (${Math.round(ageMinutes)} mins): ${latest.slug}` };
    }

    // Deduplication — don't resend the same post
    const lastSent = await getLastNotified('events');
    if (lastSent === latest.uniqueId) {
      return { statusCode: 200, body: `Already sent: ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/blog/${latest.slug || ''}`;

    const result = await sendTaggedPush(
      'events',
      `🎉 New Event: ${latest.title}`,
      latest.description || 'A new Nigerian community event has been added on Auntie Tobi!',
      notifUrl
    );

    await setLastNotified('events', latest.uniqueId);

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, recipients: result.data?.recipients }) };

  } catch (err) {
    console.error('auto-notify-events error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
