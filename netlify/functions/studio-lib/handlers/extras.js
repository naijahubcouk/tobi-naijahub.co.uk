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

const VIEW = new Set(['nudges', 'prefs-get', 'customers', 'shop-get']);
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
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 300 * 1024 });

function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
exports.siteUrl = siteUrl;
