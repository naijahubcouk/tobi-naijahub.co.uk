// Auntie Tobi Business Studio — daily reminder push + weekly email round-up (scheduled; not callable from the web).
// Logic lives in studio-lib/handlers/daily.js; this file uses Netlify's current function format.
// Imported here (not only lazily inside studio-lib) so Netlify's bundler packages the storage library.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/daily.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
export const config = { schedule: '52 7 * * *' };
