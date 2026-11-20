/*
 * Auntie Tobi HQ — 🎨 Style Match carousels.
 * Show it 1–3 slides of a carousel whose look you like → AI reads the style → AI writes the slides →
 * HQ draws every slide (1080×1350) on a canvas in that style. Everything can be adjusted with a live preview,
 * styles can be saved ("My styles"), and slides download as PNGs (ZIP) or go to the 🎬 Animated maker.
 *
 * HQ calls HQStyle.init({ api, sheet, toast, esc, S, go }) once, then HQStyle.view() for the #scars page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1350, X = null;
  var FONTS = {
    inter:    { name: 'Heavy bold',         f: "'Inter Tight', 'Inter', Arial, sans-serif", w: 900, b: "'Inter', Arial, sans-serif", bw: 500, lh: 1.02 },
    anton:    { name: 'Tall condensed',     f: "'Anton', 'Inter Tight', Arial, sans-serif", w: 400, b: "'Inter', Arial, sans-serif", bw: 500, lh: 1.06 },
    poppins:  { name: 'Rounded bold',       f: "'Poppins', Arial, sans-serif", w: 800, b: "'Poppins', Arial, sans-serif", bw: 600, lh: 1.1 },
    playfair: { name: 'Elegant serif',      f: "'Playfair Display', Georgia, serif", w: 900, b: "'DM Sans', Arial, sans-serif", bw: 500, lh: 1.08 },
    archivo:  { name: 'Chunky black',       f: "'Archivo Black', Arial, sans-serif", w: 400, b: "'DM Sans', Arial, sans-serif", bw: 500, lh: 1.06 },
    caveat:   { name: 'Handwritten',        f: "'Caveat', cursive", w: 700, b: "'DM Sans', Arial, sans-serif", bw: 500, lh: 1.0, k: 1.3 },
    dmsans:   { name: 'Clean modern',       f: "'DM Sans', Arial, sans-serif", w: 700, b: "'DM Sans', Arial, sans-serif", bw: 400, lh: 1.1 },
    fraunces: { name: 'Soft serif',         f: "'Fraunces', Georgia, serif", w: 700, b: "'DM Sans', Arial, sans-serif", bw: 500, lh: 1.08 }
  };
  // a starting style in Auntie Tobi colours (used before a reference is read)
  var PRESET = { name: 'Auntie Tobi green', spec: { bg: { type: 'gradient', c1: '#057A44', c2: '#03532E', angle: 160, img: '', dim: 0.35, where: 'cover' }, ink: '#FFFFFF', sub: '#E6F4EC', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36',
    font: { head: 'poppins', body: 'dmsans', caps: false, size: 1, bodySize: 1 }, align: 'left', vpos: 'middle', hlStyle: 'bar', frame: { on: false, width: 10, color: '#FFB81C', inset: 36, radius: 0 },
    card: { on: false, color: '#FFFFFF', opacity: 0.12 }, shapes: 'circles', numbers: 'badge', pageNo: true, swipe: true, handle: { text: '@auntietobi_uk', pos: 'bottom-left' }, cover: { size: 1.25, vpos: 'middle' } } };
  var SAMPLE = [
    { kind: 'cover', title: 'Your **headline** goes here', body: 'A short line under the headline' },
    { kind: 'point', title: 'A clear **first point**', body: 'One or two short sentences that explain the point simply.' },
    { kind: 'end', title: '**Save** this for later', body: 'Share it with someone who needs it 💚' }
  ];
  var ST = null;   // { spec, name, styleId, slides, cur, caption, topic, n, bgImg (Image), bgSrc }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function state() { if (!ST) { ST = { spec: clone(PRESET.spec), name: PRESET.name, styleId: '', slides: [], cur: 0, caption: '', topic: '', n: 6, refs: [], styles: null }; } return ST; }
  function slides() { return ST.slides.length ? ST.slides : SAMPLE; }

  // ── colour helpers ──
  function rgb(h) { h = String(h || '#000000').replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }

  // ── text: **highlighted** words, wrapped to a width ──
  function tokens(text, caps) {
    var out = [];
    String(text || '').split(/(\*\*[^*]+\*\*)/).forEach(function (p) {
      if (!p) return; var hl = /^\*\*[^*]+\*\*$/.test(p); if (hl) p = p.slice(2, -2);
      if (caps) p = p.toUpperCase();
      p.split(/\s+/).forEach(function (w) { if (w) out.push({ w: w, hl: hl }); });
    });
    return out;
  }
  function wrap(ctx, toks, maxW) {
    var lines = [], line = [], lw = 0, sp = ctx.measureText(' ').width;
    toks.forEach(function (t) {
      var w = ctx.measureText(t.w).width;
      if (line.length && lw + sp + w > maxW) { lines.push({ t: line, w: lw }); line = []; lw = 0; }
      line.push({ w: t.w, hl: t.hl, ww: w }); lw += (line.length > 1 ? sp : 0) + w;
    });
    if (line.length) lines.push({ t: line, w: lw });
    return lines;
  }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ── draw one slide ──
  function draw(ctx, sl, i, n, sp, bgImg) {
    var F = FONTS[sp.font.head] || FONTS.inter, FB = FONTS[sp.font.body] || FONTS.dmsans;
    ctx.save(); ctx.clearRect(0, 0, W, H); ctx.textBaseline = 'alphabetic';
    // background
    var useImg = bgImg && sp.bg.type === 'image' && (sp.bg.where === 'all' || i === 0);
    if (sp.bg.type === 'gradient' || (sp.bg.type === 'image' && !useImg)) {
      var a = (sp.bg.angle || 0) * Math.PI / 180, dx = Math.sin(a) * W / 2, dy = -Math.cos(a) * H / 2;
      var g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy); g.addColorStop(0, sp.bg.c1); g.addColorStop(1, sp.bg.type === 'gradient' ? sp.bg.c2 : sp.bg.c1);
      ctx.fillStyle = g;
    } else ctx.fillStyle = sp.bg.c1;
    ctx.fillRect(0, 0, W, H);
    if (useImg) {
      var s = Math.max(W / bgImg.width, H / bgImg.height), iw = bgImg.width * s, ih = bgImg.height * s;
      ctx.drawImage(bgImg, (W - iw) / 2, (H - ih) / 2, iw, ih);
      var gd = ctx.createLinearGradient(0, 0, 0, H); gd.addColorStop(0, 'rgba(0,0,0,' + sp.bg.dim * 0.6 + ')'); gd.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.92, sp.bg.dim * 1.5) + ')');
      ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);
    }
    // decorations
    var ac = sp.accent; ctx.save();
    if (sp.shapes === 'circles') { ctx.fillStyle = rgba(ac, 0.16); ctx.beginPath(); ctx.arc(W - 40, 130, 210, 0, 7); ctx.fill(); ctx.fillStyle = rgba(ac, 0.1); ctx.beginPath(); ctx.arc(60, H - 90, 160, 0, 7); ctx.fill(); }
    else if (sp.shapes === 'dots') { ctx.fillStyle = rgba(ac, 0.35); for (var r = 0; r < 5; r++) for (var c = 0; c < 6; c++) { ctx.beginPath(); ctx.arc(W - 330 + c * 46, 90 + r * 46, 7, 0, 7); ctx.fill(); } }
    else if (sp.shapes === 'corner') { ctx.fillStyle = ac; ctx.beginPath(); ctx.moveTo(W, H - 300); ctx.lineTo(W, H); ctx.lineTo(W - 300, H); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(ac, 0.4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(180, 0); ctx.lineTo(0, 180); ctx.closePath(); ctx.fill(); }
    else if (sp.shapes === 'blob') { ctx.fillStyle = rgba(ac, 0.14); ctx.beginPath(); ctx.ellipse(W - 140, H - 220, 340, 260, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(120, 160, 220, 160, 0.6, 0, 7); ctx.fill(); }
    else if (sp.shapes === 'lines') { ctx.strokeStyle = rgba(ac, 0.22); ctx.lineWidth = 6; for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(W - 380 + k * 70, 0); ctx.lineTo(W, 380 - k * 70); ctx.stroke(); } }
    ctx.restore();
    // frame
    if (sp.frame.on) { ctx.save(); ctx.strokeStyle = sp.frame.color; ctx.lineWidth = sp.frame.width; var fi = sp.frame.inset + sp.frame.width / 2; rr(ctx, fi, fi, W - fi * 2, H - fi * 2, sp.frame.radius); ctx.stroke(); ctx.restore(); }
    // text block
    var pad = 96 + (sp.frame.on ? sp.frame.inset + sp.frame.width : 0), maxW = W - pad * 2, isCover = sl.kind === 'cover', isEnd = sl.kind === 'end';
    var k = (F.k || 1) * sp.font.size * (sl.size || 1) * (isCover ? sp.cover.size : 1);
    var hs = Math.round((isCover ? 84 : isEnd ? 76 : 70) * k), bs = Math.round(38 * sp.font.bodySize * (sl.size || 1));
    var headFont = function (px) { return F.w + ' ' + px + 'px ' + F.f; }, bodyFont = function (px) { return FB.bw + ' ' + px + 'px ' + FB.b; };
    var tt = tokens(sl.title, sp.font.caps), bt = tokens(sl.body, false), tl, bl, numH = 0, num = 0, total, gap;
    if (sl.kind === 'point') { num = slides().slice(0, i + 1).filter(function (x) { return x.kind === 'point'; }).length; numH = sp.numbers === 'badge' ? 120 : sp.numbers === 'pill' ? 90 : 0; }
    var limit = H - pad * 2 - 170;
    for (var tries = 0; tries < 30; tries++) {   // shrink until it fits
      ctx.font = headFont(hs); tl = wrap(ctx, tt, maxW - (sp.card.on ? 80 : 0));
      ctx.font = bodyFont(bs); bl = sl.body ? wrap(ctx, bt, maxW - (sp.card.on ? 80 : 0)) : [];
      gap = bl.length ? Math.round(hs * 0.45) : 0;
      total = numH + tl.length * hs * F.lh + gap + bl.length * bs * 1.38;
      if (total <= limit) break; hs = Math.round(hs * 0.93); bs = Math.max(26, Math.round(bs * 0.96));
    }
    var vpos = isCover ? sp.cover.vpos : sp.vpos, top = pad + 70, y0 = vpos === 'top' ? top : vpos === 'bottom' ? H - pad - 90 - total : (H - total) / 2;
    var center = sp.align === 'center', x0 = center ? W / 2 : pad + (sp.card.on ? 40 : 0);
    if (sp.card.on) { ctx.save(); ctx.fillStyle = rgba(sp.card.color, sp.card.opacity); rr(ctx, pad - 0, y0 - 50, maxW, total + 100, 28); ctx.fill(); ctx.restore(); }
    if (sp.numbers === 'big' && num) { ctx.save(); ctx.font = F.w + ' ' + 420 + 'px ' + F.f; ctx.fillStyle = rgba(ac, 0.14); ctx.textAlign = center ? 'center' : 'left'; ctx.fillText(String(num).padStart(2, '0'), center ? W / 2 : pad - 20, y0 + 300); ctx.restore(); }
    var y = y0;
    if (numH && num) {
      ctx.save();
      if (sp.numbers === 'badge') { var cx = center ? W / 2 : x0 + 46; ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(cx, y + 46, 46, 0, 7); ctx.fill(); ctx.fillStyle = lum(ac) > 0.45 ? '#111111' : '#FFFFFF'; ctx.font = '800 46px ' + "'Poppins', Arial, sans-serif"; ctx.textAlign = 'center'; ctx.fillText(String(num), cx, y + 62); }
      else { var label = 'TIP ' + String(num).padStart(2, '0'); ctx.font = '800 32px ' + "'Poppins', Arial, sans-serif"; var lw2 = ctx.measureText(label).width + 48, px = center ? W / 2 - lw2 / 2 : x0; ctx.fillStyle = ac; rr(ctx, px, y, lw2, 60, 30); ctx.fill(); ctx.fillStyle = lum(ac) > 0.45 ? '#111111' : '#FFFFFF'; ctx.textAlign = 'left'; ctx.fillText(label, px + 24, y + 42); }
      ctx.restore(); y += numH;
    }
    // headline
    ctx.font = headFont(hs); var sp1 = ctx.measureText(' ').width;
    tl.forEach(function (ln, li) {
      var base = y + hs * (li + 1) * F.lh - hs * (F.lh - 0.82), x = center ? W / 2 - ln.w / 2 : x0;
      ln.t.forEach(function (t, ti) {
        var joinNext = ln.t[ti + 1] && ln.t[ti + 1].hl, joinPrev = ti > 0 && ln.t[ti - 1].hl;   // one block across highlighted words next to each other
        if (t.hl && sp.hlStyle === 'bar') { ctx.fillStyle = sp.hl; ctx.fillRect(x - (joinPrev ? 0 : 10), base - hs * 0.84, t.ww + (joinPrev ? 0 : 10) + (joinNext ? sp1 : 10), hs * 1.02); }
        if (t.hl && sp.hlStyle === 'underline' && joinNext) { ctx.fillStyle = sp.hl; ctx.fillRect(x + t.ww, base + hs * 0.08, sp1, Math.max(6, hs * 0.1)); }
        if (t.hl && sp.hlStyle === 'brush') { ctx.save(); ctx.fillStyle = rgba(sp.hl, 0.9); ctx.beginPath(); ctx.moveTo(x - 14, base - hs * 0.42); ctx.quadraticCurveTo(x + t.ww / 2, base - hs * 0.56, x + t.ww + 16, base - hs * 0.4); ctx.lineTo(x + t.ww + 10, base + hs * 0.06); ctx.quadraticCurveTo(x + t.ww / 2, base + hs * 0.14, x - 8, base + hs * 0.04); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (t.hl && sp.hlStyle === 'underline') { ctx.fillStyle = sp.hl; ctx.fillRect(x, base + hs * 0.08, t.ww, Math.max(6, hs * 0.1)); }
        ctx.fillStyle = t.hl ? (sp.hlStyle === 'bar' || sp.hlStyle === 'brush' ? sp.hlInk : sp.hlStyle === 'none' ? sp.ink : sp.hlStyle === 'underline' ? sp.ink : sp.accent) : sp.ink;
        ctx.textAlign = 'left'; ctx.fillText(t.w, x, base); x += t.ww + sp1;
      });
    });
    y += tl.length * hs * F.lh + gap;
    // body
    ctx.font = bodyFont(bs); var sp2 = ctx.measureText(' ').width;
    bl.forEach(function (ln, li) { var x = center ? W / 2 - ln.w / 2 : x0, base = y + bs * 1.38 * li + bs; ln.t.forEach(function (t) { ctx.fillStyle = t.hl ? sp.accent : sp.sub; ctx.fillText(t.w, x, base); x += t.ww + sp2; }); });
    // handle, page number, swipe
    var small = '600 30px ' + FB.b, edge = (sp.frame.on ? sp.frame.inset + sp.frame.width : 0) + 64, quiet = useImg ? 'rgba(255,255,255,.9)' : sp.sub;
    ctx.font = small; ctx.fillStyle = quiet;
    var hp = sp.handle.pos, place = function (txt, pos) {
      ctx.textAlign = /right/.test(pos) ? 'right' : /center/.test(pos) ? 'center' : 'left';
      ctx.fillText(txt, /right/.test(pos) ? W - edge : /center/.test(pos) ? W / 2 : edge, /top/.test(pos) ? edge + 22 : H - edge + 4);
    };
    if (hp !== 'none' && sp.handle.text) place(sp.handle.text, hp);
    if (sp.pageNo) place((i + 1) + '/' + n, hp === 'top-right' ? 'top-left' : 'top-right');
    if (sp.swipe && i < n - 1) { ctx.font = '700 30px ' + FB.b; ctx.fillStyle = useImg ? '#FFFFFF' : ac; place('Swipe →', hp === 'bottom-right' ? 'bottom-center' : 'bottom-right'); }
    ctx.restore();
  }

  // ── background photo ──
  var imgCache = {};
  function bgImage(cb) {
    var src = ST.bgSrc || (ST.spec.bg.img ? '/.netlify/functions/app-content?img=' + encodeURIComponent(ST.spec.bg.img) : '');
    if (!src || ST.spec.bg.type !== 'image') return cb(null);
    if (imgCache[src] && imgCache[src].complete) return cb(imgCache[src]);
    var im = new Image(); im.onload = function () { imgCache[src] = im; cb(im); }; im.onerror = function () { cb(null); }; im.src = src;
  }
  function render(canvas, i, cb) {
    var list = slides(); bgImage(function (im) { draw(canvas.getContext('2d'), list[i], i, list.length, ST.spec, im); if (cb) cb(); });
  }

  // ── the page ──
  function view() {
    state();
    $('#ttl').textContent = 'Style Match';
    $('#topRight').innerHTML = '<button class="btn ghost" id="scMy">📂 My styles</button> <button class="btn ghost" id="scSave">💾 Save style</button> <button class="btn ghost" id="scAnim">🎬 To Animated maker</button> <button class="btn primary" id="scDl">⬇️ Download PNGs</button>';
    var sp = ST.spec, list = slides(), cur = Math.min(ST.cur, list.length - 1); ST.cur = cur;
    var fontOpts = function (v) { return Object.keys(FONTS).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + FONTS[k].name + '</option>'; }).join(''); };
    var seg = function (key, opts, val) { return '<div class="scseg">' + opts.map(function (o) { return '<button data-seg="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    var col = function (key, label, val) { return '<label class="sccol"><input type="color" data-col="' + key + '" value="' + val + '"><span>' + label + '</span></label>'; };
    var sl = list[cur];
    $('#view').innerHTML = '<div class="wrap scwrap">' +
      '<div class="card scstart">' +
        '<div class="scstep"><b>1 · The style</b> <span class="muted">— now: <b>' + esc(ST.name) + '</b></span></div>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label class="btn ghost sm" style="margin:0">📷 Upload 1–3 reference slides<input type="file" id="scRef" accept="image/jpeg,image/png,image/webp" multiple hidden></label>' +
        '<span id="scRefs" class="screfs">' + ST.refs.map(function (r, i) { return '<img src="' + r + '" alt="">'; }).join('') + '</span>' +
        (ST.refs.length ? '<button class="btn primary sm" id="scRead">🔍 Read this style</button><button class="link" id="scRefX">Clear</button>' : '') +
        '<span class="muted" style="font-size:12.5px">or</span><button class="btn ghost sm" id="scMy2">📂 Use a saved style</button><button class="btn ghost sm" id="scPreset">💚 Auntie Tobi style</button></div>' +
        '<div class="scstep" style="margin-top:12px"><b>2 · The words</b></div>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-start"><textarea id="scTopic" rows="2" style="flex:1;min-width:240px" placeholder="What is the carousel about? A topic, or paste your notes / an idea from Weekly ideas…">' + esc(ST.topic) + '</textarea>' +
        '<select id="scN" style="width:auto">' + [4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option value="' + n + '"' + (n === ST.n ? ' selected' : '') + '>' + n + ' slides</option>'; }).join('') + '</select>' +
        '<button class="btn primary" id="scWrite">✨ Write the slides</button></div>' +
        (ST.slides.length ? '' : '<p class="muted" style="font-size:12.5px;margin:6px 0 0">Until you write the slides, the preview shows sample words so you can see the style.</p>') +
      '</div>' +
      '<div class="scgrid">' +
        '<div><canvas id="scCv" width="' + W + '" height="' + H + '" class="sccv"></canvas>' +
          '<div class="scthumbs">' + list.map(function (x, i) { return '<button data-th="' + i + '" aria-pressed="' + (i === cur) + '"><canvas width="' + W + '" height="' + H + '"></canvas><span>' + (i + 1) + '</span></button>'; }).join('') + (ST.slides.length ? '<button class="scadd" id="scAdd" title="Add a slide">＋</button>' : '') + '</div>' +
          (ST.caption ? '<details class="card" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">✍️ Caption</summary><textarea id="scCap" rows="6" style="margin-top:8px">' + esc(ST.caption) + '</textarea><button class="btn ghost sm" id="scCapCp" style="margin-top:6px">📋 Copy caption</button></details>' : '') +
        '</div>' +
        '<div class="scpanel">' +
          '<details open class="scsec"><summary>✏️ This slide (' + (cur + 1) + ' of ' + list.length + ')</summary>' +
            (ST.slides.length ? '<label>Headline <span class="muted" style="font-weight:400">— put **stars** round words to highlight them</span></label><textarea id="scT" rows="2">' + esc(sl.title) + '</textarea><label>Text under it</label><textarea id="scB" rows="3">' + esc(sl.body || '') + '</textarea>' +
              '<label>Text size on this slide</label><input type="range" id="scSz" min="0.6" max="1.5" step="0.05" value="' + (sl.size || 1) + '">' +
              '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn ghost sm" id="scUp"' + (cur ? '' : ' disabled') + '>◀ Move left</button><button class="btn ghost sm" id="scDown"' + (cur < list.length - 1 ? '' : ' disabled') + '>Move right ▶</button><button class="btn ghost sm" id="scDel"' + (list.length > 2 ? '' : ' disabled') + '>🗑 Delete slide</button></div>'
              : '<p class="muted" style="font-size:13px">Write the slides first (step 2), then edit each one here.</p>') +
          '</details>' +
          '<details open class="scsec"><summary>🎨 Colours</summary><div class="sccols">' + col('bg.c1', 'Background', sp.bg.c1) + col('bg.c2', 'Background 2', sp.bg.c2) + col('ink', 'Headline', sp.ink) + col('sub', 'Small text', sp.sub) + col('accent', 'Accent', sp.accent) + col('hl', 'Highlight', sp.hl) + col('hlInk', 'On highlight', sp.hlInk) + '</div>' +
            '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><span class="muted" style="font-size:12.5px;align-self:center">Quick swap:</span><button class="btn ghost sm" data-pal="green">💚 Green</button><button class="btn ghost sm" data-pal="navy">Navy</button><button class="btn ghost sm" data-pal="gold">Gold</button><button class="btn ghost sm" data-pal="white">White</button></div></details>' +
          '<details class="scsec"><summary>🔤 Text</summary><label>Headline font</label><select data-sel="font.head">' + fontOpts(sp.font.head) + '</select><label>Small text font</label><select data-sel="font.body">' + fontOpts(sp.font.body) + '</select>' +
            '<label>Headline size</label><input type="range" data-rng="font.size" min="0.6" max="1.6" step="0.05" value="' + sp.font.size + '"><label>Small text size</label><input type="range" data-rng="font.bodySize" min="0.6" max="1.6" step="0.05" value="' + sp.font.bodySize + '">' +
            '<label>Cover headline size</label><input type="range" data-rng="cover.size" min="0.7" max="1.8" step="0.05" value="' + sp.cover.size + '">' +
            '<label class="sccheck"><input type="checkbox" data-chk="font.caps"' + (sp.font.caps ? ' checked' : '') + '> ALL CAPITALS headlines</label>' +
            '<label>Highlighted words</label>' + seg('hlStyle', [['color', 'Colour'], ['bar', 'Block'], ['brush', 'Brush'], ['underline', 'Underline'], ['none', 'None']], sp.hlStyle) + '</details>' +
          '<details class="scsec"><summary>📐 Layout</summary><label>Line up</label>' + seg('align', [['left', '⬅ Left'], ['center', '↔ Centre']], sp.align) +
            '<label>Where the text sits</label>' + seg('vpos', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], sp.vpos) + '<label>Cover text sits</label>' + seg('cover.vpos', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], sp.cover.vpos) +
            '<label>Numbers on point slides</label>' + seg('numbers', [['badge', '① Circle'], ['pill', 'TIP 01'], ['big', 'Big faded'], ['none', 'None']], sp.numbers) +
            '<label class="sccheck"><input type="checkbox" data-chk="card.on"' + (sp.card.on ? ' checked' : '') + '> Text inside a box</label>' + (sp.card.on ? '<div class="sccols">' + col('card.color', 'Box colour', sp.card.color) + '</div><label>Box see-through</label><input type="range" data-rng="card.opacity" min="0.1" max="1" step="0.05" value="' + sp.card.opacity + '">' : '') + '</details>' +
          '<details class="scsec"><summary>✨ Decorations</summary><label>Shapes</label>' + seg('shapes', [['none', 'None'], ['circles', 'Circles'], ['dots', 'Dots'], ['corner', 'Corner'], ['blob', 'Blobs'], ['lines', 'Lines']], sp.shapes) +
            '<label class="sccheck"><input type="checkbox" data-chk="frame.on"' + (sp.frame.on ? ' checked' : '') + '> Frame round the slide</label>' + (sp.frame.on ? '<div class="sccols">' + col('frame.color', 'Frame colour', sp.frame.color) + '</div><label>Frame thickness</label><input type="range" data-rng="frame.width" min="2" max="40" step="1" value="' + sp.frame.width + '"><label>Frame distance from edge</label><input type="range" data-rng="frame.inset" min="0" max="80" step="2" value="' + sp.frame.inset + '"><label>Frame corners</label><input type="range" data-rng="frame.radius" min="0" max="60" step="2" value="' + sp.frame.radius + '">' : '') +
            '<label class="sccheck"><input type="checkbox" data-chk="pageNo"' + (sp.pageNo ? ' checked' : '') + '> Slide numbers (2/7)</label><label class="sccheck"><input type="checkbox" data-chk="swipe"' + (sp.swipe ? ' checked' : '') + '> “Swipe →”</label></details>' +
          '<details class="scsec"><summary>🖼️ Background</summary>' + seg('bg.type', [['solid', 'Plain'], ['gradient', 'Gradient'], ['image', 'Photo']], sp.bg.type) +
            (sp.bg.type === 'gradient' ? '<label>Gradient direction</label><input type="range" data-rng="bg.angle" min="0" max="360" step="5" value="' + sp.bg.angle + '">' : '') +
            (sp.bg.type === 'image' ? '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><label class="btn ghost sm" style="margin:0">📷 Upload photo<input type="file" id="scBgF" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn ghost sm" id="scBgAi">✨ AI picture (about 4p)</button></div>' +
              '<label>Photo on</label>' + seg('bg.where', [['cover', 'Cover only'], ['all', 'Every slide']], sp.bg.where || 'cover') + '<label>Darken the photo</label><input type="range" data-rng="bg.dim" min="0" max="0.85" step="0.05" value="' + sp.bg.dim + '">' : '') + '</details>' +
          '<details class="scsec"><summary>@ Handle</summary><input id="scH" value="' + esc(sp.handle.text) + '">' + seg('handle.pos', [['top-left', '↖'], ['top-right', '↗'], ['bottom-left', '↙'], ['bottom-center', '↓'], ['bottom-right', '↘'], ['none', 'Hide']], sp.handle.pos) + '</details>' +
        '</div></div></div>';
    paint(true); bind();
  }
  var tPaint = null;
  function paint(all) {
    render($('#scCv'), ST.cur);
    clearTimeout(tPaint);
    tPaint = setTimeout(function () { $$('[data-th] canvas').forEach(function (c, i) { if (all || i === ST.cur) render(c, i); }); }, all ? 0 : 200);
  }
  function setPath(o, path, v) { var p = path.split('.'), t = o; for (var i = 0; i < p.length - 1; i++) t = t[p[i]] = t[p[i]] || {}; t[p[p.length - 1]] = v; }
  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a && a[k]; }, o); }
  var PAL = { green: { bg: ['#057A44', '#03532E'], ink: '#FFFFFF', sub: '#E6F4EC', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36' }, navy: { bg: ['#0F1E36', '#1F3560'], ink: '#FFFFFF', sub: '#C9D1DE', accent: '#FFB81C', hl: '#FFB81C', hlInk: '#0F1E36' },
    gold: { bg: ['#FFB81C', '#F08C00'], ink: '#0F1E36', sub: '#1F2937', accent: '#057A44', hl: '#FFFFFF', hlInk: '#0F1E36' }, white: { bg: ['#FFFFFF', '#F3F5F7'], ink: '#111111', sub: '#3F4A5C', accent: '#057A44', hl: '#FFD25E', hlInk: '#111111' } };

  function bind() {
    var sp = ST.spec;
    $$('[data-col]').forEach(function (i) { i.oninput = function () { setPath(sp, i.dataset.col, i.value.toUpperCase()); paint(); }; });
    $$('[data-rng]').forEach(function (i) { i.oninput = function () { setPath(sp, i.dataset.rng, Number(i.value)); paint(); }; });
    $$('[data-sel]').forEach(function (i) { i.onchange = function () { setPath(sp, i.dataset.sel, i.value); fontsReady(function () { paint(true); }); }; });
    $$('[data-chk]').forEach(function (i) { i.onchange = function () { setPath(sp, i.dataset.chk, i.checked); keep(view); }; });
    $$('[data-seg]').forEach(function (b) { b.onclick = function () { setPath(sp, b.dataset.seg, b.dataset.v); keep(view); }; });
    $$('[data-pal]').forEach(function (b) { b.onclick = function () { var p = PAL[b.dataset.pal]; sp.bg.c1 = p.bg[0]; sp.bg.c2 = p.bg[1]; ['ink', 'sub', 'accent', 'hl', 'hlInk'].forEach(function (k) { sp[k] = p[k]; }); if (sp.frame.on) sp.frame.color = p.accent; keep(view); }; });
    $$('[data-th]').forEach(function (b) { b.onclick = function () { ST.cur = +b.dataset.th; keep(view); }; });
    if ($('#scH')) $('#scH').oninput = function () { sp.handle.text = this.value; paint(true); };
    $('#scTopic').oninput = function () { ST.topic = this.value; };
    $('#scN').onchange = function () { ST.n = +this.value; };
    if ($('#scT')) {
      $('#scT').oninput = function () { ST.slides[ST.cur].title = this.value; paint(); };
      $('#scB').oninput = function () { ST.slides[ST.cur].body = this.value; paint(); };
      $('#scSz').oninput = function () { ST.slides[ST.cur].size = Number(this.value); paint(); };
      $('#scUp').onclick = function () { var a = ST.slides, c = ST.cur; a.splice(c - 1, 0, a.splice(c, 1)[0]); ST.cur--; fixKinds(); keep(view); };
      $('#scDown').onclick = function () { var a = ST.slides, c = ST.cur; a.splice(c + 1, 0, a.splice(c, 1)[0]); ST.cur++; fixKinds(); keep(view); };
      $('#scDel').onclick = function () { if (!confirm('Delete this slide?')) return; ST.slides.splice(ST.cur, 1); ST.cur = Math.max(0, ST.cur - 1); fixKinds(); keep(view); };
    }
    if ($('#scAdd')) $('#scAdd').onclick = function () { ST.slides.splice(ST.slides.length - 1, 0, { kind: 'point', title: 'A new **point**', body: 'Write it here.' }); ST.cur = ST.slides.length - 2; fixKinds(); keep(view); };
    if ($('#scCap')) { $('#scCap').oninput = function () { ST.caption = this.value; }; $('#scCapCp').onclick = function () { copy(ST.caption, 'Caption copied'); }; }
    $('#scRef').onchange = async function () { var fs = [].slice.call(this.files || []).slice(0, 3); ST.refs = []; for (var i = 0; i < fs.length; i++) { try { ST.refs.push(await shrink(fs[i], 1100)); } catch (e) { X.toast(e.message); } } view(); };
    if ($('#scRefX')) $('#scRefX').onclick = function () { ST.refs = []; view(); };
    if ($('#scRead')) $('#scRead').onclick = readStyle;
    $('#scPreset').onclick = function () { ST.spec = clone(PRESET.spec); ST.name = PRESET.name; ST.styleId = ''; ST.bgSrc = ''; view(); };
    $('#scMy').onclick = $('#scMy2').onclick = mySheet;
    $('#scSave').onclick = saveSheet;
    $('#scWrite').onclick = writeSlides;
    $('#scDl').onclick = download;
    $('#scAnim').onclick = toAnimated;
    if ($('#scBgF')) $('#scBgF').onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { ST.bgSrc = await shrink(f, 1600); sp.bg.img = ''; paint(true); X.toast('Photo added'); } catch (e) { X.toast(e.message); } this.value = ''; };
    if ($('#scBgAi')) $('#scBgAi').onclick = async function () {
      var b = this, t = (slides()[0].title || ST.topic || '').replace(/\*\*/g, ''); if (!t) return X.toast('Write the slides first');
      b.disabled = true; b.textContent = '🎨 Creating… (about 20 seconds)';
      try { var r = await X.api('app-picture', { kind: 'carousel', title: t, body: ST.topic.slice(0, 300) }); ST.bgSrc = await shrink(r.image, 1600); sp.bg.img = ''; paint(true); } catch (e) { X.toast(e.message); }
      b.disabled = false; b.textContent = '✨ AI picture (about 4p)';
    };
  }
  // re-draw the page but keep the panel's scroll position and open sections
  function keep(fn) {
    var p = $('.scpanel'), top = p ? p.scrollTop : 0, open = $$('.scsec').map(function (d) { return d.open; }), wy = window.scrollY;
    fn(); var p2 = $('.scpanel'); if (p2) p2.scrollTop = top; $$('.scsec').forEach(function (d, i) { if (open[i] !== undefined) d.open = open[i]; }); window.scrollTo(0, wy);
  }
  function fixKinds() { ST.slides.forEach(function (s, i, a) { s.kind = i === 0 ? 'cover' : i === a.length - 1 ? 'end' : 'point'; }); }
  function fontsReady(cb) { try { if (document.fonts && document.fonts.ready) { var F = FONTS[ST.spec.font.head], B = FONTS[ST.spec.font.body]; Promise.all([document.fonts.load(F.w + ' 60px ' + F.f), document.fonts.load(B.bw + ' 30px ' + B.b)]).then(cb, cb); return; } } catch (e) {} cb(); }
  function copy(t, msg) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { X.toast(msg); }, function () { prompt('Copy this:', t); }); }
  function shrink(src, max) {
    return new Promise(function (ok, no) {
      var go = function (url) { var im = new Image(); im.onload = function () { var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.86)); }; im.onerror = function () { no(new Error('That image couldn’t be opened.')); }; im.src = url; };
      if (typeof src === 'string') return go(src);
      var r = new FileReader(); r.onload = function () { go(r.result); }; r.onerror = function () { no(new Error('That file couldn’t be read.')); }; r.readAsDataURL(src);
    });
  }

  async function readStyle() {
    var b = $('#scRead'); b.disabled = true; b.textContent = '🔍 Reading the style… (about 15 seconds)';
    try { var r = await X.api('sc-analyze', { images: ST.refs }); ST.spec = r.spec; ST.spec.bg.where = 'cover'; ST.name = r.name; ST.styleId = ''; ST.bgSrc = ''; fontsReady(function () { view(); X.toast('🎨 Style read: ' + r.name + ' — adjust anything in the panel'); }); }
    catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '🔍 Read this style'; }
  }
  async function writeSlides() {
    var b = $('#scWrite'); if ((ST.topic || '').trim().length < 4) return X.toast('Tell Auntie Tobi what the carousel is about first');
    if (ST.slides.length && !confirm('Write new slides? Your current words will be replaced (the style stays).')) return;
    b.disabled = true; b.textContent = '✨ Writing… (about 15 seconds)';
    try { var r = await X.api('sc-write', { topic: ST.topic, slides: ST.n }); ST.slides = r.slides; ST.caption = r.caption; ST.cur = 0; fontsReady(view); }
    catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '✨ Write the slides'; }
  }
  async function loadStyles() { if (!ST.styles) ST.styles = (await X.api('sc-styles')).styles; return ST.styles; }
  async function mySheet() {
    var list; try { list = await loadStyles(); } catch (e) { return X.toast(e.message); }
    var s = X.sheet('<h2>📂 My styles</h2><p class="muted" style="margin:4px 0 10px">Pick a saved style — your words stay, only the look changes.</p><div id="msL"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="msX">Close</button></div>');
    function paintL() {
      $('#msL', s).innerHTML = list.length ? list.map(function (x) { var sp = x.spec; return '<div class="msrow"><span class="mssw" style="background:linear-gradient(135deg,' + sp.bg.c1 + ',' + sp.bg.c2 + ')"><i style="background:' + sp.accent + '"></i></span><div style="flex:1;min-width:0"><b>' + esc(x.name) + '</b><div class="muted" style="font-size:12px">' + esc((FONTS[sp.font.head] || {}).name || '') + ' · saved ' + esc(new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '</div></div><button class="btn primary sm" data-use="' + x.id + '">Use</button><button class="btn ghost sm" data-del="' + x.id + '">🗑</button></div>'; }).join('') : '<p class="muted">No saved styles yet. Read a reference or adjust a style, then tap 💾 Save style.</p>';
      $$('[data-use]', s).forEach(function (b) { b.onclick = function () { var x = list.filter(function (y) { return y.id === b.dataset.use; })[0]; ST.spec = clone(x.spec); ST.name = x.name; ST.styleId = x.id; ST.bgSrc = ''; s.remove(); fontsReady(view); }; });
      $$('[data-del]', s).forEach(function (b) { b.onclick = async function () { if (!confirm('Delete this saved style?')) return; try { list = ST.styles = (await X.api('sc-style-del', { id: b.dataset.del })).styles; paintL(); } catch (e) { X.toast(e.message); } }; });
    }
    paintL(); $('#msX', s).onclick = function () { s.remove(); };
  }
  function saveSheet() {
    var s = X.sheet('<h2>💾 Save this style</h2><p class="muted" style="margin:4px 0 10px">Saves the look (colours, fonts, layout, decorations' + (ST.spec.bg.type === 'image' ? ', and the photo' : '') + ') — not the words.</p><label>Name</label><input id="ssN" maxlength="40" value="' + esc(ST.name) + '">' +
      (ST.styleId ? '<label class="sccheck"><input type="checkbox" id="ssNew"> Save as a new style (keep the old one)</label>' : '') +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="ssX">Cancel</button><button class="btn primary" id="ssS">Save</button></div>');
    $('#ssX', s).onclick = function () { s.remove(); };
    $('#ssS', s).onclick = async function () {
      var b = this; b.disabled = true;
      try {
        if (ST.bgSrc && ST.spec.bg.type === 'image') { var ri = await X.api('app-img', { image: ST.bgSrc }); ST.spec.bg.img = ri.imgId; imgCache['/.netlify/functions/app-content?img=' + ri.imgId] = imgCache[ST.bgSrc]; ST.bgSrc = ''; }
        var r = await X.api('sc-style-save', { id: ST.styleId && !($('#ssNew', s) && $('#ssNew', s).checked) ? ST.styleId : '', name: $('#ssN', s).value, spec: ST.spec });
        ST.styleId = r.style.id; ST.name = r.style.name; ST.styles = r.styles; s.remove(); X.toast('💾 Saved to My styles'); view();
      } catch (e) { X.toast(e.message); b.disabled = false; }
    };
  }
  function needSlides() { if (!ST.slides.length) { X.toast('Write the slides first (step 2)'); return true; } return false; }
  function loadZip() { return window.JSZip ? Promise.resolve() : new Promise(function (ok, no) { var t = document.createElement('script'); t.src = '/vendor/jszip-3.10.2.min.js'; t.onload = ok; t.onerror = function () { no(new Error('Couldn’t load the zip tool — try again.')); }; document.head.appendChild(t); }); }
  async function download() {
    if (needSlides()) return;
    var b = $('#scDl'); b.disabled = true; b.textContent = '⏳ Making PNGs…';
    try {
      await loadZip(); await new Promise(fontsReady);
      var zip = new window.JSZip(), c = document.createElement('canvas'); c.width = W; c.height = H;
      var name = (ST.slides[0].title || 'carousel').replace(/\*\*/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'carousel';
      for (var i = 0; i < ST.slides.length; i++) { await new Promise(function (ok) { render(c, i, ok); }); var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/png'); }); zip.file(name + '-' + String(i + 1).padStart(2, '0') + '.png', blob); }
      if (ST.caption) zip.file('caption.txt', ST.caption);
      var z = await zip.generateAsync({ type: 'blob' }), a = document.createElement('a'); a.href = URL.createObjectURL(z); a.download = name + '.zip'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      X.toast('⬇️ Downloaded ' + ST.slides.length + ' slides');
    } catch (e) { X.toast(e.message); }
    b.disabled = false; b.textContent = '⬇️ Download PNGs';
  }
  // 🎬 hand the words to the Animated maker (it uses its own animated designs; the closest colour theme is picked)
  async function toAnimated() {
    if (needSlides()) return;
    var c1 = ST.spec.bg.c1, l = lum(c1), r = rgb(c1), theme = l > 0.75 ? (r[0] > r[2] + 10 ? 'cream' : 'white') : (r[1] > r[0] + 20 && r[1] > r[2]) ? 'green' : (r[0] > 200 && r[1] > 120 && r[2] < 90) ? 'gold' : (r[2] > r[1] + 30 && r[0] > r[1]) ? 'purple' : 'navy';
    var item = { title: ST.slides[0].title.replace(/\*\*/g, '').slice(0, 120), theme: theme, anim: 'pop', handle: ST.spec.handle.text, caption: ST.caption,
      slides: ST.slides.map(function (s) { return { layout: s.kind === 'cover' ? 'cover' : s.kind === 'end' ? 'cta' : 'points', title: s.title, text: s.body || '' }; }) };
    try { await X.api('car-save', { item: item }); X.toast('🎬 Added to the Animated maker'); if (X.go) X.go('cars'); } catch (e) { X.toast(e.message); }
  }

  function init(x) {
    X = x;
    var css = document.createElement('style');
    css.textContent = '.scwrap{max-width:1280px}.scstart{margin-bottom:12px}.scstep{font-size:14px;margin-bottom:8px}.screfs{display:inline-flex;gap:6px}.screfs img{height:54px;border-radius:6px;border:1px solid var(--line)}' +
      '.scgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.sccv{width:100%;max-width:520px;height:auto;display:block;margin:0 auto;border-radius:12px;box-shadow:0 6px 24px rgba(15,30,54,.18);background:#eee}' +
      '.scthumbs{display:flex;gap:8px;overflow-x:auto;padding:10px 2px;justify-content:center;flex-wrap:wrap}.scthumbs button{position:relative;border:2px solid transparent;border-radius:8px;padding:0;background:none;cursor:pointer;width:72px}.scthumbs button[aria-pressed=true]{border-color:var(--green,#057A44)}.scthumbs canvas{width:100%;height:auto;display:block;border-radius:6px}.scthumbs span{position:absolute;bottom:2px;right:4px;font-size:11px;font-weight:800;background:rgba(15,30,54,.75);color:#fff;border-radius:6px;padding:0 5px}.scadd{width:72px;height:90px;border:2px dashed var(--line);border-radius:8px;background:none;font-size:26px;cursor:pointer;color:var(--muted)}' +
      '.scpanel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:6px 14px;max-height:calc(100vh - 140px);overflow:auto;position:sticky;top:12px}.scsec{border-bottom:1px solid var(--line);padding:8px 0}.scsec:last-child{border-bottom:0}.scsec summary{cursor:pointer;font-weight:800;font-size:14px;padding:4px 0}.scsec label{display:block;font-size:12.5px;font-weight:700;margin:8px 0 3px}.scsec input[type=range]{width:100%}' +
      '.sccols{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}.sccol{display:flex!important;align-items:center;gap:6px;margin:0!important;font-weight:600!important}.sccol input{width:34px;height:30px;padding:0;border:1px solid var(--line);border-radius:6px;background:none}' +
      '.scseg{display:flex;flex-wrap:wrap;gap:4px}.scseg button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:5px 9px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}.scseg button[aria-pressed=true]{background:#0F1E36;color:#fff;border-color:#0F1E36}.sccheck{display:flex!important;gap:8px;align-items:center;font-weight:600!important}.sccheck input{width:16px;height:16px}' +
      '.msrow{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.mssw{width:46px;height:46px;border-radius:10px;position:relative;flex-shrink:0;border:1px solid var(--line)}.mssw i{position:absolute;right:5px;bottom:5px;width:14px;height:14px;border-radius:50%}' +
      '@media (max-width:900px){.scgrid{grid-template-columns:1fr}.scpanel{position:static;max-height:none}}';
    document.head.appendChild(css);
  }

  window.HQStyle = { init: init, view: view, draw: draw, W: W, H: H, FONTS: FONTS };
})();
