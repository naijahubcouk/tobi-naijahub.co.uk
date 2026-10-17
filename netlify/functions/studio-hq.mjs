// Auntie Tobi HQ — /.netlify/functions/studio-hq (Seun's private AI assistant; admin only)
// Logic lives in studio-lib/handlers/hq.js and studio-lib/hq.js; this file uses Netlify's current function format.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/hq.js';

v2.useBlobs(netlifyBlobs);
const json = v2.toV2(mod.handler);

export default async (req, context) => {
  const url = new URL(req.url);
  if (url.searchParams.get('stream') === '1') return mod.stream(req, context);
  return json(req, context);
};
