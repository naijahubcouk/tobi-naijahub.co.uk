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
  P.items = Array.isArray(P.items) ? P.items : [];
  var dirty = {}, syncT = null, syncing = false, view = { tab: 'plan', showDone: false };
  function store() { ls.set(KEY, JSON.stringify({ items: P.items, signedIn: !!P.signedIn, email: P.email || '', name: P.name || '', town: P.town || '', news: !!P.news })); }
  var live = function () { return P.items.filter(function (i) { return !i.del; }); };

  function api(action, body) {
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Studio': '1' }, body: JSON.stringify(Object.assign({ action: action }, body || {})) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.message || 'Something went wrong — please try again.'); e.code = j.error; e.status = r.status; throw e; } return j; }); });
  }
  function mergeIn(items) {
    var map = {}; P.items.forEach(function (i) { map[i.id] = i; });
    (items || []).forEach(function (i) { var o = map[i.id]; if (!o || (i.up || 0) >= (o.up || 0)) map[i.id] = i; });
    P.items = Object.keys(map).map(function (k) { return map[k]; });
  }
  function change(it) { it.up = Date.now(); dirty[it.id] = 1; store(); if (P.signedIn) { clearTimeout(syncT); syncT = setTimeout(sync, 700); } refresh(); }
  function sync() {
    if (!P.signedIn || syncing) return;
    var ids = Object.keys(dirty); if (!ids.length) return;
    var send = P.items.filter(function (i) { return dirty[i.id]; }); dirty = {}; syncing = true;
    api('save', { items: send }).then(function (r) { syncing = false; mergeIn(r.items); store(); if (Object.keys(dirty).length) sync(); })
      .catch(function (e) { syncing = false; send.forEach(function (i) { dirty[i.id] = 1; }); if (e.status === 401) { P.signedIn = false; store(); refresh(); } else setTimeout(sync, 15000); });
  }
  function boot() {
    api('me').then(function (r) {
      if (r.signedIn) { P.signedIn = true; P.email = r.email; P.name = r.name; P.town = r.town; P.news = r.news; var local = P.items; P.items = []; mergeIn(r.items); local.forEach(function (i) { var s = P.items.filter(function (x) { return x.id === i.id; })[0]; if (!s || (i.up || 0) > (s.up || 0)) { mergeIn([i]); dirty[i.id] = 1; } }); sync(); }
      else if (P.signedIn) { P.signedIn = false; }
      store(); refresh();
    }).catch(function () {});
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
  function todayHtml(h, s) {
    var g = groups(), due = g.over.concat(g.today), has = live().length > 0, hideNew = ls.get(HIDE) === '1';
    var name = P.name ? esc(P.name) : '';
    var d = new Date(), dateLine = cap(DAYS[d.getDay()]) + ' ' + d.getDate() + ' ' + cap(MONTHS[d.getMonth()]);
    h = h || '👋🏾 Welcome back!';
    if (name) h = /!/.test(h) ? h.replace('!', ', <span style="color:#057A44">' + name + '</span>!') : h + ', <span style="color:#057A44">' + name + '</span>';
    var html = '<div class="mp mp-card mp-today"><div class="mp-h">' + h + '</div><div class="mp-sub">📅 ' + dateLine + (s ? ' · ' + s : '') + '</div>';
    if (has) {
      html += '<div class="mp-lbl">Your day</div>';
      if (due.length) html += due.slice(0, 3).map(function (i) { return row(i); }).join('') + (due.length > 3 ? '<div class="mp-sub" style="margin-top:6px">+ ' + (due.length - 3) + ' more in My Plan</div>' : '');
      else { var nx = g.week.concat(g.later)[0]; html += '<div class="mp-sub" style="font-size:14px;color:#0F1E36;margin-top:2px">Nothing due today 🎉' + (nx ? ' Next: <b>' + esc(nx.t) + '</b> · ' + nice(nx.d) : '') + '</div>'; }
      html += '<div class="mp-row"><button class="mp-btn" data-mp-open>💚 Open My Plan</button><button class="mp-btn g" data-mp-add>＋ Add</button></div>';
    } else if (!hideNew) {
      html += '<div class="mp-new"><span style="font-size:22px">💚</span><div style="flex:1"><b>New: My Plan</b> — remember bills, birthdays and shopping in one place. <a href="#" data-mp-open style="color:#057A44;font-weight:800">Try it →</a></div><button class="x" data-mp-hide aria-label="Hide">✕</button></div>';
    }
    return html + '</div>';
  }
  function bindToday(root) {
    root.querySelectorAll('[data-mp-open]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); open(); }; });
    root.querySelectorAll('[data-mp-add]').forEach(function (b) { b.onclick = function () { open(); setTimeout(function () { var i = $('#mpQ'); if (i) i.focus(); }, 150); }; });
    root.querySelectorAll('[data-mp-hide]').forEach(function (b) { b.onclick = function () { ls.set(HIDE, '1'); gt('plan_hide_new'); fill(); }; });
    bindRows(root);
  }
  function fill() {
    addCss();
    document.querySelectorAll('[data-myplan-today]').forEach(function (el) { el.innerHTML = todayHtml(el.getAttribute('data-h'), el.getAttribute('data-s')); bindToday(el); });
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
      '<div class="mp-tabs"><button class="on">📋 Plan</button><button data-soon="🎉 Celebration dates">🎉 Celebrations<span class="soon">coming soon</span></button><button data-soon="🛒 Shopping lists">🛒 Shopping<span class="soon">coming soon</span></button></div>';
    if (has && !P.signedIn) h += '<div class="mp-warn"><span style="flex:1">⚠️ <b>Not saved yet</b> — it’s only on this phone. Save it to your free Auntie Tobi account.</span><button class="mp-btn" data-mp-save>💚 Save my plan</button></div>';
    h += '<form class="mp-add" id="mpF"><input id="mpQ" placeholder="✏️ Type it — e.g. “Pay rent every 1st”" autocomplete="off" maxlength="140"><button class="mp-btn" aria-label="Add">＋</button></form><div class="mp-hint" id="mpHint"></div>';
    if (!has) {
      h += '<div class="mp-card"><div class="mp-empty"><b>Your day is looking clear! 💚</b>Add something to get started — bills, appointments, things to renew. <br><span style="font-size:13px;color:#6B7280">Free — sign in with just your email, no password.</span></div>' +
        '<div class="mp-welcome"><button data-w="item"><span>📋</span><div>Add something to remember<small>“Dentist Friday 4pm”, “Pay rent every 1st”</small></div></button>' +
        '<button data-w="life"><span>🗂️</span><div>Add UK life dates<small>Passport, eVisa, MOT, car insurance, tax return…</small></div></button>' +
        '<button data-w="cel" disabled><span>🎉</span><div>Add a birthday or anniversary<small>Coming soon</small></div></button>' +
        '<button data-w="shop" disabled><span>🛒</span><div>Start a shopping list<small>Coming soon</small></div></button></div></div>';
    } else {
      var sec = function (label, list, red) { return list.length ? '<div class="mp-lbl' + (red ? ' red' : '') + '">' + label + '</div>' + list.map(function (i) { return row(i); }).join('') : ''; };
      var body = sec('Overdue', g.over, true) + sec('Today', g.today) + sec('Next 7 days', g.week) + sec('Later', g.later) + sec('No date', g.none);
      if (!g.over.length && !g.today.length) body = '<div class="mp-sub" style="font-size:14px;color:#0F1E36;padding:4px 0 2px">Nothing due today 🎉</div>' + body;
      h += '<div class="mp-card">' + body + '</div>';
      if (g.done.length) h += '<div class="mp-card"><div class="mp-it" data-done-toggle style="border:0;padding:2px 0"><div class="tx" style="font-weight:700">✅ Done (' + g.done.length + ')</div><div class="r">' + (view.showDone ? 'Hide ▴' : 'Show ▾') + '</div></div>' + (view.showDone ? g.done.slice(0, 40).map(function (i) { return row(i, { noDate: true }); }).join('') : '') + '</div>';
      h += '<button class="mp-card" data-w="life" style="width:100%;text-align:left;cursor:pointer;font-family:inherit"><b style="font-size:14.5px">🗂️ Add UK life dates</b><div class="mp-sub">Passport, eVisa, MOT, car insurance, tax return…</div></button>';
    }
    h += '<div style="text-align:center;font-size:12.5px;color:#6B7280;margin:6px 0 4px">' + (P.signedIn ? '💚 Saved to ' + esc(P.email) + ' · <a href="#" data-mp-settings style="color:#057A44;font-weight:700">Settings</a>' : '<a href="#" data-mp-save style="color:#057A44;font-weight:700">💚 Sign in to save your plan</a>') + '</div>';
    root.innerHTML = h;
    // add box with live preview of what Auntie Tobi understood
    var q = $('#mpQ', root), hint = $('#mpHint', root);
    q.oninput = function () { var p = parse(q.value); var bits = [p.d ? '📅 ' + nice(p.d, true) : '', p.tm ? '🕒 ' + niceTime(p.tm) : '', p.rep ? '🔁 ' + REP[p.rep].toLowerCase() : ''].filter(Boolean); hint.style.display = bits.length && p.t ? 'block' : 'none'; hint.innerHTML = '<b>' + esc(p.t) + '</b> · ' + bits.join(' · '); };
    $('#mpF', root).onsubmit = function (e) { e.preventDefault(); var v = q.value.trim(); if (!v) { q.focus(); return; } var p = parse(v); if (!p.t) p.t = v; add({ t: p.t, d: p.d, tm: p.tm, rep: p.rep, dom: p.dom }); q.value = ''; hint.style.display = 'none'; };
    root.querySelectorAll('[data-soon]').forEach(function (b) { b.onclick = function () { toast(b.dataset.soon + ' are coming soon 💚'); }; });
    root.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { if (b.dataset.w === 'item') { q.focus(); } else if (b.dataset.w === 'life') lifeSheet(); }; });
    root.querySelectorAll('[data-mp-save]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); signIn(); }; });
    root.querySelectorAll('[data-mp-settings]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); settings(); }; });
    var dt = $('[data-done-toggle]', root); if (dt) dt.onclick = function () { view.showDone = !view.showDone; render(); };
    bindRows(root);
  }
  function refresh() { if (window._currentPage === 'myplan') render(); fill(); }

  // ───── ✏️ one item ─────
  function edit(id) {
    var it = P.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
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
      api('verify', { email: email, code: code, name: $('#sN', s).value.trim(), news: $('#sNews', s).checked, items: P.items }).then(function (r) {
        P.signedIn = true; P.email = r.email; P.name = r.name; P.town = r.town; P.news = r.news; dirty = {}; mergeIn(r.items); store(); s.remove(); refresh();
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
      '<div class="mp-err" id="pErr"></div><div class="mp-row" style="justify-content:flex-end"><button class="mp-btn g" id="pX">Close</button><button class="mp-btn" id="pOk">Save</button></div>' +
      '<div style="border-top:1px solid #e2dccc;margin-top:18px;padding-top:12px" class="mp-row"><button class="mp-btn g" id="pOut">Sign out</button><button class="mp-btn l" id="pDel">🗑️ Delete my plan and account</button></div>');
    $('#pX', s).onclick = function () { s.remove(); };
    $('#pOk', s).onclick = function () { var b = this; b.disabled = true; api('prefs', { name: $('#pN', s).value.trim(), town: $('#pT', s).value.trim(), news: $('#pNews', s).checked }).then(function (r) { P.name = r.name; P.town = r.town; P.news = r.news; store(); s.remove(); refresh(); toast('✅ Saved'); }).catch(function (e) { b.disabled = false; $('#pErr', s).textContent = e.message; $('#pErr', s).style.display = 'block'; }); };
    $('#pOut', s).onclick = function () { api('signout').catch(function () {}).then(function () { P = { items: [] }; dirty = {}; store(); s.remove(); refresh(); toast('Signed out — your plan is safe in your account'); }); };
    $('#pDel', s).onclick = function () {
      if (this.dataset.sure !== '1') { this.dataset.sure = '1'; this.textContent = 'Tap again to delete everything — this can’t be undone'; return; }
      api('delete').then(function () { P = { items: [] }; dirty = {}; store(); s.remove(); refresh(); toast('🗑️ Your plan and account are deleted'); }).catch(function (e) { toast(e.message); });
    };
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

  window.MyPlan = { open: open, fill: fill, mountToday: function (id, h, s) { var el = document.getElementById(id); if (!el) return; el.setAttribute('data-myplan-today', '1'); if (h) el.setAttribute('data-h', h); if (s) el.setAttribute('data-s', s); fill(); }, parse: parse, add: add, _state: function () { return P; } };
  function start() { addCss(); addPill(); fill(); boot(); if (/[?&]plan\b/.test(location.search) || location.pathname === '/my-plan') setTimeout(open, 900); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
