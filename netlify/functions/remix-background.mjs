// 🎞️ Video Remix — slow AI reading jobs (reading a video's style, writing a 🎬 Recreate Pack). Netlify runs "-background"
// functions for up to 15 minutes and answers the caller straight away (202). Only runs a job HQ started (it needs the job's secret).
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import remix from './studio-lib/remix.js';

v2.useBlobs(netlifyBlobs);

export default async (req) => {
  try { const b = await req.json(); await remix.jobRun(b.job, b.t); } catch (e) { console.error('remix job', e && e.message); }
  return new Response('', { status: 202 });
};
