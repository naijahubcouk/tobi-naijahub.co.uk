/*
 * 🇬🇧 Life in the UK Test — practice inside the Auntie Tobi app.
 * Questions: /lifeuk-q.json — exam-style practice questions written from the official handbook
 * "Life in the United Kingdom: A Guide for New Residents" (5 chapters). Not real exam questions.
 * Each question has a status: v = verified, r = needs review, o = outdated, d = duplicate. Only verified questions are used.
 * HQ can change a question or its status (🇬🇧 Question review) — those changes come from app-content?luq=1.
 * Test facts are from GOV.UK (checked 21 Nov 2026). Marking is done here on the phone — instant, no AI.
 * Progress is kept on this device (localStorage "tobi_lituk"; a mock in progress in "tobi_lituk_live").
 */
(function () {
  'use strict';
  var KEY = 'tobi_lituk', LIVE = 'tobi_lituk_live', CHECKED = '21 November 2026', MOCK_N = 24, MOCK_MIN = 45, PASS = 18;
  var DISCLAIMER = 'Practise for the Life in the UK Test with exam-style questions based on the official study handbook. This is an independent preparation tool and is not affiliated with the UK government.';
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
  var Q = null, ALL = null, loading = null, S = { v: 'home' };

  // ───── helpers ─────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'lifeuk' }, p || {})); } catch (x) {} }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { mocks: d.mocks || [], prac: d.prac || [], seen: d.seen || {}, wrong: d.wrong || {}, n: d.n || 0, ok: d.ok || 0, date: d.date || '', last: d.last || [] }; } catch (e) { return { mocks: [], prac: [], seen: {}, wrong: {}, n: 0, ok: 0, date: '', last: [] }; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function niceDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
  function shortDate(iso) { if (!iso) return ''; var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function daysTo(iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); }
  function chName(c) { var x = CH.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : ''; }
  function byId(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
  function getQ() {
    if (Q) return Promise.resolve(Q);
    if (!loading) {
      var fix = fetch('/.netlify/functions/app-content?luq=1').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
      loading = Promise.all([fetch('/lifeuk-q.json?v=20261122a').then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }), fix]).then(function (x) {
        var over = (x[1] && x[1].fix) || {};
        ALL = x[0].map(function (q) { var o = over[q.id]; return o ? Object.assign({}, q, o) : q; });
        Q = ALL.filter(function (q) { return !q.s || q.s === 'v'; });   // ✅ only verified questions are used
        return Q;
      });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }
  // answer options for one question, shuffled once per showing (True/False stay in that order)
  function optsOf(q) {
    if (q.t === 't') return [{ i: 0, tx: 'True', ok: q.a === true }, { i: 1, tx: 'False', ok: q.a === false }];
    return shuffle(q.o.map(function (tx, i) { return { i: i, tx: tx, ok: q.t === '2' ? i < 2 : i === 0 }; }));
  }
  function rightText(q) { return q.t === 't' ? (q.a ? 'True' : 'False') : q.t === '2' ? q.o[0] + ' and ' + q.o[1] : q.o[0]; }
  function need(q) { return q.t === '2' ? 2 : 1; }
  function isRight(q, pick, opts) { var want = opts.filter(function (o) { return o.ok; }).map(function (o) { return o.i; }).sort().join(','); return (pick || []).slice().sort().join(',') === want; }
  function pickedText(it, pick) { return (pick || []).map(function (i) { var o = it.opts.filter(function (x) { return x.i === i; })[0]; return o ? o.tx : ''; }).join(' and '); }
  function instr(q) { return q.t === 't' ? 'Is the statement below TRUE or FALSE? Select ONE answer.' : q.t === '2' ? 'Select TWO answers.' : 'Select ONE answer.'; }
  function qText(q) { return q.t === 't' ? '“' + q.q + '”' : q.q; }
  function mmss(s) { return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

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
    '.lu-note{font-size:12.5px;color:#6B7280;line-height:1.5;margin:10px 4px}' +
    // 🎯 exam screens — plain, light and calm, like the computer-based test
    'body.lu-nochat.lu-examon #messages{background:#F8F9FA}' +
    '.lx{color:#1F2933;font-size:16px}.lx-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #DDE1E6;border-radius:10px;padding:10px 12px;margin-bottom:12px}.lx-bar b{font-size:14.5px}.lx-time{font-variant-numeric:tabular-nums;font-weight:800;font-size:15px;border:1px solid #DDE1E6;border-radius:8px;padding:4px 10px;background:#F8F9FA}.lx-time.low{color:#B42318;border-color:#F3B8B0;background:#FDF1EF}' +
    '.lx-panel{background:#fff;border:1px solid #DDE1E6;border-radius:10px;padding:18px 16px;margin-bottom:12px}.lx-num{font-size:13.5px;color:#52606D;font-weight:700;display:flex;justify-content:space-between;gap:8px}.lx-flagged{color:#A15C00}.lx-ins{font-size:14px;color:#52606D;margin:12px 0 6px;font-weight:600}.lx-q{font-size:19px;font-weight:700;line-height:1.45;margin:0 0 16px;color:#111827}' +
    '.lx-o{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;border:1px solid #CBD2D9;background:#fff;border-radius:8px;padding:13px 12px;margin-bottom:9px;cursor:pointer;font-family:inherit;font-size:16px;color:#1F2933;line-height:1.4}.lx-o:hover{border-color:#9AA5B1}.lx-o .r{flex:none;width:20px;height:20px;margin-top:1px;border:2px solid #7B8794;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff}.lx-o.cb .r{border-radius:4px}' +
    '.lx-o.sel{border-color:#1FA463;background:#EEF9F3;box-shadow:inset 0 0 0 1px #1FA463}.lx-o.sel .r{border-color:#1FA463;background:#1FA463}.lx-o.sel .r:after{content:"";width:8px;height:8px;border-radius:50%;background:#fff}.lx-o.cb.sel .r:after{width:5px;height:10px;border-radius:0;background:none;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg);margin-top:-2px}' +
    '.lx-nav{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}.lx-b{border:1px solid #CBD2D9;background:#fff;color:#1F2933;border-radius:8px;padding:12px 10px;white-space:nowrap;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}.lx-b:disabled{opacity:.4;cursor:default}.lx-b.p{background:#1FA463;border-color:#1FA463;color:#fff}.lx-b.f{border-color:#E0B25C;color:#7A4B00}.lx-b.f.on{background:#FFF4DC}.lx-b.w{width:100%}' +
    '.lx-links{display:flex;justify-content:space-between;margin-top:14px;font-size:14px}.lx-links button{border:0;background:none;color:#1F6E4A;font-weight:700;cursor:pointer;font-family:inherit;padding:6px 0}.lx-links button.q{color:#7B8794}' +
    '.lx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:7px;margin:12px 0}.lx-cell{border:1px solid #CBD2D9;background:#fff;border-radius:8px;padding:11px 0;min-width:0;text-align:center;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;color:#1F2933;position:relative}.lx-cell.a{background:#EEF9F3;border-color:#1FA463;color:#126B40}.lx-cell.f:after{content:"⚑";position:absolute;top:1px;right:4px;font-size:11px;color:#A15C00}.lx-cell small{display:block;font-size:10.5px;font-weight:600;color:#7B8794}.lx-key{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#52606D}.lx-key span{display:flex;gap:5px;align-items:center}.lx-key i{width:13px;height:13px;border-radius:3px;border:1px solid #CBD2D9;display:inline-block}' +
    '.lx-res{text-align:center}.lx-res .sc{font-size:46px;font-weight:800;line-height:1.1}.lx-res .pc{font-size:17px;color:#52606D;margin-top:2px}.lx-res .pf{display:inline-block;margin-top:10px;font-weight:800;font-size:18px;letter-spacing:.5px;border-radius:8px;padding:6px 16px}.lx-res .pf.ok{background:#EEF9F3;color:#126B40;border:1px solid #1FA463}.lx-res .pf.no{background:#FDF1EF;color:#B42318;border:1px solid #F3B8B0}.lx-res .meta{display:flex;justify-content:center;gap:16px;margin-top:12px;font-size:14px;color:#52606D}' +
    '.lx-tabs{display:flex;gap:6px;margin:4px 0 8px}.lx-tabs button{border:1px solid #CBD2D9;background:#fff;border-radius:20px;padding:6px 12px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;color:#1F2933}.lx-tabs button[aria-pressed=true]{background:#1F2933;border-color:#1F2933;color:#fff}' +
    '.lx-rv{border-top:1px solid #E4E7EB;padding:12px 0;font-size:14.5px;line-height:1.5}.lx-rv:first-child{border-top:0}.lx-rv .h{display:flex;gap:8px;align-items:flex-start}.lx-rv .h i{font-style:normal;flex:none;font-weight:800}.lx-rv .h i.ok{color:#126B40}.lx-rv .h i.no{color:#B42318}.lx-rv .y{color:#B42318;margin-top:4px}.lx-rv .y.ok{color:#126B40}.lx-rv .a{color:#126B40;font-weight:700;margin-top:2px}.lx-rv .e{color:#52606D;margin-top:4px}.lx-rv .c{display:inline-block;margin-top:5px;font-size:12.5px;color:#52606D;background:#F1F3F5;border-radius:6px;padding:2px 7px}' +
    '.lu-seg{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.lu-seg button{flex:1;min-width:64px;border:1.5px solid #E3E0D7;background:#fff;border-radius:12px;padding:11px 8px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;color:#0F1E36}.lu-seg button[aria-pressed=true]{border-color:#1FA463;background:#EEF9F3;color:#126B40}' +
    '.lu-pick{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid #ECE8DE;background:#fff;border-radius:14px;padding:11px 12px;margin-bottom:8px;cursor:pointer;font-family:inherit;color:#0F1E36}.lu-pick[aria-pressed=true]{border-color:#1FA463;background:#EEF9F3}.lu-pick i{font-style:normal;font-size:20px}.lu-pick b{display:block;font-size:15px}.lu-pick small{display:block;font-size:12.5px;color:#6B7280;margin-top:2px}' +
    '.lu-prog{display:flex;align-items:flex-end;gap:5px;height:70px;margin:10px 0 4px;border-bottom:1px dashed #D5D9DE;position:relative}.lu-prog span{flex:1;max-width:34px;border-radius:5px 5px 0 0;background:#C9D2DC;position:relative}.lu-prog span.ok{background:#1FA463}.lu-prog em{position:absolute;left:0;right:0;border-top:1.5px dashed #B42318;font-style:normal}.lu-prog em b{position:absolute;right:0;top:-16px;font-size:10.5px;color:#B42318}' +
    '.lu-disc{font-size:12.5px;color:#52606D;line-height:1.5;background:#F1F3F5;border-radius:12px;padding:10px 12px;margin:10px 0}';
  function addCss() { if (document.getElementById('luCss')) return; var st = document.createElement('style'); st.id = 'luCss'; st.textContent = CSS; document.head.appendChild(st); }

  // ───── open / leave ─────
  var obs = null, timer = null;
  function open(view) {
    addCss();
    try { if (typeof clearExamState === 'function') clearExamState(); } catch (e) {}
    var msgs = document.getElementById('messages'); if (!msgs) return;
    window._currentPage = 'lifeuk'; window.__homeRender = false; try { if (window.tobiDesk && window.tobiDesk.inApp) window.tobiDesk.inApp('lifeuk'); } catch (e) {}
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="luRoot" class="lu"></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); else msgs.scrollTop = 0; } catch (e) {}
    document.body.classList.add('lu-nochat');
    if (!obs && window.MutationObserver) { obs = new MutationObserver(function () { if (!document.getElementById('luRoot')) { obs.disconnect(); obs = null; stopTimer(); document.body.classList.remove('lu-nochat', 'lu-examon'); } }); obs.observe(msgs, { childList: true }); }
    gt('lifeuk_open');
    S = { v: view || 'home' };
    root().innerHTML = '<div class="lu-card" style="text-align:center;color:#6B7280">Loading questions…</div>';
    getQ().then(function () { draw(); }).catch(function () { root().innerHTML = '<div class="lu-card">Couldn’t load the questions — check your connection and try again.<div class="lu-row"><button class="lu-btn" id="luRe">Try again</button></div></div>'; $('#luRe').onclick = function () { open(view); }; });
  }
  function root() { return document.getElementById('luRoot'); }
  function leave() { stopTimer(); document.body.classList.remove('lu-nochat', 'lu-examon'); if (typeof resetToWelcome === 'function') resetToWelcome(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function top() { var r = document.getElementById('messages'); try { if (r) r.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }
  function go(v, extra) { S = Object.assign({ v: v }, extra || {}); draw(); top(); }
  function draw() {
    stopTimer(); var r = root(); if (!r) return;
    document.body.classList.toggle('lu-examon', /^(mock|review|result|pq|pend)$/.test(S.v));
    ({ home: home, setup: setup, mock: mockQ, review: review, result: result, pq: pracQ, before: before })[S.v](r);
  }

  // ───── 🏠 home ─────
  function home(r) {
    var d = load(), best = d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), weak = Object.keys(d.wrong).filter(function (id) { return Q.some(function (q) { return q.id === +id; }); }).length;
    var dl = d.date ? daysTo(d.date) : null, live = liveMock();
    var acc = d.n ? Math.round(d.ok / d.n * 100) : 0;
    r.innerHTML = '<button class="lu-back" id="luBack">← Home</button>' +
      '<div class="lu-top"><b>🇬🇧 Life in the UK Test</b><span>' + Q.length + ' exam-style practice questions based on the official handbook. Marked straight away — free.</span></div>' +
      '<div class="lu-disc">ℹ️ ' + esc(DISCLAIMER) + '</div>' +
      (d.date && dl >= 0 ? '<div class="lu-card" style="border-color:#F2D58A;background:#FFFBEF"><b style="font-size:16px">📅 Your test: ' + esc(niceDate(d.date)) + '</b><div style="font-size:14px;color:#7A5300;margin-top:3px">' + (dl === 0 ? 'It’s today — good luck! Bring your original ID.' : dl === 1 ? 'Tomorrow! Bring the same original ID you booked with.' : dl + ' days to go') + '</div></div>' : '') +
      (live ? '<button class="lu-big y" id="luResume"><i>⏱</i><span><b>Resume your mock exam</b><small>' + mmss(Math.max(0, Math.round((live.end - Date.now()) / 1000))) + ' left · ' + Object.keys(live.ans).length + ' of ' + MOCK_N + ' answered</small></span></button>' : '') +
      '<button class="lu-big" id="luMock"><i>🎯</i><span><b>Life in the UK — Mock Exam</b><small>24 questions · 45 minutes · pass mark 75% (18 correct)</small></span></button>' +
      '<button class="lu-big w" id="luPrac"><i>📚</i><span><b>Practice</b><small>5, 8, 10 or 24 questions · by chapter or mixed · answers now or at the end</small></span></button>' +
      (weak ? '<button class="lu-big y" id="luWeak"><i>💪</i><span><b>Retake my wrong answers · ' + weak + '</b><small>Get them right to clear them</small></span></button>' : '') +
      progressCard(d, best, acc) +
      '<button class="lu-big w" id="luBefore"><i>📋</i><span><b>Before your test</b><small>Cost, booking, ID and the day — checked on GOV.UK</small></span></button>' +
      (window.MyPlan && window.MyPlan.lifeTest ? '<button class="lu-big w" id="luPlan"><i>💚</i><span><b>' + (d.date ? 'Change your test date' : 'Add your test date to My Plan') + '</b><small>Countdown, reminders and a checklist</small></span></button>' : '') +
      '<button class="lu-big w" id="luShare"><i>📤</i><span><b>Share with a friend</b><small>auntietobi.co.uk/life-in-uk-test</small></span></button>' +
      '<div class="lu-note">These are practice questions written by Auntie Tobi from the official handbook, <i>Life in the United Kingdom: A Guide for New Residents</i>. They are not the questions used in the official Life in the UK Test. Always check the latest rules on <a href="' + GOV.main + '" target="_blank" rel="noopener">GOV.UK</a>.</div>';
    $('#luBack', r).onclick = leave;
    $('#luMock', r).onclick = function () { if (live && !confirm('Start a new mock exam? Your unfinished one will be lost.')) return; startMock(); };
    if ($('#luResume', r)) $('#luResume', r).onclick = resumeMock;
    $('#luPrac', r).onclick = function () { go('setup', { mode: 0, n: 10, fb: 'now' }); };
    if ($('#luWeak', r)) $('#luWeak', r).onclick = function () { go('setup', { mode: 'weak', n: Math.min(10, weak) <= 5 ? 5 : 10, fb: 'now' }); };
    $('#luBefore', r).onclick = function () { go('before'); };
    if ($('#luPlan', r)) $('#luPlan', r).onclick = function () { window.MyPlan.lifeTest(); };
    $('#luShare', r).onclick = function () {
      var url = 'https://auntietobi.co.uk/life-in-uk-test', text = 'Practise for the Life in the UK Test free on Auntie Tobi 🇬🇧 — exam-style questions based on the official handbook and 45-minute mock exams:';
      gt('lifeuk_share');
      if (navigator.share) { navigator.share({ title: 'Life in the UK Test practice', text: text, url: url }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
    };
  }
  // 📈 progress over time: the last 12 mock scores against the pass line, plus practice accuracy
  function progressCard(d, best, acc) {
    if (!d.mocks.length && !d.n) return '';
    var ms = d.mocks.slice(-12), passY = PASS / MOCK_N * 100;
    var last = d.mocks[d.mocks.length - 1];
    return '<div class="lu-card"><b style="font-size:16px">📈 Your progress</b>' +
      '<div class="lu-stats" style="margin:10px 0 0"><div class="lu-stat"><b>' + d.mocks.length + '</b><small>Mock exams</small></div><div class="lu-stat"><b>' + (d.mocks.length ? best + '/24' : '–') + '</b><small>Best score</small></div><div class="lu-stat"><b>' + (d.n ? acc + '%' : '–') + '</b><small>Right in practice</small></div></div>' +
      (ms.length ? '<div class="lu-prog" aria-label="Mock exam scores">' + ms.map(function (m) { return '<span class="' + (m.s >= PASS ? 'ok' : '') + '" style="height:' + Math.max(6, Math.round(m.s / MOCK_N * 100)) + '%" title="' + esc(shortDate(m.at)) + ': ' + m.s + '/24"></span>'; }).join('') + '<em style="bottom:' + passY + '%"><b>Pass 18</b></em></div>' +
        '<div style="font-size:13px;color:#6B7280">Last ' + ms.length + ' mock exam' + (ms.length === 1 ? '' : 's') + '. Latest: <b>' + last.s + '/24</b> (' + Math.round(last.s / MOCK_N * 100) + '%) — ' + (last.s >= PASS ? 'PASS' : 'not a pass yet') + '</div>' : '<div style="font-size:13px;color:#6B7280;margin-top:8px">' + d.n + ' practice answers so far. Try a mock exam to see your score.</div>') +
      '</div>';
  }

  // ───── 📚 practice set-up ─────
  function setup(r) {
    var d = load(), weakN = Q.filter(function (q) { return d.wrong[q.id]; }).length;
    var opt = function (mode, ico, title, sub) { return '<button class="lu-pick" data-m="' + mode + '" aria-pressed="' + (String(S.mode) === String(mode)) + '"><i>' + ico + '</i><span style="flex:1"><b>' + title + '</b><small>' + sub + '</small></span></button>'; };
    r.innerHTML = '<button class="lu-back" id="luB">← Back</button><div class="lu-h" style="margin-top:0">1 · What to practise</div>' +
      opt(0, '🔀', 'All chapters, mixed', Q.length + ' questions') +
      CH.map(function (c) {
        var qs = Q.filter(function (q) { return q.c === c[0]; }), seen = qs.filter(function (q) { return d.seen[q.id]; }).length;
        return opt(c[0], c[2], c[0] + '. ' + esc(c[1]), qs.length + ' questions · ' + seen + ' done') ;
      }).join('') +
      (weakN ? opt('weak', '💪', 'My wrong answers', weakN + ' to retake') : '') +
      '<div class="lu-h">2 · How many questions</div><div class="lu-seg">' + [5, 8, 10, 24].map(function (n) { return '<button data-n="' + n + '" aria-pressed="' + (S.n === n) + '">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="lu-h">3 · When to see the answers</div><div class="lu-seg"><button data-f="now" aria-pressed="' + (S.fb === 'now') + '">After each question</button><button data-f="end" aria-pressed="' + (S.fb === 'end') + '">At the end</button></div>' +
      '<div class="lu-row" style="margin-top:14px"><button class="lu-btn" id="luGo">Start practice →</button></div>' +
      '<div class="lu-note">Chapters follow the official handbook, so you know exactly what to re-read.</div>';
    $('#luB', r).onclick = function () { go('home'); };
    $$('[data-m]', r).forEach(function (b) { b.onclick = function () { S.mode = b.dataset.m === 'weak' ? 'weak' : +b.dataset.m; draw(); }; });
    $$('[data-n]', r).forEach(function (b) { b.onclick = function () { S.n = +b.dataset.n; draw(); }; });
    $$('[data-f]', r).forEach(function (b) { b.onclick = function () { S.fb = b.dataset.f; draw(); }; });
    $('#luGo', r).onclick = function () { startPrac(S.mode, S.n, S.fb); };
  }
  function pracPool(mode) { var d = load(); if (mode === 'weak') return Q.filter(function (q) { return d.wrong[q.id]; }); return Q.filter(function (q) { return !mode || q.c === mode; }); }
  function startPrac(mode, n, fb) {
    var d = load(), p = pracPool(mode);
    if (!p.length) return alert('No questions to practise here yet.');
    // questions you haven't seen first, then the rest — never the same question twice in one set
    var fresh = shuffle(p.filter(function (q) { return !d.seen[q.id]; })), old = shuffle(p.filter(function (q) { return d.seen[q.id]; }));
    var qs = noTwins(fresh.concat(old)).slice(0, n);
    gt('lifeuk_practise', { label: String(mode), value: qs.length });
    go('pq', { kind: 'prac', mode: mode, fb: fb, qs: qs.map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, done: {}, at: 0, t0: Date.now() });
  }
  // keep only one question per fact (same correct answer in the same chapter = probably the same fact)
  function noTwins(list) { var seen = {}; return list.filter(function (q) { var k = q.c + '|' + rightText(q).toLowerCase(); if (q.t !== 't' && seen[k]) return false; seen[k] = 1; return true; }); }

  // one question in practice
  function pracQ(r) {
    var it = S.qs[S.at], q = it.q, pick = S.ans[S.at] || [], shown = S.fb === 'now' && S.done[S.at], last = S.at === S.qs.length - 1;
    var title = S.mode === 'weak' ? 'My wrong answers' : S.mode ? 'Chapter ' + S.mode + ': ' + chName(S.mode) : 'All chapters';
    var okN = Object.keys(S.done).filter(function (k) { return isRight(S.qs[k].q, S.ans[k], S.qs[k].opts); }).length;
    r.innerHTML = '<div class="lx"><div class="lx-bar"><b>Practice · ' + esc(title) + '</b>' + (S.fb === 'now' ? '<span class="lx-time">' + okN + ' / ' + Object.keys(S.done).length + ' right</span>' : '') + '</div>' +
      '<div class="lx-panel"><div class="lx-num"><span>Question ' + (S.at + 1) + ' of ' + S.qs.length + '</span></div>' + optsHtml(it, pick, shown) +
      (shown ? fbHtml(it, pick) : '') + '</div>' +
      '<div class="lx-nav"><button class="lx-b" id="lxP"' + (S.at && S.fb === 'end' ? '' : ' disabled') + '>← Previous</button><span></span>' +
      (S.fb === 'now' && !shown ? '<button class="lx-b p" id="lxC"' + (pick.length === need(q) ? '' : ' disabled') + '>Check answer</button>' : '<button class="lx-b p" id="lxN"' + (S.fb === 'end' && pick.length !== need(q) ? ' disabled' : '') + '>' + (last ? 'Finish' : 'Next →') + '</button>') + '</div>' +
      '<div class="lx-links"><button class="q" id="lxX">Stop practice</button><span></span></div></div>';
    bindPick(r, it, !shown);
    if ($('#lxC', r)) $('#lxC', r).onclick = function () { S.done[S.at] = 1; record(it, S.ans[S.at]); draw(); };
    if ($('#lxN', r)) $('#lxN', r).onclick = function () { if (last) finishPrac(); else { S.at++; draw(); top(); } };
    if (!$('#lxP', r).disabled) $('#lxP', r).onclick = function () { S.at--; draw(); top(); };
    $('#lxX', r).onclick = function () { if (!Object.keys(S.ans).length || confirm('Stop this practice set?')) { if (S.fb === 'now' && Object.keys(S.done).length) finishPrac(true); else go('home'); } };
  }
  function record(it, pick) {
    var d = load(), ok = isRight(it.q, pick, it.opts), id = it.q.id;
    d.n++; if (ok) d.ok++; d.seen[id] = 1;
    if (ok) { if (d.wrong[id]) { d.wrong[id]--; if (d.wrong[id] <= 0) delete d.wrong[id]; } } else d.wrong[id] = (d.wrong[id] || 0) + 1;
    save(d); return ok;
  }
  function finishPrac(early) {
    var idx = S.qs.map(function (x, i) { return i; }).filter(function (i) { return S.fb === 'end' ? true : S.done[i]; });
    if (S.fb === 'end') idx.forEach(function (i) { record(S.qs[i], S.ans[i]); });
    var items = idx.map(function (i) { return { q: S.qs[i].q, opts: S.qs[i].opts, pick: S.ans[i] || [] }; });
    var score = items.filter(function (x) { return isRight(x.q, x.pick, x.opts); }).length;
    var d = load(); d.prac.push({ at: today(), n: items.length, ok: score, m: String(S.mode) }); if (d.prac.length > 100) d.prac = d.prac.slice(-100); save(d);
    gt('lifeuk_practise_done', { value: score });
    go('result', { kind: 'prac', mode: S.mode, n: S.n || S.qs.length, fb: S.fb, items: items, score: score, tab: 'all', used: Math.round((Date.now() - S.t0) / 60000) });
  }

  // ───── one question (shared by mock and practice) ─────
  function optsHtml(it, pick, shown) {
    var q = it.q, cb = q.t === '2';
    return '<div class="lx-ins">' + instr(q) + '</div><div class="lx-q">' + esc(qText(q)) + '</div>' +
      it.opts.map(function (o) {
        var on = pick.indexOf(o.i) >= 0, cls = 'lx-o' + (cb ? ' cb' : '') + (on ? ' sel' : ''), mark = '';
        if (shown) { if (o.ok) { cls += ' ok'; mark = ' <b style="color:#126B40">✓ Correct answer</b>'; } else if (on) mark = ' <b style="color:#B42318">✗ Your answer</b>'; }
        return '<button class="' + cls + '" data-o="' + o.i + '" role="' + (cb ? 'checkbox' : 'radio') + '" aria-checked="' + on + '"' + (shown ? ' disabled' : '') + '><span class="r"></span><span>' + esc(o.tx) + mark + '</span></button>';
      }).join('');
  }
  function fbHtml(it, pick) {
    var q = it.q, ok = isRight(q, pick, it.opts);
    return '<div class="lu-fb ' + (ok ? 'ok' : 'no') + '" style="margin-top:10px"><b>' + (ok ? '✅ Correct' : '❌ Incorrect. The answer is: ' + esc(rightText(q))) + '</b><div style="margin-top:4px">' + esc(q.e) + '</div>' +
      (q.x ? '<span class="lu-x">🕒 ' + esc(q.x) + '</span>' : '') + '<small>📖 Handbook chapter ' + q.c + ': ' + esc(chName(q.c)) + '</small></div>';
  }
  function bindPick(r, it, live) {
    if (!live) return;
    $$('[data-o]', r).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.o, pick = (S.ans[S.at] || []).slice();
        if (it.q.t === '2') { var k = pick.indexOf(i); if (k >= 0) pick.splice(k, 1); else if (pick.length < 2) pick.push(i); else { pick.shift(); pick.push(i); } }
        else pick = [i];
        if (pick.length) S.ans[S.at] = pick; else delete S.ans[S.at];
        if (S.v === 'mock') saveLive();
        draw();
      };
    });
  }

  // ───── 🎯 mock exam ─────
  // 24 questions spread across the five chapters in proportion to the handbook, no repeats, no two questions on the same fact,
  // and (where possible) none from your last mock exam
  function pickMock() {
    var d = load(), lastIds = d.last || [], tot = Q.length, quota = {}, rem = [];
    CH.forEach(function (c) { var n = Q.filter(function (q) { return q.c === c[0]; }).length, x = n / tot * MOCK_N; quota[c[0]] = Math.max(1, Math.floor(x)); rem.push([c[0], x - Math.floor(x)]); });
    var sum = function () { return Object.keys(quota).reduce(function (a, k) { return a + quota[k]; }, 0); };
    rem.sort(function (a, b) { return b[1] - a[1]; }); var ri = 0;
    while (sum() < MOCK_N) { quota[rem[ri % rem.length][0]]++; ri++; }
    while (sum() > MOCK_N) { var big = Object.keys(quota).sort(function (a, b) { return quota[b] - quota[a]; })[0]; quota[big]--; }
    var out = [];
    CH.forEach(function (c) {
      var p = Q.filter(function (q) { return q.c === c[0]; }), notLast = shuffle(p.filter(function (q) { return lastIds.indexOf(q.id) < 0; })), wasLast = shuffle(p.filter(function (q) { return lastIds.indexOf(q.id) >= 0; }));
      out = out.concat(noTwins(notLast.concat(wasLast)).slice(0, quota[c[0]]));
    });
    return shuffle(out);
  }
  function startMock() {
    var qs = pickMock();
    S = { v: 'mock', qs: qs.map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, flag: {}, at: 0, end: Date.now() + MOCK_MIN * 60 * 1000, t0: Date.now() };
    saveLive(); gt('lifeuk_mock_start'); draw(); top();
  }
  function saveLive() { try { localStorage.setItem(LIVE, JSON.stringify({ ids: S.qs.map(function (it) { return it.q.id; }), ord: S.qs.map(function (it) { return it.opts.map(function (o) { return o.i; }); }), ans: S.ans, flag: S.flag, at: S.at, end: S.end, t0: S.t0 })); } catch (e) {} }
  function clearLive() { try { localStorage.removeItem(LIVE); } catch (e) {} }
  function liveMock() { try { var l = JSON.parse(localStorage.getItem(LIVE) || 'null'); if (!l || !l.ids || l.end < Date.now() - 60000) { if (l) clearLive(); return null; } return l; } catch (e) { return null; } }
  function resumeMock() {
    var l = liveMock(); if (!l) return draw();
    var qs = l.ids.map(function (id, n) { var q = byId(id); if (!q) return null; var base = optsOf(q), ord = l.ord[n] || []; var opts = q.t === 't' ? base : ord.map(function (i) { return base.filter(function (o) { return o.i === i; })[0]; }).filter(Boolean); return { q: q, opts: opts.length === base.length ? opts : base }; });
    if (qs.some(function (x) { return !x; })) { clearLive(); return startMock(); }
    S = { v: 'mock', qs: qs, ans: l.ans || {}, flag: l.flag || {}, at: l.at || 0, end: l.end, t0: l.t0 || Date.now() };
    draw(); top();
  }
  function answeredN() { return Object.keys(S.ans).filter(function (k) { return S.ans[k] && S.ans[k].length === need(S.qs[k].q); }).length; }
  function examBar() { return '<div class="lx-bar"><b>Life in the UK — Mock Exam</b><span class="lx-time" id="lxT" aria-live="off"></span></div>'; }
  function mockQ(r) {
    var it = S.qs[S.at], pick = S.ans[S.at] || [], last = S.at === S.qs.length - 1, fl = !!S.flag[S.at];
    r.innerHTML = '<div class="lx">' + examBar() +
      '<div class="lx-panel"><div class="lx-num"><span>Question ' + (S.at + 1) + ' of ' + S.qs.length + '</span>' + (fl ? '<span class="lx-flagged">⚑ Flagged for review</span>' : '') + '</div>' + optsHtml(it, pick, false) + '</div>' +
      '<div class="lx-nav"><button class="lx-b" id="lxP"' + (S.at ? '' : ' disabled') + '>← Previous</button><button class="lx-b f' + (fl ? ' on' : '') + '" id="lxF">⚑ ' + (fl ? 'Unflag' : 'Flag') + '</button><button class="lx-b p" id="lxN">' + (last ? 'Review →' : 'Next →') + '</button></div>' +
      '<div class="lx-links"><button class="q" id="lxX">Exit exam</button><button id="lxR">Review answers (' + answeredN() + '/' + S.qs.length + ')</button></div></div>';
    bindPick(r, it, true);
    $('#lxP', r).onclick = function () { if (S.at) { S.at--; saveLive(); draw(); top(); } };
    $('#lxN', r).onclick = function () { if (last) { S.v = 'review'; draw(); top(); } else { S.at++; saveLive(); draw(); top(); } };
    $('#lxF', r).onclick = function () { if (S.flag[S.at]) delete S.flag[S.at]; else S.flag[S.at] = 1; saveLive(); draw(); };
    $('#lxR', r).onclick = function () { S.v = 'review'; draw(); top(); };
    $('#lxX', r).onclick = function () { if (confirm('Exit the mock exam? Your answers will not be marked.')) { clearLive(); go('home'); } };
    startTick();
  }
  function review(r) {
    var a = answeredN(), un = S.qs.length - a, fl = Object.keys(S.flag).length;
    r.innerHTML = '<div class="lx">' + examBar() +
      '<div class="lx-panel"><b style="font-size:18px">Review your answers</b><div style="font-size:14.5px;color:#52606D;margin-top:4px">' + a + ' answered · ' + un + ' unanswered · ' + fl + ' flagged. Tap a number to go back to that question.</div>' +
      '<div class="lx-grid">' + S.qs.map(function (it, n) { var done = S.ans[n] && S.ans[n].length === need(it.q); return '<button class="lx-cell' + (done ? ' a' : '') + (S.flag[n] ? ' f' : '') + '" data-g="' + n + '">' + (n + 1) + '</button>'; }).join('') + '</div>' +
      '<div class="lx-key"><span><i style="background:#EEF9F3;border-color:#1FA463"></i>Answered</span><span><i></i>Unanswered</span><span>⚑ Flagged</span></div></div>' +
      (un ? '<div class="lu-note" style="color:#A15C00;margin:0 2px 10px">⚠️ You have ' + un + ' unanswered question' + (un === 1 ? '' : 's') + '. Unanswered questions are marked wrong.</div>' : '') +
      '<div class="lx-nav" style="grid-template-columns:1fr 1fr"><button class="lx-b" id="lxBk">← Back to questions</button><button class="lx-b p" id="lxS">Submit exam</button></div></div>';
    $$('[data-g]', r).forEach(function (b) { b.onclick = function () { S.v = 'mock'; S.at = +b.dataset.g; saveLive(); draw(); top(); }; });
    $('#lxBk', r).onclick = function () { S.v = 'mock'; var f = Object.keys(S.flag)[0]; S.at = f != null ? +f : Math.min(S.at, S.qs.length - 1); draw(); top(); };
    $('#lxS', r).onclick = function () { if (confirm(un ? 'You have ' + un + ' unanswered question' + (un === 1 ? '' : 's') + '. Submit your exam now?' : 'Submit your exam now? You can’t change your answers after this.')) finishMock(false); };
    startTick();
  }
  function startTick() { tick(); timer = setInterval(tick, 1000); }
  function tick() {
    var t = document.getElementById('lxT'); if (!t) return stopTimer();
    var left = Math.max(0, Math.round((S.end - Date.now()) / 1000));
    t.textContent = '⏱ ' + mmss(left) + ' left'; t.classList.toggle('low', left <= 300);
    if (!left) { stopTimer(); finishMock(true); }
  }
  function finishMock(timeUp) {
    var d = load(), score = 0, byCh = {};
    var items = S.qs.map(function (it, n) {
      var pick = S.ans[n] || [], ok = isRight(it.q, pick, it.opts);
      d.n++; d.seen[it.q.id] = 1; byCh[it.q.c] = byCh[it.q.c] || [0, 0]; byCh[it.q.c][1]++;
      if (ok) { score++; d.ok++; byCh[it.q.c][0]++; if (d.wrong[it.q.id]) { d.wrong[it.q.id]--; if (d.wrong[it.q.id] <= 0) delete d.wrong[it.q.id]; } }
      else d.wrong[it.q.id] = (d.wrong[it.q.id] || 0) + 1;
      return { q: it.q, opts: it.opts, pick: pick };
    });
    d.mocks.push({ at: today(), s: score, ch: byCh }); if (d.mocks.length > 50) d.mocks = d.mocks.slice(-50);
    d.last = S.qs.map(function (it) { return it.q.id; });
    save(d); clearLive(); gt('lifeuk_mock_done', { value: score });
    go('result', { kind: 'mock', items: items, score: score, timeUp: !!timeUp, used: Math.min(MOCK_MIN, Math.round((Date.now() - S.t0) / 60000)), tab: 'all' });
  }

  // ───── ✅ results (mock and practice) ─────
  function result(r) {
    var n = S.items.length, pc = n ? Math.round(S.score / n * 100) : 0, mock = S.kind === 'mock', pass = S.score >= PASS;
    var wrong = S.items.filter(function (x) { return !isRight(x.q, x.pick, x.opts); }), byCh = {};
    wrong.forEach(function (w) { byCh[w.q.c] = (byCh[w.q.c] || 0) + 1; });
    var study = Object.keys(byCh).sort(function (a, b) { return byCh[b] - byCh[a]; });
    var list = S.tab === 'wrong' ? S.items.filter(function (x) { return wrong.indexOf(x) >= 0; }) : S.items;
    r.innerHTML = '<div class="lx">' + (mock ? '<div class="lx-bar"><b>Life in the UK — Mock Exam · Result</b></div>' : '<div class="lx-bar"><b>Practice · Result</b></div>') +
      '<div class="lx-panel lx-res">' + (S.timeUp ? '<div style="font-weight:800;color:#B42318;margin-bottom:6px">Time is up — your exam was submitted automatically.</div>' : '') +
      '<div class="sc">' + S.score + '/' + n + '</div><div class="pc">' + pc + '%</div>' +
      (mock ? '<div class="pf ' + (pass ? 'ok' : 'no') + '">' + (pass ? 'PASS' : 'FAIL') + '</div><div style="font-size:14px;color:#52606D;margin-top:8px">' + (pass ? 'You reached the pass mark of 75% (18 correct).' : 'The pass mark is 75% — 18 correct answers. You needed ' + (PASS - S.score) + ' more.') + '</div>' : '') +
      '<div class="meta"><span>✓ ' + S.score + ' correct</span><span>✗ ' + (n - S.score) + ' incorrect</span>' + (S.used != null ? '<span>⏱ ' + Math.max(1, S.used) + ' min</span>' : '') + '</div></div>' +
      (study.length ? '<div class="lx-panel"><b style="font-size:16px">📖 Chapters to study</b>' + study.map(function (c) { return '<div class="lu-li"><i>' + CH[c - 1][2] + '</i><span style="flex:1">Chapter ' + c + ': ' + esc(chName(+c)) + '</span><b>' + byCh[c] + ' wrong</b></div>'; }).join('') + '</div>' : '') +
      '<div class="lx-nav" style="grid-template-columns:1fr 1fr;margin-bottom:12px"><button class="lx-b p" id="lxA">' + (mock ? 'Retry with different questions' : 'Practise again') + '</button><button class="lx-b" id="lxH">Done</button></div>' +
      '<div class="lx-panel"><b style="font-size:16px">Review ' + (mock ? 'all ' + n + ' questions' : 'your answers') + '</b>' +
      '<div class="lx-tabs"><button data-t="all" aria-pressed="' + (S.tab !== 'wrong') + '">All (' + n + ')</button><button data-t="wrong" aria-pressed="' + (S.tab === 'wrong') + '">Incorrect (' + wrong.length + ')</button></div>' +
      (list.length ? list.map(function (x) {
        var ok = isRight(x.q, x.pick, x.opts), num = S.items.indexOf(x) + 1, you = x.pick.length ? pickedText(x, x.pick) : 'No answer';
        return '<div class="lx-rv"><div class="h"><i class="' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✗') + '</i><div><b>' + num + '. ' + esc(qText(x.q)) + '</b>' +
          '<div class="y' + (ok ? ' ok' : '') + '">Your answer: ' + esc(you) + '</div>' + (ok ? '' : '<div class="a">Correct answer: ' + esc(rightText(x.q)) + '</div>') +
          '<div class="e">' + esc(x.q.e) + (x.q.x ? ' 🕒 ' + esc(x.q.x) : '') + '</div><span class="c">📖 Chapter ' + x.q.c + ': ' + esc(chName(x.q.c)) + '</span></div></div></div>';
      }).join('') : '<div style="color:#52606D;padding:8px 0">No incorrect answers — well done!</div>') +
      (wrong.length ? '<div class="lu-note" style="margin:10px 0 0">Your incorrect answers are saved in “Retake my wrong answers”.</div>' : '') + '</div>' +
      '<div class="lu-disc">' + esc(DISCLAIMER) + '</div></div>';
    $$('[data-t]', r).forEach(function (b) { b.onclick = function () { S.tab = b.dataset.t; draw(); }; });
    $('#lxA', r).onclick = function () { if (mock) startMock(); else startPrac(S.mode, S.n, S.fb); };
    $('#lxH', r).onclick = function () { go('home'); };
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

  window.LifeUK = { css: addCss, open: open, summary: summary, setDate: setDate, mock: function () { open(); getQ().then(function () { if (liveMock()) resumeMock(); else startMock(); }); }, DISCLAIMER: DISCLAIMER };
  // 🔗 links: auntietobi.co.uk/life-in-uk-test (→ /?lifeuk=1), /life-in-uk-test/mock, /life-in-uk-test/before
  var m = location.search.match(/[?&]lifeuk(?:=([a-z]+))?/i);
  if (m || location.pathname.replace(/\/$/, '') === '/life-in-uk-test') {
    var go2 = function () { if (m && m[1] === 'mock') window.LifeUK.mock(); else open(m && m[1] === 'before' ? 'before' : 'home'); gt('lifeuk_link', { label: (m && m[1]) || 'home' }); };
    if (document.readyState === 'complete') setTimeout(go2, 900); else window.addEventListener('load', function () { setTimeout(go2, 900); });
  }
})();
