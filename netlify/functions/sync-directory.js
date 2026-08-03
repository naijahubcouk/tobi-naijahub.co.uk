'use strict';
// Netlify scheduled function — runs every 2 hours
// Fetches all live listings from auntietobi.com and saves to Netlify Blobs
// chat-openai.js reads from Blobs so the AI always has up-to-date businesses

const https = require('https');
const { getStore } = require('@netlify/blobs');

const BLOB_STORE = 'auntie-tobi-directory';
const BLOB_KEY = 'live-directory';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'AuntieTobi-Sync/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { reject(new Error('Parse error: ' + data.substring(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

exports.handler = async function(event) {
  const isManual = event.httpMethod === 'GET';

  try {
    console.log('[sync-dir] Starting directory sync...');

    // Fetch live listings from our own function
    const result = await fetchJSON('https://auntietobi.co.uk/.netlify/functions/fetch-listings-feed');

    if (!result.data || !result.data.businesses) {
      throw new Error('No businesses in response: ' + JSON.stringify(result.data).substring(0, 100));
    }

    const businesses = result.data.businesses;
    console.log(`[sync-dir] Fetched ${businesses.length} businesses`);

    // Normalise fields so chat-openai.js can use them consistently
    const normalised = businesses.map(b => ({
      slug: b.slug || '',
      name: b.name || '',
      cat: b.cat || b.category || '',
      loc: b.loc || b.location || b.city || 'UK',
      desc: b.desc || b.description || '',
      phone: b.phone || '',
      wa: b.wa || b.whatsapp || '',
      email: b.email || '',
      website: b.website || '',
      ig: b.ig || b.instagram || '',
      verified: b.verified || false,
      keywords: b.keywords || [],
    }));

    // Save to Netlify Blobs
    const store = getStore({ name: BLOB_STORE });
    await store.set(BLOB_KEY, JSON.stringify({
      businesses: normalised,
      count: normalised.length,
      synced: new Date().toISOString(),
    }));

    console.log(`[sync-dir] ✅ Saved ${normalised.length} businesses to Blobs`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, count: normalised.length, synced: new Date().toISOString() })
    };

  } catch(err) {
    console.error('[sync-dir] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
