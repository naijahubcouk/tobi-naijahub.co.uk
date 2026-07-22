'use strict';
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

const NEWS_CATEGORIES = ['news', 'breaking'];

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    const newsItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      return NEWS_CATEGORIES.some(c => cat.includes(c));
    });

    if (!newsItems.length) return { statusCode: 200, body: 'No news posts found' };

    const latest = newsItems[0];
    const lastId = await getLastNotified('news');

    console.log(`[news] Latest: ${latest.uniqueId} | Last sent: ${lastId}`);

    if (latest.uniqueId === lastId) {
      return { statusCode: 200, body: `No new news — already sent: ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/?blog=${latest.slug.toLowerCase().replace(/[^a-z0-9]/g,'')}`;

    const result = await sendTaggedPush(
      'news',
      `📰 ${latest.title}`,
      latest.description || 'Tap to read the latest UK news on Auntie Tobi',
      notifUrl
    );

    await setLastNotified('news', latest.uniqueId);

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data }) };

  } catch (err) {
    console.error('auto-notify-news error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
