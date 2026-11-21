/*
 * 🚗 Driving Theory Test — practice inside the Auntie Tobi app.
 * Questions: /drive-q.json — written from The Highway Code and Know your traffic signs (the books GOV.UK says the
 * test is based on), grouped by the official theory test topics. Each links to its Highway Code section on GOV.UK.
 * Road signs are drawn here (SVG). Test facts from GOV.UK, checked 21 Nov 2026. Marking happens on the phone — no AI.
 * Progress is kept on this device (localStorage "tobi_drive"). Uses the Life in the UK page styles (lifeuk.js).
 */
(function () {
  'use strict';
  var KEY = 'tobi_drive', CHECKED = '21 November 2026', MOCK_N = 50, MOCK_MIN = 57, PASS = 43;
  var TOP = [
    [1, 'Alertness', '👀'], [2, 'Attitude', '🤝'], [3, 'Safety and your vehicle', '🔧'], [4, 'Safety margins', '📏'],
    [5, 'Hazard awareness', '⚠️'], [6, 'Vulnerable road users', '🚸'], [7, 'Other types of vehicle', '🚌'], [8, 'Vehicle handling', '🛞'],
    [9, 'Motorway rules', '🛣️'], [10, 'Rules of the road', '🚦'], [11, 'Road and traffic signs', '🛑'], [12, 'Essential documents', '📄'],
    [13, 'Incidents, accidents and emergencies', '🚑'], [14, 'Vehicle loading', '📦'],
  ];
  var HC = 'https://www.gov.uk/guidance/the-highway-code/';
  var SEC = {
    intro: ['Introduction and hierarchy of road users', 'introduction'], ped: ['Rules for pedestrians (1–35)', 'rules-for-pedestrians-1-to-35'],
    ani: ['Rules about animals (47–58)', 'rules-about-animals-47-to-58'], cyc: ['Rules for cyclists (59–82)', 'rules-for-cyclists-59-to-82'],
    moto: ['Rules for motorcyclists (83–88)', 'rules-for-motorcyclists-83-to-88'], drv: ['Rules for drivers and motorcyclists (89–102)', 'rules-for-drivers-and-motorcyclists-89-to-102'],
    gen: ['General rules for all drivers and riders (103–158)', 'general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158'],
    road: ['Using the road (159–203)', 'using-the-road-159-to-203'], care: ['Road users requiring extra care (204–225)', 'road-users-requiring-extra-care-204-to-225'],
    wea: ['Driving in adverse weather (226–237)', 'driving-in-adverse-weather-conditions-226-to-237'], park: ['Waiting and parking (238–252)', 'waiting-and-parking-238-to-252'],
    mway: ['Motorways (253–273)', 'motorways-253-to-273'], brk: ['Breakdowns and incidents (274–287)', 'breakdowns-and-incidents-274-to-287'],
    works: ['Road works, level crossings and tramways (288–307)', 'road-works-level-crossings-and-tramways-288-to-307'],
    signs: ['Traffic signs', 'traffic-signs'], mark: ['Road markings', 'road-markings'], sig: ['Signals to other road users', 'signals-to-other-road-users'],
    auth: ['Signals by authorised persons', 'signals-by-authorised-persons'], vmark: ['Vehicle markings', 'vehicle-markings'],
    docs: ['Annex 3: Documents and learner drivers', 'annex-3-motor-vehicle-documentation-and-learner-driver-requirements'],
    law: ['Annex 4: The road user and the law', 'annex-4-the-road-user-and-the-law'], pen: ['Annex 5: Penalties', 'annex-5-penalties'],
    maint: ['Annex 6: Vehicle maintenance, safety and security', 'annex-6-vehicle-maintenance-safety-and-security'],
    aid: ['Annex 7: First aid on the road', 'annex-7-first-aid-on-the-road'], new: ['Annex 8: Safety code for new drivers', 'annex-8-safety-code-for-new-drivers'],
  };
  var GOV = {
    book: 'https://www.gov.uk/book-theory-test', guide: 'https://www.gov.uk/theory-test', take: 'https://www.gov.uk/theory-test/what-to-take',
    mc: 'https://www.gov.uk/theory-test/multiple-choice-questions', hp: 'https://www.gov.uk/theory-test/hazard-perception-test',
    pass: 'https://www.gov.uk/theory-test/pass-mark-and-result', rev: 'https://www.gov.uk/theory-test/revision-and-practice',
    practice: 'https://www.gov.uk/take-practice-theory-test', prov: 'https://www.gov.uk/apply-first-provisional-driving-licence',
    nongb: 'https://www.gov.uk/exchange-foreign-driving-licence', hc: 'https://www.gov.uk/guidance/the-highway-code',
  };
  var Q = null, loading = null, S = { v: 'home' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'drive' }, p || {})); } catch (x) {} }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { mocks: d.mocks || [], seen: d.seen || {}, wrong: d.wrong || {}, n: d.n || 0, ok: d.ok || 0, date: d.date || '' }; } catch (e) { return { mocks: [], seen: {}, wrong: {}, n: 0, ok: 0, date: '' }; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function niceDate(iso) { if (!iso) return ''; return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
  function daysTo(iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); }
  function topName(c) { return (TOP[c - 1] || [])[1] || ''; }
  function getQ() {
    if (Q) return Promise.resolve(Q);
    if (!loading) loading = fetch('/drive-q.json?v=20261121a').then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }).then(function (j) { Q = j; return Q; });
    return loading;
  }
  function optsOf(q) {
    if (q.t === 't') return [{ i: 0, tx: 'True', ok: q.a === true }, { i: 1, tx: 'False', ok: q.a === false }];
    return shuffle(q.o.map(function (tx, i) { return { i: i, tx: tx, ok: q.t === '2' ? i < 2 : i === 0 }; }));
  }
  function rightText(q) { return q.t === 't' ? (q.a ? 'True' : 'False') : q.t === '2' ? q.o[0] + ' and ' + q.o[1] : q.o[0]; }

  // ───── 🛑 road signs, drawn in the official shapes and colours ─────
  var R = '#C8102E', B = '#0B4EA2', K = '#111', W = '#fff';
  var SIL = '<defs><filter id="dtBlk"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter></defs>';
  function svg(inner, w, h) { return '<svg viewBox="0 0 ' + (w || 120) + ' ' + (h || 120) + '" width="' + (w ? Math.round(w * 1.25) : 150) + '" height="' + (h ? Math.round(h * 1.25) : 150) + '" role="img" aria-label="Road sign" style="display:block;margin:4px auto 12px;max-width:100%">' + SIL + inner + '</svg>'; }
  function ring(c) { return '<circle cx="60" cy="60" r="52" fill="' + W + '" stroke="' + R + '" stroke-width="12"/>' + c; }
  function blue(c) { return '<circle cx="60" cy="60" r="55" fill="' + B + '" stroke="' + W + '" stroke-width="2"/>' + c; }
  function tri(c) { return '<path d="M60 10 L114 104 L6 104 Z" fill="' + W + '" stroke="' + R + '" stroke-width="10" stroke-linejoin="round"/>' + c; }
  function emo(e, y, size) { return '<text x="60" y="' + (y || 86) + '" font-size="' + (size || 40) + '" text-anchor="middle" filter="url(#dtBlk)">' + e + '</text>'; }
  function txt(t, x, y, size, fill, weight) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-weight="' + (weight || 800) + '" fill="' + fill + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">' + t + '</text>'; }
  function arrowHead(x, y, dir, col) { var p = { up: [x, y - 9, x - 9, y + 4, x + 9, y + 4], down: [x, y + 9, x - 9, y - 4, x + 9, y - 4], left: [x - 9, y, x + 4, y - 9, x + 4, y + 9], right: [x + 9, y, x - 4, y - 9, x - 4, y + 9] }[dir]; return '<polygon points="' + p.join(',') + '" fill="' + col + '"/>'; }
  var SIGN = {
    sl20: function () { return svg(ring(txt('20', 60, 77, 48, K))); }, sl30: function () { return svg(ring(txt('30', 60, 77, 48, K))); }, sl50: function () { return svg(ring(txt('50', 60, 77, 48, K))); },
    nsl: function () { return svg('<circle cx="60" cy="60" r="55" fill="#fff" stroke="#333" stroke-width="2"/><line x1="94" y1="22" x2="26" y2="98" stroke="' + K + '" stroke-width="16"/>'); },
    noentry: function () { return svg('<circle cx="60" cy="60" r="56" fill="' + R + '"/><rect x="22" y="50" width="76" height="20" fill="#fff"/>'); },
    stop: function () { return svg('<polygon points="38,6 82,6 114,38 114,82 82,114 38,114 6,82 6,38" fill="' + R + '" stroke="#fff" stroke-width="3"/>' + txt('STOP', 60, 72, 30, W, 900)); },
    giveway: function () { return svg('<path d="M6 14 L114 14 L60 108 Z" fill="#fff" stroke="' + R + '" stroke-width="10" stroke-linejoin="round"/>' + txt('GIVE', 60, 44, 15, K, 900) + txt('WAY', 60, 61, 15, K, 900)); },
    clearway: function () { return svg('<circle cx="60" cy="60" r="52" fill="' + B + '" stroke="' + R + '" stroke-width="12"/><line x1="25" y1="25" x2="95" y2="95" stroke="' + R + '" stroke-width="11"/><line x1="95" y1="25" x2="25" y2="95" stroke="' + R + '" stroke-width="11"/>'); },
    nowait: function () { return svg('<circle cx="60" cy="60" r="52" fill="' + B + '" stroke="' + R + '" stroke-width="12"/><line x1="25" y1="25" x2="95" y2="95" stroke="' + R + '" stroke-width="11"/>'); },
    ahead: function () { return svg(blue('<line x1="60" y1="96" x2="60" y2="40" stroke="#fff" stroke-width="12"/>' + '<polygon points="60,18 38,46 82,46" fill="#fff"/>')); },
    turnleft: function () { return svg(blue('<path d="M74 98 L74 56 Q74 46 64 46 L44 46" fill="none" stroke="#fff" stroke-width="12"/><polygon points="22,46 46,26 46,66" fill="#fff"/>')); },
    keepleft: function () { return svg(blue('<line x1="84" y1="30" x2="44" y2="70" stroke="#fff" stroke-width="12"/><polygon points="30,86 32,52 64,82" fill="#fff"/>')); },
    minirbt: function () { var a = ''; [0, 120, 240].forEach(function (r) { a += '<g transform="rotate(' + r + ' 60 60)"><path d="M60 26 A34 34 0 0 1 89 43" fill="none" stroke="#fff" stroke-width="9"/><polygon points="95,52 80,46 94,36" fill="#fff"/></g>'; }); return svg(blue(a)); },
    noright: function () { return svg(ring('<path d="M48 94 L48 56 Q48 46 58 46 L74 46" fill="none" stroke="' + K + '" stroke-width="10"/><polygon points="92,46 72,30 72,62" fill="' + K + '"/><line x1="26" y1="26" x2="94" y2="94" stroke="' + R + '" stroke-width="10"/>')); },
    nouturn: function () { return svg(ring('<path d="M44 92 L44 54 Q44 34 60 34 Q76 34 76 54 L76 72" fill="none" stroke="' + K + '" stroke-width="10"/><polygon points="76,92 62,70 90,70" fill="' + K + '"/><line x1="26" y1="26" x2="94" y2="94" stroke="' + R + '" stroke-width="10"/>')); },
    w_rbt: function () { var a = ''; [0, 120, 240].forEach(function (r) { a += '<g transform="rotate(' + r + ' 60 72)"><path d="M60 52 A20 20 0 0 1 77 62" fill="none" stroke="' + K + '" stroke-width="6"/><polygon points="81,69 71,64 80,57" fill="' + K + '"/></g>'; }); return svg(tri(a)); },
    w_tjunc: function () { return svg(tri('<rect x="54" y="62" width="12" height="32" fill="' + K + '"/><rect x="30" y="50" width="60" height="12" fill="' + K + '"/>')); },
    w_cross: function () { return svg(tri('<rect x="54" y="40" width="12" height="54" fill="' + K + '"/><rect x="32" y="60" width="56" height="12" fill="' + K + '"/>')); },
    w_bendr: function () { return svg(tri('<path d="M50 98 L50 74 Q50 56 66 52" fill="none" stroke="' + K + '" stroke-width="10"/><polygon points="84,50 64,38 66,64" fill="' + K + '"/>')); },
    w_dblbend: function () { return svg(tri('<path d="M62 98 Q46 84 60 70 Q74 58 58 46" fill="none" stroke="' + K + '" stroke-width="9"/>' + arrowHead(56, 42, 'up', K))); },
    w_narrow: function () { return svg(tri('<path d="M38 96 L38 76 L50 60 L50 44" fill="none" stroke="' + K + '" stroke-width="7"/><path d="M82 96 L82 76 L70 60 L70 44" fill="none" stroke="' + K + '" stroke-width="7"/>')); },
    w_twoway: function () { return svg(tri('<line x1="48" y1="94" x2="48" y2="56" stroke="' + K + '" stroke-width="7"/>' + arrowHead(48, 50, 'up', K) + '<line x1="72" y1="46" x2="72" y2="84" stroke="' + K + '" stroke-width="7"/>' + arrowHead(72, 90, 'down', K))); },
    w_lights: function () { return svg(tri('<rect x="47" y="40" width="26" height="58" rx="5" fill="' + K + '"/><circle cx="60" cy="52" r="7" fill="#E4002B"/><circle cx="60" cy="69" r="7" fill="#FFB000"/><circle cx="60" cy="86" r="7" fill="#00A651"/>')); },
    w_slip: function () { return svg(tri(emo('🚗', 72, 30) + '<path d="M40 86 q5 -6 10 0 t10 0 t10 0 t10 0" fill="none" stroke="' + K + '" stroke-width="4"/><path d="M40 95 q5 -6 10 0 t10 0 t10 0 t10 0" fill="none" stroke="' + K + '" stroke-width="4"/>')); },
    w_ped: function () { return svg(tri(emo('🚶', 94, 46))); }, w_kids: function () { return svg(tri(emo('🏃🏃', 92, 30))); },
    w_cycle: function () { return svg(tri(emo('🚲', 92, 42))); }, w_cattle: function () { return svg(tri(emo('🐄', 92, 42))); },
    w_deer: function () { return svg(tri(emo('🦌', 92, 42))); }, w_horse: function () { return svg(tri(emo('🏇', 94, 44))); },
    w_lcbar: function () { return svg(tri('<rect x="30" y="64" width="60" height="7" fill="' + K + '"/><rect x="30" y="80" width="60" height="7" fill="' + K + '"/><rect x="34" y="58" width="7" height="38" fill="' + K + '"/><rect x="57" y="58" width="7" height="38" fill="' + K + '"/><rect x="80" y="58" width="7" height="38" fill="' + K + '"/>')); },
    w_lcnobar: function () { return svg(tri(emo('🚂', 92, 40))); },
    w_hump: function () { return svg(tri('<path d="M26 94 Q60 44 94 94 Z" fill="' + K + '"/>')); },
    w_steep: function () { return svg(tri('<path d="M28 94 L92 94 L28 58 Z" fill="' + K + '"/>' + txt('10%', 80, 68, 15, K))); },
    w_danger: function () { return svg(tri('<rect x="54" y="40" width="12" height="36" rx="3" fill="' + K + '"/><circle cx="60" cy="88" r="7" fill="' + K + '"/>')); },
    w_works: function () { return svg(tri('<path d="M70 96 Q84 80 98 96 Z" fill="' + K + '"/><circle cx="50" cy="52" r="6" fill="' + K + '"/><path d="M50 60 L46 80 L38 96 M46 80 L56 96 M48 66 L66 76" fill="none" stroke="' + K + '" stroke-width="6" stroke-linecap="round"/><line x1="62" y1="64" x2="78" y2="90" stroke="' + K + '" stroke-width="4"/><path d="M74 86 L84 92 L80 98 Z" fill="' + K + '"/>')); },
    i_mway: function () { return svg('<rect x="2" y="12" width="156" height="72" rx="8" fill="' + B + '" stroke="#fff" stroke-width="3"/>' + '<rect x="16" y="24" width="44" height="26" rx="4" fill="none" stroke="#fff" stroke-width="2"/>' + txt('M1', 38, 44, 18, W) + txt('The NORTH', 104, 44, 15, W, 700) + txt('Leeds 45', 80, 72, 17, W, 700), 160, 96); },
    i_primary: function () { return svg('<rect x="2" y="12" width="156" height="72" rx="8" fill="#00703C" stroke="#fff" stroke-width="3"/>' + txt('A40', 40, 44, 20, '#FFD200') + txt('Oxford 12', 80, 72, 18, W, 700), 160, 96); },
    i_local: function () { return svg('<rect x="2" y="12" width="156" height="72" rx="8" fill="#fff" stroke="' + K + '" stroke-width="3"/>' + txt('Hilltown 3', 80, 56, 20, K, 700), 160, 96); },
    i_tourist: function () { return svg('<rect x="2" y="12" width="156" height="72" rx="8" fill="#6B3A1E" stroke="#fff" stroke-width="3"/>' + txt('Castle', 80, 56, 22, W, 700), 160, 96); },
    i_temp: function () { return svg('<rect x="2" y="12" width="156" height="72" rx="8" fill="#FFD200" stroke="' + K + '" stroke-width="3"/>' + txt('DIVERSION', 80, 57, 20, K, 900), 160, 96); },
    i_count: function () { var o = ''; [3, 2, 1].forEach(function (n, k) { var x = 14 + k * 50; o += '<rect x="' + x + '" y="10" width="34" height="86" fill="' + B + '"/>'; for (var b = 0; b < n; b++) o += '<line x1="' + (x + 4) + '" y1="' + (30 + b * 20) + '" x2="' + (x + 30) + '" y2="' + (20 + b * 20) + '" stroke="#fff" stroke-width="6"/>'; }); return svg(o, 160, 106); },
    i_redx: function () { return svg('<rect x="10" y="10" width="100" height="100" rx="6" fill="#111"/><line x1="32" y1="32" x2="88" y2="88" stroke="#ff2a2a" stroke-width="12"/><line x1="88" y1="32" x2="32" y2="88" stroke="#ff2a2a" stroke-width="12"/>'); },
    i_parking: function () { return svg('<rect x="10" y="10" width="100" height="100" rx="8" fill="' + B + '" stroke="#fff" stroke-width="3"/>' + txt('P', 60, 88, 76, W, 900)); },
    i_oneway: function () { return svg('<rect x="4" y="22" width="152" height="56" rx="6" fill="' + B + '" stroke="#fff" stroke-width="3"/><line x1="26" y1="50" x2="112" y2="50" stroke="#fff" stroke-width="12"/><polygon points="138,50 110,30 110,70" fill="#fff"/>', 160, 100); },
    i_hospital: function () { return svg('<rect x="10" y="10" width="100" height="100" rx="8" fill="' + B + '" stroke="#fff" stroke-width="3"/>' + txt('H', 50, 86, 70, W, 900) + '<rect x="80" y="20" width="8" height="24" fill="#E4002B"/><rect x="72" y="28" width="24" height="8" fill="#E4002B"/>'); },
  };

  // ───── open / leave ─────
  var obs = null, timer = null;
  function open(view) {
    if (window.LifeUK && window.LifeUK.css) window.LifeUK.css(); addCss();
    try { if (typeof clearExamState === 'function') clearExamState(); } catch (e) {}
    var msgs = document.getElementById('messages'); if (!msgs) return;
    window._currentPage = 'drive'; window.__homeRender = false;
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="dtRoot" class="lu"></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); else msgs.scrollTop = 0; } catch (e) {}
    document.body.classList.add('lu-nochat');
    if (!obs && window.MutationObserver) { obs = new MutationObserver(function () { if (!document.getElementById('dtRoot')) { obs.disconnect(); obs = null; stopTimer(); if (!document.getElementById('luRoot')) document.body.classList.remove('lu-nochat'); } }); obs.observe(msgs, { childList: true }); }
    gt('drive_open'); S = { v: view || 'home' };
    root().innerHTML = '<div class="lu-card" style="text-align:center;color:#6B7280">Loading questions…</div>';
    getQ().then(function () { draw(); }).catch(function () { root().innerHTML = '<div class="lu-card">Couldn’t load the questions — check your connection and try again.<div class="lu-row"><button class="lu-btn" id="dtRe">Try again</button></div></div>'; $('#dtRe').onclick = function () { loading = null; open(view); }; });
  }
  function addCss() {
    if (document.getElementById('dtCss')) return; var st = document.createElement('style'); st.id = 'dtCss';
    st.textContent = '.dt-top{background:linear-gradient(135deg,#0F1E36,#057A44)!important}.dt-flag{border:1.5px solid #E3E0D7;background:#fff;border-radius:10px;padding:6px 10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#0F1E36}.dt-flag.on{background:#FFF1CF;border-color:#F2C14E;color:#7A5300}' +
      '.dt-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:10px 0}.dt-grid button{border:1.5px solid #E3E0D7;background:#fff;border-radius:9px;padding:8px 0;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;color:#0F1E36;position:relative}.dt-grid button.a{background:#E7EFFD;border-color:#9DB6E6}.dt-grid button.f::after{content:"🚩";position:absolute;top:-8px;right:-5px;font-size:11px}' +
      '.dt-hc{display:inline-block;margin-top:6px;font-size:13px;color:#057A44;font-weight:700;text-decoration:none}';
    document.head.appendChild(st);
  }
  function root() { return document.getElementById('dtRoot'); }
  function leave() { stopTimer(); document.body.classList.remove('lu-nochat'); if (typeof resetToWelcome === 'function') resetToWelcome(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function top() { var r = document.getElementById('messages'); try { if (r) r.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }
  function draw() { stopTimer(); var r = root(); if (!r) return; ({ home: home, topics: topics, prac: pracQ, mock: mockQ, review: mockReview, mockEnd: mockEnd, before: before, hazard: hazard, licence: licence })[S.v](r); }
  function go(v) { S = { v: v }; draw(); top(); }

  // ───── 🏠 home ─────
  function home(r) {
    var d = load(), best = d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), weak = Object.keys(d.wrong).length, last = d.mocks[d.mocks.length - 1];
    var dl = d.date ? daysTo(d.date) : null, nSigns = Q.filter(function (q) { return q.g; }).length;
    r.innerHTML = '<button class="lu-back" id="dtBack">← Home</button>' +
      '<div class="lu-top dt-top"><b>🚗 Driving Theory Test</b><span>' + Q.length + ' practice questions from the Highway Code, with road sign pictures. Marked straight away — free.</span></div>' +
      (d.date && dl >= 0 ? '<div class="lu-card" style="border-color:#F2D58A;background:#FFFBEF"><b style="font-size:16px">📅 Your theory test: ' + esc(niceDate(d.date)) + '</b><div style="font-size:14px;color:#7A5300;margin-top:3px">' + (dl === 0 ? 'It’s today — good luck! Bring your photocard licence.' : dl === 1 ? 'Tomorrow! Have your photocard licence ready.' : dl + ' days to go') + '</div></div>' : '') +
      '<div class="lu-stats"><div class="lu-stat"><b>' + d.mocks.length + '</b><small>Mock tests</small></div><div class="lu-stat"><b>' + (d.mocks.length ? best + '/50' : '–') + '</b><small>Best score</small></div><div class="lu-stat"><b>' + d.n + '</b><small>Answered</small></div></div>' +
      (last ? '<div class="lu-note" style="margin-top:0">Last mock: <b>' + last.s + '/50</b> — ' + (last.s >= PASS ? '✅ a pass' : '❌ not a pass yet (you need ' + PASS + ')') + '</div>' : '') +
      '<button class="lu-big" id="dtMock"><i>🎯</i><span><b>Mock test</b><small>50 questions · 57 minutes · pass is 43, like the real test</small></span></button>' +
      '<button class="lu-big w" id="dtSigns"><i>🛑</i><span><b>Road signs</b><small>' + nSigns + ' signs with pictures</small></span></button>' +
      '<button class="lu-big w" id="dtPrac"><i>📚</i><span><b>Practise by topic</b><small>14 official topics, with the reason and the Highway Code rule</small></span></button>' +
      (weak ? '<button class="lu-big y" id="dtWeak"><i>💪</i><span><b>My weak spots · ' + weak + '</b><small>Questions you got wrong — get them right to clear them</small></span></button>' : '') +
      '<button class="lu-big w" id="dtHaz"><i>🎬</i><span><b>Hazard perception</b><small>How the second part works and how to score well</small></span></button>' +
      '<button class="lu-big w" id="dtBefore"><i>📋</i><span><b>Before your test</b><small>Cost, what to bring, pass marks — checked on GOV.UK</small></span></button>' +
      '<button class="lu-big w" id="dtLic"><i>🇳🇬</i><span><b>Driving here on a Nigerian licence</b><small>How long you can use it and what to do next</small></span></button>' +
      (window.MyPlan && window.MyPlan.driveTest ? '<button class="lu-big w" id="dtPlan"><i>💚</i><span><b>' + (d.date ? 'Change your test date' : 'Add your theory test to My Plan') + '</b><small>Countdown, reminders and a checklist</small></span></button>' : '') +
      '<button class="lu-big w" id="dtShare"><i>📤</i><span><b>Share with a friend</b><small>auntietobi.co.uk/driving-theory-test</small></span></button>' +
      '<div class="lu-note">Practice questions written by Auntie Tobi from <a href="' + GOV.hc + '" target="_blank" rel="noopener">The Highway Code</a> and <i>Know your traffic signs</i>. They are not the real test questions. Always check the latest rules on GOV.UK.</div>';
    $('#dtBack', r).onclick = leave; $('#dtMock', r).onclick = startMock;
    $('#dtSigns', r).onclick = function () { startPrac('signs'); }; $('#dtPrac', r).onclick = function () { go('topics'); };
    if ($('#dtWeak', r)) $('#dtWeak', r).onclick = function () { startPrac('weak'); };
    $('#dtHaz', r).onclick = function () { go('hazard'); }; $('#dtBefore', r).onclick = function () { go('before'); }; $('#dtLic', r).onclick = function () { go('licence'); };
    if ($('#dtPlan', r)) $('#dtPlan', r).onclick = function () { window.MyPlan.driveTest(); };
    $('#dtShare', r).onclick = function () {
      var url = 'https://auntietobi.co.uk/driving-theory-test', text = 'Practise for the UK driving theory test free on Auntie Tobi 🚗 — 400 Highway Code questions, road signs and 57-minute mock tests:';
      gt('drive_share'); if (navigator.share) { navigator.share({ title: 'Driving theory test practice', text: text, url: url }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
    };
  }

  // ───── 📚 topics ─────
  function topics(r) {
    var d = load();
    r.innerHTML = '<button class="lu-back" id="dtB">← Back</button><div class="lu-h" style="margin-top:0">Practise by topic</div>' +
      '<button class="lu-ch" data-c="0"><i>🔀</i><span style="flex:1"><b>All topics, mixed</b><small>' + Q.length + ' questions</small></span></button>' +
      TOP.map(function (t) {
        var qs = Q.filter(function (q) { return q.c === t[0]; }), seen = qs.filter(function (q) { return d.seen[q.id]; }).length, pc = Math.round(seen / qs.length * 100);
        return '<button class="lu-ch" data-c="' + t[0] + '"><i>' + t[2] + '</i><span style="flex:1"><b>' + esc(t[1]) + '</b><small>' + qs.length + ' questions · ' + seen + ' done</small><div class="lu-bar"><span style="width:' + pc + '%"></span></div></span></button>';
      }).join('') + '<div class="lu-note">These are the 14 topics the real theory test covers.</div>';
    $('#dtB', r).onclick = function () { go('home'); };
    $$('[data-c]', r).forEach(function (b) { b.onclick = function () { startPrac(+b.dataset.c); }; });
  }

  // ───── practice ─────
  function pool(mode) {
    var d = load();
    if (mode === 'weak') return Q.filter(function (q) { return d.wrong[q.id]; });
    if (mode === 'signs') return Q.filter(function (q) { return q.g; });
    return Q.filter(function (q) { return !mode || q.c === mode; });
  }
  function nextPrac() {
    var d = load(), p = pool(S.mode); if (!p.length) return null;
    var fresh = p.filter(function (q) { return !d.seen[q.id] && S.done.indexOf(q.id) < 0; });
    var src = fresh.length ? fresh : p.filter(function (q) { return S.done.indexOf(q.id) < 0; });
    if (!src.length) { S.done = []; src = p; }
    return src[Math.floor(Math.random() * src.length)];
  }
  function startPrac(mode) { S = { v: 'prac', mode: mode, done: [], n: 0, ok: 0 }; S.q = nextPrac(); S.opts = S.q ? optsOf(S.q) : []; S.pick = []; S.shown = false; gt('drive_practise', { label: String(mode) }); draw(); top(); }
  function pracQ(r) {
    var q = S.q, title = S.mode === 'weak' ? '💪 Weak spots' : S.mode === 'signs' ? '🛑 Road signs' : S.mode ? TOP[S.mode - 1][2] + ' ' + TOP[S.mode - 1][1] : '🔀 All topics';
    if (!q) { r.innerHTML = '<button class="lu-back" id="dtB">← Back</button><div class="lu-card" style="text-align:center"><b style="font-size:18px">🎉 All cleared!</b><div style="margin-top:6px;color:#6B7280">No weak spots left. Try a mock test.</div></div>'; $('#dtB', r).onclick = function () { go('home'); }; return; }
    r.innerHTML = '<button class="lu-back" id="dtB">← Back</button><div class="lu-qh"><span>' + esc(title) + '</span><span>' + S.ok + ' / ' + S.n + ' right</span></div>' + qHtml(q, true) +
      (S.shown ? fbHtml(q) + '<button class="lu-btn" id="dtN">Next question →</button>' : (q.t === '2' ? '<button class="lu-btn" id="dtC"' + (S.pick.length === 2 ? '' : ' disabled') + '>Check my answer</button>' : ''));
    $('#dtB', r).onclick = function () { go(S.mode === 'weak' || S.mode === 'signs' ? 'home' : 'topics'); };
    bindOpts(r, markPrac);
    if ($('#dtN', r)) $('#dtN', r).onclick = function () { S.done.push(q.id); S.q = nextPrac(); S.opts = S.q ? optsOf(S.q) : []; S.pick = []; S.shown = false; draw(); top(); };
  }
  function isRight(q, pick, opts) { var want = opts.filter(function (o) { return o.ok; }).map(function (o) { return o.i; }).sort().join(','); return pick.slice().sort().join(',') === want; }
  function mark(d, q, ok) { d.n++; if (ok) d.ok++; d.seen[q.id] = 1; if (ok) { if (d.wrong[q.id]) { d.wrong[q.id]--; if (d.wrong[q.id] <= 0) delete d.wrong[q.id]; } } else d.wrong[q.id] = (d.wrong[q.id] || 0) + 1; }
  function markPrac() { var q = S.q, ok = isRight(q, S.pick, S.opts), d = load(); S.shown = true; S.n++; if (ok) S.ok++; mark(d, q, ok); save(d); draw(); }

  function qHtml(q, practice) {
    var lab = ['A', 'B', 'C', 'D'], ask = q.t === 't' ? 'Is this statement TRUE or FALSE?' : q.t === '2' ? 'Choose TWO answers' : '';
    return '<div class="lu-card"><span class="lu-tag">' + TOP[q.c - 1][2] + ' ' + esc(topName(q.c)) + '</span>' + (q.g && SIGN[q.g] ? SIGN[q.g]() : '') +
      (ask ? '<div style="font-size:13px;font-weight:800;color:#7A5300;margin-bottom:4px">' + ask + '</div>' : '') +
      '<div class="lu-q">' + esc(q.t === 't' ? '“' + q.q + '”' : q.q) + '</div>' +
      S.opts.map(function (o, n) {
        var cls = '';
        if (practice && S.shown) { if (o.ok) cls = 'ok'; else if (S.pick.indexOf(o.i) >= 0) cls = 'no'; } else if (S.pick.indexOf(o.i) >= 0) cls = 'sel';
        return '<button class="lu-o ' + cls + '" data-o="' + o.i + '"' + (practice && S.shown ? ' disabled' : '') + '><span class="k">' + (q.t === 't' ? (o.i ? '✗' : '✓') : lab[n]) + '</span><span>' + esc(o.tx) + '</span></button>';
      }).join('') + '</div>';
  }
  function hcLink(q) { var s = SEC[q.s]; return s ? '<a class="dt-hc" href="' + HC + s[1] + '" target="_blank" rel="noopener">📘 Highway Code: ' + esc(s[0]) + ' ↗</a>' : ''; }
  function fbHtml(q) {
    var ok = isRight(q, S.pick, S.opts);
    return '<div class="lu-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✅ Correct!' : '❌ Not quite — the answer is: ' + esc(rightText(q))) + '</b><div style="margin-top:4px">' + esc(q.e) + '</div>' +
      (q.x ? '<span class="lu-x">📍 ' + esc(q.x) + '</span>' : '') + hcLink(q) + '</div>';
  }
  function bindOpts(r, done) {
    var q = S.q;
    $$('[data-o]', r).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.o;
        if (q.t === '2') { var k = S.pick.indexOf(i); if (k >= 0) S.pick.splice(k, 1); else if (S.pick.length < 2) S.pick.push(i); else { S.pick.shift(); S.pick.push(i); } if (S.v === 'mock') S.ans[S.at] = S.pick.slice(); draw(); return; }
        S.pick = [i]; if (S.v === 'mock') { S.ans[S.at] = S.pick.slice(); draw(); return; } done();
      };
    });
    var c = $('#dtC', r); if (c) c.onclick = done;
  }

  // ───── 🎯 mock test: 50 questions, 57 minutes, flag and review like the real test ─────
  function startMock() {
    // spread across all 14 topics roughly in proportion, then shuffle
    var by = {}; Q.forEach(function (q) { (by[q.c] = by[q.c] || []).push(q); });
    var pick = []; Object.keys(by).forEach(function (c) { var n = Math.max(2, Math.round(by[c].length / Q.length * MOCK_N)); pick = pick.concat(shuffle(by[c]).slice(0, n)); });
    pick = shuffle(pick).slice(0, MOCK_N); if (pick.length < MOCK_N) pick = pick.concat(shuffle(Q.filter(function (q) { return pick.indexOf(q) < 0; })).slice(0, MOCK_N - pick.length));
    S = { v: 'mock', qs: pick.map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, flag: {}, at: 0, end: Date.now() + MOCK_MIN * 60000 };
    gt('drive_mock_start'); draw(); top();
  }
  function answered() { return Object.keys(S.ans).filter(function (k) { return S.ans[k] && S.ans[k].length; }).length; }
  function mockQ(r) {
    var it = S.qs[S.at]; S.q = it.q; S.opts = it.opts; S.pick = (S.ans[S.at] || []).slice();
    var last = S.at === S.qs.length - 1;
    r.innerHTML = '<div class="lu-qh"><span>Question ' + (S.at + 1) + ' of ' + MOCK_N + ' · ' + answered() + ' answered</span><span class="lu-timer" id="dtT"></span></div>' + qHtml(it.q, false) +
      '<div class="lu-row" style="margin-top:0"><button class="dt-flag' + (S.flag[S.at] ? ' on' : '') + '" id="dtF">🚩 ' + (S.flag[S.at] ? 'Flagged' : 'Flag to come back') + '</button><span style="flex:1"></span><button class="dt-flag" id="dtR">Review all</button></div>' +
      '<div class="lu-row"><button class="lu-btn g" id="dtP"' + (S.at ? '' : ' disabled') + '>← Back</button><button class="lu-btn" id="dtN">' + (last ? 'Review and finish' : 'Next →') + '</button></div>' +
      '<div class="lu-row" style="margin-top:12px"><button class="lu-btn g" id="dtQ" style="border-color:#E3E0D7;color:#6B7280">Stop test</button></div>';
    bindOpts(r, function () {});
    $('#dtF', r).onclick = function () { S.flag[S.at] = !S.flag[S.at]; draw(); };
    $('#dtR', r).onclick = function () { S.v = 'review'; draw(); top(); };
    $('#dtP', r).onclick = function () { S.at--; draw(); top(); };
    $('#dtN', r).onclick = function () { if (last) { S.v = 'review'; draw(); top(); } else { S.at++; draw(); top(); } };
    $('#dtQ', r).onclick = function () { if (confirm('Stop this mock test? Your answers won’t be saved.')) go('home'); };
    tick(); timer = setInterval(tick, 1000);
  }
  function mockReview(r) {
    var un = S.qs.length - answered(), fl = Object.keys(S.flag).filter(function (k) { return S.flag[k]; }).length;
    r.innerHTML = '<div class="lu-qh"><span>Review your answers</span><span class="lu-timer" id="dtT"></span></div><div class="lu-card"><div style="font-size:15px">' + answered() + ' of ' + MOCK_N + ' answered' + (un ? ' · <b style="color:#B42318">' + un + ' not answered</b>' : '') + (fl ? ' · 🚩 ' + fl + ' flagged' : '') + '</div>' +
      '<div class="dt-grid">' + S.qs.map(function (x, n) { return '<button data-j="' + n + '" class="' + ((S.ans[n] || []).length ? 'a' : '') + (S.flag[n] ? ' f' : '') + '">' + (n + 1) + '</button>'; }).join('') + '</div>' +
      '<div class="lu-note" style="margin:0">Tap a number to go back to it. Blue = answered.</div></div>' +
      '<button class="lu-btn" id="dtEnd">Finish test</button><div class="lu-row"><button class="lu-btn g" id="dtBk">← Back to questions</button></div>';
    $$('[data-j]', r).forEach(function (b) { b.onclick = function () { S.at = +b.dataset.j; S.v = 'mock'; draw(); top(); }; });
    $('#dtBk', r).onclick = function () { S.v = 'mock'; draw(); top(); };
    $('#dtEnd', r).onclick = function () { if (un && !confirm(un + ' question' + (un === 1 ? ' is' : 's are') + ' not answered. Finish anyway?')) return; finishMock(false); };
    tick(); timer = setInterval(tick, 1000);
  }
  function tick() {
    var t = document.getElementById('dtT'); if (!t) return stopTimer();
    var left = Math.max(0, Math.round((S.end - Date.now()) / 1000));
    t.textContent = '⏱ ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); t.classList.toggle('low', left <= 300);
    if (!left) { stopTimer(); finishMock(true); }
  }
  function finishMock(timeUp) {
    var d = load(), score = 0, wrong = [];
    S.qs.forEach(function (it, n) {
      var pick = S.ans[n] || [], ok = !!pick.length && isRight(it.q, pick, it.opts);
      mark(d, it.q, ok); if (ok) score++;
      else wrong.push({ q: it.q, you: pick.map(function (i) { var o = it.opts.filter(function (x) { return x.i === i; })[0]; return o ? o.tx : ''; }).join(' and ') });
    });
    d.mocks.push({ at: today(), s: score }); if (d.mocks.length > 50) d.mocks = d.mocks.slice(-50); save(d); gt('drive_mock_done', { value: score });
    S = { v: 'mockEnd', score: score, wrong: wrong, timeUp: !!timeUp, used: Math.round((MOCK_MIN * 60000 - Math.max(0, S.end - Date.now())) / 60000) };
    draw(); top();
  }
  function mockEnd(r) {
    var pass = S.score >= PASS, by = {};
    S.wrong.forEach(function (w) { by[w.q.c] = (by[w.q.c] || 0) + 1; });
    var study = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
    r.innerHTML = '<div class="lu-card lu-res">' + (S.timeUp ? '<div style="font-weight:800;color:#B42318;margin-bottom:6px">⏱ Time’s up</div>' : '') + '<b>' + S.score + '/50</b><div style="color:#6B7280;margin-top:4px">' + Math.round(S.score / 50 * 100) + '% · ' + S.used + ' minutes</div>' +
      '<span class="p ' + (pass ? 'ok' : 'no') + '">' + (pass ? '✅ Pass — well done!' : '❌ Not a pass yet — you need ' + PASS) + '</span>' +
      '<div class="lu-note" style="margin:10px 0 0">In the real test you must also pass hazard perception (44 out of 75).</div></div>' +
      (study.length ? '<div class="lu-card"><b style="font-size:16px">📚 Topics to practise</b>' + study.map(function (c) { return '<div class="lu-li"><i>' + TOP[c - 1][2] + '</i><span style="flex:1">' + esc(topName(+c)) + '</span><b>' + by[c] + ' wrong</b></div>'; }).join('') + '</div>' : '') +
      (S.wrong.length ? '<div class="lu-card"><b style="font-size:16px">❌ Your ' + S.wrong.length + ' wrong answer' + (S.wrong.length === 1 ? '' : 's') + '</b>' + S.wrong.map(function (w) {
        return '<div class="lu-wr">' + (w.q.g && SIGN[w.q.g] ? '<div style="width:90px">' + SIGN[w.q.g]().replace(/width="\d+" height="\d+"/, 'width="80" height="80"') + '</div>' : '') + '<b>' + esc(w.q.q) + '</b><div class="y">You: ' + esc(w.you || 'no answer') + '</div><div class="a">✓ ' + esc(rightText(w.q)) + '</div><small>' + esc(w.q.e) + '</small></div>';
      }).join('') + '<div class="lu-note" style="margin:8px 0 0">These are now in 💪 My weak spots.</div></div>' : '') +
      '<div class="lu-row"><button class="lu-btn" id="dtA">🎯 Another mock test</button></div><div class="lu-row"><button class="lu-btn g" id="dtH">Done</button></div>';
    $('#dtA', r).onclick = startMock; $('#dtH', r).onclick = function () { go('home'); };
  }

  // ───── info cards (GOV.UK) ─────
  function L(ico, html, link) { return '<div class="lu-li"><i>' + ico + '</i><span style="flex:1">' + html + (link ? ' <a href="' + link + '" target="_blank" rel="noopener">GOV.UK ↗</a>' : '') + '</span></div>'; }
  function card(r, title, sub, body, btn) {
    r.innerHTML = '<button class="lu-back" id="dtB">← Back</button><div class="lu-top dt-top"><b>' + title + '</b><span>' + sub + '</span></div><div class="lu-card">' + body + '</div>' + (btn || '');
    $('#dtB', r).onclick = function () { go('home'); };
  }
  function before(r) {
    card(r, '📋 Before your test', 'The key facts from GOV.UK. Checked ' + CHECKED + ' — always check GOV.UK before you book.',
      L('🪪', 'You need a <b>provisional driving licence</b> to book.', GOV.prov) +
      L('💷', 'The car theory test costs <b>£23</b>. Book only on GOV.UK.', GOV.book) +
      L('📄', 'Bring your <b>UK photocard driving licence</b>. If you bring the wrong documents, your test is cancelled and you won’t get your money back.', GOV.take) +
      L('📝', '<b>Part 1: 50 multiple-choice questions in 57 minutes.</b> 3 of them are about a short video. You can flag questions and go back. Pass mark: <b>43 out of 50</b>.', GOV.mc) +
      L('☕', 'You can have a break of up to 3 minutes before part 2.', GOV.mc) +
      L('🎬', '<b>Part 2: hazard perception — 14 video clips.</b> Pass mark: <b>44 out of 75</b>.', GOV.hp) +
      L('✅', 'You must pass <b>both parts</b> at the same sitting. Your pass certificate number lasts <b>2 years</b> — pass your practical test in that time.', GOV.pass) +
      L('🔁', 'If you fail, you must take both parts again and wait at least <b>3 working days</b>.', GOV.pass) +
      L('📚', 'Revise from The Highway Code, <i>Know your traffic signs</i> and <i>Driving – the essential skills</i>. GOV.UK also has a free official practice test.', GOV.rev),
      '<a class="lu-btn" style="display:block;text-align:center;text-decoration:none" href="' + GOV.book + '" target="_blank" rel="noopener">Book on GOV.UK ↗</a><div class="lu-row"><a class="lu-btn g" style="display:block;text-align:center;text-decoration:none" href="' + GOV.practice + '" target="_blank" rel="noopener">Free official practice test ↗</a></div>');
    gt('drive_before');
  }
  function hazard(r) {
    card(r, '🎬 Hazard perception', 'Part 2 of the theory test. Here’s how it works and how to score well.',
      L('🎥', '<b>14 video clips</b> of everyday road scenes. Each has at least one <b>developing hazard</b> — one clip has two.', GOV.hp) +
      L('👆', 'Click when you see a hazard <b>starting to develop</b> — something that would make you slow down, stop or change direction.', GOV.hp) +
      L('⭐', 'Up to <b>5 points</b> for each hazard. The <b>sooner</b> you click once it starts, the more points you get.', GOV.hp) +
      L('🚫', 'If you click <b>constantly or in a pattern</b>, you score <b>zero</b> for that clip.', GOV.hp) +
      L('⏯️', 'You only get <b>one go</b> at each clip — you can’t review or change your answers.', GOV.hp) +
      L('🎯', 'Pass mark: <b>44 out of 75</b>.', GOV.pass) +
      L('💡', '<b>Tip:</b> watch for clues early — a car edging out of a side road, a pedestrian near the kerb, brake lights ahead, a ball near the road. Click when it starts to become a problem, and click again a moment later to be safe.', '') +
      '<div class="lu-note" style="margin:8px 0 0">We can’t show the official clips here. Practise them with the free official DVSA practice test and apps.</div>',
      '<a class="lu-btn" style="display:block;text-align:center;text-decoration:none" href="' + GOV.rev + '" target="_blank" rel="noopener">Official practice and apps ↗</a>');
    gt('drive_hazard');
  }
  function licence(r) {
    card(r, '🇳🇬 Driving on a Nigerian licence', 'Nigeria is not a “designated country”, so the licence can’t be swapped for a UK one. From GOV.UK, checked ' + CHECKED + '.',
      L('🗓️', 'You can drive cars on your full, valid Nigerian licence for <b>12 months after you become resident</b> in Great Britain.', GOV.nongb) +
      L('🔄', 'You <b>can’t exchange</b> a Nigerian licence for a UK licence.', GOV.nongb) +
      L('🪪', 'To keep driving after 12 months, <b>apply for a provisional licence</b> and <b>pass the theory and practical tests</b>.', GOV.prov) +
      L('🚦', 'With a provisional licence, you drive as a learner — L plates (D plates in Wales) and a qualified supervisor — until you pass.', HC + SEC.docs[1]) +
      L('💡', '<b>Tip:</b> start early. Book your theory test in your first few months, so you have time to pass both tests before your 12 months run out.', ''),
      '<a class="lu-btn" style="display:block;text-align:center;text-decoration:none" href="' + GOV.prov + '" target="_blank" rel="noopener">Apply for a provisional licence ↗</a>');
    gt('drive_licence');
  }

  function summary() { var d = load(), last = d.mocks[d.mocks.length - 1]; return { mocks: d.mocks.length, last: last ? last.s : null, answered: d.n, weak: Object.keys(d.wrong).length, date: d.date }; }
  function setDate(iso) { var d = load(); d.date = iso || ''; save(d); }
  window.DriveTest = { open: open, summary: summary, setDate: setDate, sign: function (k) { return SIGN[k] ? SIGN[k]() : ''; }, mock: function () { open(); getQ().then(startMock); } };

  // 🔗 auntietobi.co.uk/driving-theory-test (→ /?drive=1), /mock, /signs, /before
  var m = location.search.match(/[?&]drive(?:=([a-z]+))?/i);
  if (m || location.pathname.replace(/\/$/, '') === '/driving-theory-test') {
    var go2 = function () { var k = m && m[1]; if (k === 'mock') window.DriveTest.mock(); else if (k === 'signs') { open(); getQ().then(function () { startPrac('signs'); }); } else open(k === 'before' ? 'before' : 'home'); gt('drive_link', { label: k || 'home' }); };
    if (document.readyState === 'complete') setTimeout(go2, 900); else window.addEventListener('load', function () { setTimeout(go2, 900); });
  }
})();
