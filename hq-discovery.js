/*
 * Auntie Tobi HQ — 📣 Discovery posts (Instagram Growth, admin only).
 * "Nigerian Caterers in UK – Part I": pick ~10 businesses from a directory category (claimed first, different towns),
 * then HQ draws the cover (your photo + white box with green border, title and gold brush) and one slide per business
 * (their photo + "@handle / 📍 Town" box), writes the caption with every @handle, and downloads it all (ZIP).
 * ✨ General / Advert posts: any title (with or without "Part I"), any businesses from the whole directory (Club members first
 *    if you like); each slide shows the category, the town or both.
 * 🏙️ City posts ("Nigerian Businesses in Manchester – Part I", any title you like): businesses from one town or city,
 * one business per category so each gets its moment; the slide shows their category instead of the town.
 * 🛍️ Marketplace posts: one slide per Marketplace product (photo, product name, price — on or off — and @handle), an editable
 *    last slide (“Shop these and more on the Auntie Tobi Marketplace”), one product per business, not featured before first.
 * “Part” can be switched off on every kind of post. Download as a ZIP, or every slide as its own photo.
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
    if (!X.S.discClub || force) X.S.discClub = await X.api('disc-club').then(function (r) { var o = {}; (r.slugs || []).forEach(function (x) { o[x] = 1; }); return o; }, function () { return {}; });
  }
  // ⭐ a current, paid Business Club member (not the website's "Featured" tick)
  function club(b) { return !!(b && X.S.discClub && X.S.discClub[b.slug]); }
  function dir() { return ((X.S.dir && X.S.dir.items) || []).filter(function (b) { return !b.hidden; }); }
  function inCat(b, cat) { return String(b.cat || '').toLowerCase() === cat; }
  function cats() {
    var c = {}; dir().forEach(function (b) { var k = String(b.cat || '').toLowerCase(); if (!k) return; c[k] = c[k] || { n: 0, ig: 0 }; c[k].n++; if (b.ig) c[k].ig++; });
    return Object.keys(c).sort().map(function (k) { return { cat: k, n: c[k].n, ig: c[k].ig }; });
  }
  // a series: one category ("caterers") or one city ("city:manchester"); parts are numbered within it
  function keyOf(p) { return p.kind === 'city' ? 'city:' + String(p.city || '').toLowerCase() : p.kind === 'general' ? 'general' : p.kind === 'market' ? 'market:' + String(p.cat || 'all').toLowerCase() : p.cat; }
  function isMkt(p) { return p && p.kind === 'market'; }
  function isGen(p) { return p && p.kind === 'general'; }
  // "Title – Part II", or just "Title" when Part is switched off
  function head(p) { return [p.l1, p.l2].filter(function (t) { return String(t || '').trim(); }).join(' ') + (p.noPart ? '' : ' – Part ' + roman(p.part)); }
  function line(p, it) { var c = String(it.cat || '').trim(), t = String(it.town || '').trim(), w = p.line || 'both'; return w === 'cat' ? c : w === 'town' ? (t ? '📍 ' + t : '') : [c, t ? '📍 ' + t : ''].filter(Boolean).join(' · '); }
  function partsOf(key) { return (X.S.disc || []).filter(function (p) { return keyOf(p) === key; }); }
  function isCity(p) { return p && p.kind === 'city'; }
  function inCity(b, city) { return town(b).toLowerCase() === String(city || '').toLowerCase(); }
  function cities() {
    var c = {}; dir().forEach(function (b) { var t = town(b), k = t.toLowerCase(); if (!k) return; c[k] = c[k] || { city: t, n: 0, ig: 0, cats: {} }; c[k].n++; if (b.ig) { c[k].ig++; if (b.cat) c[k].cats[String(b.cat).toLowerCase()] = 1; } });
    return Object.keys(c).map(function (k) { var x = c[k]; x.nc = Object.keys(x.cats).length; return x; }).sort(function (a, b) { return b.ig - a.ig || a.city.localeCompare(b.city); });
  }
  function catOf(b) { return title(String(b.cat || '').toLowerCase()); }
  // where a business has already been featured in this category (other parts)
  function usedIn(key, slug, exceptId) { var out = []; partsOf(key).forEach(function (p) { if (p.id !== exceptId && p.items.some(function (x) { return x.slug === slug; })) out.push(p); }); return out; }
  function rankList(p, have) {
    var key = keyOf(p);
    return dir().filter(function (b) { return (isGen(p) ? true : isCity(p) ? inCity(b, p.city) : inCat(b, p.cat)) && b.ig && have.indexOf(b.slug) < 0; }).map(function (b) {
      return { b: b, used: isGen(p) ? everIn(b.slug, p.id) : usedIn(key, b.slug, p.id) };
    }).sort(function (a, c) {
      return (a.used.length - c.used.length) || ((c.b.claimed ? 1 : 0) - (a.b.claimed ? 1 : 0)) || ((club(c.b) ? 1 : 0) - (club(a.b) ? 1 : 0)) || ((c.b.img ? 1 : 0) - (a.b.img ? 1 : 0)) || a.b.name.localeCompare(c.b.name);
    });
  }
  // ✨ fill up to 10: not featured before, claimed first, a different town each where possible
  function autoPick(p) {
    if (isCity(p)) return autoPickCity(p);
    var have = p.items.map(function (x) { return x.slug; }), towns = {}, room = 10 - p.items.length;
    p.items.forEach(function (x) { if (x.town) towns[x.town.toLowerCase()] = 1; });
    var L = rankList(p, have).filter(function (r) { return !r.used.length; }), pick = [];
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
  // 🏙️ fill up to 10 for a city: one business per category (never two of the same kind), not featured in this city before,
  // categories not shown in this city's earlier parts first, then claimed, Club, with a photo
  function autoPickCity(p) {
    var have = p.items.map(function (x) { return x.slug; }), cats = {}, room = 10 - p.items.length, seen = {};
    p.items.forEach(function (x) { if (x.cat) cats[x.cat.toLowerCase()] = 1; });
    partsOf(keyOf(p)).forEach(function (q) { if (q.id !== p.id) q.items.forEach(function (x) { if (x.cat) seen[x.cat.toLowerCase()] = (seen[x.cat.toLowerCase()] || 0) + 1; }); });
    var L = rankList(p, have).filter(function (r) { return !r.used.length && r.b.cat; }).sort(function (a, c) {
      return (seen[String(a.b.cat).toLowerCase()] || 0) - (seen[String(c.b.cat).toLowerCase()] || 0) || ((c.b.claimed ? 1 : 0) - (a.b.claimed ? 1 : 0)) || ((club(c.b) ? 1 : 0) - (club(a.b) ? 1 : 0)) || ((c.b.img ? 1 : 0) - (a.b.img ? 1 : 0)) || a.b.name.localeCompare(c.b.name);
    }), n = 0;
    L.forEach(function (r) { var k = String(r.b.cat).toLowerCase(); if (n >= room || cats[k]) return; cats[k] = 1; p.items.push(itemOf(r.b)); n++; });
    return n;
  }
  // ── 🛍️ Marketplace ──
  async function loadMkt(force) { if (!X.S.discMkt || force) X.S.discMkt = (await X.api('disc-mkt')).items; return X.S.discMkt; }
  function mktProducts(p) { return (X.S.discMkt || []).filter(function (m) { return m.hasImg && (!p.cat || m.category === p.cat); }); }
  function mktUsed(pid, exceptId) { return (X.S.disc || []).filter(function (q) { return q.id !== exceptId && q.items.some(function (x) { return x.pid === pid; }); }); }
  function igOf(slug) { var b = slug ? dir().filter(function (d) { return d.slug === slug; })[0] : null; return b ? { ig: b.ig || '', town: town(b) } : { ig: '', town: '' }; }
  function itemOfMkt(m) { var d = igOf(m.bizSlug); return { slug: m.bizSlug || '', pid: m.id, name: m.business, prod: m.name, price: m.price || '', handle: d.ig, town: d.town, cat: m.category, img: '', pos: { x: 0, y: 0, z: 1 } }; }
  function mktRank(p) {
    var have = p.items.map(function (x) { return x.pid; });
    return mktProducts(p).filter(function (m) { return have.indexOf(m.id) < 0; }).map(function (m) { return { m: m, used: mktUsed(m.id, p.id) }; })
      .sort(function (a, c) { return (a.used.length - c.used.length) || ((igOf(c.m.bizSlug).ig ? 1 : 0) - (igOf(a.m.bizSlug).ig ? 1 : 0)) || String(c.m.at).localeCompare(String(a.m.at)); });
  }
  // ✨ fill up to 10 products: one per business, not featured before first, businesses with Instagram first
  function autoPickMkt(p) {
    var room = 10 - p.items.length, biz = {}, n = 0;
    p.items.forEach(function (x) { biz[String(x.name || '').toLowerCase()] = 1; });
    [true, false].forEach(function (freshOnly) {
      mktRank(p).forEach(function (r) { var k = String(r.m.business || '').toLowerCase(); if (n >= room || biz[k] || (freshOnly && r.used.length) || p.items.some(function (x) { return x.pid === r.m.id; })) return; biz[k] = 1; p.items.push(itemOfMkt(r.m)); n++; });
    });
    return n;
  }
  function blankMkt(cat) {
    var max = 0; partsOf('market:' + String(cat || 'all').toLowerCase()).forEach(function (p) { max = Math.max(max, p.part); });
    return { kind: 'market', cat: cat || '', city: '', part: max + 1, noPart: false, l1: cat ? 'Marketplace Finds: ' + cat : 'Marketplace Finds from Nigerian Businesses', l2: '', showPrice: true,
      end: { on: true, t1: 'Shop these and more', t2: 'on the Auntie Tobi Marketplace', t3: 'auntietobi.co.uk/marketplace' }, endImg: '', coverImg: '', coverPos: { x: 0, y: 0, z: 1 }, items: [], caption: '', status: 'draft' };
  }
  function hasEnd(p) { return isMkt(p) && p.end && p.end.on !== false; }
  function slideCount(p) { return p.items.length + (hasEnd(p) ? 1 : 0); }
  function who(it) { return it.handle ? '@' + String(it.handle).replace(/^@/, '') : (it.name || ''); }
  function itemOf(b) { return { slug: b.slug, name: b.name, handle: b.ig, town: town(b), cat: catOf(b), img: '', pos: { x: 0, y: 0, z: 1 } }; }
  function blankGen() {
    var max = 0; partsOf('general').forEach(function (p) { max = Math.max(max, p.part); });
    return { kind: 'general', city: '', cat: '', part: max + 1, noPart: false, line: 'both', l1: 'Nigerian Businesses You Should Know', l2: '', coverImg: '', coverPos: { x: 0, y: 0, z: 1 }, items: [], caption: '', status: 'draft' };
  }
  // ✨ for adverts: Business Club members first (claimed, with a photo), not already in this post, up to 10
  function fillClub(p) {
    var have = p.items.map(function (x) { return x.slug; }), room = 10 - p.items.length, n = 0;
    rankList(p, have).filter(function (r) { return club(r.b); }).sort(function (a, c) { return (a.used.length - c.used.length) || ((c.b.img ? 1 : 0) - (a.b.img ? 1 : 0)) || a.b.name.localeCompare(c.b.name); })
      .forEach(function (r) { if (n < room) { p.items.push(itemOf(r.b)); n++; } });
    return n;
  }
  // everything this business has been in (any kind of post) — shown, never blocking, in General posts
  function everIn(slug, exceptId) { return (X.S.disc || []).filter(function (q) { return q.id !== exceptId && q.items.some(function (x) { return x.slug === slug; }); }); }
  // 📣 "listed before": every other post a business has been in (newest first), as small tags
  function prevTags(slug, handle, exceptId, max) {
    var L = (X.S.disc || []).filter(function (q) { return q.id !== exceptId && q.items.some(function (x) { return slug ? x.slug === slug : String(x.handle).toLowerCase() === String(handle || '').toLowerCase(); }); })
      .sort(function (a, b) { return String(b.postedAt || b.updatedAt || '').localeCompare(String(a.postedAt || a.updatedAt || '')); });
    if (!L.length) return '';
    return L.slice(0, max || 3).map(function (u) { return '<span class="ak" style="background:#EEF0F3;color:#4B5563" title="' + esc(head(u)) + '">📣 ' + esc(head(u)) + (u.status === 'posted' ? ' · ' + esc(fmt(u.postedAt)) : ' · draft') + '</span>'; }).join(' ') +
      (L.length > (max || 3) ? ' <span class="muted" style="font-size:12px">+' + (L.length - (max || 3)) + ' more</span>' : '');
  }
  function prevCount(it, exceptId) { if (it.pid) return mktUsed(it.pid, exceptId); return (X.S.disc || []).filter(function (q) { return q.id !== exceptId && q.items.some(function (x) { return it.slug ? x.slug === it.slug : String(x.handle).toLowerCase() === String(it.handle || '').toLowerCase(); }); }); }
  function blankCity(city) {
    var max = 0; partsOf('city:' + city.toLowerCase()).forEach(function (p) { max = Math.max(max, p.part); });
    return { kind: 'city', city: city, cat: '', part: max + 1, l1: 'Nigerian Businesses in ' + city, l2: '', coverImg: '', coverPos: { x: 0, y: 0, z: 1 }, items: [], caption: '', status: 'draft' };
  }
  function blank(cat) {
    var max = 0; partsOf(cat).forEach(function (p) { max = Math.max(max, p.part); });
    return { cat: cat, part: max + 1, l1: 'Nigerian ' + title(cat), l2: 'in the UK', coverImg: '', coverPos: { x: 0, y: 0, z: 1 }, items: [], caption: '', status: 'draft' };
  }

  // ── pictures ──
  function imgFrom(src) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; }); }
  async function photo(id) { if (!id) return null; if (!imgs[id]) imgs[id] = X.api('disc-img', { id: id }).then(function (r) { return imgFrom(r.dataUrl); }, function () { return null; }); return imgs[id]; }
  async function dirPhoto(slug) { if (!slug) return null; if (!dirPics[slug]) dirPics[slug] = X.api('disc-dirpic', { slug: slug }).then(function (r) { return r.dataUrl ? imgFrom(r.dataUrl) : null; }, function () { return null; }); return dirPics[slug]; }
  var mktPics = {};
  async function mktPhoto(pid) { if (!pid) return null; if (!mktPics[pid]) mktPics[pid] = X.api('disc-mktpic', { id: pid }).then(function (r) { return r.dataUrl ? imgFrom(r.dataUrl) : null; }, function () { return null; }); return mktPics[pid]; }
  async function itemPhoto(it) { return (it.img && await photo(it.img)) || (it.pid ? await mktPhoto(it.pid) : null) || await dirPhoto(it.slug); }
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
    var text = head(p).replace(' – Part ', ' - Part ').toUpperCase();
    var bw = W * 0.92, bx = (W - bw) / 2, inner = bw - 110, s = 70, lines;
    do { ctx.font = '700 ' + s + 'px ' + FT; lines = wrap(ctx, text.split(/\s+/), inner); s -= 2; } while ((lines.length > 3 || lines.some(function (l) { return ctx.measureText(l).width > inner; })) && s > 30);
    s += 2; var lh = s * 1.42, bh = lines.length * lh + 96, by = H - bh - 56;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.14)'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + s + 'px ' + FT;
    lines.forEach(function (l, i) { ctx.fillText(l, W / 2, by + 48 + lh * (i + 0.5)); });
    ctx.textAlign = 'left';
  }
  function drawBiz(ctx, it, im, city, gen) {
    drawPhoto(ctx, im, it.pos, it.name);
    var a = '@' + String(it.handle || '').replace(/^@/, ''), b = gen ? line(gen, it) : city ? String(it.cat || '').trim() : it.town ? '📍 ' + it.town : '';
    var s = 50; ctx.font = '700 ' + s + 'px ' + FT;
    var tw = Math.max(ctx.measureText(a).width, b ? ctx.measureText(b).width : 0);
    if (tw > W - 140) { s = Math.floor(s * (W - 140) / tw); ctx.font = '700 ' + s + 'px ' + FT; tw = Math.max(ctx.measureText(a).width, b ? ctx.measureText(b).width : 0); }
    var bw = Math.max(W * 0.62, tw + 76), bh = (b ? 2 : 1) * s * 1.3 + 46, bx = 26, by = H - bh - 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3.5, by + 3.5, bw - 7, bh - 7);
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(a, bx + 36, by + 23 + s * 0.65); if (b) ctx.fillText(b, bx + 30, by + 23 + s * 1.95);
  }
  // 🛍️ product slide: photo + white box with the product name, price (if on) and @handle
  function drawProd(ctx, it, im, p) {
    drawPhoto(ctx, im, it.pos, it.prod || it.name);
    var nm = String(it.prod || '').trim(), pr = p.showPrice !== false ? String(it.price || '').trim() : '', h = who(it);
    if (pr && /^\d/.test(pr)) pr = '£' + pr;
    var maxW = W - 140, s = 50; ctx.font = '700 ' + s + 'px ' + FT;
    var L = wrap(ctx, nm.split(/\s+/), maxW); if (L.length > 2) { L = L.slice(0, 2); L[1] = L[1].replace(/\s*\S*$/, '') + '…'; }
    var small = 40, widths = L.map(function (l) { return ctx.measureText(l).width; });
    ctx.font = '600 ' + small + 'px ' + FT; widths.push(ctx.measureText(h).width); if (pr) { ctx.font = '800 ' + (small + 4) + 'px ' + FT; widths.push(ctx.measureText(pr).width); }
    var tw = Math.max.apply(null, widths.concat([0])), rows = L.length + (pr ? 1 : 0) + (h ? 1 : 0);
    var bw = Math.min(W - 52, Math.max(W * 0.62, tw + 80)), bh = L.length * s * 1.22 + (pr ? (small + 4) * 1.35 : 0) + (h ? small * 1.35 : 0) + 50, bx = 26, by = H - bh - 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3.5, by + 3.5, bw - 7, bh - 7);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; var y = by + 25;
    ctx.fillStyle = INK; ctx.font = '700 ' + s + 'px ' + FT; L.forEach(function (l) { ctx.fillText(l, bx + 36, y + s * 0.61); y += s * 1.22; });
    if (pr) { ctx.fillStyle = GREEN; ctx.font = '800 ' + (small + 4) + 'px ' + FT; ctx.fillText(pr, bx + 36, y + (small + 4) * 0.68); y += (small + 4) * 1.35; }
    if (h) { ctx.fillStyle = '#374151'; ctx.font = '600 ' + small + 'px ' + FT; ctx.fillText(h, bx + 36, y + small * 0.68); }
    return rows;
  }
  // 🛍️ last slide: your words on a green background (or your photo) in a white box
  function drawEnd(ctx, p, im) {
    if (im) drawPhoto(ctx, im, p.endPos); else { ctx.fillStyle = GREEN; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; for (var i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(rnd(i) * W, rnd(i + 9) * H, 90 + rnd(i + 3) * 160, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    var e = p.end || {}, t1 = String(e.t1 || '').trim(), t2 = String(e.t2 || '').trim(), t3 = String(e.t3 || '').trim();
    var bw = W * 0.86, bx = (W - bw) / 2, inner = bw - 100;
    var s1 = 74, L1; do { ctx.font = '800 ' + s1 + 'px ' + FT; L1 = t1 ? wrap(ctx, t1.split(/\s+/), inner) : []; s1 -= 2; } while (L1.length > 3 && s1 > 36); s1 += 2;
    var s2 = 50, L2; do { ctx.font = '600 ' + s2 + 'px ' + FT; L2 = t2 ? wrap(ctx, t2.split(/\s+/), inner) : []; s2 -= 2; } while (L2.length > 3 && s2 > 28); s2 += 2;
    var s3 = fit(ctx, t3, '800', 46, inner);
    var bh = L1.length * s1 * 1.2 + L2.length * s2 * 1.3 + (t3 ? s3 * 1.6 + 20 : 0) + 110, by = (H - bh) / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = GREEN; ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; var y = by + 55;
    ctx.fillStyle = INK; ctx.font = '800 ' + s1 + 'px ' + FT; L1.forEach(function (l) { ctx.fillText(l, W / 2, y + s1 * 0.6); y += s1 * 1.2; });
    ctx.fillStyle = '#374151'; ctx.font = '600 ' + s2 + 'px ' + FT; L2.forEach(function (l) { ctx.fillText(l, W / 2, y + s2 * 0.65); y += s2 * 1.3; });
    if (t3) { y += 20; brush(ctx, W / 2 - Math.min(inner, ctx.measureText(t3).width + 120) / 2, y + s3 * 0.5, Math.min(inner, ctx.measureText(t3).width + 120)); ctx.fillStyle = INK; ctx.font = '800 ' + s3 + 'px ' + FT; ctx.fillText(t3, W / 2, y + s3 * 0.6); }
    ctx.textAlign = 'left';
  }
  async function render(p, i, scale) {
    var c = document.createElement('canvas'); c.width = W * (scale || 1); c.height = H * (scale || 1);
    var ctx = c.getContext('2d'); ctx.scale(scale || 1, scale || 1);
    if (i < 0) drawCover(ctx, p, await photo(p.coverImg)); else if (i >= p.items.length) drawEnd(ctx, p, await photo(p.endImg)); else if (isMkt(p)) drawProd(ctx, p.items[i], await itemPhoto(p.items[i]), p); else drawBiz(ctx, p.items[i], await itemPhoto(p.items[i]), isCity(p), isGen(p) ? p : null);
    return c;
  }
  async function fontsReady() { try { await document.fonts.load('700 50px Inter'); } catch (e) {} }

  // ── caption ──
  function hashtags(cat) {
    var t = title(cat).replace(/[^A-Za-z0-9]/g, '');
    return ['#Nigerian' + t + 'UK', '#' + t + 'UK', '#NigerianBusinessesUK', '#SupportNigerianBusinesses', '#AuntieTobi'].join(' ');   // Instagram allows 5
  }
  function cityTags(city) {
    var t = title(city).replace(/[^A-Za-z0-9]/g, '');
    return ['#NigeriansIn' + t, '#' + t + 'Business', '#NigerianBusinessesUK', '#SupportNigerianBusinesses', '#AuntieTobi'].join(' ');   // Instagram allows 5
  }
  function caption(p) {
    if (isMkt(p)) {
      var sp = p.showPrice !== false;
      return '🛍️ ' + head(p) + ' 💚\n\n' +
        (p.cat ? 'Lovely ' + p.cat.toLowerCase() + ' finds from Nigerian businesses in the UK 👇🏾' : 'Lovely finds from Nigerian businesses in the UK 👇🏾') + '\n\n' +
        p.items.map(function (x, i) { var pr = sp && x.price ? (/^\d/.test(x.price) ? '£' + x.price : x.price) : ''; return (i + 1) + '. ' + (x.prod || '') + (pr ? ' — ' + pr : '') + (x.handle || x.name ? ' · ' + who(x) : ''); }).join('\n') +
        '\n\n🛒 Shop these and more on the Auntie Tobi Marketplace — link in bio\n📌 Save this for later · 📤 Share with a friend\n💚 Sell on the Auntie Tobi Marketplace too — join the Business Club\n\n' +
        ['#NigerianBusinessesUK', '#ShopNigerian', '#SupportSmallBusiness', '#NigeriansInUK', '#AuntieTobi'].join(' ');
    }
    if (isGen(p)) {
      return '🇳🇬 ' + head(p) + ' 💚\n\n' +
        'Support these amazing Nigerian businesses in the UK 👇🏾\n\n' +
        p.items.map(function (x, i) { var bits = [x.cat, x.town ? '📍 ' + x.town : ''].filter(Boolean).join(' · '); return (i + 1) + '. @' + x.handle + (bits ? ' — ' + bits : ''); }).join('\n') +
        '\n\n💚 Follow, save and share to show them some love\n📌 Save this for later · 📤 Share with a friend\n💚 Find more Nigerian businesses near you on the Auntie Tobi app — link in bio\n\n' +
        '🔎 Nigerian businesses UK · Nigerian-owned businesses near me\n\n' + ['#NigerianBusinessesUK', '#SupportNigerianBusinesses', '#SupportSmallBusiness', '#NigeriansInUK', '#AuntieTobi'].join(' ');
    }
    if (isCity(p)) {
      var c = p.city;
      return '🇳🇬 ' + head(p) + ' 💚\n\n' +
        'Looking for Nigerian businesses in ' + c + '? Here are ' + p.items.length + ' amazing local businesses to support 👇🏾\n\n' +
        p.items.map(function (x, i) { return (i + 1) + '. @' + x.handle + (x.cat ? ' — ' + x.cat : ''); }).join('\n') +
        '\n\nKnow a great Nigerian business in ' + c + ' we should feature next? Tell us in the comments 👇🏾\n\n' +
        '📌 Save this for later · 📤 Share with a friend in ' + c + '\n💚 Find more Nigerian businesses near you on the Auntie Tobi app — link in bio\n\n' +
        '🔎 Nigerian businesses in ' + c + ' · Nigerian food, beauty and services in ' + c + '\n\n' + cityTags(c);
    }
    var what = String(p.cat || 'businesses').toLowerCase();
    return '🇳🇬 ' + head(p) + ' 💚\n\n' +
      'Looking for Nigerian ' + what + ' near you? Here are ' + p.items.length + ' amazing businesses across the UK 👇🏾\n\n' +
      p.items.map(function (x, i) { return (i + 1) + '. @' + x.handle + (x.town ? ' — 📍 ' + x.town : ''); }).join('\n') +
      '\n\nKnow a great Nigerian ' + what.replace(/s$/, '') + ' we should feature next? Tell us in the comments 👇🏾\n\n' +
      '📌 Save this for later · 📤 Share with a friend\n💚 Find more Nigerian businesses near you on the Auntie Tobi app — link in bio\n\n' +
      '🔎 Nigerian ' + what + ' in the UK · Nigerian ' + what + ' near me\n\n' + hashtags(p.cat);
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
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><b>＋ New discovery post</b>' +
      '<div class="row" style="gap:6px;margin:8px 0 6px"><button class="btn sm ' + (X.S.discMode === 'city' || X.S.discMode === 'gen' ? 'ghost' : 'primary') + '" data-dm="cat">🏷️ By category</button><button class="btn sm ' + (X.S.discMode === 'city' ? 'primary' : 'ghost') + '" data-dm="city">🏙️ By city</button><button class="btn sm ' + (X.S.discMode === 'gen' ? 'primary' : 'ghost') + '" data-dm="gen">✨ General / Advert</button><button class="btn sm ' + (X.S.discMode === 'mkt' ? 'primary' : 'ghost') + '" data-dm="mkt">🛍️ Marketplace products</button></div>' +
      (X.S.discMode === 'mkt' ? (X.S.discMkt ? '<p class="muted" style="font-size:13px;margin:4px 0 8px">Live Marketplace products with a photo. HQ picks up to 10 — <b>one per business</b>, not featured before first — and you can change any of them, the title, prices on or off and the last slide.</p><div class="row" style="gap:8px;flex-wrap:wrap"><select id="dcMkt" style="flex:1;min-width:200px"><option value="">All categories — ' + mktProducts({}).length + ' products</option>' + (function () { var c = {}; mktProducts({}).forEach(function (m) { c[m.category] = (c[m.category] || 0) + 1; }); return Object.keys(c).sort().map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + ' — ' + c[k] + ' product' + (c[k] === 1 ? '' : 's') + '</option>'; }).join(''); })() + '</select><button class="btn primary" id="dcNewMkt">✨ Start</button></div></div>' : '<p class="muted">Loading Marketplace products…</p></div>') :
      (X.S.discMode === 'gen' ? '<p class="muted" style="font-size:13px;margin:4px 0 8px">For adverts and mixed posts: any title (with or without “Part”), any businesses from the whole directory — add them yourself, or fill with Business Club members.</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" id="dcNewGen">✨ Start a general post</button></div></div>'
      : X.S.discMode === 'city' ? '<p class="muted" style="font-size:13px;margin:4px 0 8px">Choose a town or city. HQ picks up to 10 businesses with Instagram — <b>one per category</b>, claimed first, not featured in this city before — and you can change any of them or the title.</p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><select id="dcCity" style="flex:1;min-width:200px">' + cities().filter(function (c) { return c.ig; }).map(function (c) { var n = partsOf('city:' + c.city.toLowerCase()).length; return '<option value="' + esc(c.city) + '">' + esc(c.city) + ' — ' + c.ig + ' with Instagram · ' + c.nc + ' categor' + (c.nc === 1 ? 'y' : 'ies') + (n ? ' · ' + n + ' post' + (n > 1 ? 's' : '') + ' so far' : '') + '</option>'; }).join('') + '</select><button class="btn primary" id="dcNewCity">✨ Start Part …</button></div></div>'
      : '<p class="muted" style="font-size:13px;margin:4px 0 8px">Choose a category from your Business directory. HQ picks 10 businesses with Instagram — claimed first, from different towns, not featured before — and you can change any of them.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><select id="dcCat" style="flex:1;min-width:200px">' + C.filter(function (c) { return c.ig; }).map(function (c) { var n = partsOf(c.cat).length; return '<option value="' + esc(c.cat) + '">' + esc(title(c.cat)) + ' — ' + c.ig + ' with Instagram' + (n ? ' · ' + n + ' post' + (n > 1 ? 's' : '') + ' so far' : '') + '</option>'; }).join('') + '</select><button class="btn primary" id="dcNew">✨ Start Part …</button></div></div>')) +
      '<div class="card" style="padding:4px 14px">' + (P.length ? P.map(function (p) {
        return '<div class="aprow" style="cursor:pointer;flex-direction:row;align-items:center;flex-wrap:nowrap" data-dp="' + p.id + '"><div style="flex:1;min-width:0">' + (isMkt(p) ? '<span title="Marketplace post">🛍️</span> ' : isCity(p) ? '<span title="City post">🏙️</span> ' : isGen(p) ? '<span title="General / advert post">✨</span> ' : '') + '<b>' + esc(head(p)) + '</b> ' +
          (p.status === 'posted' ? '<span class="ak" style="background:#057A44">✅ Posted ' + esc(fmt(p.postedAt)) + '</span>' : '<span class="ak" style="background:#EEF0F3;color:#6B7280">Draft</span>') +
          '<div class="muted" style="font-size:12.5px">' + p.items.length + (isMkt(p) ? ' products' : ' businesses') + ' · ' + esc(p.items.map(function (x) { return isMkt(p) ? x.prod : isCity(p) || isGen(p) ? x.cat : x.town; }).filter(Boolean).filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 5).join(', ')) + '</div></div>' + (p.status === 'posted' ? '<button class="btn ghost sm" data-dboost="' + p.id + '" title="After posting checklist" style="margin-right:6px">🚀</button>' : '') + '<span style="font-size:20px;color:#9CA3AF">›</span></div>';
      }).join('') : '<p class="muted" style="padding:12px 0">No discovery posts yet.</p>') + '</div></div>';
    $$('[data-dm]').forEach(function (b) { b.onclick = function () { X.S.discMode = b.dataset.dm; listPage(); }; });
    if (X.S.discMode === 'mkt' && !X.S.discMkt) loadMkt().then(listPage, function (e) { X.toast(e.message); });
    if ($('#dcMkt')) {
      var syncM = function () { var n = 0; partsOf('market:' + ($('#dcMkt').value || 'all').toLowerCase()).forEach(function (p) { n = Math.max(n, p.part); }); $('#dcNewMkt').textContent = '✨ Start Part ' + roman(n + 1); };
      $('#dcMkt').onchange = syncM; syncM();
      $('#dcNewMkt').onclick = function () { var p = blankMkt($('#dcMkt').value), n = autoPickMkt(p); p.caption = caption(p); X.S.discEdit = p; X.toast(n ? 'Picked ' + n + ' products, one per business — change anything you like' : 'No Marketplace products with photos yet'); view(); };
    }
    $$('[data-dboost]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var p = (X.S.disc || []).filter(function (q) { return q.id === b.dataset.dboost; })[0]; if (p) boost(p); }; });
    if ($('#dcNewGen')) $('#dcNewGen').onclick = function () { var p = blankGen(); p.caption = caption(p); X.S.discEdit = p; view(); setTimeout(function () { picker(X.S.discEdit); }, 50); };
    if ($('#dcCity')) {
      var syncC = function () { var n = 0; partsOf('city:' + $('#dcCity').value.toLowerCase()).forEach(function (p) { n = Math.max(n, p.part); }); $('#dcNewCity').textContent = '✨ Start Part ' + roman(n + 1); };
      $('#dcCity').onchange = syncC; syncC();
      $('#dcNewCity').onclick = function () { var c = $('#dcCity').value; if (!c) return; var p = blankCity(c), n = autoPick(p); p.caption = caption(p); X.S.discEdit = p; X.toast(n ? 'Picked ' + n + ' businesses, one per category — change anything you like' : 'No new businesses with Instagram in ' + c + ' — add some by hand'); view(); };
    }
    if (!$('#dcCat')) { $$('[data-dp]').forEach(function (r) { r.onclick = function () { var p = (X.S.disc || []).filter(function (q) { return q.id === r.dataset.dp; })[0]; if (p) { X.S.discEdit = JSON.parse(JSON.stringify(p)); view(); } }; }); return; }
    var sync = function () { var c = $('#dcCat').value, n = 0; partsOf(c).forEach(function (p) { n = Math.max(n, p.part); }); $('#dcNew').textContent = '✨ Start Part ' + roman(n + 1); };
    if ($('#dcCat')) { $('#dcCat').onchange = sync; sync(); }
    $('#dcNew').onclick = function () { var c = $('#dcCat').value; if (!c) return; var p = blank(c), n = autoPick(p); p.caption = caption(p); X.S.discEdit = p; X.toast(n ? 'Picked ' + n + ' businesses — change anything you like' : 'No new businesses with Instagram in this category — add some by hand'); view(); };
    $$('[data-dp]').forEach(function (r) { r.onclick = function () { var p = (X.S.disc || []).filter(function (q) { return q.id === r.dataset.dp; })[0]; if (p) { X.S.discEdit = JSON.parse(JSON.stringify(p)); view(); } }; });
  }

  // ── editor ──
  var thumbs = 0;
  async function paintThumbs(p) {
    var run = ++thumbs; await fontsReady();
    for (var i = -1; i < slideCount(p); i++) {
      var el = $('[data-th="' + i + '"]'); if (!el) continue;
      var c = await render(p, i, 0.25); if (run !== thumbs) return;
      el.innerHTML = ''; c.style.width = '100%'; c.style.display = 'block'; c.style.borderRadius = '8px'; el.appendChild(c);
    }
  }
  function editor() {
    var p = X.S.discEdit, posted = p.status === 'posted';
    if (isMkt(p) && !X.S.discMkt) { $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>'; loadMkt().then(editor, function (e) { X.toast(e.message); }); return; }
    if (isMkt(p) && !p.end) p.end = { on: true, t1: 'Shop these and more', t2: 'on the Auntie Tobi Marketplace', t3: 'auntietobi.co.uk/marketplace' };
    $('#ttl').textContent = head(p);
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn ghost" id="deBack">‹ All posts</button><button class="btn primary" id="deSave">💾 Save</button><button class="btn gold" id="deZip">⬇️ Download ZIP</button><button class="btn gold" id="deEach">🖼️ Download all photos</button>' + (navigator.canShare ? '<button class="btn ghost" id="deShare">📲 Save to phone</button>' : '') + (posted ? '<button class="btn ghost" id="deTell">🎉 Tell the businesses</button><button class="btn primary" id="deBoost">🚀 After posting</button>' : '<button class="btn ghost" id="dePost">✅ Mark as posted</button>') + (p.id ? '<button class="btn ghost" id="deDel" style="color:#B42318">🗑</button>' : '') + '</div>' +
      (posted ? '<div class="note" style="margin-bottom:12px">✅ Posted ' + esc(fmt(p.postedAt)) + (p.postUrl ? ' · <a href="' + esc(p.postUrl) + '" target="_blank" rel="noopener">View on Instagram</a>' : '') + ' — each business’s timeline in Business directory shows it. <button class="btn link" id="deUnpost" style="font-size:13px">Undo</button></div>' : '') +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><b>🎯 Cover</b><div class="row" style="gap:12px;align-items:flex-start;margin-top:8px;flex-wrap:wrap"><div data-th="-1" data-open="-1" style="width:150px;cursor:pointer;background:#EEE;border-radius:8px;aspect-ratio:4/5"></div><div style="flex:1;min-width:200px" class="stack">' +
      (isCity(p) || isGen(p) || isMkt(p) ? '<div><label for="deL1">Title <span class="muted" style="font-weight:400">— write anything you like</span></label><input id="deL1" value="' + esc(p.l1) + '" maxlength="90" placeholder="' + (isMkt(p) ? 'Marketplace Finds' : isGen(p) ? 'Nigerian Businesses You Should Know' : 'Nigerian Businesses in ' + esc(p.city)) + '"><input id="deL2" type="hidden" value=""></div>'
        : '<div><label>Title</label><input id="deL1" value="' + esc(p.l1) + '" placeholder="Nigerian Caterers"><input id="deL2" value="' + esc(p.l2) + '" placeholder="in the UK" style="margin-top:6px"></div>') +
      '<div class="row" style="gap:8px;align-items:center"><label style="margin:0">Part</label><input id="dePt" type="number" min="1" max="99" value="' + p.part + '" style="width:80px"><span class="muted" id="dePtR">= Part ' + roman(p.part) + '</span>' + '<label style="margin:0 0 0 8px;display:flex;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="deNoPart"' + (p.noPart ? ' checked' : '') + ' style="width:18px;height:18px"> No “Part” on this post</label></div>' +
      (isMkt(p) ? '<label style="margin:0;display:flex;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="dePrice"' + (p.showPrice !== false ? ' checked' : '') + ' style="width:18px;height:18px"> Show prices on the slides</label>' : '') +
      (isGen(p) ? '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><label for="deLine" style="margin:0">Under each @handle</label><select id="deLine" style="width:auto">' + [['both', 'Category · 📍 Town'], ['cat', 'Category'], ['town', '📍 Town']].map(function (o) { return '<option value="' + o[0] + '"' + ((p.line || 'both') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '') +
      '<button class="btn ghost sm" data-open="-1">📷 Cover photo &amp; position</button></div></div></div>' +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>' + (isMkt(p) ? '🛍️ Products (' : '🏪 Businesses (') + p.items.length + ')</b><div class="row" style="gap:6px"><button class="btn ghost sm" id="deAuto">' + (isGen(p) ? '⭐ Fill with Club members' : '✨ Fill to 10') + '</button><button class="btn ghost sm" id="deAdd">＋ Add</button></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:4px 0 10px">' + (isMkt(p) ? 'Up to 12 products. Tap a slide to change the photo, product name, price or @handle. The product’s Marketplace photo is used unless you upload another.</p>' : isGen(p) ? 'Any businesses you like, up to 12. Tap a slide to change the photo, @handle, category or town.' : isCity(p) ? 'One business per category. Tap a slide to change the photo, @handle or category.' : 'Tap a slide to change the photo, @handle or town.') + (isMkt(p) ? '' : ' For the best slides, upload a photo from their Instagram.</p>') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">' + p.items.map(function (x, i) {
        return '<div style="background:#fff;border:1px solid #ECE6D6;border-radius:10px;padding:6px"><div data-th="' + i + '" data-open="' + i + '" style="cursor:pointer;background:#EEE;border-radius:8px;aspect-ratio:4/5"></div><div style="font-size:12.5px;font-weight:700;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (i + 1) + '. ' + esc(isMkt(p) ? (x.prod || '') : '@' + x.handle) + '</div><div class="muted" style="font-size:12px">' + esc((isMkt(p) ? [p.showPrice !== false && x.price ? x.price : '', who(x)].filter(Boolean).join(' · ') : isGen(p) ? line(p, x).replace('📍 ', '') : isCity(p) ? x.cat : x.town) || '—') + '</div>' + (function () { var pv = prevCount(x, p.id); return pv.length ? '<div style="font-size:11.5px;font-weight:700;color:#8A5A00;margin-top:2px" title="' + esc(pv.map(function (u) { return head(u) + (u.status === 'posted' ? ' (' + fmt(u.postedAt) + ')' : ' (draft)'); }).join('\n')) + '">📣 Featured ' + pv.length + '× before</div>' : '<div style="font-size:11.5px;font-weight:700;color:#057A44;margin-top:2px">🆕 First time</div>'; })() + '<div class="row" style="gap:4px;margin-top:4px"><button class="btn ghost sm" data-up="' + i + '" style="padding:4px 8px"' + (i ? '' : ' disabled') + '>↑</button><button class="btn ghost sm" data-dn="' + i + '" style="padding:4px 8px"' + (i < p.items.length - 1 ? '' : ' disabled') + '>↓</button><button class="btn ghost sm" data-rm="' + i + '" style="padding:4px 8px;margin-left:auto">✖</button></div></div>';
      }).join('') + '</div></div>' +
      (isMkt(p) ? '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>🏁 Last slide</b><label style="margin:0;display:flex;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="deEndOn"' + (hasEnd(p) ? ' checked' : '') + ' style="width:18px;height:18px"> Add a last slide</label></div>' +
        (hasEnd(p) ? '<div class="row" style="gap:12px;align-items:flex-start;margin-top:8px;flex-wrap:wrap"><div data-th="' + p.items.length + '" style="width:150px;background:#EEE;border-radius:8px;aspect-ratio:4/5"></div><div style="flex:1;min-width:200px" class="stack">' +
          '<div><label for="deE1">Big line</label><input id="deE1" maxlength="60" value="' + esc(p.end.t1 || '') + '"></div><div><label for="deE2">Second line</label><input id="deE2" maxlength="70" value="' + esc(p.end.t2 || '') + '"></div><div><label for="deE3">Highlighted line <span class="muted" style="font-weight:400">— e.g. the web address</span></label><input id="deE3" maxlength="70" value="' + esc(p.end.t3 || '') + '"></div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap"><label class="btn ghost sm" style="margin:0">📷 ' + (p.endImg ? 'Change background photo' : 'Background photo (optional)') + '<input type="file" id="deEndF" accept="image/*" hidden></label>' + (p.endImg ? '<button class="btn ghost sm" id="deEndX">Use green background</button>' : '') + '</div></div></div>' : '') + '</div>' : '') +
      '<div class="card" style="padding:14px 16px"><div class="row" style="justify-content:space-between;align-items:center"><b>✍️ Caption</b><div class="row" style="gap:6px"><button class="btn ghost sm" id="deCapNew">↻ Rewrite from the list</button><button class="btn ghost sm" id="deCapCopy">📋 Copy</button></div></div><textarea id="deCap" rows="12" style="margin-top:8px;font-size:14px">' + esc(p.caption || caption(p)) + '</textarea><div class="muted" style="font-size:12px;margin-top:4px" id="deCapN"></div></div></div>';
    var read = function () { p.l1 = $('#deL1').value; p.l2 = $('#deL2').value; p.part = Math.max(1, parseInt($('#dePt').value, 10) || 1); p.caption = $('#deCap').value; if ($('#deNoPart')) p.noPart = $('#deNoPart').checked; if ($('#deLine')) p.line = $('#deLine').value; if ($('#dePrice')) p.showPrice = $('#dePrice').checked; if ($('#deE1')) { p.end.t1 = $('#deE1').value; p.end.t2 = $('#deE2').value; p.end.t3 = $('#deE3').value; } };
    var capN = function () { $('#deCapN').textContent = $('#deCap').value.length + ' / 2,200 characters'; }; $('#deCap').oninput = capN; capN();
    var auto = caption(p);   // the caption follows the title while you haven't changed it yourself
    var tm; ['#deL1', '#deL2', '#dePt', '#deNoPart', '#deLine', '#dePrice', '#deE1', '#deE2', '#deE3'].forEach(function (id) { if ($(id)) $(id).oninput = $(id).onchange = function () { clearTimeout(tm); tm = setTimeout(function () { var was = $('#deCap').value === auto; read(); if ($('#dePtR')) $('#dePtR').textContent = '= Part ' + roman(p.part); $('#ttl').textContent = head(p); if (was) { auto = caption(p); $('#deCap').value = p.caption = auto; capN(); } paintThumbs(p); }, 300); }; });
    if ($('#deLine')) $('#deLine').onchange = function () { var was = $('#deCap').value === auto; read(); if (was) p.caption = caption(p); editor(); };
    $('#deBack').onclick = function () { X.S.discEdit = null; view(); };
    if ($('#deEndOn')) $('#deEndOn').onchange = function () { read(); p.end.on = this.checked; editor(); };
    if ($('#deEndF')) $('#deEndF').onchange = async function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; read(); try { X.toast('Uploading…'); p.endImg = await upload(f); editor(); } catch (e) { X.toast(e.message); } };
    if ($('#deEndX')) $('#deEndX').onclick = function () { read(); p.endImg = ''; editor(); };
    $('#deEach').onclick = function () { read(); downloadEach(p, this); };
    $('#deSave').onclick = function () { read(); save(p).then(function () { X.toast('Saved'); }); };
    $('#deAuto').onclick = function () { read(); if (isMkt(p)) { var m = autoPickMkt(p); X.toast(m ? 'Added ' + m : 'No more products to add'); if (m) p.caption = caption(p); editor(); return; } if (isGen(p)) { var g = fillClub(p); X.toast(g ? 'Added ' + g + ' Club member' + (g === 1 ? '' : 's') : 'No more Club members with Instagram to add'); if (g) p.caption = caption(p); editor(); return; } var n = autoPick(p); X.toast(n ? 'Added ' + n : isCity(p) ? 'No more new categories with Instagram in ' + p.city : 'No more new businesses with Instagram in this category'); if (n) p.caption = caption(p); editor(); };
    $('#deAdd').onclick = function () { read(); if (isMkt(p)) mktPicker(p); else picker(p); };
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
    if ($('#deBoost')) $('#deBoost').onclick = function () { boost(p); };
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
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><label class="btn ghost sm" style="margin:0">📷 ' + (cover ? 'Cover photo' : 'Upload their photo') + '<input type="file" id="ssF" accept="image/*" hidden></label>' + (!cover && it.img ? '<button class="btn ghost sm" id="ssDir">↺ ' + (isMkt(p) ? 'Use the Marketplace photo' : 'Use directory picture') + '</button>' : '') + (!cover && it.handle ? '<a class="btn ghost sm" href="https://www.instagram.com/' + esc(it.handle) + '/" target="_blank" rel="noopener">📸 Open their Instagram</a>' : '') + '</div>' +
      (cover ? '' : isMkt(p) ? '<div style="margin-top:10px"><label for="ssP">Product name</label><input id="ssP" value="' + esc(it.prod || '') + '"></div><div class="f2" style="margin-top:8px"><div><label for="ssPr">Price</label><input id="ssPr" value="' + esc(it.price || '') + '" placeholder="£25"></div><div><label for="ssH">Instagram <span class="muted" style="font-weight:400">(or leave empty for the business name)</span></label><input id="ssH" value="' + esc(it.handle ? '@' + it.handle : '') + '"></div></div>' : isGen(p) ? '<div class="f2" style="margin-top:10px"><div><label for="ssH">Instagram</label><input id="ssH" value="@' + esc(it.handle) + '"></div><div><label for="ssC2">Category</label><input id="ssC2" value="' + esc(it.cat || '') + '"></div></div><div style="margin-top:8px"><label for="ssT">Town</label><input id="ssT" value="' + esc(it.town || '') + '"></div>' : '<div class="f2" style="margin-top:10px"><div><label for="ssH">Instagram</label><input id="ssH" value="@' + esc(it.handle) + '"></div><div><label for="ssT">' + (isCity(p) ? 'Category (on the slide)' : 'Town') + '</label><input id="ssT" value="' + esc(isCity(p) ? it.cat : it.town) + '"></div></div>') +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="ssX">Cancel</button><button class="btn primary" id="ssOk">Done</button></div>');
    var tmp = cover ? { coverImg: p.coverImg } : { img: it.img }, c = $('#ssC', s), ctx = c.getContext('2d');
    var cur = function () { var o = cover ? Object.assign({}, p, { coverImg: tmp.coverImg, coverPos: pos }) : Object.assign({}, it, { img: tmp.img, pos: pos, handle: $('#ssH', s).value.replace(/^@+/, '').trim() }, isMkt(p) ? { prod: $('#ssP', s).value.trim(), price: $('#ssPr', s).value.trim() } : isGen(p) ? { cat: $('#ssC2', s).value.trim(), town: $('#ssT', s).value.trim() } : isCity(p) ? { cat: $('#ssT', s).value.trim() } : { town: $('#ssT', s).value.trim() }); return o; };
    var im = null, paint = function () { ctx.setTransform(0.5, 0, 0, 0.5, 0, 0); if (cover) drawCover(ctx, cur(), im); else if (isMkt(p)) drawProd(ctx, cur(), im, p); else drawBiz(ctx, cur(), im, isCity(p), isGen(p) ? p : null); };
    var reload = async function () { await fontsReady(); im = cover ? await photo(tmp.coverImg) : (tmp.img ? await photo(tmp.img) : await itemPhoto(Object.assign({}, it, { img: '' }))); paint(); };
    reload();
    $('#ssZ', s).oninput = function () { pos.z = +this.value; paint(); };
    if (!cover) { $('#ssH', s).oninput = paint; if ($('#ssT', s)) $('#ssT', s).oninput = paint; if ($('#ssP', s)) { $('#ssP', s).oninput = paint; $('#ssPr', s).oninput = paint; } if ($('#ssC2', s)) $('#ssC2', s).oninput = paint; }
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
      else if (isMkt(p)) { var m = cur(); if (!m.prod) { X.toast('Add the product name'); return; } p.items[i] = Object.assign({}, it, { prod: m.prod, price: m.price, handle: m.handle, img: tmp.img, pos: pos }); }
      else { var o = cur(); if (!o.handle) { X.toast('Add their Instagram'); return; } p.items[i] = { slug: it.slug, name: it.name, handle: o.handle, town: o.town, cat: o.cat || '', img: tmp.img, pos: pos }; }
      s.remove(); editor();
    };
  }

  // add businesses by hand
  function picker(p) {
    var have = p.items.map(function (x) { return x.slug; }), L = rankList(p, have), q = '', onlyNew = false;
    var s = X.sheet('<h2>＋ Add businesses</h2><p class="muted" style="font-size:13px;margin:4px 0 8px">' + (isGen(p) ? 'Any business in your directory with Instagram — search by name, @handle, category or town. ⭐ = Business Club. A tag shows if they were already in another post.</p>' : (isCity(p) ? 'Businesses in ' + esc(p.city) + ' with Instagram — one per category, so a category already in this post is greyed out.' : esc(title(p.cat)) + ' with Instagram — claimed first.') + ' Businesses already in another part are at the bottom.</p>') + '<input id="pkQ" placeholder="🔎 Search name, @handle, category or town"><label style="display:flex;align-items:center;gap:8px;margin:8px 0 0;font-weight:600;font-size:13.5px"><input type="checkbox" id="pkNew" style="width:18px;height:18px"> Only show businesses not featured before</label><div id="pkL" style="max-height:52vh;overflow:auto;margin-top:8px"></div>' +
      '<div class="row" style="gap:8px;margin-top:10px"><input id="pkHand" placeholder="Not in the directory? @handle" style="flex:1"><input id="pkTown" placeholder="' + (isCity(p) ? 'Category' : 'Town') + '" style="width:120px">' + (isGen(p) ? '<input id="pkCat" placeholder="Category" style="width:120px">' : '') + '<button class="btn ghost sm" id="pkHandGo">＋</button></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn primary" id="pkOk">Done</button></div>');
    var draw = function () {
      var rows = L.filter(function (r) { var b = r.b; if (onlyNew && everIn(b.slug, p.id).length && !p.items.some(function (x) { return x.slug === b.slug; })) return false; return !q || (b.name + ' ' + b.ig + ' ' + b.loc + ' ' + b.cat).toLowerCase().indexOf(q) >= 0; });
      var taken = {}; if (isCity(p)) p.items.forEach(function (x) { if (x.cat) taken[x.cat.toLowerCase()] = x.slug || x.handle; });
      $('#pkL', s).innerHTML = rows.length ? rows.map(function (r) { var b = r.b, on = p.items.some(function (x) { return x.slug === b.slug; }), k = catOf(b).toLowerCase(), off = isCity(p) && !on && k && taken[k];
        return '<label class="aprow" style="flex-direction:row;align-items:center;flex-wrap:nowrap;cursor:pointer;gap:10px' + (off ? ';opacity:.5' : '') + '"><input type="checkbox" data-pk="' + esc(b.slug) + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + ' style="width:20px;height:20px;flex:none"><div style="flex:1;min-width:0"><b>' + esc(b.name) + '</b> <span class="muted">@' + esc(b.ig) + '</span><div style="margin-top:2px">' +
          (b.claimed ? '<span class="ak" style="background:#057A44">Claimed</span> ' : '<span class="ak" style="background:#FFE7A3;color:#6B4A00">Unclaimed</span> ') + (club(b) ? '<span class="ak" style="background:#0F1E36">⭐ Club</span> ' : '') + (isGen(p) ? '<span class="muted" style="font-size:12.5px">🏷️ ' + esc(catOf(b)) + (town(b) ? ' · 📍 ' + esc(town(b)) : '') + '</span> ' : isCity(p) ? '<span class="muted" style="font-size:12.5px">🏷️ ' + esc(catOf(b)) + (off ? ' — already in this post' : '') + '</span> ' : town(b) ? '<span class="muted" style="font-size:12.5px">📍 ' + esc(town(b)) + '</span> ' : '') +
          (everIn(b.slug, p.id).length ? '<div style="margin-top:3px">' + prevTags(b.slug, b.ig, p.id, 3) + '</div>' : '<div style="margin-top:3px"><span class="ak" style="background:#E8F4EC;color:#045c33">🆕 Not featured before</span></div>') + '</div></div></label>'; }).join('') : '<p class="muted">No businesses found.</p>';
      $$('[data-pk]', s).forEach(function (cb) { cb.onchange = function () { var slug = cb.dataset.pk, b = L.filter(function (r) { return r.b.slug === slug; })[0].b;
        if (cb.checked) { if (p.items.length >= 12) { cb.checked = false; X.toast('Up to 12 businesses'); return; } p.items.push(itemOf(b)); } else p.items = p.items.filter(function (x) { return x.slug !== slug; }); if (isCity(p)) draw(); }; });
    };
    draw();
    $('#pkQ', s).oninput = function () { q = this.value.toLowerCase(); draw(); };
    $('#pkNew', s).onchange = function () { onlyNew = this.checked; draw(); };
    $('#pkHandGo', s).onclick = function () { var h = $('#pkHand', s).value.replace(/^@+/, '').trim(); if (!/^[A-Za-z0-9._]{2,30}$/.test(h)) { X.toast('Type their Instagram @handle'); return; } var extra = $('#pkTown', s).value.trim(); if (isCity(p) && extra && p.items.some(function (x) { return String(x.cat || '').toLowerCase() === extra.toLowerCase(); })) { X.toast('There’s already a business in “' + extra + '” in this post'); return; } p.items.push(isGen(p) ? { slug: '', name: '@' + h, handle: h, town: extra, cat: $('#pkCat', s) ? $('#pkCat', s).value.trim() : '', img: '', pos: { x: 0, y: 0, z: 1 } } : isCity(p) ? { slug: '', name: '@' + h, handle: h, town: p.city, cat: extra, img: '', pos: { x: 0, y: 0, z: 1 } } : { slug: '', name: '@' + h, handle: h, town: extra, img: '', pos: { x: 0, y: 0, z: 1 } }); $('#pkHand', s).value = ''; $('#pkTown', s).value = ''; X.toast('Added @' + h); };
    $('#pkOk', s).onclick = function () { s.remove(); p.caption = caption(p); editor(); };
  }

  // 🛍️ add Marketplace products by hand
  function mktPicker(p) {
    var q = '', onlyNew = false;
    var s = X.sheet('<h2>＋ Add products</h2><p class="muted" style="font-size:13px;margin:4px 0 8px">Live Marketplace products with a photo' + (p.cat ? ' in ' + esc(p.cat) : '') + '. A tag shows if a product was already in another post.</p><input id="pkQ" placeholder="🔎 Search product, business or category"><label style="display:flex;align-items:center;gap:8px;margin:8px 0 0;font-weight:600;font-size:13.5px"><input type="checkbox" id="pkNew" style="width:18px;height:18px"> Only show products not featured before</label><div id="pkL" style="max-height:56vh;overflow:auto;margin-top:8px"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn primary" id="pkOk">Done</button></div>');
    var draw = function () {
      var rows = mktProducts(p).filter(function (m) { if (onlyNew && mktUsed(m.id, p.id).length && !p.items.some(function (x) { return x.pid === m.id; })) return false; return !q || (m.name + ' ' + m.business + ' ' + m.category).toLowerCase().indexOf(q) >= 0; });
      $('#pkL', s).innerHTML = rows.length ? rows.map(function (m) { var on = p.items.some(function (x) { return x.pid === m.id; }), used = mktUsed(m.id, p.id), ig = igOf(m.bizSlug).ig;
        return '<label class="aprow" style="flex-direction:row;align-items:center;flex-wrap:nowrap;cursor:pointer;gap:10px"><input type="checkbox" data-pkm="' + esc(m.id) + '"' + (on ? ' checked' : '') + ' style="width:20px;height:20px;flex:none"><div style="flex:1;min-width:0"><b>' + esc(m.name) + '</b>' + (m.price ? ' <span style="color:#057A44;font-weight:700">' + esc(m.price) + '</span>' : '') + '<div class="muted" style="font-size:12.5px">' + esc(m.business) + (ig ? ' · @' + esc(ig) : '') + ' · 🏷️ ' + esc(m.category) + '</div>' +
          '<div style="margin-top:3px">' + (used.length ? used.slice(0, 3).map(function (u) { return '<span class="ak" style="background:#EEF0F3;color:#4B5563">📣 ' + esc(head(u)) + (u.status === 'posted' ? ' · ' + esc(fmt(u.postedAt)) : ' · draft') + '</span>'; }).join(' ') : '<span class="ak" style="background:#E8F4EC;color:#045c33">🆕 Not featured before</span>') + '</div></div></label>'; }).join('') : '<p class="muted">No products found.</p>';
      $$('[data-pkm]', s).forEach(function (cb) { cb.onchange = function () { var id = cb.dataset.pkm, m = (X.S.discMkt || []).filter(function (x) { return x.id === id; })[0];
        if (cb.checked) { if (p.items.length >= 12) { cb.checked = false; X.toast('Up to 12 products'); return; } p.items.push(itemOfMkt(m)); } else p.items = p.items.filter(function (x) { return x.pid !== id; }); }; });
    };
    draw();
    $('#pkQ', s).oninput = function () { q = this.value.toLowerCase(); draw(); };
    $('#pkNew', s).onchange = function () { onlyNew = this.checked; draw(); };
    $('#pkOk', s).onclick = function () { s.remove(); p.caption = caption(p); editor(); };
  }

  // download all slides (ZIP) / every slide as its own photo / save to phone
  async function files(p) {
    await fontsReady(); var out = [];
    for (var i = -1; i < slideCount(p); i++) {
      var c = await render(p, i, 1), b = await new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.93); }), it = p.items[i];
      var tag = i < 0 ? 'cover' : !it ? 'last' : String(isMkt(p) ? (it.prod || it.handle || 'product') : it.handle).toLowerCase().replace(/[^a-z0-9._]+/gi, '-').slice(0, 40);
      out.push(new File([b], (i + 2 < 10 ? '0' : '') + (i + 2) + '-' + tag + '.jpg', { type: 'image/jpeg' }));
    }
    return out;
  }
  function name(p) { return ('discovery-' + (isMkt(p) ? 'marketplace-' + (p.cat || 'all') : isGen(p) ? String(p.l1 || 'general').slice(0, 40) : isCity(p) ? p.city : p.cat) + (p.noPart ? '' : '-pt' + p.part)).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  async function missing(p) { var n = []; if (!(await photo(p.coverImg))) n.push('the cover'); for (var i = 0; i < p.items.length; i++) if (!(await itemPhoto(p.items[i]))) n.push(isMkt(p) ? p.items[i].prod : '@' + p.items[i].handle); return n; }
  async function okToExport(p) { var n = await missing(p); return !n.length || confirm('No photo yet for ' + n.slice(0, 4).join(', ') + (n.length > 4 ? ' and ' + (n.length - 4) + ' more' : '') + '. Download anyway?'); }
  async function download(p, btn) {
    if (!p.items.length) return X.toast(isMkt(p) ? 'Add some products first' : 'Add some businesses first');
    if (!(await okToExport(p))) return;
    var t = btn.textContent; btn.disabled = true; btn.textContent = 'Making slides…';
    try {
      var fs = await files(p), zip = new JSZip(); fs.forEach(function (f) { zip.file(f.name, f); }); zip.file('caption.txt', $('#deCap') ? $('#deCap').value : p.caption);
      var a = document.createElement('a'); a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' })); a.download = name(p) + '.zip'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      save(p);
    } catch (e) { X.toast(e.message); }
    btn.disabled = false; btn.textContent = t;
  }
  // 🖼️ every slide as its own photo (no ZIP) + the caption as a text file — your browser may ask once to allow several downloads
  async function downloadEach(p, btn) {
    if (!p.items.length) return X.toast(isMkt(p) ? 'Add some products first' : 'Add some businesses first');
    if (!(await okToExport(p))) return;
    var t = btn.textContent; btn.disabled = true; btn.textContent = 'Making slides…';
    try {
      var fs = await files(p), cap = new File([$('#deCap') ? $('#deCap').value : p.caption], name(p) + '-caption.txt', { type: 'text/plain' });
      fs.concat([cap]).forEach(function (f, i) { setTimeout(function () { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }, i * 350); });
      X.toast('Downloading ' + fs.length + ' photos + the caption — if your browser asks, allow several downloads');
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
      try { X.S.disc = (await X.api('disc-posted', { id: p.id, url: $('#psU', s).value.trim() })).items; X.S.discEdit = JSON.parse(JSON.stringify(X.S.disc.filter(function (q) { return q.id === p.id; })[0])); s.remove(); X.toast('Marked as posted 🎉'); editor(); boost(X.S.discEdit); }
      catch (e) { X.toast(e.message); this.disabled = false; }
    };
  }
  // 🚀 After posting checklist for this part (falls back to Tell the businesses if HQBoost isn't loaded)
  function boostInfo(p) { return { key: 'disc:' + p.id, kind: 'disc', title: head(p), url: p.postUrl || '', postedAt: p.postedAt, where: isCity(p) ? p.city : '', what: isCity(p) || isGen(p) ? 'business' : String(p.cat || 'business').toLowerCase().replace(/ies$/, 'y').replace(/s$/, ''),
    biz: p.items.map(function (x) { var b = (dir().filter(function (d) { return d.slug === x.slug; })[0]); return { name: b ? b.name : (x.name || ''), handle: x.handle }; }) }; }
  function boost(p) { if (window.HQBoost) window.HQBoost.open(boostInfo(p)); else tellSheet(p); }
  function tellSheet(p) {
    var D = {}; dir().forEach(function (b) { D[b.slug] = b; });
    var ttl = head(p);
    var msg = function (x) { return 'Hi ' + (D[x.slug] ? D[x.slug].name : '@' + x.handle) + ' 👋🏾 Auntie Tobi here! We’ve just featured you in our “' + ttl + '” post on Instagram 🎉' + (p.postUrl ? '\n' + p.postUrl : '') + '\nFeel free to share it to your story and tag @auntietobi_uk 💚'; };
    var s = X.sheet('<h2>🎉 Tell the businesses</h2><p class="muted" style="font-size:13.5px;margin:4px 0 10px">One tap opens WhatsApp with the message ready, or copies it for an Instagram DM. Nothing is sent until you press send.</p><div style="max-height:56vh;overflow:auto">' +
      p.items.map(function (x, i) { var b = D[x.slug] || {}; return '<div class="aprow" style="flex-direction:row;align-items:center;flex-wrap:wrap;gap:8px"><div style="flex:1;min-width:140px"><b>@' + esc(x.handle) + '</b><div class="muted" style="font-size:12.5px">' + esc(b.name || '') + '</div></div><div class="row" style="gap:6px">' +
        (b.wa ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(b.wa) + '?text=' + encodeURIComponent(msg(x)) + '">💬 WhatsApp</a>' : '') + '<button class="btn ghost sm" data-tdm="' + i + '">📸 Instagram DM</button></div></div>'; }).join('') +
      '</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="tsX">Done</button></div>');
    $$('[data-tdm]', s).forEach(function (b) { b.onclick = async function () { var x = p.items[+b.dataset.tdm]; try { await navigator.clipboard.writeText(msg(x)); X.toast('Message copied — paste it in the DM'); } catch (e) {} window.open('https://ig.me/m/' + encodeURIComponent(x.handle), '_blank', 'noopener'); }; });
    $('#tsX', s).onclick = function () { s.remove(); };
  }

  window.HQDisc = { init: function (o) { X = o; }, view: view };
})();
