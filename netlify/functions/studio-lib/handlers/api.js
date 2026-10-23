'use strict';
/*
 * Business Studio member API. Every action requires a valid member session.
 * POST /.netlify/functions/studio-api  { action, ... }
 */
const core = require('../core');
const { HttpError, handler, cleanText, enc, cas, randomToken } = core;
const tools = require('../tools');
const gen = require('../generate');
const stripe = require('../stripe');
const directory = require('../directory');
const website = require('../website');
const growth = require('../growth');
const links = require('../listinglinks');
const webcheck = require('../websitecheck');

const PROFILE_FIELDS = {
  businessName: 80, industry: 60, location: 80, products: 600, customers: 400,
  instagram: 60, website: 200, toneNotes: 200, description: 1200, whatsapp: 20,
};

const CHANNELS = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'website', 'listing', 'google'];

// existing: the saved profile (keeps the linked listing, which is only changed via listing-link).
async function cleanProfile(raw, existing, event, email) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const p = {};
  for (const [k, max] of Object.entries(PROFILE_FIELDS)) p[k] = cleanText(raw[k], max);
  p.instagram = p.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  if (p.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(p.instagram)) throw new HttpError(400, 'invalid_field', 'Instagram handle looks wrong — use just the handle, e.g. auntietobi_uk');
  if (p.instagram) p.instagram = '@' + p.instagram;
  if (p.website) {
    if (!/^https?:\/\//i.test(p.website)) p.website = 'https://' + p.website;
    try { const u = new URL(p.website); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; }
    catch (_) { throw new HttpError(400, 'invalid_field', 'Website address looks wrong.'); }
  }
  p.whatsapp = p.whatsapp.replace(/[^\d+]/g, '');
  if (p.whatsapp && !/^\+?\d{10,15}$/.test(p.whatsapp)) throw new HttpError(400, 'invalid_field', 'WhatsApp number looks wrong \u2014 include the country code, e.g. 447700900123');
  // Auntie Tobi listing: kept from the saved profile, or cleared if the box is emptied.
  p.listingSlug = existing && existing.listingSlug ? existing.listingSlug : '';
  for (const k of ['listingCheck', 'listingConfirmed', 'listingLinkedAt']) if (existing && existing[k] !== undefined) p[k] = existing[k];
  if (raw.listingSlug === '' || raw.listingSlug === null) {
    if (p.listingSlug) await links.release(email, p.listingSlug);
    p.listingSlug = ''; delete p.listingCheck; delete p.listingConfirmed; delete p.listingLinkedAt;
  } else if (raw.listingSlug && raw.listingSlug !== p.listingSlug) {
    const old = p.listingSlug;
    const { fields } = await links.linkFields(event, raw.listingSlug, email);
    Object.assign(p, fields);
    if (old && old !== p.listingSlug) await links.release(email, old);
  }
  p.listingDeclined = (existing && existing.listingDeclined) || [];
  p.igSource = ['website', 'listing'].includes(raw.igSource) && p.instagram ? raw.igSource : (existing && existing.instagram === p.instagram ? existing.igSource || '' : '');
  Object.assign(p, await webcheck.check(email, p, existing));
  p.channels = (Array.isArray(raw.channels) ? raw.channels : []).filter(c => CHANNELS.includes(c));
  p.channels = [...new Set(p.channels)];
  if (p.listingSlug && !p.channels.includes('listing')) p.channels.push('listing');
  if (!p.channels.length) p.channels = ['instagram'];
  p.mainChannel = p.channels.includes(raw.mainChannel) ? raw.mainChannel : p.channels[0];
  p.tone = Object.keys(tools.TONES).includes(raw.tone) ? raw.tone : 'warm';
  p.ctas = (Array.isArray(raw.ctas) ? raw.ctas : String(raw.ctas || '').split('\n'))
    .map(s => cleanText(s, 80)).filter(Boolean).slice(0, 6);
  for (const req of ['businessName', 'industry', 'location', 'products', 'customers', 'description']) {
    if (!p[req]) throw new HttpError(400, 'missing_field', 'Please complete all the required fields.');
  }
  return p;
}

