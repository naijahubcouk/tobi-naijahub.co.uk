'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

const SENT_KEY = 'tobi_news_last_sent';

exports.handler = async function(event) {
  try {
    console.log('[news] Fetching RSS from auntietobi.com/feed/blog');
    const xml = await fetchRSS('auntietobi.com', '/feed/blog');
    const items = parseRSSItems(xml);
    console.log(`[news] RSS items found: ${items.length}`);

    if (!items.length) return { statusCode: 200, body: 'No items in feed' };

    const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival','networking event','award ceremony'];

    const newsItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!newsItems.length) return { statusCode: 200, body: 'No news items (all filtered as events)' };

    const latest = newsItems[0];
    const uniqueId = latest.link || latest.title;

    // Deduplication using process env (persists within warm Lambda)
    const lastSentKey = process.env.LAST_SENT_NEWS;
    if (lastSentKey && lastSentKey === uniqueId) {
      console.log(`[news] Already sent: ${uniqueId}`);
      return { statusCode: 200, body: `Already sent: ${uniqueId}` };
    }

    // Age check — allow up to 24 hours (cron may have missed earlier)
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageHours = pubDate && !isNaN(pubDate) ? (Date.now() - pubDate.getTime()) / 3600000 : 0;
    console.log(`[news] Latest: "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    if (ageHours > 24) {
      return { statusCode: 200, body: `Too old (${Math.round(ageHours)}h): ${latest.title}` };
    }

    const notifUrl = latest.link || 'https://auntietobi.com/blog';
    const body = latest.desc
      ? latest.desc.replace(/<[^>]+>/g, '').substring(0, 120).trim() + '...'
      : 'Tap to read the latest news on Auntie Tobi';

    console.log(`[news] Sending: "${latest.title}" → ${notifUrl}`);
    const result = await sendTaggedPush(
      'news',
      `📰 ${latest.title}`,
      body,
      notifUrl
    );

    console.log(`[news] ✅ Sent | ID: ${result.data?.id} | Recipients: ${result.data?.recipients || 'queued'}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, title: latest.title, url: notifUrl, notifId: result.data?.id })
    };

  } catch (err) {
    console.error('[news] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
