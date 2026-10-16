'use strict';
/*
 * Resources — Your Business Growth Library (Business Club only, free: no AI).
 *
 * Storage (Netlify Blobs, same store as the rest of Studio):
 *   res/index              { seedVersion, deletedSeeds: [], lessons: [meta…] }   one blob → simple, atomic
 *   res/lesson/<id>        full lesson (learn / see / do / use blocks)
 *   res/file/<id>          { name, mime, size, dataUrl, uploadedAt }  (admin uploads, ≤ 3.5 MB)
 *   res/stats/all          { views:{id:n}, completes:{id:n} }
 *   res/stats/<YYYY-MM>    same, per month
 *   learn/<email>          the member's own progress (only they can read it)
 *
 * Lesson statuses:
 *   planned   — title shown to members as "Coming soon" (no content yet)
 *   draft     — hidden from members (waiting for approval)
 *   published — visible once publishAt (UK date) has arrived
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson, enc, cleanText } = core;
const seed = require('./resources-seed');

const MODULES = [
  { id: 'm01', n: '01', title: 'Start Here', desc: 'Business foundations and getting organised.', icon: 'start' },
  { id: 'm02', n: '02', title: 'Instagram for Business', desc: 'Make your Instagram profile easier to discover and trust.', icon: 'insta' },
  { id: 'm03', n: '03', title: 'Content & Visibility', desc: 'Create useful content that attracts potential customers.', icon: 'content' },
  { id: 'm04', n: '04', title: 'Sales & Customer Experience', desc: 'Turn interest into enquiries, orders and repeat customers.', icon: 'sales' },
  { id: 'm05', n: '05', title: 'Business Tools', desc: 'Simple tools that save time.', icon: 'tools' },
  { id: 'm06', n: '06', title: 'Business Growth & Strategy', desc: 'Build a stronger business step by step.', icon: 'growth' },
];
const MODULE_IDS = MODULES.map(m => m.id);
const STATUSES = ['planned', 'draft', 'published'];
const TAGS = ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'services', 'retail'];
const TAG_LABELS = { food: 'food businesses', beauty: 'beauty and hair businesses', fashion: 'fashion businesses', events: 'event businesses', photo: 'photographers and creatives', services: 'service businesses', retail: 'product sellers' };
const BLOCK_TYPES = ['checklist', 'template', 'worksheet', 'file', 'calculator'];
const STUDIO_LINKS = { tools: ['oneclick', 'ideas', 'caption', 'reel', 'promo', 'planner', 'bio', 'message'], screens: ['goal', 'plan', 'money', 'track', 'profile', 'brand', 'review', 'customers', 'image'] };
const MAX_LESSONS = 400;
const MAX_FILE_BYTES = 3.5 * 1024 * 1024;
const FILE_MIMES = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'text/plain': 'txt', 'text/csv': 'csv' };

const INDEX_KEY = 'res/index';
const lessonKey = id => `res/lesson/${id}`;
const fileKey = id => `res/file/${id}`;
const progressKey = email => `learn/${enc(email)}`;

function today() { return core.dayKey(); }
function validDate(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d)); }
function idOk(id) { return /^[a-z0-9][a-z0-9-]{1,60}$/.test(String(id || '')); }
function requireId(id) { if (!idOk(id)) throw new HttpError(400, 'bad_id', 'Invalid lesson.'); return String(id); }

// Plain text for search (strip the light formatting used in lessons).
function plain(s) { return String(s || '').replace(/\*\*|__|^#+\s|^>\s|^-\s|\[([^\]]+)\]\([^)]+\)/gm, '$1').replace(/\s+/g, ' ').trim(); }

function metaOf(l) {
  return {
    id: l.id, module: l.module, order: l.order, title: l.title, summary: l.summary, status: l.status,
    publishAt: l.publishAt || '', featured: !!l.featured, collection: l.collection || '', collectionOrder: l.collectionOrder || 0,
    month: l.month || '', tags: l.tags || ['all'], readMins: l.readMins || 0,
    reviewedAt: l.reviewedAt || '', reviewMonths: l.reviewMonths || 12,
    useTypes: (l.use || []).map(b => b.type), hasStudio: !!l.studio, hasContent: !!(l.learn && l.learn.trim()),
    source: l.source || 'admin', adminEdited: !!l.adminEdited, seedRev: l.seedRev || 0,
    createdAt: l.createdAt, updatedAt: l.updatedAt,
    text: [l.title, l.summary, plain(l.learn), plain(l.see), plain(l.do)].join(' ').slice(0, 4000),
  };
}

function isLive(meta, day) { return MODULE_IDS.includes(meta.module) && meta.status === 'published' && (!meta.publishAt || meta.publishAt <= (day || today())); }

// ───────────── seeding (first run, and new lessons shipped with later updates) ─────────────
// Never overwrites anything you've edited in admin, and never re-adds a lesson you deleted.
async function ensureSeeded() {
  const cur = await getJson(INDEX_KEY);
  if (cur && cur.seedVersion >= seed.VERSION) return cur;
  const now = core.nowIso();
  const wanted = (data, s) => {
    if ((data.deletedSeeds || []).includes(s.id)) return false;
    const have = data.lessons.find(m => m.id === s.id);
    return !(have && (have.adminEdited || (have.seedRev || 0) >= (s.seedRev || 1)));
  };
  const base = cur || { seedVersion: 0, deletedSeeds: [], lessons: [] };
  const todo = seed.lessons().filter(s => wanted(base, s)).map(s => {
    const have = base.lessons.find(m => m.id === s.id);
    return { ...s, source: 'seed', seedRev: s.seedRev || 1, adminEdited: false, createdAt: have ? have.createdAt : now, updatedAt: now };
  });
  // Write lesson bodies first so the index never points at a missing lesson.
  await Promise.all(todo.map(l => setJson(lessonKey(l.id), l)));
  const idx = await cas(INDEX_KEY, c => {
    const data = c || { seedVersion: 0, deletedSeeds: [], lessons: [] };
    if (data.seedVersion >= seed.VERSION) return undefined;
    for (const l of todo) {
      if (!wanted(data, l)) continue;
      const i = data.lessons.findIndex(m => m.id === l.id);
      if (i >= 0) data.lessons[i] = metaOf(l); else data.lessons.push(metaOf(l));
    }
    // Remove untouched launch lessons from modules that no longer exist.
    data.lessons = data.lessons.filter(m => MODULE_IDS.includes(m.module) || m.source !== 'seed' || m.adminEdited);
    data.seedVersion = seed.VERSION;
    return data;
  });
  return idx || (await getJson(INDEX_KEY));
}
async function index() { return (await ensureSeeded()) || { lessons: [] }; }

// ───────────── member side ─────────────
function memberMeta(m) {
  if (m.status === 'planned') return { id: m.id, module: m.module, order: m.order, title: m.title, status: 'planned', month: m.month };
  const { text, source, adminEdited, seedRev, reviewMonths, ...rest } = m;
  return rest;
}

function recommendTag(profile) {
  const s = `${(profile && profile.industry) || ''} ${(profile && profile.products) || ''}`.toLowerCase();
  if (!s.trim()) return null;
  const rules = [
    ['food', /cater|food|cake|bak|chef|restaurant|kitchen|chops|jollof|meal|grill|suya|pastr|dessert|drink|grocer/],
    ['beauty', /hair|beauty|nail|lash|brow|make-?up|skin|salon|barber|braid|wig|spa|aesthetic|cosmetic/],
    ['fashion', /fashion|tailor|cloth|aso|fabric|boutique|wear|ankara|bespoke|garment|bridal/],
    ['events', /event|planner|decor|party|wedding|dj\b|\bmc\b|balloon|hire|venue/],
    ['photo', /photo|video|film|media|content creat|design/],
    ['retail', /shop|store|retail|import|seller|hamper|gift|marketplace/],
    ['services', /consult|account|clean|tutor|coach|law|legal|solicitor|immigration|estate|property|agent|repair|it\b|tech|care|training|education|service|mortgage|insurance|travel|logistic|courier/],
  ];
  for (const [tag, re] of rules) if (re.test(s)) return tag;
  return null;
}

async function getProgress(email) { return (await getJson(progressKey(email))) || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {}, last: '', lastAt: '', hideRecs: false }; }

async function home(email, profile) {
  const idx = await index();
  const day = today();
  const visible = idx.lessons.filter(m => isLive(m, day) || (m.status === 'planned' && MODULE_IDS.includes(m.module)));
  const p = await getProgress(email);
  const tag = recommendTag(profile);
  return {
    modules: MODULES,
    lessons: visible.map(memberMeta),
    progress: { completed: p.completed, saved: p.saved, opened: p.opened, last: p.last, lastAt: p.lastAt, hideRecs: !!p.hideRecs },
    recTag: tag, recLabel: tag ? TAG_LABELS[tag] : null, today: day,
  };
}

async function lessonFor(email, id) {
  requireId(id);
  const idx = await index();
  const meta = idx.lessons.find(m => m.id === id);
  if (!meta || !isLive(meta)) throw new HttpError(404, 'not_found', 'That resource isn’t available yet.');
  const l = await getJson(lessonKey(id));
  if (!l) throw new HttpError(404, 'not_found', 'That resource isn’t available yet.');
  const p = await getProgress(email);
  // Record the open (once a day per member counts as a view).
  const day = today();
  const firstToday = !p.opened[id] || p.opened[id].slice(0, 10) !== day;
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.opened = d.opened || {}; d.opened[id] = core.nowIso(); d.last = id; d.lastAt = d.opened[id];
    const ks = Object.keys(d.opened); if (ks.length > 500) ks.sort((a, b) => d.opened[a].localeCompare(d.opened[b])).slice(0, ks.length - 500).forEach(k => delete d.opened[k]);
    return d;
  });
  if (firstToday) await bumpStat('views', id);
  // Neighbours in the module (published only), for "Next lesson".
  const siblings = idx.lessons.filter(m => m.module === l.module && isLive(m)).sort(sortLessons);
  const i = siblings.findIndex(m => m.id === id);
  return {
    lesson: publicLesson(l),
    prev: i > 0 ? { id: siblings[i - 1].id, title: siblings[i - 1].title } : null,
    next: i >= 0 && i < siblings.length - 1 ? { id: siblings[i + 1].id, title: siblings[i + 1].title } : null,
    mine: { completed: p.completed[id] || null, saved: !!p.saved[id], checks: (p.checks || {})[id] || [], answers: (p.answers || {})[id] || {} },
  };
}

function publicLesson(l) {
  const { source, adminEdited, seedRev, ...rest } = l;
  return rest;
}

function sortLessons(a, b) { return a.module.localeCompare(b.module) || (b.month || '').localeCompare(a.month || '') || (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title); }

async function bumpStat(kind, id) {
  const month = core.monthKey();
  for (const key of ['res/stats/all', `res/stats/${month}`]) {
    await cas(key, cur => { const d = cur || { views: {}, completes: {} }; d[kind] = d[kind] || {}; d[kind][id] = (d[kind][id] || 0) + 1; return d; }).catch(() => {});
  }
}

async function liveLesson(id) {
  requireId(id);
  const idx = await index();
  const meta = idx.lessons.find(m => m.id === id);
  if (!meta || !isLive(meta)) throw new HttpError(404, 'not_found', 'That resource isn’t available.');
  return meta;
}

async function setComplete(email, id, done) {
  await liveLesson(id);
  let changed = false;
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.completed = d.completed || {};
    if (done && !d.completed[id]) { d.completed[id] = core.nowIso(); changed = true; }
    if (!done && d.completed[id]) { delete d.completed[id]; }
    return d;
  });
  if (changed) await bumpStat('completes', id);
  return { completed: done ? core.nowIso() : null };
}

async function setSaved(email, id, on) {
  await liveLesson(id);
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.saved = d.saved || {};
    if (on) d.saved[id] = core.nowIso(); else delete d.saved[id];
    if (Object.keys(d.saved).length > 300) throw new HttpError(409, 'too_many', 'You’ve saved a lot — unsave a few first.');
    return d;
  });
  return { saved: !!on };
}

async function setCheck(email, id, key, on) {
  await liveLesson(id);
  if (!/^\d{1,2}:\d{1,3}$/.test(String(key || ''))) throw new HttpError(400, 'bad_key', 'Invalid item.');
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.checks = d.checks || {};
    const set = new Set(d.checks[id] || []);
    if (on) set.add(key); else set.delete(key);
    d.checks[id] = [...set].slice(0, 300);
    return d;
  });
  return { ok: true };
}

async function setAnswer(email, id, key, text) {
  await liveLesson(id);
  if (!/^\d{1,2}:\d{1,3}$/.test(String(key || ''))) throw new HttpError(400, 'bad_key', 'Invalid field.');
  const val = cleanText(text, 2000);
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.answers = d.answers || {};
    d.answers[id] = d.answers[id] || {};
    if (val) d.answers[id][key] = val; else delete d.answers[id][key];
    const size = JSON.stringify(d.answers).length;
    if (size > 200000) throw new HttpError(409, 'too_large', 'Your worksheet answers are very long — please shorten some.');
    return d;
  });
  return { ok: true };
}

async function setPrefs(email, prefs) {
  await cas(progressKey(email), cur => ({ ...(cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} }), hideRecs: !!(prefs && prefs.hideRecs) }));
  return { ok: true };
}

async function search(q) {
  const words = String(q || '').toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 6);
  if (!words.length) return { results: [] };
  const idx = await index();
  const day = today();
  const results = idx.lessons.filter(m => isLive(m, day)).map(m => {
    let score = 0;
    const low = m.text.toLowerCase();
    for (const w of words) {
      if (!low.includes(w)) return null;
      score += (m.title.toLowerCase().includes(w) ? 5 : 0) + (m.summary.toLowerCase().includes(w) ? 2 : 0) + 1;
    }
    const at = low.indexOf(words[0]);
    const snippet = at < 0 ? m.summary : (at > 40 ? '…' : '') + m.text.slice(Math.max(0, at - 40), at + 110).trim() + '…';
    return { score, meta: memberMeta(m), snippet };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 20);
  return { results };
}

async function memberFile(lessonId, fileId) {
  await liveLesson(lessonId);
  const l = await getJson(lessonKey(lessonId));
  const ok = l && ((l.use || []).some(b => b.type === 'file' && b.fileId === fileId) || l.image === fileId);
  if (!ok) throw new HttpError(404, 'not_found', 'That file isn’t available.');
  const f = await getJson(fileKey(fileId));
  if (!f) throw new HttpError(404, 'not_found', 'That file isn’t available.');
  return { name: f.name, mime: f.mime, dataUrl: f.dataUrl };
}

// ───────────── admin side ─────────────
function cleanBlocks(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, 12).map(b => {
    const type = BLOCK_TYPES.includes(b && b.type) ? b.type : null;
    if (!type) return null;
    const out = { type, title: cleanText(b.title, 120) };
    if (type === 'checklist') out.items = (Array.isArray(b.items) ? b.items : String(b.items || '').split('\n')).map(x => cleanText(x, 240)).filter(Boolean).slice(0, 40);
    if (type === 'template') { out.text = String(b.text || '').replace(/\r/g, '').slice(0, 6000); out.note = cleanText(b.note, 300); }
    if (type === 'worksheet') out.fields = (Array.isArray(b.fields) ? b.fields : []).map(f => ({ label: cleanText(f && f.label, 200), hint: cleanText(f && f.hint, 200), long: !!(f && f.long) })).filter(f => f.label).slice(0, 30);
    if (type === 'file') { out.fileId = /^[A-Za-z0-9]{8,24}$/.test(String(b.fileId || '')) ? b.fileId : ''; out.name = cleanText(b.name, 120); out.size = Number(b.size) || 0; out.mime = cleanText(b.mime, 120); out.note = cleanText(b.note, 300); if (!out.fileId) return null; }
    if (type === 'calculator') out.kind = b.kind === 'pricing' ? 'pricing' : 'pricing';
    if ((type === 'checklist' && !out.items.length) || (type === 'template' && !out.text.trim()) || (type === 'worksheet' && !out.fields.length)) return null;
    return out;
  }).filter(Boolean);
}

function cleanLesson(raw, existing) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const title = cleanText(raw.title, 140);
  if (!title) throw new HttpError(400, 'missing_field', 'Add a title.');
  const module = MODULE_IDS.includes(raw.module) ? raw.module : null;
  if (!module) throw new HttpError(400, 'missing_field', 'Choose a module.');
  const status = STATUSES.includes(raw.status) ? raw.status : 'draft';
  const long = (v, n) => String(v || '').replace(/\r/g, '').slice(0, n);
  const l = {
    module, title, status,
    order: Math.max(0, Math.min(999, Math.round(Number(raw.order) || 0))),
    summary: cleanText(raw.summary, 300),
    publishAt: validDate(raw.publishAt) ? raw.publishAt : '',
    featured: !!raw.featured,
    collection: cleanText(raw.collection, 80), collectionOrder: Math.max(0, Math.min(99, Math.round(Number(raw.collectionOrder) || 0))),
    month: /^\d{4}-\d{2}$/.test(String(raw.month || '')) ? raw.month : '',
    tags: (Array.isArray(raw.tags) ? raw.tags : []).filter(t => TAGS.includes(t)).slice(0, 8),
    readMins: Math.max(0, Math.min(60, Math.round(Number(raw.readMins) || 0))),
    learn: long(raw.learn, 20000), seeTitle: cleanText(raw.seeTitle, 160), see: long(raw.see, 8000), do: long(raw.do, 4000),
    use: cleanBlocks(raw.use),
    studio: null,
    sources: (Array.isArray(raw.sources) ? raw.sources : []).map(s => ({ title: cleanText(s && s.title, 160), url: /^https:\/\/[^\s"<>]{3,400}$/.test(String((s && s.url) || '')) ? s.url : '' })).filter(s => s.title).slice(0, 10),
    reviewedAt: validDate(raw.reviewedAt) ? raw.reviewedAt : (existing && existing.reviewedAt) || '',
    reviewMonths: [3, 6, 12, 24].includes(Number(raw.reviewMonths)) ? Number(raw.reviewMonths) : 12,
    disclaimer: cleanText(raw.disclaimer, 400),
    image: /^[A-Za-z0-9]{8,24}$/.test(String(raw.image || '')) ? raw.image : '',
  };
  if (!l.tags.length) l.tags = ['all'];
  if (raw.studio && raw.studio.label) {
    const s = raw.studio;
    if (STUDIO_LINKS.tools.includes(s.tool)) l.studio = { label: cleanText(s.label, 60), tool: s.tool, input: s.input && typeof s.input === 'object' ? JSON.parse(JSON.stringify(s.input).slice(0, 2000)) : {} };
    else if (STUDIO_LINKS.screens.includes(s.screen)) l.studio = { label: cleanText(s.label, 60), screen: s.screen };
  }
  if (status === 'published' && !l.learn.trim() && !l.use.length) throw new HttpError(400, 'missing_field', 'Add some content before publishing (Learn or a resource).');
  if (status === 'published' && !l.publishAt) l.publishAt = today();
  if (!l.readMins && l.learn) l.readMins = Math.max(1, Math.round(plain(l.learn + ' ' + l.see + ' ' + l.do).split(' ').length / 200));
  return l;
}

function slugify(t) { return String(t).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'lesson'; }

async function adminList() {
  const idx = await index();
  const [all, month] = await Promise.all([getJson('res/stats/all'), getJson(`res/stats/${core.monthKey()}`)]);
  return { modules: MODULES, tags: TAGS, lessons: idx.lessons.filter(m => MODULE_IDS.includes(m.module)).map(({ text, ...m }) => m).sort(sortLessons), stats: { all: all || { views: {}, completes: {} }, month: month || { views: {}, completes: {} } }, today: today(), monthKey: core.monthKey() };
}

async function adminGet(id) {
  requireId(id);
  const l = await getJson(lessonKey(id));
  if (!l) throw new HttpError(404, 'not_found', 'Lesson not found.');
  return l;
}

async function adminSave(actor, raw) {
  const id = raw && raw.id ? requireId(raw.id) : null;
  const existing = id ? await getJson(lessonKey(id)) : null;
  if (id && !existing) throw new HttpError(404, 'not_found', 'Lesson not found.');
  const fields = cleanLesson(raw, existing);
  const now = core.nowIso();
  let lesson;
  await cas(INDEX_KEY, cur => {
    const data = cur || { seedVersion: 0, deletedSeeds: [], lessons: [] };
    let newId = id;
    if (!newId) {
      const base = slugify(fields.title); newId = base; let n = 2;
      while (data.lessons.some(m => m.id === newId)) newId = `${base}-${n++}`;
      if (data.lessons.length >= MAX_LESSONS) throw new HttpError(409, 'too_many', 'Too many lessons — delete some old drafts first.');
    }
    lesson = { ...(existing || {}), ...fields, id: newId, source: existing ? existing.source : 'admin', seedRev: existing ? existing.seedRev : 0,
      adminEdited: true, createdAt: existing ? existing.createdAt : now, updatedAt: now, updatedBy: actor };
    const meta = metaOf(lesson);
    const i = data.lessons.findIndex(m => m.id === newId);
    if (i >= 0) data.lessons[i] = meta; else data.lessons.push(meta);
    return data;
  });
  await setJson(lessonKey(lesson.id), lesson);
  return lesson;
}

async function adminDelete(id) {
  requireId(id);
  await cas(INDEX_KEY, cur => {
    if (!cur) return undefined;
    const m = cur.lessons.find(x => x.id === id);
    if (!m) return undefined;
    cur.lessons = cur.lessons.filter(x => x.id !== id);
    if (m.source === 'seed') cur.deletedSeeds = [...new Set([...(cur.deletedSeeds || []), id])];
    return cur;
  });
  await core.del(lessonKey(id)).catch(() => {});
}

async function adminUpload(raw) {
  const name = cleanText(raw && raw.name, 120).replace(/[\\/:*?"<>|]+/g, '-') || 'file';
  const url = String((raw && raw.dataUrl) || '');
  const m = url.match(/^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m || !FILE_MIMES[m[1].toLowerCase()]) throw new HttpError(400, 'bad_file', 'Upload a PDF, image (PNG/JPG/WebP), Word, Excel, CSV or text file.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'too_large', 'Files must be under 3.5 MB.');
  const mime = m[1].toLowerCase();
  const sig = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4E, 0x47], 'image/jpeg': [0xFF, 0xD8, 0xFF], 'image/webp': [0x52, 0x49, 0x46, 0x46] }[mime];
  if (sig && !sig.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'bad_file', 'That file doesn’t match its type.');
  const id = core.randomToken(12).replace(/[^A-Za-z0-9]/g, '').slice(0, 16).padEnd(10, 'x');
  await setJson(fileKey(id), { name, mime, size: bytes.length, dataUrl: url, uploadedAt: core.nowIso() });
  return { fileId: id, name, mime, size: bytes.length };
}

async function adminFile(id) {
  if (!/^[A-Za-z0-9]{8,24}$/.test(String(id || ''))) throw new HttpError(400, 'bad_id', 'Invalid file.');
  const f = await getJson(fileKey(id));
  if (!f) throw new HttpError(404, 'not_found', 'File not found.');
  return f;
}

function needsReview(m, day) {
  if (m.status === 'planned') return false;
  if (!m.reviewedAt) return true;
  const d = new Date(`${m.reviewedAt}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + (m.reviewMonths || 12));
  return d.toISOString().slice(0, 10) <= day;
}

async function adminDashboard() {
  const { lessons, stats, today: day, monthKey } = await adminList();
  const live = lessons.filter(m => isLive(m, day));
  const top = (obj, n) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, c]) => ({ id, count: c, title: (lessons.find(m => m.id === id) || {}).title || id }));
  return {
    published: live.length,
    scheduled: lessons.filter(m => m.status === 'published' && !isLive(m, day)).length,
    drafts: lessons.filter(m => m.status === 'draft').length,
    planned: lessons.filter(m => m.status === 'planned').length,
    readyToPublish: lessons.filter(m => m.status === 'planned' && m.hasContent).map(m => ({ id: m.id, title: m.title, collection: m.collection })),
    readyToPublish: lessons.filter(m => m.status === 'planned' && m.hasContent).map(m => ({ id: m.id, title: m.title, collection: m.collection })),
    newThisMonth: live.filter(m => (m.publishAt || '').slice(0, 7) === monthKey).length,
    mostViewed: top(stats.all.views, 8), mostViewedMonth: top(stats.month.views, 8),
    completions: top(stats.all.completes, 8), completionsMonth: Object.values(stats.month.completes || {}).reduce((a, b) => a + b, 0),
    viewsMonth: Object.values(stats.month.views || {}).reduce((a, b) => a + b, 0),
    needsReview: lessons.filter(m => needsReview(m, day)).map(m => ({ id: m.id, title: m.title, reviewedAt: m.reviewedAt, status: m.status })),
  };
}


// One lesson to suggest on Today / in the weekly email, with the reason. Rule-based (no AI).
async function suggestLesson(email, profile, summary) {
  const idx = await index();
  const day = today();
  const live = idx.lessons.filter(m => isLive(m, day)).sort(sortLessons);
  if (!live.length) return null;
  const p = await getProgress(email);
  const open = id => { const m = live.find(x => x.id === id); return m && !p.completed[id] ? m : null; };
  const pick = (m, reason) => (m ? { id: m.id, title: m.title, summary: m.summary, readMins: m.readMins, reason } : null);
  const t = (summary && summary.thisWeek) || {}, l = (summary && summary.lastWeek) || {};
  const enquiries = (t.enquiries || 0) + (l.enquiries || 0), sales = (t.salesCount || 0) + (t.bookings || 0) + (l.salesCount || 0) + (l.bookings || 0);
  const posts = t.posts || 0;
  const channels = (profile && profile.channels) || [];
  if (!Object.keys(p.opened || {}).length) {
    const r = pick(open('m01-welcome-to-auntie-tobi-business-club') || open('m01-create-your-30-day-business-action-plan'), 'A good place to start');
    if (r) return r;
  }
  if (enquiries >= 3 && sales === 0) {
    const r = pick(open('m04-how-to-turn-enquiries-into-orders') || open('m04-following-up-without-being-pushy') || open('m04-how-to-respond-to-customer-enquiries'), `You\u2019ve recorded ${enquiries} enquiries but no sales or bookings yet`);
    if (r) return r;
  }
  if (summary && summary.thisWeek && summary.thisWeek.days >= 2 && posts === 0) {
    const r = pick(open('m03-writing-captions-that-encourage-action') || open('m02-understanding-reels-stories-and-carousels') || open('m03-how-to-take-better-product-photos'), 'No posts recorded this week yet');
    if (r) return r;
  }
  if (!channels.length || channels.includes('instagram')) {
    const r = pick(open('m02-optimising-your-instagram-bio'), 'Quick win: make your profile clearer');
    if (r) return r;
  }
  const tag = recommendTag(profile);
  const tagged = tag ? live.find(m => (m.tags || []).includes(tag) && !p.completed[m.id] && m.module !== 'm01') : null;
  if (tagged) return pick(tagged, `Recommended for ${TAG_LABELS[tag]}`);
  const next = live.find(m => !p.completed[m.id]);
  return next ? pick(next, 'Your next lesson') : null;
}

module.exports = {
  suggestLesson, getProgress,
  MODULES, TAGS, STATUSES, isLive, recommendTag, ensureSeeded,
  home, lessonFor, setComplete, setSaved, setCheck, setAnswer, setPrefs, search, memberFile,
  adminList, adminGet, adminSave, adminDelete, adminUpload, adminFile, adminDashboard, needsReview,
};
