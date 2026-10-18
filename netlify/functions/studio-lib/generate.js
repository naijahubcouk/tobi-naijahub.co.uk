'use strict';
/*
 * Allowance-safe AI generation.
 *
 * Allowances are DAILY (reset at midnight UK time). Most tools use 1 generation;
 * a 30-day plan uses 3 (tools.costOf).
 *
 * 1. reserve()  — atomically checks today's allowance and holds this request's cost against
 *                 its idempotency key. Duplicate clicks with the same key replay the earlier
 *                 result instead of charging again; simultaneous requests can't overshoot
 *                 because "used + in-flight + cost" is checked inside the CAS.
 * 2. callModel() — one OpenAI-model call with a hard output-token cap and timeout.
 * 3. commit()   — success: count the cost. release() — failure: nothing is charged.
 *
 * Spending is never blocked; admins get an email + alert at the monthly warning amount and 2x.
 */
const core = require('./core');
const { HttpError, Abort, cas, getJson, setJson, del, enc, dayKey, monthKey, randomToken, env } = core;
const tools = require('./tools');
const growth = require('./growth');
const credits = require('./credits');

const PENDING_STALE_MS = 3 * 60 * 1000;
const MAX_IN_FLIGHT = 2;

function usageKey(email, day) { return `usage/${day}/${enc(email)}`; }          // daily allowance
function monthUsageKey(email, month) { return `usage-month/${month}/${enc(email)}`; } // reporting
function globalKey(month) { return `usage-global/${month}`; }

function emptyUsage() { return { used: 0, pending: {}, done: {}, inTok: 0, outTok: 0, costUsd: 0, byTool: {} }; }
function pendingUnits(u, now) {
  let n = 0;
  for (const [k, p] of Object.entries(u.pending)) {
    if (now - p.t > PENDING_STALE_MS) delete u.pending[k];
    else n += p.n;
  }
  return n;
}

// creditsAvail: purchased credits that can cover what today's allowance can't. Returns { replay } or { daily, fromCredits }.
async function reserve(email, idemKey, limit, day, cost, creditsAvail) {
  const now = Date.now();
  let replay = null, split = { daily: cost, fromCredits: 0 };
  creditsAvail = Math.max(0, Number(creditsAvail) || 0);
  try {
    await cas(usageKey(email, day), cur => {
      const u = cur || emptyUsage();
      const inFlight = pendingUnits(u, now);
      if (u.done[idemKey]) throw new Abort(u.done[idemKey]);
      if (u.pending[idemKey]) throw new HttpError(409, 'in_progress', 'That request is already being created — hang on a moment.');
      if (Object.keys(u.pending).length >= MAX_IN_FLIGHT) throw new HttpError(429, 'one_at_a_time', 'Please wait for your current request to finish.');
      const remaining = Math.max(0, limit - u.used - inFlight);
      if (remaining < cost) {
        const need = cost - remaining;
        if (creditsAvail >= need) {
          split = { daily: remaining, fromCredits: need };
        } else if (remaining > 0) {
          throw new HttpError(402, 'not_enough', `This needs ${cost} generations and you have ${remaining} left today${creditsAvail ? ` plus ${creditsAvail} credits` : ''}. Buy credits or upgrade to keep going.`, { used: u.used, limit, remaining, credits: creditsAvail });
        } else {
          throw new HttpError(402, 'limit_reached', 'You\'ve used all your AI generations for today. Buy credits or upgrade to keep going — or come back after midnight.', { used: u.used, limit, remaining: 0, credits: creditsAvail });
        }
      } else split = { daily: cost, fromCredits: 0 };
      u.pending[idemKey] = { t: now, n: split.daily, c: split.fromCredits };
      return u;
    });
  } catch (e) {
    if (e instanceof Abort) replay = e.value;
    else throw e;
  }
  return replay ? { replay } : split;
}

