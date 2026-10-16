'use strict';
/*
 * Money: quotes, invoices and receipts (free — no AI).
 * POST /.netlify/functions/studio-money  { action, ... }
 *   settings-get / settings-save { settings }
 *   list / get { id } / save { doc } / status { id, status } / convert { id } / delete { id }
 */
const core = require('../core');
const money = require('../money');
const { HttpError, handler } = core;

const idOf = v => { const s = String(v || ''); if (!/^[A-Za-z0-9_-]{4,20}$/.test(s)) throw new HttpError(400, 'bad_id', 'Invalid document.'); return s; };

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx, { level: body.action === 'list' || body.action === 'get' || body.action === 'settings-get' ? 'view' : 'create' });
  const email = auth.sess.email;
  await core.rateLimit('money', email, 300, 60 * 60 * 1000);
  switch (body.action) {
    case 'settings-get': {
      let s = await money.getSettings(email);
      if (!s) {
        // Suggest details from the business profile the first time.
        const p = (await core.getJson(`profiles/${core.enc(email)}`)) || {};
        s = { suggested: true, displayName: p.businessName || '', email, phone: p.whatsapp || '', address: '', bankAccountName: '', sortCode: '', accountNumber: '', vatNumber: '', paymentTermsDays: 14, footerNote: 'Thank you for your business!' };
      }
      return { settings: s };
    }
    case 'settings-save': return { settings: await money.saveSettings(email, body.settings) };
    case 'list': return money.list(email);
    case 'get': return { doc: await money.get(email, idOf(body.id)), settings: await money.getSettings(email) };
    case 'save': return { doc: await money.save(email, body.doc) };
    case 'status': return { doc: await money.setStatus(email, idOf(body.id), body.status) };
    case 'convert': return { doc: await money.convert(email, idOf(body.id)) };
    case 'delete': await money.remove(email, idOf(body.id)); return { ok: true };
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
