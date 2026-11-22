'use strict';
/*
 * ✂️ Cut-out people for Carousel Studio: removes a photo's background with fal.ai BiRefNet v2
 * (uses the fal.ai key already saved in ⚙️ Video AI settings — the key never reaches the browser).
 * tc-cut starts a queued job; tc-cut-check polls it and, when done, saves the transparent picture as an HQ image (i…).
 */
const { HttpError } = require('./core');
const vai = require('./videoai');
const hq = require('./hq');
const MODEL = 'fal-ai/birefnet/v2';
const isJobUrl = v => /^https:\/\/queue\.fal\.run\/fal-ai\/birefnet\/[A-Za-z0-9._\-/]+$/.test(String(v || ''));
const isMediaUrl = v => /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\/[A-Za-z0-9._\-/%]+$/.test(String(v || ''));

async function key() {
  const s = await vai.settings();
  if (!s.falKey) throw new HttpError(400, 'fal_key', 'Removing backgrounds needs fal.ai — add the key in ⚙️ Video AI settings first.');
  return s.falKey;
}
async function start(dataUrl) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl || '')) || dataUrl.length > 4.5 * 1024 * 1024) throw new HttpError(400, 'bad_image', 'Please use a JPG, PNG or WebP photo.');
  const r = await vai.falFetch(`https://queue.fal.run/${MODEL}`, { method: 'POST', timeout: 9500, body: { image_url: dataUrl, model: 'General Use (Heavy)', operating_resolution: '1024x1024', output_format: 'webp', refine_foreground: true } }, await key());
  if (!r || !isJobUrl(r.status_url) || !isJobUrl(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start removing the background — please try again.');
  return { job: { s: r.status_url, r: r.response_url } };
}
async function check(job) {
  job = job && typeof job === 'object' ? job : {};
  if (!isJobUrl(job.s) || !isJobUrl(job.r)) throw new HttpError(400, 'bad_job', 'That job isn’t recognised — please try again.');
  const k = await key();
  const st = await vai.falFetch(job.s, { timeout: 8000 }, k);
  const status = String((st && st.status) || '');
  if (status !== 'COMPLETED') return { status: status === 'IN_PROGRESS' ? 'working' : 'waiting' };
  const out = await vai.falFetch(job.r, { timeout: 8000 }, k);
  const url = out && out.image && out.image.url;
  let dataUrl = '';
  if (/^data:image\/(png|webp);base64,/.test(String(url || ''))) dataUrl = url;
  else {
    if (!isMediaUrl(url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t send the picture back — please try again.');
    const res = await fetch(url); if (!res.ok) throw new HttpError(502, 'fal_error', 'Couldn’t fetch the cut-out picture — please try again.');
    const buf = Buffer.from(await res.arrayBuffer()), ct = /png/.test(res.headers.get('content-type') || url) ? 'png' : 'webp';
    dataUrl = `data:image/${ct};base64,${buf.toString('base64')}`;
  }
  if (dataUrl.length > 2200000) throw new HttpError(413, 'too_large', 'The cut-out came back too big — try a smaller photo.');
  return { status: 'done', img: await hq.saveImage(dataUrl) };
}
module.exports = { start, check, MODEL };