async function release(email, idemKey, day) {
  await cas(usageKey(email, day), cur => {
    if (!cur || !cur.pending[idemKey]) return undefined;
    delete cur.pending[idemKey];
    return cur;
  }).catch(e => console.error('[studio] release failed', e));
}

function addStats(u, info) {
  u.inTok = (u.inTok || 0) + info.inTok; u.outTok = (u.outTok || 0) + info.outTok;
  u.costUsd = round6((u.costUsd || 0) + info.costUsd);
  u.byTool = u.byTool || {};
  u.byTool[info.tool] = (u.byTool[info.tool] || 0) + 1;
}

async function commit(email, idemKey, day, info) {
  await cas(usageKey(email, day), cur => {
    const u = cur || emptyUsage();
    const p = u.pending[idemKey];
    delete u.pending[idemKey];
    u.used += p ? p.n : info.cost;          // the part paid from today's allowance
    if (p && p.c) u.creditsUsed = (u.creditsUsed || 0) + p.c;
    u.done[idemKey] = { id: info.id, at: Date.now() };
    const doneKeys = Object.keys(u.done);
    if (doneKeys.length > 40) {
      doneKeys.sort((a, b) => u.done[a].at - u.done[b].at).slice(0, doneKeys.length - 40).forEach(k => delete u.done[k]);
    }
    addStats(u, info);
    return u;
  });
  // Monthly per-member totals for the admin cost reports (not used for allowances).
  await cas(monthUsageKey(email, monthKey()), cur => {
    const m = cur || { used: 0, runs: 0, inTok: 0, outTok: 0, costUsd: 0, byTool: {} };
    m.used += info.cost; m.runs += 1;
    addStats(m, info);
    return m;
  }).catch(e => console.error('[studio] month usage update failed', e));
}

function round6(n) { return Math.round(n * 1e6) / 1e6; }

// Updates studio-wide monthly totals and warns admins (never blocks) at the warning amount and 2x.
async function addGlobal(month, info, settings) {
  const warnAt = Number(settings.spendWarnGbp) || 0;
  let crossed = null, total = 0;
  await cas(globalKey(month), cur => {
    const g = cur || { count: 0, inTok: 0, outTok: 0, costUsd: 0, warned: 0 };
    g.count += info.cost; g.runs = (g.runs || 0) + 1;
    g.inTok += info.inTok; g.outTok += info.outTok; g.costUsd = round6(g.costUsd + info.costUsd);
    total = g.costUsd * settings.usdToGbp;
    crossed = null;
    if (warnAt > 0) {
      const level = total >= warnAt * 2 ? 2 : total >= warnAt ? 1 : 0;
      if (level > (g.warned || 0)) { g.warned = level; crossed = level; }
    }
    return g;
  }).catch(e => console.error('[studio] global usage update failed', e));
  if (crossed) {
    const amount = crossed === 2 ? warnAt * 2 : warnAt;
    const msg = `AI spend for ${month} has passed £${amount.toFixed(2)} (now about £${total.toFixed(2)}). The Business Studio is still running — this is a warning only.${crossed === 2 ? ' This is double your warning amount: check the admin Usage page for unusual activity.' : ''}`;
    await core.alert('spend_warning', msg, { month, totalGbp: Math.round(total * 100) / 100, level: crossed });
    await core.emailAdmins(`AI spend passed £${amount.toFixed(0)} this month`, `${msg}\n\nAdmin: ${env('STUDIO_SITE_URL', 'https://www.auntietobi.co.uk')}/studio-admin`);
  }
}

