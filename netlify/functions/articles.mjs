// Auntie Tobi website articles — /articles and /articles/<slug>
// Built from the articles published in Auntie Tobi HQ ("Publish to App"). Logic lives in studio-lib/handlers/articles.js.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/articles.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
