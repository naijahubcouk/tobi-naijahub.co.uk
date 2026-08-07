// Netlify Edge Function — serves dynamic OG tags for /biz/:slug
// Deploy to: netlify/edge-functions/biz-og.js

export default async (request, context) => {
  const url = new URL(request.url);
  const slug = url.pathname.replace('/biz/', '').replace(/\/$/, '');

  if (!slug) return context.next();

  // Fetch business data from our listings feed
  let biz = null;
  try {
    const feedUrl = new URL('/.netlify/functions/fetch-listings-feed', request.url);
    const res = await fetch(feedUrl.toString());
    if (res.ok) {
      const data = await res.json();
      biz = (data.businesses || []).find(b => b.slug === slug);
    }
  } catch(e) {}

  // Fallback metadata if business not found
  const name = biz?.name || 'Nigerian Business on Auntie Tobi';
  const desc = biz?.desc || 'Discover Nigerian businesses across the UK on Auntie Tobi.';
  const cat = biz?.cat || 'Nigerian Business';
  const loc = biz?.loc || 'UK';
  const image = biz?.image || 'https://auntietobi.co.uk/icons/icon-512.png';
  const pageUrl = `https://auntietobi.co.uk/biz/${slug}`;

  // Fetch the original index.html
  const response = await context.next();
  const html = await response.text();

  // Inject business-specific OG tags
  const ogTags = `
    <!-- Business OG tags for ${slug} -->
    <meta property="og:title" content="${name} — Auntie Tobi">
    <meta property="og:description" content="${desc.substring(0, 200)} | ${cat} in ${loc}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Auntie Tobi">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${name} — Auntie Tobi">
    <meta name="twitter:description" content="${desc.substring(0, 200)}">
    <meta name="twitter:image" content="${image}">`;

  // Replace generic OG tags with business-specific ones
  const newHtml = html.replace(
    '<meta property="og:title"',
    `${ogTags}\n    <meta property="og:title-original"`
  );

  return new Response(newHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    }
  });
};

export const config = { path: '/biz/*' };
