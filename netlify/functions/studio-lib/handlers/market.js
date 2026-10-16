'use strict';
/*
 * Auntie Tobi Marketplace
 *   GET  /.netlify/functions/studio-market?feed=1        live listings (JSON, cached ~1 min) — used by /marketplace and the app
 *   GET  /.netlify/functions/studio-market?img=<id>      a listing photo
 *   POST { action: 'public-code', email }                 anyone with the form link: email a 6-digit code
 *   POST { action: 'public-submit', email, code, contact, listing, photos[] }  → waits for admin review
 *   POST { action: 'mine' | 'save' | 'img' | 'withdraw' | 'remove' }        Business Club members (signed in)
 */
const core = require('../core');
const { HttpError, handler } = core;
const market = require('../market');

function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
const ADMIN_URL = () => `${siteUrl()}/studio-admin`;

async function tellAdmins(rec, kind) {
  const f = rec.draft || rec.live || {};
  const who = rec.source === 'member' ? `Business Club member ${rec.owner}` : `${rec.contact.name || ''} <${rec.contact.email || ''}> (public form)`;
  await core.emailAdmins(kind === 'change' ? `Marketplace change to review: ${f.name}` : `New Marketplace listing to review: ${f.name}`,
    `${who} ${kind === 'change' ? 'updated' : 'submitted'} a Marketplace listing.\n\n${f.name} — ${f.business}\n${f.category}${f.price ? ` · ${f.price}` : ''}\n${f.desc}\n\nReview it in Studio Admin → Marketplace: ${ADMIN_URL()}`);
  await core.alert('market_review', `Marketplace ${kind === 'change' ? 'change' : 'listing'} to review: ${f.name} (${f.business})`, { id: rec.id });
}

exports.handler = handler(async (ctx) => {
  const { event, body } = ctx;
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q.img) {
      const img = await market.getImage(String(q.img).slice(0, 20));
      if (!img) return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Not found' };
      const m = img.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
      return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400', 'Netlify-CDN-Cache-Control': 'public, max-age=604800, durable', 'X-Content-Type-Options': 'nosniff' }, body: m[2], isBase64Encoded: true };
    }
    if (q.feed) {
      const items = await market.feed();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30', 'Netlify-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300, durable', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ items, at: core.nowIso() }) };
    }
    throw new HttpError(404, 'not_found', 'Not found.');
  }

  switch (body.action) {
    // ── public form (anyone with the link) ──
    case 'public-code': {
      if (body.website) return { ok: true }; // spam trap
      const email = core.requireEmail(body.email);
      await core.rateLimit('mkt-code-ip', ctx.ip || 'x', 8, 60 * 60 * 1000, 'Too many codes requested. Please try again in an hour.');
      await core.rateLimit('mkt-code-em', email, 4, 60 * 60 * 1000, 'Too many codes requested. Please try again in an hour.');
      await core.issueOtp(email, 'market');
      return { ok: true };
    }
    case 'public-submit': {
      if (body.website) return { ok: true };
      const email = core.requireEmail(body.email);
      await core.rateLimit('mkt-sub-ip', ctx.ip || 'x', 6, 24 * 60 * 60 * 1000, 'You’ve sent several listings today. Please try again tomorrow, or message us on WhatsApp.');
      const photos = Array.isArray(body.photos) ? body.photos.slice(0, market.MAX_IMGS) : [];
      if (!photos.length) throw new HttpError(400, 'invalid', 'Please add at least one photo.');
      market.clean({ ...body.listing, imgs: [] }, { allowNoImg: true }); // check everything before using up the code
      if (!(await core.checkOtp(email, 'market', body.code))) throw new HttpError(400, 'bad_code', 'That code didn’t work. Check it, or ask for a new one.');
      const ids = [];
      for (const p of photos) ids.push(await market.saveImage(p, `public:${email}`));
      const rec = await market.publicCreate({ ...body.contact, email }, body.listing, ids);
      await tellAdmins(rec, 'new');
      try {
        await core.sendEmail([email], 'We’ve received your Marketplace listing 💚',
          `Hi ${rec.contact.name.split(' ')[0]},\n\nThank you for sending “${rec.draft.name}” to the Auntie Tobi Marketplace. Auntie Tobi will review it and email you as soon as it’s live (or if anything needs changing).\n\nAuntie Tobi 💚\nhttps://www.auntietobi.co.uk/marketplace`);
      } catch (e) { console.error('[studio] market confirmation email failed', e && e.message); }
      return { ok: true, id: rec.id };
    }
  }

  // ── Business Club members ──
  const auth = await core.requireMember(ctx, { level: body.action === 'mine' ? 'view' : 'create' });
  const email = auth.sess.email;
  await core.rateLimit('market', email, 300, 60 * 60 * 1000);
  if (!auth.access.membershipActive) throw new HttpError(403, 'club_only', 'Marketplace listings are part of the Auntie Tobi Business Club.');
  switch (body.action) {
    case 'mine': return market.mine(email);
    case 'img': return { id: await market.saveImage(body.dataUrl, email) };
    case 'save': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      const isNew = !body.id;
      const rec = await market.memberSave(email, auth.member, body.id ? String(body.id) : '', body.listing, profile);
      await core.audit(email, isNew ? 'market_submit' : 'market_change', { id: rec.id });
      await tellAdmins(rec, rec.live ? 'change' : 'new');
      return { listing: market.forOwner(rec) };
    }
    case 'withdraw': return market.memberWithdraw(email, String(body.id || ''));
    case 'remove': {
      const r = await market.memberRemove(email, String(body.id || ''));
      await core.audit(email, 'market_remove', { id: body.id });
      return r;
    }
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { allowGet: true, maxBody: 1700 * 1024 });
exports.tellAdmins = tellAdmins;
