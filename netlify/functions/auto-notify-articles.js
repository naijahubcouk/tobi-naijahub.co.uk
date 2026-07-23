'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');

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

    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageMinutes = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 60000 : 999;

    console.log(`[articles] Latest: ${latest.slug} | Age: ${Math.round(ageMinutes)} mins`);

    if (ageMinutes > 35) {
      return { statusCode: 200, body: `Article too old (${Math.round(ageMinutes)} mins): ${latest.slug}` };
    }

    const notifUrl = latest.appUrl || `https://auntietobi.co.uk/?blog=${latest.slug.toLowerCase().replace(/[^a-z0-9]/g,'')}`;

    const result = await sendTaggedPush(
      'articles',
      `📖 ${latest.title}`,
      latest.description || 'Tap to read the latest guide on Auntie Tobi',
      notifUrl
    );

    return { statusCode: 200, body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data }) };

  } catch (err) {
    console.error('auto-notify-articles error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
