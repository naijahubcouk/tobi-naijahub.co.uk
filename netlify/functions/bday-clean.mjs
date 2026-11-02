// 🎉 Daily clean-up: deletes card photos older than 60 days and card links older than a year
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import bday from './studio-lib/bday.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  const n = await bday.cleanPhotos();
  console.log('[bday-clean] removed', n);
  return new Response('ok');
};
export const config = { schedule: '23 4 * * *' };
