// 🔎 Business Finder: every Monday, hourly from 06:17 to 14:17, works through this week's searches (2 per run).
// Results wait in HQ → 🔎 Business Finder for Auntie Tobi to approve. Nothing is added to the app automatically.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import finder from './studio-lib/finder.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  await finder.ensureWeek();
  const ran = await finder.work(25000, 2);
  console.log('[finder-weekly]', JSON.stringify(ran));
  return new Response('ok');
};
export const config = { schedule: '17 6-14 * * 1' };
