'use strict';
/*
 * 🔗 Short card links — /c/<id>  (rewritten here by _redirects)
 * Serves the Celebration Cards page with the saved card built in, and a personal WhatsApp/social preview
 * ("🎄 A Christmas card for Amara 💚"). Unknown or expired links open the card maker with a friendly note.
 */
const bday = require('../bday');

const OCC = { birthday: ['🎂', 'birthday card'], newmonth: ['🗓️', 'New Month card'], christmas: ['🎄', 'Christmas card'], newyear: ['🎆', 'New Year card'], valentine: ['💝', 'Valentine’s card'], anniversary: ['💍', 'anniversary card'], wedding: ['👰🏾', 'wedding card'], easter: ['🐣', 'Easter card'], eid: ['🌙', 'Eid card'], mothers: ['👩🏾', 'Mother’s Day card'], fathers: ['👨🏾', 'Father’s Day card'], independence: ['🇳🇬', 'Independence Day card'], graduation: ['🎓', 'graduation card'], newbaby: ['👶🏾', 'new baby card'], thanks: ['🙏🏾', 'thank-you card'], congrats: ['🎉', 'congratulations card'] };
const escA = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let page = { at: 0, html: '' };

async function cardsHtml(origin) {
  if (page.html && Date.now() - page.at < 300000) return page.html;
  const r = await fetch(origin + '/cards.html', { headers: { 'x-card-page': '1' } });
  if (!r.ok) throw new Error('cards page ' + r.status);
  page = { at: Date.now(), html: await r.text() };
  return page.html;
}

exports.handler = async (event) => {
  const h = event.headers || {};
  const origin = (h['x-forwarded-proto'] === 'http' ? 'http://' : 'https://') + (h['x-forwarded-host'] || h.host || 'auntietobi.co.uk');
  const q = event.queryStringParameters || {};
  const id = String(q.id || (event.path || '').split('/').pop() || '');
  try {
    const [html, card] = await Promise.all([cardsHtml(origin), bday.getCard(id).catch(() => null)]);
    let out = html, inject;
    if (card) {
      const o = OCC[card.o] || OCC.birthday;
      const title = `${o[0]} A ${o[1]} for ${card.n || 'you'} 💚`;
      const desc = (card.f ? `From ${card.f} — ` : '') + 'tap to open your card. Made with love on Auntie Tobi.';
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${escA(title)}</title>`)
        .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escA(title)}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escA(desc)}">`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escA(desc)}">`);
      inject = 'window.__CARD=' + JSON.stringify(card).replace(/</g, '\\u003c') + ';';
    } else inject = 'window.__CARD_MISSING=true;';
    out = out.replace('<script>\n(function () {', `<script>${inject}</script>\n<script>\n(function () {`);
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': card ? 'public, max-age=300' : 'no-store' }, body: out };
  } catch (e) {
    console.error('[card-page]', e.message);
    return { statusCode: 302, headers: { Location: '/cards', 'Cache-Control': 'no-store' }, body: '' };
  }
};
