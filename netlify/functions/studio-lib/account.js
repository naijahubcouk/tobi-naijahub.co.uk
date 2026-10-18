'use strict';
/*
 * "Download my data" and "Delete my account" (UK GDPR basics).
 * Everything a member stores in Business Studio lives under keys that include their email.
 * Kept after deletion: usage counts used for AI cost reporting (no business data), the audit log entry,
 * and records Stripe keeps for payments (outside Business Studio).
 */
const core = require('./core');
const { getJson, del, enc } = core;

const SINGLE = ['members', 'buyers', 'profiles', 'prefs', 'followups', 'mtodo', 'money', 'money-settings', 'calendar', 'goals',
  'progress', 'history', 'tips', 'idea', 'learn', 'logos', 'shop', 'benefits', 'admin-ig', 'msg/thread', 'msg/wel', 'billing/remind', 'webread'];
const PREFIXED = ['content', 'daily', 'shop-img', 'planimg'];

async function exportData(email) {
  const e = enc(email), out = { exportedAt: core.nowIso(), email, note: 'Everything Auntie Tobi Business Studio stores for your account.' };
  for (const k of ['profiles', 'prefs', 'followups', 'mtodo', 'money', 'money-settings', 'calendar', 'goals', 'progress', 'tips', 'shop', 'benefits', 'msg/thread']) {
    const v = await getJson(`${k}/${e}`).catch(() => null);
    if (v) out[k.replace('/', '_')] = v;
  }
  const m = await core.getMember(email);
  if (m) out.account = { createdAt: m.createdAt, status: m.status, membershipExpiresAt: m.membershipExpiresAt || null, plan: m.addon ? { tier: m.addon.tier || 'plus', interval: m.addon.interval, status: m.addon.status } : null };
  const idx = await getJson(`history/${e}`).catch(() => null);
  const items = [];
  for (const h of ((idx && idx.items) || []).slice(0, 500)) {
    const it = await getJson(`content/${e}/${h.id}`).catch(() => null);
    if (it) items.push({ id: it.id, tool: it.tool, createdAt: it.createdAt, title: it.title, input: it.input, text: it.edited != null ? it.edited : it.output });
  }
  out.content = items;
  if (out['money-settings']) { const ms = { ...out['money-settings'] }; out['money-settings'] = ms; }
  return out;
}

async function deleteAccount(email) {
  email = core.normalizeEmail(email);
  const e = enc(email);
  const member = await core.getMember(email);
  // Stop any Pro / Plus subscription straight away so nobody is charged again.
  if (member && member.addon && member.addon.subscriptionId && core.LIVE_SUB_STATUSES.includes(member.addon.status)) {
    try { await require('./stripe').api('DELETE', `/subscriptions/${member.addon.subscriptionId}`, {}, `studio-delete-${member.addon.subscriptionId}`); }
    catch (x) { await core.alert('delete_sub_failed', 'Account deleted but the subscription could not be cancelled — cancel it in Stripe', { email, sub: member.addon.subscriptionId }); }
  }
  const shop = await getJson(`shop/${e}`).catch(() => null);
  if (shop && shop.slug) await del(`shop-slug/${shop.slug}`).catch(() => {});
  if (member && member.stripeCustomerId) await del(`stripe-customers/${member.stripeCustomerId}`).catch(() => {});
  await require('./listinglinks').release(email).catch(() => {});
  await require('./websitecheck').release(email).catch(() => {});
  let n = 0;
  for (const k of SINGLE) { await del(`${k}/${e}`).then(() => n++).catch(() => {}); }
  for (const p of PREFIXED) for (const k of await core.listKeys(`${p}/${e}/`).catch(() => [])) { await del(k).then(() => n++).catch(() => {}); }
  // Admin inbox summary
  await core.cas('msg/index', cur => { if (!cur || !cur.threads || !cur.threads[email]) return undefined; const t = { ...cur.threads }; delete t[email]; return { threads: t }; }).catch(() => {});
  // Marketplace listings they own
  for (const k of await core.listKeys('market/listing/').catch(() => [])) {
    const l = await getJson(k).catch(() => null);
    if (l && l.source === 'member' && core.normalizeEmail(typeof l.owner === 'string' ? l.owner : (l.owner && l.owner.email) || '') === email) await del(k).catch(() => {});
  }
  await core.audit(email, 'account_deleted', { keys: n, hadClub: !!(member && member.status === 'active'), hadAddon: !!(member && member.addon) });
  return { deleted: n };
}

module.exports = { exportData, deleteAccount };
