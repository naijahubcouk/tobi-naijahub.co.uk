/*
 * Auntie Tobi HQ — 🎬 Quiz videos.
 * Pick a quiz (Life in the UK Test or Driving Theory Test) → questions come from the checked question banks →
 * one background picture per question (made once with HQ's image model, or your own) → optional AI voice (ElevenLabs,
 * your own subscription) → HQ builds a 1080×1920 MP4 in the browser: header, question with a highlighted word, answers one by one,
 * 3-2-1 countdown with ticks, the right answer turns green with a ding, then the ending card. Add music in Instagram.
 *
 * HQ calls HQQuizVid.init({ api, sheet, toast, esc, S, go }) once, then HQQuizVid.view() for the #qvid page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30, X = null;
  var BANKS = {
    lifeuk: { name: 'Life in the UK Test', file: '/lifeuk-q.json?v=20261122a', link: 'auntietobi.co.uk/life-in-uk-test', h1: 'QUIZ: Life in the UK Test', h2: 'Can you get {n}/{n}?', say: 'Life in the UK test quiz. Can you get {n} out of {n}?',
      groups: [[0, 'All chapters, mixed'], [1, '1. Values and principles'], [2, '2. What is the UK?'], [3, '3. History'], [4, '4. Modern society'], [5, '5. Government and law']] },
    drive: { name: 'Driving Theory Test', file: '/drive-q.json?v=20261121a', link: 'auntietobi.co.uk/driving-theory-test', h1: 'QUIZ: UK Driving Theory', h2: 'Can you get {n}/{n}?', say: 'UK driving theory test quiz. Can you get {n} out of {n}?',
      groups: [[0, 'All topics, mixed'], [1, 'Alertness'], [2, 'Attitude'], [3, 'Safety and your vehicle'], [4, 'Safety margins'], [5, 'Hazard awareness'], [6, 'Vulnerable road users'], [7, 'Other types of vehicle'], [8, 'Vehicle handling'], [9, 'Motorway rules'], [10, 'Rules of the road'], [12, 'Essential documents'], [13, 'Incidents and emergencies'], [14, 'Vehicle loading']] },
  };
  var STOP = ' the a an of in to is are was were what which who when where why how do does did can you your for on at by with from and or not be as this that these those it its into than then their there they he she his her we our us uk british britain england about after before during most many much one two three four five more some any must should may might will would could shall has have had been being called known name ';
  var KEEP = function () {}, QV = null, BANKQ = {}, IMG = {}, ST = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function state() { if (!QV) QV = { bank: 'lifeuk', n: 10, grp: 0, qs: [], voiceOn: true, voice: '', model: 'flash', readOpts: true, h1: '', h2: '', outro: 'Great job! Share your score in the comments! 👇', appOn: true, igOn: true, ig: '@auntietobi_uk', appT: 'Practice more FREE on Auntie Tobi App', sayApp: true, bgs: {}, out: null }; return QV; }
  function bank() { return BANKS[QV.bank]; }
  function fill(s) { return String(s || '').replace(/\{n\}/g, QV.qs.length || QV.n); }
  function loadBank(k) { if (BANKQ[k]) return Promise.resolve(BANKQ[k]); return fetch(BANKS[k].file).then(function (r) { return r.json(); }).then(function (j) { BANKQ[k] = j.filter(function (q) { return (!q.s || q.s === 'v') && q.t === 'm' && !q.g && q.o && q.o.length === 4 && q.o.every(function (o) { return o.length <= 46; }) && q.q.length <= 120; }); return BANKQ[k]; }); }
  function keyWord(q) {
    var w = q.replace(/[“”"?.,!:;()]/g, '').split(/\s+/).filter(function (x) { return x.length > 2 && STOP.indexOf(' ' + x.toLowerCase() + ' ') < 0; });
    w.sort(function (a, b) { return b.length - a.length; }); return w[0] || '';
  }
  function makeQ(q) { var o = shuffle(q.o.map(function (t, i) { return { t: t, ok: i === 0 }; })); return { id: q.id, q: q.q, opts: o.map(function (x) { return x.t; }), ans: o.findIndex(function (x) { return x.ok; }), hl: keyWord(q.q), e: q.e }; }
  function pick(all) {
    var pool = all.filter(function (q) { return !QV.grp || q.c === QV.grp; }), used = QV.qs.map(function (x) { return x.id; });
    var fresh = shuffle(pool.filter(function (q) { return used.indexOf(q.id) < 0; }));
    return fresh;
  }
  function imgSrc(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function loadImg(src) { if (IMG[src]) return IMG[src]; IMG[src] = new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { delete IMG[src]; bad(new Error('A picture didn’t load.')); }; im.src = src; }); return IMG[src]; }
  function b64ToBuf(dataUrl) { var b = atob(String(dataUrl).split(',')[1] || ''), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }

  // ───── page ─────
  function view() {
    state();
    head();
    var v = $('#view');
    v.innerHTML = '<div class="card" style="max-width:980px"><div class="muted">Loading…</div></div>';
    Promise.all([loadBank(QV.bank), ST ? Promise.resolve(ST) : X.api('qv-status').then(function (r) { ST = r; return r; }).catch(function () { ST = { ready: false }; return ST; })]).then(function (r) {
      if (!QV.qs.length) newSet(r[0]);
      if (!QV.voice && ST.voices && ST.voices.length) QV.voice = ST.voices[0].id;
      if (!ST.ready) QV.voiceOn = false;
      draw(); refreshBgs();
    });
  }
  function head() {
    $('#ttl').textContent = QV.savedName ? 'Quiz videos · ' + QV.savedName : 'Quiz videos';
    $('#topRight').innerHTML = '<button class="btn ghost" id="qvNewQ">➕ New</button> <button class="btn ghost" id="qvMine">📂 My quizzes</button> <button class="btn primary" id="qvSave">💾 Save</button> <button class="btn ghost" id="qvSet">⚙️ Voice</button>';
    $('#qvSet').onclick = setupSheet; $('#qvMine').onclick = mine; $('#qvSave').onclick = saveSheet;
    $('#qvNewQ').onclick = function () { if (!confirm('Start a new quiz? Anything you haven’t saved here will be cleared.')) return; var keepV = { voice: QV.voice, model: QV.model }; QV = null; state(); QV.voice = keepV.voice; QV.model = keepV.model; view(); };
  }
  function snapshot() { KEEP(); var d = {}; ['bank', 'grp', 'qs', 'bgs', 'voiceOn', 'voice', 'model', 'readOpts', 'h1', 'h2', 'outro', 'appOn', 'appT', 'sayApp', 'igOn', 'ig'].forEach(function (k) { d[k] = QV[k]; }); return d; }
  function doSave(name, asNew) {
    return X.api('qv-save', { id: asNew ? '' : QV.savedId, name: name, data: snapshot() }).then(function (r) { QV.savedId = r.id; QV.savedName = r.name; head(); X.toast('💾 Saved — find it in 📂 My quizzes'); });
  }
  function saveSheet() {
    KEEP();
    var s = X.sheet('<h3 style="margin:0 0 8px">💾 Save this quiz</h3><label>Name</label><input id="qvSN" value="' + esc(QV.savedName || (QV.h1 + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))) + '">' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Saves the questions, words, voice choice and pictures. Open it again any time from 📂 My quizzes and make the video again — the voice and pictures are already saved, so it’s free.</div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="qvSOk">💾 Save</button>' + (QV.savedId ? '<button class="btn ghost" id="qvSNew">Save as a new copy</button>' : '') + '<button class="btn ghost" id="qvSX">Cancel</button></div>');
    var go = function (asNew) { var n = $('#qvSN', s).value.trim(); doSave(n, asNew).then(function () { s.remove(); }).catch(function (e) { X.toast(e.message); }); };
    $('#qvSOk', s).onclick = function () { go(false); }; if ($('#qvSNew', s)) $('#qvSNew', s).onclick = function () { go(true); }; $('#qvSX', s).onclick = function () { s.remove(); };
    setTimeout(function () { var i = $('#qvSN', s); i.focus(); i.select(); }, 50);
  }
  function mine() {
    var s = X.sheet('<h3 style="margin:0 0 8px">📂 My quizzes</h3><div id="qvML" class="muted">Loading…</div>');
    var paint = function (items) {
      var box = $('#qvML', s); if (!box) return;
      if (!items.length) { box.innerHTML = 'Nothing saved yet. Tap 💾 Save on a quiz to keep it here.'; return; }
      box.classList.remove('muted');
      box.innerHTML = items.map(function (it) {
        return '<div class="row" style="gap:8px;padding:8px 0;border-top:1px solid #EEE9DD;flex-wrap:nowrap"><div style="flex:1;min-width:0"><b>' + esc(it.name) + '</b>' + (it.id === QV.savedId ? ' <span class="muted">(open now)</span>' : '') +
          '<div class="muted" style="font-size:12.5px">' + (BANKS[it.bank] ? BANKS[it.bank].name : '') + ' · ' + it.n + ' questions · saved ' + new Date(it.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div>' +
          '<button class="btn primary sm" data-open="' + it.id + '">Open</button><button class="btn ghost sm" data-del="' + it.id + '" title="Delete">🗑️</button></div>';
      }).join('');
      $$('[data-open]', s).forEach(function (b) { b.onclick = function () { openSaved(b.dataset.open).then(function () { s.remove(); }); }; });
      $$('[data-del]', s).forEach(function (b) { b.onclick = function () { var it = items.filter(function (x) { return x.id === b.dataset.del; })[0]; if (!confirm('Delete “' + it.name + '”? This can’t be undone.')) return; X.api('qv-del', { id: it.id }).then(function () { if (QV.savedId === it.id) { QV.savedId = ''; QV.savedName = ''; head(); } items = items.filter(function (x) { return x.id !== it.id; }); paint(items); X.toast('🗑️ Deleted'); }).catch(function (e) { X.toast(e.message); }); }; });
    };
    X.api('qv-list').then(function (r) { paint(r.items || []); }).catch(function (e) { var b = $('#qvML', s); if (b) b.textContent = e.message; });
  }
  function openSaved(id) {
    return X.api('qv-load', { id: id }).then(function (r) {
      var d = r.data || {}, v = QV.voice; QV = null; state();
      Object.keys(d).forEach(function (k) { QV[k] = d[k]; }); QV.n = (d.qs || []).length || 10; if (!QV.voice) QV.voice = v;
      QV.savedId = r.id; QV.savedName = r.name; QV.out = null;
      if (ST && !ST.ready) QV.voiceOn = false;
      head(); return loadBank(QV.bank).then(function () { draw(); refreshBgs(); X.toast('📂 Opened “' + r.name + '”'); });
    }).catch(function (e) { X.toast(e.message); throw e; });
  }
  function newSet(all) { QV.qs = []; QV.out = null; var f = pick(all); QV.qs = f.slice(0, QV.n).map(makeQ); QV.h1 = bank().h1; QV.h2 = fill(bank().h2); }
  function draw() {
    var v = $('#view'), b = bank(), cr = ST && ST.credits;
    var est = QV.qs.reduce(function (a, q) { return a + q.q.length + (QV.readOpts ? q.opts.join(', ').length + 12 : 0) + q.opts[q.ans].length + 16; }, 60);
    v.innerHTML = '<div id="qvRoot" style="max-width:1020px"><style>#qvRoot .card{margin-bottom:12px}#qvRoot label{display:block}#qvRoot input[type=checkbox]{width:auto;flex:none;margin:0}</style>' +
      '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">' +
      '<div><label>Quiz</label><select id="qvBank">' + Object.keys(BANKS).map(function (k) { return '<option value="' + k + '"' + (k === QV.bank ? ' selected' : '') + '>' + BANKS[k].name + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Questions</label><select id="qvN">' + [5, 8, 10].map(function (n) { return '<option' + (n === QV.n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div>' +
      '<div><label>From</label><select id="qvGrp">' + b.groups.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === QV.grp ? ' selected' : '') + '>' + esc(g[1]) + '</option>'; }).join('') + '</select></div>' +
      '<button class="btn ghost" id="qvNew">🔀 New questions</button></div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:8px">Questions come from the checked ' + esc(b.name) + ' bank in the app, so the answers are right. Swap any you don’t like.</div></div>' +

      '<div class="card"><b>1 · Questions and backgrounds</b><div id="qvList" style="margin-top:8px">' + QV.qs.map(function (q, i) {
        var bg = QV.bgs[q.id];
        return '<div class="row" style="gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #EEE9DD">' +
          '<div style="flex:none;width:64px;height:114px;border-radius:8px;background:#e9e6dc ' + (bg ? 'url(' + imgSrc(bg) + ') center/cover' : '') + ';display:flex;align-items:center;justify-content:center;font-size:11px;color:#6B7280;text-align:center">' + (bg ? '' : 'No picture yet') + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700">' + (i + 1) + '. ' + esc(q.q) + '</div><div class="muted" style="font-size:13px;margin-top:3px">' + q.opts.map(function (o, k) { return k === q.ans ? '<b style="color:#057A44">✓ ' + esc(o) + '</b>' : esc(o); }).join(' · ') + '</div>' +
          '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><label style="margin:0;font-size:12.5px">Green word <input data-hl="' + i + '" value="' + esc(q.hl) + '" style="width:130px;padding:4px 6px;font-size:13px"></label>' +
          '<button class="btn ghost sm" data-swap="' + i + '">🔀 Swap</button><button class="btn ghost sm" data-gen="' + i + '">' + (bg ? '🔄 New picture' : '✨ Make picture') + '</button>' +
          '<label class="btn ghost sm" style="margin:0;cursor:pointer">📷 My photo<input type="file" accept="image/jpeg,image/png,image/webp" data-up="' + i + '" hidden></label></div></div></div>';
      }).join('') + '</div><div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="qvAll">✨ Make all missing pictures</button><span class="muted" id="qvBgMsg" style="font-size:12.5px">Pictures are saved per question and reused in later videos for free.</span></div></div>' +

      '<div class="card"><b>2 · Words and voice</b><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">' +
      '<div style="flex:1;min-width:220px"><label>Title line 1</label><input id="qvH1" value="' + esc(QV.h1) + '"></div><div style="flex:1;min-width:220px"><label>Title line 2</label><input id="qvH2" value="' + esc(QV.h2) + '"></div></div>' +
      '<label>Ending</label><input id="qvOut" value="' + esc(QV.outro) + '">' +
      '<div style="margin-top:10px;padding:10px;border:1px solid #EEE9DD;border-radius:10px"><label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="qvIg"' + (QV.igOn ? ' checked' : '') + '> 📸 Show the Instagram handle at the bottom</label>' +
      '<div id="qvIgBox"' + (QV.igOn ? '' : ' hidden') + '><input id="qvIgT" value="' + esc(QV.ig) + '" style="margin-top:8px;max-width:320px"></div></div>' +
      '<div style="margin-top:10px;padding:10px;border:1px solid #EEE9DD;border-radius:10px"><label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="qvApp"' + (QV.appOn ? ' checked' : '') + '> 📱 Add an Auntie Tobi App box at the end</label>' +
      '<div id="qvAppBox"' + (QV.appOn ? '' : ' hidden') + '><input id="qvAppT" value="' + esc(QV.appT) + '" style="margin-top:8px"><div class="muted" style="font-size:12.5px">Shown in a green box with <b>' + esc(b.link) + '</b> under it.</div>' +
      (ST && ST.ready ? '<label style="display:flex;gap:8px;align-items:center;margin:6px 0 0"><input type="checkbox" id="qvSayApp"' + (QV.sayApp ? ' checked' : '') + '> 🎙️ The voice says it too</label>' : '') + '</div></div>' +
      '<div style="margin-top:10px;padding:10px;border:1px solid #EEE9DD;border-radius:10px">' +
      (ST && ST.ready ? '<label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="qvVo"' + (QV.voiceOn ? ' checked' : '') + '> 🎙️ AI voice reads the quiz (ElevenLabs)</label>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><select id="qvVoice" style="flex:1;min-width:220px">' + (ST.voices || []).map(function (x) { return '<option value="' + x.id + '"' + (x.id === QV.voice ? ' selected' : '') + '>' + esc(x.name) + (x.accent ? ' — ' + esc(x.accent) : '') + (x.gender ? ', ' + esc(x.gender) : '') + '</option>'; }).join('') + '</select>' +
        '<button class="btn ghost sm" id="qvHear">▶️ Hear it</button><select id="qvModel"><option value="flash"' + (QV.model === 'flash' ? ' selected' : '') + '>Flash (uses fewer credits)</option><option value="natural"' + (QV.model === 'natural' ? ' selected' : '') + '>Most natural</option></select></div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:8px 0 0"><input type="checkbox" id="qvOpts"' + (QV.readOpts ? ' checked' : '') + '> Read the four answers out too</label>' +
        '<div class="muted" style="font-size:12.5px;margin-top:6px">This video: about <b>' + est.toLocaleString() + '</b> characters' + (QV.model === 'flash' ? ' (Flash uses about half a credit per character)' : '') + '. Lines you’ve made before are free.' + (cr ? ' Credits left this month: <b>' + cr.left.toLocaleString() + '</b>' + (cr.resetAt ? ' · resets ' + esc(cr.resetAt) : '') : '') + '</div>'
        : '<div>🎙️ <b>AI voice isn’t set up yet.</b> <span class="muted">The video will have ticks and a ding — you can add music in Instagram.</span> <button class="btn link" id="qvSet2">How to set it up</button></div>') +
      '</div></div>' +

      '<div class="card"><b>3 · Make the video</b><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primary" id="qvGo">🎬 Make the video</button><button class="btn ghost" id="qvPrev">👀 Preview first frame</button></div>' +
      '<div id="qvProg" class="muted" style="margin-top:8px"></div><div id="qvOutBox" style="margin-top:10px"></div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:8px">1080×1920 MP4, ready for Reels, Stories and TikTok. Best in Chrome or Edge on a laptop. Tip: add a trending sound in Instagram — keep it quiet under the voice.</div></div></div>';
    bind();
    if (QV.out) showOut();
  }
  function bind() {
    $('#qvBank').onchange = function () { QV.bank = this.value; QV.grp = 0; QV.bgs = {}; loadBank(QV.bank).then(function (all) { newSet(all); draw(); refreshBgs(); }); };
    $('#qvN').onchange = function () { QV.n = +this.value; loadBank(QV.bank).then(function (all) { newSet(all); draw(); refreshBgs(); }); };
    $('#qvGrp').onchange = function () { QV.grp = +this.value; loadBank(QV.bank).then(function (all) { newSet(all); draw(); refreshBgs(); }); };
    $('#qvNew').onclick = function () { loadBank(QV.bank).then(function (all) { newSet(all); draw(); refreshBgs(); }); };
    $$('[data-hl]').forEach(function (el) { el.onchange = function () { QV.qs[+el.dataset.hl].hl = el.value.trim(); }; });
    $$('[data-swap]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.swap; loadBank(QV.bank).then(function (all) { var f = pick(all); if (f[0]) { QV.qs[i] = makeQ(f[0]); draw(); refreshBgs(); } }); }; });
    $$('[data-gen]').forEach(function (b) { b.onclick = function () { genBg(+b.dataset.gen, !!QV.bgs[QV.qs[+b.dataset.gen].id]); }; });
    $$('[data-up]').forEach(function (inp) { inp.onchange = function () { var f = inp.files && inp.files[0]; if (f) upBg(+inp.dataset.up, f); }; });
    $('#qvAll').onclick = makeAllBgs;
    var keep = KEEP = function () { QV.h1 = $('#qvH1').value; QV.h2 = $('#qvH2').value; QV.outro = $('#qvOut').value; QV.appT = $('#qvAppT').value; var g = $('#qvIgT').value.trim().replace(/^@*/, ''); QV.ig = g ? '@' + g : ''; };
    ['#qvH1', '#qvH2', '#qvOut', '#qvAppT', '#qvIgT'].forEach(function (s) { $(s).oninput = keep; });
    $('#qvIg').onchange = function () { QV.igOn = this.checked; $('#qvIgBox').hidden = !this.checked; };
    $('#qvApp').onchange = function () { QV.appOn = this.checked; $('#qvAppBox').hidden = !this.checked; };
    if ($('#qvSayApp')) $('#qvSayApp').onchange = function () { QV.sayApp = this.checked; };
    if ($('#qvVo')) { $('#qvVo').onchange = function () { QV.voiceOn = this.checked; }; $('#qvVoice').onchange = function () { QV.voice = this.value; }; $('#qvModel').onchange = function () { QV.model = this.value; draw(); }; $('#qvOpts').onchange = function () { QV.readOpts = this.checked; draw(); }; $('#qvHear').onclick = hear; }
    if ($('#qvSet2')) $('#qvSet2').onclick = setupSheet;
    $('#qvGo').onclick = function () { keep(); make().catch(function (e) { prog(''); X.toast(e.message || 'Something went wrong.'); }); };
    $('#qvPrev').onclick = function () { keep(); preview().catch(function (e) { X.toast(e.message); }); };
  }
  function prog(t) { var p = $('#qvProg'); if (p) p.textContent = t; }

  // ───── backgrounds ─────
  function refreshBgs() {
    X.api('qv-bg-saved', { bank: QV.bank, ids: QV.qs.map(function (q) { return q.id; }) }).then(function (r) {
      var ch = false; Object.keys(r.saved || {}).forEach(function (k) { if (QV.bgs[k] !== r.saved[k]) { QV.bgs[k] = r.saved[k]; ch = true; } });
      if (ch) draw();
    }).catch(function () {});
  }
  function genBg(i, fresh) {
    var q = QV.qs[i], m = $('#qvBgMsg'); if (m) m.textContent = '✨ Making the picture for question ' + (i + 1) + '…';
    return X.api('qv-bg', { bank: QV.bank, qid: q.id, q: q.q, a: q.opts[q.ans], fresh: fresh }).then(function (r) { QV.bgs[q.id] = r.img; draw(); }).catch(function (e) { X.toast(e.message); if (m) m.textContent = ''; });
  }
  async function makeAllBgs() {
    var todo = QV.qs.map(function (q, i) { return i; }).filter(function (i) { return !QV.bgs[QV.qs[i].id]; });
    if (!todo.length) return X.toast('All the pictures are ready ✅');
    if (!confirm('Make ' + todo.length + ' picture' + (todo.length === 1 ? '' : 's') + ' with your image model? Each one is saved and reused for free next time.')) return;
    for (var k = 0; k < todo.length; k++) { var m = $('#qvBgMsg'); if (m) m.textContent = '✨ Making picture ' + (k + 1) + ' of ' + todo.length + '…'; await genBg(todo[k], false); }
    X.toast('Pictures ready ✅');
  }
  function upBg(i, file) {
    var q = QV.qs[i];
    shrink(file, 1080, 1920).then(function (d) { return X.api('qv-bg-set', { bank: QV.bank, qid: q.id, dataUrl: d }); }).then(function (r) { QV.bgs[q.id] = r.img; draw(); X.toast('📷 Saved for this question'); }).catch(function (e) { X.toast(e.message || 'Couldn’t use that photo.'); });
  }
  function shrink(file, mw, mh) {
    return new Promise(function (ok, bad) {
      var r = new FileReader(); r.onerror = function () { bad(new Error('Couldn’t read that photo.')); };
      r.onload = function () { var im = new Image(); im.onload = function () { var s = Math.min(1, Math.max(mw / im.width, mh / im.height) * 1.0, 1800 / Math.max(im.width, im.height)); var c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = function () { bad(new Error('That photo didn’t open.')); }; im.src = String(r.result); };
      r.readAsDataURL(file);
    });
  }

  // ───── voice ─────
  var AC = null; function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function hear() {
    var v = (ST.voices || []).filter(function (x) { return x.id === QV.voice; })[0];
    if (v && v.preview) { try { new Audio(v.preview).play(); } catch (e) {} return; }
    X.api('qv-speak', { text: 'Hello! Can you get ten out of ten?', voice: QV.voice, model: QV.model }).then(function (r) { var u = URL.createObjectURL(new Blob([b64ToBuf(r.dataUrl)], { type: 'audio/mpeg' })); new Audio(u).play(); }).catch(function (e) { X.toast(e.message); });
  }
  function lines() {
    var L = [{ k: 'intro', t: fill(bank().say) }];
    QV.qs.forEach(function (q, i) {
      L.push({ k: 'q' + i, t: 'Question ' + (i + 1) + '. ' + q.q });
      if (QV.readOpts) L.push({ k: 'o' + i, t: q.opts.slice(0, 3).join('? ') + '? Or ' + q.opts[3] + '?' });
      L.push({ k: 'a' + i, t: 'The answer is: ' + q.opts[q.ans] + '.' });
    });
    var bye = QV.outro.replace(/[\u{1F300}-\u{1FAFF}☀-➿👇]/gu, '').trim() || 'Great job! Share your score in the comments!';
    if (QV.appOn && QV.sayApp && QV.appT.trim()) bye += ' ' + QV.appT.trim().replace(/\bFREE\b/g, 'free').replace(/[.!]?$/, '.');
    L.push({ k: 'outro', t: bye });
    return L;
  }
  async function getVoices() {
    var out = {}, L = lines(), stop = null;
    for (var i = 0; i < L.length; i++) {
      prog('🎙️ Voice ' + (i + 1) + ' of ' + L.length + '…');
      try { var r = await X.api('qv-speak', { text: L[i].t, voice: QV.voice, model: QV.model }); out[L[i].k] = await ac().decodeAudioData(b64ToBuf(r.dataUrl)); }
      catch (e) { stop = e; break; }
    }
    if (stop) { X.toast((stop.message || 'The voice stopped') + ' — making the video without the voice.'); return null; }
    return out;
  }

  // ───── timeline ─────
  // every part has a start (s) and length (d); the voice lines decide the timing when there is a voice
  function plan(vo) {
    var len = function (k, min) { return vo && vo[k] ? vo[k].duration : min; }, t = 0, P = { parts: [], total: 0, cues: [] };
    var intro = Math.max(2.6, len('intro', 0) + 0.5); P.parts.push({ k: 'intro', s: 0, d: intro, qi: 0 }); if (vo && vo.intro) P.cues.push({ k: 'intro', at: 0.25 }); t = intro;
    QV.qs.forEach(function (q, i) {
      var p = { k: 'q', qi: i, s: t }, x = 0.35;
      p.qAt = x; if (vo && vo['q' + i]) P.cues.push({ k: 'q' + i, at: t + x });
      x += Math.max(2.4, len('q' + i, 0) + 0.25);
      var oDur = vo && vo['o' + i] ? vo['o' + i].duration : 2.2; p.oAt = x; p.oStep = Math.max(0.45, oDur / 4); if (vo && vo['o' + i]) P.cues.push({ k: 'o' + i, at: t + x });
      x += Math.max(oDur, p.oStep * 4) + 0.3;
      p.cdAt = x; [0, 1, 2].forEach(function (n) { P.cues.push({ tick: 1, at: t + x + n }); }); x += 3;
      p.revAt = x; P.cues.push({ ding: 1, at: t + x }); if (vo && vo['a' + i]) P.cues.push({ k: 'a' + i, at: t + x + 0.3 });
      x += Math.max(1.8, len('a' + i, 0) + 0.7);
      p.d = x; t += x; P.parts.push(p);
    });
    var out = Math.max(3.2, len('outro', 0) + 1.2); P.parts.push({ k: 'outro', s: t, d: out, qi: QV.qs.length - 1 }); if (vo && vo.outro) P.cues.push({ k: 'outro', at: t + 0.3 }); t += out;
    P.total = t; return P;
  }
  async function mixAudio(P, vo) {
    var SR = 48000, ctx = new OfflineAudioContext(2, Math.ceil(P.total * SR), SR);
    P.cues.forEach(function (c) {
      if (c.k && vo && vo[c.k]) { var s = ctx.createBufferSource(); s.buffer = vo[c.k]; var g = ctx.createGain(); g.gain.value = 1; s.connect(g); g.connect(ctx.destination); s.start(c.at); return; }
      if (c.tick) { var o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'square'; o.frequency.value = 1400; g2.gain.setValueAtTime(0.0001, c.at); g2.gain.exponentialRampToValueAtTime(0.18, c.at + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, c.at + 0.06); o.connect(g2); g2.connect(ctx.destination); o.start(c.at); o.stop(c.at + 0.08); }
      if (c.ding) { [880, 1320, 1760].forEach(function (f, n) { var o3 = ctx.createOscillator(), g3 = ctx.createGain(); o3.type = 'sine'; o3.frequency.value = f; g3.gain.setValueAtTime(0.0001, c.at); g3.gain.exponentialRampToValueAtTime(0.28 / (n + 1), c.at + 0.01); g3.gain.exponentialRampToValueAtTime(0.0001, c.at + 0.9); o3.connect(g3); g3.connect(ctx.destination); o3.start(c.at); o3.stop(c.at + 1); }); }
    });
    return ctx.startRendering();
  }

  // ───── drawing one frame ─────
  function cover(cx, im, z, px, py) {
    var s = Math.max(W / im.width, H / im.height) * z, w = im.width * s, h = im.height * s;
    cx.drawImage(im, (W - w) / 2 + (px || 0) * (w - W) / 2, (H - h) / 2 + (py || 0) * (h - H) / 2, w, h);
  }
  function rr(cx, x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function wrapWords(cx, words, maxW) { var lines = [[]], w = 0, sp = cx.measureText(' ').width; words.forEach(function (wd) { var ww = cx.measureText(wd).width; if (w + ww > maxW && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(wd); w += ww + sp; }); return lines; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function shadowText(cx, t, x, y) { cx.save(); cx.lineJoin = 'round'; cx.lineWidth = 10; cx.strokeStyle = 'rgba(0,0,0,0.75)'; cx.strokeText(t, x, y); cx.restore(); cx.fillText(t, x, y); }
  function frame(cx, T, P, bgs) {
    var pi = 0; while (pi < P.parts.length - 1 && T >= P.parts[pi + 1].s) pi++;
    var p = P.parts[pi], lt = T - p.s;
    var drawBg = function (part, alpha) {
      var im = bgs[QV.qs[part.qi].id]; cx.save(); cx.globalAlpha = alpha;
      if (im) { var f = Math.min(1, (T - part.s) / part.d), mv = part.qi % 2; cover(cx, im, 1.04 + 0.08 * (mv ? 1 - f : f), 0, 0); }
      else { var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0F1E36'); g.addColorStop(1, '#057A44'); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
      cx.restore();
    };
    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    drawBg(p, 1);
    if (pi > 0 && lt < 0.4 && P.parts[pi - 1].qi !== p.qi) drawBg(P.parts[pi - 1], 1 - lt / 0.4);
    // gentle shading so white text stays readable
    var sh = cx.createLinearGradient(0, 0, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(0.32, 'rgba(0,0,0,0.18)'); sh.addColorStop(0.7, 'rgba(0,0,0,0.12)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)'); cx.fillStyle = sh; cx.fillRect(0, 0, W, H);
    // header
    cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = '800 64px Poppins, Arial, sans-serif';
    shadowText(cx, QV.h1, W / 2, 140); cx.font = '800 58px Poppins, Arial, sans-serif'; shadowText(cx, QV.h2, W / 2, 220);
    if (p.k === 'intro') {
      var a = ease(lt / 0.6); cx.save(); cx.globalAlpha = a; cx.font = '900 96px "Playfair Display", Georgia, serif'; shadowText(cx, 'Ready?', W / 2, 860); cx.font = '600 52px Poppins, Arial, sans-serif'; shadowText(cx, QV.qs.length + ' questions · 3 seconds each', W / 2, 960); cx.restore();
    } else if (p.k === 'q') {
      var q = QV.qs[p.qi];
      // question number chip
      cx.save(); cx.fillStyle = 'rgba(0,0,0,0.6)'; rr(cx, W / 2 - 90, 268, 180, 64, 32); cx.fill(); cx.fillStyle = '#fff'; cx.font = '700 38px Poppins, Arial, sans-serif'; cx.fillText((p.qi + 1) + ' / ' + QV.qs.length, W / 2, 314); cx.restore();
      // question text, word by word, with the green word
      var qa = ease((lt - p.qAt + 0.1) / 0.4);
      if (qa > 0) {
        cx.save(); cx.globalAlpha = qa; cx.font = '900 68px "Playfair Display", Georgia, serif';
        var words = q.q.split(/\s+/), lines = wrapWords(cx, words, 900), y0 = 440, lh = 86, hl = (q.hl || '').toLowerCase();
        lines.forEach(function (ln, li) {
          var full = ln.join(' '), x = W / 2 - cx.measureText(full).width / 2;
          ln.forEach(function (wd) {
            var clean = wd.replace(/[“”"?.,!:;()]/g, '').toLowerCase(), ww = cx.measureText(wd).width;
            cx.textAlign = 'left'; cx.fillStyle = hl && clean === hl ? '#3DDC6E' : '#fff'; shadowText(cx, wd, x, y0 + li * lh); x += ww + cx.measureText(' ').width;
          });
        });
        cx.restore(); cx.textAlign = 'center';
      }
      // answers, one by one
      var by = 900, bh = 104, gap = 128, bw = 820, bx = (W - bw) / 2, lab = ['A', 'B', 'C', 'D'], rev = lt >= p.revAt;
      q.opts.forEach(function (o, k) {
        var at = p.oAt + k * p.oStep, a2 = ease((lt - at) / 0.3); if (a2 <= 0) return;
        var ok = k === q.ans, y = by + k * gap + (1 - a2) * 30;
        cx.save(); cx.globalAlpha = a2 * (rev && !ok ? 0.55 : 1);
        rr(cx, bx, y, bw, bh, 18); cx.fillStyle = rev && ok ? '#19C94A' : 'rgba(10,12,16,0.82)'; cx.fill(); cx.lineWidth = 4; cx.strokeStyle = rev && ok ? '#B9F5C8' : 'rgba(255,255,255,0.85)'; cx.stroke();
        cx.fillStyle = '#fff'; cx.font = '800 40px Poppins, Arial, sans-serif'; cx.textAlign = 'left'; cx.fillText(lab[k], bx + 34, y + 66);
        var fs = 46; cx.font = '700 ' + fs + 'px Poppins, Arial, sans-serif'; while (cx.measureText(o).width > bw - 170 && fs > 28) { fs -= 2; cx.font = '700 ' + fs + 'px Poppins, Arial, sans-serif'; }
        cx.textAlign = 'center'; cx.fillText(o + (rev && ok ? '  ✓' : ''), W / 2 + 20, y + 68); cx.restore();
      });
      // 3-2-1 countdown
      if (lt >= p.cdAt && lt < p.revAt) {
        var c = lt - p.cdAt, n = 3 - Math.floor(c), fr = c % 1, cy = 1530;
        cx.save(); cx.beginPath(); cx.arc(W / 2, cy, 92, 0, Math.PI * 2); cx.fillStyle = 'rgba(0,0,0,0.7)'; cx.fill();
        cx.beginPath(); cx.arc(W / 2, cy, 92, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - c / 3)); cx.lineWidth = 12; cx.strokeStyle = '#FFB81C'; cx.stroke();
        cx.fillStyle = '#fff'; cx.font = '900 ' + Math.round(96 + 20 * (1 - fr)) + 'px Poppins, Arial, sans-serif'; cx.textAlign = 'center'; cx.fillText(String(n), W / 2, cy + 36); cx.restore();
      }
    } else {
      var a3 = ease(lt / 0.5); cx.save(); cx.globalAlpha = a3; cx.font = '800 76px Poppins, Arial, sans-serif';
      var ow = wrapWords(cx, QV.outro.split(/\s+/), 900); ow.forEach(function (ln, li) { shadowText(cx, ln.join(' '), W / 2, 820 + li * 92); });
      var yy = 820 + ow.length * 92 + 70, at = (QV.appT || '').trim();
      if (QV.appOn && at) {
        var pop = ease((lt - 0.5) / 0.4), sc = 0.9 + 0.1 * pop; cx.globalAlpha = a3 * Math.max(0, Math.min(1, pop));
        cx.font = '800 50px Poppins, Arial, sans-serif'; var al = wrapWords(cx, at.replace(/Auntie Tobi/g, 'Auntie\u00A0Tobi').split(/ +/), 780), bh2 = 70 + al.length * 62 + 66;
        cx.save(); cx.translate(W / 2, yy + bh2 / 2); cx.scale(sc, sc); cx.translate(-W / 2, -(yy + bh2 / 2));
        rr(cx, W / 2 - 440, yy, 880, bh2, 30); cx.fillStyle = 'rgba(5,122,68,0.95)'; cx.fill(); cx.lineWidth = 4; cx.strokeStyle = 'rgba(255,255,255,0.9)'; cx.stroke();
        cx.fillStyle = '#fff'; al.forEach(function (ln, li) { cx.fillText(ln.join(' '), W / 2, yy + 78 + li * 62); });
        cx.font = '800 44px Poppins, Arial, sans-serif'; cx.fillStyle = '#FFE08A'; cx.fillText('📱 ' + bank().link, W / 2, yy + 70 + al.length * 62 + 30); cx.restore();
      }
      cx.restore();
    }
    // handle
    if (QV.igOn && QV.ig) { cx.save(); cx.textAlign = 'center'; cx.font = '700 36px Poppins, Arial, sans-serif'; cx.fillStyle = 'rgba(255,255,255,0.92)'; shadowText(cx, QV.ig, W / 2, H - 70); cx.restore(); }
  }
  async function images() {
    var bgs = {};
    for (var i = 0; i < QV.qs.length; i++) { var id = QV.bgs[QV.qs[i].id]; if (id) { try { bgs[QV.qs[i].id] = await loadImg(imgSrc(id)); } catch (e) { /* gradient instead */ } } }
    return bgs;
  }
  async function preview() {
    var bgs = await images(), P = plan(null), c = document.createElement('canvas'); c.width = W; c.height = H;
    try { await document.fonts.load('900 70px "Playfair Display"'); await document.fonts.load('800 60px Poppins'); } catch (e) {}
    var p1 = P.parts[1]; frame(c.getContext('2d'), p1.s + p1.revAt + 0.5, P, bgs);
    var s = X.sheet('<h3 style="margin:0 0 8px">👀 Preview — question 1 with the answer showing</h3><img src="' + c.toDataURL('image/jpeg', 0.85) + '" style="width:100%;max-width:360px;display:block;margin:0 auto;border-radius:12px">');
    return s;
  }

  // ───── 🎬 make the MP4 ─────
  async function make() {
    if (typeof VideoEncoder !== 'function' || !window.Mp4Muxer) throw new Error('This browser can’t make videos — please use Chrome or Edge on a laptop.');
    var missing = QV.qs.filter(function (q) { return !QV.bgs[q.id]; }).length;
    if (missing && !confirm(missing + ' question' + (missing === 1 ? ' has' : 's have') + ' no picture yet — they’ll use a plain green background. Make the video anyway?')) return;
    $('#qvGo').disabled = true; QV.out = null; $('#qvOutBox').innerHTML = '';
    try {
      prog('Loading the pictures…'); var bgs = await images();
      try { await document.fonts.load('900 70px "Playfair Display"'); await document.fonts.load('800 60px Poppins'); } catch (e) {}
      var vo = QV.voiceOn && ST && ST.ready && QV.voice ? await getVoices() : null;
      var P = plan(vo); prog('Mixing the sound…'); var audio = await mixAudio(P, vo);
      var vpick = null, tries = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42002a', 'avc']];
      for (var i = 0; i < tries.length && !vpick; i++) { try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i][0], width: W, height: H, bitrate: 8e6, framerate: FPS }); if (r && r.supported) vpick = { codec: tries[i][0], mux: tries[i][1] }; } catch (e) {} }
      if (!vpick) throw new Error('This browser can’t make MP4 videos — please use Chrome or Edge.');
      var apick = null; if (typeof AudioEncoder === 'function') { try { var ar = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }); if (ar && ar.supported) apick = 1; } catch (e) {} }
      var mo = { target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
      if (apick) mo.audio = { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 };
      var mux = new Mp4Muxer.Muxer(mo), failed = null;
      var venc = new VideoEncoder({ output: function (ch, meta) { mux.addVideoChunk(ch, meta); }, error: function (e) { failed = e; } });
      venc.configure({ codec: vpick.codec, width: W, height: H, bitrate: 8e6, framerate: FPS, avc: { format: 'avc' } });
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d');
      var N = Math.round(P.total * FPS);
      for (var f = 0; f < N; f++) {
        if (failed) throw failed;
        frame(cx, f / FPS, P, bgs);
        var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
        if (f % 15 === 0) { prog('🎬 Making the video… ' + Math.round(f / N * 100) + '%'); await new Promise(function (r2) { setTimeout(r2, 0); }); }
        if (venc.encodeQueueSize > 8) await new Promise(function (r3) { setTimeout(r3, 5); });
      }
      await venc.flush(); venc.close();
      if (apick) {
        prog('🔊 Adding the sound…');
        var aenc = new AudioEncoder({ output: function (ch, meta) { mux.addAudioChunk(ch, meta); }, error: function (e) { failed = e; } });
        aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
        var L = audio.getChannelData(0), R = audio.getChannelData(1), AN = audio.length, CH = 1024;
        for (var o = 0; o < AN; o += CH) {
          var n = Math.min(CH, AN - o), data = new Float32Array(n * 2); data.set(L.subarray(o, o + n), 0); data.set(R.subarray(o, o + n), n);
          var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / 48000 * 1e6), data: data });
          aenc.encode(ad); ad.close(); if (aenc.encodeQueueSize > 20) await new Promise(function (r4) { setTimeout(r4, 2); });
        }
        await aenc.flush(); aenc.close();
      }
      if (failed) throw failed;
      mux.finalize();
      QV.out = { blob: new Blob([mux.target.buffer], { type: 'video/mp4' }), secs: Math.round(P.total), voice: !!vo, sound: !!apick };
      prog(''); showOut();
      if (QV.savedId) doSave(QV.savedName, false).catch(function () {});
      X.api('qv-status').then(function (s) { ST = s; }).catch(function () {});
    } finally { var g = $('#qvGo'); if (g) g.disabled = false; }
  }
  function caption() {
    var b = bank(), tag = QV.bank === 'drive' ? '#DrivingTheoryTest #TheoryTest #UKDriving #LearnerDriver #HighwayCode' : '#LifeInTheUKTest #LifeInTheUK #BritishCitizenship #ILR #UKCitizenship';
    return QV.h1 + ' 🇬🇧\n' + QV.h2 + '\n\nPause the video on each question and write your score in the comments 👇\n\nPractise free with ' + (QV.bank === 'drive' ? '400 Highway Code questions and road signs' : '500+ questions from the official handbook') + ' on Auntie Tobi: ' + b.link + '\n\n' + tag + ' #NigeriansInUK #NaijaInUK #AuntieTobi';
  }
  function showOut() {
    var o = QV.out, box = $('#qvOutBox'); if (!o || !box) return;
    var url = URL.createObjectURL(o.blob);
    box.innerHTML = '<div class="row" style="gap:14px;align-items:flex-start;flex-wrap:wrap"><video src="' + url + '" controls playsinline style="width:240px;border-radius:12px;background:#000"></video>' +
      '<div style="flex:1;min-width:240px"><b>✅ Your video is ready</b> <span class="muted">(' + o.secs + ' seconds' + (o.voice ? ', with voice' : '') + (o.sound ? '' : ', no sound in this browser') + ')</span>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><a class="btn primary" download="quiz-' + QV.bank + '-' + Date.now() + '.mp4" href="' + url + '">⬇️ Download MP4</a><button class="btn ghost" id="qvCap">📋 Copy caption</button></div>' +
      '<textarea id="qvCapT" rows="8" style="margin-top:8px;font-size:13px">' + esc(caption()) + '</textarea></div></div>';
    $('#qvCap').onclick = function () { try { navigator.clipboard.writeText($('#qvCapT').value); X.toast('📋 Caption copied'); } catch (e) {} };
  }

  // ───── ⚙️ voice setup ─────
  function setupSheet() {
    var cr = ST && ST.credits;
    X.sheet('<h3 style="margin:0 0 6px">⚙️ AI voice (ElevenLabs)</h3>' +
      (ST && ST.ready ? '<div class="note">✅ Connected' + (cr ? ' · ' + esc(cr.plan || '') + ' plan · <b>' + cr.left.toLocaleString() + '</b> credits left this month' + (cr.resetAt ? ' (resets ' + esc(cr.resetAt) + ')' : '') : '') + '</div>' : '<div class="note">Not connected yet.</div>') +
      '<ol style="line-height:1.7;padding-left:18px;margin-top:10px"><li>In ElevenLabs, go to <b>Developers → API keys</b> and create a key. Give it access to <b>Text to speech</b>, <b>Voices (read)</b> and <b>User (read)</b>.</li>' +
      '<li>In Netlify, open your site → <b>Site configuration → Environment variables → Add a variable</b>.</li>' +
      '<li>Key: <code>ELEVENLABS_API_KEY</code> · Value: the key from ElevenLabs. Save, then go to <b>Deploys → Trigger deploy</b>.</li>' +
      '<li>Come back here and refresh.</li></ol>' +
      '<div class="muted" style="font-size:12.5px">The key stays on the server — it’s never shown in HQ or sent to the browser. Voices use your ElevenLabs plan’s monthly credits. If they run out, videos are still made, just without the voice.</div>');
  }

  function init(x) { X = x; }
  window.HQQuizVid = { init: init, view: view };
})();
