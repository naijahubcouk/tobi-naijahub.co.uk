// Auntie Tobi app feed — /.netlify/functions/app-content (public, read only)
// Serves the updates, articles and events published from Auntie Tobi HQ ("Publish to App").
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/app-content.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
