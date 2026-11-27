/*
 * 🎓 Save my progress — the free practice-test sites only (the Auntie Tobi app uses My Plan sign-in instead).
 *   Optional, no password: type your email → 6-digit code (or tap the link in the email) → progress follows you to any device.
 *   Gives the tests the same window.TestSync the app's My Plan gives them (pull / push / signedIn), backed by /.netlify/functions/learn-api.
 *   window.TestSave: box(state) for the front page, bind(el, redraw), open(mode).
 */
(function () {
  'use strict';
  if (!window.TEST_SITE || window.TestSync) return;
  var API = '/.netlify/functions/learn-api', ME = 'tobi_lrn', TEST = function () { return window.TEST_SITE.key === 'drive' ? 'drive' : 'lituk'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function rd() { try { return JSON.parse(localStorage.getItem(ME) || 'null'); } catch (e) { return null; } }
  function wr(v) { try { if (v) localStorage.setItem(ME, JSON.stringify(v)); else localStorage.removeItem(ME); } catch (e) {} }
  function gt(n, p) { try { if (window.gtag) window.gtag('event', n, p || {}); } catch (e) {} }
  function api(action, body) {
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Studio': '1' }, body: JSON.stringify(Object.assign({ action: action }, body || {})) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.message || 'Something went wrong. Please try again.'); e.status = r.status; throw e; } return j; }); });
  }

  // ── window.TestSync for lifeuk.js / drive.js ──
  var TS = { got: null, fn: {}, t: {} };
  function all() {
    if (!rd()) return Promise.resolve(null);
    if (!TS.got) TS.got = api('tests-get').then(function (r) { return r.tests || {}; }).catch(function (e) { TS.got = null; if (e.status === 401) wr(null); return null; });
    return TS.got;
  }
  function send(k, keep) {
    var fn = TS.fn[k]; if (!fn || !rd()) return; clearTimeout(TS.t[k]); TS.t[k] = null;
    if (keep) { try { fetch(API, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Studio': '1' }, body: JSON.stringify({ action: 'tests-save', k: k, doc: fn() }) }); } catch (e) {} return; }
    api('tests-save', { k: k, doc: fn() }).then(function (r) { if (TS.got) TS.got.then(function (a) { if (a) a[k] = r.doc; }); }).catch(function (e) { if (e.status === 401) wr(null); });
  }
  function flush() { Object.keys(TS.t).forEach(function (k) { if (TS.t[k]) send(k, true); }); }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.TestSync = {
    signedIn: function () { return !!rd(); }, email: function () { var m = rd(); return m ? m.email : ''; },
    pull: function (k) { return all().then(function (a) { return a ? a[k] || null : null; }); },
    push: function (k, fn) { TS.fn[k] = fn; if (!rd()) return; clearTimeout(TS.t[k]); TS.t[k] = setTimeout(function () { send(k); }, 1500); },
    signIn: function () { open('save'); }, openPlan: function () { open('manage'); },
  };

  // after signing in: bring both tests together (this device + saved), then show it
  function done(r, how) {
    wr({ email: r.email, tips: !!r.tips }); TS.got = null; gt('progress_saved', { label: TEST() + '|' + how + (r.isNew ? '|new' : '') });
    var ms = [window.LifeUK, window.DriveTest].filter(function (m) { return m && m.sync; });
    return Promise.all(ms.map(function (m) { return m.sync(); })).then(function () {
      try { sessionStorage.setItem('tobi_lrn_msg', r.isNew ? 'Your progress is saved. It’ll follow you to any device.' : 'Welcome back — your progress is here.'); } catch (e) {}
      location.replace(location.pathname);
    });
  }
  // one-tap link from the email (?save=…)
  var q = location.search.match(/[?&]save=([A-Za-z0-9_-]{20,64})/);
  if (q) {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    api('link', { link: q[1] }).then(function (r) { return done(r, 'link'); }).catch(function (e) { toast(e.message); });
  }
  function toast(t) {
    var go = function () { var d = document.createElement('div'); d.className = 'tsv-toast'; d.textContent = t; document.body.appendChild(d); css(); setTimeout(function () { d.remove(); }, 4200); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
  try { var msg = sessionStorage.getItem('tobi_lrn_msg'); if (msg) { sessionStorage.removeItem('tobi_lrn_msg'); toast(msg); } } catch (e) {}

  // ── look ──
  var styled = false;
  function css() {
    if (styled) return; styled = true;
    var s = document.createElement('style');
    s.textContent = '.tsv{margin-top:14px;padding:20px 22px;border:1px solid var(--line,#E4E2DA);border-radius:20px;background:#fff}.tsv h4{margin:0;font-size:18px;color:var(--navy,#0B1F33)}.tsv p{margin:4px 0 0;font-size:15px;color:var(--muted,#5B6B7F);line-height:1.5}' +
      '.tsv-f{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.tsv-f input{flex:1 1 220px;min-width:0;font:inherit;font-size:16px;padding:12px 14px;border:1.5px solid var(--line,#E4E2DA);border-radius:12px;color:#0B1F33;background:#fff}' +
      '.tsv-f input:focus{outline:2px solid var(--green,#0E7C5A);outline-offset:1px;border-color:transparent}.tsv-b{font:inherit;font-weight:700;font-size:16px;border:0;border-radius:12px;padding:12px 20px;background:var(--green,#0E7C5A);color:#fff;cursor:pointer}.tsv-b:disabled{opacity:.5;cursor:default}' +
      '.tsv-b.g{background:#fff;color:#0B1F33;border:1.5px solid var(--line,#E4E2DA)}.tsv-b.r{background:#fff;color:#B42318;border:1.5px solid #F3C7C2}' +
      '.tsv-ck{display:flex;gap:9px;align-items:flex-start;margin-top:10px;font-size:14.5px;color:#4A5A6B;cursor:pointer}.tsv-ck input{width:18px;height:18px;margin:2px 0 0;accent-color:var(--green,#0E7C5A)}' +
      '.tsv-l{background:none;border:0;padding:0;margin-top:10px;font:inherit;font-size:15px;font-weight:700;color:var(--green,#0E7C5A);cursor:pointer}.tsv-l.m{color:var(--muted,#5B6B7F);font-weight:600;margin-left:14px}' +
      '.tsv-line{margin-top:12px;font-size:15px;color:var(--muted,#5B6B7F);display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tsv-line b{color:#0B1F33}.tsv-line .ok{width:20px;height:20px;border-radius:50%;background:var(--green,#0E7C5A);color:#fff;display:inline-grid;place-items:center;font-size:12px;font-weight:800}' +
      '.tsv-line button{background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--green,#0E7C5A);cursor:pointer}' +
      '.tsv-err{color:#B42318;font-size:14.5px;margin-top:8px}.tsv-code{letter-spacing:6px;font-size:22px!important;text-align:center;max-width:220px}' +
      '.tsv-scrim{position:fixed;inset:0;background:rgba(11,31,51,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center}.tsv-sheet{background:#fff;border-radius:22px 22px 0 0;padding:24px 22px 28px;width:100%;max-width:480px;max-height:92vh;overflow:auto;color:#0B1F33}' +
      '@media(min-width:600px){.tsv-scrim{align-items:center}.tsv-sheet{border-radius:22px}}.tsv-sheet h3{margin:0;font-size:21px}.tsv-sheet .tsv-f{flex-direction:column}.tsv-sheet .tsv-f input{flex:none}' +
      '.tsv-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.tsv-row .tsv-b{flex:1 1 160px}' +
      '.tsv-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0B1F33;color:#fff;padding:13px 18px;border-radius:14px;font-size:15px;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:calc(100% - 32px)}';
    document.head.appendChild(s);
  }

  // ── the box on the front page, under the plan ──
  var LATER = 'tobi_lrn_later';
  function later() { try { return +localStorage.getItem(LATER) || 0; } catch (e) { return 0; } }
  function box(S) {
    css(); var me = rd(), worth = S && (S.mocks.length || S.answered >= 20);
    if (me) return '<div class="tsv-line"><span class="ok">✓</span>Progress saved to <b>' + esc(me.email) + '</b><button data-tsv="manage">Manage</button></div>';
    if (!worth || later() > Date.now()) return '<div class="tsv-line">' + (worth ? '<button data-tsv="save">Save your progress</button> to keep it on any device' : 'Practised before on another device? <button data-tsv="get">Get your progress</button>') + '</div>';
    return '<div class="tsv"><h4>Save your progress</h4><p>Keep your plan and scores if you change phone or browser. Just your email — no password.</p>' + form('box') + '</div>';
  }
  function form(where) {
    return '<div class="tsv-f"><input type="email" autocomplete="email" inputmode="email" placeholder="Your email" aria-label="Your email" data-tsv-e><button class="tsv-b" data-tsv="send">Save</button></div>' +
      '<label class="tsv-ck"><input type="checkbox" data-tsv-t> <span>Send me study tips and news (optional)</span></label><div class="tsv-err" data-tsv-x hidden></div>' +
      (where === 'box' ? '<button class="tsv-l" data-tsv="get">I’ve saved before — get my progress</button><button class="tsv-l m" data-tsv="later">Not now</button>' : '');
  }
  function bind(el, redraw) {
    if (!el) return;
    [].forEach.call(el.querySelectorAll('[data-tsv]'), function (b) {
      var a = b.getAttribute('data-tsv');
      b.onclick = function () {
        if (a === 'later') { try { localStorage.setItem(LATER, Date.now() + 7 * 864e5); } catch (e) {} gt('progress_later', { label: TEST() }); if (redraw) redraw(); return; }
        if (a === 'send') return ask(el, false, function (email) { open('code', email); });
        open(a === 'get' ? 'get' : a);
      };
    });
    var inp = el.querySelector('[data-tsv-e]'); if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter') el.querySelector('[data-tsv="send"]').click(); };
  }
  // send the email (code + link)
  function ask(el, again, next) {
    var inp = el.querySelector('[data-tsv-e]'), err = el.querySelector('[data-tsv-x]'), btn = el.querySelector('[data-tsv="send"]'), tk = el.querySelector('[data-tsv-t]');
    var email = inp ? inp.value.trim() : (el._email || '');
    var show = function (t) { if (err) { err.hidden = !t; err.textContent = t || ''; } };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { show('Please type your email address.'); if (inp) inp.focus(); return; }
    show(''); if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    api('start', { email: email, tips: !!(tk && tk.checked), test: TEST(), where: 'site', again: !!again })
      .then(function () { gt('progress_code', { label: TEST() }); if (btn) { btn.disabled = false; btn.textContent = 'Save'; } next(email); })
      .catch(function (e) { show(e.message); if (btn) { btn.disabled = false; btn.textContent = 'Save'; } });
  }

  // ── the sheet: save / get / code / manage ──
  function open(mode, email) {
    css();
    var old = document.querySelector('.tsv-scrim'); if (old) old.remove();
    var s = document.createElement('div'); s.className = 'tsv-scrim'; document.body.appendChild(s);
    s.onclick = function (e) { if (e.target === s) s.remove(); };
    var me = rd();
    if (mode === 'manage' && !me) mode = 'save';
    var html;
    if (mode === 'save' || mode === 'get') {
      html = '<h3>' + (mode === 'get' ? 'Get your progress' : 'Save your progress') + '</h3><p style="color:#5B6B7F;font-size:15px;margin:6px 0 0;line-height:1.5">' +
        (mode === 'get' ? 'Type the email you saved it with. We’ll send you a code.' : 'Keep your plan and scores if you change phone or browser. We’ll email you a code — no password.') + '</p>' + form('sheet') +
        '<div class="tsv-row" style="margin-top:8px"><button class="tsv-b g" data-x>Cancel</button></div>';
    } else if (mode === 'code') {
      html = '<h3>Check your email</h3><p style="color:#5B6B7F;font-size:15px;margin:6px 0 0;line-height:1.5">We sent a 6-digit code to <b style="color:#0B1F33">' + esc(email) + '</b>. Type it here — or tap the button in the email.</p>' +
        '<div class="tsv-f"><input class="tsv-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="6-digit code" data-c><button class="tsv-b" data-ok>Confirm</button></div><div class="tsv-err" data-tsv-x hidden></div>' +
        '<p style="font-size:14px;color:#6B7785;margin-top:12px">Can’t see it? Check your spam or junk folder. <button class="tsv-l" style="margin:0" data-again>Send again</button></p>' +
        '<div class="tsv-row"><button class="tsv-b g" data-back>Use a different email</button></div>';
    } else {
      html = '<h3>Your saved progress</h3><p style="color:#5B6B7F;font-size:15px;margin:6px 0 0;line-height:1.5">Saved to <b style="color:#0B1F33">' + esc(me.email) + '</b>. Practise on any phone or computer — get your progress there with the same email.</p>' +
        '<label class="tsv-ck" style="margin-top:16px"><input type="checkbox" data-tip' + (me.tips ? ' checked' : '') + '> <span>Send me study tips and news</span></label>' +
        '<div class="tsv-row"><button class="tsv-b g" data-out>Sign out on this device</button><button class="tsv-b r" data-del>Delete saved progress</button></div><div class="tsv-err" data-tsv-x hidden></div>' +
        '<div class="tsv-row" style="margin-top:8px"><button class="tsv-b" data-x>Done</button></div>';
    }
    s.innerHTML = '<div class="tsv-sheet" role="dialog" aria-label="Save your progress">' + html + '</div>';
    var sh = s.firstChild, err = function (t) { var x = sh.querySelector('[data-tsv-x]'); if (x) { x.hidden = !t; x.textContent = t || ''; } };
    [].forEach.call(sh.querySelectorAll('[data-x]'), function (b) { b.onclick = function () { s.remove(); }; });
    if (mode === 'save' || mode === 'get') {
      var e = sh.querySelector('[data-tsv-e]'); setTimeout(function () { e.focus(); }, 60);
      sh.querySelector('[data-tsv="send"]').textContent = mode === 'get' ? 'Send code' : 'Save';
      e.onkeydown = function (ev) { if (ev.key === 'Enter') sh.querySelector('[data-tsv="send"]').click(); };
      sh.querySelector('[data-tsv="send"]').onclick = function () { ask(sh, false, function (em) { open('code', em); }); };
    } else if (mode === 'code') {
      var c = sh.querySelector('[data-c]'), ok = sh.querySelector('[data-ok]'); setTimeout(function () { c.focus(); }, 60);
      var go = function () {
        var v = c.value.replace(/\D/g, ''); if (v.length !== 6) return err('Please type the 6-digit code.');
        err(''); ok.disabled = true; ok.textContent = 'Checking…';
        api('verify', { email: email, code: v }).then(function (r) { ok.textContent = 'Saved ✓'; return done(r, 'code'); }).catch(function (x) { err(x.message); ok.disabled = false; ok.textContent = 'Confirm'; });
      };
      ok.onclick = go; c.oninput = function () { if (c.value.replace(/\D/g, '').length === 6) go(); };
      sh.querySelector('[data-back]').onclick = function () { open('save'); };
      sh.querySelector('[data-again]').onclick = function () { sh._email = email; api('start', { email: email, test: TEST(), where: 'site', again: true }).then(function () { err(''); toast('Sent again — check your inbox.'); }).catch(function (x) { err(x.message); }); };
    } else {
      sh.querySelector('[data-tip]').onchange = function () { var on = this.checked; api('tips', { on: on }).then(function () { var m = rd(); if (m) { m.tips = on; wr(m); } toast(on ? 'You’ll get study tips by email.' : 'No more study tips.'); }).catch(function (x) { err(x.message); }); };
      sh.querySelector('[data-out]').onclick = function () { flush(); api('signout').catch(function () {}).then(function () { wr(null); s.remove(); toast('Signed out on this device. Your progress stays saved.'); if (window.TestSave.redraw) window.TestSave.redraw(); }); };
      var d = sh.querySelector('[data-del]');
      d.onclick = function () {
        if (!d.dataset.sure) { d.dataset.sure = 1; d.textContent = 'Tap again to delete'; return; }
        d.disabled = true; api('delete').then(function () { wr(null); s.remove(); gt('progress_deleted', { label: TEST() }); toast('Deleted. Your progress is only on this device now.'); if (window.TestSave.redraw) window.TestSave.redraw(); }).catch(function (x) { err(x.message); d.disabled = false; });
      };
    }
  }

  // a "Save my progress" link in the menu
  function menu() {
    var nav = document.getElementById('tsNav'); if (!nav || nav.querySelector('[data-tsv-menu]')) return;
    var a = document.createElement('a'); a.href = '#'; a.setAttribute('data-tsv-menu', ''); a.textContent = rd() ? 'My saved progress' : 'Save my progress';
    a.onclick = function (e) { e.preventDefault(); nav.classList.remove('open'); open(rd() ? 'manage' : 'save'); };
    var cta = nav.querySelector('.ts-cta'); nav.insertBefore(a, cta || null);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', menu); else menu();

  window.TestSave = { box: box, bind: bind, open: open, redraw: null };
})();
