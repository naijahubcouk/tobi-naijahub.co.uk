'use strict';
/*
 * Business Studio member API. Every action requires a valid member session.
 * POST /.netlify/functions/studio-api  { action, ... }
 */
const core = require('../core');
const { HttpError, handler, cleanText, enc, cas } = core;
const tools = require('../tools');
const gen = require('../generate');
const stripe = require('../stripe');
const directory = require('../directory');

const PROFILE_FIELDS = {
  businessName: 80, industry: 60, location: 80, products: 600, customers: 400,
  instagram: 60, website: 200, toneNotes: 200, description: 1200, whatsapp: 20,
};

const CHANNELS = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'website', 'listing', 'google'];

// existing: the saved profile (keeps the linked listing, which is only changed via listing-link).
async function cleanProfile(raw, existing, event) {
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
  if (raw.listingSlug === '' || raw.listingSlug === null) p.listingSlug = '';
  else if (raw.listingSlug && raw.listingSlug !== p.listingSlug) {
    const b = await directory.bySlug(event, raw.listingSlug);
    if (!b) throw new HttpError(400, 'invalid_link', 'We couldn\u2019t find that Auntie Tobi listing.');
    p.listingSlug = b.slug;
  }
  p.listingDeclined = (existing && existing.listingDeclined) || [];
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

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const action = body.action;
  const level = action === 'bootstrap' ? 'buyer' : action === 'generate' ? 'create' : 'view';
  const auth = await core.requireMember(ctx, { level });
  const email = auth.sess.email;

  switch (action) {
    case 'bootstrap': {
      const m = auth.member;
      const base = {
        tools: tools.publicToolList(),
        tones: Object.keys(tools.TONES),
        limits: { standard: auth.settings.standardLimit, power: auth.settings.powerLimit },
        billing: { enabled: stripe.billingEnabled(), intervals: stripe.billingEnabled() ? stripe.availableIntervals() : [] },
      };
      if (!m || !auth.access.canView) {
        // Verified email without an account (or without access): offer AI Power.
        return { ...base, state: 'buyer', member: { email, isClub: !!m && m.status !== 'none', membershipExpiresAt: m ? m.membershipExpiresAt : null }, access: auth.access };
      }
      const [profile, history] = await Promise.all([getProfile(email), core.getJson(gen.historyIndexKey(email))]);
      return {
        ...base,
        state: auth.access.canCreate ? 'active' : 'readonly',
        member: { email, name: m.name || '', isClub: m.status !== 'none', membershipExpiresAt: m.membershipExpiresAt },
        access: auth.access,
        addon: m.addon ? { status: m.addon.status, interval: m.addon.interval, currentPeriodEnd: m.addon.currentPeriodEnd, cancelAtPeriodEnd: m.addon.cancelAtPeriodEnd } : null,
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
      return { listing: directory.publicListing(b) };
    }

    case 'listing-lookup': {
      const slug = directory.slugFromLink(body.link);
      const b = slug ? await directory.bySlug(ctx.event, slug) : null;
      if (!b) throw new HttpError(404, 'not_found', 'We couldn\u2019t find that listing. Check the link \u2014 it looks like auntietobi.co.uk/biz/your-business');
      return { listing: directory.publicListing(b) };
    }

    case 'listing-link': {
      const b = await directory.bySlug(ctx.event, body.slug);
      if (!b) throw new HttpError(404, 'not_found', 'We couldn\u2019t find that listing.');
      const now = core.nowIso();
      const saved = await cas(`profiles/${enc(email)}`, cur => {
        const p = cur ? { ...cur } : { createdAt: now };
        p.listingSlug = b.slug;
        p.channels = [...new Set([...(p.channels || []), 'listing'])];
        p.updatedAt = now;
        return p;
      });
      await core.audit(email, 'listing_linked', { slug: b.slug, byEmailMatch: b.email === email });
      return { listing: directory.publicListing(b), profile: saved.businessName ? saved : null };
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
      const p = await cleanProfile(body.profile, await getProfile(email), ctx.event);
      const now = core.nowIso();
      const saved = await cas(`profiles/${enc(email)}`, cur => ({ ...p, createdAt: (cur && cur.createdAt) || now, updatedAt: now }));
      return { profile: saved };
    }

    case 'generate': {
      const profile = await getProfile(email);
      const out = await gen.generate({
        email, profile, settings: auth.settings, access: auth.access,
        toolId: body.tool, rawInput: body.input, idemKey: body.requestId,
      });
      return { item: out.item, replayed: out.replayed, calendarAdded: out.calendarAdded || 0, usage: await gen.usageSummary(email, auth.access) };
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

    case 'item-delete': {
      const item = await gen.getItem(email, body.id);
      await core.del(gen.itemKey(email, item.id));
      await cas(gen.historyIndexKey(email), cur => cur ? { items: cur.items.filter(i => i.id !== item.id) } : undefined);
      return { ok: true };
    }

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});

exports._cleanProfile = cleanProfile;
