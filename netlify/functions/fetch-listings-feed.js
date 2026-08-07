// Netlify function — fetches live business listings from auntietobi.com
const https = require('https');
const http = require('http');

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let cache = { data: null, ts: 0 };

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'AuntieTobi-App/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
      }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 2000000) data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout fetching ' + url)); });
  });
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\\[CDATA\\[/g, '').replace(/\\]\\]>/g, '').trim();
}

function getAllTags(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function cleanText(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/gi, ' ').trim();
}

function inferCat(name, desc) {
  const text = (name + ' ' + desc).toLowerCase();
  if (/makeup|mua|glam|beauty studio|microblad|lash|brow/.test(text)) return 'makeup artists';
  if (/gele|auto gele/.test(text)) return 'gele stylists';
  if (/wig|hair extension|braider|braiding|natural hair/.test(text)) return 'wig vendors';
  if (/caterer|catering|jollof|suya|small chops|puff puff|nigerian food|african food|cook|kitchen|chef/.test(text)) return 'caterers';
  if (/cake|pastry|bakery|dessert|chin chin|meat pie/.test(text)) return 'cakes & desserts';
  if (/restaurant|bukka|dining|eatery/.test(text)) return 'restaurants';
  if (/grocery|groceries|foodstore|african store|naija store|palm oil|stockfish|frozen food/.test(text)) return 'foodstores & groceries';
  if (/fashion|clothing|ankara|fabric|dress|wear|tailor|seamstress/.test(text)) return 'fashion & accessories';
  if (/photographer|photography|videographer/.test(text)) return 'photography';
  if (/event plan|decorator|decor|wedding plan/.test(text)) return 'event planners';
  if (/dj|sound hire/.test(text)) return 'djs';
  if (/skincare|skin care|body care/.test(text)) return 'skincare';
  if (/solicitor|lawyer|legal|immigration/.test(text)) return 'solicitors';
  if (/accountant|tax|financial/.test(text)) return 'accountants';
  if (/tutor|education|academy|coaching/.test(text)) return 'tutors';
  if (/transport|courier|delivery|logistics|driver/.test(text)) return 'transport';
  if (/cleaner|cleaning|domestic/.test(text)) return 'cleaning services';
  if (/church|ministry|pastor|gospel/.test(text)) return 'churches';
  return 'nigerian business';
}

function parseRSS(xml) {
  const businesses = [];
  const itemBlocks = xml.split('<item>').slice(1);
  console.log(`[listings] Parsing ${itemBlocks.length} RSS items`);

  for (const block of itemBlocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;

    const name = cleanText(getTag(item, 'title'));
    const link = getTag(item, 'link') || getTag(item, 'guid');
    const description = cleanText(getTag(item, 'description'));
    const categories = getAllTags(item, 'category').map(cleanText).filter(Boolean);

    const slug = (link.split('/listing/')[1] || link.split('/').pop() || '').replace(/\/$/, '');
    if (!name || !slug) continue;

    let cat = categories.length > 0 ? categories[categories.length - 1].toLowerCase() : '';
    if (!cat || ['general','business','listing','uncategorized'].includes(cat)) {
      cat = inferCat(name, description);
    }

    // Location from description
    const locMatch = description.match(/(?:based in|located in|serving|covering)\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|\s+UK)/i);
    const loc = locMatch ? locMatch[1].trim() + ', UK' : 'UK';

    businesses.push({
      name,
      slug,
      cat,
      loc,
      desc: description.substring(0, 200),
      keywords: [cat.split(' ')[0]],
      verified: false,
    });
  }
  return businesses;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600',
  };

  try {
    // Return cache if fresh
    if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
      return { statusCode: 200, headers, body: JSON.stringify({ businesses: cache.data, cached: true, count: cache.data.length }) };
    }

    // Try multiple feed URLs
    const feedUrls = [
      'https://auntietobi.com/feed/listings',
      'https://www.auntietobi.com/feed/listings',
      'https://auntietobi.com/api/listings',
      'https://auntietobi.com/listings?format=rss',
    ];

    let businesses = [];
    let successUrl = null;

    for (const url of feedUrls) {
      try {
        console.log(`[listings] Trying: ${url}`);
        const result = await fetchUrl(url);
        console.log(`[listings] ${url} → status ${result.status}, length ${result.body.length}`);

        if (result.status === 200 && result.body.includes('<item>')) {
          businesses = parseRSS(result.body);
          successUrl = url;
          console.log(`[listings] ✅ Parsed ${businesses.length} businesses from ${url}`);
          break;
        } else {
          console.log(`[listings] ❌ ${url}: status=${result.status}, has items=${result.body.includes('<item>')}, preview=${result.body.substring(0,100)}`);
        }
      } catch(e) {
        console.log(`[listings] ❌ ${url}: ${e.message}`);
      }
    }

    if (businesses.length === 0) {
      console.log('[listings] No businesses found from any feed URL');
      return { statusCode: 200, headers, body: JSON.stringify({ businesses: [], cached: false, count: 0, error: 'No feed available' }) };
    }

    cache = { data: businesses, ts: Date.now() };
    return { statusCode: 200, headers, body: JSON.stringify({ businesses, cached: false, count: businesses.length, source: successUrl }) };

  } catch (err) {
    console.log('[listings] Fatal error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message, businesses: [], cached: false }) };
  }
};
