// Auntie Tobi Business Studio — member ↔ Auntie Tobi messages: /.netlify/functions/studio-messages
// Logic lives in studio-lib/handlers/messages.js and studio-lib/messages.js; this file uses Netlify's current function format.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/messages.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
