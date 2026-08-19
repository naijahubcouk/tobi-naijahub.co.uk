'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival'];

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
    const ageHours = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 3600000 : 0;

    console.log(`[articles] Latest: "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    if (ageHours > 24) {
      return { statusCode: 200, body: `Too old (${Math.round(ageHours)}h): ${latest.title}` };
    }

    const uniqueId = latest.link || latest.title;

    // Simple dedup via global (persists in warm Lambda)
    if (global._lastArticleSent === uniqueId) {
      return { statusCode: 200, body: `Already sent: ${uniqueId}` };
    }

    // Build deep link URL so notification opens IN the app
    const sourceUrl = latest.link || 'https://auntietobi.com/blog';
    const b1 = encodeURIComponent('Tell me more about this');
    const b2 = encodeURIComponent('Find a Nigerian business near me');
    const b3 = encodeURIComponent('Show me more articles');
    const content = encodeURIComponent((latest.desc || latest.title || '').replace(/<[^>]+>/g,'').substring(0,150));
    const deepLink = `https://auntietobi.co.uk/?action=tip&content=${content}&b1=${b1}&b2=${b2}&b3=${b3}&source=${encodeURIComponent(sourceUrl)}`;

    console.log(`[articles] Sending: "${latest.title}" → ${deepLink}`);

    const result = await sendTaggedPush(
      'articles',
      `📖 ${latest.title}`,
      (latest.desc || '').replace(/<[^>]+>/g,'').substring(0,120).trim() || 'Tap to read the latest guide on Auntie Tobi',
      deepLink
    );

    global._lastArticleSent = uniqueId;
    console.log(`[articles] ✅ Sent | ID: ${result.data?.id}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, title: latest.title }) };

  } catch (err) {
    console.error('[articles] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
