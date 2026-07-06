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

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 60 * 1000;

// STRICT allowlist — article MUST contain at least one of these
const ALLOWLIST = [
  'nigerian', 'nigeria',
  'african immigrant', 'african community', 'black british',
  'uk visa', 'visa application', 'immigration uk', 'home office visa',
  'skilled worker visa', 'work permit uk', 'settlement visa',
  'indefinite leave', 'ilr', 'ukvi', 'windrush',
  'asylum seeker uk', 'refugee uk', 'deportation uk',
  'black community uk', 'afro-caribbean', 'african diaspora'
];

// Blocklist — excluded even if allowlist matches
const BLOCKLIST = [
  'murder', 'stabbing', 'shooting', 'rape', 'sexual assault',
  'terrorist', 'bomb', 'explosion', 'drug dealing', 'drug trafficking',
  'nigerian scam', 'nigerian fraud', 'nigerian prince',
  'money laundering', 'gang', 'convicted', 'jail', 'prison sentence',
  'child abuse', 'domestic abuse', 'bribery', 'cocaine', 'heroin',
  'knife crime', 'county lines'
];

function passesFilter(article) {
  const text = (
    (article.webTitle || '') + ' ' +
    (article.fields?.trailText || '')
  ).toLowerCase();

  // Block first
  if (BLOCKLIST.some(k => text.includes(k))) return false;

  // Must match allowlist strictly
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

// Shuffle array
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Return shuffled cached data if fresh
    if (cache.data && cache.data.length > 0 && (Date.now() - cache.timestamp) < CACHE_DURATION) {
      console.log('Returning shuffled cached news:', cache.data.length, 'articles');
      const shuffled = shuffle([...cache.data]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ articles: shuffled, cached: true })
      };
    }

    // Strict Nigerian/African UK focused queries only
    const queries = [
      'Nigerian+UK',
      'Nigeria+Britain',
      'Nigerian+immigrant',
      'Black+British+community',
      'African+UK+community',
      'UK+visa+Nigeria'
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

    // Deduplicate
    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (seen.has(a.webUrl)) return false;
      seen.add(a.webUrl);
      return true;
    });

    // Strict filter + sort newest first — up to 10
    const filtered = unique
      .filter(passesFilter)
      .sort((a, b) => new Date(b.webPublicationDate) - new Date(a.webPublicationDate))
      .slice(0, 10)
      .map(formatArticle);

    console.log(`Total: ${unique.length}, Passed strict filter: ${filtered.length}`);

    cache = { data: filtered, timestamp: Date.now() };

    // Shuffle for rotation
    const shuffled = shuffle([...filtered]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ articles: shuffled, cached: false })
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
