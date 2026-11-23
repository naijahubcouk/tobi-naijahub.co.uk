'use strict';
/*
 * 🗣️ Yoruba Lessons (HQ) — where the lessons for the app's "Learn Yoruba" are made and checked.
 *  • Units → lessons → items (a word or phrase: Yoruba with tone marks, English, an example, a picture, audio).
 *  • AI only DRAFTS. Every item must be ✅ approved by a native-speaker reviewer (and its audio ticked) before a lesson can go to the app.
 *  • Reviewers are HQ team members with only the "yor" section — they can edit, approve/reject and record audio, but nothing that costs money.
 *  • Each review is logged by month (hq/yo/log/YYYY-MM) so Auntie Tobi can see how many items each reviewer checked (for paying them).
 * Storage: hq/yo/index (units + lesson summaries), hq/yo/lesson/<id>, hq/yo/aud/<id> (audio data URLs), app/yo/… (published lessons, Stage 2).
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson } = core;

const INDEX = 'hq/yo/index', SETTINGS = 'hq/yo/settings';
const LESSON = id => `hq/yo/lesson/${id}`, AUD = id => `hq/yo/aud/${id}`, LOG = m => `hq/yo/log/${m}`;
const APP_LIST = 'app/yo/list', APP_LESSON = id => `app/yo/l/${id}`;
const newId = p => p + crypto.randomBytes(5).toString('hex');
const okId = (v, p) => new RegExp('^' + p + '[a-f0-9]{10}$').test(String(v || ''));
const txt = (v, n) => String(v == null ? '' : v).normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, n);

// the course to start from — lesson titles only; the words are drafted with AI and checked by reviewers
const STARTER = [
  { title: 'Greetings', lessons: ['Good morning, good afternoon, good evening', 'Greeting elders with respect', 'How are you? I am fine', 'Thank you, please and sorry', 'Goodbye and see you later'] },
  { title: 'Family', lessons: ['Mother, father and siblings', 'Grandparents and relatives', 'Husband, wife and children', 'Talking about my family'] },
  { title: 'Food', lessons: ['Everyday Nigerian food', 'In the kitchen', 'I am hungry, I want…', 'At the table'] },
];

async function index() {
  let ix = await getJson(INDEX).catch(() => null);
  if (!ix) {   // first visit: set up the starter course (empty lessons)
    ix = { units: [] };
    for (const u of STARTER) {
      const unit = { id: newId('u'), title: u.title, lessons: [] };
      for (const t of u.lessons) { const l = { id: newId('l'), unit: unit.id, title: t, items: [], live: false, at: core.nowIso() }; await setJson(LESSON(l.id), l); unit.lessons.push(sum(l)); }
      ix.units.push(unit);
    }
    await setJson(INDEX, ix);
  }
  return ix;
}
function sum(l) {
  const it = l.items || [];
  return { id: l.id, title: l.title, n: it.length, ok: it.filter(x => x.st === 'ok').length, no: it.filter(x => x.st === 'no').length, aud: it.filter(x => x.audio).length, audOk: it.filter(x => x.audio && x.audOk).length, live: !!l.live, changed: !!l.changed };
}
async function touch(l) {   // save a lesson and refresh its line in the index
  l.at = core.nowIso(); if (l.live) l.changed = true;
  await setJson(LESSON(l.id), l);
  await core.cas(INDEX, cur => { const ix = cur || { units: [] }; ix.units.forEach(u => { u.lessons = u.lessons.map(x => x.id === l.id ? sum(l) : x); }); return ix; });
  return l;
}
async function lesson(id) {
  if (!okId(id, 'l')) throw new HttpError(400, 'invalid', 'Which lesson?');
  const l = await getJson(LESSON(id)); if (!l) throw new HttpError(404, 'not_found', 'That lesson has gone.'); return l;
}
function item(l, iid) { const it = (l.items || []).find(x => x.id === iid); if (!it) throw new HttpError(404, 'not_found', 'That word has gone — refresh the page.'); return it; }

// ── course (admin) ──
async function unitSave(raw) {
  const title = txt(raw.title, 60); if (!title) throw new HttpError(400, 'invalid', 'Give the unit a name.');
  let out;
  await core.cas(INDEX, cur => {
    const ix = cur || { units: [] };
    if (raw.id) { const u = ix.units.find(x => x.id === raw.id); if (u) { u.title = title; out = u; } }
    else { out = { id: newId('u'), title, lessons: [] }; ix.units.push(out); }
    return ix;
  });
  return { unit: out };
}
async function lessonNew(raw) {
  const title = txt(raw.title, 80); if (!title) throw new HttpError(400, 'invalid', 'Give the lesson a name.');
  const ix = await index(); if (!ix.units.some(u => u.id === raw.unit)) throw new HttpError(400, 'invalid', 'Which unit?');
  const l = { id: newId('l'), unit: raw.unit, title, items: [], live: false, at: core.nowIso() };
  await setJson(LESSON(l.id), l);
  await core.cas(INDEX, cur => { cur.units.forEach(u => { if (u.id === raw.unit) u.lessons.push(sum(l)); }); return cur; });
  return { lesson: l };
}
async function lessonRename(raw) { const l = await lesson(raw.id); l.title = txt(raw.title, 80) || l.title; await touch(l); return { lesson: l }; }
async function lessonDel(raw) {
  const l = await lesson(raw.id); if (l.live) throw new HttpError(400, 'live', 'Take it out of the app first.');
  await core.del(LESSON(l.id)).catch(() => {});
  await core.cas(INDEX, cur => { cur.units.forEach(u => { u.lessons = u.lessons.filter(x => x.id !== l.id); }); return cur; });
  return { ok: true };
}

// ── ✨ AI draft (admin — costs a little) ──
const GUIDE = `You are drafting a beginner Yoruba lesson for Nigerian families living in the UK (parents and children who understand English).
Write STANDARD Yoruba (Ọ̀yọ́ standard orthography) with FULL tone marks (à á è é ì í ò ó ù ú ǹ ń) and underdots (ẹ ọ ṣ) on every word. Never leave tones out.
Use respectful forms where Yoruba culture expects them (e.g. "Ẹ" forms when speaking to elders) and say so in the note.
Return JSON only: {"items":[{"yo":"Yoruba word or short phrase","en":"English meaning","ex_yo":"a short, natural example sentence in Yoruba","ex_en":"its English translation","pic":"a simple picture idea that shows the meaning, no text in the picture","note":"one short usage or culture tip, or empty"}]}
Keep it simple and everyday. No duplicates. Native speakers will check every item, so if you are unsure of a tone mark, still give your best spelling and add "check tones" in the note.`;
async function draft(raw, email) {
  const l = await lesson(raw.id), n = Math.max(3, Math.min(12, parseInt(raw.n, 10) || 8)), topic = txt(raw.topic, 160) || l.title;
  const have = (l.items || []).map(x => x.yo + ' = ' + x.en).join('; ').slice(0, 1500);
  const gen = require('./generate'), settings = await core.getSettings();
  const out = await gen.callModel([
    { role: 'system', content: 'You write accurate beginner Yoruba lessons. JSON only.' },
    { role: 'user', content: GUIDE + `\n\nLesson: "${l.title}". Topic: ${topic}. Make ${n} items.` + (have ? `\nAlready in this lesson (don't repeat): ${have}` : '') },
  ], 1800, settings, { json: true, raw: true, timeoutMs: 25000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j; try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI draft didn’t come back properly — please try again.'); }
  const now = core.nowIso();
  const add = (Array.isArray(j.items) ? j.items : []).slice(0, n).map(x => ({ id: newId('i'), yo: txt(x.yo, 120), en: txt(x.en, 120), ex_yo: txt(x.ex_yo, 200), ex_en: txt(x.ex_en, 200), pic: txt(x.pic, 200), note: txt(x.note, 200),
    img: '', audio: '', audOk: false, st: 'draft', src: 'ai', at: now, by: email || '' })).filter(x => x.yo && x.en);
  if (!add.length) throw new HttpError(502, 'ai_error', 'The AI didn’t suggest anything — try a clearer topic.');
  l.items = (l.items || []).concat(add).slice(0, 30);
  await touch(l);
  return { lesson: l, added: add.length };
}

// ── editing + reviewing (anyone with the Yoruba section) ──
async function itemSave(raw, email) {
  const l = await lesson(raw.lesson);
  if (raw.add) { l.items = l.items || []; if (l.items.length >= 30) throw new HttpError(400, 'full', 'A lesson can have up to 30 words.'); l.items.push({ id: newId('i'), yo: '', en: '', ex_yo: '', ex_en: '', pic: '', note: '', img: '', audio: '', audOk: false, st: 'draft', src: 'hand', at: core.nowIso(), by: email || '' }); await touch(l); return { lesson: l }; }
  const it = item(l, raw.item), f = raw.f || {}, was = it.yo + '|' + it.en + '|' + it.ex_yo + '|' + it.ex_en;
  ['yo', 'en', 'ex_yo', 'ex_en', 'pic', 'note'].forEach(k => { if (f[k] !== undefined) it[k] = txt(f[k], k === 'ex_yo' || k === 'ex_en' || k === 'pic' || k === 'note' ? 200 : 120); });
  if (f.img !== undefined) it.img = /^i[a-z0-9]{6,30}$/.test(String(f.img)) ? f.img : '';
  if (was !== it.yo + '|' + it.en + '|' + it.ex_yo + '|' + it.ex_en) { it.edBy = email || ''; it.edAt = core.nowIso(); if (it.st === 'ok') it.st = 'draft'; }   // a changed word needs approving again
  await touch(l); return { lesson: l };
}
async function review(raw, email) {
  const l = await lesson(raw.lesson), it = item(l, raw.item), st = ['ok', 'no', 'draft'].includes(raw.st) ? raw.st : null;
  if (!st) throw new HttpError(400, 'invalid', 'Approve or reject?');
  if (st === 'ok' && (!it.yo || !it.en)) throw new HttpError(400, 'invalid', 'Fill in the Yoruba and the English first.');
  it.st = st; it.rvBy = email || ''; it.rvAt = core.nowIso(); it.rvNote = txt(raw.note, 200);
  await touch(l);
  if (st !== 'draft') await logReview(email, { k: 'word', st, lesson: l.id, item: it.id, yo: it.yo });
  return { lesson: l };
}
async function audioOk(raw, email) {
  const l = await lesson(raw.lesson), it = item(l, raw.item); if (!it.audio) throw new HttpError(400, 'invalid', 'There’s no audio yet.');
  it.audOk = !!raw.ok; it.audBy = email || ''; await touch(l);
  if (raw.ok) await logReview(email, { k: 'audio', st: 'ok', lesson: l.id, item: it.id, yo: it.yo });
  return { lesson: l };
}
async function itemDel(raw) { const l = await lesson(raw.lesson); const it = item(l, raw.item); l.items = l.items.filter(x => x !== it); if (it.audio) await core.del(AUD(it.audio)).catch(() => {}); await touch(l); return { lesson: l }; }
async function logReview(email, e) {
  const m = core.monthKey();
  await core.cas(LOG(m), cur => { const l = (cur && cur.items) || []; l.push(Object.assign({ by: email || '', at: core.nowIso() }, e)); return { items: l.slice(-5000) }; }).catch(() => {});
}
async function summary(raw) {
  const m = /^\d{4}-\d{2}$/.test(String(raw.month || '')) ? raw.month : core.monthKey();
  const log = (await getJson(LOG(m)).catch(() => null)) || { items: [] }, by = {};
  log.items.forEach(e => { const p = by[e.by] || (by[e.by] = { email: e.by, words: 0, rejected: 0, audio: 0, recorded: 0 }); if (e.k === 'word') { if (e.st === 'ok') p.words++; else p.rejected++; } else if (e.k === 'audio') p.audio++; else if (e.k === 'rec') p.recorded++; });
  return { month: m, people: Object.values(by).sort((a, b) => (b.words + b.audio + b.recorded) - (a.words + a.audio + a.recorded)) };
}

// ── 🔊 audio: recorded by a native speaker (free) or ElevenLabs Eleven v3 (admin, uses credits) ──
async function record(raw, email) {
  const l = await lesson(raw.lesson), it = item(l, raw.item), du = String(raw.dataUrl || '');
  if (!/^data:audio\/(webm|ogg|mp4|mpeg|aac|x-m4a|wav)(;[^,]*)?;base64,[A-Za-z0-9+/=]+$/.test(du) || du.length > 900000) throw new HttpError(400, 'bad_audio', 'That recording didn’t work — keep it under 15 seconds and try again.');
  const aid = newId('a'); await setJson(AUD(aid), { dataUrl: du, by: email || '', at: core.nowIso(), how: 'rec' });
  if (it.audio) await core.del(AUD(it.audio)).catch(() => {});
  it.audio = aid; it.audHow = 'rec'; it.audOk = false; it.recBy = email || '';
  await touch(l); await logReview(email, { k: 'rec', st: 'ok', lesson: l.id, item: it.id, yo: it.yo });
  return { lesson: l };
}
async function tts(raw, email) {
  const l = await lesson(raw.lesson), it = item(l, raw.item); if (!it.yo) throw new HttpError(400, 'invalid', 'Write the Yoruba first.');
  const qv = require('./quizvideo'), set = (await getJson(SETTINGS).catch(() => null)) || {};
  const voice = /^[A-Za-z0-9]{10,40}$/.test(set.voice || '') ? set.voice : ''; if (!voice) throw new HttpError(400, 'no_voice', 'Choose the voice first (⚙️ Settings on this page).');
  const r = await qv.el(`/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', accept: 'audio/mpeg', timeout: 25000, body: { text: it.yo, model_id: 'eleven_v3', language_code: 'yo' } });
  if (!r.ok) {
    const j = await r.json().catch(() => null), why = JSON.stringify((j && j.detail) || j || {}).slice(0, 300); console.error('[yoruba] tts', r.status, why);
    if (/quota|credit/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs credits have run out for this month.');
    if (r.status === 401 || r.status === 403) throw new HttpError(400, 'voice_key', 'ElevenLabs didn’t accept the key, or it isn’t allowed to do Text to Speech — check the key’s permissions in ElevenLabs.');
    throw new HttpError(502, 'voice_error', 'The Yoruba voice didn’t come back — please try again, or record it instead.');
  }
  const du = 'data:audio/mpeg;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
  const aid = newId('a'); await setJson(AUD(aid), { dataUrl: du, by: email || '', at: core.nowIso(), how: 'tts' });
  if (it.audio) await core.del(AUD(it.audio)).catch(() => {});
  it.audio = aid; it.audHow = 'tts'; it.audOk = false; await touch(l);
  return { lesson: l, chars: it.yo.length };
}
async function audioGet(raw) { if (!okId(raw.id, 'a')) throw new HttpError(400, 'invalid', 'Which audio?'); const a = await getJson(AUD(raw.id)).catch(() => null); if (!a) throw new HttpError(404, 'not_found', 'That audio has gone.'); return { dataUrl: a.dataUrl }; }
async function settingsGet() { return (await getJson(SETTINGS).catch(() => null)) || {}; }
async function settingsSave(raw) { const s = { voice: /^[A-Za-z0-9]{10,40}$/.test(String(raw.voice || '')) ? raw.voice : '' }; await setJson(SETTINGS, s); return s; }

// ── 📲 publish to the app (admin) — only when every word and its audio are approved ──
async function publish(raw) {
  const l = await lesson(raw.id), it = l.items || [];
  if (it.length < 3) throw new HttpError(400, 'not_ready', 'A lesson needs at least 3 words.');
  const notOk = it.filter(x => x.st !== 'ok').length, noAud = it.filter(x => !x.audio || !x.audOk).length;
  if (notOk || noAud) throw new HttpError(400, 'not_ready', `Not ready yet: ${notOk ? notOk + ' word' + (notOk > 1 ? 's' : '') + ' still to approve' : ''}${notOk && noAud ? ' and ' : ''}${noAud ? noAud + ' without approved audio' : ''}.`);
  const ix = await index(), unit = ix.units.find(u => u.id === l.unit) || {};
  const pack = { id: l.id, unit: l.unit, unitTitle: unit.title || '', title: l.title, at: core.nowIso(), items: it.map(x => ({ id: x.id, yo: x.yo, en: x.en, ex_yo: x.ex_yo, ex_en: x.ex_en, note: x.note, img: x.img, audio: x.audio })) };
  await setJson(APP_LESSON(l.id), pack);
  await core.cas(APP_LIST, cur => { const items = ((cur && cur.items) || []).filter(x => x.id !== l.id); items.push({ id: l.id, unit: l.unit, title: l.title, n: it.length, at: pack.at }); return { items }; });
  l.live = true; l.changed = false; l.pubAt = pack.at; await setJson(LESSON(l.id), l);
  await core.cas(INDEX, cur => { cur.units.forEach(u => { u.lessons = u.lessons.map(x => x.id === l.id ? sum(l) : x); }); return cur; });
  return { lesson: l };
}
async function unpublish(raw) {
  const l = await lesson(raw.id);
  await core.cas(APP_LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== l.id) }));
  await core.del(APP_LESSON(l.id)).catch(() => {});
  l.live = false; l.changed = false; await setJson(LESSON(l.id), l);
  await core.cas(INDEX, cur => { cur.units.forEach(u => { u.lessons = u.lessons.map(x => x.id === l.id ? sum(l) : x); }); return cur; });
  return { lesson: l };
}

module.exports = { index, lesson, unitSave, lessonNew, lessonRename, lessonDel, draft, itemSave, review, audioOk, itemDel, summary, record, tts, audioGet, settingsGet, settingsSave, publish, unpublish };
