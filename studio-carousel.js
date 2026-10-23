/*
 * Auntie Tobi Business Studio — Design renderer (posts, carousels and stories).
 * Draws each slide onto a <canvas>. Fully deterministic: the same design always draws the same picture,
 * so the live preview and the downloaded PNG are identical. No AI, no network.
 *
 *   TobiCarousel.TEMPLATES   [{ id, name, desc }]
 *   TobiCarousel.SIZES       { portrait: {w,h,label}, square: {...}, story: {...} }
 *   TobiCarousel.draw(canvas, design, index, assets) → { overflow, regions: { head, body, photo } }
 *     design = { template, size, color1, color2, font, logo, handle, cta, numbers, swipe, headScale, bodyScale,
 *                slides: [{ headline, body, img, scale, photo: { mode, zoom, x, y, fit } }] }
 *     assets = { logo: Image|null, images: { <ref>: Image } }
 */
(function () {
  'use strict';
  var W = 1080, H = 1350, M = 84, K = 1;
  var SIZES = {
    portrait: { w: 1080, h: 1350, label: 'Portrait 4:5', sub: '1080 × 1350' },
    square: { w: 1080, h: 1080, label: 'Square 1:1', sub: '1080 × 1080' },
    story: { w: 1080, h: 1920, label: 'Story 9:16', sub: '1080 × 1920' },
  };
  // Layouts are designed on a 1080 × 1350 page; Y() moves vertical positions to the current size.
  function Y(v) { return Math.round(v * H / 1350); }

  // ── colour helpers ──
  function rgb(hex) { var c = String(hex || '#000000').replace('#', ''); return [parseInt(c.substr(0, 2), 16) || 0, parseInt(c.substr(2, 2), 16) || 0, parseInt(c.substr(4, 2), 16) || 0]; }
  function lum(hex) { var c = rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function on(hex) { return lum(hex) > 0.42 ? '#0F1E36' : '#FFFFFF'; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join(''); }
  function rgba(hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function contrast(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  function accentOn(bg, c2, c1) { if (contrast(c2, bg) >= 2.2) return c2; if (contrast(c1, bg) >= 2.2) return c1; return on(bg); }

  // ── type ──
  function headFont(d, size) { return d.font === 'elegant' ? '700 ' + size + 'px Fraunces, Georgia, serif' : (d.font === 'bold' ? '800 ' : '700 ') + size + 'px "DM Sans", Arial, sans-serif'; }
  function bodyFont(d, size) { return '400 ' + size + 'px "DM Sans", Arial, sans-serif'; }
  // Line breaks are kept and blank lines become space, so members can lay out their words.
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) {
        while (ctx.measureText(w).width > maxW && w.length > 1) {   // a very long word is broken, never cut off
          var k = w.length - 1; while (k > 1 && ctx.measureText(w.slice(0, k) + '-').width > maxW) k--;
          if (line) { out.push(line); line = ''; } out.push(w.slice(0, k) + '-'); w = w.slice(k);
        }
        var test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
      });
      if (line) out.push(line);
    });
    return out;
  }
  // Fit text in a box: shrink from `size` down to `min`; if it still doesn't fit, cut with "…" and report overflow.
  function fit(ctx, text, fontFn, maxW, maxH, size, min, lh) {
    text = String(text || '').replace(/^\s*\n+|\n+\s*$/g, '').replace(/[ \t]+$/gm, '');
    size = Math.round(size); min = Math.round(Math.min(min, size));
    if (!text.trim()) return { lines: [], size: size, lh: lh, height: 0, overflow: false };
    for (var s = size; s >= min; s -= 2) {
      ctx.font = fontFn(s); var lines = wrap(ctx, text, maxW);
      if (lines.length * s * lh <= maxH) return { lines: lines, size: s, lh: lh, height: lines.length * s * lh, overflow: false };
    }
    ctx.font = fontFn(min); var all = wrap(ctx, text, maxW), max = Math.max(1, Math.floor(maxH / (min * lh)));
    var cut = all.slice(0, max); var last = cut[cut.length - 1] || '';
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    cut[cut.length - 1] = last.replace(/\s+\S*$/, '') + '…';
    return { lines: cut, size: min, lh: lh, height: cut.length * min * lh, overflow: true };
  }
  function drawLines(ctx, f, fontFn, x, y, color, align, maxW) {
    ctx.font = fontFn(f.size); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = align === 'center' ? 'center' : 'left';
    var ax = align === 'center' ? x + maxW / 2 : x;
    f.lines.forEach(function (l, i) { if (l) ctx.fillText(l, ax, y + f.size * (0.92 + i * f.lh)); });
    ctx.textAlign = 'left';
  }
  function linesW(ctx, f, fontFn) { ctx.font = fontFn(f.size); var m = 0; f.lines.forEach(function (l) { m = Math.max(m, ctx.measureText(l).width); }); return m; }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // A photo in a box, with the member's zoom and position (x/y from -1 to 1) and fill or fit.
  function photoIn(ctx, im, x, y, w, h, p, backdrop) {
    p = p || {}; var zoom = Math.max(1, Math.min(4, Number(p.zoom) || 1)), px = Math.max(-1, Math.min(1, Number(p.x) || 0)), py = Math.max(-1, Math.min(1, Number(p.y) || 0));
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var r = (p.fit === 'fit' ? Math.min(w / im.width, h / im.height) : Math.max(w / im.width, h / im.height)) * zoom, iw = im.width * r, ih = im.height * r;
    if (p.fit === 'fit' && backdrop) { ctx.fillStyle = backdrop; ctx.fillRect(x, y, w, h); }
    var dx = iw - w, dy = ih - h;
    ctx.drawImage(im, x - dx / 2 - (dx > 0 ? dx / 2 * px : -dx / 2 * px), y - dy / 2 - (dy > 0 ? dy / 2 * py : -dy / 2 * py), iw, ih);
    ctx.restore();
  }
  function pill(ctx, text, x, y, bg, fg, size, alignRight, arrow) {
    ctx.font = '700 ' + size + 'px "DM Sans", Arial, sans-serif';
    var aw = arrow ? size * 1.3 : 0, w = ctx.measureText(text).width + size * 1.4 + aw, h = size * 1.9;
    if (alignRight) x -= w;
    ctx.fillStyle = bg; rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + size * 0.7, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
    if (arrow) {  // drawn, so it looks the same on every phone
      var ax = x + w - size * 0.7 - size * 0.9, ay = y + h / 2;
      ctx.strokeStyle = fg; ctx.lineWidth = size * 0.13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + size * 0.9, ay); ctx.moveTo(ax + size * 0.55, ay - size * 0.32); ctx.lineTo(ax + size * 0.9, ay); ctx.lineTo(ax + size * 0.55, ay + size * 0.32); ctx.stroke();
    }
    return { w: w, h: h };
  }
  function logoAt(ctx, im, x, y, size, plate) {
    if (!im) return;
    if (plate) { ctx.fillStyle = '#FFFFFF'; rr(ctx, x - 10, y - 10, size + 20, size + 20, 22); ctx.fill(); }
    var r = Math.min(size / im.width, size / im.height); ctx.drawImage(im, x + (size - im.width * r) / 2, y + (size - im.height * r) / 2, im.width * r, im.height * r);
  }

  /*
   * Each template paints its background/decoration and says where the words go:
   *   { box: {x,y,w,h}, head, body, accent, align, plateLogo, logo: {x,y,size}, counter: {...}, ... }
   * The shared code then places the photo, headline, body, swipe/CTA buttons and footer.
   */
  var T = {};
  T.bold = { name: 'Bold Statement', desc: 'Your colour, huge headline', paint: function (ctx, d, s) {
    ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(on(d.color1) === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.06); ctx.beginPath(); ctx.arc(W - 40, Y(140), 300, 0, 7); ctx.fill();
    var fg = on(d.color1);
    return { box: { x: M, y: Y(250), w: W - 2 * M, h: H - Y(250) - Y(170) }, head: fg, body: rgba(fg, 0.86), accent: accentOn(d.color1, d.color2, '#FFFFFF'), align: 'left', bar: true, headSize: s.role === 'hook' ? 118 : 92, plateLogo: true };
  } };
  T.minimal = { name: 'Clean Minimal', desc: 'Cream, calm and elegant', paint: function (ctx, d) {
    ctx.fillStyle = '#FBF8F2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.color1; ctx.fillRect(M, Y(210), 120, 8);
    ctx.strokeStyle = rgba('#0F1E36', 0.12); ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
    return { box: { x: M, y: Y(270), w: W - 2 * M, h: H - Y(270) - Y(180) }, head: '#0F1E36', body: '#3D4657', accent: accentOn('#FBF8F2', d.color1, d.color2), align: 'left', headSize: 86 };
  } };
  T.split = { name: 'Split Panel', desc: 'Colour block on top, words below', paint: function (ctx, d, s, i) {
    var top = Y(560); ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, top); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = d.color2; ctx.beginPath(); ctx.arc(W - M - 70, top, 70, 0, 7); ctx.fill();
    if (d.numbers !== false) { ctx.fillStyle = on(d.color2); ctx.font = '800 58px "DM Sans", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), W - M - 70, top + 3); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
    return { split: top, headBox: { x: M, y: Y(200), w: W - 2 * M - 40, h: top - Y(250) }, box: { x: M, y: top + Y(110), w: W - 2 * M, h: H - top - Y(290) }, head: on(d.color1), body: '#2B3443', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'left', headSize: 84, noCounter: true, plateLogo: true };
  } };
  T.notebook = { name: 'Notebook', desc: 'Lined paper with a highlighter', paint: function (ctx, d) {
    ctx.fillStyle = '#FFFDF4'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(70,120,190,0.18)'; ctx.lineWidth = 2; for (var y = Y(230); y < H - 60; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,69,65,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, H); ctx.stroke();
    ctx.fillStyle = '#E9E4D6'; for (var k = 0; Y(220) + k * 190 < H - 60; k++) { ctx.beginPath(); ctx.arc(70, Y(220) + k * 190, 18, 0, 7); ctx.fill(); }
    return { box: { x: 200, y: Y(250), w: W - 200 - M, h: H - Y(250) - Y(190) }, head: '#1B2433', body: '#2F3A4C', accent: accentOn('#FFFDF4', d.color1, d.color2), highlight: rgba(d.color2, 0.55), align: 'left', headSize: 84 };
  } };
  T.chat = { name: 'Chat Bubbles', desc: 'Your points as friendly messages', paint: function (ctx, d) {
    var top = Y(170); ctx.fillStyle = mix(d.color1, '#FFFFFF', 0.9); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, top);
    return { chat: true, box: { x: M, y: top + Y(80), w: W - 2 * M, h: H - top - Y(80) - Y(170) }, head: '#0F1E36', body: '#FFFFFF', accent: d.color1, align: 'left', headSize: 70, headerFg: on(d.color1), headerY: top / 2, logo: { x: M, y: top / 2 - 40, size: 80 }, plateLogo: true, counter: { y: top / 2 - 28, bg: rgba(on(d.color1), 0.18), fg: on(d.color1) } };
  } };
  T.gradient = { name: 'Gradient Glow', desc: 'Your two colours with a frosted card', paint: function (ctx, d) {
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, d.color1); g.addColorStop(1, d.color2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(160, H - Y(170), 260, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(980, Y(160), 200, 0, 7); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.25)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; ctx.fillStyle = 'rgba(255,255,255,0.92)'; rr(ctx, 64, Y(190), W - 128, H - Y(190) - Y(150), 48); ctx.fill(); ctx.restore();
    return { box: { x: 130, y: Y(280), w: W - 260, h: H - Y(280) - Y(260) }, head: '#0F1E36', body: '#38404F', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'center', headSize: 82, footerOnBg: true, footerY: H - Y(80) };
  } };
  T.magazine = { name: 'Magazine', desc: 'Big numbers and editorial lines', paint: function (ctx, d, s, i, n) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    if (d.numbers !== false && n > 1) { ctx.fillStyle = mix(d.color1, '#FFFFFF', 0.86); ctx.font = '800 ' + Math.round(330 * Math.min(1, H / 1350)) + 'px "DM Sans", Arial, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillText(('0' + (i + 1)).slice(-2), M - 14, Y(470)); }
    ctx.fillStyle = '#0F1E36'; ctx.fillRect(M, Y(150), W - 2 * M, 4); ctx.fillRect(M, H - Y(150), W - 2 * M, 2);
    ctx.font = '700 26px "DM Sans", Arial, sans-serif'; ctx.fillStyle = d.color1;
    ctx.fillText((s.role === 'hook' ? 'THE GUIDE' : s.role === 'cta' ? 'YOUR NEXT STEP' : s.role === 'single' ? '' : d.numbers !== false ? 'NO. ' + (i + 1) + ' OF ' + n : '').toUpperCase(), M, Y(128));
    var top = d.numbers !== false && n > 1 ? Y(520) : Y(260);
    return { box: { x: M, y: top, w: W - 2 * M, h: H - top - Y(200) }, head: '#0F1E36', body: '#333B48', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'left', headSize: 84, noCounter: true, logo: { x: W - M - 70, y: Y(60), size: 70 }, footerY: H - Y(110) };
  } };
  T.ankara = { name: 'Ankara Accent', desc: 'A bold geometric print border', paint: function (ctx, d) {
    ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, H);
    var c2 = d.color2, wh = '#FFFFFF', step = 90;
    for (var x = 0; x < W; x += step) for (var y = 0; y < H; y += step) {
      if (x > 60 && x < W - 150 && y > 60 && y < H - 150) continue;
      var k = ((x + y) / step) % 3;
      ctx.fillStyle = k === 0 ? c2 : k === 1 ? wh : mix(d.color1, '#000000', 0.25);
      ctx.beginPath(); ctx.moveTo(x + step / 2, y + 8); ctx.lineTo(x + step - 8, y + step / 2); ctx.lineTo(x + step / 2, y + step - 8); ctx.lineTo(x + 8, y + step / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k === 1 ? c2 : d.color1; ctx.beginPath(); ctx.arc(x + step / 2, y + step / 2, 12, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#FFF9EC'; rr(ctx, 110, 110, W - 220, H - 220, 34); ctx.fill();
    ctx.strokeStyle = c2; ctx.lineWidth = 6; rr(ctx, 130, 130, W - 260, H - 260, 26); ctx.stroke();
    return { box: { x: 190, y: Y(300), w: W - 380, h: H - Y(300) - Y(360) }, head: '#1B1A17', body: '#3A3530', accent: accentOn('#FFF9EC', d.color1, d.color2), align: 'center', headSize: 80, logo: { x: W / 2 - 45, y: Y(175), size: 90 }, counter: { center: true, y: H - Y(290), bg: d.color1, fg: on(d.color1) }, footerY: H - Y(168) };
  } };
  T.checklist = { name: 'Checklist', desc: 'Tick boxes — great for tips', paint: function (ctx, d) {
    ctx.fillStyle = mix(d.color2, '#FFFFFF', 0.88); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF'; ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; rr(ctx, 60, Y(170), W - 120, H - Y(170) - Y(130), 40); ctx.fill(); ctx.restore();
    ctx.fillStyle = d.color1; rr(ctx, 60, Y(170), W - 120, 22, 11); ctx.fill();
    return { checklist: true, box: { x: 130, y: Y(270), w: W - 260, h: H - Y(270) - Y(230) }, head: '#0F1E36', body: '#2B3443', accent: d.color1, align: 'left', headSize: 76 };
  } };
  T.photo = { name: 'Photo Focus', desc: 'Your photo full-bleed with bold words', paint: function (ctx, d, s, i, n, A) {
    var im = s.img && A.images[s.img];
    if (im) photoIn(ctx, im, 0, 0, W, H, s.photo, d.color1);
    else {
      ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = rgba(d.color2, 0.35); ctx.lineWidth = 3;
      for (var r = 80; r < 2100; r += 70) { ctx.beginPath(); ctx.arc(W, 0, r, 0, 7); ctx.stroke(); }
    }
    var g = ctx.createLinearGradient(0, H * 0.25, 0, H); g.addColorStop(0, 'rgba(10,16,30,0)'); g.addColorStop(0.55, 'rgba(10,16,30,0.72)'); g.addColorStop(1, 'rgba(10,16,30,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return { photoBg: true, bottom: true, box: { x: M, y: Y(560), w: W - 2 * M, h: H - Y(560) - Y(170) }, head: '#FFFFFF', body: 'rgba(255,255,255,0.88)', accent: accentOn('#141B2B', d.color2, d.color1), align: 'left', headSize: 90, plateLogo: true, bar: true };
  } };
  var ORDER = ['bold', 'minimal', 'split', 'notebook', 'chat', 'gradient', 'magazine', 'ankara', 'checklist', 'photo'];
  var PHOTO_SPACE = { small: 0.28, medium: 0.4, large: 0.56 };

  function clampScale(v, lo, hi, def) { v = Number(v); return isFinite(v) && v > 0 ? Math.max(lo, Math.min(hi, v)) : def; }

  function draw(canvas, design, index, assets) {
    var d = design, A = assets || { images: {} }; A.images = A.images || {};
    var sz = SIZES[d.size] || SIZES.portrait; W = sz.w; H = sz.h;
    K = H === 1080 ? 0.88 : H >= 1900 ? 1.06 : 1;   // type a little smaller on square, a little larger on stories
    var slides = d.slides || [], n = slides.length, s0 = slides[index] || { headline: '', body: '' };
    var role = n === 1 ? 'single' : index === 0 ? 'hook' : index === n - 1 ? 'cta' : 'point';
    var s = { headline: s0.headline, body: s0.body, img: s0.img, role: role, photo: s0.photo || {} };
    var im = s.img && A.images[s.img];
    var full = im && (d.template === 'photo' || s.photo.mode === 'full');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), tpl = full ? T.photo : (T[d.template] || T.bold);
    ctx.clearRect(0, 0, W, H);
    var L = tpl.paint(ctx, d, s, index, n, A), box = { x: L.box.x, y: L.box.y, w: L.box.w, h: L.box.h }, overflow = false, regions = {};
    if (full) regions.photo = { x: 0, y: 0, w: W, h: H };
    var hs = clampScale(d.headScale, 0.6, 1.8, 1) * clampScale(s0.scale, 0.6, 1.6, 1) * K, bs = clampScale(d.bodyScale, 0.6, 1.8, 1) * clampScale(s0.scale, 0.6, 1.6, 1) * K;
    var HF = function (sz) { return headFont(d, sz); }, BF = function (sz) { return bodyFont(d, sz); };
    var showLogo = d.logo !== false && A.logo, numbers = d.numbers !== false && n > 1;
    var swipe = role === 'hook' && d.swipe !== false, ctaText = String(d.cta || '').trim(), cta = !!ctaText && (role === 'cta' || role === 'single');

    // header: logo + slide number
    if (L.chat) {
      if (showLogo) { ctx.save(); ctx.beginPath(); ctx.arc(L.logo.x + 40, L.logo.y + 40, 44, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.clip(); logoAt(ctx, A.logo, L.logo.x + 6, L.logo.y + 6, 68, false); ctx.restore(); }
      ctx.fillStyle = L.headerFg; ctx.font = '700 40px "DM Sans", Arial, sans-serif'; ctx.textBaseline = 'middle';
      var nm = d.businessName || d.handle || 'Your business'; ctx.fillText(nm.length > 26 ? nm.slice(0, 25) + '…' : nm, L.logo.x + (showLogo ? 110 : 0), L.headerY); ctx.textBaseline = 'alphabetic';
    } else if (showLogo) { var lg = L.logo || { x: M, y: Y(70), size: 96 }; logoAt(ctx, A.logo, lg.x, lg.y, lg.size, L.plateLogo); }
    if (numbers && !L.noCounter) {
      var cc = L.counter || {}, ctext = (index + 1) + '/' + n;
      if (cc.center) { ctx.font = '700 30px "DM Sans", Arial, sans-serif'; var cw = ctx.measureText(ctext).width + 42; pill(ctx, ctext, W / 2 - cw / 2, cc.y, cc.bg, cc.fg, 30); }
      else pill(ctx, ctext, W - M, cc.y || Y(84), cc.bg || rgba(L.head === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.12), cc.fg || L.head, 30, true);
    }

    // photo inside a template: small / medium / large space at the top of the word area
    if (im && !full) {
      var frac = PHOTO_SPACE[s.photo.mode] || PHOTO_SPACE.medium, back = mix(d.color1, '#FFFFFF', 0.85);
      if (L.split) {
        var sy = L.split + 40, sh = Math.max(120, Math.round((H - L.split - Y(190)) * frac));
        ctx.save(); rr(ctx, M, sy, W - 2 * M, sh, 30); ctx.clip(); photoIn(ctx, im, M, sy, W - 2 * M, sh, s.photo, back); ctx.restore();
        regions.photo = { x: M, y: sy, w: W - 2 * M, h: sh }; box.y = sy + sh + 40; box.h = H - box.y - Y(190);
      } else {
        var ph = Math.max(120, Math.round(box.h * frac));
        ctx.save(); rr(ctx, box.x, box.y, box.w, ph, 30); ctx.clip(); photoIn(ctx, im, box.x, box.y, box.w, ph, s.photo, back); ctx.restore();
        regions.photo = { x: box.x, y: box.y, w: box.w, h: ph }; box.y += ph + 40; box.h -= ph + 40;
      }
    }

    var btnH = cta ? 130 : swipe ? 120 : 0, hsz = (L.headSize || 88) * hs, head, body;
    if (L.split) {
      head = fit(ctx, s.headline, HF, L.headBox.w, L.headBox.h, role === 'hook' ? hsz + 12 * hs : hsz, Math.max(30, 44 * hs * 0.75), 1.12);
      var hy = L.headBox.y + Math.max(0, (L.headBox.h - head.height) / 2);
      drawLines(ctx, head, HF, L.headBox.x, hy, L.head, 'left', L.headBox.w);
      regions.head = { x: L.headBox.x, y: L.headBox.y, w: L.headBox.w, h: L.headBox.h };
      body = fit(ctx, s.body, BF, box.w, box.h - btnH, 52 * bs, Math.max(26, 32 * bs), 1.36);
      drawLines(ctx, body, BF, box.x, box.y, L.body, 'left', box.w);
      regions.body = { x: box.x, y: box.y, w: box.w, h: Math.max(body.height, 80) };
      overflow = head.overflow || body.overflow;
    } else if (L.chat) {
      var bw = box.w * 0.86, y = box.y;
      head = fit(ctx, s.headline, HF, bw - 80, (box.h - btnH) * 0.45, (role === 'hook' ? 76 : 64) * hs, Math.max(26, 36 * hs), 1.15);
      ctx.fillStyle = '#FFFFFF'; ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.10)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
      var hw = Math.min(bw, linesW(ctx, head, HF) + 80); rr(ctx, box.x, y, hw, head.height + 70, 36); ctx.fill(); ctx.restore();
      drawLines(ctx, head, HF, box.x + 40, y + 34, L.head, 'left', bw - 80); regions.head = { x: box.x, y: y, w: hw, h: head.height + 70 }; y += head.height + 110;
      if (String(s.body || '').trim()) {
        body = fit(ctx, s.body, BF, bw - 80, box.h - btnH - (y - box.y) - 70, 48 * bs, Math.max(26, 32 * bs), 1.32);
        var bwid = Math.min(bw, linesW(ctx, body, BF) + 80), bx = box.x + box.w - bwid;
        ctx.fillStyle = d.color1; rr(ctx, bx, y, bwid, body.height + 64, 36); ctx.fill();
        drawLines(ctx, body, BF, bx + 40, y + 30, on(d.color1), 'left', bw - 80); regions.body = { x: bx, y: y, w: bwid, h: body.height + 64 };
      } else regions.body = { x: box.x, y: y, w: box.w, h: 100 };
      overflow = head.overflow || (body && body.overflow);
    } else {
      var avail = box.h - btnH, hasBody = !!String(s.body || '').trim();
      head = fit(ctx, s.headline, HF, box.w, avail * (hasBody ? 0.5 : 0.95), role === 'hook' ? hsz + 18 * hs : hsz, Math.max(30, 44 * hs * 0.75), 1.12);
      var gap = L.bar || L.highlight ? 70 : 44, items = null;
      if (L.checklist && (role === 'point' || role === 'single')) items = String(s.body || '').replace(/([.!?])[ \t]+(?=[A-Z0-9])/g, '$1\n').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
      var bodyH = avail - head.height - (hasBody ? gap : 0);
      if (items && items.length) body = fitItems(ctx, items, BF, box.w - 90, bodyH, bs);
      else body = fit(ctx, s.body, BF, box.w, Math.max(0, bodyH), (role === 'hook' ? 54 : 50) * bs, Math.max(26, 32 * bs), 1.36);
      var total = head.height + (hasBody ? gap + body.height : 0);
      var y0 = L.bottom ? box.y + avail - total : L.align === 'center' ? box.y + Math.max(0, (avail - total) / 2) : box.y;
      if (L.highlight) { ctx.font = HF(head.size); head.lines.forEach(function (l, k) { if (!l) return; var lw = ctx.measureText(l).width; ctx.fillStyle = L.highlight; ctx.fillRect((L.align === 'center' ? box.x + (box.w - lw) / 2 : box.x) - 10, y0 + head.size * (0.45 + k * head.lh), lw + 20, head.size * 0.55); }); }
      drawLines(ctx, head, HF, box.x, y0, L.head, L.align, box.w);
      regions.head = { x: box.x, y: y0, w: box.w, h: Math.max(head.height, 90) };
      var yb = y0 + head.height;
      if (L.bar && hasBody) { ctx.fillStyle = L.accent; ctx.fillRect(L.align === 'center' ? box.x + box.w / 2 - 60 : box.x, yb + 26, 120, 10); }
      if (hasBody) {
        if (items && items.length) drawItems(ctx, body, BF, box.x, yb + gap, L.body, L.accent);
        else drawLines(ctx, body, BF, box.x, yb + gap, L.body, L.align, box.w);
        regions.body = { x: box.x, y: yb + gap, w: box.w, h: Math.max(body.height, 80) };
      } else regions.body = { x: box.x, y: yb + 20, w: box.w, h: Math.max(100, avail - head.height - 20) };
      overflow = head.overflow || (hasBody && body.overflow);
    }

    // first slide "Swipe →" · button with the member's own words (none if they leave it empty)
    var footY = L.footerY || H - Y(110);
    if (swipe) {
      var hb = L.photoBg ? d.color2 : L.accent, hf = on(hb);
      ctx.font = '700 34px "DM Sans", Arial, sans-serif'; var sww = ctx.measureText('Swipe').width + 34 * 2.7;
      pill(ctx, 'Swipe', L.align === 'center' ? W / 2 - sww / 2 : box.x, box.y + box.h - 82, hb, hf, 34, false, true);
    }
    if (cta) {
      ctx.font = '800 40px "DM Sans", Arial, sans-serif'; var tw = Math.min(box.w, ctx.measureText(ctaText).width + 90);
      var bx2 = L.align === 'center' ? W / 2 - tw / 2 : box.x, by2 = box.y + box.h - 104, cb = L.photoBg ? d.color2 : L.accent;
      ctx.fillStyle = cb; rr(ctx, bx2, by2, tw, 96, 48); ctx.fill();
      ctx.fillStyle = on(cb); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; var lt = ctaText; while (ctx.measureText(lt).width > tw - 60 && lt.length > 4) lt = lt.slice(0, -2) + '…';
      ctx.fillText(lt, bx2 + tw / 2, by2 + 50); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    // footer handle
    var handle = String(d.handle || '').trim();
    if (handle) {
      var fc = L.footerOnBg ? on(d.color1) : L.photoBg ? 'rgba(255,255,255,0.8)' : L.split ? '#6B7280' : rgba(L.head === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.62);
      ctx.font = '600 30px "DM Sans", Arial, sans-serif'; ctx.fillStyle = fc; ctx.textBaseline = 'alphabetic';
      if (L.align === 'center') { ctx.textAlign = 'center'; ctx.fillText(handle, W / 2, footY); ctx.textAlign = 'left'; } else ctx.fillText(handle, L.box.x, footY);
    }
    return { overflow: !!overflow, regions: regions, width: W, height: H };
  }
  // Checklist items: each gets a tick box; shrink together to fit.
  function fitItems(ctx, items, BF, maxW, maxH, bs) {
    var top = Math.round(48 * bs), min = Math.max(24, Math.round(30 * bs));
    for (var s = top; s >= min; s -= 2) {
      ctx.font = BF(s); var blocks = items.map(function (t) { return wrap(ctx, t, maxW); }), h = blocks.reduce(function (a, b) { return a + b.length * s * 1.32 + s * 0.8; }, 0);
      if (h <= maxH) return { items: blocks, size: s, height: h, overflow: false };
    }
    ctx.font = BF(min); var all = items.map(function (t) { return wrap(ctx, t, maxW); }), out = [], used = 0;
    for (var i = 0; i < all.length; i++) { var bh = all[i].length * min * 1.32 + min * 0.8; if (used + bh > maxH) break; out.push(all[i]); used += bh; }
    return { items: out, size: min, height: used, overflow: true };
  }
  function drawItems(ctx, f, BF, x, y, color, accent) {
    ctx.font = BF(f.size);
    f.items.forEach(function (lines) {
      ctx.fillStyle = accent; rr(ctx, x, y + f.size * 0.12, f.size * 1.05, f.size * 1.05, 10); ctx.fill();
      ctx.strokeStyle = on(accent); ctx.lineWidth = Math.max(4, f.size * 0.12); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x + f.size * 0.24, y + f.size * 0.66); ctx.lineTo(x + f.size * 0.46, y + f.size * 0.88); ctx.lineTo(x + f.size * 0.84, y + f.size * 0.38); ctx.stroke();
      ctx.fillStyle = color; ctx.font = BF(f.size);
      lines.forEach(function (l, k) { ctx.fillText(l, x + 90, y + f.size * (0.92 + k * 1.32)); });
      y += lines.length * f.size * 1.32 + f.size * 0.8;
    });
  }

  window.TobiCarousel = {
    SIZES: SIZES,
    TEMPLATES: ORDER.map(function (id) { return { id: id, name: T[id].name, desc: T[id].desc }; }),
    draw: draw,
  };
})();

/* Tiny ZIP writer (no compression — PNGs are already compressed). Used for "Download as ZIP". */
(function () {
  'use strict';
  var table = null;
  function crc32(u8) {
    if (!table) { table = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = table[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  window.TobiCarousel.zip = zip;
  window.TobiCarousel.crc32 = crc32;
})();
