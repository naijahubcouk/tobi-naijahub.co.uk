// 🖼 Business pictures kept by Auntie Tobi — served at /bimg/<slug>-<ver>.<ext>
// (its own function with its own address, so the picture name always reaches the code)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import bizimg from './studio-lib/bizimg.js';

v2.useBlobs(netlifyBlobs);

export default async (req) => {
  const file = decodeURIComponent(new URL(req.url).pathname.replace(/^\/bimg\//, ''));
  try {
    const out = await bizimg.serve(file);
    return new Response(Buffer.from(out.body, 'base64'), { status: 200, headers: out.headers });
  } catch (e) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=60' } });
  }
};

export const config = { path: '/bimg/*' };
