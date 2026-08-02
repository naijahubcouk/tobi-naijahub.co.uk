'use strict';
const https = require('https');
const { getStore } = require('@netlify/blobs');

const APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';

function httpsPost(path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'onesignal.com',
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
        catch(e) { reject(new Error('Parse error: ' + data.substring(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

function httpsGet(path, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'onesignal.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Key ${apiKey}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function getAllPlayerIds(apiKey) {
  const ids = [];
  const limit = 300;
  let offset = 0;
  let total = null;

  while (true) {
    const result = await httpsGet(
      `/api/v1/players?app_id=${APP_ID}&limit=${limit}&offset=${offset}`,
      apiKey
    ).catch(() => null);

    if (!result || !result.data || !result.data.players) break;

    const players = result.data.players;
    if (total === null) total = result.data.total_count || players.length;

    ids.push(...players.map(p => p.id).filter(Boolean));
    offset += players.length;

    // Stop if we have all or no more
    if (players.length < limit || ids.length >= total) break;
  }

  console.log(`[players] Fetched ${ids.length} of ${total} total`);
  return { ids, total };
}

async function sendTaggedPush(tag, title, body, url) {
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!apiKey) throw new Error('ONESIGNAL_API_KEY not set');

  const basePayload = {
    app_id: APP_ID,
    headings: { en: title },
    contents: { en: body },
    web_url: url || 'https://auntietobi.co.uk',
    app_url: url || 'https://auntietobi.co.uk',
    chrome_web_icon: 'https://auntietobi.co.uk/icons/icon-192.png',
  };

  // Try to get player IDs directly (works best for small-medium audiences)
  const { ids, total } = await getAllPlayerIds(apiKey);

  let payload;

  if (ids.length > 0 && ids.length <= 2000) {
    // Under 2000 — target by player ID (most reliable)
    payload = Object.assign({}, basePayload, {
      include_player_ids: ids,
    });
    console.log(`[${tag}] Targeting ${ids.length} player IDs directly`);
  } else {
    // Over 2000 — use segment (scales automatically)
    payload = Object.assign({}, basePayload, {
      included_segments: ['Total Subscriptions'],
    });
    console.log(`[${tag}] Large audience (${total}), using segment`);
  }

  const result = await httpsPost('/api/v1/notifications', payload, apiKey);
  console.log(`[${tag}] Response:`, JSON.stringify(result.data));
  return result;
}

async function fetchRSS() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.auntietobi.com',
      path: '/feed.xml',
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
  return m ? m[1].trim() : '';
}

function slugify(title) {
  return title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseRSSItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  for (const item of itemMatches) {
    const title = getTag(item, 'title');
    const description = getTag(item, 'description').replace(/<[^>]+>/g, '').substring(0, 150);
    const pubDate = getTag(item, 'pubDate');
    const link = getTag(item, 'link');
    const category = getTag(item, 'category');
    const slug = link.split('/').filter(Boolean).pop() || slugify(title);
    const key = slugify(title).toLowerCase();
    const uniqueId = slug || key;
    const appUrl = `https://auntietobi.co.uk/blog/${key}`;
    items.push({ title, description, pubDate, link, category, slug, key, uniqueId, appUrl });
  }
  return items;
}

async function getLastNotified(type) {
  try {
    const store = getStore('auntie-tobi-kb');
    const val = await store.get(`last-notified-${type}`);
    return val || null;
  } catch(e) { return null; }
}

async function setLastNotified(type, value) {
  try {
    const store = getStore('auntie-tobi-kb');
    await store.set(`last-notified-${type}`, value);
  } catch(e) { console.log('setLastNotified error:', e.message); }
}

module.exports = { sendTaggedPush, fetchRSS, parseRSSItems, getLastNotified, setLastNotified };
