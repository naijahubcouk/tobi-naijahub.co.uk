// ☀️ My Plan morning emails: every hour; sends to people who switched them on, at their chosen hour (London), only on days with something due.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import myplan from './studio-lib/myplan.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  const out = await myplan.morning(22000);
  console.log('[myplan-morning]', JSON.stringify(out));
  return new Response('ok');
};
export const config = { schedule: '4 * * * *' };
