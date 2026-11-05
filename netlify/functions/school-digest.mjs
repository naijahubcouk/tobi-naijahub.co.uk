// 🎒 School Tracker — morning (7am) and Sunday (6pm) email updates, UK time. Runs hourly; sends only at those hours.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/school-digest.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
export const config = { schedule: '5 * * * *' };