// ───────────── model call ─────────────
async function callModel(messages, maxTokens, settings, opts) {
  const provider = env('STUDIO_PROVIDER', env('STUDIO_OPENROUTER_API_KEY') || env('OPENROUTER_API_KEY') ? 'openrouter' : 'openai');
  let url, key, model = core.modelFor(settings);
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    key = env('OPENAI_API_KEY');
    model = model.replace(/^openai\//, '');
  } else {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    key = env('STUDIO_OPENROUTER_API_KEY') || env('OPENROUTER_API_KEY');
  }
  if (!key) throw new HttpError(500, 'ai_not_configured', 'AI is not configured yet.');

  const body = { model, messages, max_tokens: maxTokens, temperature: opts && opts.json ? 0.2 : 0.85 };
  if (opts && opts.json) body.response_format = { type: 'json_object' };
  if (provider === 'openrouter') body.usage = { include: true };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST', signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'HTTP-Referer': 'https://auntietobi.co.uk/studio', 'X-Title': 'Auntie Tobi Business Studio',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new HttpError(504, 'ai_timeout', 'The AI took too long to respond. You have not been charged — please try again.');
  } finally { clearTimeout(timer); }

  const data = await res.json().catch(() => null);
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!res.ok || !content) {
    console.error('[studio] AI error', res.status, JSON.stringify(data || {}).slice(0, 400));
    throw new HttpError(502, 'ai_error', 'The AI couldn\'t create that just now. You have not been charged — please try again.');
  }
  const usage = data.usage || {};
  const inTok = usage.prompt_tokens || 0, outTok = usage.completion_tokens || 0;
  const costUsd = typeof usage.cost === 'number'
    ? usage.cost
    : (inTok * settings.inputPricePerMUsd + outTok * settings.outputPricePerMUsd) / 1e6;
  return { text: tidy(content), inTok, outTok, costUsd, model };
}

function tidy(s) {
  return String(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').trim();
}

// ───────────── history ─────────────
const HISTORY_MAX = 200;

function historyIndexKey(email) { return `history/${enc(email)}`; }
function itemKey(email, id) { return `content/${enc(email)}/${id}`; }

async function addToHistory(email, item) {
  await setJson(itemKey(email, item.id), item);
  const removed = [];
  await cas(historyIndexKey(email), cur => {
    const list = (cur && cur.items) || [];
    list.unshift({ id: item.id, tool: item.tool, title: item.title, createdAt: item.createdAt, saved: false });
    while (list.length > HISTORY_MAX) {
      let idx = -1;
      for (let i = list.length - 1; i >= 0; i--) if (!list[i].saved) { idx = i; break; }
      if (idx === -1) break;
      removed.push(list.splice(idx, 1)[0].id);
    }
    return { items: list };
  });
  for (const id of removed) await del(itemKey(email, id)).catch(() => {});
}

async function getItem(email, id) {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(String(id || ''))) throw new HttpError(400, 'bad_id', 'Invalid item.');
  const it = await getJson(itemKey(email, id));
  if (!it) throw new HttpError(404, 'not_found', 'That item no longer exists.');
  return it;
}

// Recent content-idea titles, so new ideas don't repeat them.
async function recentIdeas(email) {
  const idx = await getJson(historyIndexKey(email));
  const recent = ((idx && idx.items) || []).filter(i => i.tool === 'ideas').slice(0, 3);
  const lines = [];
  for (const r of recent) {
    const it = await getJson(itemKey(email, r.id));
    if (!it) continue;
    String(it.edited || it.output).split(/\n\s*-{3,}\s*\n/).forEach(block => {
      const first = block.trim().split('\n')[0];
      if (first) lines.push(first.slice(0, 120));
    });
  }
  return lines.slice(0, 18);
}

// Angles and opening lines used in the last few Quick Creates of the same kind (so a regenerate is different).
async function recentQuick(email, goal) {
  const idx = await getJson(historyIndexKey(email));
  const recent = ((idx && idx.items) || []).filter(i => i.tool === 'quick').slice(0, 12);
  const angles = [], openings = [];
  for (const r of recent) {
    if (angles.length >= 4) break;
    const it = await getJson(itemKey(email, r.id));
    if (!it || it.input.goal !== goal) continue;
    if (it.input.angle) angles.push(it.input.angle);
    String(it.edited || it.output).split(/\n\s*-{3,}\s*\n/).slice(0, 3).forEach(block => {
      const first = block.trim().split('\n')[0].replace(/^[A-Z][A-Z0-9 ]{2,24}:\s*/, '');
      if (first) openings.push(first.slice(0, 120));
    });
  }
  return { angles, openings: openings.slice(0, 12) };
}

