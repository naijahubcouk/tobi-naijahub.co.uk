'use strict';
// kb-index.js — serves the KB index page at auntietobi.co.uk/kb

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
        articles.push(item);
      } catch(e) { continue; }
    }

    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const cards = articles.map(a => `
      <a href="https://auntietobi.co.uk/kb/${a.slug}" class="card">
        <div class="card-title">${a.title}</div>
        <div class="card-desc">${(a.shortAnswer || a.question || '').substring(0, 100)}...</div>
        <div class="card-meta">${new Date(a.publishedAt).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</div>
      </a>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Knowledge Base — Auntie Tobi | Guides for Nigerians in the UK</title>
  <meta name="description" content="Answers to the most common questions Nigerians in the UK ask — housing, immigration, NHS, work rights, benefits and more.">
  <link rel="canonical" href="https://auntietobi.co.uk/kb">
  <meta property="og:title" content="Knowledge Base — Auntie Tobi">
  <meta property="og:description" content="Guides and answers for Nigerians living in the UK.">
  <meta property="og:url" content="https://auntietobi.co.uk/kb">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f9f9f9; color: #0F1E36; }
    .header { background: #0F1E36; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
    .header img { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #FFB81C; }
    .header a { color: #FFB81C; font-weight: 800; font-size: 18px; text-decoration: none; }
    .hero { background: #0F1E36; padding: 32px 20px; text-align: center; border-bottom: 3px solid #FFB81C; }
    .hero h1 { color: white; font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .hero p { color: rgba(255,255,255,0.7); font-size: 14px; }
    .container { max-width: 720px; margin: 0 auto; padding: 24px 16px 60px; }
    .grid { display: grid; gap: 14px; }
    .card { background: white; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; text-decoration: none; display: block; transition: border-color 0.2s; }
    .card:hover { border-color: #057A44; }
    .card-title { font-size: 15px; font-weight: 700; color: #0F1E36; margin-bottom: 6px; line-height: 1.4; }
    .card-desc { font-size: 13px; color: #6B7280; line-height: 1.5; margin-bottom: 8px; }
    .card-meta { font-size: 11px; color: #9CA3AF; }
    .empty { text-align: center; padding: 60px 20px; color: #9CA3AF; }
    .cta { background: #057A44; color: white; text-align: center; padding: 20px; border-radius: 12px; margin-top: 28px; }
    .cta a { color: #FFB81C; font-weight: 700; text-decoration: none; }
    .footer { background: #0F1E36; color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px; margin-top: 40px; }
    .footer a { color: #FFB81C; text-decoration: none; }
  </style>
</head>
<body>
  <header class="header">
    <img src="https://naijabiz.b-cdn.net/013d6cf6-3a2b-4a14-a3d3-5bcb0e378424-1783702300556.png" alt="Auntie Tobi">
    <a href="https://auntietobi.co.uk">Auntie Tobi</a>
  </header>
  <div class="hero">
    <h1>🧠 Knowledge Base</h1>
    <p>Answers to real questions from Nigerians in the UK</p>
  </div>
  <div class="container">
    ${articles.length > 0 ? `<div class="grid">${cards}</div>` : '<div class="empty">No articles published yet. Check back soon!</div>'}
    <div class="cta">
      <p style="color:white;margin-bottom:8px;font-weight:600;">Can't find your answer?</p>
      <a href="https://auntietobi.co.uk">💬 Ask Auntie Tobi directly →</a>
    </div>
  </div>
  <footer class="footer">
    <p>© ${new Date().getFullYear()} <a href="https://auntietobi.co.uk">Auntie Tobi</a> — The Nigerian Community Guide for the UK</p>
  </footer>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
      body: html
    };
  } catch(err) {
    return { statusCode: 500, body: err.message };
  }
};
