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
const CACHE_DURATION = 60 * 60 * 1000;

// OPTION 2 — Allowlist: article must contain at least one of these to show
const ALLOWLIST = [
  'nigeria', 'nigerian', 'african', 'immigration', 'immigrant', 'visa',
  'ukvi', 'home office', 'asylum', 'ilr', 'settlement', 'deportation',
  'windrush', 'black british', 'diaspora', 'nhs', 'cost of living',
  'housing', 'rent', 'benefit', 'universal credit', 'minimum wage',
  'energy bill', 'council tax', 'job', 'employment', 'workplace',
  'discrimination', 'race', 'ethnic', 'passport', 'border control',
  'uk visa', 'skilled worker', 'work permit'
];

// OPTION 1 — Blocklist: article is excluded if it contains any of these
const BLOCKLIST = [
  'murder', 'stabbing', 'shooting', 'rape', 'sexual assault', 'terror',
  'terrorist', 'bomb', 'explosion', 'drug dealing', 'drug trafficking',
  'fraud nigerian', 'nigerian scam', 'money laundering', 'gang',
  'criminal', 'convicted', 'arrested', 'jail', 'prison sentence',
  'child abuse', 'domestic abuse', 'corruption', 'bribery',
  'cocaine', 'heroin', 'cannabis dealer', 'knife crime'
];

function passesFilter(article) {
  const text = (
    (article.webTitle || '') + ' ' +
    (article.fields?.trailText || '') + ' ' +
    (article.sectionName || '')
  ).toLowerCase();

  // Must pass blocklist first
  if (BLOCKLIST.some(k => text.includes(k))) return false;

  // Must match at least one allowlist keyword
  return ALLOWLIST.some(k => text.includes(k));
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
    // Return cached data if fresh
    if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
      console.log('Returning cached news:', cache.data.length, 'articles');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ articles: cache.data, cached: true })
      };
    }

    // Fetch from Guardian — multiple queries for best coverage
    const queries = [
      'Nigerian+UK',
      'Nigeria+Britain',
      'immigration+UK+visa',
      'Black+British+community'
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

    // Apply Option 1 + Option 2 filtering, sort newest first
    const filtered = unique
      .filter(passesFilter)
      .sort((a, b) => new Date(b.webPublicationDate) - new Date(a.webPublicationDate))
      .slice(0, 8)
      .map(formatArticle);

    console.log(`Fetched ${unique.length} articles, ${filtered.length} passed filters`);

    // Cache results
    cache = { data: filtered, timestamp: Date.now() };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ articles: filtered, cached: false })
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
