/*
 * ✨ HQ → Weekly ideas (admin only): a few post ideas a day from Auntie Tobi's own weekly themes, built on this week's
 * real events, businesses, marketplace items, UK posts and dates. Never repeats what's posted or planned.
 * ✅ Keep puts it on the Board and the Calendar for that day. Nothing is posted for you.
 */
(function () {
  'use strict';
  var X = null, W = null, week = '', day = '', busy = false;
  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], DN = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  var FMT = { post: '🖼️ Post', reel: '🎬 Reel', carousel: '🗂️ Carousel', story: '📱 Story', blog: '✍️ Blog' };
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return X.esc(s == null ? '' : String(s)); };
  var nice = function (d, long) { var t = new Date(d + 'T12:00:00Z'); return t.toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
  function todayKey() { var d = new Date(), i = (d.getDay() + 6) % 7; return DAYS[i]; }
  function shift(mon, n) { var t = new Date(mon + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }

  async function load(w) { W = await X.api('ideas-week', { week: w || week }); week = W.monday; if (!day) day = todayKey(); }
  async function view() {
    $('#ttl').textContent = 'Weekly ideas';
    $('#topRight').innerHTML = '<button class="btn ghost" id="idCfg">⚙️ Themes</button>';
    $('#idCfg').onclick = themes;
    if (!W) $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { await load(); } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    draw();
  }

  function card(it) {
    var kept = it.state === 'kept', cap = it.caption || '';
    return '<div class="idc' + (kept ? ' kept' : '') + '">' +
      '<div class="idtop"><span class="idser">' + esc(it.series) + '</span><span class="idfmt">' + (FMT[it.format] || it.format) + '</span></div>' +
      '<h3>' + esc(it.title) + '</h3>' +
      '<div class="idhook">“' + esc(it.hook) + '”</div>' +
      (it.slides ? '<ol class="idsl">' + it.slides.split('\n').filter(Boolean).map(function (l) { return '<li>' + esc(l.replace(/^\s*(\d+[.)]|[-•])\s*/, '')) + '</li>'; }).join('') + '</ol>' : '') +
      (cap ? '<div class="idcap">' + esc(cap) + '</div>' : '') +
      (it.why ? '<div class="idwhy">💡 ' + esc(it.why) + '</div>' : '') +
      (it.uses ? '<div class="idwhy">📌 Built on: ' + esc(it.uses) + '</div>' : '') +
      '<div class="idbtns">' + (kept ? '<span class="idok">✓ On your Board and Calendar · ' + esc(nice(W.dates[day])) + '</span><button class="btn ghost sm" data-copy="' + it.id + '">📋 Copy caption</button>'
        : '<button class="btn primary sm" data-keep="' + it.id + '">✅ Keep</button><button class="btn ghost sm" data-swap="' + it.id + '">🔄 Swap</button><button class="btn ghost sm" data-copy="' + it.id + '">📋 Copy caption</button><button class="btn ghost sm" data-skip="' + it.id + '" title="Not for me">✕</button>') + '</div></div>';
  }

  function draw() {
    var d = W.cfg.days[day] || { theme: '', series: [] }, list = W.days[day] || [];
    var thisMon = shift(new Date().toISOString().slice(0, 10), -((new Date().getDay() + 6) % 7));
    var wkLabel = week === thisMon ? 'This week' : week === shift(thisMon, 7) ? 'Next week' : week === shift(thisMon, -7) ? 'Last week' : 'Week of ' + nice(week);
    var total = DAYS.reduce(function (a, k) { return a + (W.days[k] || []).length; }, 0);
    var h = '<div class="wrap" style="max-width:920px">' + css() +
      '<p class="muted" style="margin:0 0 12px">Fresh post ideas for each day, built on your weekly themes and on what’s really happening on Auntie Tobi this week. They never repeat what you’ve posted or planned. <b>✅ Keep</b> puts one on your Board and Calendar — nothing is posted for you.</p>' +
      '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div class="row" style="gap:6px;align-items:center"><button class="btn ghost sm" id="idPrev">‹</button><b style="font-size:15px">' + wkLabel + ' · ' + nice(week) + ' – ' + nice(shift(week, 6)) + '</b><button class="btn ghost sm" id="idNext">›</button></div>' +
      '<button class="btn ' + (total ? 'ghost' : 'primary') + '" id="idAll">✨ ' + (total ? 'Fill the empty days' : 'Make ideas for the whole week') + '</button></div>' +
      '<div class="idtabs">' + DAYS.map(function (k) { var n = (W.days[k] || []).length, kn = (W.days[k] || []).filter(function (i) { return i.state === 'kept'; }).length; return '<button data-day="' + k + '" class="' + (k === day ? 'on' : '') + '">' + DN[k].slice(0, 3) + '<small>' + nice(W.dates[k]).split(' ')[0] + '</small>' + (n ? '<i>' + (kn ? kn + '✓' : n) + '</i>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="idday"><div><b style="font-size:17px">' + DN[day] + ' — ' + esc(d.theme) + '</b><div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(d.series.join(' · ')) + '</div></div>' +
      '<button class="btn ' + (list.length ? 'ghost' : 'primary') + '" id="idMake">' + (list.length ? '↻ New ideas for ' + DN[day] : '✨ Make ideas for ' + DN[day]) + '</button></div>' +
      (list.length ? list.map(card).join('') : '<div class="card" style="text-align:center;padding:26px"><div style="font-size:34px">💡</div><b>No ideas for ' + DN[day] + ' yet</b><p class="muted" style="margin:4px 0 0">Tap “Make ideas” — you’ll get ' + W.cfg.perDay + ', each from a different series.</p></div>') +
      (list.length ? '<p class="muted" style="font-size:12.5px;margin-top:6px">↻ New ideas keeps the ones you’ve kept and replaces the rest.</p>' : '') + '</div>';
    $('#view').innerHTML = h;

    $('#idPrev').onclick = function () { go(shift(week, -7)); };
    $('#idNext').onclick = function () { go(shift(week, 7)); };
    $$('[data-day]').forEach(function (b) { b.onclick = function () { day = b.dataset.day; draw(); }; });
    $('#idMake').onclick = function () { make([day], this); };
    $('#idAll').onclick = function () { make(DAYS.filter(function (k) { return !(W.days[k] || []).length; }), this); };
    $$('[data-keep]').forEach(function (b) { b.onclick = function () { act(b, 'ideas-act', { id: b.dataset.keep, what: 'keep' }, '✅ On your Board and Calendar for ' + nice(W.dates[day], true)); }; });
    $$('[data-skip]').forEach(function (b) { b.onclick = function () { act(b, 'ideas-act', { id: b.dataset.skip, what: 'skip' }, 'Removed — noted that one wasn’t for you'); }; });
    $$('[data-swap]').forEach(function (b) { b.onclick = function () { b.textContent = '🔄 Finding a better one…'; act(b, 'ideas-swap', { id: b.dataset.swap }, '🔄 Swapped'); }; });
    $$('[data-copy]').forEach(function (b) { b.onclick = function () { var it = (W.days[day] || []).filter(function (i) { return i.id === b.dataset.copy; })[0]; if (!it) return; var t = [it.hook, it.caption].filter(Boolean).join('\n\n'); try { navigator.clipboard.writeText(t); X.toast('Caption copied'); } catch (e) { X.toast('Couldn’t copy'); } }; });
  }
  async function go(w) { try { day = ''; await load(w); draw(); } catch (e) { X.toast(e.message); } }
  async function act(b, action, extra, msg) {
    if (busy) return; busy = true; b.disabled = true;
    try { W = await X.api(action, Object.assign({ week: week, day: day }, extra)); X.toast(msg); draw(); } catch (e) { X.toast(e.message); b.disabled = false; }
    busy = false;
  }
  async function make(days, btn) {
    if (busy) return; if (!days.length) { X.toast('Every day already has ideas'); return; }
    busy = true; btn.disabled = true;
    for (var i = 0; i < days.length; i++) {
      btn.textContent = '✨ Thinking up ' + DN[days[i]] + '’s ideas…' + (days.length > 1 ? ' (' + (i + 1) + '/' + days.length + ')' : '');
      try { W = await X.api('ideas-make', { week: week, day: days[i] }); } catch (e) { X.toast(DN[days[i]] + ': ' + e.message); }
    }
    busy = false; if (days.length === 1) day = days[0]; draw();
  }

  function themes() {
    var c = W.cfg;
    var s = X.sheet('<h2>⚙️ Your weekly themes</h2><p class="muted" style="margin:4px 0 12px">One series per line. Each day, ideas come from a few different series, taking turns so all of them get used. Ones starting with ✨ were added as suggestions — delete any you don’t want.</p>' +
      '<label style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:12px">Ideas per day <select id="idPer" style="width:auto">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option' + (n === c.perDay ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      DAYS.map(function (k) { return '<div style="margin-bottom:14px"><label style="font-weight:800">' + DN[k] + '</label><input id="idT_' + k + '" value="' + esc(c.days[k].theme) + '" style="width:100%;margin:4px 0 6px" placeholder="Theme"><textarea id="idS_' + k + '" rows="6" style="width:100%;font-size:13.5px">' + esc(c.days[k].series.join('\n')) + '</textarea></div>'; }).join('') +
      '<div class="row" style="justify-content:flex-end;gap:8px"><button class="btn ghost" id="idX">Cancel</button><button class="btn primary" id="idSave">Save</button></div>');
    $('#idX', s).onclick = function () { s.remove(); };
    $('#idSave', s).onclick = async function () {
      var cfg = { perDay: +$('#idPer', s).value, days: {} };
      DAYS.forEach(function (k) { cfg.days[k] = { theme: $('#idT_' + k, s).value, series: $('#idS_' + k, s).value.split('\n') }; });
      this.disabled = true;
      try { W = await X.api('ideas-cfg', { week: week, cfg: cfg }); s.remove(); X.toast('Themes saved'); draw(); } catch (e) { this.disabled = false; X.toast(e.message); }
    };
  }

  function css() {
    return '<style>.idtabs{display:flex;gap:6px;margin:14px 0 12px;overflow-x:auto}.idtabs button{flex:1;min-width:64px;border:1px solid #ECEDF1;background:#fff;border-radius:12px;padding:7px 4px;font:inherit;font-weight:800;font-size:13px;color:#0F1E36;cursor:pointer;position:relative;min-height:0}' +
      '.idtabs small{display:block;font-weight:600;font-size:11.5px;color:#6B7280}.idtabs button.on{background:#0F1E36;border-color:#0F1E36;color:#FFB81C}.idtabs button.on small{color:#fff}' +
      '.idtabs i{position:absolute;top:-6px;right:-4px;font-style:normal;background:#FFB81C;color:#0F1E36;font-size:10.5px;font-weight:800;border-radius:9px;padding:1px 6px}' +
      '.idday{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}.idday>div{flex:1;min-width:240px}' +
      '.idc{background:#fff;border:1px solid #ECEDF1;border-radius:16px;padding:14px 16px;margin-bottom:12px}.idc.kept{border:2px solid #057A44;background:#F6FBF8}' +
      '.idtop{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.idser{background:#0F1E36;color:#FFB81C;font-size:12px;font-weight:800;border-radius:10px;padding:3px 9px}.idfmt{background:#F3F4F6;font-size:12px;font-weight:700;border-radius:10px;padding:3px 9px}' +
      '.idc h3{margin:9px 0 6px;font-size:17px}.idhook{font-size:15px;font-weight:700;color:#057A44;margin-bottom:8px}' +
      '.idsl{margin:0 0 8px 20px;padding:0;font-size:13.5px;line-height:1.55}.idcap{white-space:pre-wrap;font-size:13.5px;line-height:1.5;background:#FAFAF7;border-radius:10px;padding:9px 11px;margin-bottom:8px;max-height:150px;overflow:auto}' +
      '.idwhy{font-size:12.5px;color:#4B5563;margin-top:3px}.idbtns{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;align-items:center}.idok{color:#057A44;font-weight:800;font-size:13.5px;margin-right:6px}</style>';
  }

  window.HQIdeas = { init: function (x) { X = x; }, view: view };
})();
