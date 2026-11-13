/* 📬 School emails → School Tracker (HQ, admin only).
 * A small Google Apps Script inside your Gmail forwards new school emails to your School Tracker every 10 minutes.
 * This sheet gives you the script, connects it, and has a "check now" button. */
(function () {
  'use strict';
  var X = null;

  // ── the Gmail script (Seun pastes this once at script.google.com) ──
  function scriptText(key, tracker) {
    return [
      '/* Auntie Tobi School Tracker — Gmail helper',
      '   Forwards new school emails to your School Tracker. Set up from Auntie Tobi HQ → 📬 School emails.',
      '   It only reads emails from the senders below, forwards them, and adds a "Sent to Tracker" label. */',
      '',
      "var TRACKER = '" + tracker + "';",
      "var KEY = '" + key + "';",
      "var SENDERS = ['thehurst.school', 'fourlanesfederation.com', 'sparx.co.uk'];   // add a school's email ending here if needed",
      "var LABEL = 'Sent to Tracker';",
      'var VERSION = 1;',
      '',
      '// ▶ Run this once after pasting: it switches on the 10-minute checks and does a first check.',
      'function setup() {',
      '  autoOn_(true);',
      '  var r = run();',
      "  Logger.log('✅ All set — forwarded ' + r.sent.length + ' email(s). Now do Deploy → New deployment (see HQ).');",
      '}',
      '',
      'function run() {',
      '  var props = PropertiesService.getScriptProperties();',
      '  var lock = LockService.getScriptLock();',
      "  if (!lock.tryLock(20000)) return JSON.parse(props.getProperty('last') || '{\"sent\":[]}');",
      "  var done = JSON.parse(props.getProperty('done') || '[]'), seen = {};",
      '  done.forEach(function (id) { seen[id] = 1; });',
      "  var recent = JSON.parse(props.getProperty('recent') || '[]');",
      "  var sent = [], error = '';",
      '  try {',
      "    var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);",
      "    var q = '(' + SENDERS.map(function (s) { return 'from:' + s; }).join(' OR ') + ') newer_than:3d';",
      '    GmailApp.search(q, 0, 50).forEach(function (th) {',
      '      var msgs = th.getMessages(), touched = false;',
      '      msgs.forEach(function (m, i) {',
      '        var id = m.getId();',
      '        if (seen[id]) return;',
      '        var from = String(m.getFrom()).toLowerCase();',
      '        if (!SENDERS.some(function (s) { return from.indexOf(s) >= 0; })) return;',
      '        // already forwarded by hand? (a later email in this conversation went to the Tracker)',
      '        var byHand = msgs.slice(i + 1).some(function (x) { return String(x.getTo()).toLowerCase().indexOf(TRACKER) >= 0; });',
      '        if (!byHand) {',
      '          m.forward(TRACKER);',
      '          var it = { subject: m.getSubject(), from: m.getFrom(), date: m.getDate().toISOString(), at: new Date().toISOString() };',
      '          sent.push(it); recent.unshift(it);',
      '        }',
      '        seen[id] = 1; done.push(id); touched = true;',
      '      });',
      '      if (touched) th.addLabel(label);',
      '    });',
      "  } catch (e) { error = String((e && e.message) || e); }",
      '  var last = { at: new Date().toISOString(), sent: sent, error: error };',
      "  props.setProperty('done', JSON.stringify(done.slice(-400)));",
      "  props.setProperty('recent', JSON.stringify(recent.slice(0, 20)));",
      "  props.setProperty('last', JSON.stringify(last));",
      '  lock.releaseLock();',
      '  return last;',
      '}',
      '',
      '// HQ talks to the script through its Web app link (only with the secret KEY).',
      'function doGet(e) {',
      '  var p = (e && e.parameter) || {};',
      "  if (p.key !== KEY) return json_({ error: 'key' });",
      "  if (p.do === 'run') run();",
      "  if (p.do === 'auto') autoOn_(p.on === '1');",
      '  var props = PropertiesService.getScriptProperties();',
      "  return json_({ ok: true, version: VERSION, auto: hasAuto_(), last: JSON.parse(props.getProperty('last') || 'null'), recent: JSON.parse(props.getProperty('recent') || '[]') });",
      '}',
      '',
      'function autoOn_(on) {',
      "  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'run') ScriptApp.deleteTrigger(t); });",
      "  if (on) ScriptApp.newTrigger('run').timeBased().everyMinutes(10).create();",
      '}',
      "function hasAuto_() { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'run'; }); }",
      'function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }',
      ''
    ].join('\n');
  }

  function ago(iso) {
    if (!iso) return 'never';
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
    return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function who(from) { var f = String(from || ''); var m = f.match(/^"?([^"<]+?)"?\s*</); return (m ? m[1] : f).trim(); }
  function list(items, dateKey) {
    var e = X.esc;
    return '<div style="border:1px solid var(--line);border-radius:10px;padding:2px 12px;margin-top:6px">' + items.map(function (x) {
      return '<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-size:14px">' + e(x.subject || '(no subject)') + '</b><div class="muted" style="font-size:12.5px">' + e(who(x.from)) + ' · ' + e(ago(x[dateKey])) + '</div></div>';
    }).join('') + '</div>';
  }

  var STEPS = [
    'On a computer, open <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"><b>script.google.com → New project</b></a> — signed in as the Gmail that gets the school emails.',
    'Delete what’s there, tap <b>📋 Copy the script</b> below and paste it in. Click 💾 <b>Save</b>.',
    'At the top, pick <b>setup</b> next to ▶ Run, then click <b>▶ Run</b>. Google asks for permission → <b>Review permissions</b> → your Gmail → <b>Advanced</b> → <b>Go to … (unsafe)</b> → <b>Allow</b>. (It says “unsafe” only because it’s your own script, not an app from the store.)',
    'Click <b>Deploy → New deployment</b> → ⚙️ <b>Web app</b>. Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b> → <b>Deploy</b>, then copy the <b>Web app URL</b>.',
    'Paste the URL below and tap <b>Connect</b>. Done — it now checks every 10 minutes by itself.'
  ];

  async function open() {
    var s = X.sheet('<div id="ssBody"><h2>📬 School emails</h2><p class="muted">Loading…</p></div>');
    var body = s.querySelector('#ssBody');
    var d;
    try { d = await X.api('ss-get', { refresh: true }); } catch (x) { body.innerHTML = '<h2>📬 School emails</h2><p>' + X.esc(x.message) + '</p>'; return; }
    draw(s, body, d);
  }

  function draw(s, body, d, ran) {
    var e = X.esc;
    var setup = '<ol style="padding-left:20px;margin:8px 0;line-height:1.5;font-size:14px">' + STEPS.map(function (t) { return '<li style="margin-bottom:6px">' + t + '</li>'; }).join('') + '</ol>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn gold" id="ssCopy">📋 Copy the script</button><button class="btn ghost small" id="ssShow">👀 Show it</button></div>' +
      '<textarea id="ssCode" rows="10" readonly class="hidden" style="margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px">' + e(scriptText(d.key, d.tracker)) + '</textarea>' +
      '<p class="muted" style="font-size:12.5px;margin:8px 0 0">Forwards to <b>' + e(d.tracker) + '</b>. It only forwards emails from The Hurst, Four Lanes and Sparx, and adds a “Sent to Tracker” label — nothing is deleted. Free, and doesn’t use your Claude allowance.</p>';
    var h;
    if (!d.connected) {
      h = '<h2>📬 School emails → School Tracker</h2><p class="muted" style="margin:4px 0 6px">Set this up once (about 5 minutes) and new school emails reach School Tracker within 10 minutes — no Gmail filter needed.</p>' + setup +
        '<label for="ssUrl" style="margin-top:12px;display:block">Web app URL</label><input id="ssUrl" placeholder="https://script.google.com/macros/s/…/exec" inputmode="url">' +
        '<div class="row" style="margin-top:10px;justify-content:flex-end;gap:8px"><button class="btn ghost" id="ssX">Close</button><button class="btn primary" id="ssCon">🔗 Connect</button></div>';
    } else {
      var auto = !d.script || d.script.auto !== false, last = d.last || {};
      var status = auto ? '✅ Checking automatically every 10 minutes' : '⏸ Automatic checks paused';
      var res = '';
      if (ran) res = '<div class="card" style="padding:10px 12px;margin:10px 0;background:var(--cream,#FFF8EC)">' + (ran.error ? '⚠️ ' + e(ran.error) : ran.sent && ran.sent.length ? '<b>📨 ' + ran.sent.length + ' new email' + (ran.sent.length === 1 ? '' : 's') + ' sent to School Tracker</b>' + list(ran.sent, 'date') : '👍 <b>All up to date</b> — no new school emails.') + '</div>';
      else if (last.error) res = '<p style="color:#B42318;font-size:13.5px">⚠️ Last check had a problem: ' + e(last.error) + '</p>';
      h = '<h2>📬 School emails</h2><p style="margin:4px 0 2px"><b>' + status + '</b></p><p class="muted" style="margin:0 0 10px;font-size:13px">Last checked ' + e(ago(last.at)) + ' · sending to ' + e(d.tracker) + '</p>' +
        (d.warn ? '<p style="color:#B42318;font-size:13.5px">⚠️ ' + e(d.warn) + '</p>' : '') +
        '<button class="btn primary" id="ssRun" style="width:100%;padding:12px">📬 Update school emails now</button>' + res +
        (d.recent && d.recent.length ? '<div style="margin-top:12px"><b style="font-size:14px">Recently sent to School Tracker</b>' + list(d.recent.slice(0, 8), 'at') + '</div>' : '<p class="muted" style="font-size:13px;margin-top:10px">Nothing forwarded by the script yet.</p>') +
        '<div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">' +
        (auto ? '<button class="btn ghost small" id="ssAuto" data-on="0">⏸ Pause automatic checks</button>' : '<button class="btn gold small" id="ssAuto" data-on="1">▶ Turn automatic checks back on</button>') +
        '<button class="btn ghost small" id="ssSet">🛠 Setup steps & script</button><button class="btn ghost small danger" id="ssOff">Disconnect</button></div>' +
        '<p class="muted" style="font-size:12px;margin:8px 0 0">Set up the Gmail filter later? Tap ⏸ Pause so emails aren’t sent twice.</p>' +
        '<div id="ssSetBox" class="hidden" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">' + setup + '<p class="muted" style="font-size:12.5px">If you paste a new copy of the script, do <b>Deploy → Manage deployments → ✏️ → Version: New version → Deploy</b> so the same link keeps working.</p></div>' +
        '<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn ghost" id="ssX">Close</button></div>';
    }
    body.innerHTML = h;
    var q = function (id) { return body.querySelector(id); };
    q('#ssX').onclick = function () { s.remove(); };
    var copy = q('#ssCopy');
    if (copy) copy.onclick = function () {
      var t = scriptText(d.key, d.tracker);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { X.toast('Script copied — paste it at script.google.com'); }, function () { var ta = q('#ssCode'); ta.classList.remove('hidden'); ta.select(); X.toast('Select all and copy'); });
    };
    var show = q('#ssShow'); if (show) show.onclick = function () { q('#ssCode').classList.toggle('hidden'); };
    var con = q('#ssCon');
    if (con) con.onclick = async function () {
      var url = q('#ssUrl').value.trim(); if (!url) { q('#ssUrl').focus(); return; }
      con.disabled = true; con.textContent = 'Connecting…';
      try { var r = await X.api('ss-connect', { url: url }); X.toast('Connected 🎉'); draw(s, body, r); refreshBadge(r); } catch (x) { X.toast(x.message); con.disabled = false; con.textContent = '🔗 Connect'; }
    };
    var run = q('#ssRun');
    if (run) run.onclick = async function () {
      run.disabled = true; run.textContent = 'Checking Gmail…';
      try { var r = await X.api('ss-run'); draw(s, body, r, r.ran || { sent: [] }); refreshBadge(r); } catch (x) { X.toast(x.message); run.disabled = false; run.textContent = '📬 Update school emails now'; }
    };
    var au = q('#ssAuto');
    if (au) au.onclick = async function () {
      au.disabled = true;
      try { var r = await X.api('ss-auto', { on: au.dataset.on === '1' }); X.toast(au.dataset.on === '1' ? 'Automatic checks on ✅' : 'Automatic checks paused ⏸'); draw(s, body, r); refreshBadge(r); } catch (x) { X.toast(x.message); au.disabled = false; }
    };
    var st = q('#ssSet'); if (st) st.onclick = function () { q('#ssSetBox').classList.toggle('hidden'); };
    var off = q('#ssOff');
    if (off) off.onclick = async function () {
      if (!confirm('Disconnect HQ from your Gmail script? The script itself keeps running in your Google account until you pause it here first or delete it at script.google.com.')) return;
      try { var r = await X.api('ss-disconnect'); draw(s, body, r); refreshBadge(r); } catch (x) { X.toast(x.message); }
    };
  }

  function refreshBadge(d) {
    var b = document.getElementById('ssBtn'); if (!b) return;
    var dot = !d || !d.connected ? '' : (d.script && d.script.auto === false ? ' ⏸' : (d.last && d.last.error ? ' ⚠️' : ''));
    b.textContent = '📬 School emails' + dot;
  }

  window.HQSchoolMail = {
    init: function (x) { X = x; },
    open: open,
    badge: function () { if (!X) return; X.api('ss-get').then(refreshBadge, function () {}); }
  };
})();
