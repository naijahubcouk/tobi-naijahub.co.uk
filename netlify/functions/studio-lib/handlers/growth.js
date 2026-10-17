'use strict';
/*
 * Business growth features (free — no AI, never uses the allowance).
 * POST /.netlify/functions/studio-growth  { action, ... }
 *   home                         → today's Business Tip, goal, today's planned posts, check-in prompt
 *   tip-save {id, on} / tips-saved → save a tip / list saved tips
 *   today                        → (old) 3 daily actions — kept for older app versions
 *   action-done   { id, done }   → tick a daily action
 *   goal-set      { goal }
 *   calendar-list                → content calendar
 *   calendar-update { id, status }  (todo | drafted | posted | done)
 *   calendar-delete { id }
 *   progress-get                 → recorded numbers (last 60 days)
 *   progress-save { date, enquiries, bookings, salesCount, salesGbp, posts, note }
 *   summary                      → template-based weekly summary
 */
const core = require('../core');
const growth = require('../growth');
const tips = require('../tips');
const dailyidea = require('../dailyidea');
const { HttpError, handler } = core;
const gen = require('../generate');

// AI-written daily actions: free for members; the small cost is added to Studio spend.
function aiOpts(auth, shuffle) {
  return {
    shuffle,
    ai: (messages, maxTokens) => gen.callModel(messages, maxTokens, auth.settings, { json: true }),
    track: usage => gen.addGlobal(core.monthKey(), { id: 'daily-actions', tool: 'daily-actions', cost: 0, inTok: usage.inTok, outTok: usage.outTok, costUsd: usage.costUsd }, auth.settings),
  };
}

const plan = require('../plan');
const idOf40 = v => { const s = String(v || ''); if (!/^[A-Za-z0-9_-]{4,40}$/.test(s)) throw new HttpError(400, 'bad_id', 'Invalid card.'); return s; };

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx); // active Business Club or AI Power
  const email = auth.sess.email;
  await core.rateLimit('growth', email, 600, 60 * 60 * 1000);

  switch (body.action) {
    case 'home': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      if (!profile || !profile.businessName) throw new HttpError(409, 'profile_required', 'Please complete your business profile first.');
      const h = await growth.home(email);
      const o = aiOpts(auth, false);
      const [t, idea] = await Promise.all([
        tips.today(email, profile, {
          ai: o.ai, goal: h.goal, goalLabel: h.goal ? growth.GOALS[h.goal.goal] : '', progress: h.progress,
          track: usage => gen.addGlobal(core.monthKey(), { id: 'daily-tip', tool: 'daily-tip', cost: 0, inTok: usage.inTok, outTok: usage.outTok, costUsd: usage.costUsd }, auth.settings),
        }),
        dailyidea.today(email, profile, {
          ai: o.ai,
          track: usage => gen.addGlobal(core.monthKey(), { id: 'daily-idea', tool: 'daily-idea', cost: 0, inTok: usage.inTok, outTok: usage.outTok, costUsd: usage.costUsd }, auth.settings),
        }).catch(e => { console.error('[studio] daily idea', e && e.message); return null; }),
      ]);
      delete h.progress;
      return { ...h, tip: t.tip, savedCount: t.savedCount, idea };
    }
    case 'tip-save':
      return tips.setSaved(email, body.id, !!body.on);
    case 'tips-saved':
      return tips.listSaved(email);
    case 'today': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      if (!profile || !profile.businessName) throw new HttpError(409, 'profile_required', 'Please complete your business profile first.');
      return growth.today(email, profile, aiOpts(auth, !!body.shuffle));
    }
    case 'action-done':
      return growth.setActionDone(email, String(body.id || '').slice(0, 80), !!body.done);
    case 'goal-set':
      return { goal: await growth.setGoal(email, body.goal) };
    case 'calendar-list':
      return { items: await growth.listCalendar(email), today: core.dayKey() };
    case 'calendar-update':
      return { item: await growth.updateCalendarItem(email, String(body.id || '').slice(0, 40), body.status) };
    // ── Plan: content cards (board, calendar, posted) ──
    case 'plan-list': return { cards: await plan.list(email), today: core.dayKey() };
    case 'plan-save': return { card: await plan.save(email, body.card) };
    case 'plan-posted': return { card: await plan.posted(email, idOf40(body.id), body.link) };
    case 'plan-delete': await plan.remove(email, idOf40(body.id)); return { ok: true };
    case 'plan-img': return plan.setImage(email, idOf40(body.id), body.dataUrl);
    case 'plan-img-get': return { dataUrl: await plan.getImage(email, idOf40(body.id)) };
    case 'plan-img-delete': await plan.deleteImage(email, idOf40(body.id)); return { ok: true };
    case 'calendar-delete':
      await growth.deleteCalendarItem(email, String(body.id || '').slice(0, 40));
      return { ok: true };
    case 'progress-get': {
      const p = await growth.getProgress(email);
      const from = growth.addDays(core.dayKey(), -60);
      const entries = {};
      Object.keys(p.entries).filter(d => d >= from).forEach(d => { entries[d] = p.entries[d]; });
      return { entries, today: core.dayKey() };
    }
    case 'progress-save':
      return { entry: await growth.saveProgress(email, body.date, body) };
    case 'summary':
      return growth.summary(email);
    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 2 * 1024 * 1024 });
