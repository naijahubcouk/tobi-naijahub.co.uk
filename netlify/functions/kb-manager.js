'use strict';

function makeSlug(question) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/-$/, '');
}

function makeTitle(question) {
  // Turn question into article title
  const q = question.trim().replace(/\?$/, '');
  // Capitalise first letter
  return q.charAt(0).toUpperCase() + q.slice(1);
}

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
        const raw = await store.get(key);
        if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ key, ...JSON.parse(raw) }) };
      }

      const { blobs } = await store.list();
      const items = await Promise.all(
        blobs
          .filter(b => b.key.startsWith('q_') || b.key.startsWith('pub_'))
          .sort((a, b) => b.key.localeCompare(a.key))
          .slice(0, 200)
          .map(async b => {
            try {
              const raw = await store.get(b.key);
              return { key: b.key, ...JSON.parse(raw) };
            } catch(e) { return null; }
          })
      );
      return { statusCode: 200, headers, body: JSON.stringify({ items: items.filter(Boolean) }) };
    }

    // PUT — update or publish
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { key, status, seo, faq, shortAnswer, longAnswer, video, carousel, podcast } = body;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'key required' }) };

      const raw = await store.get(key);
      if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      const item = JSON.parse(raw);

      // Save generated content
      if (seo) item.seo = seo;
      if (faq) item.faq = faq;
      if (shortAnswer) item.shortAnswer = shortAnswer;
      if (longAnswer) item.longAnswer = longAnswer;
      if (video) item.video = video;
      if (carousel) item.carousel = carousel;
      if (podcast) item.podcast = podcast;
      if (status) item.status = status;
      item.updatedAt = new Date().toISOString();

      // PUBLISH — create a pub_ key with clean slug
      if (status === 'published') {
        const slug = makeSlug(item.q);
        const title = makeTitle(item.q);
        item.slug = slug;
        item.title = title;
        item.publishedAt = new Date().toISOString();

        // Save as published article
        const pubKey = 'pub_' + slug;
        await store.set(pubKey, JSON.stringify({
          ...item,
          key: pubKey,
          slug,
          title,
          status: 'published'
        }));

        // Update original with published status
        await store.set(key, JSON.stringify(item));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            published: true,
            slug,
            url: `https://auntietobi.co.uk/kb/${slug}`
          })
        };
      }

      await store.set(key, JSON.stringify(item));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key, status: item.status }) };
    }

    // DELETE
    if (event.httpMethod === 'DELETE') {
      const key = event.queryStringParameters?.key;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'key required' }) };
      await store.delete(key);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, deleted: key }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('[kb-manager]', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
