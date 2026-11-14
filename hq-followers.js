/*
 * 📈 HQ → Followers tracker (admin only): @auntietobi_uk Instagram and the Auntie Tobi WhatsApp Channel.
 *   Type the two numbers in (once a week is enough) → growth this week / month, a chart, and targets.
 */
(function () {
  'use strict';
  var X = null, D = null, range = 90;
  var K = { ig: { name: 'Instagram', sub: '@auntietobi_uk', emoji: '📸', col: '#C13584' }, ch: { name: 'WhatsApp Channel', sub: 'Auntie Tobi Channel', emoji: '💬', col: '#057A44' } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var fmt = function (n) { return n == null ? '—' : Number(n).toLocaleString('en-GB'); };
  var dayIso = function (d) { return d.toISOString().slice(0, 10); };
  var today = function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return dayIso(d); };
  var addDays = function (s, n) { var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return dayIso(d); };
  var nice = function (s, y) { return new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', y ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); };
  var between = function (a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); };

  // the series for one tracker, oldest first: [{ d, n }]
  function series(k) { return Object.keys(D.items).sort().filter(function (d) { return D.items[d][k] != null; }).map(function (d) { return { d: d, n: D.items[d][k] }; }); }
  // the last value on or before a day
  function at(s, day) { var v = null; s.forEach(function (x) { if (x.d <= day) v = x; }); return v; }
  function change(s, days) { if (s.length < 2) return null; var last = s[s.length - 1], base = at(s, addDays(last.d, -days)) || s[0]; if (base.d === last.d || between(base.d, last.d) > Math.ceil(days * 1.6)) return null; return last.n - base.n; }   // only compares with a number from about that long ago
  function perDay(s) { if (s.length < 2) return 0; var last = s[s.length - 1], base = at(s, addDays(last.d, -30)) || s[0]; var gap = between(base.d, last.d); return gap ? (last.n - base.n) / gap : 0; }
  var plus = function (n) { return n == null ? '<span class="muted">—</span>' : '<b style="color:' + (n < 0 ? '#B42318' : '#057A44') + '">' + (n > 0 ? '+' : '') + fmt(n) + '</b>'; };

  function tile(k) {
    var s = series(k), last = s[s.length - 1], t = D.targets[k], k0 = K[k];
    var h = '<div class="card" style="padding:16px;flex:1;min-width:260px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div style="font-weight:800">' + k0.emoji + ' ' + k0.name + '</div><div class="muted" style="font-size:12.5px">' + k0.sub + '</div></div>' +
      '<button class="btn ghost sm" data-tgt="' + k + '">🎯 ' + (t ? 'Change target' : 'Set a target') + '</button></div>' +
      '<div style="font-size:34px;font-weight:800;margin-top:8px;color:' + k0.col + '">' + (last ? fmt(last.n) : '—') + '</div>' +
      '<div class="muted" style="font-size:12.5px">' + (last ? 'followers · ' + nice(last.d, true) : 'No numbers yet') + '</div>' +
      '<div class="row" style="gap:14px;margin-top:10px;font-size:14px"><span>This week ' + plus(change(s, 7)) + '</span><span>This month ' + plus(change(s, 30)) + '</span></div>';
    if (t && last) {
      var pct = Math.max(0, Math.min(100, Math.round(100 * last.n / t.n))), need = t.n - last.n, left = Math.max(0, between(last.d, t.by)), rate = perDay(s);
      var msg = need <= 0 ? '🎉 Target reached!' : !left ? 'The target date has passed' : rate <= 0 ? 'Add a few weeks of numbers to see if you’re on track' : (last.n + rate * left >= t.n ? '✅ On track' : '⚠️ Behind — you need about +' + fmt(Math.ceil(need / left * 7)) + ' a week');
      h += '<div style="margin-top:12px;font-size:13.5px"><div class="row" style="justify-content:space-between"><span>🎯 <b>' + fmt(t.n) + '</b> by ' + nice(t.by, true) + '</span><span class="muted">' + pct + '%</span></div>' +
        '<div style="height:9px;background:#EEF0F3;border-radius:6px;margin-top:6px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + k0.col + ';border-radius:6px"></div></div>' +
        '<div style="margin-top:6px">' + msg + (need > 0 && left ? ' · ' + fmt(need) + ' to go, ' + left + ' days left' : '') + '</div></div>';
    }
    return h + '</div>';
  }

  // one small line chart per tracker (plain SVG, no libraries)
  function chart(k) {
    var all = series(k), from = range ? addDays(today(), -range) : '0000', s = all.filter(function (x) { return x.d >= from; });
    var k0 = K[k];
    if (s.length < 2) return '<div class="card" style="padding:16px;flex:1;min-width:260px"><b>' + k0.emoji + ' ' + k0.name + '</b><p class="muted" style="margin:8px 0 0;font-size:13.5px">The chart appears once you’ve added numbers on two different days.</p></div>';
    var W = 520, H = 170, P = 48, d0 = s[0].d, span = Math.max(1, between(d0, s[s.length - 1].d));
    var mn = Math.min.apply(null, s.map(function (x) { return x.n; })), mx = Math.max.apply(null, s.map(function (x) { return x.n; }));
    if (mx === mn) { mx += 1; mn = Math.max(0, mn - 1); }
    var x = function (d) { return P + (W - P - 10) * between(d0, d) / span; }, y = function (n) { return 12 + (H - 34) * (1 - (n - mn) / (mx - mn)); };
    var pts = s.map(function (p) { return x(p.d).toFixed(1) + ',' + y(p.n).toFixed(1); }).join(' ');
    return '<div class="card" style="padding:16px;flex:1;min-width:260px"><b>' + k0.emoji + ' ' + k0.name + '</b>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="' + k0.name + ' followers over time">' +
      '<line x1="' + P + '" y1="' + y(mx) + '" x2="' + (W - 10) + '" y2="' + y(mx) + '" stroke="#EEF0F3"/><line x1="' + P + '" y1="' + y(mn) + '" x2="' + (W - 10) + '" y2="' + y(mn) + '" stroke="#EEF0F3"/>' +
      '<text x="' + (P - 6) + '" y="' + (y(mx) + 4) + '" text-anchor="end" font-size="11" fill="#6B7280">' + fmt(mx) + '</text><text x="' + (P - 6) + '" y="' + (y(mn) + 4) + '" text-anchor="end" font-size="11" fill="#6B7280">' + fmt(mn) + '</text>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + k0.col + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      s.map(function (p) { return '<circle cx="' + x(p.d).toFixed(1) + '" cy="' + y(p.n).toFixed(1) + '" r="3.5" fill="' + k0.col + '"><title>' + nice(p.d) + ': ' + fmt(p.n) + '</title></circle>'; }).join('') +
      '<text x="' + P + '" y="' + (H - 4) + '" font-size="11" fill="#6B7280">' + nice(s[0].d) + '</text><text x="' + (W - 10) + '" y="' + (H - 4) + '" text-anchor="end" font-size="11" fill="#6B7280">' + nice(s[s.length - 1].d) + '</text></svg></div>';
  }

  function draw() {
    var main = $('#view'); if (!main) return;
    var days = Object.keys(D.items).sort().reverse(), lastDay = days[0], stale = !lastDay || between(lastDay, today()) >= 7, cur = D.items[today()] || {};
    main.innerHTML = '<div class="wrap">' +
      (stale ? '<div class="note" style="margin-bottom:12px">📅 ' + (lastDay ? 'Last updated ' + nice(lastDay) + ' — time for this week’s numbers.' : 'Add your numbers below to start tracking. Once a week is enough.') + '</div>' : '') +
      '<div class="card" style="padding:16px;margin-bottom:14px"><b>✏️ Add today’s numbers</b><div class="muted" style="font-size:12.5px;margin-top:2px">Instagram: the Followers number on your profile · WhatsApp Channel: the followers number under the Channel name</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px;align-items:flex-end">' +
      '<div style="flex:1;min-width:140px"><label for="flD" style="font-size:12.5px">Date</label><input type="date" id="flD" value="' + today() + '" max="' + today() + '"></div>' +
      '<div style="flex:1;min-width:140px"><label for="flIg" style="font-size:12.5px">📸 Instagram followers</label><input id="flIg" inputmode="numeric" placeholder="e.g. 4,250" value="' + (cur.ig != null ? cur.ig : '') + '"></div>' +
      '<div style="flex:1;min-width:140px"><label for="flCh" style="font-size:12.5px">💬 Channel followers</label><input id="flCh" inputmode="numeric" placeholder="e.g. 620" value="' + (cur.ch != null ? cur.ch : '') + '"></div>' +
      '<button class="btn primary" id="flSave" style="min-height:44px">Save</button></div></div>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-bottom:14px;align-items:stretch">' + tile('ig') + tile('ch') + '</div>' +
      '<div class="chipbar" style="margin-bottom:10px">' + [[30, '30 days'], [90, '3 months'], [365, '1 year'], [0, 'All']].map(function (r) { return '<button class="chip" data-rg="' + r[0] + '" aria-pressed="' + (range === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-bottom:14px;align-items:stretch">' + chart('ig') + chart('ch') + '</div>' +
      '<div class="card" style="padding:12px 16px"><b>History</b>' + (days.length ? '<div style="overflow:auto;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr class="muted" style="text-align:left;font-size:12.5px"><th style="padding:6px 8px">Date</th><th style="padding:6px 8px">📸 Instagram</th><th style="padding:6px 8px">💬 Channel</th><th></th></tr>' +
        days.slice(0, 120).map(function (d) { var v = D.items[d]; return '<tr style="border-top:1px solid var(--line,#eee)"><td style="padding:7px 8px">' + nice(d, true) + '</td><td style="padding:7px 8px">' + fmt(v.ig) + '</td><td style="padding:7px 8px">' + fmt(v.ch) + '</td><td style="padding:7px 8px;text-align:right"><button class="btn ghost sm" data-del="' + d + '" aria-label="Delete ' + nice(d) + '">🗑</button></td></tr>'; }).join('') + '</table></div>'
        : '<p class="muted" style="margin:6px 0 0">Nothing yet.</p>') + '</div></div>';
    $('#flSave').onclick = async function () {
      var b = this; b.disabled = true;
      try { D = await X.api('fl-add', { day: $('#flD').value, ig: $('#flIg').value.trim(), ch: $('#flCh').value.trim() }); X.toast('📈 Saved'); draw(); } catch (e) { X.toast(e.message); b.disabled = false; }
    };
    $('#flD').onchange = function () { var v = D.items[this.value] || {}; $('#flIg').value = v.ig != null ? v.ig : ''; $('#flCh').value = v.ch != null ? v.ch : ''; };
    main.querySelectorAll('[data-rg]').forEach(function (b) { b.onclick = function () { range = +b.dataset.rg; draw(); }; });
    main.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = async function () { if (!confirm('Delete the numbers for ' + nice(b.dataset.del, true) + '?')) return; try { D = await X.api('fl-del', { day: b.dataset.del }); draw(); } catch (e) { X.toast(e.message); } }; });
    main.querySelectorAll('[data-tgt]').forEach(function (b) { b.onclick = function () { targetSheet(b.dataset.tgt); }; });
  }
  function targetSheet(k) {
    var t = D.targets[k] || {}, s = X.sheet('<h3 style="margin:0 0 4px">🎯 ' + K[k].name + ' target</h3><div class="muted" style="font-size:13.5px">How many followers, and by when?</div>' +
      '<label for="tgN" style="margin-top:10px">Followers</label><input id="tgN" inputmode="numeric" placeholder="e.g. 10,000" value="' + (t.n || '') + '">' +
      '<label for="tgB" style="margin-top:8px">By</label><input id="tgB" type="date" value="' + (t.by || addDays(today(), 90)) + '">' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px">' + (t.n ? '<button class="btn ghost" id="tgRm">Remove target</button>' : '') + '<button class="btn ghost" id="tgX">Cancel</button><button class="btn primary" id="tgGo">Save</button></div>');
    var go = async function (n) { try { D = await X.api('fl-target', { kind: k, n: n, by: $('#tgB', s).value }); s.remove(); draw(); } catch (e) { X.toast(e.message); } };
    $('#tgX', s).onclick = function () { s.remove(); };
    $('#tgGo', s).onclick = function () { go($('#tgN', s).value.trim()); };
    if ($('#tgRm', s)) $('#tgRm', s).onclick = function () { go(''); };
  }
  async function view() {
    document.getElementById('ttl').textContent = 'Followers tracker'; document.getElementById('topRight').innerHTML = '';
    var main = $('#view'); if (!main) return;
    main.innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { D = await X.api('fl-get'); } catch (e) { main.innerHTML = '<div class="wrap"><div class="err">' + X.esc(e.message) + '</div></div>'; return; }
    draw();
  }
  window.HQFollow = { init: function (o) { X = o; }, view: view };
})();
