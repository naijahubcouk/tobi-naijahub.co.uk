/*
 * 🎓 HQ → Test learners (admin only): people who saved their progress on the free practice-test sites
 *   (lifeinuktest / ukdrivingtheorytest .auntietobi.co.uk). Counts only — study tips are switched off for now
 *   (the tips list + Download button come back when tips do).
 */
(function () {
  'use strict';
  var X = null, R = null;
  function nice(d) { if (!d) return ''; var t = new Date(String(d).slice(0, 10) + 'T12:00:00'); return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  var NAME = { lituk: 'Life in the UK', drive: 'Driving Theory' };
  function csv() {
    var rows = [['email', 'saved on', 'last used', 'tests', 'passed']].concat(R.list.map(function (u) { return [u.email, u.at, u.last, u.tests.map(function (k) { return NAME[k]; }).join(' + '), u.passed.map(function (k) { return NAME[k]; }).join(' + ')]; }));
    var txt = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = 'test-learners-tips-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function view() {
    document.getElementById('ttl').textContent = 'Test learners'; document.getElementById('topRight').innerHTML = '';
    var main = document.getElementById('view'); if (!main) return;
    main.innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { R = await X.api('learn-stats'); } catch (e) { main.innerHTML = '<div class="wrap"><div class="err">' + X.esc(e.message) + '</div></div>'; return; }
    var tile = function (n, l, e) { return '<div class="card" style="padding:16px;text-align:center"><div style="font-size:28px;font-weight:800;color:#057A44">' + n + '</div><div class="muted" style="font-size:13px">' + e + ' ' + l + '</div></div>'; };
    var test = function (k, ico) {
      var t = R[k];
      return '<div class="card" style="padding:16px"><b>' + ico + ' ' + NAME[k] + '</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:10px">' +
        [[t.users, 'learners'], [t.booked, 'booked a test'], [t.answered, 'questions answered'], [t.mocks, 'mock tests'], [t.passMock, 'passed a mock'], [t.passed, 'said they passed 🎉']].map(function (x) { return '<div style="background:#F7F7F9;border-radius:12px;padding:10px;text-align:center"><div style="font-size:20px;font-weight:800">' + x[0] + '</div><div class="muted" style="font-size:12px">' + x[1] + '</div></div>'; }).join('') + '</div></div>';
    };
    var max = Math.max(1, Math.max.apply(null, R.days.map(function (d) { return d.n; })));
    main.innerHTML = '<div class="wrap"><p class="muted" style="margin:0 0 14px">People who saved their progress on the free practice-test sites (it’s optional — most people practise without it). Their answers stay private; only counts are shown.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">' +
      tile(R.total, 'saved their progress', '👥') + tile(R.active7, 'practised this week', '🔥') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:14px">' + test('lituk', '🇬🇧') + test('drive', '🚗') + '</div>' +
      '<div class="card" style="padding:16px;margin-bottom:14px"><b>New in the last 14 days</b><div style="display:flex;align-items:flex-end;gap:6px;height:110px;margin-top:12px">' +
      R.days.map(function (d) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end" title="' + nice(d.d) + ': ' + d.n + '"><span style="font-size:11px;color:#4B5563">' + (d.n || '') + '</span><div style="width:100%;max-width:26px;border-radius:6px 6px 0 0;background:' + (d.n ? '#057A44' : '#E5E7EB') + ';height:' + Math.max(3, Math.round(d.n / max * 80)) + 'px"></div><span style="font-size:10px;color:#9CA3AF">' + new Date(d.d + 'T12:00:00').getDate() + '</span></div>'; }).join('') + '</div></div>' +
      '</div>';
    var b = document.getElementById('lrCsv'); if (b) b.onclick = csv;
  }
  window.HQLearn = { init: function (o) { X = o; }, view: view };
})();
