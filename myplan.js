/*
 * 💚 My Plan — the everyday planner inside the Auntie Tobi app (free for everyone).
 *   • Today card at the top of Home (your day + a gentle "New: My Plan" line until they try it)
 *   • 📋 Plan: one list of "things to remember" — quick typing ("Pay rent every 1st"), repeats, notes, a short checklist,
 *     🗂️ UK life dates (passport, eVisa, MOT…) with official links, 📅 add to phone calendar
 *   • Sign in with an email code (no password) to save: the same Auntie Tobi account style as Business Studio.
 *     Before signing in, what they add is kept on this phone and saved to their account when they sign in.
 *   Server: /.netlify/functions/my-plan   Stage 2 adds 🎉 Celebrations, 📰 Sunday Update; Stage 3 🛒 Shopping.
 */
(function () {
  'use strict';
  var API = '/.netlify/functions/my-plan', KEY = 'tobi_myplan', SEEN = 'tobi_myplan_seen', HIDE = 'tobi_myplan_hide_new';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var gt = function (name, p) { try { if (typeof gtag !== 'undefined') gtag('event', name, Object.assign({ event_category: 'my_plan' }, p || {})); } catch (e) {} };

  // ───── state (kept on this phone too, so it opens instantly and works offline) ─────
  var P = (function () { try { return JSON.parse(ls.get(KEY) || '{}'); } catch (e) { return {}; } })();
  P.items = Array.isArray(P.items) ? P.items : []; P.lists = Array.isArray(P.lists) ? P.lists : [];
  var dirtyL = {}, dirty = {}, syncT = null, syncing = false, view = { tab: 'plan', showDone: false };
  function store() { ls.set(KEY, JSON.stringify({ items: P.items, lists: P.lists, signedIn: !!P.signedIn, email: P.email || '', name: P.name || '', town: P.town || '', news: !!P.news, rm: P.rm || '', sun: P.sun || null })); }
  var live = function () { return P.items.filter(function (i) { return !i.del; }); };

  function api(action, body) {
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Studio': '1' }, body: JSON.stringify(Object.assign({ action: action }, body || {})) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.message || 'Something went wrong — please try again.'); e.code = j.error; e.status = r.status; throw e; } return j; }); });
  }
  function mergeLists(lists) {
    var map = {}; (P.lists || []).forEach(function (l) { map[l.id] = l; });
    (lists || []).forEach(function (l) { var o = map[l.id]; if (!o || (l.up || 0) >= (o.up || 0)) map[l.id] = l; });
    P.lists = Object.keys(map).map(function (k) { return map[k]; });
  }
  function mergeIn(items) {
    var map = {}; P.items.forEach(function (i) { map[i.id] = i; });
    (items || []).forEach(function (i) { var o = map[i.id]; if (!o || (i.up || 0) >= (o.up || 0)) map[i.id] = i; });
    P.items = Object.keys(map).map(function (k) { return map[k]; });
  }
  function change(it) { it.up = Date.now(); dirty[it.id] = 1; store(); if (P.signedIn) { clearTimeout(syncT); syncT = setTimeout(sync, 700); } refresh(); }
  function sync() {
    if (!P.signedIn || syncing) return;
    if (!Object.keys(dirty).length && !Object.keys(dirtyL).length) return;
    var send = P.items.filter(function (i) { return dirty[i.id]; }), sendL = (P.lists || []).filter(function (l) { return dirtyL[l.id]; }); dirty = {}; dirtyL = {}; syncing = true;
    api('save', { items: send, lists: sendL }).then(function (r) { syncing = false; mergeIn(r.items); mergeLists(r.lists); store(); if (window._currentPage === 'myplan' && view.tab === 'shop' && !document.activeElement.matches('#shQ')) render(); if (Object.keys(dirty).length || Object.keys(dirtyL).length) sync(); })
      .catch(function (e) { syncing = false; send.forEach(function (i) { dirty[i.id] = 1; }); sendL.forEach(function (l) { dirtyL[l.id] = 1; }); if (e.status === 401) { P.signedIn = false; store(); refresh(); } else setTimeout(sync, 15000); });
  }
  function boot() {
    api('me').then(function (r) {
      if (r.signedIn) { P.signedIn = true; P.email = r.email; P.name = r.name; P.town = r.town; P.news = r.news; P.rm = r.rm || ''; var local = P.items, localL = P.lists || []; P.items = []; P.lists = []; mergeIn(r.items); mergeLists(r.lists); local.forEach(function (i) { var s = P.items.filter(function (x) { return x.id === i.id; })[0]; if (!s || (i.up || 0) > (s.up || 0)) { mergeIn([i]); dirty[i.id] = 1; } }); localL.forEach(function (l) { var s = P.lists.filter(function (x) { return x.id === l.id; })[0]; if (!s || (l.up || 0) > (s.up || 0)) { mergeLists([l]); dirtyL[l.id] = 1; } }); sync(); }
      else if (P.signedIn) { P.signedIn = false; }
      store(); refresh();
    }).catch(function () {});
    api('sunday-latest').then(function (r) { P.sun = r.latest ? { latest: r.latest, past: r.past } : null; store(); refresh(); }).catch(function () {});
  }

  // ───── dates ─────
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var fromIso = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  var today = function () { return iso(new Date()); };
  var addDays = function (s, n) { var d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  function addMonths(s, n, dom) { var d = fromIso(s), want = dom || d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(want, last)); return iso(d); }
  function next(it) { var d = it.d; if (it.rep === 'd') return addDays(d, 1); if (it.rep === 'w') return addDays(d, 7); if (it.rep === 'm') return addMonths(d, 1, it.dom); if (it.rep === 'y') return addMonths(d, 12, it.dom); return d; }
  function nice(s, long) {
    if (!s) return ''; var t = today(); if (s === t) return 'Today'; if (s === addDays(t, 1)) return 'Tomorrow'; if (s === addDays(t, -1)) return 'Yesterday';
    var d = fromIso(s), diff = Math.round((d - fromIso(t)) / 864e5);
    if (diff > 0 && diff < 7 && !long) return cap(DAYS[d.getDay()]).slice(0, 3);
    return d.getDate() + ' ' + cap(MONTHS[d.getMonth()]).slice(0, 3) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  }
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  function niceTime(tm) { if (!tm) return ''; var h = +tm.slice(0, 2), m = tm.slice(3); return (h % 12 || 12) + (m !== '00' ? ':' + m : '') + (h < 12 ? 'am' : 'pm'); }
  var REP = { '': 'Doesn’t repeat', d: 'Every day', w: 'Every week', m: 'Every month', y: 'Every year' };

  // ✏️ quick typing: "Pay rent every 1st", "Dentist Friday 4:30pm", "MOT 12 April", "Bins every Tuesday"
  function parse(text) {
    var s = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ', out = { d: '', tm: '', rep: '' }, t = today(), m;
    var cut = function (re) { s = s.replace(re, ' '); };
    var ord = '(\\d{1,2})(?:st|nd|rd|th)?';
    // time
    if ((m = s.match(/\s(?:at\s)?(\d{1,2})(?::|\.)?(\d{2})?\s?(am|pm)\s/i))) { var h = +m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0); if (+m[1] <= 12) { out.tm = pad(h) + ':' + (m[2] || '00'); cut(m[0]); } }
    else if ((m = s.match(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)\s/))) { out.tm = pad(+m[1]) + ':' + m[2]; cut(m[0]); }
    else if ((m = s.match(/\s(noon|midday)\s/i))) { out.tm = '12:00'; cut(m[0]); }
    // repeats
    if ((m = s.match(/\s(every\s?day|daily)\s/i))) { out.rep = 'd'; out.d = t; cut(m[0]); }
    else if ((m = s.match(new RegExp('\\s(?:every|each)\\s(' + DAYS.join('|') + ')s?\\s', 'i')))) { out.rep = 'w'; out.d = nextDow(DAYS.indexOf(m[1].toLowerCase()), true); cut(m[0]); }
    else if ((m = s.match(/\s(every\s?week|weekly)\s/i))) { out.rep = 'w'; out.d = t; cut(m[0]); }
    else if ((m = s.match(new RegExp('\\s(?:on\\s)?(?:the\\s)?' + ord + '\\s(?:of\\s)?(?:every|each)\\smonth\\s', 'i')) || s.match(new RegExp('\\s(?:every|each)\\s(?:month\\s(?:on\\s)?(?:the\\s)?)?' + ord + '(?:\\sof\\s(?:the|every|each)\\smonth)?\\s', 'i')))) { var dd = +m[1]; if (dd >= 1 && dd <= 31) { out.rep = 'm'; out.dom = dd; var c = fromIso(t); var cand = addMonths(iso(new Date(c.getFullYear(), c.getMonth(), 1, 12)), 0, dd); out.d = cand < t ? addMonths(cand, 1, dd) : cand; cut(m[0]); } }
    else if ((m = s.match(/\s(every\s?month|monthly)\s/i))) { out.rep = 'm'; out.d = t; cut(m[0]); }
    else if ((m = s.match(/\s(every\s?year|yearly|annually)\s/i))) { out.rep = 'y'; out.d = out.d || t; cut(m[0]); }
    // dates
    if (!out.d || out.rep === 'y') {
      var mon = '(' + MONTHS.map(function (x) { return x.slice(0, 3) + '(?:' + x.slice(3) + ')?'; }).join('|') + ')\\.?';
      var yr = '(?:,?\\s(\\d{4}))?';
      if ((m = s.match(/\s(today|tonight)\s/i))) { out.d = t; if (/tonight/i.test(m[1]) && !out.tm) out.tm = '19:00'; cut(m[0]); }
      else if ((m = s.match(/\s(tomorrow|tmrw|tmr)\s/i))) { out.d = addDays(t, 1); cut(m[0]); }
      else if ((m = s.match(/\snext\sweek\s/i))) { out.d = addDays(t, 7); cut(m[0]); }
      else if ((m = s.match(/\sin\s(\d{1,2})\s(day|week|month)s?\s/i))) { var n = +m[1]; out.d = /day/i.test(m[2]) ? addDays(t, n) : /week/i.test(m[2]) ? addDays(t, 7 * n) : addMonths(t, n); cut(m[0]); }
      else if ((m = s.match(new RegExp('\\s(?:on\\s)?(?:the\\s)?' + ord + '\\s(?:of\\s)?' + mon + yr + '\\s', 'i')))) { out.d = mkDate(+m[1], monIdx(m[2]), m[3]); cut(m[0]); }
      else if ((m = s.match(new RegExp('\\s(?:on\\s)?' + mon + '\\s' + ord + yr + '\\s', 'i')))) { out.d = mkDate(+m[2], monIdx(m[1]), m[3]); cut(m[0]); }
      else if ((m = s.match(/\s(?:on\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/))) { out.d = mkDate(+m[1], +m[2] - 1, m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : ''); cut(m[0]); }
      else if ((m = s.match(new RegExp('\\s(?:on\\s|this\\s|next\\s)?(' + DAYS.join('|') + '|' + DAYS.map(function (x) { return x.slice(0, 3); }).join('|') + ')\\s', 'i')))) { var di = DAYS.map(function (x) { return x.slice(0, 3); }).indexOf(m[1].toLowerCase().slice(0, 3)); out.d = nextDow(di, true); if (/next\s/i.test(m[0]) && out.d === t) out.d = addDays(t, 7); cut(m[0]); }
      if (out.rep === 'y' && out.d) out.dom = fromIso(out.d).getDate();
    }
    if (out.tm && !out.d) out.d = out.tm < new Date().toTimeString().slice(0, 5) ? addDays(t, 1) : t;
    out.t = s.replace(/\s(on|at|by|due)\s*$/i, ' ').replace(/^\s*(remind me to|remember to|i need to|need to)\s/i, ' ').replace(/\s+/g, ' ').trim().replace(/[,\-–]+$/, '').trim();
    out.t = out.t.charAt(0).toUpperCase() + out.t.slice(1);
    return out;
  }
  function monIdx(s) { return MONTHS.map(function (x) { return x.slice(0, 3); }).indexOf(String(s).toLowerCase().slice(0, 3)); }
  function mkDate(d, mo, y) {
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return '';
    var t = today(), now = new Date(), yy = y ? +y : now.getFullYear(), r = iso(new Date(yy, mo, Math.min(d, new Date(yy, mo + 1, 0).getDate()), 12));
    if (!y && r < t) r = iso(new Date(yy + 1, mo, Math.min(d, new Date(yy + 1, mo + 1, 0).getDate()), 12));
    return r;
  }
  function nextDow(di, incToday) { var d = new Date(); d.setHours(12); var diff = (di - d.getDay() + 7) % 7; if (!diff && !incToday) diff = 7; d.setDate(d.getDate() + diff); return iso(d); }

  // ───── 🗂️ UK life dates (the person sets the date — Auntie Tobi never guesses deadlines) ─────
  var LIFE = [
    { k: 'ukpass', e: '🛂', t: 'UK passport expires', ask: 'When does it expire?', lead: 90, ck: ['Check the expiry date on your passport', 'Get a digital photo (or a code from a photo shop)', 'Renew online'], link: ['Renew your passport — GOV.UK', 'https://www.gov.uk/renew-adult-passport'], note: 'Start early, especially before you travel.' },
    { k: 'ngpass', e: '🇳🇬', t: 'Nigerian passport expires', ask: 'When does it expire?', lead: 180, ck: ['Check the requirements', 'Book your appointment', 'Gather your documents and payment'], link: ['Nigeria High Commission London — e-passport', 'https://nigeriahc.org.uk/requirements-for-e-passport'], note: 'Renewal can take a while — start early.' },
    { k: 'evisa', e: '📄', t: 'Visa / eVisa expires', ask: 'When does your permission end?', lead: 90, ck: ['Check your eVisa and expiry date', 'Check what you need for your next application', 'Get advice if you’re unsure'], link: ['View your eVisa — GOV.UK', 'https://www.gov.uk/view-prove-immigration-status'], note: 'Check the rules for your visa on GOV.UK or with an adviser.' },
    { k: 'licence', e: '🪪', t: 'Driving licence photocard expires', ask: 'Expiry date on your photocard (4b)', lead: 60, ck: ['Check date 4b on your photocard', 'Renew online'], link: ['Renew your driving licence — GOV.UK', 'https://www.gov.uk/renew-driving-licence'] },
    { k: 'mot', e: '🚗', t: 'MOT due', ask: 'When does your MOT run out?', lead: 28, ck: ['Book an MOT test', 'Check your MOT history'], link: ['Getting an MOT — GOV.UK', 'https://www.gov.uk/getting-an-mot'], note: 'You can usually get your MOT up to a month (minus a day) early and keep the same renewal date.' },
    { k: 'cartax', e: '🧾', t: 'Car tax due', ask: 'When is it due?', lead: 7, rep: 'y', ck: ['Have your V5C or reminder letter ready', 'Tax your vehicle'], link: ['Vehicle tax — GOV.UK', 'https://www.gov.uk/vehicle-tax'] },
    { k: 'carins', e: '🛡️', t: 'Car insurance renewal', ask: 'When does your policy renew?', lead: 21, rep: 'y', ck: ['Compare quotes before it renews', 'Check your renewal letter'] },
    { k: 'homeins', e: '🏠', t: 'Home / contents insurance renewal', ask: 'When does your policy renew?', lead: 21, rep: 'y', ck: ['Compare quotes before it renews'] },
    { k: 'tv', e: '📺', t: 'TV licence renewal', ask: 'When is it due?', lead: 7, rep: 'y', ck: ['Renew or pay'], link: ['TV Licensing', 'https://www.tvlicensing.co.uk'] },
    { k: 'ctax', e: '🏛️', t: 'Council tax payment', ask: 'Date of your next payment', lead: 0, rep: 'm', link: ['Council tax — GOV.UK', 'https://www.gov.uk/council-tax'] },
    { k: 'sa', e: '💷', t: 'Self Assessment tax return', ask: 'Your deadline', lead: 30, rep: 'y', ck: ['Gather your income and expenses', 'Sign in to HMRC online', 'Submit and pay'], link: ['Self Assessment deadlines — GOV.UK', 'https://www.gov.uk/self-assessment-tax-returns/deadlines'], note: 'Check the deadlines on GOV.UK.' },
    { k: 'boiler', e: '🔥', t: 'Boiler service', ask: 'When is it due?', lead: 14, rep: 'y', ck: ['Book a Gas Safe engineer'] },
    { k: 'school', e: '🏫', t: 'School dates', school: true },
  ];

  // ───── styles ─────
  var CSS = '.mp{font-family:inherit;color:#0F1E36}.mp *{box-sizing:border-box}' +
    '.mp-card{background:#fff;border-radius:14px;padding:14px;border:1.5px solid #eee7d6;margin-bottom:10px}' +
    '.mp-today{border:2px solid #FFB81C;background:#fff}.mp-h{font-size:15.5px;font-weight:700;color:#0F1E36;line-height:1.35}.mp-sub{font-size:12.5px;color:#6B7280;margin-top:3px}' +
    '.mp-lbl{font-size:11.5px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 4px}.mp-lbl.red{color:#B42318}' +
    '.mp-it{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1ece0;font-size:14.5px;cursor:pointer}.mp-it:last-child{border-bottom:0}' +
    '.mp-ck{width:24px;height:24px;flex-shrink:0;border:2px solid #057A44;border-radius:7px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:900;padding:0}' +
    '.mp-ck.on{background:#057A44}.mp-it .tx{flex:1;min-width:0;overflow-wrap:anywhere}.mp-it .tx small{display:block;font-size:12px;color:#6B7280;margin-top:1px}.mp-it.dn .tx{color:#9CA3AF;text-decoration:line-through}' +
    '.mp-it .r{font-size:12.5px;color:#6B7280;white-space:nowrap;text-align:right}.mp-it .r.red{color:#B42318;font-weight:700}.mp-chip{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:8px;background:#E3F2EA;color:#057A44;margin-left:5px;vertical-align:1px}' +
    '.mp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.mp-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;background:#057A44;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2}' +
    '.mp-btn.g{background:#fff;color:#057A44;border:1.5px solid #057A44}.mp-btn.y{background:#FFB81C;color:#0F1E36}.mp-btn.n{background:#0F1E36}.mp-btn.l{background:none;color:#B42318;padding:10px 6px}.mp-btn:disabled{opacity:.6}' +
    '.mp-new{display:flex;align-items:center;gap:10px;background:#E9F6EF;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:13.5px;line-height:1.45}.mp-new b{color:#057A44}.mp-new .x{background:none;border:0;font-size:18px;color:#6B7280;cursor:pointer;padding:0 4px}' +
    '.mp-top{background:linear-gradient(135deg,#057A44,#0F1E36);color:#fff;border-radius:14px;padding:16px;margin-bottom:10px}.mp-top b{font-size:19px;display:block}.mp-top span{font-size:13px;opacity:.88}' +
    '.mp-tabs{display:flex;background:#fff;border-radius:12px;padding:4px;margin-bottom:10px;border:1.5px solid #eee7d6;gap:4px}.mp-tabs button{flex:1;border:0;background:none;border-radius:9px;padding:9px 2px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#0F1E36}.mp-tabs button.on{background:#057A44;color:#fff}.mp-tabs button .soon{display:block;font-size:10px;font-weight:600;opacity:.7}' +
    '.mp-add{display:flex;gap:8px;margin-bottom:10px}.mp-add input{flex:1;min-width:0;border:1.5px solid #057A44;border-radius:12px;padding:12px 13px;font-size:15px;font-family:inherit;background:#fff}.mp-add input:focus{outline:2px solid #FFB81C}' +
    '.mp-hint{font-size:12.5px;color:#057A44;background:#E9F6EF;border-radius:10px;padding:7px 10px;margin:-4px 0 10px;display:none}' +
    '.mp-warn{background:#FFF4D6;border:1.5px solid #FFB81C;border-radius:12px;padding:11px 13px;font-size:13.5px;margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
    '.mp-ov{position:fixed;inset:0;background:rgba(15,30,54,.55);z-index:9998;display:flex;align-items:flex-end;justify-content:center}.mp-sh{background:#FBF8F1;width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:18px 16px 22px;font-family:inherit;color:#0F1E36}' +
    '@media(min-width:700px){.mp-ov{align-items:center}.mp-sh{border-radius:20px}}.mp-sh h3{margin:0 0 4px;font-size:18px}.mp-sh label{display:block;font-size:12.5px;font-weight:700;color:#4B5563;margin:12px 0 4px}' +
    '.mp-sh input,.mp-sh select,.mp-sh textarea{width:100%;border:1.5px solid #e2dccc;border-radius:10px;padding:11px 12px;font-size:15px;font-family:inherit;background:#fff;color:#0F1E36}.mp-sh textarea{min-height:70px}.mp-two{display:flex;gap:8px}.mp-two>*{flex:1;min-width:0}' +
    '.mp-err{color:#B42318;font-size:13px;margin-top:8px;display:none}.mp-life{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mp-life button{background:#fff;border:1.5px solid #e2dccc;border-radius:12px;padding:11px 10px;text-align:left;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;color:#0F1E36}.mp-life button span{font-size:19px;display:block;margin-bottom:3px}' +
    '.mp-cl{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:14px}.mp-cl input[type=checkbox]{width:20px;height:20px;accent-color:#057A44;flex-shrink:0}.mp-link{display:block;color:#057A44;font-weight:700;font-size:13.5px;margin-top:8px}' +
    '.mp-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#0F1E36;color:#fff;border-radius:12px;padding:11px 14px;font-size:14px;z-index:9999;display:flex;gap:12px;align-items:center;max-width:92vw;box-shadow:0 6px 20px rgba(0,0,0,.25)}.mp-toast button{background:none;border:0;color:#FFB81C;font-weight:800;font-size:14px;cursor:pointer}' +
    '.mp-empty{text-align:center;padding:18px 8px;color:#4B5563;font-size:14.5px;line-height:1.55}.mp-empty b{display:block;font-size:16px;color:#0F1E36;margin-bottom:4px}' +
    '.mp-welcome{display:grid;gap:8px;margin-top:12px}.mp-welcome button{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid #e2dccc;border-radius:14px;padding:14px;font-family:inherit;font-size:15px;font-weight:700;text-align:left;cursor:pointer;color:#0F1E36}.mp-welcome button span{font-size:22px}.mp-welcome button small{display:block;font-weight:500;color:#6B7280;font-size:12.5px}.mp-welcome button:disabled{opacity:.55;cursor:default}' +
    '.mpT{border-radius:18px;overflow:hidden;background:#fff;border:1px solid #E8E3D6;box-shadow:0 2px 8px rgba(15,30,54,.05);margin-bottom:10px;color:#0F1E36}' +
    '.mpT-top{padding:14px 14px 0}.mpT-bub{background:#EEF7F1;border-radius:16px;padding:12px 14px;font-size:15px;line-height:1.45;color:#1F2937}.mpT-h{font-size:18px;font-weight:800;color:#0F1E36;margin-bottom:3px}' +
    '.mpT-mo{display:block;width:100%;text-align:left;font-family:inherit;cursor:pointer;margin-top:8px;background:#FBF8F0;border:0;border-left:3px solid #FFB81C;border-radius:8px;padding:9px 11px;font-size:14px;color:#4B4232;font-style:italic;line-height:1.45}' +
    '.mpT-name{display:inline-block;margin-top:8px;background:#FFB81C;color:#0F1E36;border-radius:20px;padding:5px 11px;font-size:13px;font-weight:800;font-style:normal;text-decoration:none}' +
    '.mpT-date{font-size:13px;color:#6B7280;margin:9px 4px 0}.mpT-top:last-child{padding-bottom:14px}' +
    '.mpT-body{padding:8px 14px 16px}.mpT-lbl{font-size:11.5px;font-weight:800;letter-spacing:.6px;color:#6B7280;text-transform:uppercase;margin:6px 4px 8px}' +
    '.mpT-row{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:14px;background:#F6FAF7;margin-bottom:8px;font-size:15px;font-weight:600;cursor:pointer;flex-wrap:wrap}' +
    '.mpT-t{flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.3}.mpT-t small{display:block;font-size:12.5px;font-weight:500;color:#6B7280;margin-top:2px}' +
    '.mpT-ic{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);flex-shrink:0;border:0;padding:0;font-family:inherit}' +
    '.mpT-ck{border:2.5px solid #057A44;box-shadow:none;cursor:pointer;font-size:16px}.mpT-ck:hover{background:#E3F2EA}' +
    '.mpT-r{margin-left:auto;font-size:12.5px;font-weight:800;color:#057A44;background:#E3F2EA;border-radius:20px;padding:4px 10px;white-space:nowrap}' +
    '.mpT-late .mpT-r{background:#FDE2E1;color:#B42318}.mpT-shop{background:#FFF8E6}.mpT-shop .mpT-r{background:#FFE7A8;color:#7A5300}.mpT-news{background:#EAF0FB}.mpT-news .mpT-r{background:#D6E2F8;color:#1D3D7A}' +
    '.mpT-cel{background:#FFF1F5;border:1.5px solid #FBCFE0}.mpT-cel .mpT-r{background:#FBD5E3;color:#9B1C4B}' +
    '.mpT-big{background:linear-gradient(135deg,#FFB81C,#FF8A3D);padding:14px;cursor:default}.mpT-big .mpT-t{font-size:16.5px;font-weight:800}.mpT-big .mpT-t small{color:#4a3500}.mpT-big .mpT-ic{background:rgba(255,255,255,.7)}' +
    '.mpT-mini{width:100%;display:flex;gap:8px}.mpT-mini>*{flex:1;text-align:center;border-radius:10px;padding:10px 6px;font-size:13.5px;font-weight:800;text-decoration:none;font-family:inherit;cursor:pointer;border:0}' +
    '.mpT-mc{background:#FFB81C;color:#0F1E36}.mpT-md{background:#fff;color:#9B1C4B;border:1.5px solid #FBCFE0 !important}.mpT-big .mpT-mc{background:#0F1E36;color:#fff}.mpT-big .mpT-md{color:#0F1E36;border-color:#fff !important}' +
    '.mpT-more{font-size:12.5px;color:#6B7280;margin:-2px 4px 8px}.mpT-x{background:none;border:0;font-size:18px;color:#6B7280;cursor:pointer;padding:0 4px}' +
    '.mpT-btns{display:flex;gap:8px;margin-top:10px}.mpT-btns button{border:0;border-radius:12px;padding:13px 16px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit}.mpT-b1{flex:1;background:#057A44;color:#fff}.mpT-b2{background:#FFB81C;color:#0F1E36}' +
    '.pill .mp-newtag{background:#FFB81C;color:#0F1E36;font-size:9.5px;font-weight:800;border-radius:6px;padding:1px 4px;margin-left:4px;vertical-align:1px}';
  function addCss() { if (document.getElementById('mpCss')) return; var st = document.createElement('style'); st.id = 'mpCss'; st.textContent = CSS; document.head.appendChild(st); }

  // ───── small UI helpers ─────
  function toast(msg, undo) {
    var old = document.querySelector('.mp-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'mp-toast'; t.innerHTML = '<span>' + msg + '</span>' + (undo ? '<button>Undo</button>' : '');
    document.body.appendChild(t); if (undo) t.querySelector('button').onclick = function () { t.remove(); undo(); };
    setTimeout(function () { t.remove(); }, undo ? 6000 : 3000);
  }
  function sheet(html) {
    addCss(); var o = document.createElement('div'); o.className = 'mp-ov mp'; o.innerHTML = '<div class="mp-sh" role="dialog" aria-modal="true">' + html + '</div>';
    o.onclick = function (e) { if (e.target === o) o.remove(); }; document.body.appendChild(o); return o;
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var newId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  // ───── items ─────
  function add(fields, quiet) {
    var it = Object.assign({ id: newId(), t: '', d: '', tm: '', rep: '', note: '', done: false, doneAt: '', last: '', ck: [], lk: '', src: '' }, fields);
    if (it.rep && !it.d) it.d = today();
    if (it.rep === 'm' || it.rep === 'y') it.dom = it.dom || (it.d ? fromIso(it.d).getDate() : 0);
    P.items.push(it); change(it); gt('plan_add', { kind: it.lk ? 'life' : it.src || 'item' });
    if (!quiet) toast('✅ Added' + (it.d ? ' for ' + nice(it.d, true) : ''));
    if (!P.signedIn) setTimeout(askSave, 600);
    return it;
  }
  function tick(id) {
    var it = P.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    var before = JSON.parse(JSON.stringify(it));
    if (it.cel && it.d) { it.cel.sent = (it.cel.sent || []).concat([+it.d.slice(0, 4)]); it.last = it.d; it.d = next(it); toast('🎉 Done — Auntie Tobi will remind you again next year', function () { Object.assign(it, before); change(it); }); gt('cel_done'); change(it); return; }
    if (it.rep && it.d) { it.last = it.d; var n = next(it); while (n < today() && it.rep === 'd') { it.d = n; n = next(it); } it.d = n; it.ck = (it.ck || []).map(function (c) { return { t: c.t, x: false }; }); toast('✅ Done — next: ' + nice(it.d, true), function () { Object.assign(it, before); change(it); }); }
    else { it.done = !it.done; it.doneAt = it.done ? today() : ''; if (it.done) toast('✅ Done', function () { Object.assign(it, before); change(it); }); }
    gt('plan_tick'); change(it);
  }
  function remove(id) {
    var it = P.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    it.del = true; change(it); toast('🗑️ Deleted', function () { it.del = false; change(it); });
  }
  function groups() {
    var t = today(), wk = addDays(t, 7), g = { over: [], today: [], week: [], later: [], none: [], done: [] };
    live().forEach(function (i) {
      if (i.cel && !celSoon(i)) return;
      if (i.done) return g.done.push(i);
      if (!i.d) return g.none.push(i);
      if (i.d < t) g.over.push(i); else if (i.d === t) g.today.push(i); else if (i.d <= wk) g.week.push(i); else g.later.push(i);
    });
    var by = function (a, b) { return (a.d + (a.tm || '99')).localeCompare(b.d + (b.tm || '99')); };
    ['over', 'today', 'week', 'later'].forEach(function (k) { g[k].sort(by); });
    g.none.sort(function (a, b) { return (b.up || 0) - (a.up || 0); }); g.done.sort(function (a, b) { return String(b.doneAt).localeCompare(String(a.doneAt)); });
    return g;
  }
  function row(i, opts) {
    opts = opts || {}; var t = today(), late = i.d && i.d < t && !i.done;
    if (i.cel) return '<div class="mp-it" data-open="' + i.id + '"><button class="mp-ck" data-tick="' + i.id + '" aria-label="Done"></button><div class="tx">' + celEmoji(i) + ' ' + esc(i.t) + (celNum(i) ? '<small>' + celNum(i) + '</small>' : '') + '</div><div class="r" style="color:#057A44;font-weight:700">' + countdown(i.d) + '</div></div>';
    var sub = [i.tm ? niceTime(i.tm) : '', i.ck && i.ck.length ? '☑️ ' + i.ck.filter(function (c) { return c.x; }).length + '/' + i.ck.length : '', i.note ? '📝' : ''].filter(Boolean).join(' · ');
    return '<div class="mp-it' + (i.done ? ' dn' : '') + '" data-open="' + i.id + '"><button class="mp-ck' + (i.done ? ' on' : '') + '" data-tick="' + i.id + '" aria-label="Done">' + (i.done ? '✓' : '') + '</button>' +
      '<div class="tx">' + esc(i.t) + (i.rep ? '<span class="mp-chip">🔁 ' + { d: 'daily', w: 'weekly', m: 'monthly', y: 'yearly' }[i.rep] + '</span>' : '') + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
      (opts.noDate ? '' : '<div class="r' + (late ? ' red' : '') + '">' + (i.done ? '' : esc(i.d ? (i.d === t && i.tm ? niceTime(i.tm) : nice(i.d)) : '')) + '</div>') + '</div>';
  }
  function bindRows(root) {
    root.querySelectorAll('[data-tick]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); tick(b.dataset.tick); }; });
    root.querySelectorAll('[data-open]').forEach(function (r) { r.onclick = function () { edit(r.dataset.open); }; });
  }

  // ───── 🏠 Today card on Home ─────
  // ───── 🏠 Today card on Home — design A "Sunrise" ─────
  function greet() { var h = new Date().getHours(); return h < 12 ? ['☀️', 'Good morning'] : h < 17 ? ['🌤️', 'Good afternoon'] : ['🌙', 'Good evening']; }
  // 💬 a warm, personal line under the greeting — changes with the day and what's on
  function hello(dueN, cels, t) {
    var d = new Date(), h = d.getHours(), wd = d.getDay(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    var pick = function (a) { return a[doy % a.length]; };
    var tday = cels.filter(function (i) { return i.d === t; })[0];
    if (tday) return '🎉 A special day — don’t forget to make ' + esc(tday.t.replace(/[’']s .*$/, '')) + ' smile today!';
    var near = cels.filter(function (i) { return daysTo(i.d) <= 3; })[0];
    if (near) { var n = daysTo(near.d); return '🎂 ' + esc(near.t) + ' is ' + (n === 1 ? 'tomorrow' : 'in ' + n + ' days') + ' — I’ve got a card ready for you.'; }
    if (dueN === 1) return '💚 Just one thing on your list today — you’ve got this.';
    if (dueN > 1) return '💚 You’ve got ' + dueN + ' things today. One step at a time — I’m here to help.';
    if (wd === 1 && h < 17) return pick(['💪🏾 New week, fresh start. Let’s make it a good one!', '☕ Monday again! Take it easy and go gently.']);
    if (wd === 5) return pick(['🎉 Happy Friday! The weekend is almost here.', '🙌🏾 You made it to Friday — well done this week!']);
    if (wd === 6) return pick(['😄 Happy Saturday! Owambe or rest today?', '🌿 Enjoy your Saturday — you deserve the break.']);
    if (wd === 0) return h < 17 ? pick(['🙏🏾 Happy Sunday! Rest well and enjoy your people.', '🍲 Sunday vibes — hope there’s jollof somewhere near you!']) : '🌙 Rest well tonight — a fresh week starts tomorrow.';
    if (h < 12) return pick(['😊 Hope you slept well. Nothing due today — enjoy it!', '☕ A calm start — nothing due today.', '🌞 Your day is clear. Make it a good one!']);
    if (h < 17) return pick(['😊 Hope your day is going well.', '💚 Nothing due today — keep going, you’re doing well.', '🥤 Don’t forget to take a break and drink some water!']);
    return pick(['🛋️ Time to relax — you’ve done well today.', '🌙 Hope today was kind to you. Rest well.', '💚 All done for today. Well done!']);
  }
  function tile(i, cls, right) {
    var ico = i.lk ? (LIFE.filter(function (l) { return l.k === i.lk; })[0] || {}).e : '';
    var sub = [i.rep ? REP[i.rep] : '', i.tm && i.d !== today() ? nice(i.d) : ''].filter(Boolean).join(' · ');
    return '<div class="mpT-row ' + (cls || '') + '" data-open="' + i.id + '"><button class="mpT-ic mpT-ck" data-tick="' + i.id + '" aria-label="Mark as done">' + (ico || '') + '</button><div class="mpT-t">' + esc(i.t) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div><span class="mpT-r">' + right + '</span></div>';
  }
  function todayHtml() {
    var g = groups(), t = today(), has = live().length > 0 || liveLists().length > 0, hideNew = ls.get(HIDE) === '1';
    var gr = greet(), d = new Date(), dateLine = cap(DAYS[d.getDay()]) + ' ' + d.getDate() + ' ' + cap(MONTHS[d.getMonth()]);
    var mo = null; try { mo = window.showDailyMotivation ? window.showDailyMotivation('get') : null; } catch (e) {}
    var line = has ? hello(g.over.concat(g.today).filter(function (i) { return !i.cel; }).length, live().filter(function (i) { return i.cel && celSoon(i); }), t) : hello(0, [], t);
    var html = '<div class="mp mpT"><div class="mpT-top"><div class="mpT-bub"><div class="mpT-h">' + gr[1] + (P.name ? ', ' + esc(P.name) : '') + '! ' + gr[0] + '</div>' + line +
      (P.signedIn && !P.name ? '<br><a href="#" class="mpT-name" data-mp-name>👋🏾 What should I call you?</a>' : '') + '</div>' +
      (mo ? '<button class="mpT-mo" data-mp-mo>' + esc(mo.emoji) + ' “' + esc(mo.text) + '”</button>' : '') +
      '<div class="mpT-date">📅 ' + dateLine + '</div></div>';
    var body = '';
    var sl = P.sun && P.sun.latest;
    if (sl && t >= sl.week && t <= addDays(sl.week, 2)) body += '<div class="mpT-row mpT-news" data-mp-sun><span class="mpT-ic">📰</span><div class="mpT-t">Your Sunday Update is here<small>This week’s UK news, events and more</small></div><span class="mpT-r">Read ›</span></div>';
    if (has) {
      var cels = live().filter(function (i) { return i.cel && celSoon(i); }).sort(function (a, b) { return a.d.localeCompare(b.d); });
      var todays = cels.filter(function (i) { return i.d === t; }), soon = cels.filter(function (i) { return i.d !== t; });
      // 🎂 on the day: a big banner at the top
      body += todays.slice(0, 2).map(function (i) {
        return '<div class="mpT-row mpT-big"><span class="mpT-ic">' + celEmoji(i) + '</span><div class="mpT-t">It’s ' + esc(i.t) + ' today!' + (celNum(i) ? '<small>' + cap(celNum(i)) + ' 🎉</small>' : '') + '</div>' +
          '<div class="mpT-mini"><a class="mpT-mc" href="' + cardUrl(i) + '" data-card="' + esc(i.id) + '">' + cardBtn(i) + '</a><button class="mpT-md" data-tick="' + i.id + '">✅ Done</button></div></div>';
      }).join('');
      var due = g.over.concat(g.today).filter(function (i) { return !i.cel; });
      body += '<div class="mpT-lbl">Your day</div>';
      if (due.length) body += due.slice(0, 3).map(function (i) { return tile(i, i.d < t ? 'mpT-late' : '', i.d < t ? 'Overdue' : i.tm ? niceTime(i.tm) : 'Today'); }).join('') + (due.length > 3 ? '<div class="mpT-more">+ ' + (due.length - 3) + ' more in My Plan</div>' : '');
      else { var nx = g.week.concat(g.later).filter(function (i) { return !i.cel; })[0]; body += '<div class="mpT-row"><span class="mpT-ic">🎉</span><div class="mpT-t">Nothing due today' + (nx ? '<small>Next: ' + esc(nx.t) + ' · ' + nice(nx.d) + '</small>' : '') + '</div><span class="mpT-r">All clear</span></div>'; }
      var sl0 = liveLists().slice().sort(function (a, b) { return (b.up || 0) - (a.up || 0); })[0], sleft = sl0 ? sl0.items.filter(function (i) { return !i.x; }).length : 0;
      if (sleft) body += '<div class="mpT-row mpT-shop" data-mp-shop><span class="mpT-ic">🛒</span><div class="mpT-t">' + esc(sl0.name) + '</div><span class="mpT-r">' + sleft + ' to buy</span></div>';
      // 🎉 coming up (within each person's "remind me" time)
      if (soon.length) body += '<div class="mpT-lbl">Upcoming celebrations</div>' + soon.slice(0, 3).map(function (i, n) {
        var dd = daysTo(i.d);
        return '<div class="mpT-row mpT-cel" data-open="' + i.id + '"><span class="mpT-ic">' + celEmoji(i) + '</span><div class="mpT-t">' + esc(i.t) + '<small>' + nice(i.d, true) + (celNum(i) ? ' · ' + celNum(i) : '') + '</small></div><span class="mpT-r">' + (dd === 1 ? 'tomorrow' : 'in ' + dd + ' days') + '</span>' +
          (n === 0 ? '<div class="mpT-mini"><a class="mpT-mc" href="' + cardUrl(i) + '" data-card="' + esc(i.id) + '">' + cardBtn(i) + '</a><button class="mpT-md" data-tick="' + i.id + '">✅ Done</button></div>' : '') + '</div>';
      }).join('');
      body += '<div class="mpT-btns"><button class="mpT-b1" data-mp-open>💚 Open My Plan</button><button class="mpT-b2" data-mp-add>＋ Add</button></div>';
    } else if (!hideNew) {
      body += '<div class="mpT-row mpT-shop"><span class="mpT-ic">💚</span><div class="mpT-t">New: My Plan<small>Remember bills, birthdays and shopping in one place</small></div><button class="mpT-x" data-mp-hide aria-label="Hide">✕</button></div>' +
        '<div class="mpT-btns"><button class="mpT-b1" data-mp-open>💚 Try My Plan FREE</button></div>';
    }
    return html + (body ? '<div class="mpT-body">' + body + '</div>' : '') + '</div>';
  }
  function bindToday(root) {
    root.querySelectorAll('[data-mp-open]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); open(); }; });
    root.querySelectorAll('[data-mp-add]').forEach(function (b) { b.onclick = function () { open(); setTimeout(function () { var i = $('#mpQ'); if (i) i.focus(); }, 150); }; });
    root.querySelectorAll('[data-mp-hide]').forEach(function (b) { b.onclick = function () { ls.set(HIDE, '1'); gt('plan_hide_new'); fill(); }; });
    root.querySelectorAll('[data-mp-mo]').forEach(function (b) { b.onclick = function () { try { var m = window.showDailyMotivation('get'); if (window.showMotivationLanding) window.showMotivationLanding(m.text, '', '', ''); } catch (e) {} }; });
    root.querySelectorAll('[data-mp-name]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); settings(); setTimeout(function () { var n = document.getElementById('pN'); if (n) n.focus(); }, 150); }; });
    root.querySelectorAll('[data-mp-sun]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); openSunday(); }; });
    root.querySelectorAll('[data-mp-shop]').forEach(function (b) { b.onclick = function () { view.tab = 'shop'; open(); }; });
    bindRows(root);
    root.querySelectorAll('[data-card]').forEach(function (x) { x.onclick = function (e) { e.stopPropagation(); gt('cel_card', { from: 'home' }); }; });
  }
  function fill() {
    addCss();
    document.querySelectorAll('[data-myplan-today]').forEach(function (el) { el.innerHTML = todayHtml(); bindToday(el); });
  }

  // ───── 💚 My Plan screen ─────
  function open() {
    addCss(); ls.set(SEEN, '1'); markPill();
    if (window.tobiDesk && window.tobiDesk.isLap && window.tobiDesk.isLap() && window.tobiDesk.inApp) { window.tobiDesk.inApp('plan'); }
    window._currentPage = 'myplan'; window.__homeRender = false;
    try { if (typeof clearExamState === 'function') clearExamState(); } catch (e) {}
    var msgs = document.getElementById('messages'); if (!msgs) return;
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="mpRoot" class="mp"></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); else msgs.scrollTop = 0; } catch (e) {}
    gt('plan_open'); render();
  }
  function render() {
    var root = document.getElementById('mpRoot'); if (!root) return;
    var g = groups(), has = live().length > 0;
    var h = '<div class="mp-top"><b>💚 My Plan</b><span>Everything you need to remember, in one place</span></div>' +
      '<div class="mp-tabs"><button data-tab="plan"' + (view.tab === 'plan' ? ' class="on"' : '') + '>📋 Plan</button><button data-tab="cel"' + (view.tab === 'cel' ? ' class="on"' : '') + '>🎉 Celebrations</button><button data-tab="shop"' + (view.tab === 'shop' ? ' class="on"' : '') + '>🛒 Shopping</button></div>';
    if (view.tab === 'cel') { root.innerHTML = h + celHtml(); bindCel(root); return; }
    if (view.tab === 'shop') { root.innerHTML = h + shopHtml(); bindShop(root); return; }
    if (has && !P.signedIn) h += '<div class="mp-warn"><span style="flex:1">⚠️ <b>Not saved yet</b> — it’s only on this phone. Save it to your free Auntie Tobi account.</span><button class="mp-btn" data-mp-save>💚 Save my plan</button></div>';
    if (P.signedIn && !P.rm && ls.get('tobi_myplan_rm_ask') !== 'no' && has) h += '<div class="mp-new" style="margin:0 0 10px"><span style="font-size:22px">☀️</span><div style="flex:1"><b style="color:#0F1E36">Want a morning email?</b> Only on days you have something due.<div class="mp-row" style="margin-top:8px"><button class="mp-btn" data-rm-yes>Yes — at 7am</button><button class="mp-btn g" data-rm-no>No thanks</button></div></div></div>';
    h += '<form class="mp-add" id="mpF"><input id="mpQ" placeholder="✏️ Type it — e.g. “Pay rent every 1st”" autocomplete="off" maxlength="140"><button class="mp-btn" aria-label="Add">＋</button></form><div class="mp-hint" id="mpHint"></div>';
    if (!has) {
      h += '<div class="mp-card"><div class="mp-empty"><b>Your day is looking clear! 💚</b>Add something to get started — bills, appointments, things to renew. <br><span style="font-size:13px;color:#6B7280">Free — sign in with just your email, no password.</span></div>' +
        '<div class="mp-welcome"><button data-w="item"><span>📋</span><div>Add something to remember<small>“Dentist Friday 4pm”, “Pay rent every 1st”</small></div></button>' +
        '<button data-w="life"><span>🗂️</span><div>Add UK life dates<small>Passport, eVisa, MOT, car insurance, tax return…</small></div></button>' +
        '<button data-w="cel"><span>🎉</span><div>Add a birthday or anniversary<small>Auntie Tobi reminds you — and helps you make a card</small></div></button>' +
        '<button data-w="shop"><span>🛒</span><div>Start a shopping list<small>Naija groceries, weekly shop, party — ready to go</small></div></button></div></div>';
    } else {
      var sec = function (label, list, red) { return list.length ? '<div class="mp-lbl' + (red ? ' red' : '') + '">' + label + '</div>' + list.map(function (i) { return row(i); }).join('') : ''; };
      var body = sec('Overdue', g.over, true) + sec('Today', g.today) + sec('Next 7 days', g.week) + sec('Later', g.later) + sec('No date', g.none);
      if (!g.over.length && !g.today.length) body = '<div class="mp-sub" style="font-size:14px;color:#0F1E36;padding:4px 0 2px">Nothing due today 🎉</div>' + body;
      h += '<div class="mp-card">' + body + '</div>';
      if (g.done.length) h += '<div class="mp-card"><div class="mp-it" data-done-toggle style="border:0;padding:2px 0"><div class="tx" style="font-weight:700">✅ Done (' + g.done.length + ')</div><div class="r">' + (view.showDone ? 'Hide ▴' : 'Show ▾') + '</div></div>' + (view.showDone ? g.done.slice(0, 40).map(function (i) { return row(i, { noDate: true }); }).join('') : '') + '</div>';
      h += '<button class="mp-card" data-w="life" style="width:100%;text-align:left;cursor:pointer;font-family:inherit"><b style="font-size:14.5px">🗂️ Add UK life dates</b><div class="mp-sub">Passport, eVisa, MOT, car insurance, tax return…</div></button>';
    }
    var sl2 = P.sun && P.sun.latest;
    h += '<div class="mp-card" style="background:#FFFBF0;border-color:#FFE3A3"><b style="font-size:15px">📰 Auntie Tobi’s Sunday Update</b>' + (sl2 ? '<div class="mp-sub" style="font-size:13.5px;color:#0F1E36;margin-top:4px">' + esc(sl2.subject) + ' · ' + nice(sl2.week, true) + '</div>' : '<div class="mp-sub" style="font-size:13.5px">UK news, events and a business of the week — every Sunday.</div>') +
      '<div class="mp-row">' + (sl2 ? '<button class="mp-btn" data-mp-sun>Read it</button>' : '') + (P.news ? '<span class="mp-sub" style="align-self:center">✅ You get it by email</span>' : '<button class="mp-btn ' + (sl2 ? 'g' : '') + '" data-mp-news>📧 Get it by email</button>') + '</div></div>';
    h += '<div style="text-align:center;font-size:12.5px;color:#6B7280;margin:6px 0 4px">' + (P.signedIn ? '💚 Saved to ' + esc(P.email) + ' · <a href="#" data-mp-settings style="color:#057A44;font-weight:700">Settings</a>' : '<a href="#" data-mp-save style="color:#057A44;font-weight:700">💚 Sign in to save your plan</a>') + '</div>';
    root.innerHTML = h;
    // add box with live preview of what Auntie Tobi understood
    var q = $('#mpQ', root), hint = $('#mpHint', root);
    q.oninput = function () { var p = parse(q.value); var bits = [p.d ? '📅 ' + nice(p.d, true) : '', p.tm ? '🕒 ' + niceTime(p.tm) : '', p.rep ? '🔁 ' + REP[p.rep].toLowerCase() : ''].filter(Boolean); hint.style.display = bits.length && p.t ? 'block' : 'none'; hint.innerHTML = '<b>' + esc(p.t) + '</b> · ' + bits.join(' · '); };
    $('#mpF', root).onsubmit = function (e) { e.preventDefault(); var v = q.value.trim(); if (!v) { q.focus(); return; } var p = parse(v); if (!p.t) p.t = v; add({ t: p.t, d: p.d, tm: p.tm, rep: p.rep, dom: p.dom }); q.value = ''; hint.style.display = 'none'; };
    root.querySelectorAll('[data-soon]').forEach(function (b) { b.onclick = function () { toast(b.dataset.soon + ' are coming soon 💚'); }; });
    root.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { if (b.dataset.w === 'item') { q.focus(); } else if (b.dataset.w === 'life') lifeSheet(); else if (b.dataset.w === 'cel') { view.tab = 'cel'; render(); celSheet(); } else if (b.dataset.w === 'shop') { view.tab = 'shop'; render(); } }; });
    bindTabs(root);
    root.querySelectorAll('[data-mp-save]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); signIn(); }; });
    root.querySelectorAll('[data-mp-settings]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); settings(); }; });
    var dt = $('[data-done-toggle]', root); if (dt) dt.onclick = function () { view.showDone = !view.showDone; render(); };
    root.querySelectorAll('[data-mp-sun]').forEach(function (b) { b.onclick = function () { openSunday(); }; });
    root.querySelectorAll('[data-mp-news]').forEach(function (b) { b.onclick = function () { newsSheet(); }; });
    var ry = $('[data-rm-yes]', root); if (ry) ry.onclick = function () { api('prefs', { rm: '07' }).then(function (r) { P.rm = r.rm; store(); render(); toast('☀️ Morning emails on — 7am, only on days with something due'); gt('plan_morning_on'); }).catch(function (e) { toast(e.message); }); };
    var rn = $('[data-rm-no]', root); if (rn) rn.onclick = function () { ls.set('tobi_myplan_rm_ask', 'no'); render(); };
    bindRows(root);
  }
  function refresh() { if (window._currentPage === 'myplan') render(); fill(); }

  // ───── ✏️ one item ─────
  function edit(id) {
    var it = P.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    if (it.cel) return celSheet(it);
    var life = LIFE.filter(function (l) { return l.k === it.lk; })[0];
    var s = sheet('<h3>✏️ Edit</h3>' +
      '<label>What</label><input id="eT" maxlength="140" value="' + esc(it.t) + '">' +
      '<div class="mp-two"><div><label>Date</label><input id="eD" type="date" value="' + esc(it.d) + '"></div><div><label>Time (optional)</label><input id="eTm" type="time" value="' + esc(it.tm) + '"></div></div>' +
      '<label>Repeat</label><select id="eR">' + Object.keys(REP).map(function (k) { return '<option value="' + k + '"' + (it.rep === k ? ' selected' : '') + '>' + REP[k] + '</option>'; }).join('') + '</select>' +
      '<label>Checklist</label><div id="eCk">' + (it.ck || []).map(function (c, n) { return '<div class="mp-cl"><input type="checkbox" data-c="' + n + '"' + (c.x ? ' checked' : '') + '><span style="flex:1">' + esc(c.t) + '</span><button class="mp-btn l" data-cdel="' + n + '" aria-label="Remove">✕</button></div>'; }).join('') + '</div>' +
      '<div class="mp-two" style="margin-top:6px"><input id="eCn" placeholder="＋ Add a step" maxlength="120"></div>' +
      '<label>Notes</label><textarea id="eN" maxlength="1000">' + esc(it.note) + '</textarea>' +
      (life && life.link ? '<a class="mp-link" href="' + life.link[1] + '" target="_blank" rel="noopener">🔗 ' + esc(life.link[0]) + '</a>' : '') + (life && life.note ? '<div class="mp-sub" style="margin-top:6px">💡 ' + esc(life.note) + '</div>' : '') +
      '<div class="mp-row"><button class="mp-btn g" id="eCal">📅 Add to phone calendar</button></div>' +
      '<div class="mp-err" id="eErr"></div><div class="mp-row" style="justify-content:space-between;margin-top:16px"><button class="mp-btn l" id="eDel">🗑️ Delete</button><span style="display:flex;gap:8px"><button class="mp-btn g" id="eX">Cancel</button><button class="mp-btn" id="eOk">Save</button></span></div>');
    var ck = (it.ck || []).map(function (c) { return { t: c.t, x: c.x }; });
    var drawCk = function () { $('#eCk', s).innerHTML = ck.map(function (c, n) { return '<div class="mp-cl"><input type="checkbox" data-c="' + n + '"' + (c.x ? ' checked' : '') + '><span style="flex:1">' + esc(c.t) + '</span><button class="mp-btn l" data-cdel="' + n + '" aria-label="Remove">✕</button></div>'; }).join(''); bindCk(); };
    var bindCk = function () { s.querySelectorAll('[data-c]').forEach(function (c) { c.onchange = function () { ck[+c.dataset.c].x = c.checked; }; }); s.querySelectorAll('[data-cdel]').forEach(function (b) { b.onclick = function () { ck.splice(+b.dataset.cdel, 1); drawCk(); }; }); };
    bindCk();
    $('#eCn', s).onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = this.value.trim(); if (v) { ck.push({ t: v, x: false }); this.value = ''; drawCk(); } } };
    var vals = function () { var c = $('#eCn', s).value.trim(); if (c) ck.push({ t: c, x: false }); return { t: $('#eT', s).value.trim(), d: $('#eD', s).value, tm: $('#eD', s).value ? $('#eTm', s).value : '', rep: $('#eD', s).value ? $('#eR', s).value : '', note: $('#eN', s).value, ck: ck }; };
    $('#eX', s).onclick = function () { s.remove(); };
    $('#eDel', s).onclick = function () { s.remove(); remove(id); };
    $('#eCal', s).onclick = function () { var v = vals(); if (!v.d) { $('#eErr', s).textContent = 'Add a date first.'; $('#eErr', s).style.display = 'block'; return; } calSheet(Object.assign({}, it, v)); };
    $('#eOk', s).onclick = function () { var v = vals(); if (!v.t) { $('#eErr', s).textContent = 'Add what you need to remember.'; $('#eErr', s).style.display = 'block'; return; } if (v.rep && v.d !== it.d) it.dom = fromIso(v.d).getDate(); Object.assign(it, v); s.remove(); change(it); toast('✅ Saved'); };
  }

  // ───── 🎉 Celebration dates ─────
  var REL = [['mum', 'Mum'], ['dad', 'Dad'], ['husband', 'Husband'], ['wife', 'Wife'], ['partner', 'Partner'], ['son', 'Son'], ['daughter', 'Daughter'], ['sister', 'Sister'], ['brother', 'Brother'], ['grandma', 'Grandma'], ['grandpa', 'Grandpa'], ['friend', 'Friend'], ['colleague', 'Colleague'], ['pastor', 'Pastor'], ['couple', 'A couple'], ['family', 'Family'], ['other', 'Someone else']];
  var KINDS = [['birthday', '🎂 Birthday'], ['wedding', '💍 Wedding anniversary'], ['other', '🎉 Something else']];
  var SHE = ['mum', 'wife', 'daughter', 'sister', 'grandma'], HE = ['dad', 'husband', 'son', 'brother', 'grandpa'];
  function bindTabs(root) { root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { view.tab = b.dataset.tab; gt('plan_tab', { tab: view.tab }); render(); }; }); }
  function daysTo(d) { return Math.round((fromIso(d) - fromIso(today())) / 864e5); }
  function countdown(d) { var n = daysTo(d); return n === 0 ? 'Today 🎉' : n === 1 ? 'Tomorrow' : n < 0 ? nice(d) : n < 60 ? n + ' days' : nice(d); }
  function celLead(i) { return Math.max.apply(null, [0].concat((i.cel && i.cel.lead) || [3])); }
  function celSoon(i) { var n = daysTo(i.d); return n >= 0 && n <= celLead(i); }
  function celEmoji(i) { return i.cel.k === 'birthday' ? '🎂' : i.cel.k === 'wedding' || i.cel.k === 'anniversary' ? '💍' : '🎉'; }
  function celAge(i) { return i.cel && i.cel.y ? +i.d.slice(0, 4) - i.cel.y : 0; }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function celNum(i) { var a = celAge(i); if (!a) return ''; return i.cel.k === 'birthday' ? 'turning ' + a : ordinal(a) + ' anniversary'; }
  function celTitle(c, label) { var n = c.n || ''; if (c.k === 'birthday') return n ? n + (/s$/i.test(n) ? '’' : '’s') + ' birthday' : 'Birthday'; if (c.k === 'wedding') return !n ? 'Our wedding anniversary' : /^(our|my)$/i.test(n) ? cap(n.toLowerCase()) + ' wedding anniversary' : n + (/s$/i.test(n) ? '’' : '’s') + ' wedding anniversary'; return (label || 'Celebration') + (n ? ' — ' + n : ''); }
  function cardUrl(i) {
    var occ = i.big ? i.big : i.cel.k === 'birthday' ? 'birthday' : i.cel.k === 'wedding' ? 'anniversary' : '';
    var q = []; if (occ) q.push('o=' + occ); if (i.cel && i.cel.r && i.cel.r !== 'other') q.push('who=' + encodeURIComponent(i.cel.r)); if (i.cel && i.cel.n && !/^(our|my)\b/i.test(i.cel.n)) q.push('name=' + encodeURIComponent(i.cel.n)); if (celAge(i)) q.push('age=' + celAge(i));
    q.push('from=plan'); return '/cards?' + q.join('&');
  }
  function cardBtn(i) { var r = i.cel && i.cel.r; return '💌 Make ' + (SHE.indexOf(r) >= 0 ? 'her a' : HE.indexOf(r) >= 0 ? 'him a' : r === 'couple' ? 'them a' : 'a') + ' card'; }
  // 🇬🇧🇳🇬 big days (only if switched on) — worked out each year, never stored
  function easter(y) { var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), dy = ((h + l - 7 * m + 114) % 31) + 1; return iso(new Date(y, mo - 1, dy, 12)); }
  function bigDays() {
    var t = today(), y = new Date().getFullYear(), out = [];
    [y, y + 1].forEach(function (yr) {
      var j = new Date(yr, 5, 1, 12); j.setDate(1 + ((7 - j.getDay()) % 7) + 14);   // 3rd Sunday in June
      [['newyear', '🎆', 'New Year’s Day', iso(new Date(yr, 0, 1, 12))], ['valentine', '💝', 'Valentine’s Day', iso(new Date(yr, 1, 14, 12))], ['mothers', '👩🏾', 'Mother’s Day (UK)', addDays(easter(yr), -21)], ['easter', '🐣', 'Easter Sunday', easter(yr)],
        ['fathers', '👨🏾', 'Father’s Day', iso(j)], ['independence', '🇳🇬', 'Nigeria’s Independence Day', iso(new Date(yr, 9, 1, 12))], ['christmas', '🎄', 'Christmas Day', iso(new Date(yr, 11, 25, 12))]]
        .forEach(function (x) { if (x[3] >= t && daysTo(x[3]) <= 366) out.push({ id: 'big-' + x[0] + x[3], big: x[0], e: x[1], t: x[2], d: x[3], cel: { k: 'other', lead: [7], r: '' } }); });
    });
    return out.sort(function (a, b) { return a.d.localeCompare(b.d); });
  }
  function celHtml() {
    var mine = live().filter(function (i) { return i.cel; }).sort(function (a, b) { return a.d.localeCompare(b.d); });
    var big = ls.get('tobi_myplan_big') === '1' ? bigDays() : [];
    var soon = mine.filter(celSoon).concat(big.filter(function (b) { return daysTo(b.d) <= 7; }));
    var h = '';
    if (!P.signedIn && mine.length) h += '<div class="mp-warn"><span style="flex:1">⚠️ <b>Not saved yet</b> — save your dates so you never lose them.</span><button class="mp-btn" data-mp-save>💚 Save my plan</button></div>';
    h += soon.map(function (i) {
      var n = daysTo(i.d), when = n === 0 ? 'is today! 🎉' : n === 1 ? 'is tomorrow' : 'is in ' + n + ' days';
      return '<div class="mp-top" style="background:#0F1E36;padding:15px"><b style="font-size:17px">' + (i.big ? i.e : celEmoji(i)) + ' ' + esc(i.t) + ' ' + when + '</b><span>' + nice(i.d, true) + (!i.big && celNum(i) ? ' · ' + celNum(i) : '') + '</span>' +
        '<div class="mp-row"><a class="mp-btn y" href="' + cardUrl(i) + '" data-card="' + esc(i.id) + '">' + (i.big ? '💌 Make a card' : cardBtn(i)) + '</a>' + (i.big ? '' : '<button class="mp-btn n" style="border:1.5px solid #fff" data-tick="' + i.id + '">✅ Done</button>') + '</div></div>';
    }).join('');
    var list = mine.concat(big.filter(function (b) { return soon.indexOf(b) < 0; })).sort(function (a, b) { return a.d.localeCompare(b.d); });
    if (!mine.length) h += '<div class="mp-card"><div class="mp-empty"><b>🎉 Never miss a birthday again</b>Add birthdays and anniversaries — Auntie Tobi reminds you in good time and helps you make a beautiful card to send on WhatsApp.</div></div>';
    if (list.length) h += '<div class="mp-card"><div class="mp-lbl" style="margin-top:0">Coming up</div>' + list.map(function (i) {
      var sent = !i.big && (i.cel.sent || []).indexOf(new Date().getFullYear()) >= 0;
      return '<div class="mp-it" ' + (i.big ? '' : 'data-open="' + i.id + '"') + '><span style="width:38px;height:38px;border-radius:50%;background:#FFF1CF;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">' + (i.big ? i.e : celEmoji(i)) + '</span><div class="tx"><b style="font-weight:700">' + esc(i.t) + '</b><small>' + nice(i.d, true) + (i.big ? ' · big day' : '') + (sent ? ' · ✅ sent this year' : '') + '</small></div><div class="r" style="text-align:right"><b style="color:#057A44;display:block">' + countdown(i.d) + '</b>' + (i.big ? '' : celNum(i)) + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="mp-row" style="margin-bottom:10px"><button class="mp-btn" data-cel-add>＋ Add a date</button><button class="mp-btn g" data-cel-paste>📋 Paste a list</button></div>';
    h += '<label class="mp-card mp-cl" style="cursor:pointer;font-weight:600"><input type="checkbox" data-cel-big' + (ls.get('tobi_myplan_big') === '1' ? ' checked' : '') + '> Show big days — Mother’s Day, Father’s Day, Christmas, Independence Day…</label>';
    return h;
  }
  function bindCel(root) {
    bindTabs(root); bindRows(root);
    root.querySelectorAll('[data-mp-save]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); signIn(); }; });
    root.querySelectorAll('[data-card]').forEach(function (a) { a.onclick = function () { gt('cel_card', { big: /^big-/.test(a.dataset.card) ? 1 : 0 }); }; });
    var ad = $('[data-cel-add]', root); if (ad) ad.onclick = function () { celSheet(); };
    var ps = $('[data-cel-paste]', root); if (ps) ps.onclick = pasteSheet;
    var bg = $('[data-cel-big]', root); if (bg) bg.onchange = function () { ls.set('tobi_myplan_big', bg.checked ? '1' : '0'); gt('cel_bigdays', { on: bg.checked ? 1 : 0 }); render(); };
  }
  function celSheet(it, pre) {
    var c = (it && it.cel) || Object.assign({ n: '', r: 'friend', k: 'birthday', y: 0, lead: [3] }, pre || {});
    var dd = it && it.d ? fromIso(it.d) : null, label = it && c.k === 'other' ? String(it.t).split(' — ')[0] : '';
    var s = sheet('<h3>' + (it ? '✏️ Edit' : '🎉 Add a celebration') + '</h3>' +
      '<label>What is it?</label><select id="cK">' + KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (c.k === k[0] || (c.k === 'anniversary' && k[0] === 'wedding') ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select>' +
      '<div id="cLw" style="display:none"><label>Name the occasion</label><input id="cL" maxlength="40" placeholder="e.g. Naming ceremony, Graduation, Remembering Dad" value="' + esc(label) + '"></div>' +
      '<div class="mp-two"><div><label id="cNl">Whose birthday?</label><input id="cN" maxlength="60" placeholder="e.g. Mum, Tunde" value="' + esc(c.n) + '"></div><div><label>Who are they to you?</label><select id="cR">' + REL.map(function (r) { return '<option value="' + r[0] + '"' + (c.r === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<label>Date</label><div class="mp-two"><select id="cD">' + Array.apply(null, Array(31)).map(function (_, n) { return '<option' + (dd && dd.getDate() === n + 1 ? ' selected' : '') + '>' + (n + 1) + '</option>'; }).join('') + '</select><select id="cM">' + MONTHS.map(function (m, n) { return '<option value="' + n + '"' + (dd && dd.getMonth() === n ? ' selected' : '') + '>' + cap(m) + '</option>'; }).join('') + '</select><input id="cY" inputmode="numeric" maxlength="4" placeholder="Year (optional)" value="' + (c.y || '') + '"></div>' +
      '<div class="mp-sub" id="cYh"></div>' +
      '<label>Remind me</label><div class="mp-row" style="margin-top:4px">' + [[0, 'On the day'], [1, '1 day before'], [3, '3 days before'], [7, '1 week before'], [14, '2 weeks before']].map(function (x) { return '<label class="mp-cl" style="margin:0 10px 0 0;font-weight:600;color:#0F1E36"><input type="checkbox" data-lead="' + x[0] + '"' + ((c.lead || []).indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') + '</div>' +
      '<label>Notes (optional)</label><textarea id="cNo" maxlength="1000" placeholder="Gift ideas, dress size, favourite cake…">' + esc(it ? it.note : '') + '</textarea>' +
      '<div class="mp-err" id="cErr"></div><div class="mp-row" style="justify-content:space-between;margin-top:16px">' + (it ? '<button class="mp-btn l" id="cDel">🗑️ Delete</button>' : '<span></span>') + '<span style="display:flex;gap:8px"><button class="mp-btn g" id="cX">Cancel</button><button class="mp-btn" id="cOk">Save</button></span></div>');
    var kind = function () { var k = $('#cK', s).value; $('#cLw', s).style.display = k === 'other' ? 'block' : 'none'; $('#cNl', s).textContent = k === 'birthday' ? 'Whose birthday?' : k === 'wedding' ? 'Whose? (e.g. “Our”, “Mum & Dad”)' : 'Who is it for?'; $('#cYh', s).textContent = k === 'birthday' ? 'Add the year they were born to see their age.' : k === 'wedding' ? 'Add the wedding year to see how many years.' : ''; };
    $('#cK', s).onchange = kind; kind();
    $('#cX', s).onclick = function () { s.remove(); };
    if (it) $('#cDel', s).onclick = function () { s.remove(); remove(it.id); };
    $('#cOk', s).onclick = function () {
      var k = $('#cK', s).value, n = $('#cN', s).value.trim(), lab = $('#cL', s).value.trim(), day = +$('#cD', s).value, mo = +$('#cM', s).value, y = +$('#cY', s).value || 0;
      var err = function (m) { $('#cErr', s).textContent = m; $('#cErr', s).style.display = 'block'; };
      if (k !== 'wedding' && !n && !(k === 'other' && lab)) return err('Add a name.');
      if (day > new Date(2024, mo + 1, 0).getDate()) return err('That date doesn’t exist — check the day and month.');
      if (y && (y < 1900 || y > new Date().getFullYear())) return err('Check the year (or leave it blank).');
      var lead = [].map.call(s.querySelectorAll('[data-lead]:checked'), function (x) { return +x.dataset.lead; });
      var cel = { n: n, r: $('#cR', s).value, k: k, y: y, lead: lead.length ? lead : [0], sent: (it && it.cel.sent) || [] };
      var d = mkDate(day, mo, ''), t = celTitle(cel, lab);
      if (it) { Object.assign(it, { t: t, d: d, rep: 'y', dom: day, cel: cel, note: $('#cNo', s).value }); s.remove(); change(it); toast('✅ Saved'); }
      else { s.remove(); add({ t: t, d: d, rep: 'y', dom: day, cel: cel, note: $('#cNo', s).value }, true); toast('🎉 Added — ' + (daysTo(d) === 0 ? 'it’s today!' : daysTo(d) === 1 ? 'it’s tomorrow' : daysTo(d) + ' days to go')); gt('cel_add', { kind: k }); }
      view.tab = 'cel'; if (window._currentPage !== 'myplan') open(); else render();
    };
  }
  // 📋 "Mum 12 March", "Tunde 4/6/1990", "Our anniversary 21 Dec 2014"
  var GUESS = [[/\b(mum|mummy|mom|mother|mama)\b/i, 'mum'], [/\b(dad|daddy|father|papa)\b/i, 'dad'], [/\b(grandma|nana|granny)\b/i, 'grandma'], [/\b(grandpa|grandad)\b/i, 'grandpa'], [/\b(husband|hubby)\b/i, 'husband'], [/\bwife\b/i, 'wife'], [/\b(sister|sis)\b/i, 'sister'], [/\b(brother|bro)\b/i, 'brother'], [/\bpastor\b/i, 'pastor']];
  function parseCel(line) {
    var raw = ' ' + String(line || '').replace(/\s+/g, ' ').trim() + ' '; if (raw.trim().length < 4) return null;
    var y = 0, m;
    if ((m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { y = m[3].length === 4 ? +m[3] : 0; raw = raw.replace(m[0], m[1] + '/' + m[2]); }
    if ((m = raw.match(/\b(19\d\d|20\d\d)\b/))) { y = y || +m[1]; raw = raw.replace(m[0], ' '); }
    var p = parse(raw); if (!p.d || p.rep) return null;
    var k = /anniversar|wedding/i.test(p.t) ? 'wedding' : 'birthday';
    var n = p.t.replace(/[’']s\b/gi, '').replace(/\b(birthday|bday|b-day|wedding|anniversary)\b/gi, '').replace(/[-–:,]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (k === 'wedding' && /^(our|my)?$/i.test(n)) n = 'Our';
    if (!n) return null;
    var r = 'friend'; GUESS.forEach(function (g) { if (g[0].test(n)) r = g[1]; }); if (k === 'wedding' && /^our$/i.test(n)) r = 'partner';
    var cel = { n: n.charAt(0).toUpperCase() + n.slice(1), r: r, k: k, y: y && y <= new Date().getFullYear() ? y : 0, lead: [3], sent: [] };
    return { t: celTitle(cel), d: p.d, dom: fromIso(p.d).getDate(), cel: cel };
  }
  function pasteSheet() {
    var s = sheet('<h3>📋 Paste a list</h3><div class="mp-sub" style="font-size:14px">One per line — e.g. <b>Mum 12 March</b>, <b>Tunde 4/6/1990</b>, <b>Our anniversary 21 Dec 2014</b>. You can paste from your notes or WhatsApp.</div><textarea id="pT" rows="7" style="margin-top:10px" placeholder="Mum 12 March&#10;Tunde 4 June 1990&#10;Our anniversary 21 December 2014"></textarea><div id="pPrev"></div><div class="mp-row" style="justify-content:flex-end;margin-top:12px"><button class="mp-btn g" id="pX">Cancel</button><button class="mp-btn" id="pOk" disabled>Add</button></div>');
    var found = [];
    $('#pT', s).oninput = function () {
      found = this.value.split(/\n/).map(parseCel).filter(Boolean);
      $('#pPrev', s).innerHTML = found.length ? '<div class="mp-lbl">Auntie Tobi found ' + found.length + '</div>' + found.map(function (f, n) { return '<label class="mp-cl"><input type="checkbox" data-pf="' + n + '" checked> ' + (f.cel.k === 'birthday' ? '🎂' : '💍') + ' ' + esc(f.t) + ' <span class="mp-sub" style="margin-left:auto">' + nice(f.d, true) + (f.cel.y ? ' · ' + f.cel.y : '') + '</span></label>'; }).join('') : '';
      $('#pOk', s).disabled = !found.length; $('#pOk', s).textContent = found.length ? 'Add ' + found.length : 'Add';
    };
    $('#pX', s).onclick = function () { s.remove(); };
    $('#pOk', s).onclick = function () { var n = 0; s.querySelectorAll('[data-pf]:checked').forEach(function (c) { var f = found[+c.dataset.pf]; add({ t: f.t, d: f.d, rep: 'y', dom: f.dom, cel: f.cel }, true); n++; }); s.remove(); view.tab = 'cel'; render(); toast('🎉 Added ' + n + ' date' + (n === 1 ? '' : 's')); gt('cel_paste', { n: n }); };
    setTimeout(function () { $('#pT', s).focus(); }, 80);
  }

  // ───── 🛒 Shopping lists ─────
  var CATS = ['🍠 African groceries', '🥬 Fruit & veg', '🍗 Meat & fish', '🥚 Dairy & eggs', '🍞 Bakery', '🥫 Food cupboard', '🥤 Drinks', '🧽 Household', '🧴 Personal care', '🎉 Party', '🏫 School', '📦 Other'];
  var GUESSC = [
    [/\b(yam|plantain|garri|gari|egusi|ogbono|palm oil|stockfish|crayfish|semovita|semolina|poundo|pounded yam|fufu|amala|elubo|iru|locust|uziza|ugu|bitter ?leaf|efo|ewedu|scotch bonnet|maggi|knorr|cameroon pepper|suya|kilishi|dried fish|ponmo|kpomo|honey beans|ofada|indomie|chin ?chin|plantain chips|zobo|malt|peppersoup|ehuru|ogiri|agbalumo|tiger ?nut|kola)\b/i, 0],
    [/\b(apples?|bananas?|oranges?|tomato(es)?|onions?|peppers?|carrots?|potato(es)?|spinach|lettuce|cucumber|garlic|ginger|lemons?|limes?|grapes|berries|avocado|cabbage|okra|okro|veg|fruit)\b/i, 1],
    [/\b(chicken|turkey|beef|goat|lamb|fish|prawns?|mackerel|tilapia|catfish|sardines?|sausages?|mince|meat|wings|drumsticks?)\b/i, 2],
    [/\b(milk|eggs?|butter|cheese|yoghurt|yogurt|cream)\b/i, 3], [/\b(bread|rolls|buns|cake|croissants?|bagels?)\b/i, 4],
    [/\b(rice|pasta|spaghetti|noodles|flour|sugar|salt|oil|beans|cereal|oats|tea|coffee|milo|tin|tinned|baked beans|tomato paste|stock|spices?|curry|thyme)\b/i, 5],
    [/\b(water|juice|coke|fanta|sprite|lemonade|wine|beer|squash|drinks?)\b/i, 6],
    [/\b(toilet roll|kitchen roll|washing|detergent|bleach|soap|bin bags?|foil|cling ?film|sponges?|fairy|dettol|cleaner|batteries|light ?bulbs?)\b/i, 7],
    [/\b(shampoo|conditioner|toothpaste|toothbrush|deodorant|lotion|cream|shea|pads|tampons|nappies|diapers|wipes|razors?|hair)\b/i, 8],
    [/\b(plates|cups|napkins|balloons|cutlery|trays?|party|candles)\b/i, 9], [/\b(uniform|school|pe kit|pencil|book ?bag|lunch ?box|stationery)\b/i, 10]];
  function guessCat(n) { for (var i = 0; i < GUESSC.length; i++) if (GUESSC[i][0].test(n)) return CATS[GUESSC[i][1]]; return CATS[11]; }
  var TPL = [
    { k: 'naija', e: '🍠', name: 'Naija groceries', items: ['Yam', 'Plantain', 'Garri', 'Egusi', 'Palm oil', 'Honey beans', 'Rice', 'Stockfish', 'Crayfish', 'Scotch bonnet pepper', 'Tomatoes', 'Onions', 'Maggi / Knorr cubes', 'Semovita', 'Dried fish'] },
    { k: 'weekly', e: '🧺', name: 'Weekly shop', items: ['Bread', 'Milk', 'Eggs', 'Butter', 'Chicken', 'Rice', 'Pasta', 'Onions', 'Tomatoes', 'Bananas', 'Apples', 'Cereal', 'Toilet roll', 'Washing-up liquid'] },
    { k: 'party', e: '🎉', name: 'Party / Owambe', items: ['Rice (big bag)', 'Chicken', 'Turkey', 'Puff puff', 'Samosas & spring rolls', 'Chin chin', 'Malt', 'Soft drinks', 'Water', 'Ice', 'Foil trays', 'Plates & cups', 'Napkins', 'Cutlery'] },
    { k: 'school', e: '🏫', name: 'School things', items: ['Uniform', 'School shoes', 'PE kit', 'Book bag', 'Water bottle', 'Lunchbox', 'Pencil case', 'Name labels'] },
    { k: 'blank', e: '🛒', name: 'New list', items: [] }];
  var liveLists = function () { return (P.lists || []).filter(function (l) { return !l.del; }); };
  function listChange(l) { l.up = Date.now(); dirtyL[l.id] = 1; store(); if (P.signedIn) { clearTimeout(syncT); syncT = setTimeout(sync, 700); } if (window._currentPage === 'myplan') render(); fill(); }
  function newList(t) {
    var l = { id: newId(), name: t.name, emoji: t.e, items: t.items.map(function (n) { return { id: newId(), n: n, q: '', c: guessCat(n), p: null, x: false }; }), up: Date.now() };
    P.lists = (P.lists || []).concat([l]); view.list = l.id; listChange(l); gt('shop_new', { tpl: t.k });
    if (!P.signedIn) setTimeout(askSave, 600);
    return l;
  }
  // "4 plantain", "2kg rice", "Garri x2" (a £ amount typed by habit is just dropped)
  function parseItem(v) {
    var s = ' ' + v.replace(/\s+/g, ' ').trim() + ' ', p = null, q = '', m;
    if ((m = s.match(/\s£\s?(\d+(?:\.\d{1,2})?)\s/))) { p = +m[1]; s = s.replace(m[0], ' '); }
    if ((m = s.match(/^\s(\d+(?:\.\d+)?\s?(?:kg|g|l|ml|lb|bags?|packs?|tins?|bottles?|tubers?|pcs|x)?)\s/i))) { q = m[1].trim(); s = s.replace(m[0], ' '); }
    else if ((m = s.match(/\s(?:x\s?(\d+)|(\d+(?:\.\d+)?\s?(?:kg|g|l|ml|lb|bags?|packs?|tins?|bottles?|tubers?)))\s*$/i))) { q = (m[1] || m[2]).trim(); s = s.replace(m[0], ' '); }
    var n = s.trim(); return { n: n.charAt(0).toUpperCase() + n.slice(1), q: q, p: p };
  }
  function shopHtml() {
    var lists = liveLists(), l = lists.filter(function (x) { return x.id === view.list; })[0] || lists[0];
    if (l) view.list = l.id;
    var h = '';
    if (!P.signedIn && lists.length) h += '<div class="mp-warn"><span style="flex:1">⚠️ <b>Not saved yet</b> — save your lists so they’re on any phone.</span><button class="mp-btn" data-mp-save>💚 Save my plan</button></div>';
    if (!l) return h + '<div class="mp-card"><div class="mp-empty"><b>🛒 Your shopping lists</b>Start with a ready-made list and change it however you like — or start from scratch.</div><div class="mp-welcome">' + TPL.map(function (t) { return '<button data-tpl="' + t.k + '"><span>' + t.e + '</span><div>' + (t.k === 'blank' ? 'Start a blank list' : esc(t.name)) + '<small>' + (t.items.length ? t.items.slice(0, 5).join(', ') + '…' : 'Add your own items') + '</small></div></button>'; }).join('') + '</div></div>';
    h += '<div class="mp-row" style="margin:0 0 10px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px">' + lists.map(function (x) { return '<button class="mp-btn' + (x.id === l.id ? '' : ' g') + '" style="white-space:nowrap;padding:8px 12px" data-list="' + x.id + '">' + esc(x.emoji + ' ' + x.name) + '</button>'; }).join('') + '<button class="mp-btn g" style="padding:8px 12px" data-list-new aria-label="New list">＋</button></div>';
    var left = l.items.filter(function (i) { return !i.x; }), got = l.items.filter(function (i) { return i.x; });

    h += '<div class="mp-card"><div style="display:flex;align-items:center;gap:8px"><b style="font-size:17px;flex:1">' + esc(l.emoji + ' ' + l.name) + '</b><span class="mp-sub">' + (l.items.length ? left.length + ' of ' + l.items.length + ' left' : '') + '</span><button class="mp-btn g" style="padding:6px 10px" data-list-menu aria-label="List options">⋯</button></div>' +
      '<form class="mp-add" id="shF" style="margin:10px 0 4px"><input id="shQ" placeholder="Add an item — e.g. “4 plantain”" autocomplete="off" maxlength="80"><button class="mp-btn" aria-label="Add">＋</button></form>';
    if (!l.items.length) h += '<div class="mp-sub" style="padding:8px 0">Nothing on this list yet — add your first item above.</div>';
    var byCat = {}; left.forEach(function (i) { (byCat[i.c || CATS[11]] = byCat[i.c || CATS[11]] || []).push(i); });
    var order = CATS.concat(Object.keys(byCat).filter(function (c) { return CATS.indexOf(c) < 0; }));
    var irow = function (i) { return '<div class="mp-it' + (i.x ? ' dn' : '') + '" data-item="' + i.id + '"><button class="mp-ck' + (i.x ? ' on' : '') + '" data-buy="' + i.id + '" aria-label="Bought">' + (i.x ? '✓' : '') + '</button><div class="tx">' + esc(i.n) + '</div><div class="r">' + esc(i.q || '') + '</div></div>'; };
    order.forEach(function (c) { if (byCat[c]) h += '<div class="mp-lbl">' + esc(c) + '</div>' + byCat[c].map(irow).join(''); });
    if (got.length) h += '<div class="mp-lbl">✅ In the basket (' + got.length + ')</div>' + got.map(irow).join('');

    h += '</div><div class="mp-row" style="margin-bottom:10px"><button class="mp-btn" style="background:#25D366" data-list-wa>📤 Send on WhatsApp</button>' + (got.length ? '<button class="mp-btn g" data-list-reset>🔄 Untick all</button>' : '') + '</div>';
    return h;
  }
  function bindShop(root) {
    bindTabs(root);
    root.querySelectorAll('[data-mp-save]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); signIn(); }; });
    root.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { var t = TPL.filter(function (x) { return x.k === b.dataset.tpl; })[0]; newList(t); toast(t.items.length ? '🛒 ' + t.name + ' ready — change anything you like' : '🛒 New list ready'); if (!t.items.length) setTimeout(function () { renameList(true); }, 300); }; });
    var l = liveLists().filter(function (x) { return x.id === view.list; })[0]; if (!l) return;
    root.querySelectorAll('[data-list]').forEach(function (b) { b.onclick = function () { view.list = b.dataset.list; render(); }; });
    var nw = $('[data-list-new]', root); if (nw) nw.onclick = pickTemplate;
    var f = $('#shF', root); if (f) f.onsubmit = function (e) { e.preventDefault(); var q = $('#shQ', root), v = q.value.trim(); if (!v) return q.focus(); v.split(/\s*[,\n]\s*(?=\D)/).forEach(function (part) { var it = parseItem(part); if (it.n) l.items.push({ id: newId(), n: it.n, q: it.q, c: guessCat(it.n), p: null, x: false }); }); listChange(l); gt('shop_add'); setTimeout(function () { var i = $('#shQ'); if (i) i.focus(); }, 50); };
    root.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var i = l.items.filter(function (x) { return x.id === b.dataset.buy; })[0]; if (i) { i.x = !i.x; listChange(l); } }; });
    root.querySelectorAll('[data-item]').forEach(function (r) { r.onclick = function () { itemSheet(l, r.dataset.item); }; });
    var wa = $('[data-list-wa]', root); if (wa) wa.onclick = function () { sendWa(l); };
    var rs = $('[data-list-reset]', root); if (rs) rs.onclick = function () { var before = JSON.parse(JSON.stringify(l.items)); l.items.forEach(function (i) { i.x = false; }); listChange(l); toast('🔄 Ready for next time', function () { l.items = before; listChange(l); }); };
    var mn = $('[data-list-menu]', root); if (mn) mn.onclick = function () { listMenu(l); };
  }
  function pickTemplate() {
    var s = sheet('<h3>🛒 New list</h3><div class="mp-welcome">' + TPL.map(function (t) { return '<button data-t="' + t.k + '"><span>' + t.e + '</span><div>' + (t.k === 'blank' ? 'Blank list' : esc(t.name)) + '<small>' + (t.items.length ? t.items.length + ' items to start with' : 'Add your own items') + '</small></div></button>'; }).join('') + '</div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="tX">Cancel</button></div>');
    $('#tX', s).onclick = function () { s.remove(); };
    s.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { var t = TPL.filter(function (x) { return x.k === b.dataset.t; })[0]; s.remove(); newList(t); if (!t.items.length) setTimeout(function () { renameList(true); }, 300); }; });
  }
  function renameList(fresh) {
    var l = liveLists().filter(function (x) { return x.id === view.list; })[0]; if (!l) return;
    var s = sheet('<h3>' + (fresh ? '🛒 Name your list' : '✏️ Rename list') + '</h3><div class="mp-two"><input id="rE" maxlength="4" value="' + esc(l.emoji) + '" style="flex:0 0 64px;text-align:center;font-size:20px"><input id="rN" maxlength="50" value="' + esc(fresh ? '' : l.name) + '" placeholder="e.g. Christmas shopping"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="rX">Cancel</button><button class="mp-btn" id="rOk">Save</button></div>');
    $('#rX', s).onclick = function () { s.remove(); };
    $('#rOk', s).onclick = function () { var n = $('#rN', s).value.trim(); if (n) l.name = n; l.emoji = $('#rE', s).value.trim() || '🛒'; s.remove(); listChange(l); };
    setTimeout(function () { $('#rN', s).focus(); }, 80);
  }
  function listMenu(l) {
    var s = sheet('<h3>' + esc(l.emoji + ' ' + l.name) + '</h3><div class="mp-welcome">' +
      '<button data-m="rename"><span>✏️</span><div>Rename</div></button><button data-m="dup"><span>📄</span><div>Make a copy<small>Use it again with everything unticked</small></div></button>' +
      '<button data-m="clear"><span>🧹</span><div>Remove what’s in the basket<small>Clear the ticked items</small></div></button><button data-m="del"><span>🗑️</span><div>Delete this list</div></button></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="mX">Close</button></div>');
    $('#mX', s).onclick = function () { s.remove(); };
    s.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () {
      var m = b.dataset.m; s.remove();
      if (m === 'rename') return renameList();
      if (m === 'dup') { var c = { id: newId(), name: l.name + ' (copy)', emoji: l.emoji, items: l.items.map(function (i) { return { id: newId(), n: i.n, q: i.q, c: i.c, p: null, x: false }; }), up: Date.now() }; P.lists.push(c); view.list = c.id; listChange(c); toast('📄 Copy made'); }
      if (m === 'clear') { var before = l.items.slice(); l.items = l.items.filter(function (i) { return !i.x; }); listChange(l); toast('🧹 Cleared', function () { l.items = before; listChange(l); }); }
      if (m === 'del') { l.del = true; view.list = ''; listChange(l); toast('🗑️ List deleted', function () { l.del = false; view.list = l.id; listChange(l); }); }
    }; });
  }
  function itemSheet(l, id) {
    var i = l.items.filter(function (x) { return x.id === id; })[0]; if (!i) return;
    var s = sheet('<h3>✏️ ' + esc(i.n) + '</h3><label>Item</label><input id="iN" maxlength="80" value="' + esc(i.n) + '">' +
      '<label>How many / how much</label><input id="iQ" maxlength="24" value="' + esc(i.q) + '" placeholder="e.g. 4, 2kg, 1 bag">' +
      '<label>Section</label><select id="iC">' + CATS.concat(CATS.indexOf(i.c) < 0 && i.c ? [i.c] : []).map(function (c) { return '<option' + (c === i.c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '<option value="__new">＋ New section…</option></select><input id="iCn" maxlength="30" placeholder="Name your section" style="display:none;margin-top:6px">' +
      '<div class="mp-row" style="justify-content:space-between;margin-top:16px"><button class="mp-btn l" id="iDel">🗑️ Remove</button><span style="display:flex;gap:8px"><button class="mp-btn g" id="iX">Cancel</button><button class="mp-btn" id="iOk">Save</button></span></div>');
    $('#iC', s).onchange = function () { $('#iCn', s).style.display = this.value === '__new' ? 'block' : 'none'; };
    $('#iX', s).onclick = function () { s.remove(); };
    $('#iDel', s).onclick = function () { var idx = l.items.indexOf(i); l.items.splice(idx, 1); s.remove(); listChange(l); toast('Removed', function () { l.items.splice(idx, 0, i); listChange(l); }); };
    $('#iOk', s).onclick = function () { var c = $('#iC', s).value; i.n = $('#iN', s).value.trim() || i.n; i.q = $('#iQ', s).value.trim(); i.p = null; i.c = c === '__new' ? ($('#iCn', s).value.trim() || CATS[11]) : c; s.remove(); listChange(l); };
  }
  function sendWa(l) {
    var left = l.items.filter(function (i) { return !i.x; }), byCat = {};
    left.forEach(function (i) { (byCat[i.c || CATS[11]] = byCat[i.c || CATS[11]] || []).push(i); });
    var txt = '🛒 *' + l.name + '*\n' + Object.keys(byCat).map(function (c) { return '\n' + c + '\n' + byCat[c].map(function (i) { return '• ' + i.n + (i.q ? ' (' + i.q + ')' : ''); }).join('\n'); }).join('\n') + '\n\nMade with My Plan on Auntie Tobi 💚 auntietobi.co.uk/my-plan';
    if (!left.length) { toast('Everything is ticked off 🎉'); return; }
    gt('shop_whatsapp'); window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  }

  // ───── ➕ Save to My Plan (events) ─────
  function saveEvent(btn) {
    var t = btn.getAttribute('data-t') || '', d = btn.getAttribute('data-d') || '', tm = parse('x ' + (btn.getAttribute('data-tm') || '')).tm, loc = btn.getAttribute('data-loc') || '';
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    var title = '🎉 ' + t.replace(/^\s*🎉\s*/, '');
    if (live().some(function (i) { return i.t === title && i.d === d; })) { toast('✅ Already in My Plan'); return; }
    add({ t: title, d: d, tm: tm, note: loc && loc !== 'UK' ? '📍 ' + loc : '', src: 'event' }, true);
    btn.textContent = '✅ Saved'; btn.disabled = true; toast('🎉 Saved to My Plan — ' + nice(d, true)); gt('event_save');
  }

  // ───── 📅 add to phone calendar (the phone does the reminding — reliable, no notifications needed) ─────
  function calSheet(it) {
    var s = sheet('<h3>📅 Add to your phone’s calendar</h3><div class="mp-sub" style="font-size:14px">Your phone will remind you' + (it.rep ? ' — ' + REP[it.rep].toLowerCase() : '') + '.</div>' +
      '<div class="mp-welcome"><button id="cIcs"><span>🍎</span><div>iPhone, Outlook &amp; other calendars<small>Opens “Add to calendar”</small></div></button><button id="cG"><span>📆</span><div>Google Calendar<small>Opens in Google Calendar</small></div></button></div>' +
      '<div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="cX">Close</button></div>');
    $('#cX', s).onclick = function () { s.remove(); };
    $('#cIcs', s).onclick = function () { downloadIcs(it); gt('plan_calendar', { kind: 'ics' }); };
    $('#cG', s).onclick = function () { window.open(googleUrl(it), '_blank', 'noopener'); gt('plan_calendar', { kind: 'google' }); };
  }
  var RR = { d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' };
  function icsDates(it) {
    var d = it.d.replace(/-/g, '');
    if (!it.tm) return { s: d, e: addDays(it.d, 1).replace(/-/g, ''), allDay: true };
    var st = it.tm.replace(':', '') + '00', end = new Date(fromIso(it.d).setHours(+it.tm.slice(0, 2) + 1, +it.tm.slice(3), 0, 0));
    return { s: d + 'T' + st, e: iso(end).replace(/-/g, '') + 'T' + pad(end.getHours()) + pad(end.getMinutes()) + '00', allDay: false };
  }
  function icsText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); }
  function downloadIcs(it) {
    var x = icsDates(it), now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var desc = [it.note, (it.ck || []).map(function (c) { return '• ' + c.t; }).join('\n'), 'From My Plan on Auntie Tobi — auntietobi.co.uk'].filter(Boolean).join('\n\n');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Auntie Tobi//My Plan//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + it.id + '@auntietobi.co.uk', 'DTSTAMP:' + now,
      x.allDay ? 'DTSTART;VALUE=DATE:' + x.s : 'DTSTART;TZID=Europe/London:' + x.s, x.allDay ? 'DTEND;VALUE=DATE:' + x.e : 'DTEND;TZID=Europe/London:' + x.e,
      'SUMMARY:' + icsText(it.t), 'DESCRIPTION:' + icsText(desc)].concat(it.rep ? ['RRULE:FREQ=' + RR[it.rep]] : [])
      .concat(['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(it.t), x.allDay ? 'TRIGGER;RELATED=START:PT9H' : 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']);
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = (it.t || 'reminder').replace(/[^\w\- ]+/g, '').slice(0, 40).trim() + '.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function googleUrl(it) {
    var x = icsDates(it), p = { action: 'TEMPLATE', text: it.t, dates: x.s + '/' + x.e, details: [it.note, 'From My Plan on Auntie Tobi'].filter(Boolean).join('\n\n') };
    if (!x.allDay) p.ctz = 'Europe/London';
    if (it.rep) p.recur = 'RRULE:FREQ=' + RR[it.rep];
    return 'https://calendar.google.com/calendar/render?' + Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
  }

  // ───── 🗂️ UK life dates ─────
  function lifeSheet() {
    var s = sheet('<h3>🗂️ UK life dates</h3><div class="mp-sub" style="font-size:14px">Pick one, add your date, and Auntie Tobi reminds you in good time — with what you’ll need and the official link.</div>' +
      '<div class="mp-life">' + LIFE.map(function (l, n) { return '<button data-l="' + n + '"><span>' + l.e + '</span>' + esc(l.t) + '</button>'; }).join('') + '</div>' +
      '<div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="lX">Close</button></div>');
    $('#lX', s).onclick = function () { s.remove(); };
    s.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { var l = LIFE[+b.dataset.l]; s.remove(); if (l.school) { window.open('https://schooltracker.auntietobi.co.uk', '_blank', 'noopener'); return; } lifeOne(l); }; });
  }
  var LEADS = [[0, 'On the day'], [7, '1 week before'], [14, '2 weeks before'], [28, '4 weeks before'], [60, '2 months before'], [90, '3 months before'], [180, '6 months before']];
  function lifeOne(l) {
    var lead = LEADS.reduce(function (a, x) { return Math.abs(x[0] - l.lead) < Math.abs(a[0] - l.lead) ? x : a; })[0];
    var s = sheet('<h3>' + l.e + ' ' + esc(l.t) + '</h3>' + (l.note ? '<div class="mp-sub" style="font-size:13.5px">💡 ' + esc(l.note) + '</div>' : '') +
      '<label>' + esc(l.ask) + '</label><input type="date" id="lD">' +
      '<label>Remind me</label><select id="lL">' + LEADS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === lead ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      (l.rep ? '<label class="mp-cl" style="font-weight:600;color:#0F1E36"><input type="checkbox" id="lR" checked> Repeat ' + REP[l.rep].toLowerCase() + '</label>' : '') +
      (l.ck ? '<div class="mp-lbl">What you’ll need</div>' + l.ck.map(function (c) { return '<div class="mp-cl">☑️ ' + esc(c) + '</div>'; }).join('') : '') +
      (l.link ? '<a class="mp-link" href="' + l.link[1] + '" target="_blank" rel="noopener">🔗 ' + esc(l.link[0]) + '</a>' : '') +
      '<div class="mp-err" id="lErr"></div><div class="mp-row" style="justify-content:flex-end;margin-top:16px"><button class="mp-btn g" id="lX">Cancel</button><button class="mp-btn" id="lOk">＋ Add to My Plan</button></div>');
    $('#lX', s).onclick = function () { s.remove(); };
    $('#lOk', s).onclick = function () {
      var d = $('#lD', s).value; if (!d) { $('#lErr', s).textContent = 'Add the date first.'; $('#lErr', s).style.display = 'block'; return; }
      var n = +$('#lL', s).value, rep = l.rep && $('#lR', s) && $('#lR', s).checked ? l.rep : '', when = n ? addDays(d, -n) : d;
      if (when < today()) when = today();
      var dt = fromIso(d), label = dt.getDate() + ' ' + cap(MONTHS[dt.getMonth()]).slice(0, 3) + ' ' + dt.getFullYear();
      var title = n ? l.t + ' — ' + label : l.t;
      add({ t: title, d: rep ? d : when, rep: rep, lk: l.k, ck: (l.ck || []).map(function (c) { return { t: c, x: false }; }), note: (l.link ? l.link[0] + ': ' + l.link[1] : '') }, true);
      if (rep && n) add({ t: 'Get ready: ' + l.t.toLowerCase() + ' on ' + label, d: when, lk: l.k }, true);
      s.remove(); toast('✅ Added — Auntie Tobi will show it ' + (n ? nice(when, true) === 'Today' ? 'today' : 'from ' + nice(when, true) : 'on the day'));
    };
  }

  // ───── 💚 sign in (email code — no password) ─────
  var asked = false;
  function askSave() { if (P.signedIn || asked || document.querySelector('.mp-ov')) return; asked = true; signIn(true); }
  function signIn(afterAdd) {
    if (P.signedIn) return settings();
    var s = sheet('<h3>💚 Save your plan</h3><div class="mp-sub" style="font-size:14px">' + (afterAdd ? 'Nice one! ' : '') + 'Keep your plan safe on any phone or computer. Free — just your email, no password.</div>' +
      '<div id="sA"><label>Your first name (optional)</label><input id="sN" maxlength="40" autocomplete="given-name" placeholder="e.g. Ada">' +
      '<label>Email</label><input id="sE" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com">' +
      '<label class="mp-cl" style="font-weight:600;color:#0F1E36;margin-top:12px"><input type="checkbox" id="sNews"> 📰 Send me Auntie Tobi’s Sunday Update — UK news, events and more, every Sunday</label>' +
      '<div class="mp-sub">Your plan is private — only you can see it.</div>' +
      '<div class="mp-err" id="sErr"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="sX">Not now</button><button class="mp-btn" id="sGo">Email me a code</button></div></div>' +
      '<div id="sB" style="display:none"><label>Enter the 6-digit code we emailed to <b id="sTo"></b></label><input id="sC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="font-size:22px;letter-spacing:6px;text-align:center">' +
      '<div class="mp-sub">Can’t see it? Check your spam or junk folder.</div><div class="mp-err" id="sErr2"></div><div class="mp-row" style="justify-content:space-between"><button class="mp-btn l" id="sBack" style="color:#057A44">← Change email</button><button class="mp-btn" id="sOk">💚 Save my plan</button></div></div>');
    $('#sN', s).value = P.name || '';
    $('#sX', s).onclick = function () { s.remove(); };
    var email = '';
    var err = function (id, m) { var e = $(id, s); e.textContent = m; e.style.display = 'block'; };
    $('#sGo', s).onclick = function () {
      var b = this; email = $('#sE', s).value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('#sErr', 'Please enter your email address.');
      b.disabled = true; b.textContent = 'Sending…';
      api('code', { email: email }).then(function () { $('#sA', s).style.display = 'none'; $('#sB', s).style.display = 'block'; $('#sTo', s).textContent = email; $('#sC', s).focus(); gt('plan_code'); })
        .catch(function (e) { err('#sErr', e.message); }).then(function () { b.disabled = false; b.textContent = 'Email me a code'; });
    };
    $('#sBack', s).onclick = function () { $('#sB', s).style.display = 'none'; $('#sA', s).style.display = 'block'; };
    $('#sC', s).oninput = function () { if (this.value.replace(/\D/g, '').length === 6) $('#sOk', s).click(); };
    $('#sOk', s).onclick = function () {
      var b = this, code = $('#sC', s).value.replace(/\D/g, ''); if (code.length !== 6) return err('#sErr2', 'Enter the 6-digit code.');
      if (b.disabled) return; b.disabled = true; b.textContent = 'Checking…';
      api('verify', { email: email, code: code, name: $('#sN', s).value.trim(), news: $('#sNews', s).checked, items: P.items, lists: P.lists }).then(function (r) {
        P.signedIn = true; P.email = r.email; P.name = r.name; P.town = r.town; P.news = r.news; P.rm = r.rm || ''; dirty = {}; dirtyL = {}; mergeIn(r.items); mergeLists(r.lists); store(); s.remove(); refresh();
        gt(r.isNew ? 'plan_signup' : 'plan_signin', { news: r.news ? 1 : 0 }); toast(r.isNew ? '💚 Your plan is saved — welcome!' : '💚 Welcome back' + (r.name ? ', ' + esc(r.name) : '') + '!');
      }).catch(function (e) { b.disabled = false; b.textContent = '💚 Save my plan'; err('#sErr2', e.message); });
    };
    setTimeout(function () { var e = $('#sE', s); if (e) e.focus(); }, 80);
  }
  function settings() {
    var s = sheet('<h3>⚙️ My Plan settings</h3><div class="mp-sub" style="font-size:14px">Signed in as <b>' + esc(P.email) + '</b></div>' +
      '<label>First name</label><input id="pN" maxlength="40" value="' + esc(P.name || '') + '">' +
      '<label>Town or city</label><input id="pT" maxlength="60" value="' + esc(P.town || '') + '" placeholder="e.g. Birmingham">' +
      '<label class="mp-cl" style="font-weight:600;color:#0F1E36;margin-top:12px"><input type="checkbox" id="pNews"' + (P.news ? ' checked' : '') + '> 📰 Send me Auntie Tobi’s Sunday Update</label>' +
      '<label>☀️ Morning email (only on days with something due)</label><select id="pRm">' + [['', 'Off'], ['06', '6am'], ['07', '7am'], ['08', '8am'], ['09', '9am'], ['10', '10am']].map(function (x) { return '<option value="' + x[0] + '"' + ((P.rm || '') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      '<div class="mp-err" id="pErr"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="pX">Close</button><button class="mp-btn" id="pOk">Save</button></div>' +
      '<div style="border-top:1px solid #e2dccc;margin-top:18px;padding-top:12px" class="mp-row"><button class="mp-btn g" id="pOut">Sign out</button><button class="mp-btn l" id="pDel">🗑️ Delete my plan and account</button></div>');
    $('#pX', s).onclick = function () { s.remove(); };
    $('#pOk', s).onclick = function () { var b = this; b.disabled = true; api('prefs', { name: $('#pN', s).value.trim(), town: $('#pT', s).value.trim(), news: $('#pNews', s).checked, rm: $('#pRm', s).value }).then(function (r) { P.name = r.name; P.town = r.town; P.news = r.news; P.rm = r.rm || ''; store(); s.remove(); refresh(); toast('✅ Saved'); }).catch(function (e) { b.disabled = false; $('#pErr', s).textContent = e.message; $('#pErr', s).style.display = 'block'; }); };
    $('#pOut', s).onclick = function () { api('signout').catch(function () {}).then(function () { P = { items: [] }; dirty = {}; store(); s.remove(); refresh(); toast('Signed out — your plan is safe in your account'); }); };
    $('#pDel', s).onclick = function () {
      if (this.dataset.sure !== '1') { this.dataset.sure = '1'; this.textContent = 'Tap again to delete everything — this can’t be undone'; return; }
      api('delete').then(function () { P = { items: [] }; dirty = {}; store(); s.remove(); refresh(); toast('🗑️ Your plan and account are deleted'); }).catch(function (e) { toast(e.message); });
    };
  }


  // ───── 📰 Sunday Update in the app ─────
  function openSunday(week) {
    addCss(); window._currentPage = 'sunday'; window.__homeRender = false;
    var msgs = document.getElementById('messages'); if (!msgs) return;
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="mpSun" class="mp"><div class="mp-card mp-sub">Loading…</div></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); } catch (e) {}
    var show = function (i, past) { drawSunday(i, past); gt('sunday_read', { week: i.week }); };
    if (!week && P.sun && P.sun.latest) show(P.sun.latest, P.sun.past);
    (week ? api('sunday-issue', { week: week }).then(function (r) { show(r.issue, P.sun && P.sun.past); }) : api('sunday-latest').then(function (r) { if (!r.latest) { $('#mpSun').innerHTML = '<div class="mp-card mp-empty"><b>📰 The first Sunday Update is coming soon</b>UK news, events and a business of the week — every Sunday.<div class="mp-row" style="justify-content:center"><button class="mp-btn" data-mp-news>📧 Get it by email</button></div></div>'; bindNews($('#mpSun')); return; } P.sun = { latest: r.latest, past: r.past }; store(); show(r.latest, r.past); }))
      .catch(function (e) { var el = $('#mpSun'); if (el && /Loading/.test(el.textContent)) el.innerHTML = '<div class="mp-card mp-sub">' + esc(e.message) + '</div>'; });
  }
  function drawSunday(i, past) {
    var el = $('#mpSun'); if (!el) return;
    var t = today(), end = addDays(t, 7), mine = live().filter(function (x) { return !x.done && x.d && x.d >= t && x.d < end; }).sort(function (a, b) { return (a.d + (a.tm || '')).localeCompare(b.d + (b.tm || '')); }).slice(0, 6);
    var town = String(P.town || '').toLowerCase(), ev = (i.events || []).slice().sort(function (a, b) { return town ? (String(b.loc).toLowerCase().indexOf(town) >= 0) - (String(a.loc).toLowerCase().indexOf(town) >= 0) : 0; });
    var sec = function (t2, body) { return '<div class="mp-card"><div class="mp-lbl" style="margin-top:0;color:#0F1E36;font-size:13px">' + t2 + '</div>' + body + '</div>'; };
    var link = function (u, txt) { return u ? '<a href="' + esc(u) + '" style="color:#057A44;font-weight:700;text-decoration:none">' + txt + '</a>' : txt; };
    var h = '<div class="mp-top" style="background:linear-gradient(135deg,#FFB81C,#E59A00);color:#0F1E36"><span style="opacity:.8">📰 Auntie Tobi’s Sunday Update · ' + nice(i.week, true) + '</span><b style="margin-top:4px">' + esc(i.subject) + '</b></div>';
    h += '<div class="mp-card"><div class="mp-h" style="font-size:17px;color:#057A44">Happy Sunday' + (P.name ? ', ' + esc(P.name) : '') + '! 💚</div><div style="font-size:14.5px;line-height:1.6;margin-top:6px;white-space:pre-line">' + esc(String(i.intro || '').replace(/^Happy Sunday!?\s*/i, '')) + '</div></div>';
    if (mine.length) h += '<div class="mp-card" style="background:#E9F6EF;border-color:#CDEBD9"><div class="mp-lbl" style="margin-top:0;color:#057A44">💚 Your week ahead</div>' + mine.map(function (x) { return row(x); }).join('') + '</div>';
    if ((i.posts || []).length) h += sec('🇬🇧 This week’s UK updates', i.posts.map(function (p) { return '<div style="padding:9px 0;border-top:1px solid #f1ece0"><div style="font-weight:700;font-size:15px">' + esc(p.emoji || '📰') + ' ' + link(p.url, esc(p.title)) + '</div><div class="mp-sub" style="font-size:13.5px;color:#374151">' + esc(p.summary) + '</div></div>'; }).join(''));
    if (ev.length) h += sec('🎉 Events coming up', ev.map(function (e) { return '<div style="padding:9px 0;border-top:1px solid #f1ece0"><b>' + link(e.url, esc(e.title)) + '</b><div class="mp-sub">📅 ' + (e.date ? nice(e.date, true) : '') + (e.time ? ' · ' + esc(e.time) : '') + (e.loc ? ' · 📍 ' + esc(e.loc) : '') + '</div>' + (e.date && e.date >= t ? '<button class="mp-btn g" style="margin-top:6px;padding:7px 11px;font-size:13px" data-save-ev="' + esc(e.title) + '|' + esc(e.date) + '">➕ Save to My Plan</button>' : '') + '</div>'; }).join(''));
    if (i.biz) h += sec('⭐ Business of the week', (i.biz.img ? '<img src="' + esc(i.biz.img) + '" alt="" style="width:100%;border-radius:10px;margin-bottom:8px" onerror="this.remove()">' : '') + '<b style="font-size:16px">' + esc(i.biz.name) + '</b><div class="mp-sub">' + esc(i.biz.cat) + (i.biz.loc ? ' · 📍 ' + esc(i.biz.loc) : '') + '</div><div style="font-size:14px;margin-top:6px">' + esc(i.biz.desc) + '</div>' + (i.biz.slug ? '<div class="mp-row"><button class="mp-btn" data-biz="' + esc(i.biz.slug) + '">See ' + esc(i.biz.name) + '</button></div>' : ''));
    if ((i.products || []).length) h += sec('🛍️ From the Marketplace', i.products.map(function (p) { return '<div style="padding:8px 0;border-top:1px solid #f1ece0"><b>' + link(p.url, esc(p.name)) + '</b>' + (p.price ? ' <span style="color:#057A44;font-weight:700">· ' + esc(p.price) + '</span>' : '') + '<div class="mp-sub">' + esc(p.business) + '</div></div>'; }).join(''));
    if (i.tip) h += '<div class="mp-card" style="background:#FFF4D6;border-color:#FFE3A3"><div class="mp-lbl" style="margin-top:0;color:#7A5300">💡 Tip of the week</div><div style="font-size:14.5px;line-height:1.55;white-space:pre-line">' + esc(i.tip) + '</div></div>';
    h += P.news ? '<div class="mp-sub" style="text-align:center;margin:4px 0 10px">✅ You get the Sunday Update by email</div>' : '<div class="mp-card" style="text-align:center"><b>📧 Get it by email every Sunday</b><div class="mp-row" style="justify-content:center"><button class="mp-btn" data-mp-news>Yes please</button></div></div>';
    if (past && past.length > 1) h += '<div class="mp-card"><div class="mp-lbl" style="margin-top:0">📰 Past updates</div>' + past.filter(function (p) { return p.week !== i.week; }).slice(0, 10).map(function (p) { return '<div class="mp-it" data-past="' + esc(p.week) + '"><div class="tx">' + esc(p.subject) + '</div><div class="r">' + nice(p.week, true) + '</div></div>'; }).join('') + '</div>';
    h += '<div class="mp-row" style="justify-content:center;margin-bottom:8px"><button class="mp-btn g" data-mp-plan>💚 Open My Plan</button></div>';
    el.innerHTML = h;
    bindRows(el); bindNews(el);
    el.querySelectorAll('[data-past]').forEach(function (r) { r.onclick = function () { openSunday(r.dataset.past); }; });
    el.querySelectorAll('[data-mp-plan]').forEach(function (b) { b.onclick = open; });
    el.querySelectorAll('[data-biz]').forEach(function (b) { b.onclick = function () { if (typeof tobiOpenBiz === 'function') tobiOpenBiz(b.dataset.biz); else location.href = '/?biz=' + encodeURIComponent(b.dataset.biz); }; });
    el.querySelectorAll('[data-save-ev]').forEach(function (b) { b.onclick = function () { var p = b.dataset.saveEv.split('|'); add({ t: '🎉 ' + p[0], d: p[1], src: 'event' }); b.textContent = '✅ Saved'; b.disabled = true; }; });
  }
  function bindNews(root) { root.querySelectorAll('[data-mp-news]').forEach(function (b) { b.onclick = function () { newsSheet(); }; }); }
  // 📧 Sunday Update by email: one tap for My Plan users; email + code for everyone else
  function newsSheet() {
    if (P.signedIn) {
      return api('prefs', { news: true }).then(function (r) { P.news = r.news; store(); refresh(); if (window._currentPage === 'sunday') openSunday(); toast('📰 Done — the Sunday Update will come to ' + esc(P.email)); gt('sunday_signup', { via: 'plan' }); }).catch(function (e) { toast(e.message); });
    }
    var s = sheet('<h3>📰 Auntie Tobi’s Sunday Update</h3><div class="mp-sub" style="font-size:14px">UK news that affects Nigerians, events coming up and a Nigerian business to support — in your inbox every Sunday morning. Free, and you can stop any time.</div>' +
      '<div id="nA"><label>Email</label><input id="nE" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"><div class="mp-err" id="nErr"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="nX">Not now</button><button class="mp-btn" id="nGo">Sign me up</button></div></div>' +
      '<div id="nB" style="display:none"><label>Enter the 6-digit code we emailed you</label><input id="nC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="font-size:22px;letter-spacing:6px;text-align:center"><div class="mp-sub">Can’t see it? Check your spam or junk folder.</div><div class="mp-err" id="nErr2"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn" id="nOk">Confirm</button></div></div>');
    var email = '', err = function (id, m) { var e = $(id, s); e.textContent = m; e.style.display = 'block'; };
    $('#nX', s).onclick = function () { s.remove(); };
    $('#nGo', s).onclick = function () { var b = this; email = $('#nE', s).value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('#nErr', 'Please enter your email address.'); b.disabled = true; api('news-code', { email: email }).then(function () { $('#nA', s).style.display = 'none'; $('#nB', s).style.display = 'block'; $('#nC', s).focus(); }).catch(function (e) { b.disabled = false; err('#nErr', e.message); }); };
    $('#nC', s).oninput = function () { if (this.value.replace(/\D/g, '').length === 6) $('#nOk', s).click(); };
    $('#nOk', s).onclick = function () { var b = this; if (b.disabled) return; b.disabled = true; api('news-verify', { email: email, code: $('#nC', s).value }).then(function () { s.remove(); P.news = true; ls.set('tobi_news_sub', '1'); store(); refresh(); toast('📰 You’re in! See you on Sunday 💚'); gt('sunday_signup', { via: 'news' }); }).catch(function (e) { b.disabled = false; err('#nErr2', e.message); }); };
    setTimeout(function () { var e = $('#nE', s); if (e) e.focus(); }, 80);
  }
  function newsBox() {
    if (P.news || ls.get('tobi_news_sub') === '1' || ls.get('tobi_news_box') === 'no') return;
    var msgs = document.getElementById('messages'); if (!msgs || msgs.querySelector('[data-news-box]')) return;
    addCss(); var d = document.createElement('div'); d.className = 'msg bot mp'; d.setAttribute('data-news-box', '1'); d.style.alignItems = 'flex-start';
    d.innerHTML = '<div style="flex:1;min-width:0"><div class="mp-new" style="background:#FFF4D6;margin:0"><span style="font-size:22px">📰</span><div style="flex:1"><b style="color:#0F1E36">Get Auntie Tobi’s Sunday Update</b> — the week’s UK news, events and more, every Sunday. <a href="#" data-mp-news style="color:#057A44;font-weight:800">Sign up free →</a></div><button class="x" aria-label="Hide">✕</button></div></div>';
    d.querySelector('.x').onclick = function () { ls.set('tobi_news_box', 'no'); d.remove(); };
    bindNews(d);
    var first = msgs.firstElementChild; if (first && first.nextSibling) msgs.insertBefore(d, first.nextSibling); else msgs.appendChild(d);
  }
  function hookNews() {
    ['showNewsAndUpdates', 'showAllNews'].forEach(function (fn) {
      var orig = window[fn]; if (typeof orig !== 'function' || orig._mp) return;
      var wrapped = function () { var r = orig.apply(this, arguments); setTimeout(newsBox, 250); return r; };
      wrapped._mp = 1; try { window[fn] = wrapped; } catch (e) {}
    });
  }


  // ───── 💬 chat: "➕ Add this to My Plan" under answers about MOT, passports, council tax… ─────
  var CHAT = [[/\bMOT\b/, 'mot'], [/nigerian\s+passport|nigeria\s+high\s+commission/i, 'ngpass'], [/\bpassport\b/i, 'ukpass'], [/\be-?visa\b|\bBRP\b|visa\s+(expir|renew|extension)/i, 'evisa'], [/council\s+tax/i, 'ctax'], [/tv\s+licen[cs]e/i, 'tv'], [/self[\s-]assessment|tax\s+return/i, 'sa'], [/driving\s+licen[cs]e/i, 'licence'], [/car\s+insurance/i, 'carins'], [/car\s+tax|vehicle\s+tax|road\s+tax/i, 'cartax'], [/boiler\s+service/i, 'boiler'], [/home\s+insurance|contents\s+insurance/i, 'homeins']];
  function chatKey(txt) { for (var i = 0; i < CHAT.length; i++) if (CHAT[i][0].test(txt)) return CHAT[i][1]; return ''; }
  function hookChat() {
    var orig = window.addMessage; if (typeof orig !== 'function' || orig._mp) return;
    var wrapped = function (role) {
      var div = orig.apply(this, arguments);
      if (role === 'bot' && div && window._currentPage !== 'myplan') {
        var users = document.querySelectorAll('#messages .msg.user'), q = users.length ? users[users.length - 1].textContent : '';
        var key = chatKey(q); if (!key) return div;
        var last = '', same = 0, tries = 0;
        var t = setInterval(function () {   // wait until the answer has finished typing
          var now = div.textContent || ''; same = now === last && now.length > 40 ? same + 1 : 0; last = now; tries++;
          if (same < 2 && tries < 60) return; clearInterval(t);
          if (!document.body.contains(div) || div.querySelector('[data-mp-chat]') || !chatKey(q + ' ' + now)) return;
          var l = LIFE.filter(function (x) { return x.k === key; })[0]; if (!l) return;
          addCss(); var b = document.createElement('button'); b.className = 'mp-btn g'; b.setAttribute('data-mp-chat', key); b.style.cssText = 'margin:8px 0 2px;font-size:13.5px;padding:8px 12px';
          b.textContent = '➕ Add “' + l.t + '” to My Plan'; b.onclick = function () { gt('plan_chat_add', { kind: key }); lifeOne(l); };
          div.appendChild(b);
        }, 500);
      }
      return div;
    };
    wrapped._mp = 1; try { window.addMessage = wrapped; } catch (e) {}
  }

  // ───── menu pill (phone) ─────
  function markPill() { var t = document.querySelector('.pill .mp-newtag'); if (t && ls.get(SEEN) === '1') t.remove(); }
  function addPill() {
    var pills = document.querySelector('.pills'); if (!pills || pills.querySelector('[data-mp-pill]')) return;
    addCss(); var p = document.createElement('div'); p.className = 'pill'; p.setAttribute('data-mp-pill', '1');
    p.innerHTML = '💚 My Plan' + (ls.get(SEEN) === '1' || Date.now() > new Date('2026-12-01').getTime() ? '' : '<span class="mp-newtag">NEW</span>');
    p.onclick = function () { gt('plan_pill'); open(); };
    var home = pills.firstElementChild; if (home && home.nextSibling) pills.insertBefore(p, home.nextSibling); else pills.appendChild(p);
  }

  window.MyPlan = { open: open, openSunday: openSunday, newsSheet: newsSheet, saveEvent: saveEvent, celSheet: celSheet, fill: fill, mountToday: function (id, h, s) { var el = document.getElementById(id); if (!el) return; el.setAttribute('data-myplan-today', '1'); if (h) el.setAttribute('data-h', h); if (s) el.setAttribute('data-s', s); fill(); }, parse: parse, add: add, _state: function () { return P; } };
  function start() { addCss(); addPill(); hookNews(); hookChat(); fill(); boot(); var cq = (location.search.match(/[?&]cel=([^&]*)/) || [])[1];
    if (cq) { var cp = decodeURIComponent(cq).split('|'); view.tab = 'cel'; setTimeout(function () { open(); celSheet(null, { n: cp[0] || '', k: cp[1] === 'anniversary' ? 'wedding' : 'birthday', r: cp[2] || 'friend', y: 0, lead: [3] }); }, 900); }
    else if (/[?&]plan=cel\b/.test(location.search)) { view.tab = 'cel'; setTimeout(open, 900); }
    else if (/[?&]plan=shop\b/.test(location.search)) { view.tab = 'shop'; setTimeout(open, 900); }
    else if (/[?&]plan\b/.test(location.search) || location.pathname === '/my-plan') setTimeout(open, 900); else if (/[?&]sunday\b/.test(location.search)) setTimeout(function () { openSunday(); }, 900); else if (/[?&]news=1\b/.test(location.search)) setTimeout(newsSheet, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
