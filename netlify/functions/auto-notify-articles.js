'use strict';
const { sendTaggedPush, fetchRSS, parseRSSItems } = require('./notify-helper');
const https = require('https');

const EVENT_WORDS = ['owambe','festival','concert',' party','fest ','fayre','gala','carnival'];
const GITHUB_REPO = 'naijahubcouk/tobi-naijahub.co.uk';
const STATE_FILE = 'notif-state/last-article.txt';

function githubRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'AuntieTobi-Notifier',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getLastSent(token) {
  try {
    const res = await githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${STATE_FILE}`, null, token);
    if (res.status === 200 && res.data.content) {
      return Buffer.from(res.data.content, 'base64').toString('utf8').trim();
    }
  } catch(e) {}
  return null;
}

async function setLastSent(token, uniqueId) {
  try {
    // Get current sha if file exists
    const res = await githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${STATE_FILE}`, null, token);
    const sha = res.status === 200 ? res.data.sha : undefined;
    await githubRequest('PUT', `/repos/${GITHUB_REPO}/contents/${STATE_FILE}`, {
      message: `[notif] Update last article sent`,
      content: Buffer.from(uniqueId).toString('base64'),
      ...(sha ? { sha } : {})
    }, token);
  } catch(e) {
    console.log('[articles] Failed to save state:', e.message);
  }
}

exports.handler = async function(event) {
  console.log('[articles] Function invoked at', new Date().toISOString());
  try {
    const xml = await fetchRSS('auntietobi.com', '/feed/blog');
    const items = parseRSSItems(xml);
    console.log(`[articles] RSS items: ${items.length}`);

    const articleItems = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) return false;
      const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
      return !EVENT_WORDS.some(k => text.includes(k));
    });

    if (!articleItems.length) return { statusCode: 200, body: 'No article posts found' };

    const latest = articleItems[0];
    const pubDate = latest.pubDate ? new Date(latest.pubDate) : null;
    const ageHours = (pubDate && !isNaN(pubDate)) ? (Date.now() - pubDate.getTime()) / 3600000 : 0;

    console.log(`[articles] Latest: "${latest.title}" | Age: ${Math.round(ageHours * 60)} mins`);

    if (ageHours > 24) {
      return { statusCode: 200, body: `Too old (${Math.round(ageHours)}h): ${latest.title}` };
    }

    const uniqueId = latest.link || latest.title;
    const token = process.env.GITHUB_TOKEN;

    // Check persistent dedup
    if (token) {
      const lastSent = await getLastSent(token);
      console.log(`[articles] Last sent: ${lastSent} | Current: ${uniqueId}`);
      if (lastSent === uniqueId) {
        return { statusCode: 200, body: `Already sent: ${uniqueId}` };
      }
    }

    // Build deep link
    const sourceUrl = latest.link || 'https://auntietobi.com/blog';
    const content = encodeURIComponent((latest.desc || latest.title || '').replace(/<[^>]+>/g,'').substring(0,150));
    const b1 = encodeURIComponent('Tell me more about this');
    const b2 = encodeURIComponent('What does this mean for Nigerians in the UK?');
    const b3 = encodeURIComponent('Show me more articles');
    const deepLink = `https://auntietobi.co.uk/?action=tip&content=${content}&b1=${b1}&b2=${b2}&b3=${b3}&source=${encodeURIComponent(sourceUrl)}`;

    const body = (latest.desc || '').replace(/<[^>]+>/g,'').substring(0,120).trim() || 'Tap to read the latest guide on Auntie Tobi';

    const result = await sendTaggedPush('articles', `📖 ${latest.title}`, body, deepLink);

    // Save state
    if (token) await setLastSent(token, uniqueId);

    console.log(`[articles] ✅ Sent | ID: ${result.data?.id}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, title: latest.title }) };

  } catch (err) {
    console.error('[articles] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
