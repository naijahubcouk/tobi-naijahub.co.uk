const https = require('https');

const GUARDIAN_API_KEY = 'ae344be5-2193-449d-ab82-4df4f7e64730';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Cache results for 1 hour
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Keywords relevant to Nigerians in the UK
const RELEVANT_KEYWORDS = [
  'nigeria', 'nigerian', 'african', 'immigrant', 'immigration', 'visa',
  'ukvi', 'home office', 'asylum', 'refugee', 'british black',
  'nhs', 'cost of living', 'housing', 'rent', 'benefit', 'universal credit',
  'minimum wage', 'inflation', 'energy bill', 'council tax',
  'job', 'employment', 'salary', 'workplace', 'discrimination',
  'black british', 'diaspora', 'windrush', 'deportation', 'ilr',
  'settlement', 'citizenship', 'passport', 'border'
];

function isRelevant(article) {
  const text = (
    (article.webTitle || '') + ' ' +
    (article.fields?.trailText || '') + ' ' +
    (article.sectionName || '')
  ).toLowerCase();
  return RELEVANT_KEYWORDS.some(k => text.includes(k));
}

function formatArticle(article) {
  return {
    title: article.webTitle,
    summary: article.fields?.trailText || '',
    url: article.webUrl,
    date: article.webPublicationDate ? article.webPublicationDate.split('T')[0] : '',
    section: article.sectionName || 'News',
    source: 'The Guardian'
  };
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const limit = parseInt(params.get('limit') || '3');

    // Return cached data if fresh
    if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
      console.log('Returning cached news');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ articles: cache.data.slice(0, limit), cached: true })
      };
    }

    // Fetch from Guardian — search for Nigerian/UK relevant news
    const queries = [
      'Nigerian+UK',
      'immigration+UK',
      'Black+British',
      'Nigeria'
    ];

    let allArticles = [];

    for (const q of queries) {
      const url = `https://content.guardianapis.com/search?q=${q}&show-fields=trailText&page-size=10&order-by=newest&api-key=${GUARDIAN_API_KEY}`;
      try {
        const data = await httpsGet(url);
        if (data.response && data.response.results) {
          allArticles = allArticles.concat(data.response.results);
        }
      } catch(e) {
        console.log('Guardian query failed:', q, e.message);
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (seen.has(a.webUrl)) return false;
      seen.add(a.webUrl);
      return true;
    });

    // Filter for relevance and sort by date
    const relevant = unique
      .filter(isRelevant)
      .sort((a, b) => new Date(b.webPublicationDate) - new Date(a.webPublicationDate))
      .slice(0, 8)
      .map(formatArticle);

    // Fallback — if less than 3 relevant, add general UK news
    if (relevant.length < 3) {
      const fallbackUrl = `https://content.guardianapis.com/search?q=UK+news&show-fields=trailText&page-size=5&order-by=newest&section=uk-news&api-key=${GUARDIAN_API_KEY}`;
      const fallbackData = await httpsGet(fallbackUrl);
      if (fallbackData.response && fallbackData.response.results) {
        const fallback = fallbackData.response.results
          .filter(a => !seen.has(a.webUrl))
          .slice(0, 8 - relevant.length)
          .map(formatArticle);
        relevant.push(...fallback);
      }
    }

    // Cache results
    cache = { data: relevant, timestamp: Date.now() };
    console.log(`Fetched ${relevant.length} articles`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ articles: relevant.slice(0, limit), cached: false })
    };

  } catch(err) {
    console.log('Error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, articles: [] })
    };
  }
};
