// Netlify scheduled function — auto-sends push for new News posts
// Runs every 30 minutes via netlify.toml
const { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems } = require('./notify-helper');

const NEWS_CATEGORIES = ['news', 'breaking'];

exports.handler = async function(event) {
  try {
    const xml = await fetchRSS();
    const items = parseRSSItems(xml);

    // Filter news posts only
    const newsItems = items.filter(item => {
      const cat = item.category.toLowerCase();
      return NEWS_CATEGORIES.some(c => cat.includes(c));
    });

    if (!newsItems.length) return { statusCode: 200, body: 'No news posts found' };

    const latest = newsItems[0];
    const lastSlug = await getLastNotified('news');

    if (latest.slug === lastSlug) {
      return { statusCode: 200, body: `No new news (last: ${lastSlug})` };
    }

    // Send push to news subscribers
    const result = await sendTaggedPush(
      'news',
      `📰 ${latest.title}`,
      latest.description || 'Tap to read the latest UK news on Auntie Tobi',
      `https://auntietobi.co.uk/?blog=${latest.slug}`
    );

    await setLastNotified('news', latest.slug);

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, slug: latest.slug, oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-news error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
