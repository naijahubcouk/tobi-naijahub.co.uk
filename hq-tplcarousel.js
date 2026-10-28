/*
 * Auntie Tobi HQ — 📝 Template Carousel.
 * The white "bold headline" template: thin green frame, big black capitals with **green** words,
 * an optional gold brush stroke and the 🇬🇧 flag. AI (or a quick paste) makes every slide at once,
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
  var KINDS = { cover: '🎯 Cover', tip: '📌 Tip / point', end: '💚 Save & share' };
  var X = null;

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // ── heading text: CAPITALS, **green** words, line breaks kept ──
  function richWords(text, greenLine) {
    text = String(text || '');
    if (greenLine && text.indexOf('\n') < 0) { var gi = text.indexOf('**'); if (gi > 0) text = text.slice(0, gi).replace(/\s+$/, '') + '\n' + text.slice(gi); }
    var paras = text.toUpperCase().split('\n'), out = [];
    paras.forEach(function (p, pi) {
      var words = [];
      p.split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
        if (!part) return;
        var g = /^\*\*[^*]+\*\*$/.test(part); if (g) part = part.slice(2, -2);
        part.split(/\s+/).forEach(function (w) { if (w) words.push({ w: w, g: g }); });
      });
      out.push(words);
    });
    return out;
  }
  function setH(ctx, size) {
    ctx.font = '900 ' + size + 'px ' + FH;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (-size * 0.03).toFixed(1) + 'px';
  }
  function setB(ctx, size, weight) {
    ctx.font = (weight || 500) + ' ' + size + 'px ' + FB;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  // lines carry their own size: a short green last line (cover / end) may shrink a little to stay on one line
  function wrapPara(ctx, words, maxW, size) {
    setH(ctx, size);
    var sp = ctx.measureText(' ').width, lines = [], line = [], lw = 0, tooWide = false;
    words.forEach(function (t) {
      var ww = ctx.measureText(t.w).width; if (ww > maxW) tooWide = true;
      if (line.length && lw + sp + ww > maxW) { lines.push({ words: line, w: lw, size: size, sp: sp }); line = []; lw = 0; }
      line.push({ w: t.w, g: t.g, width: ww }); lw += (line.length > 1 ? sp : 0) + ww;
    });
    if (line.length) lines.push({ words: line, w: lw, size: size, sp: sp });
    return { lines: lines, tooWide: tooWide };
  }
  function layout(ctx, paras, maxW, size, greenLine) {
    var lines = [], tooWide = false;
    paras.forEach(function (words, pi) {
      var r = wrapPara(ctx, words, maxW, size);
      var shortGreen = greenLine && pi === paras.length - 1 && paras.length > 1 && words.length <= 4 && words.every(function (t) { return t.g; });
      if (shortGreen && r.lines.length > 1) {
        for (var s2 = size - 2; s2 >= size * 0.72; s2 -= 2) { var r2 = wrapPara(ctx, words, maxW, s2); if (r2.lines.length === 1) { r = r2; break; } }
      }
      if (words.length > 2 && r.lines.length > 1 && r.lines[r.lines.length - 1].words.length === 1) {
        // avoid one lonely word on the last line: try a slightly smaller size
        for (var s3 = size - 2; s3 >= size * 0.8; s3 -= 2) { var r3 = wrapPara(ctx, words, maxW, s3); if (r3.lines[r3.lines.length - 1].words.length > 1) { r = r3; break; } }
      }
      tooWide = tooWide || r.tooWide; lines = lines.concat(r.lines);
    });
    var h = lines.reduce(function (n, ln) { return n + ln.size * 0.98; }, 0);
    return { lines: lines, tooWide: tooWide, h: h };
  }
  function fitHeading(ctx, text, maxW, maxH, maxSize, minSize, greenLine) {
    var paras = richWords(text, greenLine), size = maxSize, r;
    for (; size >= minSize; size -= 3) { r = layout(ctx, paras, maxW, size, greenLine); if (!r.tooWide && r.h <= maxH) break; }
    size = Math.max(size, minSize); r = layout(ctx, paras, maxW, size, greenLine);
    r.size = size; r.over = r.tooWide || r.h > maxH + 1;
    return r;
  }
  function drawHeading(ctx, r, x, y, align, maxW) {
    ctx.textBaseline = 'alphabetic';
    var right = x, yy = y;
    r.lines.forEach(function (ln) {
      setH(ctx, ln.size);
      var lx = align === 'left' ? x : x + (maxW - ln.w) / 2, by = yy + ln.size * 0.8;
      ln.words.forEach(function (t, k) { ctx.fillStyle = t.g ? GREEN : INK; ctx.fillText(t.w, lx, by); lx += t.width + (k < ln.words.length - 1 ? ln.sp : 0); });
      right = Math.max(right, lx); yy += ln.size * 0.98;
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
  function fitBody(ctx, text, maxW, maxH, weight) {
    var size = 46, lines;
    for (; size >= 28; size -= 2) { setB(ctx, size, weight); lines = wrapPlain(ctx, text, maxW); if (lines.length * size * 1.42 <= maxH) break; }
    size = Math.max(size, 28); setB(ctx, size, weight); lines = wrapPlain(ctx, text, maxW);
    return { size: size, lines: lines, lh: size * 1.42, h: lines.length * size * 1.42, over: lines.length * size * 1.42 > maxH + 1 };
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
  function flagUK(ctx, x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
    function diag(col, lw) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); }
    diag('#FFFFFF', h * 0.2); diag('#C8102E', h * 0.07);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); ctx.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
    ctx.fillStyle = '#C8102E'; ctx.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); ctx.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
    ctx.restore();
  }
  var DECO_H = 58;
  function deco(ctx, right, y, left, withBrush) {
    var fw = 82, fh = 56, ukx = right - fw;
    flagUK(ctx, ukx, y, fw, fh);
    if (withBrush) { var bw = Math.min(480, ukx - 28 - left); if (bw > 120) brush(ctx, ukx - 28 - bw, y + fh / 2 - 6, bw); }
  }

  // ── one slide ──
  var L = 112, R = W - 112, CW = R - L, TOP = 120, BOT = H - 150;
  function tipNumber(car, i) { var n = 0; for (var k = 0; k <= i; k++) if (car.slides[k].kind === 'tip') n++; return n; }
  function draw(ctx, car, i) {
    var sl = car.slides[i] || { kind: 'tip', heading: '', body: '' }, over = false;
    var align = sl.align === 'left' ? 'left' : 'center';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = FRAME; ctx.lineWidth = 6; ctx.strokeRect(37, 37, W - 74, H - 74);
    ctx.textAlign = 'left';
    var availH = BOT - TOP, blockH, y, hr, br, right;
    if (sl.kind === 'tip') {
      var num = car.numbers !== false ? pad(tipNumber(car, i)) : '', numSize = 180;
      var bodyMax = sl.body ? 380 : 0;
      hr = fitHeading(ctx, sl.heading, CW, availH - (num ? numSize + 20 : 0) - (bodyMax ? bodyMax + 34 : 0) - DECO_H - 44, 118, 54);
      br = sl.body ? fitBody(ctx, sl.body, CW, bodyMax, 500) : null;
      blockH = (num ? numSize * 0.86 + 22 : 0) + hr.h + (br ? 34 + br.h : 0) + 44 + DECO_H;
      y = TOP + Math.max(0, (availH - blockH) / 2);
      if (num) { setH(ctx, numSize); ctx.fillStyle = GREEN; var nw = ctx.measureText(num).width; ctx.fillText(num, align === 'left' ? L - 6 : L + (CW - nw) / 2, y + numSize * 0.8); y += numSize * 0.86 + 22; }
      right = drawHeading(ctx, hr, L, y, align, CW); y += hr.h;
      if (br) { y += 34; setB(ctx, br.size, 500); ctx.fillStyle = BODY; br.lines.forEach(function (ln, k) { var lw = ctx.measureText(ln).width; ctx.fillText(ln, align === 'left' ? L : L + (CW - lw) / 2, y + k * br.lh + br.size); }); y += br.h; over = over || br.over; }
      deco(ctx, align === 'left' ? R : Math.max(right, L + CW / 2 + 240), y + 44, L, car.brush !== false);
    } else {
      var isEnd = sl.kind === 'end';
      br = sl.body ? fitBody(ctx, sl.body, CW, 200, 700) : null;
      var WL = 74, WCW = W - 2 * WL;
      hr = fitHeading(ctx, sl.heading, WCW, availH - DECO_H - 40 - (br ? br.h + 40 : 0) - 40, isEnd ? 132 : 140, 60, true);
      blockH = hr.h + 40 + DECO_H + (br ? 40 + br.h : 0);
      y = TOP + Math.max(0, (availH - blockH) / 2) - (isEnd ? 0 : 20);
      right = drawHeading(ctx, hr, align === 'left' ? L : WL, y, align, align === 'left' ? CW : WCW); y += hr.h;
      deco(ctx, align === 'left' ? R : Math.min(W - WL, right), y + 40, L, car.brush !== false); y += 40 + DECO_H;
      if (br) { y += 40; setB(ctx, br.size, 700); ctx.fillStyle = isEnd ? GREEN : BODY; br.lines.forEach(function (ln, k) { var lw = ctx.measureText(ln).width; ctx.fillText(ln, align === 'left' ? L : L + (CW - lw) / 2, y + k * br.lh + br.size); }); over = over || br.over; }
    }
    over = over || hr.over;
    // footer
    setB(ctx, 30, 700);
    if (sl.kind === 'cover' && car.swipe !== false && car.slides.length > 1) { ctx.fillStyle = GREY; var sw = 'Swipe →', swW = ctx.measureText(sw).width; ctx.fillText(sw, R - swW, H - 84); }
    else if (sl.kind === 'tip' && car.handle !== false) { ctx.fillStyle = GREEN; var hd = '@auntietobi_uk', hw = ctx.measureText(hd).width; ctx.fillText(hd, (W - hw) / 2, H - 84); }
    ctx.restore();
    return { over: over };
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['900 100px "Inter Tight"', '500 40px Inter', '700 30px Inter'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }
  function pngOf(car, i) {
    var c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), car, i);
    return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, 'image/png'); });
  }
  function slug(s) { return String(s || 'carousel').toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'carousel'; }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
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
    document.getElementById('ttl').textContent = 'Template Carousel';
    document.getElementById('topRight').innerHTML = '<button class="btn primary" id="tcNew">＋ New carousel</button>';
    var items = list();
    document.getElementById('view').innerHTML = '<div class="wrap">' +
      '<div class="note" style="margin-bottom:12px">Make carousels in the Auntie Tobi bold headline template: white page, green frame, big capitals with green words, gold brush (optional) and the 🇬🇧 flag. AI (or a quick paste) makes all the slides at once — then edit any slide and download them as images.</div>' +
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
        draw(bx, c, 0); cv.getContext('2d').drawImage(big, 0, 0, 216, 270);
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
      '<div class="card"><div class="row" style="gap:16px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="teN"' + (car.numbers !== false ? ' checked' : '') + '> Number the tips (01, 02…)</label>' +
        '<label class="chk"><input type="checkbox" id="teH"' + (car.handle !== false ? ' checked' : '') + '> Show @auntietobi_uk</label>' +
        '<label class="chk"><input type="checkbox" id="teS"' + (car.swipe !== false ? ' checked' : '') + '> “Swipe →” on the cover</label>' +
        '<label class="chk"><input type="checkbox" id="teB"' + (car.brush !== false ? ' checked' : '') + '> Gold brush stroke</label></div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:8px">Put green words in <b>**double stars**</b>. Press Enter in a heading to choose where a line breaks.</div></div>' +
      '<div id="teSlides"></div><button class="btn ghost" id="teAdd" style="width:100%;margin-top:8px">＋ Add a slide</button>' +
      '<div class="card" style="margin-top:12px"><div class="lbl" style="margin-top:0">Caption</div><textarea id="teCap" rows="6"></textarea><div class="lbl">Hashtags</div><textarea id="teTags" rows="2"></textarea><button class="btn ghost sm" id="teCopy" style="margin-top:8px">📋 Copy caption &amp; hashtags</button></div>' +
      '</div><div class="carright"><div class="carstage"><canvas id="teCv" width="1080" height="1350"></canvas></div>' +
      '<div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn ghost sm" id="tePrev">◀</button><span id="teNum" style="font-weight:700;min-width:60px;text-align:center"></span><button class="btn ghost sm" id="teNext">▶</button></div>' +
      '<div class="err hidden" id="teOver" style="margin-top:8px">This slide has too much text to fit — shorten it a little.</div>' +
      '<div class="carthumbs" id="teThumbs"></div>' +
      '<div class="card" style="margin-top:10px"><div style="font-weight:800;margin-bottom:6px">⬇️ Download</div>' +
      '<button class="btn primary" id="teDl" style="width:100%">🖼️ All slides as images (.zip)</button><button class="btn ghost" id="teOne" style="width:100%;margin-top:8px">⬇️ Just this slide (PNG)</button>' +
      '<p class="muted" style="font-size:12.5px;margin-top:8px">1080×1350 — Instagram’s portrait size. On Instagram: New post → pick the images in order (01, 02…) → paste the caption.</p>' +
      '<button class="btn ghost sm" id="tePosted" style="margin-top:4px"></button></div></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    var $ = function (q) { return ov.querySelector(q); }, cv = $('#teCv'), ctx = cv.getContext('2d');
    $('#teTitle').value = car.title || ''; $('#teCap').value = car.caption || ''; $('#teTags').value = car.hashtags || '';
    function mark() { dirty = true; $('#teSaved').textContent = 'Unsaved changes'; }
    function paint() { var r = draw(ctx, car, sel); $('#teOver').classList.toggle('hidden', !r.over); }
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
        '<label>Heading</label><textarea data-f="heading" rows="2" maxlength="160">' + esc(sl.heading) + '</textarea>' +
        '<label>' + (sl.kind === 'tip' ? 'Body text' : 'Small text under it <span class="muted" style="font-weight:400">(optional)</span>') + '</label><textarea data-f="body" rows="3" maxlength="400">' + esc(sl.body) + '</textarea></div>';
    }
    function paintSlides() {
      $('#teSlides').innerHTML = car.slides.map(slideHtml).join('');
      Array.prototype.forEach.call(ov.querySelectorAll('.cslide'), function (el) {
        var i = +el.dataset.i;
        el.addEventListener('focusin', function () { if (sel !== i) setSel(i); });
        el.addEventListener('click', function (e) { if (!e.target.closest('button') && sel !== i) setSel(i); });
        Array.prototype.forEach.call(el.querySelectorAll('[data-f]'), function (f) {
          f.addEventListener(f.tagName === 'SELECT' ? 'change' : 'input', function () {
            var k = f.dataset.f, sl = car.slides[i]; sl[k] = f.value;
            if (k === 'kind') { sl.align = sl.kind === 'tip' ? 'left' : 'center'; if (sl.kind === 'end' && !sl.heading) Object.assign(sl, endSlide()); paintSlides(); setSel(i); }
            mark(); paint(); paintThumbs();
          });
        });
        el.querySelector('[data-mv="-1"]').onclick = function () { if (i > 0) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i - 1, 0, a); sel = i - 1; mark(); paintSlides(); setSel(sel); paintThumbs(); } };
        el.querySelector('[data-mv="1"]').onclick = function () { if (i < car.slides.length - 1) { var a = car.slides.splice(i, 1)[0]; car.slides.splice(i + 1, 0, a); sel = i + 1; mark(); paintSlides(); setSel(sel); paintThumbs(); } };
        el.querySelector('[data-dup]').onclick = function () { if (car.slides.length >= 10) return X.toast('Instagram allows up to 10 slides'); car.slides.splice(i + 1, 0, JSON.parse(JSON.stringify(car.slides[i]))); mark(); paintSlides(); setSel(i + 1); paintThumbs(); };
        el.querySelector('[data-del]').onclick = function () { if (car.slides.length <= 1) return; if (!confirm('Delete slide ' + (i + 1) + '?')) return; car.slides.splice(i, 1); mark(); paintSlides(); setSel(Math.min(i, car.slides.length - 1)); paintThumbs(); };
      });
    }
    $('#teN').onchange = function () { car.numbers = this.checked; mark(); paint(); paintThumbs(); };
    $('#teH').onchange = function () { car.handle = this.checked; mark(); paint(); paintThumbs(); };
    $('#teS').onchange = function () { car.swipe = this.checked; mark(); paint(); paintThumbs(); };
    $('#teB').onchange = function () { car.brush = this.checked; mark(); paint(); paintThumbs(); };
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
      var payload = { id: car.id, title: car.title, slides: car.slides, numbers: car.numbers, handle: car.handle, swipe: car.swipe, brush: car.brush, caption: car.caption, hashtags: car.hashtags, status: car.status };
      try {
        var r = await X.api('tc-save', { item: payload });
        car.id = r.item.id; car.updatedAt = r.item.updatedAt; car.postedAt = r.item.postedAt;
        var l = list(), k = l.findIndex(function (x) { return x.id === r.item.id; }); if (k >= 0) l[k] = r.item; else l.unshift(r.item);
        dirty = false; $('#teSaved').textContent = 'Saved ✓'; return true;
      } catch (x) { X.toast(x.message); return false; }
    }
    $('#teSave').onclick = save;
    function overList() { var c = document.createElement('canvas'); c.width = W; c.height = H; var cx = c.getContext('2d'); return car.slides.map(function (s, i) { return draw(cx, car, i).over ? i + 1 : 0; }).filter(Boolean); }
    $('#teDl').onclick = async function () {
      var b = this, bad = overList();
      if (bad.length && !confirm('Slide ' + bad.join(', ') + (bad.length > 1 ? ' have' : ' has') + ' too much text to fit. Download anyway?')) return;
      b.disabled = true; b.textContent = 'Preparing…';
      try { if (dirty) await save(); await exportZip(car); X.toast('Downloaded ✅ — check your Downloads'); } catch (x) { X.toast('Couldn’t make the download — please try again'); }
      b.disabled = false; b.textContent = '🖼️ All slides as images (.zip)';
    };
    $('#teOne').onclick = async function () {
      try { await fontsReady(); download(await pngOf(car, sel), slug(car.title) + '-' + pad(sel + 1) + '.png'); } catch (x) { X.toast('Couldn’t save the image — please try again'); }
    };
    $('#teX').onclick = function () {
      if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
      ov.remove(); document.body.style.overflow = ''; view();
    };
    paintSlides(); paintPosted(); setSel(0); paintThumbs();
    if (dirty) { mark(); save(); }
    fontsReady().then(function () { paint(); paintThumbs(); });
  }

  window.HQTpl = { init: init, view: view, draw: draw, W: W, H: H };
})();
