/*
 * Auntie Tobi HQ — 🎠 Carousel Studio (was 📝 Template Carousel + 🎨 Style Match).
 * Looks: "Auntie Tobi White" (the bold headline template below) or any Style Match look (ready-made, read from
 * screenshots, or ⭐ My styles) — drawn by HQStyle.draw. Every slide can also have a 🖼️ picture and ✨ decorations.
 * The white "bold headline" template: thin green frame, big black capitals with **green** words,
 * and an optional gold brush stroke, in 5 text styles with size controls (whole carousel or per slide). AI (or a quick paste) makes every slide at once,
 * then each slide can be edited with a live preview and downloaded as 1080×1350 PNGs (ZIP).
 *
 * HQ calls HQTpl.init({ api, sheet, toast, esc, S }) once, then HQTpl.view() for the #tcars page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var GREEN = '#057A44', FRAME = '#0A8A4C', INK = '#111111', BODY = '#33383F', GOLD = '#E0A21B', GREY = '#8A9099';
  var FH = "'Inter Tight', 'Inter', 'Helvetica Neue', Arial, sans-serif";
  var FB = "'Inter', 'Helvetica Neue', Arial, sans-serif";
  var KINDS = { cover: '🎯 Cover', tip: '📌 Tip / point', quote: '💬 Quote', check: '✅ Checklist', stat: '🔢 Big number', myth: '❌✅ Myth vs fact', question: '❓ Question', steps: '1️⃣ Steps', end: '💚 Save & share' };
  // what the two boxes mean for each kind of slide
  var LBL = { cover: ['Heading', 'Small text under it (optional)'], tip: ['Heading', 'Body text'], end: ['Heading', 'Small text under it (optional)'], quote: ['The quote', 'Who said it (optional)'], check: ['Title', 'The items — one per line'],
    stat: ['The big number — e.g. £1,500 or 3 in 5', 'What the number means'], myth: ['❌ The myth', '✅ The fact'], question: ['The question', 'Answer options — one per line (optional; leave empty for “Tell us in the comments”)'], steps: ['Title', 'The steps — one per line'] };
  var EXAMPLE = { quote: ['Hard work in the UK pays — **but rest is not a crime.**', 'Auntie Tobi'], check: ['Before you **move house**', 'Tell the council\nRedirect your post\nUpdate your GP\nTell DVLA your new address'],
    stat: ['£1,500', 'is how much the average family loses a year by not checking their **council tax band**'], myth: ['You must have a **credit card** to build credit in the UK', 'Paying phone, rent and bills on time also builds your credit score'],
    question: ['Which would you choose for **Jollof**?', 'Basmati rice\nLong grain rice\nParboiled rice'], steps: ['How to register with a **GP**', 'Find a GP near you on the NHS website\nFill in the GMS1 form\nTake ID and proof of address\nBook your first check-up'] };
  var X = null;

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // ── text styles (fonts come from Google Fonts in hq.html) ──
  // k = size factor vs Bold Classic; gf/gw/gs = a different font for the **green** words; gi = green words in italics
  var STYLES = {
    classic:   { name: 'Bold Classic',     f: "'Inter Tight', 'Inter', Arial, sans-serif", w: 900, caps: true,  ls: -0.03, lh: 0.98, k: 1 },
    condensed: { name: 'Tall & Condensed', f: "'Anton', 'Inter Tight', Arial, sans-serif", w: 400, caps: true,  ls: 0.004, lh: 1.04, k: 1.12 },
    friendly:  { name: 'Friendly',         f: "'Poppins', Arial, sans-serif",              w: 800, caps: false, ls: -0.02, lh: 1.12, k: 0.92 },
    elegant:   { name: 'Elegant',          f: "'Playfair Display', Georgia, serif",        w: 900, caps: false, ls: 0,     lh: 1.08, k: 0.96, gi: true },
    hand:      { name: 'Handwritten Pop',  f: "'Archivo Black', Arial, sans-serif",        w: 400, caps: true,  ls: -0.01, lh: 1.04, k: 0.84, gf: "'Caveat', cursive", gw: 700, gs: 1.6 }
  };
  function eff(car, sl) {
    var pick = function (v, base) { return v === 'on' ? true : v === 'off' ? false : base; };
    return {
      st: STYLES[sl.style] || STYLES[car.style] || STYLES.classic,
      hs: clamp((Number(car.hs) || 1) * (Number(sl.hs) || 1), 0.4, 2),
      bs: clamp((Number(car.bs) || 1) * (Number(sl.bs) || 1), 0.4, 2),
      brush: pick(sl.brush, car.brush !== false),
      num: pick(sl.num, car.numbers !== false),
    };
  }

  // ── heading text: **green** words, line breaks kept ──
  function richWords(text, greenLine) {
    text = String(text || '');
    if (greenLine && text.indexOf('\n') < 0) { var gi = text.indexOf('**'); if (gi > 0) text = text.slice(0, gi).replace(/\s+$/, '') + '\n' + text.slice(gi); }
    return text.split('\n').map(function (p) {
      var words = [];
      p.split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
        if (!part) return;
        var g = /^\*\*[^*]+\*\*$/.test(part); if (g) part = part.slice(2, -2);
        part.split(/\s+/).forEach(function (w) { if (w) words.push({ w: w, g: g }); });
      });
      return words;
    });
  }
  function wordFont(ctx, st, size, g) {
    if (g && st.gf) { ctx.font = st.gw + ' ' + Math.round(size * st.gs) + 'px ' + st.gf; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; return; }
    ctx.font = (g && st.gi ? 'italic ' : '') + st.w + ' ' + size + 'px ' + st.f;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (size * st.ls).toFixed(1) + 'px';
  }
  function wtext(st, t) { return st.caps && !(t.g && st.gf) ? t.w.toUpperCase() : t.w; }
  function lineH(st, size, words) {
    var h = size * st.lh;
    if (st.gf && words.some(function (t) { return t.g; })) h = Math.max(h, size * st.gs * 0.86);
    return h;
  }
  function setB(ctx, size, weight) {
    ctx.font = (weight || 500) + ' ' + size + 'px ' + FB;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  // lines carry their own size: a short green last line (cover / end) may shrink a little to stay on one line
  function wrapPara(ctx, st, words, maxW, size) {
    wordFont(ctx, st, size, false);
    var sp = ctx.measureText(' ').width, lines = [], line = [], lw = 0, tooWide = false;
    function push() { lines.push({ words: line, w: lw, size: size, sp: sp, lh: lineH(st, size, line) }); }
    words.forEach(function (t) {
      wordFont(ctx, st, size, t.g);
      var tx = wtext(st, t), ww = ctx.measureText(tx).width; if (ww > maxW) tooWide = true;
      if (line.length && lw + sp + ww > maxW) { push(); line = []; lw = 0; }
      line.push({ w: tx, g: t.g, width: ww }); lw += (line.length > 1 ? sp : 0) + ww;
    });
    if (line.length) push();
    return { lines: lines, tooWide: tooWide };
  }
  function layout(ctx, st, paras, maxW, size, greenLine) {
    var lines = [], tooWide = false;
    paras.forEach(function (words, pi) {
      var r = wrapPara(ctx, st, words, maxW, size);
      var shortGreen = greenLine && pi === paras.length - 1 && paras.length > 1 && words.length <= 4 && words.every(function (t) { return t.g; });
      if (shortGreen && r.lines.length > 1) {
        for (var s2 = size - 2; s2 >= size * 0.72; s2 -= 2) { var r2 = wrapPara(ctx, st, words, maxW, s2); if (r2.lines.length === 1) { r = r2; break; } }
      }
      if (words.length > 2 && r.lines.length > 1 && r.lines[r.lines.length - 1].words.length === 1) {
        // avoid one lonely word on the last line: try a slightly smaller size
        for (var s3 = size - 2; s3 >= size * 0.8; s3 -= 2) { var r3 = wrapPara(ctx, st, words, maxW, s3); if (r3.lines[r3.lines.length - 1].words.length > 1) { r = r3; break; } }
      }
      tooWide = tooWide || r.tooWide; lines = lines.concat(r.lines);
    });
    var h = lines.reduce(function (n, ln) { return n + ln.lh; }, 0);
    return { lines: lines, tooWide: tooWide, h: h };
  }
  function fitHeading(ctx, st, text, maxW, maxH, maxSize, minSize, greenLine) {
    var paras = richWords(text, greenLine), size = Math.round(maxSize), r;
    minSize = Math.min(minSize, size);
    for (; size >= minSize; size -= 3) { r = layout(ctx, st, paras, maxW, size, greenLine); if (!r.tooWide && r.h <= maxH) break; }
    size = Math.max(size, minSize); r = layout(ctx, st, paras, maxW, size, greenLine);
    r.size = size; r.over = r.tooWide || r.h > maxH + 1;
    return r;
  }
  function drawHeading(ctx, st, r, x, y, align, maxW) {
    ctx.textBaseline = 'alphabetic';
    var right = x, yy = y;
    r.lines.forEach(function (ln) {
      var lx = align === 'left' ? x : x + (maxW - ln.w) / 2, by = yy + ln.lh * 0.5 + ln.size * 0.36;
      ln.words.forEach(function (t, k) { wordFont(ctx, st, ln.size, t.g); ctx.fillStyle = t.g ? GREEN : INK; ctx.fillText(t.w, lx, by); lx += t.width + (k < ln.words.length - 1 ? ln.sp : 0); });
      right = Math.max(right, lx); yy += ln.lh;
    });
    return right;
  }
  function wrapPlain(ctx, text, maxW) {
    var lines = [];
    String(text || '').replace(/\*\*/g, '').split('\n').forEach(function (p) {
      var line = '';
      p.split(/\s+/).filter(Boolean).forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t;
      });
      lines.push(line);
    });
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines;
  }
  function fitBody(ctx, text, maxW, maxH, weight, start) {
    var size = Math.round(start), min = Math.min(24, size), lines;
    for (; size >= min; size -= 2) { setB(ctx, size, weight); lines = wrapPlain(ctx, text, maxW); if (lines.length * size * 1.42 <= maxH) break; }
    size = Math.max(size, min); setB(ctx, size, weight); lines = wrapPlain(ctx, text, maxW);
    return { size: size, lines: lines, lh: size * 1.42, h: lines.length * size * 1.42, over: lines.length * size * 1.42 > maxH + 1, shrunk: size < start - 2 };
  }

  // ── decorations ──
  function brush(ctx, x, y, w) {
    ctx.save();
    for (var i = 0; i < 14; i++) {
      var s = i * 7.13, t = 6 + rnd(s) * 12, yy = y - 4 + (rnd(s + 1) - 0.5) * 18;
      var xs = x + rnd(s + 2) * w * 0.12, xe = x + w - rnd(s + 3) * w * 0.12, mid = (xs + xe) / 2;
      ctx.globalAlpha = 0.72 + rnd(s + 4) * 0.25; ctx.fillStyle = i % 3 === 2 ? '#E9B43A' : GOLD;
      ctx.beginPath(); ctx.moveTo(xs, yy + t * 0.5);
      ctx.quadraticCurveTo(mid, yy - 3 - rnd(s + 5) * 4, xe, yy);
      ctx.lineTo(xe - 10, yy + t * 0.55);
      ctx.quadraticCurveTo(mid, yy + t + rnd(s + 6) * 3, xs + 12, yy + t);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = GOLD; ctx.lineCap = 'round';
    for (var j = 0; j < 6; j++) {
      var q = 50 + j * 3.7, yy2 = y + (rnd(q) - 0.3) * 18, x1 = x + rnd(q + 1) * w * 0.7, len = 30 + rnd(q + 2) * w * 0.3;
      ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5 + rnd(q + 3) * 2;
      ctx.beginPath(); ctx.moveTo(x1, yy2); ctx.lineTo(Math.min(x + w + 6, x1 + len), yy2 - 1); ctx.stroke();
    }
    ctx.restore();
  }
  // gold brush under the heading (optional) — centred, or from the left edge for left-aligned slides
  function decoH(on) { return on ? 30 : 0; }
  function deco(ctx, on, y, align) {
    if (!on) return;
    var bw = 480, x = align === 'left' ? L : (W - bw) / 2;
    brush(ctx, x, y + 8, bw);
  }

  // ── one slide ──
  var L = 112, R = W - 112, CW = R - L, TOP = 120, BOT = H - 150, TOP0 = TOP, BOT0 = BOT;
  // ── 🖼️ pictures on slides: full background (faded) or a photo box at the top / bottom ──
  // slide.pic = { img, mode: 'bg'|'top'|'bottom', fade 0–0.9 (transparency), size 0.25–0.6 (photo box height), z 1–2.5, fx/fy 0–1 (which part shows) }
  var PIC = {}, picWaiters = [];
  function picSrc(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function picImg(id) {
    if (!id) return null; var p = PIC[id];
    if (!p) { p = PIC[id] = { im: new Image(), ok: false }; p.im.onload = function () { p.ok = true; picWaiters.slice().forEach(function (f) { try { f(); } catch (e) {} }); }; p.im.src = picSrc(id); }
    return p.ok ? p.im : null;
  }
  function loadPics(car) {
    var lk = car.look && car.look.kind === 'spec' && car.look.spec && car.look.spec.bg && car.look.spec.bg.type === 'image' ? car.look.spec.bg.img : '';
    var bgp = lk ? new Promise(function (ok) { if (lookImg(lk)) return ok(); var q = LIMG[lk]; q.im.addEventListener('load', ok, { once: true }); q.im.addEventListener('error', ok, { once: true }); setTimeout(ok, 15000); }) : Promise.resolve();
    return Promise.all([bgp].concat(car.slides.map(function (sl) { return new Promise(function (ok) { if (!sl.pic || !sl.pic.img) return ok(); var im = picImg(sl.pic.img); if (im) return ok(); var p = PIC[sl.pic.img]; p.im.addEventListener('load', ok, { once: true }); p.im.addEventListener('error', ok, { once: true }); setTimeout(ok, 15000); }); }))); }
  function picDraw(ctx, pic, x, y, w, h, radius) {
    var im = picImg(pic.img); if (!im) return;
    var z = clamp(Number(pic.z) || 1, 1, 2.5), s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * z, dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    var fx = pic.fx == null ? 0.5 : pic.fx, fy = pic.fy == null ? 0.5 : pic.fy, dx = x - (dw - w) * fx, dy = y - (dh - h) * fy;
    ctx.save(); ctx.beginPath();
    if (radius) { ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius); ctx.arcTo(x + w, y + h, x, y + h, radius); ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius); ctx.closePath(); } else ctx.rect(x, y, w, h);
    ctx.clip(); ctx.globalAlpha = 1 - clamp(Number(pic.fade) || 0, 0, 0.9); ctx.drawImage(im, dx, dy, dw, dh); ctx.restore();
  }
  function picBox(pic) {   // where a photo box goes, and the space left for the text
    var bh = Math.round(H * clamp(Number(pic.size) || 0.3, 0.2, 0.6)), bx = L - 40, bw = CW + 80;
    if (pic.mode === 'top') return { x: bx, y: 74, w: bw, h: bh, top: 74 + bh + 44, bot: BOT };
    return { x: bx, y: H - 118 - bh, w: bw, h: bh, top: TOP, bot: H - 118 - bh - 40 };
  }
  // ── 🎠 Carousel Studio: looks other than Auntie Tobi White are drawn by the Style Match painter (HQStyle.draw) ──
  function baseSpec(o) {
    var b = { bg: { type: 'solid', c1: '#FFFFFF', c2: '#F3F5F7', angle: 160, img: '', dim: 0.35, where: 'cover' }, ink: '#111111', sub: '#3F4A5C', accent: '#057A44', hl: '#FFD25E', hlInk: '#111111',
      font: { head: 'inter', body: 'dmsans', caps: false, size: 1, bodySize: 1 }, align: 'left', vpos: 'middle', hlStyle: 'color', frame: { on: false, width: 10, color: '#057A44', inset: 36, radius: 0 },
      card: { on: false, color: '#FFFFFF', opacity: 0.12 }, shapes: 'none', numbers: 'badge', pageNo: true, swipe: true, handle: { text: '@auntietobi_uk', pos: 'bottom-left' }, cover: { size: 1.25, vpos: 'middle' } };
    var m = function (t, s) { Object.keys(s).forEach(function (k) { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) { t[k] = t[k] || {}; m(t[k], s[k]); } else t[k] = s[k]; }); return t; };
    return m(b, o || {});
  }
  var LOOKS = [
    { id: 'white', name: 'Auntie Tobi White', sw: ['#FFFFFF', '#057A44'] },
    { id: 'purple', name: '💜 Bold Purple Pro', purple: true },
    { id: 'green', name: 'Auntie Tobi Green', spec: baseSpec({ bg: { type: 'gradient', c1: '#057A44', c2: '#03532E' }, ink: '#FFFFFF', sub: '#E6F4EC', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36', font: { head: 'poppins' }, hlStyle: 'bar', shapes: 'circles' }) },
    { id: 'yellow', name: 'Bold Yellow', spec: baseSpec({ bg: { c1: '#FFC928' }, ink: '#111111', sub: '#2B2B2B', accent: '#111111', hl: '#FFFFFF', hlInk: '#111111', font: { head: 'archivo', caps: true }, hlStyle: 'bar', frame: { on: true, color: '#111111', width: 8, inset: 30, radius: 18 }, numbers: 'pill', shapes: 'dots' }) },
    { id: 'cream', name: 'Soft Cream', spec: baseSpec({ bg: { c1: '#F7F1E6' }, ink: '#2B2118', sub: '#5C4F42', accent: '#C2652A', hl: '#C2652A', font: { head: 'playfair', body: 'dmsans' }, hlStyle: 'color', align: 'center', shapes: 'blob', numbers: 'big' }) },
    { id: 'night', name: 'Dark Night', spec: baseSpec({ bg: { type: 'gradient', c1: '#0F1E36', c2: '#050B16', angle: 200 }, ink: '#FFFFFF', sub: '#C9D1DE', accent: '#3DDC6E', hl: '#3DDC6E', hlInk: '#0F1E36', font: { head: 'anton', caps: true }, hlStyle: 'color', shapes: 'lines', numbers: 'badge' }) },
    { id: 'naija', name: 'Naija Green & White', spec: baseSpec({ bg: { c1: '#FFFFFF' }, ink: '#0E3B23', sub: '#33483C', accent: '#008751', hl: '#008751', hlInk: '#FFFFFF', font: { head: 'poppins' }, hlStyle: 'bar', frame: { on: true, color: '#008751', width: 22, inset: 0, radius: 0 }, shapes: 'corner', numbers: 'badge', align: 'center' }) }
  ];
  var LIMG = {};
  function lookImg(id) {
    if (!id) return null; var p = LIMG[id];
    if (!p) { p = LIMG[id] = { im: new Image(), ok: false }; p.im.onload = function () { p.ok = true; picWaiters.slice().forEach(function (f) { try { f(); } catch (e) {} }); }; p.im.src = '/.netlify/functions/app-content?img=' + encodeURIComponent(id); }
    return p.ok ? p.im : null;
  }
  function isSpec(car) { return !!(car.look && car.look.kind === 'spec' && car.look.spec && window.HQStyle); }
  function drawSpec(ctx, car, i) {
    var sp = car.look.spec, sl = car.slides[i] || { kind: 'tip', heading: '', body: '' }, pic = boxPic(sl);
    var a = { kind: sl.kind === 'tip' ? 'point' : sl.kind, title: sl.heading, body: sl.body, size: sl.hs || 1, _num: tipNumber(car, i) };
    if (pic && pic.mode === 'bg') a._afterBg = function (c) { picDraw(c, pic, 0, 0, W, H, 0); };
    else if (pic) { var pb = picBox(pic); a._afterBg = function (c) { picDraw(c, pic, pb.x, pb.y, pb.w, pb.h, 28); }; a._top = pb.top; a._bot = pb.bot; }
    var ab = a._afterBg; a._afterBg = function (c) { if (ab) ab(c); cutLayer(c, car, i); };
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    window.HQStyle.draw(ctx, a, i, car.slides.length, sp, sp.bg.type === 'image' && sp.bg.img ? lookImg(sp.bg.img) : null);
    ctx.restore();
    return { over: false, shrunk: false };
  }
  // ── Stage 2 layouts: 💬 quote · ✅ checklist · 🔢 big number · ❌✅ myth vs fact · ❓ question · 1-2-3 steps ──
  // They work in every look: the look gives the background, colours and fonts; the layout places the words.
  var NEWK = { quote: 1, check: 1, stat: 1, myth: 1, question: 1, steps: 1 };
  function rgbaH(h, a) { h = String(h || '#000000').replace('#', ''); return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')'; }
  function pal(car, sl) {
    if (isSpec(car)) {
      var sp = car.look.spec, F = window.HQStyle.FONTS, hf = F[sp.font.head] || F.inter, bf = F[sp.font.body] || F.dmsans, k = (hf.k || 1) * sp.font.size;
      var dark = hexLum(sp.bg.c1) < 0.5 || sp.bg.type === 'image';
      return { ink: sp.ink, sub: sp.sub, acc: sp.accent, accInk: hexLum(sp.accent) > 0.6 ? '#111111' : '#FFFFFF', hl: sp.hlStyle === 'none' ? sp.ink : sp.accent, card: dark ? 'rgba(255,255,255,0.10)' : rgbaH(sp.accent, 0.08), line: rgbaH(sp.accent, 0.5),
        head: function (z) { return hf.w + ' ' + Math.round(z) + 'px ' + hf.f; }, body: function (z, w) { return (w || bf.bw) + ' ' + Math.round(z) + 'px ' + bf.b; }, caps: sp.font.caps, k: k * (sl.hs || 1), bk: sp.font.bodySize * (sl.bs || 1), lh: hf.lh || 1.06,
        align: sp.align, x0: 112 + (sp.frame.on ? sp.frame.inset + sp.frame.width : 0) * 0.5 };
    }
    if (isPurple(car)) {
      var Pp = pur(car), ep = eff(car, sl);
      return { ink: Pp.ink, sub: Pp.sub, acc: Pp.acc, accInk: hexLum(Pp.acc) > 0.6 ? '#111111' : '#FFFFFF', hl: Pp.hl, card: rgbaH(Pp.acc, 0.06), line: rgbaH(Pp.acc, 0.45), head: purpleHead, body: function (z, w) { return purpleBody(z, w); }, caps: true, k: 1.15 * ep.hs, bk: ep.bs, lh: 1.02, align: 'left', x0: 96 };
    }
    var e = eff(car, sl), st = e.st;
    return { ink: INK, sub: BODY, acc: GREEN, accInk: '#FFFFFF', hl: GREEN, card: '#F2F7F4', line: 'rgba(5,122,68,0.45)',
      head: function (z) { return st.w + ' ' + Math.round(z) + 'px ' + st.f; }, body: function (z, w) { return (w || 500) + ' ' + Math.round(z) + 'px ' + FB; }, caps: st.caps, k: st.k * e.hs, bk: e.bs, lh: st.lh || 1.02, align: sl.align === 'left' ? 'left' : 'center', x0: L };
  }
  // words with **highlights**, wrapped; returns lines of [{w, hl, ww}]
  function rtWrap(ctx, text, maxW, caps) {
    var toks = []; String(text || '').split('\n').forEach(function (para, pi) {
      if (pi) toks.push({ br: true });
      var endSp = true;
      para.split(/(\*\*[^*]+\*\*)/).forEach(function (p) { if (!p) return; var hl = /^\*\*[^*]+\*\*$/.test(p); if (hl) p = p.slice(2, -2); if (caps) p = p.toUpperCase(); var glue = !endSp && !/^\s/.test(p) && toks.length && !toks[toks.length - 1].br; endSp = /\s$/.test(p); p.split(/\s+/).forEach(function (w, wi) { if (w) toks.push({ w: w, hl: hl, join: wi === 0 && glue }); }); });
    });
    var lines = [], line = [], lw = 0, sp = ctx.measureText(' ').width;
    toks.forEach(function (t) { if (t.br) { lines.push({ t: line, w: lw }); line = []; lw = 0; return; } var w = ctx.measureText(t.w).width; if (line.length && lw + sp + w > maxW) { lines.push({ t: line, w: lw }); line = []; lw = 0; } if (t.join && line.length) { line.push({ w: t.w, hl: t.hl, ww: w, join: true }); lw += w; return; } line.push({ w: t.w, hl: t.hl, ww: w }); lw += (line.length > 1 ? sp : 0) + w; });
    if (line.length) lines.push({ t: line, w: lw });
    return lines;
  }
  // fit text into a box (shrinks until it fits); returns { size, lines, h }
  function rtFit(ctx, text, font, maxW, maxH, start, min, lh, caps) {
    var z = start, lines; for (; z > min; z -= 2) { ctx.font = font(z); lines = rtWrap(ctx, text, maxW, caps); if (lines.length * z * lh <= maxH) break; }
    ctx.font = font(z); lines = rtWrap(ctx, text, maxW, caps); return { size: z, lines: lines, h: lines.length * z * lh, lh: lh };
  }
  function rtDraw(ctx, f, font, x, y, maxW, align, ink, hl) {
    ctx.font = font(f.size); ctx.textAlign = 'left'; var sp = ctx.measureText(' ').width;
    f.lines.forEach(function (ln, k) { var xx = align === 'center' ? x + (maxW - ln.w) / 2 : align === 'right' ? x + maxW - ln.w : x, base = y + k * f.size * f.lh + f.size * 0.86; ln.t.forEach(function (t, ti) { ctx.fillStyle = t.hl ? hl : ink; ctx.fillText(t.w, xx, base); xx += t.ww + (ln.t[ti + 1] && ln.t[ti + 1].join ? 0 : sp); }); });
  }
  function pill(ctx, text, x, y, font, bg, ink, padX, h) { ctx.font = font; var w = ctx.measureText(text).width + padX * 2; ctx.fillStyle = bg; rrect(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.fillText(text, x + padX, y + h * 0.68); return w; }
  function itemLines(t) { return String(t || '').split('\n').map(function (x) { return x.replace(/^\s*([-•*✓✔️]|\d+[.)])\s*/, '').trim(); }).filter(Boolean).slice(0, 8); }

  function drawLayout(ctx, car, i) {
    var sl = car.slides[i], pic = boxPic(sl), n = car.slides.length, P = pal(car, sl);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 1 · the look's background (and picture, frame, handle, page number)
    if (isSpec(car)) {
      var sp = car.look.spec, a = { kind: 'end', title: '', body: '' };
      if (pic && pic.mode === 'bg') a._afterBg = function (c) { picDraw(c, pic, 0, 0, W, H, 0); };
      else if (pic) { var pb0 = picBox(pic); a._afterBg = function (c) { picDraw(c, pic, pb0.x, pb0.y, pb0.w, pb0.h, 28); }; }
      var ab0 = a._afterBg; a._afterBg = function (c) { if (ab0) ab0(c); cutLayer(c, car, i); };
      window.HQStyle.draw(ctx, a, i, n, sp, sp.bg.type === 'image' && sp.bg.img ? lookImg(sp.bg.img) : null);
    } else if (isPurple(car)) {
      var P0 = pur(car); ctx.fillStyle = P0.bg; ctx.fillRect(0, 0, W, H); if (P0.pattern) purplePattern(ctx, i, P0.line);
      if (pic && pic.mode === 'bg') picDraw(ctx, pic, 0, 0, W, H, 0); else if (pic) { var pb2 = picBox(pic); picDraw(ctx, pic, pb2.x, pb2.y, pb2.w, pb2.h, 28); }
      cutLayer(ctx, car, i);
    } else {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      if (pic && pic.mode === 'bg') picDraw(ctx, pic, 0, 0, W, H, 0); else if (pic) { var pb1 = picBox(pic); picDraw(ctx, pic, pb1.x, pb1.y, pb1.w, pb1.h, 28); }
      cutLayer(ctx, car, i);
      ctx.strokeStyle = FRAME; ctx.lineWidth = 6; ctx.strokeRect(37, 37, W - 74, H - 74);
      if (car.handle !== false) { setB(ctx, 30, 700); ctx.fillStyle = GREEN; ctx.textAlign = 'left'; var hd = '@auntietobi_uk', hw = ctx.measureText(hd).width; ctx.fillText(hd, (W - hw) / 2, H - 84); }
    }
    // 2 · the space for the words
    var x0 = 112, cw = W - 224, top = 150, bot = H - 150;
    if (isPurple(car)) { var cs0 = cutSide(car, i); if (cs0.left || cs0.right) { cw = W * 0.56; x0 = cs0.left && !cs0.right ? W - 96 - cw : 96; } }
    if (pic && pic.mode !== 'bg') { var pb = picBox(pic); top = Math.max(top - 30, pb.top); bot = Math.min(bot, pb.bot); }
    var avail = bot - top, ctr = P.align === 'center', k = sl.kind, over = false;
    ctx.textBaseline = 'alphabetic';
    if (k === 'quote') {
      var qz = Math.round(260 * Math.min(1.2, P.k)), qf = rtFit(ctx, sl.heading, P.head, cw, avail - qz * 0.55 - (sl.body ? 110 : 0), 92 * P.k, 34, P.lh + 0.1, false);
      var who = String(sl.body || '').trim(), blockH = qz * 0.55 + qf.h + (who ? 110 : 0), y = top + Math.max(0, (avail - blockH) / 2);
      ctx.font = '900 ' + qz + 'px Georgia, serif'; ctx.fillStyle = P.acc; ctx.textAlign = ctr ? 'center' : 'left'; ctx.fillText('“', ctr ? W / 2 : x0 - 10, y + qz * 0.72);
      y += qz * 0.55; rtDraw(ctx, qf, P.head, x0, y, cw, ctr ? 'center' : 'left', P.ink, P.hl); y += qf.h;
      if (who) { ctx.fillStyle = P.acc; var lx = ctr ? W / 2 - 40 : x0; ctx.fillRect(lx, y + 34, 80, 6); ctx.font = P.body(38 * P.bk, 700); ctx.fillStyle = P.sub; ctx.textAlign = ctr ? 'center' : 'left'; ctx.fillText('— ' + who.replace(/^[—–-]\s*/, ''), ctr ? W / 2 : x0, y + 96); }
    } else if (k === 'stat') {
      var big = String(sl.heading || '').replace(/\*\*/g, ''), bz = 340 * Math.min(1.3, P.k); ctx.font = P.head(bz); while (ctx.measureText(big).width > cw && bz > 90) { bz -= 8; ctx.font = P.head(bz); }
      var bf = rtFit(ctx, sl.body, function (z) { return P.body(z, 600); }, cw, avail - bz - 60, 52 * P.bk, 26, 1.35, false), bh = bz * 0.9 + 50 + bf.h, y2 = top + Math.max(0, (avail - bh) / 2);
      ctx.font = P.head(bz); ctx.fillStyle = P.acc; ctx.textAlign = ctr ? 'center' : 'left'; ctx.fillText(big, ctr ? W / 2 : x0, y2 + bz * 0.82);
      rtDraw(ctx, bf, function (z) { return P.body(z, 600); }, x0, y2 + bz * 0.9 + 50, cw, ctr ? 'center' : 'left', P.ink, P.acc);
    } else if (k === 'check' || k === 'steps') {
      var items = itemLines(sl.body), hf = rtFit(ctx, sl.heading, P.head, cw, Math.min(avail * 0.35, 320), 96 * P.k, 34, P.lh, P.caps), gapH = 50;
      var room = avail - hf.h - gapH, iz = Math.min(46 * P.bk, room / Math.max(1, items.length) / 1.9), dot = Math.max(44, iz * 1.6), ix = x0 + dot + 28, iw = cw - dot - 28;
      var fits = items.map(function () { return null; }), total;
      for (var tries = 0; tries < 20; tries++) { total = 0; fits = items.map(function (t) { ctx.font = P.body(iz, 600); var f = { size: iz, lines: rtWrap(ctx, t, iw, false), lh: 1.3 }; f.h = Math.max(dot, f.lines.length * iz * 1.3); total += f.h + 26; return f; }); if (total <= room || iz < 24) break; iz -= 2; dot = Math.max(40, iz * 1.6); ix = x0 + dot + 28; iw = cw - dot - 28; }
      over = total > room + 2;
      var y3 = top + Math.max(0, (avail - hf.h - gapH - total) / 2);
      rtDraw(ctx, hf, P.head, x0, y3, cw, ctr && k !== 'steps' && k !== 'check' ? 'center' : 'left', P.ink, P.hl); y3 += hf.h + gapH;
      var firstC = null;
      fits.forEach(function (f, j) {
        var cy = y3 + dot / 2;
        if (k === 'steps' && j < fits.length - 1) { ctx.strokeStyle = P.line; ctx.lineWidth = 5; ctx.setLineDash([2, 12]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + dot / 2, cy + dot / 2 + 6); ctx.lineTo(x0 + dot / 2, cy + f.h + 26 - 6); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = P.acc; ctx.beginPath(); ctx.arc(x0 + dot / 2, cy, dot / 2, 0, 7); ctx.fill(); ctx.fillStyle = P.accInk; ctx.strokeStyle = P.accInk;
        if (k === 'steps') { ctx.font = '800 ' + Math.round(dot * 0.5) + 'px Poppins, Arial'; ctx.textAlign = 'center'; ctx.fillText(String(j + 1), x0 + dot / 2, cy + dot * 0.18); }
        else { ctx.lineWidth = dot * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0 + dot * 0.3, cy + dot * 0.02); ctx.lineTo(x0 + dot * 0.45, cy + dot * 0.17); ctx.lineTo(x0 + dot * 0.72, cy - dot * 0.15); ctx.stroke(); }
        var ty = y3 + Math.max(0, (dot - f.lines.length * f.size * 1.3) / 2); rtDraw(ctx, f, function (z) { return P.body(z, 600); }, ix, ty, iw, 'left', P.ink, P.acc);
        y3 += f.h + 26;
      });
    } else if (k === 'myth') {
      var half = (avail - 40) / 2, lab = '800 30px Poppins, Arial';
      var box = function (y, label, col, text, ink) {
        ctx.fillStyle = rgbaH(col, 0.12); rrect(ctx, x0 - 20, y, cw + 40, half, 28); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(x0 - 20, y + 24, 8, half - 48);
        pill(ctx, label, x0 + 10, y + 30, lab, col, '#FFFFFF', 22, 56);
        var f = rtFit(ctx, text, P.head, cw - 40, half - 140, 70 * P.k, 28, P.lh + 0.04, false); rtDraw(ctx, f, P.head, x0 + 10, y + 110 + Math.max(0, (half - 140 - f.h) / 2), cw - 40, 'left', ink, col);
      };
      box(top, '❌ MYTH', '#D8343A', sl.heading, P.ink); box(top + half + 40, '✅ FACT', '#0E9F57', sl.body || 'Write the fact here', P.ink);
    } else if (k === 'question') {
      var opts = itemLines(sl.body), qr = 74, oz = 40 * P.bk, oh = oz * 2.1, optsH = opts.length ? opts.length * (oh + 18) : 70;
      var qf2 = rtFit(ctx, sl.heading, P.head, cw, avail - qr * 2 - 60 - optsH - 40, 96 * P.k, 34, P.lh, P.caps), tot = qr * 2 + 40 + qf2.h + 50 + optsH, y4 = top + Math.max(0, (avail - tot) / 2);
      ctx.fillStyle = P.acc; ctx.beginPath(); ctx.arc(W / 2, y4 + qr, qr, 0, 7); ctx.fill(); ctx.fillStyle = P.accInk; ctx.font = '900 ' + Math.round(qr * 1.3) + 'px Poppins, Arial'; ctx.textAlign = 'center'; ctx.fillText('?', W / 2, y4 + qr * 1.45);
      y4 += qr * 2 + 40; rtDraw(ctx, qf2, P.head, x0, y4, cw, 'center', P.ink, P.hl); y4 += qf2.h + 50;
      if (opts.length) opts.forEach(function (o, j) { var L2 = String.fromCharCode(65 + j); ctx.strokeStyle = P.acc; ctx.lineWidth = 4; rrect(ctx, x0 + 40, y4, cw - 80, oh, oh / 2); ctx.stroke(); ctx.fillStyle = P.acc; ctx.beginPath(); ctx.arc(x0 + 40 + oh / 2, y4 + oh / 2, oh * 0.36, 0, 7); ctx.fill(); ctx.fillStyle = P.accInk; ctx.font = '800 ' + Math.round(oz * 0.9) + 'px Poppins, Arial'; ctx.textAlign = 'center'; ctx.fillText(L2, x0 + 40 + oh / 2, y4 + oh * 0.63); ctx.textAlign = 'left'; ctx.fillStyle = P.ink; ctx.font = P.body(oz, 600); var tt = o; while (ctx.measureText(tt).width > cw - 80 - oh - 40 && tt.length > 4) tt = tt.slice(0, -2); if (tt !== o) tt += '…'; ctx.fillText(tt, x0 + 40 + oh + 10, y4 + oh * 0.64); y4 += oh + 18; });
      else { ctx.font = P.body(38 * P.bk, 700); ctx.fillStyle = P.sub; ctx.textAlign = 'center'; ctx.fillText('Tell us in the comments 👇🏾', W / 2, y4 + 40); }
    }
    ctx.restore();
    return { over: over, shrunk: false };
  }
  // ── 💜 Bold Purple Pro look + 🧍 cut-out people (background removed) that can spill into the next slide ──
  function isPurple(car) { return !!(car.look && car.look.kind === 'purple'); }
  var PURPLE = { acc: '#4B14A6', ink: '#111111', num: 'auto', btn: 'FOLLOW FOR MORE', handle: '@auntietobi_uk', icons: true, pattern: true, brand: 'Auntie Tobi', brandOn: true, vpos: 'top', hpos: 'auto' };
  // colour sets — '' colours follow the accent
  var PPAL = { purple: { n: '💜 Purple', acc: '#4B14A6', ink: '#111111', bg: '#FFFFFF', sub: '#3A3A44', line: '#281E50' }, green: { n: '💚 Auntie Tobi Green', acc: '#057A44', ink: '#111111', bg: '#FFFFFF', sub: '#33383F', line: '#0E3B23' },
    navy: { n: 'Navy & Gold', acc: '#0F1E36', ink: '#0F1E36', bg: '#FFFBF0', sub: '#3F4A5C', line: '#0F1E36', hl: '#D99A0B', numBg: '#FFB81C', numInk: '#0F1E36', btnBg: '#FFB81C', btnInk: '#0F1E36', wave: '#D99A0B' },
    red: { n: 'Red', acc: '#D7263D', ink: '#111111', bg: '#FFFFFF', sub: '#3A3A44', line: '#5A1020' }, mono: { n: 'Black & White', acc: '#111111', ink: '#111111', bg: '#FFFFFF', sub: '#3A3A44', line: '#111111' } };
  function pur(car) {
    var P = Object.assign({}, PURPLE, (car.look && car.look.purple) || {});
    ['bg', 'sub', 'line'].forEach(function (k) { if (!P[k]) P[k] = { bg: '#FFFFFF', sub: '#3A3A44', line: '#281E50' }[k]; });
    ['hl', 'numBg', 'btnBg', 'wave'].forEach(function (k) { if (!P[k]) P[k] = P.acc; });
    ['numInk', 'btnInk'].forEach(function (k) { if (!P[k]) P[k] = hexLum(k === 'numInk' ? P.numBg : P.btnBg) > 0.6 ? '#111111' : '#FFFFFF'; });
    return P;
  }
  function boxPic(sl) { return sl && sl.pic && sl.pic.img && sl.pic.mode !== 'cut' ? sl.pic : null; }
  function cutPic(sl) { return sl && sl.pic && sl.pic.img && sl.pic.mode === 'cut' ? sl.pic : null; }
  function cutGeom(p, im) {
    var bb = p.bb || [0, 0, 1, 1], sw = Math.max(4, im.naturalWidth * bb[2]), sh = Math.max(4, im.naturalHeight * bb[3]), h = H * clamp(Number(p.size) || 0.85, 0.3, 1.3), w = h * sw / sh;
    var side = p.side || 'right', cx = side === 'left' ? W * 0.25 : side === 'center' ? W * 0.5 : W * 0.76;
    if (p.spill) cx = side === 'left' ? 0 : W;   // stands on the edge → carries on into the next (or previous) slide
    cx += ((p.fx == null ? 0.5 : p.fx) - 0.5) * W * 0.6;
    var bottom = H * (0.72 + (p.fy == null ? 0.5 : p.fy) * 0.5);
    if (p.px != null && p.py != null) { cx = p.px * W; bottom = p.py * H; }   // ✋ dragged to a spot
    return { sx: im.naturalWidth * bb[0], sy: im.naturalHeight * bb[1], sw: sw, sh: sh, x: cx - w / 2, y: bottom - h, w: w, h: h };
  }
  function cutDraw(ctx, p, dx) {
    var im = picImg(p.img); if (!im) return;
    var g = cutGeom(p, im); ctx.save(); ctx.globalAlpha = 1 - clamp(Number(p.fade) || 0, 0, 0.9);
    if (p.flip) { ctx.translate(g.x + dx + g.w / 2, 0); ctx.scale(-1, 1); ctx.drawImage(im, g.sx, g.sy, g.sw, g.sh, -g.w / 2, g.y, g.w, g.h); }
    else ctx.drawImage(im, g.sx, g.sy, g.sw, g.sh, g.x + dx, g.y, g.w, g.h);
    ctx.restore();
  }
  // does a person cross into the next slide (right edge) / previous slide (left edge)?
  function cutEdge(p) {
    if (!p) return { r: false, l: false };
    if (p.px == null || p.py == null) return { r: !!(p.spill && p.side !== 'left'), l: !!(p.spill && p.side === 'left') };
    var im = picImg(p.img); if (!im) return { r: p.px > 0.9, l: p.px < 0.1 };
    var g = cutGeom(p, im); return { r: g.x + g.w > W + 4, l: g.x < -4 };
  }
  function cutLayer(ctx, car, i) {
    var prev = cutPic(car.slides[i - 1]), next = cutPic(car.slides[i + 1]), own = cutPic(car.slides[i]);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (prev && cutEdge(prev).r) cutDraw(ctx, prev, -W);
    if (next && cutEdge(next).l) cutDraw(ctx, next, W);
    if (own) cutDraw(ctx, own, 0);
    ctx.restore();
  }
  // which side the words go: away from the person on this slide
  function cutSide(car, i) {
    var own = cutPic(car.slides[i]), prev = cutPic(car.slides[i - 1]), next = cutPic(car.slides[i + 1]);
    var oL = own && (own.px != null && own.py != null ? own.px < 0.5 : own.side === 'left');
    var L = oL || (prev && cutEdge(prev).r), R = (own && !oL) || (next && cutEdge(next).l);
    return { left: !!L, right: !!R };
  }
  function hash2(a, b) { var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  // faint line network — drawn in carousel-wide coordinates so it runs on seamlessly from slide to slide
  function purplePattern(ctx, i, col) {
    var G = 190, x0 = i * W, c0 = Math.floor((x0 - G) / G), c1 = Math.ceil((x0 + W + G) / G), r1 = Math.ceil(H / G) + 1;
    var pt = function (c, r) { return [c * G + (hash2(c, r) - 0.5) * G * 0.8 - x0, r * G + (hash2(r + 91, c + 17) - 0.5) * G * 0.8]; };
    ctx.save(); ctx.strokeStyle = rgbaH(col || '#281E50', 0.075); ctx.fillStyle = rgbaH(col || '#281E50', 0.12); ctx.lineWidth = 2;
    for (var c = c0; c <= c1; c++) for (var r = -1; r <= r1; r++) {
      var p = pt(c, r), nb = [[c + 1, r], [c, r + 1]]; if (hash2(c * 7, r * 3) > 0.45) nb.push([c + 1, r + 1]); if (hash2(c * 5 + 1, r * 11) > 0.6) nb.push([c - 1, r + 1]);
      nb.forEach(function (q) { var b = pt(q[0], q[1]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function purpleWaves(ctx, P) {
    ctx.save();
    for (var k = 0; k < 18; k++) {
      ctx.beginPath(); for (var x = -20; x <= W + 20; x += 12) { var y = H * 0.74 + k * 7 + Math.sin(x / W * Math.PI * 2.2 + k * 0.22) * 70 + Math.sin(x / W * Math.PI * 5 + k * 0.5) * 16; if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = rgbaH(P.wave, 0.10 + 0.04 * (k % 5)); ctx.lineWidth = 2.2; ctx.stroke();
    }
    var g = ctx.createLinearGradient(W * 0.4, H, W, H * 0.85); g.addColorStop(0, P.wave); g.addColorStop(1, rgbaH(P.wave, 0.75));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W * 0.38, H); ctx.lineTo(W, H * 0.86); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function purpleHead(z) { return '400 ' + Math.round(z) + 'px Anton, "Inter Tight", Arial, sans-serif'; }
  function purpleBody(z, w) { return (w || 500) + ' ' + Math.round(z) + 'px "DM Sans", Inter, Arial, sans-serif'; }
  function drawPurple(ctx, car, i) {
    var sl = car.slides[i] || { kind: 'tip', heading: '', body: '' }, P = pur(car), e = eff(car, sl), bp = boxPic(sl), cs = cutSide(car, i);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    if (P.pattern) purplePattern(ctx, i, P.line);
    var top = 100, bot = H - 100;
    if (bp && bp.mode === 'bg') picDraw(ctx, bp, 0, 0, W, H, 0); else if (bp) { var pb = picBox(bp); picDraw(ctx, bp, pb.x, pb.y, pb.w, pb.h, 28); top = pb.top; bot = pb.bot; }
    if (sl.kind === 'end') purpleWaves(ctx, P);
    cutLayer(ctx, car, i);
    // where the words sit: up/down and side to side (carousel setting, or this slide's own)
    var vp = sl.vpos || P.vpos || 'top', hp = sl.hpos || P.hpos || 'auto';
    var side = hp === 'auto' ? (cs.left && !cs.right ? 'right' : 'left') : hp, narrow = cs.left || cs.right, M = 96;
    var cw = narrow ? W * 0.5 : W - M * 2, x0 = side === 'right' ? W - M - cw : side === 'center' ? (W - cw) / 2 : M, al = side;
    var bx = function (w) { return side === 'right' ? x0 + cw - w : side === 'center' ? x0 + (cw - w) / 2 : x0; };   // left edge of a box w wide
    var place = function (h, reserveBot) { var room = bot - (reserveBot || 0) - top - 10; return top + 10 + (vp === 'middle' ? Math.max(0, (room - h) / 2) : vp === 'bottom' ? Math.max(0, room - h) : 0); };
    var brandH = P.brandOn && P.brand && sl.kind === 'cover' ? 70 : 0;
    if (sl.kind === 'cover') {
      var hf = rtFit(ctx, sl.heading, purpleHead, cw, (bot - top) * 0.62, 175 * e.hs, 50, 1.02, true);
      var bf = sl.body ? rtFit(ctx, sl.body, purpleBody, cw, 200, 38 * e.bs, 22, 1.35, false) : null, hasH = car.handle !== false && P.handle;
      var blk = hf.h + (bf ? 40 + bf.h : 0) + (hasH ? 40 + 54 : 0), y = place(blk, vp === 'bottom' ? 0 : brandH);
      rtDraw(ctx, hf, purpleHead, x0, y, cw, al, P.ink, P.hl); y += hf.h;
      if (bf) { y += 40; rtDraw(ctx, bf, purpleBody, x0, y, cw, al, P.sub, P.hl); y += bf.h; }
      if (hasH) { y += 40; ctx.font = purpleBody(27, 700); var t = P.handle, pw = ctx.measureText(t).width + 56, px = bx(pw); ctx.strokeStyle = P.acc; ctx.lineWidth = 3; rrect(ctx, px, y, pw, 54, 27); ctx.stroke(); ctx.fillStyle = P.acc; ctx.textAlign = 'left'; ctx.fillText(t, px + 28, y + 36); }
      if (brandH) {   // the brand name (top when the words sit at the bottom)
        ctx.font = purpleBody(30, 800); ctx.textAlign = 'left'; var bt = P.brand, bw = ctx.measureText(bt).width + 46, bxx = bx(bw), by = vp === 'bottom' ? 96 : H - 128;
        ctx.fillStyle = P.acc; rrect(ctx, bxx, by, 34, 34, 8); ctx.fill(); ctx.fillStyle = P.ink; ctx.fillText(bt, bxx + 46, by + 27);
      }
    } else if (sl.kind === 'end') {
      var hf2 = rtFit(ctx, sl.heading, purpleHead, cw, (bot - top) * 0.4, 130 * e.hs, 44, 1.02, true), bfn = function (z) { return purpleBody(z, 800); };
      var bf2 = sl.body ? rtFit(ctx, sl.body, bfn, cw, 140, 32 * e.bs, 20, 1.3, true) : null;
      var words = String(P.btn || '').toUpperCase().split(/\s+/).filter(Boolean), l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      ctx.font = purpleHead(64); var bw2 = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + 70, bh = l1 ? (l2 ? 170 : 104) : 0;
      var blk2 = hf2.h + (bf2 ? 30 + bf2.h : 0) + (bh ? 70 + bh : 0), y2 = place(blk2, P.icons ? 90 : 0);
      rtDraw(ctx, hf2, purpleHead, x0, y2, cw, al, P.acc, P.ink); y2 += hf2.h;
      if (bf2) { y2 += 30; rtDraw(ctx, bf2, bfn, x0, y2, cw, al, P.ink, P.hl); y2 += bf2.h; }
      if (bh) {   // the tilted button
        y2 += 70; var bcx = bx(bw2 + 20) + bw2 / 2 + 10, bcy = y2 + bh / 2;
        ctx.save(); ctx.translate(bcx, bcy); ctx.rotate(-0.09);
        ctx.strokeStyle = P.btnBg; ctx.lineWidth = 4; rrect(ctx, -bw2 / 2 + 12, -bh / 2 + 12, bw2, bh, 14); ctx.stroke();
        ctx.fillStyle = P.btnBg; rrect(ctx, -bw2 / 2, -bh / 2, bw2, bh, 14); ctx.fill();
        ctx.font = purpleHead(64); ctx.fillStyle = P.btnInk; ctx.textAlign = 'center'; ctx.fillText(l1, 0, l2 ? -8 : 24); if (l2) ctx.fillText(l2, 0, 62); ctx.restore();
      }
      if (P.icons) {   // a small row of social dots + the handle
        var gy = H - 120, ic = ['f', '◎', '♪', '▶', '𝕏'], step = 46;
        ctx.font = purpleBody(26, 700); var ht = car.handle !== false ? P.handle : '', hw = ctx.measureText(ht).width, rowW = ic.length * step + (ht ? 14 + hw : 0), sx = bx(rowW);
        ic.forEach(function (g, k) { var cx = sx + k * step + 18; ctx.fillStyle = P.acc; ctx.beginPath(); ctx.arc(cx, gy, 18, 0, 7); ctx.fill(); ctx.fillStyle = hexLum(P.acc) > 0.6 ? '#111111' : '#FFFFFF'; ctx.font = '700 20px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g, cx, gy + 7); });
        if (ht) { ctx.font = purpleBody(26, 700); ctx.fillStyle = P.ink; ctx.textAlign = 'left'; ctx.fillText(ht, sx + ic.length * step + 14, gy + 9); }
      }
    } else {
      var dn = e.num ? 150 : 0, bwid = narrow || side === 'center' ? cw : cw * 0.8;
      var hf3 = rtFit(ctx, sl.heading, purpleHead, cw, (bot - top) * 0.42, 128 * e.hs, 40, 1.02, true);
      var bf3 = sl.body ? rtFit(ctx, sl.body, purpleBody, bwid, Math.max(60, (bot - top) - hf3.h - dn - 90), 33 * e.bs, 18, 1.42, false) : null;
      // top: number circle stays at the bottom · middle: it follows the words · bottom: words sit just above it
      var np = sl.npos || P.num; np = { left: 'bl', center: 'bc', right: 'br' }[np] || np;   // old saves: left/centre/right = along the bottom
      var nTop = dn && /^t/.test(np), nY0 = top + 75; if (nTop) top += dn + 30;
      var follow = np === 'auto' && vp === 'middle', blk3 = hf3.h + (bf3 ? 34 + bf3.h : 0) + (follow && dn ? 40 + dn : 0), y3 = place(blk3, !follow && !nTop && dn ? dn + 40 : 0);
      rtDraw(ctx, hf3, purpleHead, x0, y3, cw, al, P.ink, P.hl); y3 += hf3.h;
      if (bf3) { y3 += 34; rtDraw(ctx, bf3, purpleBody, bx(bwid), y3, bwid, al, P.sub, P.hl); y3 += bf3.h; }
      if (e.num) {
        var ncx = /r$/.test(np) ? W - M - 75 : /c$/.test(np) ? W / 2 : M + 75, ncy = nTop ? nY0 : follow ? y3 + 40 + 75 : bot - 75;
        if (np === 'auto') ncx = side === 'right' ? x0 + cw - 75 : side === 'center' ? W / 2 : x0 + 75;
        ctx.fillStyle = P.numBg; ctx.beginPath(); ctx.arc(ncx, ncy, 75, 0, 7); ctx.fill(); ctx.fillStyle = P.numInk; ctx.font = '800 66px Poppins, Arial'; ctx.textAlign = 'center'; ctx.fillText(pad(tipNumber(car, i)), ncx, ncy + 23);
      }
    }
    ctx.restore();
    return { over: false, shrunk: false };
  }
  // 👉 the Swipe sign — one setting for every look: cover only / every slide but the last / off
  function swipeOf(car) {
    var m = car.swipeMode || (isSpec(car) ? (car.look.spec.swipe ? 'all' : 'off') : (car.swipe !== false ? 'cover' : 'off'));
    return { mode: m, style: car.swipeStyle || 'text', pos: car.swipePos || 'br' };
  }
  function drawSwipe(ctx, car, i) {
    var o = swipeOf(car), n = car.slides.length, sl = car.slides[i] || {};
    if (o.mode === 'off' || n < 2 || i >= n - 1 || (o.mode === 'cover' && i !== 0)) return;
    var spec = isSpec(car), sp = spec ? car.look.spec : null, photo = spec && sp.bg.type === 'image' && sp.bg.img && (sp.bg.where === 'all' || i === 0);
    var pbg = sl.pic && sl.pic.img && sl.pic.mode === 'bg' && (sl.pic.fade || 0) < 0.5;
    var acc = spec ? sp.accent : isPurple(car) ? pur(car).acc : GREEN, quiet = spec ? sp.sub : isPurple(car) ? pur(car).acc : GREY, onImg = photo || pbg;
    var font = spec ? (window.HQStyle.FONTS[sp.font.body] || window.HQStyle.FONTS.dmsans).b : FB;
    var edge = spec ? (sp.frame.on ? sp.frame.inset + sp.frame.width : 0) + 64 : 112;
    // keep clear of the handle when it sits in the same corner
    var hp = spec ? sp.handle.pos : isPurple(car) ? 'none' : (car.handle !== false && sl.kind !== 'cover' && sl.kind !== 'end' ? 'bottom-center' : 'none');
    var clash = (o.pos === 'br' && hp === 'bottom-right') || (o.pos === 'bc' && hp === 'bottom-center');
    var base = (spec ? H - edge + 4 : H - 84) - (clash ? 62 : 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = 'alphabetic';
    var txt = 'Swipe', fz = 32, arrowW = 46, gap = 12;
    if (o.style === 'arrow') {
      var d = 86, cx = o.pos === 'bc' ? W / 2 : W - edge - d / 2 + (o.pos === 'mr' ? 24 : 0), cy = o.pos === 'mr' ? H / 2 : base - d * 0.36;
      ctx.fillStyle = onImg ? 'rgba(255,255,255,0.92)' : acc; ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, 7); ctx.fill();
      ctx.strokeStyle = onImg ? '#111111' : (hexLum(acc) > 0.6 ? '#111111' : '#FFFFFF'); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 17, cy); ctx.lineTo(cx + 15, cy); ctx.moveTo(cx + 2, cy - 14); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx + 2, cy + 14); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.font = '700 ' + fz + 'px ' + font; var tw = ctx.measureText(txt).width, bw = tw + gap + arrowW;
    var pill = o.style === 'pill', padX = pill ? 30 : 0, h = pill ? 70 : fz, totW = bw + padX * 2;
    var x = o.pos === 'bc' ? (W - totW) / 2 : W - edge - totW + (o.pos === 'mr' && pill ? 34 : 0), yMid = o.pos === 'mr' ? H / 2 : base - (pill ? h / 2 - 10 : fz * 0.36);
    var ink = pill ? (onImg ? '#111111' : (hexLum(acc) > 0.6 ? '#111111' : '#FFFFFF')) : (onImg ? '#FFFFFF' : spec ? acc : quiet);
    if (pill) { ctx.fillStyle = onImg ? 'rgba(255,255,255,0.92)' : acc; rrect(ctx, x, yMid - h / 2, totW, h, h / 2); ctx.fill(); }
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.textAlign = 'left'; ctx.fillText(txt, x + padX, yMid + fz * 0.36);
    var ax = x + padX + tw + gap; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax, yMid); ctx.lineTo(ax + arrowW - 4, yMid); ctx.moveTo(ax + arrowW - 16, yMid - 12); ctx.lineTo(ax + arrowW - 3, yMid); ctx.lineTo(ax + arrowW - 16, yMid + 12); ctx.stroke();
    ctx.restore();
  }
  function draw(ctx, car0, i) {
    // the looks' own swipe text is switched off — drawSwipe draws the one the user chose
    var car = Object.assign({}, car0, { swipe: false });
    if (isSpec(car0)) car.look = Object.assign({}, car0.look, { spec: Object.assign({}, car0.look.spec, { swipe: false }) });
    var sl0 = car.slides[i], r = sl0 && NEWK[sl0.kind] ? drawLayout(ctx, car, i) : isPurple(car) ? drawPurple(ctx, car, i) : isSpec(car) ? drawSpec(ctx, car, i) : drawWhite(ctx, car, i), sl = sl0;
    drawSwipe(ctx, car0, i);
    if (sl && sl.deco && sl.deco.length) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); sl.deco.forEach(function (d) { drawDeco(ctx, d); }); ctx.restore(); }
    return r;
  }

  // ── ✨ decorations: arrows, stickers, shapes, emoji (x/y = centre, 0–1; s = size; r = turn in degrees) ──
  var DECO = {
    'arrow-curly': '↪️ Curly arrow', 'arrow-straight': '➡️ Straight arrow', 'arrow-loop': '➰ Loop arrow', 'arrow-down': '⤵️ Down arrow', swipe: '👉 Swipe sign',
    brush: '🖌️ Brush stroke', scribble: '〰️ Scribble underline', ring: '⭕ Hand-drawn circle', sparkle: '✨ Sparkle', star: '⭐ Star', heart: '❤️ Heart', tick: '✅ Tick', cross: '❌ Cross',
    badge: '🏷️ Badge (TIP, NEW…)', bubble: '💬 Speech bubble', quote: '❝ Quote marks', tape: '📎 Tape', dots: '⠿ Dots', blob: '🫧 Soft blob', emoji: '😀 Any emoji'
  };
  function hexLum(h) { h = String(h || '#000').replace('#', ''); var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function head(ctx, x, y, ang, sz) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sz * Math.cos(ang - 0.5), y - sz * Math.sin(ang - 0.5)); ctx.moveTo(x, y); ctx.lineTo(x - sz * Math.cos(ang + 0.5), y - sz * Math.sin(ang + 0.5)); ctx.stroke(); }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star(ctx, pts, ro, ri) { ctx.beginPath(); for (var k = 0; k < pts * 2; k++) { var rad = k % 2 ? ri : ro, a = -Math.PI / 2 + k * Math.PI / pts; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); }
  function drawDeco(ctx, d) {
    var c = d.c || '#057A44', S = 200 * (d.s || 1);
    ctx.save(); ctx.translate(d.x * W, d.y * H); ctx.rotate((d.r || 0) * Math.PI / 180); if (d.flip) ctx.scale(-1, 1);
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, S * 0.06);
    var t = d.t;
    if (t === 'arrow-curly') { ctx.beginPath(); ctx.moveTo(-S * 0.5, S * 0.25); ctx.bezierCurveTo(-S * 0.35, -S * 0.35, S * 0.15, -S * 0.4, S * 0.45, -S * 0.05); ctx.stroke(); head(ctx, S * 0.45, -S * 0.05, 0.75, S * 0.2); }
    else if (t === 'arrow-straight') { ctx.beginPath(); ctx.moveTo(-S * 0.5, 0); ctx.lineTo(S * 0.48, 0); ctx.stroke(); head(ctx, S * 0.5, 0, 0, S * 0.22); }
    else if (t === 'arrow-loop') { ctx.beginPath(); ctx.moveTo(-S * 0.55, S * 0.2); ctx.bezierCurveTo(-S * 0.2, S * 0.2, -S * 0.05, -S * 0.35, -S * 0.25, -S * 0.3); ctx.bezierCurveTo(-S * 0.45, -S * 0.25, -S * 0.2, S * 0.25, S * 0.1, S * 0.1); ctx.quadraticCurveTo(S * 0.3, 0, S * 0.5, -S * 0.1); ctx.stroke(); head(ctx, S * 0.5, -S * 0.1, -0.45, S * 0.2); }
    else if (t === 'arrow-down') { ctx.beginPath(); ctx.moveTo(-S * 0.35, -S * 0.45); ctx.bezierCurveTo(S * 0.35, -S * 0.4, S * 0.35, S * 0.1, S * 0.05, S * 0.45); ctx.stroke(); head(ctx, S * 0.05, S * 0.45, 2.1, S * 0.2); }
    else if (t === 'swipe') { var tx = d.txt || 'Swipe'; ctx.font = '800 ' + Math.round(S * 0.22) + 'px Poppins, Arial'; var tw = ctx.measureText(tx).width, w = tw + S * 0.55, h = S * 0.38; rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = hexLum(c) > 0.6 ? '#111' : '#fff'; ctx.strokeStyle = ctx.fillStyle; ctx.textBaseline = 'middle'; ctx.fillText(tx, -w / 2 + S * 0.14, 2); ctx.lineWidth = Math.max(3, S * 0.035); ctx.beginPath(); ctx.moveTo(w / 2 - S * 0.33, 0); ctx.lineTo(w / 2 - S * 0.12, 0); ctx.stroke(); head(ctx, w / 2 - S * 0.12, 0, 0, S * 0.09); }
    else if (t === 'brush') { ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.moveTo(-S * 0.6, -S * 0.05); ctx.quadraticCurveTo(0, -S * 0.14, S * 0.62, -S * 0.08); ctx.lineTo(S * 0.58, S * 0.06); ctx.quadraticCurveTo(0, S * 0.12, -S * 0.58, S * 0.08); ctx.closePath(); ctx.fill(); }
    else if (t === 'scribble') { ctx.beginPath(); for (var k = 0; k <= 10; k++) { var xx = -S * 0.6 + k * S * 0.12, yy = (k % 2 ? -1 : 1) * S * 0.05; ctx[k ? 'lineTo' : 'moveTo'](xx, yy); } ctx.stroke(); }
    else if (t === 'ring') { ctx.beginPath(); ctx.ellipse(0, 0, S * 0.6, S * 0.32, -0.05, 0.2, Math.PI * 2 + 0.1); ctx.stroke(); ctx.globalAlpha = 0.6; ctx.lineWidth *= 0.6; ctx.beginPath(); ctx.ellipse(S * 0.02, -S * 0.02, S * 0.62, S * 0.3, 0.04, 0, Math.PI * 1.2); ctx.stroke(); }
    else if (t === 'sparkle') { [[0, 0, 1], [S * 0.38, -S * 0.3, 0.45], [-S * 0.34, S * 0.32, 0.35]].forEach(function (q) { ctx.save(); ctx.translate(q[0], q[1]); star(ctx, 4, S * 0.3 * q[2], S * 0.07 * q[2]); ctx.fill(); ctx.restore(); }); }
    else if (t === 'star') { star(ctx, 5, S * 0.4, S * 0.17); ctx.fill(); }
    else if (t === 'heart') { var hs = S * 0.4; ctx.beginPath(); ctx.moveTo(0, hs * 0.9); ctx.bezierCurveTo(-hs * 1.4, -hs * 0.1, -hs * 0.6, -hs * 1.1, 0, -hs * 0.35); ctx.bezierCurveTo(hs * 0.6, -hs * 1.1, hs * 1.4, -hs * 0.1, 0, hs * 0.9); ctx.fill(); }
    else if (t === 'tick' || t === 'cross') { ctx.beginPath(); ctx.arc(0, 0, S * 0.36, 0, 7); ctx.fill(); ctx.strokeStyle = hexLum(c) > 0.6 ? '#111' : '#fff'; ctx.lineWidth = S * 0.07; ctx.beginPath(); if (t === 'tick') { ctx.moveTo(-S * 0.16, 0); ctx.lineTo(-S * 0.03, S * 0.13); ctx.lineTo(S * 0.18, -S * 0.12); } else { ctx.moveTo(-S * 0.13, -S * 0.13); ctx.lineTo(S * 0.13, S * 0.13); ctx.moveTo(S * 0.13, -S * 0.13); ctx.lineTo(-S * 0.13, S * 0.13); } ctx.stroke(); }
    else if (t === 'badge' || t === 'bubble') {
      var bt = d.txt || (t === 'badge' ? 'TIP' : 'Did you know?'); ctx.font = '800 ' + Math.round(S * (t === 'badge' ? 0.24 : 0.2)) + 'px Poppins, Arial'; var bw = ctx.measureText(bt).width + S * 0.36, bh = S * (t === 'badge' ? 0.4 : 0.42);
      rrect(ctx, -bw / 2, -bh / 2, bw, bh, t === 'badge' ? bh / 2 : S * 0.1); ctx.fill();
      if (t === 'bubble') { ctx.beginPath(); ctx.moveTo(-bw * 0.25, bh / 2 - 2); ctx.lineTo(-bw * 0.32, bh / 2 + S * 0.16); ctx.lineTo(-bw * 0.08, bh / 2 - 2); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = hexLum(c) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bt, 0, 2);
    }
    else if (t === 'quote') { ctx.font = '900 ' + Math.round(S * 0.9) + 'px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('“', 0, S * 0.2); }
    else if (t === 'tape') { ctx.globalAlpha = 0.55; ctx.fillRect(-S * 0.4, -S * 0.1, S * 0.8, S * 0.2); }
    else if (t === 'dots') { for (var r2 = 0; r2 < 4; r2++) for (var c2 = 0; c2 < 4; c2++) { ctx.beginPath(); ctx.arc(-S * 0.3 + c2 * S * 0.2, -S * 0.3 + r2 * S * 0.2, S * 0.035, 0, 7); ctx.fill(); } }
    else if (t === 'blob') { ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.moveTo(S * 0.5, 0); ctx.bezierCurveTo(S * 0.5, S * 0.4, S * 0.1, S * 0.5, -S * 0.2, S * 0.4); ctx.bezierCurveTo(-S * 0.6, S * 0.3, -S * 0.55, -S * 0.3, -S * 0.15, -S * 0.42); ctx.bezierCurveTo(S * 0.2, -S * 0.55, S * 0.5, -S * 0.35, S * 0.5, 0); ctx.fill(); }
    else if (t === 'emoji') { ctx.font = Math.round(S * 0.7) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.txt || '🔥', 0, 0); }
    ctx.restore();
  }
  function tipNumber(car, i) { var n = 0; for (var k = 0; k <= i; k++) if (car.slides[k].kind === 'tip') n++; return n; }
  function drawWhite(ctx, car, i) {
    var sl = car.slides[i] || { kind: 'tip', heading: '', body: '' }, over = false, shrunk = false;
    var e = eff(car, sl), st = e.st, dh = decoH(e.brush);
    var align = sl.align === 'left' ? 'left' : 'center';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    var pic = boxPic(sl), TOP = TOP0, BOT = BOT0;
    if (pic && pic.mode === 'bg') picDraw(ctx, pic, 0, 0, W, H, 0);
    else if (pic) { var pb = picBox(pic); picDraw(ctx, pic, pb.x, pb.y, pb.w, pb.h, 28); TOP = pb.top; BOT = pb.bot; }
    cutLayer(ctx, car, i);
    ctx.strokeStyle = FRAME; ctx.lineWidth = 6; ctx.strokeRect(37, 37, W - 74, H - 74);
    ctx.textAlign = 'left';
    var availH = BOT - TOP, blockH, y, hr, br, maxS;
    if (sl.kind === 'tip') {
      var num = e.num ? pad(tipNumber(car, i)) : '', numSize = Math.round(180 * clamp(e.hs, 0.6, 1.3) * (pic && pic.mode !== 'bg' ? 0.7 : 1));
      var bodyMax = sl.body ? (pic && pic.mode !== 'bg' ? 260 : 380) : 0;
      maxS = 118 * st.k * e.hs;
      hr = fitHeading(ctx, st, sl.heading, CW, availH - (num ? numSize + 20 : 0) - (bodyMax ? bodyMax + 34 : 0) - dh - 44, maxS, 40);
      br = sl.body ? fitBody(ctx, sl.body, CW, bodyMax, 500, 46 * e.bs) : null;
      blockH = (num ? numSize * 0.86 + 22 : 0) + hr.h + (br ? 34 + br.h : 0) + (dh ? 44 + dh : 0);
      y = TOP + Math.max(0, (availH - blockH) / 2);
      if (num) { wordFont(ctx, st.gf ? Object.assign({}, st, { gf: null }) : st, numSize, false); ctx.fillStyle = GREEN; var nw = ctx.measureText(num).width; ctx.fillText(num, align === 'left' ? L - 6 : L + (CW - nw) / 2, y + numSize * 0.8); y += numSize * 0.86 + 22; }
      drawHeading(ctx, st, hr, L, y, align, CW); y += hr.h;
      if (br) { y += 34; setB(ctx, br.size, 500); ctx.fillStyle = BODY; br.lines.forEach(function (ln, k) { var lw = ctx.measureText(ln).width; ctx.fillText(ln, align === 'left' ? L : L + (CW - lw) / 2, y + k * br.lh + br.size); }); y += br.h; over = over || br.over; }
      deco(ctx, e.brush, y + 44, align);
    } else {
      var isEnd = sl.kind === 'end';
      br = sl.body ? fitBody(ctx, sl.body, CW, 200, 700, 40 * e.bs) : null;
      var WL = 74, WCW = W - 2 * WL;
      maxS = (isEnd ? 132 : 140) * st.k * e.hs;
      hr = fitHeading(ctx, st, sl.heading, align === 'left' ? CW : WCW, availH - dh - 40 - (br ? br.h + 40 : 0) - 40, maxS, 44, true);
      blockH = hr.h + (dh ? 40 + dh : 0) + (br ? 40 + br.h : 0);
      y = TOP + Math.max(0, (availH - blockH) / 2) - (isEnd ? 0 : 20);
      drawHeading(ctx, st, hr, align === 'left' ? L : WL, y, align, align === 'left' ? CW : WCW); y += hr.h;
      if (dh) { deco(ctx, e.brush, y + 40, align); y += 40 + dh; }
      if (br) { y += 40; setB(ctx, br.size, 700); ctx.fillStyle = isEnd ? GREEN : BODY; br.lines.forEach(function (ln, k) { var lw = ctx.measureText(ln).width; ctx.fillText(ln, align === 'left' ? L : L + (CW - lw) / 2, y + k * br.lh + br.size); }); over = over || br.over; }
    }
    over = over || hr.over;
    shrunk = (e.hs > 1.02 && hr.size < maxS * 0.97) || (e.bs > 1.02 && br && br.shrunk);
    // footer
    setB(ctx, 30, 700);
    if (sl.kind === 'cover' && car.swipe !== false && car.slides.length > 1) { ctx.fillStyle = GREY; var sw = 'Swipe →', swW = ctx.measureText(sw).width; ctx.fillText(sw, R - swW, H - 84); }
    else if (sl.kind === 'tip' && car.handle !== false) { ctx.fillStyle = GREEN; var hd = '@auntietobi_uk', hw = ctx.measureText(hd).width; ctx.fillText(hd, (W - hw) / 2, H - 84); }
    ctx.restore();
    return { over: over, shrunk: !!shrunk };
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['900 100px "Inter Tight"', '500 40px Inter', '700 30px Inter', '400 100px Anton', '800 100px Poppins', '900 100px "Playfair Display"', 'italic 900 100px "Playfair Display"', '400 100px "Archivo Black"', '700 100px Caveat', '700 60px "DM Sans"', '500 30px "DM Sans"', '400 30px "DM Sans"', '700 60px Fraunces', '600 30px "DM Sans"'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }
  async function pngOf(car, i) {
    await loadPics(car);
    var c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), car, i);
    return await new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, 'image/png'); });
  }
  function slug(s) { return String(s || 'carousel').toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'carousel'; }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  // ⬇️ every slide as its own picture: phones get the Save/Share sheet (→ Photos), computers get one file per slide
  async function slideFiles(car) {
    await fontsReady(); var out = [], base = slug(car.title);
    for (var i = 0; i < car.slides.length; i++) out.push(new File([await pngOf(car, i)], base + '-slide-' + pad(i + 1) + '.png', { type: 'image/png' }));
    return out;
  }
  function phoneShare(files) { try { return !!(navigator.canShare && window.matchMedia('(pointer: coarse)').matches && navigator.canShare({ files: files })); } catch (e) { return false; } }
  async function downloadEach(files) { for (var i = 0; i < files.length; i++) { download(files[i], files[i].name); await new Promise(function (ok) { setTimeout(ok, 450); }); } }
  async function exportZip(car) {
    await fontsReady(); var zip = new JSZip();
    for (var i = 0; i < car.slides.length; i++) zip.file(pad(i + 1) + '-slide.png', await pngOf(car, i));
    zip.file('caption.txt', (car.caption || '') + '\n\n' + (car.hashtags || ''));
    download(await zip.generateAsync({ type: 'blob' }), 'auntie-tobi-' + slug(car.title) + '.zip');
  }

  // ── data ──
  function list() { return X.S.tcars || (X.S.tcars = []); }
  function fmt(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function endSlide() { return { kind: 'end', heading: 'Save this & share with **someone who needs it!**', body: 'Follow @auntietobi_uk for more', align: 'center' }; }
  function fromPaste(text, addEnd) {
    var lines = String(text || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, addEnd ? 9 : 10);
    var slides = lines.map(function (ln, i) {
      var p = ln.split('|'), head = p[0].trim(), body = p.slice(1).join('|').trim();
      head = head.replace(/^(\d+[.)]|[-•*])\s+/, '');
      return { kind: i === 0 ? 'cover' : 'tip', heading: head, body: body, align: i === 0 ? 'center' : 'left' };
    });
    if (addEnd && slides.length) slides.push(endSlide());
    return slides;
  }

  function init(x) { X = x; }

  function view() {
    var esc = X.esc;
    document.getElementById('ttl').textContent = 'Carousel Studio';
    document.getElementById('topRight').innerHTML = '<button class="btn primary" id="tcNew">＋ New carousel</button>';
    var items = list();
    document.getElementById('view').innerHTML = '<div class="wrap">' +
      '<div class="note" style="margin-bottom:12px">🎠 <b>Carousel Studio</b> — AI (or a quick paste) writes all the slides at once. Then pick a look (Auntie Tobi White, Green, Bold Yellow… or 🎨 match a style from screenshots), add 🖼️ pictures and ✨ decorations like arrows and stickers, and download the slides as images.</div>' +
      (items.length ? '<div class="cargrid">' + items.map(function (c) {
        return '<div class="card carcard" data-topen="' + c.id + '"><canvas class="carthumb" width="216" height="270" data-tthumb="' + c.id + '"></canvas>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15.5px;line-height:1.3">' + esc(c.title) + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:4px">' + c.slides.length + ' slides</div>' +
          '<div style="font-size:13px;margin-top:6px">' + (c.status === 'posted' ? '<span class="as live">● Posted ' + esc(fmt(c.postedAt)) + '</span>' : '<span class="muted">Draft · edited ' + esc(fmt(c.updatedAt)) + '</span>') + '</div>' +
          '<div class="apact" style="margin-top:10px"><button class="btn primary sm" data-topen="' + c.id + '">✏️ Open</button><button class="btn ghost sm" data-tdel="' + c.id + '">🗑 Delete</button></div></div></div>';
      }).join('') + '</div>' : '<div class="card"><p class="muted">No template carousels yet. Tap <b>＋ New carousel</b> — paste your notes and AI writes every slide, or paste one slide per line.</p></div>') + '</div>';
    document.getElementById('tcNew').onclick = newSheet;
    Array.prototype.forEach.call(document.querySelectorAll('[data-topen]'), function (b) {
      b.onclick = function (e) { if (e.target.closest('[data-tdel]')) return; var c = list().filter(function (x) { return x.id === b.dataset.topen; })[0]; if (c) editor(JSON.parse(JSON.stringify(c))); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tdel]'), function (b) {
      b.onclick = async function (e) {
        e.stopPropagation(); if (!confirm('Delete this carousel?')) return;
        try { await X.api('tc-delete', { id: b.dataset.tdel }); X.S.tcars = list().filter(function (x) { return x.id !== b.dataset.tdel; }); X.toast('Deleted'); view(); } catch (x) { X.toast(x.message); }
      };
    });
    fontsReady().then(function () {
      var big = document.createElement('canvas'); big.width = W; big.height = H; var bx = big.getContext('2d');
      Array.prototype.forEach.call(document.querySelectorAll('[data-tthumb]'), function (cv) {
        var c = list().filter(function (x) { return x.id === cv.dataset.tthumb; })[0]; if (!c) return;
        loadPics({ slides: c.slides.slice(0, 1), look: c.look }).then(function () { draw(bx, c, 0); cv.getContext('2d').drawImage(big, 0, 0, 216, 270); });
      });
    });
  }

  function newSheet() {
    var s = X.sheet('<h2>📝 New template carousel</h2>' +
      '<div class="chipbar" id="tnTab" style="margin:8px 0 12px"><button class="chip" data-v="ai" aria-pressed="true">✨ Write with AI</button><button class="chip" data-v="paste" aria-pressed="false">📋 Quick paste</button></div>' +
      '<div id="tnAi"><p class="muted" style="margin:0 0 10px">Paste notes, a rough idea or a link — AI writes the cover, every tip and the last slide in Auntie Tobi’s voice.</p>' +
        '<label for="tnU">🔗 Link <span class="muted" style="font-weight:400">(optional)</span></label><input id="tnU" placeholder="https://">' +
        '<label for="tnN" style="margin-top:10px">Your notes or idea</label><textarea id="tnN" rows="7" placeholder="e.g. 5 small ways to make life in the UK feel less stressful"></textarea>' +
        '<div class="f2" style="margin-top:10px"><div><label for="tnC">Number of slides</label><select id="tnC">' + [5, 6, 7, 8, 9, 10].map(function (n) { return '<option' + (n === 7 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div></div></div></div>' +
      '<div id="tnPaste" class="hidden"><p class="muted" style="margin:0 0 10px">One slide per line. The first line is the cover. Add body text after a <b>|</b> and put green words in <b>**double stars**</b>.</p>' +
        '<textarea id="tnP" rows="9" placeholder="5 small ways to make life in the UK feel **less stressful!**\nPlan your **week on Sunday** | Check your shifts, bills and appointments for the week ahead.\nSet up **direct debits** | Never miss a bill again.\n..."></textarea></div>' +
      '<label class="chk" style="margin-top:10px"><input type="checkbox" id="tnE" checked> Add a “Save &amp; share” last slide</label>' +
      '<div class="err hidden" id="tnErr"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn ghost" id="tnX">Cancel</button><button class="btn ghost" id="tnBlank">Start blank</button><button class="btn primary" id="tnGo">✨ Write the slides</button></div>');
    var mode = 'ai', $ = function (q) { return s.querySelector(q); };
    Array.prototype.forEach.call(s.querySelectorAll('#tnTab [data-v]'), function (b) {
      b.onclick = function () {
        mode = b.dataset.v;
        Array.prototype.forEach.call(s.querySelectorAll('#tnTab [data-v]'), function (x) { x.setAttribute('aria-pressed', x === b); });
        $('#tnAi').classList.toggle('hidden', mode !== 'ai'); $('#tnPaste').classList.toggle('hidden', mode !== 'paste');
        $('#tnGo').textContent = mode === 'ai' ? '✨ Write the slides' : '➡️ Make the slides';
      };
    });
    $('#tnX').onclick = function () { s.remove(); };
    $('#tnBlank').onclick = function () {
      s.remove();
      var slides = [{ kind: 'cover', heading: 'Your hook goes **here!**', body: '', align: 'center' }, { kind: 'tip', heading: 'First **tip**', body: 'A short explanation of the tip.', align: 'left' }];
      if ($('#tnE').checked) slides.push(endSlide());
      editor({ title: 'New carousel', slides: slides, numbers: true, handle: true, swipe: true, caption: '', hashtags: '#NigeriansInUK #AuntieTobi' }, true);
    };
    $('#tnGo').onclick = async function () {
      var b = this, err = $('#tnErr'), addEnd = $('#tnE').checked; err.classList.add('hidden');
      if (mode === 'paste') {
        var slides = fromPaste($('#tnP').value, addEnd);
        if (!slides.length) { err.textContent = 'Paste at least one line first.'; err.classList.remove('hidden'); return; }
        s.remove();
        editor({ title: slides[0].heading.replace(/\*\*/g, '').slice(0, 140), slides: slides, numbers: true, handle: true, swipe: true, caption: '', hashtags: '#NigeriansInUK #AuntieTobi' }, true);
        return;
      }
      var url = $('#tnU').value.trim(), notes = $('#tnN').value.trim();
      if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      if (!url && notes.length < 10) { err.textContent = 'Add a link or type your idea first.'; err.classList.remove('hidden'); return; }
      b.disabled = true; b.textContent = url ? '✨ Reading the page… (about 20 seconds)' : '✨ Writing… (about 15 seconds)';
      try {
        var r = await X.api('tc-ai', { url: url, notes: notes, count: +$('#tnC').value, end: addEnd });
        var d = r.draft; s.remove();
        editor({ title: d.title, slides: d.slides, numbers: true, handle: true, swipe: true, caption: d.caption, hashtags: d.hashtags }, true);
      } catch (x) { err.textContent = x.message; err.classList.remove('hidden'); b.disabled = false; b.textContent = '✨ Write the slides'; }
    };
  }

  function editor(car, dirty) {
    var esc = X.esc, sel = 0;
    car.slides = car.slides.map(function (x) { return Object.assign({ kind: 'tip', heading: '', body: '', align: 'center' }, x); });
    var ov = document.createElement('div'); ov.className = 'carx';
    ov.innerHTML = '<div class="carbar"><button class="btn ghost sm" id="teX">← Back</button><input id="teTitle" class="cartitle" maxlength="140"><span class="muted" id="teSaved" style="font-size:13px"></span>' +
      '<button class="btn ghost sm" id="teSave">💾 Save</button></div>' +
      '<div class="carbody"><div class="carleft">' +
      '<div class="card" id="teLook"></div>' +
      '<div id="teSlides"></div><button class="btn ghost" id="teAdd" style="width:100%;margin-top:8px">＋ Add a slide</button>' +
      '<div class="card" style="margin-top:12px"><div class="lbl" style="margin-top:0">Caption</div><textarea id="teCap" rows="6"></textarea><div class="lbl">Hashtags</div><textarea id="teTags" rows="2"></textarea><button class="btn ghost sm" id="teCopy" style="margin-top:8px">📋 Copy caption &amp; hashtags</button></div>' +
      '</div><div class="carright"><div class="carstage"><canvas id="teCv" width="1080" height="1350"></canvas></div>' +
      '<div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn ghost sm" id="tePrev">◀</button><span id="teNum" style="font-weight:700;min-width:60px;text-align:center"></span><button class="btn ghost sm" id="teNext">▶</button></div>' +
      '<div class="err hidden" id="teOver" style="margin-top:8px">This slide has too much text to fit — shorten it a little.</div>' +
      '<div class="note hidden" id="teShrunk" style="margin-top:8px">Some text on this slide was made a little smaller so it fits inside the frame.</div>' +
      '<div class="carthumbs" id="teThumbs"></div>' +
      '<div class="card" style="margin-top:10px"><div style="font-weight:800;margin-bottom:6px">⬇️ Download</div>' +
      '<button class="btn primary" id="teAll" style="width:100%">⬇️ All slides as separate pictures</button><div class="muted" id="teAllMsg" style="font-size:12px;margin-top:4px"></div>' +
      '<button class="btn ghost" id="teOne" style="width:100%;margin-top:8px">⬇️ Just this slide (PNG)</button><button class="btn ghost" id="teDl" style="width:100%;margin-top:8px">🗜️ All slides as one .zip</button>' +
      '<p class="muted" style="font-size:12.5px;margin-top:8px">1080×1350 — Instagram’s portrait size. On Instagram: New post → pick the images in order (01, 02…) → paste the caption.</p>' +
      '<button class="btn ghost" id="teAnim" style="width:100%;margin-top:8px">🎬 Send to Animated Carousels</button>' +
      '<button class="btn ghost sm" id="tePosted" style="margin-top:4px"></button></div></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    var $ = function (q) { return ov.querySelector(q); }, cv = $('#teCv'), ctx = cv.getContext('2d');
    $('#teTitle').value = car.title || ''; $('#teCap').value = car.caption || ''; $('#teTags').value = car.hashtags || '';
    function mark() { dirty = true; $('#teSaved').textContent = 'Unsaved changes'; }
    function paint() { var r = draw(ctx, car, sel); $('#teOver').classList.toggle('hidden', !r.over); $('#teShrunk').classList.toggle('hidden', r.over || !r.shrunk); }
    var openOpts = {};
    function pct(v) { return Math.round((Number(v) || 1) * 100) + '%'; }
    function optSummary(sl) {
      var out = [];
      if (sl.style && STYLES[sl.style]) out.push(STYLES[sl.style].name);
      if (sl.hs && sl.hs !== 1) out.push('heading ' + pct(sl.hs));
      if (sl.bs && sl.bs !== 1) out.push('body ' + pct(sl.bs));
      if (sl.brush) out.push('brush ' + sl.brush);
      if (sl.num && sl.kind === 'tip') out.push('number ' + sl.num);
      return out.length ? out.join(' · ') : 'same as the carousel';
    }
    function setSel(i) {
      sel = clamp(i, 0, car.slides.length - 1); $('#teNum').textContent = (sel + 1) + ' / ' + car.slides.length;
      Array.prototype.forEach.call(ov.querySelectorAll('.cslide'), function (el, k) { el.classList.toggle('on', k === sel); });
      Array.prototype.forEach.call(ov.querySelectorAll('#teThumbs canvas'), function (el, k) { el.classList.toggle('on', k === sel); });
      paint();
    }
    var thumbTimer = 0;
    function paintThumbs() {
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(function () {
        var wrapEl = $('#teThumbs'); wrapEl.innerHTML = '';
        var big = document.createElement('canvas'); big.width = W; big.height = H; var bx = big.getContext('2d');
        car.slides.forEach(function (sl, i) {
          var c = document.createElement('canvas'); c.width = 108; c.height = 135; c.className = i === sel ? 'on' : '';
          draw(bx, car, i); c.getContext('2d').drawImage(big, 0, 0, 108, 135);
          c.onclick = function () { setSel(i); var el = ov.querySelectorAll('.cslide')[i]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
          wrapEl.appendChild(c);
        });
      }, 250);
    }
    function slideHtml(sl, i) {
      var kinds = Object.keys(KINDS).map(function (k) { return '<option value="' + k + '"' + (sl.kind === k ? ' selected' : '') + '>' + KINDS[k] + '</option>'; }).join('');
      return '<div class="card cslide' + (i === sel ? ' on' : '') + '" data-i="' + i + '">' +
        '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b style="min-width:26px">' + (i + 1) + '</b>' +
        '<select data-f="kind" style="width:auto;flex:1;min-width:140px">' + kinds + '</select>' +
        '<select data-f="align" style="width:auto"><option value="center"' + (sl.align !== 'left' ? ' selected' : '') + '>Centre</option><option value="left"' + (sl.align === 'left' ? ' selected' : '') + '>Left</option></select>' +
        '<span class="cbtns"><button class="btn link" data-mv="-1" title="Move up">▲</button><button class="btn link" data-mv="1" title="Move down">▼</button><button class="btn link" data-dup title="Duplicate">⧉</button><button class="btn link" data-del title="Delete" style="color:#B42318">✕</button></span></div>' +
        '<label>' + (LBL[sl.kind] || LBL.tip)[0] + '</label><textarea data-f="heading" rows="2" maxlength="240">' + esc(sl.heading) + '</textarea>' +
        '<label>' + (LBL[sl.kind] || LBL.tip)[1] + '</label><textarea data-f="body" rows="' + (/check|steps|question/.test(sl.kind) ? 5 : 3) + '" maxlength="600">' + esc(sl.body) + '</textarea>' +
        '<details class="sopts" data-i="' + i + '"' + (openOpts[i] ? ' open' : '') + ' style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;font-size:14px">⚙️ Slide options <span class="muted" style="font-weight:400">— ' + esc(optSummary(sl)) + '</span></summary>' +
          '<div class="f2" style="margin-top:6px"><div><label>Text style</label><select data-f="style"><option value="">Same as carousel</option>' + Object.keys(STYLES).map(function (k) { return '<option value="' + k + '"' + (sl.style === k ? ' selected' : '') + '>' + STYLES[k].name + '</option>'; }).join('') + '</select></div>' +
          '<div><label>Gold brush</label><select data-f="brush"><option value="">Same as carousel</option><option value="on"' + (sl.brush === 'on' ? ' selected' : '') + '>On</option><option value="off"' + (sl.brush === 'off' ? ' selected' : '') + '>Off</option></select></div></div>' +
          (isPurple(car) ? '<div class="f2"><div><label>Words up / down</label><select data-f="vpos"><option value="">Same as carousel</option>' + [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']].map(function (o) { return '<option value="' + o[0] + '"' + (sl.vpos === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
            '<div><label>Words side to side</label><select data-f="hpos"><option value="">Same as carousel</option>' + [['auto', 'Away from the person'], ['left', 'Left'], ['center', 'Centre'], ['right', 'Right']].map(function (o) { return '<option value="' + o[0] + '"' + (sl.hpos === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' : '') +
          (sl.kind === 'tip' ? '<div class="f2"><div><label>Number</label><select data-f="num"><option value="">Same as carousel</option><option value="on"' + (sl.num === 'on' ? ' selected' : '') + '>Show</option><option value="off"' + (sl.num === 'off' ? ' selected' : '') + '>Hide</option></select></div>' +
            (isPurple(car) ? '<div><label>Number circle sits</label><select data-f="npos"><option value="">Same as carousel</option>' + NPOS.map(function (o) { return '<option value="' + o[0] + '"' + (sl.npos === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '<div></div>') + '</div>' : '') +
          '<div class="f2"><div><label>Heading size <span class="muted" data-pv="hs">' + pct(sl.hs) + '</span></label><input type="range" data-f="hs" min="50" max="160" step="5" value="' + Math.round((sl.hs || 1) * 100) + '"></div>' +
          '<div><label>Body text size <span class="muted" data-pv="bs">' + pct(sl.bs) + '</span></label><input type="range" data-f="bs" min="50" max="160" step="5" value="' + Math.round((sl.bs || 1) * 100) + '"></div></div>' +
          '<button class="btn link" data-reset style="margin-top:4px">↺ Reset this slide’s options</button></details>' + picHtml(sl, i) + decoHtml(sl, i) + '</div>';
    }
    // ── 🎨 the look of the whole carousel ──
    function sw(l) { var s = l.spec; if (l.purple) return 'linear-gradient(135deg,#fff 0 55%,#4B14A6 55%)'; return s ? 'linear-gradient(135deg,' + s.bg.c1 + ' 0 55%,' + s.accent + ' 55%)' : 'linear-gradient(135deg,#fff 0 55%,#057A44 55%)'; }
    function whitePanel() {
      return '<div class="row" style="gap:16px;flex-wrap:wrap;margin-top:10px"><label class="chk"><input type="checkbox" id="teN"' + (car.numbers !== false ? ' checked' : '') + '> Number the tips (01, 02…)</label>' +
        '<label class="chk"><input type="checkbox" id="teH"' + (car.handle !== false ? ' checked' : '') + '> Show @auntietobi_uk</label>' +
        '<label class="chk"><input type="checkbox" id="teB"' + (car.brush !== false ? ' checked' : '') + '> Gold brush stroke</label></div>' +
        '<div class="lbl">Text style</div><div class="chipbar" id="teSt">' + Object.keys(STYLES).map(function (k) { return '<button class="chip" data-v="' + k + '" aria-pressed="' + ((car.style || 'classic') === k) + '">' + STYLES[k].name + '</button>'; }).join('') + '</div>' +
        '<div class="f2" style="margin-top:6px"><div><div class="lbl">Heading size <span id="teHsV"></span></div><input type="range" id="teHs" min="60" max="140" step="5"></div>' +
        '<div><div class="lbl">Body text size <span id="teBsV"></span></div><input type="range" id="teBs" min="60" max="140" step="5"></div></div>';
    }
    function specPanel() {
      var sp = car.look.spec, F = (window.HQStyle && window.HQStyle.FONTS) || {};
      var seg = function (key, opts) { var v = getP(sp, key); return '<div class="scseg">' + opts.map(function (o) { return '<button data-sseg="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(v) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
      var col = function (key, label) { return '<label class="sccol"><input type="color" data-scol="' + key + '" value="' + getP(sp, key) + '"><span>' + label + '</span></label>'; };
      var rng = function (key, label, min, max, step) { return '<div><div class="lbl">' + label + '</div><input type="range" data-srng="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + getP(sp, key) + '"></div>'; };
      var chk = function (key, label) { return '<label class="chk"><input type="checkbox" data-schk="' + key + '"' + (getP(sp, key) ? ' checked' : '') + '> ' + label + '</label>'; };
      var fopt = function (key) { return '<select data-ssel="' + key + '">' + Object.keys(F).map(function (k) { return '<option value="' + k + '"' + (getP(sp, key) === k ? ' selected' : '') + '>' + F[k].name + '</option>'; }).join('') + '</select>'; };
      return '<details class="lsec" open><summary>🎨 Colours</summary><div class="sccols">' + col('bg.c1', 'Background') + (sp.bg.type === 'gradient' ? col('bg.c2', 'Background 2') : '') + col('ink', 'Headline') + col('sub', 'Small text') + col('accent', 'Accent') + col('hl', 'Highlight') + col('hlInk', 'Text on highlight') + '</div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><span class="muted" style="font-size:12.5px;align-self:center">Quick swap:</span>' + Object.keys(PALS).map(function (k) { return '<button class="btn ghost sm" data-spal="' + k + '">' + PALS[k].n + '</button>'; }).join('') + '</div></details>' +
        '<details class="lsec"><summary>🖼️ Background</summary>' + seg('bg.type', [['solid', 'Plain'], ['gradient', 'Gradient'], ['image', 'Photo']]) +
          (sp.bg.type === 'gradient' ? rng('bg.angle', 'Gradient direction', 0, 360, 5) : '') +
          (sp.bg.type === 'image' ? '<div class="row" style="gap:6px;margin-top:8px"><label class="btn ghost sm" style="margin:0;cursor:pointer">📷 ' + (sp.bg.img ? 'Change photo' : 'Upload photo') + '<input type="file" accept="image/*" id="teBgUp" hidden></label></div><div class="lbl">Photo on</div>' + seg('bg.where', [['cover', 'Cover only'], ['all', 'Every slide']]) + rng('bg.dim', 'Darken the photo', 0, 0.85, 0.05) : '') + '</details>' +
        '<details class="lsec"><summary>🔤 Text</summary><div class="f2"><div><div class="lbl">Headline font</div>' + fopt('font.head') + '</div><div><div class="lbl">Small text font</div>' + fopt('font.body') + '</div></div>' +
          '<div class="f2">' + rng('font.size', 'Headline size', 0.6, 1.6, 0.05) + rng('font.bodySize', 'Small text size', 0.6, 1.6, 0.05) + '</div><div class="f2">' + rng('cover.size', 'Cover headline size', 0.7, 1.8, 0.05) + '<div></div></div>' + chk('font.caps', 'ALL CAPITALS headlines') +
          '<div class="lbl">Highlighted words (**stars**)</div>' + seg('hlStyle', [['color', 'Colour'], ['bar', 'Block'], ['brush', 'Brush'], ['underline', 'Underline'], ['none', 'None']]) + '</details>' +
        '<details class="lsec"><summary>📐 Layout</summary><div class="lbl">Line up</div>' + seg('align', [['left', '⬅ Left'], ['center', '↔ Centre']]) + '<div class="lbl">Where the text sits</div>' + seg('vpos', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']]) +
          '<div class="lbl">Cover text sits</div>' + seg('cover.vpos', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']]) + '<div class="lbl">Tip numbers</div>' + seg('numbers', [['badge', '① Circle'], ['pill', 'TIP 01'], ['big', 'Big faded'], ['none', 'None']]) +
          chk('card.on', 'Text inside a box') + (sp.card.on ? '<div class="sccols">' + col('card.color', 'Box colour') + '</div>' + rng('card.opacity', 'Box see-through', 0.1, 1, 0.05) : '') + '</details>' +
        '<details class="lsec"><summary>✨ Shapes &amp; frame</summary><div class="lbl">Background shapes</div>' + seg('shapes', [['none', 'None'], ['circles', 'Circles'], ['dots', 'Dots'], ['corner', 'Corner'], ['blob', 'Blobs'], ['lines', 'Lines']]) +
          chk('frame.on', 'Frame round the slide') + (sp.frame.on ? '<div class="sccols">' + col('frame.color', 'Frame colour') + '</div><div class="f2">' + rng('frame.width', 'Thickness', 2, 40, 1) + rng('frame.radius', 'Rounded corners', 0, 60, 2) + '</div>' + rng('frame.inset', 'Gap from the edge', 0, 80, 2) : '') +
          '<div class="row" style="gap:16px;flex-wrap:wrap;margin-top:6px">' + chk('pageNo', 'Slide numbers (2/7)') + '</div></details>' +
        '<details class="lsec"><summary>@ Handle</summary><input id="teHandle" value="' + X.esc(sp.handle.text) + '">' + seg('handle.pos', [['top-left', '↖'], ['top-right', '↗'], ['bottom-left', '↙'], ['bottom-center', '↓'], ['bottom-right', '↘'], ['none', 'Hide']]) + '</details>';
    }
    var PALS = { green: { n: '💚 Green', bg: ['#057A44', '#03532E'], ink: '#FFFFFF', sub: '#E6F4EC', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36' }, navy: { n: 'Navy', bg: ['#0F1E36', '#1F3560'], ink: '#FFFFFF', sub: '#C9D1DE', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36' },
      gold: { n: 'Gold', bg: ['#FFB81C', '#F08C00'], ink: '#0F1E36', sub: '#1F2937', accent: '#057A44', hl: '#FFFFFF', hlInk: '#0F1E36' }, white: { n: 'White', bg: ['#FFFFFF', '#F3F5F7'], ink: '#111111', sub: '#3F4A5C', accent: '#057A44', hl: '#FFD25E', hlInk: '#111111' },
      cream: { n: 'Cream', bg: ['#F7F1E6', '#EFE4D0'], ink: '#2B2118', sub: '#5C4F42', accent: '#C2652A', hl: '#C2652A', hlInk: '#FFFFFF' } };
    function getP(o, p) { return p.split('.').reduce(function (a, k) { return a && a[k]; }, o); }
    function setP(o, p, v) { var a = p.split('.'), t = o; for (var k = 0; k < a.length - 1; k++) t = t[a[k]] = t[a[k]] || {}; t[a[a.length - 1]] = v; }
    function swipePanel() {
      var o = swipeOf(car), g = function (k, opts) { return '<div class="scseg">' + opts.map(function (x) { return '<button data-swp="' + k + '" data-v="' + x[0] + '" aria-pressed="' + (o[k] === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
      return '<details class="lsec" id="teSwipe"' + (isSpec(car) ? '' : ' style="margin-top:10px"') + '><summary>👉 Swipe sign <span class="muted" style="font-weight:400">— ' + ({ cover: 'cover only', all: 'every slide but the last', off: 'off' })[o.mode] + '</span></summary>' +
        '<div class="lbl">Show it on</div>' + g('mode', [['cover', 'Cover only'], ['all', 'Every slide except the last'], ['off', 'Off']]) +
        (o.mode === 'off' ? '' : '<div class="lbl">Style</div>' + g('style', [['text', 'Swipe →'], ['pill', '(Swipe →) pill'], ['arrow', '➜ Arrow only']]) +
          '<div class="lbl">Where</div>' + g('pos', [['br', '↘ Bottom right'], ['bc', '↓ Bottom centre'], ['mr', '→ Middle right edge']])) +
        '<div class="muted" style="font-size:12.5px;margin-top:4px">Never shows on the last slide.</div></details>';
    }
    function lookName() { return isSpec(car) ? car.look.name : isPurple(car) ? 'Bold Purple Pro' : 'Auntie Tobi White'; }
    function renderLook() {
      var curId = isSpec(car) ? (car.look.id || '') : isPurple(car) ? 'purple' : 'white', box = $('#teLook'), opn = {}; Array.prototype.forEach.call(box.querySelectorAll('.lsec'), function (d) { var t = d.querySelector('summary'); if (t) opn[t.textContent.slice(0, 8)] = d.open; });
      box.innerHTML = '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b>🎨 Look</b><span class="muted" style="font-size:13px">— now: <b>' + X.esc(lookName()) + '</b></span></div>' +
        '<div class="chipbar" style="margin-top:8px">' + LOOKS.map(function (l) { return '<button class="chip" data-look="' + l.id + '" aria-pressed="' + (curId === l.id) + '"><i class="lsw" style="background:' + sw(l) + '"></i>' + l.name + '</button>'; }).join('') +
        '<button class="chip" id="teMy">⭐ My styles</button><label class="chip" style="cursor:pointer;margin:0">🎨 Match a style…<input type="file" id="teRef" accept="image/jpeg,image/png,image/webp" multiple hidden></label>' + (isSpec(car) ? '<button class="chip" id="teSaveLook">💾 Save this look</button>' : '') + '</div>' +
        '<div class="muted" id="teLookMsg" style="font-size:12.5px;margin-top:4px"></div>' + (isSpec(car) ? specPanel() : isPurple(car) ? purplePanel() : whitePanel()) + swipePanel() +
        '<div class="muted" style="font-size:12.5px;margin-top:8px">Put highlighted words in <b>**double stars**</b>. Press Enter in a heading to choose where a line breaks.</div>';
      Array.prototype.forEach.call(box.querySelectorAll('.lsec'), function (d) { var t = d.querySelector('summary'), k = t ? t.textContent.slice(0, 8) : ''; if (opn[k] !== undefined) d.open = opn[k]; });
      bindLook();
    }
    function lookChanged(full) { mark(); if (full) renderLook(); fontsReady().then(function () { paint(); paintThumbs(); }); paint(); paintThumbs(); }
    function bindLook() {
      var box = $('#teLook'), q = function (s) { return box.querySelector(s); }, qa = function (s) { return Array.prototype.slice.call(box.querySelectorAll(s)); };
      qa('[data-look]').forEach(function (b) { b.onclick = function () { var l = LOOKS.filter(function (x) { return x.id === b.dataset.look; })[0]; car.look = l.purple ? { kind: 'purple', id: 'purple', name: 'Bold Purple Pro', purple: Object.assign({}, PURPLE) } : l.spec ? { kind: 'spec', id: l.id, name: l.name, styleId: '', spec: JSON.parse(JSON.stringify(l.spec)) } : null; lookChanged(true); paintSlides(); setSel(Math.min(sel, car.slides.length - 1)); }; });
      q('#teMy').onclick = mySheet;
      qa('[data-swp]').forEach(function (b) { b.onclick = function () { var o = swipeOf(car), k = b.dataset.swp; car.swipeMode = o.mode; car.swipeStyle = o.style; car.swipePos = o.pos; car['swipe' + k.charAt(0).toUpperCase() + k.slice(1)] = b.dataset.v; if (k === 'mode') car.swipe = b.dataset.v !== 'off'; lookChanged(true); }; });
      q('#teRef').onchange = async function () {
        var fs = [].slice.call(this.files || []).slice(0, 3), imgs = [], m = q('#teLookMsg'); if (!fs.length) return;
        m.textContent = '🔍 Reading the style… (about 15 seconds)';
        try { for (var k = 0; k < fs.length; k++) imgs.push(await shrinkPic(fs[k], 1100)); var r = await X.api('sc-analyze', { images: imgs }); r.spec.bg.where = 'cover'; car.look = { kind: 'spec', id: '', name: r.name, styleId: '', spec: r.spec };
          m.textContent = '📋 Copying the photo…'; var cp = { n: 0, msg: '' }; try { cp = await copyPhotos(r, imgs); } catch (e) { cp = { n: 0, msg: '⚠️ Couldn’t copy the photo: ' + (e.message || 'try again') }; }
          var nCopied = cp.n; lookChanged(true); if (nCopied) { paintSlides(); setSel(0); paintThumbs(); } var m2 = $('#teLookMsg'); if (m2) m2.textContent = cp.msg; X.toast('🎨 Style read: ' + r.name + (nCopied ? ' — its photo is on ' + (nCopied > 1 ? nCopied + ' slides' : 'the cover') + ' (replace it before posting)' : ' — adjust anything below')); }
        catch (e) { m.textContent = ''; X.toast(e.message); }
      };
      if (q('#teSaveLook')) q('#teSaveLook').onclick = function () {
        var nm = prompt('Name this look', car.look.name || 'My look'); if (!nm) return;
        X.api('sc-style-save', { id: car.look.styleId || '', name: nm, spec: car.look.spec }).then(function (r) { car.look.styleId = r.style.id; car.look.name = r.style.name; car.look.id = ''; STY = r.styles; mark(); renderLook(); X.toast('💾 Saved to ⭐ My styles'); }).catch(function (e) { X.toast(e.message); });
      };
      if (!isSpec(car)) {
        q('#teN').onchange = function () { car.numbers = this.checked; lookChanged(); };
        q('#teH').onchange = function () { car.handle = this.checked; lookChanged(); };
        if (q('#teB')) q('#teB').onchange = function () { car.brush = this.checked; lookChanged(); };
        if (isPurple(car)) bindPurple(q, qa);
        qa('#teSt [data-v]').forEach(function (b) { b.onclick = function () { car.style = b.dataset.v; qa('#teSt [data-v]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); lookChanged(); }; });
        var sizeUi = function () { q('#teHs').value = Math.round((car.hs || 1) * 100); q('#teBs').value = Math.round((car.bs || 1) * 100); q('#teHsV').textContent = pct(car.hs); q('#teBsV').textContent = pct(car.bs); };
        q('#teHs').oninput = function () { car.hs = Number(this.value) / 100; sizeUi(); lookChanged(); };
        q('#teBs').oninput = function () { car.bs = Number(this.value) / 100; sizeUi(); lookChanged(); };
        sizeUi(); return;
      }
      var sp = car.look.spec;
      qa('[data-scol]').forEach(function (i) { i.oninput = function () { setP(sp, i.dataset.scol, i.value.toUpperCase()); car.look.id = ''; lookChanged(); }; });
      qa('[data-srng]').forEach(function (i) { i.oninput = function () { setP(sp, i.dataset.srng, Number(i.value)); car.look.id = ''; lookChanged(); }; });
      qa('[data-ssel]').forEach(function (i) { i.onchange = function () { setP(sp, i.dataset.ssel, i.value); car.look.id = ''; lookChanged(); }; });
      qa('[data-schk]').forEach(function (i) { i.onchange = function () { setP(sp, i.dataset.schk, i.checked); car.look.id = ''; lookChanged(true); }; });
      qa('[data-sseg]').forEach(function (b) { b.onclick = function () { setP(sp, b.dataset.sseg, b.dataset.v); car.look.id = ''; lookChanged(true); }; });
      qa('[data-spal]').forEach(function (b) { b.onclick = function () { var p = PALS[b.dataset.spal]; sp.bg.c1 = p.bg[0]; sp.bg.c2 = p.bg[1]; ['ink', 'sub', 'accent', 'hl', 'hlInk'].forEach(function (k) { sp[k] = p[k]; }); if (sp.frame.on) sp.frame.color = p.accent; car.look.id = ''; lookChanged(true); }; });
      if (q('#teHandle')) q('#teHandle').oninput = function () { sp.handle.text = this.value; lookChanged(); };
      if (q('#teBgUp')) q('#teBgUp').onchange = function () { var f = this.files && this.files[0]; if (!f) return; q('#teLookMsg').textContent = 'Adding the photo…'; shrinkPic(f, 1600).then(function (d) { return X.api('app-img', { image: d }); }).then(function (r) { sp.bg.img = r.imgId; q('#teLookMsg').textContent = ''; lookChanged(true); }).catch(function (e) { q('#teLookMsg').textContent = ''; X.toast(e.message); }); };
    }
    var STY = null;
    function mySheet() {
      var s = X.sheet('<h2>⭐ My styles</h2><p class="muted" style="margin:4px 0 10px">Looks you saved (including from 🎨 Style Match). Your words stay — only the look changes.</p><div id="msL" class="muted">Loading…</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="msX">Close</button></div>');
      s.querySelector('#msX').onclick = function () { s.remove(); };
      var paintL = function () {
        var b = s.querySelector('#msL'); if (!STY.length) { b.textContent = 'No saved looks yet — pick a look, change it, then 💾 Save this look.'; return; } b.classList.remove('muted');
        b.innerHTML = STY.map(function (x) { return '<div class="row" style="gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)"><i class="lsw" style="width:40px;height:40px;background:' + sw(x) + '"></i><b style="flex:1">' + X.esc(x.name) + '</b><button class="btn primary sm" data-use="' + x.id + '">Use</button><button class="btn ghost sm" data-del="' + x.id + '">🗑</button></div>'; }).join('');
        Array.prototype.forEach.call(b.querySelectorAll('[data-use]'), function (u) { u.onclick = function () { var x = STY.filter(function (y) { return y.id === u.dataset.use; })[0]; car.look = { kind: 'spec', id: '', name: x.name, styleId: x.id, spec: JSON.parse(JSON.stringify(x.spec)) }; s.remove(); lookChanged(true); }; });
        Array.prototype.forEach.call(b.querySelectorAll('[data-del]'), function (u) { u.onclick = function () { if (!confirm('Delete this saved look?')) return; X.api('sc-style-del', { id: u.dataset.del }).then(function (r) { STY = r.styles; paintL(); }).catch(function (e) { X.toast(e.message); }); }; });
      };
      (STY ? Promise.resolve() : X.api('sc-styles').then(function (r) { STY = r.styles || []; })).then(paintL).catch(function (e) { s.querySelector('#msL').textContent = e.message; });
    }

    // ── ✨ decorations on a slide ──
    var openDeco = {};
    function decoHtml(sl, i) {
      var ds = sl.deco || [], arrows = /^arrow|^swipe/;
      return '<details class="sdeco" data-i="' + i + '"' + (openDeco[i] ? ' open' : '') + ' style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:14px">✨ Decorations <span class="muted" style="font-weight:400">— ' + (ds.length ? ds.length + ' on this slide' : 'arrows, stickers, emoji…') + '</span></summary>' +
        '<div class="row" style="gap:6px;margin-top:8px"><select data-dadd style="flex:1">' + Object.keys(DECO).map(function (k) { return '<option value="' + k + '">' + DECO[k] + '</option>'; }).join('') + '</select><button class="btn primary sm" data-dgo>＋ Add</button></div>' +
        ds.map(function (d, k) {
          var txt = d.t === 'badge' || d.t === 'bubble' || d.t === 'emoji' || d.t === 'swipe';
          return '<div class="dk"><div class="row" style="gap:6px;align-items:center"><b style="flex:1;font-size:13px">' + DECO[d.t] + '</b><input type="color" data-dc="' + k + '" value="' + (d.c || '#057A44') + '" title="Colour">' + (arrows.test(d.t) ? '<button class="btn ghost sm" data-dflip="' + k + '" title="Flip">⇋</button>' : '') + '<button class="btn ghost sm" data-dall="' + k + '" title="Put on every slide">📋 All slides</button><button class="btn ghost sm" data-ddel="' + k + '" title="Remove" style="color:#B42318">✕</button></div>' +
            (txt ? '<input data-dt="' + k + '" value="' + X.esc(d.txt || '') + '" placeholder="' + (d.t === 'emoji' ? 'Paste an emoji, e.g. 🔥' : 'Text, e.g. TIP or NEW') + '" maxlength="24" style="margin-top:4px">' : '') +
            '<div class="f2" style="margin-top:4px"><div><div class="lbl" style="margin:0">Size</div><input type="range" data-ds="' + k + '" min="20" max="400" value="' + Math.round((d.s || 1) * 100) + '"></div><div><div class="lbl" style="margin:0">Turn</div><input type="range" data-dr="' + k + '" min="-180" max="180" value="' + Math.round(d.r || 0) + '"></div></div></div>';
        }).join('') + (ds.length ? '<div class="muted" style="font-size:12.5px;margin-top:6px">✋ Drag them on the big preview to move them.</div>' : '') + '</details>';
    }
    function decoColour() { return isSpec(car) ? car.look.spec.accent : isPurple(car) ? pur(car).acc : '#057A44'; }
    function bindDeco(el, i) {
      var d = el.querySelector('.sdeco'); if (!d) return; d.addEventListener('toggle', function () { openDeco[i] = d.open; });
      var sl = car.slides[i], re = function () { mark(); paintSlides(); setSel(i); paintThumbs(); }, live = function () { mark(); paint(); paintThumbs(); };
      el.querySelector('[data-dgo]').onclick = function () {
        var t = el.querySelector('[data-dadd]').value; sl.deco = sl.deco || []; if (sl.deco.length >= 12) return X.toast('Up to 12 decorations on a slide');
        var n = sl.deco.length, SPOT = { 'arrow-curly': [0.24, 0.8], 'arrow-straight': [0.5, 0.82], 'arrow-loop': [0.3, 0.8], 'arrow-down': [0.8, 0.2], badge: [0.22, 0.12], bubble: [0.7, 0.13], emoji: [0.83, 0.16], sparkle: [0.84, 0.8], star: [0.85, 0.13], heart: [0.15, 0.85], tick: [0.85, 0.85], cross: [0.85, 0.85], quote: [0.18, 0.14], tape: [0.5, 0.06], dots: [0.85, 0.12], blob: [0.85, 0.85], ring: [0.5, 0.5], brush: [0.5, 0.75], scribble: [0.5, 0.75] }, sp0 = SPOT[t] || [0.5, 0.5], dflt = { t: t, x: sp0[0] + (n > 3 ? ((n % 3) - 1) * 0.05 : 0), y: sp0[1], s: /^arrow/.test(t) ? 0.9 : t === 'emoji' ? 0.8 : t === 'blob' ? 2.2 : t === 'brush' ? 1.6 : 1, r: 0, c: t === 'tape' ? '#E8D9A8' : t === 'brush' ? '#E0A21B' : decoColour() };
        if (t === 'badge') dflt.txt = 'TIP'; if (t === 'bubble') dflt.txt = 'Did you know?'; if (t === 'emoji') dflt.txt = '🔥'; if (t === 'swipe') { dflt.txt = 'Swipe'; dflt.x = 0.72; dflt.y = 0.88; }
        sl.deco.push(dflt); openDeco[i] = true; re(); X.toast('✨ Added — drag it on the preview to move it');
      };
      Array.prototype.forEach.call(el.querySelectorAll('[data-dc]'), function (f) { f.oninput = function () { sl.deco[+f.dataset.dc].c = f.value; live(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-ds]'), function (f) { f.oninput = function () { sl.deco[+f.dataset.ds].s = Number(f.value) / 100; live(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-dr]'), function (f) { f.oninput = function () { sl.deco[+f.dataset.dr].r = Number(f.value); live(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-dt]'), function (f) { f.oninput = function () { sl.deco[+f.dataset.dt].txt = f.value; live(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-dflip]'), function (b) { b.onclick = function () { var o = sl.deco[+b.dataset.dflip]; o.flip = !o.flip; live(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-ddel]'), function (b) { b.onclick = function () { sl.deco.splice(+b.dataset.ddel, 1); re(); }; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-dall]'), function (b) { b.onclick = function () { var o = sl.deco[+b.dataset.dall], n = 0; car.slides.forEach(function (s2, k) { if (k === i) return; s2.deco = (s2.deco || []).filter(function (x) { return !(x.t === o.t && Math.abs(x.x - o.x) < 0.02 && Math.abs(x.y - o.y) < 0.02); }); if (s2.deco.length < 12) { s2.deco.push(JSON.parse(JSON.stringify(o))); n++; } }); re(); X.toast('📋 Put on ' + n + ' other slide' + (n === 1 ? '' : 's')); }; });
    }
    // ✋ drag on the big preview: decorations first, then a cut-out person (corner dot resizes), then a photo (pans inside its frame)
    var hov = null;
    function personBox(k, dx) { var p = cutPic(car.slides[k]), im = p && picImg(p.img); if (!im) return null; var g = cutGeom(p, im); return { k: k, p: p, x: g.x + dx, y: g.y, w: g.w, h: g.h, dx: dx }; }
    function personsHere() { var out = [], own = personBox(sel, 0), pv = cutPic(car.slides[sel - 1]), nx = cutPic(car.slides[sel + 1]);
      if (nx && cutEdge(nx).l) out.push(personBox(sel + 1, W)); if (pv && cutEdge(pv).r) out.push(personBox(sel - 1, -W)); if (own) out.push(own); return out.filter(Boolean); }
    function overlay() {   // preview only: outline + resize dot on the person under the pointer
      if (!hov) return; var b = hov; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = 'rgba(17,17,17,.55)'; ctx.setLineDash([14, 10]); ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(Math.min(W - 26, b.x + b.w), Math.max(26, b.y), 22, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    var paint0 = paint; paint = function () { paint0(); overlay(); };
    (function () {
      var drag = null, at = function (e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
      var hit = function (p) { var ds = car.slides[sel].deco || []; for (var k = ds.length - 1; k >= 0; k--) { var d = ds[k], rad = 0.11 * (d.s || 1) + 0.03; if (Math.abs(p.x - d.x) < rad && Math.abs(p.y - d.y) * (H / W) < rad) return k; } return -1; };
      var hitPerson = function (p) { var X0 = p.x * W, Y0 = p.y * H, ps = personsHere();
        for (var k = ps.length - 1; k >= 0; k--) { var b = ps[k], hx = Math.min(W - 26, b.x + b.w), hy = Math.max(26, b.y);
          if (Math.hypot(X0 - hx, Y0 - hy) < 40) return { b: b, resize: true };
          if (X0 > b.x + b.w * 0.12 && X0 < b.x + b.w * 0.88 && Y0 > b.y && Y0 < b.y + b.h) return { b: b, resize: false }; }
        return null; };
      var hitPhoto = function (p) { var pc = boxPic(car.slides[sel]); if (!pc || !picImg(pc.img)) return null; if (pc.mode === 'bg') return pc; var bx = picBox(pc), X0 = p.x * W, Y0 = p.y * H; return X0 > bx.x && X0 < bx.x + bx.w && Y0 > bx.y && Y0 < bx.y + bx.h ? pc : null; };
      var sync = function (k) { var el = ov.querySelector('.cslide[data-i="' + k + '"]'), pc = car.slides[k].pic; if (!el || !pc) return; ['size', 'fx', 'fy'].forEach(function (f) { var inp = el.querySelector('[data-p="' + f + '"]'), pv = el.querySelector('[data-ppv="' + f + '"]'); if (inp && pc[f] != null) { inp.value = Math.round(pc[f] * 100); if (pv) pv.textContent = inp.value + (f === 'size' ? '%' : ''); } }); };
      cv.addEventListener('pointerdown', function (e) {
        var p = at(e), k = hit(p), hp, ph;
        if (k >= 0) { var d = car.slides[sel].deco[k]; drag = { t: 'deco', k: k, dx: p.x - d.x, dy: p.y - d.y }; }
        else if ((hp = hitPerson(p))) { var b = hp.b, pc = b.p, g = cutGeom(pc, picImg(pc.img)); if (pc.px == null || pc.py == null) { pc.px = (g.x + g.w / 2) / W; pc.py = (g.y + g.h) / H; pc.spill = false; }
          drag = { t: hp.resize ? 'size' : 'person', k: b.k, dx: b.dx, ox: p.x * W - (pc.px * W + b.dx), oy: p.y * H - pc.py * H, s0: pc.size, y0: p.y * H, feet: pc.py * H }; }
        else if ((ph = hitPhoto(p))) { var im = picImg(ph.img), bb = ph.mode === 'bg' ? { w: W, h: H } : picBox(ph), sc = Math.max(bb.w / im.naturalWidth, bb.h / im.naturalHeight) * clamp(Number(ph.z) || 1, 1, 2.5);
          drag = { t: 'photo', ph: ph, x0: p.x * W, y0: p.y * H, fx: ph.fx == null ? 0.5 : ph.fx, fy: ph.fy == null ? 0.5 : ph.fy, ex: Math.max(1, im.naturalWidth * sc - bb.w), ey: Math.max(1, im.naturalHeight * sc - bb.h) }; }
        if (!drag) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
      });
      cv.addEventListener('pointermove', function (e) {
        var p = at(e);
        if (!drag) { var hp = hit(p) >= 0 ? null : hitPerson(p), was = hov; hov = hp ? hp.b : null; cv.style.cursor = hit(p) >= 0 ? 'move' : hp ? (hp.resize ? 'nwse-resize' : 'grab') : hitPhoto(p) ? 'grab' : ''; if (was !== hov && (was || hov)) paint(); return; }
        if (drag.t === 'deco') { var d = car.slides[sel].deco[drag.k]; d.x = clamp(p.x - drag.dx, 0, 1); d.y = clamp(p.y - drag.dy, 0, 1); }
        else if (drag.t === 'person') { var pc = car.slides[drag.k].pic; pc.px = clamp((p.x * W - drag.ox - drag.dx) / W, -0.45, 1.45); pc.py = clamp((p.y * H - drag.oy) / H, 0.3, 1.5); hov = personBox(sel, 0) && drag.k === sel ? personBox(sel, 0) : personBox(drag.k, drag.dx); cv.style.cursor = 'grabbing'; }
        else if (drag.t === 'size') { var pc2 = car.slides[drag.k].pic; pc2.size = clamp(drag.s0 * (drag.feet - p.y * H) / Math.max(40, drag.feet - drag.y0), 0.3, 1.3); hov = personBox(drag.k, drag.dx); }
        else if (drag.t === 'photo') { drag.ph.fx = clamp(drag.fx - (p.x * W - drag.x0) / drag.ex, 0, 1); drag.ph.fy = clamp(drag.fy - (p.y * H - drag.y0) / drag.ey, 0, 1); cv.style.cursor = 'grabbing'; }
        paint();
      });
      var end = function () { if (!drag) return; var k = drag.k == null ? sel : drag.k; drag = null; mark(); sync(k); paintThumbs(); paint(); };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      cv.addEventListener('pointerleave', function () { if (!drag && hov) { hov = null; paint(); } });
      cv.style.touchAction = 'none';
    })();
    var openPic = {};
    function picHtml(sl, i) {
      var p = sl.pic && sl.pic.img ? sl.pic : null, sum = p ? (p.mode === 'bg' ? 'full background' : 'photo box at the ' + p.mode) + ' · ' + Math.round((p.fade || 0) * 100) + '% see-through' : 'none';
      var sld = function (k, lbl, min, max, val, unit) { return '<div><label>' + lbl + ' <span class="muted" data-ppv="' + k + '">' + val + unit + '</span></label><input type="range" data-p="' + k + '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"></div>'; };
      if (p && p.mode === 'cut') return cutHtml(sl, i, sld);
      return '<details class="spic" data-i="' + i + '"' + (openPic[i] ? ' open' : '') + ' style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:14px">🖼️ Picture <span class="muted" style="font-weight:400">— ' + sum + '</span></summary>' +
        (p ? '<div class="row" style="gap:10px;margin-top:8px;align-items:flex-start"><img src="' + picSrc(p.img) + '" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:8px;flex:none"><div style="flex:1;min-width:0">' +
          (p.copied ? '<div style="font-size:12.5px;background:#FFF6DB;border:1px solid #F1D48A;border-radius:8px;padding:5px 8px;margin-bottom:6px">📋 Copied from the style — replace before posting</div>' : '') + '<label>How it sits</label><select data-p="mode"><option value="bg"' + (p.mode === 'bg' ? ' selected' : '') + '>Full background (behind the text)</option><option value="top"' + (p.mode === 'top' ? ' selected' : '') + '>Photo box at the top</option><option value="bottom"' + (p.mode === 'bottom' ? ' selected' : '') + '>Photo box at the bottom</option></select></div></div>' +
          '<div class="f2" style="margin-top:6px">' + sld('fade', 'Transparency', 0, 90, Math.round((p.fade || 0) * 100), '%') + (p.mode === 'bg' ? '<div></div>' : sld('size', 'Photo box size', 20, 60, Math.round((p.size || 0.3) * 100), '%')) + '</div>' +
          '<div class="f2">' + sld('z', 'Zoom', 100, 250, Math.round((p.z || 1) * 100), '%') + sld('fx', 'Left / right', 0, 100, Math.round((p.fx == null ? 0.5 : p.fx) * 100), '') + '</div>' +
          '<div class="f2">' + sld('fy', 'Up / down', 0, 100, Math.round((p.fy == null ? 0.5 : p.fy) * 100), '') + '<div></div></div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn ghost sm" data-pall="set">📋 These settings on all slides</button><button class="btn ghost sm" data-pall="pic">📋 This picture on all slides</button><button class="btn ghost sm" data-pdel style="color:#B42318">✕ Remove picture</button></div>' : '<div class="muted" style="font-size:12.5px;margin:6px 0">Add a photo behind the text (faded) or in a box at the top or bottom.</div>') +
        '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><label class="btn ghost sm" style="margin:0;cursor:pointer">📷 ' + (p ? 'Change photo' : 'Upload photo') + '<input type="file" accept="image/*" data-pup hidden></label>' +
        '<button class="btn ghost sm" data-pmk>✨ Make picture</button>' + (window.HQChars ? '<button class="btn ghost sm" data-pch>👥 Use a character</button>' : '') +
        (p ? '<button class="btn ghost sm" data-pcut>✂️ Cut out the person</button>' : '<label class="btn ghost sm" style="margin:0;cursor:pointer">🧍 Upload a person<input type="file" accept="image/*" data-pcup hidden></label>') + '</div>' +
        '<div class="row hidden" data-pmkrow style="gap:6px;margin-top:6px"><input data-pwant placeholder="Describe the picture, e.g. a Nigerian family unpacking boxes in a bright London flat" style="flex:1"><button class="btn primary sm" data-pgo>✨ Make it</button></div><div class="muted" data-pmsg style="font-size:12.5px;margin-top:4px"></div></details>';
    }
    // 📋 Match a style: crop the photo out of each screenshot and put it on the slides, ready to replace
    function cropRef(du, box, max) { return new Promise(function (ok, bad) { var im = new Image(); im.onload = function () {
      var W0 = im.width, H0 = im.height, b = (box || [0, 0, 1, 1]).slice(), mx = Math.max(b[0] + b[2], b[1] + b[3]);
      // the AI may give 0-1 fractions, percentages or pixels
      if (mx > 1.5 && mx <= 100.5 && Math.max(W0, H0) > 150) b = b.map(function (v) { return v / 100; });
      else if (mx > 1.5) b = [b[0] / W0, b[1] / H0, b[2] / W0, b[3] / H0];
      // some models send [x1, y1, x2, y2]
      if (b[0] + b[2] > 1.05 && b[2] > b[0]) b[2] = b[2] - b[0]; if (b[1] + b[3] > 1.05 && b[3] > b[1]) b[3] = b[3] - b[1];
      b = b.map(function (v) { return clamp(v, 0, 1); }); b[2] = Math.min(b[2], 1 - b[0]); b[3] = Math.min(b[3], 1 - b[1]);
      if (b[2] < 0.15 || b[3] < 0.08) b = [0, 0, 1, 1];
      var sx = b[0] * W0, sy = b[1] * H0, sw2 = Math.max(8, b[2] * W0), sh = Math.max(8, b[3] * H0), k = Math.min(1, max / Math.max(sw2, sh)), c = document.createElement('canvas');
      c.width = Math.round(sw2 * k); c.height = Math.round(sh * k); c.getContext('2d').drawImage(im, sx, sy, sw2, sh, 0, 0, c.width, c.height); ok({ url: c.toDataURL('image/jpeg', 0.88), ar: im.height / im.width, h: b[3] }); }; im.onerror = function () { bad(new Error('Couldn’t open the screenshot')); }; im.src = du; }); }
    async function copyPhotos(r, imgs) {
      var ph = (r.photos || []).filter(function (p) { return imgs[p.slide]; });
      if (!ph.length && r.bgPhoto) ph = [{ slide: 0, where: 'bg', box: null, fade: 0.35 }];   // a photo background but no box → use the whole screenshot
      if (!ph.length) return { n: 0, msg: 'No photo found in the screenshot, so only the colours, fonts and layout were copied.' };
      var each = imgs.length > 1 && ph.length === imgs.length, plan = each ? ph.slice(0, car.slides.length) : [ph[0]], n = 0, kept = 0;
      if (ph.some(function (p) { return p.where === 'bg'; }) && car.look.spec.bg.type === 'image' && !car.look.spec.bg.img) car.look.spec.bg.type = 'solid';
      for (var k = 0; k < plan.length; k++) {
        var p = plan[k], sl = car.slides[k]; if (sl.pic && sl.pic.img && !sl.pic.copied) { kept++; continue; }   // never replace a picture the user chose
        var c = await cropRef(imgs[p.slide], p.box, 1400), up = await X.api('img', { dataUrl: c.url });
        sl.pic = { img: up.id, mode: p.where, fade: p.fade || 0, size: p.where === 'bg' ? 0.3 : clamp(Math.round(c.h * c.ar / 1.25 * 100) / 100, 0.2, 0.6), z: 1, fx: 0.5, fy: 0.5, copied: true };
        openPic[k] = true; n++;
      }
      var where = n > 1 ? n + ' slides' : 'the cover';
      return { n: n, msg: n ? '📋 The style’s photo is now on ' + where + ' — open 🖼️ Picture on the slide to replace it before posting.' + (kept ? ' (' + kept + ' slide' + (kept > 1 ? 's' : '') + ' kept your own picture.)' : '')
        : '📋 Found a photo, but ' + (plan.length > 1 ? 'those slides already have' : 'your cover already has') + ' your own picture, so I kept yours. Remove it (🖼️ Picture → ✕ Remove) and match again to use the style’s photo.' };
    }
    // ── 🧍 cut-out person (background removed by fal.ai) ──
    function cutHtml(sl, i, sld) {
      var p = sl.pic, sd = p.side || 'right', seg = function (v, l) { return '<button data-pcside="' + v + '" aria-pressed="' + (sd === v) + '">' + l + '</button>'; };
      return '<details class="spic" data-i="' + i + '"' + (openPic[i] ? ' open' : '') + ' style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:14px">🖼️ Picture <span class="muted" style="font-weight:400">— 🧍 cut-out person on the ' + (sd === 'center' ? 'centre' : sd) + (p.spill ? ' · spills over' : '') + '</span></summary>' +
        '<div class="row" style="gap:10px;margin-top:8px;align-items:flex-start"><img src="' + picSrc(p.img) + '" alt="" style="width:64px;height:80px;object-fit:contain;border-radius:8px;flex:none;background:repeating-conic-gradient(#EEE 0 25%,#FFF 0 50%) 0 0/14px 14px"><div style="flex:1;min-width:0">' +
          '<label>Stands on the</label><div class="scseg">' + seg('left', '⬅ Left') + seg('center', 'Centre') + seg('right', 'Right ➡') + '</div>' +
          '<label class="chk" style="margin-top:6px"><input type="checkbox" data-pcspill' + (p.spill ? ' checked' : '') + '> Spill into the ' + (sd === 'left' ? 'previous' : 'next') + ' slide (carries on when people swipe)</label>' +
          '<label class="chk"><input type="checkbox" data-pcflip' + (p.flip ? ' checked' : '') + '> ↔ Flip (face the other way)</label>' +
          '<div class="muted" style="font-size:12.5px;margin-top:4px">✋ Or drag the person on the big preview — the corner dot resizes. Drag them over the edge to carry on into the next slide.</div></div></div>' +
        '<div class="f2" style="margin-top:6px">' + sld('size', 'Size', 30, 130, Math.round((p.size || 0.85) * 100), '%') + sld('fade', 'Transparency', 0, 90, Math.round((p.fade || 0) * 100), '%') + '</div>' +
        '<div class="f2">' + sld('fx', 'Left / right', 0, 100, Math.round((p.fx == null ? 0.5 : p.fx) * 100), '') + sld('fy', 'Up / down', 0, 100, Math.round((p.fy == null ? 0.5 : p.fy) * 100), '') + '</div>' +
        '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><label class="btn ghost sm" style="margin:0;cursor:pointer">🧍 Change person<input type="file" accept="image/*" data-pcup hidden></label>' +
          '<button class="btn ghost sm" data-pmk>✨ Make picture</button>' + (window.HQChars ? '<button class="btn ghost sm" data-pch>👥 Use a character</button>' : '') +
          (p.orig ? '<button class="btn ghost sm" data-porig>↩ Back to the full photo</button>' : '') + '<button class="btn ghost sm" data-pdel style="color:#B42318">✕ Remove picture</button></div>' +
        '<div class="row hidden" data-pmkrow style="gap:6px;margin-top:6px"><input data-pwant placeholder="Describe the person, e.g. a smiling Nigerian man in a purple suit, full body, plain background" style="flex:1"><button class="btn primary sm" data-pgo>✨ Make it</button></div><div class="muted" data-pmsg style="font-size:12.5px;margin-top:4px"></div></details>';
    }
    function alphaBox(id) { return new Promise(function (ok) { var im = new Image(); im.onload = function () {
      var k = Math.min(1, 400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height); var d = g.getImageData(0, 0, c.width, c.height).data, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      ok(x1 < 0 ? [0, 0, 1, 1] : [x0 / c.width, y0 / c.height, (x1 - x0 + 1) / c.width, (y1 - y0 + 1) / c.height]); }; im.onerror = function () { ok([0, 0, 1, 1]); }; im.src = picSrc(id); }); }
    function idToData(id) { return fetch(picSrc(id)).then(function (r) { if (!r.ok) throw new Error('Couldn’t open that picture.'); return r.blob(); }).then(function (b) { return shrinkPic(b, 1400); }); }
    async function cutFrom(i, dataUrl, orig, msg) {
      msg('✂️ Removing the background… (about 10–30 seconds)');
      var r = await X.api('tc-cut', { dataUrl: dataUrl }), out = '';
      for (var t = 0; t < 45 && !out; t++) { await new Promise(function (ok) { setTimeout(ok, t ? 2500 : 1500); }); var c = await X.api('tc-cut-check', { job: r.job }); if (c.img) out = c.img; }
      if (!out) throw new Error('Removing the background took too long — please try again.');
      var bb = await alphaBox(out), sl = car.slides[i], old = cutPic(sl);
      sl.pic = Object.assign({ mode: 'cut', side: i % 2 ? 'left' : 'right', size: 0.85, fade: 0, fx: 0.5, fy: 0.5, flip: false, spill: false }, old ? { side: old.side, size: old.size, fx: old.fx, fy: old.fy, flip: old.flip, spill: old.spill, fade: old.fade } : {}, { img: out, bb: bb });
      if (orig) sl.pic.orig = orig; else if (old && old.orig) sl.pic.orig = old.orig;
      openPic[i] = true; mark(); paintSlides(); setSel(i); paintThumbs(); X.toast('🧍 Background removed');
    }
    function bindCut(el, i, msg) {
      var fail = function (e) { msg(''); X.toast((e && e.message) || 'Couldn’t remove the background.'); };
      var cu = el.querySelector('[data-pcup]'); if (cu) cu.onchange = function () { var f = this.files && this.files[0]; if (!f) return; msg('Getting the photo ready…'); shrinkPic(f, 1400).then(function (du) { return cutFrom(i, du, '', msg); }).catch(fail); };
      var cb = el.querySelector('[data-pcut]'); if (cb) cb.onclick = function () { var id = car.slides[i].pic.img; cb.disabled = true; idToData(id).then(function (du) { return cutFrom(i, du, id, msg); }).catch(function (e) { cb.disabled = false; fail(e); }); };
      var redraw = function () { mark(); paintSlides(); setSel(i); paintThumbs(); };
      var free = function () { var p = car.slides[i].pic; delete p.px; delete p.py; };
      Array.prototype.forEach.call(el.querySelectorAll('[data-pcside]'), function (b) { b.onclick = function () { free(); car.slides[i].pic.side = b.dataset.pcside; redraw(); }; });
      var sp = el.querySelector('[data-pcspill]'); if (sp) sp.onchange = function () { free(); car.slides[i].pic.spill = this.checked; redraw(); };
      Array.prototype.forEach.call(el.querySelectorAll('[data-p="fx"],[data-p="fy"]'), function (f) { if (cutPic(car.slides[i])) f.addEventListener('input', free); });
      var fl = el.querySelector('[data-pcflip]'); if (fl) fl.onchange = function () { car.slides[i].pic.flip = this.checked; redraw(); };
      var og = el.querySelector('[data-porig]'); if (og) og.onclick = function () { var o = car.slides[i].pic.orig; car.slides[i].pic = { img: o, mode: 'bg', fade: 0.7, size: 0.3, z: 1, fx: 0.5, fy: 0.5 }; redraw(); };
    }
    // a new picture: in cut-out mode it gets its background removed too
    function usePic(i, id, msg) { if (cutPic(car.slides[i])) return idToData(id).then(function (du) { return cutFrom(i, du, id, msg); }).catch(function (e) { msg(''); X.toast(e.message || 'Couldn’t remove the background.'); }); setPic(i, id); }
    // 💜 Bold Purple Pro look settings
    var NPOS = [['auto', 'With the words'], ['tl', '↖ Top left'], ['tc', '⬆ Top middle'], ['tr', '↗ Top right'], ['bl', '↙ Bottom left'], ['bc', '⬇ Bottom middle'], ['br', '↘ Bottom right']];
    function purplePanel() {
      var P = pur(car), sg = function (k, opts) { var cur = k === 'num' ? ({ left: 'bl', center: 'bc', right: 'br' }[P.num] || P.num) : P[k]; return '<div class="scseg">' + opts.map(function (o) { return '<button data-ppseg="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
      var col = function (k, l) { return '<label class="sccol"><input type="color" data-ppcol="' + k + '" value="' + P[k] + '"><span>' + l + '</span></label>'; };
      return '<div class="row" style="gap:16px;flex-wrap:wrap;margin-top:10px"><label class="chk"><input type="checkbox" id="teN"' + (car.numbers !== false ? ' checked' : '') + '> Number circles (01, 02…)</label>' +
        '<label class="chk"><input type="checkbox" id="teH"' + (car.handle !== false ? ' checked' : '') + '> Show the handle</label>' +
        '<label class="chk"><input type="checkbox" data-ppchk="brandOn"' + (P.brandOn ? ' checked' : '') + '> Name on the cover</label>' +
        '<label class="chk"><input type="checkbox" data-ppchk="pattern"' + (P.pattern ? ' checked' : '') + '> Line pattern</label><label class="chk"><input type="checkbox" data-ppchk="icons"' + (P.icons ? ' checked' : '') + '> Social row on the last slide</label></div>' +
        '<details class="lsec" open style="margin-top:8px"><summary>🎨 Colours</summary>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0"><span class="muted" style="font-size:12.5px;align-self:center">Quick swap:</span>' + Object.keys(PPAL).map(function (k) { return '<button class="btn ghost sm" data-pppal="' + k + '"><i class="lsw" style="background:' + PPAL[k].acc + '"></i>' + PPAL[k].n + '</button>'; }).join('') + '</div>' +
          '<div class="sccols">' + col('bg', 'Background') + col('line', 'Pattern lines') + col('ink', 'Headline') + col('hl', 'Highlighted words') + col('sub', 'Small text') + col('acc', 'Accent (handle, name, icons, last-slide heading)') +
          col('numBg', 'Number circle') + col('numInk', 'Number') + col('btnBg', 'Button') + col('btnInk', 'Button text') + col('wave', 'Waves (last slide)') + '</div></details>' +
        '<details class="lsec" open><summary>📐 Where the words sit</summary><div class="lbl">Up / down</div>' + sg('vpos', [['top', '⬆ Top'], ['middle', '↕ Middle'], ['bottom', '⬇ Bottom']]) +
          '<div class="lbl">Side to side</div>' + sg('hpos', [['auto', 'Auto (away from the person)'], ['left', '⬅ Left'], ['center', '↔ Centre'], ['right', 'Right ➡']]) +
          '<div class="lbl">Number circle</div>' + sg('num', NPOS) +
          '<div class="muted" style="font-size:12.5px;margin-top:4px">One slide different? Open ⚙️ Slide options on that slide.</div></details>' +
        '<div class="f2" style="margin-top:6px"><div><div class="lbl">Name on the cover</div><input data-pptxt="brand" value="' + X.esc(P.brand) + '"></div><div><div class="lbl">Handle</div><input data-pptxt="handle" value="' + X.esc(P.handle) + '"></div></div>' +
        '<div class="f2" style="margin-top:6px"><div><div class="lbl">Button on the last slide</div><input data-pptxt="btn" value="' + X.esc(P.btn) + '"></div><div></div></div>' +
        '<div class="f2" style="margin-top:6px"><div><div class="lbl">Heading size <span id="teHsV"></span></div><input type="range" id="teHs" min="60" max="140" step="5"></div>' +
        '<div><div class="lbl">Body text size <span id="teBsV"></span></div><input type="range" id="teBs" min="60" max="140" step="5"></div></div>' +
        '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn ghost sm" id="tePlan">📋 Arrange slides like the sample</button></div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:6px">🧍 Add a person to any slide: open 🖼️ Picture on the slide → <b>🧍 Upload a person</b> (the background is removed for you), then tick <b>Spill into the next slide</b> so they carry on across the swipe.</div>';
    }
    function bindPurple(q, qa) {
      var P = car.look.purple = Object.assign({}, PURPLE, car.look.purple || {}), re = function (full) { car.look.purple = P; lookChanged(full); };
      qa('[data-ppcol]').forEach(function (x) { x.oninput = function () { P[x.dataset.ppcol] = x.value.toUpperCase(); re(); }; });
      qa('[data-ppchk]').forEach(function (x) { x.onchange = function () { P[x.dataset.ppchk] = x.checked; re(); }; });
      qa('[data-ppseg]').forEach(function (b) { b.onclick = function () { P[b.dataset.ppseg] = b.dataset.v; re(true); }; });
      qa('[data-pppal]').forEach(function (b) { b.onclick = function () { var c = PPAL[b.dataset.pppal]; ['acc', 'ink', 'bg', 'sub', 'line', 'hl', 'numBg', 'numInk', 'btnBg', 'btnInk', 'wave'].forEach(function (k) { P[k] = c[k] || ''; }); re(true); }; });
      qa('[data-pptxt]').forEach(function (x) { x.oninput = function () { P[x.dataset.pptxt] = x.value.slice(0, 40); re(); }; });
      q('#tePlan').onclick = function () {
        var S = car.slides, cover = S.filter(function (s) { return s.kind === 'cover'; })[0], end = S.filter(function (s) { return s.kind === 'end'; })[0];
        var tips = S.filter(function (s) { return s.kind === 'tip' && s.num !== 'off'; }).slice(0, 6);
        if (!confirm('Arrange the slides like the sample?\n\nCover → "Here are the reasons" → your numbered tips → a question → last slide. Your words and pictures are kept' + (tips.length ? '' : ' (example tips are added)') + '.')) return;
        if (!tips.length) tips = [['Saves you **time**', 'Explain the first reason in one or two short sentences.'], ['Builds **trust**', 'Explain the second reason here.'], ['Saves you **money**', 'Explain the third reason here.'], ['Less **stress**', 'Explain the fourth reason here.'], ['Better **results**', 'Explain the fifth reason here.']].map(function (t) { return { kind: 'tip', heading: t[0], body: t[1] }; });
        var nb = [cover || { kind: 'cover', heading: 'Why you need **this**', body: '' }, { kind: 'stat', heading: String(tips.length), body: 'Here are the **reasons**' }].concat(tips,
          [{ kind: 'tip', num: 'off', heading: 'Does this **sound like you?**', body: 'Tell Auntie Tobi in the comments 👇🏾' }, end || { kind: 'end', heading: 'Ready to **start?**', body: 'Follow for more **UK tips**' }]);
        car.slides = nb.slice(0, 10); mark(); paintSlides(); setSel(0); paintThumbs(); renderLook(); X.toast('📋 Slides arranged like the sample');
      };
    }
    function setPic(i, img) { var sl = car.slides[i], old = sl.pic || {}; sl.pic = Object.assign({ mode: 'bg', fade: 0.7, size: 0.3, z: 1, fx: 0.5, fy: 0.5 }, old.img && old.mode !== 'cut' ? old : {}, { img: img }); delete sl.pic.copied; openPic[i] = true; mark(); paintSlides(); setSel(i); paintThumbs(); }
    function shrinkPic(file, max) { return new Promise(function (ok, bad) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { var k = Math.min(1, (max || 1600) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.88)); }; im.onerror = function () { bad(new Error('That photo didn’t open.')); }; im.src = u; }); }
    function bindPic(el, i) {
      var d = el.querySelector('.spic'); if (!d) return; d.addEventListener('toggle', function () { openPic[i] = d.open; });
      var msg = function (t) { var m = el.querySelector('[data-pmsg]'); if (m) m.textContent = t || ''; };
      bindCut(el, i, msg);
      if (el.querySelector('[data-pup]')) el.querySelector('[data-pup]').onchange = function () { var f = this.files && this.files[0]; if (!f) return; msg('Adding the photo…'); shrinkPic(f).then(function (du) { return X.api('img', { dataUrl: du }); }).then(function (r) { setPic(i, r.id); X.toast('🖼️ Photo added'); }).catch(function (e) { msg(''); X.toast(e.message || 'Couldn’t use that photo.'); }); };
      el.querySelector('[data-pmk]').onclick = function () { el.querySelector('[data-pmkrow]').classList.remove('hidden'); var w = el.querySelector('[data-pwant]'); if (!w.value) w.value = String(car.slides[i].heading || '').replace(/\*\*/g, ''); w.focus(); };
      el.querySelector('[data-pgo]').onclick = function () { var w = el.querySelector('[data-pwant]').value.trim(), b = this; if (w.length < 3) return X.toast('Describe the picture first'); b.disabled = true; msg('✨ Making the picture… (about 20 seconds)'); X.api('rx-pic', { want: w, aspect: '4:5' }).then(function (r) { usePic(i, r.img, msg); X.toast('✨ Picture added'); }).catch(function (e) { b.disabled = false; msg(''); X.toast(e.message); }); };
      if (el.querySelector('[data-pch]')) el.querySelector('[data-pch]').onclick = function () { window.HQChars.load().then(function (items) { if (!items.length) return X.toast('No characters yet — make one in 👥 Characters'); window.HQChars.pick([], function (ids) { var c = items.filter(function (x) { return x.id === ids[0]; })[0]; if (c) usePic(i, c.img, msg); }); }); };
      Array.prototype.forEach.call(el.querySelectorAll('[data-p]'), function (f) {
        f.addEventListener(f.tagName === 'SELECT' ? 'change' : 'input', function () {
          var p = car.slides[i].pic, k = f.dataset.p; if (!p) return;
          if (k === 'mode') { p.mode = f.value; if (p.mode === 'bg' && p.fade < 0.3) p.fade = 0.7; if (p.mode !== 'bg' && p.fade >= 0.6) p.fade = 0; mark(); paintSlides(); setSel(i); paintThumbs(); return; }
          p[k] = Number(f.value) / 100; var pv = el.querySelector('[data-ppv="' + k + '"]'); if (pv) pv.textContent = f.value + (k === 'fade' || k === 'size' || k === 'z' ? '%' : '');
          var sm = el.querySelector('.spic summary .muted'); if (sm && k === 'fade') sm.textContent = '— ' + (p.mode === 'bg' ? 'full background' : 'photo box at the ' + p.mode) + ' · ' + f.value + '% see-through';
          mark(); paint(); paintThumbs();
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-pall]'), function (b) { b.onclick = function () {
        var src = car.slides[i].pic, n = 0; if (!src) return;
        car.slides.forEach(function (s2, k) { if (k === i) return; if (b.dataset.pall === 'pic') { s2.pic = JSON.parse(JSON.stringify(src)); n++; } else if (s2.pic && s2.pic.img) { s2.pic = Object.assign({}, JSON.parse(JSON.stringify(src)), { img: s2.pic.img }); n++; } });
        mark(); paintSlides(); setSel(i); paintThumbs(); X.toast(n ? (b.dataset.pall === 'pic' ? '📋 This picture is now on all ' + car.slides.length + ' slides' : '📋 Settings copied to ' + n + ' slide' + (n === 1 ? '' : 's') + ' with a picture') : 'No other slides have a picture yet — use “This picture on all slides”');
      }; });
      if (el.querySelector('[data-pdel]')) el.querySelector('[data-pdel]').onclick = function () { delete car.slides[i].pic; mark(); paintSlides(); setSel(i); paintThumbs(); };
    }
    picWaiters.length = 0; picWaiters.push(function () { paint(); paintThumbs(); });
    function paintSlides() {
      $('#teSlides').innerHTML = car.slides.map(slideHtml).join('');
      Array.prototype.forEach.call(ov.querySelectorAll('.cslide'), function (el) {
        var i = +el.dataset.i;
        el.addEventListener('focusin', function () { if (sel !== i) setSel(i); });
        el.addEventListener('click', function (e) { if (!e.target.closest('button') && !e.target.closest('label') && sel !== i) setSel(i); });
        Array.prototype.forEach.call(el.querySelectorAll('[data-f]'), function (f) {
          f.addEventListener(f.tagName === 'SELECT' ? 'change' : 'input', function () {
            var k = f.dataset.f, sl = car.slides[i];
            if (k === 'hs' || k === 'bs') { sl[k] = Number(f.value) / 100; var pv = el.querySelector('[data-pv="' + k + '"]'); if (pv) pv.textContent = pct(sl[k]); }
            else sl[k] = f.value;
            if (/^(style|brush|num|hs|bs)$/.test(k)) { var sm = el.querySelector('.sopts summary .muted'); if (sm) sm.textContent = '— ' + optSummary(sl); }
            if (k === 'kind') { sl.align = sl.kind === 'tip' ? 'left' : 'center'; if (sl.kind === 'end' && !sl.heading) Object.assign(sl, endSlide()); if (EXAMPLE[sl.kind] && (!sl.body || confirm('Fill this slide with an example to show how a ' + KINDS[sl.kind].replace(/^\S+\s/, '') + ' slide works? (Your words on this slide will be replaced.)'))) { sl.heading = EXAMPLE[sl.kind][0]; sl.body = EXAMPLE[sl.kind][1]; } paintSlides(); setSel(i); }
            mark(); paint(); paintThumbs();
          });
        });
        el.querySelector('[data-mv="-1"]').onclick = function () { if (i > 0) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i - 1, 0, a); sel = i - 1; mark(); paintSlides(); setSel(sel); paintThumbs(); } };
        el.querySelector('[data-mv="1"]').onclick = function () { if (i < car.slides.length - 1) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i + 1, 0, a); sel = i + 1; mark(); paintSlides(); setSel(sel); paintThumbs(); } };
        var det = el.querySelector('.sopts'); det.addEventListener('toggle', function () { openOpts[i] = det.open; });
        bindPic(el, i); bindDeco(el, i);
        el.querySelector('[data-reset]').onclick = function () { var sl = car.slides[i]; delete sl.style; delete sl.hs; delete sl.bs; delete sl.brush; delete sl.num; mark(); paintSlides(); setSel(i); paintThumbs(); };
        el.querySelector('[data-dup]').onclick = function () { if (car.slides.length >= 10) return X.toast('Instagram allows up to 10 slides'); car.slides.splice(i + 1, 0, JSON.parse(JSON.stringify(car.slides[i]))); mark(); paintSlides(); setSel(i + 1); paintThumbs(); };
        el.querySelector('[data-del]').onclick = function () { if (car.slides.length <= 1) return; if (!confirm('Delete slide ' + (i + 1) + '?')) return; car.slides.splice(i, 1); mark(); paintSlides(); setSel(Math.min(i, car.slides.length - 1)); paintThumbs(); };
      });
    }
    $('#teTitle').oninput = function () { car.title = this.value; mark(); };
    $('#teCap').oninput = function () { car.caption = this.value; mark(); };
    $('#teTags').oninput = function () { car.hashtags = this.value; mark(); };
    $('#teCopy').onclick = function () { var txt = $('#teCap').value + '\n\n' + $('#teTags').value; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { X.toast('Copied ✅'); }, function () { X.toast('Couldn’t copy — select the text instead'); }); };
    $('#teAdd').onclick = function () {
      if (car.slides.length >= 10) return X.toast('Instagram allows up to 10 slides');
      var last = car.slides[car.slides.length - 1], at = last && last.kind === 'end' ? car.slides.length - 1 : car.slides.length;
      car.slides.splice(at, 0, { kind: 'tip', heading: 'New **tip**', body: '', align: 'left' }); mark(); paintSlides(); setSel(at); paintThumbs();
      var el = ov.querySelectorAll('.cslide')[at]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    $('#tePrev').onclick = function () { setSel(sel - 1); };
    $('#teNext').onclick = function () { setSel(sel + 1); };
    function paintPosted() { $('#tePosted').textContent = car.status === 'posted' ? '↩ Mark as not posted' : '✅ Mark as posted'; }
    $('#tePosted').onclick = async function () { car.status = car.status === 'posted' ? 'draft' : 'posted'; paintPosted(); await save(); };
    async function save() {
      var payload = { id: car.id, title: car.title, slides: car.slides, numbers: car.numbers, handle: car.handle, swipe: car.swipe, swipeMode: car.swipeMode, swipeStyle: car.swipeStyle, swipePos: car.swipePos, brush: car.brush, style: car.style || 'classic', hs: car.hs || 1, bs: car.bs || 1, caption: car.caption, hashtags: car.hashtags, status: car.status, look: car.look || null };
      try {
        var r = await X.api('tc-save', { item: payload });
        car.id = r.item.id; car.updatedAt = r.item.updatedAt; car.postedAt = r.item.postedAt;
        var l = list(), k = l.findIndex(function (x) { return x.id === r.item.id; }); if (k >= 0) l[k] = r.item; else l.unshift(r.item);
        dirty = false; $('#teSaved').textContent = 'Saved ✓'; return true;
      } catch (x) { X.toast(x.message); return false; }
    }
    $('#teSave').onclick = save;
    $('#teAnim').onclick = async function () {
      var c1 = isSpec(car) ? car.look.spec.bg.c1 : '#FFFFFF', h = c1.replace('#', ''), rr2 = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), bb = parseInt(h.slice(4, 6), 16), l = (0.299 * rr2 + 0.587 * gg + 0.114 * bb) / 255;
      var theme = l > 0.8 ? (rr2 > bb + 10 ? 'cream' : 'white') : (gg > rr2 + 20 && gg > bb) ? 'green' : (rr2 > 200 && gg > 120 && bb < 90) ? 'gold' : 'navy';
      var item = { title: String(car.slides[0].heading || car.title || '').replace(/\*\*/g, '').slice(0, 120), theme: theme, anim: 'pop', handle: '@auntietobi_uk', caption: (car.caption || '') + (car.hashtags ? '\n\n' + car.hashtags : ''),
        slides: car.slides.map(function (x) { return { layout: x.kind === 'cover' ? 'cover' : x.kind === 'end' ? 'cta' : 'points', title: x.heading, text: x.body || '' }; }) };
      try { await X.api('car-save', { item: item }); X.toast('🎬 Added to Animated Carousels'); } catch (e) { X.toast(e.message); }
    };
    function overList() { var c = document.createElement('canvas'); c.width = W; c.height = H; var cx = c.getContext('2d'); return car.slides.map(function (s, i) { return draw(cx, car, i).over ? i + 1 : 0; }).filter(Boolean); }
    $('#teDl').onclick = async function () {
      var b = this, bad = overList();
      if (bad.length && !confirm('Slide ' + bad.join(', ') + (bad.length > 1 ? ' have' : ' has') + ' too much text to fit. Download anyway?')) return;
      b.disabled = true; b.textContent = 'Preparing…';
      try { if (dirty) await save(); await exportZip(car); X.toast('Downloaded ✅ — check your Downloads'); } catch (x) { X.toast('Couldn’t make the download — please try again'); }
      b.disabled = false; b.textContent = '🗜️ All slides as one .zip';
    };
    var ready = null;   // pictures made, waiting for a tap to open the phone's Save sheet
    $('#teAll').onclick = async function () {
      var b = this, m = $('#teAllMsg'), lab = '⬇️ All slides as separate pictures';
      if (ready) { var fs = ready; ready = null; b.textContent = lab; try { await navigator.share({ files: fs }); m.textContent = '✅ Tap “Save Images” to put them in Photos.'; } catch (e) { if (e && e.name !== 'AbortError') { await downloadEach(fs); m.textContent = '✅ Downloaded.'; } } return; }
      var bad = overList(); if (bad.length && !confirm('Slide ' + bad.join(', ') + (bad.length > 1 ? ' have' : ' has') + ' too much text to fit. Download anyway?')) return;
      b.disabled = true; b.textContent = 'Preparing…'; m.textContent = '';
      try {
        if (dirty) await save(); var files = await slideFiles(car);
        if (phoneShare(files)) {
          try { await navigator.share({ files: files }); m.textContent = '✅ Tap “Save Images” to put them in Photos.'; }
          catch (e) { if (e && e.name === 'NotAllowedError') { ready = files; b.disabled = false; b.textContent = '📲 Tap to save ' + files.length + ' pictures'; return; } if (e && e.name !== 'AbortError') await downloadEach(files); }
        } else { await downloadEach(files); m.textContent = '✅ ' + files.length + ' pictures saved to Downloads. If only one arrived, click “Allow” when the browser asks about multiple downloads, then press again.'; }
      } catch (x) { X.toast('Couldn’t make the pictures — please try again'); }
      b.disabled = false; b.textContent = lab;
    };
    $('#teOne').onclick = async function () {
      try { await fontsReady(); download(await pngOf(car, sel), slug(car.title) + '-' + pad(sel + 1) + '.png'); } catch (x) { X.toast('Couldn’t save the image — please try again'); }
    };
    $('#teX').onclick = async function () {
      if (dirty) { $('#teSaved').textContent = 'Saving…'; if (!(await save()) && !confirm('Your last changes couldn’t be saved. Leave anyway?')) return; }
      ov.remove(); document.body.style.overflow = ''; view();
    };
    renderLook(); paintSlides(); paintPosted(); setSel(0); paintThumbs();
    // 💾 auto-save a few seconds after a change
    var saving = false, asv = setInterval(function () { if (!document.body.contains(ov)) return clearInterval(asv); if (dirty && !saving) { saving = true; save().then(function () { saving = false; }); } }, 4000);
    if (dirty) { mark(); save(); }
    fontsReady().then(function () { paint(); paintThumbs(); });
  }

  window.HQTpl = { init: init, view: view, draw: draw, W: W, H: H };
})();
