// Netlify scheduled function — auto-sends push for new Event posts
// Runs every 30 minutes via netlify.toml
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    const eventItems = items.filter(item => item.category.toLowerCase().includes('event'));

    if (!eventItems.length) return { statusCode: 200, body: 'No event posts found' };

    const latest = eventItems[0];
    const lastSlug = getLastNotified('events');

    if (latest.slug === lastSlug) {
      return { statusCode: 200, body: `No new events (last: ${lastSlug})` };
    }

    const result = await sendTaggedPush(
      'events',
      `🎉 New Event: ${latest.title}`,
      latest.description || 'A new Nigerian community event has been added on Auntie Tobi!',
      `https://auntietobi.co.uk/events`
    );

    setLastNotified('events', latest.slug);

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-events error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
