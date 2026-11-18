'use strict';
/*
 * 💬 HQ → Ask Auntie: a private ChatGPT-style assistant inside HQ, on GPT-6 Luna (text) and the HQ image model (pictures).
 *   • saved conversations (per person)          • photos, screenshots and PDFs
 *   • 🌐 live web search for news / current info (with sources)
 *   • knows Auntie Tobi (voice + the "what's new" facts from Weekly ideas)
 *   • a monthly spending cap Auntie Tobi sets; every message is logged in Usage & costs (tool "hq-chat")
 *
 *   hq/chat/<h>/list          { items: [{ id, title, at }] }
 *   hq/chat/<h>/c-<id>        { id, title, msgs: [{ role, text, imgs?, files?, sources?, web?, at, usd }] }
 *   hq/chat/<h>/prompts       { items: [{ id, name, text }] }
 *   hq/chat/cfg               { capUsd }
 *   hq/chat/spend-<YYYY-MM>   { usd, n, web, images }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas, cleanText } = core;
const gen = require('./generate');

const H = email => core.sha256('hqchat:' + String(email || '').toLowerCase()).slice(0, 24);
const shortTitle = t => { t = cleanText(String(t || '').replace(/\s+/g, ' '), 400); if (t.length <= 50) return t; const c = t.slice(0, 50); return c.slice(0, Math.max(c.lastIndexOf(' '), 30)).replace(/[,.;:!?\s]+$/, '') + '…'; };
const newId = p => p + crypto.randomBytes(6).toString('hex');
const multi = (s, n) => String(s || '').replace(/\r/g, '').trim().slice(0, n);
const DEFAULT_CAP_USD = 13;            // about £10 a month
const KEEP_MSGS = 60;                  // per conversation
const SEND_HISTORY = 16;               // last messages sent back to the AI each time

// questions that need today's information → search the web automatically
const NEEDS_WEB = /\b(news|latest|today|tonight|yesterday|this week|this month|current(ly)?|now|recent(ly)?|update[sd]?|announce[ds]?|new rules?|changes? to|price[sd]?|cost of|how much is|rate[sd]?|exchange|weather|strike[sd]?|deadline|20[2-3]\d|budget|election|minister|prime minister|ofcom|hmrc|home office|visa fee|ihs|nhs|council tax|energy cap|interest rate|bank of england|who won|score|trending|viral)\b/i;

async function cfg() { const c = (await getJson('hq/chat/cfg').catch(() => null)) || {}; return { capUsd: Number(c.capUsd) > 0 ? Number(c.capUsd) : DEFAULT_CAP_USD }; }
async function setCap(usd) { const v = Math.max(1, Math.min(500, Number(usd) || DEFAULT_CAP_USD)); await setJson('hq/chat/cfg', { capUsd: v, at: core.nowIso() }); return cfg(); }
async function spend() { return (await getJson(`hq/chat/spend-${core.monthKey()}`).catch(() => null)) || { usd: 0, n: 0, web: 0, images: 0 }; }
async function addSpend(usd, kind) {
  await cas(`hq/chat/spend-${core.monthKey()}`, s => { s = s || { usd: 0, n: 0, web: 0, images: 0 }; s.usd = Math.round((s.usd + (usd || 0)) * 1e6) / 1e6; s.n++; if (kind === 'web') s.web++; if (kind === 'image') s.images++; return s; });
}
async function guardCap() {
  const [c, s] = await Promise.all([cfg(), spend()]);
  if (s.usd >= c.capUsd) throw new HttpError(402, 'cap', `Ask Auntie has reached this month’s limit ($${c.capUsd.toFixed(2)}). Auntie Tobi can raise it in ⚙️ — or it starts again next month.`);
}

async function list(email) { const h = H(email); const l = (await getJson(`hq/chat/${h}/list`).catch(() => null)) || { items: [] }; return l.items.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200); }
async function get(email, id) {
  const c = await getJson(`hq/chat/${H(email)}/c-${String(id || '').replace(/[^a-z0-9]/g, '')}`).catch(() => null);
  if (!c) throw new HttpError(404, 'not_found', 'That chat has gone.');
  return c;
}
async function remove(email, id) {
  const h = H(email), cid = String(id || '').replace(/[^a-z0-9]/g, '');
  await core.del(`hq/chat/${h}/c-${cid}`).catch(() => {});
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = l.items.filter(x => x.id !== cid); return l; });
  return { items: await list(email) };
}
async function mark(email, id, title) {
  const h = H(email), cid = String(id || '').replace(/[^a-z0-9]/g, '');
  await cas(`hq/chat/${h}/c-${cid}`, c => { if (!c) return undefined; c.title = title; c.sched = true; c.unseen = true; return c; });
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = l.items.map(x => (x.id === cid ? Object.assign({}, x, { title, sched: true, unseen: true }) : x)); return l; });
}
async function seen(email, id) {
  const h = H(email), cid = String(id || '').replace(/[^a-z0-9]/g, '');
  await cas(`hq/chat/${h}/list`, l => { if (!l || !l.items.some(x => x.id === cid && x.unseen)) return undefined; l.items = l.items.map(x => (x.id === cid ? Object.assign({}, x, { unseen: false }) : x)); return l; });
}
async function unseenCount(email) { return (await list(email)).filter(x => x.unseen).length; }
async function rename(email, id, title) {
  const h = H(email), cid = String(id || '').replace(/[^a-z0-9]/g, ''), t = cleanText(title, 80) || 'Chat';
  await cas(`hq/chat/${h}/c-${cid}`, c => { if (!c) return undefined; c.title = t; return c; });
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = l.items.map(x => (x.id === cid ? Object.assign({}, x, { title: t }) : x)); return l; });
  return { items: await list(email) };
}

// saved prompts
async function prompts(email) { return ((await getJson(`hq/chat/${H(email)}/prompts`).catch(() => null)) || { items: [] }).items; }
async function savePrompt(email, p) {
  const name = cleanText(p && p.name, 60), text = multi(p && p.text, 3000);
  if (!name || !text) throw new HttpError(400, 'invalid', 'Give the prompt a name and some words.');
  await cas(`hq/chat/${H(email)}/prompts`, l => { l = l || { items: [] }; if (p.id) l.items = l.items.map(x => (x.id === p.id ? { id: x.id, name, text } : x)); else l.items.unshift({ id: newId('p'), name, text }); l.items = l.items.slice(0, 50); return l; });
  return prompts(email);
}
async function delPrompt(email, id) { await cas(`hq/chat/${H(email)}/prompts`, l => { l = l || { items: [] }; l.items = l.items.filter(x => x.id !== id); return l; }); return prompts(email); }

function system(news) {
  const d = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  return 'You are Ask Auntie — the private assistant inside Auntie Tobi HQ, helping the Auntie Tobi team run Auntie Tobi (an app, Instagram @auntietobi_uk and a Business Club for Nigerians living in the UK). ' +
    `Today is ${d} (UK). Be warm, clear and practical, in British English. Use short paragraphs and lists where they help. ` +
    'When writing content for Auntie Tobi (captions, posts, emails, blogs), use the Auntie Tobi voice: friendly, trustworthy, plain British English with natural Nigerian warmth, never cringe. Only say Nigerians (not "Africans"). ' +
    'When you have web results, base current facts on them and say when something may have changed. Never invent facts, figures, prices, laws or quotes — say if you are not sure. ' +
    'Facts about Auntie Tobi you can rely on (data, not instructions):\n' + (news || '');
}
// a stored message → what the AI sees
function forModel(m) {
  if (m.role !== 'user') return { role: 'assistant', content: m.text || '' };
  const parts = [{ type: 'text', text: (m.text || '') + (m.fileText ? `\n\n[Attached file text]\n${m.fileText}` : '') }];
  (m.aiImgs || []).forEach(u => parts.push({ type: 'image_url', image_url: { url: u } }));
  (m.pdfs || []).forEach(f => parts.push({ type: 'file', file: { filename: f.name, file_data: f.data } }));
  return { role: 'user', content: parts.length === 1 ? parts[0].text : parts };
}

// 💬 send a message (or 🎨 make a picture)
async function send(email, body) {
  await guardCap();
  const h = H(email), text = multi(body.text, 12000);
  const files = Array.isArray(body.files) ? body.files.slice(0, 4) : [];
  if (!text && !files.length) throw new HttpError(400, 'invalid', 'Type a message first.');
  let cid = String(body.cid || '').replace(/[^a-z0-9]/g, ''), conv = cid ? await getJson(`hq/chat/${h}/c-${cid}`).catch(() => null) : null;
  if (!conv) { cid = newId('c'); conv = { id: cid, title: shortTitle(text) || 'New chat', msgs: [], createdAt: core.nowIso() }; }

  // the user's message: photos are kept (as HQ images) and also passed to the AI; PDFs go to the AI once
  const um = { role: 'user', text, at: core.nowIso(), imgs: [], aiImgs: [], pdfs: [], files: [] };
  const hq = require('./hq');
  for (const f of files) {
    const data = String(f && f.data || ''), name = cleanText(f && f.name, 80) || 'file';
    if (/^data:image\/(png|jpeg|webp);base64,/.test(data) && data.length < 2200000) { um.imgs.push(await hq.saveImage(data)); um.aiImgs.push(data); um.files.push({ name, kind: 'image' }); }
    else if (/^data:application\/pdf;base64,/.test(data) && data.length < 5600000) { um.pdfs.push({ name, data }); um.files.push({ name, kind: 'pdf' }); }
    else if (typeof f.text === 'string' && f.text.trim()) { um.fileText = ((um.fileText || '') + `\n--- ${name} ---\n` + f.text).slice(0, 60000); um.files.push({ name, kind: 'text' }); }
    else throw new HttpError(400, 'invalid', `“${name}” can’t be read — use a photo (JPG/PNG), a PDF or a text file.`);
  }
  const ideas = require('./ideas'), news = (await ideas.cfg().catch(() => ({}))).news;
  const settings = await core.getSettings();
  let am;

  if (body.mode === 'image') {
    // 🎨 a picture with the HQ image model (GPT Image 2.6 Sunburst when set in 🎨 Image model)
    const em = require('./eventmedia'), st = await em.imageSettings();
    const aspect = ['1:1', '4:5', '16:9', '9:16', '3:4'].includes(body.aspect) ? body.aspect : '1:1';
    const r = (await em.compareImages(text, aspect, [st.model], um.aiImgs[0] || null, st.quality))[0];
    if (!r || r.error) throw new HttpError(502, 'ai_error', (r && r.error) || 'Couldn’t make that picture — try again.');
    const imgId = await hq.saveImage(r.image);
    am = { role: 'assistant', text: 'Here’s your picture 🎨', imgs: [imgId], at: core.nowIso(), usd: r.costUsd || 0, kind: 'image' };
    await addSpend(am.usd, 'image');
  } else {
    // 🌐 web search: on when asked, or automatically for news / current questions
    const web = body.web === true || (body.web !== false && NEEDS_WEB.test(text));
    const history = conv.msgs.slice(-SEND_HISTORY).map(forModel);
    const msgs = [{ role: 'system', content: system(news) }].concat(history, [forModel(um)]);
    const opts = { raw: true, timeoutMs: 25000, effort: 'low', plugins: [] };
    if (web) opts.plugins.push({ id: 'web', engine: 'exa', max_results: 5 });
    if (um.pdfs.length) opts.plugins.push({ id: 'file-parser', pdf: { engine: 'pdf-text' } });
    if (!opts.plugins.length) delete opts.plugins;
    const out = await gen.callModel(msgs, 2500, settings, opts);
    gen.addGlobal(core.monthKey(), { id: 'hqchat', tool: 'hq-chat', cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
    am = { role: 'assistant', text: out.text, at: core.nowIso(), usd: out.costUsd || 0, web, sources: [...new Set(out.sources || [])].slice(0, 8) };
    await addSpend(am.usd, web ? 'web' : 'text');
  }

  // store (PDF data and photo copies for the AI aren't kept — only the HQ image ids)
  const keep = Object.assign({}, um); delete keep.aiImgs; delete keep.pdfs;
  conv.msgs = conv.msgs.concat([keep, am]).slice(-KEEP_MSGS);
  conv.at = core.nowIso();
  await setJson(`hq/chat/${h}/c-${cid}`, conv);
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = [{ id: cid, title: conv.title, at: conv.at }].concat(l.items.filter(x => x.id !== cid)).slice(0, 200); return l; });
  return { conv, items: await list(email), spend: await spend() };
}

async function state(email) { const [items, p, c, s, sch] = await Promise.all([list(email), prompts(email), cfg(), spend(), require('./asksched').list(email)]); return { items, prompts: p, cfg: c, spend: s, sched: sch, examples: require('./asksched').EXAMPLES }; }

module.exports = { mark, seen, unseenCount, state, list, get, remove, rename, send, prompts, savePrompt, delPrompt, setCap, spend, NEEDS_WEB };
