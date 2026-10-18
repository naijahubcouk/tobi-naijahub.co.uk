'use strict';
/*
 * Resources — Learn (lessons) + Templates & Tools (Club, Pro and Plus; Free plan gets sample templates; no AI).
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

// Display order = this list. access: 'club' = Business Club members only; 'all' = every plan, including Free.
const MODULES = [
  { id: 't01', n: 'T', title: 'Business Studio Tutorials', desc: 'Step-by-step guides to using Business Studio.', icon: 'tutorial', access: 'all', kind: 'tutorial' },
  { id: 'm01', n: '01', title: 'Start Here', desc: 'Become more intentional about how you run, market and grow your business — free for everyone.', icon: 'start', access: 'all' },
  { id: 'm02', n: '02', title: 'Instagram for Business', desc: 'Turn your profile into a clearer, more trustworthy business presence.', icon: 'insta' },
  { id: 'm03', n: '03', title: 'Content & Visibility', desc: 'Create content with a purpose instead of posting randomly.', icon: 'content' },
  { id: 'm04', n: '04', title: 'Sales & Customer Experience', desc: 'Manage enquiries, communicate well and encourage repeat business.', icon: 'sales' },
  { id: 'm05', n: '05', title: 'Business Tools & Productivity', desc: 'Save time, miss fewer tasks and build reliable routines.', icon: 'tools' },
  { id: 'm06', n: '06', title: 'Business Growth & Strategy', desc: 'Understand your numbers and make better decisions.', icon: 'growth' },
  { id: 'm07', n: '07', title: 'Monthly Marketing & Business Planning', desc: 'Plan around your customers, goals and seasonal opportunities.', icon: 'monthly' },
  { id: 'm08', n: '08', title: 'Auntie Tobi Visibility & Collaboration', desc: 'Make the most of your Business Club Spotlight, Marketplace, reposts and Check-Up.', icon: 'visibility', access: 'club' },
];
// Lessons moved to another module (ids stay the same, so members keep their progress).
const MOVES = {
  'm01-welcome-to-auntie-tobi-business-club': 'm08',
  'm01-how-to-make-the-most-of-your-membership': 'm08',
};
const MOVES_VERSION = 1;
// Lessons taken out of use (made drafts once — content kept, members stop seeing them). Start Here was rewritten.
const RETIRE = ['m01-set-your-business-goals', 'm01-create-your-30-day-business-action-plan', 'm01-understanding-your-ideal-customer'];
const RETIRE_VERSION = 1;
const MODULE_ACCESS = Object.fromEntries(MODULES.map(m => [m.id, m.access || 'paid']));
// acc: { full (Club, Pro or Plus), club (Business Club) }
function canModule(mod, acc) { const a = MODULE_ACCESS[mod]; return a === 'all' ? true : a === 'club' ? !!(acc && acc.club) : !!(acc && acc.full); }
const FULL_ACC = { full: true, club: true };
const MODULE_IDS = MODULES.map(m => m.id);
const STATUSES = ['planned', 'draft', 'published'];
const TAGS = ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'services', 'retail'];
const TAG_LABELS = { food: 'food businesses', beauty: 'beauty and hair businesses', fashion: 'fashion businesses', events: 'event businesses', photo: 'photographers and creatives', services: 'service businesses', retail: 'product sellers' };
const BLOCK_TYPES = ['checklist', 'template', 'worksheet', 'file', 'calculator', 'link'];
const STUDIO_LINKS = { tools: ['oneclick', 'ideas', 'caption', 'reel', 'promo', 'planner', 'bio', 'message'], screens: ['goal', 'plan', 'money', 'track', 'profile', 'brand', 'review', 'customers', 'image', 'followups', 'todo', 'market', 'home', 'create', 'library'] };
const CALC_KINDS = ['pricing', 'product', 'service', 'margin', 'promo'];
const SEND_TO = ['todo', 'plan', 'customers'];
// Templates & Tools groups (by business need).
const GROUPS = [
  { id: 'planning', label: 'Business Planning & Goals', icon: '🎯' },
  { id: 'content', label: 'Social Media & Content', icon: '📱' },
  { id: 'customers', label: 'Customers, Enquiries & Follow-ups', icon: '💬' },
  { id: 'money', label: 'Pricing, Sales & Money', icon: '💷' },
  { id: 'marketing', label: 'Marketing & Promotions', icon: '📣' },
  { id: 'operations', label: 'Productivity & Operations', icon: '🗂️' },
  { id: 'club', label: 'Business Club Toolkit', icon: '💚' },
];
const GROUP_IDS = GROUPS.map(g => g.id);
const MODULE_GROUP = { t01: 'operations', m01: 'planning', m02: 'content', m03: 'content', m04: 'customers', m05: 'operations', m06: 'money', m07: 'marketing', m08: 'club' };
function groupOf(b, module) { return GROUP_IDS.includes(b.group) ? b.group : b.type === 'calculator' ? 'money' : MODULE_GROUP[module] || 'planning'; }
function sendOf(b, group) {
  if (b.send === 'none') return '';
  if (SEND_TO.includes(b.send)) return b.send;
  if (b.type === 'checklist' || b.type === 'worksheet') return 'todo';
  if (b.type === 'template') return group === 'content' || group === 'marketing' ? 'plan' : group === 'customers' ? 'customers' : '';
  return '';
}
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

// Templates & Tools: every resource block becomes a tool you can open on its own. id = <lessonId>~<blockIndex>
const TOOL_TYPES = [
  { id: 'checklist', label: 'Checklists' }, { id: 'template', label: 'Messages & scripts' },
  { id: 'worksheet', label: 'Worksheets & planners' }, { id: 'calculator', label: 'Calculators' }, { id: 'file', label: 'Downloads' },
  { id: 'link', label: 'Business Studio tools' },
];
// Free plan samples (until you choose others in Admin).
const DEFAULT_FREE = new Set([
  'm04-following-up-without-being-pushy~0', 'm04-following-up-without-being-pushy~1', 'm02-optimising-your-instagram-bio~0',
  'm04-encouraging-repeat-purchases-and-referrals~0',
]);
function previewOf(b) {
  if (b.type === 'checklist') return (b.items || []).slice(0, 2).join(' · ').slice(0, 140);
  if (b.type === 'template') return String(b.text || '').replace(/\s+/g, ' ').slice(0, 140);
  if (b.type === 'worksheet') return (b.fields || []).slice(0, 3).map(f => f.label).join(' · ').slice(0, 140);
  if (b.type === 'file') return [b.name, b.note].filter(Boolean).join(' — ').slice(0, 140);
  if (b.type === 'calculator') return ({ product: 'Cost + overhead + target margin → a selling price.', service: 'Time, rate and costs → a price for a job.', margin: 'Price and cost → your profit and margin.', promo: 'Is this discount still worth it?' }[b.kind]) || 'Work out a price from materials, time, running costs and profit.';
  if (b.type === 'link') return String(b.text || '').slice(0, 140);
  return '';
}
function toolsOf(l) {
  return (l.use || []).map((b, i) => { const group = groupOf(b, l.module); return { i, type: b.type, title: b.title || '', hide: !!b.hide, free: typeof b.free === 'boolean' ? b.free : DEFAULT_FREE.has(`${l.id}~${i}`), items: (b.items || b.fields || []).length, preview: previewOf(b), group, send: sendOf(b, group), kind: b.kind || '' }; });
}

function metaOf(l) {
  return {
    toolOnly: !!l.toolOnly, tools: toolsOf(l), studio: l.studio || null,
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
    return { ...s, module: MOVES[s.id] || s.module, source: 'seed', seedRev: s.seedRev || 1, adminEdited: false, createdAt: have ? have.createdAt : now, updatedAt: now };
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
async function applyMoves(idx) {
  if ((idx.movesVersion || 0) >= MOVES_VERSION) return idx;
  for (const [id, mod] of Object.entries(MOVES)) {
    await cas(lessonKey(id), cur => (cur && cur.module !== mod ? { ...cur, module: mod } : undefined)).catch(() => {});
  }
  const out = await cas(INDEX_KEY, cur => {
    if (!cur || (cur.movesVersion || 0) >= MOVES_VERSION) return undefined;
    cur.lessons = cur.lessons.map(m => (MOVES[m.id] ? { ...m, module: MOVES[m.id], tools: undefined } : m));
    cur.movesVersion = MOVES_VERSION;
    return cur;
  });
  return out || (await getJson(INDEX_KEY)) || idx;
}
async function applyRetire(idx) {
  if ((idx.retireVersion || 0) >= RETIRE_VERSION) return idx;
  const now = core.nowIso();
  for (const id of RETIRE) await cas(lessonKey(id), cur => (cur && cur.status !== 'draft' ? { ...cur, status: 'draft', adminEdited: true, updatedAt: now } : undefined)).catch(() => {});
  const out = await cas(INDEX_KEY, cur => {
    if (!cur || (cur.retireVersion || 0) >= RETIRE_VERSION) return undefined;
    cur.lessons = cur.lessons.map(m => (RETIRE.includes(m.id) ? { ...m, status: 'draft', adminEdited: true, updatedAt: now } : m));
    cur.retireVersion = RETIRE_VERSION;
    return cur;
  });
  return out || (await getJson(INDEX_KEY)) || idx;
}
async function index() {
  let idx = (await ensureSeeded()) || { lessons: [] };
  if (idx.lessons.length) idx = await applyMoves(idx);
  if (idx.lessons.length) idx = await applyRetire(idx);
  // Older index entries (before Templates & Tools) are refreshed from the lesson once.
  if (idx.lessons.some(m => !Array.isArray(m.tools))) {
    const fresh = {};
    for (const m of idx.lessons.filter(x => !Array.isArray(x.tools))) { const l = await getJson(lessonKey(m.id)).catch(() => null); if (l) fresh[m.id] = metaOf({ ...l, id: m.id }); }
    const out = await cas(INDEX_KEY, cur => {
      if (!cur) return undefined;
      let changed = false;
      cur.lessons = cur.lessons.map(m => (!Array.isArray(m.tools) && fresh[m.id] ? (changed = true, { ...m, ...fresh[m.id] }) : m));
      return changed ? cur : undefined;
    });
    return out || idx;
  }
  return idx;
}

// ───────────── member side ─────────────
function memberMeta(m) {
  if (m.status === 'planned') return { id: m.id, module: m.module, order: m.order, title: m.title, status: 'planned', month: m.month };
  const { text, source, adminEdited, seedRev, reviewMonths, tools, studio, ...rest } = m;
  return rest;
}

// Business type from the profile. The Industry field counts most; the description and products only break ties.
// Words that mislead on their own (wedding, party, hire, planner, it) never decide the type.
const TYPE_RULES = {
  food: /\b(cater\w*|food|cakes?|cupcakes?|bak\w*|chef|restaurant|kitchen|chops|jollof|meals?|grill\w*|suya|pastr\w*|desserts?|drinks?|grocer\w*|takeaway|puff[- ]?puff)\b/,
  beauty: /\b(hair\w*|beauty|nails?|lash\w*|brows?|make-?up|mua|skin\w*|salon|barber\w*|braid\w*|wigs?|spa|aesthetic\w*|cosmetic\w*|gele)\b/,
  fashion: /\b(fashion|tailor\w*|cloth\w*|aso[- ]?ebi|aso[- ]?oke|fabrics?|boutique|ankara|garments?|dresses|jewel\w*|accessor\w*)\b/,
  events: /\b(event planner|event planning|events? (company|management|styling|decor)|events|decor(ator|ation)s?|balloon\w*|venue|dj|mc|event)\b/,
  photo: /\b(photograph\w*|videograph\w*|photo ?shoots?|film\w*|content creat\w*|graphic design\w*)\b/,
  retail: /\b(shop|store|retail\w*|import\w*|wholesale|hampers?|gift\w*)\b/,
  services: /\b(consult\w*|accountan\w*|bookkeep\w*|tax|cleaning|cleaners?|tutor\w*|tuition|coach\w*|solicitors?|legal|law|immigration|estate agen\w*|property|letting|repairs?|it support|tech\w*|software|web design|care|carers?|training|mortgages?|insurance|travel|logistic\w*|courier\w*|haulage|recruit\w*)\b/,
};
function businessType(profile) {
  if (!profile) return null;
  const ind = String(profile.industry || '').toLowerCase();
  const rest = `${profile.products || ''} ${profile.description || ''}`.toLowerCase();
  const scores = Object.entries(TYPE_RULES).map(([tag, re]) => {
    let n = re.test(ind) ? 3 : 0;
    const g = new RegExp(re.source, 'g'); const hits = new Set((rest.match(g) || []).map(x => x.trim()));
    n += Math.min(2, hits.size);
    return [tag, n];
  }).sort((a, b) => b[1] - a[1]);
  if (scores[0][1] >= 2 && scores[0][1] > scores[1][1]) return scores[0][0];
  return null;
}
function recommendTag(profile) { return businessType(profile); }

// Health Check areas (same order as the checklist) → the lessons that help.
const AREAS = [
  ['Business clarity', /clarity|clear/i, 'm02', /bio|profile/i],
  ['Knowing your customer', /\bcustomers?\b(?! journey)|audience|ideal/i, 'm04', /journey|present/i],
  ['Your offer', /\boffers?\b/i, 'm04', /offer|present/i],
  ['Pricing', /pric/i, 'm06', /pric/i],
  ['Instagram', /instagram|\binsta\b/i, 'm02', /./],
  ['Content', /content|posting|posts?\b/i, 'm03', /./],
  ['Customer journey', /journey|easy to buy|ordering/i, 'm04', /journey/i],
  ['Sales', /\bsales?\b|selling|convert/i, 'm04', /enquir|follow/i],
  ['Trust', /trust|reviews?/i, 'm04', /review|present/i],
  ['Repeat business', /repeat|referr|loyal/i, 'm04', /repeat/i],
  ['Organisation', /organis|systems?|admin/i, 'm05', /./],
  ['Money', /money|numbers|profit|cash/i, 'm06', /cost|profit|cash|pric/i],
  ['Goals', /goals?\b/i, 'm01', /90-day|goal/i],
];
const GOAL_RULES = [
  [/enquir|visib|seen|follower|reach|aware|discover/i, [['m02', /enquir|follower|bio/i], ['m03', /./]]],
  [/repeat|review|referr|loyal/i, [['m04', /repeat|review/i]]],
  [/sale|sell|order|booking|revenue|income|customer/i, [['m04', /follow|enquir|offer|present/i]]],
  [/consist|post|content|reel/i, [['m03', /./], ['m02', /reel|stor/i]]],
  [/pric|profit|money|cash/i, [['m06', /pric|cost|profit/i]]],
  [/launch|new product|new service|offer|promot/i, [['m04', /offer|present/i], ['m07', /launch|campaign|promot/i]]],
];
const HC_ID = 'm01-business-basics-health-check', GOAL_ID = 'm01-set-your-90-day-business-goal';

// Personal recommendations: Health Check gaps → goals → business type → Start Here. Each has a reason.
function personalRecs(live, p, profile, weekly, acc) {
  const out = [], seen = new Set();
  const ok = m => m && !seen.has(m.id) && !p.completed[m.id] && canModule(m.module, acc) && m.id !== HC_ID;
  const pickIn = (mod, kw) => live.filter(m => m.module === mod).sort((a, b) => (a.order || 0) - (b.order || 0)).find(m => ok(m) && kw.test(m.title)) || live.filter(m => m.module === mod).sort((a, b) => (a.order || 0) - (b.order || 0)).find(ok);
  const add = (m, reason) => { if (ok(m) && out.length < 4) { seen.add(m.id); out.push({ id: m.id, reason }); } };
  // 1. Health Check: the gaps they wrote down first, then the areas they left unticked.
  const hcAns = (p.answers || {})[HC_ID] || {};
  for (const k of ['1:3', '1:0', '1:1', '1:2']) {
    const t = hcAns[k]; if (!t) continue;
    const a = AREAS.find(x => x[1].test(t) || t.toLowerCase().includes(x[0].toLowerCase()));
    if (a) add(pickIn(a[2], a[3]), `You chose ${a[0].toLowerCase()} as a gap to work on`);
  }
  const ticks = ((p.checks || {})[HC_ID] || []).filter(k => k.startsWith('0:'));
  // At most 2 from unticked areas, so goals and business type still get a say.
  if (ticks.length) { let n = 0; AREAS.forEach((a, i) => { if (n < 2 && !ticks.includes(`0:${i}`)) { const before = out.length; add(pickIn(a[2], a[3]), `${a[0]} was a gap in your Health Check`); if (out.length > before) n++; } }); }
  // 2. Goals: the 90-day goal, then this week's goal.
  const g90 = ((p.answers || {})[GOAL_ID] || {});
  for (const [text, label] of [[g90['0:1'] || g90['0:0'], 'your 90-day goal'], [weekly, 'this week’s goal']]) {
    if (!text) continue;
    const rule = GOAL_RULES.find(r => r[0].test(text));
    if (rule) rule[1].forEach(([mod, kw]) => add(pickIn(mod, kw), `Helps with ${label}: “${String(text).slice(0, 60)}${String(text).length > 60 ? '…' : ''}”`));
  }
  // 3. Their type of business (only when it's a clear match).
  const type = businessType(profile);
  if (type) live.filter(m => (m.tags || []).includes(type) && m.module !== 'm01' && m.module !== 'm08').forEach(m => add(m, `Suited to ${TAG_LABELS[type]} like ${profile.businessName || 'yours'}`));
  // 4. Start Here.
  live.filter(m => m.module === 'm01').sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(m => add(m, 'Next in Start Here'));
  return out;
}

async function getProgress(email) { return (await getJson(progressKey(email))) || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {}, last: '', lastAt: '', hideRecs: false }; }

async function home(email, profile, acc) {
  acc = acc || FULL_ACC;
  const idx = await index();
  const day = today();
  // Only published lessons (no "coming soon" placeholders). Locked modules show titles only.
  const visible = idx.lessons.filter(m => !m.toolOnly && isLive(m, day)).map(m => (canModule(m.module, acc) ? m : { id: m.id, module: m.module, order: m.order, title: m.title, summary: m.summary, readMins: m.readMins, status: 'locked', locked: true }));
  const p = await getProgress(email);
  const tag = businessType(profile);
  const wk = await getJson(`goals/${enc(email)}`).catch(() => null);
  const weekly = !wk ? '' : wk.goal === 'custom' ? (wk.text || '') : ({ enquiries: 'Get more enquiries', bookings: 'Get more bookings or orders', new_product: 'Promote a new product or service', visibility: 'Get seen by more people' }[wk.goal] || '');
  const liveMeta = idx.lessons.filter(m => !m.toolOnly && isLive(m, day) && m.module !== 't01');
  return {
    recs: personalRecs(liveMeta, p, profile, weekly, acc), recName: (profile && profile.businessName) || '',
    modules: MODULES.map(m => ({ ...m, locked: !canModule(m.id, acc) })),
    lessons: visible.map(m => (m.locked ? m : memberMeta(m))),
    full: !!acc.full, club: !!acc.club,
    progress: { completed: p.completed, saved: p.saved, opened: p.opened, last: p.last, lastAt: p.lastAt, hideRecs: !!p.hideRecs },
    workN: new Set([...Object.keys(p.answers || {}).filter(k => Object.keys(p.answers[k] || {}).length), ...Object.keys(p.checks || {}).filter(k => (p.checks[k] || []).length)]).size,
    recTag: tag, recLabel: tag ? TAG_LABELS[tag] : null, today: day,
  };
}

function lockedErr(mod) {
  return MODULE_ACCESS[mod] === 'club'
    ? new HttpError(403, 'club_module', 'This lesson is for Auntie Tobi Business Club members.')
    : new HttpError(403, 'club_only', 'Lessons are part of the Auntie Tobi Business Club and Business Studio Plus.');
}
async function lessonFor(email, id, acc) {
  acc = acc || FULL_ACC;
  requireId(id);
  const idx = await index();
  const meta = idx.lessons.find(m => m.id === id);
  if (!meta || !isLive(meta)) throw new HttpError(404, 'not_found', 'That resource isn’t available yet.');
  if (!canModule(meta.module, acc)) throw lockedErr(meta.module);
  const l = await getJson(lessonKey(id));
  if (!l) throw new HttpError(404, 'not_found', 'That resource isn’t available yet.');
  const p = await getProgress(email);
  // Record the open (once a day per member counts as a view).
  const day = today();
  const firstToday = !p.opened[id] || core.dayKey(new Date(p.opened[id])) !== day; // UK date of the last open
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.opened = d.opened || {}; d.opened[id] = core.nowIso(); d.last = id; d.lastAt = d.opened[id];
    const ks = Object.keys(d.opened); if (ks.length > 500) ks.sort((a, b) => d.opened[a].localeCompare(d.opened[b])).slice(0, ks.length - 500).forEach(k => delete d.opened[k]);
    return d;
  });
  if (firstToday) await bumpStat('views', id);
  // Neighbours in the module (published only), for "Next lesson".
  const siblings = idx.lessons.filter(m => m.module === meta.module && isLive(m) && !m.toolOnly).sort(sortLessons);
  const i = siblings.findIndex(m => m.id === id);
  return {
    lesson: { ...publicLesson(l), module: meta.module, use: (l.use || []).map(b => { const g = groupOf(b, meta.module); return { ...b, group: g, send: sendOf(b, g) }; }) },
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

async function liveLesson(id, acc) {
  requireId(id);
  const idx = await index();
  const meta = idx.lessons.find(m => m.id === id);
  if (!meta || !isLive(meta)) throw new HttpError(404, 'not_found', 'That resource isn’t available.');
  if (acc && !canModule(meta.module, acc)) throw lockedErr(meta.module);
  return meta;
}

async function setComplete(email, id, done, acc) {
  await liveLesson(id, acc || FULL_ACC);
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

async function setSaved(email, id, on, acc) {
  await liveLesson(id, acc || FULL_ACC);
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
    touchWork(d, id, key);
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
    touchWork(d, id, key);
    const size = JSON.stringify(d.answers).length;
    if (size > 200000) throw new HttpError(409, 'too_large', 'Your worksheet answers are very long — please shorten some.');
    return d;
  });
  return { ok: true };
}

// When each worksheet / checklist was last changed — for My Worksheets.
function touchWork(d, id, key) {
  d.workAt = d.workAt || {};
  d.workAt[`${id}~${String(key).split(':')[0]}`] = core.nowIso();
  const ks = Object.keys(d.workAt);
  if (ks.length > 300) ks.sort((a, b) => d.workAt[a].localeCompare(d.workAt[b])).slice(0, ks.length - 300).forEach(k => delete d.workAt[k]);
}

// My Worksheets: every worksheet and checklist the member has started, newest first.
async function myWork(email, acc) {
  acc = acc || FULL_ACC;
  const idx = await index(), day = today();
  const p = await getProgress(email);
  const mods = Object.fromEntries(MODULES.map(m => [m.id, m]));
  const counts = {};
  for (const [lid, ans] of Object.entries(p.answers || {})) for (const k of Object.keys(ans || {})) { const t = `${lid}~${k.split(':')[0]}`; counts[t] = (counts[t] || 0) + 1; }
  for (const [lid, ks] of Object.entries(p.checks || {})) for (const k of ks || []) { const t = `${lid}~${k.split(':')[0]}`; counts[t] = (counts[t] || 0) + 1; }
  const items = [];
  for (const [id, done] of Object.entries(counts)) {
    const [lid, si] = id.split('~'); const i = Number(si);
    const m = idx.lessons.find(x => x.id === lid);
    if (!m || !isLive(m, day)) continue;
    const t = (m.tools || []).find(x => x.i === i);
    if (!t || (t.type !== 'worksheet' && t.type !== 'checklist')) continue;
    items.push({ id, type: t.type, title: t.title || m.title, lessonId: m.toolOnly ? '' : m.id, lessonTitle: m.toolOnly ? '' : m.title, module: m.module, moduleTitle: (mods[m.module] || {}).title || '',
      done: Math.min(done, t.items || done), total: t.items || 0, at: (p.workAt || {})[id] || (p.opened || {})[lid] || '', locked: toolLocked(m, t, acc) });
  }
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { items };
}

async function setPrefs(email, prefs) {
  await cas(progressKey(email), cur => ({ ...(cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} }), hideRecs: !!(prefs && prefs.hideRecs) }));
  return { ok: true };
}

async function search(q, acc) {
  acc = acc || FULL_ACC;
  const words = String(q || '').toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 6);
  if (!words.length) return { results: [] };
  const idx = await index();
  const day = today();
  const results = idx.lessons.filter(m => isLive(m, day) && !m.toolOnly && canModule(m.module, acc)).map(m => {
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
  await liveLesson(lessonId); // access to the file is checked by the caller (lesson or tool)
  const l = await getJson(lessonKey(lessonId));
  const ok = l && ((l.use || []).some(b => b.type === 'file' && b.fileId === fileId) || l.image === fileId);
  if (!ok) throw new HttpError(404, 'not_found', 'That file isn’t available.');
  const f = await getJson(fileKey(fileId));
  if (!f) throw new HttpError(404, 'not_found', 'That file isn’t available.');
  return { name: f.name, mime: f.mime, dataUrl: f.dataUrl };
}

// ───────────── Templates & Tools (member side) ─────────────
function parseToolId(id) {
  const m = String(id || '').match(/^([a-z0-9][a-z0-9-]{1,60})~(\d{1,2})$/);
  if (!m) throw new HttpError(400, 'bad_id', 'Invalid resource.');
  return { lessonId: m[1], i: Number(m[2]) };
}
function toolLocked(meta, t, acc) {
  if (canModule(meta.module, acc)) return false;
  return MODULE_ACCESS[meta.module] === 'club' ? true : !t.free;
}
async function toolsList(email, acc) {
  acc = acc || FULL_ACC;
  const idx = await index(), day = today();
  const p = await getProgress(email);
  const mods = Object.fromEntries(MODULES.map(m => [m.id, m]));
  const tools = [];
  for (const m of idx.lessons.filter(x => isLive(x, day)).sort(sortLessons)) {
    for (const t of m.tools || []) {
      if (t.hide) continue;
      const id = `${m.id}~${t.i}`;
      const done = ((p.checks || {})[m.id] || []).filter(k => k.startsWith(`${t.i}:`)).length;
      const filled = Object.keys(((p.answers || {})[m.id]) || {}).filter(k => k.startsWith(`${t.i}:`)).length;
      tools.push({ id, type: t.type, title: t.title, preview: t.preview, items: t.items, module: m.module, moduleTitle: (mods[m.module] || {}).title || '',
        lessonId: m.toolOnly ? '' : m.id, lessonTitle: m.toolOnly ? '' : m.title, free: !!t.free && !acc.full && MODULE_ACCESS[m.module] !== 'club', locked: toolLocked(m, t, acc),
        clubOnly: MODULE_ACCESS[m.module] === 'club', group: t.group, send: t.send, kind: t.kind,
        progress: t.type === 'checklist' ? done : t.type === 'worksheet' ? filled : 0, saved: !!(p.savedTools || {})[id] });
    }
  }
  return { types: TOOL_TYPES, groups: GROUPS, modules: MODULES, tools, full: !!acc.full, club: !!acc.club };
}
// Resolve a tool and check the member may open it (Free plan: samples only).
async function toolAccess(lessonId, i, acc) {
  const idx = await index();
  const meta = idx.lessons.find(m => m.id === lessonId);
  if (!meta || !isLive(meta)) throw new HttpError(404, 'not_found', 'That resource isn\u2019t available.');
  const t = (meta.tools || []).find(x => x.i === i);
  if (!t || t.hide) throw new HttpError(404, 'not_found', 'That resource isn\u2019t available.');
  if (toolLocked(meta, t, acc)) throw new HttpError(403, 'locked', MODULE_ACCESS[meta.module] === 'club' ? 'This resource is for Auntie Tobi Business Club members.' : 'This resource comes with the Business Club and Business Studio Plus.');
  return { meta, t };
}
async function toolFor(email, id, acc) {
  acc = acc || FULL_ACC;
  const { lessonId, i } = parseToolId(id);
  const { meta, t: tm } = await toolAccess(lessonId, i, acc);
  const l = await getJson(lessonKey(lessonId));
  const b = l && (l.use || [])[i];
  if (!b) throw new HttpError(404, 'not_found', 'That resource isn\u2019t available.');
  const p = await getProgress(email);
  const own = k => k.startsWith(`${i}:`);
  const answers = {}; Object.entries(((p.answers || {})[lessonId]) || {}).forEach(([k, v]) => { if (own(k)) answers[k] = v; });
  await bumpStat('tools', id);
  const { hide, free, ...block } = b;
  return {
    tool: { id, i, ...block, group: tm.group, send: tm.send }, lesson: { id: lessonId, title: l.title, toolOnly: !!l.toolOnly, module: meta.module, summary: l.toolOnly ? l.summary : '', open: canModule(meta.module, acc) },
    studio: l.studio || null, mine: { checks: ((p.checks || {})[lessonId] || []).filter(own), answers, saved: !!(p.savedTools || {})[id] },
  };
}
async function setToolSaved(email, id, on, acc) {
  const { lessonId, i } = parseToolId(id);
  await toolAccess(lessonId, i, acc || FULL_ACC);
  await cas(progressKey(email), cur => {
    const d = cur || { completed: {}, saved: {}, opened: {}, checks: {}, answers: {} };
    d.savedTools = d.savedTools || {};
    if (on) d.savedTools[id] = core.nowIso(); else delete d.savedTools[id];
    if (Object.keys(d.savedTools).length > 300) throw new HttpError(409, 'too_many', 'You\u2019ve saved a lot \u2014 unsave a few first.');
    return d;
  });
  return { saved: !!on };
}
// Ticking, typing and downloading: allowed in lessons you can open, or on tools you can open (e.g. Free samples).
async function lessonOpen(lessonId, acc) {
  requireId(lessonId);
  const meta = (await index()).lessons.find(m => m.id === lessonId);
  return !!meta && canModule(meta.module, acc);
}
async function assertToolKey(lessonId, key, acc) {
  acc = acc || FULL_ACC;
  if (await lessonOpen(String(lessonId || ''), acc)) return;
  const i = Number(String(key || '').split(':')[0]);
  await toolAccess(String(lessonId || ''), i, acc);
}
async function assertToolFile(lessonId, fileId, acc) {
  acc = acc || FULL_ACC;
  if (await lessonOpen(String(lessonId || ''), acc)) return;
  const l = await getJson(lessonKey(String(lessonId || '')));
  const i = l ? (l.use || []).findIndex(b => b.type === 'file' && b.fileId === fileId) : -1;
  if (i < 0) throw new HttpError(404, 'not_found', 'That file isn\u2019t available.');
  await toolAccess(lessonId, i, acc);
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
    if (type === 'calculator') out.kind = CALC_KINDS.includes(b.kind) ? b.kind : 'pricing';
    if (type === 'link') { out.screen = STUDIO_LINKS.screens.includes(b.screen) ? b.screen : ''; out.text = cleanText(b.text, 300); out.label = cleanText(b.label, 60); if (!out.screen) return null; }
    if (GROUP_IDS.includes(b.group)) out.group = b.group;
    if (SEND_TO.includes(b.send) || b.send === 'none') out.send = b.send;
    if (b.hide) out.hide = true;
    if (typeof b.free === 'boolean') out.free = b.free;
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
    toolOnly: !!raw.toolOnly,
  };
  if (l.toolOnly && status === 'published' && !l.use.length) throw new HttpError(400, 'missing_field', 'Add at least one template, checklist, worksheet, file or calculator.');
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
  return { modules: MODULES, groups: GROUPS, calcKinds: CALC_KINDS, tags: TAGS, lessons: idx.lessons.filter(m => MODULE_IDS.includes(m.module)).map(m => ({ ...m, text: String(m.text || '').slice(0, 4000) })).sort(sortLessons), stats: { all: all || { views: {}, completes: {} }, month: month || { views: {}, completes: {} } }, today: today(), monthKey: core.monthKey() };
}

async function adminGet(id) {
  requireId(id);
  const l = await getJson(lessonKey(id));
  if (!l) throw new HttpError(404, 'not_found', 'Lesson not found.');
  return { ...l, use: (l.use || []).map((b, i) => ({ ...b, free: typeof b.free === 'boolean' ? b.free : DEFAULT_FREE.has(`${l.id}~${i}`) })) };
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

// Approve ready lessons: publish them for members today (lessons already scheduled later keep their date).
async function adminApprove(actor, ids) {
  ids = (Array.isArray(ids) ? ids : [ids]).map(String).slice(0, 60);
  if (!ids.length) throw new HttpError(400, 'invalid', 'Choose a lesson to approve.');
  const day = today(), out = [];
  for (const id of ids) {
    const l = await adminGet(id);
    if (l.status === 'published') { out.push(l); continue; }
    out.push(await adminSave(actor, { ...l, status: 'published', publishAt: l.publishAt && l.publishAt > day ? l.publishAt : day }));
  }
  return out;
}

// Unpublish: back to Draft (hidden from members; their progress is kept).
async function adminUnpublish(actor, id) {
  const l = await adminGet(id);
  return adminSave(actor, { ...l, status: 'draft' });
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
async function suggestLesson(email, profile, summary, acc) {
  acc = acc || FULL_ACC;
  const idx = await index();
  const day = today();
  const live = idx.lessons.filter(m => isLive(m, day) && !m.toolOnly && canModule(m.module, acc)).sort(sortLessons);
  if (!live.length) return null;
  const p = await getProgress(email);
  const open = id => { const m = live.find(x => x.id === id); return m && !p.completed[id] ? m : null; };
  const pick = (m, reason) => (m ? { id: m.id, title: m.title, summary: m.summary, readMins: m.readMins, reason } : null);
  const t = (summary && summary.thisWeek) || {}, l = (summary && summary.lastWeek) || {};
  const enquiries = (t.enquiries || 0) + (l.enquiries || 0), sales = (t.salesCount || 0) + (t.bookings || 0) + (l.salesCount || 0) + (l.bookings || 0);
  const posts = t.posts || 0;
  const channels = (profile && profile.channels) || [];
  if (!Object.keys(p.opened || {}).length) {
    const r = pick((acc.club && open('m01-welcome-to-auntie-tobi-business-club')) || open('m01-create-your-30-day-business-action-plan'), 'A good place to start');
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
  const tagged = tag ? live.find(m => (m.tags || []).includes(tag) && !p.completed[m.id] && m.module !== 'm01' && m.module !== 'm08') : null;
  if (tagged) return pick(tagged, `Suited to ${(profile && profile.businessName) || 'your business'}`);
  const next = live.find(m => !p.completed[m.id]);
  return next ? pick(next, 'Your next lesson') : null;
}

module.exports = {
  suggestLesson, getProgress,
  MODULES, TAGS, STATUSES, isLive, recommendTag, ensureSeeded,
  toolsList, toolFor, setToolSaved, assertToolKey, assertToolFile, TOOL_TYPES, DEFAULT_FREE, GROUPS, CALC_KINDS, canModule, MODULE_ACCESS,
  myWork, home, lessonFor, setComplete, setSaved, setCheck, setAnswer, setPrefs, search, memberFile,
  adminList, adminGet, adminSave, adminApprove, adminUnpublish, adminDelete, adminUpload, adminFile, adminDashboard, needsReview,
};
