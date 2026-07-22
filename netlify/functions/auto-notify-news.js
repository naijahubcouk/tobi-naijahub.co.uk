'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

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

    // DEDUP: Only send if article was published within the last 35 minutes
    // This means even if /tmp resets, old articles will never resend
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageMinutes = pubDate ? (Date.now() - pubDate.getTime()) / 60000 : 999;
    
    console.log(`[news] Latest: ${latest.slug} | Age: ${Math.round(ageMinutes)} mins | pubDate: ${latest.pubDate}`);

    if (ageMinutes > 35) {
      return { statusCode: 200, body: `Article too old (${Math.round(ageMinutes)} mins): ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/?blog=${latest.slug.toLowerCase().replace(/[^a-z0-9]/g,'')}`;

    const result = await sendTaggedPush(
      'news',
      `📰 ${latest.title}`,
      latest.description || 'Tap to read the latest UK news on Auntie Tobi',
      notifUrl
    );

    console.log(`[news] Sent: ${latest.slug}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, age: Math.round(ageMinutes) + ' mins', oneSignal: result.data }) };

  } catch (err) {
    console.error('auto-notify-news error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
