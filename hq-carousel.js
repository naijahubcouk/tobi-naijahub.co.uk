/*
 * Auntie Tobi HQ — 🎬 Animated Carousel Maker.
 * Draws Instagram carousel slides (1080×1350) on a canvas with animations, plays them live in HQ,
 * and turns them into MP4 videos (WebCodecs + mp4-muxer) and PNGs, zipped with JSZip — all in the browser.
 * Also makes a 1080×1920 Reel of all the slides.
 *
 * HQ calls HQCar.init({ api, sheet, toast, esc, S, go }) once, then HQCar.view() for the #cars page.
 * The drawing part (HQCar.draw) has no HQ dependencies.
 */
(function () {
  'use strict';
  var W = 1080, H = 1350, FPS = 30, DUR = 5;
  var FONT = "'Poppins', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
  var THEMES = {
    green:  { name: 'Green',  bg: '#057A44', bg2: '#03532E', ink: '#FFFFFF', sub: 'rgba(255,255,255,.88)', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36', card: 'rgba(255,255,255,.12)', shape: 'rgba(255,255,255,.07)', shape2: 'rgba(255,184,28,.16)' },
    navy:   { name: 'Navy',   bg: '#0F1E36', bg2: '#1F3560', ink: '#FFFFFF', sub: 'rgba(255,255,255,.85)', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36', card: 'rgba(255,255,255,.09)', shape: 'rgba(255,255,255,.05)', shape2: 'rgba(5,122,68,.35)' },
    white:  { name: 'White',  bg: '#FFFFFF', bg2: '#F3F5F7', ink: '#0F1E36', sub: '#4B5563', accent: '#057A44', hl: '#FFD25E', hlInk: '#0F1E36', card: 'rgba(15,30,54,.05)', shape: 'rgba(15,30,54,.045)', shape2: 'rgba(5,122,68,.10)' },
    cream:  { name: 'Cream',  bg: '#FBF6EC', bg2: '#F1E4C8', ink: '#0F1E36', sub: '#3F4A5C', accent: '#057A44', hl: '#FFD25E', hlInk: '#0F1E36', card: 'rgba(5,122,68,.08)', shape: 'rgba(5,122,68,.07)', shape2: 'rgba(255,184,28,.25)' },
    gold:   { name: 'Gold',   bg: '#FFB81C', bg2: '#F08C00', ink: '#0F1E36', sub: '#1F2937', accent: '#057A44', hl: '#FFFFFF', hlInk: '#0F1E36', card: 'rgba(255,255,255,.35)', shape: 'rgba(15,30,54,.07)', shape2: 'rgba(5,122,68,.18)' },
    purple: { name: 'Purple', bg: '#4C1D95', bg2: '#2E1065', ink: '#FFFFFF', sub: 'rgba(255,255,255,.88)', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#2E1065', card: 'rgba(255,255,255,.1)', shape: 'rgba(255,255,255,.06)', shape2: 'rgba(255,184,28,.18)' },
  };
  var ANIMS = { pop: '💥 Pop & slide', type: '⌨️ Typewriter', highlight: '🖍️ Highlight', calm: '🌙 Calm fade' };
  var LAYOUTS = { cover: '🎯 Cover', points: '• Points', steps: '1️⃣ Steps', fact: '💡 Did you know?', stat: '🔢 Big number', quote: '❝ Quote', cta: '💚 Save & share' };

  // ── maths & easing ──
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function prog(t, start, len) { return clamp((t - start) / (len || 0.5), 0, 1); }
  function eOut(p) { return 1 - Math.pow(1 - p, 3); }
  function eBack(p) { var c = 1.7, d = p - 1; return 1 + (c + 1) * d * d * d + c * d * d; }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }

  // ── rich text (**highlight**) ──
  function tokens(text) {
    var out = [], parts = String(text || '').split(/(\*\*[^*]+\*\*)/);
    parts.forEach(function (p) {
      if (!p) return;
      var hl = /^\*\*[^*]+\*\*$/.test(p); if (hl) p = p.slice(2, -2);
      p.split(/(\s+)/).forEach(function (w) { if (w) out.push({ w: w, hl: hl, sp: /^\s+$/.test(w) }); });
    });
    return out;
  }
  function plain(text) { return String(text || '').replace(/\*\*/g, ''); }
  function wrap(ctx, text, maxW) {
    var lines = [], line = [], lw = 0;
    tokens(text).forEach(function (tk) {
      if (tk.w.indexOf('\n') >= 0) { lines.push(line); line = []; lw = 0; return; }
      var w = ctx.measureText(tk.w).width;
      if (tk.sp) { if (line.length) { line.push({ w: ' ', hl: tk.hl, sp: true, width: w }); lw += w; } return; }
      if (lw + w > maxW && line.length) { while (line.length && line[line.length - 1].sp) { lw -= line.pop().width; } lines.push(line); line = []; lw = 0; }
      line.push({ w: tk.w, hl: tk.hl, width: w }); lw += w;
    });
    if (line.length) lines.push(line);
    return lines.map(function (l) { while (l.length && l[l.length - 1].sp) l.pop(); return l; });
  }
  // Picks the biggest font size (down to min) where the text fits in maxLines.
  function fit(ctx, text, maxW, maxLines, size, min, weight) {
    for (var s = size; s >= min; s -= 4) { ctx.font = weight + ' ' + s + 'px ' + FONT; var l = wrap(ctx, text, maxW); if (l.length <= maxLines) return { size: s, lines: l }; }
    ctx.font = weight + ' ' + min + 'px ' + FONT; return { size: min, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
  }
  // Draws wrapped lines; o: { x, y, lh, color, hl, hlInk, hlP (0..1), chars (typewriter), align: left|center, alpha }
  function drawLines(ctx, lines, o) {
    var shown = o.chars == null ? Infinity : o.chars, used = 0;
    ctx.textBaseline = 'alphabetic';
    lines.forEach(function (line, li) {
      var lw = line.reduce(function (n, t) { return n + t.width; }, 0);
      var x = o.align === 'center' ? o.x - lw / 2 : o.x, y = o.y + li * o.lh;
      line.forEach(function (tk) {
        if (used >= shown) return;
        var txt = tk.w; if (used + txt.length > shown) txt = txt.slice(0, shown - used);
        used += tk.w.length;
        var w = ctx.measureText(txt).width;
        if (tk.hl && o.hlP > 0) {
          ctx.save(); ctx.fillStyle = o.hl; ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * 0.95;
          var pad = tk.sp ? 0 : o.lh * 0.08, top = y - o.lh * 0.72, hgt = o.lh * 0.86;
          if (tk.sp) ctx.fillRect(x - 1, top, (w + 2) * eOut(o.hlP), hgt);
          else { roundRect(ctx, x - pad, top, (w + pad * 2) * eOut(o.hlP), hgt, hgt * 0.18); ctx.fill(); }
          ctx.restore();
        }
        ctx.fillStyle = tk.hl && o.hlP > 0.35 ? o.hlInk : o.color;
        ctx.fillText(txt, x, y);
        x += w;
      });
      used += 1;
    });
  }
  function charCount(lines) { return lines.reduce(function (n, l) { return n + l.reduce(function (m, t) { return m + t.w.length; }, 0) + 1; }, 0); }
  function roundRect(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, Math.abs(w) / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ── background ──
  function drawBg(ctx, th, t, idx, motion) {
    var g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, th.bg); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var m = motion ? t : 0;
    ctx.save();
    for (var i = 0; i < 7; i++) {
      var s = idx * 13 + i, x = rnd(s) * W, y = rnd(s + 0.5) * H, r = 60 + rnd(s + 1.3) * 170;
      x += Math.sin(m * 0.5 + i) * 28; y += Math.cos(m * 0.4 + i * 1.7) * 24;
      ctx.fillStyle = i % 3 === 0 ? th.shape2 : th.shape;
      ctx.save(); ctx.translate(x, y); ctx.rotate(m * 0.12 * (i % 2 ? 1 : -1) + i);
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
      else if (i % 3 === 1) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fill(); }
      else { ctx.lineWidth = 18; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    // Ankara-style dotted band
    ctx.globalAlpha = 0.5; ctx.fillStyle = th.shape2;
    var off = (m * 18) % 60;
    for (var k = -1; k < 20; k++) { var bx = k * 60 + off; ctx.beginPath(); ctx.arc(bx, H - 26, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(bx + 22, H - 30, 16, 8); }
    ctx.restore();
  }
  function drawChrome(ctx, th, car, idx, n, t) {
    // slide counter
    ctx.save(); ctx.font = '700 30px ' + FONT;
    var lab = (idx + 1) + '/' + n, lw = ctx.measureText(lab).width + 36;
    ctx.fillStyle = th.card; roundRect(ctx, W - 60 - lw, 56, lw, 54, 27); ctx.fill();
    ctx.fillStyle = th.ink; ctx.textAlign = 'center'; ctx.fillText(lab, W - 60 - lw / 2, 93); ctx.restore();
    if (car.handle !== false) { ctx.save(); ctx.font = '700 30px ' + FONT; ctx.fillStyle = th.sub; ctx.globalAlpha = 0.9; ctx.fillText('@auntietobi_uk', 64, H - 70); ctx.restore(); }
    if (idx < n - 1) {
      var b = Math.sin(t * 4) * 10;
      ctx.save(); ctx.font = '800 32px ' + FONT; ctx.fillStyle = th.ink; ctx.textAlign = 'right';
      ctx.globalAlpha = 0.6 + 0.4 * prog(t, 1.2, 0.6); ctx.fillText('Swipe →', W - 64 + b, H - 70); ctx.restore();
    }
  }

  // ── element entrances ──
  function enter(ctx, mode, t, start, fn) {
    var p = prog(t, start, mode === 'calm' ? 0.9 : 0.55);
    if (p <= 0) return;
    ctx.save();
    if (mode === 'calm' || mode === 'type' || mode === 'highlight') { ctx.globalAlpha *= eOut(p); ctx.translate(0, (1 - eOut(p)) * 24); }
    else { ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate(0, (1 - eBack(p)) * 70); }
    fn(p); ctx.restore();
  }
  function hlProgress(mode, t, start) { return mode === 'calm' ? prog(t, start + 0.4, 1.2) : mode === 'highlight' ? prog(t, start + 0.5, 0.9) : prog(t, start + 0.35, 0.45); }

  // ── one slide at time t ──
  function draw(ctx, car, idx, t, images) {
    var s = car.slides[idx] || {}, n = car.slides.length, th = THEMES[car.theme] || THEMES.green, mode = car.anim || 'pop';
    ctx.save(); ctx.clearRect(0, 0, W, H);
    var cover = s.layout === 'cover', img = cover && images && images.cover;
    if (img) {
      var z = 1 + (car.motion === false ? 0 : 0.08 * t / DUR), iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max(W / iw, H / ih) * z;
      ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
      var gr = ctx.createLinearGradient(0, H * 0.25, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(10,20,35,.72)'); gr.addColorStop(1, 'rgba(10,20,35,.92)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    } else drawBg(ctx, th, t, idx, car.motion !== false);
    var ink = img ? '#FFFFFF' : th.ink, sub = img ? 'rgba(255,255,255,.9)' : th.sub;
    var L = 80, MW = W - 160;
    ctx.textAlign = 'left';
    var fn = LAY[s.layout] || LAY.points;
    fn(ctx, s, t, { th: th, mode: mode, ink: ink, sub: sub, L: L, MW: MW, img: !!img, idx: idx, n: n });
    drawChrome(ctx, img ? Object.assign({}, th, { ink: '#FFFFFF', sub: 'rgba(255,255,255,.85)', card: 'rgba(0,0,0,.35)' }) : th, car, idx, n, t);
    ctx.restore();
  }
  function emojiAt(ctx, e, x, y, size, t, start, mode) {
    if (!e) return;
    enter(ctx, mode === 'calm' ? 'calm' : 'pop', t, start, function (p) {
      ctx.save(); var sc = mode === 'calm' ? 1 : 0.6 + 0.4 * eBack(p); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.font = size + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(e, 0, 0); ctx.restore();
    });
  }
  function titleBlock(ctx, s, t, c, y, maxLines, size, start) {
    if (!s.title) return y;
    var f = fit(ctx, s.title, c.MW, maxLines, size, 52, '800');
    var lh = f.size * 1.16;
    enter(ctx, c.mode, t, start, function () {
      ctx.font = '800 ' + f.size + 'px ' + FONT;
      drawLines(ctx, f.lines, { x: c.L, y: y + f.size, lh: lh, color: c.ink, hl: c.th.hl, hlInk: c.th.hlInk, hlP: hlProgress(c.mode, t, start) });
    });
    return y + f.size * 0.25 + lh * f.lines.length;
  }
  function bodyText(ctx, text, t, c, y, size, start, maxLines, opts) {
    opts = opts || {};
    var f = fit(ctx, text, c.MW - (opts.indent || 0), maxLines || 6, size, 34, opts.weight || '600');
    var lh = f.size * 1.36, typed = c.mode === 'type';
    var total = charCount(f.lines), chars = typed ? Math.floor(total * prog(t, start, Math.max(0.8, total / 34))) : null;
    var draw1 = function () {
      ctx.font = (opts.weight || '600') + ' ' + f.size + 'px ' + FONT;
      drawLines(ctx, f.lines, { x: opts.center ? W / 2 : c.L + (opts.indent || 0), y: y + f.size, lh: lh, color: opts.color || c.sub, hl: c.th.hl, hlInk: c.th.hlInk, hlP: typed ? (chars >= total ? prog(t, start + total / 34, 0.4) : 0) : hlProgress(c.mode, t, start), chars: chars, align: opts.center ? 'center' : 'left' });
    };
    if (typed) { if (t >= start) draw1(); } else enter(ctx, c.mode, t, start, draw1);
    return y + lh * f.lines.length;
  }
  // heights (same maths as drawing) so each slide's content can be centred
  function hTitle(ctx, text, c, maxLines, size) { if (!text) return 0; var f = fit(ctx, text, c.MW, maxLines, size, 52, '800'); return f.size * 0.25 + f.size * 1.16 * f.lines.length; }
  function hBody(ctx, text, c, size, maxLines, indent, weight) { if (!text) return 0; var f = fit(ctx, text, c.MW - (indent || 0), maxLines || 6, size, 34, weight || '600'); return f.size * 1.36 * f.lines.length; }
  function itemsOf(s) { return s.bullets && s.bullets.length ? s.bullets : (s.text ? [s.text] : []); }
  function itemH(ctx, b, c) { var f = fit(ctx, b, c.MW - 150, 3, 46, 34, '600'); return Math.max(110, f.size * 1.32 * f.lines.length + 52); }
  function startY(h, min) { return Math.max(min || 170, Math.round((H - h) / 2 - 30)); }
  var LAY = {
    cover: function (ctx, s, t, c) {
      if (c.img) {
        var hh = (s.emoji ? 130 : 0) + hTitle(ctx, s.title, c, 4, 96) + (s.text ? 10 + hBody(ctx, s.text, c, 42, 2) : 0);
        var y0 = H - 150 - hh;
        if (s.emoji) { emojiAt(ctx, s.emoji, c.L + 60, y0 + 50, 96, t, 0.1, c.mode); y0 += 130; }
        var y = titleBlock(ctx, s, t, c, y0, 4, 96, 0.25);
        if (s.text) bodyText(ctx, s.text, t, c, y + 10, 42, 0.9, 2, { color: c.sub });
        return;
      }
      var h = (s.emoji ? 190 : 0) + hTitle(ctx, s.title, c, 5, 104) + 70 + (s.text ? hBody(ctx, s.text, c, 44, 3) : 0);
      var yy = startY(h);
      if (s.emoji) { emojiAt(ctx, s.emoji, c.L + 75, yy + 75, 150, t, 0.05, c.mode); yy += 190; }
      yy = titleBlock(ctx, s, t, c, yy, 5, 104, 0.25);
      var by = yy + 22;
      enter(ctx, c.mode, t, 0.5, function (p) { ctx.fillStyle = c.th.accent; roundRect(ctx, c.L, by, 160 * eOut(p), 14, 7); ctx.fill(); });
      if (s.text) bodyText(ctx, s.text, t, c, yy + 60, 44, 0.9, 3, { color: c.sub });
    },
    points: function (ctx, s, t, c, steps) {
      var items = itemsOf(s), gap = 34;
      var h = (s.emoji ? 120 : 0) + hTitle(ctx, s.title, c, 3, 80) + 40 + items.reduce(function (n, b) { return n + itemH(ctx, b, c) + gap; }, 0) - gap;
      var y = startY(h);
      if (s.emoji) { emojiAt(ctx, s.emoji, c.L + 45, y + 45, 84, t, 0.05, c.mode); y += 120; }
      y = titleBlock(ctx, s, t, c, y, 3, 80, 0.15) + 40;
      var start = 0.6, step = c.mode === 'calm' ? 0.45 : 0.32, tcur = start;
      items.forEach(function (b, i) {
        var f = fit(ctx, b, c.MW - 150, 3, 46, 34, '600'), lh = f.size * 1.32, hgt = itemH(ctx, b, c);
        var st = c.mode === 'type' ? tcur : start + i * step;
        if (c.mode === 'type') tcur += Math.max(0.6, plain(b).length / 34) + 0.15;
        var yy = y;
        enter(ctx, c.mode === 'type' ? 'calm' : c.mode, t, st, function () {
          ctx.fillStyle = c.th.card; roundRect(ctx, c.L, yy, c.MW, hgt, 28); ctx.fill();
          ctx.fillStyle = c.th.accent; ctx.beginPath(); ctx.arc(c.L + 62, yy + hgt / 2, 32, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = c.th.accent === '#FFB81C' ? '#0F1E36' : '#FFFFFF';
          ctx.font = '800 34px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(steps ? String(i + 1) : '✓', c.L + 62, yy + hgt / 2 + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        });
        var ty = y + (hgt - lh * f.lines.length) / 2 - f.size * 0.18;
        bodyText(ctx, b, t, c, ty, f.size, st + 0.05, 3, { indent: 130, color: c.ink, weight: '600' });
        y += hgt + gap;
      });
    },
    steps: function (ctx, s, t, c) { LAY.points(ctx, s, t, c, true); },
    fact: function (ctx, s, t, c) {
      var h = 100 + hTitle(ctx, s.title, c, 3, 78) + 30 + hBody(ctx, s.text, c, 58, 7, 0, '600') + (s.emoji ? 170 : 0);
      var y = startY(h);
      var ly = y;
      enter(ctx, c.mode, t, 0.05, function () {
        ctx.font = '800 34px ' + FONT; var lab = '💡  DID YOU KNOW?', lw = ctx.measureText(lab).width + 56;
        ctx.fillStyle = c.th.accent; roundRect(ctx, c.L, ly, lw, 70, 35); ctx.fill();
        ctx.fillStyle = c.th.accent === '#FFB81C' ? '#0F1E36' : '#FFFFFF'; ctx.fillText(lab, c.L + 28, ly + 47);
      });
      y = titleBlock(ctx, s, t, c, y + 100, 3, 78, 0.25) + 30;
      if (s.text) y = bodyText(ctx, s.text, t, c, y, 58, 0.7, 7, { color: c.ink, weight: '600' });
      if (s.emoji) emojiAt(ctx, s.emoji, W - 170, y + 90, 130, t, 1.0, c.mode);
    },
    stat: function (ctx, s, t, c) {
      var st = s.stat || {}, v = Number(st.value) || 0, dec = Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0;
      var full = (st.prefix || '') + v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (st.suffix || '');
      var size = 230; ctx.font = '800 ' + size + 'px ' + FONT;
      while (ctx.measureText(full).width > c.MW && size > 90) { size -= 10; ctx.font = '800 ' + size + 'px ' + FONT; }
      var h = (s.emoji ? 130 : 0) + hTitle(ctx, s.title, c, 3, 72) + 40 + size + 50 + hBody(ctx, st.label, c, 50, 4);
      var y = startY(h);
      if (s.emoji) { emojiAt(ctx, s.emoji, c.L + 50, y + 50, 96, t, 0.05, c.mode); y += 130; }
      y = titleBlock(ctx, s, t, c, y, 3, 72, 0.1) + 40;
      var p = c.mode === 'calm' ? prog(t, 0.5, 1.6) : prog(t, 0.45, 1.5);
      var num = (st.prefix || '') + (v * eOut(p)).toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (st.suffix || '');
      var cy = y + size * 0.82;
      enter(ctx, 'pop', t, 0.35, function (q) {
        ctx.save(); ctx.translate(c.L, cy); var sc = 0.85 + 0.15 * eBack(q); ctx.scale(sc, sc);
        ctx.fillStyle = c.th.accent; ctx.textAlign = 'left'; ctx.font = '800 ' + size + 'px ' + FONT; ctx.fillText(num, 0, 0); ctx.restore();
      });
      if (st.label) bodyText(ctx, st.label, t, c, cy + 40, 50, 1.4, 4, { color: c.ink });
    },
    quote: function (ctx, s, t, c) {
      var h = 170 + hBody(ctx, s.text, c, 72, 6, 0, '800') + (s.title ? 30 + hBody(ctx, '— ' + s.title, c, 40, 2) : 0);
      var y = startY(h);
      var qy = y;
      enter(ctx, c.mode, t, 0.05, function () { ctx.font = '800 300px Georgia, serif'; ctx.fillStyle = c.th.accent; ctx.fillText('“', c.L - 10, qy + 230); });
      y += 170;
      if (s.text) y = bodyText(ctx, s.text, t, c, y, 72, 0.35, 6, { color: c.ink, weight: '800' });
      if (s.title) bodyText(ctx, '— ' + s.title, t, c, y + 30, 40, 1.2, 2, { color: c.sub });
      if (s.emoji) emojiAt(ctx, s.emoji, W - 170, qy + 110, 110, t, 0.9, c.mode);
    },
    cta: function (ctx, s, t, c) {
      var title = s.title || 'Save this for later 💚';
      var f = fit(ctx, title, c.MW, 3, 96, 56, '800'), lh = f.size * 1.15;
      var h = (s.emoji ? 190 : 0) + lh * f.lines.length + 50 + (s.text ? hBody(ctx, s.text, c, 44, 3) : 0) + 60 + 100;
      var y = startY(h);
      if (s.emoji) { emojiAt(ctx, s.emoji, W / 2, y + 75, 150, t, 0.05, c.mode); y += 190; }
      var ty = y;
      enter(ctx, c.mode, t, 0.25, function () {
        ctx.font = '800 ' + f.size + 'px ' + FONT;
        drawLines(ctx, f.lines, { x: W / 2, y: ty + f.size, lh: lh, color: c.ink, hl: c.th.hl, hlInk: c.th.hlInk, hlP: hlProgress(c.mode, t, 0.25), align: 'center' });
      });
      y += lh * f.lines.length + 50;
      if (s.text) y = bodyText(ctx, s.text, t, c, y, 44, 0.7, 3, { center: true, color: c.sub });
      var btns = ['🔖 Save', '📤 Share', '➕ Follow'], bw = 270, gap = 30, x0 = (W - (bw * 3 + gap * 2)) / 2, by = y + 60;
      btns.forEach(function (b, i) {
        enter(ctx, c.mode === 'calm' ? 'calm' : 'pop', t, 1.1 + i * 0.25, function () {
          var bounce = c.mode === 'calm' || t < 2.4 ? 0 : Math.sin((t - 2.4 - i * 0.2) * 5) * 6;
          ctx.fillStyle = c.th.accent; roundRect(ctx, x0 + i * (bw + gap), by + bounce, bw, 100, 50); ctx.fill();
          ctx.fillStyle = c.th.accent === '#FFB81C' ? '#0F1E36' : '#FFFFFF'; ctx.font = '800 38px ' + FONT; ctx.textAlign = 'center';
          ctx.fillText(b, x0 + i * (bw + gap) + bw / 2, by + bounce + 64); ctx.textAlign = 'left';
        });
      });
    },
  };

  // ── images ──
  var imgCache = {};
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
    return imgCache[src];
  }
  function coverSrc(car) { return car._coverData || (car.coverImg ? '/.netlify/functions/studio-hq?subimg=' + encodeURIComponent(car.coverImg) : ''); }
  async function images(car) { return { cover: await loadImg(coverSrc(car)) }; }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['800 80px Poppins', '700 40px Poppins', '600 40px Poppins'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }

  // ── video export ──
  function canMp4() { return typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function' && window.Mp4Muxer; }
  async function pickCodec(w, h) {
    var tries = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42002a', 'avc'], ['vp09.00.40.08', 'vp9']];
    for (var i = 0; i < tries.length; i++) {
      try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i][0], width: w, height: h, bitrate: 8e6, framerate: FPS }); if (r && r.supported) return { codec: tries[i][0], mux: tries[i][1] }; } catch (e) { /* next */ }
    }
    return null;
  }
  // render(ctx, t) draws one frame. Returns { data: Uint8Array, ext, mime, instagramReady }.
  async function encode(w, h, seconds, render, onFrame) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var ctx = cv.getContext('2d');
    var frames = Math.round(seconds * FPS);
    var pick = canMp4() ? await pickCodec(w, h) : null;
    if (pick) {
      var muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: pick.mux, width: w, height: h, frameRate: FPS }, fastStart: 'in-memory' });
      var failed = null;
      var enc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: function (e) { failed = e; } });
      var cfg = { codec: pick.codec, width: w, height: h, bitrate: 8e6, framerate: FPS };
      if (pick.mux === 'avc') cfg.avc = { format: 'avc' };
      enc.configure(cfg);
      for (var f = 0; f < frames; f++) {
        if (failed) throw failed;
        render(ctx, f / FPS);
        var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
        if (onFrame) onFrame(f + 1, frames);
        if (enc.encodeQueueSize > 8) await new Promise(function (r) { setTimeout(r, 5); });
        if (f % 15 === 0) await new Promise(function (r) { setTimeout(r, 0); });
      }
      await enc.flush(); enc.close(); muxer.finalize();
      return { data: new Uint8Array(muxer.target.buffer), ext: 'mp4', mime: 'video/mp4', instagramReady: pick.mux === 'avc' };
    }
    // Fallback: record in real time
    if (!cv.captureStream || typeof MediaRecorder !== 'function') throw new Error('This browser can’t make videos — please use Chrome or Edge on a laptop.');
    var mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
    var stream = cv.captureStream(FPS), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), parts = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
    var done = new Promise(function (r) { rec.onstop = r; });
    rec.start(); var t0 = performance.now();
    await new Promise(function (resolve) {
      (function tick() {
        var t = (performance.now() - t0) / 1000; render(ctx, Math.min(t, seconds)); if (onFrame) onFrame(Math.min(frames, Math.round(t * FPS)), frames);
        if (t >= seconds) return resolve(); requestAnimationFrame(tick);
      })();
    });
    rec.stop(); await done;
    var blob = new Blob(parts, { type: mime.split(';')[0] });
    return { data: new Uint8Array(await blob.arrayBuffer()), ext: /mp4/.test(mime) ? 'mp4' : 'webm', mime: mime.split(';')[0], instagramReady: /mp4/.test(mime) };
  }
  function pngOf(car, idx, imgs) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; draw(cv.getContext('2d'), car, idx, DUR, imgs);
    return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/png'); });
  }
  function slug(s) { return String(s || 'carousel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'carousel'; }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  async function exportSlides(car, onProgress) {
    await fontsReady(); var imgs = await images(car), zip = new JSZip(), n = car.slides.length, ready = true;
    for (var i = 0; i < n; i++) {
      var v = await encode(W, H, DUR, function (ctx, t) { draw(ctx, car, i, t, imgs); }, function (f, total) { if (onProgress) onProgress((i + f / total) / (n + 0.2), 'Making slide ' + (i + 1) + ' of ' + n + '…'); });
      if (!v.instagramReady) ready = false;
      zip.file(String(i + 1).padStart(2, '0') + '-slide.' + v.ext, v.data);
      zip.file('images/' + String(i + 1).padStart(2, '0') + '-slide.png', await pngOf(car, i, imgs));
    }
    zip.file('caption.txt', (car.caption || '') + '\n\n' + (car.hashtags || ''));
    if (onProgress) onProgress(0.98, 'Zipping…');
    download(await zip.generateAsync({ type: 'blob' }), 'auntie-tobi-' + slug(car.title) + '.zip');
    return { ready: ready };
  }
  async function exportReel(car, onProgress) {
    await fontsReady(); var imgs = await images(car), n = car.slides.length, RH = 1920, top = (RH - H) / 2, th = THEMES[car.theme] || THEMES.green;
    var slideCv = document.createElement('canvas'); slideCv.width = W; slideCv.height = H; var sctx = slideCv.getContext('2d');
    var prevCv = document.createElement('canvas'); prevCv.width = W; prevCv.height = H; var pctx = prevCv.getContext('2d');
    var per = 4, TR = 0.45;
    var v = await encode(W, RH, n * per, function (ctx, T) {
      var i = Math.min(n - 1, Math.floor(T / per)), t = T - i * per;
      drawBg(ctx, th, T, 99, car.motion !== false);
      ctx.save(); ctx.font = '800 44px ' + FONT; ctx.fillStyle = th.ink; ctx.textAlign = 'center';
      ctx.fillText(plain(car.title || '').slice(0, 40), W / 2, top / 2 + 14); ctx.restore();
      draw(sctx, car, i, t + 0.0001, imgs);
      var p = i > 0 ? eOut(prog(t, 0, TR)) : 1;
      if (p < 1) { draw(pctx, car, i - 1, per, imgs); ctx.drawImage(prevCv, -W * p, top); }
      ctx.drawImage(slideCv, W * (1 - p), top);
      // progress dots
      for (var k = 0; k < n; k++) { ctx.fillStyle = k === i ? th.accent : th.shape2; ctx.beginPath(); ctx.arc(W / 2 + (k - (n - 1) / 2) * 34, RH - top / 2, k === i ? 11 : 8, 0, Math.PI * 2); ctx.fill(); }
    }, function (f, total) { if (onProgress) onProgress(f / total * 0.97, 'Making the Reel… ' + Math.round(f / total * 100) + '%'); });
    download(new Blob([v.data], { type: v.mime }), 'auntie-tobi-reel-' + slug(car.title) + '.' + v.ext);
    return { ready: v.instagramReady };
  }

  // ════════════ HQ screens ════════════
  var X = null; // HQ helpers
  function init(ctx) { X = ctx; }
  function cars() { return X.S.cars || (X.S.cars = []); }
  function fmt(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function shrink(src) {
    return new Promise(function (ok, bad) {
      var im = new Image(), url = typeof src === 'string' ? src : URL.createObjectURL(src);
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        var q = 0.86, out = c.toDataURL('image/jpeg', q); while (out.length > 1500000 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
        ok(out);
      };
      im.onerror = function () { bad(new Error('Couldn’t open that image — try another.')); };
      im.src = url;
    });
  }

  function view() {
    var esc = X.esc;
    document.getElementById('ttl').textContent = 'Animated Carousels';
    document.getElementById('topRight').innerHTML = '<button class="btn primary" id="carNew">＋ New carousel</button>';
    var list = cars();
    document.getElementById('view').innerHTML = '<div class="wrap">' +
      '<div class="note" style="margin-bottom:12px">Make animated Instagram carousels: AI writes the slides, you edit them with a live preview, then download them as videos (MP4) + images, or as one Reel. Videos are made on this device — it works best in Chrome or Edge on a laptop.</div>' +
      (list.length ? '<div class="cargrid">' + list.map(function (c) {
        return '<div class="card carcard" data-copen="' + c.id + '"><canvas class="carthumb" width="216" height="270" data-cthumb="' + c.id + '"></canvas>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15.5px;line-height:1.3">' + esc(c.title) + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:4px">' + c.slides.length + ' slides · ' + esc((THEMES[c.theme] || {}).name || '') + ' · ' + esc(ANIMS[c.anim] || '') + '</div>' +
          '<div style="font-size:13px;margin-top:6px">' + (c.status === 'posted' ? '<span class="as live">● Posted ' + esc(fmt(c.postedAt)) + '</span>' : '<span class="muted">Draft · edited ' + esc(fmt(c.updatedAt)) + '</span>') + '</div>' +
          '<div class="apact" style="margin-top:10px"><button class="btn primary sm" data-copen="' + c.id + '">✏️ Open</button><button class="btn ghost sm" data-cdel="' + c.id + '">🗑 Delete</button></div></div></div>';
      }).join('') + '</div>' : '<div class="card"><p class="muted">No carousels yet. Tap <b>＋ New carousel</b> — paste some notes or a link and AI writes the slides.</p></div>') + '</div>';
    document.getElementById('carNew').onclick = function () { newSheet(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-copen]'), function (b) { b.onclick = function (e) { if (e.target.closest('[data-cdel]')) return; var c = cars().filter(function (x) { return x.id === b.dataset.copen; })[0]; if (c) editor(JSON.parse(JSON.stringify(c))); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cdel]'), function (b) {
      b.onclick = async function (e) {
        e.stopPropagation(); if (!confirm('Delete this carousel?')) return;
        try { await X.api('car-delete', { id: b.dataset.cdel }); X.S.cars = cars().filter(function (x) { return x.id !== b.dataset.cdel; }); X.toast('Deleted'); view(); } catch (x) { X.toast(x.message); }
      };
    });
    fontsReady().then(function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-cthumb]'), function (cv) {
        var c = cars().filter(function (x) { return x.id === cv.dataset.cthumb; })[0]; if (!c) return;
        images(c).then(function (imgs) { var big = document.createElement('canvas'); big.width = W; big.height = H; draw(big.getContext('2d'), c, 0, DUR, imgs); cv.getContext('2d').drawImage(big, 0, 0, 216, 270); });
      });
    });
  }

  function chips(id, map, cur) { return '<div class="chipbar" id="' + id + '">' + Object.keys(map).map(function (k) { return '<button class="chip" data-v="' + k + '" aria-pressed="' + (k === cur) + '">' + (typeof map[k] === 'string' ? map[k] : map[k].name) + '</button>'; }).join('') + '</div>'; }
  function chipVal(root, id) { var b = root.querySelector('#' + id + ' [aria-pressed=true]'); return b ? b.dataset.v : ''; }
  function chipWire(root, id, onChange) { Array.prototype.forEach.call(root.querySelectorAll('#' + id + ' [data-v]'), function (b) { b.onclick = function () { Array.prototype.forEach.call(root.querySelectorAll('#' + id + ' [data-v]'), function (x) { x.setAttribute('aria-pressed', x === b); }); if (onChange) onChange(b.dataset.v); }; }); }

  function newSheet() {
    var s = X.sheet('<h2>🎬 New animated carousel</h2><p class="muted" style="margin:4px 0 10px">Paste notes or a link — AI writes the slides in Auntie Tobi’s voice using only your facts. You can change everything after.</p>' +
      '<label for="cnU">🔗 Link <span class="muted" style="font-weight:400">(optional — gov.uk, news, an event page…)</span></label><input id="cnU" placeholder="https://">' +
      '<label for="cnN" style="margin-top:10px">The information</label><textarea id="cnN" rows="8" placeholder="Paste the details, or a rough idea — e.g. 5 things to know about council tax bands…"></textarea>' +
      '<div class="f2" style="margin-top:10px"><div><label for="cnC">Number of slides</label><select id="cnC">' + [5, 6, 7, 8, 9].map(function (n) { return '<option' + (n === 6 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div></div></div>' +
      '<div class="lbl" style="margin-top:10px">Colours</div>' + chips('cnT', THEMES, 'green') +
      '<div class="lbl" style="margin-top:10px">Animation</div>' + chips('cnA', ANIMS, 'pop') +
      '<div class="err hidden" id="cnErr"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" id="cnX">Cancel</button><button class="btn ghost" id="cnBlank">Start blank</button><button class="btn primary" id="cnGo">✨ Write the slides</button></div>');
    chipWire(s, 'cnT'); chipWire(s, 'cnA');
    s.querySelector('#cnX').onclick = function () { s.remove(); };
    s.querySelector('#cnBlank').onclick = function () {
      s.remove();
      editor({ title: 'New carousel', theme: chipVal(s, 'cnT'), anim: chipVal(s, 'cnA'), handle: true, motion: true, caption: '', hashtags: '#NigeriansInUK #AuntieTobi',
        slides: [{ layout: 'cover', title: 'Your **hook** goes here', text: 'A short line underneath', emoji: '✨', bullets: [], stat: {} }, { layout: 'points', title: 'Key points', bullets: ['First point', 'Second point', 'Third point'], emoji: '📌', stat: {} }, { layout: 'cta', title: 'Save this for later 💚', text: 'Share it with someone who needs it', emoji: '💚', bullets: [], stat: {} }] }, true);
    };
    s.querySelector('#cnGo').onclick = async function () {
      var b = this, err = s.querySelector('#cnErr'), url = s.querySelector('#cnU').value.trim(), notes = s.querySelector('#cnN').value.trim();
      if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      err.classList.add('hidden');
      if (!url && notes.length < 15) { err.textContent = 'Add a link or paste some information first.'; err.classList.remove('hidden'); return; }
      b.disabled = true; b.textContent = url ? '✨ Reading the page… (about 20 seconds)' : '✨ Writing… (about 15 seconds)';
      try {
        var r = await X.api('car-ai', { url: url, notes: notes, count: +s.querySelector('#cnC').value });
        var d = r.draft; s.remove();
        editor({ title: d.title, theme: chipVal(s, 'cnT'), anim: chipVal(s, 'cnA'), handle: true, motion: true, slides: d.slides, caption: d.caption, hashtags: d.hashtags }, true);
      } catch (x) { err.textContent = x.message; err.classList.remove('hidden'); b.disabled = false; b.textContent = '✨ Write the slides'; }
    };
  }

  function editor(car, dirty) {
    var esc = X.esc, sel = 0, raf = 0, t0 = performance.now(), playing = true, imgs = { cover: null }, closed = false;
    car.slides = car.slides.map(function (x) { return Object.assign({ layout: 'points', title: '', text: '', bullets: [], emoji: '', stat: {} }, x, { stat: Object.assign({ value: 0, prefix: '', suffix: '', label: '' }, x.stat || {}) }); });
    var ov = document.createElement('div'); ov.className = 'carx';
    ov.innerHTML = '<div class="carbar"><button class="btn ghost sm" id="ceX">← Back</button><input id="ceTitle" class="cartitle" maxlength="140"><span class="muted" id="ceSaved" style="font-size:13px"></span>' +
      '<button class="btn ghost sm" id="ceSave">💾 Save</button></div>' +
      '<div class="carbody"><div class="carleft">' +
      '<div class="card"><div class="lbl" style="margin-top:0">Colours</div>' + chips('ceT', THEMES, car.theme) +
      '<div class="lbl">Animation</div>' + chips('ceA', ANIMS, car.anim) +
      '<div class="row" style="gap:16px;margin-top:10px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="ceH"' + (car.handle !== false ? ' checked' : '') + '> Show @auntietobi_uk</label><label class="chk"><input type="checkbox" id="ceM"' + (car.motion !== false ? ' checked' : '') + '> Moving background</label></div>' +
      '<div class="lbl">Cover photo <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">(optional — shows behind the cover slide)</span></div><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><img id="ceCi" alt="" style="height:64px;border-radius:8px;display:none"><button class="btn ghost sm" id="ceCm">✨ Create with AI</button><label class="btn ghost sm" style="margin:0">📷 Upload<input type="file" id="ceCf" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn ghost sm hidden" id="ceCr">✖ Remove</button></div></div>' +
      '<div id="ceSlides"></div><button class="btn ghost" id="ceAdd" style="width:100%;margin-top:8px">＋ Add a slide</button>' +
      '<div class="card" style="margin-top:12px"><div class="lbl" style="margin-top:0">Caption</div><textarea id="ceCap" rows="6"></textarea><div class="lbl">Hashtags</div><textarea id="ceTags" rows="2"></textarea><button class="btn ghost sm" id="ceCopy" style="margin-top:8px">📋 Copy caption + hashtags</button></div>' +
      '</div><div class="carright"><div class="carstage"><canvas id="ceCv" width="1080" height="1350"></canvas></div>' +
      '<div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn ghost sm" id="cePrev">◀</button><span id="ceNum" style="font-weight:700;min-width:60px;text-align:center"></span><button class="btn ghost sm" id="ceNext">▶</button><button class="btn ghost sm" id="cePlay">⏸ Pause</button><button class="btn ghost sm" id="ceReplay">↺ Replay</button></div>' +
      '<div class="carthumbs" id="ceThumbs"></div>' +
      '<div class="card" style="margin-top:10px"><div style="font-weight:800;margin-bottom:6px">⬇️ Download</div>' +
      '<button class="btn primary" id="ceDl" style="width:100%">🎬 Carousel videos + images (.zip)</button><button class="btn ghost" id="ceReel" style="width:100%;margin-top:8px">📱 One Reel video (9:16)</button>' +
      '<div id="ceProg" class="hidden" style="margin-top:10px"><div class="muted" id="ceProgT" style="font-size:13px"></div><div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:4px"><div id="ceProgB" style="height:100%;width:0;background:var(--green)"></div></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin-top:8px">On Instagram: New post → pick the slide videos in order (01, 02…) → add the caption. Add a trending sound in Instagram for more reach.</p>' +
      '<button class="btn ghost sm" id="cePosted" style="margin-top:4px"></button></div></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    var $ = function (q) { return ov.querySelector(q); }, cv = $('#ceCv'), ctx = cv.getContext('2d');
    $('#ceTitle').value = car.title || ''; $('#ceCap').value = car.caption || ''; $('#ceTags').value = car.hashtags || '';
    function mark() { dirty = true; $('#ceSaved').textContent = 'Unsaved changes'; }
    function restart() { t0 = performance.now(); }
    function setSel(i) { sel = clamp(i, 0, car.slides.length - 1); restart(); $('#ceNum').textContent = (sel + 1) + ' / ' + car.slides.length; Array.prototype.forEach.call(ov.querySelectorAll('.cslide'), function (el, k) { el.classList.toggle('on', k === sel); }); paintThumbs(); }
    function frame() {
      if (closed) return;
      var t = playing ? ((performance.now() - t0) / 1000) % (DUR + 0.6) : DUR;
      draw(ctx, car, sel, Math.min(t, DUR), imgs);
      raf = requestAnimationFrame(frame);
    }
    var thumbTimer = 0;
    function paintThumbs() {
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(function () {
        var wrapEl = $('#ceThumbs'); wrapEl.innerHTML = '';
        var big = document.createElement('canvas'); big.width = W; big.height = H; var bx = big.getContext('2d');
        car.slides.forEach(function (sl, i) {
          var c = document.createElement('canvas'); c.width = 108; c.height = 135; c.className = i === sel ? 'on' : '';
          draw(bx, car, i, DUR, imgs); c.getContext('2d').drawImage(big, 0, 0, 108, 135);
          c.onclick = function () { setSel(i); var el = ov.querySelectorAll('.cslide')[i]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
          wrapEl.appendChild(c);
        });
      }, 250);
    }
    function slideHtml(sl, i) {
      var opts = Object.keys(LAYOUTS).map(function (k) { return '<option value="' + k + '"' + (sl.layout === k ? ' selected' : '') + '>' + LAYOUTS[k] + '</option>'; }).join('');
      var showB = sl.layout === 'points' || sl.layout === 'steps', showS = sl.layout === 'stat';
      return '<div class="card cslide' + (i === sel ? ' on' : '') + '" data-i="' + i + '">' +
        '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b style="min-width:26px">' + (i + 1) + '</b><select data-f="layout" style="width:auto;flex:1;min-width:150px">' + opts + '</select>' +
        '<input data-f="emoji" value="' + esc(sl.emoji) + '" style="width:64px;text-align:center" placeholder="😀" maxlength="12">' +
        '<span class="cbtns"><button class="btn link" data-mv="-1" title="Move up">▲</button><button class="btn link" data-mv="1" title="Move down">▼</button><button class="btn link" data-dup title="Duplicate">⧉</button><button class="btn link" data-del title="Delete">🗑</button></span></div>' +
        '<label>Title</label><input data-f="title" value="' + esc(sl.title) + '" maxlength="140">' +
        (showB ? '<label>' + (sl.layout === 'steps' ? 'Steps' : 'Points') + ' <span class="muted" style="font-weight:400">— one per line</span></label><textarea data-f="bullets" rows="4">' + esc((sl.bullets || []).join('\n')) + '</textarea>'
          : '<label>' + (sl.layout === 'cover' ? 'Small line under the title' : sl.layout === 'quote' ? 'Quote' : 'Text') + '</label><textarea data-f="text" rows="3">' + esc(sl.text) + '</textarea>') +
        (showS ? '<div class="f2"><div><label>Number</label><input data-f="stat.value" type="number" step="any" value="' + esc(sl.stat.value) + '"></div><div class="f2"><div><label>Before</label><input data-f="stat.prefix" value="' + esc(sl.stat.prefix) + '" placeholder="£"></div><div><label>After</label><input data-f="stat.suffix" value="' + esc(sl.stat.suffix) + '" placeholder="%"></div></div></div><label>What the number means</label><input data-f="stat.label" value="' + esc(sl.stat.label) + '">' : '') +
        '<div class="muted" style="font-size:12px;margin-top:6px">Tip: wrap words in **double stars** to highlight them.</div></div>';
    }
    function paintSlides() {
      $('#ceSlides').innerHTML = car.slides.map(slideHtml).join('');
      Array.prototype.forEach.call(ov.querySelectorAll('.cslide'), function (el) {
        var i = +el.dataset.i;
        el.addEventListener('focusin', function () { if (sel !== i) setSel(i); });
        el.addEventListener('click', function (e) { if (!e.target.closest('button') && sel !== i) setSel(i); });
        Array.prototype.forEach.call(el.querySelectorAll('[data-f]'), function (f) {
          f.addEventListener('input', function () {
            var k = f.dataset.f, sl = car.slides[i];
            if (k === 'bullets') sl.bullets = f.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5);
            else if (k.indexOf('stat.') === 0) sl.stat[k.slice(5)] = k === 'stat.value' ? Number(f.value) || 0 : f.value;
            else sl[k] = f.value;
            if (k === 'layout') { if ((sl.layout === 'points' || sl.layout === 'steps') && !sl.bullets.length && sl.text) sl.bullets = [sl.text]; paintSlides(); }
            mark(); restart(); paintThumbs();
          });
        });
        el.querySelector('[data-mv="-1"]').onclick = function () { if (i > 0) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i - 1, 0, a); sel = i - 1; mark(); paintSlides(); setSel(sel); } };
        el.querySelector('[data-mv="1"]').onclick = function () { if (i < car.slides.length - 1) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i + 1, 0, a); sel = i + 1; mark(); paintSlides(); setSel(sel); } };
        el.querySelector('[data-dup]').onclick = function () { if (car.slides.length >= 10) return X.toast('Instagram allows up to 10 slides'); car.slides.splice(i + 1, 0, JSON.parse(JSON.stringify(car.slides[i]))); mark(); paintSlides(); setSel(i + 1); };
        el.querySelector('[data-del]').onclick = function () { if (car.slides.length <= 1) return; if (!confirm('Delete slide ' + (i + 1) + '?')) return; car.slides.splice(i, 1); mark(); paintSlides(); setSel(Math.min(i, car.slides.length - 1)); };
      });
    }
    function paintCover() {
      var src = coverSrc(car), im = $('#ceCi');
      im.style.display = src ? '' : 'none'; if (src) im.src = src;
      $('#ceCr').classList.toggle('hidden', !src); $('#ceCm').textContent = src ? '🔄 Make another' : '✨ Create with AI';
      images(car).then(function (r) { imgs = r; restart(); paintThumbs(); });
    }
    async function setCover(dataUrl) {
      car._coverData = dataUrl; paintCover();
      try { var r = await X.api('app-img', { image: dataUrl }); car.coverImg = r.imgId; mark(); } catch (x) { X.toast(x.message); }
    }
    $('#ceCm').onclick = async function () {
      var b = this; b.disabled = true; b.textContent = '🎨 Creating… (about 20 seconds)';
      var cover = car.slides[0] || {};
      try { var r = await X.api('app-picture', { kind: 'carousel', title: plain(cover.title || car.title), body: plain([cover.text].concat(car.slides.slice(1, 3).map(function (x) { return x.title; })).join('. ')) }); await setCover(await shrink(r.image)); }
      catch (x) { X.toast(x.message); }
      b.disabled = false; paintCover();
    };
    $('#ceCf').onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { await setCover(await shrink(f)); } catch (x) { X.toast(x.message); } this.value = ''; };
    $('#ceCr').onclick = function () { car._coverData = ''; car.coverImg = ''; mark(); paintCover(); };
    chipWire(ov, 'ceT', function (v) { car.theme = v; mark(); restart(); paintThumbs(); });
    chipWire(ov, 'ceA', function (v) { car.anim = v; mark(); restart(); });
    $('#ceH').onchange = function () { car.handle = this.checked; mark(); paintThumbs(); };
    $('#ceM').onchange = function () { car.motion = this.checked; mark(); };
    $('#ceTitle').oninput = function () { car.title = this.value; mark(); };
    $('#ceCap').oninput = function () { car.caption = this.value; mark(); };
    $('#ceTags').oninput = function () { car.hashtags = this.value; mark(); };
    $('#ceCopy').onclick = function () { var txt = $('#ceCap').value + '\n\n' + $('#ceTags').value; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { X.toast('Copied ✅'); }, function () { X.toast('Couldn’t copy — select the text and copy it'); }); };
    $('#ceAdd').onclick = function () { if (car.slides.length >= 10) return X.toast('Instagram allows up to 10 slides'); var at = Math.max(1, car.slides.length - (car.slides[car.slides.length - 1].layout === 'cta' ? 1 : 0)); car.slides.splice(at, 0, { layout: 'points', title: 'New slide', text: '', bullets: ['A point'], emoji: '📌', stat: { value: 0, prefix: '', suffix: '', label: '' } }); mark(); paintSlides(); setSel(at); };
    $('#cePrev').onclick = function () { setSel(sel - 1); };
    $('#ceNext').onclick = function () { setSel(sel + 1); };
    $('#cePlay').onclick = function () { playing = !playing; this.textContent = playing ? '⏸ Pause' : '▶ Play'; restart(); };
    $('#ceReplay').onclick = function () { playing = true; $('#cePlay').textContent = '⏸ Pause'; restart(); };
    function paintPosted() { $('#cePosted').textContent = car.status === 'posted' ? '↩ Mark as not posted' : '✅ Mark as posted'; }
    $('#cePosted').onclick = async function () { car.status = car.status === 'posted' ? 'draft' : 'posted'; paintPosted(); await save(); };
    async function save() {
      var payload = { id: car.id, title: car.title, theme: car.theme, anim: car.anim, handle: car.handle, motion: car.motion, slides: car.slides, caption: car.caption, hashtags: car.hashtags, coverImg: car.coverImg || '', status: car.status };
      try {
        var r = await X.api('car-save', { item: payload });
        car.id = r.item.id; car.updatedAt = r.item.updatedAt; car.postedAt = r.item.postedAt;
        var list = cars(), k = list.findIndex(function (x) { return x.id === r.item.id; }); if (k >= 0) list[k] = r.item; else list.unshift(r.item);
        dirty = false; $('#ceSaved').textContent = 'Saved ✓'; return true;
      } catch (x) { X.toast(x.message); return false; }
    }
    $('#ceSave').onclick = save;
    function progress(p, label) { $('#ceProg').classList.remove('hidden'); $('#ceProgT').textContent = label; $('#ceProgB').style.width = Math.round(p * 100) + '%'; }
    async function run(btn, fn) {
      var all = ov.querySelectorAll('#ceDl,#ceReel'); Array.prototype.forEach.call(all, function (b) { b.disabled = true; });
      var keep = playing; playing = false;
      try {
        if (dirty) await save();
        var r = await fn(car, progress);
        progress(1, r.ready ? 'Done ✅ — check your Downloads folder.' : 'Done — but this browser could only make a format Instagram may not accept. For Instagram-ready MP4s please use Chrome or Edge on a laptop.');
      } catch (x) { progress(0, '⚠️ ' + (x.message || 'Something went wrong making the video.')); }
      Array.prototype.forEach.call(all, function (b) { b.disabled = false; }); playing = keep; restart();
    }
    $('#ceDl').onclick = function () { run(this, exportSlides); };
    $('#ceReel').onclick = function () { run(this, exportReel); };
    $('#ceX').onclick = function () {
      if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
      closed = true; cancelAnimationFrame(raf); ov.remove(); document.body.style.overflow = ''; view();
    };
    paintSlides(); paintCover(); paintPosted(); setSel(0);
    if (dirty) { mark(); save(); }
    fontsReady().then(function () { restart(); paintThumbs(); });
    raf = requestAnimationFrame(frame);
  }

  window.HQCar = { init: init, view: view, draw: draw, THEMES: THEMES, ANIMS: ANIMS, LAYOUTS: LAYOUTS, exportSlides: exportSlides, exportReel: exportReel, encode: encode, W: W, H: H, DUR: DUR };
})();
