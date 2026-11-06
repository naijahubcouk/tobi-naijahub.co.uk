// 🎒 School Tracker — /.netlify/functions/school-file (opens attachments; logic in studio-lib/school.js)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/school-file.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
