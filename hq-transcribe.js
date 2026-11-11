/*
 * Auntie Tobi HQ — 🎙️ Transcribe a video (admin only)
 *  Upload a saved Reel / video / voice note → pick how:
 *   🆓 Free — on this device: Whisper runs in the browser (nothing sent anywhere; first time downloads the tool)
 *   🎯 Accurate — AI: the sound is sent in 30-second pieces to an audio AI (GPT Audio Mini, ~1–2p a minute)
 *  Then ✨ Tidy (GPT-6 Luna), 📝 caption, 📱 app article, 📣 WhatsApp message, 📋 copy, 💾 save.
 * HQ calls HQTx.init({ api, sheet, toast, esc, S }) once, then HQTx.view().
 */
(function () {
  'use strict';
  var X = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return X.esc(s); }
  var TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
  var MODELS = { fast: ['onnx-community/whisper-base', 'Fast (about 80 MB the first time)'], better: ['onnx-community/whisper-small', 'Better (about 250 MB the first time)'] };
  var T = { file: null, audio: null, secs: 0, text: '', tidy: '', out: {}, busy: false, id: '' };
  var worker = null;

  function fmtSecs(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function pence(secs) { var p = Math.max(1, Math.round(secs / 60 * 1.5)); return '≈' + p + 'p'; }

  // video/audio file → 16 kHz mono samples
  async function decode(file) {
    var buf = await file.arrayBuffer();
    var Ctx = window.AudioContext || window.webkitAudioContext, ctx;
    try { ctx = new Ctx({ sampleRate: 16000 }); } catch (e) { ctx = new Ctx(); }
    var ab = await new Promise(function (ok, no) { var p = ctx.decodeAudioData(buf, ok, no); if (p && p.then) p.then(ok, no); });
    var len = ab.length, mono = new Float32Array(len);
    for (var c = 0; c < ab.numberOfChannels; c++) { var d = ab.getChannelData(c); for (var i = 0; i < len; i++) mono[i] += d[i] / ab.numberOfChannels; }
    var rate = ab.sampleRate; try { ctx.close(); } catch (e) {}
    if (rate === 16000) return mono;
    var ratio = rate / 16000, n = Math.floor(len / ratio), out = new Float32Array(n);   // simple resample
    for (var j = 0; j < n; j++) { var x = j * ratio, k = Math.floor(x), f = x - k; out[j] = (mono[k] || 0) * (1 - f) + (mono[k + 1] || 0) * f; }
    return out;
  }
  function wavB64(samples) {
    var n = samples.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); }
    var bytes = new Uint8Array(b), bin = ''; for (var k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return btoa(bin);
  }

  // 🆓 Whisper in the browser (a worker, so the page doesn't freeze)
  function freeRun(audio, model, lang, onProg) {
    return new Promise(function (ok, no) {
      if (!worker) {
        var code = "import { pipeline, env } from '" + TF + "';\n env.allowLocalModels = false; let asr = null, cur = '';\n" +
          "self.onmessage = async (e) => { const { audio, model, lang } = e.data; try {\n" +
          "  if (!asr || cur !== model) { asr = await pipeline('automatic-speech-recognition', model, { dtype: 'q8', progress_callback: (p) => { if (p.status === 'progress') self.postMessage({ type: 'load', file: p.file, pct: p.progress || 0 }); } }); cur = model; }\n" +
          "  self.postMessage({ type: 'run' });\n" +
          "  const r = await asr(audio, Object.assign({ chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' }, lang === 'en' ? { language: 'english' } : {}));\n" +
          "  self.postMessage({ type: 'done', text: (r && r.text) || '' });\n" +
          "} catch (err) { self.postMessage({ type: 'error', message: String(err && err.message || err) }); } };";
        try { worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })), { type: 'module' }); } catch (e) { console.warn('free transcribe worker:', e); worker = null; return no(new Error('The free listener can’t run in this browser — try 🎯 Accurate instead.')); }
      }
      worker.onmessage = function (e) { var m = e.data; if (m.type === 'load') onProg('Downloading the free tool (first time only)… ' + Math.round(m.pct) + '%'); else if (m.type === 'run') onProg('Listening on this device… (a 1-minute video takes about 20–60 seconds)'); else if (m.type === 'done') ok(m.text.trim()); else if (m.type === 'error') { console.warn('free transcribe:', m.message); no(new Error('The free listener couldn’t run on this device — try 🎯 Accurate instead.')); } };
      worker.onerror = function (e) { console.warn('free transcribe start:', e && e.message); no(new Error('The free listener couldn’t start on this device — try 🎯 Accurate instead.')); worker = null; };
      worker.postMessage({ audio: audio, model: model, lang: lang });
    });
  }
  // 🎯 audio AI, 30 seconds at a time
  async function aiRun(audio, lang, onProg) {
    var step = 16000 * 30, parts = [], n = Math.ceil(audio.length / step);
    for (var i = 0; i < n; i++) {
      onProg('Listening with AI… part ' + (i + 1) + ' of ' + n);
      var r = await X.api('tx-piece', { audio: wavB64(audio.subarray(i * step, Math.min(audio.length, (i + 1) * step))), prev: parts.join(' ').slice(-300), lang: lang });
      if (r.text) parts.push(r.text);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function outBox(k, label) {
    return T.out[k] ? '<div class="card" style="padding:12px 14px;margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center"><b>' + label + '</b><button class="btn ghost sm" data-cp="' + k + '">📋 Copy</button></div><textarea data-ot="' + k + '" rows="' + (k === 'article' ? 10 : 7) + '" style="margin-top:6px;font-size:14px">' + esc(T.out[k]) + '</textarea></div>' : '';
  }

  async function view() {
    $('#ttl').textContent = 'Transcribe a video'; $('#topRight').innerHTML = '';
    if (!X.S.txList) { try { X.S.txList = (await X.api('tx-list', {})).items; } catch (e) { X.S.txList = []; } }
    var eng = X.S.txEng || 'free', q = X.S.txQ || 'fast', lang = X.S.txLang || 'en';
    $('#view').innerHTML = '<div class="wrap"><p class="muted" style="margin:0 0 10px">Save the Reel to your phone or computer first (or screen-record it), then upload it here. Works with videos and voice notes.</p>' +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><label class="btn primary" style="margin:0">🎬 Choose a video<input type="file" id="txF" accept="video/*,audio/*" hidden></label><span id="txFn" class="muted" style="font-size:14px">' + (T.file ? '🎬 <b>' + esc(T.file.name) + '</b>' + (T.secs ? ' · ' + fmtSecs(T.secs) : '') : 'No video chosen yet') + '</span></div>' +
      '<div style="margin-top:12px"><div class="muted" style="font-size:12.5px;margin-bottom:6px">How should it listen?</div><div class="row" style="gap:10px;flex-wrap:wrap">' +
      '<label class="card" style="flex:1;min-width:220px;padding:12px;cursor:pointer;border:2px solid ' + (eng === 'free' ? '#057A44' : '#E7E1D3') + ';margin:0"><input type="radio" name="txE" value="free"' + (eng === 'free' ? ' checked' : '') + ' hidden><b>🆓 Free — on this device</b><div class="muted" style="font-size:12.5px;margin-top:2px">Runs in your browser; nothing is sent anywhere. Good with clear English; weaker with heavy Pidgin, Yoruba/Igbo words or loud music. Best on a laptop.</div>' +
      '<select id="txQ" style="margin-top:8px;width:auto"' + (eng === 'free' ? '' : ' disabled') + '>' + Object.keys(MODELS).map(function (k) { return '<option value="' + k + '"' + (q === k ? ' selected' : '') + '>' + MODELS[k][1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="card" style="flex:1;min-width:220px;padding:12px;cursor:pointer;border:2px solid ' + (eng === 'ai' ? '#057A44' : '#E7E1D3') + ';margin:0"><input type="radio" name="txE" value="ai"' + (eng === 'ai' ? ' checked' : '') + ' hidden><b>🎯 Accurate — AI</b><div class="muted" style="font-size:12.5px;margin-top:2px">Sends the sound to an audio AI. Better with accents and noise, and quick on a phone. About 1–2p a minute' + (T.secs ? ' — <b>' + pence(T.secs) + '</b> for this video' : '') + '.</div></label>' +
      '</div></div><div class="row" style="gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">Spoken in</span><select id="txLang" style="width:auto"><option value="en"' + (lang === 'en' ? ' selected' : '') + '>English (with Pidgin / Nigerian words)</option><option value="any"' + (lang === 'any' ? ' selected' : '') + '>Another language</option></select>' +
      '<button class="btn primary" id="txGo"' + (T.file && !T.busy ? '' : ' disabled') + '>🎙️ Transcribe</button></div><div id="txProg" class="muted" style="font-size:13.5px;margin-top:8px"></div></div>' +
      (T.text || T.busy ? '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>📝 Transcript</b><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ghost sm" data-cp="text">📋 Copy</button><button class="btn ghost sm" id="txSave">💾 Save</button></div></div><textarea id="txT" rows="9" style="margin-top:6px;font-size:14px" placeholder="The words will appear here…">' + esc(T.text) + '</textarea>' +
        '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" data-mk="tidy">✨ Tidy it</button><button class="btn ghost sm" data-mk="caption">📝 Instagram caption</button><button class="btn ghost sm" data-mk="article">📱 App article</button><button class="btn ghost sm" data-mk="whatsapp">📣 WhatsApp message</button></div><div class="muted" style="font-size:12px;margin-top:4px">These use GPT-6 Luna (less than 1p each) and only use what was said.</div>' +
        outBox('tidy', '✨ Tidied transcript') + outBox('caption', '📝 Instagram caption') + outBox('article', '📱 App article') + outBox('whatsapp', '📣 WhatsApp message') + '</div>' : '') +
      '<div class="card" style="padding:12px 16px"><b>💾 Saved transcripts</b>' + (X.S.txList.length ? X.S.txList.map(function (x) { return '<div class="row" style="justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #F0ECE2;margin-top:6px"><div style="min-width:0"><b style="font-size:14px">' + esc(x.name) + '</b><div class="muted" style="font-size:12px">' + esc(new Date(x.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ' · ' + (x.engine === 'ai' ? '🎯 AI' : '🆓 Free') + (x.secs ? ' · ' + fmtSecs(x.secs) : '') + ' · ' + esc((x.tidy || x.text).slice(0, 70)) + '…</div></div><div class="row" style="gap:6px;flex:none"><button class="btn ghost sm" data-txo="' + esc(x.id) + '">Open</button><button class="btn ghost sm" data-txd="' + esc(x.id) + '" style="color:#B42318">🗑</button></div></div>'; }).join('') : '<p class="muted" style="font-size:13px;margin:6px 0 0">Nothing saved yet.</p>') + '</div></div>';

    var keepT = function () { if ($('#txT')) T.text = $('#txT').value; $$('[data-ot]').forEach(function (t) { T.out[t.dataset.ot] = t.value; }); };
    $('#txF').onchange = async function () {
      var f = this.files && this.files[0]; this.value = ''; if (!f) return; keepT();
      T = { file: f, audio: null, secs: 0, text: '', tidy: '', out: {}, busy: false, id: '' }; view();
      $('#txProg').textContent = 'Reading the sound…';
      try { T.audio = await decode(f); T.secs = T.audio.length / 16000; view(); } catch (e) { T.file = null; view(); X.toast('Couldn’t read the sound in that file — try another video (MP4 works best)'); }
    };
    $$('input[name="txE"]').forEach(function (r) { r.onchange = function () { keepT(); X.S.txEng = r.value; view(); }; });
    $('#txQ').onchange = function () { X.S.txQ = this.value; };
    $('#txLang').onchange = function () { X.S.txLang = this.value; };
    $('#txGo').onclick = async function () {
      if (!T.audio) { X.toast('The video is still loading'); return; }
      if (eng === 'ai' && !confirm('Send the sound of this ' + fmtSecs(T.secs) + ' video to the audio AI? About ' + pence(T.secs) + '.')) return;
      T.busy = true; T.text = ''; T.out = {}; T.id = ''; view();
      var prog = function (m) { var el = $('#txProg'); if (el) el.textContent = m; };
      try { T.text = eng === 'ai' ? await aiRun(T.audio, X.S.txLang || 'en', prog) : await freeRun(T.audio, MODELS[X.S.txQ || 'fast'][0], X.S.txLang || 'en', prog); T.engine = eng; if (!T.text) X.toast('No speech found in this video'); }
      catch (e) { X.toast(e.message); }
      T.busy = false; view();
    };
    $$('[data-cp]').forEach(function (b) { b.onclick = function () { keepT(); var v = b.dataset.cp === 'text' ? T.text : T.out[b.dataset.cp]; try { navigator.clipboard.writeText(v || ''); X.toast('Copied'); } catch (e) {} }; });
    $$('[data-mk]').forEach(function (b) { b.onclick = async function () { keepT(); var k = b.dataset.mk; b.disabled = true; b.textContent = 'Writing…'; try { T.out[k] = (await X.api('tx-make', { kind: k, text: k === 'tidy' ? T.text : (T.out.tidy || T.text) })).text; } catch (e) { X.toast(e.message); } view(); }; });
    if ($('#txSave')) $('#txSave').onclick = async function () { keepT(); if (!T.text.trim()) { X.toast('Nothing to save yet'); return; } try { var r = await X.api('tx-save', { item: { id: T.id, name: T.file ? T.file.name : 'Video', engine: T.engine || eng, secs: T.secs, text: T.text, tidy: T.out.tidy || '' } }); T.id = r.id; X.S.txList = r.items; X.toast('💾 Saved'); view(); } catch (e) { X.toast(e.message); } };
    $$('[data-txo]').forEach(function (b) { b.onclick = function () { var x = X.S.txList.filter(function (y) { return y.id === b.dataset.txo; })[0]; if (!x) return; T = { file: { name: x.name }, audio: null, secs: x.secs, text: x.text, tidy: x.tidy, out: x.tidy ? { tidy: x.tidy } : {}, busy: false, id: x.id, engine: x.engine }; view(); window.scrollTo(0, 0); }; });
    $$('[data-txd]').forEach(function (b) { b.onclick = async function () { if (!confirm('Delete this saved transcript?')) return; try { X.S.txList = (await X.api('tx-delete', { id: b.dataset.txd })).items; view(); } catch (e) { X.toast(e.message); } }; });
  }
  // a still picture from the video (about 1 second in) → JPEG data URL, or '' if it can't be read
  function frame(file, max) {
    return new Promise(function (ok) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), done = false;
      var end = function (r) { if (done) return; done = true; URL.revokeObjectURL(url); ok(r || ''); };
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onloadedmetadata = function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { end(''); } };
      v.onseeked = function () { try { var r = Math.min(1, (max || 1400) / Math.max(v.videoWidth, v.videoHeight)); if (!v.videoWidth) return end(''); var c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * r); c.height = Math.round(v.videoHeight * r); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); end(c.toDataURL('image/jpeg', 0.85)); } catch (e) { end(''); } };
      v.onerror = function () { end(''); }; setTimeout(function () { end(''); }, 8000);
      v.src = url;
    });
  }
  // used by 💬 Comment Assistant: decode + listen with the chosen engine
  async function listen(file, eng, onProg, ask) {
    onProg('Reading the sound…');
    var audio = await decode(file), secs = audio.length / 16000;
    if (eng === 'ai' && ask && !ask(secs, pence(secs))) return null;
    var text = eng === 'ai' ? await aiRun(audio, X.S.txLang || 'en', onProg) : await freeRun(audio, MODELS[X.S.txQ || 'fast'][0], X.S.txLang || 'en', onProg);
    return { text: text, secs: secs };
  }
  window.HQTx = { init: function (o) { X = o; }, view: function () { view(); }, frame: frame, listen: listen, fmtSecs: fmtSecs, pence: pence };
})();
