/*
 * 🌐 Standalone test sites (Nov 2026): lifeinuktest.auntietobi.co.uk and ukdrivingtheorytest.auntietobi.co.uk.
 * The same practice engine as the Auntie Tobi app (lifeuk.js / drive.js / quizplay.js) inside a clean, neutral site.
 * Each page sets window.TEST_SITE = { key: 'lifeuk' | 'drive', url, short, shareText, name, cal } before this file.
 * Pages:  /  (front page)  /practice  /mock  /before  /results  /videos  /signs (driving)  /resume
 * Also works under /test-sites/lifeinuk and /test-sites/ukdriving on the main site (to check before the domains go live).
 * Progress stays on the device (no account). Questions and video quizzes come from Auntie Tobi HQ, as in the app.
 */
(function () {
  'use strict';
  var T = window.TEST_SITE; if (!T) return;
  var BASE = (location.pathname.match(/^\/test-sites\/(lifeinuk|ukdriving)/) || [''])[0];
  var ROUTES = ['practice', 'mock', 'before', 'results', 'videos', 'signs', 'resume', 'today'];
  function M() { return T.key === 'drive' ? window.DriveTest : window.LifeUK; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'test_site', site: T.key }, p || {})); } catch (x) {} }
  // 💚 inside the Auntie Tobi app: this page is the test's welcome page (in a frame). The app does the practice, the plan and My Plan.
  var INAPP = /[?&]inapp=1/.test(location.search) && window.parent !== window;
  function toApp(msg) { try { window.parent.postMessage(Object.assign({ tsApp: 1 }, msg), location.origin); } catch (e) {} }
  function route() { var p = location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, ''); return ROUTES.indexOf(p) >= 0 ? p : ''; }


  // ───── outline icons (one consistent set, drawn with lines like Lucide) ─────
  var P = {
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5a2.5 2.5 0 0 0 0 5H19"/><path d="M8 7h7"/>',
    retry: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>',
    sign: '<path d="M8.5 2.5h7l5 5v7l-5 5h-7l-5-5v-7z"/><path d="M8 12h8"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', ext: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
    pound: '<path d="M17 20H7c1.5-1 2-2.5 2-4.5V9a4 4 0 0 1 7.5-2"/><path d="M6 13h8"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    car: '<path d="M5 17h14v-4l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M5 13h14"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/>',
    hand: '<path d="M12 21a7 7 0 0 1-7-7V9a1.5 1.5 0 0 1 3 0v3"/><path d="M8 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M11 10V4a1.5 1.5 0 0 1 3 0v6"/><path d="M14 10V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-5 7"/>',
  };
  function icon(n) { return '<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || '') + '</svg></span>'; }
  T.icon = icon;
  function paintIcons(scope) { $$('[data-i]', scope).forEach(function (el) { el.outerHTML = icon(el.dataset.i); }); }
  paintIcons(document);

  // ───── the try-it question in the hero (real questions from the bank) ─────
  function demo() {
    var box = $('#tsDemo'), Q = T.sample || []; if (!box || !Q.length) return;
    var at = 0, total = T.key === 'drive' ? 50 : 24, right = 0;
    function draw() {
      if (at >= Q.length) {
        box.innerHTML = '<div class="end"><div class="ring">' + icon('award') + '</div><b>' + right + ' out of ' + Q.length + ' right</b><p>Ready for the real thing? A full mock test is ' + total + ' questions, timed like the actual test.</p>' +
          '<div class="ts-btns" style="justify-content:center;margin-top:0"><button class="ts-b p" data-go="mock">Start a mock test ' + icon('arrow') + '</button><button class="ts-b g" id="dmAgain">Try again</button></div></div>';
        bindGo(box); $('#dmAgain', box).onclick = function () { at = 0; right = 0; draw(); }; return;
      }
      var q = Q[at], opts = q.o.map(function (t, i) { return { t: t, ok: i === 0 }; }).sort(function () { return Math.random() - 0.5; });
      box.innerHTML = '<div class="top"><span class="lbl">Question ' + (at + 1) + ' of ' + Q.length + ' · try it now</span><span class="tm">' + icon('clock') + (T.key === 'drive' ? '56:' : '44:') + (40 - at * 7) + '</span></div>' +
        '<div class="bar"><i style="width:' + Math.round((at + 1) / Q.length * 100) + '%"></i></div><span class="chip">' + q.tag + '</span><div class="q">' + q.q + '</div><div class="ins">Select one answer</div>' +
        opts.map(function (o, i) { return '<button class="ts-op" data-k="' + i + '"><span class="k">' + 'ABCD'[i] + '</span><span>' + o.t + '</span></button>'; }).join('') +
        '<div id="dmEx"></div><div class="foot"><small>Marked instantly, with an explanation</small><span id="dmNext"></span></div>';
      $$('.ts-op', box).forEach(function (b) { b.onclick = function () {
        var k = +b.dataset.k, ok = opts[k].ok; if (ok) right++;
        $$('.ts-op', box).forEach(function (x, i) { x.disabled = true; if (opts[i].ok) { x.classList.add('ok'); x.querySelector('.k').innerHTML = icon('check'); } else if (i === k) { x.classList.add('no'); x.querySelector('.k').innerHTML = icon('x'); } });
        $('#dmEx', box).innerHTML = '<div class="ts-ex">' + icon(ok ? 'checkc' : 'help') + '<div><b>' + (ok ? 'Correct. ' : 'Not quite. ') + '</b>' + q.e + '</div></div>';
        $('#dmNext', box).innerHTML = '<button class="ts-b n" style="padding:11px 18px;font-size:15px">' + (at + 1 < Q.length ? 'Next question' : 'See result') + icon('arrow') + '</button>';
        $('#dmNext button', box).onclick = function () { at++; draw(); };
        gt('site_demo_answer', { value: ok ? 1 : 0 });
      }; });
    }
    draw();
  }

  // ───── moving between the front page and the practice screens ─────
  function show(r) {
    var land = $('#landing'), app = $('#app'), msgs = $('#messages');
    $$('.ts-nav a[data-go]').forEach(function (a) { a.classList.toggle('on', a.dataset.go === r && r !== ''); });
    $('#tsNav') && $('#tsNav').classList.remove('open');
    if (!r) {
      app.hidden = true; land.hidden = false; if (msgs) msgs.innerHTML = '';
      document.body.classList.remove('lu-nochat', 'lu-examon'); document.title = T.title; paintResume(); window.scrollTo(0, 0); return;
    }
    land.hidden = true; app.hidden = false; window.scrollTo(0, 0);
    var m = M(); if (!m) return;
    if (r === 'practice') m.open('home');
    else if (r === 'mock') m.mock();
    else if (r === 'before') m.open('before');
    else if (r === 'results') m.results();
    else if (r === 'resume') m.resume();
    else if (r === 'today' && m.today) m.today();
    else if (r === 'signs' && m.signs) m.signs();
    else if (r === 'videos') { m.open('home'); var n = 0, t = setInterval(function () { var b = $('#vqGo'); if (b) { clearInterval(t); b.click(); } else if (++n > 40) clearInterval(t); }, 150); }
    else m.open('home');
    document.title = (({ practice: 'Practice', mock: 'Mock test', before: 'Before your test', results: 'My results', videos: 'Video quizzes', signs: 'Road signs', resume: 'Practice', today: 'Today’s practice' })[r] || 'Practice') + ' · ' + T.name;
    gt('site_open', { label: r });
  }
  function go(r) { if (INAPP) return toApp({ go: r || '' });
    var url = BASE + '/' + (r || ''); if (location.pathname !== url) history.pushState({ r: r }, '', url); show(r); }
  T.home = function () { go(''); };
  window.addEventListener('popstate', function () { show(route()); });

  // ───── 📅 test date: a countdown on the practice screen + a reminder in the phone's calendar ─────
  function ics(iso) {
    var d = iso.replace(/-/g, ''), n = new Date(iso + 'T12:00:00Z'); n.setUTCDate(n.getUTCDate() + 1);
    var d2 = n.toISOString().slice(0, 10).replace(/-/g, ''), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + T.name + '//EN', 'BEGIN:VEVENT', 'UID:' + T.key + '-' + d + '@auntietobi.co.uk', 'DTSTAMP:' + now,
      'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + d2, 'SUMMARY:' + T.cal, 'DESCRIPTION:Bring the ID you booked with. Practise: ' + T.url,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + T.cal + ' tomorrow', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  T.date = function (cur, done) {
    var today = new Date().toISOString().slice(0, 10);
    var s = document.createElement('div'); s.className = 'ts-scrim';
    s.innerHTML = '<div class="ts-sheet" role="dialog" aria-label="Your test date"><h3>' + icon('calendar') + 'Your test date</h3><p>See a countdown when you practise, and add a reminder to your phone’s calendar.</p>' +
      '<input type="date" id="tsD" min="' + today + '" value="' + (cur || '') + '"><div class="row"><button class="ts-b p" id="tsDS">Save</button>' + (cur ? '<button class="ts-b g" id="tsDR">Remove date</button>' : '') + '<button class="ts-b g" id="tsDX">Cancel</button></div><div id="tsDC"></div></div>';
    document.body.appendChild(s);
    var close = function () { s.remove(); };
    s.onclick = function (e) { if (e.target === s) close(); };
    $('#tsDX', s).onclick = close;
    if ($('#tsDR', s)) $('#tsDR', s).onclick = function () { done(''); close(); };
    $('#tsDS', s).onclick = function () {
      var v = $('#tsD', s).value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { $('#tsD', s).focus(); return; }
      done(v); gt('site_date');
      $('#tsDC', s).innerHTML = '<div class="row"><a class="ts-b p" download="' + T.key + '-test.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(v)) + '">' + icon('plus') + 'Add to my calendar</a><button class="ts-b g" id="tsDK">Done</button></div>';
      $('#tsDS', s).parentNode.style.display = 'none'; $('#tsDK', s).onclick = close;
      $('#tsDC a', s).addEventListener('click', function () { gt('site_calendar'); setTimeout(close, 400); });
    };
  };

  // ───── 🗓️ My plan on the front page + the dashboard with their own numbers ─────
  function paintPlan() {
    var box = $('#tsPlan'), m = M(); if (!box || !m || !m.plan || !m.ready) return;
    var first = window.TestSync && window.TestSync.signedIn() && !paintPlan.synced && m.sync;   // saved progress: bring it in once per visit
    if (first) paintPlan.synced = 1;
    (first ? m.sync() : Promise.resolve()).then(function () { return m.ready(); }).then(function () {
      if ($('#landing').hidden) return;
      var S = m.plan.state(), SV = window.TestSave;
      box.innerHTML = m.plan.card('site') + (SV ? SV.box(S) : ''); m.plan.bind(box, paintPlan); if (SV) { SV.redraw = paintPlan; SV.bind(box, paintPlan); }
      // from the front page these open the practice screens
      $$('[data-tp="today"]', box).forEach(function (b) { b.onclick = function () { go('today'); }; });
      $$('[data-tp="mock"]', box).forEach(function (b) { b.onclick = function () { go('mock'); }; });
      $$('[data-tp="before"]', box).forEach(function (b) { b.onclick = function () { m.plan.flag('before'); go('before'); }; });
      if (INAPP) $$('[data-tp="setup"]', box).forEach(function (b) { b.onclick = function () { toApp({ plan: 1 }); }; });
      paintDash(S);
    }).catch(function () {});
  }
  function paintDash(S) {
    var el = $('.ts-dash'); if (!el || (!S.mocks.length && S.answered < 20)) return;
    var total = T.key === 'drive' ? 50 : 24, pass = T.key === 'drive' ? 43 : 18, lo = Math.round(total * 0.4), sc = function (v) { return Math.max(4, Math.round((v - lo) / (total - lo) * 100)); };
    var ms = S.mocks.slice(-6), last = ms[ms.length - 1];
    var bars = ms.length ? '<div class="ts-chart">' + ms.map(function (x) { return '<span class="' + (x.s >= pass ? 'ok' : '') + '" style="height:' + sc(x.s) + '%"><small>' + x.s + '</small></span>'; }).join('') + '<div class="pass" style="bottom:' + sc(pass) + '%"></div></div><div class="ts-chart-x">' + ms.map(function (x) { return '<span>' + new Date(x.at + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span>'; }).join('') + '</div>'
      : '<div class="tp-note" style="padding:30px 4px;text-align:center">No mock tests yet.<br><button class="ts-b p" data-go="mock" style="margin-top:12px;padding:10px 16px;font-size:15px">Take your first mock</button></div>';
    var pct = S.ready, ring = 'background:conic-gradient(var(--green) ' + pct + '%,var(--line2) 0)';
    var areas = (S.weak.length ? S.weak : S.areas.filter(function (a) { return a.cov != null; }).sort(function (a, b) { return a.cov - b.cov; })).slice(0, 4);
    var weak = areas.map(function (a) { var p = Math.round((a.acc != null ? a.acc : a.cov) * 100); return '<div class="ts-wk"><span>' + a.name + '</span><b>' + p + '%' + (a.acc == null ? ' seen' : '') + '</b><i><em class="' + (p >= 85 ? 'g' : '') + '" style="width:' + p + '%"></em></i></div>'; }).join('');
    el.innerHTML = '<div class="hd"><b>Your progress</b><span class="tag" style="color:var(--green);border-color:var(--green)">Yours</span></div><div class="row">' +
      '<div class="ts-panel"><h4 class="lg">Mock test scores <span><i></i>Pass mark ' + pass + '</span></h4>' + bars + '</div>' +
      '<div class="ts-panel ts-score"><h4 style="align-self:flex-start">Readiness</h4><div class="ts-ring" style="' + ring + '"><b>' + pct + '<small>%</small></b></div><span class="ts-pill ok">' + S.band + '</span></div></div>' +
      '<div class="ts-panel ts-weak"><h4>' + (S.weak.length ? 'Areas to work on' : 'How much you’ve covered') + '</h4>' + weak + '</div>' +
      '<div class="ts-mini"><div><b>' + S.mocks.length + '</b><small>mock tests</small></div><div><b>' + S.answered + '</b><small>questions answered</small></div><div><b>' + (S.left != null && S.left >= 0 ? S.left + (S.left === 1 ? ' day' : ' days') : (S.streak || 0) + '-day') + '</b><small>' + (S.left != null && S.left >= 0 ? 'to your ' + (S.booked ? 'test' : 'goal') : 'streak') + '</small></div></div>';
    bindGo(el);
  }

  // ───── 👋 welcome back (progress on this device) ─────
  function paintResume() {
    paintPlan();
    var box = $('#tsResume'), m = M(); if (!box || !m || !m.summary) return;
    var s; try { s = m.summary(); } catch (e) { return; }
    if (!s || (!s.live && !s.prac)) { box.innerHTML = ''; return; }   // the plan card covers everything else
    var total = T.key === 'drive' ? 50 : 24, line = s.live ? 'You have a mock test in progress' : s.prac ? 'You have a practice set in progress' : s.mocks ? 'Best mock score ' + s.best + '/' + total + ' · ' + s.mocks + ' mock test' + (s.mocks === 1 ? '' : 's') : s.answered ? s.answered + ' practice questions answered' : 'Your test date is saved';
    if (s.mocks && (s.live || s.prac)) line += ' · best score ' + s.best + '/' + total;
    var act = s.live ? ['resume', 'Resume your mock test'] : s.prac ? ['resume', 'Continue practice'] : ['practice', 'Keep practising'];
    box.innerHTML = '<div class="ts-resume"><div class="t"><b>Welcome back</b><span>' + line + (s.date ? (/saved$/.test(line) ? ': ' : ' · test on ') + new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '') + '</span></div><button class="ts-b p" data-go="' + act[0] + '">' + act[1] + icon('arrow') + '</button>' + (s.mocks ? '<button class="ts-b g" data-go="results">' + icon('chart') + 'My results</button>' : '') + '</div>';
    bindGo(box);
  }

  function bindGo(scope) { $$('[data-go]', scope).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); go(b.dataset.go); }; }); }
  function start() {
    if (INAPP) {
      document.body.classList.add('ts-inapp');
      var tell = function () { toApp({ h: Math.ceil(document.documentElement.scrollHeight) }); };
      tell(); if (window.ResizeObserver) new ResizeObserver(tell).observe(document.body); else setInterval(tell, 1000);
    }
    bindGo(document); demo();
    var mb = $('#tsMenu'); if (mb) mb.onclick = function () { $('#tsNav').classList.toggle('open'); };
    if (BASE) $$('a[href="/privacy"]').forEach(function (a) { a.setAttribute('href', '/test-sites/privacy'); });
    $$('a[href="/"]').forEach(function (a) { a.setAttribute('href', BASE + '/'); a.onclick = function (e) { e.preventDefault(); go(''); }; });
    show(route());
    if (!BASE && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
