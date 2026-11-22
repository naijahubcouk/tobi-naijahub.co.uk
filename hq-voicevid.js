/*
 * Auntie Tobi HQ — 🎙️ Voiceover Video.
 * Write (or ✨ have the AI write) a short script → each line becomes a scene → Tobi's ElevenLabs voice reads it, with word
 * timings so the captions light up as she speaks → give each scene a picture (image model), an AI clip (Kling), your own
 * photo/video or a colour → music that dips under the voice → preview → 1080×1920 MP4 made in the browser. Save and reopen.
 *
 * HQ calls HQVoice.init({ api, sheet, toast, esc }) once, then HQVoice.view() for the #vvid page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30, LEAD = 0.15, X = null;
  var CAPS = { yellow: '🟡 White + yellow word', white: '⚪ White + green word', box: '⬛ Dark box', green: '🟩 Auntie Tobi green' };
  var MUS = [['calm', '🌿 Calm (built-in)'], ['upbeat', '🎉 Upbeat (built-in)'], ['suspense', '⏳ Suspense (built-in)'], ['own', '🎵 My own music'], ['none', '🔇 No music']];
  var V = null, ST = null, VM = null, OWN = null, OWNNAME = '', IMG = {}, VID = {}, AU = {}, AC = null, PREFS = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function imgSrc(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function mm(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function prog(t) { var p = $('#vvProg'); if (p) p.textContent = t || ''; var m = $('#vvAudMsg'); if (m) { m.style.color = ''; m.textContent = t || ''; } }
  function b64ToBuf(d) { var b = atob(String(d).split(',')[1] || ''), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function state() { if (!V) V = { name: '', topic: '', secs: 35, voice: '', model: 'flash', speed: 1, scenes: [], cap: { on: true, style: 'yellow', y: 0.72, size: 76 }, music: 'calm', musicVol: 20, voiceVol: 100, kb: true, dim: 0.15, caption: '', savedId: '', savedName: '', out: null, audio: null }; return V; }
  var TLOOK = { outline: '⚪ White text, black outline', whitebox: '⬜ White box, black text', blackbox: '⬛ Black box, white text', yellow: '🟡 Yellow text, black outline', green: '🟩 Green box, white text' };
  var TFONT = { heavy: ['Heavy bold', function (z) { return '900 ' + z + 'px Montserrat, "Inter Tight", Arial, sans-serif'; }], serif: ['Elegant serif', function (z) { return '900 ' + z + 'px "Playfair Display", Georgia, serif'; }], script: ['Brush script', function (z) { return '400 ' + z + 'px "Kaushan Script", cursive'; }], sans: ['Plain', function (z) { return '700 ' + z + 'px Inter, Arial, sans-serif'; }] };
  var TANIM = { pop: 'Pop in', fade: 'Fade in', slide: 'Slide up', none: 'Just there' };
  function TS() { return { size: 92, y: 0.18, look: 'outline', font: 'heavy', anim: 'pop', caps: true }; }
  function sc0(t, want) { return { t: t || '', gap: 0.35, media: 'photo', color: '#0F1E36', want: want || '', title: '', ts: TS() }; }
  function voiceName() { var v = (ST && ST.voices || []).filter(function (x) { return x.id === V.voice; })[0]; return v ? v.name : ''; }

  // ───── voice lines (cached here and on the server) ─────
  function vkey(sc) { return [V.voice, V.model, V.speed, sc.t.replace(/\s+/g, ' ').trim()].join('|'); }
  function lineOf(sc) { return AU[vkey(sc)] || null; }
  async function voiceAll(onlyMissing) {
    if (!V.voice) throw new Error('Choose a voice first.');
    var todo = V.scenes.filter(function (s) { return s.t.trim() && !(onlyMissing && lineOf(s)); });
    for (var i = 0; i < todo.length; i++) {
      var sc = todo[i], k = vkey(sc); if (AU[k]) continue;
      prog('🎙️ Voice ' + (i + 1) + ' of ' + todo.length + '…');
      var r = await X.api('vv-speak', { text: sc.t, voice: V.voice, model: V.model, speed: V.speed });
      AU[k] = { buf: await ac().decodeAudioData(b64ToBuf(r.dataUrl)), words: r.words || [] };
    }
    prog('');
  }

  // ───── timing: each scene lasts as long as its line takes to say, plus a pause ─────
  function timeline() {
    if (V.audio) return audioTimeline();
    var t = 0, out = [];
    V.scenes.forEach(function (sc) {
      var L = lineOf(sc), words = sc.t.trim() ? sc.t.trim().split(/\s+/) : [], dur, wt;
      if (L) { dur = L.buf.duration; wt = L.words.length ? L.words : null; }
      else { dur = Math.max(1.4, words.length * 0.36); }
      if (!wt) { var per = dur / Math.max(1, words.length); wt = words.map(function (w, i) { return [w, i * per, (i + 1) * per]; }); }
      var d = LEAD + dur + sc.gap; out.push({ s: t, d: d, words: wt, L: L }); t += d;
    });
    return { parts: out, total: Math.max(0.5, t) };
  }
  function total() { return timeline().total; }
  // 🎧 own audio: scenes follow the real timings of the words; video time 0 = the trimmed start of the audio
  function audioTimeline() {
    var A = V.audio, s0 = A.trimS || 0, end = (A.trimE || A.dur) - s0, out = [];
    V.scenes.forEach(function (sc, i) {
      var a = Math.max(0, (sc.a0 || 0) - s0), nx = V.scenes[i + 1], b = nx ? Math.max(0, (nx.a0 || 0) - s0) : end;
      if (i === 0) a = 0; a = Math.min(a, end); b = Math.min(Math.max(b, a), end);
      var words = (sc.words || []).map(function (w) { return [w[0], w[1] - s0 - a - LEAD, w[2] - s0 - a - LEAD]; });
      out.push({ s: a, d: b - a, words: words, L: null });
    });
    return { parts: out, total: Math.max(0.5, end) };
  }
  // words for a scene after its text is edited: same count → keep each word's timing; otherwise spread evenly over the scene
  function retime(sc) {
    var ws = sc.t.trim() ? sc.t.trim().split(/\s+/) : [], old = sc.words || [];
    if (ws.length === old.length) { sc.words = ws.map(function (w, i) { return [w, old[i][1], old[i][2]]; }); return; }
    var a = old.length ? old[0][1] : sc.a0, b = old.length ? old[old.length - 1][2] : (sc.a1 || sc.a0 + 1), per = (b - a) / Math.max(1, ws.length);
    sc.words = ws.map(function (w, i) { return [w, a + i * per, a + (i + 1) * per]; });
  }
  function scenesFromWords(words) {
    var out = [], cur = null;
    words.forEach(function (w, i) {
      var prev = words[i - 1], gap = prev ? w[1] - prev[2] : 0;
      if (!cur || /[.!?]["”’)]*$/.test(prev ? prev[0] : '') || gap > 0.7 || cur.words.length >= 14) { cur = Object.assign(sc0(''), { a0: w[1], words: [] }); out.push(cur); }
      cur.words.push(w);
    });
    var res = []; out.forEach(function (c) { var len = c.words[c.words.length - 1][2] - c.words[0][1]; if (res.length && len < 1.2 && res[res.length - 1].words.length < 18) res[res.length - 1].words = res[res.length - 1].words.concat(c.words); else res.push(c); });
    res.forEach(function (c, i) { c.t = c.words.map(function (w) { return w[0]; }).join(' '); c.a1 = res[i + 1] ? res[i + 1].a0 : c.words[c.words.length - 1][2] + 0.5; });
    if (res.length) res[0].a0 = Math.min(res[0].a0, 0);
    return res;
  }

  // ───── 🎧 your own audio → words with timings ─────
  var WK = null, TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
  function wav16(samples) {
    var n = samples.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return b;
  }
  function abToB64(buf) { var u = new Uint8Array(buf), s = ''; for (var k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000)); return btoa(s); }
  async function to16k(buf) { var n = Math.ceil(buf.duration * 16000), o = new OfflineAudioContext(1, n, 16000), s = o.createBufferSource(); s.buffer = buf; s.connect(o.destination); s.start(); return (await o.startRendering()).getChannelData(0); }
  // cut into ~55-second pieces, each ending at the quietest moment near the boundary (so words aren't cut in half)
  function pieces(x) {
    var SR = 16000, out = [], at = 0;
    while (at < x.length) {
      var want = at + 55 * SR; if (want >= x.length) { out.push([at, x.length]); break; }
      var best = want, bestE = Infinity, win = 800;
      for (var c = want - 5 * SR; c < want; c += 400) { var e = 0; for (var k = c; k < c + win; k++) e += x[k] * x[k]; if (e < bestE) { bestE = e; best = c + win / 2; } }
      out.push([at, best]); at = best;
    }
    return out;
  }
  async function listenEleven(x, lang) {
    var ps = pieces(x), words = [];
    for (var i = 0; i < ps.length; i++) {
      prog('🎧 Writing down the words with ElevenLabs… part ' + (i + 1) + ' of ' + ps.length);
      var r = await X.api('vv-stt', { b64: abToB64(wav16(x.subarray(ps[i][0], ps[i][1]))), offset: ps[i][0] / 16000, lang: lang });
      words = words.concat(r.words || []);
    }
    return words;
  }
  function listenFree(x) {
    return new Promise(function (ok, no) {
      if (!WK) {
        var code = "import { pipeline, env } from '" + TF + "';\n env.allowLocalModels = false; let asr = null;\n" +
          "self.onmessage = async (e) => { try {\n" +
          "  if (!asr) asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', { dtype: 'q8', progress_callback: (p) => { if (p.status === 'progress') self.postMessage({ type: 'load', pct: p.progress || 0 }); } });\n" +
          "  self.postMessage({ type: 'run' });\n" +
          "  const r = await asr(e.data.audio, { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe', language: 'english', return_timestamps: true });\n" +
          "  self.postMessage({ type: 'done', chunks: (r && r.chunks) || [], text: (r && r.text) || '' });\n" +
          "} catch (err) { self.postMessage({ type: 'error', message: String(err && err.message || err) }); } };";
        try { WK = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })), { type: 'module' }); } catch (e) { WK = null; return no(new Error('The free listener can’t run in this browser — try ElevenLabs instead.')); }
      }
      WK.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'load') prog('🆓 Downloading the free listener (first time only)… ' + Math.round(m.pct) + '%');
        else if (m.type === 'run') prog('🆓 Listening on this computer… (a 1-minute clip takes about 20–60 seconds)');
        else if (m.type === 'error') no(new Error('The free listener stopped: ' + m.message));
        else if (m.type === 'done') {   // phrase timings → spread each phrase's words across its time
          var words = []; (m.chunks || []).forEach(function (c) { var ws = String(c.text || '').trim().split(/\s+/).filter(Boolean), a = (c.timestamp || [])[0] || 0, b = (c.timestamp || [])[1]; if (b == null) b = a + ws.length * 0.35; var per = (b - a) / Math.max(1, ws.length); ws.forEach(function (w, i) { words.push([w, a + i * per, a + (i + 1) * per]); }); });
          ok(words);
        }
      };
      WK.onerror = function () { WK = null; no(new Error('The free listener couldn’t start on this computer — try ElevenLabs instead.')); };
      WK.postMessage({ audio: x });
    });
  }
  // keep the audio file in HQ (in pieces) so the draft reopens with its sound
  async function keepAudio(file, x16) {
    var blob = file.size <= 50e6 ? file : new Blob([wav16(x16)], { type: 'audio/wav' }), PART = 1400000, n = Math.ceil(blob.size / PART);
    var r = await X.api('vv-aud-start', { parts: n, mime: blob.type || 'audio/mpeg', name: file.name });
    for (var i = 0; i < n; i++) {
      prog('💾 Keeping your audio in HQ… ' + Math.round(i / n * 100) + '%');
      var piece = await new Promise(function (ok, bad) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); }; fr.onerror = bad; fr.readAsDataURL(blob.slice(i * PART, (i + 1) * PART)); });
      await X.api('vv-aud-part', { id: r.id, idx: i, b64: piece });
    }
    return { id: r.id, parts: n };
  }
  var AUDBUF = {};
  async function audioBuf() {
    if (!V.audio) return null; if (AUDBUF[V.audio.id]) return AUDBUF[V.audio.id];
    prog('🎧 Loading your audio…'); var bufs = [];
    for (var i = 0; i < (V.audio.parts || 1); i++) { var r = await fetch('/.netlify/functions/studio-hq?vva=' + V.audio.id + '&part=' + i, { credentials: 'same-origin' }); if (!r.ok) throw new Error('Your audio didn’t load — please try again.'); bufs.push(await r.arrayBuffer()); }
    var all = await new Blob(bufs).arrayBuffer(); AUDBUF[V.audio.id] = await ac().decodeAudioData(all); prog('');
    return AUDBUF[V.audio.id];
  }
  // 📝 pasted words + what was heard → each pasted word gets a time (best match, gaps filled in between)
  function norm(w) { return String(w).toLowerCase().replace(/[^a-z0-9\u00C0-\u024F']/g, ''); }
  function alignText(mine, heard) {
    var n = mine.length, m = heard.length, A = mine.map(norm), B = heard.map(function (h) { return norm(h[0]); });
    if (!m) { return mine.map(function (w, i) { return [w, i * 0.4, i * 0.4 + 0.35]; }); }
    var D = [], P = [];
    for (var i = 0; i <= n; i++) { D.push(new Float32Array(m + 1)); P.push(new Uint8Array(m + 1)); }
    for (i = 1; i <= n; i++) { D[i][0] = i; P[i][0] = 1; } for (var j = 1; j <= m; j++) { D[0][j] = j; P[0][j] = 2; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      var sub = D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : (A[i - 1][0] && A[i - 1][0] === B[j - 1][0] ? 0.6 : 1)), up = D[i - 1][j] + 1, lf = D[i][j - 1] + 1;
      if (sub <= up && sub <= lf) { D[i][j] = sub; P[i][j] = 0; } else if (up <= lf) { D[i][j] = up; P[i][j] = 1; } else { D[i][j] = lf; P[i][j] = 2; }
    }
    var map = new Array(n).fill(-1); i = n; j = m;
    while (i > 0 || j > 0) { var d = P[i][j]; if (i > 0 && j > 0 && d === 0) { map[i - 1] = j - 1; i--; j--; } else if (i > 0 && (j === 0 || d === 1)) i--; else j--; }
    var out = mine.map(function (w, k) { return map[k] >= 0 ? [w, heard[map[k]][1], heard[map[k]][2]] : [w, null, null]; });
    for (var k = 0; k < n; k++) if (out[k][1] == null) {   // not heard clearly: share the time between its neighbours
      var a = k - 1; while (a >= 0 && out[a][1] == null) a--; var b2 = k + 1; while (b2 < n && out[b2][1] == null) b2++;
      var t0 = a >= 0 ? out[a][2] : 0, t1 = b2 < n ? out[b2][1] : t0 + (b2 - a) * 0.35, per = Math.max(0.05, (t1 - t0) / (b2 - a));
      for (var q = a + 1; q < b2; q++) out[q] = [out[q][0], t0 + (q - a - 1) * per, t0 + (q - a) * per];
      k = b2 - 1;
    }
    return out;
  }
  // your own lines as the scenes
  function scenesFromLines(lines, words) {
    var res = [], k = 0;
    lines.forEach(function (ln) { var n = ln.split(/\s+/).filter(Boolean).length; var ws = words.slice(k, k + n); k += n; if (!ws.length) return; res.push(Object.assign(sc0(ws.map(function (w) { return w[0]; }).join(' ')), { a0: ws[0][1], words: ws })); });
    res.forEach(function (c, i) { c.a1 = res[i + 1] ? res[i + 1].a0 : c.words[c.words.length - 1][2] + 0.5; });
    if (res.length) res[0].a0 = Math.min(res[0].a0, 0);
    return res;
  }
  async function fromAudio(file, engine, lang, pasted) {
    if (file.size > 400e6) throw new Error('That file is too big — please use one under 400 MB.');
    prog('🎧 Reading the sound…');
    var buf; try { var raw = await file.arrayBuffer(); buf = await Promise.race([ac().decodeAudioData(raw), new Promise(function (ok, no) { setTimeout(function () { no(new Error('slow')); }, 90000); })]); } catch (e) { throw new Error('Couldn’t read the sound in that file — try an MP3, M4A or WAV.'); }
    if (buf.duration > 305) throw new Error('That audio is ' + mm(buf.duration) + ' long — please use up to 5 minutes (trim it first).');
    if (buf.duration < 1) throw new Error('That audio is too short.');
    var x = await to16k(buf), words, kept = null;
    pasted = String(pasted || '').replace(/\r/g, '').trim();
    var mine = pasted ? pasted.split(/\s+/).filter(Boolean) : null;
    if (mine && engine !== 'free') {   // 🎯 ElevenLabs hears the timing of every word (a minute at a time), then your words are lined up with it
      var heard = await listenEleven(x, lang); prog('📝 Lining your words up with the audio…');
      words = alignText(mine, heard);
    } else if (mine) { words = alignText(mine, await listenFree(x)); }   // 🆓 listen for free, then line your words up with what was heard
    else words = engine === 'free' ? await listenFree(x) : await listenEleven(x, lang);
    if (!words.length) throw new Error('No speech found in that audio.');
    if (!kept) kept = await keepAudio(file, x);
    AUDBUF[kept.id] = buf;
    V.audio = { id: kept.id, parts: kept.parts, name: file.name, dur: buf.duration, trimS: 0, trimE: buf.duration, vol: 100 };
    var lines = pasted ? pasted.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean) : [];
    V.scenes = lines.length >= 2 ? scenesFromLines(lines, words) : scenesFromWords(words); V.music = 'none'; prog('');
  }
  async function suggestPictures() {
    var r = await X.api('vv-wants', { lines: V.scenes.map(function (s) { return s.t; }) });
    (r.wants || []).forEach(function (w, i) { if (V.scenes[i] && w) V.scenes[i].want = w; });
  }


  // ───── media ─────
  function srcOf(sc) { return sc._vid || sc._clipUrl || (sc.img ? imgSrc(sc.img) : ''); }
  function isVideo(sc) { return !!(sc._vid || sc._clipUrl); }
  function loadImg(src) { if (IMG[src]) return IMG[src]; IMG[src] = new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { delete IMG[src]; bad(new Error('A picture didn’t load.')); }; im.src = src; }); return IMG[src]; }
  function loadVid(src) { if (VID[src]) return VID[src]; VID[src] = new Promise(function (ok, bad) { var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.onloadeddata = function () { ok(v); }; v.onerror = function () { delete VID[src]; bad(new Error('A video didn’t load.')); }; v.src = src; v.load(); }); return VID[src]; }
  function clipLocal(sc) { if (sc._clipUrl || !sc.clip) return Promise.resolve(); return fetch(sc.clip).then(function (r) { if (!r.ok) throw new Error('An AI clip has expired — make it again.'); return r.blob(); }).then(function (b) { sc._clipUrl = URL.createObjectURL(b); }); }
  async function loadAll() {
    var M = [];
    for (var i = 0; i < V.scenes.length; i++) {
      var sc = V.scenes[i]; M[i] = null; if (sc.media === 'color') continue;
      try { if (sc.clip && !sc._clipUrl) await clipLocal(sc); if (isVideo(sc)) M[i] = { v: await loadVid(srcOf(sc)) }; else if (srcOf(sc)) M[i] = { im: await loadImg(srcOf(sc)) }; } catch (e) { X.toast(e.message); }
    }
    try { await Promise.all(['900 60px Montserrat', '800 60px Poppins'].map(function (f) { return document.fonts.load(f); })); } catch (e) {}
    return M;
  }

  // ───── drawing ─────
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function cover(cx, el, w0, h0, z) { var s = Math.max(W / w0, H / h0) * z, w = w0 * s, h = h0 * s; cx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h); }
  function rr(cx, x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function wrap(cx, words, maxW) { var lines = [[]], w = 0, sp = cx.measureText(' ').width; words.forEach(function (wd) { var ww = cx.measureText(wd).width; if (w + ww > maxW && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(wd); w += ww + sp; }); return lines; }
  function bgDraw(cx, sc, m, lt, d, live, i) {
    if (sc.media === 'color' || !m) {
      if (sc.media === 'color') { cx.fillStyle = sc.color || '#0F1E36'; cx.fillRect(0, 0, W, H); return; }
      var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2B3445'); g.addColorStop(1, '#11161F'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      if (live) { cx.save(); cx.fillStyle = 'rgba(255,255,255,.35)'; cx.font = '600 44px Inter, Arial'; cx.textAlign = 'center'; cx.fillText('📷 Add a background', W / 2, H * 0.12); cx.restore(); }
    } else if (m.v && m.v.videoWidth) cover(cx, m.v, m.v.videoWidth, m.v.videoHeight, 1);
    else if (m.im) { var f = Math.min(1, lt / Math.max(1, d)); cover(cx, m.im, m.im.naturalWidth, m.im.naturalHeight, V.kb ? (i % 2 ? 1.12 - 0.1 * f : 1.02 + 0.1 * f) : 1); }
    if (V.dim && sc.media !== 'color') { cx.fillStyle = 'rgba(0,0,0,' + V.dim + ')'; cx.fillRect(0, 0, W, H); }
  }
  function outlined(cx, t, x, y, lw) { cx.lineJoin = 'round'; cx.lineWidth = lw; cx.strokeStyle = 'rgba(0,0,0,0.85)'; cx.strokeText(t, x, y); cx.fillText(t, x, y); }
  // the big title: size, position, look (incl. white box + black text), font and how it appears — set per scene
  function title(cx, sc, lt) {
    var t = (sc.title || '').trim(); if (!t) return; var ts = Object.assign(TS(), sc.ts || {}), z = ts.size, F = (TFONT[ts.font] || TFONT.heavy)[1];
    var a = 1, s = 1, dy = 0;
    if (ts.anim === 'pop') { a = ease(lt / 0.25); s = 0.7 + 0.3 * ease(lt / 0.35); } else if (ts.anim === 'fade') a = ease(lt / 0.45); else if (ts.anim === 'slide') { a = ease(lt / 0.3); dy = (1 - ease(lt / 0.4)) * 80; }
    cx.save(); cx.globalAlpha = a; cx.font = F(z); cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    var box = ts.look === 'whitebox' || ts.look === 'blackbox' || ts.look === 'green', maxW = box ? 860 : 950;
    var lines = wrap(cx, (ts.caps ? t.toUpperCase() : t).split(/\s+/), maxW), lh = z * 1.12, yc = ts.y * H + dy, top = yc - lines.length * lh / 2;
    cx.translate(W / 2, yc); cx.scale(s, s); cx.translate(-W / 2, -yc);
    if (box) {
      var bw = Math.max.apply(null, lines.map(function (ln) { return cx.measureText(ln.join(' ')).width; })) + z * 0.9, bh = lines.length * lh + z * 0.55;
      cx.save(); cx.shadowColor = 'rgba(0,0,0,0.35)'; cx.shadowBlur = 24; cx.shadowOffsetY = 6; rr(cx, W / 2 - bw / 2, top - z * 0.28, bw, bh, Math.min(36, z * 0.35));
      cx.fillStyle = ts.look === 'whitebox' ? '#FFFFFF' : ts.look === 'blackbox' ? 'rgba(12,14,18,0.92)' : 'rgba(5,122,68,0.96)'; cx.fill(); cx.restore();
      cx.fillStyle = ts.look === 'whitebox' ? '#111111' : '#FFFFFF';
      lines.forEach(function (ln, i) { cx.fillText(ln.join(' '), W / 2, top + i * lh + z * 0.92); });
    } else {
      cx.fillStyle = ts.look === 'yellow' ? '#FFD23F' : '#FFFFFF';
      lines.forEach(function (ln, i) { outlined(cx, ln.join(' '), W / 2, top + i * lh + z * 0.92, Math.max(6, z * 0.15)); });
    }
    cx.restore();
  }
  // captions: up to ~4 words at a time, the word being said lights up
  function chunks(words) { var out = [], cur = [], len = 0; words.forEach(function (w, i) { if (cur.length && (cur.length >= 4 || len + w[0].length > 22)) { out.push(cur); cur = []; len = 0; } cur.push(i); len += w[0].length + 1; if (/[.!?,:;]$/.test(w[0]) && cur.length >= 2) { out.push(cur); cur = []; len = 0; } }); if (cur.length) { if (cur.length === 1 && out.length && out[out.length - 1].length <= 4) out[out.length - 1] = out[out.length - 1].concat(cur); else out.push(cur); } return out; }
  function captions(cx, part, lt) {
    if (!V.cap.on || !part.words.length) return;
    var t = lt - LEAD, ws = part.words, cur = -1; for (var i = 0; i < ws.length; i++) if (t >= ws[i][1] - 0.02) cur = i;
    if (cur < 0) { if (t < -0.05) return; cur = 0; }
    var ch = chunks(ws), grp = ch.filter(function (g) { return g.indexOf(cur) >= 0; })[0]; if (!grp) return;
    if (t > ws[ws.length - 1][2] + 0.6) return;
    var S = V.cap.size, st = V.cap.style; cx.save(); cx.font = '900 ' + S + 'px Montserrat, "Inter Tight", Arial, sans-serif'; cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
    var words = grp.map(function (k) { return ws[k][0]; }), lines = wrap(cx, words, 900), lh = S * 1.2, y0 = V.cap.y * H - (lines.length - 1) * lh / 2 + S * 0.35, sp = cx.measureText(' ').width, k = 0;
    if (st === 'box' || st === 'green') {
      var maxw = Math.max.apply(null, lines.map(function (ln) { return cx.measureText(ln.join(' ')).width; }));
      rr(cx, W / 2 - maxw / 2 - 36, y0 - S * 1.05, maxw + 72, lines.length * lh + S * 0.55, 26); cx.fillStyle = st === 'box' ? 'rgba(10,12,16,0.82)' : 'rgba(5,122,68,0.95)'; cx.fill();
    }
    lines.forEach(function (ln, li) {
      var x = W / 2 - cx.measureText(ln.join(' ')).width / 2, y = y0 + li * lh;
      ln.forEach(function (w) {
        var idx = grp[k++], on = idx === cur, past = idx < cur, ww = cx.measureText(w).width;
        if (on && st === 'box') { rr(cx, x - 10, y - S * 0.86, ww + 20, S * 1.08, 12); cx.fillStyle = '#FFD23F'; cx.fill(); }
        cx.fillStyle = st === 'yellow' ? (on ? '#FFD23F' : '#FFFFFF') : st === 'white' ? (on ? '#3DDC6E' : '#FFFFFF') : st === 'box' ? (on ? '#0F1E36' : '#FFFFFF') : (on ? '#FFD23F' : '#FFFFFF');
        if (st === 'yellow' || st === 'white') { cx.save(); if (on) { cx.translate(x + ww / 2, y - S * 0.3); cx.scale(1.08, 1.08); cx.translate(-(x + ww / 2), -(y - S * 0.3)); } outlined(cx, w, x, y, S * 0.16); cx.restore(); }
        else cx.fillText(w, x, y);
        if (!on && !past && st !== 'box' && st !== 'green') {} // future words stay white
        x += ww + sp;
      });
    });
    cx.restore();
  }
  function at(T, TL) { var P = TL.parts; for (var i = 0; i < P.length; i++) if (T < P[i].s + P[i].d || i === P.length - 1) return { i: i, p: P[i], lt: T - P[i].s }; return { i: 0, p: P[0], lt: 0 }; }
  function frame(cx, T, M, TL, live) {
    if (!V.scenes.length) { cx.fillStyle = '#0F1E36'; cx.fillRect(0, 0, W, H); return; }
    var a = at(T, TL), sc = V.scenes[a.i];
    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    bgDraw(cx, sc, M[a.i], a.lt, a.p.d, live, a.i);
    if (a.i > 0 && a.lt < 0.25) { cx.save(); cx.globalAlpha = 1 - a.lt / 0.25; var pv = V.scenes[a.i - 1]; bgDraw(cx, pv, M[a.i - 1], TL.parts[a.i - 1].d, TL.parts[a.i - 1].d, live, a.i - 1); cx.restore(); }
    title(cx, sc, a.lt); captions(cx, a.p, a.lt);
  }

  // ───── page ─────
  function openById(id) {
    return X.api('vv-load', { id: id }).then(function (r) { V = null; state(); Object.assign(V, r.data || {}); V.scenes = (V.scenes || []).map(function (x) { var o = Object.assign(sc0(), x); o.ts = Object.assign(TS(), x.ts || {}); return o; }); V.savedId = r.id; V.savedName = r.name; V.out = null; V._last = JSON.stringify(snap()); if (F()) F().lastDraft('vv', r.id); view(); return r; });
  }
  function F() { return window.HQFinished; }
  function view() {
    var want = F() ? F().takeOpen('vv') : ''; if (!want && !V && F()) want = F().lastDraft('vv');
    if (want && (!V || V.savedId !== want)) { V = V || null; openById(want).then(function (r) { X.toast('📂 Opened “' + r.name + '”'); }).catch(function () { if (F()) F().lastDraft('vv', ''); V = null; view(); }); if (!V) { $('#ttl').textContent = 'Voiceover Video'; $('#view').innerHTML = '<div class="card"><div class="muted">Opening your video…</div></div>'; } return; }
    state();
    $('#ttl').textContent = V.savedName ? 'Voiceover Video · ' + V.savedName : 'Voiceover Video';
    $('#topRight').innerHTML = '<button class="btn ghost" id="vvNewB">➕ New</button> <button class="btn ghost" id="vvMine">📂 My videos</button> <button class="btn primary" id="vvSave">💾 Save</button>';
    $('#vvMine').onclick = mine; $('#vvSave').onclick = saveSheet;
    $('#vvNewB').onclick = function () { if (!confirm('Start a new video? Anything you haven’t saved will be cleared.')) return; var keep = { voice: V.voice, model: V.model }; V = null; state(); V.voice = keep.voice; V.model = keep.model; if (F()) F().lastDraft('vv', ''); view(); };
    $('#view').innerHTML = '<div class="card" style="max-width:1000px"><div class="muted">Loading…</div></div>';
    var need = [];
    if (!ST) need.push(X.api('qv-status').then(function (r) { ST = r; }).catch(function () { ST = { ready: false }; }));
    if (window.HQChars) need.push(window.HQChars.load().catch(function () {}));
    if (!PREFS) need.push(X.api('vv-list').then(function (r) { PREFS = r.prefs || {}; }).catch(function () { PREFS = {}; }));
    Promise.all(need).then(function () { pickVoice(); draw(); });
  }
  // default voice: the one you chose last, else "Tobi", else the first Nigerian voice
  function pickVoice() {
    if (V.voice || !ST || !ST.voices || !ST.voices.length) return;
    var vs = ST.voices, has = function (id) { return vs.some(function (v) { return v.id === id; }); };
    var tobi = vs.filter(function (v) { return /\btobi\b/i.test(v.name); })[0], ng = vs.filter(function (v) { return /nigeria/i.test(v.accent); })[0];
    V.voice = PREFS && PREFS.voice && has(PREFS.voice) ? PREFS.voice : tobi ? tobi.id : ng ? ng.id : vs[0].id;
  }
  function draw() {
    var cr = ST && ST.credits, chars = V.scenes.reduce(function (a, s) { return a + s.t.length; }, 0), TL = timeline();
    var missing = V.scenes.filter(function (s) { return s.t.trim() && !lineOf(s); }).length;
    $('#view').innerHTML = '<div id="vvRoot" style="max-width:1060px"><style>#vvRoot .card{margin-bottom:12px}#vvRoot label{display:block}#vvRoot input[type=checkbox]{width:auto;margin:0}.vv-sc{display:flex;gap:12px;align-items:flex-start;border-top:1px solid #EEE9DD;padding:12px 0}.vv-sc:first-child{border-top:0}.vv-th{flex:none;width:108px;height:192px;border-radius:10px;background:#111}.vv-sc textarea{min-height:44px}.vv-pill{display:inline-block;font-size:12px;border-radius:999px;padding:1px 8px;background:#F1EEE6;color:#6B7280}.vv-pill.ok{background:#E7F6EE;color:#057A44}.vv-th{cursor:zoom-in}.vv-ts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;padding:6px 8px;background:#FAFAF7;border:1px solid #EEE9DD;border-radius:10px;font-size:12.5px;color:#6B7280}.vv-ts select,.vv-ts input{width:auto;padding:3px 6px;font-size:12.5px}.vv-ts label{display:flex!important;gap:4px;align-items:center;margin:0}.vv-ts input[type=range]{width:90px}.vv-ts input[type=checkbox]{width:auto}</style>' +
      // 1 · script
      '<div class="card"><b>1 · Script</b>' +
      (V.scenes.length ? '<div class="muted" style="font-size:13px;margin-top:4px">' + (V.audio ? 'Each scene follows your audio. Fix any misheard word in the scenes below — the timing stays.' : 'Each line is a scene. Edit the words in the scenes below — only the lines you change are voiced again.') + '</div>' :
        '<div class="muted" style="font-size:13px;margin:4px 0 8px">Paste or type your script — each sentence (or each line) becomes a scene. Or let the AI write a first draft.</div>' +
        '<textarea id="vvScript" rows="7" placeholder="e.g. Moving to the UK? Here are three things nobody tells you about council tax…"></textarea>' +
        '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primary" id="vvSplit">➡️ Use this script</button></div>' +
        '<div style="margin-top:14px;padding:10px;border:1px solid #EEE9DD;border-radius:10px"><b>✨ Write it for me</b><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><input id="vvTopic" placeholder="Topic, e.g. 3 things to know before renting your first flat in the UK" value="' + esc(V.topic) + '" style="flex:1;min-width:260px">' +
        '<select id="vvSecs">' + [20, 30, 45, 60].map(function (n) { return '<option value="' + n + '"' + (n === V.secs ? ' selected' : '') + '>about ' + n + ' seconds</option>'; }).join('') + '</select><button class="btn ghost" id="vvWrite">✨ Write it</button></div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:4px">Anything that needs checking (prices, dates, rules) comes back in [square brackets] for you to fill in.</div></div>' +
        '<div style="margin-top:14px;padding:10px;border:1px solid #EEE9DD;border-radius:10px"><b>🎧 Use my own audio</b><div class="muted" style="font-size:12.5px;margin-top:2px">A voice note, recording, podcast clip or interview (MP3, M4A, WAV or a video) up to 5 minutes. HQ writes down every word with its timing, splits it into scenes and puts the captions on.</div>' +
        '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><label class="btn ghost" style="margin:0;cursor:pointer">🎧 Choose audio<input type="file" accept="audio/*,video/*,.mp3,.m4a,.wav,.ogg,.opus,.aac" id="vvAud" hidden></label><span class="muted" id="vvAudN" style="font-size:13px"></span>' +
        '<select id="vvEng"><option value="eleven">🎯 ElevenLabs (most accurate)</option><option value="free">🆓 Free, on this computer (slower)</option></select><select id="vvLang"><option value="en">English, Pidgin and Nigerian words</option><option value="auto">Any language</option></select>' +
        '</div>' +
        '<label style="margin-top:10px">📝 Paste what’s said <span class="muted" style="font-weight:400">(optional — your exact words are used; HQ only works out the timing. Put each sentence on its own line to use your lines as the scenes.)</span></label><textarea id="vvPaste" rows="4" placeholder="e.g. Moving to the UK this year?&#10;Here are three things Auntie Tobi wants you to know…"></textarea><div class="row" style="gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap"><button class="btn primary" id="vvListen" disabled>🎧 Write down the words</button><span id="vvAudMsg" class="muted" style="font-size:13px"></span></div></div>') +
      '<div class="muted" id="vvProg" style="margin-top:8px"></div></div>' +
      (V.scenes.length ? (
        // 2 · voice (or your own audio)
        (V.audio ? '<div class="card"><b>2 · Your audio</b><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px;align-items:flex-end"><div style="flex:1;min-width:200px">🎧 <b>' + esc(V.audio.name) + '</b> <span class="muted">· ' + mm(V.audio.dur) + '</span></div>' +
          '<label style="margin:0">Start at (seconds)<input type="number" step="0.1" min="0" max="' + V.audio.dur.toFixed(1) + '" value="' + (+V.audio.trimS).toFixed(1) + '" id="vvTrS" style="width:100px"></label><label style="margin:0">End at (seconds)<input type="number" step="0.1" min="0" max="' + V.audio.dur.toFixed(1) + '" value="' + (+V.audio.trimE).toFixed(1) + '" id="vvTrE" style="width:100px"></label>' +
          '<label style="margin:0;min-width:180px">🔊 Audio volume <b id="vvAVv">' + V.audio.vol + '%</b><input type="range" id="vvAVol" min="0" max="150" step="5" value="' + V.audio.vol + '" style="width:100%"></label></div>' +
          '<div class="muted" style="font-size:12.5px;margin-top:6px">The video runs from ' + mm(V.audio.trimS) + ' to ' + mm(V.audio.trimE) + ' of your audio (' + (V.audio.trimE - V.audio.trimS).toFixed(1) + ' seconds). Scenes outside it are left out.</div></div>' :
        '<div class="card"><b>2 · Voice</b>' + (ST && ST.ready ?
          '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center"><select id="vvVoice" style="flex:1;min-width:240px">' + (ST.voices || []).map(function (x) { return '<option value="' + x.id + '"' + (x.id === V.voice ? ' selected' : '') + '>' + esc(x.name) + (x.accent ? ' · ' + esc(x.accent) : '') + (x.gender ? ' · ' + esc(x.gender) : '') + '</option>'; }).join('') + '</select>' +
          '<button class="btn ghost sm" id="vvHear">▶️ Hear it</button><button class="btn ghost sm" id="vvDef" title="Use this voice first every time">⭐ Make default</button>' +
          '<select id="vvModel"><option value="flash"' + (V.model === 'flash' ? ' selected' : '') + '>Flash (fewer credits)</option><option value="natural"' + (V.model === 'natural' ? ' selected' : '') + '>Natural (best quality)</option></select>' +
          '<select id="vvSpeed">' + [[0.9, 'Slower'], [1, 'Normal speed'], [1.1, 'A bit faster']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === V.speed ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
          '<div class="muted" style="font-size:12.5px;margin-top:6px">' + (PREFS && PREFS.voice === V.voice ? '⭐ Your default voice. ' : '') + 'This script: about <b>' + chars.toLocaleString() + '</b> characters' + (V.model === 'flash' ? ' (Flash uses about half a credit per character)' : '') + '. Lines already made are free.' + (cr ? ' You have <b>' + cr.left.toLocaleString() + '</b> credits left this month.' : '') + '</div>' +
          '<div class="row" style="gap:8px;margin-top:10px;align-items:center"><button class="btn primary" id="vvVo">🎙️ ' + (missing ? 'Make the voice (' + missing + ' line' + (missing === 1 ? '' : 's') + ')' : 'Voice ready ✅') + '</button><label style="margin:0;min-width:200px">🎙️ Voice volume <b id="vvVoV">' + V.voiceVol + '%</b><input type="range" id="vvVoVol" min="0" max="100" step="5" value="' + V.voiceVol + '" style="width:100%"></label></div>'
          : '<div style="margin-top:6px">🎙️ <b>The AI voice isn’t set up yet.</b> <span class="muted">Add your ElevenLabs key in Netlify (see ⚙️ Voice in 🎬 Quiz videos). You can still make the video with captions.</span></div>') + '</div>') +
        // 3 · scenes
        '<div class="card"><b>3 · Scenes · ' + V.scenes.length + ' · ' + TL.total.toFixed(1) + ' seconds</b><div style="margin-top:6px">' + V.scenes.map(function (sc, i) { return sceneHtml(sc, i, TL.parts[i]); }).join('') + '</div>' +
        '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost" id="vvAdd">➕ Add a scene</button><button class="btn ghost" id="vvWants">✨ Suggest pictures</button><button class="btn ghost" id="vvAllPics">✨ Make all missing pictures</button>' +
        '<label style="display:flex;gap:6px;align-items:center;margin:0 0 0 auto"><input type="checkbox" id="vvKb"' + (V.kb ? ' checked' : '') + '> Slow zoom on pictures</label><label style="margin:0">Darken <b id="vvDimV">' + Math.round(V.dim * 100) + '%</b><input type="range" id="vvDim" min="0" max="50" step="5" value="' + Math.round(V.dim * 100) + '"></label></div></div>' +
        // 4 · captions
        '<div class="card"><b>4 · Captions</b><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px;align-items:center"><label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" id="vvCapOn"' + (V.cap.on ? ' checked' : '') + '> Show captions (words light up as they’re said)</label>' +
        '<select id="vvCapSt">' + Object.keys(CAPS).map(function (k) { return '<option value="' + k + '"' + (k === V.cap.style ? ' selected' : '') + '>' + CAPS[k] + '</option>'; }).join('') + '</select>' +
        '<label style="margin:0">Up / down <input type="range" id="vvCapY" min="15" max="90" value="' + Math.round(V.cap.y * 100) + '"></label><label style="margin:0">Size <input type="range" id="vvCapS" min="50" max="110" value="' + V.cap.size + '"></label></div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:4px">Most people watch Reels with the sound off, so captions are on by default.</div></div>' +
        // 5 · music + make
        '<div class="card"><b>5 · Music</b><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center"><select id="vvMus" style="flex:1;min-width:200px">' + MUS.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === V.music ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select>' +
        '<label class="btn ghost sm" style="margin:0;cursor:pointer">🎵 Upload my music<input type="file" accept="audio/*,.mp3,.m4a,.wav" id="vvMusUp" hidden></label><label style="margin:0;min-width:200px">🎵 Music volume <b id="vvMusV">' + V.musicVol + '%</b><input type="range" id="vvMusVol" min="0" max="100" step="5" value="' + V.musicVol + '" style="width:100%"></label></div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:4px">' + (V.music === 'own' ? (OWN ? '🎵 Using ' + esc(OWNNAME) + '. ' : '⚠️ Upload your music file. ') + 'Only use music you have the right to use. ' : '') + 'The music gets quieter while Tobi speaks.</div></div>' +
        '<div class="card"><b>6 · Preview and make the video</b><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost" id="vvPrev">👀 Watch preview</button><button class="btn primary" id="vvGo">🎬 Make the video</button></div><div id="vvOut" style="margin-top:10px"></div>' +
        '<label style="margin-top:8px">Caption for the post</label><textarea id="vvCap" rows="4">' + esc(V.caption) + '</textarea></div>'
      ) : '') + '</div>';
    bind(); if (V.scenes.length) thumbs(); if (V.out) showOut();
  }
  function sceneHtml(sc, i, p) {
    var media = sc.media === 'color' ? '🎨 Colour' : isVideo(sc) ? (sc._vid ? '🎬 ' + esc(sc._vname || 'Your video') : '🎥 AI clip') : sc.img ? '🖼️ Picture' : sc.clip ? '🎥 AI clip' : '⚠️ No background yet';
    return '<div class="vv-sc"><canvas class="vv-th" width="216" height="384" data-th="' + i + '"></canvas><div style="flex:1;min-width:0">' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b>Scene ' + (i + 1) + '</b>' + (V.audio ? '<span class="vv-pill ok">🎧 ' + mm(sc.a0 || 0) + ' · ' + p.d.toFixed(1) + 's</span>' : '<span class="vv-pill' + (lineOf(sc) ? ' ok' : '') + '">' + (lineOf(sc) ? '🎙️ ' + p.d.toFixed(1) + 's' : '≈ ' + p.d.toFixed(1) + 's · not voiced yet') + '</span>') + '<span class="muted" style="font-size:12.5px">' + media + '</span><span style="flex:1"></span>' +
      (V.audio && (sc.words || []).length > 3 ? '<button class="btn ghost sm" data-split="' + i + '" title="Split this scene in two">✂️</button>' : '') + (i < V.scenes.length - 1 ? '<button class="btn ghost sm" data-join="' + i + '" title="Join with the next scene">🔗</button>' : '') + (V.audio ? '' : '<button class="btn ghost sm" data-mv="' + i + ':-1" title="Move up">⬆️</button><button class="btn ghost sm" data-mv="' + i + ':1" title="Move down">⬇️</button>') + '<button class="btn ghost sm" data-del="' + i + '" title="Delete">🗑️</button></div>' +
      '<textarea data-t="' + i + '" rows="2" style="margin-top:6px">' + esc(sc.t) + '</textarea>' +
      '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center">' +
      '<label class="btn ghost sm" style="margin:0;cursor:pointer">📷 My photo or video<input type="file" accept="image/*,video/*" data-up="' + i + '" hidden></label>' +
      '<button class="btn ghost sm" data-pic="' + i + '">✨ ' + (sc.img ? 'New picture' : 'Make picture') + '</button>' +
      (sc.img ? '<button class="btn ghost sm" data-clip="' + i + '">🎥 Turn into AI clip</button>' : '') +
      '<label class="btn ghost sm" style="margin:0;display:flex;gap:4px;align-items:center">🎨<input type="color" value="' + (sc.color || '#0F1E36') + '" data-col="' + i + '" style="width:30px;height:22px;padding:0;border:0"></label>' +
      (V.audio ? '' : '<label style="margin:0;font-size:12.5px">Pause after <input type="number" step="0.1" min="0" max="3" value="' + sc.gap + '" data-gap="' + i + '" style="width:60px;padding:3px 6px"> s</label>') + '</div>' +
      '<div class="row" style="gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap"><button class="btn ghost sm" data-who="' + i + '">👥 Who’s in it?</button>' + (window.HQChars ? window.HQChars.chips(sc.chars) : '') + '</div>' +
      '<input data-want="' + i + '" value="' + esc(sc.want || '') + '" placeholder="Describe the picture for ✨ Make picture" style="margin-top:6px;font-size:13px">' +
      '<input data-title="' + i + '" value="' + esc(sc.title || '') + '" placeholder="Big title on this scene (optional), e.g. 3 THINGS NOBODY TELLS YOU" style="margin-top:6px;font-size:13px">' + tsHtml(sc, i) + '</div></div>';
  }
  function tsHtml(sc, i) {
    var ts = sc.ts = Object.assign(TS(), sc.ts || {}), opt = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + (Array.isArray(o[k]) ? o[k][0] : o[k]) + '</option>'; }).join(''); };
    return '<div class="vv-ts"' + ((sc.title || '').trim() ? '' : ' hidden') + ' data-tsbox="' + i + '"><span>Title:</span><select data-ts="' + i + ':look">' + opt(TLOOK, ts.look) + '</select><select data-ts="' + i + ':font">' + opt(TFONT, ts.font) + '</select>' +
      '<label>Size <input type="range" min="50" max="170" value="' + ts.size + '" data-ts="' + i + ':size"></label><label>Up / down <input type="range" min="6" max="90" value="' + Math.round(ts.y * 100) + '" data-ts="' + i + ':y"></label>' +
      '<select data-ts="' + i + ':anim">' + opt(TANIM, ts.anim) + '</select><label><input type="checkbox" data-ts="' + i + ':caps"' + (ts.caps ? ' checked' : '') + '> CAPS</label>' +
      '<button class="btn ghost sm" data-tsall="' + i + '" title="Use this size, look, font and position on every scene’s title">📋 Apply to all scenes</button></div>';
  }
  var thT = null, thAll = false, thSet = {};
  function thumbs(only) {
    clearTimeout(thT); if (only == null) thAll = true; else thSet[only] = 1;
    thT = setTimeout(async function () {
      var all = thAll, set = thSet; thAll = false; thSet = {};
      var M = await loadAll(), TL = timeline();
      V.scenes.forEach(function (sc, i) {
        var c = $('[data-th="' + i + '"]'); if (!c || (!all && !set[i])) return; var cx = c.getContext('2d'); cx.setTransform(216 / W, 0, 0, 384 / H, 0, 0);
        var p = TL.parts[i], ws = p.words, mid = ws.length ? LEAD + ws[Math.min(ws.length - 1, 1)][1] + 0.05 : 0.6;
        frame(cx, p.s + Math.min(p.d - 0.05, Math.max(0.5, mid)), M, TL, true);
      });
    }, 150);
  }
  function splitScript(txt) {
    var out = []; txt.replace(/\r/g, '').split(/\n+/).forEach(function (ln) { ln = ln.trim(); if (!ln) return; var parts = ln.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || [ln]; parts.forEach(function (s) { s = s.trim(); if (s) out.push(s); }); });
    // very short bits join the one before
    var res = []; out.forEach(function (s) { if (res.length && s.split(/\s+/).length < 3) res[res.length - 1] += ' ' + s; else res.push(s); });
    return res.slice(0, 40);
  }
  function bind() {
    var re = function () { draw(); };
    if ($('#vvSplit')) $('#vvSplit').onclick = function () { var l = splitScript($('#vvScript').value); if (!l.length) return X.toast('Type or paste your script first.'); V.scenes = l.map(function (t) { return sc0(t); }); draw(); };
    if ($('#vvWrite')) $('#vvWrite').onclick = function () {
      var tp = $('#vvTopic').value.trim(); if (tp.length < 4) return X.toast('Write the topic first.'); V.topic = tp; V.secs = +$('#vvSecs').value;
      var b = this; b.disabled = true; prog('✨ Writing your script… (about 15 seconds)');
      X.api('vv-script', { topic: tp, secs: V.secs }).then(function (r) { V.scenes = r.lines.map(function (x) { return sc0(x.t, x.want); }); V.caption = r.caption || ''; if (!V.name) V.name = r.name || ''; prog(''); draw(); X.toast('✨ Script written — read it through and change anything'); }).catch(function (e) { prog(''); b.disabled = false; X.toast(e.message); });
    };
    if ($('#vvAud')) {
      var AF = null;
      var lbl = function () { $('#vvListen').textContent = $('#vvPaste').value.trim() ? '📝 Match my words to the audio' : '🎧 Write down the words'; };
      $('#vvAud').onchange = function () { AF = this.files && this.files[0]; $('#vvAudN').textContent = AF ? '✅ ' + AF.name : ''; $('#vvListen').disabled = !AF; $('#vvAudMsg').textContent = ''; };
      $('#vvPaste').oninput = lbl;
      $('#vvListen').onclick = function () {
        if (!AF) { $('#vvAudMsg').textContent = '⬆️ Choose your audio first.'; return; } var b = this, eng = $('#vvEng').value, lang = $('#vvLang').value; b.disabled = true; prog('🎧 Starting…');
        var pasted = $('#vvPaste').value; fromAudio(AF, eng, lang, pasted).then(function () { draw(); X.toast('🎧 ' + V.scenes.length + ' scenes from your audio' + (pasted.trim() ? ' with your words' : ' — fix any misheard words') + ', then ✨ Suggest pictures'); }).catch(function (e) { prog(''); b.disabled = false; var m = $('#vvAudMsg'); if (m) { m.style.color = '#B42318'; m.textContent = '⚠️ ' + (e && e.message || 'Something went wrong.') + ' Please try again.'; } X.toast(e && e.message || 'Something went wrong.'); });
      };
    }
    if (!V.scenes.length) return;
    if ($('#vvTrS')) {
      var trim = function () { var a = Math.max(0, Math.min(V.audio.dur - 1, +$('#vvTrS').value || 0)), b = Math.max(a + 1, Math.min(V.audio.dur, +$('#vvTrE').value || V.audio.dur)); V.audio.trimS = a; V.audio.trimE = b; draw(); };
      $('#vvTrS').onchange = trim; $('#vvTrE').onchange = trim;
      $('#vvAVol').oninput = function () { V.audio.vol = +this.value; $('#vvAVv').textContent = this.value + '%'; };
    }
    $('#vvWants').onclick = function () { var b = this; b.disabled = true; prog('✨ Choosing a picture for each scene…'); suggestPictures().then(function () { prog(''); draw(); X.toast('✨ Picture ideas added — check them, then ✨ Make all missing pictures'); }).catch(function (e) { prog(''); b.disabled = false; X.toast(e.message); }); };
    $$('[data-split]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.split, sc = V.scenes[i], ws = sc.words, k = Math.ceil(ws.length / 2); for (var j = Math.ceil(ws.length / 3); j < Math.floor(ws.length * 2 / 3); j++) if (/[,;:.!?]$/.test(ws[j - 1][0])) { k = j; break; } var b = Object.assign(sc0(''), clone({ media: sc.media, color: sc.color, want: sc.want, ts: sc.ts, chars: sc.chars || [] }), { words: ws.slice(k), a0: ws[k][1], a1: sc.a1 }); sc.words = ws.slice(0, k); sc.a1 = b.a0; sc.t = sc.words.map(function (w) { return w[0]; }).join(' '); b.t = b.words.map(function (w) { return w[0]; }).join(' '); V.scenes.splice(i + 1, 0, b); draw(); }; });

    if ($('#vvVoice')) {
      $('#vvVoice').onchange = function () { V.voice = this.value; draw(); };
      $('#vvModel').onchange = function () { V.model = this.value; draw(); };
      $('#vvSpeed').onchange = function () { V.speed = +this.value; draw(); };
      $('#vvHear').onclick = function () { var v = (ST.voices || []).filter(function (x) { return x.id === V.voice; })[0]; if (v && v.preview) { try { new Audio(v.preview).play(); } catch (e) {} return; } X.api('vv-speak', { text: 'Hello, my dear! This is Auntie Tobi.', voice: V.voice, model: V.model, speed: V.speed }).then(function (r) { new Audio(URL.createObjectURL(new Blob([b64ToBuf(r.dataUrl)], { type: 'audio/mpeg' }))).play(); }).catch(function (e) { X.toast(e.message); }); };
      $('#vvDef').onclick = function () { X.api('vv-voice', { voice: V.voice }).then(function () { PREFS = { voice: V.voice }; draw(); X.toast('⭐ ' + voiceName() + ' is now your default voice'); }).catch(function (e) { X.toast(e.message); }); };
      $('#vvVo').onclick = function () { var b = this; b.disabled = true; voiceAll(true).then(function () { draw(); X.toast('🎙️ Voice ready — captions follow her words'); }).catch(function (e) { prog(''); b.disabled = false; X.toast(e.message); }); };
      $('#vvVoVol').oninput = function () { V.voiceVol = +this.value; $('#vvVoV').textContent = this.value + '%'; };
    }
    $('#vvAdd').onclick = function () { V.scenes.push(sc0('')); draw(); };
    $('#vvAllPics').onclick = allPics;
    $('#vvKb').onchange = function () { V.kb = this.checked; thumbs(); };
    $('#vvDim').oninput = function () { V.dim = this.value / 100; $('#vvDimV').textContent = this.value + '%'; thumbs(); };
    $('#vvCapOn').onchange = function () { V.cap.on = this.checked; thumbs(); };
    $('#vvCapSt').onchange = function () { V.cap.style = this.value; thumbs(); };
    $('#vvCapY').oninput = function () { V.cap.y = this.value / 100; thumbs(); };
    $('#vvCapS').oninput = function () { V.cap.size = +this.value; thumbs(); };
    $('#vvMus').onchange = function () { V.music = this.value; draw(); };
    $('#vvMusVol').oninput = function () { V.musicVol = +this.value; $('#vvMusV').textContent = this.value + '%'; };
    $('#vvMusUp').onchange = function () { var f = this.files && this.files[0]; if (!f) return; f.arrayBuffer().then(function (b) { return ac().decodeAudioData(b); }).then(function (buf) { OWN = buf; OWNNAME = f.name; V.music = 'own'; draw(); }).catch(function () { X.toast('That file didn’t play — try an MP3.'); }); };
    $('#vvCap').oninput = function () { V.caption = this.value; };
    $('#vvPrev').onclick = function () { livePreview().catch(function (e) { prog(''); X.toast(e.message); }); };
    $('#vvGo').onclick = function () { make().catch(function (e) { prog(''); var g = $('#vvGo'); if (g) g.disabled = false; X.toast(e.message || 'Something went wrong.'); }); };
    $$('[data-t]').forEach(function (el) { el.onchange = function () { var sc = V.scenes[+el.dataset.t]; sc.t = el.value.trim(); if (V.audio) retime(sc); draw(); }; });
    $$('[data-gap]').forEach(function (el) { el.onchange = function () { V.scenes[+el.dataset.gap].gap = Math.max(0, Math.min(3, +el.value || 0)); draw(); }; });
    $$('[data-who]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.who; if (!window.HQChars) return; window.HQChars.pick(V.scenes[i].chars, function (ids) { V.scenes[i].chars = ids; draw(); if (ids.length) X.toast('👥 Tap ✨ ' + (V.scenes[i].img ? 'New picture' : 'Make picture') + ' to make this scene’s picture with them'); }); }; });
    $$('[data-want]').forEach(function (el) { el.oninput = function () { V.scenes[+el.dataset.want].want = el.value; }; });
    $$('[data-title]').forEach(function (el) { el.oninput = function () { var i = +el.dataset.title; V.scenes[i].title = el.value; var b = $('[data-tsbox="' + i + '"]'); if (b) b.hidden = !el.value.trim(); thumbs(i); }; });
    $$('[data-ts]').forEach(function (el) { var ev = el.type === 'range' ? 'oninput' : 'onchange'; el[ev] = function () { var p = el.dataset.ts.split(':'), sc = V.scenes[+p[0]], k = p[1]; sc.ts = Object.assign(TS(), sc.ts || {}); sc.ts[k] = k === 'caps' ? el.checked : k === 'size' ? +el.value : k === 'y' ? el.value / 100 : el.value; thumbs(+p[0]); }; });
    $$('[data-tsall]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.tsall, src = Object.assign(TS(), V.scenes[i].ts || {}); V.scenes.forEach(function (s) { s.ts = clone(src); }); draw(); X.toast('📋 Title style applied to all ' + V.scenes.length + ' scenes'); }; });
    $$('[data-th]').forEach(function (el) { el.onclick = function () { viewer(+el.dataset.th); }; });
    $$('[data-col]').forEach(function (el) { el.oninput = function () { var sc = V.scenes[+el.dataset.col]; sc.color = el.value; sc.media = 'color'; thumbs(+el.dataset.col); }; el.onchange = re; });
    $$('[data-up]').forEach(function (el) { el.onchange = function () { var f = el.files && el.files[0]; if (f) upMedia(+el.dataset.up, f); }; });
    $$('[data-pic]').forEach(function (el) { el.onclick = function () { pic(+el.dataset.pic).then(re).catch(function (e) { X.toast(e.message); }); }; });
    $$('[data-clip]').forEach(function (el) { el.onclick = function () { aiClip(+el.dataset.clip).catch(function (e) { prog(''); X.toast(e.message); }); }; });
    $$('[data-join]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.join, a = V.scenes[i], b = V.scenes[i + 1]; a.t = (a.t + ' ' + b.t).trim(); a.gap = b.gap; if (V.audio) { a.words = (a.words || []).concat(b.words || []); a.a1 = b.a1; } if (!a.title) a.title = b.title; V.scenes.splice(i + 1, 1); draw(); }; });
    $$('[data-mv]').forEach(function (el) { el.onclick = function () { var p = el.dataset.mv.split(':'), i = +p[0], j = i + (+p[1]); if (j < 0 || j >= V.scenes.length) return; var t = V.scenes[i]; V.scenes[i] = V.scenes[j]; V.scenes[j] = t; draw(); }; });
    $$('[data-del]').forEach(function (el) { el.onclick = function () { if (!confirm('Delete scene ' + (+el.dataset.del + 1) + '?')) return; V.scenes.splice(+el.dataset.del, 1); draw(); }; });
  }

  // ───── backgrounds ─────
  function shrink(file, max) { return new Promise(function (ok, bad) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = function () { bad(new Error('That photo didn’t open.')); }; im.src = u; }); }
  function upMedia(i, f) {
    var sc = V.scenes[i];
    if (/^video\//.test(f.type)) { if (f.size > 400e6) return X.toast('That video is too big — under 400 MB please.'); sc._vid = URL.createObjectURL(f); sc._vname = f.name; delete sc.img; delete sc.clip; delete sc._clipUrl; sc.media = 'video'; draw(); X.toast('🎬 Video added. Your own videos aren’t kept in saved videos — you’d add it again.'); return; }
    shrink(f, 1920).then(function (d) { return X.api('img', { dataUrl: d }); }).then(function (r) { sc.img = r.id; delete sc._vid; delete sc.clip; delete sc._clipUrl; sc.media = 'photo'; draw(); X.toast('📷 Photo added'); }).catch(function (e) { X.toast(e.message || 'Couldn’t use that photo.'); });
  }
  function pic(i) {
    var sc = V.scenes[i], want = (sc.want || '').trim() || sc.t; if (!want.trim()) return Promise.reject(new Error('Describe the picture first.'));
    prog('✨ Making the picture for scene ' + (i + 1) + '…');
    return X.api('rx-pic', { want: want, chars: sc.chars || [] }).then(function (r) { sc.img = r.img; delete sc._vid; delete sc.clip; delete sc._clipUrl; sc.media = 'photo'; prog(''); }).catch(function (e) { prog(''); throw e; });
  }
  async function allPics() {
    var todo = V.scenes.map(function (s, i) { return i; }).filter(function (i) { var s = V.scenes[i]; return s.media !== 'color' && !s.img && !s._vid && !s.clip; });
    if (!todo.length) return X.toast('Every scene has a background ✅');
    if (!confirm('Make ' + todo.length + ' picture' + (todo.length === 1 ? '' : 's') + ' with your image model?')) return;
    for (var k = 0; k < todo.length; k++) { try { await pic(todo[k]); } catch (e) { X.toast(e.message); break; } }
    draw();
  }
  async function aiClip(i) {
    var sc = V.scenes[i];
    if (!VM) VM = await X.api('vm-settings').then(function (r) { return r.settings; }).catch(function () { return null; });
    if (VM && VM.ready === false) return X.toast('Connect fal.ai first: 🎥 Video Ad Studio → 🎬 Make the video → ⚙️ Settings.');
    var tier = VM && VM.tiers ? VM.tiers.filter(function (t) { return t.id === 'budget'; })[0] : null, price = tier && tier.gbpPerSec ? '£' + (tier.gbpPerSec * 5).toFixed(2) : 'about 30p';
    if (!confirm('Turn this picture into a 5-second AI video clip? It costs ' + price + ' and takes a few minutes.')) return;
    prog('🎥 Sending the picture…');
    var blob = await fetch(srcOf(sc)).then(function (r) { return r.blob(); });
    var d = await shrink(new File([blob], 'p.jpg', { type: blob.type || 'image/jpeg' }), 1280);
    var up = await X.api('app-img', { image: d });
    var job = (await X.api('vm-clip', { tier: 'budget', imgId: up.imgId, prompt: 'Gentle, natural camera movement, real-looking motion. ' + (sc.want || sc.t || ''), seconds: 5, aspect: '9:16' })).job;
    for (var n = 0; n < 120; n++) {
      prog('🎥 Making the AI clip for scene ' + (i + 1) + '… (' + (Math.round(n * 6 / 6) / 10) + ' min)');
      await new Promise(function (ok) { setTimeout(ok, 6000); });
      var st = (await X.api('vm-status', { jobs: [job] })).results[0];
      if (st.status === 'COMPLETED') { sc.clip = st.url; delete sc._clipUrl; sc.media = 'video'; await clipLocal(sc); prog(''); draw(); X.toast('🎥 AI clip ready'); return; }
      if (st.status === 'ERROR') throw new Error('The AI clip failed: ' + (st.error || 'please try again'));
    }
    throw new Error('The AI clip is taking too long — try again later.');
  }

  // ───── 🔍 view a scene's picture big ─────
  function viewer(i) {
    var mode = 'scene', sh = X.sheet('<div id="vwB"></div>');
    var paint = async function () {
      var sc = V.scenes[i], box = $('#vwB', sh); if (!sc || !box) return;
      var hasMedia = sc.media !== 'color' && (srcOf(sc) || sc.clip);
      box.innerHTML = '<div class="row" style="gap:8px;align-items:center;margin-bottom:8px"><b style="flex:1">Scene ' + (i + 1) + ' of ' + V.scenes.length + '</b><button class="btn ghost sm" id="vwP"' + (i ? '' : ' disabled') + '>◀</button><button class="btn ghost sm" id="vwN"' + (i < V.scenes.length - 1 ? '' : ' disabled') + '>▶</button><button class="btn ghost sm" id="vwX">✕</button></div>' +
        '<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm ' + (mode === 'scene' ? 'primary' : 'ghost') + '" id="vwS">🎬 As in the video</button><button class="btn sm ' + (mode === 'pic' ? 'primary' : 'ghost') + '" id="vwI">🖼️ Picture only</button></div>' +
        '<div id="vwM" style="display:flex;justify-content:center;background:#111;border-radius:12px;min-height:200px"></div><div class="muted" style="font-size:13px;margin-top:8px">“' + esc(sc.t) + '”</div>' +
        '<div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost sm" id="vwPic">✨ ' + (sc.img ? 'New picture' : 'Make picture') + '</button><label class="btn ghost sm" style="margin:0;cursor:pointer">📷 My photo or video<input type="file" accept="image/*,video/*" id="vwUp" hidden></label>' + (sc.img ? '<button class="btn ghost sm" id="vwClip">🎥 Turn into AI clip</button>' : '') + '</div><div class="muted" id="vwProg" style="margin-top:6px"></div>';
      var m = $('#vwM', box), hgt = 'max-height:68vh;max-width:100%;border-radius:12px';
      if (mode === 'pic' && hasMedia) {
        if (sc.clip && !sc._clipUrl) { try { await clipLocal(sc); } catch (e) { X.toast(e.message); } }
        if (isVideo(sc)) m.innerHTML = '<video src="' + srcOf(sc) + '" autoplay muted loop playsinline controls style="' + hgt + '"></video>';
        else m.innerHTML = '<img src="' + srcOf(sc) + '" alt="" style="' + hgt + '">';
      } else {
        if (mode === 'pic') m.innerHTML = '<div style="color:#fff;padding:40px;text-align:center">' + (sc.media === 'color' ? '🎨 This scene uses a plain colour.' : '⚠️ No picture yet — make one below.') + '</div>';
        else {
          var c = document.createElement('canvas'); c.width = 540; c.height = 960; c.style.cssText = 'height:68vh;max-width:100%;border-radius:12px;aspect-ratio:9/16'; m.appendChild(c);
          var M = await loadAll(), TL = timeline(), p = TL.parts[i], cx = c.getContext('2d'); cx.setTransform(0.5, 0, 0, 0.5, 0, 0);
          var mid = p.words.length ? LEAD + p.words[Math.min(p.words.length - 1, Math.floor(p.words.length / 2))][1] + 0.05 : p.d / 2;
          frame(cx, p.s + Math.min(p.d - 0.05, Math.max(0.6, mid)), M, TL, true);
        }
      }
      $('#vwX', box).onclick = function () { sh.remove(); };
      $('#vwP', box).onclick = function () { if (i > 0) { i--; paint(); } };
      $('#vwN', box).onclick = function () { if (i < V.scenes.length - 1) { i++; paint(); } };
      $('#vwS', box).onclick = function () { mode = 'scene'; paint(); };
      $('#vwI', box).onclick = function () { mode = 'pic'; paint(); };
      var after = function () { draw(); paint(); };
      $('#vwPic', box).onclick = function () { $('#vwProg', box).textContent = '✨ Making the picture…'; pic(i).then(after).catch(function (e) { $('#vwProg', box).textContent = ''; X.toast(e.message); }); };
      $('#vwUp', box).onchange = function () { var f = this.files && this.files[0]; if (f) { upMedia(i, f); setTimeout(paint, 1500); } };
      if ($('#vwClip', box)) $('#vwClip', box).onclick = function () { aiClip(i).then(after).catch(function (e) { X.toast(e.message); }); };
    };
    sh.querySelector('.sheet').style.maxWidth = '560px';
    paint();
  }

  // ───── sound: voice lines + music that dips under the voice ─────
  async function mix(TL) {
    var SR = 48000, dur = TL.total, ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), vv = V.voiceVol / 100, spans = [];
    if (V.audio) {
      var AB = await audioBuf(), src = ctx.createBufferSource(), ag = ctx.createGain(); src.buffer = AB; ag.gain.value = (V.audio.vol == null ? 100 : V.audio.vol) / 100; src.connect(ag); ag.connect(ctx.destination); src.start(0, V.audio.trimS || 0, dur);
      TL.parts.forEach(function (p) { if (p.words.length) spans.push([p.s + LEAD + p.words[0][1], p.s + LEAD + p.words[p.words.length - 1][2]]); });
    }
    TL.parts.forEach(function (p) { if (p.L) { var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = p.L.buf; g.gain.value = vv; s.connect(g); g.connect(ctx.destination); s.start(p.s + LEAD); spans.push([p.s + LEAD, p.s + LEAD + p.L.buf.duration]); } });
    var m = V.music, vol = V.musicVol / 100 * 0.6;
    if (m !== 'none' && vol > 0 && !(m === 'own' && !OWN)) {
      var bus = ctx.createGain(); bus.connect(ctx.destination);
      var pts = [[0, 0.0001], [1.2, vol]];
      spans.forEach(function (x) { pts.push([Math.max(1.25, x[0] - 0.2), vol]); pts.push([Math.max(1.3, x[0]), vol * 0.3]); pts.push([x[1], vol * 0.3]); pts.push([x[1] + 0.35, vol]); });
      pts.push([Math.max(1.3, dur - 1.5), vol]); pts.push([dur, 0.0001]); pts.sort(function (a, b) { return a[0] - b[0]; });
      bus.gain.setValueAtTime(0.0001, 0); pts.forEach(function (p) { bus.gain.linearRampToValueAtTime(p[1], Math.min(dur, p[0])); });
      if (m === 'own') { var o = ctx.createBufferSource(); o.buffer = OWN; o.loop = true; o.connect(bus); o.start(0); o.stop(dur); }
      else if (window.HQQuizVid && window.HQQuizVid.music) window.HQQuizVid.music.track(ctx, bus, m, dur);
    }
    return ctx.startRendering();
  }
  async function ready() {
    if (!V.audio && ST && ST.ready && V.voice && V.scenes.some(function (s) { return s.t.trim() && !lineOf(s); })) {
      if (confirm('Make the voice first? (Lines you’ve already made are free.)')) await voiceAll(true);
    }
    prog('Loading the pictures and videos…'); var M = await loadAll(), TL = timeline();
    prog('Mixing the sound…'); var audio = await mix(TL); prog('');
    return { M: M, TL: TL, audio: audio };
  }

  // ───── 👀 preview ─────
  function seekV(v, t) { return new Promise(function (ok) { if (!v || !v.duration) return ok(); var tt = t % v.duration; if (Math.abs(v.currentTime - tt) < 0.001) return ok(); var done = false, fin = function () { if (!done) { done = true; ok(); } }; v.addEventListener('seeked', fin, { once: true }); setTimeout(fin, 1200); v.currentTime = tt; }); }
  async function livePreview() {
    var R = await ready(), M = R.M, TL = R.TL, dur = TL.total;
    var sh = X.sheet('<h3 style="margin:0 0 8px">👀 Preview</h3><canvas id="pvC" width="' + W + '" height="' + H + '" style="width:100%;max-width:300px;display:block;margin:0 auto;border-radius:12px;background:#000"></canvas>' +
      '<input type="range" id="pvSeek" min="0" max="' + Math.round(dur * 10) + '" value="0" style="width:100%;max-width:300px;display:block;margin:10px auto 0">' +
      '<div class="row" style="gap:8px;justify-content:center;margin-top:8px"><button class="btn primary" id="pvPlay">▶️ Play</button><button class="btn ghost" id="pvClose">Close</button><span class="muted" id="pvT">0:00 / ' + mm(dur) + '</span></div>');
    var cx = $('#pvC', sh).getContext('2d'), a = ac(), src = null, startAt = 0, pos = 0, raf = 0, playing = false, cur = -1;
    var vids = function (t, play) { var x = at(t, TL); M.forEach(function (m, i) { if (!m || !m.v) return; if (i === x.i && play) { if (cur !== i) { try { m.v.currentTime = x.lt % (m.v.duration || 1); } catch (e) {} } if (m.v.paused) m.v.play().catch(function () {}); } else if (!m.v.paused) m.v.pause(); }); cur = play ? x.i : -1; };
    var paint = function (t) { frame(cx, Math.min(t, dur - 0.01), M, TL, true); $('#pvT', sh).textContent = mm(t) + ' / ' + mm(dur); $('#pvSeek', sh).value = Math.round(t * 10); };
    var stop = function () { if (src) { try { src.stop(); } catch (e) {} src = null; } cancelAnimationFrame(raf); if (playing) pos = Math.min(dur, a.currentTime - startAt); playing = false; vids(pos, false); $('#pvPlay', sh).textContent = '▶️ Play'; };
    var loop = function () { var t = a.currentTime - startAt; if (t >= dur) { stop(); pos = 0; return; } vids(t, true); paint(t); raf = requestAnimationFrame(loop); };
    var play = async function () { if (a.state === 'suspended') await a.resume(); src = a.createBufferSource(); src.buffer = R.audio; src.connect(a.destination); startAt = a.currentTime - pos; src.start(0, pos); playing = true; cur = -1; $('#pvPlay', sh).textContent = '⏸ Pause'; loop(); };
    $('#pvPlay', sh).onclick = function () { if (playing) stop(); else play(); };
    $('#pvSeek', sh).oninput = function () { var was = playing; stop(); pos = this.value / 10; var x = at(pos, TL); (M[x.i] && M[x.i].v ? seekV(M[x.i].v, x.lt) : Promise.resolve()).then(function () { paint(pos); }); if (was) play(); };
    $('#pvClose', sh).onclick = function () { stop(); sh.remove(); };
    sh.addEventListener('click', function (e) { if (e.target === sh) stop(); });
    paint(0);
  }

  // ───── 🎬 make the MP4 ─────
  async function make() {
    if (typeof VideoEncoder !== 'function' || !window.Mp4Muxer) throw new Error('This browser can’t make videos — please use Chrome or Edge on a laptop.');
    var missing = V.scenes.filter(function (s) { return s.media !== 'color' && !srcOf(s) && !s.clip; }).length;
    if (missing && !confirm(missing + ' scene' + (missing === 1 ? ' has' : 's have') + ' no background yet and will be dark. Make the video anyway?')) return;
    $('#vvGo').disabled = true; V.out = null; $('#vvOut').innerHTML = '';
    var R = await ready(), M = R.M, TL = R.TL, dur = TL.total; M.forEach(function (m) { if (m && m.v) m.v.pause(); });
    var vpick = null, tries = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a'];
    for (var i = 0; i < tries.length && !vpick; i++) { try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i], width: W, height: H, bitrate: 8e6, framerate: FPS }); if (r && r.supported) vpick = tries[i]; } catch (e) {} }
    if (!vpick) throw new Error('This browser can’t make MP4 videos — please use Chrome or Edge.');
    var aok = false; if (typeof AudioEncoder === 'function') { try { var ar = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }); aok = !!(ar && ar.supported); } catch (e) {} }
    var mo = { target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
    if (aok) mo.audio = { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 };
    var mux = new Mp4Muxer.Muxer(mo), failed = null;
    var venc = new VideoEncoder({ output: function (c, m) { mux.addVideoChunk(c, m); }, error: function (e) { failed = e; } });
    venc.configure({ codec: vpick, width: W, height: H, bitrate: 8e6, framerate: FPS, avc: { format: 'avc' } });
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d'), N = Math.round(dur * FPS);
    for (var f = 0; f < N; f++) {
      if (failed) throw failed;
      var t = f / FPS, x = at(t, TL); if (M[x.i] && M[x.i].v) await seekV(M[x.i].v, x.lt);
      frame(cx, t, M, TL, false); if (f === Math.min(N - 1, 20) && F()) V._thumb = F().thumb(cv);
      var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      if (f % 15 === 0) { prog('🎬 Making the video… ' + Math.round(f / N * 100) + '%'); await new Promise(function (ok) { setTimeout(ok, 0); }); }
      if (venc.encodeQueueSize > 8) await new Promise(function (ok) { setTimeout(ok, 5); });
    }
    await venc.flush(); venc.close();
    if (aok) {
      prog('🔊 Adding the sound…'); var audio = R.audio;
      var aenc = new AudioEncoder({ output: function (c, m) { mux.addAudioChunk(c, m); }, error: function (e) { failed = e; } });
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
      var Lc = audio.getChannelData(0), Rc = audio.getChannelData(1), AN = audio.length;
      for (var o = 0; o < AN; o += 1024) { var n = Math.min(1024, AN - o), data = new Float32Array(n * 2); data.set(Lc.subarray(o, o + n), 0); data.set(Rc.subarray(o, o + n), n); var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / 48000 * 1e6), data: data }); aenc.encode(ad); ad.close(); if (aenc.encodeQueueSize > 20) await new Promise(function (ok) { setTimeout(ok, 2); }); }
      await aenc.flush(); aenc.close();
    }
    if (failed) throw failed;
    mux.finalize();
    V.out = { blob: new Blob([mux.target.buffer], { type: 'video/mp4' }), secs: Math.round(dur), sound: aok };
    prog(''); $('#vvGo').disabled = false; showOut();
    try { if (!V.savedId) await doSave(V.name || (V.scenes[0].t || 'Voiceover video').slice(0, 50), false, true); else await doSave(V.savedName, false, true); } catch (e) {}
    keepFinished();
  }
  function keepFinished() {
    var o = V.out; if (!o || !F()) return; var el = $('#vvKeep'); if (el) el.textContent = '✅ Keeping it in Finished videos… 0%';
    F().keep({ tool: 'vv', name: V.savedName || V.name || 'Voiceover video', draftId: V.savedId, secs: o.secs, caption: V.caption }, o.blob, V._thumb, function (p) { var e = $('#vvKeep'); if (e) e.textContent = '✅ Keeping it in Finished videos… ' + p + '%'; })
      .then(function () { o.kept = true; var e = $('#vvKeep'); if (e) e.innerHTML = '✅ Kept in <b>📂 My videos → ✅ Finished</b> — play or download it any time.'; })
      .catch(function (e) { var x = $('#vvKeep'); if (x) x.innerHTML = '⚠️ Couldn’t keep it in HQ (' + esc(e.message) + ') — download it now. <button class="btn link" id="vvKeepR">Try again</button>'; var b = $('#vvKeepR'); if (b) b.onclick = keepFinished; });
  }
  function showOut() {
    var o = V.out, box = $('#vvOut'); if (!o || !box) return; var url = URL.createObjectURL(o.blob);
    box.innerHTML = '<div class="row" style="gap:14px;align-items:flex-start;flex-wrap:wrap"><video src="' + url + '" controls playsinline style="width:240px;border-radius:12px;background:#000"></video><div style="flex:1;min-width:220px"><b>✅ Your video is ready</b> <span class="muted">(' + o.secs + ' seconds' + (o.sound ? '' : ', no sound in this browser') + ')</span>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><a class="btn primary" download="voiceover-' + Date.now() + '.mp4" href="' + url + '">⬇️ Download MP4</a><button class="btn ghost" id="vvCopy">📋 Copy caption</button></div><div class="muted" style="font-size:12.5px;margin-top:8px">Check any [square brackets] were filled in before you post.</div><div id="vvKeep" class="muted" style="font-size:12.5px;margin-top:6px">' + (o.kept ? '✅ Kept in <b>📂 My videos → ✅ Finished</b>.' : '') + '</div></div></div>';
    $('#vvCopy').onclick = function () { try { navigator.clipboard.writeText($('#vvCap').value); X.toast('📋 Caption copied'); } catch (e) {} };
  }

  // ───── 💾 save / open ─────
  function snap() { var d = clone({ name: V.name, topic: V.topic, voice: V.voice, model: V.model, speed: V.speed, cap: V.cap, music: V.music, musicVol: V.musicVol, voiceVol: V.voiceVol, kb: V.kb, dim: V.dim, caption: V.caption, audio: V.audio, scenes: V.scenes.map(function (s) { return { a0: s.a0, a1: s.a1, words: s.words, t: s.t, gap: s.gap, media: s.media === 'video' && !s.clip ? 'photo' : s.media, color: s.color, want: s.want, title: s.title, ts: s.ts, img: s.img, clip: s.clip, chars: s.chars }; }) }); return d; }
  function doSave(name, asNew, quiet) { var d = snap(), j = JSON.stringify(d); return X.api('vv-save', { id: asNew ? '' : V.savedId, name: name, data: d }).then(function (r) { V.savedId = r.id; V.savedName = r.name; V.name = r.name; V._last = j; if (F()) F().lastDraft('vv', r.id); if ($('#vvRoot')) $('#ttl').textContent = 'Voiceover Video · ' + r.name; if (!quiet) X.toast('💾 Saved — find it in 📂 My videos'); }); }
  // 💾 auto-save: a few seconds after any change, while this page is open
  var asvBusy = false;
  setInterval(function () {
    if (!V || !V.scenes.length || asvBusy || !$('#vvRoot') || !F()) return;
    KEEPV(); var j = JSON.stringify(snap()); if (j === V._last) return;
    if (V._pend !== j) { V._pend = j; return; }   // wait until it's been still for one tick
    asvBusy = true; F().saveNote('saving');
    doSave(V.savedName || V.name || (V.scenes[0].t || 'Voiceover video').slice(0, 50), false, true).then(function () { F().saveNote('saved'); }).catch(function () { F().saveNote('error'); }).then(function () { asvBusy = false; });
  }, 2500);
  function KEEPV() { var c = $('#vvCap'); if (c) V.caption = c.value; }
  function saveSheet() {
    if (!V.scenes.length) return X.toast('Add your script first.');
    var vids = V.scenes.filter(function (s) { return s._vid; }).length;
    var s = X.sheet('<h3 style="margin:0 0 8px">💾 Save this video</h3><label>Name</label><input id="vvSN" value="' + esc(V.savedName || V.name || (V.scenes[0].t.slice(0, 50))) + '">' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Saves the script, voice choice, pictures, AI clips, captions and music choice. The voice lines are saved too, so making it again is free.' + (vids ? ' ⚠️ Your own video files aren’t kept (they’re too big) — add them again when you reopen.' : '') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="vvSOk">💾 Save</button>' + (V.savedId ? '<button class="btn ghost" id="vvSNew">Save as a new copy</button>' : '') + '<button class="btn ghost" id="vvSX">Cancel</button></div>');
    var go = function (asNew) { doSave($('#vvSN', s).value.trim(), asNew).then(function () { s.remove(); }).catch(function (e) { X.toast(e.message); }); };
    $('#vvSOk', s).onclick = function () { go(false); }; if ($('#vvSNew', s)) $('#vvSNew', s).onclick = function () { go(true); }; $('#vvSX', s).onclick = function () { s.remove(); };
  }
  function mine() {
    var s = X.sheet('<h3 style="margin:0 0 8px">📂 My voiceover videos</h3>'), host = null;
    if (F()) F().tabs(s, 'vv', function (el) { el.innerHTML = '<div id="vvML" class="muted">Loading…</div>'; X.api('vv-list').then(function (r) { items = r.items || []; paint(); }).catch(function (e) { var b = $('#vvML', s); if (b) b.textContent = e.message; }); });
    else s.querySelector('.sheet').insertAdjacentHTML('beforeend', '<div id="vvML" class="muted">Loading…</div>');
    var items = [];
    var paint = function () {
      var box = $('#vvML', s); if (!box) return; if (!items.length) { box.textContent = 'Nothing saved yet.'; return; } box.classList.remove('muted');
      box.innerHTML = items.map(function (it) { return '<div class="row" style="gap:8px;padding:8px 0;border-top:1px solid #EEE9DD;flex-wrap:nowrap"><div style="flex:1;min-width:0"><b>' + esc(it.name) + '</b><div class="muted" style="font-size:12.5px">' + it.n + ' scenes · saved ' + new Date(it.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div><button class="btn primary sm" data-op="' + it.id + '">Open</button><button class="btn ghost sm" data-dl="' + it.id + '">🗑️</button></div>'; }).join('');
      $$('[data-op]', s).forEach(function (b) { b.onclick = function () { openById(b.dataset.op).then(function (r) { s.remove(); X.toast('📂 Opened “' + r.name + '”'); }).catch(function (e) { X.toast(e.message); }); }; });
      $$('[data-dl]', s).forEach(function (b) { b.onclick = function () { if (!confirm('Delete this saved video? This can’t be undone.')) return; X.api('vv-del', { id: b.dataset.dl }).then(function () { if (V.savedId === b.dataset.dl) { V.savedId = ''; V.savedName = ''; } items = items.filter(function (x) { return x.id !== b.dataset.dl; }); paint(); }).catch(function (e) { X.toast(e.message); }); }; });
    };
    if (!F()) X.api('vv-list').then(function (r) { items = r.items || []; paint(); }).catch(function (e) { var b = $('#vvML', s); if (b) b.textContent = e.message; });
  }

  function init(x) { X = x; }
  window.HQVoice = { init: init, view: view };
})();
