// 💬 Community questions: every Monday, hourly from 05:23 to 13:23, one topic search per run (9 topics).
// Builds "Top questions this week" in HQ → 💬 Community questions. Nothing is posted anywhere.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import qs from './studio-lib/questions.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  const r = await qs.workWeekly(1);
  console.log('[questions-weekly]', JSON.stringify(r));
  return new Response('ok');
};
export const config = { schedule: '23 5-13 * * 1' };
