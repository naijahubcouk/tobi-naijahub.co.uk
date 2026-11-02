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
// 🎉 Celebration Cards — 4 designs per occasion: decoration around the edges, a calm centre for the words
const OCC_ART = {
  newmonth: {
    nmsun: ['Sunrise', 'Fresh new-month card background: a soft golden sunrise sky in peach, coral and warm gold, delicate white flowers and green leaves in the corners, gentle light rays, hopeful and bright, soft watercolour style.'],
    nmgold: ['Gold Glam', 'Elegant new-month card background: deep navy with gold foil confetti, tiny gold stars and fine gold lines in the corners, luxury and modern.'],
    nmfloral: ['Fresh Blooms', 'New-month card background in watercolour: pink, peach and white flowers with eucalyptus leaves around the corners on cream paper, fresh and joyful.'],
    nmgreen: ['Naija Green', 'Cheerful card background: emerald green and white with gold sparkles, soft green leaves and gold confetti around the edges, fresh, clean and celebratory.'],
    nmhydrangea: ['Pink Hydrangea', 'Clean card background: one beautiful pale pink hydrangea flower head with green leaves on a long stem rising from the BOTTOM CENTRE, soft white background, airy, fresh, photorealistic.', 'top'],
    nmcoral: ['Coral Silk & Dahlias', 'Luxurious card background: coral-red satin drapes on the left, big coral and blush dahlias and soft baby’s breath along the right side and the bottom, warm coral backdrop, elegant, photorealistic.', 'centre'],
    nmredgift: ['Red Rose Gift', 'Card background: a rich crimson-red flat backdrop, a white gift box with a red satin ribbon at the BOTTOM LEFT and fresh red roses at the BOTTOM RIGHT, clean and festive, photorealistic.', 'top'],
    nmsunflower: ['Sunflower Note', 'Card background: a turquoise painted wooden plank wall, a bright yellow sunflower in a glossy white vase at the LEFT edge, and a large BLANK white paper note with a curled corner held by a silver paper clip, covering the RIGHT and centre of the image (completely empty, nothing written on it), photorealistic.', 'note'],
    nmarch: ['Minimal Arch', 'Minimal interior card background: a warm beige wall with a soft arched alcove on the LEFT, a small wooden stool with a white vase and a green sprig at the bottom left, a pendant lamp edge, calm natural light, lots of empty wall space.', 'right'],
    nmsplash: ['Blue Splash', 'Bold fun card background: a big royal-blue paint splash with drips and spatter around the edges on white, energetic and modern, three blank blue 3D ribbon banners stacked in the centre (with nothing written on them).', 'centre'],
    nmbeach: ['Beach Sunset', 'Card background: a golden sunset over the sea, gentle waves, warm glowing light, smooth golden sand in the lower half with a pink seashell and a white shell, peaceful, photorealistic.', 'lower'],
    nmqueen: ['New Month Queen', 'Card background: a warm cream backdrop with a stylish illustrated young Nigerian woman with a big curly afro and a black headband, gold hoop earrings, burgundy sweatshirt and joggers and white trainers, sitting on the RIGHT side, smiling and winking with a peace sign, small pink doodle hearts, modern 3D cartoon illustration style.', 'left'],
    nmcity: ['Celebration City', 'Card background: a joyful young Black woman with short natural hair in a grey T-shirt, fists up, celebrating with a huge smile, in the BOTTOM HALF, with bright blurred city skyscrapers behind her and soft rainbow light flares, bright and airy, photorealistic.', 'top'],
    nmbold: ['Bold Black & Orange', 'Modern graphic card background: clean light-grey silk texture, bold black and orange abstract geometric shapes and thin outline shapes along the LEFT edge and corners, stylish minimal design.', 'centre'],
    nmredcal: ['Red Calendar', 'Card background: a glowing red and orange gradient, a 3D white desk calendar with silver rings tilted in the LOWER HALF (its page completely blank), soft rainbow light flares and a small red heart, modern and bold.', 'top'],
    nmgreencal: ['Green Calendar', 'Card background: a rich green gradient with soft light streaks, a 3D white desk calendar with gold rings on a green stand in the LOWER HALF (its page completely blank), modern and premium.', 'top'],
    nmmug: ['Cosy Pink Mug', 'Cosy card background: a warm beige wall with soft leaf shadows and dried flowers at the top right, at the BOTTOM a ribbed cream vase with green leaves, a blank cream card and a dusty-pink mug with a gold heart on a woven coaster, on a wooden table, photorealistic.', 'top'],
    nmpurple: ['Purple Rose Frame', 'Card background: a square frame made of deep purple and cream roses with sparkling crystal embellishments all around the EDGES, a plain soft ivory centre, elegant.', 'centre'],
    nmdried: ['Dried Flower Bouquet', 'Card background: a pastel pink dried flower bouquet tied with crumpled cream paper ribbon, lying diagonally in the TOP RIGHT, on a soft white background, minimal and airy, photorealistic.', 'lowerleft'],
    nmgerbera: ['Gerbera Garden', 'Card background: a row of colourful gerbera daisies — yellow, orange, pink and magenta — with green stems along the BOTTOM, on a clean white background, bright and cheerful, photorealistic.', 'top'],
    nmcandle: ['Pink Candle Desk', 'Card background: soft blush pink, at the BOTTOM a white vase of pink peonies, a lit pink candle in a glass, a pink notebook with a gold pen and a satin ribbon bow, gentle sparkles, dreamy and feminine, photorealistic.', 'top'],
  },
  christmas: {
    xmastree: ['Christmas Tree', 'Christmas card background: a deep green night scene, a beautiful decorated Christmas tree with warm fairy lights and gold baubles on the LEFT edge, gifts at the bottom, soft falling snow and warm golden bokeh, cosy and magical.'],
    xmasred: ['Red & Gold', 'Luxury Christmas card background: rich red velvet with glossy gold and red baubles, pine branches, holly and gold ribbon around the corners, golden sparkles.'],
    xmassnow: ['Winter Snow', 'Christmas card background: a soft white and silver winter scene, snowy pine branches, silver baubles and snowflakes around the edges, pale blue sky, peaceful.'],
    xmascosy: ['Cosy Christmas', 'Cosy Christmas card background: warm cream knit texture, gingerbread biscuits, candy canes, a mug of hot chocolate, pine sprigs and red berries around the edges, warm fairy lights.'],
  },
  newyear: {
    nyfire: ['Fireworks', 'New Year card background: a deep midnight-blue night sky full of colourful gold, pink and blue fireworks around the top and sides, city lights glow at the bottom.'],
    nygold: ['Gold Glam', 'Glamorous New Year card background: black and gold, gold and black balloons, champagne glasses clinking at the bottom, gold streamers and confetti around the edges.'],
    nysilver: ['Silver Sparkle', 'New Year card background: white and silver, silver glitter confetti, silver and white balloons and stars around the edges, bright and elegant.'],
    nynaija: ['Naija Party', 'Joyful New Year party card background: green, white and gold balloons, streamers and confetti around the edges, a festive party feel.'],
  },
  valentine: {
    valroses: ['Red Roses', 'Valentine card background: deep red, lush red roses and petals around the edges, glowing heart bokeh, romantic candlelight glow.'],
    valpink: ['Pink Hearts', 'Valentine card background: soft blush pink with pink and red paper hearts, rose petals and tiny gold sparkles around the edges, sweet and romantic.'],
    valgold: ['Love & Gold', 'Elegant Valentine card background: blush and cream with gold foil hearts, white and blush roses in the corners, delicate and luxurious.'],
    valnight: ['Candlelight', 'Romantic Valentine card background: a dark burgundy setting, candles, red roses and two glasses of wine at the bottom, warm glowing heart bokeh around the edges.'],
  },
  anniversary: {
    annrings: ['Golden Rings', 'Anniversary card background: soft champagne and ivory, two gold wedding rings resting on rose petals at the bottom, white roses and gold sparkles around the edges.'],
    annroses: ['Roses & Champagne', 'Anniversary card background: deep wine red with red roses, a champagne bottle and two glasses at the bottom, gold sparkles around the edges, romantic and rich.'],
    annclassic: ['Classic Ivory', 'Elegant anniversary card background: ivory paper with a fine gold border, white peonies and soft greenery in the corners, timeless and classy.'],
    annnight: ['Starry Night', 'Romantic anniversary card background: a navy starry night sky, a crescent moon, glowing string lights and soft white flowers around the edges.'],
  },
  wedding: {
    wedwhite: ['White Florals', 'Wedding card background: white roses, peonies and baby’s breath with soft greenery around the edges on a white background, pure and elegant.'],
    wedgold: ['Gold Elegance', 'Luxury wedding card background: ivory with gold foil leaves and a fine gold frame, two champagne glasses at the bottom, gold sparkles.'],
    wedaso: ['Aso-Oke', 'Nigerian wedding card background: rich aso-oke fabric textures in coral, gold and wine around the edges, red coral beads, an elegant gele fabric draped at the side, celebratory and regal.'],
    wedblush: ['Blush & Greenery', 'Wedding card background in watercolour: blush pink roses with eucalyptus and greenery around the corners on cream paper, soft and romantic.'],
  },
  easter: {
    eastflowers: ['Spring Flowers', 'Easter card background: soft spring flowers — tulips, daffodils and blossoms — around the edges, pastel yellow and green, fresh morning light.'],
    eastcross: ['He Is Risen', 'Easter card background: a peaceful sunrise over a green hill with a simple wooden cross on the side, soft golden light rays, white lilies at the bottom corners, reverent and hopeful.'],
    easteggs: ['Easter Eggs', 'Easter card background: pastel painted Easter eggs in a basket with spring flowers at the bottom, little chicks and blossoms around the edges, cheerful pastels.'],
    eastlily: ['White Lilies', 'Elegant Easter card background: white Easter lilies with green leaves around the edges on a soft cream and gold background, pure and graceful.'],
  },
  eid: {
    eidmoon: ['Crescent Moon', 'Eid card background: a deep navy night sky, a glowing gold crescent moon and stars at the top, ornate gold hanging lanterns at the sides, elegant and peaceful.'],
    eidlantern: ['Lanterns', 'Eid card background: rich emerald green with glowing ornate Moroccan-style lanterns hanging around the edges, warm golden light, soft bokeh.'],
    eidgold: ['Gold Pattern', 'Elegant Eid card background: cream with an intricate gold geometric Islamic pattern border around the edges, a small gold crescent, luxurious and calm.'],
    eidteal: ['Teal & Gold', 'Eid card background: deep teal with gold arches, a mosque silhouette at the bottom, gold stars and lanterns around the edges.'],
  },
  mothers: {
    mumflowers: ['Flowers for Mum', 'Mother’s Day card background: a lush bouquet of pink peonies, roses and tulips around the edges, soft pastel pink background, gentle morning light.'],
    mumpink: ['Pink & Gold', 'Elegant Mother’s Day card background: blush pink and gold, gold foil hearts and pink roses in the corners, delicate and loving.'],
    mumtea: ['Tea & Roses', 'Mother’s Day card background: a pretty teacup and teapot with roses and a gift box with a satin ribbon at the bottom, soft cream and pink, warm and cosy.'],
    mumgele: ['Naija Queen', 'Mother’s Day card background: rich Nigerian ankara fabric patterns and an elegant gele headwrap fabric at the sides, red coral beads and gold accents around the edges, regal and proud.'],
  },
  fathers: {
    dadnavy: ['Classic Navy', 'Father’s Day card background: deep navy with a gold border, a tie, a wristwatch and a cup of coffee at the bottom, classy and calm.'],
    dadwood: ['Gentleman', 'Father’s Day card background: a dark wooden desk with a leather wallet, reading glasses, a fountain pen and a gift box with a gold ribbon at the bottom, warm lamp light.'],
    dadgreen: ['Agbada Green', 'Father’s Day card background: rich emerald green and gold, Nigerian agbada embroidery patterns and a fila cap at the sides, gold accents, regal and proud.'],
    dadblue: ['Sky Blue', 'Father’s Day card background: soft sky blue with white clouds, a little paper boat and gold stars around the edges, light and cheerful.'],
  },
  independence: {
    indflag: ['Green White Green', 'Nigerian Independence Day card background: green and white ribbons, balloons and confetti around the edges on white, bold and celebratory (no flags with text).'],
    indgold: ['Green & Gold', 'Nigerian Independence Day card background: deep emerald green with gold sparkles, gold and white confetti and fine gold lines around the edges, proud and elegant.'],
    indfire: ['Celebration', 'Celebration card background: a night sky with bright green and white fireworks around the top and sides, glowing celebration lights at the bottom.'],
    indankara: ['Ankara Pride', 'Card background: vibrant green and white Nigerian ankara fabric patterns around the edges with gold accents, a white centre, joyful and proud.'],
  },
  graduation: {
    gradcap: ['Caps in the Air', 'Graduation card background: black graduation caps with gold tassels flying in the air around the top edges, a bright blue sky, gold confetti.'],
    gradnavy: ['Navy & Gold', 'Graduation card background: deep navy with gold stars, a graduation cap and rolled diploma with a gold ribbon at the bottom, gold confetti around the edges.'],
    gradscroll: ['Diploma', 'Graduation card background: cream with a rolled diploma tied with a red ribbon, books and a graduation cap at the bottom, gold sparkles, classic.'],
    gradconf: ['Confetti', 'Graduation celebration card background: white with colourful confetti, gold and black balloons and streamers around the edges, joyful.'],
  },
  newbaby: {
    babyblue: ['Baby Blue', 'New baby card background: soft baby-blue with fluffy clouds, a little teddy bear, a rattle and tiny stars around the edges, gentle and sweet.'],
    babypink: ['Baby Pink', 'New baby card background: soft baby-pink with little hearts, a teddy bear, a rattle and tiny flowers around the edges, gentle and sweet.'],
    babyneutral: ['Little Star', 'New baby card background: soft beige and cream, a gentle crescent moon, little stars and a sleeping teddy bear around the edges, calm and dreamy.'],
    babyclouds: ['Clouds', 'New baby card background: a pastel rainbow and soft white clouds with tiny hot-air balloons around the edges, light and joyful.'],
  },
  thanks: {
    thxflowers: ['Flowers', 'Thank-you card background: a fresh bouquet of colourful flowers around the edges on a soft cream background, warm and grateful.'],
    thxgold: ['Gold Gratitude', 'Elegant thank-you card background: white with gold foil leaves and a fine gold frame in the corners, classy and simple.'],
    thxgreen: ['Green Leaves', 'Thank-you card background: fresh green leaves and small white flowers around the edges on a light background, natural and calm.'],
    thxnight: ['Navy & Gold', 'Thank-you card background: deep navy with gold botanical line art in the corners and gold sparkles, elegant.'],
  },
  congrats: {
    conconf: ['Confetti Pop', 'Congratulations card background: bright colourful confetti bursting from the corners, party poppers and streamers, joyful and fun.'],
    congold: ['Gold Stars', 'Congratulations card background: black and gold, gold stars and gold confetti around the edges, a champagne bottle popping at the bottom.'],
    controphy: ['Trophy', 'Congratulations card background: a shining gold trophy at the bottom side, gold and white confetti around the edges, a warm spotlight glow.'],
    conballoons: ['Balloons', 'Congratulations card background: colourful glossy balloons in gold, teal and coral around the edges with streamers, cheerful.'],
  },
};
const CENTRE = new Set();
const SPACE = {};
for (const o of Object.values(OCC_ART)) for (const [k, v] of Object.entries(o)) { ART[k] = v[1]; CENTRE.add(k); if (v[2]) SPACE[k] = v[2]; }
// where the empty space for the words must be, for designs that are not decorated all round
const SPACE_TEXT = { top: 'TOP HALF', centre: 'CENTRE', note: 'blank white note (the note itself must stay completely empty)', right: 'RIGHT HALF', lower: 'LOWER HALF', left: 'LEFT HALF', lowerleft: 'LOWER LEFT area' };
const BDAY_LABELS = { pinkballoons: 'Pink & Gold Balloons', blueballoons: 'Blue & Gold Balloons', purpleluxe: 'Purple Luxe', minimalgold: 'Minimal Gold', chocolate: 'Chocolate Cake', lilac: 'Lilac Celebration', glitter: 'Gold Glitter', love: 'Romantic Red', daughter: 'Pastel Dream', sister: 'Coral Glow', brother: 'Navy Star', wife: 'Champagne Roses', husband: 'Midnight Gold', mother: 'Peony Garden', father: 'Emerald Gold' };
const OCC_NAMES = { birthday: '🎂 Birthday', newmonth: '🗓️ Happy New Month', christmas: '🎄 Christmas', newyear: '🎆 New Year', valentine: '💝 Valentine’s Day', anniversary: '💍 Anniversary', wedding: '👰🏾 Wedding', easter: '🐣 Easter', eid: '🌙 Eid Mubarak', mothers: '👩🏾 Mother’s Day', fathers: '👨🏾 Father’s Day', independence: '🇳🇬 Independence Day', graduation: '🎓 Graduation', newbaby: '👶🏾 New Baby', thanks: '🙏🏾 Thank You', congrats: '🎉 Congratulations' };
// for HQ: [{ occ, name, designs: [[key, label]] }]
const GROUPS = [{ occ: 'birthday', name: OCC_NAMES.birthday, designs: Object.entries(BDAY_LABELS) }]
  .concat(Object.entries(OCC_ART).map(([occ, o]) => ({ occ, name: OCC_NAMES[occ], designs: Object.entries(o).map(([k, v]) => [k, v[0]]) })));
