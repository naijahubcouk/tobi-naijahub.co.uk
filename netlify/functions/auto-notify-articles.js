// Netlify scheduled function — auto-sends push for new Article posts
// Runs every 30 minutes via netlify.toml
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

const ARTICLE_CATEGORIES = ['money', 'housing', 'business', 'education', 'food', 'lifestyle', 'health', 'jobs'];

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    // Filter article posts (non-news, non-events)
    const articleItems = items.filter(item => {
      const cat = item.category.toLowerCase();
      return ARTICLE_CATEGORIES.some(c => cat.includes(c));
    });

    if (!articleItems.length) return { statusCode: 200, body: 'No article posts found' };

    const latest = articleItems[0];
    const lastSlug = await getLastNotified('articles');

    if (latest.slug === lastSlug) {
      return { statusCode: 200, body: `No new articles (last: ${lastSlug})` };
    }

    const result = await sendTaggedPush(
      'articles',
      `📖 ${latest.title}`,
      latest.description || 'Tap to read the latest guide on Auntie Tobi',
      `https://auntietobi.co.uk/?blog=${latest.slug}`
    );

    await setLastNotified('articles', latest.slug);

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-articles error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
