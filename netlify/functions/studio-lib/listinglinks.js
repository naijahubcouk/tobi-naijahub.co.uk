'use strict';
/*
 * Who has linked which Auntie Tobi listing — so one business can only be linked to one member,
 * and we know whether a link is confirmed (listing email = sign-in email, or confirmed in Admin).
 *   listing/owners   { map: { <slug>: <email> } }   (built from profiles the first time it's needed)
 * Profile fields: listingSlug, listingCheck ('email_match' | 'no_email' | 'email_differs'), listingConfirmed (Admin)
 */
const core = require('./core');
const { HttpError, getJson, cas } = core;
const directory = require('./directory');

const KEY = 'listing/owners';

async function build() {
  const map = {};
  for (const k of await core.listKeys('profiles/').catch(() => [])) {
    const p = await getJson(k).catch(() => null);
    if (p && p.listingSlug && !map[p.listingSlug]) map[p.listingSlug] = core.normalizeEmail(decodeURIComponent(k.slice('profiles/'.length)));
  }
  await cas(KEY, cur => (cur && cur.map ? undefined : { map, builtAt: core.nowIso() }));
  return ((await getJson(KEY)) || { map }).map;
}
async function owners() { const o = await getJson(KEY); return o && o.map ? o.map : build(); }

async function ownerOf(slug) { return (await owners())[slug] || ''; }
// The listing is free for this member (not linked by someone else).
async function takenBy(slug, email) { const o = await ownerOf(slug); return o && o !== core.normalizeEmail(email) ? o : ''; }

function checkFor(b, email) { return !b.email ? 'no_email' : b.email === core.normalizeEmail(email) ? 'email_match' : 'email_differs'; }
// Trusted = HQ may use its Instagram and invites count it as joined. Older links (before checks existed) stay trusted.
function trusted(p) { return !!(p && p.listingSlug && (p.listingConfirmed || p.listingCheck === 'email_match' || !p.listingCheck)); }

const TAKEN_MSG = 'This business is already linked to another Business Studio account. If it’s yours, message Auntie Tobi and we’ll sort it out.';

async function assertFree(slug, email) {
  if (await takenBy(slug, email)) throw new HttpError(409, 'listing_taken', TAKEN_MSG);
}
async function claim(slug, email) {
  email = core.normalizeEmail(email);
  let clash = '';
  await cas(KEY, cur => {
    const map = { ...((cur && cur.map) || {}) };
    if (map[slug] && map[slug] !== email) { clash = map[slug]; return undefined; }
    for (const s of Object.keys(map)) if (map[s] === email && s !== slug) delete map[s];
    map[slug] = email;
    return { ...(cur || {}), map };
  });
  if (clash) throw new HttpError(409, 'listing_taken', TAKEN_MSG);
}
async function release(email, slug) {
  email = core.normalizeEmail(email);
  await cas(KEY, cur => {
    if (!cur || !cur.map) return undefined;
    const map = { ...cur.map }; let changed = false;
    for (const s of Object.keys(map)) if (map[s] === email && (!slug || s === slug)) { delete map[s]; changed = true; }
    return changed ? { ...cur, map } : undefined;
  });
}

// Fields to store on the profile when a listing is linked.
async function linkFields(event, slug, email) {
  const b = await directory.bySlug(event, slug);
  if (!b) throw new HttpError(404, 'not_found', 'We couldn’t find that listing.');
  await claim(b.slug, email);
  return { b, fields: { listingSlug: b.slug, listingCheck: checkFor(b, email), listingConfirmed: false, listingLinkedAt: core.nowIso() } };
}

module.exports = { owners, ownerOf, takenBy, checkFor, trusted, assertFree, claim, release, linkFields, TAKEN_MSG };
