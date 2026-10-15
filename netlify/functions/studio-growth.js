'use strict';
/*
 * Business growth features (free — no AI, never uses the allowance).
 * POST /.netlify/functions/studio-growth  { action, ... }
 *   today                        → 3 daily actions, goal, today's calendar items, check-in prompt
 *   action-done   { id, done }   → tick a daily action
 *   goal-set      { goal }
 *   calendar-list                → content calendar
 *   calendar-update { id, status }  (todo | drafted | posted | done)
 *   calendar-delete { id }
 *   progress-get                 → recorded numbers (last 60 days)
 *   progress-save { date, enquiries, bookings, salesCount, salesGbp, posts, note }
 *   summary                      → template-based weekly summary
 */
const core = require('./studio-lib/core');
const growth = require('./studio-lib/growth');
const { HttpError, handler } = core;

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const auth = await core.requireMember(ctx); // active Business Club or AI Power
  const email = auth.sess.email;
  await core.rateLimit('growth', email, 240, 60 * 60 * 1000);

  switch (body.action) {
    case 'today': {
      const profile = await core.getJson(`profiles/${core.enc(email)}`);
      if (!profile) throw new HttpError(409, 'profile_required', 'Please complete your business profile first.');
      return growth.today(email, profile);
    }
    case 'action-done':
      return growth.setActionDone(email, String(body.id || '').slice(0, 80), !!body.done);
    case 'goal-set':
      return { goal: await growth.setGoal(email, body.goal) };
    case 'calendar-list':
      return { items: await growth.listCalendar(email), today: core.dayKey() };
    case 'calendar-update':
      return { item: await growth.updateCalendarItem(email, String(body.id || '').slice(0, 40), body.status) };
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
});
