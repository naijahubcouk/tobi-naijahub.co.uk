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

    const newsItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!newsItems.length) return { statusCode: 200, body: 'No news items found' };

    const latest = newsItems[0];
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;

    if (!pubDate || isNaN(pubDate)) {
      return { statusCode: 200, body: 'No valid publish date — skipping' };
    }

    const ageHours = (Date.now() - pubDate.getTime()) / 3600000;
    console.log(`[news] "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    // Only send if published in last 2 hours — natural dedup across 30-min cron runs
    if (ageHours > 0.5) {
      return { statusCode: 200, body: `Not recent enough (${Math.round(ageHours)}h old): ${latest.title}` };
    }

    const sourceUrl = latest.link || 'https://auntietobi.com/blog';
    const content = encodeURIComponent((latest.desc || latest.title || '').replace(/<[^>]+>/g,'').substring(0,150));
    const b1 = encodeURIComponent('Tell me more about this');
    const b2 = encodeURIComponent('What does this mean for Nigerians in the UK?');
    const b3 = encodeURIComponent('Find a Nigerian business near me');
    const deepLink = `https://auntietobi.co.uk/?action=tip&content=${content}&b1=${b1}&b2=${b2}&b3=${b3}&source=${encodeURIComponent(sourceUrl)}`;
    const body = (latest.desc || '').replace(/<[^>]+>/g,'').substring(0,120).trim() || 'Tap to read the latest news on Auntie Tobi';

    const result = await sendTaggedPush('news', `📰 ${latest.title}`, body, deepLink);
    console.log(`[news] ✅ Sent | ID: ${result.data?.id}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, title: latest.title }) };

  } catch (err) {
    console.error('[news] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
