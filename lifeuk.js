/*
 * 🇬🇧 Life in the UK Test — practice inside the Auntie Tobi app.
 * Questions: /lifeuk-q.json, written from the official handbook "Life in the United Kingdom: A Guide for New Residents"
 * (5 chapters). Test facts are from GOV.UK (checked 21 Nov 2026). Marking is done here on the phone — instant, no AI.
 * Progress is kept on this device (localStorage "tobi_lituk").
 */
(function () {
  'use strict';
  var KEY = 'tobi_lituk', CHECKED = '21 November 2026';
  var CH = [
    [1, 'Values and principles of the UK', '⚖️'],
    [2, 'What is the UK?', '🗺️'],
    [3, 'A long and illustrious history', '🏰'],
    [4, 'A modern, thriving society', '🎭'],
    [5, 'Government, the law and your role', '🏛️'],
  ];
  var GOV = {
    main: 'https://www.gov.uk/life-in-the-uk-test',
    book: 'https://www.gov.uk/life-in-the-uk-test/book-test',
    day: 'https://www.gov.uk/life-in-the-uk-test/what-happens-test',
    refunds: 'https://www.gov.uk/life-in-the-uk-test/cancellations-refunds-complaints',
  };
  var Q = null, loading = null, S = { v: 'home' };

  // ───── helpers ─────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'lifeuk' }, p || {})); } catch (x) {} }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { mocks: d.mocks || [], seen: d.seen || {}, wrong: d.wrong || {}, n: d.n || 0, ok: d.ok || 0, date: d.date || '' }; } catch (e) { return { mocks: [], seen: {}, wrong: {}, n: 0, ok: 0, date: '' }; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function niceDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
  function daysTo(iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); }
  function chName(c) { var x = CH.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : ''; }
  function getQ() {
    if (Q) return Promise.resolve(Q);
    if (!loading) loading = fetch('/lifeuk-q.json?v=20261121a').then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }).then(function (j) { Q = j; return Q; });
    return loading;
  }
  // answer options for one question, shuffled once per showing
  function optsOf(q) {
    if (q.t === 't') return [{ i: 0, tx: 'True', ok: q.a === true }, { i: 1, tx: 'False', ok: q.a === false }];
    return shuffle(q.o.map(function (tx, i) { return { i: i, tx: tx, ok: q.t === '2' ? i < 2 : i === 0 }; }));
  }
  function rightText(q) { return q.t === 't' ? (q.a ? 'True' : 'False') : q.t === '2' ? q.o[0] + ' and ' + q.o[1] : q.o[0]; }

  // ───── styles ─────
  var CSS = 'body.lu-nochat .input-area{display:none!important}body.lu-nochat #messages{background:#F7F7F9}' +
    '.lu{font-family:inherit;color:#0F1E36;max-width:640px;margin:0 auto}.lu *{box-sizing:border-box}' +
    '.lu-top{background:linear-gradient(135deg,#0F1E36,#1D3D7A);color:#fff;border-radius:18px;padding:18px 16px;margin-bottom:12px}.lu-top b{display:block;font-size:21px;line-height:1.25}.lu-top span{display:block;font-size:14px;opacity:.88;margin-top:5px;line-height:1.45}' +
    '.lu-back{border:0;background:none;color:#057A44;font-weight:700;font-size:14.5px;padding:4px 0 10px;cursor:pointer;font-family:inherit}' +
    '.lu-card{background:#fff;border:1.5px solid #ECE8DE;border-radius:16px;padding:14px;margin-bottom:10px}' +
    '.lu-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.lu-stat{background:#fff;border:1.5px solid #ECE8DE;border-radius:14px;padding:10px 6px;text-align:center}.lu-stat b{display:block;font-size:20px}.lu-stat small{font-size:12px;color:#6B7280;line-height:1.3;display:block;margin-top:2px}' +
    '.lu-big{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;border-radius:16px;padding:15px 14px;margin-bottom:10px;cursor:pointer;font-family:inherit;background:#057A44;color:#fff}.lu-big i{font-style:normal;font-size:26px}.lu-big b{display:block;font-size:17px}.lu-big small{display:block;font-size:13px;opacity:.9;margin-top:2px}' +
    '.lu-big.w{background:#fff;color:#0F1E36;border:1.5px solid #ECE8DE}.lu-big.w small{color:#6B7280;opacity:1}.lu-big.y{background:#FFF6DE;color:#0F1E36;border:1.5px solid #F2D58A}.lu-big.y small{color:#7A5300;opacity:1}' +
    '.lu-h{font-size:12px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin:16px 2px 8px}' +
    '.lu-ch{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid #ECE8DE;background:#fff;border-radius:14px;padding:12px;margin-bottom:8px;cursor:pointer;font-family:inherit;color:#0F1E36}.lu-ch i{font-style:normal;font-size:22px}.lu-ch b{display:block;font-size:15px}.lu-ch small{display:block;font-size:12.5px;color:#6B7280;margin-top:2px}.lu-bar{height:6px;background:#EEF0F3;border-radius:6px;margin-top:6px;overflow:hidden}.lu-bar span{display:block;height:100%;background:#057A44;border-radius:6px}' +
    '.lu-qh{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;color:#6B7280;font-weight:700;margin:2px 2px 8px}.lu-timer{background:#0F1E36;color:#fff;border-radius:10px;padding:4px 10px;font-variant-numeric:tabular-nums}.lu-timer.low{background:#B42318}' +
    '.lu-q{font-size:19px;font-weight:700;line-height:1.4;margin:4px 0 12px}.lu-tag{display:inline-block;font-size:12px;font-weight:800;border-radius:8px;padding:3px 8px;background:#E7EFFD;color:#1D3D7A;margin-bottom:8px}' +
    '.lu-o{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:2px solid #E3E0D7;background:#fff;border-radius:14px;padding:13px 12px;margin-bottom:8px;cursor:pointer;font-family:inherit;font-size:16px;color:#0F1E36;line-height:1.35}.lu-o .k{flex:none;width:28px;height:28px;border-radius:50%;background:#F1EFE8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}' +
    '.lu-o.sel{border-color:#1D3D7A;background:#EEF3FC}.lu-o.sel .k{background:#1D3D7A;color:#fff}.lu-o.ok{border-color:#057A44;background:#E3F2EA}.lu-o.ok .k{background:#057A44;color:#fff}.lu-o.no{border-color:#B42318;background:#FDECEA}.lu-o.no .k{background:#B42318;color:#fff}.lu-o:disabled{cursor:default}' +
    '.lu-fb{border-radius:14px;padding:12px 13px;margin:4px 0 10px;font-size:15px;line-height:1.5}.lu-fb.ok{background:#E3F2EA;color:#05502E}.lu-fb.no{background:#FDECEA;color:#7A1A12}.lu-fb small{display:block;margin-top:6px;color:#4B5563;font-size:13px}.lu-x{display:block;margin-top:6px;font-size:13.5px;background:#FFF6DE;color:#7A5300;border-radius:10px;padding:7px 9px}' +
    '.lu-btn{border:0;border-radius:12px;padding:13px 16px;font-weight:800;font-size:15.5px;cursor:pointer;font-family:inherit;background:#057A44;color:#fff;width:100%}.lu-btn.g{background:#fff;color:#057A44;border:1.5px solid #057A44}.lu-btn:disabled{opacity:.45;cursor:default}.lu-row{display:flex;gap:8px;margin-top:6px}.lu-row .lu-btn{flex:1}' +
    '.lu-res{text-align:center;padding:20px 14px}.lu-res b{display:block;font-size:44px;line-height:1.1}.lu-res .p{display:inline-block;margin-top:8px;font-weight:800;border-radius:10px;padding:5px 12px}.lu-res .p.ok{background:#E3F2EA;color:#057A44}.lu-res .p.no{background:#FDECEA;color:#B42318}' +
    '.lu-wr{border-top:1px solid #F0EDE5;padding:10px 0;font-size:14.5px;line-height:1.45}.lu-wr b{display:block}.lu-wr .a{color:#057A44;font-weight:700;margin-top:3px}.lu-wr .y{color:#B42318;margin-top:3px}.lu-wr small{display:block;color:#6B7280;margin-top:3px}' +
    '.lu-li{display:flex;gap:10px;padding:10px 0;border-top:1px solid #F0EDE5;font-size:15px;line-height:1.45}.lu-li:first-of-type{border-top:0}.lu-li i{font-style:normal;flex:none}.lu-li a{color:#057A44;font-weight:700;white-space:nowrap}' +
    '.lu-note{font-size:12.5px;color:#6B7280;line-height:1.5;margin:10px 4px}';
  function addCss() { if (document.getElementById('luCss')) return; var st = document.createElement('style'); st.id = 'luCss'; st.textContent = CSS; document.head.appendChild(st); }

  // ───── open / leave ─────
  var obs = null, timer = null;
  function open(view) {
    addCss();
    try { if (typeof clearExamState === 'function') clearExamState(); } catch (e) {}
    var msgs = document.getElementById('messages'); if (!msgs) return;
    window._currentPage = 'lifeuk'; window.__homeRender = false;
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="luRoot" class="lu"></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); else msgs.scrollTop = 0; } catch (e) {}
    document.body.classList.add('lu-nochat');
    if (!obs && window.MutationObserver) { obs = new MutationObserver(function () { if (!document.getElementById('luRoot')) { obs.disconnect(); obs = null; stopTimer(); document.body.classList.remove('lu-nochat'); } }); obs.observe(msgs, { childList: true }); }
    gt('lifeuk_open');
    S = { v: view || 'home' };
    root().innerHTML = '<div class="lu-card" style="text-align:center;color:#6B7280">Loading questions…</div>';
    getQ().then(function () { draw(); }).catch(function () { root().innerHTML = '<div class="lu-card">Couldn’t load the questions — check your connection and try again.<div class="lu-row"><button class="lu-btn" id="luRe">Try again</button></div></div>'; $('#luRe').onclick = function () { loading = null; open(view); }; });
  }
  function root() { return document.getElementById('luRoot'); }
  function leave() { stopTimer(); document.body.classList.remove('lu-nochat'); if (typeof resetToWelcome === 'function') resetToWelcome(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function top() { var r = document.getElementById('messages'); try { if (r) r.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }
  function draw() { stopTimer(); var r = root(); if (!r) return; ({ home: home, mock: mockQ, mockEnd: mockEnd, prac: pracQ, chapters: chapters, before: before })[S.v](r); }

  // ───── 🏠 home ─────
  function home(r) {
    var d = load(), best = d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), weak = Object.keys(d.wrong).length;
    var last = d.mocks[d.mocks.length - 1];
    var dl = d.date ? daysTo(d.date) : null;
    r.innerHTML = '<button class="lu-back" id="luBack">← Home</button>' +
      '<div class="lu-top"><b>🇬🇧 Life in the UK Test</b><span>' + Q.length + ' practice questions from the official handbook. Marked straight away — free.</span></div>' +
      (d.date && dl >= 0 ? '<div class="lu-card" style="border-color:#F2D58A;background:#FFFBEF"><b style="font-size:16px">📅 Your test: ' + esc(niceDate(d.date)) + '</b><div style="font-size:14px;color:#7A5300;margin-top:3px">' + (dl === 0 ? 'It’s today — good luck! Bring your original ID.' : dl === 1 ? 'Tomorrow! Bring the same original ID you booked with.' : dl + ' days to go') + '</div></div>' : '') +
      '<div class="lu-stats"><div class="lu-stat"><b>' + d.mocks.length + '</b><small>Mock tests</small></div><div class="lu-stat"><b>' + (d.mocks.length ? best + '/24' : '–') + '</b><small>Best score</small></div><div class="lu-stat"><b>' + d.n + '</b><small>Answered</small></div></div>' +
      (last ? '<div class="lu-note" style="margin-top:0">Last mock: <b>' + last.s + '/24</b> — ' + (last.s >= 18 ? '✅ a pass' : '❌ not a pass yet (you need 18)') + '</div>' : '') +
      '<button class="lu-big" id="luMock"><i>🎯</i><span><b>Mock test</b><small>24 questions · 45 minutes · pass is 18 right (75%), like the real test</small></span></button>' +
      '<button class="lu-big w" id="luPrac"><i>📚</i><span><b>Practise by chapter</b><small>See if you’re right straight away, with the reason</small></span></button>' +
      (weak ? '<button class="lu-big y" id="luWeak"><i>💪</i><span><b>My weak spots · ' + weak + '</b><small>Questions you got wrong — get them right to clear them</small></span></button>' : '') +
      '<button class="lu-big w" id="luBefore"><i>📋</i><span><b>Before your test</b><small>Cost, booking, ID and the day — checked on GOV.UK</small></span></button>' +
      (window.MyPlan && window.MyPlan.lifeTest ? '<button class="lu-big w" id="luPlan"><i>💚</i><span><b>' + (d.date ? 'Change your test date' : 'Add your test date to My Plan') + '</b><small>Countdown, reminders and a checklist</small></span></button>' : '') +
      '<button class="lu-big w" id="luShare"><i>📤</i><span><b>Share with a friend</b><small>auntietobi.co.uk/life-in-uk-test</small></span></button>' +
      '<div class="lu-note">Practice questions written by Auntie Tobi from the official handbook, <i>Life in the United Kingdom: A Guide for New Residents</i>. They are not the real test questions. Always check the latest rules on <a href="' + GOV.main + '" target="_blank" rel="noopener">GOV.UK</a>.</div>';
    $('#luBack', r).onclick = leave;
    $('#luMock', r).onclick = startMock;
    $('#luPrac', r).onclick = function () { S = { v: 'chapters' }; draw(); top(); };
    if ($('#luWeak', r)) $('#luWeak', r).onclick = function () { startPrac('weak'); };
    $('#luBefore', r).onclick = function () { S = { v: 'before' }; draw(); top(); };
    if ($('#luPlan', r)) $('#luPlan', r).onclick = function () { window.MyPlan.lifeTest(); };
    $('#luShare', r).onclick = function () {
      var url = 'https://auntietobi.co.uk/life-in-uk-test', text = 'Practise for the Life in the UK Test free on Auntie Tobi 🇬🇧 — 500+ questions from the official handbook and 45-minute mock tests:';
      gt('lifeuk_share');
      if (navigator.share) { navigator.share({ title: 'Life in the UK Test practice', text: text, url: url }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
    };
  }

  // ───── 📚 chapters ─────
  function chapters(r) {
    var d = load();
    r.innerHTML = '<button class="lu-back" id="luB">← Back</button><div class="lu-h" style="margin-top:0">Practise by chapter</div>' +
      '<button class="lu-ch" data-c="0"><i>🔀</i><span style="flex:1"><b>All chapters, mixed</b><small>' + Q.length + ' questions</small></span></button>' +
      CH.map(function (c) {
        var qs = Q.filter(function (q) { return q.c === c[0]; }), seen = qs.filter(function (q) { return d.seen[q.id]; }).length, pc = Math.round(seen / qs.length * 100);
        return '<button class="lu-ch" data-c="' + c[0] + '"><i>' + c[2] + '</i><span style="flex:1"><b>' + c[0] + '. ' + esc(c[1]) + '</b><small>' + qs.length + ' questions · ' + seen + ' done</small><div class="lu-bar"><span style="width:' + pc + '%"></span></div></span></button>';
      }).join('') +
      '<div class="lu-note">Chapters follow the official handbook, so you know exactly what to re-read.</div>';
    $('#luB', r).onclick = function () { S = { v: 'home' }; draw(); top(); };
    $$('[data-c]', r).forEach(function (b) { b.onclick = function () { startPrac(+b.dataset.c); }; });
  }

  // ───── practice (chapter, mixed or weak spots) ─────
  function pool(mode) {
    var d = load();
    if (mode === 'weak') return Q.filter(function (q) { return d.wrong[q.id]; });
    return Q.filter(function (q) { return !mode || q.c === mode; });
  }
  function nextPrac() {
    var d = load(), p = pool(S.mode);
    if (!p.length) return null;
    var fresh = p.filter(function (q) { return !d.seen[q.id] && S.done.indexOf(q.id) < 0; });
    var src = fresh.length ? fresh : p.filter(function (q) { return S.done.indexOf(q.id) < 0; });
    if (!src.length) { S.done = []; src = p; }
    return src[Math.floor(Math.random() * src.length)];
  }
  function startPrac(mode) { S = { v: 'prac', mode: mode, done: [], n: 0, ok: 0 }; S.q = nextPrac(); S.opts = S.q ? optsOf(S.q) : []; S.pick = []; S.shown = false; gt('lifeuk_practise', { label: String(mode) }); draw(); top(); }
  function pracQ(r) {
    var q = S.q;
    var title = S.mode === 'weak' ? '💪 Weak spots' : S.mode ? CH[S.mode - 1][2] + ' Chapter ' + S.mode : '🔀 All chapters';
    if (!q) { r.innerHTML = '<button class="lu-back" id="luB">← Back</button><div class="lu-card" style="text-align:center"><b style="font-size:18px">🎉 All cleared!</b><div style="margin-top:6px;color:#6B7280">No weak spots left. Try a mock test.</div></div>'; $('#luB', r).onclick = function () { S = { v: 'home' }; draw(); }; return; }
    r.innerHTML = '<button class="lu-back" id="luB">← Back</button><div class="lu-qh"><span>' + title + '</span><span>' + S.ok + ' / ' + S.n + ' right</span></div>' + qHtml(q, true) +
      (S.shown ? fbHtml(q) + '<button class="lu-btn" id="luN">Next question →</button>' : (q.t === '2' ? '<button class="lu-btn" id="luC"' + (S.pick.length === 2 ? '' : ' disabled') + '>Check my answer</button>' : ''));
    $('#luB', r).onclick = function () { S = { v: S.mode === 'weak' ? 'home' : 'chapters' }; draw(); top(); };
    bindOpts(r, function () { markPrac(); });
    if ($('#luN', r)) $('#luN', r).onclick = function () { S.done.push(q.id); S.q = nextPrac(); S.opts = S.q ? optsOf(S.q) : []; S.pick = []; S.shown = false; draw(); top(); };
  }
  function isRight(q, pick, opts) { var want = opts.filter(function (o) { return o.ok; }).map(function (o) { return o.i; }).sort().join(','); return pick.slice().sort().join(',') === want; }
  function markPrac() {
    var q = S.q, ok = isRight(q, S.pick, S.opts), d = load();
    S.shown = true; S.n++; if (ok) S.ok++;
    d.n++; if (ok) d.ok++; d.seen[q.id] = 1;
    if (ok) { if (d.wrong[q.id]) { d.wrong[q.id]--; if (d.wrong[q.id] <= 0) delete d.wrong[q.id]; } } else d.wrong[q.id] = (d.wrong[q.id] || 0) + 1;
    save(d); draw();
  }

  // ───── one question ─────
  function qHtml(q, practice) {
    var lab = ['A', 'B', 'C', 'D'];
    var ask = q.t === 't' ? 'Is this statement TRUE or FALSE?' : q.t === '2' ? 'Choose TWO answers' : '';
    return '<div class="lu-card"><span class="lu-tag">📖 Chapter ' + q.c + ' · ' + esc(chName(q.c)) + '</span>' + (ask ? '<div style="font-size:13px;font-weight:800;color:#7A5300;margin-bottom:4px">' + ask + '</div>' : '') +
      '<div class="lu-q">' + esc(q.t === 't' ? '“' + q.q + '”' : q.q) + '</div>' +
      S.opts.map(function (o, n) {
        var cls = '';
        if (practice && S.shown) { if (o.ok) cls = 'ok'; else if (S.pick.indexOf(o.i) >= 0) cls = 'no'; }
        else if (S.pick.indexOf(o.i) >= 0) cls = 'sel';
        return '<button class="lu-o ' + cls + '" data-o="' + o.i + '"' + (practice && S.shown ? ' disabled' : '') + '><span class="k">' + (q.t === 't' ? (o.i ? '✗' : '✓') : lab[n]) + '</span><span>' + esc(o.tx) + '</span></button>';
      }).join('') + '</div>';
  }
  function fbHtml(q) {
    var ok = isRight(q, S.pick, S.opts);
    return '<div class="lu-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✅ Correct!' : '❌ Not quite — the answer is: ' + esc(rightText(q))) + '</b><div style="margin-top:4px">' + esc(q.e) + '</div>' +
      (q.x ? '<span class="lu-x">🕒 ' + esc(q.x) + ' For the test, use the handbook’s answer.</span>' : '') + '<small>📖 Handbook chapter ' + q.c + ': ' + esc(chName(q.c)) + '</small></div>';
  }
  function bindOpts(r, done) {
    var q = S.q;
    $$('[data-o]', r).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.o;
        if (q.t === '2') {
          var k = S.pick.indexOf(i); if (k >= 0) S.pick.splice(k, 1); else if (S.pick.length < 2) S.pick.push(i); else { S.pick.shift(); S.pick.push(i); }
          if (S.v === 'mock') { S.ans[S.at] = S.pick.slice(); }
          draw(); return;
        }
        S.pick = [i];
        if (S.v === 'mock') { S.ans[S.at] = S.pick.slice(); draw(); return; }
        done();
      };
    });
    var c = $('#luC', r); if (c) c.onclick = done;
  }

  // ───── 🎯 mock test ─────
  function startMock() {
    // 24 questions from across the handbook, weighted like the chapters' sizes, never two of the same question
    var picked = shuffle(Q).slice(0, 24);
    S = { v: 'mock', qs: picked.map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, at: 0, end: Date.now() + 45 * 60 * 1000 };
    gt('lifeuk_mock_start'); draw(); top();
  }
  function mockQ(r) {
    var it = S.qs[S.at]; S.q = it.q; S.opts = it.opts; S.pick = (S.ans[S.at] || []).slice();
    var answered = Object.keys(S.ans).filter(function (k) { return S.ans[k] && S.ans[k].length; }).length, last = S.at === S.qs.length - 1;
    var need = it.q.t === '2' ? 2 : 1, ready = S.pick.length === need;
    r.innerHTML = '<div class="lu-qh"><span>Question ' + (S.at + 1) + ' of 24 · ' + answered + ' answered</span><span class="lu-timer" id="luT"></span></div>' + qHtml(it.q, false) +
      '<div class="lu-row"><button class="lu-btn g" id="luP"' + (S.at ? '' : ' disabled') + '>← Back</button><button class="lu-btn" id="luN"' + (ready ? '' : ' disabled') + '>' + (last ? 'Finish test' : 'Next →') + '</button></div>' +
      '<div class="lu-row" style="margin-top:12px"><button class="lu-btn g" id="luQ" style="border-color:#E3E0D7;color:#6B7280">Stop test</button></div>';
    bindOpts(r, function () {});
    $('#luP', r).onclick = function () { S.at--; draw(); top(); };
    $('#luN', r).onclick = function () { if (last) finishMock(); else { S.at++; draw(); top(); } };
    $('#luQ', r).onclick = function () { if (confirm('Stop this mock test? Your answers won’t be saved.')) { S = { v: 'home' }; draw(); top(); } };
    tick(); timer = setInterval(tick, 1000);
  }
  function tick() {
    var t = document.getElementById('luT'); if (!t) return stopTimer();
    var left = Math.max(0, Math.round((S.end - Date.now()) / 1000));
    t.textContent = '⏱ ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); t.classList.toggle('low', left <= 300);
    if (!left) { stopTimer(); finishMock(true); }
  }
  function finishMock(timeUp) {
    var d = load(), score = 0, wrong = [];
    S.qs.forEach(function (it, n) {
      var pick = S.ans[n] || [], ok = pick.length && isRight(it.q, pick, it.opts);
      d.n++; d.seen[it.q.id] = 1;
      if (ok) { score++; d.ok++; if (d.wrong[it.q.id]) { d.wrong[it.q.id]--; if (d.wrong[it.q.id] <= 0) delete d.wrong[it.q.id]; } }
      else { d.wrong[it.q.id] = (d.wrong[it.q.id] || 0) + 1; wrong.push({ q: it.q, you: pick.map(function (i) { var o = it.opts.filter(function (x) { return x.i === i; })[0]; return o ? o.tx : ''; }).join(' and ') }); }
    });
    d.mocks.push({ at: today(), s: score }); if (d.mocks.length > 50) d.mocks = d.mocks.slice(-50);
    save(d); gt('lifeuk_mock_done', { value: score });
    S = { v: 'mockEnd', score: score, wrong: wrong, timeUp: !!timeUp, used: Math.round((45 * 60 * 1000 - Math.max(0, S.end - Date.now())) / 60000) };
    draw(); top();
  }
  function mockEnd(r) {
    var pass = S.score >= 18, byCh = {};
    S.wrong.forEach(function (w) { byCh[w.q.c] = (byCh[w.q.c] || 0) + 1; });
    var study = Object.keys(byCh).sort(function (a, b) { return byCh[b] - byCh[a]; });
    r.innerHTML = '<div class="lu-card lu-res">' + (S.timeUp ? '<div style="font-weight:800;color:#B42318;margin-bottom:6px">⏱ Time’s up</div>' : '') + '<b>' + S.score + '/24</b><div style="color:#6B7280;margin-top:4px">' + Math.round(S.score / 24 * 100) + '% · ' + S.used + ' minutes</div>' +
      '<span class="p ' + (pass ? 'ok' : 'no') + '">' + (pass ? '✅ Pass — well done!' : '❌ Not a pass yet — you need 18') + '</span></div>' +
      (study.length ? '<div class="lu-card"><b style="font-size:16px">📖 What to re-read</b>' + study.map(function (c) { return '<div class="lu-li"><i>' + CH[c - 1][2] + '</i><span style="flex:1">Chapter ' + c + ': ' + esc(chName(+c)) + '</span><b>' + byCh[c] + ' wrong</b></div>'; }).join('') + '</div>' : '') +
      (S.wrong.length ? '<div class="lu-card"><b style="font-size:16px">❌ Your ' + S.wrong.length + ' wrong answer' + (S.wrong.length === 1 ? '' : 's') + '</b>' + S.wrong.map(function (w) {
        return '<div class="lu-wr"><b>' + esc(w.q.q) + '</b><div class="y">You: ' + esc(w.you || 'no answer') + '</div><div class="a">✓ ' + esc(rightText(w.q)) + '</div><small>' + esc(w.q.e) + (w.q.x ? ' 🕒 ' + esc(w.q.x) : '') + '</small></div>';
      }).join('') + '<div class="lu-note" style="margin:8px 0 0">These are now in 💪 My weak spots.</div></div>' : '') +
      '<div class="lu-row"><button class="lu-btn" id="luA">🎯 Another mock test</button></div><div class="lu-row"><button class="lu-btn g" id="luH">Done</button></div>';
    $('#luA', r).onclick = startMock;
    $('#luH', r).onclick = function () { S = { v: 'home' }; draw(); top(); };
  }

  // ───── 📋 before your test (GOV.UK) ─────
  function before(r) {
    var L = function (ico, html, link) { return '<div class="lu-li"><i>' + ico + '</i><span style="flex:1">' + html + (link ? ' <a href="' + link + '" target="_blank" rel="noopener">GOV.UK ↗</a>' : '') + '</span></div>'; };
    r.innerHTML = '<button class="lu-back" id="luB">← Back</button>' +
      '<div class="lu-top" style="background:linear-gradient(135deg,#057A44,#0F1E36)"><b>📋 Before your test</b><span>The key facts from GOV.UK. Checked ' + CHECKED + ' — always check GOV.UK before you book.</span></div>' +
      '<div class="lu-card">' +
      L('💷', '<b>It costs £50.</b> Book online at least <b>3 days before</b> — use only the official booking service on GOV.UK.', GOV.book) +
      L('🪪', '<b>ID:</b> a share code from your eVisa (UKVI account), or a valid passport. A BRP only works if your test is within 24 months of its expiry date <b>and</b> before 31 December 2026.', GOV.book) +
      L('✍️', 'The name on your booking must <b>exactly</b> match the name on your ID.', GOV.book) +
      L('📄', 'On the day, bring the <b>same ID you booked with</b> — the original, not a copy or screenshot. Your photo is taken to check it’s you. Without the right ID you can’t sit the test and won’t get a refund.', GOV.day) +
      L('⏱', '<b>24 questions in 45 minutes.</b> To pass you need <b>75%</b> — 18 or more right.', GOV.day) +
      L('✅', 'If you pass, you get a <b>unique reference number</b>. You need it for your settlement or citizenship application.', GOV.day) +
      L('🔁', 'If you don’t pass, you can book again — you pay each time.', GOV.day) +
      L('🙅🏾', 'You usually don’t need the test if you’re under 18, aged 65 or over, have already passed it, or have a long-term physical or mental condition (with an exemption form or doctor’s letter).', GOV.main) +
      L('📖', 'The questions come only from the official handbook, <i>Life in the United Kingdom: A Guide for New Residents</i> (book, eBook or audio).', GOV.main) +
      L('👶🏾', 'You can’t bring children or other family members into the test centre.', GOV.day) +
      L('📞', 'Help with booking: <b>0800 015 4245</b>, Monday to Friday, 8am to 8pm.', GOV.book) +
      '</div>' +
      '<a class="lu-btn" style="display:block;text-align:center;text-decoration:none" href="' + GOV.book + '" target="_blank" rel="noopener">Book on GOV.UK ↗</a>';
    $('#luB', r).onclick = function () { S = { v: 'home' }; draw(); top(); };
    gt('lifeuk_before');
  }

  // for My Plan: progress line + test date
  function summary() { var d = load(), last = d.mocks[d.mocks.length - 1]; return { mocks: d.mocks.length, last: last ? last.s : null, best: d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), answered: d.n, weak: Object.keys(d.wrong).length, date: d.date }; }
  function setDate(iso) { var d = load(); d.date = iso || ''; save(d); }

  window.LifeUK = { open: open, summary: summary, setDate: setDate, mock: function () { open(); getQ().then(startMock); } };
  // 🔗 links: auntietobi.co.uk/life-in-uk-test (→ /?lifeuk=1), /life-in-uk-test/mock, /life-in-uk-test/before
  var m = location.search.match(/[?&]lifeuk(?:=([a-z]+))?/i);
  if (m || location.pathname.replace(/\/$/, '') === '/life-in-uk-test') {
    var go = function () { if (m && m[1] === 'mock') window.LifeUK.mock(); else open(m && m[1] === 'before' ? 'before' : 'home'); gt('lifeuk_link', { label: (m && m[1]) || 'home' }); };
    if (document.readyState === 'complete') setTimeout(go, 900); else window.addEventListener('load', function () { setTimeout(go, 900); });
  }
})();
