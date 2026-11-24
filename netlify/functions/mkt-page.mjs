// 🔗 Marketplace product pages — /marketplace/<product-name>-<id>
// Netlify sends these addresses straight here (config.path below), so the product part always arrives.
// The page itself is made in studio-lib/market.js (productPage): photos, price, order button, share, link previews.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import market from './studio-lib/market.js';

v2.useBlobs(netlifyBlobs);

export default async (req, context) => {
  const slug = (context && context.params && context.params.product) || new URL(req.url).pathname.split('/').filter(Boolean).pop() || '';
  let out;
  try { out = await market.productPage(decodeURIComponent(slug)); }
  catch (e) { console.error('[mkt-page]', e && e.message); return new Response('', { status: 302, headers: { Location: '/marketplace', 'Cache-Control': 'no-store' } }); }
  return new Response(out.body, { status: out.statusCode, headers: out.headers });
};

export const config = { path: '/marketplace/:product', excludedPath: ['/marketplace/list'] };
