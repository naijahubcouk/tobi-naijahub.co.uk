// Shared HQ post links — /blog/at-<slug> → the app with that post's own preview (title, summary, flyer)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/blog-page.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
