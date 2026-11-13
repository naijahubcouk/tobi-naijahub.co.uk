/*
 * 🧽 HQ → Clean up a video (admin only) — for Auntie Tobi's OWN videos (e.g. the TikTok watermark on your own Reel,
 * an old logo, the CapCut end clip). Everything happens in this browser: nothing is uploaded, nothing costs anything.
 *   1. Choose the video  2. Drag a box over each watermark  3. 🌫️ Blur · 🎨 Fill in · ✂️ Crop out
 *   4. Cut seconds off the start / end  5. ✨ Make the clean video (plays through once, in real time) → ⬇️ Download
 * How: each frame is drawn onto a canvas with the boxes cleaned, then recorded (MP4 where the browser can, else WebM)
 * with the original sound (Web Audio).
 */
(function () {
  'use strict';
  var X = null, V = null, file = null, url = '', boxes = [], mode = 'fill', cutStart = 0, cutEnd = 0, busy = false, outUrl = '', outExt = 'mp4';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return X.esc(String(s == null ? '' : s)); };
  var fmt = function (s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function view() {
    $('#ttl').textContent = 'Clean up a video'; $('#topRight').innerHTML = '';
    var v = $('#view');
    v.innerHTML = '<div class="wrap" style="max-width:860px">' +
      '<div class="card" style="padding:16px;margin-bottom:12px"><b style="font-size:16px">🧽 Remove a watermark from your own video</b><p class="muted" style="margin:6px 0 0;font-size:14px">For your own videos only — like the TikTok watermark on your Reel, an old logo or the CapCut ending. It all happens on this device: nothing is uploaded and it’s free.</p>' +
      '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center"><label class="btn primary" style="margin:0">🎬 Choose a video<input type="file" accept="video/*" id="clF" hidden></label><span class="muted" id="clName" style="font-size:13.5px">' + (file ? esc(file.name) : 'No video chosen yet') + '</span></div></div>' +
      '<div id="clWork"></div></div>';
    $('#clF').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (f) load(f); };
    if (file) draw();
  }
  function load(f) {
    if (busy) return;
    if (url) URL.revokeObjectURL(url); if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ''; }
    file = f; url = URL.createObjectURL(f); boxes = []; cutStart = 0; cutEnd = 0;
    $('#clName').textContent = f.name;
    draw();
  }
  function draw() {
    var w = $('#clWork'); if (!w || !file) return;
    w.innerHTML =
      '<div class="card" style="padding:16px;margin-bottom:12px"><b>1. Drag a box over the watermark</b><div class="muted" style="font-size:13px;margin:2px 0 10px">If it moves around (like TikTok’s), slide through the video and draw a box over each place it appears. Draw slightly bigger than the watermark.</div>' +
      '<div id="clStage" style="position:relative;max-width:100%;width:fit-content;margin:0 auto;touch-action:none;user-select:none;background:#000;border-radius:10px;overflow:hidden">' +
      '<video id="clV" src="' + url + '" playsinline muted preload="auto" style="display:block;max-width:100%;max-height:60vh"></video><canvas id="clO" style="position:absolute;inset:0;width:100%;height:100%;cursor:crosshair"></canvas></div>' +
      '<input type="range" id="clT" min="0" max="1000" value="0" style="width:100%;margin-top:10px"><div class="row" style="justify-content:space-between;font-size:13px" class="muted"><span id="clNow">0:00</span><span id="clDur"></span></div>' +
      '<div id="clBoxes" style="margin-top:8px"></div></div>' +
      '<div class="card" style="padding:16px;margin-bottom:12px"><b>2. How to remove it</b><div class="row" id="clMode" style="gap:8px;margin-top:10px;flex-wrap:wrap">' +
      [['fill', '🎨 Fill in', 'Paints over it using what’s around it'], ['blur', '🌫️ Blur', 'Softly blurs it out'], ['crop', '✂️ Crop out', 'Cuts that edge off the video']].map(function (m) { return '<button class="btn ' + (mode === m[0] ? 'primary' : 'ghost') + '" data-m="' + m[0] + '" title="' + m[2] + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<div class="muted" style="font-size:13px;margin-top:6px" id="clModeTip"></div>' +
      '<div class="row" style="gap:10px;margin-top:14px;flex-wrap:wrap"><label style="flex:1;min-width:160px">✂️ Cut off the start (seconds)<input id="clS" type="number" min="0" step="0.5" value="' + cutStart + '"></label><label style="flex:1;min-width:160px">✂️ Cut off the end (seconds)<input id="clE" type="number" min="0" step="0.5" value="' + cutEnd + '"></label></div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:4px">Tip: TikTok and CapCut add an end clip — try cutting 3–4 seconds off the end.</div></div>' +
      '<div class="card" style="padding:16px;margin-bottom:12px"><b>3. Check it and make it</b> <span class="muted" style="font-weight:500;font-size:13px">· downloads in 1080p HD</span><div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost" id="clPrev">👀 Preview this frame</button><button class="btn primary" id="clGo">✨ Make the clean video</button></div>' +
      '<div id="clProg" class="muted" style="font-size:13.5px;margin-top:10px"></div><canvas id="clPv" style="display:none;max-width:100%;max-height:50vh;margin-top:10px;border-radius:10px"></canvas><div id="clOut"></div></div>';
    V = $('#clV');
    var o = $('#clO'), stage = $('#clStage');
    V.onloadedmetadata = function () { o.width = V.videoWidth; o.height = V.videoHeight; $('#clDur').textContent = fmt(V.duration); seek(0.05); paint(); };
    V.onerror = function () { $('#clProg').textContent = '⚠️ This browser can’t open that video. Try an MP4 or MOV, or another browser.'; };
    V.ontimeupdate = function () { $('#clNow').textContent = fmt(V.currentTime); };
    $('#clT').oninput = function () { if (V.duration) seek(this.value / 1000 * V.duration); };
    // draw boxes (in video pixels)
    var start = null;
    var pt = function (e) { var r = o.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * o.width, y: (e.clientY - r.top) / r.height * o.height }; };
    o.onpointerdown = function (e) { if (busy || !o.width) return; o.setPointerCapture(e.pointerId); start = pt(e); boxes.push({ x: start.x, y: start.y, w: 0, h: 0 }); };
    o.onpointermove = function (e) { if (!start) return; var p = pt(e), b = boxes[boxes.length - 1]; b.x = Math.min(start.x, p.x); b.y = Math.min(start.y, p.y); b.w = Math.abs(p.x - start.x); b.h = Math.abs(p.y - start.y); paint(); };
    o.onpointerup = function () { if (!start) return; start = null; var b = boxes[boxes.length - 1]; if (b.w < 8 || b.h < 8) boxes.pop(); else if (boxes.length > 4) boxes.shift(); paint(); listBoxes(); };
    $('#clMode').querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; draw(); }; });
    $('#clModeTip').textContent = { fill: 'Fills each box with the picture just around it — best on plain backgrounds (sky, walls, flyers).', blur: 'Blurs each box — quick and safe on busy backgrounds.', crop: 'Cuts off the top or bottom band that has the box (the video gets a little shorter in height).' }[mode];
    $('#clS').oninput = function () { cutStart = Math.max(0, +this.value || 0); };
    $('#clE').oninput = function () { cutEnd = Math.max(0, +this.value || 0); };
    $('#clPrev').onclick = previewFrame;
    $('#clGo').onclick = make;
    listBoxes();
    if (outUrl) showOut();
    void stage;
  }
  function seek(t) { if (!V) return; V.currentTime = Math.min(Math.max(0, t), (V.duration || 1) - 0.05); }
  function paint() {
    var o = $('#clO'); if (!o || !o.width) return; var c = o.getContext('2d'); c.clearRect(0, 0, o.width, o.height);
    c.lineWidth = Math.max(3, o.width / 250); boxes.forEach(function (b, i) { c.fillStyle = 'rgba(255,184,28,.25)'; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = '#FFB81C'; c.strokeRect(b.x, b.y, b.w, b.h); c.fillStyle = '#FFB81C'; c.font = 'bold ' + Math.round(o.width / 22) + 'px sans-serif'; c.fillText(String(i + 1), b.x + 6, b.y + Math.round(o.width / 22)); });
  }
  function listBoxes() {
    var el = $('#clBoxes'); if (!el) return;
    el.innerHTML = boxes.length ? boxes.map(function (b, i) { return '<span style="display:inline-flex;align-items:center;gap:6px;background:#FFF4D6;border-radius:20px;padding:4px 6px 4px 12px;margin:0 6px 6px 0;font-size:13px;font-weight:700">Box ' + (i + 1) + '<button class="btn small ghost" data-rm="' + i + '" style="padding:2px 8px">✕</button></span>'; }).join('') : '<span class="muted" style="font-size:13px">No boxes yet — drag over the watermark on the video above.</span>';
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { boxes.splice(+b.dataset.rm, 1); paint(); listBoxes(); }; });
  }
  // the band to keep when cropping: drop the top or bottom strip that holds the boxes
  function cropRect(W, H) {
    if (mode !== 'crop' || !boxes.length) return { x: 0, y: 0, w: W, h: H };
    var top = 0, bot = H;
    boxes.forEach(function (b) { if (b.y + b.h / 2 < H / 2) top = Math.max(top, Math.ceil(b.y + b.h + 2)); else bot = Math.min(bot, Math.floor(b.y - 2)); });
    if (bot - top < H * 0.4) { top = 0; bot = H; }
    var h = (bot - top) & ~1; return { x: 0, y: top, w: W & ~1, h: h };
  }
  // one cleaned frame onto ctx (output canvas)
  var scratch = document.createElement('canvas');
  function frame(ctx, W, H, cr) {
    ctx.drawImage(V, cr.x, cr.y, cr.w, cr.h, 0, 0, cr.w, cr.h);
    if (mode === 'crop') return;
    boxes.forEach(function (b) {
      var x = Math.max(0, Math.floor(b.x)), y = Math.max(0, Math.floor(b.y)), w = Math.min(W - x, Math.ceil(b.w)), h = Math.min(H - y, Math.ceil(b.h));
      if (w < 2 || h < 2) return;
      if (mode === 'blur') {
        var pad = Math.round(Math.max(w, h) * 0.3);
        scratch.width = w + pad * 2; scratch.height = h + pad * 2;
        var s = scratch.getContext('2d'); s.filter = 'blur(' + Math.max(8, Math.round(Math.min(w, h) / 4)) + 'px)'; s.drawImage(V, x - pad, y - pad, w + pad * 2, h + pad * 2, 0, 0, w + pad * 2, h + pad * 2);
        ctx.drawImage(scratch, pad, pad, w, h, x, y, w, h);
      } else {
        // 🎨 fill in: blend the strips just above/below (or left/right) across the box, then soften
        var m = Math.max(4, Math.round(Math.min(w, h) * 0.25)), vert = w >= h;
        scratch.width = w; scratch.height = h; var f = scratch.getContext('2d'); f.filter = 'none';
        if (vert) {
          var ya = Math.max(0, y - m), yb = Math.min(H - m, y + h);
          f.drawImage(V, x, ya, w, m, 0, 0, w, h);
          f.globalAlpha = 0.5; f.drawImage(V, x, yb, w, m, 0, 0, w, h); f.globalAlpha = 1;
        } else {
          var xa = Math.max(0, x - m), xb = Math.min(W - m, x + w);
          f.drawImage(V, xa, y, m, h, 0, 0, w, h);
          f.globalAlpha = 0.5; f.drawImage(V, xb, y, m, h, 0, 0, w, h); f.globalAlpha = 1;
        }
        ctx.save(); ctx.filter = 'blur(' + Math.max(3, Math.round(Math.min(w, h) / 10)) + 'px)'; ctx.drawImage(scratch, x, y); ctx.restore();
      }
    });
  }
  function previewFrame() {
    if (!V || !V.videoWidth) return;
    var W = V.videoWidth, H = V.videoHeight, cr = cropRect(W, H), pv = $('#clPv');
    pv.width = cr.w; pv.height = cr.h; frame(pv.getContext('2d'), W, H, cr); pv.style.display = 'block';
    if (!boxes.length) $('#clProg').textContent = 'Tip: drag a box over the watermark first.'; else $('#clProg').textContent = '👀 This is how this moment will look.';
  }
  function pickType() {
    // H.264 MP4 first (what Instagram wants) at a level that allows 1080×1920
    var t = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4d4028,mp4a.40.2', 'video/mp4;codecs=avc1.42e028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < t.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i];
    return '';
  }
  async function make() {
    if (busy || !V || !V.videoWidth) return;
    if (!boxes.length && !cutStart && !cutEnd) { $('#clProg').textContent = 'Drag a box over the watermark, or set seconds to cut, first.'; return; }
    var type = pickType(); if (!type) { $('#clProg').textContent = '⚠️ This browser can’t make videos. Try Chrome or Safari on a laptop.'; return; }
    var from = Math.min(cutStart, V.duration - 1), to = Math.max(from + 0.5, V.duration - cutEnd);
    busy = true; $('#clGo').disabled = true; $('#clPrev').disabled = true;
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ''; $('#clOut').innerHTML = ''; }
    var W = V.videoWidth, H = V.videoHeight, cr = cropRect(W, H);
    // ⬆️ always full HD: the shorter side becomes 1080 (a Reel comes out 1080×1920)
    var k = 1080 / Math.min(cr.w, cr.h), OW = Math.round(cr.w * k / 2) * 2, OH = Math.round(cr.h * k / 2) * 2;
    var out = document.createElement('canvas'); out.width = OW; out.height = OH; var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.setTransform(OW / cr.w, 0, 0, OH / cr.h, 0, 0);
    var stream = out.captureStream(30);
    // sound: through Web Audio (works in Chrome and Safari), not played out loud
    var ac = null;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      if (!V._src) V._src = ac.createMediaElementSource(V); else { ac.close(); ac = V._ac; }
      V._ac = ac; var dest = ac.createMediaStreamDestination(); V._src.disconnect(); V._src.connect(dest);
      dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      if (ac.state === 'suspended') await ac.resume();
    } catch (e) { console.warn('no sound track', e); }
    outExt = /mp4/.test(type) ? 'mp4' : 'webm';
    var chunks = [], rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12e6, audioBitsPerSecond: 192000 });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var prog = $('#clProg');
    V.muted = false; V.volume = 1; V.pause(); V.currentTime = from;
    await new Promise(function (ok) { V.onseeked = function () { V.onseeked = null; ok(); }; });
    frame(ctx, W, H, cr);
    var done = new Promise(function (ok) { rec.onstop = ok; });
    var stopped = false, stop = function () { if (stopped) return; stopped = true; V.pause(); try { rec.stop(); } catch (e) {} };
    var tick = function () {
      if (stopped) return;
      frame(ctx, W, H, cr);
      prog.innerHTML = '✨ Making it… <b>' + fmt(V.currentTime - from) + '</b> of ' + fmt(to - from) + ' — keep this page open (it plays through once).';
      if (V.currentTime >= to - 0.03 || V.ended) return stop();
      if (V.requestVideoFrameCallback) V.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
    };
    V.onended = stop;
    rec.start(500);
    try { await V.play(); } catch (e) { stop(); prog.textContent = '⚠️ Couldn’t play the video — tap ✨ Make the clean video again.'; }
    if (V.requestVideoFrameCallback) V.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
    await done;
    V.muted = true; V.onended = null;
    var blob = new Blob(chunks, { type: type.split(';')[0] });
    busy = false; $('#clGo').disabled = false; $('#clPrev').disabled = false;
    if (!blob.size) { prog.textContent = '⚠️ Something went wrong making the video — please try again.'; return; }
    outUrl = URL.createObjectURL(blob);
    prog.textContent = '✅ Done — ' + OW + '×' + OH + ' (1080p HD)' + (Math.min(W, H) < 1000 ? '. Your original was smaller than 1080, so it’s sized up — it won’t look sharper than the original.' : '.');
    showOut(blob.size);
  }
  function showOut(size) {
    var el = $('#clOut'); if (!el || !outUrl) return;
    var name = (file ? file.name.replace(/\.[^.]+$/, '') : 'video') + '-clean.' + outExt;
    el.innerHTML = '<video src="' + outUrl + '" controls playsinline style="display:block;max-width:100%;max-height:60vh;margin:12px auto 0;border-radius:10px;background:#000"></video>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center"><a class="btn primary" href="' + outUrl + '" download="' + esc(name) + '">⬇️ Download' + (size ? ' (' + (size / 1048576).toFixed(1) + ' MB)' : '') + '</a>' +
      (outExt === 'webm' ? '<span class="muted" style="font-size:12.5px">This browser saved it as .webm — Instagram prefers MP4. For MP4, use Safari or an up-to-date Chrome.</span>' : '<span class="muted" style="font-size:12.5px">1080p HD MP4 — ready for Instagram, TikTok and WhatsApp.</span>') + '</div>';
  }
  window.HQClean = { init: function (o) { X = o; }, view: view };
})();
