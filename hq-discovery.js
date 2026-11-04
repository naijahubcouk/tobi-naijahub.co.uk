/*
 * Auntie Tobi HQ — 📣 Discovery posts (Instagram Growth, admin only).
 * "Nigerian Caterers in UK – Part I": pick ~10 businesses from a directory category (claimed first, different towns),
 * then HQ draws the cover (your photo + white box with green border, title and gold brush) and one slide per business
 * (their photo + "@handle / 📍 Town" box), writes the caption with every @handle, and downloads it all (ZIP).
 * Marking a post as posted adds "📣 Featured in …" to each business's timeline in the Business directory.
 *
 * HQ calls HQDisc.init({ api, sheet, toast, esc, S }) once, then HQDisc.view() for the #disc page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1350, GREEN = '#0A8A4C', GOLD = '#E0A21B', INK = '#111111';
  var FT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
  var X = null, imgs = {}, dirPics = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return X.esc(s); }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  // Part numbers as Roman numerals: 1 → I, 2 → II, 4 → IV
  function roman(n) { n = Math.max(1, Math.min(99, n | 0)); var r = '', v = [[90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; v.forEach(function (x) { while (n >= x[0]) { r += x[1]; n -= x[0]; } }); return r; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function title(s) { return String(s || '').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function town(b) { var t = String(b.loc || '').split(',')[0].trim(); return t && t !== 'UK' ? t : ''; }
  function fmt(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }

  // ── data ──
  async function load(force) {
    if (!X.S.disc || force) X.S.disc = (await X.api('disc-list')).items;
    if (!X.S.dir) X.S.dir = await X.api('dir-list');
  }
  function dir() { return ((X.S.dir && X.S.dir.items) || []).filter(function (b) { return !b.hidden; }); }
  function inCat(b, cat) { return String(b.cat || '').toLowerCase() === cat; }
  function cats() {
    var c = {}; dir().forEach(function (b) { var k = String(b.cat || '').toLowerCase(); if (!k) return; c[k] = c[k] || { n: 0, ig: 0 }; c[k].n++; if (b.ig) c[k].ig++; });
    return Object.keys(c).sort().map(function (k) { return { cat: k, n: c[k].n, ig: c[k].ig }; });
  }
  function partsOf(cat) { return (X.S.disc || []).filter(function (p) { return p.cat === cat; }); }
  // where a business has already been featured in this category (other parts)
  function usedIn(cat, slug, exceptId) { var out = []; partsOf(cat).forEach(function (p) { if (p.id !== exceptId && p.items.some(function (x) { return x.slug === slug; })) out.push(p); }); return out; }
  function rankList(cat, partId, have) {
    return dir().filter(function (b) { return inCat(b, cat) && b.ig && have.indexOf(b.slug) < 0; }).map(function (b) {
      return { b: b, used: usedIn(cat, b.slug, partId) };
    }).sort(function (a, c) {
      return (a.used.length - c.used.length) || ((c.b.claimed ? 1 : 0) - (a.b.claimed ? 1 : 0)) || ((c.b.featured ? 1 : 0) - (a.b.featured ? 1 : 0)) || ((c.b.img ? 1 : 0) - (a.b.img ? 1 : 0)) || a.b.name.localeCompare(c.b.name);
    });
  }
  // ✨ fill up to 10: not featured before, claimed first, a different town each where possible
  function autoPick(p) {
    var have = p.items.map(function (x) { return x.slug; }), towns = {}, room = 10 - p.items.length;
    p.items.forEach(function (x) { if (x.town) towns[x.town.toLowerCase()] = 1; });
    var L = rankList(p.cat, p.id, have).filter(function (r) { return !r.used.length; }), pick = [];
    [true, false].forEach(function (newTownsOnly) {
      L.forEach(function (r) {
        if (pick.length >= room || pick.indexOf(r) >= 0) return;
        var t = town(r.b).toLowerCase();
        if (newTownsOnly && t && towns[t]) return;
        pick.push(r); if (t) towns[t] = 1;
      });
    });
    pick.forEach(function (r) { p.items.push(itemOf(r.b)); });
    return pick.length;
  }
  function itemOf(b) { return { slug: b.slug, name: b.name, handle: b.ig, town: town(b), img: '', pos: { x: 0, y: 0, z: 1 } }; }
  function blank(cat) {
    var max = 0; partsOf(cat).forEach(function (p) { max = Math.max(max, p.part); });
    return { cat: cat, part: max + 1, l1: 'Nigerian ' + title(cat), l2: 'in the UK', coverImg: '', coverPos: { x: 0, y: 0, z: 1 }, items: [], caption: '', status: 'draft' };
  }

  // ── pictures ──
  function imgFrom(src) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; }); }
  async function photo(id) { if (!id) return null; if (!imgs[id]) imgs[id] = X.api('disc-img', { id: id }).then(function (r) { return imgFrom(r.dataUrl); }, function () { return null; }); return imgs[id]; }
  async function dirPhoto(slug) { if (!slug) return null; if (!dirPics[slug]) dirPics[slug] = X.api('disc-dirpic', { slug: slug }).then(function (r) { return r.dataUrl ? imgFrom(r.dataUrl) : null; }, function () { return null; }); return dirPics[slug]; }
  async function itemPhoto(it) { return (it.img && await photo(it.img)) || await dirPhoto(it.slug); }
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { var k = Math.min(1, 1500 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.86)); };
      im.onerror = function () { bad(new Error('That photo couldn’t be read — try a JPG or PNG.')); }; im.src = u;
    });
  }
  async function upload(file) { var d = await shrink(file), r = await X.api('disc-img-put', { dataUrl: d }); imgs[r.id] = imgFrom(d); return r.id; }

  // ── drawing ──
  function drawPhoto(ctx, im, pos, label) {
    ctx.fillStyle = '#E9E6DF'; ctx.fillRect(0, 0, W, H);
    if (!im) { ctx.fillStyle = '#9AA1AB'; ctx.font = '700 46px ' + FT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label ? '📷 Add a photo of ' + label : '📷 Add a photo', W / 2, H * 0.42); ctx.textAlign = 'left'; return; }
    pos = pos || { x: 0, y: 0, z: 1 };
    var k = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (pos.z || 1), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    ctx.drawImage(im, (W - dw) / 2 + (pos.x || 0) * (dw - W) / 2, (H - dh) / 2 + (pos.y || 0) * (dh - H) / 2, dw, dh);
  }
  function brush(ctx, x, y, w) {
    ctx.save();
    for (var i = 0; i < 16; i++) {
      var s = i * 7.13, t = 10 + rnd(s) * 18, yy = y - 6 + (rnd(s + 1) - 0.5) * 30;
      var xs = x + rnd(s + 2) * w * 0.1, xe = x + w - rnd(s + 3) * w * 0.08, mid = (xs + xe) / 2;
      ctx.globalAlpha = 0.7 + rnd(s + 4) * 0.25; ctx.fillStyle = i % 3 === 2 ? '#E9B43A' : GOLD;
      ctx.beginPath(); ctx.moveTo(xs, yy + t * 0.5); ctx.quadraticCurveTo(mid, yy - 4 - rnd(s + 5) * 6, xe, yy); ctx.lineTo(xe - 14, yy + t * 0.55); ctx.quadraticCurveTo(mid, yy + t + rnd(s + 6) * 4, xs + 16, yy + t); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#F6E7C1'; ctx.lineCap = 'round';
    for (var j = 0; j < 7; j++) { var q = 50 + j * 3.7, y2 = y + (rnd(q) - 0.3) * 26, x1 = x + rnd(q + 1) * w * 0.7, len = 60 + rnd(q + 2) * w * 0.3; ctx.globalAlpha = 0.75; ctx.lineWidth = 2 + rnd(q + 3) * 3; ctx.beginPath(); ctx.moveTo(x1, y2); ctx.lineTo(Math.min(x + w, x1 + len), y2 - 1); ctx.stroke(); }
    ctx.restore();
  }
  function fit(ctx, txt, weight, start, maxW) { var s = start; ctx.font = weight + ' ' + s + 'px ' + FT; while (s > 24 && ctx.measureText(txt).width > maxW) { s -= 2; ctx.font = weight + ' ' + s + 'px ' + FT; } return s; }
  // cover: one capitals headline "NIGERIAN BAKERS IN THE UK - PART I" in a wide white box with a green border
  function wrap(ctx, words, maxW) { var out = [], line = ''; words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; }); if (line) out.push(line); return out; }
  function drawCover(ctx, p, im) {
    drawPhoto(ctx, im, p.coverPos);
    var text = ([p.l1, p.l2].filter(function (t) { return String(t || '').trim(); }).join(' ') + ' - Part ' + roman(p.part)).toUpperCase();
    var bw = W * 0.92, bx = (W - bw) / 2, inner = bw - 110, s = 70, lines;
    do { ctx.font = '700 ' + s + 'px ' + FT; lines = wrap(ctx, text.split(/\s+/), inner); s -= 2; } while ((lines.length > 3 || lines.some(function (l) { return ctx.measureText(l).width > inner; })) && s > 30);
    s += 2; var lh = s * 1.42, bh = lines.length * lh + 96, by = H * 0.87 - bh;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.14)'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + s + 'px ' + FT;
    lines.forEach(function (l, i) { ctx.fillText(l, W / 2, by + 48 + lh * (i + 0.5)); });
    ctx.textAlign = 'left';
  }
  function drawBiz(ctx, it, im) {
    drawPhoto(ctx, im, it.pos, it.name);
    var a = '@' + String(it.handle || '').replace(/^@/, ''), b = it.town ? '📍 ' + it.town : '';
    var s = 50; ctx.font = '700 ' + s + 'px ' + FT;
    var tw = Math.max(ctx.measureText(a).width, b ? ctx.measureText(b).width : 0);
    if (tw > W - 140) { s = Math.floor(s * (W - 140) / tw); ctx.font = '700 ' + s + 'px ' + FT; tw = Math.max(ctx.measureText(a).width, b ? ctx.measureText(b).width : 0); }
    var bw = Math.max(W * 0.62, tw + 76), bh = (b ? 2 : 1) * s * 1.3 + 46, bx = 26, by = H - bh - 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3.5, by + 3.5, bw - 7, bh - 7);
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(a, bx + 36, by + 23 + s * 0.65); if (b) ctx.fillText(b, bx + 30, by + 23 + s * 1.95);
  }
  async function render(p, i, scale) {
    var c = document.createElement('canvas'); c.width = W * (scale || 1); c.height = H * (scale || 1);
    var ctx = c.getContext('2d'); ctx.scale(scale || 1, scale || 1);
    if (i < 0) drawCover(ctx, p, await photo(p.coverImg)); else drawBiz(ctx, p.items[i], await itemPhoto(p.items[i]));
    return c;
  }
  async function fontsReady() { try { await document.fonts.load('700 50px Inter'); } catch (e) {} }

  // ── caption ──
  function hashtags(cat) {
    var t = title(cat).replace(/[^A-Za-z0-9]/g, '');
    return ['#Nigerian' + t + 'UK', '#' + t + 'UK', '#NigerianBusinessesUK', '#SupportNigerianBusinesses', '#NaijaInUK', '#NigeriansInUK', '#BlackOwnedBusinessUK', '#AuntieTobi'].join(' ');
  }
  function caption(p) {
    var what = String(p.cat || 'businesses').toLowerCase(), head = [p.l1, p.l2].filter(Boolean).join(' ');
    return '🇳🇬 ' + head + ' – Part ' + roman(p.part) + ' 💚\n\n' +
      'Looking for Nigerian ' + what + ' near you? Here are ' + p.items.length + ' amazing businesses across the UK 👇🏾\n\n' +
      p.items.map(function (x, i) { return (i + 1) + '. @' + x.handle + (x.town ? ' — 📍 ' + x.town : ''); }).join('\n') +
      '\n\nKnow a great Nigerian ' + what.replace(/s$/, '') + ' we should feature next? Tag them in the comments 👇🏾\n\n' +
      '📌 Save this for later · 📤 Share with a friend\n💚 Find more Nigerian businesses near you on the Auntie Tobi app — link in bio\n\n' + hashtags(p.cat);
  }

  // ── list page ──
  function view() {
    $('#ttl').textContent = 'Discovery posts'; $('#topRight').innerHTML = '';
    if (X.S.discEdit) return editor();
    $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    load().then(listPage, function (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; });
  }
  function listPage() {
    var C = cats(), P = X.S.disc || [];
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><b>＋ New discovery post</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Choose a category from your Business directory. HQ picks 10 businesses with Instagram — claimed first, from different towns, not featured before — and you can change any of them.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><select id="dcCat" style="flex:1;min-width:200px">' + C.filter(function (c) { return c.ig; }).map(function (c) { var n = partsOf(c.cat).length; return '<option value="' + esc(c.cat) + '">' + esc(title(c.cat)) + ' — ' + c.ig + ' with Instagram' + (n ? ' · ' + n + ' post' + (n > 1 ? 's' : '') + ' so far' : '') + '</option>'; }).join('') + '</select><button class="btn primary" id="dcNew">✨ Start Part …</button></div></div>' +
      '<div class="card" style="padding:4px 14px">' + (P.length ? P.map(function (p) {
        return '<div class="aprow" style="cursor:pointer;flex-direction:row;align-items:center;flex-wrap:nowrap" data-dp="' + p.id + '"><div style="flex:1;min-width:0"><b>' + esc([p.l1, p.l2].filter(Boolean).join(' ')) + ' – Part ' + roman(p.part) + '</b> ' +
          (p.status === 'posted' ? '<span class="ak" style="background:#057A44">✅ Posted ' + esc(fmt(p.postedAt)) + '</span>' : '<span class="ak" style="background:#EEF0F3;color:#6B7280">Draft</span>') +
          '<div class="muted" style="font-size:12.5px">' + p.items.length + ' businesses · ' + esc(p.items.map(function (x) { return x.town; }).filter(Boolean).filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 5).join(', ')) + '</div></div><span style="font-size:20px;color:#9CA3AF">›</span></div>';
      }).join('') : '<p class="muted" style="padding:12px 0">No discovery posts yet.</p>') + '</div></div>';
    var sync = function () { var c = $('#dcCat').value, n = 0; partsOf(c).forEach(function (p) { n = Math.max(n, p.part); }); $('#dcNew').textContent = '✨ Start Part ' + roman(n + 1); };
    if ($('#dcCat')) { $('#dcCat').onchange = sync; sync(); }
    $('#dcNew').onclick = function () { var c = $('#dcCat').value; if (!c) return; var p = blank(c), n = autoPick(p); p.caption = caption(p); X.S.discEdit = p; X.toast(n ? 'Picked ' + n + ' businesses — change anything you like' : 'No new businesses with Instagram in this category — add some by hand'); view(); };
    $$('[data-dp]').forEach(function (r) { r.onclick = function () { var p = (X.S.disc || []).filter(function (q) { return q.id === r.dataset.dp; })[0]; if (p) { X.S.discEdit = JSON.parse(JSON.stringify(p)); view(); } }; });
  }

  // ── editor ──
  var thumbs = 0;
  async function paintThumbs(p) {
    var run = ++thumbs; await fontsReady();
    for (var i = -1; i < p.items.length; i++) {
      var el = $('[data-th="' + i + '"]'); if (!el) continue;
      var c = await render(p, i, 0.25); if (run !== thumbs) return;
      el.innerHTML = ''; c.style.width = '100%'; c.style.display = 'block'; c.style.borderRadius = '8px'; el.appendChild(c);
    }
  }
  function editor() {
    var p = X.S.discEdit, posted = p.status === 'posted';
    $('#ttl').textContent = [p.l1, p.l2].filter(Boolean).join(' ') + ' – Part ' + roman(p.part);
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn ghost" id="deBack">‹ All posts</button><button class="btn primary" id="deSave">💾 Save</button><button class="btn gold" id="deZip">⬇️ Download slides</button>' + (navigator.canShare ? '<button class="btn ghost" id="deShare">📲 Save to phone</button>' : '') + (posted ? '<button class="btn ghost" id="deTell">🎉 Tell the businesses</button>' : '<button class="btn ghost" id="dePost">✅ Mark as posted</button>') + (p.id ? '<button class="btn ghost" id="deDel" style="color:#B42318">🗑</button>' : '') + '</div>' +
      (posted ? '<div class="note" style="margin-bottom:12px">✅ Posted ' + esc(fmt(p.postedAt)) + (p.postUrl ? ' · <a href="' + esc(p.postUrl) + '" target="_blank" rel="noopener">View on Instagram</a>' : '') + ' — each business’s timeline in Business directory shows it. <button class="btn link" id="deUnpost" style="font-size:13px">Undo</button></div>' : '') +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><b>🎯 Cover</b><div class="row" style="gap:12px;align-items:flex-start;margin-top:8px;flex-wrap:wrap"><div data-th="-1" data-open="-1" style="width:150px;cursor:pointer;background:#EEE;border-radius:8px;aspect-ratio:4/5"></div><div style="flex:1;min-width:200px" class="stack">' +
      '<div><label>Title</label><input id="deL1" value="' + esc(p.l1) + '" placeholder="Nigerian Caterers"><input id="deL2" value="' + esc(p.l2) + '" placeholder="in the UK" style="margin-top:6px"></div>' +
      '<div class="row" style="gap:8px;align-items:center"><label style="margin:0">Part</label><input id="dePt" type="number" min="1" max="99" value="' + p.part + '" style="width:80px"><span class="muted" id="dePtR">= Part ' + roman(p.part) + '</span></div>' +
      '<button class="btn ghost sm" data-open="-1">📷 Cover photo &amp; position</button></div></div></div>' +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>🏪 Businesses (' + p.items.length + ')</b><div class="row" style="gap:6px"><button class="btn ghost sm" id="deAuto">✨ Fill to 10</button><button class="btn ghost sm" id="deAdd">＋ Add</button></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:4px 0 10px">Tap a slide to change the photo, @handle or town. For the best slides, upload a photo from their Instagram.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">' + p.items.map(function (x, i) {
        return '<div style="background:#fff;border:1px solid #ECE6D6;border-radius:10px;padding:6px"><div data-th="' + i + '" data-open="' + i + '" style="cursor:pointer;background:#EEE;border-radius:8px;aspect-ratio:4/5"></div><div style="font-size:12.5px;font-weight:700;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (i + 1) + '. @' + esc(x.handle) + '</div><div class="muted" style="font-size:12px">' + esc(x.town || '—') + '</div><div class="row" style="gap:4px;margin-top:4px"><button class="btn ghost sm" data-up="' + i + '" style="padding:4px 8px"' + (i ? '' : ' disabled') + '>↑</button><button class="btn ghost sm" data-dn="' + i + '" style="padding:4px 8px"' + (i < p.items.length - 1 ? '' : ' disabled') + '>↓</button><button class="btn ghost sm" data-rm="' + i + '" style="padding:4px 8px;margin-left:auto">✖</button></div></div>';
      }).join('') + '</div></div>' +
      '<div class="card" style="padding:14px 16px"><div class="row" style="justify-content:space-between;align-items:center"><b>✍️ Caption</b><div class="row" style="gap:6px"><button class="btn ghost sm" id="deCapNew">↻ Rewrite from the list</button><button class="btn ghost sm" id="deCapCopy">📋 Copy</button></div></div><textarea id="deCap" rows="12" style="margin-top:8px;font-size:14px">' + esc(p.caption || caption(p)) + '</textarea><div class="muted" style="font-size:12px;margin-top:4px" id="deCapN"></div></div></div>';
    var read = function () { p.l1 = $('#deL1').value; p.l2 = $('#deL2').value; p.part = Math.max(1, parseInt($('#dePt').value, 10) || 1); p.caption = $('#deCap').value; };
    var capN = function () { $('#deCapN').textContent = $('#deCap').value.length + ' / 2,200 characters'; }; $('#deCap').oninput = capN; capN();
    var auto = caption(p);   // the caption follows the title while you haven't changed it yourself
    var tm; ['#deL1', '#deL2', '#dePt'].forEach(function (id) { $(id).oninput = function () { clearTimeout(tm); tm = setTimeout(function () { var was = $('#deCap').value === auto; read(); if ($('#dePtR')) $('#dePtR').textContent = '= Part ' + roman(p.part); if (was) { auto = caption(p); $('#deCap').value = p.caption = auto; capN(); } paintThumbs(p); }, 300); }; });
    $('#deBack').onclick = function () { X.S.discEdit = null; view(); };
    $('#deSave').onclick = function () { read(); save(p).then(function () { X.toast('Saved'); }); };
    $('#deAuto').onclick = function () { read(); var n = autoPick(p); X.toast(n ? 'Added ' + n : 'No more new businesses with Instagram in this category'); if (n) p.caption = caption(p); editor(); };
    $('#deAdd').onclick = function () { read(); picker(p); };
    $('#deCapNew').onclick = function () { read(); $('#deCap').value = p.caption = caption(p); capN(); };
    $('#deCapCopy').onclick = async function () { try { await navigator.clipboard.writeText($('#deCap').value); X.toast('Caption copied'); } catch (e) { X.toast('Copy failed — select the text and copy'); } };
    $$('[data-up]').forEach(function (b) { b.onclick = function () { read(); var i = +b.dataset.up, t = p.items[i]; p.items[i] = p.items[i - 1]; p.items[i - 1] = t; editor(); }; });
    $$('[data-dn]').forEach(function (b) { b.onclick = function () { read(); var i = +b.dataset.dn, t = p.items[i]; p.items[i] = p.items[i + 1]; p.items[i + 1] = t; editor(); }; });
    $$('[data-rm]').forEach(function (b) { b.onclick = function () { read(); p.items.splice(+b.dataset.rm, 1); editor(); }; });
    $$('[data-open]').forEach(function (b) { b.onclick = function () { read(); slideSheet(p, +b.dataset.open); }; });
    $('#deZip').onclick = function () { read(); download(p, this); };
    if ($('#deShare')) $('#deShare').onclick = function () { read(); shareAll(p, this); };
    if ($('#dePost')) $('#dePost').onclick = function () { read(); postSheet(p); };
    if ($('#deTell')) $('#deTell').onclick = function () { tellSheet(p); };
    if ($('#deUnpost')) $('#deUnpost').onclick = async function () { try { X.S.disc = (await X.api('disc-unpost', { id: p.id })).items; p.status = 'draft'; editor(); } catch (e) { X.toast(e.message); } };
    if ($('#deDel')) $('#deDel').onclick = async function () { if (!confirm('Delete this discovery post?')) return; try { X.S.disc = (await X.api('disc-del', { id: p.id })).items; X.S.discEdit = null; view(); } catch (e) { X.toast(e.message); } };
    paintThumbs(p);
  }
  async function save(p) {
    try { var r = await X.api('disc-save', { part: p }); X.S.disc = r.items; p.id = r.part.id; p.createdAt = r.part.createdAt; return true; }
    catch (e) { X.toast(e.message); return false; }
  }

  // one slide: photo, position, @handle and town
  function slideSheet(p, i) {
    var cover = i < 0, it = cover ? null : p.items[i], pos = JSON.parse(JSON.stringify((cover ? p.coverPos : it.pos) || { x: 0, y: 0, z: 1 }));
    var s = X.sheet('<h2>' + (cover ? '🎯 Cover' : (i + 1) + '. ' + esc(it.name || '@' + it.handle)) + '</h2>' +
      '<div style="position:relative;max-width:340px;margin:8px auto;touch-action:none"><canvas id="ssC" width="' + W / 2 + '" height="' + H / 2 + '" style="width:100%;border-radius:10px;display:block;cursor:grab"></canvas></div>' +
      '<p class="muted" style="text-align:center;font-size:12.5px;margin:0 0 8px">Drag the photo to move it · use the slider to zoom</p>' +
      '<div class="row" style="gap:8px;align-items:center"><span class="muted" style="font-size:13px">Zoom</span><input type="range" id="ssZ" min="1" max="3" step="0.02" value="' + (pos.z || 1) + '" style="flex:1"></div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><label class="btn ghost sm" style="margin:0">📷 ' + (cover ? 'Cover photo' : 'Upload their photo') + '<input type="file" id="ssF" accept="image/*" hidden></label>' + (!cover && it.img ? '<button class="btn ghost sm" id="ssDir">↺ Use directory picture</button>' : '') + (!cover ? '<a class="btn ghost sm" href="https://www.instagram.com/' + esc(it.handle) + '/" target="_blank" rel="noopener">📸 Open their Instagram</a>' : '') + '</div>' +
      (cover ? '' : '<div class="f2" style="margin-top:10px"><div><label for="ssH">Instagram</label><input id="ssH" value="@' + esc(it.handle) + '"></div><div><label for="ssT">Town</label><input id="ssT" value="' + esc(it.town) + '"></div></div>') +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="ssX">Cancel</button><button class="btn primary" id="ssOk">Done</button></div>');
    var tmp = cover ? { coverImg: p.coverImg } : { img: it.img }, c = $('#ssC', s), ctx = c.getContext('2d');
    var cur = function () { var o = cover ? Object.assign({}, p, { coverImg: tmp.coverImg, coverPos: pos }) : Object.assign({}, it, { img: tmp.img, pos: pos, handle: $('#ssH', s).value.replace(/^@+/, '').trim(), town: $('#ssT', s).value.trim() }); return o; };
    var im = null, paint = function () { ctx.setTransform(0.5, 0, 0, 0.5, 0, 0); if (cover) drawCover(ctx, cur(), im); else drawBiz(ctx, cur(), im); };
    var reload = async function () { await fontsReady(); im = cover ? await photo(tmp.coverImg) : (tmp.img ? await photo(tmp.img) : await dirPhoto(it.slug)); paint(); };
    reload();
    $('#ssZ', s).oninput = function () { pos.z = +this.value; paint(); };
    if (!cover) { $('#ssH', s).oninput = paint; $('#ssT', s).oninput = paint; }
    // drag to move the photo
    var drag = null;
    c.onpointerdown = function (e) { if (!im) return; drag = { x: e.clientX, y: e.clientY, px: pos.x || 0, py: pos.y || 0 }; c.setPointerCapture(e.pointerId); };
    c.onpointermove = function (e) {
      if (!drag || !im) return;
      var r = c.getBoundingClientRect(), sc = W / r.width, k = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (pos.z || 1), ox = (im.naturalWidth * k - W) / 2, oy = (im.naturalHeight * k - H) / 2;
      pos.x = ox > 1 ? clamp(drag.px + (e.clientX - drag.x) * sc / ox, -1, 1) : 0; pos.y = oy > 1 ? clamp(drag.py + (e.clientY - drag.y) * sc / oy, -1, 1) : 0; paint();
    };
    c.onpointerup = c.onpointercancel = function () { drag = null; };
    $('#ssF', s).onchange = async function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; try { X.toast('Uploading…'); var id = await upload(f); if (cover) tmp.coverImg = id; else tmp.img = id; pos.x = 0; pos.y = 0; pos.z = 1; $('#ssZ', s).value = 1; await reload(); } catch (e) { X.toast(e.message); } };
    if ($('#ssDir', s)) $('#ssDir', s).onclick = function () { tmp.img = ''; pos = { x: 0, y: 0, z: 1 }; $('#ssZ', s).value = 1; reload(); };
    $('#ssX', s).onclick = function () { s.remove(); };
    $('#ssOk', s).onclick = function () {
      if (cover) { p.coverImg = tmp.coverImg; p.coverPos = pos; }
      else { var o = cur(); if (!o.handle) { X.toast('Add their Instagram'); return; } p.items[i] = { slug: it.slug, name: it.name, handle: o.handle, town: o.town, img: tmp.img, pos: pos }; }
      s.remove(); editor();
    };
  }

  // add businesses by hand
  function picker(p) {
    var have = p.items.map(function (x) { return x.slug; }), L = rankList(p.cat, p.id, have), q = '';
    var s = X.sheet('<h2>＋ Add businesses</h2><p class="muted" style="font-size:13px;margin:4px 0 8px">' + esc(title(p.cat)) + ' with Instagram — claimed first. Businesses already in another part are at the bottom.</p><input id="pkQ" placeholder="🔎 Search name, @handle or town"><div id="pkL" style="max-height:52vh;overflow:auto;margin-top:8px"></div>' +
      '<div class="row" style="gap:8px;margin-top:10px"><input id="pkHand" placeholder="Not in the directory? @handle" style="flex:1"><input id="pkTown" placeholder="Town" style="width:120px"><button class="btn ghost sm" id="pkHandGo">＋</button></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn primary" id="pkOk">Done</button></div>');
    var draw = function () {
      var rows = L.filter(function (r) { var b = r.b; return !q || (b.name + ' ' + b.ig + ' ' + b.loc).toLowerCase().indexOf(q) >= 0; });
      $('#pkL', s).innerHTML = rows.length ? rows.map(function (r) { var b = r.b, on = p.items.some(function (x) { return x.slug === b.slug; });
        return '<label class="aprow" style="flex-direction:row;align-items:center;flex-wrap:nowrap;cursor:pointer;gap:10px"><input type="checkbox" data-pk="' + esc(b.slug) + '"' + (on ? ' checked' : '') + ' style="width:20px;height:20px;flex:none"><div style="flex:1;min-width:0"><b>' + esc(b.name) + '</b> <span class="muted">@' + esc(b.ig) + '</span><div style="margin-top:2px">' +
          (b.claimed ? '<span class="ak" style="background:#057A44">Claimed</span> ' : '<span class="ak" style="background:#FFE7A3;color:#6B4A00">Unclaimed</span> ') + (b.featured ? '<span class="ak" style="background:#0F1E36">⭐ Club</span> ' : '') + (town(b) ? '<span class="muted" style="font-size:12.5px">📍 ' + esc(town(b)) + '</span> ' : '') +
          r.used.map(function (u) { return '<span class="ak" style="background:#EEF0F3;color:#6B7280">In Part ' + roman(u.part) + '</span>'; }).join(' ') + '</div></div></label>'; }).join('') : '<p class="muted">No businesses found.</p>';
      $$('[data-pk]', s).forEach(function (cb) { cb.onchange = function () { var slug = cb.dataset.pk, b = L.filter(function (r) { return r.b.slug === slug; })[0].b;
        if (cb.checked) { if (p.items.length >= 12) { cb.checked = false; X.toast('Up to 12 businesses'); return; } p.items.push(itemOf(b)); } else p.items = p.items.filter(function (x) { return x.slug !== slug; }); }; });
    };
    draw();
    $('#pkQ', s).oninput = function () { q = this.value.toLowerCase(); draw(); };
    $('#pkHandGo', s).onclick = function () { var h = $('#pkHand', s).value.replace(/^@+/, '').trim(); if (!/^[A-Za-z0-9._]{2,30}$/.test(h)) { X.toast('Type their Instagram @handle'); return; } p.items.push({ slug: '', name: '@' + h, handle: h, town: $('#pkTown', s).value.trim(), img: '', pos: { x: 0, y: 0, z: 1 } }); $('#pkHand', s).value = ''; $('#pkTown', s).value = ''; X.toast('Added @' + h); };
    $('#pkOk', s).onclick = function () { s.remove(); p.caption = caption(p); editor(); };
  }

  // download all slides (ZIP) / save to phone
  async function files(p) {
    await fontsReady(); var out = [];
    for (var i = -1; i < p.items.length; i++) {
      var c = await render(p, i, 1), b = await new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.93); });
      out.push(new File([b], (i < 0 ? '01-cover' : (i + 2 < 10 ? '0' : '') + (i + 2) + '-' + String(p.items[i].handle).replace(/[^a-z0-9._]/gi, '')) + '.jpg', { type: 'image/jpeg' }));
    }
    return out;
  }
  function name(p) { return ('discovery-' + p.cat + '-pt' + p.part).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  async function missing(p) { var n = []; if (!(await photo(p.coverImg))) n.push('the cover'); for (var i = 0; i < p.items.length; i++) if (!(await itemPhoto(p.items[i]))) n.push('@' + p.items[i].handle); return n; }
  async function okToExport(p) { var n = await missing(p); return !n.length || confirm('No photo yet for ' + n.slice(0, 4).join(', ') + (n.length > 4 ? ' and ' + (n.length - 4) + ' more' : '') + '. Download anyway?'); }
  async function download(p, btn) {
    if (!p.items.length) return X.toast('Add some businesses first');
    if (!(await okToExport(p))) return;
    var t = btn.textContent; btn.disabled = true; btn.textContent = 'Making slides…';
    try {
      var fs = await files(p), zip = new JSZip(); fs.forEach(function (f) { zip.file(f.name, f); }); zip.file('caption.txt', $('#deCap') ? $('#deCap').value : p.caption);
      var a = document.createElement('a'); a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' })); a.download = name(p) + '.zip'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      save(p);
    } catch (e) { X.toast(e.message); }
    btn.disabled = false; btn.textContent = t;
  }
  async function shareAll(p, btn) {
    if (!p.items.length) return X.toast('Add some businesses first');
    if (!(await okToExport(p))) return;
    var t = btn.textContent; btn.disabled = true; btn.textContent = 'Making slides…';
    try { var fs = await files(p); if (navigator.canShare && navigator.canShare({ files: fs })) { try { await navigator.clipboard.writeText(p.caption); } catch (e) {} await navigator.share({ files: fs }); X.toast('Caption copied too'); } else X.toast('Your phone can’t share several photos — use Download'); save(p); }
    catch (e) { if (e && e.name !== 'AbortError') X.toast(e.message); }
    btn.disabled = false; btn.textContent = t;
  }

  // posted → timeline + "you've been featured" messages
  function postSheet(p) {
    var s = X.sheet('<h2>✅ Mark as posted</h2><p class="muted" style="font-size:13.5px;margin:4px 0 10px">Each business’s timeline in Business directory will show they were featured.</p><label for="psU">Instagram post link <span class="muted" style="font-weight:400">(optional)</span></label><input id="psU" placeholder="https://www.instagram.com/p/…">' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="psX">Cancel</button><button class="btn primary" id="psOk">✅ Posted</button></div>');
    $('#psX', s).onclick = function () { s.remove(); };
    $('#psOk', s).onclick = async function () {
      this.disabled = true;
      if (!(await save(p))) { this.disabled = false; return; }
      try { X.S.disc = (await X.api('disc-posted', { id: p.id, url: $('#psU', s).value.trim() })).items; X.S.discEdit = JSON.parse(JSON.stringify(X.S.disc.filter(function (q) { return q.id === p.id; })[0])); s.remove(); X.toast('Marked as posted 🎉'); editor(); tellSheet(X.S.discEdit); }
      catch (e) { X.toast(e.message); this.disabled = false; }
    };
  }
  function tellSheet(p) {
    var D = {}; dir().forEach(function (b) { D[b.slug] = b; });
    var head = [p.l1, p.l2].filter(Boolean).join(' ') + ' – Part ' + roman(p.part);
    var msg = function (x) { return 'Hi ' + (D[x.slug] ? D[x.slug].name : '@' + x.handle) + ' 👋🏾 Auntie Tobi here! We’ve just featured you in our “' + head + '” post on Instagram 🎉' + (p.postUrl ? '\n' + p.postUrl : '') + '\nFeel free to share it to your story and tag @auntietobi_uk 💚'; };
    var s = X.sheet('<h2>🎉 Tell the businesses</h2><p class="muted" style="font-size:13.5px;margin:4px 0 10px">One tap opens WhatsApp with the message ready, or copies it for an Instagram DM. Nothing is sent until you press send.</p><div style="max-height:56vh;overflow:auto">' +
      p.items.map(function (x, i) { var b = D[x.slug] || {}; return '<div class="aprow" style="flex-direction:row;align-items:center;flex-wrap:wrap;gap:8px"><div style="flex:1;min-width:140px"><b>@' + esc(x.handle) + '</b><div class="muted" style="font-size:12.5px">' + esc(b.name || '') + '</div></div><div class="row" style="gap:6px">' +
        (b.wa ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(b.wa) + '?text=' + encodeURIComponent(msg(x)) + '">💬 WhatsApp</a>' : '') + '<button class="btn ghost sm" data-tdm="' + i + '">📸 Instagram DM</button></div></div>'; }).join('') +
      '</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="tsX">Done</button></div>');
    $$('[data-tdm]', s).forEach(function (b) { b.onclick = async function () { var x = p.items[+b.dataset.tdm]; try { await navigator.clipboard.writeText(msg(x)); X.toast('Message copied — paste it in the DM'); } catch (e) {} window.open('https://ig.me/m/' + encodeURIComponent(x.handle), '_blank', 'noopener'); }; });
    $('#tsX', s).onclick = function () { s.remove(); };
  }

  window.HQDisc = { init: function (o) { X = o; }, view: view };
})();
