/*
 * Auntie Tobi HQ — 🧰 More tools folder for the sidebar.
 * ✏️ Tidy menu → tap a tool to tuck it into "More tools" (or tap it again to bring it back) → ✅ Done.
 * Each person's choice is saved to their HQ account (boot gives `tucked`, 'nav-save' stores it), so it follows them
 * across devices. Counts on tucked tools show on the folder, and the folder opens itself when you're on one of its tools.
 *
 * HQ calls HQTidy.init({ api, toast }) once, HQTidy.apply(tucked) after boot, and HQTidy.sync(view) on every page change.
 */
(function () {
  'use strict';
  var X = null, nav = null, box = null, fbtn = null, tbtn = null, bar = null, ORDER = [], TUCK = [], tidy = false, saveT = null, OPEN_KEY = 'hqToolsOpen';
  var FIXED = { today: 1, bin: 1 };
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function movable(el) { return el && el.dataset && el.dataset.nav && !FIXED[el.dataset.nav]; }
  function isOpen() { try { return localStorage.getItem(OPEN_KEY) === '1'; } catch (e) { return false; } }
  function setOpen(v) { try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch (e) {} box.classList.toggle('hidden', !v); fbtn.querySelector('.tar').textContent = v ? '▾' : '▸'; }

  function build() {
    nav = document.querySelector('.side-nav'); if (!nav || box) return;
    var bin = nav.querySelector('[data-nav="bin"]');
    var st = document.createElement('style');
    st.textContent = '.side-nav .tidy-row{display:flex;justify-content:flex-end;padding:0 4px 2px}' +
      '.side-nav .tidy-row button{padding:4px 8px;font-size:12px;font-weight:600;color:#AEB8C8;border-radius:6px}.side-nav .tidy-row button:hover{color:#fff;background:var(--navy-3)}' +
      '.side-nav .side-folder{margin-top:8px;border-top:1px solid var(--navy-3);border-radius:0 0 8px 8px;padding-top:12px}.side-nav .side-folder .tar{margin-left:6px;font-size:11px;opacity:.7}' +
      '.side-nav .side-box{display:flex;flex-direction:column;gap:2px;margin:0 0 6px 10px;padding-left:6px;border-left:2px solid var(--navy-3)}' +
      '.side-nav .tidy-bar{background:var(--gold);color:var(--navy);border-radius:10px;padding:8px 10px;font-size:12.5px;font-weight:600;line-height:1.35;margin:0 0 6px}.side-nav .tidy-bar button{display:block;width:100%;margin-top:6px;background:var(--navy);color:#fff;text-align:center;justify-content:center;padding:7px}' +
      '.side-nav.tidy [data-nav]{outline:1px dashed rgba(255,255,255,.18);outline-offset:-2px}.side-nav .tmv{margin-left:auto;font-size:14px;padding-left:6px}.side-nav.tidy [data-nav] .n{display:none}' +
      '.side-nav.tidy .side-box [data-nav]{opacity:.85}';
    document.head.appendChild(st);
    // everything between Today and the Bin can move; remember the original order so tools go back where they were
    var kids = [].slice.call(nav.children), stop = kids.indexOf(bin);
    ORDER = kids.slice(0, stop < 0 ? kids.length : stop).filter(function (el) { return movable(el) || el.classList.contains('side-sec'); });
    var row = document.createElement('div'); row.className = 'tidy-row'; row.innerHTML = '<button type="button" id="tidyBtn" title="Move tools you don’t use often into More tools">✏️ Tidy menu</button>';
    nav.insertBefore(row, nav.firstChild); tbtn = row.firstChild;
    bar = document.createElement('div'); bar.className = 'tidy-bar hidden'; bar.innerHTML = 'Tap a tool to move it into 🧰 More tools. Tap it again to bring it back.<button type="button" id="tidyDone">✅ Done</button>';
    nav.insertBefore(bar, row.nextSibling);
    fbtn = document.createElement('button'); fbtn.type = 'button'; fbtn.className = 'side-folder'; fbtn.id = 'toolsBtn'; fbtn.innerHTML = '🧰 More tools<span class="tar">▸</span><span class="n" id="nTools"></span>';
    box = document.createElement('div'); box.className = 'side-box hidden'; box.id = 'toolsBox';
    nav.insertBefore(fbtn, bin); nav.insertBefore(box, bin);
    fbtn.onclick = function () { setOpen(box.classList.contains('hidden')); };
    tbtn.onclick = function () { mode(!tidy); };
    bar.querySelector('#tidyDone').onclick = function () { mode(false); };
    // in tidy mode a tap moves the tool instead of opening it (capture runs before the tool's own click)
    nav.addEventListener('click', function (e) {
      if (!tidy) return; var b = e.target.closest('[data-nav]'); if (!b || !nav.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      if (!movable(b)) { X.toast('🏠 Today and 🗑 Bin always stay in the menu.'); return; }
      var id = b.dataset.nav, i = TUCK.indexOf(id); if (i >= 0) TUCK.splice(i, 1); else TUCK.push(id);
      place(); save();
    }, true);
    new MutationObserver(badge).observe(box, { subtree: true, childList: true, characterData: true });
  }
  function mode(on) {
    tidy = on; nav.classList.toggle('tidy', on); bar.classList.toggle('hidden', !on); tbtn.parentNode.classList.toggle('hidden', on);
    if (on) setOpen(true);
    place();
    if (!on && !visibleIn(box)) setOpen(false);
  }
  function visibleIn(root) { return $$('[data-nav]', root).some(function (b) { return !b.classList.contains('hidden'); }); }
  function place() {
    ORDER.forEach(function (el) {
      var t = movable(el) && TUCK.indexOf(el.dataset.nav) >= 0;
      if (t) box.appendChild(el); else nav.insertBefore(el, fbtn);
      if (movable(el)) {
        var m = el.querySelector('.tmv');
        if (tidy) { if (!m) { m = document.createElement('span'); m.className = 'tmv'; el.appendChild(m); } m.textContent = t ? '↩️' : '📥'; m.title = t ? 'Bring back to the menu' : 'Move into More tools'; }
        else if (m) m.remove();
      }
    });
    // a heading only shows while at least one of its tools is still in the main menu
    $$('.side-sec', nav).forEach(function (h) {
      if (h.dataset.noAccess === undefined) h.dataset.noAccess = h.classList.contains('hidden') ? '1' : '';
      var any = false, n = h.nextElementSibling;
      while (n && n !== fbtn && !n.classList.contains('side-sec')) { if (n.dataset.nav && !n.classList.contains('hidden')) any = true; n = n.nextElementSibling; }
      h.classList.toggle('hidden', h.dataset.noAccess === '1' || !any);
    });
    var has = visibleIn(box);
    fbtn.classList.toggle('hidden', !has && !tidy);
    if (!has && !tidy) box.classList.add('hidden'); else if (has || tidy) box.classList.toggle('hidden', !(isOpen() || tidy));
    fbtn.querySelector('.tar').textContent = box.classList.contains('hidden') ? '▸' : '▾';
    badge();
  }
  // add up the numbers waiting inside the folder so nothing gets missed
  function badge() {
    if (!fbtn) return; var sum = 0, gold = false;
    $$('[data-nav]', box).forEach(function (b) { if (b.classList.contains('hidden')) return; $$('.n', b).forEach(function (n) { var v = n.textContent.trim(); if (/^\d+$/.test(v) && +v > 0) { sum += +v; if (n.classList.contains('gold')) gold = true; } }); });
    var el = fbtn.querySelector('#nTools'); el.textContent = sum ? String(sum) : ''; el.classList.toggle('gold', gold);
  }
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { X.api('nav-save', { tucked: TUCK }).catch(function () { X.toast('Couldn’t save your menu — check your connection.'); }); }, 400); }

  function init(x) { X = x; }
  function apply(tucked) { build(); if (!nav) return; $$('.side-sec', nav).forEach(function (h) { delete h.dataset.noAccess; }); TUCK = (tucked || []).filter(function (id) { return !FIXED[id]; }); place(); }
  function sync(view) { if (!box) return; var b = box.querySelector('[data-nav="' + view + '"]'); if (b && box.classList.contains('hidden')) setOpen(true); badge(); }
  window.HQTidy = { init: init, apply: apply, sync: sync };
})();
