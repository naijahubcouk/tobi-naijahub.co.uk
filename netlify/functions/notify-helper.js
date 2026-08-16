'use strict';
const https = require('https');

const APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';

function httpsPost(hostname, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// Send to ALL subscribers using segment (most reliable — no player ID fetching needed)
async function sendTaggedPush(tag, title, body, url) {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) throw new Error('ONESIGNAL_API_KEY not set');

  console.log(`[${tag}] Sending push: "${title}"`);

  const payload = {
    app_id: APP_ID,
    headings: { en: title },
    contents: { en: body },
    web_url: url || 'https://auntietobi.co.uk',
    chrome_web_icon: 'https://auntietobi.co.uk/icons/icon-192.png',
    chrome_web_badge: 'https://auntietobi.co.uk/icons/icon-96.png',
    // Target ALL subscribers — simplest and most reliable
    included_segments: ['Total Subscriptions'],
  };

  const result = await httpsPost('onesignal.com', '/api/v1/notifications', payload, apiKey);
  console.log(`[${tag}] OneSignal response (${result.status}):`, JSON.stringify(result.data));

  if (result.status !== 200) {
    throw new Error(`OneSignal error ${result.status}: ${JSON.stringify(result.data)}`);
  }

  const sent = result.data.recipients || 0;
  const id = result.data.id || 'unknown';
  console.log(`[${tag}] ✅ Sent to ${sent} subscribers. Notification ID: ${id}`);
  return result;
}

function fetchRSS(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: hostname || 'www.auntietobi.com',
      path: path || '/feed.xml',
      method: 'GET',
      headers: { 'User-Agent': 'AuntieTobi-Notifier/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('RSS timeout')); });
    req.end();
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

function parseRSSItems(xml) {
  const items = [];
  const blocks = xml.split('<item>').slice(1);
  for (const block of blocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;
    const title = getTag(item, 'title').replace(/<[^>]+>/g, '').trim();
    const link = (getTag(item, 'link') || getTag(item, 'guid') || '').trim();
    const desc = getTag(item, 'description').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    const pubDate = getTag(item, 'pubDate').trim();
    if (title && link) items.push({ title, link, desc, pubDate });
  }
  return items;
}

async function getLastNotified(store, key) {
  try {
    if (!store || typeof store.get !== 'function') return {};
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : {};
  } catch(e) {
    return {};
  }
}

async function setLastNotified(store, key, data) {
  try {
    if (!store || typeof store.set !== 'function') return;
    await store.set(key, JSON.stringify(data));
  } catch(e) {
    console.log('[blobs] Failed to save state:', e.message);
  }
}

module.exports = { sendTaggedPush, fetchRSS, parseRSSItems, getLastNotified, setLastNotified };
