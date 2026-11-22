/*
 * Auntie Tobi HQ — 🎞️ Video Remix.
 * Upload a short video whose style you like (a screen recording is fine) → HQ takes snapshots in the browser →
 * the AI reads the style into a template (scenes, timings, every piece of text: font kind, size, colour, outline,
 * position, animation) and writes Auntie Tobi's version → you swap in your own photos/videos, a picture made by HQ's
 * image model, an AI clip, or a colour → HQ draws and encodes a 1080×1920 MP4 in the browser, with music.
 * Or start from a ready-made style. Remixes can be saved and reopened.
 *
 * HQ calls HQRemix.init({ api, sheet, toast, esc }) once, then HQRemix.view() for the #rmx page.
 */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30, X = null;
  var FONT = {
    heavy: { n: 'Heavy bold', f: function (s) { return '900 ' + s + 'px Montserrat, "Inter Tight", Arial, sans-serif'; }, lh: 1.02 },
    condensed: { n: 'Tall condensed', f: function (s) { return '400 ' + s + 'px Anton, Impact, sans-serif'; }, lh: 1.05 },
    serif: { n: 'Elegant serif', f: function (s) { return '500 ' + s + 'px "Playfair Display", Georgia, serif'; }, lh: 1.08 },
    script: { n: 'Brush script', f: function (s) { return '400 ' + s + 'px "Kaushan Script", cursive'; }, lh: 1.15 },
    elegant: { n: 'Fine calligraphy', f: function (s) { return '400 ' + s + 'px "Great Vibes", cursive'; }, lh: 1.15 },
    hand: { n: 'Hand-drawn capitals', f: function (s) { return '900 ' + s + 'px "Londrina Solid", cursive'; }, lh: 1.0 },
    rounded: { n: 'Rounded bold', f: function (s) { return '800 ' + s + 'px Poppins, Arial, sans-serif'; }, lh: 1.08 },
    marker: { n: 'Felt-tip marker', f: function (s) { return '400 ' + s + 'px "Permanent Marker", cursive'; }, lh: 1.1 },
    sans: { n: 'Plain sans', f: function (s) { return '700 ' + s + 'px Inter, Arial, sans-serif'; }, lh: 1.15 },
  };
  var ANIM = { none: 'Just there', fade: 'Fade in', pop: 'Pop in', slideup: 'Slide up', word: 'Word by word', type: 'Letter by letter', zoom: 'Zoom in', drop: 'Drop in' };
  var MUS = [['upbeat', '🎉 Upbeat (built-in)'], ['calm', '🌿 Calm (built-in)'], ['suspense', '⏳ Suspense (built-in)'], ['own', '🎵 My own music'], ['none', '🔇 No music']];

  // ───── ready-made styles (from the three examples Auntie Tobi shared), already in Auntie Tobi's words ─────
  function L(o) { return Object.assign({ f: 'heavy', s: 80, c: '#FFFFFF', o: '', sh: true, x: 0.5, y: 0.5, w: 0.86, al: 'center', a: 'fade', at: 0, up: false, ghost: false }, o); }
  function spot(name, area) { return { d: 2.6, media: 'photo', want: 'Inside a stylish Nigerian restaurant in ' + area + ', warm evening light, tables set, no people facing camera', layers: [
    L({ t: name, f: 'heavy', s: 120, c: '#FFC21A', o: '#1A1A1A', y: 0.36, up: true, a: 'pop' }),
    L({ t: '📍 : ' + area, f: 'heavy', s: 54, c: '#FFC21A', o: '#1A1A1A', y: 0.44, a: 'fade', at: 0.25 }),
    L({ t: '📅 : [days open]', f: 'heavy', s: 54, c: '#FFC21A', o: '#1A1A1A', y: 0.485, a: 'fade', at: 0.35 }),
    L({ t: '⏰ : [opening hours]', f: 'heavy', s: 54, c: '#FFC21A', o: '#1A1A1A', y: 0.53, a: 'fade', at: 0.45 }),
    L({ t: '💷 : [£ price] up', f: 'heavy', s: 62, c: '#FFC21A', o: '#1A1A1A', y: 0.6, a: 'fade', at: 0.6 }),
    L({ t: '*booking recommended*', f: 'heavy', s: 44, c: '#FFC21A', o: '#1A1A1A', y: 0.87, a: 'fade', at: 0.8 })] }; }
  function city(n, name, want) { return { d: 0.9, media: 'photo', want: want, layers: [L({ t: String(n), f: 'serif', s: 230, y: 0.43, a: 'none' }), L({ t: name, f: 'serif', s: 104, y: 0.51, a: 'none' })] }; }
  var PRESETS = [
    { id: 'p-words', ico: '✍️', name: 'Animated words', sub: 'Words appear one by one on a plain background — verses, proverbs, quotes', tpl: { name: 'Animated words', kind: 'words', base: { dim: 0, kb: false, tr: 'cut', music: 'calm' }, caption: 'Hold on to this today 🙏🏾\n\nSave it for when you need it and share it with someone who needs to hear it.\n\n#Philippians413 #Faith #NigeriansInUK #NaijaInUK #AuntieTobi', scenes: [
      { d: 2.8, media: 'color', color: '#E6DFD3', layers: [L({ t: 'I CAN’T', f: 'hand', s: 170, c: '#151515', sh: false, y: 0.27, a: 'type' })] },
      { d: 4.6, media: 'color', color: '#E6DFD3', layers: [L({ t: 'I CAN DO ALL THIS THROUGH HIM WHO GIVES ME STRENGTH', f: 'hand', s: 150, c: '#151515', sh: false, y: 0.4, w: 0.76, a: 'word', ghost: true, at: 0.1 }), L({ t: 'PHILIPPIANS 4:13', f: 'sans', s: 44, c: '#4A4A4A', sh: false, y: 0.6, a: 'fade', at: 2.4 })] }] } },
    { id: 'p-list', ico: '📍', name: 'Spots list', sub: 'A hook, then one place per scene with 📍 area, 📅 days, ⏰ hours and 💷 price', tpl: { name: 'Spots list', kind: 'list', base: { dim: 0.22, kb: true, tr: 'cut', music: 'upbeat' }, caption: '5 Nigerian restaurants in London you need to try 🇳🇬🍲\n\nSave this for your next date night or family outing, and tag who you’re taking!\n\n#NigerianFood #NigeriansInLondon #NaijaInUK #LondonEats #AuntieTobi', scenes: [
      { d: 3.4, media: 'photo', want: 'A smiling, stylish Nigerian woman holding a glass in an elegant London restaurant, evening light', layers: [L({ t: '5', f: 'heavy', s: 300, o: '#111111', y: 0.25, a: 'pop' }), L({ t: 'MUST-TRY NAIJA SPOTS', f: 'heavy', s: 104, o: '#111111', y: 0.4, w: 0.78, a: 'pop', at: 0.15 }), L({ t: 'in London', f: 'script', s: 120, c: '#FFC21A', o: '#111111', y: 0.52, a: 'pop', at: 0.4 }), L({ t: 'This month', f: 'heavy', s: 64, o: '#111111', y: 0.8, a: 'fade', at: 0.7 })] },
      { d: 1.8, media: 'photo', want: 'The same elegant restaurant, a woman smiling and raising her glass', layers: [L({ t: 'Hold screen to read', f: 'serif', s: 96, y: 0.5, a: 'fade' })] },
      spot('[Restaurant 1]', '[area]'), spot('[Restaurant 2]', '[area]'), spot('[Restaurant 3]', '[area]'), spot('[Restaurant 4]', '[area]'), spot('[Restaurant 5]', '[area]')] } },
    { id: 'p-count', ico: '🔢', name: 'Fast countdown', sub: 'A title, then quick numbered scenes with a place name — very fast cuts', tpl: { name: 'Fast countdown', kind: 'countdown', base: { dim: 0.12, kb: true, tr: 'cut', music: 'upbeat' }, caption: '10 UK cities every Nigerian should visit at least once 🇬🇧✨ Which one have you been to? Tell us in the comments 👇🏾\n\n#UKTravel #NigeriansInUK #NaijaInUK #VisitBritain #AuntieTobi', scenes: [
      { d: 2.0, media: 'photo', want: 'A golden-hour view over a British city skyline from a high viewpoint', layers: [L({ t: '10', f: 'serif', s: 250, y: 0.4, a: 'none' }), L({ t: 'places to visit', f: 'elegant', s: 110, y: 0.475, a: 'none' }), L({ t: 'IN THE UK', f: 'serif', s: 84, y: 0.53, a: 'none', up: true })] },
      city(1, 'London', 'Big Ben and the Houses of Parliament at sunset, a woman walking on the bridge'), city(2, 'Edinburgh', 'Edinburgh old town and castle on a bright day'), city(3, 'Manchester', 'Manchester city centre street with red-brick buildings at dusk'),
      city(4, 'Liverpool', 'Liverpool waterfront Royal Albert Dock at golden hour'), city(5, 'Bath', 'Bath Roman Baths and honey-coloured stone buildings'), city(6, 'York', 'York Minster and narrow medieval streets'),
      city(7, 'Cardiff', 'Cardiff Bay waterfront on a sunny day'), city(8, 'Brighton', 'Brighton Palace Pier and beach at sunset'), city(9, 'Belfast', 'Belfast City Hall at golden hour'), city(10, 'Birmingham', 'Birmingham canals and city centre at night')] } },
  ];

  var R = null, ST = null, OWN = null, OWNNAME = '', IMG = {}, VID = {}, AC = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function imgSrc(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function total() { return R.tpl.scenes.reduce(function (a, s) { return a + s.d; }, 0); }
  function mm(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function prog(t) { var p = $('#rxProg'); if (p) p.textContent = t || ''; }

  // ───── media ─────
  function srcOf(sc) { return sc._vid || sc._clipUrl || (sc.img ? imgSrc(sc.img) : sc._img || ''); }
  function isVideo(sc) { return !!(sc._vid || sc._clipUrl); }
  function loadImg(src) { if (IMG[src]) return IMG[src]; IMG[src] = new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { delete IMG[src]; bad(new Error('A picture didn’t load.')); }; im.src = src; }); return IMG[src]; }
  function loadVid(src) {
    if (VID[src]) return VID[src];
    VID[src] = new Promise(function (ok, bad) { var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.onloadeddata = function () { ok(v); }; v.onerror = function () { delete VID[src]; bad(new Error('A video didn’t load.')); }; v.src = src; v.load(); });
    return VID[src];
  }
  // an AI clip lives on fal.media — bring it in as a local file so the canvas can use it
  function clipLocal(sc) { if (sc._clipUrl || !sc.clip) return Promise.resolve(); return fetch(sc.clip).then(function (r) { if (!r.ok) throw new Error('The AI clip has expired — make it again.'); return r.blob(); }).then(function (b) { sc._clipUrl = URL.createObjectURL(b); }); }
  async function loadAll() {
    var M = [];
    for (var i = 0; i < R.tpl.scenes.length; i++) {
      var sc = R.tpl.scenes[i]; M[i] = null;
      try { if (sc.clip && !sc._clipUrl) await clipLocal(sc); if (isVideo(sc)) M[i] = { v: await loadVid(srcOf(sc)) }; else if (srcOf(sc)) M[i] = { im: await loadImg(srcOf(sc)) }; } catch (e) { X.toast(e.message); }
    }
    try { await Promise.all(['900 60px Montserrat', '400 60px Anton', '500 60px "Playfair Display"', '400 60px "Kaushan Script"', '400 60px "Great Vibes"', '900 60px "Londrina Solid"', '800 60px Poppins', '400 60px "Permanent Marker"', '700 60px Inter'].map(function (f) { return document.fonts.load(f); })); } catch (e) {}
    return M;
  }

  // ───── drawing one frame ─────
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function back(x) { x = Math.max(0, Math.min(1, x)); var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function cover(cx, el, w0, h0, z) { var s = Math.max(W / w0, H / h0) * z, w = w0 * s, h = h0 * s; cx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h); }
  function wrap(cx, words, maxW) { var lines = [[]], w = 0, sp = cx.measureText(' ').width; words.forEach(function (wd) { var ww = cx.measureText(wd).width; if (w + ww > maxW && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(wd); w += ww + sp; }); return lines; }
  function bg(cx, sc, m, lt, live) {
    cx.fillStyle = sc.media === 'color' || !m ? sc.color || '#E6DFD3' : '#000'; cx.fillRect(0, 0, W, H);
    if (sc.media === 'color') return;
    if (m && m.v && m.v.videoWidth) cover(cx, m.v, m.v.videoWidth, m.v.videoHeight, 1);
    else if (m && m.im) cover(cx, m.im, m.im.naturalWidth, m.im.naturalHeight, R.tpl.base.kb ? 1 + 0.08 * Math.min(1, lt / Math.max(1, sc.d)) : 1);
    else { var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2B3445'); g.addColorStop(1, '#11161F'); cx.fillStyle = g; cx.fillRect(0, 0, W, H); if (live) { cx.save(); cx.fillStyle = 'rgba(255,255,255,.35)'; cx.font = '600 44px Inter, Arial'; cx.textAlign = 'center'; cx.fillText('📷 Add a background', W / 2, H * 0.93); cx.restore(); } }
    if (R.tpl.base.dim) { cx.fillStyle = 'rgba(0,0,0,' + R.tpl.base.dim + ')'; cx.fillRect(0, 0, W, H); }
  }
  function layer(cx, l, lt) {
    var p = lt - (l.at || 0); if (p < 0 && !(l.ghost && l.a === 'word')) return;
    var txt = l.up ? String(l.t || '').toUpperCase() : String(l.t || ''); if (!txt.trim()) return;
    var F = FONT[l.f] || FONT.heavy, s = l.s, alpha = 1, sc = 1, dy = 0;
    if (l.a === 'fade') alpha = ease(p / 0.35);
    else if (l.a === 'pop') { alpha = ease(p / 0.15); sc = 0.55 + 0.45 * back(p / 0.38); }
    else if (l.a === 'slideup') { alpha = ease(p / 0.3); dy = (1 - ease(p / 0.4)) * 70; }
    else if (l.a === 'zoom') { alpha = ease(p / 0.25); sc = 1 + 0.35 * (1 - ease(p / 0.45)); }
    else if (l.a === 'drop') { alpha = ease(p / 0.2); dy = -(1 - back(p / 0.45)) * 160; }
    cx.save(); cx.font = F.f(s); cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
    var words = txt.split(/\s+/), lines = wrap(cx, words, l.w * W);
    var lastLn = lines[lines.length - 1], orphan = lines.length > 1 && lastLn.length === 1 && lastLn[0].length <= 3, tooWide = words.some(function (wd) { return cx.measureText(wd).width > l.w * W; });
    if ((orphan || tooWide) && s >= 60) { var need = orphan ? cx.measureText(txt).width : Math.max.apply(null, words.map(function (wd) { return cx.measureText(wd).width; })), fit = Math.max(s * 0.6, s * l.w * W / need * 0.98); if (fit < s) { s = Math.floor(fit); cx.font = F.f(s); lines = wrap(cx, words, l.w * W); } }   // a tiny last word on its own line, or a word too wide, shrinks the text a little
    var lh = s * F.lh, cxp = l.x * W, cyp = l.y * H + dy;
    var y0 = cyp - (lines.length - 1) * lh / 2 + s * 0.35;
    cx.translate(cxp, cyp); cx.scale(sc, sc); cx.translate(-cxp, -cyp);
    var shown = Infinity, chars = Infinity;
    if (l.a === 'word') shown = p < 0 ? 0 : Math.floor(p / 0.16) + 1;
    if (l.a === 'type') chars = Math.max(0, Math.floor(p / 0.05) + 1);
    var k = 0, ch = 0, sp = cx.measureText(' ').width;
    lines.forEach(function (ln, li) {
      var full = ln.join(' '), lw = cx.measureText(full).width, x = l.al === 'left' ? cxp - l.w * W / 2 : cxp - lw / 2, y = y0 + li * lh;
      ln.forEach(function (wd) {
        var vis = k < shown, ww = cx.measureText(wd).width, t2 = wd;
        if (chars !== Infinity) { var left = chars - ch; t2 = left <= 0 ? '' : wd.slice(0, left); ch += wd.length + 1; }
        var a = vis ? alpha : (l.ghost ? alpha * 0.25 : 0);
        if (a > 0 && t2) {
          cx.globalAlpha = a;
          if (l.sh) { cx.shadowColor = 'rgba(0,0,0,0.6)'; cx.shadowBlur = s * 0.22; cx.shadowOffsetY = s * 0.05; }
          if (l.o) { cx.lineJoin = 'round'; cx.lineWidth = Math.max(4, s * 0.13); cx.strokeStyle = l.o; cx.strokeText(t2, x, y); cx.shadowColor = 'transparent'; }
          cx.fillStyle = l.c; cx.fillText(t2, x, y); cx.shadowColor = 'transparent';
        }
        x += ww + sp; k++;
      });
    });
    cx.restore();
  }
  function sceneAt(t) { var s = 0; for (var i = 0; i < R.tpl.scenes.length; i++) { var d = R.tpl.scenes[i].d; if (t < s + d || i === R.tpl.scenes.length - 1) return { i: i, s: s, lt: t - s }; s += d; } return { i: 0, s: 0, lt: 0 }; }
  function frame(cx, t, M, live) {
    var a = sceneAt(t), sc = R.tpl.scenes[a.i];
    bg(cx, sc, M[a.i], a.lt, live);
    sc.layers.forEach(function (l) { layer(cx, l, a.lt); });
    var tr = R.tpl.base.tr;
    if (a.i > 0 && tr === 'fade' && a.lt < 0.3) {   // fade from the previous scene
      var pv = R.tpl.scenes[a.i - 1], off = document.createElement('canvas'); off.width = W; off.height = H; var oc = off.getContext('2d');
      bg(oc, pv, M[a.i - 1], pv.d, live); pv.layers.forEach(function (l) { layer(oc, l, pv.d); });
      cx.save(); cx.globalAlpha = 1 - a.lt / 0.3; cx.drawImage(off, 0, 0); cx.restore();
    }
    if (a.i > 0 && tr === 'flash' && a.lt < 0.18) { cx.fillStyle = 'rgba(255,255,255,' + (1 - a.lt / 0.18) * 0.85 + ')'; cx.fillRect(0, 0, W, H); }
  }

  // ───── page ─────
  function state() { if (!R) R = { tpl: null, step: 'start', musicVol: 30, music: '', topic: '', out: null, savedId: '', savedName: '', ref: null }; return R; }
  function view() {
    state();
    $('#ttl').textContent = R.savedName ? 'Video Remix · ' + R.savedName : 'Video Remix';
    $('#topRight').innerHTML = '<button class="btn ghost" id="rxMine">📂 My remixes</button>' + (R.tpl ? ' <button class="btn ghost" id="rxNew">➕ New</button> <button class="btn primary" id="rxSave">💾 Save</button>' : '');
    $('#rxMine').onclick = mine;
    if ($('#rxNew')) $('#rxNew').onclick = function () { if (!confirm('Start a new remix? Anything you haven’t saved will be cleared.')) return; R = null; view(); };
    if ($('#rxSave')) $('#rxSave').onclick = saveSheet;
    if (!R.tpl) return start(); edit();
  }
  function start() {
    $('#view').innerHTML = '<div id="rxRoot" style="max-width:1020px"><style>#rxRoot .card{margin-bottom:12px}#rxRoot label{display:block}.rx-ps{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:8px}.rx-p{border:1.5px solid #ECE8DE;border-radius:14px;padding:12px;background:#fff;text-align:left;cursor:pointer;font-family:inherit}.rx-p:hover{border-color:#057A44}.rx-p b{display:block;font-size:15px;margin:4px 0 2px}.rx-p small{color:#6B7280;font-size:12.5px;line-height:1.4;display:block}.rx-drop{border:2px dashed #C9D2DC;border-radius:16px;padding:22px;text-align:center;background:#FAFBFC;cursor:pointer}</style>' +
      '<div class="card"><b>1 · Upload a video whose style you like</b><div class="muted" style="font-size:13px;margin:4px 0 10px">A screen recording from Instagram or TikTok is fine (up to 2 minutes). It stays on your computer — HQ only sends a few snapshots to the AI.</div>' +
      '<label class="rx-drop" id="rxDrop">🎞️ <b>Choose a video</b><div class="muted" style="font-size:13px;margin-top:4px" id="rxRefName">MP4, MOV or WebM</div><input type="file" accept="video/*" id="rxRef" hidden></label>' +
      '<label style="margin-top:12px">2 · What should Auntie Tobi’s version be about?</label><textarea id="rxTopic" rows="3" placeholder="e.g. 5 Nigerian restaurants in Manchester for date night (I’ll add the real details)">' + esc(R.topic || '') + '</textarea>' +
      '<div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="rxRead">✨ Read the style and write my version</button></div><div class="muted" id="rxProg" style="margin-top:8px"></div></div>' +
      '<div class="card"><b>Or start from a ready-made style</b><div class="rx-ps">' + PRESETS.map(function (p) { return '<button class="rx-p" data-pre="' + p.id + '"><span style="font-size:26px">' + p.ico + '</span><b>' + esc(p.name) + '</b><small>' + esc(p.sub) + '</small></button>'; }).join('') + '</div></div></div>';
    $('#rxRef').onchange = function () { var f = this.files && this.files[0]; if (!f) return; R.ref = f; $('#rxRefName').textContent = '✅ ' + f.name; };
    $('#rxTopic').oninput = function () { R.topic = this.value; };
    $('#rxRead').onclick = function () { read().catch(function (e) { prog(''); X.toast(e.message || 'Something went wrong.'); }); };
    $$('[data-pre]').forEach(function (b) { b.onclick = function () { var p = PRESETS.filter(function (x) { return x.id === b.dataset.pre; })[0]; R.tpl = clone(p.tpl); R.music = R.tpl.base.music; R.savedId = ''; R.savedName = ''; view(); }; });
  }

  // ✨ read a reference video: snapshots at scene changes + every ~1.5 s → the AI
  async function read() {
    if (!R.ref) return X.toast('Choose a video first.');
    if (R.ref.size > 300e6) return X.toast('That video is too big — please use one under 300 MB.');
    $('#rxRead').disabled = true;
    try {
      prog('Opening the video…');
      var url = URL.createObjectURL(R.ref), v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise(function (ok, bad) { v.onloadeddata = ok; v.onerror = function () { bad(new Error('That video won’t open here — try an MP4.')); }; });
      var dur = v.duration; if (!(dur > 0.5)) throw new Error('That video seems empty.'); if (dur > 125) throw new Error('Please use a video under 2 minutes.'); if (!v.videoWidth) throw new Error('That video won’t open in this browser — try saving it as an MP4 or use Chrome.');
      var seek = function (t) { return new Promise(function (ok) { var done = false, fin = function () { if (!done) { done = true; ok(); } }; v.onseeked = fin; setTimeout(fin, 1500); v.currentTime = Math.min(dur - 0.05, t); }); };
      var tiny = document.createElement('canvas'); tiny.width = 36; tiny.height = 64; var tc = tiny.getContext('2d', { willReadFrequently: true });
      var big = document.createElement('canvas'), bw = 360, bh = Math.round(360 * v.videoHeight / v.videoWidth); big.width = bw; big.height = bh; var bc = big.getContext('2d');
      var step = Math.max(0.2, dur / 80), prev = null, frames = [], times = [], lastT = -9;
      for (var t = 0.05; t < dur; t += step) {
        await seek(t); prog('Looking at the video… ' + Math.round(t / dur * 100) + '%');
        tc.drawImage(v, 0, 0, 36, 64); var d = tc.getImageData(0, 0, 36, 64).data, diff = 0;
        if (prev) { for (var i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]); diff /= (d.length / 4) * 3 * 255; }
        prev = d;
        if (!frames.length || diff > 0.09 || t - lastT >= 1.5) { bc.drawImage(v, 0, 0, bw, bh); var du = big.toDataURL('image/jpeg', 0.72); if (du.length > 100) frames.push(du); else continue; times.push(t); lastT = t; }
      }
      if (frames.length > 18) { var keep = [], n = frames.length; for (var j = 0; j < 18; j++) keep.push(Math.round(j * (n - 1) / 17)); frames = keep.map(function (k) { return frames[k]; }); times = keep.map(function (k) { return times[k]; }); }
      URL.revokeObjectURL(url);
      if (frames.length < 2) throw new Error('Couldn’t take pictures from that video — try saving it as an MP4 or use Chrome.');
      prog('✨ Reading the style' + (R.topic ? ' and writing your version' : '') + '… (about 20 seconds)');
      var r = await X.api('rx-analyse', { frames: frames, times: times, dur: dur, topic: R.topic || '' });
      R.tpl = r.tpl; R.music = R.tpl.base.music; R.savedId = ''; R.savedName = ''; prog(''); view();
      X.toast('✨ Style read — now add your pictures or videos');
    } finally { var b = $('#rxRead'); if (b) b.disabled = false; }
  }

  // ───── the editor ─────
  function fontOpts(v) { return Object.keys(FONT).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + FONT[k].n + '</option>'; }).join(''); }
  function animOpts(v) { return Object.keys(ANIM).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + ANIM[k] + '</option>'; }).join(''); }
  function edit() {
    var T = R.tpl, b = T.base;
    $('#view').innerHTML = '<div id="rxRoot" style="max-width:1080px"><style>#rxRoot .card{margin-bottom:12px}#rxRoot label{display:block}#rxRoot input[type=checkbox]{width:auto;margin:0}.rx-sc{display:flex;gap:12px;align-items:flex-start;border-top:1px solid #EEE9DD;padding:12px 0}.rx-sc:first-child{border-top:0}.rx-th{flex:none;width:135px;height:240px;border-radius:10px;background:#111;display:block}.rx-ly{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:start;background:#FAFAF7;border:1px solid #EEE9DD;border-radius:10px;padding:8px;margin-top:6px}.rx-ly textarea{min-height:38px;font-size:14px}.rx-lyo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#6B7280}.rx-lyo select,.rx-lyo input{width:auto;padding:3px 6px;font-size:12.5px}.rx-lyo input[type=range]{width:90px}.rx-lyo input[type=color]{padding:0;width:30px;height:24px}</style>' +
      '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1;min-width:200px"><label>Name</label><input id="rxName" value="' + esc(T.name) + '"></div>' +
      '<div><label>Between scenes</label><select id="rxTr"><option value="cut"' + (b.tr === 'cut' ? ' selected' : '') + '>Quick cut</option><option value="fade"' + (b.tr === 'fade' ? ' selected' : '') + '>Fade</option><option value="flash"' + (b.tr === 'flash' ? ' selected' : '') + '>Flash</option></select></div>' +
      '<div><label>Darken backgrounds <b id="rxDimV">' + Math.round(b.dim * 100) + '%</b></label><input type="range" id="rxDim" min="0" max="60" step="2" value="' + Math.round(b.dim * 100) + '"></div>' +
      '<label style="display:flex;gap:6px;align-items:center;margin:0 0 8px"><input type="checkbox" id="rxKb"' + (b.kb ? ' checked' : '') + '> Slow zoom on pictures</label></div>' +
      (T.notes ? '<div class="muted" style="font-size:12.5px;margin-top:6px">🎨 ' + esc(T.notes) + '</div>' : '') +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><input id="rxTopic2" placeholder="New topic, e.g. 5 Nigerian bakeries in Birmingham" value="' + esc(T.topic || '') + '" style="flex:1;min-width:240px"><button class="btn ghost" id="rxRe">✍️ Rewrite for this topic</button></div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:4px">Keeps the style; writes new words. Anything in [square brackets] is for you to fill in — the AI never invents prices, hours or addresses.</div></div>' +
      '<div class="card"><b>Scenes · ' + T.scenes.length + ' · ' + total().toFixed(1) + ' seconds</b><div id="rxScenes">' + T.scenes.map(sceneHtml).join('') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost" id="rxAddSc">➕ Add a scene</button><button class="btn ghost" id="rxAllPics">✨ Make all missing pictures</button></div></div>' +
      '<div class="card"><b>Music</b><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center"><select id="rxMus" style="flex:1;min-width:200px">' + MUS.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === R.music ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') + '</select>' +
      '<label class="btn ghost sm" style="margin:0;cursor:pointer">🎵 Upload my music<input type="file" accept="audio/*,.mp3,.m4a,.wav" id="rxMusUp" hidden></label><label style="margin:0;min-width:200px">Volume <b id="rxMusV">' + R.musicVol + '%</b><input type="range" id="rxMusVol" min="0" max="100" step="5" value="' + R.musicVol + '" style="width:100%"></label></div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:4px">' + (R.music === 'own' ? (OWN ? '🎵 Using ' + esc(OWNNAME) + '. ' : '⚠️ Upload your music file. ') + 'Only use music you have the right to use.' : 'The reference video’s own music is never used. The built-in tracks are free to use.') + '</div></div>' +
      '<div class="card"><b>Preview and make the video</b><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost" id="rxPrev">👀 Watch preview</button><button class="btn primary" id="rxGo">🎬 Make the video</button></div><div class="muted" id="rxProg" style="margin-top:8px"></div><div id="rxOut" style="margin-top:10px"></div>' +
      '<label style="margin-top:8px">Caption</label><textarea id="rxCap" rows="4">' + esc(T.caption || '') + '</textarea></div></div>';
    bind(); thumbs(); if (R.out) showOut();
  }
  function sceneHtml(sc, i) {
    var media = sc.media === 'color' ? '🎨 Colour' : isVideo(sc) ? (sc._vid ? '🎬 ' + esc(sc._vname || 'Your video') : '🎥 AI clip') : sc.img || sc._img ? '🖼️ Picture' : (sc.clip ? '🎥 AI clip (loads when you preview)' : '⚠️ No background yet');
    return '<div class="rx-sc" data-sc="' + i + '"><canvas class="rx-th" width="270" height="480" data-th="' + i + '"></canvas><div style="flex:1;min-width:0">' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b>Scene ' + (i + 1) + '</b><label style="margin:0;display:flex;gap:4px;align-items:center;font-size:13px">⏱ <input type="number" step="0.1" min="0.4" max="20" value="' + sc.d + '" data-d="' + i + '" style="width:70px;padding:4px 6px"> s</label>' +
      '<span class="muted" style="font-size:12.5px">' + media + '</span><span style="flex:1"></span>' +
      '<button class="btn ghost sm" data-mv="' + i + ':-1" title="Move up">⬆️</button><button class="btn ghost sm" data-mv="' + i + ':1" title="Move down">⬇️</button><button class="btn ghost sm" data-dup="' + i + '" title="Duplicate">⧉</button><button class="btn ghost sm" data-del="' + i + '" title="Delete">🗑️</button></div>' +
      '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center">' +
      '<label class="btn ghost sm" style="margin:0;cursor:pointer">📷 My photo or video<input type="file" accept="image/*,video/*" data-up="' + i + '" hidden></label>' +
      '<button class="btn ghost sm" data-pic="' + i + '">✨ ' + (sc.img ? 'New picture' : 'Make picture') + '</button>' +
      (sc.img || sc._img ? '<button class="btn ghost sm" data-clip="' + i + '">🎥 Turn picture into AI clip</button>' : '') +
      '<label class="btn ghost sm" style="margin:0;display:flex;gap:4px;align-items:center">🎨<input type="color" value="' + (sc.color || '#E6DFD3') + '" data-col="' + i + '" style="width:30px;height:22px;padding:0;border:0"></label>' +
      (sc.media !== 'color' ? '<button class="btn ghost sm" data-plain="' + i + '">Use plain colour</button>' : '') + '</div>' +
      '<input data-want="' + i + '" value="' + esc(sc.want || '') + '" placeholder="Describe the picture for ✨ Make picture" style="margin-top:6px;font-size:13px">' +
      sc.layers.map(function (l, k) {
        return '<div class="rx-ly"><textarea data-lt="' + i + ':' + k + '" rows="1">' + esc(l.t) + '</textarea><button class="btn ghost sm" data-ldel="' + i + ':' + k + '" title="Remove text">✕</button>' +
          '<div class="rx-lyo" style="grid-column:1/-1"><select data-lf="' + i + ':' + k + '">' + fontOpts(l.f) + '</select><input type="color" value="' + l.c + '" data-lc="' + i + ':' + k + '" title="Colour">' +
          '<label style="margin:0;display:flex;gap:3px;align-items:center"><input type="checkbox" data-lo="' + i + ':' + k + '"' + (l.o ? ' checked' : '') + '> outline</label><label style="margin:0;display:flex;gap:3px;align-items:center"><input type="checkbox" data-lsh="' + i + ':' + k + '"' + (l.sh ? ' checked' : '') + '> shadow</label>' +
          '<label style="margin:0;display:flex;gap:3px;align-items:center"><input type="checkbox" data-lup="' + i + ':' + k + '"' + (l.up ? ' checked' : '') + '> CAPS</label>' +
          'Size <input type="range" min="20" max="260" value="' + l.s + '" data-ls="' + i + ':' + k + '"> Up/down <input type="range" min="3" max="97" value="' + Math.round(l.y * 100) + '" data-ly="' + i + ':' + k + '">' +
          '<select data-la="' + i + ':' + k + '">' + animOpts(l.a) + '</select> after <input type="number" step="0.1" min="0" max="20" value="' + l.at + '" data-lat="' + i + ':' + k + '" style="width:58px"> s</div></div>';
      }).join('') + '<button class="btn ghost sm" data-ladd="' + i + '" style="margin-top:6px">➕ Add text</button></div></div>';
  }
  function L2(k) { var p = k.split(':'); return R.tpl.scenes[+p[0]].layers[+p[1]]; }
  var thT = null;
  function thumbs(only) {
    clearTimeout(thT);
    thT = setTimeout(async function () {
      var M = await loadAll(), s = 0;
      R.tpl.scenes.forEach(function (sc, i) {
        var c = $('[data-th="' + i + '"]'); if (c && (only == null || only === i)) { var cx = c.getContext('2d'); cx.setTransform(270 / W, 0, 0, 480 / H, 0, 0); var mid = Math.min(sc.d - 0.05, Math.max(0.6, sc.layers.reduce(function (a, l) { return Math.max(a, l.at + (l.a === 'word' ? l.t.split(/\s+/).length * 0.16 : 0.5)); }, 0))); if (M[i] && M[i].v) { try { M[i].v.currentTime = Math.min(M[i].v.duration - 0.1, 0.5); } catch (e) {} } frame(cx, s + mid, M, true); }
        s += sc.d;
      });
    }, 120);
  }
  function bind() {
    var T = R.tpl, re = function () { edit(); }, retime = function () { var t = $('#rxRoot b'); };
    $('#rxName').oninput = function () { T.name = this.value; };
    $('#rxTr').onchange = function () { T.base.tr = this.value; };
    $('#rxDim').oninput = function () { T.base.dim = this.value / 100; $('#rxDimV').textContent = this.value + '%'; thumbs(); };
    $('#rxKb').onchange = function () { T.base.kb = this.checked; };
    $('#rxCap').oninput = function () { T.caption = this.value; };
    $('#rxTopic2').oninput = function () { T.topic = this.value; };
    $('#rxRe').onclick = function () { var tp = $('#rxTopic2').value.trim(); if (tp.length < 4) return X.toast('Write the new topic first.'); prog('✍️ Writing your version…'); this.disabled = true; var bt = this; X.api('rx-write', { tpl: T, topic: tp }).then(function (r) { T.scenes = r.scenes; T.topic = tp; if (r.caption) T.caption = r.caption; prog(''); re(); X.toast('✍️ New words written — add your pictures'); }).catch(function (e) { prog(''); bt.disabled = false; X.toast(e.message); }); };
    $('#rxAddSc').onclick = function () { var last = T.scenes[T.scenes.length - 1]; var s = last ? clone(last) : { d: 2.5, media: 'photo', want: '', layers: [] }; delete s.img; delete s.clip; delete s._img; delete s._vid; delete s._clipUrl; T.scenes.push(s); re(); };
    $('#rxAllPics').onclick = allPics;
    $('#rxMus').onchange = function () { R.music = this.value; T.base.music = this.value === 'own' ? T.base.music : this.value; re(); };
    $('#rxMusVol').oninput = function () { R.musicVol = +this.value; $('#rxMusV').textContent = this.value + '%'; };
    $('#rxMusUp').onchange = function () { var f = this.files && this.files[0]; if (!f) return; f.arrayBuffer().then(function (b) { return ac().decodeAudioData(b); }).then(function (buf) { OWN = buf; OWNNAME = f.name; R.music = 'own'; re(); }).catch(function () { X.toast('That file didn’t play — try an MP3.'); }); };
    $('#rxPrev').onclick = function () { livePreview().catch(function (e) { prog(''); X.toast(e.message); }); };
    $('#rxGo').onclick = function () { make().catch(function (e) { prog(''); var g = $('#rxGo'); if (g) g.disabled = false; X.toast(e.message || 'Something went wrong.'); }); };
    $$('[data-d]').forEach(function (el) { el.onchange = function () { T.scenes[+el.dataset.d].d = Math.max(0.4, Math.min(20, +el.value || 2)); re(); }; });
    $$('[data-mv]').forEach(function (el) { el.onclick = function () { var p = el.dataset.mv.split(':'), i = +p[0], j = i + (+p[1]); if (j < 0 || j >= T.scenes.length) return; var t = T.scenes[i]; T.scenes[i] = T.scenes[j]; T.scenes[j] = t; re(); }; });
    $$('[data-dup]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.dup, s = clone(T.scenes[i]); s._vid = T.scenes[i]._vid; s._clipUrl = T.scenes[i]._clipUrl; s._img = T.scenes[i]._img; T.scenes.splice(i + 1, 0, s); re(); }; });
    $$('[data-del]').forEach(function (el) { el.onclick = function () { if (T.scenes.length < 2) return X.toast('A video needs at least one scene.'); if (confirm('Delete scene ' + (+el.dataset.del + 1) + '?')) { T.scenes.splice(+el.dataset.del, 1); re(); } }; });
    $$('[data-want]').forEach(function (el) { el.oninput = function () { T.scenes[+el.dataset.want].want = el.value; }; });
    $$('[data-col]').forEach(function (el) { el.oninput = function () { var sc = T.scenes[+el.dataset.col]; sc.color = el.value; sc.media = 'color'; thumbs(+el.dataset.col); }; el.onchange = re; });
    $$('[data-plain]').forEach(function (el) { el.onclick = function () { T.scenes[+el.dataset.plain].media = 'color'; re(); }; });
    $$('[data-up]').forEach(function (el) { el.onchange = function () { var f = el.files && el.files[0]; if (f) upMedia(+el.dataset.up, f); }; });
    $$('[data-pic]').forEach(function (el) { el.onclick = function () { pic(+el.dataset.pic).then(re).catch(function (e) { X.toast(e.message); }); }; });
    $$('[data-clip]').forEach(function (el) { el.onclick = function () { aiClip(+el.dataset.clip).catch(function (e) { prog(''); X.toast(e.message); }); }; });
    var lay = function (attr, fn, ev) { $$('[' + attr + ']').forEach(function (el) { el[ev || 'oninput'] = function () { fn(L2(el.getAttribute(attr)), el); thumbs(+el.getAttribute(attr).split(':')[0]); }; }); };
    lay('data-lt', function (l, el) { l.t = el.value; });
    lay('data-lf', function (l, el) { l.f = el.value; }, 'onchange');
    lay('data-lc', function (l, el) { l.c = el.value; });
    lay('data-lo', function (l, el) { l.o = el.checked ? '#1A1A1A' : ''; }, 'onchange');
    lay('data-lsh', function (l, el) { l.sh = el.checked; }, 'onchange');
    lay('data-lup', function (l, el) { l.up = el.checked; }, 'onchange');
    lay('data-ls', function (l, el) { l.s = +el.value; });
    lay('data-ly', function (l, el) { l.y = el.value / 100; });
    lay('data-la', function (l, el) { l.a = el.value; }, 'onchange');
    lay('data-lat', function (l, el) { l.at = Math.max(0, +el.value || 0); }, 'onchange');
    $$('[data-ldel]').forEach(function (el) { el.onclick = function () { var p = el.dataset.ldel.split(':'); T.scenes[+p[0]].layers.splice(+p[1], 1); re(); }; });
    $$('[data-ladd]').forEach(function (el) { el.onclick = function () { var sc = T.scenes[+el.dataset.ladd], last = sc.layers[sc.layers.length - 1]; sc.layers.push(L(last ? { f: last.f, c: last.c, o: last.o, sh: last.sh, s: Math.round(last.s * 0.7), y: Math.min(0.9, last.y + 0.07), t: 'New text' } : { t: 'New text' })); re(); }; });
  }

  // ───── backgrounds ─────
  function shrink(file, max) {
    return new Promise(function (ok, bad) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = function () { bad(new Error('That photo didn’t open.')); }; im.src = u; });
  }
  function upMedia(i, f) {
    var sc = R.tpl.scenes[i];
    if (/^video\//.test(f.type)) { if (f.size > 400e6) return X.toast('That video is too big — under 400 MB please.'); sc._vid = URL.createObjectURL(f); sc._vname = f.name; delete sc.img; delete sc._img; delete sc.clip; delete sc._clipUrl; sc.media = 'video'; edit(); X.toast('🎬 Video added. Videos aren’t kept in saved remixes — you’d add it again.'); return; }
    shrink(f, 1920).then(function (d) { return X.api('img', { dataUrl: d }); }).then(function (r) { sc.img = r.id; delete sc._vid; delete sc.clip; delete sc._clipUrl; sc.media = 'photo'; edit(); X.toast('📷 Photo added'); }).catch(function (e) { X.toast(e.message || 'Couldn’t use that photo.'); });
  }
  function pic(i) {
    var sc = R.tpl.scenes[i]; if (!(sc.want || '').trim()) return Promise.reject(new Error('Describe the picture first (the box under the buttons).'));
    prog('✨ Making the picture for scene ' + (i + 1) + '…');
    return X.api('rx-pic', { want: sc.want }).then(function (r) { sc.img = r.img; delete sc._vid; delete sc.clip; delete sc._clipUrl; sc.media = 'photo'; prog(''); }).catch(function (e) { prog(''); throw e; });
  }
  async function allPics() {
    var todo = R.tpl.scenes.map(function (s, i) { return i; }).filter(function (i) { var s = R.tpl.scenes[i]; return s.media !== 'color' && !s.img && !s._vid && !s.clip && (s.want || '').trim(); });
    if (!todo.length) return X.toast('Every scene has a background ✅');
    if (!confirm('Make ' + todo.length + ' picture' + (todo.length === 1 ? '' : 's') + ' with your image model? Tip: your own photos and videos of real places look best.')) return;
    for (var k = 0; k < todo.length; k++) { try { await pic(todo[k]); } catch (e) { X.toast(e.message); break; } }
    edit();
  }
  // 🎥 turn a scene's picture into a 5-second AI clip (Video Ad Studio's budget model)
  async function aiClip(i) {
    var sc = R.tpl.scenes[i];
    if (!ST) ST = await X.api('vm-settings').then(function (r) { return r.settings; }).catch(function () { return null; });
    var tier = ST && ST.tiers ? ST.tiers.filter(function (t) { return t.id === 'budget'; })[0] : null, price = tier && tier.gbpPerSec ? '£' + (tier.gbpPerSec * 5).toFixed(2) : 'about £2';
    if (!confirm('Turn this picture into a 5-second AI video clip? It costs ' + price + ' and takes a few minutes.')) return;
    prog('🎥 Sending the picture…');
    var blob = await fetch(srcOf(sc)).then(function (r) { return r.blob(); });
    var d = await shrink(new File([blob], 'p.jpg', { type: blob.type || 'image/jpeg' }), 1280);
    var up = await X.api('app-img', { image: d });
    var job = (await X.api('vm-clip', { tier: 'budget', imgId: up.imgId, prompt: 'Gentle, natural camera movement, real-looking motion. ' + (sc.want || ''), seconds: 5, aspect: '9:16' })).job;
    for (var n = 0; n < 120; n++) {
      prog('🎥 Making the AI clip for scene ' + (i + 1) + '… (' + Math.round(n * 6 / 60 * 10) / 10 + ' min)');
      await new Promise(function (ok) { setTimeout(ok, 6000); });
      var st = (await X.api('vm-status', { jobs: [job] })).results[0];
      if (st.status === 'COMPLETED') { sc.clip = st.url; delete sc._clipUrl; sc.media = 'video'; await clipLocal(sc); prog(''); edit(); X.toast('🎥 AI clip ready'); return; }
      if (st.status === 'ERROR') throw new Error('The AI clip failed: ' + (st.error || 'please try again'));
    }
    throw new Error('The AI clip is taking too long — try again later.');
  }

  // ───── sound ─────
  async function mix(dur) {
    var SR = 48000, ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), m = R.music || 'none', vol = R.musicVol / 100 * 0.6;
    if (m !== 'none' && vol > 0 && !(m === 'own' && !OWN)) {
      var bus = ctx.createGain(); bus.connect(ctx.destination);
      bus.gain.setValueAtTime(0.0001, 0); bus.gain.linearRampToValueAtTime(vol, Math.min(1, dur / 3)); bus.gain.setValueAtTime(vol, Math.max(0.1, dur - 1.5)); bus.gain.linearRampToValueAtTime(0.0001, dur);
      if (m === 'own') { var s = ctx.createBufferSource(); s.buffer = OWN; s.loop = true; s.connect(bus); s.start(0); s.stop(dur); }
      else if (window.HQQuizVid && window.HQQuizVid.music) window.HQQuizVid.music.track(ctx, bus, m, dur);
    }
    return ctx.startRendering();
  }

  // ───── 👀 live preview ─────
  async function livePreview() {
    prog('Loading…'); var M = await loadAll(), dur = total(), audio = await mix(dur); prog('');
    var sh = X.sheet('<h3 style="margin:0 0 8px">👀 Preview</h3><canvas id="pvC" width="' + W + '" height="' + H + '" style="width:100%;max-width:300px;display:block;margin:0 auto;border-radius:12px;background:#000"></canvas>' +
      '<input type="range" id="pvSeek" min="0" max="' + Math.round(dur * 10) + '" value="0" style="width:100%;max-width:300px;display:block;margin:10px auto 0">' +
      '<div class="row" style="gap:8px;justify-content:center;margin-top:8px"><button class="btn primary" id="pvPlay">▶️ Play</button><button class="btn ghost" id="pvClose">Close</button><span class="muted" id="pvT">0:00 / ' + mm(dur) + '</span></div>');
    var cv = $('#pvC', sh), cx = cv.getContext('2d'), a = ac(), src = null, startAt = 0, pos = 0, raf = 0, playing = false, cur = -1;
    var vids = function (t, play) { var at = sceneAt(t); M.forEach(function (m, i) { if (!m || !m.v) return; if (i === at.i && play) { if (cur !== i) { try { m.v.currentTime = at.lt % (m.v.duration || 1); } catch (e) {} } if (m.v.paused) m.v.play().catch(function () {}); } else if (!m.v.paused) m.v.pause(); }); cur = play ? at.i : -1; };
    var paint = function (t) { frame(cx, Math.min(t, dur - 0.01), M, true); $('#pvT', sh).textContent = mm(t) + ' / ' + mm(dur); $('#pvSeek', sh).value = Math.round(t * 10); };
    var stop = function () { if (src) { try { src.stop(); } catch (e) {} src = null; } cancelAnimationFrame(raf); if (playing) pos = Math.min(dur, a.currentTime - startAt); playing = false; vids(pos, false); $('#pvPlay', sh).textContent = '▶️ Play'; };
    var loop = function () { var t = a.currentTime - startAt; if (t >= dur) { stop(); pos = 0; return; } vids(t, true); paint(t); raf = requestAnimationFrame(loop); };
    var play = async function () { if (a.state === 'suspended') await a.resume(); src = a.createBufferSource(); src.buffer = audio; src.connect(a.destination); startAt = a.currentTime - pos; src.start(0, pos); playing = true; cur = -1; $('#pvPlay', sh).textContent = '⏸ Pause'; loop(); };
    $('#pvPlay', sh).onclick = function () { if (playing) stop(); else play(); };
    $('#pvSeek', sh).oninput = function () { var was = playing; stop(); pos = this.value / 10; seekVids(M, pos).then(function () { paint(pos); }); if (was) play(); };
    $('#pvClose', sh).onclick = function () { stop(); sh.remove(); };
    sh.addEventListener('click', function (e) { if (e.target === sh) stop(); });
    await seekVids(M, 0); paint(0);
  }
  function seekV(v, t) { return new Promise(function (ok) { if (!v || !v.duration) return ok(); var tt = t % v.duration; if (Math.abs(v.currentTime - tt) < 0.001) return ok(); var done = false, fin = function () { if (!done) { done = true; ok(); } }; v.addEventListener('seeked', fin, { once: true }); setTimeout(fin, 1200); v.currentTime = tt; }); }
  function seekVids(M, t) { var a = sceneAt(t); return M[a.i] && M[a.i].v ? seekV(M[a.i].v, a.lt) : Promise.resolve(); }

  // ───── 🎬 make the MP4 ─────
  async function make() {
    if (typeof VideoEncoder !== 'function' || !window.Mp4Muxer) throw new Error('This browser can’t make videos — please use Chrome or Edge on a laptop.');
    var missing = R.tpl.scenes.filter(function (s) { return s.media !== 'color' && !srcOf(s) && !s.clip; }).length;
    if (missing && !confirm(missing + ' scene' + (missing === 1 ? ' has' : 's have') + ' no background yet and will be dark. Make the video anyway?')) return;
    $('#rxGo').disabled = true; R.out = null; $('#rxOut').innerHTML = '';
    prog('Loading the pictures and videos…'); var M = await loadAll(), dur = total(); M.forEach(function (m) { if (m && m.v) m.v.pause(); });
    prog('Mixing the sound…'); var audio = await mix(dur);
    var vpick = null, tries = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a'];
    for (var i = 0; i < tries.length && !vpick; i++) { try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i], width: W, height: H, bitrate: 8e6, framerate: FPS }); if (r && r.supported) vpick = tries[i]; } catch (e) {} }
    if (!vpick) throw new Error('This browser can’t make MP4 videos — please use Chrome or Edge.');
    var aok = false; if (typeof AudioEncoder === 'function') { try { var ar = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }); aok = !!(ar && ar.supported); } catch (e) {} }
    var mo = { target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
    if (aok) mo.audio = { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 };
    var mux = new Mp4Muxer.Muxer(mo), failed = null;
    var venc = new VideoEncoder({ output: function (c, m) { mux.addVideoChunk(c, m); }, error: function (e) { failed = e; } });
    venc.configure({ codec: vpick, width: W, height: H, bitrate: 8e6, framerate: FPS, avc: { format: 'avc' } });
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d'), N = Math.round(dur * FPS);
    for (var f = 0; f < N; f++) {
      if (failed) throw failed;
      var t = f / FPS, at = sceneAt(t); if (M[at.i] && M[at.i].v) await seekV(M[at.i].v, at.lt);
      frame(cx, t, M, false);
      var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      if (f % 15 === 0) { prog('🎬 Making the video… ' + Math.round(f / N * 100) + '%'); await new Promise(function (ok) { setTimeout(ok, 0); }); }
      if (venc.encodeQueueSize > 8) await new Promise(function (ok) { setTimeout(ok, 5); });
    }
    await venc.flush(); venc.close();
    if (aok) {
      prog('🔊 Adding the sound…');
      var aenc = new AudioEncoder({ output: function (c, m) { mux.addAudioChunk(c, m); }, error: function (e) { failed = e; } });
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
      var Lc = audio.getChannelData(0), Rc = audio.getChannelData(1), AN = audio.length;
      for (var o = 0; o < AN; o += 1024) { var n = Math.min(1024, AN - o), data = new Float32Array(n * 2); data.set(Lc.subarray(o, o + n), 0); data.set(Rc.subarray(o, o + n), n); var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / 48000 * 1e6), data: data }); aenc.encode(ad); ad.close(); if (aenc.encodeQueueSize > 20) await new Promise(function (ok) { setTimeout(ok, 2); }); }
      await aenc.flush(); aenc.close();
    }
    if (failed) throw failed;
    mux.finalize();
    R.out = { blob: new Blob([mux.target.buffer], { type: 'video/mp4' }), secs: Math.round(dur), sound: aok };
    prog(''); $('#rxGo').disabled = false; showOut();
    if (R.savedId) doSave(R.savedName).catch(function () {});
  }
  function showOut() {
    var o = R.out, box = $('#rxOut'); if (!o || !box) return; var url = URL.createObjectURL(o.blob);
    box.innerHTML = '<div class="row" style="gap:14px;align-items:flex-start;flex-wrap:wrap"><video src="' + url + '" controls playsinline style="width:240px;border-radius:12px;background:#000"></video><div style="flex:1;min-width:220px"><b>✅ Your video is ready</b> <span class="muted">(' + o.secs + ' seconds' + (o.sound ? '' : ', no sound in this browser') + ')</span>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><a class="btn primary" download="remix-' + Date.now() + '.mp4" href="' + url + '">⬇️ Download MP4</a><button class="btn ghost" id="rxCopy">📋 Copy caption</button></div><div class="muted" style="font-size:12.5px;margin-top:8px">Check any [square brackets] were filled in before you post.</div></div></div>';
    $('#rxCopy').onclick = function () { try { navigator.clipboard.writeText($('#rxCap').value); X.toast('📋 Caption copied'); } catch (e) {} };
  }

  // ───── 💾 save / open ─────
  function slimTpl() { var t = clone(R.tpl); t.base.music = R.music === 'own' ? t.base.music : R.music; t.scenes.forEach(function (s) { delete s._vid; delete s._vname; delete s._clipUrl; delete s._img; }); return t; }
  function doSave(name, asNew) { return X.api('rx-save', { id: asNew ? '' : R.savedId, name: name, tpl: slimTpl() }).then(function (r) { R.savedId = r.id; R.savedName = r.name; view(); X.toast('💾 Saved — find it in 📂 My remixes'); }); }
  function saveSheet() {
    var vids = R.tpl.scenes.filter(function (s) { return s._vid; }).length;
    var s = X.sheet('<h3 style="margin:0 0 8px">💾 Save this remix</h3><label>Name</label><input id="rxSN" value="' + esc(R.savedName || R.tpl.name) + '">' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Saves the style, scenes, words, pictures and AI clips, so you can make it again or change it for a new topic.' + (vids ? ' ⚠️ Your own video files aren’t kept (they’re too big) — add them again when you reopen.' : '') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="rxSOk">💾 Save</button>' + (R.savedId ? '<button class="btn ghost" id="rxSNew">Save as a new copy</button>' : '') + '<button class="btn ghost" id="rxSX">Cancel</button></div>');
    var go = function (asNew) { doSave($('#rxSN', s).value.trim(), asNew).then(function () { s.remove(); }).catch(function (e) { X.toast(e.message); }); };
    $('#rxSOk', s).onclick = function () { go(false); }; if ($('#rxSNew', s)) $('#rxSNew', s).onclick = function () { go(true); }; $('#rxSX', s).onclick = function () { s.remove(); };
  }
  function mine() {
    var s = X.sheet('<h3 style="margin:0 0 8px">📂 My remixes</h3><div id="rxML" class="muted">Loading…</div>');
    var paint = function (items) {
      var box = $('#rxML', s); if (!box) return;
      if (!items.length) { box.textContent = 'Nothing saved yet.'; return; } box.classList.remove('muted');
      box.innerHTML = items.map(function (it) { return '<div class="row" style="gap:8px;padding:8px 0;border-top:1px solid #EEE9DD;flex-wrap:nowrap"><div style="flex:1;min-width:0"><b>' + esc(it.name) + '</b><div class="muted" style="font-size:12.5px">' + it.n + ' scenes · saved ' + new Date(it.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div><button class="btn primary sm" data-op="' + it.id + '">Open</button><button class="btn ghost sm" data-dl="' + it.id + '">🗑️</button></div>'; }).join('');
      $$('[data-op]', s).forEach(function (b) { b.onclick = function () { X.api('rx-load', { id: b.dataset.op }).then(function (r) { state(); R.tpl = r.tpl; R.music = r.tpl.base.music; R.savedId = r.id; R.savedName = r.name; R.out = null; s.remove(); view(); }).catch(function (e) { X.toast(e.message); }); }; });
      $$('[data-dl]', s).forEach(function (b) { b.onclick = function () { if (!confirm('Delete this saved remix? This can’t be undone.')) return; X.api('rx-del', { id: b.dataset.dl }).then(function () { if (R.savedId === b.dataset.dl) { R.savedId = ''; R.savedName = ''; } paint(items = items.filter(function (x) { return x.id !== b.dataset.dl; })); }).catch(function (e) { X.toast(e.message); }); }; });
    };
    var items = []; X.api('rx-list').then(function (r) { items = r.items || []; paint(items); }).catch(function (e) { var b = $('#rxML', s); if (b) b.textContent = e.message; });
  }

  function init(x) { X = x; }
  window.HQRemix = { init: init, view: view, _frame: function (cx, t, M) { frame(cx, t, M || [], true); }, _presets: PRESETS };
})();
