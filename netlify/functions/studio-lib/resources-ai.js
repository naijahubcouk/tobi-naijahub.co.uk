'use strict';
/*
 * Admin AI for Resources: draft a new lesson, tutorial or template, and help edit an existing one.
 * Nothing is saved here — drafts open in the editor as a Draft, and edits are shown to the admin before they're used.
 * Costs are added to the studio-wide monthly AI totals (Admin → Usage & costs). Members' credits are never used.
 */
const core = require('./core');
const { HttpError, cleanText } = core;
const gen = require('./generate');
const resources = require('./resources');

const STYLE = `You write learning resources for Auntie Tobi Business Studio — an app and membership that helps small business owners in the UK (many of them Nigerian business owners: food, beauty and hair, fashion, events, photography, services and product sellers) get more customers and run their business better.

House style:
- UK English and £. Warm, clear, practical and encouraging, like a knowledgeable auntie who runs a business. Short sentences. No jargon, or explain it simply.
- Speak to the reader as "you". Never promise results (views, enquiries, sales) — say what tends to help.
- Examples are clearly fictional: give the business a first name and a UK town, and label the example "Fictional example: …".
- No legal, tax or financial advice. If a topic touches rules (marketing consent, food hygiene, tax), keep it general and suggest checking official guidance (e.g. GOV.UK, ICO, Food Standards Agency).
- Lesson text formatting: "## Heading" lines, "- " bullets, "1. " numbered steps, **bold** for key words, "> " for one tip box. Blank line between paragraphs. No other markdown.
- Never use the name Seun. The brand is Auntie Tobi.`;

const APP = `Business Studio features (use only these; don't invent buttons or screens):
- Bottom menu: Today, Customers, Create, Plan, Resources. A gold + at the top adds a task, an enquiry, a quote or invoice, today's numbers or content. The person icon opens Account (plan, business profile, brand kit, help, sign out). The speech bubble messages Auntie Tobi.
- Today: follow-ups due, tasks today, posts planned this week, new enquiries this week; weekly goal (Set goal — pick one or write your own); today's business tip; Business tools shortcuts (Customers, To-do list, Create, Content calendar, Tracker, Planner, Quotes & invoices, Resources).
- Business profile (Account → Edit business profile): business name, what you sell, location, tone, where customers find you; search and link your Auntie Tobi listing ("Is this your business?"). Brand kit: colours, font, logo.
- Customers: + Log enquiry (name, WhatsApp/phone, what they asked about). Stages New → Contacted → Quoted → Booked → Completed. Filters: Due today, Not now, Lost, All. Default follow-up timings can be changed. "From quotes & invoices" tab.
- Plan: + New card (title, type post/Reel/Story/carousel, caption, date). Board columns Ideas, Drafting, Ready, Scheduled; Calendar; Posted. "✨ Plan 7 or 30 days with AI": put posts on my calendar (dated) or add them to my Ideas (no dates); 7 days = 1 AI credit, 30 days = 3.
- Create: AI tools by category (Content Creation, Sales & Promotions, Brand & Visibility, Customer Communication, Business Growth, Planning & Productivity), search, ★ Saved & history. On a result: tap text to edit, Copy, Regenerate, 📅 Add to Plan.
- AI credits: daily AI credits (Free 5, Business Club 20, Business Studio Plus 50), reset at midnight UK time; most tools use 1, a 30-day plan uses 3; failures cost nothing. Extra AI credits: £5/300, £10/750, £20/1,600, one-off, last 12 months, used after daily credits.
- To-do list: add a task with a date and ⭐ Priority; repeating tasks; tick off.
- Quotes & invoices: Quote, Invoice or Receipt; customer, items, prices, notes, bank details; Share link; statuses Draft, Sent, Paid, Overdue, Cancelled; Turn into invoice; paid invoices go into the tracker.
- Track: Today's numbers — enquiries, bookings and sales.
- Resources: 🎓 Tutorials (free), 📚 Growth Lessons (Business Club and Plus; Business Mindset free), 🧰 Templates & Tools. Lessons have Learn, an example, an action and templates; Mark lesson as complete; ☆ Save.`;

const BLOCK_SPEC = `Practical resources ("use") are objects of one of these shapes:
{"type":"checklist","title":"…","items":["…","…"]}            (5–10 short items)
{"type":"template","title":"…","text":"…"}                      (a message or script to copy; use [name], [product] style placeholders)
{"type":"worksheet","title":"…","fields":[{"label":"…","hint":"e.g. …","long":false}]}   (3–6 questions)`;

