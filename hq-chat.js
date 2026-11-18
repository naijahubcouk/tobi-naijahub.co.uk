/*
 * 💬 HQ → Ask Auntie: a private ChatGPT-style assistant on GPT-6 Luna, with 🌐 web search for news and current info,
 * photos / PDFs, 🎨 pictures, saved prompts and saved chats. Each person sees only their own chats.
 */
(function () {
  'use strict';
  var X = null, S = { items: [], prompts: [], conv: null, web: 'auto', mode: 'chat', aspect: '1:1', files: [], busy: false, showList: false };
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return X.esc(s == null ? '' : String(s)); };
  var IMG = function (id) { return '/.netlify/functions/studio-hq?img=' + encodeURIComponent(id); };
  var NEEDS_WEB = /\b(news|latest|today|tonight|yesterday|this week|this month|current(ly)?|now|recent(ly)?|update[sd]?|announce[ds]?|new rules?|changes? to|price[sd]?|cost of|how much is|rate[sd]?|exchange|weather|strike[sd]?|deadline|20[2-3]\d|budget|election|minister|prime minister|ofcom|hmrc|home office|visa fee|ihs|nhs|council tax|energy cap|interest rate|bank of england|who won|score|trending|viral)\b/i;
  var STARTERS = [
    ['📰', 'What’s the latest UK news that matters to Nigerians this week?'],
    ['✍️', 'Write 3 Instagram captions for a Nigerian caterer’s Christmas party trays, in the Auntie Tobi voice.'],
    ['💬', 'Help me reply kindly to a customer who says their order was late.'],
    ['🎨', 'Make a picture: a warm, happy Nigerian family decorating a Christmas tree in a cosy UK living room.'],
  ];

  // a little markdown → HTML (bold, headings, lists, links)
  function md(t) {
    var lines = esc(t).split('\n'), out = [], list = null;
    var inline = function (s) { return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>'); };
    var close = function () { if (list) { out.push('</' + list + '>'); list = null; } };
    lines.forEach(function (l) {
      var m;
      if ((m = /^\s*[-*•]\s+(.*)/.exec(l))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(l))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else { close(); if ((m = /^#{1,4}\s+(.*)/.exec(l))) out.push('<h4>' + inline(m[1]) + '</h4>'); else if (l.trim()) out.push('<p>' + inline(l) + '</p>'); }
    });
    close(); return out.join('');
  }

  async function view() {
    $('#ttl').textContent = 'Ask Auntie';
    $('#topRight').innerHTML = '';
    $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>';
    try { Object.assign(S, await X.api('chat-state')); } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; }
    draw();
  }
  function money() { var sp = S.spend || { usd: 0 }, cap = (S.cfg && S.cfg.capUsd) || 13; return 'This month: $' + (sp.usd || 0).toFixed(2) + ' of $' + cap.toFixed(0) + (S.isAdmin ? ' <button class="link" id="caCap">change</button>' : ''); }

  function bubble(m, i) {
    if (m.role === 'user') return '<div class="cam u"><div class="cab">' + (m.text ? md(m.text) : '') +
      ((m.imgs || []).length ? '<div class="caimgs">' + m.imgs.map(function (id) { return '<img src="' + IMG(id) + '" alt="">'; }).join('') + '</div>' : '') +
      ((m.files || []).filter(function (f) { return f.kind !== 'image'; }).map(function (f) { return '<div class="cafile">📄 ' + esc(f.name) + '</div>'; }).join('')) +
      '</div><div class="caact"><button class="link" data-sp="' + i + '">⭐ Save as prompt</button></div></div>';
    return '<div class="cam a"><div class="caav">💚</div><div style="flex:1;min-width:0"><div class="cab">' + md(m.text || '') +
      ((m.imgs || []).length ? '<div class="caimgs big">' + m.imgs.map(function (id) { return '<a href="' + IMG(id) + '" target="_blank" rel="noopener"><img src="' + IMG(id) + '" alt="Picture"></a>'; }).join('') + '</div>' : '') +
      ((m.sources || []).length ? '<div class="casrc"><b>🌐 Sources</b>' + m.sources.map(function (u) { var d = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(d) + '</a>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="caact">' + (m.web ? '<span class="muted">🌐 searched the web · </span>' : '') + '<button class="link" data-cp="' + i + '">📋 Copy</button>' +
      (X.allowed && X.allowed('board') && !(m.imgs || []).length ? '<button class="link" data-bd="' + i + '">🗂️ Send to Board</button>' : '') +
      ((m.imgs || []).length ? '<a class="link" href="' + IMG(m.imgs[0]) + '" download="auntie-tobi-picture.jpg">⬇️ Download</a>' : '') + '</div></div></div>';
  }

  function draw() {
    var c = S.conv, msgs = (c && c.msgs) || [];
    var h = css() + '<div class="ca' + (S.showList ? ' showlist' : '') + '">' +
      '<aside class="calist"><button class="btn primary" id="caNew" style="width:100%">＋ New chat</button><button class="btn ghost" id="caSch" style="width:100%;margin-bottom:6px">⏰ Scheduled' + ((S.sched || []).length ? ' (' + S.sched.length + ')' : '') + '</button>' +
      (S.items.length ? S.items.map(function (x) { return '<div class="cali' + (c && c.id === x.id ? ' on' : '') + (x.unseen ? ' new' : '') + '" data-open="' + x.id + '"><span>' + esc(x.title) + '</span>' + (x.unseen ? '<i class="cadot"></i>' : '') + '<button class="link" data-del="' + x.id + '" title="Delete">✕</button></div>'; }).join('') : '<p class="muted" style="font-size:13px;margin:10px 4px">Your chats will be saved here.</p>') +
      '<div class="camoney">' + money() + '</div></aside>' +
      '<section class="camain"><div class="cahead"><button class="btn ghost sm" id="caList">☰ Chats</button><button class="btn ghost sm" id="caSch2">⏰ Scheduled</button><b>' + esc(c ? c.title : 'New chat') + '</b>' + (c ? '<button class="link" id="caRen">rename</button>' : '') + '</div>' +
      '<div class="camsgs" id="caMsgs">' + (msgs.length ? msgs.map(bubble).join('') :
        '<div class="caempty"><div style="font-size:40px">💚</div><h2>Ask Auntie anything</h2><p class="muted">Writing, ideas, replies, UK news and up-to-date info (it searches the web), photos and PDFs, and pictures. Your chats are private to you.</p>' +
        '<div class="castart">' + STARTERS.map(function (s, i) { return '<button data-st="' + i + '"><span>' + s[0] + '</span>' + esc(s[1]) + '</button>'; }).join('') + '</div></div>') +
        (S.busy ? '<div class="cam a"><div class="caav">💚</div><div class="cab"><span class="cadots"><i></i><i></i><i></i></span> ' + (S.mode === 'image' ? 'Making your picture…' : S.busyWeb ? 'Searching the web…' : 'Thinking…') + '</div></div>' : '') + '</div>' +
      '<div class="cacomp">' +
        (S.files.length ? '<div class="cachips">' + S.files.map(function (f, i) { return '<span>' + (f.kind === 'image' ? '🖼️' : '📄') + ' ' + esc(f.name) + ' <button class="link" data-rf="' + i + '">✕</button></span>'; }).join('') + '</div>' : '') +
        '<div class="cabar"><div class="caseg"><button data-mode="chat" class="' + (S.mode === 'chat' ? 'on' : '') + '">💬 Chat</button><button data-mode="image" class="' + (S.mode === 'image' ? 'on' : '') + '">🎨 Picture</button></div>' +
        (S.mode === 'image' ? '<select id="caAsp" style="width:auto">' + [['1:1', 'Square'], ['4:5', 'Instagram post'], ['9:16', 'Story / Reel'], ['16:9', 'Wide']].map(function (o) { return '<option value="' + o[0] + '"' + (S.aspect === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
          : '<button class="cawb ' + S.web + '" id="caWeb" title="Search the web">🌐 Web: ' + { auto: 'Auto', on: 'On', off: 'Off' }[S.web] + '</button>') +
        '<button class="btn ghost sm" id="caPr">⭐ Prompts</button><label class="btn ghost sm" style="cursor:pointer">📎 Attach<input type="file" id="caFile" accept="image/*,application/pdf,.txt,.csv,.md" multiple style="display:none"></label></div>' +
        '<div class="carow"><textarea id="caIn" rows="1" placeholder="' + (S.mode === 'image' ? 'Describe the picture…' : 'Message Ask Auntie…') + '"></textarea><button class="btn primary" id="caGo"' + (S.busy ? ' disabled' : '') + '>➤</button></div>' +
        '<div class="muted" style="font-size:11.5px;margin-top:5px">Enter to send · Shift+Enter for a new line · 🌐 Auto searches the web for news and current questions</div></div></section></div>';
    $('#view').innerHTML = h;
    var mb = $('#caMsgs'); mb.scrollTop = mb.scrollHeight;
    bind();
  }

  function bind() {
    var inp = $('#caIn');
    inp.oninput = function () { inp.style.height = 'auto'; inp.style.height = Math.min(220, inp.scrollHeight) + 'px'; };
    inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    $('#caGo').onclick = send;
    $('#caNew').onclick = function () { S.conv = null; S.files = []; S.showList = false; draw(); $('#caIn').focus(); };
    $('#caList').onclick = function () { S.showList = !S.showList; draw(); };
    $$('[data-open]').forEach(function (el) { el.onclick = async function (e) { if (e.target.dataset.del) return; try { var g = await X.api('chat-get', { id: el.dataset.open }); S.conv = g.conv; if (g.items) S.items = g.items; S.showList = false; draw(); } catch (x) { X.toast(x.message); } }; });
    $$('[data-del]').forEach(function (b) { b.onclick = async function (e) { e.stopPropagation(); if (!confirm('Delete this chat?')) return; try { var r = await X.api('chat-del', { id: b.dataset.del }); S.items = r.items; if (S.conv && S.conv.id === b.dataset.del) S.conv = null; draw(); } catch (x) { X.toast(x.message); } }; });
    var ren = $('#caRen'); if (ren) ren.onclick = async function () { var t = prompt('Name this chat', S.conv.title); if (!t) return; try { var r = await X.api('chat-rename', { id: S.conv.id, title: t }); S.items = r.items; S.conv.title = t; draw(); } catch (x) { X.toast(x.message); } };
    $$('[data-mode]').forEach(function (b) { b.onclick = function () { S.mode = b.dataset.mode; var v = $('#caIn').value; draw(); $('#caIn').value = v; }; });
    var asp = $('#caAsp'); if (asp) asp.onchange = function () { S.aspect = asp.value; };
    var wb = $('#caWeb'); if (wb) wb.onclick = function () { S.web = { auto: 'on', on: 'off', off: 'auto' }[S.web]; var v = $('#caIn').value; draw(); $('#caIn').value = v; };
    $$('[data-st]').forEach(function (b) { b.onclick = function () { var t = STARTERS[+b.dataset.st][1]; if (/^Make a picture:/.test(t)) { S.mode = 'image'; t = t.replace(/^Make a picture:\s*/, ''); draw(); } $('#caIn').value = t; send(); }; });
    $$('[data-rf]').forEach(function (b) { b.onclick = function () { S.files.splice(+b.dataset.rf, 1); var v = $('#caIn').value; draw(); $('#caIn').value = v; }; });
    $('#caFile').onchange = function () { addFiles(this.files); };
    $('#caPr').onclick = promptSheet;
    $('#caSch').onclick = function () { schedSheet(); };
    $('#caSch2').onclick = function () { S.showList = false; schedSheet(); };
    var cap = $('#caCap'); if (cap) cap.onclick = async function () { var v = prompt('Monthly limit for Ask Auntie, in US dollars ($13 ≈ £10)', (S.cfg && S.cfg.capUsd) || 13); if (!v) return; try { Object.assign(S, await X.api('chat-cap', { capUsd: Number(v) })); X.toast('Limit saved'); draw(); } catch (x) { X.toast(x.message); } };
    $$('[data-cp]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(S.conv.msgs[+b.dataset.cp].text || ''); X.toast('Copied'); } catch (e) { X.toast('Couldn’t copy'); } }; });
    $$('[data-bd]').forEach(function (b) { b.onclick = async function () { var t = S.conv.msgs[+b.dataset.bd].text || ''; try { await X.api('save', { item: { title: (t.split('\n').find(function (l) { return l.trim(); }) || 'From Ask Auntie').replace(/[*#>_`]/g, '').trim().slice(0, 80), caption: t, notes: '💬 From Ask Auntie', status: 'idea' } }); X.toast('🗂️ On your Board as an idea'); } catch (x) { X.toast(x.message); } }; });
    $$('[data-sp]').forEach(function (b) { b.onclick = function () { promptSheet(S.conv.msgs[+b.dataset.sp].text || ''); }; });
    // paste a screenshot straight in
    inp.onpaste = function (e) { var it = (e.clipboardData && e.clipboardData.files) || []; if (it.length) { e.preventDefault(); addFiles(it); } };
  }

  // photos are shrunk before sending; PDFs and text files go as they are
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var r = new FileReader(); r.onerror = function () { bad(new Error('Couldn’t read ' + file.name)); };
      r.onload = function () { var img = new Image(); img.onload = function () { var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.85)); }; img.onerror = function () { bad(new Error('That picture couldn’t be opened.')); }; img.src = r.result; };
      r.readAsDataURL(file);
    });
  }
  async function addFiles(list) {
    var v = $('#caIn') ? $('#caIn').value : '';
    for (var i = 0; i < list.length && S.files.length < 4; i++) {
      var f = list[i];
      try {
        if (/^image\//.test(f.type)) S.files.push({ kind: 'image', name: f.name || 'photo.jpg', data: await shrink(f) });
        else if (f.type === 'application/pdf') { if (f.size > 4 * 1024 * 1024) { X.toast('PDFs up to 4MB please'); continue; } S.files.push({ kind: 'pdf', name: f.name, data: await new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(f); }) }); }
        else if (/text|csv|markdown/.test(f.type) || /\.(txt|csv|md)$/i.test(f.name)) { if (f.size > 300 * 1024) { X.toast('Text files up to 300KB please'); continue; } S.files.push({ kind: 'text', name: f.name, text: await f.text() }); }
        else X.toast('Use a photo, a PDF or a text file');
      } catch (e) { X.toast(e.message); }
    }
    draw(); $('#caIn').value = v;
  }

  async function send() {
    if (S.busy) return;
    var t = $('#caIn').value.trim(); if (!t && !S.files.length) return;
    var files = S.files.map(function (f) { return f.kind === 'text' ? { name: f.name, text: f.text } : { name: f.name, data: f.data }; });
    var web = S.web === 'on' ? true : S.web === 'off' ? false : undefined;
    // show it straight away
    var mine = { role: 'user', text: t, files: S.files.map(function (f) { return { name: f.name, kind: f.kind }; }), imgs: [] };
    if (!S.conv) S.conv = { id: '', title: t.slice(0, 60) || 'New chat', msgs: [] };
    S.conv.msgs = S.conv.msgs.concat([mine]); S.files = []; S.busy = true; S.busyWeb = S.mode === 'chat' && (web === true || (web === undefined && NEEDS_WEB.test(t)));
    draw();
    try {
      var r = await X.api('chat-send', { cid: S.conv.id, text: t, files: files, web: web, mode: S.mode, aspect: S.aspect });
      S.conv = r.conv; S.items = r.items; S.spend = r.spend;
    } catch (e) { X.toast(e.message); S.conv.msgs.pop(); if (!S.conv.msgs.length) S.conv = null; S.busy = false; draw(); $('#caIn').value = t; return; }
    S.busy = false; draw();
  }

  // ⏰ scheduled prompts
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DEST = { chat: 'Ask Auntie only', board: '+ Board as an idea', calendar: '+ planned on the Calendar that day' };
  function when(x) {
    var t = x.time; var h = +t.slice(0, 2), m = t.slice(3), tt = (h % 12 || 12) + (m !== '00' ? ':' + m : '') + (h < 12 ? 'am' : 'pm');
    return (x.freq === 'daily' ? 'Every day' : x.freq === 'monthly' ? 'Every month on the ' + x.dom + (x.dom === 1 || x.dom === 21 ? 'st' : x.dom === 2 || x.dom === 22 ? 'nd' : x.dom === 3 || x.dom === 23 ? 'rd' : 'th') : 'Every ' + x.days.slice().sort().map(function (d) { return DN[d]; }).join(', ')) + ' at ' + tt;
  }
  function niceWhen(iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/London' }); }
  function schedSheet() {
    var s = X.sheet('<h2>⏰ Scheduled prompts</h2><p class="muted" style="margin:4px 0 12px">Ask Auntie runs these by itself at the time you choose (UK time) and saves the answer as a new chat, marked with a gold dot. It can also put it on your Board or Calendar. Nothing is ever posted or emailed.</p><div id="scL"></div>' +
      '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn primary" id="scNew">＋ New scheduled prompt</button><button class="btn ghost" id="scX">Close</button></div>' +
      '<div style="margin-top:16px"><b style="font-size:13.5px">Ready-made — tap to add</b><div id="scEx" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div></div>');
    var paint = function () {
      $('#scL', s).innerHTML = (S.sched || []).length ? S.sched.map(function (x) {
        return '<div class="scrow"><div style="flex:1 1 260px;min-width:0"><b>' + esc(x.name) + '</b>' + (x.paused ? ' <span class="pill">Paused</span>' : '') + '<div class="muted" style="font-size:12.5px">' + esc(when(x)) + ' · ' + (x.web ? '🌐 web search' : 'no web search') + ' · ' + esc(DEST[x.dest]) + '</div>' +
          '<div class="muted" style="font-size:12px">' + (x.paused ? '' : 'Next: ' + esc(niceWhen(x.next))) + (x.lastRun ? ' · Last ran ' + esc(niceWhen(x.lastRun)) : '') + (x.lastError ? ' · <span style="color:#B42318">⚠️ ' + esc(x.lastError) + '</span>' : '') + '</div></div>' +
          '<div class="row" style="gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="btn ghost sm" data-run="' + x.id + '">▶️ Run now</button><button class="btn ghost sm" data-ed="' + x.id + '">Edit</button><button class="btn ghost sm" data-pz="' + x.id + '">' + (x.paused ? 'Resume' : 'Pause') + '</button><button class="btn ghost sm" data-dl="' + x.id + '">✕</button></div></div>';
      }).join('') : '<p class="muted" style="margin:0">Nothing scheduled yet — add one of the ready-made ones below, or make your own.</p>';
      $('#scEx', s).innerHTML = (S.examples || []).filter(function (e) { return !(S.sched || []).some(function (x) { return x.name === e.name; }); }).map(function (e, i) { return '<button class="scex" data-ex="' + i + '"><b>' + esc(e.name) + '</b><span>' + esc(when(e)) + ' · ' + esc(DEST[e.dest]) + '</span></button>'; }).join('') || '<p class="muted" style="margin:0;font-size:13px">All added ✓</p>';
      $$('[data-ex]', s).forEach(function (b) { b.onclick = function () { var e = (S.examples || []).filter(function (e) { return !(S.sched || []).some(function (x) { return x.name === e.name; }); })[+b.dataset.ex]; edit(e); }; });
      $$('[data-ed]', s).forEach(function (b) { b.onclick = function () { edit(S.sched.filter(function (x) { return x.id === b.dataset.ed; })[0]); }; });
      $$('[data-pz]', s).forEach(function (b) { b.onclick = function () { var x = S.sched.filter(function (y) { return y.id === b.dataset.pz; })[0]; save(Object.assign({}, x, { paused: !x.paused })); }; });
      $$('[data-dl]', s).forEach(function (b) { b.onclick = async function () { if (!confirm('Delete this scheduled prompt?')) return; try { Object.assign(S, await X.api('chat-sched-del', { id: b.dataset.dl })); paint(); draw(); } catch (x) { X.toast(x.message); } }; });
      $$('[data-run]', s).forEach(function (b) { b.onclick = async function () { b.disabled = true; b.textContent = '▶️ Running…'; try { var r = await X.api('chat-sched-run', { id: b.dataset.run }); Object.assign(S, r); S.conv = r.conv; s.remove(); X.toast('⏰ Done — here’s the result'); draw(); } catch (x) { X.toast(x.message); b.disabled = false; b.textContent = '▶️ Run now'; } }; });
    };
    var save = async function (o) { try { Object.assign(S, await X.api('chat-sched-save', { sched: o })); paint(); draw(); return true; } catch (x) { X.toast(x.message); return false; } };
    var edit = function (x) {
      x = x || { freq: 'weekly', days: [1], time: '08:00', web: true, dest: 'chat', dom: 1 };
      var e = X.sheet('<h2>' + (x.id ? 'Edit' : 'New') + ' scheduled prompt</h2>' +
        '<label style="font-weight:700">Name</label><input id="seN" value="' + esc(x.name || '') + '" placeholder="e.g. Sunday UK updates" style="width:100%;margin:4px 0 10px">' +
        '<label style="font-weight:700">What should Ask Auntie do?</label>' + ((S.prompts || []).length ? '<select id="seP" style="width:100%;margin:4px 0"><option value="">— or use a saved prompt —</option>' + S.prompts.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' : '') +
        '<textarea id="seT" rows="6" style="width:100%;margin:4px 0 10px">' + esc(x.prompt || '') + '</textarea>' +
        '<div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><select id="seF" style="width:auto"><option value="daily"' + (x.freq === 'daily' ? ' selected' : '') + '>Every day</option><option value="weekly"' + (x.freq === 'weekly' ? ' selected' : '') + '>On chosen days</option><option value="monthly"' + (x.freq === 'monthly' ? ' selected' : '') + '>Once a month</option></select>' +
        '<span id="seDays">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<label class="chk" style="font-size:13.5px"><input type="checkbox" value="' + d + '"' + ((x.days || []).indexOf(d) >= 0 ? ' checked' : '') + '> ' + DN[d] + '</label>'; }).join(' ') + '</span>' +
        '<span id="seDom">on day <select id="seD" style="width:auto">' + Array.from({ length: 28 }, function (_, i) { return '<option' + (x.dom === i + 1 ? ' selected' : '') + '>' + (i + 1) + '</option>'; }).join('') + '</select></span>' +
        'at <input id="seTm" type="time" value="' + esc(x.time || '08:00') + '" style="width:auto"> <span class="muted" style="font-size:12.5px">UK time</span></div>' +
        '<label class="chk" style="margin:12px 0 6px;font-size:14px"><input type="checkbox" id="seW"' + (x.web ? ' checked' : '') + '> 🌐 Search the web (for news and anything current — about 2p a run)</label>' +
        '<div style="font-weight:700;margin-top:6px">Where should the answer go?</div>' + Object.keys(DEST).map(function (k) { return '<label class="chk" style="font-size:14px;display:block;margin:4px 0"><input type="radio" name="seDst" value="' + k + '"' + (x.dest === k ? ' checked' : '') + '> ' + (k === 'chat' ? 'A new chat in Ask Auntie' : 'A new chat in Ask Auntie ' + DEST[k]) + '</label>'; }).join('') +
        '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" id="seX">Cancel</button><button class="btn primary" id="seS">Save</button></div>');
      var vis = function () { var f = $('#seF', e).value; $('#seDays', e).style.display = f === 'weekly' ? '' : 'none'; $('#seDom', e).style.display = f === 'monthly' ? '' : 'none'; };
      $('#seF', e).onchange = vis; vis();
      var sp = $('#seP', e); if (sp) sp.onchange = function () { var p = S.prompts.filter(function (q) { return q.id === sp.value; })[0]; if (p) { $('#seT', e).value = p.text; if (!$('#seN', e).value) $('#seN', e).value = p.name; } };
      $('#seX', e).onclick = function () { e.remove(); };
      $('#seS', e).onclick = async function () {
        var o = { id: x.id, name: $('#seN', e).value, prompt: $('#seT', e).value, freq: $('#seF', e).value, days: $$('#seDays input', e).filter(function (i) { return i.checked; }).map(function (i) { return +i.value; }), dom: +$('#seD', e).value, time: $('#seTm', e).value, web: $('#seW', e).checked, dest: (e.querySelector('[name=seDst]:checked') || {}).value || 'chat', paused: x.paused };
        if (await save(o)) { e.remove(); X.toast('⏰ Scheduled'); }
      };
    };
    $('#scNew', s).onclick = function () { edit(); };
    $('#scX', s).onclick = function () { s.remove(); };
    paint();
  }
  // (styles for the sheet)
  (function () { var st = document.createElement('style'); st.textContent = '.scrow{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #ECEDF1;border-radius:12px;padding:10px 12px;margin-bottom:8px;flex-wrap:wrap}.scex{text-align:left;border:1px dashed #CFE3D8;background:#F3FAF6;border-radius:10px;padding:8px 11px;font:inherit;cursor:pointer;min-height:0}.scex span{display:block;font-size:12.5px;color:#6B7280}'; document.head.appendChild(st); })();

  function promptSheet(prefill) {
    var s = X.sheet('<h2>⭐ Saved prompts</h2><p class="muted" style="margin:4px 0 12px">Save the things you ask often (your caption style, a customer reply, a weekly news round-up). Tap one to use it.</p><div id="prL"></div>' +
      '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px"><b>＋ New prompt</b><input id="prN" placeholder="Name, e.g. My caption style" style="width:100%;margin:6px 0"><textarea id="prT" rows="4" style="width:100%" placeholder="The prompt…">' + esc(typeof prefill === 'string' ? prefill : '') + '</textarea>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:8px"><button class="btn ghost" id="prX">Close</button><button class="btn primary" id="prS">Save prompt</button></div></div>');
    var paint = function () {
      $('#prL', s).innerHTML = S.prompts.length ? S.prompts.map(function (p) { return '<div class="prrow"><button class="prUse" data-use="' + p.id + '"><b>' + esc(p.name) + '</b><span>' + esc(p.text.slice(0, 120)) + '</span></button><button class="link" data-pdel="' + p.id + '">✕</button></div>'; }).join('') : '<p class="muted" style="margin:0">No saved prompts yet.</p>';
      $$('[data-use]', s).forEach(function (b) { b.onclick = function () { var p = S.prompts.filter(function (x) { return x.id === b.dataset.use; })[0]; s.remove(); var i = $('#caIn'); i.value = p.text + (i.value ? '\n\n' + i.value : ''); i.focus(); i.oninput(); }; });
      $$('[data-pdel]', s).forEach(function (b) { b.onclick = async function () { try { S.prompts = (await X.api('chat-prompt-del', { id: b.dataset.pdel })).prompts; paint(); } catch (x) { X.toast(x.message); } }; });
    };
    paint();
    $('#prX', s).onclick = function () { s.remove(); };
    $('#prS', s).onclick = async function () { try { S.prompts = (await X.api('chat-prompt', { prompt: { name: $('#prN', s).value, text: $('#prT', s).value } })).prompts; $('#prN', s).value = ''; $('#prT', s).value = ''; paint(); X.toast('Prompt saved'); } catch (x) { X.toast(x.message); } };
  }

  function css() {
    return '<style>#view:has(.ca){padding:0}.ca{display:flex;height:calc(100vh - 64px);min-height:520px}' +
      '.calist{width:250px;flex-shrink:0;border-right:1px solid var(--line,#E7E2D5);padding:12px;overflow:auto;background:#FBFAF6;display:flex;flex-direction:column;gap:4px}' +
      '.cali{display:flex;align-items:center;gap:6px;padding:9px 10px;border-radius:10px;cursor:pointer;font-size:13.5px;color:#1F2937}.cali span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.cali:hover{background:#F1EEE6}.cali.on{background:#0F1E36;color:#fff}.cali.new span{font-weight:800}.cadot{width:8px;height:8px;border-radius:50%;background:#FFB81C;flex-shrink:0;font-style:normal}.cali.on .link{color:#FFB81C}.cali .link{opacity:.6}' +
      '.camoney{margin-top:auto;font-size:12px;color:var(--muted,#6B7280);padding:10px 4px 0}' +
      '.camain{flex:1;display:flex;flex-direction:column;min-width:0}.cahead{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line,#E7E2D5)}.cahead b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cahead #caList,.cahead #caSch2{display:none}' +
      '.camsgs{flex:1;overflow:auto;padding:18px 16px}.cam{display:flex;gap:10px;margin-bottom:16px;max-width:820px;margin-left:auto;margin-right:auto}.cam.u{flex-direction:column;align-items:flex-end}' +
      '.cam.u .cab{background:#0F1E36;color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;max-width:85%}.cam.u .cab a{color:#FFB81C}.cam.a .cab{background:#fff;border:1px solid #ECEDF1;border-radius:4px 16px 16px 16px;padding:12px 15px}' +
      '.caav{width:32px;height:32px;border-radius:50%;background:#E6F2EC;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.cab p{margin:0 0 8px;line-height:1.55}.cab p:last-child{margin-bottom:0}.cab ul,.cab ol{margin:4px 0 8px 20px;padding:0;line-height:1.55}.cab h4{margin:10px 0 6px;font-size:15px}.cab code{background:#F3F4F6;border-radius:4px;padding:0 4px}' +
      '.caimgs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.caimgs img{width:90px;height:90px;object-fit:cover;border-radius:10px}.caimgs.big img{width:100%;max-width:420px;height:auto;border-radius:12px}' +
      '.cafile{font-size:12.5px;opacity:.85;margin-top:6px}.casrc{margin-top:10px;padding-top:8px;border-top:1px solid #F1F2F5;display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;align-items:center}.casrc a{background:#F3F4F6;border-radius:10px;padding:2px 8px;color:#0F1E36;text-decoration:none}' +
      '.caact{display:flex;gap:12px;font-size:12.5px;margin-top:5px;padding-left:2px;align-items:center}.caact .link{font-size:12.5px}' +
      '.caempty{text-align:center;max-width:620px;margin:6vh auto 0}.caempty h2{margin:6px 0}.castart{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;text-align:left}.castart button{border:1px solid #ECEDF1;background:#fff;border-radius:12px;padding:11px 12px;font:inherit;font-size:13.5px;cursor:pointer;display:flex;gap:8px;min-height:0}.castart span{font-size:18px}' +
      '.cacomp{border-top:1px solid var(--line,#E7E2D5);padding:10px 16px 12px;background:#FBFAF6}.cabar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}' +
      '.caseg{display:flex;border:1px solid #E2DDD0;border-radius:10px;overflow:hidden}.caseg button{border:0;background:#fff;padding:6px 11px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:0}.caseg button.on{background:#0F1E36;color:#FFB81C}' +
      '.cawb{border:1px solid #E2DDD0;background:#fff;border-radius:10px;padding:6px 11px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:0}.cawb.on{background:#057A44;color:#fff;border-color:#057A44}.cawb.off{color:#9CA3AF}' +
      '.carow{display:flex;gap:8px;align-items:flex-end}.carow textarea{flex:1;resize:none;border:1.5px solid #E2DDD0;border-radius:14px;padding:11px 13px;font:inherit;font-size:15px;max-height:220px;background:#fff}.carow .btn{height:46px;width:52px;border-radius:14px;font-size:18px}' +
      '.cachips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.cachips span{background:#fff;border:1px solid #E2DDD0;border-radius:10px;padding:3px 9px;font-size:12.5px}' +
      '.cadots i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#057A44;margin-right:3px;animation:cad 1s infinite}.cadots i:nth-child(2){animation-delay:.15s}.cadots i:nth-child(3){animation-delay:.3s}@keyframes cad{0%,100%{opacity:.25}50%{opacity:1}}' +
      '.prrow{display:flex;gap:8px;align-items:center;margin-bottom:6px}.prUse{flex:1;text-align:left;border:1px solid #ECEDF1;background:#fff;border-radius:10px;padding:8px 11px;font:inherit;cursor:pointer;min-height:0}.prUse span{display:block;font-size:12.5px;color:#6B7280}' +
      '@media (max-width:820px){.calist{display:none;position:absolute;z-index:5;height:calc(100vh - 120px);width:80%;box-shadow:0 8px 30px rgba(0,0,0,.15)}.ca.showlist .calist{display:flex}.cahead #caList,.cahead #caSch2{display:inline-flex}.ca{position:relative}.castart{grid-template-columns:1fr}}</style>';
  }

  window.HQChat = { init: function (x) { X = x; }, view: view };
})();
