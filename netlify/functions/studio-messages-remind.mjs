// Auntie Tobi Business Studio — hourly email for unread replies (scheduled; not callable from the web).
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/messages-remind.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
export const config = { schedule: '23 * * * *' };
