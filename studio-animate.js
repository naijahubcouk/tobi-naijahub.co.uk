/*
 * Auntie Tobi Business Studio — 🎬 animations for the Design maker.
 * Works with every Design maker template: each slide is drawn three times by TobiCarousel.draw
 * (plain background · background + logo/number/handle · the finished slide). The differences between
 * those pictures give separate layers (background, "chrome", words), so the words can animate in
 * over the real background without boxes or ghosting. Videos are made on the member's device
 * (WebCodecs + mp4-muxer from /vendor) — no AI, no credits, nothing uploaded.
 *
 *   TobiAnimate.STYLES            [[id, label]]
 *   TobiAnimate.frame(ctx, d, i, A, t)          draw slide i at time t (seconds) into ctx (canvas sized to the design)
 *   TobiAnimate.exportVideos(d, A, name, onProgress)  → zip (or one MP4 for a single post)
 *   TobiAnimate.exportReel(d, A, name, onProgress)    → one 1080×1920 MP4 of all slides
 *   TobiAnimate.invalidate()      after any edit
 */
(function () {
  'use strict';
  var FPS = 30, DUR = 5, PAD = 12;
  var STYLES = [['none', 'No animation'], ['pop', '💥 Pop & slide'], ['wipe', '🖍️ Wipe-in'], ['lines', '📜 Line-by-line'], ['fade', '🌙 Calm fade']];
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function prog(t, s, len) { return clamp((t - s) / len, 0, 1); }
  function eOut(p) { return 1 - Math.pow(1 - p, 3); }
  function eBack(p) { var c = 1.6, d = p - 1; return 1 + (c + 1) * d * d * d + c * d * d; }
  function animOf(d) { var a = d.anim || {}; return { style: STYLES.some(function (s) { return s[0] === a.style; }) ? a.style : 'none', zoom: a.zoom !== false, light: !!a.light }; }

  // ── layers (cached per slide + design) ──
  var cache = {};
  function invalidate() { cache = {}; }
  function clone(d) { return JSON.parse(JSON.stringify(d)); }
  function keyOf(d, i, A) { var x = clone(d); delete x.caption; delete x.hashtags; delete x.anim; return i + '|' + JSON.stringify(x) + '|' + Object.keys((A && A.images) || {}).join(',') + '|' + (A && A.logo ? 1 : 0); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function diffLayer(a, b, w, h) {
    // pixels of b that differ from a; everything else transparent
    var ca = a.getContext('2d').getImageData(0, 0, w, h).data, cbImg = b.getContext('2d').getImageData(0, 0, w, h), cb = cbImg.data;
    for (var p = 0; p < cb.length; p += 4) {
      if (Math.abs(ca[p] - cb[p]) + Math.abs(ca[p + 1] - cb[p + 1]) + Math.abs(ca[p + 2] - cb[p + 2]) < 6) cb[p + 3] = 0;
    }
    var out = canvas(w, h); out.getContext('2d').putImageData(cbImg, 0, 0); return out;
  }
  function layers(d, i, A) {
    var k = keyOf(d, i, A);
    if (cache[i] && cache[i].key === k) return cache[i];
    var full = canvas(10, 10), r = TobiCarousel.draw(full, d, i, A), w = r.width, h = r.height;
    var empty = clone(d); empty.slides[i].headline = ''; empty.slides[i].body = ''; empty.cta = ''; empty.swipe = false;
    var chromeD = clone(empty);
    var plainD = clone(empty); plainD.logo = false; plainD.numbers = false; plainD.handle = '';
    var plain = canvas(10, 10); TobiCarousel.draw(plain, plainD, i, A);
    var withChrome = canvas(10, 10); TobiCarousel.draw(withChrome, chromeD, i, A);
    var L = { key: k, w: w, h: h, regions: r.regions || {}, full: full, plain: plain, chrome: diffLayer(plain, withChrome, w, h), words: diffLayer(withChrome, full, w, h) };
    cache[i] = L;
    return L;
  }

  // ── one frame ──
  function piece(ctx, src, rect, alpha, dy, clipW, clipH) {
    if (alpha <= 0 || !rect) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.rect(rect.x - PAD, rect.y - PAD, (rect.w + PAD * 2) * (clipW == null ? 1 : clipW), (rect.h + PAD * 2) * (clipH == null ? 1 : clipH)); ctx.clip();
    ctx.drawImage(src, 0, dy || 0);
    ctx.restore();
  }
  function grow(r, pad) { return r ? { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 } : null; }
  function frame(ctx, d, i, A, t) {
    var L = layers(d, i, A), a = animOf(d), w = L.w, h = L.h;
    if (a.style === 'none' && !a.zoom && !a.light) { ctx.drawImage(L.full, 0, 0); return; }
    // background (+ slow photo zoom)
    ctx.drawImage(L.plain, 0, 0);
    var ph = L.regions.photo;
    if (ph && a.zoom) {
      var z = 1 + 0.07 * clamp(t / DUR, 0, 1), sw = ph.w / z, sh = ph.h / z;
      ctx.save(); ctx.beginPath(); ctx.rect(ph.x, ph.y, ph.w, ph.h); ctx.clip();
      ctx.drawImage(L.plain, ph.x + (ph.w - sw) / 2, ph.y + (ph.h - sh) / 2, sw, sh, ph.x, ph.y, ph.w, ph.h); ctx.restore();
    }
    if (a.light) {
      var lx = -w * 0.6 + (w * 2.2) * ((t % DUR) / DUR), g = ctx.createLinearGradient(lx, 0, lx + w * 0.5, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
    ctx.drawImage(L.chrome, 0, 0);
    if (a.style === 'none') { ctx.drawImage(L.words, 0, 0); return; }
    var head = grow(L.regions.head, 0), body = grow(L.regions.body, 0);
    var S = { pop: [0.2, 0.55, 0.7, 0.55, 1.3], wipe: [0.2, 0.75, 0.85, 0.95, 1.6], lines: [0.2, 0.7, 0.85, 1.5, 2.3], fade: [0.3, 0.9, 1.0, 1.0, 1.9] }[a.style];
    var ph1 = prog(t, S[0], S[1]), ph2 = prog(t, S[2], S[3]), ph3 = prog(t, S[4], 0.6);
    // the words outside the headline/body boxes (button, "Swipe", accent bar) fade in last
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h);
    [head, body].forEach(function (r) { if (r) { ctx.rect(r.x + r.w + PAD, r.y - PAD, -(r.w + PAD * 2), r.h + PAD * 2); } });
    ctx.clip('evenodd'); ctx.globalAlpha = eOut(ph3); ctx.drawImage(L.words, 0, 0); ctx.restore();
    function show(r, p, big) {
      if (!r || p <= 0) return;
      if (a.style === 'pop') piece(ctx, L.words, r, Math.min(1, p * 1.7), (1 - eBack(p)) * (big ? 70 : 50));
      else if (a.style === 'wipe') piece(ctx, L.words, r, 1, 0, eOut(p), null);
      else if (a.style === 'lines') piece(ctx, L.words, r, 1, 0, null, p);
      else piece(ctx, L.words, r, eOut(p), (1 - eOut(p)) * 18);
    }
    show(head, ph1, true); show(body, ph2, false);
  }

  // ── video ──
  function canMp4() { return typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function' && window.Mp4Muxer; }
  async function pickCodec(w, h) {
    var tries = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42002a', 'avc'], ['vp09.00.40.08', 'vp9']];
    for (var i = 0; i < tries.length; i++) {
      try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i][0], width: w, height: h, bitrate: 8e6, framerate: FPS }); if (r && r.supported) return { codec: tries[i][0], mux: tries[i][1] }; } catch (e) { /* next */ }
    }
    return null;
  }
  async function encode(w, h, seconds, render, onFrame) {
    var cv = canvas(w, h), ctx = cv.getContext('2d'), frames = Math.round(seconds * FPS);
    var pick = canMp4() ? await pickCodec(w, h) : null;
    if (pick) {
      var muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: pick.mux, width: w, height: h, frameRate: FPS }, fastStart: 'in-memory' });
      var failed = null, enc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { failed = e; } });
      var cfg = { codec: pick.codec, width: w, height: h, bitrate: 8e6, framerate: FPS }; if (pick.mux === 'avc') cfg.avc = { format: 'avc' };
      enc.configure(cfg);
      for (var f = 0; f < frames; f++) {
        if (failed) throw failed;
        ctx.clearRect(0, 0, w, h); render(ctx, f / FPS);
        var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
        if (onFrame) onFrame(f + 1, frames);
        if (enc.encodeQueueSize > 8) await new Promise(function (r) { setTimeout(r, 5); });
        if (f % 15 === 0) await new Promise(function (r) { setTimeout(r, 0); });
      }
      await enc.flush(); enc.close(); muxer.finalize();
      return { data: new Uint8Array(muxer.target.buffer), ext: 'mp4', mime: 'video/mp4', ok: pick.mux === 'avc' };
    }
    if (!cv.captureStream || typeof MediaRecorder !== 'function') throw new Error('This browser can’t make videos — please use Chrome or Edge, or a recent iPhone.');
    var mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
    var rec = new MediaRecorder(cv.captureStream(FPS), { mimeType: mime, videoBitsPerSecond: 8e6 }), parts = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
    var done = new Promise(function (r) { rec.onstop = r; }); rec.start(); var t0 = performance.now();
    await new Promise(function (resolve) { (function tick() { var t = (performance.now() - t0) / 1000; ctx.clearRect(0, 0, w, h); render(ctx, Math.min(t, seconds)); if (onFrame) onFrame(Math.min(frames, Math.round(t * FPS)), frames); if (t >= seconds) return resolve(); requestAnimationFrame(tick); })(); });
    rec.stop(); await done;
    var blob = new Blob(parts, { type: mime.split(';')[0] });
    return { data: new Uint8Array(await blob.arrayBuffer()), ext: /mp4/.test(mime) ? 'mp4' : 'webm', mime: mime.split(';')[0], ok: /mp4/.test(mime) };
  }
  function dl(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  async function exportVideos(d, A, name, onProgress) {
    var n = d.slides.length, files = [], ok = true;
    for (var i = 0; i < n; i++) {
      var L = layers(d, i, A);
      var v = await encode(L.w, L.h, DUR, function (ctx, t) { frame(ctx, d, i, A, t); }, function (f, tot) { if (onProgress) onProgress((i + f / tot) / n, n > 1 ? 'Making video ' + (i + 1) + ' of ' + n + '…' : 'Making your video… ' + Math.round(f / tot * 100) + '%'); });
      if (!v.ok) ok = false;
      files.push({ name: name + (n > 1 ? '-' + ('0' + (i + 1)).slice(-2) : '') + '.' + v.ext, data: v.data, mime: v.mime });
    }
    if (files.length === 1) dl(new Blob([files[0].data], { type: files[0].mime }), files[0].name);
    else dl(TobiCarousel.zip(files.map(function (f) { return { name: f.name, data: f.data }; })), name + '-videos.zip');
    return { ok: ok, count: files.length };
  }
  async function exportReel(d, A, name, onProgress) {
    var n = d.slides.length, RW = 1080, RH = 1920, per = 4, TR = 0.45;
    var first = layers(d, 0, A), sw = first.w, sh = first.h, scale = Math.min(RW / sw, RH / sh), dw = sw * scale, dh = sh * scale, top = (RH - dh) / 2;
    var cur = canvas(sw, sh), prev = canvas(sw, sh), cx = cur.getContext('2d'), px = prev.getContext('2d');
    var c1 = d.color1 || '#057A44';
    var v = await encode(RW, RH, n * per, function (ctx, T) {
      var i = Math.min(n - 1, Math.floor(T / per)), t = T - i * per;
      if (dh < RH) {
        var g = ctx.createLinearGradient(0, 0, 0, RH); g.addColorStop(0, c1); g.addColorStop(1, '#0F1E36'); ctx.fillStyle = g; ctx.fillRect(0, 0, RW, RH);
        ctx.fillStyle = 'rgba(255,255,255,.85)'; for (var k = 0; k < n; k++) { ctx.globalAlpha = k === i ? 1 : 0.4; ctx.beginPath(); ctx.arc(RW / 2 + (k - (n - 1) / 2) * 34, RH - top / 2, k === i ? 11 : 8, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      }
      cx.clearRect(0, 0, sw, sh); frame(cx, d, i, A, t);
      var p = i > 0 ? eOut(prog(t, 0, TR)) : 1;
      if (p < 1) { px.clearRect(0, 0, sw, sh); frame(px, d, i - 1, A, per); ctx.drawImage(prev, -RW * p + (RW - dw) / 2, top, dw, dh); }
      ctx.drawImage(cur, RW * (1 - p) + (RW - dw) / 2, top, dw, dh);
    }, function (f, tot) { if (onProgress) onProgress(f / tot, 'Making the Reel… ' + Math.round(f / tot * 100) + '%'); });
    dl(new Blob([v.data], { type: v.mime }), name + '-reel.' + v.ext);
    return { ok: v.ok };
  }

  window.TobiAnimate = { STYLES: STYLES, DUR: DUR, frame: frame, invalidate: invalidate, exportVideos: exportVideos, exportReel: exportReel, animOf: animOf, canVideo: function () { return canMp4() || typeof MediaRecorder === 'function'; } };
})();
