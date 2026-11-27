// 🎓 Save my progress (practice-test sites) — /.netlify/functions/learn-api (logic in studio-lib/learners.js)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/learn.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
