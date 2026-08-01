'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems, getLastNotified, setLastNotified } = require('./notify-helper');

const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival'];

exports.handler = async function(event) {
  console.log('[auto-notify-articles] Function invoked at', new Date().toISOString());
  console.log('[auto-notify-articles] ONESIGNAL_API_KEY set:', !!process.env.ONESIGNAL_API_KEY);
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    const articleItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + item.description).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!articleItems.length) return { statusCode: 200, body: 'No article posts found' };

    const latest = articleItems[0];

    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageMinutes = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 60000 : 999;

    console.log(`[articles] Latest: ${latest.slug} | Age: ${Math.round(ageMinutes)} mins`);

    if (ageMinutes > 35) {
      return { statusCode: 200, body: `Article too old (${Math.round(ageMinutes)} mins): ${latest.slug}` };
    }

    const lastSent = await getLastNotified('articles');
    if (lastSent === latest.uniqueId) {
      return { statusCode: 200, body: `Already sent: ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/blog/${latest.slug || ''}`;

    const result = await sendTaggedPush(
      'articles',
      `📖 ${latest.title}`,
      latest.description || 'Tap to read the latest guide on Auntie Tobi',
      notifUrl
    );

    await setLastNotified('articles', latest.uniqueId);

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, recipients: result.data?.recipients }) };

  } catch (err) {
    console.error('auto-notify-articles error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
