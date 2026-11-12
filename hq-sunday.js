/*
 * 📰 HQ → Sunday Update (admin only). The draft is made on Saturday morning (or here with ✨ Make it now).
 * Edit it, preview it, send yourself a test, then ✅ Approve — it goes out at 9am on Sunday ONLY if approved.
 */
(function () {
  'use strict';
  var X = null, D = null, I = null, O = null, dirty = false;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return X.esc(s == null ? '' : String(s)); };
  var nice = function (s, long) { return new Date(s + 'T12:00:00').toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }); };
  var CH = { draft: ['📝 Draft — not approved', '#FFF4D6', '#7A5300'], approved: ['✅ Approved — goes out Sunday 9am', '#E3F2EA', '#057A44'], sending: ['📤 Sending now…', '#E0ECFF', '#0C447C'], sent: ['📬 Sent', '#E3F2EA', '#057A44'] };

  async function load(week) { D = await X.api('sun-get', week ? { week: week } : {}); I = D.issue ? JSON.parse(JSON.stringify(D.issue)) : null; dirty = false; }
  async function view() {
    $('#ttl').textContent = 'Sunday Update'; $('#topRight').innerHTML = '';
    $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { await load(); } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    draw();
  }
  function chip(st) { var c = CH[st] || CH.draft; return '<span style="display:inline-block;background:' + c[1] + ';color:' + c[2] + ';font-weight:800;font-size:13px;padding:5px 12px;border-radius:20px">' + c[0] + '</span>'; }
  function row(inner, i, kind, n) { return '<div style="display:flex;gap:10px;align-items:flex-start;border-top:1px solid var(--line);padding:10px 0"><div style="flex:1;min-width:0">' + inner + '</div><div style="display:flex;gap:4px;flex-shrink:0">' + (i > 0 ? '<button class="btn small ghost" data-up="' + kind + ':' + i + '" title="Move up">↑</button>' : '') + (i < n - 1 ? '<button class="btn small ghost" data-dn="' + kind + ':' + i + '" title="Move down">↓</button>' : '') + '<button class="btn small ghost danger" data-rm="' + kind + ':' + i + '" title="Remove">✕</button></div></div>'; }
  function addSel(kind, list, label) {
    var have = (I[kind] || []).map(function (x) { return x.id; });
    var left = (list || []).filter(function (x) { return have.indexOf(x.id) < 0; });
    if (!left.length) return '';
    return '<select data-add="' + kind + '" style="margin-top:8px;max-width:100%"><option value="">＋ ' + label + '</option>' + left.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc((x.emoji ? x.emoji + ' ' : '') + (x.title || x.name) + (x.date ? ' · ' + nice(x.date) : x.at ? ' · ' + nice(x.at) : x.price ? ' · ' + x.price : '')) + '</option>'; }).join('') + '</select>';
  }
  function draw() {
    var v = $('#view'), locked = I && (I.status === 'sending' || I.status === 'sent');
    var h = '<div class="wrap" style="max-width:860px">';
    h += '<div class="card" style="padding:16px;margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b style="font-size:17px">📰 Sunday ' + nice(D.week, true) + '</b><div class="muted" style="font-size:13.5px;margin-top:2px">' + D.subscribers + ' ' + (D.subscribers === 1 ? 'person has' : 'people have') + ' asked for the Sunday Update · goes out at 9am, only if you approve it</div></div>' + (I ? chip(I.status) : '') + '</div>';
    if (!I) {
      h += '<div class="card" style="padding:22px;text-align:center"><div style="font-size:34px">📝</div><b>No draft for this Sunday yet</b><p class="muted" style="margin:6px 0 14px">It’s made for you automatically on Saturday morning from this week’s posts, events and businesses — or make it now.</p><button class="btn primary" id="suMake">✨ Make it now</button></div>';
    } else if (locked) {
      var s = D.stats || {}, sent = I.sent || {};
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>' + esc(I.subject) + '</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:12px">' +
        [[sent.n || 0, 'sent'], [s.opened || 0, 'opened'], [s.clicked || 0, 'clicked a link'], [s.bounced || 0, 'bounced']].map(function (x) { return '<div style="background:var(--bg,#FBF8F1);border-radius:12px;padding:12px;text-align:center"><div style="font-size:24px;font-weight:800;color:#057A44">' + x[0] + '</div><div class="muted" style="font-size:12.5px">' + x[1] + '</div></div>'; }).join('') + '</div>' +
        (I.status === 'sending' ? '<p class="muted" style="margin:10px 0 0">Sending in batches every 10 minutes — ' + (sent.n || 0) + ' of ' + (sent.total || D.subscribers) + ' so far.</p>' : '') +
        '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn ghost" id="suPrev">👀 See the email</button><button class="btn ghost" id="suWa">📣 WhatsApp Channel copy</button></div></div>';
    } else {
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><label>Subject line</label><input id="suSub" maxlength="120" value="' + esc(I.subject) + '">' +
        '<label style="margin-top:12px">Hello from Auntie Tobi</label><textarea id="suIntro" rows="4">' + esc(I.intro) + '</textarea>' +
        '<div class="muted" style="font-size:12.5px;margin-top:6px">💚 People who use My Plan also get “Your week ahead” with their own dates — added automatically for each person.</div></div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>🇬🇧 This week’s UK updates</b>' + (I.posts || []).map(function (p, i, a) { return row('<input data-f="posts:' + i + ':title" value="' + esc(p.title) + '" style="font-weight:700"><textarea data-f="posts:' + i + ':summary" rows="2" style="margin-top:6px;font-size:14px">' + esc(p.summary) + '</textarea>', i, 'posts', a.length); }).join('') + (!(I.posts || []).length ? '<p class="muted" style="margin:8px 0 0">Nothing published in HQ in the last 2 weeks.</p>' : '') + addSel('posts', O && O.posts, 'Add a post') + '</div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>🎉 Events coming up</b>' + (I.events || []).map(function (e, i, a) { return row('<b>' + esc(e.title) + '</b><div class="muted" style="font-size:13px">' + (e.date ? nice(e.date) : '') + (e.loc ? ' · 📍 ' + esc(e.loc) : '') + '</div>', i, 'events', a.length); }).join('') + (!(I.events || []).length ? '<p class="muted" style="margin:8px 0 0">No events in the next 6 weeks.</p>' : '') + addSel('events', O && O.events, 'Add an event') + '</div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>⭐ Business of the week</b>' + (O ? '<select id="suBiz" style="margin-top:8px"><option value="">— None —</option>' + O.bizes.map(function (b) { return '<option value="' + esc(b.slug) + '"' + (I.biz && I.biz.slug === b.slug ? ' selected' : '') + '>' + esc(b.name) + (b.loc ? ' · ' + esc(b.loc) : '') + '</option>'; }).join('') + '</select>' : (I.biz ? '<div style="margin-top:6px">' + esc(I.biz.name) + '</div>' : '')) +
        (I.biz ? '<textarea id="suBizD" rows="3" style="margin-top:8px;font-size:14px">' + esc(I.biz.desc) + '</textarea>' : '') + '<div class="muted" style="font-size:12.5px;margin-top:6px">A nice extra for Business Club and Featured businesses.</div></div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>🛍️ From the Marketplace</b>' + (I.products || []).map(function (p, i, a) { return row('<b>' + esc(p.name) + '</b>' + (p.price ? ' <span style="color:#057A44;font-weight:700">· ' + esc(p.price) + '</span>' : '') + '<div class="muted" style="font-size:13px">' + esc(p.business) + '</div>', i, 'products', a.length); }).join('') + addSel('products', O && O.prods, 'Add a product') + '</div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px"><b>💡 Tip of the week</b><textarea id="suTip" rows="3" style="margin-top:8px">' + esc(I.tip) + '</textarea><div class="muted" style="font-size:12.5px;margin-top:6px">Written by Auntie Tobi AI — please check it’s right before approving.</div></div>';
      h += '<div class="card" style="padding:16px;margin-bottom:12px;position:sticky;bottom:10px;box-shadow:0 6px 20px rgba(0,0,0,.12)"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">' +
        '<button class="btn ghost" id="suSave">💾 Save</button><button class="btn ghost" id="suPrev">👀 Preview</button><button class="btn ghost" id="suTest">📧 Send me a test</button><button class="btn ghost" id="suWa">📣 WhatsApp copy</button>' +
        '<span style="flex:1"></span>' + (I.status === 'approved' ? '<button class="btn ghost" id="suUn">↩️ Undo approval</button>' : '<button class="btn primary" id="suOk">✅ Approve for Sunday 9am</button>') + '</div>' +
        '<div class="muted" id="suNote" style="font-size:12.5px;margin-top:8px">' + (I.status === 'approved' ? 'Approved — it goes to ' + D.subscribers + ' ' + (D.subscribers === 1 ? 'person' : 'people') + ' at 9am on Sunday. Changing anything un-approves it.' : 'Nothing is sent until you press ✅ Approve.') + '</div>' +
        '<div style="margin-top:10px"><button class="btn small ghost" id="suRemake">✨ Start this week’s draft again</button></div></div>';
    }
    if (D.past && D.past.length) h += '<div class="card" style="padding:16px"><b>📬 Past Sunday Updates</b><div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px"><tr style="text-align:left;color:#6B7280;font-size:12.5px"><th style="padding:6px">Sunday</th><th style="padding:6px">Subject</th><th style="padding:6px">Sent</th><th style="padding:6px">Opened</th><th style="padding:6px">Clicked</th></tr>' +
      D.past.map(function (p) { return '<tr style="border-top:1px solid var(--line)"><td style="padding:7px 6px;white-space:nowrap">' + nice(p.week) + '</td><td style="padding:7px 6px">' + esc(p.subject) + '</td><td style="padding:7px 6px">' + (p.n || 0) + '</td><td style="padding:7px 6px">' + (p.opened || 0) + '</td><td style="padding:7px 6px">' + (p.clicked || 0) + '</td></tr>'; }).join('') + '</table></div></div>';
    v.innerHTML = h + '</div>';
    bind();
    if (I && !locked && !O) X.api('sun-options', { week: D.week }).then(function (o) { O = o; collect(); draw(); }).catch(function () {});
  }
  function collect() {
    if (!I || !$('#suSub')) return;
    I.subject = $('#suSub').value; I.intro = $('#suIntro').value; I.tip = $('#suTip').value;
    $$('[data-f]').forEach(function (el) { var p = el.dataset.f.split(':'); I[p[0]][+p[1]][p[2]] = el.value; });
    if ($('#suBizD') && I.biz) I.biz.desc = $('#suBizD').value;
  }
  function bind() {
    var mk = $('#suMake'); if (mk) mk.onclick = async function () { mk.disabled = true; mk.textContent = 'Making it… (about 20s)'; try { await X.api('sun-make', { week: D.week }); await load(D.week); O = null; draw(); X.toast('Draft ready ✅'); } catch (e) { X.toast(e.message); mk.disabled = false; mk.textContent = '✨ Make it now'; } };
    $$('#view input, #view textarea').forEach(function (el) { el.addEventListener('input', function () { dirty = true; }); });
    $$('[data-rm]').forEach(function (b) { b.onclick = function () { collect(); var p = b.dataset.rm.split(':'); I[p[0]].splice(+p[1], 1); dirty = true; draw(); }; });
    $$('[data-up],[data-dn]').forEach(function (b) { b.onclick = function () { collect(); var p = (b.dataset.up || b.dataset.dn).split(':'), a = I[p[0]], i = +p[1], j = b.dataset.up ? i - 1 : i + 1, t = a[i]; a[i] = a[j]; a[j] = t; dirty = true; draw(); }; });
    $$('[data-add]').forEach(function (s) { s.onchange = function () { if (!s.value) return; collect(); var k = s.dataset.add, src = k === 'products' ? O.prods : O[k], x = src.filter(function (y) { return y.id === s.value; })[0]; if (x) { I[k] = (I[k] || []).concat([JSON.parse(JSON.stringify(x))]); dirty = true; } draw(); }; });
    var bz = $('#suBiz'); if (bz) bz.onchange = function () { collect(); var b = O.bizes.filter(function (y) { return y.slug === bz.value; })[0]; I.biz = b ? JSON.parse(JSON.stringify(b)) : null; dirty = true; draw(); };
    var save = async function (quiet) { collect(); var r = await X.api('sun-save', { week: D.week, issue: I }); D = r; I = JSON.parse(JSON.stringify(r.issue)); dirty = false; if (!quiet) X.toast('Saved ✅'); draw(); };
    var sv = $('#suSave'); if (sv) sv.onclick = function () { save().catch(function (e) { X.toast(e.message); }); };
    var pv = $('#suPrev'); if (pv) pv.onclick = async function () { try { if (dirty) await save(true); var r = await X.api('sun-preview', { week: D.week }); var w = X.sheet('<h2>👀 Preview</h2><p class="muted" style="margin:4px 0 10px">How it looks in an inbox (with “Your week ahead” as it would be for you).</p><iframe id="suFr" style="width:100%;height:70vh;border:1px solid var(--line);border-radius:12px;background:#F4F1EA"></iframe><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn ghost" id="suFx">Close</button></div>'); $('#suFr', w).srcdoc = r.html; $('#suFx', w).onclick = function () { w.remove(); }; } catch (e) { X.toast(e.message); } };
    var ts = $('#suTest'); if (ts) ts.onclick = async function () { ts.disabled = true; ts.textContent = 'Sending…'; try { if (dirty) await save(true); var r = await X.api('sun-test', { week: D.week }); X.toast('Test sent to ' + r.sent + ' 📧'); } catch (e) { X.toast(e.message); } ts.disabled = false; ts.textContent = '📧 Send me a test'; };
    var wa = $('#suWa'); if (wa) wa.onclick = async function () { try { if (dirty) await save(true); var r = await X.api('sun-wa', { week: D.week }); var w = X.sheet('<h2>📣 For the WhatsApp Channel</h2><textarea id="suWt" rows="16" style="font-size:14px">' + esc(r.text) + '</textarea><div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn ghost" id="suWx">Close</button><button class="btn primary" id="suWc">📋 Copy</button></div>'); $('#suWx', w).onclick = function () { w.remove(); }; $('#suWc', w).onclick = function () { var t = $('#suWt', w); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } X.toast('Copied ✅'); }; } catch (e) { X.toast(e.message); } };
    var ok = $('#suOk'); if (ok) ok.onclick = async function () { ok.disabled = true; try { if (dirty) await save(true); await X.api('sun-approve', { week: D.week, on: true }); await load(D.week); draw(); X.toast('✅ Approved — it goes out Sunday at 9am'); } catch (e) { X.toast(e.message); ok.disabled = false; } };
    var un = $('#suUn'); if (un) un.onclick = async function () { try { await X.api('sun-approve', { week: D.week, on: false }); await load(D.week); draw(); X.toast('Approval removed — it won’t be sent'); } catch (e) { X.toast(e.message); } };
    var rm = $('#suRemake'); if (rm) rm.onclick = async function () { if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = 'Tap again — your changes to this draft will be lost'; return; } rm.disabled = true; rm.textContent = 'Making it again…'; try { await X.api('sun-make', { week: D.week, force: true }); await load(D.week); O = null; draw(); X.toast('New draft ready ✅'); } catch (e) { X.toast(e.message); rm.disabled = false; } };
  }
  window.HQSun = { init: function (o) { X = o; }, view: view };
})();