async function getProfile(email) { return core.getJson(`profiles/${enc(email)}`); }

// ── Carousel maker design (what the member edited) ──
const CAR_TEMPLATES = ['bold', 'minimal', 'split', 'notebook', 'chat', 'gradient', 'magazine', 'ankara', 'checklist', 'photo'];
const carImgKey = (email, ref) => `carimg/${enc(email)}/${ref}`;
function cleanCarouselDesign(d) {
  d = d && typeof d === 'object' ? d : {};
  const hex = v => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v).toUpperCase() : null;
  const slides = (Array.isArray(d.slides) ? d.slides : []).slice(0, 10).map(x => ({
    headline: cleanText(x && x.headline, 160), body: cleanText(x && x.body, 400),
    img: /^c[A-Za-z0-9]{6,20}$/.test(String(x && x.img || '')) ? x.img : '',
    scale: (v => (Number.isFinite(v) ? Math.max(0.6, Math.min(1.6, Math.round(v * 100) / 100)) : 1))(Number(x && x.scale)),
    photo: (p => ({ mode: ['small', 'medium', 'large', 'full'].includes(p.mode) ? p.mode : 'medium', fit: p.fit === 'fit' ? 'fit' : 'fill',
      zoom: Math.max(1, Math.min(4, Number(p.zoom) || 1)), x: Math.max(-1, Math.min(1, Number(p.x) || 0)), y: Math.max(-1, Math.min(1, Number(p.y) || 0)) }))((x && x.photo && typeof x.photo === 'object') ? x.photo : {}),
  }));
  if (slides.length < 1) throw new HttpError(400, 'invalid', 'A carousel needs at least one slide.');
  const num = (v, lo, hi, def) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v * 100) / 100)) : def; };
  return {
    format: ['carousel', 'post', 'story'].includes(d.format) ? d.format : 'carousel',
    size: ['portrait', 'square', 'story'].includes(d.size) ? d.size : 'portrait',
    numbers: d.numbers !== false, swipe: d.swipe !== false,
    headScale: num(d.headScale, 0.6, 1.8, 1), bodyScale: num(d.bodyScale, 0.6, 1.8, 1),
    template: CAR_TEMPLATES.includes(d.template) ? d.template : 'bold',
    color1: hex(d.color1) || '#057A44', color2: hex(d.color2) || '#FFB81C',
    font: ['modern', 'elegant', 'bold'].includes(d.font) ? d.font : 'modern',
    logo: d.logo !== false, handle: cleanText(d.handle, 60), cta: cleanText(d.cta, 60), slides,
    caption: cleanText(d.caption, 2200), hashtags: (Array.isArray(d.hashtags) ? d.hashtags : []).map(t => cleanText(t, 40)).filter(Boolean).slice(0, 30),
  };
}

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const action = body.action;
  const level = action === 'bootstrap' ? 'buyer' : action === 'generate' || action === 'refine' || action === 'design-create' ? 'create' : 'view';
  const auth = await core.requireMember(ctx, { level });
  const email = auth.sess.email;

  switch (action) {
    case 'bootstrap': {
      const m = auth.member;
      const base = {
        tools: tools.publicToolList(),
        tones: Object.keys(tools.TONES),
        limits: { free: auth.settings.freeLimit, standard: auth.settings.standardLimit, pro: auth.settings.proLimit, power: auth.settings.powerLimit },
        credits: require('../credits').enabled(auth.settings) ? { packs: require('../credits').packs(auth.settings), validMonths: 12 } : null,
        billing: { enabled: stripe.billingEnabled(), intervals: stripe.billingEnabled() ? stripe.availableIntervals() : [], plans: stripe.billingEnabled() ? stripe.availablePlans() : {} },
      };
      if (!m || !auth.access.canView) {
        // Verified email without an account (or without access): offer Business Studio Pro.
        return { ...base, state: 'buyer', member: { email, isClub: !!m && m.status !== 'none', membershipExpiresAt: m ? m.membershipExpiresAt : null }, access: auth.access };
      }
      const [profile, history] = await Promise.all([getProfile(email), core.getJson(gen.historyIndexKey(email))]);
      return {
        ...base,
        state: auth.access.canCreate ? 'active' : 'readonly',
        member: { email, name: m.name || '', isClub: m.status !== 'none', membershipExpiresAt: m.membershipExpiresAt },
        access: auth.access,
        addon: m.addon ? { status: m.addon.status, interval: m.addon.interval, tier: m.addon.tier === 'pro' ? 'pro' : 'plus', amount: m.addon.amount || null, currentPeriodEnd: m.addon.currentPeriodEnd, cancelAtPeriodEnd: m.addon.cancelAtPeriodEnd } : null,
        usage: auth.access.canCreate ? await gen.usageSummary(email, auth.access) : null,
        profile: profile && profile.businessName ? profile : null,
        listing: profile && profile.listingSlug ? directory.publicListing(await directory.bySlug(ctx.event, profile.listingSlug)) : null,
        recent: ((history && history.items) || []).slice(0, 5),
      };
    }

    case 'listing-suggest': {
      // "Is this your business?" — only when the member's email matches a listing's email.
      const profile = await getProfile(email);
      if (profile && profile.listingSlug) return { listing: null };
      const b = await directory.byEmail(ctx.event, email);
      if (!b || (profile && (profile.listingDeclined || []).includes(b.slug))) return { listing: null };
      if (await links.takenBy(b.slug, email)) return { listing: null };
      return { listing: directory.publicListing(b) };
    }

    case 'listing-search': {
      // "Find your business" — search Auntie Tobi listings by name. Never returns emails.
      await core.rateLimit('listing-search', email, 120, 60 * 60 * 1000);
      const q = cleanText(body.q, 80);
      const found = await directory.search(ctx.event, q, 8);
      const map = await links.owners();
      const me = core.normalizeEmail(email);
      return { results: found.map(r => ({ ...r, taken: !!(map[r.slug] && map[r.slug] !== me) })) };
    }

    case 'listing-lookup': {
      const slug = directory.slugFromLink(body.link);
      const b = slug ? await directory.bySlug(ctx.event, slug) : null;
      if (!b) throw new HttpError(404, 'not_found', 'We couldn\u2019t find that listing. Check the link \u2014 it looks like auntietobi.co.uk/biz/your-business');
      await links.assertFree(b.slug, email);
      return { listing: directory.publicListing(b), check: links.checkFor(b, email) };
    }

    case 'listing-link': {
      const { b, fields } = await links.linkFields(ctx.event, String(body.slug || ''), email);
      const now = core.nowIso();
      let old = '';
      const saved = await cas(`profiles/${enc(email)}`, cur => {
        const p = cur ? { ...cur } : { createdAt: now };
        old = p.listingSlug || '';
        Object.assign(p, fields);
        p.channels = [...new Set([...(p.channels || []), 'listing'])];
        p.updatedAt = now;
        return p;
      });
      if (old && old !== b.slug) await links.release(email, old);
      await core.audit(email, 'listing_linked', { slug: b.slug, check: fields.listingCheck });
      return { listing: directory.publicListing(b), profile: saved.businessName ? saved : null };
    }

    case 'website-read': {
      // Setup helper: reads their public website and drafts profile fields. Free for the member
      // (not counted against the daily allowance); the small AI cost is added to Business Studio spend.
      await core.rateLimit('website-read', email, 6, 60 * 60 * 1000, 'You\u2019ve read a few websites already \u2014 please type your details or try again later.');
      await core.rateLimit('website-read-day', email, 15, 24 * 60 * 60 * 1000, 'Please try again tomorrow, or type your details in.');
      const out = await website.read(body.url, auth.settings, gen.callModel);
      if (out.usage) {
        await gen.addGlobal(core.monthKey(), { id: 'website-read', tool: 'website-read', cost: 0, inTok: out.usage.inTok, outTok: out.usage.outTok, costUsd: out.usage.costUsd }, auth.settings);
      }
      await webcheck.recordRead(email, body.url, out.site, out.draft);
      return { site: out.site, draft: out.draft, hadText: out.hadText };
    }

    case 'brand-save': {
      const hex = v => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v).toUpperCase() : null;
      const brand = { color1: hex(body.color1) || '#057A44', color2: hex(body.color2) || '#FFB81C',
        font: ['modern', 'elegant', 'bold'].includes(body.font) ? body.font : 'modern' };
      const saved = await cas(`profiles/${enc(email)}`, cur => ({ ...(cur || { createdAt: core.nowIso() }), brand }));
      return { brand: saved.brand };
    }

    case 'logo-save': {
      // Small image (resized on the phone first). PNG, JPEG or WebP data URL, max ~200 KB.
      const url = String(body.dataUrl || '');
      const m = url.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!m || url.length > 280000) throw new HttpError(400, 'invalid_logo', 'Please choose a PNG or JPG image (it\u2019s resized automatically).');
      const bytes = Buffer.from(m[2], 'base64');
      const magic = { png: [0x89, 0x50, 0x4E, 0x47], jpeg: [0xFF, 0xD8, 0xFF], webp: [0x52, 0x49, 0x46, 0x46] }[m[1]];
      if (!magic.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'invalid_logo', 'That file doesn\u2019t look like an image.');
      await core.setJson(`logos/${enc(email)}`, { dataUrl: url, updatedAt: core.nowIso() });
      await cas(`profiles/${enc(email)}`, cur => ({ ...(cur || { createdAt: core.nowIso() }), hasLogo: true }));
      return { ok: true };
    }

    case 'logo-get': {
      const l = await core.getJson(`logos/${enc(email)}`);
      return { dataUrl: l ? l.dataUrl : null };
    }

    case 'logo-delete': {
      await core.del(`logos/${enc(email)}`).catch(() => {});
      await cas(`profiles/${enc(email)}`, cur => cur ? { ...cur, hasLogo: false } : undefined);
      return { ok: true };
    }

    case 'item-posted': {
      // "I posted this": +1 post in Track today, calendar item → Posted, Library badge. Counted once per item.
      const item = await gen.getItem(email, body.id);
      if (item.posted) return { item, already: true };
      const updated = { ...item, posted: true, postedAt: core.nowIso() };
      await core.setJson(gen.itemKey(email, item.id), updated);
      await cas(gen.historyIndexKey(email), cur => cur ? { items: cur.items.map(i => i.id === item.id ? { ...i, posted: true } : i) } : undefined);
      await growth.addPost(email);
      if (item.calendarId) await growth.updateCalendarItem(email, item.calendarId, 'posted').catch(() => {});
      else await growth.pilotBump(email, 'postsMarked');
      return { item: updated };
    }

    case 'listing-decline': {
      const slug = String(body.slug || '').slice(0, 80);
      await cas(`profiles/${enc(email)}`, cur => {
        const p = cur ? { ...cur } : { createdAt: core.nowIso() };
        p.listingDeclined = [...new Set([...(p.listingDeclined || []), slug])].slice(-20);
        return p;
      });
      return { ok: true };
    }

    case 'profile-save': {
      const p = await cleanProfile(body.profile, await getProfile(email), ctx.event, email);
      const now = core.nowIso();
      // Brand kit and logo are saved separately and kept here.
      const saved = await cas(`profiles/${enc(email)}`, cur => ({ ...p, brand: cur && cur.brand, hasLogo: !!(cur && cur.hasLogo), createdAt: (cur && cur.createdAt) || now, updatedAt: now }));
      return { profile: saved };
    }

    case 'generate': {
      const profile = await getProfile(email);
      const out = await gen.generate({
        email, profile, settings: auth.settings, access: auth.access,
        toolId: body.tool, rawInput: body.input, idemKey: body.requestId, calendarId: body.calendarId,
      });
      return { item: out.item, replayed: out.replayed, calendarAdded: out.calendarAdded || 0, ideasAdded: out.ideasAdded || 0, usage: await gen.usageSummary(email, auth.access) };
    }

    case 'design-create': {
      // Design maker with the member's own words (carousel = 1 AI credit; post or story = free).
      const profile = await getProfile(email);
      const out = await gen.createOwn({ email, profile, settings: auth.settings, access: auth.access, raw: body.design, idemKey: body.requestId });
      return { item: out.item, replayed: out.replayed, usage: await gen.usageSummary(email, auth.access) };
    }
    case 'refine': {
      const profile = await getProfile(email);
      return gen.refine({ email, profile, settings: auth.settings, id: body.id, how: String(body.how || '') });
    }

    case 'history-list': {
      const idx = await core.getJson(gen.historyIndexKey(email));
      let items = (idx && idx.items) || [];
      if (body.tool && tools.TOOLS[body.tool]) items = items.filter(i => i.tool === body.tool);
      if (body.savedOnly) items = items.filter(i => i.saved);
      return { items: items.slice(0, 200) };
    }

    case 'item-get':
      return { item: await gen.getItem(email, body.id) };

    case 'item-update': {
      const item = await gen.getItem(email, body.id);
      const patch = {};
      if (typeof body.edited === 'string') patch.edited = cleanText(body.edited, 20000);
      if (typeof body.saved === 'boolean') patch.saved = body.saved;
      const updated = { ...item, ...patch, updatedAt: core.nowIso() };
      await core.setJson(gen.itemKey(email, item.id), updated);
      if (typeof body.saved === 'boolean') {
        await cas(gen.historyIndexKey(email), cur => {
          if (!cur) return undefined;
          return { items: cur.items.map(i => i.id === item.id ? { ...i, saved: body.saved } : i) };
        });
      }
      return { item: updated };
    }

    // ── Carousel maker: save the design (text edits, template, colours, photos). Drawing happens on the device. ──
    case 'carousel-save': {
      const item = await gen.getItem(email, body.id);
      if (item.tool !== 'carouselmaker') throw new HttpError(400, 'invalid', 'That isn’t a carousel.');
      const design = cleanCarouselDesign(body.design);
      const updated = { ...item, design, updatedAt: core.nowIso() };
      await core.setJson(gen.itemKey(email, item.id), updated);
      const old = (item.design && item.design.slides || []).map(x => x.img).filter(Boolean);
      const keep = new Set(design.slides.map(x => x.img).filter(Boolean));
      for (const r of old) if (!keep.has(r)) await core.del(carImgKey(email, r)).catch(() => {});
      return { item: updated };
    }
    case 'carousel-img-save': {
      // A photo for one slide, resized on the phone first (max ~1080px, JPEG/PNG/WebP, ~400 KB).
      const url = String(body.dataUrl || '');
      const m = url.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!m || url.length > 560000) throw new HttpError(400, 'invalid_image', 'Please choose a PNG or JPG photo (it’s resized automatically).');
      const bytes = Buffer.from(m[2], 'base64');
      const magic = { png: [0x89, 0x50, 0x4E, 0x47], jpeg: [0xFF, 0xD8, 0xFF], webp: [0x52, 0x49, 0x46, 0x46] }[m[1]];
      if (!magic.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'invalid_image', 'That file doesn’t look like an image.');
      if ((await core.listKeys(`carimg/${enc(email)}/`)).length >= 120) throw new HttpError(409, 'too_many', 'You have a lot of carousel photos saved. Delete some older carousels from your Library to add more.');
      await core.rateLimit('carimg', email, 60, 60 * 60 * 1000);
      const ref = 'c' + randomToken(12).replace(/[^A-Za-z0-9]/g, '').slice(0, 14);
      await core.setJson(carImgKey(email, ref), { dataUrl: url, at: core.nowIso() });
      return { ref };
    }
    case 'carousel-img-get': {
      if (!/^c[A-Za-z0-9]{6,20}$/.test(String(body.ref || ''))) throw new HttpError(400, 'invalid', 'Invalid photo.');
      const x = await core.getJson(carImgKey(email, body.ref));
      return { dataUrl: x ? x.dataUrl : null };
    }

    case 'item-delete': {
      const item = await gen.getItem(email, body.id);
      for (const x of (item.design && item.design.slides) || []) if (x.img) await core.del(carImgKey(email, x.img)).catch(() => {});
      await core.del(gen.itemKey(email, item.id));
      await cas(gen.historyIndexKey(email), cur => cur ? { items: cur.items.filter(i => i.id !== item.id) } : undefined);
      return { ok: true };
    }

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 300 * 1024 }); // room for a resized logo

exports._cleanProfile = cleanProfile;
