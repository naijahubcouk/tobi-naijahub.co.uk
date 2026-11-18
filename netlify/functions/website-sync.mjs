// 🌐 Website sync: every hour, approved businesses go to the website's Google Sheet as PENDING, and ones
// Auntie Tobi has published in DirectoryEasy are marked "On the website" in HQ. Does nothing until it's set up in HQ.
// Never sends any email.
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import websheet from './studio-lib/websheet.js';
import hq from './studio-lib/hq.js';

v2.useBlobs(netlifyBlobs);

export default async () => {
  // ↪️ also: kept Weekly ideas not posted on their day move to today
  try { const n = await hq.carryOver(); if (n) console.log('[website-sync] carried over', n); } catch (e) { console.error('[website-sync] carry-over failed', e && e.message); }
  try { console.log('[website-sync]', JSON.stringify(await websheet.sync('website-sync'))); }
  catch (e) { console.error('[website-sync] failed', e && e.message); }
  return new Response('ok');
};
export const config = { schedule: '23 * * * *' };
