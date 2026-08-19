'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival','networking event','award ceremony'];

exports.handler = async function(event) {
  try {
    console.log('[news] Fetching RSS from auntietobi.com/feed/blog');
    const xml = await fetchRSS('auntietobi.com', '/feed/blog');
    const items = parseRSSItems(xml);
    console.log(`[news] RSS items found: ${items.length}`);

    if (!items.length) return { statusCode: 200, body: 'No items in feed' };

    // Filter out events, keep only news/articles
    const newsItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!newsItems.length) return { statusCode: 200, body: 'No news items found' };

    const latest = newsItems[0];
    const uniqueId = latest.link || latest.title;

    // Deduplication via global (persists in warm Lambda)
    if (global._lastNewsSent === uniqueId) {
      console.log(`[news] Already sent: ${uniqueId}`);
      return { statusCode: 200, body: `Already sent: ${uniqueId}` };
    }

    // Age check — up to 24 hours
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageHours = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 3600000 : 0;
    console.log(`[news] Latest: "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    if (ageHours > 24) {
      return { statusCode: 200, body: `Too old (${Math.round(ageHours)}h): ${latest.title}` };
    }

    // Build deep link so notification opens IN the app
    const sourceUrl = latest.link || 'https://auntietobi.com/blog';
    const b1 = encodeURIComponent('Tell me more about this');
    const b2 = encodeURIComponent('What does this mean for Nigerians in the UK?');
    const b3 = encodeURIComponent('Find a Nigerian business near me');
    const content = encodeURIComponent((latest.desc || latest.title || '').replace(/<[^>]+>/g,'').substring(0,150));
    const deepLink = `https://auntietobi.co.uk/?action=tip&content=${content}&b1=${b1}&b2=${b2}&b3=${b3}&source=${encodeURIComponent(sourceUrl)}`;

    const body = (latest.desc || '').replace(/<[^>]+>/g,'').substring(0,120).trim() || 'Tap to read the latest news on Auntie Tobi';

    console.log(`[news] Sending: "${latest.title}"`);
    const result = await sendTaggedPush('news', `📰 ${latest.title}`, body, deepLink);

    global._lastNewsSent = uniqueId;
    console.log(`[news] ✅ Sent | ID: ${result.data?.id}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, title: latest.title }) };

  } catch (err) {
    console.error('[news] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