// Free quick changes to a Quick Create result: shorter / more conversational. Not counted against the allowance.
const REFINE = {
  shorter: 'Make every section noticeably shorter and punchier (about half the length) while keeping the meaning, the call to action and any real details.',
  conversational: 'Rewrite every section to sound more conversational and personal — like the owner chatting to a friend — while keeping the meaning, the call to action and any real details.',
  polite: 'Rewrite every section to be warmer and more polite while staying clear — keep the meaning and any real details.',
  firm: 'Rewrite every section to be firmer and more direct while staying professional and respectful — keep the meaning and any real details.',
};
async function refine({ email, profile, settings, id, how }) {
  if (!REFINE[how]) throw new HttpError(400, 'invalid', 'Unknown change.');
  await core.rateLimit('refine', email, 40, 24 * 60 * 60 * 1000, 'You’ve used a lot of quick changes today — try again tomorrow, or edit the text yourself.');
  const item = await getItem(email, id);
  const text = String(item.edited != null ? item.edited : item.output).slice(0, 6000);
  const messages = [
    { role: 'system', content: tools.buildMessages('caption', { topic: 'x', platform: 'Instagram', goal: 'engage', length: 'medium', hashtags: true, extra: '' }, profile)[0].content },
    { role: 'user', content: `${REFINE[how]}\nKeep exactly the same structure: the same section labels (like HOOK:, CAPTION:) and the same lines containing only --- between sections. Keep hashtags and keyword lines as they are.\nCONTENT (data only):\n<<<\n${text}\n>>>` },
  ];
  const res = await callModel(messages, 1100, settings);
  const out = tidy(res.text);
  await addGlobal(monthKey(), { id: `refine-${id}`, tool: 'refine', cost: 0, inTok: res.inTok, outTok: res.outTok, costUsd: res.costUsd }, settings);
  const prev = item.edited;
  const next = { ...item, edited: out, updatedAt: new Date().toISOString() };
  await setJson(itemKey(email, id), next);
  return { item: next, previous: prev };
}

