'use strict';
/*
 * ✅ "Today in HQ" — one checklist of everything waiting on Auntie Tobi, from every part of HQ.
 * Nothing is stored: each item is counted live, so it disappears by itself once it's dealt with.
 * Each part is read on its own; if one part can't be read, the rest still show.
 */
const core = require('./core');
const { getJson } = core;

const safe = async (fn, dflt) => { try { return await fn(); } catch (e) { console.error('[hqtoday]', e && e.message); return dflt; } };
const days = iso => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : 0);

async function list(email) {
  const out = [];
  const add = (o) => { if (o && o.n > 0) out.push(o); };

  // 🏪 businesses: owners who added or claimed one, and "You're listed" emails waiting for a tap
  const ab = await safe(() => require('./addbiz').hqList(), null);
  if (ab) {
    const fresh = (ab.subs || []).filter(s => s.status === 'new');
    add({ key: 'abiz', icon: '🏪', n: fresh.length, text: fresh.length === 1 ? 'business owner waiting for you to approve' : 'business owners waiting for you to approve', names: fresh.map(s => s.name || (s.biz && s.biz.name)).filter(Boolean), nav: 'abiz', btn: 'Review' });
    add({ key: 'listed', icon: '📧', n: (ab.listed || []).length, text: '“You’re listed” email' + ((ab.listed || []).length === 1 ? '' : 's') + ' ready — tap Send', names: (ab.listed || []).map(b => b.name), nav: 'abiz', btn: 'Send' });
    add({ key: 'edits', icon: '✏️', n: (ab.ownerEdits || []).length, text: 'owner change' + ((ab.ownerEdits || []).length === 1 ? '' : 's') + ' to copy to the website', names: (ab.ownerEdits || []).map(b => b.name), nav: 'abiz', btn: 'See' });
  }

  // 🔎 Business Finder: found businesses to approve or skip
  const fs = await safe(() => getJson('finder/state'), null);
  if (fs) { const nw = (fs.items || []).filter(x => x.status === 'new'); add({ key: 'finder', icon: '🔎', n: nw.length, text: 'found business' + (nw.length === 1 ? '' : 'es') + ' to approve or skip', names: nw.map(x => x.name), nav: 'find', btn: 'Check' }); }

  // 🌐 the website: pending ones to publish in DirectoryEasy, and any sync problem
  const ws = await safe(() => require('./websheet').status(), null);
  if (ws && ws.connected) {
    add({ key: 'website', icon: '🌐', n: (ws.pending || []).length, text: 'business' + ((ws.pending || []).length === 1 ? '' : 'es') + ' pending on the website — publish in your directory', names: (ws.pending || []).map(b => b.name), nav: 'find', btn: 'See' });
    if (ws.lastError) add({ key: 'webErr', icon: '⚠️', n: 1, warn: true, text: 'Website sync has a problem: ' + ws.lastError, nav: 'find', btn: 'Fix' });
    if (ws.oldScript) add({ key: 'webScript', icon: '🔧', n: 1, warn: true, text: 'Website sync needs a one-time script update', nav: 'find', btn: 'Update' });
  }

  // 🎉 event submissions
  const ev = await safe(() => require('./eventsub').list(), []);
  const evN = ev.filter(x => x.status === 'new');
  add({ key: 'events', icon: '🎉', n: evN.length, text: 'event submission' + (evN.length === 1 ? '' : 's') + ' to review', names: evN.map(x => x.title || x.name).filter(Boolean), nav: 'subs', btn: 'Review' });

  // 🛍️ marketplace listings waiting for review
  const mk = await safe(() => require('./market').all(), []);
  const mkN = mk.filter(x => x.draft && x.state === 'pending');
  add({ key: 'market', icon: '🛍️', n: mkN.length, text: 'marketplace listing' + (mkN.length === 1 ? '' : 's') + ' to review', names: mkN.map(x => (x.draft && x.draft.name) || '').filter(Boolean), nav: 'mkt', btn: 'Review' });

  // 📸 free Instagram checks to follow up (same rule as the Revamp board's "Follow up" tab)
  const ck = await safe(() => require('./igcheck').list(), []);
  const ckN = ck.filter(k => !k.clientId && (k.byHq ? (!k.sentAt || (!k.replied && days(k.sentAt) >= 3)) : !!(k.contact && !k.contacted)));
  add({ key: 'checks', icon: '📸', n: ckN.length, text: 'free Instagram check' + (ckN.length === 1 ? '' : 's') + ' to follow up', names: ckN.map(k => (k.to && k.to.name) || k.biz || k.handle).filter(Boolean), nav: 'glow', btn: 'Follow up' });

  // 📣 Discovery posts made but not posted yet
  const dp = await safe(() => require('./discovery').list(), []);
  const dpN = dp.filter(p => p.status !== 'posted');
  add({ key: 'disc', icon: '📣', n: dpN.length, text: 'Discovery post' + (dpN.length === 1 ? '' : 's') + ' ready but not posted', nav: 'disc', btn: 'Open' });

  // 📰 this week's Sunday Update
  const sun = await safe(() => require('./sunday').forHq(), null);
  if (sun) {
    const st = sun.issue ? sun.issue.status : '', L = new Date().toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/London' });
    const close = /Thursday|Friday|Saturday|Sunday/.test(L);
    if (st !== 'sent' && st !== 'sending') {
      if (!sun.issue) { if (close) add({ key: 'sunday', icon: '📰', n: 1, text: 'This Sunday’s Update isn’t made yet', nav: 'sun', btn: 'Make it' }); }
      else if (st !== 'approved') add({ key: 'sunday', icon: '📰', n: 1, text: 'This Sunday’s Update is a draft — check it and approve it', nav: 'sun', btn: 'Open' });
    }
  }

  // ⏰ scheduled Ask Auntie results waiting to be read
  if (email) { const n = await safe(() => require('./askchat').unseenCount(email), 0); add({ key: 'sched', icon: '⏰', n, text: 'scheduled Ask Auntie result' + (n === 1 ? '' : 's') + ' ready to read', nav: 'chat', btn: 'Read' }); }

  return { items: out, at: core.nowIso() };
}

module.exports = { list };
