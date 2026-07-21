// Netlify function — fetches auntietobi.com/feed/listings RSS and returns clean JSON
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
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Encoding': 'identity',
      }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 1000000) data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function getAllTags(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function cleanText(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, ' ').trim();
}

function extractPhone(str) {
  const m = str.match(/(\+44|0044|07|01|02)\d{8,10}/);
  return m ? m[0] : '';
}

function extractWA(str) {
  const m = str.match(/wa\.me\/(\d+)|whatsapp.*?(\d{10,13})/i);
  return m ? (m[1] || m[2]) : '';
}

function extractIG(str) {
  const m = str.match(/instagram\.com\/([^/"'\s]+)/i);
  return m ? `https://instagram.com/${m[1]}` : '';
}

function parseListingsRSS(xml) {
  const businesses = [];
  const itemBlocks = xml.split('<item>').slice(1);

  for (const block of itemBlocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;

    const name = cleanText(getTag(item, 'title'));
    const link = getTag(item, 'link') || getTag(item, 'guid');
    const description = cleanText(getTag(item, 'description'));
    const categories = getAllTags(item, 'category').map(cleanText);

    // Extract slug from URL
    const slug = link.split('/listing/')[1]?.replace(/\/$/, '') || link.split('/').pop() || '';

    if (!name || !slug) continue;

    // Parse category
    const cat = categories[0] || 'general';
    const section = categories[1] || categories[0] || 'business';

    // Try to extract contact info from description
    const phone = extractPhone(description);
    const wa = extractWA(description);
    const ig = extractIG(description);

    // Extract location — look for location-related content
    const locMatch = description.match(/(?:located|based|serving|location)[^.]*?([A-Z][a-zA-Z\s]+(?:UK|London|Birmingham|Manchester|Bristol|Leeds|Sheffield|Liverpool|Nottingham|Coventry|Leicester|Norwich|Reading|Oxford|Cambridge|Southampton|Cardiff|Glasgow|Edinburgh|Belfast))/i);
    const loc = locMatch ? locMatch[1].trim() : 'UK';

    // Keywords from name and category
    const keywords = [...new Set([
      cat.toLowerCase(),
      section.toLowerCase().split(' ')[0],
      name.toLowerCase().split(' ')[0],
    ].filter(Boolean))];

    businesses.push({
      name,
      slug,
      cat: cat.toLowerCase(),
      section: section.toLowerCase(),
      loc,
      desc: description.substring(0, 150),
      keywords,
      phone,
      wa,
      ig,
      website: '',
      verified: false, // RSS doesn't expose verified status — keep false by default
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
    if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
      return { statusCode: 200, headers, body: JSON.stringify({ businesses: cache.data, cached: true, count: cache.data.length }) };
    }

    const { body } = await fetchUrl('https://auntietobi.com/feed/listings');
    const businesses = parseListingsRSS(body);

    cache = { data: businesses, ts: Date.now() };

    return { statusCode: 200, headers, body: JSON.stringify({ businesses, cached: false, count: businesses.length }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, businesses: [] })
    };
  }
};
