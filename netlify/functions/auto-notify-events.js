'use strict';
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    const eventItems = items.filter(item => (item.category || '').toLowerCase().includes('event'));

    if (!eventItems.length) return { statusCode: 200, body: 'No event posts found' };

    const latest = eventItems[0];
    const lastId = await getLastNotified('events');

    console.log(`[events] Latest: ${latest.uniqueId} | Last sent: ${lastId}`);

    if (latest.uniqueId === lastId) {
      return { statusCode: 200, body: `No new events — already sent: ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/?blog=${latest.slug.toLowerCase().replace(/[^a-z0-9]/g,'')}`;

    const result = await sendTaggedPush(
      'events',
      `🎉 New Event: ${latest.title}`,
      latest.description || 'A new Nigerian community event has been added on Auntie Tobi!',
      notifUrl
    );

    await setLastNotified('events', latest.uniqueId);

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data }) };

  } catch (err) {
    console.error('auto-notify-events error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
