// Shared helper for sending targeted OneSignal push notifications
const https = require('https');

const APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';

// Send push to users with a specific tag (category preference)
// Falls back to all subscribers if no tagged users found
function sendTaggedPush(tag, title, body, url) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ONESIGNAL_API_KEY;
    if (!apiKey) return reject(new Error('ONESIGNAL_API_KEY not set'));

    const notification = {
      app_id: APP_ID,
      // Target users with this tag, OR all subscribers as fallback
      filters: [
        { field: 'tag', key: tag, relation: '=', value: '1' }
      ],
      headings: { en: title },
      contents: { en: body },
      web_url: url || 'https://auntietobi.co.uk',
      app_url: url || 'https://auntietobi.co.uk',
      chrome_web_icon: 'https://auntietobi.co.uk/icons/icon-192.png',
      firefox_icon: 'https://auntietobi.co.uk/icons/icon-192.png',
    };

    const sendNotification = (payload) => new Promise((res, rej) => {
      const payloadStr = JSON.stringify(payload);
      const req = https.request({
        hostname: 'onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + apiKey,
          'Content-Length': Buffer.byteLength(payloadStr),
        }
      }, (response) => {
        let data = '';
        response.on('data', c => data += c);
        response.on('end', () => {
          try { res({ status: response.statusCode, data: JSON.parse(data) }); }
          catch (e) { rej(e); }
        });
      });
      req.on('error', rej);
      req.setTimeout(10000, () => { req.destroy(); rej(new Error('Timeout')); });
      req.write(payloadStr);
      req.end();
    });

    // Try with tag filter first
    sendNotification(notification).then(result => {
      // If no subscribers with this tag, send to everyone
      const errors = result.data && result.data.errors;
      const noSubscribers = errors && (
        JSON.stringify(errors).includes('not subscribed') ||
        JSON.stringify(errors).includes('No subscribers') ||
        (result.data.recipients === 0)
      );
      if (noSubscribers) {
        console.log(`[${tag}] No tagged subscribers — sending to all`);
        const allPayload = Object.assign({}, notification);
        delete allPayload.filters;
        allPayload.included_segments = ['All'];
        return sendNotification(allPayload);
      }
      return result;
    }).then(resolve).catch(reject);
  });
}

// Simple in-memory last-sent tracker using Netlify Blobs fallback (env var)
// We store last notified slug in env — but env vars can't be written at runtime
// So we use a lightweight approach: store in a JSON file via Netlify Blobs API
// For simplicity: use process.env.LAST_NOTIFIED_* — set via Netlify API after each send
// Alternative: use a free KV store. For now we use a file-based approach via /tmp

const fs = require('fs');
const path = require('path');

function getLastNotified(key) {
  try {
    const f = path.join('/tmp', `last_${key}.txt`);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '';
  } catch { return ''; }
}

function setLastNotified(key, value) {
  try {
    fs.writeFileSync(path.join('/tmp', `last_${key}.txt`), value, 'utf8');
  } catch {}
}

// Fetch and parse blog RSS
function fetchRSS() {
  return new Promise((resolve, reject) => {
    const req = https.get('https://auntietobi.com/feed/blog', {
      headers: { 'User-Agent': 'AuntieTobi-Notify/1.0', 'Accept': 'application/rss+xml' }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 500000) data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSSItems(xml) {
  const items = [];
  const blocks = xml.split('<item>').slice(1);
  for (const block of blocks) {
    const end = block.indexOf('</item>');
    const item = end !== -1 ? block.substring(0, end) : block;

    const getTag = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
        || item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      if (!m) return '';
      return m[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
    };

    const title = getTag('title');
    const link = getTag('link') || getTag('guid');
    const description = getTag('description').replace(/<[^>]+>/g, '').substring(0, 150);
    const category = getTag('category');
    const slug = link.split('/blog/')[1] || link.split('/').pop() || '';

    if (!title || !slug) continue;
    items.push({ title, slug, description, category, url: `https://auntietobi.com/blog/${slug}` });
  }
  return items;
}

module.exports = { sendTaggedPush, getLastNotified, setLastNotified, fetchRSS, parseRSSItems };
