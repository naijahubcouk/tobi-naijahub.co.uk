/*
 * 🌐 Standalone test sites (Nov 2026): lifeinuk.auntietobi.co.uk and ukdriving.auntietobi.co.uk.
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
  var ROUTES = ['practice', 'mock', 'before', 'results', 'videos', 'signs', 'resume'];
  function M() { return T.key === 'drive' ? window.DriveTest : window.LifeUK; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'test_site', site: T.key }, p || {})); } catch (x) {} }
  function route() { var p = location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, ''); return ROUTES.indexOf(p) >= 0 ? p : ''; }

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
    else if (r === 'signs' && m.signs) m.signs();
    else if (r === 'videos') { m.open('home'); var n = 0, t = setInterval(function () { var b = $('#vqGo'); if (b) { clearInterval(t); b.click(); } else if (++n > 40) clearInterval(t); }, 150); }
    else m.open('home');
    document.title = (({ practice: 'Practice', mock: 'Mock test', before: 'Before your test', results: 'My results', videos: 'Video quizzes', signs: 'Road signs', resume: 'Practice' })[r] || 'Practice') + ' · ' + T.name;
    gt('site_open', { label: r });
  }
  function go(r) { var url = BASE + '/' + (r || ''); if (location.pathname !== url) history.pushState({ r: r }, '', url); show(r); }
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
    s.innerHTML = '<div class="ts-sheet" role="dialog" aria-label="Your test date"><h3>📅 Your test date</h3><p>See a countdown when you practise, and add a reminder to your phone’s calendar.</p>' +
      '<input type="date" id="tsD" min="' + today + '" value="' + (cur || '') + '"><div class="row"><button class="ts-b p" id="tsDS">Save</button>' + (cur ? '<button class="ts-b g" id="tsDR">Remove date</button>' : '') + '<button class="ts-b g" id="tsDX">Cancel</button></div><div id="tsDC"></div></div>';
    document.body.appendChild(s);
    var close = function () { s.remove(); };
    s.onclick = function (e) { if (e.target === s) close(); };
    $('#tsDX', s).onclick = close;
    if ($('#tsDR', s)) $('#tsDR', s).onclick = function () { done(''); close(); };
    $('#tsDS', s).onclick = function () {
      var v = $('#tsD', s).value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { $('#tsD', s).focus(); return; }
      done(v); gt('site_date');
      $('#tsDC', s).innerHTML = '<div class="row"><a class="ts-b p" download="' + T.key + '-test.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(v)) + '">➕ Add to my calendar</a><button class="ts-b g" id="tsDK">Done</button></div>';
      $('#tsDS', s).parentNode.style.display = 'none'; $('#tsDK', s).onclick = close;
      $('#tsDC a', s).addEventListener('click', function () { gt('site_calendar'); setTimeout(close, 400); });
    };
  };

  // ───── 👋 welcome back (progress on this device) ─────
  function paintResume() {
    var box = $('#tsResume'), m = M(); if (!box || !m || !m.summary) return;
    var s; try { s = m.summary(); } catch (e) { return; }
    if (!s || (!s.live && !s.prac && !s.mocks && !s.answered && !s.date)) { box.innerHTML = ''; return; }
    var total = T.key === 'drive' ? 50 : 24, line = s.live ? 'You have a mock test in progress' : s.prac ? 'You have a practice set in progress' : s.mocks ? 'Best mock score ' + s.best + '/' + total + ' · ' + s.mocks + ' mock test' + (s.mocks === 1 ? '' : 's') : s.answered ? s.answered + ' practice questions answered' : 'Your test date is saved';
    if (s.mocks && (s.live || s.prac)) line += ' · best score ' + s.best + '/' + total;
    var act = s.live ? ['resume', '⏱ Resume your mock test'] : s.prac ? ['resume', '▶️ Continue practice'] : ['practice', 'Keep practising →'];
    box.innerHTML = '<div class="ts-resume"><div class="t"><b>👋 Welcome back</b><span>' + line + (s.date ? (/saved$/.test(line) ? ': ' : ' · test on ') + new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '') + '</span></div><button class="ts-b p" data-go="' + act[0] + '">' + act[1] + '</button>' + (s.mocks ? '<button class="ts-b g" data-go="results">📈 My results</button>' : '') + '</div>';
    bindGo(box);
  }

  function bindGo(scope) { $$('[data-go]', scope).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); go(b.dataset.go); }; }); }
  function start() {
    bindGo(document);
    var mb = $('#tsMenu'); if (mb) mb.onclick = function () { $('#tsNav').classList.toggle('open'); };
    if (BASE) $$('a[href="/privacy"]').forEach(function (a) { a.setAttribute('href', '/test-sites/privacy'); });
    $$('a[href="/"]').forEach(function (a) { a.setAttribute('href', BASE + '/'); a.onclick = function (e) { e.preventDefault(); go(''); }; });
    show(route());
    if (!BASE && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
