/*
 * Auntie Tobi app — 📺 Video quizzes.
 * Plays a quiz video that Auntie Tobi published from HQ, the same way it looks on Instagram (picture, voice, music, the
 * answers appearing one by one) — but it waits for you to tap your answer, then shows the right one and why.
 * Answers count towards your Life in the UK / Driving Theory progress (hooks.answer), like normal practice.
 *
 *   QuizPlay.count(bank)            → Promise<number of published quizzes>
 *   QuizPlay.browse(bank, hooks)    → full-screen list of quizzes for that test
 *   QuizPlay.play(id, hooks)        → play one
 *   hooks: { answer(qid, ok), done(n, ok, name), practice(), name: 'Life in the UK Test' }
 */
(function () {
  'use strict';
  var API = '/.netlify/functions/app-content', LIST = {}, SND = 'atQuizSound';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, Object.assign({ event_category: 'video_quiz' }, p || {})); } catch (x) {} }
  function soundOn() { try { return localStorage.getItem(SND) !== '0'; } catch (e) { return true; } }
  function setSound(v) { try { localStorage.setItem(SND, v ? '1' : '0'); } catch (e) {} }
  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  // which video quizzes this person has finished (on this phone)
  var DONE = 'qp-done-v1';
  function doneSet() { try { return JSON.parse(localStorage.getItem(DONE) || '{}') || {}; } catch (e) { return {}; } }
  function markDone(id) { try { var d = doneSet(); d[id] = 1; var k = Object.keys(d); if (k.length > 300) delete d[k[0]]; localStorage.setItem(DONE, JSON.stringify(d)); } catch (e) {} }
  function list(bank) {
    if (!LIST[bank]) LIST[bank] = fetch(API + '?vq=list&bank=' + bank).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (j) { return j.items || []; }).catch(function () { delete LIST[bank]; return []; });
    return LIST[bank];
  }
  function count(bank) { return list(bank).then(function (l) { return l.length; }); }

  // ───── styles ─────
  function css() {
    if ($('#qpCss')) return; var st = document.createElement('style'); st.id = 'qpCss';
    st.textContent = '.qp-wrap{position:fixed;inset:0;z-index:2147483000;background:#05070B;display:flex;align-items:center;justify-content:center;font-family:"Plus Jakarta Sans",system-ui,sans-serif;-webkit-tap-highlight-color:transparent}' +
      '.qp-stage{position:relative;width:min(100vw,calc(100dvh*0.5625));height:min(100dvh,calc(100vw*1.7778));overflow:hidden;background:#0F1E36;container-type:size;color:#fff}' +
      '@media (max-width:699px){.qp-stage{width:100vw;height:100dvh}}.qp-sc:empty{display:none}' +
      '@media (min-width:700px){.qp-stage{border-radius:22px;height:min(94dvh,calc(100vw*1.7778));width:min(100vw,calc(94dvh*0.5625))}}' +
      '.qp-bg{position:absolute;inset:-6%;background:#0F1E36 center/cover no-repeat;transition:opacity .45s ease}.qp-bg.kb{animation:qpKb 14s ease-out forwards}.qp-bg.kb2{animation:qpKb2 14s ease-out forwards}' +
      '@keyframes qpKb{from{transform:scale(1.02)}to{transform:scale(1.12)}}@keyframes qpKb2{from{transform:scale(1.12)}to{transform:scale(1.02)}}' +
      '.qp-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,.25) 30%,rgba(0,0,0,.2) 60%,rgba(0,0,0,.62) 100%)}' +
      '.qp-ui{position:absolute;inset:0;display:flex;flex-direction:column;padding:3cqh 5cqw 3cqh}' +
      '.qp-bar{display:flex;align-items:center;gap:2cqw}.qp-ic{width:10cqw;height:10cqw;max-width:46px;max-height:46px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;font-size:4.6cqw;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}' +
      '.qp-sc{margin-left:auto;background:rgba(0,0,0,.45);border-radius:999px;padding:1.2cqw 3.4cqw;font-weight:700;font-size:3.6cqw}' +
      '.qp-h1,.qp-h2{text-align:center;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.6);line-height:1.15}.qp-h1{font-size:5.8cqw;margin-top:2cqh}.qp-h2{font-size:5cqw;margin-top:.6cqh}' +
      '.qp-body{flex:1;display:flex;flex-direction:column;min-height:0;overflow-y:auto;scrollbar-width:none}.qp-body::-webkit-scrollbar{display:none}' +
      '.qp-chip{align-self:center;background:rgba(0,0,0,.6);border-radius:999px;padding:1cqw 4.4cqw;font-weight:700;font-size:3.6cqw;margin:2.2cqh 0 1.6cqh}' +
      '.qp-q{font-family:"Playfair Display",Fraunces,Georgia,serif;font-weight:900;font-size:6.2cqw;line-height:1.22;text-align:center;text-shadow:0 3px 10px rgba(0,0,0,.75);opacity:0;transform:translateY(8px);transition:opacity .4s,transform .4s}.qp-q.in{opacity:1;transform:none}.qp-q em{font-style:normal;color:#3DDC6E}' +
      '.qp-opts{display:flex;flex-direction:column;gap:2.2cqw;margin-top:3.4cqh}' +
      '.qp-o{display:flex;align-items:center;gap:3cqw;width:100%;min-height:11cqw;border-radius:3.4cqw;border:.6cqw solid rgba(255,255,255,.85);background:rgba(10,12,16,.82);color:#fff;font:inherit;font-weight:700;font-size:4.2cqw;line-height:1.25;text-align:left;padding:2.2cqw 4cqw;cursor:pointer;opacity:0;transform:translateY(10px);transition:opacity .3s,transform .3s,background .2s,border-color .2s}' +
      '.qp-o.in{opacity:1;transform:none}.qp-o b{font-size:3.8cqw;flex:none;width:5cqw}.qp-o:disabled{cursor:default}.qp-o.ok{background:#19C94A;border-color:#B9F5C8}.qp-o.bad{background:#D8343A;border-color:#FFC9CB}.qp-o.dim{opacity:.5}' +
      '.qp-hint{text-align:center;font-size:3.4cqw;font-weight:600;opacity:.85;margin-top:2cqh;text-shadow:0 1px 6px rgba(0,0,0,.7)}' +
      '.qp-fb{margin-top:2.4cqh;background:rgba(255,255,255,.96);color:#0F1E36;border-radius:3.4cqw;padding:3cqw 4cqw;font-size:3.6cqw;line-height:1.45;animation:qpUp .35s ease}.qp-fb b{font-size:4.2cqw}.qp-fb.ok b{color:#057A44}.qp-fb.bad b{color:#B42318}' +
      '@keyframes qpUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
      '.qp-btn{display:block;width:100%;border:0;border-radius:3.4cqw;padding:3.4cqw;font:inherit;font-weight:800;font-size:4.4cqw;cursor:pointer;background:#FFB81C;color:#0F1E36;margin-top:2cqh}.qp-btn.g{background:#057A44;color:#fff}.qp-btn.w{background:rgba(255,255,255,.95);color:#0F1E36}' +
      '.qp-cov{text-wrap:balance;font-family:"Playfair Display",Fraunces,Georgia,serif;font-weight:900;font-size:10.5cqw;line-height:1.1;text-shadow:0 4px 16px rgba(0,0,0,.8);padding:0 2cqw}.qp-cs{display:inline-block;margin-top:2.4cqh;background:#FFB81C;color:#0F1E36;font-weight:800;font-size:4.2cqw;border-radius:999px;padding:1.6cqw 5cqw}' +
      '.qp-mid{flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center}.qp-big{font-family:"Playfair Display",Fraunces,Georgia,serif;font-weight:900;font-size:13cqw;text-shadow:0 3px 12px rgba(0,0,0,.7)}.qp-sub{font-weight:700;font-size:4.6cqw;margin-top:1.4cqh;text-shadow:0 2px 8px rgba(0,0,0,.7)}' +
      '.qp-list{position:fixed;inset:0;z-index:2147483000;background:#F7F4EC;overflow-y:auto;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#0F1E36}.qp-lin{max-width:560px;margin:0 auto;padding:16px 16px 40px}' +
      '.qp-lt{display:flex;align-items:center;gap:10px;margin-bottom:6px}.qp-lt button{border:0;background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
      '.qp-card{display:flex;gap:12px;align-items:center;width:100%;background:#fff;border:1.5px solid #ECE8DE;border-radius:16px;padding:10px;margin-top:10px;cursor:pointer;text-align:left;font:inherit;color:inherit}.qp-card:hover{border-color:#057A44}' +
      '.qp-th{width:62px;height:110px;border-radius:10px;background:#0F1E36 center/cover;flex:none;display:flex;align-items:center;justify-content:center;font-size:24px}.qp-card b{display:block;font-size:16px}.qp-card small{display:block;color:#6B7280;font-size:13px;margin-top:3px}.qp-card .pl{margin-left:auto;font-size:26px;flex:none}';
    document.head.appendChild(st);
  }

  // ───── list of quizzes ─────
  function browse(bank, hooks) {
    css(); hooks = hooks || {};
    var el = document.createElement('div'); el.className = 'qp-list'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Video quizzes');
    el.innerHTML = '<div class="qp-lin"><div class="qp-lt"><button type="button" id="qpLB">← Back</button></div><h2 style="font-family:Fraunces,Georgia,serif;margin:10px 0 2px">📺 Video quizzes</h2><div style="color:#6B7280;font-size:14px">' + esc(hooks.name || '') + ' · watch, listen and tap your answer. Your answers count towards your progress.</div><div id="qpLL" style="margin-top:6px;color:#6B7280">Loading…</div></div>';
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    var close = function () { el.remove(); document.body.style.overflow = ''; };
    $('#qpLB', el).onclick = close;
    list(bank).then(function (items) {
      var box = $('#qpLL', el); if (!items.length) { box.textContent = 'No video quizzes yet — check back soon!'; return; }
      box.innerHTML = items.map(function (it, i) { return '<button type="button" class="qp-card" data-q="' + esc(it.id) + '"><span class="qp-th" data-th="' + esc(it.id) + '">🎬</span><span><b>' + esc(it.name) + '</b><small>' + it.n + ' questions' + (it.voice ? ' · 🔊 with Auntie Tobi’s voice' : '') + (i === 0 ? ' · 🆕 newest' : '') + '</small></span><span class="pl">▶️</span></button>'; }).join('');
      [].slice.call(el.querySelectorAll('[data-q]')).forEach(function (b) { b.onclick = function () { play(b.dataset.q, Object.assign({}, hooks, { back: function () { } })); }; });
      // first picture of each quiz as its thumbnail
      items.slice(0, 20).forEach(function (it) { pack(it.id).then(function (p) { var q = p.qs.filter(function (x) { return x.img; })[0], im = p.cImg || (q && q.img), th = el.querySelector('[data-th="' + it.id + '"]'); if (im && th) { th.style.backgroundImage = 'url(' + API + '?vqi=' + encodeURIComponent(im) + ')'; th.textContent = ''; } }).catch(function () {}); });
    });
    gt('video_quiz_list', { label: bank });
  }
  var PACKS = {};
  function pack(id) { if (!PACKS[id]) PACKS[id] = fetch(API + '?vq=' + encodeURIComponent(id)).then(function (r) { if (!r.ok) throw new Error('gone'); return r.json(); }).catch(function (e) { delete PACKS[id]; throw e; }); return PACKS[id]; }

  // ───── sound: voice lines, built-in music, ding and buzz ─────
  function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function note(ctx, out, type, freq, at, len, vol, att, filt) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + (att || 0.01)); g.gain.setTargetAtTime(0.0001, at + Math.max(att || 0.01, len * 0.6), len / 3);
    if (filt) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(out); o.start(at); o.stop(at + len + 0.4);
  }
  function kick(ctx, out, at, vol) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28); o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.3); }
  function hat(ctx, out, at, vol) { var n = Math.round(ctx.sampleRate * 0.08), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05); s.connect(f); f.connect(g); g.connect(out); s.start(at); s.stop(at + 0.07); }
  function track(ctx, out, kind, dur) {   // the same built-in tracks as HQ's quiz videos
    var C = kind === 'suspense' ? [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]] : [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]];
    var bpm = kind === 'upbeat' ? 118 : kind === 'calm' ? 76 : 100, bt = 60 / bpm, bar = bt * 4;
    for (var b = 0; b * bar < dur - 0.01; b++) {
      var t0 = b * bar, ch = C[b % 4];
      if (kind === 'upbeat') {
        for (var k = 0; k < 4; k++) { var t = t0 + k * bt; kick(ctx, out, t, 0.55); hat(ctx, out, t + bt / 2, 0.12); }
        [0, 1.5, 2].forEach(function (x) { note(ctx, out, 'triangle', mf(ch[0]), t0 + x * bt, bt * 0.9, 0.32, 0.01); });
        [0.5, 1.5, 2.5, 3.5].forEach(function (x) { ch.slice(1).forEach(function (m) { note(ctx, out, 'square', mf(m), t0 + x * bt, 0.16, 0.035, 0.005, 2200); }); });
        if (b % 2 === 1) [ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12].forEach(function (m, i) { note(ctx, out, 'sine', mf(m), t0 + i * bt, bt * 0.8, 0.05, 0.01); });
      } else if (kind === 'calm') {
        ch.slice(1).forEach(function (m) { [0, 3].forEach(function (dt) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = mf(m); o.detune.value = dt; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.045, t0 + 0.8); g.gain.setValueAtTime(0.045, t0 + bar - 0.5); g.gain.linearRampToValueAtTime(0.0001, t0 + bar); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + bar + 0.05); }); });
        note(ctx, out, 'sine', mf(ch[0]), t0, bar * 0.9, 0.18, 0.2);
        [1, 2, 3, 2, 1, 2, 3, 2].forEach(function (ix, i) { note(ctx, out, 'triangle', mf(ch[ix] + 12), t0 + i * bt / 2, 0.5, 0.035, 0.01); });
      } else {
        for (var e = 0; e < 8; e++) note(ctx, out, 'sawtooth', mf(ch[0]), t0 + e * bt / 2, bt * 0.4, 0.09, 0.005, 420);
        [0, 2].forEach(function (x) { kick(ctx, out, t0 + x * bt, 0.35); });
        var o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = mf(ch[3] + 12); g2.gain.setValueAtTime(0.0001, t0); g2.gain.linearRampToValueAtTime(0.025, t0 + bar * 0.5); g2.gain.linearRampToValueAtTime(0.0001, t0 + bar); o2.connect(g2); g2.connect(out); o2.start(t0); o2.stop(t0 + bar + 0.1);
      }
    }
  }
  // 8 bars of the chosen track, made once, then looped quietly under the quiz
  function musicLoop(kind) {
    var bpm = kind === 'upbeat' ? 118 : kind === 'calm' ? 76 : 100, dur = 60 / bpm * 4 * 8, SR = 44100, ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR);
    track(ctx, ctx.destination, kind, dur); return ctx.startRendering();
  }

  // ───── the player ─────
  function play(id, hooks) {
    css(); hooks = hooks || {};
    var el = document.createElement('div'); el.className = 'qp-wrap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Video quiz');
    el.innerHTML = '<div class="qp-stage"><div class="qp-bg" id="qpBg"></div><div class="qp-bg" id="qpBg2" style="opacity:0"></div><div class="qp-shade"></div><div class="qp-ui">' +
      '<div class="qp-bar"><button type="button" class="qp-ic" id="qpX" aria-label="Close">✕</button><button type="button" class="qp-ic" id="qpS" aria-label="Sound">' + (soundOn() ? '🔊' : '🔇') + '</button><span class="qp-sc" id="qpSc"></span></div>' +
      '<div class="qp-h1" id="qpH1"></div><div class="qp-h2" id="qpH2"></div><div class="qp-body" id="qpBody"><div class="qp-mid"><div class="qp-sub">Loading…</div></div></div></div></div>';
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    var P = null, at = -1, score = 0, answered = 0, reported = false, ac = null, voiceBus = null, musicBus = null, musicSrc = null, VO = {}, cur = null, alive = true, mv = 0, bgOn = 1;
    var sc = function () { $('#qpSc', el).textContent = at >= 0 && P && at < P.qs.length ? (at + 1) + ' / ' + P.qs.length + ' · ✅ ' + score : (answered ? '✅ ' + score + ' / ' + answered : ''); };
    var close = function () { alive = false; stopVoice(); try { if (musicSrc) musicSrc.stop(); } catch (e) {} try { if (ac) ac.close(); } catch (e) {} el.remove(); document.removeEventListener('keydown', key); if (!document.querySelector('.qp-list')) document.body.style.overflow = ''; if (answered && !reported && hooks.done) hooks.done(answered, score, P && P.name); };
    var key = function (e) { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', key);
    $('#qpX', el).onclick = close;
    $('#qpS', el).onclick = function () { var on = !soundOn(); setSound(on); this.textContent = on ? '🔊' : '🔇'; if (ac) { var t = ac.currentTime; [voiceBus, musicBus].forEach(function (g, i) { if (g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(on ? (i ? mus() : vol()) : 0, t, 0.05); } }); } if (!on) stopVoice(); };
    var vol = function () { return P ? (P.voiceVol == null ? 1 : P.voiceVol / 100) : 1; };
    var mus = function () { return P && P.music !== 'none' ? (P.musicVol || 0) / 100 * 0.45 : 0; };
    function bg(img) {
      var a = $(bgOn ? '#qpBg' : '#qpBg2', el), b = $(bgOn ? '#qpBg2' : '#qpBg', el);
      b.style.backgroundImage = img ? 'url(' + API + '?vqi=' + encodeURIComponent(img) + ')' : 'linear-gradient(180deg,#0F1E36,#057A44)';
      b.className = 'qp-bg ' + (mv++ % 2 ? 'kb2' : 'kb'); b.style.opacity = 1; a.style.opacity = 0; bgOn = 1 - bgOn;
    }
    function stopVoice() { if (cur) { try { cur.stop(); } catch (e) {} cur = null; } }
    // plays one voice line (if there is one and sound is on); resolves when it ends
    function say(k) {
      stopVoice(); var b = VO[k];
      if (!ac || !b || !soundOn()) return Promise.resolve(0);
      return new Promise(function (ok) {
        var s = ac.createBufferSource(); s.buffer = b; s.connect(voiceBus); cur = s;
        if (musicBus && P.duck) { var t = ac.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(mus() * 0.3, t, 0.08); }
        s.onended = function () { if (cur === s) cur = null; if (musicBus && P.duck && soundOn()) musicBus.gain.setTargetAtTime(mus(), ac.currentTime, 0.25); ok(b.duration); };
        s.start();
      });
    }
    function blip(okk) {
      if (!ac || !soundOn()) return; var t = ac.currentTime;
      (okk ? [880, 1320, 1760] : [196, 147]).forEach(function (f, n) { var o = ac.createOscillator(), g = ac.createGain(); o.type = okk ? 'sine' : 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + (okk ? 0 : n * 0.12)); g.gain.exponentialRampToValueAtTime(okk ? 0.25 / (n + 1) : 0.08, t + (okk ? 0.01 : n * 0.12 + 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + (okk ? 0.9 : n * 0.12 + 0.25)); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1); });
    }
    function hl(q) {
      var h = String(q.hl || '').toLowerCase();
      return q.q.split(/\s+/).map(function (w) { var c = w.replace(/[“”"?.,!:;()]/g, '').toLowerCase(); return h && c === h ? '<em>' + esc(w) + '</em>' : esc(w); }).join(' ');
    }
    var body = function () { return $('#qpBody', el); };

    function intro() {
      at = -1; sc(); bg(P.cImg || (P.qs[0] || {}).img); $('#qpH1', el).style.visibility = $('#qpH2', el).style.visibility = P.cTitle ? 'hidden' : '';
      body().innerHTML = '<div class="qp-mid">' + (P.cTitle ? '<div class="qp-cov">' + esc(P.cTitle) + '</div>' + (P.cSub ? '<div><span class="qp-cs">' + esc(P.cSub) + '</span></div>' : '') : '<div class="qp-big">Ready?</div><div class="qp-sub">' + P.qs.length + ' questions · tap your answer</div>') + '<button type="button" class="qp-btn" id="qpGo" style="margin-top:4cqh">▶️ Start</button>' +
        '</div>';
      $('#qpGo', el).onclick = function () { this.disabled = true; this.textContent = 'Loading…'; startAudio().then(function () { gt('video_quiz_start', { label: P.name }); say('intro').then(function (d) { return d ? wait(250) : 0; }).then(function () { if (alive) ask(0); }); }); };
      if (hooks.autostart) { hooks.autostart = false; $('#qpGo', el).click(); }   // came from ▶️ Next quiz — start straight away
    }
    // sound can only start after a tap (phones) — load the voice lines and music now
    function startAudio() {
      try { ac = hooks._ac || new (window.AudioContext || window.webkitAudioContext)(); hooks._ac = null; if (ac.resume) ac.resume().catch(function () {}); } catch (e) { return Promise.resolve(); }
      voiceBus = ac.createGain(); voiceBus.gain.value = soundOn() ? vol() : 0; voiceBus.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(ac.destination);
      var keys = Object.keys(P.vo || {});
      var voices = Promise.all(keys.map(function (k) { return fetch(API + '?vqa=' + P.vo[k]).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (b) { return ac.decodeAudioData(b); }).then(function (buf) { VO[k] = buf; }).catch(function () {}); }));
      var music = P.music && P.music !== 'none' && mus() > 0 ? musicLoop(P.music).then(function (buf) { if (!alive) return; musicSrc = ac.createBufferSource(); musicSrc.buffer = buf; musicSrc.loop = true; musicSrc.connect(musicBus); musicSrc.start(); musicBus.gain.setTargetAtTime(soundOn() ? mus() : 0, ac.currentTime, 0.6); }).catch(function () {}) : Promise.resolve();
      if (ac.state === 'suspended') ac.resume().catch(function () {});
      return Promise.race([Promise.all([voices, music]), wait(6000)]);
    }
    function ask(i) {
      at = i; sc(); var q = P.qs[i], L = ['A', 'B', 'C', 'D']; if (!q) return outro(); $('#qpH1', el).style.visibility = $('#qpH2', el).style.visibility = '';
      bg(q.img); if (P.qs[i + 1] && P.qs[i + 1].img) { var pre = new Image(); pre.src = API + '?vqi=' + encodeURIComponent(P.qs[i + 1].img); }
      body().innerHTML = '<div class="qp-chip">' + (i + 1) + ' / ' + P.qs.length + '</div><div class="qp-q" id="qpQ">' + hl(q) + '</div><div class="qp-opts">' +
        q.opts.map(function (o, k) { return '<button type="button" class="qp-o" data-k="' + k + '" disabled><b>' + L[k] + '</b><span>' + esc(o) + '</span></button>'; }).join('') + '</div><div id="qpF"></div>';
      body().scrollTop = 0;
      var btns = [].slice.call(el.querySelectorAll('.qp-o')), done = false;
      btns.forEach(function (b) { b.onclick = function () { if (!done) { done = true; pickIt(i, +b.dataset.k, btns); } }; });
      setTimeout(function () { var qe = $('#qpQ', el); if (qe) qe.classList.add('in'); }, 120);
      say('q' + i).then(function (d) {
        if (!alive || at !== i) return;
        var step = VO['o' + i] && soundOn() ? Math.max(0.35, VO['o' + i].duration / 4) : 0.4;
        if (!d) step = 0.4;
        var show = function () { btns.forEach(function (b, k) { setTimeout(function () { if (at === i) { b.classList.add('in'); b.disabled = done; } }, k * step * 1000); }); };
        (d ? wait(150) : wait(900)).then(function () { if (at !== i) return; show(); if (VO['o' + i]) say('o' + i); setTimeout(function () { var f = $('#qpF', el); if (f && !done && at === i) f.innerHTML = '<div class="qp-hint">👆🏾 Tap your answer</div>'; }, step * 4000); });
      });
    }
    function pickIt(i, k, btns) {
      var q = P.qs[i], ok = k === q.ans; answered++; if (ok) score++;
      btns.forEach(function (b, n) { b.disabled = true; b.classList.add('in'); if (n === q.ans) b.classList.add('ok'); else if (n === k) b.classList.add('bad'); else b.classList.add('dim'); });
      var r = btns[q.ans]; if (r) r.querySelector('span').textContent = q.opts[q.ans] + '  ✓';
      blip(ok); sc(); stopVoice();
      if (hooks.answer) try { hooks.answer(q.id, ok); } catch (e) {}
      var last = i === P.qs.length - 1;
      $('#qpF', el).innerHTML = '<div class="qp-fb ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? '✅ Correct!' : '❌ Not quite — it’s ' + esc(q.opts[q.ans])) + '</b>' + (q.e ? '<div style="margin-top:4px">' + esc(q.e) + '</div>' : '') + '</div><button type="button" class="qp-btn" id="qpN">' + (last ? 'See my score 🎉' : 'Next question ▶') + '</button>';
      setTimeout(function () { var f = $('#qpN', el); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
      wait(ok ? 700 : 500).then(function () { if (at === i) say('a' + i); });
      $('#qpN', el).onclick = function () { stopVoice(); if (last) outro(); else ask(i + 1); };
    }
    function outro() {
      at = P.qs.length; sc(); gt('video_quiz_done', { label: P.name, value: score });
      if (answered && !reported && hooks.done) { reported = true; try { hooks.done(answered, score, P.name); } catch (e) {} }
      var pc = P.qs.length ? Math.round(score / P.qs.length * 100) : 0, msg = pc === 100 ? 'Perfect score! 🏆' : pc >= 75 ? 'Brilliant — well done! 🎉' : pc >= 50 ? 'Good effort — keep going! 💪🏾' : 'Keep practising — you’ll get there! 💚';
      body().innerHTML = '<div class="qp-mid"><div class="qp-big">' + score + ' / ' + P.qs.length + '</div><div class="qp-sub">' + msg + '</div>' +
        '<div style="margin-top:4cqh"><div id="qpNx"></div><button type="button" class="qp-btn g" id="qpPr">📚 Practise more questions</button><button type="button" class="qp-btn w" id="qpMore">📺 More video quizzes</button><button type="button" class="qp-btn w" id="qpAg">🔁 Play again</button></div></div>';
      // no spoken outro in the app — the video's outro asks for comments and points to the app we're already in
      $('#qpPr', el).onclick = function () { close(); var l = document.querySelector('.qp-list'); if (l) { l.remove(); document.body.style.overflow = ''; } if (hooks.practice) hooks.practice(); };
      $('#qpMore', el).onclick = function () { close(); if (!document.querySelector('.qp-list') && hooks.bank) browse(hooks.bank, hooks); };
      // ▶️ next quiz in the same test — ones not done yet first, then round again from the start
      markDone(P.id || id);
      list(P.bank || hooks.bank || '').then(function (items) {
        var k = -1; items.forEach(function (x, j) { if (x.id === (P.id || id)) k = j; });
        var order = items.slice(k + 1).concat(items.slice(0, Math.max(0, k))).filter(function (x) { return x.id !== (P.id || id); }), dn = doneSet();
        var nx = order.filter(function (x) { return !dn[x.id]; })[0] || order[0], box = $('#qpNx', el); if (!nx || !box || !alive) return;
        pack(nx.id).catch(function () {});   // load it now so it starts quickly
        box.innerHTML = '<button type="button" class="qp-btn" id="qpNext" style="margin-bottom:1.6cqh">▶️ Next: ' + esc(nx.name) + '</button>';
        $('#qpNext', el).onclick = function () { var a = null; try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} gt('video_quiz_next', { label: nx.name }); close(); play(nx.id, Object.assign({}, hooks, { autostart: true, _ac: a })); };
      });
      $('#qpAg', el).onclick = function () { stopVoice(); score = 0; answered = 0; reported = false; ask(0); };
    }
    pack(id).then(function (p) {
      if (!alive) return; P = p;
      $('#qpH1', el).textContent = p.h1 || ''; $('#qpH2', el).textContent = p.h2 || '';
      intro();
    }).catch(function () { body().innerHTML = '<div class="qp-mid"><div class="qp-sub">This quiz isn’t available any more.</div><button type="button" class="qp-btn" id="qpBk">Back</button></div>'; $('#qpBk', el).onclick = close; });
  }

  window.QuizPlay = { count: count, browse: browse, play: play };
})();
