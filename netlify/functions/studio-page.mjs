// Auntie Tobi Business Studio — /.netlify/functions/studio-page
// Logic lives in studio-lib/handlers/page.js; this file uses Netlify's current function format.
// Imported here (not only lazily inside studio-lib) so Netlify's bundler packages the storage library.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/page.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
