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
      return '<div class="card" data-gu="' + esc(c.id) + '" style="padding:10px 12px;margin-bottom:8px;cursor:pointer"><b style="display:block">' + esc(c.name) + '</b><div class="muted" style="font-size:12.5px">' + esc((D.pkgs[c.pkg] || {}).name || '') + (c.due && !d[8] ? ' · due ' + nice(c.due) : c.paidAt ? ' · paid ' + nice(c.paidAt) : '') + (late ? ' · <b style="color:#B42318">late</b>' : '') + (c.reportOn && (c.checklist || []).length ? ' · ✅ ' + clProgress(c).n + '/' + clProgress(c).of : '') + '</div>' + p + '</div>';
    };
    var fin = cs.filter(function (c) { return column(c) === 'done'; });
    main.innerHTML = '<div class="wrap">' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">' + tile(active.length, 'active clients') + tile(dueWk.length, 'due this week') + tile(chk.length, 'check-ins due') + tile(gbp(money), 'paid this month') + '</div>' +
      (cs.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;align-items:start">' + COLS.map(function (k) {
        var list = cs.filter(function (c) { return column(c) === k[0]; });
        return '<div><div style="font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#6B7280;margin:0 2px 8px">' + k[1] + ' (' + list.length + ')</div>' + list.map(card).join('') + '</div>';
      }).join('') + '</div>' : '<div class="card" style="padding:18px"><b>No clients yet</b><p class="muted" style="margin-top:6px">Tap <b>＋ New client</b> when someone asks about an Instagram Revamp. You’ll get their form link and ready-to-send messages.</p></div>') +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:16px;font-size:14px;cursor:pointer"><input type="checkbox" id="guMail"' + ((D.settings || {}).email !== false ? ' checked' : '') + ' style="width:18px;height:18px"> 📧 Email me when a client sends their Revamp form</label>' +
      (fin.length ? '<details style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">✅ Finished (' + fin.length + ')</summary><div style="margin-top:8px">' + fin.map(card).join('') + '</div></details>' : '') + '</div>';
    $$('[data-gu]', main).forEach(function (el) { el.onclick = function () { client(el.dataset.gu); }; });
    $('#guMail').onchange = async function () { var on = this.checked; try { D.settings = (await X.api('gu-settings', { settings: { email: on } })).settings; X.toast(on ? '📧 You’ll get an email when a form comes in' : 'No more form emails — they still show on HQ Today'); } catch (e) { X.toast(e.message); this.checked = !on; } };
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
      sec('6', '✨ The plan', planBox(c)) +
      sec('', '✅ The checklist', checklistBox(c)) +
      sec('7', '📄 The report', reportBox(c)) +
      sec('9', '📈 30-day check-in', checkBox(c)) +
      sec('', '💬 Messages', msgBox(c)) +
      '<div style="text-align:right;margin-top:6px"><button class="btn ghost sm" id="guDel" style="color:#B42318">Delete client</button></div></div>';
    $$('[data-step]', main).forEach(function (b) { b.onclick = async function () { var k = b.dataset.step, on = !(cur.done || {})[k]; try { var r = await X.api('gu-step', { id: cur.id, n: k, on: on }); put(r.client); client(cur.id); } catch (e) { X.toast(e.message); } }; });
    if ($('#guPaid')) $('#guPaid').onclick = async function () { try { await save({ paidAt: todayIso() }); client(cur.id); } catch (e) { X.toast(e.message); } };
    $('#guDel').onclick = async function () { if (!confirm('Delete ' + c.name + ' and everything saved for them?')) return; try { await X.api('gu-del', { id: c.id }); D.clients = D.clients.filter(function (x) { return x.id !== c.id; }); $('#guBack').click(); } catch (e) { X.toast(e.message); } };
    bindForm(c, formUrl); bindAudit(c); bindComp(c); bindPlan(c); bindChecklist(c); bindReport(c); bindCheck(c); bindMsgs(c, formUrl);
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
    return '<div style="background:#F3FAF6;border:1px dashed #A7D7BC;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px;font-size:13.5px"><b>✨ Let Auntie Tobi do the audit</b><div class="muted" style="font-size:12.5px">Add up to 3 screenshots of their Instagram and any notes — she fills in everything below for you to check.</div></div><button class="btn primary sm" id="auAi">✨ Do the audit for me</button></div>' +
      '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px">' + D.areas.map(function (x) {
      var v = a[x[0]] || {};
      return '<tr style="border-top:1px solid var(--line,#eee)"><td style="padding:7px 6px;min-width:130px"><b>' + esc(x[1]) + '</b><div class="muted" style="font-size:11.5px">' + esc(x[2]) + '</div></td><td style="padding:7px 6px;white-space:nowrap" data-area="' + x[0] + '">' +
        ['good', 'fix', 'missing'].map(function (s) { var on = v.s === s; return '<button type="button" data-s="' + s + '" data-on="' + (on ? '1' : '') + '" style="border:1.5px solid ' + (on ? S[s][1] : '#E5E1D6') + ';background:' + (on ? S[s][1] : '#fff') + ';color:' + (on ? S[s][2] : '#6B7280') + ';border-radius:8px;padding:4px 9px;font:inherit;font-size:12px;font-weight:700;margin-right:3px;cursor:pointer">' + S[s][0] + '</button>'; }).join('') +
        '</td><td style="padding:7px 6px;width:45%"><input data-note="' + x[0] + '" value="' + esc(v.note || '') + '" placeholder="One line on why" style="font-size:13px"></td></tr>';
    }).join('') + '</table></div>' +
      '<label style="margin-top:10px;font-size:13px">Overall notes</label><textarea id="auNote" rows="' + (c.auditNote && c.auditNote.length > 120 ? 6 : 2) + '" style="font-size:13.5px">' + esc(c.auditNote || '') + '</textarea>' +
      '<div id="auBios">' + biosHtml(c.bios) + '</div>' +
      (fix.length ? '<div style="margin-top:8px;font-size:13.5px"><b>Fix first:</b> ' + fix.map(function (x) { return esc(x[1]); }).join(' · ') + '</div>' : '') +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">📷 Save “before” screenshots of their bio, grid and highlights now, for the before-and-after.</p>' +
      '<div style="text-align:right;margin-top:6px"><button class="btn primary sm" id="auSave">Save audit</button></div>';
  }
  function biosHtml(b) {
    if (!b || !b.length) return '';
    return '<div style="margin-top:10px"><div style="font-size:13px;font-weight:700">✍🏾 New bio ideas</div>' + b.map(function (x, i) { return '<div style="display:flex;gap:8px;align-items:flex-start;margin-top:6px"><textarea data-bio="' + i + '" rows="3" style="flex:1;font-size:13.5px">' + esc(x) + '</textarea><button type="button" class="btn ghost sm" data-bioc="' + i + '">📋</button></div>'; }).join('') + '</div>';
  }
  function bindBios() { $$('[data-bioc]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText($('[data-bio="' + b.dataset.bioc + '"]').value); X.toast('📋 Bio copied'); } catch (e) {} }; }); }
  function shrink(file, max, q) {
    max = max || 1400; q = q || 0.82;
    return new Promise(function (ok, bad) {
      var fr = new FileReader(); fr.onerror = function () { bad(new Error('Couldn’t read that picture')); };
      fr.onload = function () { var im = new Image(); im.onerror = function () { bad(new Error('That doesn’t look like a picture')); }; im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', q)); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  function aiSheet(c) {
    var shots = [];
    var s = X.sheet('<h3 style="margin:0 0 4px">✨ Do the audit for me</h3><div class="muted" style="font-size:13px">Best: their profile (with the bio), their grid, and one more (highlights or a Reel). Notes help with what screenshots can’t show.</div>' +
      '<label class="btn ghost" style="display:block;text-align:center;margin-top:10px;cursor:pointer">📷 Add screenshots (up to 3)<input type="file" id="aiF" accept="image/*" multiple hidden></label>' +
      '<div id="aiTh" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"></div>' +
      '<label style="margin-top:10px">Notes <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="aiN" rows="3" placeholder="e.g. posts about twice a month, no prices anywhere, owner never shown, replies slowly to DMs"></textarea>' +
      '<div class="err" id="aiE" style="display:none;margin-top:8px"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="aiX">Cancel</button><button class="btn primary" id="aiGo">✨ Do the audit</button></div>');
    var th = function () { $('#aiTh', s).innerHTML = shots.map(function (u, i) { return '<div style="position:relative"><img src="' + u + '" style="width:84px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #E5E1D6"><button type="button" data-rm="' + i + '" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#0F1E36;color:#fff;cursor:pointer">✕</button></div>'; }).join(''); $$('[data-rm]', s).forEach(function (b) { b.onclick = function () { shots.splice(+b.dataset.rm, 1); th(); }; }); };
    $('#aiF', s).onchange = async function () { var fs = [].slice.call(this.files || []); this.value = ''; for (var i = 0; i < fs.length && shots.length < 3; i++) { try { shots.push(await shrink(fs[i])); } catch (e) { X.toast(e.message); } } th(); };
    $('#aiX', s).onclick = function () { s.remove(); };
    $('#aiGo', s).onclick = async function () {
      var b = this, err = $('#aiE', s); err.style.display = 'none';
      if (!shots.length && !$('#aiN', s).value.trim()) { err.textContent = 'Add at least one screenshot or some notes.'; err.style.display = 'block'; return; }
      b.disabled = true; b.textContent = '✨ Auntie Tobi is looking…';
      try {
        var r = await X.api('gu-ai-audit', { id: c.id, shots: shots, notes: $('#aiN', s).value });
        s.remove(); fillAudit(r);
      } catch (e) { err.textContent = e.message; err.style.display = 'block'; b.disabled = false; b.textContent = '✨ Do the audit'; }
    };
  }
  // put Auntie Tobi's audit into the boxes (not saved until Save audit)
  function fillAudit(r) {
    var COL = { good: ['#057A44', '#fff'], fix: ['#FFB81C', '#0F1E36'], missing: ['#B42318', '#fff'] };
    $$('[data-area]').forEach(function (td) {
      var a = r.audit[td.dataset.area] || {};
      $$('[data-s]', td).forEach(function (x) { var on = x.dataset.s === a.s; x.dataset.on = on ? '1' : ''; x.style.background = on ? COL[a.s][0] : '#fff'; x.style.color = on ? COL[a.s][1] : '#6B7280'; x.style.borderColor = on ? COL[a.s][0] : '#E5E1D6'; });
      var n = $('[data-note="' + td.dataset.area + '"]'); if (n) n.value = a.note || '';
    });
    var note = $('#auNote'); note.value = (r.overall || '') + (r.fixFirst && r.fixFirst.length ? '\n\nFix first:\n' + r.fixFirst.map(function (f, i) { return (i + 1) + '. ' + f; }).join('\n') : ''); note.rows = 7;
    $('#auBios').innerHTML = biosHtml(r.bios); bindBios();
    var fb = $('#afB'); if (fb && r.followers && !fb.value) fb.value = r.followers;
    $('#auNote').scrollIntoView({ block: 'center', behavior: 'smooth' });
    X.toast('✨ Done — check it, change anything, then tap Save audit');
  }
  function bindAudit(c) {
    $('#auAi').onclick = function () { aiSheet(c); };
    bindBios();
    var COL = { good: ['#057A44', '#fff'], fix: ['#FFB81C', '#0F1E36'], missing: ['#B42318', '#fff'] };
    $$('[data-area]').forEach(function (td) { td.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var was = b.dataset.on === '1'; $$('[data-s]', td).forEach(function (x) { x.dataset.on = ''; x.style.background = '#fff'; x.style.color = '#6B7280'; x.style.borderColor = '#E5E1D6'; }); if (!was) { var col = COL[b.dataset.s]; b.dataset.on = '1'; b.style.background = col[0]; b.style.color = col[1]; b.style.borderColor = col[0]; } }; });
    $('#auSave').onclick = async function () {
      var a = {}; $$('[data-area]').forEach(function (td) { var on = $('[data-on="1"]', td), note = $('[data-note="' + td.dataset.area + '"]').value.trim(); if (on || note) a[td.dataset.area] = { s: on ? on.dataset.s : '', note: note }; });
      var bios = $$('[data-bio]').map(function (t) { return t.value.trim(); }).filter(Boolean), fb = $('#afB'), extra = { audit: a, auditNote: $('#auNote').value };
      if (bios.length) extra.bios = bios;
      if (fb && fb.value.trim() && !((cur.after || {}).before)) extra.after = Object.assign({}, cur.after || {}, { before: fb.value.trim() });
      try { var cl = await save(extra); if (Object.keys(a).length >= 8 && !(cl.done || {})[4]) { var r = await X.api('gu-step', { id: cl.id, n: 4, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); }
    };
  }

  function compBox(c) {
    var rows = (c.comps || []).slice(); while (rows.length < 5) rows.push({ h: '', works: '', copy: '' });
    return '<div style="background:#F3FAF6;border:1px dashed #A7D7BC;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px;font-size:13.5px"><b>✨ Let Auntie Tobi study them</b><div class="muted" style="font-size:12.5px">Not sure who to look at? Tap 🔍 for what to search. Then add a screenshot of each account’s profile — she fills in the rows below for you to check.</div></div><button class="btn ghost sm" id="cpFind">🔍 Help me find them</button><button class="btn primary sm" id="cpAi">✨ Study competitors for me</button></div>' +
      '<p class="muted" style="font-size:13px;margin-bottom:8px">2 they named, 2 direct competitors, 1 bigger brand. Write a principle to copy — never their words, pictures or videos.</p>' +
      '<div id="cpRows">' + rows.map(compRow).join('') + '</div>' +
      '<label style="font-size:12.5px;margin-top:6px;display:block">What most of them do <span class="muted" style="font-weight:400">(shows on the report)</span></label><textarea id="cpNote" rows="2" style="font-size:13.5px" placeholder="e.g. All 5 show prices and post the owner at least once a week.">' + esc(c.compNote || '') + '</textarea>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn ghost sm" id="cpAdd">＋ Add a row</button><button class="btn ghost sm" id="cpLib">📚 From the ' + esc(c.cat || 'category') + ' library</button><button class="btn ghost sm" id="cpToLib">💾 Save to library</button><span style="flex:1"></span><button class="btn primary sm" id="cpSave">Save competitors</button></div>';
  }
  function compRow(x) { return '<div class="row cp" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><input data-f="h" value="' + esc(x.h) + '" placeholder="@account" style="flex:1;min-width:120px;font-size:13px"><input data-f="works" value="' + esc(x.works) + '" placeholder="What works (1 line)" style="flex:2;min-width:180px;font-size:13px"><input data-f="copy" value="' + esc(x.copy) + '" placeholder="Copy this: …" style="flex:2;min-width:180px;font-size:13px"></div>'; }
  function readComps() { return $$('#cpRows .cp').map(function (r) { return { h: $('[data-f=h]', r).value.trim(), works: $('[data-f=works]', r).value.trim(), copy: $('[data-f=copy]', r).value.trim() }; }).filter(function (x) { return x.h || x.works || x.copy; }); }
  function bindComp(c) {
    if (!$('#cpRows')) return;
    $('#cpAdd').onclick = function () { $('#cpRows').insertAdjacentHTML('beforeend', compRow({ h: '', works: '', copy: '' })); };
    $('#cpAi').onclick = function () { compSheet(c); };
    $('#cpFind').onclick = function () { findSheet(c); };
    $('#cpSave').onclick = async function () { try { var list = readComps(), cl = await save({ comps: list, compNote: $('#cpNote').value.trim() }); if (list.length >= 3 && !(cl.done || {})[5]) { var r = await X.api('gu-step', { id: cl.id, n: 5, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); } };
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

  // ✨ step 6 — the plan pieces, drafted by Auntie Tobi from everything above
  var PLAN = [['hooks', '💡 10 post and Reel hooks', 6], ['reels', '🎬 3 Reel scripts', 12], ['plan30', '📅 30-day plan', 14], ['journey', '💬 Sales journey (DM keyword and replies)', 9]];
  function planParts(c) { return c.pkg === 'starter' ? PLAN.filter(function (x) { return x[0] === 'hooks'; }) : PLAN; }
  // ✨ competitors from screenshots — fills the rows, not saved until Save competitors
  function compSheet(c) {
    var shots = [];
    var s = X.sheet('<h3 style="margin:0 0 4px">✨ Study competitors for me</h3><div class="muted" style="font-size:13px">One screenshot per account — their profile with the bio and top of the grid. Up to 5.</div>' +
      '<label class="btn ghost" style="display:block;text-align:center;margin-top:10px;cursor:pointer">📷 Add screenshots (up to 5)<input type="file" id="ciF" accept="image/*" multiple hidden></label>' +
      '<div id="ciTh" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"></div>' +
      '<label style="margin-top:10px">Notes <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="ciN" rows="2" placeholder="e.g. the 2nd one posts a Reel every day, the 3rd always shows prices"></textarea>' +
      '<div class="err" id="ciE" style="display:none;margin-top:8px"></div>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="ciX">Cancel</button><button class="btn primary" id="ciGo">✨ Study them</button></div>');
    var th = function () { $('#ciTh', s).innerHTML = shots.map(function (u, i) { return '<div style="position:relative"><img src="' + u + '" style="width:72px;height:104px;object-fit:cover;border-radius:8px;border:1px solid #E5E1D6"><span style="position:absolute;bottom:4px;left:4px;background:#0F1E36;color:#fff;font-size:11px;font-weight:800;border-radius:6px;padding:1px 6px">' + (i + 1) + '</span><button type="button" data-rm="' + i + '" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#0F1E36;color:#fff;cursor:pointer">✕</button></div>'; }).join(''); $$('[data-rm]', s).forEach(function (b) { b.onclick = function () { shots.splice(+b.dataset.rm, 1); th(); }; }); };
    $('#ciF', s).onchange = async function () { var fs = [].slice.call(this.files || []); this.value = ''; for (var i = 0; i < fs.length && shots.length < 5; i++) { try { shots.push(await shrink(fs[i], 1000, 0.72)); } catch (e) { X.toast(e.message); } } th(); };
    $('#ciX', s).onclick = function () { s.remove(); };
    $('#ciGo', s).onclick = async function () {
      var b = this, err = $('#ciE', s); err.style.display = 'none';
      if (!shots.length) { err.textContent = 'Add at least one screenshot.'; err.style.display = 'block'; return; }
      b.disabled = true; b.textContent = '✨ Auntie Tobi is looking…';
      try {
        var r = await X.api('gu-ai-comps', { id: c.id, shots: shots, notes: $('#ciN', s).value });
        s.remove();
        $$('#cpRows .cp').forEach(function (row) { if (!$('[data-f=h]', row).value && !$('[data-f=works]', row).value && !$('[data-f=copy]', row).value) row.remove(); });
        r.comps.forEach(function (x) {
          var same = x.h && $$('#cpRows .cp').filter(function (row) { return $('[data-f=h]', row).value.toLowerCase() === x.h.toLowerCase(); })[0];
          if (same) { $('[data-f=works]', same).value = x.works; $('[data-f=copy]', same).value = x.copy; } else $('#cpRows').insertAdjacentHTML('beforeend', compRow(x));
        });
        if (r.patterns) $('#cpNote').value = r.patterns;
        X.toast('✨ ' + r.comps.length + ' filled in — check them, then Save competitors');
      } catch (e) { err.textContent = e.message; err.style.display = 'block'; b.disabled = false; b.textContent = '✨ Study them'; }
    };
  }
  // 🔍 what to search on Instagram (+ accounts already in the library)
  async function findSheet(c) {
    var s = X.sheet('<h3 style="margin:0 0 4px">🔍 Help me find them</h3><div id="fdB" class="muted" style="font-size:13.5px;padding:14px 0">✨ Auntie Tobi is thinking…</div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn ghost" id="fdX">Close</button></div>');
    $('#fdX', s).onclick = function () { s.remove(); };
    var chip = function (t) { return '<button type="button" class="btn ghost sm" data-cp-t="' + esc(t) + '" style="margin:0 6px 6px 0">' + esc(t) + '</button>'; };
    try {
      var r = await X.api('gu-ai-find', { id: c.id }), libs = [];
      try { if (!LIB) LIB = (await X.api('gu-lib')).lib; libs = c.cat ? (LIB[c.cat] || []) : []; } catch (e) {}
      $('#fdB', s).className = ''; $('#fdB', s).style.padding = '6px 0';
      $('#fdB', s).innerHTML = '<p class="muted" style="font-size:12.5px;margin-bottom:8px">Tap one to copy it, then paste it into Instagram search. Pick 2 direct competitors, 2 similar small businesses doing well and 1 bigger brand.</p>' +
        '<div style="font-size:13px;font-weight:700;margin-bottom:6px">Search for</div><div>' + r.searches.map(chip).join('') + '</div>' +
        '<div style="font-size:13px;font-weight:700;margin:8px 0 6px">Hashtags</div><div>' + r.hashtags.map(chip).join('') + '</div>' +
        (r.lookFor.length ? '<div style="font-size:13px;font-weight:700;margin:8px 0 4px">A good one to study</div><ul style="margin:0 0 0 18px;font-size:13.5px">' + r.lookFor.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (libs.length ? '<div style="font-size:13px;font-weight:700;margin:10px 0 6px">📚 Already in your ' + esc(c.cat) + ' library</div><div>' + libs.map(function (x) { return chip(x.h); }).join('') + '</div>' : '');
      $$('[data-cp-t]', s).forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.cpT); X.toast('📋 Copied — paste it into Instagram search'); } catch (e) {} }; });
    } catch (e) { $('#fdB', s).textContent = e.message; }
  }
  function planBox(c) {
    var P = c.plan || {};
    return '<p class="muted" style="font-size:13px;margin-bottom:8px">Tap ✨ Draft and Auntie Tobi writes it from their answers, listing, audit and competitors. Change anything, then Save plan.' + (c.pkg === 'starter' ? ' (Starter: hooks only.)' : '') + '</p>' +
      planParts(c).map(function (x) { return '<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px"><b style="font-size:14px">' + x[1] + '</b><button class="btn ghost sm" data-draft="' + x[0] + '">✨ ' + (P[x[0]] ? 'Draft again' : 'Draft') + '</button></div><textarea data-plan="' + x[0] + '" rows="' + (P[x[0]] ? x[2] : 3) + '" style="font-size:13.5px" placeholder="Tap ✨ Draft, or write it yourself">' + esc(P[x[0]] || '') + '</textarea></div>'; }).join('') +
      '<div style="text-align:right"><button class="btn primary sm" id="plSave">Save plan</button></div>';
  }
  function bindPlan(c) {
    $$('[data-draft]').forEach(function (b) { b.onclick = async function () {
      var k = b.dataset.draft, ta = $('[data-plan="' + k + '"]');
      if (ta.value.trim() && !confirm('Replace what’s in this box with a new draft?')) return;
      b.disabled = true; b.textContent = '✨ Writing…';
      try { var r = await X.api('gu-ai-plan', { id: c.id, kind: k }); ta.value = r.text; ta.rows = Math.min(18, Math.max(6, r.text.split('\n').length + 1)); X.toast('✨ Drafted — check it, then Save plan'); } catch (e) { X.toast(e.message); }
      b.disabled = false; b.textContent = '✨ Draft again';
    }; });
    $('#plSave').onclick = async function () {
      var plan = {}; $$('[data-plan]').forEach(function (t) { plan[t.dataset.plan] = t.value.trim(); });
      try { var cl = await save({ plan: plan }); var full = planParts(cl).every(function (x) { return (cl.plan || {})[x[0]]; }); if (full && !(cl.done || {})[6]) { var r = await X.api('gu-step', { id: cl.id, n: 6, on: true }); put(r.client); } client(cur.id); } catch (e) { X.toast(e.message); }
    };
  }
  // ✅ the checklist — the client ticks it off on their progress page (the report link)
  var STG = [['today', 'Today (about 30 minutes)'], ['week', 'This week'], ['w1', 'Week 1'], ['w2', 'Week 2'], ['w3', 'Week 3'], ['w4', 'Week 4'], ['day30', 'Day 30']];
  function clText(list) { var out = []; STG.forEach(function (g) { var it = (list || []).filter(function (x) { return x.st === g[0]; }); if (!it.length) return; out.push(g[1].toUpperCase()); it.forEach(function (x) { out.push('- ' + x.t + (x.how ? ' | ' + x.how : '')); }); out.push(''); }); return out.join('\n').trim(); }
  function clParse(txt) {
    var st = '', out = [];
    String(txt || '').split('\n').forEach(function (ln) {
      var l = ln.trim(); if (!l) return;
      var h = l.replace(/[:：]$/, '').toLowerCase(), g = STG.filter(function (x) { return h === x[1].toLowerCase() || h === x[0] || (x[0] === 'today' && h.indexOf('today') === 0) || (x[0] === 'week' && h === 'this week') || (/^w\d$/.test(x[0]) && h === 'week ' + x[0].slice(1)) || (x[0] === 'day30' && h.indexOf('day 30') === 0); })[0];
      if (g) { st = g[0]; return; }
      var m = l.replace(/^[-•*✓☐\d.)\s]+/, ''), k = m.indexOf(' | ');
      if (st && m) out.push({ st: st, t: k >= 0 ? m.slice(0, k).trim() : m, how: k >= 0 ? m.slice(k + 3).trim() : '' });
    });
    return out;
  }
  function clProgress(c) { var L = c.checklist || [], T = c.ticks || {}, n = L.filter(function (x) { return T[x.i]; }).length; return { n: n, of: L.length }; }
  function checklistBox(c) {
    var L = c.checklist || [], T = c.ticks || {}, pr = clProgress(c);
    var stat = L.length ? '<div style="background:#F6F4EE;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:13.5px"><b>✅ ' + pr.n + ' of ' + pr.of + ' done</b>' + (c.lastTickAt ? ' · last ticked ' + nice(c.lastTickAt) : c.reportOn ? ' · <span class="muted">nothing ticked yet</span>' : ' · <span class="muted">they’ll tick these on their report page</span>') +
      '<div style="height:7px;border-radius:4px;background:#E5E1D6;margin:7px 0 6px;overflow:hidden"><i style="display:block;height:100%;width:' + (pr.of ? Math.round(pr.n * 100 / pr.of) : 0) + '%;background:#057A44"></i></div>' +
      '<div class="muted" style="font-size:12.5px">' + STG.map(function (g) { var it = L.filter(function (x) { return x.st === g[0]; }); return it.length ? g[1].replace(/ \(.*\)/, '') + ' ' + it.filter(function (x) { return T[x.i]; }).length + '/' + it.length : ''; }).filter(Boolean).join(' · ') + '</div>' +
      (c.reportOn && c.reportToken ? '<div style="margin-top:6px"><a href="' + esc(reportUrl(c)) + '&hq=1" target="_blank" rel="noopener">👀 Open their progress page</a></div>' : '') + '</div>' : '';
    return stat + '<p class="muted" style="font-size:13px;margin-bottom:8px">The step-by-step actions they tick off on their report page. Tap ✨ Draft after the plan is saved — it uses the audit, bios, competitors and plan. One action per line, written as <b>- Do this | how to do it</b>, under the headings TODAY, THIS WEEK, WEEK 1–4, DAY 30.' + (c.pkg === 'starter' ? ' (Starter: Today and This week only.)' : '') + '</p>' +
      '<div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn ghost sm" id="clAi">' + (L.length ? '✨ Draft again' : '✨ Draft checklist') + '</button></div>' +
      '<textarea id="clT" rows="' + Math.min(22, Math.max(8, L.length + 8)) + '" style="font-size:13.5px;line-height:1.5" placeholder="TODAY\n- Paste your new bio | Edit profile → Bio, then paste one of your new bios">' + esc(clText(L)) + '</textarea>' +
      '<div class="row" style="justify-content:space-between;align-items:center;margin-top:8px"><span class="muted" id="clN" style="font-size:12.5px"></span><button class="btn primary sm" id="clSave">Save checklist</button></div>';
  }
  function bindChecklist(c) {
    var ta = $('#clT'), cnt = function () { var n = clParse(ta.value).length; $('#clN').textContent = n ? n + ' actions' : ''; };
    ta.oninput = cnt; cnt();
    $('#clAi').onclick = async function () {
      if (ta.value.trim() && !confirm('Replace the checklist with a new draft? Ticks on items that change will be lost.')) return;
      var b = this; b.disabled = true; b.textContent = '✨ Writing…';
      try { var r = await X.api('gu-ai-checklist', { id: c.id }); ta.value = clText(r.items); ta.rows = 22; cnt(); X.toast('✨ Drafted — check it, then Save checklist'); } catch (e) { X.toast(e.message); }
      b.disabled = false; b.textContent = '✨ Draft again';
    };
    $('#clSave').onclick = async function () { var list = clParse(ta.value); if (ta.value.trim() && !list.length) return X.toast('Put actions under a heading like TODAY, each starting with -'); try { await save({ checklist: list }); client(cur.id); } catch (e) { X.toast(e.message); } };
  }
  // 📄 step 7 — the report page, made from everything saved here
  function reportUrl(c) { return SITE + '/revamp?r=' + encodeURIComponent(c.reportToken); }
  var QC = ['Name, handle and prices are right everywhere', 'No promised results — goals to test, not guarantees', 'Competitor lessons are ideas, not copied posts', 'The bios and plan read well out loud', 'Anything a real customer appears in has their OK'];
  function reportBox(c) {
    if (c.reportOn && c.reportToken) {
      var u = reportUrl(c);
      return '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><input readonly value="' + esc(u) + '" style="flex:1;min-width:220px;font-size:13px"><button class="btn ghost sm" id="rpCopy">📋 Copy link</button><a class="btn ghost sm" href="' + esc(u) + '" target="_blank" rel="noopener">👁 Open</a></div>' +
        '<div style="font-size:13.5px;margin-top:8px">' + (c.opens ? '👀 Opened <b>' + c.opens + '</b> time' + (c.opens === 1 ? '' : 's') + ' · last ' + nice(c.openedAt) : '<span class="muted">Not opened yet</span>') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:6px">It always shows what’s saved here, so any change you save updates the report. Send it with message D, then tick 8 Send. <a href="#" id="rpOff">Take the report offline</a></p>';
    }
    return '<p class="muted" style="font-size:13px;margin-bottom:8px">The report is a private page made from the audit, bios, competitors and plan saved above. Tick the checks, then make it.</p>' +
      QC.map(function (q, i) { return '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin:5px 0;cursor:pointer;font-weight:500"><input type="checkbox" data-qc="' + i + '" style="width:17px;height:17px"> ' + esc(q) + '</label>'; }).join('') +
      '<div style="text-align:right;margin-top:8px"><button class="btn primary sm" id="rpGo" disabled>📄 Make the report page</button></div>';
  }
  function bindReport(c) {
    var go = $('#rpGo');
    if (go) { $$('[data-qc]').forEach(function (x) { x.onchange = function () { go.disabled = $$('[data-qc]').some(function (y) { return !y.checked; }); }; }); go.onclick = async function () { try { await save({ reportOn: true }); X.toast('📄 Report ready — copy the link or send message D'); client(cur.id); } catch (e) { X.toast(e.message); } }; }
    var cp = $('#rpCopy'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(reportUrl(c)); X.toast('📋 Report link copied'); } catch (e) { prompt('Copy the link', reportUrl(c)); } };
    var off = $('#rpOff'); if (off) off.onclick = async function (e) { e.preventDefault(); if (!confirm('Take the report offline? The link stops working until you make it again.')) return; try { await save({ reportOn: false }); client(cur.id); } catch (x) { X.toast(x.message); } };
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
      ['D', 'Report ready', 'Your Instagram Revamp is ready ✨ ' + (c.reportOn && c.reportToken ? reportUrl(c) : '[report link]') + '\nStart with “Fix first” — those 3 changes make the biggest difference. I’ve sent a short voice note walking you through it. Any questions, just reply here.'],
      ['E', '30-day check-in', 'Hi ' + nm + ', it’s been 30 days since your Revamp! How’s it going? Have you noticed more views, messages or sales? Tell me what’s changed and what’s worked best for you 📈'],
      ['F', 'Testimonial', 'So glad it’s helping! 💚 Would you write one or two lines about your experience? And are you happy for us to share your before-and-after as an example?'],
      ['G', 'Nudge', (function () {
        var T = c.ticks || {}, left = (c.checklist || []).filter(function (x) { return !T[x.i]; }), pr = clProgress(c), st = left.length ? left[0].st : '', g = STG.filter(function (x) { return x[0] === st; })[0];
        var next = left.filter(function (x) { return x.st === st; }).slice(0, 3).map(function (x) { return '• ' + x.t; }).join('\n');
        return 'Hi ' + nm + '! 💚 How’s your Revamp going? You’ve done ' + pr.n + ' of ' + pr.of + ' steps so far' + (pr.n ? ' — well done!' : '.') + (next ? '\n\nNext up' + (g ? ' (' + g[1].replace(/ \(.*\)/, '') + ')' : '') + ':\n' + next : '') + (c.reportOn && c.reportToken ? '\n\nTick them off here: ' + reportUrl(c) : '') + '\n\nAny questions, just message me ✨';
      })()],
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
      '<label>Find their Auntie Tobi listing</label><div style="position:relative"><div class="row" style="gap:6px"><input id="dL" value="' + esc((p.listing || {}).url || '') + '" placeholder="Type their business name, or paste their link" autocomplete="off" style="flex:1"><button class="btn ghost" id="dLGo" type="button">Fill in</button></div><div id="dLRes" style="display:none;position:absolute;left:0;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid #E5E1D6;border-radius:10px;box-shadow:0 8px 24px rgba(15,30,54,.12);z-index:5;max-height:260px;overflow:auto"></div></div><div class="muted" id="dLMsg" style="font-size:12.5px;margin-top:4px">Fills in the name, Instagram, WhatsApp, category and town for you.</div>' +
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
    var isLink = function (v) { return /\/biz\/|auntietobi\.co\.uk|^https?:/i.test(v); }, res = $('#dLRes', s), tmr = null, seq = 0;
    var addUrl = SITE + '/add-business';
    $('#dL', s).oninput = function () {
      var v = this.value.trim(); clearTimeout(tmr);
      if (v.length < 2 || isLink(v)) { res.style.display = 'none'; return; }
      tmr = setTimeout(async function () {
        var my = ++seq, r;
        try { r = (await X.api('gu-listing', { q: v })).results || []; } catch (e) { return; }
        if (my !== seq) return;
        res.innerHTML = r.length ? r.map(function (b) { return '<button type="button" data-slug="' + esc(b.slug) + '" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #F0EDE5;background:#fff;padding:9px 12px;cursor:pointer;font:inherit"><b style="font-size:14px">' + esc(b.name) + '</b><div class="muted" style="font-size:12.5px">' + esc([b.cat, b.loc].filter(Boolean).join(' · ')) + '</div></button>'; }).join('')
          : '<div style="padding:10px 12px;font-size:13.5px">Not on Auntie Tobi yet. <a href="#" id="dLAdd">📋 Copy the Add your business link</a> to send them.</div>';
        res.style.display = 'block';
        $$('[data-slug]', res).forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); res.style.display = 'none'; pick(b.dataset.slug); }; });
        var ad = $('#dLAdd', res); if (ad) ad.onmousedown = function (e) { e.preventDefault(); try { navigator.clipboard.writeText(addUrl); X.toast('📋 Add your business link copied'); } catch (x) { prompt('Copy the link', addUrl); } };
      }, 250);
    };
    $('#dL', s).onblur = function () { setTimeout(function () { res.style.display = 'none'; }, 150); };
    $('#dL', s).onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var f = $('[data-slug]', res); if (f && res.style.display !== 'none') { res.style.display = 'none'; pick(f.dataset.slug); } else $('#dLGo', s).click(); } };
    $('#dLGo', s).onclick = function () { var v = $('#dL', s).value.trim(); if (!v) return; if (!isLink(v)) { var f = $('[data-slug]', res); if (f) { res.style.display = 'none'; return pick(f.dataset.slug); } } pick(v); };
    async function pick(v) {
      var msg = $('#dLMsg', s), go = $('#dLGo', s);
      go.disabled = true; msg.textContent = 'Looking it up…';
      try {
        var L = (await X.api('gu-listing', { link: v })).listing; listing = L; $('#dL', s).value = L.url;
        $('#dN', s).value = L.name; if (L.ig) $('#dH', s).value = '@' + String(L.ig).replace(/^@/, ''); if (L.wa || L.phone) $('#dW', s).value = L.wa || L.phone; if (L.cat && !$('#dC', s).value) $('#dC', s).value = L.cat.toLowerCase();
        msg.innerHTML = '✅ Found <b>' + esc(L.name) + '</b>' + (L.loc ? ' · ' + esc(L.loc) : '');
      } catch (e) { msg.textContent = e.message; }
      go.disabled = false;
    }
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
    var wk = addDays(t, -7), quiet = D.clients.filter(function (c) { var d = c.done || {}, pr = clProgress(c); return c.reportOn && pr.of && pr.n < pr.of && !d[9] && String(c.lastTickAt || c.reportAt || '').slice(0, 10) < wk; });
    if (!forms.length && !chk.length && !late.length && !quiet.length) return '';
    var line = function (c, why) { return '<a href="#" data-gu-open="' + esc(c.id) + '" style="display:block;padding:10px 0;border-bottom:1px solid var(--line,#eee);color:inherit;text-decoration:none"><b>' + esc(c.name) + '</b> <span class="muted">· ' + why + '</span></a>'; };
    return '<div class="h2">✨ Instagram Revamp</div><div class="card" style="padding:0 14px;margin-bottom:12px">' + forms.map(function (c) { return line(c, '📝 form received ' + nice(c.form && c.form.at) + ' — start the audit'); }).join('') + late.map(function (c) { return line(c, '⏰ was due ' + nice(c.due)); }).join('') + chk.map(function (c) { return line(c, '📈 30-day check-in due'); }).join('') + quiet.map(function (c) { var pr = clProgress(c); return line(c, '😴 no ticks for a week (' + pr.n + '/' + pr.of + ' done) — send nudge G'); }).join('') + '</div>';
  }
  var PENDING = null;
  function open(id) { PENDING = id; }   // the next view() opens this client
  window.HQGlow = { init: function (o) { X = o; }, view: view, todayBox: todayBox, open: open };
})();
