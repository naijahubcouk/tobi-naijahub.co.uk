/*
 * 🖥️ Auntie Tobi on a computer.
 *  - Phone-sized pages (the app, Add your business, Add your event, Celebration cards) get two side panels on wide
 *    screens: "Best on your phone" with a QR code for this page, and quick links.
 *  - The app also gets "View in laptop format": a wide layout with a top menu, a Home page and a Businesses grid.
 *    Other screens (News, Events, Jobs, chat answers…) open in the app stretched to the full width.
 *    Computers open in laptop view; 📱 Phone view switches back and is remembered on that computer. Phones never see any of this.
 */
(function () {
  'use strict';
  var WIDE = 1100, LAPW = 980, KEY = 'tobi_view';   // side panels need 1100px; laptop view works from 980px
  var isApp = !!(document.querySelector('.app') && document.getElementById('messages'));
  var wide = function () { return window.innerWidth >= WIDE; };
  var get = function () { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  var put = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cap = function (s) { return String(s || '').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); };

  var CSS = '' +
    '.dsk{position:fixed;top:50%;transform:translateY(-50%);width:270px;z-index:50;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0F1E36;display:none}' +
    '.dsk .c{background:#fff;border-radius:18px;padding:22px 20px;box-shadow:0 10px 30px rgba(0,0,0,.2)}' +
    '.dsk h3{font-size:18px;margin:0 0 6px;line-height:1.3}.dsk p{font-size:14px;color:#4B5563;margin:0 0 12px;line-height:1.5}' +
    '.dsk .qr{background:#fff;border:2px solid #E3F2EA;border-radius:14px;padding:10px;display:flex;justify-content:center}.dsk .qr img{width:170px;height:170px;image-rendering:pixelated}' +
    '.dsk .lk{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;border:1.5px solid #ececec;text-decoration:none;color:#0F1E36;font-weight:700;font-size:14.5px;margin-top:8px;background:#fff;width:100%;cursor:pointer;font-family:inherit;text-align:left}' +
    '.dsk .lk:hover{border-color:#057A44;background:#F6FBF8}.dsk .lk span{font-size:20px}.dsk .tag{display:inline-block;background:#FFF4D6;color:#7A5300;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;margin-bottom:10px}' +
    '.dsk .lap{display:block;width:100%;margin-top:14px;background:#0F1E36;color:#fff;border:0;border-radius:12px;padding:12px;font-weight:800;font-size:14.5px;cursor:pointer;font-family:inherit}.dsk .lap:hover{background:#057A44}' +
    // laptop format
    'body.lapv{display:block!important;padding:0!important;background:#F4F1EA!important}' +
    'body.lapv .app{max-width:none!important;width:100%!important;height:calc(100vh - 74px)!important;max-height:none!important;border-radius:0!important;margin-top:74px!important;box-shadow:none!important}' +
    'body.lapv .app>.header,body.lapv .app>.pills{display:none!important}' +
    'body.lapv .app .messages{padding-left:max(24px,calc((100% - 900px)/2))!important;padding-right:max(24px,calc((100% - 900px)/2))!important}' +
    'body.lapv .app .input-area{padding-left:max(24px,calc((100% - 900px)/2))!important;padding-right:max(24px,calc((100% - 900px)/2))!important}' +
    '#lapTop{position:fixed;top:0;left:0;right:0;height:74px;background:#057A44;color:#fff;z-index:60;font-family:"Plus Jakarta Sans",-apple-system,sans-serif}' +
    '#lapTop .in{max-width:1240px;margin:0 auto;height:100%;display:flex;align-items:center;gap:14px;padding:0 24px}' +
    '#lapTop img{width:46px;height:46px;border-radius:50%;border:2px solid #FFB81C;cursor:pointer}#lapTop .br{cursor:pointer}#lapTop .br b{font:700 21px Georgia,serif;display:block}#lapTop .br span{font-size:12.5px;opacity:.85}' +
    '#lapTop nav{display:flex;gap:4px;margin-left:22px;flex:1}#lapTop nav button{background:none;border:0;color:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:20px;cursor:pointer;font-family:inherit}' +
    '#lapTop nav button:hover{background:rgba(255,255,255,.14)}#lapTop nav button.on{background:#fff;color:#057A44}' +
    '#lapTop .pv{background:#FFB81C;color:#0F1E36;border:0;border-radius:20px;padding:9px 16px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit}' +
    '#lapPage{position:fixed;top:74px;left:0;right:0;bottom:0;overflow-y:auto;background:#F4F1EA;z-index:40;font-family:"Plus Jakarta Sans",-apple-system,sans-serif;color:#0F1E36}' +
    '#lapPage .wrap{max-width:1240px;margin:0 auto;padding:26px 24px 60px;display:grid;gap:22px}' +
    '#lapPage .card{background:#fff;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)}' +
    '#lapPage h1{font:700 30px Georgia,serif;margin:0}#lapPage h2{font-size:18px;margin:0 0 12px}#lapPage .sub{color:#6B7280;font-size:15px}' +
    '#lapPage .chips{display:flex;gap:8px;flex-wrap:wrap}#lapPage .chip{border:1.5px solid #e2e2e2;background:#fff;border-radius:20px;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;color:#0F1E36}' +
    '#lapPage .chip:hover{border-color:#057A44}#lapPage .chip.on{background:#057A44;color:#fff;border-color:#057A44}' +
    '#lapPage .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}' +
    '#lapPage .bz{overflow:hidden;display:flex;flex-direction:column}#lapPage .bz .im{height:150px;background:#E3F2EA center/cover no-repeat;display:flex;align-items:center;justify-content:center;font:700 40px Georgia,serif;color:#057A44;position:relative;cursor:pointer}' +
    '#lapPage .bz .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}#lapPage .bz .ft{z-index:1;position:absolute;top:10px;left:10px;background:#FFB81C;font:800 11.5px "Plus Jakarta Sans",sans-serif;padding:3px 10px;border-radius:20px;color:#0F1E36}' +
    '#lapPage .bz .bd{padding:14px 16px;flex:1;display:flex;flex-direction:column;gap:4px}#lapPage .bz b{font-size:16.5px}#lapPage .bz .m{font-size:13px;color:#6B7280}' +
    '#lapPage .bz p{font-size:14px;color:#374151;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:4px 0 10px}' +
    '#lapPage .bz .bt{display:flex;gap:8px;margin-top:auto}#lapPage .bz .bt a,#lapPage .bz .bt button{flex:1;text-align:center;border-radius:10px;padding:9px;font-size:13.5px;font-weight:700;border:0;cursor:pointer;text-decoration:none;font-family:inherit}' +
    '#lapPage .v{background:#057A44;color:#fff}#lapPage .w{background:#25D366;color:#fff}' +
    '#lapPage .search{display:flex;gap:10px}#lapPage .search input{flex:1;border:1.5px solid #e2e2e2;background:#fff;border-radius:12px;padding:13px 16px;font-size:15px;font-family:inherit}' +
    '#lapPage .search input:focus{outline:2px solid #057A44;border-color:#057A44}' +
    '#lapPage .cols{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start}' +
    '#lapPage .bub{display:flex;gap:12px}#lapPage .bub img{width:44px;height:44px;border-radius:50%}#lapPage .bub div{background:#fff;border-radius:4px 18px 18px 18px;padding:16px 20px;font-size:16px;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,.06)}' +
    '#lapPage .ask{display:flex;gap:10px;margin-top:14px}#lapPage .ask input{flex:1;background:#fff;border:1.5px solid #e2e2e2;border-radius:14px;padding:15px 18px;font-size:15.5px;font-family:inherit}' +
    '#lapPage .ask input:focus{outline:2px solid #057A44;border-color:#057A44}#lapPage .ask button{background:#057A44;color:#fff;border:0;border-radius:14px;padding:0 24px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}' +
    '#lapPage .rail{display:grid;gap:16px}#lapPage .rail .card{padding:18px}#lapPage .mini{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #f0f0f0;cursor:pointer}' +
    '#lapPage .mini i{width:42px;height:42px;border-radius:10px;background:#E3F2EA;flex:none;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px}' +
    '#lapPage .mini b{font-size:14px;display:block;line-height:1.35}#lapPage .mini span{font-size:12.5px;color:#6B7280}#lapPage .mini:hover b{color:#057A44}' +
    '#lapPage .cta{background:#0F1E36;color:#fff;padding:20px}#lapPage .cta b{color:#FFB81C}#lapPage .cta a{display:block;background:#FFB81C;color:#0F1E36;text-align:center;border-radius:10px;padding:11px;font-weight:800;margin-top:12px;text-decoration:none}' +
    '#lapPage .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}#lapPage .tile{background:#fff;border-radius:14px;padding:16px;font-weight:700;font-size:15px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:0;text-align:left;cursor:pointer;font-family:inherit;color:#0F1E36}' +
    '#lapPage .tile:hover{box-shadow:0 0 0 2px #057A44}#lapPage .tile span{display:block;font-size:26px;margin-bottom:6px}' +
    '#lapPage .more{display:block;margin:6px auto 0;background:#fff;border:1.5px solid #057A44;color:#057A44;border-radius:12px;padding:12px 26px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit}' +
    '#lapPage .empty{padding:30px;text-align:center;color:#6B7280}' +
    '@media (max-width:1240px){#lapPage .cols{grid-template-columns:1fr 290px}#lapPage .tiles{grid-template-columns:repeat(2,1fr)}}@media (max-width:1180px){#lapPage .cols .grid{grid-template-columns:repeat(2,1fr)}#lapTop nav button{padding:8px 9px;font-size:13px}#lapTop .br span{display:none}}';

  function addCss() { if (document.getElementById('dskCss')) return; var st = document.createElement('style'); st.id = 'dskCss'; st.textContent = CSS; document.head.appendChild(st); }
  var qrLoad = null;
  function qr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!qrLoad) qrLoad = new Promise(function (ok) { var s = document.createElement('script'); s.src = '/studio-qr.js'; s.onload = function () { ok(window.qrcode); }; s.onerror = function () { ok(null); }; document.head.appendChild(s); });
    return qrLoad;
  }

  // ───── side panels (phone-sized pages on a wide screen) ─────
  var L, R;
  function column() { var c = document.querySelector('.app') || document.querySelector('.wrap'); var w = c ? c.getBoundingClientRect().width : 560; return Math.min(w || 560, 640); }
  function panels() {
    addCss();
    if (!L) {
      L = document.createElement('div'); L.className = 'dsk'; L.id = 'dskL';
      L.innerHTML = '<div class="c"><div class="tag">📱 Best on your phone</div><h3>Open Auntie Tobi on your phone</h3><p>Scan with your phone camera — this page opens there, ready to use.</p><div class="qr"><img alt="QR code for this page" id="dskQr"></div>' +
        '<p style="margin:12px 0 0;font-size:13px">Then tap <b>Share → Add to Home Screen</b> to keep Auntie Tobi like an app. 💚</p>' +
        (isApp ? '<button class="lap" id="dskLap">🖥️ View in laptop format</button>' : '') + '</div>';
      R = document.createElement('div'); R.className = 'dsk'; R.id = 'dskR';
      R.innerHTML = '<div class="c"><h3>Quick links</h3><p>Popular on Auntie Tobi</p>' +
        '<a class="lk" href="/add-business"><span>➕</span>Add your business</a><a class="lk" href="/add-event"><span>🎉</span>Add your event</a>' +
        '<a class="lk" href="/business-studio"><span>🚀</span>Business Studio</a><a class="lk" href="/cards"><span>💌</span>Celebration cards</a>' +
        '<a class="lk" href="https://wa.me/447594674940" target="_blank" rel="noopener"><span>💬</span>WhatsApp Auntie Tobi</a></div>';
      document.body.appendChild(L); document.body.appendChild(R);
      var b = document.getElementById('dskLap'); if (b) b.onclick = function () { put('laptop'); apply(); };
    }
    var off = Math.max(24, (window.innerWidth - column()) / 2 - 270 - 40);
    L.style.left = off + 'px'; R.style.right = off + 'px';
    var show = wide() && !lapOn();
    L.style.display = R.style.display = show ? 'block' : 'none';
    if (show) qr().then(function (q) { var im = document.getElementById('dskQr'); if (!q || !im) return; var u = location.href; if (im.dataset.u === u) return; var c = q(0, 'M'); c.addData(u); c.make(); im.src = c.createDataURL(5, 0); im.dataset.u = u; });
  }

  // ───── laptop format (the app only) ─────
  var top, page, cur = '';
  function lapOn() { return isApp && window.innerWidth >= LAPW && get() !== 'phone'; }   // computers open in laptop view unless they chose phone view
  function dir() { try { return (typeof getLiveDirectory === 'function' ? getLiveDirectory() : []).filter(function (b) { return b && b.slug && b.name; }); } catch (e) { return []; } }
  function card(b) {
    return '<div class="card bz"><div class="im" data-biz="' + esc(b.slug) + '">' + esc((b.name || '?').charAt(0).toUpperCase()) + (b.img ? '<img src="' + esc(b.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + (b.featured ? '<span class="ft">⭐ Featured</span>' : '') + '</div>' +
      '<div class="bd"><b>' + esc(b.name) + '</b><div class="m">' + esc(cap(b.cat)) + (b.loc ? ' · 📍 ' + esc(b.loc) : '') + '</div><p>' + esc(b.desc || '') + '</p>' +
      '<div class="bt"><button class="v" data-biz="' + esc(b.slug) + '">View details</button>' + (b.wa ? '<a class="w" href="https://wa.me/' + esc(b.wa) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') + '</div></div></div>';
  }
  // Hand over to the app (stretched) for everything that isn't a laptop page yet
  function inApp(fn) { cur = 'app'; if (page) page.style.display = 'none'; nav(); try { fn && fn(); } catch (e) { console.error(e); } }
  function bindCards(root) { root.querySelectorAll('[data-biz]').forEach(function (el) { el.onclick = function () { var s = el.getAttribute('data-biz'); inApp(function () { tobiOpenBiz(s); }); }; }); }
  var NAV = [['home', '🏠 Home'], ['biz', '🏢 Businesses'], ['mkt', '🛍️ Marketplace'], ['news', '📰 News & Updates'], ['events', '🎉 Events'], ['jobs', '💼 Jobs']];
  function nav() { if (!top) return; top.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.n === cur || (cur === 'app' && b.dataset.n === top._last)); }); }
  function go(n) {
    top._last = n;
    if (n === 'home') return showHome();
    if (n === 'biz') return showBiz();
    if (n === 'mkt') { window.location.href = '/marketplace'; return; }
    if (n === 'news') return inApp(function () { showNewsAndUpdates(); });
    if (n === 'events') return inApp(function () { showEventsCard(); });
    if (n === 'jobs') return inApp(function () { showJobsHubCard(); });
  }
  function shell() {
    addCss();
    if (!top) {
      top = document.createElement('div'); top.id = 'lapTop';
      top.innerHTML = '<div class="in"><img src="/tobi-face-128.png" alt="Auntie Tobi" data-n="home"><div class="br" data-n="home"><b>Auntie Tobi</b><span>Your Trusted UK Guide for Nigerians</span></div>' +
        '<nav>' + NAV.map(function (x) { return '<button data-n="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</nav><button class="pv" id="lapPv">📱 Phone view</button></div>';
      page = document.createElement('div'); page.id = 'lapPage';
      document.body.appendChild(top); document.body.appendChild(page);
      top.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { go(b.dataset.n); }; });
      document.getElementById('lapPv').onclick = function () { put('phone'); apply(); };
    }
  }
  function showHome() {
    cur = 'home'; page.style.display = 'block'; page.scrollTop = 0; nav();
    var all = dir(), feat = all.filter(function (b) { return b.featured; }).slice(0, 6);
    if (feat.length < 3) feat = feat.concat(all.filter(function (b) { return !b.featured && b.img; }).slice(0, 3 - feat.length));
    var h = new Date().getHours(), hi = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var TILES = [['💼', 'Find jobs', function () { showJobsHubCard(); }], ['🎉', 'Events', function () { showEventsCard(); }], ['📰', 'News & articles', function () { showAllNews(); }], ['🏢', 'All businesses', 'biz'],
      ['🛍️', 'Marketplace', 'mkt'], ['🏠', 'Renting a house', 'How do I rent a house in the UK?'], ['🚗', 'UK driving licence', 'How do I get my UK driving licence?'], ['➕', 'Add your business', '/add-business']];
    page.innerHTML = '<div class="wrap"><div class="cols"><div>' +
      '<div class="bub"><img src="/tobi-face-128.png" alt=""><div><b>' + hi + '! 👋🏾 I’m Auntie Tobi.</b><br>Ask me anything about life in the UK — jobs, housing, visas, the NHS, schools — or find Nigerian businesses and events near you. So… wetin you need today? 😄</div></div>' +
      '<form class="ask" id="lapAsk"><input id="lapQ" placeholder="Ask Auntie Tobi anything… 😄" autocomplete="off"><button>Send</button></form>' +
      '<h2 style="margin-top:26px">Popular right now</h2><div class="tiles">' + TILES.map(function (t, i) { return '<button class="tile" data-t="' + i + '"><span>' + t[0] + '</span>' + t[1] + '</button>'; }).join('') + '</div>' +
      (feat.length ? '<h2 style="margin-top:26px">Featured businesses</h2><div class="grid">' + feat.slice(0, 6).map(card).join('') + '</div>' : '') + '</div>' +
      '<div class="rail"><div class="card"><h2>🎉 Upcoming events</h2><div id="lapEv"></div></div><div class="card"><h2>📰 Latest news</h2><div id="lapNw"></div></div>' +
      '<div class="card cta"><b>🏪 Own a Nigerian business?</b><div style="font-size:14px;margin-top:6px;opacity:.9">List it free and get your own Business Studio.</div><a href="/add-business">➕ Add your business</a></div></div></div></div>';
    document.getElementById('lapAsk').onsubmit = function (e) { e.preventDefault(); var q = document.getElementById('lapQ').value.trim(); if (q) inApp(function () { quickAsk(q); }); };
    page.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { var a = TILES[+b.dataset.t][2]; if (typeof a === 'function') return inApp(a); if (a === 'biz' || a === 'mkt') return go(a); if (a.charAt(0) === '/') { location.href = a; return; } inApp(function () { quickAsk(a); }); }; });
    bindCards(page);
    rail();
  }
  function rail() {
    var ev = [], nw = [], today = new Date(); today.setHours(0, 0, 0, 0);
    try { ev = (typeof ALL_EVENTS !== 'undefined' ? ALL_EVENTS : []).filter(function (e) { return e.dateObj && e.dateObj >= today; }).sort(function (a, b) { return a.dateObj - b.dateObj; }).slice(0, 3); } catch (e) {}
    try {
      var seen = {}; [].concat(window._hqArticles || [], (typeof getLiveBlogPosts === 'function' && getLiveBlogPosts()) || [], typeof TOBI_BUILTIN_NEWS !== 'undefined' ? TOBI_BUILTIN_NEWS : [])
        .forEach(function (n) { if (n && n.title && !seen[n.title] && !n.isEvent && nw.length < 4) { seen[n.title] = 1; nw.push(n); } });
    } catch (e) {}
    var E = document.getElementById('lapEv'), N = document.getElementById('lapNw'); if (!E) return;
    E.innerHTML = ev.length ? ev.map(function (e, i) { return '<div class="mini" data-ev="' + i + '"><i>' + esc(e.emoji || '🎉') + '</i><div><b>' + esc(e.title) + '</b><span>' + esc(e.time || e.date || '') + (e.loc ? ' · ' + esc(e.loc) : '') + '</span></div></div>'; }).join('') : '<div class="sub" style="font-size:14px">New events are added every week.</div>';
    E.innerHTML += '<div class="mini" data-evall><i>➡️</i><div><b>See all events</b></div></div>';
    N.innerHTML = nw.map(function (n, i) { return '<div class="mini" data-nw="' + i + '"><i>' + esc(n.emoji || '📰') + '</i><div><b>' + esc(n.title) + '</b><span>' + esc(n.label || 'Auntie Tobi explains') + '</span></div></div>'; }).join('') + '<div class="mini" data-nwall><i>➡️</i><div><b>All news &amp; articles</b></div></div>';
    E.querySelectorAll('[data-ev],[data-evall]').forEach(function (el) { el.onclick = function () { top._last = 'events'; inApp(function () { showEventsCard(); }); }; });
    N.querySelectorAll('[data-nw]').forEach(function (el) { el.onclick = function () { var n = nw[+el.dataset.nw]; inApp(function () { openBlogSheet(n.appUrl || n.url, n.title, n.summary); }); }; });
    N.querySelector('[data-nwall]').onclick = function () { top._last = 'news'; inApp(function () { showAllNews(); }); };
  }
  var BZ = { q: '', cat: '', n: 24 };
  function showBiz() {
    cur = 'biz'; page.style.display = 'block'; page.scrollTop = 0; nav();
    var all = dir(), counts = {};
    all.forEach(function (b) { if (b.cat && b.cat !== 'nigerian business') counts[b.cat] = (counts[b.cat] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    page.innerHTML = '<div class="wrap"><div><h1>Nigerian businesses in the UK</h1><div class="sub" id="lapCount"></div></div>' +
      '<div class="search"><input id="lapS" placeholder="🔍 Search a business, category or town…" value="' + esc(BZ.q) + '" autocomplete="off"><a class="chip" href="/add-business" style="padding:13px 18px;text-decoration:none;background:#FFF4D6;border-color:#FFB81C">➕ Add your business</a></div>' +
      '<div class="chips"><button class="chip' + (BZ.cat ? '' : ' on') + '" data-c="">All</button>' + cats.slice(0, 12).map(function (c) { return '<button class="chip' + (BZ.cat === c ? ' on' : '') + '" data-c="' + esc(c) + '">' + esc(cap(c)) + '</button>'; }).join('') +
      (cats.length > 12 ? '<select class="chip" id="lapMore"><option value="">More…</option>' + cats.slice(12).map(function (c) { return '<option' + (BZ.cat === c ? ' selected' : '') + ' value="' + esc(c) + '">' + esc(cap(c)) + ' (' + counts[c] + ')</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div id="lapGrid"></div></div>';
    var s = document.getElementById('lapS'), t = null;
    s.oninput = function () { clearTimeout(t); t = setTimeout(function () { BZ.q = s.value.trim(); BZ.n = 24; grid(); }, 200); };
    page.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { BZ.cat = b.dataset.c; BZ.n = 24; showBiz(); }; });
    var m = document.getElementById('lapMore'); if (m) m.onchange = function () { BZ.cat = m.value; BZ.n = 24; showBiz(); };
    grid();
  }
  function grid() {
    var q = BZ.q.toLowerCase(), list = dir().filter(function (b) {
      if (BZ.cat && b.cat !== BZ.cat) return false;
      return !q || (b.name + ' ' + (b.cat || '') + ' ' + (b.loc || '') + ' ' + (b.ig || '')).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.img ? 1 : 0) - (a.img ? 1 : 0); });
    document.getElementById('lapCount').textContent = list.length + ' business' + (list.length === 1 ? '' : 'es') + ' · Featured businesses first';
    var g = document.getElementById('lapGrid');
    g.innerHTML = list.length ? '<div class="grid">' + list.slice(0, BZ.n).map(card).join('') + '</div>' + (list.length > BZ.n ? '<button class="more" id="lapMoreBiz">Show more (' + (list.length - BZ.n) + ' more)</button>' : '')
      : '<div class="card empty">No businesses match — try another search, or <a href="/add-business" style="color:#057A44;font-weight:700">add your business</a>.</div>';
    bindCards(g);
    var mb = document.getElementById('lapMoreBiz'); if (mb) mb.onclick = function () { BZ.n += 24; grid(); };
  }

  // ───── switching ─────
  var started = false;
  function apply() {
    if (!wide() && !lapOn()) { document.body.classList.remove('lapv'); if (top) top.style.display = 'none'; if (page) page.style.display = 'none'; if (L) L.style.display = R.style.display = 'none'; return; }
    if (lapOn()) {
      document.body.classList.add('lapv'); shell(); top.style.display = 'block';
      if (L) L.style.display = R.style.display = 'none';
      if (!started) {
        started = true;
        // opened from a link (a business, an article…): show it in the app, not the laptop Home page
        if (/[?&](biz|action|article|blog|event|post)=/.test(location.search) || /\/(biz|blog)\//.test(location.pathname)) inApp(null);
        else { showHome(); if (window._dirFetch && window._dirFetch.then) window._dirFetch.then(function () { if (cur === 'home') showHome(); else if (cur === 'biz') grid(); }); }
      } else if (cur === 'home' || cur === 'biz' || !cur) { page.style.display = 'block'; if (!cur) showHome(); }
      nav();
    } else {
      document.body.classList.remove('lapv'); if (top) top.style.display = 'none'; if (page) page.style.display = 'none';
      panels();
    }
  }
  var rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(apply, 120); });
  window.addEventListener('popstate', function () { if (lapOn() && cur !== 'app') inApp(null); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 50); }); else setTimeout(apply, 50);
  window.tobiDesk = { apply: apply, go: function (n) { if (lapOn()) go(n); } };
})();
