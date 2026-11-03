'use strict';
/*
 * 🖼 Business pictures kept by Auntie Tobi (for businesses added in HQ / by the Business Finder).
 *   bizimg/<slug>  { dataUrl, at, src: 'site' | 'upload' | 'card' }
 * Public address: /bimg/<slug>-<ver>.<ext>  (the version changes when the picture changes, so caches refresh)
 * Only served while the business is in the directory and not hidden.
 */
const core = require('./core');
const { HttpError, getJson, setJson, del } = core;

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX = 2.6 * 1024 * 1024;

function parse(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const size = Math.floor(m[2].length * 3 / 4);
  if (size < 1500 || size > MAX) return null;
  return { type: m[1], ext: TYPES[m[1]] };
}
// Saves a picture for a business and returns its public link.
async function put(slug, dataUrl, src) {
  const p = parse(dataUrl);
  if (!p) throw new HttpError(400, 'bad_image', 'That picture couldn’t be used — please try a JPG or PNG under 2.5MB.');
  const ver = Date.now().toString(36).slice(-6);
  await setJson('bizimg/' + slug, { dataUrl, at: core.nowIso(), src: src || 'upload', ver });
  return `${core.siteBase()}/bimg/${encodeURIComponent(slug)}-${ver}.${p.ext}`;
}
async function remove(slug) { await del('bizimg/' + slug).catch(() => {}); }
const slugOf = file => String(file || '').replace(/-[a-z0-9]{1,8}\.(jpg|png|webp)$/i, '').replace(/[^A-Za-z0-9._~-]/g, '');

// GET /bimg/<file> → the picture
async function serve(file) {
  const slug = slugOf(file);
  const b = slug && (await require('./bizdir').all()).find(x => x.slug === slug && !x.hidden);
  const rec = b ? await getJson('bizimg/' + slug).catch(() => null) : null;
  const m = rec && /^data:([^;]+);base64,(.*)$/.exec(rec.dataUrl);
  if (!m) throw new HttpError(404, 'not_found', 'Not found.');
  return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff' }, body: m[2], isBase64Encoded: true };
}

module.exports = { put, remove, serve, parse };
