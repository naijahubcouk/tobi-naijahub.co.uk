/*
 * Auntie Tobi HQ — 🗣️ Yoruba Lessons (Stage 1: make and check the lessons for the app's "Learn Yoruba").
 * Units → lessons → words. AI only drafts (Auntie Tobi only, small cost). Native-speaker reviewers fix spelling/tone marks,
 * approve or reject each word, record audio from their phone and tick that the audio sounds right. A lesson can only go to
 * the app when every word and its audio are approved. 💷 Reviewer summary counts each reviewer's checks per month.
 * Reviewers are HQ team members with only "🗣️ Yoruba Lessons" ticked — they never see anything else, and nothing they do costs money.
 * HQ calls HQYor.init({ api, sheet, toast, esc }) once, then HQYor.view() for the #yor page.
 */
(function () {
  'use strict';
  var X = null, IX = null, ADMIN = false, ME = '', CUR = null, TAB = 'lessons', AUD = {}, LASTF = null, REC = null;
  var TONES = ['à', 'á', 'è', 'é', 'ẹ', 'ẹ̀', 'ẹ́', 'ì', 'í', 'ò', 'ó', 'ọ', 'ọ̀', 'ọ́', 'ù', 'ú', 'ṣ', 'ń', 'ǹ', 'Ẹ', 'Ọ', 'Ṣ'];
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s == null ? '' : s); }
  function imgSrc(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function who(e) { return e ? String(e).split('@')[0] : ''; }
  function when(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }

  function view() {
    $('#ttl').textContent = 'Yoruba Lessons';
    $('#view').innerHTML = '<div class="card" style="max-width:980px"><div class="muted">Loading…</div></div>';
    X.api('yo-index').then(function (r) { IX = r.index; ADMIN = !!r.isAdmin; ME = r.me || ''; head(); draw(); }).catch(function (e) { $('#view').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  }
  function head() {
    var t = function (k, l) { return '<button class="btn ' + (TAB === k ? 'primary' : 'ghost') + '" data-tab="' + k + '">' + l + '</button>'; };
    $('#topRight').innerHTML = t('lessons', '📚 Lessons') + ' ' + t('review', '🔎 To check (' + toCheck() + ')') + (ADMIN ? ' ' + t('pay', '💷 Reviewer summary') + ' <button class="btn ghost" id="yoSet">⚙️</button>' : '');
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { TAB = b.dataset.tab; if (TAB !== 'lessons') CUR = null; head(); draw(); }; });
    if ($('#yoSet')) $('#yoSet').onclick = settings;
  }
  function toCheck() { var n = 0; (IX ? IX.units : []).forEach(function (u) { u.lessons.forEach(function (l) { n += (l.n - l.ok) + (l.n - l.audOk); }); }); return n; }
  function draw() { if (TAB === 'review') return drawReview(); if (TAB === 'pay') return drawPay(); if (CUR) return drawLesson(); drawCourse(); }
  function chips(l) {
    return '<span class="muted" style="font-size:12.5px">✅ ' + l.ok + '/' + l.n + ' words · 🔊 ' + l.audOk + '/' + l.n + ' audio' + (l.no ? ' · ❌ ' + l.no + ' rejected' : '') + '</span>' +
      (l.live ? ' <span style="font-size:12px;background:#E3F2EA;color:#05502E;border-radius:99px;padding:2px 8px">🟢 In the app' + (l.changed ? ' · changed since' : '') + '</span>' : '');
  }

  // ── 📚 the course ──
  function drawCourse() {
    var h = '<div style="max-width:980px"><div class="card"><div class="note" style="margin:0">🗣️ <b>How it works:</b> ' + (ADMIN ? '✨ AI drafts the words for a lesson → ' : '') + 'a native speaker checks every word (spelling and tone marks), presses ✅ Approve, records the audio 🎙️ and ticks that it sounds right. ' + (ADMIN ? 'When everything in a lesson is approved, 📲 put it in the app.' : 'Thank you for checking! 💚') + '</div></div>';
    IX.units.forEach(function (u, ui) {
      h += '<div class="card"><div class="row" style="gap:8px;align-items:center"><h3 style="margin:0;flex:1">Unit ' + (ui + 1) + ' · ' + esc(u.title) + '</h3>' + (ADMIN ? '<button class="btn ghost sm" data-uren="' + u.id + '">✏️</button>' : '') + '</div>' +
        u.lessons.map(function (l, li) { return '<div class="row" style="gap:8px;padding:9px 0;border-top:1px solid #EEE9DD;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b>' + (li + 1) + '. ' + esc(l.title) + '</b><br>' + (l.n ? chips(l) : '<span class="muted" style="font-size:12.5px">No words yet</span>') + '</div><button class="btn primary sm" data-open="' + l.id + '">Open</button></div>'; }).join('') +
        (ADMIN ? '<div class="row" style="gap:6px;margin-top:8px"><input data-newl="' + u.id + '" placeholder="New lesson name, e.g. Days of the week" style="flex:1"><button class="btn ghost sm" data-addl="' + u.id + '">➕ Add lesson</button></div>' : '') + '</div>';
    });
    if (ADMIN) h += '<div class="card"><div class="row" style="gap:6px"><input id="yoNewU" placeholder="New unit, e.g. At the market" style="flex:1"><button class="btn ghost" id="yoAddU">➕ Add unit</button></div></div>';
    $('#view').innerHTML = h + '</div>';
    $$('[data-open]').forEach(function (b) { b.onclick = function () { openLesson(b.dataset.open); }; });
    $$('[data-addl]').forEach(function (b) { b.onclick = function () { var t = $('[data-newl="' + b.dataset.addl + '"]').value.trim(); if (!t) return; X.api('yo-lesson-new', { unit: b.dataset.addl, title: t }).then(view).catch(function (e) { X.toast(e.message); }); }; });
    $$('[data-uren]').forEach(function (b) { b.onclick = function () { var u = IX.units.filter(function (x) { return x.id === b.dataset.uren; })[0], t = prompt('Unit name:', u.title); if (t && t.trim()) X.api('yo-unit', { id: u.id, title: t }).then(view).catch(function (e) { X.toast(e.message); }); }; });
    if ($('#yoAddU')) $('#yoAddU').onclick = function () { var t = $('#yoNewU').value.trim(); if (t) X.api('yo-unit', { title: t }).then(view).catch(function (e) { X.toast(e.message); }); };
  }
  function openLesson(id) { $('#view').innerHTML = '<div class="card"><div class="muted">Opening…</div></div>'; X.api('yo-lesson', { id: id }).then(function (r) { CUR = r.lesson; TAB = 'lessons'; head(); drawLesson(); window.scrollTo(0, 0); }).catch(function (e) { X.toast(e.message); view(); }); }
  function setLesson(l) { CUR = l; IX.units.forEach(function (u) { u.lessons = u.lessons.map(function (x) { return x.id === l.id ? sumOf(l) : x; }); }); head(); }
  function sumOf(l) { var it = l.items || []; return { id: l.id, title: l.title, n: it.length, ok: it.filter(function (x) { return x.st === 'ok'; }).length, no: it.filter(function (x) { return x.st === 'no'; }).length, aud: it.filter(function (x) { return x.audio; }).length, audOk: it.filter(function (x) { return x.audio && x.audOk; }).length, live: !!l.live, changed: !!l.changed }; }

  // ── one lesson ──
  function drawLesson() {
    var l = CUR, s = sumOf(l), ready = s.n >= 3 && s.ok === s.n && s.audOk === s.n;
    var h = '<div style="max-width:980px"><div class="card"><button class="btn link" id="yoBack">← All lessons</button>' +
      '<div class="row" style="gap:8px;align-items:center;margin-top:4px"><h2 style="margin:0;flex:1">' + esc(l.title) + '</h2>' + (ADMIN ? '<button class="btn ghost sm" id="yoRen">✏️ Rename</button>' : '') + '</div>' +
      '<div style="margin-top:4px">' + chips(s) + '</div>';
    if (ADMIN) h += '<div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><input id="yoTopic" placeholder="Topic for the AI (optional) — e.g. greeting older people in the morning" style="flex:1;min-width:240px"><select id="yoN" style="width:auto;flex:none">' + [5, 8, 10, 12].map(function (n) { return '<option' + (n === 8 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><button class="btn primary" id="yoDraft">✨ Draft words with AI <span style="font-weight:400">(small cost)</span></button></div>' +
      '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">' + (l.live ? '<button class="btn ' + (l.changed ? 'primary' : 'ghost') + '" id="yoPub"' + (ready ? '' : ' disabled') + '>📲 Update in the app</button><button class="btn ghost" id="yoUnpub">Take out of the app</button>' : '<button class="btn primary" id="yoPub"' + (ready ? '' : ' disabled') + '>📲 Put in the app</button>') +
        (ready ? '' : '<span class="muted" style="font-size:12.5px;align-self:center">Every word and its audio must be ✅ approved first (at least 3 words).</span>') + (l.live || l.items.length ? '' : '<button class="btn ghost" id="yoDelL" style="color:#B42318">🗑️ Delete lesson</button>') + '</div>';
    h += '</div><div class="card" style="position:sticky;top:0;z-index:5;padding:8px 10px"><div class="muted" style="font-size:12px;margin-bottom:4px">Tone marks — click a box, then tap a letter to add it:</div><div class="row" style="gap:4px;flex-wrap:wrap">' + TONES.map(function (t) { return '<button class="btn ghost sm" data-tone="' + t + '" style="min-width:38px;font-size:17px;padding:4px 8px">' + t + '</button>'; }).join('') + '</div></div>';
    h += (l.items || []).map(cardOf).join('') + '<div class="card"><button class="btn ghost" id="yoAdd">➕ Add a word by hand</button></div></div>';
    $('#view').innerHTML = h;
    bindLesson();
  }
  function cardOf(it, k) {
    var st = it.st === 'ok' ? '<span style="background:#E3F2EA;color:#05502E;border-radius:99px;padding:2px 9px;font-size:12.5px">✅ Approved' + (it.rvBy ? ' by ' + esc(who(it.rvBy)) + ' · ' + when(it.rvAt) : '') + '</span>'
      : it.st === 'no' ? '<span style="background:#FDECEA;color:#7A1A12;border-radius:99px;padding:2px 9px;font-size:12.5px">❌ Rejected' + (it.rvBy ? ' by ' + esc(who(it.rvBy)) : '') + (it.rvNote ? ': ' + esc(it.rvNote) : '') + '</span>'
      : '<span style="background:#FFF4DC;color:#7A4B00;border-radius:99px;padding:2px 9px;font-size:12.5px">🔎 To check' + (it.src === 'ai' ? ' · AI draft' : '') + '</span>';
    var f = function (key, lbl, big, ph) { return '<div style="flex:1;min-width:200px"><label style="font-size:12.5px">' + lbl + '</label><input data-f="' + key + '" value="' + esc(it[key]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (big ? ' style="font-size:20px;font-weight:700"' : '') + ' lang="' + (key === 'yo' || key === 'ex_yo' ? 'yo' : 'en') + '"></div>'; };
    var aud = it.audio ? '<button class="btn ghost sm" data-play="' + it.audio + '">▶️ Play</button><span class="muted" style="font-size:12.5px">' + (it.audHow === 'tts' ? '🔊 AI voice' : '🎙️ Recorded' + (it.recBy ? ' by ' + esc(who(it.recBy)) : '')) + '</span><label class="chk" style="margin:0"><input type="checkbox" data-audok' + (it.audOk ? ' checked' : '') + '> ✅ Audio sounds right</label>' : '<span class="muted" style="font-size:12.5px">No audio yet</span>';
    return '<div class="card yoi" data-i="' + it.id + '"><div class="row" style="gap:8px;align-items:center;margin-bottom:6px"><b style="flex:1">' + (k + 1) + '.</b>' + st + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' + f('yo', 'Yoruba (with tone marks)', true, 'e.g. Ẹ káàárọ̀') + f('en', 'English', false, 'e.g. Good morning (to an elder)') + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">' + f('ex_yo', 'Example sentence (Yoruba)') + f('ex_en', 'Example (English)') + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">' + f('note', 'Tip for learners (optional)') + f('pic', 'Picture idea') + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">' + (it.img ? '<img src="' + imgSrc(it.img) + '" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:8px">' : '') +
        '<button class="btn ghost sm" data-pp>📋 Copy picture prompt</button>' + (ADMIN ? '<label class="btn ghost sm" style="margin:0;cursor:pointer">📷 ' + (it.img ? 'Change' : 'Add') + ' picture<input type="file" accept="image/*" data-pic hidden></label>' : '') + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center;border-top:1px dashed #E5DFD0;padding-top:8px">' + aud +
        '<button class="btn ghost sm" data-rec>🎙️ ' + (it.audio ? 'Record again' : 'Record') + '</button>' + (ADMIN ? '<button class="btn ghost sm" data-tts title="Uses ElevenLabs credits">🔊 AI voice (~' + Math.max(1, (it.yo || '').length) + ' credits)</button>' : '') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn primary sm" data-ok>✅ Approve</button><button class="btn ghost sm" data-no>❌ Reject</button>' + (it.st !== 'draft' ? '<button class="btn link sm" data-undo>Undo</button>' : '') + (ADMIN ? '<span style="flex:1"></span><button class="btn ghost sm" data-del title="Delete">🗑️</button>' : '') + '</div>' +
      (it.edBy ? '<div class="muted" style="font-size:12px;margin-top:6px">✏️ Last edited by ' + esc(who(it.edBy)) + ' · ' + when(it.edAt) + '</div>' : '') + '</div>';
  }
  function bindLesson() {
    var l = CUR, upd = function (r) { setLesson(r.lesson); drawLesson(); }, err = function (e) { X.toast(e.message || 'Something went wrong — try again.'); };
    $('#yoBack').onclick = function () { CUR = null; view(); };
    if ($('#yoRen')) $('#yoRen').onclick = function () { var t = prompt('Lesson name:', l.title); if (t && t.trim()) X.api('yo-lesson-rename', { id: l.id, title: t }).then(upd).catch(err); };
    if ($('#yoDraft')) $('#yoDraft').onclick = function () { var b = this; b.disabled = true; b.textContent = '✨ Drafting…'; X.api('yo-draft', { id: l.id, topic: $('#yoTopic').value, n: +$('#yoN').value }).then(function (r) { upd(r); X.toast('✨ ' + r.added + ' words drafted — now they need checking by a native speaker'); }).catch(function (e) { err(e); b.disabled = false; b.textContent = '✨ Draft words with AI'; }); };
    if ($('#yoPub')) $('#yoPub').onclick = function () { X.api('yo-publish', { id: l.id }).then(function (r) { upd(r); X.toast('📲 In the app ✅'); }).catch(err); };
    if ($('#yoUnpub')) $('#yoUnpub').onclick = function () { if (confirm('Take this lesson out of the app?')) X.api('yo-unpublish', { id: l.id }).then(upd).catch(err); };
    if ($('#yoDelL')) $('#yoDelL').onclick = function () { if (confirm('Delete this empty lesson?')) X.api('yo-lesson-del', { id: l.id }).then(function () { CUR = null; view(); }).catch(err); };
    $('#yoAdd').onclick = function () { X.api('yo-item', { lesson: l.id, add: true }).then(function (r) { upd(r); var c = $$('.yoi'); if (c.length) c[c.length - 1].scrollIntoView({ block: 'center' }); }).catch(err); };
    $$('[data-tone]').forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); }; b.onclick = function () { var f = LASTF; if (!f || !document.body.contains(f)) return X.toast('Click in a box first'); var a = f.selectionStart, z = f.selectionEnd, t = b.dataset.tone; f.value = f.value.slice(0, a) + t + f.value.slice(z); f.focus(); f.selectionStart = f.selectionEnd = a + t.length; f.dispatchEvent(new Event('input')); }; });
    $$('.yoi').forEach(function (c) {
      var iid = c.dataset.i, it = l.items.filter(function (x) { return x.id === iid; })[0], tm = null;
      var save = function () { var f = {}; $$('[data-f]', c).forEach(function (x) { f[x.dataset.f] = x.value; }); X.api('yo-item', { lesson: l.id, item: iid, f: f }).then(function (r) { var was = it.st; setLesson(r.lesson); var now = r.lesson.items.filter(function (x) { return x.id === iid; })[0]; if (now && was !== now.st) drawLesson(); else { it = now || it; X.toast('💾 Saved'); } }).catch(err); };
      $$('[data-f]', c).forEach(function (x) { x.onfocus = function () { LASTF = x; }; x.oninput = function () { clearTimeout(tm); tm = setTimeout(save, 1200); }; x.onchange = function () { clearTimeout(tm); save(); }; });
      $('[data-ok]', c).onclick = function () { X.api('yo-review', { lesson: l.id, item: iid, st: 'ok' }).then(upd).catch(err); };
      $('[data-no]', c).onclick = function () { var n = prompt('What’s wrong? (helps whoever fixes it)', ''); if (n === null) return; X.api('yo-review', { lesson: l.id, item: iid, st: 'no', note: n }).then(upd).catch(err); };
      if ($('[data-undo]', c)) $('[data-undo]', c).onclick = function () { X.api('yo-review', { lesson: l.id, item: iid, st: 'draft' }).then(upd).catch(err); };
      if ($('[data-del]', c)) $('[data-del]', c).onclick = function () { if (confirm('Delete “' + (it.yo || 'this word') + '”?')) X.api('yo-item-del', { lesson: l.id, item: iid }).then(upd).catch(err); };
      if ($('[data-audok]', c)) $('[data-audok]', c).onchange = function () { X.api('yo-audio-ok', { lesson: l.id, item: iid, ok: this.checked }).then(upd).catch(err); };
      if ($('[data-play]', c)) $('[data-play]', c).onclick = function () { play(this.dataset.play, this); };
      $('[data-pp]', c).onclick = function () {
        var t = 'A simple, warm, photorealistic picture that clearly shows: ' + (it.pic || it.en) + '. For a beginner Yoruba lesson for Nigerian families living in the UK. Square format, bright and friendly, plain uncluttered background. ABSOLUTELY NO text, letters, numbers or words anywhere in the picture.';
        navigator.clipboard.writeText(t).then(function () { X.toast('📋 Copied — make it in ChatGPT or Gemini, then 📷 Add picture'); }, function () { prompt('Copy the prompt:', t); });
      };
      if ($('[data-pic]', c)) $('[data-pic]', c).onchange = function () { var file = this.files && this.files[0]; if (!file) return; shrink(file, 900).then(function (d) { return X.api('img', { dataUrl: d }); }).then(function (r) { return X.api('yo-item', { lesson: l.id, item: iid, f: { img: r.id } }); }).then(upd).catch(err); };
      if ($('[data-tts]', c)) $('[data-tts]', c).onclick = function () { var b = this; if (!it.yo) return X.toast('Write the Yoruba first'); if (!confirm('Make the audio for “' + it.yo + '” with ElevenLabs? Uses about ' + it.yo.length + ' credits. A native speaker still has to tick that it sounds right.')) return; b.disabled = true; b.textContent = '🔊 Making…'; X.api('yo-tts', { lesson: l.id, item: iid }).then(function (r) { upd(r); X.toast('🔊 Done — play it and tick if it sounds right'); }).catch(function (e) { err(e); b.disabled = false; b.textContent = '🔊 AI voice'; }); };
      $('[data-rec]', c).onclick = function () { record(this, function (du) { X.api('yo-record', { lesson: l.id, item: iid, dataUrl: du }).then(function (r) { upd(r); X.toast('🎙️ Saved — play it back, then tick ✅ Audio sounds right'); }).catch(err); }); };
    });
  }
  function play(id, btn) {
    var go = function (du) { try { var a = new Audio(du); a.play(); } catch (e) { X.toast('Couldn’t play it'); } };
    if (AUD[id]) return go(AUD[id]);
    var t = btn.textContent; btn.textContent = '⏳'; X.api('yo-audio', { id: id }).then(function (r) { AUD[id] = r.dataUrl; go(r.dataUrl); }).catch(function (e) { X.toast(e.message); }).then(function () { btn.textContent = t; });
  }
  // 🎙️ record up to 15 seconds from the microphone
  function record(btn, done) {
    if (REC) { REC.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return X.toast('Recording isn’t supported in this browser — try Chrome or Safari on your phone.');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0] || '';
      var mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined), parts = [], t0 = Date.now(), tick;
      REC = mr; btn.classList.add('primary'); btn.textContent = '⏹️ Stop (0s)'; tick = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); btn.textContent = '⏹️ Stop (' + s + 's)'; if (s >= 15) mr.stop(); }, 250);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      mr.onstop = function () {
        clearInterval(tick); REC = null; stream.getTracks().forEach(function (t) { t.stop(); }); btn.classList.remove('primary'); btn.textContent = '🎙️ Saving…';
        var blob = new Blob(parts, { type: (mr.mimeType || type || 'audio/webm').split(';')[0] }); if (blob.size < 800) { btn.textContent = '🎙️ Record'; return X.toast('That was too short — hold the button a little longer.'); }
        var fr = new FileReader(); fr.onload = function () { done(String(fr.result).replace(/^data:([^;,]+)(;[^,]*)?;base64,/, 'data:$1;base64,')); }; fr.readAsDataURL(blob);
      };
      mr.start();
    }).catch(function () { X.toast('Please allow the microphone to record.'); });
  }
  function shrink(file, max) { return new Promise(function (ok, bad) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.86)); }; im.onerror = function () { bad(new Error('Couldn’t open that picture')); }; im.src = u; }); }

  // ── 🔎 everything still to check ──
  function drawReview() {
    var rows = [];
    IX.units.forEach(function (u, ui) { u.lessons.forEach(function (l) { var w = l.n - l.ok, a = l.n - l.audOk; if (l.n && (w || a)) rows.push('<div class="row" style="gap:8px;padding:9px 0;border-top:1px solid #EEE9DD;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b>' + esc(l.title) + '</b> <span class="muted">· Unit ' + (ui + 1) + ' ' + esc(u.title) + '</span><br><span style="font-size:12.5px">' + (w ? '🔎 ' + w + ' word' + (w > 1 ? 's' : '') + ' to check' : '') + (w && a ? ' · ' : '') + (a ? '🔊 ' + a + ' audio to record or check' : '') + '</span></div><button class="btn primary sm" data-open="' + l.id + '">Check</button></div>'); }); });
    $('#view').innerHTML = '<div class="card" style="max-width:980px"><h3 style="margin:0 0 6px">🔎 To check</h3>' + (rows.join('') || '<div class="muted">Nothing waiting — everything is checked ✅</div>') + '</div>';
    $$('[data-open]').forEach(function (b) { b.onclick = function () { openLesson(b.dataset.open); }; });
  }
  // ── 💷 how many checks each reviewer did (to pay them) ──
  function drawPay(month) {
    var d = new Date(), months = []; for (var k = 0; k < 6; k++) { var x = new Date(d.getFullYear(), d.getMonth() - k, 1); months.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0')); }
    month = month || months[0];
    $('#view').innerHTML = '<div class="card" style="max-width:980px"><div class="row" style="gap:8px;align-items:center"><h3 style="margin:0;flex:1">💷 Reviewer summary</h3><select id="yoM">' + months.map(function (m) { return '<option' + (m === month ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div><div id="yoPay" class="muted" style="margin-top:8px">Loading…</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:10px">Counts each ✅ approval, ❌ rejection, 🎙️ recording and 🔊 audio check, by who did it. To add a reviewer: <b>👥 Team</b> → add their email and tick only <b>🗣️ Yoruba Lessons</b>.</div></div>';
    $('#yoM').onchange = function () { drawPay(this.value); };
    X.api('yo-summary', { month: month }).then(function (r) {
      $('#yoPay').classList.remove('muted');
      $('#yoPay').innerHTML = r.people.length ? '<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="text-align:left"><th>Reviewer</th><th>✅ Words approved</th><th>❌ Rejected</th><th>🎙️ Recorded</th><th>🔊 Audio checked</th></tr>' + r.people.map(function (p) { return '<tr style="border-top:1px solid #EEE9DD"><td style="padding:6px 0">' + esc(p.email) + '</td><td>' + p.words + '</td><td>' + p.rejected + '</td><td>' + p.recorded + '</td><td>' + p.audio + '</td></tr>'; }).join('') + '</table>' : 'No checks in ' + month + ' yet.';
    }).catch(function (e) { $('#yoPay').textContent = e.message; });
  }
  // ── ⚙️ the AI voice used for 🔊 ──
  function settings() {
    var s = X.sheet('<h3 style="margin:0 0 8px">⚙️ Yoruba Lessons settings</h3><label>AI voice for 🔊 (ElevenLabs, Eleven v3 — Yoruba)</label><select id="yoV"><option value="">Loading voices…</option></select>' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">A native speaker still has to tick ✅ Audio sounds right for every AI-made word. Recording real voices 🎙️ is free and usually better for core words.</div><div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="yoVOk">Save</button><button class="btn ghost" id="yoVX">Cancel</button></div>');
    Promise.all([X.api('qv-status').catch(function () { return {}; }), X.api('yo-settings').catch(function () { return {}; })]).then(function (r) {
      var vs = (r[0] && r[0].voices) || [], cur = r[1].voice || ''; $('#yoV', s).innerHTML = '<option value="">— choose —</option>' + vs.map(function (v) { return '<option value="' + v.id + '"' + (v.id === cur ? ' selected' : '') + '>' + esc(v.name) + (v.accent ? ' · ' + esc(v.accent) : '') + '</option>'; }).join('');
    });
    $('#yoVOk', s).onclick = function () { X.api('yo-settings-save', { voice: $('#yoV', s).value }).then(function () { s.remove(); X.toast('Saved'); }).catch(function (e) { X.toast(e.message); }); };
    $('#yoVX', s).onclick = function () { s.remove(); };
  }

  window.HQYor = { init: function (x) { X = x; }, view: view };
})();
