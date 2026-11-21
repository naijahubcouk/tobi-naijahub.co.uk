// ⏰ Ask Auntie scheduled prompts: every 5 minutes, runs any that are due (UK time). Never posts or emails anything.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import sched from './studio-lib/asksched.js';
import clubcheck from './studio-lib/clubcheck.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  try { const out = await sched.runDue(15000); if (out.due) console.log('[hq-schedule]', JSON.stringify(out)); }
  catch (e) { console.error('[hq-schedule] failed', e && e.message); }
  // 💚 on/after the 1st: prepare this month's Club check-ups (never sends anything)
  try { const c = await clubcheck.autoPrepare(8000); if (c && (c.done || c.failed)) console.log('[hq-schedule] club', JSON.stringify(c)); }
  catch (e) { console.error('[hq-schedule] club failed', e && e.message); }
  return new Response('ok');
};
export const config = { schedule: '*/5 * * * *' };
