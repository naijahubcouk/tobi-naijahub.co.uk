/*
 * 🗓️ My plan — a personal study plan for the Life in the UK Test and the Driving Theory Test (Nov 2026).
 * Used by lifeuk.js and drive.js, both inside the Auntie Tobi app and on the standalone test sites.
 * Everything is worked out and kept on this device (localStorage "<key>_plan") — no account, no AI, nothing sent.
 *
 *   var P = TestPlan.create({ key, name, total, pass, unit, areas:[[id,name]], data(), setDate(iso), startSet(ids), startMock(), before(), other })
 *   P.log(q, ok)          every answered question (practice, mock, video quiz)
 *   P.bank(Q)             when the questions have loaded (keeps counts per chapter/topic)
 *   P.card()  / P.bind(el)      the "My plan" card (practice home and the site's front page)
 *   P.today()             start today's practice set   ·   P.setup()  the 3 start questions
 *   P.state()             numbers for dashboards: readiness, weak areas, days left, streak…
 */
(function () {
  'use strict';
  var DAY = 864e5, STEPS = [1, 3, 7];   // a wrong answer comes back after 1, then 3, then 7 days
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addD(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function diff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function nice(s, wd) { return new Date(s + 'T12:00:00').toLocaleDateString('en-GB', wd ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long' }); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'test_plan' }, p || {})); } catch (x) {} }
  var CSS = '.tp{border:1.5px solid var(--line,#E4E2DA);background:#fff;border-radius:18px;padding:16px;margin-bottom:12px;color:#0B1F33;font-family:inherit}' +
    '.tp-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.tp-h b{font-size:17px;display:block;line-height:1.3}.tp-h small{display:block;color:#5B6B7F;font-size:13.5px;margin-top:2px}' +
    '.tp-chip{flex:none;font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px;background:#EEF2F7;color:#16324F;white-space:nowrap}' +
    '.tp-ready{margin:14px 0 4px}.tp-ready .l{display:flex;justify-content:space-between;font-size:14px;font-weight:700}.tp-ready .l span{color:#5B6B7F;font-weight:600}' +
    '.tp-bar{height:9px;background:#EEECE6;border-radius:99px;overflow:hidden;margin-top:6px}.tp-bar i{display:block;height:100%;border-radius:99px;background:var(--green,#057A44)}' +
    '.tp-note{font-size:13.5px;color:#5B6B7F;margin-top:6px;line-height:1.45}.tp-note b{color:#0B1F33}' +
    '.tp-tasks{margin:12px 0 4px}.tp-t{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #EEECE6;font-size:15px}.tp-t:first-child{border-top:0}' +
    '.tp-t i{flex:none;width:24px;height:24px;border-radius:50%;border:2px solid #CBD2D9;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;font-weight:800;color:#fff}' +
    '.tp-t.done i{background:var(--green,#057A44);border-color:var(--green,#057A44)}.tp-t.done span{color:#66768A;text-decoration:line-through}.tp-t span{flex:1;line-height:1.35}.tp-t small{display:block;color:#66768A;font-size:12.5px;text-decoration:none}' +
    '.tp-t button{border:1.5px solid #E4E2DA;background:#fff;border-radius:10px;padding:7px 11px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;color:#0B1F33;flex:none}' +
    '.tp-go{display:block;width:100%;border:0;border-radius:14px;padding:14px;font:inherit;font-size:16px;font-weight:800;cursor:pointer;background:var(--green,#057A44);color:#fff;margin-top:10px}' +
    '.tp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.tp-row button{flex:1;border:1.5px solid #E4E2DA;background:#fff;border-radius:12px;padding:10px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;color:#0B1F33}' +
    '.tp-weak{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.tp-weak span{font-size:12.5px;font-weight:700;border-radius:8px;padding:4px 8px;background:#FBF3E2;color:#7A5300}' +
    '.tp-link{border:0;background:none;color:var(--green,#057A44);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;padding:6px 0 0}' +
    '.tp-scrim{position:fixed;inset:0;background:rgba(11,31,51,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center}' +
    '.tp-sheet{background:#fff;border-radius:22px 22px 0 0;padding:22px 20px 26px;width:100%;max-width:520px;max-height:92vh;overflow:auto;color:#0B1F33;font-family:inherit}' +
    '@media(min-width:600px){.tp-scrim{align-items:center}.tp-sheet{border-radius:22px}}' +
    '.tp-sheet h3{font-size:21px;margin:0}.tp-sheet p.s{color:#5B6B7F;font-size:14.5px;margin:4px 0 6px}.tp-q{font-weight:800;font-size:15.5px;margin:16px 0 8px}' +
    '.tp-opts{display:grid;gap:8px}.tp-opts.c3{grid-template-columns:repeat(3,1fr)}.tp-opts.c2{grid-template-columns:1fr 1fr}' +
    '.tp-o{border:1.5px solid #E4E2DA;background:#fff;border-radius:12px;padding:12px 10px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;color:#0B1F33;text-align:center}' +
    '.tp-o small{display:block;font-weight:500;font-size:12.5px;color:#66768A;margin-top:2px}.tp-o[aria-pressed=true]{border-color:var(--green,#057A44);background:#E7F3EE}' +
    '.tp-sheet input[type=date]{width:100%;font:inherit;font-size:17px;padding:12px;border:1.5px solid #E4E2DA;border-radius:12px;margin-top:8px}' +
    '.tp-sheet .tp-go:disabled{opacity:.45;cursor:default}' +
    '.tp-dots{display:inline-flex;gap:4px;vertical-align:middle;margin-right:6px}.tp-dots em{width:9px;height:9px;border-radius:50%;background:#DDE2E8;display:inline-block}.tp-dots em.on{background:var(--green,#057A44)}' +
    '.tp-sw{display:flex;gap:4px;background:#F2F1EC;border-radius:12px;padding:4px;margin-top:6px}.tp-sw button{flex:1;border:0;background:none;border-radius:9px;padding:8px 4px;font:inherit;font-size:13px;font-weight:700;color:#5B6B7F;cursor:pointer}' +
    '.tp-sw button[aria-pressed=true]{background:#fff;color:#0B1F33;box-shadow:0 1px 3px rgba(11,31,51,.12)}.tp-swl{font-size:12.5px;color:#66768A;margin-top:14px;font-weight:600}' +
    '.tp-after{border:1.5px solid #BFE3CF;background:#F1FAF5;border-radius:16px;padding:14px 16px;margin:0 0 12px;color:#0B1F33;font-size:15px;line-height:1.45}.tp-after b{display:block;font-size:16.5px;margin-bottom:4px}';
  function addCss() { if (document.getElementById('tpCss')) return; var s = document.createElement('style'); s.id = 'tpCss'; s.textContent = CSS; document.head.appendChild(s); }

  function create(C) {
    var KEY = C.key + '_plan';
    function rd() { try { var x = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; x.log = x.log || []; x.due = x.due || {}; x.flags = x.flags || {}; return x; } catch (e) { return { log: [], due: {}, flags: {} }; } }
    function wr(x) { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {} if (C.touch) C.touch(); }   // touch = save it to their email too, if they've saved their progress
    var P = {};

    // ───── what happened ─────
    P.log = function (q, ok) {
      if (!q || q.id == null) return; var x = rd(), now = Date.now();
      x.log.push([q.id, ok ? 1 : 0, now, q.c]); if (x.log.length > 800) x.log = x.log.slice(-800);
      var d = x.due[q.id];
      if (!ok) x.due[q.id] = { s: 0, at: now + STEPS[0] * DAY - 3 * 36e5 };   // back tomorrow
      else if (d && d.at <= now + 6 * 36e5) { if (d.s + 1 >= STEPS.length) delete x.due[q.id]; else x.due[q.id] = { s: d.s + 1, at: now + STEPS[d.s + 1] * DAY - 3 * 36e5 }; }
      wr(x);
      if (C.dayDone && x.prefs && !x.flags['day@' + iso()]) { var se = P.session(); if (se.left === 0) { var y = rd(); y.flags['day@' + iso()] = 1; wr(y); try { C.dayDone(); } catch (e) {} } }
    };
    P.bank = function (Q) {   // question counts per chapter/topic, for coverage when the questions aren't loaded
      if (!Q || !Q.length) return; P.Q = Q; var x = rd(), per = {};
      Q.forEach(function (q) { per[q.c] = (per[q.c] || 0) + 1; }); var nb = { n: Q.length, per: per }; if (JSON.stringify(nb) === JSON.stringify(x.bank)) return; x.bank = nb; try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {}   // not progress: no save
    };
    P.prefs = function () { return rd().prefs || null; };
    P.info = function () { var S = P.state(), pr = S.prefs || {}; return { booked: !!S.booked, date: S.booked ? S.date : '', goal: S.date || '', chunk: +pr.chunk || 0, mins: S.mins, perDay: S.perDay }; };
    function told() { if (C.onPlan && P.prefs()) try { C.onPlan(P.info()); } catch (e) {} }
    P.flag = function (k) { var x = rd(); x.flags[k + '@' + iso()] = 1; wr(x); };

    // ───── the numbers ─────
    P.state = function () {
      var x = rd(), d = C.data() || {}, pr = x.prefs || null, t = iso(), now = Date.now();
      var bank = x.bank || { n: 0, per: {} }, seen = d.seen || {}, seenN = Object.keys(seen).length;
      var cov = bank.n ? Math.min(1, seenN / bank.n) : 0;
      // per area: coverage + accuracy (last 40 answers in that area)
      var seenPer = {}; (P.Q || []).forEach(function (q) { if (seen[q.id]) seenPer[q.c] = (seenPer[q.c] || 0) + 1; });
      var areas = C.areas.map(function (a) {
        var L = x.log.filter(function (l) { return l[3] === a[0]; }).slice(-40), ok = L.filter(function (l) { return l[1]; }).length;
        var tot = bank.per[a[0]] || 0, sn = P.Q ? (seenPer[a[0]] || 0) : null;
        return { id: a[0], name: a[1], n: L.length, acc: L.length ? ok / L.length : null, cov: tot && sn != null ? sn / tot : null };
      });
      var recent = x.log.slice(-100), acc = recent.length ? recent.filter(function (l) { return l[1]; }).length / recent.length : 0;
      var mocks = d.mocks || [], last3 = mocks.slice(-3), mAvg = last3.length ? last3.reduce(function (a, m) { return a + m.s; }, 0) / last3.length : null;
      var mockPart = mAvg == null ? acc * 0.75 : Math.min(1, (mAvg / C.total) / (C.pass / C.total) * 0.85);
      var ready = Math.round(Math.min(1, cov) * 30 + acc * 35 + mockPart * 35);
      var passedTwo = mocks.length >= 2 && mocks.slice(-2).every(function (m) { return m.s >= C.pass; });
      if (ready >= 85 && !passedTwo) ready = Math.min(ready, 84);
      var band = ready >= 85 ? 'Ready' : ready >= 70 ? 'Nearly ready' : ready >= 45 ? 'Getting there' : 'Just starting';
      // days and stage
      var date = d.date || '', booked = !!(pr && pr.booked && date), target = '';
      if (!booked && pr && pr.target && pr.target !== 'ns') target = addD(pr.at || t, { '2w': 14, '1m': 30, '2m': 60 }[pr.target] || 30);
      if (!booked && !pr && date) { booked = true; }
      var goal = booked ? date : target, left = goal ? diff(t, goal) : null, span = goal ? Math.max(1, diff(pr && pr.at ? pr.at : t, goal)) : null;
      var lvl = (pr && pr.level) || 'start', cut = { start: [0.5, 0.75], some: [0.35, 0.7], near: [0.15, 0.55] }[lvl];
      var stage;
      if (left != null && left < 0) stage = booked ? 'after' : 'over';
      else if (left === 0) stage = booked ? 'testday' : 'exam';
      else if (left === 1 && booked) stage = 'eve';
      else if (left != null && left <= 5) stage = 'crash';
      else if (left != null) { var gone = 1 - left / span; stage = gone < cut[0] && cov < 0.9 ? 'learn' : gone < cut[1] ? 'strengthen' : 'exam'; }
      else stage = cov < 0.8 ? 'learn' : ready < 80 ? 'strengthen' : 'exam';
      if (stage === 'learn' && cov >= 0.9) stage = 'strengthen';
      // how much a day
      var mins = (pr && pr.mins) || 20, perDay = { 10: 10, 20: 18, 30: 27 }[mins] || 18;
      var unseen = Math.max(0, bank.n - seenN);
      if (stage === 'learn' && left) { var learnLeft = Math.max(1, Math.round(span * cut[0]) - (span - left)); perDay = Math.max(perDay, Math.ceil(unseen / learnLeft)); }   // enough to see every question in time
      var days = {}; x.log.forEach(function (l) { var k = iso(new Date(l[2])); days[k] = (days[k] || 0) + 1; });
      var missed = pr && pr.at && pr.at < addD(t, -1) && !days[addD(t, -1)] && stage !== 'eve' && stage !== 'testday';
      if (missed && stage !== 'crash') perDay += 5;
      perDay = Math.min(40, Math.max(5, perDay));
      if (stage === 'crash') perDay = Math.min(perDay, 15);
      var streak = 0; for (var k = days[t] ? t : addD(t, -1); days[k]; k = addD(k, -1)) streak++;
      // mock tests: how often, and is one due today?
      var every = { learn: lvl === 'near' ? 5 : 0, strengthen: 4, exam: left != null && left <= 7 ? 1 : 2, crash: 1, eve: 0, testday: 0 }[stage] || 0;
      var lastMock = mocks.length ? mocks[mocks.length - 1].at : '', mockToday = mocks.some(function (m) { return m.at === t; });
      var mockDue = every && (mockToday || !lastMock || diff(lastMock, t) >= every);
      var dueN = Object.keys(x.due).filter(function (id) { return x.due[id].at <= now; }).length;
      // on track? (booked or target date)
      var track = '';
      if (goal && left > 0) { var want = Math.round(20 + 70 * Math.min(1, 1 - left / span)); track = ready >= want - 5 ? 'on' : (pr && pr.at && pr.at <= addD(t, -3)) ? 'behind' : ''; }   // no ‘behind’ in the first few days of a new plan
      var weak = areas.filter(function (a) { return a.n >= 5 && a.acc != null; }).sort(function (a, b) { return a.acc - b.acc; });
      return { prefs: pr, booked: booked, date: goal, left: left, stage: stage, perDay: perDay, doneToday: days[t] || 0, streak: streak, missed: !!missed, mockDue: !!mockDue, mockToday: mockToday,
        every: every, dueN: dueN, ready: ready, band: band, passedTwo: passedTwo, track: track, cov: cov, acc: acc, areas: areas, weak: weak, mocks: mocks, answered: d.n || 0, mins: mins, flags: x.flags, passed: x.passed || '' };
    };

    // ───── today's practice set: 60% the area to work on · 20% wrong answers due again · 20% new ─────
    P.focus = function (S) {
      S = S || P.state(); var A = S.areas.slice();
      if (S.stage === 'learn') { var lo = A.filter(function (a) { return a.cov != null; }).sort(function (a, b) { return a.cov - b.cov; })[0]; if (lo && lo.cov < 0.95) return lo; }
      return S.weak[0] || A.filter(function (a) { return a.cov != null; }).sort(function (a, b) { return a.cov - b.cov; })[0] || A[0];
    };
    P.pick = function (fresh) {
      var Q = P.Q || [], S = P.state(), x = rd(), d = C.data() || {}, seen = d.seen || {}, now = Date.now(), N = S.stage === 'eve' ? 10 : S.perDay, used = {}, out = [];
      // ✂️ today's set is kept for the whole day, so short sessions share out the same mix
      if (!fresh && x.day && x.day.d === iso() && x.day.ids && x.day.ids.length) {
        var did = answeredToday(x), byId = {}; Q.forEach(function (q) { byId[q.id] = q; });
        var left = x.day.ids.filter(function (id) { return !did[id] && (!Q.length || byId[id]); });
        if (left.length) return { ids: left, focus: P.focus(S), all: x.day.ids.length };
      }
      var take = function (list, n) { list.forEach(function (q) { if (n > 0 && !used[q.id]) { used[q.id] = 1; out.push(q.id); n--; } }); };
      var f = P.focus(S), due = shuffle(Q.filter(function (q) { return x.due[q.id] && x.due[q.id].at <= now; }));
      var inF = Q.filter(function (q) { return f && q.c === f.id; }), fNew = shuffle(inF.filter(function (q) { return !seen[q.id]; })), fOld = shuffle(inF.filter(function (q) { return seen[q.id]; }));
      take(due, Math.round(N * 0.2));
      take(S.stage === 'learn' ? fNew.concat(fOld) : (d.wrong ? inF.filter(function (q) { return d.wrong[q.id]; }) : []).concat(fOld, fNew), Math.round(N * 0.6));
      take(shuffle(Q.filter(function (q) { return !seen[q.id]; })), N - out.length);
      take(due, N - out.length); take(shuffle(Q), N - out.length);
      out = shuffle(out);
      if (!fresh) { x.day = { d: iso(), ids: out }; try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {} }   // not progress: no save
      return { ids: out, focus: f, all: out.length };
    };
    function answeredToday(x) { var t = iso(), o = {}; x.log.forEach(function (l) { if (iso(new Date(l[2])) === t) o[l[0]] = 1; }); return o; }
    // ✂️ sessions: all at once (0), or 10 / 5 at a time
    P.session = function (S) {
      S = S || P.state(); var N = S.stage === 'eve' ? 10 : S.perDay, ch = (S.prefs && +S.prefs.chunk) || 0, did = Math.min(S.doneToday, N);
      if (!ch || ch >= N) return { ch: 0, N: N, n: 1, done: did >= N ? 1 : 0, left: did >= N ? 0 : 1, size: N - did, min: Math.max(1, Math.round((N - did) * S.mins / N)) };
      var n = Math.ceil(N / ch), done = did >= N ? n : Math.floor(did / ch), size = done >= n ? ch : Math.min(ch, N - done * ch);
      return { ch: ch, N: N, n: n, done: done, left: n - done, size: size, min: Math.max(1, Math.round(size * S.mins / N)) };
    };
    P.setChunk = function (v) { var x = rd(); if (!x.prefs) return; x.prefs.chunk = +v || 0; wr(x); told(); gt('plan_chunk', { label: C.key + '|' + (+v || 'all') }); };
    function dots(se) { var h = '<span class="tp-dots">'; for (var i = 0; i < se.n && i < 12; i++) h += '<em class="' + (i < se.done ? 'on' : '') + '"></em>'; return h + '</span>'; }
    // after a session: what's left today (for the result screen)
    P.after = function () {
      var se = P.session(); if (!se.ch) return { html: '', next: '' };
      var html = se.left ? '<div class="tp-after"><b>Session ' + se.done + ' of ' + se.n + ' done ✓</b>' + dots(se) + se.left + ' more ' + (se.left === 1 ? 'session' : 'sessions') + ' today — carry on now, or come back later.</div>'
        : '<div class="tp-after"><b>🎉 All ' + se.n + ' sessions done today!</b>' + dots(se) + 'That’s all ' + se.N + ' of today’s questions. See you tomorrow.</div>';
      return { html: plain(html), next: se.left ? 'Next session · ' + se.size + ' questions' : 'Practise more' };
    };
    P.today = function () {
      var se = P.session(), extra = se.left === 0, p = P.pick(extra), ids = p.ids, label;
      if (se.ch) { ids = ids.slice(0, extra ? se.ch : se.size); label = extra ? 'Extra practice' : 'Session ' + (se.done + 1) + ' of ' + se.n; }
      else label = extra ? 'Extra practice' : 'Today’s practice';
      gt('plan_today', { label: C.key + '|' + (se.ch || 'all'), value: ids.length });
      C.startSet(ids, label + (p.focus ? ' · ' + p.focus.name : ''));
    };

    // ───── the "My plan" card ─────
    var STAGE = { learn: ['Learn', 'Cover every ' + C.unit + ' once'], strengthen: ['Strengthen', 'Work on weak areas'], exam: ['Exam practice', 'Mock tests and final revision'],
      crash: ['Final push', 'Mock tests and weak areas only'], eve: ['Day before', 'Light review — no new questions'], testday: ['Test day', 'Good luck!'], after: ['Test done', ''], over: ['Keep going', ''] };
    // the standalone test sites use line icons, not emoji
    function plain(h) { return window.TEST_SITE ? h.replace(/(\p{Extended_Pictographic}|\u2699)\uFE0F?\s?/gu, '') : h; }
    P.card = function (where) { return plain(card(where)); };
    function card(where) {
      addCss(); var S = P.state(), pr = S.prefs;
      if (!pr) {
        if (rd().flags.skip && where !== 'site') return '';
        return '<div class="tp"><div class="tp-h"><div><b>🗓️ Get your personal plan</b><small>Answer 4 quick questions and we’ll plan your practice' + (C.data().date ? ' up to your test on ' + nice(C.data().date) : ' around your test date') + ' — what to do each day, and how ready you are.</small></div></div>' +
          '<button class="tp-go" data-tp="setup">Make my plan · 20 seconds</button>' + (where !== 'site' ? '<button class="tp-link" data-tp="skip">Not now</button>' : '') + '</div>';
      }
      if (S.stage === 'after' && !S.passed) {
        return '<div class="tp"><div class="tp-h"><div><b>🎉 How did your test go?</b><small>Your test was on ' + nice(S.date) + '.</small></div></div><div class="tp-row"><button data-tp="passed">I passed!</button><button data-tp="again">Not this time</button></div></div>';
      }
      if (S.passed) return '<div class="tp"><div class="tp-h"><div><b>🎉 Congratulations on passing!</b><small>Well done — your practice paid off.' + (C.other ? ' ' + C.other.text : '') + '</small></div></div>' + (C.other ? '<button class="tp-go" data-tp="other">' + esc(C.other.button) + '</button>' : '') + '<button class="tp-link" data-tp="setup">Start a new plan</button></div>';
      var st = STAGE[S.stage] || STAGE.learn, t = iso(), tasks = [];
      var head = new Date().toLocaleDateString('en-GB', { weekday: 'long' }) + (S.left != null && S.left > 0 ? ' · ' + S.left + ' day' + (S.left === 1 ? '' : 's') + ' to ' + (S.booked ? 'your test' : 'your goal') : S.stage === 'testday' ? ' · test day' : '');
      if (S.stage === 'testday') tasks.push(['before', 'Check what to bring and when to arrive', 'Your original ID — the same one you booked with', !!S.flags['before@' + t]]);
      else if (S.stage === 'eve') { var se0 = P.session(S); tasks.push(['today', 'A light 10-question review' + (se0.ch ? ' · ' + se0.n + ' sessions of ' + se0.ch : ''), 'Nothing new today — just stay sharp', S.doneToday >= 10, se0]); tasks.push(['before', 'Check what to bring and when to arrive', 'Have it ready tonight', !!S.flags['before@' + t]]); }
      else {
        var f = P.focus(S);
        var se = P.session(S);
        tasks.push(['today', 'Today’s ' + S.perDay + ' questions' + (se.ch ? ' · ' + se.n + ' sessions of ' + se.ch : '') + (f ? ' — ' + f.name : ''),
          (se.ch ? se.done + ' of ' + se.n + ' done · ' : '') + (S.dueN ? Math.min(S.dueN, Math.round(S.perDay * 0.2)) + ' wrong answers to retake · ' : '') + 'about ' + S.mins + ' minutes' + (se.ch ? ' in total' : '') + (S.missed && S.stage !== 'crash' ? ' · a little longer after a missed day' : ''), S.doneToday >= S.perDay, se]);
        if (S.mockDue) tasks.push(['mock', 'Mock test' + (S.mocks.length ? ' #' + (S.mocks.length + (S.mockToday ? 0 : 1)) : ''), C.total + ' questions, timed like the real test', S.mockToday]);
      }
      var rdy = '<div class="tp-ready"><div class="l">Readiness <span>' + S.ready + '% · ' + S.band + '</span></div><div class="tp-bar"><i style="width:' + S.ready + '%"></i></div>' +
        '<div class="tp-note">' + (S.track === 'on' ? '✅ <b>On track</b> for ' + nice(S.date) + '.' : S.track === 'behind' ? '⚠️ <b>A little behind</b> — add 5 minutes a day to catch up.' : '') +
        (S.ready >= 85 && !S.booked ? ' <b>You’re ready to book!</b>' : S.ready >= 80 && !S.passedTwo ? ' Pass 2 mock tests in a row to be fully ready.' : '') + '</div></div>';
      return '<div class="tp"><div class="tp-h"><div><b>🗓️ ' + esc(head) + '</b><small>' + esc(st[1]) + (S.streak > 1 ? ' · 🔥 ' + S.streak + '-day streak' : '') + '</small></div><span class="tp-chip">' + esc(st[0]) + '</span></div>' +
        rdy + '<div class="tp-tasks">' + tasks.map(function (k, i) { return '<div class="tp-t' + (k[3] ? ' done' : '') + '"><i>' + (k[3] ? '✓' : '') + '</i><span>' + esc(k[1]) + '<small>' + (k[4] && k[4].ch && !k[3] ? dots(k[4]) : '') + esc(k[2]) + '</small></span>' + (k[3] ? '' : i ? '<button data-tp="' + k[0] + '">Start</button>' : '') + '</div>'; }).join('') + '</div>' +
        (tasks[0] && !tasks[0][3] ? '<button class="tp-go" data-tp="' + tasks[0][0] + '">' + (tasks[0][0] === 'today' ? (tasks[0][4] && tasks[0][4].ch ? 'Start session ' + (tasks[0][4].done + 1) + ' · about ' + tasks[0][4].min + ' min' : 'Start today’s practice') : 'Open the checklist') + '</button>' : tasks.some(function (k) { return !k[3]; }) ? '' : '<div class="tp-note" style="margin-top:10px">🎉 <b>All done for today.</b> Come back tomorrow — or practise more below.</div>') +
        (S.weak.length && S.stage !== 'eve' && S.stage !== 'testday' ? '<div class="tp-note" style="margin-top:12px">Areas to work on:</div><div class="tp-weak">' + S.weak.slice(0, 3).map(function (a) { return '<span>' + esc(a.name) + ' · ' + Math.round(a.acc * 100) + '%</span>'; }).join('') + '</div>' : '') +
        (S.stage !== 'testday' ? '<div class="tp-swl">How I study today</div><div class="tp-sw">' + [[0, 'All at once'], [10, '10 at a time'], [5, '5 at a time']].map(function (c) { return '<button data-tp="chunk:' + c[0] + '" aria-pressed="' + (((pr && +pr.chunk) || 0) === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' : '') +
        '<button class="tp-link" data-tp="setup">⚙️ Change my plan</button>' + (C.myPlan ? '<button class="tp-link" data-tp="myplan" style="margin-left:16px">💚 Open in My Plan</button>' : '') + '</div>';
    };
    P.bind = function (el, redraw) {
      if (!el) return;
      [].forEach.call(el.querySelectorAll('[data-tp]'), function (b) { b.onclick = function () {
        var a = b.dataset.tp;
        if (a === 'setup') return P.setup(redraw);
        if (a === 'skip') { var x = rd(); x.flags.skip = 1; wr(x); if (redraw) redraw(); return; }
        if (a === 'today') return P.today();
        if (a === 'myplan' && C.myPlan) return C.myPlan(P.info());
        if (a.indexOf('chunk:') === 0) { P.setChunk(a.slice(6)); if (redraw) redraw(); return; }
        if (a === 'mock') return C.startMock();
        if (a === 'before') { P.flag('before'); return C.before(); }
        if (a === 'passed') { var y = rd(); y.passed = iso(); wr(y); if (C.onPlan) try { C.onPlan({ passed: true }); } catch (e) {} gt('plan_passed', { label: C.key }); if (redraw) redraw(); return; }
        if (a === 'again') { C.setDate(''); var z = rd(); if (z.prefs) { z.prefs.booked = false; z.prefs.at = iso(); } wr(z); return P.setup(redraw); }
        if (a === 'other' && C.other) { location.href = C.other.url; }
      }; });
    };

    // ───── the 3 start questions ─────
    P.setup = function (redraw) {
      addCss(); var x = rd(), d = C.data() || {}, cur = x.prefs || {}, A = { booked: cur.booked != null ? cur.booked : !!d.date, date: d.date || '', target: cur.target || '1m', level: cur.level || '', mins: cur.mins || 20, chunk: cur.chunk != null ? +cur.chunk : (x.prefs ? 0 : 10) };
      var s = document.createElement('div'); s.className = 'tp-scrim'; document.body.appendChild(s);
      var o = function (k, v, t, sub) { return '<button class="tp-o" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (String(A[k]) === String(v)) + '">' + t + (sub ? '<small>' + sub + '</small>' : '') + '</button>'; };
      function draw() {
        var min = iso();
        s.innerHTML = plain('<div class="tp-sheet" role="dialog" aria-label="My plan"><h3>🗓️ Your personal plan</h3><p class="s">Four quick questions. You can change them any time.</p>' +
          '<div class="tp-q">1 · Have you booked your test?</div><div class="tp-opts c2">' + o('booked', true, 'Yes, I’ve booked') + o('booked', false, 'Not yet') + '</div>' +
          (A.booked ? '<input type="date" id="tpD" min="' + min + '" value="' + esc(A.date) + '" aria-label="Test date">'
            : '<div class="tp-q" style="margin-top:12px;font-size:14.5px">When would you like to be ready?</div><div class="tp-opts c2">' + o('target', '2w', 'In 2 weeks') + o('target', '1m', 'In a month') + o('target', '2m', 'In 2 months+') + o('target', 'ns', 'Not sure yet') + '</div>') +
          '<div class="tp-q">2 · How far along are you?</div><div class="tp-opts c3">' + o('level', 'start', 'Just starting') + o('level', 'some', 'Studied a bit') + o('level', 'near', 'Nearly ready') + '</div>' +
          '<div class="tp-q">3 · How much time a day?</div><div class="tp-opts c3">' + o('mins', 10, '10 min') + o('mins', 20, '20 min') + o('mins', 30, '30+ min') + '</div>' +
          '<div class="tp-q">4 · How would you like to study each day?</div><div class="tp-opts c3">' + o('chunk', 0, 'All at once', 'One sitting') + o('chunk', 10, '10 at a time', 'Short sessions') + o('chunk', 5, '5 at a time', 'Quick bites') + '</div>' +
          '<button class="tp-go" id="tpOk"' + (ok() ? '' : ' disabled') + '>Make my plan</button><div class="tp-row" style="margin-top:6px"><button id="tpX" style="border:0">Cancel</button></div></div>');
        [].forEach.call(s.querySelectorAll('.tp-o'), function (b) { b.onclick = function () { var k = b.dataset.k, v = b.dataset.v; A[k] = v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? +v : v; draw(); }; });
        var di = s.querySelector('#tpD'); if (di) di.oninput = function () { A.date = di.value; s.querySelector('#tpOk').disabled = !ok(); };
        s.querySelector('#tpX').onclick = function () { s.remove(); };
        s.querySelector('#tpOk').onclick = function () {
          var y = rd(); y.prefs = { booked: !!A.booked, target: A.booked ? '' : A.target, level: A.level, mins: A.mins, chunk: +A.chunk || 0, at: iso() }; delete y.passed; delete y.flags.skip; wr(y);
          if (A.booked && A.date) C.setDate(A.date); else if (!A.booked && d.date) C.setDate('');
          gt('plan_made', { label: C.key + '|' + (A.booked ? 'booked' : A.target) + '|' + A.level + '|' + A.mins + '|' + (A.chunk || 'all') });
          told(); s.remove(); if (redraw) redraw();
        };
      }
      function ok() { return A.level && (!A.booked || /^\d{4}-\d{2}-\d{2}$/.test(A.date)); }
      s.onclick = function (e) { if (e.target === s) s.remove(); };
      draw();
    };
    return P;
  }
  // two copies of a plan (this device + saved): the newer one wins, history is added together (same rules as studio-lib/learners.js)
  function merge(nw, ol) {
    if (!nw) return ol || null; if (!ol) return nw;
    var out = JSON.parse(JSON.stringify(nw)), seen = {};
    out.log = [].concat(ol.log || [], nw.log || []).filter(function (l) { return l && l.length >= 3; })
      .filter(function (l) { var k = l[0] + '|' + l[2]; if (seen[k]) return false; seen[k] = 1; return true; }).sort(function (a, b) { return a[2] - b[2]; }).slice(-800);
    out.due = Object.assign({}, ol.due || {}, nw.due || {}); out.flags = Object.assign({}, ol.flags || {}, nw.flags || {});
    if (!out.prefs || (ol.prefs && String(ol.prefs.at || '') > String(out.prefs.at || ''))) out.prefs = ol.prefs || out.prefs;
    if (!out.passed && ol.passed) out.passed = ol.passed; if (!out.bank && ol.bank) out.bank = ol.bank;
    return out;
  }
  window.TestPlan = { create: create, merge: merge };
})();
