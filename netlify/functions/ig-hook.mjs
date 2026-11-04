// ⚡ Instagram auto-replies: webhook for your pages' comments and messages, and the "Connect page" sign-in return.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/ig-hook.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
