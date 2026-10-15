'use strict';
/*
 * Allowance-safe AI generation.
 *
 * 1. reserve()  — atomically checks the monthly allowance and holds one slot for this
 *                 request's idempotency key. Duplicate clicks with the same key replay
 *                 the earlier result instead of charging again; simultaneous requests
 *                 can't overshoot because "used + in-flight" is checked inside the CAS.
 * 2. callModel() — one OpenAI-model call with a hard output-token cap and timeout.
 * 3. commit()   — success: count 1 generation. release() — failure: nothing is charged.
 */
const core = require('./core');
const { HttpError, Abort, cas, getJson, setJson, del, enc, monthKey, randomToken, env } = core;
const tools = require('./tools');

const PENDING_STALE_MS = 3 * 60 * 1000;
const MAX_IN_FLIGHT = 2;

function usageKey(email, month) { return `usage/${month}/${enc(email)}`; }
function globalKey(month) { return `usage-global/${month}`; }

function emptyUsage() { return { used: 0, pending: {}, done: {}, inTok: 0, outTok: 0, costUsd: 0, byTool: {} }; }

async function reserve(email, idemKey, limit, month) {
  const now = Date.now();
  let replay = null;
  try {
    await cas(usageKey(email, month), cur => {
      const u = cur || emptyUsage();
      for (const [k, t] of Object.entries(u.pending)) if (now - t > PENDING_STALE_MS) delete u.pending[k];
      if (u.done[idemKey]) throw new Abort(u.done[idemKey]);
      if (u.pending[idemKey]) throw new HttpError(409, 'in_progress', 'That request is already being created — hang on a moment.');
      const inFlight = Object.keys(u.pending).length;
      if (inFlight >= MAX_IN_FLIGHT) throw new HttpError(429, 'one_at_a_time', 'Please wait for your current request to finish.');
      if (u.used + inFlight >= limit) {
        throw new HttpError(402, 'limit_reached', 'You\'ve used all your AI generations for this month.', { used: u.used, limit });
      }
      u.pending[idemKey] = now;
      return u;
    });
  } catch (e) {
    if (e instanceof Abort) replay = e.value;
    else throw e;
  }
  return replay;
}

async function release(email, idemKey, month) {
  await cas(usageKey(email, month), cur => {
    if (!cur || !cur.pending[idemKey]) return undefined;
    delete cur.pending[idemKey];
    return cur;
  }).catch(e => console.error('[studio] release failed', e));
}

async function commit(email, idemKey, month, info) {
  return cas(usageKey(email, month), cur => {
    const u = cur || emptyUsage();
    delete u.pending[idemKey];
    u.used += 1;
    u.done[idemKey] = { id: info.id, at: Date.now() };
    const doneKeys = Object.keys(u.done);
    if (doneKeys.length > 40) {
      doneKeys.sort((a, b) => u.done[a].at - u.done[b].at).slice(0, doneKeys.length - 40).forEach(k => delete u.done[k]);
    }
    u.inTok += info.inTok; u.outTok += info.outTok; u.costUsd = round6(u.costUsd + info.costUsd);
    u.byTool[info.tool] = (u.byTool[info.tool] || 0) + 1;
    return u;
  });
}

function round6(n) { return Math.round(n * 1e6) / 1e6; }

async function checkGlobalCaps(settings, month) {
  const g = (await getJson(globalKey(month))) || { count: 0, costUsd: 0 };
  const costGbp = g.costUsd * settings.usdToGbp;
  if (g.count >= settings.globalMonthlyGenerationCap || costGbp >= settings.globalMonthlyCostCapGbp) {
    await core.alert('spend_cap', 'Studio paused: monthly generation or spending cap reached', { month, count: g.count, costGbp });
    throw new HttpError(503, 'studio_paused', 'The Studio has paused new AI requests for the rest of this month. Auntie Tobi has been notified.');
  }
}

async function addGlobal(month, info) {
  await cas(globalKey(month), cur => {
    const g = cur || { count: 0, inTok: 0, outTok: 0, costUsd: 0 };
    g.count += 1; g.inTok += info.inTok; g.outTok += info.outTok; g.costUsd = round6(g.costUsd + info.costUsd);
    return g;
  }).catch(e => console.error('[studio] global usage update failed', e));
}

// ───────────── model call ─────────────
async function callModel(messages, maxTokens, settings) {
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

  const body = { model, messages, max_tokens: maxTokens, temperature: 0.8 };
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

// ───────────── main entry ─────────────
async function generate({ email, profile, settings, access, toolId, rawInput, idemKey }) {
  if (!/^[A-Za-z0-9-]{16,64}$/.test(String(idemKey || ''))) throw new HttpError(400, 'bad_request', 'Missing request id.');
  const tool = tools.TOOLS[toolId];
  if (!tool) throw new HttpError(400, 'unknown_tool', 'Unknown tool.');
  if (!profile || !profile.businessName) throw new HttpError(409, 'profile_required', 'Please complete your business profile first.');
  const input = tools.validateInput(toolId, rawInput);
  const month = monthKey();

  await core.rateLimit('gen', email, settings.perMinuteLimit, 60 * 1000, 'You\'re going a bit fast — please wait a minute.');

  const replay = await reserve(email, idemKey, access.limit, month);
  if (replay) {
    const item = await getJson(itemKey(email, replay.id));
    if (item) return { item, replayed: true };
    throw new HttpError(409, 'duplicate', 'This request was already completed.');
  }

  let result;
  try {
    await checkGlobalCaps(settings, month);
    result = await callModel(tools.buildMessages(toolId, input, profile), tool.maxTokens, settings);
  } catch (e) {
    await release(email, idemKey, month);
    throw e;
  }

  const id = `${Date.now().toString(36)}${randomToken(6).replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 24);
  const item = {
    id, tool: toolId, title: tools.titleFor(toolId, input), input,
    output: result.text, edited: null, saved: false,
    createdAt: new Date().toISOString(), updatedAt: null, model: result.model,
  };
  const info = { id, tool: toolId, inTok: result.inTok, outTok: result.outTok, costUsd: result.costUsd };
  await commit(email, idemKey, month, info);
  await addGlobal(month, info);
  await addToHistory(email, item);
  return { item, replayed: false };
}

async function usageSummary(email, access) {
  const month = monthKey();
  const u = (await getJson(usageKey(email, month))) || emptyUsage();
  const inFlight = Object.values(u.pending || {}).filter(t => Date.now() - t < PENDING_STALE_MS).length;
  return {
    month, used: u.used, limit: access.limit,
    remaining: Math.max(0, access.limit - u.used - inFlight),
    resetsOn: core.nextResetDate(),
  };
}

module.exports = {
  generate, usageSummary, getItem, itemKey, historyIndexKey, usageKey, globalKey,
  reserve, commit, release, callModel, emptyUsage,
};
