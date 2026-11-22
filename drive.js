/*
 * 🚗 Driving Theory Test — practice inside the Auntie Tobi app.
 * Questions: /drive-q.json — written from The Highway Code and Know your traffic signs (the books GOV.UK says the
 * test is based on), grouped by the official theory test topics. Each links to its Highway Code section on GOV.UK.
 * Road signs are drawn here (SVG). Test facts from GOV.UK, checked 21 Nov 2026. Marking happens on the phone — no AI.
 * Progress is kept on this device (localStorage "tobi_drive"). Uses the Life in the UK page styles (lifeuk.js).
 */
(function () {
  'use strict';
  var KEY = 'tobi_drive', LIVE = 'tobi_drive_live', CHECKED = '21 November 2026', MOCK_N = 50, MOCK_MIN = 57, PASS = 43;
  var DISCLAIMER = 'Practise for the UK Driving Theory Test with exam-style questions based on current road safety guidance and The Highway Code. This is an independent preparation tool and is not affiliated with or endorsed by the DVSA.';
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
    nhs: ['NHS: How to do CPR', 'https://www.nhs.uk/conditions/first-aid/cpr/'],
  };
  var GOV = {
    book: 'https://www.gov.uk/book-theory-test', guide: 'https://www.gov.uk/theory-test', take: 'https://www.gov.uk/theory-test/what-to-take',
    mc: 'https://www.gov.uk/theory-test/multiple-choice-questions', hp: 'https://www.gov.uk/theory-test/hazard-perception-test',
    pass: 'https://www.gov.uk/theory-test/pass-mark-and-result', rev: 'https://www.gov.uk/theory-test/revision-and-practice',
    practice: 'https://www.gov.uk/take-practice-theory-test', prov: 'https://www.gov.uk/apply-first-provisional-driving-licence',
    nongb: 'https://www.gov.uk/exchange-foreign-driving-licence', hc: 'https://www.gov.uk/guidance/the-highway-code',
  };
  var Q = null, ALL = null, loading = null, S = { v: 'home' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'drive' }, p || {})); } catch (x) {} }
  function load() { var z = { mocks: [], prac: [], seen: {}, wrong: {}, n: 0, ok: 0, date: '', last: [] }; try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.keys(z).forEach(function (k) { if (d[k] != null) z[k] = d[k]; }); } catch (e) {} return z; }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} touch(); }
  var SYNC = 'drive';
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function niceDate(iso) { if (!iso) return ''; return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
  function daysTo(iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); }
  function topName(c) { return (TOP[c - 1] || [])[1] || ''; }
  function getQ() {
    if (Q) return Promise.resolve(Q);
    if (!loading) {
      // the checked bank + any fixes made in HQ (🇬🇧🚗 Question review). Only ✅ verified questions are used.
      var fix = fetch('/.netlify/functions/app-content?drq=1').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
      loading = Promise.all([fetch('/drive-q.json?v=20261122c').then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }), fix]).then(function (x) {
        var over = (x[1] && x[1].fix) || {};
        ALL = x[0].map(function (q) { var o = over[q.id]; return o ? Object.assign({}, q, o) : q; });
        Q = ALL.filter(function (q) { return !q.st || q.st === 'v'; });
        return Q;
      });
      loading.catch(function () { loading = null; });
    }
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
    window._currentPage = 'drive'; window.__homeRender = false; try { if (window.tobiDesk && window.tobiDesk.inApp) window.tobiDesk.inApp('drive'); } catch (e) {}
    msgs.innerHTML = '<div class="msg bot" style="align-items:flex-start"><div style="flex:1;min-width:0" id="dtRoot" class="lu"></div></div>';
    try { if (typeof scrollToTop === 'function') scrollToTop(); else msgs.scrollTop = 0; } catch (e) {}
    document.body.classList.add('lu-nochat');
    if (!obs && window.MutationObserver) { obs = new MutationObserver(function () { if (!document.getElementById('dtRoot')) { obs.disconnect(); obs = null; stopTimer(); if (!document.getElementById('luRoot')) document.body.classList.remove('lu-nochat', 'lu-examon'); } }); obs.observe(msgs, { childList: true }); }
    gt('drive_open'); S = { v: view || 'home' };
    root().innerHTML = '<div class="lu-card" style="text-align:center;color:#6B7280">Loading questions…</div>';
    getQ().then(syncIn).then(function () { if (S.v === 'resume') resumeAny(); else draw(); }).catch(function () { root().innerHTML = '<div class="lu-card">Couldn’t load the questions — check your connection and try again.<div class="lu-row"><button class="lu-btn" id="dtRe">Try again</button></div></div>'; $('#dtRe').onclick = function () { open(view); }; });
  }
  function addCss() {
    if (document.getElementById('dtCss')) return; var st = document.createElement('style'); st.id = 'dtCss';
    st.textContent = '.dt-top{background:linear-gradient(135deg,#0F1E36,#057A44)!important}.dt-flag{border:1.5px solid #E3E0D7;background:#fff;border-radius:10px;padding:6px 10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#0F1E36}.dt-flag.on{background:#FFF1CF;border-color:#F2C14E;color:#7A5300}' +
      '.dt-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:10px 0}.dt-grid button{border:1.5px solid #E3E0D7;background:#fff;border-radius:9px;padding:8px 0;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;color:#0F1E36;position:relative}.dt-grid button.a{background:#E7EFFD;border-color:#9DB6E6}.dt-grid button.f::after{content:"🚩";position:absolute;top:-8px;right:-5px;font-size:11px}' +
      '.dt-hc{display:inline-block;margin-top:6px;font-size:13px;color:#057A44;font-weight:700;text-decoration:none}.dt-sign{display:flex;justify-content:center;margin:0 0 14px}.dt-sign svg{width:150px;height:auto;max-width:60%}';
    document.head.appendChild(st);
  }
  function root() { return document.getElementById('dtRoot'); }
  function leave() { stopTimer(); document.body.classList.remove('lu-nochat', 'lu-examon'); if (typeof resetToWelcome === 'function') resetToWelcome(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function top() { var r = document.getElementById('messages'); try { if (r) r.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }
  function draw() { stopTimer(); var r = root(); if (!r) return; document.body.classList.toggle('lu-examon', /^(intro|mock|review|result|pq)$/.test(S.v)); ({ hist: hist, home: home, setup: setup, pq: pracQ, intro: intro, mock: mockQ, review: mockReview, result: result, before: before, hazard: hazard, licence: licence })[S.v](r); }
  function go(v, extra) { S = Object.assign({ v: v }, extra || {}); draw(); top(); }


  // ───── 💾 saved progress: kept on this phone, and in your My Plan account when you're signed in (any phone) ─────
  var PRAC = KEY + '_prac', UP = KEY + '_up';
  function raw(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function rawSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function docNow() { return { up: +(raw(UP) || 0), d: load(), live: raw(LIVE), prac: raw(PRAC) }; }
  function touch() { rawSet(UP, Date.now()); if (window.TestSync) window.TestSync.push(SYNC, docNow); }
  function mergeDoc(a, b) {   // newer wins; results and "seen" are added together
    if (!a) return b; if (!b) return a;
    var nw = (b.up || 0) >= (a.up || 0) ? b : a, ol = nw === a ? b : a, out = JSON.parse(JSON.stringify(nw)); out.d = out.d || {};
    var od = ol.d || {}, key = function (m) { return String(m.id || (m.at + '|' + m.s)); }, ms = {};
    [].concat(od.mocks || [], out.d.mocks || []).forEach(function (m) { if (m) ms[key(m)] = Object.assign(ms[key(m)] || {}, m); });
    out.d.mocks = Object.keys(ms).map(function (k) { return ms[k]; }).sort(function (x, y) { return (x.id || 0) - (y.id || 0); }).slice(-60);
    out.d.seen = Object.assign({}, od.seen || {}, out.d.seen || {});
    return out;
  }
  function syncIn() {
    var TS = window.TestSync; if (!TS || !TS.signedIn()) return Promise.resolve();
    return Promise.race([TS.pull(SYNC), new Promise(function (r) { setTimeout(function () { r(undefined); }, 2500); })]).then(function (srv) {
      if (srv === undefined) return;
      var loc = docNow(), m = mergeDoc(srv, loc);
      if (!m) return;
      try { localStorage.setItem(KEY, JSON.stringify(m.d || {})); } catch (e) {}
      rawSet(LIVE, m.live || null); rawSet(PRAC, m.prac || null); rawSet(UP, m.up || 0);
      if (!srv || (loc.up || 0) > (srv.up || 0) || (m.d.mocks || []).length > ((srv.d || {}).mocks || []).length) TS.push(SYNC, docNow);
    }).catch(function () {});
  }
  // unfinished practice set
  function savePrac() { rawSet(PRAC, { mode: S.mode, n: S.n, fb: S.fb, ids: S.qs.map(function (it) { return it.q.id; }), ord: S.qs.map(function (it) { return it.opts.map(function (o) { return o.i; }); }), ans: S.ans, done: S.done, at: S.at, t0: S.t0 }); touch(); }
  function clearPrac() { if (raw(PRAC)) { rawSet(PRAC, null); touch(); } }
  function rebuild(id, ord) { var q = byId(id); if (!q) return null; var base = optsOf(q), o = (ord || []).map(function (i) { return base.filter(function (x) { return x.i === i; })[0]; }).filter(Boolean); return { q: q, opts: o.length === base.length ? o : base }; }
  function resumePrac() {
    var p = raw(PRAC); if (!p) return draw();
    var qs = p.ids.map(function (id, n) { return rebuild(id, p.ord[n]); }).filter(Boolean);
    if (!qs.length) { clearPrac(); return go('home'); }
    go('pq', { kind: 'prac', mode: p.mode, n: p.n, fb: p.fb, qs: qs, ans: p.ans || {}, done: p.done || {}, at: Math.min(p.at || 0, qs.length - 1), t0: p.t0 || Date.now() });
  }
  function resumeAny() { if (liveMock()) resumeMock(); else if (raw(PRAC)) resumePrac(); else go('home'); }
  // 📈 my results: every mock, and the full review of the recent ones
  function hist(r) {
    var d = load(), ms = d.mocks.slice().reverse();
    r.innerHTML = '<button class="lu-back" id="hB">← Back</button><div class="lu-h" style="margin-top:0">📈 My results · ' + ms.length + ' mock ' + (ms.length === 1 ? 'test' : 'tests') + '</div>' +
      (ms.length ? '<div class="lu-card">' + ms.map(function (m, n) {
        var ok = m.s >= PASS;
        return '<button class="lu-ch" data-h="' + n + '" style="margin:0 0 8px"' + (m.rv ? '' : ' disabled') + '><i>' + (ok ? '✅' : '❌') + '</i><span style="flex:1"><b>' + m.s + '/' + MOCK_N + ' · ' + Math.round(m.s / MOCK_N * 100) + '% · ' + (ok ? 'PASS' : 'FAIL') + '</b><small>' + esc(niceDate(m.at)) + (m.rv ? ' · tap to review' : '') + '</small></span></button>';
      }).join('') + '</div>' : '<div class="lu-card" style="text-align:center;color:#6B7280">No mock tests yet.</div>') +
      '<div class="lu-note">' + (window.TestSync && window.TestSync.signedIn() ? '💚 Saved to your My Plan account — you’ll see these on any phone you sign in on.' : '💾 Saved on this phone. Sign in to My Plan to keep them on any phone.') + '</div>';
    $('#hB', r).onclick = function () { go('home'); };
    $$('[data-h]', r).forEach(function (b) { b.onclick = function () {
      var m = ms[+b.dataset.h]; if (!m || !m.rv) return;
      var items = m.rv.map(function (x) { var it = rebuild(x[0], x[1]); return it ? { q: it.q, opts: it.opts, pick: x[2] || [] } : null; }).filter(Boolean);
      go('result', { kind: 'mock', items: items, score: items.filter(function (x) { return isRight(x.q, x.pick, x.opts); }).length, tab: 'all', hist: true });
    }; });
  }
  function syncCard(top) {
    var TS = window.TestSync, d = load(), pr = raw(PRAC), out = '';
    if (top) return pr ?  '<button class="lu-big y" id="tsPrac"><i>▶️</i><span><b>Continue your practice</b><small>Question ' + ((pr.at || 0) + 1) + ' of ' + pr.ids.length + ' · ' + Object.keys(pr.ans || {}).length + ' answered</small></span></button>' : '';
    if (d.mocks.length) out += '<button class="lu-big w" id="tsHist"><i>📈</i><span><b>My results</b><small>' + d.mocks.length + ' mock ' + (d.mocks.length === 1 ? 'test' : 'tests') + ' · tap one to see every answer</small></span></button>';
    if (TS) out += TS.signedIn() ? '<div class="lu-note" style="margin-top:0">💚 Your progress is saved to your My Plan account. <a href="#" id="tsPlan" style="color:#057A44;font-weight:700">Open My Plan</a></div>'
      : '<div class="lu-card" style="border-color:#BFE3CF;background:#F1FAF5"><b style="font-size:15px">💾 Keep your progress on any phone</b><div style="font-size:13.5px;color:#4B5563;margin-top:3px">Your progress is saved on this phone. Sign in to My Plan (free, no password) to keep it everywhere and pick up where you left off.</div><div class="lu-row"><button class="lu-btn" id="tsIn">💚 Sign in to My Plan</button></div></div>';
    return out;
  }
  function bindSync(r) {
    if ($('#tsPrac', r)) $('#tsPrac', r).onclick = function () { if (liveMock() && !confirm('You also have an unfinished mock test. Continue the practice instead?')) return; resumePrac(); };
    if ($('#tsHist', r)) $('#tsHist', r).onclick = function () { go('hist'); };
    if ($('#tsPlan', r)) $('#tsPlan', r).onclick = function (e) { e.preventDefault(); window.TestSync.openPlan(); };
    if ($('#tsIn', r)) $('#tsIn', r).onclick = function () { window.TestSync.signIn(); };
  }

  // ───── 🏠 home ─────
  function home(r) {
    var d = load(), best = d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), weak = Q.filter(function (q) { return d.wrong[q.id]; }).length, last = d.mocks[d.mocks.length - 1];
    var dl = d.date ? daysTo(d.date) : null, nSigns = Q.filter(function (q) { return q.g; }).length, live = liveMock(), acc = d.n ? Math.round(d.ok / d.n * 100) : 0;
    r.innerHTML = '<button class="lu-back" id="dtBack">← Home</button>' +
      '<div class="lu-top dt-top"><b>🚗 Driving Theory Test</b><span>' + Q.length + ' exam-style practice questions based on The Highway Code, with road sign pictures. Marked straight away — free.</span></div>' +
      '<div class="lu-disc">ℹ️ ' + esc(DISCLAIMER) + '</div>' +
      (d.date && dl >= 0 ? '<div class="lu-card" style="border-color:#F2D58A;background:#FFFBEF"><b style="font-size:16px">📅 Your theory test: ' + esc(niceDate(d.date)) + '</b><div style="font-size:14px;color:#7A5300;margin-top:3px">' + (dl === 0 ? 'It’s today — good luck! Bring your photocard licence.' : dl === 1 ? 'Tomorrow! Have your photocard licence ready.' : dl + ' days to go') + '</div></div>' : '') +
      (live ? '<button class="lu-big y" id="dtResume"><i>⏱</i><span><b>Resume your mock test</b><small>' + mmss(Math.max(0, Math.round((live.end - Date.now()) / 1000))) + ' left · ' + Object.keys(live.ans).length + ' of ' + MOCK_N + ' answered</small></span></button>' : '') +
      syncCard(true) +
      '<button class="lu-big" id="dtMock"><i>🎯</i><span><b>Driving Theory — Mock Exam</b><small>Multiple-choice practice simulation · 50 questions · 57 minutes · pass mark 43</small></span></button>' +
      '<button class="lu-big w" id="dtPrac"><i>📚</i><span><b>Practice</b><small>5, 10, 20 or 50 questions · 14 topics, mixed, road signs, wrong or unanswered</small></span></button>' + '<div id="vqBox"></div>' +
      '<button class="lu-big w" id="dtSigns"><i>🛑</i><span><b>Road signs</b><small>' + nSigns + ' signs with pictures</small></span></button>' +
      (weak ? '<button class="lu-big y" id="dtWeak"><i>💪</i><span><b>Retry incorrect questions · ' + weak + '</b><small>Get them right to clear them</small></span></button>' : '') +
      syncCard(false) + progressCard(d, best, acc) +
      '<button class="lu-big w" id="dtHaz"><i>🎬</i><span><b>Hazard Perception Test</b><small>How part 2 works and is scored · practice clips not available yet</small></span></button>' +
      '<button class="lu-big w" id="dtBefore"><i>📋</i><span><b>Before your test</b><small>Cost, what to bring, pass marks — checked on GOV.UK</small></span></button>' +
      '<button class="lu-big w" id="dtLic"><i>🇳🇬</i><span><b>Driving here on a Nigerian licence</b><small>How long you can use it and what to do next</small></span></button>' +
      (window.MyPlan && window.MyPlan.driveTest ? '<button class="lu-big w" id="dtPlan"><i>💚</i><span><b>' + (d.date ? 'Change your test date' : 'Add your theory test to My Plan') + '</b><small>Countdown, reminders and a checklist</small></span></button>' : '') +
      '<button class="lu-big w" id="dtShare"><i>📤</i><span><b>Share with a friend</b><small>auntietobi.co.uk/driving-theory-test</small></span></button>' +
      '<div class="lu-note">Practice questions written independently by Auntie Tobi from <a href="' + GOV.hc + '" target="_blank" rel="noopener">The Highway Code</a>, <i>Know your traffic signs</i> and NHS first-aid guidance. They are not official DVSA questions. Road sign images: Crown copyright, Department for Transport, used under the Open Government Licence. Always check the latest rules on GOV.UK.</div>';
    $('#dtBack', r).onclick = leave;
    $('#dtMock', r).onclick = function () { if (live && !confirm('Start a new mock test? Your unfinished one will be lost.')) return; go('intro'); };
    if ($('#dtResume', r)) $('#dtResume', r).onclick = resumeMock;
    bindSync(r);
    $('#dtSigns', r).onclick = function () { go('setup', { mode: 'signs', n: 10, fb: 'now' }); };
    $('#dtPrac', r).onclick = function () { go('setup', { mode: 0, n: 10, fb: 'now' }); };
    vqCard(r, 'drive', 'Driving Theory Test');
    if ($('#dtWeak', r)) $('#dtWeak', r).onclick = function () { go('setup', { mode: 'weak', n: weak <= 5 ? 5 : 10, fb: 'now' }); };
    $('#dtHaz', r).onclick = function () { go('hazard'); }; $('#dtBefore', r).onclick = function () { go('before'); }; $('#dtLic', r).onclick = function () { go('licence'); };
    if ($('#dtPlan', r)) $('#dtPlan', r).onclick = function () { window.MyPlan.driveTest(); };
    $('#dtShare', r).onclick = function () {
      var url = 'https://auntietobi.co.uk/driving-theory-test', text = 'Practise for the UK driving theory test free on Auntie Tobi 🚗 — exam-style questions based on The Highway Code, road signs and 57-minute mock tests:';
      gt('drive_share'); if (navigator.share) { navigator.share({ title: 'Driving theory test practice', text: text, url: url }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
    };
  }
  function progressCard(d, best, acc) {
    if (!d.mocks.length && !d.n) return '';
    var ms = d.mocks.slice(-12), last = d.mocks[d.mocks.length - 1];
    return '<div class="lu-card"><b style="font-size:16px">📈 Your progress</b>' +
      '<div class="lu-stats" style="margin:10px 0 0"><div class="lu-stat"><b>' + d.mocks.length + '</b><small>Mock tests</small></div><div class="lu-stat"><b>' + (d.mocks.length ? best + '/50' : '–') + '</b><small>Best score</small></div><div class="lu-stat"><b>' + (d.n ? acc + '%' : '–') + '</b><small>Right in practice</small></div></div>' +
      (ms.length ? '<div class="lu-prog" aria-label="Mock test scores">' + ms.map(function (m) { return '<span class="' + (m.s >= PASS ? 'ok' : '') + '" style="height:' + Math.max(6, Math.round(m.s / MOCK_N * 100)) + '%"></span>'; }).join('') + '<em style="bottom:' + (PASS / MOCK_N * 100) + '%"><b>Pass 43</b></em></div>' +
        '<div style="font-size:13px;color:#6B7280">Latest multiple-choice mock: <b>' + last.s + '/50</b> (' + Math.round(last.s / MOCK_N * 100) + '%) — ' + (last.s >= PASS ? 'PASS' : 'not a pass yet') + '</div>' : '<div style="font-size:13px;color:#6B7280;margin-top:8px">' + d.n + ' practice answers so far. Try a mock test to see your score.</div>') + '</div>';
  }

  // ───── 📚 practice set-up ─────
  function setup(r) {
    var d = load(), wrongN = Q.filter(function (q) { return d.wrong[q.id]; }).length, newN = Q.filter(function (q) { return !d.seen[q.id]; }).length, signN = Q.filter(function (q) { return q.g; }).length;
    var opt = function (mode, ico, title, sub) { return '<button class="lu-pick" data-m="' + mode + '" aria-pressed="' + (String(S.mode) === String(mode)) + '"><i>' + ico + '</i><span style="flex:1"><b>' + title + '</b><small>' + sub + '</small></span></button>'; };
    r.innerHTML = '<button class="lu-back" id="dtB">← Back</button><div class="lu-h" style="margin-top:0">1 · What to practise</div>' +
      opt(0, '🔀', 'All topics, mixed', Q.length + ' questions') +
      opt('new', '🆕', 'Questions I haven’t answered', newN + ' left') +
      (wrongN ? opt('weak', '💪', 'My incorrect questions', wrongN + ' to retry') : '') +
      opt('signs', '🛑', 'Road signs', signN + ' signs') +
      TOP.map(function (t) { var qs = Q.filter(function (q) { return q.c === t[0]; }), seen = qs.filter(function (q) { return d.seen[q.id]; }).length; return opt(t[0], t[2], esc(t[1]), qs.length + ' questions · ' + seen + ' done'); }).join('') +
      '<div class="lu-h">2 · How many questions</div><div class="lu-seg">' + [5, 10, 20, 50].map(function (n) { return '<button data-n="' + n + '" aria-pressed="' + (S.n === n) + '">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="lu-h">3 · When to see the answers</div><div class="lu-seg"><button data-f="now" aria-pressed="' + (S.fb === 'now') + '">After each question</button><button data-f="end" aria-pressed="' + (S.fb === 'end') + '">At the end</button></div>' +
      '<div class="lu-row" style="margin-top:14px"><button class="lu-btn" id="dtGo">Start practice →</button></div>' +
      '<div class="lu-note">These are the 14 topics the real theory test covers. Each answer shows the Highway Code rule behind it.</div>';
    $('#dtB', r).onclick = function () { go('home'); };
    $$('[data-m]', r).forEach(function (b) { b.onclick = function () { var m = b.dataset.m; S.mode = /^\d+$/.test(m) ? +m : m; draw(); }; });
    $$('[data-n]', r).forEach(function (b) { b.onclick = function () { S.n = +b.dataset.n; draw(); }; });
    $$('[data-f]', r).forEach(function (b) { b.onclick = function () { S.fb = b.dataset.f; draw(); }; });
    $('#dtGo', r).onclick = function () { startPrac(S.mode, S.n, S.fb); };
  }
  function pracPool(mode) {
    var d = load();
    if (mode === 'weak') return Q.filter(function (q) { return d.wrong[q.id]; });
    if (mode === 'new') return Q.filter(function (q) { return !d.seen[q.id]; });
    if (mode === 'signs') return Q.filter(function (q) { return q.g; });
    if (Array.isArray(mode)) return Q.filter(function (q) { return mode.indexOf(q.id) >= 0; });
    return Q.filter(function (q) { return !mode || q.c === mode; });
  }
  // one question per fact: same correct answer in the same topic is treated as the same fact
  function noTwins(list) { var seen = {}; return list.filter(function (q) { var k = q.c + '|' + rightText(q).toLowerCase() + '|' + (q.g || ''); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function startPrac(mode, n, fb) {
    var d = load(), p = pracPool(mode);
    if (!p.length) return alert(mode === 'new' ? 'You’ve answered every question — try a mock test!' : 'No questions here yet.');
    var fresh = shuffle(p.filter(function (q) { return !d.seen[q.id]; })), old = shuffle(p.filter(function (q) { return d.seen[q.id]; }));
    var qs = noTwins(fresh.concat(old)).slice(0, n || 10);
    gt('drive_practise', { label: String(mode), value: qs.length });
    go('pq', { mode: mode, n: n, fb: fb, qs: qs.map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, done: {}, at: 0, t0: Date.now() });
  }
  function modeName(m) { return Array.isArray(m) ? 'Incorrect questions' : m === 'weak' ? 'My incorrect questions' : m === 'new' ? 'Not yet answered' : m === 'signs' ? 'Road signs' : m ? topName(m) : 'All topics'; }
  function pracQ(r) {
    var it = S.qs[S.at], q = it.q, pick = S.ans[S.at] || [], shown = S.fb === 'now' && S.done[S.at], last = S.at === S.qs.length - 1;
    var okN = Object.keys(S.done).filter(function (k) { return isRight(S.qs[k].q, S.ans[k], S.qs[k].opts); }).length;
    r.innerHTML = '<div class="lx"><div class="lx-bar"><b>Practice · ' + esc(modeName(S.mode)) + '</b>' + (S.fb === 'now' ? '<span class="lx-time">' + okN + ' / ' + Object.keys(S.done).length + ' right</span>' : '') + '</div>' +
      '<div class="lx-panel"><div class="lx-num"><span>Question ' + (S.at + 1) + ' of ' + S.qs.length + '</span></div>' + optsHtml(it, pick, shown) + (shown ? fbHtml(it, pick) : '') + '</div>' +
      '<div class="lx-nav"><button class="lx-b" id="lxP"' + (S.at && S.fb === 'end' ? '' : ' disabled') + '>← Previous</button><span></span>' +
      (S.fb === 'now' && !shown ? '<button class="lx-b p" id="lxC"' + (pick.length === need(q) ? '' : ' disabled') + '>Check answer</button>' : '<button class="lx-b p" id="lxN"' + (S.fb === 'end' && pick.length !== need(q) ? ' disabled' : '') + '>' + (last ? 'Finish' : 'Next question →') + '</button>') + '</div>' +
      '<div class="lx-links"><button class="q" id="lxX">Stop practice</button><span></span></div></div>';
    bindPick(r, it, !shown);
    if ($('#lxC', r)) $('#lxC', r).onclick = function () { S.done[S.at] = 1; record(it, S.ans[S.at]); savePrac(); draw(); };
    if ($('#lxN', r)) $('#lxN', r).onclick = function () { if (last) finishPrac(); else { S.at++; savePrac(); draw(); top(); } };
    if (!$('#lxP', r).disabled) $('#lxP', r).onclick = function () { S.at--; draw(); top(); };
    $('#lxX', r).onclick = function () { if (Object.keys(S.ans).length) { savePrac(); X_toast('💾 Saved — tap “Continue your practice” to carry on'); } else clearPrac(); go('home'); };
  }
  // 📺 video quizzes published from HQ — played in the app, answers count like practice
  function vqCard(r, bank, name) {
    var box = $('#vqBox', r); if (!box || !window.QuizPlay) return;
    window.QuizPlay.count(bank).then(function (n) {
      if (!n || !document.body.contains(box)) return;
      box.innerHTML = '<button class="lu-big w" id="vqGo"><i>📺</i><span><b>Video quizzes · ' + n + '</b><small>Watch, listen to Auntie Tobi and tap your answer</small></span></button>';
      $('#vqGo', box).onclick = function () { window.QuizPlay.browse(bank, { bank: bank, name: name, answer: vqAnswer, done: vqDone, practice: function () { go('setup', { mode: 0, n: 10, fb: 'now' }); } }); };
    });
  }
  function vqAnswer(id, ok) { if (!byId(id)) return; var d = load(); mark(d, { id: id }, ok); save(d); }
  function vqDone(n, ok) { var d = load(); d.prac.push({ at: today(), n: n, ok: ok, m: 'video' }); if (d.prac.length > 100) d.prac = d.prac.slice(-100); save(d); var r = root(); if (r && S.v === 'home') draw(); }
  function record(it, pick) { var d = load(), ok = isRight(it.q, pick, it.opts); mark(d, it.q, ok); save(d); return ok; }
  function finishPrac() {
    clearPrac();
    var idx = S.qs.map(function (x, i) { return i; }).filter(function (i) { return S.fb === 'end' ? true : S.done[i]; });
    if (S.fb === 'end') idx.forEach(function (i) { record(S.qs[i], S.ans[i]); });
    var items = idx.map(function (i) { return { q: S.qs[i].q, opts: S.qs[i].opts, pick: S.ans[i] || [] }; });
    var score = items.filter(function (x) { return isRight(x.q, x.pick, x.opts); }).length;
    var d = load(); d.prac.push({ at: today(), n: items.length, ok: score, m: String(S.mode) }); if (d.prac.length > 100) d.prac = d.prac.slice(-100); save(d);
    go('result', { kind: 'prac', mode: S.mode, n: S.n, fb: S.fb, items: items, score: score, tab: 'all', used: Math.round((Date.now() - S.t0) / 60000) });
  }

  // ───── one question (mock and practice) ─────
  // 🛑 official road sign pictures (Department for Transport, Crown copyright, Open Government Licence) — /signs/
  var OFFSIGN = {"ahead":"606-ahead.jpg","clearway":"642.jpg","giveway":"602.jpg","i_hospital":"827.2.jpg","i_oneway":"652.jpg","i_parking":"801.jpg","keepleft":"610.jpg","minirbt":"611.1.jpg","noentry":"616.jpg","noright":"612.jpg","nouturn":"614.jpg","nsl":"671.jpg","sl20":"670V20.jpg","sl30":"670V30.jpg","sl50":"670V50.jpg","stop":"601.1.jpg","turnleft":"609.jpg","w_bendr":"512.jpg","w_cattle":"548.jpg","w_cross":"504.1.jpg","w_cycle":"950.jpg","w_danger":"562.jpg","w_dblbend":"513.jpg","w_deer":"551.jpg","w_horse":"550.1.jpg","w_hump":"528.jpg","w_kids":"545.jpg","w_lcbar":"770.jpg","w_lcnobar":"771.jpg","w_lights":"543.jpg","w_narrow":"516.jpg","w_ped":"544.1.jpg","w_rbt":"510.jpg","w_slip":"557.jpg","w_steep":"523.1.jpg","w_tjunc":"505.1.jpg","w_twoway":"521.jpg","w_works":"7001.jpg","x2901":"2901.jpg","x509.1":"509.1.jpg","x517":"517.jpg","x520":"520.jpg","x529":"529.jpg","x529.1":"529.1.jpg","x544":"544.jpg","x544.2":"544.2.jpg","x554":"554.jpg","x554.2":"554.2.jpg","x555":"555.jpg","x556":"556.jpg","x557.1":"557.1.jpg","x558":"558.jpg","x559":"559.jpg","x581":"581.jpg","x584":"584.jpg","x615":"615.jpg","x617":"617.jpg","x619":"619.jpg","x622.1A":"622.1A.jpg","x629":"629.jpg","x629.2A":"629.2A.jpg","x632":"632.jpg","x672":"672.jpg","x674":"674.jpg","x7009":"7009.jpg","x811":"811.jpg","x821":"821.jpg","x951":"951.jpg","x953":"953.jpg","x955":"955.jpg"};
  function signMarkup(k, px) {
    if (OFFSIGN[k]) return '<img src="/signs/' + OFFSIGN[k] + '?v=2" alt="Road sign" loading="lazy" style="width:' + (px || 150) + 'px;height:' + (px || 150) + 'px;object-fit:contain">';
    return SIGN[k] ? SIGN[k]().replace(/width="\d+" height="\d+"/, px ? 'width="' + px + '" height="' + px + '"' : '$&') : '';
  }
  function signHtml(q) { var m = q.g ? signMarkup(q.g) : ''; return m ? '<div class="dt-sign">' + m + '</div>' : ''; }
  function optsHtml(it, pick, shown) {
    var q = it.q, cb = q.t === '2';
    return '<div class="lx-ins">' + (cb ? 'Mark TWO answers.' : 'Mark ONE answer.') + '</div><div class="lx-q">' + esc(q.q.replace(/ Select TWO answers\.$/, '')) + '</div>' + signHtml(q) +
      it.opts.map(function (o) {
        var on = pick.indexOf(o.i) >= 0, cls = 'lx-o' + (cb ? ' cb' : '') + (on ? ' sel' : ''), mk = '';
        if (shown) { if (o.ok) mk = ' <b style="color:#126B40">✓ Correct answer</b>'; else if (on) mk = ' <b style="color:#B42318">✗ Your answer</b>'; }
        return '<button class="' + cls + '" data-o="' + o.i + '" role="' + (cb ? 'checkbox' : 'radio') + '" aria-checked="' + on + '"' + (shown ? ' disabled' : '') + '><span class="r"></span><span>' + esc(o.tx) + mk + '</span></button>';
      }).join('');
  }
  function hcLink(q) { var s = SEC[q.s]; if (!s) return ''; var url = /^https?:/.test(s[1]) ? s[1] : HC + s[1]; return '<a class="dt-hc" href="' + url + '" target="_blank" rel="noopener">📘 ' + (/^https?:/.test(s[1]) ? '' : 'Highway Code: ') + esc(s[0]) + ' ↗</a>'; }
  function fbHtml(it, pick) {
    var q = it.q, ok = isRight(q, pick, it.opts);
    return '<div class="lu-fb ' + (ok ? 'ok' : 'no') + '" style="margin-top:10px"><b>' + (ok ? '✅ Correct' : '❌ Incorrect. The answer is: ' + esc(rightText(q))) + '</b><div style="margin-top:4px">' + esc(q.e) + '</div>' +
      (q.x ? '<span class="lu-x">📍 ' + esc(q.x) + '</span>' : '') + hcLink(q) + '</div>';
  }
  function bindPick(r, it, live) {
    if (!live) return;
    $$('[data-o]', r).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.o, pick = (S.ans[S.at] || []).slice();
        if (it.q.t === '2') { var k = pick.indexOf(i); if (k >= 0) pick.splice(k, 1); else if (pick.length < 2) pick.push(i); else { pick.shift(); pick.push(i); } } else pick = [i];
        if (pick.length) S.ans[S.at] = pick; else delete S.ans[S.at];
        if (S.v === 'mock') saveLive(); else if (S.v === 'pq') savePrac();
        draw();
      };
    });
  }
  function isRight(q, pick, opts) { var want = opts.filter(function (o) { return o.ok; }).map(function (o) { return o.i; }).sort().join(','); return (pick || []).slice().sort().join(',') === want; }
  function need(q) { return q.t === '2' ? 2 : 1; }
  function mark(d, q, ok) { d.n++; if (ok) d.ok++; d.seen[q.id] = 1; if (ok) { if (d.wrong[q.id]) { d.wrong[q.id]--; if (d.wrong[q.id] <= 0) delete d.wrong[q.id]; } } else d.wrong[q.id] = (d.wrong[q.id] || 0) + 1; }
  function X_toast(t) { try { if (typeof showToast === 'function') return showToast(t); } catch (e) {} var el = document.createElement('div'); el.textContent = t; el.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#0F1E36;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;z-index:99999;max-width:90%;text-align:center'; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600); }
  function mmss(s) { return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function pickedText(it, pick) { return (pick || []).map(function (i) { var o = it.opts.filter(function (x) { return x.i === i; })[0]; return o ? o.tx : ''; }).join(' and '); }

  // ───── 🎯 mock test: tutorial first, then 50 questions in 57 minutes ─────
  function intro(r) {
    var sample = { q: { id: 0, c: 4, t: 'm', q: 'You are driving in heavy rain. What should you do?', o: ['Increase the distance between you and the vehicle in front', 'Drive closer to the vehicle in front', 'Brake sharply whenever you approach a bend', 'Switch on your hazard warning lights'], e: 'Wet roads increase stopping distances, so leave a much greater gap.' } };
    if (!S.sOpts) S.sOpts = optsOf(sample.q); sample.opts = S.sOpts;
    var pick = S.sPick || [];
    r.innerHTML = '<div class="lx"><div class="lx-bar"><b>Driving Theory — Mock Exam</b><span class="lx-time">57:00</span></div>' +
      '<div class="lx-panel"><b style="font-size:18px">Before you start</b><ul style="margin:8px 0 0;padding-left:20px;line-height:1.7;font-size:15px">' +
      '<li><b>50 questions</b> in <b>57 minutes</b>. The pass mark is <b>43</b>.</li>' +
      '<li>One question at a time. Use <b>Previous</b> and <b>Next</b>, and <b>⚑ Flag</b> any you want to come back to.</li>' +
      '<li>Some questions ask you to <b>mark TWO answers</b>.</li>' +
      '<li>You can change your answers until you submit. A review screen shows any unanswered or flagged questions.</li>' +
      '<li>When the time runs out, your answers are submitted automatically. No answers or hints are shown until the end.</li></ul>' +
      '<div style="font-size:12.5px;color:#52606D;margin-top:8px">Road sign images: Crown copyright, Department for Transport.</div>' +
      '<div class="lu-x" style="margin-top:12px">ℹ️ This is a <b>multiple-choice practice simulation</b>. The real test includes 3 questions about a short video, and a separate hazard perception part. Neither is included here, so your result is not an overall theory test result.</div></div>' +
      '<div class="lx-panel"><div class="lx-num"><span>Sample question (not marked)</span></div>' + optsHtml(sample, pick, false).replace(/data-o=/g, 'data-so=') +
      (pick.length ? '<div class="lu-fb ' + (isRight(sample.q, pick, sample.opts) ? 'ok' : 'no') + '"><b>' + (isRight(sample.q, pick, sample.opts) ? '✅ That’s right.' : '❌ The answer is: ' + esc(sample.q.o[0])) + '</b> ' + esc(sample.q.e) + ' In the mock test, you won’t see this until the end.</div>' : '') + '</div>' +
      '<div class="lx-nav" style="grid-template-columns:1fr 1fr"><button class="lx-b" id="dtBk">← Back</button><button class="lx-b p" id="dtStart">Start the test</button></div></div>';
    $$('[data-so]', r).forEach(function (b) { b.onclick = function () { S.sPick = [+b.dataset.so]; draw(); }; });
    $('#dtBk', r).onclick = function () { go('home'); };
    $('#dtStart', r).onclick = startMock;
  }
  // 50 questions spread across the 14 topics in proportion to the bank, no repeats, no two on the same fact, none from your last mock where possible
  function pickMock() {
    var d = load(), lastIds = d.last || [], tot = Q.length, quota = {}, rem = [];
    TOP.forEach(function (t) { var n = Q.filter(function (q) { return q.c === t[0]; }).length, x = n / tot * MOCK_N; quota[t[0]] = Math.max(n ? 1 : 0, Math.floor(x)); rem.push([t[0], x - Math.floor(x)]); });
    var sum = function () { return Object.keys(quota).reduce(function (a, k) { return a + quota[k]; }, 0); };
    rem.sort(function (a, b) { return b[1] - a[1]; }); var ri = 0;
    while (sum() < MOCK_N) { quota[rem[ri % rem.length][0]]++; ri++; }
    while (sum() > MOCK_N) { var big = Object.keys(quota).sort(function (a, b) { return quota[b] - quota[a]; })[0]; quota[big]--; }
    var out = [];
    TOP.forEach(function (t) {
      var p = Q.filter(function (q) { return q.c === t[0]; });
      var a = shuffle(p.filter(function (q) { return lastIds.indexOf(q.id) < 0; })), b = shuffle(p.filter(function (q) { return lastIds.indexOf(q.id) >= 0; }));
      out = out.concat(noTwins(a.concat(b)).slice(0, quota[t[0]]));
    });
    if (out.length < MOCK_N) out = out.concat(shuffle(Q.filter(function (q) { return out.indexOf(q) < 0; })).slice(0, MOCK_N - out.length));
    return shuffle(out);
  }
  function startMock() {
    S = { v: 'mock', qs: pickMock().map(function (q) { return { q: q, opts: optsOf(q) }; }), ans: {}, flag: {}, at: 0, end: Date.now() + MOCK_MIN * 60000, t0: Date.now() };
    saveLive(); gt('drive_mock_start'); draw(); top();
  }
  function saveLive() { try { localStorage.setItem(LIVE, JSON.stringify({ ids: S.qs.map(function (it) { return it.q.id; }), ord: S.qs.map(function (it) { return it.opts.map(function (o) { return o.i; }); }), ans: S.ans, flag: S.flag, at: S.at, end: S.end, t0: S.t0 })); } catch (e) {} touch(); }
  function clearLive() { try { localStorage.removeItem(LIVE); } catch (e) {} touch(); }
  function liveMock() { try { var l = JSON.parse(localStorage.getItem(LIVE) || 'null'); if (!l || !l.ids || l.end < Date.now() - 60000) { if (l) clearLive(); return null; } return l; } catch (e) { return null; } }
  function byId(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
  function resumeMock() {
    var l = liveMock(); if (!l) return draw();
    var qs = l.ids.map(function (id, n) { var q = byId(id); if (!q) return null; var base = optsOf(q), ord = l.ord[n] || []; var o = ord.map(function (i) { return base.filter(function (x) { return x.i === i; })[0]; }).filter(Boolean); return { q: q, opts: o.length === base.length ? o : base }; });
    if (qs.some(function (x) { return !x; })) { clearLive(); return go('intro'); }
    S = { v: 'mock', qs: qs, ans: l.ans || {}, flag: l.flag || {}, at: l.at || 0, end: l.end, t0: l.t0 || Date.now() };
    draw(); top();
  }
  function answered() { return Object.keys(S.ans).filter(function (k) { return S.ans[k] && S.ans[k].length === need(S.qs[k].q); }).length; }
  function examBar() { return '<div class="lx-bar"><b>Driving Theory — Mock Exam</b><span class="lx-time" id="dtT"></span></div>'; }
  function mockQ(r) {
    var it = S.qs[S.at], pick = S.ans[S.at] || [], last = S.at === S.qs.length - 1, fl = !!S.flag[S.at];
    r.innerHTML = '<div class="lx">' + examBar() +
      '<div class="lx-panel"><div class="lx-num"><span>Question ' + (S.at + 1) + ' of ' + S.qs.length + '</span>' + (fl ? '<span class="lx-flagged">⚑ Flagged for review</span>' : '') + '</div>' + optsHtml(it, pick, false) + '</div>' +
      '<div class="lx-nav"><button class="lx-b" id="lxP"' + (S.at ? '' : ' disabled') + '>← Previous</button><button class="lx-b f' + (fl ? ' on' : '') + '" id="lxF">⚑ ' + (fl ? 'Unflag' : 'Flag') + '</button><button class="lx-b p" id="lxN">' + (last ? 'Review →' : 'Next →') + '</button></div>' +
      '<div class="lx-links"><button class="q" id="lxX">Exit test</button><button id="lxR">Review answers (' + answered() + '/' + S.qs.length + ')</button></div></div>';
    bindPick(r, it, true);
    $('#lxP', r).onclick = function () { if (S.at) { S.at--; saveLive(); draw(); top(); } };
    $('#lxN', r).onclick = function () { if (last) { S.v = 'review'; draw(); top(); } else { S.at++; saveLive(); draw(); top(); } };
    $('#lxF', r).onclick = function () { if (S.flag[S.at]) delete S.flag[S.at]; else S.flag[S.at] = 1; saveLive(); draw(); };
    $('#lxR', r).onclick = function () { S.v = 'review'; draw(); top(); };
    $('#lxX', r).onclick = function () { if (confirm('Exit the mock test? Your answers will not be marked.')) { clearLive(); go('home'); } };
    startTick();
  }
  function mockReview(r) {
    var a = answered(), un = S.qs.length - a, fl = Object.keys(S.flag).length;
    r.innerHTML = '<div class="lx">' + examBar() +
      '<div class="lx-panel"><b style="font-size:18px">Review your answers</b><div style="font-size:14.5px;color:#52606D;margin-top:4px">' + a + ' answered · ' + un + ' unanswered · ' + fl + ' flagged. Tap a number to go back to that question.</div>' +
      '<div class="lx-grid">' + S.qs.map(function (it, n) { var done = S.ans[n] && S.ans[n].length === need(it.q); return '<button class="lx-cell' + (done ? ' a' : '') + (S.flag[n] ? ' f' : '') + '" data-g="' + n + '">' + (n + 1) + '</button>'; }).join('') + '</div>' +
      '<div class="lx-key"><span><i style="background:#EEF9F3;border-color:#1FA463"></i>Answered</span><span><i></i>Unanswered</span><span>⚑ Flagged</span></div>' +
      '<div class="row" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + (un ? '<button class="lx-b" id="lxU">Go to first unanswered</button>' : '') + (fl ? '<button class="lx-b" id="lxFl">Go to first flagged</button>' : '') + '</div></div>' +
      (un ? '<div class="lu-note" style="color:#A15C00;margin:0 2px 10px">⚠️ You have ' + un + ' unanswered question' + (un === 1 ? '' : 's') + '. Unanswered questions are marked wrong.</div>' : '') +
      '<div class="lx-nav" style="grid-template-columns:1fr 1fr"><button class="lx-b" id="lxBk">← Back to questions</button><button class="lx-b p" id="lxS">Submit test</button></div></div>';
    var goQ = function (n) { S.v = 'mock'; S.at = n; saveLive(); draw(); top(); };
    $$('[data-g]', r).forEach(function (b) { b.onclick = function () { goQ(+b.dataset.g); }; });
    if ($('#lxU', r)) $('#lxU', r).onclick = function () { for (var n = 0; n < S.qs.length; n++) if (!(S.ans[n] && S.ans[n].length === need(S.qs[n].q))) return goQ(n); };
    if ($('#lxFl', r)) $('#lxFl', r).onclick = function () { goQ(+Object.keys(S.flag).sort(function (a, b) { return a - b; })[0]); };
    $('#lxBk', r).onclick = function () { goQ(Math.min(S.at, S.qs.length - 1)); };
    $('#lxS', r).onclick = function () { if (confirm(un ? 'You have ' + un + ' unanswered question' + (un === 1 ? '' : 's') + '. Submit your test now?' : 'Submit your test now? You can’t change your answers after this.')) finishMock(false); };
    startTick();
  }
  function startTick() { tick(); timer = setInterval(tick, 1000); }
  function tick() {
    var t = document.getElementById('dtT'); if (!t) return stopTimer();
    var left = Math.max(0, Math.round((S.end - Date.now()) / 1000));
    t.textContent = '⏱ ' + mmss(left) + ' left'; t.classList.toggle('low', left <= 300);
    if (!left) { stopTimer(); finishMock(true); }
  }
  function finishMock(timeUp) {
    var d = load(), score = 0, byT = {};
    var items = S.qs.map(function (it, n) {
      var pick = S.ans[n] || [], ok = isRight(it.q, pick, it.opts);
      mark(d, it.q, ok); if (ok) score++; byT[it.q.c] = byT[it.q.c] || [0, 0]; byT[it.q.c][1]++; if (ok) byT[it.q.c][0]++;
      return { q: it.q, opts: it.opts, pick: pick };
    });
    d.mocks.push({ id: Date.now(), at: today(), s: score, t: byT, rv: items.map(function (x) { return [x.q.id, x.opts.map(function (o) { return o.i; }), x.pick]; }) }); if (d.mocks.length > 50) d.mocks = d.mocks.slice(-50); d.mocks.forEach(function (m, i) { if (i < d.mocks.length - 20) delete m.rv; });
    d.last = S.qs.map(function (it) { return it.q.id; });
    save(d); clearLive(); gt('drive_mock_done', { value: score });
    go('result', { kind: 'mock', items: items, score: score, timeUp: !!timeUp, used: Math.min(MOCK_MIN, Math.round((Date.now() - S.t0) / 60000)), tab: 'all' });
  }

  // ───── ✅ results ─────
  function result(r) {
    var n = S.items.length, pc = n ? Math.round(S.score / n * 100) : 0, mock = S.kind === 'mock', pass = S.score >= PASS;
    var wrong = S.items.filter(function (x) { return !isRight(x.q, x.pick, x.opts); }), byT = {};
    wrong.forEach(function (w) { byT[w.q.c] = (byT[w.q.c] || 0) + 1; });
    var study = Object.keys(byT).sort(function (a, b) { return byT[b] - byT[a]; });
    var list = S.tab === 'wrong' ? wrong : S.items;
    r.innerHTML = '<div class="lx"><div class="lx-bar"><b>' + (mock ? 'Multiple-Choice Mock Test Result' : 'Practice result') + '</b></div>' +
      '<div class="lx-panel lx-res">' + (S.timeUp ? '<div style="font-weight:800;color:#B42318;margin-bottom:6px">Time is up — your test was submitted automatically.</div>' : '') +
      '<div class="sc">' + S.score + '/' + n + '</div><div class="pc">' + pc + '% correct</div>' +
      (mock ? '<div class="pf ' + (pass ? 'ok' : 'no') + '">' + (pass ? 'PASS' : 'FAIL') + '</div><div style="font-size:14px;color:#52606D;margin-top:8px">' + (pass ? 'You reached the multiple-choice pass mark of 43.' : 'The multiple-choice pass mark is 43. You needed ' + (PASS - S.score) + ' more.') + '</div>' : '') +
      '<div class="meta"><span>✓ ' + S.score + ' correct</span><span>✗ ' + (n - S.score) + ' incorrect</span>' + (S.used != null ? '<span>⏱ ' + Math.max(1, S.used) + ' min</span>' : '') + '</div>' +
      (mock ? '<div class="lu-x" style="text-align:left;margin-top:12px">This is a multiple-choice result only — not an overall theory test pass. The real test also has 3 video questions and a hazard perception part (pass mark 44 out of 75), which are not included here.</div>' : '') + '</div>' +
      (study.length ? '<div class="lx-panel"><b style="font-size:16px">📚 Topics to practise</b>' + study.map(function (c) { return '<div class="lu-li"><i>' + TOP[c - 1][2] + '</i><span style="flex:1">' + esc(topName(+c)) + '</span><b>' + byT[c] + ' wrong</b></div>'; }).join('') + '</div>' : '') +
      '<div class="lx-panel" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="lx-b" id="lxRv">Review my answers</button>' +
      (study.length ? '<button class="lx-b" id="lxWt">Practise weak topics</button>' : '') + (wrong.length ? '<button class="lx-b" id="lxRi">Retry incorrect questions</button>' : '') +
      '<button class="lx-b p" id="lxA">' + (mock ? 'Take another mock test' : 'Practise again') + '</button><button class="lx-b" id="lxH">Done</button></div>' +
      '<div class="lx-panel" id="lxList"><b style="font-size:16px">Review ' + (mock ? 'all ' + n + ' questions' : 'your answers') + '</b>' +
      '<div class="lx-tabs"><button data-t="all" aria-pressed="' + (S.tab !== 'wrong') + '">All (' + n + ')</button><button data-t="wrong" aria-pressed="' + (S.tab === 'wrong') + '">Incorrect (' + wrong.length + ')</button></div>' +
      (list.length ? list.map(function (x) {
        var ok = isRight(x.q, x.pick, x.opts), num = S.items.indexOf(x) + 1, you = x.pick.length ? pickedText(x, x.pick) : 'No answer';
        return '<div class="lx-rv"><div class="h"><i class="' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✗') + '</i><div style="flex:1;min-width:0"><b>' + num + '. ' + esc(x.q.q) + '</b>' + (x.q.g ? '<div style="width:84px;margin-top:4px">' + signMarkup(x.q.g, 80) + '</div>' : '') +
          '<div class="y' + (ok ? ' ok' : '') + '">Your answer: ' + esc(you) + '</div>' + (ok ? '' : '<div class="a">Correct answer: ' + esc(rightText(x.q)) + '</div>') +
          '<div class="e">' + esc(x.q.e) + (x.q.x ? ' 📍 ' + esc(x.q.x) : '') + '</div><span class="c">' + TOP[x.q.c - 1][2] + ' ' + esc(topName(x.q.c)) + '</span> ' + hcLink(x.q) + '</div></div></div>';
      }).join('') : '<div style="color:#52606D;padding:8px 0">No incorrect answers — well done!</div>') + '</div>' +
      '<div class="lu-disc">' + esc(DISCLAIMER) + ' Road sign images: Crown copyright, Department for Transport.</div></div>';
    $$('[data-t]', r).forEach(function (b) { b.onclick = function () { S.tab = b.dataset.t; draw(); var l = $('#lxList'); if (l) l.scrollIntoView(); }; });
    $('#lxRv', r).onclick = function () { var l = $('#lxList'); if (l) l.scrollIntoView({ behavior: 'smooth' }); };
    if ($('#lxWt', r)) $('#lxWt', r).onclick = function () { startPrac(+study[0], 10, 'now'); };
    if ($('#lxRi', r)) $('#lxRi', r).onclick = function () { startPrac(wrong.map(function (w) { return w.q.id; }), wrong.length, 'now'); };
    $('#lxA', r).onclick = function () { if (mock) go('intro'); else startPrac(S.mode, S.n, S.fb); };
    $('#lxH', r).onclick = function () { go(S.hist ? 'hist' : 'home'); };
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
      '<div class="lu-x" style="margin-top:10px">🚧 <b>Hazard perception practice is not available in Auntie Tobi yet.</b> A fair practice test needs real road video clips with checked scoring windows, and we don’t have suitable clips yet — so we won’t give you made-up scores. Use the free official DVSA practice test for now.</div>',
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

  function summary() { var d = load(), last = d.mocks[d.mocks.length - 1], pr = raw(PRAC), lv = liveMock(); return { live: !!lv, liveN: lv ? Object.keys(lv.ans || {}).length : 0, prac: pr ? { at: (pr.at || 0) + 1, n: pr.ids.length } : null, best: d.mocks.reduce(function (a, m) { return Math.max(a, m.s); }, 0), mocks: d.mocks.length, last: last ? last.s : null, answered: d.n, weak: Object.keys(d.wrong).length, date: d.date }; }
  function setDate(iso) { var d = load(); d.date = iso || ''; save(d); }
  window.DriveTest = { sync: function () { return syncIn(); }, resume: function () { open('resume'); }, results: function () { open('hist'); }, open: open, summary: summary, setDate: setDate, sign: function (k) { return signMarkup(k); }, mock: function () { open(); getQ().then(function () { if (liveMock()) resumeMock(); else go('intro'); }); }, DISCLAIMER: DISCLAIMER };

  // 🔗 auntietobi.co.uk/driving-theory-test (→ /?drive=1), /mock, /signs, /before
  var m = location.search.match(/[?&]drive(?:=([a-z]+))?/i);
  if (m || location.pathname.replace(/\/$/, '') === '/driving-theory-test') {
    var go2 = function () { var k = m && m[1]; if (k === 'mock') window.DriveTest.mock(); else if (k === 'signs') { open(); getQ().then(function () { startPrac('signs', 10, 'now'); }); } else open(k === 'before' ? 'before' : 'home'); gt('drive_link', { label: k || 'home' }); };
    if (document.readyState === 'complete') setTimeout(go2, 900); else window.addEventListener('load', function () { setTimeout(go2, 900); });
  }
})();
