'use strict';
// Netlify scheduled function — runs daily at 2am UTC
// Fetches all listings from auntietobi.com/feed/listings and saves to Netlify Blobs
// chat-openai.js then reads from Blobs so ALL website businesses appear in AI search

const https = require('https');
const http = require('http');

const BLOB_KEY = 'auntie-tobi-directory';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'AuntieTobi-Sync/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Encoding': 'identity',
      }
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 2000000) data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
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
  return str.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&[a-z]+;/g,' ').trim();
}

function extractPhone(str) {
  const m = str.match(/(\+44|0044|07|01|02)\d{8,10}/);
  return m ? m[0] : '';
}

function extractWA(str) {
  const m = str.match(/wa\.me\/(\d+)|whatsapp.*?(\d{10,13})/i);
  return m ? (m[1] || m[2]) : '';
}

function inferCat(name, desc, rawCat) {
  const generic = ['general','business','listing','services',''];
  if (!generic.includes((rawCat||'').toLowerCase())) return rawCat.toLowerCase();
  const text = (name + ' ' + desc).toLowerCase();
  if (/makeup|mua|glam|beauty studio|microblad|lash|brow/.test(text)) return 'makeup artists';
  if (/gele|auto gele/.test(text)) return 'gele stylists';
  if (/wig|hair extension|braider|braiding|loc |natural hair/.test(text)) return 'hair & wigs';
  if (/caterer|catering|jollof|suya|small chops|puff puff|nigerian food|african food/.test(text)) return 'caterers';
  if (/cake|pastry|bakery|dessert|bake/.test(text)) return 'cakes & desserts';
  if (/restaurant|bukka|dining|eatery|food truck/.test(text)) return 'restaurants';
  if (/grocery|groceries|foodstore|african store|naija store/.test(text)) return 'foodstores & groceries';
  if (/fashion|clothing|outfit|ankara|fabric|lace|dress/.test(text)) return 'fashion & accessories';
  if (/photographer|photography|videographer/.test(text)) return 'photography';
  if (/event plan|decorator|decor|wedding plan/.test(text)) return 'event planners';
  if (/dj|sound hire/.test(text)) return 'djs';
  if (/accountant|tax|bookkeep/.test(text)) return 'accountants';
  if (/solicitor|lawyer|legal/.test(text)) return 'solicitors';
  if (/barber|barbershop/.test(text)) return 'barbers';
  if (/salon|hairdress/.test(text)) return 'hair salons';
  if (/skincare|skin care/.test(text)) return 'skincare';
  if (/tutor|education|academy/.test(text)) return 'tutors';
  if (/cleaner|cleaning/.test(text)) return 'cleaning services';
  if (/travel|visa|ticket/.test(text)) return 'travel agents';
  if (/church|ministry|pastor/.test(text)) return 'churches';
  return 'nigerian business';
}

function extractLoc(desc) {
  const cities = ['London','Birmingham','Manchester','Leeds','Bristol','Sheffield','Liverpool','Nottingham','Coventry','Leicester','Norwich','Reading','Oxford','Cambridge','Southampton','Cardiff','Glasgow','Edinburgh','Belfast','Maidstone','Brighton','Derby','Exeter','Hull','Luton','Peterborough','Stoke','Sunderland','Basildon','Laindon','Chelmsford','Southend','York','Worcester','Bath','Bournemouth','Northampton','Milton Keynes','Wolverhampton','Bradford'];
  for (const city of cities) {
    if (desc.includes(city)) return city;
  }
  return 'UK';
}

function parseListings(xml) {
  const businesses = [];
  const itemBlocks = xml.split('<item>').slice(1);

  for (const block of itemBlocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;

    const rawName = cleanText(getTag(item, 'title'));
    const link = getTag(item, 'link') || getTag(item, 'guid');
    const description = cleanText(getTag(item, 'description'));
    const categories = getAllTags(item, 'category').map(cleanText);

    const slug = link.split('/listing/')[1]?.replace(/\/$/, '') ||
                 link.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '') ||
                 link.split('/').pop() || '';

    if (!rawName || !slug) continue;

    // Clean name — sometimes has trailing underscores or formatting
    const name = rawName.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

    const rawCat = categories[0] || '';
    const cat = inferCat(name, description, rawCat);
    const loc = extractLoc(description);
    const phone = extractPhone(description);
    const wa = extractWA(description);

    const keywords = [...new Set([
      cat.toLowerCase().split(' ')[0],
      name.toLowerCase().split(' ')[0],
      name.toLowerCase().split(' ').slice(0,2).join(''),
    ].filter(Boolean))];

    businesses.push({
      name,
      slug,
      cat,
      loc,
      desc: description.substring(0, 150),
      keywords,
      phone: phone || '',
      wa: wa || '',
      website: '',
      verified: false,
    });
  }

  return businesses;
}

exports.handler = async function(event) {
  const startTime = Date.now();
  console.log('[sync-directory] Starting sync at', new Date().toISOString());

  try {
    // Fetch listings RSS feed
    const { status, body } = await fetchUrl('https://auntietobi.com/feed/listings');
    console.log(`[sync-directory] RSS status: ${status}, body length: ${body.length}`);

    if (status !== 200 || !body.includes('<item>')) {
      throw new Error(`RSS fetch failed: status ${status}, no items found`);
    }

    const businesses = parseListings(body);
    console.log(`[sync-directory] Parsed ${businesses.length} businesses`);

    if (businesses.length === 0) {
      throw new Error('No businesses parsed from feed');
    }

    // Save to Netlify Blobs
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'auntie-tobi-directory', consistency: 'strong' });

    const payload = JSON.stringify({
      businesses,
      updatedAt: new Date().toISOString(),
      count: businesses.length,
    });

    await store.set(BLOB_KEY, payload);
    console.log(`[sync-directory] Saved ${businesses.length} businesses to Blobs`);

    const elapsed = Date.now() - startTime;
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: businesses.length,
        elapsed: elapsed + 'ms',
        updatedAt: new Date().toISOString(),
      })
    };

  } catch (err) {
    console.error('[sync-directory] Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