const SCREENS = ['home', 'customers', 'create', 'plan', 'todo', 'goal', 'money', 'track', 'profile', 'brand', 'review', 'followups', 'image', 'market', 'library'];

function moduleById(id) { return resources.MODULES.find(m => m.id === id) || null; }

function parseJson(text) {
  const s = String(text || '');
  try { return JSON.parse(s); } catch (e) {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) {} }
  throw new HttpError(502, 'ai_error', 'The AI gave an odd answer — please try again.');
}
const txt = (v, n) => String(v || '').replace(/\r/g, '').trim().slice(0, n);

function cleanBlock(b) {
  if (!b || typeof b !== 'object') return null;
  const title = cleanText(b.title, 120);
  if (b.type === 'checklist') { const items = (Array.isArray(b.items) ? b.items : []).map(x => cleanText(x, 200)).filter(Boolean).slice(0, 20); return items.length ? { type: 'checklist', title, items } : null; }
  if (b.type === 'template') { const text = txt(b.text, 3000); return text ? { type: 'template', title, text } : null; }
  if (b.type === 'worksheet') {
    const fields = (Array.isArray(b.fields) ? b.fields : []).map(f => (typeof f === 'string' ? { label: f } : f)).map(f => ({ label: cleanText(f && f.label, 160), hint: cleanText(f && f.hint, 160), long: !!(f && f.long) })).filter(f => f.label).slice(0, 12);
    return fields.length ? { type: 'worksheet', title, fields } : null;
  }
  return null;
}

async function run(messages, maxTokens, what, actor) {
  const settings = await core.getSettings();
  const res = await gen.callModel(messages, maxTokens, settings, { json: true, raw: true });
  await gen.addGlobal(core.monthKey(), { id: 'res-ai', tool: 'res-ai', cost: 0, inTok: res.inTok, outTok: res.outTok, costUsd: res.costUsd }, settings).catch(() => {});
  await core.audit(actor || 'admin', 'res_ai', { what }).catch(() => {});
  return parseJson(res.text);
}

// kind: 'lesson' | 'tutorial' | 'template'
async function draft(raw, actor) {
  const kind = ['lesson', 'tutorial', 'template'].includes(raw.kind) ? raw.kind : 'lesson';
  const topic = cleanText(raw.topic, 300);
  const notes = txt(raw.notes, 1500);
  if (topic.length < 3) throw new HttpError(400, 'missing_field', 'Tell the AI what the resource is about.');
  let mod = moduleById(raw.module);
  if (kind === 'tutorial') mod = moduleById('t01');
  if (!mod) mod = moduleById('m01');
  const blockType = ['checklist', 'template', 'worksheet'].includes(raw.blockType) ? raw.blockType : 'checklist';
  const where = `Module: ${mod.title} — ${mod.desc}`;
  let prompt, maxTokens = 3000;
  if (kind === 'lesson') {
    prompt = `Write a Business Growth lesson.
Topic: ${topic}
${where}
${notes ? `Notes from Auntie Tobi: ${notes}\n` : ''}
Return JSON: {"title":"…","summary":"one sentence, max 200 characters","learn":"the main lesson, 450–700 words, with 2–4 ## headings and one > tip","seeTitle":"Fictional example: a … in …","see":"a realistic 120–200 word example of a small UK business applying this","do":"one practical action to take this week, 1–3 sentences","use":[2–3 practical resources],"studioScreen":"one of ${SCREENS.join(', ')} or empty","studioLabel":"button text, e.g. Open Customers"}
${BLOCK_SPEC}`;
  } else if (kind === 'tutorial') {
    prompt = `Write a Business Studio tutorial — a step-by-step guide to using the app.
Topic: ${topic}
${notes ? `Notes from Auntie Tobi: ${notes}\n` : ''}
${APP}
Return JSON: {"title":"…","summary":"one sentence","learn":"200–400 words: one intro sentence, then ## headings with 1. numbered steps naming the exact buttons, and one > tip","do":"one thing to try now, 1–2 sentences","studioScreen":"one of ${SCREENS.join(', ')}","studioLabel":"button text, e.g. Open my Plan"}
Only describe features listed above.`;
    maxTokens = 1800;
  } else {
    prompt = `Create one ready-to-use ${blockType} for the Templates & Tools library.
Topic: ${topic}
${where}
${notes ? `Notes from Auntie Tobi: ${notes}\n` : ''}
Return JSON: {"title":"…","summary":"one sentence saying when to use it","use":[exactly one ${blockType}]}
${BLOCK_SPEC}`;
    maxTokens = 1500;
  }
  const p = await run([{ role: 'system', content: STYLE }, { role: 'user', content: prompt }], maxTokens, `draft ${kind}`, actor);
  const use = (Array.isArray(p.use) ? p.use : []).map(cleanBlock).filter(Boolean).slice(0, 4);
  const screen = SCREENS.includes(p.studioScreen) ? p.studioScreen : '';
  const lesson = {
    module: mod.id, title: cleanText(p.title, 140) || topic, summary: cleanText(p.summary, 300), status: 'draft', tags: ['all'],
    learn: txt(p.learn, 20000), seeTitle: kind === 'lesson' ? cleanText(p.seeTitle, 160) : '', see: kind === 'lesson' ? txt(p.see, 8000) : '',
    do: kind === 'template' ? '' : txt(p.do, 2000), use, toolOnly: kind === 'template',
    studio: screen && kind !== 'template' ? { screen, label: cleanText(p.studioLabel, 60) || 'Open in Business Studio' } : null,
    disclaimer: kind === 'lesson' ? 'General business guidance. Examples are fictional.' : '',
    aiDraft: true,
  };
  if (kind !== 'template' && !lesson.learn) throw new HttpError(502, 'ai_error', 'The AI gave an odd answer — please try again.');
  if (kind === 'template' && !use.length) throw new HttpError(502, 'ai_error', 'The AI gave an odd answer — please try again.');
  return { lesson };
}

