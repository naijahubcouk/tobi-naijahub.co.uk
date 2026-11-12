/*
 * 💚 HQ → My Plan users (admin only): how many people use My Plan in the app.
 *   Counts only — HQ never sees anyone's plan. Sunday Update sign-ups are counted here too.
 */
(function () {
  'use strict';
  var X = null;
  function nice(d) { if (!d) return ''; var t = new Date(String(d).slice(0, 10) + 'T12:00:00'); return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  async function view() {
    document.getElementById('ttl').textContent = 'My Plan users'; document.getElementById('topRight').innerHTML = '';
    var main = document.getElementById('view'); if (!main) return;
    main.innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    var r; try { r = await X.api('myplan-stats'); } catch (e) { main.innerHTML = '<div class="wrap"><div class="err">' + X.esc(e.message) + '</div></div>'; return; }
    var max = Math.max(1, Math.max.apply(null, r.days.map(function (d) { return d.n; })));
    var tile = function (n, l, e) { return '<div class="card" style="padding:16px;text-align:center"><div style="font-size:28px;font-weight:800;color:#057A44">' + n + '</div><div class="muted" style="font-size:13px">' + e + ' ' + l + '</div></div>'; };
    main.innerHTML = '<div class="wrap"><p class="muted" style="margin:0 0 14px">People using My Plan in the app. Counts only — their plans are private and never shown here.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">' +
      tile(r.total, 'signed up', '👥') + tile(r.active7, 'active this week', '🔥') + tile(r.activeToday, 'active today', '☀️') + tile(r.items, 'things in plans', '📋') + tile(r.news, 'Sunday Update sign-ups', '📰') + '</div>' +
      '<div class="card" style="padding:16px;margin-bottom:14px"><b>New sign-ups — last 14 days</b><div style="display:flex;align-items:flex-end;gap:6px;height:120px;margin-top:12px">' +
      r.days.map(function (d) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end" title="' + nice(d.d) + ': ' + d.n + '"><span style="font-size:11px;color:#4B5563">' + (d.n || '') + '</span><div style="width:100%;max-width:26px;background:#057A44;border-radius:5px 5px 0 0;height:' + Math.max(2, Math.round(d.n / max * 90)) + 'px;opacity:' + (d.n ? 1 : .2) + '"></div><span style="font-size:10px;color:#6B7280">' + nice(d.d).split(' ')[0] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card" style="padding:16px"><b>Latest sign-ups</b>' + (r.latest.length ? '<div style="overflow:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="text-align:left;color:#6B7280;font-size:12.5px"><th style="padding:6px 8px">Email</th><th style="padding:6px 8px">Town</th><th style="padding:6px 8px">Joined</th><th style="padding:6px 8px">Last used</th><th style="padding:6px 8px">Items</th><th style="padding:6px 8px">📰</th></tr>' +
        r.latest.map(function (u) { return '<tr style="border-top:1px solid var(--line)"><td style="padding:7px 8px;word-break:break-all">' + X.esc(u.email) + '</td><td style="padding:7px 8px">' + X.esc(u.town || '—') + '</td><td style="padding:7px 8px;white-space:nowrap">' + nice(u.at) + '</td><td style="padding:7px 8px;white-space:nowrap">' + nice(u.last) + '</td><td style="padding:7px 8px">' + u.n + '</td><td style="padding:7px 8px">' + (u.news ? '✅' : '') + '</td></tr>'; }).join('') + '</table></div>'
        : '<p class="muted" style="margin:8px 0 0">No sign-ups yet. They’ll appear here as people save their plans in the app.</p>') + '</div></div>';
  }
  window.HQPlan = { init: function (o) { X = o; }, view: view };
})();
