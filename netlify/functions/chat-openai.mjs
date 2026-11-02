// Auntie Tobi app chat — /.netlify/functions/chat-openai
// Wrapped in the current Netlify format so it can read the HQ fact sheet from Blobs.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/chat-openai.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
