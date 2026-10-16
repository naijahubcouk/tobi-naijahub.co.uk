'use strict';
/*
 * Small per-member settings that don't belong in the business profile.
 *   prefs/<email>  { setupHidden, weeklyEmail, reviewLink, reviewLabel, remindersOn, lastDigestAt }
 */
const core = require('./core');
const { HttpError, cas, getJson, enc, cleanText } = core;

const DEFAULTS = { setupHidden: false, weeklyEmail: true, reviewLink: '', reviewLabel: '', remindersOn: false, lastDigestAt: '' };
const REVIEW_LABELS = ['Google', 'Auntie Tobi listing', 'Facebook', 'Trustpilot', 'Website', 'Other'];
const key = email => `prefs/${enc(email)}`;

async function get(email) { return { ...DEFAULTS, ...((await getJson(key(email))) || {}) }; }

function validLink(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let u; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { u = null; }
  if (!u || u.protocol !== 'https:' || !u.hostname.includes('.') || s.length > 500) throw new HttpError(400, 'invalid_link', 'Please paste the full review link (it should start with https://).');
  return u.toString();
}

async function update(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const patch = {};
  if ('setupHidden' in raw) patch.setupHidden = !!raw.setupHidden;
  if ('weeklyEmail' in raw) patch.weeklyEmail = !!raw.weeklyEmail;
  if ('remindersOn' in raw) patch.remindersOn = !!raw.remindersOn;
  if ('reviewLink' in raw) patch.reviewLink = validLink(raw.reviewLink);
  if ('fuGaps' in raw && Array.isArray(raw.fuGaps)) patch.fuGaps = raw.fuGaps.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 60).slice(0, 3);
  if ('fuKeepDays' in raw) patch.fuKeepDays = Number(raw.fuKeepDays) || 0;
  if ('fuKeepKind' in raw) patch.fuKeepKind = raw.fuKeepKind === 'rebook' ? 'rebook' : 'ideas';
  if ('reviewLabel' in raw) patch.reviewLabel = REVIEW_LABELS.includes(raw.reviewLabel) ? raw.reviewLabel : 'Other';
  const next = await cas(key(email), cur => ({ ...DEFAULTS, ...(cur || {}), ...patch, updatedAt: core.nowIso() }));
  return { ...DEFAULTS, ...next };
}

async function markBenefitsSeen(email) { await cas(key(email), cur => ({ ...DEFAULTS, ...(cur || {}), benefitsSeenAt: core.nowIso() })); }
async function markDigest(email) { await cas(key(email), cur => ({ ...DEFAULTS, ...(cur || {}), lastDigestAt: core.nowIso() })); }

// Anonymous ID for push notifications (OneSignal external ID) — never the email itself.
function pushId(email) { return `studio_${core.hmac(`push:${email}`).slice(0, 32)}`; }
function unsubToken(email) { return core.hmac(`unsub:${email}`).slice(0, 40); }

module.exports = { get, update, markDigest, markBenefitsSeen, pushId, unsubToken, REVIEW_LABELS, DEFAULTS };
