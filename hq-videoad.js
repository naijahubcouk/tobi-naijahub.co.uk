/*
 * Auntie Tobi HQ — 🎥 Video Ad Studio.
 * Brief → AI production pack (strategy, script, storyboard, Dzine prompts, voice & music, CapCut guide, caption)
 * → storyboard pictures → animatic preview (+ MP4) → production pack zip. Saved as projects in HQ.
 * HQ calls HQVad.init({ api, sheet, toast, esc, S }) and HQVad.view() for #vads.
 * Uses HQCar.encode (hq-carousel.js) for the animatic MP4 and JSZip for the pack.
 */
(function () {
  'use strict';
  var X = null;
  var STATUS = { idea: '💡 Idea', scripted: '📝 Scripted', generating: '🤖 Making clips', editing: '✂️ Editing', ready: '✅ Ready', posted: '📲 Posted' };
  var PLATFORMS = { reels: 'Instagram Reels', tiktok: 'TikTok', stories: 'Stories / WhatsApp Status', shorts: 'YouTube Shorts', feed: 'Feed post (4:5)' };
  var GOALS = { bookings: 'Bookings', orders: 'Orders', enquiries: 'Enquiries / DMs', visits: 'Visits', follows: 'Follows', downloads: 'App installs', awareness: 'Awareness' };
  var TONES = { warm: '🤗 Warm', funny: '😂 Funny', premium: '✨ Premium', urgent: '⏰ Urgent', inspiring: '🌟 Inspiring', friendly: '😊 Friendly' };
  var LANGS = { english: 'British English', pidgin: 'English + a touch of Pidgin', yoruba: 'English + Yoruba phrases', igbo: 'English + Igbo phrases' };
  var MODELS = ['Kling', 'Veo 3.1', 'Hailuo', 'Sora 2', 'Wan', 'Seedance'];
  var TABS = [['strategy', '🎯 Strategy'], ['script', '📝 Script'], ['board', '🎬 Storyboard'], ['dzine', '🤖 Dzine prompts'], ['voice', '🎙️ Voice & music'], ['edit', '✂️ Edit guide'], ['post', '📣 Post'], ['check', '✅ Checklist'], ['make', '🎬 Make the video']];

  function init(ctx) { X = ctx; }
  function list() { return X.S.vads || (X.S.vads = []); }
  function $(q, r) { return (r || document).querySelector(q); }
  function $$(q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); }
  function esc(s) { return X.esc(s); }
  function fmt(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function frameSrc(id) { return id ? '/.netlify/functions/studio-hq?subimg=' + encodeURIComponent(id) : ''; }
  function aspect(p) { return p.brief && p.brief.platform === 'feed' ? '4:5' : '9:16'; }
  function totalSecs(p) { return (p.plan.scenes || []).reduce(function (n, s) { return n + (Number(s.seconds) || 0); }, 0); }
  function copy(txt) { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { X.toast('Copied ✅'); }, function () { X.toast('Couldn’t copy — select the text and copy it'); }); }
  function shrink(src) {
    return new Promise(function (ok, bad) {
      var im = new Image(), url = typeof src === 'string' ? src : URL.createObjectURL(src);
      im.onload = function () {
        var k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        var q = 0.86, out = c.toDataURL('image/jpeg', q); while (out.length > 1500000 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
        ok(out);
      };
      im.onerror = function () { bad(new Error('Couldn’t open that image — try another.')); };
      im.src = url;
    });
  }
  function opts(map, cur) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(map[k]) + '</option>'; }).join(''); }
  function chips(id, map, cur) { return '<div class="chipbar" id="' + id + '">' + Object.keys(map).map(function (k) { return '<button type="button" class="chip" data-v="' + k + '" aria-pressed="' + (String(k) === String(cur)) + '">' + esc(map[k]) + '</button>'; }).join('') + '</div>'; }
  function chipWire(root, id) { $$('#' + id + ' [data-v]', root).forEach(function (b) { b.onclick = function () { $$('#' + id + ' [data-v]', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; }); }
  function chipVal(root, id) { var b = $('#' + id + ' [aria-pressed=true]', root); return b ? b.dataset.v : ''; }

  // ════════ list ════════
  function view() {
    $('#ttl').textContent = 'Video Ad Studio';
    $('#topRight').innerHTML = '<button class="btn primary" id="vaNew">＋ New video ad</button>';
    var items = list();
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="note" style="margin-bottom:12px">Plan scroll-stopping video adverts for businesses (or for Auntie Tobi). AI writes the story, script, storyboard and <b>Dzine</b> prompts, plus the voiceover, music and CapCut guide. Preview it as an animatic, then make the clips in Dzine.</div>' +
      (items.length ? '<div class="cargrid">' + items.map(function (p) {
        var f = p.frames && (p.frames['0'] || p.frames[Object.keys(p.frames)[0]]);
        return '<div class="card carcard" data-vopen="' + p.id + '">' + (f ? '<img class="carthumb" style="object-fit:cover" src="' + frameSrc(f) + '" alt="">' : '<div class="carthumb" style="display:flex;align-items:center;justify-content:center;font-size:34px;background:#0F1E36">🎥</div>') +
          '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15.5px;line-height:1.3">' + esc(p.plan.title || 'Untitled ad') + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:4px">' + esc(p.brief.forWho === 'auntietobi' ? 'Auntie Tobi' : (p.brief.business || 'Business')) + ' · ' + p.brief.length + 's · ' + esc(PLATFORMS[p.brief.platform] || '') + '</div>' +
          '<div style="font-size:13px;margin-top:6px"><b>' + esc(STATUS[p.status] || '') + '</b> <span class="muted">· edited ' + esc(fmt(p.updatedAt)) + '</span></div>' +
          '<div class="apact" style="margin-top:10px"><button class="btn primary sm" data-vopen="' + p.id + '">✏️ Open</button><button class="btn ghost sm" data-vdel="' + p.id + '">🗑 Delete</button></div></div></div>';
      }).join('') + '</div>' : '<div class="card"><p class="muted">No video ads yet. Tap <b>＋ New video ad</b> to plan your first one.</p></div>') + '</div>';
    $('#vaNew').onclick = function () { briefSheet(); };
    $$('[data-vopen]').forEach(function (b) { b.onclick = function (e) { if (e.target.closest('[data-vdel]')) return; var p = list().filter(function (x) { return x.id === b.dataset.vopen; })[0]; if (p) editor(JSON.parse(JSON.stringify(p))); }; });
    $$('[data-vdel]').forEach(function (b) {
      b.onclick = async function (e) {
        e.stopPropagation(); if (!confirm('Delete this video ad project?')) return;
        try { await X.api('va-delete', { id: b.dataset.vdel }); X.S.vads = list().filter(function (x) { return x.id !== b.dataset.vdel; }); X.toast('Deleted'); view(); } catch (x) { X.toast(x.message); }
      };
    });
  }

  // ════════ brief ════════
  function briefSheet(prev) {
    var b = Object.assign({ forWho: 'business', goal: 'enquiries', length: 30, platform: 'reels', tone: 'warm', lang: 'english' }, prev || {});
    var s = X.sheet('<h2>🎥 New video ad</h2><p class="muted" style="margin:4px 0 10px">Tell AI about the business and what the ad should do. It plans everything for Dzine.</p>' +
      '<div class="lbl">Who is the ad for?</div>' + chips('vbFor', { business: '🏪 A business', auntietobi: '💚 Auntie Tobi' }, b.forWho) +
      '<div id="vbBiz"><label for="vbQ" style="margin-top:10px">Find a business in the Auntie Tobi directory <span class="muted" style="font-weight:400">(optional)</span></label><input id="vbQ" placeholder="Type a name, e.g. cakes Manchester" autocomplete="off"><div id="vbRes"></div>' +
      '<div class="f2"><div><label for="vbName">Business name</label><input id="vbName" value="' + esc(b.business || '') + '"></div><div><label for="vbLoc">Location</label><input id="vbLoc" value="' + esc(b.location || '') + '" placeholder="City / area"></div></div>' +
      '<label for="vbAbout">What they do</label><textarea id="vbAbout" rows="3" placeholder="What they sell or offer, what makes them special">' + esc(b.about || '') + '</textarea></div>' +
      '<label for="vbOffer">What should the ad push? <span class="muted" style="font-weight:400">(offer, product, event, price — only real facts)</span></label><textarea id="vbOffer" rows="2">' + esc(b.offer || '') + '</textarea>' +
      '<div class="f2"><div><label for="vbAud">Who is it for?</label><input id="vbAud" value="' + esc(b.audience || '') + '" placeholder="e.g. Nigerian brides in the North West"></div><div><label for="vbContact">How to book / contact</label><input id="vbContact" value="' + esc(b.contact || '') + '" placeholder="WhatsApp, DM, website…"></div></div>' +
      '<label for="vbLink">Website / Instagram link <span class="muted" style="font-weight:400">(optional)</span></label><input id="vbLink" value="' + esc(b.link || '') + '" placeholder="https://"><label class="chk" style="margin-top:6px"><input type="checkbox" id="vbRead" checked> Let AI read this page for extra details</label>' +
      '<div class="f2" style="margin-top:6px"><div><label for="vbGoal">Goal</label><select id="vbGoal">' + opts(GOALS, b.goal) + '</select></div><div><label for="vbPlat">Platform</label><select id="vbPlat">' + opts(PLATFORMS, b.platform) + '</select></div></div>' +
      '<div class="lbl">Length</div>' + chips('vbLen', { 15: '15 seconds', 30: '30 seconds', 60: '60 seconds' }, b.length) +
      '<div class="lbl">Tone</div>' + chips('vbTone', TONES, b.tone) +
      '<label for="vbLang" style="margin-top:8px">Language</label><select id="vbLang">' + opts(LANGS, b.lang) + '</select>' +
      '<label for="vbNotes">Anything else? <span class="muted" style="font-weight:400">(ideas, must-say lines, things to avoid)</span></label><textarea id="vbNotes" rows="3">' + esc(b.notes || '') + '</textarea>' +
      '<div class="err hidden" id="vbErr"></div><div id="vbProg" class="hidden" style="margin-top:10px"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" id="vbX">Cancel</button><button class="btn primary" id="vbGo">✨ Plan my video ad</button></div>');
    chipWire(s, 'vbFor'); chipWire(s, 'vbLen'); chipWire(s, 'vbTone');
    function paintFor() { $('#vbBiz', s).classList.toggle('hidden', chipVal(s, 'vbFor') === 'auntietobi'); }
    $$('#vbFor [data-v]', s).forEach(function (x) { x.addEventListener('click', paintFor); }); paintFor();
    var slug = b.bizSlug || '', qT = 0;
    $('#vbQ', s).oninput = function () {
      clearTimeout(qT); var q = this.value.trim(); if (q.length < 2) { $('#vbRes', s).innerHTML = ''; return; }
      qT = setTimeout(async function () {
        try {
          var r = await X.api('va-biz', { q: q });
          $('#vbRes', s).innerHTML = (r.results || []).length ? '<div class="vres">' + r.results.map(function (x) { return '<button type="button" class="btn ghost sm" data-slug="' + esc(x.slug) + '">' + esc(x.name) + ' <span class="muted">· ' + esc(x.cat || '') + (x.loc ? ', ' + esc(x.loc) : '') + '</span></button>'; }).join('') + '</div>' : '<p class="muted" style="font-size:13px">No match — just fill in the details below.</p>';
          $$('[data-slug]', s).forEach(function (bt) {
            bt.onclick = async function () {
              try {
                var g = await X.api('va-biz-get', { slug: bt.dataset.slug }), z = g.biz; if (!z) return;
                slug = z.slug; $('#vbName', s).value = z.name || ''; $('#vbLoc', s).value = z.loc || ''; $('#vbAbout', s).value = [z.cat, z.desc].filter(Boolean).join(' — ');
                $('#vbContact', s).value = [z.wa ? 'WhatsApp +' + z.wa : '', z.ig ? 'Instagram @' + String(z.ig).replace(/^@/, '') : ''].filter(Boolean).join(' · ');
                if (z.website) $('#vbLink', s).value = z.website;
                $('#vbRes', s).innerHTML = '<p class="muted" style="font-size:13px">✅ Filled in from their Auntie Tobi listing — check and add the offer.</p>'; $('#vbQ', s).value = '';
              } catch (x) { X.toast(x.message); }
            };
          });
        } catch (x) { /* ignore */ }
      }, 300);
    };
    $('#vbX', s).onclick = function () { s.remove(); };
    $('#vbGo', s).onclick = async function () {
      var btn = this, err = $('#vbErr', s); err.classList.add('hidden');
      var brief = {
        forWho: chipVal(s, 'vbFor'), bizSlug: slug, business: $('#vbName', s).value.trim(), location: $('#vbLoc', s).value.trim(), about: $('#vbAbout', s).value.trim(),
        offer: $('#vbOffer', s).value.trim(), audience: $('#vbAud', s).value.trim(), contact: $('#vbContact', s).value.trim(), link: $('#vbLink', s).value.trim(),
        goal: $('#vbGoal', s).value, platform: $('#vbPlat', s).value, length: +chipVal(s, 'vbLen'), tone: chipVal(s, 'vbTone'), lang: $('#vbLang', s).value, notes: $('#vbNotes', s).value.trim(),
      };
      if (brief.link && !/^https?:\/\//i.test(brief.link)) brief.link = 'https://' + brief.link;
      if (brief.forWho === 'business' && !brief.business && brief.about.length < 10) { err.textContent = 'Pick a business or describe it first.'; err.classList.remove('hidden'); return; }
      btn.disabled = true;
      try {
        var proj = await runPlan(brief, '', $('#vbProg', s), $('#vbRead', s).checked);
        s.remove(); editor(proj, true);
      } catch (x) { err.textContent = x.message; err.classList.remove('hidden'); btn.disabled = false; $('#vbProg', s).classList.add('hidden'); }
    };
  }
  // runs the 3 AI steps with a progress list; returns an unsaved project
  async function runPlan(brief, extra, progEl, readLink, keep) {
    var steps = ['📖 Writing the story, hooks and scenes…', '🤖 Writing the Dzine prompts…', '🎙️ Voiceover, music, editing guide and caption…'];
    function show(k, note) { progEl.classList.remove('hidden'); progEl.innerHTML = steps.map(function (t, i) { return '<div style="font-size:14px;margin:3px 0;' + (i > k ? 'opacity:.45' : '') + '">' + (i < k ? '✅ ' : i === k ? '⏳ ' : '◻️ ') + esc(t) + (i === k && note ? ' <span class="muted">' + esc(note) + '</span>' : '') + '</div>'; }).join(''); }
    show(0);
    var r1 = await X.api('va-plan', { brief: brief, extra: extra, readLink: !!readLink });
    var plan = r1.plan, b = r1.brief, n = plan.scenes.length;
    for (var from = 0; from < n; from += 4) {
      show(1, 'scenes ' + (from + 1) + '–' + Math.min(n, from + 4) + ' of ' + n);
      var r2 = await X.api('va-prompts', { brief: b, plan: plan, from: from, to: from + 4 });
      (r2.scenes || []).forEach(function (g) { var sc = plan.scenes.filter(function (x) { return x.n === g.n; })[0]; if (sc) { sc.imagePrompt = g.imagePrompt; sc.videoPrompt = g.videoPrompt; sc.model = g.model; sc.clipSeconds = g.clipSeconds; } });
    }
    show(2);
    var r3 = await X.api('va-finish', { brief: b, plan: plan });
    Object.assign(plan, r3);
    var proj = Object.assign({ status: 'scripted', frames: {}, done: [] }, keep || {}, { brief: b, plan: plan });
    if (keep) { proj.frames = {}; var om = keep.make || {}; proj.make = { tier: om.tier, voice: om.voice, music: om.music, musicPrompt: '', musicVol: om.musicVol, charImg: '', captions: om.captions, endCard: om.endCard, clips: {}, vo: {} }; } // scenes changed, old pictures and clips no longer match
    return proj;
  }

  // ════════ editor ════════
  function editor(p, fresh) {
    p.frames = p.frames || {}; p.done = p.done || []; p.plan.scenes = p.plan.scenes || [];
    var tab = 'strategy', saveT = 0, dirty = false, closed = false, imgs = {}, t0 = performance.now(), playing = false, raf = 0;
    var ov = document.createElement('div'); ov.className = 'carx';
    ov.innerHTML = '<div class="carbar"><button class="btn ghost sm" id="veX">← Back</button><input id="veTitle" class="cartitle" maxlength="120"><select id="veStatus" style="width:auto">' + opts(STATUS, p.status) + '</select><span class="muted" id="veSaved" style="font-size:13px;white-space:nowrap"></span></div>' +
      '<div class="carbody"><div class="carleft"><div class="chipbar" id="veTabs" style="margin-bottom:10px">' + TABS.map(function (t) { return '<button class="chip" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="vePane"></div></div>' +
      '<div class="carright"><div class="card" style="padding:12px"><div class="row" style="justify-content:space-between;align-items:center"><b>▶ Animatic</b><span class="muted" id="veLen" style="font-size:13px"></span></div>' +
      '<div class="carstage" style="margin-top:8px"><canvas id="veCv"></canvas></div>' +
      '<div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn primary sm" id="vePlay">▶ Play</button><button class="btn ghost sm" id="veMp4">🎞 Download animatic (MP4)</button></div>' +
      '<p class="muted" style="font-size:12.5px;margin:6px 0 0">A rough preview using the storyboard pictures, on-screen text and timings — great for client approval before making the clips.</p></div>' +
      '<div class="card" style="margin-top:10px"><b>⬇️ Production pack</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Script, storyboard pictures, every Dzine prompt, voiceover, captions file (.srt), music, CapCut guide and caption — in one zip.</p>' +
      '<button class="btn primary" id="vePack" style="width:100%">📦 Download production pack</button>' +
      '<div id="veProg" class="hidden" style="margin-top:10px"><div class="muted" id="veProgT" style="font-size:13px"></div><div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:4px"><div id="veProgB" style="height:100%;width:0;background:var(--green)"></div></div></div>' +
      '<button class="btn ghost sm" id="veReplan" style="margin-top:10px">🔄 Re-plan with new direction</button></div></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    var q = function (sel) { return $(sel, ov); };
    var cv = q('#veCv'), ctx = cv.getContext('2d');
    function sizeCanvas() { var a = aspect(p); cv.width = 540; cv.height = a === '4:5' ? 675 : 960; }
    sizeCanvas();
    q('#veTitle').value = p.plan.title || '';

    function mark() { dirty = true; q('#veSaved').textContent = 'Saving…'; clearTimeout(saveT); saveT = setTimeout(save, 1500); }
    async function save() {
      clearTimeout(saveT);
      try {
        var r = await X.api('va-save', { item: { id: p.id, status: p.status, brief: p.brief, plan: p.plan, frames: p.frames, done: p.done, make: p.make } });
        p.id = r.item.id; p.updatedAt = r.item.updatedAt;
        var l = list(), k = l.findIndex(function (x) { return x.id === p.id; }); var copyP = JSON.parse(JSON.stringify(Object.assign({}, r.item, { done: p.done })));
        if (r.item.make) { var keepMake = p.make || {}; p.make = Object.assign(keepMake, { tier: r.item.make.tier }); }
        if (k >= 0) l[k] = copyP; else l.unshift(copyP);
        dirty = false; q('#veSaved').textContent = 'Saved ✓'; return true;
      } catch (x) { q('#veSaved').textContent = 'Not saved — ' + x.message; return false; }
    }
    function paintLen() { var t = totalSecs(p); q('#veLen').textContent = t + 's of ' + p.brief.length + 's · ' + p.plan.scenes.length + ' scenes'; }

    // ── fields helpers ──
    function field(label, path, val, rows, ai) {
      var id = 'f' + Math.random().toString(36).slice(2, 8);
      return '<div class="vf"><div class="row" style="justify-content:space-between;align-items:flex-end;gap:6px"><label for="' + id + '">' + label + '</label><span class="vfbtn">' +
        (ai ? '<button class="btn link" data-ai="' + id + '" title="Rewrite with AI">✨ Improve</button>' : '') + '<button class="btn link" data-copy="' + id + '" title="Copy">📋</button></span></div>' +
        (rows ? '<textarea id="' + id + '" data-path="' + path + '" rows="' + rows + '">' + esc(val || '') + '</textarea>' : '<input id="' + id + '" data-path="' + path + '" value="' + esc(val || '') + '">') + '</div>';
    }
    function getPath(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, p); }
    function setPath(path, v) { var ks = path.split('.'), o = p; for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
    function wireFields(root) {
      $$('[data-path]', root).forEach(function (el) {
        el.addEventListener('input', function () {
          var path = el.dataset.path, v = el.value;
          if (/\.seconds$|\.clipSeconds$/.test(path)) v = Number(v) || 0;
          if (el.dataset.list) v = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
          setPath(path, v); mark(); if (/\.seconds$/.test(path)) paintLen();
        });
      });
      $$('[data-copy]', root).forEach(function (b) { b.onclick = function () { copy($('#' + b.dataset.copy, root).value); }; });
      $$('[data-ai]', root).forEach(function (b) {
        b.onclick = async function () {
          var el = $('#' + b.dataset.ai, root), how = prompt('How should AI change it?', 'Make it punchier and more engaging');
          if (how == null) return;
          b.disabled = true; var keep = b.textContent; b.textContent = '✨ …';
          try {
            var r = await X.api('va-rewrite', { brief: p.brief, field: el.dataset.path, text: el.value, how: how, context: 'Ad: ' + (p.plan.title || '') + '. Angle: ' + (p.plan.strategy.angle || '') + '. Lookbook: ' + (p.plan.lookbook.character || '') });
            el.value = r.text; el.dispatchEvent(new Event('input'));
          } catch (x) { X.toast(x.message); }
          b.disabled = false; b.textContent = keep;
        };
      });
    }
    function copyAllBtn(id, label) { return '<button class="btn ghost sm" id="' + id + '">📋 ' + label + '</button>'; }

    // ── panes ──
    var PANES = {
      strategy: function () {
        var st = p.plan.strategy;
        return '<div class="card"><div class="lbl" style="margin-top:0">Pick your hook (first 1–2 seconds)</div>' +
          st.hooks.map(function (h, i) { return '<div class="row" style="gap:8px;align-items:flex-start;margin-top:6px"><input type="radio" name="vhook" value="' + i + '"' + (i === st.chosenHook ? ' checked' : '') + ' style="width:auto;margin-top:12px">' + '<div style="flex:1">' + field('Hook ' + (i + 1), 'plan.strategy.hooks.' + i, h, 2, true) + '</div></div>'; }).join('') +
          '</div><div class="card" style="margin-top:10px">' + field('Story framework', 'plan.strategy.framework', st.framework) + field('The angle', 'plan.strategy.angle', st.angle, 3, true) +
          '<div class="f2">' + field('Emotion to aim for', 'plan.strategy.emotion', st.emotion) + field('Call to action', 'plan.strategy.cta', st.cta, 0, true) + '</div>' + field('Why it works', 'plan.strategy.whyItWorks', st.whyItWorks, 3) + '</div>';
      },
      script: function () {
        return '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><span class="muted" style="font-size:13px">Voiceover ≈ 2.5 words per second. Edit freely — the animatic updates.</span>' + copyAllBtn('veCopyScript', 'Copy script') + '</div>' +
          p.plan.scenes.map(function (s, i) {
            return '<div class="card vscene"><div class="row" style="gap:8px;align-items:center"><b>Scene ' + (i + 1) + '</b><input data-path="plan.scenes.' + i + '.title" value="' + esc(s.title) + '" style="flex:1"><input type="number" min="1" max="15" data-path="plan.scenes.' + i + '.seconds" value="' + s.seconds + '" style="width:72px"> <span class="muted">sec</span></div>' +
              field('🎙️ Voiceover', 'plan.scenes.' + i + '.vo', s.vo, 2, true) + '<div class="f2">' + field('🔤 On-screen text', 'plan.scenes.' + i + '.onScreen', s.onScreen, 0, true) + field('🔊 Sound effect', 'plan.scenes.' + i + '.sfx', s.sfx) + '</div>' +
              '<div class="f2">' + field('🎯 Purpose', 'plan.scenes.' + i + '.purpose', s.purpose) + field('↪️ Transition', 'plan.scenes.' + i + '.transition', s.transition) + '</div></div>';
          }).join('');
      },
      board: function () {
        return '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap"><span class="muted" style="font-size:13px">Storyboard pictures use each scene’s Dzine start-frame prompt (about 4p each).</span><button class="btn primary sm" id="veAllPics">🎨 Create all missing pictures</button></div>' +
          '<div class="vboard">' + p.plan.scenes.map(function (s, i) {
            var f = p.frames[String(i)];
            return '<div class="card vbcard"><div class="vbimg' + (aspect(p) === '4:5' ? ' feed' : '') + '">' + (f ? '<img src="' + frameSrc(f) + '" alt="Scene ' + (i + 1) + '">' : '<span>Scene ' + (i + 1) + '<br><small>No picture yet</small></span>') + '</div>' +
              '<div style="font-weight:800;margin-top:6px">' + (i + 1) + '. ' + esc(s.title) + ' <span class="muted" style="font-weight:400">· ' + s.seconds + 's</span></div>' +
              '<div class="apact" style="margin:6px 0"><button class="btn ghost sm" data-pic="' + i + '">' + (f ? '🔄 Another' : '🎨 Create') + '</button><label class="btn ghost sm" style="margin:0">📷 Upload<input type="file" accept="image/*" data-up="' + i + '" hidden></label>' + (f ? '<button class="btn link" data-rmpic="' + i + '">✖</button>' : '') + '</div>' +
              field('🎥 Shot', 'plan.scenes.' + i + '.shot', s.shot) + field('📹 Camera', 'plan.scenes.' + i + '.camera', s.camera) + field('👀 What we see', 'plan.scenes.' + i + '.visual', s.visual, 3) + '</div>';
          }).join('') + '</div>';
      },
      dzine: function () {
        var lb = p.plan.lookbook;
        return '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b>Step 1 · Create the consistent character in Dzine</b>' + copyAllBtn('veCopyPrompts', 'Copy every prompt') + '</div>' +
          '<p class="muted" style="font-size:13px;margin:4px 0 8px">In Dzine: Text to Image → paste the character-sheet prompt → pick the best result → save it as a <b>Consistent Character</b>. Use that character for every scene that has them.</p>' +
          field('Character sheet prompt', 'plan.lookbook.characterSheetPrompt', lb.characterSheetPrompt, 4) + field('Character', 'plan.lookbook.character', lb.character, 3) +
          '<div class="f2">' + field('Wardrobe', 'plan.lookbook.wardrobe', lb.wardrobe, 2) + field('Setting', 'plan.lookbook.setting', lb.setting, 2) + '</div>' +
          '<div class="f2">' + field('Colour palette', 'plan.lookbook.palette', lb.palette) + field('Lighting', 'plan.lookbook.lighting', lb.lighting) + '</div>' +
          field('Style', 'plan.lookbook.style', lb.style) + field('Negative prompt', 'plan.lookbook.negative', lb.negative, 2) + '</div>' +
          '<p class="muted" style="font-size:13px;margin:12px 0 4px"><b>Step 2 · For each scene:</b> Text to Image with the start-frame prompt (use the consistent character) → Image to Video with the motion prompt and the model shown → Lip Sync for talking scenes (upload the voiceover line from ElevenLabs).</p>' +
          p.plan.scenes.map(function (s, i) {
            return '<div class="card vscene"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b>Scene ' + (i + 1) + ' · ' + esc(s.title) + '</b>' + (s.character ? '<span class="vtag">👤 Character</span>' : '') + (s.lipSync ? '<span class="vtag gold">👄 Lip sync</span>' : '') +
              '<span style="margin-left:auto" class="row"><select data-path="plan.scenes.' + i + '.model" style="width:auto">' + MODELS.concat(MODELS.indexOf(s.model) < 0 && s.model ? [s.model] : []).map(function (m) { return '<option' + (m === s.model ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select><select data-path="plan.scenes.' + i + '.clipSeconds" style="width:auto"><option value="5"' + (s.clipSeconds === 5 ? ' selected' : '') + '>5s clip</option><option value="10"' + (s.clipSeconds === 10 ? ' selected' : '') + '>10s clip</option></select></span></div>' +
              field('🖼️ Start-frame prompt (Text to Image)', 'plan.scenes.' + i + '.imagePrompt', s.imagePrompt, 5, true) + field('🎬 Motion prompt (Image to Video)', 'plan.scenes.' + i + '.videoPrompt', s.videoPrompt, 3, true) + '</div>';
          }).join('');
      },
      voice: function () {
        var v = p.plan.voice, m = p.plan.music;
        return '<div class="card"><b>🎙️ Voiceover</b>' + field('Voice direction', 'plan.voice.direction', v.direction, 2) + field('Full voiceover script', 'plan.voice.script', v.script, 7, true) + field('ElevenLabs settings', 'plan.voice.elevenlabs', v.elevenlabs, 2) +
          '<p class="muted" style="font-size:13px">Tip: generate each scene’s line separately in ElevenLabs so they’re easy to place and to use for Lip Sync in Dzine.</p></div>' +
          '<div class="card" style="margin-top:10px"><b>🎵 Music & sound</b><div class="f2">' + field('Mood', 'plan.music.mood', m.mood) + field('Tempo (BPM)', 'plan.music.bpm', m.bpm) + '</div>' +
          '<div class="vf"><label>Royalty-free music search terms <span class="muted" style="font-weight:400">— one per line</span></label><textarea rows="4" data-path="plan.music.search" data-list="1">' + esc((m.search || []).join('\n')) + '</textarea></div>' +
          field('Trending sound tip', 'plan.music.trending', m.trending, 2) +
          '<div class="vf"><label>Sound effects <span class="muted" style="font-weight:400">— one per line</span></label><textarea rows="4" data-path="plan.music.sfx" data-list="1">' + esc((m.sfx || []).join('\n')) + '</textarea></div></div>';
      },
      edit: function () {
        return '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b>✂️ CapCut assembly guide</b>' + copyAllBtn('veCopyEdit', 'Copy guide') + '</div>' +
          '<ol class="vlist">' + (p.plan.editing || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
          '<div class="vf"><label>Edit the steps <span class="muted" style="font-weight:400">— one per line</span></label><textarea rows="8" data-path="plan.editing" data-list="1">' + esc((p.plan.editing || []).join('\n')) + '</textarea></div>' +
          '<p class="muted" style="font-size:13px">The production pack includes <b>captions.srt</b> — import it in CapCut (Text → Captions → Import) for timed subtitles.</p></div>';
      },
      post: function () {
        var o = p.plan.post;
        return '<div class="card">' + field('Caption', 'plan.post.caption', o.caption, 6, true) + field('Hashtags', 'plan.post.hashtags', o.hashtags, 2) +
          '<div class="f2">' + field('End-card text', 'plan.post.endCard', o.endCard, 0, true) + field('Best time to post', 'plan.post.bestTime', o.bestTime) + '</div>' + field('Pinned comment', 'plan.post.pinnedComment', o.pinnedComment, 2, true) +
          copyAllBtn('veCopyPost', 'Copy caption + hashtags') + '</div>';
      },
      make: function () { return window.HQVmake ? HQVmake.html(p) : '<div class="card">Video maker not loaded.</div>'; },
      check: function () {
        return '<div class="card"><b>✅ Production checklist</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Tick things off as you go — saved for the team.</p>' +
          (p.plan.checklist || []).map(function (x, i) { return '<label class="chk vcheck"><input type="checkbox" data-done="' + i + '"' + (p.done.indexOf(i) >= 0 ? ' checked' : '') + '> <span>' + esc(x) + '</span></label>'; }).join('') + '</div>';
      },
    };
    function paintPane() {
      $$('#veTabs [data-tab]', ov).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tab === tab); });
      var pane = q('#vePane'); pane.innerHTML = PANES[tab](); wireFields(pane);
      if (tab === 'make' && window.HQVmake) HQVmake.wire(pane, p, { api: X.api, toast: X.toast, esc: X.esc, sheet: X.sheet, mark: mark, save: save, frameSrc: frameSrc, aspect: aspect, shrink: shrink, slug: slug });
      $$('input[name=vhook]', pane).forEach(function (r) { r.onchange = function () { p.plan.strategy.chosenHook = +r.value; mark(); }; });
      $$('[data-done]', pane).forEach(function (c) { c.onchange = function () { var i = +c.dataset.done; p.done = p.done.filter(function (x) { return x !== i; }); if (c.checked) p.done.push(i); mark(); }; });
      $$('[data-pic]', pane).forEach(function (b) { b.onclick = function () { makePic(+b.dataset.pic, b); }; });
      $$('[data-up]', pane).forEach(function (inp) { inp.onchange = async function () { var f = inp.files && inp.files[0]; if (!f) return; try { await setPic(+inp.dataset.up, await shrink(f)); } catch (x) { X.toast(x.message); } }; });
      $$('[data-rmpic]', pane).forEach(function (b) { b.onclick = function () { delete p.frames[b.dataset.rmpic]; mark(); paintPane(); }; });
      var all = q('#veAllPics'); if (all) all.onclick = async function () {
        var todo = p.plan.scenes.map(function (_, i) { return i; }).filter(function (i) { return !p.frames[String(i)]; });
        if (!todo.length) return X.toast('Every scene has a picture');
        if (!confirm('Create ' + todo.length + ' storyboard picture' + (todo.length > 1 ? 's' : '') + ' (about ' + (todo.length * 4) + 'p)?')) return;
        all.disabled = true;
        for (var k = 0; k < todo.length; k++) { all.textContent = '🎨 Creating ' + (k + 1) + ' of ' + todo.length + '…'; try { await makePic(todo[k]); } catch (x) { X.toast(x.message); break; } }
        all.disabled = false; all.textContent = '🎨 Create all missing pictures';
      };
      var cs = q('#veCopyScript'); if (cs) cs.onclick = function () { copy(scriptText()); };
      var cp = q('#veCopyPrompts'); if (cp) cp.onclick = function () { copy(promptsText()); };
      var ce = q('#veCopyEdit'); if (ce) ce.onclick = function () { copy((p.plan.editing || []).map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n')); };
      var cpo = q('#veCopyPost'); if (cpo) cpo.onclick = function () { copy(p.plan.post.caption + '\n\n' + p.plan.post.hashtags); };
    }
    async function setPic(i, dataUrl) {
      var r = await X.api('app-img', { image: dataUrl });
      p.frames[String(i)] = r.imgId; imgs[r.imgId] = null; mark(); if (tab === 'board') paintPane(); loadImgs();
    }
    async function makePic(i, btn) {
      var s = p.plan.scenes[i]; if (!s || !s.imagePrompt) { X.toast('This scene has no start-frame prompt yet'); return; }
      if (btn) { btn.disabled = true; btn.textContent = '🎨 Creating…'; }
      try { var r = await X.api('app-picture', { kind: 'frame', prompt: s.imagePrompt + (p.plan.lookbook.style ? ' Style: ' + p.plan.lookbook.style + '.' : ''), aspect: aspect(p) }); await setPic(i, await shrink(r.image)); }
      catch (x) { if (btn) { X.toast(x.message); btn.disabled = false; btn.textContent = '🎨 Create'; } else throw x; }
    }

    // ── texts for copy & pack ──
    function hook() { return p.plan.strategy.hooks[p.plan.strategy.chosenHook] || ''; }
    function scriptText() {
      var t = 0;
      return [p.plan.title, 'Hook: ' + hook(), ''].concat(p.plan.scenes.map(function (s, i) {
        var a = t; t += Number(s.seconds) || 0;
        return 'SCENE ' + (i + 1) + ' — ' + s.title + ' (' + a + 's–' + t + 's)\n  VO: ' + (s.vo || '—') + '\n  On screen: ' + (s.onScreen || '—') + '\n  SFX: ' + (s.sfx || '—') + '\n  Transition: ' + (s.transition || '—');
      })).join('\n');
    }
    function promptsText() {
      var lb = p.plan.lookbook;
      return ['DZINE PROMPTS — ' + p.plan.title, '', '1) CONSISTENT CHARACTER — character sheet prompt:', lb.characterSheetPrompt, '', 'Character: ' + lb.character, 'Wardrobe: ' + lb.wardrobe, 'Setting: ' + lb.setting, 'Palette: ' + lb.palette, 'Lighting: ' + lb.lighting, 'Style: ' + lb.style, 'Negative prompt: ' + lb.negative, '']
        .concat(p.plan.scenes.map(function (s, i) {
          return '— SCENE ' + (i + 1) + ': ' + s.title + ' (' + s.seconds + 's · ' + (s.model || 'Kling') + ' · ' + s.clipSeconds + 's clip' + (s.character ? ' · use consistent character' : '') + (s.lipSync ? ' · LIP SYNC' : '') + ')\nStart frame (Text to Image):\n' + s.imagePrompt + '\n\nMotion (Image to Video):\n' + s.videoPrompt + '\n';
        })).join('\n');
    }
    function srt() {
      var t = 0, n = 0, out = [];
      function ts(x) { var ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return [h, m, s].map(function (v) { return String(v).padStart(2, '0'); }).join(':') + ',' + String(ms % 1000).padStart(3, '0'); }
      p.plan.scenes.forEach(function (s) { var a = t; t += Number(s.seconds) || 0; if (s.vo) { n++; out.push(n + '\n' + ts(a) + ' --> ' + ts(t - 0.05) + '\n' + s.vo.replace(/\[pause\]/gi, '').trim() + '\n'); } });
      return out.join('\n');
    }
    function packText() {
      var b = p.brief, st = p.plan.strategy, v = p.plan.voice, m = p.plan.music, o = p.plan.post;
      return {
        '00-README.txt': ['🎥 ' + p.plan.title, 'For: ' + (b.forWho === 'auntietobi' ? 'Auntie Tobi' : b.business) + ' · ' + b.length + 's · ' + (PLATFORMS[b.platform] || '') + ' · goal: ' + (GOALS[b.goal] || ''), '', 'HOW TO MAKE IT', '1. Dzine: create the consistent character (04-dzine-prompts.txt, step 1).', '2. Dzine: make each start frame (Text to Image), then animate it (Image to Video) with the model shown.', '3. ElevenLabs: record each voiceover line (05-voiceover.txt).', '4. Dzine: Lip Sync the talking scenes with their voiceover line.', '5. CapCut: assemble with 07-editing-guide.txt, import captions.srt, add music (06-music.txt).', '6. Post with 08-post.txt.', '', 'Storyboard pictures are in /storyboard.'].join('\n'),
        '01-strategy.txt': ['HOOK: ' + hook(), 'Other hooks:\n- ' + st.hooks.join('\n- '), 'Framework: ' + st.framework, 'Angle: ' + st.angle, 'Emotion: ' + st.emotion, 'CTA: ' + st.cta, 'Why it works: ' + st.whyItWorks].join('\n\n'),
        '02-script.txt': scriptText(),
        '03-storyboard.txt': p.plan.scenes.map(function (s, i) { return 'SCENE ' + (i + 1) + ' — ' + s.title + ' (' + s.seconds + 's)\nShot: ' + s.shot + '\nCamera: ' + s.camera + '\nWhat we see: ' + s.visual + '\nOn screen: ' + s.onScreen + '\nPicture: storyboard/scene-' + String(i + 1).padStart(2, '0') + '.jpg'; }).join('\n\n'),
        '04-dzine-prompts.txt': promptsText(),
        '05-voiceover.txt': ['Direction: ' + v.direction, 'ElevenLabs: ' + v.elevenlabs, '', v.script, '', 'LINE BY LINE:'].concat(p.plan.scenes.map(function (s, i) { return 'Scene ' + (i + 1) + ' (' + s.seconds + 's): ' + (s.vo || '—'); })).join('\n'),
        '06-music.txt': ['Mood: ' + m.mood, 'Tempo: ' + m.bpm, 'Search terms:\n- ' + (m.search || []).join('\n- '), 'Trending sound: ' + m.trending, 'Sound effects:\n- ' + (m.sfx || []).join('\n- ')].join('\n\n'),
        '07-editing-guide.txt': (p.plan.editing || []).map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'),
        '08-post.txt': [o.caption, '', o.hashtags, '', 'End card: ' + o.endCard, 'Pinned comment: ' + o.pinnedComment, 'Best time: ' + o.bestTime].join('\n'),
        '09-checklist.txt': (p.plan.checklist || []).map(function (x, i) { return (p.done.indexOf(i) >= 0 ? '[x] ' : '[ ] ') + x; }).join('\n'),
        'captions.srt': srt(),
      };
    }
    function slug() { return String(p.plan.title || 'video-ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video-ad'; }
    function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
    function progress(f, label) { q('#veProg').classList.remove('hidden'); q('#veProgT').textContent = label; q('#veProgB').style.width = Math.round(f * 100) + '%'; }

    // ── animatic ──
    function loadImgs() {
      Object.keys(p.frames).forEach(function (k) {
        var id = p.frames[k]; if (imgs[id]) return;
        var im = new Image(); im.onload = function () { imgs[id] = im; }; im.src = frameSrc(id); imgs[id] = imgs[id] || null;
      });
    }
    function sceneAt(T) { var t = 0; for (var i = 0; i < p.plan.scenes.length; i++) { var d = Number(p.plan.scenes[i].seconds) || 0; if (T < t + d) return { i: i, t: T - t, d: d }; t += d; } return { i: p.plan.scenes.length - 1, t: 99, d: 1 }; }
    function wrapText(c, text, maxW) { var words = String(text || '').split(/\s+/), lines = [], l = ''; words.forEach(function (w) { var tt = l ? l + ' ' + w : w; if (c.measureText(tt).width > maxW && l) { lines.push(l); l = w; } else l = tt; }); if (l) lines.push(l); return lines; }
    function drawScene(c, w, h, i, t) {
      var s = p.plan.scenes[i]; if (!s) return;
      var f = p.frames[String(i)], im = f && imgs[f];
      if (f && !(f in imgs)) loadImgs();
      if (im) { var z = 1 + 0.06 * Math.min(1, t / Math.max(1, s.seconds)), k = Math.max(w / im.naturalWidth, h / im.naturalHeight) * z; c.drawImage(im, (w - im.naturalWidth * k) / 2, (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
      else {
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1C2E4D'); g.addColorStop(1, '#0F1E36'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 ' + Math.round(w * 0.04) + 'px "DM Sans", sans-serif'; c.textAlign = 'left';
        wrapText(c, s.visual || s.title, w * 0.84).slice(0, 8).forEach(function (ln, k) { c.fillText(ln, w * 0.08, h * 0.22 + k * w * 0.06); });
      }
      // scene tag
      c.font = '700 ' + Math.round(w * 0.03) + 'px "DM Sans", sans-serif'; c.textAlign = 'left'; var tag = 'Scene ' + (i + 1) + ' · ' + s.seconds + 's', tw = c.measureText(tag).width + w * 0.04;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(w * 0.04, w * 0.04, tw, w * 0.06); c.fillStyle = '#fff'; c.fillText(tag, w * 0.06, w * 0.084);
      // on-screen text (big, TikTok style), pops in
      if (s.onScreen) {
        var pIn = Math.min(1, t / 0.35), sz = Math.round(w * 0.075);
        c.save(); c.globalAlpha = pIn; c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif'; c.textAlign = 'center';
        var lines = wrapText(c, s.onScreen, w * 0.82), y0 = h * 0.42 - (lines.length - 1) * sz * 0.6 + (1 - pIn) * 20;
        lines.forEach(function (ln, k) { var lw = c.measureText(ln).width; c.fillStyle = '#FFFFFF'; c.fillRect(w / 2 - lw / 2 - sz * 0.25, y0 + k * sz * 1.2 - sz * 0.9, lw + sz * 0.5, sz * 1.15); c.fillStyle = '#0F1E36'; c.fillText(ln, w / 2, y0 + k * sz * 1.2); });
        c.restore();
      }
      // subtitles (voiceover)
      if (s.vo) {
        var fs = Math.round(w * 0.042); c.font = '700 ' + fs + 'px "DM Sans",sans-serif'; c.textAlign = 'center';
        var sub = wrapText(c, s.vo.replace(/\[pause\]/gi, ''), w * 0.86).slice(0, 4), yb = h * 0.86 - (sub.length - 1) * fs * 1.25;
        sub.forEach(function (ln, k) {
          var lw = c.measureText(ln).width, y = yb + k * fs * 1.3;
          c.fillStyle = 'rgba(0,0,0,.62)'; c.beginPath(); if (c.roundRect) c.roundRect(w / 2 - lw / 2 - fs * 0.35, y - fs * 0.95, lw + fs * 0.7, fs * 1.3, fs * 0.3); else c.rect(w / 2 - lw / 2 - fs * 0.35, y - fs * 0.95, lw + fs * 0.7, fs * 1.3); c.fill();
          c.fillStyle = '#FFFFFF'; c.fillText(ln, w / 2, y);
        });
      }
    }
    function drawAt(c, w, h, T) {
      var a = sceneAt(T); c.clearRect(0, 0, w, h); drawScene(c, w, h, a.i, a.t);
      if (a.i > 0 && a.t < 0.3) { c.save(); c.globalAlpha = 1 - a.t / 0.3; drawScene(c, w, h, a.i - 1, (Number(p.plan.scenes[a.i - 1].seconds) || 1)); c.restore(); }
    }
    function frameLoop() {
      if (closed) return;
      var T = playing ? (performance.now() - t0) / 1000 : 0.9, total = totalSecs(p);
      if (playing && T >= total) { playing = false; q('#vePlay').textContent = '▶ Play'; T = 0.9; }
      drawAt(ctx, cv.width, cv.height, T);
      raf = requestAnimationFrame(frameLoop);
    }
    q('#vePlay').onclick = function () { playing = !playing; t0 = performance.now(); this.textContent = playing ? '⏹ Stop' : '▶ Play'; };
    q('#veMp4').onclick = async function () {
      if (!window.HQCar || !HQCar.encode) return X.toast('Video maker not loaded');
      var btn = this; btn.disabled = true; playing = false;
      try {
        await Promise.all(Object.keys(p.frames).map(function (k) { return new Promise(function (ok) { var id = p.frames[k]; if (imgs[id]) return ok(); var im = new Image(); im.onload = function () { imgs[id] = im; ok(); }; im.onerror = ok; im.src = frameSrc(id); }); }));
        var w = 1080, h = aspect(p) === '4:5' ? 1350 : 1920, total = totalSecs(p);
        var v = await HQCar.encode(w, h, total, function (c, T) { drawAt(c, w, h, T); }, function (f, tt) { progress(f / tt, 'Making the animatic… ' + Math.round(f / tt * 100) + '%'); });
        download(new Blob([v.data], { type: v.mime }), slug() + '-animatic.' + v.ext);
        progress(1, v.instagramReady ? 'Done ✅ — saved to Downloads.' : 'Done — saved as a format some apps may not open. For MP4 use Chrome or Edge on a laptop.');
      } catch (x) { progress(0, '⚠️ ' + (x.message || 'Couldn’t make the video')); }
      btn.disabled = false;
    };
    q('#vePack').onclick = async function () {
      if (!window.JSZip) return X.toast('Zip maker not loaded');
      var btn = this; btn.disabled = true;
      try {
        if (dirty) await save();
        var zip = new JSZip(), t = packText();
        Object.keys(t).forEach(function (k) { zip.file(k, t[k]); });
        var ks = Object.keys(p.frames);
        for (var k = 0; k < ks.length; k++) {
          progress(k / (ks.length + 1), 'Adding storyboard pictures…');
          var r = await fetch(frameSrc(p.frames[ks[k]]), { credentials: 'same-origin' }); if (r.ok) zip.file('storyboard/scene-' + String(+ks[k] + 1).padStart(2, '0') + '.jpg', await r.blob());
        }
        progress(0.95, 'Zipping…');
        download(await zip.generateAsync({ type: 'blob' }), slug() + '-production-pack.zip');
        progress(1, 'Done ✅ — saved to Downloads.');
      } catch (x) { progress(0, '⚠️ ' + (x.message || 'Couldn’t make the pack')); }
      btn.disabled = false;
    };
    q('#veReplan').onclick = function () {
      var dir = prompt('What should change? (e.g. "make it funnier", "focus on wedding cakes", "use a man as the main character")', '');
      if (dir == null) return;
      if (!confirm('Re-plan the whole ad? Your current script, prompts and storyboard pictures will be replaced.')) return;
      var s = X.sheet('<h2>🔄 Re-planning…</h2><div id="rpProg" style="margin-top:10px"></div><div class="err hidden" id="rpErr"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="rpX">Close</button></div>');
      $('#rpX', s).onclick = function () { s.remove(); };
      runPlan(p.brief, dir, $('#rpProg', s), false, { id: p.id, status: p.status, make: p.make }).then(function (np) {
        s.remove(); closed = true; cancelAnimationFrame(raf); ov.remove(); document.body.style.overflow = ''; editor(np, true);
      }, function (x) { $('#rpErr', s).textContent = x.message; $('#rpErr', s).classList.remove('hidden'); });
    };
    q('#veTitle').oninput = function () { p.plan.title = this.value; mark(); };
    q('#veStatus').onchange = function () { p.status = this.value; mark(); };
    q('#veX').onclick = async function () {
      if (dirty) await save();
      closed = true; cancelAnimationFrame(raf); ov.remove(); document.body.style.overflow = ''; view();
    };
    $$('#veTabs [data-tab]', ov).forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; paintPane(); }; });
    paintPane(); paintLen(); loadImgs();
    raf = requestAnimationFrame(frameLoop);
    if (fresh) { mark(); save(); }
    else q('#veSaved').textContent = 'Saved ✓';
  }

  window.HQVad = { init: init, view: view };
})();
