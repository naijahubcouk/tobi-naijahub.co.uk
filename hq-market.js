/*
 * Auntie Tobi HQ — 🛍️ Marketplace (admin only). Moved here from Studio Admin; the same listings and actions.
 *  · To review (approve / ask for changes / reject — the owner is emailed, as before) · Waiting for their edit · Live · Ended / hidden · All
 *  · Tap a listing to edit it, pin it to the top, hide it or delete it · Extra listings for Club members
 *  · ✨ Add a product from photos: upload 1–4 photos and type what you know — Auntie Tobi fills the listing (only from the photos and
 *    your words) and links it to the business in the directory. You check it, then Publish now (or keep it hidden as a draft).
 * HQ calls HQMkt.init({ api, sheet, toast, esc, S }) once, then HQMkt.view() for the #mkt page.
 */
(function () {
  'use strict';
  var X = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return X.esc(s); }
  var CATS = ['Fashion', 'Food', 'Beauty', 'Hair', 'Events', 'Gift Hamper', 'Digital Product', 'Services', 'Other'];
  var BTNS = ['Buy Now', 'Book Now', '🎟️ Get Tickets', 'Enquire', 'Learn More'];
  var EMOJI = { Events: '🎉', Hair: '💇🏾‍♀️', 'Gift Hamper': '🎁', 'Digital Product': '💻', Food: '🍲', Beauty: '💄', Fashion: '👗', Services: '🛠️', Other: '🛍️' };
  var ST = { pending: ['🆕 To review', '#B45309'], live: ['🟢 Live', '#057A44'], live_change_pending: ['🟢 Live · change to review', '#B45309'], live_changes_requested: ['🟢 Live · waiting for their edit', '#6B7280'],
    changes: ['✏️ Waiting for their edit', '#6B7280'], rejected: ['✖ Rejected', '#9CA3AF'], hidden: ['🙈 Hidden', '#6B7280'], ended: ['⏹ Ended', '#9CA3AF'], draft: ['Draft', '#9CA3AF'] };
  var SRC = { member: '💚 Club member', public: '🌍 Public form', admin: '🛠️ Added in HQ' };
  function img(ref) { return /^i_/.test(ref) ? '/.netlify/functions/studio-market?img=' + encodeURIComponent(ref) : ref; }
  function day(d) { try { return new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return d; } }
  function pill(st) { var x = ST[st] || [st, '#6B7280']; return '<span class="ak" style="background:' + x[1] + '">' + esc(x[0]) + '</span>'; }
  function cur(x) { return x.draft && /pending|changes/.test(x.status) ? x.draft : (x.live || x.draft || {}); }
  function resize(file, max) {
    return new Promise(function (ok, no) {
      if (!/^image\//.test(file.type)) return no(new Error('Please choose an image.'));
      var u = URL.createObjectURL(file), im = new Image();
      im.onerror = function () { no(new Error('Couldn’t read that image.')); };
      im.onload = function () { var r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.84)); };
      im.src = u;
    });
  }
  async function upload(file) { var d = await resize(file, 1200); if (d.length > 360000) d = await resize(file, 900); if (d.length > 360000) d = await resize(file, 700); var r = await X.api('market-img', { dataUrl: d }); return { id: r.id, dataUrl: d }; }

  // a listing as it looks on the Marketplace
  function card(f, changed) {
    f = f || {}; changed = changed || {};
    var hl = function (k) { return changed[k] ? ' style="background:#FFF4D6;border-radius:4px"' : ''; };
    return '<div style="width:230px;background:#fff;border:1px solid #ECE6D6;border-radius:14px;overflow:hidden;flex:none"><div style="position:relative;aspect-ratio:1;background:#F3F1EC' + (changed.imgs ? ';outline:3px solid #FFB81C' : '') + '">' + (f.imgs && f.imgs.length ? '<img src="' + esc(img(f.imgs[0])) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' : '<span class="muted" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">No photo</span>') +
      '<span style="position:absolute;left:8px;top:8px;background:rgba(255,255,255,.92);border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700"' + hl('category') + '>' + (EMOJI[f.category] || '🛍️') + ' ' + esc(f.category || '') + '</span>' + (f.imgs && f.imgs.length > 1 ? '<span style="position:absolute;right:8px;top:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:999px;padding:1px 8px;font-size:12px">1/' + f.imgs.length + '</span>' : '') + '</div>' +
      '<div style="padding:10px 12px"><b' + hl('name') + '>' + esc(f.name || '') + '</b><div class="muted" style="font-size:13px"' + hl('business') + '>' + esc(f.business || '') + '</div><div style="font-size:13px;margin-top:4px;color:#374151"' + hl('desc') + '>' + esc(f.desc || '') + '</div>' + (f.price ? '<div style="font-weight:800;color:#057A44;margin-top:4px"' + hl('price') + '>' + esc(f.price) + '</div>' : '') +
      '<div style="margin-top:6px;background:#0F1E36;color:#fff;border-radius:8px;padding:5px 10px;font-size:13px;font-weight:700;display:inline-block"' + hl('btnText') + '>' + esc(f.btnText || '') + '</div><div class="muted" style="font-size:12px;margin-top:6px;word-break:break-all"' + hl(f.link ? 'link' : 'wa') + '>' + (f.link ? '🔗 ' + esc(f.link) : f.wa ? '💬 WhatsApp +' + esc(f.wa) : '') + (f.endsAt ? '<br>Ends ' + esc(day(f.endsAt)) : '') + '</div></div></div>';
  }
  function diff(a, b) { var o = {}; if (!a || !b) return o; ['name', 'business', 'category', 'price', 'desc', 'btnText', 'link', 'wa', 'endsAt'].forEach(function (k) { if (String(a[k] || '') !== String(b[k] || '')) o[k] = true; }); if (JSON.stringify(a.imgs || []) !== JSON.stringify(b.imgs || [])) o.imgs = true; return o; }
  function whoLine(x) {
    var c = x.contact || {};
    return '<div style="font-size:13.5px"><span class="ak" style="background:#EEF0F3;color:#374151">' + esc(SRC[x.source] || x.source || '') + '</span> ' + (x.owner ? '<b>' + esc(x.owner) + '</b>' : '') +
      (x.source === 'public' ? ' <b>' + esc(c.name || '') + '</b> · <a href="mailto:' + esc(c.email || '') + '">' + esc(c.email || '') + '</a>' + (c.whatsapp ? ' · WhatsApp ' + esc(c.whatsapp) : '') + (c.instagram ? ' · <a href="https://instagram.com/' + esc(c.instagram) + '" target="_blank" rel="noopener">@' + esc(c.instagram) + '</a>' : '') : '') +
      (x.submittedAt ? ' <span class="muted">· sent ' + esc(new Date(x.submittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span>' : '') + '</div>';
  }
  function linkLine(x) {
    var k = x.link, f = x.draft || x.live || {};
    if (!k && f.bizSlug) return '<div class="muted" style="font-size:13px">🔗 Linked to <a href="/?biz=' + esc(f.bizSlug) + '" target="_blank" rel="noopener">' + esc(f.bizSlug) + '</a></div>';
    if (!k) return '<div class="muted" style="font-size:13px">🔗 Not linked to a directory business — link one with Edit.</div>';
    var who = x.owner || (x.contact && x.contact.email) || '';
    var flag = k.check === 'email_match' ? '<span class="ak" style="background:#057A44">✓ Their email matches</span>' : k.check === 'email_differs' ? '<span class="ak" style="background:#B45309">⚠️ Sent by ' + esc(who) + ' — the listing’s email is different</span>' : '<span class="ak" style="background:#6B7280">No email on the listing — check it’s them</span>';
    return '<div style="font-size:13px">🔗 Linked to <b>' + esc(k.name) + '</b> <span class="muted">· ' + esc(k.cat || '') + (k.loc ? ' · ' + esc(k.loc) : '') + '</span> <a href="' + esc(k.url) + '" target="_blank" rel="noopener">View</a> ' + flag + '</div>';
  }

  // ── list page ──
  async function view(tab) {
    tab = tab || X.S.mkTab || 'review'; X.S.mkTab = tab;
    $('#ttl').textContent = 'Marketplace'; $('#topRight').innerHTML = '';
    $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    var r; try { r = await X.api('market-list'); } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    X.S.mkData = r;
    var L = r.listings, q = (X.S.mkQ || '').toLowerCase(), formUrl = location.origin + '/marketplace/list';
    var isRev = function (x) { return x.status === 'pending' || x.status === 'live_change_pending'; };
    var isWait = function (x) { return x.status === 'changes' || x.status === 'live_changes_requested'; };
    var isLive = function (x) { return x.status === 'live' || x.status === 'live_change_pending' || x.status === 'live_changes_requested'; };
    var isOff = function (x) { return x.status === 'hidden' || x.status === 'ended' || x.status === 'rejected' || x.status === 'draft'; };
    var G = { review: L.filter(isRev), waiting: L.filter(isWait), live: L.filter(isLive), off: L.filter(isOff), all: L };
    if (X.updateBadge) X.updateBadge(G.review.length);
    var shown = G[tab].filter(function (x) { var f = cur(x); return !q || (f.name + ' ' + f.business + ' ' + f.category + ' ' + (x.owner || '')).toLowerCase().indexOf(q) >= 0; });
    var extra = Object.keys(r.allowance || {});
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="card" style="padding:14px 16px;margin-bottom:12px;border:2px solid #057A44"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><b style="font-size:17px">✨ Add a product from photos</b><div class="muted" style="font-size:13px">Upload photos, type what you know — Auntie Tobi fills it in for you to check.</div></div><div class="row" style="gap:6px"><button class="btn primary" id="mkAi">✨ Add a product</button><button class="btn ghost sm" id="mkNew">＋ Add by hand</button></div></div></div>' +
      '<div class="note" style="margin-bottom:12px;font-size:13.5px">Club members manage their own listing in Business Studio (1 each, unless you allow more). Anyone with the form link can send one: <code style="word-break:break-all">' + esc(formUrl) + '</code> <button class="btn ghost sm" id="mkCopy">📋 Copy link</button> <a class="btn ghost sm" href="/marketplace" target="_blank" rel="noopener">View Marketplace</a></div>' +
      '<div class="chipbar" style="margin-bottom:10px">' + [['review', '🆕 To review'], ['waiting', '✏️ Waiting for their edit'], ['live', '🟢 Live'], ['off', '🙈 Ended / hidden'], ['all', 'All']].map(function (t) { return '<button class="chip" data-mt="' + t[0] + '" aria-pressed="' + (t[0] === tab) + '">' + t[1] + ' (' + G[t[0]].length + ')</button>'; }).join('') + '</div>' +
      '<input id="mkQ" placeholder="🔎 Search product, business or owner" value="' + esc(X.S.mkQ || '') + '" style="margin-bottom:10px">' +
      (tab === 'review' || tab === 'waiting' ? (shown.length ? shown.map(function (x) {
        var ch = diff(x.live, x.draft);
        return '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px">' + pill(x.status) + '<button class="btn ghost sm" data-mke="' + esc(x.id) + '">✏️ Edit</button></div><div style="margin:8px 0" class="stack">' + whoLine(x) + linkLine(x) + (x.note ? '<div class="muted" style="font-size:13px"><b>Your note:</b> ' + esc(x.note) + '</div>' : '') + '</div>' +
          (x.live ? '<div class="row" style="align-items:flex-start;gap:14px;flex-wrap:wrap"><div><div class="muted" style="margin-bottom:4px;font-size:13px">Live now</div>' + card(x.live) + '</div><div><div class="muted" style="margin-bottom:4px;font-size:13px">Proposed change' + (Object.keys(ch).length ? ' — changed: <b>' + Object.keys(ch).join(', ') + '</b>' : '') + '</div>' + card(x.draft, ch) + '</div></div>'
            : '<div class="row" style="align-items:flex-start;gap:14px;flex-wrap:wrap">' + card(x.draft) + ((x.draft.imgs || []).length > 1 ? '<div class="row" style="gap:6px;flex-wrap:wrap">' + x.draft.imgs.slice(1).map(function (i) { return '<img src="' + esc(img(i)) + '" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:10px;border:1px solid #ECE6D6">'; }).join('') + '</div>' : '') + '</div>') +
          (tab === 'review' ? '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn primary" data-mka="' + esc(x.id) + '">✅ Approve — go live</button><button class="btn ghost" data-mkc="' + esc(x.id) + '">✏️ Ask for changes</button><button class="btn ghost" data-mkr="' + esc(x.id) + '" style="color:#B42318">✖ ' + (x.live ? 'Reject change' : 'Reject') + '</button></div>' : '<div class="row" style="gap:8px;margin-top:10px;align-items:center"><span class="muted" style="font-size:13px">They’ve been asked to make a change. You can still approve it as it is:</span><button class="btn ghost sm" data-mka="' + esc(x.id) + '">Approve anyway</button></div>') + '</div>';
      }).join('') : '<div class="card muted" style="padding:16px">' + (tab === 'review' ? 'Nothing to review 🎉' : 'Nobody is making changes right now.') + '</div>')
      : '<div class="card" style="padding:4px 14px">' + (shown.length ? shown.map(function (x) {
        var f = cur(x);
        return '<div class="aprow" style="flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;cursor:pointer" data-mke="' + esc(x.id) + '">' + (f.imgs && f.imgs[0] ? '<img src="' + esc(img(f.imgs[0])) + '" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px;flex:none">' : '<div style="width:56px;height:56px;border-radius:10px;background:#F3F1EC;flex:none"></div>') +
          '<div style="flex:1;min-width:0"><b>' + esc(f.name || '') + '</b> ' + pill(x.status) + (x.pinned ? ' <span title="Pinned to the top">📌</span>' : '') + '<div class="muted" style="font-size:13px">' + esc(f.business || '') + ' · ' + esc(f.category || '') + (f.price ? ' · ' + esc(f.price) : '') + (f.endsAt ? ' · ends ' + esc(day(f.endsAt)) : '') + ' · ' + esc(SRC[x.source] || '') + '</div></div>' +
          (x.live ? '<div class="row" style="gap:6px;flex:none"><button class="btn ghost sm" data-mkpin="' + esc(x.id) + '" title="' + (x.pinned ? 'Unpin' : 'Pin to the top') + '">' + (x.pinned ? '📌 Unpin' : '📌 Pin') + '</button><button class="btn ghost sm" data-mkhide="' + esc(x.id) + '">' + (x.hidden ? '👁 Show' : '🙈 Hide') + '</button></div>' : '') + '<span style="font-size:20px;color:#9CA3AF">›</span></div>';
      }).join('') : '<p class="muted" style="padding:12px 0">Nothing here.</p>') + '</div>') +
      '<div class="card" style="padding:14px 16px;margin-top:14px"><b>➕ Extra listings for Club members</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Every Business Club member can have 1 listing. Give someone more here.</p>' +
      (extra.length ? extra.map(function (e) { return '<div class="row" style="justify-content:space-between;border-bottom:1px solid #F0ECE2;padding:6px 0;font-size:14px"><span>' + esc(e) + '</span><span><b>' + r.allowance[e] + '</b> listings <button class="btn ghost sm" data-mkal="' + esc(e) + '">Reset to 1</button></span></div>'; }).join('') : '') +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><input id="alE" placeholder="member@email.com" style="flex:2;min-width:180px"><input id="alN" type="number" min="0" max="50" value="2" style="width:90px"><button class="btn primary sm" id="alSave">Save</button></div></div></div>';
    $$('[data-mt]').forEach(function (b) { b.onclick = function () { view(b.dataset.mt); }; });
    var qt; $('#mkQ').oninput = function () { var v = this.value; clearTimeout(qt); qt = setTimeout(function () { X.S.mkQ = v; view(); setTimeout(function () { var i = $('#mkQ'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 0); }, 350); };
    $('#mkCopy').onclick = function () { try { navigator.clipboard.writeText(formUrl); X.toast('Link copied'); } catch (e) {} };
    $('#mkNew').onclick = function () { edit(null); };
    $('#mkAi').onclick = function () { aiSheet(); };
    $$('[data-mke]').forEach(function (b) { b.onclick = function (e) { if (e.target.closest('[data-mkpin],[data-mkhide]')) return; edit(b.dataset.mke); }; });
    var byId = function (id) { return L.filter(function (x) { return x.id === id; })[0]; };
    var decide = async function (id, d, note) { try { await X.api('market-review', { id: id, decision: d, note: note || '' }); X.toast({ approve: 'Approved — it’s live 🎉', changes: 'Change requested — they’ve been emailed', reject: 'Rejected — they’ve been emailed' }[d]); view(); } catch (e) { X.toast(e.message); } };
    $$('[data-mka]').forEach(function (b) { b.onclick = function () { b.disabled = true; decide(b.dataset.mka, 'approve'); }; });
    $$('[data-mkc]').forEach(function (b) { b.onclick = function () { var n = prompt('What should they change? (This is emailed to them.)', 'Please add a clearer photo of the product.'); if (n) decide(b.dataset.mkc, 'changes', n); }; });
    $$('[data-mkr]').forEach(function (b) { b.onclick = function () { var n = prompt('Reason (optional — emailed to them):', ''); if (n !== null) decide(b.dataset.mkr, 'reject', n); }; });
    var meta = async function (id, m) { var x = byId(id); try { await X.api('market-save', { id: id, listing: cur(x), meta: m }); view(); } catch (e) { X.toast(e.message); } };
    $$('[data-mkpin]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); meta(b.dataset.mkpin, { pinned: !byId(b.dataset.mkpin).pinned }); }; });
    $$('[data-mkhide]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); meta(b.dataset.mkhide, { hidden: !byId(b.dataset.mkhide).hidden }); }; });
    $$('[data-mkal]').forEach(function (b) { b.onclick = async function () { try { await X.api('market-allowance', { email: b.dataset.mkal, n: 1 }); view(); } catch (e) { X.toast(e.message); } }; });
    $('#alSave').onclick = async function () { try { await X.api('market-allowance', { email: $('#alE').value, n: Number($('#alN').value) }); X.toast('Saved'); view(); } catch (e) { X.toast(e.message); } };
  }

  // ── ✨ add a product from photos + your words ──
  function aiSheet() {
    var shots = [];   // { id, dataUrl }
    var s = X.sheet('<h2>✨ Add a product from photos</h2><p class="muted" style="font-size:13.5px;margin:4px 0 10px">1. Add 1–4 photos — product photos, a flyer or a screenshot of their Instagram post. The first is the main photo.<br>2. Type what you know. Auntie Tobi fills the listing from the photos and your words only — you check it before it goes live.</p>' +
      '<div id="aiPh" class="row" style="gap:8px;flex-wrap:wrap"></div>' +
      '<label for="aiT" style="margin-top:10px">What you know <span class="muted" style="font-weight:400">(optional if it’s all in the photos)</span></label><textarea id="aiT" rows="4" placeholder="e.g. Ankara 2-piece set by LuxebyFaith, £45, sizes 8–18, delivers UK-wide, WhatsApp 07700 900123"></textarea>' +
      '<div class="err hidden" id="aiErr"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="aiX">Cancel</button><button class="btn primary" id="aiGo">✨ Fill it in</button></div>');
    var draw = function () {
      $('#aiPh', s).innerHTML = shots.map(function (p, i) { return '<div style="position:relative"><img src="' + p.dataUrl + '" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:10px;border:1px solid #ECE6D6;display:block"><button type="button" data-ax="' + i + '" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#B42318;color:#fff;cursor:pointer">×</button>' + (i ? '<button type="button" data-a1="' + i + '" class="btn ghost sm" style="position:absolute;bottom:3px;left:3px;padding:0 6px;font-size:11px;min-height:20px">Main</button>' : '<span class="ak" style="position:absolute;bottom:4px;left:4px;background:#057A44">Main</span>') + '</div>'; }).join('') +
        (shots.length < 4 ? '<label class="btn ghost" style="margin:0;width:90px;height:90px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;cursor:pointer">📷<br>Add photos<input type="file" id="aiF" accept="image/*" multiple hidden></label>' : '');
      $$('[data-ax]', s).forEach(function (b) { b.onclick = function () { shots.splice(+b.dataset.ax, 1); draw(); }; });
      $$('[data-a1]', s).forEach(function (b) { b.onclick = function () { shots.unshift(shots.splice(+b.dataset.a1, 1)[0]); draw(); }; });
      if ($('#aiF', s)) $('#aiF', s).onchange = async function () { var fs = Array.prototype.slice.call(this.files || [], 0, 4 - shots.length); this.value = ''; for (var i = 0; i < fs.length; i++) { try { X.toast('Adding photo…'); shots.push(await upload(fs[i])); } catch (e) { X.toast(e.message); } } draw(); };
    };
    draw();
    $('#aiX', s).onclick = function () { s.remove(); };
    $('#aiGo', s).onclick = async function () {
      var t = $('#aiT', s).value.trim(), btn = this;
      if (!shots.length && t.length < 5) { $('#aiErr', s).textContent = 'Add a photo or type a few words about the product.'; $('#aiErr', s).classList.remove('hidden'); return; }
      btn.disabled = true; btn.textContent = 'Reading… (up to a minute)'; $('#aiErr', s).classList.add('hidden');
      try {
        var r = await X.api('market-ai', { images: shots.map(function (p) { return p.dataUrl; }), text: t });
        var f = Object.assign(r.draft, { imgs: shots.map(function (p) { return p.id; }) });
        s.remove(); edit(null, { f: f, biz: r.biz, fromAi: true });
      } catch (e) { $('#aiErr', s).textContent = e.message; $('#aiErr', s).classList.remove('hidden'); btn.disabled = false; btn.textContent = '✨ Fill it in'; }
    };
  }

  // ── edit / add ──
  async function edit(id, pre) {
    var x = null, allowance = null;
    if (id) { try { var r = await X.api('market-get', { id: id }); x = r.listing; allowance = r.allowance; } catch (e) { X.toast(e.message); return; } }
    var draftMode = !!(x && x.draft && /pending|changes/.test(x.status));
    var f = pre && pre.f ? pre.f : x ? Object.assign({}, draftMode ? x.draft : x.live) : { business: '', name: '', category: 'Other', price: '', desc: '', btnText: 'Enquire', link: '', wa: '', endsAt: '', bizSlug: '', imgs: [] };
    f.imgs = (f.imgs || []).slice();
    var bz = pre && pre.biz ? pre.biz : x && x.link && x.link.slug ? x.link : f.bizSlug ? { slug: f.bizSlug, name: f.bizSlug, url: '/?biz=' + f.bizSlug } : null;
    var s, isNew = !x;
    function draw() {
      if (s) s.remove();
      s = X.sheet('<h2>' + (x ? '✏️ Edit listing' : pre && pre.fromAi ? '✨ Check the product' : '＋ Add a listing') + '</h2>' +
        (pre && pre.fromAi ? '<div class="note" style="font-size:13.5px;margin-bottom:8px">Filled in from your photos and words — check everything, then publish. Highlighted boxes are empty: add them if you know them.</div>' : '') +
        (x ? '<div class="muted" style="font-size:13px">' + (draftMode ? 'You’re editing the version waiting for review — approve it afterwards to publish.' : 'Changes go live straight away.') + '</div>' + whoLine(x) : '') +
        '<div style="margin-top:8px"><b>Photos</b> <span class="muted" style="font-size:13px">(up to 4, the first is the main photo)</span><div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap">' + f.imgs.map(function (ref, i) { return '<div style="position:relative"><img src="' + esc(img(ref)) + '" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid #ECE6D6;display:block"><button type="button" data-phx="' + i + '" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#B42318;color:#fff;cursor:pointer">×</button>' + (i ? '<button type="button" class="btn ghost sm" data-ph1="' + i + '" style="position:absolute;bottom:3px;left:3px;padding:0 6px;font-size:11px;min-height:20px">Main</button>' : '<span class="ak" style="position:absolute;bottom:4px;left:4px;background:#057A44">Main</span>') + '</div>'; }).join('') +
        (f.imgs.length < 4 ? '<label class="btn ghost" style="margin:0;width:84px;height:84px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;cursor:pointer">📷<br>Add<input type="file" accept="image/*" id="mkPh" multiple hidden></label>' : '') + '</div></div>' +
        '<div class="f2" style="margin-top:10px"><div><label for="mkN">Product name</label><input id="mkN" value="' + esc(f.name) + '"></div><div><label for="mkB">Business</label><input id="mkB" value="' + esc(f.business) + '"></div></div>' +
        '<div class="f2"><div><label for="mkC">Category</label><select id="mkC">' + CATS.map(function (c) { return '<option' + (f.category === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div><div><label for="mkP">Price</label><input id="mkP" value="' + esc(f.price) + '" placeholder="£45"></div></div>' +
        '<div><label for="mkD">Description</label><textarea id="mkD" rows="4">' + esc(f.desc) + '</textarea></div>' +
        '<div class="f2"><div><label for="mkL">Web link</label><input id="mkL" value="' + esc(f.link) + '" placeholder="https://… (or leave empty for WhatsApp)"></div><div><label for="mkW">WhatsApp number</label><input id="mkW" value="' + esc(f.wa) + '"></div></div>' +
        '<div class="f2"><div><label for="mkT">Button</label><select id="mkT">' + BTNS.map(function (b) { return '<option' + (f.btnText === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div><div><label for="mkE">End date <span class="muted" style="font-weight:400">(events / offers)</span></label><input type="date" id="mkE" value="' + esc(f.endsAt || '') + '"></div></div>' +
        '<div><label>Business in the directory</label><div id="mkBz"></div></div>' +
        '<div><label for="mkO">Owner (Club member email) <span class="muted" style="font-weight:400">— optional, lets them edit it in Business Studio</span></label><input id="mkO" value="' + esc(x ? x.owner || '' : '') + '"></div>' +
        (x && x.owner ? '<div class="muted" style="font-size:13px">This member can have <b>' + allowance + '</b> listing' + (allowance === 1 ? '' : 's') + '.</div>' : '') +
        '<div class="row" style="gap:16px;flex-wrap:wrap"><label style="margin:0;display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="mkPin" style="width:18px;height:18px"' + (x && x.pinned ? ' checked' : '') + '> 📌 Pin to the top</label><label style="margin:0;display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="mkHid" style="width:18px;height:18px"' + (x && x.hidden ? ' checked' : '') + '> 🙈 Hide from the Marketplace</label></div>' +
        '<div class="err hidden" id="mkErr"></div><div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">' + (isNew ? '<button class="btn primary" id="mkSave">🟢 Publish now</button><button class="btn ghost" id="mkDraft">💾 Save as draft (hidden)</button>' : '<button class="btn primary" id="mkSave">💾 Save</button>') + '<button class="btn ghost" id="mkX">Close</button>' + (x ? '<button class="btn ghost" id="mkDel" style="margin-left:auto;color:#B42318">🗑 Delete</button>' : '') + '</div>');
      if (pre && pre.fromAi) ['#mkN', '#mkB', '#mkP', '#mkD'].forEach(function (k) { var el = $(k, s); if (el && !el.value.trim()) el.style.background = '#FFF4D6'; });
      var keep = function () { f.name = $('#mkN', s).value; f.business = $('#mkB', s).value; f.category = $('#mkC', s).value; f.price = $('#mkP', s).value; f.desc = $('#mkD', s).value; f.link = $('#mkL', s).value; f.wa = $('#mkW', s).value; f.btnText = $('#mkT', s).value; f.endsAt = $('#mkE', s).value; f.bizSlug = bz && bz.slug ? bz.slug : ''; };
      picker($('#mkBz', s), bz, function (v) { bz = v; if (v && v.slug) { if (!$('#mkB', s).value.trim()) $('#mkB', s).value = v.name; } });
      $$('[data-phx]', s).forEach(function (b) { b.onclick = function () { keep(); f.imgs.splice(+b.dataset.phx, 1); draw(); }; });
      $$('[data-ph1]', s).forEach(function (b) { b.onclick = function () { keep(); f.imgs.unshift(f.imgs.splice(+b.dataset.ph1, 1)[0]); draw(); }; });
      if ($('#mkPh', s)) $('#mkPh', s).onchange = async function () { keep(); var fs = Array.prototype.slice.call(this.files || [], 0, 4 - f.imgs.length); this.value = ''; for (var i = 0; i < fs.length; i++) { try { f.imgs.push((await upload(fs[i])).id); } catch (e) { X.toast(e.message); } } draw(); };
      $('#mkX', s).onclick = function () { s.remove(); };
      if ($('#mkDel', s)) $('#mkDel', s).onclick = async function () { if (!confirm('Delete this listing and its photos? This can’t be undone.')) return; try { await X.api('market-delete', { id: x.id }); X.toast('Deleted'); s.remove(); view(); } catch (e) { X.toast(e.message); } };
      var go = async function (btn, hide) {
        keep(); btn.disabled = true; $('#mkErr', s).classList.add('hidden');
        try { await X.api('market-save', { id: x ? x.id : '', listing: f, meta: { owner: $('#mkO', s).value.trim(), pinned: $('#mkPin', s).checked, hidden: hide || $('#mkHid', s).checked } }); X.toast(x ? 'Saved' : hide ? 'Saved as a draft — hidden until you show it' : 'Published — it’s live 🎉'); s.remove(); view(x ? undefined : hide ? 'off' : 'live'); }
        catch (e) { $('#mkErr', s).textContent = e.message; $('#mkErr', s).classList.remove('hidden'); btn.disabled = false; }
      };
      $('#mkSave', s).onclick = function () { go(this, false); };
      if ($('#mkDraft', s)) $('#mkDraft', s).onclick = function () { go(this, true); };
    }
    draw();
  }

  // link a product to its business in the directory (search by name)
  function picker(box, initial, onChange) {
    var state = initial && initial.slug ? initial : null, timer = null, seq = 0;
    var cap = function (t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };
    function set(v) { state = v; drawP(); onChange(v); }
    function drawP() {
      if (state) {
        box.innerHTML = '<div class="row" style="justify-content:space-between;align-items:center;gap:8px;background:#E8F4EC;border-radius:10px;padding:8px 12px"><div style="font-size:14px">✓ <b>' + esc(state.name) + '</b>' + (state.cat || state.loc ? ' <span class="muted">· ' + esc(cap(state.cat)) + (state.loc ? ' · ' + esc(state.loc) : '') + '</span>' : '') + '</div><div class="row" style="gap:6px">' + (state.url ? '<a class="btn ghost sm" href="' + esc(state.url) + '" target="_blank" rel="noopener">View</a>' : '') + '<button type="button" class="btn ghost sm" data-bz="x">Change</button></div></div>';
        $('[data-bz]', box).onclick = function () { set(null); setTimeout(function () { var i = $('input', box); if (i) i.focus(); }, 0); };
        return;
      }
      box.innerHTML = '<input type="search" placeholder="🔎 Type the business name (optional)" autocomplete="off"><div data-res style="margin-top:4px"></div>';
      var inp = $('input', box), res = $('[data-res]', box);
      inp.oninput = function () {
        clearTimeout(timer); var q = inp.value.trim(); if (q.length < 2) { res.innerHTML = ''; return; }
        timer = setTimeout(function () { var my = ++seq;
          fetch('/.netlify/functions/studio-market?bizq=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (d) {
            if (my !== seq) return; var list = (d && d.results) || [];
            res.innerHTML = list.length ? list.map(function (b, i) { return '<button type="button" class="aprow" data-i="' + i + '" style="width:100%;text-align:left;background:#fff;border:0;cursor:pointer;flex-direction:row;gap:8px"><b>' + esc(b.name) + '</b> <span class="muted">' + esc(cap(b.cat)) + (b.loc ? ' · ' + esc(b.loc) : '') + '</span></button>'; }).join('') : '<div class="muted" style="font-size:13px">No business found with that name.</div>';
            $$('[data-i]', res).forEach(function (el) { el.onclick = function () { set(list[+el.dataset.i]); }; });
          }).catch(function () { if (my === seq) res.innerHTML = '<div class="muted" style="font-size:13px">Couldn’t search just now.</div>'; });
        }, 250);
      };
    }
    drawP();
  }

  window.HQMkt = { init: function (o) { X = o; }, view: function () { view(); }, count: async function () { try { var r = await X.api('market-list'); return r.listings.filter(function (x) { return x.status === 'pending' || x.status === 'live_change_pending'; }).length; } catch (e) { return 0; } } };
})();
