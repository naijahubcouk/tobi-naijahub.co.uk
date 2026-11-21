/*
 * Auntie Tobi HQ — 💚 Club check-ups: a warm monthly message to every Business Club member.
 * HQ prepares the messages on the 1st (or when you tap Prepare); you check each one and send it yourself —
 * 💬 WhatsApp (opens with the message filled in), 📋 Copy (for Instagram), or 📧 Email (sends only when you tap it).
 * HQ calls HQClub.init({ api, sheet, toast, esc }) once, then HQClub.view() for the #club page.
 */
(function () {
  'use strict';
  var X = null, D = null, month = '', filt = 'all';
  var ST = { todo: ['To prepare', '#6B7280', '#F3F4F6'], ready: ['Ready', '#92400E', '#FEF3C7'], sent: ['Sent', '#1D4ED8', '#DBEAFE'], replied: ['Replied', '#057A44', '#E6F4EC'], help: ['Needs help', '#B91C1C', '#FEE2E2'] };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return X.esc(s); }
  function shift(m, n) { var d = new Date(m + '-15T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); }
  function thisMonth() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function pill(s) { var x = ST[s] || ST.todo; return '<span class="ccpill" style="color:' + x[1] + ';background:' + x[2] + '">' + x[0] + '</span>'; }

  async function load() { D = await X.api('cc-list', { month: month }); }
  async function view() {
    month = month || thisMonth();
    $('#ttl').textContent = 'Club check-ups';
    $('#topRight').innerHTML = '<button class="btn ghost" id="ccTh">✏️ Monthly themes</button>';
    $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading members…</p></div>';
    try { await load(); } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="card"><p>' + esc(e.message) + '</p></div></div>'; return; }
    draw();
  }
  function draw() {
    var rows = D.rows, c = D.counts, todo = c.todo || 0;
    var list = filt === 'all' ? rows : rows.filter(function (r) { return r.status === filt; });
    $('#view').innerHTML = '<div class="wrap">' +
      '<div class="card ccHead"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><button class="btn ghost sm" id="ccPrev">◀</button><b style="font-size:18px">' + esc(D.monthName) + '</b><button class="btn ghost sm" id="ccNext"' + (month >= thisMonth() ? ' disabled' : '') + '>▶</button>' +
        '<span class="muted" style="margin-left:auto;font-size:13px">' + rows.length + ' Business Club member' + (rows.length === 1 ? '' : 's') + '</span></div>' +
        '<div style="margin-top:8px;font-size:14px">🎯 <b>This month’s theme:</b> ' + esc(D.theme) + '</div>' +
        (todo ? '<div class="row" style="gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><button class="btn primary" id="ccPrep">✍️ Prepare ' + todo + ' message' + (todo === 1 ? '' : 's') + '</button><span class="muted" style="font-size:12.5px">HQ also prepares them by itself on the 1st. About 5 seconds each. Nothing is sent.</span></div>' : '') +
      '</div>' +
      '<div class="chipbar" style="margin:12px 0">' + [['all', 'All (' + rows.length + ')']].concat(['todo', 'ready', 'sent', 'replied', 'help'].filter(function (k) { return c[k]; }).map(function (k) { return [k, ST[k][0] + ' (' + c[k] + ')']; })).map(function (x) { return '<button class="chip" data-f="' + x[0] + '" aria-pressed="' + (filt === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (rows.length ? list.map(row).join('') || '<div class="card"><p class="muted">Nothing here.</p></div>' : '<div class="card"><p class="muted">No active Business Club members yet.</p></div>') +
      '<p class="muted" style="font-size:12.5px;margin-top:10px">💬 WhatsApp opens the chat with the message filled in — you tap send. 📧 Email sends only when you tap it. Nothing is ever sent by itself.</p></div>';
    bind();
  }
  function row(r) {
    var facts = [r.used ? '🛠️ Used Studio ' + r.used + '× this month' : '🛠️ Didn’t use Studio this month', r.listing ? (r.listing.photo ? '📸 Listing has a photo' : '📷 Listing has no photo') : '➕ No listing linked', r.until ? '🔁 Renews ' + new Date(r.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''].filter(Boolean);
    return '<div class="card ccrow"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:15.5px">' + esc(r.biz || r.email) + '</b>' + pill(r.status) + (r.via ? '<span class="muted" style="font-size:12px">via ' + (r.via === 'email' ? '📧 email' : '💬 WhatsApp') + '</span>' : '') + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:2px">' + esc([r.name, r.email].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="ccfacts">' + facts.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
      (r.msg ? '<details class="ccmsg"' + (r.status === 'ready' ? ' open' : '') + '><summary>' + (r.status === 'ready' ? '💌 The message' : '💌 Message') + (r.subject ? ' <span class="muted" style="font-weight:400">· ' + esc(r.subject) + '</span>' : '') + '</summary><div class="cctext">' + esc(r.msg).replace(/\n/g, '<br>') + '</div></details>' : '') +
      (r.note ? '<div class="ccnote">📝 ' + esc(r.note) + '</div>' : '') +
      '<div class="ccbtns">' +
        (r.msg ? (r.wa ? '<a class="btn primary sm" target="_blank" rel="noopener" data-wa="' + esc(r.email) + '" href="https://wa.me/' + esc(r.wa) + '?text=' + encodeURIComponent(r.msg) + '">💬 WhatsApp</a>' : '<span class="muted" style="font-size:12px;align-self:center">No WhatsApp number</span>') +
          '<button class="btn ghost sm" data-cp="' + esc(r.email) + '">📋 Copy</button><button class="btn ghost sm" data-em="' + esc(r.email) + '">📧 Email</button><button class="btn ghost sm" data-ed="' + esc(r.email) + '">✏️ Edit</button>'
          : '<button class="btn ghost sm" data-one="' + esc(r.email) + '">✍️ Prepare this one</button>') +
        (r.status === 'sent' || r.status === 'ready' ? '<button class="btn ghost sm" data-rep="' + esc(r.email) + '">✅ They replied</button>' : '') +
        (r.status === 'replied' || r.status === 'help' ? '<button class="btn ghost sm" data-rep="' + esc(r.email) + '">📝 Edit note</button>' : '') +
        (r.msg && r.status === 'ready' ? '<button class="btn ghost sm" data-mk="' + esc(r.email) + '" title="Already sent it another way">Mark sent</button>' : '') +
      '</div></div>';
  }
  function byEmail(e) { return D.rows.filter(function (r) { return r.email === e; })[0]; }
  async function patch(email, p, msg) { var r = await X.api('cc-update', { month: month, email: email, patch: p }); Object.assign(byEmail(email), r.row); recount(); if (msg) X.toast(msg); draw(); }
  function recount() { D.counts = D.rows.reduce(function (c, r) { c[r.status] = (c[r.status] || 0) + 1; return c; }, {}); }
  function bind() {
    $('#ccTh').onclick = themesSheet;
    $('#ccPrev').onclick = function () { month = shift(month, -1); filt = 'all'; view(); };
    $('#ccNext').onclick = function () { month = shift(month, 1); filt = 'all'; view(); };
    $$('[data-f]').forEach(function (b) { b.onclick = function () { filt = b.dataset.f; draw(); }; });
    if ($('#ccPrep')) $('#ccPrep').onclick = prepAll;
    $$('[data-one]').forEach(function (b) { b.onclick = async function () { b.disabled = true; b.textContent = '✍️ Writing…'; try { await X.api('cc-prep', { month: month, email: b.dataset.one }); await load(); draw(); } catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '✍️ Prepare this one'; } }; });
    $$('[data-wa]').forEach(function (a) { a.onclick = function () { var e = a.dataset.wa, r = byEmail(e); setTimeout(function () { if (r.status === 'ready') patch(e, { status: 'sent', via: 'whatsapp' }, '💬 Marked as sent on WhatsApp'); }, 400); }; });
    $$('[data-cp]').forEach(function (b) { b.onclick = function () { var r = byEmail(b.dataset.cp); (navigator.clipboard ? navigator.clipboard.writeText(r.msg) : Promise.reject()).then(function () { X.toast('📋 Copied — paste it in a DM. Tap “Mark sent” after.'); }, function () { prompt('Copy this message:', r.msg); }); }; });
    $$('[data-mk]').forEach(function (b) { b.onclick = function () { patch(b.dataset.mk, { status: 'sent', via: 'whatsapp' }, 'Marked as sent'); }; });
    $$('[data-em]').forEach(function (b) { b.onclick = async function () { var r = byEmail(b.dataset.em); if (!confirm('Send this check-up by email to ' + r.email + ' now?')) return; b.disabled = true; b.textContent = '📧 Sending…'; try { var x = await X.api('cc-email', { month: month, email: r.email }); Object.assign(r, x.row); recount(); X.toast('📧 Sent to ' + r.email); draw(); } catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '📧 Email'; } }; });
    $$('[data-ed]').forEach(function (b) { b.onclick = function () { editSheet(byEmail(b.dataset.ed)); }; });
    $$('[data-rep]').forEach(function (b) { b.onclick = function () { replySheet(byEmail(b.dataset.rep)); }; });
  }
  async function prepAll() {
    var b = $('#ccPrep'), total = D.counts.todo || 0, made = 0; b.disabled = true;
    try {
      for (var guard = 0; guard < 40; guard++) {
        b.textContent = '✍️ Writing… ' + made + ' of ' + total;
        var r = await X.api('cc-prep', { month: month }); made += r.done;
        if (!r.left || (!r.done && r.failed)) { if (r.failed) X.toast(r.failed + ' couldn’t be written — tap “Prepare this one” to try again'); break; }
      }
      await load(); draw(); X.toast('✍️ ' + made + ' message' + (made === 1 ? '' : 's') + ' ready to check');
    } catch (e) { X.toast(e.message); await load().catch(function () {}); draw(); }
  }
  function editSheet(r) {
    var s = X.sheet('<h2>✏️ ' + esc(r.biz || r.email) + '</h2><label>Email subject</label><input id="ceS" maxlength="80" value="' + esc(r.subject || '') + '"><label>Message</label><textarea id="ceM" rows="12">' + esc(r.msg || '') + '</textarea>' +
      '<div class="row" style="justify-content:space-between;gap:8px;margin-top:12px"><button class="btn ghost" id="ceR">🔄 Write it again</button><span><button class="btn ghost" id="ceX">Cancel</button> <button class="btn primary" id="ceOk">Save</button></span></div>');
    $('#ceX', s).onclick = function () { s.remove(); };
    $('#ceOk', s).onclick = async function () { try { await patch(r.email, { msg: $('#ceM', s).value, subject: $('#ceS', s).value }, 'Saved'); s.remove(); } catch (e) { X.toast(e.message); } };
    $('#ceR', s).onclick = async function () { var b = this; b.disabled = true; b.textContent = '✍️ Writing…'; try { await X.api('cc-prep', { month: month, email: r.email, force: true }); await load(); var n = byEmail(r.email); $('#ceM', s).value = n.msg; $('#ceS', s).value = n.subject || ''; draw(); } catch (e) { X.toast(e.message); } b.disabled = false; b.textContent = '🔄 Write it again'; };
  }
  function replySheet(r) {
    var s = X.sheet('<h2>✅ ' + esc(r.biz || r.email) + ' replied</h2><p class="muted" style="margin:4px 0 10px">A short note of what they said — next month’s message will follow on from it.</p><textarea id="crN" rows="4" placeholder="e.g. Slow weekends; wants help with Christmas posts">' + esc(r.note || '') + '</textarea>' +
      '<label class="row" style="gap:8px;align-items:center;margin-top:10px;font-weight:600"><input type="checkbox" id="crH"' + (r.status === 'help' ? ' checked' : '') + ' style="width:18px;height:18px"> 🆘 They need help from me</label>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="crX">Cancel</button><button class="btn primary" id="crOk">Save</button></div>');
    $('#crX', s).onclick = function () { s.remove(); };
    $('#crOk', s).onclick = async function () { try { await patch(r.email, { status: $('#crH', s).checked ? 'help' : 'replied', note: $('#crN', s).value }, 'Saved'); s.remove(); } catch (e) { X.toast(e.message); } };
  }
  function themesSheet() {
    var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var s = X.sheet('<h2>✏️ Monthly themes</h2><p class="muted" style="margin:4px 0 10px">Each month’s check-up gives one tip on its theme.</p>' + D.themes.map(function (t, i) { return '<label>' + names[i] + '</label><input data-th="' + i + '" maxlength="200" value="' + esc(t) + '">'; }).join('') +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn ghost" id="ctX">Cancel</button><button class="btn primary" id="ctOk">Save</button></div>');
    $('#ctX', s).onclick = function () { s.remove(); };
    $('#ctOk', s).onclick = async function () { try { var r = await X.api('cc-themes', { themes: $$('[data-th]', s).map(function (i) { return i.value; }) }); D.themes = r.themes; D.theme = r.themes[Number(month.slice(5)) - 1]; s.remove(); X.toast('Themes saved'); draw(); } catch (e) { X.toast(e.message); } };
  }
  function init(x) {
    X = x;
    var css = document.createElement('style');
    css.textContent = '.ccpill{font-size:12px;font-weight:800;border-radius:999px;padding:2px 9px}.ccrow{margin-bottom:10px}.ccfacts{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.ccfacts span{font-size:12px;background:#F6F4EE;border-radius:8px;padding:3px 8px}' +
      '.ccmsg summary{cursor:pointer;font-weight:700;font-size:13.5px;color:var(--green-d,#03532E)}.cctext{background:#F0F7F3;border-radius:10px;padding:10px 12px;margin-top:6px;font-size:14px;line-height:1.55}.ccnote{font-size:13px;background:#FFF8E6;border-radius:8px;padding:6px 9px;margin-top:8px}.ccbtns{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}';
    document.head.appendChild(css);
  }
  window.HQClub = { init: init, view: view };
})();
