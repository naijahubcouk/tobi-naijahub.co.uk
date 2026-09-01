// Netlify function — serves blog posts from blog-posts.json in the repo
const https = require('https');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = { data: null, ts: 0 };

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Return cache if fresh
  if (cache.data && (Date.now() - cache.ts) < CACHE_TTL) {
    return { statusCode: 200, headers, body: JSON.stringify({ posts: cache.data, cached: true }) };
  }

  try {
    // Fetch blog-posts.json from the repo
    const raw = await new Promise((resolve, reject) => {
      const url = 'https://raw.githubusercontent.com/naijahubcouk/tobi-naijahub.co.uk/main/blog-posts.json';
      https.get(url, { headers: { 'User-Agent': 'AuntieTobi-Feed/1.0' } }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });

    if (raw.status !== 200) {
      throw new Error('Failed to fetch blog-posts.json: ' + raw.status);
    }

    const posts = JSON.parse(raw.body);
    cache = { data: posts, ts: Date.now() };

    return { statusCode: 200, headers, body: JSON.stringify({ posts, cached: false }) };
  } catch (err) {
    console.log('[fetch-blog-feed] Error:', err.message);
    // Return cached data even if stale on error
    if (cache.data) {
      return { statusCode: 200, headers, body: JSON.stringify({ posts: cache.data, cached: true, error: err.message }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ posts: [], error: err.message }) };
  }
};
