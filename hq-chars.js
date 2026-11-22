/*
 * Auntie Tobi HQ — 👥 Characters: a library of people who appear in Auntie Tobi's videos, each with one reference photo.
 * Pick them on a scene in 🎙️ Voiceover Video or 🎞️ Video Remix and ✨ Make picture keeps them looking the same.
 *
 *   HQChars.init({ api, sheet, toast, esc })
 *   HQChars.view()                       the 👥 Characters page (#chars)
 *   HQChars.chips(ids)                   little "who's in it" chips (HTML)
 *   HQChars.pick(ids, onDone)            sheet to choose up to 3 characters for a scene
 *   HQChars.load()                       Promise<items>
 */
(function () {
  'use strict';
  var X = null, ITEMS = null, VADS = [];
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function img(id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); }
  function eimg(id) { return '/.netlify/functions/studio-hq?subimg=' + encodeURIComponent(id); }
  function load(force) { if (ITEMS && !force) return Promise.resolve(ITEMS); return X.api('ch-list').then(function (r) { ITEMS = r.items || []; VADS = r.vads || []; return ITEMS; }); }
  function byId(id) { return (ITEMS || []).filter(function (c) { return c.id === id; })[0]; }
  function shrink(file, max) { return new Promise(function (ok, bad) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.88)); }; im.onerror = function () { bad(new Error('That photo didn’t open.')); }; im.src = u; }); }

  function chips(ids) {
    var cs = (ids || []).map(byId).filter(Boolean); if (!cs.length) return '';
    return cs.map(function (c) { return '<span style="display:inline-flex;gap:5px;align-items:center;background:#F1EEE6;border-radius:999px;padding:2px 9px 2px 2px;font-size:12px;font-weight:600"><img src="' + img(c.img) + '" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover">' + esc(c.name) + '</span>'; }).join(' ');
  }
  // ───── choose who's in a scene ─────
  function pick(ids, onDone) {
    var sel = (ids || []).slice(), s = X.sheet('<h3 style="margin:0 0 4px">👥 Who’s in this scene?</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Pick up to 3. ✨ Make picture keeps them looking the same as their reference photo.</div><div id="chPk" class="muted">Loading…</div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="chOk">Done</button><button class="btn ghost" id="chNew">➕ New character</button><button class="btn ghost" id="chX">Cancel</button></div>');
    var paint = function () {
      var box = $('#chPk', s); if (!box) return;
      if (!ITEMS.length) { box.innerHTML = 'No characters yet — tap ➕ New character.'; return; } box.classList.remove('muted');
      box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">' + ITEMS.map(function (c) { var on = sel.indexOf(c.id) >= 0; return '<button type="button" data-pk="' + c.id + '" style="border:2.5px solid ' + (on ? '#057A44' : '#ECE8DE') + ';border-radius:12px;padding:6px;background:' + (on ? '#E7F6EE' : '#fff') + ';cursor:pointer;font:inherit;text-align:center"><img src="' + img(c.img) + '" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:8px;display:block"><b style="display:block;font-size:13px;margin-top:4px">' + (on ? '✅ ' : '') + esc(c.name) + '</b></button>'; }).join('') + '</div>';
      $$('[data-pk]', box).forEach(function (b) { b.onclick = function () { var i = sel.indexOf(b.dataset.pk); if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 3) return X.toast('Up to 3 characters per scene.'); sel.push(b.dataset.pk); } paint(); }; });
    };
    load().then(paint).catch(function (e) { $('#chPk', s).textContent = e.message; });
    $('#chOk', s).onclick = function () { s.remove(); onDone(sel); };
    $('#chX', s).onclick = function () { s.remove(); };
    $('#chNew', s).onclick = function () { edit(null, function (c) { if (sel.length < 3) sel.push(c.id); paint(); }); };
  }
  // ───── make / edit one character ─────
  function edit(c, onSaved, preset) {
    c = c || preset || {}; var cur = { img: c.img || '', eimg: c.eimg || '' };
    var s = X.sheet('<h3 style="margin:0 0 8px">' + (c.id ? '✏️ ' + esc(c.name) : '➕ New character') + '</h3><div class="row" style="gap:14px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="flex:none;width:150px"><div id="chPh" style="width:150px;aspect-ratio:4/5;border-radius:12px;background:#0F1E36 center/cover;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:12px;text-align:center"></div>' +
      '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn ghost sm" id="chMk">✨ Make photo</button><label class="btn ghost sm" style="margin:0;cursor:pointer">📷 Upload<input type="file" accept="image/*" id="chUp" hidden></label></div></div>' +
      '<div style="flex:1;min-width:240px"><label>Name</label><input id="chN" value="' + esc(c.name || '') + '" placeholder="e.g. Auntie Tobi">' +
      '<label style="margin-top:8px">How they look <span class="muted">(the more detail, the more consistent)</span></label><textarea id="chL" rows="4" placeholder="e.g. Nigerian woman in her early 50s, dark brown skin, round friendly face, warm smile, short natural hair, small gold earrings, glasses, medium build">' + esc(c.look || '') + '</textarea>' +
      '<label style="margin-top:8px">Outfit <span class="muted">(kept the same in every scene)</span></label><input id="chO" value="' + esc(c.outfit || '') + '" placeholder="e.g. green and gold ankara headwrap and matching blouse">' +
      '<div class="muted" style="font-size:12.5px;margin-top:6px">Use photos of real people only with their permission. Made photos cost about the same as any HQ picture.</div></div></div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" id="chSv">💾 Save character</button>' + (c.id ? '<button class="btn ghost" id="chDl">🗑️ Delete</button>' : '') + '<button class="btn ghost" id="chX">Cancel</button></div><div class="muted" id="chPg" style="margin-top:6px"></div>');
    var ph = function () { var e = $('#chPh', s); if (cur.img) { e.style.backgroundImage = 'url(' + img(cur.img) + ')'; e.textContent = ''; } else if (cur.eimg) { e.style.backgroundImage = 'url(' + eimg(cur.eimg) + ')'; e.textContent = ''; } else { e.style.backgroundImage = ''; e.textContent = 'No photo yet'; } $('#chMk', s).textContent = cur.img || cur.eimg ? '🔄 Make again' : '✨ Make photo'; };
    ph();
    $('#chMk', s).onclick = function () { var b = this; b.disabled = true; $('#chPg', s).textContent = '✨ Making the reference photo… (about 20 seconds)'; X.api('ch-photo', { look: $('#chL', s).value, outfit: $('#chO', s).value }).then(function (r) { cur = { img: r.img }; ph(); $('#chPg', s).textContent = ''; b.disabled = false; }).catch(function (e) { $('#chPg', s).textContent = ''; b.disabled = false; X.toast(e.message); }); };
    $('#chUp', s).onchange = function () { var f = this.files && this.files[0]; if (!f) return; $('#chPg', s).textContent = 'Adding the photo…'; shrink(f, 1400).then(function (d) { return X.api('img', { dataUrl: d }); }).then(function (r) { cur = { img: r.id }; ph(); $('#chPg', s).textContent = ''; }).catch(function (e) { $('#chPg', s).textContent = ''; X.toast(e.message || 'Couldn’t use that photo.'); }); };
    $('#chX', s).onclick = function () { s.remove(); };
    if ($('#chDl', s)) $('#chDl', s).onclick = function () { if (!confirm('Delete ' + c.name + '? Scenes that use them will just lose the link.')) return; X.api('ch-del', { id: c.id }).then(function () { return load(true); }).then(function () { s.remove(); X.toast('🗑️ Deleted'); if (onSaved) onSaved(null); }).catch(function (e) { X.toast(e.message); }); };
    $('#chSv', s).onclick = function () {
      X.api('ch-save', { id: c.id || '', name: $('#chN', s).value, look: $('#chL', s).value, outfit: $('#chO', s).value, img: cur.img, eimg: cur.img ? '' : cur.eimg, from: c.from || '' })
        .then(function (r) { return load(true).then(function () { s.remove(); X.toast('👥 ' + r.item.name + ' saved'); if (onSaved) onSaved(r.item); }); }).catch(function (e) { X.toast(e.message); });
    };
  }
  // ───── the 👥 Characters page ─────
  function view() {
    $('#ttl').textContent = 'Characters'; $('#topRight').innerHTML = '<button class="btn primary" id="chAdd">➕ New character</button>';
    $('#chAdd').onclick = function () { edit(null, view); };
    $('#view').innerHTML = '<div class="card" style="max-width:980px"><div class="muted">Loading…</div></div>';
    load(true).then(function () {
      var card = function (c, vad) { return '<div style="border:1.5px solid #ECE8DE;border-radius:14px;background:#fff;padding:8px"><img src="' + (vad ? eimg(c.eimg) : img(c.img)) + '" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px;display:block"><b style="display:block;margin-top:6px">' + esc(c.name) + '</b><div class="muted" style="font-size:12px;line-height:1.4;margin-top:2px;max-height:50px;overflow:hidden">' + esc(vad ? 'From “' + (c.project || 'a project') + '”' : c.look) + '</div>' +
        (vad ? '<button class="btn ghost sm" data-imp="' + esc(c.from) + '" style="margin-top:6px;width:100%">➕ Add to my characters</button>' : '<button class="btn ghost sm" data-ed="' + c.id + '" style="margin-top:6px;width:100%">✏️ Edit</button>') + '</div>'; };
      $('#view').innerHTML = '<div style="max-width:980px"><div class="card"><div class="muted" style="font-size:13px">Make a character once — a name, how they look and one reference photo — then pick them on any scene in 🎙️ Voiceover Video or 🎞️ Video Remix (👥 Who’s in it?). ✨ Make picture then keeps their face, hair and outfit the same in every scene, and AI clips made from those pictures keep them too.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-top:12px">' + (ITEMS.length ? ITEMS.map(function (c) { return card(c); }).join('') : '<div class="muted">No characters yet. Tap ➕ New character.</div>') + '</div></div>' +
        (VADS.length ? '<div class="card"><b>From 🎥 Video Ad Studio</b><div class="muted" style="font-size:13px">Characters you made for ad projects — add them here to use them in other videos.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:10px">' + VADS.map(function (c) { return card(c, true); }).join('') + '</div></div>' : '') + '</div>';
      $$('[data-ed]').forEach(function (b) { b.onclick = function () { edit(byId(b.dataset.ed), view); }; });
      $$('[data-imp]').forEach(function (b) { b.onclick = function () { var v = VADS.filter(function (x) { return x.from === b.dataset.imp; })[0]; edit(null, view, { name: v.name, look: v.look, eimg: v.eimg, from: v.from }); }; });
    }).catch(function (e) { $('#view').innerHTML = '<div class="card">' + esc(e.message) + '</div>'; });
  }
  function init(x) { X = x; }
  window.HQChars = { init: init, view: view, chips: chips, pick: pick, load: load };
})();
