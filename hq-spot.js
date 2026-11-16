/*
 * ⭐ HQ → Spotlight (admin only): one place to make businesses Featured, Verified and show them on Home & Links.
 * Ticks made here stick — the website sync won't undo them. Changes reach the app on its normal refresh.
 */
(function () {
  'use strict';
  var X = null, L = null, q = '';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return X.esc(s == null ? '' : String(s)); };
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var photo = function (b) { return b.carImg || b.img; };

  async function view() {
    $('#ttl').textContent = 'Spotlight'; $('#topRight').innerHTML = '';
    if (!L) $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { L = (await X.api('spot-list')).items; } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    draw();
  }

  function sw(b, k, on, label, off) {
    return '<button class="spsw' + (on ? ' on' : '') + '" data-k="' + k + '" data-s="' + esc(b.slug) + '" aria-pressed="' + on + '"' + (off ? ' disabled title="' + esc(off) + '"' : '') + '>' + label + '</button>';
  }
  function row(b, opt) {
    opt = opt || {};
    var car = b.featured && b.home, warn = car && !photo(b);
    return '<div class="sprow">' +
      (photo(b) ? '<img src="' + esc(photo(b)) + '" alt="" loading="lazy">' : '<div class="spnoimg">🏪</div>') +
      '<div class="spmain"><div class="spname">' + esc(b.name) + (b.hidden ? ' <span class="muted" style="font-size:12px">· 🙈 hidden</span>' : '') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + esc([b.cat, (b.loc || '').split(',')[0]].filter(Boolean).join(' · ')) + '</div>' +
      (warn ? '<div class="spwarn">⚠️ No photo, so it won’t show in the carousel. <button class="link" data-photo="' + esc(b.slug) + '">Add a picture</button></div>' : '') +
      '<div class="spsws">' + sw(b, 'featured', b.featured, '⭐ Featured') + sw(b, 'verified', b.verified, '✅ Verified') +
      sw(b, 'home', car, '🏠 Home & Links', b.featured ? '' : 'Make it Featured first') +
      (car ? sw(b, 'pin', b.rank > 0, '📌 Pin first') : '') + '</div></div>' +
      (opt.move ? '<div class="spmv"><button data-up="' + esc(b.slug) + '" aria-label="Move up"' + (opt.first ? ' disabled' : '') + '>⬆️</button><button data-dn="' + esc(b.slug) + '" aria-label="Move down"' + (opt.last ? ' disabled' : '') + '>⬇️</button></div>' : '') +
      '</div>';
  }
  function list(title, sub, items, opt) {
    return '<h2 style="margin:22px 0 4px">' + title + ' <span class="muted" style="font-weight:600">(' + items.length + ')</span></h2>' + (sub ? '<p class="muted" style="margin:0 0 8px;font-size:13.5px">' + sub + '</p>' : '') +
      (items.length ? '<div class="card" style="padding:4px 14px">' + items.map(function (b, i) { return row(b, opt ? { move: true, first: i === 0, last: i === items.length - 1 } : null); }).join('') + '</div>' : '<p class="muted" style="font-size:13.5px">None yet.</p>');
  }

  function draw() {
    var vis = L.filter(function (b) { return !b.hidden; });
    var car = vis.filter(function (b) { return b.featured && b.home; });
    var pinned = car.filter(function (b) { return b.rank > 0; }).sort(function (a, b) { return a.rank - b.rank; });
    var turns = car.filter(function (b) { return !(b.rank > 0); });
    var live = pinned.concat(turns).filter(photo);
    var featOff = L.filter(function (b) { return b.featured && !b.home; });
    var ver = L.filter(function (b) { return b.verified; });
    var found = q ? L.filter(function (b) { return norm(b.name).indexOf(norm(q)) > -1 || norm(b.slug).indexOf(norm(q)) > -1; }).slice(0, 8) : [];

    var h = '<div class="wrap" style="max-width:900px">' + css() +
      '<p class="muted" style="margin:0 0 12px">Make a business <b>Featured</b>, <b>Verified</b> or show it in the <b>Home & Links</b> carousel. Your choices stick, even when the website syncs. The app picks them up within a few minutes.</p>' +
      '<div class="card" style="padding:12px 14px"><input id="spQ" type="search" placeholder="🔎 Find a business by name…" value="' + esc(q) + '" style="width:100%" autocomplete="off">' +
      (q ? (found.length ? found.map(function (b) { return row(b); }).join('') : '<p class="muted" style="margin:10px 0 2px">No business called that — check the spelling.</p>') : '') + '</div>' +
      '<h2 style="margin:22px 0 8px">👀 Preview <span class="muted" style="font-weight:600;font-size:14px">— the Home & Links carousel, in order</span></h2>' +
      (live.length ? '<div class="spprev">' + live.map(function (b, i) { return '<div class="spcard"><img src="' + esc(photo(b)) + '" alt=""><div><b>' + esc(b.name) + '</b><span>' + (b.rank > 0 ? '📌 ' + (i + 1) : '🔀 takes turns') + '</span></div></div>'; }).join('') + '</div>' : '<p class="muted">Nothing in the carousel yet.</p>') +
      list('📌 Pinned to the front', 'Always shown first, in this order. Use ⬆️ ⬇️ to change it.', pinned, true) +
      list('🔀 On Home & Links, taking turns', 'Shown after the pinned ones, in a new order each time so everyone gets seen.', turns) +
      list('⭐ Featured, not on Home & Links', 'Still Featured everywhere else in the app (gold card, full details, photos).', featOff) +
      list('✅ Verified', '', ver) + '</div>';
    $('#view').innerHTML = h;

    var qi = $('#spQ'); qi.oninput = function () { q = qi.value; var p = qi.selectionStart; draw(); var n = $('#spQ'); n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} };
    $$('.spsw').forEach(function (b) {
      b.onclick = async function () {
        if (b.disabled) return;
        var set = {}; set[b.dataset.k] = b.getAttribute('aria-pressed') !== 'true';
        if (b.dataset.k === 'home' && set.home === false && !confirm('Take it off the Home & Links carousel? It stays Featured.')) return;
        if (b.dataset.k === 'featured' && set.featured === false && !confirm('Remove Featured? It also comes off the Home & Links carousel.')) return;
        b.disabled = true;
        try { L = (await X.api('spot-set', { slug: b.dataset.s, set: set })).items; X.toast(msg(b.dataset.k, set[b.dataset.k])); draw(); }
        catch (e) { b.disabled = false; X.toast(e.message); }
      };
    });
    var move = async function (slug, d) {
      var order = pinned.map(function (b) { return b.slug; }), i = order.indexOf(slug), j = i + d;
      if (i < 0 || j < 0 || j >= order.length) return;
      order[i] = order[j]; order[j] = slug;
      try { L = (await X.api('spot-order', { slugs: order })).items; draw(); } catch (e) { X.toast(e.message); }
    };
    $$('[data-up]').forEach(function (b) { b.onclick = function () { move(b.dataset.up, -1); }; });
    $$('[data-dn]').forEach(function (b) { b.onclick = function () { move(b.dataset.dn, 1); }; });
    $$('[data-photo]').forEach(function (b) { b.onclick = function () { if (window.HQOpenBiz) window.HQOpenBiz(b.dataset.photo, function () { L = null; view(); }); }; });
  }
  function msg(k, on) {
    return { featured: on ? '⭐ Featured' : 'No longer Featured', verified: on ? '✅ Verified' : 'Verified badge removed', home: on ? '🏠 Added to Home & Links' : 'Taken off Home & Links', pin: on ? '📌 Pinned to the front' : 'Unpinned — it takes turns now' }[k];
  }
  function css() {
    return '<style>.sprow{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line,#ECE7DC)}.card>.sprow:first-child,.card input+.sprow{border-top:0}.card input+.sprow{margin-top:8px}' +
      '.sprow img,.spnoimg{width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;background:#F1EEE6}.spnoimg{display:flex;align-items:center;justify-content:center;font-size:24px}' +
      '.spmain{flex:1;min-width:0}.spname{font-weight:800;font-size:15px}.spsws{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
      '.spsw{border:1.5px solid #D9D3C5;background:#fff;color:#4B5563;border-radius:20px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:0}' +
      '.spsw.on{background:#057A44;border-color:#057A44;color:#fff}.spsw[data-k=featured].on{background:#0F1E36;border-color:#0F1E36;color:#FFB81C}.spsw[data-k=pin].on{background:#FFB81C;border-color:#FFB81C;color:#0F1E36}.spsw:disabled{opacity:.45;cursor:not-allowed}' +
      '.spwarn{margin-top:6px;font-size:13px;background:#FFF4D6;color:#7A5300;border-radius:8px;padding:6px 9px}.spwarn .link{font-weight:800;color:#7A5300;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer;font:inherit}' +
      '.spmv{display:flex;flex-direction:column;gap:4px}.spmv button{border:1px solid #E2DDD0;background:#fff;border-radius:8px;padding:4px 7px;cursor:pointer;min-height:0}.spmv button:disabled{opacity:.3}' +
      '.spprev{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.spcard{flex:0 0 150px;background:#fff;border:1.5px solid #FFB81C;border-radius:12px;overflow:hidden}.spcard img{width:100%;height:110px;object-fit:cover;display:block;background:#0F1E36}' +
      '.spcard div{padding:7px 9px}.spcard b{display:block;font-size:13px;line-height:1.25}.spcard span{font-size:11.5px;color:#6B7280}</style>';
  }

  window.HQSpot = { init: function (x) { X = x; }, view: view };
})();
