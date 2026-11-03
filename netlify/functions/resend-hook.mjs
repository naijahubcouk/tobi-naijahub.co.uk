// 👁 Resend webhook: email opened / clicked / bounced / marked as spam → HQ Business directory timelines.
// Set RESEND_WEBHOOK_SECRET in Netlify to the signing secret Resend shows for this webhook.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/resend-hook.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
