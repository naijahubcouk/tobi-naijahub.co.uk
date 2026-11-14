/*
 * ✨ HQ → Instagram Revamp (admin only): the paid page-revamp service, client by client, through the 10 steps.
 *   Part 1: clients board, the 10 steps, the client's form link, page audit, competitors (+ a library by category),
 *   check-in numbers and ready-to-send WhatsApp messages A–F.
 */
(function () {
  'use strict';
  var X = null, D = null, LIB = null;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return X.esc(s == null ? '' : String(s)); };
  var todayIso = function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  var addDays = function (s, n) { var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  var nice = function (s) { return s ? new Date(String(s).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; };
  var gbp = function (n) { return '£' + Number(n || 0).toLocaleString('en-GB'); };
  var SITE = location.origin;

  function stepNow(c) { for (var i = 1; i <= 10; i++) if (!(c.done || {})[i]) return i; return 11; }
  function column(c) {
    var d = c.done || {};
    if (d[10]) return 'done';
    if (!d[2]) return 'enq';
    if (!d[3]) return 'form';
    if (!d[8]) return 'work';
    if (c.checkin && c.checkin <= todayIso() || d[9]) return 'check';
    return 'sent';
  }
  var COLS = [['enq', 'Enquiries (not paid)'], ['form', 'Waiting for form'], ['work', 'Working on it'], ['sent', 'Delivered'], ['check', 'Check-in & review']];
  function pill(t, k) { var c = { g: ['#E3F2EA', '#057A44'], y: ['#FFF1CF', '#7A5300'], r: ['#FDE2E1', '#B42318'], b: ['#E7EFFD', '#1D3D7A'] }[k || 'b']; return '<span style="display:inline-block;font-size:11.5px;font-weight:800;border-radius:10px;padding:2px 8px;margin-top:5px;background:' + c[0] + ';color:' + c[1] + '">' + t + '</span>'; }

  async function load() { D = await X.api('gu-list'); }
  async function view() {
    $('#ttl').textContent = 'Instagram Revamp';
    $('#topRight').innerHTML = '<button class="btn primary" id="guNew">＋ New client</button>';
    $('#guNew').onclick = function () { details(null); };
    var main = $('#view'); main.innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { await load(); } catch (e) { main.innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    if (PENDING) { var p = PENDING; PENDING = null; if (byId(p)) return client(p); }
    board();
  }
  function board() {
    var main = $('#view'), t = todayIso(), cs = D.clients, mon = t.slice(0, 7);
    var active = cs.filter(function (c) { return !(c.done || {})[10]; });
    var dueWk = active.filter(function (c) { return c.due && !(c.done || {})[8] && c.due <= addDays(t, 7); });
    var chk = active.filter(function (c) { return c.checkin && c.checkin <= t && !(c.done || {})[9]; });
    var money = cs.filter(function (c) { return String(c.paidAt || '').slice(0, 7) === mon; }).reduce(function (s, c) { return s + (c.price || 0); }, 0);
    var tile = function (n, l) { return '<div class="card" style="padding:12px;text-align:center;flex:1;min-width:120px"><div style="font-size:22px;font-weight:800">' + n + '</div><div class="muted" style="font-size:12.5px">' + l + '</div></div>'; };
    var card = function (c) {
      var d = c.done || {}, n = stepNow(c), late = c.due && !d[8] && c.due < t, col = column(c);
      var p = col === 'enq' ? pill('Not paid yet', 'y') : col === 'form' ? pill('Form sent', 'y') : col === 'work' ? pill('Step ' + n + ' · ' + D.steps[n - 1], late ? 'r' : 'b') : col === 'sent' ? pill('Check-in ' + nice(c.checkin), 'g') : col === 'check' ? pill(d[9] ? 'Ask for a review' : 'Check-in due', 'r') : pill('Finished', 'g');
      return '<div class="card" data-gu="' + esc(c.id) + '" style="padding:10px 12px;margin-bottom:8px;cursor:pointer"><b style="display:block">' + esc(c.name) + '</b><div class="muted" style="font-size:12.5px">' + esc((D.pkgs[c.pkg] || {}).name || '') + (c.due && !d[8] ? ' · due ' + nice(c.due) : c.paidAt ? ' · paid ' + nice(c.paidAt) : '') + (late ? ' · <b style="color:#B42318">late</b>' : '') + '</div>' + p + '</div>';
    };
    var fin = cs.filter(function (c) { return column(c) === 'done'; });
    main.innerHTML = '<div class="wrap">' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">' + tile(active.length, 'active clients') + tile(dueWk.length, 'due this week') + tile(chk.length, 'check-ins due') + tile(gbp(money), 'paid this month') + '</div>' +
      (cs.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;align-items:start">' + COLS.map(function (k) {
        var list = cs.filter(function (c) { return column(c) === k[0]; });
        return '<div><div style="font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#6B7280;margin:0 2px 8px">' + k[1] + ' (' + list.length + ')</div>' + list.map(card).join('') + '</div>';
      }).join('') + '</div>' : '<div class="card" style="padding:18px"><b>No clients yet</b><p class="muted" style="margin-top:6px">Tap <b>＋ New client</b> when someone asks about an Instagram Revamp. You’ll get their form link and ready-to-send messages.</p></div>') +
      (fin.length ? '<details style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">✅ Finished (' + fin.length + ')</summary><div style="margin-top:8px">' + fin.map(card).join('') + '</div></details>' : '') + '</div>';
    $$('[data-gu]', main).forEach(function (el) { el.onclick = function () { client(el.dataset.gu); }; });
  }

  // ── one client ──
  var cur = null;
  function byId(id) { return D.clients.filter(function (c) { return c.id === id; })[0]; }
  function put(c) { var i = D.clients.findIndex(function (x) { return x.id === c.id; }); if (i >= 0) D.clients[i] = c; else D.clients.unshift(c); cur = c; }
  async function save(fields, quiet) { var r = await X.api('gu-save', { client: Object.assign({ id: cur.id }, fields) }); put(r.client); if (!quiet) X.toast('✅ Saved'); return r.client; }

  function client(id) {
    cur = byId(id); if (!cur) return board();
    var c = cur, d = c.done || {}, n = stepNow(c), main = $('#view');
    $('#ttl').textContent = c.name;
    $('#topRight').innerHTML = '<button class="btn ghost" id="guBack">← All clients</button> <button class="btn ghost" id="guEdit">✏️ Details</button>';
    $('#guBack').onclick = function () { $('#ttl').textContent = 'Instagram Revamp'; $('#topRight').innerHTML = '<button class="btn primary" id="guNew">＋ New client</button>'; $('#guNew').onclick = function () { details(null); }; board(); };
    $('#guEdit').onclick = function () { details(c); };
    var bar = '<div style="display:flex;gap:4px;margin:4px 0 14px">' + D.steps.map(function (s, i) {
      var k = i + 1, on = !!d[k], now = k === n;
      return '<button data-step="' + k + '" title="' + (on ? 'Done ' + nice(d[k]) + ' — tap to undo' : 'Tap when done') + '" style="flex:1;border:0;background:none;cursor:pointer;font:inherit;font-size:11px;font-weight:700;color:' + (on ? '#057A44' : now ? '#0F1E36' : '#9CA3AF') + ';padding:0"><i style="display:block;height:7px;border-radius:4px;margin-bottom:5px;background:' + (on ? '#057A44' : now ? '#FFB81C' : '#E5E1D6') + '"></i>' + (on ? '✓ ' : '') + k + ' ' + s + '</button>';
    }).join('') + '</div>';
    var formUrl = SITE + '/glowup-form?t=' + encodeURIComponent(c.token);
    var head = '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><div><b style="font-size:17px">' + esc(c.name) + '</b>' + (c.handle ? ' · <a href="https://www.instagram.com/' + esc(c.handle) + '/" target="_blank" rel="noopener">@' + esc(c.handle) + '</a>' : '') +
      '<div class="muted" style="font-size:13px;margin-top:2px">' + esc((D.pkgs[c.pkg] || {}).name) + ' · ' + gbp(c.price) + (c.paidAt ? ' · paid ' + nice(c.paidAt) : ' · <b style="color:#B42318">not paid yet</b>') + (c.due ? ' · due ' + nice(c.due) : '') + (c.checkin ? ' · check-in ' + nice(c.checkin) : '') + (c.cat ? ' · ' + esc(c.cat) : '') + '</div>' + (c.listing ? '<div style="font-size:13px;margin-top:4px">🏢 <a href="' + esc(c.listing.url) + '" target="_blank" rel="noopener">Auntie Tobi listing</a>' + (c.listing.loc ? ' · ' + esc(c.listing.loc) : '') + (c.listing.website ? ' · <a href="' + esc(/^https?:/.test(c.listing.website) ? c.listing.website : 'https://' + c.listing.website) + '" target="_blank" rel="noopener">website</a>' : '') + '</div>' + (c.listing.desc ? '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(c.listing.desc.slice(0, 220)) + (c.listing.desc.length > 220 ? '…' : '') + '</div>' : '') : '') + '</div>' +
      (!c.paidAt ? '<button class="btn primary sm" id="guPaid">💷 Mark as paid today</button>' : '') + '</div>' + (c.notes ? '<div style="font-size:13.5px;margin-top:8px;white-space:pre-wrap">' + esc(c.notes) + '</div>' : '') + '</div>';
    main.innerHTML = '<div class="wrap">' + bar + head +
      sec('3', '📝 Their form', formBox(c, formUrl)) +
      sec('4', '🔍 Page audit', auditBox(c)) +
      (c.pkg === 'starter' ? '' : sec('5', '👀 Competitors', compBox(c))) +
      sec('6', '✨ Plan, report and send (steps 6–8)', '<p class="muted" style="font-size:13.5px">For now, build the plan in Business Studio and the report from the master template, then tick steps 6, 7 and 8 above. Ticking <b>8 Send</b> sets the 30-day check-in date. <i>Coming in Part 2: ✨ Draft buttons and the report page made here.</i></p>') +
      sec('9', '📈 30-day check-in', checkBox(c)) +
      sec('', '💬 Messages', msgBox(c)) +
      '<div style="text-align:right;margin-top:6px"><button class="btn ghost sm" id="guDel" style="color:#B42318">Delete client</button></div></div>';
    $$('[data-step]', main).forEach(function (b) { b.onclick = async function () { var k = b.dataset.step, on = !(cur.done || {})[k]; try { var r = await X.api('gu-step', { id: cur.id, n: k, on: on }); put(r.client); client(cur.id); } catch (e) { X.toast(e.message); } }; });
    if ($('#guPaid')) $('#guPaid').onclick = async function () { try { await save({ paidAt: todayIso() }); client(cur.id); } catch (e) { X.toast(e.message); } };
    $('#guDel').onclick = async function () { if (!confirm('Delete ' + c.name + ' and everything saved for them?')) return; try { await X.api('gu-del', { id: c.id }); D.clients = D.clients.filter(function (x) { return x.id !== c.id; }); $('#guBack').click(); } catch (e) { X.toast(e.message); } };
    bindForm(c, formUrl); bindAudit(c); bindComp(c); bindCheck(c); bindMsgs(c, formUrl);
  }
  function sec(k, title, body) { var on = k && (cur.done || {})[k]; return '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div style="font-weight:800;font-size:15.5px;margin-bottom:8px">' + title + (on ? ' ' + pill('Done', 'g') : '') + '</div>' + body + '</div>'; }

  function formBox(c, url) {
    var f = c.form, h = '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><input readonly value="' + esc(url) + '" style="flex:1;min-width:220px;font-size:13px"><button class="btn ghost sm" id="fCopy">📋 Copy link</button><a class="btn ghost sm" href="' + esc(url) + '" target="_blank" rel="noopener">👁 Open</a>' + (f ? '<button class="btn ghost sm" id="fRe">↩️ Let them edit it</button>' : '') + '<button class="btn ghost sm" id="fType">✏️ ' + (f ? 'Edit answers' : 'Type their answers') + '</button></div>';
    if (!f) return h + '<p class="muted" style="font-size:13px;margin-top:8px">Send them this link (message B below) — 5 quick questions. Or ask on WhatsApp and tap ✏️ Type their answers. Step 3 ticks itself either way.</p>';
    return h + '<div style="margin-top:10px;font-size:14px">' + D.questions.map(function (q, i) { var a = f.answers[q[0]]; return a ? '<div style="padding:7px 0;border-top:1px solid var(--line,#eee)"><div class="muted" style="font-size:12.5px">' + (i + 1) + '. ' + esc(q[1]) + '</div><div style="white-space:pre-wrap">' + esc(a) + '</div></div>' : ''; }).join('') + '<div class="muted" style="font-size:12px;margin-top:4px">Sent ' + nice(f.at) + '</div></div>';
  }
  function bindForm(c, url) {
    var cp = $('#fCopy'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(url); X.toast('📋 Link copied'); } catch (e) { prompt('Copy the link', url); } };
    $('#fType').onclick = function () {
      var A = (c.form && c.form.answers) || {};
      var s = X.sheet('<h3 style="margin:0 0 8px">✏️ ' + esc(c.name) + '’s answers</h3>' + D.questions.map(function (q, i) {
        var k = q[0], lab = '<label for="ta_' + k + '">' + (i + 1) + '. ' + esc(q[1]) + '</label>';
        if (q[2] === 'choice') return lab + '<select id="ta_' + k + '"><option value=""></option>' + q[3].map(function (o) { return '<option' + (A[k] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
        return lab + (q[2] === 'long' ? '<textarea id="ta_' + k + '" rows="3">' + esc(A[k] || '') + '</textarea>' : '<input id="ta_' + k + '" value="' + esc(A[k] || '') + '">');
      }).join('') + '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="taX">Cancel</button><button class="btn primary" id="taGo">Save answers</button></div>');
      $('#taX', s).onclick = function () { s.remove(); };
      $('#taGo', s).onclick = async function () { var a = {}; D.questions.forEach(function (q) { a[q[0]] = $('#ta_' + q[0], s).value.trim(); }); try { await save({ answers: a }); s.remove(); client(cur.id); } catch (e) { X.toast(e.message); } };
    };
    var re = $('#fRe'); if (re) re.onclick = async function () { try { var r = await X.api('gu-reopen', { id: c.id }); put(r.client); X.toast('They can edit their answers again'); } catch (e) { X.toast(e.message); } };
  }

  function auditBox(c) {
    var a = c.audit || {}, S = { good: ['Good', '#057A44', '#fff'], fix: ['Fix', '#FFB81C', '#0F1E36'], missing: ['Missing', '#B42318', '#fff'] };
    var fix = D.areas.filter(function (x) { return (a[x[0]] || {}).s === 'missing'; }).concat(D.areas.filter(function (x) { return (a[x[0]] || {}).s === 'fix'; })).slice(0, 3);
    return '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px">' + D.areas.map(function (x) {
      var v = a[x[0]] || {};
      return '<tr style="border-top:1px solid var(--line,#eee)"><td style="padding:7px 6px;min-width:130px"><b>' + esc(x[1]) + '</b><div class="muted" style="font-size:11.5px">' + esc(x[2]) + '</div></td><td style="padding:7px 6px;white-space:nowrap" data-area="' + x[0] + '">' +
        ['good', 'fix', 'missing'].map(function (s) { var on = v.s === s; return '<button type="button" data-s="' + s + '" data-on="' + (on ? '1' : '') + '" style="border:1.5px solid ' + (on ? S[s][1] : '#E5E1D6') + ';background:' + (on ? S[s][1] : '#fff') + ';color:' + (on ? S[s][2] : '#6B7280') + ';border-radius:8px;padding:4px 9px;font:inherit;font-size:12px;font-weight:700;margin-right:3px;cursor:pointer">' + S[s][0] + '</button>'; }).join('') +
        '</td><td style="padding:7px 6px;width:45%"><input data-note="' + x[0] + '" value="' + esc(v.note || '') + '" placeholder="One line on why" style="font-size:13px"></td></tr>';
    }).join('') + '</table></div>' +
      '<label style="margin-top:10px;font-size:13px">Overall notes</label><textarea id="auNote" rows="2" style="font-size:13.5px">' + esc(c.auditNote || '') + '</textarea>' +
      (fix.length ? '<div style="margin-top:8px;font-size:13.5px"><b>Fix first:</b> ' + fix.map(function (x) { return esc(x[1]); }).join(' · ') + '</div>' : '') +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">📷 Save “before” screenshots of their bio, grid and highlights now, for the before-and-after.</p>' +
      '<div style="text-align:right;margin-top:6px"><button class="btn primary sm" id="auSave">Save audit</button></div>';
  }
  function bindAudit(c) {
    var COL = { good: ['#057A44', '#fff'], fix: ['#FFB81C', '#0F1E36'], missing: ['#B42318', '#fff'] };
    $$('[data-area]').forEach(function (td) { td.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var was = b.dataset.on === '1'; $$('[data-s]', td).forEach(function (x) { x.dataset.on = ''; x.style.background = '#fff'; x.style.color = '#6B7280'; x.style.borderColor = '#E5E1D6'; }); if (!was) { var col = COL[b.dataset.s]; b.dataset.on = '1'; b.style.background = col[0]; b.style.color = col[1]; b.style.borderColor = col[0]; } }; });
    $('#auSave').onclick = async function () {
      var a = {}; $$('[data-area]').forEach(function (td) { var on = $('[data-on="1"]', td), note = $('[data-note="' + td.dataset.area + '"]').value.trim(); if (on || note) a[td.dataset.area] = { s: on ? on.dataset.s : '', note: note }; });
      try { var cl = await save({ audit: a, auditNote: $('#auNote').value }); if (Object.keys(a).length >= 8 && !(cl.done || {})[4]) { var r = await X.api('gu-step', { id: cl.id, n: 4, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); }
    };
  }

  function compBox(c) {
    var rows = (c.comps || []).slice(); while (rows.length < 5) rows.push({ h: '', works: '', copy: '' });
    return '<p class="muted" style="font-size:13px;margin-bottom:8px">2 they named, 2 direct competitors, 1 bigger brand. Write a principle to copy — never their words, pictures or videos.</p>' +
      '<div id="cpRows">' + rows.map(compRow).join('') + '</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn ghost sm" id="cpAdd">＋ Add a row</button><button class="btn ghost sm" id="cpLib">📚 From the ' + esc(c.cat || 'category') + ' library</button><button class="btn ghost sm" id="cpToLib">💾 Save to library</button><span style="flex:1"></span><button class="btn primary sm" id="cpSave">Save competitors</button></div>';
  }
  function compRow(x) { return '<div class="row cp" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><input data-f="h" value="' + esc(x.h) + '" placeholder="@account" style="flex:1;min-width:120px;font-size:13px"><input data-f="works" value="' + esc(x.works) + '" placeholder="What works (1 line)" style="flex:2;min-width:180px;font-size:13px"><input data-f="copy" value="' + esc(x.copy) + '" placeholder="Copy this: …" style="flex:2;min-width:180px;font-size:13px"></div>'; }
  function readComps() { return $$('#cpRows .cp').map(function (r) { return { h: $('[data-f=h]', r).value.trim(), works: $('[data-f=works]', r).value.trim(), copy: $('[data-f=copy]', r).value.trim() }; }).filter(function (x) { return x.h || x.works || x.copy; }); }
  function bindComp(c) {
    if (!$('#cpRows')) return;
    $('#cpAdd').onclick = function () { $('#cpRows').insertAdjacentHTML('beforeend', compRow({ h: '', works: '', copy: '' })); };
    $('#cpSave').onclick = async function () { try { var list = readComps(), cl = await save({ comps: list }); if (list.length >= 3 && !(cl.done || {})[5]) { var r = await X.api('gu-step', { id: cl.id, n: 5, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); } };
    $('#cpToLib').onclick = async function () { if (!c.cat) return X.toast('Add a category in ✏️ Details first (e.g. perfume)'); try { var r = await X.api('gu-libadd', { cat: c.cat, comps: readComps() }); LIB = r.lib; X.toast('💾 Saved to the ' + c.cat + ' library'); } catch (e) { X.toast(e.message); } };
    $('#cpLib').onclick = async function () {
      if (!c.cat) return X.toast('Add a category in ✏️ Details first (e.g. perfume)');
      try { if (!LIB) LIB = (await X.api('gu-lib')).lib; } catch (e) { return X.toast(e.message); }
      var have = (LIB[c.cat] || []); if (!have.length) return X.toast('Nothing saved for ' + c.cat + ' yet');
      var cur0 = readComps().map(function (x) { return x.h.toLowerCase(); }), add = have.filter(function (x) { return cur0.indexOf(x.h.toLowerCase()) < 0; });
      $$('#cpRows .cp').forEach(function (r) { if (!$('[data-f=h]', r).value && !$('[data-f=works]', r).value) r.remove(); });
      add.forEach(function (x) { $('#cpRows').insertAdjacentHTML('beforeend', compRow(x)); });
      X.toast('📚 ' + add.length + ' added — check they still fit, then Save');
    };
  }

  function checkBox(c) {
    var a = c.after || {};
    return '<p class="muted" style="font-size:12.5px;margin-bottom:6px">Note their followers from Instagram when you start the audit, then again at 30 days.</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:110px"><label style="font-size:12.5px">Followers before</label><input id="afB" value="' + esc(a.before || '') + '" inputmode="numeric"></div><div style="flex:1;min-width:110px"><label style="font-size:12.5px">Followers at 30 days</label><input id="afF" value="' + esc(a.followers || '') + '" inputmode="numeric"></div><div style="flex:1;min-width:110px"><label style="font-size:12.5px">Average Reel views</label><input id="afV" value="' + esc(a.views || '') + '" inputmode="numeric"></div><div style="flex:1;min-width:110px"><label style="font-size:12.5px">Enquiries a week</label><input id="afE" value="' + esc(a.enquiries || '') + '" inputmode="numeric"></div></div>' +
      '<div style="text-align:right;margin-top:8px"><button class="btn primary sm" id="afSave">Save numbers</button></div>';
  }
  function bindCheck(c) { $('#afSave').onclick = async function () { try { var cl = await save({ after: { before: $('#afB').value.trim(), followers: $('#afF').value.trim(), views: $('#afV').value.trim(), enquiries: $('#afE').value.trim() } }); if ($('#afF').value.trim() && !(cl.done || {})[9]) { var r = await X.api('gu-step', { id: cl.id, n: 9, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); } }; }

  // 💬 messages A–F, filled in for this client
  function msgs(c, formUrl) {
    var nm = (c.name || '').split(/\s+/)[0], due = c.due ? nice(c.due) : '[date]';
    return [
      ['A', 'Packages', 'Hi ' + nm + '! Thank you for asking about the Instagram Revamp ✨ We study your page and your competitors, then give you a ready-to-use plan to get more followers and enquiries.\n\n• Starter £' + D.pkgs.starter.price + ' — page review, bio fixes, 10 post and Reel ideas\n• Revamp £' + D.pkgs.glowup.price + ' — plus 5 competitors studied, 3 Reel scripts and a 30-day plan\n• Revamp + Done for you £' + D.pkgs.dfy.price + ' — plus 9 posts designed for you\n\nWhich one suits you? 💚'],
      ['B', 'Form link', 'Thank you, payment received! 💚 Please answer 5 quick questions so we can start: ' + formUrl + '\nIt takes about 2 minutes. Your Revamp starts as soon as it’s back.'],
      ['C', 'Start date', 'Got it, thank you! We’re starting on ' + (c.handle ? '@' + c.handle : 'your page') + ' now. You’ll have your Revamp by ' + due + ' ✨'],
      ['D', 'Report ready', 'Your Instagram Revamp is ready ✨ [report link]\nStart with “Fix first” — those 3 changes make the biggest difference. I’ve sent a short voice note walking you through it. Any questions, just reply here.'],
      ['E', '30-day check-in', 'Hi ' + nm + ', it’s been 30 days since your Revamp! How’s it going? Have you noticed more views, messages or sales? Tell me what’s changed and what’s worked best for you 📈'],
      ['F', 'Testimonial', 'So glad it’s helping! 💚 Would you write one or two lines about your experience? And are you happy for us to share your before-and-after as an example?'],
    ];
  }
  function msgBox(c) {
    return '<div class="row" style="gap:6px;flex-wrap:wrap">' + msgs(c, '').map(function (m) { return '<button class="btn ghost sm" data-msg="' + m[0] + '">💬 ' + m[0] + ' · ' + m[1] + '</button>'; }).join('') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">Opens the message with their details filled in — change anything, then send on WhatsApp or copy it.' + (c.phone ? '' : ' Add their WhatsApp number in ✏️ Details to send straight to them.') + '</p>';
  }
  function bindMsgs(c, formUrl) {
    var all = msgs(c, formUrl);
    $$('[data-msg]').forEach(function (b) { b.onclick = function () {
      var m = all.filter(function (x) { return x[0] === b.dataset.msg; })[0], ph = String(c.phone || '').replace(/\D/g, '').replace(/^0/, '44');
      var s = X.sheet('<h3 style="margin:0 0 8px">💬 ' + m[0] + ' · ' + esc(m[1]) + '</h3><textarea id="mT" rows="9" style="font-size:14px">' + esc(m[2]) + '</textarea>' +
        '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost" id="mX">Close</button><button class="btn ghost" id="mC">📋 Copy</button><button class="btn primary" id="mW">💬 ' + (ph ? 'Send on WhatsApp' : 'Open WhatsApp') + '</button></div>');
      $('#mX', s).onclick = function () { s.remove(); };
      $('#mC', s).onclick = function () { try { navigator.clipboard.writeText($('#mT', s).value); X.toast('📋 Copied'); } catch (e) {} };
      $('#mW', s).onclick = function () { window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent($('#mT', s).value), '_blank', 'noopener'); };
    }; });
  }

  // ✏️ new client / details
  function details(c) {
    var p = c || { pkg: 'glowup' }, opts = Object.keys(D.pkgs).map(function (k) { return '<option value="' + k + '"' + (p.pkg === k ? ' selected' : '') + '>' + esc(D.pkgs[k].name) + ' — ' + gbp(D.pkgs[k].price) + '</option>'; }).join('');
    var s = X.sheet('<h3 style="margin:0 0 8px">' + (c ? '✏️ ' + esc(c.name) : '＋ New Revamp client') + '</h3>' +
      '<label>Their Auntie Tobi listing link</label><div class="row" style="gap:6px"><input id="dL" value="' + esc((p.listing || {}).url || '') + '" placeholder="auntietobi.co.uk/biz/their-business" style="flex:1"><button class="btn ghost" id="dLGo" type="button">Fill in</button></div><div class="muted" id="dLMsg" style="font-size:12.5px;margin-top:4px">Fills in the name, Instagram, WhatsApp, category and town for you.</div>' +
      '<label>Business name</label><input id="dN" value="' + esc(p.name || '') + '" placeholder="e.g. Saamipeniel Fragrance">' +
      '<label>Instagram handle</label><input id="dH" value="' + esc(p.handle ? '@' + p.handle : '') + '" placeholder="@yourbusiness">' +
      '<div class="row" style="gap:8px"><div style="flex:2"><label>Package</label><select id="dP">' + opts + '</select></div><div style="flex:1"><label>Price (£)</label><input id="dPr" inputmode="numeric" value="' + esc(p.price != null ? p.price : D.pkgs[p.pkg || 'glowup'].price) + '"></div></div>' +
      '<div class="row" style="gap:8px"><div style="flex:1"><label>WhatsApp number</label><input id="dW" value="' + esc(p.phone || '') + '" placeholder="07…"></div><div style="flex:1"><label>Category</label><input id="dC" value="' + esc(p.cat || '') + '" placeholder="e.g. perfume, catering, hair"></div></div>' +
      '<div class="row" style="gap:8px"><div style="flex:1"><label>Paid on</label><input id="dPd" type="date" value="' + esc(p.paidAt || '') + '"></div><div style="flex:1"><label>Due</label><input id="dD" type="date" value="' + esc(p.due || '') + '"></div></div>' +
      '<label>Notes</label><textarea id="dNo" rows="3">' + esc(p.notes || '') + '</textarea>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">The due date fills itself from the paid date (Starter 3 days, Revamp 5, Done for you 7).</p>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn ghost" id="dX">Cancel</button><button class="btn primary" id="dGo">' + (c ? 'Save' : 'Add client') + '</button></div>');
    $('#dP', s).onchange = function () { $('#dPr', s).value = D.pkgs[this.value].price; };
    var listing = p.listing || null;
    $('#dLGo', s).onclick = async function () {
      var v = $('#dL', s).value.trim(), msg = $('#dLMsg', s); if (!v) return;
      this.disabled = true; msg.textContent = 'Looking it up…';
      try {
        var L = (await X.api('gu-listing', { link: v })).listing; listing = L;
        $('#dN', s).value = L.name; if (L.ig) $('#dH', s).value = '@' + String(L.ig).replace(/^@/, ''); if (L.wa || L.phone) $('#dW', s).value = L.wa || L.phone; if (L.cat && !$('#dC', s).value) $('#dC', s).value = L.cat.toLowerCase();
        msg.innerHTML = '✅ Found <b>' + esc(L.name) + '</b>' + (L.loc ? ' · ' + esc(L.loc) : '');
      } catch (e) { msg.textContent = e.message; }
      this.disabled = false;
    };
    $('#dX', s).onclick = function () { s.remove(); };
    $('#dGo', s).onclick = async function () {
      var f = { listing: listing, name: $('#dN', s).value.trim(), handle: $('#dH', s).value.trim(), pkg: $('#dP', s).value, price: $('#dPr', s).value, phone: $('#dW', s).value.trim(), cat: $('#dC', s).value.trim(), paidAt: $('#dPd', s).value, due: $('#dD', s).value, notes: $('#dNo', s).value };
      if (c) f.id = c.id;
      try { var r = await X.api('gu-save', { client: f }); put(r.client); s.remove(); client(r.client.id); } catch (e) { X.toast(e.message); }
    };
  }

  // 🔔 for HQ Today: forms in and waiting for you, and check-ins due
  async function todayBox() {
    try { await load(); } catch (e) { return ''; }
    var t = todayIso(), forms = D.clients.filter(function (c) { var d = c.done || {}; return d[3] && !d[4]; }), chk = D.clients.filter(function (c) { var d = c.done || {}; return c.checkin && c.checkin <= t && !d[9]; }), late = D.clients.filter(function (c) { var d = c.done || {}; return c.due && c.due < t && d[2] && !d[8]; });
    if (!forms.length && !chk.length && !late.length) return '';
    var line = function (c, why) { return '<a href="#" data-gu-open="' + esc(c.id) + '" style="display:block;padding:10px 0;border-bottom:1px solid var(--line,#eee);color:inherit;text-decoration:none"><b>' + esc(c.name) + '</b> <span class="muted">· ' + why + '</span></a>'; };
    return '<div class="h2">✨ Instagram Revamp</div><div class="card" style="padding:0 14px;margin-bottom:12px">' + forms.map(function (c) { return line(c, '📝 form received ' + nice(c.form && c.form.at) + ' — start the audit'); }).join('') + late.map(function (c) { return line(c, '⏰ was due ' + nice(c.due)); }).join('') + chk.map(function (c) { return line(c, '📈 30-day check-in due'); }).join('') + '</div>';
  }
  var PENDING = null;
  function open(id) { PENDING = id; }   // the next view() opens this client
  window.HQGlow = { init: function (o) { X = o; }, view: view, todayBox: todayBox, open: open };
})();
