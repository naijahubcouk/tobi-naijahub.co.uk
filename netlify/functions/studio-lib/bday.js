'use strict';
/*
 * 🎂 Auntie Tobi Birthday Cards — premium card artwork + loved-one photos for card links.
 *   bday/art/<key>-<size>   { dataUrl, at }      AI-made background art (no text), made once from HQ
 *   bday/art-index          { items: { "<key>-<size>": version } }
 *   bday/photo/<id>         { dataUrl, expiresAt }  photos added to cards — deleted after 60 days
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;

const PHOTO_DAYS = 60;
const SAFE = 'IMPORTANT: absolutely NO text, letters, words, numbers or logos anywhere in the image. Leave a large clean, softly lit empty area';
// Original Auntie Tobi designs (inspired by popular card styles, never copies). The text and photo are added on the phone.
const ART = {
  pinkballoons: 'Elegant birthday card background: a bouquet of glossy pink, rose-gold and gold foil balloons and one clear confetti balloon tied with a pink satin ribbon bow on the LEFT edge, soft pink watercolour wash around the edges, scattered gold glitter dots, a few small pink hearts and gold sparkles, cream paper texture.',
  blueballoons: 'Elegant birthday card background: a bouquet of glossy royal-blue and gold foil balloons and one clear confetti balloon tied with a blue satin ribbon bow on the LEFT edge, soft blue watercolour wash around the edges, scattered gold glitter dots, small blue hearts and gold sparkles, off-white paper texture.',
  purpleluxe: 'Luxury birthday card background: purple and glossy black balloons with gold balloons around the TOP and SIDES, gold and purple roses at the sides, a black drip cake with gold drips and cherries and one lit candle at the BOTTOM LEFT, a purple gift box with a gold ribbon at the BOTTOM RIGHT, rich purple backdrop with a soft arch in the middle, photorealistic 3D render.',
  minimalgold: 'Minimal luxury birthday card background: warm cream paper, a matte black gift box with a champagne-gold satin bow at the BOTTOM RIGHT, a black and gold pen lying at the bottom, soft natural shadow, elegant and calm, photorealistic.',
  chocolate: 'Birthday card background: a rich chocolate cake with gold sprinkles and five lit gold candles at the BOTTOM RIGHT on a dark plate, a black gift box with a gold ribbon behind it, gold confetti hearts on a grey stone table, a soft grey wall, a blurred green plant, warm cosy light, photorealistic.',
  lilac: 'Birthday card background: a lilac and gold celebration — a lilac cake with a gold band, cherries and one lit candle at the BOTTOM LEFT, a black gift box with gold ribbon at the BOTTOM RIGHT, gold, black and lilac balloons and lilac roses behind, a soft purple backdrop panel in the middle, photorealistic 3D render.',
  glitter: 'Birthday card background in watercolour illustration style: a wide gold glitter border frame around a white card, a striped gift bag overflowing with gold-wrapped presents, a black-and-gold gift box, a cream balloon and a black balloon with gold swirls in the BOTTOM HALF, tiny gold and black stars and paint splashes.',
  love: 'Romantic birthday card background: deep red and blush-pink roses with soft petals and glowing heart-shaped bokeh around the EDGES, red and gold heart balloons at the top corners, warm candlelight glow, elegant and romantic, photorealistic.',
  daughter: 'Sweet birthday card background for a daughter: pastel pink and lilac balloons, a small sparkly tiara and butterflies, soft pink flowers around the EDGES, magical twinkling lights, gentle dreamy watercolour style.',
  sister: 'Fun stylish birthday card background for a sister: coral, peach and gold balloons, pink flowers and gold confetti around the EDGES, a little champagne glass toast, warm and joyful, soft watercolour style.',
  brother: 'Cool birthday card background for a brother: navy, teal and gold balloons, a gold star and confetti around the EDGES, a wrapped gift with a navy ribbon at the bottom, modern and bold, clean illustration style.',
  wife: 'Elegant romantic birthday card background for a wife: champagne, blush and gold balloons, white and blush roses, a champagne bottle with two glasses at the BOTTOM, gold sparkles around the EDGES, luxurious and soft, photorealistic.',
  husband: 'Classy birthday card background for a husband: deep navy and black with gold balloons, a premium wristwatch and a black gift box with a gold ribbon at the BOTTOM, a dark wooden surface, gold confetti, sophisticated and masculine, photorealistic.',
  mother: 'Beautiful birthday card background for a mother: lush pink peonies, white roses and soft greenery around the EDGES, a teacup and a gift box with a satin bow at the BOTTOM, gentle morning light, warm and graceful, watercolour style.',
  father: 'Distinguished birthday card background for a father: rich green and gold, a leather-bound book, reading glasses, a cup of coffee and a gift box with a gold ribbon at the BOTTOM on a wooden table, gold confetti, warm and dignified, photorealistic.',
};
const SIZES = { sq: '1:1', st: '9:16' };
function prompt(key, size) { return `${ART[key]} ${SAFE} in the ${size === 'st' ? 'MIDDLE (from about 15% to 70% of the height)' : 'CENTRE and RIGHT (at least half of the card)'} for a greeting text to be added later — keep that area plain, light and uncluttered. High quality, ${SIZES[size]} format.`; }

async function artIndex() { const v = (await getJson('bday/art-index')) || {}; return v.items || {}; }
async function makeArt(key, size) {
  if (!ART[key] || !SIZES[size]) throw new HttpError(400, 'bad_design', 'Unknown design.');
  const img = await require('./eventmedia').generateImage(prompt(key, size), SIZES[size]);
  const id = `${key}-${size}`;
  await setJson(`bday/art/${id}`, { dataUrl: img, at: core.nowIso() });
  let items;
  await cas('bday/art-index', cur => { items = Object.assign({}, cur && cur.items, { [id]: Date.now().toString(36) }); return { items }; });
  return items;
}
async function removeArt(key, size) {
  const id = `${key}-${size}`;
  await core.del(`bday/art/${id}`).catch(() => {});
  let items; await cas('bday/art-index', cur => { items = Object.assign({}, cur && cur.items); delete items[id]; return { items }; });
  return items;
}
async function getArt(id) { return /^[a-z]{3,20}-(sq|st)$/.test(String(id)) ? getJson(`bday/art/${id}`) : null; }

async function savePhoto(dataUrl, ip) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl || '')) || dataUrl.length > 900000) throw new HttpError(400, 'bad_photo', 'That photo couldn’t be used — try another.');
  await core.rateLimit('bday-photo', ip || 'x', 30, 60 * 60 * 1000, 'That’s a lot of photos this hour — please try again later.');
  const id = 'p' + crypto.randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toLowerCase();
  await setJson(`bday/photo/${id}`, { dataUrl, expiresAt: Date.now() + PHOTO_DAYS * 864e5 });
  return id;
}
async function getPhoto(id) {
  if (!/^p[a-z0-9]{6,20}$/.test(String(id))) return null;
  const p = await getJson(`bday/photo/${id}`);
  if (!p) return null;
  if (p.expiresAt < Date.now()) { await core.del(`bday/photo/${id}`).catch(() => {}); return null; }
  return p;
}
async function cleanPhotos() {
  let n = 0;
  for (const key of await core.listKeys('bday/photo/')) { const p = await getJson(key); if (!p || p.expiresAt < Date.now()) { await core.del(key).catch(() => {}); n++; } }
  return n;
}
module.exports = { ART, artIndex, makeArt, removeArt, getArt, savePhoto, getPhoto, cleanPhotos, PHOTO_DAYS };
