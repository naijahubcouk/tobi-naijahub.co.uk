// Netlify function — fetches auntietobi.com/feed/blog RSS and returns clean JSON
const https = require('https');
const http = require('http');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = { data: null, ts: 0 };

const CATEGORY_EMOJI = {
  'news': '📰', 'events': '🎉', 'money': '💷', 'housing': '🏠',
  'business': '💼', 'education': '🎓', 'food': '🍽️', 'lifestyle': '🌟',
  'immigration': '🛂', 'health': '🏥', 'jobs': '💼',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'AuntieTobi-App/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Encoding': 'identity',
      }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 500000) data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function getAllTags(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => !['the','a','an','in','of','and','for','to','is','are','was','uk','how','what','why','when','where','who'].includes(w))
    .slice(0, 3)
    .join('');
}

function getCategoryEmoji(cats) {
  const catStr = cats.join(' ').toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (catStr.includes(key)) return emoji;
  }
  return '📰';
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function parseRSS(xml) {
  const items = [];
  const itemBlocks = xml.split('<item>').slice(1);

  for (const block of itemBlocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;

    const title = getTag(item, 'title');
    const link = getTag(item, 'link') || getTag(item, 'guid');
    const description = getTag(item, 'description');
    const pubDate = getTag(item, 'pubDate');
    const categories = getAllTags(item, 'category');
    const slug = link.split('/blog/')[1] || link.split('/').pop() || '';

    if (!title || !slug) continue;

    const label = categories[0] || 'News';
    const emoji = getCategoryEmoji(categories);
    const key = slugify(title);

    // Clean description — strip HTML tags
    const cleanDesc = description.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().substring(0, 200);

    items.push({
      key,
      slug,
      title,
      summary: cleanDesc,
      label,
      emoji,
      date: formatDate(pubDate),
      url: `https://auntietobi.com/blog/${slug}`,
      appUrl: `https://auntietobi.co.uk/blog/${key}`,
    });
  }

  return items;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
  };

  try {
    // Serve cache if fresh
    if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
      return { statusCode: 200, headers, body: JSON.stringify({ posts: cache.data, cached: true }) };
    }

    const { body } = await fetchUrl('https://auntietobi.com/feed/blog');
    const posts = parseRSS(body);

    cache = { data: posts, ts: Date.now() };

    return { statusCode: 200, headers, body: JSON.stringify({ posts, cached: false }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, posts: [] })
    };
  }
};
