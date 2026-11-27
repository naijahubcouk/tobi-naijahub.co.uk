/*
 * 💚 The Auntie Tobi app: the first time someone opens a test, show the test website's front page
 *   (lifeinuktest / ukdrivingtheorytest) inside the app. It's the real page in a frame (/test-sites/…?inapp=1),
 *   with its header and footer hidden; its buttons come back here and open the practice in the app.
 *   window.TestWelcome.need(key) · .show(rootEl, { site, m, back, home, plan })
 */
(function () {
  'use strict';
  var cur = null;
  function raw(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function gt(e, p) { try { if (typeof gtag === 'function') gtag('event', e, p || {}); } catch (x) {} }
  // first time = never shown it, and hasn't practised yet
  function need(key) {
    if (raw(key + '_welcomed')) return false;
    var d = raw(key) || {}, p = raw(key + '_plan') || {};
    return !(d.n || (d.mocks || []).length || p.prefs || raw(key + '_live') || raw(key + '_prac'));
  }
  window.addEventListener('message', function (e) {
    var m = e.data; if (!cur || e.origin !== location.origin || !m || !m.tsApp || !cur.frame.isConnected) return;
    if (e.source !== cur.frame.contentWindow) return;
    if (m.h) { cur.frame.style.height = Math.max(400, Math.min(m.h, 20000)) + 'px'; return; }
    var o = cur.o, t = o.m; cur = null;
    if (m.plan) { gt('test_welcome_go', { label: o.site + '|plan' }); return o.plan(); }
    if (m.go == null) return;
    gt('test_welcome_go', { label: o.site + '|' + (m.go || 'home') });
    var r = m.go;
    if (r === 'mock') t.mock();
    else if (r === 'before') t.open('before');
    else if (r === 'results') t.results();
    else if (r === 'resume') t.resume();
    else if (r === 'today') t.today();
    else if (r === 'signs' && t.signs) t.signs();
    else if (r === 'videos') { o.home(); var n = 0, iv = setInterval(function () { var b = document.getElementById('vqGo'); if (b) { clearInterval(iv); b.click(); } else if (++n > 40) clearInterval(iv); }, 150); }
    else o.home();
  });
  function show(r, o) {
    try { localStorage.setItem(o.key + '_welcomed', JSON.stringify(Date.now())); } catch (e) {}
    r.innerHTML = '<button class="lu-back" id="twBack">← Home</button>' +
      '<div style="border-radius:18px;overflow:hidden;border:1px solid #ECE8DE;background:#F7F6F2;margin-top:4px">' +
      '<iframe title="About this test" src="/test-sites/' + o.site + '?inapp=1" style="display:block;width:100%;height:900px;border:0" loading="eager"></iframe></div>' +
      '<button class="lu-btn" id="twGo" style="width:100%;margin-top:12px">Go to practice →</button>';
    cur = { frame: r.querySelector('iframe'), o: o };
    r.querySelector('#twBack').onclick = function () { cur = null; o.back(); };
    r.querySelector('#twGo').onclick = function () { cur = null; o.home(); };
    gt('test_welcome', { label: o.site });
  }
  window.TestWelcome = { need: need, show: show };
})();
