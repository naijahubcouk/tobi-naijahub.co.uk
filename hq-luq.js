/*
 * Auntie Tobi HQ — 🇬🇧 Life in the UK question review.
 * The app's practice questions (/lifeuk-q.json) each have a status: ✅ Verified (used in the app), 🔎 Needs review, 🕒 Outdated, ♊ Duplicate.
 * Here you can check the flagged ones, verify them, fix the wording or answers, or take a question out of the app.
 * Changes are saved in HQ and show in the app within a few minutes — no code change needed.
 * HQ calls HQLuq.init({ api, sheet, toast, esc }) once, then HQLuq.view() for the #luq page.
 */
(function () {
  'use strict';
  var X = null, BK = 'lifeuk', BANKS = {}, BANK = null, FIX = {}, F = { s: 'flag', c: 0, q: '' }, SHOW = 40;
  var SRC = { lifeuk: { name: '🇬🇧 Life in the UK', file: '/lifeuk-q.json', app: '/?lifeuk=1', cName: 'Chapter' }, drive: { name: '🚗 Driving Theory', file: '/drive-q.json', app: '/?drive=1', cName: 'Topic' } };
  var TOPICS = ['', 'Alertness', 'Attitude', 'Safety and your vehicle', 'Safety margins', 'Hazard awareness', 'Vulnerable road users', 'Other types of vehicle', 'Vehicle handling', 'Motorway rules', 'Rules of the road', 'Road and traffic signs', 'Essential documents', 'Incidents, accidents and emergencies', 'Vehicle loading'];
  function chN() { return BK === 'drive' ? TOPICS : CH; }
  var CH = ['', 'Values and principles', 'What is the UK?', 'History', 'Modern society', 'Government and law'];
  var ST = { v: ['✅', 'Verified', '#E3F2EA', '#05502E'], r: ['🔎', 'Needs review', '#FFF4DC', '#7A4B00'], o: ['🕒', 'Outdated', '#FDECEA', '#7A1A12'], d: ['♊', 'Duplicate', '#EEF0F3', '#3E4C59'] };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function merged(q) { var f = FIX[q.id]; return f ? Object.assign({}, q, f) : q; }
  function stOf(q) { return (BK === 'drive' ? q.st : q.s) || 'v'; }
  function load() {
    return Promise.all([BANKS[BK] ? Promise.resolve(BANKS[BK]) : fetch(SRC[BK].file + '?v=' + Date.now()).then(function (r) { return r.json(); }), X.api('lq-fixes', { bank: BK })]).then(function (x) { BANKS[BK] = BANK = x[0]; FIX = x[1].fix || {}; });
  }
  function view() {
    $('#ttl').textContent = 'Quiz question review';
    $('#topRight').innerHTML = '<a class="btn ghost" href="' + SRC[BK].app + '" target="_blank" rel="noopener">👀 Open in the app</a>';
    $('#view').innerHTML = '<div class="card" style="max-width:980px"><div class="muted">Loading…</div></div>';
    load().then(draw).catch(function (e) { $('#view').innerHTML = '<div class="err">' + esc(e.message || 'Couldn’t load the questions.') + '</div>'; });
  }
  function list() {
    var q = F.q.trim().toLowerCase();
    return BANK.map(merged).filter(function (x) {
      var s = stOf(x);
      if (F.s === 'flag' && s === 'v') return false;
      if (F.s === 'changed' && !FIX[x.id]) return false;
      if (ST[F.s] && s !== F.s) return false;
      if (F.c && x.c !== F.c) return false;
      if (q && (x.q + ' ' + (x.o || []).join(' ') + ' ' + x.e + ' #' + x.id).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function ans(x) { return x.t === 't' ? (x.a ? 'True' : 'False') : x.t === '2' ? x.o[0] + ' + ' + x.o[1] : x.o[0]; }
  function chip(s) { var t = ST[s]; return '<span style="display:inline-block;font-size:12px;font-weight:800;border-radius:8px;padding:2px 8px;background:' + t[2] + ';color:' + t[3] + '">' + t[0] + ' ' + t[1] + '</span>'; }
  function draw() {
    var all = BANK.map(merged), cnt = { v: 0, r: 0, o: 0, d: 0 }; all.forEach(function (x) { cnt[stOf(x)]++; });
    var L = list(), more = L.length > SHOW;
    $('#view').innerHTML = '<div style="max-width:1020px"><style>#luqR .card{margin-bottom:12px}#luqR .lq{border-top:1px solid #EEE9DD;padding:12px 0}#luqR .lq:first-child{border-top:0}</style><div id="luqR">' +
      '<div class="row" style="gap:8px;margin-bottom:12px">' + Object.keys(SRC).map(function (k) { return '<button class="btn ' + (k === BK ? 'primary' : 'ghost') + '" data-bk="' + k + '">' + SRC[k].name + '</button>'; }).join('') + '</div>' +
      '<div class="card"><div class="row" style="gap:8px">' + ['v', 'r', 'o', 'd'].map(function (s) { return '<button class="btn ghost sm" data-fs="' + s + '">' + ST[s][0] + ' ' + ST[s][1] + ' <b>' + cnt[s] + '</b></button>'; }).join('') + '</div>' +
      '<div class="muted" style="font-size:13px;margin-top:8px">Only ✅ Verified questions are used in the app (practice, mock exams and quiz videos). The others are kept here until someone checks them against ' + (BK === 'drive' ? 'The Highway Code, Know your traffic signs or GOV.UK' : 'the handbook or GOV.UK') + '. ' + Object.keys(FIX).length + ' question' + (Object.keys(FIX).length === 1 ? ' has' : 's have') + ' HQ changes.</div></div>' +
      '<div class="card"><div class="row" style="gap:8px">' +
      '<select id="lqS" style="width:auto"><option value="flag"' + (F.s === 'flag' ? ' selected' : '') + '>Flagged (not verified)</option><option value="all"' + (F.s === 'all' ? ' selected' : '') + '>All questions</option><option value="changed"' + (F.s === 'changed' ? ' selected' : '') + '>Changed in HQ</option>' + ['v', 'r', 'o', 'd'].map(function (s) { return '<option value="' + s + '"' + (F.s === s ? ' selected' : '') + '>' + ST[s][1] + '</option>'; }).join('') + '</select>' +
      '<select id="lqC" style="width:auto"><option value="0">All ' + SRC[BK].cName.toLowerCase() + 's</option>' + chN().slice(1).map(function (n, i) { var c = i + 1; return '<option value="' + c + '"' + (F.c === c ? ' selected' : '') + '>' + c + '. ' + n + '</option>'; }).join('') + '</select>' +
      '<input id="lqQ" placeholder="Search words or #number" value="' + esc(F.q) + '" style="flex:1;min-width:180px"></div>' +
      '<div style="margin-top:6px">' + (L.length ? L.slice(0, SHOW).map(row).join('') : '<div class="muted" style="padding:10px 0">' + (F.s === 'flag' ? '🎉 Nothing flagged — every question is verified.' : 'No questions match.') + '</div>') + '</div>' +
      (more ? '<button class="btn ghost" id="lqMore">Show more (' + (L.length - SHOW) + ' more)</button>' : '') + '</div></div></div>';
    $$('[data-bk]').forEach(function (b) { b.onclick = function () { if (BK === b.dataset.bk) return; BK = b.dataset.bk; F = { s: 'flag', c: 0, q: '' }; SHOW = 40; view(); }; });
    $$('[data-fs]').forEach(function (b) { b.onclick = function () { F.s = b.dataset.fs; SHOW = 40; draw(); }; });
    $('#lqS').onchange = function () { F.s = this.value; SHOW = 40; draw(); };
    $('#lqC').onchange = function () { F.c = +this.value; SHOW = 40; draw(); };
    $('#lqQ').oninput = function () { F.q = this.value; clearTimeout(window.__lqT); window.__lqT = setTimeout(function () { var p = $('#lqQ').selectionStart; draw(); var i = $('#lqQ'); i.focus(); i.setSelectionRange(p, p); }, 250); };
    if ($('#lqMore')) $('#lqMore').onclick = function () { SHOW += 40; draw(); };
    $$('[data-ok]').forEach(function (b) { b.onclick = function () { set(+b.dataset.ok, { s: 'v' }, '✅ Verified — it’s now used in the app'); }; });
    $$('[data-ed]').forEach(function (b) { b.onclick = function () { edit(+b.dataset.ed); }; });
    $$('[data-st]').forEach(function (s) { s.onchange = function () { set(+s.dataset.st, { s: s.value }, 'Status saved'); }; });
    $$('[data-rs]').forEach(function (b) { b.onclick = function () { if (confirm('Undo all HQ changes to question #' + b.dataset.rs + '?')) X.api('lq-set', { bank: BK, id: +b.dataset.rs, reset: true }).then(function () { delete FIX[b.dataset.rs]; draw(); X.toast('↩️ Back to the original'); }).catch(function (e) { X.toast(e.message); }); }; });
  }
  function row(x) {
    var s = stOf(x), opts = x.t === 't' ? '<b style="color:#057A44">✓ ' + (x.a ? 'True' : 'False') + '</b>' : x.o.map(function (o, i) { return (x.t === '2' ? i < 2 : i === 0) ? '<b style="color:#057A44">✓ ' + esc(o) + '</b>' : esc(o); }).join(' · ');
    return '<div class="lq"><div class="row" style="gap:6px;align-items:center"><b class="muted" style="font-size:12.5px">#' + x.id + ' · ' + (BK === 'drive' ? 'Topic ' + x.c + ' ' + chN()[x.c] : 'Ch ' + x.c) + ' · ' + (x.t === 't' ? 'True/False' : x.t === '2' ? 'Choose two' : 'Choose one') + (x.g ? ' · 🛑 sign: ' + esc(x.g) : '') + (x.rv ? ' · checked ' + esc(x.rv) : '') + '</b>' + chip(s) + (FIX[x.id] ? '<span class="muted" style="font-size:12px">✏️ changed in HQ</span>' : '') + '</div>' +
      '<div style="font-weight:700;margin-top:4px">' + esc(x.q) + '</div><div style="font-size:13.5px;margin-top:3px">' + opts + '</div>' +
      '<div class="muted" style="font-size:13px;margin-top:3px">' + esc(x.e) + (x.x ? ' <span style="color:#7A5300">🕒 ' + esc(x.x) + '</span>' : '') + '</div>' +
      '<div class="row" style="gap:6px;margin-top:6px">' + (s !== 'v' ? '<button class="btn primary sm" data-ok="' + x.id + '">✅ Verify</button>' : '') + '<button class="btn ghost sm" data-ed="' + x.id + '">✏️ Edit</button>' +
      '<select data-st="' + x.id + '" style="width:auto;padding:5px 8px;font-size:13px">' + ['v', 'r', 'o', 'd'].map(function (k) { return '<option value="' + k + '"' + (k === s ? ' selected' : '') + '>' + ST[k][0] + ' ' + ST[k][1] + '</option>'; }).join('') + '</select>' +
      (FIX[x.id] ? '<button class="btn ghost sm" data-rs="' + x.id + '">↩️ Undo HQ changes</button>' : '') + '</div></div>';
  }
  function set(id, patch, msg) { return X.api('lq-set', { bank: BK, id: id, patch: patch }).then(function (r) { FIX[id] = r.fix; draw(); X.toast(msg); }).catch(function (e) { X.toast(e.message); }); }
  function edit(id) {
    var x = merged(BANK.filter(function (q) { return q.id === id; })[0]);
    var lab = x.t === '2' ? ['Correct answer 1', 'Correct answer 2', 'Wrong answer', 'Wrong answer'] : ['Correct answer', 'Wrong answer', 'Wrong answer', 'Wrong answer'];
    var s = X.sheet('<h3 style="margin:0 0 8px">✏️ Question #' + id + '</h3>' +
      '<label>Question</label><textarea id="eQ" rows="3">' + esc(x.q) + '</textarea>' +
      (x.t === 't' ? '<label>Answer</label><select id="eA"><option value="1"' + (x.a ? ' selected' : '') + '>True</option><option value="0"' + (x.a ? '' : ' selected') + '>False</option></select>'
        : x.o.map(function (o, i) { return '<label>' + lab[i] + '</label><input data-eo="' + i + '" value="' + esc(o) + '">'; }).join('') + '<div class="muted" style="font-size:12.5px;margin-top:4px">Keep the correct answer about the same length as the others, and make the wrong answers believable.</div>') +
      '<label>Explanation (shown after answering)</label><textarea id="eE" rows="2">' + esc(x.e) + '</textarea>' +
      '<label>“Now” note (optional — if things have changed since the handbook)</label><input id="eX" value="' + esc(x.x || '') + '">' +
      '<div class="row" style="gap:8px"><div><label>' + SRC[BK].cName + '</label><select id="eC">' + chN().slice(1).map(function (n, i) { var c = i + 1; return '<option value="' + c + '"' + (c === x.c ? ' selected' : '') + '>' + c + '. ' + n + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Status</label><select id="eS">' + ['v', 'r', 'o', 'd'].map(function (k) { return '<option value="' + k + '"' + (k === stOf(x) ? ' selected' : '') + '>' + ST[k][0] + ' ' + ST[k][1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="eOk">Save</button><button class="btn ghost" id="eX2">Cancel</button></div>');
    $('#eX2', s).onclick = function () { s.remove(); };
    $('#eOk', s).onclick = function () {
      var p = { q: $('#eQ', s).value, e: $('#eE', s).value, x: $('#eX', s).value, c: +$('#eC', s).value, s: $('#eS', s).value };
      if (x.t === 't') p.a = $('#eA', s).value === '1'; else p.o = $$('[data-eo]', s).map(function (i) { return i.value; });
      X.api('lq-set', { bank: BK, id: id, patch: p }).then(function (r) { FIX[id] = r.fix; s.remove(); draw(); X.toast('Saved — the app updates within a few minutes'); }).catch(function (e) { X.toast(e.message); });
    };
  }
  function init(x) { X = x; }
  window.HQLuq = { init: init, view: view };
})();
