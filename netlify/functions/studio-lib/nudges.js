'use strict';
/*
 * Today screen helpers (free, no AI): set-up checklist, a lesson for you, and money reminders.
 */
const core = require('./core');
const { getJson, enc } = core;
const prefs = require('./prefs');
const money = require('./money');
const growth = require('./growth');
const resources = require('./resources');
const gen = require('./generate');
const fu = require('./followups');

async function forMember(email, access) {
  const club = !!(access && access.membershipActive);
  const [profile, pr, ms, goal, hist, summary] = await Promise.all([
    getJson(`profiles/${enc(email)}`), prefs.get(email), money.getSettings(email), growth.getGoal(email),
    getJson(gen.historyIndexKey(email)), growth.summary(email),
  ]);
  const learn = club ? await resources.getProgress(email) : null;
  const steps = [
    { id: 'profile', label: 'Complete your business profile', done: !!(profile && profile.businessName && profile.products), go: 'profile' },
    { id: 'brand', label: 'Add your logo and colours', done: !!(profile && (profile.hasLogo || profile.brand)), go: 'brand' },
    { id: 'money', label: 'Add your invoice details', done: !!ms, go: 'money' },
    { id: 'goal', label: 'Set a goal for this week', done: !!goal, go: 'goal' },
    club
      ? { id: 'lesson', label: 'Open your first lesson', done: !!(learn && Object.keys(learn.opened || {}).length), go: 'lesson' }
      : { id: 'create', label: 'Create your first post', done: !!(hist && hist.items && hist.items.length), go: 'create' },
    { id: 'review', label: 'Add your review link', done: !!pr.reviewLink, go: 'review' },
  ];
  const doneN = steps.filter(s => s.done).length;
  let lesson = null;
  if (club) { try { lesson = await resources.suggestLesson(email, profile, summary); } catch (e) { console.error('[studio] lesson suggestion failed', e && e.message); } }
  const f = await fu.due(email);
  const linked = new Set(f.linkedQuoteIds);
  const reminders = (await money.reminders(email)).filter(r => !(r.kind === 'quote' && linked.has(r.doc.id))).slice(0, 4);
  return {
    setup: { steps, done: doneN, total: steps.length, hidden: !!pr.setupHidden || doneN === steps.length },
    lesson,
    reminders,
    followups: f.due.slice(0, 8), followupsDue: f.due.length,
    moneySettings: ms ? { displayName: ms.displayName, bankAccountName: ms.bankAccountName, sortCode: ms.sortCode, accountNumber: ms.accountNumber } : null,
    reviewLink: pr.reviewLink || '',
  };
}

module.exports = { forMember };
