'use strict';
/*
 * 👥 Characters (HQ) — people who appear again and again in Auntie Tobi's videos.
 * Each has a name, a detailed look (+ outfit) and ONE reference photo (made with HQ's image model or uploaded).
 * When a scene picture is made with characters picked, their reference photos are sent with the prompt so they
 * look the same in every scene (and in AI clips, which start from that picture).
 *   hq/chars/list  { items: [{ id, name, look, outfit, img, at, by, from }] }   (img = HQ picture id)
 * Characters from 🎥 Video Ad Studio projects can be copied into the library.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, cas } = core;

const LIST = 'hq/chars/list';
const str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const okId = id => /^c[a-f0-9]{12}$/.test(String(id || ''));
const okImg = id => /^i[a-z0-9]{6,30}$/.test(String(id || ''));

async function all() { const l = await getJson(LIST).catch(() => null); return (l && l.items) || []; }
async function list() {
  const items = await all(), have = {}; items.forEach(c => { if (c.from) have[c.from] = 1; });
  // characters in Video Ad Studio projects that have a reference photo (offered to copy in)
  let vads = [];
  try {
    const projects = await require('./videoad').list();
    projects.forEach(p => (((p.plan || {}).cast) || []).forEach((c, k) => {
      const img = ((p.make || {}).castImgs || {})[k]; const from = `va:${p.id}:${k}`;
      if (img && c && c.name && !have[from]) vads.push({ from, name: str(c.name, 60), look: str([c.description, c.outfit ? 'Outfit: ' + c.outfit : ''].filter(Boolean).join('. '), 600), eimg: img, project: str((p.plan || {}).title || (p.brief || {}).name || '', 80) });
    }));
  } catch (e) { vads = []; }
  return { items, vads: vads.slice(0, 40) };
}
function portraitPrompt(c) {
  return `A photorealistic reference portrait photo of one person, for keeping a character consistent across a video. ${c.look}${c.outfit ? ` Outfit: ${c.outfit}.` : ''} Head and upper body, facing the camera with a natural warm expression, plain soft light-grey background, even soft studio light, sharp focus on the face, true-to-life skin tone. Vertical 4:5 photo. Absolutely NO text, letters, logos or watermarks.`;
}
async function photo(b) {
  const look = str(b.look, 800); if (look.length < 10) throw new HttpError(400, 'too_short', 'Describe how they look first (age, skin tone, hair, face, build…).');
  const url = await require('./eventmedia').generateImage(portraitPrompt({ look, outfit: str(b.outfit, 300) }), '4:5');
  return { img: await require('./hq').saveImage(url) };
}
async function save(b, email) {
  const name = str(b.name, 60); if (!name) throw new HttpError(400, 'invalid', 'Give the character a name.');
  let img = okImg(b.img) ? b.img : '';
  if (!img && /^e[a-z0-9]{6,30}$/.test(String(b.eimg || ''))) {   // copying in a Video Ad Studio character
    const rec = await require('./eventsub').getImage(b.eimg); if (rec && rec.dataUrl) img = await require('./hq').saveImage(rec.dataUrl);
  }
  if (!img) throw new HttpError(400, 'invalid', 'Make or upload their reference photo first.');
  const id = okId(b.id) ? b.id : 'c' + crypto.randomBytes(6).toString('hex');
  const item = { id, name, look: str(b.look, 800), outfit: str(b.outfit, 300), img, at: core.nowIso(), by: email || '', from: str(b.from, 80) };
  await cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift(item); return { items: l.slice(0, 100) }; });
  return { item };
}
async function remove(id) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Which character?');
  await cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  return { ok: true };
}
// reference photos + labels for a scene's picked characters (max 3)
async function refs(ids) {
  const items = await all(), out = { refs: [], labels: [], names: [] };
  for (const id of (Array.isArray(ids) ? ids : []).filter(okId).slice(0, 3)) {
    const c = items.find(x => x.id === id); if (!c) continue;
    const rec = await require('./hq').getImage(c.img); if (!rec || !rec.dataUrl) continue;
    out.refs.push(rec.dataUrl); out.labels.push(`${c.name}: ${c.look}${c.outfit ? ` Outfit: ${c.outfit}.` : ''}`); out.names.push(c.name);
  }
  return out;
}

module.exports = { list, photo, save, remove, refs };
