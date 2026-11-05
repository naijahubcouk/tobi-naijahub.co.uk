// 🔄 DirectoryEasy webhook: listing created / updated / approved / deleted → HQ (step 1: listening only).
// Set DIRECTORY_WEBHOOK_SECRET in Netlify to the Webhook Secret DirectoryEasy shows.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/dir-hook.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
