/*
 * Auntie Tobi HQ — ✅ Finished videos (shared by 🎙️ Voiceover Video, 🎞️ Video Remix and 🎬 Quiz videos).
 * After a video is made, the MP4 is kept in HQ (in pieces) with a small cover picture, so it can be played,
 * downloaded again on any device, marked as posted, or opened back up as the draft it came from.
 *
 *   HQFinished.init({ api, sheet, toast, esc, go })
 *   HQFinished.keep({ tool, name, draftId, secs, caption }, blob, canvas, onProgress) → Promise<id>
 *   HQFinished.thumb(canvas) → small JPEG data URL of a frame
 *   HQFinished.panel(el, tool)   fills el with the ✅ Finished list (that tool first; "All tools" toggle)
 *   HQFinished.view()            the 🎬 Finished videos page (#fin)
 *   HQFinished.tabs(sheetEl, tool, draftsFn)  ✏️ Working on / ✅ Finished tabs inside a tool's "My videos" sheet
 */
(function () {
  'use strict';
  var X = null, PART = 1490000, URLS = {}, TOOLS = { vv: ['🎙️', 'Voiceover Video', 'vvid', 'HQVoice'], rx: ['🎞️', 'Video Remix', 'rmx', 'HQRemix'], qv: ['🎬', 'Quiz videos', 'qvid', 'HQQuizVid'] };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function when(iso) { return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function mb(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB'; }
  function secs(s) { return s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'; }
  function b64(blob) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = function () { bad(new Error('Couldn’t read the video.')); }; r.readAsDataURL(blob); }); }

  function thumb(canvas) { try { var c = document.createElement('canvas'); c.width = 270; c.height = 480; c.getContext('2d').drawImage(canvas, 0, 0, 270, 480); return c.toDataURL('image/jpeg', 0.75); } catch (e) { return ''; } }
  async function keep(meta, blob, thumbUrl, onProg) {
    var n = Math.ceil(blob.size / PART); onProg = onProg || function () {};
    var r = await X.api('fin-start', { tool: meta.tool, name: meta.name, draftId: meta.draftId || '', secs: meta.secs, size: blob.size, parts: n, caption: meta.caption || '', thumb: thumbUrl || '' });
    for (var i = 0; i < n; i++) {
      onProg(Math.round(i / n * 100));
      var piece = await b64(blob.slice(i * PART, (i + 1) * PART)), tries = 0;
      while (true) { try { await X.api('fin-part', { id: r.id, idx: i, b64: piece }); break; } catch (e) { if (++tries >= 3) throw e; await new Promise(function (ok) { setTimeout(ok, 1500 * tries); }); } }
    }
    await X.api('fin-done', { id: r.id }); onProg(100);
    URLS[r.id] = URL.createObjectURL(blob);
    return r.id;
  }
  async function mp4(it, onProg) {
    if (URLS[it.id]) return URLS[it.id];
    var bufs = [];
    for (var i = 0; i < it.parts; i++) {
      if (onProg) onProg(Math.round(i / it.parts * 100));
      var r = await fetch('/.netlify/functions/studio-hq?fin=' + encodeURIComponent(it.id) + '&part=' + i, { credentials: 'same-origin', headers: { 'x-studio': '1' } });
      if (!r.ok) throw new Error('That video didn’t load — please try again.');
      bufs.push(await r.arrayBuffer());
    }
    URLS[it.id] = URL.createObjectURL(new Blob(bufs, { type: 'video/mp4' }));
    return URLS[it.id];
  }
  function fileName(it) { return (it.name || 'video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50).toLowerCase() + '.mp4'; }

  // ───── the list ─────
  function panel(el, tool, onOpen) {
    var all = !tool, items = [], total = 0;
    var paint = function () {
      var shown = items.filter(function (x) { return all || x.tool === tool; });
      el.innerHTML = '<style>.fn-it{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #EEE9DD}.fn-it:first-of-type{border-top:0}.fn-th{width:68px;height:120px;border-radius:8px;background:#0F1E36 center/cover;flex:none;cursor:pointer}.fn-b{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.fn-tag{display:inline-block;font-size:11.5px;border-radius:999px;padding:1px 8px;background:#F1EEE6;color:#6B7280;font-weight:600}.fn-tag.p{background:#E7F6EE;color:#057A44}</style>' +
        '<div class="row" style="gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px;flex:1">' + shown.length + ' finished video' + (shown.length === 1 ? '' : 's') + ' · all finished videos use ' + total + ' MB</span>' +
        (tool ? '<label style="display:flex;gap:6px;align-items:center;margin:0;font-size:12.5px"><input type="checkbox" id="fnAll"' + (all ? ' checked' : '') + ' style="width:auto;margin:0"> All video tools</label>' : '') + '</div>' +
        (shown.length ? shown.map(function (it) {
          var T = TOOLS[it.tool] || TOOLS.vv;
          return '<div class="fn-it"><div class="fn-th" data-play="' + it.id + '" style="background-image:url(/.netlify/functions/studio-hq?fint=' + it.id + ')" title="Play"></div><div style="flex:1;min-width:0"><b>' + esc(it.name) + '</b><div class="muted" style="font-size:12.5px;margin-top:2px">' + when(it.at) + ' · ' + secs(it.secs) + ' · ' + mb(it.size) + '</div>' +
            '<div style="margin-top:4px"><span class="fn-tag">' + T[0] + ' ' + T[1] + '</span> ' + (it.posted ? '<span class="fn-tag p">📲 Posted ' + new Date(it.posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span>' : '') + '</div>' +
            '<div class="fn-b"><button class="btn primary sm" data-play="' + it.id + '">▶️ Play</button><button class="btn ghost sm" data-dl="' + it.id + '">⬇️ Download</button>' + (it.caption ? '<button class="btn ghost sm" data-cap="' + it.id + '">📋 Caption</button>' : '') +
            (it.draftId ? '<button class="btn ghost sm" data-draft="' + it.id + '">✏️ Open the draft</button>' : '') + '<button class="btn ghost sm" data-post="' + it.id + '">' + (it.posted ? '↩️ Not posted' : '📲 Mark posted') + '</button><button class="btn ghost sm" data-del="' + it.id + '" title="Delete">🗑️</button></div></div></div>';
        }).join('') : '<div class="muted" style="padding:10px 0">No finished videos yet. When you click 🎬 Make the video, the MP4 is kept here.</div>');
      if ($('#fnAll', el)) $('#fnAll', el).onchange = function () { all = this.checked; paint(); };
      var get = function (id) { return items.filter(function (x) { return x.id === id; })[0]; };
      $$('[data-play]', el).forEach(function (b) { b.onclick = function () { play(get(b.dataset.play)); }; });
      $$('[data-dl]', el).forEach(function (b) { b.onclick = function () { var it = get(b.dataset.dl), t = b.textContent; b.disabled = true; mp4(it, function (p) { b.textContent = '⏳ ' + p + '%'; }).then(function (u) { var a = document.createElement('a'); a.href = u; a.download = fileName(it); document.body.appendChild(a); a.click(); a.remove(); b.textContent = t; b.disabled = false; }).catch(function (e) { b.textContent = t; b.disabled = false; X.toast(e.message); }); }; });
      $$('[data-cap]', el).forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(get(b.dataset.cap).caption); X.toast('📋 Caption copied'); } catch (e) {} }; });
      $$('[data-draft]', el).forEach(function (b) { b.onclick = function () { var it = get(b.dataset.draft); openDraft(it.tool, it.draftId); if (onOpen) onOpen(); }; });
      $$('[data-post]', el).forEach(function (b) { b.onclick = function () { var it = get(b.dataset.post); X.api('fin-posted', { id: it.id, on: !it.posted }).then(function (r) { Object.assign(it, r.item); paint(); X.toast(it.posted ? '📲 Marked as posted' : 'Marked as not posted'); }).catch(function (e) { X.toast(e.message); }); }; });
      $$('[data-del]', el).forEach(function (b) { b.onclick = function () { var it = get(b.dataset.del); if (!confirm('Delete “' + it.name + '” from Finished videos? The MP4 kept in HQ will be gone (the draft stays). This can’t be undone.')) return; X.api('fin-del', { id: it.id }).then(function () { items = items.filter(function (x) { return x.id !== it.id; }); total = Math.max(0, total - Math.round(it.size / 1e6)); paint(); X.toast('🗑️ Deleted'); }).catch(function (e) { X.toast(e.message); }); }; });
    };
    el.innerHTML = '<div class="muted">Loading…</div>';
    X.api('fin-list').then(function (r) { items = r.items || []; total = r.totalMb || 0; if (tool && !items.some(function (x) { return x.tool === tool; })) all = true; paint(); }).catch(function (e) { el.textContent = e.message; });
  }
  function play(it) {
    var s = X.sheet('<h3 style="margin:0 0 8px">▶️ ' + esc(it.name) + '</h3><div id="fnV" style="display:flex;justify-content:center;background:#111;border-radius:12px;min-height:220px;align-items:center;color:#fff">Loading… <span id="fnP"></span></div><div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost" id="fnX">Close</button></div>');
    $('#fnX', s).onclick = function () { s.remove(); };
    mp4(it, function (p) { var e = $('#fnP', s); if (e) e.textContent = p + '%'; }).then(function (u) { var b = $('#fnV', s); if (b) b.innerHTML = '<video src="' + u + '" controls autoplay playsinline style="max-height:70vh;max-width:100%;border-radius:12px"></video>'; }).catch(function (e) { var b = $('#fnV', s); if (b) b.textContent = e.message; });
  }
  function openDraft(tool, id) {
    var T = TOOLS[tool]; if (!T || !id) return;
    window.__hqOpenDraft = { tool: tool, id: id };
    if (X.go) X.go(T[2]); else location.hash = '#' + T[2];
  }
  // ✏️ Working on / ✅ Finished tabs for a tool's "My videos" sheet. drafts(el) paints the drafts list.
  function tabs(s, tool, drafts) {
    var box = document.createElement('div');
    box.innerHTML = '<div class="row" style="gap:6px;margin-bottom:10px"><button class="btn sm primary" data-tab="w">✏️ Working on</button><button class="btn sm ghost" data-tab="f">✅ Finished</button></div><div id="fnTab"></div>';
    var host = s.querySelector('.sheet'); host.appendChild(box);
    var show = function (t) { $$('[data-tab]', box).forEach(function (b) { b.className = 'btn sm ' + (b.dataset.tab === t ? 'primary' : 'ghost'); }); var el = $('#fnTab', box); if (t === 'f') panel(el, tool, function () { s.remove(); }); else drafts(el); };
    $$('[data-tab]', box).forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
    show('w'); return box;
  }
  function view() {
    $('#ttl').textContent = 'Finished videos'; $('#topRight').innerHTML = '';
    $('#view').innerHTML = '<div class="card" style="max-width:820px"><div class="muted" style="font-size:13px;margin-bottom:8px">Every video made in 🎙️ Voiceover Video, 🎞️ Video Remix and 🎬 Quiz videos. Play it, download it again on any device, copy the caption, mark it posted, or open the draft to make a new version.</div><div id="fnPage"></div></div>';
    panel($('#fnPage'), '');
  }
  // 💾 a little "Saved" note for auto-save
  function saveNote(state) { var n = $('#asvNote'); if (!n) { n = document.createElement('span'); n.id = 'asvNote'; n.className = 'muted'; n.style.cssText = 'font-size:12.5px;margin-right:8px'; var tr = $('#topRight'); if (tr) tr.insertBefore(n, tr.firstChild); } n.textContent = state === 'saving' ? '💾 Saving…' : state === 'saved' ? '✅ Saved' : state === 'error' ? '⚠️ Not saved — check your connection' : ''; }
  function takeOpen(tool) { var o = window.__hqOpenDraft; if (o && o.tool === tool) { window.__hqOpenDraft = null; return o.id; } return ''; }
  function lastDraft(tool, id) { var k = 'hqLastDraft_' + tool; try { if (id === undefined) return localStorage.getItem(k) || ''; if (id) localStorage.setItem(k, id); else localStorage.removeItem(k); } catch (e) { return ''; } return id; }

  function init(x) { X = x; }
  window.HQFinished = { init: init, keep: keep, thumb: thumb, panel: panel, tabs: tabs, view: view, saveNote: saveNote, takeOpen: takeOpen, lastDraft: lastDraft };
})();
