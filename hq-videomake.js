/*
 * Auntie Tobi HQ — 🎬 "Make the whole video" for the Video Ad Studio.
 * Character picture → start pictures → AI clips (fal.ai) → voiceover → AI music → automatic edit
 * (trim, transitions, on-screen text, captions, end card, voice + music mix) → final MP4, all in the browser.
 * HQVmake.html(p) / HQVmake.wire(pane, p, ctx) are used by hq-videoad.js; HQVmake.settingsSheet(ctx) for ⚙️.
 */
(function () {
  'use strict';
  var FPS = 30, END = 2.5;
  var ST = null; // cached settings
  var VOICE_INFO = { Aria: 'warm, confident woman (American)', Sarah: 'soft, reassuring young woman', Laura: 'upbeat, friendly young woman', Charlotte: 'smooth, elegant British woman', Alice: 'clear, professional British woman', Matilda: 'warm, friendly woman', Jessica: 'bright, expressive young woman', Lily: 'gentle, warm British woman', Roger: 'confident, easy-going man', Charlie: 'natural, casual young man (Australian)', George: 'warm, rich British man — great storyteller', Callum: 'intense, gravelly man', River: 'calm, relaxed neutral voice', Liam: 'energetic young man', Will: 'friendly, chilled young man', Eric: 'smooth, trustworthy man', Chris: 'casual, down-to-earth man', Brian: 'deep, resonant man — great for adverts', Daniel: 'calm, authoritative British man — newsreader feel', Bill: 'older, wise and trustworthy man' };
  var previews = {};
  function voUrl(v) { return v ? (v.aid ? '/.netlify/functions/studio-hq?vaudio=' + encodeURIComponent(v.aid) : v.url) : ''; }
  function fileToDataUrl(blob) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = function () { bad(new Error('Couldn’t read that file.')); }; r.readAsDataURL(blob); }); }
  function $(q, r) { return (r || document).querySelector(q); }
  function $$(q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); }
  function gbp(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function clipLen(tier, s) { s = Number(s) || 5; return tier === 'budget' ? (s <= 5 ? 5 : 10) : (s <= 4 ? 4 : s <= 6 ? 6 : 8); }
  function rate(tier) { var t = ST && ST.tiers ? ST.tiers.filter(function (x) { return x.id === tier; })[0] : null; return t ? t.gbpPerSec : 0.06; }
  function needsChar(p) { return p.plan.scenes.some(function (s) { return s.character; }); }
  function estimate(p, tier) {
    var m = p.make || {}, clips = 0, vo = 0;
    p.plan.scenes.forEach(function (s, i) { if (!(m.clips && m.clips[i] && m.clips[i].url)) clips += clipLen(tier, s.seconds) * rate(tier); if (m.voSource !== 'own' && s.vo && !(m.vo && m.vo[i] && m.vo[i].url)) vo += s.vo.length / 1000 * 0.1 * 0.79; });
    var total = p.plan.scenes.reduce(function (n, s) { return n + (Number(s.seconds) || 0); }, 0) + END;
    var music = m.music !== false && !(m.musicJob && m.musicJob.url) ? Math.max(10, total) / 60 * 0.8 * 0.79 : 0;
    var pics = p.plan.scenes.filter(function (s, i) { return !(p.frames && p.frames[String(i)]); }).length * 0.04 + (needsChar(p) && !m.charImg ? 0.04 : 0);
    return { clips: clips, vo: Math.max(vo ? 0.01 : 0, vo), music: music, pics: pics, total: clips + vo + music + pics };
  }

  async function loadSettings(api, force) { if (!ST || force) ST = (await api('vm-settings')).settings; return ST; }

  // ════════ ⚙️ settings ════════
  function settingsSheet(X, onDone) {
    loadSettings(X.api, true).then(function (s) {
      var sh = X.sheet('<h2>⚙️ Video AI settings</h2><p class="muted" style="margin:4px 0 10px">Videos, voices and music are made with <b>fal.ai</b> (pay as you go). ' + (s.ready ? '✅ Connected (key ' + X.esc(s.keyHint) + ').' : 'Not connected yet.') + '</p>' +
        (s.isAdmin ? '<ol style="font-size:14px;padding-left:20px;margin:0 0 10px"><li>Go to <b>fal.ai</b> → sign up / log in.</li><li><b>Billing</b> → add credit (e.g. £10–£20).</li><li><b>Dashboard → API Keys</b> → create a key → copy it.</li><li>Paste it below and save.</li></ol>' +
          '<label for="vsKey">fal.ai API key</label><input id="vsKey" type="password" autocomplete="off" placeholder="' + (s.ready ? 'Leave empty to keep the current key' : 'Paste your key') + '">' +
          '<div class="f2" style="margin-top:8px"><div><label for="vsCap">Monthly cap (£)</label><input id="vsCap" type="number" min="1" value="' + s.capGbp + '"></div><div><label for="vsVoice">Default voice</label><select id="vsVoice">' + s.voices.map(function (v) { return '<option' + (v === s.voice ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></div></div>' +
          '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Advanced — model names on fal.ai</summary>' + s.tiers.map(function (t) { return '<label for="vsM' + t.id + '">' + X.esc(t.label) + '</label><input id="vsM' + t.id + '" value="' + X.esc(s.models[t.id]) + '">'; }).join('') + '<p class="muted" style="font-size:12.5px">Only change these if fal.ai renames a model.</p></details>' +
          (s.ready ? '<button class="btn link" id="vsRm" style="color:var(--danger);margin-top:6px">Remove key</button>' : '')
          : '<p>Ask an admin to connect fal.ai.</p>') +
        '<p class="muted" style="font-size:13px;margin-top:10px">This month: <b>' + gbp(s.spentGbp) + '</b> of <b>£' + s.capGbp + '</b> (estimated).</p>' +
        '<div class="err hidden" id="vsErr"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="vsX">Close</button>' + (s.isAdmin ? '<button class="btn primary" id="vsSave">Save</button>' : '') + '</div>');
      $('#vsX', sh).onclick = function () { sh.remove(); };
      if (!s.isAdmin) return;
      var rm = $('#vsRm', sh); if (rm) rm.onclick = async function () { if (!confirm('Remove the fal.ai key?')) return; ST = (await X.api('vm-settings-save', { settings: { removeKey: true } })).settings; sh.remove(); if (onDone) onDone(); };
      $('#vsSave', sh).onclick = async function () {
        var models = {}; s.tiers.forEach(function (t) { models[t.id] = $('#vsM' + t.id, sh).value.trim(); });
        try { ST = (await X.api('vm-settings-save', { settings: { falKey: $('#vsKey', sh).value.trim(), capGbp: +$('#vsCap', sh).value, voice: $('#vsVoice', sh).value, models: models } })).settings; X.toast('Saved ✅'); sh.remove(); if (onDone) onDone(); }
        catch (x) { var e = $('#vsErr', sh); e.textContent = x.message; e.classList.remove('hidden'); }
      };
    }, function (x) { X.toast(x.message); });
  }

  // ════════ the Make tab ════════
  function html(p) {
    return '<div id="vmRoot"><div class="card"><p class="muted">Loading…</p></div></div>';
  }
  function wire(pane, p, X) {
    var root = $('#vmRoot', pane), polling = 0, busy = false;
    p.make = p.make || {}; var m = p.make;
    m.tier = m.tier || 'budget'; m.clips = m.clips || {}; m.vo = m.vo || {}; if (m.music === undefined) m.music = true; m.voSource = m.voSource || 'ai'; m.customVoices = m.customVoices || [];
    if (!m.musicPrompt) m.musicPrompt = [p.plan.music.mood, p.plan.music.bpm ? p.plan.music.bpm + ' BPM' : '', (p.plan.music.search || [])[0]].filter(Boolean).join(', ');
    if (m.musicVol == null) m.musicVol = 0.22; if (m.captions === undefined) m.captions = true; if (m.endCard === undefined) m.endCard = true;
    loadSettings(X.api).then(function () { m.voice = m.voice || ST.voice; paint(); }, function (x) { root.innerHTML = '<div class="err">' + X.esc(x.message) + '</div>'; });

    function scenes() { return p.plan.scenes; }
    function frame(i) { return p.frames && p.frames[String(i)]; }
    function stepState() {
      var n = scenes().length, pics = scenes().filter(function (_, i) { return frame(i); }).length;
      var clips = scenes().filter(function (_, i) { return m.clips[i] && m.clips[i].url; }).length, pending = scenes().filter(function (_, i) { return m.clips[i] && !m.clips[i].url && !m.clips[i].error && m.clips[i].statusUrl; }).length;
      var own = m.voSource === 'own', voNeed = scenes().filter(function (s) { return s.vo; }).length, vo = own && m.voFull ? voNeed : scenes().filter(function (s, i) { return s.vo && m.vo[i] && (own ? m.vo[i].aid : m.vo[i].url); }).length;
      return { n: n, pics: pics, clips: clips, pending: pending, voNeed: voNeed, vo: vo, music: !m.music || !!(m.musicJob && m.musicJob.url), musicPending: m.music && m.musicJob && !m.musicJob.url && !m.musicJob.error, char: !needsChar(p) || !!m.charImg };
    }
    function tick(ok, pending) { return ok ? '✅' : pending ? '⏳' : '◻️'; }
    function paint() {
      var esc = X.esc, s = ST, e = estimate(p, m.tier), st = stepState();
      if (!s.ready) {
        root.innerHTML = '<div class="card"><b>🔌 Connect fal.ai to make videos</b><p class="muted" style="margin:6px 0 10px">fal.ai runs the same video models Dzine uses (Kling, Veo…). One-time setup by an admin: create an account, add credit, paste the API key.</p><button class="btn primary" id="vmSet">⚙️ Video AI settings</button></div>';
        $('#vmSet', root).onclick = function () { settingsSheet(X, paint); }; return;
      }
      var left = Math.max(0, s.capGbp - s.spentGbp);
      root.innerHTML =
        '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b>🎬 Make the whole video</b><button class="btn link" id="vmSet">⚙️ Settings</button></div>' +
        '<div class="lbl">Quality</div><div class="chipbar" id="vmTier">' + s.tiers.map(function (t) { return '<button class="chip" data-v="' + t.id + '" aria-pressed="' + (t.id === m.tier) + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
        '<div class="lbl">Voiceover</div><div class="chipbar" id="vmSrc"><button class="chip" data-v="ai" aria-pressed="' + (m.voSource !== 'own') + '">🤖 AI voice</button><button class="chip" data-v="own" aria-pressed="' + (m.voSource === 'own') + '">🎤 My own voice</button></div>' +
        (m.voSource !== 'own' ? '<div class="row" style="gap:8px;align-items:flex-end;margin-top:6px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><label for="vmVoice">Voice</label><select id="vmVoice">' +
            m.customVoices.map(function (v) { return '<option value="' + v + '"' + (v === m.voice ? ' selected' : '') + '>⭐ My ElevenLabs voice (' + v.slice(0, 6) + '…)</option>'; }).join('') +
            s.voices.map(function (v) { return '<option value="' + v + '"' + (v === m.voice ? ' selected' : '') + '>' + v + (VOICE_INFO[v] ? ' — ' + VOICE_INFO[v] : '') + '</option>'; }).join('') + '</select></div>' +
            '<button class="btn ghost sm" id="vmPrev">▶ Preview</button></div>' +
            '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:13.5px;font-weight:700">⭐ Use a voice from the ElevenLabs Voice Library (e.g. a Nigerian accent)</summary><p class="muted" style="font-size:13px;margin:6px 0">On elevenlabs.io → Voices → Voice Library, find a voice you like → “Copy voice ID” → paste it here and tap Test.</p><div class="row" style="gap:8px"><input id="vmVid" placeholder="Voice ID, e.g. 21m00Tcm4TlvDq8ikWAM" style="flex:1"><button class="btn ghost sm" id="vmVidTest">Test</button></div><div class="muted" id="vmVidMsg" style="font-size:13px;margin-top:4px"></div></details>'
          : '<p class="muted" style="font-size:13px;margin:6px 0 0">Record or upload your own voiceover in step 4 — one clip per scene (best for timing) or one file for the whole ad. Free.</p>') +
        '<div style="margin-top:8px">' +
        '<div><label>Music</label><div class="chipbar" id="vmMus"><button class="chip" data-v="1" aria-pressed="' + !!m.music + '">🎵 AI music</button><button class="chip" data-v="0" aria-pressed="' + !m.music + '">🔇 No music</button></div></div></div>' +
        (m.music ? '<label for="vmMP" style="margin-top:6px">Music style</label><input id="vmMP" value="' + esc(m.musicPrompt) + '"><label for="vmMV">Music volume</label><input type="range" id="vmMV" min="5" max="60" value="' + Math.round(m.musicVol * 100) + '">' : '') +
        '<div class="row" style="gap:16px;margin-top:8px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="vmCap"' + (m.captions ? ' checked' : '') + '> Subtitles</label><label class="chk"><input type="checkbox" id="vmEnd"' + (m.endCard ? ' checked' : '') + '> End card with call to action</label></div>' +
        '<div class="note" style="margin-top:10px">Estimated cost still to spend: <b>' + gbp(e.total) + '</b> <span class="muted">(clips ' + gbp(e.clips) + ' · pictures ' + gbp(e.pics) + ' · voice ' + gbp(e.vo) + ' · music ' + gbp(e.music) + ')</span><br>This month: ' + gbp(s.spentGbp) + ' of £' + s.capGbp + ' — ' + gbp(left) + ' left.</div>' +
        '<button class="btn primary" id="vmAll" style="width:100%;margin-top:10px"' + (busy ? ' disabled' : '') + '>⚡ Make everything</button></div>' +
        // steps
        '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.char) + ' 1 · Main character</b>' + (needsChar(p) ? '<span class="apact"><button class="btn ghost sm" id="vmChar">' + (m.charImg ? '🔄 Redo' : '🎨 Create') + '</button><label class="btn ghost sm" style="margin:0">📷 Upload<input type="file" accept="image/*" id="vmCharUp" hidden></label></span>' : '<span class="muted">Not needed</span>') + '</div>' +
          (m.charImg ? '<img src="' + X.frameSrc(m.charImg) + '" class="vmchar" alt="Character">' : (needsChar(p) ? '<p class="muted" style="font-size:13px">Made from the character-sheet prompt, then used in every scene so the person looks the same.</p>' : '')) + '</div>' +
        '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.pics === st.n) + ' 2 · Start pictures (' + st.pics + '/' + st.n + ')</b><button class="btn ghost sm" id="vmPics">🎨 Create missing</button></div>' +
          '<div class="vmgrid">' + scenes().map(function (sc, i) { var f = frame(i); return '<div class="vmcell">' + (f ? '<img src="' + X.frameSrc(f) + '" alt="">' : '<span>' + (i + 1) + '</span>') + '</div>'; }).join('') + '</div></div>' +
        '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.clips === st.n, st.pending) + ' 3 · Video clips (' + st.clips + '/' + st.n + ')</b><button class="btn ghost sm" id="vmClips">🎬 Make missing clips</button></div>' +
          scenes().map(function (sc, i) {
            var c = m.clips[i] || {};
            var state = c.url ? '✅ Ready' : c.error ? '⚠️ ' + esc(c.error) : c.statusUrl ? '⏳ ' + (c.status === 'IN_PROGRESS' ? 'Making…' : 'Waiting in line…') : frame(i) ? '◻️ Not started' : '◻️ Needs a start picture';
            return '<div class="vmrow"><div class="vmthumb">' + (c.url ? '<video src="' + esc(c.url) + '" muted loop playsinline preload="metadata" crossorigin="anonymous"></video>' : frame(i) ? '<img src="' + X.frameSrc(frame(i)) + '" alt="">' : '') + '</div>' +
              '<div style="flex:1;min-width:0"><b>' + (i + 1) + '. ' + esc(sc.title) + '</b> <span class="muted">· ' + sc.seconds + 's</span><div class="muted" style="font-size:13px">' + state + '</div></div>' +
              '<button class="btn ghost sm" data-redo="' + i + '"' + (frame(i) ? '' : ' disabled') + '>' + (c.url || c.error ? '🔄 Redo' : '🎬 Make') + '</button></div>';
          }).join('') + '</div>' +
        (m.voSource === 'own'
          ? '<div class="card vmstep"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>' + tick(st.vo === st.voNeed) + ' 4 · Your voiceover' + (m.voFull ? ' (one file)' : ' (' + st.vo + '/' + st.voNeed + ')') + '</b><span class="apact"><label class="btn ghost sm" style="margin:0">📁 One file for the whole ad<input type="file" accept="audio/*" id="vmFull" hidden></label></span></div>' +
            (m.voFull ? '<div class="vmrow"><div style="flex:1;font-size:13.5px">🎧 One recording for the whole ad — it starts at the beginning of the video.</div><audio controls preload="none" src="' + voUrl({ aid: m.voFull }) + '"></audio><button class="btn link" id="vmFullX">✖</button></div>'
              : '<p class="muted" style="font-size:13px;margin:4px 0">Tap 🎙️ Record and read the line (keep it about the scene length), or upload a file.</p>' + scenes().map(function (sc, i) {
                if (!sc.vo) return ''; var v = m.vo[i] && m.vo[i].aid ? m.vo[i] : null;
                return '<div class="vmrow"><div style="flex:1;font-size:13.5px"><b>' + (i + 1) + '.</b> ' + esc(sc.vo) + ' <span class="muted">· ' + sc.seconds + 's</span></div>' + (v ? '<audio controls preload="none" src="' + voUrl(v) + '"></audio>' : '') +
                  '<button class="btn ghost sm" data-rec="' + i + '">🎙️ ' + (v ? 'Re-record' : 'Record') + '</button><label class="btn ghost sm" style="margin:0">📁<input type="file" accept="audio/*" data-upa="' + i + '" hidden></label></div>';
              }).join('')) + '</div>'
          : '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.vo === st.voNeed) + ' 4 · Voiceover (' + st.vo + '/' + st.voNeed + ')</b><button class="btn ghost sm" id="vmVo">🎙️ Make voiceover</button></div>' +
            scenes().map(function (sc, i) { if (!sc.vo) return ''; var v = m.vo[i] && m.vo[i].url ? m.vo[i] : null; return '<div class="vmrow"><div style="flex:1;font-size:13.5px"><b>' + (i + 1) + '.</b> ' + esc(sc.vo) + (v && v.text !== sc.vo ? ' <span class="muted">(text changed — remake)</span>' : '') + '</div>' + (v ? '<audio controls preload="none" src="' + esc(v.url) + '" crossorigin="anonymous"></audio>' : '') + '</div>'; }).join('') + '</div>') +
        (m.music ? '<div class="card vmstep"><div class="row" style="justify-content:space-between"><b>' + tick(st.music, st.musicPending) + ' 5 · Background music</b><button class="btn ghost sm" id="vmMusic">' + (m.musicJob && (m.musicJob.url || m.musicJob.error) ? '🔄 Redo' : '🎵 Make music') + '</button></div>' +
          (m.musicJob && m.musicJob.url ? '<audio controls preload="none" src="' + esc(m.musicJob.url) + '" crossorigin="anonymous" style="width:100%"></audio>' : m.musicJob && m.musicJob.error ? '<div class="muted">⚠️ ' + esc(m.musicJob.error) + '</div>' : m.musicJob ? '<div class="muted">⏳ Making the music…</div>' : '') + '</div>' : '') +
        '<div class="card vmstep"><b>' + (m.music ? '6' : '5') + ' · ✂️ Edit & export</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Joins the clips, trims each to its scene, adds transitions, on-screen text' + (m.captions ? ', subtitles' : '') + (m.endCard ? ', the end card' : '') + ', voice' + (m.music ? ' and music' : '') + ' — then saves an MP4. Scenes without a clip use their start picture with a slow zoom.</p>' +
          '<button class="btn primary" id="vmRender" style="width:100%">🎬 Make the final video</button>' +
          '<div id="vmProg" class="hidden" style="margin-top:10px"><div class="muted" id="vmProgT" style="font-size:13px"></div><div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:4px"><div id="vmProgB" style="height:100%;width:0;background:var(--green)"></div></div></div>' +
          '<div id="vmOut"></div></div>';
      // wiring
      $('#vmSet', root).onclick = function () { settingsSheet(X, function () { loadSettings(X.api, true).then(paint); }); };
      $$('#vmTier [data-v]', root).forEach(function (b) { b.onclick = function () { m.tier = b.dataset.v; X.mark(); paint(); }; });
      $$('#vmSrc [data-v]', root).forEach(function (b) { b.onclick = function () { m.voSource = b.dataset.v; X.mark(); paint(); }; });
      if ($('#vmVoice', root)) $('#vmVoice', root).onchange = function () { m.voice = this.value; X.mark(); };
      if ($('#vmPrev', root)) $('#vmPrev', root).onclick = function () { preview(this, $('#vmVoice', root).value); };
      if ($('#vmVidTest', root)) $('#vmVidTest', root).onclick = async function () {
        var id = $('#vmVid', root).value.trim(), msg = $('#vmVidMsg', root);
        if (!/^[A-Za-z0-9]{16,40}$/.test(id)) { msg.textContent = 'That doesn’t look like a voice ID — it’s about 20 letters and numbers.'; return; }
        this.disabled = true; msg.textContent = '⏳ Testing…';
        try { var url = await sample(id); msg.textContent = '✅ It works — now selected.'; new Audio(url).play().catch(function () {}); if (m.customVoices.indexOf(id) < 0) m.customVoices.unshift(id); m.voice = id; X.mark(); setTimeout(paint, 1200); }
        catch (x) { msg.textContent = '⚠️ ' + x.message + ' — this voice may not be available through fal.ai. Try another, or use your own voice.'; }
        this.disabled = false;
      };
      $$('[data-rec]', root).forEach(function (b) { b.onclick = function () { record(+b.dataset.rec, b); }; });
      $$('[data-upa]', root).forEach(function (inp) { inp.onchange = async function () { var f = inp.files && inp.files[0]; if (!f) return; try { var aid = await saveAudio(f); m.vo[+inp.dataset.upa] = { aid: aid, text: scenes()[+inp.dataset.upa].vo }; X.mark(); paint(); } catch (x) { X.toast(x.message); } }; });
      if ($('#vmFull', root)) $('#vmFull', root).onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { m.voFull = await saveAudio(f); X.mark(); paint(); } catch (x) { X.toast(x.message); } };
      if ($('#vmFullX', root)) $('#vmFullX', root).onclick = function () { m.voFull = ''; X.mark(); paint(); };
      $$('#vmMus [data-v]', root).forEach(function (b) { b.onclick = function () { m.music = b.dataset.v === '1'; X.mark(); paint(); }; });
      if ($('#vmMP', root)) $('#vmMP', root).oninput = function () { m.musicPrompt = this.value; X.mark(); };
      if ($('#vmMV', root)) $('#vmMV', root).oninput = function () { m.musicVol = this.value / 100; X.mark(); };
      $('#vmCap', root).onchange = function () { m.captions = this.checked; X.mark(); };
      $('#vmEnd', root).onchange = function () { m.endCard = this.checked; X.mark(); };
      if ($('#vmChar', root)) $('#vmChar', root).onclick = function () { run(this, makeChar); };
      if ($('#vmCharUp', root)) $('#vmCharUp', root).onchange = async function () { var f = this.files && this.files[0]; if (!f) return; try { var d = await X.shrink(f); m.charImg = (await X.api('app-img', { image: d })).imgId; X.mark(); paint(); } catch (x) { X.toast(x.message); } };
      $('#vmPics', root).onclick = function () { run(this, makePics); };
      $('#vmClips', root).onclick = function () { run(this, function () { return makeClips(false); }); };
      $$('[data-redo]', root).forEach(function (b) { b.onclick = function () { var i = +b.dataset.redo; if ((m.clips[i] && m.clips[i].url) && !confirm('Make scene ' + (i + 1) + ' again? (costs about ' + gbp(clipLen(m.tier, scenes()[i].seconds) * rate(m.tier)) + ')')) return; run(b, function () { return makeClip(i); }); }; });
      if ($('#vmVo', root)) $('#vmVo', root).onclick = function () { run(this, makeVoice); };
      if ($('#vmMusic', root)) $('#vmMusic', root).onclick = function () { run(this, makeMusic); };
      $('#vmRender', root).onclick = function () { render(this); };
      $('#vmAll', root).onclick = function () { run(this, everything); };
      $$('.vmthumb video', root).forEach(function (v) { v.onmouseenter = function () { v.play().catch(function () {}); }; v.onmouseleave = function () { v.pause(); }; v.onclick = function () { v.paused ? v.play() : v.pause(); }; });
      if ((st.pending || st.musicPending) && !polling) poll();
    }
    async function run(btn, fn) {
      if (busy) return; busy = true; var keep = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Working…';
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
    async function makeChar() {
      var lb = p.plan.lookbook, prompt = (lb.characterSheetPrompt || ('Full-body portrait of ' + lb.character)) + '. Wardrobe: ' + lb.wardrobe + '. Single person, full body, facing camera, plain light-grey studio background, ' + (lb.style || 'photorealistic');
      var r = await X.api('app-picture', { kind: 'frame', prompt: prompt, aspect: '9:16' });
      m.charImg = (await X.api('app-img', { image: await X.shrink(r.image) })).imgId; X.mark();
    }
    async function makePics() {
      if (needsChar(p) && !m.charImg) await makeChar();
      for (var i = 0; i < scenes().length; i++) {
        if (frame(i)) continue; var sc = scenes()[i];
        if (!sc.imagePrompt) continue;
        var r = await X.api('app-picture', { kind: 'frame', prompt: sc.imagePrompt + (p.plan.lookbook.style ? ' Style: ' + p.plan.lookbook.style + '.' : ''), aspect: X.aspect(p), refImgId: sc.character ? m.charImg : '' });
        p.frames[String(i)] = (await X.api('app-img', { image: await X.shrink(r.image) })).imgId; X.mark(); paint();
      }
    }
    async function makeClip(i) {
      var sc = scenes()[i]; if (!frame(i)) throw new Error('Scene ' + (i + 1) + ' needs a start picture first.');
      var r = await X.api('vm-clip', { tier: m.tier, imgId: frame(i), prompt: sc.videoPrompt || sc.visual, seconds: sc.seconds, negative: p.plan.lookbook.negative, aspect: X.aspect(p) });
      m.clips[i] = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '' }); X.mark(); paint(); poll();
    }
    async function makeClips(onlyMissing) {
      for (var i = 0; i < scenes().length; i++) { var c = m.clips[i]; if (c && (c.url || (c.statusUrl && !c.error))) continue; if (!frame(i)) continue; await makeClip(i); }
    }
    async function makeVoice() {
      for (var i = 0; i < scenes().length; i++) {
        var sc = scenes()[i]; if (!sc.vo) continue; if (m.vo[i] && m.vo[i].text === sc.vo) continue;
        var r = await X.api('vm-tts', { text: sc.vo, voice: m.voice }); m.vo[i] = { url: r.url, text: sc.vo }; X.mark(); paint();
      }
    }
    async function makeMusic() {
      var total = scenes().reduce(function (n, s) { return n + (Number(s.seconds) || 0); }, 0) + (m.endCard ? END : 0);
      var r = await X.api('vm-music', { prompt: m.musicPrompt, seconds: Math.ceil(total) + 2 }); m.musicJob = Object.assign({}, r.job, { status: 'IN_QUEUE', url: '', error: '' }); X.mark(); paint(); poll();
    }
    async function everything() {
      await makePics(); await makeClips(true); if (m.voSource !== 'own') await makeVoice();
      if (m.music && !(m.musicJob && (m.musicJob.url || (m.musicJob.statusUrl && !m.musicJob.error)))) await makeMusic();
      X.toast('Clips are being made — the final video can be made when they’re ready ✅');
    }
    function poll() {
      clearTimeout(polling);
      polling = setTimeout(async function () {
        polling = 0; if (!document.body.contains(root)) return;
        var jobs = [], refs = [];
        Object.keys(m.clips).forEach(function (k) { var c = m.clips[k]; if (c && c.statusUrl && !c.url && !c.error) { jobs.push(c); refs.push(c); } });
        if (m.music && m.musicJob && m.musicJob.statusUrl && !m.musicJob.url && !m.musicJob.error) { jobs.push(m.musicJob); refs.push(m.musicJob); }
        if (!jobs.length) return;
        try {
          var r = await X.api('vm-status', { jobs: jobs.map(function (j) { return { statusUrl: j.statusUrl, responseUrl: j.responseUrl }; }) });
          var changed = false;
          r.results.forEach(function (res, k) { var j = refs[k]; if (res.status === 'COMPLETED') { j.url = res.url; j.status = 'COMPLETED'; changed = true; } else if (res.status === 'ERROR') { j.error = res.error || 'Failed'; changed = true; } else if (j.status !== res.status) { j.status = res.status; changed = true; } });
          if (changed) { X.mark(); if (!busy) paint(); }
        } catch (x) { /* try again next time */ }
        poll();
      }, 6000);
    }
    // ── final edit ──
    async function render(btn) {
      var prog = function (f, t) { $('#vmProg', root).classList.remove('hidden'); $('#vmProgT', root).textContent = t; $('#vmProgB', root).style.width = Math.round(f * 100) + '%'; };
      btn.disabled = true;
      try {
        var out = await composeVideo(p, m, X, prog);
        var url = URL.createObjectURL(out.blob);
        $('#vmOut', root).innerHTML = '<video src="' + url + '" controls playsinline style="width:100%;max-width:320px;display:block;margin:10px auto;border-radius:10px"></video><a class="btn primary" style="width:100%;text-align:center" href="' + url + '" download="' + X.slug() + '.' + out.ext + '">⬇️ Download the video</a>';
        prog(1, out.ok ? 'Done ✅ — your video is ready.' : 'Done — but this browser made a format Instagram may not accept. For Instagram-ready MP4 use Chrome or Edge on a laptop.');
        if (p.status === 'scripted' || p.status === 'generating' || p.status === 'idea') { p.status = 'editing'; X.mark(); }
      } catch (x) { prog(0, '⚠️ ' + (x.message || 'Couldn’t make the video.')); }
      btn.disabled = false;
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
  function cover(c, el, w, h, zoom) {
    var iw = el.videoWidth || el.naturalWidth, ih = el.videoHeight || el.naturalHeight; if (!iw) return;
    var k = Math.max(w / iw, h / ih) * (zoom || 1); c.drawImage(el, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k);
  }
  function wrap(c, text, maxW) { var words = String(text || '').split(/\s+/), lines = [], l = ''; words.forEach(function (w) { var t = l ? l + ' ' + w : w; if (c.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }); if (l) lines.push(l); return lines; }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function overlays(c, w, h, s, t, m) {
    if (s.onScreen) {
      var p = Math.min(1, t / 0.3), sz = Math.round(w * 0.072), bounce = 1 + 0.12 * Math.sin(Math.min(1, t / 0.3) * Math.PI);
      c.save(); c.globalAlpha = p; c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif'; c.textAlign = 'center';
      var lines = wrap(c, s.onScreen, w * 0.82), y0 = h * 0.2;
      c.translate(w / 2, y0); c.scale(bounce, bounce); c.translate(-w / 2, -y0);
      lines.forEach(function (ln, k) { var lw = c.measureText(ln).width, y = y0 + k * sz * 1.22; c.fillStyle = '#FFFFFF'; rr(c, w / 2 - lw / 2 - sz * 0.3, y - sz * 0.92, lw + sz * 0.6, sz * 1.18, sz * 0.22); c.fill(); c.fillStyle = '#0F1E36'; c.fillText(ln, w / 2, y); });
      c.restore();
    }
    if (m.captions && s.vo) {
      // words appear in chunks of ~4 as the line is spoken
      var words = s.vo.replace(/\[pause\]/gi, '').split(/\s+/).filter(Boolean), dur = Math.max(1, Number(s.seconds) || 3), per = dur / Math.max(1, Math.ceil(words.length / 4));
      var chunk = Math.min(Math.ceil(words.length / 4) - 1, Math.floor(t / per)), txt = words.slice(chunk * 4, chunk * 4 + 4).join(' ');
      var fs = Math.round(w * 0.058); c.font = '800 ' + fs + 'px "Poppins","DM Sans",sans-serif'; c.textAlign = 'center';
      var lw2 = c.measureText(txt).width, yb = h * 0.78;
      c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, w / 2 - lw2 / 2 - fs * 0.4, yb - fs * 0.95, lw2 + fs * 0.8, fs * 1.35, fs * 0.3); c.fill();
      c.fillStyle = '#FFD25E'; c.fillText(txt, w / 2, yb);
    }
  }
  function endCard(c, w, h, p, t) {
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#057A44'); g.addColorStop(1, '#0F1E36'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    var a = Math.min(1, t / 0.4); c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = '#FFFFFF';
    var name = p.brief.forWho === 'auntietobi' ? 'Auntie Tobi' : (p.brief.business || ''), sz = Math.round(w * 0.085);
    c.font = '800 ' + sz + 'px "Poppins","DM Sans",sans-serif'; wrap(c, name, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, h * 0.36 + k * sz * 1.15); });
    var cta = p.plan.post.endCard || p.plan.strategy.cta || ''; var fs = Math.round(w * 0.05);
    c.font = '700 ' + fs + 'px "DM Sans",sans-serif'; c.fillStyle = '#FFB81C';
    var lines = wrap(c, cta, w * 0.8), y = h * 0.52; lines.forEach(function (ln, k) { c.fillText(ln, w / 2, y + k * fs * 1.3); });
    var contact = p.brief.forWho === 'auntietobi' ? 'auntietobi.co.uk · @auntietobi_uk' : (p.brief.contact || p.brief.link || '');
    if (contact) { c.font = '600 ' + Math.round(w * 0.036) + 'px "DM Sans",sans-serif'; c.fillStyle = 'rgba(255,255,255,.9)'; wrap(c, contact, w * 0.84).forEach(function (ln, k) { c.fillText(ln, w / 2, h * 0.7 + k * w * 0.05); }); }
    c.restore();
  }
  async function mixAudio(p, m, total, prog) {
    function voUrl(v) { return v ? (v.aid ? '/.netlify/functions/studio-hq?vaudio=' + encodeURIComponent(v.aid) : v.url) : ''; }
    var AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return null;
    var rateHz = 48000, ctx = new AC(2, Math.ceil(total * rateHz), rateHz), starts = [], t = 0;
    p.plan.scenes.forEach(function (s) { starts.push(t); t += Number(s.seconds) || 0; });
    async function buf(url) { var r = await fetch(url); if (!r.ok) throw new Error('Audio couldn’t be loaded — it may have expired. Remake it.'); return ctx.decodeAudioData(await r.arrayBuffer()); }
    var voWindows = [];
    // gentle limiter so loud recordings never distort
    var out = ctx.createDynamicsCompressor(); out.threshold.value = -6; out.knee.value = 6; out.ratio.value = 12; out.attack.value = 0.003; out.release.value = 0.2; out.connect(ctx.destination);
    var own = m.voSource === 'own';
    if (own && m.voFull) {
      prog && prog(0.03, 'Loading your voiceover…');
      var fb = await buf(voUrl({ aid: m.voFull })), fs = ctx.createBufferSource(); fs.buffer = fb; fs.connect(out); fs.start(0.1); voWindows.push([0.1, 0.1 + fb.duration]);
    } else {
      var keys = Object.keys(m.vo || {});
      for (var k = 0; k < keys.length; k++) {
        var i = +keys[k], v = m.vo[keys[k]]; if (!v || !p.plan.scenes[i] || (own ? !v.aid : !v.url)) continue;
        prog && prog(0.02 + 0.03 * k / keys.length, 'Loading the voiceover…');
        var b = await buf(voUrl(v)), src = ctx.createBufferSource(); src.buffer = b; var gn = ctx.createGain(); gn.gain.value = own ? 1.15 : 1; src.connect(gn).connect(out);
        var at = starts[i] + 0.1; src.start(at); voWindows.push([at, at + b.duration]);
      }
    }
    if (m.music && m.musicJob && m.musicJob.url) {
      prog && prog(0.06, 'Loading the music…');
      var mb = await buf(m.musicJob.url), ms = ctx.createBufferSource(); ms.buffer = mb; ms.loop = mb.duration < total; var mg = ctx.createGain(), vol = m.musicVol == null ? 0.22 : m.musicVol;
      mg.gain.setValueAtTime(0, 0); mg.gain.linearRampToValueAtTime(vol, 0.6);
      voWindows.forEach(function (w) { mg.gain.setValueAtTime(vol, Math.max(0.6, w[0] - 0.15)); mg.gain.linearRampToValueAtTime(vol * 0.45, w[0]); mg.gain.setValueAtTime(vol * 0.45, w[1]); mg.gain.linearRampToValueAtTime(vol, w[1] + 0.3); });
      mg.gain.setValueAtTime(vol, Math.max(0, total - 1.2)); mg.gain.linearRampToValueAtTime(0, total);
      ms.connect(mg).connect(out); ms.start(0);
    }
    if (!voWindows.length && !(m.music && m.musicJob && m.musicJob.url)) return null;
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
    var W = 1080, H = X.aspect(p) === '4:5' ? 1350 : 1920, scenes = p.plan.scenes;
    var durs = scenes.map(function (s) { return Math.max(1, Number(s.seconds) || 3); }), starts = [], tt = 0; durs.forEach(function (d) { starts.push(tt); tt += d; });
    var total = tt + (m.endCard ? END : 0);
    prog(0.01, 'Loading the clips…');
    var media = [];
    for (var i = 0; i < scenes.length; i++) {
      var c = m.clips && m.clips[i];
      if (c && c.url) media.push({ v: await loadVideo(c.url) });
      else { var f = p.frames && p.frames[String(i)]; media.push({ img: f ? await loadImg(X.frameSrc(f)) : null }); }
    }
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
      else if (md.img) cover(ctx, md.img, W, H, 1 + 0.08 * t / durs[i]);
      overlays(ctx, W, H, scenes[i], t, m);
    }
    var frames = Math.round(total * FPS), TR = 0.25;
    for (var fI = 0; fI < frames; fI++) {
      if (failed) throw failed;
      var T = fI / FPS;
      if (T >= tt) endCard(cx, W, H, p, T - tt);
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

  window.HQVmake = { html: html, wire: wire, settingsSheet: settingsSheet, composeVideo: composeVideo };
})();
