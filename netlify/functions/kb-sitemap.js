'use strict';
// kb-sitemap.js — generates sitemap for all published KB articles

exports.handler = async function(event) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore({ name: 'auntie-tobi-kb', consistency: 'strong' });
    const { blobs } = await store.list();

    const articles = [];
    for (const blob of blobs) {
      if (!blob.key.startsWith('pub_')) continue;
      try {
        const raw = await store.get(blob.key);
        const item = JSON.parse(raw);
        if (item.slug && item.publishedAt) {
          articles.push({ slug: item.slug, date: item.publishedAt });
        }
      } catch(e) { continue; }
    }

    const urls = articles.map(a => `
  <url>
    <loc>https://auntietobi.co.uk/kb/${a.slug}</loc>
    <lastmod>${new Date(a.date).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://auntietobi.co.uk</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://auntietobi.co.uk/kb</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://auntietobi.co.uk/business</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>${urls}
</urlset>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
      body: xml
    };
  } catch(err) {
    return { statusCode: 500, body: err.message };
  }
};
