'use strict';
/*
 * ⚡ Auto-replies for your Instagram pages (like ManyChat) — Instagram's official messaging, so it's allowed:
 * a page only answers people who contact it first (comment a keyword, message it, reply to a Story, tap an Ice Breaker).
 *
 * Netlify env (one Meta app for all your pages — steps are in HQ):
 *   IG_APP_ID, IG_APP_SECRET       the Instagram app (Instagram API with Instagram Login)
 *   IG_VERIFY_TOKEN                any word you choose; the same word goes in the app's webhook settings
 * Storage:
 *   iga/pages            { items: [{ id, username, token, tokenAt, connectedAt }] }   (tokens never leave the server)
 *   iga/rules            { items: [rule], welcome: { on, text }, ice: [{ q, a }] }
 *   rule: { id, on, kind: 'comment' | 'dm', words: [..], exact, pages: ['all'] | [ids], dm, publics: [..] }
 *   iga/done/<pageId>/<ruleId>/<userId>   one DM per person per rule
 *   iga/conv/<pageId>/<userId>            first message seen (for the welcome)
 *   iga/log              { items: [{ at, page, user, kind, rule, text, ok }] }   last 500
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;

const API = 'https://graph.instagram.com/v21.0';
const env = k => core.env(k);
const redirectUri = () => `${core.siteBase()}/.netlify/functions/ig-hook?connect=1`;

async function pagesRaw() { return ((await getJson('iga/pages').catch(() => null)) || { items: [] }).items; }
async function pagesPublic() { return (await pagesRaw()).map(p => ({ id: p.id, username: p.username, connectedAt: p.connectedAt, tokenAt: p.tokenAt })); }
async function rules() { const r = (await getJson('iga/rules').catch(() => null)) || {}; return { items: r.items || [], welcome: r.welcome || { on: false, text: 'Hi {name} 👋🏾 Thanks for messaging! We share things for Nigerians in the UK — and our partner page @auntietobi_uk has free UK tips, events and Nigerian businesses near you 💚 Reply GUIDE for our free UK guide.' }, ice: r.ice || [] }; }
async function saveRules(raw) {
  const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 40).map((x, i) => ({
    id: /^r[a-z0-9]{2,14}$/.test(x.id || '') ? x.id : 'r' + Date.now().toString(36) + i, on: x.on !== false, kind: x.kind === 'dm' ? 'dm' : 'comment',
    words: (Array.isArray(x.words) ? x.words : String(x.words || '').split(',')).map(w => String(w).trim().toLowerCase()).filter(Boolean).slice(0, 10), exact: !!x.exact,
    pages: Array.isArray(x.pages) && x.pages.length ? x.pages.slice(0, 20) : ['all'], dm: String(x.dm || '').replace(/\r/g, '').trim().slice(0, 1000),
    publics: (Array.isArray(x.publics) ? x.publics : []).map(t => core.cleanText(t, 300)).filter(Boolean).slice(0, 6), name: core.cleanText(x.name, 60),
  })).filter(x => x.words.length && x.dm);
  const welcome = { on: !!(raw.welcome && raw.welcome.on), text: String((raw.welcome && raw.welcome.text) || '').trim().slice(0, 1000) };
  const ice = (Array.isArray(raw.ice) ? raw.ice : []).slice(0, 4).map(x => ({ q: core.cleanText(x.q, 80), a: String(x.a || '').trim().slice(0, 1000) })).filter(x => x.q && x.a);
  await setJson('iga/rules', { items, welcome, ice });
  return rules();
}

// ── connecting a page (Instagram Business Login) ──
function connectUrl(state) {
  if (!env('IG_APP_ID')) throw new HttpError(400, 'not_set_up', 'Add IG_APP_ID, IG_APP_SECRET and IG_VERIFY_TOKEN in Netlify first (see the steps in HQ).');
  const q = new URLSearchParams({ client_id: env('IG_APP_ID'), redirect_uri: redirectUri(), response_type: 'code', scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments', state });
  return 'https://www.instagram.com/oauth/authorize?' + q.toString();
}
async function finishConnect(code) {
  const form = new URLSearchParams({ client_id: env('IG_APP_ID'), client_secret: env('IG_APP_SECRET'), grant_type: 'authorization_code', redirect_uri: redirectUri(), code: String(code || '').replace(/#_$/, '') });
  const r1 = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
  const j1 = await r1.json().catch(() => ({}));
  if (!r1.ok || !j1.access_token) throw new Error((j1.error_message || j1.error && j1.error.message) || 'Instagram didn’t accept the sign-in.');
  const r2 = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env('IG_APP_SECRET'))}&access_token=${encodeURIComponent(j1.access_token)}`);
  const j2 = await r2.json().catch(() => ({}));
  const token = j2.access_token || j1.access_token;
  const me = await (await fetch(`${API}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`)).json();
  if (!me || !me.user_id) throw new Error('Couldn’t read the Instagram account.');
  // ask Instagram to send this page's comments and messages to HQ
  await fetch(`${API}/me/subscribed_apps?subscribed_fields=comments,messages,messaging_postbacks&access_token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
  const id = String(me.user_id);
  await cas('iga/pages', cur => { cur = cur || { items: [] }; cur.items = cur.items.filter(p => p.id !== id).concat([{ id, username: me.username, token, tokenAt: core.nowIso(), connectedAt: core.nowIso() }]); return cur; });
  await applyIce().catch(() => {});
  return me.username;
}
async function disconnect(id) { await cas('iga/pages', cur => { if (!cur) return undefined; cur.items = cur.items.filter(p => p.id !== id); return cur; }); }
// long-lived tokens last 60 days: refresh when older than 20 days
async function tokenFor(id) {
  const p = (await pagesRaw()).find(x => x.id === String(id));
  if (!p) return '';
  if (Date.now() - Date.parse(p.tokenAt || 0) > 20 * 864e5) {
    try {
      const j = await (await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(p.token)}`)).json();
      if (j.access_token) { await cas('iga/pages', cur => { const x = cur.items.find(y => y.id === p.id); if (x) { x.token = j.access_token; x.tokenAt = core.nowIso(); } return cur; }); return j.access_token; }
    } catch (_) { /* keep the old one */ }
  }
  return p.token;
}

