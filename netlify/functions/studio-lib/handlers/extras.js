'use strict';
/*
 * Free member extras (no AI):
 * POST /.netlify/functions/studio-extras  { action, ... }
 *   nudges                      set-up checklist, lesson for you, money reminders (Today)
 *   prefs-get / prefs-save      weekly email, review link, reminders, hide set-up
 *   reminded { id }             hide a money reminder for 3 days
 *   customers                   customer list built from quotes, invoices and receipts
 *   shop-get / shop-save { shop } / shop-img { itemId, dataUrl } / shop-img-delete { itemId } / shop-publish { on }
 */
const core = require('../core');
const { HttpError, handler } = core;
const prefs = require('../prefs');
const money = require('../money');
const nudges = require('../nudges');
const shop = require('../shop');
const fu = require('../followups');
const benefits = require('../benefits');
const memtodo = require('../memtodo');

const VIEW = new Set(['nudges', 'prefs-get', 'customers', 'shop-get', 'fu-list', 'benefits-mine', 'benefits-seen', 'todo-today', 'todo-mark', 'todo-add', 'todo-def-delete']);
const idOf = v => { const s = String(v || ''); if (!/^[A-Za-z0-9_-]{4,20}$/.test(s)) throw new HttpError(400, 'bad_id', 'Invalid item.'); return s; };

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx, { level: VIEW.has(body.action) ? 'view' : 'create' });
  const email = auth.sess.email;
  await core.rateLimit('extras', email, 600, 60 * 60 * 1000);
  switch (body.action) {
    case 'nudges': return nudges.forMember(email, auth.access);
    case 'prefs-get': return { prefs: await prefs.get(email), pushId: prefs.pushId(email) };
    case 'prefs-save': return { prefs: await prefs.update(email, body.prefs) };
    case 'reminded': return money.markReminded(email, idOf(body.id));
    case 'customers': return { customers: await money.customers(email), reviewLink: (await prefs.get(email)).reviewLink };
    case 'shop-get': {
      const s = await shop.get(email);
      return { shop: s, url: s.slug ? `${siteUrl()}/p/${s.slug}` : '', base: `${siteUrl()}/p/` };
    }
    case 'shop-save': { const s = await shop.save(email, body.shop); return { shop: s, url: `${siteUrl()}/p/${s.slug}` }; }
    case 'shop-img': return { shop: await shop.setImage(email, idOf(body.itemId), body.dataUrl) };
    case 'shop-img-delete': return { shop: await shop.deleteImage(email, idOf(body.itemId)) };
    case 'shop-publish': { const s = await shop.publish(email, !!body.on); return { shop: s, url: `${siteUrl()}/p/${s.slug}` }; }
    // ── Business Club benefits (member view) ──
    case 'benefits-mine': {
      if (!auth.access.membershipActive) return { benefits: null };
      const b = await benefits.getYear(email, auth.member);
      if (body.markSeen) await prefs.markBenefitsSeen(email);
      return { benefits: benefits.forMember(b.yearKey, b.year), membershipExpiresAt: auth.member.membershipExpiresAt };
    }
    case 'verify-request': {
      if (!auth.access.membershipActive) throw new HttpError(403, 'club_only', 'Verification is part of the Auntie Tobi Business Club.');
      await core.rateLimit('verify-req', email, 5, 24 * 60 * 60 * 1000, 'Please wait a little before sending this again.');
      const number = require('../market').chNumber(body.companiesHouse);
      const r = await benefits.requestVerify(email, auth.member, number);
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      const biz = (profile && profile.businessName) || email;
      await core.alert('verify_request', `Verification request: ${biz} — Companies House ${number}`, { email, number });
      await core.emailAdmins(`Verification request: ${biz}`, `${biz} (${email}) asked to be verified.\n\nCompanies House number: ${number}\nCheck it: https://find-and-update.company-information.service.gov.uk/company/${number}\n\nAnswer it in Business Studio Admin → Benefits → Verification requests.`);
      await core.audit(email, 'verify_request', { number });
      return { benefits: benefits.forMember(r.yearKey, r.year) };
    }
    // ── My to-do list ──
    case 'todo-today': return memtodo.refresh(email, auth.member, auth.access, { full: !!body.full });
    case 'todo-mark': return { item: await memtodo.mark(email, auth.member, String(body.key || '').slice(0, 200), String(body.how || '')) };
    case 'todo-add': return { def: await memtodo.addDef(email, body.task) };
    case 'todo-def-delete': { await memtodo.deleteDef(email, String(body.id || '')); return { ok: true }; }
    case 'benefits-seen': {
      await prefs.markBenefitsSeen(email);
      return { ok: true };
    }
    case 'priority-done': {
      if (!auth.access.membershipActive) throw new HttpError(403, 'club_only', 'This is part of Business Club membership.');
      const r = await benefits.setPriorityDone(email, auth.member, body.index, !!body.done);
      return { prioritiesDone: r.year.prioritiesDone };
    }
    // ── Follow-ups ──
    case 'fu-list': return { ...(await fu.list(email)), reviewLink: (await prefs.get(email)).reviewLink };
    case 'fu-add': return { item: await fu.add(email, body.item) };
    case 'fu-update': return { item: await fu.update(email, idOf(body.id), body.patch) };
    case 'fu-sent': return { item: await fu.sent(email, idOf(body.id), ['fu1', 'fu2', 'checkback', 'thanks', 'keep'].includes(body.kind) ? body.kind : '') };
    case 'fu-stage': return { item: await fu.setStage(email, idOf(body.id), String(body.stage || ''), { checkBackAt: body.checkBackAt, quoteId: body.quoteId }) };
    case 'fu-snooze': return { item: await fu.snooze(email, idOf(body.id), body.days) };
    case 'fu-delete': await fu.remove(email, idOf(body.id)); return { ok: true };
    case 'fu-defaults': return { defaults: await fu.saveDefaults(email, body.defaults) };
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 300 * 1024 });

function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
exports.siteUrl = siteUrl;
