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

const PROFILE_FIELDS = {
  businessName: 80, industry: 60, location: 80, products: 600, customers: 400,
  instagram: 60, website: 200, toneNotes: 200, description: 1200,
};

function cleanProfile(raw) {
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
        profile: profile || null,
        recent: ((history && history.items) || []).slice(0, 5),
      };
    }

    case 'profile-save': {
      const p = cleanProfile(body.profile);
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
