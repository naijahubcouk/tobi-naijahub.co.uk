// 💚 My Plan — /.netlify/functions/my-plan (logic in studio-lib/handlers/myplan.js)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/myplan.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
