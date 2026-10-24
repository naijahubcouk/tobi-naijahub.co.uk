/*
 * Auntie Tobi HQ — 🎬 "Make the whole video" for the Video Ad Studio.
 * Cast pictures → start pictures (with cast + product references) → AI clips (fal.ai) → consistency check →
 * voices (one per character) → lip sync → sound effects → AI music → automatic edit (trim, transitions,
 * on-screen text, captions, logo, end card, voice + sfx + music mix) → final MP4 (saved in HQ), all in the browser.
 * HQVmake.html(p) / HQVmake.wire(pane, p, ctx) are used by hq-videoad.js; HQVmake.settingsSheet(ctx) for ⚙️.
 */
(function () {
  'use strict';
  var FPS = 30, END = 2.5, PART = 1400000;
  var ST = null; // cached settings
  var VOICE_INFO = { Aria: 'warm, confident woman (American)', Sarah: 'soft, reassuring young woman', Laura: 'upbeat, friendly young woman', Charlotte: 'smooth, elegant British woman', Alice: 'clear, professional British woman', Matilda: 'warm, friendly woman', Jessica: 'bright, expressive young woman', Lily: 'gentle, warm British woman', Roger: 'confident, easy-going man', Charlie: 'natural, casual young man (Australian)', George: 'warm, rich British man — great storyteller', Callum: 'intense, gravelly man', River: 'calm, relaxed neutral voice', Liam: 'energetic young man', Will: 'friendly, chilled young man', Eric: 'smooth, trustworthy man', Chris: 'casual, down-to-earth man', Brian: 'deep, resonant man — great for adverts', Daniel: 'calm, authoritative British man — newsreader feel', Bill: 'older, wise and trustworthy man' };
  var FEMALE = ['Sarah', 'Laura', 'Charlotte', 'Jessica', 'Lily', 'Matilda', 'Alice', 'Aria'], MALE = ['George', 'Roger', 'Liam', 'Eric', 'Chris', 'Brian', 'Daniel', 'Will'];
  var DIMS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
  var previews = {};
  function voUrl(v) { return v ? (v.aid ? '/.netlify/functions/studio-hq?vaudio=' + encodeURIComponent(v.aid) : v.url) : ''; }
  function fileToDataUrl(blob) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = function () { bad(new Error('Couldn’t read that file.')); }; r.readAsDataURL(blob); }); }
  function $(q, r) { return (r || document).querySelector(q); }
  function $$(q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); }
  function gbp(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function clipLen(tier, s) { s = Number(s) || 5; return tier === 'budget' || tier === 'draft' ? (s <= 5 ? 5 : 10) : (s <= 4 ? 4 : s <= 6 ? 6 : 8); }
  function rate(tier) { var t = ST && ST.tiers ? ST.tiers.filter(function (x) { return x.id === tier; })[0] : null; return t ? t.gbpPerSec : 0.06; }
  function cast(p) { return (p.plan && p.plan.cast) || []; }
  function needsChar(p) { return !cast(p).length && p.plan.scenes.some(function (s) { return s.character; }); }
  function sceneLines(sc) { var l = (sc.lines || []).filter(function (x) { return x && x.text; }); return l.length ? l : (sc.vo ? [{ who: 'Narrator', text: sc.vo }] : []); }
  function lineText(t) { return String(t || '').replace(/\[pause\]/gi, '…').trim(); }
  function sizeOf(p, X) { var a = X.aspect(p); return DIMS[a] ? a : '9:16'; }
  function paid(j) { return !!(j && (j.url || (j.statusUrl && !j.error))); }
  function estimate(p, m) {
    var tier = m.tier, clips = 0, vo = 0, lip = 0, sfx = 0;
    p.plan.scenes.forEach(function (s, i) {
      if (tier !== 'draft' && !paid(m.clips[i])) clips += clipLen(tier, s.seconds) * rate(tier);
      if (m.voSource !== 'own') sceneLines(s).forEach(function (l, k) { var have = m.lines[i] && m.lines[i][k]; if (!(have && have.text === lineText(l.text))) vo += Math.max(0.01, l.text.length / 1000 * 0.1 * 0.79); });
      if (tier !== 'draft' && m.voSource !== 'own' && s.lipSync && !paid(m.lipsync[i])) lip += Math.ceil(clipLen(tier, s.seconds) / 5) * ((ST && ST.lipsyncGbpPer5s) || 0.06);
      if (m.sfxOn && s.sfx && !paid(m.sfx[i])) sfx += (ST && ST.sfxGbp) || 0.03;
    });
    var total = p.plan.scenes.reduce(function (n, s) { return n + (Number(s.seconds) || 0); }, 0) + END;
    var music = m.music && !paid(m.musicJob) ? Math.max(10, total) / 60 * 0.8 * 0.79 : 0;
    var castPics = cast(p).filter(function (c, k) { return !m.castImgs[k]; }).length + (needsChar(p) && !m.charImg ? 1 : 0) + (p.plan.locations || []).filter(function (l, k) { return !(m.locImgs && m.locImgs[k]); }).length;
    var pics = (p.plan.scenes.filter(function (s, i) { return !(p.frames && p.frames[String(i)]); }).length + castPics) * 0.04;
    return { clips: clips, vo: vo, lip: lip, sfx: sfx, music: music, pics: pics, total: clips + vo + lip + sfx + music + pics };
  }

  // ════════ consistency: places + people + product as labelled reference photos ════════
  function placeName(h) { return String(h || '').replace(/^\s*(INT|EXT|INT\/EXT|I\/E)[.\s\/]+/i, '').replace(/\s*[–—-]\s*(DAY|NIGHT|MORNING|EVENING|AFTERNOON|LATER|CONTINUOUS|DAWN|DUSK|MOMENTS LATER)\b.*$/i, '').trim().toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); }
  // older projects (or a plan without places): make the list from the scene headings
  function ensureLocations(p) {
    var pl = p.plan; pl.locations = pl.locations || [];
    p.make = p.make || {}; p.make.locImgs = p.make.locImgs || {}; p.make.groupImgs = p.make.groupImgs || {};
    var find = function (n) { n = String(n || '').toLowerCase().trim(); for (var k = 0; k < pl.locations.length; k++) { var ln = pl.locations[k].name.toLowerCase(); if (ln === n || (n && (n.indexOf(ln) >= 0 || ln.indexOf(n) >= 0))) return k; } return -1; };
    pl.scenes.forEach(function (sc) {
      var k = find(sc.location); if (k < 0) k = find(placeName(sc.heading));
      if (k < 0 && (sc.location || placeName(sc.heading))) { pl.locations.push({ name: sc.location || placeName(sc.heading), description: '', sheetPrompt: '' }); k = pl.locations.length - 1; }
      if (k >= 0) sc.location = pl.locations[k].name;
    });
    if (!pl.locations.length && pl.lookbook && pl.lookbook.setting) { pl.locations.push({ name: 'Main set', description: pl.lookbook.setting, sheetPrompt: '' }); pl.scenes.forEach(function (sc) { sc.location = 'Main set'; }); }
    return pl.locations;
  }
  function locIndex(p, sc) { var n = String(sc.location || '').toLowerCase(); for (var k = 0; k < (p.plan.locations || []).length; k++) if (p.plan.locations[k].name.toLowerCase() === n) return k; return -1; }
  function locPrompt(p, l) { var lb = p.plan.lookbook || {}; return (l.sheetPrompt || ('Empty wide establishing shot of ' + l.name + (l.description ? ': ' + l.description : ''))) + '. No people at all. Eye-level wide shot that shows the whole space and its key furniture and props. ' + [lb.lighting, lb.palette, lb.style || 'photorealistic, cinematic'].filter(Boolean).join(', '); }
  function castPrompt(p, c) { var lb = p.plan.lookbook || {}; return (c.sheetPrompt || ('Full-body reference photo of ' + c.description)) + (c.outfit ? '. Wearing: ' + c.outfit : '') + '. Single person only, full body, facing camera, neutral expression, plain light-grey studio background, soft even light, ' + (lb.style || 'photorealistic'); }
  // the reference photos for one scene (max 4): place → people (or one group photo) → product; plus exact words for the prompt
  async function sceneRefs(p, sc, api) {
    ensureLocations(p);
    var m = p.make, cast = p.plan.cast || [], ids = [], labels = [], words = [];
    var lk = locIndex(p, sc), loc = lk >= 0 ? p.plan.locations[lk] : null;
    if (loc && m.locImgs[lk]) { ids.push(m.locImgs[lk]); labels.push('the location “' + loc.name + '” — keep this exact place: same layout, wall colours, furniture and props'); }
    if (loc) words.push('Place: the same ' + loc.name + (loc.description ? ' — ' + loc.description : '') + '.');
    var who = []; (sc.cast || []).forEach(function (nm) { for (var k = 0; k < cast.length; k++) if (cast[k].name === nm && who.indexOf(k) < 0) who.push(k); });
    who.forEach(function (k) { var c = cast[k]; words.push(c.name + ': ' + c.description + (c.outfit ? ', wearing ' + c.outfit : '') + '.'); });
    var prod = sc.product ? (p.brief.products || []).slice(0, 1) : [];
    var withImg = who.filter(function (k) { return m.castImgs && m.castImgs[k]; }), room = 4 - ids.length - prod.length;
    if (withImg.length && withImg.length <= room) withImg.forEach(function (k) { ids.push(m.castImgs[k]); labels.push('the character ' + cast[k].name + ' — keep the same face, skin tone, hair, build and outfit'); });
    else if (withImg.length > room && room > 0) {
      var key = withImg.slice().sort().join('') + (withImg.length < 2 ? '0' : '');
      if (!m.groupImgs[key] && api) {
        var r = await api('app-picture', { kind: 'frame', prompt: 'The ' + withImg.length + ' people from the reference photos standing together side by side, full body, facing camera, plain light-grey studio background, photorealistic. Each person must look EXACTLY like their own reference photo (face, skin tone, hair, build, outfit).', aspect: '16:9', refImgIds: withImg.map(function (k) { return m.castImgs[k]; }), refLabels: withImg.map(function (k) { return 'the character ' + cast[k].name; }) });
        m.groupImgs[key] = (await api('app-img', { image: r.image })).imgId;
      }
      if (m.groupImgs[key]) { ids.push(m.groupImgs[key]); labels.push('the characters ' + withImg.map(function (k) { return cast[k].name; }).join(', ') + ' (left to right) — keep each person exactly the same'); }
    }
    if (!withImg.length && sc.character && m.charImg && ids.length + prod.length < 4) { ids.push(m.charImg); labels.push('the main character — keep the same face, skin tone, hair, build and outfit'); }
    prod.forEach(function (id) { ids.push(id); labels.push('the real product — show it exactly as in this photo (shape, colours, details)'); });
    return { ids: ids.slice(0, 4), labels: labels.slice(0, 4), words: words.join(' ') };
  }

  // ⭐ paste an ElevenLabs voice ID for one character (or the narrator), test it with their own line, save it for HQ
  function voiceIdSheet(X, p, who, onDone) {
    p.make = p.make || {}; var m = p.make; m.castVoices = m.castVoices || {}; m.customVoices = m.customVoices || [];
    var line = ''; (p.plan.scenes || []).some(function (sc) { return (sc.lines || []).some(function (l) { if (l.who === who && l.text) { line = l.text; return true; } return false; }); });
    var text = (line || ('Hello, I am ' + who + '. This is how I sound.')).slice(0, 200), ok = '';
    var sh = X.sheet('<h2>⭐ ElevenLabs voice for ' + X.esc(who) + '</h2><p class="muted" style="font-size:13.5px;margin:4px 0 10px">On elevenlabs.io → Voices → Voice Library, find a voice → <b>Copy voice ID</b> → paste it here and tap Test. You’ll hear ' + X.esc(who) + ' say: “' + X.esc(text) + '”</p>' +
      ((ST && ST.savedVoices || []).length ? '<div class="lbl">Your saved voices</div><div class="chipbar" id="viSaved">' + ST.savedVoices.map(function (v) { return '<button class="chip" data-vid="' + v.id + '">⭐ ' + X.esc(v.label) + '</button>'; }).join('') + '</div>' : '') +
      '<label for="viId" style="margin-top:8px">Voice ID</label><div class="row" style="gap:8px"><input id="viId" placeholder="e.g. 21m00Tcm4TlvDq8ikWAM" style="flex:1"><button class="btn ghost" id="viTest">▶ Test</button></div>' +
      '<div class="muted" id="viMsg" style="font-size:13px;margin-top:6px"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="viX">Cancel</button><button class="btn primary" id="viUse" disabled>✅ Use for ' + X.esc(who) + '</button></div>');
    var msg = $('#viMsg', sh);
    $('#viX', sh).onclick = function () { sh.remove(); };
    $$('[data-vid]', sh).forEach(function (b) { b.onclick = function () { $('#viId', sh).value = b.dataset.vid; $('#viTest', sh).click(); }; });
    $('#viId', sh).oninput = function () { ok = ''; $('#viUse', sh).disabled = true; };
    $('#viTest', sh).onclick = async function () {
      var id = $('#viId', sh).value.trim(), btn = this;
      if (!/^[A-Za-z0-9]{16,40}$/.test(id)) { msg.textContent = 'That doesn’t look like a voice ID — it’s about 20 letters and numbers.'; return; }
      btn.disabled = true; msg.textContent = '⏳ Testing…';
      try { var r = await X.api('vm-tts', { text: text, voice: id }); new Audio(r.url).play().catch(function () {}); ok = id; msg.textContent = '✅ It works — tap “Use for ' + who + '” to keep it.'; $('#viUse', sh).disabled = false; }
      catch (x) { msg.textContent = '⚠️ ' + x.message + ' — this voice may not be available through fal.ai. Try another one.'; }
      btn.disabled = false;
    };
    $('#viUse', sh).onclick = async function () {
      if (!ok) return;
      if (/^narrator$/i.test(who)) m.voice = ok; else m.castVoices[who] = ok;
      if (m.customVoices.indexOf(ok) < 0) m.customVoices.unshift(ok);
      try { var r = await X.api('vm-voice-save', { id: ok, label: who }); if (ST) ST.savedVoices = r.voices; } catch (x) { /* still used for this film */ }
      sh.remove(); X.toast('⭐ ' + who + ' now uses that voice — tap “Make voices” to redo their lines'); if (onDone) onDone();
    };
  }

  async function loadSettings(api, force) { if (!ST || force) ST = (await api('vm-settings')).settings; return ST; }

  // ════════ ⚙️ settings ════════
  function settingsSheet(X, onDone) {
    loadSettings(X.api, true).then(function (s) {
      var cl = s.claude || {}, tiers = s.tiers.filter(function (t) { return t.id !== 'draft'; });
      var sh = X.sheet('<h2>⚙️ Video AI settings</h2><p class="muted" style="margin:4px 0 10px">Videos, voices, lip sync, sound effects and music are made with <b>fal.ai</b> (pay as you go). ' + (s.ready ? '✅ Connected (key ' + X.esc(s.keyHint) + ').' : 'Not connected yet.') + '</p>' +
        (s.isAdmin ? '<ol style="font-size:14px;padding-left:20px;margin:0 0 10px"><li>Go to <b>fal.ai</b> → sign up / log in.</li><li><b>Billing</b> → add credit (e.g. £10–£20).</li><li><b>Dashboard → API Keys</b> → create a key → copy it.</li><li>Paste it below and save.</li></ol>' +
          '<label for="vsKey">fal.ai API key</label><input id="vsKey" type="password" autocomplete="off" placeholder="' + (s.ready ? 'Leave empty to keep the current key' : 'Paste your key') + '">' +
          '<div class="f2" style="margin-top:8px"><div><label for="vsCap">Monthly cap (£)</label><input id="vsCap" type="number" min="1" value="' + s.capGbp + '"></div><div><label for="vsVoice">Default voice</label><select id="vsVoice">' + s.voices.map(function (v) { return '<option' + (v === s.voice ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></div></div>' +
          // Claude writer
          '<div class="card" style="margin-top:12px;background:var(--bg,#f8fafc)"><b>✍️ Script writer</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Stories, scripts and prompts are written by the standard AI. You can switch to <b>Claude</b> (Anthropic) for stronger storytelling — it needs an Anthropic API key from console.anthropic.com (pay as you go, about 1p per plan with Haiku).</p>' +
            '<div class="chipbar" id="vsWriter"><button class="chip" data-v="standard" aria-pressed="' + !cl.on + '">Standard AI</button><button class="chip" data-v="claude" aria-pressed="' + !!cl.on + '"' + (cl.ready ? '' : ' title="Add a key first"') + '>Claude</button></div>' +
            '<label for="vsAk">Anthropic API key ' + (cl.ready ? '<span class="muted">(✅ ' + X.esc(cl.keyHint) + ')</span>' : '') + '</label><input id="vsAk" type="password" autocomplete="off" placeholder="' + (cl.ready ? 'Leave empty to keep the current key' : 'sk-ant-…') + '">' +
            '<label for="vsCm">Claude model</label><input id="vsCm" value="' + X.esc(cl.model || 'claude-haiku-5-5') + '"><p class="muted" style="font-size:12.5px;margin:4px 0 0">claude-haiku-5-5 is quick and cheap; claude-sonnet-5-5 writes better but costs more.</p>' +
            (cl.ready ? '<button class="btn link" id="vsAkRm" style="color:var(--danger)">Remove Anthropic key</button>' : '') + '</div>' +
          '<div class="card" style="margin-top:10px;background:var(--bg,#f8fafc)"><b>🎭 Mini-drama writer</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Writes the story pitches and screenplays, through your OpenRouter account. Claude Sonnet writes the best stories; anthropic/claude-haiku-5.5 is faster and cheaper.</p><label for="vsDm">OpenRouter model</label><input id="vsDm" value="' + X.esc(s.dramaModel || 'anthropic/claude-sonnet-5.5') + '"></div>' +
          '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Advanced — model names on fal.ai</summary>' + tiers.map(function (t) { return '<label for="vsM' + t.id + '">' + X.esc(t.label) + '</label><input id="vsM' + t.id + '" value="' + X.esc(s.models[t.id] || '') + '">'; }).join('') +
            '<label for="vsMlipsync">👄 Lip sync</label><input id="vsMlipsync" value="' + X.esc(s.models.lipsync || '') + '"><label for="vsMsfx">🔊 Sound effects</label><input id="vsMsfx" value="' + X.esc(s.models.sfx || '') + '">' +
            '<p class="muted" style="font-size:12.5px">Only change these if fal.ai renames a model.</p></details>' +
          (s.ready ? '<button class="btn link" id="vsRm" style="color:var(--danger);margin-top:6px">Remove fal.ai key</button>' : '')
          : '<p>Ask an admin to connect fal.ai.</p>') +
        '<p class="muted" style="font-size:13px;margin-top:10px">This month: <b>' + gbp(s.spentGbp) + '</b> of <b>£' + s.capGbp + '</b> (estimated).</p>' +
        '<div class="err hidden" id="vsErr"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="vsX">Close</button>' + (s.isAdmin ? '<button class="btn primary" id="vsSave">Save</button>' : '') + '</div>');
      $('#vsX', sh).onclick = function () { sh.remove(); };
      if (!s.isAdmin) return;
      var writer = cl.on ? 'claude' : 'standard';
      $$('#vsWriter [data-v]', sh).forEach(function (b) { b.onclick = function () { writer = b.dataset.v; $$('#vsWriter [data-v]', sh).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
      var rm = $('#vsRm', sh); if (rm) rm.onclick = async function () { if (!confirm('Remove the fal.ai key?')) return; ST = (await X.api('vm-settings-save', { settings: { removeKey: true } })).settings; sh.remove(); if (onDone) onDone(); };
      var rmA = $('#vsAkRm', sh); if (rmA) rmA.onclick = async function () { if (!confirm('Remove the Anthropic key? Scripts will use the standard AI.')) return; ST = (await X.api('vm-settings-save', { settings: { removeAnthropic: true } })).settings; sh.remove(); if (onDone) onDone(); };
      $('#vsSave', sh).onclick = async function () {
        var models = {}; tiers.forEach(function (t) { models[t.id] = $('#vsM' + t.id, sh).value.trim(); }); models.lipsync = $('#vsMlipsync', sh).value.trim(); models.sfx = $('#vsMsfx', sh).value.trim();
        var ak = $('#vsAk', sh).value.trim(), err = $('#vsErr', sh);
        if (writer === 'claude' && !cl.ready && !ak) { err.textContent = 'Paste an Anthropic API key to use Claude.'; err.classList.remove('hidden'); return; }
        try { ST = (await X.api('vm-settings-save', { settings: { falKey: $('#vsKey', sh).value.trim(), capGbp: +$('#vsCap', sh).value, voice: $('#vsVoice', sh).value, models: models, anthropicKey: ak, claudeModel: $('#vsCm', sh).value.trim(), writer: writer, dramaModel: $('#vsDm', sh).value.trim() } })).settings; X.toast('Saved ✅'); sh.remove(); if (onDone) onDone(); }
        catch (x) { err.textContent = x.message; err.classList.remove('hidden'); }
      };
    }, function (x) { X.toast(x.message); });
  }

  // ════════ the Make tab ════════
  function html(p) {
    return '<div id="vmRoot"><div class="card"><p class="muted">Loading…</p></div></div>';
  }
  function wire(pane, p, X) {
    var root = $('#vmRoot', pane), polling = 0, busy = false, autoLip = false, checking = {}, DR = p.brief.mode === 'drama', remakeStale = false, lastOut = null;
    p.make = p.make || {}; var m = p.make;
    m.tier = m.tier || 'budget'; ['clips', 'vo', 'lines', 'castImgs', 'castVoices', 'sfx', 'lipsync', 'checks', 'locImgs', 'groupImgs'].forEach(function (k) { m[k] = m[k] || {}; });
    m.finals = m.finals || []; if (m.music === undefined) m.music = true; m.voSource = m.voSource || 'ai'; m.customVoices = m.customVoices || [];
    if (m.sfxOn === undefined) m.sfxOn = true; if (m.logoOn === undefined) m.logoOn = true;
    if (!m.musicPrompt) m.musicPrompt = [p.plan.music.mood, p.plan.music.bpm ? p.plan.music.bpm + ' BPM' : '', (p.plan.music.search || [])[0]].filter(Boolean).join(', ');
    if (m.musicVol == null) m.musicVol = 0.22; if (m.captions === undefined) m.captions = true; if (m.endCard === undefined) m.endCard = true;
    loadSettings(X.api).then(function () { m.voice = m.voice || ST.voice; autoVoices(); paint(); }, function (x) { root.innerHTML = '<div class="err">' + X.esc(x.message) + '</div>'; });

    function scenes() { return p.plan.scenes; }
    // 🎭 approval: every scene's script/picture gets a short signature; clips need an approved signature
    function hash(t) { var h = 5381; for (var k = 0; k < t.length; k++) h = ((h << 5) + h + t.charCodeAt(k)) >>> 0; return h.toString(36); }
    function sig(i, withPic) { var sc = scenes()[i]; return hash(JSON.stringify([sc.videoPrompt || sc.visual, sc.seconds, withPic ? frame(i) || '' : '', (sc.lines || []).map(function (l) { return l.who + l.text; }), sc.sfx || ''])); }
    function approvedFor(i) { return !!(m.approved && m.approved.sigs && m.approved.sigs[i] === sig(i)); }
    function needApproval() { return DR && scenes().some(function (_, i) { return !approvedFor(i); }); }
    function staleClip(i) { var c = m.clips[i]; return !!(DR && c && c.url && c.prompt && c.prompt !== sig(i, true)); }
    function staleList() { return scenes().map(function (_, i) { return i; }).filter(staleClip); }
    function gated(fn) {
      return async function () {
        if (needApproval()) await approveSheet();
        return fn();
      };
    }
    function approveSheet() {
      return new Promise(function (ok, bad) {
        var e = estimate(p, m), st = staleList(), stGbp = draft() ? 0 : st.reduce(function (n, i) { return n + clipLen(m.tier, scenes()[i].seconds) * rate(m.tier); }, 0), left = Math.max(0, ST.capGbp - ST.spentGbp);
        var tierLabel = (ST.tiers.filter(function (t) { return t.id === m.tier; })[0] || {}).label || m.tier;
        var sh = X.sheet('<h2>✅ Approve the film budget</h2><p class="muted" style="margin:4px 0 10px">Nothing costly is made until you approve. Check the screenplay and storyboard first — changes later mean remaking those scenes.</p>' +
          '<div class="card"><div class="row" style="justify-content:space-between"><span>Quality</span><b>' + X.esc(tierLabel) + '</b></div>' +
          [[draft() ? '' : '🎬 Video clips (' + scenes().filter(function (_, i) { return !(m.clips[i] && m.clips[i].url); }).length + ')', e.clips], ['🖼️ Pictures', e.pics], ['🎙️ Voices', e.vo], ['👄 Lip sync', e.lip], ['🔊 Sound effects', e.sfx], ['🎵 Music', e.music]].filter(function (r) { return r[0] && r[1] > 0.004; }).map(function (r) { return '<div class="row" style="justify-content:space-between;margin-top:6px"><span>' + r[0] + '</span><span>' + gbp(r[1]) + '</span></div>'; }).join('') +
          (st.length ? '<label class="chk" style="margin-top:10px"><input type="checkbox" id="apStale" checked> Also remake ' + st.length + ' scene' + (st.length > 1 ? 's' : '') + ' whose script changed (' + st.map(function (i) { return i + 1; }).join(', ') + ') — ' + gbp(stGbp) + '</label>' : '') +
          '<div class="row" style="justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:17px"><b>Total</b><b id="apTotal"></b></div></div>' +
          '<p class="muted" style="font-size:13px;margin:8px 0 0">This month: ' + gbp(ST.spentGbp) + ' of £' + ST.capGbp + ' used — ' + gbp(left) + ' left. Estimates — fal.ai charges the real amount.</p>' +
          '<div class="err hidden" id="apErr"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="apX">Not yet</button><button class="btn primary" id="apGo"></button></div>');
        function total() { return e.total + ($('#apStale', sh) && $('#apStale', sh).checked ? stGbp : 0); }
        function paintT() { var t = total(); $('#apTotal', sh).textContent = gbp(t); $('#apGo', sh).textContent = '✅ Approve & make (' + gbp(t) + ')'; var over = t > left; $('#apErr', sh).textContent = over ? 'This is more than what’s left of the monthly cap — an admin can raise it in ⚙️ Settings.' : ''; $('#apErr', sh).classList.toggle('hidden', !over); $('#apGo', sh).disabled = over; }
        if ($('#apStale', sh)) $('#apStale', sh).onchange = paintT; paintT();
        $('#apX', sh).onclick = function () { sh.remove(); bad(new Error('Not started — nothing was spent.')); };
        $('#apGo', sh).onclick = async function () {
          remakeStale = !!($('#apStale', sh) && $('#apStale', sh).checked);
          var sigs = {}; scenes().forEach(function (_, i) { sigs[i] = sig(i); });
          m.approved = { gbp: Math.round(total() * 100) / 100, at: new Date().toISOString(), sigs: sigs }; X.mark(); await X.save(); sh.remove(); ok();
        };
      });
    }
    function frame(i) { return p.frames && p.frames[String(i)]; }
    function draft() { return m.tier === 'draft'; }
    function ratio() { var a = sizeOf(p, X).split(':'); return a[0] + '/' + a[1]; }
    function castIdx(name) { var n = String(name || '').toLowerCase().trim(); for (var k = 0; k < cast(p).length; k++) if (cast(p)[k].name.toLowerCase() === n) return k; return -1; }
    ensureLocations(p);
    // every speaker gets a voice; cast members get one that suits them
    function autoVoices() {
      var usedF = 0, usedM = 0;
      cast(p).forEach(function (c, k) {
        if (m.castVoices[c.name]) return;
        var list = c.gender === 'male' ? MALE : c.gender === 'female' ? FEMALE : (k % 2 ? MALE : FEMALE);
        m.castVoices[c.name] = list === MALE ? MALE[usedM++ % MALE.length] : FEMALE[usedF++ % FEMALE.length];
      });
    }
    function voiceFor(who) { if (!who || /^narrator$/i.test(who)) return m.voice; var k = castIdx(who); return k >= 0 ? (m.castVoices[cast(p)[k].name] || m.voice) : m.voice; }
    function linesReady(i) {
      var want = sceneLines(scenes()[i]), have = m.lines[i] || [];
      if (!want.length) return true;
      return want.length === have.length && want.every(function (l, k) { return have[k] && have[k].url && have[k].text === lineText(l.text) && (have[k].voice || m.voice) === voiceFor(l.who); });
    }
    function lipWanted(i) { var sc = scenes()[i]; return !draft() && m.voSource !== 'own' && sc.lipSync && sceneLines(sc).length; }
    function lipReady(i) { return !!(m.clips[i] && m.clips[i].url && linesReady(i) && m.lines[i] && m.lines[i][0]); }
    function pend(j) { return !!(j && j.statusUrl && !j.url && !j.error); }
    function speakers() {
      var out = []; scenes().forEach(function (sc) { sceneLines(sc).forEach(function (l) { var w = castIdx(l.who) >= 0 ? cast(p)[castIdx(l.who)].name : 'Narrator'; if (out.indexOf(w) < 0) out.push(w); }); });
      return out.sort(function (a, b) { return a === 'Narrator' ? -1 : b === 'Narrator' ? 1 : 0; });
    }
    function stepState() {
      var n = scenes().length, idx = scenes().map(function (_, i) { return i; });
      var pics = idx.filter(frame).length, clips = idx.filter(function (i) { return m.clips[i] && m.clips[i].url; }).length, pending = idx.filter(function (i) { return pend(m.clips[i]); }).length;
      var own = m.voSource === 'own', voNeed = idx.filter(function (i) { return sceneLines(scenes()[i]).length; }).length;
      var vo = own ? (m.voFull ? voNeed : idx.filter(function (i) { return sceneLines(scenes()[i]).length && m.vo[i] && m.vo[i].aid; }).length) : idx.filter(function (i) { return sceneLines(scenes()[i]).length && linesReady(i); }).length;
      var lipNeed = idx.filter(lipWanted), lipDone = lipNeed.filter(function (i) { return m.lipsync[i] && m.lipsync[i].url; }).length, lipPend = lipNeed.some(function (i) { return pend(m.lipsync[i]); });
      var sfxNeed = idx.filter(function (i) { return scenes()[i].sfx; }), sfxDone = sfxNeed.filter(function (i) { return m.sfx[i] && m.sfx[i].url; }).length, sfxPend = sfxNeed.some(function (i) { return pend(m.sfx[i]); });
      var castDone = cast(p).length ? cast(p).filter(function (c, k) { return m.castImgs[k]; }).length === cast(p).length : (!needsChar(p) || !!m.charImg);
      return { n: n, pics: pics, clips: clips, pending: pending, voNeed: voNeed, vo: vo, lipNeed: lipNeed, lipDone: lipDone, lipPend: lipPend, sfxNeed: sfxNeed, sfxDone: sfxDone, sfxPend: sfxPend, music: !m.music || !!(m.musicJob && m.musicJob.url), musicPending: m.music && pend(m.musicJob), cast: castDone };
    }
    function tick(ok, pending) { return ok ? '✅' : pending ? '⏳' : '◻️'; }
    function voiceOptions(sel) {
      var saved = (ST.savedVoices || []), ids = saved.map(function (v) { return v.id; });
      return saved.map(function (v) { return '<option value="' + v.id + '"' + (v.id === sel ? ' selected' : '') + '>⭐ ' + X.esc(v.label) + ' (' + v.id.slice(0, 6) + '…)</option>'; }).join('') +
        m.customVoices.filter(function (v) { return ids.indexOf(v) < 0; }).map(function (v) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>⭐ My ElevenLabs voice (' + v.slice(0, 6) + '…)</option>'; }).join('') +
        ST.voices.map(function (v) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + v + (VOICE_INFO[v] ? ' — ' + VOICE_INFO[v] : '') + '</option>'; }).join('');
    }
    function checkHtml(i) {
      var c = m.checks[i]; if (checking[i]) return '<div class="vmchk muted">🔍 Checking it matches…</div>';
      if (!c) return '';
      return c.ok ? '<div class="vmchk">✅ Looks consistent</div>' : '<div class="vmchk bad">⚠️ ' + X.esc((c.issues || []).join(' · ') || 'Might not match') + ' — try 🔄 Redo</div>';
    }
    function paint() {
      var esc = X.esc, s = ST, e = estimate(p, m), st = stepState(), n = 0;
      if (!s.ready) {
        root.innerHTML = '<div class="card"><b>🔌 Connect fal.ai to make videos</b><p class="muted" style="margin:6px 0 10px">fal.ai runs the same video models Dzine uses (Kling, Veo…). One-time setup by an admin: create an account, add credit, paste the API key.</p><button class="btn primary" id="vmSet">⚙️ Video AI settings</button></div>';
        $('#vmSet', root).onclick = function () { settingsSheet(X, paint); }; return;
      }
      var left = Math.max(0, s.capGbp - s.spentGbp), logo = p.brief.logo, sp = speakers();
      var html =
        '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b>' + (DR ? '🎬 Make the film' : '🎬 Make the whole video') + '</b><button class="btn link" id="vmSet">⚙️ Settings</button></div>' +
        (DR ? (needApproval() ? '<div class="note" style="margin:8px 0 0">🔒 <b>Approval needed.</b> Check the 📝 Screenplay and 🖼️ Storyboard, create the pictures (cheap), then “Make everything” shows the budget for you to approve before any clips are made.' + (m.approved ? ' <span class="muted">(Approved ' + gbp(m.approved.gbp) + ' earlier — ' + scenes().filter(function (_, i) { return !approvedFor(i); }).length + ' scene(s) changed since.)</span>' : '') + '</div>'
          : '<div class="note" style="margin:8px 0 0;background:#E8F5EE;border-color:#BFE3CF">✅ Budget approved — ' + gbp(m.approved.gbp) + ' on ' + X.esc(new Date(m.approved.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '.</div>') : '') +
        '<div class="lbl">Quality</div><div class="chipbar" id="vmTier">' + s.tiers.map(function (t) { return '<button class="chip" data-v="' + t.id + '" aria-pressed="' + (t.id === m.tier) + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
        (draft() ? '<p class="muted" style="font-size:13px;margin:6px 0 0">📝 Draft makes the whole ad from the start pictures with gentle camera moves — check the story, timing and voices cheaply, then switch to Budget/Premium for real clips.</p>' : '') +
        '<div class="lbl">Voices</div><div class="chipbar" id="vmSrc"><button class="chip" data-v="ai" aria-pressed="' + (m.voSource !== 'own') + '">🤖 AI voices</button><button class="chip" data-v="own" aria-pressed="' + (m.voSource === 'own') + '">🎤 My own voice</button></div>' +
        (m.voSource !== 'own' ? '<div class="row" style="gap:8px;align-items:flex-end;margin-top:6px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><label for="vmVoice">Narrator voice</label><select id="vmVoice">' + voiceOptions(m.voice) + '</select></div>' +
            '<button class="btn ghost sm" id="vmPrev">▶ Preview</button></div>' +
            '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:13.5px;font-weight:700">⭐ Use a voice from the ElevenLabs Voice Library (e.g. a Nigerian accent)</summary><p class="muted" style="font-size:13px;margin:6px 0">On elevenlabs.io → Voices → Voice Library, find a voice you like → “Copy voice ID” → paste it here and tap Test. It’s then available for the narrator and every character.</p><div class="row" style="gap:8px"><input id="vmVid" placeholder="Voice ID, e.g. 21m00Tcm4TlvDq8ikWAM" style="flex:1"><button class="btn ghost sm" id="vmVidTest">Test</button></div><div class="muted" id="vmVidMsg" style="font-size:13px;margin-top:4px"></div></details>'
          : '<p class="muted" style="font-size:13px;margin:6px 0 0">Record or upload your own voice in the voices step — one clip per scene (best for timing) or one file for the whole ad. Free. (Lip sync needs AI voices.)</p>') +
        '<div style="margin-top:8px"><label>Music</label><div class="chipbar" id="vmMus"><button class="chip" data-v="1" aria-pressed="' + !!m.music + '">🎵 AI music</button><button class="chip" data-v="0" aria-pressed="' + !m.music + '">🔇 No music</button></div></div>' +
        (m.music ? '<label for="vmMP" style="margin-top:6px">Music style</label><input id="vmMP" value="' + esc(m.musicPrompt) + '"><label for="vmMV">Music volume</label><input type="range" id="vmMV" min="5" max="60" value="' + Math.round(m.musicVol * 100) + '">' : '') +
        '<div class="row" style="gap:16px;margin-top:8px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="vmCap"' + (m.captions ? ' checked' : '') + '> Subtitles</label><label class="chk"><input type="checkbox" id="vmEnd"' + (m.endCard ? ' checked' : '') + '> ' + (DR ? 'Brand reveal title card' : 'End card with call to action') + '</label>' +
          (st.sfxNeed.length ? '<label class="chk"><input type="checkbox" id="vmSfxOn"' + (m.sfxOn ? ' checked' : '') + '> Sound effects</label>' : '') +
          (logo ? '<label class="chk"><input type="checkbox" id="vmLogo"' + (m.logoOn ? ' checked' : '') + '> Logo on the video</label>' : '') + '</div>' +
        '<div class="note" style="margin-top:10px">Size: <b>' + sizeOf(p, X) + '</b> · Estimated cost still to spend: <b>' + gbp(e.total) + '</b> <span class="muted">(' + [draft() ? '' : 'clips ' + gbp(e.clips), 'pictures ' + gbp(e.pics), 'voices ' + gbp(e.vo), e.lip ? 'lip sync ' + gbp(e.lip) : '', e.sfx ? 'sound effects ' + gbp(e.sfx) : '', 'music ' + gbp(e.music)].filter(Boolean).join(' · ') + ')</span><br>This month: ' + gbp(s.spentGbp) + ' of £' + s.capGbp + ' — ' + gbp(left) + ' left.</div>' +
        '<button class="btn primary" id="vmAll" style="width:100%;margin-top:10px"' + (busy ? ' disabled' : '') + '>⚡ Make everything</button></div>';

      // 1 · cast
      n++;
      if (cast(p).length) {
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.cast) + ' ' + n + ' · Characters (' + cast(p).filter(function (c, k) { return m.castImgs[k]; }).length + '/' + cast(p).length + ')</b><button class="btn ghost sm" id="vmCastAll">🎨 Create missing</button></div>' +
          '<p class="muted" style="font-size:13px;margin:4px 0">Each character gets one reference photo, used in every scene they’re in so they look the same throughout.</p>' +
          cast(p).map(function (c, k) {
            var img = m.castImgs[k];
            return '<div class="vmcast">' + (img ? '<img src="' + X.frameSrc(img) + '" alt="">' : '<div class="ph">👤</div>') + '<div style="flex:1;min-width:0"><b>' + esc(c.name) + '</b> <span class="muted">· ' + esc(c.role) + '</span><div class="muted" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(c.description) + '</div></div>' +
              '<span class="apact"><button class="btn ghost sm" data-castmk="' + k + '">' + (img ? '🔄' : '🎨') + '</button><label class="btn ghost sm" style="margin:0">📷<input type="file" accept="image/*" data-castup="' + k + '" hidden></label></span></div>';
          }).join('') + '</div>';
      } else {
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.cast) + ' ' + n + ' · Main character</b>' + (needsChar(p) ? '<span class="apact"><button class="btn ghost sm" id="vmChar">' + (m.charImg ? '🔄 Redo' : '🎨 Create') + '</button><label class="btn ghost sm" style="margin:0">📷 Upload<input type="file" accept="image/*" id="vmCharUp" hidden></label></span>' : '<span class="muted">Not needed</span>') + '</div>' +
          (m.charImg ? '<img src="' + X.frameSrc(m.charImg) + '" class="vmchar" alt="Character">' : (needsChar(p) ? '<p class="muted" style="font-size:13px">Made from the character-sheet prompt, then used in every scene so the person looks the same.</p>' : '')) + '</div>';
      }
      var locs = p.plan.locations || [];
      if (locs.length) {
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(locs.every(function (l, k) { return m.locImgs[k]; })) + ' 📍 Places (' + locs.filter(function (l, k) { return m.locImgs[k]; }).length + '/' + locs.length + ')</b><button class="btn ghost sm" id="vmLocAll">🎨 Create missing</button></div>' +
          '<p class="muted" style="font-size:13px;margin:4px 0">Each place gets one reference photo — every scene there uses it, so the room looks the same in every shot.</p>' +
          locs.map(function (l, k) {
            var img = m.locImgs[k];
            return '<div class="vmcast">' + (img ? '<img src="' + X.frameSrc(img) + '" alt="">' : '<div class="ph">🏠</div>') + '<div style="flex:1;min-width:0"><b>' + esc(l.name) + '</b> <span class="muted">· ' + scenes().filter(function (sc) { return sc.location === l.name; }).length + ' scenes</span><div class="muted" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(l.description) + '</div></div>' +
              '<span class="apact"><button class="btn ghost sm" data-locmk="' + k + '">' + (img ? '🔄' : '🎨') + '</button><label class="btn ghost sm" style="margin:0">📷<input type="file" accept="image/*" data-locup="' + k + '" hidden></label></span></div>';
          }).join('') + '</div>';
      }
      // 2 · start pictures
      n++;
      html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.pics === st.n) + ' ' + n + ' · Start pictures (' + st.pics + '/' + st.n + ')</b><button class="btn ghost sm" id="vmPics">🎨 Create missing</button></div>' +
        ((p.brief.products || []).length ? '<p class="muted" style="font-size:13px;margin:4px 0">📦 Scenes marked “product” use your product photos so the product looks real.</p>' : '') +
        '<div class="vmgrid">' + scenes().map(function (sc, i) { var f = frame(i); return '<div class="vmcell" style="aspect-ratio:' + ratio() + '">' + (f ? '<img src="' + X.frameSrc(f) + '" alt="">' : '<span>' + (i + 1) + '</span>') + (f ? '<button data-repic="' + i + '" title="New picture">🔄</button>' : '') + '</div>'; }).join('') + '</div>' +
        (draft() ? scenes().map(function (sc, i) { return m.checks[i] || checking[i] ? '<div style="font-size:12.5px"><b>' + (i + 1) + '.</b> ' + checkHtml(i).replace(/^<div class="vmchk( bad)?( muted)?">|<\/div>$/g, '') + '</div>' : ''; }).join('') + (st.pics ? '<button class="btn ghost sm" id="vmChkAll" style="margin-top:8px">🔍 Check pictures match</button>' : '') : '') + '</div>';
      // 3 · clips
      if (!draft()) {
        n++;
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>' + tick(st.clips === st.n, st.pending) + ' ' + n + ' · Video clips (' + st.clips + '/' + st.n + ')</b><span class="apact"><button class="btn ghost sm" id="vmChkAll">🔍 Check all</button><button class="btn ghost sm" id="vmClips">🎬 Make missing</button></span></div>' +
          scenes().map(function (sc, i) {
            var c = m.clips[i] || {};
            var state = staleClip(i) ? '📝 Script or picture changed since this clip — 🔄 Redo to match' : c.url ? '✅ Ready' : c.error ? '⚠️ ' + esc(c.error) : c.statusUrl ? '⏳ ' + (c.status === 'IN_PROGRESS' ? 'Making…' : 'Waiting in line…') : frame(i) ? '◻️ Not started' : '◻️ Needs a start picture';
            return '<div class="vmrow"><div class="vmthumb">' + (c.url ? '<video src="' + esc(c.url) + '" muted loop playsinline preload="metadata" crossorigin="anonymous"></video>' : frame(i) ? '<img src="' + X.frameSrc(frame(i)) + '" alt="">' : '') + '</div>' +
              '<div style="flex:1;min-width:0"><b>' + (i + 1) + '. ' + esc(sc.title) + '</b> <span class="muted">· ' + sc.seconds + 's' + (sc.product ? ' · 📦' : '') + (sc.lipSync ? ' · 👄' : '') + '</span><div class="muted" style="font-size:13px">' + state + '</div>' + checkHtml(i) + '</div>' +
              (c.url ? '<button class="btn ghost sm" data-chk="' + i + '" title="Check it matches the characters / product">🔍</button>' : '') +
              '<button class="btn ghost sm" data-redo="' + i + '"' + (frame(i) ? '' : ' disabled') + '>' + (c.url || c.error ? '🔄 Redo' : '🎬 Make') + '</button></div>';
          }).join('') + '</div>';
      }
      // 4 · voices
      n++;
      if (m.voSource === 'own') {
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>' + tick(st.vo === st.voNeed) + ' ' + n + ' · Your voiceover' + (m.voFull ? ' (one file)' : ' (' + st.vo + '/' + st.voNeed + ')') + '</b><span class="apact"><label class="btn ghost sm" style="margin:0">📁 One file for the whole ad<input type="file" accept="audio/*" id="vmFull" hidden></label></span></div>' +
          (m.voFull ? '<div class="vmrow"><div style="flex:1;font-size:13.5px">🎧 One recording for the whole ad — it starts at the beginning of the video.</div><audio controls preload="none" src="' + voUrl({ aid: m.voFull }) + '"></audio><button class="btn link" id="vmFullX">✖</button></div>'
            : '<p class="muted" style="font-size:13px;margin:4px 0">Tap 🎙️ Record and read the words (keep it about the scene length), or upload a file.</p>' + scenes().map(function (sc, i) {
              var words = sceneLines(sc).map(function (l) { return (/^narrator$/i.test(l.who) ? '' : l.who + ': ') + l.text; }).join(' / ');
              if (!words) return ''; var v = m.vo[i] && m.vo[i].aid ? m.vo[i] : null;
              return '<div class="vmrow"><div style="flex:1;font-size:13.5px"><b>' + (i + 1) + '.</b> ' + esc(words) + ' <span class="muted">· ' + sc.seconds + 's</span></div>' + (v ? '<audio controls preload="none" src="' + voUrl(v) + '"></audio>' : '') +
                '<button class="btn ghost sm" data-rec="' + i + '">🎙️ ' + (v ? 'Re-record' : 'Record') + '</button><label class="btn ghost sm" style="margin:0">📁<input type="file" accept="audio/*" data-upa="' + i + '" hidden></label></div>';
            }).join('')) + '</div>';
      } else {
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.vo === st.voNeed) + ' ' + n + ' · Voices (' + st.vo + '/' + st.voNeed + ' scenes)</b><button class="btn ghost sm" id="vmVo">🎙️ Make voices</button></div>' +
          (sp.filter(function (w) { return w !== 'Narrator'; }).length ? '<div class="lbl">Who sounds like who</div>' + sp.filter(function (w) { return w !== 'Narrator'; }).map(function (w) {
            return '<div class="row" style="gap:8px;align-items:center;margin-top:4px"><b style="min-width:80px">' + esc(w) + '</b><select data-cv="' + esc(w) + '" style="flex:1">' + voiceOptions(m.castVoices[w] || m.voice) + '</select><button class="btn ghost sm" data-cvid="' + esc(w) + '" title="Use an ElevenLabs voice ID">⭐ Voice ID</button><button class="btn ghost sm" data-cvp="' + esc(w) + '">▶</button></div>';
          }).join('') + '<p class="muted" style="font-size:12.5px;margin:4px 0 6px">The narrator uses the voice chosen above. Change a voice and tap “Make voices” to redo only those lines.</p>' : '') +
          scenes().map(function (sc, i) {
            var ls = sceneLines(sc); if (!ls.length) return '';
            var have = m.lines[i] || [], ok = linesReady(i);
            return '<div class="vmrow" style="align-items:flex-start"><div style="flex:1;font-size:13.5px"><b>' + (i + 1) + '.</b> ' + ls.map(function (l, k) {
              var h = have[k], fresh = h && h.url && h.text === lineText(l.text) && (h.voice || m.voice) === voiceFor(l.who);
              return '<div style="margin:2px 0">' + (/^narrator$/i.test(l.who) ? '' : '<b>' + esc(l.who) + ':</b> ') + esc(l.text) + (h && h.url ? ' <button class="btn link" data-play="' + esc(h.url) + '" style="padding:0 4px">▶</button>' + (fresh ? '' : ' <span class="muted">(changed — remake)</span>') : '') + '</div>';
            }).join('') + '</div>' + (ok ? '✅' : '') + '</div>';
          }).join('') + '</div>';
      }
      // 5 · lip sync
      if (st.lipNeed.length) {
        n++;
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.lipDone === st.lipNeed.length, st.lipPend) + ' ' + n + ' · 👄 Lip sync (' + st.lipDone + '/' + st.lipNeed.length + ')</b><button class="btn ghost sm" id="vmLip">👄 Make lip sync</button></div>' +
          '<p class="muted" style="font-size:13px;margin:4px 0">Makes the character’s mouth match their spoken line (Kling LipSync). Needs the clip and the voice for that scene first.</p>' +
          st.lipNeed.map(function (i) {
            var j = m.lipsync[i] || {}, sc = scenes()[i];
            var state = j.url ? '✅ Ready' : j.error ? '⚠️ ' + esc(j.error) : j.statusUrl ? '⏳ Syncing…' : lipReady(i) ? '◻️ Ready to sync' : '◻️ Needs the clip and voice first';
            return '<div class="vmrow"><div class="vmthumb">' + (j.url ? '<video src="' + esc(j.url) + '" playsinline preload="metadata" crossorigin="anonymous"></video>' : frame(i) ? '<img src="' + X.frameSrc(frame(i)) + '" alt="">' : '') + '</div><div style="flex:1;min-width:0"><b>' + (i + 1) + '. ' + esc(sc.title) + '</b><div class="muted" style="font-size:13px">' + state + '</div></div>' +
              (j.url || j.error ? '<button class="btn ghost sm" data-lip="' + i + '">🔄 Redo</button>' : '') + '</div>';
          }).join('') + '</div>';
      }
      // 6 · sound effects
      if (st.sfxNeed.length && m.sfxOn) {
        n++;
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.sfxDone === st.sfxNeed.length, st.sfxPend) + ' ' + n + ' · 🔊 Sound effects (' + st.sfxDone + '/' + st.sfxNeed.length + ')</b><button class="btn ghost sm" id="vmSfx">🔊 Make sound effects</button></div>' +
          st.sfxNeed.map(function (i) {
            var j = m.sfx[i] || {}, sc = scenes()[i], stale = j.url && j.prompt && j.prompt !== sc.sfx.slice(0, 200);
            return '<div class="vmrow"><div style="flex:1;font-size:13.5px"><b>' + (i + 1) + '.</b> ' + esc(sc.sfx) + (stale ? ' <span class="muted">(changed — remake)</span>' : '') + '<div class="muted" style="font-size:12.5px">' + (j.url ? '' : j.error ? '⚠️ ' + esc(j.error) : j.statusUrl ? '⏳ Making…' : '◻️ Not made yet') + '</div></div>' +
              (j.url ? '<audio controls preload="none" src="' + esc(j.url) + '" crossorigin="anonymous"></audio>' : '') + (j.url || j.error ? '<button class="btn ghost sm" data-sfx="' + i + '">🔄</button>' : '') + '</div>';
          }).join('') + '</div>';
      }
      // 7 · music
      if (m.music) {
        n++;
        html += '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.music, st.musicPending) + ' ' + n + ' · Background music</b><button class="btn ghost sm" id="vmMusic">' + (m.musicJob && (m.musicJob.url || m.musicJob.error) ? '🔄 Redo' : '🎵 Make music') + '</button></div>' +
          (m.musicJob && m.musicJob.url ? '<audio controls preload="none" src="' + esc(m.musicJob.url) + '" crossorigin="anonymous" style="width:100%"></audio>' : m.musicJob && m.musicJob.error ? '<div class="muted">⚠️ ' + esc(m.musicJob.error) + '</div>' : m.musicJob ? '<div class="muted">⏳ Making the music…</div>' : '') + '</div>';
      }
      // 8 · edit & export
      n++;
      html += '<div class="card vmstep"><b>' + n + ' · ✂️ Edit & export</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Joins the ' + (draft() ? 'pictures with gentle camera moves' : 'clips') + ', trims each to its scene, adds transitions, on-screen text' + (m.captions ? ', subtitles' : '') + (logo && m.logoOn ? ', your logo' : '') + (m.endCard ? (DR ? ', the brand reveal' : ', the end card') : '') + ', voices' + (st.sfxNeed.length && m.sfxOn ? ', sound effects' : '') + (m.music ? ' and music' : '') + ' — then saves an MP4' + (draft() ? '' : '. Scenes without a clip use their start picture') + '.</p>' +
        '<button class="btn primary" id="vmRender" style="width:100%">🎬 Make the ' + (draft() ? 'draft' : 'final') + ' ' + (DR ? 'film' : 'video') + '</button>' +
        '<div id="vmProg" class="hidden" style="margin-top:10px"><div class="muted" id="vmProgT" style="font-size:13px"></div><div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:4px"><div id="vmProgB" style="height:100%;width:0;background:var(--green)"></div></div></div>' +
        '<div id="vmOut"></div>' +
        (m.finals.length ? '<div class="lbl" style="margin-top:12px">📼 Saved videos (last 3)</div>' + m.finals.map(function (f, k) {
          return '<div class="vmrow"><div style="flex:1;font-size:13.5px">🎬 ' + esc(new Date(f.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ' <span class="muted">· ' + (f.size / 1048576).toFixed(1) + ' MB</span></div><button class="btn ghost sm" data-fdl="' + k + '">⬇️ Download</button><button class="btn link" data-frm="' + k + '" style="color:var(--danger)">🗑️</button></div>';
        }).join('') : '') + '</div>';
      root.innerHTML = html;
      if (lastOut) { $('#vmOut', root).innerHTML = lastOut.html; $('#vmProg', root).classList.remove('hidden'); $('#vmProgT', root).textContent = lastOut.msg; $('#vmProgB', root).style.width = '100%'; }
      wireUi(st);
    }
    function wireUi(st) {
      var on = function (q, fn) { var el = $(q, root); if (el) el.onclick = fn; };
      on('#vmSet', function () { settingsSheet(X, function () { loadSettings(X.api, true).then(paint); }); });
      $$('#vmTier [data-v]', root).forEach(function (b) { b.onclick = function () { m.tier = b.dataset.v; X.mark(); paint(); }; });
      $$('#vmSrc [data-v]', root).forEach(function (b) { b.onclick = function () { m.voSource = b.dataset.v; X.mark(); paint(); }; });
      if ($('#vmVoice', root)) $('#vmVoice', root).onchange = function () { m.voice = this.value; X.mark(); paint(); };
      on('#vmPrev', function () { preview(this, $('#vmVoice', root).value); });
      $$('[data-cv]', root).forEach(function (sel) { sel.onchange = function () { m.castVoices[sel.dataset.cv] = sel.value; X.mark(); paint(); }; });
      $$('[data-cvid]', root).forEach(function (b) { b.onclick = function () { voiceIdSheet(X, p, b.dataset.cvid, function () { X.mark(); paint(); }); }; });
      $$('[data-cvp]', root).forEach(function (b) { b.onclick = function () { preview(b, m.castVoices[b.dataset.cvp] || m.voice); }; });
      $$('[data-play]', root).forEach(function (b) { b.onclick = function () { new Audio(b.dataset.play).play().catch(function () {}); }; });
      on('#vmVidTest', async function () {
        var id = $('#vmVid', root).value.trim(), msg = $('#vmVidMsg', root);
        if (!/^[A-Za-z0-9]{16,40}$/.test(id)) { msg.textContent = 'That doesn’t look like a voice ID — it’s about 20 letters and numbers.'; return; }
        this.disabled = true; msg.textContent = '⏳ Testing…';
        try { var url = await sample(id); msg.textContent = '✅ It works — now selected for the narrator.'; new Audio(url).play().catch(function () {}); if (m.customVoices.indexOf(id) < 0) m.customVoices.unshift(id); m.voice = id; X.mark(); setTimeout(paint, 1200); }
        catch (x) { msg.textContent = '⚠️ ' + x.message + ' — this voice may not be available through fal.ai. Try another, or use your own voice.'; }
        this.disabled = false;
      });
      $$('[data-rec]', root).forEach(function (b) { b.onclick = function () { record(+b.dataset.rec, b); }; });
      $$('[data-upa]', root).forEach(function (inp) { inp.onchange = async function () { var f = inp.files && inp.files[0]; if (!f) return; try { var aid = await saveAudio(f); m.vo[+inp.dataset.upa] = { aid: aid, text: scenes()[+inp.dataset.upa].vo }; X.mark(); paint(); } catch (x) { X.toast(x.message); } }; });
      if ($('#vmFull', root)) $('#vmFull', root).onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { m.voFull = await saveAudio(f); X.mark(); paint(); } catch (x) { X.toast(x.message); } };
      on('#vmFullX', function () { m.voFull = ''; X.mark(); paint(); });
      $$('#vmMus [data-v]', root).forEach(function (b) { b.onclick = function () { m.music = b.dataset.v === '1'; X.mark(); paint(); }; });
      if ($('#vmMP', root)) $('#vmMP', root).oninput = function () { m.musicPrompt = this.value; X.mark(); };
      if ($('#vmMV', root)) $('#vmMV', root).oninput = function () { m.musicVol = this.value / 100; X.mark(); };
      $('#vmCap', root).onchange = function () { m.captions = this.checked; X.mark(); };
      $('#vmEnd', root).onchange = function () { m.endCard = this.checked; X.mark(); };
      if ($('#vmSfxOn', root)) $('#vmSfxOn', root).onchange = function () { m.sfxOn = this.checked; X.mark(); paint(); };
      if ($('#vmLogo', root)) $('#vmLogo', root).onchange = function () { m.logoOn = this.checked; X.mark(); paint(); };
      on('#vmChar', function () { run(this, makeChar); });
      if ($('#vmCharUp', root)) $('#vmCharUp', root).onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { var d = await X.shrink(f); m.charImg = (await X.api('app-img', { image: d })).imgId; X.mark(); paint(); } catch (x) { X.toast(x.message); } };
      on('#vmCastAll', function () { run(this, makeCast); });
      $$('[data-castmk]', root).forEach(function (b) { b.onclick = function () { run(b, function () { return makeCastOne(+b.dataset.castmk); }); }; });
      $$('[data-castup]', root).forEach(function (inp) { inp.onchange = async function () { var f = inp.files && inp.files[0]; if (!f) return; try { var d = await X.shrink(f); m.castImgs[inp.dataset.castup] = (await X.api('app-img', { image: d })).imgId; X.mark(); paint(); } catch (x) { X.toast(x.message); } }; });
      on('#vmPics', function () { run(this, makePics); });
      on('#vmLocAll', function () { run(this, async function () { for (var l = 0; l < (p.plan.locations || []).length; l++) if (!m.locImgs[l]) await makeLocOne(l); }); });
      $$('[data-locmk]', root).forEach(function (b) { b.onclick = function () { run(b, function () { return makeLocOne(+b.dataset.locmk); }); }; });
      $$('[data-locup]', root).forEach(function (inp) { inp.onchange = async function () { var f = inp.files && inp.files[0]; if (!f) return; try { m.locImgs[inp.dataset.locup] = (await X.api('app-img', { image: await X.shrink(f) })).imgId; X.mark(); paint(); } catch (x) { X.toast(x.message); } }; });
      $$('[data-repic]', root).forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); var i = +b.dataset.repic; if (m.clips[i] && m.clips[i].url && !confirm('Make a new start picture for scene ' + (i + 1) + '? Its clip will need remaking.')) return; run(b, function () { return makePic(i); }); }; });
      on('#vmClips', function () { run(this, gated(makeClips)); });
      $$('[data-redo]', root).forEach(function (b) { b.onclick = function () { var i = +b.dataset.redo; if ((m.clips[i] && m.clips[i].url) && !confirm('Make scene ' + (i + 1) + ' again? (costs about ' + gbp(clipLen(m.tier, scenes()[i].seconds) * rate(m.tier)) + ')')) return; run(b, function () { return makeClip(i); }); }; });
      $$('[data-chk]', root).forEach(function (b) { b.onclick = function () { checkScene(+b.dataset.chk, true); }; });
      on('#vmChkAll', function () { scenes().forEach(function (_, i) { if ((m.clips[i] && m.clips[i].url) || (draft() && frame(i))) checkScene(i, true); }); });
      on('#vmVo', function () { run(this, makeVoices); });
      on('#vmLip', function () { run(this, gated(function () { return makeLips(false); })); });
      $$('[data-lip]', root).forEach(function (b) { b.onclick = function () { run(b, function () { return makeLip(+b.dataset.lip); }); }; });
      on('#vmSfx', function () { run(this, gated(function () { return makeSfxAll(false); })); });
      $$('[data-sfx]', root).forEach(function (b) { b.onclick = function () { run(b, function () { return makeSfx(+b.dataset.sfx); }); }; });
      on('#vmMusic', function () { run(this, DR && !(m.musicJob && (m.musicJob.url || m.musicJob.error)) ? gated(makeMusic) : makeMusic); });
      on('#vmRender', function () { render(this); });
      on('#vmAll', function () { run(this, DR ? gated(everything) : everything); });
      $$('[data-fdl]', root).forEach(function (b) { b.onclick = function () { downloadFinal(m.finals[+b.dataset.fdl], b); }; });
      $$('[data-frm]', root).forEach(function (b) { b.onclick = async function () { if (!confirm('Delete this saved video?')) return; var f = m.finals.splice(+b.dataset.frm, 1)[0]; X.mark(); await X.save(); X.api('vm-final-delete', { fid: f.fid, parts: f.parts }).catch(function () {}); paint(); }; });
      $$('.vmthumb video', root).forEach(function (v) { v.onmouseenter = function () { v.play().catch(function () {}); }; v.onmouseleave = function () { v.pause(); }; v.onclick = function () { v.paused ? v.play() : v.pause(); }; });
      if ((st.pending || st.musicPending || st.lipPend || st.sfxPend) && !polling) poll();
    }
    async function run(btn, fn) {
      if (busy) return; busy = true; btn.disabled = true; btn.textContent = '⏳ Working…';
      try { await fn(); } catch (x) { X.toast(x.message); }
      busy = false; await X.save(); await loadSettings(X.api, true).catch(function () {}); if (document.body.contains(root)) paint();
    }
    function sampleText() {
      var first = (scenes().filter(function (sc) { return sc.vo; })[0] || {}).vo || '';
      return ('Hi! This is how I sound for ' + (p.brief.forWho === 'auntietobi' ? 'Auntie Tobi' : (p.brief.business || 'your advert')) + '. ' + first).slice(0, 220);
    }
    async function sample(voice) {
      if (previews[voice]) return previews[voice];
      var r = await X.api('vm-tts', { text: sampleText(), voice: voice }); previews[voice] = r.url; return r.url;
    }
    async function preview(btn, voice) {
      var keep = btn.textContent; btn.disabled = true; btn.textContent = '⏳';
      try { var a = new Audio(await sample(voice)); a.play().catch(function () {}); } catch (x) { X.toast(x.message); }
      btn.disabled = false; btn.textContent = keep; loadSettings(X.api, true).catch(function () {});
    }
    async function saveAudio(blob) {
      if (blob.size > 1700000) throw new Error('That file is too big — keep recordings under about 2 minutes.');
      var d = await fileToDataUrl(blob);
      if (/^data:audio\/x-m4a|^data:audio\/mp4a/.test(d)) d = d.replace(/^data:audio\/[^;]+/, 'data:audio/mp4');
      return (await X.api('vm-audio-save', { dataUrl: d })).aid;
    }
    var rec = null;
    async function record(i, btn) {
      if (rec) { rec.stop(); return; }
      if (!navigator.mediaDevices || typeof MediaRecorder !== 'function') return X.toast('This browser can’t record — upload a file instead.');
      var stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch (x) { return X.toast('Please allow the microphone to record.'); }
      var mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
      var chunks = [], r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), t0 = Date.now(), timer;
      rec = r; btn.textContent = '⏹ Stop (0s)'; btn.classList.add('primary');
      timer = setInterval(function () { btn.textContent = '⏹ Stop (' + Math.round((Date.now() - t0) / 1000) + 's)'; }, 500);
      r.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      r.onstop = async function () {
        clearInterval(timer); stream.getTracks().forEach(function (tr) { tr.stop(); }); rec = null;
        btn.textContent = '⏳ Saving…';
        try { var aid = await saveAudio(new Blob(chunks, { type: (mime || 'audio/webm').split(';')[0] })); m.vo[i] = { aid: aid, text: scenes()[i].vo }; X.mark(); X.toast('Recording saved ✅'); }
        catch (x) { X.toast(x.message); }
        paint();
      };
      r.start();
    }
    // ── pictures ──
    async function saveImg(image) { return (await X.api('app-img', { image: await X.shrink(image) })).imgId; }
    async function makeChar() {
      var lb = p.plan.lookbook, prompt = (lb.characterSheetPrompt || ('Full-body portrait of ' + lb.character)) + '. Wardrobe: ' + lb.wardrobe + '. Single person, full body, facing camera, plain light-grey studio background, ' + (lb.style || 'photorealistic');
      var r = await X.api('app-picture', { kind: 'frame', prompt: prompt, aspect: '9:16' });
      m.charImg = await saveImg(r.image); X.mark();
    }
    async function makeCastOne(k) {
      var c = cast(p)[k];
      var r = await X.api('app-picture', { kind: 'frame', prompt: castPrompt(p, c), aspect: '9:16' });
      m.castImgs[k] = await saveImg(r.image); X.mark(); paint();
    }
    async function makeLocOne(k) {
      var r = await X.api('app-picture', { kind: 'frame', prompt: locPrompt(p, p.plan.locations[k]), aspect: sizeOf(p, X) });
      m.locImgs[k] = await saveImg(r.image); X.mark(); paint();
    }
    async function makeCast() {
      if (!cast(p).length) { if (needsChar(p) && !m.charImg) await makeChar(); }
      else for (var k = 0; k < cast(p).length; k++) if (!m.castImgs[k]) await makeCastOne(k);
      for (var l = 0; l < (p.plan.locations || []).length; l++) if (!m.locImgs[l]) await makeLocOne(l);
    }
    async function makePic(i) {
      var sc = scenes()[i]; if (!sc.imagePrompt) throw new Error('Scene ' + (i + 1) + ' has no picture prompt yet — open the Dzine prompts tab first.');
      var rf = await sceneRefs(p, sc, X.api);
      var r = await X.api('app-picture', { kind: 'frame', prompt: sc.imagePrompt + ' ' + rf.words + (p.plan.lookbook.style ? ' Style: ' + p.plan.lookbook.style + '.' : ''), aspect: sizeOf(p, X), refImgIds: rf.ids, refLabels: rf.labels });
      p.frames[String(i)] = await saveImg(r.image);
      delete m.clips[i]; delete m.lipsync[i]; delete m.checks[i]; X.mark(); paint();
    }
    async function makePics() {
      await makeCast();
      for (var i = 0; i < scenes().length; i++) { if (frame(i) || !scenes()[i].imagePrompt) continue; await makePic(i); }
    }
    // ── clips ──
    async function makeClip(i) {
      var sc = scenes()[i]; if (!frame(i)) throw new Error('Scene ' + (i + 1) + ' needs a start picture first.');
      var r = await X.api('vm-clip', { tier: m.tier, imgId: frame(i), prompt: sc.videoPrompt || sc.visual, seconds: sc.seconds, negative: p.plan.lookbook.negative, aspect: sizeOf(p, X) });
      m.clips[i] = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '', prompt: sig(i, true) }); delete m.lipsync[i]; delete m.checks[i]; X.mark(); paint(); poll();
    }
    async function makeClips() {
      if (draft()) return;
      for (var i = 0; i < scenes().length; i++) { var c = m.clips[i]; if (c && (c.url || pend(c)) && !(remakeStale && staleClip(i))) continue; if (!frame(i)) continue; await makeClip(i); }
      remakeStale = false;
    }
    // ── consistency check: one frame from the middle of the clip vs the reference photos ──
    async function grabFrame(i) {
      var c = m.clips[i], el, cv = document.createElement('canvas');
      if (c && c.url) { el = await loadVideo(c.url); await seek(el, (el.duration || 2) / 2); }
      else { el = await loadImg(X.frameSrc(frame(i))); if (!el) throw new Error('Couldn’t load the picture.'); }
      var w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight, k = 512 / Math.max(w, h);
      cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
      if (el.tagName === 'VIDEO') { el.removeAttribute('src'); el.load(); }
      return cv.toDataURL('image/jpeg', 0.72);
    }
    async function checkScene(i, show) {
      if (checking[i]) return; checking[i] = true; if (show) paint();
      try {
        var sc = scenes()[i], img = await grabFrame(i);
        var r = await X.api('vm-check', { frame: img, refs: (await sceneRefs(p, sc, null)).ids, scene: (sc.location ? sc.location + ': ' : '') + (sc.visual || sc.title) });
        m.checks[i] = { ok: r.check.ok, issues: r.check.issues, clip: (m.clips[i] && m.clips[i].url) || '' }; X.mark(); X.save().catch(function () {});
      } catch (x) { if (show) X.toast('Check: ' + x.message); }
      delete checking[i]; if (document.body.contains(root) && !busy) paint();
    }
    // ── voices ──
    async function makeVoices() {
      for (var i = 0; i < scenes().length; i++) {
        var ls = sceneLines(scenes()[i]); if (!ls.length || linesReady(i)) continue;
        var have = m.lines[i] || [], out = [];
        for (var k = 0; k < ls.length; k++) {
          var text = lineText(ls[k].text), voice = voiceFor(ls[k].who), h = have[k];
          if (h && h.url && h.text === text && (h.voice || m.voice) === voice) { out.push(h); continue; }
          var r = await X.api('vm-tts', { text: text, voice: voice });
          out.push({ url: r.url, who: ls[k].who, text: text, voice: voice });
        }
        m.lines[i] = out; delete m.lipsync[i]; X.mark(); paint();
      }
    }
    // ── lip sync ──
    async function makeLip(i) {
      if (!lipReady(i)) throw new Error('Scene ' + (i + 1) + ' needs its clip and voice first.');
      var r = await X.api('vm-lipsync', { videoUrl: m.clips[i].url, audioUrl: m.lines[i][0].url, seconds: clipLen(m.tier, scenes()[i].seconds) });
      m.lipsync[i] = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '' }); X.mark(); paint(); poll();
    }
    async function makeLips(quiet) {
      var waiting = 0;
      for (var i = 0; i < scenes().length; i++) {
        if (!lipWanted(i)) continue; var j = m.lipsync[i]; if (j && (j.url || pend(j))) continue;
        if (!lipReady(i)) { waiting++; continue; } await makeLip(i);
      }
      if (waiting && !quiet) X.toast(waiting + ' scene(s) still need their clip or voice — lip sync will be ready to make after.');
    }
    // ── sound effects ──
    async function makeSfx(i) {
      var sc = scenes()[i]; if (!sc.sfx) return;
      var r = await X.api('vm-sfx', { text: sc.sfx, seconds: Math.min(5, Math.max(1, Number(sc.seconds) || 3)) });
      m.sfx[i] = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '', prompt: sc.sfx.slice(0, 200) }); X.mark(); paint(); poll();
    }
    async function makeSfxAll() {
      for (var i = 0; i < scenes().length; i++) { var sc = scenes()[i], j = m.sfx[i]; if (!sc.sfx) continue; if (j && ((j.url && (!j.prompt || j.prompt === sc.sfx.slice(0, 200))) || pend(j))) continue; await makeSfx(i); }
    }
    async function makeMusic() {
      var total = scenes().reduce(function (n, s) { return n + (Number(s.seconds) || 0); }, 0) + (m.endCard ? END : 0);
      var r = await X.api('vm-music', { prompt: m.musicPrompt, seconds: Math.ceil(total) + 2 }); m.musicJob = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '' }); X.mark(); paint(); poll();
    }
    async function everything() {
      await makePics(); await makeClips();
      if (m.voSource !== 'own') await makeVoices();
      if (m.sfxOn) await makeSfxAll();
      if (m.music && !(m.musicJob && (m.musicJob.url || pend(m.musicJob)))) await makeMusic();
      if (!draft() && m.voSource !== 'own') { autoLip = true; await makeLips(true); }
      X.toast(draft() ? 'Everything for the draft is ready — tap “Make the draft video” ✅' : 'Clips are being made — the final video can be made when they’re ready ✅');
    }
    function poll() {
      clearTimeout(polling);
      polling = setTimeout(async function () {
        polling = 0; if (!document.body.contains(root)) return;
        var refs = [];
        Object.keys(m.clips).forEach(function (k) { if (pend(m.clips[k])) refs.push({ j: m.clips[k], kind: 'clip', i: +k }); });
        Object.keys(m.lipsync).forEach(function (k) { if (pend(m.lipsync[k])) refs.push({ j: m.lipsync[k], kind: 'lip', i: +k }); });
        Object.keys(m.sfx).forEach(function (k) { if (pend(m.sfx[k])) refs.push({ j: m.sfx[k], kind: 'sfx', i: +k }); });
        if (m.music && pend(m.musicJob)) refs.push({ j: m.musicJob, kind: 'music' });
        if (!refs.length) return;
        refs = refs.slice(0, 16);
        try {
          var r = await Promise.race([X.api('vm-status', { jobs: refs.map(function (x) { return { statusUrl: x.j.statusUrl, responseUrl: x.j.responseUrl }; }) }), new Promise(function (_, bad) { setTimeout(function () { bad(new Error('timeout')); }, 25000); })]);
          var changed = false, done = [];
          r.results.forEach(function (res, k) {
            var j = refs[k].j;
            if (res.status === 'COMPLETED') { j.url = res.url; j.status = 'COMPLETED'; changed = true; if (refs[k].kind === 'clip') done.push(refs[k].i); }
            else if (res.status === 'ERROR') { j.error = res.error || 'Failed'; changed = true; }
            else if (j.status !== res.status) { j.status = res.status; changed = true; }
          });
          if (changed) { X.mark(); X.save().catch(function () {}); if (!busy) paint(); }
          done.forEach(function (i) { checkScene(i, false); });
          if (done.length && autoLip && !busy) makeLips(true).then(function () { X.save().catch(function () {}); }, function () {});
        } catch (x) { /* try again next time */ }
        poll();
      }, 6000);
    }
    // ── final edit + saving in HQ ──
    async function render(btn) {
      var prog = function (f, t) { $('#vmProg', root).classList.remove('hidden'); $('#vmProgT', root).textContent = t; $('#vmProgB', root).style.width = Math.round(f * 100) + '%'; };
      btn.disabled = true;
      try {
        var out = await composeVideo(p, m, X, prog);
        var url = URL.createObjectURL(out.blob);
        var outHtml = '<video src="' + url + '" controls playsinline style="width:100%;max-width:' + (sizeOf(p, X) === '16:9' ? 560 : 320) + 'px;display:block;margin:10px auto;border-radius:10px"></video><a class="btn primary" style="width:100%;text-align:center" href="' + url + '" download="' + X.slug() + '.' + out.ext + '">⬇️ Download the ' + (DR ? 'film' : 'video') + '</a>';
        lastOut = { html: outHtml, msg: 'Saving a copy in HQ…' }; $('#vmOut', root).innerHTML = outHtml;
        prog(1, out.ok ? 'Done ✅ — saving a copy in HQ…' : 'Done — but this browser made a format Instagram may not accept. For Instagram-ready MP4 use Chrome or Edge on a laptop.');
        if (p.status === 'scripted' || p.status === 'generating' || p.status === 'idea') { p.status = 'editing'; X.mark(); }
        var msg;
        try { await saveFinal(out, prog); msg = (out.ok ? 'Done ✅ — your video is ready' : 'Done — but this browser made a format Instagram may not accept (use Chrome or Edge on a laptop)') + ' and a copy is saved in HQ (📼 below).'; }
        catch (x) { msg = 'Done ✅ — download it now (couldn’t save a copy in HQ: ' + x.message + ')'; }
        lastOut = { html: outHtml, msg: msg }; paint();
      } catch (x) { prog(0, '⚠️ ' + (x.message || 'Couldn’t make the video.')); }
      btn.disabled = false;
    }
    async function saveFinal(out, prog) {
      var blob = out.blob, parts = Math.ceil(blob.size / PART);
      if (parts > 80) throw new Error('the video is too big to keep');
      var fid = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      for (var k = 0; k < parts; k++) {
        prog(1, 'Saving a copy in HQ… ' + Math.round(k / parts * 100) + '%');
        var d = await fileToDataUrl(blob.slice(k * PART, (k + 1) * PART));
        await X.api('vm-final-part', { fid: fid, idx: k, b64: d.slice(d.indexOf(',') + 1) });
      }
      m.finals.unshift({ fid: fid, parts: parts, size: blob.size, at: new Date().toISOString(), ext: out.ext });
      var old = m.finals.splice(3); X.mark(); await X.save();
      old.forEach(function (f) { X.api('vm-final-delete', { fid: f.fid, parts: f.parts }).catch(function () {}); });
    }
    async function downloadFinal(f, btn) {
      if (!f) return; var keep = btn.textContent; btn.disabled = true;
      try {
        var bufs = [];
        for (var k = 0; k < f.parts; k++) {
          btn.textContent = '⏳ ' + Math.round(k / f.parts * 100) + '%';
          var r = await fetch('/.netlify/functions/studio-hq?vfinal=' + encodeURIComponent(f.fid) + '&part=' + k, { credentials: 'same-origin' });
          if (!r.ok) throw new Error('This saved video couldn’t be loaded.');
          bufs.push(await r.arrayBuffer());
        }
        var url = URL.createObjectURL(new Blob(bufs, { type: f.ext === 'webm' ? 'video/webm' : 'video/mp4' })), a = document.createElement('a');
        a.href = url; a.download = X.slug() + '-' + f.at.slice(0, 10) + '.' + f.ext; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      } catch (x) { X.toast(x.message); }
      btn.disabled = false; btn.textContent = keep;
    }
  }

  // ════════ compositor ════════
  function loadVideo(url) {
    return new Promise(function (ok, bad) {
      var v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onloadeddata = function () { ok(v); }; v.onerror = function () { bad(new Error('A clip couldn’t be loaded — it may have expired on fal.ai. Remake that scene.')); };
      v.src = url;
    });
  }
  function seek(v, t) { return new Promise(function (ok) { var tt = Math.max(0, Math.min((v.duration || 1) - 0.04, t)); if (Math.abs(v.currentTime - tt) < 0.005) return ok(); var done = function () { v.removeEventListener('seeked', done); ok(); }; v.addEventListener('seeked', done); v.currentTime = tt; setTimeout(done, 1500); }); }
  function loadImg(url) { return new Promise(function (ok) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = url; }); }
  function cover(c, el, w, h, zoom, dx, dy) {
    var iw = el.videoWidth || el.naturalWidth, ih = el.videoHeight || el.naturalHeight; if (!iw) return;
    var k = Math.max(w / iw, h / ih) * (zoom || 1), sw = iw * k, sh = ih * k;
    c.drawImage(el, (w - sw) / 2 + (dx || 0) * (sw - w) / 2, (h - sh) / 2 + (dy || 0) * (sh - h) / 2, sw, sh);
  }
  function wrap(c, text, maxW) { var words = String(text || '').split(/\s+/), lines = [], l = ''; words.forEach(function (w) { var t = l ? l + ' ' + w : w; if (c.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }); if (l) lines.push(l); return lines; }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function overlays(c, w, h, s, t, m) {
    var S = Math.min(w, h), wide = w > h;
    if (s.onScreen) {
      var p = Math.min(1, t / 0.3), sz = Math.round(S * 0.072), bounce = 1 + 0.12 * Math.sin(Math.min(1, t / 0.3) * Math.PI);
      c.save(); c.globalAlpha = p; c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif'; c.textAlign = 'center';
      var lines = wrap(c, s.onScreen, w * (wide ? 0.6 : 0.82)), y0 = h * (wide ? 0.18 : 0.2);
      c.translate(w / 2, y0); c.scale(bounce, bounce); c.translate(-w / 2, -y0);
      lines.forEach(function (ln, k) { var lw = c.measureText(ln).width, y = y0 + k * sz * 1.22; c.fillStyle = '#FFFFFF'; rr(c, w / 2 - lw / 2 - sz * 0.3, y - sz * 0.92, lw + sz * 0.6, sz * 1.18, sz * 0.22); c.fill(); c.fillStyle = '#0F1E36'; c.fillText(ln, w / 2, y); });
      c.restore();
    }
    if (m.captions && s.vo) {
      // words appear in chunks of ~4 as the line is spoken
      var words = s.vo.replace(/\[pause\]/gi, '').split(/\s+/).filter(Boolean), dur = Math.max(1, Number(s.seconds) || 3), per = dur / Math.max(1, Math.ceil(words.length / 4));
      var chunk = Math.min(Math.ceil(words.length / 4) - 1, Math.floor(t / per)), txt = words.slice(chunk * 4, chunk * 4 + 4).join(' ');
      var fs = Math.round(S * 0.058); c.font = '800 ' + fs + 'px "Poppins","DM Sans",sans-serif'; c.textAlign = 'center';
      var lw2 = c.measureText(txt).width, yb = h * (wide ? 0.86 : h === w ? 0.84 : 0.78);
      c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, w / 2 - lw2 / 2 - fs * 0.4, yb - fs * 0.95, lw2 + fs * 0.8, fs * 1.35, fs * 0.3); c.fill();
      c.fillStyle = '#FFD25E'; c.fillText(txt, w / 2, yb);
    }
  }
  function drawLogo(c, w, h, logo, big) {
    if (!logo) return; var S = Math.min(w, h), max = S * (big ? 0.26 : 0.13), iw = logo.naturalWidth, ih = logo.naturalHeight, k = Math.min(max / iw, max / ih), lw = iw * k, lh = ih * k;
    c.save();
    if (big) { c.drawImage(logo, (w - lw) / 2, h * 0.24 - lh, lw, lh); }
    else { var pad = S * 0.035, x = w - lw - pad, y = pad; c.globalAlpha = 0.95; c.fillStyle = 'rgba(255,255,255,.82)'; rr(c, x - S * 0.012, y - S * 0.012, lw + S * 0.024, lh + S * 0.024, S * 0.018); c.fill(); c.drawImage(logo, x, y, lw, lh); }
    c.restore();
  }
  function endCard(c, w, h, p, t, logo) {
    var S = Math.min(w, h);
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#057A44'); g.addColorStop(1, '#0F1E36'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    var a = Math.min(1, t / 0.4); c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = '#FFFFFF';
    if (logo) { c.fillStyle = 'rgba(255,255,255,.95)'; var lk = Math.min(S * 0.26 / logo.naturalWidth, S * 0.26 / logo.naturalHeight), lw = logo.naturalWidth * lk, lh = logo.naturalHeight * lk; rr(c, (w - lw) / 2 - S * 0.03, h * 0.24 - lh - S * 0.03, lw + S * 0.06, lh + S * 0.06, S * 0.03); c.fill(); drawLogo(c, w, h, logo, true); c.fillStyle = '#FFFFFF'; }
    var name = p.brief.forWho === 'auntietobi' ? 'Auntie Tobi' : (p.brief.business || ''), sz = Math.round(S * 0.085);
    c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif'; wrap(c, name, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, h * 0.38 + k * sz * 1.15); });
    var cta = p.plan.post.endCard || p.plan.strategy.cta || ''; var fs = Math.round(S * 0.05);
    c.font = '700 ' + fs + 'px "DM Sans",sans-serif'; c.fillStyle = '#FFB81C';
    var lines = wrap(c, cta, w * 0.8), y = h * 0.54; lines.forEach(function (ln, k) { c.fillText(ln, w / 2, y + k * fs * 1.3); });
    var contact = p.brief.forWho === 'auntietobi' ? 'auntietobi.co.uk · @auntietobi_uk' : (p.brief.contact || p.brief.link || '');
    if (contact) { c.font = '600 ' + Math.round(S * 0.036) + 'px "DM Sans",sans-serif'; c.fillStyle = 'rgba(255,255,255,.9)'; wrap(c, contact, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, h * 0.72 + k * S * 0.05); }); }
    c.restore();
  }
  // 🎭 mini-drama ending: a short, elegant brand reveal (logo, name, tagline)
  function revealCard(c, w, h, p, t, logo) {
    var S = Math.min(w, h), g = c.createRadialGradient(w / 2, h * 0.42, S * 0.05, w / 2, h * 0.42, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#12352A'); g.addColorStop(1, '#05070B'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    var ease = function (x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
    c.save(); c.textAlign = 'center';
    var y = h * 0.4;
    if (logo) {
      var a = ease(t / 0.6), k = Math.min(S * 0.3 / logo.naturalWidth, S * 0.3 / logo.naturalHeight) * (0.85 + 0.15 * a), lw = logo.naturalWidth * k, lh = logo.naturalHeight * k;
      c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,.96)'; rr(c, (w - lw) / 2 - S * 0.03, y - lh - S * 0.03, lw + S * 0.06, lh + S * 0.06, S * 0.03); c.fill(); c.drawImage(logo, (w - lw) / 2, y - lh, lw, lh);
      y += S * 0.12;
    }
    var name = p.brief.forWho === 'auntietobi' ? 'Auntie Tobi' : (p.brief.business || ''), sz = Math.round(S * 0.085);
    c.globalAlpha = ease((t - 0.3) / 0.5); c.fillStyle = '#FFFFFF'; c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif';
    wrap(c, name, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, y + k * sz * 1.12); }); y += sz * 1.4;
    var tag = (p.plan.reveal && p.plan.reveal.tagline) || p.plan.post.endCard || '', fs = Math.round(S * 0.048);
    c.globalAlpha = ease((t - 0.7) / 0.5); c.fillStyle = '#FFB81C'; c.font = 'italic 600 ' + fs + 'px "DM Sans",sans-serif';
    wrap(c, tag, w * 0.8).forEach(function (ln, k) { c.fillText(ln, w / 2, y + k * fs * 1.3); });
    var contact = (p.plan.reveal && p.plan.reveal.sub) || (p.brief.forWho === 'auntietobi' ? 'auntietobi.co.uk · @auntietobi_uk' : (p.brief.contact || p.brief.link || ''));
    if (contact) { c.globalAlpha = ease((t - 1.1) / 0.5) * 0.85; c.fillStyle = '#FFFFFF'; c.font = '600 ' + Math.round(S * 0.034) + 'px "DM Sans",sans-serif'; wrap(c, contact, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, h * 0.8 + k * S * 0.048); }); }
    c.restore();
  }
  function useLip(m, i) { return m.tier !== 'draft' && m.voSource !== 'own' && m.lipsync && m.lipsync[i] && m.lipsync[i].url; }
  async function mixAudio(p, m, total, prog) {
    var AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return null;
    var rateHz = 48000, ctx = new AC(2, Math.ceil(total * rateHz), rateHz), starts = [], t = 0;
    p.plan.scenes.forEach(function (s) { starts.push(t); t += Number(s.seconds) || 0; });
    async function buf(url) { var r = await fetch(url); if (!r.ok) throw new Error('Audio couldn’t be loaded — it may have expired. Remake it.'); return ctx.decodeAudioData(await r.arrayBuffer()); }
    var voWindows = [], any = false;
    // gentle limiter so loud recordings never distort
    var out = ctx.createDynamicsCompressor(); out.threshold.value = -6; out.knee.value = 6; out.ratio.value = 12; out.attack.value = 0.003; out.release.value = 0.2; out.connect(ctx.destination);
    var own = m.voSource === 'own';
    if (own && m.voFull) {
      prog && prog(0.03, 'Loading your voiceover…');
      var fb = await buf(voUrl({ aid: m.voFull })), fs = ctx.createBufferSource(); fs.buffer = fb; fs.connect(out); fs.start(0.1); voWindows.push([0.1, 0.1 + fb.duration]);
    } else if (own) {
      var keys = Object.keys(m.vo || {});
      for (var k = 0; k < keys.length; k++) {
        var i = +keys[k], v = m.vo[keys[k]]; if (!v || !p.plan.scenes[i] || !v.aid) continue;
        prog && prog(0.02 + 0.03 * k / keys.length, 'Loading the voiceover…');
        var b = await buf(voUrl(v)), src = ctx.createBufferSource(); src.buffer = b; var gn = ctx.createGain(); gn.gain.value = 1.15; src.connect(gn).connect(out);
        var at = starts[i] + 0.1; src.start(at); voWindows.push([at, at + b.duration]);
      }
    } else {
      for (var si = 0; si < p.plan.scenes.length; si++) {
        var ls = (m.lines && m.lines[si]) || [];
        if (!ls.length && m.vo && m.vo[si] && m.vo[si].url) ls = [m.vo[si]]; // older projects
        var tt = starts[si] + (useLip(m, si) ? 0 : 0.1);
        for (var li = 0; li < ls.length; li++) {
          if (!ls[li].url) continue; prog && prog(0.02 + 0.03 * si / p.plan.scenes.length, 'Loading the voices…');
          var lb = await buf(ls[li].url), ls2 = ctx.createBufferSource(); ls2.buffer = lb; ls2.connect(out); ls2.start(tt); voWindows.push([tt, tt + lb.duration]); tt += lb.duration + 0.15;
        }
      }
    }
    if (m.sfxOn && m.sfx) {
      for (var xi = 0; xi < p.plan.scenes.length; xi++) {
        var sj = m.sfx[xi]; if (!sj || !sj.url || !p.plan.scenes[xi].sfx) continue;
        prog && prog(0.05, 'Loading the sound effects…');
        try { var sb = await buf(sj.url), ss = ctx.createBufferSource(), sg = ctx.createGain(); ss.buffer = sb; sg.gain.value = 0.6; ss.connect(sg).connect(out); ss.start(starts[xi]); any = true; } catch (e) { /* skip a broken effect */ }
      }
    }
    if (m.music && m.musicJob && m.musicJob.url) {
      prog && prog(0.06, 'Loading the music…');
      var mb = await buf(m.musicJob.url), ms = ctx.createBufferSource(); ms.buffer = mb; ms.loop = mb.duration < total; var mg = ctx.createGain(), vol = m.musicVol == null ? 0.22 : m.musicVol;
      mg.gain.setValueAtTime(0, 0); mg.gain.linearRampToValueAtTime(vol, 0.6);
      voWindows.forEach(function (w) { mg.gain.setValueAtTime(vol, Math.max(0.6, w[0] - 0.15)); mg.gain.linearRampToValueAtTime(vol * 0.45, w[0]); mg.gain.setValueAtTime(vol * 0.45, w[1]); mg.gain.linearRampToValueAtTime(vol, w[1] + 0.3); });
      mg.gain.setValueAtTime(vol, Math.max(0, total - 1.2)); mg.gain.linearRampToValueAtTime(0, total);
      ms.connect(mg).connect(out); ms.start(0); any = true;
    }
    if (!voWindows.length && !any) return null;
    return ctx.startRendering();
  }
  async function pickVideo(w, h) {
    var tries = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42002a', 'avc'], ['vp09.00.40.08', 'vp9']];
    for (var i = 0; i < tries.length; i++) { try { var r = await VideoEncoder.isConfigSupported({ codec: tries[i][0], width: w, height: h, bitrate: 8e6, framerate: FPS }); if (r && r.supported) return { codec: tries[i][0], mux: tries[i][1] }; } catch (e) { /* next */ } }
    return null;
  }
  async function pickAudio() {
    if (typeof AudioEncoder !== 'function') return null;
    var tries = [['mp4a.40.2', 'aac'], ['opus', 'opus']];
    for (var i = 0; i < tries.length; i++) { try { var r = await AudioEncoder.isConfigSupported({ codec: tries[i][0], sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }); if (r && r.supported) return { codec: tries[i][0], mux: tries[i][1] }; } catch (e) { /* next */ } }
    return null;
  }
  async function composeVideo(p, m, X, prog) {
    if (typeof VideoEncoder !== 'function' || !window.Mp4Muxer) throw new Error('This browser can’t make videos — please use Chrome or Edge on a laptop.');
    var dims = DIMS[sizeOf(p, X)], W = dims[0], H = dims[1], scenes = p.plan.scenes, draft = m.tier === 'draft';
    var durs = scenes.map(function (s) { return Math.max(1, Number(s.seconds) || 3); }), starts = [], tt = 0; durs.forEach(function (d) { starts.push(tt); tt += d; });
    var total = tt + (m.endCard ? END : 0);
    prog(0.01, draft ? 'Loading the pictures…' : 'Loading the clips…');
    var media = [];
    for (var i = 0; i < scenes.length; i++) {
      var c = m.clips && m.clips[i], lip = useLip(m, i);
      if (lip) media.push({ v: await loadVideo(m.lipsync[i].url) });
      else if (!draft && c && c.url) media.push({ v: await loadVideo(c.url) });
      else { var f = p.frames && p.frames[String(i)]; media.push({ img: f ? await loadImg(X.frameSrc(f)) : null }); }
    }
    var logo = p.brief.logo && m.logoOn !== false ? await loadImg(X.frameSrc(p.brief.logo)) : null;
    var audio = await mixAudio(p, m, total, prog);
    try { await document.fonts.load('800 60px Poppins'); } catch (e) { /* fallback font */ }
    var vpick = await pickVideo(W, H); if (!vpick) throw new Error('This browser can’t encode video — please use Chrome or Edge.');
    var apick = audio ? await pickAudio() : null;
    var muxOpts = { target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: vpick.mux, width: W, height: H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
    if (apick) muxOpts.audio = { codec: apick.mux, numberOfChannels: 2, sampleRate: 48000 };
    var muxer = new Mp4Muxer.Muxer(muxOpts), failed = null;
    var venc = new VideoEncoder({ output: function (ch, meta) { muxer.addVideoChunk(ch, meta); }, error: function (e) { failed = e; } });
    var vcfg = { codec: vpick.codec, width: W, height: H, bitrate: 8e6, framerate: FPS }; if (vpick.mux === 'avc') vcfg.avc = { format: 'avc' }; venc.configure(vcfg);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d');
    var prevCv = document.createElement('canvas'); prevCv.width = W; prevCv.height = H; var px = prevCv.getContext('2d');
    async function drawScene(ctx, i, t) {
      var md = media[i]; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (md.v) { await seek(md.v, t); cover(ctx, md.v, W, H, 1); }
      else if (md.img) {
        // gentle camera moves: zoom in / out with a slow pan, alternating per scene
        var f = t / durs[i], mv = i % 4;
        if (mv === 0) cover(ctx, md.img, W, H, 1 + 0.1 * f);
        else if (mv === 1) cover(ctx, md.img, W, H, 1.12, -0.6 + 1.2 * f, 0);
        else if (mv === 2) cover(ctx, md.img, W, H, 1.12 - 0.1 * f);
        else cover(ctx, md.img, W, H, 1.12, 0, 0.6 - 1.2 * f);
      }
      overlays(ctx, W, H, scenes[i], t, m);
      if (logo) drawLogo(ctx, W, H, logo, false);
    }
    var frames = Math.round(total * FPS), TR = 0.25;
    for (var fI = 0; fI < frames; fI++) {
      if (failed) throw failed;
      var T = fI / FPS;
      if (T >= tt) (p.brief.mode === 'drama' ? revealCard : endCard)(cx, W, H, p, T - tt, logo);
      else {
        var si = 0; while (si < scenes.length - 1 && T >= starts[si + 1]) si++;
        var lt = T - starts[si];
        await drawScene(cx, si, lt);
        if (si > 0 && lt < TR) { await drawScene(px, si - 1, durs[si - 1] - 0.01); cx.save(); cx.globalAlpha = 1 - lt / TR; cx.drawImage(prevCv, 0, 0); cx.restore(); }
      }
      var vf;
      try { vf = new VideoFrame(cv, { timestamp: Math.round(fI * 1e6 / FPS), duration: Math.round(1e6 / FPS) }); }
      catch (e) { throw new Error('The browser blocked reading the clips (security). Download the clips and use CapCut, or try Chrome.'); }
      venc.encode(vf, { keyFrame: fI % (FPS * 2) === 0 }); vf.close();
      if (fI % 10 === 0) prog(0.08 + 0.85 * fI / frames, 'Editing… ' + Math.round(fI / frames * 100) + '%');
      if (venc.encodeQueueSize > 8) await new Promise(function (r) { setTimeout(r, 5); });
    }
    await venc.flush(); venc.close();
    if (apick && audio) {
      prog(0.95, 'Adding the sound…');
      var aenc = new AudioEncoder({ output: function (ch, meta) { muxer.addAudioChunk(ch, meta); }, error: function (e) { failed = e; } });
      aenc.configure({ codec: apick.codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
      var L = audio.getChannelData(0), R = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L, N = audio.length, CH = 1024;
      for (var o = 0; o < N; o += CH) {
        var n = Math.min(CH, N - o), data = new Float32Array(n * 2); data.set(L.subarray(o, o + n), 0); data.set(R.subarray(o, o + n), n);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / 48000 * 1e6), data: data });
        aenc.encode(ad); ad.close();
        if (aenc.encodeQueueSize > 20) await new Promise(function (r) { setTimeout(r, 2); });
      }
      await aenc.flush(); aenc.close();
    }
    if (failed) throw failed;
    muxer.finalize();
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4', ok: vpick.mux === 'avc' && (!audio || (apick && apick.mux === 'aac')) };
  }

  window.HQVmake = { voiceIdSheet: function (X, p, who, done) { loadSettings(X.api).then(function () { voiceIdSheet(X, p, who, done); }, function (x) { X.toast(x.message); }); },
    voiceLabel: function (p, who) { var v = p.make && p.make.castVoices && p.make.castVoices[who]; if (!v) return ''; var s = ST && (ST.savedVoices || []).filter(function (x) { return x.id === v; })[0]; return s ? '⭐ ' + s.label : /^[A-Za-z0-9]{16,40}$/.test(v) ? '⭐ ElevenLabs voice' : v; },
    html: html, wire: wire, settingsSheet: settingsSheet, composeVideo: composeVideo, sceneRefs: sceneRefs, ensureLocations: ensureLocations, locPrompt: locPrompt, castPrompt: castPrompt };
})();