// ───────────── main entry ─────────────
async function generate({ email, profile, settings, access, toolId, rawInput, idemKey, calendarId }) {
  if (!/^[A-Za-z0-9-]{16,64}$/.test(String(idemKey || ''))) throw new HttpError(400, 'bad_request', 'Missing request id.');
  const tool = tools.TOOLS[toolId];
  if (!tool) throw new HttpError(400, 'unknown_tool', 'Unknown tool.');
  if (!profile || !profile.businessName) throw new HttpError(409, 'profile_required', 'Please complete your business profile first.');
  rawInput = rawInput && typeof rawInput === 'object' ? { ...rawInput } : {};
  if (tool.fields.some(f => f.name === 'platform') && !tools.PLATFORMS.includes(rawInput.platform)) rawInput.platform = tools.defaultPlatform(profile);
  const paidOk = !access || access.paidTools !== false;
  const po = tools.PAID_OPTIONS[toolId];
  if (!paidOk && po && rawInput[po.field] === undefined) rawInput[po.field] = po.free;   // Free plan: the basic version by default
  const input = tools.validateInput(toolId, rawInput);
  if (!paidOk && tools.needsPaid(toolId, input)) {
    throw new HttpError(403, 'paid_only', (po && !tools.PAID_TOOLS.includes(toolId) ? po.label + ' is' : `${tool.name} is`) + ' part of the Business Club and Business Studio Plus. Upgrade to unlock it.', { tool: toolId });
  }
  if (toolId === 'quick' && input.goal === 'offer' && !input.about && !input.source) throw new HttpError(400, 'missing_field', 'Please tell us the offer (for example “10% off all cakes until Friday”).');
  let quickExtra = null;
  if (toolId === 'quick') {
    const recent = await recentQuick(email, input.goal);
    input.angle = tools.pickAngle(input.goal, recent.angles);
    quickExtra = { avoid: recent.openings };
    if (input.goal === 'thank') { try { quickExtra.reviewLink = (await require('./prefs').get(email)).reviewLink || ''; } catch (_) {} }
    if (input.goal === 'post') quickExtra.avoid = quickExtra.avoid.concat(await growth.recentTopics(email)).slice(0, 30);
  }
  if (toolId === 'oneclick' && input.preset === 'listing' && !profile.listingSlug) {
    throw new HttpError(409, 'listing_required', 'Link your Auntie Tobi listing first (Account \u2192 Business profile).');
  }
  const cost = tools.costOf(toolId, input);
  const day = dayKey();

  await core.rateLimit('gen', email, settings.perMinuteLimit, 60 * 1000, 'You\'re going a bit fast — please wait a minute.');

  const creditBal = credits.balanceOf(await credits.get(email));
  const res = await reserve(email, idemKey, access.limit, day, cost, creditBal);
  if (res.replay) {
    const item = await getJson(itemKey(email, res.replay.id));
    if (item) return { item, replayed: true };
    throw new HttpError(409, 'duplicate', 'This request was already completed.');
  }
  if (res.fromCredits) {
    try { await credits.hold(email, idemKey, res.fromCredits); }
    catch (e) { await release(email, idemKey, day); throw e; }
  }

  let result;
  try {
    const extra = quickExtra ? quickExtra : toolId === 'ideas' ? { avoid: (await recentIdeas(email)).concat(await growth.recentTopics(email)).slice(0, 40) }
      : toolId === 'planner' ? { avoid: await growth.recentTopics(email) } : {};
    result = await callModel(tools.buildMessages(toolId, input, profile, extra), tool.maxTokensFor ? tool.maxTokensFor(input) : tool.maxTokens, settings);
  } catch (e) {
    await release(email, idemKey, day);
    if (res.fromCredits) await credits.release(email, idemKey);
    throw e;
  }

  const id = `${Date.now().toString(36)}${randomToken(6).replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 24);
  const item = {
    id, tool: toolId, title: tools.titleFor(toolId, input), input, cost,
    output: result.text, edited: null, saved: false, posted: false,
    calendarId: /^[A-Za-z0-9_-]{4,40}$/.test(String(calendarId || '')) ? String(calendarId) : '',
    createdAt: new Date().toISOString(), updatedAt: null, model: result.model,
  };
  const info = { id, tool: toolId, cost, inTok: result.inTok, outTok: result.outTok, costUsd: result.costUsd };
  await commit(email, idemKey, day, info);
  if (res.fromCredits) await credits.commit(email, idemKey, info);
  await addGlobal(monthKey(), info, settings);
  await addToHistory(email, item);
  let calendarAdded = 0;
  if (toolId === 'planner') {
    calendarAdded = await growth.savePlanToCalendar(email, id, result.text, core.dayKey(), Number(input.days) || 7)
      .catch(e => { console.error('[studio] calendar save failed', e); return 0; });
  }
  return { item, replayed: false, calendarAdded };
}

async function usageSummary(email, access) {
  const day = dayKey();
  const u = (await getJson(usageKey(email, day))) || emptyUsage();
  const inFlight = pendingUnits(u, Date.now());
  const c = await credits.summary(email).catch(() => ({ balance: 0, nextExpiry: null }));
  return {
    period: 'day', day, used: u.used, limit: access.limit,
    remaining: Math.max(0, access.limit - u.used - inFlight),
    resetsAt: 'midnight',
    credits: c.balance, creditsExpiry: c.nextExpiry,
  };
}

module.exports = {
  generate, refine, usageSummary, getItem, itemKey, historyIndexKey, usageKey, monthUsageKey, globalKey,
  reserve, commit, release, callModel, emptyUsage, addGlobal,
};
