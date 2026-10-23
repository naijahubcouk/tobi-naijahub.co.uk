/*
 * Auntie Tobi Business Studio — Carousel renderer.
 * Draws Instagram carousel slides (1080 × 1350) onto a <canvas>. Fully deterministic: the same design always
 * draws the same picture, so the live preview and the PNG export are identical. No AI, no network.
 *
 *   TobiCarousel.TEMPLATES            [{ id, name, desc }]
 *   TobiCarousel.draw(canvas, design, index, assets) → { overflow: bool }
 *     design = { template, color1, color2, font: 'modern'|'elegant'|'bold', logo: bool, handle, slides: [{ headline, body, role, img }] }
 *     assets = { logo: Image|null, images: { <ref>: Image } }
 */
(function () {
  'use strict';
  var W = 1080, H = 1350, M = 84;

  // ── colour helpers ──
  function rgb(hex) { var c = String(hex || '#000000').replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function lum(hex) { var c = rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function on(hex) { return lum(hex) > 0.42 ? '#0F1E36' : '#FFFFFF'; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join(''); }
  function rgba(hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  // A readable accent on a given background (falls back to the main colour, then navy).
  function accentOn(bg, c2, c1) {
    var contrast = function (a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    if (contrast(c2, bg) >= 2.2) return c2; if (contrast(c1, bg) >= 2.2) return c1; return on(bg);
  }

  // ── type ──
  function headFont(d, size) { return d.font === 'elegant' ? '700 ' + size + 'px Fraunces, Georgia, serif' : (d.font === 'bold' ? '800 ' : '700 ') + size + 'px "DM Sans", Arial, sans-serif'; }
  function bodyFont(d, size, w) { return (w || 400) + ' ' + size + 'px "DM Sans", Arial, sans-serif'; }
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      words.forEach(function (w) {
        // a single very long word is broken so it never runs off the slide
        while (ctx.measureText(w).width > maxW && w.length > 1) {
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
    text = String(text || '').trim();
    if (!text) return { lines: [], size: size, lh: lh, height: 0, overflow: false };
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
    f.lines.forEach(function (l, i) { ctx.fillText(l, ax, y + f.size * (0.92 + i * f.lh)); });
    ctx.textAlign = 'left';
  }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cover(ctx, im, x, y, w, h) {
    var r = Math.max(w / im.width, h / im.height), iw = im.width * r, ih = im.height * r;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
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
   *   { box: {x,y,w,h}, head, body, accent, align, plateLogo, logo: {x,y,size}, counter: {x,y,bg,fg}, handleColor, ... }
   * The shared code then places the photo (if any), headline, body, hook/CTA extras and footer.
   */
  var T = {};

  T.bold = { name: 'Bold Statement', desc: 'Your colour, huge headline', paint: function (ctx, d, s) {
    ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(on(d.color1) === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.06); ctx.beginPath(); ctx.arc(W - 40, 140, 300, 0, 7); ctx.fill();
    var fg = on(d.color1);
    return { box: { x: M, y: 250, w: W - 2 * M, h: H - 250 - 170 }, head: fg, body: rgba(fg, 0.86), accent: accentOn(d.color1, d.color2, '#FFFFFF'), align: 'left', bar: true, headSize: s.role === 'hook' ? 118 : 92, plateLogo: true };
  } };

  T.minimal = { name: 'Clean Minimal', desc: 'Cream, calm and elegant', paint: function (ctx, d) {
    ctx.fillStyle = '#FBF8F2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.color1; ctx.fillRect(M, 210, 120, 8);
    ctx.strokeStyle = rgba('#0F1E36', 0.12); ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
    return { box: { x: M, y: 270, w: W - 2 * M, h: H - 270 - 180 }, head: '#0F1E36', body: '#3D4657', accent: accentOn('#FBF8F2', d.color1, d.color2), align: 'left', headSize: 86 };
  } };

  T.split = { name: 'Split Panel', desc: 'Colour block on top, words below', paint: function (ctx, d, s, i) {
    var top = 560; ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, top); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = d.color2; ctx.beginPath(); ctx.arc(W - M - 70, top, 70, 0, 7); ctx.fill();
    ctx.fillStyle = on(d.color2); ctx.font = '800 58px "DM Sans", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), W - M - 70, top + 3); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return { split: top, headBox: { x: M, y: 200, w: W - 2 * M - 40, h: top - 250 }, box: { x: M, y: top + 110, w: W - 2 * M, h: H - top - 290 }, head: on(d.color1), body: '#2B3443', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'left', headSize: 84, noCounter: true, plateLogo: true };
  } };

  T.notebook = { name: 'Notebook', desc: 'Lined paper with a highlighter', paint: function (ctx, d) {
    ctx.fillStyle = '#FFFDF4'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(70,120,190,0.18)'; ctx.lineWidth = 2; for (var y = 230; y < H - 60; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,69,65,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, H); ctx.stroke();
    ctx.fillStyle = '#E9E4D6'; for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(70, 220 + k * 190, 18, 0, 7); ctx.fill(); }
    return { box: { x: 200, y: 250, w: W - 200 - M, h: H - 250 - 190 }, head: '#1B2433', body: '#2F3A4C', accent: accentOn('#FFFDF4', d.color1, d.color2), highlight: rgba(d.color2, 0.55), align: 'left', headSize: 84 };
  } };

  T.chat = { name: 'Chat Bubbles', desc: 'Your points as friendly messages', paint: function (ctx, d) {
    ctx.fillStyle = mix(d.color1, '#FFFFFF', 0.9); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, 170);
    return { chat: true, box: { x: M, y: 250, w: W - 2 * M, h: H - 250 - 170 }, head: '#0F1E36', body: '#FFFFFF', accent: d.color1, align: 'left', headSize: 70, headerFg: on(d.color1), logo: { x: M, y: 45, size: 80 }, plateLogo: true, counter: { right: true, y: 62, bg: rgba(on(d.color1), 0.18), fg: on(d.color1) } };
  } };

  T.gradient = { name: 'Gradient Glow', desc: 'Your two colours with a frosted card', paint: function (ctx, d) {
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, d.color1); g.addColorStop(1, d.color2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(160, 1180, 260, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(980, 160, 200, 0, 7); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.25)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; ctx.fillStyle = 'rgba(255,255,255,0.92)'; rr(ctx, 64, 190, W - 128, H - 190 - 150, 48); ctx.fill(); ctx.restore();
    return { box: { x: 130, y: 280, w: W - 260, h: H - 280 - 260 }, head: '#0F1E36', body: '#38404F', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'center', headSize: 82, footerOnBg: true };
  } };

  T.magazine = { name: 'Magazine', desc: 'Big numbers and editorial lines', paint: function (ctx, d, s, i, n) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = mix(d.color1, '#FFFFFF', 0.86); ctx.font = '800 330px "DM Sans", Arial, sans-serif'; ctx.textBaseline = 'alphabetic';
    var num = ('0' + (i + 1)).slice(-2); ctx.fillText(num, M - 14, 470);
    ctx.fillStyle = '#0F1E36'; ctx.fillRect(M, 150, W - 2 * M, 4); ctx.fillRect(M, H - 150, W - 2 * M, 2);
    ctx.font = '700 26px "DM Sans", Arial, sans-serif'; ctx.fillStyle = d.color1; ctx.fillText((s.role === 'hook' ? 'THE GUIDE' : s.role === 'cta' ? 'YOUR NEXT STEP' : 'NO. ' + (i + 1) + ' OF ' + n).toUpperCase(), M, 128);
    return { box: { x: M, y: 520, w: W - 2 * M, h: H - 520 - 200 }, head: '#0F1E36', body: '#333B48', accent: accentOn('#FFFFFF', d.color1, d.color2), align: 'left', headSize: 84, noCounter: true, logo: { x: W - M - 70, y: 60, size: 70 } };
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
    return { box: { x: 190, y: 300, w: W - 380, h: H - 300 - 360 }, head: '#1B1A17', body: '#3A3530', accent: accentOn('#FFF9EC', d.color1, d.color2), align: 'center', headSize: 80, logo: { x: W / 2 - 45, y: 175, size: 90 }, counter: { center: true, y: H - 290, bg: d.color1, fg: on(d.color1) }, footerY: H - 168 };
  } };

  T.checklist = { name: 'Checklist', desc: 'Tick boxes — great for tips', paint: function (ctx, d) {
    ctx.fillStyle = mix(d.color2, '#FFFFFF', 0.88); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF'; ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; rr(ctx, 60, 170, W - 120, H - 170 - 130, 40); ctx.fill(); ctx.restore();
    ctx.fillStyle = d.color1; rr(ctx, 60, 170, W - 120, 22, 11); ctx.fill();
    return { checklist: true, box: { x: 130, y: 270, w: W - 260, h: H - 270 - 230 }, head: '#0F1E36', body: '#2B3443', accent: d.color1, align: 'left', headSize: 76 };
  } };

  T.photo = { name: 'Photo Focus', desc: 'Your photo full-bleed with bold words', paint: function (ctx, d, s, i, n, A) {
    var im = s.img && A.images[s.img];
    if (im) cover(ctx, im, 0, 0, W, H);
    else {
      ctx.fillStyle = d.color1; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = rgba(d.color2, 0.35); ctx.lineWidth = 3;
      for (var r = 80; r < 1400; r += 70) { ctx.beginPath(); ctx.arc(W, 0, r, 0, 7); ctx.stroke(); }
    }
    var g = ctx.createLinearGradient(0, H * 0.25, 0, H); g.addColorStop(0, 'rgba(10,16,30,0)'); g.addColorStop(0.55, 'rgba(10,16,30,0.72)'); g.addColorStop(1, 'rgba(10,16,30,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return { photoBg: true, bottom: true, box: { x: M, y: 560, w: W - 2 * M, h: H - 560 - 170 }, head: '#FFFFFF', body: 'rgba(255,255,255,0.88)', accent: accentOn('#141B2B', d.color2, d.color1), align: 'left', headSize: 90, plateLogo: true, bar: true };
  } };

  var ORDER = ['bold', 'minimal', 'split', 'notebook', 'chat', 'gradient', 'magazine', 'ankara', 'checklist', 'photo'];

  function draw(canvas, design, index, assets) {
    var d = design, A = assets || { images: {} }; A.images = A.images || {};
    var slides = d.slides || [], n = slides.length, s = slides[index] || { headline: '', body: '' };
    var role = s.role || (index === 0 ? 'hook' : index === n - 1 && n > 1 ? 'cta' : 'point');
    s = { headline: s.headline, body: s.body, img: s.img, role: role };
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), tpl = T[d.template] || T.bold;
    ctx.clearRect(0, 0, W, H);
    var L = tpl.paint(ctx, d, s, index, n, A), box = { x: L.box.x, y: L.box.y, w: L.box.w, h: L.box.h }, overflow = false;
    var HF = function (sz) { return headFont(d, sz); }, BF = function (sz) { return bodyFont(d, sz); };
    var showLogo = d.logo !== false && A.logo;

    // header bits: logo + slide counter
    if (L.chat) {
      if (showLogo) { ctx.save(); ctx.beginPath(); ctx.arc(L.logo.x + 40, L.logo.y + 40, 44, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.clip(); logoAt(ctx, A.logo, L.logo.x + 6, L.logo.y + 6, 68, false); ctx.restore(); }
      ctx.fillStyle = L.headerFg; ctx.font = '700 40px "DM Sans", Arial, sans-serif'; ctx.textBaseline = 'middle';
      var nm = d.businessName || d.handle || 'Your business'; ctx.fillText(nm.length > 26 ? nm.slice(0, 25) + '…' : nm, L.logo.x + (showLogo ? 110 : 0), 85); ctx.textBaseline = 'alphabetic';
    } else if (showLogo) { var lg = L.logo || { x: M, y: 70, size: 96 }; logoAt(ctx, A.logo, lg.x, lg.y, lg.size, L.plateLogo); }
    if (!L.noCounter && n > 1) {
      var cc = L.counter || {}, ctext = (index + 1) + '/' + n;
      if (cc.center) { ctx.font = '700 30px "DM Sans", Arial, sans-serif'; var cw = ctx.measureText(ctext).width + 42; pill(ctx, ctext, W / 2 - cw / 2, cc.y, cc.bg, cc.fg, 30); }
      else pill(ctx, ctext, W - M, cc.y || 84, cc.bg || rgba(L.head === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.12), cc.fg || L.head, 30, true);
    }

    // photo on non-photo templates: a rounded picture at the top of the word area
    var im = s.img && A.images[s.img];
    if (im && !L.photoBg) {
      var ph = Math.min(430, box.h * (s.body ? 0.4 : 0.5));
      if (L.split) { ctx.save(); rr(ctx, M, L.split + 40, W - 2 * M, ph - 40, 30); ctx.clip(); cover(ctx, im, M, L.split + 40, W - 2 * M, ph - 40); ctx.restore(); box.y = L.split + ph + 30; box.h = H - box.y - 190; }
      else { ctx.save(); rr(ctx, box.x, box.y, box.w, ph, 30); ctx.clip(); cover(ctx, im, box.x, box.y, box.w, ph); ctx.restore(); box.y += ph + 40; box.h -= ph + 40; }
    }

    // CTA button space and hook "swipe" hint
    var ctaH = role === 'cta' ? 130 : role === 'hook' && n > 1 ? 120 : 0;
    var hsz = L.headSize || 88, head, body;

    if (L.split) {
      head = fit(ctx, s.headline, HF, L.headBox.w, L.headBox.h, role === 'hook' ? hsz + 12 : hsz, 44, 1.12);
      drawLines(ctx, head, HF, L.headBox.x, L.headBox.y + Math.max(0, (L.headBox.h - head.height) / 2), L.head, 'left', L.headBox.w);
      body = fit(ctx, s.body, BF, box.w, box.h - ctaH, 52, 32, 1.36);
      drawLines(ctx, body, BF, box.x, box.y, L.body, 'left', box.w);
      overflow = head.overflow || body.overflow;
    } else if (L.chat) {
      var bw = box.w * 0.86, y = box.y;
      head = fit(ctx, s.headline, HF, bw - 80, (box.h - ctaH) * 0.45, role === 'hook' ? 76 : 64, 36, 1.15);
      ctx.fillStyle = '#FFFFFF'; ctx.save(); ctx.shadowColor = 'rgba(15,30,54,0.10)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6; rr(ctx, box.x, y, Math.min(bw, maxLineW(ctx, head, HF) + 80), head.height + 70, 36); ctx.fill(); ctx.restore();
      drawLines(ctx, head, HF, box.x + 40, y + 34, L.head, 'left', bw - 80); y += head.height + 110;
      if (s.body) {
        body = fit(ctx, s.body, BF, bw - 80, box.h - ctaH - (y - box.y) - 70, 48, 32, 1.32);
        var bwid = Math.min(bw, maxLineW(ctx, body, BF) + 80), bx = box.x + box.w - bwid;
        ctx.fillStyle = d.color1; rr(ctx, bx, y, bwid, body.height + 64, 36); ctx.fill();
        drawLines(ctx, body, BF, bx + 40, y + 30, on(d.color1), 'left', bw - 80);
      }
      overflow = head.overflow || (body && body.overflow);
    } else {
      var avail = box.h - ctaH;
      head = fit(ctx, s.headline, HF, box.w, avail * (s.body ? 0.5 : 0.95), role === 'hook' ? hsz + 18 : hsz, 44, 1.12);
      var gap = L.bar || L.highlight ? 70 : 44, items = null;
      if (L.checklist && role === 'point') items = String(s.body || '').replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5);
      var bodyH = avail - head.height - (s.body ? gap : 0);
      if (items && items.length) body = fitItems(ctx, items, BF, box.w - 90, bodyH);
      else body = fit(ctx, s.body, BF, box.w, Math.max(0, bodyH), role === 'hook' ? 54 : 50, 32, 1.36);
      var total = head.height + (s.body ? gap + body.height : 0);
      var y0 = L.bottom ? box.y + avail - total : L.align === 'center' ? box.y + Math.max(0, (avail - total) / 2) : box.y;
      if (L.highlight) { ctx.font = HF(head.size); head.lines.forEach(function (l, k) { var lw = ctx.measureText(l).width; ctx.fillStyle = L.highlight; ctx.fillRect(box.x - 10, y0 + head.size * (0.45 + k * head.lh), lw + 20, head.size * 0.55); }); }
      drawLines(ctx, head, HF, box.x, y0, L.head, L.align, box.w);
      var yb = y0 + head.height;
      if (L.bar && s.body) { ctx.fillStyle = L.accent; ctx.fillRect(L.align === 'center' ? box.x + box.w / 2 - 60 : box.x, yb + 26, 120, 10); }
      if (s.body) {
        if (items && items.length) drawItems(ctx, body, BF, box.x, yb + gap, L.body, L.accent);
        else drawLines(ctx, body, BF, box.x, yb + gap, L.body, L.align, box.w);
      }
      overflow = head.overflow || (s.body && body.overflow);
    }

    // hook: swipe hint · CTA: action button with the handle
    var footY = L.footerY || H - 110;
    if (role === 'hook' && n > 1) {
      var hb = L.photoBg ? d.color2 : L.accent; var hf = on(hb);
      ctx.font = '700 34px "DM Sans", Arial, sans-serif'; var sww = ctx.measureText('Swipe').width + 34 * 2.7;
      pill(ctx, 'Swipe', L.align === 'center' ? W / 2 - sww / 2 : box.x, box.y + box.h - 82, hb, hf, 34, false, true);
    }
    if (role === 'cta') {
      var label = d.cta || (d.handle ? 'Follow ' + d.handle : 'Message us today');
      ctx.font = '800 40px "DM Sans", Arial, sans-serif'; var tw = Math.min(box.w, ctx.measureText(label).width + 90);
      var bx2 = L.align === 'center' ? W / 2 - tw / 2 : box.x, by2 = box.y + box.h - 104, cb = L.photoBg ? d.color2 : L.accent;
      ctx.fillStyle = cb; rr(ctx, bx2, by2, tw, 96, 48); ctx.fill();
      ctx.fillStyle = on(cb); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; var lt = label; while (ctx.measureText(lt).width > tw - 60 && lt.length > 4) lt = lt.slice(0, -2) + '…';
      ctx.fillText(lt, bx2 + tw / 2, by2 + 50); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    // footer handle
    if (d.handle && role !== 'cta') {
      var fc = L.footerOnBg ? on(d.color1) : L.photoBg ? 'rgba(255,255,255,0.8)' : L.split ? '#6B7280' : rgba(L.head === '#FFFFFF' ? '#FFFFFF' : '#0F1E36', 0.62);
      ctx.font = '600 30px "DM Sans", Arial, sans-serif'; ctx.fillStyle = fc; ctx.textBaseline = 'alphabetic';
      if (L.align === 'center') { ctx.textAlign = 'center'; ctx.fillText(d.handle, W / 2, footY); ctx.textAlign = 'left'; } else ctx.fillText(d.handle, L.box.x, footY);
    }
    return { overflow: !!overflow };
  }
  function maxLineW(ctx, f, fontFn) { ctx.font = fontFn(f.size); var m = 0; f.lines.forEach(function (l) { m = Math.max(m, ctx.measureText(l).width); }); return m; }
  // Checklist items: each gets a tick box; shrink together to fit.
  function fitItems(ctx, items, BF, maxW, maxH) {
    for (var s = 48; s >= 30; s -= 2) {
      ctx.font = BF(s); var blocks = items.map(function (t) { return wrap(ctx, t, maxW); }), h = blocks.reduce(function (a, b) { return a + b.length * s * 1.32 + s * 0.8; }, 0);
      if (h <= maxH) return { items: blocks, size: s, height: h, overflow: false };
    }
    ctx.font = BF(30); var all = items.map(function (t) { return wrap(ctx, t, maxW); }), out = [], used = 0;
    for (var i = 0; i < all.length; i++) { var bh = all[i].length * 30 * 1.32 + 24; if (used + bh > maxH) break; out.push(all[i]); used += bh; }
    return { items: out, size: 30, height: used, overflow: true };
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
    W: W, H: H,
    TEMPLATES: ORDER.map(function (id) { return { id: id, name: T[id].name, desc: T[id].desc }; }),
    draw: draw,
  };
})();

/* Tiny ZIP writer (no compression — PNGs are already compressed). Used for "Download all". */
(function () {
  'use strict';
  var table = null;
  function crc32(u8) {
    if (!table) { table = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = table[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  // files: [{ name, data: Uint8Array }] → Blob (application/zip)
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
