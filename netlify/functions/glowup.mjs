// ✨ Instagram Glow-Up client form — /.netlify/functions/glowup (public, by private link)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/glowup.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
