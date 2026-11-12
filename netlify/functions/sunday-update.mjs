// 📰 Auntie Tobi's Sunday Update: every 10 minutes on Saturdays and Sundays.
// Saturday from 7am (London) makes the draft for HQ → 📰 Sunday Update; Sunday from 9am sends it — ONLY if Auntie Tobi approved it.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import sunday from './studio-lib/sunday.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  const out = await sunday.tick(20000);
  console.log('[sunday-update]', JSON.stringify(out));
  return new Response('ok');
};
export const config = { schedule: '*/10 * * * 0,6' };