// ── sending (only ever a reply) ──
async function igPost(path, token, body) {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && j.error.message) || 'Instagram said ' + r.status);
  return j;
}
const fill = (t, name) => String(t || '').replace(/\{name\}/g, name ? '@' + name : 'there').replace(/@@/g, '@');
async function log(entry) { await cas('iga/log', cur => { cur = cur || { items: [] }; cur.items = [Object.assign({ at: core.nowIso() }, entry)].concat(cur.items).slice(0, 500); return cur; }).catch(() => {}); }
const matches = (rule, text) => { const t = String(text || '').toLowerCase().trim(); return rule.words.some(w => rule.exact ? t === w || t.replace(/[^\p{L}\p{N} ]/gu, '').trim() === w : new RegExp('(^|[^\\p{L}\\p{N}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}\\p{N}])', 'iu').test(t)); };
const forPage = (rule, pageId) => rule.on && (rule.pages.includes('all') || rule.pages.includes(String(pageId)));
async function once(key) { let first = false; await cas(key, cur => { if (cur) return undefined; first = true; return { at: core.nowIso() }; }); return first; }

async function onComment(pageId, v) {
  const from = (v.from && v.from.id) || '', name = (v.from && v.from.username) || '';
  if (!from || String(from) === String(pageId)) return;           // the page's own comments
  const R = await rules(), rule = R.items.find(x => x.kind === 'comment' && forPage(x, pageId) && matches(x, v.text));
  if (!rule) return;
  if (!(await once(`iga/done/${pageId}/${rule.id}/${from}`))) return;   // one DM per person per rule
  const token = await tokenFor(pageId); if (!token) return;
  let ok = true, err = '';
  try { await igPost(`/${pageId}/messages`, token, { recipient: { comment_id: v.id }, message: { text: fill(rule.dm, name) } }); } catch (e) { ok = false; err = e.message; }
  if (rule.publics.length) { const pub = rule.publics[Math.floor(Math.random() * rule.publics.length)]; try { await igPost(`/${v.id}/replies`, token, { message: fill(pub, name) }); } catch (_) { /* public reply is a bonus */ } }
  await log({ page: pageId, user: name, kind: 'comment', rule: rule.id, text: String(v.text || '').slice(0, 120), ok, err });
}
async function onMessage(pageId, m) {
  const sender = m.sender && m.sender.id; if (!sender || String(sender) === String(pageId) || (m.message && m.message.is_echo)) return;
  const R = await rules(), token = await tokenFor(pageId); if (!token) return;
  const text = m.postback ? (m.postback.title || '') : (m.message && m.message.text) || '';
  let reply = '', ruleId = '';
  // Ice Breaker tapped
  if (m.postback && /^ICE_\d$/.test(m.postback.payload || '')) { const ib = R.ice[+m.postback.payload.slice(4)]; if (ib) { reply = ib.a; ruleId = 'ice'; } }
  // keyword
  if (!reply) { const rule = R.items.find(x => x.kind === 'dm' && forPage(x, pageId) && matches(x, text)); if (rule) { reply = rule.dm; ruleId = rule.id; } }
  // first message ever → welcome
  const first = await once(`iga/conv/${pageId}/${sender}`);
  if (!reply && first && R.welcome.on && R.welcome.text) { reply = R.welcome.text; ruleId = 'welcome'; }
  if (!reply) return;
  let ok = true, err = '';
  try { await igPost(`/${pageId}/messages`, token, { recipient: { id: sender }, message: { text: fill(reply, '') } }); } catch (e) { ok = false; err = e.message; }
  await log({ page: pageId, user: sender, kind: m.postback ? 'icebreaker' : 'dm', rule: ruleId, text: String(text).slice(0, 120), ok, err });
}

