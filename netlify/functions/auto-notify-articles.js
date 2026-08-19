'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival'];

// Use OneSignal to check if we already sent — tag the app with last sent ID
// Simpler: use a time-based dedup — only send if article was published in last 2 hours
// AND we haven't sent in the last 20 hours (checked via article pubDate vs now)

exports.handler = async function(event) {
  console.log('[articles] Function invoked at', new Date().toISOString());
  try {
    const xml = await fetchRSS('auntietobi.com', '/feed/blog');
    const items = parseRSSItems(xml);
    console.log(`[articles] RSS items: ${items.length}`);

    const articleItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!articleItems.length) return { statusCode: 200, body: 'No article posts found' };

    const latest = articleItems[0];
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;

    if (!pubDate || isNaN(pubDate)) {
      return { statusCode: 200, body: 'No valid publish date — skipping' };
    }

    const ageHours = (Date.now() - pubDate.getTime()) / 3600000;
    console.log(`[articles] "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    // Only send if published in last 2 hours — this naturally prevents repeat sends
    // Articles run every 30 mins, so a 2-hour window catches it but won't re-trigger
    if (ageHours > 0.5) {
      return { statusCode: 200, body: `Not recent enough (${Math.round(ageHours)}h old): ${latest.title}` };
    }

    const sourceUrl = latest.link || 'https://auntietobi.com/blog';
    const content = encodeURIComponent((latest.desc || latest.title || '').replace(/<[^>]+>/g,'').substring(0,150));
    const b1 = encodeURIComponent('Tell me more about this');
    const b2 = encodeURIComponent('What does this mean for Nigerians in the UK?');
    const b3 = encodeURIComponent('Show me more articles');
    const deepLink = `https://auntietobi.co.uk/?action=tip&content=${content}&b1=${b1}&b2=${b2}&b3=${b3}&source=${encodeURIComponent(sourceUrl)}`;
    const body = (latest.desc || '').replace(/<[^>]+>/g,'').substring(0,120).trim() || 'Tap to read on Auntie Tobi';

    const result = await sendTaggedPush('articles', `📖 ${latest.title}`, body, deepLink);
    console.log(`[articles] ✅ Sent | ID: ${result.data?.id}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, title: latest.title }) };

  } catch (err) {
    console.error('[articles] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