const SIZES = { sq: '1:1', st: '9:16' };
function prompt(key, size) {
  if (SPACE[key]) return `${ART[key]} ${SAFE} in the ${SPACE_TEXT[SPACE[key]]} of the image for a greeting to be added later — keep that area plain, soft and uncluttered (no objects, no patterns there). High quality, ${SIZES[size]} format.`;
  if (CENTRE.has(key)) return `${ART[key]} ${SAFE} in the CENTRE of the image (about the middle ${size === 'st' ? '60% of the height and 80% of the width' : '70%'}) for a greeting to be added later — keep all decoration to the edges and corners and the centre plain, soft and uncluttered. High quality, ${SIZES[size]} format.`;
  return `${ART[key]} ${SAFE} in the ${size === 'st' ? 'MIDDLE (from about 15% to 70% of the height)' : 'CENTRE and RIGHT (at least half of the card)'} for a greeting text to be added later — keep that area plain, light and uncluttered. High quality, ${SIZES[size]} format.`;
}

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
  // daily: photos older than 60 days and card links older than a year are deleted
  let n = 0; const stopAt = Date.now() + 24000; // stay inside the scheduled-function time limit; carries on tomorrow
  for (const prefix of ['bday/photo/', 'card/']) {
    for (const key of await core.listKeys(prefix)) {
      if (Date.now() > stopAt) return n;
      const p = await getJson(key); if (!p || p.expiresAt < Date.now()) { await core.del(key).catch(() => {}); n++; }
    }
  }
  return n;
}
// 🔗 short card links — /c/<id>: the card's words + design are kept for a year (the photo itself is still deleted after 60 days)
const CARD_DAYS = 365;
const CARD_KEYS = { o: 20, n: 30, a: 3, m: 320, f: 40, s: 30, d: 20, z: 6, w: 12, p: 24, ps: 1, pp: 6, mn: 2, yr: 4, g: 8, tp: 6, tx: 6, ty: 6, ts: 5, pz: 6, px: 6, py: 6 };
async function saveCard(card, ip) {
  if (!card || typeof card !== 'object') throw new HttpError(400, 'bad_card', 'That card couldn’t be saved.');
  const d = {};
  for (const [k, max] of Object.entries(CARD_KEYS)) if (card[k] != null && card[k] !== '') d[k] = typeof card[k] === 'number' ? card[k] : String(card[k]).slice(0, max);
  if (!d.m && !d.n) throw new HttpError(400, 'bad_card', 'Add a name or a message first.');
  await core.rateLimit('card-link', ip || 'x', 60, 60 * 60 * 1000, 'That’s a lot of card links this hour — please try again later.');
  const A = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let t = 0; t < 5; t++) {
    const id = Array.from(crypto.randomBytes(7), b => A[b % A.length]).join('');
    let made = false;
    await cas(`card/${id}`, cur => { if (cur) return undefined; made = true; return { d, expiresAt: Date.now() + CARD_DAYS * 864e5 }; }).catch(() => {});
    if (made) return id;
  }
  throw new HttpError(500, 'card_failed', 'That card link couldn’t be made — please try again.');
}
async function getCard(id) {
  if (!/^[A-Za-z0-9]{5,12}$/.test(String(id))) return null;
  const c = await getJson(`card/${id}`);
  if (!c || c.expiresAt < Date.now()) return null;
  return c.d;
}
module.exports = { saveCard, getCard, ART, GROUPS, artIndex, makeArt, removeArt, getArt, savePhoto, getPhoto, cleanPhotos, PHOTO_DAYS };
