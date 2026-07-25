'use strict';
// Knowledge Base Manager — list, get, update, delete Q&A items from Netlify Blobs

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'auntie-tobi-kb', consistency: 'strong' });

    // GET — list all or get one
    if (event.httpMethod === 'GET') {
      const key = event.queryStringParameters?.key;

      if (key) {
        // Get single item
        const raw = await store.get(key);
        if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ key, ...JSON.parse(raw) }) };
      }

      // List all items
      const { blobs } = await store.list();
      const items = await Promise.all(
        blobs
          .filter(b => b.key.startsWith('q_'))
          .sort((a, b) => b.key.localeCompare(a.key)) // newest first
          .slice(0, 100)
          .map(async b => {
            try {
              const raw = await store.get(b.key);
              return { key: b.key, ...JSON.parse(raw) };
            } catch(e) { return null; }
          })
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: items.filter(Boolean) })
      };
    }

    // PUT — update status (approve/reject/publish)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { key, status, generated } = body;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'key required' }) };
      const raw = await store.get(key);
      if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      const item = JSON.parse(raw);
      if (status) item.status = status;
      if (generated) item.generated = generated;
      item.updatedAt = new Date().toISOString();
      await store.set(key, JSON.stringify(item));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key, status: item.status }) };
    }

    // DELETE — remove item
    if (event.httpMethod === 'DELETE') {
      const key = event.queryStringParameters?.key;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'key required' }) };
      await store.delete(key);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, deleted: key }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('[kb-manager]', err.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