// Ice Breakers (up to 4 questions shown when someone opens a new chat) — set on every connected page
async function applyIce() {
  const R = await rules(), P = await pagesRaw(), out = [];
  for (const p of P) {
    try {
      const token = await tokenFor(p.id);
      if (R.ice.length) await igPost('/me/messenger_profile?platform=instagram', token, { ice_breakers: [{ locale: 'default', call_to_actions: R.ice.map((x, i) => ({ question: x.q, payload: 'ICE_' + i })) }] });
      else await fetch(`${API}/me/messenger_profile?platform=instagram&access_token=${encodeURIComponent(token)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: ['ice_breakers'] }) });
      out.push({ page: p.username, ok: true });
    } catch (e) { out.push({ page: p.username, ok: false, err: e.message }); }
  }
  return out;
}

// ── webhook ──
function verifySig(headers, body) {
  const sig = headers['x-hub-signature-256'] || '', secret = env('IG_APP_SECRET');
  if (!secret || !sig.startsWith('sha256=')) return false;
  const want = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}
async function handleEvent(payload) {
  if (!payload || payload.object !== 'instagram') return;
  for (const e of payload.entry || []) {
    const pageId = String(e.id);
    for (const c of e.changes || []) if (c.field === 'comments' && c.value) await onComment(pageId, c.value).catch(err => console.error('[ig] comment', err.message));
    for (const m of e.messaging || []) await onMessage(pageId, m).catch(err => console.error('[ig] message', err.message));
  }
}
async function overview() {
  const [P, R, L] = [await pagesPublic(), await rules(), ((await getJson('iga/log').catch(() => null)) || { items: [] }).items];
  const stats = {}; for (const x of L) { const k = x.rule || '-'; stats[k] = stats[k] || { n: 0, ok: 0 }; stats[k].n++; if (x.ok) stats[k].ok++; }
  return { setup: { app: !!env('IG_APP_ID'), secret: !!env('IG_APP_SECRET'), verify: !!env('IG_VERIFY_TOKEN'), webhook: `${core.siteBase()}/.netlify/functions/ig-hook`, redirect: redirectUri() }, pages: P, rules: R, log: L.slice(0, 100), stats };
}

module.exports = { connectUrl, finishConnect, disconnect, rules, saveRules, applyIce, verifySig, handleEvent, overview, matches };
