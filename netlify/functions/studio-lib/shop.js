'use strict';
/*
 * Shareable price list / menu page (free). Public at /p/<slug> once the member publishes it.
 *   shop/<email>              { slug, published, title, intro, area, whatsapp, orderNote, items: [...] }
 *   shop-slug/<slug>          { email }   (claimed atomically so two members can't take the same link)
 *   shop-img/<email>/<itemId> { dataUrl }  (photos resized on the phone, ≤ ~200 KB)
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson, enc, cleanText } = core;

const MAX_ITEMS = 30;
const RESERVED = new Set(['admin', 'studio', 'studio-admin', 'api', 'www', 'auntie', 'tobi', 'auntietobi', 'auntie-tobi', 'help', 'support', 'login', 'signin', 'p', 'shop', 'biz', 'blog', 'kb', 'news', 'jobs', 'naijahub', 'official', 'test']);
const key = email => `shop/${enc(email)}`;
const slugKey = slug => `shop-slug/${slug}`;
const imgKey = (email, id) => `shop-img/${enc(email)}/${id}`;

function slugify(s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
function phoneDigits(p) { let n = String(p || '').replace(/\D/g, ''); if (n.startsWith('0')) n = `44${n.slice(1)}`; return n.slice(0, 15); }
function newId() { return core.randomToken(6).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).padEnd(6, 'x'); }

async function get(email) {
  const s = await getJson(key(email));
  if (s) return s;
  const p = (await getJson(`profiles/${enc(email)}`)) || {};
  return { slug: '', suggestedSlug: slugify(p.businessName), published: false, title: p.businessName || '', intro: p.description ? String(p.description).slice(0, 300) : '', area: p.location || '', whatsapp: p.whatsapp || '', orderNote: '', items: [], isNew: true };
}

async function save(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const cur = await getJson(key(email));
  const slug = slugify(raw.slug);
  if (slug.length < 3) throw new HttpError(400, 'invalid_slug', 'Choose a page link of at least 3 letters or numbers, e.g. ada-cakes.');
  if (RESERVED.has(slug)) throw new HttpError(400, 'invalid_slug', 'That page link isn’t available. Try adding your town, e.g. ' + slug + '-london.');
  const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS).map(it => {
    const old = cur && cur.items.find(o => o.id === it.id);
    return {
      id: old ? old.id : newId(),
      name: cleanText(it && it.name, 70), price: cleanText(it && it.price, 30), desc: cleanText(it && it.desc, 260),
      hasImg: old ? !!old.hasImg : false, imgV: old ? old.imgV || 0 : 0,
    };
  }).filter(it => it.name);
  const whatsapp = phoneDigits(raw.whatsapp);
  if (whatsapp && whatsapp.length < 10) throw new HttpError(400, 'invalid_field', 'Check the WhatsApp number (e.g. 07700 900123).');
  // Claim the link (atomic) and release the old one.
  if (!cur || cur.slug !== slug) {
    await cas(slugKey(slug), owner => {
      if (owner && owner.email !== email) throw new HttpError(409, 'slug_taken', 'That page link is already taken. Try adding your town or a word, e.g. ' + slug + '-uk.');
      return owner && owner.email === email ? undefined : { email, at: core.nowIso() };
    });
    if (cur && cur.slug) {
      const old = await getJson(slugKey(cur.slug));
      if (old && old.email === email) await core.del(slugKey(cur.slug)).catch(() => {});
    }
  }
  // Delete photos of removed items.
  if (cur) for (const o of cur.items) if (o.hasImg && !items.some(i => i.id === o.id)) await core.del(imgKey(email, o.id)).catch(() => {});
  const shop = {
    slug, published: cur ? !!cur.published : false,
    title: cleanText(raw.title, 80), intro: cleanText(raw.intro, 400), area: cleanText(raw.area, 80),
    whatsapp, orderNote: cleanText(raw.orderNote, 200), items,
    createdAt: cur ? cur.createdAt : core.nowIso(), updatedAt: core.nowIso(),
  };
  if (!shop.title) throw new HttpError(400, 'missing_field', 'Add a title for your page (usually your business name).');
  if (shop.published && (!shop.items.length || !shop.whatsapp)) shop.published = false;
  await setJson(key(email), shop);
  return shop;
}

async function setImage(email, itemId, dataUrl) {
  const url = String(dataUrl || '');
  const m = url.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || url.length > 280000) throw new HttpError(400, 'invalid_image', 'Please choose a photo (it’s resized automatically).');
  const bytes = Buffer.from(m[2], 'base64');
  const magic = { png: [0x89, 0x50, 0x4E, 0x47], jpeg: [0xFF, 0xD8, 0xFF], webp: [0x52, 0x49, 0x46, 0x46] }[m[1]];
  if (!magic.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'invalid_image', 'That file doesn’t look like an image.');
  let shop;
  await cas(key(email), cur => {
    if (!cur) throw new HttpError(400, 'save_first', 'Save your page first, then add photos.');
    const it = cur.items.find(i => i.id === itemId);
    if (!it) throw new HttpError(404, 'not_found', 'Save this item first, then add a photo.');
    it.hasImg = true; it.imgV = Date.now();
    shop = cur; return cur;
  });
  await setJson(imgKey(email, itemId), { dataUrl: url, mime: `image/${m[1]}` });
  return shop;
}

async function deleteImage(email, itemId) {
  let shop;
  await cas(key(email), cur => {
    if (!cur) return undefined;
    const it = cur.items.find(i => i.id === itemId);
    if (it) { it.hasImg = false; it.imgV = 0; }
    shop = cur; return cur;
  });
  await core.del(imgKey(email, itemId)).catch(() => {});
  return shop;
}

async function publish(email, on) {
  let shop;
  await cas(key(email), cur => {
    if (!cur) throw new HttpError(400, 'save_first', 'Save your page first.');
    if (on && !cur.items.length) throw new HttpError(400, 'missing_field', 'Add at least one item before publishing.');
    if (on && !cur.whatsapp) throw new HttpError(400, 'missing_field', 'Add your WhatsApp number so customers can order.');
    cur.published = !!on; cur.publishedAt = on ? core.nowIso() : cur.publishedAt;
    shop = cur; return cur;
  });
  return shop;
}

// Public view. Returns null when the page shouldn't be shown.
async function publicPage(slug) {
  slug = slugify(slug);
  if (!slug) return null;
  const owner = await getJson(slugKey(slug));
  if (!owner) return null;
  const [shop, member, profile] = await Promise.all([getJson(key(owner.email)), core.getMember(owner.email), getJson(`profiles/${enc(owner.email)}`)]);
  if (!shop || !shop.published || shop.slug !== slug || !member || member.shopDisabled) return null;
  const acc = core.access(member, await core.getSettings());
  if (!acc.canCreate) return null;
  const logo = profile && profile.hasLogo ? await getJson(`logos/${enc(owner.email)}`) : null;
  return { email: owner.email, shop, profile: profile || {}, logo: logo ? logo.dataUrl : null };
}

async function publicImage(slug, itemId) {
  const page = await publicPage(slug);
  if (!page || !page.shop.items.some(i => i.id === itemId && i.hasImg)) return null;
  return getJson(imgKey(page.email, itemId));
}

module.exports = { get, save, setImage, deleteImage, publish, publicPage, publicImage, slugify, MAX_ITEMS };