// Help with an existing resource. action: improve | shorter | example | checklist | template | worksheet
async function assist(raw, actor) {
  const action = String(raw.task || '');
  const field = ['learn', 'see', 'do'].includes(raw.field) ? raw.field : 'learn';
  const L = raw.lesson || {};
  const mod = moduleById(L.module);
  const ctx = `Resource: ${cleanText(L.title, 140)}${L.summary ? ` — ${cleanText(L.summary, 300)}` : ''}${mod ? `\nModule: ${mod.title}` : ''}${mod && mod.kind === 'tutorial' ? `\n${APP}` : ''}\nMain text:\n${txt(L.learn, 6000)}`;
  const NAMES = { learn: 'the main lesson text', see: 'the example', do: 'the action' };
  let prompt;
  if (action === 'improve' || action === 'shorter') {
    const cur = txt(L[field], 12000);
    if (cur.length < 20) throw new HttpError(400, 'missing_field', 'Write something first, then ask the AI to improve it.');
    prompt = `${ctx}\n\nHere is ${NAMES[field]}:\n"""\n${cur}\n"""\n\n${action === 'improve'
      ? 'Improve the wording: clearer, warmer and easier to read. Keep every fact, the structure and the formatting rules. Fix spelling and grammar. Do not add new claims.'
      : 'Make it about 30–40% shorter. Keep the key points, headings that still make sense and the formatting rules.'}\nReturn JSON: {"text":"…"}`;
  } else if (action === 'example') {
    prompt = `${ctx}\n\nWrite the example section: a realistic 120–200 word fictional example of a small UK business applying this lesson.\nReturn JSON: {"seeTitle":"Fictional example: a … in …","text":"…"}`;
  } else if (['checklist', 'template', 'worksheet'].includes(action)) {
    prompt = `${ctx}\n\nCreate one ${action} that helps the reader put this into practice.\nReturn JSON: {"block": one ${action}}\n${BLOCK_SPEC}`;
  } else throw new HttpError(400, 'invalid', 'Unknown AI action.');
  const p = await run([{ role: 'system', content: STYLE }, { role: 'user', content: prompt }], action === 'shorter' || action === 'improve' ? 3500 : 1500, `assist ${action}`, actor);
  if (p.block) { const block = cleanBlock(p.block); if (!block) throw new HttpError(502, 'ai_error', 'The AI gave an odd answer — please try again.'); return { block }; }
  const text = txt(p.text, 20000);
  if (!text) throw new HttpError(502, 'ai_error', 'The AI gave an odd answer — please try again.');
  return { text, field: action === 'example' ? 'see' : field, seeTitle: action === 'example' ? cleanText(p.seeTitle, 160) : undefined };
}

module.exports = { draft, assist, cleanBlock, parseJson };
