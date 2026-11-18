// ⏰ Ask Auntie scheduled prompts: every 5 minutes, runs any that are due (UK time). Never posts or emails anything.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import sched from './studio-lib/asksched.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  try { const out = await sched.runDue(15000); if (out.due) console.log('[hq-schedule]', JSON.stringify(out)); }
  catch (e) { console.error('[hq-schedule] failed', e && e.message); }
  return new Response('ok');
};
export const config = { schedule: '*/5 * * * *' };
