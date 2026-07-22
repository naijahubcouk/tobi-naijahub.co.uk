'use strict';
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

const ARTICLE_CATEGORIES = ['money', 'housing', 'business', 'education', 'food', 'lifestyle', 'health', 'jobs'];

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    const articleItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      return ARTICLE_CATEGORIES.some(c => cat.includes(c));
    });

    if (!articleItems.length) return { statusCode: 200, body: 'No article posts found' };

    const latest = articleItems[0];
    const lastId = await getLastNotified('articles');

    console.log(`[articles] Latest: ${latest.uniqueId} | Last sent: ${lastId}`);

    if (latest.uniqueId === lastId) {
      return { statusCode: 200, body: `No new articles — already sent: ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/?blog=${latest.slug.toLowerCase().replace(/[^a-z0-9]/g,'')}`;

    const result = await sendTaggedPush(
      'articles',
      `📖 ${latest.title}`,
      latest.description || 'Tap to read the latest guide on Auntie Tobi',
      notifUrl
    );

    await setLastNotified('articles', latest.uniqueId);

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data }) };

  } catch (err) {
    console.error('auto-notify-articles error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
